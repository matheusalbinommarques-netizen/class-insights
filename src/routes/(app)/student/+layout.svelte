<script lang="ts">
	import { page } from '$app/stores';

	let { children } = $props();

	const links = [
		{ href: '/student', label: 'Início', description: 'Resumo do progresso' },
		{ href: '/student/skills', label: 'Skills', description: 'Jornada e evolução' }
	];

	const isActive = (href: string) => {
		if (href === '/student') return $page.url.pathname === '/student';
		return $page.url.pathname.startsWith(href);
	};
</script>

<svelte:head>
	<title>Student • Class Insights</title>
</svelte:head>

<div class="student-shell">
	<header class="topbar">
		<div class="brand">
			<div class="brand-badge">CI</div>
			<div>
				<h1>Class Insights</h1>
				<p>Portal do aluno</p>
			</div>
		</div>

		<div class="topbar-chip">
			<span class="chip-dot" aria-hidden="true"></span>
			<span>Progresso pessoal</span>
		</div>
	</header>

	<nav class="nav">
		{#each links as link}
			<a
				href={link.href}
				class="nav-link"
				class:active={isActive(link.href)}
				aria-current={isActive(link.href) ? 'page' : undefined}
			>
				<div class="nav-title">{link.label}</div>
				<div class="nav-description">{link.description}</div>
			</a>
		{/each}
	</nav>

	<main class="content">
		<div class="content-inner">
			{@render children()}
		</div>
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		background:
			radial-gradient(circle at top center, rgba(59, 130, 246, 0.08), transparent 26%),
			linear-gradient(180deg, #f8fafc 0%, #eef4ff 100%);
		color: #0f172a;
		font-family:
			Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
	}

	:global(a) {
		color: inherit;
	}

	.student-shell {
		min-height: 100vh;
		padding: 1rem;
	}

	.topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem;
		border-radius: 1.35rem;
		background: rgba(255, 255, 255, 0.9);
		border: 1px solid rgba(148, 163, 184, 0.2);
		box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
		margin-bottom: 1rem;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		min-width: 0;
	}

	.brand-badge {
		width: 2.7rem;
		height: 2.7rem;
		border-radius: 0.95rem;
		display: grid;
		place-items: center;
		font-weight: 800;
		letter-spacing: 0.03em;
		background: linear-gradient(135deg, #3b82f6, #2563eb);
		color: white;
		box-shadow: 0 10px 20px rgba(37, 99, 235, 0.25);
		flex-shrink: 0;
	}

	.brand h1 {
		margin: 0;
		font-size: 1rem;
		line-height: 1.2;
		color: #0f172a;
	}

	.brand p {
		margin: 0.2rem 0 0;
		font-size: 0.84rem;
		color: #64748b;
	}

	.topbar-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.65rem 0.9rem;
		border-radius: 999px;
		background: rgba(37, 99, 235, 0.08);
		border: 1px solid rgba(96, 165, 250, 0.28);
		color: #1d4ed8;
		font-size: 0.88rem;
		font-weight: 700;
		white-space: nowrap;
	}

	.chip-dot {
		width: 0.6rem;
		height: 0.6rem;
		border-radius: 999px;
		background: #22c55e;
		box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.14);
	}

	.nav {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.nav-link {
		display: block;
		padding: 0.95rem 1rem;
		border-radius: 1.1rem;
		background: rgba(255, 255, 255, 0.88);
		border: 1px solid rgba(148, 163, 184, 0.18);
		text-decoration: none;
		box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
		transition:
			transform 0.16s ease,
			border-color 0.16s ease,
			background 0.16s ease;
	}

	.nav-link:hover {
		transform: translateY(-1px);
		border-color: rgba(96, 165, 250, 0.32);
	}

	.nav-link.active {
		background: linear-gradient(180deg, rgba(37, 99, 235, 0.14), rgba(37, 99, 235, 0.08));
		border-color: rgba(96, 165, 250, 0.38);
	}

	.nav-title {
		font-size: 0.95rem;
		font-weight: 800;
		color: #0f172a;
	}

	.nav-description {
		margin-top: 0.22rem;
		font-size: 0.82rem;
		color: #64748b;
	}

	.content {
		padding-bottom: 1.5rem;
	}

	.content-inner {
		max-width: 900px;
		margin: 0 auto;
	}

	@media (max-width: 640px) {
		.student-shell {
			padding: 0.75rem;
		}

		.topbar {
			flex-direction: column;
			align-items: flex-start;
		}

		.topbar-chip {
			width: 100%;
			justify-content: center;
		}

		.nav {
			grid-template-columns: 1fr;
		}
	}
</style>