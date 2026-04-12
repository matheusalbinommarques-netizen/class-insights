<script lang="ts">
	type Tone = 'healthy' | 'context' | 'attention' | 'alert' | 'neutral';
	type Size = 'sm' | 'md';

	type Props = {
		label: string;
		tone?: Tone;
		size?: Size;
		uppercase?: boolean;
		title?: string;
	};

	let { label, tone = 'neutral', size = 'sm', uppercase = false, title = '' }: Props = $props();
</script>

<span
	class={`app-pill app-pill--${tone} ${size === 'md' ? 'status-pill--md' : 'status-pill--sm'} ${uppercase ? 'status-pill--uppercase' : ''}`}
	title={title || undefined}
>
	{label}
</span>

<style>
	.status-pill--sm {
		min-height: 1.75rem;
		padding-inline: 0.75rem;
		font-size: 0.75rem;
	}

	.status-pill--md {
		min-height: 2rem;
		padding-inline: 0.9rem;
		font-size: 0.8125rem;
	}

	.status-pill--uppercase {
		text-transform: uppercase;
		letter-spacing: 0.14em;
	}
</style>
