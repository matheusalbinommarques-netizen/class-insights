<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';

	import ciIcon from '$lib/assets/ci-icon.png';

	import homeHeroMockup from '$lib/assets/home/home-hero-mockup.png';
	import stepPublish from '$lib/assets/home/step-publish.png';
	import loginReadByRole from '$lib/assets/home/login-read-by-role.png';
	import loginProgressClear from '$lib/assets/home/login-progress-clear.png';

	import personaProfessorMini from '$lib/assets/home/persona-professor-mini.png';
	import personaCoordenacaoMini from '$lib/assets/home/persona-coordenacao-mini.png';
	import personaAlunoMini from '$lib/assets/home/persona-aluno-mini.png';

	import { supabase } from '$lib/services/supabaseClient';

	type ProfileRole = 'teacher' | 'student' | 'coord';

	type ProfileRow = {
		id: string;
		role: ProfileRole;
		display_name: string;
	};

	type AuthUserLike = {
		id: string;
		email?: string | null;
		user_metadata?: Record<string, unknown> | null;
	};

	type Benefit = {
		title: string;
		image: string;
	};

	type RegisterCard = {
		title: string;
		label: string;
		href: string;
		image: string;
		cardClass: string;
	};

	const PENDING_STUDENT_INVITE_CODE_KEY = 'pendingStudentInviteCode';

	const benefits: Benefit[] = [
		{
			title: 'Publicação com contexto',
			image: stepPublish
		},
		{
			title: 'Leitura por perfil',
			image: loginReadByRole
		},
		{
			title: 'Acompanhamento claro',
			image: loginProgressClear
		}
	];

	const registerCards: RegisterCard[] = [
		{
			title: 'Aluno',
			label: 'Progressão e histórico',
			href: resolve('/register/student'),
			image: personaAlunoMini,
			cardClass: 'border-emerald-200 bg-emerald-50/60 hover:border-emerald-300 hover:bg-emerald-50'
		},
		{
			title: 'Professor',
			label: 'Turmas e avaliações',
			href: resolve('/register/teacher'),
			image: personaProfessorMini,
			cardClass: 'border-sky-200 bg-sky-50/60 hover:border-sky-300 hover:bg-sky-50'
		},
		{
			title: 'Coordenação',
			label: 'Leitura institucional',
			href: resolve('/register/coord'),
			image: personaCoordenacaoMini,
			cardClass: 'border-amber-200 bg-amber-50/60 hover:border-amber-300 hover:bg-amber-50'
		}
	];

	let email = '';
	let password = '';
	let errorMessage = '';
	let loading = false;
	let showPassword = false;
	let rememberMe = false;

	$: redirectToParam = $page.url.searchParams.get('redirectTo');

	function sanitizeRedirect(path: string | null): string | null {
		if (!path) return null;
		if (!path.startsWith('/')) return null;
		if (path.startsWith('//')) return null;
		return path;
	}

	function fallbackRouteByRole(role: ProfileRole): string {
		if (role === 'teacher') return '/teacher';
		if (role === 'coord') return '/coord';
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
		} catch {
			// noop
		}
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

	async function tryCompleteStudentLink(inviteCode: string) {
		const normalizedInviteCode = inviteCode.trim().toUpperCase();
		if (!normalizedInviteCode) {
			return {
				attempted: false,
				linked: false
			};
		}

		const { data, error } = await supabase.rpc('claim_student_by_invite_code', {
			p_invite_code: normalizedInviteCode
		});

		if (error) {
			throw error;
		}

		const rows = (data ?? []) as Array<{ student_id: string }>;

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

		const trimmedEmail = email.trim().toLowerCase();

		if (!trimmedEmail) {
			errorMessage = 'E-mail é obrigatório.';
			return;
		}

		if (!password) {
			errorMessage = 'Senha é obrigatória.';
			return;
		}

		loading = true;

		try {
			const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
				email: trimmedEmail,
				password
			});

			if (signInError) {
				throw new Error(signInError.message);
			}

			const user = signInData.user;
			if (!user) {
				throw new Error('Não foi possível identificar o usuário após o login.');
			}

			const profile = await ensureProfileForAuthenticatedUser(user);
			const pendingInviteCode = getPendingInviteCodeFromStorage();

			if (profile.role === 'student' && pendingInviteCode) {
				await tryCompleteStudentLink(pendingInviteCode);
			}

			await supabase.auth.getSession();
			await invalidateAll();

			const safeRedirect = sanitizeRedirect(redirectToParam);
			const fallbackRoute = fallbackRouteByRole(profile.role);
			const destination = safeRedirect ?? fallbackRoute;

			if (typeof window !== 'undefined') {
				window.location.assign(destination);
				return;
			}

			await goto(destination);
		} catch (error) {
			errorMessage = extractErrorMessage(error);
		} finally {
			loading = false;
		}
	}

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		void handleLogin();
	}
