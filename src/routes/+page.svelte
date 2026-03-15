<script lang="ts">
	import { resolve } from '$app/paths';
	import ciIcon from '$lib/assets/ci-icon.png';

	import homeHeroMockup from '$lib/assets/home/home-hero-mockup.png';
	import stepOrganize from '$lib/assets/home/step-organize.png';
	import stepPublish from '$lib/assets/home/step-publish.png';
	import stepReadAct from '$lib/assets/home/step-read-act.png';

	import personaProfessorMini from '$lib/assets/home/persona-professor-mini.png';
	import personaCoordenacaoMini from '$lib/assets/home/persona-coordenacao-mini.png';
	import personaAlunoMini from '$lib/assets/home/persona-aluno-mini.png';

	type Step = {
		key: string;
		title: string;
		text: string;
		image: string;
		titleClass: string;
	};

	type RoleTone = 'sky' | 'emerald' | 'amber';

	type RoleCard = {
		key: string;
		title: string;
		tone: RoleTone;
		points: string[];
	};

	type SummaryCard = {
		key: string;
		label: string;
		title: string;
		text: string;
		image: string;
	};

	let mobileMenuOpen = false;

	const steps: Step[] = [
		{
			key: 'organize',
			title: 'Organize',
			text: 'Crie turma, vincule matéria e registre alunos sem retrabalho.',
			image: stepOrganize,
			titleClass: 'text-sky-700'
		},
		{
			key: 'publish',
			title: 'Publique',
			text: 'Transforme resultado em histórico com contexto.',
			image: stepPublish,
			titleClass: 'text-slate-950'
		},
		{
			key: 'read-act',
			title: 'Leia e aja',
			text: 'Professor, coordenação e aluno veem o que importa para agir.',
			image: stepReadAct,
			titleClass: 'text-emerald-700'
		}
	];

	const roleCards: RoleCard[] = [
		{
			key: 'professor',
			title: 'Professor',
			tone: 'sky',
			points: [
				'Organiza turmas e matérias',
				'Publica avaliações com contexto',
				'Enxerga quedas e gaps reais'
			]
		},
		{
			key: 'coordenacao',
			title: 'Coordenação',
			tone: 'emerald',
			points: ['Compara turmas e matérias', 'Acompanha tendências', 'Identifica pontos críticos']
		},
		{
			key: 'aluno',
			title: 'Aluno',
			tone: 'amber',
			points: ['Vê média atual', 'Entende onde revisar', 'Acompanha evolução recente']
		}
	];

	const summaryCards: SummaryCard[] = [
		{
			key: 'summary-professor',
			label: 'Professor',
			title: 'Resultado publicado',
			text: 'Professor, coordenação e aluno usam a mesma base com leitura contextual.',
			image: personaProfessorMini
		},
		{
			key: 'summary-coordenacao',
			label: 'Coordenação',
			title: 'Leitura pedagógica',
			text: 'Coordenação acompanha tendências, pontos críticos e cobertura da base.',
			image: personaCoordenacaoMini
		},
		{
			key: 'summary-aluno',
			label: 'Aluno',
			title: 'Prioridade clara',
			text: 'O aluno acompanha progresso, revisão e evolução recente de forma simples.',
			image: personaAlunoMini
		}
	];

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}

	function roleToneClasses(tone: RoleTone) {
		if (tone === 'sky') {
			return {
				card: 'border-sky-200 bg-sky-50/80',
				header: 'bg-sky-100 text-slate-950',
				dot: 'bg-sky-500'
			};
		}

		if (tone === 'emerald') {
			return {
				card: 'border-emerald-200 bg-emerald-50/80',
				header: 'bg-emerald-100 text-slate-950',
				dot: 'bg-emerald-500'
			};
		}

		return {
			card: 'border-amber-200 bg-amber-50/80',
			header: 'bg-amber-100 text-slate-950',
			dot: 'bg-amber-500'
		};
	}
</script>

<svelte:head>
	<title>Class Insights - Leitura pedagógica com clareza</title>
	<meta
		name="description"
		content="Transforme avaliações em leitura pedagógica acionável para professores, coordenação e alunos."
	/>
