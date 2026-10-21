# Solicitação de correção — filtro de Séries Fiscais

## Regra de responsabilidade

Este workspace é o frontend. Quando uma correção necessária estiver em outro
repositório ou serviço, em especial no backend, este projeto não deve receber
alterações de implementação em nome daquele componente.

Nessa situação, a atuação autorizada é:

1. registrar o sintoma e as evidências disponíveis;
2. identificar o contrato/endereço chamado pelo frontend;
3. documentar a causa técnica encontrada, quando confirmada;
4. abrir ou entregar uma solicitação objetiva para a equipe responsável pelo
   componente externo;
5. validar a integração no frontend somente depois que a correção externa for
   disponibilizada.

Não é autorizada alteração de código, build, deploy ou reinício do backend a
partir desta solicitação de frontend, salvo autorização explícita posterior do
responsável.

## Incidente

**Tela:** Séries Fiscais

**Comportamento observado:** o filtro funciona quando selecionado como
"Todas". Ao selecionar "Ativas" ou "Inativas", a tela apresenta:

> Código: Api.UnexpectedError • HTTP 500 • Trace: 0HNPERKUQKC8E:0000002C
>
> Ocorreu um erro inesperado. Tente novamente ou acione o suporte.

## Evidência técnica disponível

O frontend consulta a listagem de séries fiscais com o filtro de situação. A
falha é retornada pelo serviço como HTTP 500, portanto não é um erro de
renderização ou de filtragem local no frontend.

Na análise do código do backend, a filtragem de ativo/inativo foi associada à
propriedade `IsActive` da entidade de série fiscal. A consulta persistida usa o
campo de status da entidade, e o erro indica que essa propriedade não está
disponível no mapeamento consultado. Esta conclusão deve ser confirmada pela
equipe do backend com o log correspondente ao trace informado.

## Solicitação para o backend

Corrigir a consulta de séries fiscais para que o filtro de situação use a
propriedade persistida e mapeada que representa o status da série (por exemplo,
o enum/campo `Status`), sem consultar uma propriedade não mapeada.

A correção deve assegurar os três cenários:

| Filtro | Resultado esperado |
| --- | --- |
| Todas | Retornar séries sem restringir por situação |
| Ativas | Retornar somente séries ativas |
| Inativas | Retornar somente séries inativas |

## Critérios de aceite

- A chamada da listagem não retorna HTTP 500 com os filtros Ativas e Inativas.
- O resultado de cada filtro é compatível com o status persistido.
- Há teste automatizado do repositório/caso de uso cobrindo os três filtros.
- O frontend é validado integrado ao backend corrigido, sem alteração de
  contrato necessária.

## Fora do escopo desta solicitação

Não há alteração de código frontend requerida para corrigir este HTTP 500.
Qualquer melhoria de mensagem de erro no frontend deve ser tratada como demanda
separada, pois não elimina a falha do serviço.
