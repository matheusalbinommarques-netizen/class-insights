import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

declare global {
	namespace App {
		interface E2EProfile {
			id: string;
			role: 'teacher' | 'student' | 'coord';
			display_name: string;
			email: string | null;
		}

		interface Locals {
			supabase: SupabaseClient;
			session: Session | null;
			user: User | null;
			e2eProfile?: E2EProfile | null;
		}
	}
}

export {};
