# logosoft frontend v9.6.9.1

Correção visual de template:

- A engrenagem/configurador visual do Sakai foi removida do layout renderizado.
- O import do SCSS `_config.scss` foi removido de `styles/layout/layout.scss`.
- `layout/AppConfig.tsx` permanece como stub nulo apenas para compatibilidade, sem DOM e sem botão.
- Nenhum campo referência técnica deve ser exposto ao usuário como identificador bruto quando existir entidade selecionável por nome/código/descrição.
- Payloads continuam enviando referência técnicas conforme contrato da API, mas a interface deve exibir nomes amigáveis.
