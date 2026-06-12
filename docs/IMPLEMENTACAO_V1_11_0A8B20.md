# Implementação v1.11.0a8b20 — fechamento operacional antes do E2E fiscal

## 1. Objetivo

Esta versão adianta os passos planejados antes dos testes E2E fiscais, mantendo a regra central do projeto: não inventar regra fiscal, não expor payload sensível e não liberar operação crítica somente pela interface.

A versão parte da base v1.11.0a8b19 e cobre:

1. validação da base B19 como ponto de partida;
2. refinamento de documentos auxiliares no detalhe fiscal;
3. refinamento das abas de XMLs, eventos e integrações;
4. reprocessamento contextual por log fiscal;
5. observabilidade/status de serviço/contingência mais operacional;
6. testes de componente antes de iniciar E2E.

O E2E fiscal principal continua pendente e deve ser tratado em versão posterior.

## 2. Escopo implementado

### 2.1 Base B19 mantida

A correção de `correlationId` feita na B19 foi mantida. O sanitizador continua preservando identificadores operacionais textuais, como `correlationId`, sem afrouxar a validação de campos técnicos de entidade.

### 2.2 Documentos auxiliares no detalhe fiscal

Foi criado o componente `FiscalDocumentosAuxiliaresPanel` para exibir documentos auxiliares por metadados.

Campos exibidos:

- tipo do documento auxiliar;
- formato;
- nome do arquivo;
- content-type;
- tamanho em bytes;
- hash SHA-256;
- data de geração;
- ação de download.

Regras aplicadas:

- não exibir conteúdo do documento na tela;
- não expor GUID como informação principal para o usuário;
- usar download via endpoint protegido;
- indicar DANFE/documento auxiliar pendente quando o resumo/workflow ainda não confirmar a existência.

Limitação conhecida:

- o contrato atual do detalhe não retorna uma lista histórica de documentos auxiliares. Por isso, a tela lista o documento gerado na sessão atual pelo fluxo de DANFE. Para histórico completo, é necessário endpoint específico no backend.

### 2.3 XMLs, eventos e integrações refinados

A aba de XMLs passou a exibir mensagem explícita de segurança:

- apenas metadados de XML devem ser exibidos;
- `conteudoXml` completo não deve ser carregado no detalhe fiscal;
- XML fiscal completo deve permanecer restrito ao backend/storage.

A aba de eventos recebeu mensagem operacional reforçando que eventos fiscais representam histórico/status e que prazos/regras legais não devem ser interpretados no frontend.

A aba de integrações passou a usar `FiscalIntegracoesTable`, que exibe:

- operação;
- status com label visual;
- correlation ID;
- mensagem;
- payload sanitizado;
- data de registro;
- indicador de dado sensível mascarado;
- ação contextual de reprocessamento quando `podeReprocessar=true`.

### 2.4 Reprocessamento contextual por log fiscal

O modal `ReprocessarSefazDialog` foi ampliado para receber contexto do log selecionado.

Agora o modal pode exibir:

- mensagem original da falha;
- payload original sanitizado;
- `logIntegracaoFiscalId` somente leitura;
- `correlationIdOriginal` somente leitura quando vier do log;
- novo `correlationId` gerado para a tentativa atual;
- motivo obrigatório conforme schema/backend.

Regras aplicadas:

- reprocessamento deve partir de log elegível;
- payload sensível permanece mascarado;
- novo `correlationId` representa nova tentativa operacional;
- a decisão final de reprocessar continua no backend.

### 2.5 Observabilidade, status e contingência

A tela de observabilidade foi ampliada com avaliação operacional de contingência fiscal.

Foram adicionados:

- formulário de avaliação de contingência geral;
- seleção de tipo de documento;
- UF autorizadora;
- tipo de contingência;
- motivo operacional;
- janela de status de serviço;
- exigência de status indisponível recente;
- novo `correlationId` por tentativa;
- painel de resultado de contingência.

A lista de logs recentes também passou a permitir abrir a nota relacionada quando `notaFiscalId` estiver disponível.

### 2.6 Componentes operacionais compartilhados

Criado o arquivo:

```txt
features/fiscal/components/FiscalOperationalPanels.tsx
```

