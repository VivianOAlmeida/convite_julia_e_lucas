// Lista de presentes: seleção, confirmação e atualização automática.
import { fetchGifts, confirmPresence, isConfigured } from './supabase.js';

const $ = (id) => document.getElementById(id);
const POLL_MS = 10000;

let gifts = [];             // [{id,name,category,icon,reserved_by}]
let categoria = null;       // aba ativa
const selecionados = new Set();
let outro = '';             // presente personalizado (texto livre)

/* ---------- utilidades ---------- */
const el = (tag, cls, text) => {           // sempre textContent: nomes vêm de usuários
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};
const mostrar = (id) => {
  ['etapa-lista', 'etapa-confirma', 'etapa-ok'].forEach((e) => ($(e).hidden = e !== id));
  window.scrollTo({ top: 0 });
};
const aviso = (node, texto) => { node.textContent = texto || ''; node.hidden = !texto; };

/* ---------- renderização ---------- */
function renderCategorias() {
  const nav = $('categorias');
  nav.replaceChildren();
  const cats = [...new Set(gifts.map((g) => g.category))].filter(Boolean);
  nav.hidden = !cats.length;   // sem categorias: lista única
  cats.forEach((c) => {
    const b = el('button', 'chip' + (c === categoria ? ' ativo' : ''), c);
    b.type = 'button';
    b.onclick = () => { categoria = c; renderCategorias(); renderPresentes(); };
    nav.append(b);
  });
}

function renderPresentes() {
  const ul = $('presentes');
  ul.replaceChildren();
  gifts.filter((g) => !categoria || g.category === categoria).forEach((g) => {
    const reservado = !!g.reserved_by;
    const li = el('li', 'presente' + (reservado ? ' reservado' : ''));
    const label = el('label');
    const cb = el('input');
    cb.type = 'checkbox';
    cb.disabled = reservado;
    cb.checked = selecionados.has(g.id);
    cb.onchange = () => (cb.checked ? selecionados.add(g.id) : selecionados.delete(g.id));
    label.append(cb, ...(g.icon ? [el('span', 'icone', g.icon)] : []), el('span', 'nome', g.name));
    li.append(label, el('span', 'status', reservado ? `Reservado por ${g.reserved_by}` : 'Disponível'));
    ul.append(li);
  });
}

function renderResumo(ul, comRemover) {
  ul.replaceChildren();
  const itens = [...selecionados].map((id) => gifts.find((g) => g.id === id)).filter(Boolean);
  itens.forEach((g) => {
    const li = el('li', null);
    if (g.icon) li.append(el('span', 'icone', g.icon));
    li.append(el('span', 'nome', g.name));
    if (comRemover) {
      const x = el('button', 'x', '×');
      x.type = 'button';
      x.setAttribute('aria-label', `Remover ${g.name}`);
      x.onclick = () => { selecionados.delete(g.id); renderResumo(ul, true); };
      li.append(x);
    }
    ul.append(li);
  });
  if (outro) {
    const li = el('li');
    li.append(el('span', 'icone', '✏️'), el('span', 'nome', `Outro: ${outro}`));
    ul.append(li);
  }
  if (!itens.length && !outro) ul.append(el('li', 'vazio', 'Nenhum presente — sua presença já basta! ♡'));
}

/* ---------- dados ---------- */
async function carregar() {
  if (!isConfigured()) { aviso($('aviso'), 'Configure supabase.js para carregar a lista.'); return; }
  try {
    gifts = await fetchGifts();
  } catch {
    aviso($('aviso'), 'Não foi possível atualizar a lista agora.');
    return;
  }
  // Remove da seleção o que acabou de ser reservado por outra pessoa
  const perdidos = [...selecionados].filter((id) => gifts.find((g) => g.id === id)?.reserved_by);
  perdidos.forEach((id) => selecionados.delete(id));
  if (perdidos.length) {
    const nomes = perdidos.map((id) => gifts.find((g) => g.id === id).name).join(', ');
    aviso($('aviso'), `Ops! Já reservaram: ${nomes}. Escolha outra sugestão.`);
  }
  if (!categoria || !gifts.some((g) => g.category === categoria)) categoria = gifts[0]?.category;
  renderCategorias();
  renderPresentes();
  if (!$('etapa-confirma').hidden) renderResumo($('resumo'), true);
}

/* ---------- eventos ---------- */
$('btn-outro').onclick = () => {
  $('outro-texto').hidden = !$('outro-texto').hidden;
  if (!$('outro-texto').hidden) $('outro-texto').focus();
};
$('btn-continuar').onclick = () => {
  outro = $('outro-texto').value.trim();
  aviso($('erro'), '');
  renderResumo($('resumo'), true);
  mostrar('etapa-confirma');
};
$('btn-editar').onclick = () => mostrar('etapa-lista');

$('btn-confirmar').onclick = async () => {
  const nome = $('nome').value.trim();
  if (nome.length < 2) return aviso($('erro'), 'Digite seu nome para confirmar.');
  const btn = $('btn-confirmar');
  btn.disabled = true;
  try {
    const r = await confirmPresence(nome, true, [...selecionados], outro ? [outro] : []);
    if (r.ok) {
      renderResumo($('registrados'), false);
      mostrar('etapa-ok');
      carregar();
    } else if (r.error === 'conflict') {
      aviso($('aviso'), ''); mostrar('etapa-lista');
      await carregar();       // atualiza disponibilidade e avisa o conflito
    } else {
      aviso($('erro'), 'Confira seus dados e tente novamente.');
    }
  } catch {
    aviso($('erro'), 'Falha de conexão. Tente novamente.');
  }
  btn.disabled = false;
};

// Atualização automática (sem recarregar a página)
setInterval(() => { if (!document.hidden && $('etapa-ok').hidden) carregar(); }, POLL_MS);
document.addEventListener('visibilitychange', () => !document.hidden && carregar());
carregar();
