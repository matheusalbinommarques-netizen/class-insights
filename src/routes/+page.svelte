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
				card: 'border-sky-200 bg-sky-50/70',
				header: 'bg-sky-100/80',
				dot: 'bg-sky-500'
			};
		}

		if (tone === 'emerald') {
			return {
				card: 'border-emerald-200 bg-emerald-50/70',
				header: 'bg-emerald-100/80',
				dot: 'bg-emerald-500'
			};
		}

		return {
			card: 'border-amber-200 bg-amber-50/70',
			header: 'bg-amber-100/80',
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

<div class="min-h-screen bg-slate-50 text-slate-900">
	<header class="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
		<div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
			<a
				href={resolve('/')}
				class="flex shrink-0 items-center"
				aria-label="Ir para a página inicial"
			>
				<img src={ciIcon} alt="Class Insights" class="h-24 w-auto object-contain sm:h-24" />
			</a>

			<div class="hidden items-center gap-8 md:flex lg:gap-10">
				<nav class="flex items-center gap-6 lg:gap-8">
					<a
						href="#como-funciona"
						class="text-sm font-semibold text-slate-600 transition hover:text-slate-950"
					>
						Como funciona
					</a>
					<a
						href="#leituras"
						class="text-sm font-semibold text-slate-600 transition hover:text-slate-950"
					>
						Leituras
					</a>
				</nav>

				<a
					href={resolve('/login')}
					class="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-400 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-500"
				>
					Entrar
				</a>
			</div>

			<button
				type="button"
				class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 md:hidden"
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
				<div class="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6">
					<a
						href="#como-funciona"
						class="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
						on:click={closeMobileMenu}
					>
						Como funciona
					</a>
					<a
						href="#leituras"
						class="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
						on:click={closeMobileMenu}
					>
						Leituras
					</a>
					<a
						href={resolve('/login')}
						class="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-400 px-4 text-sm font-bold text-white transition hover:bg-emerald-500"
						on:click={closeMobileMenu}
					>
						Entrar
					</a>
				</div>
			</div>
		{/if}
	</header>

	<main>
		<section class="mx-auto max-w-7xl px-4 pb-18 pt-10 sm:px-6 md:pb-24 md:pt-14 lg:px-8 lg:pt-18">
			<div
				class="grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16"
			>
				<div class="max-w-3xl">
					<h1
						class="text-[2.8rem] font-black leading-[0.95] tracking-tight text-slate-950 sm:text-[3.75rem] lg:text-[4.75rem]"
					>
						Acompanhe a<br />
						aprendizagem com <span class="text-emerald-600">clareza</span>,<br />
						não só com <span class="text-sky-600">notas soltas.</span>
					</h1>

					<p class="mt-7 max-w-2xl text-lg leading-8 text-slate-600">
						O Class Insights ajuda professores, coordenação e alunos a transformar avaliações em
						leitura pedagógica acionável.
					</p>

					<div class="mt-9 flex flex-wrap gap-4">
						<a
							href={resolve('/login')}
							class="inline-flex h-12 items-center justify-center rounded-xl bg-slate-900 px-7 text-base font-bold text-white shadow-sm transition hover:bg-slate-800"
						>
							Entrar
						</a>
						<a
							href="#como-funciona"
							class="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-7 text-base font-semibold text-slate-900 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
						>
							Ver como funciona
						</a>
					</div>
				</div>

				<div class="mx-auto w-full max-w-3xl lg:mx-0 lg:pl-4">
					<img
						src={homeHeroMockup}
						alt="Mockup do painel do professor no Class Insights"
						class="w-full object-contain"
						fetchpriority="high"
					/>
				</div>
			</div>
		</section>

		<section id="como-funciona" class="py-18 sm:py-22">
			<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div class="mx-auto max-w-4xl text-center">
					<h2 class="text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
						Três passos para sair da nota solta.
					</h2>
				</div>

				<div class="mt-12 grid gap-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-slate-200">
					{#each steps as step (step.key)}
						<div class="px-3 md:px-10">
							<div class="mx-auto max-w-sm text-center">
								<div class="mx-auto flex h-24 items-center justify-center">
									<img
										src={step.image}
										alt={step.title}
										class="h-36 -auto object-contain sm:h-36"
										loading="lazy"
									/>
								</div>

								<h3 class={`mt-5 text-4xl font-extrabold tracking-tight ${step.titleClass}`}>
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

		<section id="leituras" class="py-18 sm:py-22">
			<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
								<h3 class="text-3xl font-extrabold tracking-tight text-slate-950">{role.title}</h3>
							</div>

							<div class="space-y-4 px-5 py-5">
								{#each role.points as point (point)}
									<div class="flex items-center gap-3 rounded-2xl bg-white px-4 py-4">
										<div class={`h-2.5 w-2.5 rounded-full ${tone.dot}`}></div>
										<p class="text-base font-semibold text-slate-700">{point}</p>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>

				<div class="mx-auto mt-16 max-w-5xl">
					<div
						class="rounded-[2.5rem] border border-slate-200 bg-white px-6 py-10 text-center shadow-sm sm:px-10 md:px-14 md:py-14"
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
								class="inline-flex h-12 items-center justify-center rounded-xl bg-slate-900 px-7 text-base font-bold text-white shadow-sm transition hover:bg-slate-800"
							>
								Entrar
							</a>
							<a
								href="#como-funciona"
								class="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-7 text-base font-semibold text-slate-900 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
							>
								Ver como funciona
							</a>
						</div>
					</div>
				</div>

				<div class="mt-12 grid gap-6 lg:grid-cols-3">
					{#each summaryCards as card (card.key)}
						<div
							class="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm"
						>
							<div class="flex items-center gap-4 px-5 py-4">
								<img
									src={card.image}
									alt={card.label}
									class="h-28 w-28 object-contain"
									loading="lazy"
								/>
								<p class="text-lg font-semibold text-slate-700">{card.label}</p>
							</div>

							<div class="border-t border-slate-100 px-5 py-5">
								<h3 class="text-[1.75rem] font-extrabold tracking-tight text-slate-950">
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
