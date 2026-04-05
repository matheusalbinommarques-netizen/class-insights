import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loadCoordDashboard } from '$lib/server/coord';

function emptyDashboard(displayName: string) {
	return {
		summary: {
			displayName,
			totalClasses: 0,
			totalStudents: 0,
			totalPublishedAssessments: 0,
			institutionAverage: null,
			classesAtRisk: 0,
			managedClassesCount: 0,
			message: 'Adicione um codigo de turma para montar seu primeiro recorte institucional.',
			highlights: [
				{
					key: 'scope',
					label: 'Escopo',
					value: '0 turmas',
					description: 'Nenhuma turma vinculada ao painel ainda.',
					tone: 'default'
				}
			]
		},
		classes: [],
		subjects: [],
		teachers: [],
		students: []
	};
}

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { profile } = await parent();
	const result = await loadCoordDashboard(locals, profile.id, profile.display_name);

	if (!result.ok) {
		return {
			...emptyDashboard(profile.display_name),
			error: result.error
		};
	}

	return {
		...result.data,
		error: null
	};
};

export const actions: Actions = {
	claimAccessCode: async ({ request, locals }) => {
		const form = await request.formData();
		const accessCode = String(form.get('accessCode') ?? '')
			.trim()
			.toUpperCase();

		if (!accessCode) {
			return fail(400, {
				action: 'claimAccessCode',
				message: 'Informe um codigo de turma valido.'
			});
		}

		const { error } = await locals.supabase.rpc('claim_coord_class_access_code', {
			p_access_code: accessCode
		});

		if (error) {
			return fail(400, {
				action: 'claimAccessCode',
				message: error.message
			});
		}

		return {
			success: true,
			action: 'claimAccessCode',
			message: 'Turma adicionada ao painel com sucesso.'
		};
	}
};