Componentes criados:

- `FiscalPayloadResumo`;
- `StatusServicoResultPanel`;
- `ContingenciaResultPanel`;
- `HistoricoLogsTable`;
- `FiscalDocumentosAuxiliaresPanel`;
- `FiscalIntegracoesTable`.

Helpers exportados:

- `statusIntegracaoLabel`;
- `statusIntegracaoSeverity`;
- `statusIntegracaoOptions`.

### 2.7 Novos labels fiscais

Adicionados ao `fiscalUiUtils.ts`:

- `tipoDocumentoAuxiliarFiscalLabel`;
- `formatoDocumentoAuxiliarFiscalLabel`;
- `tipoContingenciaFiscalLabel`.

Esses labels evitam exibir enum cru nas telas operacionais.

### 2.8 Testes adicionados

Novo teste de componente:

```txt
tests/components/FiscalOperationalPanels.test.tsx
```

Cobre:

- documento auxiliar exibido por metadados;
- payload/XML sensível mascarado;
- painel de status de serviço;
- painel de contingência fiscal.

Teste unitário atualizado:

```txt
tests/unit/fiscalUxRules.test.ts
```

Cobre:

- labels de documento auxiliar;
- formato de documento auxiliar;
- tipo de contingência.

## 3. Arquivos alterados

- `features/fiscal/components/FiscalOperationalPanels.tsx`
- `features/fiscal/components/FiscalActionDialogs.tsx`
- `features/fiscal/components/NotaFiscalDetalhePage.tsx`
- `features/fiscal/components/ObservabilidadeFiscalPage.tsx`
- `features/fiscal/components/fiscalUiUtils.ts`
- `tests/components/FiscalOperationalPanels.test.tsx`
- `tests/unit/fiscalUxRules.test.ts`
- `docs/DIRETRIZES_UX_REFERENCIAS.md`
- `docs/CONTRATO_FISCAL_OFICIAL.md`
- `config/app.ts`
- `package.json`

## 4. Pontos críticos para revisar

### 4.1 Histórico completo de documentos auxiliares

O frontend ainda depende de documento auxiliar gerado na sessão atual, porque o detalhe da nota não documenta uma coleção própria de documentos auxiliares históricos. Para uma aba 100% completa, o backend precisa expor uma lista ou incluir a coleção no detalhe/resumo.

### 4.2 Reprocessamento em observabilidade global

A observabilidade lista logs recentes e permite abrir a nota relacionada. O reprocessamento operacional completo continua concentrado no detalhe da nota, porque o endpoint de reprocessamento exige `{id}` da nota fiscal.

### 4.3 XML/payload sensível

O mascaramento defensivo foi mantido, mas a revisão deve continuar procurando qualquer novo campo que possa vazar:

- XML completo;
- token;
- senha;
- certificado;
- bearer token;
- payload técnico de integração;
- dados fiscais sensíveis.

### 4.4 Regras fiscais oficiais

Nada nesta versão implementa regra legal de prazo de cancelamento, carta de correção, inutilização oficial por UF, schema vigente, alíquota, CST/CSOSN, CFOP ou NFS-e municipal. Esses pontos seguem dependendo de backend, documentação oficial e validação fiscal humana.

### 4.5 Testes de componente não substituem E2E

Os testes adicionados validam painéis e regressões de segurança visual, mas não substituem o fluxo E2E fiscal completo.

## 5. Validação executada no pacote

Executado no ambiente disponível:

```bash
node scripts/validate-source.mjs
```

Resultado:

```txt
Validação de fonte concluída sem regressões conhecidas.
```

Também foi verificado:

- trailing whitespace;
- linha em branco extra no EOF;
- ausência de alteração de regra fiscal oficial;
- ausência de exposição intencional de XML completo.

## 6. Validação obrigatória no repositório principal

No ambiente correto com Node 24/npm 11, executar:

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

Não fazer commit se qualquer etapa falhar.

## 7. Próxima etapa recomendada

```txt
v1.11.0a8b21 — testes de contrato frontend/backend fiscal
```

Depois:

```txt
v1.11.0a8b22 — E2E fiscal principal com backend/mock
```

O E2E deve validar o fluxo completo:

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
