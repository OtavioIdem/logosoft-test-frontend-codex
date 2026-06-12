# Implementação v1.11.0a8b21 — testes de contrato fiscal pré-E2E

## 1. Objetivo

Esta versão continua a linha fiscal após a `v1.11.0a8b20`, antes da criação do E2E fiscal principal.

O foco é criar uma camada inicial de testes de contrato frontend/backend para reduzir regressões nos DTOs fiscais mais importantes, sem depender ainda de execução ponta a ponta contra backend real.

A implementação mantém as regras centrais do módulo fiscal:

- não inventar regra fiscal legal;
- não exibir XML completo na listagem, detalhe ou observabilidade;
- usar resumo/workflow como fonte de verdade para ações operacionais;
- preservar `correlationId` em ações críticas;
- manter payloads sensíveis mascarados;
- manter referências por select/API, não por GUID digitado.

## 2. Escopo implementado

### 2.1 Teste de contrato da listagem fiscal

Foi criado teste unitário cobrindo `NotaFiscalListagemResponse` e `NotaFiscalListagemItemResponse`.

O teste garante que a listagem fiscal permanece leve e não carrega campos pesados:

- `itens`;
- `impostos`;
- `xmls`;
- `eventos`;
- `conteudoXml`;
- `payloadResumo`.

A listagem deve continuar trazendo apenas metadados operacionais e a ação principal sugerida pelo backend.

### 2.2 Teste de contrato do detalhe fiscal

Foi criado teste unitário cobrindo `NotaFiscalResponse`.

O teste valida que o detalhe contém:

- dados principais da nota;
- itens;
- impostos;
- metadados de XML;
- eventos fiscais.

O ponto crítico validado é que `xmls[]` contém metadados como hash, protocolo, chave e armazenamento, mas não contém `conteudoXml`.

### 2.3 Teste de contrato do resumo e workflow operacional

Foi criado teste cobrindo:

- `ResumoOperacionalNotaFiscalResponse`;
- `WorkflowOperacionalNotaFiscalResponse`;
- `resolveFiscalWorkflowActionState`.

O teste reforça que o frontend deve usar `resumo.acoes` e `workflow.proximasAcoes` para decidir exibição/habilitação das ações.

Foi validado o cenário de DANFE disponível e financeiro bloqueado por motivo operacional retornado pelo backend.

### 2.4 Teste de contrato da observabilidade fiscal

Foi criado teste cobrindo `ObservabilidadeFiscalResponse` e `LogIntegracaoFiscalResponse`.

O teste confirma que payloads retornados em logs continuam passando por mascaramento defensivo, mesmo quando o backend deveria enviar conteúdo sanitizado.

Foram validados:

- mascaramento de XML fiscal completo;
- mascaramento de token;
- não vazamento de CNPJ interno do XML;
- não vazamento de tags internas como `<emit>`.

### 2.5 Teste de contrato de correlationId em ações críticas

Foi criado teste cobrindo os builders de payloads fiscais críticos.

A cobertura inclui:

- transmissão SEFAZ/mock;
- reprocessamento;
- consulta de protocolo;
- status de serviço;
- avaliação de contingência;
- habilitação de contingência em nota;
- cancelamento SEFAZ/mock;
- carta de correção;
- inutilização;
- DANFE;
- baixa de estoque;
- geração de conta a receber.

O objetivo é impedir regressão semelhante à ocorrida na B18, em que o `correlationId` era removido durante sanitização.

### 2.6 Correção preventiva de tipos duplicados

Foram removidas duplicidades residuais em `features/fiscal/types/fiscal.types.ts`:

- `WorkflowOperacionalNotaFiscalResponse.etapaAtual` aparecia duplicado;
- `CartaCorrecaoResponse.sequencia` aparecia duplicado.

Essa correção não altera contrato HTTP; apenas reduz ruído e risco em revisão/typecheck futuro.

## 3. Arquivos alterados

- `tests/unit/fiscalContract.test.ts`;
- `features/fiscal/types/fiscal.types.ts`;
- `package.json`;
- `config/app.ts`;
- `docs/CONTRATO_FISCAL_OFICIAL.md`;
- `docs/IMPLEMENTACAO_V1_11_0A8B21.md`.

## 4. Pontos críticos analisados

### 4.1 Listagem não pode virar detalhe pesado

A listagem fiscal deve continuar otimizada. Ela não deve carregar XML, itens completos, impostos completos ou payload técnico.

Caso algum endpoint futuro passe a retornar esses campos, o teste deve ser revisto para garantir que o frontend não exiba ou dependa deles indevidamente.

### 4.2 Detalhe não deve expor XML completo

O detalhe pode mostrar metadados de XML, mas não deve exibir `conteudoXml`.

O único endpoint conhecido que retorna `conteudoXml` é o fluxo de geração de XML, e esse conteúdo deve ser tratado como retorno operacional específico, não como dado permanente de listagem/detalhe.

### 4.3 Workflow é fonte de verdade das ações

O frontend não deve decidir por conta própria se uma ação fiscal pode ocorrer.

As decisões de habilitação devem continuar passando por:

- `resumo.acoes.*`;
- `workflow.proximasAcoes`;
- `workflow.bloqueios`;
- `motivoBloqueio`;
- permissões granulares.

### 4.4 Observabilidade deve ser defensiva

Mesmo que o backend prometa sanitização, o frontend continua mascarando XML fiscal, token, senha, certificado e payload sensível.

Essa defesa em profundidade evita vazamentos em caso de erro de integração, regressão de backend ou retorno inesperado.

### 4.5 CorrelationId é obrigatório operacionalmente

Toda ação crítica que aceita `correlationId` deve preservar esse valor no payload final.

Esse ponto protege rastreabilidade, auditoria, idempotência e análise de reprocessamento.

## 5. Validação executada nesta entrega

Foi executado:

```bash
node scripts/validate-source.mjs
```

Resultado:

```txt
Validação de fonte concluída sem regressões conhecidas.
```

Também foram verificadas ausências de trailing whitespace e linha em branco extra no final dos arquivos alterados.

## 6. Validação obrigatória no repositório principal

Antes de commit, executar em Node 24/npm 11:

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

## 7. O que ainda precisa ser analisado

### 7.1 Testes de contrato com backend real

Os testes desta versão são fixtures tipadas e invariantes locais.

Ainda falta, em etapa posterior, validar respostas reais do backend fiscal contra esses contratos, preferencialmente por teste de integração/contrato automatizado.

### 7.2 E2E fiscal principal

O E2E fiscal principal continua fora desta entrega.

Fluxo esperado para próxima grande etapa:

```txt
login
→ selecionar empresa/filial
→ localizar pedido aprovado
→ gerar nota fiscal
→ gerar XML
→ assinar XML
→ transmitir SEFAZ/mock
→ receber autorização mockada
→ gerar DANFE
→ baixar estoque
→ gerar conta a receber
→ consultar observabilidade
→ exportar CSV
```

### 7.3 Contratos de parametrização fiscal

Ainda não foram criadas telas/contratos oficiais para parametrização tributária avançada, CFOP, CST/CSOSN, alíquotas, certificado produtivo, NFS-e municipal, CT-e/MDF-e, SPED ou apuração.

Esses pontos dependem de backend específico e validação fiscal oficial.

## 8. Conclusão

A `v1.11.0a8b21` fecha uma camada de segurança antes do E2E, criando testes de contrato locais para os principais DTOs e payloads fiscais.

A entrega não altera regra fiscal, endpoint ou fluxo operacional. Ela reduz risco de regressão em listagem, detalhe, workflow, observabilidade e ações críticas com `correlationId`.
