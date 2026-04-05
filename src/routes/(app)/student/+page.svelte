<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { formatPercentLabel, formatPtBrGrade } from '$lib/utils/format';

	type PortalStatus = 'pending-link' | 'ready';
	type SubjectStatus = 'good' | 'attention' | 'pending';
	type Trend = 'improving' | 'declining' | 'stable' | 'insufficient_data';

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

	type SubjectCard = {
		subjectId: string;
		subjectName: string;
		score: number | null;
		progress: number | null;
		status: SubjectStatus;
		description: string;
		assessmentsCount: number;
		latestAssessmentTitle: string | null;
		latestAssessmentDate: string | null;
	};

	type LongitudinalPoint = {
		assessment_id: string;
		assessment_title: string;
		assessment_date: string;
		subject_id: string;
		subject_name: string;
		raw_score: number | null;
		normalized_percent: number | null;
		status: 'draft' | 'published';
	};

	type LongitudinalSummary = {
		student_id: string;
		student_name: string;
		best_subject: string | null;
		worst_subject: string | null;
		recent_trend: Trend;
		timeline: LongitudinalPoint[];
	} | null;

	type PageData = {
		portal: {
			status: PortalStatus;
			message: string;
		};
		summary: {
			studentName: string;
			className: string | null;
			totalSubjects: number;
			subjectsWithScore: number;
			pendingSubjects: number;
			generalAverage: number | null;
			generalPercent: number | null;
			publishedAssessments: number;
			recentTrend: Trend;
			bestSubjectName: string | null;
		};
		bestSubject: SubjectCard | null;
		prioritySubject: SubjectCard | null;
		subjects: SubjectCard[];
		academicSummary: {
			title: string;
			description: string;
		};
		longitudinal: LongitudinalSummary;
		enrollments: Enrollment[];
	};

	type ActionData = {
		success?: boolean;
		action?: string;
		message?: string;
		inviteCode?: string;
	};

	type Props = {
		data: PageData;
		form?: ActionData;
	};

	let { data, form }: Props = $props();

	let inviteCode = $state('');

	const activeEnrollment = $derived.by(
		() =>
			data.enrollments.find((item) => item.isCurrent) ??
			data.enrollments.find((item) => item.isSelectable) ??
			null
	);

	const latestTimeline = $derived.by(() => data.longitudinal?.timeline.slice(0, 4) ?? []);

	const formatDate = (value: string | null) => {
		if (!value) return '--';

		const safeDate = value.length > 10 ? new Date(value) : new Date(`${value}T00:00:00`);
		if (Number.isNaN(safeDate.getTime())) return '--';

		return new Intl.DateTimeFormat('pt-BR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		}).format(safeDate);
	};

	const statusLabel = (status: SubjectStatus) => {
		if (status === 'good') return 'Dentro do esperado';
		if (status === 'attention') return 'Pede atenção';
		return 'Sem publicação';
	};

	const statusClass = (status: SubjectStatus) => {
		if (status === 'good') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
		if (status === 'attention') return 'border-amber-200 bg-amber-50 text-amber-700';
		return 'border-slate-200 bg-slate-100 text-slate-700';
	};

	const trendLabel = (trend: Trend) => {
		if (trend === 'improving') return 'Em melhora';
		if (trend === 'declining') return 'Em queda';
		if (trend === 'stable') return 'Estável';
		return 'Base insuficiente';
	};

	const trendClass = (trend: Trend) => {
		if (trend === 'improving') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
		if (trend === 'declining') return 'border-red-200 bg-red-50 text-red-700';
		if (trend === 'stable') return 'border-sky-200 bg-sky-50 text-sky-700';
		return 'border-slate-200 bg-slate-100 text-slate-700';
	};

	const priorityTitle = () => {
		if (!data.prioritySubject && data.summary.pendingSubjects === 0) {
			return 'Tudo dentro do esperado';
		}

		if (data.prioritySubject?.status === 'attention') {
			return data.prioritySubject.subjectName;
		}

		if (data.summary.pendingSubjects > 0) {
			return 'Publicações ainda insuficientes';
		}

		return data.prioritySubject?.subjectName ?? 'Seu próximo foco';
	};

	const priorityText = () => {
		if (!data.prioritySubject && data.summary.pendingSubjects === 0) {
			return 'Seu panorama atual não mostra nenhum ponto crítico imediato.';
		}

		if (data.prioritySubject?.status === 'attention') {
			return data.prioritySubject.description;
		}

		if (data.summary.pendingSubjects > 0) {
			return `${data.summary.pendingSubjects} matéria(s) ainda não têm publicação suficiente para uma leitura completa.`;
		}

		return data.prioritySubject?.description ?? 'Abra suas matérias para aprofundar a leitura.';
	};
</script>

<svelte:head>
	<title>Class Insights - Panorama do aluno</title>
</svelte:head>

{#if data.portal.status === 'pending-link'}
	<section class="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_360px]">
		<div class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
			<p class="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Primeiro passo</p>
			<h2 class="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
				Sua área já está pronta.
			</h2>
			<p class="mt-4 max-w-2xl text-base leading-8 text-slate-600">
				Agora falta concluir ou ativar um vínculo acadêmico para mostrar sua leitura de progresso.
			</p>

			<div class="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-5">
				<p class="text-sm font-bold text-sky-900">{data.portal.message}</p>
			</div>

			<form
				method="POST"
				use:enhance
				class="mt-6 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5"
			>
				<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
					Adicionar código de convite
				</p>

				<div class="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
					<div>
						<label for="inviteCode" class="block text-sm font-bold text-slate-700"> Código </label>
						<input
							id="inviteCode"
							name="inviteCode"
							type="text"
							bind:value={inviteCode}
							placeholder="Digite seu código"
							class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold uppercase tracking-[0.14em] text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
						/>
					</div>

					<button
						type="submit"
						class="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800"
					>
						Adicionar código
					</button>
				</div>

				{#if form?.message}
					<div
						class={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${
							form.success
								? 'border-emerald-200 bg-emerald-50 text-emerald-700'
								: 'border-red-200 bg-red-50 text-red-700'
						}`}
					>
						{form.message}
					</div>
				{/if}
			</form>
		</div>

		<aside class="grid gap-6">
			<section class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
				<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Sua situação</p>
				<h3 class="mt-3 text-2xl font-black tracking-tight text-slate-950">Aguardando vínculo</h3>
				<p class="mt-3 text-sm leading-7 text-slate-600">
					Assim que um vínculo ativo estiver disponível, esta tela passa a mostrar turma, matérias e
					histórico.
				</p>
			</section>

			<section class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
				<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
					Vínculos encontrados
				</p>

				{#if data.enrollments.length === 0}
					<div class="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
						<p class="text-sm leading-7 text-slate-600">
							Nenhum vínculo foi encontrado ainda para esta conta.
						</p>
					</div>
				{:else}
					<div class="mt-4 grid gap-3">
						{#each data.enrollments as enrollment (enrollment.enrollmentId)}
							<article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<div class="flex items-start justify-between gap-3">
									<div class="min-w-0">
										<p class="text-base font-black tracking-tight text-slate-950">
											{enrollment.className}
										</p>
										<p class="mt-1 text-sm text-slate-600">
											Status: {enrollment.status === 'active'
												? 'ativo'
												: enrollment.status === 'pending'
													? 'pendente'
													: 'arquivado'}
										</p>
									</div>

									<span
										class={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${
											enrollment.status === 'active'
												? 'border-emerald-200 bg-emerald-50 text-emerald-700'
												: enrollment.status === 'pending'
													? 'border-amber-200 bg-amber-50 text-amber-700'
													: 'border-slate-200 bg-slate-100 text-slate-700'
										}`}
									>
										{enrollment.status}
									</span>
								</div>
							</article>
						{/each}
					</div>
				{/if}
			</section>
		</aside>
	</section>
{:else}
	<div class="grid gap-6">
		<section class="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_340px]">
			<div class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
				<p class="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Seu progresso</p>
				<h2 class="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
					Olá, {data.summary.studentName}.
				</h2>
				<p class="mt-4 max-w-3xl text-base leading-8 text-slate-600">
					Turma ativa:
					<strong class="text-slate-950">
						{data.summary.className ?? activeEnrollment?.className ?? '—'}
					</strong>. Aqui fica o que mais importa no seu momento atual.
				</p>

				<div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
						<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
							Média publicada
						</p>
						<p class="mt-2 text-3xl font-black tracking-tight text-slate-950">
							{formatPtBrGrade(data.summary.generalAverage)}
						</p>
						<p class="mt-2 text-sm leading-6 text-slate-600">Média real do que já foi publicado.</p>
					</div>

					<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
						<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Cobertura</p>
						<p class="mt-2 text-3xl font-black tracking-tight text-slate-950">
							{data.summary.subjectsWithScore}/{data.summary.totalSubjects}
						</p>
						<p class="mt-2 text-sm leading-6 text-slate-600">Matérias com publicação suficiente.</p>
					</div>

					<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
						<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
							Aproveitamento
						</p>
						<p class="mt-2 text-3xl font-black tracking-tight text-slate-950">
							{formatPercentLabel(data.summary.generalPercent)}
						</p>
						<p class="mt-2 text-sm leading-6 text-slate-600">Leitura percentual normalizada.</p>
					</div>

					<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
						<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
							Tendência recente
						</p>
						<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
							{trendLabel(data.summary.recentTrend)}
						</p>
						<p class="mt-2 text-sm leading-6 text-slate-600">
							Baseada nas publicações disponíveis.
						</p>
					</div>
				</div>
			</div>

			<aside class="grid gap-4">
				<div class={`rounded-[1.75rem] border p-5 ${trendClass(data.summary.recentTrend)}`}>
					<p class="text-xs font-black uppercase tracking-[0.24em]">Leitura do momento</p>
					<h3 class="mt-3 text-2xl font-black tracking-tight">
						{trendLabel(data.summary.recentTrend)}
					</h3>
					<p class="mt-3 text-sm leading-7 text-slate-700">
						{data.summary.publishedAssessments} publicação(ões) consideradas até agora.
					</p>
				</div>

				<div class="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
					<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
						Situação geral
					</p>
					<h3 class="mt-3 text-2xl font-black tracking-tight text-slate-950">
						{data.summary.pendingSubjects > 0
							? `${data.summary.pendingSubjects} matéria(s) ainda sem leitura completa`
							: 'Você já tem base publicada nas matérias principais'}
					</h3>
					<p class="mt-3 text-sm leading-7 text-slate-600">
						{data.summary.bestSubjectName
							? `Seu melhor destaque até aqui é ${data.summary.bestSubjectName}.`
							: 'Assim que houver mais publicações, o portal destaca seus pontos fortes com mais clareza.'}
					</p>
				</div>
			</aside>
		</section>

		<section class="grid gap-6 xl:grid-cols-2">
			<article class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
				<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Atenção agora</p>
				<h3 class="mt-3 text-3xl font-black tracking-tight text-slate-950">
					{priorityTitle()}
				</h3>

				{#if data.prioritySubject}
					<div class="mt-4">
						<span
							class={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${statusClass(data.prioritySubject.status)}`}
						>
							{statusLabel(data.prioritySubject.status)}
						</span>
					</div>
				{/if}

				<p class="mt-4 text-base leading-8 text-slate-600">
					{priorityText()}
				</p>

				<div class="mt-6 grid gap-3 sm:grid-cols-2">
					<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
						<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
							Nota publicada
						</p>
						<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
							{formatPtBrGrade(data.prioritySubject?.score)}
						</p>
					</div>

					<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
						<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
							Aproveitamento
						</p>
						<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
							{formatPercentLabel(data.prioritySubject?.progress)}
						</p>
					</div>
				</div>

				<a
					href={resolve('/student/skills')}
					class="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800"
				>
					Abrir matérias
				</a>
			</article>

			<article class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
				<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
					Seu melhor momento
				</p>
				<h3 class="mt-3 text-3xl font-black tracking-tight text-slate-950">
					{data.bestSubject?.subjectName ?? 'Ainda sem destaque suficiente'}
				</h3>

				{#if data.bestSubject}
					<div class="mt-4">
						<span
							class={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${statusClass(data.bestSubject.status)}`}
						>
							{statusLabel(data.bestSubject.status)}
						</span>
					</div>
				{/if}

				<p class="mt-4 text-base leading-8 text-slate-600">
					{data.bestSubject?.description ??
						'Assim que houver mais publicações, o portal passa a destacar sua melhor matéria com mais confiança.'}
				</p>

				<div class="mt-6 grid gap-3 sm:grid-cols-2">
					<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
						<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
							Nota publicada
						</p>
						<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
							{formatPtBrGrade(data.bestSubject?.score)}
						</p>
					</div>

					<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
						<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
							Aproveitamento
						</p>
						<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
							{formatPercentLabel(data.bestSubject?.progress)}
						</p>
					</div>
				</div>

				<a
					href={resolve('/student/journey')}
					class="mt-6 inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
				>
					Abrir trajetória
				</a>
			</article>
		</section>

		<section class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Matérias</p>
					<h3 class="mt-2 text-3xl font-black tracking-tight text-slate-950">
						Como você está em cada matéria
					</h3>
				</div>

				<a
					href={resolve('/student/skills')}
					class="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
				>
					Ver todas
				</a>
			</div>

			<div class="mt-6 grid gap-4 xl:grid-cols-2">
				{#if data.subjects.length === 0}
					<div
						class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 xl:col-span-2"
					>
						<p class="text-base font-bold text-slate-950">Sem matérias para mostrar</p>
						<p class="mt-2 text-sm leading-7 text-slate-600">
							Assim que houver vínculo e publicações suficientes, suas matérias aparecem aqui.
						</p>
					</div>
				{:else}
					{#each data.subjects as subject (subject.subjectId)}
						<article class="rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-5">
							<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
								<div class="min-w-0">
									<h4 class="text-2xl font-black tracking-tight text-slate-950">
										{subject.subjectName}
									</h4>

									<div class="mt-3">
										<span
											class={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${statusClass(subject.status)}`}
										>
											{statusLabel(subject.status)}
										</span>
									</div>

									<p class="mt-4 text-sm leading-7 text-slate-600">
										{subject.description}
									</p>
								</div>

								<a
									href={resolve('/student/skills')}
									class="inline-flex h-11 shrink-0 items-center justify-center rounded-2xl bg-white px-4 text-sm font-black text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50"
								>
									Ver matéria
								</a>
							</div>

							<div class="mt-5 grid gap-3 sm:grid-cols-3">
								<div class="rounded-2xl border border-slate-200 bg-white p-4">
									<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
										Média publicada
									</p>
									<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
										{formatPtBrGrade(subject.score)}
									</p>
								</div>

								<div class="rounded-2xl border border-slate-200 bg-white p-4">
									<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
										Aproveitamento
									</p>
									<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
										{formatPercentLabel(subject.progress)}
									</p>
								</div>

								<div class="rounded-2xl border border-slate-200 bg-white p-4">
									<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
										Publicações
									</p>
									<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
										{subject.assessmentsCount}
									</p>
								</div>
							</div>

							<div class="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
								<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
									Última publicação
								</p>
								<p class="mt-2 text-sm font-bold text-slate-950">
									{subject.latestAssessmentTitle ?? 'Sem publicação recente'}
								</p>
								<p class="mt-1 text-sm text-slate-600">
									{subject.latestAssessmentDate
										? formatDate(subject.latestAssessmentDate)
										: 'Ainda não disponível'}
								</p>
							</div>
						</article>
					{/each}
				{/if}
			</div>
		</section>

		<section class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
						Últimas publicações
					</p>
					<h3 class="mt-2 text-3xl font-black tracking-tight text-slate-950">
						O que entrou na sua leitura recente
					</h3>
				</div>

				<a
					href={resolve('/student/journey')}
					class="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
				>
					Abrir trajetória
				</a>
			</div>

			<div class="mt-6 grid gap-4 xl:grid-cols-2">
				{#if latestTimeline.length === 0}
					<div
						class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 xl:col-span-2"
					>
						<p class="text-base font-bold text-slate-950">Sem publicações recentes</p>
						<p class="mt-2 text-sm leading-7 text-slate-600">
							Ainda não há base suficiente para mostrar uma linha recente aqui.
						</p>
					</div>
				{:else}
					{#each latestTimeline as item (item.assessment_id)}
						<article class="rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-5">
							<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
								{formatDate(item.assessment_date)}
							</p>

							<h4 class="mt-2 text-xl font-black tracking-tight text-slate-950">
								{item.assessment_title}
							</h4>

							<p class="mt-1 text-sm leading-6 text-slate-600">
								{item.subject_name}
							</p>

							<div class="mt-4 grid gap-3 sm:grid-cols-2">
								<div class="rounded-2xl border border-slate-200 bg-white p-4">
									<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
										Nota registrada
									</p>
									<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
										{formatPtBrGrade(item.raw_score)}
									</p>
								</div>

								<div class="rounded-2xl border border-slate-200 bg-white p-4">
									<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
										Aproveitamento
									</p>
									<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
										{formatPercentLabel(item.normalized_percent)}
									</p>
								</div>
							</div>
						</article>
					{/each}
				{/if}
			</div>
		</section>

		<section class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
			<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Resumo acadêmico</p>
			<h3 class="mt-2 text-3xl font-black tracking-tight text-slate-950">
				{data.academicSummary.title}
			</h3>
			<p class="mt-4 max-w-4xl text-base leading-8 text-slate-600">
				{data.academicSummary.description}
			</p>
		</section>
	</div>
{/if}
