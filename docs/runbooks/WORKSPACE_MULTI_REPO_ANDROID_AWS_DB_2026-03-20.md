# Workspace Multi-Repo + AWS DB (Android/Web)

Status: active  
Ultima revisao: 2026-03-23

## Objetivo

Documentar como operar os dois repositorios no mesmo VS Code, sem conflito de
extensao, com acesso seguro ao banco AWS Aurora e com papeis claros entre VS
Code e Android Studio.

## Repositorios e papeis

1. `estudio-corpo-alma-humanizado`:
   - produto web atual (Next.js, Supabase, Vercel, integracoes ativas).
2. `estudio-platform`:
   - novo app Android nativo + backend AWS + Terraform.

## Workspace oficial (dois repos no mesmo VS Code)

Arquivo canonico:
`C:\Users\renat\Projetos_Dev\estudio-mobile-web.code-workspace`

Regras aplicadas:

1. ESLint separado por repo:
   - `estudio-corpo-alma-humanizado/apps/web`
   - `estudio-platform/backend`
2. Deno ativo somente no web:
   - ativo em `estudio-corpo-alma-humanizado/supabase/functions`
   - desativado para `estudio-platform`
3. Terminal padrao com Node via NVM (`24.13.0`).

## Plano unificado entre os dois repos

Para evitar drift do plano de reescrita, os dois arquivos abaixo foram
configurados como hardlink entre os repos:

1. `docs/plans/PLANO_REESCRITA_REPO_ANDROID_NATIVO_2026-03-20.md`
2. `docs/plans/ANEXO_PADRONIZACAO_HIGIENE_ERROS_LOADING_REESCRITA_2026-03-20.md`

Resultado pratico:

1. editou em um repo, reflete no outro automaticamente;
2. apos `checkout/merge/rebase`, o hook local reaplica o hardlink para manter
   o espelhamento.

Atualizacao operacional (2026-03-23):

1. baseline da reescrita foi auditado de novo no repo web.
2. sempre que atualizar o plano principal/anexo, validar no repo irmao:
   - conteudo refletido do hardlink
   - data base igual nos dois arquivos
   - status dos modulos (agenda/novo/atendimento/clientes/catalogo/configuracoes)
     consistente entre repos.

Script usado neste repo:

```powershell
.\scripts\codex\sync-shared-plan-links.ps1
```

## Banco local (Docker) e reescrita mobile

Nao e obrigatorio manter Docker/Supabase local ligado o tempo todo para a
reescrita Android/AWS.

Use Docker/Supabase local somente quando houver trabalho direto no repo web:

1. migrations SQL do Supabase;
2. edge functions do Supabase;
3. testes que dependam de runtime local do Supabase.

Para trabalho focado no app Android + backend AWS, pode deixar Docker
desligado para reduzir consumo de CPU/RAM.

## Papel real do Android Studio

Mesmo com VS Code centralizando o dia a dia, Android Studio continua essencial
para:

1. emulador Android;
2. Android SDK Manager;
3. inspeção de layout e performance;
4. assinaturas/release do app;
5. depuracao Android nativa mais profunda.

Resumo pratico:

1. VS Code: codificacao, terminal, Git, Terraform, backend.
2. Android Studio: emulador, tooling Android e release.

## HCP Terraform (botao de login da extensao)

Contexto atual: o projeto usa Terraform CLI com backend remoto em AWS
(`S3 + DynamoDB lock`), nao usa Terraform Cloud/HCP Terraform para executar
plan/apply.

Conclusao:

1. esse login da extensao HCP Terraform e opcional;
2. pode ignorar sem impactar este projeto;
3. se quiser reduzir ruido, desative a extensao HCP Terraform e mantenha apenas
   a extensao `HashiCorp Terraform` (syntax/lint local).

Troubleshooting comum:

1. mensagem `There are no open Terraform files`:
   - nao e erro de infra;
   - significa apenas que nenhum arquivo `.tf` esta aberto no editor;
   - abra `estudio-platform/infra/terraform/main.tf`.

