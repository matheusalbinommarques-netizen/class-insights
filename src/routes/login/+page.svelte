<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';

	import { supabase } from '$lib/services/supabaseClient';

	type ProfileRole = 'teacher' | 'student' | 'coord';
	type Tone = 'sky' | 'emerald' | 'amber';

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
		text: string;
		tone: Tone;
	};

	type RoleCard = {
		title: string;
		label: string;
		text: string;
		tone: Tone;
		items: string[];
	};

	const PENDING_STUDENT_INVITE_CODE_KEY = 'pendingStudentInviteCode';

	const benefits: Benefit[] = [
		{
			title: 'Entrada sem confusao',
			text: 'O sistema reconhece seu perfil e envia voce para a area correta.',
			tone: 'sky'
		},
		{
			title: 'Leitura com contexto',
			text: 'Professor, coordenacao e aluno acessam a mesma base com visoes diferentes.',
			tone: 'emerald'
		},
		{
			title: 'Produto orientado a acao',
			text: 'Menos planilha solta. Mais acompanhamento real e historico longitudinal.',
			tone: 'amber'
		}
	];

	const roleCards: RoleCard[] = [
		{
			title: 'Professor',
			label: 'Nucleo operacional',
			text: 'Foco em rotina pedagogica e decisao rapida.',
			tone: 'sky',
			items: ['turmas e materias', 'avaliacoes e notas', 'prioridades da turma']
		},
		{
			title: 'Coordenacao',
			label: 'Nucleo analitico',
			text: 'Foco em padroes e leitura institucional.',
			tone: 'emerald',
			items: ['comparacao entre turmas', 'visao por materia', 'prioridades macro']
		},
		{
			title: 'Aluno',
			label: 'Nucleo de valor',
			text: 'Foco em progresso claro e simples.',
			tone: 'amber',
			items: ['historico recente', 'melhor e pior materia', 'evolucao ao longo do tempo']
		}
	];

	let email = '';
	let password = '';
	let errorMessage = '';
	let loading = false;
	let showPassword = false;

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

		return 'Usuario';
	}

	function extractErrorMessage(error: unknown): string {
		if (error instanceof Error) return error.message;

		if (typeof error === 'object' && error !== null) {
			const maybeMessage = 'message' in error ? error.message : null;
			if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
				return maybeMessage;
			}
		}

		return 'Nao foi possivel concluir a autenticacao.';
	}

	function toneIconClasses(tone: Tone) {
		if (tone === 'sky') return 'bg-sky-100 text-sky-700';
		if (tone === 'emerald') return 'bg-emerald-100 text-emerald-700';
		return 'bg-amber-100 text-amber-700';
	}

	function toneCardClasses(tone: Tone) {
		if (tone === 'sky') return 'border-sky-200 bg-sky-50';
		if (tone === 'emerald') return 'border-emerald-200 bg-emerald-50';
		return 'border-amber-200 bg-amber-50';
	}

	function toneTextClasses(tone: Tone) {
		if (tone === 'sky') return 'text-sky-700';
		if (tone === 'emerald') return 'text-emerald-700';
		return 'text-amber-700';
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
				'Perfil nao encontrado e o role do usuario nao esta disponivel. Verifique a configuracao do cadastro.'
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
			throw new Error('Nao foi possivel carregar o perfil apos o upsert.');
		}

		return createdProfile;
	}

	async function handleLogin() {
		errorMessage = '';

		const trimmedEmail = email.trim().toLowerCase();

		if (!trimmedEmail) {
			errorMessage = 'E-mail e obrigatorio.';
			return;
		}

		if (!password) {
			errorMessage = 'Senha e obrigatoria.';
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
				throw new Error('Nao foi possivel identificar o usuario apos o login.');
			}

			const profile = await ensureProfileForAuthenticatedUser(user);
			const pendingInviteCode = getPendingInviteCodeFromStorage();

			if (profile.role === 'student' && pendingInviteCode) {
				await tryCompleteStudentLink(pendingInviteCode);
			}

			await invalidateAll();

			const safeRedirect = sanitizeRedirect(redirectToParam);
			const fallbackRoute = fallbackRouteByRole(profile.role);
			const destination = safeRedirect ?? fallbackRoute;

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
	<title>Login - Class Insights</title>
	<meta
		name="description"
		content="Entre no Class Insights para acessar sua area de professor, coordenacao ou aluno."
	/>
</svelte:head>

<div class="min-h-screen bg-slate-50 text-slate-900">
	<div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
		<div
			class="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-200/50 blur-3xl"
		></div>
		<div class="absolute -right-24 top-48 h-80 w-80 rounded-full bg-sky-200/50 blur-3xl"></div>
		<div class="absolute -left-24 top-96 h-80 w-80 rounded-full bg-amber-200/40 blur-3xl"></div>
	</div>

	<div class="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-6 sm:px-6 lg:px-8">
		<div
			class="grid w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl lg:grid-cols-[1.08fr_0.92fr]"
		>
			<section
				class="order-2 flex flex-col border-t border-slate-200 bg-linear-to-br from-emerald-50 via-white to-sky-50 p-6 text-slate-900 lg:order-1 lg:border-t-0 lg:border-r lg:border-r-slate-200 lg:p-10"
			>
				<a href={resolve('/')} class="inline-flex w-fit items-center gap-3">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-white text-emerald-700 shadow-sm"
					>
						<svg
							class="h-6 w-6"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2.2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M13 3v7h7M11 21v-7H4m16-4L11 21 4 14l9-11 7 7Z"
							/>
						</svg>
					</div>

					<div>
						<p class="text-[11px] font-black uppercase tracking-widest text-emerald-700/80">
							EdTech Platform
						</p>
						<p class="text-2xl font-black tracking-tight text-slate-900">Class Insights</p>
					</div>
				</a>

				<div class="mt-10 max-w-xl">
					<p class="text-[11px] font-black uppercase tracking-widest text-emerald-700/80">
						Acesso inteligente
					</p>
					<h1
						class="mt-4 text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl"
					>
						Entre e continue de onde parou.
					</h1>
					<p class="mt-5 text-base leading-8 text-slate-600">
						O Class Insights identifica seu perfil e leva voce direto para a experiencia certa:
						professor, coordenacao ou aluno.
					</p>
				</div>

				<div class="mt-8 grid gap-3">
					{#each benefits as benefit (benefit.title)}
						<div
							class="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
						>
							<div
								class={`mt-1 flex h-10 w-10 items-center justify-center rounded-xl ${toneIconClasses(benefit.tone)}`}
							>
								{#if benefit.tone === 'sky'}
									<svg
										class="h-5 w-5"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										stroke-width="2"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M4 7h16M7 12h10M9 17h6"
										/>
									</svg>
								{:else if benefit.tone === 'emerald'}
									<svg
										class="h-5 w-5"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										stroke-width="2"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M3 12h6l3 8 4-16 3 8h2"
										/>
									</svg>
								{:else}
									<svg
										class="h-5 w-5"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										stroke-width="2"
									>
										<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m6-6H6" />
									</svg>
								{/if}
							</div>

							<div>
								<p class="text-sm font-black text-slate-900">{benefit.title}</p>
								<p class="mt-1 text-sm leading-6 text-slate-600">{benefit.text}</p>
							</div>
						</div>
					{/each}
				</div>

				<div class="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
					<div class="flex items-center justify-between gap-3">
						<div>
							<p class="text-[11px] font-black uppercase tracking-widest text-slate-500">
								Como o produto se organiza
							</p>
							<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
								Um sistema, tres leituras
							</h2>
						</div>

						<div
							class="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold text-slate-600 sm:block"
						>
							historico longitudinal
						</div>
					</div>

					<div class="mt-5 grid gap-4 md:grid-cols-3">
						{#each roleCards as card (card.title)}
							<div class={`rounded-2xl border p-4 ${toneCardClasses(card.tone)}`}>
								<p
									class={`text-[11px] font-black uppercase tracking-widest ${toneTextClasses(card.tone)}`}
								>
									{card.label}
								</p>

								<h3 class="mt-2 text-lg font-black text-slate-950">{card.title}</h3>
								<p class="mt-2 text-sm leading-6 text-slate-700">{card.text}</p>

								<div class="mt-4 space-y-2">
									{#each card.items as item (`${card.title}-${item}`)}
										<div
											class="rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-sm text-slate-800"
										>
											{item}
										</div>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</div>
			</section>

			<section class="order-1 flex items-center justify-center p-6 sm:p-8 lg:order-2 lg:p-10">
				<div class="w-full max-w-md">
					<div class="mb-8 flex items-center justify-between lg:hidden">
						<a href={resolve('/')} class="text-sm font-bold text-slate-600 hover:text-slate-900">
							Voltar para home
						</a>
					</div>

					<div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
						<div class="mb-6">
							<p class="text-[11px] font-black uppercase tracking-widest text-emerald-700/80">
								Acesso
							</p>
							<h2 class="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
								Bem-vindo de volta
							</h2>
							<p class="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
								Entre com seu e-mail para acessar sua area. O sistema direciona voce automaticamente
								para professor, coordenacao ou aluno.
							</p>
						</div>

						{#if sanitizeRedirect(redirectToParam)}
							<div
								class="mb-5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800"
							>
								Voce sera redirecionado para a pagina solicitada apos o login.
							</div>
						{/if}

						<form class="space-y-5" onsubmit={handleSubmit}>
							<div class="space-y-2">
								<label for="email" class="block text-sm font-bold text-slate-700">
									Usuario ou e-mail
								</label>

								<input
									id="email"
									name="email"
									type="email"
									bind:value={email}
									placeholder="voce@email.com"
									autocomplete="email"
									autocapitalize="off"
									autocorrect="off"
									class="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
									disabled={loading}
								/>
							</div>

							<div class="space-y-2">
								<div class="flex items-center justify-between gap-3">
									<label for="password" class="block text-sm font-bold text-slate-700">
										Senha
									</label>

									<a
										href={resolve('/forgot-password')}
										class="text-sm font-bold text-sky-700 hover:text-sky-800 hover:underline"
									>
										Esqueceu a senha?
									</a>
								</div>

								<div class="relative">
									<input
										id="password"
										name="password"
										type={showPassword ? 'text' : 'password'}
										bind:value={password}
										placeholder="........"
										autocomplete="current-password"
										class="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-24 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
										disabled={loading}
									/>

									<button
										type="button"
										class="absolute right-2 top-2 inline-flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
										aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
										onclick={() => (showPassword = !showPassword)}
										disabled={loading}
									>
										{showPassword ? 'Ocultar' : 'Mostrar'}
									</button>
								</div>
							</div>

							<button
								type="submit"
								disabled={loading}
								class="inline-flex h-14 w-full items-center justify-center rounded-2xl bg-slate-900 text-base font-black text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
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

						<div class="my-6 flex items-center gap-3 text-sm font-bold text-slate-400">
							<div class="h-px flex-1 bg-slate-200"></div>
							<span>Primeiro acesso?</span>
							<div class="h-px flex-1 bg-slate-200"></div>
						</div>

						<div class="space-y-3">
							<a
								href={resolve('/register/teacher')}
								class="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white"
							>
								<p class="text-sm font-black text-slate-900">Cadastro de professor</p>
								<p class="mt-1 text-sm leading-6 text-slate-600">
									Criar acesso para turmas, avaliacoes e acompanhamento pedagogico.
								</p>
							</a>

							<a
								href={resolve('/register/student')}
								class="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white"
							>
								<p class="text-sm font-black text-slate-900">Cadastro de aluno</p>
								<p class="mt-1 text-sm leading-6 text-slate-600">
									Entrar com ou sem vinculo inicial e acompanhar progresso e historico.
								</p>
							</a>
						</div>

						<p class="mt-6 text-center text-sm leading-6 text-slate-500">
							Seu perfil define automaticamente a area de destino apos o login.
						</p>
					</div>
				</div>
			</section>
		</div>
	</div>
</div>
