type PublicEnv = Readonly<{
	supabaseUrl: string;
	supabaseAnonKey: string;
}>;

function requireEnv(value: string, name: string): string {
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}.`);
	}

	return value;
}

let cachedPublicEnv: PublicEnv | null = null;

export const config = {
	appName: 'Class Insights',
	version: '0.1.0'
};

export function getPublicEnv(): PublicEnv {
	if (cachedPublicEnv) {
		return cachedPublicEnv;
	}

	cachedPublicEnv = Object.freeze({
		supabaseUrl: requireEnv(import.meta.env.VITE_PUBLIC_SUPABASE_URL, 'VITE_PUBLIC_SUPABASE_URL'),
		supabaseAnonKey: requireEnv(
			import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY,
			'VITE_PUBLIC_SUPABASE_ANON_KEY'
		)
	});

	return cachedPublicEnv;
}
