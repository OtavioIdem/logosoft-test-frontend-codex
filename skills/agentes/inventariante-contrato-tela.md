# Skill — inventariante-contrato-tela

## Missão

Produzir a lista sobre a qual os arquitetos vão discutir: tela, rota, endpoint, campo, tipo,
permissão e estado, com **destino declarado** para cada campo e **divergência apontada** entre o
que a UI lê e o que o backend entrega.

## Entrada obrigatória

```text
Recorte: quais módulos e telas entram no inventário.
Profundidade: só o módulo, ou também os módulos vizinhos que ele aciona.
Acesso ao backend: o repositório ../New project 3 está disponível para leitura?
Caminho do arquivo de saída.
```

Sem acesso ao backend o inventário ainda vale, mas toda coluna "o backend entrega?" sai como
`não verificado`. Isso é resultado legítimo; `sim` sem ter olhado não é.

## Procedimento

**1. Levantar a superfície.** Comece pelas rotas, não pelos componentes.

```bash
ls app/\(main\)/<modulo>
grep -rn "export default" "app/(main)/<modulo>" --include=page.tsx
```

**2. Ligar rota a permissão.**

```bash
grep -n "<modulo>" lib/security/routePermissions.ts
grep -n "<MODULO>_" types/erp.ts features/seguranca/permissoesCatalogo.ts
```

Rota sem entrada em `routePermissions.ts` é achado, não omissão sua.

**3. Extrair os endpoints do client da feature.**

```bash
grep -n "httpClient\.\(get\|post\|put\|patch\|delete\)" features/<modulo>/api/*.ts
grep -n "^const [A-Z_]* = '/api" features/<modulo>/api/*.ts
```

Confira cada rota contra `scripts/backend-contract-map.allowlist.json`. Endpoint fora da
allowlist é divergência de contrato.

**4. Extrair os campos.** Fonte primária são os schemas Zod e os tipos, não o JSX.

```bash
sed -n '1,200p' features/<modulo>/schemas/<modulo>Schemas.ts
sed -n '1,200p' features/<modulo>/types/<modulo>.types.ts
```

**5. Confrontar com o backend.** Para cada campo de resposta, ache o correspondente:

```bash
grep -rn "<NomeDoResponse>" "../New project 3/src" --include=*.cs
```

Campo presente no tipo do frontend e ausente na classe do backend é o achado mais valioso do
inventário. Foi exatamente esse o defeito corrigido na v1.11.0a8b49, no financeiro.

**6. Marcar o destino de cada campo.** Quatro valores, nada além:

```text
exibido            aparece na tela
enviado            vai no payload de mutação
derivado de <x>    calculado a partir de outro campo
sem uso            está no tipo e ninguém consome
```

`sem uso` não é erro seu: é a pergunta que a rodada precisa responder.

**7. Verificar os sete estados por tela.** Procure o componente, não deduza pelo nome.

```bash
grep -n "Skeleton\|isLoading\|ApiErrorPanel\|PermissionGuard\|disabled\|vazio\|empty" features/<modulo>/components/*.tsx
```

Marque `presente`, `ausente` ou `não verificado`.

## Saída

Quatro tabelas — telas e rotas, endpoints, campos, estados — mais a seção **Divergências**, que
é o produto mais valioso do arquivo. Formato completo no prompt do agente. Fecha com o contrato
JSON de `skills/projeto/03_contrato_de_saida.md`.

## Erros que já custaram versão

```text
Amostrar campos "representativos" em vez de listar todos.
Escrever "sim" na coluna do backend sem ter aberto o backend.
Confundir campo do formulário com campo da resposta da API.
Deduzir estado de tela pelo nome do componente.
Ignorar enum fixo no frontend porque "está funcionando".
```

## Fronteira

Não propõe solução, não corta escopo, não sugere componente, não edita código. Achou algo grave,
registra em Divergências e segue. Quem decide é a rodada.
