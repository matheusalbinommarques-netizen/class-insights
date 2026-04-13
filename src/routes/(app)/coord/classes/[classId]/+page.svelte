<script lang="ts">
	type Trend = 'improving' | 'declining' | 'stable' | 'insufficient_data';
	type StudentStatus = 'healthy' | 'attention' | 'critical' | 'pending';

	export let data: {
		classroom: {
			id: string;
			name: string;
			teacherId: string;
			teacherName: string;
			accessCode: string | null;
		};
		summary: {
			studentsCount: number;
			publishedAssessments: number;
			averagePercent: number | null;
			averageLabel: string;
			averagePercentLabel: string;
			coveragePercent: number;
			studentsAtRisk: number;
			classTrend: Trend;
			classTrendLabel: string;
			latestPublicationDate: string | null;
			primaryReason: string;
		};
		institutionalFocus: {
			criticalSubject: {
				subjectId: string;
				subjectName: string;
				averagePercent: number | null;
				averageLabel: string;
				averagePercentLabel: string;
				assessmentsCount: number;
				recentTrend: Trend;
				studentsAtRisk: number;
				primaryReason: string;
				detailHref: string;
			} | null;
			attentionStudents: Array<{
				studentId: string;
				studentName: string;
				averagePercent: number | null;
				averageLabel: string;
				averagePercentLabel: string;
				status: StudentStatus;
				recentTrend: Trend;
				latestAssessmentTitle: string | null;
				latestAssessmentDate: string | null;
				detailHref: string;
			}>;
			classTrend: Trend;
			classTrendLabel: string;
		};
		subjects: Array<{
			subjectId: string;
			subjectName: string;
			averagePercent: number | null;
			averageLabel: string;
			averagePercentLabel: string;
			assessmentsCount: number;
			recentTrend: Trend;
			studentsAtRisk: number;
			priorityScore: number;
			primaryReason: string;
			detailHref: string;
		}>;
		students: Array<{
			studentId: string;
			studentName: string;
			averagePercent: number | null;
			averageLabel: string;
			averagePercentLabel: string;
			publishedAssessments: number;
			status: StudentStatus;
			recentTrend: Trend;
			latestAssessmentTitle: string | null;
			latestAssessmentDate: string | null;
			priorityScore: number;
			detailHref: string;
		}>;
		timeline: Array<{
			assessmentId: string;
			assessmentTitle: string;
			assessmentDate: string;
			subjectName: string;
			averagePercent: number | null;
			averagePercentLabel: string;
			studentsWithScore: number;
		}>;
	};

	const formatDate = (value: string | null | undefined) => {
		if (!value) return '--';

		return new Intl.DateTimeFormat('pt-BR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		}).format(new Date(`${value}T00:00:00`));
	};

	const trendLabel = (trend: Trend) => {
		if (trend === 'declining') return 'Em queda';
		if (trend === 'improving') return 'Em melhora';
		if (trend === 'stable') return 'Estável';
		return 'Base insuficiente';
	};

	const trendClass = (trend: Trend) => {
		if (trend === 'declining') return 'border-red-200 bg-red-50 text-red-700';
		if (trend === 'improving') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
		if (trend === 'stable') return 'border-sky-200 bg-sky-50 text-sky-700';
		return 'border-slate-200 bg-slate-50 text-slate-600';
	};

	const statusLabel = (status: StudentStatus) => {
		if (status === 'critical') return 'Crítico';
		if (status === 'attention') return 'Atenção';
		if (status === 'healthy') return 'Dentro do esperado';
		return 'Sem base';
	};

	const statusClass = (status: StudentStatus) => {
		if (status === 'critical') return 'border-red-200 bg-red-50 text-red-700';
		if (status === 'attention') return 'border-amber-200 bg-amber-50 text-amber-700';
		if (status === 'healthy') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
		return 'border-slate-200 bg-slate-50 text-slate-600';
	};

	const metricToneClass = (kind: 'default' | 'attention' | 'critical' | 'info') => {
		if (kind === 'critical') return 'border-red-200 bg-red-50';
		if (kind === 'attention') return 'border-amber-200 bg-amber-50';
		if (kind === 'info') return 'border-sky-200 bg-sky-50';
		return 'border-slate-200 bg-slate-50';
	};

	const coverageTone = (coveragePercent: number) => {
		if (coveragePercent < 50) return 'critical';
		if (coveragePercent < 80) return 'attention';
		return 'info';
	};

	const subjectTone = (averagePercent: number | null, trend: Trend) => {
		if (typeof averagePercent !== 'number') return 'default';
		if (averagePercent < 50 || (trend === 'declining' && averagePercent < 70)) return 'critical';
		if (averagePercent < 70 || trend === 'declining') return 'attention';
		return 'default';
	};

	$: criticalSubject = data.institutionalFocus.criticalSubject;
	$: attentionStudents = data.institutionalFocus.attentionStudents;
	$: topSubjects = data.subjects.slice(0, 4);
	$: remainingSubjects = data.subjects.slice(4);
	$: topStudents = data.students.slice(0, 6);
</script>

<svelte:head>
	<title>Class Insights - Turma no escopo</title>
</svelte:head>

<div class="grid gap-6">
	<section class="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_360px]">
		<div class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
			<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div class="min-w-0">
					<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">
						Leitura institucional da turma
					</p>
					<h1 class="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
						{data.classroom.name}
					</h1>
					<p class="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
						Esta visão compara a turma pelo que já foi publicado, mostra a tendência mais visível e
						indica onde o acompanhamento da coordenação deve começar.
					</p>
				</div>

				<div class="flex flex-wrap gap-2">
					<span
						class="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-600"
					>
						Professor: {data.classroom.teacherName}
					</span>

					{#if data.classroom.accessCode}
						<span
							class="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-amber-700"
						>
							Código: {data.classroom.accessCode}
						</span>
					{/if}
				</div>
			</div>

			<div class="mt-5 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
				<p class="text-sm font-semibold text-slate-700">{data.summary.primaryReason}</p>
			</div>

			<div class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				<article class={`rounded-3xl border p-4 ${metricToneClass('default')}`}>
					<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
						Média do recorte
					</p>
					<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
						{data.summary.averagePercentLabel}%
					</p>
					<p class="mt-2 text-sm text-slate-600">
						Leitura institucional com base apenas em resultados publicados.
					</p>
				</article>

				<article
					class={`rounded-3xl border p-4 ${metricToneClass(coverageTone(data.summary.coveragePercent))}`}
				>
					<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
						Cobertura lida
					</p>
					<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
						{data.summary.coveragePercent}%
					</p>
					<p class="mt-2 text-sm text-slate-600">
						Quanto do recorte já possui publicação suficiente para leitura.
					</p>
				</article>

				<article
					class={`rounded-3xl border p-4 ${metricToneClass(
						data.summary.studentsAtRisk > 0 ? 'attention' : 'default'
					)}`}
				>
					<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
						Alunos em atenção
					</p>
					<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
						{data.summary.studentsAtRisk}
					</p>
					<p class="mt-2 text-sm text-slate-600">
						Quantidade de alunos que já pedem acompanhamento mais próximo.
					</p>
				</article>

				<article
					class={`rounded-3xl border p-4 ${metricToneClass(
						data.summary.classTrend === 'declining'
							? 'critical'
							: data.summary.classTrend === 'improving'
								? 'info'
								: data.summary.classTrend === 'stable'
									? 'default'
									: 'default'
					)}`}
				>
					<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Tendência</p>
					<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
						{data.summary.classTrendLabel}
					</p>
					<p class="mt-2 text-sm text-slate-600">
						Última publicação em {formatDate(data.summary.latestPublicationDate)}.
					</p>
				</article>
			</div>
		</div>

		<div class="grid gap-4">
			<div class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
				<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">Leitura rápida</p>
				<h2 class="mt-3 text-xl font-black tracking-tight text-slate-950">
					Como interpretar esta turma
				</h2>

				<div class="mt-5 grid gap-3">
					<div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
						<p class="text-sm font-bold text-slate-950">Compare o conjunto, não casos isolados</p>
						<p class="mt-2 text-sm leading-6 text-slate-600">
							A coordenação começa pela média publicada, pela cobertura e pela tendência geral da
							turma.
						</p>
					</div>

					<div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
						<p class="text-sm font-bold text-slate-950">Procure concentração de risco</p>
						<p class="mt-2 text-sm leading-6 text-slate-600">
							Se a queda se concentra em uma matéria ou grupo de alunos, o acompanhamento fica mais
							preciso.
						</p>
					</div>

					<div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
						<p class="text-sm font-bold text-slate-950">Aprofunde só depois do panorama</p>
						<p class="mt-2 text-sm leading-6 text-slate-600">
							O drill-down em aluno e matéria existe para confirmar padrão, não para substituir a
							visão macro.
						</p>
					</div>
				</div>

				<div class="mt-5 flex flex-wrap gap-3">
					<a
						href="/coord"
						class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
					>
						Voltar ao painel
					</a>

					<a
						href={`/coord/teachers/${data.classroom.teacherId}`}
						class="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800"
					>
						Ver professor
					</a>
				</div>
			</div>
		</div>
	</section>

	<section class="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.9fr)]">
		<div class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">
						Foco institucional
					</p>
					<h2 class="mt-3 text-2xl font-black tracking-tight text-slate-950">
						O que mais explica o momento desta turma
					</h2>
				</div>

				<span
					class={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${trendClass(
						data.institutionalFocus.classTrend
					)}`}
				>
					{data.institutionalFocus.classTrendLabel}
				</span>
			</div>

			{#if criticalSubject}
				<div
					class={`mt-5 rounded-4xl border p-5 ${metricToneClass(
						subjectTone(criticalSubject.averagePercent, criticalSubject.recentTrend)
					)}`}
				>
					<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
						<div>
							<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
								Matéria mais crítica
							</p>
							<h3 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
								{criticalSubject.subjectName}
							</h3>
							<p class="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
								{criticalSubject.primaryReason}
							</p>
						</div>

						<div class="flex flex-wrap gap-2">
							<span
								class={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${trendClass(
									criticalSubject.recentTrend
								)}`}
							>
								{trendLabel(criticalSubject.recentTrend)}
							</span>

							<span
								class="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-600"
							>
								{criticalSubject.assessmentsCount} publicação(ões)
							</span>
						</div>
					</div>

					<div class="mt-5 grid gap-3 sm:grid-cols-3">
						<div class="rounded-3xl border border-white/70 bg-white/70 p-4">
							<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
								Média da matéria
							</p>
							<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
								{criticalSubject.averagePercentLabel}%
							</p>
						</div>

						<div class="rounded-3xl border border-white/70 bg-white/70 p-4">
							<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
								Alunos em atenção
							</p>
							<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
								{criticalSubject.studentsAtRisk}
							</p>
						</div>

						<div class="rounded-3xl border border-white/70 bg-white/70 p-4">
							<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Tendência</p>
							<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
								{trendLabel(criticalSubject.recentTrend)}
							</p>
						</div>
					</div>

					<div class="mt-5 flex justify-end">
						<a
							href={criticalSubject.detailHref}
							class="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800"
						>
							Abrir matéria
						</a>
					</div>
				</div>
			{:else}
				<div class="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
					<p class="text-base font-bold text-slate-950">Sem matéria crítica definida</p>
					<p class="mt-2 text-sm leading-6 text-slate-600">
						A turma ainda não possui base suficiente para destacar uma matéria dominante no recorte.
					</p>
				</div>
			{/if}
		</div>

		<div class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
			<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">
				Acompanhamento imediato
			</p>
			<h2 class="mt-3 text-2xl font-black tracking-tight text-slate-950">
				Quem pede leitura agora
			</h2>

			<div class="mt-5 grid gap-3">
				{#if attentionStudents.length === 0}
					<div class="rounded-3xl border border-slate-200 bg-slate-50 p-5">
						<p class="text-base font-bold text-slate-950">Nenhum aluno em atenção no momento</p>
						<p class="mt-2 text-sm leading-6 text-slate-600">
							Com a base atual, a turma não mostra casos claros que precisem de acompanhamento
							imediato.
						</p>
					</div>
				{:else}
					{#each attentionStudents as student (student.studentId)}
						<article class="rounded-3xl border border-slate-200 bg-slate-50 p-4">
							<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
								<div class="min-w-0">
									<h3 class="text-lg font-black tracking-tight text-slate-950">
										{student.studentName}
									</h3>
									<p class="mt-2 text-sm leading-6 text-slate-600">
										{student.latestAssessmentTitle
											? `Última publicação: ${student.latestAssessmentTitle} em ${formatDate(student.latestAssessmentDate)}.`
											: 'Ainda sem última publicação identificada para este aluno.'}
									</p>
								</div>

								<span
									class={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${statusClass(
										student.status
									)}`}
								>
									{statusLabel(student.status)}
								</span>
							</div>

							<div class="mt-4 grid gap-3 sm:grid-cols-2">
								<div class="rounded-2xl border border-white/70 bg-white/70 p-3">
									<p class="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
										Média publicada
									</p>
									<p class="mt-2 text-xl font-black tracking-tight text-slate-950">
										{student.averagePercentLabel}%
									</p>
								</div>

								<div class="rounded-2xl border border-white/70 bg-white/70 p-3">
									<p class="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
										Tendência
									</p>
									<p class="mt-2 text-xl font-black tracking-tight text-slate-950">
										{trendLabel(student.recentTrend)}
									</p>
								</div>
							</div>

							<div class="mt-4 flex justify-end">
								<a
									href={student.detailHref}
									class="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900 transition hover:border-slate-300 hover:bg-slate-100"
								>
									Ver aluno
								</a>
							</div>
						</article>
					{/each}
				{/if}
			</div>
		</div>
	</section>

	<section class="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
		<div class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
			<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">
				Comparativo por matéria
			</p>
			<h2 class="mt-3 text-2xl font-black tracking-tight text-slate-950">
				Onde a turma concentra queda, estabilidade ou melhora
			</h2>

			<div class="mt-5 grid gap-4">
				{#if topSubjects.length === 0}
					<div class="rounded-3xl border border-slate-200 bg-slate-50 p-5">
						<p class="text-base font-bold text-slate-950">Sem matérias publicadas</p>
						<p class="mt-2 text-sm leading-6 text-slate-600">
							A turma ainda não tem base publicada suficiente para comparação por matéria.
						</p>
					</div>
				{:else}
					{#each topSubjects as subject (subject.subjectId)}
						<article class="rounded-4xl border border-slate-200 bg-slate-50 p-5">
							<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
								<div class="min-w-0">
									<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
										Matéria
									</p>
									<h3 class="mt-2 text-xl font-black tracking-tight text-slate-950">
										{subject.subjectName}
									</h3>
									<p class="mt-3 text-sm leading-7 text-slate-600">{subject.primaryReason}</p>
								</div>

								<span
									class={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${trendClass(
										subject.recentTrend
									)}`}
								>
									{trendLabel(subject.recentTrend)}
								</span>
							</div>

							<div class="mt-5 grid gap-3 sm:grid-cols-3">
								<div class="rounded-3xl border border-white/70 bg-white/70 p-4">
									<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
										Média publicada
									</p>
									<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
										{subject.averagePercentLabel}%
									</p>
								</div>

								<div class="rounded-3xl border border-white/70 bg-white/70 p-4">
									<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
										Publicações
									</p>
									<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
										{subject.assessmentsCount}
									</p>
								</div>

								<div class="rounded-3xl border border-white/70 bg-white/70 p-4">
									<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
										Alunos em atenção
									</p>
									<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
										{subject.studentsAtRisk}
									</p>
								</div>
							</div>

							<div class="mt-5 flex justify-end">
								<a
									href={subject.detailHref}
									class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900 transition hover:border-slate-300 hover:bg-slate-100"
								>
									Abrir matéria
								</a>
							</div>
						</article>
					{/each}
				{/if}
			</div>

			{#if remainingSubjects.length > 0}
				<div class="mt-6 rounded-4xl border border-slate-200 bg-slate-50 p-5">
					<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
						Outras matérias no recorte
					</p>

					<div class="mt-4 grid gap-3 sm:grid-cols-2">
						{#each remainingSubjects as subject (subject.subjectId)}
							<a
								href={subject.detailHref}
								class="rounded-3xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50"
							>
								<div class="flex items-start justify-between gap-3">
									<div class="min-w-0">
										<p class="truncate text-base font-black text-slate-950">
											{subject.subjectName}
										</p>
										<p class="mt-1 text-sm text-slate-600">
											{subject.averagePercentLabel}% • {subject.assessmentsCount} publicação(ões)
										</p>
									</div>

									<span
										class={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${trendClass(
											subject.recentTrend
										)}`}
									>
										{trendLabel(subject.recentTrend)}
									</span>
								</div>
							</a>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<div class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
			<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">
				Pulso das publicações
			</p>
			<h2 class="mt-3 text-2xl font-black tracking-tight text-slate-950">
				Como a turma vem aparecendo ao longo do tempo
			</h2>

			<div class="mt-5 grid gap-3">
				{#if data.timeline.length === 0}
					<div class="rounded-3xl border border-slate-200 bg-slate-50 p-5">
						<p class="text-base font-bold text-slate-950">Sem publicações no histórico</p>
						<p class="mt-2 text-sm leading-6 text-slate-600">
							Ainda não há publicações suficientes para formar o pulso institucional da turma.
						</p>
					</div>
				{:else}
					{#each data.timeline as item (item.assessmentId)}
						<article class="rounded-3xl border border-slate-200 bg-slate-50 p-4">
							<div class="flex flex-col gap-2">
								<p class="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
									{formatDate(item.assessmentDate)}
								</p>
								<h3 class="text-lg font-black tracking-tight text-slate-950">
									{item.assessmentTitle}
								</h3>
								<p class="text-sm text-slate-600">{item.subjectName}</p>
							</div>

							<div class="mt-4 grid gap-3 sm:grid-cols-2">
								<div class="rounded-2xl border border-white/70 bg-white/70 p-3">
									<p class="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
										Média desta publicação
									</p>
									<p class="mt-2 text-xl font-black tracking-tight text-slate-950">
										{item.averagePercentLabel}%
									</p>
								</div>

								<div class="rounded-2xl border border-white/70 bg-white/70 p-3">
									<p class="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
										Alunos com base
									</p>
									<p class="mt-2 text-xl font-black tracking-tight text-slate-950">
										{item.studentsWithScore}
									</p>
								</div>
							</div>
						</article>
					{/each}
				{/if}
			</div>
		</div>
	</section>

	<section class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
		<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">
			Leitura ampliada dos alunos
		</p>
		<h2 class="mt-3 text-2xl font-black tracking-tight text-slate-950">
			Prioridade de acompanhamento dentro da turma
		</h2>

		<div class="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
			{#if topStudents.length === 0}
				<div
					class="rounded-3xl border border-slate-200 bg-slate-50 p-5 lg:col-span-2 xl:col-span-3"
				>
					<p class="text-base font-bold text-slate-950">Sem alunos para leitura</p>
					<p class="mt-2 text-sm leading-6 text-slate-600">
						A turma ainda não possui base publicada suficiente para comparar alunos neste recorte.
					</p>
				</div>
			{:else}
				{#each topStudents as student (student.studentId)}
					<article class="rounded-4xl border border-slate-200 bg-slate-50 p-5">
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0">
								<h3 class="truncate text-xl font-black tracking-tight text-slate-950">
									{student.studentName}
								</h3>
								<p class="mt-2 text-sm leading-6 text-slate-600">
									{student.latestAssessmentTitle
										? `Última publicação: ${student.latestAssessmentTitle}`
										: 'Sem última publicação identificada.'}
								</p>
							</div>

							<span
								class={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${statusClass(
									student.status
								)}`}
							>
								{statusLabel(student.status)}
							</span>
						</div>

						<div class="mt-5 grid gap-3 sm:grid-cols-2">
							<div class="rounded-3xl border border-white/70 bg-white/70 p-4">
								<p class="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
									Média publicada
								</p>
								<p class="mt-2 text-xl font-black tracking-tight text-slate-950">
									{student.averagePercentLabel}%
								</p>
							</div>

							<div class="rounded-3xl border border-white/70 bg-white/70 p-4">
								<p class="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
									Tendência
								</p>
								<p class="mt-2 text-xl font-black tracking-tight text-slate-950">
									{trendLabel(student.recentTrend)}
								</p>
							</div>
						</div>

						<div class="mt-4 flex items-center justify-between gap-3">
							<p class="text-sm text-slate-600">
								{student.latestAssessmentDate
									? `Última data: ${formatDate(student.latestAssessmentDate)}`
									: 'Sem data recente'}
							</p>

							<a
								href={student.detailHref}
								class="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900 transition hover:border-slate-300 hover:bg-slate-100"
							>
								Ver aluno
							</a>
						</div>
					</article>
				{/each}
			{/if}
		</div>
	</section>
</div>
