import { expect, test } from '@playwright/test';
import { loginAsPersona } from './helpers';

test('teacher smoke flow loads dashboard and assessments area', async ({ page, context }) => {
	await loginAsPersona(context, {
		role: 'teacher',
		userId: 'e2e-teacher',
		displayName: 'Teacher E2E',
		email: 'teacher@e2e.local'
	});

	await page.goto('/teacher');
	await expect(page).toHaveURL(/\/teacher$/);
	await expect(page.getByRole('heading', { name: /Turmas vivas|Painel/i })).toBeVisible();

	await page.goto('/teacher/assessments');
	await expect(page).toHaveURL(/\/teacher\/assessments$/);
	await expect(
		page.getByRole('heading', { name: /Avaliacoes da V1|Avaliacoes do professor/i }).first()
	).toBeVisible();
});

test('student smoke flow loads pending-link portal and journey area', async ({ page, context }) => {
	await loginAsPersona(context, {
		role: 'student',
		userId: 'e2e-student',
		displayName: 'Aluno E2E',
		email: 'student@e2e.local'
	});

	await page.goto('/student');
	await expect(page).toHaveURL(/\/student$/);
	await expect(
		page.getByRole('heading', { name: /Conta sem vinculo|Aguardando vinculo/i })
	).toBeVisible();

	await page.goto('/student/journey');
	await expect(
		page.getByRole('heading', { name: /perfil longitudinal|trajetoria longitudinal/i }).first()
	).toBeVisible();
});

test('coord smoke flow loads institutional dashboard', async ({ page, context }) => {
	await loginAsPersona(context, {
		role: 'coord',
		userId: 'e2e-coord',
		displayName: 'Coord E2E',
		email: 'coord@e2e.local'
	});

	await page.goto('/coord');
	await expect(page).toHaveURL(/\/coord$/);
	await expect(
		page.getByRole('heading', { name: /Painel macro de|painel institucional/i }).first()
	).toBeVisible();
});
