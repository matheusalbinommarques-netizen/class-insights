<script lang="ts">
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import type {
		TeacherAssessmentAnalyticsCard,
		TeacherAssessmentCard,
		TeacherClassOption,
		TeacherSchemaState,
		TeacherSubjectOption
	} from '$lib/types/teacher';

	type AssessmentFeedback = {
		action?: 'createAssessment';
		message?: string;
		success?: boolean;
	};

	type Props = {
		data: {
			schema: TeacherSchemaState;
			classes: TeacherClassOption[];
			subjects: TeacherSubjectOption[];
			assessments: TeacherAssessmentCard[];
			analytics: TeacherAssessmentAnalyticsCard[];
			summary: {
				total: number;
				draft: number;
				published: number;
			};
		};
	};

	let { data }: Props = $props();

	const formState = $derived(($page.form ?? null) as AssessmentFeedback | null);
	const formMessage = $derived(formState?.message ?? null);
	const formSuccess = $derived(formState?.success ?? false);

	let selectedClassId = $state('');

	const availableSubjects = $derived.by(() =>
		data.subjects.filter((subject) =>
			selectedClassId ? subject.classIds.includes(selectedClassId) : true
		)
	);

	$effect(() => {
		if (!selectedClassId && data.classes[0]) {
			selectedClassId = data.classes[0].id;
		}
	});

	function formatDate(value: string | null) {
		if (!value) return 'Nao publicado';

		const date = new Date(`${value}T00:00:00`);
		if (Number.isNaN(date.getTime())) return value;

		return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(date);
	}

	function statusBadgeClass(status: TeacherAssessmentCard['status']) {
		return status === 'published'
			? 'border-emerald-200 bg-emerald-50 text-emerald-700'
			: 'border-amber-200 bg-amber-50 text-amber-700';
	}

	function resultsSummary(assessment: TeacherAssessmentCard) {
		if (assessment.totalResults === 0) {
			return 'Nenhum lancamento ainda';
		}

		const suffix =
			assessment.excusedResults > 0 ? ` - ${assessment.excusedResults} dispensa(s)` : '';
		return `${assessment.filledResults} resultado(s) salvo(s)${suffix}`;
	}

	function formatScore(value: number | null) {
		if (typeof value !== 'number') return '--';
		return (value / 10).toFixed(1);
	}

	function analyticsToneClass(tone: TeacherAssessmentAnalyticsCard['tone']) {
		if (tone === 'healthy') return 'border-emerald-200 bg-emerald-50';
		if (tone === 'attention') return 'border-amber-200 bg-amber-50';
		if (tone === 'critical') return 'border-red-200 bg-red-50';
		return 'border-slate-200 bg-slate-50';
	}

	function analyticsToneLabel(tone: TeacherAssessmentAnalyticsCard['tone']) {
		if (tone === 'healthy') return 'Saudavel';
		if (tone === 'attention') return 'Atencao';
		if (tone === 'critical') return 'Critica';
		return 'Pendente';
	}

	function consistencyLabel(band: TeacherAssessmentAnalyticsCard['consistencyBand']) {
		if (band === 'consistent') return 'Consistente';
		if (band === 'mixed') return 'Mista';
		if (band === 'spread') return 'Muito dispersa';
		return 'Sem base';
	}

	function consistencyClass(band: TeacherAssessmentAnalyticsCard['consistencyBand']) {
		if (band === 'consistent') return 'text-emerald-700';
		if (band === 'mixed') return 'text-amber-700';
		if (band === 'spread') return 'text-red-700';
		return 'text-slate-500';
	}
</script>

<svelte:head>
	<title>Avaliacoes - Class Insights</title>
</svelte:head>

