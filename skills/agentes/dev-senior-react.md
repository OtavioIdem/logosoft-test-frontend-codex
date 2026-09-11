# Skill — dev-senior-react

## Missão

Implementar o plano da versão em código de produção: tipos, schemas, client, hooks, componentes,
rota, permissão e menu — dentro do recorte, sem tocar no que está fora dele.

## Entrada obrigatória

```text
Plano da versão, com arquivo alvo por passo.
Recorte e fronteira: o que pode e o que não pode ser tocado.
Contrato do endpoint: método, rota, request e response.
Permissão exigida e onde ela é registrada.
```

Plano sem arquivo alvo ou contrato sem fonte: **devolva**. Implementar sobre suposição é o que
gera a corretiva `.cN`.

## Ordem de implementação

Este projeto tem uma ordem, e ela evita retrabalho:

```text
1. types/<modulo>.types.ts          request, response, form values
2. schemas/<modulo>Schemas.ts       Zod, um schema por operação
3. api/<modulo>Api.ts               httpClient + parse + sanitize + mapApiError
4. hooks/use<Modulo>*.ts            queryKey exportada, useQuery/useMutation, invalidação
5. components/                      tela, formulário, diálogo, painéis
6. app/(main)/<modulo>/**/page.tsx  rota fina, delega para o componente
7. lib/security/routePermissions.ts permissão da rota
8. types/erp.ts + permissoesCatalogo.ts  código de permissão
9. layout/AppMenu.tsx               entrada de menu
```

## Idioma da camada de dados

O client segue o padrão já estabelecido em `features/financeiro/api/financeiroApi.ts`:

```text
import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
```

Regras:

- Payload de mutação passa por `sanitizePayload`; query string passa por `cleanQueryParams`.
- Toda resposta é validada pelo schema Zod da operação, não confiada.
- Erro sai por `mapApiError`, preservando `code`, `status`, `traceId` e erros por campo.
- Nunca use `rawHttpClient` no caminho produtivo de feature: ele existe para autenticação.

O hook segue `features/financeiro/hooks/useFinanceiroResources.ts`:

```text
export const <recurso>QueryKey = (escopo?: string | null) =>
    ['<modulo>', '<recurso>', escopo ?? null] as const;
```

Regras:

- `queryKey` é **exportada** e carrega o escopo (`empresaId`, `filialId`, filtro).
- `enabled: Boolean(empresaId)` quando a consulta depende de escopo.
- Toda mutação invalida as chaves afetadas. Chave não invalidada é dado velho na tela.

## Regras que não se negociam

```text
Regra crítica (fiscal, financeira, estoque, permissão) mora no backend.
O frontend valida só para UX e reflete workflow e bloqueio retornados pela API.
Nenhum mock no caminho produtivo; mock vive em tests/mocks/ ou fixture Playwright.
Vínculo de entidade é select/autocomplete por endpoint real, nunca GUID digitado.
Os sete estados de tela são piso: loading, vazio, erro recuperável, erro bloqueante,
sucesso, permissão negada, ação indisponível com motivo visível.
Nada sensível em tela, log ou teste.
Não altere version/logosoftVersion salvo quando a entrega for de versão.
```

## Verificação antes de entregar

```bash
npx tsc --noEmit
npx next lint --dir features/<modulo>
npx vitest run tests/unit/<modulo>*.test.ts
npm run validate:source
```

Se a mudança toca vínculo de entidade, endpoint novo ou permissão nova, some:

```bash
npm run validate:guid-references
npm run validate:backend-contract-map
npm run validate:backend-permissions
```

Não rode a suíte completa: nesta máquina ela estoura timeout de ambiente e produz falha que não
é falha.

Se a tela é observável, suba o preview (`logosoft-dev`), navegue até a rota e confira o estado
real. Entregue o que verificou e em qual rota.

## Erros que já custaram versão

```text
Ler campo que o backend não entrega — foi o defeito da v1.11.0a8b49, no financeiro.
queryKey sem escopo, ou não exportada.
Mutação sem invalidação.
Enum fixo no frontend sem enum correspondente no backend.
Fallback silencioso quando a API falha.
Reescrever arquivo vizinho "de passagem".
Declarar validado sem colar a saída do comando.
```

## Quando parar e escalar

Contrato diverge do plano; permissão não existe no catálogo; cumprir o passo exigiria tocar
arquivo fora da fronteira; o gate falha por motivo fora do recorte.
