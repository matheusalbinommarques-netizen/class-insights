# Backlog Prioritário — Class Insights

Atualizado em 2026-03-14 para refletir a ordem recomendada de execução do produto antes de polimento visual mais amplo.

## Progresso registrado

### 2026-03-14 — rodada 1

- `P0.2` parcialmente concluído com ajuste do redirect pós-login por role sem depender de F5 manual
- `P0.1` iniciado com limpeza das strings mais visíveis em `home` e `login`
- `home` e `login` passaram a usar o ícone oficial `src/lib/assets/ci-icon.png`
- `npm run check`, `npm run lint` e `npm run build` passaram após essas mudanças

### 2026-03-14 — rodada 2

- `P0.3` avançado com restauração da navegação estrutural do `teacher`
- sidebar do `teacher` passou a usar o ícone oficial, estado ativo mais claro e botão de logout
- `P0.5` iniciado com prompt leve para capturar nome ausente ou genérico em `teacher`, `student` e `coord`
- `npm run check` e `npm run lint` seguiram verdes após essas mudanças

### Próxima frente imediata

- concluir a limpeza de encoding/acentuação nas demais telas críticas
- revisar escala, cálculo e formatação numérica em `teacher` e `student`

## Princípio de priorização

Esta ordem prioriza primeiro o que afeta confiança, legibilidade e funcionamento real do produto. Estética vem depois da base confiável.

## Regras de produto para esta fase

- `subject`, `assessment` e `assessment_result` continuam como modelo oficial da V1
- apenas resultados publicados entram nas leituras de professor, coordenação e aluno
- `/teacher/import` continua como fluxo auxiliar e legado
- para o MVP, `diretor` deve ser tratado como visão da coordenação, não como role nova

## P0 — Crítico: confiança e funcionamento

### 1. Corrigir acentuação e encoding em todo o app

**Objetivo:** eliminar qualquer sensação de produto quebrado por texto corrompido.

**Áreas:** home, login, teacher, student e futuros fluxos de coordenação.

**Ações:**

- garantir UTF-8 em todos os arquivos
- revisar strings fixas do front
- validar fonte e renderização de caracteres pt-BR
- padronizar formatação pt-BR no front
- revisar dados vindos do banco e seed

**Critério de pronto:**

- nenhuma palavra com caractere corrompido
- textos legíveis em todas as páginas principais

### 2. Corrigir login para entrar sem precisar de F5

**Objetivo:** garantir que o acesso funcione de forma imediata e previsível.

**Áreas:** login, auth, sessão e redirecionamento por role.

**Ações:**

- revisar fluxo de sessão após sign-in
- atualizar corretamente o estado do usuário no client
- garantir redirecionamento imediato por perfil
- revisar `load`, hooks, invalidação de sessão e hidratação
- exibir estado de loading claro durante a entrada

**Critério de pronto:**

- usuário entra e cai direto na área correta
- nenhum refresh manual é necessário
- estado de carregamento fica claro durante o login

### 3. Restaurar a navegação estrutural do teacher

**Objetivo:** devolver estabilidade e orientação na área interna do professor.

**Áreas:** teacher.

**Ações:**

- tornar a sidebar fixa e estável
- inserir o ícone oficial do app na navegação: `src/lib/assets/ci-icon.png`
- corrigir truncamentos como `Clas Insig...`
- destacar claramente o item ativo do menu
- adicionar botão de logout

**Critério de pronto:**

- a sidebar não desaparece sem motivo
- o usuário entende onde está
- o logout está sempre acessível

### 4. Corrigir formatação numérica e regras erradas de leitura

**Objetivo:** garantir coerência pedagógica e credibilidade nos dados exibidos.

**Áreas:** student e teacher.

**Ações:**

- padronizar escala das notas
- padronizar locale pt-BR
- revisar cálculo de média, prioridade, risco e gap
- ajustar regra para exibir `Tudo dentro do esperado` quando não houver item abaixo da meta

**Critério de pronto:**

- números exibidos fazem sentido
- prioridades refletem a situação real
- não há alertas falsos

### 5. Capturar e salvar nome do usuário quando faltar

**Objetivo:** substituir mensagens genéricas por uma experiência mais pessoal e adequada.

**Áreas:** login, onboarding, teacher e student.

**Ações:**

