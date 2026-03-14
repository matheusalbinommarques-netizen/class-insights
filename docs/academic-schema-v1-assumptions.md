# Academic Schema V1 Assumptions

Estas foram as assumptions de negocio e de estrutura adotadas para a migration `supabase/migrations/20260313213000_academic_v1_schema.sql`.

## Estrutura existente assumida

- Ja existem as tabelas `public.profiles`, `public.classes` e `public.students`.
- `public.profiles.id` e o mesmo identificador do usuario autenticado em `auth.users.id`.
- `public.classes.teacher_id` guarda o `auth.uid()` do professor dono da turma.
- `public.students.user_id` guarda o `auth.uid()` do aluno quando a conta ja esta vinculada.
- `public.students.class_id` aponta para a turma atual do aluno.
- O projeto continua com o modelo legado (`skills`, `student_skill_scores`) convivendo em paralelo, sem backfill automatico nesta migration.

## Assumptions de negocio

- A V1 continua com um modelo de turma com um professor responsavel principal.
- Coordenador, professor e aluno possuem login proprio; o acesso nao depende de conta compartilhada ou sessao administrativa.
- O coordenador nao entra no fluxo do professor; ele precisa conseguir vincular ao proprio escopo por codigo de turma ou mecanismo equivalente.
- O professor precisa conseguir distribuir codigos proprios para vincular alunos.
- O professor pode centralizar turmas de diferentes instituicoes na mesma conta.
- O aluno pode criar a conta antes de possuir qualquer codigo e completar os vinculos depois.
- O aluno pode possuir mais de um vinculo de professor ao longo do tempo; portanto, a identidade da conta do aluno nao deve ficar presa a um unico professor.
- `subject` e a materia formal; `skill` continua existindo no legado e em analytics posteriores, mas nao entra nesta migration.
- Uma materia so pode ser vinculada a uma turma se o `teacher_id` do vinculo for o mesmo `teacher_id` da turma.
- Toda avaliacao pertence a uma combinacao valida de `class_id + subject_id` ja cadastrada em `class_subjects`.
- Toda avaliacao nasce em `draft`.
- Em V1, a avaliacao so pode transicionar de `draft` para `published`; nao ha fluxo de despublicacao.
- Em V1, avaliacao publicada vira imutavel por trigger. Correcao posterior exige fluxo novo ou intervencao administrativa/manual.
- A publicacao e registrada diretamente em `assessments` via `status`, `published_at` e `published_by`.
- `assessment_results` e o snapshot oficial da nota da avaliacao; por isso ele persiste `score_min`, `score_max` e `score_decimals` por linha.
- O lancamento parcial precisa existir, entao `raw_score` pode ser `null` enquanto a avaliacao ainda esta em rascunho.
- `is_excused` nao obriga `raw_score`; um aluno dispensado pode continuar sem nota numerica.
- Um aluno so pode ter um resultado por avaliacao.
- O aluno precisa pertencer a mesma turma da avaliacao no momento do lancamento.
- O historico de auditoria registra criacao, edicao, remocao de resultado e evento de publicacao.

## Assumptions de RLS

- `teacher` pode criar e operar dados apenas nas turmas em que `classes.teacher_id = auth.uid()`.
- `coord` deve ler apenas as turmas administradas pelo proprio vinculo, mas nao recebe permissao de escrita operacional de nota nesta primeira versao.
- `student` so consegue ler `assessments` e `assessment_results` quando a avaliacao esta `published` e quando o resultado pertence ao proprio usuario.
- `student` nao recebe acesso ao `grade_audit_log`.
- `subjects` ficam visiveis para `teacher` e `coord`, acompanhando o comportamento atual da tela de materias.

## Escopo explicitamente fora desta migration

- Nao ha backfill de `student_skill_scores` para `assessment_results`.
- Nao ha mudanca do portal do aluno para o modelo novo ainda.
- Nao ha views materializadas, RPCs nem agregados longitudinais nesta etapa.
- Nao ha scoping institucional refinado em `subjects`, porque o fluxo atual do app ainda nao persiste `institution_id` na criacao de materias.
- Nao ha ainda o modelo final de codigos de convite e vinculos entre coordenador-turma e professor-aluno.

## Pontos para validar antes de aplicar em producao

- Se `classes.teacher_id` e `students.user_id` realmente usam o mesmo ID de `profiles.id/auth.users.id`.
- Se existe necessidade imediata de multi-professor por turma; a migration assume que nao.
- Se `coord` deve ter permissao administrativa de escrita em `subjects` ou `class_subjects`; hoje a policy esta conservadora para escrita operacional.
- Se `subjects` precisa ser institucional desde ja. Se sim, vale adicionar `institution_id` em uma migration seguinte com regra de unicidade apropriada.
- Como o produto vai persistir o vinculo `coord -> class` sem confundir coordenacao com ownership do professor.
- Como o aluno vai manter multiplos codigos de professor e como isso conversa com turma atual, historico e RLS.
