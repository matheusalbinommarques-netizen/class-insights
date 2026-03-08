<script lang="ts">
	import { page } from '$app/stores';

	export let data: {
		classes: { id: string; name: string; score_min: number; score_max: number; score_decimals: number }[];
	};

	// $page.form (server actions result)
	$: formState = $page.form as any;

	$: headers = (formState?.headers ?? []) as string[];
	$: preview = (formState?.preview ?? []) as string[][];
	$: studentGuess = (formState?.studentGuess ?? 0) as number;
	$: jobId = (formState?.jobId ?? '') as string;

	let selectedClassId = '';
	let studentColIndex = 0;
	let selectedSkillCols = new Set<number>();

	// quando chega preview novo, inicializa sugestão
	$: if (headers.length > 0) {
		studentColIndex = studentGuess;

		const next = new Set<number>();
		for (let i = 0; i < headers.length; i++) {
			if (i !== studentGuess) next.add(i);
		}
		selectedSkillCols = next;
	}

	const toggleSkill = (i: number) => {
		const next = new Set(selectedSkillCols);
		if (next.has(i)) next.delete(i);
		else next.add(i);
		selectedSkillCols = next;
	};
</script>

<h1>Importar Planilha (Staging)</h1>

<h2>1) Upload + Preview (gera Job)</h2>
<form method="POST" action="?/preview" enctype="multipart/form-data" style="margin-bottom: 16px;">
	<label>
		Turma:
		<select name="classId" bind:value={selectedClassId} required>
			<option value="" disabled selected>Selecione...</option>
			{#each data.classes as c}
				<option value={c.id}>
					{c.name} (escala {c.score_min}–{c.score_max}, dec {c.score_decimals})
				</option>
			{/each}
		</select>
	</label>

	<div style="margin-top: 8px;">
		<input type="file" name="file" accept=".csv" required />
		<button type="submit" style="margin-left: 8px;">Gerar preview</button>
	</div>
</form>

{#if formState?.message}
	<p style="color: #b00020;">{formState.message}</p>
{/if}

{#if headers.length > 0}
	<p style="opacity:.8; font-size:12px;">Job criado: <strong>{jobId}</strong></p>

	<h3>Preview (primeiras {preview.length} linhas)</h3>
	<table border="1" cellpadding="6" style="margin-bottom: 16px;">
		<thead>
			<tr>
				{#each headers as h, i}
					<th>{i}: {h}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each preview as row}
				<tr>
					{#each headers as _, i}
						<td>{row[i] ?? ''}</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>

	<hr />

	<h2>2) Mapear + Validar (preflight 100%)</h2>

	<form method="POST" action="?/validate" style="margin-bottom: 16px;">
		<input type="hidden" name="jobId" value={jobId} />

		<div style="margin-bottom: 10px;">
			<label>
				Coluna do aluno:
				<select name="studentColIndex" bind:value={studentColIndex}>
					{#each headers as h, i}
						<option value={i}>{i}: {h}</option>
					{/each}
				</select>
			</label>
		</div>

		<div style="margin-bottom: 10px;">
			<p><strong>Colunas de skills:</strong></p>
			{#each headers as h, i}
				{#if i !== studentColIndex}
					<label style="display: block; margin-bottom: 4px;">
						<input
							type="checkbox"
							name="skillColIndex"
							value={i}
							checked={selectedSkillCols.has(i)}
							onchange={() => toggleSkill(i)}
						/>
						{i}: {h}
					</label>
				{/if}
			{/each}
		</div>

		<button type="submit">Validar</button>
	</form>
{/if}

{#if formState?.statsPreview}
	<hr />
	<h2>Resultado da validação</h2>

	{#if formState.scale}
		<p>
			Escala usada (turma): <strong>{formState.scale.min}</strong> a <strong>{formState.scale.max}</strong>
			(decimais: <strong>{formState.scale.decimals}</strong>)
		</p>
	{/if}

	<p>Linhas staged: {formState.statsPreview.rowsTotal}</p>

	{#if formState.errors?.length > 0}
		<h3 style="color:#b00020;">Erros ({formState.errors.length})</h3>
		<ul>
			{#each formState.errors as e}
				<li>
					{#if e.row_index === 0}
						Header — col {e.column_index}: {e.message}
					{:else}
						Linha {e.row_index} — {e.column_name}: {e.message}{#if e.value} (valor: "{e.value}"){/if}
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<p style="color: green;"><strong>Sem erros ✅ (pode aplicar)</strong></p>

		<h2>3) Aplicar no banco (atômico)</h2>
		<form method="POST" action="?/apply">
			<input type="hidden" name="jobId" value={formState.jobId} />
			<button type="submit">Aplicar</button>
		</form>
	{/if}
{/if}

{#if formState?.applied}
	<hr />
	<h2>Aplicação concluída ✅</h2>
	<ul>
		<li>Linhas no job: {formState.applied.rowsTotal}</li>
		<li>Alunos criados: {formState.applied.studentsCreated}</li>
		<li>Skills criadas: {formState.applied.skillsCreated}</li>
		<li>Scores upsertados: {formState.applied.scoresUpserted}</li>
	</ul>
{/if}