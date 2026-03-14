import { getPublicEnv } from './env';

type ServerEnv = Readonly<{
	supabaseUrl: string;
	serviceRoleKey: string;
}>;

function requireEnv(value: string, name: string): string {
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}.`);
	}

	return value;
}

let cachedServerEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
	if (cachedServerEnv) {
		return cachedServerEnv;
	}

	cachedServerEnv = Object.freeze({
		supabaseUrl: getPublicEnv().supabaseUrl,
		serviceRoleKey: requireEnv(
			import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
			'SUPABASE_SERVICE_ROLE_KEY'
		)
	});

	return cachedServerEnv;
}
