<script lang="ts">
	import MetricCard from '$lib/components/shared/MetricCard.svelte';

	type Tone = 'default' | 'attention' | 'info';

	type Props = {
		label?: string;
		value?: string;
		helper?: string;
		tone?: Tone;
	};

	let { label = '', value = '', helper = '', tone = 'default' }: Props = $props();

	const semanticTone = $derived(
		tone === 'attention' ? 'attention' : tone === 'info' ? 'context' : 'neutral'
	);
</script>

<MetricCard
	{label}
	{value}
	{helper}
	tone={semanticTone}
	valueTone={tone === 'attention' ? 'tone' : 'default'}
/>
