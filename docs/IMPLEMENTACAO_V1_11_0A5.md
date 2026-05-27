# Implementacao v1.11.0a5 - Busca de telas na sidebar

Versao anterior aplicada: `v1.11.0a4`.

## Causa

Com o crescimento do ERP, a navegacao lateral tende a concentrar mais modulos e telas. Esta melhoria adiciona uma busca local na sidebar para reduzir o tempo de localizacao das rotinas sem alterar a estrutura principal do layout.

## Alteracoes realizadas

- `layout/AppMenu.tsx`
  - Adicionado campo `Buscar tela ou modulo` acima da lista do menu.
  - Criado filtro local por nome de modulo, nome de tela e rota.
  - A busca e aplicada depois da filtragem por permissao, preservando o controle de acesso.
  - Normalizacao de acentos para permitir buscas como `saidas`, `auditoria`, `condicoes` e `administracao`.
  - Estado vazio para quando nenhum item visivel corresponde ao termo digitado.

- `styles/layout/_menu.scss`
  - Adicionado estilo compacto para o campo de busca dentro da sidebar.
  - Mantida a estrutura visual do menu, sem alterar medidas gerais do layout.

## Regras preservadas

- Nenhum endpoint foi criado ou alterado.
- Nenhum payload foi alterado.
- Nenhum mock foi introduzido.
- Nenhum `console.*` foi adicionado.
- A busca nao revela modulos ou telas sem permissao do usuario.

## Validacao

Executar:

```bash
npm run validate:source
npm run build
```
