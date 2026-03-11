<script lang="ts">
	import { fade, fly } from 'svelte/transition';

	// Estado para os inputs (Svelte 5 Runes)
	let email = $state('');
	let password = $state('');
</script>

<svelte:head>
	<title>Class Insights | Inteligência Educacional Premium</title>
</svelte:head>

<div class="flex min-h-screen flex-col lg:flex-row bg-[#0c1421] text-white">
	
	<section class="relative hidden flex-1 flex-col justify-between overflow-hidden p-16 lg:flex border-r border-slate-800">
		
		<div class="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
			<div class="absolute -top-32 -left-32 w-125 h-125 bg-brand-accent/20 rounded-full blur-3xl"></div>
			<div class="absolute top-1/2 -right-32 w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl"></div>
		</div>

		<div class="relative z-10 flex items-center gap-3">
			<div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-dark/50 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-sm shadow-brand-dark/30">
				<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M16 8v8m-4-5v5m-4-2v2M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
				</svg>
			</div>
			<div class="flex flex-col">
				<span class="text-2xl font-black tracking-tighter text-white leading-none">CLASS INSIGHTS</span>
				<span class="text-[10px] font-bold tracking-[0.4em] text-brand-accent uppercase">Educational Analytics</span>
			</div>
		</div>

		<div class="relative z-10 max-w-xl space-y-16" in:fly={{ x: -40, duration: 900 }}>
			<div class="space-y-4">
				<h1 class="text-7xl font-black leading-[0.85] text-white tracking-tighter">
					DADOS QUE <br/>VIRAM <br/><span class="text-brand-accent">PROGRESSO.</span>
				</h1>
				<p class="text-xl font-medium text-slate-300">INSIGHTS QUE TRANSFORMAM A EDUCAÇÃO.</p>
			</div>
			
			<div class="space-y-12">
				<div class="flex items-start gap-6">
					<div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-800/60 shadow-lg ring-1 ring-slate-700/50 text-brand-accent">
						<svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
					</div>
					<div>
						<h3 class="text-lg font-black text-white uppercase tracking-tight">Análise Longitudinal</h3>
						<p class="mt-2 text-sm text-slate-400 font-medium leading-relaxed">Acompanhe a evolução por habilidade, semestre após semestre.</p>
					</div>
				</div>
				<div class="flex items-start gap-6">
					<div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-800/60 shadow-lg ring-1 ring-slate-700/50 text-brand-accent">
						<svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
					</div>
					<div>
						<h3 class="text-lg font-black text-white uppercase tracking-tight">Intervenção Ágil</h3>
						<p class="mt-2 text-sm text-slate-400 font-medium leading-relaxed">Antecipe quedas de rendimento e intervenha antes que elas virem reprovações.</p>
					</div>
				</div>
			</div>
		</div>

		<div class="relative z-10 mt-16 rounded-3xl border border-slate-700/50 bg-slate-800/40 p-2 shadow-2xl shadow-slate-900/50" in:fade={{ delay: 600 }}>
			<div class="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-8 backdrop-blur-sm">
				<div class="flex items-center justify-between mb-8">
					<div class="h-4 w-40 rounded-full bg-slate-800"></div>
					<div class="flex gap-2">
						<div class="h-3 w-3 rounded-full bg-brand-accent"></div>
						<div class="h-3 w-3 rounded-full bg-slate-700"></div>
					</div>
				</div>
				<div class="flex items-end gap-4 h-40">
					<div class="relative group w-full h-full">
						<div class="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-[10px] text-white px-3 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity font-bold">Lógica: 7.2</div>
						<div class="w-full bg-slate-800/50 rounded-t-xl h-[60%] border-t border-slate-700/30 transition-all group-hover:bg-slate-700"></div>
					</div>
					<div class="w-full bg-slate-800/50 rounded-t-xl h-[80%]"></div>
					<div class="w-full bg-brand-accent rounded-t-xl h-[95%] shadow-lg shadow-brand-accent/40 ring-1 ring-white/10"></div>
					<div class="w-full bg-slate-800/50 rounded-t-xl h-[50%]"></div>
					<div class="w-full bg-brand-primary rounded-t-xl h-[90%] shadow-lg shadow-brand-primary/40 ring-1 ring-white/10"></div>
				</div>
				<div class="mt-5 pt-5 border-t border-slate-800 flex justify-between text-[10px] font-medium text-slate-500 uppercase tracking-widest">
					<span>Matemática</span>
					<span>Português</span>
					<span class="text-brand-accent">Habilidades</span>
					<span>Ciências</span>
				</div>
			</div>
		</div>
	</section>

	<section class="flex flex-1 items-center justify-center p-8 bg-white">
		<div class="w-full max-w-sm space-y-12">
			
			<div class="text-center lg:text-left">
				<span class="text-[10px] font-black uppercase tracking-[0.4em] text-brand-accent">Acesso Identificado</span>
				<h2 class="mt-3 text-5xl font-black tracking-tighter text-brand-dark leading-none">Acesse sua conta</h2>
				<p class="mt-4 text-sm font-semibold text-slate-400">Entre para gerenciar turmas, alunos e insights.</p>
			</div>

			<form class="space-y-6" onsubmit={(e) => e.preventDefault()}>
				<div class="space-y-2">
					<label for="email" class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Usuário ou E-mail</label>
					<div class="relative">
						<span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
							<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" /></svg>
						</span>
						<input 
							type="email" 
							id="email" 
							bind:value={email}
							placeholder="nome@instituicao.com"
							class="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 py-4 text-sm font-bold text-brand-dark outline-none transition-all placeholder:text-slate-300 focus:border-brand-dark focus:bg-white focus:ring-8 focus:ring-brand-dark/5"
						/>
					</div>
				</div>

				<div class="space-y-2">
					<div class="flex justify-between items-center px-1">
						<label for="password" class="text-[10px] font-black uppercase tracking-widest text-slate-400">Senha</label>
						<a href="/recuperar" class="text-[10px] font-black text-brand-accent hover:underline uppercase tracking-widest">Esqueceu?</a>
					</div>
					<div class="relative">
						<span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
							<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
						</span>
						<input 
							type="password" 
							id="password" 
							bind:value={password}
							placeholder="••••••••"
							class="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 py-4 text-sm font-bold text-brand-dark outline-none transition-all placeholder:text-slate-300 focus:border-brand-dark focus:bg-white focus:ring-8 focus:ring-brand-dark/5"
						/>
					</div>
				</div>

				<button class="w-full rounded-2xl bg-brand-dark py-5 text-xs font-black uppercase tracking-[0.2em] text-white shadow-2xl shadow-brand-dark/30 transition-all hover:-translate-y-0.5 hover:shadow-brand-dark/40 active:translate-y-0">
					Entrar na Plataforma
				</button>
			</form>

			<div class="relative flex items-center justify-center py-2">
				<div class="absolute inset-0 flex items-center"><div class="w-full border-t border-slate-100"></div></div>
				<span class="relative bg-white px-6 text-[10px] font-black uppercase tracking-widest text-slate-300">ou continue com</span>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<button class="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 py-4 text-[10px] font-black uppercase tracking-widest text-brand-dark transition-all hover:bg-slate-50 hover:border-slate-300">
					<img src="https://www.google.com/favicon.ico" class="h-4 w-4" alt="Google" />
					Google
				</button>
				<button class="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 py-4 text-[10px] font-black uppercase tracking-widest text-brand-dark transition-all hover:bg-slate-50 hover:border-slate-300">
					<img src="https://www.microsoft.com/favicon.ico" class="h-4 w-4" alt="Microsoft" />
					Outlook
				</button>
			</div>

			<p class="text-center text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-wider">
				Não possui acesso? <br/>
				<a href="/contato" class="text-brand-accent hover:underline decoration-2 underline-offset-4">Solicite à sua coordenação</a>
			</p>
		</div>
	</section>
</div>