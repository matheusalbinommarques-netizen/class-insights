<script lang="ts">
	export let student: {
		studentId: string;
		studentName: string;
		className: string;
		averageLabel: string;
		publishedAssessments: number;
	};
</script>

<article class="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
	<div class="flex items-start justify-between gap-3">
		<div>
			<h4 class="text-lg font-black tracking-tight text-slate-950">{student.studentName}</h4>
			<p class="mt-2 text-sm text-slate-600">{student.className}</p>
		</div>

		<a
			href={`/coord/students/${student.studentId}`}
			class="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
		>
			Ver aluno
		</a>
	</div>

	<p class="mt-4 text-sm text-slate-600">
		Média publicada: <strong class="text-red-600">{student.averageLabel} / 10</strong>
	</p>
	<p class="mt-2 text-sm text-slate-600">
		Base em {student.publishedAssessments} publicação(ões)
	</p>
</article>
