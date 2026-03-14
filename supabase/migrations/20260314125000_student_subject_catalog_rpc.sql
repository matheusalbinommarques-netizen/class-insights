begin;

create or replace function public.get_student_subject_catalog(p_class_id uuid)
returns table (
	id uuid,
	name text,
	code text
)
language sql
stable
security definer
set search_path = public
as $$
	select distinct s.id, s.name, s.code
	from public.subjects s
	join public.class_subjects cs on cs.subject_id = s.id
	join public.students st on st.class_id = cs.class_id
	where cs.class_id = p_class_id
		and st.user_id = auth.uid()
$$;

revoke all on function public.get_student_subject_catalog(uuid) from public;
grant execute on function public.get_student_subject_catalog(uuid) to authenticated;

commit;
