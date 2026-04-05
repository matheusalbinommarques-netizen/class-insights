<!-- eslint-disable svelte/no-navigation-without-resolve -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import ciIcon from '$lib/assets/ci-icon.png';
	import DisplayNamePrompt from '$lib/components/DisplayNamePrompt.svelte';

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
			profile: {
				id: string;
				display_name: string;
			};
		};
	};

	let { children, data }: Props = $props();

	const links = [
		{ href: '/student', label: 'Início', description: 'Panorama do momento' },
		{ href: '/student/journey', label: 'Trajetória', description: 'Histórico publicado' },
		{ href: '/student/skills', label: 'Matérias', description: 'Leitura por matéria' }
	];

	const pathname = $derived($page.url.pathname);
	const redirectTo = $derived(`${$page.url.pathname}${$page.url.search}`);

	const enrollments = $derived(($page.data.enrollments ?? []) as Enrollment[]);
	const selectableEnrollments = $derived(enrollments.filter((item) => item.isSelectable));
	const activeEnrollment = $derived(
		enrollments.find((item) => item.isCurrent) ?? selectableEnrollments[0] ?? null
	);

	const isActive = (href: string) => {
		if (href === '/student') return $page.url.pathname === '/student';
		return $page.url.pathname.startsWith(href);
	};

	const sectionCopy = (value: string) => {
		if (value.startsWith('/student/journey')) {
			return {
				title: 'Sua trajetória',
				description: 'Entenda como suas publicações recentes construíram o momento atual.'
			};
		}

		if (value.startsWith('/student/skills')) {
			return {
				title: 'Suas matérias',
				description: 'Veja onde você está bem, o que ainda não foi publicado e onde vale revisar.'
			};
		}

		return {
			title: 'Panorama do momento',
			description: 'Comece pelo que importa agora e aprofunde quando quiser.'
		};
	};

	const currentSection = $derived(sectionCopy(pathname));
</script>

<DisplayNamePrompt
	profileId={data.profile.id}
	displayName={data.profile.display_name}
	tone="student"
/>

<svelte:head>
	<title>Class Insights - Aluno</title>
</svelte:head>

<div
	class="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]"
>
	<div class="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
		<header
			class="rounded-4xl border border-slate-200 bg-white/90 px-5 py-5 shadow-sm backdrop-blur sm:px-6"
		>
			<div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
				<div class="flex items-start gap-4">
					<div
						class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-sky-200 bg-white shadow-lg shadow-sky-900/10"
					>
						<img src={ciIcon} alt="" class="h-8 w-8 object-contain" />
					</div>

					<div class="min-w-0">
						<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">Aluno</p>
						<h1 class="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
							{currentSection.title}
						</h1>
						<p class="mt-2 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
							{currentSection.description}
						</p>
					</div>
				</div>

				<div class="grid gap-3 lg:min-w-[320px]">
					<div class="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
						<p class="text-xs font-black uppercase tracking-[0.24em] text-sky-700">Turma ativa</p>
						<p class="mt-2 text-base font-black tracking-tight">
							{activeEnrollment?.className ?? 'Aguardando vínculo'}
						</p>
						<p class="mt-1 text-sm leading-6 text-slate-600">
							{activeEnrollment
								? 'Essa é a turma usada para sua leitura atual.'
								: 'Quando um vínculo estiver ativo, ele aparecerá aqui.'}
						</p>
					</div>

					<div
						class="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700"
					>
						<span class="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
						<span>Progresso pessoal</span>
					</div>
				</div>
			</div>

			{#if selectableEnrollments.length > 1}
				<form
					method="POST"
					action="/student/switch-enrollment"
					class="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:flex-row lg:items-end"
				>
					<div class="min-w-0 flex-1">
						<label
							for="enrollmentId"
							class="block text-xs font-black uppercase tracking-[0.24em] text-slate-500"
						>
							Trocar turma ativa
						</label>

						<select
							id="enrollmentId"
							name="enrollmentId"
							class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
						>
							{#each selectableEnrollments as enrollment (enrollment.enrollmentId)}
								<option
									value={enrollment.enrollmentId}
									selected={activeEnrollment?.enrollmentId === enrollment.enrollmentId}
								>
									{enrollment.className}
								</option>
							{/each}
						</select>
					</div>

					<input type="hidden" name="redirectTo" value={redirectTo} />

					<button
						type="submit"
						class="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800"
					>
						Aplicar turma
					</button>
				</form>
			{/if}
		</header>

		<nav class="mt-6 grid gap-3 md:grid-cols-3">
			{#each links as link (link.href)}
				<a
					href={link.href}
					class={`rounded-[1.5rem] border px-4 py-4 transition ${
						isActive(link.href)
							? 'border-sky-200 bg-sky-50 shadow-sm'
							: 'border-slate-200 bg-white/80 hover:border-slate-300 hover:bg-white'
					}`}
					aria-current={isActive(link.href) ? 'page' : undefined}
				>
					<p class="text-base font-black tracking-tight text-slate-950">{link.label}</p>
					<p class="mt-1 text-sm leading-6 text-slate-600">{link.description}</p>
				</a>
			{/each}
		</nav>

		<main class="min-w-0 flex-1 py-6">
			{@render children()}
		</main>
	</div>
</div>
