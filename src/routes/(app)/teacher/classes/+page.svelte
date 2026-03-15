<script lang="ts">
	import TeacherClassSummaryCard from '$lib/components/teacher/TeacherClassSummaryCard.svelte';
	import type {
		TeacherDashboardClassSummaryItem,
		TeacherDashboardRiskTone
	} from '$lib/types/teacher';
	import type { TeacherClassesPageData } from './+page.server';

	type Props = {
		data: TeacherClassesPageData;
	};

	type StatusFilter = 'all' | 'critical' | 'attention' | 'neutral';
	type SortOption = 'priority' | 'name' | 'average' | 'coverage' | 'trend';

	let { data }: Props = $props();

	let search = $state('');
	let statusFilter = $state<StatusFilter>('all');
	let sortBy = $state<SortOption>('priority');

	function parsePtBrNumber(raw: string) {
		const normalized = raw.replace(/\s+/g, '').replace(',', '.');
		const value = Number(normalized);
		return Number.isFinite(value) ? value : null;
	}

	function parsePublishedAverage(label: string) {
		const [rawAverage] = label.split('/');
		return parsePtBrNumber((rawAverage ?? '').trim());
	}

	function parseCoverage(label: string) {
		const value = Number(label.replace('%', '').trim());
		return Number.isFinite(value) ? value : null;
	}

	function parseTrend(label: string) {
		if (!label || label.trim().toLowerCase() === 'estavel') return 0;
		return parsePtBrNumber(label.replace('+', '').trim()) ?? 0;
	}

	function severityRank(statusTone: TeacherDashboardRiskTone) {
		if (statusTone === 'critical') return 0;
		if (statusTone === 'attention') return 1;
		return 2;
	}

	function toneBadgeClass(statusTone: TeacherDashboardRiskTone) {
		if (statusTone === 'critical') {
			return 'border-red-200 bg-red-50 text-red-700';
		}

		if (statusTone === 'attention') {
			return 'border-amber-200 bg-amber-50 text-amber-700';
		}

		return 'border-emerald-200 bg-emerald-50 text-emerald-700';
	}

	function toneLabel(statusTone: TeacherDashboardRiskTone) {
		if (statusTone === 'critical') return 'Em risco';
		if (statusTone === 'attention') return 'Atenção';
		return 'Saudável';
	}

	function summaryMetricClass(tone: 'neutral' | 'attention' | 'critical') {
		if (tone === 'critical') return 'border-red-200 bg-red-50';
		if (tone === 'attention') return 'border-amber-200 bg-amber-50';
		return 'border-slate-200 bg-white';
	}

	function summaryMetricValueClass(tone: 'neutral' | 'attention' | 'critical') {
		if (tone === 'critical') return 'text-red-600';
		if (tone === 'attention') return 'text-amber-600';
		return 'text-slate-950';
	}

	function nextStepText(classItem: TeacherDashboardClassSummaryItem) {
		if (classItem.statusTone === 'critical') {
			return 'Há sinais fortes de risco nesta turma. Vale abrir a turma e revisar cobertura, alunos em queda e publicações recentes.';
		}

		if (classItem.statusTone === 'attention') {
			return 'Esta turma pede revisão breve. Confira matérias abaixo da referência e possíveis lacunas de publicação.';
		}

		if (parseTrend(classItem.trendLabel) < 0) {
			return 'A tendência recente caiu. Vale conferir as últimas avaliações para entender onde a turma perdeu ritmo.';
		}

		return 'A turma está estável no momento e pode servir como referência de comparação com as demais.';
	}

	const filteredClasses = $derived.by(() => {
		const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');

		const items = data.classesSummary.filter((item) => {
			const matchesSearch =
				normalizedSearch.length === 0 ||
				item.className.toLocaleLowerCase('pt-BR').includes(normalizedSearch) ||
				item.tags.some((tag) => tag.toLocaleLowerCase('pt-BR').includes(normalizedSearch));

			const matchesStatus = statusFilter === 'all' || item.statusTone === statusFilter;

			return matchesSearch && matchesStatus;
		});

		return [...items].sort((a, b) => {
			if (sortBy === 'name') {
				return a.className.localeCompare(b.className, 'pt-BR');
			}

			if (sortBy === 'average') {
				return (
					(parsePublishedAverage(a.publishedAverageLabel) ?? 0) -
					(parsePublishedAverage(b.publishedAverageLabel) ?? 0)
				);
			}

			if (sortBy === 'coverage') {
				return (parseCoverage(a.coverageLabel) ?? 0) - (parseCoverage(b.coverageLabel) ?? 0);
			}

			if (sortBy === 'trend') {
				return parseTrend(a.trendLabel) - parseTrend(b.trendLabel);
			}

			const severityDiff = severityRank(a.statusTone) - severityRank(b.statusTone);
			if (severityDiff !== 0) return severityDiff;

			const trendDiff = parseTrend(a.trendLabel) - parseTrend(b.trendLabel);
			if (trendDiff !== 0) return trendDiff;

			return a.className.localeCompare(b.className, 'pt-BR');
		});
	});

	const gridClass = $derived(filteredClasses.length > 1 ? 'xl:grid-cols-2' : 'grid-cols-1');
