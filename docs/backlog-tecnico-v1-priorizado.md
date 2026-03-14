# Backlog tecnico V1 priorizado

Atualizado em 2026-03-14 para refletir a ordem recomendada de execucao antes do piloto controlado.

## Regra central da V1

- `subject` e a unidade operacional principal visivel para o professor
- `assessment` e a unidade formal de avaliacao
- `assessment_result` e a origem oficial da nota
- apenas resultado publicado entra em leitura de professor, coordenacao e aluno
- `skill` continua existindo apenas como legado auxiliar

## Ordem executiva

1. PR 0 - quick wins antes do bloco grande
2. PR 1 - onboarding e vinculos como verdade nova do dominio
3. PR 2 - decidir de vez o papel da importacao legada
4. PR 3 - hardening real para piloto
5. PR 4 - exportacao minima e baseline de piloto
6. PR 5 - checagem final contra DoD e piloto controlado

## PR 0 - quick wins antes do bloco grande

Status:

`concluido`

Faz primeiro duas correcoes pequenas porque elas limpam ruido e evitam retrabalho:

- trocar o `lang="en"` de `src/app.html` para `pt-BR`
- criar uma camada unica de leitura e validacao de env para nao depender de leitura solta em `src/hooks.server.ts`

Hoje o HTML esta em ingles e o servidor quebra direto se faltar `VITE_PUBLIC_SUPABASE_URL` ou `VITE_PUBLIC_SUPABASE_ANON_KEY`. Isso funciona, mas ainda esta cru para piloto.

Arquivos alvo:

- `src/app.html`
- `src/lib/config/env.ts`
- `src/hooks.server.ts`
- `src/lib/services/supabaseClient.ts` se for necessario centralizar o bootstrap do cliente

Objetivo:

- ter um unico ponto de verdade para env
- deixar SSR e browser mais previsiveis

Progresso ja executado:

- `lang="pt-BR"` aplicado em `src/app.html`
- camada unica de env criada em `src/lib/config/env.ts` e `src/lib/config/env.server.ts`
- `src/hooks.server.ts`, `src/lib/services/supabaseClient.ts` e `src/lib/server/supabase-admin.ts` passaram a usar a nova camada centralizada
- `npm run check`, `npm run lint` e `npm run build` passaram depois da troca

## PR 1 - onboarding e vinculos como verdade nova do dominio

Status:

`em andamento`

Esse e o bloco mais importante. Os docs do repo ja deixam claro que a V1 nao deve mais depender da ideia de aluno preso a um unico professor, e que onboarding precisa suportar:

- conta sem vinculo inicial
- vinculo posterior
- multi-vinculo

O ADR do modelo academico tambem ja define que identidade da conta nao pode se confundir com vinculo academico.

### Diretriz de implementacao

Fazer de forma aditiva, nao destrutiva. Em vez de reinventar `profiles`, `students` e tudo de uma vez, criar uma camada nova de vinculo pedagogico como fonte futura de verdade.

### O que implementar

1. Criar um novo ADR, por exemplo `docs/adr/0003-vinculos-e-onboarding-v1.md`, formalizando:
   - `profiles` = identidade e autenticacao
   - `students` = entidade academica do aluno
   - `enrollments` = vinculo pedagogico do aluno com turma e professor
   - vinculo de coordenacao continua separado do vinculo pedagogico
2. Criar uma migration nova para introduzir `enrollments` como centro do vinculo, com no minimo:
   - `id`
   - `student_id`
   - `class_id`
   - `teacher_id`
   - `status` (`pending`, `active`, `archived`)
   - `claimed_by_user_id` ou equivalente
   - `joined_at`
   - `left_at`
3. Criar uma tabela de convites ou codigos, como `teacher_invite_codes` ou `class_invite_codes`, para suportar professor distribuindo codigo e aluno entrando depois.
4. Fazer backfill minimo da estrutura atual para a nova:
   - o que hoje estiver em `students.class_id` e `students.user_id` vira um `enrollment` inicial
   - esse backfill e a ponte para nao quebrar o fluxo atual de `teacher` e `student`
5. Criar ou ajustar RPCs e RLS para:
   - `claim invite code`
   - leitura de "meus vinculos"
   - definicao de vinculo ativo, se a UX precisar destacar uma turma principal

### Progresso ja executado

