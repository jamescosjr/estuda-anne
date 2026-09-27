# Definition of Ready — O card só entra se...

> **Fonte conceitual:** *Cercando a IA (Almerindo Rehem, Whitebeard, 2026), Capítulo 8.*
> **Regra do Porteiro (`agent-po`):** O agente não decide em silêncio. Se faltar campo do PO, **PARE** e devolva a lista de lacunas ao solicitante. Faltou campo técnico do agente (caminhos prováveis)? Preencha e marque como `inferido, a confirmar`. Decisões de contrato, dinheiro ou segurança exigem aprovação humana explícita.

---

## 1. Tabela de Campos Obrigatórios (DoR)

Todo card/história entregue para refinamento ou implementação deve conter:

| Campo | Quem preenche | Exemplo no Estuda Anne | Sem isso... |
| :--- | :--- | :--- | :--- |
| **Objetivo (o quê + por quê)** | PO (`agent-po`) | "Calcular espaçamento de revisão de flashcards via SuperMemo-2 simplificado para otimizar memorização de provas universitárias." | O agente otimiza a coisa errada ou cria complexidade desnecessária. |
| **Critérios de aceite em EARS** | PO (`agent-po`) | `WHEN o estudante revisa um flashcard com nota >= 3 THE SYSTEM SHALL recalcular intervalo e data da próxima revisão IF nota < 3 THEN THE SYSTEM SHALL resetar repetições para 0` | Sem resultado observável não há critério verificável nem teste determinístico. |
| **Escopo (dentro / fora)** | PO (`agent-po`) | Dentro: Cálculo de intervalo SM-2 e gravação. Fora: Notificação push no WhatsApp (card próprio futuro). | O agente "aproveita o embalo" e expande o escopo descontroladamente. |
| **Sistemas afetados** | PO + Tech Lead | `apps/study-engine` (domínio de estudo), `apps/bff` (exposição da API). | Ordem de implementação errada ou quebra de dependências em monorepo. |
| **Caminhos prováveis** | Agente (`agent-po`/Tech Lead) | `apps/study-engine/src/domain/usecases/ReviewFlashcardUseCase.ts`, `docs/regras/study-engine.md` | Horas de navegação cega no repositório consumindo contexto. |
| **Nunca modificar (Fronteira)** | PO + Tech Lead | Não alterar contrato existente de `GET /study/flashcards/due`, nem mexer em coleções de auth. | Quebra de contrato silenciosa ou quebra de segurança em produção. |
| **Tier de risco & Sizing** | Tech Lead / Arquiteto | Tier: Médio. Sizing: Medium (feature isolada no `study-engine`, < 10 tarefas). | Revisão humana no lugar errado ou burocracia excessiva em bugfix simples. |
| **Como validar com o PO / Usuária** | PO / Persona Anne | Teste com aluna simulada (Anne) revisando 3 flashcards e conferindo próxima data em tela mobile. | "Pronto" sem prova de valor real para a estudante. |

---

## 2. Padrões de Sintaxe EARS (Easy Approach to Requirements Syntax)

Para evitar ambiguidades, os critérios de aceite devem obrigatoriamente usar uma das 5 formas EARS:

1. **Ubíqua (sempre ativa):**
   `THE SYSTEM SHALL <resposta do sistema>`
2. **Gatilho de Evento:**
   `WHEN <evento/gatilho> THE SYSTEM SHALL <resposta>`
3. **Comportamento Condicional:**
   `IF <condição indesejada/exceção> THEN THE SYSTEM SHALL <resposta>`
4. **Estado do Sistema:**
   `WHILE <estado contínuo> THE SYSTEM SHALL <resposta>`
5. **Funcionalidade Opcional:**
   `WHERE <feature habilitada> THE SYSTEM SHALL <resposta>`

*Para bugfixes e refatorações, acrescente:*
`THE SYSTEM SHALL CONTINUE TO <comportamento que não pode mudar>`

---

## 3. Auto-Sizing (Dimensionamento do Trabalho)

A complexidade determina a cerimônia, não um pipeline fixo:

- **Small** (até 3 arquivos, 1 commit): Spec breve (1 página), sem design complexo, verificação direta pelos testes existentes.
- **Medium** (feature clara no mesmo serviço, < 10 tarefas): Spec com critérios EARS, lista de tasks atômicas com `Done when:`, testes unitários dedicados.
- **Large** (cruza múltiplos serviços, ex: `study-engine` + `bff` + `frontend`): Spec completa com Requirement IDs, Design prévio obrigatório, decomposição em 1 PR por serviço/tarefa (≤ 400 linhas).
- **Complex** (toca autenticação, pagamentos, LGPD, dados sensíveis ou modelo de IA): Seção obrigatória de discussão prévia de zonas cinzentas (`Assumptions & Open Questions`) aprovada pelo Tech Lead antes do código.

---

## 4. Portão de Saída do Porteiro

O card só passa para a fase de especificação (`.specs/`) se todos os campos do PO estiverem preenchidos e não houver ambiguidades de regras de negócio. Caso contrário, a saída é a devolução imediata:

```text
STATUS: REPROVADO NO DoR
Lacunas de produto a esclarecer:
1. [Campo Ausente]: Critério de aceite para o caso em que a IA gera questão inválida.
2. [Nunca Modificar]: O contrato público de Quiz precisa ser preservado?
Favor responder no card antes de iniciar a especificação.
```
