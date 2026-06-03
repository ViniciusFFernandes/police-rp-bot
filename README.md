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
16. [Controle de permissões](#controle-de-permissões)
17. [Banco de dados](#banco-de-dados)
18. [Solução de problemas](#solução-de-problemas)
19. [Roadmap](#roadmap)

---

## Descrição

O **Police RP Bot** é um sistema completo para gerenciar as operações de um departamento policial em servidores de Discord focados em roleplay.

### O que ele resolve

| Problema manual | Solução do bot |
|---|---|
| Turno individual registrado por oficial | Unidade Operacional com líder + membros (`3-A-12`, `1-L-20`) |
| Canal de voz criado manualmente | Canal criado automaticamente como `Viatura-Callsign` |
| Digitar seriais de arma a cada turno | Arsenal de toda a equipe carregado automaticamente |
| Escolher viatura manualmente | Seleção a partir do cadastro de viaturas do servidor |
| Extravios registrados no chat | Modal dedicado + regras de permissão por papel na unidade |
| Relatórios escritos manualmente | Gerado automaticamente com motivo de encerramento |
| Encerrar e reabrir manualmente após mudança de equipe | Fluxo de **Remodulação** com criação imediata de nova unidade |
| Histórico apenas de quem liderou | `/historico` contabiliza participações como líder e como membro |
| Configuração via arquivo `.env` | Tudo configurável via comandos slash, por servidor |
| Canal de turnos poluído | Mensagens de usuários deletadas automaticamente em 10s |

### Arquitetura multi-guild

Uma única instância do bot atende quantos servidores Discord forem necessários. Cada servidor possui sua própria configuração isolada no banco de dados — canais, categorias, cargos supervisores, cadastro de viaturas e todos os registros operacionais são completamente separados por `guild_id`.

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

### Passo 3 — Cadastrar viaturas (opcional, mas recomendado)

```
/veiculo registrar Ford Explorer
/veiculo registrar Ford Victoria
/veiculo registrar Tesla Model Y
```

Com viaturas cadastradas, o oficial escolhe a viatura ao iniciar o turno e o canal de voz é criado como `Ford Explorer-3-A-12`.

Sem viaturas cadastradas, o canal é criado apenas com o callsign (`3-A-12`) e o fluxo funciona normalmente.

### Passo 4 — Verificar configuração

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
│   │   │   ├── configurar.js        # /configurar (5 subcomandos)
│   │   │   ├── configuracoes.js     # /configuracoes
│   │   │   └── veiculo.js           # /veiculo registrar|listar|remover
│   │   ├── shift/
│   │   │   └── iniciar.js           # /iniciar → modal de callsign
│   │   ├── history/
│   │   │   └── historico.js         # /historico resumo|turnos|arsenal
│   │   └── weapon/
│   │       └── arma.js              # /arma consultar|registrar|arsenal|extravio
│   │
│   ├── events/
│   │   ├── ready.js
│   │   ├── guildCreate.js           # Detecta novo servidor → boas-vindas + guia
│   │   ├── interactionCreate.js     # Guard de configuração + roteamento (comandos, botões, selects, modals)
│   │   └── messageCreate.js         # Auto-delete 10s no canal de turnos
│   │
│   ├── buttons/
│   │   ├── shiftButtons.js          # Pausar, Retornar, Arma Perdida, Adicionar Arma, Encerrar
│   │   ├── shiftCompose.js          # Seleção de viatura/membros + confirmação de início
│   │   └── shiftEnd.js              # Seleção de motivo de encerramento + fluxo de remodulação
│   │
│   ├── modals/
│   │   ├── startShiftModal.js       # Exibe tela de montagem da unidade (viatura + membros)
│   │   ├── endReasonModal.js        # Encerramento com motivo "Outro" (texto livre)
│   │   ├── weaponLossModal.js       # Extravio durante turno
│   │   └── addWeaponModal.js        # Adição de arma ao turno
│   │
│   ├── services/
│   │   ├── shiftService.js          # Toda a lógica de turno (start/pause/resume/end/loss/addWeapon)
│   │   └── guildConfigService.js    # Lógica de configuração por servidor
│   │
│   ├── repositories/
│   │   ├── userRepository.js        # upsert, findByDiscordId, getStats (participação total)
│   │   ├── shiftRepository.js       # CRUD + findActiveByParticipant + findEndedByUser
│   │   ├── shiftMemberRepository.js # Membros da unidade (líder + adicionais)
│   │   ├── pauseRepository.js
│   │   ├── weaponRepository.js
│   │   ├── weaponLossRepository.js
│   │   ├── officialWeaponRepository.js  # Arsenal pessoal + getArsenalHistory
│   │   ├── vehicleRepository.js     # Cadastro de viaturas por servidor
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
│   │   ├── embeds.js                # Builders de embed + formatTeam + endReasonLabel
│   │   ├── time.js
│   │   ├── permissions.js           # isSupervisor, isAdmin, canManageShift
│   │   ├── configGuard.js
│   │   ├── pendingComposition.js    # Store temporário de viatura + membros entre interações
│   │   ├── shiftForms.js            # buildStartShiftModal (reutilizado no fluxo de remodulação)
│   │   └── guildWhitelist.js
│   │
│   └── index.js
│
├── database/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql       # Tabelas base: users, shifts, weapons, pauses, weapon_losses
│   │   ├── 002_guild_config.sql         # guild_config (configurações por servidor)
│   │   ├── 003_add_guild_id.sql         # Isolamento multi-guild em shifts e weapons
│   │   ├── 004_weapons_guild_unique.sql # Constraint serial+guild
│   │   ├── 005_official_weapons.sql     # Arsenal pessoal por oficial
│   │   ├── 006_bot_config.sql           # Configurações globais do bot
│   │   ├── 007_shift_members.sql        # Unidade operacional: shift_members + end_reason
│   │   └── 008_vehicles.sql             # Cadastro de viaturas + shifts.vehicle_name
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

### Comandos operacionais (todos os membros)

#### `/iniciar` — Unidade Operacional

Inicia um turno como **Unidade Operacional** (ex: `3-A-12`, `1-L-20`, `3-AIR-01`).

**Passo 1 — Modal de callsign**

Preencha três campos:

| Campo | Exemplo |
|---|---|
| Distrito | `3` |
| Unidade | `A` |
| Callsign | `12` |

O bot monta automaticamente o callsign completo (`3-A-12`) e o prefixo da viatura (`312`).

**Passo 2 — Montagem da unidade**

Após o modal, é exibida uma tela efêmera com:

- **Seletor de viatura** (aparece apenas se houver viaturas cadastradas via `/veiculo registrar`).
- **Seletor de oficiais adicionais** (UserSelectMenu, até 5 — opcional).
- Botão **Iniciar Turno** (confirma com os adicionais selecionados) ou **Apenas eu** (unidade individual).

Quem executou o comando é automaticamente o **responsável** (motorista/líder) da unidade.

**O que o bot faz ao confirmar:**

- Cria **um único turno** para toda a unidade e registra cada participante na tabela `shift_members` com papel `LEADER` ou `MEMBER`.
- Cria **um único canal de voz** nomeado como `Viatura-Callsign` (ex: `Ford Explorer-3-A-12`). Sem viatura cadastrada, usa só o callsign.
- **Vincula automaticamente** ao turno as armas ativas do arsenal pessoal de **todos os participantes** — cada arma mantém o vínculo com o seu dono real.

> **Composição fixa:** a equipe da unidade é definida no início e não pode ser alterada durante o turno. Qualquer mudança de composição (entrada/saída de oficial, troca de motorista, nova formação) deve ser feita encerrando o turno com motivo **Remodulação** e iniciando uma nova unidade.

---

#### `/arma registrar <nome> <serie>`

Cadastra uma arma no **arsenal pessoal** do oficial, vinculada ao servidor.
A arma será carregada automaticamente em todos os próximos turnos do oficial, sem precisar digitar o serial.
Envia notificação no canal de armamento.

#### `/arma arsenal`

Lista as **armas ativas** do arsenal do oficial (disponíveis e em uso).
Armas extraviadas não são exibidas — ficam visíveis apenas para supervisores via `/historico arsenal`.

#### `/arma extravio <serie> [observacao]`

Registra o extravio de uma arma **fora de um turno ativo**.

- Oficiais só podem reportar suas próprias armas.
- Admins e supervisores podem reportar qualquer arma.
- Se o oficial estiver em uma unidade ativa, é redirecionado para o botão **Arma Perdida** na embed do turno.

#### `/arma consultar <serie>`

Consulta o status atual da arma, nome cadastrado no arsenal, último oficial, último callsign, último turno e histórico completo de extravios.

---

### Botões da embed de turno

A embed de turno possui dois grupos de botões:

**Grupo 1 — Controle de turno**

| Botão | Ação |
|---|---|
| **Pausar** | Registra pausa com timestamp; embed fica amarela |
| **Retornar ao Serviço** | Encerra a pausa, acumula duração; embed fica verde |
| **Arma Perdida** | Abre modal (série + observação); aplica regras de permissão; envia relatório |
| **Encerrar Turno** | Exibe seleção de motivo; calcula tempos; envia relatório; exclui canal de voz |

**Grupo 2 — Gestão de armamento**

| Botão | Ação |
|---|---|
| **Adicionar Arma** | Abre modal (nome + série); registra no arsenal e no turno; envia notificação |

Múltiplas pausas por turno são suportadas.
Supervisores e admins podem clicar nos botões de turnos de outros oficiais.

---

#### Encerramento e motivo

Ao clicar em **Encerrar Turno**, um menu de seleção pergunta o motivo:

| Motivo | Comportamento |
|---|---|
| **Fim de Patrulha** | Gera relatório, encerra canal de voz, desativa embed. |
| **Remodulação** | Gera relatório, encerra canal de voz, pergunta se deseja **iniciar uma nova unidade**. Se confirmado, abre imediatamente o fluxo de `/iniciar` com nova composição e viatura. |
| **Outro** | Abre um campo de texto (opcional) para digitar um motivo personalizado antes de encerrar. |

O motivo é salvo no banco (`shifts.end_reason` / `shifts.end_reason_note`) e exibido no relatório de encerramento.

**Exemplo de fluxo de remodulação:**

```
3-A-12 (Vinicius + João) → Remodulação → novo /iniciar → 1-L-20 (Vinicius)
                                                        → 3-A-12 (Vinicius + Carlos)
```

---

### Canal de turnos — limpeza automática

O canal de turnos é mantido limpo:
- Qualquer mensagem enviada por usuários nesse canal é **deletada após 10 segundos**.
- Apenas as embeds do bot permanecem visíveis.

---

### Comandos de supervisão (somente supervisores e admins)

#### `/historico resumo @usuario`

Visão geral consolidada do oficial: total de turnos encerrados, tempo efetivo, tempo em pausa, pausas realizadas e armas extraviadas.

Contabiliza **todas as participações** — tanto turnos em que o oficial foi **responsável** quanto turnos em que foi **membro adicional** da unidade.

#### `/historico turnos @usuario [pagina]`

Lista paginada (8 por página) dos turnos encerrados em que o oficial participou:

- Callsign, viatura e prefixo
- Horário de início e fim
- Tempo efetivo, tempo em pausa e quantidade de pausas
- Quantidade de armas usadas

#### `/historico arsenal @usuario`

Visão completa do arsenal do oficial, **incluindo armas extraviadas**:

- Status atual (disponível, em uso, extraviada)
- Data de cadastro
- Quantos turnos a arma foi utilizada e data do último uso
- Quantidade de extravios registrados

> Os três subcomandos de `/historico` são **restritos a supervisores e administradores**.

---

### Comandos administrativos (somente Administradores)

#### Configuração do servidor

| Comando | Opção | Descrição |
|---|---|---|
| `/configurar` | `canal-turnos #canal` | Canal das embeds de turno |
| `/configurar` | `canal-relatorios #canal` | Canal de relatórios de encerramento |
| `/configurar` | `canal-armamento #canal` | Canal de notificações de armamento |
| `/configurar` | `categoria-voz Categoria` | Categoria dos canais de voz automáticos |
| `/configurar` | `cargo-supervisor @Cargo Adicionar/Remover` | Gerencia cargos supervisores |
| `/configuracoes` | — | Exibe status de todas as configurações |

#### Cadastro de viaturas

| Comando | Descrição |
|---|---|
| `/veiculo registrar <nome>` | Cadastra uma nova viatura disponível (ex: `Ford Explorer`, `Tesla Model Y`) |
| `/veiculo listar` | Exibe todas as viaturas ativas e desativadas do servidor |
| `/veiculo remover <nome>` | Desativa a viatura (não apaga — preserva histórico dos turnos anteriores) |

Com viaturas cadastradas, o oficial escolhe a viatura na tela de montagem da unidade ao executar `/iniciar`.
O canal de voz é criado como `Viatura-Callsign` (ex: `Ford Explorer-3-A-12`).

> Limite de **25 viaturas ativas** por servidor.

---

## Controle de permissões

| Ação | Oficial | Responsável da Unidade | Supervisor | Admin |
|---|:---:|:---:|:---:|:---:|
| Iniciar turno | ✅ | ✅ | ✅ | ✅ |
| Pausar / Retornar (própria unidade) | ✅ | ✅ | ✅ | ✅ |
| Pausar / Retornar (unidade alheia) | ❌ | ❌ | ✅ | ✅ |
| Arma Perdida — própria arma | ✅ | ✅ | ✅ | ✅ |
| Arma Perdida — arma de outro membro da unidade | ❌ | ✅ | ✅ | ✅ |
| Encerrar turno da própria unidade | ✅ | ✅ | ✅ | ✅ |
| Encerrar turno alheio | ❌ | ❌ | ✅ | ✅ |
| `/arma registrar` | ✅ | ✅ | ✅ | ✅ |
| `/arma arsenal` (somente ativas) | ✅ | ✅ | ✅ | ✅ |
| `/arma extravio` (própria arma) | ✅ | ✅ | ✅ | ✅ |
| `/arma extravio` (qualquer arma) | ❌ | ❌ | ✅ | ✅ |
| `/historico` (todos os subcomandos) | ❌ | ❌ | ✅ | ✅ |
| `/configurar` e `/veiculo` | ❌ | ❌ | ❌ | ✅ |

> **Responsável da unidade** = o oficial que executou `/iniciar` (papel `LEADER` em `shift_members`).
> Pode gerenciar qualquer arma vinculada ao turno da sua própria unidade, mas não de unidades alheias.

---

## Banco de dados

O sistema usa **PostgreSQL** com migrações versionadas em `database/migrations/`.
Execute `npm run db:migrate` para aplicar todas as migrações pendentes. O processo é idempotente — migrações já executadas são puladas.

### Tabelas principais

| Tabela | Descrição |
|---|---|
| `users` | Oficiais registrados (upsert automático ao interagir) |
| `shifts` | Turnos/unidades operacionais. `user_id` aponta para o líder |
| `shift_members` | Participantes de cada unidade (`role`: `LEADER` ou `MEMBER`) |
| `pauses` | Pausas de cada turno com timestamps e duração |
| `weapons` | Estado atual de cada arma no servidor |
| `official_weapons` | Arsenal pessoal por oficial + servidor |
| `weapon_losses` | Histórico de extravios vinculados ao turno e ao dono da arma |
| `vehicles` | Viaturas disponíveis por servidor |
| `guild_config` | Configurações de canal, categoria e cargos por servidor |
| `bot_config` | Configurações globais do bot |
| `migrations` | Controle de migrações executadas |

### Campos relevantes em `shifts`

| Coluna | Descrição |
|---|---|
| `user_id` | Líder da unidade |
| `callsign` | Callsign completo (`3-A-12`) |
| `vehicle_prefix` | Prefixo numérico legado (`312`) |
| `vehicle_name` | Nome da viatura selecionada (`Ford Explorer`) — `NULL` em turnos legados |
| `weapon_serials` | Array com os seriais de todas as armas vinculadas à unidade |
| `status` | `active` / `paused` / `ended` |
| `end_reason` | `patrol_end` / `remodulation` / `other` |
| `end_reason_note` | Texto livre quando `end_reason = 'other'` |

### Migrações

| Arquivo | O que faz |
|---|---|
| `001_initial_schema.sql` | Tabelas base: `users`, `shifts`, `weapons`, `pauses`, `weapon_losses`, `voice_channels` |
| `002_guild_config.sql` | Tabela `guild_config` (substitui `configuration`) |
| `003_add_guild_id.sql` | Coluna `guild_id` em `shifts` e `weapons` |
| `004_weapons_guild_unique.sql` | Constraint única por `(serial_number, guild_id)` |
| `005_official_weapons.sql` | Tabela `official_weapons` (arsenal pessoal) |
| `006_bot_config.sql` | Tabela `bot_config` |
| `007_shift_members.sql` | Tabela `shift_members` + colunas `end_reason` / `end_reason_note` em `shifts` |
| `008_vehicles.sql` | Tabela `vehicles` + coluna `vehicle_name` em `shifts` |

---

## Comportamento multi-guild

- Ao ser adicionado a um novo servidor, o bot envia automaticamente um guia de configuração inicial.
- Comandos operacionais são bloqueados com aviso amigável enquanto o servidor não estiver configurado.
- Todos os dados (turnos, armas, viaturas, relatórios, configurações) são completamente isolados por `guild_id`.
- Uma única instância do bot pode atender dezenas de servidores sem interferência entre eles.

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

### Seletor de viatura não aparece no /iniciar
- Cadastre viaturas com `/veiculo registrar` antes de iniciar um turno
- Sem viaturas cadastradas o fluxo funciona normalmente, sem seletor

### Armas extraviadas sendo incluídas no turno
- Armas com status `lost` são automaticamente excluídas ao carregar o arsenal
- Se o problema persistir, execute `npm run db:migrate`

### Oficial adicional não pode ser incluído na unidade
- O oficial já pode estar em uma unidade ativa — peça para encerrar o turno atual primeiro

### Supervisor não consegue fechar turno de outro oficial
- Confirme que o cargo do supervisor está configurado via `/configurar cargo-supervisor`
- O supervisor deve clicar nos botões diretamente na embed do turno

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