- se `display_name` estiver vazio, abrir prompt leve de preenchimento
- salvar nome no perfil
- usar o nome nas áreas internas

**Critério de pronto:**

- o usuário sempre vê o próprio nome
- não existem mensagens genéricas como `Usuário`

## P1 — Clareza de produto e posicionamento

### 6. Refazer o hero da home

**Objetivo:** deixar a proposta clara já no primeiro bloco da página.

**Ações:**

- remover `edtech platform`
- usar o ícone oficial
- escrever headline e subheadline mais diretas
- trabalhar com um CTA principal e um CTA secundário
- mostrar uma prova visual do produto com mais foco

**Direção de copy:**

- headline: `Acompanhe a aprendizagem com clareza, não só com notas soltas.`
- subheadline: `O Class Insights ajuda professores, coordenação e alunos a transformar avaliações em leitura pedagógica acionável.`
- CTAs: `Entrar` e `Ver como funciona`

### 7. Reduzir repetição e excesso de explicação na home

**Objetivo:** tornar a home mais convincente e menos cansativa.

**Ações:**

- cortar cards redundantes
- reduzir texto institucional
- diminuir elementos decorativos sem função
- concentrar a página em poucas seções fortes

**Estrutura ideal:**

- hero
- como funciona em 3 passos
- três leituras do produto
- CTA final

### 8. Melhorar a seção de perfis

**Objetivo:** deixar claro o valor para cada público.

**Ações:**

- trocar texto genérico por benefícios concretos
- mostrar 3 entregas objetivas para cada persona
- tornar coordenação consistente com o produto real
- definir se `diretor` é nome comercial ou role separada

### 9. Refazer a tela de login para parecer produto, não formulário

**Objetivo:** aumentar clareza e percepção de valor já no acesso.

**Ações:**

- remover `edtech platform`
- usar o ícone oficial
- simplificar o bloco lateral
- dar mais contraste entre login e primeiro acesso

**Estrutura sugerida:**

- lado esquerdo: proposta curta + 3 bullets de valor
- lado direito: login + opções de primeiro acesso

### 10. Reescrever os textos da home e do login

**Objetivo:** remover linguagem genérica, abstrata ou artificial.

**Ações:**

- trocar frases vagas por linguagem humana
- remover exageros e jargões
- priorizar clareza operacional

**Exemplos de direção:**

- em vez de `acesso inteligente`, usar `Entre na sua área`
- em vez de `produto orientado à ação`, usar `Menos retrabalho. Mais leitura clara.`

### 11. Adicionar fluxo de cadastro para coordenação

**Objetivo:** alinhar a proposta do produto com o acesso real.

**Ações:**

- criar opção de primeiro acesso para coordenação
- definir se haverá convite, vínculo institucional ou aprovação
- garantir redirecionamento correto após entrada

### 12. Definir `diretor` antes de implementar

**Objetivo:** evitar abrir uma frente de permissão e navegação antes da hora.

**Recomendação para MVP:**

- tratar `diretor` como uma visão da coordenação, não como role nova

**Motivo:**

- evita complexidade prematura em permissão, navegação e RLS

## P2 — Teacher como cockpit de trabalho

### 13. Reorganizar a dashboard do professor em torno de ação

**Objetivo:** transformar a home do teacher em uma tela de prioridade, não em uma vitrine de cards.

**Blocos sugeridos:**

- pendências operacionais
- leituras pedagógicas
- ações rápidas
- turmas vivas

### 14. Criar orientação contextual de próximo passo

**Objetivo:** dizer claramente o que o professor deve fazer em seguida.

**Exemplos:**

- `Você tem 1 rascunho pronto para publicar`
- `2 matérias ainda sem avaliação nesta turma`
- `Nenhum aluno abaixo da meta nesta matéria`

**Critério de pronto:**

- o professor nunca fica sem saber qual é o próximo clique

### 15. Enxugar e padronizar pills e cards

**Objetivo:** melhorar legibilidade e reduzir ruído visual.

**Ações:**

- limitar o tamanho dos textos
- usar labels curtas
- padronizar altura dos cards
- reduzir variações decorativas

### 16. Dar contexto aos números

**Objetivo:** fazer cada métrica ser imediatamente compreensível.

**Ações:**

- sempre exibir escala e referência
- mostrar comparação quando houver

**Exemplos:**

