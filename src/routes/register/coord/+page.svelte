<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';

	import ciIcon from '$lib/assets/ci-icon.png';
	import { supabase } from '$lib/services/supabaseClient';

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

	function resetMessages() {
		errorMessage = '';
		successMessage = '';
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
						role: 'coord',
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
				const { error: profileError } = await supabase.from('profiles').upsert(
					{
						id: user.id,
						role: 'coord',
						display_name: trimmedName
					},
					{ onConflict: 'id' }
				);

				if (profileError) {
					throw new Error(profileError.message);
				}

				await invalidateAll();
				await goto(resolve('/coord'));
				return;
			}

			successMessage = 'Conta criada. Confirme seu e-mail e depois faca login para continuar.';
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'Nao foi possivel concluir o cadastro.';
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
	<title>Class Insights - Primeiro acesso da coordenacao</title>
	<meta
		name="description"
		content="Crie seu acesso de coordenacao no Class Insights para acompanhar turmas, materias e tendencias institucionais."
	/>
</svelte:head>

<div class="min-h-screen bg-slate-50 text-slate-900">
	<div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
		<div
			class="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-amber-200/50 blur-3xl"
		></div>
		<div class="absolute -right-24 top-40 h-72 w-72 rounded-full bg-sky-200/45 blur-3xl"></div>
	</div>

	<div class="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-6 sm:px-6 lg:px-8">
		<div
			class="grid w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl lg:grid-cols-2"
		>
			<section
				class="order-2 flex flex-col border-t border-slate-200 bg-gradient-to-br from-amber-50 via-white to-sky-50 p-6 text-slate-900 lg:order-1 lg:border-r lg:border-t-0 lg:p-10"
			>
				<a href={resolve('/')} class="inline-flex w-fit items-center gap-3">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-200 bg-white shadow-sm"
					>
						<img src={ciIcon} alt="" class="h-7 w-7 object-contain" />
					</div>
					<div>
						<p class="text-[11px] font-black uppercase tracking-widest text-amber-700/80">
							Class Insights
						</p>
						<p class="text-2xl font-black tracking-tight text-slate-900">Class Insights</p>
					</div>
				</a>

				<div class="mt-10 max-w-xl">
					<p class="text-[11px] font-black uppercase tracking-widest text-amber-700/80">
						Primeiro acesso de coordenacao
					</p>
					<h1
						class="mt-4 text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl"
					>
						Crie seu acesso institucional.
					</h1>
					<p class="mt-5 text-base leading-8 text-slate-600">
						Entre para comparar turmas, localizar materias criticas e acompanhar onde a operacao
						ainda esta pendente.
					</p>
				</div>

				<div class="mt-8 grid gap-3">
					<div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
						<p class="text-sm font-black text-slate-900">Leitura macro</p>
						<p class="mt-1 text-sm leading-6 text-slate-600">
							Veja comparativos entre turmas, materias mais criticas e sinais de queda.
						</p>
					</div>
					<div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
						<p class="text-sm font-black text-slate-900">Pendencias operacionais</p>
						<p class="mt-1 text-sm leading-6 text-slate-600">
							Acompanhe cobertura, publicacoes e pontos que ainda dependem do fluxo do professor.
						</p>
					</div>
					<div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
						<p class="text-sm font-black text-slate-900">Diretor no MVP</p>
						<p class="mt-1 text-sm leading-6 text-slate-600">
							Nesta fase, diretor segue como visao da coordenacao, nao como role separada.
						</p>
					</div>
				</div>
			</section>

			<section class="order-1 flex items-center justify-center p-6 sm:p-8 lg:order-2 lg:p-10">
				<div class="w-full max-w-md">
					<div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
						<div class="mb-6">
							<p class="text-[11px] font-black uppercase tracking-widest text-amber-700/80">
								Cadastro
							</p>
							<h2 class="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
								Entre na area institucional
							</h2>
							<p class="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
								Use seus dados para criar a conta e acessar a visao de coordenacao.
							</p>
						</div>

						<form class="space-y-5" onsubmit={handleSubmit}>
							<div class="space-y-2">
								<label for="name" class="block text-sm font-bold text-slate-700">Nome</label>
								<input
									id="name"
									type="text"
									bind:value={name}
									class="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
									disabled={loading}
								/>
							</div>
							<div class="space-y-2">
								<label for="email" class="block text-sm font-bold text-slate-700">E-mail</label>
								<input
									id="email"
									type="email"
									bind:value={email}
									class="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
									disabled={loading}
								/>
							</div>
							<div class="space-y-2">
								<label for="password" class="block text-sm font-bold text-slate-700">Senha</label>
								<div class="relative">
									<input
										id="password"
										type={showPassword ? 'text' : 'password'}
										bind:value={password}
										class="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-24 text-base text-slate-900 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
										disabled={loading}
									/>
									<button
										type="button"
										class="absolute right-2 top-2 inline-flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700"
										onclick={() => (showPassword = !showPassword)}
										disabled={loading}>{showPassword ? 'Ocultar' : 'Mostrar'}</button
									>
								</div>
							</div>
							<div class="space-y-2">
								<label for="confirmPassword" class="block text-sm font-bold text-slate-700"
									>Confirmar senha</label
								>
								<div class="relative">
									<input
										id="confirmPassword"
										type={showConfirmPassword ? 'text' : 'password'}
										bind:value={confirmPassword}
										class="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-24 text-base text-slate-900 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
										disabled={loading}
									/>
									<button
										type="button"
										class="absolute right-2 top-2 inline-flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700"
										onclick={() => (showConfirmPassword = !showConfirmPassword)}
										disabled={loading}>{showConfirmPassword ? 'Ocultar' : 'Mostrar'}</button
									>
								</div>
							</div>

							<button
								type="submit"
								disabled={loading}
								class="inline-flex h-14 w-full items-center justify-center rounded-2xl bg-slate-900 text-base font-black text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
								>{loading ? 'Criando conta...' : 'Criar acesso de coordenacao'}</button
							>
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

						<p class="mt-6 text-center text-sm leading-6 text-slate-500">
							Ja tem conta? <a
								href={resolve('/login')}
								class="font-bold text-slate-900 hover:underline">Entrar</a
							>
						</p>
					</div>
				</div>
			</section>
		</div>
	</div>
</div>
