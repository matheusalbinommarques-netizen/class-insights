<script lang="ts">
	import { invalidateAll } from '$app/navigation';

	import { supabase } from '$lib/services/supabaseClient';

	type Tone = 'teacher' | 'student' | 'coord';

	type Props = {
		profileId: string | null | undefined;
		displayName: string | null | undefined;
		tone?: Tone;
	};

	let { profileId, displayName, tone = 'teacher' }: Props = $props();

	let draftName = $state('');
	let saving = $state(false);
	let errorMessage = $state('');

	const shouldPrompt = $derived(Boolean(profileId) && needsNamePrompt(displayName));

	$effect(() => {
		const normalizedDisplayName = displayName?.trim() ?? '';
		if (!draftName && normalizedDisplayName) {
			draftName = normalizedDisplayName;
		}
	});

	function needsNamePrompt(value: string | null | undefined) {
		const normalized = value?.trim().toLowerCase() ?? '';
		return (
			!normalized || normalized === 'usuario' || normalized === 'usuário' || normalized === 'user'
		);
	}

	function toneClasses(value: Tone) {
		if (value === 'student') {
			return {
				panel: 'border-sky-200 bg-white',
				badge: 'border-sky-200 bg-sky-50 text-sky-700',
				button: 'bg-sky-600 hover:bg-sky-700 focus:ring-sky-100'
			};
		}

		if (value === 'coord') {
			return {
				panel: 'border-amber-200 bg-white',
				badge: 'border-amber-200 bg-amber-50 text-amber-700',
				button: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-100'
			};
		}

		return {
			panel: 'border-slate-200 bg-white',
			badge: 'border-slate-200 bg-slate-100 text-slate-700',
			button: 'bg-slate-900 hover:bg-slate-800 focus:ring-slate-200'
		};
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';

		const normalizedName = draftName.trim();
		if (!normalizedName) {
			errorMessage = 'Digite seu nome para continuar.';
			return;
		}

		if (!profileId) {
			errorMessage = 'Perfil não encontrado para salvar o nome.';
			return;
		}

		saving = true;

		try {
			const { error: profileError } = await supabase
				.from('profiles')
				.update({ display_name: normalizedName })
				.eq('id', profileId);

			if (profileError) {
				throw profileError;
			}

			const { error: authError } = await supabase.auth.updateUser({
				data: {
					display_name: normalizedName,
					name: normalizedName
				}
			});

			if (authError) {
				throw authError;
			}

			await invalidateAll();
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'Não foi possível salvar seu nome agora.';
		} finally {
			saving = false;
		}
	}
</script>

{#if shouldPrompt}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm"
	>
		<div class={`w-full max-w-md rounded-3xl border p-6 shadow-2xl ${toneClasses(tone).panel}`}>
			<div
				class={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${toneClasses(tone).badge}`}
			>
				Seu perfil
			</div>

			<h2 class="mt-4 text-2xl font-black tracking-tight text-slate-950">
				Como você quer aparecer
			</h2>
			<p class="mt-3 text-sm leading-7 text-slate-600">
				Use seu nome para personalizar a experiência nas áreas internas e evitar mensagens
				genéricas.
			</p>

			<form class="mt-5 space-y-4" onsubmit={handleSubmit}>
				<div>
					<label for="display-name" class="mb-2 block text-sm font-bold text-slate-700">
						Seu nome
					</label>
					<input
						id="display-name"
						name="display-name"
						type="text"
						bind:value={draftName}
						placeholder="Ex: Ana Paula"
						class="h-13 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4"
						disabled={saving}
						maxlength="80"
					/>
				</div>

				{#if errorMessage}
					<div
						class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
					>
						{errorMessage}
					</div>
				{/if}

				<button
					type="submit"
					class={`inline-flex h-12 w-full items-center justify-center rounded-2xl text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-70 ${toneClasses(tone).button}`}
					disabled={saving}
				>
					{saving ? 'Salvando...' : 'Salvar nome'}
				</button>
			</form>
		</div>
	</div>
{/if}
