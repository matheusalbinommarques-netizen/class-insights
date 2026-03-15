<script lang="ts">
	type NavIcon = 'dashboard' | 'classes' | 'assessments' | 'subjects' | 'legacy';

	type Props = {
		icon: NavIcon;
	};

	let { icon }: Props = $props();
</script>

{#if icon === 'dashboard'}
	<svg
		class="h-5 w-5"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		aria-hidden="true"
	>
		<rect x="3" y="3" width="7" height="7" rx="1.5" />
		<rect x="14" y="3" width="7" height="7" rx="1.5" />
		<rect x="3" y="14" width="7" height="7" rx="1.5" />
		<rect x="14" y="14" width="7" height="7" rx="1.5" />
	</svg>
{:else if icon === 'classes'}
	<svg
		class="h-5 w-5"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		aria-hidden="true"
	>
		<rect x="3" y="5" width="18" height="16" rx="2" />
		<path stroke-linecap="round" stroke-linejoin="round" d="M16 3v4M8 3v4M3 10h18" />
	</svg>
{:else if icon === 'assessments'}
	<svg
		class="h-5 w-5"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		aria-hidden="true"
	>
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			d="M8 3h8l5 5v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
		/>
		<path stroke-linecap="round" stroke-linejoin="round" d="M16 3v5h5" />
		<path stroke-linecap="round" stroke-linejoin="round" d="M9 13h6M9 17h6" />
	</svg>
{:else if icon === 'subjects'}
	<svg
		class="h-5 w-5"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		aria-hidden="true"
	>
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3Z"
		/>
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			d="M8 4v16a3 3 0 0 0-3-3V7a3 3 0 0 1 3-3Z"
		/>
	</svg>
{:else}
	<svg
		class="h-5 w-5"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		aria-hidden="true"
	>
		<path stroke-linecap="round" stroke-linejoin="round" d="M8 7h8M8 12h8M8 17h5" />
		<rect x="3" y="4" width="18" height="16" rx="2" />
		<path stroke-linecap="round" stroke-linejoin="round" d="M6 4v16" />
	</svg>
{/if}