<div class="space-y-6">
	<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
		<div class="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
			<div class="max-w-3xl">
				<p class="text-xs font-black uppercase tracking-widest text-slate-500">
					Nucleo operacional
				</p>
				<h1 class="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
					Avaliacoes da V1
				</h1>
				<p class="mt-3 text-base leading-8 text-slate-600">
					Esta area consolida o fluxo academico formal do produto: avaliacao, rascunho, revisao e
					publicacao. Agora o professor opera com contexto de turma e materia, sem depender do
					modelo legado para conduzir a rotina principal.
				</p>
			</div>

			<div class="grid gap-3 sm:grid-cols-3 xl:w-full xl:max-w-xl">
				<div class="rounded-2xl border border-slate-200 bg-white p-4">
					<p class="text-xs font-black uppercase tracking-widest text-slate-500">Total</p>
					<p class="mt-2 text-3xl font-black text-slate-950">{data.summary.total}</p>
				</div>

				<div class="rounded-2xl border border-amber-200 bg-amber-50 p-4">
					<p class="text-xs font-black uppercase tracking-widest text-amber-700">Rascunho</p>
					<p class="mt-2 text-3xl font-black text-slate-950">{data.summary.draft}</p>
				</div>

				<div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
					<p class="text-xs font-black uppercase tracking-widest text-emerald-700">Publicadas</p>
					<p class="mt-2 text-3xl font-black text-slate-950">{data.summary.published}</p>
				</div>
			</div>
		</div>
	</section>

	{#if formMessage}
		<div
			class={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
				formSuccess
					? 'border-emerald-200 bg-emerald-50 text-emerald-700'
					: 'border-red-200 bg-red-50 text-red-700'
			}`}
		>
			{formMessage}
		</div>
	{/if}

	{#if !data.schema.ready}
		<section class="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
			<p class="text-xs font-black uppercase tracking-widest text-amber-700">Schema pendente</p>
			<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
				A base academica ainda nao esta ativa neste ambiente
			</h2>
			<p class="mt-3 text-sm leading-7 text-slate-700">
				{data.schema.message}
			</p>
			<p class="mt-3 text-sm leading-7 text-slate-700">
				Os proximos passos sao criar `subjects`, `class_subjects` e `assessments`, depois plugar a
				publicacao e o longitudinal em cima dessas tabelas.
			</p>
		</section>
	{:else}
		<div class="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
			<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
				<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
					<div>
						<p class="text-xs font-black uppercase tracking-widest text-slate-500">
							Criar avaliacao
						</p>
						<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">Novo rascunho</h2>
					</div>

					<a
						href={resolve('/teacher')}
						class="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
					>
						Voltar ao dashboard
					</a>
				</div>

				{#if data.classes.length === 0}
					<div
						class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"
					>
						<h3 class="text-lg font-black text-slate-950">Crie uma turma antes de avaliar</h3>
						<p class="mt-2 text-sm leading-7 text-slate-600">
							A area de avaliacoes depende de uma turma ja criada e, na V1, tambem de uma materia
							vinculada.
						</p>
					</div>
				{:else}
					<form method="POST" action="?/createAssessment" class="mt-5 space-y-4">
						<div class="grid gap-4 md:grid-cols-2">
							<label class="space-y-2 text-sm font-bold text-slate-700">
								<span>Turma</span>
								<select
									name="class_id"
									bind:value={selectedClassId}
									class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
								>
									{#each data.classes as classItem (classItem.id)}
										<option value={classItem.id}>{classItem.name}</option>
									{/each}
								</select>
							</label>

							<label class="space-y-2 text-sm font-bold text-slate-700">
								<span>Materia</span>
								<select
									name="subject_id"
									class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
									disabled={availableSubjects.length === 0}
								>
									{#if availableSubjects.length === 0}
										<option value="">Nenhuma materia vinculada</option>
									{:else}
										{#each availableSubjects as subject (subject.id)}
											<option value={subject.id}>
												{subject.name}{subject.code ? ` (${subject.code})` : ''}
											</option>
										{/each}
									{/if}
								</select>
							</label>
						</div>

						{#if availableSubjects.length === 0}
							<div
								class="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-800"
							>
								Esta turma ainda nao possui materia vinculada. Primeiro organize isso em
								<a href={resolve('/teacher/subjects')} class="font-bold underline"> Matérias </a>
								, depois volte para criar a avaliacao.
							</div>
						{/if}

						<div class="grid gap-4 md:grid-cols-[1.4fr_0.8fr_0.6fr]">
							<label class="space-y-2 text-sm font-bold text-slate-700">
								<span>Titulo</span>
								<input
									name="title"
									placeholder="Ex: Prova 1, Quiz diagnostico, Redacao"
									class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
								/>
							</label>

							<label class="space-y-2 text-sm font-bold text-slate-700">
								<span>Data</span>
								<input
									name="assessment_date"
									type="date"
									class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
								/>
							</label>

							<label class="space-y-2 text-sm font-bold text-slate-700">
								<span>Peso</span>
								<input
									name="weight"
									type="number"
									min="0.1"
									step="0.1"
									value="1"
									class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
								/>
							</label>
						</div>

						<div
							class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600"
						>
							Toda avaliacao nova entra como <strong class="text-slate-950">rascunho</strong>.
							Depois, o professor revisa os resultados por aluno e publica quando a leitura oficial
							estiver pronta.
						</div>

						<button
							type="submit"
							class="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
							disabled={availableSubjects.length === 0}
						>
							Criar avaliacao
						</button>
					</form>
				{/if}
			</section>

			<div class="space-y-6">
				<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<p class="text-xs font-black uppercase tracking-widest text-slate-500">
						Leitura por avaliacao
					</p>
					<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
						O que as avaliacoes ja estao contando
					</h2>
					<p class="mt-2 text-sm leading-7 text-slate-600">
						Este resumo cruza cobertura, media normalizada, risco e dispersao para cada avaliacao
						sem depender de score agregado legado.
					</p>

					{#if data.analytics.length === 0}
						<div
							class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"
						>
							<h3 class="text-lg font-black text-slate-950">Sem sinais analiticos ainda</h3>
							<p class="mt-2 text-sm leading-7 text-slate-600">
								Assim que surgirem resultados nas avaliacoes, esta area passa a resumir cobertura,
								media, risco e dispersao por item.
							</p>
						</div>
					{:else}
						<div class="mt-5 grid gap-3">
							{#each data.analytics.slice(0, 6) as item (item.id)}
								<article class={`rounded-2xl border p-4 ${analyticsToneClass(item.tone)}`}>
									<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
										<div class="min-w-0">
											<div class="flex flex-wrap items-center gap-2">
												<p class="text-base font-black text-slate-950">{item.title}</p>
												<span
													class="rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-slate-700"
												>
													{analyticsToneLabel(item.tone)}
												</span>
											</div>
											<p class="mt-2 text-sm leading-7 text-slate-600">
												{item.className} • {item.subjectName}
											</p>
											<p class="text-sm leading-7 text-slate-600">
												{item.status === 'published' ? 'Publicado' : 'Rascunho'} em {formatDate(
													item.assessmentDate
												)}
											</p>
										</div>

										<a
											href={resolve(`/teacher/assessments/${item.id}`)}
											class="inline-flex h-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-100"
										>
											Abrir avaliacao
										</a>
									</div>

									<div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
										<div class="rounded-2xl border border-white/70 bg-white/80 p-3">
											<p class="text-xs font-black uppercase tracking-widest text-slate-500">
												Cobertura
											</p>
											<p class="mt-2 text-lg font-black text-slate-950">{item.coveragePercent}%</p>
										</div>
										<div class="rounded-2xl border border-white/70 bg-white/80 p-3">
											<p class="text-xs font-black uppercase tracking-widest text-slate-500">
												Media
											</p>
											<p class="mt-2 text-lg font-black text-slate-950">
												{formatScore(item.averagePercent)}
											</p>
										</div>
										<div class="rounded-2xl border border-white/70 bg-white/80 p-3">
											<p class="text-xs font-black uppercase tracking-widest text-slate-500">
												Risco forte
											</p>
											<p class="mt-2 text-lg font-black text-slate-950">{item.riskStudentsCount}</p>
										</div>
										<div class="rounded-2xl border border-white/70 bg-white/80 p-3">
											<p class="text-xs font-black uppercase tracking-widest text-slate-500">
												Abaixo de 60%
											</p>
											<p class="mt-2 text-lg font-black text-slate-950">{item.belowTargetCount}</p>
										</div>
										<div class="rounded-2xl border border-white/70 bg-white/80 p-3">
											<p class="text-xs font-black uppercase tracking-widest text-slate-500">
												Dispersao
											</p>
											<p class="mt-2 text-lg font-black text-slate-950">
												{formatScore(item.dispersionPercent)}
											</p>
											<p class={`mt-1 text-xs font-bold ${consistencyClass(item.consistencyBand)}`}>
												{consistencyLabel(item.consistencyBand)}
											</p>
										</div>
									</div>
								</article>
							{/each}
						</div>
					{/if}
				</section>

				<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<p class="text-xs font-black uppercase tracking-widest text-slate-500">Backlog vivo</p>
					<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
						Rascunhos ja criados
					</h2>

					{#if data.assessments.length === 0}
						<div
							class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"
						>
							<h3 class="text-lg font-black text-slate-950">Nenhuma avaliacao ainda</h3>
							<p class="mt-2 text-sm leading-7 text-slate-600">
								Assim que voce criar as primeiras avaliacoes, elas aparecem aqui com status e
								contexto de turma e materia.
							</p>
						</div>
					{:else}
						<div class="mt-5 space-y-3">
							{#each data.assessments as assessment (assessment.id)}
								<article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
									<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
										<div class="min-w-0">
											<div class="flex flex-wrap items-center gap-2">
												<p class="text-base font-black text-slate-950">{assessment.title}</p>
												<span
													class={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-widest ${statusBadgeClass(assessment.status)}`}
												>
													{assessment.status}
												</span>
											</div>
											<p class="mt-2 text-sm leading-7 text-slate-600">
												{assessment.className} • {assessment.subjectName}
											</p>
											<p class="mt-1 text-sm leading-7 text-slate-600">
												{resultsSummary(assessment)}
											</p>
										</div>

										<div class="text-right text-sm text-slate-600">
											<p>
												<strong class="text-slate-950">Data:</strong>
												{formatDate(assessment.assessmentDate)}
											</p>
											<p class="mt-1">
												<strong class="text-slate-950">Peso:</strong>
												{assessment.weight}
											</p>
											<p class="mt-1">
												<strong class="text-slate-950">Publicacao:</strong>
												{assessment.publishedAt ? formatDate(assessment.publishedAt) : 'Pendente'}
											</p>
											<a
												href={resolve(`/teacher/assessments/${assessment.id}`)}
												class="mt-3 inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-100"
											>
												Abrir avaliacao
											</a>
										</div>
									</div>
								</article>
							{/each}
						</div>
					{/if}
				</section>
			</div>
		</div>
	{/if}
</div>
