import type { BrowserContext } from '@playwright/test';

type Persona = {
	role: 'teacher' | 'student' | 'coord';
	userId: string;
	displayName: string;
	email: string;
};

export async function loginAsPersona(context: BrowserContext, persona: Persona) {
	await context.addCookies([
		{
			name: 'ci_e2e_role',
			value: persona.role,
			url: 'http://127.0.0.1:4173'
		},
		{
			name: 'ci_e2e_user_id',
			value: persona.userId,
			url: 'http://127.0.0.1:4173'
		},
		{
			name: 'ci_e2e_display_name',
			value: encodeURIComponent(persona.displayName),
			url: 'http://127.0.0.1:4173'
		},
		{
			name: 'ci_e2e_email',
			value: persona.email,
			url: 'http://127.0.0.1:4173'
		}
	]);
}
