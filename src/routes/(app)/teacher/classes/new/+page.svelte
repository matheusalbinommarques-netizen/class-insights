<script lang="ts">
	import { resolve } from '$app/paths';

	type CreateClassValues = {
		name: string;
		score_min: string;
		score_max: string;
		score_decimals: string;
	};

	type FormFeedback = {
		action?: 'createClass';
		message?: string;
		values?: CreateClassValues;
	};

	type PageData = {
		initialValues: CreateClassValues;
	};

	type Props = {
		data: PageData;
		form?: FormFeedback | null;
	};

	let { data, form = null }: Props = $props();

	const values = $derived(form?.values ?? data.initialValues);
	const hasError = $derived(Boolean(form?.message));
</script>

<svelte:head>
	<title>Class Insights - Criar turma</title>
</svelte:head>

<div class="grid gap-6">
	<section class="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.95fr)]">
		<div class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
			<a
				href={resolve('/teacher')}
				class="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-900"
			>
				<span aria-hidden="true">←</span>
				Voltar para o painel
			</a>

			<p class="mt-5 text-xs font-black uppercase tracking-[0.35em] text-slate-500">
				Fluxo principal do professor
			</p>

			<h1 class="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
				Criar turma
			</h1>

			<p class="mt-4 max-w-3xl text-base leading-8 text-slate-600">
				Defina o nome da turma e a escala padrão que será usada nas avaliações. Depois da criação,
				você já entra na turma para continuar o fluxo do professor.
			</p>
		</div>

		<aside class="rounded-4xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
			<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
				O que você define agora
			</p>

			<div class="mt-4 space-y-4">
				<div class="rounded-3xl border border-slate-200 bg-white p-4">
					<p class="text-sm font-bold text-slate-900">Identidade da turma</p>
					<p class="mt-2 text-sm leading-7 text-slate-600">
						O nome ajuda a localizar a turma rapidamente nas próximas telas.
					</p>
				</div>

				<div class="rounded-3xl border border-slate-200 bg-white p-4">
					<p class="text-sm font-bold text-slate-900">Escala padrão</p>
					<p class="mt-2 text-sm leading-7 text-slate-600">
						Essa escala vira a referência inicial para avaliações e lançamentos.
					</p>
				</div>

				<div class="rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
					<p class="text-sm font-bold text-emerald-800">Próximo passo</p>
					<p class="mt-2 text-sm leading-7 text-emerald-900">
						Depois de criar, você será levado direto para a turma.
					</p>
				</div>
			</div>
		</aside>
	</section>

	<section class="rounded-4xl border border-slate-200 bg-white shadow-sm">
		<div class="border-b border-slate-200 px-6 py-5">
			<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Dados da turma</p>
			<h2 class="mt-2 text-3xl font-black tracking-tight text-slate-950">
				Comece pela base operacional
			</h2>
			<p class="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
				Mantenha este primeiro cadastro simples. Você poderá seguir para matérias, avaliações e
				alunos depois.
			</p>
		</div>

		{#if hasError}
			<div class="px-6 pt-6">
				<div
					class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
				>
					{form?.message}
				</div>
			</div>
		{/if}

		<form method="POST" action="?/createClass" class="p-6">
			<div class="grid gap-6">
				<div>
					<label for="name" class="block text-sm font-black text-slate-900">Nome da turma</label>
					<input
						id="name"
						name="name"
						type="text"
						value={values.name}
						placeholder="Ex.: 2º Ano A"
						class="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
						autocomplete="off"
						required
					/>
					<p class="mt-2 text-sm leading-6 text-slate-500">
						Use um nome claro para identificar a turma nas listas e análises.
					</p>
				</div>

				<div class="rounded-3xl border border-slate-200 bg-slate-50 p-5">
					<div class="max-w-3xl">
						<p class="text-sm font-black text-slate-900">Escala padrão da turma</p>
						<p class="mt-2 text-sm leading-7 text-slate-600">
							Essa escala será usada como base nas avaliações da turma.
						</p>
					</div>

					<div class="mt-5 grid gap-4 md:grid-cols-3">
						<div>
							<label for="score_min" class="block text-sm font-bold text-slate-900">
								Nota mínima
							</label>
							<input
								id="score_min"
								name="score_min"
								type="text"
								inputmode="decimal"
								value={values.score_min}
								placeholder="0"
								class="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
								required
							/>
						</div>

						<div>
							<label for="score_max" class="block text-sm font-bold text-slate-900">
								Nota máxima
							</label>
							<input
								id="score_max"
								name="score_max"
								type="text"
								inputmode="decimal"
								value={values.score_max}
								placeholder="10"
								class="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
								required
							/>
						</div>

						<div>
							<label for="score_decimals" class="block text-sm font-bold text-slate-900">
								Casas decimais
							</label>
							<input
								id="score_decimals"
								name="score_decimals"
								type="number"
								min="0"
								max="6"
								step="1"
								value={values.score_decimals}
								placeholder="0"
								class="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
								required
							/>
						</div>
					</div>
				</div>

				<div
					class="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between"
				>
					<a
						href={resolve('/teacher')}
						class="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
					>
						Cancelar
					</a>

					<button
						type="submit"
						class="inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-600 px-6 text-sm font-black text-white transition hover:bg-emerald-700"
					>
						Criar turma
					</button>
				</div>
			</div>
		</form>
	</section>
</div>
