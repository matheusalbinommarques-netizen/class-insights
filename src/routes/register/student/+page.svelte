<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';

	import { supabase } from '$lib/services/supabaseClient';

	type ClaimStudentRpcRow = {
		student_id: string;
		class_id: string | null;
		teacher_id?: string | null;
		status?: string | null;
		student_name: string;
	};

	type BenefitTone = 'sky' | 'emerald' | 'amber';

	type Benefit = {
		title: string;
		text: string;
		tone: BenefitTone;
	};

	const MIN_PASSWORD_LENGTH = 6;
	const PENDING_STUDENT_INVITE_CODE_KEY = 'pendingStudentInviteCode';

	const benefits: Benefit[] = [
		{
			title: 'Conta primeiro',
			text: 'Voce pode criar sua conta agora, mesmo sem codigo de convite.',
			tone: 'sky'
		},
		{
			title: 'Vinculo depois',
			text: 'Quando o codigo chegar, o portal permite concluir o vinculo sem refazer cadastro.',
			tone: 'emerald'
		},
		{
			title: 'Leitura clara',
			text: 'Assim que o vinculo for concluido, sua area do aluno mostra progresso e historico.',
			tone: 'amber'
		}
	];

	let name = '';
	let email = '';
	let password = '';
	let confirmPassword = '';
	let inviteCode = '';

	let loading = false;
	let resending = false;
	let errorMessage = '';
	let successMessage = '';
	let showPassword = false;
	let showConfirmPassword = false;

	$: trimmedName = name.trim();
	$: trimmedEmail = email.trim().toLowerCase();
	$: normalizedInviteCode = normalizeInviteCode(inviteCode);
	$: passwordHasMinLength = password.length >= MIN_PASSWORD_LENGTH;
	$: passwordsMatch =
		password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

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
		} catch {
			// noop
		}
	}

	function clearPendingInviteCode() {
		try {
			localStorage.removeItem(PENDING_STUDENT_INVITE_CODE_KEY);
		} catch {
			// noop
		}
	}

	function extractErrorMessage(error: unknown) {
		if (error instanceof Error) return error.message;

		if (typeof error === 'object' && error !== null) {
			const maybeMessage = 'message' in error ? error.message : null;
			if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
				return maybeMessage;
			}
		}

		return 'Nao foi possivel concluir o cadastro do aluno.';
	}

	function validateForm() {
		if (!trimmedName) {
			errorMessage = 'Nome e obrigatorio.';
			return false;
		}

		if (!trimmedEmail) {
			errorMessage = 'E-mail e obrigatorio.';
			return false;
		}

		if (!password) {
			errorMessage = 'Senha e obrigatoria.';
			return false;
		}

		if (!passwordHasMinLength) {
			errorMessage = `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
			return false;
		}

		if (!confirmPassword) {
			errorMessage = 'Confirme sua senha.';
			return false;
		}

		if (password !== confirmPassword) {
			errorMessage = 'A confirmacao de senha nao confere.';
			return false;
		}

		return true;
	}

	async function tryCreateStudentProfile(userId: string, displayName: string) {
		const { error } = await supabase.from('profiles').upsert(
			{
				id: userId,
				role: 'student',
				display_name: displayName
			},
			{
				onConflict: 'id'
			}
		);

		if (error) {
			throw error;
		}
	}

	async function tryCompleteStudentLink(inviteCodeValue: string): Promise<boolean> {
		const { data, error } = await supabase.rpc('claim_student_by_invite_code', {
			p_invite_code: inviteCodeValue
		});

		if (error) {
			throw error;
		}

		const rows = (data ?? []) as ClaimStudentRpcRow[];

		if (rows.length > 0) {
			clearPendingInviteCode();
			return true;
		}

		return false;
	}

	async function handleRegister() {
		resetMessages();

		if (!validateForm()) return;

		loading = true;

		try {
			if (normalizedInviteCode) {
				savePendingInviteCode(normalizedInviteCode);
			} else {
				clearPendingInviteCode();
			}

			const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
				email: trimmedEmail,
				password,
				options: {
					data: {
						role: 'student',
						display_name: trimmedName,
						name: trimmedName
					}
				}
			});

			if (signUpError) {
				throw new Error(signUpError.message);
			}

			const user = signUpData.user;
			const session = signUpData.session;

			if (!user) {
				throw new Error('Nao foi possivel criar a conta.');
			}

			if (session) {
				await tryCreateStudentProfile(user.id, trimmedName);

				const linked = normalizedInviteCode
					? await tryCompleteStudentLink(normalizedInviteCode)
					: false;

				await invalidateAll();

				if (linked || !normalizedInviteCode) {
					await goto(resolve('/student'));
					return;
				}

				successMessage =
					'Conta criada, mas o vinculo ainda nao foi concluido. Faca login novamente ou confira o codigo informado.';
				return;
			}

			successMessage = normalizedInviteCode
				? 'Conta criada. Verifique seu e-mail e depois faca login para concluir o vinculo do aluno.'
				: 'Conta criada. Verifique seu e-mail e depois faca login para acessar o portal e adicionar um codigo quando quiser.';
		} catch (error) {
			errorMessage = extractErrorMessage(error);
		} finally {
			loading = false;
		}
	}

	async function handleResendVerification() {
		resetMessages();

		if (!trimmedEmail) {
			errorMessage = 'Digite o e-mail para reenviar a verificacao.';
			return;
		}

		resending = true;

		try {
			const emailRedirectTo =
				typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined;

			const { error } = await supabase.auth.resend({
				type: 'signup',
				email: trimmedEmail,
				options: emailRedirectTo ? { emailRedirectTo } : undefined
			});

			if (error) {
				throw new Error(error.message);
			}

			successMessage =
				'Se existir um cadastro pendente para esse e-mail, enviamos um novo link de verificacao.';
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'Nao foi possivel reenviar a verificacao.';
		} finally {
			resending = false;
		}
	}

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		void handleRegister();
	}

	function toneClasses(tone: BenefitTone) {
		if (tone === 'sky') return 'border-sky-200 bg-sky-50 text-sky-900';
		if (tone === 'emerald') return 'border-emerald-200 bg-emerald-50 text-emerald-900';
		return 'border-amber-200 bg-amber-50 text-amber-900';
	}
</script>

<svelte:head>
	<title>Cadastro de aluno - Class Insights</title>
	<meta
		name="description"
		content="Crie sua conta de aluno no Class Insights e conclua o vinculo com codigo agora ou depois."
	/>
</svelte:head>

<div class="min-h-screen bg-slate-50 text-slate-900">
	<div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
		<div
			class="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-200/50 blur-3xl"
		></div>
		<div class="absolute -right-24 top-40 h-72 w-72 rounded-full bg-sky-200/50 blur-3xl"></div>
		<div class="absolute -left-24 top-96 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl"></div>
	</div>

	<div class="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-6 sm:px-6 lg:px-8">
		<div
			class="grid w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl lg:grid-cols-[1.05fr_0.95fr]"
		>
			<section
				class="order-2 flex flex-col border-t border-slate-200 bg-linear-to-br from-amber-50 via-white to-emerald-50 p-6 lg:order-1 lg:border-t-0 lg:border-r lg:p-10"
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
						<p class="text-xs font-black uppercase tracking-widest text-emerald-700/80">
							EdTech Platform
						</p>
						<p class="text-2xl font-black tracking-tight text-slate-900">Class Insights</p>
					</div>
				</a>

				<div class="mt-10 max-w-xl">
					<p class="text-xs font-black uppercase tracking-widest text-emerald-700/80">
						Cadastro de aluno
					</p>
					<h1
						class="mt-4 text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl"
					>
						Crie sua conta agora e conclua o vinculo quando precisar.
					</h1>
					<p class="mt-5 text-base leading-8 text-slate-600">
						O novo onboarding nao exige codigo no primeiro passo. Se voce ja tiver o convite do
						professor, podemos tentar concluir o vinculo agora. Se ainda nao tiver, o portal fica
						pronto para receber esse codigo depois.
					</p>
				</div>

				<div class="mt-8 grid gap-3">
					{#each benefits as benefit (benefit.title)}
						<div class={`rounded-2xl border p-4 shadow-sm ${toneClasses(benefit.tone)}`}>
							<p class="text-sm font-black">{benefit.title}</p>
							<p class="mt-1 text-sm leading-6 text-slate-700">{benefit.text}</p>
						</div>
					{/each}
				</div>

				<div class="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
					<p class="text-xs font-black uppercase tracking-widest text-slate-500">Fluxo</p>
					<div class="mt-4 grid gap-4 md:grid-cols-3">
						<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
							<p class="text-xs font-black uppercase tracking-widest text-sky-700">
								1. Crie a conta
							</p>
							<p class="mt-2 text-lg font-black text-slate-950">Nome, e-mail e senha</p>
							<p class="mt-2 text-sm leading-6 text-slate-600">
								O acesso do aluno nasce separado do vinculo academico.
							</p>
						</div>
						<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
							<p class="text-xs font-black uppercase tracking-widest text-emerald-700">
								2. Informe o codigo
							</p>
							<p class="mt-2 text-lg font-black text-slate-950">Agora ou depois</p>
							<p class="mt-2 text-sm leading-6 text-slate-600">
								Se o convite ja existir, o sistema tenta concluir o claim logo apos o cadastro.
							</p>
						</div>
						<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
							<p class="text-xs font-black uppercase tracking-widest text-amber-700">3. Acesse</p>
							<p class="mt-2 text-lg font-black text-slate-950">Portal do aluno</p>
							<p class="mt-2 text-sm leading-6 text-slate-600">
								Com ou sem vinculo pronto, voce entra no portal e ve o estado correto.
							</p>
						</div>
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
							<p class="text-xs font-black uppercase tracking-widest text-emerald-700/80">
								Cadastro
							</p>
							<h2 class="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
								Criar conta de aluno
							</h2>
							<p class="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
								O codigo de convite agora e opcional. Se voce ainda nao recebeu o codigo, pode
								seguir com o cadastro e concluir o vinculo depois.
							</p>
						</div>

						<form class="space-y-5" onsubmit={handleSubmit}>
							<div class="space-y-2">
								<label for="name" class="block text-sm font-bold text-slate-700">Nome</label>
								<input
									id="name"
									name="name"
									type="text"
									bind:value={name}
									placeholder="Seu nome"
									autocomplete="name"
									class="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
									disabled={loading}
								/>
							</div>

							<div class="space-y-2">
								<label for="email" class="block text-sm font-bold text-slate-700">E-mail</label>
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
								<label for="password" class="block text-sm font-bold text-slate-700">Senha</label>
								<div class="relative">
									<input
										id="password"
										name="password"
										type={showPassword ? 'text' : 'password'}
										bind:value={password}
										placeholder="........"
										autocomplete="new-password"
										class="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-24 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
										disabled={loading}
									/>
									<button
										type="button"
										class="absolute right-2 top-2 inline-flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
										onclick={() => (showPassword = !showPassword)}
										disabled={loading}
										aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
									>
										{showPassword ? 'Ocultar' : 'Mostrar'}
									</button>
								</div>
							</div>

							<div class="space-y-2">
								<label for="confirmPassword" class="block text-sm font-bold text-slate-700">
									Confirmar senha
								</label>
								<div class="relative">
									<input
										id="confirmPassword"
										name="confirmPassword"
										type={showConfirmPassword ? 'text' : 'password'}
										bind:value={confirmPassword}
										placeholder="........"
										autocomplete="new-password"
										class="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-24 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
										disabled={loading}
									/>
									<button
										type="button"
										class="absolute right-2 top-2 inline-flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
										onclick={() => (showConfirmPassword = !showConfirmPassword)}
										disabled={loading}
										aria-label={showConfirmPassword
											? 'Ocultar confirmacao de senha'
											: 'Mostrar confirmacao de senha'}
									>
										{showConfirmPassword ? 'Ocultar' : 'Mostrar'}
									</button>
								</div>
							</div>

							<div class="space-y-2">
								<label for="inviteCode" class="block text-sm font-bold text-slate-700">
									Codigo de convite <span class="font-medium text-slate-400">(opcional)</span>
								</label>
								<input
									id="inviteCode"
									name="inviteCode"
									type="text"
									bind:value={inviteCode}
									placeholder="Ex: 7B60B044657F"
									autocapitalize="characters"
									autocorrect="off"
									spellcheck="false"
									class="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base uppercase tracking-wider text-slate-900 outline-none transition placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
									disabled={loading}
								/>
								<p class="text-sm leading-6 text-slate-500">
									Se voce ja tiver um codigo, use exatamente o que foi enviado. Se nao tiver, deixe
									em branco e conclua depois no portal.
								</p>
							</div>

							<div class="flex flex-wrap gap-2">
								<div
									class={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
										password.length === 0
											? 'border-slate-200 bg-slate-50 text-slate-500'
											: passwordHasMinLength
												? 'border-emerald-200 bg-emerald-50 text-emerald-700'
												: 'border-amber-200 bg-amber-50 text-amber-700'
									}`}
								>
									Minimo de {MIN_PASSWORD_LENGTH} caracteres
								</div>

								<div
									class={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
										confirmPassword.length === 0
											? 'border-slate-200 bg-slate-50 text-slate-500'
											: passwordsMatch
												? 'border-emerald-200 bg-emerald-50 text-emerald-700'
												: 'border-amber-200 bg-amber-50 text-amber-700'
									}`}
								>
									Senhas conferem
								</div>

								<div
									class={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
										normalizedInviteCode.length === 0
											? 'border-slate-200 bg-slate-50 text-slate-500'
											: 'border-sky-200 bg-sky-50 text-sky-700'
									}`}
								>
									{normalizedInviteCode.length === 0
										? 'Codigo pode ser adicionado depois'
										: 'Codigo pronto para claim'}
								</div>
							</div>

							<button
								type="submit"
								disabled={loading}
								class="inline-flex h-14 w-full items-center justify-center rounded-2xl bg-slate-900 text-base font-black text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
							>
								{#if loading}
									Criando conta...
								{:else}
									Criar conta
								{/if}
							</button>
						</form>

						{#if errorMessage}
							<div
								class="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
							>
								{errorMessage}
							</div>
						{/if}

						{#if successMessage}
							<div
								class="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"
							>
								{successMessage}
							</div>
						{/if}

						<div class="my-6 flex items-center gap-3 text-sm font-bold text-slate-400">
							<div class="h-px flex-1 bg-slate-200"></div>
							<span>Precisa confirmar e-mail?</span>
							<div class="h-px flex-1 bg-slate-200"></div>
						</div>

						<div class="grid gap-3 sm:grid-cols-2">
							<button
								type="button"
								class="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
								onclick={handleResendVerification}
								disabled={resending}
							>
								{resending ? 'Reenviando...' : 'Reenviar verificacao'}
							</button>

							<a
								href={resolve('/login')}
								class="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-white"
							>
								Fazer login
							</a>
						</div>

						<p class="mt-6 text-center text-sm leading-6 text-slate-500">
							Depois do cadastro, o portal do aluno mostra se o acesso ja esta pronto ou se ainda
							falta concluir o vinculo academico.
						</p>
					</div>
				</div>
			</section>
		</div>
	</div>
</div>
