export type UserRole = "teacher" | "student" | "coord";

export interface BaseEntity {
  id: string;
  created_at: string;
}