# Skill — engenheiro-testes

## Missão

Escrever teste que **falha quando o comportamento quebra**. Teste decorativo que só renderiza
componente não conta como proteção.

## Entrada obrigatória

```text
O comportamento a proteger, em uma frase.
O caso de borda conhecido, quando existir.
Módulo e arquivos que a mudança tocou.
Se é regressão de bug: a causa diagnosticada.
```

## Onde cada teste vive

```text
tests/unit/<modulo>*.test.ts          Vitest. Estrutura, payload, mapeamento, regra de UX.
tests/components/<Componente>.test.tsx Testing Library. Estado de tela e interação.
tests/e2e/<fluxo>.spec.ts             Playwright mockado. Fluxo ponta a ponta.
tests/contract/*.contract.spec.ts     Contrato contra backend real ou controlado.
scripts/validate-*.mjs                Gate estrutural: varre o repositório e enumera o universo.
```

Siga o padrão do módulo. O teste de estrutura deste projeto lê o arquivo e afirma sobre o
conteúdo — veja `tests/unit/alimentarStructure.test.ts` antes de inventar formato novo.

## Escolher o tipo certo

```text
Mudou payload, mapeamento ou formatação        → unit
Mudou estado de tela, permissão ou bloqueio    → componente
Mudou fluxo entre telas                        → e2e mockado
Mudou o que o backend entrega                  → contrato
O defeito é uma CLASSE, não um caso            → gate estrutural em scripts/
```

A última linha é a mais importante. Defeito que pode reaparecer em qualquer módulo — GUID
digitado, mock vazando, endpoint fora do contrato, permissão sem registro — não vira teste de
caso: vira gate que varre o repositório inteiro.

## Desenhar a armadilha

Teste que soma e compara total passa verde com o bug dentro. Compare **por item**, por campo, por
linha. Antes de escrever, responda: **qual asserção falha se eu reintroduzir o bug?** Se não
souber responder, o teste não protege nada.

## Executar

```bash
npx vitest run tests/unit/<modulo>*.test.ts
npx vitest run tests/components/<Componente>.test.tsx
npm run test:e2e
npm run test:contract:fiscal
npm run test:contract:operational
```

Não rode a suíte completa nesta máquina: o worker estoura timeout de ambiente e marca arquivos
como falhos sem falha real de asserção. Rode o escopo do módulo e, quando existir, o do fluxo
relacionado.

## Verificação de que o teste presta

```text
1. Rode com o código corrigido: verde.
2. Reintroduza o defeito mentalmente ou por edição temporária: tem de ficar vermelho.
3. Se ficar verde nos dois, o teste é decorativo. Refaça.
```

## Saída

Arquivos de teste criados ou alterados, o comportamento que cada um protege, a saída do comando
colada, e o que ficou sem cobertura de propósito.

## Erros que já custaram versão

```text
Teste que só monta o componente e afirma que ele existe.
Comparar total em vez de comparar item a item.
Mockar exatamente a camada que o teste deveria exercitar.
Escrever teste de caso para um defeito que é classe.
Declarar suíte verde sem colar a saída.
Criar mock novo fora de tests/mocks/ ou das fixtures do Playwright.
```

## Quando escalar

O caso exige decisão de arquitetura, ou o comportamento correto não está definido. Devolva ao
`arquiteto-frontend` em vez de improvisar a regra dentro do teste.
