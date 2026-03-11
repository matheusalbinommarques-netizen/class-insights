<script lang="ts">
	import { supabase } from '$lib/services/supabaseClient';
	import { goto, invalidateAll } from '$app/navigation';

	let name = '';
	let email = '';
	let password = '';
	let confirmPassword = '';

	let loading = false;
	let errorMessage = '';
	let successMessage = '';
	let showPassword = false;
	let showConfirmPassword = false;

	const MIN_PASSWORD_LENGTH = 6;

	function resetMessages() {
		errorMessage = '';
		successMessage = '';
	}

	function validateForm() {
		const trimmedName = name.trim();
		const trimmedEmail = email.trim();

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

		return true;
	}

	async function handleRegister() {
		resetMessages();

		if (!validateForm()) return;

		loading = true;

		const trimmedName = name.trim();
		const trimmedEmail = email.trim().toLowerCase();

		const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
			email: trimmedEmail,
			password,
			options: {
				data: {
					role: 'teacher',
					display_name: trimmedName,
					name: trimmedName
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

		if (session) {
			const { error: profileError } = await supabase.from('profiles').upsert(
				{
					id: user.id,
					role: 'teacher',
					display_name: trimmedName
				},
				{
					onConflict: 'id'
				}
			);

			if (profileError) {
				loading = false;
				errorMessage = profileError.message;
				return;
			}

			await invalidateAll();
			loading = false;
			await goto('/teacher');
			return;
		}

		loading = false;
		successMessage =
			'Conta criada. Confirme seu e-mail e depois faça login para continuar. O perfil será recuperado automaticamente no acesso.';
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		await handleRegister();
	}
</script>

<svelte:head>
	<title>Cadastro de Professor • Class Insights</title>
</svelte:head>

<div class="auth-shell">
	<section class="auth-left">
		<a href="/" class="brand">
			<div class="brand-mark">
				<div class="cap-top"></div>
				<div class="cap-base"></div>
				<div class="bar bar-1"></div>
				<div class="bar bar-2"></div>
				<div class="bar bar-3"></div>
				<div class="arrow"></div>
			</div>

			<div class="brand-copy">
				<span class="brand-name">Class Insights</span>
				<span class="brand-subtitle">Cadastro de professor</span>
			</div>
		</a>

		<div class="left-copy">
			<div class="eyebrow">Professor / Coordenação</div>
			<h1>Crie sua conta e comece a operar com mais clareza.</h1>
			<p>
				Acesse o núcleo operacional do Class Insights para gerenciar turmas, skills, notas,
				importações e snapshots de evolução.
			</p>
		</div>

		<div class="left-pills">
			<span>Turmas</span>
			<span>Grid de notas</span>
			<span>CSV com staging</span>
			<span>Snapshots</span>
		</div>

		<div class="left-panels">
			<div class="mini-panel">
				<div class="mini-label">Operação</div>
				<strong>Cadastro e lançamento</strong>
				<p>Crie turmas, alunos e skills com uma estrutura pensada para fluxo real.</p>
			</div>

			<div class="mini-panel">
				<div class="mini-label">Insight</div>
				<strong>Leitura pedagógica</strong>
				<p>Transforme dados operacionais em visão de progresso por skill e turma.</p>
			</div>
		</div>
	</section>

	<section class="auth-right">
		<div class="card">
			<div class="header">
				<div class="eyebrow">Cadastro</div>
				<h2>Criar conta de professor</h2>
				<p>Use este cadastro para acessar o painel do professor no Class Insights.</p>
			</div>

			<form class="auth-form" onsubmit={handleSubmit}>
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
					<div class="password-wrap">
						<input
							id="password"
							type={showPassword ? 'text' : 'password'}
							bind:value={password}
							placeholder="••••••••"
						/>
						<button
							type="button"
							class="toggle-password"
							onclick={() => (showPassword = !showPassword)}
						>
							{showPassword ? 'Ocultar' : 'Mostrar'}
						</button>
					</div>
				</div>

				<div class="field">
					<label for="confirmPassword">Confirmar senha</label>
					<div class="password-wrap">
						<input
							id="confirmPassword"
							type={showConfirmPassword ? 'text' : 'password'}
							bind:value={confirmPassword}
							placeholder="••••••••"
						/>
						<button
							type="button"
							class="toggle-password"
							onclick={() => (showConfirmPassword = !showConfirmPassword)}
						>
							{showConfirmPassword ? 'Ocultar' : 'Mostrar'}
						</button>
					</div>
				</div>

				<button type="submit" disabled={loading} class="primary-button">
					{loading ? 'Criando conta...' : 'Criar conta'}
				</button>
			</form>

			{#if errorMessage}
				<div class="feedback error">{errorMessage}</div>
			{/if}

			{#if successMessage}
				<div class="feedback success">{successMessage}</div>
			{/if}

			<div class="divider">
				<span>Já tem conta?</span>
			</div>

			<div class="secondary-actions single">
				<a href="/login" class="secondary-link">Fazer login</a>
			</div>

			<div class="foot-note">
				Este fluxo ainda é adequado para MVP e testes. Como está aberto no app, qualquer pessoa com
				acesso à rota pode tentar criar uma conta de professor.
			</div>
		</div>
	</section>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family:
			Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
			sans-serif;
		color: #0f172a;
		background:
			radial-gradient(circle at top left, rgba(59, 130, 246, 0.1), transparent 26%),
			linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
	}

	:global(a) {
		text-decoration: none;
		color: inherit;
	}

	.auth-shell {
		min-height: 100vh;
		max-width: 1280px;
		margin: 0 auto;
		padding: 28px 24px;
		display: grid;
		grid-template-columns: minmax(0, 1.05fr) minmax(420px, 0.9fr);
		gap: 28px;
		align-items: center;
	}

	.auth-left {
		display: flex;
		flex-direction: column;
		gap: 24px;
		padding-right: 12px;
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 14px;
		width: fit-content;
	}

	.brand-copy {
		display: flex;
		flex-direction: column;
	}

	.brand-name {
		font-size: 2rem;
		font-weight: 900;
		letter-spacing: -0.03em;
		color: #123458;
		line-height: 1;
	}

	.brand-subtitle {
		margin-top: 2px;
		font-size: 0.92rem;
		font-weight: 700;
		color: #64748b;
	}

	.brand-mark {
		position: relative;
		width: 66px;
		height: 56px;
		flex-shrink: 0;
	}

	.cap-top {
		position: absolute;
		left: 2px;
		top: 0;
		width: 36px;
		height: 20px;
		background: #173a63;
		clip-path: polygon(50% 0%, 100% 42%, 50% 84%, 0% 42%);
	}

	.cap-base {
		position: absolute;
		left: 14px;
		top: 16px;
		width: 12px;
		height: 4px;
		background: #173a63;
		border-radius: 999px;
	}

	.bar {
		position: absolute;
		bottom: 0;
		width: 8px;
		background: #3a7bd5;
		border-radius: 4px 4px 0 0;
	}

	.bar-1 {
		left: 8px;
		height: 14px;
	}

	.bar-2 {
		left: 21px;
		height: 22px;
	}

	.bar-3 {
		left: 34px;
		height: 30px;
	}

	.arrow {
		position: absolute;
		right: 0;
		bottom: 8px;
		width: 22px;
		height: 22px;
		border-top: 7px solid #48a868;
		border-right: 7px solid #48a868;
		transform: rotate(45deg);
	}

	.arrow::before {
		content: '';
		position: absolute;
		left: -20px;
		top: 7px;
		width: 31px;
		height: 7px;
		background: #48a868;
		border-radius: 999px;
	}

	.left-copy {
		display: flex;
		flex-direction: column;
		gap: 14px;
		max-width: 620px;
	}

	.eyebrow {
		font-size: 0.78rem;
		font-weight: 900;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #64748b;
	}

	.left-copy h1 {
		margin: 0;
		font-size: clamp(2.5rem, 5vw, 4.3rem);
		line-height: 0.98;
		letter-spacing: -0.05em;
		color: #123458;
		max-width: 720px;
	}

	.left-copy p {
		margin: 0;
		font-size: 1.08rem;
		line-height: 1.8;
		color: #334155;
		max-width: 640px;
	}

	.left-pills {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.left-pills span {
		padding: 10px 14px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.88);
		border: 1px solid rgba(148, 163, 184, 0.22);
		color: #23415f;
		font-size: 0.88rem;
		font-weight: 800;
		box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);
	}

	.left-panels {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
		max-width: 760px;
	}

	.mini-panel {
		padding: 18px;
		border-radius: 22px;
		background: rgba(255, 255, 255, 0.92);
		border: 1px solid rgba(148, 163, 184, 0.18);
		box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
	}

	.mini-label {
		font-size: 0.76rem;
		font-weight: 900;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #64748b;
		margin-bottom: 6px;
	}

	.mini-panel strong {
		display: block;
		font-size: 1.02rem;
		color: #123458;
		margin-bottom: 6px;
	}

	.mini-panel p {
		margin: 0;
		color: #475569;
		line-height: 1.65;
		font-size: 0.94rem;
	}

	.auth-right {
		display: flex;
		justify-content: center;
	}

	.card {
		width: 100%;
		max-width: 520px;
		padding: 28px;
		border-radius: 28px;
		background: rgba(255, 255, 255, 0.94);
		border: 1px solid rgba(148, 163, 184, 0.18);
		box-shadow: 0 18px 44px rgba(15, 23, 42, 0.1);
		backdrop-filter: blur(10px);
	}

	.header {
		margin-bottom: 20px;
	}

	.header h2 {
		margin: 8px 0 0;
		font-size: clamp(2rem, 3vw, 2.5rem);
		line-height: 1.05;
		letter-spacing: -0.04em;
		color: #123458;
	}

	.header p {
		margin: 12px 0 0;
		color: #475569;
		line-height: 1.75;
		font-size: 1rem;
	}

	.auth-form {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	.field label {
		font-size: 0.88rem;
		font-weight: 800;
		color: #334155;
	}

	input {
		width: 100%;
		height: 3.1rem;
		padding: 0 1rem;
		border-radius: 1rem;
		border: 1px solid #cbd5e1;
		background: white;
		color: #0f172a;
		font-size: 0.98rem;
		outline: none;
		transition:
			border-color 0.16s ease,
			box-shadow 0.16s ease,
			background 0.16s ease;
		box-sizing: border-box;
	}

	input:focus {
		border-color: #60a5fa;
		box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12);
		background: #fff;
	}

	.password-wrap {
		position: relative;
	}

	.password-wrap input {
		padding-right: 92px;
	}

	.toggle-password {
		position: absolute;
		right: 10px;
		top: 50%;
		transform: translateY(-50%);
		height: 36px;
		padding: 0 12px;
		border-radius: 10px;
		border: 1px solid #dbe3ec;
		background: #f8fafc;
		color: #334155;
		font-size: 0.84rem;
		font-weight: 800;
		cursor: pointer;
	}

	.toggle-password:hover {
		background: #eff6ff;
		border-color: #bfdbfe;
	}

	.primary-button {
		width: 100%;
		height: 3.15rem;
		margin-top: 4px;
		border-radius: 1rem;
		border: 0;
		background: linear-gradient(135deg, #2563eb, #1d4ed8);
		color: white;
		font-size: 1rem;
		font-weight: 800;
		cursor: pointer;
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
		opacity: 0.72;
		cursor: not-allowed;
	}

	.feedback {
		margin-top: 16px;
		padding: 0.95rem 1rem;
		border-radius: 1rem;
		font-size: 0.92rem;
		font-weight: 700;
	}

	.feedback.error {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.2);
		color: #991b1b;
	}

	.feedback.success {
		background: rgba(34, 197, 94, 0.12);
		border: 1px solid rgba(34, 197, 94, 0.22);
		color: #166534;
	}

	.divider {
		display: flex;
		align-items: center;
		gap: 12px;
		margin: 20px 0 14px;
		color: #64748b;
		font-size: 0.88rem;
		font-weight: 700;
	}

	.divider::before,
	.divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: #e2e8f0;
	}

	.secondary-actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}

	.secondary-actions.single {
		grid-template-columns: 1fr;
	}

	.secondary-link {
		height: 3rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 1rem;
		background: white;
		border: 1px solid #cbd5e1;
		color: #123458;
		font-size: 0.95rem;
		font-weight: 800;
		transition:
			transform 0.16s ease,
			border-color 0.16s ease,
			background 0.16s ease;
	}

	.secondary-link:hover {
		transform: translateY(-1px);
		border-color: #bfdbfe;
		background: #eff6ff;
	}

	.foot-note {
		margin-top: 16px;
		font-size: 0.88rem;
		line-height: 1.6;
		color: #64748b;
		text-align: center;
	}

	@media (max-width: 1080px) {
		.auth-shell {
			grid-template-columns: 1fr;
			padding-top: 20px;
			padding-bottom: 20px;
		}

		.auth-left {
			padding-right: 0;
		}
	}

	@media (max-width: 720px) {
		.auth-shell {
			padding: 14px;
			gap: 20px;
		}

		.brand-name {
			font-size: 1.55rem;
		}

		.left-copy h1 {
			font-size: clamp(2.1rem, 10vw, 3rem);
		}

		.left-copy p {
			font-size: 0.98rem;
		}

		.left-panels {
			grid-template-columns: 1fr;
		}

		.card {
			padding: 22px;
			border-radius: 22px;
		}
	}
</style>