<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';

	import ciIcon from '$lib/assets/ci-icon.png';
	import DisplayNamePrompt from '$lib/components/DisplayNamePrompt.svelte';
	import TeacherNavItemIcon from '$lib/components/teacher/TeacherNavItemIcon.svelte';
	import { supabase } from '$lib/services/supabaseClient';

	type NavIcon = 'dashboard' | 'classes' | 'assessments' | 'subjects' | 'legacy';
	type NavItem = {
		label: string;
		href: string;
		description: string;
		icon: NavIcon;
		match: (pathname: string, hash: string) => boolean;
	};

	let { children } = $props();

	let mobileNavOpen = $state(false);

	const teacherDashboardHref = resolve('/teacher');
	const navItems: NavItem[] = [
		{
			label: 'Dashboard',
			href: teacherDashboardHref,
			description: 'Visao geral do professor',
			icon: 'dashboard',
			match: (pathname, hash) => pathname === '/teacher' && hash !== '#teacher-classes-section'
		},
		{
			label: 'Turmas',
			href: `${teacherDashboardHref}#teacher-classes-section`,
			description: 'Cards e operacao por turma',
			icon: 'classes',
			match: (pathname, hash) => pathname === '/teacher' && hash === '#teacher-classes-section'
		},
		{
			label: 'Avaliacoes',
			href: resolve('/teacher/assessments'),
			description: 'Rascunho, revisao e publicacao',
			icon: 'assessments',
			match: (pathname) => pathname.startsWith('/teacher/assessments')
		},
		{
			label: 'Materias',
			href: resolve('/teacher/subjects'),
			description: 'Catalogo e vinculos formais',
			icon: 'subjects',
			match: (pathname) => pathname.startsWith('/teacher/subjects')
		},
		{
			label: 'Importacao legada',
			href: resolve('/teacher/import'),
			description: 'Fluxo auxiliar por CSV',
			icon: 'legacy',
			match: (pathname) => pathname.startsWith('/teacher/import')
		}
	];

	const pathname = $derived($page.url.pathname);
	const hash = $derived($page.url.hash);
	const profile = $derived($page.data.profile as { id: string; display_name: string } | undefined);
	const teacherName = $derived(profile?.display_name?.trim() || 'Professor');
	const teacherInitials = $derived.by(() => {
		const parts = teacherName.split(/\s+/).filter(Boolean).slice(0, 2);
		return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'PR';
	});

	function isActive(item: NavItem, currentPathname: string, currentHash: string) {
		return item.match(currentPathname, currentHash);
	}

	function closeMobileNav() {
		mobileNavOpen = false;
	}

	async function handleLogout() {
		await supabase.auth.signOut();
		await invalidateAll();
		await goto(resolve('/login'));
	}
</script>

<DisplayNamePrompt
	profileId={$page.data.profile.id}
	displayName={$page.data.profile.display_name}
	tone="teacher"
/>

