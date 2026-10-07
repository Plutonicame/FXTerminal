-- =====================================================================
-- Table des discours (FX Terminal)
-- À coller dans Supabase : SQL Editor > New query > coller > Run
-- Résultat attendu : "Success. No rows returned"
-- =====================================================================

create table public.speeches (
  id          uuid primary key default gen_random_uuid(),

  -- Lien du discours d'origine : sert aussi à ne jamais enregistrer deux fois le même
  source_url  text not null unique,

  -- Devise (onglet de destination) et banque de l'orateur
  currency    text not null,
  bank        text not null,

  first_name  text not null,
  last_name   text not null,
  role        text not null default '',
  voting      boolean not null,                          -- true = votant
  stars       smallint not null check (stars between 0 and 5),
  spoken_at   timestamptz not null,                      -- date/heure du discours
  title       text not null default '',

  speech      jsonb not null default '[]'::jsonb,        -- discours traduit : liste de paragraphes
  summary     jsonb not null default '[]'::jsonb,        -- résumé : liste de blocs {heading, text, items}

  created_at  timestamptz not null default now(),

  -- Garde-fou : une banque ne peut être associée qu'à SA devise
  -- (impossible d'enregistrer un orateur de la BoJ dans l'onglet USD)
  constraint speeches_currency_bank_check check (
    (currency = 'USD' and bank = 'FED')  or
    (currency = 'EUR' and bank = 'BCE')  or
    (currency = 'JPY' and bank = 'BOJ')  or
    (currency = 'GBP' and bank = 'BOE')  or
    (currency = 'CHF' and bank = 'BNS')  or
    (currency = 'CAD' and bank = 'BOC')  or
    (currency = 'AUD' and bank = 'RBA')  or
    (currency = 'NZD' and bank = 'RBNZ') or
    (currency = 'CNY' and bank = 'PBOC')
  )
);

create index speeches_currency_spoken_at_idx
  on public.speeches (currency, spoken_at desc);

-- Sécurité : activer le contrôle d'accès par ligne (RLS)
alter table public.speeches enable row level security;

-- Lecture : les utilisateurs connectés à l'appli peuvent lire.
-- Aucune règle d'écriture n'existe : seul le bot (clé "service role" côté
-- serveur) pourra ajouter ou modifier des discours.
create policy "Lecture pour les utilisateurs connectes"
  on public.speeches
  for select
  to authenticated
  using (true);
