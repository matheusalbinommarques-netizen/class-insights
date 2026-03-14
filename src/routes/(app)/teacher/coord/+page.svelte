<script lang="ts">
	type Trend = 'improving' | 'declining' | 'stable' | 'insufficient_data';

	export let data: {
		summary: {
			displayName: string;
			totalClasses: number;
			totalStudents: number;
			totalPublishedAssessments: number;
			institutionAverage: number | null;
			classesAtRisk: number;
		} | null;
		classes: Array<{
			classId: string;
			className: string;
			teacherName: string;
			studentsCount: number;
			publishedAssessments: number;
			averagePercent: number | null;
			riskStudents: number;
			tone: 'healthy' | 'attention' | 'critical';
		}>;
		subjects: Array<{
			subjectId: string;
			subjectName: string;
			averagePercent: number | null;
			assessmentsCount: number;
			recentTrend: Trend;
		}>;
		teachers: Array<{
			teacherId: string;
			teacherName: string;
			classesCount: number;
			averagePercent: number | null;
			publishedAssessments: number;
		}>;
		students: Array<{
			studentId: string;
			studentName: string;
			className: string;
			averagePercent: number;
			publishedAssessments: number;
		}>;
		error: string | null;
	};

	const formatScore = (value: number | null) =>
		typeof value === 'number' ? (value / 10).toFixed(1) : '--';

	const toneClass = (tone: 'healthy' | 'attention' | 'critical') => {
		if (tone === 'critical') return 'border-red-200 bg-red-50 text-red-700';
		if (tone === 'attention') return 'border-amber-200 bg-amber-50 text-amber-700';
		return 'border-emerald-200 bg-emerald-50 text-emerald-700';
	};

	const toneLabel = (tone: 'healthy' | 'attention' | 'critical') => {
		if (tone === 'critical') return 'Critica';
		if (tone === 'attention') return 'Atencao';
		return 'Saudavel';
	};

	const trendLabel = (trend: Trend) => {
		if (trend === 'improving') return 'Em melhora';
		if (trend === 'declining') return 'Em queda';
		if (trend === 'stable') return 'Estavel';
		return 'Base insuficiente';
	};
</script>

<svelte:head>
	<title>Class Insights - Coordenacao</title>
</svelte:head>

