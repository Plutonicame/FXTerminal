'use strict';

/**
 * Configuration Supabase.
 * Remplis ces deux valeurs depuis ton dashboard Supabase :
 * Project Settings -> API -> "Project URL" et "anon public" key.
 * Ce ne sont PAS des identifiants secrets à protéger absolument : la clé
 * "anon" est faite pour être exposée côté client, l'accès réel est
 * contrôlé par Supabase (Auth + policies), pas par le secret de cette clé.
 */
window.APP_CONFIG = {
  SUPABASE_URL: 'https://TON_PROJECT_REF.supabase.co',
  SUPABASE_ANON_KEY: 'TON_ANON_PUBLIC_KEY',
};
