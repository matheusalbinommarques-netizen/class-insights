<script lang="ts">
	import { resolve } from '$app/paths';

	import ciIcon from '$lib/assets/ci-icon.png';
	import { supabase } from '$lib/services/supabaseClient';

	let email = '';
	let loading = false;
	let errorMessage = '';
	let successMessage = '';

	function getRedirectTo() {
		if (typeof window === 'undefined') return undefined;
		return `${window.location.origin}/reset-password`;
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';
		successMessage = '';

		const trimmedEmail = email.trim().toLowerCase();

		if (!trimmedEmail) {
			errorMessage = 'Informe seu e-mail.';
			return;
		}

		loading = true;

		try {
			const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
				redirectTo: getRedirectTo()
			});

			if (error) {
				throw new Error(error.message);
			}

			successMessage =
				'Se o e-mail existir, enviamos um link para redefinir sua senha. Verifique sua caixa de entrada.';
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'Não foi possível enviar o link agora.';
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
			class="absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-200/40 blur-3xl"
		></div>
		<div class="absolute -right-20 top-32 h-80 w-80 rounded-full bg-sky-200/35 blur-3xl"></div>
		<div class="absolute -left-20 top-96 h-72 w-72 rounded-full bg-amber-200/30 blur-3xl"></div>
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
						<p class="text-xs font-black uppercase tracking-[0.32em] text-emerald-200">
							Class Insights
						</p>
						<h1 class="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Recuperar senha</h1>
					</div>
				</div>

				<p class="mt-6 max-w-xl text-base leading-8 text-slate-300">
					Se você perdeu o acesso, enviaremos um link para redefinir sua senha com segurança.
				</p>

				<div class="mt-8 grid gap-4">
					<div class="rounded-3xl border border-white/10 bg-white/5 p-5">
						<p class="text-sm font-black text-white">1. Informe seu e-mail</p>
						<p class="mt-2 text-sm leading-7 text-slate-300">
							Use o mesmo e-mail cadastrado no produto.
						</p>
					</div>

					<div class="rounded-3xl border border-white/10 bg-white/5 p-5">
						<p class="text-sm font-black text-white">2. Abra o link</p>
						<p class="mt-2 text-sm leading-7 text-slate-300">
							Verifique sua caixa de entrada e abra o link enviado.
						</p>
					</div>

					<div class="rounded-3xl border border-white/10 bg-white/5 p-5">
						<p class="text-sm font-black text-white">3. Defina a nova senha</p>
						<p class="mt-2 text-sm leading-7 text-slate-300">
							Você será levado para a tela de redefinição de senha.
						</p>
					</div>
				</div>
			</section>

			<section class="px-6 py-8 sm:px-8 lg:px-10">
				<div class="mx-auto w-full max-w-xl">
					<p class="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Acesso</p>
					<h2 class="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
						Solicitar link
					</h2>
					<p class="mt-4 text-base leading-8 text-slate-600">
						Informe seu e-mail para receber o link de recuperação.
					</p>

					<form class="mt-8 grid gap-5" on:submit={handleSubmit}>
						<div>
							<label for="email" class="block text-sm font-black text-slate-900">E-mail</label>
							<input
								id="email"
								type="email"
								bind:value={email}
								placeholder="voce@exemplo.com"
								autocomplete="email"
								class="mt-2 h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
							/>
						</div>

						<button
							type="submit"
							disabled={loading}
							class="inline-flex h-14 items-center justify-center rounded-2xl bg-slate-900 text-base font-black text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
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

					<div class="mt-8 grid gap-3 sm:grid-cols-2">
						<a
							href={resolve('/login')}
							class="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-white"
						>
							Voltar para login
						</a>

						<a
							href={resolve('/register/student')}
							class="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-white"
						>
							Criar conta
						</a>
					</div>
				</div>
			</section>
		</div>
	</div>
</div>
