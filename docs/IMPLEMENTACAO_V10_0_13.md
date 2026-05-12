# logosoft frontend v10.0.13

## Objetivo

Registrar uma versão de documentação, rastreabilidade e hardening de build Docker a partir da v10.0.12.

## Problema tratado

Durante o build Docker da v10.0.12, o comando abaixo falhou por timeout de rede no registry npm:

```dockerfile
RUN npm install --no-audit --no-fund
```

Erro reportado:

```txt
npm error code ETIMEDOUT
npm error network request to https://registry.npmjs.org/@hookform%2fresolvers failed
```

O erro é de conectividade durante o download de dependências. Porém havia um ponto de melhoria no Dockerfile: o stage `deps` não copiava `.npmrc` antes do `npm install`, então as configurações de retry e timeout do projeto não eram aplicadas na instalação dentro do container.

## Entregas

- `package.json` atualizado para `10.0.13`.
- `config/app.ts` atualizado para `10.0.13`.
- `layout/AppFooter.tsx` corrigido para exibir `v` antes da versão.
- `README.md` reescrito com:
  - regras permanentes;
  - diagnóstico do erro Docker;
  - scripts;
  - rotas;
  - módulos;
  - componentes;
  - camada HTTP;
  - testes existentes;
  - histórico detalhado por versão;
  - pendências conhecidas.
- `CHANGELOG.md` reorganizado com entrada da v10.0.13.
- `.npmrc` reforçado com timeouts maiores.
- `Dockerfile` corrigido para copiar `.npmrc` antes do install.
- `Dockerfile` endurecido com retry explícito, timeout e cache npm via BuildKit.

## Alterações técnicas

### Dockerfile

Antes:

```dockerfile
COPY package*.json ./
RUN npm install --no-audit --no-fund
```

Depois:

```dockerfile
COPY package*.json .npmrc ./
RUN --mount=type=cache,target=/root/.npm \
    npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-factor 2 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 180000 && \
    npm config set fetch-timeout 300000 && \
    for attempt in 1 2 3; do \
        npm install --no-audit --no-fund && break; \
        if [ "$attempt" = "3" ]; then exit 1; fi; \
        sleep 15; \
    done
```

## Regras mantidas

- Não usar `npm ci`.
- Node fixado em `node:24-alpine`.
- Axios permanece como camada HTTP.
- Mock permanece desligado por padrão.
- `NEXT_PUBLIC_API_URL` permanece `http://localhost:8080`.
- Sem `console.*` em código de aplicação.
- Não expor GUID cru ao usuário quando houver entidade selecionável.
- Backend permanece fonte final das regras críticas.

## Validação executada nesta geração

- `npm run validate:source`.

## Validação não executada nesta geração

Não foi executado `npm install`, `npm run validate`, `npm run build` ou `docker build` em Node 24 dentro deste ambiente, porque a instalação de dependências exige acesso confiável ao registry npm e o ambiente local disponível para esta geração não representa o seu Docker Desktop.

## Próximos passos recomendados

1. Rodar build Docker novamente.
2. Caso continue `ETIMEDOUT`, validar proxy/DNS/firewall/VPN/Docker Desktop.
3. Rodar em ambiente Node 24/npm 11:
   - `npm install`;
   - `npm run validate`;
   - `npm run build`.
4. Continuar a v10.0.14 com refinamento funcional de dashboard/auditoria ou paginação server-side, conforme prioridade.
