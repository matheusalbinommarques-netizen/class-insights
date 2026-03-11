# ADR 0001 — Arquitetura inicial do Class Insights

- **Status:** Aceito
- **Data:** 2026-03-10

## Contexto

O Class Insights nasceu como um MVP para resolver um problema educacional recorrente: notas isoladas mostram resultado, mas não orientam ação pedagógica com clareza.

O produto precisa atender dois públicos com necessidades bem diferentes:

- **Professor / Coordenação**
  - operação densa
  - cadastro e manutenção de turma
  - importação de dados
  - leitura analítica
  - lançamento rápido de notas

- **Aluno**
  - consumo simples
  - experiência mobile-first
  - leitura clara do progresso
  - linguagem visual mais leve e motivadora

Além disso, o sistema precisa:
- autenticar usuários com baixo atrito
- suportar regras por perfil
- permitir staging e validação antes de aplicar importações
- manter a lógica crítica no backend
- evoluir rápido como MVP

---

## Decisão

Adotar a seguinte arquitetura inicial:

### 1. Front-end / App
**SvelteKit + TypeScript**

Motivos:
- SSR e rotas server-side nativas
- boa integração entre UI e server load/actions
- produtividade alta para MVP
- estrutura clara para separar rotas por persona
- TypeScript strict ajuda a reduzir ambiguidade no domínio

### 2. Backend / Auth / DB
**Supabase**

Motivos:
- autenticação pronta
- banco relacional com Postgres
- RLS nativa
- RPCs SQL para fluxos críticos
- velocidade de entrega compatível com MVP

### 3. Separação por persona em rotas
Usar grupos de rotas por papel:

- `(app)/teacher`
- `(app)/student`

Motivos:
- layouts independentes
- UX contextualizada por público
- proteção mais simples por papel
- menor acoplamento visual entre áreas do sistema

### 4. Portal do professor desktop-first
O professor lida com:
- tabelas
- grids
- cockpit
- ações operacionais frequentes

Por isso, a área teacher será otimizada primeiro para uso denso em telas maiores.

### 5. Portal do aluno mobile-first
O aluno precisa de:
- clareza
- feedback visual
- baixo atrito
- consulta rápida

Por isso, a área student será construída com prioridade em leitura simples e responsiva.

### 6. Lógica crítica no servidor
Validações e regras de domínio relevantes devem ficar no backend/server-side, e não espalhadas pela UI.

Exemplos:
- escala de nota
- override por skill
- parsing e validação de score
- vinculação aluno por código de convite
- importação e aplicação atômica
- snapshots e cálculo analítico

### 7. Importação obrigatoriamente com staging
CSV não deve ser aplicado diretamente.

Fluxo adotado:
1. upload
2. preview
3. staging
4. mapeamento
5. validação
6. apply atômico

Motivos:
- evitar sujeira no banco
- permitir auditoria
- dar segurança operacional ao professor
- sustentar piloto real

### 8. RPCs para fluxos sensíveis
Operações de maior risco ou que precisam ser atômicas devem preferencialmente usar RPCs SQL.

Exemplos já previstos/usados:
- claim de aluno por invite code
- apply de import job
- geração de snapshot
- leitura baseline/latest

### 9. CSS com tokens e base compartilhada
Mesmo sem adotar uma biblioteca completa de componentes neste momento, o projeto terá:
- `tokens.css`
- `base.css`

Motivos:
- reduzir repetição
- manter consistência visual
- criar mini design system evolutivo
- evitar divergência entre páginas

---

## Consequências positivas

- arquitetura clara para MVP
- separação forte entre perfis
- backend mais confiável para regras críticas
- importação mais segura
- escalabilidade razoável para próximas fases
- menor risco de virar app “só de telas”

---

## Trade-offs

- parte da lógica fica dividida entre SvelteKit server e SQL/RPC
- há dependência significativa do Supabase
- a modelagem pode evoluir ao longo do MVP
- ainda não existe design system componentizado completo
- alguns tipos podem ficar duplicados até a refatoração de domínio

---

## Decisões derivadas

Com base neste ADR:

1. Toda rota protegida deve validar sessão e papel.
2. O portal do aluno não deve herdar a mesma experiência visual do professor.
3. Fluxos de importação devem ser auditáveis e reversíveis/seguros.
4. Regras de escala de nota devem ficar centralizadas.
5. O projeto deve documentar DoD e convenções operacionais.
6. Próximas evoluções devem priorizar:
   - importação confiável
   - cockpit do professor
   - portal do aluno
   - coordenação
   - hardening de piloto

---

## Revisão futura

Este ADR pode ser revisado quando:
- houver necessidade de multi-tenant mais formal
- a coordenação ganhar área própria robusta
- o design system for componentizado
- o domínio migrar do modelo simplificado atual para uma modelagem acadêmica mais completa