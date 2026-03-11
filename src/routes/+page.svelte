<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import Flowchart from '$lib/components/Flowchart.svelte';

	let menuOpen = $state(false);
	let showFlowchart = $state(false);

	// Lazy-load simplificado
	$effect(() => {
		const section = document.getElementById('funciona');
		const observer = new IntersectionObserver((entries) => {
			if (entries[0].isIntersecting) showFlowchart = true;
		}, { threshold: 0.1 });

		if (section) observer.observe(section);
		return () => observer.disconnect();
	});
</script>

<div class="min-h-screen bg-[#0c1421] text-white selection:bg-brand-accent/30 selection:text-white">
	
	<nav class="fixed top-0 z-50 w-full border-b border-white/5 bg-[#0c1421]/90 backdrop-blur-xl">
		<div class="mx-auto flex max-w-7xl items-center justify-between p-5">
			<div class="flex items-center gap-3">
				<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-accent text-brand-dark shadow-lg shadow-brand-accent/20">
					<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
						<path d="M13 10V3L4 14h7v7l9-11h-7z" />
					</svg>
				</div>
				<span class="text-xl font-black tracking-tighter uppercase">Class Insights</span>
			</div>

			<div class="hidden items-center gap-8 text-[10px] font-black uppercase tracking-widest text-slate-400 md:flex">
				<a href="#funciona" class="hover:text-brand-accent transition-colors">Como Funciona</a>
				<a href="#recursos" class="hover:text-brand-accent transition-colors">Recursos</a>
				<a href="/login" class="rounded-xl border border-white/10 px-6 py-2.5 text-white hover:bg-white hover:text-brand-dark transition-all">
					Entrar
				</a>
			</div>

			<button onclick={() => menuOpen = !menuOpen} class="md:hidden text-2xl p-2 text-slate-400">
				{menuOpen ? '✕' : '☰'}
			</button>
		</div>

		{#if menuOpen}
			<div class="absolute w-full bg-[#0c1421] border-b border-white/10 p-8 md:hidden shadow-2xl" in:fade>
				<div class="flex flex-col gap-6 text-sm font-bold uppercase tracking-widest">
					<a href="#funciona" onclick={() => menuOpen = false}>Como Funciona</a>
					<a href="#recursos" onclick={() => menuOpen = false}>Recursos</a>
					<hr class="border-white/5" />
					<div class="grid grid-cols-1 gap-3">
						<a href="/register/teacher" class="bg-blue-500/10 text-blue-400 p-4 rounded-xl text-center">Sou Professor</a>
						<a href="/register/coordinator" class="bg-purple-500/10 text-purple-400 p-4 rounded-xl text-center">Sou Coordenador</a>
					</div>
				</div>
			</div>
		{/if}
	</nav>

	<header class="relative pt-32 pb-20 lg:pt-52 lg:pb-32">
		<div class="mx-auto max-w-7xl px-6 relative z-10">
			<div class="text-center md:text-left" in:fly={{ y: 20, duration: 800 }}>
				<span class="inline-block rounded-full border border-brand-accent/20 bg-brand-accent/5 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.4em] text-brand-accent mb-6">
					Do Dado ao Progresso
				</span>
				<h1 class="text-5xl font-black leading-none tracking-tighter md:text-8xl lg:text-9xl uppercase">
					O Ciclo que <br /> <span class="text-brand-accent">Transforma.</span>
				</h1>
				<p class="mt-8 max-w-2xl text-lg font-medium leading-relaxed text-slate-400 md:text-xl">
					A plataforma definitiva para quem acredita que a educação deve ser guiada por evidências, não por suposições.
				</p>

				<div class="mt-16 hidden md:block">
					<Flowchart variant="mini" class="justify-start" />
				</div>

				<div class="mt-12 flex flex-wrap gap-4 justify-center md:justify-start">
					<a href="/login" class="rounded-2xl bg-brand-accent px-10 py-5 text-xs font-black uppercase tracking-widest text-brand-dark shadow-2xl shadow-brand-accent/40 hover:-translate-y-1 transition-all">
						Acessar Painel
					</a>
					<a href="/register/teacher" class="rounded-2xl border border-white/10 bg-white/5 px-10 py-5 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all">
						Começar Agora
					</a>
				</div>
			</div>
		</div>
	</header>

	<section id="funciona" class="py-24 border-t border-white/5 bg-black/20">
		<div class="mx-auto max-w-7xl px-6">
			<div class="mb-20 text-center">
				<h2 class="text-4xl font-black tracking-tighter uppercase md:text-6xl">O Fluxo da Inteligência</h2>
				<p class="mt-4 text-slate-500 uppercase tracking-widest text-xs font-bold">Cada etapa desenhada para o sucesso do aluno</p>
			</div>

			{#if showFlowchart}
				<div in:fade>
					<Flowchart variant="desktop" class="hidden lg:flex" />
					<Flowchart variant="mobile" class="lg:hidden" />
				</div>
			{/if}
			
			<div class="mt-20 group relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-900 shadow-2xl transition-all hover:border-brand-accent/20">
				<div class="absolute inset-0 bg-linear-to-b from-transparent to-black/60 z-10"></div>
				<div class="aspect-video bg-slate-800 flex items-center justify-center">
					<span class="text-slate-600 font-black italic">Video: Demonstração do Fluxo em 30s</span>
					</div>
			</div>
		</div>
	</section>

	<section class="py-32 text-center bg-brand-accent/5">
		<h2 class="text-5xl font-black uppercase tracking-tighter md:text-7xl">Pronto para o próximo nível?</h2>
		<p class="mt-6 text-slate-400 text-lg">Escolha seu perfil e inicie sua jornada baseada em dados.</p>
		<div class="mt-12 flex justify-center gap-4 flex-wrap">
			<a href="/register/teacher" class="px-8 py-5 bg-blue-500/20 text-blue-400 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-blue-500/30 hover:bg-blue-500/30 transition-all">Professor</a>
			<a href="/register/coordinator" class="px-8 py-5 bg-purple-500/20 text-purple-400 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-purple-500/30 hover:bg-purple-500/30 transition-all">Coordenador</a>
			<a href="/register/student" class="px-8 py-5 bg-orange-500/20 text-orange-400 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-orange-500/30 hover:bg-orange-500/30 transition-all">Aluno</a>
		</div>
	</section>

</div>

<style>
	:global(html) { scroll-behavior: smooth; }
</style>