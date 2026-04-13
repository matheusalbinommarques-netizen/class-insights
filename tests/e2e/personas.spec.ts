import { expect, test, type Locator, type Page } from '@playwright/test';
import { loginAsPersona } from './helpers';

async function expectAnyVisible(locators: Locator[]) {
	for (const locator of locators) {
		if ((await locator.count()) > 0 && (await locator.first().isVisible())) {
			await expect(locator.first()).toBeVisible();
			return;
		}
	}

	throw new Error('Nenhum dos elementos esperados ficou visível.');
}

async function expectClassInsightsTitle(page: Page) {
	await expect(page).toHaveTitle(/Class Insights/i);
}

test('public login smoke flow loads login form', async ({ page }) => {
	await page.goto('/login');

	await expect(page).toHaveURL(/\/login$/);
	await expectClassInsightsTitle(page);

	await expect(page.locator('form').first()).toBeVisible();
	await expect(page.locator('input[name="email"], input[type="email"]').first()).toBeVisible();
	await expect(
		page.locator('input[name="password"], input[type="password"]').first()
	).toBeVisible();
	await expect(page.locator('button[type="submit"]').first()).toBeVisible();
});

test('teacher smoke flow loads dashboard and opens class creation flow', async ({
	page,
	context
}) => {
	await loginAsPersona(context, {
		role: 'teacher',
		userId: 'e2e-teacher',
		displayName: 'Teacher E2E',
		email: 'teacher@e2e.local'
	});

	await page.goto('/teacher');

	await expect(page).toHaveURL(/\/teacher$/);
	await expectClassInsightsTitle(page);

	await expectAnyVisible([
		page.getByRole('heading', {
			name: /o que exige ação|cockpit operacional|painel do professor|painel/i
		}),
		page.getByText(/Criar nova turma/i)
	]);

	await page.goto('/teacher/classes/new');

	await expect(page).toHaveURL(/\/teacher\/classes\/new$/);
	await expectClassInsightsTitle(page);
	await expect(page.getByRole('heading', { name: /Criar turma/i })).toBeVisible();
	await expect(page.locator('input[name="name"]').first()).toBeVisible();
	await expect(page.locator('input[name="score_min"]').first()).toBeVisible();
	await expect(page.locator('input[name="score_max"]').first()).toBeVisible();
	await expect(page.locator('input[name="score_decimals"]').first()).toBeVisible();
	await expect(page.getByRole('button', { name: /Criar turma/i })).toBeVisible();
});

test('student smoke flow loads portal and keeps progress surfaces accessible', async ({
	page,
	context
}) => {
	await loginAsPersona(context, {
		role: 'student',
		userId: 'e2e-student',
		displayName: 'Aluno E2E',
		email: 'student@e2e.local'
	});

	await page.goto('/student');

	await expect(page).toHaveURL(/\/student$/);
	await expectClassInsightsTitle(page);

	const pendingLinkHeading = page.getByRole('heading', {
		name: /Conclua seu vínculo acadêmico/i
	});
	const progressHeading = page.getByText(/Como estou agora/i);

	if ((await pendingLinkHeading.count()) > 0 && (await pendingLinkHeading.first().isVisible())) {
		await expect(pendingLinkHeading.first()).toBeVisible();
		await expect(
			page.getByText(/Adicionar código de convite|Vínculos encontrados/i).first()
		).toBeVisible();
	} else {
		await expect(progressHeading.first()).toBeVisible();
		await expect(page.getByText(/Qual tendência/i).first()).toBeVisible();
		await expect(page.getByText(/Onde revisar/i).first()).toBeVisible();
	}

	await page.goto('/student/journey');

	await expect(page).toHaveURL(/\/student\/journey$/);
	await expectClassInsightsTitle(page);

	await expectAnyVisible([
		page.getByRole('heading', { name: /trajetória|trajetoria|longitudinal/i }),
		page.getByText(/trajetória|trajetoria|longitudinal/i)
	]);

	await page.goto('/student/skills');

	await expect(page).toHaveURL(/\/student\/skills$/);
	await expectClassInsightsTitle(page);

	await expectAnyVisible([
		page.getByRole('heading', { name: /Matérias/i }),
		page.getByText(/Matérias/i)
	]);
});

test('coord smoke flow loads institutional dashboard and scope reading entrypoint', async ({
	page,
	context
}) => {
	await loginAsPersona(context, {
		role: 'coord',
		userId: 'e2e-coord',
		displayName: 'Coord E2E',
		email: 'coord@e2e.local'
	});

	await page.goto('/coord');

	await expect(page).toHaveURL(/\/coord$/);
	await expectClassInsightsTitle(page);

	await expectAnyVisible([
		page.getByRole('heading', { name: /O que merece leitura primeiro no seu escopo/i }),
		page.getByRole('heading', { name: /leitura institucional/i }),
		page.getByText(/Adicionar turma ao escopo/i)
	]);

	await expect(page.getByText(/Adicionar turma ao escopo/i).first()).toBeVisible();
});
