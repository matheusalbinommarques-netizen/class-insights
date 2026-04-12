<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';

	import ciIcon from '$lib/assets/ci-icon.png';
	import { supabase } from '$lib/services/supabaseClient';

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
			text: 'Você pode criar sua conta agora, mesmo sem código de convite.',
			tone: 'sky'
		},
		{
			title: 'Vínculo depois',
			text: 'Quando o código chegar, você conclui o vínculo sem refazer cadastro.',
			tone: 'emerald'
		},
		{
			title: 'Leitura clara',
			text: 'Assim que o vínculo estiver ativo, seu portal mostra situação atual e trajetória.',
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
	$: normalizedInviteCode = inviteCode.trim().toUpperCase().replace(/\s+/g, '');
	$: passwordHasMinLength = password.length >= MIN_PASSWORD_LENGTH;
	$: passwordsMatch =
		password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

	onMount(() => {
		const storedCode =
			typeof localStorage !== 'undefined'
				? localStorage.getItem(PENDING_STUDENT_INVITE_CODE_KEY)
				: null;

		if (storedCode && !inviteCode) {
			inviteCode = storedCode;
		}
	});

	function toneClass(tone: BenefitTone) {
		if (tone === 'emerald') return 'border-emerald-200 bg-emerald-50';
		if (tone === 'amber') return 'border-amber-200 bg-amber-50';
		return 'border-sky-200 bg-sky-50';
	}

	function getEmailRedirectTo() {
		if (typeof window === 'undefined') return undefined;
		return `${window.location.origin}/login`;
	}

	function persistInviteCode() {
		if (typeof localStorage === 'undefined') return;

		if (normalizedInviteCode) {
			localStorage.setItem(PENDING_STUDENT_INVITE_CODE_KEY, normalizedInviteCode);
			return;
		}

		localStorage.removeItem(PENDING_STUDENT_INVITE_CODE_KEY);
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

	async function claimInviteCodeIfPossible() {
		if (!normalizedInviteCode) return null;

		const { error } = await supabase.rpc('claim_student_by_invite_code', {
			p_invite_code: normalizedInviteCode
		});

		return error?.message ?? null;
	}

	async function handleRegister() {
		resetMessages();

		if (!validateForm()) return;

		loading = true;

		try {
			persistInviteCode();

			const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
				email: trimmedEmail,
				password,
				options: {
					emailRedirectTo: getEmailRedirectTo(),
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
				throw new Error('Não foi possível criar a conta.');
			}

			const { error: profileError } = await supabase.from('profiles').upsert(
				{
					id: user.id,
					role: 'student',
					display_name: trimmedName
				},
				{ onConflict: 'id' }
			);

			if (profileError) {
				throw new Error(profileError.message);
			}

			if (session) {
				const claimError = await claimInviteCodeIfPossible();

				await invalidateAll();

				if (claimError) {
					successMessage =
						'Conta criada com sucesso. O código de convite não foi vinculado agora, mas você pode tentar novamente no portal.';
					return;
				}

				if (typeof localStorage !== 'undefined') {
					localStorage.removeItem(PENDING_STUDENT_INVITE_CODE_KEY);
				}

				await goto('/student');
				return;
			}

			successMessage = normalizedInviteCode
				? 'Conta criada. Confirme seu e-mail para entrar. Seu código de convite ficará salvo para concluir o vínculo depois.'
				: 'Conta criada. Confirme seu e-mail para entrar no portal do aluno.';
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
	<title>Class Insights - Cadastro de aluno</title>
	<meta
		name="description"
		content="Crie sua conta de aluno no Class Insights para acompanhar sua situação atual, matérias e trajetória."
	/>
</svelte:head>

<div class="min-h-screen bg-slate-50 text-slate-900">
	<div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
		<div
			class="absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-sky-200/45 blur-3xl"
		></div>
		<div class="absolute -left-24 top-80 h-72 w-72 rounded-full bg-emerald-200/35 blur-3xl"></div>
		<div class="absolute -right-20 top-24 h-80 w-80 rounded-full bg-amber-200/35 blur-3xl"></div>
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
						<h1 class="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
							Criar acesso de aluno
						</h1>
					</div>
				</div>

				<p class="mt-6 max-w-xl text-base leading-8 text-slate-300">
					Crie sua conta para acompanhar progresso, situação atual e trajetória. O vínculo com a
					turma pode ser feito agora ou depois.
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
						Preencha seus dados. Se já tiver um código de convite, você pode informar agora.
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
							<label for="inviteCode" class="block text-sm font-black text-slate-900">
								Código de convite
							</label>
							<input
								id="inviteCode"
								type="text"
								bind:value={inviteCode}
								placeholder="Opcional"
								autocomplete="off"
								class="mt-2 h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 text-base uppercase tracking-[0.12em] text-slate-900 outline-none transition placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
							/>
							<p class="mt-2 text-sm leading-6 text-slate-500">
								Se você ainda não recebeu o código, pode concluir isso depois.
							</p>
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
							{loading ? 'Criando conta...' : 'Criar conta de aluno'}
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
