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

<h1>Importar Planilha</h1>

<h2>1) Preview</h2>
<form method="POST" action="?/preview" enctype="multipart/form-data" style="margin-bottom: 16px;">
	<input type="file" name="file" accept=".csv" />
	<button type="submit">Gerar preview</button>
</form>

{#if formState?.message}
	<p style="color: #b00020;">{formState.message}</p>
{/if}

{#if headers.length > 0}
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

	<h2>2) Validar</h2>

	<form method="POST" action="?/validate" enctype="multipart/form-data" style="margin-bottom: 16px;">
		<div style="margin-bottom: 10px;">
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
		</div>

		<div style="margin-bottom: 10px;">
			<label>
				CSV:
				<input type="file" name="file" accept=".csv" required />
			</label>
		</div>

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
	<p>
		Escala usada: <strong>{formState.scale.min}</strong> a <strong>{formState.scale.max}</strong> (decimais:
		<strong>{formState.scale.decimals}</strong>)
	</p>

	<ul>
		<li>Linhas no CSV: {formState.statsPreview.rowsTotal}</li>
		<li>Linhas ignoradas (sem aluno): {formState.statsPreview.rowsSkippedNoStudent}</li>
		<li>Alunos no arquivo: {formState.statsPreview.studentsInFile}</li>
		<li>Skills no arquivo: {formState.statsPreview.skillsInFile}</li>
		<li>Notas lidas: {formState.statsPreview.scoresParsed}</li>
	</ul>

	{#if formState.errors?.length > 0}
		<h3 style="color:#b00020;">Erros ({formState.errors.length})</h3>
		<ul>
			{#each formState.errors as e}
				<li>
					Linha {e.row} — {e.column}: {e.message}{#if e.value} (valor: "{e.value}"){/if}
				</li>
			{/each}
		</ul>
	{:else}
		<p style="color: green;"><strong>Sem erros ✅</strong></p>

		<h2>3) Aplicar</h2>
		<p style="opacity: 0.8; font-size: 12px;">
			Selecione o CSV novamente e clique em “Aplicar no banco”.
		</p>

		<form method="POST" action="?/apply" enctype="multipart/form-data">
			<input type="hidden" name="classId" value={selectedClassId} />
			<input type="hidden" name="studentColIndex" value={studentColIndex} />
			{#each Array.from(selectedSkillCols) as i}
				<input type="hidden" name="skillColIndex" value={i} />
			{/each}

			<label>
				CSV:
				<input type="file" name="file" accept=".csv" required />
			</label>
			<button type="submit" style="margin-left: 8px;">Aplicar no banco</button>
		</form>
	{/if}
{/if}

{#if formState?.stats}
	<hr />
	<h2>Aplicação concluída</h2>
	<ul>
		<li>Linhas no CSV: {formState.stats.rowsTotal}</li>
		<li>Linhas ignoradas (sem aluno): {formState.stats.rowsSkippedNoStudent}</li>
		<li>Alunos criados: {formState.stats.studentsCreated}</li>
		<li>Skills criadas: {formState.stats.skillsCreated}</li>
		<li>Scores upsertados: {formState.stats.scoresUpserted}</li>
		<li>Células ignoradas por inválidas: {formState.stats.cellsIgnoredInvalid}</li>
	</ul>
	<p style="opacity:0.8; font-size: 12px;">
		Escala usada: {formState.stats.scaleUsed.min} a {formState.stats.scaleUsed.max} (decimais: {formState.stats.scaleUsed.decimals})
	</p>
{/if}