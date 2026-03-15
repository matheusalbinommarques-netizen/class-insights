<script lang="ts">
	type IconName = 'dashboard' | 'classes' | 'assessments' | 'subjects' | 'legacy';

	type Props = {
		icon: IconName;
		class?: string;
	};

	let { icon, class: className = 'h-5 w-5' }: Props = $props();
</script>

<svg
	class={className}
	fill="none"
	viewBox="0 0 24 24"
	stroke="currentColor"
	stroke-width="1.8"
	aria-hidden="true"
>
	{#if icon === 'dashboard'}
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			d="M4 5h7v6H4V5Zm9 0h7v4h-7V5ZM4 13h7v6H4v-6Zm9-2h7v8h-7v-8Z"
		/>
	{:else if icon === 'classes'}
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			d="M4 7h16M7 4v6m10-6v6M5 20h14a1 1 0 0 0 1-1v-6H4v6a1 1 0 0 0 1 1Z"
		/>
	{:else if icon === 'assessments'}
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			d="M8 6h8M8 10h8M8 14h5M7 3h10l3 3v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
		/>
	{:else if icon === 'subjects'}
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			d="M5 6.5A2.5 2.5 0 0 1 7.5 4H20v14H7.5A2.5 2.5 0 0 0 5 20.5V6.5ZM5 6.5V20m0 0H20"
		/>
	{:else}
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			d="M4 6h7v7H4V6Zm9 0h7v5h-7V6ZM4 15h7v5H4v-5Zm11-1v6m-3-3h6"
		/>
	{/if}
</svg>
