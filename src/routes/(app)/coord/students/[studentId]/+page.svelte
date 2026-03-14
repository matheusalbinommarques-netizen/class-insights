<script lang="ts">
	import { resolve } from '$app/paths';

	type Trend = 'improving' | 'declining' | 'stable' | 'insufficient_data';

	export let data: {
		student: {
			id: string;
			name: string;
		} | null;
		classroom: {
			id: string;
			name: string;
			score_min: number;
			score_max: number;
			score_decimals: number;
		} | null;
		longitudinal: {
			best_subject: string | null;
			worst_subject: string | null;
			recent_trend: Trend;
		} | null;
		summary: {
			publishedAssessments: number;
			subjectsCount: number;
			studentAverage: number | null;
			classAverage: number | null;
			gapPercent: number | null;
		} | null;
		subjects: Array<{
			subjectId: string;
			subjectName: string;
			assessmentsCount: number;
			studentAverage: number | null;
			classAverage: number | null;
			gapPercent: number | null;
			recentTrend: Trend;
			latestAssessmentDate: string | null;
			latestAssessmentTitle: string | null;
		}>;
		timeline: Array<{
			assessmentId: string;
			assessmentTitle: string;
			assessmentDate: string;
			subjectId: string;
			subjectName: string;
			studentPercent: number | null;
			classAveragePercent: number | null;
			gapPercent: number | null;
		}>;
		error: string | null;
	};

	const formatDate = (value: string | null) => {
		if (!value) return 'Sem data';
		const date = new Date(`${value}T00:00:00`);
		if (Number.isNaN(date.getTime())) return value;
		return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(date);
	};

	const formatScore = (value: number | null) =>
		typeof value === 'number' ? (value / 10).toFixed(1) : '--';

	const formatGap = (value: number | null) =>
		typeof value === 'number' ? `${value >= 0 ? '+' : ''}${(value / 10).toFixed(1)}` : '--';

	const trendLabel = (value: Trend | null | undefined) => {
		if (value === 'improving') return 'Em melhora';
		if (value === 'declining') return 'Em queda';
		if (value === 'stable') return 'Estavel';
		return 'Dados insuficientes';
	};

	const trendTone = (value: Trend | null | undefined) => {
		if (value === 'improving') return 'good';
		if (value === 'declining') return 'attention';
		return 'neutral';
	};
</script>

<svelte:head>
	<title>
		{data.student ? `${data.student.name} - Perfil longitudinal institucional` : 'Perfil do aluno'} -
		Class Insights
	</title>
</svelte:head>

