# Manual Rapido – Estudio Corpo & Alma (Windows)

Este manual e para voce rodar o projeto mesmo sem ser dev. Ele explica o que cada coisa faz, como instalar, como validar e quais comandos usar no dia a dia.

**O que voce precisa ter instalado (na maquina)**
Git: baixa o codigo do projeto e permite atualizar
Node.js: linguagem que roda o projeto
pnpm: gerenciador de dependencias do projeto
Docker: necessario para Supabase local (banco local)
Supabase CLI: ferramenta para subir o banco local e gerar tipos

**Versoes que estamos usando agora**
Node: 24.13.0
pnpm: 10.29.1
Turbo: 2.8.3
Supabase CLI: 2.75.0
Git: 2.53.0
Docker: 29.2.0

## Como ver a versao de cada coisa

```powershell
node -v
pnpm -v
pnpm supabase --version
git --version
docker --version
```

## NVM (Node por projeto)

O VS Code deste repo ja abre o terminal com o Node correto (NVM ativo). Mesmo assim, se precisar:

```powershell
nvm use 24.13.0
node -v
```

Como saber se o NVM esta ativo:
```powershell
nvm version
nvm current
node -v
where.exe node
```

Obs: o Node global pode continuar instalado. O `nvm use` ajusta o PATH so para a sessao atual.

Se o `nvm` nao aparecer no terminal:
- Feche e abra o VS Code.
- Verifique o PATH do NVM:
```powershell
$env:NVM_HOME = "$env:LOCALAPPDATA\nvm"
$env:NVM_SYMLINK = "C:\nvm4w\nodejs"
$env:Path = "C:\nvm4w\nodejs;$env:LOCALAPPDATA\nvm;$env:Path"
nvm version
```
- Se aparecer um aviso do Windows (UAC) ao rodar `nvm use`, clique em **Sim** para permitir o link simbolico.

## Instalar o que falta (comandos diretos)

Git:
```powershell
winget install --id Git.Git -e
```

Node (com NVM para nao baguncar outros projetos):
```powershell
winget install --id CoreyButler.NVMforWindows -e
nvm install 24.13.0
nvm use 24.13.0
```

pnpm (via Corepack):
```powershell
corepack enable
corepack prepare pnpm@10.29.1 --activate
pnpm -v
```

Se `corepack enable` der erro de permissao:
```powershell
corepack pnpm -v
```
Use sempre `corepack pnpm` no lugar de `pnpm`.

Docker Desktop (se for usar Supabase local):
```powershell
winget install --id Docker.DockerDesktop -e
```

## Instalar dependencias do projeto

```powershell
pnpm install
```

Se o `pnpm` nao existir:
```powershell
corepack pnpm install
```

## Rodar o projeto

```powershell
pnpm dev
```

Se precisar testar build:
```powershell
pnpm build
```

## Comandos rapidos do dia a dia

```powershell
pnpm dev
pnpm lint
pnpm check-types
pnpm build
```

## Conferir instalacao do Next e do Turbo

O Next esta dentro de `apps/web`, entao use:
```powershell
pnpm --filter web exec next --version
```

O Turbo fica no root:
```powershell
pnpm exec turbo --version
```

## Supabase local (dev)

Subir o banco local:
```powershell
pnpm supabase start
```

### Atualizar DB local (comando direto)

```powershell
pnpm supabase start
pnpm supabase migration up
```

Ver URLs e chaves locais:
```powershell
pnpm supabase status
```

Parar o Supabase local:
```powershell
pnpm supabase stop
```

### Aplicar migrations no banco LOCAL (sem resetar)

1) Garanta que o Supabase local esta rodando:
```powershell
pnpm supabase start
```

2) Aplique as migrations pendentes:
```powershell
pnpm supabase migration up
```

Opcional (ver o que seria aplicado):
```powershell
pnpm supabase migration list
```

**Importante**: use sempre `pnpm supabase ...` (o comando `supabase` sozinho nao existe no Windows).

