<script lang="ts">
	import { supabase } from '$lib/services/supabaseClient';
	import { goto } from '$app/navigation';

	let name = '';
	let email = '';
	let password = '';
	let confirmPassword = '';
	let inviteCode = '';

	let loading = false;
	let resending = false;
	let errorMessage = '';
	let successMessage = '';

	const MIN_PASSWORD_LENGTH = 6;
	const PENDING_STUDENT_INVITE_CODE_KEY = 'pendingStudentInviteCode';

	function resetMessages() {
		errorMessage = '';
		successMessage = '';
	}

	function normalizeInviteCode(value: string) {
		return value.trim().toUpperCase();
	}

	function savePendingInviteCode(inviteCodeValue: string) {
		try {
			localStorage.setItem(PENDING_STUDENT_INVITE_CODE_KEY, inviteCodeValue);
		} catch {}
	}

	function clearPendingInviteCode() {
		try {
			localStorage.removeItem(PENDING_STUDENT_INVITE_CODE_KEY);
		} catch {}
	}

	function validateForm() {
		const trimmedName = name.trim();
		const trimmedEmail = email.trim();
		const normalizedInviteCode = normalizeInviteCode(inviteCode);

		if (!trimmedName) {
			errorMessage = 'Nome é obrigatório.';
			return false;
		}

		if (!trimmedEmail) {
			errorMessage = 'E-mail é obrigatório.';
			return false;
		}

		if (!password) {
			errorMessage = 'Senha é obrigatória.';
			return false;
		}

		if (password.length < MIN_PASSWORD_LENGTH) {
			errorMessage = `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
			return false;
		}

		if (password !== confirmPassword) {
			errorMessage = 'A confirmação de senha não confere.';
			return false;
		}

		if (!normalizedInviteCode) {
			errorMessage = 'Código de convite é obrigatório.';
			return false;
		}

		return true;
	}

	async function handleRegister() {
		resetMessages();

		if (!validateForm()) return;

		loading = true;

		const trimmedName = name.trim();
		const trimmedEmail = email.trim().toLowerCase();
		const normalizedInviteCode = normalizeInviteCode(inviteCode);

		// Guarda localmente para concluir o vínculo depois do login,
		// principalmente quando há confirmação de e-mail no Supabase.
		savePendingInviteCode(normalizedInviteCode);

		const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
			email: trimmedEmail,
			password,
			options: {
				data: {
					role: 'student',
					display_name: trimmedName,
					name: trimmedName,
					invite_code: normalizedInviteCode
				}
			}
		});

		if (signUpError) {
			loading = false;
			errorMessage = signUpError.message;
			return;
		}

		const user = signUpData.user;
		const session = signUpData.session;

		if (!user) {
			loading = false;
			errorMessage = 'Não foi possível criar a conta.';
			return;
		}

		// Se voltou com sessão, tenta concluir o vínculo imediatamente.
		// Se não voltou, o vínculo será concluído no login.
		if (session) {
			const { data: linkedStudent, error: linkError } = await supabase
				.from('students')
				.update({ user_id: user.id })
				.eq('invite_code', normalizedInviteCode)
				.is('user_id', null)
				.select('id, name')
				.maybeSingle();

			if (!linkError && linkedStudent) {
				clearPendingInviteCode();
				loading = false;
				await goto('/student');
				return;
			}

			loading = false;
			successMessage =
				'Conta criada. Faça login novamente se necessário para concluir o vínculo do aluno.';
			return;
		}

		loading = false;
		successMessage =
			'Conta criada. Verifique seu e-mail e depois faça login para concluir o vínculo do aluno.';
	}

	async function handleResendVerification() {
		resetMessages();

		const trimmedEmail = email.trim().toLowerCase();

		if (!trimmedEmail) {
			errorMessage = 'Digite o e-mail para reenviar a verificação.';
			return;
		}

		resending = true;

		const { error } = await supabase.auth.resend({
			type: 'signup',
			email: trimmedEmail,
			options: {
				emailRedirectTo: `${window.location.origin}/login`
			}
		});

		resending = false;

		if (error) {
			errorMessage = error.message;
			return;
		}

		successMessage =
			'Se existir um cadastro pendente para esse e-mail, enviamos um novo link de verificação.';
	}
</script>

<svelte:head>
	<title>Cadastro de Aluno • Class Insights</title>
</svelte:head>

<section class="page-shell">
	<div class="card">
		<div class="header">
			<div class="eyebrow">Cadastro</div>
			<h1>Criar conta de aluno</h1>
			<p>
				Use o código de convite fornecido pelo professor para vincular sua conta ao registro
				acadêmico correto.
			</p>
		</div>

		<div class="form-grid">
			<div class="field">
				<label for="name">Nome</label>
				<input id="name" type="text" bind:value={name} placeholder="Seu nome" />
			</div>

			<div class="field">
				<label for="email">E-mail</label>
				<input id="email" type="email" bind:value={email} placeholder="voce@email.com" />
			</div>

			<div class="field">
				<label for="password">Senha</label>
				<input id="password" type="password" bind:value={password} placeholder="••••••••" />
			</div>

			<div class="field">
				<label for="confirmPassword">Confirmar senha</label>
				<input
					id="confirmPassword"
					type="password"
					bind:value={confirmPassword}
					placeholder="••••••••"
				/>
			</div>

			<div class="field full-width">
				<label for="inviteCode">Código de convite</label>
				<input
					id="inviteCode"
					type="text"
					bind:value={inviteCode}
					placeholder="Ex: 7B60B044657F"
					style="text-transform: uppercase;"
				/>
			</div>
		</div>

		<div class="actions">
			<button on:click={handleRegister} disabled={loading} class="primary-button">
				{loading ? 'Criando conta...' : 'Criar conta'}
			</button>

			<button
				on:click={handleResendVerification}
				disabled={resending}
				class="secondary-link"
				type="button"
			>
				{resending ? 'Reenviando...' : 'Reenviar verificação'}
			</button>

			<a href="/login" class="secondary-link">Já tenho conta</a>
		</div>

		{#if errorMessage}
			<div class="feedback error">{errorMessage}</div>
		{/if}

		{#if successMessage}
			<div class="feedback success">{successMessage}</div>
		{/if}

		<div class="note">
			<strong>Importante:</strong> se o projeto exigir confirmação de e-mail, o vínculo final com
			o aluno será concluído no login, usando o código de convite salvo durante o cadastro.
		</div>
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
			linear-gradient(180deg, #f8fafc 0%, #eef4ff 100%);
	}

	.card {
		width: 100%;
		max-width: 680px;
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
		grid-template-columns: 1fr 1fr;
		gap: 0.9rem;
		margin-bottom: 1rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.full-width {
		grid-column: 1 / -1;
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
		cursor: pointer;
	}

	.feedback {
		margin-top: 1rem;
		padding: 0.9rem 1rem;
		border-radius: 0.95rem;
		font-size: 0.92rem;
		font-weight: 600;
	}

	.feedback.success {
		background: rgba(34, 197, 94, 0.12);
		border: 1px solid rgba(34, 197, 94, 0.22);
		color: #166534;
	}

	.feedback.error {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.2);
		color: #991b1b;
	}

	.note {
		margin-top: 1rem;
		padding: 0.95rem 1rem;
		border-radius: 0.95rem;
		background: rgba(248, 250, 252, 0.9);
		border: 1px solid #e2e8f0;
		color: #475569;
		font-size: 0.9rem;
		line-height: 1.6;
	}

	.note strong {
		color: #0f172a;
	}

	@media (max-width: 640px) {
		.form-grid {
			grid-template-columns: 1fr;
		}

		.full-width {
			grid-column: auto;
		}

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