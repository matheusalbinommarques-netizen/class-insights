<script lang="ts">
	import CoordClassWatchCard from '$lib/components/coord/CoordClassWatchCard.svelte';
	import CoordFilterBar from '$lib/components/coord/CoordFilterBar.svelte';
	import CoordMetricCard from '$lib/components/coord/CoordMetricCard.svelte';
	import CoordSectionHeader from '$lib/components/coord/CoordSectionHeader.svelte';
	import CoordStudentWatchCard from '$lib/components/coord/CoordStudentWatchCard.svelte';
	import CoordSubjectWatchCard from '$lib/components/coord/CoordSubjectWatchCard.svelte';
	import CoordTeacherWatchCard from '$lib/components/coord/CoordTeacherWatchCard.svelte';
	import NextStepCard from '$lib/components/shared/NextStepCard.svelte';
	import StatusPill from '$lib/components/shared/StatusPill.svelte';

	type Trend = 'improving' | 'declining' | 'stable' | 'insufficient_data';
	type Tone = 'healthy' | 'attention' | 'critical';
	type ViewMode = 'overview' | 'classes' | 'subjects' | 'teachers' | 'students';
	type StatusFilter = 'all' | 'critical' | 'attention' | 'stable';
	type SortMode = 'priority' | 'lowest_average' | 'highest_risk' | 'most_publications' | 'name';
	type SummaryTone = 'default' | 'attention' | 'critical';
	type PrioritySeverity = 'critical' | 'attention' | 'healthy';
	type PriorityKind = 'class_focus' | 'subject_focus' | 'teacher_focus' | 'student_focus';

	type SummaryHighlight = {
		key: string;
		label: string;
		value: string;
		description: string;
		tone: SummaryTone;
	};

	type BaseCoordItem = {
		displayName: string;
		searchText: string;
		statusKey: Exclude<StatusFilter, 'all'>;
		averageValue: number;
		publicationCount: number;
		riskCount: number;
		priorityScore: number;
	};

	type ClassViewItem = {
		classId: string;
		className: string;
		teacherName: string;
		accessCode: string | null;
		studentsCount: number;
		publishedAssessments: number;
		averagePercent: number | null;
		averageLabel: string;
		riskStudents: number;
		tone: Tone;
		primaryReason?: string;
		detailHref?: string;
		coveragePercent?: number;
		lastPublishedAt?: string | null;
	} & BaseCoordItem;

	type SubjectViewItem = {
		subjectId: string;
		subjectName: string;
		averagePercent: number | null;
		averageLabel: string;
		assessmentsCount: number;
		recentTrend: Trend;
		primaryReason?: string;
		detailHref?: string;
		coveragePercent?: number;
		lastPublishedAt?: string | null;
	} & BaseCoordItem;

	type TeacherViewItem = {
		teacherId: string;
		teacherName: string;
		classesCount: number;
		averagePercent: number | null;
		averageLabel: string;
		publishedAssessments: number;
		primaryReason?: string;
		detailHref?: string;
		coveragePercent?: number;
		lastPublishedAt?: string | null;
	} & BaseCoordItem;

	type StudentViewItem = {
		studentId: string;
		studentName: string;
		className: string;
		averagePercent: number;
		averageLabel: string;
		publishedAssessments: number;
		primaryReason?: string;
		detailHref?: string;
	} & BaseCoordItem;

	type PriorityAction = {
		kind: PriorityKind;
		priorityRank: number;
		title: string;
		reason: string;
		href: string;
		primaryLabel: string;
		sourceLabel: string | null;
		severity: PrioritySeverity;
		score: number;
	};

	type InstitutionalPriorities = {
		classFocus: {
			classId: string;
			className: string;
			teacherName: string;
			primaryReason: string;
			detailHref: string;
		} | null;
		subjectFocus: {
			subjectId: string;
			subjectName: string;
			primaryReason: string;
			detailHref: string;
		} | null;
		teacherFocus: {
			teacherId: string;
			teacherName: string;
			primaryReason: string;
			detailHref: string;
		} | null;
		studentFocus: Array<{
			studentId: string;
			studentName: string;
			className: string;
			primaryReason: string;
			detailHref: string;
		}>;
		queue: PriorityAction[];
	};

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
			highlights?: SummaryHighlight[];
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
			tone: Tone;
			priorityScore?: number;
			coveragePercent?: number;
			lastPublishedAt?: string | null;
			primaryReason?: string;
			detailHref?: string;
		}>;
		subjects: Array<{
			subjectId: string;
			subjectName: string;
			averagePercent: number | null;
			assessmentsCount: number;
			recentTrend: Trend;
			priorityScore?: number;
			coveragePercent?: number;
			lastPublishedAt?: string | null;
			primaryReason?: string;
			detailHref?: string;
		}>;
		teachers: Array<{
			teacherId: string;
			teacherName: string;
			classesCount: number;
			averagePercent: number | null;
			publishedAssessments: number;
			priorityScore?: number;
			coveragePercent?: number;
			lastPublishedAt?: string | null;
			primaryReason?: string;
			detailHref?: string;
		}>;
		students: Array<{
			studentId: string;
			studentName: string;
			className: string;
			averagePercent: number;
			publishedAssessments: number;
			priorityScore?: number;
			primaryReason?: string;
			detailHref?: string;
		}>;
		institutionalPriorities?: InstitutionalPriorities;
		error: string | null;
	};

	let activeView: ViewMode = 'overview';
	let searchQuery = '';
	let statusFilter: StatusFilter = 'all';
	let sortMode: SortMode = 'priority';

	const viewTabs: Array<{
		value: ViewMode;
		label: string;
		description: string;
	}> = [
		{
			value: 'overview',
			label: 'Visão geral',
			description: 'Prioridades, panorama e próximos aprofundamentos'
		},
		{
			value: 'classes',
			label: 'Turmas',
			description: 'Comparativo por turma'
		},
		{
			value: 'subjects',
			label: 'Matérias',
			description: 'Risco, queda e estabilidade por matéria'
		},
		{
			value: 'teachers',
			label: 'Professores',
			description: 'Leitura por responsável'
		},
		{
			value: 'students',
			label: 'Alunos',
			description: 'Casos que pedem acompanhamento'
		}
	];

	const statusOptions = [
		{ value: 'all', label: 'Tudo' },
		{ value: 'critical', label: 'Crítico' },
		{ value: 'attention', label: 'Atenção' },
		{ value: 'stable', label: 'Dentro do esperado' }
	];

	const sortOptions = [
		{ value: 'priority', label: 'Maior prioridade' },
		{ value: 'lowest_average', label: 'Menor média' },
		{ value: 'highest_risk', label: 'Maior risco' },
		{ value: 'most_publications', label: 'Mais publicações' },
		{ value: 'name', label: 'Nome' }
	];

	const formatGrade = (value: number | null) => {
		if (typeof value !== 'number') return '--';
		return new Intl.NumberFormat('pt-BR', {
			minimumFractionDigits: 1,
			maximumFractionDigits: 1
		}).format(value / 10);
	};

	const formatPercent = (value: number | null) => {
		if (typeof value !== 'number') return '--';
		return new Intl.NumberFormat('pt-BR', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(value);
	};

	const normalizeText = (value: string) =>
		value
			.normalize('NFD')
			.replace(/\p{Diacritic}/gu, '')
			.toLowerCase()
			.trim();

	const scoreStatus = (value: number | null): Exclude<StatusFilter, 'all'> => {
		if (typeof value !== 'number') return 'stable';
		if (value < 50) return 'critical';
		if (value < 70) return 'attention';
		return 'stable';
	};

	const subjectStatus = (
		averagePercent: number | null,
		recentTrend: Trend
	): Exclude<StatusFilter, 'all'> => {
		if (recentTrend === 'declining' && (averagePercent ?? 100) < 60) return 'critical';
		if ((averagePercent ?? 100) < 50) return 'critical';
		if (recentTrend === 'declining' || (averagePercent ?? 100) < 70) return 'attention';
		return 'stable';
	};

	const compareNumbers = (left: number, right: number) => left - right;

	const matchesStatus = (
		itemStatus: Exclude<StatusFilter, 'all'>,
		filter: StatusFilter
	): boolean => {
		if (filter === 'all') return true;
		return itemStatus === filter;
	};

	const matchesSearch = (searchText: string, query: string): boolean => {
		if (!query) return true;
		return searchText.includes(normalizeText(query));
	};

	const sortCoordItems = <T extends BaseCoordItem>(items: T[], selectedSort: SortMode): T[] => {
		const sorted = [...items];

		sorted.sort((left, right) => {
			if (selectedSort === 'name') {
				return left.displayName.localeCompare(right.displayName, 'pt-BR');
			}

			if (selectedSort === 'lowest_average') {
				return compareNumbers(left.averageValue, right.averageValue);
			}

			if (selectedSort === 'highest_risk') {
				if (right.riskCount !== left.riskCount) return right.riskCount - left.riskCount;
				return compareNumbers(left.averageValue, right.averageValue);
			}

			if (selectedSort === 'most_publications') {
				if (right.publicationCount !== left.publicationCount) {
					return right.publicationCount - left.publicationCount;
				}
				return compareNumbers(left.averageValue, right.averageValue);
			}

			if (right.priorityScore !== left.priorityScore) {
				return right.priorityScore - left.priorityScore;
			}

			return compareNumbers(left.averageValue, right.averageValue);
		});

		return sorted;
	};

	const filterCoordItems = <T extends BaseCoordItem>(
		items: T[],
		query: string,
		filter: StatusFilter
	): T[] =>
		items.filter(
			(item) => matchesSearch(item.searchText, query) && matchesStatus(item.statusKey, filter)
		);

	const tabClass = (tab: ViewMode, current: ViewMode) =>
		tab === current
			? 'border-slate-900 bg-slate-900 text-white'
			: 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50';

	const highlightTone = (tone: SummaryTone): 'default' | 'attention' | 'info' => {
		if (tone === 'critical' || tone === 'attention') return 'attention';
		return 'info';
	};

	const severityToPillTone = (severity: PrioritySeverity): 'alert' | 'attention' | 'healthy' => {
		if (severity === 'critical') return 'alert';
		if (severity === 'attention') return 'attention';
		return 'healthy';
	};

	const severityToNextStepTone = (
		severity: PrioritySeverity
	): 'alert' | 'attention' | 'healthy' => {
		if (severity === 'critical') return 'alert';
		if (severity === 'attention') return 'attention';
		return 'healthy';
	};

	const priorityEyebrow = (kind: PriorityKind) => {
		if (kind === 'class_focus') return 'Turma mais sensível';
		if (kind === 'subject_focus') return 'Matéria mais crítica';
		if (kind === 'teacher_focus') return 'Professor que pede cuidado';
		return 'Aluno prioritário';
	};

	const priorityCardClass = (severity: PrioritySeverity) => {
		if (severity === 'critical') {
			return 'border-red-200 bg-red-50/80';
		}

		if (severity === 'attention') {
			return 'border-amber-200 bg-amber-50/80';
		}

		return 'border-emerald-200 bg-emerald-50/80';
	};

	const trendLabel = (trend: Trend) => {
		if (trend === 'declining') return 'Em queda';
		if (trend === 'improving') return 'Em melhora';
		if (trend === 'stable') return 'Estável';
		return 'Base insuficiente';
	};

	$: summary = data.summary;

	let summaryHighlights: SummaryHighlight[] = [];

	$: summaryHighlights =
		summary?.highlights && summary.highlights.length > 0
			? summary.highlights
			: ([
					{
						key: 'scope',
						label: 'Turmas no escopo',
						value: String(summary?.totalClasses ?? 0),
						description: 'Recorte institucional que já pode ser acompanhado.',
						tone: 'default'
					},
					{
						key: 'institution-average',
						label: 'Média institucional',
						value: `${formatGrade(summary?.institutionAverage ?? null)} / 10`,
						description: 'Considera somente resultados publicados.',
						tone: 'default'
					},
					{
						key: 'risk',
						label: 'Turmas em atenção',
						value: String(summary?.classesAtRisk ?? 0),
						description: 'Pedem leitura mais próxima neste momento.',
						tone: 'attention'
					},
					{
						key: 'publications',
						label: 'Publicações lidas',
						value: String(summary?.totalPublishedAssessments ?? 0),
						description: 'Base disponível para comparação institucional.',
						tone: 'default'
					}
				] as SummaryHighlight[]);

	$: classItems = data.classes.map(
		(classItem): ClassViewItem => ({
			...classItem,
			averageLabel: formatGrade(classItem.averagePercent),
			displayName: classItem.className,
			searchText: normalizeText(
				`${classItem.className} ${classItem.teacherName} ${classItem.accessCode ?? ''}`
			),
			statusKey:
				classItem.tone === 'healthy'
					? 'stable'
					: classItem.tone === 'attention'
						? 'attention'
						: 'critical',
			averageValue: classItem.averagePercent ?? 999,
			publicationCount: classItem.publishedAssessments,
			riskCount: classItem.riskStudents,
			priorityScore:
				typeof classItem.priorityScore === 'number'
					? classItem.priorityScore
					: (classItem.tone === 'critical' ? 300 : classItem.tone === 'attention' ? 180 : 80) +
						classItem.riskStudents * 8 +
						classItem.publishedAssessments -
						Math.round((classItem.averagePercent ?? 100) / 4)
		})
	);

	$: subjectItems = data.subjects.map((subject): SubjectViewItem => {
		const statusKey = subjectStatus(subject.averagePercent, subject.recentTrend);
		const trendBonus =
			subject.recentTrend === 'declining'
				? 120
				: subject.recentTrend === 'improving'
					? 10
					: subject.recentTrend === 'stable'
						? 20
						: 5;

		return {
			...subject,
			averageLabel: formatGrade(subject.averagePercent),
			displayName: subject.subjectName,
			searchText: normalizeText(subject.subjectName),
			statusKey,
			averageValue: subject.averagePercent ?? 999,
			publicationCount: subject.assessmentsCount,
			riskCount: statusKey === 'critical' ? 2 : statusKey === 'attention' ? 1 : 0,
			priorityScore:
				typeof subject.priorityScore === 'number'
					? subject.priorityScore
					: (statusKey === 'critical' ? 280 : statusKey === 'attention' ? 150 : 70) +
						trendBonus +
						subject.assessmentsCount -
						Math.round((subject.averagePercent ?? 100) / 5)
		};
	});

	$: teacherItems = data.teachers.map((teacher): TeacherViewItem => {
		const statusKey =
			teacher.publishedAssessments === 0 ? 'attention' : scoreStatus(teacher.averagePercent);

		return {
			...teacher,
			averageLabel: formatGrade(teacher.averagePercent),
			displayName: teacher.teacherName,
			searchText: normalizeText(teacher.teacherName),
			statusKey,
			averageValue: teacher.averagePercent ?? 999,
			publicationCount: teacher.publishedAssessments,
			riskCount:
				statusKey === 'critical'
					? 2 + teacher.classesCount
					: statusKey === 'attention'
						? 1 + teacher.classesCount
						: teacher.classesCount,
			priorityScore:
				typeof teacher.priorityScore === 'number'
					? teacher.priorityScore
					: (statusKey === 'critical' ? 240 : statusKey === 'attention' ? 140 : 60) +
						teacher.classesCount * 12 +
						(teacher.publishedAssessments === 0 ? 40 : 0) -
						Math.round((teacher.averagePercent ?? 100) / 5)
		};
	});

	$: studentItems = data.students.map((student): StudentViewItem => {
		const statusKey = scoreStatus(student.averagePercent);

		return {
			...student,
			averageLabel: formatGrade(student.averagePercent),
			displayName: student.studentName,
			searchText: normalizeText(`${student.studentName} ${student.className}`),
			statusKey,
			averageValue: student.averagePercent,
			publicationCount: student.publishedAssessments,
			riskCount: statusKey === 'critical' ? 2 : statusKey === 'attention' ? 1 : 0,
			priorityScore:
				typeof student.priorityScore === 'number'
					? student.priorityScore
					: (statusKey === 'critical' ? 260 : statusKey === 'attention' ? 150 : 50) +
						student.publishedAssessments * 4 -
						Math.round(student.averagePercent / 4)
		};
	});

	$: filteredClasses = sortCoordItems(
		filterCoordItems(classItems, searchQuery, statusFilter),
		sortMode
	);
	$: filteredSubjects = sortCoordItems(
		filterCoordItems(subjectItems, searchQuery, statusFilter),
		sortMode
	);
	$: filteredTeachers = sortCoordItems(
		filterCoordItems(teacherItems, searchQuery, statusFilter),
		sortMode
	);
	$: filteredStudents = sortCoordItems(
		filterCoordItems(studentItems, searchQuery, statusFilter),
		sortMode
	);

	$: overviewClasses = filteredClasses.slice(0, 3);
	$: overviewSubjects = filteredSubjects.slice(0, 4);
	$: overviewTeachers = filteredTeachers.slice(0, 3);
	$: overviewStudents = filteredStudents.slice(0, 4);

	$: hasScopedData =
		data.classes.length > 0 ||
		data.subjects.length > 0 ||
		data.teachers.length > 0 ||
		data.students.length > 0;

	$: priorityQueue = data.institutionalPriorities?.queue ?? [];
	$: primaryPriority = priorityQueue[0] ?? null;
	$: secondaryPriorities = priorityQueue.slice(1, 4);

	$: quickFocusCards = [
		data.institutionalPriorities?.classFocus
			? {
					key: 'class-focus',
					label: 'Turma que mais pede leitura',
					title: data.institutionalPriorities.classFocus.className,
					description: data.institutionalPriorities.classFocus.primaryReason,
					href: data.institutionalPriorities.classFocus.detailHref,
					linkLabel: 'Abrir turma'
				}
			: null,
		data.institutionalPriorities?.subjectFocus
			? {
					key: 'subject-focus',
					label: 'Matéria com maior sinal de risco',
					title: data.institutionalPriorities.subjectFocus.subjectName,
					description: data.institutionalPriorities.subjectFocus.primaryReason,
					href: data.institutionalPriorities.subjectFocus.detailHref,
					linkLabel: 'Ver matéria'
				}
			: null,
		data.institutionalPriorities?.teacherFocus
			? {
					key: 'teacher-focus',
					label: 'Responsável que pede cuidado',
					title: data.institutionalPriorities.teacherFocus.teacherName,
					description: data.institutionalPriorities.teacherFocus.primaryReason,
					href: data.institutionalPriorities.teacherFocus.detailHref,
					linkLabel: 'Ver professor'
				}
			: null
	].filter(Boolean) as Array<{
		key: string;
		label: string;
		title: string;
		description: string;
		href: string;
		linkLabel: string;
	}>;

	$: tabInfo = viewTabs.find((tab) => tab.value === activeView) ?? viewTabs[0];

	$: resultsSummary =
		activeView === 'overview'
			? `${filteredClasses.length} turma(s), ${filteredSubjects.length} matéria(s), ${filteredTeachers.length} professor(es) e ${filteredStudents.length} aluno(s) no recorte atual.`
			: activeView === 'classes'
				? `${filteredClasses.length} turma(s) encontradas no recorte atual.`
				: activeView === 'subjects'
					? `${filteredSubjects.length} matéria(s) encontradas no recorte atual.`
					: activeView === 'teachers'
						? `${filteredTeachers.length} professor(es) encontrados no recorte atual.`
						: `${filteredStudents.length} aluno(s) encontrados no recorte atual.`;

	$: currentTabCounts = {
		overview: hasScopedData ? 1 : 0,
		classes: classItems.length,
		subjects: subjectItems.length,
		teachers: teacherItems.length,
		students: studentItems.length
	} satisfies Record<ViewMode, number>;

	function setView(nextView: ViewMode) {
		activeView = nextView;
	}
</script>

<svelte:head>
	<title>Class Insights - Painel da coordenação</title>
</svelte:head>

<div class="grid gap-6">
	{#if form?.message}
		<div
			class={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
				form.success
					? 'border-emerald-200 bg-emerald-50 text-emerald-700'
					: 'border-red-200 bg-red-50 text-red-700'
			}`}
		>
			{form.message}
		</div>
	{/if}

	{#if data.error}
		<section class="rounded-4xl border border-red-200 bg-red-50 p-6 shadow-sm">
			<p class="text-xs font-black uppercase tracking-[0.35em] text-red-600">Erro no painel</p>
			<h2 class="mt-3 text-2xl font-black tracking-tight text-red-950">
				Não foi possível carregar a leitura institucional
			</h2>
			<p class="mt-3 max-w-2xl text-sm leading-7 text-red-800">
				{data.error}
			</p>
			<p class="mt-4 text-sm leading-7 text-red-800">
				Tente atualizar a página ou validar se o seu escopo de coordenação já foi vinculado.
			</p>
		</section>
	{/if}

	<section class="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_360px]">
		<div class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
			<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div class="min-w-0">
					<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">
						Painel institucional
					</p>
					<h1 class="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
						O que merece leitura primeiro no seu escopo
					</h1>
					<p class="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
						A coordenação começa pelo panorama, confirma onde o risco se concentra e só depois
						aprofundar em turma, matéria, professor ou aluno.
					</p>
				</div>

				<div class="flex flex-wrap gap-2">
					<StatusPill
						label={`${summary?.managedClassesCount ?? 0} turma(s) no painel`}
						tone="context"
						size="md"
					/>
					<StatusPill
						label={`${summary?.classesAtRisk ?? 0} em atenção`}
						tone={(summary?.classesAtRisk ?? 0) > 0 ? 'attention' : 'healthy'}
						size="md"
					/>
				</div>
			</div>

			<div class="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
				<p class="text-sm font-semibold text-slate-700">
					{summary?.message ?? 'Seu painel institucional já está pronto para leitura.'}
				</p>
			</div>

			{#if hasScopedData && primaryPriority}
				<div class="mt-6 grid gap-4">
					<NextStepCard
						eyebrow={priorityEyebrow(primaryPriority.kind)}
						title={primaryPriority.title}
						description={primaryPriority.reason}
						tone={severityToNextStepTone(primaryPriority.severity)}
						primaryHref={primaryPriority.href}
						primaryLabel={primaryPriority.primaryLabel}
						secondaryHref="#coord-filter-bar"
						secondaryLabel="Refinar recorte"
						primaryTone={primaryPriority.severity === 'healthy' ? 'healthy' : 'brand'}
					/>

					{#if secondaryPriorities.length > 0}
						<div class="grid gap-3 lg:grid-cols-3">
							{#each secondaryPriorities as priority (priority.kind + priority.href)}
								<article class={`rounded-3xl border p-4 ${priorityCardClass(priority.severity)}`}>
									<div class="flex flex-wrap items-center justify-between gap-2">
										<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-600">
											{priorityEyebrow(priority.kind)}
										</p>
										<StatusPill
											label={priority.severity === 'critical'
												? 'Crítico'
												: priority.severity === 'attention'
													? 'Atenção'
													: 'Dentro do esperado'}
											tone={severityToPillTone(priority.severity)}
										/>
									</div>

									<h3 class="mt-3 text-lg font-black tracking-tight text-slate-950">
										{priority.title}
									</h3>

									<p class="mt-2 text-sm leading-6 text-slate-600">{priority.reason}</p>

									{#if priority.sourceLabel}
										<p class="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
											{priority.sourceLabel}
										</p>
									{/if}

									<div class="mt-4 flex justify-end">
										<a
											href={priority.href}
											class="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
										>
											{priority.primaryLabel}
										</a>
									</div>
								</article>
							{/each}
						</div>
					{/if}

					<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
						{#each summaryHighlights as item (item.key)}
							<CoordMetricCard
								label={item.label}
								value={item.value}
								helper={item.description}
								tone={highlightTone(item.tone)}
							/>
						{/each}
					</div>
				</div>
			{:else}
				<div class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					{#each summaryHighlights as item (item.key)}
						<CoordMetricCard
							label={item.label}
							value={item.value}
							helper={item.description}
							tone={highlightTone(item.tone)}
						/>
					{/each}
				</div>
			{/if}
		</div>

		<div class="grid gap-4">
			<div class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
				<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">
					Adicionar turma ao escopo
				</p>
				<h2 class="mt-3 text-xl font-black tracking-tight text-slate-950">
					Incluir uma nova turma
				</h2>
				<p class="mt-2 text-sm leading-7 text-slate-600">
					Cole o código de acesso para trazer uma nova turma para a sua leitura institucional.
				</p>

				<form method="POST" action="?/claimAccessCode" class="mt-5 grid gap-3">
					<label class="grid gap-2">
						<span class="text-sm font-bold text-slate-700">Código da turma</span>
						<input
							name="accessCode"
							type="text"
							placeholder="Ex.: AB12CD34"
							autocomplete="off"
							class="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold uppercase tracking-[0.14em] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:bg-white"
						/>
					</label>

					<button
						type="submit"
						class="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800"
					>
						Adicionar ao painel
					</button>
				</form>

				<div class="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
					<p class="text-sm font-semibold text-slate-700">
						A coordenação acompanha o recorte da turma, mas não entra na rotina operacional de
						lançamento do professor.
					</p>
				</div>
			</div>

			{#if hasScopedData}
				<div class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
					<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">Focos rápidos</p>
					<h2 class="mt-3 text-xl font-black tracking-tight text-slate-950">
						Por onde aprofundar depois do panorama
					</h2>

					<div class="mt-5 grid gap-3">
						{#if quickFocusCards.length === 0}
							<div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
								<p class="text-sm font-semibold text-slate-700">
									Ainda não há um foco dominante claro no recorte atual.
								</p>
							</div>
						{:else}
							{#each quickFocusCards as item (item.key)}
								<article class="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
									<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
										{item.label}
									</p>
									<h3 class="mt-2 text-lg font-black tracking-tight text-slate-950">
										{item.title}
									</h3>
									<p class="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>

									<div class="mt-4 flex justify-end">
										<a
											href={item.href}
											class="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
										>
											{item.linkLabel}
										</a>
									</div>
								</article>
							{/each}
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</section>

	{#if !hasScopedData && !data.error}
		<section
			class="rounded-4xl border border-dashed border-slate-300 bg-white/80 p-8 text-center shadow-sm"
		>
			<p class="text-lg font-black tracking-tight text-slate-950">
				Seu painel ainda não tem turmas vinculadas
			</p>
			<p class="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600">
				Adicione um código de turma para começar a acompanhar médias, tendências e casos que pedem
				atenção no seu escopo.
			</p>
		</section>
	{:else if hasScopedData}
		<section class="grid gap-4">
			<div class="rounded-4xl border border-slate-200 bg-white p-5 shadow-sm">
				<div class="flex flex-col gap-3">
					<div class="flex flex-wrap gap-2">
						{#each viewTabs as tab (tab.value)}
							<button
								type="button"
								class={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition ${tabClass(tab.value, activeView)}`}
								on:click={() => setView(tab.value)}
							>
								<span>{tab.label}</span>
								<span
									class={`rounded-full px-2 py-0.5 text-xs ${
										tab.value === activeView
											? 'bg-white/15 text-white'
											: 'bg-slate-100 text-slate-600'
									}`}
								>
									{currentTabCounts[tab.value]}
								</span>
							</button>
						{/each}
					</div>

					<div
						class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
					>
						<p class="font-semibold text-slate-800">{tabInfo.label}</p>
						<p class="mt-1 leading-6">{tabInfo.description}</p>
					</div>
				</div>
			</div>

			<div id="coord-filter-bar">
				<CoordFilterBar
					bind:searchQuery
					bind:statusFilter
					bind:sortMode
					searchPlaceholder={activeView === 'overview'
						? 'Buscar turma, professor, matéria ou aluno'
						: activeView === 'classes'
							? 'Buscar turma ou professor'
							: activeView === 'subjects'
								? 'Buscar matéria'
								: activeView === 'teachers'
									? 'Buscar professor'
									: 'Buscar aluno ou turma'}
					{resultsSummary}
					{statusOptions}
					{sortOptions}
				/>
			</div>
		</section>

		{#if activeView === 'overview'}
			<section class="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
				<div class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
					<CoordSectionHeader
						eyebrow="Turmas que mais pedem leitura"
						title="Onde o risco institucional aparece primeiro"
						description="Média publicada, alunos em risco e volume publicado aparecem juntos para facilitar a leitura macro."
					/>

					<div class="mt-5 grid gap-4">
						{#if overviewClasses.length === 0}
							<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
								<p class="text-base font-bold text-slate-950">Nenhuma turma encontrada</p>
								<p class="mt-2 text-sm leading-6 text-slate-600">
									Ajuste os filtros para comparar as turmas dentro do recorte atual.
								</p>
							</div>
						{:else}
							{#each overviewClasses as classItem (classItem.classId)}
								<CoordClassWatchCard {classItem} />
							{/each}
						{/if}
					</div>
				</div>

				<div class="grid gap-6">
					<div class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
						<CoordSectionHeader
							eyebrow="Leitura rápida"
							title="O que o recorte mostra agora"
							description="Use o recorte para confirmar se o risco é amplo, concentrado ou pontual."
						/>

						<div class="mt-5 grid gap-3">
							<div
								class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-700"
							>
								{filteredClasses.length} turma(s) no recorte atual.
							</div>
							<div
								class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-700"
							>
								{filteredSubjects.length} matéria(s) no recorte atual.
							</div>
							<div
								class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-700"
							>
								{filteredTeachers.length} professor(es) no recorte atual.
							</div>
							<div
								class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-700"
							>
								{filteredStudents.length} aluno(s) no recorte atual.
							</div>
						</div>
					</div>

					<div class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
						<CoordSectionHeader
							eyebrow="Base já disponível"
							title="Quanto já dá para comparar"
							description="Acompanhe o volume de publicações que já sustentam a leitura institucional."
						/>

						<div class="mt-5 grid gap-3">
							<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
									Média institucional
								</p>
								<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
									{formatPercent(summary?.institutionAverage ?? null)}%
								</p>
							</div>
							<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
									Total de estudantes
								</p>
								<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
									{summary?.totalStudents ?? 0}
								</p>
							</div>
							<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
									Publicações lidas
								</p>
								<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
									{summary?.totalPublishedAssessments ?? 0}
								</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			<section class="grid gap-6 xl:grid-cols-2">
				<div class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
					<CoordSectionHeader
						eyebrow="Matérias mais sensíveis"
						title="O que mais está explicando o risco agora"
						description="Quando a queda se repete por matéria, a coordenação diferencia padrão institucional de caso isolado."
					/>

					<div class="mt-5 grid gap-4 sm:grid-cols-2">
						{#if overviewSubjects.length === 0}
							<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:col-span-2">
								<p class="text-base font-bold text-slate-950">Nenhuma matéria encontrada</p>
								<p class="mt-2 text-sm leading-6 text-slate-600">
									Ajuste os filtros para localizar matérias dentro do recorte atual.
								</p>
							</div>
						{:else}
							{#each overviewSubjects as subject (subject.subjectId)}
								<CoordSubjectWatchCard {subject} />
							{/each}
						{/if}
					</div>
				</div>

				<div class="grid gap-6">
					<div class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
						<CoordSectionHeader
							eyebrow="Professores e turmas"
							title="Onde a leitura ainda pede cuidado"
						/>

						<div class="mt-5 grid gap-4">
							{#if overviewTeachers.length === 0}
								<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
									<p class="text-base font-bold text-slate-950">Nenhum professor encontrado</p>
									<p class="mt-2 text-sm leading-6 text-slate-600">
										Ajuste os filtros para localizar professores dentro do recorte atual.
									</p>
								</div>
							{:else}
								{#each overviewTeachers as teacher (teacher.teacherId)}
									<CoordTeacherWatchCard {teacher} />
								{/each}
							{/if}
						</div>
					</div>

					<div class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
						<CoordSectionHeader
							eyebrow="Acompanhamento de alunos"
							title="Quem pode precisar de apoio primeiro"
						/>

						<div class="mt-5 grid gap-4">
							{#if overviewStudents.length === 0}
								<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
									<p class="text-base font-bold text-slate-950">Nenhum aluno encontrado</p>
									<p class="mt-2 text-sm leading-6 text-slate-600">
										Ajuste os filtros para localizar alunos dentro do recorte atual.
									</p>
								</div>
							{:else}
								{#each overviewStudents as student (student.studentId)}
									<CoordStudentWatchCard {student} />
								{/each}
							{/if}
						</div>
					</div>
				</div>
			</section>
		{/if}

		{#if activeView === 'classes'}
			<section class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
				<CoordSectionHeader
					eyebrow="Turmas"
					title="Comparativo por turma"
					description="Use busca, situação e ordenação para definir por onde a leitura institucional começa."
				/>

				<div class="mt-5 grid gap-4">
					{#if filteredClasses.length === 0}
						<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
							<p class="text-base font-bold text-slate-950">Nenhuma turma encontrada</p>
							<p class="mt-2 text-sm leading-6 text-slate-600">
								Não há turmas compatíveis com os filtros atuais.
							</p>
						</div>
					{:else}
						{#each filteredClasses as classItem (classItem.classId)}
							<CoordClassWatchCard {classItem} />
						{/each}
					{/if}
				</div>
			</section>
		{/if}

		{#if activeView === 'subjects'}
			<section class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
				<CoordSectionHeader
					eyebrow="Matérias"
					title="Risco e tendência por matéria"
					description="Compare rapidamente onde a queda é mais clara no escopo atual."
				/>

				<div class="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{#if filteredSubjects.length === 0}
						<div
							class="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:col-span-2 xl:col-span-3"
						>
							<p class="text-base font-bold text-slate-950">Nenhuma matéria encontrada</p>
							<p class="mt-2 text-sm leading-6 text-slate-600">
								Não há matérias compatíveis com os filtros atuais.
							</p>
						</div>
					{:else}
						{#each filteredSubjects as subject (subject.subjectId)}
							<CoordSubjectWatchCard {subject} />
						{/each}
					{/if}
				</div>
			</section>
		{/if}

		{#if activeView === 'teachers'}
			<section class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
				<CoordSectionHeader
					eyebrow="Professores"
					title="Leitura por responsável"
					description="Entenda quais professores concentram turmas mais sensíveis dentro do escopo."
				/>

				<div class="mt-5 grid gap-4 xl:grid-cols-2">
					{#if filteredTeachers.length === 0}
						<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5 xl:col-span-2">
							<p class="text-base font-bold text-slate-950">Nenhum professor encontrado</p>
							<p class="mt-2 text-sm leading-6 text-slate-600">
								Não há professores compatíveis com os filtros atuais.
							</p>
						</div>
					{:else}
						{#each filteredTeachers as teacher (teacher.teacherId)}
							<CoordTeacherWatchCard {teacher} />
						{/each}
					{/if}
				</div>
			</section>
		{/if}

		{#if activeView === 'students'}
			<section class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
				<CoordSectionHeader
					eyebrow="Alunos"
					title="Casos que pedem acompanhamento"
					description="Veja primeiro quem está com pior leitura publicada e merece olhar mais próximo."
				/>

				<div class="mt-5 grid gap-4 xl:grid-cols-2">
					{#if filteredStudents.length === 0}
						<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5 xl:col-span-2">
							<p class="text-base font-bold text-slate-950">Nenhum aluno encontrado</p>
							<p class="mt-2 text-sm leading-6 text-slate-600">
								Não há alunos compatíveis com os filtros atuais.
							</p>
						</div>
					{:else}
						{#each filteredStudents as student (student.studentId)}
							<CoordStudentWatchCard {student} />
						{/each}
					{/if}
				</div>
			</section>
		{/if}
	{/if}
</div>
