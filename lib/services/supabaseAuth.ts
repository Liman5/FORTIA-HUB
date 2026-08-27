// ============================================================
// FORTIA HUB — Client Supabase Auth (API REST)
// Description : réinitialisation de mot de passe par email,
// création des comptes dans auth.users, mise à jour du mot de passe.
// Préparé pour être adapté plus tard à l'API Resend (le flow
// Supabase reste la source de vérité de l'authentification).
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const authApi = `${SUPABASE_URL}/auth/v1`;

function anonHeaders(extra: Record<string, string> = {}) {
  return {
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    ...extra,
  };
}

function adminHeaders(extra: Record<string, string> = {}) {
  return {
    "Content-Type": "application/json",
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    ...extra,
  };
}

export function isSupabaseAuthConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Décode le payload d'un JWT Supabase (access_token du lien de réinitialisation).
 */
export function decodeSupabaseToken(token: string): Record<string, any> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(base64, "base64").toString("utf-8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Recherche un utilisateur dans auth.users par email (clé service role).
 */
export async function supabaseFindAuthUserByEmail(email: string) {
  if (!SUPABASE_SERVICE_ROLE_KEY) return null;
  const url = `${authApi}/admin/users?email=${encodeURIComponent(email)}`;
  const res = await fetch(url, { headers: adminHeaders() });
  if (!res.ok) return null;
  const data = await res.json();
  return Array.isArray(data.users) && data.users.length > 0 ? data.users[0] : null;
}

/**
 * Crée un utilisateur dans auth.users s'il n'existe pas déjà
 * (email_confirm: true → aucun email de confirmation supplémentaire).
 */
export async function supabaseEnsureAuthUser(email: string, password: string) {
  if (!isSupabaseAuthConfigured()) return null;
  const existing = await supabaseFindAuthUserByEmail(email);
  if (existing) return existing;

  const url = `${authApi}/admin/users`;
  const res = await fetch(url, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.msg || "Échec de création du compte Supabase Auth");
  }
  return data;
}

/**
 * Envoie l'email de réinitialisation de mot de passe via Supabase.
 */
export async function supabaseSendPasswordReset(email: string, redirectTo: string) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase Auth non configuré");
  }
  const url = `${authApi}/recover`;
  const res = await fetch(url, {
    method: "POST",
    headers: anonHeaders(),
    body: JSON.stringify({ email, options: { redirectTo } }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      data?.msg || data?.error_description || "Impossible d'envoyer l'email de réinitialisation"
    );
  }
  return data;
}

/**
 * Met à jour le mot de passe Supabase Auth via le token du lien de réinitialisation.
 */
export async function supabaseUpdatePassword(accessToken: string, newPassword: string) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase Auth non configuré");
  }
  const url = `${authApi}/user`;
  const res = await fetch(url, {
    method: "PUT",
    headers: anonHeaders({ Authorization: `Bearer ${accessToken}` }),
    body: JSON.stringify({ password: newPassword }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.msg || data?.error_description || "Impossible de mettre à jour le mot de passe");
  }
  return data;
}
