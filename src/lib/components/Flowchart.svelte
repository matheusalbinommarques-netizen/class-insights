<script lang="ts">
	import { fade } from 'svelte/transition';

	// Svelte 5 Props
	let {
		variant = 'desktop',
		class: className = ''
	} = $props<{
		variant?: 'mini' | 'desktop' | 'mobile';
		class?: string;
	}>();

	const steps = [
		{ id: 1, persona: 'professor', color: 'blue', icon: '📋', title: 'Cria turma e importa alunos' },
		{ id: 2, persona: 'professor', color: 'blue', icon: '📝', title: 'Lança notas e avaliações' },
		{ id: 3, persona: 'sistema', color: 'brand', icon: '🔄', title: 'Atualiza histórico longitudinal' },
		{ id: 4, persona: 'professor', color: 'blue', icon: '📊', title: 'Analisa quedas e médias' },
		{ id: 5, persona: 'coordenador', color: 'purple', icon: '👀', title: 'Monitora instituição' },
		{ id: 6, persona: 'aluno', color: 'orange', icon: '📬', title: 'Recebe portal transparente' },
		{ id: 7, persona: 'ciclo', color: 'brand', icon: '🔁', title: 'Intervenção → Melhoria' }
	];

	// Mapeamento de cores para Tailwind (v4 compatível)
	const colorMap = {
		blue: 'text-blue-400 bg-blue-500/10 border-blue-400/20',
		purple: 'text-purple-400 bg-purple-500/10 border-purple-400/20',
		orange: 'text-orange-400 bg-orange-500/10 border-orange-400/20',
		brand: 'text-brand-accent bg-brand-accent/10 border-brand-accent/20'
	};
</script>

{#if variant === 'mini'}
	<div class="{className} flex items-center justify-center gap-2 opacity-60">
		{#each steps.slice(0, 5) as step, i}
			<div class="flex items-center gap-2">
				<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-xl border border-white/10">
					{step.icon}
				</div>
				{#if i < 4}
					<div class="h-px w-6 bg-linear-to-r from-white/20 to-transparent"></div>
				{/if}
			</div>
		{/each}
	</div>

{:else if variant === 'desktop'}
	<div class="{className} flex items-start justify-between gap-2 py-8">
		{#each steps as step, i}
			<div class="group relative flex-1 px-2 text-center">
				<div 
					class="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl transition-all duration-500 group-hover:scale-110 group-hover:shadow-2xl shadow-black/50 {colorMap[step.color as keyof typeof colorMap]}"
				>
					<span class="text-4xl">{step.icon}</span>
				</div>
				<p class="mt-4 text-[11px] font-black uppercase tracking-tighter leading-tight text-slate-300">
					{step.title}
				</p>
				
				{#if i < steps.length - 1}
					<div class="absolute -right-4.5 top-10 z-0 h-px w-9 bg-linear-to-r from-white/20 to-transparent"></div>
					<div class="absolute -right-3 top-8.5 text-xs text-white/20">▶</div>
				{/if}
			</div>
		{/each}
	</div>

{:else if variant === 'mobile'}
	<div class="{className} space-y-4">
		{#each steps as step}
			<details class="group overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 transition-all open:bg-slate-900/80">
				<summary class="flex cursor-pointer list-none items-center gap-4 p-5">
					<span class="flex h-12 w-12 items-center justify-center rounded-xl text-2xl {colorMap[step.color as keyof typeof colorMap]}">
						{step.icon}
					</span>
					<div class="flex-1">
						<span class="block text-sm font-bold text-white">{step.title}</span>
						<span class="text-[10px] font-black uppercase tracking-widest opacity-50">Ator: {step.persona}</span>
					</div>
					<span class="text-slate-600 transition-transform group-open:rotate-180">▼</span>
				</summary>
				<div class="border-t border-white/5 p-5 text-sm text-slate-400 bg-black/20" in:fade>
					Este passo garante que o fluxo {step.persona === 'sistema' ? 'seja automatizado' : `seja executado pelo ${step.persona}`}, alimentando os insights longitudinais da plataforma.
				</div>
			</details>
		{/each}
	</div>
{/if}