<script lang="ts">
	import { page } from '$app/stores';

	let { children } = $props();

	const links = [
		{
			href: '/teacher',
			label: 'Dashboard',
			description: 'Turmas e visão geral'
		},
		{
			href: '/teacher/import',
			label: 'Importação',
			description: 'CSV, staging e validação'
		}
	];

	const isActive = (href: string) => {
		if (href === '/teacher') return $page.url.pathname === '/teacher';
		return $page.url.pathname.startsWith(href);
	};
</script>

<svelte:head>
	<title>Teacher • Class Insights</title>
</svelte:head>

<div class="teacher-shell">
	<aside class="sidebar">
		<div class="brand-card">
			<div class="brand-badge">CI</div>
			<div>
				<h1>Class Insights</h1>
				<p>Painel do professor</p>
			</div>
		</div>

		<nav class="nav">
			{#each links as link}
				<a
					href={link.href}
					class:active={isActive(link.href)}
					class="nav-link"
					aria-current={isActive(link.href) ? 'page' : undefined}
				>
					<div class="nav-title">{link.label}</div>
					<div class="nav-description">{link.description}</div>
				</a>
			{/each}
		</nav>

		<div class="sidebar-footer">
			<div class="footer-card">
				<strong>MVP funcional</strong>
				<p>
					Professor, importação, grid e snapshots já ativos. Agora o foco é UX, cockpit e
					portal do aluno.
				</p>
			</div>
		</div>
	</aside>

	<div class="content-shell">
		<header class="topbar">
			<div>
				<div class="eyebrow">Área interna</div>
				<h2>Workspace do professor</h2>
			</div>

			<div class="topbar-meta">
				<span class="status-dot" aria-hidden="true"></span>
				<span>Sessão ativa</span>
			</div>
		</header>

		<main class="content">
			<div class="content-inner">
				{@render children()}
			</div>
		</main>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		background:
			radial-gradient(circle at top left, rgba(59, 130, 246, 0.08), transparent 28%),
			linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
		color: #0f172a;
		font-family:
			Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
	}

	:global(a) {
		color: inherit;
	}

	.teacher-shell {
		min-height: 100vh;
		display: grid;
		grid-template-columns: 280px minmax(0, 1fr);
	}

	.sidebar {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding: 1.25rem;
		background: rgba(15, 23, 42, 0.96);
		color: #e2e8f0;
		border-right: 1px solid rgba(148, 163, 184, 0.16);
	}

	.brand-card {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		padding: 1rem;
		border-radius: 1.25rem;
		background: linear-gradient(180deg, rgba(30, 41, 59, 0.96), rgba(15, 23, 42, 0.96));
		border: 1px solid rgba(148, 163, 184, 0.16);
		box-shadow: 0 12px 30px rgba(2, 6, 23, 0.24);
	}

	.brand-badge {
		width: 2.9rem;
		height: 2.9rem;
		border-radius: 0.95rem;
		display: grid;
		place-items: center;
		font-weight: 800;
		letter-spacing: 0.03em;
		background: linear-gradient(135deg, #3b82f6, #2563eb);
		color: white;
		box-shadow: 0 10px 20px rgba(37, 99, 235, 0.35);
		flex-shrink: 0;
	}

	.brand-card h1 {
		margin: 0;
		font-size: 1rem;
		line-height: 1.2;
	}

	.brand-card p {
		margin: 0.2rem 0 0 0;
		font-size: 0.85rem;
		color: #94a3b8;
	}

	.nav {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.nav-link {
		display: block;
		padding: 0.9rem 1rem;
		text-decoration: none;
		border-radius: 1rem;
		border: 1px solid transparent;
		background: rgba(255, 255, 255, 0.02);
		transition:
			transform 0.16s ease,
			background 0.16s ease,
			border-color 0.16s ease,
			box-shadow 0.16s ease;
	}

	.nav-link:hover {
		transform: translateY(-1px);
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(148, 163, 184, 0.16);
	}

	.nav-link.active {
		background: linear-gradient(180deg, rgba(37, 99, 235, 0.22), rgba(37, 99, 235, 0.14));
		border-color: rgba(96, 165, 250, 0.45);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
	}

	.nav-title {
		font-weight: 700;
		font-size: 0.96rem;
	}

	.nav-description {
		margin-top: 0.22rem;
		font-size: 0.8rem;
		color: #94a3b8;
	}

	.sidebar-footer {
		margin-top: auto;
	}

	.footer-card {
		padding: 1rem;
		border-radius: 1rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(148, 163, 184, 0.14);
	}

	.footer-card strong {
		display: block;
		font-size: 0.92rem;
		margin-bottom: 0.35rem;
	}

	.footer-card p {
		margin: 0;
		font-size: 0.82rem;
		line-height: 1.5;
		color: #94a3b8;
	}

	.content-shell {
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.25rem 1.5rem 1rem;
		border-bottom: 1px solid rgba(148, 163, 184, 0.18);
		background: rgba(255, 255, 255, 0.7);
		backdrop-filter: blur(12px);
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.eyebrow {
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #64748b;
		margin-bottom: 0.28rem;
	}

	.topbar h2 {
		margin: 0;
		font-size: 1.35rem;
		line-height: 1.2;
		color: #0f172a;
	}

	.topbar-meta {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.6rem 0.85rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.85);
		border: 1px solid rgba(148, 163, 184, 0.22);
		color: #334155;
		font-size: 0.88rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.status-dot {
		width: 0.65rem;
		height: 0.65rem;
		border-radius: 999px;
		background: #22c55e;
		box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.16);
	}

	.content {
		flex: 1;
		padding: 1.5rem;
	}

	.content-inner {
		max-width: 1200px;
	}

	@media (max-width: 980px) {
		.teacher-shell {
			grid-template-columns: 1fr;
		}

		.sidebar {
			border-right: 0;
			border-bottom: 1px solid rgba(148, 163, 184, 0.16);
		}

		.content {
			padding: 1rem;
		}

		.topbar {
			padding: 1rem;
		}
	}

	@media (max-width: 640px) {
		.brand-card {
			padding: 0.9rem;
		}

		.topbar {
			align-items: flex-start;
			flex-direction: column;
		}

		.topbar-meta {
			width: 100%;
			justify-content: center;
		}
	}
</style>