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

### Em evolução

- Heatmap e BI prescritivo do professor
- Skill tree visual do aluno
- Dashboard da coordenação
- Intervenções pedagógicas mínimas
- Hardening final para piloto

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
- `docs/backlog-tecnico-v1.md`: backlog tecnico executavel por blocos