- ADR criado em `docs/adr/0003-vinculos-e-onboarding-v1.md`
- migration aditiva criada em `supabase/migrations/20260314210000_student_enrollments_and_invite_codes.sql`
- `enrollments` e `teacher_invite_codes` modelados com backfill, trigger de sync, RPC de claim e RLS inicial
- migration aplicada no banco remoto com `npx supabase db push`
- cadastro de aluno atualizado para permitir conta sem codigo em `src/routes/register/student/+page.svelte`
- portal do aluno atualizado para aceitar claim posterior do codigo em `src/routes/(app)/student/+page.server.ts` e `src/routes/(app)/student/+page.svelte`
- leitura longitudinal do aluno passou a preferir `enrollments` em `src/lib/server/student-longitudinal-profile.ts`
- leituras teacher de convites passaram a usar `teacher_invite_codes` em `src/routes/(app)/teacher/[classId]/+page.server.ts` e `src/routes/(app)/teacher/assessments/[assessmentId]/+page.server.ts`
- fluxo de login do aluno foi ajustado em `src/routes/login/+page.svelte` para usar codigo pendente em storage e nao depender de metadata para concluir claim
- criacao de aluno pelo professor passou a gravar o convite diretamente em `teacher_invite_codes`, sem usar `students.invite_code` como caminho principal de escrita
- portal do aluno agora lista os vinculos encontrados na conta e destaca a turma ativa, deixando o multi-vinculo visivel na UX
- rotas `student/journey` e `student/skills` agora tambem recebem e exibem os vinculos da conta, mantendo a leitura de multi-vinculo consistente nas telas principais do aluno
- leitura longitudinal principal removeu `students.invite_code` do caminho `student-self`, reforcando `enrollments` como fonte principal
- `npm run check`, `npm run lint` e `npm run build` seguem passando com as mudancas atuais

### O que ainda falta neste PR

- revisar e remover os pontos restantes de compatibilidade que ainda carregam `students.invite_code` fora da camada legada
- aprofundar a escolha explicita de vinculo ativo se a UX passar a permitir alternancia entre turmas
- revisar `src/lib/server/auth.ts` e `src/routes/(app)/student/+layout.server.ts` se surgirem needs de guard mais especifico para multi-vinculo

### Arquivos provaveis depois da migration

- `src/routes/register/student/+page.svelte`
- `src/routes/login/+page.svelte`
- `src/lib/server/auth.ts`
- `src/routes/(app)/student/+layout.server.ts`
- `src/routes/(app)/student/+page.server.ts`
- `src/lib/server/student-portal.ts`
- `src/lib/server/student-longitudinal-profile.ts`

### Criterio de pronto

Esse PR so fecha quando:

- aluno consegue criar conta sem codigo
- aluno consegue entrar no portal com estado `pending-link`
- aluno consegue adicionar vinculo depois
- aluno consegue manter mais de um vinculo sem quebrar leitura
- teacher continua convidando sem depender de gambiarra em metadata

## PR 2 - decidir de vez o papel da importacao legada

Status:

`quase concluido`

O backlog e os docs ja sao claros em dois pontos:

- falta decidir se o import legado e transicao, apoio permanente ou futura migracao para `assessment_results`
- falta impedir que `skill` volte para o centro da V1

Pelo modelo academico novo, a unidade operacional central e `subject` / `assessment` / `assessment_result`, e `skill` fica como legado auxiliar.

### Recomendacao

Na V1, o import fica como ponte operacional, nao como fluxo principal nem como fonte conceitual do produto. Ele existe para reduzir atrito de professor que vem de CSV, mas o happy path do sistema passa pelo modelo novo.

### O que fazer

1. Criar um ADR curto, por exemplo `docs/adr/0004-import-legado-v1.md`.
2. Atualizar `README.md` e este backlog deixando claro:
   - import e auxiliar
   - nao e o caminho principal
   - nenhuma tela central nova deve depender de `student_skill_scores`
3. Ajustar a UX de `/teacher/import` para deixar isso visualmente claro:
   - badge "Fluxo auxiliar/legado"
   - copy dizendo quando usar
   - CTA principal do professor apontando para materia e avaliacao, nao para import
4. Criar uma regra de engenharia:
   - nenhuma pagina nova de `teacher`, `coord` ou `student` deve ler diretamente o legado
   - se ainda precisar ler, isso deve ficar encapsulado em server/service com comentario de transicao

### Progresso ja executado

- ADR criado em `docs/adr/0004-import-legado-v1.md`
- `README.md` atualizado para deixar explicito que o modelo oficial da V1 e `subject` / `assessment` / `assessment_result`
- `README.md` tambem passou a registrar que `/teacher/import` e fluxo auxiliar e legado
- UX de `src/routes/(app)/teacher/import/+page.svelte` foi endurecida com badge de fluxo auxiliar e CTAs principais apontando para materias e avaliacoes
- dashboard teacher em `src/routes/(app)/teacher/+page.svelte` passou a tratar import como apoio operacional, com CTA rebaixado para `Import legado` e copy alinhada ao fluxo principal de materias e avaliacoes
- navegacao teacher em `src/routes/(app)/teacher/+layout.svelte` tambem passou a descrever o import como fluxo auxiliar legado
- `npm run check`, `npm run lint` e `npm run build` passaram apos as mudancas desta rodada

### O que ainda falta neste PR

