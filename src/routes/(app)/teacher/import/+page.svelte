<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/services/supabaseClient';

  let status = 'testando conexão...';

  onMount(async () => {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      status = 'erro: ' + error.message;
    } else {
      status = 'ok: supabase conectado';
    }
  });
</script>

<h1>Teacher • Dashboard</h1>
<p>{status}</p>