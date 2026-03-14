import type { Cookies } from '@sveltejs/kit';

export const ACTIVE_ENROLLMENT_COOKIE = 'ci_active_enrollment';

export type StudentEnrollmentStatus = 'pending' | 'active' | 'archived';

export type StudentEnrollmentRow = {
	enrollment_id: string;
	student_id: string;
	class_id: string;
	teacher_id: string;
	status: StudentEnrollmentStatus;
	joined_at: string | null;
	left_at: string | null;
	student_name: string;
	class_name: string;
};

export type StudentEnrollmentSelection = {
	selectedEnrollmentId: string | null;
	currentClassId: string | null;
	currentStudentId: string | null;
};

function enrollmentTimestamp(value: string | null): number {
	if (!value) return Number.NEGATIVE_INFINITY;
	const parsed = Date.parse(value);
	return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

export function sortStudentEnrollments(rows: StudentEnrollmentRow[]): StudentEnrollmentRow[] {
	return [...rows].sort((left, right) => {
		const statusWeight = (status: StudentEnrollmentStatus) => {
			if (status === 'active') return 0;
			if (status === 'pending') return 1;
			return 2;
		};

		const statusDiff = statusWeight(left.status) - statusWeight(right.status);
		if (statusDiff !== 0) return statusDiff;

		return enrollmentTimestamp(right.joined_at) - enrollmentTimestamp(left.joined_at);
	});
}

export function resolveStudentEnrollmentSelection(
	rows: StudentEnrollmentRow[],
	preferredEnrollmentId: string | null
): StudentEnrollmentSelection {
	const ordered = sortStudentEnrollments(rows);
	const activeRows = ordered.filter((row) => row.status === 'active');
	const preferredActive =
		preferredEnrollmentId === null
			? null
			: (activeRows.find((row) => row.enrollment_id === preferredEnrollmentId) ?? null);
	const selected = preferredActive ?? activeRows[0] ?? null;

	return {
		selectedEnrollmentId: selected?.enrollment_id ?? null,
		currentClassId: selected?.class_id ?? null,
		currentStudentId: selected?.student_id ?? null
	};
}

export async function loadStudentEnrollments(locals: App.Locals): Promise<StudentEnrollmentRow[]> {
	const { data, error } = await locals.supabase.rpc('get_my_student_enrollments');

	if (error || !Array.isArray(data)) {
		return [];
	}

	return sortStudentEnrollments(data as StudentEnrollmentRow[]);
}

export function readPreferredEnrollmentId(cookies: Cookies): string | null {
	return cookies.get(ACTIVE_ENROLLMENT_COOKIE) ?? null;
}

export function persistPreferredEnrollmentId(cookies: Cookies, enrollmentId: string) {
	cookies.set(ACTIVE_ENROLLMENT_COOKIE, enrollmentId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: false,
		maxAge: 60 * 60 * 24 * 180
	});
}

export function clearPreferredEnrollmentId(cookies: Cookies) {
	cookies.delete(ACTIVE_ENROLLMENT_COOKIE, {
		path: '/'
	});
}