{#if data.error || !data.summary}
	<section class="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
		<p class="text-xs font-black uppercase tracking-widest">Coordenacao</p>
		<h1 class="mt-3 text-3xl font-black tracking-tight">Painel institucional indisponivel</h1>
		<p class="mt-3 text-sm leading-7">{data.error ?? 'Nao foi possivel carregar a visao macro.'}</p>
	</section>
{:else}
	<div class="space-y-6">
		<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
			<div class="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
				<div class="max-w-3xl">
					<p class="text-xs font-black uppercase tracking-widest text-slate-500">
						Coordenacao institucional
					</p>
					<h1 class="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
						Painel macro de {data.summary.displayName}
					</h1>
					<p class="mt-3 text-base leading-8 text-slate-600">
						Esta primeira camada da coordenacao le apenas o que ja foi publicado para destacar
						turmas em atencao, materias mais sensiveis, professores com media fora da curva e alunos
						pedindo acompanhamento.
					</p>
				</div>

				<div class="grid gap-3 sm:grid-cols-2 xl:w-full xl:max-w-xl">
					<div class="rounded-2xl border border-slate-200 bg-white p-4">
						<p class="text-xs font-black uppercase tracking-widest text-slate-500">Turmas</p>
						<p class="mt-2 text-3xl font-black text-slate-950">{data.summary.totalClasses}</p>
					</div>
					<div class="rounded-2xl border border-slate-200 bg-white p-4">
						<p class="text-xs font-black uppercase tracking-widest text-slate-500">Alunos</p>
						<p class="mt-2 text-3xl font-black text-slate-950">{data.summary.totalStudents}</p>
					</div>
					<div class="rounded-2xl border border-sky-200 bg-sky-50 p-4">
						<p class="text-xs font-black uppercase tracking-widest text-sky-700">
							Avaliacoes publicadas
						</p>
						<p class="mt-2 text-3xl font-black text-slate-950">
							{data.summary.totalPublishedAssessments}
						</p>
					</div>
					<div class="rounded-2xl border border-amber-200 bg-amber-50 p-4">
						<p class="text-xs font-black uppercase tracking-widest text-amber-700">
							Turmas em atencao
						</p>
						<p class="mt-2 text-3xl font-black text-slate-950">{data.summary.classesAtRisk}</p>
						<p class="mt-2 text-sm leading-6 text-slate-600">
							Media institucional atual: {formatScore(data.summary.institutionAverage)}
						</p>
					</div>
				</div>
			</div>
		</section>

		<div class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
			<section class="space-y-6">
				<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
						<div>
							<p class="text-xs font-black uppercase tracking-widest text-slate-500">
								Turmas em atencao
							</p>
							<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
								Onde a instituicao mais sente agora
							</h2>
						</div>
						<p class="max-w-xl text-sm leading-7 text-slate-600">
							As turmas abaixo combinam media publicada, quantidade de alunos em risco e cobertura
							real de avaliacoes ja fechadas.
						</p>
					</div>

					<div class="mt-5 space-y-3">
						{#each data.classes as item (item.classId)}
							<article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
									<div class="min-w-0">
										<p class="text-base font-black text-slate-950">{item.className}</p>
										<p class="mt-1 text-sm leading-6 text-slate-600">{item.teacherName}</p>
									</div>
									<span
										class={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-widest ${toneClass(item.tone)}`}
									>
										{toneLabel(item.tone)}
									</span>
								</div>

								<div class="mt-4 grid gap-3 sm:grid-cols-4">
									<div class="rounded-2xl border border-slate-200 bg-white p-3">
										<p class="text-[11px] font-black uppercase tracking-widest text-slate-500">
											Media
										</p>
										<p class="mt-2 text-lg font-black text-slate-950">
											{formatScore(item.averagePercent)}
										</p>
									</div>
									<div class="rounded-2xl border border-slate-200 bg-white p-3">
										<p class="text-[11px] font-black uppercase tracking-widest text-slate-500">
											Alunos
										</p>
										<p class="mt-2 text-lg font-black text-slate-950">{item.studentsCount}</p>
									</div>
									<div class="rounded-2xl border border-slate-200 bg-white p-3">
										<p class="text-[11px] font-black uppercase tracking-widest text-slate-500">
											Em risco
										</p>
										<p class="mt-2 text-lg font-black text-slate-950">{item.riskStudents}</p>
									</div>
									<div class="rounded-2xl border border-slate-200 bg-white p-3">
										<p class="text-[11px] font-black uppercase tracking-widest text-slate-500">
											Publicadas
										</p>
										<p class="mt-2 text-lg font-black text-slate-950">
											{item.publishedAssessments}
										</p>
									</div>
								</div>
							</article>
						{/each}
					</div>
				</section>

				<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
						<div>
							<p class="text-xs font-black uppercase tracking-widest text-slate-500">
								Materias mais sensiveis
							</p>
							<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
								Leitura macro por materia
							</h2>
						</div>
						<p class="max-w-xl text-sm leading-7 text-slate-600">
							Este recorte ajuda a coordenação a separar problema localizado de padrao por materia.
						</p>
					</div>

					<div class="mt-5 grid gap-3 md:grid-cols-2">
						{#each data.subjects as subject (subject.subjectId)}
							<article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<p class="text-base font-black text-slate-950">{subject.subjectName}</p>
								<div class="mt-4 grid gap-3 sm:grid-cols-3">
									<div class="rounded-2xl border border-slate-200 bg-white p-3">
										<p class="text-[11px] font-black uppercase tracking-widest text-slate-500">
											Media
										</p>
										<p class="mt-2 text-lg font-black text-slate-950">
											{formatScore(subject.averagePercent)}
										</p>
									</div>
									<div class="rounded-2xl border border-slate-200 bg-white p-3">
										<p class="text-[11px] font-black uppercase tracking-widest text-slate-500">
											Avaliacoes
										</p>
										<p class="mt-2 text-lg font-black text-slate-950">
											{subject.assessmentsCount}
										</p>
									</div>
									<div class="rounded-2xl border border-slate-200 bg-white p-3">
										<p class="text-[11px] font-black uppercase tracking-widest text-slate-500">
											Tendencia
										</p>
										<p class="mt-2 text-sm font-black text-slate-950">
											{trendLabel(subject.recentTrend)}
										</p>
									</div>
								</div>
							</article>
						{/each}
					</div>
				</section>
			</section>

			<aside class="space-y-6">
				<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<p class="text-xs font-black uppercase tracking-widest text-slate-500">
						Professores fora da curva
					</p>
					<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
						Primeira leitura comparativa
					</h2>
					<p class="mt-3 text-sm leading-7 text-slate-600">
						Este ranking ainda e uma leitura inicial por media publicada. O proximo passo e dar
						contexto por materia e turma antes de usar isso como sinal de decisao.
					</p>

					<div class="mt-4 space-y-3">
						{#each data.teachers as teacher (teacher.teacherId)}
							<article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<p class="text-base font-black text-slate-950">{teacher.teacherName}</p>
								<div class="mt-4 grid grid-cols-3 gap-3">
									<div class="rounded-2xl border border-slate-200 bg-white p-3">
										<p class="text-[11px] font-black uppercase tracking-widest text-slate-500">
											Media
										</p>
										<p class="mt-2 text-lg font-black text-slate-950">
											{formatScore(teacher.averagePercent)}
										</p>
									</div>
									<div class="rounded-2xl border border-slate-200 bg-white p-3">
										<p class="text-[11px] font-black uppercase tracking-widest text-slate-500">
											Turmas
										</p>
										<p class="mt-2 text-lg font-black text-slate-950">{teacher.classesCount}</p>
									</div>
									<div class="rounded-2xl border border-slate-200 bg-white p-3">
										<p class="text-[11px] font-black uppercase tracking-widest text-slate-500">
											Publicadas
										</p>
										<p class="mt-2 text-lg font-black text-slate-950">
											{teacher.publishedAssessments}
										</p>
									</div>
								</div>
							</article>
						{/each}
					</div>
				</section>

				<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<p class="text-xs font-black uppercase tracking-widest text-slate-500">Alunos criticos</p>
					<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
						Quem mais pede acompanhamento
					</h2>

					<div class="mt-4 space-y-3">
						{#if data.students.length === 0}
							<p class="text-sm leading-7 text-slate-600">
								Ainda nao ha alunos abaixo de 60% na leitura publicada institucional.
							</p>
						{:else}
							{#each data.students as student (student.studentId)}
								<article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
									<p class="text-base font-black text-slate-950">{student.studentName}</p>
									<p class="mt-1 text-sm leading-6 text-slate-600">{student.className}</p>
									<div class="mt-4 grid grid-cols-2 gap-3">
										<div class="rounded-2xl border border-slate-200 bg-white p-3">
											<p class="text-[11px] font-black uppercase tracking-widest text-slate-500">
												Media
											</p>
											<p class="mt-2 text-lg font-black text-slate-950">
												{formatScore(student.averagePercent)}
											</p>
										</div>
										<div class="rounded-2xl border border-slate-200 bg-white p-3">
											<p class="text-[11px] font-black uppercase tracking-widest text-slate-500">
												Publicadas
											</p>
											<p class="mt-2 text-lg font-black text-slate-950">
												{student.publishedAssessments}
											</p>
										</div>
									</div>
								</article>
							{/each}
						{/if}
					</div>
				</section>
			</aside>
		</div>
	</div>
{/if}
