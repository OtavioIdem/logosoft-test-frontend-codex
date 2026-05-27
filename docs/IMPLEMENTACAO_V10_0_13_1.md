# Implementação v10.0.13.1

Correção incremental da linha v10.0.13.

## Problemas tratados

1. O build Docker falhava durante `next build` com erro de TypeScript em `OperationalGovernancePanel.tsx`:

```txt
Type error: 'date' is possibly 'null'.
```

2. O npm 11 emitia warning por configuração não suportada:

```txt
npm warn Unknown project config "timeout".
```

## Correções aplicadas

- O filtro de datas agora usa `date instanceof Date` antes de acessar `date.getTime()`, permitindo narrowing correto pelo TypeScript.
- A chave `timeout=300000` foi removida do `.npmrc`.
- Foram preservadas as configurações suportadas:
  - `fetch-retries=5`;
  - `fetch-retry-factor=2`;
  - `fetch-retry-mintimeout=20000`;
  - `fetch-retry-maxtimeout=180000`;
  - `fetch-timeout=300000`.
- A versão visual/documental foi atualizada para `10.0.13.1`.

## Validação executada

```bash
npm run validate:source
```

Resultado: validação de fonte concluída sem regressões conhecidas.

## Validações pendentes em ambiente Node 24

Executar no ambiente local/Docker com acesso ao registry npm:

```bash
npm install
npm run build
docker build -t logosoft-frontend:10.0.13.1 .
```
