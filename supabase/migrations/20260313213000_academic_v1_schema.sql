begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = timezone('utc', now());
	return new;
end;
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
	select p.role
	from public.profiles p
	where p.id = auth.uid()
$$;

create or replace function public.is_coord()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select coalesce(public.current_app_role() = 'coord', false)
$$;

create or replace function public.is_teacher_of_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.classes c
		where c.id = p_class_id
			and c.teacher_id = auth.uid()
	)
$$;

create or replace function public.is_student_of_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.students s
		where s.class_id = p_class_id
			and s.user_id = auth.uid()
	)
$$;

create table if not exists public.subjects (
	id uuid primary key default gen_random_uuid(),
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now()),
	name text not null,
	code text null,
	created_by uuid null references public.profiles (id) on delete set null,
	constraint subjects_name_not_blank check (btrim(name) <> ''),
	constraint subjects_code_not_blank check (code is null or btrim(code) <> '')
);

drop trigger if exists set_subjects_updated_at on public.subjects;
create trigger set_subjects_updated_at
before update on public.subjects
for each row
execute function public.set_updated_at();

create table if not exists public.class_subjects (
	id uuid primary key default gen_random_uuid(),
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now()),
	class_id uuid not null references public.classes (id) on delete cascade,
	subject_id uuid not null references public.subjects (id) on delete cascade,
	teacher_id uuid not null references public.profiles (id) on delete restrict,
	constraint class_subjects_class_subject_unique unique (class_id, subject_id)
);

drop trigger if exists set_class_subjects_updated_at on public.class_subjects;
create trigger set_class_subjects_updated_at
before update on public.class_subjects
for each row
execute function public.set_updated_at();

create or replace function public.validate_class_subject_teacher()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	class_teacher_id uuid;
begin
	select c.teacher_id
	into class_teacher_id
	from public.classes c
	where c.id = new.class_id;

	if class_teacher_id is null then
		raise exception 'Class % not found for class_subjects.', new.class_id;
	end if;

	if new.teacher_id <> class_teacher_id then
		raise exception 'teacher_id must match classes.teacher_id for class_subjects.';
	end if;

	return new;
end;
$$;

drop trigger if exists validate_class_subjects_teacher on public.class_subjects;
create trigger validate_class_subjects_teacher
before insert or update on public.class_subjects
for each row
execute function public.validate_class_subject_teacher();

create table if not exists public.assessments (
	id uuid primary key default gen_random_uuid(),
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now()),
	class_id uuid not null,
	subject_id uuid not null,
	title text not null,
	assessment_date date not null,
	weight numeric(8,2) not null default 1.00,
	status text not null default 'draft',
	published_at timestamptz null,
	published_by uuid null references public.profiles (id) on delete set null,
	constraint assessments_title_not_blank check (btrim(title) <> ''),
	constraint assessments_weight_positive check (weight > 0),
	constraint assessments_status_valid check (status in ('draft', 'published')),
	constraint assessments_publication_consistency check (
		(status = 'draft' and published_at is null and published_by is null)
		or
		(status = 'published' and published_at is not null and published_by is not null)
	),
	constraint assessments_class_subject_fk
		foreign key (class_id, subject_id)
		references public.class_subjects (class_id, subject_id)
		on delete restrict
);

drop trigger if exists set_assessments_updated_at on public.assessments;
create trigger set_assessments_updated_at
before update on public.assessments
for each row
execute function public.set_updated_at();

create or replace function public.apply_assessment_status_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	new.title = regexp_replace(btrim(new.title), '\s+', ' ', 'g');

	if tg_op = 'INSERT' then
		if new.status = 'draft' then
			new.published_at = null;
			new.published_by = null;
		elsif new.status = 'published' then
			new.published_at = coalesce(new.published_at, timezone('utc', now()));
			new.published_by = coalesce(new.published_by, auth.uid());

			if new.published_by is null then
				raise exception 'published_by is required when publishing an assessment.';
			end if;
		end if;

		return new;
	end if;

	if old.status = 'published' and (
		new.class_id is distinct from old.class_id
		or new.subject_id is distinct from old.subject_id
		or new.title is distinct from old.title
		or new.assessment_date is distinct from old.assessment_date
		or new.weight is distinct from old.weight
		or new.status is distinct from old.status
		or new.published_at is distinct from old.published_at
		or new.published_by is distinct from old.published_by
	) then
		raise exception 'Published assessments are immutable in V1.';
	end if;

	if old.status = 'published' and new.status = 'draft' then
		raise exception 'Assessment status cannot move from published back to draft.';
	end if;

	if old.status = 'draft' and new.status = 'published' then
		new.published_at = coalesce(new.published_at, timezone('utc', now()));
		new.published_by = coalesce(new.published_by, auth.uid());

		if new.published_by is null then
			raise exception 'published_by is required when publishing an assessment.';
		end if;
	elsif new.status = 'draft' then
		new.published_at = null;
		new.published_by = null;
	end if;

	return new;
