# Motor de Tributação — implementação no frontend

Implementa o contrato de `docs/fiscal/contrato-motor-tributacao-frontend.md` (fonte de verdade no repositório
do backend, Módulo 05 / v1.14.0). Cobre as três superfícies REST do motor: simulação, cadastro de regras e
exceções/benefícios.

## O que foi entregue

| Entrega | Rota | Componente | Permissão |
| --- | --- | --- | --- |
| Simulador de tributação | `/fiscal/simulador` | `features/tributacao/components/SimuladorTributacaoPage.tsx` | `FISCAL_REGRAS_CONSULTAR` |
| Cadastro de regras fiscais | `/fiscal/regras` | `RegrasFiscaisPage.tsx` + `RegraFiscalFormDialog.tsx` | `_CONSULTAR` / `_GERENCIAR` |
| Exceções e benefícios | `/fiscal/excecoes` | `ExcecoesFiscaisPage.tsx variante="geral"` | `_CONSULTAR` / `_GERENCIAR` |
| Exceções por NCM | `/fiscal/excecoes-ncm` | `ExcecoesFiscaisPage.tsx variante="ncm"` | `_CONSULTAR` / `_GERENCIAR` |

Estrutura em `features/tributacao/` (`api/`, `hooks/`, `schemas/`, `types/`, `components/`), separada de
`features/fiscal/` porque tributação é domínio próprio, consumido também por faturamento, entrada e PDV.

## Endpoints consumidos

| Verbo | Rota |
| --- | --- |
| `POST` | `/api/fiscal/tributacao/simular` |
| `GET` `POST` `PUT` | `/api/fiscal/regras`, `/api/fiscal/regras/{id}`, `/api/fiscal/regras/{id}/inativar` |
| `GET` `POST` `PUT` | `/api/fiscal/excecoes`, `/api/fiscal/excecoes/{id}`, `/api/fiscal/excecoes/{id}/inativar` |
| `GET` `POST` `PUT` | `/api/fiscal/excecoes-ncm`, `/api/fiscal/excecoes-ncm/{id}`, `/api/fiscal/excecoes-ncm/{id}/inativar` |
| `GET` | `/api/fiscal/cadastros/ncm`, `/api/fiscal/cadastros/cfop` (selects de NCM/CFOP) |

As duas últimas exigem `FISCAL_CADASTROS_CONSULTAR`, que é de outro módulo: sem a permissão a query nem sai e
o select mostra a indisponibilidade, em vez de empurrar um 403 para o usuário.

## As decisões que o contrato obriga, e onde elas moram no código

**Bloco `null` ≠ zero.** É a regra mais cara do domínio. `ResultadoTributacaoPanel.tsx` nunca renderiza um
bloco nulo: ele some da lista de tributos e reaparece na faixa "não aplicável a este item", com o motivo.
Valor zero **com** bloco preenchido continua sendo exibido, porque aí o zero é a informação (isenção,
alíquota zero, retenção dispensada). Nas retenções o estado (`NaoAplicavel`/`Dispensado`/`Retido`) aparece
como tag ao lado do número. Coberto por `tests/components/ResultadoTributacaoPanel.test.tsx`.

**Nada de rateio no frontend.** Frete, seguro, outras despesas e desconto são enviados como totais do
documento; a composição por item vem em `valoresUtilizados` e é só exibida. Ratear de novo produziria
diferença de centavo — o backend joga o resíduo no item de maior valor justamente para `Σ itens == total`.

**`valorProduto` é informado, não derivado.** O campo é próprio na grade de itens. O botão "Qtd × unit." é
conveniência explícita, nunca cálculo automático.

**`null` da chave de regra é curinga.** Os selects usam o rótulo `(qualquer)`, e o schema preserva `null`.
Cuidado não óbvio, coberto por teste: `RegimeTributario.SimplesNacional` vale **zero**, e `z.coerce.number()`
converte `null` em `0` — por isso as uniões anuláveis dos schemas colocam `z.null()` **primeiro**. Sem isso, o
curinga viraria silenciosamente "Simples Nacional".

