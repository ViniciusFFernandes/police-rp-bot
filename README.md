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
15. [Funcionalidades](#funcionalidades)
16. [Painéis de Botões](#painéis-de-botões)
17. [Assuntos Internos (IA)](#assuntos-internos-ia)
18. [Relatórios de Serviço (SR)](#relatórios-de-serviço-sr)
19. [Ouvidoria Civil (Denúncias)](#ouvidoria-civil-denúncias)
20. [Controle de permissões](#controle-de-permissões)
21. [Banco de dados](#banco-de-dados)
22. [Solução de problemas](#solução-de-problemas)

---

## Descrição

O **Police RP Bot** é um sistema completo para gerenciar as operações de um departamento policial em servidores de Discord focados em roleplay.

### O que ele resolve

| Problema manual | Solução do bot |
|---|---|
| Turno individual registrado por oficial | Unidade Operacional com líder + membros (`3-A-12`, `1-L-20`) |
| Digitar distrito e callsign a cada turno | Perfil do oficial salvo — `/iniciar` carrega automaticamente |
| Canal de voz criado manualmente | Canal criado como `Viatura-Callsign` — sem permissão de falar por padrão |
| Digitar seriais de arma a cada turno | Arsenal de toda a equipe carregado automaticamente |
| Escolher viatura manualmente | Seleção a partir do cadastro de viaturas do servidor |
| Unidades digitadas livremente | Cadastro de unidades operacionais (`A`, `L`, `K`, `RPM`...) |
| Lista de callsigns espalhada | Quadro de callsigns mantido automaticamente em canal dedicado |
| Extravios registrados no chat | Modal dedicado + regras de permissão por papel na unidade |
| Relatórios escritos manualmente | Gerado automaticamente com motivo de encerramento |
| Reabrir turno manualmente após mudança de equipe | Fluxo de **Remodulação** com nova unidade imediata |
| Histórico apenas de quem liderou | `/historico` contabiliza participações como líder e como membro |
| Investigações internas no chat | Sistema completo de IA com fluxo guiado, quadro persistente e status |
| Provas de investigação enviadas como links | Canal temporário criado para upload de arquivos/imagens |
| Ocorrências, prisões e crimes sem registro | Sistema de Relatórios de Serviço com fluxo guiado e quadro persistente |
| Configuração restrita ao admin do Discord | Cargos gestores de configuração configuráveis pelo admin |
| Configuração via arquivo `.env` | Tudo configurável via comandos slash, por servidor |
| Canal de turnos poluído | Mensagens de usuários deletadas automaticamente em 10s |
| Comandos difíceis de lembrar | Painéis de botões para ações mais comuns (operacional, admin, IA) |

### Arquitetura multi-guild

Uma única instância do bot atende quantos servidores Discord forem necessários. Cada servidor possui sua própria configuração isolada no banco de dados — canais, categorias, cargos, viaturas, unidades e todos os registros operacionais são completamente separados por `guild_id`.

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

> **Atenção:** Não existe `GUILD_ID`, `SHIFT_CHANNEL_ID`, `REPORT_CHANNEL_ID` nem qualquer outro ID no `.env`. Todas as configurações são feitas por servidor via `/configurar`.

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
| `Manage Channels` | Criar e excluir canais de voz de turno e canais temporários de provas |
| `Send Messages` | Postar embeds e relatórios |
| `Embed Links` | Enviar embeds formatadas |
| `Read Message History` | Editar embeds de turno, quadro de callsigns e coletar provas |
| `Manage Messages` | Deletar mensagens de usuários no canal de turnos |
| `View Channel` | Ver os canais configurados |
| `Connect` | Permissão base nos canais de voz |
| `Attach Files` | Reenviar arquivos de provas para o canal de arquivo |
| `Manage Roles` / `Manage Permissions` | Definir permissões nos canais temporários de provas |

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
#    Para registro instantâneo em um servidor específico (recomendado em dev):
$env:DEPLOY_GUILD_ID="seu_guild_id"; npm run deploy

#    Para registro global (pode levar até 1h para aparecer):
npm run deploy

# 4. Inicie o bot
npm start

# ou em modo desenvolvimento (reinicia ao salvar arquivos)
npm run dev
```

---

## Configuração inicial do servidor

Ao ser adicionado a um servidor, o bot detecta automaticamente que ele não está configurado e envia uma mensagem de boas-vindas com instruções.

A configuração é feita inteiramente por **comandos slash**. Por padrão, apenas **Administradores** do servidor podem configurar o bot — mas é possível delegar isso a cargos específicos via `/configurar-cargos cargo-gestor`.

### Passo 1 — Canais obrigatórios

```
/configurar canal-turnos     #canal-turnos
/configurar canal-relatorios #canal-relatorios
/configurar canal-armamento  #canal-armamento
/configurar categoria-voz    Operações PD
```

### Passo 2 — Cargos supervisores

```
/configurar-cargos cargo-supervisor @Supervisor Adicionar
/configurar-cargos cargo-supervisor @Comandante Adicionar
```

Supervisores podem gerenciar turnos de outros oficiais, consultar históricos, registrar extravios de qualquer arma e definir perfis de outros oficiais. A equipe de **Assuntos Internos** (cargo configurado em `/configurar-cargos cargo-ia`) tem essas mesmas permissões operacionais, mesmo sem possuir o cargo de supervisor.

### Passo 3 — Cargos gestores de configuração (opcional)

```
/configurar-cargos cargo-gestor @Gestor Adicionar
```

Gestores podem usar `/configurar`, `/configuracoes`, `/veiculo` e `/unidade`, mas **não** podem gerenciar os próprios cargos gestores (exclusivo de Administradores).

### Passo 4 — Unidades operacionais

```
/unidade registrar A
/unidade registrar L
/unidade registrar K
/unidade registrar RPM
```

### Passo 5 — Viaturas (opcional)

```
/veiculo registrar Ford Explorer
/veiculo registrar Ford Victoria
/veiculo registrar Tesla Model Y
```

### Passo 6 — Canal e cargos de Assuntos Internos (opcional)

```
/configurar canal-ia          #assuntos-internos
/configurar categoria-ia      Assuntos Internos     ← categoria para canais de provas
/configurar canal-provas-ia   #provas-ia            ← arquivo permanente de provas
/configurar-cargos cargo-ia @Assuntos Internos Adicionar
```

### Passo 7 — Relatórios de Serviço (opcional)

```
/configurar canal-relatorios-sr  #relatorios-servico   ← quadros de relatório
/configurar categoria-sr         Relatórios             ← canais temporários de provas
/configurar canal-provas-sr      #provas-sr             ← arquivo permanente de provas
```

### Passo 8 — Canal de callsigns (opcional)

```
/configurar canal-callsign #callsigns
```

### Passo 9 — Painéis de botões (opcional)

```
/configurar canal-painel       #painel-operacional   ← painel para todos os oficiais
/configurar canal-painel-admin #painel-admin         ← painel exclusivo para supervisores
/configurar canal-painel-ia    #painel-ia            ← painel exclusivo para equipe de IA
```

### Passo 10 — Verificar configuração

```
/configuracoes
```

### Referência — comandos de configuração

| Comando | Descrição |
|---|---|
| `/configurar canal-turnos` | Canal das embeds de turno |
| `/configurar canal-relatorios` | Canal de relatórios de encerramento de turno |
| `/configurar canal-armamento` | Canal de notificações de armamento |
| `/configurar categoria-voz` | Categoria dos canais de voz automáticos |
| `/configurar canal-callsign` | Canal do quadro de callsigns automático |
| `/configurar canal-ia` | Canal dos quadros de investigações de Assuntos Internos |
| `/configurar categoria-ia` | Categoria para canais temporários de coleta de provas de IA |
| `/configurar canal-provas-ia` | Canal de arquivo permanente de provas de IA |
| `/configurar canal-relatorios-sr` | Canal dos quadros de Relatórios de Serviço |
| `/configurar categoria-sr` | Categoria para canais temporários de coleta de provas de SR |
| `/configurar canal-provas-sr` | Canal de arquivo permanente de provas de SR |
| `/configurar canal-painel` | Canal do painel operacional (todos os oficiais) |
| `/configurar canal-painel-admin` | Canal do painel administrativo (supervisores) |
| `/configurar canal-painel-ia` | Canal do painel de Assuntos Internos |
| `/configurar canal-medidas-ia` | Canal de alertas de medidas disciplinares (punições, afastamentos) |
| `/configurar canal-painel-civil` | Canal do painel de denúncias para civis |
| `/configurar canal-denuncias-civis` | Canal onde a Corregedoria avalia as denúncias registradas por civis |
| `/configurar categoria-denuncias-civis` | Categoria para canais temporários de coleta de provas de denúncias civis |
| `/configurar canal-provas-denuncias-civis` | Canal de arquivo permanente de provas de denúncias civis |
| `/configurar canal-notificacoes-transito` | Canal de notificações de novas advertências de trânsito |
| `/configurar canal-comunicados` | Canal onde os comunicados gerais são publicados |
| `/configurar-cargos cargo-supervisor` | Adiciona ou remove um cargo supervisor |
| `/configurar-cargos cargo-policia` | Adiciona ou remove um cargo com acesso ao bot |
| `/configurar-cargos cargo-ia` | Adiciona ou remove um cargo de Assuntos Internos |
| `/configurar-cargos cargo-cidadao` | Adiciona ou remove um cargo de cidadão (acesso restrito à Ouvidoria Civil) |
| `/configurar-cargos cargo-gestor` | Adiciona ou remove um cargo gestor de configuração (somente Admins) |
| `/configuracoes` | Exibe status de todas as configurações |

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
npm run db:migrate
npm run deploy   # sempre que novos comandos slash forem adicionados
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
│   │   │   ├── configurar.js          # /configurar (todos os subcomandos de config)
│   │   │   ├── configuracoes.js       # /configuracoes
│   │   │   ├── apagar-mensagem.js     # /apagar-mensagem <id> [canal]
│   │   │   ├── veiculo.js             # /veiculo registrar|listar|remover
│   │   │   └── unidade.js             # /unidade registrar|listar|remover
│   │   ├── shift/
│   │   │   ├── iniciar.js             # /iniciar → carrega perfil e abre composição
│   │   │   ├── oficial.js             # /oficial definir|ver
│   │   │   └── turno.js               # /turno listar|forcar-encerrar
│   │   ├── ia/
│   │   │   └── investigacao.js        # /ia abrir|listar|ver|deletar
│   │   ├── history/
│   │   │   └── historico.js           # /historico resumo|turnos|arsenal
│   │   └── weapon/
│   │       └── arma.js                # /arma consultar|registrar|arsenal|extravio
│   │
│   ├── events/
│   │   ├── ready.js
│   │   ├── guildCreate.js             # Detecta novo servidor → boas-vindas + guia
│   │   ├── interactionCreate.js       # Guard de configuração + roteamento
│   │   └── messageCreate.js           # Auto-delete 10s no canal de turnos
│   │
│   ├── buttons/
│   │   ├── shiftButtons.js            # Pausar, Retornar, Arma Perdida, Adicionar Arma, Encerrar
│   │   ├── shiftCompose.js            # Seleção de unidade/viatura/membros + confirmação
│   │   ├── shiftEnd.js                # Motivo de encerramento + fluxo de remodulação
│   │   ├── panel.js                   # Painel operacional — ações para todos os oficiais
│   │   ├── adminPanel.js              # Painel administrativo — ações para supervisores
│   │   ├── iaPanel.js                 # Painel de IA — ações para equipe de Assuntos Internos
│   │   ├── iaFlow.js                  # Fluxo de abertura de investigação (etapas + provas)
│   │   ├── iaBoard.js                 # Botões do quadro de investigação
│   │   ├── srFlow.js                  # Fluxo de abertura de Relatório de Serviço + consulta com filtros
│   │   ├── srBoard.js                 # Botões do quadro de Relatório de Serviço
│   │   ├── civilPanel.js              # Painel civil — denúncia (com provas), consulta de denúncias
│   │   └── civilComplaint.js          # Avaliação da Corregedoria (aceitar/arquivar denúncia)
│   │
│   ├── modals/
│   │   ├── endReasonModal.js                # Encerramento com motivo "Outro"
│   │   ├── weaponLossModal.js               # Extravio durante turno
│   │   ├── addWeaponModal.js                # Adição de arma ao turno
│   │   ├── panelWeaponRegister.js           # Registrar arma pelo painel operacional
│   │   ├── panelWeaponLoss.js               # Extravio pelo painel (supervisores)
│   │   ├── panelWeaponLossOfficer.js        # Extravio pelo painel (oficial comum)
│   │   ├── adminPanelProfileDefine.js       # Definir perfil de oficial pelo painel admin
│   │   ├── iaDetailsModal.js                # Detalhes do incidente (etapa 2 do fluxo de IA)
│   │   ├── iaDescriptionModal.js            # Descrição do ocorrido (etapa 3); inicia provas
│   │   ├── iaCloseModal.js                  # Veredicto + penalidade ao encerrar investigação
│   │   ├── iaBoardEditModal.js              # Editar descrição de investigação existente
│   │   ├── iaPanelView.js                   # Ver investigação pelo painel de IA
│   │   ├── iaPanelDelete.js                 # Deletar investigação pelo painel de IA
│   │   ├── srDetailsModal.js                # Detalhes do Relatório de Serviço (etapa 2)
│   │   ├── srBoardEditModal.js              # Editar descrição de relatório existente
│   │   ├── civilComplaintModal.js           # Formulário de denúncia civil (CitizenID/nome opcionais — anônima); inicia provas
│   │   ├── civilComplaintRejectModal.js     # Justificativa de arquivamento da denúncia
│   │   ├── trafficWarningStep1Modal.js      # Advertência de trânsito — etapa 1 (condutor/CitizenID/placa/prazo)
│   │   ├── trafficWarningStep2Modal.js      # Advertência de trânsito — etapa 2 (infrações/descrição) + publica
│   │   ├── trafficWarningSearchModal.js     # Consulta de advertências por CitizenID e/ou placa parcial
│   │   └── adminAnnouncementModal.js        # Comunicado geral (título/mensagem/emojis) → publica e marca cargos
│   │
│   ├── services/
│   │   ├── shiftService.js            # Lógica de turno (start/pause/resume/end/loss/addWeapon)
│   │   ├── callsignBoardService.js    # Cria/edita a mensagem do quadro de callsigns
│   │   ├── panelService.js            # Painel operacional — publicação/atualização
│   │   ├── adminPanelService.js       # Painel administrativo — publicação/atualização
│   │   ├── iaPanelService.js          # Painel de IA — publicação/atualização
│   │   ├── iaService.js               # Embed do quadro de investigação + publicação
│   │   ├── serviceReportService.js    # Embed do quadro de Relatório de Serviço + publicação
│   │   ├── civilPanelService.js       # Painel civil — publicação/atualização
│   │   ├── civilComplaintService.js   # Card de avaliação de denúncia + publicação
│   │   ├── trafficWarningService.js   # Embed de advertência + notificação no canal configurado
│   │   └── guildConfigService.js      # Lógica de configuração por servidor
│   │
│   ├── repositories/
│   │   ├── userRepository.js
│   │   ├── shiftRepository.js
│   │   ├── shiftMemberRepository.js
│   │   ├── pauseRepository.js
│   │   ├── weaponRepository.js
│   │   ├── weaponLossRepository.js
│   │   ├── officialWeaponRepository.js
│   │   ├── officialProfileRepository.js
│   │   ├── iaRepository.js
│   │   ├── serviceReportRepository.js
│   │   ├── civilComplaintRepository.js
│   │   ├── trafficWarningRepository.js
│   │   ├── vehicleRepository.js
│   │   ├── unitRepository.js
│   │   └── guildConfigRepository.js
│   │
│   ├── database/
│   │   └── pool.js
│   │
│   ├── handlers/
│   │   ├── commandHandler.js
│   │   ├── buttonHandler.js           # Roteia botões e select menus por prefixo de customId
│   │   └── modalHandler.js            # Roteia modals (exact match + dynamic matcher)
│   │
│   ├── utils/
│   │   ├── logger.js
│   │   ├── embeds.js
│   │   ├── time.js
│   │   ├── permissions.js
│   │   ├── configGuard.js
│   │   ├── pendingComposition.js
│   │   ├── pendingIA.js               # Store temporário do fluxo multi-etapa de IA (TTL 15min)
│   │   ├── pendingSR.js               # Store temporário do fluxo multi-etapa de SR (TTL 15min)
│   │   ├── pendingSRFilter.js         # Store temporário dos filtros de consulta de SR (TTL 15min)
│   │   ├── pendingCivilComplaint.js   # Store temporário do fluxo de denúncia civil (TTL 15min)
│   │   ├── pendingTrafficWarning.js   # Store temporário do fluxo de advertência de trânsito em 2 etapas (TTL 15min)
│   │   ├── collectEvidence.js         # Coleta/arquiva provas de canais temporários (IA/SR/Civil)
│   │   ├── openCompositionScreen.js
│   │   └── guildWhitelist.js
│   │
│   └── index.js
│
├── database/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_guild_config.sql
│       ├── 003_add_guild_id.sql
│       ├── 004_weapons_guild_unique.sql
│       ├── 005_official_weapons.sql
│       ├── 006_bot_config.sql
│       ├── 007_shift_members.sql
│       ├── 008_vehicles.sql
│       ├── 009_units.sql
│       ├── 010_config_manager_roles.sql
│       ├── 011_official_profiles.sql
│       ├── 012_add_badge_to_profiles.sql
│       ├── 013_ia_investigations.sql
│       ├── 014_ia_multi_accused.sql
│       ├── 015_service_reports.sql
│       ├── 016_ia_measures.sql
│       ├── 017_civil_complaints.sql
│       ├── 018_civil_complaints_identification.sql
│       └── 019_traffic_warnings.sql
│
├── scripts/
│   ├── deploy-commands.js
│   └── clear-guild-commands.js
│
├── logs/
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## Funcionalidades

### Perfil operacional do oficial

Antes de usar `/iniciar`, cada oficial precisa ter um perfil configurado por um supervisor.

#### `/oficial definir` — restrito a supervisores e administradores

Define o distrito, callsign, distintivo e nome do oficial. Pode ser feito via comando ou pelo **Painel Administrativo**.

```
/oficial definir distrito:3 callsign:12 distintivo:4521 nome:João usuario:@João
```

#### `/oficial ver [@usuario]`

Exibe o perfil operacional. Ver o próprio perfil é livre; ver perfil alheio requer supervisor ou admin.

---

### Quadro de Callsigns

Quando o canal de callsigns está configurado, o bot mantém uma **mensagem única e persistente** com todos os oficiais agrupados por distrito. Cada linha exibe distintivo (4 dígitos com zero à esquerda), callsign (3 dígitos) e nome do oficial.

Distritos com mais de 25 oficiais são divididos automaticamente em múltiplos campos para respeitar os limites do Discord.

---

### Iniciar turno — `/iniciar` ou botão no Painel Operacional

Com o perfil configurado, `/iniciar` (ou o botão **🚔 Iniciar Turno** no painel) abre a **tela de montagem da unidade**:

| Seletor | Obrigatoriedade |
|---|---|
| **Unidade** (`A`, `L`, `K`...) | Obrigatório |
| **Viatura** | Opcional |
| **Oficiais adicionais** | Opcional (até 5) |

O callsign final é montado como `Distrito-Unidade-Callsign` (ex: `3-A-12`). Após selecionar a unidade, o menu exibe `✅ Unidade: A` como confirmação visual.

**Ao confirmar, o bot:**
- Cria um único turno para toda a unidade
- Cria um canal de voz nomeado como `Viatura-Callsign` — **sem permissão de falar por padrão**
- Vincula automaticamente as armas ativas do arsenal de todos os participantes

---

### Botões da embed de turno

| Botão | Ação |
|---|---|
| **Pausar** | Registra pausa; embed fica amarela |
| **Retornar ao Serviço** | Encerra a pausa; embed fica verde |
| **Arma Perdida** | Abre modal (série + observação); envia relatório |
| **Adicionar Arma** | Abre modal (nome + série); registra no arsenal e no turno |
| **Encerrar Turno** | Exibe seleção de motivo; gera relatório; exclui canal de voz |

#### Motivos de encerramento

| Motivo | Comportamento |
|---|---|
| **Fim de Patrulha** | Gera relatório, encerra canal de voz |
| **Remodulação** | Gera relatório, encerra canal de voz, oferece iniciar nova unidade |
| **Outro** | Campo de texto opcional antes de encerrar |

---

### Armamentos

#### `/arma registrar <nome> <serie>`
Cadastra uma arma no arsenal pessoal. Será carregada automaticamente nos próximos turnos.

#### `/arma arsenal`
Lista as armas ativas do arsenal.

#### `/arma extravio <serie> [observacao]`
Registra extravio fora de um turno ativo. Dentro de um turno, usa o botão **Arma Perdida** na embed.

#### `/arma consultar <serie>`
Status atual, último oficial, último callsign e histórico de extravios.

---

### Histórico (supervisores e admins)

#### `/historico resumo @usuario`
Total de turnos, tempo efetivo, pausas e extravios.

#### `/historico turnos @usuario [pagina]`
Lista paginada (8 por página) dos turnos encerrados.

#### `/historico arsenal @usuario`
Arsenal completo incluindo armas extraviadas e histórico de uso.

---

### Turnos ativos (supervisores e admins)

#### `/turno listar`
Lista todos os turnos ativos no servidor.

#### `/turno forcar-encerrar [@usuario]`
Encerra forçadamente um turno preso. Libera as armas e exclui o canal de voz órfão.

---

### Comandos administrativos

| Comando | Descrição |
|---|---|
| `/unidade registrar|listar|remover` | Gerencia unidades operacionais (máx. 25) |
| `/veiculo registrar|listar|remover` | Gerencia viaturas (máx. 25) |
| `/configurar` | Todos os canais, categorias e cargos do servidor |
| `/configuracoes` | Exibe status de todas as configurações |
| `/apagar-mensagem <id> [canal]` | Apaga uma mensagem do bot pelo ID (admins e gestores) |

---

## Painéis de Botões

Os painéis são mensagens fixas em canais dedicados com botões que substituem comandos slash. Todas as respostas são **efêmeras** (visíveis apenas para quem clicou).

> Para atualizar um painel após mudanças no bot, execute `/configurar canal-painel` (ou admin/ia) novamente no mesmo canal — o bot apaga a mensagem antiga e publica uma nova.

---

### Painel Operacional — `/configurar canal-painel`

Disponível para todos os oficiais com acesso ao bot.

| Botão | Ação |
|---|---|
| 🔫 **Registrar Arma** | Modal com nome e número de série |
| 🗄️ **Ver Arsenal** | Exibe suas armas ativas |
| 🚨 **Extravio de Arma** | **Supervisor/admin:** modal com série + observação. **Oficial comum:** select menu com suas armas ativas → modal de observação |
| 👮 **Ver Perfil** | Exibe seu perfil operacional (distrito, callsign, distintivo) |
| ~~📋 **Abrir Relatório**~~ | ~~Inicia o fluxo de criação de Relatório de Serviço~~ *(desabilitado temporariamente — botão removido do painel; rotina mantida no código)* |
| ~~🔎 **Consultar Relatórios**~~ | ~~Busca relatórios com filtros opcionais (tipo, envolvido, situação)~~ *(desabilitado temporariamente)* |
| 🚦 **Advertência de Trânsito** | Modal em 2 etapas para registrar uma advertência (condutor, CitizenID, placa, prazo, infrações, descrição) |
| 🚧 **Consultar Advertências** | Modal de busca por CitizenID e/ou placa (aceita placa parcial) |
| 🚔 **Iniciar Turno** | Abre a tela de montagem da unidade (mesmo fluxo do `/iniciar`) |
| 📕 **Encerrar Turno** | Encerra o turno ativo do oficial sem precisar localizar a embed |

---

### Painel Administrativo — `/configurar canal-painel-admin`

Exclusivo para supervisores e administradores.

| Botão | Ação |
|---|---|
| 🪪 **Definir Perfil** | Seleciona o oficial → modal pré-preenchido com os dados atuais |
| 📊 **Resumo** | Seleciona o oficial → estatísticas de turnos e armamentos |
| 📋 **Histórico de Turnos** | Seleciona o oficial → lista paginada dos últimos turnos |
| 🗄️ **Arsenal** | Seleciona o oficial → arsenal completo com histórico de extravios |
| 🚔 **Turnos em Andamento** | Lista todos os turnos ativos no servidor |
| 📢 **Comunicado Geral** | Modal (título, mensagem, emojis) → publica um comunicado no canal configurado, marcando `@everyone` + cargos policiais e reagindo com os emojis informados |
| 🗑️ **Remover Callsign** | Seleciona o oficial → confirma → remove o perfil operacional e atualiza o quadro de callsigns (ex: demissão) |

---

### Painel de Assuntos Internos — `/configurar canal-painel-ia`

Exclusivo para a equipe de Assuntos Internos (admins, supervisores e cargo de IA).

| Botão | Ação |
|---|---|
| 📂 **Abrir Investigação** | Inicia o fluxo completo de abertura |
| 📋 **Listar** | Select de oficial para filtrar, ou botão "Listar Todas" |
| 🔎 **Ver Investigação** | Modal com número do caso → exibe embed da investigação |
| 🗑️ **Deletar** | Modal com número do caso (restrito a supervisores/admins) |

---

### Painel Civil — `/configurar canal-painel-civil`

Aberto a qualquer membro do servidor (ouvidoria pública), salvo se um **cargo de cidadão** for configurado via `/configurar-cargos cargo-cidadao` — nesse caso, somente quem possui esse cargo (ou acesso policial/admin) pode usar os botões de denúncia.

| Botão | Ação |
|---|---|
| 📢 **Fazer Denúncia** | Abre o formulário de denúncia (identificada ou anônima) |
| 📂 **Minhas Denúncias** | Lista as denúncias identificadas registradas pelo próprio usuário |

---

## Assuntos Internos (IA)

### Configuração

```
/configurar canal-ia          #assuntos-internos     ← quadros de investigação
/configurar categoria-ia      Assuntos Internos      ← canais temporários de provas
/configurar canal-provas-ia   #provas-ia             ← arquivo permanente de provas
/configurar-cargos cargo-ia @Assuntos Internos Adicionar
```

> 💡 Quem possui o cargo de Assuntos Internos é equiparado a supervisor nas rotinas operacionais de gestão de oficiais: `/oficial definir`/`ver` (terceiros), Remover Callsign, pausar/retomar e encerrar turno alheio, `/arma extravio` de qualquer arma, `/historico`, `/turno listar`/`forcar-encerrar` e alteração de status de Relatório de Serviço.

### Abrir uma investigação — `/ia abrir` ou Painel de IA

**Etapa 1 — Identificação**
- Origem: 🟦 Civil | 🟥 Interna (Blue-on-Blue) | ⬛ OIS
- Oficial(is) acusado(s)/envolvido(s) — seleção múltipla, até 10 oficiais

**Etapa 2 — Detalhes do Incidente** (modal)

| Campo | Obrigatório |
|---|:---:|
| Viatura no dia | Não |
| Data e Hora (DD/MM/AAAA HH:MM) | Não |
| Local do Incidente | Não |
| Classificação / Motivo | **Sim** |
| Identificação do Reclamante | Não |

**Etapa 3 — Descrição**

Modal com o relato detalhado do ocorrido.

**Etapa 4 — Provas**

Após a descrição, o oficial escolhe:
- **Pular** → investigação criada sem provas
- **Adicionar Provas** → o bot cria automaticamente um canal temporário `provas-ia-2026-001` na categoria de IA. O oficial envia arquivos, imagens ou links. Ao clicar **✅ Confirmar Provas**, o bot:
  1. Coleta todos os arquivos e textos enviados
  2. **Rehospeda os arquivos no canal de arquivo** para garantir URLs permanentes
  3. Cria a investigação com os links persistentes
  4. **Deleta o canal temporário**

### Quadro da investigação

Cada investigação gera uma embed persistente no canal de IA com todos os dados e botões de gerenciamento:

#### Botões de status (enquanto ativa)
| Botão | Estado resultante |
|---|---|
| 🟢 Ativar | Em andamento |
| 🟡 Suspender | Suspensa temporariamente |

#### Botões de gerenciamento (enquanto não encerrada)
| Botão | Ação |
|---|---|
| ➕ **Adicionar Acusado** | Adiciona mais oficiais à lista de acusados (multi-select, até 10) |
| ✏️ **Editar Descrição** | Abre modal pré-preenchido com a descrição atual para edição |
| 📎 **Adicionar Provas** | Mesmo fluxo de canal temporário — novas provas são acrescentadas às existentes |

#### Encerramento
1. Select de **veredicto**: Sustentado / Não Sustentado / Exonerado / Infundado
2. Modal de **penalidade** (opcional)
3. Após encerrar, botões para marcar aplicação: ✅ Aplicada / ❌ Não Aplicada / 🔶 Com Modificações

### Outros comandos de IA

| Comando | Descrição |
|---|---|
| `/ia listar [@usuario]` | Lista investigações, com filtro opcional por oficial envolvido |
| `/ia ver <numero>` | Exibe detalhes de uma investigação pelo número do caso |
| `/ia deletar <numero>` | Deleta permanentemente (supervisores/admins) |

---

## Relatórios de Serviço (SR)

> ⚠️ **Funcionalidade temporariamente desabilitada.** Os botões **Abrir Relatório** e **Consultar Relatórios** foram removidos do Painel Operacional. Não há comando slash alternativo — o acesso estava exclusivamente pelos botões. Toda a rotina (handlers, modals, services, repositories, migrations) permanece intacta no código para reativação futura.

Sistema para registro de ocorrências atendidas em campo, prisões e crimes não resolvidos. Acessível pelo botão **📋 Abrir Relatório** no painel operacional ou via fluxo guiado.

### Configuração

```
/configurar canal-relatorios-sr  #relatorios-servico   ← quadros de relatório
/configurar categoria-sr         Relatórios             ← canais temporários de provas
/configurar canal-provas-sr      #provas-sr             ← arquivo permanente de provas
```

### Abrir um relatório — Painel Operacional → Abrir Relatório

**Etapa 1 — Identificação**
- O oficial que abre é automaticamente o **responsável**
- Tipo: 🟦 Relatório de Ocorrência | 🟩 Relatório de Prisão/Captura | 🟥 Crime Não Resolvido
- Outros oficiais envolvidos (seleção múltipla opcional, até 10)

**Etapa 2 — Detalhes** (modal com 5 campos)

| Campo | Obrigatório |
|---|:---:|
| Local do Incidente | Não |
| Data e Hora (DD/MM/AAAA HH:MM) | Não |
| Descrição do Ocorrido | **Sim** |
| Suspeitos / Envolvidos Civis | Não |
| Itens Apreendidos | Não |

**Etapa 3 — Provas**

Mesmo fluxo do sistema de IA: canal temporário criado na categoria SR, arquivos rehospedados no canal de provas SR antes de deletar o canal temporário.

### Quadro do relatório

Embed persistente no canal de relatórios com todos os dados e botões de gerenciamento.

#### Fluxo de status por tipo

| Tipo | Status inicial | Transições disponíveis |
|---|---|---|
| 🟦 Ocorrência | 🟡 Em Análise | → 🔵 Finalizado |
| 🟩 Prisão/Captura | 🟡 Em Análise | → 🔵 Finalizado |
| 🟥 Crime Não Resolvido | 🟡 Em Análise | → 🟢 Resolvido · ⚫ Arquivado |

> Somente o **responsável pelo relatório**, **supervisores** e **administradores** podem alterar o status.

#### Botões de gerenciamento (enquanto Em Análise)

| Botão | Ação |
|---|---|
| ➕ **Adicionar Oficial** | Adiciona mais oficiais ao relatório (multi-select, até 10) |
| ✏️ **Editar Descrição** | Abre modal pré-preenchido com a descrição atual |
| 📎 **Adicionar Provas** | Canal temporário para novas provas — acrescenta às existentes |

### Consultar relatórios — Painel Operacional → 🔎 Consultar Relatórios

Busca relatórios com filtros **totalmente opcionais** — combine quantos quiser ou nenhum:

| Filtro | Tipo |
|---|---|
| Tipo | Select (Ocorrência / Prisão-Captura / Crime Não Resolvido) |
| Envolvido | Select de usuário |
| Situação | Select (Em Análise / Finalizado / Resolvido / Arquivado) |

Sem nenhum filtro selecionado, lista todos os relatórios do servidor (até 15 por consulta, com contagem total).

---

## Ouvidoria Civil (Denúncias)

Canal de denúncias aberto a qualquer membro do servidor, totalmente separado do sistema de Assuntos Internos. A denúncia **não** vira automaticamente um registro de IA — primeiro é encaminhada para um canal de avaliação, onde um oficial da Corregedoria decide se abre ou não uma investigação interna.

### Configuração

```
/configurar canal-painel-civil               #ouvidoria              ← painel público de denúncias
/configurar canal-denuncias-civis            #avaliacao-denuncias    ← avaliação pela Corregedoria
/configurar categoria-denuncias-civis        Denúncias Civis         ← canais temporários de provas
/configurar canal-provas-denuncias-civis     #provas-denuncias       ← arquivo permanente de provas
```

### Registrar uma denúncia — Painel Civil → 📢 Fazer Denúncia

**Etapa 1 — Formulário** (modal)

| Campo | Obrigatório |
|---|:---:|
| CitizenID | Não — deixe em branco para denúncia anônima |
| Seu nome | Não — deixe em branco para denúncia anônima |
| Telefone para contato | Não |
| Assunto / Policial envolvido | **Sim** |
| Descreva o ocorrido | **Sim** |

> CitizenID e nome são opcionais: deixando-os em branco, a denúncia é marcada como **anônima** e exibida como **🕵️ Anônimo** para a Corregedoria. O vínculo com o usuário do Discord é mantido internamente (para fins de moderação/abuso), mas denúncias anônimas **não aparecem em "Minhas Denúncias"** — guarde o número do registro exibido na confirmação caso precise dele depois.

**Etapa 2 — Provas**

Mesmo fluxo de canal temporário usado em IA/SR: o civil pode **Adicionar Provas** (cria canal temporário, envia arquivos/links e confirma — os arquivos são rehospedados no canal de arquivo antes do canal ser deletado) ou **Enviar sem Provas**.

### Avaliação pela Corregedoria

Cada denúncia gera um card no canal de avaliação configurado, visível apenas à equipe de Assuntos Internos, com:

| Botão | Ação |
|---|---|
| ✅ **Aceitar — Abrir Investigação** | Marca a denúncia como aceita; o oficial deve então abrir a investigação interna pelo Painel de IA (origem Civil), referenciando o número da denúncia como identificação do reclamante |
| ❌ **Arquivar** | Modal com justificativa opcional — encerra a denúncia sem abrir investigação |

### Consultar denúncias — Painel Civil → 📂 Minhas Denúncias

Lista as denúncias feitas pelo próprio usuário, com número, assunto e status atual (Aguardando avaliação / Aceita / Arquivada).

---

## Advertências de Trânsito

Registro e consulta de advertências de trânsito direto pelo Painel Operacional, sem precisar de comandos.

### Configuração

```
/configurar canal-notificacoes-transito   #notificacoes-transito   ← canal de notificações de novas advertências
```

### Registrar — Painel Operacional → 🚦 Advertência de Trânsito

Como o formulário tem 6 campos e o Discord permite no máximo 5 por modal, o registro é feito em **duas etapas**:

**Etapa 1**

| Campo | Obrigatório |
|---|:---:|
| Nome do condutor | **Sim** |
| CitizenID | **Sim** |
| Placa do veículo | Não |
| Prazo da advertência | Não |

**Etapa 2**

| Campo | Obrigatório |
|---|:---:|
| Infrações cometidas | **Sim** |
| Descrição do ocorrido | Não |

Ao confirmar, a advertência recebe um número sequencial (`ADV-AAAA-NNN`), é vinculada a quem registrou e, se o canal de notificações estiver configurado, um embed é publicado automaticamente nesse canal.

### Consultar — Painel Operacional → 🚧 Consultar Advertências

Modal com dois filtros **opcionais**: CitizenID e placa. A busca por placa aceita correspondência **parcial** (ex.: informar apenas os 4 últimos dígitos retorna todas as placas que contenham esse trecho).

---

## Comunicado Geral

Permite que supervisores e administradores publiquem avisos para todos os oficiais sem sair do Discord.

### Publicar — Painel Administrativo → 📢 Comunicado Geral

Abre um modal com:

| Campo | Obrigatório |
|---|:---:|
| Título do comunicado | **Sim** |
| Mensagem | **Sim** |
| Emojis para reação (separados por espaço) | Não |

O comunicado é publicado no canal configurado em `/configurar canal-comunicados` como um embed; o bot reage automaticamente com os emojis informados (ex.: ✅ para os oficiais confirmarem leitura). Em seguida, em uma mensagem separada **logo após o quadro do aviso**, o bot menciona `@everyone` e todos os cargos definidos em `/configurar-cargos cargo-policia`, garantindo que todos os oficiais sejam notificados.

---

## Controle de permissões

| Ação | Oficial | Resp. Unidade | Supervisor | Membro IA | Gestor Config | Admin |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `/oficial definir` | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| `/oficial ver` (próprio) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/oficial ver` (alheio) | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Iniciar turno | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pausar / Retornar (própria unidade) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pausar / Retornar (unidade alheia) | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Arma Perdida — própria arma | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Arma Perdida — arma de outro membro | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Encerrar turno (própria unidade) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Encerrar turno alheio | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| `/arma registrar` / `arsenal` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/arma extravio` (própria arma) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/arma extravio` (qualquer arma) | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| `/historico` | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| `/turno listar` | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| `/turno forcar-encerrar` (próprio) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/turno forcar-encerrar` (alheio) | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Painel Operacional | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Painel Administrativo | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Abrir / gerenciar Relatório de Serviço | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Alterar status de Relatório de Serviço | Resp.¹ | Resp.¹ | ✅ | ❌ | ❌ | ✅ |
| `/ia abrir`, listar, ver, alterar status | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| `/ia deletar` | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Painel de IA | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| Registrar / consultar Advertência de Trânsito | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Comunicado Geral | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Remover oficial do Quadro de Callsigns | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Painel Civil (denúncias) | Cidadão²| Cidadão²| ✅ | ✅ | ✅ | ✅ |
| `/configurar`, `/veiculo`, `/unidade` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `/apagar-mensagem` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `/configurar-cargos cargo-gestor` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

> ¹ **Responsável** = oficial que abriu o relatório (`opened_by_discord_id`).
> **Responsável da unidade** = oficial que executou `/iniciar` (papel `LEADER`).
> ² **Cidadão** = se um cargo de cidadão estiver definido via `/configurar-cargos cargo-cidadao`, somente quem o possui (além de oficiais e admins) pode usar o Painel Civil; sem cargo configurado, qualquer membro pode usar.
> **Membro de IA** = cargo definido via `/configurar-cargos cargo-ia`.
> **Gestor de Configuração** = cargo definido via `/configurar-cargos cargo-gestor`.

---

## Banco de dados

O sistema usa **PostgreSQL** com migrações versionadas em `database/migrations/`.
Execute `npm run db:migrate` para aplicar todas as migrações pendentes.

### Tabelas

| Tabela | Descrição |
|---|---|
| `users` | Oficiais registrados |
| `official_profiles` | Perfil operacional (distrito, callsign, distintivo) |
| `shifts` | Turnos/unidades operacionais |
| `shift_members` | Participantes de cada unidade (`LEADER` / `MEMBER`) |
| `pauses` | Pausas com timestamps e duração |
| `weapons` | Estado atual de cada arma no servidor |
| `official_weapons` | Arsenal pessoal por oficial + servidor |
| `weapon_losses` | Histórico de extravios |
| `ia_investigations` | Investigações internas de Assuntos Internos |
| `service_reports` | Relatórios de Serviço (ocorrências, prisões, crimes) |
| `civil_complaints` | Denúncias civis (Ouvidoria) e seu status de avaliação |
| `traffic_warnings` | Advertências de trânsito registradas pelos oficiais |
| `vehicles` | Viaturas disponíveis por servidor |
| `units` | Unidades operacionais disponíveis por servidor |
| `guild_config` | Todas as configurações do servidor |
| `bot_config` | Configurações globais do bot |
| `migrations` | Controle de migrações executadas |

### Chaves relevantes em `guild_config`

| Chave | Descrição |
|---|---|
| `shift_channel_id` | Canal das embeds de turno |
| `report_channel_id` | Canal de relatórios de encerramento |
| `weapon_report_channel_id` | Canal de armamento |
| `voice_category_id` | Categoria dos canais de voz |
| `callsign_channel_id` | Canal do quadro de callsigns |
| `callsign_message_id` | ID da mensagem persistente do quadro (interno) |
| `ia_channel_id` | Canal dos quadros de investigações |
| `ia_category_id` | Categoria para canais temporários de provas de IA |
| `ia_evidence_channel_id` | Canal de arquivo permanente de provas de IA |
| `ia_role_ids` | JSON array de cargos de Assuntos Internos |
| `sr_channel_id` | Canal dos quadros de Relatórios de Serviço |
| `sr_category_id` | Categoria para canais temporários de provas de SR |
| `sr_evidence_channel_id` | Canal de arquivo permanente de provas de SR |
| `panel_channel_id` | Canal do painel operacional |
| `panel_message_id` | ID da mensagem persistente do painel (interno) |
| `admin_panel_channel_id` | Canal do painel administrativo |
| `admin_panel_message_id` | ID da mensagem persistente do painel admin (interno) |
| `ia_panel_channel_id` | Canal do painel de IA |
| `ia_panel_message_id` | ID da mensagem persistente do painel de IA (interno) |
| `ia_measures_channel_id` | Canal de alertas de medidas disciplinares |
| `civil_panel_channel_id` | Canal do painel de denúncias civis |
| `civil_panel_message_id` | ID da mensagem persistente do painel civil (interno) |
| `civil_complaints_channel_id` | Canal de avaliação das denúncias pela Corregedoria |
| `civil_complaints_category_id` | Categoria para canais temporários de provas de denúncias civis |
| `civil_evidence_channel_id` | Canal de arquivo permanente de provas de denúncias civis |
| `traffic_warnings_channel_id` | Canal de notificações de novas advertências de trânsito |
| `announcements_channel_id` | Canal onde os comunicados gerais são publicados |
| `supervisor_role_ids` | JSON array de cargos supervisores |
| `config_manager_role_ids` | JSON array de cargos gestores de configuração |
| `police_role_ids` | JSON array de cargos com acesso ao bot |
| `citizen_role_ids` | JSON array de cargos de cidadão (acesso restrito à Ouvidoria Civil) |

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

### Erro ao iniciar turno — "configure seu perfil"
- Um supervisor deve usar `/oficial definir` ou o **Painel Administrativo** para configurar o perfil do oficial

### Botões desabilitados ao iniciar turno
- Nenhuma unidade cadastrada — use `/unidade registrar`

### Canal de voz criado sem permissão de falar
- Comportamento esperado — o responsável da unidade deve liberar manualmente

### Painel duplicado no canal
- Use `/apagar-mensagem <id>` para remover a mensagem antiga
- Ao reconfigurar `/configurar canal-painel`, o bot agora apaga automaticamente a mensagem anterior

### Painel não aparece após configurar o canal
- O painel é publicado automaticamente ao executar `/configurar canal-painel` (ou admin/ia)
- Se foi deletado manualmente, execute o `/configurar` novamente no mesmo canal para republicar

### Erro ao criar canal temporário de provas de IA
- Verifique se `/configurar categoria-ia` está configurado
- Confirme que o bot tem permissão `Manage Channels` e `Manage Permissions` na categoria de IA

### Erro ao criar canal temporário de provas de SR
- Verifique se `/configurar categoria-sr` está configurado
- Confirme que o bot tem permissão `Manage Channels` e `Manage Permissions` na categoria de SR

### Provas não aparecem no relatório/investigação
- Verifique se o canal de provas correspondente (`canal-provas-ia` ou `canal-provas-sr`) está configurado
- Confirme que o bot tem permissão `Send Messages` e `Attach Files` nesse canal

### Quadro de callsigns não atualiza
- Verifique se o bot tem permissão `Read Message History` no canal de callsigns

### Canal de voz não é criado
- Confirme que `/configurar categoria-voz` está configurado
- Verifique se o bot tem permissão `Manage Channels` na categoria

### Ver logs em produção (PM2)
```bash
pm2 logs police-bot --lines 100
pm2 logs police-bot --err
```
