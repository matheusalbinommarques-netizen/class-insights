<script lang="ts">
	export let eyebrow = '';
	export let title = '';
	export let description = '';
</script>

<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
	<div>
		{#if eyebrow}
			<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">{eyebrow}</p>
		{/if}
		{#if title}
			<h3 class="mt-2 text-2xl font-black tracking-tight text-slate-950">{title}</h3>
		{/if}
	</div>

	{#if description}
		<div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
			{description}
		</div>
	{/if}
</div>
