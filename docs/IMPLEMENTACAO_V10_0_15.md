# Implementação v10.0.15 — Revisão final pré-Fiscal

## Objetivo

Fechar o último pacote do frontend antes do início do bloco Fiscal/Nota Fiscal, reforçando segurança, permissões, LGPD visual, documentação e validações anti-regressão sem alterar o contrato da API.

## Escopo implementado

### Permissões por rota

Arquivos criados/alterados:

- `components/security/RoutePermissionGate.tsx`
- `lib/security/routePermissions.ts`
- `app/(main)/layout.tsx`

A aplicação já protegia menu, botões e ações por permissão. A v10.0.15 adiciona uma camada explícita de proteção de rota, impedindo que uma URL interna seja renderizada quando o usuário não possui permissão mínima para o módulo.

As rotas são avaliadas por regex em uma matriz centralizada, cobrindo:

- Segurança;
- Administração;
- Pessoas;
- Clientes;
- Fornecedores;
- Produtos/Catálogo;
- Estoque;
- Vendas;
- Financeiro;
- Compras;
- Auditoria.

O backend continua sendo a fonte final de autorização. Esta proteção melhora UX e reduz exposição visual indevida no frontend.

### LGPD e minimização visual

Arquivos criados/alterados:

- `lib/formatters/privacy.ts`
- `features/pessoas/components/PessoasPage.tsx`
- `features/clientes/components/ClienteFormDialog.tsx`
- `features/fornecedores/components/FornecedorFormDialog.tsx`

Foram centralizados helpers de privacidade:

- `maskDocument`;
- `maskEmail`;
- `maskPhone`;
- `buildPrivacySafeEntityLabel`.

A listagem de Pessoas continua mascarando documentos. Os selects de Pessoa usados nos formulários de Clientes e Fornecedores agora exibem documento minimizado, evitando CPF/CNPJ cru no label enquanto preservam seleção amigável por nome.

### Validação anti-regressão

Arquivo alterado:

- `scripts/validate-source.mjs`

A validação agora bloqueia regressões em:

- ausência do `RoutePermissionGate` no layout interno;
- ausência da matriz de permissões por rota;
- ausência dos formatadores LGPD;
- retorno de documento cru nos selects de Cliente/Fornecedor;
- ausência dos testes/documentação da v10.0.15.

### Testes adicionados

Arquivos criados:

- `tests/unit/routePermissions.test.ts`
- `tests/unit/privacyFormatter.test.ts`

Cobertura adicionada:

- rota de Vendas exige permissões do módulo;
- Auditoria exige `AUDITORIA_CONSULTAR`;
- Dashboard permanece rota autenticada sem permissão granular;
- mascaramento de CNPJ alfanumérico;
- label de entidade sem documento cru;
- mascaramento de e-mail e telefone.

## Regras preservadas

- Sem mock como padrão.
- Sem `console.*` em código de aplicação.
- Dockerfile continua sem `npm ci`.
- Node continua fixado em `node:24-alpine`.
- `NEXT_PUBLIC_API_URL=http://localhost:8080` permanece como padrão.
- Payload continua enviando GUID quando o backend exige.
- Usuário continua vendo nome, código, número ou descrição quando houver entidade selecionável.
- Toda ação crítica continua exigindo motivo quando aplicável.
- Nenhum endpoint novo foi inventado.

## Validação executada

```bash
npm run validate:source
```

Resultado: validação de fonte concluída sem regressões conhecidas.

## Validações ainda recomendadas no ambiente do projeto

```bash
npm install
npm run validate
npm run build
npm run test:e2e:critical
docker build -t logosoft-frontend:v10.0.15 .
```

## Próximo bloco

A próxima versão planejada é `v11.0.0`, iniciando Fiscal/Nota Fiscal.

Esse bloco não deve começar sem:

- contrato fiscal/API definido;
- validação de documento fiscal alvo: NF-e, NFC-e, NFS-e ou outro;
- UF e município quando aplicável;
- regime tributário;
- ambiente de homologação/produção;
- estratégia de certificado digital;
- validação fiscal/contador ou documentação oficial aplicável.
