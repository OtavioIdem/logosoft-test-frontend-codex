# Posição de design — centralização de cadastros

Agente: `arquiteto-design-system`. Nó: `projeto`. Assunto: `central-cadastros`.

## Diagnóstico visual

O menu atual fragmenta 34 cadastros/configurações por onze grupos. O operador não consegue ler a
ordem de implantação da empresa sem conhecer previamente o módulo técnico. A raiz visual
`Cadastros` já existe e `AppMenuitem.tsx` aceita `items` recursivos; portanto, a solução de menor
impacto é **uma única raiz Cadastros no menu lateral**, com categorias internas ordenadas pela
cadeia de implantação. Não é necessário criar uma segunda tela, uma rota `/cadastros` ou carregar
34 telas na mesma página.

Evidência: `layout/AppMenu.tsx:72-82` já agrupa oito itens; `layout/AppMenuitem.tsx:43-55`
renderiza níveis filhos; o inventário da rodada enumera as 34 superfícies em
`21-inventario-central-cadastros.md` §2.

## Padrão proposto

```text
Cadastros
  1. Estrutura organizacional
     Empresas → Filiais → Setores → Cargos → Centros de custo
  2. Pessoas e parceiros
     Classificações → Pessoas → Clientes → Fornecedores → Colaboradores
  3. Catálogo e estoque
     Unidades → Marcas → Categorias → Produtos → Locais de estoque
  4. Comercial e financeiro
     Tabelas de preço → Formas de pagamento → Condições de pagamento
  5. Fiscal
     Séries fiscais → Naturezas de operação → Regras → Exceções → Exceções por NCM
  6. Operação especializada
     Veículos → Motoristas → Jornadas → Benefícios → Fichas técnicas
  7. Contábil e patrimônio
     Plano de contas → Períodos → Regras de contabilização → Bens
  8. Segurança e acessos
     Usuários → Grupos de acesso
```

A numeração é textual e explica dependência de cadastro; não cria uma obrigação de concluir todas
as etapas nem bloqueia uso de uma tela. As rotas, nomes dos recursos e ícones existentes são
preservados. Itens de processo (pedidos, notas, ponto, lançamentos, boletos, ordens, viagens,
inventários, depreciação etc.) continuam nos módulos operacionais.

## Estados e acessibilidade

A mudança é de navegação; não cria carregamento, vazios ou erros próprios. Cada página filha
mantém seus sete estados e seus guards atuais. A categoria interna só aparece quando possuir ao
menos um filho permitido; cada filho mantém sua própria regra de permissão. O rótulo da categoria
não deve ser um link vazio: é um expansor acessível, como já implementado por `AppMenuitem`.

Em largura reduzida, a hierarquia continua colapsável no menu existente; não será convertido para
uma linha horizontal de abas, que ficaria ilegível para 34 destinos.

## Componente compartilhado e dívida

Não proponho componente novo. O terceiro consumidor já é o próprio menu: `AppMenuitem` é o padrão
compartilhado que fornece expansão/colapso. Criar uma `CadastrosHubPage` duplicaria navegação,
forçaria o carregamento ou a adaptação de páginas com `PageHeader` e produziria duas fontes de
verdade para os mesmos destinos.

O custo visual aceito é um segundo nível interno no menu. Ele é menor do que uma lista plana de 34
itens e é reversível: categorias podem ser reorganizadas sem alterar rota, dados ou contratos.

## O que eu abro mão

Não transformo telas mistas (Colaboradores, Bens, Períodos, Veículos e Benefícios) em páginas
puramente cadastrais. Elas entram pelo ponto de entrada do cadastro, mas mantêm as ações
operacionais e os avisos que já possuem. Separá-las exigiria redesenho de regra operacional e não
é requisito de centralização.

Também não incluo o placeholder bancário: ele não possui listagem suportada pelo contrato atual,
conforme DIV-4 do inventário.

```json
{
  "agent": "arquiteto-design-system",
  "node": "projeto",
  "assunto": "central-cadastros",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/21-design-central-cadastros.md",
  "decisoesPropostas": [
    {
      "id": "D-CAD-UX-1",
      "titulo": "Usar uma unica raiz Cadastros com categorias aninhadas ordenadas pela cadeia de implantacao",
      "reversivel": true,
      "gatilho": "nenhum; reorganizacao visual sem contrato novo"
    },
    {
      "id": "D-CAD-UX-2",
      "titulo": "Preservar rotas e paginas filhas; nao criar /cadastros nem carregar telas em abas",
      "reversivel": true,
      "gatilho": "necessidade comprovada de painel cruzado entre recursos"
    }
  ],
  "discordancias": [],
  "pendencias": [
    {
      "tipo": "backend",
      "pergunta": "Cadastro bancario continua sem GETs contratados; nao pode ser anunciado no menu central como fluxo utilizavel.",
      "decide": "quando Banco, Conta, Convenio e Carteira podem entrar na categoria Comercial e financeiro"
    }
  ],
  "riscos": [
    "Menu com categorias aninhadas requer que o gate de permissao valide a cadeia completa, e nao somente um pai imediato.",
    "Categorias com muitos itens precisam de verificacao manual em viewport reduzido apos a implementacao."
  ]
}
```
