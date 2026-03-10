<script lang="ts">
	import { page } from '$app/stores';
	import { goto, invalidateAll } from '$app/navigation';
	import { supabase } from '$lib/services/supabaseClient';

	type ProfileRole = 'teacher' | 'student' | 'coord';

	type ProfileRow = {
		id: string;
		role: ProfileRole;
		display_name: string;
	};

	type ClaimStudentRpcRow = {
		student_id: string;
		class_id: string | null;
		student_name: string;
	};

	let email = '';
	let password = '';
	let errorMessage = '';
	let loading = false;

	const PENDING_STUDENT_INVITE_CODE_KEY = 'pendingStudentInviteCode';

	$: redirectToParam = $page.url.searchParams.get('redirectTo');

	function sanitizeRedirect(path: string | null): string | null {
		if (!path) return null;
		if (!path.startsWith('/')) return null;
		if (path.startsWith('//')) return null;
		return path;
	}

	function fallbackRouteByRole(role: ProfileRole): string {
		if (role === 'teacher' || role === 'coord') return '/teacher';
		return '/student';
	}

	function getPendingInviteCodeFromStorage(): string | null {
		try {
			const raw = localStorage.getItem(PENDING_STUDENT_INVITE_CODE_KEY);
			const normalized = raw?.trim().toUpperCase() ?? '';
			return normalized || null;
		} catch {
			return null;
		}
	}

	function clearPendingInviteCodeFromStorage() {
		try {
			localStorage.removeItem(PENDING_STUDENT_INVITE_CODE_KEY);
		} catch {}
	}

	function getInviteCodeFromUserMetadata(user: { user_metadata?: Record<string, unknown> | null }): string | null {
		const raw = user.user_metadata?.invite_code;
		if (typeof raw !== 'string') return null;

		const normalized = raw.trim().toUpperCase();
		return normalized || null;
	}

	function extractErrorMessage(error: unknown): string {
		if (error instanceof Error) return error.message;

		if (typeof error === 'object' && error !== null) {
			const maybeMessage = 'message' in error ? error.message : null;
			if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
				return maybeMessage;
			}
		}

		return 'Não foi possível concluir o vínculo do aluno.';
	}

	async function tryCompleteStudentLink(user: {
		id: string;
		user_metadata?: Record<string, unknown> | null;
	}) {
		const metadataInviteCode = getInviteCodeFromUserMetadata(user);
		const pendingInviteCode = getPendingInviteCodeFromStorage();
		const inviteCode = metadataInviteCode ?? pendingInviteCode;

		if (!inviteCode) {
			return {
				attempted: false,
				linked: false
			};
		}

		const { data, error } = await supabase.rpc('claim_student_by_invite_code', {
			p_invite_code: inviteCode
		});

		if (error) {
			throw error;
		}

		const rows = (data ?? []) as ClaimStudentRpcRow[];

		if (rows.length > 0) {
			clearPendingInviteCodeFromStorage();
			return {
				attempted: true,
				linked: true
			};
		}

		return {
			attempted: true,
			linked: false
		};
	}

	async function handleLogin() {
		errorMessage = '';
		loading = true;

		const trimmedEmail = email.trim().toLowerCase();

		if (!trimmedEmail) {
			loading = false;
			errorMessage = 'E-mail é obrigatório.';
			return;
		}

		if (!password) {
			loading = false;
			errorMessage = 'Senha é obrigatória.';
			return;
		}

		const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
			email: trimmedEmail,
			password
		});

		if (signInError) {
			loading = false;
			errorMessage = signInError.message;
			return;
		}

		const user = signInData.user;
		if (!user) {
			loading = false;
			errorMessage = 'Não foi possível identificar o usuário após o login.';
			return;
		}

		const { data: profile, error: profileError } = await supabase
			.from('profiles')
			.select('id, role, display_name')
			.eq('id', user.id)
			.single<ProfileRow>();

		if (profileError || !profile) {
			loading = false;
			errorMessage =
				profileError?.message ?? 'Perfil não encontrado. Verifique se sua conta foi configurada.';
			return;
		}

		if (profile.role === 'student') {
			try {
				await tryCompleteStudentLink(user);
			} catch (linkError) {
				loading = false;
				errorMessage = extractErrorMessage(linkError);
				return;
			}
		}

		await invalidateAll();

		const safeRedirect = sanitizeRedirect(redirectToParam);
		const fallbackRoute = fallbackRouteByRole(profile.role);
		const destination = safeRedirect ?? fallbackRoute;

		loading = false;
		await goto(destination);
	}
