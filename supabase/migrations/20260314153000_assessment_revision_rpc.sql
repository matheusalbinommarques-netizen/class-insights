begin;

create or replace function public.create_assessment_revision(
	p_assessment_id uuid,
	p_title text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
	source_assessment public.assessments%rowtype;
	new_assessment_id uuid;
	effective_title text;
begin
	select a.*
	into source_assessment
	from public.assessments a
	where a.id = p_assessment_id;

	if source_assessment.id is null then
		raise exception 'Assessment % not found.', p_assessment_id;
	end if;

	if not public.is_teacher_of_class(source_assessment.class_id) then
		raise exception 'Only the teacher who owns the class can create a revision.';
	end if;

	if source_assessment.status <> 'published' then
		raise exception 'Only published assessments can be revised.';
	end if;

	effective_title := regexp_replace(
		coalesce(nullif(btrim(p_title), ''), source_assessment.title || ' - Correcao'),
		'\s+',
		' ',
		'g'
	);

	insert into public.assessments (
		class_id,
		subject_id,
		title,
		assessment_date,
		weight,
		status
	)
	values (
		source_assessment.class_id,
		source_assessment.subject_id,
		effective_title,
		source_assessment.assessment_date,
		source_assessment.weight,
		'draft'
	)
	returning id into new_assessment_id;

	insert into public.assessment_results (
		assessment_id,
		student_id,
		raw_score,
		score_min,
		score_max,
		score_decimals,
		is_excused,
		notes
	)
	select
		new_assessment_id,
		ar.student_id,
		ar.raw_score,
		ar.score_min,
		ar.score_max,
		ar.score_decimals,
		ar.is_excused,
		ar.notes
	from public.assessment_results ar
	where ar.assessment_id = source_assessment.id;

	return new_assessment_id;
end;
$$;

revoke all on function public.create_assessment_revision(uuid, text) from public;
grant execute on function public.create_assessment_revision(uuid, text) to authenticated;

commit;
