<script lang="ts">
	import { resolve } from '$app/paths';
	import ciIcon from '$lib/assets/ci-icon.png';

	type Tone = 'sky' | 'emerald' | 'amber';

	type ProductStep = {
		eyebrow: string;
		title: string;
		text: string;
	};

	type Persona = {
		title: string;
		tone: Tone;
		text: string;
		points: string[];
	};

	let menuOpen = $state(false);

	const steps: ProductStep[] = [
		{
			eyebrow: '1. Organize',
			title: 'Monte a base sem retrabalho',
			text: 'Crie turma, vincule materia, cadastre alunos e deixe o fluxo pronto para avaliar.'
		},
		{
			eyebrow: '2. Publique',
			title: 'Transforme nota em leitura',
			text: 'O que entra como resultado publicado deixa de ser dado solto e passa a ter contexto.'
		},
		{
			eyebrow: '3. Intervenha',
			title: 'Veja onde agir agora',
			text: 'Professor, coordenacao e aluno recebem uma leitura clara do que mudou e do que pede atencao.'
		}
	];

	const personas: Persona[] = [
		{
			title: 'Professor',
			tone: 'sky',
			text: 'Menos dispersao operacional. Mais clareza sobre turma, avaliacao e prioridade pedagógica.',
			points: [
				'organiza turmas e materias',
				'publica avaliacoes com contexto',
				'enxerga quedas e gaps reais'
			]
		},
		{
			title: 'Coordenacao',
			tone: 'emerald',
			text: 'Leitura institucional para comparar turmas, localizar materias criticas e acompanhar pendencias.',
			points: [
				'compara turmas e materias',
				'encontra quedas de tendencia',
				'acompanha cobertura e publicacao'
			]
		},
		{
			title: 'Aluno',
			tone: 'amber',
			text: 'Uma visao simples do proprio progresso, sem linguagem tecnica e sem depender de explicacao manual.',
			points: ['ve a media atual', 'entende onde vale revisar', 'acompanha a evolucao recente']
		}
	];

	function toneCard(tone: Tone) {
		if (tone === 'sky') return 'border-sky-200 bg-sky-50';
		if (tone === 'emerald') return 'border-emerald-200 bg-emerald-50';
		return 'border-amber-200 bg-amber-50';
	}

	function toneText(tone: Tone) {
		if (tone === 'sky') return 'text-sky-700';
		if (tone === 'emerald') return 'text-emerald-700';
		return 'text-amber-700';
	}
</script>

