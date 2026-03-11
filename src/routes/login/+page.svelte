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

<div class="auth-page">
	<div class="auth-shell">
		<section class="auth-showcase">
			<a href="/" class="brand">
				<div class="brand-mark" aria-hidden="true">
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

			<div class="showcase-copy">
				<div class="eyebrow">Insights pedagógicos</div>
				<h1>Insights que transformam a educação.</h1>
				<p>
					Conecte importação, skills, snapshots e leitura pedagógica em uma experiência clara
					para professores, coordenação e alunos.
				</p>
			</div>

			<div class="showcase-points">
				<div class="point">
					<span class="point-icon">✓</span>
					<span>Análise de desempenho</span>
				</div>
				<div class="point">
					<span class="point-icon">✓</span>
					<span>Acompanhamento individualizado</span>
				</div>
				<div class="point">
					<span class="point-icon">✓</span>
					<span>Evolução longitudinal por habilidade</span>
				</div>
			</div>

			<div class="showcase-visual" aria-hidden="true">
				<div class="screen-card">
					<div class="screen-grid">
						<div class="screen-poster">
							<div class="poster-brand">
								<div class="poster-brand-mark"></div>
								<span>Class Insights</span>
							</div>

							<div class="poster-title">INSIGHTS QUE TRANSFORMAM A EDUCAÇÃO</div>

							<div class="poster-list">
								<div class="poster-item">
									<span class="poster-check"></span>
									<span>Análise de desempenho</span>
								</div>
								<div class="poster-item">
									<span class="poster-check"></span>
									<span>Acompanhamento individualizado</span>
								</div>
								<div class="poster-item">
									<span class="poster-check"></span>
									<span>Comunicação orientada por dados</span>
								</div>
							</div>

							<div class="poster-classroom">
								<div class="student-card small"></div>
								<div class="student-card"></div>
								<div class="student-card small"></div>
							</div>
						</div>

						<div class="screen-right">
							<div class="analytics-board">
								<div class="analytics-header">
									<span class="chip">BI prescritivo</span>
								</div>

								<div class="analytics-top-row">
									<div class="tiny-stat warning"></div>
									<div class="tiny-stat neutral"></div>
									<div class="tiny-stat success"></div>
									<div class="tiny-stat dark"></div>
								</div>

								<div class="analytics-middle">
									<div class="mini-chart">
										<span></span>
										<span></span>
										<span></span>
										<span></span>
									</div>
									<div class="mini-donut"></div>
								</div>

								<div class="analytics-bottom"></div>
							</div>

							<div class="login-preview">
								<div class="login-preview-title">Bem-vindo de volta</div>
								<div class="preview-field"></div>
								<div class="preview-field"></div>
								<div class="preview-button"></div>
								<div class="preview-social"></div>
								<div class="preview-social"></div>
							</div>
						</div>
					</div>

					<div class="screen-reflection"></div>
				</div>

				<div class="floating-card floating-card-left">
					<div class="floating-label">Professor</div>
					<strong>Operação mais confiável</strong>
					<p>Turmas, grid de notas, importação CSV e snapshots em um fluxo mais claro.</p>
				</div>

				<div class="floating-card floating-card-right">
					<div class="floating-label">Aluno</div>
					<strong>Progresso mais visível</strong>
					<p>Leitura simples da evolução por habilidade, com pontos fortes e atenção.</p>
				</div>
			</div>
		</section>

		<section class="auth-panel">
			<div class="auth-card">
				<div class="auth-header">
					<div class="eyebrow">Acesso</div>
					<h2>Bem-vindo de volta</h2>
					<p>
						Entre com seu e-mail para acessar sua área. O Class Insights direciona você
						automaticamente para professor, coordenação ou aluno.
					</p>
				</div>

				<form class="login-form" onsubmit={handleSubmit}>
					<div class="field">
						<label for="email">Usuário ou e-mail</label>
						<input
							id="email"
							name="email"
							type="email"
							bind:value={email}
							placeholder="voce@email.com"
							autocomplete="email"
							autocapitalize="none"
							autocorrect="off"
						/>
					</div>

					<div class="field">
						<div class="field-row">
							<label for="password">Senha</label>
							<a href="/forgot-password" class="field-link">Esqueceu a senha?</a>
						</div>

						<div class="password-wrap">
							<input
								id="password"
								name="password"
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
					<div class="feedback error" aria-live="polite">{errorMessage}</div>
				{/if}

				<div class="divider">
					<span>Primeiro acesso?</span>
				</div>

				<div class="secondary-actions">
					<a href="/register/teacher" class="secondary-link">
						<span class="secondary-title">Cadastro de professor</span>
						<span class="secondary-subtitle">Criar acesso para turmas e avaliações</span>
					</a>

					<a href="/register/student" class="secondary-link">
						<span class="secondary-title">Cadastro de aluno</span>
						<span class="secondary-subtitle">Entrar com seu vínculo e acompanhar progresso</span>
					</a>
				</div>

				<div class="foot-note">
					Seu perfil define automaticamente a área de destino após o login.
				</div>
			</div>
		</section>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family:
			Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
			sans-serif;
		color: #0f172a;
		background:
			radial-gradient(circle at 14% 18%, rgba(37, 99, 235, 0.14), transparent 22%),
			radial-gradient(circle at 88% 14%, rgba(72, 168, 104, 0.11), transparent 18%),
			linear-gradient(180deg, #eff4fb 0%, #edf2f9 48%, #e9eef6 100%);
	}

	:global(a) {
		text-decoration: none;
		color: inherit;
	}

	:global(*) {
		box-sizing: border-box;
	}

	.auth-page {
		min-height: 100svh;
		padding: 26px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.auth-shell {
		position: relative;
		width: min(1320px, 100%);
		min-height: min(860px, calc(100svh - 52px));
		display: grid;
		grid-template-columns: minmax(0, 1.12fr) minmax(410px, 470px);
		border-radius: 34px;
		overflow: hidden;
		border: 1px solid rgba(148, 163, 184, 0.2);
		background: rgba(255, 255, 255, 0.68);
		box-shadow:
			0 30px 80px rgba(15, 23, 42, 0.12),
			inset 0 1px 0 rgba(255, 255, 255, 0.35);
		backdrop-filter: blur(14px);
	}

	.auth-showcase {
		position: relative;
		padding: 34px 36px 34px 38px;
		display: flex;
		flex-direction: column;
		gap: 24px;
		background:
			linear-gradient(135deg, rgba(255, 255, 255, 0.72), rgba(241, 245, 249, 0.84)),
			linear-gradient(180deg, rgba(37, 99, 235, 0.03), rgba(72, 168, 104, 0.04));
	}

	.auth-showcase::before {
		content: '';
		position: absolute;
		inset: 0;
		background:
			radial-gradient(circle at 22% 20%, rgba(59, 130, 246, 0.08), transparent 20%),
			radial-gradient(circle at 72% 62%, rgba(72, 168, 104, 0.08), transparent 22%);
		pointer-events: none;
	}

	.brand {
		position: relative;
		z-index: 1;
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
		letter-spacing: -0.035em;
		color: #123458;
		line-height: 1;
	}

	.brand-subtitle {
		margin-top: 4px;
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

	.showcase-copy,
	.showcase-points,
	.showcase-visual {
		position: relative;
		z-index: 1;
	}

	.eyebrow {
		font-size: 0.78rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #64748b;
	}

	.showcase-copy {
		max-width: 700px;
	}

	.showcase-copy h1 {
		margin: 10px 0 0;
		font-size: clamp(2.6rem, 5.2vw, 4.5rem);
		line-height: 0.96;
		letter-spacing: -0.055em;
		color: #123458;
		max-width: 720px;
	}

	.showcase-copy p {
		margin: 16px 0 0;
		max-width: 640px;
		font-size: 1.05rem;
		line-height: 1.78;
		color: #334155;
	}

	.showcase-points {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 12px;
		max-width: 760px;
	}

	.point {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 14px;
		border-radius: 16px;
		background: rgba(255, 255, 255, 0.82);
		border: 1px solid rgba(148, 163, 184, 0.18);
		box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
		color: #1e3a5f;
		font-size: 0.93rem;
		font-weight: 800;
	}

	.point-icon {
		flex-shrink: 0;
		width: 22px;
		height: 22px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		background: rgba(72, 168, 104, 0.14);
		color: #2f8e56;
		font-size: 0.9rem;
		font-weight: 900;
	}

	.showcase-visual {
		margin-top: auto;
		padding-top: 10px;
	}

	.screen-card {
		position: relative;
		border-radius: 34px;
		padding: 22px;
		background:
			linear-gradient(160deg, rgba(255, 255, 255, 0.98), rgba(242, 247, 253, 0.92)),
			linear-gradient(135deg, rgba(37, 99, 235, 0.06), rgba(72, 168, 104, 0.05));
		border: 1px solid rgba(148, 163, 184, 0.18);
		box-shadow:
			0 28px 60px rgba(15, 23, 42, 0.12),
			inset 0 1px 0 rgba(255, 255, 255, 0.75);
		overflow: hidden;
		min-height: 410px;
	}

	.screen-reflection {
		position: absolute;
		inset: 0;
		background: linear-gradient(115deg, transparent 18%, rgba(255, 255, 255, 0.22) 36%, transparent 52%);
		pointer-events: none;
	}

	.screen-grid {
		height: 100%;
		display: grid;
		grid-template-columns: 1.05fr 0.95fr;
		gap: 18px;
	}

	.screen-poster,
	.analytics-board,
	.login-preview {
		border-radius: 24px;
		border: 1px solid rgba(148, 163, 184, 0.16);
		background: rgba(255, 255, 255, 0.94);
		box-shadow: 0 14px 34px rgba(15, 23, 42, 0.08);
	}

	.screen-poster {
		padding: 18px 18px 16px;
		display: flex;
		flex-direction: column;
	}

	.poster-brand {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		font-size: 0.86rem;
		font-weight: 900;
		color: #173a63;
	}

	.poster-brand-mark {
		width: 34px;
		height: 34px;
		border-radius: 999px;
		background:
			linear-gradient(180deg, rgba(23, 58, 99, 0.08), rgba(58, 123, 213, 0.1)),
			white;
		border: 2px solid rgba(23, 58, 99, 0.18);
		position: relative;
	}

	.poster-brand-mark::before,
	.poster-brand-mark::after {
		content: '';
		position: absolute;
	}

	.poster-brand-mark::before {
		left: 8px;
		bottom: 8px;
		width: 4px;
		height: 10px;
		border-radius: 999px 999px 0 0;
		background: #3a7bd5;
		box-shadow: 7px -3px 0 #3a7bd5, 14px -8px 0 #3a7bd5;
	}

	.poster-brand-mark::after {
		right: 7px;
		top: 6px;
		width: 10px;
		height: 10px;
		border-top: 3px solid #48a868;
		border-right: 3px solid #48a868;
		transform: rotate(45deg);
	}

	.poster-title {
		margin-top: 16px;
		font-size: 1.7rem;
		line-height: 1.02;
		letter-spacing: -0.04em;
		font-weight: 900;
		color: #102f52;
		max-width: 280px;
	}

	.poster-list {
		margin-top: 16px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.poster-item {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 0.92rem;
		font-weight: 700;
		color: #31506d;
	}

	.poster-check {
		width: 18px;
		height: 18px;
		border-radius: 999px;
		background: rgba(72, 168, 104, 0.18);
		position: relative;
		flex-shrink: 0;
	}

	.poster-check::after {
		content: '';
		position: absolute;
		left: 5px;
		top: 4px;
		width: 6px;
		height: 3px;
		border-left: 2px solid #2f8e56;
		border-bottom: 2px solid #2f8e56;
		transform: rotate(-45deg);
	}

	.poster-classroom {
		margin-top: auto;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
		padding-top: 18px;
	}

	.student-card {
		height: 92px;
		border-radius: 16px;
		background:
			linear-gradient(180deg, rgba(226, 232, 240, 0.85), rgba(241, 245, 249, 0.94));
		border: 1px solid rgba(203, 213, 225, 0.86);
		position: relative;
	}

	.student-card.small {
		height: 82px;
	}

	.student-card::before {
		content: '';
		position: absolute;
		left: 50%;
		top: 22px;
		transform: translateX(-50%);
		width: 28px;
		height: 28px;
		border-radius: 999px;
		background: rgba(83, 108, 132, 0.2);
	}

	.student-card::after {
		content: '';
		position: absolute;
		left: 50%;
		top: 54px;
		transform: translateX(-50%);
		width: 44px;
		height: 18px;
		border-radius: 999px 999px 10px 10px;
		background: rgba(83, 108, 132, 0.16);
	}

	.screen-right {
		display: grid;
		grid-template-rows: 1fr auto;
		gap: 16px;
	}

	.analytics-board {
		padding: 18px;
		display: flex;
		flex-direction: column;
		gap: 14px;
		min-height: 230px;
	}

	.analytics-header {
		display: flex;
		justify-content: flex-end;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		height: 30px;
		padding: 0 12px;
		border-radius: 999px;
		background: rgba(15, 23, 42, 0.06);
		color: #0f172a;
		font-size: 0.84rem;
		font-weight: 900;
	}

	.analytics-top-row {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 10px;
	}

	.tiny-stat {
		height: 54px;
		border-radius: 16px;
		border: 1px solid rgba(203, 213, 225, 0.82);
		background: #f8fafc;
		position: relative;
	}

	.tiny-stat::after {
		content: '';
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		width: 15px;
		height: 15px;
		border-radius: 4px;
	}

	.tiny-stat.warning::after {
		background: rgba(245, 158, 11, 0.16);
		border: 2px solid #d97706;
		clip-path: polygon(50% 8%, 94% 92%, 6% 92%);
	}

	.tiny-stat.neutral::after {
		background: linear-gradient(90deg, #94a3b8, #cbd5e1);
		height: 4px;
		border-radius: 999px;
	}

	.tiny-stat.success::after {
		background: rgba(34, 197, 94, 0.16);
		border: 2px solid #15803d;
	}

	.tiny-stat.dark::after {
		background: rgba(15, 23, 42, 0.12);
		border-radius: 999px;
		border: 2px solid #334155;
	}

	.analytics-middle {
		display: grid;
		grid-template-columns: 1fr 92px;
		gap: 12px;
		align-items: center;
	}

	.mini-chart {
		height: 112px;
		border-radius: 18px;
		border: 1px solid rgba(203, 213, 225, 0.82);
		background: linear-gradient(180deg, #f8fafc, #eef3f9);
		display: flex;
		align-items: flex-end;
		gap: 10px;
		padding: 16px;
	}

	.mini-chart span {
		display: block;
		flex: 1;
		border-radius: 999px 999px 6px 6px;
		background: linear-gradient(180deg, rgba(72, 168, 104, 0.95), rgba(58, 123, 213, 0.9));
	}

	.mini-chart span:nth-child(1) {
		height: 38px;
	}

	.mini-chart span:nth-child(2) {
		height: 62px;
	}

	.mini-chart span:nth-child(3) {
		height: 52px;
	}

	.mini-chart span:nth-child(4) {
		height: 76px;
	}

	.mini-donut {
		width: 92px;
		height: 92px;
		border-radius: 999px;
		background:
			conic-gradient(#3a7bd5 0 34%, #7dd29b 34% 72%, #e2e8f0 72% 100%);
		position: relative;
	}

	.mini-donut::after {
		content: '';
		position: absolute;
		inset: 20px;
		border-radius: 999px;
		background: white;
	}

	.analytics-bottom {
		height: 64px;
		border-radius: 16px;
		background:
			linear-gradient(135deg, rgba(125, 210, 155, 0.3) 0 22%, transparent 22% 36%, rgba(96, 165, 250, 0.26) 36% 58%, transparent 58% 70%, rgba(15, 23, 42, 0.06) 70%);
		border: 1px solid rgba(203, 213, 225, 0.84);
	}

	.login-preview {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.login-preview-title {
		font-size: 1rem;
		font-weight: 900;
		color: #102f52;
	}

	.preview-field {
		height: 40px;
		border-radius: 12px;
		border: 1px solid rgba(203, 213, 225, 0.84);
		background: #f8fafc;
	}

	.preview-button {
		height: 42px;
		border-radius: 999px;
		background: linear-gradient(135deg, #1e40af, #173a63);
	}

	.preview-social {
		height: 38px;
		border-radius: 999px;
		border: 1px solid rgba(203, 213, 225, 0.84);
		background: white;
	}

	.floating-card {
		position: absolute;
		bottom: 22px;
		width: min(260px, 34%);
		padding: 16px;
		border-radius: 20px;
		background: rgba(255, 255, 255, 0.9);
		border: 1px solid rgba(148, 163, 184, 0.18);
		box-shadow: 0 16px 36px rgba(15, 23, 42, 0.1);
		backdrop-filter: blur(8px);
	}

	.floating-card-left {
		left: 16px;
	}

	.floating-card-right {
		right: 16px;
	}

	.floating-label {
		font-size: 0.74rem;
		font-weight: 900;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #64748b;
		margin-bottom: 8px;
	}

	.floating-card strong {
		display: block;
		font-size: 0.98rem;
		color: #123458;
		margin-bottom: 6px;
	}

	.floating-card p {
		margin: 0;
		color: #475569;
		font-size: 0.88rem;
		line-height: 1.55;
	}

	.auth-panel {
		position: relative;
		padding: 26px;
		display: flex;
		align-items: center;
		justify-content: center;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.85), rgba(248, 250, 252, 0.92));
		border-left: 1px solid rgba(148, 163, 184, 0.14);
	}

	.auth-card {
		width: 100%;
		max-width: 388px;
		padding: 10px 0;
	}

	.auth-header {
		margin-bottom: 24px;
	}

	.auth-header h2 {
		margin: 10px 0 0;
		font-size: clamp(2.05rem, 3vw, 2.5rem);
		line-height: 1;
		letter-spacing: -0.05em;
		color: #123458;
	}

	.auth-header p {
		margin: 14px 0 0;
		font-size: 0.98rem;
		line-height: 1.72;
		color: #475569;
	}

	.login-form {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}

	.field-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.field label {
		font-size: 0.9rem;
		font-weight: 800;
		color: #334155;
	}

	.field-link {
		font-size: 0.84rem;
		font-weight: 800;
		color: #2b67d0;
	}

	.field-link:hover {
		text-decoration: underline;
	}

	input {
		width: 100%;
		height: 3.35rem;
		padding: 0 1rem;
		border-radius: 1rem;
		border: 1px solid #d7e0ea;
		background: white;
		color: #0f172a;
		font-size: 0.98rem;
		outline: none;
		transition:
			border-color 0.16s ease,
			box-shadow 0.16s ease,
			background 0.16s ease,
			transform 0.16s ease;
	}

	input::placeholder {
		color: #94a3b8;
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
		padding-right: 96px;
	}

	.toggle-password {
		position: absolute;
		right: 10px;
		top: 50%;
		transform: translateY(-50%);
		height: 36px;
		padding: 0 12px;
		border-radius: 10px;
		border: 1px solid #dde6ef;
		background: #f8fafc;
		color: #334155;
		font-size: 0.84rem;
		font-weight: 800;
		cursor: pointer;
		transition:
			background 0.16s ease,
			border-color 0.16s ease,
			color 0.16s ease;
	}

	.toggle-password:hover {
		background: #eff6ff;
		border-color: #bfdbfe;
		color: #173a63;
	}

	.primary-button {
		width: 100%;
		height: 3.3rem;
		margin-top: 4px;
		border-radius: 999px;
		border: 0;
		background: linear-gradient(135deg, #17407a 0%, #1d4ed8 100%);
		color: white;
		font-size: 1rem;
		font-weight: 900;
		cursor: pointer;
		box-shadow: 0 14px 28px rgba(29, 78, 216, 0.22);
		transition:
			transform 0.16s ease,
			box-shadow 0.16s ease,
			opacity 0.16s ease,
			filter 0.16s ease;
	}

	.primary-button:hover:enabled {
		transform: translateY(-1px);
		box-shadow: 0 18px 32px rgba(29, 78, 216, 0.24);
		filter: saturate(1.05);
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
		margin: 22px 0 16px;
		color: #64748b;
		font-size: 0.88rem;
		font-weight: 800;
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
		grid-template-columns: 1fr;
		gap: 12px;
	}

	.secondary-link {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 14px 16px;
		border-radius: 18px;
		background: rgba(255, 255, 255, 0.9);
		border: 1px solid #d7e0ea;
		color: #123458;
		transition:
			transform 0.16s ease,
			border-color 0.16s ease,
			background 0.16s ease,
			box-shadow 0.16s ease;
	}

	.secondary-link:hover {
		transform: translateY(-1px);
		border-color: #bfdbfe;
		background: #f8fbff;
		box-shadow: 0 10px 22px rgba(15, 23, 42, 0.06);
	}

	.secondary-title {
		font-size: 0.95rem;
		font-weight: 900;
		color: #123458;
	}

	.secondary-subtitle {
		font-size: 0.86rem;
		line-height: 1.45;
		color: #64748b;
	}

	.foot-note {
		margin-top: 16px;
		font-size: 0.88rem;
		line-height: 1.62;
		color: #64748b;
		text-align: center;
	}

	@media (max-width: 1180px) {
		.auth-page {
			padding: 18px;
		}

		.auth-shell {
			grid-template-columns: 1fr;
			min-height: auto;
		}

		.auth-showcase {
			padding-bottom: 26px;
		}

		.auth-panel {
			border-left: 0;
			border-top: 1px solid rgba(148, 163, 184, 0.14);
		}

		.auth-card {
			max-width: 520px;
		}
	}

	@media (max-width: 860px) {
		.showcase-points {
			grid-template-columns: 1fr;
			max-width: 520px;
		}

		.screen-grid {
			grid-template-columns: 1fr;
		}

		.screen-right {
			grid-template-columns: 1fr 1fr;
			grid-template-rows: none;
		}

		.floating-card {
			position: static;
			width: 100%;
			margin-top: 14px;
		}

		.showcase-visual {
			display: grid;
			gap: 14px;
		}
	}

	@media (max-width: 640px) {
		.auth-page {
			padding: 0;
		}

		.auth-shell {
			border-radius: 0;
			min-height: 100svh;
		}

		.auth-showcase {
			padding: 20px 18px 18px;
			gap: 20px;
		}

		.brand-name {
			font-size: 1.55rem;
		}

		.brand-subtitle {
			font-size: 0.85rem;
		}

		.showcase-copy h1 {
			font-size: clamp(2.2rem, 10vw, 3rem);
		}

		.showcase-copy p {
			font-size: 0.96rem;
			line-height: 1.66;
		}

		.screen-card {
			padding: 14px;
			border-radius: 24px;
			min-height: auto;
		}

		.screen-right {
			grid-template-columns: 1fr;
		}

		.poster-title {
			font-size: 1.35rem;
			max-width: none;
		}

		.analytics-middle {
			grid-template-columns: 1fr;
		}

		.mini-donut {
			margin: 0 auto;
		}

		.auth-panel {
			padding: 18px;
		}

		.auth-card {
			max-width: none;
			padding: 4px 0;
		}

		.auth-header h2 {
			font-size: 1.95rem;
		}

		input {
			height: 3.2rem;
		}

		.primary-button {
			height: 3.15rem;
		}
	}
</style>