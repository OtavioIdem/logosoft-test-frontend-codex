# Implementação v1.11.0a8b22 — E2E fiscal principal mockado

## 1. Objetivo

Esta versão adiciona a primeira suíte Playwright dedicada ao fluxo fiscal principal do frontend, antes da validação contra backend real/homologado.

O foco é validar a navegação operacional e a sequência de ações da tela fiscal usando rotas mockadas no próprio fixture E2E:

```txt
nota fiscal originada de pedido de venda aprovado
→ validação fiscal
→ geração de XML de envio
→ assinatura do XML
→ transmissão SEFAZ/mock
→ autorização mockada
→ geração de DANFE/documento auxiliar
→ baixa de estoque
→ geração de conta a receber
```

A implementação não cria regra fiscal nova, não simula SEFAZ real e não assume comportamento oficial de órgão autorizador. O objetivo é proteger o frontend contra regressões de UX, workflow, permissões e integração de endpoints já documentados.

## 2. Escopo implementado

### 2.1 Novo teste E2E fiscal

Arquivo criado:

```txt
tests/e2e/fiscal.spec.ts
```

Cenário principal:

```txt
executa fluxo fiscal principal mockado até financeiro antes da validação E2E real
```

O teste acessa o detalhe de uma nota fiscal mockada, vinculada a pedido de venda, e executa as ações operacionais disponíveis por workflow:

1. abre o detalhe da nota;
2. confirma vínculo operacional com pedido de venda;
3. valida a nota;
4. gera XML de envio;
5. assina XML;
6. transmite SEFAZ/mock;
7. confirma retorno autorizado `100 • Autorizado`;
8. gera DANFE;
9. baixa estoque;
10. gera financeiro.

### 2.2 Novo script npm

Adicionado em `package.json`:

```json
"test:e2e:fiscal": "playwright test tests/e2e/fiscal.spec.ts"
```

Esse script permite rodar apenas o fluxo E2E fiscal mockado sem executar toda a suíte Playwright.

### 2.3 Permissões fiscais no fixture E2E

O fixture `tests/e2e/fixtures/logosoft.ts` foi atualizado para incluir permissões fiscais no usuário administrador E2E:

- `FISCAL_CONSULTAR`;
- `FISCAL_GERENCIAR`;
- `FISCAL_EMITIR`;
- `FISCAL_EXPORTAR`;
- `FISCAL_CANCELAR`;
- `FISCAL_INUTILIZAR`;
- `FISCAL_CARTA_CORRECAO`.

Também foi adicionada permissão de consulta fiscal ao perfil de consulta usado nos testes de permissão.

### 2.4 Mock fiscal stateful

O fixture E2E passou a manter estado fiscal em memória durante cada teste Playwright.

Estado controlado:

- nota fiscal mockada;
- XMLs de envio/autorizado;
- eventos fiscais;
- logs de integração;
- DANFE/documento auxiliar;
- baixa de estoque;
- conta a receber gerada.

Isso permite que a tela reaja às mutações exatamente como faria com React Query invalidando as consultas e recarregando:

- detalhe da nota;
- resumo operacional;
- workflow operacional;
- integrações;
- listagem.

## 3. Endpoints mockados no E2E

Foram adicionadas respostas mockadas para os endpoints fiscais principais:

```http
GET /api/fiscal/notas-fiscais
GET /api/fiscal/notas-fiscais/exportacoes/csv
POST /api/fiscal/notas-fiscais/gerar-de-pedido-venda
GET /api/fiscal/notas-fiscais/{id}
GET /api/fiscal/notas-fiscais/{id}/resumo-operacional
GET /api/fiscal/notas-fiscais/{id}/workflow-operacional
GET /api/fiscal/notas-fiscais/{id}/integracoes
POST /api/fiscal/notas-fiscais/{id}/validar
POST /api/fiscal/notas-fiscais/{id}/gerar-xml-envio
POST /api/fiscal/notas-fiscais/{id}/assinar-xml-envio
POST /api/fiscal/notas-fiscais/{id}/transmitir-sefaz
POST /api/fiscal/notas-fiscais/{id}/danfe
POST /api/fiscal/notas-fiscais/{id}/baixar-estoque
POST /api/fiscal/notas-fiscais/{id}/gerar-conta-receber
GET /api/fiscal/notas-fiscais/documentos-auxiliares/{documentoAuxiliarId}/download
GET /api/fiscal/observabilidade/integracoes
POST /api/fiscal/sefaz/status-servico
GET /api/fiscal/sefaz/status-servico/historico
POST /api/fiscal/sefaz/contingencia/avaliar
GET /api/fiscal/sefaz/contingencia/historico
```

## 4. O que esta versão valida

### 4.1 Navegação do detalhe fiscal

