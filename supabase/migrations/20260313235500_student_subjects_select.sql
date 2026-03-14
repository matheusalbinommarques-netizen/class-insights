begin;

drop policy if exists "subjects_select_student_scoped" on public.subjects;

create policy "subjects_select_student_scoped"
on public.subjects
for select
to authenticated
using (
	exists (
		select 1
		from public.class_subjects cs
		join public.students s on s.class_id = cs.class_id
		where cs.subject_id = subjects.id
			and s.user_id = auth.uid()
	)
);

commit;
