import { redirect } from '@sveltejs/kit';
import { getAuthenticatedUserId } from '$lib/server/auth';
import {
	clearPreferredEnrollmentId,
	loadStudentEnrollments,
	persistPreferredEnrollmentId
} from '$lib/server/student-enrollments';

export const POST = async ({ request, locals, cookies }) => {
	if (!getAuthenticatedUserId(locals)) {
		throw redirect(302, '/login');
	}

	const form = await request.formData();
	const enrollmentId = String(form.get('enrollmentId') ?? '').trim();
	const redirectTo = String(form.get('redirectTo') ?? '/student').trim() || '/student';
	const enrollments = await loadStudentEnrollments(locals);
	const selected = enrollments.find(
		(row) => row.enrollment_id === enrollmentId && row.status === 'active'
	);

	if (selected) {
		persistPreferredEnrollmentId(cookies, selected.enrollment_id);
	} else {
		clearPreferredEnrollmentId(cookies);
	}

	throw redirect(303, redirectTo.startsWith('/student') ? redirectTo : '/student');
};