</script>

<svelte:head>
	<title>Class Insights - Turmas</title>
</svelte:head>

<div class="mx-auto w-full max-w-295 space-y-6">
	<section class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
		<div class="min-w-0">
			<h1
				class="text-[2.1rem] font-extrabold leading-[1.04] tracking-tight text-slate-950 lg:text-[2.7rem]"
			>
				Turmas
			</h1>

			<p class="mt-2 max-w-3xl text-[1rem] font-medium leading-7 text-slate-600 lg:text-[1.08rem]">
				Gerencie suas turmas, compare desempenho, cobertura e tendência, e descubra rápido onde vale
				agir primeiro.
			</p>
		</div>

		<div
			class="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm"
		>
			<span class="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
			<span>{data.syncLabel}</span>
		</div>
	</section>

	{#if data.error}
		<div
			class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
		>
			{data.error}
		</div>
	{/if}

	<section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
		<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
			{#each data.summaryMetrics as metric (`${metric.label}-${metric.value}`)}
				<div class={`rounded-2xl border px-4 py-4 ${summaryMetricClass(metric.tone)}`}>
					<p
						class={`text-[1.85rem] font-extrabold leading-none tracking-tight ${summaryMetricValueClass(metric.tone)}`}
					>
						{metric.value}
					</p>
					<p class="mt-2 text-[0.95rem] font-semibold leading-5 text-slate-700">
						{metric.label}
					</p>
				</div>
			{/each}
		</div>
	</section>

	{#if data.urgentClasses.length > 0}
		<section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
			<div class="mb-5 flex items-center justify-between gap-3">
				<div>
					<h2 class="text-2xl font-extrabold tracking-tight text-slate-950">
						Turmas que pedem ação
					</h2>
					<p class="mt-1 text-sm font-medium text-slate-500">
						As duas turmas mais prioritárias para revisão agora.
					</p>
				</div>
			</div>

			<div class="grid gap-4 xl:grid-cols-2">
				{#each data.urgentClasses as classItem (classItem.classId)}
					<article class="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
						<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
							<div class="min-w-0">
								<h3
									class="text-[1.6rem] font-extrabold leading-tight tracking-tight text-slate-950"
								>
									{classItem.className}
								</h3>

								<div class="mt-3 flex flex-wrap gap-2">
									<span
										class={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${toneBadgeClass(classItem.statusTone)}`}
									>
										{toneLabel(classItem.statusTone)}
									</span>

									{#if parseTrend(classItem.trendLabel) < 0}
										<span
											class="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700"
										>
											Tendência em queda
										</span>
									{/if}
								</div>
							</div>

							<a
								href={classItem.openHref}
								class="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700"
							>
								Abrir turma
							</a>
						</div>

						<div class="mt-5 grid grid-cols-3 gap-3">
							<div class="rounded-2xl border border-slate-200 bg-white px-4 py-3">
								<p class="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-500">
									Média
								</p>
								<p class="mt-2 text-[1.5rem] font-extrabold tracking-tight text-slate-950">
									{classItem.publishedAverageLabel}
								</p>
							</div>

							<div class="rounded-2xl border border-slate-200 bg-white px-4 py-3">
								<p class="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-500">
									Cobertura
								</p>
								<p class="mt-2 text-[1.5rem] font-extrabold tracking-tight text-slate-950">
									{classItem.coverageLabel}
								</p>
							</div>

							<div class="rounded-2xl border border-slate-200 bg-white px-4 py-3">
								<p class="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-500">
									Tendência
								</p>
								<p
									class={`mt-2 text-[1.5rem] font-extrabold tracking-tight ${
										parseTrend(classItem.trendLabel) < 0
											? 'text-red-600'
											: parseTrend(classItem.trendLabel) > 0
												? 'text-emerald-600'
												: 'text-slate-500'
									}`}
								>
									{classItem.trendLabel}
								</p>
							</div>
						</div>

						{#if classItem.tags.length > 0}
							<div class="mt-4 flex flex-wrap gap-2">
								{#each classItem.tags as tag (`${classItem.classId}-${tag}`)}
									<span
										class="inline-flex items-center rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700"
									>
										{tag}
									</span>
								{/each}
							</div>
						{/if}

						<div
							class={`mt-4 rounded-2xl border px-4 py-4 ${
								classItem.statusTone === 'critical'
									? 'border-red-200 bg-red-50'
									: classItem.statusTone === 'attention'
										? 'border-amber-200 bg-amber-50'
										: 'border-slate-200 bg-white'
							}`}
						>
							<p class="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-600">
								Próximo passo
							</p>
							<p class="mt-2 text-sm font-semibold leading-7 text-slate-900">
								{nextStepText(classItem)}
							</p>
						</div>
					</article>
				{/each}
			</div>
		</section>
	{/if}

	<section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
		<div class="mb-5">
			<h2 class="text-2xl font-extrabold tracking-tight text-slate-950">Todas as turmas</h2>
			<p class="mt-1 text-sm font-medium text-slate-500">
				Busque, filtre e compare suas turmas em um só lugar.
			</p>
		</div>

		<div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
			<label class="block">
				<span class="sr-only">Buscar turma</span>
				<input
					bind:value={search}
					type="text"
					placeholder="Buscar turma ou matéria..."
					class="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
				/>
			</label>

			<label class="block">
				<span class="sr-only">Filtrar status</span>
				<select
					bind:value={statusFilter}
					class="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white"
				>
					<option value="all">Todas as situações</option>
					<option value="critical">Em risco</option>
					<option value="attention">Atenção</option>
					<option value="neutral">Saudáveis</option>
				</select>
			</label>

			<label class="block">
				<span class="sr-only">Ordenar</span>
				<select
					bind:value={sortBy}
					class="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white"
				>
					<option value="priority">Ordenar por prioridade</option>
					<option value="name">Ordenar por nome</option>
					<option value="average">Menor média primeiro</option>
					<option value="coverage">Menor cobertura primeiro</option>
					<option value="trend">Pior tendência primeiro</option>
				</select>
			</label>
		</div>

		<div class="mt-5">
			{#if filteredClasses.length === 0}
				<div class="rounded-2xl border border-slate-200 bg-slate-50 p-6">
					<p class="text-lg font-bold text-slate-950">Nenhuma turma encontrada</p>
					<p class="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
						Ajuste a busca ou os filtros para encontrar uma turma específica.
					</p>
				</div>
			{:else}
				<div class={`grid gap-4 ${gridClass}`}>
					{#each filteredClasses as classItem (classItem.classId)}
						<TeacherClassSummaryCard {classItem} />
					{/each}
				</div>
			{/if}
		</div>
	</section>
</div>
