<script lang="ts">
	import type { TeacherSubjectStatusTone } from '$lib/types/teacher';

	type Props = {
		label: string;
		tone: TeacherSubjectStatusTone;
	};

	let { label, tone }: Props = $props();

	function toneClass(value: TeacherSubjectStatusTone) {
		if (value === 'critical') return 'border-red-200 bg-red-50 text-red-700';
		if (value === 'attention') return 'border-amber-200 bg-amber-50 text-amber-700';
		if (value === 'healthy') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
		return 'border-slate-200 bg-slate-100 text-slate-700';
	}
</script>

<span
	class={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${toneClass(tone)}`}
>
	{label}
</span>
