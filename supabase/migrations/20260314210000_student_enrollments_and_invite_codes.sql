begin;

create table if not exists public.enrollments (
	id uuid primary key default gen_random_uuid(),
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now()),
	student_id uuid not null references public.students (id) on delete cascade,
	class_id uuid not null references public.classes (id) on delete cascade,
	teacher_id uuid not null references public.profiles (id) on delete restrict,
	status text not null default 'pending',
	claimed_by_user_id uuid null references public.profiles (id) on delete set null,
	joined_at timestamptz null,
	left_at timestamptz null,
	constraint enrollments_status_valid check (status in ('pending', 'active', 'archived')),
	constraint enrollments_unique_student_class_teacher unique (student_id, class_id, teacher_id)
);

drop trigger if exists set_enrollments_updated_at on public.enrollments;
create trigger set_enrollments_updated_at
before update on public.enrollments
for each row
execute function public.set_updated_at();

create table if not exists public.teacher_invite_codes (
	id uuid primary key default gen_random_uuid(),
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now()),
	code text not null,
	student_id uuid not null references public.students (id) on delete cascade,
	class_id uuid not null references public.classes (id) on delete cascade,
	teacher_id uuid not null references public.profiles (id) on delete restrict,
	status text not null default 'active',
	claimed_by_user_id uuid null references public.profiles (id) on delete set null,
	claimed_at timestamptz null,
	archived_at timestamptz null,
	constraint teacher_invite_codes_code_unique unique (code),
	constraint teacher_invite_codes_unique_student_class_teacher unique (student_id, class_id, teacher_id),
	constraint teacher_invite_codes_status_valid check (status in ('active', 'claimed', 'archived'))
);

drop trigger if exists set_teacher_invite_codes_updated_at on public.teacher_invite_codes;
create trigger set_teacher_invite_codes_updated_at
before update on public.teacher_invite_codes
for each row
execute function public.set_updated_at();

create or replace function public.normalize_teacher_invite_code()
returns trigger
language plpgsql
as $$
begin
	new.code = upper(regexp_replace(btrim(new.code), '\s+', '', 'g'));

	if new.code = '' then
		raise exception 'Invite code cannot be blank.';
	end if;

	return new;
end;
$$;

drop trigger if exists normalize_teacher_invite_code on public.teacher_invite_codes;
create trigger normalize_teacher_invite_code
before insert or update on public.teacher_invite_codes
for each row
execute function public.normalize_teacher_invite_code();

create or replace function public.validate_enrollment_context()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	student_class_id uuid;
	class_teacher_id uuid;
begin
	select s.class_id
	into student_class_id
	from public.students s
	where s.id = new.student_id;

	if student_class_id is null then
		raise exception 'Student % not found for enrollment.', new.student_id;
	end if;

	if student_class_id <> new.class_id then
		raise exception 'Enrollment class_id must match students.class_id.';
	end if;

	select c.teacher_id
	into class_teacher_id
	from public.classes c
	where c.id = new.class_id;

	if class_teacher_id is null then
		raise exception 'Class % not found for enrollment.', new.class_id;
	end if;

	if class_teacher_id <> new.teacher_id then
		raise exception 'Enrollment teacher_id must match classes.teacher_id.';
	end if;

	if new.status = 'active' and new.claimed_by_user_id is null then
		raise exception 'Active enrollment requires claimed_by_user_id.';
	end if;

	return new;
end;
$$;

drop trigger if exists validate_enrollment_context on public.enrollments;
create trigger validate_enrollment_context
before insert or update on public.enrollments
for each row
execute function public.validate_enrollment_context();

create or replace function public.validate_teacher_invite_code_context()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	student_class_id uuid;
	class_teacher_id uuid;
begin
	select s.class_id
	into student_class_id
	from public.students s
	where s.id = new.student_id;

	if student_class_id is null then
		raise exception 'Student % not found for teacher_invite_codes.', new.student_id;
	end if;

	if student_class_id <> new.class_id then
		raise exception 'Invite code class_id must match students.class_id.';
	end if;

	select c.teacher_id
	into class_teacher_id
	from public.classes c
	where c.id = new.class_id;

	if class_teacher_id is null then
		raise exception 'Class % not found for teacher_invite_codes.', new.class_id;
	end if;

	if class_teacher_id <> new.teacher_id then
		raise exception 'Invite code teacher_id must match classes.teacher_id.';
	end if;

	if new.status = 'claimed' and new.claimed_by_user_id is null then
		raise exception 'Claimed invite code requires claimed_by_user_id.';
	end if;

	return new;
end;
$$;

drop trigger if exists validate_teacher_invite_code_context on public.teacher_invite_codes;
create trigger validate_teacher_invite_code_context
before insert or update on public.teacher_invite_codes
for each row
execute function public.validate_teacher_invite_code_context();

create or replace function public.sync_student_linkage_records()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	class_teacher_id uuid;
	normalized_invite_code text;
	effective_claimed_by uuid;
