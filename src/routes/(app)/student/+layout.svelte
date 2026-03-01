<script lang="ts">
  const links = [
    { href: '/student', label: 'Início' },
    { href: '/student/skills', label: 'Skills' }
  ];
</script>

<div style="min-height:100vh; padding:16px;">
  <header style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
    <strong>Class Insights</strong>
    <nav style="display:flex; gap:12px;">
      {#each links as l}
        <a href={l.href}>{l.label}</a>
      {/each}
    </nav>
  </header>

  <main>
    <slot />
  </main>
</div>