# Class Insights

Plataforma educacional focada em transformar notas em **insights pedagógicos acionáveis**, com dois portais principais:

- **Professor/Coordenação**: gestão de turmas, skills, notas, importação via CSV, snapshots e cockpit de acompanhamento.
- **Aluno**: visualização de progresso por skill, resumo de evolução e feedback mais claro sobre pontos fortes e pontos de atenção.

---

## Status do projeto

**Fase atual:** MVP funcional do núcleo professor, base real do portal do aluno e pipeline de importação com staging.

### Já existe

- Autenticação com Supabase
- Separação por persona (`teacher`, `student`, `coord`)
- Dashboard do professor
- Gestão de turmas
- Gestão de alunos e skills
- Grid operacional de notas
- Escala padrão por turma com override por skill
- Importação CSV com preview, staging, validação e apply via RPC
- Snapshots de evolução
- Portal do aluno com dados reais de skills e progresso
- Selecao explicita de turma ativa no portal do aluno com suporte a multi-vinculo
- Export CSV de resultados publicados por avaliacao
- Export CSV do resumo longitudinal institucional por aluno

### Em evolução

- Heatmap e BI prescritivo do professor
- Skill tree visual do aluno
- Dashboard da coordenação
- Intervenções pedagógicas mínimas
- Hardening final para piloto
- Smoke server-side e observabilidade minima com codigos de erro

---

## Objetivo do produto

Instituições de ensino costumam trabalhar com dados frios: notas mostram o resultado, mas não explicam o caminho. O Class Insights foi desenhado para fechar o ciclo:

**Dado → Insight → Intervenção → Resultado**

O foco do MVP é reduzir fricção operacional para o professor e aumentar a clareza do progresso para o aluno.

---

## Stack

- **Front-end / App:** SvelteKit + TypeScript
- **Build tool:** Vite
- **Lint / Format:** ESLint + Prettier
- **E2E:** Playwright
- **Backend / Auth / DB:** Supabase
- **SSR Auth:** `@supabase/ssr`
- **Client Auth / DB:** `@supabase/supabase-js`

---

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
    (app)/
      teacher/
        [classId]/
        import/
      student/
        skills/
```

## Documentos novos da V1

- `docs/adr/0002-modelo-academico-v1.md`: contrato do dominio alvo da V1
- `docs/adr/0003-vinculos-e-onboarding-v1.md`: separacao entre identidade, entidade academica e vinculos
- `docs/adr/0004-import-legado-v1.md`: papel do import legado como fluxo auxiliar na V1
- `docs/backlog-tecnico-v1-priorizado.md`: backlog prioritario de produto e execucao

## Modelo oficial da V1

O modelo oficial do produto na V1 passa por:

- `subject`
- `assessment`
- `assessment_result`

Esse e o caminho principal de leitura e evolucao para professor, coordenacao e aluno.

## Papel do import legado

O fluxo de `/teacher/import` continua existindo para reduzir atrito operacional de quem chega com CSV, mas ele deve ser entendido como:

- auxiliar
- legado
- fora do caminho principal do dominio

Nenhuma tela central nova deve depender diretamente de `student_skill_scores`.

## Validacao local

- `npm run check`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run test:e2e`

Os smoke E2E usam Playwright com um bypass de autenticacao habilitado apenas quando o servidor local sobe com `CI_E2E_AUTH_ENABLED=true`.
