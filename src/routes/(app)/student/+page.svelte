<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatPercentAsGrade, formatPtBrGrade } from '$lib/utils/format';

	type PortalStatus = 'pending-link' | 'ready';
	type SubjectStatus = 'good' | 'attention' | 'pending';
	type Trend = 'improving' | 'declining' | 'stable' | 'insufficient_data';

	type SubjectItem = {
		id: string;
		name: string;
		code: string | null;
		score: number | null;
		progress: number | null;
		status: SubjectStatus;
		description: string;
		assessmentsCount: number;
		latestAssessmentTitle: string | null;
		latestAssessmentDate: string | null;
	};

	type EnrollmentItem = {
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
	};

	type TimelinePoint = {
		assessmentId: string;
		assessmentTitle: string;
		assessmentDate: string;
		subjectId: string;
		subjectName: string;
		rawScore: number | null;
		studentPercent: number | null;
		classAveragePercent: number | null;
		gapPercent: number | null;
	};

	type FormState = {
		action?: 'claimInviteCode';
		message?: string;
		values?: {
			invite_code?: string;
		};
	};

	type PageData = {
		overviewPortal: { status: PortalStatus; message: string };
		student: { displayName: string; className: string | null };
		summary: {
			totalSubjects: number;
			subjectsWithScore: number;
			goodSubjects: number;
			attentionSubjects: number;
			pendingSubjects: number;
			generalAverage: number | null;
			generalPercent: number | null;
		};
		bestSubject: SubjectItem | null;
		prioritySubject: SubjectItem | null;
		subjects: SubjectItem[];
		academicSummary: {
			title: string;
			description: string;
		};
		longitudinal: {
			best_subject: string | null;
			worst_subject: string | null;
			recent_trend: Trend;
			timeline: TimelinePoint[];
		} | null;
		enrollments: EnrollmentItem[];
	};

	let { data, form = null }: { data: PageData; form?: FormState | null } = $props();

	const formatDate = (value: string | null) => {
		if (!value) return 'Sem data';

		const date = new Date(`${value}T00:00:00`);
		if (Number.isNaN(date.getTime())) return value;

		return new Intl.DateTimeFormat('pt-BR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		}).format(date);
	};

	const averageLabel = (value: number | null) => formatPtBrGrade(value);
	const scoreFromPercentLabel = (value: number | null) => formatPercentAsGrade(value);

	const subjectStatusLabel = (status: SubjectStatus) => {
		if (status === 'good') return 'Bom momento';
		if (status === 'attention') return 'Pede atenção';
		return 'Sem base';
	};

	const subjectStatusClass = (status: SubjectStatus) => {
		if (status === 'good') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
		if (status === 'attention') return 'border-amber-200 bg-amber-50 text-amber-700';
		return 'border-slate-200 bg-slate-50 text-slate-600';
	};

	const enrollmentStatusLabel = (status: EnrollmentItem['status']) => {
		if (status === 'active') return 'Ativo';
		if (status === 'pending') return 'Pendente';
		return 'Arquivado';
	};

	const enrollmentStatusClass = (status: EnrollmentItem['status']) => {
		if (status === 'active') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
		if (status === 'pending') return 'border-amber-200 bg-amber-50 text-amber-700';
		return 'border-slate-200 bg-slate-50 text-slate-600';
	};

	const trendLabel = (trend: Trend | null | undefined) => {
		if (trend === 'improving') return 'Em melhora';
		if (trend === 'declining') return 'Em queda';
		if (trend === 'stable') return 'Estável';
		return 'Ainda sem base suficiente';
	};

	const currentEnrollment = $derived(data.enrollments.find((item) => item.isCurrent) ?? null);
	const visibleSubjects = $derived(data.subjects.slice(0, 4));
	const recentTimeline = $derived(data.longitudinal?.timeline?.slice(0, 4) ?? []);

	const claimErrorMessage = $derived(
		form?.action === 'claimInviteCode' ? (form.message ?? null) : null
	);
	const claimInviteCodeValue = $derived(
		form?.action === 'claimInviteCode' ? (form.values?.invite_code ?? '') : ''
	);
</script>

<svelte:head>
	<title>Class Insights - Painel do aluno</title>
</svelte:head>

<div class="grid gap-6">
	<section class="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.95fr)]">
		<div class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
			<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">Portal do aluno</p>

			<h1 class="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
				Olá, {data.student.displayName}
			</h1>

			<p class="mt-4 max-w-3xl text-base leading-8 text-slate-600">
				{#if data.overviewPortal.status === 'ready'}
					Acompanhe seu progresso publicado, veja o que vai bem e descubra onde vale revisar
					primeiro.
				{:else}
					Sua conta está pronta, mas ainda falta concluir um vínculo acadêmico ativo para liberar
					seu painel.
				{/if}
			</p>

			<div class="mt-5 flex flex-wrap gap-3">
				<span
					class={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-bold ${
						data.overviewPortal.status === 'ready'
							? 'border-emerald-200 bg-emerald-50 text-emerald-700'
							: 'border-amber-200 bg-amber-50 text-amber-700'
					}`}
				>
					{data.overviewPortal.status === 'ready' ? 'Vínculo ativo' : 'Vínculo pendente'}
				</span>

				<span
					class="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700"
				>
					{currentEnrollment?.className ?? data.student.className ?? 'Sem turma ativa'}
				</span>
			</div>

			<p class="mt-4 text-sm leading-7 text-slate-500">
				{data.overviewPortal.message}
			</p>
		</div>

		<aside class="rounded-4xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
			<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Acesso rápido</p>

			<div class="mt-4 grid gap-3">
				<a
					href={resolve('/student/journey')}
					class="rounded-3xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50"
				>
					<p class="text-sm font-black text-slate-900">Jornada</p>
					<p class="mt-1 text-sm leading-6 text-slate-600">
						Veja sua evolução recente e publicações.
					</p>
				</a>

				<a
					href={resolve('/student/skills')}
					class="rounded-3xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50"
				>
					<p class="text-sm font-black text-slate-900">Matérias</p>
					<p class="mt-1 text-sm leading-6 text-slate-600">
						Confira desempenho, progresso e próximas revisões.
					</p>
				</a>
			</div>
		</aside>
	</section>

	{#if data.overviewPortal.status !== 'ready'}
		<section class="rounded-4xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
			<p class="text-xs font-black uppercase tracking-[0.24em] text-amber-700">Próximo passo</p>

			<h2 class="mt-2 text-3xl font-black tracking-tight text-slate-950">
				Conclua um vínculo acadêmico
			</h2>

			<p class="mt-4 max-w-4xl text-base leading-8 text-slate-700">
				Sua conta de aluno foi criada, mas o sistema ainda não encontrou um vínculo ativo com uma
				turma. Use um código de convite válido para entrar em uma turma e liberar sua visão
				acadêmica.
			</p>

			<div class="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)]">
				<div class="rounded-3xl border border-amber-200 bg-white p-5">
					<p class="text-sm font-black text-slate-950">Adicionar código de convite</p>
					<p class="mt-2 text-sm leading-7 text-slate-600">
						Digite o código recebido do professor para vincular esta conta à turma.
					</p>

					{#if claimErrorMessage}
						<div
							class="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
						>
							{claimErrorMessage}
						</div>
					{/if}

					<form method="POST" action="?/claimInviteCode" class="mt-5 grid gap-4">
						<div>
							<label for="invite_code" class="block text-sm font-black text-slate-900">
								Código de convite
							</label>
							<input
								id="invite_code"
								name="invite_code"
								type="text"
								value={claimInviteCodeValue}
								placeholder="Ex.: A1B2C3D4"
								autocomplete="off"
								class="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium uppercase tracking-[0.12em] text-slate-900 outline-none transition placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
								required
							/>
							<p class="mt-2 text-sm leading-6 text-slate-500">
								O código pode conter letras e números. Espaços são ignorados.
							</p>
						</div>

						<button
							type="submit"
							class="inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-600 px-6 text-sm font-black text-white transition hover:bg-emerald-700"
						>
							Vincular código
						</button>
					</form>
				</div>

				<div class="rounded-3xl border border-amber-200 bg-white p-5">
					<p class="text-sm font-black text-slate-950">Vínculos encontrados</p>
					<p class="mt-2 text-sm leading-7 text-slate-600">
						Quando um vínculo ficar ativo, ele passa a aparecer aqui e no topo do portal.
					</p>

					{#if data.enrollments.length > 0}
						<div class="mt-4 grid gap-3">
							{#each data.enrollments as enrollment (enrollment.enrollmentId)}
								<article class="rounded-3xl border border-amber-200 bg-amber-50 p-4">
									<div class="flex items-start justify-between gap-3">
										<div>
											<p class="text-base font-black text-slate-900">{enrollment.className}</p>
											<p class="mt-1 text-sm text-slate-600">{enrollment.studentName}</p>
										</div>

										<span
											class={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${enrollmentStatusClass(enrollment.status)}`}
										>
											{enrollmentStatusLabel(enrollment.status)}
										</span>
									</div>

									<p class="mt-3 text-sm text-slate-500">
										Entrada: {formatDate(enrollment.joinedAt)}
									</p>
								</article>
							{/each}
						</div>
					{:else}
						<div
							class="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600"
						>
							Ainda não há vínculos associados a esta conta.
						</div>
					{/if}
				</div>
			</div>
		</section>
	{:else}
		<section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
				<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Média geral</p>
				<p class="mt-2 text-3xl font-black tracking-tight text-slate-950">
					{averageLabel(data.summary.generalAverage)}
				</p>
				<p class="mt-2 text-sm text-slate-500">
					Aproveitamento: {scoreFromPercentLabel(data.summary.generalPercent)}
				</p>
			</div>

			<div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
				<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
					Matérias com nota
				</p>
				<p class="mt-2 text-3xl font-black tracking-tight text-slate-950">
					{data.summary.subjectsWithScore}
				</p>
				<p class="mt-2 text-sm text-slate-500">
					de {data.summary.totalSubjects} matéria(s)
				</p>
			</div>

			<div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
				<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Em bom momento</p>
				<p class="mt-2 text-3xl font-black tracking-tight text-slate-950">
					{data.summary.goodSubjects}
				</p>
				<p class="mt-2 text-sm text-slate-500">Matérias dentro do esperado</p>
			</div>

			<div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
				<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Pedem atenção</p>
				<p class="mt-2 text-3xl font-black tracking-tight text-slate-950">
					{data.summary.attentionSubjects}
				</p>
				<p class="mt-2 text-sm text-slate-500">
					{data.summary.pendingSubjects} sem base publicada
				</p>
			</div>
		</section>

		<section class="grid gap-4 lg:grid-cols-2">
			<article class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
				<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
					Destaque positivo
				</p>

				{#if data.bestSubject}
					<h2 class="mt-2 text-3xl font-black tracking-tight text-slate-950">
						{data.bestSubject.name}
					</h2>

					<div class="mt-4 flex flex-wrap gap-3">
						<span
							class={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${subjectStatusClass(data.bestSubject.status)}`}
						>
							{subjectStatusLabel(data.bestSubject.status)}
						</span>
					</div>

					<div class="mt-4 grid gap-3 sm:grid-cols-2">
						<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
							<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Nota</p>
							<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
								{averageLabel(data.bestSubject.score)}
							</p>
						</div>

						<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
							<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
								Aproveitamento
							</p>
							<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
								{scoreFromPercentLabel(data.bestSubject.progress)}
							</p>
						</div>
					</div>

					<p class="mt-4 text-base leading-8 text-slate-600">
						{data.bestSubject.description}
					</p>
				{:else}
					<p class="mt-4 text-base leading-8 text-slate-600">
						Ainda não há matéria com base suficiente para destacar um melhor resultado.
					</p>
				{/if}
			</article>

			<article class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
				<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
					Onde vale revisar
				</p>

				{#if data.prioritySubject}
					<h2 class="mt-2 text-3xl font-black tracking-tight text-slate-950">
						{data.prioritySubject.name}
					</h2>

					<div class="mt-4 flex flex-wrap gap-3">
						<span
							class={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${subjectStatusClass(data.prioritySubject.status)}`}
						>
							{subjectStatusLabel(data.prioritySubject.status)}
						</span>
					</div>

					<div class="mt-4 grid gap-3 sm:grid-cols-2">
						<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
							<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Nota</p>
							<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
								{averageLabel(data.prioritySubject.score)}
							</p>
						</div>

						<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
							<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
								Aproveitamento
							</p>
							<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
								{scoreFromPercentLabel(data.prioritySubject.progress)}
							</p>
						</div>
					</div>

					<p class="mt-4 text-base leading-8 text-slate-600">
						{data.prioritySubject.description}
					</p>
				{:else}
					<p class="mt-4 text-base leading-8 text-slate-600">
						Nenhuma matéria crítica apareceu até aqui nas publicações disponíveis.
					</p>
				{/if}
			</article>
		</section>

		<section class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Matérias</p>
					<h2 class="mt-2 text-3xl font-black tracking-tight text-slate-950">Resumo por matéria</h2>
				</div>

				<a
					href={resolve('/student/skills')}
					class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
				>
					Ver todas
				</a>
			</div>

			{#if visibleSubjects.length === 0}
				<div
					class="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600"
				>
					Ainda não há matérias publicadas para mostrar aqui.
				</div>
			{:else}
				<div class="mt-6 grid gap-4 md:grid-cols-2">
					{#each visibleSubjects as subject (subject.id)}
						<article class="rounded-3xl border border-slate-200 bg-slate-50 p-5">
							<div class="flex items-start justify-between gap-3">
								<div>
									<h3 class="text-lg font-black text-slate-950">{subject.name}</h3>
									<p class="mt-1 text-sm text-slate-500">{subject.code ?? 'Sem código'}</p>
								</div>

								<span
									class={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${subjectStatusClass(subject.status)}`}
								>
									{subjectStatusLabel(subject.status)}
								</span>
							</div>

							<div class="mt-4 grid gap-3 sm:grid-cols-2">
								<div class="rounded-2xl border border-slate-200 bg-white p-4">
									<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Nota</p>
									<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
										{averageLabel(subject.score)}
									</p>
								</div>

								<div class="rounded-2xl border border-slate-200 bg-white p-4">
									<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
										Aproveitamento
									</p>
									<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
										{scoreFromPercentLabel(subject.progress)}
									</p>
								</div>
							</div>

							<p class="mt-4 text-sm leading-7 text-slate-600">
								{subject.description}
							</p>

							<p class="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
								{subject.assessmentsCount} publicação(ões)
								{#if subject.latestAssessmentDate}
									· última em {formatDate(subject.latestAssessmentDate)}
								{/if}
							</p>
						</article>
					{/each}
				</div>
			{/if}
		</section>

		<section class="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
			<div class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
				<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Linha do tempo</p>
				<h2 class="mt-2 text-3xl font-black tracking-tight text-slate-950">Publicações recentes</h2>

				{#if recentTimeline.length === 0}
					<div
						class="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600"
					>
						Ainda não há publicações suficientes para montar sua linha do tempo.
					</div>
				{:else}
					<div class="mt-6 grid gap-4">
						{#each recentTimeline as item (item.assessmentId)}
							<article class="rounded-3xl border border-slate-200 bg-slate-50 p-5">
								<div class="flex flex-wrap items-start justify-between gap-3">
									<div>
										<h3 class="text-lg font-black text-slate-950">{item.assessmentTitle}</h3>
										<p class="mt-1 text-sm text-slate-600">{item.subjectName}</p>
									</div>

									<p class="text-sm font-semibold text-slate-500">
										{formatDate(item.assessmentDate)}
									</p>
								</div>

								<div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
									<div class="rounded-2xl border border-slate-200 bg-white p-4">
										<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
											Sua nota
										</p>
										<p class="mt-2 text-xl font-black tracking-tight text-slate-950">
											{averageLabel(item.rawScore)}
										</p>
									</div>

									<div class="rounded-2xl border border-slate-200 bg-white p-4">
										<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
											Aproveitamento
										</p>
										<p class="mt-2 text-xl font-black tracking-tight text-slate-950">
											{scoreFromPercentLabel(item.studentPercent)}
										</p>
									</div>

									<div class="rounded-2xl border border-slate-200 bg-white p-4">
										<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
											Gap para turma
										</p>
										<p class="mt-2 text-xl font-black tracking-tight text-slate-950">
											{item.gapPercent === null ? '--' : formatPtBrGrade(item.gapPercent / 10)}
										</p>
									</div>
								</div>
							</article>
						{/each}
					</div>
				{/if}
			</div>

			<aside class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
				<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Leitura geral</p>
				<h2 class="mt-2 text-3xl font-black tracking-tight text-slate-950">
					{data.academicSummary.title}
				</h2>
				<p class="mt-4 text-base leading-8 text-slate-600">
					{data.academicSummary.description}
				</p>

				<div class="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
					<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
						Tendência recente
					</p>
					<p class="mt-2 text-lg font-black text-slate-950">
						{trendLabel(data.longitudinal?.recent_trend)}
					</p>
				</div>
			</aside>
		</section>
	{/if}
</div>
