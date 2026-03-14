<script lang="ts">
	import { resolve } from '$app/paths';
	type Tone = 'sky' | 'emerald' | 'amber';

	type Preview = {
		id: 'teacher' | 'coordinator' | 'student';
		label: string;
		tone: Tone;
		eyebrow: string;
		title: string;
		description: string;
		stats: { label: string; value: string }[];
		insights: string[];
	};

	type Pillar = {
		title: string;
		text: string;
	};

	type Persona = {
		title: string;
		tone: Tone;
		eyebrow: string;
		text: string;
		points: string[];
	};

	let menuOpen = $state(false);
	let activePreview = $state<'teacher' | 'coordinator' | 'student'>('teacher');

	const previews: Preview[] = [
		{
			id: 'teacher',
			label: 'Professor',
			tone: 'sky',
			eyebrow: 'Painel do professor',
			title: 'Veja onde agir primeiro',
			description:
				'Organize turmas, publique avalia��es e identifique rapidamente cobertura, quedas e prioridades pedag�gicas.',
			stats: [
				{ label: 'Cobertura', value: '92%' },
				{ label: 'Queda recente', value: '07' },
				{ label: 'Foco atual', value: 'Fra��es' }
			],
			insights: [
				'3 alunos abaixo da m�dia ap�s a avalia��o 2',
				'1 turma com publica��o pendente',
				'Melhora consistente em leitura nas �ltimas avalia��es'
			]
		},
		{
			id: 'coordinator',
			label: 'Coordena��o',
			tone: 'emerald',
			eyebrow: 'Leitura institucional',
			title: 'Enxergue padr�es da institui��o',
			description:
				'Compare turmas, mat�rias e oscila��es para entender onde a coordena��o deve atuar com mais prioridade.',
			stats: [
				{ label: 'Turmas', value: '18' },
				{ label: 'Mat�ria cr�tica', value: 'Matem�tica' },
				{ label: 'Padr�o', value: 'Oscila��o' }
			],
			insights: [
				'2 turmas fora da curva em desempenho',
				'Matem�tica concentra a maior varia��o',
				'Leitura mostra avan�o est�vel no 7� ano'
			]
		},
		{
			id: 'student',
			label: 'Aluno',
			tone: 'amber',
			eyebrow: 'Portal do aluno',
			title: 'Entenda seu progresso com clareza',
			description:
				'O aluno acompanha hist�rico, pontos fortes e aten��o necess�ria sem depender de revis�o manual.',
			stats: [
				{ label: 'M�dia', value: '7,8' },
				{ label: 'Melhor', value: 'Hist�ria' },
				{ label: 'Aten��o', value: 'Matem�tica' }
			],
			insights: [
				'Melhora nas 3 avalia��es mais recentes',
				'Hist�rico organizado por mat�ria',
				'Leitura simples e direta da evolu��o'
			]
		}
	];

	const pillars: Pillar[] = [
		{
			title: 'Opera��o mais clara',
			text: 'Turmas, mat�rias, alunos e avalia��es em um fluxo que faz sentido para a rotina real.'
		},
		{
			title: 'Leitura acion�vel',
			text: 'A nota deixa de ser s� registro e vira prioridade pedag�gica.'
		},
		{
			title: 'Valor para todos',
			text: 'Professor, coordena��o e aluno acessam a mesma trajet�ria com vis�es diferentes.'
		}
	];

	const personas: Persona[] = [
		{
			title: 'Professor',
			tone: 'sky',
			eyebrow: 'N�cleo operacional',
			text: 'Foco em rotina, lan�amento, acompanhamento da turma e decis�es mais r�pidas.',
			points: ['cria��o de turma', 'cadastro/importa��o', 'lan�amento e leitura']
		},
		{
			title: 'Coordena��o',
			tone: 'emerald',
			eyebrow: 'N�cleo anal�tico',
			text: 'Foco em padr�es, compara��o entre turmas e leitura institucional do desempenho.',
			points: ['vis�o por mat�ria', 'compara��es macro', 'prioridades institucionais']
		},
		{
			title: 'Aluno',
			tone: 'amber',
			eyebrow: 'N�cleo de valor',
			text: 'Foco em clareza para entender progresso, melhor mat�ria e pontos de aten��o.',
			points: ['hist�rico pessoal', 'evolu��o recente', 'portal simples']
		}
	];

	const currentPreview = $derived(
		previews.find((preview) => preview.id === activePreview) ?? previews[0]
	);

	function tabClasses(tone: Tone, active: boolean) {
		if (!active) {
			return 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900';
		}

		if (tone === 'sky') {
			return 'border-sky-200 bg-sky-50 text-sky-700';
		}
		if (tone === 'emerald') {
			return 'border-emerald-200 bg-emerald-50 text-emerald-700';
		}
		return 'border-amber-200 bg-amber-50 text-amber-700';
	}

	function accentText(tone: Tone) {
		if (tone === 'sky') return 'text-sky-700';
		if (tone === 'emerald') return 'text-emerald-700';
		return 'text-amber-700';
	}

	function accentSurface(tone: Tone) {
		if (tone === 'sky') return 'border-sky-200 bg-sky-50';
		if (tone === 'emerald') return 'border-emerald-200 bg-emerald-50';
		return 'border-amber-200 bg-amber-50';
	}

	function accentDot(tone: Tone) {
		if (tone === 'sky') return 'bg-sky-500';
		if (tone === 'emerald') return 'bg-emerald-500';
		return 'bg-amber-500';
	}
