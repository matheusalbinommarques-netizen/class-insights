<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import type { Snippet } from 'svelte';

	import ciIcon from '$lib/assets/ci-icon.png';
	import DisplayNamePrompt from '$lib/components/DisplayNamePrompt.svelte';
	import { supabase } from '$lib/services/supabaseClient';

	type Enrollment = {
		enrollmentId: string;
		studentId: string;
		classId: string;
		teacherId: string;
		status: 'pending' | 'active' | 'archived';
		joinedAt: string | null;
		leftAt: string | null;
		studentName: string;
		className: string;
		isCurrent: boolean;
		isSelectable: boolean;
	};

	type Props = {
		children: Snippet;
		data: {
			profile?: {
				id?: string;
				display_name?: string | null;
			} | null;
		};
	};

	type NavItem = {
		label: string;
		href: string;
		match: (pathname: string) => boolean;
	};

	let { children, data }: Props = $props();

	let mobileNavOpen = $state(false);

	const navItems: NavItem[] = [
		{
			label: 'Início',
			href: resolve('/student'),
			match: (pathname) => pathname === '/student'
		},
		{
			label: 'Trajetória',
			href: resolve('/student/journey'),
			match: (pathname) => pathname.startsWith('/student/journey')
		},
		{
			label: 'Matérias',
			href: resolve('/student/skills'),
			match: (pathname) => pathname.startsWith('/student/skills')
		}
	];

	const pathname = $derived($page.url.pathname);
	const redirectTo = $derived(`${$page.url.pathname}${$page.url.search}`);

	const enrollments = $derived(($page.data.enrollments ?? []) as Enrollment[]);
	const selectableEnrollments = $derived(enrollments.filter((item) => item.isSelectable));
	const activeEnrollment = $derived(
		enrollments.find((item) => item.isCurrent) ?? selectableEnrollments[0] ?? null
	);

	const currentNavItem = $derived(
		navItems.find((item) => item.match($page.url.pathname)) ?? navItems[0]
	);

	const currentSectionTitle = $derived(currentNavItem.label);

	const currentSectionDescription = $derived.by(() => {
		if (currentNavItem.href === resolve('/student/journey')) {
			return 'Acompanhe sua evolução recente e entenda o que mudou.';
		}

		if (currentNavItem.href === resolve('/student/skills')) {
			return 'Veja a situação atual de cada matéria com leitura clara.';
		}

		return 'Entenda sua situação atual com base nas publicações disponíveis.';
	});

	function isActive(item: NavItem, currentPathname: string) {
		return item.match(currentPathname);
	}

	function closeMobileNav() {
		mobileNavOpen = false;
	}

	async function handleLogout() {
		await supabase.auth.signOut();
		await invalidateAll();
		await goto('/login');
	}
</script>

<svelte:head>
	<title>Class Insights - Área do aluno</title>
</svelte:head>

<div
	class="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#eff6ff_100%)]"
>
	<div class="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
		<header
			class="rounded-4xl border border-sky-100 bg-white/90 px-5 py-5 shadow-sm backdrop-blur sm:px-6"
		>
			<div class="flex flex-col gap-5">
				<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
					<div class="flex min-w-0 items-start gap-4">
						<div
							class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-sky-200 bg-white shadow-lg shadow-sky-900/5"
						>
							<img src={ciIcon} alt="" class="h-8 w-8 object-contain" />
						</div>

						<div class="min-w-0">
							<p class="text-xs font-black uppercase tracking-[0.32em] text-slate-500">
								Área do aluno
							</p>

							<h1 class="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
								{currentSectionTitle}
							</h1>

							<p class="mt-2 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
								{currentSectionDescription}
							</p>
						</div>
					</div>

					<div class="flex flex-wrap items-center gap-3 lg:justify-end">
						{#if activeEnrollment}
							<div
								class="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900"
							>
								<p class="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">
									Turma ativa
								</p>
								<p class="mt-1 font-bold">{activeEnrollment.className}</p>
							</div>
						{:else}
							<div
								class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
							>
								<p class="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
									Turma ativa
								</p>
								<p class="mt-1 font-bold">Nenhum vínculo ativo</p>
							</div>
						{/if}

						<button
							type="button"
							class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 lg:hidden"
							onclick={() => (mobileNavOpen = !mobileNavOpen)}
							aria-expanded={mobileNavOpen}
							aria-controls="student-primary-nav"
						>
							Menu
						</button>

						<button
							type="button"
							class="hidden h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 lg:inline-flex"
							onclick={handleLogout}
						>
							Sair
						</button>
					</div>
				</div>

				<nav
					id="student-primary-nav"
					class:hidden={!mobileNavOpen}
					class="grid gap-3 lg:block"
					aria-label="Navegação principal do aluno"
				>
					<div
						class="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between"
					>
						<div class="grid gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap">
							{#each navItems as item (item.href)}
								<a
									href={item.href}
									class={`inline-flex h-11 items-center justify-center rounded-2xl border px-4 text-sm font-black transition ${
										isActive(item, pathname)
											? 'border-sky-200 bg-sky-50 text-sky-700'
											: 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
									}`}
									aria-current={isActive(item, pathname) ? 'page' : undefined}
									onclick={closeMobileNav}
								>
									{item.label}
								</a>
							{/each}
						</div>

						<div class="flex flex-col gap-3 lg:flex-row lg:items-center">
							{#if selectableEnrollments.length > 1}
								<form
									method="POST"
									action={resolve('/student/switch-enrollment')}
									class="flex flex-col gap-2 sm:flex-row sm:items-center"
								>
									<input type="hidden" name="redirectTo" value={redirectTo} />

									<label
										for="student-active-enrollment"
										class="text-xs font-black uppercase tracking-[0.18em] text-slate-500"
									>
										Trocar turma
									</label>

									<select
										id="student-active-enrollment"
										name="enrollmentId"
										class="h-11 min-w-55 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
										onchange={(event) => {
											const form = (event.currentTarget as HTMLSelectElement).form;
											form?.requestSubmit();
										}}
									>
										{#each selectableEnrollments as enrollment (enrollment.enrollmentId)}
											<option value={enrollment.enrollmentId} selected={enrollment.isCurrent}>
												{enrollment.className}
											</option>
										{/each}
									</select>
								</form>
							{:else if activeEnrollment}
								<div
									class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
								>
									<p class="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
										Vínculo atual
									</p>
									<p class="mt-1 font-bold">{activeEnrollment.className}</p>
								</div>
							{/if}

							<button
								type="button"
								class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 lg:hidden"
								onclick={handleLogout}
							>
								Sair
							</button>
						</div>
					</div>
				</nav>
			</div>
		</header>

		<DisplayNamePrompt
			profileId={data.profile?.id}
			displayName={data.profile?.display_name}
			tone="student"
		/>

		<main class="mt-6 flex-1">
			{@render children()}
		</main>
	</div>
</div>

<style>
	:global(html) {
		scroll-behavior: smooth;
	}
</style>
