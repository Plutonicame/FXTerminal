'use strict';

/**
 * auth.js
 * Petite couche au-dessus de Supabase Auth : connexion/déconnexion Google,
 * récupération de la session, écoute des changements d'état.
 * Dépend de supabase-config.js (chargé avant) et de la librairie
 * supabase-js (chargée via CDN dans index.html).
 */

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
        'Supabase non configuré : renseigne supabase-config.js ' +
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

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.APP_CONFIG;
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabaseClient;
}

async function getSession() {
  const client = getClient();
  if (!client) return null;
  const { data, error } = await client.auth.getSession();
  if (error) {
    console.error('Erreur lors de la récupération de la session :', error);
    return null;
  }
  return data.session;
}

async function signInWithGoogle() {
  const client = getClient();
  if (!client) return;
  const redirectTo = window.location.origin + window.location.pathname;
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) {
    console.error('Erreur lors de la connexion Google :', error);
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
    callback(session);
  });
}

window.Auth = {
  isConfigured,
  getClient,
  getSession,
  signInWithGoogle,
  signOut,
  onAuthStateChange,
};
