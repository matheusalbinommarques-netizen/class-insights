<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';

	import ciIcon from '$lib/assets/ci-icon.png';
	import { supabase } from '$lib/services/supabaseClient';

	type Role = 'teacher' | 'student' | 'coord';

	type RegisterCard = {
		title: string;
		label: string;
		href: string;
		cardClass: string;
	};

	const registerCards: RegisterCard[] = [
		{
			title: 'Aluno',
			label: 'Criar acesso para acompanhar progresso e trajetória.',
			href: resolve('/register/student'),
			cardClass: 'border-sky-200 bg-sky-50 hover:border-sky-300'
		},
		{
			title: 'Professor',
			label: 'Criar acesso para operar turmas, matérias e avaliações.',
			href: resolve('/register/teacher'),
			cardClass: 'border-emerald-200 bg-emerald-50 hover:border-emerald-300'
		},
		{
			title: 'Coordenação',
			label: 'Criar acesso para leitura institucional e acompanhamento.',
			href: resolve('/register/coord'),
			cardClass: 'border-amber-200 bg-amber-50 hover:border-amber-300'
		}
	];

	let email = '';
	let password = '';
	let loading = false;
	let errorMessage = '';
	let showPassword = false;

	function resolvePostLoginHref(role: Role) {
		if (role === 'student') return '/student';
		if (role === 'coord') return '/coord';
		return '/teacher';
	}

	async function resolveRole(userId: string, fallbackRole: unknown): Promise<Role | null> {
		const { data, error } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', userId)
			.maybeSingle();

		if (!error && data?.role && ['teacher', 'student', 'coord'].includes(data.role)) {
			return data.role as Role;
		}

		if (
			typeof fallbackRole === 'string' &&
			['teacher', 'student', 'coord'].includes(fallbackRole)
		) {
			return fallbackRole as Role;
		}

		return null;
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';

		const trimmedEmail = email.trim().toLowerCase();

		if (!trimmedEmail) {
			errorMessage = 'Informe seu e-mail.';
			return;
		}

		if (!password) {
			errorMessage = 'Informe sua senha.';
			return;
		}

		loading = true;

		try {
			const { data, error } = await supabase.auth.signInWithPassword({
				email: trimmedEmail,
				password
			});

			if (error) {
				throw new Error(error.message);
			}

			const user = data.user;

			if (!user) {
				throw new Error('Não foi possível identificar sua conta.');
			}

			const role = await resolveRole(user.id, user.user_metadata?.role);

			if (!role) {
				throw new Error('Sua conta foi autenticada, mas o perfil não está configurado.');
			}

			await invalidateAll();
			await goto(resolvePostLoginHref(role));
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Não foi possível entrar agora.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Class Insights - Entrar</title>
	<meta
		name="description"
		content="Entre no Class Insights para acessar sua área de aluno, professor ou coordenação."
	/>
</svelte:head>

<div class="min-h-screen bg-slate-50 text-slate-900">
	<div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
		<div
			class="absolute -top-28 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-sky-200/45 blur-3xl"
		></div>
		<div class="absolute -right-20 top-32 h-80 w-80 rounded-full bg-emerald-200/40 blur-3xl"></div>
		<div class="absolute -left-20 bottom-10 h-72 w-72 rounded-full bg-amber-200/35 blur-3xl"></div>
	</div>

	<div class="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-6 sm:px-6 lg:px-8">
		<div
			class="grid w-full overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-2xl lg:grid-cols-[1.02fr_0.98fr]"
		>
			<section class="bg-slate-950 px-6 py-8 text-white sm:px-8 lg:px-10">
				<div class="flex h-full flex-col">
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
							<h1 class="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Entre na sua área</h1>
						</div>
					</div>

					<p class="mt-6 max-w-xl text-base leading-8 text-slate-300">
						Um único acesso para três experiências diferentes: operação do professor, leitura
						institucional da coordenação e acompanhamento claro para o aluno.
					</p>

					<div class="mt-8 grid gap-4">
						<div class="rounded-3xl border border-white/10 bg-white/5 p-5">
							<p class="text-sm font-black text-white">Professor</p>
							<p class="mt-2 text-sm leading-7 text-slate-300">
								Opera turmas, matérias, avaliações, revisão e publicação.
							</p>
						</div>

						<div class="rounded-3xl border border-white/10 bg-white/5 p-5">
							<p class="text-sm font-black text-white">Coordenação</p>
							<p class="mt-2 text-sm leading-7 text-slate-300">
								Acompanha prioridades institucionais e faz drill-down por turma, matéria e aluno.
							</p>
						</div>

						<div class="rounded-3xl border border-white/10 bg-white/5 p-5">
							<p class="text-sm font-black text-white">Aluno</p>
							<p class="mt-2 text-sm leading-7 text-slate-300">
								Vê sua situação atual, sua trajetória e o que merece atenção.
							</p>
						</div>
					</div>

					<div class="mt-auto pt-8 text-sm leading-7 text-slate-400">
						Seu perfil define automaticamente a área de destino após o login.
					</div>
				</div>
			</section>

			<section class="px-6 py-8 sm:px-8 lg:px-10">
				<div class="mx-auto w-full max-w-xl">
					<p class="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Acesso</p>
					<h2 class="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
						Entrar no sistema
					</h2>
					<p class="mt-4 text-base leading-8 text-slate-600">
						Use o e-mail e a senha do seu perfil para acessar sua área.
					</p>

					<form class="mt-8 grid gap-5" onsubmit={handleSubmit}>
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
							<div class="flex items-center justify-between gap-3">
								<label for="password" class="block text-sm font-black text-slate-900">Senha</label>
								<a
									href={resolve('/forgot-password')}
									class="text-sm font-bold text-slate-600 transition hover:text-slate-900 hover:underline"
								>
									Esqueci minha senha
								</a>
							</div>

							<div class="mt-2 flex overflow-hidden rounded-2xl border border-slate-300 bg-white">
								<input
									id="password"
									type={showPassword ? 'text' : 'password'}
									bind:value={password}
									placeholder="Digite sua senha"
									autocomplete="current-password"
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

						<button
							type="submit"
							disabled={loading}
							class="inline-flex h-14 items-center justify-center rounded-2xl bg-slate-900 text-base font-black text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
						>
							{loading ? 'Entrando...' : 'Entrar'}
						</button>
					</form>

					{#if errorMessage}
						<div
							class="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
							aria-live="polite"
						>
							{errorMessage}
						</div>
					{/if}

					<div class="my-7 flex items-center gap-3 text-sm text-slate-400">
						<div class="h-px flex-1 bg-slate-200"></div>
						<span class="font-semibold text-slate-500">Novo por aqui?</span>
						<div class="h-px flex-1 bg-slate-200"></div>
					</div>

					<div class="grid gap-3 sm:grid-cols-3">
						{#each registerCards as card (card.title)}
							<a
								href={card.href}
								class={`group rounded-2xl border p-4 text-center transition hover:-translate-y-0.5 hover:shadow-sm ${card.cardClass}`}
							>
								<p class="text-lg font-black tracking-tight text-slate-900">{card.title}</p>
								<p class="mt-2 text-xs leading-5 text-slate-600">{card.label}</p>
							</a>
						{/each}
					</div>

					<p class="mt-6 text-center text-sm leading-6 text-slate-500">
						Seus dados são usados apenas para autenticação e acompanhamento dentro do produto.
					</p>
				</div>
			</section>
		</div>
	</div>
</div>
