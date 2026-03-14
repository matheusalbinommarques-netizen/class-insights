<script lang="ts">
	type Trend = 'improving' | 'declining' | 'stable' | 'insufficient_data';

	export let form:
		| {
				action?: 'claimAccessCode';
				message?: string;
				success?: boolean;
		  }
		| undefined;
	export let data: {
		summary: {
			displayName: string;
			totalClasses: number;
			totalStudents: number;
			totalPublishedAssessments: number;
			institutionAverage: number | null;
			classesAtRisk: number;
			managedClassesCount: number;
			message: string;
		} | null;
		classes: Array<{
			classId: string;
			className: string;
			teacherName: string;
			accessCode: string | null;
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

	const formatGrade = (value: number | null) => {
		if (typeof value !== 'number') return '--';
		return new Intl.NumberFormat('pt-BR', {
			minimumFractionDigits: 1,
			maximumFractionDigits: 1
		}).format(value / 10);
	};

	const toneLabel = (tone: 'healthy' | 'attention' | 'critical') => {
		if (tone === 'critical') return 'Critica';
		if (tone === 'attention') return 'Atencao';
		return 'Dentro do esperado';
	};

	const toneClass = (tone: 'healthy' | 'attention' | 'critical') => {
		if (tone === 'critical') return 'border-red-200 bg-red-50 text-red-700';
		if (tone === 'attention') return 'border-amber-200 bg-amber-50 text-amber-700';
		return 'border-emerald-200 bg-emerald-50 text-emerald-700';
	};

	const trendLabel = (trend: Trend) => {
		if (trend === 'improving') return 'Em melhora';
		if (trend === 'declining') return 'Em queda';
		if (trend === 'stable') return 'Estavel';
		return 'Base insuficiente';
	};

	const trendClass = (trend: Trend) => {
		if (trend === 'declining') return 'border-red-200 bg-red-50 text-red-700';
		if (trend === 'improving') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
		if (trend === 'stable') return 'border-slate-200 bg-slate-50 text-slate-700';
		return 'border-slate-200 bg-slate-50 text-slate-500';
	};

	$: criticalClasses = data.classes.filter((item) => item.tone === 'critical');
	$: attentionClasses = data.classes.filter((item) => item.tone === 'attention');
	$: decliningSubjects = data.subjects.filter((item) => item.recentTrend === 'declining');
	$: operationalPendingClasses = data.classes.filter((item) => item.publishedAssessments === 0);
	$: lowestTeachers = [...data.teachers].slice(0, 4);
	$: priorityStudents = [...data.students].slice(0, 5);
</script>

<svelte:head>
	<title>Class Insights - Coordenacao</title>
</svelte:head>

<div class="space-y-6">
	<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
		<div class="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
			<div>
				<p class="text-xs font-black uppercase tracking-widest text-slate-500">
					Leitura institucional
				</p>
				<h1 class="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
					O que pede leitura no seu escopo agora.
				</h1>
				<p class="mt-3 max-w-3xl text-base leading-8 text-slate-600">
					Este painel responde quatro perguntas: quais turmas estao piores, quais materias mais
					exigem atencao, onde a tendencia esta caindo e onde ainda ha pendencia operacional no
					escopo que voce acompanha.
				</p>
				<p class="mt-4 text-sm leading-7 text-slate-600">
					{data.summary?.message ?? 'Nao foi possivel montar a leitura institucional.'}
				</p>
			</div>

			<div class="rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
				<p class="text-xs font-black uppercase tracking-widest text-slate-500">
					Adicionar turma ao escopo
				</p>
				<form method="POST" action="?/claimAccessCode" class="mt-4 space-y-3">
					<label class="block text-sm font-bold text-slate-700" for="accessCode"
						>Codigo da turma</label
					>
					<input
						id="accessCode"
						name="accessCode"
						type="text"
						placeholder="Ex.: AB12CD34"
						class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-950 outline-none transition focus:border-slate-500"
					/>
					<button
						type="submit"
						class="rounded-full bg-slate-950 px-5 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-slate-800"
					>
						Adicionar ao painel
					</button>
				</form>

				{#if form?.message}
					<p
						class={`mt-4 rounded-2xl border px-4 py-3 text-sm leading-7 ${form.success ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}
					>
						{form.message}
					</p>
				{/if}

				{#if data.error}
					<p
						class="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-7 text-red-700"
					>
						{data.error}
					</p>
				{/if}
			</div>
		</div>
	</section>

	<section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
		<div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
			<p class="text-xs font-black uppercase tracking-widest text-slate-500">Turmas no escopo</p>
			<p class="mt-2 text-3xl font-black text-slate-950">{data.summary?.totalClasses ?? 0}</p>
			<p class="mt-2 text-sm leading-6 text-slate-600">Base institucional sob sua leitura hoje.</p>
		</div>
		<div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
			<p class="text-xs font-black uppercase tracking-widest text-slate-500">Media institucional</p>
			<p class="mt-2 text-3xl font-black text-slate-950">
				{formatGrade(data.summary?.institutionAverage ?? null)} / 10
			</p>
			<p class="mt-2 text-sm leading-6 text-slate-600">Considera apenas resultados publicados.</p>
		</div>
		<div class="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
			<p class="text-xs font-black uppercase tracking-widest text-amber-700">Turmas em atencao</p>
			<p class="mt-2 text-3xl font-black text-slate-950">{data.summary?.classesAtRisk ?? 0}</p>
			<p class="mt-2 text-sm leading-6 text-slate-600">Precisam de acompanhamento mais proximo.</p>
		</div>
		<div class="rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
			<p class="text-xs font-black uppercase tracking-widest text-sky-700">
				Pendencias operacionais
			</p>
			<p class="mt-2 text-3xl font-black text-slate-950">{operationalPendingClasses.length}</p>
			<p class="mt-2 text-sm leading-6 text-slate-600">
				Turmas sem publicacao ainda no seu escopo.
			</p>
		</div>
	</section>

	{#if data.classes.length === 0}
		<section
			class="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm"
		>
			<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">Sem escopo ainda</p>
			<h2 class="mt-3 text-3xl font-black tracking-tight text-slate-950">
				Seu painel institucional comeca pela primeira turma.
			</h2>
			<p class="mx-auto mt-4 max-w-2xl text-sm leading-8 text-slate-600 sm:text-base">
				Assim que voce vincular uma turma, este painel mostra comparativo entre turmas, materias
				mais criticas, tendencias de queda e pendencias operacionais reais.
			</p>
		</section>
	{:else}
		<div class="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
			<section class="space-y-6">
				<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
						<div>
							<p class="text-xs font-black uppercase tracking-widest text-slate-500">
								Turmas mais sensiveis
							</p>
							<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
								Quais turmas estao piores agora
							</h2>
						</div>
						<p class="max-w-xl text-sm leading-7 text-slate-600">
							Media publicada, risco e cobertura operacional aparecem no mesmo lugar para facilitar
							a leitura macro.
						</p>
					</div>

					<div class="mt-5 space-y-3">
						{#each data.classes as item (item.classId)}
							<article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
									<div>
										<div class="flex flex-wrap items-center gap-3">
											<p class="text-lg font-black text-slate-950">{item.className}</p>
											<span
												class={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-widest ${toneClass(item.tone)}`}
												>{toneLabel(item.tone)}</span
											>
										</div>
										<p class="mt-1 text-sm leading-6 text-slate-600">
											Professor responsavel: {item.teacherName}
										</p>
										{#if item.accessCode}
											<p
												class="mt-2 text-[11px] font-black uppercase tracking-[0.28em] text-slate-500"
											>
												Codigo {item.accessCode}
											</p>
										{/if}
									</div>
									<p class="text-sm font-semibold text-slate-600">
										Media publicada: <span class="text-slate-950"
											>{formatGrade(item.averagePercent)} / 10</span
										>
									</p>
								</div>

								<div class="mt-4 grid gap-3 sm:grid-cols-4">
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
											Publicacoes
										</p>
										<p class="mt-2 text-lg font-black text-slate-950">
											{item.publishedAssessments}
										</p>
									</div>
									<div class="rounded-2xl border border-slate-200 bg-white p-3">
										<p class="text-[11px] font-black uppercase tracking-widest text-slate-500">
											Leitura
										</p>
										<p class="mt-2 text-sm font-black text-slate-950">
											{item.publishedAssessments === 0
												? 'Sem publicacao ainda'
												: item.riskStudents > 0
													? 'Pede acompanhamento'
													: 'Leitura estavel'}
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
								Materias criticas
							</p>
							<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
								Quais materias mais exigem atencao
							</h2>
						</div>
						<p class="max-w-xl text-sm leading-7 text-slate-600">
							Quando o problema se repete em materia, a coordenacao consegue separar um caso isolado
							de um padrao institucional.
						</p>
					</div>

					{#if data.subjects.length === 0}
						<div
							class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-7 text-slate-600"
						>
							Ainda nao ha base publicada suficiente para leitura institucional por materia.
						</div>
					{:else}
						<div class="mt-5 grid gap-3 md:grid-cols-2">
							{#each data.subjects as subject (subject.subjectId)}
								<article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
									<div class="flex items-start justify-between gap-3">
										<div>
											<p class="text-base font-black text-slate-950">{subject.subjectName}</p>
											<p class="mt-1 text-sm leading-6 text-slate-600">
												Media publicada: {formatGrade(subject.averagePercent)} / 10
											</p>
										</div>
										<span
											class={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-widest ${trendClass(subject.recentTrend)}`}
											>{trendLabel(subject.recentTrend)}</span
										>
									</div>
									<div class="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
										<p class="text-[11px] font-black uppercase tracking-widest text-slate-500">
											Publicacoes no escopo
										</p>
										<p class="mt-2 text-lg font-black text-slate-950">{subject.assessmentsCount}</p>
									</div>
								</article>
							{/each}
						</div>
					{/if}
				</section>
			</section>

			<aside class="space-y-6">
				<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<p class="text-xs font-black uppercase tracking-widest text-slate-500">Leitura rapida</p>
					<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
						O que mudou no painel
					</h2>
					<div class="mt-4 space-y-3 text-sm leading-7 text-slate-600">
						<div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
							{criticalClasses.length > 0
								? `${criticalClasses.length} turma(s) estao em estado critico.`
								: 'Nenhuma turma esta em estado critico agora.'}
						</div>
						<div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
							{decliningSubjects.length > 0
								? `${decliningSubjects.length} materia(s) mostram tendencia de queda.`
								: 'Nenhuma materia em queda no recorte atual.'}
						</div>
						<div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
							{operationalPendingClasses.length > 0
								? `${operationalPendingClasses.length} turma(s) ainda nao publicaram avaliacao.`
								: 'Sem pendencia operacional relevante agora.'}
						</div>
						<div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
							{priorityStudents.length > 0
								? `${priorityStudents.length} aluno(s) aparecem como prioridade de acompanhamento.`
								: 'Nenhum aluno abaixo da referencia institucional agora.'}
						</div>
					</div>
				</section>

				<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<p class="text-xs font-black uppercase tracking-widest text-slate-500">
						Professores e turmas
					</p>
					<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
						Onde a operacao ainda pede cuidado
					</h2>
					{#if lowestTeachers.length === 0}
						<p class="mt-4 text-sm leading-7 text-slate-600">
							Ainda nao ha base suficiente para leitura por professor.
						</p>
					{:else}
						<div class="mt-4 space-y-3">
							{#each lowestTeachers as teacher (teacher.teacherId)}
								<article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
									<p class="text-base font-black text-slate-950">{teacher.teacherName}</p>
									<p class="mt-2 text-sm leading-6 text-slate-600">
										{teacher.classesCount} turma(s) no escopo
									</p>
									<p class="mt-1 text-sm leading-6 text-slate-600">
										Media publicada: {formatGrade(teacher.averagePercent)} / 10
									</p>
									<p class="mt-1 text-sm leading-6 text-slate-600">
										Publicacoes: {teacher.publishedAssessments}
									</p>
								</article>
							{/each}
						</div>
					{/if}
				</section>

				<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<p class="text-xs font-black uppercase tracking-widest text-slate-500">
						Acompanhamento de alunos
					</p>
					<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
						Quem pode precisar de apoio primeiro
					</h2>
					{#if priorityStudents.length === 0}
						<p class="mt-4 text-sm leading-7 text-slate-600">
							Nenhum aluno abaixo da referencia institucional no recorte atual.
						</p>
					{:else}
						<div class="mt-4 space-y-3">
							{#each priorityStudents as student (student.studentId)}
								<article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
									<p class="text-base font-black text-slate-950">{student.studentName}</p>
									<p class="mt-1 text-sm leading-6 text-slate-600">{student.className}</p>
									<p class="mt-3 text-sm font-semibold text-red-700">
										Media publicada: {formatGrade(student.averagePercent)} / 10
									</p>
									<p class="mt-1 text-sm leading-6 text-slate-600">
										Base em {student.publishedAssessments} publicacao(oes)
									</p>
								</article>
							{/each}
						</div>
					{/if}
				</section>
			</aside>
		</div>
	{/if}
</div>
