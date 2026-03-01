<script lang="ts">
	export let data: {
		class: { id: string; name: string };
		students: { id: string; name: string }[];
	};
</script>

<h1>Turma: {data.class?.name}</h1>

<h2>Adicionar aluno</h2>

<form method="POST" action="?/createStudent">
	<input name="name" placeholder="Nome do aluno" />
	<button type="submit">Adicionar</button>
</form>

<h2>Alunos</h2>

{#if data.students.length === 0}
	<p>Nenhum aluno ainda.</p>
{:else}
	<ul>
		{#each data.students as s}
			<li>{s.name}</li>
		{/each}
	</ul>
{/if}