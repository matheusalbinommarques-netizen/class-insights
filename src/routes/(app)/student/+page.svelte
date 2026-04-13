<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		formatStudentGrade,
		formatStudentPercent,
		formatStudentSignedNumber
	} from '$lib/utils/format';

	type PortalStatus = 'pending-link' | 'ready';
	type SubjectSituation = 'saudável' | 'em atenção' | 'base insuficiente';
	type TrendDirection = 'estável' | 'em melhora' | 'em atenção' | 'base insuficiente';

	type EnrollmentItem = {
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
	};

	type SubjectHighlight = {
		id: string;
		name: string;
		code: string | null;
		situation: SubjectSituation;
		reason: string;
		currentAverage: number | null;
		normalizedPercent: number | null;
		assessmentsCount: number;
		latestAssessmentTitle: string | null;
		latestAssessmentDate: string | null;
	};

	type SubjectItem = {
		id: string;
		name: string;
		code: string | null;
		score: number | null;
		progress: number | null;
		status: 'good' | 'attention' | 'pending';
		description: string;
		currentAverage: number | null;
		normalizedPercent: number | null;
		trendDirection: TrendDirection;
		subjectStatus: SubjectSituation;
		assessmentsCount: number;
		latestAssessmentTitle: string | null;
		latestAssessmentDate: string | null;
		classAveragePercent: number | null;
		gapPercent: number | null;
	};

	type RecentPublicationItem = {
		assessmentId: string;
		title: string;
		date: string;
		subjectId: string;
		subjectName: string;
		rawScore: number | null;
		normalizedPercent: number | null;
		classAveragePercent: number | null;
		gapPercent: number | null;
		comparisonLabel: string;
		performanceLabel: string;
	};

	type FormState = {
		action?: 'claimInviteCode';
		message?: string;
		values?: {
			invite_code?: string;
		};
	};

	type PageData = {
		overviewPortal: { status: PortalStatus; message: string };
		student: { displayName: string; className: string | null };
		summary: {
			totalSubjects: number;
			subjectsWithScore: number;
		};
		currentAverage: number | null;
		currentAveragePercent: number | null;
		trendDirection: TrendDirection;
		topStrength: SubjectHighlight | null;
		topReviewArea: SubjectHighlight | null;
		recentPublications: RecentPublicationItem[];
		hasPublishedData: boolean;
		emptyState: {
			title: string;
			description: string;
		};
		subjects: SubjectItem[];
		academicSummary: {
			title: string;
			description: string;
		};
		enrollments: EnrollmentItem[];
	};

	type ReviewAreaCardState = 'attention' | 'neutral' | 'insufficient';

	let { data, form = null }: { data: PageData; form?: FormState | null } = $props();

	const currentEnrollment = $derived(data.enrollments.find((item) => item.isCurrent) ?? null);
	const visibleSubjects = $derived(data.subjects.slice(0, 4));

	const claimErrorMessage = $derived(
		form?.action === 'claimInviteCode' ? (form.message ?? null) : null
	);

	const claimInviteCodeValue = $derived(
		form?.action === 'claimInviteCode' ? (form.values?.invite_code ?? '') : ''
	);

	const formatDate = (value: string | null) => {
		if (!value) return 'Sem data';

		const date = new Date(`${value}T00:00:00`);
		if (Number.isNaN(date.getTime())) return value;

		return new Intl.DateTimeFormat('pt-BR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		}).format(date);
	};

	const enrollmentStatusLabel = (status: EnrollmentItem['status']) => {
		if (status === 'active') return 'Ativo';
		if (status === 'pending') return 'Pendente';
		return 'Arquivado';
	};

	const enrollmentStatusClass = (status: EnrollmentItem['status']) => {
		if (status === 'active') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
		if (status === 'pending') return 'border-amber-200 bg-amber-50 text-amber-700';
		return 'border-slate-200 bg-slate-50 text-slate-600';
	};

	const trendToneClass = (trend: TrendDirection) => {
		if (trend === 'em melhora') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
		if (trend === 'em atenção') return 'border-amber-200 bg-amber-50 text-amber-700';
		if (trend === 'estável') return 'border-sky-200 bg-sky-50 text-sky-700';
		return 'border-slate-200 bg-slate-50 text-slate-600';
	};

	const trendHelperText = (trend: TrendDirection) => {
		if (trend === 'em melhora')
			return 'Seu ritmo recente está melhorando nas publicações disponíveis.';
		if (trend === 'em atenção')
			return 'As publicações mais recentes indicam que vale revisar com prioridade.';
		if (trend === 'estável')
			return 'Seu desempenho recente está consistente nas publicações disponíveis.';
		return 'Ainda não há base publicada suficiente para comparar sua tendência.';
	};

	const subjectSituationLabel = (situation: SubjectSituation) => {
		if (situation === 'saudável') return 'Saudável';
		if (situation === 'em atenção') return 'Em atenção';
		return 'Base insuficiente';
	};

	const subjectSituationClass = (situation: SubjectSituation) => {
		if (situation === 'saudável') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
		if (situation === 'em atenção') return 'border-amber-200 bg-amber-50 text-amber-700';
		return 'border-slate-200 bg-slate-50 text-slate-600';
	};

	const reviewAreaCardState = $derived.by((): ReviewAreaCardState => {
		if (!data.hasPublishedData || data.currentAverage === null) {
			return 'insufficient';
		}

		if (data.topReviewArea?.situation === 'em atenção') {
			return 'attention';
		}

		return 'neutral';
	});

	const reviewAreaClass = $derived.by(() => {
		if (reviewAreaCardState === 'attention') {
			return 'border-amber-200 bg-amber-50 text-amber-700';
		}

		if (reviewAreaCardState === 'neutral') {
			return 'border-sky-200 bg-sky-50 text-sky-700';
		}

		return 'border-slate-200 bg-slate-50 text-slate-600';
	});

	const reviewAreaBadgeLabel = $derived.by(() => {
		if (reviewAreaCardState === 'attention') return 'Em atenção';
		if (reviewAreaCardState === 'neutral') return 'Sem alerta dominante';
		return 'Base insuficiente';
	});

	const reviewAreaTitle = $derived.by(() => {
		if (reviewAreaCardState === 'attention' && data.topReviewArea) {
			return data.topReviewArea.name;
		}

		if (reviewAreaCardState === 'neutral') {
			return 'Sem ponto crítico dominante';
		}

		return 'Base insuficiente';
	});

	const reviewAreaDescription = $derived.by(() => {
		if (reviewAreaCardState === 'attention' && data.topReviewArea) {
			return data.topReviewArea.reason;
		}

		if (reviewAreaCardState === 'neutral') {
			return 'No momento não existe uma matéria com sinal forte de atenção acima das demais. Continue acompanhando as publicações recentes para confirmar se essa estabilidade se mantém.';
		}

		return 'Assim que houver publicações suficientes, o painel mostrará com clareza qual matéria merece revisão primeiro.';
	});

	const shouldShowReviewMetrics = $derived(
		reviewAreaCardState === 'attention' && Boolean(data.topReviewArea)
	);

	const overallStatusLabel = $derived(
		data.overviewPortal.status === 'ready' ? 'Vínculo ativo' : 'Vínculo pendente'
	);

	const overallStatusClass = $derived(
		data.overviewPortal.status === 'ready'
			? 'border-emerald-200 bg-emerald-50 text-emerald-700'
			: 'border-amber-200 bg-amber-50 text-amber-700'
	);
</script>

<svelte:head>
	<title>Class Insights - Painel do aluno</title>
</svelte:head>

<div class="grid gap-6">
	<section class="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.85fr)]">
		<div class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
			<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">Painel do aluno</p>

			<h1 class="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
				Olá, {data.student.displayName}
			</h1>

			<p class="mt-4 max-w-3xl text-base leading-8 text-slate-600">
				{#if data.overviewPortal.status === 'ready'}
					Acompanhe sua situação atual com base nas publicações já liberadas para a sua turma.
				{:else}
					Sua conta já está pronta, mas ainda falta concluir um vínculo acadêmico para liberar a
					visão completa do painel.
				{/if}
			</p>

			<div class="mt-5 flex flex-wrap gap-3">
				<span
					class={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-bold ${overallStatusClass}`}
				>
					{overallStatusLabel}
				</span>

				<span
					class="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700"
				>
					{currentEnrollment?.className ?? data.student.className ?? 'Sem turma ativa'}
				</span>
			</div>

			<p class="mt-4 text-sm leading-7 text-slate-500">
				{data.overviewPortal.message}
			</p>
		</div>

		<aside class="rounded-4xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
			<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Continue por aqui</p>

			<div class="mt-4 grid gap-3">
				<a
					href={resolve('/student/journey')}
					class="rounded-3xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50"
				>
					<p class="text-sm font-black text-slate-900">Trajetória</p>
					<p class="mt-1 text-sm leading-6 text-slate-600">
						Veja sua evolução recente e entenda o que mudou.
					</p>
				</a>

				<a
					href={resolve('/student/skills')}
					class="rounded-3xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50"
				>
					<p class="text-sm font-black text-slate-900">Matérias</p>
					<p class="mt-1 text-sm leading-6 text-slate-600">
						Confira a situação atual de cada matéria.
					</p>
				</a>
			</div>
		</aside>
	</section>

	{#if data.overviewPortal.status !== 'ready'}
		<section class="rounded-4xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
			<p class="text-xs font-black uppercase tracking-[0.24em] text-amber-700">Próximo passo</p>

			<h2 class="mt-2 text-3xl font-black tracking-tight text-slate-950">
				Conclua seu vínculo acadêmico
			</h2>

			<p class="mt-4 max-w-4xl text-base leading-8 text-slate-700">
				Sua conta de aluno foi criada, mas o sistema ainda não encontrou um vínculo ativo com uma
				turma. Use um código de convite válido para entrar em uma turma e liberar seu painel.
			</p>

			<div class="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)]">
				<div class="rounded-3xl border border-amber-200 bg-white p-5">
					<p class="text-sm font-black text-slate-950">Adicionar código de convite</p>
					<p class="mt-2 text-sm leading-7 text-slate-600">
						Digite o código recebido do professor para vincular esta conta à turma.
					</p>

					{#if claimErrorMessage}
						<div
							class="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
						>
							{claimErrorMessage}
						</div>
					{/if}

					<form method="POST" action="?/claimInviteCode" class="mt-5 grid gap-4">
						<div>
							<label for="invite_code" class="block text-sm font-black text-slate-900">
								Código de convite
							</label>
							<input
								id="invite_code"
								name="invite_code"
								type="text"
								value={claimInviteCodeValue}
								placeholder="Ex.: A1B2C3D4"
								autocomplete="off"
								class="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium uppercase tracking-[0.12em] text-slate-900 outline-none transition placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
								required
							/>
							<p class="mt-2 text-sm leading-6 text-slate-500">
								O código pode conter letras e números. Espaços são ignorados.
							</p>
						</div>

						<button
							type="submit"
							class="inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-600 px-6 text-sm font-black text-white transition hover:bg-emerald-700"
						>
							Vincular código
						</button>
					</form>
				</div>

				<div class="rounded-3xl border border-amber-200 bg-white p-5">
					<p class="text-sm font-black text-slate-950">Vínculos encontrados</p>
					<p class="mt-2 text-sm leading-7 text-slate-600">
						Quando um vínculo ficar ativo, ele passa a aparecer aqui e também no topo do painel.
					</p>

					{#if data.enrollments.length > 0}
						<div class="mt-4 grid gap-3">
							{#each data.enrollments as enrollment (enrollment.enrollmentId)}
								<article class="rounded-3xl border border-amber-200 bg-amber-50 p-4">
									<div class="flex items-start justify-between gap-3">
										<div>
											<p class="text-base font-black text-slate-900">{enrollment.className}</p>
											<p class="mt-1 text-sm text-slate-600">{enrollment.studentName}</p>
										</div>

										<span
											class={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${enrollmentStatusClass(enrollment.status)}`}
										>
											{enrollmentStatusLabel(enrollment.status)}
										</span>
									</div>

									<p class="mt-3 text-sm text-slate-500">
										{#if enrollment.joinedAt}
											Vinculado em {formatDate(enrollment.joinedAt)}
										{:else}
											Aguardando ativação do vínculo
										{/if}
									</p>
								</article>
							{/each}
						</div>
					{:else}
						<div
							class="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"
						>
							Ainda não há vínculos disponíveis para esta conta.
						</div>
					{/if}
				</div>
			</div>
		</section>
	{:else if !data.hasPublishedData}
		<section class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
			<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Situação atual</p>
			<h2 class="mt-2 text-3xl font-black tracking-tight text-slate-950">
				{data.emptyState.title}
			</h2>
			<p class="mt-4 max-w-4xl text-base leading-8 text-slate-600">
				{data.emptyState.description}
			</p>

			<div class="mt-6 flex flex-wrap gap-3">
				<a
					href={resolve('/student/skills')}
					class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
				>
					Ver matérias
				</a>

				<a
					href={resolve('/student/journey')}
					class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
				>
					Ver trajetória
				</a>
			</div>
		</section>
	{:else}
		<section class="grid gap-4 lg:grid-cols-3">
			<article class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
				<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
					Como estou agora
				</p>
				<p class="mt-3 text-4xl font-black tracking-tight text-slate-950">
					{formatStudentGrade(data.currentAverage)}
				</p>
				<p class="mt-2 text-sm font-semibold text-slate-600">
					{formatStudentPercent(data.currentAveragePercent)} de aproveitamento normalizado
				</p>
				<p class="mt-4 text-sm leading-7 text-slate-500">
					Base atual em {data.summary.subjectsWithScore} de {data.summary.totalSubjects} matéria(s) com
					publicação.
				</p>
			</article>

			<article class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
				<div class="flex items-start justify-between gap-3">
					<div>
						<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
							Qual tendência
						</p>
						<p class="mt-3 text-3xl font-black tracking-tight text-slate-950">
							{data.trendDirection}
						</p>
					</div>

					<span
						class={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${trendToneClass(data.trendDirection)}`}
					>
						{data.trendDirection}
					</span>
				</div>

				<p class="mt-4 text-sm leading-7 text-slate-500">
					{trendHelperText(data.trendDirection)}
				</p>
			</article>

			<article class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
				<div class="flex items-start justify-between gap-3">
					<div>
						<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
							Onde revisar
						</p>
						<p class="mt-3 text-2xl font-black tracking-tight text-slate-950">
							{reviewAreaTitle}
						</p>
					</div>

					<span
						class={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${reviewAreaClass}`}
					>
						{reviewAreaBadgeLabel}
					</span>
				</div>

				<p class="mt-4 text-sm leading-7 text-slate-500">
					{reviewAreaDescription}
				</p>

				{#if shouldShowReviewMetrics && data.topReviewArea}
					<div class="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-slate-600">
						<span>{formatStudentGrade(data.topReviewArea.currentAverage)} de nota atual</span>
						<span>·</span>
						<span
							>{formatStudentPercent(data.topReviewArea.normalizedPercent)} de aproveitamento</span
						>
					</div>
				{/if}
			</article>
		</section>

		<section class="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
			<div class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
				<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
							Publicações recentes
						</p>
						<h2 class="mt-2 text-3xl font-black tracking-tight text-slate-950">
							O que mudou por último
						</h2>
					</div>

					<a
						href={resolve('/student/journey')}
						class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
					>
						Ver trajetória
					</a>
				</div>

				{#if data.recentPublications.length === 0}
					<div
						class="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600"
					>
						Ainda não há publicações suficientes para mostrar suas atualizações recentes.
					</div>
				{:else}
					<div class="mt-6 grid gap-4">
						{#each data.recentPublications as item (item.assessmentId)}
							<article class="rounded-3xl border border-slate-200 bg-slate-50 p-5">
								<div class="flex flex-wrap items-start justify-between gap-3">
									<div>
										<h3 class="text-lg font-black text-slate-950">{item.title}</h3>
										<p class="mt-1 text-sm text-slate-600">{item.subjectName}</p>
									</div>

									<p class="text-sm font-semibold text-slate-500">{formatDate(item.date)}</p>
								</div>

								<div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
									<div class="rounded-2xl border border-slate-200 bg-white p-4">
										<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
											Sua nota
										</p>
										<p class="mt-2 text-xl font-black tracking-tight text-slate-950">
											{formatStudentGrade(item.rawScore)}
										</p>
									</div>

									<div class="rounded-2xl border border-slate-200 bg-white p-4">
										<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
											Aproveitamento
										</p>
										<p class="mt-2 text-xl font-black tracking-tight text-slate-950">
											{formatStudentPercent(item.normalizedPercent)}
										</p>
									</div>

									<div class="rounded-2xl border border-slate-200 bg-white p-4">
										<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
											Gap para a turma
										</p>
										<p class="mt-2 text-xl font-black tracking-tight text-slate-950">
											{formatStudentSignedNumber(item.gapPercent)}
										</p>
									</div>

									<div class="rounded-2xl border border-slate-200 bg-white p-4">
										<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
											Leitura
										</p>
										<p class="mt-2 text-sm font-black leading-6 text-slate-950">
											{item.performanceLabel}
										</p>
										<p class="mt-1 text-xs text-slate-500">{item.comparisonLabel}</p>
									</div>
								</div>
							</article>
						{/each}
					</div>
				{/if}
			</div>

			<aside class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
				<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Leitura geral</p>
				<h2 class="mt-2 text-3xl font-black tracking-tight text-slate-950">
					{data.academicSummary.title}
				</h2>
				<p class="mt-4 text-base leading-8 text-slate-600">
					{data.academicSummary.description}
				</p>

				{#if data.topStrength}
					<div class="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
						<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
							Ponto forte agora
						</p>
						<p class="mt-2 text-lg font-black text-slate-950">{data.topStrength.name}</p>
						<p class="mt-2 text-sm leading-7 text-slate-600">{data.topStrength.reason}</p>
					</div>
				{/if}
			</aside>
		</section>

		<section class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Matérias</p>
					<h2 class="mt-2 text-3xl font-black tracking-tight text-slate-950">
						Resumo rápido por matéria
					</h2>
				</div>

				<a
					href={resolve('/student/skills')}
					class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
				>
					Ver todas
				</a>
			</div>

			{#if visibleSubjects.length === 0}
				<div
					class="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600"
				>
					Ainda não há matérias publicadas para mostrar neste resumo.
				</div>
			{:else}
				<div class="mt-6 grid gap-4 md:grid-cols-2">
					{#each visibleSubjects as subject (subject.id)}
						<article class="rounded-3xl border border-slate-200 bg-slate-50 p-5">
							<div class="flex items-start justify-between gap-3">
								<div>
									<h3 class="text-lg font-black text-slate-950">{subject.name}</h3>
									<p class="mt-1 text-sm text-slate-500">{subject.code ?? 'Sem código'}</p>
								</div>

								<span
									class={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${subjectSituationClass(subject.subjectStatus)}`}
								>
									{subjectSituationLabel(subject.subjectStatus)}
								</span>
							</div>

							<div class="mt-4 grid gap-3 sm:grid-cols-2">
								<div class="rounded-2xl border border-slate-200 bg-white p-4">
									<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
										Nota atual
									</p>
									<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
										{formatStudentGrade(subject.currentAverage)}
									</p>
								</div>

								<div class="rounded-2xl border border-slate-200 bg-white p-4">
									<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
										Aproveitamento
									</p>
									<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
										{formatStudentPercent(subject.normalizedPercent)}
									</p>
								</div>
							</div>

							<div class="mt-4 flex flex-wrap gap-2">
								<span
									class={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${trendToneClass(subject.trendDirection)}`}
								>
									{subject.trendDirection}
								</span>
							</div>

							<p class="mt-4 text-sm leading-7 text-slate-600">{subject.description}</p>

							<p class="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
								{subject.assessmentsCount} publicação(ões)
								{#if subject.latestAssessmentDate}
									· última em {formatDate(subject.latestAssessmentDate)}
								{/if}
							</p>
						</article>
					{/each}
				</div>
			{/if}
		</section>
	{/if}
</div>
