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
			coveragePercent: number;
			studentsAtRisk: number;
		};
		subjects: Array<{
			subjectId: string;
			subjectName: string;
			averagePercent: number | null;
			averageLabel: string;
			assessmentsCount: number;
			recentTrend: Trend;
		}>;
		students: Array<{
			studentId: string;
			studentName: string;
			averagePercent: number | null;
			averageLabel: string;
			publishedAssessments: number;
			status: StudentStatus;
			latestAssessmentTitle: string | null;
			latestAssessmentDate: string | null;
			detailHref: string;
		}>;
		timeline: Array<{
			assessmentId: string;
			assessmentTitle: string;
			assessmentDate: string;
			subjectName: string;
		}>;
	};

	const formatDate = (value: string | null) => {
		if (!value) return '--';
		return new Intl.DateTimeFormat('pt-BR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		}).format(new Date(`${value}T00:00:00`));
	};

	const statusClass = (status: StudentStatus) => {
		if (status === 'critical') return 'border-red-200 bg-red-50 text-red-700';
		if (status === 'attention') return 'border-amber-200 bg-amber-50 text-amber-700';
		if (status === 'healthy') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
		return 'border-slate-200 bg-slate-50 text-slate-600';
	};

	const statusLabel = (status: StudentStatus) => {
		if (status === 'critical') return 'Crítico';
		if (status === 'attention') return 'Atenção';
		if (status === 'healthy') return 'Saudável';
		return 'Sem base';
	};

	const trendClass = (trend: Trend) => {
		if (trend === 'declining') return 'border-red-200 bg-red-50 text-red-700';
		if (trend === 'improving') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
		if (trend === 'stable') return 'border-sky-200 bg-sky-50 text-sky-700';
		return 'border-slate-200 bg-slate-50 text-slate-600';
	};

	const trendLabel = (trend: Trend) => {
		if (trend === 'declining') return 'Em queda';
		if (trend === 'improving') return 'Em melhora';
		if (trend === 'stable') return 'Estável';
		return 'Base insuficiente';
	};
</script>

<svelte:head>
	<title>Class Insights - Turma institucional</title>
</svelte:head>

<div class="grid gap-6">
	<section class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
		<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
			<div>
				<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">
					Turma institucional
				</p>
				<h2 class="mt-2 text-3xl font-black tracking-tight text-slate-950">
					{data.classroom.name}
				</h2>
				<p class="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
					Professor responsável: <strong class="text-slate-900">{data.classroom.teacherName}</strong
					>
				</p>

				{#if data.classroom.accessCode}
					<p class="mt-2 text-xs font-black uppercase tracking-[0.25em] text-slate-500">
						Código {data.classroom.accessCode}
					</p>
				{/if}
			</div>

			<div class="flex flex-wrap gap-3">
				<a
					href="/coord"
					class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
				>
					Voltar ao painel
				</a>

				<a
					href={`/coord/teachers/${data.classroom.teacherId}`}
					class="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800"
				>
					Ver professor
				</a>
			</div>
		</div>

		<div class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
			<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
				<p class="text-xs font-black uppercase tracking-[0.28em] text-slate-500">Alunos</p>
				<p class="mt-3 text-3xl font-black tracking-tight text-slate-950">
					{data.summary.studentsCount}
				</p>
			</div>

			<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
				<p class="text-xs font-black uppercase tracking-[0.28em] text-slate-500">Publicações</p>
				<p class="mt-3 text-3xl font-black tracking-tight text-slate-950">
					{data.summary.publishedAssessments}
				</p>
			</div>

			<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
				<p class="text-xs font-black uppercase tracking-[0.28em] text-slate-500">Média</p>
				<p class="mt-3 text-3xl font-black tracking-tight text-slate-950">
					{data.summary.averageLabel} / 10
				</p>
			</div>

			<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
				<p class="text-xs font-black uppercase tracking-[0.28em] text-slate-500">Cobertura</p>
				<p class="mt-3 text-3xl font-black tracking-tight text-slate-950">
					{data.summary.coveragePercent}%
				</p>
			</div>

			<div class="rounded-2xl border border-amber-200 bg-amber-50 p-4">
				<p class="text-xs font-black uppercase tracking-[0.28em] text-amber-700">Alunos em risco</p>
				<p class="mt-3 text-3xl font-black tracking-tight text-slate-950">
					{data.summary.studentsAtRisk}
				</p>
			</div>
		</div>
	</section>

	<section class="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
		<div class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
			<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">
						Matérias da turma
					</p>
					<h3 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
						Como cada matéria está se comportando
					</h3>
				</div>
			</div>

			<div class="mt-5 grid gap-4 sm:grid-cols-2">
				{#if data.subjects.length === 0}
					<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:col-span-2">
						<p class="text-base font-bold text-slate-950">Nenhuma matéria encontrada</p>
						<p class="mt-2 text-sm leading-6 text-slate-600">
							Esta turma ainda não possui matérias visíveis no escopo institucional.
						</p>
					</div>
				{:else}
					{#each data.subjects as subject (subject.subjectId)}
						<article class="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
							<div class="flex items-start justify-between gap-3">
								<h4 class="text-lg font-black tracking-tight text-slate-950">
									{subject.subjectName}
								</h4>
								<span
									class={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${trendClass(subject.recentTrend)}`}
								>
									{trendLabel(subject.recentTrend)}
								</span>
							</div>

							<p class="mt-3 text-sm text-slate-600">
								Média publicada:
								<strong class="text-slate-900">{subject.averageLabel} / 10</strong>
							</p>

							<p class="mt-2 text-sm text-slate-600">
								Publicações:
								<strong class="text-slate-900">{subject.assessmentsCount}</strong>
							</p>
						</article>
					{/each}
				{/if}
			</div>
		</div>

		<div class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
			<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">Linha do tempo</p>
			<h3 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
				Publicações que sustentam a leitura
			</h3>

			<div class="mt-5 grid gap-3">
				{#if data.timeline.length === 0}
					<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
						<p class="text-base font-bold text-slate-950">Sem publicações ainda</p>
						<p class="mt-2 text-sm leading-6 text-slate-600">
							A leitura institucional aparecerá aqui quando a turma tiver avaliações publicadas.
						</p>
					</div>
				{:else}
					{#each data.timeline as item (item.assessmentId)}
						<div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
							<p class="text-sm font-bold text-slate-950">{item.assessmentTitle}</p>
							<p class="mt-2 text-sm text-slate-600">{item.subjectName}</p>
							<p class="mt-1 text-sm text-slate-500">{formatDate(item.assessmentDate)}</p>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	</section>

	<section class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
		<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">Alunos da turma</p>
		<h3 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
			Quem pode precisar de apoio primeiro
		</h3>

		<div class="mt-5 grid gap-4 xl:grid-cols-2">
			{#if data.students.length === 0}
				<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5 xl:col-span-2">
					<p class="text-base font-bold text-slate-950">Nenhum aluno encontrado</p>
					<p class="mt-2 text-sm leading-6 text-slate-600">
						Não foi possível montar a leitura por aluno desta turma.
					</p>
				</div>
			{:else}
				{#each data.students as student (student.studentId)}
					<article class="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
						<div class="flex items-start justify-between gap-3">
							<div>
								<h4 class="text-lg font-black tracking-tight text-slate-950">
									{student.studentName}
								</h4>
								<p class="mt-2 text-sm text-slate-600">
									Média publicada:
									<strong class="text-slate-900">{student.averageLabel} / 10</strong>
								</p>
							</div>

							<span
								class={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${statusClass(student.status)}`}
							>
								{statusLabel(student.status)}
							</span>
						</div>

						<p class="mt-3 text-sm text-slate-600">
							Publicações:
							<strong class="text-slate-900">{student.publishedAssessments}</strong>
						</p>

						<p class="mt-2 text-sm text-slate-600">
							{student.latestAssessmentTitle
								? `Última publicação: ${student.latestAssessmentTitle} em ${formatDate(student.latestAssessmentDate)}.`
								: 'Sem última publicação registrada.'}
						</p>

						<div class="mt-4 flex justify-end">
							<a
								href={student.detailHref}
								class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
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