</script>

<svelte:head>
	<title>Class Insights - Entrar</title>
	<meta
		name="description"
		content="Entre no Class Insights para acessar sua área de professor, coordenação ou aluno."
	/>
</svelte:head>

<div class="min-h-screen bg-slate-50 text-slate-900">
	<div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
		<div
			class="absolute left-1/2 -top-32 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-200/45 blur-3xl"
		></div>
		<div class="absolute -right-20 top-40 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl"></div>
		<div class="absolute -left-20 bottom-10 h-72 w-72 rounded-full bg-amber-200/30 blur-3xl"></div>
	</div>

	<div class="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-6 sm:px-6 lg:px-8">
		<div
			class="grid w-full overflow-hidden rounded-4xl border border-slate-200 bg-white/80 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur lg:grid-cols-[1.05fr_0.95fr]"
		>
			<section
				class="order-2 border-t border-slate-200 bg-linear-to-br from-white via-slate-50 to-sky-50/70 p-6 lg:order-1 lg:border-r lg:border-t-0 lg:p-10"
			>
				<div class="max-w-2xl">
					<h1
						class="text-4xl font-black leading-[1.02] tracking-tight text-slate-950 sm:text-5xl lg:text-[3.6rem]"
					>
						Entre no <span class="text-emerald-600">Class Insights</span>
					</h1>

					<p class="mt-5 text-lg leading-8 text-slate-700">
						Acompanhe a aprendizagem com leitura pedagógica clara.
					</p>

					<p class="mt-4 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
						Professores publicam com clareza. Coordenação acompanha tendências. Alunos sabem onde
						revisar.
					</p>
				</div>

				<div class="mt-8 flex max-w-2xl flex-wrap gap-3">
					{#each benefits as benefit (benefit.title)}
						<div
							class="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
						>
							<img src={benefit.image} alt={benefit.title} class="h-16 w-16 object-contain" />
							<span class="text-sm font-semibold text-slate-700 sm:text-base">{benefit.title}</span>
						</div>
					{/each}
				</div>

				<div class="mt-10">
					<div
						class="relative overflow-hidden rounded-4xl border border-slate-200 bg-white/70 p-4 shadow-sm"
					>
						<div
							class="pointer-events-none absolute inset-x-8 bottom-0 h-16 rounded-full bg-sky-100/60 blur-2xl"
						></div>
						<img
							src={homeHeroMockup}
							alt="Visão do painel do Class Insights"
							class="relative z-10 w-full object-contain"
						/>
					</div>
				</div>
			</section>

			<section class="order-1 flex items-center justify-center p-6 sm:p-8 lg:order-2 lg:p-10">
				<div class="w-full max-w-md">
					<div class="mb-6 lg:hidden">
						<a
							href={resolve('/')}
							class="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
						>
							Voltar para home
						</a>
					</div>

					<div
						class="rounded-4xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8"
					>
						<div class="mb-6 flex justify-center">
							<a href={resolve('/')} aria-label="Voltar para a home">
								<img src={ciIcon} alt="Class Insights" class="h-36 w-auto object-contain sm:h-36" />
							</a>
						</div>

						<div class="mb-6">
							<h2 class="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Entrar</h2>
							<p class="mt-3 text-base leading-7 text-slate-600">
								Acesse sua conta para continuar.
							</p>
						</div>

						{#if sanitizeRedirect(redirectToParam)}
							<div
								class="mb-5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800"
							>
								Você será redirecionado para a página solicitada após o login.
							</div>
						{/if}

						<form class="space-y-5" on:submit={handleSubmit}>
							<div class="space-y-2">
								<label for="email" class="block text-sm font-semibold text-slate-700">E-mail</label>

								<div class="relative">
									<div
										class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
									>
										<svg
											class="h-5 w-5"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
										>
											<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16v12H4z" />
											<path stroke-linecap="round" stroke-linejoin="round" d="m4 8 8 6 8-6" />
										</svg>
									</div>

									<input
										id="email"
										name="email"
										type="email"
										bind:value={email}
										placeholder="voce@email.com"
										autocomplete="email"
										autocapitalize="off"
										autocorrect="off"
										class="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
										disabled={loading}
									/>
								</div>
							</div>

							<div class="space-y-2">
								<label for="password" class="block text-sm font-semibold text-slate-700"
									>Senha</label
								>

								<div class="relative">
									<div
										class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
									>
										<svg
											class="h-5 w-5"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
										>
											<rect x="5" y="11" width="14" height="9" rx="2" />
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M8 11V8a4 4 0 1 1 8 0v3"
											/>
										</svg>
									</div>

									<input
										id="password"
										name="password"
										type={showPassword ? 'text' : 'password'}
										bind:value={password}
										placeholder="Digite sua senha"
										autocomplete="current-password"
										class="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-14 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
										disabled={loading}
									/>

									<button
										type="button"
										class="absolute right-2 top-2 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-slate-300 hover:bg-slate-100"
										aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
										on:click={() => (showPassword = !showPassword)}
										disabled={loading}
									>
										{#if showPassword}
											<svg
												class="h-5 w-5"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
											>
												<path stroke-linecap="round" stroke-linejoin="round" d="M3 3l18 18" />
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M10.58 10.58a2 2 0 0 0 2.83 2.83"
												/>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M9.88 5.09A10.94 10.94 0 0 1 12 5c5 0 9.27 3.11 11 7-0.55 1.23-1.35 2.35-2.33 3.31M6.61 6.61C4.62 7.86 3.15 9.73 2 12c0.92 2.04 2.46 3.76 4.39 4.99A10.78 10.78 0 0 0 12 19c1.74 0 3.39-0.39 4.86-1.08"
												/>
											</svg>
										{:else}
											<svg
												class="h-5 w-5"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
												/>
												<circle cx="12" cy="12" r="3" />
											</svg>
										{/if}
									</button>
								</div>
							</div>

							<div class="flex items-center justify-between gap-4">
								<label class="inline-flex items-center gap-3 text-sm text-slate-600">
									<input
										type="checkbox"
										bind:checked={rememberMe}
										class="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-sky-200"
										disabled={loading}
									/>
									<span>Lembrar de mim</span>
								</label>

								<a
									href={resolve('/forgot-password')}
									class="text-sm font-semibold text-sky-700 transition hover:text-sky-800 hover:underline"
								>
									Esqueci minha senha
								</a>
							</div>

							<button
								type="submit"
								disabled={loading}
								class="inline-flex h-14 w-full items-center justify-center rounded-2xl bg-slate-900 text-base font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
							>
								{#if loading}
									<span class="flex items-center gap-3">
										<svg class="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
											<circle
												cx="12"
												cy="12"
												r="10"
												class="opacity-25"
												stroke="currentColor"
												stroke-width="4"
											></circle>
											<path
												class="opacity-75"
												fill="currentColor"
												d="M22 12a10 10 0 0 0-10-10v4a6 6 0 0 1 6 6h4Z"
											></path>
										</svg>
										Entrando...
									</span>
								{:else}
									Entrar
								{/if}
							</button>
						</form>

						{#if errorMessage}
							<div
								class="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
								aria-live="polite"
							>
								{errorMessage}
							</div>
						{/if}

						<div class="my-7 flex items-center gap-3 text-sm text-slate-400">
							<div class="h-px flex-1 bg-slate-200"></div>
							<span class="font-semibold text-slate-500">
								Novo por aqui? <span class="text-slate-900">Cadastre-se como:</span>
							</span>
							<div class="h-px flex-1 bg-slate-200"></div>
						</div>

						<div class="grid gap-3 sm:grid-cols-3">
							{#each registerCards as card (card.title)}
								<a
									href={card.href}
									class={`group rounded-2xl border p-4 text-center transition hover:-translate-y-0.5 hover:shadow-sm ${card.cardClass}`}
								>
									<img
										src={card.image}
										alt={card.title}
										class="mx-auto h-16 w-16 object-contain"
										loading="lazy"
									/>
									<p class="mt-3 text-lg font-bold tracking-tight text-slate-900">{card.title}</p>
									<p class="mt-1 text-xs leading-5 text-slate-600">{card.label}</p>
								</a>
							{/each}
						</div>

						<p class="mt-6 text-center text-sm leading-6 text-slate-500">
							Seu perfil define automaticamente a área de destino após o login.
						</p>

						<p class="mt-3 text-center text-sm leading-6 text-slate-500">
							Seus dados são usados apenas para acesso e acompanhamento pedagógico.
						</p>
					</div>
				</div>
			</section>
		</div>
	</div>
</div>