## Acesso ao Aurora (console web estilo administracao)

1. Console RDS (clusters/instancias):
   [RDS Databases](https://sa-east-1.console.aws.amazon.com/rds/home?region=sa-east-1#databases:)
2. Query Editor v2 (consulta SQL no browser):
   [RDS Query Editor v2](https://sa-east-1.console.aws.amazon.com/rds/home?region=sa-east-1#query-editor:)

## Acesso ao Aurora pelo VS Code (PostgreSQL extension)

Conexao padrao configurada no user settings:

1. Nome: `Aurora Dev via SSM`
2. Host: `127.0.0.1`
3. Porta: `15432`
4. Database: `estudioplatform`
5. User: `platform_admin`
6. SSL: `disable` (tunel local SSM)
7. Senha: nao versionada (preencher ao conectar).

Credencial local aplicada nesta maquina:

1. arquivo `%APPDATA%\postgresql\pgpass.conf` com entrada do Aurora dev;
2. objetivo: evitar prompt repetitivo de senha na conexao local.

Script para abrir tunel seguro SSM (manter janela aberta):

```powershell
cd C:\Users\renat\Projetos_Dev\estudio-platform
.\scripts\db\start-aurora-ssm-tunnel.ps1
```

Pre-requisito no Windows:

1. instalar `Session Manager Plugin` da AWS:
   <https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html>
2. fallback sem admin (ja aplicado nesta maquina):
   - binario em `C:\Users\renat\tools\session-manager-plugin\package\bin`;
   - script de tunel ja busca esse caminho automaticamente.

## Conexoes Supabase que devem continuar visiveis

No VS Code (PostgreSQL extension), as conexoes esperadas sao:

1. `Supabase Local`
2. `Supabase Online`
3. `Aurora Dev via SSM`

Se nao aparecerem:

1. `Ctrl+Shift+P` -> `Developer: Reload Window`;
2. abrir novamente a view da extensao PostgreSQL;
3. confirmar o arquivo user settings:
   `C:\Users\renat\AppData\Roaming\Code\User\settings.json`.

### Perfil canonico do Supabase Online (PostgreSQL extension)

Campos esperados no `settings.json` de usuario:

1. `profileName`: `Supabase Online`
2. `server`: `aws-1-sa-east-1.pooler.supabase.com`
3. `port`: `5432`
4. `database`: `postgres`
5. `user`: `postgres.<project_ref>`
6. `sslmode`: `require`
7. `savePassword`: `true`

Observacao:

1. nao usar host IPv6 direto do Postgres para essa conexao de uso diario;
2. para VS Code extension, usar o pooler como padrao operacional.

### Erro comum: `fe_sendauth: no password supplied`

Sintoma:

1. conexao abre no Object Explorer e falha sem prompt util de senha.

Causa mais comum:

1. o perfil foi alterado, mas o segredo local do VS Code ficou associado
   apenas ao item MRU, nao ao item de Profile.

Correcao operacional:

1. manter o perfil exatamente no formato canonico acima;
2. recarregar janela (`Developer: Reload Window`);
3. reconectar no perfil `Supabase Online`.

Se ainda falhar:

1. excluir o perfil `Supabase Online` na extensao;
2. recriar com os mesmos campos canonicos;
3. salvar senha ao conectar.

Se aparecer `connection timeout expired` na conexao Aurora:

1. validar login AWS SSO:
   - `aws sts get-caller-identity --profile estudio_prod_admin`
2. abrir tunel SSM em terminal dedicado:
   - `.\scripts\db\start-aurora-ssm-tunnel.ps1`
3. manter a janela do tunel aberta durante o uso da extensao.

## Regra de manutencao documental

Sempre que mudar configuracao de workspace/extensao/banco:

1. atualizar este runbook;
2. atualizar os docs do repo Android quando impacto for nele;
3. registrar no PR o que mudou, validacao e impacto operacional.
