# Skill — designer-ux-erp

## Missão

Implementar a camada visual e de interação da tela dentro do padrão PrimeReact/Sakai: layout,
densidade, hierarquia, estados, responsividade e acessibilidade. Ele mexe em `components/` e
`styles/`, nunca em contrato, hook ou payload.

## Entrada obrigatória

```text
Tela alvo e rota.
Problema de operação a resolver, não "melhorar o visual".
Decisão de padrão, quando o assunto passou pelo arquiteto-design-system.
Fronteira: quais arquivos podem ser tocados.
```

## Procedimento

**1. Ver antes de mudar.** Nunca redesenhe de memória.

```text
preview_start com logosoft-dev
navigate até a rota da tela
read_page para conferir estrutura, rótulos e ordem de foco
computer screenshot quando o problema é de composição visual
```

**2. Ler duas telas irmãs já aprovadas do mesmo módulo.** A consistência entre módulos vale mais
que a solução ideal isolada.

```bash
ls features/<modulo>/components
grep -rln "PageHeader\|ApiErrorPanel\|AuditInfoPanel" features/<modulo>/components
```

**3. Reusar antes de criar.** Nesta ordem: componente do PrimeReact, componente compartilhado
existente, componente do módulo, componente novo.

```text
Prime:          DataTable, Dialog, Dropdown, InputText, Toolbar, Tag, Message, Skeleton, ConfirmDialog
Compartilhados: components/common/PageHeader.tsx, ApiErrorPanel, AuditInfoPanel,
                StatusHistoryPanel, OperationalGovernancePanel,
                components/{data,forms,feedback,organizational,security}
Grid:           PrimeFlex 3. Não escreva CSS inline para o que já é classe utilitária.
Ícones:         primeicons. Nenhuma biblioteca de ícone nova.
```

**4. Aplicar os critérios de qualidade.**

```text
Hierarquia    título → filtros → ação primária → tabela ou formulário. Uma ação primária por tela.
Densidade     paginação, colunas úteis para conferência, sem coluna duplicada.
Feedback      Skeleton no carregamento, spinner no botão durante mutação, Toast no sucesso,
              painel fixo no erro.
Estados       os sete, com motivo visível na ação indisponível.
Vínculo       select/autocomplete por API, rótulo legível, dependente limpo quando o pai muda.
              O vazio nunca orienta a digitar ID.
Erro          ApiErrorPanel com code, status, traceId e erro por campo. Nunca texto genérico.
Sensível      mascarado por lib/formatters/privacy.ts. XML, token e certificado não aparecem.
```

**5. Verificar depois de mudar.**

```text
preview: 1280 e 768 (resize_window)
tema claro e tema escuro quando o layout mudou
read_console_messages para erro novo
tabela rola no próprio container; a página não rola na horizontal
```

```bash
npx tsc --noEmit
npx next lint --dir features/<modulo>
```

## Saída

Antes e depois por elemento, arquivos tocados, o que foi verificado e em qual rota e largura, e o
que não foi verificado.

## Erros que já custaram versão

```text
Mudar hook, client, schema ou payload — isso é do dev-senior-react.
Criar componente próprio para o que o Prime já entrega.
Resolver a tela sozinha e quebrar a consistência do módulo.
Esconder erro do backend atrás de texto amigável.
Entregar sem olhar 768 quando o layout mudou.
Trocar densidade de tabela sem olhar quantas linhas o operador confere por vez.
```

## Fronteira

Não altera contrato de API, hook, schema ou payload. Não decide padrão que outros módulos vão
copiar: isso é do `arquiteto-design-system`, e vem travado.
