<script lang="ts">
  const links = [
    { href: '/teacher', label: 'Dashboard' },
    { href: '/teacher/import', label: 'Importação' }
  ];
</script>

<div style="display:flex; min-height:100vh;">
  <aside style="width:220px; padding:16px; border-right:1px solid #ddd;">
    <h2 style="margin:0 0 12px 0;">Class Insights</h2>
    <nav style="display:flex; flex-direction:column; gap:8px;">
      {#each links as l}
        <a href={l.href}>{l.label}</a>
      {/each}
    </nav>
  </aside>

  <main style="flex:1; padding:24px;">
    <slot />
  </main>
</div>