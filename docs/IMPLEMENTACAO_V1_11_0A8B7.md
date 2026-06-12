# Implementação v1.11.0a8b7 — Observabilidade fiscal operacional e status de serviço

## Objetivo

Evoluir a etapa fiscal após o desbloqueio técnico da `v1.11.0a8b6`, focando em observabilidade, status de serviço SEFAZ/mock e segurança visual de payloads operacionais.

A implementação continua seguindo o contrato fiscal `v1.10.0a18` e não adiciona regra fiscal legal própria.

## Escopo implementado

### 1. Observabilidade fiscal

Arquivo principal:

- `features/fiscal/components/ObservabilidadeFiscalPage.tsx`

Melhorias:

- filtros locais por operação;
- filtro local por status de integração;
- filtro local por logs reprocessáveis;
- filtro local por logs com dado sensível mascarado;
- tabela paginada de logs recentes;
- exibição de payload resumido sanitizado;
- cartões de métricas preservados para sucesso, falha, pendência e total analisado.

### 2. Consulta de status de serviço fiscal

A tela de observabilidade passou a oferecer consulta operacional de status de serviço usando o endpoint oficial:

```http
POST /api/fiscal/sefaz/status-servico
```

Payload enviado pela tela:

```json
{
  "empresaId": "guid selecionado por dropdown",
  "filialId": "guid selecionado por dropdown ou null",
  "tipoDocumento": 1,
  "ufAutorizadora": "SP",
  "xmlStatusServico": "<consStatServ />",
  "validarSchemaAntesConsulta": false,
  "schemaSetName": "nfe-vigente",
  "correlationId": "front-status-servico-..."
}
```

A empresa e filial continuam seguindo a diretriz global: seleção por `GET + dropdown`, sem digitação manual de GUID.

### 3. Histórico de status e contingência

Novos hooks:

- `useHistoricoStatusServicoFiscal`
- `useHistoricoContingenciaFiscal`

Endpoints consumidos:

```http
GET /api/fiscal/sefaz/status-servico/historico
GET /api/fiscal/sefaz/contingencia/historico
```

Ambos usam `empresaId`, `filialId` e `take`.

### 4. Proteção visual de payload fiscal

Novo helper:

- `maskFiscalSensitiveText`

Objetivo:

- evitar exibir token, senha, certificado, segredo ou XML completo na UI;
- proteger visualmente `payloadResumo`, mesmo considerando que o backend já deve retornar payload sanitizado;
- manter a tela coerente com a regra do contrato: observabilidade não deve expor senha, token, certificado, XML completo ou segredo.

### 5. Testes adicionados/ajustados

Arquivos:

- `tests/unit/fiscalPayload.test.ts`
- `tests/unit/fiscalUxRules.test.ts`

Coberturas novas:

- payload de status de serviço normaliza UF e `filialId` vazio para `null`;
- payload de status usa empresa selecionada por referência controlada;
- payload sensível fiscal é mascarado na camada visual.

## Arquivos alterados

- `features/fiscal/components/ObservabilidadeFiscalPage.tsx`
- `features/fiscal/components/fiscalUiUtils.ts`
- `features/fiscal/hooks/useFiscalResources.ts`
- `features/fiscal/types/fiscal.types.ts`
- `tests/unit/fiscalPayload.test.ts`
- `tests/unit/fiscalUxRules.test.ts`
- `config/app.ts`
- `package.json`
- `CHANGELOG.md`

## Validação executada

```bash
npm run validate:source
```

Resultado:

```txt
Validação de fonte concluída sem regressões conhecidas.
```

## Validações pendentes no ambiente Node 24

Este container está em Node 22/npm 10. No ambiente correto do projeto, executar:

```bash
npm install
npm run validate:source
npm run typecheck
npm run lint
npm run test:unit
npm run build
```

## Próxima etapa sugerida

`v1.11.0a8b8`:

- manutenção de selects com busca/paginação server-side onde houver grande volume;
- revisão transversal de campos ainda digitáveis que representam entidades relacionadas;
- filtros de entidades ativas/permitidas;
- revisão do caso `manager@erp.local`;
- atualização/triagem de dependências vulneráveis.
