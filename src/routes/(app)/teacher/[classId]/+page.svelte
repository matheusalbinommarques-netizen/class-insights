<!-- eslint-disable svelte/no-navigation-without-resolve -->
<script lang="ts">
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import type { SubjectLongitudinalSummary } from '$lib/types/academic';
	import type {
		TeacherClassStudent,
		TeacherClassSubjectCard,
		TeacherSubjectOption
	} from '$lib/types/teacher';

	type Feedback = {
		action?: 'createStudent' | 'createSubject' | 'linkSubject' | 'createAssessment';
		message?: string;
		success?: boolean;
	};

	type Props = {
		data: {
			class: {
				id: string;
				name: string;
				score_min: number;
				score_max: number;
				score_decimals: number;
				access_code: string | null;
			} | null;
			students: TeacherClassStudent[];
			subjects: TeacherClassSubjectCard[];
			availableSubjects: TeacherSubjectOption[];
			longitudinalSubjects: SubjectLongitudinalSummary[];
			summary: {
				totalStudents: number;
				totalSubjects: number;
				totalAssessments: number;
				draftAssessments: number;
				publishedAssessments: number;
			};
		};
	};

	let { data }: Props = $props();

	const formState = $derived(($page.form ?? null) as Feedback | null);
	const formMessage = $derived(formState?.message ?? null);
	const formSuccess = $derived(formState?.success ?? false);

	let selectedSubjectId = $state('');
	let selectedLinkedSubjectId = $state('');

	$effect(() => {
		const subjectIdFromQuery = $page.url.searchParams.get('subjectId');
		const subjectExists = data.subjects.some((subject) => subject.id === subjectIdFromQuery);

		if (subjectIdFromQuery && subjectExists && selectedSubjectId !== subjectIdFromQuery) {
			selectedSubjectId = subjectIdFromQuery;
		} else if (!selectedSubjectId && data.subjects[0]) {
			selectedSubjectId = data.subjects[0].id;
		}

		if (!selectedLinkedSubjectId && availableToLink()[0]) {
			selectedLinkedSubjectId = availableToLink()[0].id;
		}
	});

	function formatDate(value: string | null) {
		if (!value) return 'Pendente';
		const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
		if (Number.isNaN(date.getTime())) return value;

		return new Intl.DateTimeFormat('pt-BR', {
			dateStyle: 'medium'
		}).format(date);
	}

	function statusBadgeClass(status: 'draft' | 'published') {
		return status === 'published'
			? 'border-emerald-200 bg-emerald-50 text-emerald-700'
			: 'border-amber-200 bg-amber-50 text-amber-700';
	}

	function availableToLink() {
		const linkedIds = new Set(data.subjects.map((subject) => subject.id));
		return data.availableSubjects.filter((subject) => !linkedIds.has(subject.id));
	}

	function jumpToNewAssessment(subjectId: string) {
		selectedSubjectId = subjectId;
		window.location.hash = 'new-assessment';
	}

	function jumpToAnchor(anchor: string) {
		window.location.hash = anchor.replace('#', '');
	}

	function longitudinalTrendLabel(trend: SubjectLongitudinalSummary['recent_trend']) {
		if (trend === 'improving') return 'Em melhora';
		if (trend === 'declining') return 'Em queda';
		if (trend === 'stable') return 'Estavel';
		return 'Base insuficiente';
	}

	function formatScore(value: number | null) {
		if (typeof value !== 'number') return '--';
		return (value / 10).toFixed(1);
	}

	const nextOperationalStep = $derived.by(() => {
		if (data.summary.totalStudents === 0) {
			return {
				title: 'Comece pelos alunos',
				description: 'Sem alunos, a turma nao consegue virar lancamento real por avaliacao.',
				ctaLabel: 'Cadastrar primeiro aluno',
				href: '#students'
			};
		}

		if (data.summary.totalSubjects === 0) {
			return {
				title: 'Agora feche a base de materias',
				description:
					'A turma ja tem alunos. O proximo passo e criar ou vincular as materias do fluxo.',
				ctaLabel: 'Adicionar materia',
				href: '#subjects'
			};
		}

		if (data.summary.totalAssessments === 0) {
			return {
				title: 'Abra a primeira avaliacao',
				description:
					'A turma ja tem base minima e pode sair da configuracao para o fluxo operacional.',
				ctaLabel: 'Criar avaliacao',
				href: '#new-assessment'
			};
		}

		if (data.summary.draftAssessments > 0) {
			return {
				title: 'Feche os rascunhos em aberto',
				description:
					'Sua turma ja esta operando. Vale revisar os rascunhos e avancar para publicacao.',
				ctaLabel: 'Abrir avaliacoes',
				href: '/teacher/assessments'
			};
		}

		return {
			title: 'Turma em operacao',
			description: 'A base principal ja esta montada. Agora o foco e lancar, revisar e publicar.',
			ctaLabel: 'Ver avaliacoes da turma',
			href: '/teacher/assessments'
		};
	});

	const subjectsWithoutAssessments = $derived.by(() =>
		data.subjects.filter((subject) => subject.assessments.length === 0)
	);
