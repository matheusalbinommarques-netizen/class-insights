# Backlog Prioritario - Class Insights

Atualizado em 2026-03-14 para refletir uma ordem de execucao mais pragmatica: confianca primeiro, base visual minima cedo, home por ultimo.

## Regras do projeto para esta fase

- `subject -> assessment -> assessment_result` continua como modelo oficial da V1
- apenas resultados publicados entram nas leituras de professor, coordenacao e aluno
- `/teacher/import` continua como fluxo auxiliar e legado, nunca como caminho principal
- aluno precisa suportar vinculo posterior, multi-vinculo e selecao clara de turma ativa
- `diretor`, no MVP, continua sendo visao da coordenacao, nao role nova

## Regra de done para qualquer item

Nenhum item deste backlog deve ser considerado pronto apenas por "parecer melhor". Para fechar uma frente, a rota alterada precisa respeitar:

- `npm run check`
- `npm run lint`
- `npm test` quando a mudanca afetar regra, dado, fluxo critico ou comportamento reutilizavel
- `npm run build`
- fluxo principal validado manualmente
- loading, empty state e error state minimamente coerentes
- CTA principal claro
- consistencia visual minima com o resto do produto

## Principio de priorizacao

Esta ordem prioriza primeiro o que afeta confianca, semantica de dado e coerencia estrutural. Polimento visual amplo vem depois que o produto ja estiver confiavel.

## P0 - Confianca do produto

### 1. Limpar encoding, acentuacao e texto quebrado nas rotas criticas

**Objetivo:** eliminar qualquer sensacao de produto corrompido ou provisoriamente montado.

**Escopo inicial:**

- `home`
- `login`
- `register/*`
- `forgot-password`
- `reset-password`
- rotas principais de `teacher`, `student` e `coord`

**Acoes:**

- garantir UTF-8 nas rotas principais
- revisar strings fixas visiveis
- padronizar pt-BR, capitalizacao e titulos
- remover copy antiga, placeholder e termos herdados sem funcao real

**Criterio de pronto:**

- zero texto quebrado visivel
- zero strings como `EdTech Platform`
- labels e titulos coerentes nas rotas principais

### 2. Corrigir semantica e formatacao numerica do aluno

**Objetivo:** impedir leituras absurdas e garantir confianca no dado exibido.

**Acoes:**

- revisar origem da media geral e do progresso por materia
- distinguir claramente percentual normalizado de nota em escala real
- parar de assumir `/ 10` quando a escala for variavel
- padronizar locale e casas decimais no portal do aluno

**Arquivos provaveis:**

- `src/routes/(app)/student/+page.server.ts`
- `src/routes/(app)/student/+page.svelte`
- `src/lib/server/student-portal.ts`
- `src/lib/utils/format.ts`

**Criterio de pronto:**

- media exibida sempre coerente com a escala real
- percentual e nota nao se misturam visualmente
- nenhuma tela do aluno mostra numero fora da realidade

### 3. Eliminar duplicacoes estruturais mais gritantes

**Objetivo:** remover elementos repetidos que deixam o produto com cara de prototipo.

**Acoes:**

- remover branding redundante em `home` e `login`
- remover CTA duplicado no dashboard do professor
- remover navegacao duplicada no shell do aluno
- garantir uma navegacao principal por contexto

**Criterio de pronto:**

- nenhum bloco principal com CTA repetido
- aluno com uma navegacao principal clara
- topo publico sem repeticao desnecessaria de marca

### 4. Rebaixar o import legado de forma definitiva

**Objetivo:** alinhar a interface com o ADR que define o import como fluxo auxiliar.

**Acoes:**

- reduzir destaque visual de `import` na navegacao do `teacher`
- revisar a copy da tela para reforcar que o fluxo e legado
- impedir que `import` concorra com `materias` e `avaliacoes`
- manter qualquer dependencia residual do legado encapsulada

**Criterio de pronto:**

- o professor novo nao confunde `import` com caminho principal
- o teacher gira em torno de materia e avaliacao

## P1 - Base visual minima compartilhada

### 5. Travar um mini design system aplicavel agora

**Objetivo:** parar de corrigir cada tela como se fosse um produto diferente.

**Acoes:**

- definir escala tipografica minima
- padronizar botao, pill, card, header, radius e espacamento
- padronizar tamanho e uso do icone oficial
- revisar `src/lib/styles/base.css` para servir como fundacao real
- reduzir divergencia entre Tailwind e CSS local do portal do aluno

**Criterio de pronto:**

- home, login, teacher, student e coord parecem partes do mesmo produto
- componentes base compartilham densidade, hierarquia e comportamento

### 6. Padronizar branding real

**Objetivo:** fazer a marca parecer intencional em toda a experiencia.

**Acoes:**

- definir tamanho padrao de container e icone
- revisar headers, sidebars e telas publicas
- remover subtitulos de marca sem funcao

