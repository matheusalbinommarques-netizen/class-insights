import { randomBytes } from 'node:crypto';

type CreateTeacherStudentInput = {
	classId: string;
	name: string;
	inviteCode?: string;
};

type CreatedTeacherStudent = {
	id: string;
	name: string;
	class_id: string;
	invite_code: string | null;
};

function generateInviteCode() {
	return randomBytes(4).toString('hex').toUpperCase();
}

function normalizeInviteCode(value?: string) {
	const normalized = String(value ?? '')
		.trim()
		.toUpperCase()
		.replace(/\s+/g, '');

	return normalized || generateInviteCode();
}

export async function createTeacherStudent(locals: App.Locals, input: CreateTeacherStudentInput) {
	const name = input.name.trim();
	const inviteCode = normalizeInviteCode(input.inviteCode);

	return locals.supabase
		.from('students')
		.insert({
			name,
			class_id: input.classId,
			user_id: null,
			invite_code: inviteCode
		})
		.select('id, name, class_id, invite_code')
		.single<CreatedTeacherStudent>();
}