</script>

<svelte:head>
	<title>{data.class ? `Class Insights - ${data.class.name}` : 'Class Insights - Turma'}</title>
</svelte:head>

{#if !data.class}
	<section class="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
		<p class="text-xs font-black uppercase tracking-widest text-slate-500">Turma</p>
		<h1 class="mt-3 text-3xl font-black tracking-tight text-slate-950">Turma nao encontrada</h1>
		<p class="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
			Essa turma pode nao existir mais ou nao pertencer ao seu escopo.
		</p>
		<a
			href={resolve('/teacher')}
			class="mt-5 inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800"
		>
			Voltar ao dashboard
		</a>
	</section>
{:else}
	<div class="space-y-6">
		<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
			<div class="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
				<div class="max-w-3xl">
					<p class="text-xs font-black uppercase tracking-widest text-slate-500">Turma</p>
					<h1 class="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
						{data.class.name}
					</h1>
					<p class="mt-3 text-base leading-8 text-slate-600">
						Aqui a operacao principal gira em torno de
						<strong class="text-slate-950">materias</strong>
						e
						<strong class="text-slate-950">avaliacoes</strong>. O objetivo desta turma e sair da
						configuracao e entrar num ciclo claro de lancamento, revisao e publicacao.
					</p>
					<p class="mt-2 text-sm leading-7 text-slate-600">
						Escala padrao da turma: {data.class.score_min} a {data.class.score_max} com
						{data.class.score_decimals} casa(s) decimal(is).
					</p>
					<div
						class="mt-4 inline-flex w-fit items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
					>
						<span class="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">
							Codigo da turma
						</span>
						<code class="text-sm font-black text-slate-950">
							{data.class.access_code ?? '--'}
						</code>
					</div>
					<div class="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4">
						<p class="text-xs font-black uppercase tracking-widest text-sky-700">Proximo passo</p>
						<h2 class="mt-2 text-lg font-black tracking-tight text-slate-950">
							{nextOperationalStep.title}
						</h2>
						<p class="mt-2 text-sm leading-7 text-slate-600">
							{nextOperationalStep.description}
						</p>
						{#if nextOperationalStep.href.startsWith('/')}
							<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
							<a
								href={nextOperationalStep.href}
								class="mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-black text-white transition hover:bg-slate-800"
							>
								{nextOperationalStep.ctaLabel}
							</a>
						{:else}
							<button
								type="button"
								class="mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-black text-white transition hover:bg-slate-800"
								onclick={() => jumpToAnchor(nextOperationalStep.href)}
							>
								{nextOperationalStep.ctaLabel}
							</button>
						{/if}
					</div>
				</div>

				<div class="grid gap-3 sm:grid-cols-2 xl:w-full xl:max-w-xl">
					<div class="rounded-2xl border border-slate-200 bg-white p-4">
						<p class="text-xs font-black uppercase tracking-widest text-slate-500">Alunos</p>
						<p class="mt-2 text-3xl font-black text-slate-950">{data.summary.totalStudents}</p>
					</div>

					<div class="rounded-2xl border border-sky-200 bg-sky-50 p-4">
						<p class="text-xs font-black uppercase tracking-widest text-sky-700">Materias</p>
						<p class="mt-2 text-3xl font-black text-slate-950">{data.summary.totalSubjects}</p>
					</div>

					<div class="rounded-2xl border border-slate-200 bg-white p-4">
						<p class="text-xs font-black uppercase tracking-widest text-slate-500">Avaliacoes</p>
						<p class="mt-2 text-3xl font-black text-slate-950">{data.summary.totalAssessments}</p>
					</div>

					<div class="rounded-2xl border border-amber-200 bg-amber-50 p-4">
						<p class="text-xs font-black uppercase tracking-widest text-amber-700">Rascunhos</p>
						<p class="mt-2 text-3xl font-black text-slate-950">{data.summary.draftAssessments}</p>
					</div>

					<div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
						<p class="text-xs font-black uppercase tracking-widest text-emerald-700">Publicadas</p>
						<p class="mt-2 text-3xl font-black text-slate-950">
							{data.summary.publishedAssessments}
						</p>
					</div>
				</div>
			</div>
		</section>

		{#if formMessage}
			<div
				class={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
					formSuccess
						? 'border-emerald-200 bg-emerald-50 text-emerald-700'
						: 'border-red-200 bg-red-50 text-red-700'
				}`}
			>
				{formMessage}
			</div>
		{/if}

		<div class="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
			<div class="space-y-6">
				<section id="students" class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<p class="text-xs font-black uppercase tracking-widest text-slate-500">Alunos</p>
					<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">Cadastro da turma</h2>

					<form method="POST" action="?/createStudent" class="mt-5 space-y-3">
						<input
							name="name"
							placeholder="Nome do aluno"
							class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
						/>
						<button
							type="submit"
							class="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800"
						>
							Adicionar aluno
						</button>
					</form>

					{#if data.students.length === 0}
						<div
							class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600"
						>
							Nenhum aluno cadastrado ainda. Assim que o primeiro aluno entrar, a turma ja pode
							seguir para materia e avaliacao sem ambiguidade.
						</div>
					{:else}
						<div class="mt-5 space-y-3">
							{#each data.students as student (student.id)}
								<article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
									<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
										<div class="min-w-0">
											<p class="text-base font-black text-slate-950">{student.name}</p>
											<p class="mt-2 text-sm leading-7 text-slate-600">
												Invite code:
												<code class="rounded-lg bg-white px-2 py-1 font-bold text-slate-900">
													{student.invite_code ?? '--'}
												</code>
											</p>
										</div>
										<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
										<a
											href={`/teacher/students/${student.id}`}
											class="inline-flex h-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-100"
										>
											Ver perfil
										</a>
									</div>
								</article>
							{/each}
						</div>
					{/if}
				</section>

				<section id="subjects" class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<p class="text-xs font-black uppercase tracking-widest text-slate-500">Materias</p>
					<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">Criar e vincular</h2>

					<form method="POST" action="?/createSubject" class="mt-5 space-y-4">
						<label class="space-y-2 text-sm font-bold text-slate-700">
							<span>Nova materia</span>
							<input
								name="name"
								placeholder="Ex: Matematica, Redacao, Ciencias"
								class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
							/>
						</label>

						<label class="space-y-2 text-sm font-bold text-slate-700">
							<span>Codigo</span>
							<input
								name="code"
								placeholder="Opcional"
								class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base uppercase text-slate-900 outline-none transition placeholder:normal-case placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
							/>
						</label>

						<button
							type="submit"
							class="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800"
						>
							Criar materia nesta turma
						</button>
					</form>

					{#if availableToLink().length > 0}
						<form
							method="POST"
							action="?/linkSubject"
							class="mt-6 space-y-4 border-t border-slate-200 pt-6"
						>
							<label class="space-y-2 text-sm font-bold text-slate-700">
								<span>Vincular materia existente</span>
								<select
									name="subject_id"
									bind:value={selectedLinkedSubjectId}
									class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
								>
									{#each availableToLink() as subject (subject.id)}
										<option value={subject.id}>
											{subject.name}{subject.code ? ` (${subject.code})` : ''}
										</option>
									{/each}
								</select>
							</label>

							<button
								type="submit"
								class="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
							>
								Vincular materia
							</button>
						</form>
					{/if}
				</section>

				<section
					id="new-assessment"
					class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
				>
					<p class="text-xs font-black uppercase tracking-widest text-slate-500">Avaliacoes</p>
					<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">Nova avaliacao</h2>
					<p class="mt-2 text-sm leading-7 text-slate-600">
						Escolha a materia e abra o rascunho inicial. Se voce veio de uma materia abaixo, ela ja
						entra preselecionada aqui.
					</p>

					{#if data.subjects.length === 0}
						<div
							class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600"
						>
							Crie ou vincule uma materia antes de abrir a primeira avaliacao desta turma.
						</div>
					{:else}
						{#if subjectsWithoutAssessments.length > 0}
							<div class="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
								<p class="text-xs font-black uppercase tracking-widest text-amber-700">
									Materias sem avaliacao
								</p>
								<div class="mt-3 flex flex-wrap gap-2">
									{#each subjectsWithoutAssessments as subject (subject.id)}
										<button
											type="button"
											class="inline-flex h-10 items-center justify-center rounded-2xl border border-amber-200 bg-white px-4 text-sm font-bold text-amber-700 transition hover:bg-amber-100"
											onclick={() => jumpToNewAssessment(subject.id)}
										>
											{subject.name}
										</button>
									{/each}
								</div>
							</div>
						{/if}

						<form method="POST" action="?/createAssessment" class="mt-5 space-y-4">
							<label class="space-y-2 text-sm font-bold text-slate-700">
								<span>Materia</span>
								<select
									name="subject_id"
									bind:value={selectedSubjectId}
									class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
								>
									{#each data.subjects as subject (subject.id)}
										<option value={subject.id}>
											{subject.name}{subject.code ? ` (${subject.code})` : ''}
										</option>
									{/each}
								</select>
							</label>

							<div class="grid gap-4 md:grid-cols-[1.3fr_0.8fr_0.5fr]">
								<label class="space-y-2 text-sm font-bold text-slate-700">
									<span>Titulo</span>
									<input
										name="title"
										placeholder="Ex: Prova 1, Quiz, Trabalho"
										class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
									/>
								</label>

								<label class="space-y-2 text-sm font-bold text-slate-700">
									<span>Data</span>
									<input
										name="assessment_date"
										type="date"
										class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
									/>
								</label>

								<label class="space-y-2 text-sm font-bold text-slate-700">
									<span>Peso</span>
									<input
										name="weight"
										type="number"
										step="0.1"
										min="0.1"
										value="1"
										class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
									/>
								</label>
							</div>

							<button
								type="submit"
								class="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800"
							>
								Criar avaliacao
							</button>
						</form>
					{/if}
				</section>
			</div>

			<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
				<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
					<div>
						<p class="text-xs font-black uppercase tracking-widest text-slate-500">Mapa da turma</p>
						<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
							Fluxo academico da turma
						</h2>
					</div>

					<a
						href={resolve('/teacher/assessments')}
						class="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
					>
						Ver todas as avaliacoes
					</a>
				</div>

				{#if data.subjects.length === 0}
					<div
						class="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"
					>
						<h3 class="text-lg font-black text-slate-950">Nenhuma materia ainda</h3>
						<p class="mt-2 text-sm leading-7 text-slate-600">
							Assim que a turma ganhar materias, este painel vira o centro da operacao por
							avaliacao.
						</p>
					</div>
				{:else}
					{#if data.longitudinalSubjects.length > 0}
						<div class="mt-6 grid gap-3 md:grid-cols-2">
							{#each data.longitudinalSubjects as item (item.subject_id)}
								<article class="rounded-2xl border border-slate-200 bg-white p-4">
									<p class="text-xs font-black uppercase tracking-widest text-slate-500">
										Longitudinal
									</p>
									<h3 class="mt-2 text-lg font-black text-slate-950">{item.subject_name}</h3>
									<div class="mt-4 grid gap-3 sm:grid-cols-3">
										<div class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
											<p class="text-[11px] font-black uppercase tracking-widest text-slate-500">
												Media publicada
											</p>
											<p class="mt-1 text-lg font-black text-slate-950">
												{formatScore(item.average_percent)}
											</p>
										</div>
										<div class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
											<p class="text-[11px] font-black uppercase tracking-widest text-slate-500">
												Tendencia
											</p>
											<p class="mt-1 text-sm font-black text-slate-950">
												{longitudinalTrendLabel(item.recent_trend)}
											</p>
										</div>
										<div class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
											<p class="text-[11px] font-black uppercase tracking-widest text-slate-500">
												Ultima avaliacao
											</p>
											<p class="mt-1 text-sm font-black text-slate-950">
												{formatDate(item.latest_assessment_date)}
											</p>
										</div>
									</div>
								</article>
							{/each}
						</div>
					{/if}

					<div class="mt-6 space-y-4">
						{#each data.subjects as subject (subject.id)}
							<article class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
								<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
									<div class="min-w-0">
										<div class="flex flex-wrap items-center gap-2">
											<h3 class="text-xl font-black tracking-tight text-slate-950">
												{subject.name}
											</h3>
											{#if subject.code}
												<span
													class="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-widest text-slate-700"
												>
													{subject.code}
												</span>
											{/if}
										</div>
										<p class="mt-2 text-sm leading-7 text-slate-600">
											{subject.assessments.length} avaliacao(oes) ligadas a esta materia.
										</p>
									</div>
									<div class="flex flex-wrap gap-2">
										<button
											type="button"
											class="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-100"
											onclick={() => jumpToNewAssessment(subject.id)}
										>
											Nova avaliacao
										</button>
										{#if subject.assessments[0]}
											<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
											<a
												href={`/teacher/assessments/${subject.assessments[0].id}`}
												class="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-100"
											>
												Abrir ultima
											</a>
										{/if}
									</div>
								</div>

								{#if subject.assessments.length === 0}
									<div
										class="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600"
									>
										Materia criada, mas ainda sem avaliacao. O proximo passo e abrir o primeiro
										rascunho para essa materia.
									</div>
								{:else}
									<div class="mt-4 space-y-3">
										{#each subject.assessments as assessment (assessment.id)}
											<article class="rounded-2xl border border-slate-200 bg-white p-4">
												<div
													class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
												>
													<div class="min-w-0">
														<div class="flex flex-wrap items-center gap-2">
															<p class="text-base font-black text-slate-950">{assessment.title}</p>
															<span
																class={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-widest ${statusBadgeClass(assessment.status)}`}
															>
																{assessment.status}
															</span>
														</div>
														<p class="mt-2 text-sm leading-7 text-slate-600">
															{assessment.resultsCount} resultado(s) salvos - peso {assessment.weight}
														</p>
													</div>

													<div class="text-right text-sm text-slate-600">
														<p>
															<strong class="text-slate-950">Data:</strong>
															{formatDate(assessment.assessmentDate)}
														</p>
														<p class="mt-1">
															<strong class="text-slate-950">Publicacao:</strong>
															{assessment.publishedAt
																? formatDate(assessment.publishedAt)
																: 'Pendente'}
														</p>
														<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
														<a
															href={`/teacher/assessments/${assessment.id}`}
															class="mt-3 inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-100"
														>
															Lancar notas
														</a>
													</div>
												</div>
											</article>
										{/each}
									</div>
								{/if}
							</article>
						{/each}
					</div>
				{/if}
			</section>
		</div>
	</div>
{/if}
