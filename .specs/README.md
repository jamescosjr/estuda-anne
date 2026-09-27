# Método de Entrega Orientado a Especificação (.specs/)

> **Fonte conceitual:** *Cercando a IA (Almerindo Rehem, Whitebeard, 2026), Capítulos 8, 9 e 10.*
> **Princípio Central:** O agente produz código. O engenheiro constrói as condições para confiar no resultado.
> **Régua:** "Evidência ou zero" — afirmação sem `arquivo:linha` e sem asserção de teste verificável vale zero.

---

## O Ciclo em 4 Fases, 2 Gates Humanos e 1 Verifier Independente

```
[Card do PO]
     │
     ▼
[Porteiro: card-intake / DoR]  ──(Se faltar campo)──► [Devolve ao PO]
     │
     ▼ (Pronto)
1. SPECIFY (critérios em sintaxe EARS + IDs de requisito REQ-01..N)
     │
     ▼
[GATE HUMANO 1: O Quê?] ◄── O PO/Tech Lead aprova os critérios antes de qualquer código
     │
     ▼
2. DESIGN & TASKS (Tarefas atômicas com "Done when" verificável por comando)
     │
     ▼
[GATE HUMANO 2: Como?] ◄── O Tech Lead aprova a divisão em tarefas atômicas
     │
     ▼
3. EXECUTE (Ciclo curto: Teste Vermelho -> Verde -> Gate -> Commit atômico por task)
     │
     ▼
4. VERIFIER (Agente independente, contexto limpo, autor ≠ verificador)
   ├── Spec × Resultado (mapeia cada REQ para teste com arquivo:linha)
   ├── Sensor de Discriminação (injeta mutações para provar que testes falham)
   └── Emite validation.md (PASS / FAIL)
```

---

## Estrutura de Diretórios por Feature

Cada feature desenvolvida vive em uma pasta numerada:
```
.specs/
├── README.md
├── LESSONS.md                               # Lições aprendidas geradas pelo processo
└── features/
    └── 001-nome-da-feature/
        ├── spec.md                          # O quê: critérios EARS, premissas, fora de escopo
        ├── tasks.md                         # Como: tarefas atômicas com Done when e Gates
        └── validation.md                    # Prova: gerado pelo Verifier com testes e mutantes
```
