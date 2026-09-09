# Skill — Regime de projeto

## Quando abrir uma rodada de projeto

Abrir rodada **antes** de acionar o `arquiteto-frontend` quando a demanda tiver qualquer um destes traços:

```text
Módulo novo ou onda nova.
Tela que muda o fluxo de trabalho do operador, não só o layout.
Contrato do backend ambíguo, ausente ou divergente do que a tela lê hoje.
Decisão que atravessa mais de um módulo (fiscal x financeiro, vendas x estoque).
Padrão de tela novo, template novo, componente compartilhado novo.
Escolha de biblioteca, camada de dados, cache, paginação ou estado global.
Reescrita de algo que já existe e funciona.
```

Não abrir rodada para: correção `.cN` com causa já diagnosticada, ajuste de texto, campo a mais
num formulário existente, bug de render. Isso vai direto para o agente responsável.

**Rodada custa tempo e token.** O critério não é a importância do resultado, e sim quanto
raciocínio de desenho a decisão exige. Trocar constante é importante e não exige rodada.

## Quem participa

| Agente | Defende | Produz |
| --- | --- | --- |
| `inventariante-contrato-tela` | nada — produz o inventário | tela × rota × endpoint × campo × permissão, com destino declarado |
| `arquiteto-operacao-erp` | o operador e o fluxo real do ERP | o que a tela precisa permitir para a operação fechar |
| `arquiteto-plataforma-frontend` | o ano cinco do frontend | o que sobrevive a volume, contrato mutável e time novo |
| `arquiteto-escopo-entrega` | a entrada em produção | o que **não** se constrói, e em que ordem entra o que fica |
| `arquiteto-design-system` | o template e a consistência entre módulos | padrão de tela, componente compartilhado, dívida visual |

## A ordem importa

```text
1. inventariante-contrato-tela  (sozinho, sempre primeiro)
2. os quatro arquitetos          (em paralelo, cada um no seu arquivo)
3. orquestrador arbitra e trava  (docs/arquitetura/DECISOES.md)
```

O inventário é **dependência**, não par. Arquiteto que debate sem a lista de campos e endpoints
na mão argumenta sobre o sistema que ele imagina, não sobre o que existe. O precedente deste
repositório é literal: a v1.11.0a8b49 corrigiu tela do financeiro que lia campo monetário que o
backend não entrega. Nenhum debate de desenho teria pego isso — inventário pega.

## Regras da rodada

1. **Rodada com integrante faltando é rodada incompleta, não rodada barata.** Se um dos quatro
   não for acionado, o orquestrador registra por que, no documento de decisão.
2. **Cada arquiteto escreve um arquivo próprio** em `docs/arquitetura/debate/`. Nunca o mesmo
   arquivo — eles rodam em paralelo e colidiriam.
3. **Não achar discordância é sinal de briefing ruim**, não de decisão fácil. Os quatro têm
   incentivos opostos de propósito. Se todos concordaram, provavelmente não foram colocados
   sobre a mesma decisão.
4. **Discordância inventada é pior que concordância.** Quem concorda diz que concorda e segue.
5. **Nenhum arquiteto decide.** Todos propõem com id (`Dn`) e argumento. Quem trava é o
   orquestrador.

## Quando o design entra

O `arquiteto-design-system` entra sempre que o assunto for **layout, UI, UX ou template** — e não
apenas quando alguém pede "melhorar a tela". Entra também quando:

```text
A decisão cria um padrão de tela que outros módulos vão copiar.
A decisão exige componente compartilhado novo em components/.
A decisão muda densidade, navegação, hierarquia de ação ou estado de tela.
A decisão importa um padrão de fora do PrimeReact/Sakai.
```

Ele debate **desenho de sistema visual**. Quem implementa a camada visual é o `designer-ux-erp`,
que recebe a decisão travada — não participa do debate.

## Troca de regime

Se a rodada concluir que a decisão é menor do que parecia, ela **fecha cedo** e devolve para o
`arquiteto-frontend` com a decisão travada. O caminho inverso também vale: se o
`arquiteto-frontend` esbarrar numa ambiguidade de desenho, ele **para** e escala para rodada de
projeto, em vez de improvisar arquitetura dentro de um plano de versão.
