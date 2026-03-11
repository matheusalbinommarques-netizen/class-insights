<svelte:head>
	<title>Class Insights</title>
	<meta
		name="description"
		content="Transforme notas em progresso visível com importação, skills, snapshots e insights pedagógicos."
	/>
</svelte:head>

<script lang="ts">
	const teacherFeatures = [
		'Turmas, alunos e skills em um só lugar',
		'Grid operacional de notas com edição rápida',
		'Importação CSV com preview, staging e validação',
		'Snapshots para leitura histórica da evolução'
	];

	const studentFeatures = [
		'Resumo visual do progresso',
		'Leitura por skill com pontos fortes e atenção',
		'Portal mais simples e mobile-first',
		'Clareza sobre evolução, não só nota solta'
	];

	const flowSteps = [
		{
			number: '01',
			title: 'Configure a turma',
			text: 'Defina escala, alunos e habilidades acompanhadas.'
		},
		{
			number: '02',
			title: 'Lance ou importe notas',
			text: 'Suba CSV com preview, validação e apply seguro.'
		},
		{
			number: '03',
			title: 'Gere leitura pedagógica',
			text: 'Use snapshots e visão por skill para entender prioridades.'
		},
		{
			number: '04',
			title: 'Mostre progresso ao aluno',
			text: 'Transforme nota em uma leitura visual mais clara.'
		}
	];
</script>

