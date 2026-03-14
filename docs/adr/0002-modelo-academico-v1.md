# ADR 0002 - Modelo academico da V1

- **Status:** Aceito
- **Data:** 2026-03-13

## Contexto

O MVP atual do Class Insights ja entrega:

- autenticacao e separacao por perfis
- criacao de turmas
- cadastro/importacao de alunos
- cadastro de skills
- grid operacional de notas
- snapshots e leituras iniciais
- portal do aluno com dados reais

Mas ainda existe uma lacuna estrutural entre o backlog do produto e o dominio implementado:

- `skill` hoje funciona como unidade de lancamento e leitura
- o backlog exige tambem `subject`/materia
- nao existe entidade formal de avaliacao
- nao existe separacao entre rascunho e publicado
- o historico longitudinal ainda nao nasce de publicacoes formais

Sem resolver isso, dashboards, coordenacao e longitudinal correm risco de crescer em cima de um modelo ambiguo.

## Decisao

Adotar o seguinte modelo minimo da V1:

### 1. `subject` e `skill` coexistem

- `subject` representa a materia academica formal
- `skill` representa o eixo/competencia observada dentro da turma

Na V1:

- a operacao principal de avaliacao fica ligada a `subject`
- a leitura pedagogica pode continuar agregando por `skill` quando fizer sentido
- uma turma pode ter varias materias
- uma materia pertence a uma turma via vinculo explicito

### 2. Introduzir `assessment`

Toda avaliacao formal deve possuir:

- `class_id`
- `subject_id`
- `title`
- `assessment_date`
- `weight`
- `status`

O campo `status` deve comecar em `draft` e so pode ir para `published`.

### 3. Introduzir `assessment_result`

As notas de alunos deixam de existir apenas como score agregado bruto e passam a ter origem formal em uma avaliacao.

Cada resultado deve possuir:

- `assessment_id`
- `student_id`
- `raw_score`
- `score_min`
- `score_max`
- `score_decimals`
- `is_excused`
- `notes`

Isso preserva o contexto da avaliacao e permite historico correto.

### 4. Publicacao acontece por avaliacao

A publicacao da V1 sera feita no nivel da avaliacao, nao da turma inteira nem da materia inteira.

Consequencias:

- o professor revisa uma avaliacao
- publica quando concluir a revisao
- o aluno so enxerga resultados publicados
- agregados longitudinals consideram apenas dados publicados

### 5. Longitudinal nasce do publicado

Toda leitura longitudinal deve considerar apenas resultados publicados.

Isso vale para:

- professor
- coordenacao
- aluno

Assim, o historico deixa de misturar dado ainda em revisao com dado entregue.

### 6. Coordenacao opera em escopo de turmas administradas

O papel `coord` deve enxergar:

- turmas que administra
- materias presentes nessas turmas
- professores ligados a essas turmas
- alunos dentro do seu escopo

Nao deve operar nota por nota como rotina principal.

### 7. A identidade da conta nao se confunde com o vinculo academico

O fluxo de acesso passa a seguir esta cadeia:

- coordenador tem login proprio
- coordenador se vincula por codigo de turma
- professor tem login proprio
- professor convida alunos por codigo
- aluno pode iniciar sem codigo e completar vinculos depois
- aluno pode acumular mais de um codigo de professor

Consequencias:

- o modelo nao pode assumir que o aluno nasce preso a um unico professor
- vinculo de coordenacao por turma e vinculo pedagogico precisam ser explicitados no dominio
- o fluxo do professor nao depende do coordenador para existir
- o onboarding deve suportar conta criada antes do primeiro vinculo academico

## Modelo alvo da V1

Entidades centrais:

- `institutions`
- `profiles`
- `classes`
- `subjects`
- `class_subjects`
- `teachers`
- `students`
- `enrollments`
- `skills`
- `assessments`
- `assessment_results`
- `result_publications` ou campos de publicacao em `assessments`
- `grade_audit_log`

## Consequencias positivas

- fecha o ciclo operacional real
- viabiliza publicacao formal
- cria base correta para longitudinal
- evita dashboards em cima de score sem contexto
- prepara a coordenacao para leitura institucional

## Trade-offs

- aumenta a complexidade do dominio
- exige migracao gradual do modelo atual
- obriga decisoes explicitas sobre `subject` x `skill`
- pode manter convivendo por algum tempo o score agregado legado e o modelo novo

## Decisoes derivadas

1. Toda consulta do aluno deve considerar apenas resultados publicados.
2. Toda agregacao longitudinal deve ignorar rascunhos.
3. O professor continua com experiencia operacional rapida, mas agora dentro do contexto de uma avaliacao.
4. `skill` continua relevante para analytics, mas nao substitui `subject` como materia formal.
5. Coordenacao entra apenas depois do modelo de avaliacao/publicacao estar fechado.
6. O modelo de autenticacao e convite precisa evoluir para suportar vinculos explicitos `coord -> class` e `teacher -> student`.

## Proximos passos

1. Criar contratos de dominio para `assessment`, `publication` e `longitudinal`.
2. Planejar migracoes e RLS correspondentes.
3. Adaptar o nucleo professor para operar por avaliacao.
4. Construir a tela longitudinal reutilizavel para os tres perfis.
