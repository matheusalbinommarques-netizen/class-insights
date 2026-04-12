<script lang="ts">
	type Tone = 'healthy' | 'context' | 'attention' | 'alert' | 'neutral';
	type PrimaryTone = 'brand' | 'healthy';

	type Props = {
		eyebrow: string;
		title: string;
		description: string;
		tone?: Tone;
		primaryHref: string;
		primaryLabel: string;
		secondaryHref?: string;
		secondaryLabel?: string;
		primaryTone?: PrimaryTone;
	};

	let {
		eyebrow,
		title,
		description,
		tone = 'attention',
		primaryHref,
		primaryLabel,
		secondaryHref,
		secondaryLabel,
		primaryTone = 'brand'
	}: Props = $props();
</script>

<section class="app-card next-step-card" data-tone={tone}>
	<div class="next-step-card__body">
		<p class="next-step-card__eyebrow">{eyebrow}</p>
		<h3 class="next-step-card__title">{title}</h3>
		<p class="next-step-card__description">{description}</p>
	</div>

	<div class="next-step-card__actions">
		{#if secondaryHref && secondaryLabel}
			<a href={secondaryHref} class="app-button-secondary">
				{secondaryLabel}
			</a>
		{/if}

		<a
			href={primaryHref}
			class={`app-button ${primaryTone === 'healthy' ? 'next-step-card__primary--healthy' : ''}`}
		>
			{primaryLabel}
		</a>
	</div>
</section>

<style>
	.next-step-card {
		display: grid;
		gap: 1rem;
		background: var(--tone-bg, var(--color-surface));
		border-color: var(--tone-border, var(--color-border));
	}

	.next-step-card__body {
		display: grid;
		gap: 0.5rem;
		min-width: 0;
	}

	.next-step-card__eyebrow {
		font-size: 0.72rem;
		font-weight: 900;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--tone-text, var(--color-text-muted));
	}

	.next-step-card__title {
		font-size: 1.05rem;
		font-weight: 900;
		line-height: 1.25;
		color: var(--color-text);
	}

	.next-step-card__description {
		font-size: 0.95rem;
		line-height: 1.7;
		color: var(--color-text-soft);
	}

	.next-step-card__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.next-step-card__primary--healthy {
		background: var(--status-healthy-text);
	}

	.next-step-card__primary--healthy:hover {
		background: var(--status-healthy-text-strong);
	}

	@media (min-width: 1024px) {
		.next-step-card {
			grid-template-columns: minmax(0, 1fr) auto;
			align-items: center;
		}

		.next-step-card__actions {
			justify-content: flex-end;
		}
	}
</style>