<div class="landing">
	<header class="topbar">
		<a href="/" class="brand">
			<div class="brand-mark">
				<div class="cap-top"></div>
				<div class="cap-base"></div>
				<div class="bar bar-1"></div>
				<div class="bar bar-2"></div>
				<div class="bar bar-3"></div>
				<div class="arrow"></div>
			</div>

			<div class="brand-copy">
				<span class="brand-name">Class Insights</span>
			</div>
		</a>

		<nav class="nav">
			<a href="#como-funciona">Como funciona</a>
			<a href="#professor">Professor</a>
			<a href="#aluno">Aluno</a>
		</nav>

		<div class="topbar-actions">
			<a href="/login" class="btn btn-primary">Entrar</a>
		</div>
	</header>

	<section class="hero">
		<div class="hero-copy">
			<div class="eyebrow">Analytics de aprendizagem</div>
			<h1>Transforme notas em progresso visível.</h1>
			<p class="hero-text">
				O Class Insights conecta <strong>importação</strong>, <strong>skills</strong>,
				<strong>snapshots</strong> e <strong>insights pedagógicos</strong> em uma experiência
				clara para professores e alunos.
			</p>

			<div class="hero-actions">
				<a href="/register/teacher" class="btn btn-success">Cadastre-se grátis</a>
				<a href="/login" class="btn btn-primary ghost-mobile">Entrar</a>
			</div>

			<div class="hero-pills">
				<span>CSV com staging</span>
				<span>BI pedagógico</span>
				<span>Skill progress</span>
				<span>Portal do aluno</span>
			</div>
		</div>

		<div class="hero-visual" aria-hidden="true">
			<div class="visual-glow glow-left"></div>
			<div class="visual-glow glow-right"></div>

			<div class="csv-card floating-card">
				<div class="bubble-label">Importação simples</div>
				<div class="csv-sheet">
					<div class="csv-header"></div>
					<div class="csv-grid">
						{#each Array(6) as _, row}
							<div class="csv-row">
								{#each Array(5) as _, col}
									<div class="csv-cell" class:strong={row === 0 || col === 0}></div>
								{/each}
							</div>
						{/each}
					</div>
				</div>

				<div class="csv-file">
					<div class="file-fold"></div>
					<div class="file-lines"></div>
					<span>CSV</span>
				</div>
			</div>

			<div class="flow-beam"></div>

			<div class="skill-card floating-card">
				<div class="bubble-label bubble-top">BI prescritivo</div>

				<div class="node-layout">
					<div class="node node-warn small">△</div>
					<div class="node-link"></div>
					<div class="node node-good">▣</div>
					<div class="node-link"></div>
					<div class="node node-brand big">🎓</div>
					<div class="node-link"></div>
					<div class="node node-info">⚛</div>
				</div>

				<div class="node-layout bottom">
					<div class="node node-risk">△</div>
					<div class="node-link"></div>
					<div class="node node-brand">📘</div>
					<div class="node-link"></div>
					<div class="node node-good">▣</div>
					<div class="node-link"></div>
					<div class="node node-info">⚛</div>
				</div>

				<div class="visual-kpis">
					<div class="kpi-card">
						<div class="kpi-label">Skill tree</div>
						<div class="kpi-value">Evoluindo</div>
					</div>
					<div class="kpi-card">
						<div class="kpi-label">Engajamento</div>
						<div class="kpi-value">Gamificação</div>
					</div>
				</div>
			</div>

			<div class="dashboard-card floating-card">
				<div class="screen-top"></div>
				<div class="charts">
					<div class="chart bars">
						<div></div>
						<div></div>
						<div></div>
						<div></div>
					</div>
					<div class="chart donut"></div>
				</div>
				<div class="chart-line">
					<span></span>
				</div>
			</div>
		</div>
	</section>

	<section class="trust-strip">
		<div class="trust-item">
			<div class="trust-label">Professor</div>
			<div class="trust-value">Operação mais confiável</div>
		</div>
		<div class="trust-item">
			<div class="trust-label">Aluno</div>
			<div class="trust-value">Progresso mais claro</div>
		</div>
		<div class="trust-item">
			<div class="trust-label">Pipeline</div>
			<div class="trust-value">CSV com staging e validação</div>
		</div>
		<div class="trust-item">
			<div class="trust-label">Histórico</div>
			<div class="trust-value">Snapshots de evolução</div>
		</div>
	</section>

	<section class="section" id="como-funciona">
		<div class="section-head">
			<div>
				<div class="eyebrow">Fluxo principal</div>
				<h2>Da planilha ao insight pedagógico</h2>
			</div>
			<p>
				O foco do MVP é fechar o ciclo <strong>Dado → Insight → Intervenção → Resultado</strong>
				sem virar apenas um app de telas bonitas.
			</p>
		</div>

		<div class="steps-grid">
			{#each flowSteps as step}
				<article class="step-card">
					<div class="step-number">{step.number}</div>
					<h3>{step.title}</h3>
					<p>{step.text}</p>
				</article>
			{/each}
		</div>
	</section>

	<section class="dual-grid">
		<article class="feature-panel" id="professor">
			<div class="eyebrow">Professor / Coordenação</div>
			<h2>Operação densa com menos fricção</h2>
			<p>
				Área pensada para cadastro, importação, grid de notas e cockpit inicial de acompanhamento.
			</p>

			<ul>
				{#each teacherFeatures as item}
					<li>{item}</li>
				{/each}
			</ul>

			<a href="/register/teacher" class="btn btn-primary">Começar como professor</a>
		</article>

		<article class="feature-panel" id="aluno">
			<div class="eyebrow">Aluno</div>
			<h2>Leitura visual do progresso</h2>
			<p>
				Portal mais simples para mostrar evolução por habilidade e transformar nota em clareza.
			</p>

			<ul>
				{#each studentFeatures as item}
					<li>{item}</li>
				{/each}
			</ul>

			<a href="/register/student" class="btn btn-primary">Começar como aluno</a>
		</article>
	</section>

	<section class="cta">
		<div>
			<div class="eyebrow">Acesso</div>
			<h2>Entre no Class Insights</h2>
			<p>
				Use login se já tiver conta, ou siga para o cadastro correspondente ao seu perfil.
			</p>
		</div>

		<div class="cta-actions">
			<a href="/login" class="btn btn-primary">Fazer login</a>
			<a href="/register/teacher" class="btn btn-secondary">Professor</a>
			<a href="/register/student" class="btn btn-secondary">Aluno</a>
		</div>
	</section>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family:
			Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
			sans-serif;
		color: #0f172a;
		background:
			radial-gradient(circle at top left, rgba(59, 130, 246, 0.08), transparent 26%),
			linear-gradient(180deg, #f8fafc 0%, #eef4fb 100%);
	}

	:global(a) {
		text-decoration: none;
		color: inherit;
	}

	.landing {
		max-width: 1280px;
		margin: 0 auto;
		padding: 20px 24px 40px;
	}

	.topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		padding: 8px 0 20px;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 14px;
		min-width: 0;
	}

	.brand-copy {
		display: flex;
		flex-direction: column;
	}

	.brand-name {
		font-size: 2rem;
		font-weight: 900;
		letter-spacing: -0.03em;
		color: #123458;
		line-height: 1;
	}

	.brand-mark {
		position: relative;
		width: 66px;
		height: 56px;
		flex-shrink: 0;
	}

	.cap-top {
		position: absolute;
		left: 2px;
		top: 0;
		width: 36px;
		height: 20px;
		background: #173a63;
		clip-path: polygon(50% 0%, 100% 42%, 50% 84%, 0% 42%);
	}

	.cap-base {
		position: absolute;
		left: 14px;
		top: 16px;
		width: 12px;
		height: 4px;
		background: #173a63;
		border-radius: 999px;
	}

	.bar {
		position: absolute;
		bottom: 0;
		width: 8px;
		background: #3a7bd5;
		border-radius: 4px 4px 0 0;
	}

	.bar-1 {
		left: 8px;
		height: 14px;
	}

	.bar-2 {
		left: 21px;
		height: 22px;
	}

	.bar-3 {
		left: 34px;
		height: 30px;
	}

	.arrow {
		position: absolute;
		right: 0;
		bottom: 8px;
		width: 22px;
		height: 22px;
		border-top: 7px solid #48a868;
		border-right: 7px solid #48a868;
		transform: rotate(45deg);
	}

	.arrow::before {
		content: '';
		position: absolute;
		left: -20px;
		top: 7px;
		width: 31px;
		height: 7px;
		background: #48a868;
		border-radius: 999px;
		transform: rotate(0deg);
	}

	.nav {
		display: flex;
		align-items: center;
		gap: 34px;
		font-size: 0.98rem;
		font-weight: 700;
		color: #334155;
	}

	.nav a:hover {
		color: #1d4ed8;
	}

	.topbar-actions {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.btn {
		height: 50px;
		padding: 0 22px;
		border-radius: 14px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 0.98rem;
		font-weight: 800;
		letter-spacing: 0.01em;
		transition:
			transform 0.16s ease,
			box-shadow 0.16s ease,
			background 0.16s ease,
			border-color 0.16s ease;
	}

	.btn:hover {
		transform: translateY(-1px);
	}

	.btn-primary {
		background: linear-gradient(135deg, #2f7dc2, #2563eb);
		color: white;
		box-shadow: 0 10px 22px rgba(37, 99, 235, 0.22);
	}

	.btn-success {
		background: linear-gradient(135deg, #51b977, #3d9f64);
		color: white;
		box-shadow: 0 10px 22px rgba(61, 159, 100, 0.24);
	}

	.btn-secondary {
		background: white;
		color: #123458;
		border: 1px solid #cbd5e1;
	}

	.hero {
		display: grid;
		grid-template-columns: minmax(0, 1.05fr) minmax(520px, 0.95fr);
		gap: 24px;
		align-items: center;
		padding: 26px 0 10px;
		min-height: 640px;
	}

	.hero-copy {
		display: flex;
		flex-direction: column;
		gap: 20px;
		padding-right: 12px;
	}

	.eyebrow {
		font-size: 0.78rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #5b7088;
	}

	.hero h1,
	.section-head h2,
	.feature-panel h2,
	.cta h2 {
		margin: 0;
		color: #123458;
		letter-spacing: -0.04em;
		line-height: 0.98;
	}

	.hero h1 {
		font-size: clamp(3rem, 6vw, 5.2rem);
		max-width: 720px;
		text-transform: uppercase;
	}

	.hero-text {
		margin: 0;
		max-width: 680px;
		font-size: 1.18rem;
		line-height: 1.75;
		color: #334155;
	}

	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 14px;
	}

	.hero-pills {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.hero-pills span {
		padding: 9px 14px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.88);
		border: 1px solid rgba(148, 163, 184, 0.24);
		color: #23415f;
		font-size: 0.88rem;
		font-weight: 700;
		box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);
	}

	.hero-visual {
		position: relative;
		min-height: 620px;
		border-radius: 34px;
		background:
			radial-gradient(circle at 18% 48%, rgba(255, 214, 170, 0.55), transparent 22%),
			radial-gradient(circle at 70% 40%, rgba(118, 200, 255, 0.24), transparent 30%),
			radial-gradient(circle at 82% 36%, rgba(120, 255, 180, 0.20), transparent 24%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.68) 0%, rgba(241, 245, 249, 0.92) 100%);
		border: 1px solid rgba(148, 163, 184, 0.18);
		overflow: hidden;
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
	}

	.visual-glow {
		position: absolute;
		border-radius: 999px;
		filter: blur(36px);
		opacity: 0.9;
	}

	.glow-left {
		left: 36px;
		top: 320px;
		width: 170px;
		height: 120px;
		background: rgba(255, 190, 120, 0.34);
	}

	.glow-right {
		right: 100px;
		top: 180px;
		width: 220px;
		height: 150px;
		background: rgba(106, 225, 163, 0.22);
	}

	.floating-card {
		position: absolute;
		background: rgba(255, 255, 255, 0.92);
		border: 1px solid rgba(148, 163, 184, 0.18);
		border-radius: 24px;
		box-shadow: 0 18px 40px rgba(15, 23, 42, 0.10);
		backdrop-filter: blur(10px);
	}

	.bubble-label {
		position: absolute;
		top: -22px;
		left: 18px;
		padding: 10px 14px;
		border-radius: 18px;
		background: rgba(255, 255, 255, 0.96);
		border: 1px solid rgba(148, 163, 184, 0.16);
		box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
		font-size: 0.92rem;
		font-weight: 900;
		color: #1f2937;
		white-space: nowrap;
	}

	.bubble-top {
		top: -18px;
		left: 22px;
	}

	.csv-card {
		left: 36px;
		top: 236px;
		width: 250px;
		padding: 18px 16px 18px;
	}

	.csv-sheet {
		background: #f8fafc;
		border: 1px solid #dbe3ec;
		border-radius: 14px;
		padding: 8px;
	}

	.csv-header {
		height: 16px;
		border-radius: 8px;
		background: linear-gradient(90deg, #2aa86a, #60c787);
		margin-bottom: 8px;
	}

	.csv-grid {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.csv-row {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 4px;
	}

	.csv-cell {
		height: 12px;
		border-radius: 4px;
		background: #dbe4ee;
	}

	.csv-cell.strong {
		background: #c5d2df;
	}

	.csv-file {
		position: absolute;
		right: -26px;
		bottom: -22px;
		width: 88px;
		height: 98px;
		background: white;
		border: 1px solid #d9e2ec;
		border-radius: 14px;
		box-shadow: 0 12px 26px rgba(15, 23, 42, 0.10);
		display: flex;
		align-items: flex-end;
		justify-content: center;
		padding-bottom: 10px;
		font-weight: 900;
		color: #438d67;
	}

	.file-fold {
		position: absolute;
		top: 0;
		right: 0;
		width: 22px;
		height: 22px;
		background: linear-gradient(135deg, #e2e8f0 50%, white 50%);
		border-top-right-radius: 14px;
	}

	.file-lines {
		position: absolute;
		top: 30px;
		left: 14px;
		right: 14px;
		height: 28px;
		background:
			repeating-linear-gradient(
				to bottom,
				#b8c4d1 0 2px,
				transparent 2px 7px
			);
		opacity: 0.85;
	}

	.flow-beam {
		position: absolute;
		left: 220px;
		top: 318px;
		width: 230px;
		height: 120px;
		background:
			radial-gradient(circle at 28% 50%, rgba(255, 255, 255, 0.75), transparent 30%),
			linear-gradient(90deg, rgba(255, 255, 255, 0.0), rgba(123, 197, 255, 0.18), rgba(95, 240, 167, 0.20));
		filter: blur(1px);
		clip-path: polygon(0 42%, 72% 42%, 72% 28%, 100% 50%, 72% 72%, 72% 58%, 0 58%);
		opacity: 0.92;
	}

	.skill-card {
		left: 300px;
		top: 150px;
		width: 340px;
		padding: 34px 22px 18px;
	}

	.node-layout {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		margin-bottom: 16px;
	}

	.node-layout.bottom {
		margin-bottom: 18px;
	}

	.node {
		width: 54px;
		height: 54px;
		border-radius: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 900;
		font-size: 1.15rem;
		border: 1px solid rgba(148, 163, 184, 0.16);
		box-shadow: 0 10px 22px rgba(15, 23, 42, 0.06);
	}

	.node.small {
		width: 48px;
		height: 48px;
	}

	.node.big {
		width: 62px;
		height: 62px;
		font-size: 1.35rem;
	}

	.node-good {
		background: rgba(142, 241, 183, 0.22);
		color: #166534;
	}

	.node-warn {
		background: rgba(252, 211, 153, 0.28);
		color: #b45309;
	}

	.node-risk {
		background: rgba(254, 202, 202, 0.28);
		color: #b91c1c;
	}

	.node-info {
		background: rgba(191, 219, 254, 0.28);
		color: #1d4ed8;
	}

	.node-brand {
		background: rgba(219, 234, 254, 0.40);
		color: #123458;
	}

	.node-link {
		width: 22px;
		height: 3px;
		border-radius: 999px;
		background: linear-gradient(90deg, #d1d9e3, #b6cbe5);
	}

	.visual-kpis {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}

	.kpi-card {
		padding: 12px 14px;
		border-radius: 16px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
	}

	.kpi-label {
		font-size: 0.75rem;
		font-weight: 900;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #64748b;
		margin-bottom: 4px;
	}

	.kpi-value {
		font-size: 0.92rem;
		font-weight: 800;
		color: #123458;
	}

	.dashboard-card {
		right: 26px;
		top: 230px;
		width: 210px;
		padding: 12px;
	}

	.screen-top {
		height: 14px;
		border-radius: 10px;
		background: #dbe7f4;
		margin-bottom: 12px;
	}

	.charts {
		display: grid;
		grid-template-columns: 1.1fr 0.9fr;
		gap: 10px;
		margin-bottom: 10px;
	}

	.chart {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		min-height: 84px;
	}

	.bars {
		display: flex;
		align-items: flex-end;
		justify-content: space-around;
		padding: 12px;
	}

	.bars div {
		width: 18px;
		border-radius: 8px 8px 0 0;
		background: linear-gradient(180deg, #69c48b, #2f7dc2);
	}

	.bars div:nth-child(1) {
		height: 30px;
	}
	.bars div:nth-child(2) {
		height: 48px;
	}
	.bars div:nth-child(3) {
		height: 38px;
	}
	.bars div:nth-child(4) {
		height: 60px;
	}

	.donut {
		position: relative;
		margin: auto;
		width: 84px;
		height: 84px;
		border-radius: 999px;
		background: conic-gradient(#2f7dc2 0 38%, #69c48b 38% 72%, #e2e8f0 72% 100%);
	}

	.donut::after {
		content: '';
		position: absolute;
		inset: 16px;
		border-radius: 999px;
		background: white;
	}

	.chart-line {
		height: 48px;
		border-radius: 14px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		padding: 12px 14px;
	}

	.chart-line span {
		display: block;
		width: 100%;
		height: 100%;
		background: linear-gradient(135deg, transparent 8%, #9fd7b4 8% 16%, transparent 16% 24%, #7ca9df 24% 32%, transparent 32% 40%, #91d9ff 40% 48%, transparent 48%);
		border-radius: 12px;
		opacity: 0.7;
	}

	.trust-strip {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 14px;
		margin-top: 6px;
	}

	.trust-item,
	.section,
	.feature-panel,
	.cta {
		background: rgba(255, 255, 255, 0.92);
		border: 1px solid rgba(148, 163, 184, 0.18);
		border-radius: 24px;
		box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
	}

	.trust-item {
		padding: 18px;
	}

	.trust-label {
		font-size: 0.76rem;
		font-weight: 900;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #64748b;
		margin-bottom: 6px;
	}

	.trust-value {
		font-size: 1rem;
		font-weight: 800;
		color: #123458;
		line-height: 1.35;
	}

	.section {
		margin-top: 18px;
		padding: 28px;
	}

	.section-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 24px;
		margin-bottom: 20px;
	}

	.section-head h2 {
		font-size: clamp(1.8rem, 2.6vw, 2.6rem);
	}

	.section-head p,
	.feature-panel p,
	.step-card p,
	.cta p {
		margin: 0;
		color: #475569;
		line-height: 1.75;
	}

	.section-head p {
		max-width: 520px;
		font-size: 1rem;
	}

	.steps-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 16px;
	}

	.step-card {
		padding: 20px;
		border-radius: 20px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
	}

	.step-number {
		font-size: 0.9rem;
		font-weight: 900;
		letter-spacing: 0.08em;
		color: #2f7dc2;
		margin-bottom: 8px;
	}

	.step-card h3,
	.feature-panel h2 {
		margin: 0 0 8px;
		color: #123458;
	}

	.step-card h3 {
		font-size: 1.05rem;
		line-height: 1.3;
	}

	.dual-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 18px;
		margin-top: 18px;
	}

	.feature-panel {
		padding: 28px;
	}

	.feature-panel h2 {
		font-size: clamp(1.6rem, 2.2vw, 2.2rem);
		line-height: 1.12;
	}

	.feature-panel ul {
		margin: 0 0 22px;
		padding-left: 20px;
		color: #334155;
		line-height: 1.95;
	}

	.cta {
		margin-top: 18px;
		padding: 28px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
	}

	.cta h2 {
		font-size: clamp(1.7rem, 2.4vw, 2.4rem);
		margin: 0 0 8px;
	}

	.cta-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}

	.ghost-mobile {
		display: none;
	}

	@media (max-width: 1200px) {
		.hero {
			grid-template-columns: 1fr;
		}

		.hero-visual {
			min-height: 560px;
		}

		.section-head,
		.cta {
			flex-direction: column;
			align-items: flex-start;
		}

		.steps-grid,
		.trust-strip,
		.dual-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 760px) {
		.landing {
			padding: 14px;
		}

		.topbar {
			flex-wrap: wrap;
			padding-bottom: 14px;
		}

		.nav {
			order: 3;
			width: 100%;
			justify-content: flex-start;
			gap: 20px;
			overflow-x: auto;
			padding-bottom: 4px;
		}

		.brand-name {
			font-size: 1.55rem;
		}

		.hero {
			min-height: auto;
			padding-top: 10px;
		}

		.hero h1 {
			font-size: clamp(2.3rem, 10vw, 3.3rem);
		}

		.hero-text {
			font-size: 1rem;
		}

		.hero-actions,
		.cta-actions {
			flex-direction: column;
			width: 100%;
		}

		.btn {
			width: 100%;
		}

		.hero-visual {
			min-height: 760px;
		}

		.csv-card {
			left: 14px;
			top: 260px;
			width: 200px;
		}

		.skill-card {
			left: 24px;
			right: 24px;
			top: 74px;
			width: auto;
		}

		.dashboard-card {
			right: 14px;
			top: 500px;
			width: 180px;
		}

		.flow-beam {
			left: 150px;
			top: 356px;
			width: 180px;
		}

		.steps-grid,
		.trust-strip,
		.dual-grid {
			grid-template-columns: 1fr;
		}

		.section,
		.feature-panel,
		.cta {
			padding: 22px;
			border-radius: 20px;
		}

		.topbar-actions {
			width: 100%;
		}

		.topbar-actions .btn-primary {
			width: 100%;
		}

		.ghost-mobile {
			display: inline-flex;
		}
	}
</style>