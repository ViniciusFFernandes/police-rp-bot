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
16. [Assuntos Internos (IA)](#assuntos-internos-ia)
17. [Controle de permissões](#controle-de-permissões)
18. [Banco de dados](#banco-de-dados)
19. [Solução de problemas](#solução-de-problemas)
20. [Roadmap](#roadmap)

---

## Descrição

O **Police RP Bot** é um sistema completo para gerenciar as operações de um departamento policial em servidores de Discord focados em roleplay.

### O que ele resolve

| Problema manual | Solução do bot |
|---|---|
| Turno individual registrado por oficial | Unidade Operacional com líder + membros (`3-A-12`, `1-L-20`) |
| Digitar distrito e callsign a cada turno | Perfil do oficial salvo — `/iniciar` carrega automaticamente |
| Canal de voz criado manualmente | Canal criado como `Viatura-Callsign` (ex: `Ford Explorer-3-A-12`) |
| Digitar seriais de arma a cada turno | Arsenal de toda a equipe carregado automaticamente |
| Escolher viatura manualmente | Seleção a partir do cadastro de viaturas do servidor |
| Unidades digitadas livremente | Cadastro de unidades operacionais (`A`, `L`, `K`, `RPM`...) |
| Lista de callsigns espalhada | Quadro de callsigns mantido automaticamente em canal dedicado |
| Extravios registrados no chat | Modal dedicado + regras de permissão por papel na unidade |
| Relatórios escritos manualmente | Gerado automaticamente com motivo de encerramento |
| Reabrir turno manualmente após mudança de equipe | Fluxo de **Remodulação** com nova unidade imediata |
| Histórico apenas de quem liderou | `/historico` contabiliza participações como líder e como membro |
| Investigações internas no chat | Sistema completo de IA com fluxo guiado, quadro persistente e status |
| Configuração restrita ao admin do Discord | Cargos gestores de configuração configuráveis pelo admin |
| Configuração via arquivo `.env` | Tudo configurável via comandos slash, por servidor |
| Canal de turnos poluído | Mensagens de usuários deletadas automaticamente em 10s |

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
| `Manage Channels` | Criar e excluir canais de voz de turno |
| `Send Messages` | Postar embeds e relatórios |
| `Embed Links` | Enviar embeds formatadas |
| `Read Message History` | Editar embeds de turno e o quadro de callsigns |
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

A configuração é feita inteiramente por **comandos slash**. Por padrão, apenas **Administradores** do servidor podem configurar o bot — mas é possível delegar isso a cargos específicos via `/configurar cargo-gestor`.

### Passo 1 — Canais obrigatórios

```
/configurar canal-turnos     #canal-turnos
/configurar canal-relatorios #canal-relatorios
/configurar canal-armamento  #canal-armamento
/configurar categoria-voz    Operações PD
```

### Passo 2 — Cargos supervisores

```
/configurar cargo-supervisor @Supervisor Adicionar
/configurar cargo-supervisor @Comandante Adicionar
```

Supervisores podem gerenciar turnos de outros oficiais, consultar históricos, registrar extravios de qualquer arma e editar perfis de outros oficiais.

### Passo 3 — Cargos gestores de configuração (opcional)

```
/configurar cargo-gestor @Gestor Adicionar
```

Gestores podem usar `/configurar`, `/configuracoes`, `/veiculo` e `/unidade`, mas **não** podem gerenciar os próprios cargos gestores (exclusivo de Administradores).

### Passo 4 — Unidades operacionais

```
/unidade registrar A
/unidade registrar L
/unidade registrar K
/unidade registrar RPM
```

Com unidades cadastradas, o oficial as seleciona ao iniciar o turno. Sem unidades cadastradas, os botões de confirmação ficam desabilitados.

### Passo 5 — Viaturas (opcional)

```
/veiculo registrar Ford Explorer
/veiculo registrar Ford Victoria
/veiculo registrar Tesla Model Y
```

Com viaturas cadastradas, o oficial escolhe a viatura ao iniciar o turno e o canal de voz é criado como `Ford Explorer-3-A-12`.

### Passo 6 — Canal e cargos de Assuntos Internos (opcional)

```
/configurar canal-ia #assuntos-internos
/configurar cargo-ia @Assuntos Internos Adicionar
```

Membros com o cargo de IA podem abrir e gerenciar investigações internas junto com Supervisores e Administradores.

### Passo 7 — Canal de callsigns (opcional)

```
/configurar canal-callsign #callsigns
```

O bot publica imediatamente um **quadro de callsigns** no canal e o mantém atualizado automaticamente sempre que um perfil for definido ou editado.

### Passo 8 — Verificar configuração

```
/configuracoes
```

Exibe uma embed com o status de todos os itens configurados.

### Referência — comandos de configuração

| Comando | Descrição |
|---|---|
| `/configurar canal-turnos` | Canal das embeds de turno |
| `/configurar canal-relatorios` | Canal de relatórios de encerramento |
| `/configurar canal-armamento` | Canal de notificações de armamento |
| `/configurar categoria-voz` | Categoria dos canais de voz automáticos |
| `/configurar canal-callsign` | Canal do quadro de callsigns automático |
| `/configurar canal-ia` | Canal dos quadros de investigações de Assuntos Internos |
| `/configurar cargo-supervisor` | Adiciona ou remove um cargo supervisor |
| `/configurar cargo-ia` | Adiciona ou remove um cargo de Assuntos Internos |
| `/configurar cargo-gestor` | Adiciona ou remove um cargo gestor de configuração (somente Admins) |
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
│   │   │   ├── configurar.js        # /configurar (10 subcomandos, incluindo canal-ia e cargo-ia)
│   │   │   ├── configuracoes.js     # /configuracoes
│   │   │   ├── veiculo.js           # /veiculo registrar|listar|remover
│   │   │   └── unidade.js           # /unidade registrar|listar|remover
│   │   ├── shift/
│   │   │   ├── iniciar.js           # /iniciar → carrega perfil e abre composição
│   │   │   └── oficial.js           # /oficial definir|ver (com distintivo)
│   │   ├── ia/
│   │   │   └── investigacao.js      # /ia abrir|listar
│   │   ├── history/
│   │   │   └── historico.js         # /historico resumo|turnos|arsenal
│   │   └── weapon/
│   │       └── arma.js              # /arma consultar|registrar|arsenal|extravio
│   │
│   ├── events/
│   │   ├── ready.js
│   │   ├── guildCreate.js           # Detecta novo servidor → boas-vindas + guia
│   │   ├── interactionCreate.js     # Guard de configuração + roteamento
│   │   └── messageCreate.js         # Auto-delete 10s no canal de turnos
│   │
│   ├── buttons/
│   │   ├── shiftButtons.js          # Pausar, Retornar, Arma Perdida, Adicionar Arma, Encerrar
│   │   ├── shiftCompose.js          # Seleção de unidade/viatura/membros + confirmação
│   │   ├── shiftEnd.js              # Motivo de encerramento + fluxo de remodulação
│   │   ├── iaFlow.js                # Seleção de origem/oficial + abertura dos modais de IA
│   │   └── iaBoard.js               # Botões do quadro: alterar status, encerrar, penalidade
│   │
│   ├── modals/
│   │   ├── endReasonModal.js        # Encerramento com motivo "Outro" (texto livre)
│   │   ├── weaponLossModal.js       # Extravio durante turno
│   │   ├── addWeaponModal.js        # Adição de arma ao turno
│   │   ├── iaDetailsModal.js        # Detalhes do incidente (etapa 2 do fluxo de IA)
│   │   ├── iaDescriptionModal.js    # Descrição + provas; cria a investigação (etapa 3)
│   │   └── iaCloseModal.js          # Veredicto + penalidade ao encerrar investigação
│   │
│   ├── services/
│   │   ├── shiftService.js          # Lógica de turno (start/pause/resume/end/loss/addWeapon)
│   │   ├── callsignBoardService.js  # Cria/edita a mensagem do quadro de callsigns
│   │   ├── iaService.js             # Embed do quadro de investigação + publicação/atualização
│   │   └── guildConfigService.js    # Lógica de configuração por servidor
│   │
│   ├── repositories/
│   │   ├── userRepository.js
│   │   ├── shiftRepository.js
│   │   ├── shiftMemberRepository.js
│   │   ├── pauseRepository.js
│   │   ├── weaponRepository.js
│   │   ├── weaponLossRepository.js
│   │   ├── officialWeaponRepository.js
│   │   ├── officialProfileRepository.js  # Perfil operacional (distrito + callsign + distintivo)
│   │   ├── iaRepository.js               # CRUD das investigações internas
│   │   ├── vehicleRepository.js
│   │   ├── unitRepository.js
│   │   └── guildConfigRepository.js
│   │
│   ├── database/
│   │   └── pool.js
│   │
│   ├── handlers/
│   │   ├── commandHandler.js
│   │   ├── buttonHandler.js         # Roteia botões e select menus por prefixo de customId
│   │   └── modalHandler.js          # Roteia modals (exact match + prefix matcher)
│   │
│   ├── utils/
│   │   ├── logger.js
│   │   ├── embeds.js
│   │   ├── time.js
│   │   ├── permissions.js           # isSupervisor, isAdmin, isConfigManager, canManageShift
│   │   ├── configGuard.js
│   │   ├── pendingComposition.js    # Store temporário entre interações de composição
│   │   ├── pendingIA.js             # Store temporário do fluxo multi-etapa de IA (TTL 15min)
│   │   ├── openCompositionScreen.js # Abre tela de montagem da unidade (reutilizado)
│   │   └── guildWhitelist.js
│   │
│   └── index.js
│
├── database/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql       # users, shifts, weapons, pauses, weapon_losses
│   │   ├── 002_guild_config.sql         # guild_config
│   │   ├── 003_add_guild_id.sql         # guild_id em shifts e weapons
│   │   ├── 004_weapons_guild_unique.sql # Constraint serial+guild
│   │   ├── 005_official_weapons.sql     # Arsenal pessoal por oficial
│   │   ├── 006_bot_config.sql           # bot_config
│   │   ├── 007_shift_members.sql        # shift_members + end_reason em shifts
│   │   ├── 008_vehicles.sql             # vehicles + vehicle_name em shifts
│   │   ├── 009_units.sql                # Unidades operacionais por servidor
│   │   ├── 010_config_manager_roles.sql # config_manager_role_ids em guild_config
│   │   └── 011_official_profiles.sql    # Perfil operacional do oficial
│   └── migrate.js
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

Antes de usar `/iniciar` pela primeira vez, cada oficial deve configurar seu perfil com distrito e callsign. Isso elimina a necessidade de digitar essas informações a cada turno.

#### `/oficial definir <distrito> <callsign> [distintivo] [@usuario]`

Define o distrito, callsign e distintivo (badge) do oficial neste servidor.

- **Sem `@usuario`:** define o próprio perfil.
- **Com `@usuario`:** define o perfil de outro oficial — restrito a supervisores e administradores.
- **`distintivo`** é opcional mas necessário para que investigações de IA preencham o campo automaticamente.

```
/oficial definir distrito:3 callsign:12 distintivo:4521
/oficial definir distrito:1 callsign:07 usuario:@João
```

#### `/oficial ver [@usuario]`

Exibe o perfil operacional. Ver perfil de outros é restrito a supervisores e administradores.

---

### Quadro de Callsigns

Quando o canal de callsigns está configurado (`/configurar canal-callsign`), o bot mantém uma **mensagem única e persistente** nesse canal com todos os oficiais agrupados por distrito.

Cada distrito é exibido em um bloco de código com colunas alinhadas de **Distintivo**, **Callsign** e **Nome**:

```
📋 Quadro de Callsigns Operacionais

🗺️ Distrito 1
┌────────────────────────────────┐
DISTINT CSN   OFICIAL
#0721   007   João Silva
———     020   Carlos
└────────────────────────────────┘

🗺️ Distrito 3
┌────────────────────────────────┐
DISTINT CSN   OFICIAL
#4521   012   Vinicius
#1234   053   Pedro
└────────────────────────────────┘
```

A mensagem é editada automaticamente sempre que um perfil é criado ou alterado. Oficiais sem distintivo cadastrado aparecem com `———`. Se a mensagem for deletada manualmente, é recriada na próxima atualização.

---

### Iniciar turno — `/iniciar`

Com o perfil configurado, `/iniciar` carrega distrito e callsign automaticamente e abre a **tela de montagem da unidade**:

| Seletor | Quando aparece | Obrigatoriedade |
|---|---|---|
| **Unidade** (`A`, `L`, `K`...) | Sempre que houver unidades cadastradas | Obrigatório — botões desabilitados até selecionar |
| **Viatura** | Quando houver viaturas cadastradas | Opcional |
| **Oficiais adicionais** | Sempre | Opcional (até 5) |

Botões: **Iniciar Turno** (com os adicionais selecionados) ou **Apenas eu** (unidade individual).

O callsign final é montado como `Distrito-Unidade-Callsign` (ex: `3-A-12`).

**Ao confirmar, o bot:**
- Cria **um único turno** para toda a unidade, registrando cada participante (`LEADER` / `MEMBER`).
- Cria **um único canal de voz** nomeado como `Viatura-Callsign` (ex: `Ford Explorer-3-A-12`). Sem viatura, usa só o callsign.
- **Vincula automaticamente** as armas ativas do arsenal de **todos os participantes**.

> **Composição fixa:** a equipe é definida no início. Para alterar (entrada/saída de membro, troca de motorista), encerre com motivo **Remodulação** e inicie nova unidade.

---

### Botões da embed de turno

**Grupo 1 — Controle de turno**

| Botão | Ação |
|---|---|
| **Pausar** | Registra pausa; embed fica amarela |
| **Retornar ao Serviço** | Encerra a pausa; embed fica verde |
| **Arma Perdida** | Abre modal (série + observação); aplica regras de permissão; envia relatório |
| **Encerrar Turno** | Exibe seleção de motivo; calcula tempos; envia relatório; exclui canal de voz |

**Grupo 2 — Gestão de armamento**

| Botão | Ação |
|---|---|
| **Adicionar Arma** | Abre modal (nome + série); registra no arsenal e no turno |

#### Encerramento e motivo

| Motivo | Comportamento |
|---|---|
| **Fim de Patrulha** | Gera relatório, encerra canal de voz, desativa embed |
| **Remodulação** | Gera relatório, encerra canal de voz, oferece iniciar nova unidade imediatamente |
| **Outro** | Abre campo de texto opcional para motivo personalizado antes de encerrar |

O motivo é salvo no banco e exibido no relatório.

---

### Canal de turnos — limpeza automática

- Qualquer mensagem enviada por usuários no canal de turnos é **deletada após 10 segundos**.
- Apenas as embeds do bot permanecem visíveis.

---

### Armamentos

#### `/arma registrar <nome> <serie>`
Cadastra uma arma no arsenal pessoal do oficial. Será carregada automaticamente nos próximos turnos.

#### `/arma arsenal`
Lista as armas ativas do arsenal (disponíveis e em uso). Extraviadas são visíveis apenas para supervisores via `/historico arsenal`.

#### `/arma extravio <serie> [observacao]`
Registra extravio fora de um turno ativo. Dentro de um turno, usa o botão **Arma Perdida** na embed.

#### `/arma consultar <serie>`
Status atual, último oficial, último callsign e histórico completo de extravios.

---

### Histórico (supervisores e admins)

#### `/historico resumo @usuario`
Total de turnos, tempo efetivo, tempo em pausa, pausas e extravios. Contabiliza **todas as participações** — como líder e como membro adicional.

#### `/historico turnos @usuario [pagina]`
Lista paginada (8 por página) dos turnos encerrados em que o oficial participou.

#### `/historico arsenal @usuario`
Arsenal completo incluindo armas extraviadas, histórico de uso e extravios.

---

### Comandos administrativos

#### Configuração do servidor

| Comando | Opção | Descrição |
|---|---|---|
| `/configurar` | `canal-turnos` | Canal das embeds de turno |
| `/configurar` | `canal-relatorios` | Canal de relatórios de encerramento |
| `/configurar` | `canal-armamento` | Canal de notificações de armamento |
| `/configurar` | `categoria-voz` | Categoria dos canais de voz automáticos |
| `/configurar` | `canal-callsign` | Canal do quadro de callsigns automático |
| `/configurar` | `canal-ia` | Canal dos quadros de investigações internas |
| `/configurar` | `cargo-supervisor` | Gerencia cargos supervisores |
| `/configurar` | `cargo-ia` | Gerencia cargos de Assuntos Internos |
| `/configurar` | `cargo-gestor` | Gerencia cargos gestores de configuração (somente Admins) |
| `/configuracoes` | — | Exibe status de todas as configurações |

#### Unidades operacionais

| Comando | Descrição |
|---|---|
| `/unidade registrar <nome>` | Cadastra uma unidade (ex: `A`, `L`, `K`, `RPM`, `AIR`) |
| `/unidade listar` | Exibe todas as unidades ativas e desativadas |
| `/unidade remover <nome>` | Desativa a unidade |

> Limite de **25 unidades ativas** por servidor.

#### Viaturas

| Comando | Descrição |
|---|---|
| `/veiculo registrar <nome>` | Cadastra uma viatura (ex: `Ford Explorer`, `Tesla Model Y`) |
| `/veiculo listar` | Exibe todas as viaturas ativas e desativadas |
| `/veiculo remover <nome>` | Desativa a viatura |

> Limite de **25 viaturas ativas** por servidor. O canal de voz é criado como `Viatura-Callsign`.

---

## Assuntos Internos (IA)

O módulo de Assuntos Internos permite abrir, acompanhar e encerrar **investigações internas** diretamente pelo Discord, com fluxo guiado por modais e um quadro persistente por investigação.

### Configurar o canal e os cargos de IA

```
/configurar canal-ia #assuntos-internos
/configurar cargo-ia @Assuntos Internos Adicionar
```

Todos os quadros de investigação serão publicados nesse canal. Apenas **Administradores**, **Supervisores** e membros com o **cargo de Assuntos Internos** podem abrir e gerenciar investigações.

### Abrir uma investigação — `/ia abrir`

Restrito a **Supervisores** e **Administradores**. O fluxo tem 3 etapas:

**Etapa 1 — Identificação**
- Selecione a **origem** da investigação:
  - 🟦 **Civil (Pública)** — denúncia feita por civil externo
  - 🟥 **Interna (Blue-on-Blue)** — denúncia feita por outro policial
  - ⬛ **Uso de Força Crítico (OIS)** — Officer-Involved Shooting
- Selecione o **oficial acusado/envolvido** (UserSelect)
- Clique em **Continuar →**

**Etapa 2 — Detalhes do Incidente** (modal)
| Campo | Obrigatório | Descrição |
|---|:---:|---|
| Viatura no dia | Não | Viatura do indicativo de rádio (ex: Eagle-01) |
| Data e Hora do Fato | Não | Formato DD/MM/AAAA HH:MM |
| Local do Incidente | Não | Endereço ou ponto de referência |
| Classificação / Motivo | **Sim** | Tipo de infração (ex: Uso excessivo de força) |
| Identificação do Reclamante | Não | Nome, documento ou @Discord |

**Etapa 3 — Descrição e Provas** (modal)
| Campo | Obrigatório | Descrição |
|---|:---:|---|
| Descrição do Ocorrido | **Sim** | Relato detalhado do fato |
| Provas / Evidências | Não | Links de fotos/vídeos ou descrição das provas |

Ao confirmar, a investigação é criada com número sequencial (`IA-2026-001`) e o quadro é publicado automaticamente no canal configurado.

> O callsign, distintivo e distrito do acusado são preenchidos automaticamente a partir do perfil do oficial (cadastrado via `/oficial definir`).

---

### Quadro da investigação

Cada investigação gera uma **embed persistente** no canal de IA com:

- Número do caso, origem, status e data de abertura
- Responsável pela abertura da investigação
- Acusado/envolvido com callsign, distintivo e distrito
- Indicativo de rádio no dia do incidente (`Distrito-Viatura-Callsign`)
- Data/hora, local e classificação do incidente
- Identificação do reclamante (se informada)
- Descrição do ocorrido
- Provas e evidências

#### Status da investigação

O quadro exibe dois botões para alterar o status enquanto estiver aberta. O botão do status atual fica desabilitado para indicar o estado vigente:

| Botão | Status resultante |
|---|---|
| 🟢 Ativar | Investigação em andamento |
| 🟡 Suspender | Temporariamente suspensa |

#### Encerrar a investigação

Clique em **🔴 Encerrar Investigação**. O fluxo tem duas etapas:

**Etapa 1 — Veredicto** (select em português)

| Opção | Descrição |
|---|---|
| ✅ Sustentado | A infração foi provada e as evidências sustentam a acusação |
| ⚠️ Não Sustentado | Não há provas suficientes para provar ou refutar |
| 🔵 Exonerado | O fato ocorreu, mas a ação foi legal e dentro do protocolo |
| ❌ Infundado | O fato alegado não ocorreu ou é comprovadamente falso |

Selecione o veredicto e clique em **Confirmar →**.

**Etapa 2 — Penalidade** (modal)

Campo de texto para informar a recomendação de penalidade (opcional): suspensão, demissão, advertência, etc.

#### Status da penalidade

Após encerrar, o quadro exibe três botões para marcar a aplicação da penalidade:

| Botão | Significado |
|---|---|
| ✅ Penalidade Aplicada | Penalidade aplicada conforme recomendado |
| ❌ Não Aplicada | Penalidade não foi aplicada |
| 🔶 Aplicada com Modificações | Penalidade aplicada com alterações |

### Listar investigações — `/ia listar`

Exibe todas as investigações do servidor com status e oficial envolvido.

---

## Controle de permissões

| Ação | Oficial | Resp. Unidade | Supervisor | Membro IA | Gestor Config | Admin |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `/oficial definir` (próprio perfil) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/oficial definir` (perfil alheio) | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| `/oficial ver` (próprio) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/oficial ver` (alheio) | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Iniciar turno | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pausar / Retornar (própria unidade) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pausar / Retornar (unidade alheia) | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Arma Perdida — própria arma | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Arma Perdida — arma de outro membro | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Encerrar turno (própria unidade) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Encerrar turno alheio | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| `/arma registrar` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/arma arsenal` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/arma extravio` (própria arma) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/arma extravio` (qualquer arma) | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| `/historico` | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| `/ia abrir`, `/ia listar`, alterar status, encerrar | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| Marcar status de penalidade | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| `/configurar`, `/configuracoes`, `/veiculo`, `/unidade` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `/configurar cargo-gestor` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

> **Responsável da unidade** = oficial que executou `/iniciar` (papel `LEADER`).
> **Membro de IA** = cargo definido via `/configurar cargo-ia`. Acesso exclusivo ao módulo de Assuntos Internos.
> **Gestor de Configuração** = cargo definido via `/configurar cargo-gestor`. Pode configurar o bot mas não pode gerenciar os próprios cargos gestores.

---

## Banco de dados

O sistema usa **PostgreSQL** com migrações versionadas em `database/migrations/`.
Execute `npm run db:migrate` para aplicar todas as migrações pendentes.

### Tabelas

| Tabela | Descrição |
|---|---|
| `users` | Oficiais registrados (upsert automático ao interagir) |
| `official_profiles` | Perfil operacional por oficial + servidor (distrito, callsign, distintivo) |
| `ia_investigations` | Investigações internas com todos os dados, status e veredicto |
| `shifts` | Turnos/unidades operacionais — `user_id` é o líder |
| `shift_members` | Participantes de cada unidade (`LEADER` / `MEMBER`) |
| `pauses` | Pausas com timestamps e duração |
| `weapons` | Estado atual de cada arma no servidor |
| `official_weapons` | Arsenal pessoal por oficial + servidor |
| `weapon_losses` | Histórico de extravios |
| `vehicles` | Viaturas disponíveis por servidor |
| `units` | Unidades operacionais disponíveis por servidor |
| `guild_config` | Todas as configurações do servidor (canais, cargos, IDs) |
| `bot_config` | Configurações globais do bot |
| `migrations` | Controle de migrações executadas |

### Campos relevantes em `shifts`

| Coluna | Descrição |
|---|---|
| `user_id` | Líder da unidade |
| `callsign` | Callsign completo (`3-A-12`) |
| `vehicle_prefix` | Prefixo numérico legado (`312`) |
| `vehicle_name` | Nome da viatura selecionada (`Ford Explorer`) |
| `weapon_serials` | Array com os seriais de todas as armas da unidade |
| `status` | `active` / `paused` / `ended` |
| `end_reason` | `patrol_end` / `remodulation` / `other` |
| `end_reason_note` | Texto livre quando `end_reason = 'other'` |

### Chaves relevantes em `guild_config`

| Chave | Descrição |
|---|---|
| `shift_channel_id` | Canal das embeds de turno |
| `report_channel_id` | Canal de relatórios |
| `weapon_report_channel_id` | Canal de armamento |
| `voice_category_id` | Categoria dos canais de voz |
| `callsign_channel_id` | Canal do quadro de callsigns |
| `callsign_message_id` | ID da mensagem persistente do quadro (interno) |
| `ia_channel_id` | Canal de publicação dos quadros de investigações |
| `ia_role_ids` | JSON array de cargos de Assuntos Internos |
| `supervisor_role_ids` | JSON array de cargos supervisores |
| `config_manager_role_ids` | JSON array de cargos gestores de configuração |

### Migrações

| Arquivo | O que faz |
|---|---|
| `001_initial_schema.sql` | Tabelas base |
| `002_guild_config.sql` | `guild_config` |
| `003_add_guild_id.sql` | `guild_id` em `shifts` e `weapons` |
| `004_weapons_guild_unique.sql` | Constraint `(serial_number, guild_id)` |
| `005_official_weapons.sql` | Arsenal pessoal |
| `006_bot_config.sql` | `bot_config` |
| `007_shift_members.sql` | `shift_members` + `end_reason` em `shifts` |
| `008_vehicles.sql` | `vehicles` + `vehicle_name` em `shifts` |
| `009_units.sql` | Unidades operacionais por servidor |
| `010_config_manager_roles.sql` | `config_manager_role_ids` em `guild_config` |
| `011_official_profiles.sql` | Perfil operacional do oficial |
| `012_add_badge_to_profiles.sql` | Coluna `badge_num` (distintivo) em `official_profiles` |
| `013_ia_investigations.sql` | Tabela `ia_investigations` — sistema de Assuntos Internos |

---

## Comportamento multi-guild

- Ao ser adicionado a um novo servidor, o bot envia automaticamente um guia de configuração inicial.
- Comandos operacionais são bloqueados com aviso amigável enquanto o servidor não estiver configurado.
- Todos os dados são completamente isolados por `guild_id`.
- Uma única instância atende dezenas de servidores sem interferência.

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

### Erro ao iniciar turno — "configure seu perfil"
- Execute `/oficial definir distrito:X callsign:Y` antes de usar `/iniciar`

### Botões desabilitados ao iniciar turno
- Nenhuma unidade cadastrada — use `/unidade registrar` para adicionar pelo menos uma

### Seletor de viatura não aparece no /iniciar
- Cadastre viaturas com `/veiculo registrar` — sem viaturas o seletor não aparece

### Arsenal vazio ao iniciar turno
- Cadastre armas com `/arma registrar <nome> <serie>` ou use o botão **Adicionar Arma** na embed

### Armas extraviadas sendo incluídas no turno
- Armas com status `lost` são excluídas automaticamente; execute `npm run db:migrate` se persistir

### Oficial adicional não pode ser incluído na unidade
- O oficial já está em uma unidade ativa — peça para encerrar o turno atual primeiro

### Quadro de callsigns não atualiza
- Verifique se o bot tem permissão `Read Message History` no canal de callsigns
- Se a mensagem foi deletada, ela será recriada automaticamente na próxima atualização de perfil

### Supervisor não consegue fechar turno de outro oficial
- Confirme que o cargo está configurado via `/configurar cargo-supervisor`
- O supervisor deve clicar nos botões diretamente na embed do turno

### Canal de voz não é criado
- Confirme que a categoria foi configurada via `/configurar categoria-voz`
- Verifique se o bot tem permissão `Manage Channels` na categoria

### Gestor de configuração não consegue ver os comandos
- Os comandos `/configurar`, `/configuracoes`, `/veiculo` e `/unidade` não têm restrição de visibilidade no Discord — todos os membros podem vê-los, mas apenas admins e gestores conseguem executá-los

### Ver logs em produção (PM2)
```bash
pm2 logs police-bot --lines 100
pm2 logs police-bot --err
```

---

## Roadmap

### v1.1 — Painel Operacional
- `/status` — visão geral dos turnos ativos no servidor em tempo real

### v1.2 — Relatórios Avançados
- Dashboard semanal/mensal automático

### v1.3 — Ocorrências
- Sistema de registro de ocorrências vinculado ao turno ativo
- Categorias: abordagem, perseguição, prisão, etc.

### v1.4 — Assuntos Internos (melhorias)
- Múltiplos acusados/envolvidos por investigação
- Busca de investigação por número de caso ou oficial
- Histórico de alterações de status com auditoria

