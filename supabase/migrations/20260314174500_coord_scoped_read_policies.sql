begin;

drop policy if exists "class_subjects_select_teacher_coord" on public.class_subjects;
drop policy if exists "class_subjects_update_teacher_or_coord" on public.class_subjects;
drop policy if exists "class_subjects_delete_teacher_or_coord" on public.class_subjects;
drop policy if exists "assessments_select_coord" on public.assessments;
drop policy if exists "assessment_results_select_coord" on public.assessment_results;
drop policy if exists "grade_audit_log_select_coord" on public.grade_audit_log;

create policy "class_subjects_select_teacher_coord"
on public.class_subjects
for select
to authenticated
using (
	public.is_coord_of_class(class_id)
	or teacher_id = auth.uid()
);

create policy "class_subjects_update_teacher_or_coord"
on public.class_subjects
for update
to authenticated
using (
	public.is_coord_of_class(class_id)
	or (teacher_id = auth.uid() and public.is_teacher_of_class(class_id))
)
with check (
	public.is_coord_of_class(class_id)
	or (teacher_id = auth.uid() and public.is_teacher_of_class(class_id))
);

create policy "class_subjects_delete_teacher_or_coord"
on public.class_subjects
for delete
to authenticated
using (
	public.is_coord_of_class(class_id)
	or (teacher_id = auth.uid() and public.is_teacher_of_class(class_id))
);

create policy "assessments_select_coord"
on public.assessments
for select
to authenticated
using (
	public.is_coord_of_class(class_id)
);

create policy "assessment_results_select_coord"
on public.assessment_results
for select
to authenticated
using (
	exists (
		select 1
		from public.assessments a
		where a.id = assessment_results.assessment_id
			and public.is_coord_of_class(a.class_id)
	)
);

create policy "grade_audit_log_select_coord"
on public.grade_audit_log
for select
to authenticated
using (
	exists (
		select 1
		from public.assessments a
		where a.id = grade_audit_log.assessment_id
			and public.is_coord_of_class(a.class_id)
	)
);

commit;
