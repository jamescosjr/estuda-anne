# Debug em Produção — Primeiro Movimento por Sintoma

> **Fonte conceitual:** *Cercando a IA (Almerindo Rehem, Whitebeard, 2026), Capítulo 12.*
> Arquivo consultado pelo sub-agente de rastreamento (`agent-observability-lgtm` / `trace-finder`) e por humanos às 3 da manhã.
> Só coordenadas, movimentos e verdades operacionais — zero teoria.

---

## 1. Coordenadas Operacionais

| O quê | Onde no Estuda Anne |
| :--- | :--- |
| **Backend de Traces / Métricas** | Grafana / Prometheus / OpenTelemetry (ou logs de containers Docker) |
| **Logs** | Logs estruturados em stdout/JSON do Docker (`docker compose logs -f bff`, `docker compose logs -f study-engine`). Campos: `timestamp`, `service`, `event`, `cid` (correlationId), `trace_id`, `ruleId` |
| **Filas / Processamento Assíncrono** | Processamento assíncrono interno de materiais e geração de quizzes |
| **Script canônico de busca** | `pnpm --filter @estuda-anne/study-engine test -t 'RN_'` para validação de regras; busca por `cid` nos logs JSON |
| **Painel mínimo** | Métricas de latência Gemini Flash, contagem de erros 5xx no BFF, status da fila de materiais |
| **Quem chamar** | Tech Lead / SRE (`agent-observability-lgtm` consultivo) |

---

## 2. Sintoma → Primeiro Movimento

| Sintoma | Primeiro Movimento | Depois |
| :--- | :--- | :--- |
| **Aluna reporta erro ou operação pendente com correlationId (`cid`)** | Busque nos logs pelo `cid` ou `trace_id`. Identifique o último `eventName` registrado. | Verifique se houve descarte por regra (`ruleId`) ou falha técnica downstream. |
| **"Material não gerou flashcards"** | Busque nos logs pelo `materialId` ou `cid` com `event: "material_processed"`. | Se parou em `StudyCorpusSanitizer`, verifique se o arquivo continha texto curto ou caracteres ilegíveis. |
| **Erro 500 no BFF** | Localize a stack trace pelo `cid` nos logs do BFF. | Verifique se o serviço `study-engine` ou `auth` respondeu timeout (> 3s) ou erro de conexão. |
| **Estouro de quota ou lentidão na API Gemini** | Verifique a métrica `gemini_call` com status `503` ou `429`. | O adapter deve executar backoff exponencial até 3 tentativas. Se persistir, alerte sobre quota. |

---

## 3. Rastro sob Demanda (Trace on Demand)

Para investigar uma requisição específica em produção com nível máximo de detalhe:
- Envie a requisição com o cabeçalho W3C Trace Context ativo:
  `traceparent: 00-<traceid>-<spanid>-01`
- **Atenção:** NUNCA habilite flag `-01` por padrão para todo o tráfego em produção, pois inundaria a infraestrutura de telemetria com custos desnecessários. Reenvio sob demanda é para diagnóstico pontual.

---

## 4. Verdades Operacionais (Estuda Anne)

1. **Logs primeiro, traces depois**: A linha de log com `cid` sempre existe se a requisição alcançou o BFF.
2. **Descarte por regra de negócio não é falha técnica**: Se a linha contém `ruleId` (ex: `RN-STU-001`), o sistema funcionou exatamente como especificado.
3. **Guarda de LGPD e Privacidade**: NUNCA pesquise logs por e-mail, senha ou documento pessoal de estudante. Busque sempre por `cid`, `materialId` ou `studentId` anônimo.
4. **O real prevalece sobre o documento**: Se a documentação diz que um endpoint responde X e a resposta real é Y, verifique a implementação em produção antes de assumir erro.

---

## 5. Nunca em Produção

- NUNCA executar mutações destrutivas em banco sem script de rollback testado.
- NUNCA imprimir tokens JWT, chaves de API (`GEMINI_API_KEY`) ou credenciais de banco nos logs.
- NUNCA culpar retenção ou perda de dados sem antes verificar o fluxo nos logs estruturados.