begin
	if new.class_id is null then
		return new;
	end if;

	select c.teacher_id
	into class_teacher_id
	from public.classes c
	where c.id = new.class_id;

	if class_teacher_id is null then
		return new;
	end if;

	effective_claimed_by := new.user_id;

	insert into public.enrollments (
		student_id,
		class_id,
		teacher_id,
		status,
		claimed_by_user_id,
		joined_at,
		left_at
	)
	values (
		new.id,
		new.class_id,
		class_teacher_id,
		case when effective_claimed_by is null then 'pending' else 'active' end,
		effective_claimed_by,
		case when effective_claimed_by is null then null else timezone('utc', now()) end,
		null
	)
	on conflict (student_id, class_id, teacher_id)
	do update
	set claimed_by_user_id = coalesce(excluded.claimed_by_user_id, enrollments.claimed_by_user_id),
		status = case
			when coalesce(excluded.claimed_by_user_id, enrollments.claimed_by_user_id) is null then 'pending'
			else 'active'
		end,
		joined_at = coalesce(enrollments.joined_at, excluded.joined_at),
		left_at = null,
		updated_at = timezone('utc', now());

	normalized_invite_code := nullif(upper(regexp_replace(btrim(coalesce(new.invite_code, '')), '\s+', '', 'g')), '');

	if normalized_invite_code is null then
		return new;
	end if;

	insert into public.teacher_invite_codes (
		code,
		student_id,
		class_id,
		teacher_id,
		status,
		claimed_by_user_id,
		claimed_at,
		archived_at
	)
	values (
		normalized_invite_code,
		new.id,
		new.class_id,
		class_teacher_id,
		case when effective_claimed_by is null then 'active' else 'claimed' end,
		effective_claimed_by,
		case when effective_claimed_by is null then null else timezone('utc', now()) end,
		null
	)
	on conflict (student_id, class_id, teacher_id)
	do update
	set code = excluded.code,
		claimed_by_user_id = coalesce(excluded.claimed_by_user_id, teacher_invite_codes.claimed_by_user_id),
		status = case
			when coalesce(excluded.claimed_by_user_id, teacher_invite_codes.claimed_by_user_id) is null then 'active'
			else 'claimed'
		end,
		claimed_at = coalesce(teacher_invite_codes.claimed_at, excluded.claimed_at),
		archived_at = null,
		updated_at = timezone('utc', now());

	return new;
end;
$$;

drop trigger if exists sync_student_linkage_records on public.students;
create trigger sync_student_linkage_records
after insert or update of class_id, user_id, invite_code on public.students
for each row
execute function public.sync_student_linkage_records();

insert into public.enrollments (
	student_id,
	class_id,
	teacher_id,
	status,
	claimed_by_user_id,
	joined_at,
	left_at
)
select
	s.id,
	s.class_id,
	c.teacher_id,
	case when s.user_id is null then 'pending' else 'active' end,
	s.user_id,
	case when s.user_id is null then null else timezone('utc', now()) end,
	null
from public.students s
join public.classes c on c.id = s.class_id
where s.class_id is not null
on conflict (student_id, class_id, teacher_id) do nothing;

insert into public.teacher_invite_codes (
	code,
	student_id,
	class_id,
	teacher_id,
	status,
	claimed_by_user_id,
	claimed_at,
	archived_at
)
select
	upper(regexp_replace(btrim(s.invite_code), '\s+', '', 'g')),
	s.id,
	s.class_id,
	c.teacher_id,
	case when s.user_id is null then 'active' else 'claimed' end,
	s.user_id,
	case when s.user_id is null then null else timezone('utc', now()) end,
	null
from public.students s
join public.classes c on c.id = s.class_id
where s.class_id is not null
	and s.invite_code is not null
	and btrim(s.invite_code) <> ''
on conflict (student_id, class_id, teacher_id) do nothing;

create or replace function public.is_student_of_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.enrollments e
		where e.class_id = p_class_id
			and e.claimed_by_user_id = auth.uid()
			and e.status = 'active'
	)
	or exists (
		select 1
		from public.students s
		where s.class_id = p_class_id
			and s.user_id = auth.uid()
	)
$$;

drop function if exists public.claim_student_by_invite_code(text);

