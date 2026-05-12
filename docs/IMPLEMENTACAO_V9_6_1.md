# Implementação v9.6.1 — Core API Contract

Esta versão prepara o frontend para consumir o contrato oficial do backend v9.8.

## Entregue

1. Tipos e enums numéricos oficiais.
2. Sanitização de payload para não enviar referência técnica inválido.
3. Limpeza de query params e uso de `termo` para busca.
4. Error mapper para validação ASP.NET e erro de negócio `{ code, message }`.
5. Health check em `/api/health`.
6. Axios com headers JSON e interceptor preservado para token/refresh.
7. Testes unitários para helpers e erros.

## Não entregue ainda

As telas ricas de cada módulo continuam para as próximas versões incrementais. Esta etapa é intencionalmente estrutural para evitar retrabalho nos módulos.

## Regra para próximas versões

Cada módulo deve usar os tipos, helpers e mapeadores desta versão para montar payloads reais, com enums numéricos, datas ISO 8601, referência técnicas válidos, Toast para erro/sucesso e nenhum `console.*`.
