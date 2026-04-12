<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import type { ActionResult, SubmitFunction } from '@sveltejs/kit';

	import MetricCard from '$lib/components/shared/MetricCard.svelte';
	import NextStepCard from '$lib/components/shared/NextStepCard.svelte';
	import StatusPill from '$lib/components/shared/StatusPill.svelte';

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

	type RiskTone = 'critical' | 'attention' | 'healthy';
	type DistributionTone = 'critical' | 'attention' | 'ready' | 'published';

	type ReviewDistributionBand = {
		id: string;
		label: string;
		count: number;
		tone: DistributionTone;
	};

	type ReviewData = {
		distribution: {
			averagePercent: number | null;
			lowestPercent: number | null;
			highestPercent: number | null;
			bands: ReviewDistributionBand[];
		};
		pendingStudents: Array<{
			studentId: string;
			studentName: string;
			inviteCode: string | null;
		}>;
		belowAverageStudents: Array<{
			studentId: string;
			studentName: string;
			inviteCode: string | null;
			rawScore: number | null;
			normalizedPercent: number;
			classAveragePercent: number;
			gapPercent: number;
			riskTone: RiskTone;
		}>;
		fallingStudents: Array<{
			studentId: string;
			studentName: string;
			inviteCode: string | null;
			rawScore: number | null;
			normalizedPercent: number;
			latestReferencePercent: number;
			deltaFromReference: number;
			riskTone: RiskTone;
		}>;
		comparisonContext: {
			referenceCount: number;
			references: Array<{
				id: string;
				title: string;
				assessmentDate: string;
			}>;
		};
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
			review: ReviewData;
		};
	};

	type DraftState = {
		raw_score: string;
		notes: string;
		is_excused: boolean;
	};

	type ReviewDecision = 'publish' | 'revise' | 'published';

	let { data }: Props = $props();

	const formState = $derived(($page.form ?? null) as ActionFeedback | null);
	const generalMessage = $derived(
		formState && formState.action !== 'saveResult' ? (formState.message ?? null) : null
	);
	const generalSuccess = $derived(formState?.success ?? false);

	let resultDrafts = $state<Record<string, DraftState>>({});
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

	function draftFor(studentId: string): DraftState {
		return (
			resultDrafts[studentId] ?? {
				raw_score: '',
				notes: '',
				is_excused: false
			}
		);
	}

	function updateDraft(studentId: string, patch: Partial<DraftState>) {
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

	const decision = $derived.by((): ReviewDecision => {
		if (!data.assessment) return 'revise';
		if (data.assessment.status === 'published') return 'published';

		if (liveSummary.filledResults === 0) return 'revise';
		if (data.review.pendingStudents.length > 0) return 'revise';
		if (data.review.fallingStudents.length > 0) return 'revise';

		const criticalBelowAverage = data.review.belowAverageStudents.filter(
			(student) => student.riskTone === 'critical'
		).length;

		if (criticalBelowAverage > 0) return 'revise';

		return 'publish';
	});

	const decisionTitle = $derived.by(() => {
		if (decision === 'published') return 'Leitura oficial já fechada';
		if (decision === 'publish') return 'Pode publicar';
		return 'Vale revisar antes de publicar';
	});

	const decisionDescription = $derived.by(() => {
		if (decision === 'published') {
			return 'Esta avaliação já foi publicada e está congelada como leitura oficial para preservar histórico e portal do aluno.';
		}

		if (decision === 'publish') {
			return 'O rascunho já está consistente o suficiente para virar leitura oficial. Ainda assim, você pode revisar as linhas antes de fechar.';
		}

		if (liveSummary.filledResults === 0) {
			return 'Ainda não existe nenhum resultado salvo. O próximo passo é lançar as notas antes de pensar em publicação.';
		}

		if (data.review.pendingStudents.length > 0) {
			return `Ainda há ${data.review.pendingStudents.length} aluno(s) pendente(s). Feche as lacunas antes de publicar.`;
		}

		if (data.review.fallingStudents.length > 0) {
			return `Há ${data.review.fallingStudents.length} aluno(s) com queda relevante em relação à referência mais recente. Vale revisar antes de fechar.`;
		}

		return 'Existem sinais que pedem uma última leitura antes da publicação.';
	});

	function formatDate(value: string | null) {
		if (!value) return 'Não publicado';
		const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
		if (Number.isNaN(date.getTime())) return value;

		const options = value.includes('T')
			? ({ dateStyle: 'medium', timeStyle: 'short' } as const)
			: ({ dateStyle: 'medium' } as const);

		return new Intl.DateTimeFormat('pt-BR', options).format(date);
	}

	function statusToneFromAssessment(status: Assessment['status']) {
		return status === 'published' ? 'healthy' : 'attention';
	}

	function riskToneToSemanticTone(tone: RiskTone) {
		if (tone === 'critical') return 'alert';
		if (tone === 'attention') return 'attention';
		return 'healthy';
	}

	function distributionToneToSemanticTone(tone: DistributionTone) {
		if (tone === 'critical') return 'alert';
		if (tone === 'attention') return 'attention';
		if (tone === 'ready') return 'context';
		return 'healthy';
	}

	function actionLabel(action: AuditItem['action_type']) {
		if (action === 'result_created') return 'Resultado criado';
		if (action === 'result_updated') return 'Resultado atualizado';
		if (action === 'result_deleted') return 'Resultado removido';
		return 'Avaliação publicada';
	}

	function scoreLabel(value: number | null, decimals = data.assessment?.class_score_decimals ?? 1) {
		if (typeof value !== 'number') return '—';

		return new Intl.NumberFormat('pt-BR', {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals
		}).format(value);
	}

	function percentLabel(value: number | null, decimals = 1) {
		if (typeof value !== 'number') return '—';

		return `${new Intl.NumberFormat('pt-BR', {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals
		}).format(value)}%`;
	}

	function signedPercentLabel(value: number | null, decimals = 1) {
		if (typeof value !== 'number') return '—';

		const sign = value > 0 ? '+' : '';
		return `${sign}${new Intl.NumberFormat('pt-BR', {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals
		}).format(value)}%`;
	}

	function confirmDelete(event: MouseEvent) {
		if (!confirm('Excluir este rascunho? Os resultados vinculados também serão removidos.')) {
			event.preventDefault();
		}
	}

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
</script>

<svelte:head>
	<title>
		{data.assessment ? `${data.assessment.title} • Class Insights` : 'Avaliação • Class Insights'}
	</title>
</svelte:head>

{#if !data.assessment}
	<section class="app-card app-empty-state">
		<p class="app-empty-state-title">Avaliação não encontrada</p>
		<p class="app-empty-state-text">
			Essa avaliação pode não existir mais ou não pertencer ao seu escopo.
		</p>
		<a href={resolve('/teacher/assessments')} class="app-button mt-5"> Voltar para avaliações </a>
	</section>
{:else}
	<div class="app-stack-lg">
		<section class="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
			<div class="app-card-strong app-stack-md">
				<div class="app-header">
					<p class="app-eyebrow">Revisão pré-publicação</p>
					<h1 class="app-title">{data.assessment.title}</h1>
					<p class="app-subtitle">
						{data.assessment.class_name} · {data.assessment.subject_name}
						{#if data.assessment.subject_code}
							({data.assessment.subject_code})
						{/if}
					</p>
				</div>

				<div class="flex flex-wrap gap-3">
					<StatusPill
						label={data.assessment.status === 'published' ? 'Publicado' : 'Rascunho'}
						tone={statusToneFromAssessment(data.assessment.status)}
						uppercase={true}
					/>
					<StatusPill
						label={`Escala ${data.assessment.class_score_min}–${data.assessment.class_score_max}`}
						tone="context"
					/>
					<StatusPill label={`Peso ${data.assessment.weight}`} tone="neutral" />
				</div>

				<div class="app-kpi-grid">
					<MetricCard
						label="Lançados"
						value={String(liveSummary.filledResults)}
						tone={liveSummary.filledResults > 0 ? 'context' : 'neutral'}
						valueTone={liveSummary.filledResults > 0 ? 'tone' : 'default'}
						compact={true}
					/>
					<MetricCard
						label="Pendências"
						value={String(data.review.pendingStudents.length)}
						tone={data.review.pendingStudents.length > 0 ? 'attention' : 'healthy'}
						valueTone={data.review.pendingStudents.length > 0 ? 'tone' : 'default'}
						compact={true}
					/>
					<MetricCard
						label="Alunos em queda"
						value={String(data.review.fallingStudents.length)}
						tone={data.review.fallingStudents.length > 0 ? 'alert' : 'healthy'}
						valueTone={data.review.fallingStudents.length > 0 ? 'tone' : 'default'}
						compact={true}
					/>
				</div>

				<div class="flex flex-wrap gap-3">
					<a href={resolve('/teacher/assessments')} class="app-button-secondary">
						Voltar para avaliações
					</a>
					<a href={resolve(`/teacher/${data.assessment.class_id}`)} class="app-button-secondary">
						Abrir turma
					</a>
					<a
						href={`/teacher/assessments/${data.assessment.id}/export`}
						class="app-button-secondary"
					>
						Exportar publicados
					</a>
				</div>
			</div>

			{#if data.assessment.status === 'draft'}
				<NextStepCard
					eyebrow="Decisão"
					title={decisionTitle}
					description={decisionDescription}
					tone={decision === 'publish' ? 'healthy' : 'attention'}
					primaryHref={decision === 'publish' ? '#publish-panel' : '#resultados'}
					primaryLabel={decision === 'publish' ? 'Ir para publicar' : 'Revisar lançamentos'}
					secondaryHref="#revisao"
					secondaryLabel="Ver leitura de revisão"
					primaryTone={decision === 'publish' ? 'healthy' : 'brand'}
				/>
			{:else}
				<NextStepCard
					eyebrow="Decisão"
					title={decisionTitle}
					description={decisionDescription}
					tone="healthy"
					primaryHref="#publish-panel"
					primaryLabel="Abrir ações da avaliação"
					secondaryHref="#auditoria"
					secondaryLabel="Ver auditoria"
					primaryTone="healthy"
				/>
			{/if}
		</section>

		{#if generalMessage}
			<div
				class={`rounded-3xl border px-4 py-3 text-sm font-semibold ${
					generalSuccess
						? 'border-emerald-200 bg-emerald-50 text-emerald-700'
						: 'border-red-200 bg-red-50 text-red-700'
				}`}
			>
				{generalMessage}
			</div>
		{/if}

		<section id="revisao" class="app-card app-stack-lg">
			<div class="app-header">
				<p class="app-eyebrow">Leitura de revisão</p>
				<h2 class="app-title">O que esta avaliação mostra antes de publicar</h2>
				<p class="app-subtitle">
					Use este resumo para decidir rápido se fecha a publicação agora ou se vale revisar antes.
				</p>
			</div>

			<div class="grid gap-4 xl:grid-cols-4">
				{#each data.review.distribution.bands as band (band.id)}
					<MetricCard
						label={band.label}
						value={String(band.count)}
						tone={distributionToneToSemanticTone(band.tone)}
						valueTone={band.count > 0 ? 'tone' : 'default'}
						compact={true}
					/>
				{/each}
			</div>

			<div class="grid gap-4 xl:grid-cols-3">
				<MetricCard
					label="Média da avaliação"
					value={percentLabel(data.review.distribution.averagePercent)}
					tone="context"
					valueTone="tone"
				/>
				<MetricCard
					label="Menor percentual"
					value={percentLabel(data.review.distribution.lowestPercent)}
					tone="attention"
					valueTone="tone"
				/>
				<MetricCard
					label="Maior percentual"
					value={percentLabel(data.review.distribution.highestPercent)}
					tone="healthy"
					valueTone="tone"
				/>
			</div>

			<div class="grid gap-4 xl:grid-cols-3">
				<section class="app-card-muted app-stack-md">
					<div class="flex items-start justify-between gap-3">
						<div>
							<h3 class="text-lg font-black text-slate-950">Pendências</h3>
							<p class="mt-2 text-sm leading-7 text-slate-600">
								Alunos ainda sem fechamento neste rascunho.
							</p>
						</div>

						<StatusPill
							label={`${data.review.pendingStudents.length}`}
							tone={data.review.pendingStudents.length > 0 ? 'attention' : 'healthy'}
						/>
					</div>

					{#if data.review.pendingStudents.length === 0}
						<p class="text-sm font-semibold text-emerald-700">Nenhuma pendência de lançamento.</p>
					{:else}
						<div class="grid gap-3">
							{#each data.review.pendingStudents.slice(0, 6) as student (student.studentId)}
								<article class="rounded-2xl border border-slate-200 bg-white p-4">
									<p class="font-black text-slate-950">{student.studentName}</p>
									<p class="mt-1 text-sm text-slate-500">
										{student.inviteCode ? `Invite code: ${student.inviteCode}` : 'Sem invite code'}
									</p>
								</article>
							{/each}
						</div>
					{/if}
				</section>

				<section class="app-card-muted app-stack-md">
					<div class="flex items-start justify-between gap-3">
						<div>
							<h3 class="text-lg font-black text-slate-950">Abaixo da média</h3>
							<p class="mt-2 text-sm leading-7 text-slate-600">
								Alunos abaixo da média desta própria avaliação.
							</p>
						</div>

						<StatusPill
							label={`${data.review.belowAverageStudents.length}`}
							tone={data.review.belowAverageStudents.length > 0 ? 'attention' : 'healthy'}
						/>
					</div>

					{#if data.review.belowAverageStudents.length === 0}
						<p class="text-sm font-semibold text-emerald-700">Ninguém abaixo da média do grupo.</p>
					{:else}
						<div class="grid gap-3">
							{#each data.review.belowAverageStudents.slice(0, 6) as student (student.studentId)}
								<article class="rounded-2xl border border-slate-200 bg-white p-4">
									<div class="flex items-start justify-between gap-3">
										<div>
											<p class="font-black text-slate-950">{student.studentName}</p>
											<p class="mt-1 text-sm text-slate-500">
												Nota {scoreLabel(student.rawScore)}
											</p>
										</div>

										<StatusPill
											label={student.riskTone === 'critical'
												? 'Crítico'
												: student.riskTone === 'attention'
													? 'Atenção'
													: 'Saudável'}
											tone={riskToneToSemanticTone(student.riskTone)}
											uppercase={true}
										/>
									</div>

									<p class="mt-3 text-sm text-slate-600">
										{percentLabel(student.normalizedPercent)} · média da avaliação
										{percentLabel(student.classAveragePercent)} · gap
										{signedPercentLabel(student.gapPercent)}
									</p>
								</article>
							{/each}
						</div>
					{/if}
				</section>

				<section class="app-card-muted app-stack-md">
					<div class="flex items-start justify-between gap-3">
						<div>
							<h3 class="text-lg font-black text-slate-950">Em queda</h3>
							<p class="mt-2 text-sm leading-7 text-slate-600">
								Alunos com queda relevante frente à referência anterior publicada.
							</p>
						</div>

						<StatusPill
							label={`${data.review.fallingStudents.length}`}
							tone={data.review.fallingStudents.length > 0 ? 'alert' : 'healthy'}
						/>
					</div>

					{#if data.review.fallingStudents.length === 0}
						<p class="text-sm font-semibold text-emerald-700">
							Não há quedas relevantes no comparativo recente.
						</p>
					{:else}
						<div class="grid gap-3">
							{#each data.review.fallingStudents.slice(0, 6) as student (student.studentId)}
								<article class="rounded-2xl border border-slate-200 bg-white p-4">
									<div class="flex items-start justify-between gap-3">
										<div>
											<p class="font-black text-slate-950">{student.studentName}</p>
											<p class="mt-1 text-sm text-slate-500">
												Nota {scoreLabel(student.rawScore)}
											</p>
										</div>

										<StatusPill
											label={student.riskTone === 'critical'
												? 'Crítico'
												: student.riskTone === 'attention'
													? 'Atenção'
													: 'Saudável'}
											tone={riskToneToSemanticTone(student.riskTone)}
											uppercase={true}
										/>
									</div>

									<p class="mt-3 text-sm text-slate-600">
										Atual {percentLabel(student.normalizedPercent)} · referência
										{percentLabel(student.latestReferencePercent)} · delta
										{signedPercentLabel(student.deltaFromReference)}
									</p>
								</article>
							{/each}
						</div>
					{/if}
				</section>
			</div>

			{#if data.review.comparisonContext.referenceCount > 0}
				<div class="rounded-3xl border border-slate-200 bg-slate-50 p-5">
					<p class="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
						Contexto comparativo
					</p>
					<p class="mt-2 text-sm leading-7 text-slate-600">
						Esta leitura compara a avaliação atual com
						{data.review.comparisonContext.referenceCount}
						publicação(ões) anterior(es) da mesma matéria na turma.
					</p>

					<div class="mt-4 flex flex-wrap gap-3">
						{#each data.review.comparisonContext.references as reference (reference.id)}
							<div class="rounded-2xl border border-slate-200 bg-white px-4 py-3">
								<p class="text-sm font-black text-slate-950">{reference.title}</p>
								<p class="mt-1 text-xs text-slate-500">{formatDate(reference.assessmentDate)}</p>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</section>

		<div class="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
			<div class="app-stack-lg">
				<section class="app-card app-stack-md">
					<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
						<div>
							<p class="app-eyebrow">Metadados</p>
							<h2 class="app-title">Contexto da avaliação</h2>
						</div>

						{#if data.assessment.status === 'published'}
							<p class="max-w-md text-sm leading-7 text-slate-600">
								Publicada em {formatDate(data.assessment.published_at)}. O rascunho foi fechado e
								agora está congelado para preservar a leitura oficial.
							</p>
						{/if}
					</div>

					<form method="POST" action="?/updateAssessment" class="grid gap-4">
						<div class="grid gap-4 md:grid-cols-[1.35fr_0.8fr_0.5fr]">
							<label class="grid gap-2 text-sm font-bold text-slate-700">
								<span>Título</span>
								<input
									name="title"
									value={data.assessment.title}
									disabled={data.assessment.status === 'published'}
									class="app-input"
								/>
							</label>

							<label class="grid gap-2 text-sm font-bold text-slate-700">
								<span>Data</span>
								<input
									name="assessment_date"
									type="date"
									value={data.assessment.assessment_date}
									disabled={data.assessment.status === 'published'}
									class="app-input"
								/>
							</label>

							<label class="grid gap-2 text-sm font-bold text-slate-700">
								<span>Peso</span>
								<input
									name="weight"
									type="number"
									step="0.1"
									min="0.1"
									value={data.assessment.weight}
									disabled={data.assessment.status === 'published'}
									class="app-input"
								/>
							</label>
						</div>

						{#if data.assessment.status === 'draft'}
							<div class="flex flex-wrap gap-3">
								<button type="submit" class="app-button">Salvar metadados</button>
							</div>
						{/if}
					</form>
				</section>

				<section id="resultados" class="app-card app-stack-md">
					<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
						<div>
							<p class="app-eyebrow">Resultados</p>
							<h2 class="app-title">Lançamento por aluno</h2>
						</div>

						<p class="max-w-md text-sm leading-7 text-slate-600">
							Cada linha salva de forma independente. Isso mantém o rascunho consistente mesmo em
							lançamento parcial.
						</p>
					</div>

					{#if data.assessment.status === 'draft'}
						<div
							class="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 xl:grid-cols-[1.1fr_0.9fr]"
						>
							<div class="app-stack-md">
								<div class="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
									<input
										bind:value={searchQuery}
										placeholder="Buscar aluno ou invite code"
										class="app-input"
									/>

									<select bind:value={resultFilter} class="app-select">
										<option value="all">Todos</option>
										<option value="pending">Pendentes</option>
										<option value="filled">Com nota</option>
										<option value="excused">Dispensados</option>
									</select>

									<button
										type="button"
										class="app-button-secondary"
										onclick={() => {
											searchQuery = '';
											resultFilter = 'all';
										}}
									>
										Limpar filtro
									</button>

									<button
										type="button"
										class="app-button"
										onclick={saveVisibleDrafts}
										disabled={savingVisible || visibleStudents.length === 0}
									>
										{savingVisible ? 'Salvando...' : 'Salvar visíveis'}
									</button>
								</div>

								<div class="flex flex-wrap gap-3 text-sm text-slate-600">
									<span
										class="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold"
									>
										Visíveis: {visibleStudents.length}
									</span>
									<span
										class="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold"
									>
										Pendentes: {liveSummary.pendingStudents}
									</span>
									<span
										class="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold"
									>
										Prontas para publicar: {liveSummary.filledResults > 0 ? 'Sim' : 'Não'}
									</span>
								</div>
							</div>

							<div class="app-stack-sm rounded-3xl border border-slate-200 bg-white p-4">
								<p class="app-eyebrow">Preenchimento em lote</p>

								<div class="grid gap-3 md:grid-cols-[0.8fr_1.2fr_auto]">
									<input
										bind:value={bulkScore}
										inputmode="decimal"
										placeholder="Nota"
										class="app-input"
									/>

									<input
										bind:value={bulkNotes}
										placeholder="Observação para os visíveis"
										class="app-input"
									/>

									<button type="button" class="app-button-secondary" onclick={applyBulkDraft}>
										Aplicar
									</button>
								</div>

								<label class="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
									<input type="checkbox" bind:checked={bulkExcused} />
									<span>Marcar os visíveis como dispensados</span>
								</label>
							</div>
						</div>
					{/if}

					{#if data.students.length === 0}
						<div class="app-empty-state">
							<p class="app-empty-state-title">Nenhum aluno nesta turma</p>
							<p class="app-empty-state-text">
								Adicione alunos na turma antes de lançar resultados nesta avaliação.
							</p>
							<div class="mt-4 flex flex-wrap justify-center gap-3">
								<a
									href={resolve(`/teacher/${data.assessment.class_id}#students`)}
									class="app-button"
								>
									Voltar para alunos da turma
								</a>
								<a
									href={resolve(`/teacher/${data.assessment.class_id}`)}
									class="app-button-secondary"
								>
									Abrir turma
								</a>
							</div>
						</div>
					{:else if visibleStudents.length === 0}
						<div class="app-empty-state">
							<p class="app-empty-state-title">Nenhum aluno neste recorte</p>
							<p class="app-empty-state-text">
								Ajuste a busca ou o filtro para voltar a ver os alunos desta avaliação.
							</p>
						</div>
					{:else}
						<div class="overflow-auto rounded-3xl border border-slate-200">
							<table class="min-w-full border-separate border-spacing-0">
								<thead>
									<tr>
										<th
											class="sticky left-0 top-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-500"
										>
											Aluno
										</th>
										<th
											class="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-500"
										>
											Nota
										</th>
										<th
											class="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-500"
										>
											Dispensa
										</th>
										<th
											class="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-500"
										>
											Observações
										</th>
										<th
											class="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-500"
										>
											Ação
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
												<div class="grid gap-1">
													<span>{student.name}</span>
													{#if student.invite_code}
														<span class="text-xs font-semibold text-slate-500">
															{student.invite_code}
														</span>
													{/if}
												</div>
											</td>

											<td class="border-t border-slate-200 px-4 py-4 align-top">
												<input
													form={rowFormId}
													name="raw_score"
													inputmode="decimal"
													placeholder={`${data.assessment.class_score_min} a ${data.assessment.class_score_max}`}
													value={draftFor(student.id).raw_score}
													disabled={data.assessment.status === 'published'}
													class="app-input w-32"
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
													placeholder="Observação opcional"
													value={draftFor(student.id).notes}
													disabled={data.assessment.status === 'published'}
													class="app-input min-w-64"
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
														<button type="submit" form={rowFormId} class="app-button">
															Salvar
														</button>
													{:else}
														<span class="text-sm font-semibold text-slate-500">Fechado</span>
													{/if}

													<span class="w-6 text-center text-sm font-bold text-slate-500">
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

			<aside id="publish-panel" class="app-stack-lg xl:sticky xl:top-6 xl:self-start">
				<section class="app-card app-stack-md">
					<p class="app-eyebrow">Decisão final</p>
					<h2 class="app-title">{decisionTitle}</h2>
					<p class="app-subtitle">{decisionDescription}</p>

					<div class="grid gap-3">
						<MetricCard
							label="Pendências"
							value={String(data.review.pendingStudents.length)}
							tone={data.review.pendingStudents.length > 0 ? 'attention' : 'healthy'}
							valueTone={data.review.pendingStudents.length > 0 ? 'tone' : 'default'}
							compact={true}
						/>
						<MetricCard
							label="Abaixo da média"
							value={String(data.review.belowAverageStudents.length)}
							tone={data.review.belowAverageStudents.length > 0 ? 'attention' : 'healthy'}
							valueTone={data.review.belowAverageStudents.length > 0 ? 'tone' : 'default'}
							compact={true}
						/>
						<MetricCard
							label="Em queda"
							value={String(data.review.fallingStudents.length)}
							tone={data.review.fallingStudents.length > 0 ? 'alert' : 'healthy'}
							valueTone={data.review.fallingStudents.length > 0 ? 'tone' : 'default'}
							compact={true}
						/>
					</div>

					{#if data.assessment.status === 'draft'}
						{#if decision === 'publish'}
							<form method="POST" action="?/publishAssessment" class="grid gap-3">
								<button type="submit" class="app-button"> Publicar avaliação </button>
								<a href="#resultados" class="app-button-secondary">Revisar lançamentos</a>
							</form>
						{:else}
							<div class="grid gap-3">
								<a href="#resultados" class="app-button">Revisar lançamentos</a>
								<form method="POST" action="?/publishAssessment">
									<button type="submit" class="app-button-secondary w-full">
										Publicar mesmo assim
									</button>
								</form>
							</div>
						{/if}

						<form method="POST" action="?/deleteAssessment" class="pt-2">
							<button
								type="submit"
								class="app-button-secondary w-full border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
								onclick={confirmDelete}
							>
								Excluir rascunho
							</button>
						</form>
					{:else}
						<form method="POST" action="?/createRevision" class="grid gap-3">
							<button type="submit" class="app-button">Criar rascunho de correção</button>
							<a href="#auditoria" class="app-button-secondary">Ver auditoria</a>
						</form>
					{/if}
				</section>

				<section class="app-card app-stack-md">
					<p class="app-eyebrow">Metadados rápidos</p>

					<div class="grid gap-3">
						<MetricCard
							label="Data"
							value={formatDate(data.assessment.assessment_date)}
							compact={true}
						/>
						<MetricCard label="Peso" value={String(data.assessment.weight)} compact={true} />
						<MetricCard
							label="Status"
							value={data.assessment.status === 'published' ? 'Publicado' : 'Rascunho'}
							tone={statusToneFromAssessment(data.assessment.status)}
							valueTone="tone"
							compact={true}
						/>
					</div>
				</section>
			</aside>
		</div>

		<section id="auditoria" class="app-card app-stack-md">
			<div class="app-header">
				<p class="app-eyebrow">Auditoria</p>
				<h2 class="app-title">Histórico operacional</h2>
				<p class="app-subtitle">
					Últimas alterações feitas nesta avaliação antes e depois da publicação.
				</p>
			</div>

			{#if data.audit.length === 0}
				<div class="app-empty-state">
					<p class="app-empty-state-title">Nenhum evento registrado ainda</p>
					<p class="app-empty-state-text">
						As alterações realizadas nesta avaliação aparecerão aqui.
					</p>
				</div>
			{:else}
				<div class="grid gap-3">
					{#each data.audit as item (item.id)}
						<article class="rounded-3xl border border-slate-200 bg-slate-50 p-4">
							<div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
								<div class="min-w-0">
									<p class="font-black text-slate-950">{actionLabel(item.action_type)}</p>
									<p class="mt-1 text-sm text-slate-600">
										{item.student_name ?? 'Evento da avaliação'}
										{#if item.changed_by_name}
											· por {item.changed_by_name}
										{/if}
									</p>
								</div>

								<p class="text-sm font-semibold text-slate-500">{formatDate(item.created_at)}</p>
							</div>

							<div class="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
								<span>Anterior: {scoreLabel(item.previous_score)}</span>
								<span>·</span>
								<span>Novo: {scoreLabel(item.next_score)}</span>
								{#if item.reason}
									<span>·</span>
									<span>{item.reason}</span>
								{/if}
							</div>
						</article>
					{/each}
				</div>
			{/if}
		</section>
	</div>
{/if}
