# Skills operacionais — LogoSoft ERP Frontend

Esta pasta centraliza procedimentos reutilizáveis para desenvolvimento, revisão, validação e commit do frontend do LogoSoft ERP.

O objetivo é reduzir ambiguidade entre ChatGPT, Codex/review e repositório principal. Cada skill deve ser tratada como instrução operacional do projeto, não como documentação comercial.

## Estrutura

```text
skills/
├── desenvolvimento/
└── review/
```

## Uso esperado

- `skills/desenvolvimento`: usada durante implementação de novas versões, correções e documentação técnica.
- `skills/review`: usada durante code review, validação por diff, execução de gates e decisão de commit ou bloqueio.

## Regras globais

1. Não avançar versão funcional enquanto houver bloqueio aberto.
2. Correção bloqueada deve usar sufixo `.cN`.
3. Pacote completo deve preservar arquivos rastreados existentes.
4. Mocks não podem ser usados como fallback produtivo.
5. Campo de entidade relacionada não deve ser digitado como GUID manual.
6. Fluxo fiscal, financeiro, estoque, segurança e LGPD não deve ser tratado como CRUD simples.
7. Toda entrega deve possuir documentação de implementação.
8. Toda mudança crítica deve ter teste ou gate de regressão.
9. Review aprovado deve rodar gates e validar escopo por diff.
10. Review bloqueado deve retornar relatório técnico objetivo e recomendação de correção.
