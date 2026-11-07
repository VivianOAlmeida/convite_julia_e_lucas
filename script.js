// Página do convite: apenas a resposta "Não vou…"
import { confirmPresence, isConfigured } from './supabase.js';

const dlg = document.getElementById('dlg-nao-vou');
const form = document.getElementById('form-nao-vou');
const msg = document.getElementById('msg-nao-vou');

document.getElementById('btn-nao-vou').onclick = () => dlg.showModal();
document.getElementById('fechar-dlg').onclick = () => dlg.close();

form.onsubmit = async (e) => {
  e.preventDefault();
  const btn = form.querySelector('[type=submit]');
  btn.disabled = true;
  try {
    if (!isConfigured()) throw new Error('Supabase não configurado');
    const r = await confirmPresence(document.getElementById('nome-nao-vou').value, false);
    msg.textContent = r.ok ? 'Resposta registrada. Obrigado por avisar! ♡' : 'Confira o nome e tente novamente.';
    if (r.ok) form.reset();
  } catch {
    msg.textContent = 'Não foi possível enviar agora. Tente de novo em instantes.';
  }
  btn.disabled = false;
};
