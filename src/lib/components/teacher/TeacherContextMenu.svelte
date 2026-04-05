<script lang="ts">
	type ContextMenuTone = 'default' | 'danger';

	type ContextMenuItem = {
		id: string;
		label: string;
		href?: string;
		tone?: ContextMenuTone;
		disabled?: boolean;
	};

	type Props = {
		items: ContextMenuItem[];
		label?: string;
		align?: 'start' | 'end';
		onSelect?: (itemId: string) => void;
		buttonClass?: string;
		menuClass?: string;
	};

	let {
		items,
		label = 'Mais ações',
		align = 'end',
		onSelect = () => {},
		buttonClass = '',
		menuClass = ''
	}: Props = $props();

	let open = $state(false);
	let root: HTMLDivElement | null = null;

	function closeMenu() {
		open = false;
	}

	function toggleMenu() {
		open = !open;
	}

	function handleDocumentClick(event: MouseEvent) {
		if (!open || !root) return;

		const target = event.target;
		if (target instanceof Node && !root.contains(target)) {
			closeMenu();
		}
	}

	function handleDocumentKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeMenu();
		}
	}

	function handleSelect(item: ContextMenuItem) {
		if (item.disabled) return;

		closeMenu();

		if (!item.href) {
			onSelect(item.id);
		}
	}

	function itemClass(item: ContextMenuItem) {
		if (item.disabled) {
			return 'cursor-not-allowed text-slate-300';
		}

		if (item.tone === 'danger') {
			return 'text-red-600 hover:bg-red-50';
		}

		return 'text-slate-700 hover:bg-slate-50';
	}

	const alignmentClass = $derived(align === 'end' ? 'right-0' : 'left-0');
	const resolvedButtonClass = $derived(
		buttonClass ||
			'inline-flex h-13 w-13 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700'
	);
</script>

<svelte:document onclick={handleDocumentClick} onkeydown={handleDocumentKeydown} />

<div class="relative shrink-0" bind:this={root}>
	<button
		type="button"
		class={resolvedButtonClass}
		aria-label={label}
		aria-expanded={open}
		aria-haspopup="menu"
		onclick={toggleMenu}
	>
		<svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
			<circle cx="5" cy="12" r="1.8" />
			<circle cx="12" cy="12" r="1.8" />
			<circle cx="19" cy="12" r="1.8" />
		</svg>
	</button>

	{#if open}
		<div
			class={`absolute top-[calc(100%+0.5rem)] z-40 min-w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl ${alignmentClass} ${menuClass}`}
			role="menu"
		>
			{#each items as item (item.id)}
				{#if item.href}
					<a
						href={item.href}
						role="menuitem"
						class={`flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold transition ${itemClass(item)}`}
						aria-disabled={item.disabled}
						onclick={() => {
							if (!item.disabled) closeMenu();
						}}
					>
						{item.label}
					</a>
				{:else}
					<button
						type="button"
						role="menuitem"
						class={`flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm font-semibold transition ${itemClass(item)}`}
						disabled={item.disabled}
						onclick={() => handleSelect(item)}
					>
						{item.label}
					</button>
				{/if}
			{/each}
		</div>
	{/if}
</div>