**FCP anulável é semântico.** `null` = "não informado, usa o percentual geral da UF"; `0` = "zero deliberado,
FCP não devido". Os campos permitem ficar vazios e o vazio nunca é convertido para zero.

**`PUT` é substituição total.** `RegraFiscalFormDialog` remonta o payload inteiro a partir do estado do
formulário — nunca só o que mudou —, porque bloco ausente no corpo é bloco removido no backend.

**Erros 422 tratados por `codigo`, nunca por texto.** O catálogo está em
`features/tributacao/components/tributacaoErrors.ts`, com os oito códigos estáveis classificados em
`cadastro`, `carga` e `preenchimento`. Os três de **carga de tabela pendente** (`FCP`,
`ALIQUOTA_INTERESTADUAL`, `TETO_INSS`) ganham severidade de mensagem de sistema, porque não são erro do
usuário. O controller serializa a propriedade como `Codigo` (PascalCase, objeto anônimo), então
`mapTributacaoApiError` normaliza para `error.code` antes do resto do app ver.

**Sem total parcial.** Quando a simulação falha, a tela não mostra soma nenhuma e diz por quê: somar apenas
os itens que deram certo esconderia tributo faltando até a fiscalização.

**Município é obrigatório quando há ISS.** `tipoItem` decide sozinho o ramo mercadoria × serviço, e item de
serviço sempre apura ISS — que o motor resolve pelo município de incidência. O `superRefine` de
`simularTributacaoSchema` exige `codigoMunicipioOrigem` e `codigoMunicipioDestino` assim que qualquer item é
`TipoItemSped.Servicos`, e o simulador marca os dois campos como obrigatórios nesse caso. Sem isso o usuário
gastava o round-trip para receber um erro do backend sem campo apontado.

**Bloco nulo vem com motivo.** A faixa "não aplicável a este item" não lista só o nome do tributo: diz o
porquê. O motivo do `icmsSt` sai do próprio resultado (`comportaSubstituicaoTributaria`,
`retidoAnteriormente`, agora também exibidos no bloco de ICMS); os demais são as equivalências que o contrato
fixa — item de serviço não apura ICMS/IPI/DIFAL, item de mercadoria não apura ISS/retenções, `ipi` nulo é
emitente não contribuinte. Nada é inferido além do que o contrato afirma.

**Retenção dispensada mostra o limiar.** `irrf.baseMinima`, `irrf.valorMinimoRecolhimento` e
`pcc.minimoDispensa` aparecem no painel, e o valor apurado antes do mínimo é exibido quando difere do valor
retido. A tag "Dispensado" sozinha não explicava o zero.

**400 é escopo organizacional.** O contrato reserva o 400 para empresa/filial fora do contexto do usuário.
`describeTributacaoError` classifica esse caso como `contexto` e devolve orientação própria, em vez do genérico
"não foi possível concluir a operação". ModelState inválido também responde 400, mas traz erro por campo — aí
a classificação não se aplica, para não mandar o usuário trocar de empresa por um problema que não é de
empresa.

**Enums vêm como número.** `tributacao.types.ts` declara todos os valores explicitamente, sem depender da
ordem de declaração do backend. `RegimeTributario` é o único sem valores explícitos lá — serializa 0/1/2.

## Pendências do backend que a tela vai encontrar

Documentadas no contrato e reproduzidas aqui porque afetam o suporte:

- Teto do INSS sem carga das portarias 2025/2026 — toda retenção de INSS responde `422
  FISCAL_TRIBUTACAO_TETO_INSS_NAO_DEFINIDO`. É falha barulhenta desejada, não bug do frontend.
- Alíquotas interestaduais e FCP com seed mínimo — pares de UF fora do seed respondem 422.
- Sem golden test contra notas reais do legado — o simulador é justamente a ferramenta dessa conferência.

## Validações

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npx vitest run tests/unit/tributacaoPayload.test.ts tests/unit/tributacaoErrors.test.ts tests/components/ResultadoTributacaoPanel.test.tsx tests/unit/routePermissions.test.ts
```
