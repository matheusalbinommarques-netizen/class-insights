<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
	import { onMount } from 'svelte';

	type InsightRow = {
		skill_id: string;
		skill_name: string;
		baseline_date: string | null;
		baseline_n: number | null;
		baseline_avg: number | null;
		baseline_median: number | null;
		latest_date: string | null;
		latest_n: number | null;
		latest_avg: number | null;
		latest_median: number | null;
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
				setTimeout(() => setStatus(k, 'idle'), 700);
				return;
			}

			const msg =
				(result.type === 'failure' && (result as { data?: { message?: string } }).data?.message) ||
				(result.type === 'error' && result.error?.message) ||
				'Erro ao salvar.';

			setStatus(k, 'error', msg);
			setTimeout(() => setStatus(k, 'idle'), 2000);
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

	const cellTone = (skillId: string, raw: string) => {
		const ratio = ratioFor(skillId, raw);
		if (ratio === null) return 'empty';

		if (ratio < 0.4) return 'risk';
		if (ratio < 0.7) return 'warn';
		return 'good';
	};

	const averageBySkill = (skillId: string) => {
		const values = Object.entries(scores)
			.filter(([key]) => key.endsWith(`:${skillId}`))
			.map(([, value]) => toNumber(value))
			.filter((v): v is number => v !== null);

		if (values.length === 0) return '-';

		const sc = effectiveScale(skillId);
		const avg = values.reduce((a, b) => a + b, 0) / values.length;
		return avg.toFixed(sc.decimals);
	};

	const averageTone = (skillId: string) => {
		const avg = averageBySkill(skillId);
		if (avg === '-') return 'empty';
		return cellTone(skillId, avg);
	};

	const averageByStudent = (studentId: string) => {
		const values = data.skills
			.map((skill) => toNumber(getScore(studentId, skill.id)))
			.filter((v): v is number => v !== null);

		if (values.length === 0) return '-';

		const decimals = data.class?.score_decimals ?? 0;
		const avg = values.reduce((a, b) => a + b, 0) / values.length;
		return avg.toFixed(decimals);
	};

	const averageToneByStudent = (studentId: string) => {
		const avg = averageByStudent(studentId);
		if (avg === '-') return 'empty';

		const cls = data.class;
		if (!cls) return 'empty';

		const normalizedAvg = normalizeNumericString(avg);
		const numericAvg = Number(normalizedAvg);
		if (!Number.isFinite(numericAvg)) return 'empty';

		const range = cls.score_max - cls.score_min;
		if (range <= 0) return 'empty';

		const ratio = Math.max(0, Math.min(1, (numericAvg - cls.score_min) / range));
		if (ratio < 0.4) return 'risk';
		if (ratio < 0.7) return 'warn';
		return 'good';
	};

	const overallGridAverage = () => {
		const values = Object.values(scores)
			.map((value) => toNumber(value))
			.filter((v): v is number => v !== null);

		if (values.length === 0) return '—';

		const decimals = data.class?.score_decimals ?? 0;
		const avg = values.reduce((a, b) => a + b, 0) / values.length;
		return avg.toFixed(decimals);
	};

	$: totalGridCells = data.students.length * data.skills.length;
	$: filledGridCells = Object.values(scores).filter((value) => toNumber(value) !== null).length;
	$: gridCoverage = totalGridCells > 0 ? Math.round((filledGridCells / totalGridCells) * 100) : 0;

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
				}, 200);
				return;
			}

			const msg =
				(result.type === 'failure' && (result as { data?: { message?: string } }).data?.message) ||
				(result.type === 'error' && result.error?.message) ||
				'Erro ao gerar snapshot.';

			snapshotStatus = 'error';
			snapshotError = msg;
			setTimeout(() => (snapshotStatus = 'idle'), 2200);
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

	const studentIndexOf = (studentId: string) => data.students.findIndex((s) => s.id === studentId);
	const skillIndexOf = (skillId: string) => data.skills.findIndex((s) => s.id === skillId);

	const focusCellAt = (studentIndex: number, skillIndex: number) => {
		if (studentIndex < 0 || skillIndex < 0) return;
		if (studentIndex >= data.students.length || skillIndex >= data.skills.length) return;

		const student = data.students[studentIndex];
		const skill = data.skills[skillIndex];
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
			const targetStudent = data.students[startStudentIndex + rowOffset];
			if (!targetStudent) break;

			for (let colOffset = 0; colOffset < matrix[rowOffset].length; colOffset++) {
				const targetSkill = data.skills[startSkillIndex + colOffset];
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
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>

{#if !data.class}
	<section class="empty-page">
		<h1>Turma não encontrada</h1>
		<p>Volte para o dashboard e selecione uma turma válida.</p>
		<a href="/teacher" class="primary-link">Voltar ao dashboard</a>
	</section>
{:else}
	<section class="hero">
		<div>
			<div class="eyebrow">Turma</div>
			<h1>{data.class.name}</h1>
			<p>
				Escala padrão da turma:
				<strong>{data.class.score_min}–{data.class.score_max}</strong>
				(decimais: <strong>{data.class.score_decimals}</strong>)
			</p>
		</div>

		<div class="hero-actions">
			<form method="POST" action="?/generateSnapshot" use:enhance={enhanceSnapshot}>
				<button type="submit" id="autoSnapshotSubmit" class="primary-button">
					{#if snapshotStatus === 'saving'}
						Gerando snapshot…
					{:else}
						Gerar snapshot (hoje)
					{/if}
				</button>
			</form>

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

	<div class="page-grid">
		<section class="main-column">
			<section class="panel">
				<div class="panel-head">
					<div>
						<div class="section-kicker">Cockpit</div>
						<h2>Insights da turma</h2>
					</div>
					<div class="meta-inline">
						<span>Hoje (UTC): {data.today}</span>
						<span class:ok={data.hasTodaySnapshot}>
							Snapshot hoje: {data.hasTodaySnapshot ? 'sim' : 'não'}
						</span>
					</div>
				</div>

				<div class="stats-grid">
					<article class="stat-card">
						<div class="stat-label">Média da turma (snapshot)</div>
						<div class="stat-value">
							{#if insightKpis.classAvg !== null}
								{insightKpis.classAvg.toFixed(2)}
							{:else}
								—
							{/if}
						</div>
						<div class="stat-foot">Leitura histórica baseada no snapshot mais recente por skill</div>
					</article>

					<article class="stat-card">
						<div class="stat-label">Skill mais crítica</div>
						<div class="stat-title">{insightKpis.criticalSkill?.skill_name ?? '—'}</div>
						<div class="stat-foot">
							latest avg: {formatMaybe(insightKpis.criticalSkill?.latest_avg ?? null)}
							• N: {insightKpis.criticalSkill?.latest_n ?? '—'}
						</div>
					</article>

					<article class="stat-card">
						<div class="stat-label">Skill mais forte</div>
						<div class="stat-title">{insightKpis.strongSkill?.skill_name ?? '—'}</div>
						<div class="stat-foot">
							latest avg: {formatMaybe(insightKpis.strongSkill?.latest_avg ?? null)}
							• N: {insightKpis.strongSkill?.latest_n ?? '—'}
						</div>
					</article>

					<article class="stat-card">
						<div class="stat-label">Cobertura do lançamento</div>
						<div class="stat-value">{gridCoverage}%</div>
						<div class="stat-foot">{filledGridCells} de {totalGridCells} células preenchidas</div>
					</article>
				</div>

				{#if snapshotStatus === 'error'}
					<div class="feedback error">{snapshotError}</div>
				{:else if snapshotStatus === 'saved'}
					<div class="feedback success">Snapshot gerado com sucesso.</div>
				{/if}

				{#if insightRows.length > 0}
					<div class="insight-buckets">
						<div class="bucket-card">
							<h3>Top lacunas</h3>
							<ul>
								{#each weakestRows as row}
									<li>
										<span>{row.skill_name}</span>
										<strong>{formatMaybe(row.latest_avg, 2)}</strong>
									</li>
								{/each}
							</ul>
						</div>

						<div class="bucket-card">
							<h3>Top forças</h3>
							<ul>
								{#each strongestRows as row}
									<li>
										<span>{row.skill_name}</span>
										<strong>{formatMaybe(row.latest_avg, 2)}</strong>
									</li>
								{/each}
							</ul>
						</div>
					</div>

					<div class="table-shell">
						<table class="insight-table">
							<thead>
								<tr>
									<th>Skill</th>
									<th>Baseline</th>
									<th>Latest</th>
									<th>Δ</th>
									<th>N latest</th>
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
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

					<p class="hint">
						Dica: gere snapshots ao final de cada avaliação, semana ou ciclo para manter a
						evolução auditável.
					</p>
				{:else}
					<div class="empty-state">
						<h3>Nenhum snapshot ainda</h3>
						<p>
							Clique em <strong>“Gerar snapshot (hoje)”</strong> para começar o histórico de
							evolução da turma.
						</p>
					</div>
				{/if}
			</section>

			<section class="panel">
				<div class="panel-head">
					<div>
						<div class="section-kicker">Operação</div>
						<h2>Grid de notas</h2>
					</div>
					<div class="legend">
						<span class="legend-item"><i class="tone risk"></i> risco</span>
						<span class="legend-item"><i class="tone warn"></i> atenção</span>
						<span class="legend-item"><i class="tone good"></i> bom</span>
					</div>
				</div>

				<div class="grid-helper">
					<div class="helper-chip">Enter / Shift+Enter navega na coluna</div>
					<div class="helper-chip">Setas navegam entre células</div>
					<div class="helper-chip">Cole blocos com tab + quebra de linha</div>
				</div>

				{#if data.students.length === 0 || data.skills.length === 0}
					<div class="empty-state">
						<h3>Grid indisponível</h3>
						<p>Crie alunos e skills para começar o lançamento operacional das notas.</p>
					</div>
				{:else}
					<div class="grid-shell">
						<table class="score-grid">
							<thead>
								<tr>
									<th class="sticky-col sticky-header student-col">Aluno</th>
									{#each data.skills as sk}
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
								{#each data.students as st}
									<tr>
										<td class="sticky-col student-cell">{st.name}</td>

										{#each data.skills as sk}
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

										<td class={`student-average tone-${averageToneByStudent(st.id)}`}>
											{averageByStudent(st.id)}
										</td>
									</tr>
								{/each}

								<tr class="average-row">
									<td class="sticky-col average-label">Média</td>
									{#each data.skills as sk}
										<td class={`average-cell tone-${averageTone(sk.id)}`}>
											{averageBySkill(sk.id)}
										</td>
									{/each}
									<td class="average-cell overall-average-cell">
										{overallGridAverage()}
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				{/if}
			</section>
		</section>

		<aside class="side-column">
			<section class="panel">
				<div class="panel-head small">
					<div>
						<div class="section-kicker">Cadastro</div>
						<h2>Alunos</h2>
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
					<div class="student-stack">
						{#each data.students as s}
							<article class="student-card">
								<div class="student-card-top">
									<strong>{s.name}</strong>

									{#if copiedInviteCode === s.invite_code && s.invite_code}
										<span class="copied-badge">Copiado!</span>
									{/if}
								</div>

								<div class="invite-box">
									<div class="invite-meta">
										<span class="invite-label">Invite code</span>
										<code>{s.invite_code ?? '—'}</code>
									</div>

									<button
										type="button"
										class="secondary-button"
										disabled={!s.invite_code}
										onclick={() => copyInviteCode(s.invite_code)}
									>
										Copiar
									</button>
								</div>
							</article>
						{/each}
					</div>
				{:else}
					<p class="subtle-text">Nenhum aluno cadastrado ainda.</p>
				{/if}
			</section>

			<section class="panel">
				<div class="panel-head small">
					<div>
						<div class="section-kicker">Catálogo</div>
						<h2>Skills</h2>
					</div>
				</div>

				<form method="POST" action="?/createSkill" class="stack-form">
					<input name="name" placeholder="Nome da skill" />
					<button type="submit" class="primary-button">Criar skill</button>
				</form>

				{#if data.skills.length === 0}
					<p class="subtle-text">Nenhuma skill ainda.</p>
				{:else}
					<div class="skill-stack">
						{#each data.skills as sk}
							<article class="skill-card">
								<div class="skill-card-top">
									<div>
										<h3>{sk.name}</h3>
										<p>{formatScaleLabel(sk)}</p>
									</div>

									<div class="skill-card-actions">
										<button
											type="button"
											class="secondary-button"
											onclick={() => toggleEditingScale(sk.id)}
										>
											{editingScale[sk.id] ? 'Fechar' : 'Editar escala'}
										</button>

										<form method="POST" action="?/deleteSkill">
											<input type="hidden" name="skillId" value={sk.id} />
											<button type="submit" class="danger-button" onclick={confirmDeleteSkill}>
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
		</aside>
	</div>
{/if}

<style>
	.hero,
	.panel,
	.bucket-card,
	.stat-card,
	.skill-card,
	.toggle-card,
	.empty-page,
	.student-card {
		background: rgba(255, 255, 255, 0.92);
		border: 1px solid rgba(148, 163, 184, 0.2);
		box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
	}

	.hero,
	.panel,
	.empty-page {
		border-radius: 1.35rem;
	}

	.hero {
		padding: 1.35rem;
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.eyebrow,
	.section-kicker {
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #64748b;
		margin-bottom: 0.35rem;
	}

	.hero h1,
	.panel-head h2,
	.empty-page h1 {
		margin: 0;
		line-height: 1.15;
		color: #0f172a;
	}

	.hero h1 {
		font-size: clamp(1.65rem, 2.4vw, 2.25rem);
	}

	.hero p,
	.empty-page p,
	.subtle-text,
	.hint,
	.invite-help {
		color: #475569;
		line-height: 1.6;
	}

	.hero p {
		margin: 0.55rem 0 0;
	}

	.hero-actions {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 0.75rem;
		min-width: 250px;
	}

	.primary-button,
	.secondary-button,
	.danger-button,
	.primary-link {
		height: 2.9rem;
		padding: 0 1rem;
		border-radius: 0.9rem;
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

	.primary-button,
	.primary-link {
		border: 0;
		background: linear-gradient(135deg, #2563eb, #1d4ed8);
		color: white;
		box-shadow: 0 12px 24px rgba(37, 99, 235, 0.24);
	}

	.secondary-button {
		background: #fff;
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
	.primary-link:hover {
		transform: translateY(-1px);
	}

	.secondary-button:disabled {
		opacity: 0.6;
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
	}

	.page-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.65fr) minmax(320px, 0.95fr);
		gap: 1rem;
		align-items: start;
	}

	.main-column,
	.side-column {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		min-width: 0;
	}

	.panel {
		padding: 1.2rem;
	}

	.panel-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.panel-head.small {
		margin-bottom: 0.85rem;
	}

	.meta-inline {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		align-items: flex-end;
		font-size: 0.86rem;
		color: #64748b;
	}

	.meta-inline .ok {
		color: #15803d;
		font-weight: 700;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.9rem;
		margin-bottom: 1rem;
	}

	.stat-card {
		border-radius: 1.1rem;
		padding: 1rem;
	}

	.stat-label {
		font-size: 0.8rem;
		font-weight: 800;
		color: #64748b;
		margin-bottom: 0.35rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat-value {
		font-size: 1.85rem;
		font-weight: 800;
		line-height: 1.05;
		color: #0f172a;
	}

	.stat-title {
		font-size: 1.08rem;
		font-weight: 800;
		color: #0f172a;
	}

	.stat-foot {
		margin-top: 0.45rem;
		font-size: 0.88rem;
		color: #475569;
		line-height: 1.5;
	}

	.feedback {
		margin-bottom: 1rem;
		padding: 0.9rem 1rem;
		border-radius: 0.95rem;
		font-size: 0.92rem;
		font-weight: 600;
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

	.insight-buckets {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.9rem;
		margin-bottom: 1rem;
	}

	.bucket-card {
		border-radius: 1rem;
		padding: 1rem;
	}

	.bucket-card h3 {
		margin: 0 0 0.8rem;
		font-size: 1rem;
		color: #0f172a;
	}

	.bucket-card ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}

	.bucket-card li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding-bottom: 0.7rem;
		border-bottom: 1px solid #e2e8f0;
	}

	.bucket-card li:last-child {
		padding-bottom: 0;
		border-bottom: 0;
	}

	.bucket-card strong {
		color: #0f172a;
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
		padding: 0.8rem 0.9rem;
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

	.hint {
		margin: 0.8rem 0 0;
		font-size: 0.9rem;
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

	.grid-helper {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		margin-bottom: 1rem;
	}

	.helper-chip {
		padding: 0.55rem 0.8rem;
		border-radius: 999px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		color: #475569;
		font-size: 0.82rem;
		font-weight: 600;
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
		min-width: 210px;
	}

	.student-cell,
	.average-label {
		font-weight: 700;
		color: #0f172a;
		background: #fff;
	}

	.skill-col {
		min-width: 155px;
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
		min-width: 155px;
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
		background: white;
	}

	.stack-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.stack-form input,
	.scale-form input {
		height: 2.8rem;
		padding: 0 0.85rem;
		border-radius: 0.9rem;
		border: 1px solid #cbd5e1;
		background: white;
		color: #0f172a;
		font-size: 0.95rem;
		outline: none;
		transition:
			border-color 0.16s ease,
			box-shadow 0.16s ease;
	}

	.stack-form input:focus,
	.scale-form input:focus {
		border-color: #60a5fa;
		box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12);
	}

	.invite-help {
		margin: 0.85rem 0 0;
		font-size: 0.9rem;
	}

	.student-stack {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.student-card {
		border-radius: 1rem;
		padding: 0.95rem;
	}

	.student-card-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.7rem;
	}

	.student-card-top strong {
		color: #0f172a;
		font-size: 0.98rem;
	}

	.copied-badge {
		padding: 0.35rem 0.6rem;
		border-radius: 999px;
		background: rgba(34, 197, 94, 0.12);
		color: #166534;
		font-size: 0.74rem;
		font-weight: 800;
		white-space: nowrap;
	}

	.invite-box {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.8rem 0.85rem;
		border-radius: 0.95rem;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
	}

	.invite-meta {
		min-width: 0;
	}

	.invite-label {
		display: block;
		font-size: 0.76rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #64748b;
		margin-bottom: 0.2rem;
	}

	.invite-box code {
		display: inline-block;
		color: #0f172a;
		font-size: 0.95rem;
		font-weight: 800;
		word-break: break-all;
	}

	.skill-stack {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		margin-top: 1rem;
	}

	.skill-card {
		border-radius: 1rem;
		padding: 1rem;
	}

	.skill-card-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.8rem;
	}

	.skill-card-top h3 {
		margin: 0;
		font-size: 1rem;
		color: #0f172a;
	}

	.skill-card-top p {
		margin: 0.35rem 0 0;
		font-size: 0.86rem;
		color: #64748b;
		line-height: 1.5;
	}

	.skill-card-actions {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}

	.scale-box {
		margin-top: 0.9rem;
		padding-top: 0.9rem;
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

	.empty-state,
	.empty-page {
		padding: 1.2rem;
		text-align: center;
	}

	.empty-state {
		border-radius: 1rem;
		border: 1px dashed #cbd5e1;
		background: rgba(248, 250, 252, 0.86);
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

	.empty-page .primary-link {
		margin-top: 1rem;
	}

	@media (max-width: 1180px) {
		.page-grid {
			grid-template-columns: 1fr;
		}

		.side-column {
			order: -1;
		}
	}

	@media (max-width: 980px) {
		.hero {
			flex-direction: column;
		}

		.hero-actions {
			width: 100%;
			min-width: 0;
		}

		.stats-grid,
		.insight-buckets,
		.scale-fields {
			grid-template-columns: 1fr;
		}

		.panel-head {
			flex-direction: column;
		}

		.meta-inline {
			align-items: flex-start;
		}
	}

	@media (max-width: 640px) {
		.skill-card-top,
		.student-card-top,
		.invite-box {
			flex-direction: column;
			align-items: stretch;
		}

		.skill-card-actions {
			width: 100%;
		}

		.secondary-button,
		.danger-button,
		.primary-button {
			width: 100%;
		}

		.score-cell,
		.avg-col {
			min-width: 140px;
		}
	}
</style>