### Env local (obrigatorio)

O app espera o arquivo:
`apps\web\.env.local`

Coloque as chaves do **Supabase local** (saida do `supabase start`/`supabase status`):
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=SEU_ANON_LOCAL
SUPABASE_SERVICE_ROLE_KEY=SEU_SERVICE_ROLE_LOCAL
```

**Importante**:
- nao use chaves de producao no `.env.local`
- se mudar o `.env.local`, reinicie o `pnpm dev`
- nunca commite `.env.local` no Git (ele contem segredos)

## Supabase online (producao)

Para producao, configure as variaveis no **Vercel** (Environment Variables). Nao coloque chaves de producao no repo.

### Atualizar DB online (comando direto)

```powershell
pnpm supabase login
pnpm supabase link --project-ref <seu_project_ref>
pnpm supabase db push
```

### Aplicar migrations no banco ONLINE (sem resetar)

1) Faça login e vincule o projeto (uma vez):
```powershell
pnpm supabase login
pnpm supabase link --project-ref <seu_project_ref>
```

2) Aplique as migrations pendentes no banco remoto:
```powershell
pnpm supabase db push
```

Opcional (ver o que seria aplicado):
```powershell
pnpm supabase db push --dry-run
```

Se precisar informar senha manualmente:
```powershell
pnpm supabase db push --password "SUA_SENHA_DO_BANCO"
```

Se quiser apontar para um DB especifico:
```powershell
pnpm supabase db push --db-url "postgresql://USER:PASSWORD@HOST:5432/postgres"
```

### Conexao no VS Code (PostgreSQL Microsoft)

Use **Session pooler** no Supabase (Connection String). Campos:

Host (Servidor): `aws-1-sa-east-1.pooler.supabase.com`
Porta: `5432`
Usuario: `postgres.<project_ref>` (ex.: `postgres.hxahbawhidqflocotyot`)
Senha: a senha do banco
Banco: `postgres`
SSL: `Obrigatorio`

**Muito importante**:
- o host deve ir no campo **Servidor/Host**
- o campo **Endereco IP do Host (hostaddr)** deve ficar **vazio**
- nao cole a URI inteira nos campos

Se aparecer erro de `Name or service not known`, verifique se o host foi colocado no campo correto.

## SQLTools (opcional)

O repo ja tem a conexao local configurada no `.vscode/settings.json`.
Se quiser usar SQLTools, instale:
- `mtxr.sqltools`
- `mtxr.sqltools-driver-pg`

## PowerShell 7 no VS Code

Para verificar versao do PowerShell:
```powershell
$PSVersionTable.PSVersion
$PSVersionTable.PSEdition
```

Para abrir o PowerShell 7:
```powershell
pwsh
```

O VS Code foi configurado para abrir PowerShell 7 **ja com NVM ativo** neste repo.
Se quiser voltar ao terminal normal, selecione o perfil `PowerShell 7` no VS Code.

## Problemas comuns e solucoes

pnpm nao reconhecido:
- Abra um novo terminal no VS Code
- Ou use `corepack pnpm <comando>`

Node nao aparece depois de `nvm use`:
- Feche e abra o VS Code
- Rode `where.exe node` para confirmar o PATH
- Se `pnpm dev` falhar com `spawn C:\\nvm4w\\nodejs\\node.exe ENOENT`, execute:
```powershell
nvm use 24.13.0
where.exe node
node -v
```
- Se ainda falhar, rode `nvm use 24.13.0` em um PowerShell **como Administrador** (vai pedir UAC), feche e reabra o VS Code e tente novamente.

Supabase CLI avisa falta de binario no Windows:
- Se `pnpm supabase --version` funciona, pode ignorar o warning

Build Tools falhou (erro 1602/1618):
- Reinicie o Windows
- Tente instalar de novo:
```powershell
winget install --id Microsoft.VisualStudio.2022.BuildTools -e
```

Python nao instalou pelo winget:
```powershell
winget install --id Python.Python.3.12 -e
```