</svelte:head>

<div class="min-h-screen bg-[#f6f7f9] text-slate-900">
	<header class="sticky top-0 z-50 border-b border-slate-200 bg-white/92 backdrop-blur">
		<div
			class="mx-auto flex max-w-310 items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8"
		>
			<a href={resolve('/')} class="flex items-center gap-3">
				<img src={ciIcon} alt="Class Insights" class="h-48 w-auto object-contain sm:h-28" />
			</a>

			<nav class="hidden items-center gap-10 md:flex">
				<a
					href="#como-funciona"
					class="text-sm font-bold text-slate-700 transition hover:text-slate-950"
				>
					Como funciona
				</a>
				<a
					href="#leituras"
					class="text-sm font-bold text-slate-700 transition hover:text-slate-950"
				>
					Leituras
				</a>
			</nav>

			<div class="hidden md:block">
				<a
					href={resolve('/login')}
					class="inline-flex items-center justify-center rounded-2xl bg-linear-to-r from-sky-600 to-emerald-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-sky-900/15 transition hover:-translate-y-px hover:shadow-xl"
				>
					Entrar
				</a>
			</div>

			<button
				type="button"
				class="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 md:hidden"
				aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
				on:click={() => (mobileMenuOpen = !mobileMenuOpen)}
			>
				{#if mobileMenuOpen}
					<svg
						class="h-5 w-5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
					</svg>
				{:else}
					<svg
						class="h-5 w-5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M4 12h16M4 17h16" />
					</svg>
				{/if}
			</button>
		</div>

		{#if mobileMenuOpen}
			<div class="border-t border-slate-200 bg-white md:hidden">
				<div class="mx-auto flex max-w-310 flex-col gap-3 px-4 py-4 sm:px-6">
					<a
						href="#como-funciona"
						class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700"
						on:click={closeMobileMenu}
					>
						Como funciona
					</a>
					<a
						href="#leituras"
						class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700"
						on:click={closeMobileMenu}
					>
						Leituras
					</a>
					<a
						href={resolve('/login')}
						class="inline-flex items-center justify-center rounded-2xl bg-linear-to-r from-sky-600 to-emerald-500 px-4 py-3 text-sm font-black text-white"
						on:click={closeMobileMenu}
					>
						Entrar
					</a>
				</div>
			</div>
		{/if}
	</header>

	<main>
		<section class="mx-auto max-w-310 px-4 pb-18 pt-10 sm:px-6 md:pb-24 md:pt-14 lg:px-8 lg:pt-18">
			<div
				class="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(520px,620px)] lg:gap-16"
			>
				<div class="max-w-155">
					<h1
						class="text-[2.7rem] font-black leading-[0.96] tracking-tight text-slate-950 sm:text-[3.5rem] lg:text-[4.55rem]"
					>
						Acompanhe a aprendizagem com <span class="text-emerald-600">clareza</span>,<br />
						não só com <span class="text-sky-600">notas soltas.</span>
					</h1>

					<p class="mt-7 max-w-135 text-lg leading-8 text-slate-600">
						O Class Insights ajuda professores, coordenação e alunos a transformar avaliações em
						leitura pedagógica acionável.
					</p>

					<div class="mt-9 flex flex-wrap gap-4">
						<a
							href={resolve('/login')}
							class="inline-flex min-h-13 items-center justify-center rounded-2xl bg-slate-900 px-7 py-4 text-base font-black text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800"
						>
							Entrar
						</a>
						<a
							href="#como-funciona"
							class="inline-flex min-h-13 items-center justify-center rounded-2xl border border-slate-200 bg-white px-7 py-4 text-base font-bold text-slate-900 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
						>
							Ver como funciona
						</a>
					</div>
				</div>

				<div class="mx-auto w-full max-w-155 lg:mx-0">
					<img
						src={homeHeroMockup}
						alt="Mockup do painel do professor no Class Insights"
						class="w-full object-contain"
						fetchpriority="high"
					/>
				</div>
			</div>
		</section>

		<section id="como-funciona" class="bg-white/0 py-16 sm:py-20">
			<div class="mx-auto max-w-310 px-4 sm:px-6 lg:px-8">
				<div class="mx-auto max-w-4xl text-center">
					<h2 class="text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
						Três passos para sair da nota solta.
					</h2>
				</div>

				<div class="mt-12 grid gap-8 md:grid-cols-3 md:gap-0">
					{#each steps as step, index (step.key)}
						<div
							class={`relative px-3 md:px-10 ${index < steps.length - 1 ? 'md:border-r md:border-slate-200' : ''}`}
						>
							<div class="mx-auto max-w-sm text-center">
								<div class="mx-auto flex h-28 items-center justify-center">
									<img
										src={step.image}
										alt={step.title}
										class="h-48 w-auto object-contain"
										loading="lazy"
									/>
								</div>

								<h3 class={`mt-3 text-[2rem] font-black tracking-tight ${step.titleClass}`}>
									{step.title}
								</h3>

								<p class="mt-4 text-lg leading-8 text-slate-600">
									{step.text}
								</p>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</section>

		<section id="leituras" class="bg-[#f2f4f6] py-16 sm:py-20">
			<div class="mx-auto max-w-310 px-4 sm:px-6 lg:px-8">
				<div class="mx-auto max-w-5xl text-center">
					<h2 class="text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
						A mesma base, três leituras diferentes.
					</h2>
				</div>

				<div class="mt-12 grid gap-6 lg:grid-cols-3">
					{#each roleCards as role (role.key)}
						{@const tone = roleToneClasses(role.tone)}
						<div class={`overflow-hidden rounded-4xl border shadow-sm ${tone.card}`}>
							<div class={`px-6 py-5 ${tone.header}`}>
								<h3 class="text-[2rem] font-black tracking-tight">{role.title}</h3>
							</div>

							<div class="space-y-4 px-5 py-5">
								{#each role.points as point (point)}
									<div class="flex items-center gap-3 rounded-2xl bg-white/85 px-4 py-4">
										<div class={`h-2.5 w-2.5 rounded-full ${tone.dot}`}></div>
										<p class="text-base font-semibold text-slate-700">{point}</p>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>

				<div class="mx-auto mt-16 max-w-4xl">
					<div
						class="rounded-[2.7rem] border border-slate-200 bg-white px-6 py-10 text-center shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:px-10 md:px-14 md:py-14"
					>
						<h2 class="text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
							Menos retrabalho. Mais leitura clara.
						</h2>

						<p class="mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-600">
							Entre no Class Insights e acompanhe a aprendizagem com uma leitura que faz sentido
							para cada perfil.
						</p>

						<div class="mt-8 flex flex-wrap justify-center gap-4">
							<a
								href={resolve('/login')}
								class="inline-flex min-h-13 items-center justify-center rounded-2xl bg-slate-900 px-7 py-4 text-base font-black text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800"
							>
								Entrar
							</a>
							<a
								href="#como-funciona"
								class="inline-flex min-h-13 items-center justify-center rounded-2xl border border-slate-200 bg-white px-7 py-4 text-base font-bold text-slate-900 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
							>
								Ver como funciona
							</a>
						</div>
					</div>
				</div>

				<div class="mt-12 grid gap-6 lg:grid-cols-3">
					{#each summaryCards as card (card.key)}
						<div
							class="overflow-hidden rounded-[1.9rem] border border-slate-200 bg-white shadow-sm"
						>
							<div class="flex items-center gap-3 px-5 py-4">
								<img
									src={card.image}
									alt={card.label}
									class="h-32 w-32bject-contain"
									loading="lazy"
								/>
								<p class="text-lg font-black text-slate-700">{card.label}</p>
							</div>

							<div class="border-t border-slate-100 px-5 py-5">
								<h3 class="text-[1.65rem] font-black tracking-tight text-slate-950">
									{card.title}
								</h3>
								<p class="mt-3 text-base leading-7 text-slate-600">{card.text}</p>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</section>
	</main>
</div>

<style>
	:global(html) {
		scroll-behavior: smooth;
	}
</style>
