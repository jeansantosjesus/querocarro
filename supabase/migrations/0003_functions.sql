-- =====================================================================

-- Quero Carro (QC) - Funções e gatilhos

-- =====================================================================



-- Mantém updated_at atualizado.

create or replace function public.set_updated_at()

returns trigger

language plpgsql

set search_path = ''

as $$

begin

new.updated_at = now();

return new;

end;

$$;



drop trigger if exists profiles_set_updated_at on public.profiles;

create trigger profiles_set_updated_at

before update on public.profiles

for each row execute function public.set_updated_at();



drop trigger if exists preferences_set_updated_at on public.user_preferences;

create trigger preferences_set_updated_at

before update on public.user_preferences

for each row execute function public.set_updated_at();



-- Cria perfil e preferências ao cadastrar um usuário.

-- SECURITY DEFINER com search_path vazio (boa prática contra sequestro de search_path).

-- O consentimento de histórico começa SEMPRE desligado.

create or replace function public.handle_new_user()

returns trigger

language plpgsql

security definer

set search_path = ''

as $$

declare

name_value text;

begin

name_value := left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'Usuário'), 80);



-- O aceite do aviso de privacidade vem do formulário de cadastro (metadado booleano).

insert into public.profiles (id, display_name, privacy_accepted_at)

values (

new.id,

name_value,

case when (new.raw_user_meta_data ->> 'privacy_accepted') = 'true' then now() else null end

)

on conflict (id) do nothing;



insert into public.user_preferences (user_id)

values (new.id)

on conflict (user_id) do nothing;



return new;

end;

$$;



revoke all on function public.handle_new_user() from public, anon, authenticated;



drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created

after insert on auth.users

for each row execute function public.handle_new_user();



-- Exclusão da própria conta e de todos os dados (direito de exclusão).

-- Só apaga o usuário autenticado; as demais tabelas caem em cascata.

create or replace function public.delete_my_account()

returns void

language plpgsql

security definer

set search_path = ''

as $$

declare

uid uuid := auth.uid();

begin

if uid is null then

raise exception 'not authenticated';

end if;

delete from auth.users where id = uid;

end;

$$;



revoke all on function public.delete_my_account() from public, anon;

grant execute on function public.delete_my_account() to authenticated;