{#if !data.student || !data.classroom}
	<section class="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
		<p class="text-xs font-black uppercase tracking-widest">Perfil do aluno</p>
		<h1 class="mt-3 text-3xl font-black tracking-tight">Aluno indisponivel</h1>
		<p class="mt-3 text-sm leading-7">{data.error ?? 'Nao foi possivel carregar este aluno.'}</p>
		<a
			href={resolve('/coord')}
			class="mt-5 inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800"
		>
			Voltar ao dashboard institucional
		</a>
	</section>
{:else}
	<div class="space-y-6">
		<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
			<div class="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
				<div class="max-w-3xl">
					<p class="text-xs font-black uppercase tracking-widest text-slate-500">
						Perfil longitudinal institucional
					</p>
					<h1 class="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
						{data.student.name}
					</h1>
					<p class="mt-3 text-base leading-8 text-slate-600">
						Turma <strong class="text-slate-950">{data.classroom.name}</strong>. Esta tela leva a
						coordenacao do alerta macro para a leitura individual, usando o mesmo contrato publicado
						que orienta teacher e student.
					</p>

					<div class="mt-5 flex flex-wrap gap-3">
						<a
							href={resolve('/coord')}
							class="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800"
						>
							Voltar ao dashboard institucional
						</a>
					</div>
				</div>

				<div class="grid gap-3 sm:grid-cols-2 xl:w-full xl:max-w-xl">
					<div class="rounded-2xl border border-slate-200 bg-white p-4">
						<p class="text-xs font-black uppercase tracking-widest text-slate-500">
							Media do aluno
						</p>
						<p class="mt-2 text-3xl font-black text-slate-950">
							{formatScore(data.summary?.studentAverage ?? null)}
						</p>
					</div>
					<div class="rounded-2xl border border-slate-200 bg-white p-4">
						<p class="text-xs font-black uppercase tracking-widest text-slate-500">
							Media da turma
						</p>
						<p class="mt-2 text-3xl font-black text-slate-950">
							{formatScore(data.summary?.classAverage ?? null)}
						</p>
					</div>
					<div class="rounded-2xl border border-sky-200 bg-sky-50 p-4">
						<p class="text-xs font-black uppercase tracking-widest text-sky-700">
							Gap aluno x turma
						</p>
						<p class="mt-2 text-3xl font-black text-slate-950">
							{formatGap(data.summary?.gapPercent ?? null)}
						</p>
					</div>
					<div
						class={`rounded-2xl border p-4 ${
							trendTone(data.longitudinal?.recent_trend) === 'good'
								? 'border-emerald-200 bg-emerald-50'
								: trendTone(data.longitudinal?.recent_trend) === 'attention'
									? 'border-amber-200 bg-amber-50'
									: 'border-slate-200 bg-white'
						}`}
					>
						<p class="text-xs font-black uppercase tracking-widest text-slate-500">Tendencia</p>
						<p class="mt-2 text-2xl font-black text-slate-950">
							{trendLabel(data.longitudinal?.recent_trend)}
						</p>
					</div>
				</div>
			</div>
		</section>

		{#if data.error}
			<div
				class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
			>
				{data.error}
			</div>
		{/if}

		<div class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
			<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
				<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
					<div>
						<p class="text-xs font-black uppercase tracking-widest text-slate-500">
							Publicacoes mais recentes
						</p>
						<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
							Linha do tempo do aluno
						</h2>
					</div>
					<p class="max-w-xl text-sm leading-7 text-slate-600">
						Cada item mostra o desempenho publicado do aluno e a media da turma na mesma avaliacao.
					</p>
				</div>

				{#if data.timeline.length === 0}
					<div
						class="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"
					>
						<h3 class="text-lg font-black text-slate-950">Sem publicacoes suficientes</h3>
						<p class="mt-2 text-sm leading-7 text-slate-600">
							Assim que a turma tiver avaliacoes publicadas, a trajetoria deste aluno aparecera
							aqui.
						</p>
					</div>
				{:else}
					<div class="mt-6 space-y-3">
						{#each data.timeline as point (point.assessmentId)}
							<article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
									<div class="min-w-0">
										<p class="text-base font-black text-slate-950">{point.assessmentTitle}</p>
										<p class="mt-1 text-sm leading-6 text-slate-600">
											{point.subjectName} - {formatDate(point.assessmentDate)}
										</p>
									</div>
									<div class="grid gap-3 sm:grid-cols-3">
										<div class="rounded-2xl border border-slate-200 bg-white p-3">
											<p class="text-[11px] font-black uppercase tracking-widest text-slate-500">
												Aluno
											</p>
											<p class="mt-2 text-lg font-black text-slate-950">
												{formatScore(point.studentPercent)}
											</p>
										</div>
										<div class="rounded-2xl border border-slate-200 bg-white p-3">
											<p class="text-[11px] font-black uppercase tracking-widest text-slate-500">
												Turma
											</p>
											<p class="mt-2 text-lg font-black text-slate-950">
												{formatScore(point.classAveragePercent)}
											</p>
										</div>
										<div class="rounded-2xl border border-slate-200 bg-white p-3">
											<p class="text-[11px] font-black uppercase tracking-widest text-slate-500">
												Gap
											</p>
											<p class="mt-2 text-lg font-black text-slate-950">
												{formatGap(point.gapPercent)}
											</p>
										</div>
									</div>
								</div>
							</article>
						{/each}
					</div>
				{/if}
			</section>

			<aside class="space-y-6">
				<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<p class="text-xs font-black uppercase tracking-widest text-slate-500">
						Leitura sintetica
					</p>
					<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
						Pontos para orientar a proxima conversa
					</h2>

					<div class="mt-4 space-y-3">
						<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
							<p class="text-xs font-black uppercase tracking-widest text-slate-500">
								Melhor materia
							</p>
							<p class="mt-2 text-base font-black text-slate-950">
								{data.longitudinal?.best_subject ?? 'Sem leitura suficiente'}
							</p>
						</div>
						<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
							<p class="text-xs font-black uppercase tracking-widest text-slate-500">
								Materia mais sensivel
							</p>
							<p class="mt-2 text-base font-black text-slate-950">
								{data.longitudinal?.worst_subject ?? 'Sem leitura suficiente'}
							</p>
						</div>
						<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
							<p class="text-xs font-black uppercase tracking-widest text-slate-500">
								Base publicada
							</p>
							<p class="mt-2 text-base font-black text-slate-950">
								{data.summary?.publishedAssessments ?? 0} avaliacao(oes) em
								{data.summary?.subjectsCount ?? 0} materia(s)
							</p>
						</div>
					</div>
				</section>

				<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<p class="text-xs font-black uppercase tracking-widest text-slate-500">
						Leitura por materia
					</p>
					<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
						Comparativo do aluno contra a turma
					</h2>

					{#if data.subjects.length === 0}
						<p class="mt-4 text-sm leading-7 text-slate-600">
							Ainda nao ha base publicada suficiente para comparar materias.
						</p>
					{:else}
						<div class="mt-4 space-y-3">
							{#each data.subjects as subject (subject.subjectId)}
								<article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
									<div class="flex items-start justify-between gap-3">
										<div class="min-w-0">
											<p class="text-base font-black text-slate-950">{subject.subjectName}</p>
											<p class="mt-1 text-sm leading-6 text-slate-600">
												{subject.assessmentsCount} avaliacao(oes) - {trendLabel(
													subject.recentTrend
												)}
											</p>
										</div>
										<span
											class={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-widest ${
												typeof subject.gapPercent === 'number' && subject.gapPercent < -5
													? 'border-red-200 bg-red-50 text-red-700'
													: typeof subject.gapPercent === 'number' && subject.gapPercent > 5
														? 'border-emerald-200 bg-emerald-50 text-emerald-700'
														: 'border-slate-200 bg-white text-slate-700'
											}`}
										>
											Gap {formatGap(subject.gapPercent)}
										</span>
									</div>

									<div class="mt-4 grid grid-cols-2 gap-3">
										<div class="rounded-2xl border border-slate-200 bg-white p-3">
											<p class="text-[11px] font-black uppercase tracking-widest text-slate-500">
												Aluno
											</p>
											<p class="mt-2 text-lg font-black text-slate-950">
												{formatScore(subject.studentAverage)}
											</p>
										</div>
										<div class="rounded-2xl border border-slate-200 bg-white p-3">
											<p class="text-[11px] font-black uppercase tracking-widest text-slate-500">
												Turma
											</p>
											<p class="mt-2 text-lg font-black text-slate-950">
												{formatScore(subject.classAverage)}
											</p>
										</div>
									</div>

									<p class="mt-3 text-sm leading-6 text-slate-600">
										{subject.latestAssessmentTitle
											? `Ultima publicacao: ${subject.latestAssessmentTitle} em ${formatDate(subject.latestAssessmentDate)}.`
											: 'Sem ultima publicacao registrada.'}
									</p>
								</article>
							{/each}
						</div>
					{/if}
				</section>
			</aside>
		</div>
	</div>
{/if}
