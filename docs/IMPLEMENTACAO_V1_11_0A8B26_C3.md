# Implementacao v1.11.0a8b26.c3 - Auditoria global de referencias por GUID

## 1. Objetivo

Aplicar a correcao final da auditoria global contra digitacao manual de GUID em campos de referencia do ERP, preservando o estado rastreado do repositorio atual.

Esta aplicacao foi feita de forma incremental: somente os arquivos diretamente relacionados ao gate, documentacao e versionamento foram substituidos. Arquivos ausentes no ZIP nao foram removidos do repositorio.

## 2. Problema corrigido

As entregas anteriores da B26 tiveram dois problemas principais:

- o gate inicial nao detectava `Controller name="clienteId"` quando o valor era repassado por `{...field}` para `InputText`;
- pacotes intermediarios tratavam arquivos de mock/store de forma ambigua, podendo reescrever ou remover arquivos fora do escopo.

Nesta versao, o gate foi mantido e corrigido, e a aplicacao no repositorio preservou os arquivos rastreados que nao pertencem ao escopo da auditoria GUID.

## 3. Arquivos alterados

- `package.json`;
- `config/app.ts`;
- `scripts/validate-source.mjs`;
- `scripts/validate-guid-references.mjs`;
- `docs/CONTRATO_FISCAL_OFICIAL.md`;
- `docs/GUID_REFERENCE_AUDIT.md`;
- `docs/IMPLEMENTACAO_V1_11_0A8B26_C3.md`;
- `tests/unit/guidReferenceAudit.test.ts`.

## 4. Arquivos preservados

Os arquivos abaixo existem no repositorio atual e foram preservados sem alteracao funcional:

- `features/auth/api/mockAuthClient.ts`;
- `features/shared/api/mockErpStore.ts`;
- `features/shared/api/resourceMockClient.ts`;
- `tests/unit/mockErpStore.test.ts`.

Eles nao foram copiados do ZIP C3, nao foram reescritos e nao foram removidos.

## 5. Correcoes aplicadas

### 5.1 Gate GUID global

Criado o script:

```bash
npm run validate:guid-references
```

O gate bloqueia `InputText` e `InputTextarea` editaveis para campos de referencia conhecidos, como:

- `empresaId`;
- `filialId`;
- `clienteId`;
- `fornecedorId`;
- `produtoId`;
- `pedidoVendaId`;
- `pedidoCompraId`;
- `condicaoPagamentoId`;
- `formaPagamentoId`;
- `notaFiscalId`.

### 5.2 Controller com spread

O gate agora detecta o padrao:

```tsx
<Controller
    name="clienteId"
    render={({ field }) => <InputText {...field} />}
/>
```

Esse caso falha porque um campo de referencia operacional nao deve ser digitado como texto livre.

### 5.3 Excecao controlada do login

Foi mantida uma excecao documentada para:

```txt
features/auth/components/LoginForm.tsx::empresaId
```

Justificativa: no login, `empresaId` representa o codigo autorizado/identificador legado necessario antes da sessao. Nao e uma selecao operacional de empresa carregada por API dentro do ERP autenticado.

### 5.4 Integracao com validate:source

`npm run validate:source` agora executa tambem `scripts/validate-guid-references.mjs`, tornando o gate parte da validacao preventiva do repositorio.

## 6. Teste adicionado

Criado `tests/unit/guidReferenceAudit.test.ts` para garantir que:

- o script `validate:guid-references` existe;
- a documentacao da auditoria existe;
- campos de referencia conhecidos continuam monitorados;
- `correlationId` permanece permitido como identificador operacional;
- uma fixture invalida com `Controller name="clienteId"` e `<InputText {...field} />` faz o gate falhar.

## 7. Versionamento

Atualizado para:

- `package.json`: `1.11.0-a.8.b26.c3`;
- `logosoftVersion`: `1.11.0a8b26.c3`;
- `config/app.ts`: `1.11.0a8b26.c3`;
- contrato fiscal oficial: `1.11.0a8b26.c3`.

## 8. Validacoes esperadas antes de release

Executar no repositorio principal:

```bash
npm run validate:source
npm run validate:guid-references
npm run validate:fiscal:production
npm run typecheck
npm run test:unit
npm run lint
npm run build
git diff --check
git diff --cached --check
```

E2E fiscal, contrato fiscal e E2E backend fiscal continuam recomendados para a etapa de release completa quando o ambiente estiver preparado.

## 9. Resultado

A correcao torna a auditoria GUID obrigatoria sem remover, reescrever ou refatorar arquivos de mock/store fora do escopo.
