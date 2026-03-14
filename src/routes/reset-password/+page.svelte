<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { supabase } from '$lib/services/supabaseClient';

	const MIN_PASSWORD_LENGTH = 6;

	let password = '';
	let confirmPassword = '';
	let loading = false;
	let ready = false;
	let recoveryReady = false;
	let errorMessage = '';
	let successMessage = '';
	let showPassword = false;
	let showConfirmPassword = false;

	$: passwordHasMinLength = password.length >= MIN_PASSWORD_LENGTH;
	$: passwordsMatch =
		password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

	onMount(() => {
		let cancelled = false;

		async function initializeRecovery() {
			const {
				data: { session }
			} = await supabase.auth.getSession();

			if (cancelled) return;

			recoveryReady = Boolean(session);
			ready = true;
		}

		void initializeRecovery();

		const { data } = supabase.auth.onAuthStateChange((event, session) => {
			if (cancelled) return;

			if (event === 'PASSWORD_RECOVERY' || session) {
				recoveryReady = true;
				ready = true;
			}
		});

		return () => {
			cancelled = true;
			data.subscription.unsubscribe();
		};
	});

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';
		successMessage = '';

		if (!password) {
			errorMessage = 'Nova senha é obrigatória.';
			return;
		}

		if (!passwordHasMinLength) {
			errorMessage = `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
			return;
		}

		if (!confirmPassword) {
			errorMessage = 'Confirme a nova senha.';
			return;
		}

		if (!passwordsMatch) {
			errorMessage = 'A confirmação de senha não confere.';
			return;
		}

		if (!recoveryReady) {
			errorMessage = 'O link de recuperação não está ativo. Solicite um novo e-mail.';
			return;
		}

		loading = true;

		try {
			const { error } = await supabase.auth.updateUser({ password });

			if (error) {
				throw new Error(error.message);
			}

			successMessage = 'Senha redefinida com sucesso. Você já pode entrar novamente.';
			await supabase.auth.signOut();
			setTimeout(() => {
				void goto(resolve('/login'));
			}, 1200);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Não foi possível redefinir a senha.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Nova Senha • Class Insights</title>
	<meta
		name="description"
		content="Defina uma nova senha para continuar acessando o Class Insights."
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

	<div class="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-6 sm:px-6 lg:px-8">
		<div class="w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
			<div class="grid lg:grid-cols-[1fr_0.92fr]">
				<section
					class="border-b border-slate-200 bg-linear-to-br from-emerald-50 via-white to-sky-50 p-6 lg:border-b-0 lg:border-r lg:p-10"
				>
					<p class="text-[11px] font-black uppercase tracking-widest text-emerald-700/80">
						Atualização segura
					</p>
					<h1
						class="mt-4 text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl"
					>
						Defina uma nova senha e volte ao fluxo normal.
					</h1>
					<p class="mt-5 max-w-xl text-base leading-8 text-slate-600">
						Use uma senha nova, conclua a recuperação e depois entre novamente pela tela de login.
					</p>

					<div class="mt-8 grid gap-3">
						<div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
							<p class="text-sm font-black text-slate-900">Sessão temporária de recuperação</p>
							<p class="mt-1 text-sm leading-6 text-slate-600">
								O link por e-mail ativa a sessão necessária para você trocar a senha com segurança.
							</p>
						</div>

						<div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
							<p class="text-sm font-black text-slate-900">Senha nova, acesso normal</p>
							<p class="mt-1 text-sm leading-6 text-slate-600">
								Depois da troca, você volta ao login e entra normalmente com a nova credencial.
							</p>
						</div>
					</div>
				</section>

				<section class="flex items-center justify-center p-6 sm:p-8 lg:p-10">
					<div class="w-full max-w-md">
						<div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
							<div class="mb-6">
								<p class="text-[11px] font-black uppercase tracking-widest text-emerald-700/80">
									Nova senha
								</p>
								<h2 class="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
									Redefinir acesso
								</h2>
							</div>

							{#if !ready}
								<div
									class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-700"
								>
									Validando o link de recuperação...
								</div>
							{:else}
								<form class="space-y-5" onsubmit={handleSubmit}>
									<div class="space-y-2">
										<label for="password" class="block text-sm font-bold text-slate-700"
											>Nova senha</label
										>
										<div class="relative">
											<input
												id="password"
												name="password"
												type={showPassword ? 'text' : 'password'}
												bind:value={password}
												placeholder="••••••••"
												autocomplete="new-password"
												class="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-24 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
												disabled={loading || !recoveryReady}
											/>
											<button
												type="button"
												class="absolute right-2 top-2 inline-flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
												aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
												onclick={() => (showPassword = !showPassword)}
												disabled={loading || !recoveryReady}
											>
												{showPassword ? 'Ocultar' : 'Mostrar'}
											</button>
										</div>
									</div>

									<div class="space-y-2">
										<label for="confirmPassword" class="block text-sm font-bold text-slate-700"
											>Confirmar senha</label
										>
										<div class="relative">
											<input
												id="confirmPassword"
												name="confirmPassword"
												type={showConfirmPassword ? 'text' : 'password'}
												bind:value={confirmPassword}
												placeholder="••••••••"
												autocomplete="new-password"
												class="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-24 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
												disabled={loading || !recoveryReady}
											/>
											<button
												type="button"
												class="absolute right-2 top-2 inline-flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
												aria-label={showConfirmPassword
													? 'Ocultar confirmação de senha'
													: 'Mostrar confirmação de senha'}
												onclick={() => (showConfirmPassword = !showConfirmPassword)}
												disabled={loading || !recoveryReady}
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
										disabled={loading || !recoveryReady}
										class="inline-flex h-14 w-full items-center justify-center rounded-2xl bg-slate-900 text-base font-black text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
									>
										{loading ? 'Salvando nova senha...' : 'Salvar nova senha'}
									</button>
								</form>
							{/if}

							{#if !recoveryReady && ready}
								<div
									class="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800"
								>
									O link de recuperação não está ativo ou expirou. Solicite um novo e-mail para
									continuar.
								</div>
							{/if}

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
								<span>Precisa recomeçar?</span>
								<div class="h-px flex-1 bg-slate-200"></div>
							</div>

							<a
								href={resolve('/forgot-password')}
								class="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-white"
							>
								Solicitar novo link
							</a>
						</div>
					</div>
				</section>
			</div>
		</div>
	</div>
</div>
