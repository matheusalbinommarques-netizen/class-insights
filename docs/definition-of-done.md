# Definition of Done (DoD) — Class Insights

Este documento define quando uma entrega pode ser considerada pronta no projeto.

---

## Regra principal

Uma tarefa, correção ou feature só está **Done** quando:

- funciona no fluxo principal esperado
- não quebra autenticação ou permissões
- passa nas validações locais
- está consistente visualmente com o projeto
- possui tratamento mínimo de erro/sucesso
- não deixa dívida óbvia sem registro

---

## 1. Critérios técnicos obrigatórios

### 1.1 TypeScript / Svelte

- sem erro em `npm run check`
- sem erro de tipagem introduzido pela mudança
- sem uso desnecessário de `any`
- sem quebrar SSR/client onde isso importa

### 1.2 Lint / format

- `npm run lint` sem erro
- código formatado segundo Prettier
- sem arquivos temporários ou lixo acidental em commit

### 1.3 Build

- `npm run build` concluído sem erro nas entregas que alteram comportamento estrutural

---

## 2. Critérios de produto

### 2.1 Fluxo

A entrega precisa funcionar no fluxo real do usuário.

Exemplos:

- login realmente redireciona para a área certa
- criação de turma realmente aparece no dashboard
- nota lançada realmente afeta a visualização
- importação realmente valida antes de aplicar

### 2.2 Feedback

Toda ação relevante deve dar retorno mínimo ao usuário:

- sucesso
- erro
- estado vazio
- loading quando aplicável

### 2.3 Clareza

A tela não deve conter:

- texto placeholder enganoso
- promessa de funcionalidade inexistente
- mensagem ambígua que esconda erro real

---

## 3. Critérios de segurança e permissão

Toda entrega deve respeitar o modelo de acesso do sistema.

### Obrigatório

- professor/coordenador não devem cair em rotas de aluno por erro de guard
- aluno não deve acessar área teacher
- ações sensíveis precisam validar ownership/class_id/role
- mudanças em banco devem respeitar RLS e RPCs existentes

Se a entrega depender de policy nova, isso precisa estar explicitado.

---

## 4. Critérios de UX / UI

### 4.1 Consistência visual

A entrega deve usar a base visual do projeto:

- tokens
- buttons
- cards/panels
- feedbacks
- inputs consistentes

### 4.2 Responsividade

Não pode haver:

- overflow horizontal acidental
- botão inacessível em mobile
- conteúdo crítico ilegível
- layout quebrado em tela pequena

### 4.3 Persona correta

- Teacher: experiência mais densa e operacional
- Student: experiência mais simples, visual e mobile-first

---

## 5. Critérios de domínio

A entrega deve respeitar as regras de negócio do produto.

### Exemplos

- skill pode herdar escala da turma
- skill pode ter override de escala
- nota precisa validar range e decimais
- import não aplica sem validação
- vínculo do aluno depende de invite code
- snapshot precisa refletir o estado válido dos dados

---

## 6. Critérios de documentação

A entrega precisa estar documentada quando alterar:

- arquitetura
- regra de domínio relevante
- fluxo crítico
- convenção de projeto
- política de acesso
- RPC ou tabela importante

### Onde documentar

- `README.md`
- `docs/adr/`
- comentários pontuais em código, quando fizer sentido

---

## 7. Critérios de teste manual mínimo

Antes de considerar pronto, validar pelo menos o caminho principal impactado.

### Exemplos

#### Login

- consegue entrar
- redireciona corretamente
- falha mostra mensagem

#### Teacher

- cria turma
- abre turma
- cria aluno
- cria skill
- lança nota

#### Import

- faz preview
- valida
- mostra erro quando necessário
- aplica quando validado

#### Student

- carrega área protegida
- mostra progresso
- mostra estado vazio coerente

---

## 8. O que não é Done

Não está pronto quando:

- “funciona só no meu caso”
- depende de ajuste manual escondido
- quebra lint/check/build
- ignora permissão
- tem UI pronta sem fluxo real
- tem fluxo real sem feedback mínimo
- entrega texto provisório como se fosse final
- cria duplicação grande sem necessidade

---

## 9. Checklist rápido de merge

Use este checklist antes de considerar concluído:

- [ ] `npm run check`
- [ ] `npm run lint`
- [ ] build testado se aplicável
- [ ] fluxo principal testado manualmente
- [ ] sem regressão evidente de layout
- [ ] sem quebra de auth/role
- [ ] feedback de erro/sucesso visível
- [ ] regra de domínio respeitada
- [ ] documentação atualizada se necessário

---

## 10. Regra prática do MVP

No Class Insights, “pronto” não significa perfeito.

Significa:

- confiável para o próximo passo
- coerente com o produto
- sem erro estrutural evidente
- sem ilusão de funcionamento

O foco é construir um MVP forte, não uma demo frágil.
