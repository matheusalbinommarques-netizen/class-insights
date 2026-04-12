<script lang="ts">
	type Tone = 'healthy' | 'context' | 'attention' | 'alert' | 'neutral';
	type ValueTone = 'default' | 'tone';

	type Props = {
		label: string;
		value: string;
		helper?: string;
		tone?: Tone;
		valueTone?: ValueTone;
		compact?: boolean;
	};

	let {
		label,
		value,
		helper = '',
		tone = 'neutral',
		valueTone = 'default',
		compact = false
	}: Props = $props();
</script>

<article class={`app-card metric-card ${compact ? 'metric-card--compact' : ''}`} data-tone={tone}>
	<div class="app-metric">
		<p class="app-metric-label">{label}</p>
		<p class={`app-metric-value ${valueTone === 'tone' ? 'metric-card__value--tone' : ''}`}>
			{value}
		</p>

		{#if helper}
			<p class="app-metric-helper">{helper}</p>
		{/if}
	</div>
</article>

<style>
	.metric-card {
		background: var(--tone-bg, var(--color-surface));
		border-color: var(--tone-border, var(--color-border));
		box-shadow: var(--shadow-sm);
	}

	.metric-card--compact {
		padding: 1rem;
	}

	.metric-card :global(.app-metric-label) {
		color: var(--tone-text, var(--color-text-muted));
	}

	.metric-card :global(.app-metric-helper) {
		color: var(--tone-text-strong, var(--color-text-soft));
	}

	.metric-card__value--tone {
		color: var(--tone-text-strong, var(--color-text));
	}
</style>
