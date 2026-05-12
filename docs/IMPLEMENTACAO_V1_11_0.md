# Implementação v1.11.0 — Fiscal Contract Gate

## Versão anterior

A versão aplicada antes desta etapa era `v1.10.15a1`, criada como manutenção da antiga base `v10.0.15`.

## Objetivo

Iniciar o bloco Fiscal/Nota Fiscal com um gate técnico e documental, sem inventar endpoints, regras tributárias ou comportamento fiscal no frontend.

## Decisão técnica

Nenhuma tela fiscal operacional foi criada nesta versão porque o repositório ainda não contém contrato oficial da API fiscal nem documentação validada sobre o documento alvo.

Esta etapa protege o projeto contra avanço incorreto em Fiscal/Nota Fiscal, onde regras de negócio dependem de validação especializada e legislação aplicável.

## Guardrail adicionado

Arquivo alterado:

- `scripts/validate-source.mjs`

O `validate:source` agora falha se forem criadas rotas/features fiscais sem o arquivo:

- `docs/CONTRATO_FISCAL_OFICIAL.md`

Esse contrato deve ser adicionado antes de qualquer implementação em:

- `app/(main)/fiscal`;
- `app/(main)/nota-fiscal`;
- `app/(main)/notas-fiscais`;
- `features/fiscal`;
- `features/nota-fiscal`;
- `features/notas-fiscais`.

## Informações obrigatórias para avançar

Antes de implementar telas, chamadas de API ou regras fiscais, o contrato deve indicar:

- tipo de documento fiscal alvo: NF-e, NFC-e, NFS-e, CT-e, MDF-e ou outro;
- endpoints reais;
- payloads de criação, consulta, transmissão, cancelamento, inutilização e correção quando existirem;
- enums oficiais exigidos pelo backend;
- UF e município quando aplicável;
- ambiente de homologação/produção;
- estratégia de certificado digital;
- tratamento de rejeições/retornos fiscais;
- regras validadas por contador, especialista fiscal ou documentação oficial aplicável.

## O que não foi feito

- Não foi criado módulo Fiscal.
- Não foi criado menu Fiscal.
- Não foi criada rota fiscal.
- Não foi criado client Axios fiscal.
- Não foram inventados CFOP, CST, CSOSN, alíquotas, XML, integração SEFAZ ou prefeitura.

## Validação executada

```bash
npm run validate:source
npm run test:unit
```

Resultado:

- `validate:source` passou.
- `test:unit` executou com Node `24.15.0` e npm `11.12.1`; 93 testes passaram e 7 falhas preexistentes foram aceitas temporariamente.
