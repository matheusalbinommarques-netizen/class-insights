<script lang="ts">
	import ciIcon from '$lib/assets/ci-icon.png';
	import type { Snippet } from 'svelte';

	type Props = {
		data: {
			profile?: {
				display_name: string;
			} | null;
		};
		children: Snippet;
	};

	let { data, children }: Props = $props();
</script>

<div
	class="min-h-screen bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.08),transparent_30%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)]"
>
	<div class="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
		<header
			class="rounded-4xl border border-slate-200 bg-white/90 px-6 py-5 shadow-sm backdrop-blur"
		>
			<div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
				<div class="flex items-start gap-4">
					<div
						class="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200 bg-white shadow-lg shadow-amber-900/10"
					>
						<img src={ciIcon} alt="" class="h-8 w-8 object-contain" />
					</div>

					<div class="min-w-0">
						<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">Coordenação</p>
						<h1 class="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
							Visão institucional
						</h1>
						<p class="mt-2 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
							Acompanhe as turmas do seu escopo, identifique pontos de atenção e concentre a leitura
							nas quedas mais relevantes.
						</p>
					</div>
				</div>

				<div
					class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
				>
					<p class="font-black tracking-tight text-amber-950">
						{data.profile?.display_name ?? 'Coordenador'}
					</p>
					<p class="mt-1 leading-6">
						Painel institucional com foco em turmas, matérias, tendências e alunos que pedem
						acompanhamento.
					</p>
				</div>
			</div>
		</header>

		<main class="flex-1 py-6">
			{@render children()}
		</main>
	</div>
</div>
