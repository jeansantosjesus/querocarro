-- =====================================================================

-- Verificação manual do RLS (rode no SQL Editor DEPOIS das migrations).

-- Cria dois usuários de teste, simula suas sessões e confirma o isolamento.

-- Tudo acontece dentro de uma transação que é desfeita no final (ROLLBACK).

-- =====================================================================

begin;



-- 1) RLS ativo em todas as tabelas (todas devem aparecer com rls_enabled = true)

select relname as tabela, relrowsecurity as rls_enabled, relforcerowsecurity as rls_forced

from pg_class

where relnamespace = 'public'::regnamespace

and relname in ('profiles', 'user_preferences', 'simulations', 'simulation_results');



-- 2) Dois usuários de teste (o gatilho cria perfil e preferências)

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)

values

('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@teste.local', '{"display_name":"Usuário A"}'),

('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@teste.local', '{"display_name":"Usuário B"}');



-- 3) Usuário A: dá consentimento e cria uma simulação

set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);



update public.user_preferences set persist_history_consent = true

where user_id = '11111111-1111-1111-1111-111111111111';



insert into public.simulations (id, user_id, title, scenario_id, inputs, weights, scenario_snapshot, catalog_version, model_version)

values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Simulação do A', 'equilibrado', '{}', '{}', '{}', 'teste', 'wsm-1.0.0');



-- Deve retornar 1 (A enxerga a própria)

select count(*) as a_ve_as_proprias from public.simulations;



-- 4) Usuário B: não deve ver nada de A

select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);



-- Deve retornar 0

select count(*) as b_ve_do_a from public.simulations;

select count(*) as b_ve_perfil_do_a from public.profiles where id = '11111111-1111-1111-1111-111111111111';



-- B tenta criar simulação em nome de A: DEVE FALHAR (violação de RLS)

do $$

begin

begin

insert into public.simulations (user_id, title, scenario_id, inputs, weights, scenario_snapshot, catalog_version, model_version)

values ('11111111-1111-1111-1111-111111111111', 'Falsa', 'equilibrado', '{}', '{}', '{}', 'x', 'x');

raise exception 'FALHA DE SEGURANÇA: B conseguiu criar registro em nome de A';

exception when insufficient_privilege or check_violation then

raise notice 'OK: inserção em nome de outro usuário bloqueada';

end;

end $$;



-- B tenta alterar o perfil de A: não deve afetar nenhuma linha (deve retornar 0)

with updated as (

update public.profiles set display_name = 'Hackeado'

where id = '11111111-1111-1111-1111-111111111111'

returning 1

)

select count(*) as linhas_alteradas_por_b from updated;



-- B sem consentimento não consegue salvar histórico: DEVE FALHAR

do $$

begin

begin

insert into public.simulations (user_id, title, scenario_id, inputs, weights, scenario_snapshot, catalog_version, model_version)

values ('22222222-2222-2222-2222-222222222222', 'Sem consentimento', 'equilibrado', '{}', '{}', '{}', 'x', 'x');

raise exception 'FALHA: salvou histórico sem consentimento';

exception when insufficient_privilege or check_violation then

raise notice 'OK: gravação sem consentimento bloqueada';

end;

end $$;



-- 5) anon não acessa nada

reset role;

set local role anon;

do $$

begin

begin

perform count(*) from public.simulations;

raise exception 'FALHA: anon conseguiu consultar simulations';

exception when insufficient_privilege then

raise notice 'OK: anon sem acesso';

end;

end $$;



rollback;
