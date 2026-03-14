# ADR 0004 - Import legado na V1

## Status

Aceito

## Contexto

A V1 ja assumiu formalmente que o modelo academico oficial passa por:

- `subject`
- `assessment`
- `assessment_result`

Ao mesmo tempo, o produto ainda carrega um fluxo legado de importacao por CSV apoiado em:

- `skills`
- `student_skill_scores`
- staging de importacao via `import_jobs`, `import_rows` e `apply_import_job`

Esse fluxo ainda e util para reduzir atrito de operacao em escolas e professores que chegam com planilhas prontas. O risco e deixar esse legado voltar a ocupar o centro conceitual do produto, confundindo implementacao, onboarding tecnico e evolucao de UX.

## Decisao

Na V1, a importacao legada passa a ser tratada como:

- fluxo auxiliar de operacao
- ponte de transicao
- nao fluxo principal do produto
- nao fonte conceitual do dominio

Isso significa:

1. O caminho principal do produto para professor, coordenacao e aluno continua sendo o modelo novo baseado em `subject`, `assessment` e `assessment_result`.
2. O fluxo `/teacher/import` continua disponivel apenas para apoiar operacao legada por CSV.
3. Nenhuma tela central nova deve depender diretamente de `student_skill_scores`.
4. Se alguma leitura do legado continuar necessaria durante a transicao, ela deve ficar encapsulada em camada server/service com comentario explicito de transicao.

## Consequencias

### Positivas

- deixa claro para quem entra no projeto qual e o modelo oficial
- reduz risco de novas features nascerem presas ao legado
- preserva um caminho de adocao pragmatica para professor que ainda trabalha com CSV

### Custos e limites

- a UX do import precisa deixar evidente que se trata de fluxo auxiliar
- a documentacao precisa separar explicitamente "modelo oficial" de "fluxo legado"
- o legado continua existindo no codigo durante a transicao, mas nao deve guiar novas decisoes de dominio

## Regras de implementacao

- `/teacher/import` deve ser rotulado como legado ou auxiliar
- CTAs principais do professor devem apontar para materia e avaliacao, nao para import
- novas rotas centrais de `teacher`, `coord` e `student` nao devem ler diretamente `student_skill_scores`
- qualquer dependencia residual do legado deve ser tratada como compatibilidade temporaria
