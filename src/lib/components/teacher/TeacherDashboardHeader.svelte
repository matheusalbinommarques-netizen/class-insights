<script lang="ts">
	import type { TeacherDashboardPageData } from '$lib/types/teacher';

	type Props = {
		teacherName: TeacherDashboardPageData['teacherName'];
		syncLabel: TeacherDashboardPageData['syncLabel'];
	};

	let { teacherName, syncLabel }: Props = $props();
</script>

<section
	class="teacher-dashboard-header mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
>
	<div>
		<h1 class="text-3xl font-black tracking-tight text-slate-950 lg:text-5xl">
			Painel do professor &ndash; Bem-vindo, {teacherName}
		</h1>
	</div>

	<div
		class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm"
	>
		<span
			class="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"
		>
			<svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
				<path
					fill-rule="evenodd"
					d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.53-9.28a.75.75 0 0 0-1.06-1.06L9.25 10.88 7.53 9.16a.75.75 0 1 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.06 0l3.75-3.75Z"
					clip-rule="evenodd"
				/>
			</svg>
		</span>
		<span>{syncLabel}</span>
	</div>
</section>
