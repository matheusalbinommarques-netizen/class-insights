export type StudentPortalParentData = {
	authUser: {
		id: string;
		email: string | null;
	};
	profile: {
		id: string;
		role: 'teacher' | 'student' | 'coord';
		display_name: string;
	};
};

export type StudentPortalEnrollment = {
	enrollmentId: string;
	studentId: string;
	classId: string;
	teacherId: string;
	status: 'pending' | 'active' | 'archived';
	joinedAt: string | null;
	leftAt: string | null;
	studentName: string;
	className: string;
	isCurrent: boolean;
};

type PendingStudentPortalPayload = {
	authUser: StudentPortalParentData['authUser'];
	portal: {
		status: 'pending-link';
		message: string;
	};
	student: {
		displayName: string;
		className: null;
	};
	summary: {
		totalSubjects: number;
		subjectsWithScore: number;
		goodSubjects: number;
		attentionSubjects: number;
		pendingSubjects: number;
		generalAverage: null;
		generalPercent: null;
	};
	bestSubject: null;
	prioritySubject: null;
	subjects: [];
	academicSummary: {
		title: string;
		description: string;
	};
	longitudinal: null;
	enrollments: StudentPortalEnrollment[];
};

type EnrollmentRpcRow = {
	enrollment_id: string;
	student_id: string;
	class_id: string;
	teacher_id: string;
	status: 'pending' | 'active' | 'archived';
	joined_at: string | null;
	left_at: string | null;
	student_name: string;
	class_name: string;
};

export function buildPendingStudentPortalPayload(
	parentData: StudentPortalParentData,
	enrollments: StudentPortalEnrollment[],
	message: string,
	title: string,
	description: string
): PendingStudentPortalPayload {
	return {
		authUser: parentData.authUser,
		portal: {
			status: 'pending-link',
			message
		},
		student: {
			displayName: parentData.profile.display_name,
			className: null
		},
		summary: {
			totalSubjects: 0,
			subjectsWithScore: 0,
			goodSubjects: 0,
			attentionSubjects: 0,
			pendingSubjects: 0,
			generalAverage: null,
			generalPercent: null
		},
		bestSubject: null,
		prioritySubject: null,
		subjects: [],
		academicSummary: {
			title,
			description
		},
		longitudinal: null,
		enrollments
	};
}

export function mapStudentPortalEnrollments(
	rows: EnrollmentRpcRow[],
	currentClassId: string | null
): StudentPortalEnrollment[] {
	return rows.map((row) => ({
		enrollmentId: row.enrollment_id,
		studentId: row.student_id,
		classId: row.class_id,
		teacherId: row.teacher_id,
		status: row.status,
		joinedAt: row.joined_at,
		leftAt: row.left_at,
		studentName: row.student_name,
		className: row.class_name,
		isCurrent: currentClassId !== null && row.class_id === currentClassId && row.status === 'active'
	}));
}