- `Média publicada: 6,4 / 10`
- `Cobertura: 86% dos resultados esperados`
- `Tendência: -0,2 em relação à avaliação anterior`

### 17. Melhorar empty states e estados de atenção

**Objetivo:** evitar que telas vazias pareçam erro ou quebra.

**Criar estados para:**

- sem turma
- sem matéria vinculada
- sem avaliação criada
- sem publicação pendente
- nenhuma matéria em atenção
- nenhum aluno abaixo da meta

### 18. Rebaixar visualmente o import legado

**Objetivo:** manter essa ação como apoio, sem competir com o fluxo principal.

**Ações:**

- tratar como ação secundária
- mover para menu ou área menos central

## P3 — Student simples, claro e confiável

### 19. Reorganizar a página do aluno com foco em progresso

**Objetivo:** deixar a leitura simples e útil para quem está estudando.

**Topo da página:**

- média atual
- situação geral
- matéria que precisa de atenção, se existir
- evolução recente

**Abaixo:**

- jornada ou histórico
- matérias
- últimas avaliações

### 20. Manter só a pill de jornada

**Objetivo:** remover redundâncias que pesam a leitura.

**Ação:**

- se a pill superior já resolve, eliminar duplicações com botões ou blocos antigos

### 21. Corrigir a lógica de matéria prioritária

**Objetivo:** só chamar atenção quando houver motivo real.

**Regra:**

- só mostrar prioridade se houver matéria abaixo da meta ou referência
- caso contrário, mostrar `Tudo dentro do esperado` ou `Nenhuma matéria exige atenção agora`

### 22. Trocar linguagem técnica por linguagem de aluno

**Objetivo:** falar com clareza, sem termos institucionais.

**Evitar:**

- dispersão
- cobertura
- leitura institucional
- prioridade macro

**Preferir:**

- seu progresso
- onde você foi melhor
- onde vale revisar
- como você vem evoluindo

### 23. Melhorar o mobile-first do aluno

**Objetivo:** fazer dessa a área mais leve, direta e confortável no celular.

**Ações:**

- reduzir tamanho de cards
- evitar muitos blocos lado a lado
- tornar a jornada mais linear
- focar no que realmente muda a vida do aluno

## P4 — Coordenação

### 24. Fechar escopo da coordenação antes da camada visual

**Objetivo:** definir claramente quais perguntas essa área precisa responder.

**Perguntas-chave:**

- quais turmas estão piores?
- quais matérias mais exigem atenção?
- onde a tendência está caindo?
- quais professores ou turmas têm pendências operacionais?

### 25. Criar dashboard institucional de leitura

**Objetivo:** diferenciar coordenação de professor.

**Coordenação deve ver:**

- comparativo entre turmas
- matérias críticas
- tendências
- pendências de publicação e cobertura
- leitura macro institucional

## P5 — Acabamento de produto maduro

### 26. Padronizar ícone e branding em toda a experiência

**Objetivo:** dar unidade visual ao produto.

**Áreas:** home, login, sidebar, favicon e abas.

**Asset oficial:** `src/lib/assets/ci-icon.png`

### 27. Melhorar títulos das abas

**Objetivo:** reforçar contexto e consistência.

**Exemplos:**

- `Class Insights — Início`
- `Class Insights — Login`
- `Class Insights — Professor`
- `Class Insights — Avaliações`

### 28. Padronizar o sistema visual

**Objetivo:** parar de parecer que cada bloco foi feito separadamente.

**Definir:**

- grid
- espaçamentos
- altura de cards
- radius
- hierarquia tipográfica
- cores por status
- estilo de pills
- estilo de botões

### 29. Melhorar microcopy e feedbacks

**Objetivo:** deixar ações e respostas do sistema mais claras e humanas.

**Exemplos:**

- `Turma criada com sucesso`
- `Avaliação salva como rascunho`
- `Publicação concluída`
- `Você saiu da conta`

### 30. Criar checklist de qualidade por tela

**Objetivo:** garantir consistência antes de considerar uma página pronta.

**Checklist por página:**

- texto com acento correto
- loading adequado
- empty state adequado
- error state adequado
- CTA principal claro
- branding consistente
- responsividade validada

### 2026-03-14 - rodada 3

