# Skill — Fiscal frontend

## Objetivo

Garantir que o módulo fiscal seja operado como fluxo especializado, auditável e integrado, sem inventar regra fiscal.

## Regra central

```text
Não inventar regra fiscal, layout XML, CFOP, CST, CSOSN, NCM, CEST, alíquota, prazo legal ou comportamento de SEFAZ/prefeitura.
```

## Antes de implementar fiscal

Responder:

```text
O documento é NF-e, NFC-e, NFS-e, CT-e, MDF-e ou outro?
A operação é venda, compra, devolução, remessa, transferência, serviço ou transporte?
Qual UF da empresa?
Qual município, se NFS-e?
Qual regime tributário?
Existe certificado digital?
Existe ambiente de homologação?
Existe ambiente de produção?
Quais schemas e notas técnicas se aplicam?
Quais eventos fiscais precisam existir?
```

## O frontend fiscal deve

- usar `resumo.acoes` e `workflow.proximasAcoes` para ações visuais;
- exibir bloqueios e alertas vindos do backend;
- exigir motivo em cancelamento, inutilização e ações críticas;
- gerar ou preservar `correlationId` por tentativa operacional;
- mascarar XML, token, senha, certificado, segredo e payload sensível;
- tratar SEFAZ/prefeitura como integração especializada;
- documentar dependências de validação oficial.

## O frontend fiscal não deve

- criar regra fiscal própria;
- autorizar ação apenas por permissão visual;
- exibir XML completo em tela ou log;
- permitir edição de nota autorizada;
- permitir cancelamento/inutilização sem motivo;
- simular autorização real como produção;
- considerar homologação/mock como validação oficial.

## Gates fiscais

Rodar quando houver impacto fiscal:

```bash
npm run validate:fiscal:production
npm run test:e2e:fiscal
npm run test:contract:fiscal
npm run test:e2e:fiscal:backend
```

Quando contrato/backend real não estiver configurado, os testes opt-in podem ser skipados de forma explícita. Esse skip não é aprovação de produção real.
