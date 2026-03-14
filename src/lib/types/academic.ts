import type { BaseEntity, UserRole } from './core';

export type PublicationStatus = 'draft' | 'published';

export interface Institution extends BaseEntity {
	name: string;
	slug: string;
}

export interface Subject extends BaseEntity {
	name: string;
	code: string | null;
	institution_id: string | null;
}

export interface ClassSubject extends BaseEntity {
	class_id: string;
	subject_id: string;
	teacher_id: string;
}

export interface Assessment extends BaseEntity {
	class_id: string;
	subject_id: string;
	title: string;
	assessment_date: string;
	weight: number;
	status: PublicationStatus;
	published_at: string | null;
	published_by: string | null;
}

export interface AssessmentResult extends BaseEntity {
	assessment_id: string;
	student_id: string;
	raw_score: number | null;
	score_min: number;
	score_max: number;
	score_decimals: number;
	is_excused: boolean;
	notes: string | null;
}

export interface GradeAuditLog extends BaseEntity {
	assessment_id: string;
	student_id: string;
	changed_by: string;
	previous_score: number | null;
	next_score: number | null;
	reason: string | null;
}

export interface LongitudinalPoint {
	assessment_id: string;
	assessment_title: string;
	assessment_date: string;
	subject_id: string;
	subject_name: string;
	raw_score: number | null;
	normalized_percent: number | null;
	status: PublicationStatus;
}

export interface StudentLongitudinalSummary {
	student_id: string;
	student_name: string;
	best_subject: string | null;
	worst_subject: string | null;
	recent_trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
	timeline: LongitudinalPoint[];
}

export interface SubjectLongitudinalSummary {
	subject_id: string;
	subject_name: string;
	assessments_count: number;
	average_percent: number | null;
	recent_trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
	latest_assessment_date: string | null;
}

export interface RoleScopedRequest {
	role: UserRole;
	user_id: string;
	institution_id?: string | null;
}