- `P0` concluido com limpeza de caracteres corrompidos nas areas principais, login sem F5, teacher com navegacao estavel, padronizacao numerica e captura de nome ausente
- busca por `�` em `src/routes` e `src/lib` voltou vazia ao final da rodada
- `npm run check`, `npm run lint` e `npm run build` passaram apos o fechamento do P0

### 2026-03-14 - rodada 4

- `P1` concluido com nova home enxuta em 4 blocos: hero, como funciona em 3 passos, leituras por perfil e CTA final
- `login` reposicionado com copy mais direta e primeiro acesso explicito para professor, aluno e coordenacao
- criado `register/coord` para dar visibilidade real ao acesso de coordenacao
- mantida a decisao de produto: `diretor` segue como visao da coordenacao no MVP, sem role nova

### 2026-03-14 - rodada 5

- `P2` concluido com a dashboard do professor reorganizada como cockpit de trabalho em `pendencias operacionais`, `leituras pedagogicas`, `acoes rapidas` e `turmas vivas`
- cada turma agora mostra contexto claro para numeros, `proximo passo`, cobertura, tendencia, gaps e estado de atencao
- criados empty states e estados de atencao para setup, falta de materia, falta de avaliacao e ausencia de riscos reais
- `import legado` foi rebaixado visualmente para nao competir com o fluxo principal do professor
- `npm run check`, `npm run lint` e `npm run build` passaram apos o fechamento do P2

### 2026-03-14 - rodada 6

- `P3` concluido com a experiencia do aluno simplificada em progresso, jornada e materias, com foco em leitura direta e mobile-first
- a home do aluno agora prioriza apenas `media atual`, `situacao geral`, `onde vale revisar` e `evolucao recente`
- a `materia prioritaria` so aparece quando ha algo realmente em atencao; caso contrario a interface mostra `Tudo dentro do esperado`
- a jornada ficou linear e centrada em historico de publicacoes, e a tela de materias trocou linguagem tecnica por linguagem de aluno
- `npm run check`, `npm run lint` e `npm run build` passaram apos o fechamento do P3

### 2026-03-14 - rodada 7

- `P4` concluido com a area de coordenacao reposicionada como dashboard institucional, focada em comparativo entre turmas, materias criticas, tendencias de queda e pendencias operacionais
- a tela de coordenacao agora responde explicitamente quais turmas estao piores, quais materias mais exigem atencao, onde a tendencia esta caindo e quais professores ou turmas ainda pedem acompanhamento
- o fluxo de `codigo da turma` foi mantido como apoio para ampliar escopo, mas deixou de ser o centro da experiencia
- `npm run check` e `npm run build` passaram apos o fechamento do P4
- `npm run lint` seguiu bloqueado por um crash da regra `@typescript-eslint/no-unused-vars` ao analisar o arquivo `.svelte` da coordenacao, apesar de o arquivo estar formatado e sem erros no `check`

### 2026-03-14 - rodada 8

- corrigido o teacher para exibir o `codigo da turma` na pagina detalhada da turma, usando o `access_code` ja gerado no banco
- removida a dependencia obrigatoria de `SUPABASE_SERVICE_ROLE_KEY` na leitura da coordenacao; o dashboard institucional agora tenta montar os dados com `locals.supabase`
- `npm run check` e `npm run build` passaram apos esse ajuste de bloqueio previo ao `P5`

### 2026-03-14 - rodada 9

- corrigida a leitura incompleta da coordenacao: a tela mostrava medias publicadas, mas ainda zerava `turmas no escopo` porque faltava uma fonte segura para turmas e alunos do escopo
- criado o snapshot institucional via RPCs `coord_scope_classes()` e `coord_scope_students()` para a coordenacao ler turmas e alunos do proprio escopo sem depender de `service role`
- aplicada a migration `20260314195000_coord_scope_snapshot_rpc.sql` com `npx supabase db push --include-all`

### 2026-03-14 - rodada 10

- `P5` concluido com padronizacao do branding em favicon, abas e layouts internos, usando o icone oficial tambem na coordenacao
- titulos das paginas internas foram alinhados para o padrao `Class Insights - ...` em professor, coordenacao, cadastro e recuperacao de senha
- criado o documento `docs/checklist-qualidade-por-tela.md` para travar o criterio de pronto visual e funcional por pagina
- mantida a base visual compartilhada em `src/lib/styles/base.css` para reduzir a sensacao de blocos independentes
