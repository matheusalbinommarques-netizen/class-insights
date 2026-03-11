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

	type AuthUserLike = {
		id: string;
		email?: string | null;
		user_metadata?: Record<string, unknown> | null;
	};

	let email = '';
	let password = '';
	let errorMessage = '';
	let loading = false;
	let showPassword = false;

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

	function getInviteCodeFromUserMetadata(user: AuthUserLike): string | null {
		const raw = user.user_metadata?.invite_code;
		if (typeof raw !== 'string') return null;

		const normalized = raw.trim().toUpperCase();
		return normalized || null;
	}

	function getRoleFromUserMetadata(user: AuthUserLike): ProfileRole | null {
		const raw = user.user_metadata?.role;
		if (raw === 'teacher' || raw === 'student' || raw === 'coord') {
			return raw;
		}
		return null;
	}

	function getDisplayNameFromUserMetadata(user: AuthUserLike): string | null {
		const displayName = user.user_metadata?.display_name;
		if (typeof displayName === 'string' && displayName.trim()) {
			return displayName.trim();
		}

		const name = user.user_metadata?.name;
		if (typeof name === 'string' && name.trim()) {
			return name.trim();
		}

		return null;
	}

	function buildFallbackDisplayName(user: AuthUserLike): string {
		const fromMetadata = getDisplayNameFromUserMetadata(user);
		if (fromMetadata) return fromMetadata;

		const fromEmail = user.email?.split('@')[0]?.trim();
		if (fromEmail) return fromEmail;

		return 'Usuário';
	}

	function extractErrorMessage(error: unknown): string {
		if (error instanceof Error) return error.message;

		if (typeof error === 'object' && error !== null) {
			const maybeMessage = 'message' in error ? error.message : null;
			if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
				return maybeMessage;
			}
		}

		return 'Não foi possível concluir a autenticação.';
	}

	async function tryCompleteStudentLink(user: AuthUserLike) {
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

	async function getExistingProfile(userId: string): Promise<ProfileRow | null> {
		const { data, error } = await supabase
			.from('profiles')
			.select('id, role, display_name')
			.eq('id', userId)
			.maybeSingle<ProfileRow>();

		if (error) {
			throw new Error(error.message);
		}

		return data ?? null;
	}

	async function ensureProfileForAuthenticatedUser(user: AuthUserLike): Promise<ProfileRow> {
		const existingProfile = await getExistingProfile(user.id);
		if (existingProfile) {
			return existingProfile;
		}

		const role = getRoleFromUserMetadata(user);
		if (!role) {
			throw new Error(
				'Perfil não encontrado e o role do usuário não está disponível. Verifique a configuração do cadastro.'
			);
		}

		const displayName = buildFallbackDisplayName(user);

		const { error: upsertError } = await supabase.from('profiles').upsert(
			{
				id: user.id,
				role,
				display_name: displayName
			},
			{
				onConflict: 'id'
			}
		);

		if (upsertError) {
			throw new Error(upsertError.message);
		}

		const createdProfile = await getExistingProfile(user.id);
		if (!createdProfile) {
			throw new Error('Não foi possível carregar o perfil após o upsert.');
		}

		return createdProfile;
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

		const metadataRole = getRoleFromUserMetadata(user);
		const pendingInviteCode = getPendingInviteCodeFromStorage();

		if (metadataRole === 'student' || pendingInviteCode) {
			try {
				await tryCompleteStudentLink(user);
			} catch (linkError) {
				loading = false;
				errorMessage = extractErrorMessage(linkError);
				return;
			}
		}

		let profile: ProfileRow;

		try {
			profile = await ensureProfileForAuthenticatedUser(user);
		} catch (profileError) {
			loading = false;
			errorMessage = extractErrorMessage(profileError);
			return;
		}

		await invalidateAll();

		const safeRedirect = sanitizeRedirect(redirectToParam);
		const fallbackRoute = fallbackRouteByRole(profile.role);
		const destination = safeRedirect ?? fallbackRoute;

		loading = false;
		await goto(destination);
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		await handleLogin();
	}
</script>

<svelte:head>
	<title>Login • Class Insights</title>
</svelte:head>

<div class="login-shell">
	<section class="login-left">
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
				<span class="brand-subtitle">Analytics de aprendizagem</span>
			</div>
		</a>

		<div class="left-copy">
			<div class="eyebrow">Acesso à plataforma</div>
			<h1>Entre e transforme dados em progresso visível.</h1>
			<p>
				Acesse sua área para acompanhar turmas, skills, snapshots e evolução de aprendizagem com
				mais clareza.
			</p>
		</div>

		<div class="left-pills">
			<span>Professor</span>
			<span>Aluno</span>
			<span>CSV com staging</span>
			<span>Snapshots</span>
		</div>

		<div class="left-panels">
			<div class="mini-panel">
				<div class="mini-label">Professor</div>
				<strong>Operação mais confiável</strong>
				<p>Turmas, skills, grid de notas e importação com validação.</p>
			</div>

			<div class="mini-panel">
				<div class="mini-label">Aluno</div>
				<strong>Progresso mais claro</strong>
				<p>Leitura visual da evolução por habilidade e pontos de atenção.</p>
			</div>
		</div>
	</section>

	<section class="login-right">
		<div class="card">
			<div class="header">
				<div class="eyebrow">Acesso</div>
				<h2>Entrar no Class Insights</h2>
				<p>
					Faça login para acessar sua área. Professores e alunos são redirecionados
					automaticamente para o espaço correto.
				</p>
			</div>

			<form class="login-form" onsubmit={handleSubmit}>
				<div class="field">
					<label for="email">E-mail</label>
					<input
						id="email"
						type="email"
						bind:value={email}
						placeholder="voce@email.com"
						autocomplete="email"
					/>
				</div>

				<div class="field">
					<label for="password">Senha</label>

					<div class="password-wrap">
						<input
							id="password"
							type={showPassword ? 'text' : 'password'}
							bind:value={password}
							placeholder="••••••••"
							autocomplete="current-password"
						/>

						<button
							type="button"
							class="toggle-password"
							aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
							onclick={() => (showPassword = !showPassword)}
						>
							{showPassword ? 'Ocultar' : 'Mostrar'}
						</button>
					</div>
				</div>

				<button type="submit" disabled={loading} class="primary-button">
					{loading ? 'Entrando...' : 'Entrar'}
				</button>
			</form>

			{#if errorMessage}
				<div class="feedback error">{errorMessage}</div>
			{/if}

			<div class="divider">
				<span>Novo por aqui?</span>
			</div>

			<div class="secondary-actions">
				<a href="/register/teacher" class="secondary-link">Cadastro de professor</a>
				<a href="/register/student" class="secondary-link">Cadastro de aluno</a>
			</div>

			<div class="foot-note">
				Seu perfil define automaticamente a área de destino após o login.
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

	.login-shell {
		min-height: 100vh;
		max-width: 1280px;
		margin: 0 auto;
		padding: 28px 24px;
		display: grid;
		grid-template-columns: minmax(0, 1.05fr) minmax(420px, 0.9fr);
		gap: 28px;
		align-items: center;
	}

	.login-left {
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

	.login-right {
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

	.login-form {
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
		.login-shell {
			grid-template-columns: 1fr;
			padding-top: 20px;
			padding-bottom: 20px;
		}

		.login-left {
			padding-right: 0;
		}

		.left-copy h1 {
			max-width: 780px;
		}
	}

	@media (max-width: 720px) {
		.login-shell {
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

		.left-panels,
		.secondary-actions {
			grid-template-columns: 1fr;
		}

		.card {
			padding: 22px;
			border-radius: 22px;
		}
	}
</style>