export type OwnedClass = {
	id: string;
	name: string;
	score_min: number;
	score_max: number;
	score_decimals: number;
	access_code: string | null;
};

export type OwnedSkill = {
	id: string;
	class_id: string;
	score_min: number | null;
	score_max: number | null;
	score_decimals: number | null;
};

export type OwnedAssessment = {
	id: string;
	class_id: string;
	subject_id: string;
	title: string;
	assessment_date: string;
	weight: number;
	status: 'draft' | 'published';
	published_at: string | null;
	published_by: string | null;
	class_name: string;
	class_score_min: number;
	class_score_max: number;
	class_score_decimals: number;
	subject_name: string;
	subject_code: string | null;
};

export type OwnedClassSubject = {
	class_id: string;
	subject_id: string;
	teacher_id: string;
};

export async function getOwnedClass(
	locals: App.Locals,
	classId: string,
	userId: string
): Promise<OwnedClass | null> {
	const { data, error } = await locals.supabase
		.from('classes')
		.select('id, name, score_min, score_max, score_decimals')
		.eq('id', classId)
		.eq('teacher_id', userId)
		.maybeSingle();

	if (error || !data) return null;

	const { data: accessCodeData } = await locals.supabase
		.from('class_coord_access_codes')
		.select('access_code')
		.eq('class_id', classId)
		.maybeSingle<{ access_code: string }>();

	return {
		id: data.id,
		name: data.name,
		score_min: data.score_min,
		score_max: data.score_max,
		score_decimals: data.score_decimals,
		access_code: accessCodeData?.access_code ?? null
	};
}

export async function getOwnedStudent(
	locals: App.Locals,
	classId: string,
	studentId: string
): Promise<{ id: string } | null> {
	const { data, error } = await locals.supabase
		.from('students')
		.select('id')
		.eq('id', studentId)
		.eq('class_id', classId)
		.maybeSingle();

	if (error || !data) return null;

	return { id: data.id };
}

export async function getOwnedSkill(
	locals: App.Locals,
	classId: string,
	skillId: string
): Promise<OwnedSkill | null> {
	const { data, error } = await locals.supabase
		.from('skills')
		.select('id, class_id, score_min, score_max, score_decimals')
		.eq('id', skillId)
		.eq('class_id', classId)
		.maybeSingle();

	if (error || !data) return null;

	return {
		id: data.id,
		class_id: data.class_id,
		score_min: data.score_min,
		score_max: data.score_max,
		score_decimals: data.score_decimals
	};
}

export async function getOwnedAssessment(
	locals: App.Locals,
	assessmentId: string,
	userId: string
): Promise<OwnedAssessment | null> {
	const { data, error } = await locals.supabase
		.from('assessments')
		.select(
			'id, class_id, subject_id, title, assessment_date, weight, status, published_at, published_by'
		)
		.eq('id', assessmentId)
		.maybeSingle<{
			id: string;
			class_id: string;
			subject_id: string;
			title: string;
			assessment_date: string;
			weight: number;
			status: 'draft' | 'published';
			published_at: string | null;
			published_by: string | null;
		}>();

	if (error || !data) return null;

	const ownedClass = await getOwnedClass(locals, data.class_id, userId);
	if (!ownedClass) return null;

	const { data: subjectData, error: subjectError } = await locals.supabase
		.from('subjects')
		.select('id, name, code')
		.eq('id', data.subject_id)
		.maybeSingle<{
			id: string;
			name: string;
			code: string | null;
		}>();

	if (subjectError || !subjectData) return null;

	return {
		id: data.id,
		class_id: data.class_id,
		subject_id: data.subject_id,
		title: data.title,
		assessment_date: data.assessment_date,
		weight: data.weight,
		status: data.status,
		published_at: data.published_at,
		published_by: data.published_by,
		class_name: ownedClass.name,
		class_score_min: ownedClass.score_min,
		class_score_max: ownedClass.score_max,
		class_score_decimals: ownedClass.score_decimals,
		subject_name: subjectData.name,
		subject_code: subjectData.code
	};
}

export async function getOwnedClassSubject(
	locals: App.Locals,
	classId: string,
	subjectId: string,
	userId: string
): Promise<OwnedClassSubject | null> {
	const { data, error } = await locals.supabase
		.from('class_subjects')
		.select('class_id, subject_id, teacher_id')
		.eq('class_id', classId)
		.eq('subject_id', subjectId)
		.eq('teacher_id', userId)
		.maybeSingle();

	if (error || !data) return null;

	return {
		class_id: data.class_id,
		subject_id: data.subject_id,
		teacher_id: data.teacher_id
	};
}
