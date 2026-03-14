begin;

create or replace function public.coord_scope_classes()
returns table (
	class_id uuid,
	class_name text,
	teacher_id uuid,
	teacher_name text,
	access_code text
)
language sql
stable
security definer
set search_path = public
as $$
	select
		c.id as class_id,
		c.name as class_name,
		c.teacher_id,
		coalesce(p.display_name, 'Professor') as teacher_name,
		ccac.access_code
	from public.coord_class_memberships ccm
	join public.classes c on c.id = ccm.class_id
	left join public.profiles p on p.id = c.teacher_id
	left join public.class_coord_access_codes ccac on ccac.class_id = c.id
	where ccm.coord_id = auth.uid()
	order by c.name;
$$;

create or replace function public.coord_scope_students()
returns table (
	student_id uuid,
	student_name text,
	class_id uuid,
	class_name text
)
language sql
stable
security definer
set search_path = public
as $$
	select
		s.id as student_id,
		s.name as student_name,
		s.class_id,
		c.name as class_name
	from public.coord_class_memberships ccm
	join public.classes c on c.id = ccm.class_id
	join public.students s on s.class_id = c.id
	where ccm.coord_id = auth.uid()
	order by c.name, s.name;
$$;

grant execute on function public.coord_scope_classes() to authenticated;
grant execute on function public.coord_scope_students() to authenticated;

commit;