</script>

<svelte:head>
	<title>Login • Class Insights</title>
</svelte:head>

<section class="page-shell">
	<div class="card">
		<div class="header">
			<div class="eyebrow">Acesso</div>
			<h1>Entrar no Class Insights</h1>
			<p>
				Faça login para acessar sua área. Professores e alunos são redirecionados
				automaticamente para o espaço correto.
			</p>
		</div>

		<div class="form-grid">
			<div class="field">
				<label for="email">E-mail</label>
				<input id="email" type="email" bind:value={email} placeholder="voce@email.com" />
			</div>

			<div class="field">
				<label for="password">Senha</label>
				<input id="password" type="password" bind:value={password} placeholder="••••••••" />
			</div>
		</div>

		<div class="actions">
			<button onclick={handleLogin} disabled={loading} class="primary-button">
				{loading ? 'Entrando...' : 'Entrar'}
			</button>

			<a href="/register/teacher" class="secondary-link">Cadastro de professor</a>
			<a href="/register/student" class="secondary-link">Cadastro de aluno</a>
		</div>

		{#if errorMessage}
			<div class="feedback error">{errorMessage}</div>
		{/if}
	</div>
</section>

<style>
	.page-shell {
		min-height: 100vh;
		display: grid;
		place-items: center;
		padding: 1rem;
		background:
			radial-gradient(circle at top, rgba(59, 130, 246, 0.08), transparent 30%),
			linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
	}

	.card {
		width: 100%;
		max-width: 560px;
		padding: 1.4rem;
		border-radius: 1.35rem;
		background: rgba(255, 255, 255, 0.94);
		border: 1px solid rgba(148, 163, 184, 0.2);
		box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
	}

	.header {
		margin-bottom: 1rem;
	}

	.eyebrow {
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #64748b;
		margin-bottom: 0.35rem;
	}

	h1 {
		margin: 0;
		font-size: clamp(1.6rem, 3vw, 2.2rem);
		line-height: 1.15;
		color: #0f172a;
	}

	p {
		margin: 0.65rem 0 0;
		color: #475569;
		line-height: 1.6;
	}

	.form-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.9rem;
		margin-bottom: 1rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	label {
		font-size: 0.86rem;
		font-weight: 700;
		color: #334155;
	}

	input {
		height: 2.9rem;
		padding: 0 0.9rem;
		border-radius: 0.9rem;
		border: 1px solid #cbd5e1;
		background: white;
		color: #0f172a;
		font-size: 0.96rem;
		outline: none;
		transition:
			border-color 0.16s ease,
			box-shadow 0.16s ease;
	}

	input:focus {
		border-color: #60a5fa;
		box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12);
	}

	.actions {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.primary-button {
		height: 2.9rem;
		padding: 0 1rem;
		border-radius: 0.9rem;
		font-weight: 700;
		font-size: 0.95rem;
		cursor: pointer;
		border: 0;
		background: linear-gradient(135deg, #2563eb, #1d4ed8);
		color: white;
		box-shadow: 0 12px 24px rgba(37, 99, 235, 0.24);
		transition:
			transform 0.16s ease,
			box-shadow 0.16s ease,
			opacity 0.16s ease;
	}

	.primary-button:hover:enabled {
		transform: translateY(-1px);
	}

	.primary-button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.secondary-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 2.9rem;
		padding: 0 1rem;
		border-radius: 0.9rem;
		text-decoration: none;
		font-weight: 700;
		font-size: 0.95rem;
		color: #0f172a;
		background: white;
		border: 1px solid #cbd5e1;
	}

	.feedback {
		margin-top: 1rem;
		padding: 0.9rem 1rem;
		border-radius: 0.95rem;
		font-size: 0.92rem;
		font-weight: 600;
	}

	.feedback.error {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.2);
		color: #991b1b;
	}

	@media (max-width: 640px) {
		.actions {
			flex-direction: column;
			align-items: stretch;
		}

		.primary-button,
		.secondary-link {
			width: 100%;
		}
	}
</style>