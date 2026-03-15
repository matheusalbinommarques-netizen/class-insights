<script lang="ts">
	type Props = {
		teacherName: string;
		syncLabel: string;
	};

	let { teacherName, syncLabel }: Props = $props();
</script>

<section class="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
	<div class="min-w-0">
		<h1
			class="text-[2.1rem] font-extrabold leading-[1.04] tracking-tight text-slate-950 lg:text-[2.7rem]"
		>
			Painel do professor
		</h1>

		<p class="mt-2 text-[1.35rem] font-bold leading-tight text-slate-900 lg:text-[1.8rem]">
			Bem-vindo, {teacherName}
		</p>
	</div>

	<div
		class="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm"
	>
		<span class="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
		<span>{syncLabel}</span>
	</div>
</section>
