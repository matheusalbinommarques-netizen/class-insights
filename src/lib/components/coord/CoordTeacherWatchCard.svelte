<script lang="ts">
	export let teacher: {
		teacherId: string;
		teacherName: string;
		classesCount: number;
		averageLabel: string;
		publishedAssessments: number;
		primaryReason?: string;
		detailHref?: string;
	};
</script>

<article class="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
	<h4 class="text-lg font-black tracking-tight text-slate-950">{teacher.teacherName}</h4>

	{#if teacher.primaryReason}
		<p class="mt-3 text-sm leading-6 text-slate-600">{teacher.primaryReason}</p>
	{/if}

	<p class="mt-3 text-sm text-slate-600">{teacher.classesCount} turma(s) no escopo</p>
	<p class="mt-2 text-sm text-slate-600">
		Média publicada: <strong class="text-slate-900">{teacher.averageLabel} / 10</strong>
	</p>
	<p class="mt-2 text-sm text-slate-600">
		Publicações: <strong class="text-slate-900">{teacher.publishedAssessments}</strong>
	</p>

	{#if teacher.detailHref}
		<div class="mt-4 flex justify-end">
			<a
				href={teacher.detailHref}
				class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
			>
				Ver professor
			</a>
		</div>
	{/if}
</article>