<svelte:head>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="min-h-screen bg-slate-50 text-slate-900">
	<div class="grid min-h-screen lg:grid-cols-[272px_1fr]">
		<aside class="hidden border-r border-slate-200 bg-white lg:flex lg:flex-col">
			<div class="border-b border-slate-200 p-6">
				<a href={resolve('/')} class="flex items-center gap-4">
					<div
						class="flex h-14 w-14 items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 shadow-sm"
					>
						<img src={ciIcon} alt="" class="h-8 w-8 object-contain" />
					</div>

					<div class="min-w-0">
						<p class="text-xl font-black tracking-tight text-slate-950">Class Insights</p>
						<p class="mt-1 text-sm font-semibold text-slate-500">Painel do professor</p>
					</div>
				</a>
			</div>

			<nav class="flex-1 px-4 py-6">
				<div class="space-y-2">
					{#each navItems as item (item.label)}
						{@const active = isActive(item, pathname, hash)}
						<a
							href={item.href}
							aria-current={active ? 'page' : undefined}
							class={`group flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${
								active
									? 'border-slate-200 bg-slate-100 text-slate-950 shadow-sm'
									: 'border-transparent bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900'
							}`}
						>
							<span
								class={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition ${
									active
										? 'bg-slate-900 text-white'
										: 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
								}`}
							>
								<TeacherNavItemIcon icon={item.icon} />
							</span>

							<div class="min-w-0">
								<p class="truncate text-base font-bold tracking-tight">{item.label}</p>
								<p class="mt-1 text-sm text-slate-500">{item.description}</p>
							</div>
						</a>
					{/each}
				</div>
			</nav>

			<div class="mt-auto border-t border-slate-200 p-4">
				<button
					type="button"
					class="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
					onclick={handleLogout}
				>
					Sair da conta
				</button>
			</div>
		</aside>

		<div class="flex min-w-0 flex-col">
			<header class="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
				<div class="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
					<div class="flex min-w-0 items-center gap-3">
						<button
							type="button"
							class="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 lg:hidden"
							onclick={() => (mobileNavOpen = true)}
							aria-label="Abrir navegacao"
						>
							<svg
								class="h-5 w-5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="2"
							>
								<path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M4 12h16M4 17h16" />
							</svg>
						</button>

						<div class="lg:hidden">
							<p class="text-xs font-black uppercase tracking-widest text-slate-500">Professor</p>
							<p class="text-lg font-black tracking-tight text-slate-950">Class Insights</p>
						</div>

						<nav class="hidden lg:flex lg:flex-wrap lg:items-center lg:gap-2">
							{#each navItems as item (item.label)}
								{@const active = isActive(item, pathname, hash)}
								<a
									href={item.href}
									aria-current={active ? 'page' : undefined}
									class={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
										active
											? 'border-slate-200 bg-slate-100 text-slate-950'
											: 'border-transparent bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900'
									}`}
								>
									<TeacherNavItemIcon icon={item.icon} class="h-4 w-4" />
									<span>{item.label}</span>
								</a>
							{/each}
						</nav>
					</div>

					<div class="flex items-center gap-3">
						<div
							class="hidden items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm sm:flex"
						>
							<span
								class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white"
							>
								{teacherInitials}
							</span>
							<div class="min-w-0">
								<p class="text-sm font-bold text-slate-950">{teacherName}</p>
								<p class="text-xs text-slate-500">Sessao ativa</p>
							</div>
						</div>

						<button
							type="button"
							class="hidden sm:inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
							onclick={handleLogout}
						>
							Sair
						</button>
					</div>
				</div>
			</header>

			{#if mobileNavOpen}
				<div class="fixed inset-0 z-40 lg:hidden">
					<button
						type="button"
						class="absolute inset-0 bg-slate-950/35 backdrop-blur-sm"
						onclick={closeMobileNav}
						aria-label="Fechar navegacao"
					></button>

					<div
						class="absolute left-0 top-0 flex h-full w-[320px] max-w-[88vw] flex-col border-r border-slate-200 bg-white shadow-2xl"
					>
						<div class="flex items-center justify-between border-b border-slate-200 p-5">
							<a href={resolve('/')} class="flex items-center gap-3" onclick={closeMobileNav}>
								<div
									class="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 shadow-sm"
								>
									<img src={ciIcon} alt="" class="h-7 w-7 object-contain" />
								</div>

								<div>
									<p class="text-lg font-black tracking-tight text-slate-950">Class Insights</p>
									<p class="text-sm text-slate-500">Painel do professor</p>
								</div>
							</a>

							<button
								type="button"
								class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
								onclick={closeMobileNav}
								aria-label="Fechar navegacao"
							>
								<svg
									class="h-5 w-5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									stroke-width="2"
								>
									<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
								</svg>
							</button>
						</div>

						<nav class="flex-1 p-5">
							<div class="space-y-3">
								{#each navItems as item (item.label)}
									{@const active = isActive(item, pathname, hash)}
									<a
										href={item.href}
										class={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${
											active
												? 'border-slate-200 bg-slate-100 text-slate-950'
												: 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
										}`}
										onclick={closeMobileNav}
									>
										<span
											class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"
										>
											<TeacherNavItemIcon icon={item.icon} />
										</span>

										<div class="min-w-0">
											<p class="text-base font-bold tracking-tight">{item.label}</p>
											<p class="mt-1 text-sm text-slate-500">{item.description}</p>
										</div>
									</a>
								{/each}
							</div>
						</nav>

						<div class="border-t border-slate-200 p-5">
							<div class="rounded-3xl border border-slate-200 bg-slate-50 p-4">
								<p class="text-base font-black text-slate-950">{teacherName}</p>
								<p class="mt-2 text-sm leading-7 text-slate-600">
									Voce pode sair da conta a qualquer momento por aqui.
								</p>
							</div>

							<button
								type="button"
								class="mt-4 inline-flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
								onclick={handleLogout}
							>
								Sair da conta
							</button>
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
