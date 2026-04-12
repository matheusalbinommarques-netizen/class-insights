<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';

	import ciIcon from '$lib/assets/ci-icon.png';
	import { supabase } from '$lib/services/supabaseClient';

	type BenefitTone = 'sky' | 'emerald' | 'amber';

	type Benefit = {
		title: string;
		text: string;
		tone: BenefitTone;
	};

	const MIN_PASSWORD_LENGTH = 6;

	const benefits: Benefit[] = [
		{
			title: 'Cockpit do professor',
			text: 'Organize turmas, matérias, avaliações, revisão e publicação.',
			tone: 'emerald'
		},
		{
			title: 'Fluxo oficial da V1',
			text: 'O trabalho gira em torno de matéria, avaliação e resultado publicado.',
			tone: 'sky'
		},
		{
			title: 'Escopo operacional',
			text: 'Seu acesso leva direto para a área de professor após o login.',
			tone: 'amber'
		}
	];

	let name = '';
	let email = '';
	let password = '';
	let confirmPassword = '';

	let loading = false;
	let resending = false;
	let errorMessage = '';
	let successMessage = '';
	let showPassword = false;
	let showConfirmPassword = false;

	$: trimmedName = name.trim();
	$: trimmedEmail = email.trim().toLowerCase();
	$: passwordHasMinLength = password.length >= MIN_PASSWORD_LENGTH;
	$: passwordsMatch =
		password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

	function toneClass(tone: BenefitTone) {
		if (tone === 'emerald') return 'border-emerald-200 bg-emerald-50';
		if (tone === 'amber') return 'border-amber-200 bg-amber-50';
		return 'border-sky-200 bg-sky-50';
	}

	function getEmailRedirectTo() {
		if (typeof window === 'undefined') return undefined;
		return `${window.location.origin}/login`;
	}

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

		if (!passwordsMatch) {
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
					emailRedirectTo: getEmailRedirectTo(),
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

			const { error: profileError } = await supabase.from('profiles').upsert(
				{
					id: user.id,
					role: 'teacher',
					display_name: trimmedName
				},
				{ onConflict: 'id' }
			);

			if (profileError) {
				throw new Error(profileError.message);
			}

			if (session) {
				await invalidateAll();
				await goto('/teacher');
				return;
			}

			successMessage = 'Conta criada. Confirme seu e-mail para entrar na área do professor.';
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'Não foi possível criar sua conta agora.';
		} finally {
			loading = false;
		}
	}

	async function handleResendVerification() {
		resetMessages();

		if (!trimmedEmail) {
			errorMessage = 'Informe o e-mail usado no cadastro.';
			return;
		}

		resending = true;

		try {
			const { error } = await supabase.auth.resend({
				type: 'signup',
				email: trimmedEmail,
				options: {
					emailRedirectTo: getEmailRedirectTo()
				}
			});

			if (error) {
				throw new Error(error.message);
			}

			successMessage = 'Enviamos um novo e-mail de confirmação.';
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Não foi possível reenviar o e-mail.';
		} finally {
			resending = false;
		}
	}
</script>

<svelte:head>
	<title>Class Insights - Cadastro de professor</title>
	<meta
		name="description"
		content="Crie sua conta de professor no Class Insights para operar turmas, matérias, avaliações e publicações."
	/>
</svelte:head>

<div class="min-h-screen bg-slate-50 text-slate-900">
	<div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
		<div
			class="absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-200/40 blur-3xl"
		></div>
		<div class="absolute -left-20 top-72 h-72 w-72 rounded-full bg-sky-200/35 blur-3xl"></div>
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
						<p class="text-xs font-black uppercase tracking-[0.32em] text-emerald-200">
							Class Insights
						</p>
						<h1 class="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
							Criar acesso de professor
						</h1>
					</div>
				</div>

				<p class="mt-6 max-w-xl text-base leading-8 text-slate-300">
					Crie seu acesso para operar turmas e transformar resultado em leitura pedagógica com
					contexto.
				</p>

				<div class="mt-8 grid gap-4">
					{#each benefits as benefit (benefit.title)}
						<div class={`rounded-3xl border p-5 ${toneClass(benefit.tone)}`}>
							<p class="text-sm font-black text-slate-950">{benefit.title}</p>
							<p class="mt-2 text-sm leading-7 text-slate-700">{benefit.text}</p>
						</div>
					{/each}
				</div>
			</section>

			<section class="px-6 py-8 sm:px-8 lg:px-10">
				<div class="mx-auto w-full max-w-xl">
					<p class="text-xs font-black uppercase tracking-[0.3em] text-slate-500">
						Primeiro acesso
					</p>
					<h2 class="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
						Criar conta
					</h2>
					<p class="mt-4 text-base leading-8 text-slate-600">
						Preencha seus dados para criar seu acesso de professor.
					</p>

					<form
						class="mt-8 grid gap-5"
						onsubmit={(event) => {
							event.preventDefault();
							handleRegister();
						}}
					>
						<div>
							<label for="name" class="block text-sm font-black text-slate-900">Nome</label>
							<input
								id="name"
								type="text"
								bind:value={name}
								placeholder="Seu nome completo"
								autocomplete="name"
								class="mt-2 h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
							/>
						</div>

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

						<div>
							<label for="password" class="block text-sm font-black text-slate-900">Senha</label>
							<div class="mt-2 flex overflow-hidden rounded-2xl border border-slate-300 bg-white">
								<input
									id="password"
									type={showPassword ? 'text' : 'password'}
									bind:value={password}
									placeholder="Crie sua senha"
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
								Confirmar senha
							</label>
							<div class="mt-2 flex overflow-hidden rounded-2xl border border-slate-300 bg-white">
								<input
									id="confirmPassword"
									type={showConfirmPassword ? 'text' : 'password'}
									bind:value={confirmPassword}
									placeholder="Repita sua senha"
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
							disabled={loading}
							class="inline-flex h-14 w-full items-center justify-center rounded-2xl bg-slate-900 text-base font-black text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
						>
							{loading ? 'Criando conta...' : 'Criar conta de professor'}
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
							{resending ? 'Reenviando...' : 'Reenviar confirmação'}
						</button>

						<a
							href={resolve('/login')}
							class="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-white"
						>
							Já tenho conta
						</a>
					</div>
				</div>
			</section>
		</div>
	</div>
</div>
