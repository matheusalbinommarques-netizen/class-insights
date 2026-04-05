<script lang="ts">
	type Trend = 'improving' | 'declining' | 'stable' | 'insufficient_data';
	type ClassStatus = 'healthy' | 'attention' | 'critical' | 'pending';

	export let data: {
		subject: {
			id: string;
			name: string;
		};
		summary: {
			classesCount: number;
			studentsCount: number;
			publishedAssessments: number;
			averagePercent: number | null;
			averageLabel: string;
			recentTrend: Trend;
		};
		classes: Array<{
			classId: string;
			className: string;
			teacherName: string;
			averagePercent: number | null;
			averageLabel: string;
			assessmentsCount: number;
			studentsAtRisk: number;
			status: ClassStatus;
			detailHref: string;
		}>;
		students: Array<{
			studentId: string;
			studentName: string;
			className: string;
			averagePercent: number;
			averageLabel: string;
			publishedAssessments: number;
			detailHref: string;
		}>;
		timeline: Array<{
			assessmentId: string;
			assessmentTitle: string;
			assessmentDate: string;
			className: string;
			averageLabel: string;
		}>;
	};

	const formatDate = (value: string) =>
		new Intl.DateTimeFormat('pt-BR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		}).format(new Date(`${value}T00:00:00`));

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

	const statusClass = (status: ClassStatus) => {
		if (status === 'critical') return 'border-red-200 bg-red-50 text-red-700';
		if (status === 'attention') return 'border-amber-200 bg-amber-50 text-amber-700';
		if (status === 'healthy') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
		return 'border-slate-200 bg-slate-50 text-slate-600';
	};

	const statusLabel = (status: ClassStatus) => {
		if (status === 'critical') return 'Crítica';
		if (status === 'attention') return 'Atenção';
		if (status === 'healthy') return 'Saudável';
		return 'Sem base';
	};
</script>

<svelte:head>
	<title>Class Insights - Matéria no escopo</title>
</svelte:head>

<div class="grid gap-6">
	<section class="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.95fr)]">
		<div class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
			<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">
				Escopo por matéria
			</p>

			<h2 class="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
				{data.subject.name}
			</h2>

			<p class="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
				Leia a matéria no nível institucional: veja em quais turmas ela piora, quais alunos aparecem
				primeiro e como as publicações mais recentes se comportam.
			</p>

			<div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				<div class="rounded-2xl border border-slate-200 bg-white p-4">
					<p class="text-xs font-black uppercase tracking-[0.28em] text-slate-500">Turmas</p>
					<p class="mt-3 text-3xl font-black tracking-tight text-slate-950">
						{data.summary.classesCount}
					</p>
				</div>

				<div class="rounded-2xl border border-slate-200 bg-white p-4">
					<p class="text-xs font-black uppercase tracking-[0.28em] text-slate-500">Alunos</p>
					<p class="mt-3 text-3xl font-black tracking-tight text-slate-950">
						{data.summary.studentsCount}
					</p>
				</div>

				<div class="rounded-2xl border border-slate-200 bg-white p-4">
					<p class="text-xs font-black uppercase tracking-[0.28em] text-slate-500">Publicações</p>
					<p class="mt-3 text-3xl font-black tracking-tight text-slate-950">
						{data.summary.publishedAssessments}
					</p>
				</div>

				<div class="rounded-2xl border border-slate-200 bg-white p-4">
					<p class="text-xs font-black uppercase tracking-[0.28em] text-slate-500">
						Média publicada
					</p>
					<p class="mt-3 text-3xl font-black tracking-tight text-slate-950">
						{data.summary.averageLabel} / 10
					</p>
				</div>
			</div>
		</div>

		<div class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
			<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">Leitura rápida</p>
			<h3 class="mt-3 text-xl font-black tracking-tight text-slate-950">Tendência da matéria</h3>

			<div class="mt-5">
				<span
					class={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${trendClass(data.summary.recentTrend)}`}
				>
					{trendLabel(data.summary.recentTrend)}
				</span>
			</div>

			<p class="mt-4 text-sm leading-7 text-slate-600">
				Esta leitura considera apenas resultados publicados dentro das turmas que fazem parte do seu
				escopo de coordenação.
			</p>
		</div>
	</section>

	<section class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
		<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
			<div>
				<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">
					Turmas no escopo
				</p>
				<h3 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
					Como a matéria se distribui entre as turmas
				</h3>
			</div>

			<div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
				Compare média, risco e quantidade de publicações por turma.
			</div>
		</div>

		<div class="mt-5 grid gap-4 xl:grid-cols-2">
			{#if data.classes.length === 0}
				<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5 xl:col-span-2">
					<p class="text-base font-bold text-slate-950">Nenhuma turma encontrada</p>
					<p class="mt-2 text-sm leading-6 text-slate-600">
						Não há turmas com essa matéria no escopo atual.
					</p>
				</div>
			{:else}
				{#each data.classes as classItem (classItem.classId)}
					<article class="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
						<div class="flex items-start justify-between gap-3">
							<div>
								<div class="flex flex-wrap items-center gap-2">
									<h4 class="text-lg font-black tracking-tight text-slate-950">
										{classItem.className}
									</h4>

									<span
										class={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${statusClass(classItem.status)}`}
									>
										{statusLabel(classItem.status)}
									</span>
								</div>

								<p class="mt-2 text-sm text-slate-600">
									Professor responsável:
									<strong class="text-slate-900">{classItem.teacherName}</strong>
								</p>
							</div>

							<a
								href={classItem.detailHref}
								class="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
							>
								Ver turma
							</a>
						</div>

						<div class="mt-4 grid gap-3 sm:grid-cols-3">
							<div class="rounded-2xl border border-slate-200 bg-white p-4">
								<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Média</p>
								<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
									{classItem.averageLabel} / 10
								</p>
							</div>

							<div class="rounded-2xl border border-slate-200 bg-white p-4">
								<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
									Publicações
								</p>
								<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
									{classItem.assessmentsCount}
								</p>
							</div>

							<div class="rounded-2xl border border-slate-200 bg-white p-4">
								<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
									Em risco
								</p>
								<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
									{classItem.studentsAtRisk}
								</p>
							</div>
						</div>
					</article>
				{/each}
			{/if}
		</div>
	</section>

	<section class="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.95fr)]">
		<div class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
			<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">
						Linha do tempo
					</p>
					<h3 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
						Publicações desta matéria
					</h3>
				</div>

				<div
					class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
				>
					Acompanhe quando e em qual turma cada publicação entrou no escopo.
				</div>
			</div>

			<div class="mt-5 grid gap-4">
				{#if data.timeline.length === 0}
					<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
						<p class="text-base font-bold text-slate-950">Sem publicações</p>
						<p class="mt-2 text-sm leading-6 text-slate-600">
							Esta matéria ainda não possui publicações suficientes no escopo atual.
						</p>
					</div>
				{:else}
					{#each data.timeline as item (item.assessmentId)}
						<article class="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
							<p class="text-xs font-black uppercase tracking-[0.28em] text-slate-500">
								{formatDate(item.assessmentDate)}
							</p>
							<h4 class="mt-2 text-lg font-black tracking-tight text-slate-950">
								{item.assessmentTitle}
							</h4>
							<p class="mt-2 text-sm text-slate-600">{item.className}</p>
							<p class="mt-2 text-sm text-slate-600">
								Média dessa publicação:
								<strong class="text-slate-900">{item.averageLabel} / 10</strong>
							</p>
						</article>
					{/each}
				{/if}
			</div>
		</div>

		<div class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
			<div class="flex flex-col gap-2">
				<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">Alunos em foco</p>
				<h3 class="text-2xl font-black tracking-tight text-slate-950">
					Quem merece olhar primeiro nessa matéria
				</h3>
			</div>

			<div class="mt-5 grid gap-4">
				{#if data.students.length === 0}
					<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
						<p class="text-base font-bold text-slate-950">Nenhum aluno com base suficiente</p>
						<p class="mt-2 text-sm leading-6 text-slate-600">
							Ainda não há leitura consolidada por aluno para esta matéria.
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
									<p class="mt-2 text-sm text-slate-600">{student.className}</p>
								</div>

								<a
									href={student.detailHref}
									class="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
								>
									Ver aluno
								</a>
							</div>

							<p class="mt-4 text-sm text-slate-600">
								Média publicada:
								<strong class="text-red-600">{student.averageLabel} / 10</strong>
							</p>
							<p class="mt-2 text-sm text-slate-600">
								Base em {student.publishedAssessments} publicação(ões)
							</p>
						</article>
					{/each}
				{/if}
			</div>
		</div>
	</section>
</div>
