-- =====================================================================

-- Quero Carro (QC) - Esquema inicial

-- Execute no Supabase: SQL Editor > New query > cole e rode (na ordem 0001, 0002, 0003).

--

-- Princípios:

-- * Nenhuma senha é armazenada aqui: autenticação fica em auth.users (Supabase Auth).

-- * Dados de autenticação e dados de simulação são separados.

-- * Toda linha pertence a um usuário (user_id = auth.uid()).

-- * Minimização: não há CPF, RG, endereço, conta bancária, cartão etc.

-- =====================================================================



create extension if not exists pgcrypto;



-- ---------------------------------------------------------------------

-- profiles: dados mínimos de exibição (1 linha por usuário)

-- ---------------------------------------------------------------------

create table if not exists public.profiles (

id uuid primary key references auth.users (id) on delete cascade,

display_name text not null check (char_length(display_name) between 1 and 80),

privacy_accepted_at timestamptz,

created_at timestamptz not null default now(),

updated_at timestamptz not null default now()

);



-- ---------------------------------------------------------------------

-- user_preferences: consentimento e preferências (1 linha por usuário)

-- ---------------------------------------------------------------------

create table if not exists public.user_preferences (

user_id uuid primary key references auth.users (id) on delete cascade,

persist_history_consent boolean not null default false,

default_scenario text check (default_scenario in ('economico', 'equilibrado', 'conservador', 'personalizado')),

updated_at timestamptz not null default now()

);



-- ---------------------------------------------------------------------

-- simulations: parâmetros de cada simulação salva COM consentimento

-- ---------------------------------------------------------------------

create table if not exists public.simulations (

id uuid primary key default gen_random_uuid(),

user_id uuid not null references auth.users (id) on delete cascade,

title text not null check (char_length(title) between 1 and 80),

scenario_id text not null check (scenario_id in ('economico', 'equilibrado', 'conservador', 'personalizado')),

inputs jsonb not null check (jsonb_typeof(inputs) = 'object' and pg_column_size(inputs) < 20000),

weights jsonb not null check (jsonb_typeof(weights) = 'object'),

scenario_snapshot jsonb not null check (jsonb_typeof(scenario_snapshot) = 'object'),

fipe_reference_month text check (fipe_reference_month is null or fipe_reference_month ~ '^\d{4}-\d{2}$'),

fipe_reference_month_label text check (fipe_reference_month_label is null or char_length(fipe_reference_month_label) <= 40),

catalog_version text not null check (char_length(catalog_version) <= 120),

model_version text not null check (char_length(model_version) <= 40),

created_at timestamptz not null default now()

);



create index if not exists simulations_user_created_idx

on public.simulations (user_id, created_at desc);



-- ---------------------------------------------------------------------

-- simulation_results: alternativas calculadas de cada simulação

-- ---------------------------------------------------------------------

create table if not exists public.simulation_results (

id uuid primary key default gen_random_uuid(),

simulation_id uuid not null references public.simulations (id) on delete cascade,

user_id uuid not null references auth.users (id) on delete cascade,

vehicle_fipe_code text not null check (char_length(vehicle_fipe_code) between 1 and 20),

vehicle_year_id text not null check (char_length(vehicle_year_id) between 1 and 20),

compatibility_index numeric(5, 2) not null check (compatibility_index between 0 and 100),

in_recommended_group boolean not null default false,

rank integer not null check (rank >= 1),

payload jsonb not null check (jsonb_typeof(payload) = 'object' and pg_column_size(payload) < 20000),

created_at timestamptz not null default now()

);



create index if not exists simulation_results_simulation_idx

on public.simulation_results (simulation_id, rank);

create index if not exists simulation_results_user_idx

on public.simulation_results (user_id);
