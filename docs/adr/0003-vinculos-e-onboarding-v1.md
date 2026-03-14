# ADR 0003 - Vinculos e onboarding da V1

- **Status:** Aceito
- **Data:** 2026-03-14

## Contexto

O modelo atual da V1 ainda carrega uma ambiguidade importante:

- `profiles` representa a identidade autenticada
- `students` continua sendo tratado em varios pontos como se fosse tambem o vinculo da conta
- o backlog da V1 exige conta sem vinculo inicial, vinculacao posterior e multi-vinculo

O ADR 0002 ja deixou explicito que a identidade da conta nao pode se confundir com o vinculo academico. Falta traduzir isso para uma camada de dominio e onboarding que permita evolucao aditiva.

## Decisao

Adotar a seguinte separacao para a V1:

### 1. `profiles` continua como identidade e autenticacao

- representa a conta autenticada
- define o `role`
- nao define sozinho o vinculo academico do aluno

### 2. `students` continua como entidade academica

- representa o aluno no dominio academico
- continua sendo a entidade usada por avaliacao, resultado e historico
- nao deve ser tratado como sinonimo da conta autenticada

### 3. `enrollments` passa a representar o vinculo pedagogico

Cada enrollment explicita:

- qual `student` esta vinculado
- em qual `class`
- sob qual `teacher`
- com qual `status`
- qual `profile` reivindicou o vinculo

Na V1, esse enrollment vira a ponte entre onboarding, RLS e leitura do portal do aluno.

### 4. Vinculo de coordenacao continua separado

- `coord -> class` continua como vinculo institucional
- ele nao substitui nem mistura o vinculo pedagogico `student -> class -> teacher`

### 5. Convites passam a ser explicitados

Codigos de convite deixam de ser apenas um detalhe solto em `students.invite_code` e passam a ter tabela propria para suportar:

- claim posterior
- rastreabilidade
- evolucao para multi-vinculo

## Consequencias

### Positivas

- onboarding deixa de depender de vinculo unico
- aluno pode criar conta sem codigo inicial
- aluno pode acumular mais de um vinculo sem quebrar a identidade
- RLS e RPCs passam a ter uma base mais explicita para leitura e claim

### Trade-offs

- o dominio passa a conviver por um tempo com `students.user_id` e `enrollments.claimed_by_user_id`
- parte da compatibilidade da V1 depende de backfill e sincronizacao entre modelo atual e novo
- a UX inicial ainda pode operar com um vinculo principal implicito enquanto a troca de vinculo nao e desenhada

## Decisoes derivadas

1. `profiles` nao substitui `students`.
2. `students` continua sendo a entidade referenciada por `assessment_results`.
3. `enrollments` passa a ser a fonte de verdade do vinculo pedagogico para onboarding e leitura do aluno.
4. Convites do professor devem ser modelados em tabela propria.
5. O fluxo antigo baseado em `students.user_id` so continua enquanto ponte de compatibilidade.

## Proximos passos

1. Criar migration aditiva para `enrollments` e `teacher_invite_codes`.
2. Fazer backfill minimo a partir de `students.class_id`, `students.user_id` e `students.invite_code`.
3. Atualizar RPC de claim e leitura do aluno para preferir `enrollments`.
4. Ajustar cadastro/login/portal para suportar conta sem codigo e vinculacao posterior.
