<script lang="ts">
	export let label = '';
	export let value = '';
	export let helper = '';
	export let tone: 'default' | 'attention' | 'info' = 'default';

	const toneClass =
		tone === 'attention'
			? 'border-amber-200 bg-amber-50'
			: tone === 'info'
				? 'border-sky-200 bg-sky-50'
				: 'border-slate-200 bg-white';

	const labelClass =
		tone === 'attention' ? 'text-amber-700' : tone === 'info' ? 'text-sky-700' : 'text-slate-500';

	const helperClass =
		tone === 'attention' ? 'text-amber-900' : tone === 'info' ? 'text-sky-900' : 'text-slate-600';
</script>

<div class={`rounded-2xl border p-4 ${toneClass}`}>
	<p class={`text-xs font-black uppercase tracking-[0.28em] ${labelClass}`}>{label}</p>
	<p class="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
	<p class={`mt-2 text-sm leading-6 ${helperClass}`}>{helper}</p>
</div>
