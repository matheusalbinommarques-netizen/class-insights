# Backlog tecnico V1 priorizado

Atualizado em 2026-03-14 para refletir o progresso real executado no repo apos a rodada de aluno, coordenacao, teacher e hardening inicial.

## Regra central da V1

- `subject` e a unidade operacional principal visivel para o professor
- `assessment` e a unidade formal de avaliacao
- `assessment_result` e a origem oficial da nota
- apenas resultado publicado entra em leitura de professor, coordenacao e aluno
- `skill` continua existindo apenas como legado auxiliar

## O que ja esta consolidado

Estas frentes ja existem e nao sao mais o centro do backlog:

- autenticacao com Supabase
- separacao por perfil `teacher`, `student` e `coord`
- guards por role
- criacao de turma, materia e avaliacao
- lancamento por avaliacao no modelo novo
- publicacao por avaliacao com bloqueio pos-publicacao
- fluxo oficial de correcao por novo rascunho apos publicacao
- dashboard teacher e tela da turma no fluxo novo
- portal do aluno lendo dados reais publicados
- contrato longitudinal compartilhado entre `teacher` e `student`
- primeira camada de analytics teacher orientados a decisao
- ergonomia principal do fluxo teacher `turma -> materia -> avaliacao`
- coordenacao com entrada propria em `/coord`
- vinculo `coord -> class` por codigo de turma
- dashboard institucional inicial com escopo por turma
- drill-down institucional da coordenacao para o perfil longitudinal do aluno
- import legado funcionando como fluxo auxiliar

## Status executivo

### Feito nesta rodada

1. fechar o contrato do dado publicado
2. transformar longitudinal em contrato central compartilhado
3. iniciar a tomada de decisao do professor em cima desse contrato
4. colocar coordenacao para funcionar no modelo novo basico
5. consolidar a experiencia central do aluno no contrato longitudinal
6. abrir o drill-down institucional da coordenacao para o aluno
7. refinar analytics e ergonomia principal do teacher
8. iniciar hardening com testes server, build e limpeza parcial de lint

### Agora e o foco real

1. atacar onboarding e vinculos novos
2. decidir o lugar definitivo do legado de importacao
3. endurecer o produto para piloto ate fechar o DoD real

## P0

### 1. Experiencia central do aluno em volta do longitudinal

Status:
`feito`

O que ja foi feito:

- existe contrato server unico do perfil longitudinal
- `teacher` e `student` ja consomem a mesma base de leitura
- timeline, gaps, tendencia e resumo por materia ja estao unificados no backend
- navegacao `Inicio -> Trajetoria -> Materias` foi consolidada
- home, trajetoria e materias agora leem o mesmo contrato longitudinal
- narrativa visual de melhora, queda, estabilidade e prioridades por materia foi reforcada
- estados de `pending-link` e leitura por materia foram alinhados ao fluxo real do portal

O que falta:

- manter consistencia visual e de copy conforme o portal evoluir
- cobrir o fluxo do aluno em automacao no hardening

Criterio de pronto:

- o aluno entende rapidamente onde esta bem, onde caiu e o que foi publicado
- a trajetoria vira o centro do portal
- a leitura por materia fica coerente com a leitura longitudinal

## P1

### 2. Completar analytics teacher como fluxo de decisao

Status:
`feito no nucleo`

O que ja foi feito:

- dashboard teacher agora separa sinal operacional e pedagogico
- filas de acao ja apontam para turma, avaliacao ou aluno
- risco individual, gap contra a turma e queda recente por materia ja entram no dashboard
- thresholds e sinais principais foram consolidados em helpers compartilhados
- comparativos por materia dentro da turma passaram a aparecer no dashboard
- teacher agora consegue sair de insight para turma, aluno e avaliacao com menos friccao

O que falta:

- revisar consistencia fina dos pontos de entrada restantes durante o hardening
- cobrir com mais testes os sinais criticos do dashboard

Criterio de pronto:

- professor entende o que fazer agora
- cada insight aponta para o proximo drill-down correto
- comparativos por materia ficam consistentes

### 3. Refinar a ergonomia do fluxo operacional do professor

Status:
`em andamento avancado`

O que ja foi feito:

- fluxo principal turma -> materia -> avaliacao -> resultado -> publicacao funciona
- dashboard e tela de avaliacao ja ajudam com estados operacionais relevantes
- a tela da turma ganhou proximo passo operacional e atalhos diretos
- materias sem avaliacao passaram a empurrar o professor para o CTA correto
- edge cases como turma sem alunos e materia sem avaliacao receberam tratamento melhor
- o caminho `turma -> materia -> avaliacao` foi encurtado

