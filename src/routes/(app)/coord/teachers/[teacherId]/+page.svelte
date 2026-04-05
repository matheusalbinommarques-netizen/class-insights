<script lang="ts">
	type StudentStatus = 'healthy' | 'attention' | 'critical' | 'pending';

	export let data: {
		teacher: {
			id: string;
			name: string;
		};
		summary: {
			totalClasses: number;
			totalStudents: number;
			publishedAssessments: number;
			averagePercent: number | null;
			averageLabel: string;
			studentsAtRisk: number;
		};
		classes: Array<{
			classId: string;
			className: string;
			accessCode: string | null;
			averagePercent: number | null;
			averageLabel: string;
			publishedAssessments: number;
			studentsCount: number;
			studentsAtRisk: number;
			detailHref: string;
		}>;
		students: Array<{
			studentId: string;
			studentName: string;
			className: string;
			averagePercent: number;
			averageLabel: string;
			publishedAssessments: number;
			status: StudentStatus;
			detailHref: string;
		}>;
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
</script>

<svelte:head>
	<title>Class Insights - Professor no escopo</title>
</svelte:head>

<div class="grid gap-6">
	<section class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
		<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
			<div>
				<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">
					Professor no escopo
				</p>
				<h2 class="mt-2 text-3xl font-black tracking-tight text-slate-950">{data.teacher.name}</h2>
				<p class="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
					Leitura consolidada das turmas que esse professor possui dentro do seu escopo
					institucional.
				</p>
			</div>

			<a
				href="/coord"
				class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
			>
				Voltar ao painel
			</a>
		</div>

		<div class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
			<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
				<p class="text-xs font-black uppercase tracking-[0.28em] text-slate-500">Turmas</p>
				<p class="mt-3 text-3xl font-black tracking-tight text-slate-950">
					{data.summary.totalClasses}
				</p>
			</div>

			<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
				<p class="text-xs font-black uppercase tracking-[0.28em] text-slate-500">Alunos</p>
				<p class="mt-3 text-3xl font-black tracking-tight text-slate-950">
					{data.summary.totalStudents}
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

			<div class="rounded-2xl border border-amber-200 bg-amber-50 p-4">
				<p class="text-xs font-black uppercase tracking-[0.28em] text-amber-700">Alunos em risco</p>
				<p class="mt-3 text-3xl font-black tracking-tight text-slate-950">
					{data.summary.studentsAtRisk}
				</p>
			</div>
		</div>
	</section>

	<section class="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
		<div class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
			<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">
				Turmas do professor
			</p>
			<h3 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
				Como o escopo se distribui por turma
			</h3>

			<div class="mt-5 grid gap-4">
				{#if data.classes.length === 0}
					<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
						<p class="text-base font-bold text-slate-950">Nenhuma turma encontrada</p>
						<p class="mt-2 text-sm leading-6 text-slate-600">
							Não foi possível encontrar turmas desse professor no seu escopo atual.
						</p>
					</div>
				{:else}
					{#each data.classes as classItem (classItem.classId)}
						<article class="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
							<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
								<div>
									<h4 class="text-xl font-black tracking-tight text-slate-950">
										{classItem.className}
									</h4>

									{#if classItem.accessCode}
										<p class="mt-2 text-xs font-black uppercase tracking-[0.25em] text-slate-500">
											Código {classItem.accessCode}
										</p>
									{/if}
								</div>

								<div class="text-left lg:text-right">
									<p class="text-sm font-semibold text-slate-500">Média publicada</p>
									<p class="mt-1 text-2xl font-black tracking-tight text-slate-950">
										{classItem.averageLabel} / 10
									</p>
								</div>
							</div>

							<div class="mt-4 grid gap-3 sm:grid-cols-3">
								<div class="rounded-2xl border border-slate-200 bg-white p-4">
									<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
										Alunos
									</p>
									<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
										{classItem.studentsCount}
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

								<div class="rounded-2xl border border-slate-200 bg-white p-4">
									<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
										Publicações
									</p>
									<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
										{classItem.publishedAssessments}
									</p>
								</div>
							</div>

							<div class="mt-4 flex justify-end">
								<a
									href={classItem.detailHref}
									class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
								>
									Ver turma
								</a>
							</div>
						</article>
					{/each}
				{/if}
			</div>
		</div>

		<div class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
			<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">
				Alunos prioritários
			</p>
			<h3 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
				Quem pede acompanhamento primeiro
			</h3>

			<div class="mt-5 grid gap-4">
				{#if data.students.length === 0}
					<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
						<p class="text-base font-bold text-slate-950">Nenhum aluno encontrado</p>
						<p class="mt-2 text-sm leading-6 text-slate-600">
							Não foi possível montar a leitura por aluno desse professor.
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

								<span
									class={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${statusClass(student.status)}`}
								>
									{statusLabel(student.status)}
								</span>
							</div>

							<p class="mt-4 text-sm text-slate-600">
								Média publicada:
								<strong class="text-slate-900">{student.averageLabel} / 10</strong>
							</p>

							<p class="mt-2 text-sm text-slate-600">
								Publicações:
								<strong class="text-slate-900">{student.publishedAssessments}</strong>
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
		</div>
	</section>
</div>