- reforcar a regra de engenharia sobre encapsulamento do legado onde ainda houver dependencia residual de `student_skill_scores`

### Criterio de pronto

Esse bloco fecha quando alguem novo entrando no projeto entende, sem duvida, que:

- o modelo oficial e o novo
- o legado existe
- o legado nao manda mais no dominio

## PR 3 - hardening real para piloto

Status:

`em andamento`

Aqui o foco e fechar o gap entre "funciona" e "done". O repo ja indica progresso recente em `test`, `build` e `check`, mas ainda faltam os itens que o DoD cobra para piloto.

### Ordem interna

1. Zerar `lint`.
2. Ampliar testes automatizados por camada:
   - unitarios em `src/lib/server/*.test.ts`
   - integracao por perfil para `teacher`, `student` e `coord`
   - smoke E2E do fluxo principal
3. Fechar observabilidade e erros:
   - helper central de erro
   - logs com contexto de rota, usuario e acao
   - mensagens menos ambiguas
   - IDs ou codigos de erro para troubleshooting
4. Revisar acessibilidade e responsividade:
   - overflow horizontal
   - estados vazios, loading e erro nas rotas principais
   - teclado e foco em formularios criticos
   - contraste e hierarquia no portal do aluno
   - densidade e usabilidade desktop-first no teacher
5. Revisar performance e paginacao onde necessario

### Progresso ja executado

- baseline atual validada com `npm run check`, `npm run lint`, `npm test` e `npm run build`
- suite atual de testes passou com 23 testes verdes, cobrindo validacoes de assessments, scoring, subjects, publication helpers, longitudinal e teacher analytics
- novos testes adicionados em `src/lib/server/auth.test.ts` e `src/lib/server/publication.test.ts`
- suite atual passou a 30 testes verdes, agora cobrindo tambem helpers de auth/session e bordas de publication
- novos testes adicionados em `src/lib/server/teacher.test.ts` para ownership de turma, aluno, avaliacao e vinculo de materia no escopo do professor
- suite atual passou a 34 testes verdes, elevando a cobertura dos guards/helpers server-side mais proximos do fluxo teacher
- helpers puros do portal do aluno foram extraidos para `src/lib/server/student-portal.helpers.ts`, reduzindo acoplamento e melhorando a testabilidade do fluxo student
- novos testes adicionados em `src/lib/server/student-portal.test.ts` para estado `pending-link` e marcacao correta do vinculo ativo no conjunto de enrollments
- suite atual passou a 36 testes verdes, ampliando a cobertura do portal do aluno no modelo novo de onboarding e multi-vinculo

### Fluxos minimos em automacao

Teacher:

- cria turma
- cria ou vincula materia
- cria avaliacao
- lanca notas
- publica

Student:

- entra com ou sem vinculo
- ve home
- ve trajetoria
- ve materias e publicado

Coord:

- entra no `/coord`
- ve apenas escopo permitido
- abre drill-down do aluno

### Criterio de pronto

- `npm run check`, `npm run lint`, `npm test` e `npm run build` passam
- fluxo principal por persona passa em automacao
- erros principais sao observaveis
- app aguenta piloto sem verificacao manual constante

## PR 4 - exportacao minima e baseline de piloto

O backlog ja fala em "fechar exportacao minima necessaria", mas ainda sem definir exatamente qual. Para manter a V1 enxuta, a recomendacao e limitar a dois exports uteis:

- export de resultados publicados por avaliacao e turma
- export resumido longitudinal por aluno e materia

### Diretriz

Implementar como server action ou endpoint protegido, perto do nucleo `teacher` e `coord`, sem misturar com legado.

### Criterio de pronto

- existe export util para operacao do professor e da coordenacao
- o export usa o modelo novo
- o export nao reabre dependencia conceitual do legado

## PR 5 - checagem final contra DoD e piloto controlado

Esse bloco nao e feature; e fechamento. O gate final precisa ser tratado como criterio real de merge e deploy.

### Checklist de piloto

Tecnico:

- `npm run check`
- `npm run lint`
- `npm test`
- `npm run build`

Produto:

- fluxos principais por persona validados

Seguranca:

- guards revisados
- RLS revisada em tudo que mudou

### Criterio de pronto

- repo passa no checklist tecnico
- fluxos principais por persona foram validados
- nao existe quebra evidente de auth, role, guard ou RLS
- documentacao relevante foi atualizada

## Resumo rapido

### Primeiro

- PR 0: `lang`, env e bootstrap mais robusto

### Bloco principal

- PR 1: novo modelo de vinculo e onboarding com migration aditiva, RLS, RPC e ajustes de login/register/student
- PR 2: decisao formal do legado com UX e documentacao do import

### Fechamento

- PR 3: lint zero, integracao, smoke, observabilidade, acessibilidade e performance
- PR 4: exportacao minima
- PR 5: validacao final contra DoD e piloto controlado