O que falta:

- fechar detalhes de operacao em lote no lancamento da avaliacao
- revisar acabamentos de UX e lint nas telas teacher ainda antigas
- cobrir melhor os fluxos principais em testes manuais e automatizados

Criterio de pronto:

- um professor consegue sair de turma vazia ate avaliacao publicada sem ambiguidade
- o detalhe da avaliacao suporta lancamento rapido de turma inteira

## P2

### 4. Completar coordenacao no modelo novo

Status:
`em andamento`

O que ja foi feito:

- existe modelo explicito de vinculo `coord -> class`
- existe codigo de turma para coordenacao
- RLS de leitura institucional foi fechada para escopo por turma administrada
- `/coord` agora carrega dashboard institucional real
- coordenacao ja le turmas, materias, professores e alunos apenas no proprio escopo
- a tela do aluno ja pode ser aberta a partir do dashboard institucional
- o drill-down institucional reaproveita o mesmo contrato longitudinal de `teacher` e `student`

O que falta:

- aprofundar as queries institucionais para decisao, nao apenas leitura macro
- evoluir filtros e comparativos institucionais por turma, materia e professor

Criterio de pronto:

- coordenacao enxerga apenas seu escopo
- existe leitura macro de turmas, materias, professores e alunos
- a tela do aluno pode ser aberta a partir do dashboard institucional

### 5. Modelo novo de vinculo e onboarding

Status:
`nao iniciado`

O que falta:

- aluno poder existir sem vinculo academico inicial
- aluno poder acumular mais de um vinculo de professor
- professor poder convidar alunos sem prender a conta a um unico fluxo
- separar identidade da conta, vinculo institucional e vinculo pedagogico

Criterio de pronto:

- onboarding suporta estados sem vinculo e vinculacao posterior
- o dominio nao depende mais de suposicoes de vinculo unico

## P3

### 6. Decidir o destino da importacao legada

Status:
`nao iniciado de produto`

O que falta:

- decidir se o import fica como transicao, apoio permanente ou migracao futura para `assessment_results`
- manter UX e documentacao deixando claro que nao e fluxo principal
- impedir regressao que recoloque `skill` no centro da V1

Criterio de pronto:

- o lugar do import dentro da V1 esta claro
- nenhuma tela central volta a depender do modelo legado

### 7. Hardening para piloto

Status:
`em andamento inicial`

O que ja foi feito:

- testes unitarios server foram ampliados para analytics teacher
- `npm test`, `npm run build` e `npm run check` ja passaram nas rodadas recentes
- formatacao do repo foi estabilizada no baseline atual
- parte relevante do lint nas telas novas de student, coord e teacher ja foi limpa

O que falta:

- ampliar testes unitarios
- criar testes de integracao por perfil
- criar smoke tests ponta a ponta
- melhorar observabilidade
- revisar acessibilidade
- revisar performance e paginacao
- fechar exportacao minima necessaria
- alinhar o repo ao proprio DoD, incluindo `lint`

Criterio de pronto:

- fluxo principal passa em automacao
- erros principais sao observaveis
- app aguenta piloto sem verificacao manual constante

## Ordem pratica recomendada a partir de agora

### Etapa 1

1. fechar o bloco de onboarding e vinculos
2. modelar aluno sem vinculo inicial
3. abrir caminho para multi-vinculo com professor

### Etapa 2

1. decidir o destino da importacao legada
2. ajustar UX e documentacao para deixar claro que o import nao e o fluxo principal
3. impedir regressao de dependencia no modelo legado

### Etapa 3

1. zerar `lint`
2. cobrir fluxos principais com integracao e smoke tests
3. atacar observabilidade, acessibilidade e performance

### Etapa 4

1. fechar exportacao minima necessaria
2. validar conformidade final com DoD
3. preparar baseline de piloto sem dependencia de verificacao manual constante

## Resumo rapido

### Ja entregue

- correcao pos-publicacao com novo rascunho
- contrato longitudinal compartilhado entre teacher e student
- teacher dashboard com sinais operacionais e pedagogicos
- coordenacao por codigo de turma com escopo real
- portal do aluno consolidado em home, trajetoria e materias
- drill-down institucional da coordenacao para o aluno
- ergonomia principal do fluxo teacher
- hardening inicial com testes server e build/check consistentes

### Proximo bloco

- onboarding e vinculos multi-escopo
- definicao do papel da importacao legada
- hardening para piloto ate fechar o DoD tecnico

### Depois

- observabilidade, acessibilidade, performance e exportacao minima
