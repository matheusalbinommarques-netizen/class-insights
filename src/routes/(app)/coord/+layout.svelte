<script lang="ts">
	let { children, data } = $props();
</script>

<svelte:head>
	<title>Coordenacao - Class Insights</title>
</svelte:head>

<div class="min-h-screen bg-slate-50 text-slate-900">
	<div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
		<div
			class="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-amber-200/35 blur-3xl"
		></div>
		<div class="absolute right-0 top-40 h-80 w-80 rounded-full bg-sky-200/25 blur-3xl"></div>
	</div>

	<div class="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
		<header
			class="rounded-[2rem] border border-slate-200 bg-white/90 px-6 py-5 shadow-sm backdrop-blur"
		>
			<div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
				<div class="flex items-start gap-4">
					<div
						class="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-amber-500 to-orange-500 text-lg font-black tracking-tight text-white shadow-lg shadow-amber-900/20"
					>
						CI
					</div>

					<div class="min-w-0">
						<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">Coordenacao</p>
						<h1 class="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
							Escopo por turma
						</h1>
						<p class="mt-2 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
							Esta area e independente do fluxo teacher. O coordenador entra com login proprio e
							passara a enxergar somente as turmas que administrar por codigo de turma.
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
						Fluxo institucional separado do professor e pronto para receber o modelo de vinculacao.
					</p>
				</div>
			</div>
		</header>

		<main class="flex-1 py-6">
			{@render children()}
		</main>
	</div>
</div>
