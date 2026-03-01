<script lang="ts">
	import { supabase } from '$lib/services/supabaseClient';
	import { goto, invalidateAll } from '$app/navigation';

	let email = '';
	let password = '';
	let errorMessage = '';
	let loading = false;

	async function handleLogin() {
		errorMessage = '';
		loading = true;

		const { error } = await supabase.auth.signInWithPassword({
			email,
			password
		});

		loading = false;

		if (error) {
			errorMessage = error.message;
			return;
		}

		// força o SvelteKit a recalcular os loads (e o guard ver a sessão)
		await invalidateAll();

		// navega
		await goto('/teacher');
	}
</script>

<h1>Login</h1>

<input type="email" placeholder="Email" bind:value={email} />
<input type="password" placeholder="Senha" bind:value={password} />

<button on:click={handleLogin} disabled={loading}>
	{loading ? 'Entrando...' : 'Entrar'}
</button>

{#if errorMessage}
	<p style="color: red;">{errorMessage}</p>
{/if}