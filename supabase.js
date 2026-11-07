// Acesso ao Supabase via API REST (sem bibliotecas).
// >>> PREENCHA com os dados reais: Supabase > Project Settings > API
// Use SOMENTE a chave publishable/anon. NUNCA a service_role.
export const SUPABASE_URL = 'https://jjnhamxkiwyudgdwuatj.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_fNOvRn6ILWvB0G87Rbh7vQ_s-2LL_Lg';

export const isConfigured = () => !SUPABASE_URL.startsWith('COLE_');

async function request(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  return res.json();
}

/** Lista pública: presentes + nome de quem reservou (view gift_status). */
export const fetchGifts = () => request('gift_status?select=*&order=id.asc');

/** Confirmação atômica via RPC. Retorna {ok, error?, conflicts?}. */
export const confirmPresence = (name, attending, giftIds = [], customGifts = []) =>
  request('rpc/confirm_presence', {
    method: 'POST',
    body: JSON.stringify({ p_name: name, p_attending: attending, p_gift_ids: giftIds, p_custom_gifts: customGifts }),
  });
