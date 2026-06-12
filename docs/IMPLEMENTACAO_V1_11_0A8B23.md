# Implementação v1.11.0a8b23 — Contrato fiscal contra backend real/controlado

## 1. Objetivo

Esta versão adiciona uma suíte opt-in de contrato fiscal contra backend real ou ambiente controlado, sem substituir o E2E mockado criado na `v1.11.0a8b22.c2`.

O foco é validar que os principais DTOs fiscais retornados pela API continuam compatíveis com o frontend antes de avançar para E2E real com fluxo completo.

## 2. Escopo implementado

### 2.1 Nova suíte de contrato

Arquivo criado:

```txt
tests/contract/fiscal-backend.contract.spec.ts
```

Script criado:

```bash
npm run test:contract:fiscal
```

A suíte usa Playwright API request para chamar diretamente o backend fiscal controlado.

## 3. Variáveis de ambiente

A suíte só executa validação real quando estas variáveis estiverem presentes:

```bash
LOGOSOFT_CONTRACT_API_URL=http://localhost:8080
LOGOSOFT_CONTRACT_ACCESS_TOKEN=token-jwt-valido
LOGOSOFT_CONTRACT_EMPRESA_ID=guid-da-empresa
```

Variáveis opcionais:

```bash
LOGOSOFT_CONTRACT_FILIAL_ID=guid-da-filial
LOGOSOFT_CONTRACT_NOTA_FISCAL_ID=guid-da-nota
LOGOSOFT_CONTRACT_UF_AUTORIZADORA=SP
LOGOSOFT_CONTRACT_RUN_STATUS_SERVICO=true
LOGOSOFT_CONTRACT_RUN_EXPORT_CSV=true
LOGOSOFT_CONTRACT_EXPORT_CSV_MOTIVO=Contrato fiscal controlado
```

Quando as variáveis obrigatórias não existem, o teste é pulado com mensagem explícita. Isso evita quebrar ambiente local sem backend fiscal.

## 4. Contratos validados

### 4.1 Listagem fiscal

Endpoint:

```http
GET /api/fiscal/notas-fiscais
```

Valida:

- paginação;
- campos principais da nota;
- flags de XML/DANFE/estoque/financeiro;
- ausência de campos pesados na listagem;
- ausência de XML completo;
- ausência de payload técnico sensível.

Campos proibidos na listagem:

```txt
itens
impostos
xmls
eventos
conteudoXml
payloadResumo
payloadEnviado
payloadRecebido
```

### 4.2 Detalhe fiscal

Endpoint:

```http
GET /api/fiscal/notas-fiscais/{id}
```

Valida:

- estrutura básica da nota;
- itens;
- impostos;
- XMLs somente por metadados;
- eventos;
- ausência de `conteudoXml` no detalhe e nos XMLs.

### 4.3 Resumo operacional

Endpoint:

```http
GET /api/fiscal/notas-fiscais/{id}/resumo-operacional
```

Valida:

- `notaFiscalId`;
- objeto `acoes`;
- flags operacionais booleanas usadas pelo frontend.

### 4.4 Workflow operacional

Endpoint:

```http
GET /api/fiscal/notas-fiscais/{id}/workflow-operacional
```

Valida:

- percentual concluído;
- etapas;
- próximas ações;
- método HTTP;
- endpoint;
- flag `habilitada`.

### 4.5 Integrações da nota

Endpoint:

```http
GET /api/fiscal/notas-fiscais/{id}/integracoes
```

Valida:

- estrutura dos logs;
- `podeReprocessar`;
- `contemDadoSensivelOcultado`;
- payload sanitizado.

### 4.6 Observabilidade fiscal

Endpoint:

```http
GET /api/fiscal/observabilidade/integracoes
```

Valida:

- totais de logs;
- totais por status;
- flags de falha/pendência recente;
- logs recentes sem XML, token, senha, segredo ou certificado.

## 5. Operações opcionais

### 5.1 Status de serviço

Só roda com:

```bash
LOGOSOFT_CONTRACT_RUN_STATUS_SERVICO=true
```

Endpoint:

```http
POST /api/fiscal/sefaz/status-servico
```

Motivo: mesmo sendo consulta, pode gerar log fiscal no backend.

### 5.2 Exportação CSV auditada

Só roda com:

```bash
LOGOSOFT_CONTRACT_RUN_EXPORT_CSV=true
```

Endpoint:

```http
GET /api/fiscal/notas-fiscais/exportacoes/csv
```

Motivo: exportação fiscal registra auditoria. Por isso, não deve rodar automaticamente sem decisão explícita.

## 6. Segurança aplicada

A suíte valida defensivamente que respostas e logs não exponham:

- XML fiscal completo;
- token;
- senha;
- password;
- secret;
- segredo;
- certificado;
- bearer token;
- chave privada.

Também reutiliza `maskFiscalSensitiveText` para garantir que payloads vindos do backend já cheguem sanitizados.

## 7. Comandos de validação

Validação local de fonte:

```bash
npm run validate:source
```

Validação completa recomendada:

```bash
npm install
npm run validate:source
npm run typecheck
npm run lint
npm run test:unit
npm run build
npx playwright install chromium
npm run test:e2e:fiscal
npm run test:contract:fiscal
git diff --check
git diff --cached --check
```

Execução contra backend controlado:

```bash
LOGOSOFT_CONTRACT_API_URL=http://localhost:8080 \
LOGOSOFT_CONTRACT_ACCESS_TOKEN=token-jwt-valido \
LOGOSOFT_CONTRACT_EMPRESA_ID=11111111-1111-1111-1111-111111111111 \
npm run test:contract:fiscal
```

Com validações opcionais auditáveis:

```bash
LOGOSOFT_CONTRACT_RUN_STATUS_SERVICO=true \
LOGOSOFT_CONTRACT_RUN_EXPORT_CSV=true \
LOGOSOFT_CONTRACT_EXPORT_CSV_MOTIVO="Contrato fiscal frontend/backend" \
npm run test:contract:fiscal
```

## 8. Pontos críticos para revisão

1. Confirmar se o token usado possui permissões fiscais suficientes.
2. Confirmar se a empresa possui ao menos uma nota fiscal para validar detalhe/resumo/workflow.
3. Confirmar se a exportação CSV deve ser executada, pois gera auditoria.
4. Confirmar se consulta de status de serviço deve ser executada, pois pode gerar log fiscal.
5. Confirmar se o backend retorna `payloadResumo` já sanitizado.
6. Confirmar se o ambiente controlado usa dados não produtivos.

## 9. O que não foi implementado nesta versão

Esta versão não implementa:

- E2E fiscal completo com backend real;
- geração real de pedido/nota usando banco real;
- transmissão produtiva SEFAZ;
- validação de XML oficial;
- certificado digital produtivo;
- regra tributária legal.

Esses pontos continuam fora do escopo porque dependem de backend controlado, homologação, documentação fiscal oficial e validação humana especializada.

## 10. Próxima etapa recomendada

Após aprovação da B23, seguir para:

```txt
v1.11.0a8b24 — E2E fiscal com backend real/controlado
```

Caso a B23 seja bloqueada, seguir padrão de correção:

```txt
v1.11.0a8b23.c1
v1.11.0a8b23.c2
```
