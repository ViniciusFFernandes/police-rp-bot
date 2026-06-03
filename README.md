# 🚔 Police RP Bot

Bot de Discord para controle operacional de departamento policial em servidores de roleplay.  
Substitui controles manuais de turnos, armamentos e relatórios por um sistema automatizado e auditável.  
Suporta **múltiplos servidores simultaneamente** — cada servidor possui configurações completamente independentes armazenadas no banco de dados.

---

## 📋 Índice

1. [Descrição](#descrição)
2. [Tecnologias](#tecnologias)
3. [Requisitos](#requisitos)
4. [Instalação local](#instalação-local)
5. [Variáveis de ambiente](#variáveis-de-ambiente)
6. [Criação do Bot no Discord](#criação-do-bot-no-discord)
7. [Permissões necessárias](#permissões-necessárias)
8. [Configuração do PostgreSQL](#configuração-do-postgresql)
9. [Executar localmente](#executar-localmente)
10. [Configuração inicial do servidor](#configuração-inicial-do-servidor)
11. [Deploy em VPS Linux](#deploy-em-vps-linux)
12. [Deploy no Railway](#deploy-no-railway)
13. [Deploy no Render](#deploy-no-render)
14. [Estrutura de pastas](#estrutura-de-pastas)
15. [Funcionalidades v1.0](#funcionalidades-v10)
16. [Solução de problemas](#solução-de-problemas)
17. [Roadmap](#roadmap)

---

## Descrição

O **Police RP Bot** é um sistema completo para gerenciar as operações de um departamento policial em servidores de Discord focados em roleplay.

### O que ele resolve

| Problema manual | Solução do bot |
|---|---|
| Controle de turno em planilhas | `/iniciar` com modal, embed e botões |
| Canal de voz criado manualmente | Canal criado/excluído automaticamente |
| Digitar seriais de arma a cada turno | Arsenal pessoal carregado automaticamente |
| Extravios registrados no chat | Modal dedicado + relatório em canal específico |
| Relatórios escritos manualmente | Gerado automaticamente ao encerrar turno |
| Histórico disperso | `/historico` restrito a supervisores com visão completa |
| Configuração via arquivo `.env` | Tudo configurável via comandos slash, por servidor |
| Canal de turnos poluído | Mensagens de usuários deletadas automaticamente em 10s |

### Arquitetura multi-guild

Uma única instância do bot atende quantos servidores Discord forem necessários. Cada servidor possui sua própria configuração isolada no banco de dados — canais, categorias, cargos supervisores e todos os registros operacionais são completamente separados por `guild_id`.

---

## Tecnologias

- **[Node.js](https://nodejs.org/)** v18+
- **[Discord.js](https://discord.js.org/)** v14
- **[PostgreSQL](https://www.postgresql.org/)** 14+
- **[pg](https://node-postgres.com/)** — driver PostgreSQL para Node.js
- **[Winston](https://github.com/winstonjs/winston)** — logging estruturado com rotação diária
- **[dotenv](https://github.com/motdotla/dotenv)** — variáveis de ambiente

---

## Requisitos

- Node.js >= 18.0.0
- PostgreSQL >= 14
- Uma aplicação criada no [Discord Developer Portal](https://discord.com/developers/applications)
- Servidor Discord com permissão de administrador

---

## Instalação local

```bash
# 1. Clone ou baixe o projeto
git clone https://github.com/seu-usuario/police-rp-bot.git
cd police-rp-bot

# 2. Instale as dependências
npm install

# 3. Copie o arquivo de variáveis
cp .env.example .env
```

---

## Variáveis de ambiente

O arquivo `.env` contém **apenas configurações globais do bot**. Todas as configurações específicas de cada servidor são armazenadas no banco de dados e gerenciadas via comandos slash.

```env
# Token do bot (obtido no Developer Portal)
DISCORD_TOKEN=seu_token_aqui

# ID do bot (Client ID no Developer Portal)
CLIENT_ID=123456789012345678

# String de conexão do PostgreSQL
DATABASE_URL=postgresql://usuario:senha@localhost:5432/police_bot

# Opcionais
NODE_ENV=production
LOG_LEVEL=info
```

> **Atenção:** Não existe `GUILD_ID`, `SHIFT_CHANNEL_ID`, `REPORT_CHANNEL_ID`, `WEAPON_REPORT_CHANNEL_ID`, `VOICE_CATEGORY_ID` nem `SUPERVISOR_ROLE_IDS` no `.env`. Essas configurações são feitas por servidor via `/configurar`.

### Como obter os IDs no Discord

1. Ative o **Modo Desenvolvedor**: Configurações → Avançado → Modo Desenvolvedor
2. Clique com botão direito em qualquer canal, cargo ou usuário → **Copiar ID**

---

## Criação do Bot no Discord

1. Acesse [discord.com/developers/applications](https://discord.com/developers/applications)
2. Clique em **New Application** → dê um nome
3. Vá em **Bot** → clique em **Add Bot**
4. Em **Token**, clique em **Reset Token** e copie o valor → cole em `DISCORD_TOKEN`
5. Desative **Public Bot** se quiser restringir o acesso
6. Ative os **Privileged Gateway Intents**:
   - ✅ Server Members Intent
7. Copie o **Application ID** (na aba General Information) → cole em `CLIENT_ID`
8. Vá em **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: veja a seção abaixo
9. Copie a URL gerada e abra no navegador para adicionar o bot ao servidor

---

## Permissões necessárias

| Permissão | Motivo |
|---|---|
| `Manage Channels` | Criar e excluir canais de voz de turno |
| `Send Messages` | Postar embeds e relatórios |
| `Embed Links` | Enviar embeds formatadas |
| `Read Message History` | Editar embeds de turno existentes |
| `Manage Messages` | Deletar mensagens de usuários no canal de turnos |
| `View Channel` | Ver os canais configurados |
| `Connect` | Permissão base nos canais de voz |

**Permissão numérica equivalente:** `17600776085504`

---

## Configuração do PostgreSQL

### Instalação local (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib

sudo -u postgres psql

CREATE USER police_bot WITH PASSWORD 'sua_senha_segura';
CREATE DATABASE police_bot OWNER police_bot;
GRANT ALL PRIVILEGES ON DATABASE police_bot TO police_bot;
\q
```

### Instalação local (Windows)

1. Baixe o instalador em [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)
2. Execute o instalador e siga os passos
3. Abra o terminal na pasta `bin` do PostgreSQL e execute:

```bash
.\psql -U postgres -c "CREATE DATABASE police_bot;"
```

### String de conexão

```
DATABASE_URL=postgresql://postgres:sua_senha@localhost:5432/police_bot
```

---

## Executar localmente

```bash
# 1. Preencha o .env com DISCORD_TOKEN, CLIENT_ID e DATABASE_URL

# 2. Execute as migrações do banco
npm run db:migrate

# 3. Registre os comandos slash
#    Para registro instantâneo em um servidor específico:
$env:DEPLOY_GUILD_ID="seu_guild_id"; npm run deploy

#    Para registro global (pode levar até 1h):
npm run deploy

# 4. Inicie o bot
npm start

# ou em modo desenvolvimento (reinicia ao salvar arquivos)
npm run dev
```

---

## Configuração inicial do servidor

Ao ser adicionado a um servidor, o bot detecta automaticamente que o servidor não está configurado e envia uma mensagem de boas-vindas com instruções.

A configuração é feita inteiramente por **comandos slash**, por um administrador do servidor:

### Passo 1 — Configurar os canais

```
/configurar canal-turnos     #canal-turnos
/configurar canal-relatorios #canal-relatorios
/configurar canal-armamento  #canal-armamento
/configurar categoria-voz    Operações PD
```

### Passo 2 — Configurar cargos supervisores

```
/configurar cargo-supervisor @Supervisor Adicionar
/configurar cargo-supervisor @Comandante Adicionar
```

Supervisores podem gerenciar turnos de outros oficiais, consultar históricos e registrar extravios de qualquer arma.

### Passo 3 — Verificar configuração

```
/configuracoes
```

Exibe uma embed com o status de cada item. Verde = tudo configurado, vermelho = itens pendentes.

### Referência dos comandos de configuração

| Comando | Descrição |
|---|---|
| `/configurar canal-turnos` | Canal onde as embeds de turno são postadas |
| `/configurar canal-relatorios` | Canal de relatórios de turno encerrado |
| `/configurar canal-armamento` | Canal de notificações de armamento |
| `/configurar categoria-voz` | Categoria onde os canais de voz são criados automaticamente |
| `/configurar cargo-supervisor` | Adiciona ou remove um cargo supervisor |
| `/configuracoes` | Exibe todas as configurações atuais do servidor |

> Todos os comandos de configuração exigem permissão de **Administrador**.

---

## Deploy em VPS Linux

### Pré-requisitos

- VPS com Ubuntu 22.04+ (mínimo 1 GB RAM)
- Acesso SSH

### Passo a passo

```bash
# 1. Atualizar o sistema
sudo apt update && sudo apt upgrade -y

# 2. Instalar Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# 4. Instalar PM2
sudo npm install -g pm2

# 5. Criar banco de dados
sudo -u postgres psql -c "CREATE USER police_bot WITH PASSWORD 'SUA_SENHA';"
sudo -u postgres psql -c "CREATE DATABASE police_bot OWNER police_bot;"

# 6. Clonar o projeto
git clone https://github.com/seu-usuario/police-rp-bot.git /home/ubuntu/police-bot
cd /home/ubuntu/police-bot

# 7. Instalar dependências
npm install --production

# 8. Configurar variáveis de ambiente
cp .env.example .env
nano .env
# Preencha: DISCORD_TOKEN, CLIENT_ID, DATABASE_URL

# 9. Executar migrações
npm run db:migrate

# 10. Registrar comandos slash globalmente
npm run deploy

# 11. Iniciar com PM2
pm2 start src/index.js --name police-bot
pm2 save
pm2 startup   # siga as instruções exibidas

# Monitorar logs em tempo real
pm2 logs police-bot

# Reiniciar após atualização de código
git pull
npm install --production
pm2 restart police-bot
```

---

## Deploy no Railway

[Railway](https://railway.app) oferece plano gratuito generoso com setup simples.

1. Crie uma conta em [railway.app](https://railway.app)
2. Clique em **New Project → Deploy from GitHub repo**
3. Conecte seu repositório
4. Adicione um banco **PostgreSQL**:
   - Clique em **+ New → Database → PostgreSQL**
   - Vá em **Variables** do serviço PostgreSQL → copie `DATABASE_URL`
5. Vá no serviço do bot → **Variables** → adicione:
   ```
   DISCORD_TOKEN=seu_token
   CLIENT_ID=id_do_bot
   DATABASE_URL=valor_copiado_acima
   NODE_ENV=production
   ```
6. Em **Settings → Deploy**, confirme que o start command é:
   ```
   node src/index.js
   ```
7. Adicione o build command:
   ```
   npm install && npm run db:migrate && npm run deploy
   ```
8. O Railway fará deploy automático a cada `git push`

---

## Deploy no Render

1. Crie uma conta em [render.com](https://render.com)
2. Clique em **New → Web Service**
3. Conecte seu repositório GitHub
4. Configure:
   - **Environment:** Node
   - **Build Command:** `npm install && npm run db:migrate && npm run deploy`
   - **Start Command:** `npm start`
5. Adicione um banco **PostgreSQL**:
   - New → PostgreSQL → copie a **Internal Database URL**
6. Em **Environment → Environment Variables**, adicione:
   ```
   DISCORD_TOKEN, CLIENT_ID, DATABASE_URL, NODE_ENV
   ```
7. Clique em **Create Web Service**

> **Atenção:** Serviços gratuitos do Render ficam em sleep após inatividade. Para bots de Discord, use o plano pago ou prefira o Railway.

---

## Estrutura de pastas

```
police-rp-bot/
│
├── src/
│   ├── commands/
│   │   ├── admin/
│   │   │   ├── configurar.js       # /configurar (5 subcomandos)
│   │   │   └── configuracoes.js    # /configuracoes
│   │   ├── shift/
│   │   │   └── iniciar.js          # /iniciar (modal: distrito, unidade, callsign)
│   │   ├── history/
│   │   │   └── historico.js        # /historico resumo|turnos|arsenal — restrito a supervisores
│   │   └── weapon/
│   │       └── arma.js             # /arma consultar|registrar|arsenal|extravio
│   │
│   ├── events/
│   │   ├── ready.js
│   │   ├── guildCreate.js          # Detecta novo servidor → boas-vindas + guia
│   │   ├── interactionCreate.js    # Guard de configuração + roteamento
│   │   └── messageCreate.js        # Auto-delete 10s no canal de turnos
│   │
│   ├── buttons/
│   │   └── shiftButtons.js         # Pausar, Retornar, Arma Perdida, Adicionar Arma, Encerrar
│   │                               # Resolve dono do turno para supervisores agirem corretamente
│   │
│   ├── modals/
│   │   ├── startShiftModal.js      # Modal de início de turno
│   │   ├── weaponLossModal.js      # Modal de extravio durante turno
│   │   └── addWeaponModal.js       # Modal de adição de arma ao turno
│   │
│   ├── services/
│   │   ├── shiftService.js         # Lógica de turno — aceita targetDiscordId para supervisores
│   │   └── guildConfigService.js   # Lógica de configuração por servidor
│   │
│   ├── repositories/
│   │   ├── userRepository.js
│   │   ├── shiftRepository.js      # findEndedByUser, countEndedByUser para paginação
│   │   ├── pauseRepository.js
│   │   ├── weaponRepository.js
│   │   ├── weaponLossRepository.js
│   │   ├── officialWeaponRepository.js  # Arsenal + getArsenalHistory + excludeLost
│   │   └── guildConfigRepository.js
│   │
│   ├── database/
│   │   └── pool.js
│   │
│   ├── handlers/
│   │   ├── commandHandler.js
│   │   ├── buttonHandler.js
│   │   └── modalHandler.js
│   │
│   ├── utils/
│   │   ├── logger.js
│   │   ├── embeds.js
│   │   ├── time.js
│   │   ├── permissions.js
│   │   └── configGuard.js
│   │
│   └── index.js
│
├── database/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_guild_config.sql
│   │   ├── 003_add_guild_id.sql
│   │   ├── 004_weapons_guild_unique.sql
│   │   └── 005_official_weapons.sql
│   └── migrate.js
│
├── scripts/
│   └── deploy-commands.js
│
├── logs/
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## Funcionalidades v1.0

### Comandos operacionais (todos os membros)

#### `/iniciar`
Abre um modal com 3 campos: **Distrito**, **Unidade** e **Callsign**.  
O bot gera automaticamente:
- **Callsign completo:** `Distrito-Unidade-Callsign` → ex: `3-A-12`
- **Prefixo da viatura:** `DistritoCallsign` → ex: `312`

As armas do **arsenal pessoal** do oficial (excluindo extraviadas) são carregadas automaticamente — sem precisar digitar nenhum serial. Se o arsenal estiver vazio ou sem armas ativas, o oficial é orientado a usar o botão **Adicionar Arma** ou `/arma registrar`.

#### `/arma registrar <nome> <serie>`
Cadastra uma arma no arsenal pessoal do oficial, vinculada ao servidor.  
A arma será carregada automaticamente nos próximos turnos.  
Envia notificação no canal de armamento.

#### `/arma arsenal`
Lista apenas as **armas ativas** do arsenal (disponíveis e em uso).  
Armas extraviadas não são exibidas — são visíveis somente para supervisores via `/historico arsenal`.

#### `/arma extravio <serie> [observacao]`
Registra o extravio de uma arma **fora de um turno ativo**.  
- Oficiais só podem reportar suas próprias armas
- Admins e supervisores podem reportar qualquer arma
- Se houver turno ativo, redireciona para o botão **Arma Perdida** na embed

#### `/arma consultar <serie>`
Consulta o status atual da arma, nome cadastrado no arsenal, último oficial, último turno e histórico completo de extravios.

---

### Botões da embed de turno

A embed de turno possui **dois grupos de botões**:

**Grupo 1 — Controle de turno**

| Botão | Ação |
|---|---|
| **Pausar** | Registra pausa com timestamp; atualiza embed para amarelo |
| **Retornar ao Serviço** | Encerra a pausa, acumula duração; atualiza embed para verde |
| **Arma Perdida** | Abre modal (série + observação); valida pertencimento ao turno; envia relatório |
| **Encerrar Turno** | Calcula tempos; envia relatório; exclui canal de voz; desativa botões |

**Grupo 2 — Gestão de armamento**

| Botão | Ação |
|---|---|
| **Adicionar Arma** | Abre modal (nome + série); adiciona ao turno e ao arsenal pessoal; envia notificação |

Múltiplas pausas por turno são suportadas.  
Supervisores e admins podem clicar nos botões de turnos de outros oficiais.

---

### Canal de turnos — limpeza automática

O canal de turnos é mantido limpo automaticamente:
- Qualquer mensagem enviada por usuários nesse canal é **deletada após 10 segundos**
- Apenas as embeds de registro de turno do bot permanecem visíveis

---

### Comandos de supervisão (somente supervisores e admins)

#### `/historico resumo @usuario`
Visão geral consolidada do oficial: total de turnos encerrados, tempo efetivo, tempo em pausa, pausas realizadas e armas extraviadas.

#### `/historico turnos @usuario [pagina]`
Lista paginada (8 por página) de todos os turnos encerrados do oficial, com detalhes de cada um:
- Callsign e viatura
- Horário de início e fim com timestamps do Discord
- Tempo efetivo, tempo em pausa e quantidade de pausas
- Quantidade de armas usadas no turno

#### `/historico arsenal @usuario`
Visão completa do arsenal do oficial, **incluindo armas extraviadas**, com:
- Status atual de cada arma (disponível, em uso, extraviada)
- Data de cadastro
- Quantos turnos a arma foi utilizada e data do último uso
- Quantidade de extravios registrados

> Os três subcomandos de `/historico` são **restritos a supervisores e administradores**. Oficiais sem cargo supervisor recebem mensagem de permissão negada.

---

### Comandos de configuração (somente Administradores)

| Comando | Opção | Descrição |
|---|---|---|
| `/configurar` | `canal-turnos #canal` | Canal das embeds de turno |
| `/configurar` | `canal-relatorios #canal` | Canal de relatórios de encerramento |
| `/configurar` | `canal-armamento #canal` | Canal de notificações de armamento |
| `/configurar` | `categoria-voz Categoria` | Categoria dos canais de voz automáticos |
| `/configurar` | `cargo-supervisor @Cargo Adicionar/Remover` | Gerencia cargos supervisores |
| `/configuracoes` | — | Exibe status de todas as configurações |

---

### Controle de permissões

| Ação | Oficial | Supervisor | Admin |
|---|:---:|:---:|:---:|
| Iniciar turno | ✅ | ✅ | ✅ |
| Pausar / Retornar (próprio turno) | ✅ | ✅ | ✅ |
| Pausar / Retornar (turno alheio) | ❌ | ✅ | ✅ |
| Arma Perdida (próprio turno) | ✅ | ✅ | ✅ |
| Arma Perdida (turno alheio) | ❌ | ✅ | ✅ |
| Encerrar turno próprio | ✅ | ✅ | ✅ |
| Encerrar turno alheio | ❌ | ✅ | ✅ |
| `/arma registrar` | ✅ | ✅ | ✅ |
| `/arma arsenal` (apenas ativas) | ✅ | ✅ | ✅ |
| `/arma extravio` (própria arma) | ✅ | ✅ | ✅ |
| `/arma extravio` (qualquer arma) | ❌ | ✅ | ✅ |
| `/historico` (todos os subcomandos) | ❌ | ✅ | ✅ |
| `/configurar` | ❌ | ❌ | ✅ |

---

### Comportamento multi-guild

- Ao ser adicionado a um novo servidor, o bot envia automaticamente um guia de configuração inicial
- Comandos operacionais são bloqueados com aviso amigável enquanto o servidor não estiver configurado
- Todos os dados (turnos, armas, relatórios, configurações) são completamente isolados por servidor
- Uma única instância do bot pode atender dezenas de servidores sem interferência entre eles

---

## Solução de problemas

### Bot não aparece online
- Verifique se `DISCORD_TOKEN` está correto no `.env`
- Confirme que o **Server Members Intent** está ativado no Developer Portal

### Comandos slash não aparecem
- Execute `npm run deploy` novamente
- Para aparecer imediatamente: `$env:DEPLOY_GUILD_ID="seu_id"; npm run deploy`
- Comandos globais podem levar até **1 hora** para aparecer

### "Servidor ainda não foi configurado"
- Execute os 4 comandos `/configurar` obrigatórios como administrador
- Use `/configuracoes` para ver quais itens estão pendentes

### Erro ao iniciar turno
- Verifique se o banco foi migrado: `npm run db:migrate`
- Confirme que `DATABASE_URL` aponta para o banco correto

### Arsenal vazio ao iniciar turno
- Cadastre armas com `/arma registrar <nome> <serie>` antes de iniciar o turno
- Ou use o botão **Adicionar Arma** na embed após iniciar

### Armas extraviadas sendo incluídas no turno
- Armas com status `lost` são automaticamente excluídas ao carregar o arsenal
- Se o problema persistir, execute `npm run db:migrate` para garantir que todas as migrações foram aplicadas

### Supervisor não consegue fechar turno de outro oficial
- Confirme que o cargo do supervisor está configurado via `/configurar cargo-supervisor`
- O supervisor deve clicar nos botões diretamente na embed do turno do oficial

### Canal de voz não é criado
- Confirme que a categoria foi configurada via `/configurar categoria-voz`
- Verifique se o bot tem permissão `Manage Channels` na categoria

### Mensagens não são deletadas no canal de turnos
- Verifique se o bot tem permissão `Manage Messages` no canal de turnos

### Ver logs em produção (PM2)
```bash
pm2 logs police-bot --lines 100
pm2 logs police-bot --err
```

---

## Roadmap

### v1.1 — Painel Operacional
- `/status` — visão geral dos turnos ativos no servidor em tempo real
- Sistema de escalas de plantão

### v1.2 — Relatórios Avançados
- Dashboard semanal/mensal automático
- Exportação de relatórios em CSV

### v1.3 — Ocorrências
- Sistema de registro de ocorrências vinculado ao turno ativo
- Categorias: abordagem, perseguição, prisão, etc.

### v2.0 — Dashboard Web
- Painel web para visualização de estatísticas por servidor
- Autenticação via Discord OAuth2