end;
$$;

drop trigger if exists apply_assessment_status_rules on public.assessments;
create trigger apply_assessment_status_rules
before insert or update on public.assessments
for each row
execute function public.apply_assessment_status_rules();

create table if not exists public.assessment_results (
	id uuid primary key default gen_random_uuid(),
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now()),
	assessment_id uuid not null references public.assessments (id) on delete cascade,
	student_id uuid not null references public.students (id) on delete cascade,
	raw_score numeric(10,4) null,
	score_min numeric(10,4) not null,
	score_max numeric(10,4) not null,
	score_decimals integer not null default 1,
	is_excused boolean not null default false,
	notes text null,
	constraint assessment_results_unique_student_per_assessment unique (assessment_id, student_id),
	constraint assessment_results_score_range_valid check (score_max > score_min),
	constraint assessment_results_score_decimals_valid check (score_decimals between 0 and 4),
	constraint assessment_results_raw_score_valid check (
		raw_score is null
		or (raw_score >= score_min and raw_score <= score_max)
	)
);

drop trigger if exists set_assessment_results_updated_at on public.assessment_results;
create trigger set_assessment_results_updated_at
before update on public.assessment_results
for each row
execute function public.set_updated_at();

create or replace function public.validate_assessment_result_context()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	assessment_class_id uuid;
	assessment_status text;
	student_class_id uuid;
begin
	select a.class_id, a.status
	into assessment_class_id, assessment_status
	from public.assessments a
	where a.id = new.assessment_id;

	if assessment_class_id is null then
		raise exception 'Assessment % not found for assessment_results.', new.assessment_id;
	end if;

	if assessment_status = 'published' then
		raise exception 'Assessment results cannot be changed after publication.';
	end if;

	select s.class_id
	into student_class_id
	from public.students s
	where s.id = new.student_id;

	if student_class_id is null then
		raise exception 'Student % not found for assessment_results.', new.student_id;
	end if;

	if student_class_id <> assessment_class_id then
		raise exception 'Student must belong to the same class as the assessment.';
	end if;

	return new;
end;
$$;

drop trigger if exists validate_assessment_results_context on public.assessment_results;
create trigger validate_assessment_results_context
before insert or update on public.assessment_results
for each row
execute function public.validate_assessment_result_context();

create or replace function public.block_assessment_result_delete_when_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	assessment_status text;
begin
	select a.status
	into assessment_status
	from public.assessments a
	where a.id = old.assessment_id;

	if assessment_status = 'published' then
		raise exception 'Assessment results cannot be deleted after publication.';
	end if;

	return old;
end;
$$;

drop trigger if exists block_assessment_result_delete_when_published on public.assessment_results;
create trigger block_assessment_result_delete_when_published
before delete on public.assessment_results
for each row
execute function public.block_assessment_result_delete_when_published();

create table if not exists public.grade_audit_log (
	id uuid primary key default gen_random_uuid(),
	created_at timestamptz not null default timezone('utc', now()),
	assessment_id uuid not null references public.assessments (id) on delete cascade,
	assessment_result_id uuid null references public.assessment_results (id) on delete set null,
	student_id uuid null references public.students (id) on delete cascade,
	changed_by uuid null references public.profiles (id) on delete set null,
	action_type text not null,
	previous_score numeric(10,4) null,
	next_score numeric(10,4) null,
	reason text null,
	metadata jsonb not null default '{}'::jsonb,
	constraint grade_audit_log_action_type_valid check (
		action_type in ('result_created', 'result_updated', 'result_deleted', 'assessment_published')
	),
	constraint grade_audit_log_publication_shape check (
		(action_type = 'assessment_published' and assessment_result_id is null)
		or action_type <> 'assessment_published'
	)
);

