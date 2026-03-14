<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import type { ActionResult, SubmitFunction } from '@sveltejs/kit';

	type Assessment = {
		id: string;
		class_id: string;
		subject_id: string;
		title: string;
		assessment_date: string;
		weight: number;
		status: 'draft' | 'published';
		published_at: string | null;
		published_by: string | null;
		class_name: string;
		class_score_min: number;
		class_score_max: number;
		class_score_decimals: number;
		subject_name: string;
		subject_code: string | null;
	};

	type Student = {
		id: string;
		name: string;
		invite_code: string | null;
	};

	type Result = {
		id: string;
		assessment_id: string;
		student_id: string;
		raw_score: number | null;
		score_min: number;
		score_max: number;
		score_decimals: number;
		is_excused: boolean;
		notes: string | null;
	};

	type AuditItem = {
		id: string;
		created_at: string;
		action_type: 'result_created' | 'result_updated' | 'result_deleted' | 'assessment_published';
		student_name: string | null;
		changed_by_name: string | null;
		previous_score: number | null;
		next_score: number | null;
		reason: string | null;
	};

	type ActionFeedback = {
		action?:
			| 'updateAssessment'
			| 'saveResult'
			| 'publishAssessment'
			| 'deleteAssessment'
			| 'createRevision';
		message?: string;
		success?: boolean;
		studentId?: string;
	};

	type Props = {
		data: {
			assessment: Assessment | null;
			students: Student[];
			results: Result[];
			audit: AuditItem[];
			summary: {
				totalStudents: number;
			};
		};
	};

	let { data }: Props = $props();

	const formState = $derived(($page.form ?? null) as ActionFeedback | null);
	const generalMessage = $derived(
		formState && formState.action !== 'saveResult' ? (formState.message ?? null) : null
	);
	const generalSuccess = $derived(formState?.success ?? false);

	let resultDrafts = $state<
		Record<
			string,
			{
				raw_score: string;
				notes: string;
				is_excused: boolean;
			}
		>
	>({});
	let initialized = false;
	let rowStatus = $state<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({});
	let rowErrors = $state<Record<string, string>>({});
	let searchQuery = $state('');
	let resultFilter = $state<'all' | 'pending' | 'filled' | 'excused'>('all');
	let bulkScore = $state('');
	let bulkNotes = $state('');
	let bulkExcused = $state(false);
	let savingVisible = $state(false);

	$effect(() => {
		if (initialized) return;

		resultDrafts = Object.fromEntries(
			data.students.map((student) => {
				const result = data.results.find((item) => item.student_id === student.id);

				return [
					student.id,
					{
						raw_score: typeof result?.raw_score === 'number' ? String(result.raw_score) : '',
						notes: result?.notes ?? '',
						is_excused: result?.is_excused ?? false
					}
				];
			})
		);
		initialized = true;
	});

	function draftFor(studentId: string) {
		return (
			resultDrafts[studentId] ?? {
				raw_score: '',
				notes: '',
				is_excused: false
			}
		);
	}

	function updateDraft(
		studentId: string,
		patch: Partial<{
			raw_score: string;
			notes: string;
			is_excused: boolean;
		}>
	) {
		resultDrafts = {
			...resultDrafts,
			[studentId]: {
				...draftFor(studentId),
				...patch
			}
		};
	}

	function setRowStatus(
		studentId: string,
		status: 'idle' | 'saving' | 'saved' | 'error',
		msg = ''
	) {
		rowStatus = { ...rowStatus, [studentId]: status };

		if (msg) {
			rowErrors = { ...rowErrors, [studentId]: msg };
			return;
		}

		if (studentId in rowErrors) {
			const next = { ...rowErrors };
			delete next[studentId];
			rowErrors = next;
		}
	}

	function hasFilledDraft(studentId: string) {
		const draft = draftFor(studentId);
		return draft.raw_score.trim() !== '' || draft.is_excused;
	}

	function matchesFilter(studentId: string) {
		const draft = draftFor(studentId);

		if (resultFilter === 'pending') {
			return draft.raw_score.trim() === '' && !draft.is_excused;
		}

		if (resultFilter === 'filled') {
			return draft.raw_score.trim() !== '';
		}

		if (resultFilter === 'excused') {
			return draft.is_excused;
		}

		return true;
	}

	const visibleStudents = $derived.by(() => {
		const normalizedQuery = searchQuery.trim().toLocaleLowerCase('pt-BR');

		return data.students.filter((student) => {
			const matchesQuery =
				normalizedQuery.length === 0 ||
				student.name.toLocaleLowerCase('pt-BR').includes(normalizedQuery) ||
				(student.invite_code ?? '').toLocaleLowerCase('pt-BR').includes(normalizedQuery);

			return matchesQuery && matchesFilter(student.id);
		});
	});

	const liveSummary = $derived.by(() => {
		let filledResults = 0;
		let excusedResults = 0;

		for (const student of data.students) {
			const draft = draftFor(student.id);
			if (draft.raw_score.trim() !== '' || draft.is_excused) {
				filledResults += 1;
			}
			if (draft.is_excused) {
				excusedResults += 1;
			}
		}

		return {
			filledResults,
			excusedResults,
			pendingStudents: Math.max(0, data.students.length - filledResults)
		};
	});

	const enhanceResultSave: SubmitFunction = ({ formData }) => {
		const studentId = String(formData.get('student_id') ?? '');
		setRowStatus(studentId, 'saving');

		return async ({ result }: { result: ActionResult }) => {
			if (result.type === 'success') {
				setRowStatus(studentId, 'saved');
				setTimeout(() => setRowStatus(studentId, 'idle'), 1000);
				return;
			}

			const message =
				(result.type === 'failure' && (result as { data?: { message?: string } }).data?.message) ||
				(result.type === 'error' && result.error?.message) ||
				'Erro ao salvar resultado.';

			setRowStatus(studentId, 'error', message);
			setTimeout(() => setRowStatus(studentId, 'idle'), 2400);
		};
	};

	async function saveStudentDraft(studentId: string) {
		const draft = draftFor(studentId);
		const formData = new FormData();
		formData.set('student_id', studentId);
		formData.set('raw_score', draft.raw_score);
		formData.set('notes', draft.notes);
		if (draft.is_excused) {
			formData.set('is_excused', 'on');
		}

		setRowStatus(studentId, 'saving');

		const response = await fetch('?/saveResult', {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			setRowStatus(studentId, 'saved');
			setTimeout(() => setRowStatus(studentId, 'idle'), 1000);
			return;
		}

		let message = 'Erro ao salvar resultado.';
		try {
			const body = await response.json();
			message = body?.data?.message ?? body?.message ?? message;
		} catch {
			message = 'Erro ao salvar resultado.';
		}

		setRowStatus(studentId, 'error', message);
		setTimeout(() => setRowStatus(studentId, 'idle'), 2400);
		throw new Error(message);
	}

	function applyBulkDraft() {
		const targetStudents = visibleStudents.filter(() => data.assessment?.status === 'draft');

		for (const student of targetStudents) {
			updateDraft(student.id, {
				raw_score: bulkScore,
				notes: bulkNotes,
				is_excused: bulkExcused
			});
		}
	}

	async function saveVisibleDrafts() {
		if (savingVisible || data.assessment?.status !== 'draft') return;

		const targets = visibleStudents
			.map((student) => student.id)
			.filter((studentId) => hasFilledDraft(studentId) || draftFor(studentId).notes.trim() !== '');

		if (targets.length === 0) return;

		savingVisible = true;
		try {
			for (const studentId of targets) {
				await saveStudentDraft(studentId);
			}
		} finally {
			savingVisible = false;
		}
	}

	function formatDate(value: string | null) {
		if (!value) return 'Nao publicado';
		const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
		if (Number.isNaN(date.getTime())) return value;
		const options = value.includes('T')
			? ({ dateStyle: 'medium', timeStyle: 'short' } as const)
			: ({ dateStyle: 'medium' } as const);

		return new Intl.DateTimeFormat('pt-BR', options).format(date);
	}

	function statusBadgeClass(status: Assessment['status']) {
		return status === 'published'
			? 'border-emerald-200 bg-emerald-50 text-emerald-700'
			: 'border-amber-200 bg-amber-50 text-amber-700';
	}

	function actionLabel(action: AuditItem['action_type']) {
		if (action === 'result_created') return 'Resultado criado';
		if (action === 'result_updated') return 'Resultado atualizado';
		if (action === 'result_deleted') return 'Resultado removido';
		return 'Avaliacao publicada';
	}

	function scoreLabel(value: number | null) {
		if (typeof value !== 'number') return '—';
		return value.toString();
	}

	function confirmDelete(event: MouseEvent) {
		if (!confirm('Excluir este rascunho? Os resultados vinculados tambem serao removidos.')) {
			event.preventDefault();
		}
	}
</script>

<svelte:head>
	<title
		>{data.assessment
			? `${data.assessment.title} • Class Insights`
			: 'Avaliacao • Class Insights'}</title
	>
</svelte:head>

{#if !data.assessment}
	<section class="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
		<p class="text-xs font-black uppercase tracking-widest text-slate-500">Avaliacao</p>
		<h1 class="mt-3 text-3xl font-black tracking-tight text-slate-950">Avaliacao nao encontrada</h1>
		<p class="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
			Essa avaliacao pode nao existir mais ou nao pertencer ao seu escopo.
		</p>
		<a
			href={resolve('/teacher/assessments')}
			class="mt-5 inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800"
		>
			Voltar para avaliacoes
		</a>
	</section>
{:else}
	<div class="space-y-6">
		<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
			<div class="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
				<div class="max-w-3xl">
					<p class="text-xs font-black uppercase tracking-widest text-slate-500">
						Fluxo operacional
					</p>
					<h1 class="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
						{data.assessment.title}
					</h1>
					<p class="mt-3 text-base leading-8 text-slate-600">
						{data.assessment.class_name} • {data.assessment.subject_name}
						{#if data.assessment.subject_code}
							({data.assessment.subject_code})
						{/if}
					</p>
					<p class="mt-2 text-sm leading-7 text-slate-600">
						Escala da turma: {data.assessment.class_score_min}–{data.assessment.class_score_max} • dec
						{data.assessment.class_score_decimals}
					</p>

					<div class="mt-5 flex flex-wrap gap-3">
						<a
							href={resolve('/teacher/assessments')}
							class="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
						>
							Voltar para avaliacoes
						</a>

						<a
							href={resolve(`/teacher/${data.assessment.class_id}`)}
							class="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
						>
							Abrir turma
						</a>

						<span
							class={`inline-flex h-12 items-center justify-center rounded-2xl border px-5 text-sm font-black uppercase tracking-widest ${statusBadgeClass(data.assessment.status)}`}
						>
							{data.assessment.status}
						</span>
					</div>
				</div>

				<div class="grid gap-3 sm:grid-cols-2 xl:w-full xl:max-w-xl">
					<div class="rounded-2xl border border-slate-200 bg-white p-4">
						<p class="text-xs font-black uppercase tracking-widest text-slate-500">Alunos</p>
						<p class="mt-2 text-3xl font-black text-slate-950">{data.summary.totalStudents}</p>
					</div>

					<div class="rounded-2xl border border-sky-200 bg-sky-50 p-4">
						<p class="text-xs font-black uppercase tracking-widest text-sky-700">Lancados</p>
						<p class="mt-2 text-3xl font-black text-slate-950">{liveSummary.filledResults}</p>
					</div>

					<div class="rounded-2xl border border-amber-200 bg-amber-50 p-4">
						<p class="text-xs font-black uppercase tracking-widest text-amber-700">Pendentes</p>
						<p class="mt-2 text-3xl font-black text-slate-950">{liveSummary.pendingStudents}</p>
					</div>

					<div class="rounded-2xl border border-slate-200 bg-white p-4">
						<p class="text-xs font-black uppercase tracking-widest text-slate-500">Dispensados</p>
						<p class="mt-2 text-3xl font-black text-slate-950">{liveSummary.excusedResults}</p>
					</div>
				</div>
			</div>
		</section>

		{#if generalMessage}
			<div
				class={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
					generalSuccess
						? 'border-emerald-200 bg-emerald-50 text-emerald-700'
						: 'border-red-200 bg-red-50 text-red-700'
				}`}
			>
				{generalMessage}
			</div>
		{/if}

		<div class="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
			<div class="space-y-6">
				<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
						<div>
							<p class="text-xs font-black uppercase tracking-widest text-slate-500">Metadados</p>
							<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
								Contexto da avaliacao
							</h2>
						</div>

						{#if data.assessment.status === 'published'}
							<p class="max-w-md text-sm leading-7 text-slate-600">
								Publicada em {formatDate(data.assessment.published_at)}. O rascunho foi fechado e
								agora esta congelado para preservar a leitura oficial.
							</p>
						{/if}
					</div>

					<form method="POST" action="?/updateAssessment" class="mt-5 space-y-4">
						<div class="grid gap-4 md:grid-cols-[1.35fr_0.8fr_0.5fr]">
							<label class="space-y-2 text-sm font-bold text-slate-700">
								<span>Titulo</span>
								<input
									name="title"
									value={data.assessment.title}
									disabled={data.assessment.status === 'published'}
									class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
								/>
							</label>

							<label class="space-y-2 text-sm font-bold text-slate-700">
								<span>Data</span>
								<input
									name="assessment_date"
									type="date"
									value={data.assessment.assessment_date}
									disabled={data.assessment.status === 'published'}
									class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
								/>
							</label>

							<label class="space-y-2 text-sm font-bold text-slate-700">
								<span>Peso</span>
								<input
									name="weight"
									type="number"
									step="0.1"
									min="0.1"
									value={data.assessment.weight}
									disabled={data.assessment.status === 'published'}
									class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
								/>
							</label>
						</div>

						{#if data.assessment.status === 'draft'}
							<div class="flex flex-wrap gap-3">
								<button
									type="submit"
									class="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800"
								>
									Salvar metadados
								</button>
							</div>
						{/if}
					</form>
				</section>

				<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
						<div>
							<p class="text-xs font-black uppercase tracking-widest text-slate-500">Resultados</p>
							<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
								Lancamento por aluno
							</h2>
						</div>

						<p class="max-w-md text-sm leading-7 text-slate-600">
							Cada linha salva de forma independente. Isso permite lancamento parcial consistente
							sem perder o restante do rascunho.
						</p>
					</div>

					{#if data.assessment.status === 'draft'}
						<div
							class="mt-5 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 xl:grid-cols-[1.1fr_0.9fr]"
						>
							<div class="space-y-4">
								<div class="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
									<input
										bind:value={searchQuery}
										placeholder="Buscar aluno ou invite code"
										class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
									/>

									<select
										bind:value={resultFilter}
										class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
									>
										<option value="all">Todos</option>
										<option value="pending">Pendentes</option>
										<option value="filled">Com nota</option>
										<option value="excused">Dispensados</option>
									</select>

									<button
										type="button"
										class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-100"
										onclick={() => {
											searchQuery = '';
											resultFilter = 'all';
										}}
									>
										Limpar filtro
									</button>

									<button
										type="button"
										class="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
										onclick={saveVisibleDrafts}
										disabled={savingVisible || visibleStudents.length === 0}
									>
										{savingVisible ? 'Salvando...' : 'Salvar visiveis'}
									</button>
								</div>

								<div class="flex flex-wrap gap-3 text-sm text-slate-600">
									<span
										class="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold"
									>
										Visiveis: {visibleStudents.length}
									</span>
									<span
										class="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold"
									>
										Pendentes: {liveSummary.pendingStudents}
									</span>
									<span
										class="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold"
									>
										Prontas para publicar: {liveSummary.filledResults > 0 ? 'Sim' : 'Nao'}
									</span>
								</div>
							</div>

							<div class="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
								<p class="text-xs font-black uppercase tracking-widest text-slate-500">
									Preenchimento em lote
								</p>

								<div class="grid gap-3 md:grid-cols-[0.8fr_1.2fr_auto]">
									<input
										bind:value={bulkScore}
										inputmode="decimal"
										placeholder="Nota"
										class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
									/>

									<input
										bind:value={bulkNotes}
										placeholder="Observacao para os visiveis"
										class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
									/>

									<button
										type="button"
										class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-100"
										onclick={applyBulkDraft}
									>
										Aplicar
									</button>
								</div>

								<label class="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
									<input type="checkbox" bind:checked={bulkExcused} />
									<span>Marcar os visiveis como dispensados</span>
								</label>
							</div>
						</div>
					{/if}

					{#if data.students.length === 0}
						<div
							class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"
						>
							<h3 class="text-lg font-black text-slate-950">Nenhum aluno nesta turma</h3>
							<p class="mt-2 text-sm leading-7 text-slate-600">
								Adicione alunos na turma antes de lancar resultados nesta avaliacao.
							</p>
							<div class="mt-4 flex flex-wrap justify-center gap-3">
								<a
									href={resolve(`/teacher/${data.assessment.class_id}#students`)}
									class="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-black text-white transition hover:bg-slate-800"
								>
									Voltar para alunos da turma
								</a>
								<a
									href={resolve(`/teacher/${data.assessment.class_id}`)}
									class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-100"
								>
									Abrir turma
								</a>
							</div>
						</div>
					{:else if visibleStudents.length === 0}
						<div
							class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"
						>
							<h3 class="text-lg font-black text-slate-950">Nenhum aluno nesse recorte</h3>
							<p class="mt-2 text-sm leading-7 text-slate-600">
								Ajuste a busca ou o filtro para voltar a ver os alunos desta avaliacao.
							</p>
						</div>
					{:else}
						<div class="mt-5 overflow-auto rounded-2xl border border-slate-200">
							<table class="min-w-full border-separate border-spacing-0">
								<thead>
									<tr>
										<th
											class="sticky left-0 top-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500"
										>
											Aluno
										</th>
										<th
											class="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500"
										>
											Nota
										</th>
										<th
											class="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500"
										>
											Dispensa
										</th>
										<th
											class="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500"
										>
											Observacoes
										</th>
										<th
											class="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500"
										>
											Acao
										</th>
									</tr>
								</thead>

								<tbody>
									{#each visibleStudents as student (student.id)}
										{@const rowFormId = `save-result-${student.id}`}
										<tr>
											<td
												class="sticky left-0 bg-white px-4 py-4 align-top text-sm font-bold text-slate-950"
											>
												{student.name}
											</td>
											<td class="border-t border-slate-200 px-4 py-4 align-top">
												<input
													form={rowFormId}
													name="raw_score"
													inputmode="decimal"
													placeholder={`${data.assessment.class_score_min} a ${data.assessment.class_score_max}`}
													value={draftFor(student.id).raw_score}
													disabled={data.assessment.status === 'published'}
													class="h-11 w-32 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
													oninput={(event) =>
														updateDraft(student.id, {
															raw_score: (event.currentTarget as HTMLInputElement).value
														})}
												/>
											</td>
											<td class="border-t border-slate-200 px-4 py-4 align-top">
												<label
													class="inline-flex items-center gap-2 text-sm font-semibold text-slate-700"
												>
													<input
														form={rowFormId}
														name="is_excused"
														type="checkbox"
														checked={draftFor(student.id).is_excused}
														disabled={data.assessment.status === 'published'}
														onchange={(event) =>
															updateDraft(student.id, {
																is_excused: (event.currentTarget as HTMLInputElement).checked
															})}
													/>
													<span>Dispensado</span>
												</label>
											</td>
											<td class="border-t border-slate-200 px-4 py-4 align-top">
												<input
													form={rowFormId}
													name="notes"
													placeholder="Observacao opcional"
													value={draftFor(student.id).notes}
													disabled={data.assessment.status === 'published'}
													class="h-11 w-full min-w-64 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
													oninput={(event) =>
														updateDraft(student.id, {
															notes: (event.currentTarget as HTMLInputElement).value
														})}
												/>
											</td>
											<td class="border-t border-slate-200 px-4 py-4 align-top">
												<form
													id={rowFormId}
													method="POST"
													action="?/saveResult"
													use:enhance={enhanceResultSave}
												>
													<input type="hidden" name="student_id" value={student.id} />
												</form>

												<div class="flex items-center gap-3">
													{#if data.assessment.status === 'draft'}
														<button
															type="submit"
															form={rowFormId}
															class="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-black text-white transition hover:bg-slate-800"
														>
															Salvar
														</button>
													{:else}
														<span class="text-sm font-semibold text-slate-500">Fechado</span>
													{/if}

													<span class="w-5 text-center text-sm">
														{#if rowStatus[student.id] === 'saving'}
															...
														{:else if rowStatus[student.id] === 'saved'}
															OK
														{:else if rowStatus[student.id] === 'error'}
															!
														{/if}
													</span>
												</div>

												{#if rowErrors[student.id]}
													<p class="mt-2 max-w-xs text-xs leading-5 text-red-700">
														{rowErrors[student.id]}
													</p>
												{/if}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</section>
			</div>

			<aside class="space-y-6 xl:sticky xl:top-6 xl:self-start">
				<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<p class="text-xs font-black uppercase tracking-widest text-slate-500">Publicacao</p>
					<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">Fechar avaliacao</h2>
					<p class="mt-3 text-sm leading-7 text-slate-600">
						O aluno continua bloqueado ate a publicacao. Depois disso, a avaliacao vira leitura
						oficial.
					</p>

					<div class="mt-5 space-y-3">
						<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
							<p class="text-xs font-black uppercase tracking-widest text-slate-500">Data</p>
							<p class="mt-2 text-lg font-black text-slate-950">
								{formatDate(data.assessment.assessment_date)}
							</p>
						</div>

						<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
							<p class="text-xs font-black uppercase tracking-widest text-slate-500">Peso</p>
							<p class="mt-2 text-lg font-black text-slate-950">{data.assessment.weight}</p>
						</div>

						<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
							<p class="text-xs font-black uppercase tracking-widest text-slate-500">Status</p>
							<p class="mt-2 text-lg font-black text-slate-950">
								{data.assessment.status === 'published' ? 'Publicado' : 'Rascunho'}
							</p>
						</div>
					</div>

					<div class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
						<p class="text-xs font-black uppercase tracking-widest text-slate-500">
							Prontidao para publicar
						</p>
						{#if data.assessment.status === 'published'}
							<p class="mt-2 text-sm leading-7 text-emerald-700">
								Leitura oficial ja fechada. Edicao bloqueada para preservar historico e portal do
								aluno.
							</p>
						{:else if liveSummary.filledResults === 0}
							<p class="mt-2 text-sm leading-7 text-amber-700">
								Ainda nao ha nenhum resultado salvo. Lance pelo menos uma linha antes de publicar.
							</p>
						{:else if liveSummary.pendingStudents > 0}
							<p class="mt-2 text-sm leading-7 text-slate-700">
								Ha <strong class="text-slate-950">{liveSummary.pendingStudents}</strong> aluno(s) sem
								fechamento neste rascunho. Voce ainda pode publicar, mas vale revisar as lacunas antes.
							</p>
						{:else}
							<p class="mt-2 text-sm leading-7 text-emerald-700">
								Todos os alunos deste rascunho ja foram tratados. A avaliacao esta pronta para virar
								leitura oficial.
							</p>
						{/if}
					</div>

					{#if data.assessment.status === 'draft'}
						<form method="POST" action="?/publishAssessment" class="mt-5">
							<button
								type="submit"
								class="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white transition hover:bg-emerald-500"
							>
								Publicar avaliacao
							</button>
						</form>

						<form method="POST" action="?/deleteAssessment" class="mt-3">
							<button
								type="submit"
								class="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-5 text-sm font-black text-red-700 transition hover:bg-red-100"
								onclick={confirmDelete}
							>
								Excluir rascunho
							</button>
						</form>
					{:else}
						<form method="POST" action="?/createRevision" class="mt-5">
							<button
								type="submit"
								class="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800"
							>
								Criar correcao em novo rascunho
							</button>
						</form>

						<div
							class="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 text-emerald-800"
						>
							Publicado em {formatDate(data.assessment.published_at)}. A edicao foi bloqueada para
							preservar o historico oficial. Se algo precisar ser ajustado, abra uma correcao em
							novo rascunho e publique a versao revisada depois.
						</div>
					{/if}
				</section>

				<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<p class="text-xs font-black uppercase tracking-widest text-slate-500">Auditoria</p>
					<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">Historico recente</h2>

					{#if data.audit.length === 0}
						<div
							class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-7 text-slate-600"
						>
							Nenhum evento registrado ainda nesta avaliacao.
						</div>
					{:else}
						<div class="mt-5 space-y-3">
							{#each data.audit as item (item.id)}
								<article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
									<p class="text-sm font-black text-slate-950">{actionLabel(item.action_type)}</p>
									<p class="mt-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
										{formatDate(item.created_at)}
									</p>
									<p class="mt-2 text-sm leading-7 text-slate-600">
										{#if item.student_name}
											Aluno: <strong class="text-slate-950">{item.student_name}</strong>.
										{/if}
										{#if item.changed_by_name}
											Alterado por <strong class="text-slate-950">{item.changed_by_name}</strong>.
										{/if}
									</p>
									{#if item.previous_score !== null || item.next_score !== null}
										<p class="mt-1 text-sm leading-7 text-slate-600">
											{scoreLabel(item.previous_score)} → {scoreLabel(item.next_score)}
										</p>
									{/if}
									{#if item.reason}
										<p class="mt-1 text-sm leading-7 text-slate-600">{item.reason}</p>
									{/if}
								</article>
							{/each}
						</div>
					{/if}
				</section>
			</aside>
		</div>
	</div>
{/if}
