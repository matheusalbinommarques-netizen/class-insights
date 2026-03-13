<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
	import { onMount } from 'svelte';

	type InsightRow = {
		skill_id: string;
		skill_name: string;
		baseline_date: string | null;
		baseline_n?: number | null;
		baseline_avg: number | null;
		baseline_median?: number | null;
		latest_date: string | null;
		latest_n: number | null;
		latest_avg: number | null;
		latest_median?: number | null;
	};

	type InsightKpis = {
		classAvg: number | null;
		criticalSkill: InsightRow | null;
		strongSkill: InsightRow | null;
	};

	type ClassData = {
		id: string;
		name: string;
		score_min: number;
		score_max: number;
		score_decimals: number;
	};

	type Student = {
		id: string;
		name: string;
		invite_code: string | null;
	};

	type Skill = {
		id: string;
		name: string;
		score_min: number | null;
		score_max: number | null;
		score_decimals: number | null;
	};

	type ScoreRow = {
		student_id: string;
		skill_id: string;
		score: number;
	};

	type TabKey = 'overview' | 'launch' | 'manage';
	type LaunchStatusFilter = 'all' | 'risk' | 'attention' | 'good' | 'pending';
	type LaunchSortMode = 'alpha' | 'lowest' | 'highest-risk';
	type Tone = 'risk' | 'warn' | 'good' | 'empty';

	type StudentSkillEntry = {
		skill: Skill;
		raw: string;
		numeric: number | null;
		percent: number | null;
	};

	type NextBestAction = {
		title: string;
		description: string;
		cta: 'snapshot' | 'launch' | 'weakest';
	};

	type PageData = {
		class: ClassData | null;
		students: Student[];
		skills: Skill[];
		scores: ScoreRow[];
		insights: null | {
			rows: InsightRow[];
			kpis: InsightKpis;
		};
		hasTodaySnapshot: boolean;
		today: string;
	};

	let { data } = $props<{ data: PageData }>();

	const emptyKpis: InsightKpis = {
		classAvg: null,
		criticalSkill: null,
		strongSkill: null
	};

	const pageTitle = $derived(
		data.class ? `${data.class.name} • Class Insights` : 'Turma não encontrada • Class Insights'
	);

	const insightRows = $derived<InsightRow[]>(data.insights?.rows ?? []);
	const insightKpis = $derived<InsightKpis>(data.insights?.kpis ?? emptyKpis);

	const weakestRows = $derived.by(
		(): InsightRow[] =>
			[...insightRows]
				.filter((r: InsightRow) => typeof r.latest_avg === 'number')
				.sort((a: InsightRow, b: InsightRow) => (a.latest_avg ?? 0) - (b.latest_avg ?? 0))
				.slice(0, 3)
	);

	const strongestRows = $derived.by(
		(): InsightRow[] =>
			[...insightRows]
				.filter((r: InsightRow) => typeof r.latest_avg === 'number')
				.sort((a: InsightRow, b: InsightRow) => (b.latest_avg ?? 0) - (a.latest_avg ?? 0))
				.slice(0, 3)
	);

	const orderedInsightRows = $derived.by(
		(): InsightRow[] =>
			[...insightRows].sort((a: InsightRow, b: InsightRow) => {
				const aVal = a.latest_avg ?? Number.POSITIVE_INFINITY;
				const bVal = b.latest_avg ?? Number.POSITIVE_INFINITY;
				return aVal - bVal;
			})
	);

	const keyOf = (studentId: string, skillId: string) => `${studentId}:${skillId}`;

	let scores = $state<Record<string, string>>(
		Object.fromEntries(
			// svelte-ignore state_referenced_locally
						data.scores.map((scoreRow: ScoreRow) => [
				keyOf(scoreRow.student_id, scoreRow.skill_id),
				String(scoreRow.score)
			])
		)
	);

	let status = $state<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({});
	let errorMsg = $state<Record<string, string>>({});

	const formRefs: Record<string, HTMLFormElement | null> = {};
	const inputRefs: Record<string, HTMLInputElement | null> = {};

	const getScore = (studentId: string, skillId: string) => scores[keyOf(studentId, skillId)] ?? '';

	const setStatus = (
		k: string,
		s: 'idle' | 'saving' | 'saved' | 'error',
		msg = ''
	): void => {
		status = { ...status, [k]: s };

		if (msg) {
			errorMsg = { ...errorMsg, [k]: msg };
		} else if (k in errorMsg) {
			const next = { ...errorMsg };
			delete next[k];
			errorMsg = next;
		}
	};

	function registerForm(node: HTMLFormElement, key: string) {
		formRefs[key] = node;

		return {
			destroy() {
				delete formRefs[key];
			}
		};
	}

	function registerInput(node: HTMLInputElement, key: string) {
		inputRefs[key] = node;

		return {
			destroy() {
				delete inputRefs[key];
			}
		};
	}

	const enhanceScore: SubmitFunction = ({ formData }) => {
		const studentId = String(formData.get('studentId') ?? '');
		const skillId = String(formData.get('skillId') ?? '');
		const score = String(formData.get('score') ?? '');
		const k = keyOf(studentId, skillId);

		setStatus(k, 'saving');

		return async ({ result }: { result: ActionResult }) => {
			if (result.type === 'success') {
				scores = { ...scores, [k]: score };
				setStatus(k, 'saved');
				setTimeout(() => setStatus(k, 'idle'), 900);
				return;
			}

			const msg =
				(result.type === 'failure' &&
					(result as { data?: { message?: string } }).data?.message) ||
				(result.type === 'error' && result.error?.message) ||
				'Erro ao salvar.';

			setStatus(k, 'error', msg);
			setTimeout(() => setStatus(k, 'idle'), 2200);
		};
	};

	const effectiveScale = (skillId: string) => {
		const sk = data.skills.find((skill: Skill) => skill.id === skillId);
		const cls = data.class;

		return {
			min: sk?.score_min ?? cls?.score_min ?? 0,
			max: sk?.score_max ?? cls?.score_max ?? 10,
			decimals: sk?.score_decimals ?? cls?.score_decimals ?? 0
		};
	};

	const normalizeNumericString = (value: string) => {
		const raw = String(value ?? '').trim().replace(/\s+/g, '');

		if (!raw) return '';

		const hasComma = raw.includes(',');
		const hasDot = raw.includes('.');

		if (hasComma && hasDot) {
			const lastComma = raw.lastIndexOf(',');
			const lastDot = raw.lastIndexOf('.');

			if (lastComma > lastDot) {
				return raw.replace(/\./g, '').replace(',', '.');
			}

			return raw.replace(/,/g, '');
		}

		if (hasComma) return raw.replace(',', '.');
		return raw;
	};

	const toNumber = (v: string) => {
		const normalized = normalizeNumericString(v);
		if (!normalized) return null;

		const n = Number(normalized);
		return Number.isFinite(n) ? n : null;
	};

	const ratioFor = (skillId: string, raw: string) => {
		const n = toNumber(raw);
		if (n === null) return null;

		const sc = effectiveScale(skillId);
		const range = sc.max - sc.min;
		if (range <= 0) return null;

		return Math.max(0, Math.min(1, (n - sc.min) / range));
	};

	const scorePercentFor = (skillId: string, raw: string) => {
		const ratio = ratioFor(skillId, raw);
		if (ratio === null) return null;
		return Math.round(ratio * 100);
	};

	const cellTone = (skillId: string, raw: string): Tone => {
		if (!raw.trim()) return 'empty';

		const ratio = ratioFor(skillId, raw);
		if (ratio === null) return 'empty';

		if (ratio < 0.4) return 'risk';
		if (ratio < 0.7) return 'warn';
		return 'good';
	};

	const allSkills = (): Skill[] => data.skills;

	let activeTab = $state<TabKey>('overview');
	let focusMode = $state(false);
	let studentSearch = $state('');
	let statusFilter = $state<LaunchStatusFilter>('all');
	let sortMode = $state<LaunchSortMode>('alpha');
	let selectedSkillId = $state('');

	const visibleSkills = $derived.by(
		(): Skill[] =>
			selectedSkillId && data.skills.some((skill: Skill) => skill.id === selectedSkillId)
				? data.skills.filter((skill: Skill) => skill.id === selectedSkillId)
				: data.skills
	);

	const getStudentSkillEntries = (
		studentId: string,
		skillsList: Skill[] = visibleSkills
	): StudentSkillEntry[] =>
		skillsList.map((skill: Skill) => ({
			skill,
			raw: getScore(studentId, skill.id),
			numeric: toNumber(getScore(studentId, skill.id)),
			percent: scorePercentFor(skill.id, getScore(studentId, skill.id))
		}));

	const studentAverageRaw = (studentId: string, skillsList: Skill[] = visibleSkills) => {
		const values = getStudentSkillEntries(studentId, skillsList)
			.map((entry: StudentSkillEntry) => entry.numeric)
			.filter((v: number | null): v is number => v !== null);

		if (values.length === 0) return null;

		const decimals = data.class?.score_decimals ?? 0;
		const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length;
		return Number(avg.toFixed(decimals));
	};

	const studentAveragePercent = (studentId: string, skillsList: Skill[] = visibleSkills) => {
		const values = getStudentSkillEntries(studentId, skillsList)
			.map((entry: StudentSkillEntry) => entry.percent)
			.filter((v: number | null): v is number => typeof v === 'number');

		if (values.length === 0) return null;

		return Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length);
	};

	const studentHasPending = (studentId: string, skillsList: Skill[] = visibleSkills) =>
		getStudentSkillEntries(studentId, skillsList).some(
			(entry: StudentSkillEntry) => entry.raw.trim().length === 0
		);

	const studentHealth = (
		studentId: string,
		skillsList: Skill[] = visibleSkills
	): 'risk' | 'attention' | 'good' | 'pending' => {
		const avgPercent = studentAveragePercent(studentId, skillsList);
		const hasPending = studentHasPending(studentId, skillsList);

		if (avgPercent === null) return 'pending';
		if (avgPercent < 40) return 'risk';
		if (avgPercent < 70) return 'attention';
		if (hasPending) return 'pending';
		return 'good';
	};

	const matchesStatusFilter = (studentId: string) => {
		if (statusFilter === 'all') return true;
		if (statusFilter === 'pending') return studentHasPending(studentId, visibleSkills);

		return studentHealth(studentId, visibleSkills) === statusFilter;
	};

	const matchesSearch = (student: Student) =>
		student.name.toLowerCase().includes(studentSearch.trim().toLowerCase());

	const sortStudents = (students: Student[]): Student[] => {
		const next = [...students];

		if (sortMode === 'alpha') {
			next.sort((a: Student, b: Student) => a.name.localeCompare(b.name, 'pt-BR'));
			return next;
		}

		if (sortMode === 'lowest') {
			next.sort((a: Student, b: Student) => {
				const aAvg = studentAveragePercent(a.id, visibleSkills);
				const bAvg = studentAveragePercent(b.id, visibleSkills);

				if (aAvg === null && bAvg === null) return a.name.localeCompare(b.name, 'pt-BR');
				if (aAvg === null) return 1;
				if (bAvg === null) return -1;

				if (aAvg !== bAvg) return aAvg - bAvg;
				return a.name.localeCompare(b.name, 'pt-BR');
			});
			return next;
		}

		next.sort((a: Student, b: Student) => {
			const severity = (studentId: string) => {
				const health = studentHealth(studentId, visibleSkills);
				if (health === 'risk') return 0;
				if (health === 'pending') return 1;
				if (health === 'attention') return 2;
				return 3;
			};

			const aSeverity = severity(a.id);
			const bSeverity = severity(b.id);

			if (aSeverity !== bSeverity) return aSeverity - bSeverity;

			const aAvg = studentAveragePercent(a.id, visibleSkills);
			const bAvg = studentAveragePercent(b.id, visibleSkills);

			if (aAvg === null && bAvg === null) return a.name.localeCompare(b.name, 'pt-BR');
			if (aAvg === null) return 1;
			if (bAvg === null) return -1;
			if (aAvg !== bAvg) return aAvg - bAvg;

			return a.name.localeCompare(b.name, 'pt-BR');
		});

		return next;
	};

	const filteredStudents = $derived.by(
		(): Student[] =>
			sortStudents(
				data.students.filter(
					(student: Student) => matchesSearch(student) && matchesStatusFilter(student.id)
				)
			)
	);

	const averageBySkill = (skillId: string, studentsList: Student[] = filteredStudents) => {
		const values = studentsList
			.map((student: Student) => toNumber(getScore(student.id, skillId)))
			.filter((v: number | null): v is number => v !== null);

		if (values.length === 0) return '-';

		const sc = effectiveScale(skillId);
		const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length;
		return avg.toFixed(sc.decimals);
	};

	const averageTone = (skillId: string, studentsList: Student[] = filteredStudents): Tone => {
		const avg = averageBySkill(skillId, studentsList);
		if (avg === '-') return 'empty';
		return cellTone(skillId, avg);
	};

	const averageByStudentLabel = (studentId: string, skillsList: Skill[] = visibleSkills) => {
		const avg = studentAverageRaw(studentId, skillsList);
		if (avg === null) return '-';
		return avg.toFixed(data.class?.score_decimals ?? 0);
	};

	const averageToneByStudent = (
		studentId: string,
		skillsList: Skill[] = visibleSkills
	): Tone => {
		const health = studentHealth(studentId, skillsList);
		if (health === 'risk') return 'risk';
		if (health === 'attention') return 'warn';
		if (health === 'good') return 'good';
		return 'empty';
	};

	const overallGridAverage = (
		studentsList: Student[] = filteredStudents,
		skillsList: Skill[] = visibleSkills
	) => {
		const values = studentsList.flatMap((student: Student) =>
			skillsList
				.map((skill: Skill) => toNumber(getScore(student.id, skill.id)))
				.filter((v: number | null): v is number => v !== null)
		);

		if (values.length === 0) return '—';

		const decimals = data.class?.score_decimals ?? 0;
		const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length;
		return avg.toFixed(decimals);
	};

	const totalGridCells = $derived.by((): number => data.students.length * data.skills.length);

	const filledGridCells = $derived.by(
		(): number => Object.values(scores).filter((value: string) => toNumber(value) !== null).length
	);

	const gridCoverage = $derived.by(
		(): number => (totalGridCells > 0 ? Math.round((filledGridCells / totalGridCells) * 100) : 0)
	);

	const filteredGridCells = $derived.by(
		(): number => filteredStudents.length * visibleSkills.length
	);

	const filteredFilledGridCells = $derived.by(
		(): number =>
			filteredStudents.reduce((sum: number, student: Student) => {
				return (
					sum +
					visibleSkills.filter((skill: Skill) => {
						const numeric = toNumber(getScore(student.id, skill.id));
						return numeric !== null;
					}).length
				);
			}, 0)
	);

	const filteredCoverage = $derived.by(
		(): number =>
			filteredGridCells > 0
				? Math.round((filteredFilledGridCells / filteredGridCells) * 100)
				: 0
	);

	const launchRiskStudentsCount = $derived.by(
		(): number =>
			data.students.filter(
				(student: Student) => studentHealth(student.id, allSkills()) === 'risk'
			).length
	);

	const launchPendingStudentsCount = $derived.by(
		(): number =>
			data.students.filter((student: Student) => studentHasPending(student.id, allSkills()))
				.length
	);

	const latestSnapshotDate = $derived.by(
		(): string | null =>
			insightRows
				.map((row: InsightRow) => row.latest_date)
				.filter((value: string | null): value is string => typeof value === 'string')
				.sort((a: string, b: string) => a.localeCompare(b))
				.at(-1) ?? null
	);

	const nextBestAction = $derived.by(
		(): NextBestAction =>
			!data.hasTodaySnapshot
				? {
						title: 'Gerar snapshot da turma',
						description:
							'Você ainda não gerou o snapshot de hoje. Isso mantém a evolução auditável.',
						cta: 'snapshot'
					}
				: launchPendingStudentsCount > 0
					? {
							title: 'Completar lançamentos pendentes',
							description: `${launchPendingStudentsCount} aluno(s) ainda têm células em aberto no grid.`,
							cta: 'launch'
						}
					: weakestRows.length > 0
						? {
								title: `Revisar ${weakestRows[0].skill_name}`,
								description:
									'Esta skill aparece como a lacuna mais crítica da turma neste momento.',
								cta: 'weakest'
							}
						: {
								title: 'Turma está estável',
								description:
									'Sem alerta crítico imediato. Você pode seguir com novas avaliações.',
								cta: 'launch'
							}
	);

	let editingScale = $state<Record<string, boolean>>({});

	const toggleEditingScale = (skillId: string) => {
		editingScale = { ...editingScale, [skillId]: !editingScale[skillId] };
	};

	const confirmDeleteSkill = (e: MouseEvent) => {
		if (!confirm('Deletar skill? Isso remove os scores dela.')) {
			e.preventDefault();
		}
	};

	let snapshotStatus = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
	let snapshotError = $state('');

	const enhanceSnapshot: SubmitFunction = () => {
		snapshotStatus = 'saving';
		snapshotError = '';

		return async ({ result }: { result: ActionResult }) => {
			if (result.type === 'success') {
				snapshotStatus = 'saved';
				setTimeout(() => {
					location.reload();
				}, 250);
				return;
			}

			const msg =
				(result.type === 'failure' &&
					(result as { data?: { message?: string } }).data?.message) ||
				(result.type === 'error' && result.error?.message) ||
				'Erro ao gerar snapshot.';

			snapshotStatus = 'error';
			snapshotError = msg;
			setTimeout(() => {
				snapshotStatus = 'idle';
			}, 2400);
		};
	};

	let autoSnapshot = $state(false);
	let copiedInviteCode = $state<string | null>(null);

	onMount(() => {
		try {
			autoSnapshot = localStorage.getItem('autoSnapshot') === '1';
		} catch {
			autoSnapshot = false;
		}
	});

	const saveAutoSnapshot = (v: boolean) => {
		autoSnapshot = v;
		try {
			localStorage.setItem('autoSnapshot', v ? '1' : '0');
		} catch {
			// noop
		}
	};

	onMount(() => {
		if (!data.class) return;
		if (!autoSnapshot) return;
		if (data.hasTodaySnapshot) return;

		const btn = document.getElementById('autoSnapshotSubmit') as HTMLButtonElement | null;
		if (btn) btn.click();
	});

	const formatMaybe = (n: number | null, decimals = 2) => {
		if (typeof n !== 'number') return '—';
		return n.toFixed(decimals);
	};

	const deltaOf = (row: InsightRow) => {
		if (typeof row.latest_avg !== 'number' || typeof row.baseline_avg !== 'number') return null;
		return row.latest_avg - row.baseline_avg;
	};

	const deltaLabel = (row: InsightRow) => {
		const delta = deltaOf(row);
		if (delta === null) return '—';
		return `${delta > 0 ? '+' : ''}${delta.toFixed(2)}`;
	};

	const formatScaleLabel = (skill: Skill) => {
		if (!data.class) return 'Escala indisponível';
		if (skill.score_min === null) {
			return `Herdando da turma: ${data.class.score_min}–${data.class.score_max} (dec ${data.class.score_decimals})`;
		}
		return `Escala da skill: ${skill.score_min}–${skill.score_max} (dec ${skill.score_decimals})`;
	};

	async function copyInviteCode(code: string | null) {
		if (!code) return;

		try {
			await navigator.clipboard.writeText(code);
			copiedInviteCode = code;
			setTimeout(() => {
				if (copiedInviteCode === code) copiedInviteCode = null;
			}, 1600);
		} catch {
			copiedInviteCode = null;
		}
	}

	const studentIndexOf = (studentId: string) =>
		filteredStudents.findIndex((student: Student) => student.id === studentId);

	const skillIndexOf = (skillId: string) =>
		visibleSkills.findIndex((skill: Skill) => skill.id === skillId);

	const focusCellAt = (studentIndex: number, skillIndex: number) => {
		if (studentIndex < 0 || skillIndex < 0) return;
		if (studentIndex >= filteredStudents.length || skillIndex >= visibleSkills.length) return;

		const student = filteredStudents[studentIndex];
		const skill = visibleSkills[skillIndex];
		if (!student || !skill) return;

		const key = keyOf(student.id, skill.id);
		const input = inputRefs[key];
		if (input) {
			input.focus();
			input.select();
		}
	};

	const submitCell = (studentId: string, skillId: string) => {
		const key = keyOf(studentId, skillId);
		const form = formRefs[key];
		if (form) form.requestSubmit();
	};

	const handleScoreInput = (studentId: string, skillId: string, value: string) => {
		const key = keyOf(studentId, skillId);
		scores = { ...scores, [key]: value };
	};

	const handleGridKeydown = (event: KeyboardEvent, studentId: string, skillId: string) => {
		const studentIndex = studentIndexOf(studentId);
		const skillIndex = skillIndexOf(skillId);

		if (studentIndex === -1 || skillIndex === -1) return;

		if (event.key === 'Enter') {
			event.preventDefault();
			submitCell(studentId, skillId);

			const nextStudentIndex = event.shiftKey ? studentIndex - 1 : studentIndex + 1;
			focusCellAt(nextStudentIndex, skillIndex);
			return;
		}

		if (event.key === 'ArrowRight') {
			event.preventDefault();
			focusCellAt(studentIndex, skillIndex + 1);
			return;
		}

		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			focusCellAt(studentIndex, skillIndex - 1);
			return;
		}

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			focusCellAt(studentIndex + 1, skillIndex);
			return;
		}

		if (event.key === 'ArrowUp') {
			event.preventDefault();
			focusCellAt(studentIndex - 1, skillIndex);
		}
	};

	const handleGridPaste = (event: ClipboardEvent, studentId: string, skillId: string) => {
		const raw = event.clipboardData?.getData('text') ?? '';
		if (!raw.includes('\n') && !raw.includes('\t')) return;

		event.preventDefault();

		const startStudentIndex = studentIndexOf(studentId);
		const startSkillIndex = skillIndexOf(skillId);

		if (startStudentIndex === -1 || startSkillIndex === -1) return;

		const matrix = raw
			.replace(/\r/g, '')
			.split('\n')
			.filter((line: string) => line.length > 0)
			.map((line: string) => line.split('\t'));

		const nextScores = { ...scores };
		const submitQueue: Array<{ studentId: string; skillId: string }> = [];

		for (let rowOffset = 0; rowOffset < matrix.length; rowOffset++) {
			const targetStudent = filteredStudents[startStudentIndex + rowOffset];
			if (!targetStudent) break;

			for (let colOffset = 0; colOffset < matrix[rowOffset].length; colOffset++) {
				const targetSkill = visibleSkills[startSkillIndex + colOffset];
				if (!targetSkill) break;

				const pastedValue = String(matrix[rowOffset][colOffset] ?? '').trim();
				const key = keyOf(targetStudent.id, targetSkill.id);

				nextScores[key] = pastedValue;
				setStatus(key, 'saving');
				submitQueue.push({ studentId: targetStudent.id, skillId: targetSkill.id });
			}
		}

		scores = nextScores;

		queueMicrotask(() => {
			for (const item of submitQueue) {
				submitCell(item.studentId, item.skillId);
			}
		});
	};

	const openLaunchForSkill = (skillId: string) => {
		activeTab = 'launch';
		selectedSkillId = skillId;
		focusMode = false;
	};

	const clearLaunchFilters = () => {
		studentSearch = '';
		statusFilter = 'all';
		sortMode = 'alpha';
		selectedSkillId = '';
	};

	const selectOnlyPending = () => {
		statusFilter = 'pending';
	};

	const selectOnlyRisk = () => {
		statusFilter = 'risk';
	};

	const savingCount = $derived.by(
		(): number => Object.values(status).filter((value) => value === 'saving').length
	);

	const errorCount = $derived.by(
		(): number => Object.values(status).filter((value) => value === 'error').length
	);

	const savedCount = $derived.by(
		(): number => Object.values(status).filter((value) => value === 'saved').length
	);

	const launchFeedbackLabel = $derived.by((): string => {
		if (savingCount > 0) return `Salvando ${savingCount} célula(s)...`;
		if (errorCount > 0) return `${errorCount} célula(s) com erro`;
		if (savedCount > 0) return 'Tudo salvo';
		return 'Sem alterações recentes';
	});

	function healthBadgeClass(health: 'risk' | 'attention' | 'good' | 'pending') {
		if (health === 'risk') return 'border-red-200 bg-red-50 text-red-700';
		if (health === 'attention') return 'border-amber-200 bg-amber-50 text-amber-700';
		if (health === 'good') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
		return 'border-slate-200 bg-slate-100 text-slate-600';
	}

	function toneCellClass(tone: Tone) {
		if (tone === 'risk') return 'bg-red-50';
		if (tone === 'warn') return 'bg-amber-50';
		if (tone === 'good') return 'bg-emerald-50';
		return 'bg-white';
	}

	function toneTextClass(tone: Tone) {
		if (tone === 'risk') return 'text-red-700';
		if (tone === 'warn') return 'text-amber-700';
		if (tone === 'good') return 'text-emerald-700';
		return 'text-slate-500';
	}

	function snapshotChipClass() {
		return data.hasTodaySnapshot
			? 'border-emerald-200 bg-emerald-50 text-emerald-700'
			: 'border-amber-200 bg-amber-50 text-amber-700';
	}

	function tabClass(tab: TabKey) {
		return activeTab === tab
			? 'border-sky-200 bg-sky-50 text-sky-700'
			: 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900';
	}

	function statusFilterClass(filter: LaunchStatusFilter) {
		return statusFilter === filter
			? 'border-slate-300 bg-slate-100 text-slate-900'
			: 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900';
	}
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>