</script>

<div class="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
	<div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
		<div
			class="absolute left-1/2 -top-40 h-104 w-104 -translate-x-1/2 rounded-full bg-emerald-200/50 blur-3xl"
		></div>
		<div class="absolute -right-24 top-48 h-96 w-[24rem] rounded-full bg-sky-200/50 blur-3xl"></div>
		<div
			class="absolute -left-24 top-112 h-80 w-[20rem] rounded-full bg-amber-200/40 blur-3xl"
		></div>
	</div>

	<nav class="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
		<div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
			<a href={resolve('/')} class="flex items-center gap-3">
				<div
					class="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm"
				>
					<svg
						class="h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2.4"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M13 3v7h7M11 21v-7H4m16-4L11 21 4 14l9-11 7 7Z"
						/>
					</svg>
				</div>

				<div>
					<p class="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700/80">
						EdTech Platform
					</p>
					<p class="text-lg font-black tracking-tight text-slate-900">Class Insights</p>
				</div>
			</a>

			<div class="hidden items-center gap-8 md:flex">
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a
					href={`${resolve('/')}#como-funciona`}
					class="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
				>
					Como funciona
				</a>
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a
					href={`${resolve('/')}#diferencial`}
					class="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
				>
					Diferencial
				</a>
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a
					href={`${resolve('/')}#perfis`}
					class="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
				>
					Perfis
				</a>

				<a
					href={resolve('/login')}
					class="inline-flex items-center rounded-2xl border border-slate-200 bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
				>
					Entrar
				</a>
			</div>

			<button
				type="button"
				class="rounded-2xl border border-slate-200 bg-white p-3 text-slate-600 md:hidden"
				aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
				onclick={() => (menuOpen = !menuOpen)}
			>
				{menuOpen ? '?' : '?'}
			</button>
		</div>

		{#if menuOpen}
			<div class="border-t border-slate-200 bg-white px-6 py-6 md:hidden">
				<div class="flex flex-col gap-3">
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
					<a
						href={`${resolve('/')}#como-funciona`}
						class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"
						onclick={() => (menuOpen = false)}
					>
						Como funciona
					</a>
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
					<a
						href={`${resolve('/')}#diferencial`}
						class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"
						onclick={() => (menuOpen = false)}
					>
						Diferencial
					</a>
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
					<a
						href={`${resolve('/')}#perfis`}
						class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"
						onclick={() => (menuOpen = false)}
					>
						Perfis
					</a>
					<a
						href={resolve('/login')}
						class="mt-2 rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-black text-white"
						onclick={() => (menuOpen = false)}
					>
						Entrar na plataforma
					</a>
				</div>
			</div>
		{/if}
	</nav>

	<header class="pt-28 md:pt-36">
		<div
			class="mx-auto grid max-w-7xl gap-14 px-6 pb-20 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:pb-28"
		>
			<div>
				<div
					class="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700 shadow-sm"
				>
					<span class="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
					Professor primeiro. Aluno no centro.
				</div>

				<h1
					class="mt-6 max-w-3xl text-4xl font-black leading-[0.96] tracking-tight text-slate-950 sm:text-5xl md:text-6xl xl:text-7xl"
				>
					Notas que viram
					<span
						class="bg-linear-to-r from-emerald-600 via-sky-600 to-sky-400 bg-clip-text text-transparent"
					>
						a��o pedag�gica
					</span>
				</h1>

				<p class="mt-6 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
					O Class Insights ajuda professores a organizar turmas, publicar avalia��es e descobrir
					rapidamente onde agir � enquanto coordena��o e aluno acompanham o progresso com muito mais
					clareza.
				</p>

				<div class="mt-8 flex flex-wrap gap-4">
					<a
						href={resolve('/login')}
						class="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-7 py-4 text-sm font-black uppercase tracking-[0.18em] text-white shadow-lg transition hover:bg-slate-800"
					>
						Entrar
					</a>

					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
					<a
						href={`${resolve('/')}#como-funciona`}
						class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-7 py-4 text-sm font-bold uppercase tracking-[0.18em] text-slate-900 shadow-sm transition hover:border-slate-300"
					>
						Ver como funciona
					</a>
				</div>

				<div class="mt-10 grid gap-4 sm:grid-cols-3">
					{#each pillars as pillar (pillar.title)}
						<div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
							<h3 class="text-sm font-black text-slate-900">{pillar.title}</h3>
							<p class="mt-2 text-sm leading-6 text-slate-600">{pillar.text}</p>
						</div>
					{/each}
				</div>
			</div>

			<div class="relative">
				<div class="absolute -inset-6 rounded-[2.5rem] bg-white/70 blur-2xl"></div>

				<div
					class="relative overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-[0_20px_80px_rgba(15,23,42,0.08)]"
				>
					<div class="border-b border-slate-200 px-5 py-4">
						<div class="flex flex-wrap items-center justify-between gap-4">
							<div>
								<p class="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
									Preview do produto
								</p>
								<h2 class="mt-1 text-lg font-bold text-slate-900">
									A mesma base, leituras diferentes
								</h2>
							</div>

							<div
								class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold text-slate-600"
							>
								hist�rico atualizado
							</div>
						</div>

						<div class="mt-4 flex flex-wrap gap-2">
							{#each previews as preview (preview.id)}
								<button
									type="button"
									class={`rounded-2xl border px-4 py-2 text-sm font-bold transition ${tabClasses(preview.tone, activePreview === preview.id)}`}
									onclick={() => (activePreview = preview.id)}
								>
									{preview.label}
								</button>
							{/each}
						</div>
					</div>

					<div class="grid gap-5 p-5 lg:grid-cols-[0.95fr_1.05fr]">
						<div class={`rounded-[1.75rem] border p-5 ${accentSurface(currentPreview.tone)}`}>
							<p
								class={`text-[11px] font-black uppercase tracking-[0.22em] ${accentText(currentPreview.tone)}`}
							>
								{currentPreview.eyebrow}
							</p>

							<h3 class="mt-3 text-2xl font-black leading-tight text-slate-950">
								{currentPreview.title}
							</h3>

							<p class="mt-3 text-sm leading-7 text-slate-700">
								{currentPreview.description}
							</p>

							<div class="mt-5 space-y-3">
								{#each currentPreview.stats as stat (`${currentPreview.id}-${stat.label}`)}
									<div
										class="flex items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/80 px-4 py-3"
									>
										<p class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
											{stat.label}
										</p>
										<p
											class="shrink-0 text-right text-xl font-black leading-none text-slate-950 md:text-2xl"
										>
											{stat.value}
										</p>
									</div>
								{/each}
							</div>
						</div>

						<div class="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
							<div class="flex items-center justify-between gap-3">
								<div>
									<p class="text-sm font-bold text-slate-900">O que essa leitura entrega</p>
									<p class="mt-1 text-sm text-slate-500">Mais clareza. Menos achismo.</p>
								</div>

								<div
									class="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-600"
								>
									em destaque
								</div>
							</div>

							<div class="mt-5 space-y-3">
								{#each currentPreview.insights as insight (`${currentPreview.id}-${insight}`)}
									<div class="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
										<div class="flex items-start gap-3">
											<div
												class={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${accentDot(currentPreview.tone)}`}
											></div>
											<p class="text-sm font-semibold leading-6 text-slate-900">{insight}</p>
										</div>
									</div>
								{/each}
							</div>

							<div class="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-4">
								<p class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
									Resumo
								</p>
								<p class="mt-2 text-sm leading-7 text-slate-600">
									O professor alimenta a base. O sistema organiza o hist�rico. Depois disso, cada
									perfil v� o que precisa para agir.
								</p>
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
					Um fluxo simples. Um ganho real.
				</h2>
				<p class="mt-5 text-base leading-8 text-slate-600 md:text-lg">
					O produto n�o precisa parecer complicado para ser valioso. Ele organiza o essencial para
					gerar leitura �til ao longo do tempo.
				</p>
			</div>

			<div class="mt-12 grid gap-4 md:grid-cols-3">
				<div class="rounded-[1.8rem] border border-slate-200 bg-slate-50 p-6">
					<p class="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700/80">
						1. Organize
					</p>
					<h3 class="mt-3 text-2xl font-black leading-tight text-slate-950">
						Crie a base da turma
					</h3>
					<p class="mt-4 text-sm leading-7 text-slate-600">
						Crie turma, vincule mat�ria e cadastre ou importe alunos sem transformar isso em
						retrabalho.
					</p>
				</div>

				<div class="rounded-[1.8rem] border border-slate-200 bg-slate-50 p-6">
					<p class="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700/80">
						2. Avalie
					</p>
					<h3 class="mt-3 text-2xl font-black leading-tight text-slate-950">
						Publique o resultado
					</h3>
					<p class="mt-4 text-sm leading-7 text-slate-600">
						Lance notas e alimente o sistema com o dado pedag�gico que realmente importa.
					</p>
				</div>

				<div class="rounded-[1.8rem] border border-slate-200 bg-slate-50 p-6">
					<p class="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700/80">
						3. Intervenha
					</p>
					<h3 class="mt-3 text-2xl font-black leading-tight text-slate-950">
						Leia e aja com clareza
					</h3>
					<p class="mt-4 text-sm leading-7 text-slate-600">
						O hist�rico longitudinal devolve leitura �til para professor, coordena��o e aluno.
					</p>
				</div>
			</div>
		</div>
	</section>

	<section id="diferencial" class="py-22 md:py-28">
		<div class="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
			<div>
				<p class="text-[11px] font-black uppercase tracking-[0.26em] text-emerald-700/80">
					Diferencial do produto
				</p>
				<h2 class="mt-4 max-w-xl text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
					O aluno como hist�rico vivo, n�o como nota solta
				</h2>
				<p class="mt-5 max-w-xl text-base leading-8 text-slate-600 md:text-lg">
					A grande for�a do Class Insights n�o � s� cadastrar, nem s� mostrar um dashboard. �
					transformar a trajet�ria do aluno em leitura clara para quem ensina, coordena e aprende.
				</p>

				<div class="mt-8 rounded-[1.8rem] border border-emerald-200 bg-white p-6 shadow-sm">
					<p class="text-lg font-bold text-slate-950">
						Quando o professor publica, o processo n�o termina.
					</p>
					<p class="mt-3 text-sm leading-7 text-slate-600">
						O sistema atualiza o hist�rico, alimenta a leitura do professor, amplia a vis�o da
						coordena��o e devolve clareza para o aluno acompanhar a pr�pria evolu��o.
					</p>
				</div>
			</div>

			<div class="grid gap-4 md:grid-cols-3">
				<div class="rounded-[1.8rem] border border-sky-200 bg-sky-50 p-5">
					<h3 class="text-2xl font-black text-sky-700">Professor v�</h3>
					<div class="mt-5 space-y-3">
						<div
							class="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-900"
						>
							evolu��o nas avalia��es
						</div>
						<div
							class="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-900"
						>
							compara��o com a turma
						</div>
						<div
							class="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-900"
						>
							alertas de queda
						</div>
					</div>
				</div>

				<div class="rounded-[1.8rem] border border-emerald-200 bg-emerald-50 p-5">
					<h3 class="text-2xl font-black text-emerald-700">Coordena��o v�</h3>
					<div class="mt-5 space-y-3">
						<div
							class="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-900"
						>
							padr�es por mat�ria
						</div>
						<div
							class="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-900"
						>
							vis�o institucional
						</div>
						<div
							class="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-900"
						>
							prioridades macro
						</div>
					</div>
				</div>

				<div class="rounded-[1.8rem] border border-amber-200 bg-amber-50 p-5">
					<h3 class="text-2xl font-black text-amber-700">Aluno v�</h3>
					<div class="mt-5 space-y-3">
						<div
							class="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-900"
						>
							hist�rico recente
						</div>
						<div
							class="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-900"
						>
							melhor e pior mat�ria
						</div>
						<div
							class="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-900"
						>
							tend�ncia de evolu��o
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<section id="perfis" class="border-t border-slate-200 bg-white py-22 md:py-28">
		<div class="mx-auto max-w-7xl px-6">
			<div class="mx-auto max-w-3xl text-center">
				<p class="text-[11px] font-black uppercase tracking-[0.26em] text-emerald-700/80">
					Perfis do produto
				</p>
				<h2 class="mt-4 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
					Feito para quem age em camadas
				</h2>
				<p class="mt-5 text-base leading-8 text-slate-600 md:text-lg">
					O professor inicia o fluxo. A coordena��o amplia a leitura. O aluno recebe valor claro.
				</p>
			</div>

			<div class="mt-12 grid gap-5 md:grid-cols-3">
				{#each personas as persona (persona.title)}
					<div
						class={`rounded-[1.9rem] border bg-slate-50 p-6 ${persona.tone === 'sky' ? 'border-sky-200' : persona.tone === 'emerald' ? 'border-emerald-200' : 'border-amber-200'}`}
					>
						<p
							class={`text-[11px] font-black uppercase tracking-[0.22em] ${accentText(persona.tone)}`}
						>
							{persona.eyebrow}
						</p>
						<h3 class="mt-3 text-3xl font-black text-slate-950">{persona.title}</h3>
						<p class="mt-4 text-sm leading-7 text-slate-600">{persona.text}</p>

						<div class="mt-5 space-y-2">
							{#each persona.points as point (`${persona.title}-${point}`)}
								<div
									class="rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm"
								>
									{point}
								</div>
							{/each}
						</div>

						<a
							href={resolve('/login')}
							class="mt-6 inline-flex items-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
						>
							Entrar
						</a>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<section class="py-22 md:py-28">
		<div class="mx-auto max-w-5xl px-6">
			<div
				class="overflow-hidden rounded-[2.3rem] border border-slate-200 bg-white p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)] md:p-12"
			>
				<div class="mx-auto max-w-3xl text-center">
					<p class="text-[11px] font-black uppercase tracking-[0.26em] text-emerald-700">
						Pronto para entrar?
					</p>
					<h2 class="mt-4 text-3xl font-black tracking-tight text-slate-950 md:text-6xl">
						Chega de nota solta e planilha espalhada.
					</h2>
					<p class="mt-5 text-base leading-8 text-slate-600 md:text-lg">
						Entre no Class Insights e transforme dado em leitura, prioridade e acompanhamento
						longitudinal.
					</p>

					<div class="mt-8 flex flex-wrap justify-center gap-4">
						<a
							href={resolve('/login')}
							class="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-7 py-4 text-sm font-black uppercase tracking-[0.18em] text-white shadow-lg transition hover:bg-slate-800"
						>
							Entrar na plataforma
						</a>

						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
						<a
							href={`${resolve('/')}#como-funciona`}
							class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-7 py-4 text-sm font-bold uppercase tracking-[0.18em] text-slate-900 transition hover:border-slate-300"
						>
							Rever o fluxo
						</a>
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