create function public.claim_student_by_invite_code(p_invite_code text)
returns table (
	student_id uuid,
	class_id uuid,
	teacher_id uuid,
	status text,
	student_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
	normalized_code text;
	invite_row public.teacher_invite_codes%rowtype;
	student_name_value text;
begin
	if auth.uid() is null then
		raise exception 'Authentication required.';
	end if;

	normalized_code := nullif(upper(regexp_replace(btrim(coalesce(p_invite_code, '')), '\s+', '', 'g')), '');

	if normalized_code is null then
		return;
	end if;

	select tic.*
	into invite_row
	from public.teacher_invite_codes tic
	where tic.code = normalized_code
		and tic.status in ('active', 'claimed')
	limit 1;

	if invite_row.id is null then
		return;
	end if;

	if invite_row.claimed_by_user_id is not null and invite_row.claimed_by_user_id <> auth.uid() then
		raise exception 'This invite code is already linked to another account.';
	end if;

	update public.students
	set user_id = auth.uid()
	where id = invite_row.student_id
		and (user_id is null or user_id = auth.uid());

	if not found then
		raise exception 'This academic record is already linked to another account.';
	end if;

	insert into public.enrollments (
		student_id,
		class_id,
		teacher_id,
		status,
		claimed_by_user_id,
		joined_at,
		left_at
	)
	values (
		invite_row.student_id,
		invite_row.class_id,
		invite_row.teacher_id,
		'active',
		auth.uid(),
		coalesce(invite_row.claimed_at, timezone('utc', now())),
		null
	)
	on conflict (student_id, class_id, teacher_id)
	do update
	set claimed_by_user_id = auth.uid(),
		status = 'active',
		joined_at = coalesce(enrollments.joined_at, timezone('utc', now())),
		left_at = null,
		updated_at = timezone('utc', now());

	update public.teacher_invite_codes
	set claimed_by_user_id = auth.uid(),
		status = 'claimed',
		claimed_at = coalesce(claimed_at, timezone('utc', now())),
		archived_at = null,
		updated_at = timezone('utc', now())
	where id = invite_row.id;

	select s.name
	into student_name_value
	from public.students s
	where s.id = invite_row.student_id;

	return query
	select
		invite_row.student_id,
		invite_row.class_id,
		invite_row.teacher_id,
		'active'::text,
		student_name_value;
end;
$$;

create or replace function public.get_my_student_enrollments()
returns table (
	enrollment_id uuid,
	student_id uuid,
	class_id uuid,
	teacher_id uuid,
	status text,
	joined_at timestamptz,
	left_at timestamptz,
	student_name text,
	class_name text
)
language sql
stable
security definer
set search_path = public
as $$
	select
		e.id as enrollment_id,
		e.student_id,
		e.class_id,
		e.teacher_id,
		e.status,
		e.joined_at,
		e.left_at,
		s.name as student_name,
		c.name as class_name
	from public.enrollments e
	join public.students s on s.id = e.student_id
	join public.classes c on c.id = e.class_id
	where e.claimed_by_user_id = auth.uid()
		and e.status <> 'archived'
	order by
		case when e.status = 'active' then 0 else 1 end,
		e.joined_at desc nulls last,
		e.created_at desc
$$;

create index if not exists idx_enrollments_claimed_user on public.enrollments (
	claimed_by_user_id,
	status,
	joined_at desc
);
create index if not exists idx_enrollments_class on public.enrollments (class_id, status);
create index if not exists idx_teacher_invite_codes_teacher on public.teacher_invite_codes (
	teacher_id,
	status,
	created_at desc
);
create index if not exists idx_teacher_invite_codes_claimed_user on public.teacher_invite_codes (
	claimed_by_user_id,
	status,
	claimed_at desc
);

alter table public.enrollments enable row level security;
alter table public.teacher_invite_codes enable row level security;

drop policy if exists "enrollments_select_student_teacher_coord" on public.enrollments;
drop policy if exists "enrollments_insert_teacher" on public.enrollments;
drop policy if exists "enrollments_update_teacher" on public.enrollments;
drop policy if exists "teacher_invite_codes_select_student_teacher_coord" on public.teacher_invite_codes;
drop policy if exists "teacher_invite_codes_insert_teacher" on public.teacher_invite_codes;
drop policy if exists "teacher_invite_codes_update_teacher" on public.teacher_invite_codes;

create policy "enrollments_select_student_teacher_coord"
on public.enrollments
for select
to authenticated
using (
	claimed_by_user_id = auth.uid()
	or teacher_id = auth.uid()
	or exists (
		select 1
		from public.coord_class_memberships ccm
		where ccm.coord_id = auth.uid()
			and ccm.class_id = enrollments.class_id
	)
);

create policy "enrollments_insert_teacher"
on public.enrollments
for insert
to authenticated
with check (
	teacher_id = auth.uid()
	and public.is_teacher_of_class(class_id)
);

create policy "enrollments_update_teacher"
on public.enrollments
for update
to authenticated
using (
	teacher_id = auth.uid()
	and public.is_teacher_of_class(class_id)
)
with check (
	teacher_id = auth.uid()
	and public.is_teacher_of_class(class_id)
);

create policy "teacher_invite_codes_select_student_teacher_coord"
on public.teacher_invite_codes
for select
to authenticated
using (
	claimed_by_user_id = auth.uid()
	or teacher_id = auth.uid()
	or exists (
		select 1
		from public.coord_class_memberships ccm
		where ccm.coord_id = auth.uid()
			and ccm.class_id = teacher_invite_codes.class_id
	)
);

create policy "teacher_invite_codes_insert_teacher"
on public.teacher_invite_codes
for insert
to authenticated
with check (
	teacher_id = auth.uid()
	and public.is_teacher_of_class(class_id)
);

create policy "teacher_invite_codes_update_teacher"
on public.teacher_invite_codes
for update
to authenticated
using (
	teacher_id = auth.uid()
	and public.is_teacher_of_class(class_id)
)
with check (
	teacher_id = auth.uid()
	and public.is_teacher_of_class(class_id)
);

commit;
