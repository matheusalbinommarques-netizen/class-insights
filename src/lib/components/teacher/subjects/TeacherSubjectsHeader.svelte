<script lang="ts">
	type Props = {
		title: string;
		subtitle: string;
		primaryHref: string;
		primaryLabel: string;
		secondaryHref?: string;
		secondaryLabel?: string;
	};

	let {
		title,
		subtitle,
		primaryHref,
		primaryLabel,
		secondaryHref = '',
		secondaryLabel = ''
	}: Props = $props();
</script>

<section class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
	<div class="max-w-3xl">
		<h1 class="text-[2.2rem] font-black tracking-tight text-slate-950 sm:text-[2.8rem]">
			{title}
		</h1>
		<p class="mt-3 text-base leading-8 text-slate-600 sm:text-[1.05rem]">
			{subtitle}
		</p>
	</div>

	<div class="flex flex-wrap items-center gap-3">
		<a
			href={primaryHref}
			class="inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white transition hover:bg-emerald-700"
		>
			{primaryLabel}
		</a>

		{#if secondaryHref && secondaryLabel}
			<a
				href={secondaryHref}
				class="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
			>
				{secondaryLabel}
			</a>
		{/if}
	</div>
</section>
