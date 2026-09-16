'use strict';

/**
 * auth.js
 * Petite couche au-dessus de Supabase Auth : connexion/déconnexion Google,
 * récupération de la session, écoute des changements d'état.
 * Dépend de js/supabase-config.js (chargé avant) et de la librairie
 * supabase-js (chargée via CDN dans index.html).
 */

console.log('🔵 [FX-AUTH]', 'auth.js chargé. URL complète :', window.location.href);

let supabaseClient = null;
let configWarningShown = false;

function isConfigured() {
  const cfg = window.APP_CONFIG || {};
  return (
    cfg.SUPABASE_URL &&
    cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_URL.includes('TON_PROJECT_REF') &&
    !cfg.SUPABASE_ANON_KEY.includes('TON_ANON_PUBLIC_KEY')
  );
}

function getClient() {
  if (supabaseClient) return supabaseClient;

  if (!isConfigured()) {
    if (!configWarningShown) {
      console.warn(
        'Supabase non configuré : renseigne js/supabase-config.js ' +
        '(SUPABASE_URL et SUPABASE_ANON_KEY) depuis ton dashboard Supabase.'
      );
      configWarningShown = true;
    }
    return null;
  }

  if (typeof window.supabase === 'undefined') {
    console.error('La librairie supabase-js ne s\'est pas chargée (vérifie la balise <script> du CDN dans index.html).');
    return null;
  }

  console.log('🔵 [FX-AUTH]', 'Création du client Supabase. URL actuelle de la page :', window.location.href);
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.APP_CONFIG;
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabaseClient;
}

const DEBUG_TAG = '🔵 [FX-AUTH]';

async function getSession() {
  const client = getClient();
  if (!client) {
    console.log(DEBUG_TAG, 'getSession() : pas de client (config manquante)');
    return null;
  }
  const { data, error } = await client.auth.getSession();
  if (error) {
    console.error(DEBUG_TAG, 'Erreur lors de la récupération de la session :', error);
    return null;
  }
  console.log(DEBUG_TAG, 'getSession() résultat :', data.session ? `connecté (${data.session.user.email})` : 'aucune session');
  return data.session;
}

async function signInWithGoogle() {
  const client = getClient();
  if (!client) {
    console.log(DEBUG_TAG, 'signInWithGoogle() : pas de client (config manquante)');
    return;
  }
  const redirectTo = window.location.origin + window.location.pathname;
  console.log(DEBUG_TAG, 'Lancement signInWithOAuth, redirectTo =', redirectTo);
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) {
    console.error(DEBUG_TAG, 'Erreur lors de la connexion Google :', error);
  }
}

async function signOut() {
  const client = getClient();
  if (!client) return;
  const { error } = await client.auth.signOut();
  if (error) {
    console.error('Erreur lors de la déconnexion :', error);
    return;
  }
  window.location.reload();
}

function onAuthStateChange(callback) {
  const client = getClient();
  if (!client) return;
  client.auth.onAuthStateChange((event, session) => {
    console.log('🔵 [FX-AUTH]', 'onAuthStateChange événement :', event, session ? `session pour ${session.user.email}` : 'pas de session');
    callback(session);
  });
}

window.Auth = {
  isConfigured,
  getSession,
  signInWithGoogle,
  signOut,
  onAuthStateChange,
};
