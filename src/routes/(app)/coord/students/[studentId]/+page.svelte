<script lang="ts">
	type SubjectStatus = 'healthy' | 'attention' | 'critical' | 'pending';

	export let data: {
		student: {
			id: string;
			name: string;
			classId: string;
			className: string;
			teacherName: string;
			exportHref: string;
		};
		summary: {
			studentAverage: number | null;
			studentAverageLabel: string;
			classAverage: number | null;
			classAverageLabel: string;
			publishedAssessments: number;
			subjectsCount: number;
			gap: number | null;
			gapLabel: string;
		};
		subjects: Array<{
			subjectId: string;
			subjectName: string;
			studentAverage: number | null;
			studentAverageLabel: string;
			classAverage: number | null;
			classAverageLabel: string;
			gap: number | null;
			gapLabel: string;
			assessmentsCount: number;
			status: SubjectStatus;
			latestAssessmentTitle: string | null;
			latestAssessmentDate: string | null;
		}>;
		latestPublications: Array<{
			assessmentId: string;
			title: string;
			assessmentDate: string;
			studentScore: number | null;
			studentScoreLabel: string;
			classScore: number | null;
			classScoreLabel: string;
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

	const statusLabel = (status: SubjectStatus) => {
		if (status === 'critical') return 'Critica';
		if (status === 'attention') return 'Atencao';
		if (status === 'healthy') return 'Dentro do esperado';
		return 'Sem base';
	};

	const statusClass = (status: SubjectStatus) => {
		if (status === 'critical') return 'border-red-200 bg-red-50 text-red-700';
		if (status === 'attention') return 'border-amber-200 bg-amber-50 text-amber-700';
		if (status === 'healthy') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
		return 'border-slate-200 bg-slate-50 text-slate-600';
	};
</script>

<svelte:head>
	<title>Class Insights - Aluno no escopo</title>
</svelte:head>

<div class="grid gap-6">
	<section class="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.95fr)]">
		<div class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
			<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">
				Acompanhamento institucional
			</p>

			<h2 class="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
				{data.student.name}
			</h2>

			<p class="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
				Leia este aluno no contexto da turma e compare o desempenho dele com a média publicada da
				sala.
			</p>

			<div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				<div class="rounded-2xl border border-slate-200 bg-white p-4">
					<p class="text-xs font-black uppercase tracking-[0.28em] text-slate-500">Turma</p>
					<p class="mt-3 text-lg font-black tracking-tight text-slate-950">
						{data.student.className}
					</p>
					<p class="mt-2 text-sm text-slate-600">{data.student.teacherName}</p>
				</div>

				<div class="rounded-2xl border border-slate-200 bg-white p-4">
					<p class="text-xs font-black uppercase tracking-[0.28em] text-slate-500">
						Média do aluno
					</p>
					<p class="mt-3 text-3xl font-black tracking-tight text-slate-950">
						{data.summary.studentAverageLabel} / 10
					</p>
				</div>

				<div class="rounded-2xl border border-slate-200 bg-white p-4">
					<p class="text-xs font-black uppercase tracking-[0.28em] text-slate-500">
						Média da turma
					</p>
					<p class="mt-3 text-3xl font-black tracking-tight text-slate-950">
						{data.summary.classAverageLabel} / 10
					</p>
				</div>

				<div class="rounded-2xl border border-slate-200 bg-white p-4">
					<p class="text-xs font-black uppercase tracking-[0.28em] text-slate-500">Gap</p>
					<p class="mt-3 text-3xl font-black tracking-tight text-slate-950">
						{data.summary.gapLabel}
					</p>
					<p class="mt-2 text-sm text-slate-600">Comparado com a média publicada da turma.</p>
				</div>
			</div>
		</div>

		<div class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
			<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">Leitura rápida</p>
			<h3 class="mt-3 text-xl font-black tracking-tight text-slate-950">Base institucional</h3>

			<div class="mt-5 grid gap-3">
				<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
					<p class="text-xs font-black uppercase tracking-[0.28em] text-slate-500">Publicações</p>
					<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
						{data.summary.publishedAssessments}
					</p>
				</div>

				<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
					<p class="text-xs font-black uppercase tracking-[0.28em] text-slate-500">
						Matérias lidas
					</p>
					<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
						{data.summary.subjectsCount}
					</p>
				</div>

				<a
					href={data.student.exportHref}
					class="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
				>
					Exportar histórico
				</a>
			</div>
		</div>
	</section>

	<section class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
		<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
			<div>
				<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">Matérias</p>
				<h3 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
					Onde esse aluno está melhor ou pior
				</h3>
			</div>

			<div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
				Compare a média do aluno com a média publicada da turma em cada matéria.
			</div>
		</div>

		<div class="mt-5 grid gap-4 xl:grid-cols-2">
			{#if data.subjects.length === 0}
				<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5 xl:col-span-2">
					<p class="text-base font-bold text-slate-950">Sem matérias com base suficiente</p>
					<p class="mt-2 text-sm leading-6 text-slate-600">
						Ainda não há publicações suficientes para comparar este aluno por matéria.
					</p>
				</div>
			{:else}
				{#each data.subjects as subject (subject.subjectId)}
					<article class="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
						<div class="flex items-start justify-between gap-3">
							<div>
								<div class="flex flex-wrap items-center gap-2">
									<h4 class="text-lg font-black tracking-tight text-slate-950">
										{subject.subjectName}
									</h4>

									<span
										class={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${statusClass(subject.status)}`}
									>
										{statusLabel(subject.status)}
									</span>
								</div>

								{#if subject.latestAssessmentTitle}
									<p class="mt-2 text-sm text-slate-600">
										Última publicação:
										<strong class="text-slate-900">{subject.latestAssessmentTitle}</strong>
									</p>
								{/if}
							</div>
						</div>

						<div class="mt-4 grid gap-3 sm:grid-cols-3">
							<div class="rounded-2xl border border-slate-200 bg-white p-4">
								<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Aluno</p>
								<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
									{subject.studentAverageLabel} / 10
								</p>
							</div>

							<div class="rounded-2xl border border-slate-200 bg-white p-4">
								<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Turma</p>
								<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
									{subject.classAverageLabel} / 10
								</p>
							</div>

							<div class="rounded-2xl border border-slate-200 bg-white p-4">
								<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Gap</p>
								<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
									{subject.gapLabel}
								</p>
							</div>
						</div>

						<div
							class="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600"
						>
							<span>{subject.assessmentsCount} publicação(ões)</span>
							<span>{formatDate(subject.latestAssessmentDate)}</span>
						</div>
					</article>
				{/each}
			{/if}
		</div>
	</section>

	<section class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
		<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
			<div>
				<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">
					Publicações recentes
				</p>
				<h3 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
					Como este aluno aparece nas últimas leituras
				</h3>
			</div>

			<div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
				Compare a nota do aluno com a média da turma em cada publicação.
			</div>
		</div>

		<div class="mt-5 grid gap-4 xl:grid-cols-2">
			{#if data.latestPublications.length === 0}
				<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5 xl:col-span-2">
					<p class="text-base font-bold text-slate-950">Sem publicações recentes</p>
					<p class="mt-2 text-sm leading-6 text-slate-600">
						Ainda não há base suficiente para mostrar a linha mais recente deste aluno.
					</p>
				</div>
			{:else}
				{#each data.latestPublications as item (item.assessmentId)}
					<article class="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
						<p class="text-xs font-black uppercase tracking-[0.28em] text-slate-500">
							{formatDate(item.assessmentDate)}
						</p>

						<h4 class="mt-2 text-lg font-black tracking-tight text-slate-950">
							{item.title}
						</h4>

						<div class="mt-4 grid gap-3 sm:grid-cols-2">
							<div class="rounded-2xl border border-slate-200 bg-white p-4">
								<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Aluno</p>
								<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
									{item.studentScoreLabel} / 10
								</p>
							</div>

							<div class="rounded-2xl border border-slate-200 bg-white p-4">
								<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Turma</p>
								<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
									{item.classScoreLabel} / 10
								</p>
							</div>
						</div>
					</article>
				{/each}
			{/if}
		</div>
	</section>
</div>
