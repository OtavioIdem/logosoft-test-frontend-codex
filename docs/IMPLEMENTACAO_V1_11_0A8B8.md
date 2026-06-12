# Implementação v1.11.0a8b8 — Mascaramento defensivo de XML fiscal

## Objetivo

Corrigir o bloqueio P1 identificado na revisão da `v1.11.0a8b7`, onde o mascaramento fiscal substituía apenas tags conhecidas individualmente e ainda permitia vazamento de tags internas ou dados contidos em XML fiscal na observabilidade.

## Correção aplicada

Arquivo principal:

- `features/fiscal/components/fiscalUiUtils.ts`

Alterações:

- Substituído o mascaramento por tag isolada por mascaramento de bloco XML completo.
- Ao detectar XML fiscal, o trecho completo é substituído por `[XML_MASKED]`.
- Mantido mascaramento de chaves sensíveis como `senha`, `token`, `certificado`, `conteudoXml`, `xmlEnvio`, `xmlEventoAssinado`, `xmlInutilizacaoAssinado`, `xmlStatusServico`, `xmlConsultaAssinado` e `xmlCancelamento`.
- Mantido mascaramento de `Bearer token`.
- Adicionado fallback defensivo para XML genérico na observabilidade, evitando exposição acidental de payload XML completo mesmo quando a tag raiz não estiver na lista fiscal principal.

## Teste adicionado

Arquivo:

- `tests/unit/fiscalUxRules.test.ts`

Cenário incluído:

- XML fiscal com conteúdo interno:

```txt
payload=<NFe><emit><CNPJ>12345678000199</CNPJ></emit><total>999</total></NFe>; status=erro
```

Resultado esperado:

```txt
payload=[XML_MASKED]; status=erro
```

O teste também garante que não vazem:

- `<emit>`;
- `CNPJ`;
- `12345678000199`;
- `<total>`.

## Versão

Atualizada para:

- `package.json`: `1.11.0-a.8.b8`;
- `logosoftVersion`: `1.11.0a8b8`;
- `config/app.ts`: `1.11.0a8b8`.

## Validação local executada

```bash
node scripts/validate-source.mjs
```

Resultado:

```txt
Validação de fonte concluída sem regressões conhecidas.
```

## Validação recomendada no ambiente Node 24/npm 11

```bash
npm install
npm run validate:source
npm run typecheck
npm run lint
npm run test:unit
npm run build
```

## Observação de segurança

A observabilidade fiscal deve continuar tratando payloads como dado sensível. Mesmo que o backend já entregue `payloadResumo` sanitizado, o frontend mantém uma segunda camada defensiva para não exibir XML fiscal completo, tokens, senhas, certificados ou segredos.