create or replace function public.audit_assessment_result_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	actor_id uuid;
begin
	actor_id := auth.uid();

	if tg_op = 'INSERT' then
		insert into public.grade_audit_log (
			assessment_id,
			assessment_result_id,
			student_id,
			changed_by,
			action_type,
			previous_score,
			next_score,
			metadata
		)
		values (
			new.assessment_id,
			new.id,
			new.student_id,
			actor_id,
			'result_created',
			null,
			new.raw_score,
			jsonb_build_object(
				'is_excused', new.is_excused,
				'score_min', new.score_min,
				'score_max', new.score_max,
				'score_decimals', new.score_decimals
			)
		);

		return new;
	end if;

	if tg_op = 'UPDATE' then
		if old.raw_score is distinct from new.raw_score
			or old.is_excused is distinct from new.is_excused
			or old.notes is distinct from new.notes
			or old.score_min is distinct from new.score_min
			or old.score_max is distinct from new.score_max
			or old.score_decimals is distinct from new.score_decimals then
			insert into public.grade_audit_log (
				assessment_id,
				assessment_result_id,
				student_id,
				changed_by,
				action_type,
				previous_score,
				next_score,
				metadata
			)
			values (
				new.assessment_id,
				new.id,
				new.student_id,
				actor_id,
				'result_updated',
				old.raw_score,
				new.raw_score,
				jsonb_build_object(
					'previous_is_excused', old.is_excused,
					'next_is_excused', new.is_excused,
					'previous_notes', old.notes,
					'next_notes', new.notes,
					'previous_score_min', old.score_min,
					'next_score_min', new.score_min,
					'previous_score_max', old.score_max,
					'next_score_max', new.score_max,
					'previous_score_decimals', old.score_decimals,
					'next_score_decimals', new.score_decimals
				)
			);
		end if;

		return new;
	end if;

	insert into public.grade_audit_log (
		assessment_id,
		assessment_result_id,
		student_id,
		changed_by,
		action_type,
		previous_score,
		next_score,
		metadata
	)
	values (
		old.assessment_id,
		old.id,
		old.student_id,
		actor_id,
		'result_deleted',
		old.raw_score,
		null,
		jsonb_build_object(
			'is_excused', old.is_excused,
			'notes', old.notes,
			'score_min', old.score_min,
			'score_max', old.score_max,
			'score_decimals', old.score_decimals
		)
	);

	return old;
end;
$$;

drop trigger if exists audit_assessment_result_changes on public.assessment_results;
create trigger audit_assessment_result_changes
after insert or update or delete on public.assessment_results
for each row
execute function public.audit_assessment_result_changes();

create or replace function public.audit_assessment_publication()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	if old.status = 'draft' and new.status = 'published' then
		insert into public.grade_audit_log (
			assessment_id,
			assessment_result_id,
			student_id,
			changed_by,
			action_type,
			previous_score,
			next_score,
			metadata
		)
		values (
			new.id,
			null,
			null,
			coalesce(new.published_by, auth.uid()),
			'assessment_published',
			null,
			null,
			jsonb_build_object(
				'published_at', new.published_at,
				'subject_id', new.subject_id,
				'class_id', new.class_id
			)
		);
	end if;

	return new;
end;
$$;

drop trigger if exists audit_assessment_publication on public.assessments;
create trigger audit_assessment_publication
after update on public.assessments
for each row
execute function public.audit_assessment_publication();

create index if not exists idx_subjects_name on public.subjects (lower(name));
create index if not exists idx_subjects_code on public.subjects (upper(code)) where code is not null;
create index if not exists idx_class_subjects_teacher_id on public.class_subjects (teacher_id);
create index if not exists idx_class_subjects_subject_id on public.class_subjects (subject_id);
create index if not exists idx_assessments_class_date on public.assessments (class_id, assessment_date desc);
create index if not exists idx_assessments_subject_date on public.assessments (subject_id, assessment_date desc);
create index if not exists idx_assessments_status on public.assessments (status, assessment_date desc);
create index if not exists idx_assessment_results_assessment_id on public.assessment_results (assessment_id);
create index if not exists idx_assessment_results_student_id on public.assessment_results (student_id);
create index if not exists idx_grade_audit_log_assessment_id on public.grade_audit_log (assessment_id, created_at desc);
create index if not exists idx_grade_audit_log_student_id on public.grade_audit_log (student_id, created_at desc);
create index if not exists idx_grade_audit_log_changed_by on public.grade_audit_log (changed_by, created_at desc);

alter table public.subjects enable row level security;
alter table public.class_subjects enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_results enable row level security;
alter table public.grade_audit_log enable row level security;

drop policy if exists "subjects_select_teacher_coord" on public.subjects;
drop policy if exists "subjects_insert_teacher_coord" on public.subjects;
drop policy if exists "subjects_update_teacher_coord" on public.subjects;

drop policy if exists "class_subjects_select_teacher_coord" on public.class_subjects;
drop policy if exists "class_subjects_insert_teacher" on public.class_subjects;
drop policy if exists "class_subjects_update_teacher_or_coord" on public.class_subjects;
drop policy if exists "class_subjects_delete_teacher_or_coord" on public.class_subjects;

drop policy if exists "assessments_select_teacher" on public.assessments;
drop policy if exists "assessments_select_coord" on public.assessments;
drop policy if exists "assessments_select_student_published" on public.assessments;
drop policy if exists "assessments_insert_teacher" on public.assessments;
drop policy if exists "assessments_update_teacher" on public.assessments;
drop policy if exists "assessments_delete_teacher" on public.assessments;

