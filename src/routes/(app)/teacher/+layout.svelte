<script lang="ts">
	import { page } from '$app/stores';

	type NavItem = {
		label: string;
		href: string;
		description: string;
		match: (pathname: string) => boolean;
	};

	let { children } = $props();

	let mobileNavOpen = $state(false);

	const navItems: NavItem[] = [
		{
			label: 'Dashboard',
			href: '/teacher',
			description: 'Workspace e cockpit',
			match: (pathname) => pathname === '/teacher'
		},
		{
			label: 'Importação',
			href: '/teacher/import',
			description: 'CSV, staging e validação',
			match: (pathname) => pathname.startsWith('/teacher/import')
		}
	];

	const pathname = $derived($page.url.pathname);

	const currentTitle = $derived(getCurrentTitle(pathname));
	const currentSubtitle = $derived(getCurrentSubtitle(pathname));

	function getCurrentTitle(path: string) {
		if (path.startsWith('/teacher/import')) return 'Importação de notas';
		if (path.startsWith('/teacher/')) return 'Workspace do professor';
		return 'Workspace do professor';
	}

	function getCurrentSubtitle(path: string) {
		if (path.startsWith('/teacher/import')) return 'Entrada de dados, staging e validação';
		if (path.startsWith('/teacher/')) return 'Área interna';
		return 'Área interna';
	}

	function isActive(item: NavItem, path: string) {
		return item.match(path);
	}

	function closeMobileNav() {
		mobileNavOpen = false;
	}
</script>

<svelte:head>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="min-h-screen bg-slate-50 text-slate-900">
	<div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
		<div class="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-200/35 blur-3xl"></div>
		<div class="absolute -right-24 top-40 h-72 w-72 rounded-full bg-sky-200/35 blur-3xl"></div>
		<div class="absolute -left-24 top-96 h-72 w-72 rounded-full bg-indigo-200/25 blur-3xl"></div>
	</div>

	<div class="grid min-h-screen lg:grid-cols-[280px_1fr]">
		<aside class="hidden border-r border-slate-200 bg-slate-950 text-white lg:flex lg:flex-col">
			<div class="border-b border-white/10 p-5">
				<a href="/" class="flex items-center gap-4">
					<div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-sky-500 to-blue-600 shadow-lg shadow-blue-950/30">
						<span class="text-lg font-black tracking-tight text-white">CI</span>
					</div>

					<div class="min-w-0">
						<p class="truncate text-2xl font-black tracking-tight text-white">
							Class Insights
						</p>
						<p class="mt-1 text-sm text-slate-300">Painel do professor</p>
					</div>
				</a>
			</div>

			<nav class="flex-1 p-5">
				<div class="space-y-3">
					{#each navItems as item}
						<a
							href={item.href}
							class={`block rounded-3xl border px-4 py-4 transition ${
								isActive(item, pathname)
									? 'border-sky-400/30 bg-sky-500/15 text-white shadow-sm'
									: 'border-transparent bg-white/5 text-slate-200 hover:border-white/10 hover:bg-white/8'
							}`}
						>
							<p class="text-xl font-black tracking-tight">{item.label}</p>
							<p class="mt-1 text-sm text-slate-300">{item.description}</p>
						</a>
					{/each}
				</div>
			</nav>

			<div class="p-5 pt-0">
				<div class="rounded-3xl border border-white/10 bg-white/5 p-5">
					<p class="text-lg font-black tracking-tight text-white">MVP funcional</p>
					<p class="mt-3 text-sm leading-7 text-slate-300">
						Professor, importação, grid e snapshots já ativos. Agora o foco é UX, cockpit e
						portal do aluno.
					</p>
				</div>
			</div>
		</aside>

		<div class="flex min-w-0 flex-col">
			<header class="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-xl">
				<div class="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
					<div class="flex min-w-0 items-center gap-3">
						<button
							type="button"
							class="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 lg:hidden"
							onclick={() => (mobileNavOpen = true)}
							aria-label="Abrir navegação"
						>
							<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M4 12h16M4 17h16" />
							</svg>
						</button>

						<div class="min-w-0">
							<p class="text-xs font-black uppercase tracking-widest text-slate-500">
								{currentSubtitle}
							</p>
							<h1 class="truncate text-2xl font-medium tracking-tight text-slate-800 sm:text-4xl">
								{currentTitle}
							</h1>
						</div>
					</div>

					<div class="hidden sm:flex">
						<div class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
							<span class="h-3 w-3 rounded-full bg-emerald-500"></span>
							Sessão ativa
						</div>
					</div>
				</div>
			</header>

			{#if mobileNavOpen}
				<div class="fixed inset-0 z-40 lg:hidden">
					<button
						type="button"
						class="absolute inset-0 bg-slate-950/35 backdrop-blur-sm"
						onclick={closeMobileNav}
						aria-label="Fechar navegação"
					></button>

					<div class="absolute left-0 top-0 flex h-full w-[320px] max-w-[88vw] flex-col border-r border-slate-200 bg-white shadow-2xl">
						<div class="flex items-center justify-between border-b border-slate-200 p-5">
							<a href="/" class="flex items-center gap-3" onclick={closeMobileNav}>
								<div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-sky-500 to-blue-600 shadow-sm">
									<span class="text-base font-black tracking-tight text-white">CI</span>
								</div>

								<div>
									<p class="text-lg font-black tracking-tight text-slate-950">Class Insights</p>
									<p class="text-sm text-slate-500">Painel do professor</p>
								</div>
							</a>

							<button
								type="button"
								class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
								onclick={closeMobileNav}
								aria-label="Fechar navegação"
							>
								<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
								</svg>
							</button>
						</div>

						<nav class="flex-1 p-5">
							<div class="space-y-3">
								{#each navItems as item}
									<a
										href={item.href}
										class={`block rounded-3xl border px-4 py-4 transition ${
											isActive(item, pathname)
												? 'border-sky-200 bg-sky-50 text-sky-700'
												: 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
										}`}
										onclick={closeMobileNav}
									>
										<p class="text-lg font-black tracking-tight">{item.label}</p>
										<p class="mt-1 text-sm text-slate-500">{item.description}</p>
									</a>
								{/each}
							</div>
						</nav>

						<div class="border-t border-slate-200 p-5">
							<div class="rounded-3xl border border-slate-200 bg-slate-50 p-4">
								<p class="text-base font-black text-slate-950">MVP funcional</p>
								<p class="mt-2 text-sm leading-7 text-slate-600">
									Professor, importação, grid e snapshots já ativos.
								</p>
							</div>
						</div>
					</div>
				</div>
			{/if}

			<main class="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
				{@render children()}
			</main>
		</div>
	</div>
</div>