<div class="min-h-screen overflow-x-hidden bg-stone-50 text-slate-900">
	<div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
		<div
			class="absolute left-1/2 top-0 h-128 w-lg -translate-x-1/2 rounded-full bg-emerald-200/45 blur-3xl"
		></div>
		<div class="absolute right-0 top-40 h-80 w-80 rounded-full bg-sky-200/35 blur-3xl"></div>
		<div class="absolute left-0 top-128 h-72 w-72 rounded-full bg-amber-200/35 blur-3xl"></div>
	</div>

	<nav class="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
		<div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
			<a href={resolve('/')} class="flex items-center gap-3">
				<div
					class="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-white shadow-sm"
				>
					<img src={ciIcon} alt="" class="h-6 w-6 object-contain" />
				</div>
				<div>
					<p class="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700/80">
						Class Insights
					</p>
					<p class="text-lg font-black tracking-tight text-slate-900">Class Insights</p>
				</div>
			</a>

			<div class="hidden items-center gap-8 md:flex">
				<a
					href={`${resolve('/')}#como-funciona`}
					class="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
					>Como funciona</a
				>
				<a
					href={`${resolve('/')}#leituras`}
					class="text-sm font-semibold text-slate-600 transition hover:text-slate-900">Leituras</a
				>
				<a
					href={resolve('/login')}
					class="inline-flex items-center rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
					>Entrar</a
				>
			</div>

			<button
				type="button"
				class="rounded-2xl border border-slate-200 bg-white p-3 text-slate-600 md:hidden"
				aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
				onclick={() => (menuOpen = !menuOpen)}
			>
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					{#if menuOpen}
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
					{:else}
						<path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M4 12h16M4 17h16" />
					{/if}
				</svg>
			</button>
		</div>

		{#if menuOpen}
			<div class="border-t border-slate-200 bg-white px-6 py-6 md:hidden">
				<div class="flex flex-col gap-3">
					<a
						href={`${resolve('/')}#como-funciona`}
						class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"
						onclick={() => (menuOpen = false)}>Como funciona</a
					>
					<a
						href={`${resolve('/')}#leituras`}
						class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"
						onclick={() => (menuOpen = false)}>Leituras do produto</a
					>
					<a
						href={resolve('/login')}
						class="rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-black text-white"
						onclick={() => (menuOpen = false)}>Entrar</a
					>
				</div>
			</div>
		{/if}
	</nav>

	<header class="pt-28 md:pt-36">
		<div
			class="mx-auto grid max-w-7xl gap-12 px-6 pb-20 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:pb-24"
		>
			<div>
				<div
					class="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700 shadow-sm"
				>
					<span class="h-2 w-2 rounded-full bg-emerald-500"></span>
					Leitura pedagogica acionavel
				</div>

				<h1
					class="mt-6 max-w-4xl text-4xl font-black leading-[0.95] tracking-tight text-slate-950 sm:text-5xl md:text-6xl xl:text-7xl"
				>
					Acompanhe a aprendizagem com clareza,
					<span
						class="bg-linear-to-r from-emerald-600 via-sky-600 to-sky-400 bg-clip-text text-transparent"
						>nao so com notas soltas.</span
					>
				</h1>

				<p class="mt-6 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
					O Class Insights ajuda professores, coordenacao e alunos a transformar avaliacoes em
					leitura pedagogica acionavel.
				</p>

				<div class="mt-8 flex flex-wrap gap-4">
					<a
						href={resolve('/login')}
						class="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-7 py-4 text-sm font-black uppercase tracking-[0.18em] text-white shadow-lg transition hover:bg-slate-800"
						>Entrar</a
					>
					<a
						href={`${resolve('/')}#como-funciona`}
						class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-7 py-4 text-sm font-bold uppercase tracking-[0.18em] text-slate-900 shadow-sm transition hover:border-slate-300"
						>Ver como funciona</a
					>
				</div>
			</div>

			<div class="relative">
				<div class="absolute -inset-6 rounded-[2.5rem] bg-white/70 blur-2xl"></div>
				<div
					class="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]"
				>
					<div class="border-b border-slate-200 px-5 py-4">
						<p class="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
							Prova visual do produto
						</p>
						<h2 class="mt-2 text-xl font-black tracking-tight text-slate-950">
							Uma leitura clara do que exige acao agora
						</h2>
					</div>
					<div class="grid gap-4 p-5 md:grid-cols-[1.05fr_0.95fr]">
						<div class="rounded-[1.6rem] border border-sky-200 bg-sky-50 p-5">
							<p class="text-[11px] font-black uppercase tracking-[0.22em] text-sky-700">
								Professor
							</p>
							<h3 class="mt-3 text-2xl font-black text-slate-950">Onde agir primeiro</h3>
							<div class="mt-5 space-y-3">
								<div class="rounded-2xl border border-white/80 bg-white px-4 py-3">
									<p class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
										Turma em atencao
									</p>
									<p class="mt-2 text-lg font-black text-slate-950">
										7B precisa fechar 1 avaliacao
									</p>
								</div>
								<div class="rounded-2xl border border-white/80 bg-white px-4 py-3">
									<p class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
										Media publicada
									</p>
									<p class="mt-2 text-lg font-black text-slate-950">6,4 / 10</p>
								</div>
								<div class="rounded-2xl border border-white/80 bg-white px-4 py-3">
									<p class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
										Proximo passo
									</p>
									<p class="mt-2 text-lg font-black text-slate-950">
										Publicar rascunho de matematica
									</p>
								</div>
							</div>
						</div>
						<div class="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5">
							<p class="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
								Leitura compartilhada
							</p>
							<div class="mt-4 space-y-3">
								<div class="rounded-2xl border border-slate-200 bg-white px-4 py-4">
									<p class="text-sm font-black text-slate-950">Coordenacao</p>
									<p class="mt-2 text-sm leading-6 text-slate-600">
										Compara turmas, materias criticas e pendencias de publicacao.
									</p>
								</div>
								<div class="rounded-2xl border border-slate-200 bg-white px-4 py-4">
									<p class="text-sm font-black text-slate-950">Aluno</p>
									<p class="mt-2 text-sm leading-6 text-slate-600">
										Ve media atual, progresso recente e onde vale revisar.
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</header>

	<section id="como-funciona" class="border-y border-slate-200 bg-white py-20 md:py-24">
		<div class="mx-auto max-w-7xl px-6">
			<div class="mx-auto max-w-3xl text-center">
				<p class="text-[11px] font-black uppercase tracking-[0.26em] text-emerald-700/80">
					Como funciona
				</p>
				<h2 class="mt-4 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
					Tres passos para sair da nota solta
				</h2>
				<p class="mt-5 text-base leading-8 text-slate-600 md:text-lg">
					A operacao alimenta a base. A publicacao cria contexto. A leitura mostra o que fazer.
				</p>
			</div>

			<div class="mt-12 grid gap-4 md:grid-cols-3">
				{#each steps as step (step.title)}
					<div class="rounded-[1.8rem] border border-slate-200 bg-slate-50 p-6">
						<p class="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700/80">
							{step.eyebrow}
						</p>
						<h3 class="mt-3 text-2xl font-black leading-tight text-slate-950">{step.title}</h3>
						<p class="mt-4 text-sm leading-7 text-slate-600">{step.text}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<section id="leituras" class="py-22 md:py-28">
		<div class="mx-auto max-w-7xl px-6">
			<div class="mx-auto max-w-3xl text-center">
				<p class="text-[11px] font-black uppercase tracking-[0.26em] text-emerald-700/80">
					Tres leituras do produto
				</p>
				<h2 class="mt-4 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
					Cada perfil ve o que precisa para agir
				</h2>
				<p class="mt-5 text-base leading-8 text-slate-600 md:text-lg">
					Diretor, no MVP, segue como visao da coordenacao. Nao abrimos uma role nova agora.
				</p>
			</div>

			<div class="mt-12 grid gap-5 md:grid-cols-3">
				{#each personas as persona (persona.title)}
					<div class={`rounded-[1.9rem] border p-6 shadow-sm ${toneCard(persona.tone)}`}>
						<p
							class={`text-[11px] font-black uppercase tracking-[0.22em] ${toneText(persona.tone)}`}
						>
							{persona.title}
						</p>
						<p class="mt-4 text-sm leading-7 text-slate-700">{persona.text}</p>
						<div class="mt-5 space-y-2">
							{#each persona.points as point (`${persona.title}-${point}`)}
								<div
									class="rounded-2xl border border-white/80 bg-white px-4 py-3 text-sm font-semibold text-slate-900"
								>
									{point}
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<section class="pb-22 md:pb-28">
		<div class="mx-auto max-w-5xl px-6">
			<div
				class="overflow-hidden rounded-[2.3rem] border border-slate-200 bg-white p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)] md:p-12"
			>
				<div class="mx-auto max-w-3xl text-center">
					<p class="text-[11px] font-black uppercase tracking-[0.26em] text-emerald-700">
						Pronto para entrar?
					</p>
					<h2 class="mt-4 text-3xl font-black tracking-tight text-slate-950 md:text-6xl">
						Menos retrabalho. Mais leitura clara.
					</h2>
					<p class="mt-5 text-base leading-8 text-slate-600 md:text-lg">
						Entre no Class Insights e acompanhe a aprendizagem com uma leitura que faz sentido para
						cada perfil.
					</p>
					<div class="mt-8 flex flex-wrap justify-center gap-4">
						<a
							href={resolve('/login')}
							class="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-7 py-4 text-sm font-black uppercase tracking-[0.18em] text-white shadow-lg transition hover:bg-slate-800"
							>Entrar</a
						>
						<a
							href={`${resolve('/')}#como-funciona`}
							class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-7 py-4 text-sm font-bold uppercase tracking-[0.18em] text-slate-900 transition hover:border-slate-300"
							>Ver como funciona</a
						>
					</div>
				</div>
			</div>
		</div>
	</section>
</div>

<style>
	:global(html) {
		scroll-behavior: smooth;
	}
</style>
