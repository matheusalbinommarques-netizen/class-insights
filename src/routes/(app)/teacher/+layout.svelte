<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import type { Snippet } from 'svelte';

	import ciIcon from '$lib/assets/ci-icon.png';
	import DisplayNamePrompt from '$lib/components/DisplayNamePrompt.svelte';
	import TeacherNavItemIcon from '$lib/components/teacher/TeacherNavItemIcon.svelte';
	import { supabase } from '$lib/services/supabaseClient';

	type NavIcon = 'dashboard' | 'classes' | 'assessments' | 'subjects' | 'legacy';

	type NavItem = {
		label: string;
		href: string;
		icon: NavIcon;
		match: (pathname: string) => boolean;
	};

	type Props = {
		children: Snippet;
		data: {
			profile?: {
				id?: string;
				display_name?: string | null;
			};
		};
	};

	let { children, data }: Props = $props();

	let mobileNavOpen = $state(false);

	const teacherDashboardHref = resolve('/teacher');
	const teacherClassesHref = resolve('/teacher/classes');

	const navItems: NavItem[] = [
		{
			label: 'Dashboard',
			href: teacherDashboardHref,
			icon: 'dashboard',
			match: (pathname) => pathname === '/teacher'
		},
		{
			label: 'Turmas',
			href: teacherClassesHref,
			icon: 'classes',
			match: (pathname) => pathname.startsWith('/teacher/classes')
		},
		{
			label: 'Avaliações',
			href: resolve('/teacher/assessments'),
			icon: 'assessments',
			match: (pathname) => pathname.startsWith('/teacher/assessments')
		},
		{
			label: 'Matérias',
			href: resolve('/teacher/subjects'),
			icon: 'subjects',
			match: (pathname) => pathname.startsWith('/teacher/subjects')
		}
	];

	function isActive(item: NavItem, pathname: string) {
		return item.match(pathname);
	}

	function closeMobileNav() {
		mobileNavOpen = false;
	}

	async function handleLogout() {
		await supabase.auth.signOut();
		await invalidateAll();
		await goto('/login');
	}

	function initialsFromName(name: string | null | undefined) {
		const safe = name?.trim();
		if (!safe) return 'P';

		const parts = safe.split(/\s+/).filter(Boolean);
		if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();

		return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
	}

	const displayName = $derived(data.profile?.display_name?.trim() || 'Professor');
	const avatarInitials = $derived(initialsFromName(displayName));
	const pathname = $derived($page.url.pathname);
</script>

<DisplayNamePrompt
	profileId={data.profile?.id}
	displayName={data.profile?.display_name}
	tone="teacher"
/>

<svelte:head>
	<title>Class Insights - Professor</title>
</svelte:head>

<div class="min-h-screen bg-slate-50 text-slate-900">
	<div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
		<div
			class="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-sky-200/20 blur-3xl"
		></div>
	</div>

	{#if mobileNavOpen}
		<button
			type="button"
			class="fixed inset-0 z-50 bg-slate-950/30 lg:hidden"
			onclick={closeMobileNav}
			aria-label="Fechar navegação"
		></button>

		<div
			class="fixed left-4 right-4 top-23 z-60 rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl lg:hidden"
		>
			<nav class="space-y-2">
				{#each navItems as item (item.label)}
					{@const active = isActive(item, pathname)}
					<a
						href={item.href}
						aria-current={active ? 'page' : undefined}
						class={`flex items-center gap-3 rounded-2xl px-4 py-3 text-[1rem] font-semibold transition ${
							active
								? 'bg-slate-100 text-slate-950'
								: 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
						}`}
						onclick={closeMobileNav}
					>
						<span
							class={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
								active ? 'bg-slate-900 text-white' : 'text-slate-500'
							}`}
						>
							<TeacherNavItemIcon icon={item.icon} />
						</span>
						<span class="truncate">{item.label}</span>
					</a>
				{/each}
			</nav>

			<div class="mt-4 border-t border-slate-200 pt-4">
				<button
					type="button"
					class="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
					onclick={handleLogout}
				>
					Sair da conta
				</button>
			</div>
		</div>
	{/if}

	<div class="flex min-h-screen flex-col">
		<header class="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
			<div class="mx-auto w-full max-w-295 px-4 sm:px-6 lg:px-8">
				<div class="flex min-h-23 items-center justify-between gap-4">
					<div class="flex min-w-0 items-center gap-3">
						<button
							type="button"
							class="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 lg:hidden"
							onclick={() => (mobileNavOpen = !mobileNavOpen)}
							aria-label="Abrir navegação"
						>
							<svg
								class="h-5 w-5"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M4 12h16M4 17h16" />
							</svg>
						</button>

						<a href={teacherDashboardHref} class="flex shrink-0 items-center">
							<img
								src={ciIcon}
								alt="Class Insights"
								class="block h-20 w-auto shrink-0 object-contain"
							/>
						</a>

						<nav class="ml-3 hidden min-w-0 items-center gap-7 lg:flex">
							{#each navItems as item (item.label)}
								{@const active = isActive(item, pathname)}
								<a
									href={item.href}
									aria-current={active ? 'page' : undefined}
									class={`inline-flex items-center gap-2 text-[1rem] font-semibold transition ${
										active ? 'text-slate-950' : 'text-slate-600 hover:text-slate-950'
									}`}
								>
									<span
										class={`flex h-5 w-5 items-center justify-center ${
											active ? 'text-slate-900' : 'text-slate-500'
										}`}
									>
										<TeacherNavItemIcon icon={item.icon} />
									</span>
									<span>{item.label}</span>
								</a>
							{/each}
						</nav>
					</div>

					<div class="ml-auto flex items-center gap-3">
						<div
							class="hidden items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm sm:flex"
						>
							<div
								class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white"
							>
								{avatarInitials}
							</div>

							<div class="leading-tight">
								<p class="text-[1rem] font-bold text-slate-950">{displayName}</p>
								<p class="mt-1 text-xs font-medium text-slate-500">Sessão ativa</p>
							</div>
						</div>

						<button
							type="button"
							class="hidden text-[1rem] font-medium text-slate-700 transition hover:text-slate-950 sm:inline-flex"
							onclick={handleLogout}
						>
							Sair
						</button>

						<button
							type="button"
							class="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
							aria-label="Notificações"
						>
							<svg
								class="h-5 w-5"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5"
								/>
								<path stroke-linecap="round" stroke-linejoin="round" d="M10 17a2 2 0 0 0 4 0" />
							</svg>
						</button>

						<button
							type="button"
							class="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
							aria-label="Mais opções"
						>
							<svg
								class="h-5 w-5"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" />
							</svg>
						</button>
					</div>
				</div>
			</div>
		</header>

		<main class="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
			{@render children()}
		</main>
	</div>
</div>
