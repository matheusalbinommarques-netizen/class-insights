<script lang="ts">
	export let classItem: {
		classId: string;
		className: string;
		teacherName: string;
		accessCode: string | null;
		studentsCount: number;
		publishedAssessments: number;
		averageLabel: string;
		riskStudents: number;
		tone: 'healthy' | 'attention' | 'critical';
		primaryReason?: string;
		detailHref?: string;
	};

	const toneLabel = (tone: 'healthy' | 'attention' | 'critical') => {
		if (tone === 'critical') return 'Crítica';
		if (tone === 'attention') return 'Atenção';
		return 'Dentro do esperado';
	};

	const toneClass = (tone: 'healthy' | 'attention' | 'critical') => {
		if (tone === 'critical') return 'border-red-200 bg-red-50 text-red-700';
		if (tone === 'attention') return 'border-amber-200 bg-amber-50 text-amber-700';
		return 'border-emerald-200 bg-emerald-50 text-emerald-700';
	};
</script>

<article class="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
	<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
		<div class="min-w-0">
			<div class="flex flex-wrap items-center gap-2">
				<h4 class="text-xl font-black tracking-tight text-slate-950">{classItem.className}</h4>
				<span
					class={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${toneClass(classItem.tone)}`}
				>
					{toneLabel(classItem.tone)}
				</span>
			</div>

			<p class="mt-2 text-sm text-slate-600">
				Professor responsável: <strong class="text-slate-900">{classItem.teacherName}</strong>
			</p>

			{#if classItem.accessCode}
				<p class="mt-2 text-xs font-black uppercase tracking-[0.25em] text-slate-500">
					Código {classItem.accessCode}
				</p>
			{/if}

			{#if classItem.primaryReason}
				<p class="mt-3 text-sm leading-6 text-slate-600">{classItem.primaryReason}</p>
			{/if}
		</div>

		<div class="text-left lg:text-right">
			<p class="text-sm font-semibold text-slate-500">Média publicada</p>
			<p class="mt-1 text-2xl font-black tracking-tight text-slate-950">
				{classItem.averageLabel} / 10
			</p>
		</div>
	</div>

	<div class="mt-4 grid gap-3 sm:grid-cols-3">
		<div class="rounded-2xl border border-slate-200 bg-white p-4">
			<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Alunos</p>
			<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
				{classItem.studentsCount}
			</p>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-white p-4">
			<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Em risco</p>
			<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">{classItem.riskStudents}</p>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-white p-4">
			<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Publicações</p>
			<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
				{classItem.publishedAssessments}
			</p>
		</div>
	</div>

	{#if classItem.detailHref}
		<div class="mt-4 flex justify-end">
			<a
				href={classItem.detailHref}
				class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
			>
				Ver turma
			</a>
		</div>
	{/if}
</article>
