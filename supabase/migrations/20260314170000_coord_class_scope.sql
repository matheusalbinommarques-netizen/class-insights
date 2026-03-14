begin;

create table if not exists public.class_coord_access_codes (
	id uuid primary key default gen_random_uuid(),
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now()),
	class_id uuid not null unique references public.classes (id) on delete cascade,
	access_code text not null unique,
	constraint class_coord_access_codes_code_not_blank check (btrim(access_code) <> '')
);

drop trigger if exists set_class_coord_access_codes_updated_at on public.class_coord_access_codes;
create trigger set_class_coord_access_codes_updated_at
before update on public.class_coord_access_codes
for each row
execute function public.set_updated_at();

create table if not exists public.coord_class_memberships (
	id uuid primary key default gen_random_uuid(),
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now()),
	class_id uuid not null references public.classes (id) on delete cascade,
	coord_id uuid not null references public.profiles (id) on delete cascade,
	constraint coord_class_memberships_unique unique (class_id, coord_id)
);

drop trigger if exists set_coord_class_memberships_updated_at on public.coord_class_memberships;
create trigger set_coord_class_memberships_updated_at
before update on public.coord_class_memberships
for each row
execute function public.set_updated_at();

create or replace function public.generate_access_code(p_length integer default 8)
returns text
language plpgsql
as $$
declare
	charset text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	output text := '';
	i integer := 0;
begin
	if p_length < 6 then
		p_length := 6;
	end if;

	while i < p_length loop
		output := output || substr(charset, floor(random() * length(charset) + 1)::integer, 1);
		i := i + 1;
	end loop;

	return output;
end;
$$;

create or replace function public.ensure_class_coord_access_code(p_class_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
	existing_code text;
	new_code text;
begin
	select access_code
	into existing_code
	from public.class_coord_access_codes
	where class_id = p_class_id;

	if existing_code is not null then
		return existing_code;
	end if;

	loop
		new_code := public.generate_access_code(8);
		begin
			insert into public.class_coord_access_codes (class_id, access_code)
			values (p_class_id, new_code);

			return new_code;
		exception when unique_violation then
			continue;
		end;
	end loop;
end;
$$;

create or replace function public.create_class_coord_access_code_after_class_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	perform public.ensure_class_coord_access_code(new.id);
	return new;
end;
$$;

drop trigger if exists create_class_coord_access_code_after_class_insert on public.classes;
create trigger create_class_coord_access_code_after_class_insert
after insert on public.classes
for each row
execute function public.create_class_coord_access_code_after_class_insert();

create or replace function public.is_coord_of_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.coord_class_memberships ccm
		where ccm.class_id = p_class_id
			and ccm.coord_id = auth.uid()
	)
$$;

create or replace function public.claim_coord_class_access_code(p_access_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
	normalized_code text;
	target_class_id uuid;
begin
	if public.current_app_role() <> 'coord' then
		raise exception 'Only coordinators can claim a class access code.';
	end if;

	normalized_code := upper(regexp_replace(coalesce(p_access_code, ''), '\s+', '', 'g'));

	if normalized_code = '' then
		raise exception 'Access code is required.';
	end if;

	select class_id
	into target_class_id
	from public.class_coord_access_codes
	where access_code = normalized_code;

	if target_class_id is null then
		raise exception 'Access code not found.';
	end if;

	insert into public.coord_class_memberships (class_id, coord_id)
	values (target_class_id, auth.uid())
	on conflict (class_id, coord_id) do nothing;

	return target_class_id;
end;
$$;

insert into public.class_coord_access_codes (class_id, access_code)
select c.id, public.generate_access_code(8)
from public.classes c
left join public.class_coord_access_codes ccac on ccac.class_id = c.id
where ccac.class_id is null;

alter table public.class_coord_access_codes enable row level security;
alter table public.coord_class_memberships enable row level security;

drop policy if exists "class_coord_access_codes_select_scoped" on public.class_coord_access_codes;
drop policy if exists "coord_class_memberships_select_scoped" on public.coord_class_memberships;

create policy "class_coord_access_codes_select_scoped"
on public.class_coord_access_codes
for select
to authenticated
using (
	public.is_teacher_of_class(class_id)
	or public.is_coord_of_class(class_id)
);

create policy "coord_class_memberships_select_scoped"
on public.coord_class_memberships
for select
to authenticated
using (
	coord_id = auth.uid()
	or public.is_teacher_of_class(class_id)
);

grant execute on function public.ensure_class_coord_access_code(uuid) to authenticated;
grant execute on function public.claim_coord_class_access_code(text) to authenticated;

commit;
