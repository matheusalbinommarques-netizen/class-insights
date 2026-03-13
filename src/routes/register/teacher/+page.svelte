<script lang="ts">
	import { supabase } from '$lib/services/supabaseClient';
	import { goto, invalidateAll } from '$app/navigation';

	const MIN_PASSWORD_LENGTH = 6;

	let name = '';
	let email = '';
	let password = '';
	let confirmPassword = '';

	let loading = false;
	let errorMessage = '';
	let successMessage = '';
	let showPassword = false;
	let showConfirmPassword = false;

	$: trimmedName = name.trim();
	$: trimmedEmail = email.trim().toLowerCase();
	$: passwordHasMinLength = password.length >= MIN_PASSWORD_LENGTH;
	$: passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

	function resetMessages() {
		errorMessage = '';
		successMessage = '';
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

		return true;
	}

	async function handleRegister() {
		resetMessages();

		if (!validateForm()) return;

		loading = true;

		try {
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
				throw new Error(signUpError.message);
			}

			const user = signUpData.user;
			const session = signUpData.session;

			if (!user) {
				throw new Error('Não foi possível criar a conta.');
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
					throw new Error(profileError.message);
				}

				await invalidateAll();
				await goto('/teacher');
				return;
			}

			successMessage =
				'Conta criada. Confirme seu e-mail e depois faça login para continuar. O perfil será recuperado automaticamente no acesso.';
		} catch (error) {
			if (error instanceof Error) {
				errorMessage = error.message;
			} else {
				errorMessage = 'Não foi possível concluir o cadastro.';
			}
		} finally {
			loading = false;
		}
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		await handleRegister();
	}
</script>

<svelte:head>
	<title>Cadastro de Professor • Class Insights</title>
	<meta
		name="description"
		content="Crie sua conta de professor no Class Insights para acessar turmas, avaliações e leitura pedagógica."
	/>
</svelte:head>

<div class="min-h-screen bg-slate-50 text-slate-900">
	<div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
		<div class="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-200/50 blur-3xl"></div>
		<div class="absolute -right-24 top-40 h-72 w-72 rounded-full bg-sky-200/50 blur-3xl"></div>
		<div class="absolute -left-24 top-96 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl"></div>
	</div>

	<div class="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-6 sm:px-6 lg:px-8">
		<div class="grid w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl lg:grid-cols-2">
			<section class="order-2 flex flex-col border-t border-slate-200 bg-linear-to-br from-sky-50 via-white to-emerald-50 p-6 text-slate-900 lg:order-1 lg:border-t-0 lg:border-r lg:border-r-slate-200 lg:p-10">
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
						Cadastro de professor
					</p>

					<h1 class="mt-4 text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">
						Crie sua conta e comece a operar com mais clareza.
					</h1>

					<p class="mt-5 text-base leading-8 text-slate-600">
						Acesse o núcleo operacional do Class Insights para gerenciar turmas, avaliações,
						notas, importações e acompanhamento pedagógico com mais confiança.
					</p>
				</div>

				<div class="mt-8 grid gap-3">
					<div class="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
						<div class="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
							<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M7 12h10M9 17h6" />
							</svg>
						</div>

						<div>
							<p class="text-sm font-black text-slate-900">Fluxo operacional real</p>
							<p class="mt-1 text-sm leading-6 text-slate-600">
								Crie turmas, organize avaliações e publique resultados sem depender de planilhas soltas.
							</p>
						</div>
					</div>

					<div class="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
						<div class="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
							<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M3 12h6l3 8 4-16 3 8h2" />
							</svg>
						</div>

						<div>
							<p class="text-sm font-black text-slate-900">Leitura pedagógica acionável</p>
							<p class="mt-1 text-sm leading-6 text-slate-600">
								Transforme o dado operacional em visão clara sobre progresso, risco e prioridade.
							</p>
						</div>
					</div>

					<div class="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
						<div class="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
							<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m6-6H6" />
							</svg>
						</div>

						<div>
							<p class="text-sm font-black text-slate-900">Base pronta para crescer</p>
							<p class="mt-1 text-sm leading-6 text-slate-600">
								Importações, histórico longitudinal e experiência por perfil já entram no mesmo ecossistema.
							</p>
						</div>
					</div>
				</div>

				<div class="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
					<div class="flex items-center justify-between gap-3">
						<div>
							<p class="text-xs font-black uppercase tracking-widest text-slate-500">
								O que você acessa
							</p>
							<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
								Área do professor
							</h2>
						</div>

						<div class="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 sm:block">
							MVP funcional
						</div>
					</div>

					<div class="mt-5 grid gap-4 md:grid-cols-2">
						<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
							<p class="text-xs font-black uppercase tracking-widest text-sky-700">
								Operação
							</p>
							<p class="mt-2 text-lg font-black text-slate-950">Turmas, notas e importação</p>
							<p class="mt-2 text-sm leading-6 text-slate-600">
								Fluxo voltado para cadastro, avaliação, grid de notas e rotina docente.
							</p>
						</div>

						<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
							<p class="text-xs font-black uppercase tracking-widest text-emerald-700">
								Leitura
							</p>
							<p class="mt-2 text-lg font-black text-slate-950">Insights e evolução</p>
							<p class="mt-2 text-sm leading-6 text-slate-600">
								Base preparada para enxergar progresso, padrões e histórico longitudinal.
							</p>
						</div>
					</div>

					<div class="mt-5 flex flex-wrap gap-3 text-sm text-slate-600">
						<div class="rounded-full border border-slate-200 bg-white px-4 py-2">Turmas</div>
						<div class="rounded-full border border-slate-200 bg-white px-4 py-2">Avaliações</div>
						<div class="rounded-full border border-slate-200 bg-white px-4 py-2">Importação CSV</div>
						<div class="rounded-full border border-slate-200 bg-white px-4 py-2">Snapshots</div>
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
								Criar conta de professor
							</h2>
							<p class="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
								Use este cadastro para acessar o painel do professor no Class Insights.
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
							<span>Já tem conta?</span>
							<div class="h-px flex-1 bg-slate-200"></div>
						</div>

						<a
							href="/login"
							class="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-white"
						>
							Fazer login
						</a>

						<p class="mt-6 text-center text-sm leading-6 text-slate-500">
							No MVP, esta rota ainda está aberta para criação de contas de professor.
						</p>
					</div>
				</div>
			</section>
		</div>
	</div>
</div>