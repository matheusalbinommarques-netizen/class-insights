<script lang="ts">
	let { variant = 'desktop', class: className = '' } = $props<{
		variant: 'mini' | 'desktop' | 'mobile';
		class: string;
	}>();

	type Tone = 'blue' | 'brand' | 'emerald' | 'amber';

	type Step = {
		id: string;
		actor: string;
		tone: Tone;
		title: string;
		description: string;
		outcome: string;
	};

	const steps: Step[] = [
		{
			id: '01',
			actor: 'Professor',
			tone: 'blue',
			title: 'Cria turma e vincula materia',
			description: 'O trabalho comeca organizando a estrutura da turma e o contexto da disciplina.',
			outcome: 'base de trabalho pronta'
		},
		{
			id: '02',
			actor: 'Professor',
			tone: 'blue',
			title: 'Cadastra ou importa alunos',
			description:
				'A entrada operacional precisa ser rapida, clara e segura para evitar retrabalho.',
			outcome: 'alunos vinculados'
		},
		{
			id: '03',
			actor: 'Professor',
			tone: 'blue',
			title: 'Cria avaliacao e lanca notas',
			description:
				'A rotina do professor alimenta o sistema com o que realmente importa para a leitura.',
			outcome: 'dados pedagogicos publicados'
		},
		{
			id: '04',
			actor: 'Sistema',
			tone: 'brand',
			title: 'Atualiza o historico longitudinal',
			description: 'A nota deixa de ser pontual e passa a compor uma visao acumulada do aluno.',
			outcome: 'historico vivo'
		},
		{
			id: '05',
			actor: 'Professor + Coordenacao',
			tone: 'emerald',
			title: 'Gera leitura e prioridades',
			description:
				'Medias, quedas, padroes e comparacoes passam a orientar intervencao de verdade.',
			outcome: 'insight acionavel'
		},
		{
			id: '06',
			actor: 'Aluno',
			tone: 'amber',
			title: 'Acompanha evolucao com clareza',
			description:
				'O aluno recebe uma visao simples do proprio progresso, sem depender de leitura manual.',
			outcome: 'valor percebido'
		}
	];

	function tonePanel(tone: Tone) {
		if (tone === 'blue') return 'border-blue-400/20 bg-blue-500/10';
		if (tone === 'brand') return 'border-brand-accent/20 bg-brand-accent/10';
		if (tone === 'emerald') return 'border-emerald-400/20 bg-emerald-500/10';
		return 'border-amber-400/20 bg-amber-500/10';
	}

	function toneBadge(tone: Tone) {
		if (tone === 'blue') return 'border-blue-400/20 bg-blue-500/12 text-blue-300';
		if (tone === 'brand') return 'border-brand-accent/20 bg-brand-accent/12 text-brand-accent';
		if (tone === 'emerald') return 'border-emerald-400/20 bg-emerald-500/12 text-emerald-300';
		return 'border-amber-400/20 bg-amber-500/12 text-amber-300';
	}

	function toneDot(tone: Tone) {
		if (tone === 'blue') return 'bg-blue-400';
		if (tone === 'brand') return 'bg-brand-accent';
		if (tone === 'emerald') return 'bg-emerald-400';
		return 'bg-amber-400';
	}

	const miniSteps = steps.slice(0, 4);
</script>

{#if variant === 'mini'}
	<div class={`${className} items-center gap-3`}>
		{#each miniSteps as step, i (step.id)}
			<div class="flex items-center gap-3">
				<div
					class={`flex h-12 w-12 items-center justify-center rounded-2xl border text-xs font-black tracking-[0.18em] ${toneBadge(step.tone)}`}
				>
					{step.id}
				</div>

				{#if i < miniSteps.length - 1}
					<div class="flex items-center gap-2">
						<div class="h-px w-8 bg-white/12"></div>
						<div class={`h-2 w-2 rounded-full ${toneDot(step.tone)}`}></div>
					</div>
				{/if}
			</div>
		{/each}

		<div
			class="ml-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400"
		>
			operacao historico leitura
		</div>
	</div>
{:else if variant === 'desktop'}
	<div class={className}>
		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
			{#each steps as step, i (step.id)}
				<div class="relative">
					{#if i < steps.length - 1}
						<div
							class="pointer-events-none absolute left-[calc(100%-0.5rem)] top-10 hidden h-px w-4 bg-white/10 xl:block"
						></div>
						<div
							class="pointer-events-none absolute left-[calc(100%+0.6rem)] top-[2.02rem] hidden text-white/25 xl:block"
						></div>
					{/if}

					<article class={`h-full rounded-[1.75rem] border p-5 ${tonePanel(step.tone)}`}>
						<div class="flex items-center justify-between gap-3">
							<span
								class={`rounded-full border px-2.5 py-1 text-[11px] font-black tracking-[0.16em] ${toneBadge(step.tone)}`}
							>
								{step.id}
							</span>

							<span class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
								{step.actor}
							</span>
						</div>

						<h3 class="mt-5 text-lg font-black leading-tight text-white">
							{step.title}
						</h3>

						<p class="mt-3 text-sm leading-6 text-slate-300">
							{step.description}
						</p>

						<div class="mt-5 rounded-2xl border border-white/8 bg-slate-950/45 px-3 py-3">
							<p class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
								Resultado
							</p>
							<p class="mt-1 text-sm font-semibold text-white">{step.outcome}</p>
						</div>
					</article>
				</div>
			{/each}
		</div>

		<div class="mt-5 rounded-[1.75rem] border border-white/8 bg-slate-950/45 px-5 py-4">
			<p class="text-sm text-slate-300">
				<span class="font-bold text-white">Resumo:</span>
				o professor alimenta uma vez, o sistema organiza o historico e a plataforma devolve leitura util
				para professor, coordenacao e aluno.
			</p>
		</div>
	</div>
{:else if variant === 'mobile'}
	<div class={`${className} space-y-3`}>
		{#each steps as step, i (step.id)}
			<div class="rounded-2xl border border-white/8 bg-slate-950/55 p-4">
				<div class="flex items-start gap-4">
					<div class="flex flex-col items-center">
						<div
							class={`flex h-12 w-12 items-center justify-center rounded-2xl border text-xs font-black tracking-[0.16em] ${toneBadge(step.tone)}`}
						>
							{step.id}
						</div>

						{#if i < steps.length - 1}
							<div class="mt-2 h-7 w-px bg-white/10"></div>
						{/if}
					</div>

					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-2">
							<span class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
								{step.actor}
							</span>
							<div class={`h-2 w-2 rounded-full ${toneDot(step.tone)}`}></div>
						</div>

						<h3 class="mt-2 text-base font-black leading-tight text-white">
							{step.title}
						</h3>

						<p class="mt-2 text-sm leading-6 text-slate-300">
							{step.description}
						</p>

						<div
							class="mt-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400"
						>
							{step.outcome}
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>
{/if}
