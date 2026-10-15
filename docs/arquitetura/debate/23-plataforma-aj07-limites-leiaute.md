# Rodada 23 — Plataforma: AJ-07 limites do leiaute

## Posição

O contrato central é `LimitesDoLeiaute.cs:18-89`; a validação do frontend precisa ser declarativa e reutilizável, não cinco cópias de regex nos schemas. Há pelo menos quatro consumidores de formato (Produto, unidade de medida, natureza de operação e identidades fiscais), portanto um utilitário em `lib/validators/` é justificável pela régua de três casos.

- O helper valida o valor normalizado para comparação, mas não trunca nem muda payloads; `sanitizePayload` continua sendo o único saneamento do request.
- Não haverá alteração de query key, cache, endpoint, permissão ou allowlist de contrato.
- O teste deve enumerar limites e fronteiras nominais, incluindo pontuação normalizável e letra/dígito inválido, para não permitir uma falsa cobertura por `.max()`.
- Série 0–999 e unidade tributável com teto 6 já existem; o teste confirma o contrato sem reimplementar produção.

## O que abro mão

Não será criado gate em `scripts/`: a regressão é local aos schemas e o teste unitário de vetores nominais é suficiente enquanto o backend não publica metadado gerado para esses campos. Um gate novo entra quando o catálogo de leiaute se tornar fonte versionada também no frontend.

```json
{
  "agent": "arquiteto-plataforma-frontend",
  "node": "projeto",
  "assunto": "aj07-limites-leiaute",
  "status": "completed",
  "arquivo": "docs/arquitetura/debate/23-plataforma-aj07-limites-leiaute.md",
  "decisoesPropostas": [{ "id": "D108", "titulo": "Um helper de formato, sem duplicar regra de domínio", "reversivel": true, "gatilho": "metadado fiscal gerado chegar ao frontend" }],
  "discordancias": [],
  "pendencias": [],
  "riscos": ["Duplicar regex em schemas permitiria divergência silenciosa entre módulos."]
}
```
