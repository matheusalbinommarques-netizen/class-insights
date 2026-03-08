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

	export let data: {
		class: { id: string; name: string; score_min: number; score_max: number; score_decimals: number } | null;
		students: { id: string; name: string }[];
		skills: {
			id: string;
			name: string;
			score_min: number | null;
			score_max: number | null;
			score_decimals: number | null;
		}[];
		scores: { student_id: string; skill_id: string; score: number }[];
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

	$: insightRows = data.insights?.rows ?? [];
	$: insightKpis = data.insights?.kpis ?? emptyKpis;

	const keyOf = (studentId: string, skillId: string) => `${studentId}:${skillId}`;

	let scores: Record<string, string> = {};
	for (const s of data.scores) scores[keyOf(s.student_id, s.skill_id)] = String(s.score);

	let status: Record<string, 'idle' | 'saving' | 'saved' | 'error'> = {};
	let errorMsg: Record<string, string> = {};

	const getScore = (studentId: string, skillId: string) => scores[keyOf(studentId, skillId)] ?? '';

	const setStatus = (k: string, s: 'idle' | 'saving' | 'saved' | 'error', msg = '') => {
		status = { ...status, [k]: s };
		if (msg) errorMsg = { ...errorMsg, [k]: msg };
	};

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

	const toNumber = (v: string) => {
		const n = Number(v.replace(',', '.'));
		return Number.isNaN(n) ? null : n;
	};

	const cellStyle = (skillId: string, raw: string) => {
		const n = toNumber(raw);
		if (n === null) return '';

		const sc = effectiveScale(skillId);
		const pct = (n - sc.min) / (sc.max - sc.min);

		if (pct < 0.4) return 'background: rgba(255,0,0,0.12);';
		if (pct < 0.7) return 'background: rgba(255,165,0,0.12);';
		return 'background: rgba(0,128,0,0.10);';
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
			setTimeout(() => (snapshotStatus = 'idle'), 2000);
		};
	};

	let autoSnapshot = false;

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
		if (typeof n !== 'number') return '-';
		return n.toFixed(decimals);
	};

	const deltaOf = (row: InsightRow) => {
		if (typeof row.latest_avg !== 'number' || typeof row.baseline_avg !== 'number') return null;
		return row.latest_avg - row.baseline_avg;
	};
</script>

