# Implementação v1.11.0a8b18 — inutilização fiscal operacional

## Objetivo

Fechar a tela dedicada de inutilização fiscal como fluxo operacional alinhado ao contrato fiscal v1.10.0a18, sem criar regras fiscais legais no frontend.

## Alterações realizadas

- A tela `/fiscal/inutilizacoes` foi reforçada como operação dedicada de inutilização de faixa numérica.
- Empresa e filial permanecem selecionadas via `EmpresaSelect` e `FilialSelect`, sem digitação manual de GUID.
- Ao trocar empresa, a filial é limpa para evitar envio de vínculo fora do escopo.
- Ao trocar empresa ou filial, resultado e erro operacional da tentativa anterior são limpos.
- O `correlationId` passou a ser gerado pelo helper fiscal central `createFiscalCorrelationId`.
- O `correlationId` passou a ser exibido como leitura, com botão para regenerar a tentativa.
- Antes de transmitir, a tela valida localmente o payload com `inutilizarNumeracaoSefazSchema.safeParse`.
- Erros de validação local e erros retornados pela API agora usam `ApiErrorPanel`.
- O painel de erro preserva `code`, `status`, `traceId` e erros por campo quando disponíveis.
- A mutação de inutilização invalida consultas fiscais, observabilidade e histórico SEFAZ/contingência relacionados.
- O painel lateral exibe contexto operacional sem expor GUID bruto como informação principal.
- Adicionado teste unitário para payload válido de inutilização fiscal com normalização de UF, filial opcional e `schemaSetName` vazio.
- Adicionado teste unitário para proteção de rota `/fiscal/inutilizacoes` por `FISCAL_INUTILIZAR`.

## Arquivos alterados

- `features/fiscal/components/InutilizacoesFiscaisPage.tsx`
- `features/fiscal/hooks/useFiscalResources.ts`
- `tests/unit/fiscalPayload.test.ts`
- `tests/unit/routePermissions.test.ts`
- `docs/DIRETRIZES_UX_REFERENCIAS.md`
- `docs/CONTRATO_FISCAL_OFICIAL.md`
- `package.json`
- `config/app.ts`

## Regras respeitadas

- O frontend não decide se a inutilização é fiscalmente permitida.
- A validação legal, sobreposição de faixa, ambiente autorizador e retorno oficial continuam responsabilidade do backend/domínio.
- O XML assinado pode ser informado quando o contrato exigir, mas não deve ser exibido em logs, observabilidade ou mensagens operacionais.
- Operação crítica usa `correlationId` por tentativa para auditoria/idempotência.
- Nenhum GUID de empresa/filial deve ser digitado manualmente.

## Validação executada neste pacote

```bash
node scripts/validate-source.mjs
```

Resultado:

```txt
Validação de fonte concluída sem regressões conhecidas.
```

Também foi executada verificação local de trailing whitespace e linha em branco extra no EOF antes do empacotamento.

## Validação obrigatória no repositório principal

```bash
npm install
npm run validate:source
npm run typecheck
npm run lint
npm run test:unit
npm run build
git diff --check
git diff --cached --check
```