drop policy if exists "assessment_results_select_teacher" on public.assessment_results;
drop policy if exists "assessment_results_select_coord" on public.assessment_results;
drop policy if exists "assessment_results_select_student_published" on public.assessment_results;
drop policy if exists "assessment_results_insert_teacher" on public.assessment_results;
drop policy if exists "assessment_results_update_teacher" on public.assessment_results;
drop policy if exists "assessment_results_delete_teacher" on public.assessment_results;

drop policy if exists "grade_audit_log_select_teacher" on public.grade_audit_log;
drop policy if exists "grade_audit_log_select_coord" on public.grade_audit_log;

create policy "subjects_select_teacher_coord"
on public.subjects
for select
to authenticated
using (
	public.current_app_role() in ('teacher', 'coord')
);

create policy "subjects_insert_teacher_coord"
on public.subjects
for insert
to authenticated
with check (
	public.current_app_role() in ('teacher', 'coord')
);

create policy "subjects_update_teacher_coord"
on public.subjects
for update
to authenticated
using (
	public.current_app_role() in ('teacher', 'coord')
)
with check (
	public.current_app_role() in ('teacher', 'coord')
);

create policy "class_subjects_select_teacher_coord"
on public.class_subjects
for select
to authenticated
using (
	public.is_coord()
	or teacher_id = auth.uid()
);

create policy "class_subjects_insert_teacher"
on public.class_subjects
for insert
to authenticated
with check (
	teacher_id = auth.uid()
	and public.is_teacher_of_class(class_id)
);

create policy "class_subjects_update_teacher_or_coord"
on public.class_subjects
for update
to authenticated
using (
	public.is_coord()
	or (teacher_id = auth.uid() and public.is_teacher_of_class(class_id))
)
with check (
	public.is_coord()
	or (teacher_id = auth.uid() and public.is_teacher_of_class(class_id))
);

create policy "class_subjects_delete_teacher_or_coord"
on public.class_subjects
for delete
to authenticated
using (
	public.is_coord()
	or (teacher_id = auth.uid() and public.is_teacher_of_class(class_id))
);

create policy "assessments_select_teacher"
on public.assessments
for select
to authenticated
using (
	public.is_teacher_of_class(class_id)
);

create policy "assessments_select_coord"
on public.assessments
for select
to authenticated
using (
	public.is_coord()
);

create policy "assessments_select_student_published"
on public.assessments
for select
to authenticated
using (
	status = 'published'
	and public.is_student_of_class(class_id)
);

create policy "assessments_insert_teacher"
on public.assessments
for insert
to authenticated
with check (
	public.is_teacher_of_class(class_id)
);

create policy "assessments_update_teacher"
on public.assessments
for update
to authenticated
using (
	public.is_teacher_of_class(class_id)
)
with check (
	public.is_teacher_of_class(class_id)
);

create policy "assessments_delete_teacher"
on public.assessments
for delete
to authenticated
using (
	public.is_teacher_of_class(class_id)
);

create policy "assessment_results_select_teacher"
on public.assessment_results
for select
to authenticated
using (
	exists (
		select 1
		from public.assessments a
		where a.id = assessment_results.assessment_id
			and public.is_teacher_of_class(a.class_id)
	)
);

create policy "assessment_results_select_coord"
on public.assessment_results
for select
to authenticated
using (
	public.is_coord()
);

create policy "assessment_results_select_student_published"
on public.assessment_results
for select
to authenticated
using (
	exists (
		select 1
		from public.assessments a
		join public.students s on s.id = assessment_results.student_id
		where a.id = assessment_results.assessment_id
			and a.status = 'published'
			and s.user_id = auth.uid()
	)
);

create policy "assessment_results_insert_teacher"
on public.assessment_results
for insert
to authenticated
with check (
	exists (
		select 1
		from public.assessments a
		where a.id = assessment_results.assessment_id
			and public.is_teacher_of_class(a.class_id)
	)
);

create policy "assessment_results_update_teacher"
on public.assessment_results
for update
to authenticated
using (
	exists (
		select 1
		from public.assessments a
		where a.id = assessment_results.assessment_id
			and public.is_teacher_of_class(a.class_id)
	)
)
with check (
	exists (
		select 1
		from public.assessments a
		where a.id = assessment_results.assessment_id
			and public.is_teacher_of_class(a.class_id)
	)
);

create policy "assessment_results_delete_teacher"
on public.assessment_results
for delete
to authenticated
using (
	exists (
		select 1
		from public.assessments a
		where a.id = assessment_results.assessment_id
			and public.is_teacher_of_class(a.class_id)
	)
);

create policy "grade_audit_log_select_teacher"
on public.grade_audit_log
for select
to authenticated
using (
	exists (
		select 1
		from public.assessments a
		where a.id = grade_audit_log.assessment_id
			and public.is_teacher_of_class(a.class_id)
	)
);

create policy "grade_audit_log_select_coord"
on public.grade_audit_log
for select
to authenticated
using (
	public.is_coord()
);

commit;