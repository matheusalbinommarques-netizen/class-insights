import test from 'node:test';
import assert from 'node:assert/strict';

import { getAuthenticatedUserId, getCurrentAuthUser, getProfileByUserId } from './auth.ts';

test('getAuthenticatedUserId reads the verified local user id and falls back to the E2E profile', () => {
	const verifiedLocals = {
		user: {
			id: 'user-1',
			email: 'verified@example.com'
		}
	} as unknown as App.Locals;

	assert.equal(getAuthenticatedUserId(verifiedLocals), 'user-1');

	const e2eLocals = {
		user: null,
		e2eProfile: {
			id: 'e2e-user',
			role: 'student',
			display_name: 'Aluno E2E',
			email: 'student@e2e.local'
		}
	} as unknown as App.Locals;

	assert.equal(getAuthenticatedUserId(e2eLocals), 'e2e-user');

	const anonymousLocals = {
		user: null,
		e2eProfile: null
	} as App.Locals;

	assert.equal(getAuthenticatedUserId(anonymousLocals), null);
});

test('getCurrentAuthUser returns the verified local user when present', async () => {
	const locals = {
		user: {
			id: 'user-local',
			email: 'local@example.com'
		}
	} as unknown as App.Locals;

	assert.deepEqual(await getCurrentAuthUser(locals), {
		id: 'user-local',
		email: 'local@example.com'
	});
});

test('getCurrentAuthUser returns null on auth error and normalized user data on success', async () => {
	const failingLocals = {
		user: null,
		supabase: {
			auth: {
				getUser: async () => ({
					data: { user: null },
					error: new Error('auth failed')
				})
			}
		}
	} as unknown as App.Locals;

	assert.equal(await getCurrentAuthUser(failingLocals), null);

	const successLocals = {
		user: null,
		supabase: {
			auth: {
				getUser: async () => ({
					data: {
						user: {
							id: 'user-2',
							email: 'aluno@example.com'
						}
					},
					error: null
				})
			}
		}
	} as unknown as App.Locals;

	assert.deepEqual(await getCurrentAuthUser(successLocals), {
		id: 'user-2',
		email: 'aluno@example.com'
	});
});

test('getCurrentAuthUser uses the E2E profile when present', async () => {
	const locals = {
		user: null,
		e2eProfile: {
			id: 'e2e-user',
			role: 'teacher',
			display_name: 'Teacher E2E',
			email: 'teacher@e2e.local'
		}
	} as unknown as App.Locals;

	assert.deepEqual(await getCurrentAuthUser(locals), {
		id: 'e2e-user',
		email: 'teacher@e2e.local'
	});
});

test('getProfileByUserId returns null on query failure and profile data on success', async () => {
	const failingLocals = {
		supabase: {
			from: () => ({
				select: () => ({
					eq: () => ({
						maybeSingle: async () => ({
							data: null,
							error: new Error('query failed')
						})
					})
				})
			})
		}
	} as unknown as App.Locals;

	assert.equal(await getProfileByUserId(failingLocals, 'user-1'), null);

	const successLocals = {
		supabase: {
			from: () => ({
				select: () => ({
					eq: () => ({
						maybeSingle: async () => ({
							data: {
								id: 'user-3',
								role: 'student',
								display_name: 'Ana'
							},
							error: null
						})
					})
				})
			})
		}
	} as unknown as App.Locals;

	assert.deepEqual(await getProfileByUserId(successLocals, 'user-3'), {
		id: 'user-3',
		role: 'student',
		display_name: 'Ana'
	});
});

test('getProfileByUserId uses the E2E profile when it matches the requested user', async () => {
	const locals = {
		e2eProfile: {
			id: 'e2e-user',
			role: 'coord',
			display_name: 'Coord E2E',
			email: 'coord@e2e.local'
		}
	} as unknown as App.Locals;

	assert.deepEqual(await getProfileByUserId(locals, 'e2e-user'), {
		id: 'e2e-user',
		role: 'coord',
		display_name: 'Coord E2E'
	});
});
