import test from 'node:test';
import assert from 'node:assert/strict';

import { getAuthenticatedUserId, getCurrentAuthUser, getProfileByUserId } from './auth.ts';

test('getAuthenticatedUserId reads the session user id when present', () => {
	const locals = {
		session: {
			user: {
				id: 'user-1'
			}
		}
	} as App.Locals;

	assert.equal(getAuthenticatedUserId(locals), 'user-1');
	assert.equal(getAuthenticatedUserId({ session: null } as App.Locals), null);
});

test('getCurrentAuthUser returns null on auth error and normalized user data on success', async () => {
	const failingLocals = {
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
