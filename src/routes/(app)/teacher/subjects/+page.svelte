<script lang="ts">
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import type {
		TeacherClassOption,
		TeacherSchemaState,
		TeacherSubjectCard
	} from '$lib/types/teacher';

	type Feedback = {
		action?: 'createSubject' | 'linkSubjectToClass';
		message?: string;
		success?: boolean;
	};

	type Props = {
		data: {
			schema: TeacherSchemaState;
			classes: TeacherClassOption[];
			subjects: TeacherSubjectCard[];
			summary: {
				totalSubjects: number;
				totalLinks: number;
			};
		};
	};

	let { data }: Props = $props();

	const formState = $derived(($page.form ?? null) as Feedback | null);
	const formMessage = $derived(formState?.message ?? null);
	const formSuccess = $derived(formState?.success ?? false);

	let selectedClassId = $state('');

	$effect(() => {
		if (!selectedClassId && data.classes[0]) {
			selectedClassId = data.classes[0].id;
		}
	});

	function classesWithoutSubject(subject: TeacherSubjectCard) {
		return data.classes.filter((classItem) => !subject.classIds.includes(classItem.id));
	}
</script>

<svelte:head>
	<title>Class Insights - Materias</title>
</svelte:head>

<div class="space-y-6">
	<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
		<div class="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
			<div class="max-w-3xl">
				<p class="text-xs font-black uppercase tracking-widest text-slate-500">
					Contexto academico
				</p>
				<h1 class="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
					Materias e vinculos por turma
				</h1>
				<p class="mt-3 text-base leading-8 text-slate-600">
					Esta area fecha a base que faltava para a V1 academica: cada turma passa a ter materias
					formais, e as avaliacoes nascem desse vinculo para organizar a operacao no fluxo novo.
				</p>
			</div>

			<div class="grid gap-3 sm:grid-cols-2 xl:w-full xl:max-w-md">
				<div class="rounded-2xl border border-slate-200 bg-white p-4">
					<p class="text-xs font-black uppercase tracking-widest text-slate-500">Materias</p>
					<p class="mt-2 text-3xl font-black text-slate-950">{data.summary.totalSubjects}</p>
				</div>

				<div class="rounded-2xl border border-sky-200 bg-sky-50 p-4">
					<p class="text-xs font-black uppercase tracking-widest text-sky-700">Vinculos</p>
					<p class="mt-2 text-3xl font-black text-slate-950">{data.summary.totalLinks}</p>
				</div>
			</div>
		</div>
	</section>

	{#if formMessage}
		<div
			class={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
				formSuccess
					? 'border-emerald-200 bg-emerald-50 text-emerald-700'
					: 'border-red-200 bg-red-50 text-red-700'
			}`}
		>
			{formMessage}
		</div>
	{/if}

	{#if !data.schema.ready}
		<section class="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
			<p class="text-xs font-black uppercase tracking-widest text-amber-700">Schema pendente</p>
			<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
				Materias ainda nao disponiveis neste ambiente
			</h2>
			<p class="mt-3 text-sm leading-7 text-slate-700">{data.schema.message}</p>
		</section>
	{:else}
		<div class="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
			<section class="space-y-6">
				<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<div class="flex items-start justify-between gap-4">
						<div>
							<p class="text-xs font-black uppercase tracking-widest text-slate-500">Catalogo</p>
							<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">Nova materia</h2>
						</div>

						<a
							href={resolve('/teacher/assessments')}
							class="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
						>
							Ir para avaliacoes
						</a>
					</div>

					<form method="POST" action="?/createSubject" class="mt-5 space-y-4">
						<label class="space-y-2 text-sm font-bold text-slate-700">
							<span>Nome</span>
							<input
								name="name"
								placeholder="Ex: Matematica, Redacao, Ciencias"
								class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
							/>
						</label>

						<label class="space-y-2 text-sm font-bold text-slate-700">
							<span>Codigo</span>
							<input
								name="code"
								placeholder="Opcional. Ex: MAT, RED, BIO"
								class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base uppercase text-slate-900 outline-none transition placeholder:normal-case placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
							/>
						</label>

						<button
							type="submit"
							class="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800"
						>
							Criar materia
						</button>
					</form>
				</section>

				<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<p class="text-xs font-black uppercase tracking-widest text-slate-500">Vinculo</p>
					<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
						Associar materia a turma
					</h2>

					{#if data.classes.length === 0 || data.subjects.length === 0}
						<div
							class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600"
						>
							Voce precisa ter pelo menos uma turma e uma materia criada para montar o contexto
							acadêmico.
						</div>
					{:else}
						<form method="POST" action="?/linkSubjectToClass" class="mt-5 space-y-4">
							<label class="space-y-2 text-sm font-bold text-slate-700">
								<span>Turma</span>
								<select
									name="class_id"
									bind:value={selectedClassId}
									class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
								>
									{#each data.classes as classItem (classItem.id)}
										<option value={classItem.id}>{classItem.name}</option>
									{/each}
								</select>
							</label>

							<label class="space-y-2 text-sm font-bold text-slate-700">
								<span>Materia</span>
								<select
									name="subject_id"
									class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
								>
									{#each data.subjects as subject (subject.id)}
										<option value={subject.id}>
											{subject.name}{subject.code ? ` (${subject.code})` : ''}
										</option>
									{/each}
								</select>
							</label>

							<button
								type="submit"
								class="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800"
							>
								Vincular materia
							</button>
						</form>
					{/if}
				</section>
			</section>

			<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
				<p class="text-xs font-black uppercase tracking-widest text-slate-500">Mapa academico</p>
				<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">Materias cadastradas</h2>

				{#if data.subjects.length === 0}
					<div
						class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"
					>
						<h3 class="text-lg font-black text-slate-950">Nenhuma materia ainda</h3>
						<p class="mt-2 text-sm leading-7 text-slate-600">
							Crie as materias da escola antes de abrir o fluxo de avaliacoes.
						</p>
					</div>
				{:else}
					<div class="mt-5 space-y-3">
						{#each data.subjects as subject (subject.id)}
							<article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
									<div class="min-w-0">
										<div class="flex flex-wrap items-center gap-2">
											<p class="text-base font-black text-slate-950">{subject.name}</p>
											{#if subject.code}
												<span
													class="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-widest text-slate-700"
												>
													{subject.code}
												</span>
											{/if}
										</div>

										<p class="mt-2 text-sm leading-7 text-slate-600">
											{subject.classNames.length > 0
												? `Vinculada a ${subject.classNames.length} turma(s).`
												: 'Ainda nao vinculada a nenhuma turma.'}
										</p>
									</div>

									<div
										class="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-700"
									>
										{subject.classNames.length} vinculo(s)
									</div>
								</div>

								{#if subject.classNames.length > 0}
									<div class="mt-4 flex flex-wrap gap-2">
										{#each subject.classNames as className (className)}
											<span
												class="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700"
											>
												{className}
											</span>
										{/each}
									</div>
								{/if}

								{#if classesWithoutSubject(subject).length > 0}
									<div class="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">
											Ainda pode entrar em
										</p>
										<div class="mt-3 flex flex-wrap gap-2">
											{#each classesWithoutSubject(subject) as classItem (classItem.id)}
												<span
													class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700"
												>
													{classItem.name}
												</span>
											{/each}
										</div>
									</div>
								{/if}
							</article>
						{/each}
					</div>
				{/if}
			</section>
		</div>
	{/if}
</div>
