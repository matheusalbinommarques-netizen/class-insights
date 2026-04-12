<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';

	import ciIcon from '$lib/assets/ci-icon.png';
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
			errorMessage = 'O link de recuperação não está ativo. Solicite um novo link.';
			return;
		}

		loading = true;

		try {
			const { error } = await supabase.auth.updateUser({ password });

			if (error) {
				throw new Error(error.message);
			}

			successMessage = 'Senha atualizada com sucesso. Redirecionando para o login...';

			setTimeout(async () => {
				await supabase.auth.signOut();
				await goto('/login');
			}, 1200);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Não foi possível redefinir a senha.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Class Insights - Redefinir senha</title>
	<meta
		name="description"
		content="Defina uma nova senha de acesso no Class Insights usando seu link de recuperação."
	/>
</svelte:head>

<div class="min-h-screen bg-slate-50 text-slate-900">
	<div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
		<div
			class="absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-sky-200/40 blur-3xl"
		></div>
		<div class="absolute -left-20 top-72 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl"></div>
		<div class="absolute -right-20 top-28 h-80 w-80 rounded-full bg-amber-200/30 blur-3xl"></div>
	</div>

	<div class="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-6 sm:px-6 lg:px-8">
		<div
			class="grid w-full overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-2xl lg:grid-cols-[1fr_1fr]"
		>
			<section class="bg-slate-950 px-6 py-8 text-white sm:px-8 lg:px-10">
				<div class="flex items-center gap-4">
					<div
						class="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-lg shadow-black/20"
					>
						<img src={ciIcon} alt="" class="h-8 w-8 object-contain" />
					</div>

					<div>
						<p class="text-xs font-black uppercase tracking-[0.32em] text-sky-200">
							Class Insights
						</p>
						<h1 class="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Redefinir senha</h1>
					</div>
				</div>

				<p class="mt-6 max-w-xl text-base leading-8 text-slate-300">
					Defina uma nova senha para recuperar seu acesso ao produto.
				</p>

				<div class="mt-8 grid gap-4">
					<div class="rounded-3xl border border-white/10 bg-white/5 p-5">
						<p class="text-sm font-black text-white">Link ativo</p>
						<p class="mt-2 text-sm leading-7 text-slate-300">
							Abra esta página a partir do link enviado para o seu e-mail.
						</p>
					</div>

					<div class="rounded-3xl border border-white/10 bg-white/5 p-5">
						<p class="text-sm font-black text-white">Nova senha</p>
						<p class="mt-2 text-sm leading-7 text-slate-300">
							Crie uma senha nova com pelo menos 6 caracteres.
						</p>
					</div>

					<div class="rounded-3xl border border-white/10 bg-white/5 p-5">
						<p class="text-sm font-black text-white">Acesso recuperado</p>
						<p class="mt-2 text-sm leading-7 text-slate-300">
							Depois disso, você volta ao login e entra normalmente.
						</p>
					</div>
				</div>
			</section>

			<section class="px-6 py-8 sm:px-8 lg:px-10">
				<div class="mx-auto w-full max-w-xl">
					<p class="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Recuperação</p>
					<h2 class="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
						Criar nova senha
					</h2>
					<p class="mt-4 text-base leading-8 text-slate-600">
						Defina abaixo sua nova senha de acesso.
					</p>

					{#if !ready}
						<div
							class="mt-8 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-600"
						>
							Verificando seu link de recuperação...
						</div>
					{:else}
						<form class="mt-8 grid gap-5" onsubmit={handleSubmit}>
							<div>
								<label for="password" class="block text-sm font-black text-slate-900">
									Nova senha
								</label>
								<div class="mt-2 flex overflow-hidden rounded-2xl border border-slate-300 bg-white">
									<input
										id="password"
										type={showPassword ? 'text' : 'password'}
										bind:value={password}
										placeholder="Digite sua nova senha"
										autocomplete="new-password"
										class="h-14 min-w-0 flex-1 px-4 text-base text-slate-900 outline-none placeholder:text-slate-400"
									/>
									<button
										type="button"
										class="border-l border-slate-200 px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
										onclick={() => (showPassword = !showPassword)}
									>
										{showPassword ? 'Ocultar' : 'Mostrar'}
									</button>
								</div>
							</div>

							<div>
								<label for="confirmPassword" class="block text-sm font-black text-slate-900">
									Confirmar nova senha
								</label>
								<div class="mt-2 flex overflow-hidden rounded-2xl border border-slate-300 bg-white">
									<input
										id="confirmPassword"
										type={showConfirmPassword ? 'text' : 'password'}
										bind:value={confirmPassword}
										placeholder="Repita sua nova senha"
										autocomplete="new-password"
										class="h-14 min-w-0 flex-1 px-4 text-base text-slate-900 outline-none placeholder:text-slate-400"
									/>
									<button
										type="button"
										class="border-l border-slate-200 px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
										onclick={() => (showConfirmPassword = !showConfirmPassword)}
									>
										{showConfirmPassword ? 'Ocultar' : 'Mostrar'}
									</button>
								</div>
							</div>

							<button
								type="submit"
								disabled={loading || !recoveryReady}
								class="inline-flex h-14 items-center justify-center rounded-2xl bg-slate-900 text-base font-black text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
							>
								{loading ? 'Atualizando senha...' : 'Salvar nova senha'}
							</button>
						</form>
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

					{#if ready && !recoveryReady}
						<div class="mt-8 grid gap-3 sm:grid-cols-2">
							<a
								href={resolve('/forgot-password')}
								class="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-white"
							>
								Solicitar novo link
							</a>

							<a
								href={resolve('/login')}
								class="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-white"
							>
								Voltar para login
							</a>
						</div>
					{/if}
				</div>
			</section>
		</div>
	</div>
</div>
