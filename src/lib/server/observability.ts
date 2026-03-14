type LogLevel = 'info' | 'warn' | 'error';

export function createErrorId(scope = 'ci'): string {
	return `${scope}_${crypto.randomUUID().replaceAll('-', '').slice(0, 10)}`;
}

export function logServerEvent(level: LogLevel, event: string, context: Record<string, unknown>) {
	const payload = {
		level,
		event,
		timestamp: new Date().toISOString(),
		...context
	};

	const line = JSON.stringify(payload);
	if (level === 'error') {
		console.error(line);
		return;
	}

	if (level === 'warn') {
		console.warn(line);
		return;
	}

	console.info(line);
}

export function buildErrorMessage(message: string, errorId: string): string {
	return `${message} Codigo: ${errorId}.`;
}
