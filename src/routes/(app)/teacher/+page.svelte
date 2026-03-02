<script lang="ts">
	import { page } from '$app/stores';

	export let data: {
		classes: {
			id: string;
			name: string;
			created_at: string;
			score_min: number;
			score_max: number;
			score_decimals: number;
		}[];
		error: string | null;
		message?: string;
	};

	let newMin = 0;
	let newMax = 10;
	let newDecimals = 0;

	// mensagens vindas das actions (fail(...))
	$: formMessage = (($page.form as any)?.message as string | undefined) ?? undefined;

	const confirmDelete = (e: MouseEvent) => {
		if (!confirm('Deletar esta turma? Isso remove alunos, skills e scores.')) {
			e.preventDefault();
		}
	};
</script>

<h1>Teacher • Dashboard</h1>

<h2>Criar turma</h2>
<form method="POST" action="?/createClass">
	<input name="name" placeholder="Ex: 2º Ano A" />

	<span style="margin-left: 10px;">Escala padrão:</span>
	<label style="margin-left: 6px;">
		Min <input name="score_min" type="number" step="any" bind:value={newMin} style="width:70px;" />
	</label>
	<label style="margin-left: 6px;">
		Max <input name="score_max" type="number" step="any" bind:value={newMax} style="width:70px;" />
	</label>
	<label style="margin-left: 6px;">
		Dec <input name="score_decimals" type="number" min="0" bind:value={newDecimals} style="width:60px;" />
	</label>

	<button type="submit" style="margin-left: 8px;">Criar</button>
</form>

{#if formMessage}
	<p style="color:#b00020">{formMessage}</p>
{/if}

{#if data.error}
	<p style="color:red">{data.error}</p>
{/if}

<h2>Minhas turmas</h2>

{#if data.classes.length === 0}
	<p>Nenhuma turma ainda.</p>
{:else}
	<ul>
		{#each data.classes as c}
			<li style="margin-bottom: 10px;">
				<a href={`/teacher/${c.id}`}>{c.name}</a>
				<span style="opacity:.7; font-size:12px; margin-left:8px;">
					(escala padrão: {c.score_min} a {c.score_max}, dec: {c.score_decimals})
				</span>

				<form method="POST" action="?/deleteClass" style="display:inline; margin-left:10px;">
					<input type="hidden" name="classId" value={c.id} />
					<button type="submit" onclick={confirmDelete}>Deletar</button>
				</form>
			</li>
		{/each}
	</ul>
{/if}