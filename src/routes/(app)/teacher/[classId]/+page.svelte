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

	export let data: {
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

	const emptyKpis: InsightKpis = {
		classAvg: null,
		criticalSkill: null,
		strongSkill: null
	};

	$: pageTitle = data.class
		? `${data.class.name} • Class Insights`
		: 'Turma não encontrada • Class Insights';

	$: insightRows = data.insights?.rows ?? [];
	$: insightKpis = data.insights?.kpis ?? emptyKpis;

	$: weakestRows = [...insightRows]
		.filter((r) => typeof r.latest_avg === 'number')
		.sort((a, b) => (a.latest_avg ?? 0) - (b.latest_avg ?? 0))
		.slice(0, 3);

	$: strongestRows = [...insightRows]
		.filter((r) => typeof r.latest_avg === 'number')
		.sort((a, b) => (b.latest_avg ?? 0) - (a.latest_avg ?? 0))
		.slice(0, 3);

	$: orderedInsightRows = [...insightRows].sort((a, b) => {
		const aVal = a.latest_avg ?? Number.POSITIVE_INFINITY;
		const bVal = b.latest_avg ?? Number.POSITIVE_INFINITY;
		return aVal - bVal;
	});

	const keyOf = (studentId: string, skillId: string) => `${studentId}:${skillId}`;

	let scores: Record<string, string> = Object.fromEntries(
		data.scores.map((s) => [keyOf(s.student_id, s.skill_id), String(s.score)])
	);

	let status: Record<string, 'idle' | 'saving' | 'saved' | 'error'> = {};
	let errorMsg: Record<string, string> = {};

	const formRefs: Record<string, HTMLFormElement | null> = {};
	const inputRefs: Record<string, HTMLInputElement | null> = {};

	const getScore = (studentId: string, skillId: string) => scores[keyOf(studentId, skillId)] ?? '';

	const setStatus = (k: string, s: 'idle' | 'saving' | 'saved' | 'error', msg = '') => {
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
				(result.type === 'failure' && (result as { data?: { message?: string } }).data?.message) ||
				(result.type === 'error' && result.error?.message) ||
				'Erro ao salvar.';

			setStatus(k, 'error', msg);
			setTimeout(() => setStatus(k, 'idle'), 2200);
		};
	};

	const effectiveScale = (skillId: string) => {
		const sk = data.skills.find((x) => x.id === skillId);
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

	const cellTone = (skillId: string, raw: string) => {
		if (!raw.trim()) return 'empty';

		const ratio = ratioFor(skillId, raw);
		if (ratio === null) return 'empty';

		if (ratio < 0.4) return 'risk';
		if (ratio < 0.7) return 'warn';
		return 'good';
	};

	const allSkills = () => data.skills;

	let activeTab: TabKey = 'overview';
	let focusMode = false;
	let studentSearch = '';
	let statusFilter: LaunchStatusFilter = 'all';
	let sortMode: LaunchSortMode = 'alpha';
	let selectedSkillId: string | null = null;

	$: visibleSkills =
		selectedSkillId && data.skills.some((skill) => skill.id === selectedSkillId)
			? data.skills.filter((skill) => skill.id === selectedSkillId)
			: data.skills;

	const getStudentSkillEntries = (studentId: string, skillsList = visibleSkills) =>
		skillsList.map((skill) => ({
			skill,
			raw: getScore(studentId, skill.id),
			numeric: toNumber(getScore(studentId, skill.id)),
			percent: scorePercentFor(skill.id, getScore(studentId, skill.id))
		}));

	const studentAverageRaw = (studentId: string, skillsList = visibleSkills) => {
		const values = getStudentSkillEntries(studentId, skillsList)
			.map((entry) => entry.numeric)
			.filter((v): v is number => v !== null);

		if (values.length === 0) return null;

		const decimals = data.class?.score_decimals ?? 0;
		const avg = values.reduce((a, b) => a + b, 0) / values.length;
		return Number(avg.toFixed(decimals));
	};

	const studentAveragePercent = (studentId: string, skillsList = visibleSkills) => {
		const values = getStudentSkillEntries(studentId, skillsList)
			.map((entry) => entry.percent)
			.filter((v): v is number => typeof v === 'number');

		if (values.length === 0) return null;

		return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
	};

	const studentHasPending = (studentId: string, skillsList = visibleSkills) =>
		getStudentSkillEntries(studentId, skillsList).some((entry) => entry.raw.trim().length === 0);

	const studentHealth = (
		studentId: string,
		skillsList = visibleSkills
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

	const sortStudents = (students: Student[]) => {
		const next = [...students];

		if (sortMode === 'alpha') {
			next.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
			return next;
		}

		if (sortMode === 'lowest') {
			next.sort((a, b) => {
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

		next.sort((a, b) => {
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

	$: filteredStudents = sortStudents(
		data.students.filter((student) => matchesSearch(student) && matchesStatusFilter(student.id))
	);

	const averageBySkill = (skillId: string, studentsList = filteredStudents) => {
		const values = studentsList
			.map((student) => toNumber(getScore(student.id, skillId)))
			.filter((v): v is number => v !== null);

		if (values.length === 0) return '-';

		const sc = effectiveScale(skillId);
		const avg = values.reduce((a, b) => a + b, 0) / values.length;
		return avg.toFixed(sc.decimals);
	};

	const averageTone = (skillId: string, studentsList = filteredStudents) => {
		const avg = averageBySkill(skillId, studentsList);
		if (avg === '-') return 'empty';
		return cellTone(skillId, avg);
	};

	const averageByStudentLabel = (studentId: string, skillsList = visibleSkills) => {
		const avg = studentAverageRaw(studentId, skillsList);
		if (avg === null) return '-';
		return avg.toFixed(data.class?.score_decimals ?? 0);
	};

	const averageToneByStudent = (studentId: string, skillsList = visibleSkills) => {
		const health = studentHealth(studentId, skillsList);
		if (health === 'risk') return 'risk';
		if (health === 'attention') return 'warn';
		if (health === 'good') return 'good';
		return 'empty';
	};

	const overallGridAverage = (studentsList = filteredStudents, skillsList = visibleSkills) => {
		const values = studentsList
			.flatMap((student) =>
				skillsList
					.map((skill) => toNumber(getScore(student.id, skill.id)))
					.filter((v): v is number => v !== null)
			);

		if (values.length === 0) return '—';

		const decimals = data.class?.score_decimals ?? 0;
		const avg = values.reduce((a, b) => a + b, 0) / values.length;
		return avg.toFixed(decimals);
	};

	$: totalGridCells = data.students.length * data.skills.length;
	$: filledGridCells = Object.values(scores).filter((value) => toNumber(value) !== null).length;
	$: gridCoverage = totalGridCells > 0 ? Math.round((filledGridCells / totalGridCells) * 100) : 0;

	$: filteredGridCells = filteredStudents.length * visibleSkills.length;
	$: filteredFilledGridCells = filteredStudents.reduce((sum, student) => {
		return (
			sum +
			visibleSkills.filter((skill) => {
				const numeric = toNumber(getScore(student.id, skill.id));
				return numeric !== null;
			}).length
		);
	}, 0);

	$: filteredCoverage =
		filteredGridCells > 0 ? Math.round((filteredFilledGridCells / filteredGridCells) * 100) : 0;

	$: launchRiskStudentsCount = data.students.filter(
		(student) => studentHealth(student.id, allSkills()) === 'risk'
	).length;

	$: launchPendingStudentsCount = data.students.filter((student) =>
		studentHasPending(student.id, allSkills())
	).length;

	$: latestSnapshotDate =
		insightRows
			.map((row) => row.latest_date)
			.filter((value): value is string => typeof value === 'string')
			.sort((a, b) => a.localeCompare(b))
			.at(-1) ?? null;

	$: nextBestAction = !data.hasTodaySnapshot
		? {
				title: 'Gerar snapshot da turma',
				description: 'Você ainda não gerou o snapshot de hoje. Isso mantém a evolução auditável.',
				cta: 'Gerar snapshot'
			}
		: launchPendingStudentsCount > 0
			? {
					title: 'Completar lançamentos pendentes',
					description: `${launchPendingStudentsCount} aluno(s) ainda têm células em aberto no grid.`,
					cta: 'Ir para lançamento'
				}
			: weakestRows.length > 0
				? {
						title: `Revisar ${weakestRows[0].skill_name}`,
						description: 'Esta skill aparece como a lacuna mais crítica da turma neste momento.',
						cta: 'Ver no grid'
					}
				: {
						title: 'Turma está estável',
						description: 'Sem alerta crítico imediato. Você pode seguir com novas avaliações.',
						cta: 'Abrir lançamento'
					};

	let editingScale: Record<string, boolean> = {};

	const toggleEditingScale = (skillId: string) => {
		editingScale = { ...editingScale, [skillId]: !editingScale[skillId] };
	};

	const confirmDeleteSkill = (e: MouseEvent) => {
		if (!confirm('Deletar skill? Isso remove os scores dela.')) {
			e.preventDefault();
		}
	};

	let snapshotStatus: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
	let snapshotError = '';

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
				(result.type === 'failure' && (result as { data?: { message?: string } }).data?.message) ||
				(result.type === 'error' && result.error?.message) ||
				'Erro ao gerar snapshot.';

			snapshotStatus = 'error';
			snapshotError = msg;
			setTimeout(() => (snapshotStatus = 'idle'), 2400);
		};
	};

	let autoSnapshot = false;
	let copiedInviteCode: string | null = null;

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
		} catch {}
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

	const studentIndexOf = (studentId: string) => filteredStudents.findIndex((s) => s.id === studentId);
	const skillIndexOf = (skillId: string) => visibleSkills.findIndex((s) => s.id === skillId);

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
			.filter((line) => line.length > 0)
			.map((line) => line.split('\t'));

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
		selectedSkillId = null;
	};

	const selectOnlyPending = () => {
		statusFilter = 'pending';
	};

	const selectOnlyRisk = () => {
		statusFilter = 'risk';
	};

	$: savingCount = Object.values(status).filter((value) => value === 'saving').length;
	$: errorCount = Object.values(status).filter((value) => value === 'error').length;
	$: savedCount = Object.values(status).filter((value) => value === 'saved').length;

	$: launchFeedbackLabel =
		savingCount > 0
			? `Salvando ${savingCount} célula(s)...`
			: errorCount > 0
				? `${errorCount} célula(s) com erro`
				: savedCount > 0
					? 'Tudo salvo'
					: 'Sem alterações recentes';
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>

{#if !data.class}
	<section class="empty-page">
		<h1>Turma não encontrada</h1>
		<p>Volte para o dashboard e selecione uma turma válida.</p>
		<a href="/teacher" class="primary-button">Voltar ao dashboard</a>
	</section>
{:else}
	<section class="hero">
		<div class="hero-copy">
			<div class="eyebrow">Turma</div>
			<h1>{data.class.name}</h1>
			<p>
				Escala padrão da turma:
				<strong>{data.class.score_min}–{data.class.score_max}</strong>
				(decimais: <strong>{data.class.score_decimals}</strong>)
			</p>

			<div class="hero-inline-meta">
				<span class={`snapshot-chip ${data.hasTodaySnapshot ? 'ok' : 'warn'}`}>
					{data.hasTodaySnapshot ? 'Snapshot de hoje: sim' : 'Snapshot de hoje: não'}
				</span>

				{#if latestSnapshotDate}
					<span class="meta-chip">Último snapshot: {latestSnapshotDate}</span>
				{/if}

				<span class="meta-chip">Cobertura geral: {gridCoverage}%</span>
			</div>
		</div>

		<div class="hero-actions">
			<form method="POST" action="?/generateSnapshot" use:enhance={enhanceSnapshot}>
				<button type="submit" id="autoSnapshotSubmit" class="primary-button">
					{#if snapshotStatus === 'saving'}
						Gerando snapshot…
					{:else}
						Gerar snapshot
					{/if}
				</button>
			</form>

			<a href={`/teacher/import?classId=${data.class.id}`} class="secondary-button">
				Importar notas
			</a>

			<button
				type="button"
				class="secondary-button"
				onclick={() => {
					activeTab = 'launch';
					focusMode = !focusMode;
				}}
			>
				{focusMode ? 'Sair do focus mode' : 'Focus mode do grid'}
			</button>

			<label class="toggle-card">
				<input
					type="checkbox"
					checked={autoSnapshot}
					onchange={(e) => saveAutoSnapshot((e.target as HTMLInputElement).checked)}
				/>
				<span>Auto snapshot ao abrir a turma</span>
			</label>
		</div>
	</section>

	{#if snapshotStatus === 'error'}
		<div class="feedback error">{snapshotError}</div>
	{:else if snapshotStatus === 'saved'}
		<div class="feedback success">Snapshot gerado com sucesso.</div>
	{/if}

	<section class="tabs-panel">
		<div class="tabs">
			<button
				type="button"
				class:active={activeTab === 'overview'}
				onclick={() => {
					activeTab = 'overview';
					focusMode = false;
				}}
			>
				Visão geral
			</button>

			<button
				type="button"
				class:active={activeTab === 'launch'}
				onclick={() => (activeTab = 'launch')}
			>
				Lançamento
			</button>

			<button
				type="button"
				class:active={activeTab === 'manage'}
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
		<section class="section-stack">
			<section class="panel">
				<div class="panel-head">
					<div>
						<div class="section-kicker">Saúde da turma</div>
						<h2>Leitura executiva</h2>
					</div>
					<p>
						Esta área responde rapidamente como a turma está, onde estão as lacunas e qual é a
						próxima melhor ação.
					</p>
				</div>

				<div class="stats-grid">
					<article class="stat-card">
						<div class="stat-label">Média da turma</div>
						<div class="stat-value">
							{#if insightKpis.classAvg !== null}
								{insightKpis.classAvg.toFixed(2)}
							{:else}
								—
							{/if}
						</div>
						<div class="stat-foot">Baseada no snapshot mais recente por skill</div>
					</article>

					<article class="stat-card">
						<div class="stat-label">Alunos em risco</div>
						<div class="stat-value">{launchRiskStudentsCount}</div>
						<div class="stat-foot">Considerando a média percentual geral da turma</div>
					</article>

					<article class="stat-card">
						<div class="stat-label">Cobertura de lançamento</div>
						<div class="stat-value">{gridCoverage}%</div>
						<div class="stat-foot">{filledGridCells} de {totalGridCells} células preenchidas</div>
					</article>

					<article class="stat-card">
						<div class="stat-label">Último snapshot</div>
						<div class="stat-value small">{latestSnapshotDate ?? 'Nunca'}</div>
						<div class="stat-foot">
							{data.hasTodaySnapshot ? 'Snapshot do dia já gerado' : 'Ainda não gerado hoje'}
						</div>
					</article>
				</div>
			</section>

			<section class="panel next-action-panel">
				<div class="panel-head compact">
					<div>
						<div class="section-kicker">Próxima melhor ação</div>
						<h2>{nextBestAction.title}</h2>
					</div>
				</div>

				<div class="next-action-box">
					<p>{nextBestAction.description}</p>

					{#if nextBestAction.cta === 'Gerar snapshot'}
						<form method="POST" action="?/generateSnapshot" use:enhance={enhanceSnapshot}>
							<button type="submit" class="primary-button">Gerar snapshot</button>
						</form>
					{:else if nextBestAction.cta === 'Ver no grid'}
						<button
							type="button"
							class="primary-button"
							onclick={() =>
								weakestRows[0] ? openLaunchForSkill(weakestRows[0].skill_id) : (activeTab = 'launch')}
						>
							Ver no grid
						</button>
					{:else}
						<button type="button" class="primary-button" onclick={() => (activeTab = 'launch')}>
							Ir para lançamento
						</button>
					{/if}
				</div>
			</section>

			<section class="overview-two-col">
				<section class="panel">
					<div class="panel-head compact">
						<div>
							<div class="section-kicker">Top lacunas</div>
							<h2>Onde agir primeiro</h2>
						</div>
					</div>

					{#if weakestRows.length > 0}
						<div class="bucket-list">
							{#each weakestRows as row}
								<button type="button" class="bucket-item action-row" onclick={() => openLaunchForSkill(row.skill_id)}>
									<div>
										<strong>{row.skill_name}</strong>
										<p>Latest avg {formatMaybe(row.latest_avg, 2)} • Clique para ver no grid</p>
									</div>
									<span>{formatMaybe(row.latest_avg, 2)}</span>
								</button>
							{/each}
						</div>
					{:else}
						<div class="empty-state compact">
							<p>Ainda não há dados suficientes para apontar lacunas.</p>
						</div>
					{/if}
				</section>

				<section class="panel">
					<div class="panel-head compact">
						<div>
							<div class="section-kicker">Top forças</div>
							<h2>O que está indo bem</h2>
						</div>
					</div>

					{#if strongestRows.length > 0}
						<div class="bucket-list">
							{#each strongestRows as row}
								<button type="button" class="bucket-item action-row" onclick={() => openLaunchForSkill(row.skill_id)}>
									<div>
										<strong>{row.skill_name}</strong>
										<p>Latest avg {formatMaybe(row.latest_avg, 2)} • Clique para ver no grid</p>
									</div>
									<span>{formatMaybe(row.latest_avg, 2)}</span>
								</button>
							{/each}
						</div>
					{:else}
						<div class="empty-state compact">
							<p>Ainda não há dados suficientes para apontar forças.</p>
						</div>
					{/if}
				</section>
			</section>

			<section class="panel">
				<div class="panel-head">
					<div>
						<div class="section-kicker">Evolução por skill</div>
						<h2>Baseline vs latest</h2>
					</div>
					<p>
						Use esta tabela para ler tendência, priorizar revisão e identificar quais skills
						precisam de intervenção.
					</p>
				</div>

				{#if insightRows.length > 0}
					<div class="table-shell">
						<table class="insight-table">
							<thead>
								<tr>
									<th>Skill</th>
									<th>Baseline</th>
									<th>Latest</th>
									<th>Δ</th>
									<th>N latest</th>
									<th>Ação</th>
								</tr>
							</thead>
							<tbody>
								{#each orderedInsightRows as r}
									<tr>
										<td class="skill-name-cell">{r.skill_name}</td>
										<td>
											{#if r.baseline_date}
												<div>{r.baseline_date}</div>
												<div class="subtle">avg {formatMaybe(r.baseline_avg, 2)}</div>
											{:else}
												—
											{/if}
										</td>
										<td>
											{#if r.latest_date}
												<div>{r.latest_date}</div>
												<div class="subtle">avg {formatMaybe(r.latest_avg, 2)}</div>
											{:else}
												—
											{/if}
										</td>
										<td>
											<span
												class:positive={
													typeof r.latest_avg === 'number' &&
													typeof r.baseline_avg === 'number' &&
													r.latest_avg - r.baseline_avg >= 0
												}
												class:negative={
													typeof r.latest_avg === 'number' &&
													typeof r.baseline_avg === 'number' &&
													r.latest_avg - r.baseline_avg < 0
												}
											>
												{deltaLabel(r)}
											</span>
										</td>
										<td>{r.latest_n ?? '—'}</td>
										<td>
											<button type="button" class="table-action" onclick={() => openLaunchForSkill(r.skill_id)}>
												Ver no grid
											</button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<div class="empty-state">
						<h3>Nenhum snapshot ainda</h3>
						<p>Gere o primeiro snapshot para começar a comparar evolução por skill.</p>
					</div>
				{/if}
			</section>
		</section>
	{/if}

	{#if activeTab === 'launch'}
		<section class="section-stack">
			<section class="panel launch-toolbar-panel">
				<div class="panel-head">
					<div>
						<div class="section-kicker">Lançamento</div>
						<h2>
							{#if selectedSkillId}
								Grid filtrado por skill
							{:else}
								Grid de notas
							{/if}
						</h2>
					</div>

					<div class={`save-feedback ${errorCount > 0 ? 'error' : savingCount > 0 ? 'saving' : 'ok'}`}>
						{launchFeedbackLabel}
					</div>
				</div>

				<div class="toolbar-grid">
					<div class="field">
						<label for="studentSearch">Buscar aluno</label>
						<input
							id="studentSearch"
							type="text"
							placeholder="Digite um nome..."
							bind:value={studentSearch}
						/>
					</div>

					<div class="field">
						<label for="skillFilter">Filtrar skill</label>
						<select
							id="skillFilter"
							bind:value={selectedSkillId}
						>
							<option value={null}>Todas as skills</option>
							{#each data.skills as skill}
								<option value={skill.id}>{skill.name}</option>
							{/each}
						</select>
					</div>

					<div class="field">
						<label for="statusFilter">Status</label>
						<select id="statusFilter" bind:value={statusFilter}>
							<option value="all">Todos</option>
							<option value="risk">Em risco</option>
							<option value="attention">Atenção</option>
							<option value="good">Bom</option>
							<option value="pending">Com pendência</option>
						</select>
					</div>

					<div class="field">
						<label for="sortMode">Ordenar por</label>
						<select id="sortMode" bind:value={sortMode}>
							<option value="alpha">Ordem alfabética</option>
							<option value="lowest">Menor média</option>
							<option value="highest-risk">Maior risco</option>
						</select>
					</div>
				</div>

				<div class="launch-chips">
					<button type="button" class="chip-button" onclick={selectOnlyPending}>
						Ver só pendências
					</button>

					<button type="button" class="chip-button" onclick={selectOnlyRisk}>
						Ver só alunos em risco
					</button>

					<button type="button" class="chip-button" onclick={() => (focusMode = !focusMode)}>
						{focusMode ? 'Sair do focus mode' : 'Expandir grid'}
					</button>

					<button type="button" class="chip-button" onclick={clearLaunchFilters}>
						Resetar filtros
					</button>
				</div>

				<div class="grid-helper">
					<div class="helper-chip">Enter / Shift+Enter navega na coluna</div>
					<div class="helper-chip">Setas navegam entre células</div>
					<div class="helper-chip">Cole blocos com tab + quebra de linha</div>
				</div>

				<div class="launch-summary-row">
					<div class="launch-summary-box">
						<span>Alunos visíveis</span>
						<strong>{filteredStudents.length}</strong>
					</div>

					<div class="launch-summary-box">
						<span>Skills visíveis</span>
						<strong>{visibleSkills.length}</strong>
					</div>

					<div class="launch-summary-box">
						<span>Cobertura filtrada</span>
						<strong>{filteredCoverage}%</strong>
					</div>

					<div class="launch-summary-box">
						<span>Média filtrada</span>
						<strong>{overallGridAverage(filteredStudents, visibleSkills)}</strong>
					</div>
				</div>
			</section>

			<section class={`panel grid-panel ${focusMode ? 'focus' : ''}`}>
				<div class="panel-head">
					<div>
						<div class="section-kicker">Operação</div>
						<h2>
							{selectedSkillId
								? `Lançamento focado em ${visibleSkills[0]?.name ?? 'skill'}`
								: 'Lançamento por skill'}
						</h2>
					</div>

					<div class="legend">
						<span class="legend-item"><i class="tone risk"></i> risco</span>
						<span class="legend-item"><i class="tone warn"></i> atenção</span>
						<span class="legend-item"><i class="tone good"></i> bom</span>
						<span class="legend-item"><i class="tone empty"></i> sem dado</span>
					</div>
				</div>

				{#if filteredStudents.length === 0 || visibleSkills.length === 0}
					<div class="empty-state">
						<h3>Nada para mostrar com o filtro atual</h3>
						<p>Ajuste a busca, o filtro de skill ou o status para voltar a ver o grid.</p>
					</div>
				{:else}
					<div class="grid-shell">
						<table class="score-grid">
							<thead>
								<tr>
									<th class="sticky-col sticky-header student-col">Aluno</th>
									{#each visibleSkills as sk}
										<th class="sticky-header skill-col">
											<div class="col-head">{sk.name}</div>
											<div class="col-subtle">
												{effectiveScale(sk.id).min}–{effectiveScale(sk.id).max} • dec
												{effectiveScale(sk.id).decimals}
											</div>
										</th>
									{/each}
									<th class="sticky-header avg-col">Média aluno</th>
								</tr>
							</thead>

							<tbody>
								{#each filteredStudents as st}
									<tr>
										<td class="sticky-col student-cell">
											<div class="student-main">
												<strong>{st.name}</strong>
												<span class={`student-state ${studentHealth(st.id, visibleSkills)}`}>
													{studentHealth(st.id, visibleSkills)}
												</span>
											</div>
										</td>

										{#each visibleSkills as sk}
											<td class={`score-cell tone-${cellTone(sk.id, getScore(st.id, sk.id))}`}>
												<form
													method="POST"
													action="?/upsertScore"
													use:enhance={enhanceScore}
													use:registerForm={keyOf(st.id, sk.id)}
													class="score-form"
												>
													<input type="hidden" name="studentId" value={st.id} />
													<input type="hidden" name="skillId" value={sk.id} />

													<input
														name="score"
														inputmode="decimal"
														value={getScore(st.id, sk.id)}
														use:registerInput={keyOf(st.id, sk.id)}
														class="score-input"
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

													<span class="status-chip" aria-live="polite">
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
													<div class="cell-error">{errorMsg[keyOf(st.id, sk.id)]}</div>
												{/if}
											</td>
										{/each}

										<td class={`student-average tone-${averageToneByStudent(st.id, visibleSkills)}`}>
											{averageByStudentLabel(st.id, visibleSkills)}
										</td>
									</tr>
								{/each}

								<tr class="average-row">
									<td class="sticky-col average-label">Média</td>
									{#each visibleSkills as sk}
										<td class={`average-cell tone-${averageTone(sk.id, filteredStudents)}`}>
											{averageBySkill(sk.id, filteredStudents)}
										</td>
									{/each}
									<td class="average-cell overall-average-cell">
										{overallGridAverage(filteredStudents, visibleSkills)}
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				{/if}
			</section>
		</section>
	{/if}

	{#if activeTab === 'manage'}
		<section class="section-stack">
			<section class="manage-grid">
				<section class="panel">
					<div class="panel-head compact">
						<div>
							<div class="section-kicker">Alunos</div>
							<h2>Cadastro e acessos</h2>
						</div>
					</div>

					<form method="POST" action="?/createStudent" class="stack-form">
						<input name="name" placeholder="Nome do aluno" />
						<button type="submit" class="primary-button">Adicionar aluno</button>
					</form>

					<p class="invite-help">
						Cada aluno recebe um <strong>código de convite</strong> para criar a própria conta no
						portal.
					</p>

					{#if data.students.length > 0}
						<div class="compact-list">
							{#each data.students as s}
								<article class="compact-item">
									<div class="compact-item-main">
										<strong>{s.name}</strong>
										<div class="compact-subline">
											<span class="invite-label-inline">Invite code</span>
											<code>{s.invite_code ?? '—'}</code>
										</div>
									</div>

									<button
										type="button"
										class="secondary-button compact-copy"
										disabled={!s.invite_code}
										onclick={() => copyInviteCode(s.invite_code)}
									>
										{copiedInviteCode === s.invite_code && s.invite_code ? 'Copiado!' : 'Copiar'}
									</button>
								</article>
							{/each}
						</div>
					{:else}
						<p class="subtle-text">Nenhum aluno cadastrado ainda.</p>
					{/if}
				</section>

				<section class="panel">
					<div class="panel-head compact">
						<div>
							<div class="section-kicker">Skills</div>
							<h2>Catálogo da turma</h2>
						</div>
					</div>

					<form method="POST" action="?/createSkill" class="stack-form">
						<input name="name" placeholder="Nome da skill" />
						<button type="submit" class="primary-button">Criar skill</button>
					</form>

					{#if data.skills.length === 0}
						<p class="subtle-text">Nenhuma skill ainda.</p>
					{:else}
						<div class="compact-list skills-list">
							{#each data.skills as sk}
								<article class="skill-manage-item">
									<div class="skill-manage-head">
										<div>
											<strong>{sk.name}</strong>
											<p>{formatScaleLabel(sk)}</p>
										</div>

										<div class="skill-manage-actions">
											<button
												type="button"
												class="secondary-button compact-action"
												onclick={() => toggleEditingScale(sk.id)}
											>
												{editingScale[sk.id] ? 'Fechar' : 'Editar escala'}
											</button>

											<form method="POST" action="?/deleteSkill">
												<input type="hidden" name="skillId" value={sk.id} />
												<button type="submit" class="danger-button compact-action" onclick={confirmDeleteSkill}>
													Deletar
												</button>
											</form>
										</div>
									</div>

									{#if editingScale[sk.id]}
										<div class="scale-box">
											<form method="POST" action="?/updateSkillScale" class="scale-form">
												<input type="hidden" name="skillId" value={sk.id} />

												<div class="radio-row">
													<label>
														<input
															type="radio"
															name="mode"
															value="inherit"
															checked={sk.score_min === null}
														/>
														Herdar da turma
													</label>

													<label>
														<input
															type="radio"
															name="mode"
															value="custom"
															checked={sk.score_min !== null}
														/>
														Customizar
													</label>
												</div>

												<div class="scale-fields">
													<label>
														<span>Min</span>
														<input
															name="score_min"
															type="number"
															step="any"
															value={sk.score_min ?? data.class.score_min}
														/>
													</label>

													<label>
														<span>Max</span>
														<input
															name="score_max"
															type="number"
															step="any"
															value={sk.score_max ?? data.class.score_max}
														/>
													</label>

													<label>
														<span>Dec</span>
														<input
															name="score_decimals"
															type="number"
															min="0"
															max="6"
															value={sk.score_decimals ?? data.class.score_decimals}
														/>
													</label>
												</div>

												<button type="submit" class="primary-button">Salvar escala</button>
											</form>
										</div>
									{/if}
								</article>
							{/each}
						</div>
					{/if}
				</section>
			</section>

			<section class="panel">
				<div class="panel-head">
					<div>
						<div class="section-kicker">Configuração da turma</div>
						<h2>Ações rápidas</h2>
					</div>
					<p>
						Este bloco concentra ações de manutenção e configurações para não competir com o grid.
					</p>
				</div>

				<div class="manage-actions-grid">
					<div class="mini-action-card">
						<span>Status do snapshot</span>
						<strong>{data.hasTodaySnapshot ? 'Em dia' : 'Pendente hoje'}</strong>
					</div>

					<div class="mini-action-card">
						<span>Auto snapshot</span>
						<strong>{autoSnapshot ? 'Ativado' : 'Desativado'}</strong>
					</div>

					<div class="mini-action-card">
						<span>Alunos</span>
						<strong>{data.students.length}</strong>
					</div>

					<div class="mini-action-card">
						<span>Skills</span>
						<strong>{data.skills.length}</strong>
					</div>
				</div>
			</section>
		</section>
	{/if}
{/if}

<style>
	.hero,
	.tabs-panel,
	.panel,
	.stat-card,
	.bucket-item,
	.action-item,
	.mini-action-card,
	.compact-item,
	.skill-manage-item {
		background: rgba(255, 255, 255, 0.94);
		border: 1px solid rgba(148, 163, 184, 0.18);
		box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
		border-radius: 1.3rem;
	}

	.empty-page,
	.empty-state {
		background: rgba(255, 255, 255, 0.94);
		border: 1px solid rgba(148, 163, 184, 0.18);
		box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
		border-radius: 1.3rem;
	}

	.hero,
	.panel,
	.tabs-panel,
	.empty-page {
		padding: 1.25rem;
		margin-bottom: 1rem;
	}

	.section-stack {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.hero {
		display: grid;
		grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.9fr);
		gap: 1rem;
		align-items: stretch;
	}

	.eyebrow,
	.section-kicker,
	.stat-label,
	.hero-side-label,
	.focus-label {
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #64748b;
		margin-bottom: 0.35rem;
	}

	.hero h1,
	.panel-head h2,
	.empty-page h1,
	.empty-state h3 {
		margin: 0;
		line-height: 1.08;
		color: #0f172a;
	}

	.hero h1 {
		font-size: clamp(1.8rem, 3vw, 2.5rem);
		letter-spacing: -0.04em;
	}

	.hero p,
	.panel-head p,
	.empty-page p,
	.empty-state p,
	.invite-help,
	.subtle-text,
	.compact-item p,
	.skill-manage-item p {
		color: #475569;
		line-height: 1.7;
	}

	.hero-inline-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.65rem;
		margin-top: 1rem;
	}

	.snapshot-chip,
	.meta-chip,
	.helper-chip,
	.chip-button {
		padding: 0.55rem 0.8rem;
		border-radius: 999px;
		font-size: 0.84rem;
		font-weight: 700;
		border: 1px solid #e2e8f0;
		background: #f8fafc;
		color: #334155;
	}

	.snapshot-chip.ok {
		background: rgba(34, 197, 94, 0.12);
		border-color: rgba(34, 197, 94, 0.22);
		color: #166534;
	}

	.snapshot-chip.warn {
		background: rgba(245, 158, 11, 0.12);
		border-color: rgba(245, 158, 11, 0.22);
		color: #92400e;
	}

	.hero-actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-width: 0;
	}

	.primary-button,
	.secondary-button,
	.danger-button,
	.table-action {
		height: 2.95rem;
		padding: 0 1rem;
		border-radius: 0.95rem;
		font-weight: 700;
		font-size: 0.95rem;
		cursor: pointer;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition:
			transform 0.16s ease,
			box-shadow 0.16s ease,
			background 0.16s ease,
			border-color 0.16s ease,
			opacity 0.16s ease;
	}

	.primary-button {
		border: 0;
		background: linear-gradient(135deg, #2563eb, #1d4ed8);
		color: white;
		box-shadow: 0 12px 24px rgba(37, 99, 235, 0.24);
	}

	.secondary-button,
	.table-action {
		background: white;
		color: #0f172a;
		border: 1px solid #cbd5e1;
	}

	.danger-button {
		background: white;
		color: #b91c1c;
		border: 1px solid rgba(239, 68, 68, 0.25);
	}

	.primary-button:hover,
	.secondary-button:hover,
	.danger-button:hover,
	.table-action:hover,
	.chip-button:hover,
	.tabs button:hover {
		transform: translateY(-1px);
	}

	.primary-button:disabled,
	.secondary-button:disabled,
	.danger-button:disabled {
		opacity: 0.72;
		cursor: not-allowed;
		transform: none;
	}

	.toggle-card {
		display: inline-flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.85rem 1rem;
		border-radius: 1rem;
		cursor: pointer;
		background: rgba(248, 250, 252, 0.9);
		border: 1px solid #e2e8f0;
	}

	.feedback {
		margin-bottom: 1rem;
		padding: 0.95rem 1rem;
		border-radius: 1rem;
		font-size: 0.92rem;
		font-weight: 700;
	}

	.feedback.success {
		background: rgba(34, 197, 94, 0.12);
		border: 1px solid rgba(34, 197, 94, 0.22);
		color: #166534;
	}

	.feedback.error {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.2);
		color: #991b1b;
	}

	.tabs {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.tabs button {
		height: 2.8rem;
		padding: 0 1rem;
		border-radius: 0.95rem;
		border: 1px solid #cbd5e1;
		background: white;
		color: #334155;
		font-size: 0.94rem;
		font-weight: 800;
		cursor: pointer;
		transition:
			transform 0.16s ease,
			border-color 0.16s ease,
			background 0.16s ease,
			color 0.16s ease;
	}

	.tabs button.active {
		background: linear-gradient(180deg, rgba(37, 99, 235, 0.12), rgba(37, 99, 235, 0.08));
		border-color: rgba(96, 165, 250, 0.4);
		color: #1d4ed8;
	}

	.panel-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.panel-head.compact {
		margin-bottom: 0.8rem;
	}

	.panel-head p {
		max-width: 460px;
		margin: 0.15rem 0 0;
		font-size: 0.94rem;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.9rem;
	}

	.stat-card {
		padding: 1rem;
	}

	.stat-value {
		font-size: 1.8rem;
		font-weight: 900;
		line-height: 1.05;
		color: #0f172a;
	}

	.stat-value.small {
		font-size: 1.05rem;
		line-height: 1.25;
	}

	.stat-foot {
		margin-top: 0.45rem;
		font-size: 0.88rem;
		color: #475569;
		line-height: 1.5;
	}

	.next-action-panel .next-action-box {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem;
		border-radius: 1rem;
		background: linear-gradient(180deg, rgba(37, 99, 235, 0.06), rgba(37, 99, 235, 0.03));
		border: 1px solid rgba(96, 165, 250, 0.18);
	}

	.next-action-box p {
		margin: 0;
		max-width: 760px;
	}

	.overview-two-col,
	.manage-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
	}

	.bucket-list,
	.compact-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.bucket-item,
	.action-item,
	.compact-item {
		padding: 0.95rem 1rem;
	}

	.action-row {
		width: 100%;
		text-align: left;
		border: 0;
		cursor: pointer;
	}

	.bucket-item,
	.action-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.bucket-item strong,
	.action-item strong,
	.compact-item strong,
	.skill-manage-item strong {
		display: block;
		color: #0f172a;
		font-size: 0.98rem;
		margin-bottom: 0.15rem;
	}

	.bucket-item p,
	.action-item p {
		margin: 0;
		font-size: 0.88rem;
		color: #64748b;
	}

	.bucket-item span {
		font-size: 1.05rem;
		font-weight: 900;
		color: #0f172a;
		white-space: nowrap;
	}

	.table-shell,
	.grid-shell {
		overflow: auto;
		border-radius: 1rem;
		border: 1px solid #e2e8f0;
		background: white;
	}

	.insight-table,
	.score-grid {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
	}

	.insight-table th,
	.insight-table td,
	.score-grid th,
	.score-grid td {
		padding: 0.85rem 0.9rem;
		border-bottom: 1px solid #e2e8f0;
		vertical-align: top;
	}

	.insight-table th,
	.score-grid th {
		background: #f8fafc;
		font-size: 0.82rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #475569;
		text-align: left;
	}

	.skill-name-cell {
		font-weight: 700;
		color: #0f172a;
	}

	.subtle {
		font-size: 0.82rem;
		color: #64748b;
		margin-top: 0.15rem;
	}

	.positive {
		color: #15803d;
		font-weight: 700;
	}

	.negative {
		color: #b91c1c;
		font-weight: 700;
	}

	.launch-toolbar-panel .toolbar-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.85rem;
		margin-bottom: 0.85rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.field label {
		font-size: 0.84rem;
		font-weight: 800;
		color: #334155;
	}

	.field input,
	.field select,
	.stack-form input,
	.scale-form input {
		height: 2.9rem;
		padding: 0 0.9rem;
		border-radius: 0.95rem;
		border: 1px solid #cbd5e1;
		background: white;
		color: #0f172a;
		font-size: 0.96rem;
		outline: none;
		transition:
			border-color 0.16s ease,
			box-shadow 0.16s ease,
			background 0.16s ease;
	}

	.field input:focus,
	.field select:focus,
	.stack-form input:focus,
	.scale-form input:focus {
		border-color: #60a5fa;
		box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12);
		background: white;
	}

	.launch-chips,
	.grid-helper {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		margin-bottom: 0.9rem;
	}

	.chip-button {
		cursor: pointer;
		background: #f8fafc;
	}

	.save-feedback {
		padding: 0.6rem 0.85rem;
		border-radius: 999px;
		font-size: 0.84rem;
		font-weight: 800;
		border: 1px solid #e2e8f0;
		background: #f8fafc;
		color: #334155;
		white-space: nowrap;
	}

	.save-feedback.ok {
		background: rgba(34, 197, 94, 0.12);
		border-color: rgba(34, 197, 94, 0.22);
		color: #166534;
	}

	.save-feedback.saving {
		background: rgba(37, 99, 235, 0.08);
		border-color: rgba(96, 165, 250, 0.25);
		color: #1d4ed8;
	}

	.save-feedback.error {
		background: rgba(239, 68, 68, 0.1);
		border-color: rgba(239, 68, 68, 0.22);
		color: #991b1b;
	}

	.launch-summary-row {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.launch-summary-box {
		padding: 0.9rem;
		border-radius: 1rem;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
	}

	.launch-summary-box span,
	.mini-action-card span {
		display: block;
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: #64748b;
		margin-bottom: 0.2rem;
	}

	.launch-summary-box strong,
	.mini-action-card strong {
		font-size: 1.05rem;
		color: #0f172a;
	}

	.grid-panel.focus {
		box-shadow: 0 18px 48px rgba(15, 23, 42, 0.1);
	}

	.legend {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.legend-item {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.85rem;
		color: #475569;
	}

	.tone {
		display: inline-block;
		width: 0.85rem;
		height: 0.85rem;
		border-radius: 999px;
	}

	.tone.risk {
		background: rgba(239, 68, 68, 0.28);
	}

	.tone.warn {
		background: rgba(245, 158, 11, 0.26);
	}

	.tone.good {
		background: rgba(34, 197, 94, 0.22);
	}

	.tone.empty {
		background: rgba(148, 163, 184, 0.18);
	}

	.sticky-header {
		position: sticky;
		top: 0;
		z-index: 2;
	}

	.sticky-col {
		position: sticky;
		left: 0;
		z-index: 1;
		background: white;
	}

	.student-col {
		min-width: 240px;
	}

	.student-cell,
	.average-label {
		font-weight: 700;
		color: #0f172a;
		background: #fff;
	}

	.student-main {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.student-state {
		padding: 0.25rem 0.55rem;
		border-radius: 999px;
		font-size: 0.72rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		white-space: nowrap;
	}

	.student-state.risk {
		background: rgba(239, 68, 68, 0.12);
		color: #991b1b;
	}

	.student-state.attention {
		background: rgba(245, 158, 11, 0.14);
		color: #92400e;
	}

	.student-state.good {
		background: rgba(34, 197, 94, 0.12);
		color: #166534;
	}

	.student-state.pending {
		background: rgba(148, 163, 184, 0.18);
		color: #475569;
	}

	.skill-col {
		min-width: 170px;
	}

	.avg-col {
		min-width: 140px;
	}

	.col-head {
		font-weight: 800;
		color: #0f172a;
		text-transform: none;
		letter-spacing: normal;
		font-size: 0.9rem;
	}

	.col-subtle {
		margin-top: 0.2rem;
		font-size: 0.76rem;
		color: #64748b;
		text-transform: none;
		letter-spacing: normal;
	}

	.score-cell {
		min-width: 170px;
		background: white;
		transition: background 0.16s ease;
	}

	.score-form {
		display: flex;
		align-items: center;
		gap: 0.45rem;
	}

	.score-input {
		width: 100%;
		min-width: 72px;
		height: 2.45rem;
		padding: 0 0.75rem;
		border-radius: 0.85rem;
		border: 1px solid rgba(148, 163, 184, 0.35);
		background: rgba(255, 255, 255, 0.82);
		color: #0f172a;
		font-size: 0.95rem;
		outline: none;
		transition:
			border-color 0.16s ease,
			box-shadow 0.16s ease,
			background 0.16s ease;
	}

	.score-input:focus {
		border-color: #60a5fa;
		box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12);
		background: white;
	}

	.status-chip {
		width: 1.2rem;
		text-align: center;
		flex-shrink: 0;
	}

	.cell-error {
		margin-top: 0.35rem;
		font-size: 0.78rem;
		color: #991b1b;
		line-height: 1.4;
	}

	.average-row td {
		font-weight: 800;
		background: #f8fafc;
	}

	.average-cell {
		color: #0f172a;
	}

	.student-average {
		font-weight: 800;
		color: #0f172a;
	}

	.overall-average-cell {
		font-weight: 800;
	}

	.tone-risk {
		background: rgba(239, 68, 68, 0.08);
	}

	.tone-warn {
		background: rgba(245, 158, 11, 0.08);
	}

	.tone-good {
		background: rgba(34, 197, 94, 0.08);
	}

	.tone-empty {
		background: rgba(248, 250, 252, 0.92);
	}

	.stack-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.compact-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.compact-item-main {
		min-width: 0;
	}

	.compact-subline {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.45rem;
		margin-top: 0.3rem;
		font-size: 0.86rem;
		color: #64748b;
	}

	.invite-label-inline {
		font-size: 0.72rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #64748b;
	}

	.compact-subline code {
		color: #0f172a;
		font-size: 0.92rem;
		font-weight: 800;
		word-break: break-all;
	}

	.compact-copy,
	.compact-action {
		height: 2.55rem;
		min-width: 112px;
	}

	.skill-manage-item {
		padding: 1rem;
	}

	.skill-manage-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.9rem;
	}

	.skill-manage-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
		justify-content: flex-end;
	}

	.scale-box {
		margin-top: 0.95rem;
		padding-top: 0.95rem;
		border-top: 1px solid #e2e8f0;
	}

	.scale-form {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.radio-row {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		font-size: 0.9rem;
		color: #334155;
	}

	.radio-row label {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
	}

	.scale-fields {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.scale-fields label {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.84rem;
		font-weight: 700;
		color: #334155;
	}

	.manage-actions-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.85rem;
	}

	.mini-action-card {
		padding: 1rem;
	}

	.empty-page,
	.empty-state {
		padding: 1.2rem;
		text-align: center;
	}

	.empty-state.compact {
		padding: 1rem;
		box-shadow: none;
		border-style: dashed;
	}

	.empty-state h3,
	.empty-page h1 {
		margin: 0 0 0.5rem;
	}

	.empty-state p,
	.empty-page p {
		margin: 0;
	}

	.empty-page {
		max-width: 640px;
		margin: 2rem auto 0;
	}

	.empty-page .primary-button {
		margin-top: 1rem;
	}

	@media (max-width: 1180px) {
		.hero,
		.stats-grid,
		.overview-two-col,
		.manage-grid,
		.launch-toolbar-panel .toolbar-grid,
		.launch-summary-row,
		.manage-actions-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 900px) {
		.panel-head,
		.next-action-box,
		.bucket-item,
		.action-item,
		.compact-item,
		.skill-manage-head {
			flex-direction: column;
			align-items: flex-start;
		}

		.card-footer,
		.hero-actions {
			width: 100%;
		}
	}

	@media (max-width: 640px) {
	.tabs {
		display: grid;
		grid-template-columns: 1fr;
	}

	.primary-button,
	.secondary-button,
	.danger-button,
	.table-action {
		width: 100%;
	}

	.hero-inline-meta,
	.launch-chips,
	.grid-helper,
	.legend {
		flex-direction: column;
	}

	.score-cell,
	.avg-col {
		min-width: 150px;
	}

	.scale-fields {
		grid-template-columns: 1fr;
	}

	.compact-copy,
	.compact-action {
		width: 100%;
	}
}
</style>