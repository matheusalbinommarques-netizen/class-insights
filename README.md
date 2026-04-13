# Class Insights

Plataforma educacional focada em transformar publicações de desempenho em leitura pedagógica acionável para três personas:

- **Professor**: opera turmas, matérias, avaliações, revisão e publicação.
- **Coordenação**: acompanha prioridades institucionais e faz drill-down por turma, matéria, professor e aluno.
- **Aluno**: entende sua situação atual, sua trajetória e onde vale revisar com base nas publicações disponíveis.

## Estado atual

O projeto já tem uma base funcional real e agora também possui uma direção de produto mais clara por persona.

### O que já está consolidado

- Autenticação com Supabase
- Separação por persona (`teacher`, `student`, `coord`)
- Fluxo público com login, cadastros e recuperação de acesso com linguagem mais consistente
- Dashboard do professor reposicionado como **cockpit operacional**
- Gestão de turmas
- Gestão de matérias, avaliações e resultados
- Grid operacional de notas
- Escala padrão por turma com override quando aplicável
- Importação CSV com preview, staging, validação e apply via RPC
- Portal do aluno com vínculo posterior, multi-vínculo e seleção clara de turma ativa
- Portal do aluno orientado a **leitura de progresso**, não apenas consulta de nota
- Coordenação reposicionada como **leitura institucional**, com prioridade macro e drill-down
- Export CSV de resultados publicados por avaliação
- Export CSV de resumo longitudinal institucional
- Smoke tests E2E por persona
- Cobertura automatizada de helpers críticos do aluno, professor e coordenação

## Objetivo do produto

Instituições de ensino costumam trabalhar com dados frios: a nota mostra o resultado, mas nem sempre explica o caminho. O Class Insights foi desenhado para fechar o ciclo:

**Dado -> Insight -> Intervenção -> Resultado**

O foco do MVP é reduzir fricção operacional para o professor, aumentar a clareza do progresso para o aluno e dar leitura macro coerente para a coordenação, sem misturar as responsabilidades de cada área.

## Experiência por persona

### Professor

A experiência do professor gira em torno do fluxo oficial da V1:

**matéria -> avaliação -> lançamento -> revisão -> publicação**

A dashboard principal funciona como cockpit e responde três perguntas:

- o que exige ação agora
- onde isso está acontecendo
- qual é o próximo clique

O objetivo é reduzir ruído e manter o professor orientado ao fluxo principal, sem confundir o import legado com caminho central do produto.

### Aluno

O portal do aluno foi ajustado para interpretar progresso com semântica mais confiável.

A experiência atual enfatiza:

- média atual sem misturar nota e percentual
- tendência recente
- matéria que realmente merece revisão
- trajetória longitudinal
- leitura clara por matéria
- tratamento explícito de vínculo pendente, multi-vínculo e turma ativa

### Coordenação

A coordenação não replica a operação do professor. Ela atua como leitura institucional.

A experiência atual enfatiza:

- fila institucional de prioridades
- turma mais sensível
- matéria crítica
- professor que pede cuidado
- alunos prioritários
- drill-down por turma, matéria, professor e aluno dentro do escopo do coordenador

## Modelo oficial da V1

O caminho oficial de domínio na V1 é:

- `subject`
- `assessment`
- `assessment_result`

Esse é o modelo principal de leitura e evolução para professor, coordenação e aluno.

## Papel do import legado

O fluxo de `/teacher/import` continua existindo para reduzir atrito operacional de quem chega com CSV, mas deve ser tratado como:

- auxiliar
- legado
- fora do caminho principal do produto

Nenhuma tela central nova deve depender diretamente de `student_skill_scores`.

## Direções de UX já assumidas

As seguintes decisões já orientam o produto atual:

- **Teacher** como experiência mais densa e operacional
- **Student** como experiência mais simples, clara e mobile-first
- **Coord** como leitura macro institucional, não como “teacher em outra cor”
- uso de componentes e padrões visuais compartilhados para reduzir divergência entre personas
- títulos de aba, microcopy e estados vazios/erro alinhados ao mesmo tom de produto

## Prioridade atual de execução

O backlog vivo do projeto está em `docs/backlog-tecnico-v1-priorizado.md`.

Neste momento, o produto já passou pelas frentes de:

1. confiança do produto
2. base visual mínima compartilhada
3. cockpit do professor
4. portal do aluno coerente
5. coordenação como leitura institucional
6. testes e acabamento global

As próximas evoluções devem priorizar profundidade de fluxo e robustez, evitando reabrir sem necessidade a semântica já estabilizada.

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
    components/
    config/
    server/
    services/
    styles/
    types/
    utils/
  routes/
    +layout.svelte
    +page.svelte
    login/
    register/
      student/
      teacher/
      coord/
    forgot-password/
    reset-password/
    (app)/
      teacher/
        classes/
        assessments/
        subjects/
        import/
      student/
        journey/
        skills/
      coord/
        classes/
        subjects/
        teachers/
        students/
```
