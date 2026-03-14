<!-- eslint-disable svelte/no-navigation-without-resolve -->
<script lang="ts">
	import { page } from '$app/stores';
	import ciIcon from '$lib/assets/ci-icon.png';
	import DisplayNamePrompt from '$lib/components/DisplayNamePrompt.svelte';

	let { children, data } = $props<{
		children: () => unknown;
		data: {
			profile: {
				id: string;
				display_name: string;
			};
		};
	}>();

	const links = [
		{ href: '/student', label: 'Inicio', description: 'Resumo do progresso' },
		{ href: '/student/journey', label: 'Trajetoria', description: 'Historico publicado' },
		{ href: '/student/skills', label: 'Materias', description: 'Leitura por materia' }
	];

	const isActive = (href: string) => {
		if (href === '/student') return $page.url.pathname === '/student';
		return $page.url.pathname.startsWith(href);
	};

	const sectionSummary = (pathname: string) => {
		if (pathname.startsWith('/student/journey')) {
			return {
				title: 'Trajetoria longitudinal',
				description: 'Veja sua sequencia de publicacoes e como seu momento atual foi construido.',
				nextLabel: 'Abrir materias'
			};
		}

		if (pathname.startsWith('/student/skills')) {
			return {
				title: 'Leitura por materia',
				description: 'Entenda onde voce esta bem, onde caiu e qual materia pede a proxima acao.',
				nextLabel: 'Voltar para a trajetoria'
			};
		}

		return {
			title: 'Panorama do momento',
			description:
				'Comece pelo resumo geral e siga para trajetoria e materias quando quiser aprofundar.',
			nextLabel: 'Abrir trajetoria'
		};
	};

	const currentSection = $derived(sectionSummary($page.url.pathname));
</script>

<DisplayNamePrompt
	profileId={data.profile.id}
	displayName={data.profile.display_name}
	tone="student"
/>

<svelte:head>
	<title>Class Insights - Aluno</title>
</svelte:head>

<div class="student-shell">
	<header class="topbar">
		<div class="brand">
			<div class="brand-badge">
				<img src={ciIcon} alt="" class="brand-icon" />
			</div>
			<div>
				<h1>Class Insights</h1>
				<p>Area do aluno</p>
			</div>
		</div>

		<div class="topbar-chip">
			<span class="chip-dot" aria-hidden="true"></span>
			<span>Progresso pessoal</span>
		</div>
	</header>

	<nav class="nav">
		{#each links as link (link.href)}
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
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

	<section class="overview">
		<div>
			<p class="overview-kicker">Jornada do aluno</p>
			<h2>{currentSection.title}</h2>
			<p>
				{currentSection.description}
				{#if data.profile.display_name}
					Leitura pessoal de {data.profile.display_name}.
				{/if}
			</p>
		</div>
		<div class="overview-steps" aria-label="Etapas do portal do aluno">
			{#each links as link (link.href)}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a
					href={link.href}
					class="overview-step"
					class:active={isActive(link.href)}
					aria-current={isActive(link.href) ? 'page' : undefined}
				>
					<span>{link.label}</span>
					<small>{link.description}</small>
				</a>
			{/each}
		</div>
	</section>

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
			Inter,
			ui-sans-serif,
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif;
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

	.brand-icon {
		width: 1.65rem;
		height: 1.65rem;
		object-fit: contain;
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
		grid-template-columns: repeat(3, minmax(0, 1fr));
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

	.overview {
		display: grid;
		grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
		gap: 1rem;
		padding: 1rem;
		margin-bottom: 1rem;
		border-radius: 1.35rem;
		background:
			linear-gradient(135deg, rgba(14, 165, 233, 0.12), rgba(255, 255, 255, 0.92)),
			radial-gradient(circle at top right, rgba(59, 130, 246, 0.18), transparent 45%);
		border: 1px solid rgba(125, 211, 252, 0.3);
		box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
	}

	.overview-kicker {
		margin: 0;
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #0369a1;
	}

	.overview h2 {
		margin: 0.35rem 0 0;
		font-size: 1.25rem;
		line-height: 1.15;
		color: #0f172a;
	}

	.overview p {
		margin: 0.55rem 0 0;
		max-width: 52rem;
		font-size: 0.95rem;
		line-height: 1.65;
		color: #334155;
	}

	.overview-steps {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.overview-step {
		display: block;
		padding: 0.9rem;
		border-radius: 1rem;
		text-decoration: none;
		background: rgba(255, 255, 255, 0.76);
		border: 1px solid rgba(148, 163, 184, 0.16);
	}

	.overview-step.active {
		background: linear-gradient(180deg, rgba(14, 165, 233, 0.16), rgba(14, 165, 233, 0.08));
		border-color: rgba(14, 165, 233, 0.32);
	}

	.overview-step span {
		display: block;
		font-size: 0.94rem;
		font-weight: 800;
		color: #0f172a;
	}

	.overview-step small {
		display: block;
		margin-top: 0.22rem;
		font-size: 0.8rem;
		line-height: 1.45;
		color: #475569;
	}

	.content {
		padding-bottom: 1.5rem;
	}

	.content-inner {
		max-width: 900px;
		margin: 0 auto;
	}

	@media (max-width: 800px) {
		.nav,
		.overview,
		.overview-steps {
			grid-template-columns: 1fr;
		}
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
	}
</style>