{#if !data.class}
	<section class="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
		<h1 class="text-3xl font-black tracking-tight text-slate-950">Turma não encontrada</h1>
		<p class="mt-3 text-base leading-8 text-slate-600">
			Volte para o dashboard e selecione uma turma válida.
		</p>
		<a href="/teacher" class="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800">
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
						Escala padrão:
						<strong class="text-slate-950">{data.class.score_min}–{data.class.score_max}</strong>
						• dec <strong class="text-slate-950">{data.class.score_decimals}</strong>
					</p>

					<div class="mt-4 flex flex-wrap gap-2">
						<span class={`rounded-full border px-3 py-1.5 text-sm font-bold ${snapshotChipClass()}`}>
							{data.hasTodaySnapshot ? 'Snapshot do dia gerado' : 'Snapshot do dia pendente'}
						</span>

						<span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700">
							Último snapshot: {latestSnapshotDate ? latestSnapshotDate : 'Nunca'}
						</span>

						<span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700">
							Cobertura geral: {gridCoverage}%
						</span>
					</div>
				</div>

				<div class="flex w-full flex-col gap-3 xl:w-90">
					<form method="POST" action="?/generateSnapshot" use:enhance={enhanceSnapshot}>
						<button type="submit" id="autoSnapshotSubmit" class="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800">
							{#if snapshotStatus === 'saving'}
								Gerando snapshot...
							{:else}
								Gerar snapshot
							{/if}
						</button>
					</form>

					<a
						href={`/teacher/import?classId=${data.class.id}`}
						class="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
					>
						Importar notas
					</a>

					<button
						type="button"
						class="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
						onclick={() => {
							activeTab = 'launch';
							focusMode = !focusMode;
						}}
					>
						{focusMode ? 'Sair do focus mode' : 'Focus mode do grid'}
					</button>

					<label class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
						<input
							type="checkbox"
							class="h-4 w-4 rounded border-slate-300"
							checked={autoSnapshot}
							onchange={(e) => saveAutoSnapshot((e.target as HTMLInputElement).checked)}
						/>
						<span class="font-medium">Auto snapshot ao abrir a turma</span>
					</label>
				</div>
			</div>
		</section>

		{#if snapshotStatus === 'error'}
			<div class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
				{snapshotError}
			</div>
		{:else if snapshotStatus === 'saved'}
			<div class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
				Snapshot gerado com sucesso.
			</div>
		{/if}

		<section class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
			<div class="flex flex-wrap gap-2">
				<button
					type="button"
					class={`inline-flex h-11 items-center justify-center rounded-2xl border px-4 text-sm font-bold transition ${tabClass('overview')}`}
					onclick={() => {
						activeTab = 'overview';
						focusMode = false;
					}}
				>
					Visão geral
				</button>

				<button
					type="button"
					class={`inline-flex h-11 items-center justify-center rounded-2xl border px-4 text-sm font-bold transition ${tabClass('launch')}`}
					onclick={() => (activeTab = 'launch')}
				>
					Lançamento
				</button>

				<button
					type="button"
					class={`inline-flex h-11 items-center justify-center rounded-2xl border px-4 text-sm font-bold transition ${tabClass('manage')}`}
					onclick={() => {
						activeTab = 'manage';
						focusMode = false;
					}}
				>
					Cadastros
				</button>
			</div>
		</section>

		{#if activeTab === 'overview'}
			<div class="space-y-6">
				<section class="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
					<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
						<div class="flex items-start justify-between gap-4">
							<div>
								<p class="text-xs font-black uppercase tracking-widest text-slate-500">
									Saúde da turma
								</p>
								<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
									Leitura executiva
								</h2>
							</div>

							<div class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
								Hoje: {data.today}
							</div>
						</div>

						<div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
							<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<p class="text-xs font-black uppercase tracking-widest text-slate-500">Média</p>
								<p class="mt-2 text-3xl font-black text-slate-950">
									{#if insightKpis.classAvg !== null}
										{insightKpis.classAvg.toFixed(2)}
									{:else}
										—
									{/if}
								</p>
								<p class="mt-2 text-sm text-slate-600">Snapshot mais recente</p>
							</div>

							<div class="rounded-2xl border border-red-200 bg-red-50 p-4">
								<p class="text-xs font-black uppercase tracking-widest text-red-700">Risco</p>
								<p class="mt-2 text-3xl font-black text-slate-950">{launchRiskStudentsCount}</p>
								<p class="mt-2 text-sm text-slate-600">Alunos em risco</p>
							</div>

							<div class="rounded-2xl border border-sky-200 bg-sky-50 p-4">
								<p class="text-xs font-black uppercase tracking-widest text-sky-700">Cobertura</p>
								<p class="mt-2 text-3xl font-black text-slate-950">{gridCoverage}%</p>
								<p class="mt-2 text-sm text-slate-600">
									{filledGridCells} de {totalGridCells} células
								</p>
							</div>

							<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<p class="text-xs font-black uppercase tracking-widest text-slate-500">Snapshot</p>
								<p class="mt-2 text-lg font-black text-slate-950">
									{latestSnapshotDate ?? 'Nunca'}
								</p>
								<p class="mt-2 text-sm text-slate-600">
									{data.hasTodaySnapshot ? 'Em dia' : 'Ainda pendente hoje'}
								</p>
							</div>
						</div>
					</section>

					<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
						<p class="text-xs font-black uppercase tracking-widest text-slate-500">
							Próxima melhor ação
						</p>
						<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
							{nextBestAction.title}
						</h2>
						<p class="mt-3 text-sm leading-7 text-slate-600">{nextBestAction.description}</p>

						<div class="mt-5">
							{#if nextBestAction.cta === 'snapshot'}
								<form method="POST" action="?/generateSnapshot" use:enhance={enhanceSnapshot}>
									<button type="submit" class="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800">
										Gerar snapshot
									</button>
								</form>
							{:else if nextBestAction.cta === 'weakest'}
								<button
									type="button"
									class="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800"
									onclick={() =>
										weakestRows[0] ? openLaunchForSkill(weakestRows[0].skill_id) : (activeTab = 'launch')}
								>
									Ver no grid
								</button>
							{:else}
								<button
									type="button"
									class="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800"
									onclick={() => (activeTab = 'launch')}
								>
									Ir para lançamento
								</button>
							{/if}
						</div>
					</section>
				</section>

				<section class="grid gap-6 xl:grid-cols-2">
					<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
						<p class="text-xs font-black uppercase tracking-widest text-slate-500">
							Top lacunas
						</p>
						<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
							Onde agir primeiro
						</h2>

						{#if weakestRows.length > 0}
							<div class="mt-5 space-y-3">
								{#each weakestRows as row}
									<button
										type="button"
										class="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300 hover:bg-white"
										onclick={() => openLaunchForSkill(row.skill_id)}
									>
										<div class="min-w-0">
											<p class="text-base font-black text-slate-950">{row.skill_name}</p>
											<p class="mt-1 text-sm text-slate-600">
												Média atual {formatMaybe(row.latest_avg, 2)} • clique para ver no grid
											</p>
										</div>
										<span class="text-xl font-black text-slate-950">
											{formatMaybe(row.latest_avg, 2)}
										</span>
									</button>
								{/each}
							</div>
						{:else}
							<div class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-600">
								Ainda não há dados suficientes para apontar lacunas.
							</div>
						{/if}
					</section>

					<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
						<p class="text-xs font-black uppercase tracking-widest text-slate-500">
							Top forças
						</p>
						<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
							O que está indo bem
						</h2>

						{#if strongestRows.length > 0}
							<div class="mt-5 space-y-3">
								{#each strongestRows as row}
									<button
										type="button"
										class="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300 hover:bg-white"
										onclick={() => openLaunchForSkill(row.skill_id)}
									>
										<div class="min-w-0">
											<p class="text-base font-black text-slate-950">{row.skill_name}</p>
											<p class="mt-1 text-sm text-slate-600">
												Média atual {formatMaybe(row.latest_avg, 2)} • clique para ver no grid
											</p>
										</div>
										<span class="text-xl font-black text-slate-950">
											{formatMaybe(row.latest_avg, 2)}
										</span>
									</button>
								{/each}
							</div>
						{:else}
							<div class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-600">
								Ainda não há dados suficientes para apontar forças.
							</div>
						{/if}
					</section>
				</section>

				<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
						<div>
							<p class="text-xs font-black uppercase tracking-widest text-slate-500">
								Evolução por skill
							</p>
							<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
								Baseline vs latest
							</h2>
						</div>

						<p class="max-w-xl text-sm leading-7 text-slate-600">
							Use esta tabela para ler tendência, priorizar revisão e identificar quais skills
							pedem intervenção.
						</p>
					</div>

					{#if insightRows.length > 0}
						<div class="mt-5 overflow-auto rounded-2xl border border-slate-200">
							<table class="min-w-full border-separate border-spacing-0">
								<thead>
									<tr class="bg-slate-50 text-left">
										<th class="border-b border-slate-200 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-500">
											Skill
										</th>
										<th class="border-b border-slate-200 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-500">
											Baseline
										</th>
										<th class="border-b border-slate-200 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-500">
											Latest
										</th>
										<th class="border-b border-slate-200 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-500">
											Δ
										</th>
										<th class="border-b border-slate-200 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-500">
											N latest
										</th>
										<th class="border-b border-slate-200 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-500">
											Ação
										</th>
									</tr>
								</thead>
								<tbody>
									{#each orderedInsightRows as r}
										<tr class="bg-white">
											<td class="border-b border-slate-200 px-4 py-4 font-bold text-slate-950">
												{r.skill_name}
											</td>
											<td class="border-b border-slate-200 px-4 py-4 text-sm text-slate-700">
												{#if r.baseline_date}
													<div>{r.baseline_date}</div>
													<div class="mt-1 text-xs text-slate-500">
														avg {formatMaybe(r.baseline_avg, 2)}
													</div>
												{:else}
													—
												{/if}
											</td>
											<td class="border-b border-slate-200 px-4 py-4 text-sm text-slate-700">
												{#if r.latest_date}
													<div>{r.latest_date}</div>
													<div class="mt-1 text-xs text-slate-500">
														avg {formatMaybe(r.latest_avg, 2)}
													</div>
												{:else}
													—
												{/if}
											</td>
											<td class="border-b border-slate-200 px-4 py-4">
												<span
													class={`font-bold ${
														typeof r.latest_avg === 'number' &&
														typeof r.baseline_avg === 'number' &&
														r.latest_avg - r.baseline_avg >= 0
															? 'text-emerald-700'
															: typeof r.latest_avg === 'number' &&
																  typeof r.baseline_avg === 'number' &&
																  r.latest_avg - r.baseline_avg < 0
																? 'text-red-700'
																: 'text-slate-500'
													}`}
												>
													{deltaLabel(r)}
												</span>
											</td>
											<td class="border-b border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700">
												{r.latest_n ?? '—'}
											</td>
											<td class="border-b border-slate-200 px-4 py-4">
												<button
													type="button"
													class="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
													onclick={() => openLaunchForSkill(r.skill_id)}
												>
													Ver no grid
												</button>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{:else}
						<div class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
							<h3 class="text-lg font-black text-slate-950">Nenhum snapshot ainda</h3>
							<p class="mt-2 text-sm leading-7 text-slate-600">
								Gere o primeiro snapshot para começar a comparar evolução por skill.
							</p>
						</div>
					{/if}
				</section>
			</div>
		{/if}

		{#if activeTab === 'launch'}
			<div class="space-y-6">
				<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
						<div>
							<p class="text-xs font-black uppercase tracking-widest text-slate-500">
								Lançamento
							</p>
							<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
								{#if selectedSkillId}
									Grid filtrado por skill
								{:else}
									Grid de notas
								{/if}
							</h2>
						</div>

						<div
							class={`rounded-full border px-4 py-2 text-sm font-bold ${
								errorCount > 0
									? 'border-red-200 bg-red-50 text-red-700'
									: savingCount > 0
										? 'border-sky-200 bg-sky-50 text-sky-700'
										: 'border-emerald-200 bg-emerald-50 text-emerald-700'
							}`}
						>
							{launchFeedbackLabel}
						</div>
					</div>

					<div class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
						<div class="space-y-2">
							<label for="studentSearch" class="block text-sm font-bold text-slate-700">
								Buscar aluno
							</label>
							<input
								id="studentSearch"
								type="text"
								placeholder="Digite um nome..."
								bind:value={studentSearch}
								class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
							/>
						</div>

						<div class="space-y-2">
							<label for="skillFilter" class="block text-sm font-bold text-slate-700">
								Filtrar skill
							</label>
							<select
								id="skillFilter"
								bind:value={selectedSkillId}
								class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
							>
								<option value="">Todas as skills</option>
								{#each data.skills as skill}
									<option value={skill.id}>{skill.name}</option>
								{/each}
							</select>
						</div>

						<div class="space-y-2">
							<label for="statusFilter" class="block text-sm font-bold text-slate-700">
								Status
							</label>
							<select
								id="statusFilter"
								bind:value={statusFilter}
								class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
							>
								<option value="all">Todos</option>
								<option value="risk">Em risco</option>
								<option value="attention">Atenção</option>
								<option value="good">Bom</option>
								<option value="pending">Com pendência</option>
							</select>
						</div>

						<div class="space-y-2">
							<label for="sortMode" class="block text-sm font-bold text-slate-700">
								Ordenar por
							</label>
							<select
								id="sortMode"
								bind:value={sortMode}
								class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
							>
								<option value="alpha">Ordem alfabética</option>
								<option value="lowest">Menor média</option>
								<option value="highest-risk">Maior risco</option>
							</select>
						</div>
					</div>

					<div class="mt-4 flex flex-wrap gap-2">
						<button
							type="button"
							class={`rounded-2xl border px-4 py-2 text-sm font-bold transition ${statusFilterClass('pending')}`}
							onclick={selectOnlyPending}
						>
							Ver só pendências
						</button>

						<button
							type="button"
							class={`rounded-2xl border px-4 py-2 text-sm font-bold transition ${statusFilterClass('risk')}`}
							onclick={selectOnlyRisk}
						>
							Ver só alunos em risco
						</button>

						<button
							type="button"
							class="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
							onclick={() => (focusMode = !focusMode)}
						>
							{focusMode ? 'Sair do focus mode' : 'Expandir grid'}
						</button>

						<button
							type="button"
							class="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
							onclick={clearLaunchFilters}
						>
							Resetar filtros
						</button>
					</div>

					<div class="mt-4 flex flex-wrap gap-2">
						<div class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
							Enter / Shift+Enter navega na coluna
						</div>
						<div class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
							Setas navegam entre células
						</div>
						<div class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
							Cole blocos com tab + quebra de linha
						</div>
					</div>

					<div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
						<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
							<p class="text-xs font-black uppercase tracking-widest text-slate-500">Alunos visíveis</p>
							<p class="mt-2 text-2xl font-black text-slate-950">{filteredStudents.length}</p>
						</div>

						<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
							<p class="text-xs font-black uppercase tracking-widest text-slate-500">Skills visíveis</p>
							<p class="mt-2 text-2xl font-black text-slate-950">{visibleSkills.length}</p>
						</div>

						<div class="rounded-2xl border border-sky-200 bg-sky-50 p-4">
							<p class="text-xs font-black uppercase tracking-widest text-sky-700">Cobertura filtrada</p>
							<p class="mt-2 text-2xl font-black text-slate-950">{filteredCoverage}%</p>
						</div>

						<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
							<p class="text-xs font-black uppercase tracking-widest text-slate-500">Média filtrada</p>
							<p class="mt-2 text-2xl font-black text-slate-950">
								{overallGridAverage(filteredStudents, visibleSkills)}
							</p>
						</div>
					</div>
				</section>

				<section class={`rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ${focusMode ? 'ring-2 ring-sky-100' : ''}`}>
					<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
						<div>
							<p class="text-xs font-black uppercase tracking-widest text-slate-500">
								Operação
							</p>
							<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
								{selectedSkillId
									? `Lançamento focado em ${visibleSkills[0]?.name ?? 'skill'}`
									: 'Lançamento por skill'}
							</h2>
						</div>

						<div class="flex flex-wrap gap-3">
							<span class="inline-flex items-center gap-2 text-sm text-slate-600">
								<i class="h-3 w-3 rounded-full bg-red-200"></i> risco
							</span>
							<span class="inline-flex items-center gap-2 text-sm text-slate-600">
								<i class="h-3 w-3 rounded-full bg-amber-200"></i> atenção
							</span>
							<span class="inline-flex items-center gap-2 text-sm text-slate-600">
								<i class="h-3 w-3 rounded-full bg-emerald-200"></i> bom
							</span>
							<span class="inline-flex items-center gap-2 text-sm text-slate-600">
								<i class="h-3 w-3 rounded-full bg-slate-200"></i> sem dado
							</span>
						</div>
					</div>

					{#if filteredStudents.length === 0 || visibleSkills.length === 0}
						<div class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
							<h3 class="text-lg font-black text-slate-950">Nada para mostrar com o filtro atual</h3>
							<p class="mt-2 text-sm leading-7 text-slate-600">
								Ajuste a busca, o filtro de skill ou o status para voltar a ver o grid.
							</p>
						</div>
					{:else}
						<div class="mt-5 overflow-auto rounded-2xl border border-slate-200">
							<table class="min-w-full border-separate border-spacing-0">
								<thead>
									<tr>
										<th class="sticky left-0 top-0 z-20 min-w-60 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500">
											Aluno
										</th>

										{#each visibleSkills as sk}
											<th class="sticky top-0 z-10 min-w-42.5 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left">
												<div class="text-sm font-black text-slate-950">{sk.name}</div>
												<div class="mt-1 text-xs text-slate-500">
													{effectiveScale(sk.id).min}–{effectiveScale(sk.id).max} • dec
													{effectiveScale(sk.id).decimals}
												</div>
											</th>
										{/each}

										<th class="sticky top-0 z-10 min-w-35 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500">
											Média aluno
										</th>
									</tr>
								</thead>

								<tbody>
									{#each filteredStudents as st}
										<tr>
											<td class="sticky left-0 z-10 border-b border-slate-200 bg-white px-4 py-4">
												<div class="flex items-center justify-between gap-3">
													<strong class="text-sm text-slate-950">{st.name}</strong>
													<span class={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-widest ${healthBadgeClass(studentHealth(st.id, visibleSkills))}`}>
														{studentHealth(st.id, visibleSkills)}
													</span>
												</div>
											</td>

											{#each visibleSkills as sk}
												<td class={`border-b border-slate-200 px-4 py-4 align-top ${toneCellClass(cellTone(sk.id, getScore(st.id, sk.id)))}`}>
													<form
														method="POST"
														action="?/upsertScore"
														use:enhance={enhanceScore}
														use:registerForm={keyOf(st.id, sk.id)}
														class="flex items-center gap-2"
													>
														<input type="hidden" name="studentId" value={st.id} />
														<input type="hidden" name="skillId" value={sk.id} />

														<input
															name="score"
															inputmode="decimal"
															value={getScore(st.id, sk.id)}
															use:registerInput={keyOf(st.id, sk.id)}
															class="h-10 w-full min-w-18.5 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
															oninput={(e) =>
																handleScoreInput(
																	st.id,
																	sk.id,
																	(e.target as HTMLInputElement).value
																)}
															onkeydown={(e) => handleGridKeydown(e, st.id, sk.id)}
															onpaste={(e) => handleGridPaste(e, st.id, sk.id)}
															onblur={(e) => {
																const form = (e.target as HTMLInputElement).form;
																if (form) form.requestSubmit();
															}}
															title={`Escala: ${effectiveScale(sk.id).min}–${effectiveScale(sk.id).max} (dec ${effectiveScale(sk.id).decimals})`}
														/>

														<span class="w-5 shrink-0 text-center text-sm">
															{#if status[keyOf(st.id, sk.id)] === 'saving'}
																⏳
															{:else if status[keyOf(st.id, sk.id)] === 'saved'}
																✅
															{:else if status[keyOf(st.id, sk.id)] === 'error'}
																❌
															{:else}
																&nbsp;
															{/if}
														</span>
													</form>

													{#if status[keyOf(st.id, sk.id)] === 'error'}
														<div class="mt-2 text-xs text-red-700">
															{errorMsg[keyOf(st.id, sk.id)]}
														</div>
													{/if}
												</td>
											{/each}

											<td class={`border-b border-slate-200 px-4 py-4 font-black ${toneTextClass(averageToneByStudent(st.id, visibleSkills))}`}>
												{averageByStudentLabel(st.id, visibleSkills)}
											</td>
										</tr>
									{/each}

									<tr class="bg-slate-50">
										<td class="sticky left-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-4 font-black text-slate-950">
											Média
										</td>

										{#each visibleSkills as sk}
											<td class={`border-b border-slate-200 px-4 py-4 font-black ${toneTextClass(averageTone(sk.id, filteredStudents))}`}>
												{averageBySkill(sk.id, filteredStudents)}
											</td>
										{/each}

										<td class="border-b border-slate-200 px-4 py-4 font-black text-slate-950">
											{overallGridAverage(filteredStudents, visibleSkills)}
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					{/if}
				</section>
			</div>
		{/if}

		{#if activeTab === 'manage'}
			<div class="space-y-6">
				<section class="grid gap-6 xl:grid-cols-2">
					<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
						<p class="text-xs font-black uppercase tracking-widest text-slate-500">
							Alunos
						</p>
						<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
							Cadastro e acessos
						</h2>

						<form method="POST" action="?/createStudent" class="mt-5 space-y-3">
							<input
								name="name"
								placeholder="Nome do aluno"
								class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
							/>
							<button type="submit" class="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800">
								Adicionar aluno
							</button>
						</form>

						<p class="mt-4 text-sm leading-7 text-slate-600">
							Cada aluno recebe um <strong class="text-slate-950">código de convite</strong> para
							criar a própria conta no portal.
						</p>

						{#if data.students.length > 0}
							<div class="mt-5 space-y-3">
								{#each data.students as s}
									<article class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
										<div class="min-w-0">
											<p class="text-base font-black text-slate-950">{s.name}</p>
											<div class="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
												<span class="text-[11px] font-black uppercase tracking-widest text-slate-500">
													Invite code
												</span>
												<code class="rounded-lg bg-white px-2 py-1 font-bold text-slate-900">
													{s.invite_code ?? '—'}
												</code>
											</div>
										</div>

										<button
											type="button"
											class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
											disabled={!s.invite_code}
											onclick={() => copyInviteCode(s.invite_code)}
										>
											{copiedInviteCode === s.invite_code && s.invite_code ? 'Copiado!' : 'Copiar'}
										</button>
									</article>
								{/each}
							</div>
						{:else}
							<div class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
								Nenhum aluno cadastrado ainda.
							</div>
						{/if}
					</section>

					<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
						<p class="text-xs font-black uppercase tracking-widest text-slate-500">
							Skills
						</p>
						<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
							Catálogo da turma
						</h2>

						<form method="POST" action="?/createSkill" class="mt-5 space-y-3">
							<input
								name="name"
								placeholder="Nome da skill"
								class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
							/>
							<button type="submit" class="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800">
								Criar skill
							</button>
						</form>

						{#if data.skills.length === 0}
							<div class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
								Nenhuma skill ainda.
							</div>
						{:else}
							<div class="mt-5 space-y-3">
								{#each data.skills as sk}
									<article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
										<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
											<div class="min-w-0">
												<p class="text-base font-black text-slate-950">{sk.name}</p>
												<p class="mt-1 text-sm leading-6 text-slate-600">
													{formatScaleLabel(sk)}
												</p>
											</div>

											<div class="flex flex-wrap gap-2">
												<button
													type="button"
													class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
													onclick={() => toggleEditingScale(sk.id)}
												>
													{editingScale[sk.id] ? 'Fechar' : 'Editar escala'}
												</button>

												<form method="POST" action="?/deleteSkill">
													<input type="hidden" name="skillId" value={sk.id} />
													<button
														type="submit"
														class="inline-flex h-11 items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-700 transition hover:bg-red-100"
														onclick={confirmDeleteSkill}
													>
														Deletar
													</button>
												</form>
											</div>
										</div>

										{#if editingScale[sk.id]}
											<div class="mt-4 border-t border-slate-200 pt-4">
												<form method="POST" action="?/updateSkillScale" class="space-y-4">
													<input type="hidden" name="skillId" value={sk.id} />

													<div class="flex flex-wrap gap-4 text-sm text-slate-700">
														<label class="inline-flex items-center gap-2">
															<input
																type="radio"
																name="mode"
																value="inherit"
																checked={sk.score_min === null}
															/>
															Herdar da turma
														</label>

														<label class="inline-flex items-center gap-2">
															<input
																type="radio"
																name="mode"
																value="custom"
																checked={sk.score_min !== null}
															/>
															Customizar
														</label>
													</div>

													<div class="grid gap-3 sm:grid-cols-3">
														<label class="space-y-2 text-sm font-bold text-slate-700">
															<span>Min</span>
															<input
																name="score_min"
																type="number"
																step="any"
																value={sk.score_min ?? data.class.score_min}
																class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
															/>
														</label>

														<label class="space-y-2 text-sm font-bold text-slate-700">
															<span>Max</span>
															<input
																name="score_max"
																type="number"
																step="any"
																value={sk.score_max ?? data.class.score_max}
																class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
															/>
														</label>

														<label class="space-y-2 text-sm font-bold text-slate-700">
															<span>Dec</span>
															<input
																name="score_decimals"
																type="number"
																min="0"
																max="6"
																value={sk.score_decimals ?? data.class.score_decimals}
																class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
															/>
														</label>
													</div>

													<button
														type="submit"
														class="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800"
													>
														Salvar escala
													</button>
												</form>
											</div>
										{/if}
									</article>
								{/each}
							</div>
						{/if}
					</section>
				</section>

				<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<p class="text-xs font-black uppercase tracking-widest text-slate-500">
						Configuração da turma
					</p>
					<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
						Ações rápidas
					</h2>

					<div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
						<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
							<p class="text-xs font-black uppercase tracking-widest text-slate-500">
								Status do snapshot
							</p>
							<p class="mt-2 text-xl font-black text-slate-950">
								{data.hasTodaySnapshot ? 'Em dia' : 'Pendente hoje'}
							</p>
						</div>

						<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
							<p class="text-xs font-black uppercase tracking-widest text-slate-500">
								Auto snapshot
							</p>
							<p class="mt-2 text-xl font-black text-slate-950">
								{autoSnapshot ? 'Ativado' : 'Desativado'}
							</p>
						</div>

						<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
							<p class="text-xs font-black uppercase tracking-widest text-slate-500">Alunos</p>
							<p class="mt-2 text-xl font-black text-slate-950">{data.students.length}</p>
						</div>

						<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
							<p class="text-xs font-black uppercase tracking-widest text-slate-500">Skills</p>
							<p class="mt-2 text-xl font-black text-slate-950">{data.skills.length}</p>
						</div>
					</div>
				</section>
			</div>
		{/if}
	</div>
{/if}