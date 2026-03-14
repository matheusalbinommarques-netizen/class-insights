export type TeacherInviteCodeRow = {
	student_id: string;
	code: string;
	status: 'active' | 'claimed' | 'archived';
};

export function generateTeacherInviteCode(): string {
	return crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase();
}

export function mapInviteCodesByStudentId(rows: TeacherInviteCodeRow[]): Map<string, string> {
	return new Map(rows.map((row) => [row.student_id, row.code]));
}

export async function listTeacherInviteCodesByClass(
	locals: App.Locals,
	classId: string
): Promise<TeacherInviteCodeRow[]> {
	const { data, error } = await locals.supabase
		.from('teacher_invite_codes')
		.select('student_id, code, status')
		.eq('class_id', classId)
		.in('status', ['active', 'claimed']);

	if (error) {
		return [];
	}

	return (data ?? []) as TeacherInviteCodeRow[];
}

export async function createTeacherInviteCode(
	locals: App.Locals,
	input: {
		studentId: string;
		classId: string;
		teacherId: string;
		code?: string;
	}
) {
	return locals.supabase.from('teacher_invite_codes').insert({
		code: input.code ?? generateTeacherInviteCode(),
		student_id: input.studentId,
		class_id: input.classId,
		teacher_id: input.teacherId,
		status: 'active'
	});
}
