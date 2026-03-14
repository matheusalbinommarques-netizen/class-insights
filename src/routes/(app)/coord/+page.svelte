<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ActionData } from './$types';

	type Trend = 'improving' | 'declining' | 'stable' | 'insufficient_data';

	export let form: ActionData;
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
	<title>Coordenacao - Class Insights</title>
</svelte:head>

<div class="space-y-6">
	<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
		<div class="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
			<div class="max-w-3xl">
				<p class="text-xs font-black uppercase tracking-widest text-slate-500">
					Coordenacao institucional
				</p>
				<h1 class="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
					Painel macro de {data.summary?.displayName ?? 'coordenacao'}
				</h1>
				<p class="mt-3 text-base leading-8 text-slate-600">
					Agora a coordenacao entra por codigo de turma e le apenas o que foi publicado dentro do
					escopo realmente administrado.
				</p>
				<p class="mt-4 text-sm leading-7 text-slate-600">
					{data.summary?.message ?? 'Nao foi possivel montar a leitura institucional.'}
				</p>
			</div>

			<div class="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
				<p class="text-xs font-black uppercase tracking-widest text-slate-500">
					Vincular turma por codigo
				</p>
				<form method="POST" action="?/claimAccessCode" class="mt-4 space-y-3">
					<label class="block text-sm font-bold text-slate-700" for="accessCode">
						Codigo da turma
					</label>
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
						Adicionar ao meu escopo
					</button>
				</form>

				{#if form?.message}
					<p
						class={`mt-4 rounded-2xl border px-4 py-3 text-sm leading-7 ${
							form.success
								? 'border-emerald-200 bg-emerald-50 text-emerald-700'
								: 'border-red-200 bg-red-50 text-red-700'
						}`}
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
			<p class="text-xs font-black uppercase tracking-widest text-slate-500">Turmas sob escopo</p>
			<p class="mt-2 text-3xl font-black text-slate-950">{data.summary?.totalClasses ?? 0}</p>
		</div>
		<div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
			<p class="text-xs font-black uppercase tracking-widest text-slate-500">Alunos</p>
			<p class="mt-2 text-3xl font-black text-slate-950">{data.summary?.totalStudents ?? 0}</p>
		</div>
		<div class="rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
			<p class="text-xs font-black uppercase tracking-widest text-sky-700">Avaliacoes publicadas</p>
			<p class="mt-2 text-3xl font-black text-slate-950">
				{data.summary?.totalPublishedAssessments ?? 0}
			</p>
		</div>
		<div class="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
			<p class="text-xs font-black uppercase tracking-widest text-amber-700">Turmas em atencao</p>
			<p class="mt-2 text-3xl font-black text-slate-950">{data.summary?.classesAtRisk ?? 0}</p>
			<p class="mt-2 text-sm leading-6 text-slate-600">
				Media institucional atual: {formatScore(data.summary?.institutionAverage ?? null)}
			</p>
		</div>
	</section>

	{#if data.classes.length === 0}
		<section
			class="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm"
		>
			<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">Sem turmas ainda</p>
			<h2 class="mt-3 text-3xl font-black tracking-tight text-slate-950">
				Seu painel institucional comeca pelo codigo da turma
			</h2>
			<p class="mx-auto mt-4 max-w-2xl text-sm leading-8 text-slate-600 sm:text-base">
				Assim que voce vincular a primeira turma, esta tela passa a mostrar medias publicadas,
				materias mais sensiveis e alunos pedindo acompanhamento dentro do seu escopo real.
			</p>
		</section>
	{:else}
		<div class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
			<section class="space-y-6">
				<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
						<div>
							<p class="text-xs font-black uppercase tracking-widest text-slate-500">
								Turmas sob coordenacao
							</p>
							<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
								Onde a leitura institucional mais pede atencao
							</h2>
						</div>
						<p class="max-w-xl text-sm leading-7 text-slate-600">
							Cada card combina media publicada, alunos em risco e o codigo que define o escopo
							oficial desta coordenacao.
						</p>
					</div>

					<div class="mt-5 space-y-3">
						{#each data.classes as item (item.classId)}
							<article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
									<div class="min-w-0">
										<p class="text-base font-black text-slate-950">{item.className}</p>
										<p class="mt-1 text-sm leading-6 text-slate-600">{item.teacherName}</p>
										{#if item.accessCode}
											<p
												class="mt-2 text-[11px] font-black uppercase tracking-[0.35em] text-slate-500"
											>
												Codigo {item.accessCode}
											</p>
										{/if}
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
							Este recorte ajuda a separar um problema localizado de um padrao que atravessa o
							escopo institucional.
						</p>
					</div>

					<div class="mt-5 grid gap-3 md:grid-cols-2">
						{#if data.subjects.length === 0}
							<p class="text-sm leading-7 text-slate-600">
								Ainda nao ha base publicada suficiente para leitura por materia.
							</p>
						{:else}
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
						{/if}
					</div>
				</section>
			</section>

			<aside class="space-y-6">
				<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<p class="text-xs font-black uppercase tracking-widest text-slate-500">
						Professores no escopo
					</p>
					<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
						Leitura comparativa inicial
					</h2>
					<p class="mt-3 text-sm leading-7 text-slate-600">
						Esse bloco continua sendo um sinal inicial. A leitura mais forte ainda precisa ganhar
						contexto por materia e por turma.
					</p>

					<div class="mt-4 space-y-3">
						{#if data.teachers.length === 0}
							<p class="text-sm leading-7 text-slate-600">
								As turmas vinculadas ainda nao formaram base comparativa suficiente.
							</p>
						{:else}
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
						{/if}
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
								<a
									href={resolve(`/coord/students/${student.studentId}`)}
									class="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-amber-300 hover:bg-amber-50/60"
								>
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
									<p class="mt-3 text-xs font-black uppercase tracking-widest text-amber-700">
										Abrir perfil longitudinal
									</p>
								</a>
							{/each}
						{/if}
					</div>
				</section>
			</aside>
		</div>
	{/if}
</div>
