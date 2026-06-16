# Contratos backend versionados

A B38 aceita um Swagger/OpenAPI real versionado para comparação opcional do mapa frontend x backend.

Uso local recomendado:

```bash
LOGOSOFT_BACKEND_SWAGGER_FILE=docs/contracts/swagger-v1.json npm run validate:backend-contract-map
```

Sem `LOGOSOFT_BACKEND_SWAGGER_FILE`, o gate executa apenas validação estrutural e documental das divergências controladas.
