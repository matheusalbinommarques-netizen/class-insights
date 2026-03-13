<script lang="ts">
	import { supabase } from '$lib/services/supabaseClient';
	import { goto, invalidateAll } from '$app/navigation';

	type ClaimStudentRpcRow = {
		student_id: string;
		class_id: string | null;
		student_name: string;
	};

	type Tone = 'sky' | 'emerald' | 'amber';

	type Benefit = {
		title: string;
		text: string;
		tone: Tone;
	};

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

	const MIN_PASSWORD_LENGTH = 6;
	const PENDING_STUDENT_INVITE_CODE_KEY = 'pendingStudentInviteCode';

	const benefits: Benefit[] = [
		{
			title: 'Conta vinculada ao aluno certo',
			text: 'O código de convite conecta seu acesso ao registro acadêmico correto.',
			tone: 'sky'
		},
		{
			title: 'Progresso mais claro',
			text: 'Você acompanha histórico, matérias de atenção e evolução recente.',
			tone: 'emerald'
		},
		{
			title: 'Leitura simples',
			text: 'Menos dependência de revisão manual e mais clareza sobre seu desempenho.',
			tone: 'amber'
		}
	];

	$: trimmedName = name.trim();
	$: trimmedEmail = email.trim().toLowerCase();
	$: normalizedInviteCode = normalizeInviteCode(inviteCode);
	$: passwordHasMinLength = password.length >= MIN_PASSWORD_LENGTH;
	$: passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

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

		return 'Não foi possível concluir o vínculo do aluno.';
	}

	function toneIconClasses(tone: Tone) {
		if (tone === 'sky') return 'bg-sky-100 text-sky-700';
		if (tone === 'emerald') return 'bg-emerald-100 text-emerald-700';
		return 'bg-amber-100 text-amber-700';
	}

	function validateForm() {
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

		if (!passwordHasMinLength) {
			errorMessage = `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
			return false;
		}

		if (!confirmPassword) {
			errorMessage = 'Confirme sua senha.';
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
				throw new Error(signUpError.message);
			}

			const user = signUpData.user;
			const session = signUpData.session;

			if (!user) {
				throw new Error('Não foi possível criar a conta.');
			}

			if (session) {
				await tryCreateStudentProfile(user.id, trimmedName);

				const linked = await tryCompleteStudentLink(normalizedInviteCode);

				await invalidateAll();

				if (linked) {
					await goto('/student');
					return;
				}

				successMessage =
					'Conta criada, mas não foi possível concluir o vínculo com o aluno agora. Faça login novamente ou confira o código de convite.';
				return;
			}

			successMessage =
				'Conta criada. Verifique seu e-mail e depois faça login para concluir o vínculo do aluno.';
		} catch (error) {
			errorMessage = extractErrorMessage(error);
		} finally {
			loading = false;
		}
	}

	async function handleResendVerification() {
		resetMessages();

		if (!trimmedEmail) {
			errorMessage = 'Digite o e-mail para reenviar a verificação.';
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
				'Se existir um cadastro pendente para esse e-mail, enviamos um novo link de verificação.';
		} catch (error) {
			errorMessage =
				error instanceof Error
					? error.message
					: 'Não foi possível reenviar a verificação.';
		} finally {
			resending = false;
		}
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		await handleRegister();
	}
</script>

<svelte:head>
	<title>Cadastro de Aluno • Class Insights</title>
	<meta
		name="description"
		content="Crie sua conta de aluno no Class Insights usando o código de convite enviado pelo professor."
	/>
</svelte:head>

<div class="min-h-screen bg-slate-50 text-slate-900">
	<div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
		<div class="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-200/50 blur-3xl"></div>
		<div class="absolute -right-24 top-40 h-72 w-72 rounded-full bg-sky-200/50 blur-3xl"></div>
		<div class="absolute -left-24 top-96 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl"></div>
	</div>

	<div class="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-6 sm:px-6 lg:px-8">
		<div class="grid w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl lg:grid-cols-[1.08fr_0.92fr]">
			<section class="order-2 flex flex-col border-t border-slate-200 bg-linear-to-br from-amber-50 via-white to-emerald-50 p-6 text-slate-900 lg:order-1 lg:border-t-0 lg:border-r lg:border-r-slate-200 lg:p-10">
				<a href="/" class="inline-flex w-fit items-center gap-3">
					<div class="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-white text-emerald-700 shadow-sm">
						<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M13 3v7h7M11 21v-7H4m16-4L11 21 4 14l9-11 7 7Z" />
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

					<h1 class="mt-4 text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">
						Crie sua conta e acompanhe seu progresso com mais clareza.
					</h1>

					<p class="mt-5 text-base leading-8 text-slate-600">
						Use o código de convite enviado pelo professor para vincular sua conta ao registro
						acadêmico correto e acessar sua jornada de aprendizagem.
					</p>
				</div>

				<div class="mt-8 grid gap-3">
					{#each benefits as benefit}
						<div class="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
							<div class={`mt-1 flex h-10 w-10 items-center justify-center rounded-xl ${toneIconClasses(benefit.tone)}`}>
								{#if benefit.tone === 'sky'}
									<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M7 8h10M7 12h7m-7 4h10" />
									</svg>
								{:else if benefit.tone === 'emerald'}
									<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M3 12h6l3 8 4-16 3 8h2" />
									</svg>
								{:else}
									<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
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
							<p class="text-xs font-black uppercase tracking-widest text-slate-500">
								Como funciona
							</p>
							<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
								Vínculo em 3 passos
							</h2>
						</div>

						<div class="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 sm:block">
							Aluno + código
						</div>
					</div>

					<div class="mt-5 grid gap-4 md:grid-cols-3">
						<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
							<p class="text-xs font-black uppercase tracking-widest text-sky-700">1. Receba</p>
							<p class="mt-2 text-lg font-black text-slate-950">Código de convite</p>
							<p class="mt-2 text-sm leading-6 text-slate-600">
								O professor ou a escola fornece o código que identifica seu vínculo.
							</p>
						</div>

						<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
							<p class="text-xs font-black uppercase tracking-widest text-emerald-700">2. Cadastre</p>
							<p class="mt-2 text-lg font-black text-slate-950">Sua conta</p>
							<p class="mt-2 text-sm leading-6 text-slate-600">
								Você cria seu acesso com nome, e-mail, senha e o código da turma.
							</p>
						</div>

						<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
							<p class="text-xs font-black uppercase tracking-widest text-amber-700">3. Acompanhe</p>
							<p class="mt-2 text-lg font-black text-slate-950">Seu progresso</p>
							<p class="mt-2 text-sm leading-6 text-slate-600">
								O sistema conecta sua conta ao registro correto e libera a área do aluno.
							</p>
						</div>
					</div>

					<div class="mt-5 flex flex-wrap gap-3 text-sm text-slate-600">
						<div class="rounded-full border border-slate-200 bg-white px-4 py-2">Skills</div>
						<div class="rounded-full border border-slate-200 bg-white px-4 py-2">Progresso visual</div>
						<div class="rounded-full border border-slate-200 bg-white px-4 py-2">Pontos fortes</div>
						<div class="rounded-full border border-slate-200 bg-white px-4 py-2">Pontos de atenção</div>
					</div>
				</div>
			</section>

			<section class="order-1 flex items-center justify-center p-6 sm:p-8 lg:order-2 lg:p-10">
				<div class="w-full max-w-md">
					<div class="mb-8 flex items-center justify-between lg:hidden">
						<a href="/" class="text-sm font-bold text-slate-600 hover:text-slate-900">
							← Voltar para home
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
								Use o código de convite enviado pelo professor para vincular sua conta ao
								registro acadêmico correto.
							</p>
						</div>

						<form class="space-y-5" onsubmit={handleSubmit}>
							<div class="space-y-2">
								<label for="name" class="block text-sm font-bold text-slate-700">
									Nome
								</label>

								<div class="relative">
									<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
										<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M15 19a4 4 0 0 0-8 0m8 0a4 4 0 0 1 4-4m-4 4H9m10-4a4 4 0 0 0-4-4m0 0a4 4 0 1 0-8 0m8 0H9" />
										</svg>
									</div>

									<input
										id="name"
										name="name"
										type="text"
										bind:value={name}
										placeholder="Seu nome"
										autocomplete="name"
										class="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
										disabled={loading}
									/>
								</div>
							</div>

							<div class="space-y-2">
								<label for="email" class="block text-sm font-bold text-slate-700">
									E-mail
								</label>

								<div class="relative">
									<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
										<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M16 12H8m8 0a4 4 0 1 1-8 0m8 0a4 4 0 1 0-8 0m8 0v1a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3v-1" />
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
								<label for="password" class="block text-sm font-bold text-slate-700">
									Senha
								</label>

								<div class="relative">
									<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
										<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 0h12a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-10 0v1H6a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2Z" />
										</svg>
									</div>

									<input
										id="password"
										name="password"
										type={showPassword ? 'text' : 'password'}
										bind:value={password}
										placeholder="••••••••"
										autocomplete="new-password"
										class="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-24 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
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
									<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
										<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 0h12a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-10 0v1H6a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2Z" />
										</svg>
									</div>

									<input
										id="confirmPassword"
										name="confirmPassword"
										type={showConfirmPassword ? 'text' : 'password'}
										bind:value={confirmPassword}
										placeholder="••••••••"
										autocomplete="new-password"
										class="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-24 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
										disabled={loading}
									/>

									<button
										type="button"
										class="absolute right-2 top-2 inline-flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
										onclick={() => (showConfirmPassword = !showConfirmPassword)}
										disabled={loading}
										aria-label={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
									>
										{showConfirmPassword ? 'Ocultar' : 'Mostrar'}
									</button>
								</div>
							</div>

							<div class="space-y-2">
								<label for="inviteCode" class="block text-sm font-bold text-slate-700">
									Código de convite
								</label>

								<div class="relative">
									<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
										<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-8 4h10m-8-8h10M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
										</svg>
									</div>

									<input
										id="inviteCode"
										name="inviteCode"
										type="text"
										bind:value={inviteCode}
										placeholder="Ex: 7B60B044657F"
										autocapitalize="characters"
										autocorrect="off"
										spellcheck="false"
										class="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-base uppercase tracking-wider text-slate-900 outline-none transition placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
										disabled={loading}
									/>
								</div>

								<p class="text-sm leading-6 text-slate-500">
									Use exatamente o código que foi enviado pelo professor ou pela escola.
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
									Mínimo de {MIN_PASSWORD_LENGTH} caracteres
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
									Código em maiúsculas
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
											<circle cx="12" cy="12" r="10" class="opacity-25" stroke="currentColor" stroke-width="4"></circle>
											<path class="opacity-75" fill="currentColor" d="M22 12a10 10 0 0 0-10-10v4a6 6 0 0 1 6 6h4Z"></path>
										</svg>
										Criando conta...
									</span>
								{:else}
									Criar conta
								{/if}
							</button>
						</form>

						{#if errorMessage}
							<div class="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
								{errorMessage}
							</div>
						{/if}

						{#if successMessage}
							<div class="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
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
								{resending ? 'Reenviando...' : 'Reenviar verificação'}
							</button>

							<a
								href="/login"
								class="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-white"
							>
								Fazer login
							</a>
						</div>

						<p class="mt-6 text-center text-sm leading-6 text-slate-500">
							Se o projeto exigir confirmação de e-mail, o vínculo final com o aluno será
							concluído no login usando o código salvo durante o cadastro.
						</p>
					</div>
				</div>
			</section>
		</div>
	</div>
</div>