Valida que a tela `/fiscal/notas/{id}` renderiza o cabeçalho da nota e mostra o vínculo operacional com pedido de venda sem expor GUID como informação principal.

### 4.2 Workflow dirigido pelo backend/mock

Valida que as ações mudam conforme o mock altera o estado da nota:

- `Rascunho` permite validar;
- após validação, permite gerar XML;
- após XML, permite assinar;
- após assinatura, permite transmitir;
- após autorização, permite DANFE, estoque e financeiro.

### 4.3 Retorno de autorização

Valida que o retorno `100 • Autorizado` aparece na tela após transmissão mockada.

### 4.4 Pós-autorização

Valida ações críticas de pós-autorização:

- DANFE/documento auxiliar gerado;
- estoque baixado;
- financeiro gerado.

### 4.5 Observabilidade sanitizada no mock

Os logs mockados usam payload sanitizado:

```txt
xml=[XML_MASKED]; token=[MASKED]; senha=[MASKED]
```

Essa regra reforça que o E2E não deve induzir exposição de XML completo, senha, token ou segredo na UI.

## 5. Pontos críticos

### 5.1 Ainda é E2E mockado, não E2E real

A versão B22 cria o E2E principal em ambiente mockado/controlado. Ela valida o frontend, a sequência de tela e a integração com contratos esperados, mas ainda não valida:

- banco real;
- backend real;
- seed real de pedido de venda;
- transação real entre fiscal, estoque e financeiro;
- auditoria persistida no PostgreSQL;
- concorrência;
- idempotência real;
- comportamento real de ambiente autorizador.

### 5.2 Não substitui validação fiscal oficial

O mock usa retorno `100 • Autorizado` apenas para fluxo operacional de tela. Isso não representa SEFAZ real, schema oficial, certificado, assinatura digital produtiva ou regra fiscal de UF.

### 5.3 Teste não deve virar regra fiscal

Os dados fiscais usados no fixture são demonstrativos. CFOP, NCM, CST/CSOSN, schema e XML não devem ser interpretados como regra oficial.

### 5.4 Dependência de seletores visuais

O teste usa botões e textos visíveis. Se os labels de botões mudarem, o teste pode falhar mesmo sem quebra do contrato HTTP. Isso é desejado parcialmente, porque o E2E protege a experiência operacional, mas precisa ser considerado em revisões de UI.

## 6. Validações executadas neste pacote

Executado no ambiente atual:

```bash
node scripts/validate-source.mjs
```

Resultado:

```txt
Validação de fonte concluída sem regressões conhecidas.
```

Também foi feita verificação local de:

- trailing whitespace;
- linha em branco extra no final dos arquivos.

## 7. Validações obrigatórias no repositório principal

Antes de aplicar commit, executar em Node 24/npm 11:

```bash
npm install
npm run validate:source
npm run typecheck
npm run lint
npm run test:unit
npm run build
npm run test:e2e:fiscal
git diff --check
git diff --cached --check
```

Se desejar validar também os fluxos Playwright existentes:

```bash
npm run test:e2e:critical
npm run test:e2e
```

## 8. Arquivos alterados

```txt
package.json
config/app.ts
docs/CONTRATO_FISCAL_OFICIAL.md
tests/e2e/fixtures/logosoft.ts
tests/e2e/fiscal.spec.ts
docs/IMPLEMENTACAO_V1_11_0A8B22.md
```

## 9. Próximos passos recomendados

### 9.1 Revisão da B22

Validar o pacote em cópia limpa com:

```bash
npm run test:e2e:fiscal
```

Se passar, aplicar no repositório principal e commitar.

### 9.2 E2E fiscal real com backend

Depois da aprovação da B22, o próximo marco deve ser separar um E2E com backend real/mock de API externo, usando dados preparados e banco controlado:

```txt
login real
→ seed real de empresa/filial/cliente/produto/estoque/pedido
→ aprovar pedido
→ gerar nota fiscal
→ pipeline fiscal
→ DANFE
→ estoque
→ financeiro
→ auditoria
```

### 9.3 Teste de auditoria fiscal

Ainda falta validar se o backend realmente grava auditoria fiscal das operações críticas:

- emissão;
- transmissão;
- autorização;
- DANFE;
- baixa de estoque;
- financeiro;
- exportação CSV;
- reprocessamento;
- inutilização.

### 9.4 Teste de idempotência real

O frontend já envia `correlationId`, mas o E2E real precisa provar que o backend rejeita ou reconcilia duplicidade corretamente.

## 10. Conclusão

A `v1.11.0a8b22` adiciona a primeira cobertura Playwright do fluxo fiscal principal do frontend em ambiente mockado. Ela fecha a etapa anterior de contratos e prepara o projeto para validação E2E real com backend, banco e auditoria.

A versão ainda não deve ser considerada prova de emissão fiscal real. Ela é uma proteção de frontend e regressão operacional antes do E2E completo.
