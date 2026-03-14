<script lang="ts">
	import { resolve } from '$app/paths';
	import { supabase } from '$lib/services/supabaseClient';

	let email = '';
	let loading = false;
	let errorMessage = '';
	let successMessage = '';

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';
		successMessage = '';

		const trimmedEmail = email.trim().toLowerCase();

		if (!trimmedEmail) {
			errorMessage = 'E-mail é obrigatório.';
			return;
		}

		loading = true;

		try {
			const redirectTo =
				typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;

			const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
				redirectTo
			});

			if (error) {
				throw new Error(error.message);
			}

			successMessage =
				'Se o e-mail existir, enviamos um link para redefinir a senha. Verifique sua caixa de entrada.';
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'Não foi possível enviar o link de recuperação.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Class Insights - Recuperar senha</title>
	<meta
		name="description"
		content="Solicite um link para redefinir sua senha de acesso no Class Insights."
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

	<div class="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-6 sm:px-6 lg:px-8">
		<div
			class="grid w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl lg:grid-cols-[1.02fr_0.98fr]"
		>
			<section
				class="order-2 border-t border-slate-200 bg-linear-to-br from-sky-50 via-white to-emerald-50 p-6 lg:order-1 lg:border-t-0 lg:border-r lg:p-10"
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
					<p class="text-[11px] font-black uppercase tracking-widest text-sky-700/80">
						Recuperação de acesso
					</p>
					<h1
						class="mt-4 text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl"
					>
						Redefina sua senha com segurança.
					</h1>
					<p class="mt-5 text-base leading-8 text-slate-600">
						Enviamos um link para o seu e-mail. A partir dele, você escolhe uma nova senha e volta
						ao fluxo normal de acesso.
					</p>
				</div>

				<div class="mt-8 grid gap-3">
					<div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
						<p class="text-sm font-black text-slate-900">1. Informe seu e-mail</p>
						<p class="mt-1 text-sm leading-6 text-slate-600">
							Use o mesmo endereço cadastrado como professor, coordenação ou aluno.
						</p>
					</div>

					<div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
						<p class="text-sm font-black text-slate-900">2. Abra o link enviado</p>
						<p class="mt-1 text-sm leading-6 text-slate-600">
							O link abre a tela de redefinição dentro do próprio Class Insights.
						</p>
					</div>

					<div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
						<p class="text-sm font-black text-slate-900">3. Escolha a nova senha</p>
						<p class="mt-1 text-sm leading-6 text-slate-600">
							Depois disso, você já pode entrar novamente pela tela de login.
						</p>
					</div>
				</div>
			</section>

			<section class="order-1 flex items-center justify-center p-6 sm:p-8 lg:order-2 lg:p-10">
				<div class="w-full max-w-md">
					<div class="mb-8 lg:hidden">
						<a
							href={resolve('/login')}
							class="text-sm font-bold text-slate-600 hover:text-slate-900"
						>
							← Voltar para login
						</a>
					</div>

					<div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
						<div class="mb-6">
							<p class="text-[11px] font-black uppercase tracking-widest text-emerald-700/80">
								Senha
							</p>
							<h2 class="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
								Esqueceu a senha?
							</h2>
							<p class="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
								Informe seu e-mail e enviaremos um link de recuperação.
							</p>
						</div>

						<form class="space-y-5" onsubmit={handleSubmit}>
							<div class="space-y-2">
								<label for="email" class="block text-sm font-bold text-slate-700">E-mail</label>
								<div class="relative">
									<div
										class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400"
									>
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
												d="M16 12H8m8 0a4 4 0 1 1-8 0m8 0a4 4 0 1 0-8 0m8 0v1a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3v-1"
											/>
										</svg>
									</div>
									<input
										id="email"
										name="email"
										type="email"
										bind:value={email}
										placeholder="voce@email.com"
										autocomplete="email"
										class="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
										disabled={loading}
									/>
								</div>
							</div>

							<button
								type="submit"
								disabled={loading}
								class="inline-flex h-14 w-full items-center justify-center rounded-2xl bg-slate-900 text-base font-black text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
							>
								{loading ? 'Enviando link...' : 'Enviar link de recuperação'}
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
							<span>Lembrou a senha?</span>
							<div class="h-px flex-1 bg-slate-200"></div>
						</div>

						<a
							href={resolve('/login')}
							class="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-white"
						>
							Voltar para login
						</a>
					</div>
				</div>
			</section>
		</div>
	</div>
</div>
