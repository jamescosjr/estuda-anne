# <Título da Feature> Validation Report

> **Gerado pelo Verifier Independente (`agent-verifier`)** — autor ≠ verificador, contexto limpo.
> **Regra:** "Evidência ou zero" — requisito sem arquivo:linha e asserção de teste verificável conta como não coberto.

---

## 1. Summary

- **Overall**: `✓ Ready — PASS`
- **Spec-Anchored Check**: `<N/N> critérios validados com arquivo:linha e asserção exata`
- **Discrimination Sensor**: `<N/N> mutações comportamentais mortas (killed)`
- **Gate Check**: `Build exit 0, Testes exit 0`

---

## 2. Spec-Anchored Acceptance Criteria

| Requirement ID | Cláusula EARS da Spec | Arquivo de Teste:Linha | Asserção Verificada | Status |
| :--- | :--- | :--- | :--- | :--- |
| **REQ-01** | `WHEN ... THE SYSTEM SHALL ...` | `apps/.../tests/...:L45` | `expect(result.interval).toBe(1)` | `PASS ✓` |
| **REQ-02** | `IF ... THEN THE SYSTEM SHALL ...` | `apps/.../tests/...:L78` | `expect(call).rejects.toThrow('RN-STU-001')` | `PASS ✓` |

---

## 3. Discrimination Sensor (Mutações Comportamentais)

> O Verifier injeta pequenas alterações no código novo (inverte condição, apaga retorno, altera constantes) para provar que a suíte fica vermelha (mata a mutação).

| Mutação | Arquivo:Linha | Descrição da Mutação | Testes que Falharam (Killed?) |
| :--- | :--- | :--- | :--- |
| **A** | `apps/.../src/domain/...:L32` | Inverter condição `grade >= 3` para `< 3` | `✓ Killed — 2 testes falharam com asserção invertida` |
| **B** | `apps/.../src/domain/...:L55` | Deletar linha de cálculo de intervalo | `✓ Killed — 1 teste falhou com intervalo incorreto` |

**Resultado do Sensor**: `<N/N> killed - PASS ✓`

---

## 4. Gate Check

- **Comando do Gate**: `pnpm gate` (executa `pnpm build` e `pnpm test`)
- **Exit Code**: `0`
- **Integridade dos Testes**: Nenhum teste legado foi removido, pulado (`skip`) ou enfraquecido.
- **Delta de Testes**: `+<N> novos testes adicionados`.

---

## 5. Parecer e Próximos Passos
- **Veredito**: `APROVADO para PR`
- **Notas para Revisão**: PR draft pode ser promovido para revisão do `agent-cleancode` e aprovação humana.
