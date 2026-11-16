-- =====================================================================

-- Quero Carro (QC) - Row Level Security (RLS)

-- RLS ATIVO em TODAS as tabelas. Sem política = sem acesso.

-- O papel "anon" não recebe nenhum acesso. Apenas "authenticated", e somente

-- às próprias linhas (user_id = auth.uid()).

-- =====================================================================



alter table public.profiles enable row level security;

alter table public.user_preferences enable row level security;

alter table public.simulations enable row level security;

alter table public.simulation_results enable row level security;



-- Garante que o RLS também vale para o dono das tabelas.

alter table public.profiles force row level security;

alter table public.user_preferences force row level security;

alter table public.simulations force row level security;

alter table public.simulation_results force row level security;



-- Privilégios mínimos: remove tudo de anon e dá apenas o necessário a authenticated.

revoke all on public.profiles, public.user_preferences, public.simulations, public.simulation_results from anon;

revoke all on public.profiles, public.user_preferences, public.simulations, public.simulation_results from authenticated;



grant select, insert, update, delete on public.profiles to authenticated;

grant select, insert, update, delete on public.user_preferences to authenticated;

grant select, insert, delete on public.simulations to authenticated;

grant select, insert, delete on public.simulation_results to authenticated;



-- ---------------------------------------------------------------------

-- profiles: o usuário só lê e altera o PRÓPRIO perfil

-- ---------------------------------------------------------------------

drop policy if exists profiles_select_own on public.profiles;

create policy profiles_select_own on public.profiles

for select to authenticated

using (id = (select auth.uid()));



drop policy if exists profiles_insert_own on public.profiles;

create policy profiles_insert_own on public.profiles

for insert to authenticated

with check (id = (select auth.uid()));



drop policy if exists profiles_update_own on public.profiles;

create policy profiles_update_own on public.profiles

for update to authenticated

using (id = (select auth.uid()))

with check (id = (select auth.uid()));



drop policy if exists profiles_delete_own on public.profiles;

create policy profiles_delete_own on public.profiles

for delete to authenticated

using (id = (select auth.uid()));



-- ---------------------------------------------------------------------

-- user_preferences

-- ---------------------------------------------------------------------

drop policy if exists preferences_select_own on public.user_preferences;

create policy preferences_select_own on public.user_preferences

for select to authenticated

using (user_id = (select auth.uid()));



drop policy if exists preferences_insert_own on public.user_preferences;

create policy preferences_insert_own on public.user_preferences

for insert to authenticated

with check (user_id = (select auth.uid()));



drop policy if exists preferences_update_own on public.user_preferences;

create policy preferences_update_own on public.user_preferences

for update to authenticated

using (user_id = (select auth.uid()))

with check (user_id = (select auth.uid()));



drop policy if exists preferences_delete_own on public.user_preferences;

create policy preferences_delete_own on public.user_preferences

for delete to authenticated

using (user_id = (select auth.uid()));



-- ---------------------------------------------------------------------

-- simulations: só vê e cria as PRÓPRIAS simulações.

-- A criação exige consentimento explícito para salvar o histórico.

-- (Sem política de UPDATE: simulações salvas são imutáveis; para alterar, duplique.)

-- ---------------------------------------------------------------------

drop policy if exists simulations_select_own on public.simulations;

create policy simulations_select_own on public.simulations

for select to authenticated

using (user_id = (select auth.uid()));



drop policy if exists simulations_insert_own on public.simulations;

create policy simulations_insert_own on public.simulations

for insert to authenticated

with check (

user_id = (select auth.uid())

and exists (

select 1

from public.user_preferences p

where p.user_id = (select auth.uid())

and p.persist_history_consent = true

)

);



drop policy if exists simulations_delete_own on public.simulations;

create policy simulations_delete_own on public.simulations

for delete to authenticated

using (user_id = (select auth.uid()));



-- ---------------------------------------------------------------------

-- simulation_results: só vê/cria resultados das PRÓPRIAS simulações.

-- O with check impede apontar para a simulação de outro usuário.

-- ---------------------------------------------------------------------

drop policy if exists results_select_own on public.simulation_results;

create policy results_select_own on public.simulation_results

for select to authenticated

using (user_id = (select auth.uid()));



drop policy if exists results_insert_own on public.simulation_results;

create policy results_insert_own on public.simulation_results

for insert to authenticated

with check (

user_id = (select auth.uid())

and exists (

select 1

from public.simulations s

where s.id = simulation_id

and s.user_id = (select auth.uid())

)

);



drop policy if exists results_delete_own on public.simulation_results;

create policy results_delete_own on public.simulation_results

for delete to authenticated

using (user_id = (select auth.uid()));
