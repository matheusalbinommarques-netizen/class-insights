import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
	testDir: './tests/e2e',
	timeout: 30_000,
	expect: {
		timeout: 5_000
	},
	use: {
		baseURL,
		trace: 'on-first-retry'
	},
	webServer: {
		command: `npm run dev -- --host 127.0.0.1 --port ${PORT}`,
		url: baseURL,
		reuseExistingServer: true,
		env: {
			CI_E2E_AUTH_ENABLED: 'true'
		}
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	]
});