**Criterio de pronto:**

- icone equilibrado em todos os contextos
- nada de `Class Insights` duplicado no mesmo bloco

## P2 - Fluxo publico com cara de produto

### 7. Consolidar login, registros e recuperacao como uma familia visual

**Objetivo:** fazer o fluxo de acesso parecer um sistema unico, nao paginas avulsas.

**Acoes:**

- alinhar visual e copy de `login`, `register/*`, `forgot-password` e `reset-password`
- simplificar blocos laterais
- revisar contraste entre login e primeiro acesso
- limpar copy institucional sobrando

**Criterio de pronto:**

- todo o fluxo de acesso parece da mesma aplicacao
- primeiro acesso e facil de entender
- recuperacao de senha nao destoa visualmente

### 8. Refinar a home sem abrir escopo novo

**Objetivo:** deixar a home mais clara, mais leve e mais convincente.

**Estrutura alvo:**

- hero
- como funciona em 3 passos
- leitura por persona
- CTA final

**Acoes:**

- reduzir decoracao sem funcao
- melhorar hierarquia e espacamento
- enxugar slogans, badges e copy sobrando
- manter a proposta entendivel em poucos segundos

**Criterio de pronto:**

- a proposta do produto fica clara rapido
- a home nao parece montagem de cards independentes

## P3 - Teacher como cockpit limpo

### 9. Enxugar a dashboard do professor

**Objetivo:** reforcar acao e reduzir ruido sem reabrir arquitetura.

**Acoes:**

- manter um CTA principal por bloco
- tornar `proximo passo` mais dominante
- reduzir textos operacionais longos
- revisar se todos os cards justificam existir

**Criterio de pronto:**

- o professor sempre entende o proximo clique
- a dashboard parece cockpit, nao vitrine

### 10. Revisar labels e microcopy do teacher

**Objetivo:** deixar a operacao mais direta e menos verbalmente pesada.

**Acoes:**

- revisar sidebar
- revisar dashboard
- revisar pagina de turma
- revisar pagina de materias
- encurtar labels e alinhar termos

**Criterio de pronto:**

- menos ruido verbal
- menos repeticao
- menos linguagem de sistema interno

## P4 - Portal do aluno coerente com o produto

### 11. Refazer o shell do aluno para ficar simples e unico

**Objetivo:** acabar com dupla navegacao e com a sensacao de que o aluno vive em outro sistema.

**Acoes:**

- escolher uma unica navegacao principal
- simplificar topo e bloco de contexto
- aproximar o shell do design system comum
- preservar leveza e foco mobile-first

**Criterio de pronto:**

- o aluno entende a navegacao de primeira
- nao ha redundancia entre menu e overview

### 12. Tornar multi-vinculo e turma ativa explicitos na UX

**Objetivo:** fazer a capacidade de produto aparecer claramente na interface.

**Acoes:**

- exibir seletor claro de turma ativa quando houver mais de uma
- tratar `pending-link` e ausencia de vinculo sem parecer erro
- deixar claro qual turma esta ativa no momento

**Criterio de pronto:**

- aluno troca de turma sem friccao
- estado atual da turma fica obvio
- vinculo posterior funciona com clareza

### 13. Corrigir a regra de `onde vale revisar`

**Objetivo:** so chamar atencao quando houver motivo real.

**Acoes:**

- mostrar prioridade apenas quando houver referencia rompida
- alinhar esse card com `situacao geral`
- usar estado positivo claro quando tudo estiver dentro do esperado

**Criterio de pronto:**

- sem prioridade falsa
- sem contradicao entre cards

## P5 - Coordenacao com leitura institucional

### 14. Reposicionar a coordenacao como visao macro

**Objetivo:** diferenciar coordenacao de professor de forma clara.

**Acoes:**

- reforcar comparativo entre turmas
- destacar materias criticas e tendencias
- tratar pendencia operacional como leitura institucional, nao operacional detalhada
- facilitar drill-down para turma e aluno

**Criterio de pronto:**

- coordenacao enxerga panorama
- a tela nao parece `teacher em outra cor`

### 15. Revisar copy e hierarquia visual da coordenacao

**Objetivo:** dar tom mais institucional e menos operacional.

**Acoes:**

- reduzir ruido
- melhorar densidade e tipografia
- revisar cores e pesos de cards
- padronizar linguagem institucional

**Criterio de pronto:**

- coordenacao parece uma persona propria

## Ordem recomendada de execucao em lotes

Para evitar PRs grandes demais e retrabalho, a sequencia recomendada e:

1. sanidade textual e encoding
2. semantica numerica do aluno
3. duplicacoes estruturais
4. base visual minima compartilhada
5. fluxo publico como familia unica
6. teacher como cockpit limpo
7. portal do aluno coerente
8. coordenacao como leitura institucional
9. home final
