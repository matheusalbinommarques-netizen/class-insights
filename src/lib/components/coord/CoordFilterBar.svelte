<script lang="ts">
	type Option = {
		value: string;
		label: string;
	};

	export let searchQuery = '';
	export let statusFilter = 'all';
	export let sortMode = 'priority';
	export let searchPlaceholder = 'Buscar no painel';
	export let resultsSummary = '';
	export let statusOptions: Option[] = [];
	export let sortOptions: Option[] = [];
</script>

<div class="rounded-4xl border border-slate-200 bg-white p-5 shadow-sm">
	<div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
		<div class="grid flex-1 gap-4 md:grid-cols-[minmax(0,1.4fr)_220px_220px]">
			<label class="grid gap-2">
				<span class="text-sm font-bold text-slate-700">Buscar</span>
				<input
					bind:value={searchQuery}
					type="text"
					placeholder={searchPlaceholder}
					autocomplete="off"
					class="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
				/>
			</label>

			<label class="grid gap-2">
				<span class="text-sm font-bold text-slate-700">Situação</span>
				<select
					bind:value={statusFilter}
					class="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white"
				>
					{#each statusOptions as option (option.value)}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</label>

			<label class="grid gap-2">
				<span class="text-sm font-bold text-slate-700">Ordenação</span>
				<select
					bind:value={sortMode}
					class="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white"
				>
					{#each sortOptions as option (option.value)}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</label>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
			<p class="font-semibold text-slate-800">Leitura filtrada</p>
			<p class="mt-1 leading-6">{resultsSummary}</p>
		</div>
	</div>
</div>