{#if !data.class}
	<h1>Turma não encontrada</h1>
	<p style="opacity:.7">Volte para o dashboard e selecione uma turma válida.</p>
{:else}
	<h1>Turma: {data.class.name}</h1>
	<p style="opacity:.7; font-size:12px;">
		Escala padrão da turma (fallback): {data.class.score_min} a {data.class.score_max} (dec:
		{data.class.score_decimals})
	</p>

	<hr />

	<h2>📊 Insights (Cockpit v1)</h2>

	<div style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:12px;">
		<div style="border:1px solid #ddd; padding:10px; border-radius:8px; min-width:220px;">
			<div style="opacity:.7; font-size:12px;">Média da turma (por skill, latest)</div>
			<div style="font-size:26px; font-weight:700;">
				{#if insightKpis.classAvg !== null}
					{insightKpis.classAvg.toFixed(2)}
				{:else}
					—
				{/if}
			</div>
			<div style="opacity:.7; font-size:12px;">Baseado no snapshot mais recente</div>
		</div>

		<div style="border:1px solid #ddd; padding:10px; border-radius:8px; min-width:220px;">
			<div style="opacity:.7; font-size:12px;">Skill mais crítica</div>
			<div style="font-size:16px; font-weight:700;">
				{insightKpis.criticalSkill?.skill_name ?? '—'}
			</div>
			<div style="opacity:.7; font-size:12px;">
				latest avg:
				{formatMaybe(insightKpis.criticalSkill?.latest_avg ?? null, 2)}
				• N:
				{insightKpis.criticalSkill?.latest_n ?? '—'}
			</div>
		</div>

		<div style="border:1px solid #ddd; padding:10px; border-radius:8px; min-width:220px;">
			<div style="opacity:.7; font-size:12px;">Skill mais forte</div>
			<div style="font-size:16px; font-weight:700;">
				{insightKpis.strongSkill?.skill_name ?? '—'}
			</div>
			<div style="opacity:.7; font-size:12px;">
				latest avg:
				{formatMaybe(insightKpis.strongSkill?.latest_avg ?? null, 2)}
				• N:
				{insightKpis.strongSkill?.latest_n ?? '—'}
			</div>
		</div>
	</div>

	<div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
		<form method="POST" action="?/generateSnapshot" use:enhance={enhanceSnapshot}>
			<button type="submit" id="autoSnapshotSubmit">
				{#if snapshotStatus === 'saving'}
					Gerando…
				{:else}
					Gerar snapshot (hoje)
				{/if}
			</button>
		</form>

		<label style="display:flex; align-items:center; gap:8px; font-size:14px; opacity:.9;">
			<input
				type="checkbox"
				checked={autoSnapshot}
				onchange={(e) => saveAutoSnapshot((e.target as HTMLInputElement).checked)}
			/>
			Auto snapshot ao abrir a turma (se não existir hoje)
		</label>

		<span style="opacity:.7; font-size:12px;">
			Hoje (UTC): {data.today} • Snapshot hoje: {data.hasTodaySnapshot ? 'sim' : 'não'}
		</span>
	</div>

	{#if snapshotStatus === 'error'}
		<p style="color:#b00020; margin-top:6px;">{snapshotError}</p>
	{/if}

	{#if insightRows.length > 0}
		<div style="margin-top:14px;">
			<h3>Baseline vs Latest (por skill)</h3>
			<table border="1" cellpadding="6">
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
					{#each insightRows as r}
						<tr>
							<td>{r.skill_name}</td>
							<td>
								{#if r.baseline_date}
									{r.baseline_date} • avg {formatMaybe(r.baseline_avg, 2)}
								{:else}
									—
								{/if}
							</td>
							<td>
								{#if r.latest_date}
									{r.latest_date} • avg {formatMaybe(r.latest_avg, 2)}
								{:else}
									—
								{/if}
							</td>
							<td>
								{#if deltaOf(r) !== null}
									{@const d = deltaOf(r)}
									<span
										style={d !== null && d < 0
											? 'color:#b00020; font-weight:600;'
											: 'color:#0b6; font-weight:600;'}
									>
										{d !== null ? d.toFixed(2) : '—'}
									</span>
								{:else}
									—
								{/if}
							</td>
							<td>{r.latest_n ?? '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>

			<p style="opacity:.7; font-size:12px; margin-top:6px;">
				Dica: gere snapshots ao final de cada avaliação/semana para ter evolução auditável.
			</p>
		</div>
	{:else}
		<p style="opacity:.7; margin-top:10px;">
			Nenhum snapshot ainda. Clique em <strong>“Gerar snapshot (hoje)”</strong> para começar o
			histórico.
		</p>
	{/if}

	<hr />

	<h2>Adicionar aluno</h2>
	<form method="POST" action="?/createStudent">
		<input name="name" placeholder="Nome do aluno" />
		<button type="submit">Adicionar</button>
	</form>

	{#if data.students.length > 0}
		<ul>
			{#each data.students as s}
				<li>{s.name}</li>
			{/each}
		</ul>
	{/if}

	<hr />

	<h2>Skills</h2>
	<form method="POST" action="?/createSkill" style="margin-bottom: 12px;">
		<input name="name" placeholder="Nome da skill" />
		<button type="submit">Criar skill</button>
	</form>

	{#if data.skills.length === 0}
		<p>Nenhuma skill ainda.</p>
	{:else}
		<ul>
			{#each data.skills as sk}
				<li style="margin-bottom: 10px;">
					<strong>{sk.name}</strong>

					<span style="opacity:.7; font-size:12px; margin-left:8px;">
						{#if sk.score_min !== null}
							Escala da skill: {sk.score_min}–{sk.score_max} (dec {sk.score_decimals})
						{:else}
							Escala: herdando da turma
						{/if}
					</span>

					<button type="button" style="margin-left:8px;" onclick={() => toggleEditingScale(sk.id)}>
						{editingScale[sk.id] ? 'Fechar' : 'Editar escala'}
					</button>

					<form method="POST" action="?/deleteSkill" style="display:inline; margin-left:8px;">
						<input type="hidden" name="skillId" value={sk.id} />
						<button type="submit" onclick={confirmDeleteSkill}>Deletar</button>
					</form>

					{#if editingScale[sk.id]}
						<div style="margin-top:8px; padding:8px; border:1px solid #ddd;">
							<form method="POST" action="?/updateSkillScale">
								<input type="hidden" name="skillId" value={sk.id} />

								<label style="margin-right:12px;">
									<input type="radio" name="mode" value="inherit" checked={sk.score_min === null} />
									Herdar da turma
								</label>

								<label style="margin-right:12px;">
									<input type="radio" name="mode" value="custom" checked={sk.score_min !== null} />
									Custom
								</label>

								<span style="margin-left:10px;">Min</span>
								<input
									name="score_min"
									type="number"
									step="any"
									value={sk.score_min ?? data.class.score_min}
									style="width:80px;"
								/>

								<span style="margin-left:10px;">Max</span>
								<input
									name="score_max"
									type="number"
									step="any"
									value={sk.score_max ?? data.class.score_max}
									style="width:80px;"
								/>

								<span style="margin-left:10px;">Dec</span>
								<input
									name="score_decimals"
									type="number"
									min="0"
									value={sk.score_decimals ?? data.class.score_decimals}
									style="width:70px;"
								/>

								<button type="submit" style="margin-left:10px;">Salvar</button>
							</form>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	<hr />

	<h2>Lançar Scores</h2>

	{#if data.students.length === 0 || data.skills.length === 0}
		<p>Crie alunos e skills primeiro.</p>
	{:else}
		<table border="1" cellpadding="6">
			<thead>
				<tr>
					<th>Aluno</th>
					{#each data.skills as sk}
						<th>{sk.name}</th>
					{/each}
				</tr>
			</thead>

			<tbody>
				{#each data.students as st}
					<tr>
						<td>{st.name}</td>

						{#each data.skills as sk}
							{@const k = keyOf(st.id, sk.id)}
							<td>
								<form method="POST" action="?/upsertScore" use:enhance={enhanceScore}>
									<input type="hidden" name="studentId" value={st.id} />
									<input type="hidden" name="skillId" value={sk.id} />

									<input
										name="score"
										inputmode="decimal"
										value={getScore(st.id, sk.id)}
										style={`width:70px; ${cellStyle(sk.id, getScore(st.id, sk.id))}`}
										onblur={(e) => {
											const form = (e.target as HTMLInputElement).form;
											if (form) form.requestSubmit();
										}}
										title={`Escala: ${effectiveScale(sk.id).min}–${effectiveScale(sk.id).max} (dec ${effectiveScale(sk.id).decimals})`}
									/>

									{#if status[k] === 'saving'}
										⏳
									{:else if status[k] === 'saved'}
										✅
									{:else if status[k] === 'error'}
										❌
									{/if}
								</form>

								{#if status[k] === 'error'}
									<div style="color:#b00020; font-size:12px; margin-top:4px;">
										{errorMsg[k]}
									</div>
								{/if}
							</td>
						{/each}
					</tr>
				{/each}

				<tr style="font-weight:bold; background:#f3f3f3;">
					<td>Média</td>
					{#each data.skills as sk}
						<td>{averageBySkill(sk.id)}</td>
					{/each}
				</tr>
			</tbody>
		</table>
	{/if}
{/if}