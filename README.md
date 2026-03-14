# Class Insights

Plataforma educacional focada em transformar notas em leitura pedagogica acionavel para tres personas:

- **Professor**: operacao da turma, avaliacoes, publicacao e acompanhamento pedagogico.
- **Coordenacao**: leitura institucional de turmas, materias, tendencias e pendencias.
- **Aluno**: progresso claro, historico recente e ponto de atencao quando houver.

## Estado atual

O projeto ja tem base funcional real, mas a prioridade atual e fechar confianca, consistencia e acabamento antes de abrir novas frentes visuais ou analiticas.

### Ja existe

- Autenticacao com Supabase
- Separacao por persona (`teacher`, `student`, `coord`)
- Dashboard do professor
- Gestao de turmas
- Gestao de materias, avaliacoes e resultados
- Grid operacional de notas
- Escala padrao por turma com override quando aplicavel
- Importacao CSV com preview, staging, validacao e apply via RPC
- Portal do aluno com vinculo posterior e suporte a multi-vinculo
- Selecao explicita de turma ativa no portal do aluno
- Export CSV de resultados publicados por avaliacao
- Export CSV de resumo longitudinal institucional

### Em foco agora

- sanidade textual e encoding
- semantica numerica e confianca no dado exibido
- remocao de duplicacoes estruturais
- mini design system compartilhado
- diferenciacao mais clara entre professor, aluno e coordenacao

## Objetivo do produto

Instituicoes de ensino costumam trabalhar com dados frios: a nota mostra o resultado, mas nem sempre explica o caminho. O Class Insights foi desenhado para fechar o ciclo:

**Dado -> Insight -> Intervencao -> Resultado**

O foco do MVP e reduzir friccao operacional para o professor e aumentar a clareza do progresso para o aluno, sem perder leitura macro para a coordenacao.

## Modelo oficial da V1

O caminho oficial de dominio na V1 e:

- `subject`
- `assessment`
- `assessment_result`

Esse e o modelo principal de leitura e evolucao para professor, coordenacao e aluno.

## Papel do import legado

O fluxo de `/teacher/import` continua existindo para reduzir atrito operacional de quem chega com CSV, mas deve ser tratado como:

- auxiliar
- legado
- fora do caminho principal do produto

Nenhuma tela central nova deve depender diretamente de `student_skill_scores`.

## Prioridade atual de execucao

O backlog vivo do projeto esta em `docs/backlog-tecnico-v1-priorizado.md` e segue esta ordem:

1. confianca do produto
2. base visual minima compartilhada
3. fluxo publico com cara de produto
4. teacher como cockpit limpo
5. portal do aluno coerente
6. coordenacao com leitura institucional
7. home final

## Stack

- **Front-end / App:** SvelteKit + TypeScript
- **Build tool:** Vite
- **Lint / Format:** ESLint + Prettier
- **E2E:** Playwright
- **Backend / Auth / DB:** Supabase
- **SSR Auth:** `@supabase/ssr`
- **Client Auth / DB:** `@supabase/supabase-js`

## Estrutura principal

```txt
src/
  lib/
    config/
    server/
    services/
    styles/
    types/
  routes/
    +layout.svelte
    +page.svelte
    login/
    register/
      student/
      teacher/
      coord/
    (app)/
      teacher/
        [classId]/
        assessments/
        import/
        subjects/
      student/
        journey/
        skills/
      coord/
```

## Documentos de referencia

- `docs/adr/0002-modelo-academico-v1.md`: contrato do dominio alvo da V1
- `docs/adr/0003-vinculos-e-onboarding-v1.md`: separacao entre identidade, entidade academica e vinculos
- `docs/adr/0004-import-legado-v1.md`: papel do import legado como fluxo auxiliar na V1
- `docs/definition-of-done.md`: regua de pronto tecnica e de produto
- `docs/checklist-qualidade-por-tela.md`: checklist minimo por pagina
- `docs/backlog-tecnico-v1-priorizado.md`: backlog prioritario de execucao

## Validacao local

- `npm run check`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run test:e2e`

Os smoke E2E usam Playwright com bypass de autenticacao habilitado apenas quando o servidor local sobe com `CI_E2E_AUTH_ENABLED=true`.
