<script lang="ts">
	export let data: {
		classes: { id: string; name: string; created_at: string }[];
		error: string | null;
	};
</script>

<h1>Teacher • Dashboard</h1>

<h2>Criar turma</h2>

<form method="POST" action="?/createClass">
	<input name="name" placeholder="Ex: 2º Ano A" />
	<button type="submit">Criar</button>
</form>

{#if data.error}
	<p style="color:red">{data.error}</p>
{/if}

<h2>Minhas turmas</h2>

{#if data.classes.length === 0}
	<p>Nenhuma turma ainda.</p>
{:else}
	<ul>
		{#each data.classes as c}
			<li>
	        <a href={`/teacher/${c.id}`}>{c.name}</a>
            </li>
		{/each}
	</ul>
{/if}