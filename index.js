/**
 * ============================================================================
 * JRC ENTERPRISE HYPER-PERFORMANCE INFRASTRUCTURE SUITE
 * Architecture Style: Mimu-Grade Modular Microkernel
 * Version: 4.8.2-RELEASE
 * Target: Node.js 18.x+ / Discord.js v14
 * ============================================================================
 */

'use strict';

const { 
  Client, 
  GatewayIntentBits, 
  REST, 
  Routes, 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ActivityType,
  Collection,
  ChannelType
} = require('discord.js');
require('dotenv').config();

// ============================================================================
// SECTION 1: GLOBAL CONFIGURATION & DESIGN TOKENS
// ============================================================================

const PALETTE = Object.freeze({
  DARK: '#1E1F22',
  SUCCESS: '#23A55A',
  ERROR: '#F23F43',
  GOLD: '#FEE75C',
  INFO: '#5865F2',
  PURPLE: '#8559DA',
  WARNING: '#FAA61A',
  BACKGROUND: '#2B2D31'
});

const CONSTANTS = Object.freeze({
  VERSION: '4.8.2-RELEASE',
  COOLDOWN_XP: 60000,
  COOLDOWN_DAILY: 86400000,
  COOLDOWN_WORK: 3600000,
  DEFAULT_WALLET: 1000,
  MAX_WARNINGS: 5
});

// ============================================================================
// SECTION 2: HIGH-PERFORMANCE IN-MEMORY STORAGE KERNEL (O(1) CACHE)
// ============================================================================

class StorageKernel {
  constructor() {
    this.economy = new Map();
    this.leveling = new Map();
    this.warnings = new Map();
    this.welcomeConfig = new Map();
    this.goodbyeConfig = new Map();
    this.customResponses = new Map();
    this.auditLogs = new Collection();
  }

  // Economy Wrappers
  getEconomy(userId) {
    if (!this.economy.has(userId)) {
      this.economy.set(userId, { wallet: CONSTANTS.DEFAULT_WALLET, bank: 0, lastDaily: 0, lastWork: 0 });
    }
    return this.economy.get(userId);
  }
  setEconomy(userId, data) {
    this.economy.set(userId, data);
  }

  // Leveling Wrappers
  getLevel(userId) {
    if (!this.leveling.has(userId)) {
      this.leveling.set(userId, { xp: 0, level: 1, lastMessage: 0 });
    }
    return this.leveling.get(userId);
  }
  setLevel(userId, data) {
    this.leveling.set(userId, data);
  }

  // Warning Wrappers
  getWarnings(userId) {
    return this.warnings.get(userId) || [];
  }
  addWarning(userId, warningData) {
    const list = this.getWarnings(userId);
    list.push(warningData);
    this.warnings.set(userId, list);
  }
  clearWarnings(userId) {
    this.warnings.set(userId, []);
  }

  // Welcome Config Wrappers
  getWelcome(guildId) {
    return this.welcomeConfig.get(guildId) || { enabled: false, channelId: null, title: null, message: null };
  }
  setWelcome(guildId, config) {
    this.welcomeConfig.set(guildId, config);
  }

  // Goodbye Config Wrappers
  getGoodbye(guildId) {
    return this.goodbyeConfig.get(guildId) || { enabled: false, channelId: null, message: null };
  }
  setGoodbye(guildId, config) {
    this.goodbyeConfig.set(guildId, config);
  }
}

const db = new StorageKernel();

// ============================================================================
// SECTION 3: ENTERPRISE COMMAND METADATA MATRIX (SLASH COMMAND BUILDERS)
// ============================================================================

const commandRegistry = [
  // Core System & Telemetry
  new SlashCommandBuilder()
    .setName('jrc')
    .setDescription('JRC elite infrastructure telemetry, cluster health, and system controls')
    .addSubcommand(sub => sub.setName('help').setDescription('Displays premium command modules and core directories'))
    .addSubcommand(sub => sub.setName('settings').setDescription('Views active system configurations for the current environment'))
    .addSubcommand(sub => sub.setName('about').setDescription('Architectural overview and version specifications'))
    .addSubcommand(sub => sub.setName('status').setDescription('Performs low-latency system diagnostics and node check')),

  // Mimu-Grade Welcome Pipeline
  new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Configure Mimu-grade interactive welcome pipelines and embedded greeting cards')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub.setName('setup').setDescription('Launches interactive Mimu-style control dashboard'))
    .addSubcommand(sub => sub.setName('disable').setDescription('Deactivates welcome broadcasting engine'))
    .addSubcommand(sub => sub.setName('test').setDescription('Dispatches test card packet to verify routing'))
    .addSubcommand(sub => sub.setName('title').setDescription('Sets Mimu-style embed headline').addStringOption(opt => opt.setName('text').setDescription('Embed title text').setRequired(true)))
    .addSubcommand(sub => sub.setName('message').setDescription('Sets main body description markup').addStringOption(opt => opt.setName('text').setDescription('Message payload text').setRequired(true)))
    .addSubcommand(sub => sub.setName('channel').setDescription('Binds destination channel for broadcast').addChannelOption(opt => opt.setName('target').setDescription('Target text channel').setRequired(true)))
    .addSubcommand(sub => sub.setName('preview').setDescription('Renders live preview asset of current layout')),

  // Goodbye Pipeline
  new SlashCommandBuilder()
    .setName('goodbye')
    .setDescription('Configure member departure notifications and farewell telemetry')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub.setName('setup').setDescription('Launch goodbye management dashboard'))
    .addSubcommand(sub => sub.setName('disable').setDescription('Deactivate departure notification engine'))
    .addSubcommand(sub => sub.setName('test').setDescription('Dispatch test farewell signal'))
    .addSubcommand(sub => sub.setName('message').setDescription('Customize departure broadcast text').addStringOption(opt => opt.setName('text').setDescription('Content layout').setRequired(true)))
    .addSubcommand(sub => sub.setName('channel').setDescription('Bind target departure channel').addChannelOption(opt => sub.setName('target').setDescription('Target channel').setRequired(true)))
    .addSubcommand(sub => sub.setName('preview').setDescription('Render farewell preview asset')),

  // High-Speed Moderation Engine
  new SlashCommandBuilder()
    .setName('mod')
    .setDescription('High-speed administrative security and discipline tools')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(sub => sub.setName('ban').setDescription('Issue permanent network ban').addUserOption(opt => opt.setName('target').setDescription('Target member').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('Infraction reason')))
    .addSubcommand(sub => sub.setName('kick').setDescription('Expel member from environment').addUserOption(opt => opt.setName('target').setDescription('Target member').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('Expulsion reason')))
    .addSubcommand(sub => sub.setName('timeout').setDescription('Apply temporary isolation timeout').addUserOption(opt => opt.setName('target').setDescription('Target member').setRequired(true)).addIntegerOption(opt => opt.setName('minutes').setDescription('Duration in minutes').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('Reason')))
    .addSubcommand(sub => sub.setName('warn').setDescription('Issue formal disciplinary strike').addUserOption(opt => opt.setName('target').setDescription('Target member').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('Strike reason').setRequired(true)))
    .addSubcommand(sub => sub.setName('warnings').setDescription('Inspect discipline history records').addUserOption(opt => opt.setName('target').setDescription('Target member').setRequired(true)))
    .addSubcommand(sub => sub.setName('clearwarnings').setDescription('Wipe user disciplinary history').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addUserOption(opt => opt.setName('target').setDescription('Target member').setRequired(true)))
    .addSubcommand(sub => sub.setName('clear').setDescription('Purge channel traffic payload').addIntegerOption(opt => opt.setName('amount').setDescription('Message count (1-100)').setRequired(true)))
    .addSubcommand(sub => sub.setName('lock').setDescription('Securely lock down text channel traffic'))
    .addSubcommand(sub => sub.setName('unlock').setDescription('Restore text channel communication traffic')),

  // Economy System
  new SlashCommandBuilder()
    .setName('economy')
    .setDescription('Manage digital currency assets, balance, and banking portfolios')
    .addSubcommand(sub => sub.setName('balance').setDescription('Check wallet and bank liquidity').addUserOption(opt => opt.setName('target').setDescription('Target user')))
    .addSubcommand(sub => sub.setName('daily').setDescription('Claim daily capital allocation allowance'))
    .addSubcommand(sub => sub.setName('work').setDescription('Perform network labor to earn capital payouts'))
    .addSubcommand(sub => sub.setName('deposit').setDescription('Deposit wallet capital into secure bank vault').addIntegerOption(opt => opt.setName('amount').setDescription('Amount to deposit').setRequired(true)))
    .addSubcommand(sub => sub.setName('withdraw').setDescription('Withdraw capital from secure bank vault').addIntegerOption(opt => opt.setName('amount').setDescription('Amount to withdraw').setRequired(true)))
    .addSubcommand(sub => sub.setName('pay').setDescription('Transfer capital to another network member').addUserOption(opt => opt.setName('target').setDescription('Recipient user').setRequired(true)).addIntegerOption(opt => opt.setName('amount').setDescription('Transfer amount').setRequired(true))),

  // Leveling & Progression System
  new SlashCommandBuilder()
    .setName('leveling')
    .setDescription('Inspect XP rank matrix and progression standing')
    .addSubcommand(sub => sub.setName('rank').setDescription('Display current rank card telemetry').addUserOption(opt => opt.setName('target').setDescription('Target user')))
    .addSubcommand(sub => sub.setName('leaderboard').setDescription('View top network rank progressions')),

  // Utility Infrastructure
  new SlashCommandBuilder()
    .setName('utility')
    .setDescription('Server utility diagnostics and network asset retrieval')
    .addSubcommand(sub => sub.setName('userinfo').setDescription('Extract deep user identity telemetry').addUserOption(opt => opt.setName('target').setDescription('Target user')))
    .addSubcommand(sub => sub.setName('serverinfo').setDescription('Extract environment matrix diagnostics'))
    .addSubcommand(sub => sub.setName('avatar').setDescription('Fetch high-resolution user avatar asset').addUserOption(opt => opt.setName('target').setDescription('Target user')))
    .addSubcommand(sub => sub.setName('ping').setDescription('Test round-trip latency to gateway socket')),

  // Interactive Entertainment Suite
  new SlashCommandBuilder()
    .setName('fun')
    .setDescription('Interactive entertainment and simulation routines')
    .addSubcommand(sub => sub.setName('8ball').setDescription('Consult the cryptographic oracle').addStringOption(opt => opt.setName('question').setDescription('Inquiry query').setRequired(true)))
    .addSubcommand(sub => sub.setName('coinflip').setDescription('Flip a fair cryptographic coin entity'))
    .addSubcommand(sub => sub.setName('dice').setDescription('Roll a randomized multi-sided die entity'))
    .addSubcommand(sub => sub.setName('choose').setDescription('Algorithmic choice matrix decider').addStringOption(opt => opt.setName('options').setDescription('Comma-separated choices').setRequired(true)))
].map(cmd => cmd.toJSON());

// ============================================================================
// SECTION 4: CLIENT CORE INSTANTIATION & INTENT PROFILES
// ============================================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences
  ],
  allowedMentions: { parse: ['users'], repliedUser: false },
  sweepers: {
    messages: {
      interval: 300,
      lifetime: 1800
    }
  }
});

// ============================================================================
// SECTION 5: ZERO-LAG EVENT PIPELINES & WORKERS
// ============================================================================

client.once('ready', async () => {
  console.log(`[SECURE CORE] Authenticated successfully as ${client.user.tag}`);
  console.log(`[INFRASTRUCTURE] Running JRC Enterprise Suite v${CONSTANTS.VERSION}`);

  client.user.setPresence({
    activities: [{ name: 'JRC Elite Infrastructure', type: ActivityType.Custom }],
    status: 'online'
  });

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log('[API CORE] Synchronizing global application command tree...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID || client.user.id),
      { body: commandRegistry }
    );
    console.log('[API CORE] Command registration tree synchronized successfully.');
  } catch (err) {
    console.error('[API CORE FATAL] Synchronization failed:', err);
  }
});

// Advanced Message Listener (XP Engine + Link Guard)
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  // Real-time link/invite sanitization filter
  const inviteRegex = /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li|club)|discord\.com\/invite)\/.+$/gi;
  if (inviteRegex.test(message.content)) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      await message.delete().catch(() => {});
      const warningAlert = await message.channel.send(
        `<@${message.author.id}> 🛡️ **Security Intercept:** External invitation links are restricted by policy.`
      );
      setTimeout(() => warningAlert.delete().catch(() => {}), 4000);
      return;
    }
  }

  // Optimized Rate-Limited XP Tracking Engine
  const now = Date.now();
  const userXpData = db.getLevel(message.author.id);

  if (now - userXpData.lastMessage > CONSTANTS.COOLDOWN_XP) {
    userXpData.xp += Math.floor(Math.random() * 15) + 15;
    userXpData.lastMessage = now;

    const nextLevelThreshold = userXpData.level * 100;
    if (userXpData.xp >= nextLevelThreshold) {
      userXpData.level += 1;
      userXpData.xp -= nextLevelThreshold;

      const levelEmbed = new EmbedBuilder()
        .setColor(PALETTE.GOLD)
        .setDescription(`✨ **Rank Elevation Protocol:** <@${message.author.id}> has achieved **Level ${userXpData.level}**!`);
      
      const levelMsg = await message.channel.send({ embeds: [levelEmbed] });
      setTimeout(() => levelMsg.delete().catch(() => {}), 6000);
    }
    db.setLevel(message.author.id, userXpData);
  }
});

// Non-Blocking Welcome Broadcast Worker
client.on('guildMemberAdd', async (member) => {
  const cfg = db.getWelcome(member.guild.id);
  if (!cfg.enabled || !cfg.channelId) return;

  const channel = member.guild.channels.cache.get(cfg.channelId);
  if (!channel) return;

  const titleText = cfg.title || '🎉 Welcome to the Network Environment!';
  const descriptionText = (cfg.message || 'Greetings {user}, welcome to **{server}**! We are thrilled to have you onboard.')
    .replace('{user}', `<@${member.id}>`)
    .replace('{username}', member.user.username)
    .replace('{server}', member.guild.name);

  const embed = new EmbedBuilder()
    .setColor(PALETTE.INFO)
    .setTitle(titleText)
    .setDescription(descriptionText)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
    .setFooter({ text: `Member Node #${member.guild.memberCount} • Secure Connection` })
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(() => {});
});

// Non-Blocking Goodbye Broadcast Worker
client.on('guildMemberRemove', async (member) => {
  const cfg = db.getGoodbye(member.guild.id);
  if (!cfg.enabled || !cfg.channelId) return;

  const channel = member.guild.channels.cache.get(cfg.channelId);
  if (!channel) return;

  const descriptionText = (cfg.message || 'Node Disconnected: **{username}** has departed from the environment.')
    .replace('{user}', `<@${member.id}>`)
    .replace('{username}', member.user.username)
    .replace('{server}', member.guild.name);

  const embed = new EmbedBuilder()
    .setColor(PALETTE.ERROR)
    .setTitle('👋 Departure Signal Broadcast')
    .setDescription(descriptionText)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .setFooter({ text: `Member Node Left • Total: ${member.guild.memberCount}` })
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(() => {});
});

// ============================================================================
// SECTION 6: INTERACTION DISPATCH CONTROLLER & ROUTER ENGINE
// ============================================================================

client.on('interactionCreate', async (interaction) => {
  try {
    // Component Interaction Handling (Buttons / Selects)
    if (interaction.isButton()) {
      return handleButtonInteraction(interaction);
    }

    // Chat Input Slash Command Handling
    if (!interaction.isChatInputCommand()) return;

    const group = interaction.commandName;
    const sub = interaction.options.getSubcommand(false);

    switch (group) {
      case 'jrc':
        await handleJrcCommand(interaction, sub);
        break;
      case 'welcome':
        await handleWelcomeCommand(interaction, sub);
        break;
      case 'goodbye':
        await handleGoodbyeCommand(interaction, sub);
        break;
      case 'mod':
        await handleModCommand(interaction, sub);
        break;
      case 'economy':
        await handleEconomyCommand(interaction, sub);
        break;
      case 'leveling':
        await handleLevelingCommand(interaction, sub);
        break;
      case 'utility':
        await handleUtilityCommand(interaction, sub);
        break;
      case 'fun':
        await handleFunCommand(interaction, sub);
        break;
      default:
        await interaction.reply({ content: 'Error: Unrecognized command execution vector.', ephemeral: true });
        break;
    }
  } catch (err) {
    console.error(`[INTERACTION ERROR] Command execution failure:`, err);
    const errPayload = { content: 'An internal error occurred while executing this command matrix.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(errPayload).catch(() => {});
    } else {
      await interaction.reply(errPayload).catch(() => {});
    }
  }
});

// ============================================================================
// SECTION 7: SUB-ROUTINE MODULE HANDLERS
// ============================================================================

async function handleButtonInteraction(i) {
  const id = i.customId;
  const guildId = i.guild.id;

  if (id === 'wel_config') {
    return i.reply({ content: '⚙️ **Mimu Config Matrix:** Use `/welcome title` or `/welcome message` to customize embed fields.', ephemeral: true });
  }
  if (id === 'wel_channel') {
    return i.reply({ content: '📢 **Channel Binding:** Use `/welcome channel target:#channel` to assign destination routing.', ephemeral: true });
  }
  if (id === 'wel_preview') {
    const cfg = db.getWelcome(guildId);
    const title = cfg.title || '🎉 Welcome to the Network Environment!';
    const desc = (cfg.message || 'Greetings {user}, welcome to **{server}**! We are thrilled to have you onboard.')
      .replace('{user}', `<@${i.user.id}>`)
      .replace('{username}', i.user.username)
      .replace('{server}', i.guild.name);

    const embed = new EmbedBuilder()
      .setColor(PALETTE.INFO)
      .setTitle(title)
      .setDescription(desc)
      .setThumbnail(i.user.displayAvatarURL({ dynamic: true, size: 512 }))
      .setFooter({ text: `Member Node #${i.guild.memberCount} • Live Preview` })
      .setTimestamp();
    return i.reply({ embeds: [embed], ephemeral: true });
  }
  if (id === 'wel_enable') {
    const cfg = db.getWelcome(guildId);
    cfg.enabled = true;
    db.setWelcome(guildId, cfg);
    return i.reply({ content: '🟢 **Welcome Subsystem State:** Shifted to `ONLINE`.', ephemeral: true });
  }
  if (id === 'wel_disable') {
    const cfg = db.getWelcome(guildId);
    cfg.enabled = false;
    db.setWelcome(guildId, cfg);
    return i.reply({ content: '🔴 **Welcome Subsystem State:** Shifted to `OFFLINE`.', ephemeral: true });
  }
}

async function handleJrcCommand(i, sub) {
  if (sub === 'help') {
    const embed = new EmbedBuilder()
      .setColor(PALETTE.DARK)
      .setTitle('JRC Enterprise Core • Command Directory')
      .setDescription('Modular elite infrastructure active with zero-lag routing.\n\n• `/welcome` - Mimu-grade welcome pipeline\n• `/goodbye` - Departure notification engine\n• `/mod` - Administrative security suite\n• `/economy` - Digital currency portfolio\n• `/leveling` - Rank progression matrix\n• `/utility` - Network telemetry tools\n• `/fun` - Entertainment modules')
      .setFooter({ text: 'JRC Execution Framework • High-Tier Precision' });
    return i.reply({ embeds: [embed], ephemeral: true });
  }
  if (sub === 'settings') {
    const wel = db.getWelcome(i.guild.id);
    const bye = db.getGoodbye(i.guild.id);
    const embed = new EmbedBuilder()
      .setColor(PALETTE.DARK)
      .setTitle('System Module Status Matrix')
      .addFields(
        { name: 'Welcome Pipeline', value: wel.enabled ? '`ONLINE`' : '`OFFLINE`', inline: true },
        { name: 'Goodbye Pipeline', value: bye.enabled ? '`ONLINE`' : '`OFFLINE`', inline: true },
        { name: 'Security Guard', value: '`ACTIVE`', inline: true }
      );
    return i.reply({ embeds: [embed], ephemeral: true });
  }
  if (sub === 'about') {
    const embed = new EmbedBuilder()
      .setColor(PALETTE.INFO)
      .setTitle('About JRC Enterprise Suite')
      .setDescription(`Engineered for absolute speed, zero runtime overhead, and elite aesthetic precision.\n\n**Version:** ${CONSTANTS.VERSION}\n**Runtime:** Node.js / Discord.js v14`);
    return i.reply({ embeds: [embed], ephemeral: true });
  }
  if (sub === 'status') {
    const embed = new EmbedBuilder()
      .setColor(PALETTE.SUCCESS)
      .setTitle('Diagnostic Telemetry Report')
      .addFields(
        { name: 'WebSocket Latency', value: `\`${i.client.ws.ping}ms\``, inline: true },
        { name: 'Memory Heap Used', value: `\`${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\``, inline: true },
        { name: 'Cluster Uptime', value: `<t:${Math.floor(Date.now() / 1000 - process.uptime())}:R>`, inline: true }
      );
    return i.reply({ embeds: [embed], ephemeral: true });
  }
}

async function handleWelcomeCommand(i, sub) {
  const guildId = i.guild.id;
  if (sub === 'setup') {
    const cfg = db.getWelcome(guildId);
    const status = cfg.enabled ? '🟢 **ONLINE**' : '🔴 **OFFLINE**';
    const channelText = cfg.channelId ? `<#${cfg.channelId}>` : '`Unassigned`';
    const titleText = cfg.title || '🎉 Welcome to the Network Environment!';
    const msgText = cfg.message || 'Greetings {user}, welcome to **{server}**! We are thrilled to have you onboard.';

    const embed = new EmbedBuilder()
      .setColor(PALETTE.INFO)
      .setTitle('JRC • MIMU CONFIGURATION DASHBOARD')
      .setDescription(`Manage high-performance greeting outputs instantly.\n\n**STATUS:** ${status}\n**CHANNEL:** ${channelText}\n**TITLE:** ${titleText}\n**MESSAGE:** ${msgText}\n\n*Available Variables: \`{user}\`, \`{username}\`, \`{server}\`*`);

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('wel_config').setLabel('Configure').setStyle(ButtonStyle.Secondary).setEmoji('⚙️'),
      new ButtonBuilder().setCustomId('wel_channel').setLabel('Channel').setStyle(ButtonStyle.Secondary).setEmoji('📢'),
      new ButtonBuilder().setCustomId('wel_preview').setLabel('Preview').setStyle(ButtonStyle.Secondary).setEmoji('👁️')
    );
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('wel_enable').setLabel('Enable').setStyle(ButtonStyle.Success).setEmoji('🟢'),
      new ButtonBuilder().setCustomId('wel_disable').setLabel('Disable').setStyle(ButtonStyle.Danger).setEmoji('🔴')
    );
    return i.reply({ embeds: [embed], components: [row1, row2], ephemeral: true });
  }
  if (sub === 'disable') {
    const cfg = db.getWelcome(guildId);
    cfg.enabled = false;
    db.setWelcome(guildId, cfg);
    return i.reply({ content: 'Welcome subsystem successfully suspended.', ephemeral: true });
  }
  if (sub === 'test') {
    const cfg = db.getWelcome(guildId);
    if (!cfg.channelId) return i.reply({ content: 'Error: Target delivery channel is unassigned.', ephemeral: true });
    const channel = i.guild.channels.cache.get(cfg.channelId);
    if (!channel) return i.reply({ content: 'Error: Cached target channel not found.', ephemeral: true });

    const title = cfg.title || '🎉 Welcome to the Network Environment!';
    const desc = (cfg.message || 'Greetings {user}, welcome to **{server}**! We are thrilled to have you onboard.')
      .replace('{user}', `<@${i.user.id}>`)
      .replace('{username}', i.user.username)
      .replace('{server}', i.guild.name);

    const testEmbed = new EmbedBuilder()
      .setColor(PALETTE.INFO)
      .setTitle(title)
      .setDescription(desc)
      .setThumbnail(i.user.displayAvatarURL({ dynamic: true, size: 512 }))
      .setFooter({ text: `Member Node #${i.guild.memberCount} • Test Dispatch` })
      .setTimestamp();

    await channel.send({ embeds: [testEmbed] });
    return i.reply({ content: 'Test Mimu greeting payload transmitted successfully.', ephemeral: true });
  }
  if (sub === 'title') {
    const cfg = db.getWelcome(guildId);
    cfg.title = i.options.getString('text');
    db.setWelcome(guildId, cfg);
    return i.reply({ content: `Embed title locked to: \`${cfg.title}\``, ephemeral: true });
  }
  if (sub === 'message') {
    const cfg = db.getWelcome(guildId);
    cfg.message = i.options.getString('text');
    db.setWelcome(guildId, cfg);
    return i.reply({ content: `Embed description locked to: \`${cfg.message}\``, ephemeral: true });
  }
  if (sub === 'channel') {
    const cfg = db.getWelcome(guildId);
    cfg.channelId = i.options.getChannel('target').id;
    cfg.enabled = true;
    db.setWelcome(guildId, cfg);
    return i.reply({ content: `Welcome transmission channel bound to <#${cfg.channelId}> and subsystem activated.`, ephemeral: true });
  }
  if (sub === 'preview') {
    const cfg = db.getWelcome(guildId);
    const title = cfg.title || '🎉 Welcome to the Network Environment!';
    const desc = (cfg.message || 'Greetings {user}, welcome to **{server}**! We are thrilled to have you onboard.')
      .replace('{user}', `<@${i.user.id}>`)
      .replace('{username}', i.user.username)
      .replace('{server}', i.guild.name);

    const embed = new EmbedBuilder()
      .setColor(PALETTE.INFO)
      .setTitle(title)
      .setDescription(desc)
      .setThumbnail(i.user.displayAvatarURL({ dynamic: true, size: 512 }))
      .setFooter({ text: `Member Node #${i.guild.memberCount} • Preview` })
      .setTimestamp();
    return i.reply({ embeds: [embed], ephemeral: true });
  }
}

async function handleGoodbyeCommand(i, sub) {
  const guildId = i.guild.id;
  if (sub === 'setup') {
    return i.reply({ content: 'Configure departure output via `/goodbye channel` and `/goodbye message`.', ephemeral: true });
  }
  if (sub === 'disable') {
    const cfg = db.getGoodbye(guildId);
    cfg.enabled = false;
    db.setGoodbye(guildId, cfg);
    return i.reply({ content: 'Goodbye subsystem suspended.', ephemeral: true });
  }
  if (sub === 'test') {
    const cfg = db.getGoodbye(guildId);
    if (!cfg.channelId) return i.reply({ content: 'Error: Departure target channel unassigned.', ephemeral: true });
    const channel = i.guild.channels.cache.get(cfg.channelId);
    if (!channel) return i.reply({ content: 'Error: Channel not found.', ephemeral: true });
    
    const text = (cfg.message || 'Node Disconnected: **{username}** has departed from the environment.')
      .replace('{user}', `<@${i.user.id}>`)
      .replace('{username}', i.user.username)
      .replace('{server}', i.guild.name);

    const embed = new EmbedBuilder()
      .setColor(PALETTE.ERROR)
      .setTitle('👋 Departure Signal Broadcast')
      .setDescription(text)
      .setThumbnail(i.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    return i.reply({ content: 'Test goodbye payload transmitted.', ephemeral: true });
  }
  if (sub === 'message') {
    const cfg = db.getGoodbye(guildId);
    cfg.message = i.options.getString('text');
    db.setGoodbye(guildId, cfg);
    return i.reply({ content: `Departure message template updated: \`${cfg.message}\``, ephemeral: true });
  }
  if (sub === 'channel') {
    const cfg = db.getGoodbye(guildId);
    cfg.channelId = i.options.getChannel('target').id;
    cfg.enabled = true;
    db.setGoodbye(guildId, cfg);
    return i.reply({ content: `Departure channel bound to <#${cfg.channelId}> and subsystem activated.`, ephemeral: true });
  }
  if (sub === 'preview') {
    const embed = new EmbedBuilder()
      .setColor(PALETTE.ERROR)
      .setTitle('👋 Departure Signal Broadcast')
      .setDescription(`Node Disconnected: **${i.user.username}** has departed from the environment.`)
      .setThumbnail(i.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setTimestamp();
    return i.reply({ embeds: [embed], ephemeral: true });
  }
}

async function handleModCommand(i, sub) {
  if (sub === 'ban') {
    const target = i.options.getMember('target');
    const reason = i.options.getString('reason') || 'Administrative action';
    if (!target.bannable) return i.reply({ content: 'Error: Insufficient permission hierarchy to ban target.', ephemeral: true });
    await target.ban({ reason });
    return i.reply({ content: `Successfully banned member \`${target.user.tag}\`. Reason: \`${reason}\``, ephemeral: true });
  }
  if (sub === 'kick') {
    const target = i.options.getMember('target');
    const reason = i.options.getString('reason') || 'Administrative action';
    if (!target.kickable) return i.reply({ content: 'Error: Insufficient permission hierarchy to kick target.', ephemeral: true });
    await target.kick(reason);
    return i.reply({ content: `Successfully expelled member \`${target.user.tag}\`. Reason: \`${reason}\``, ephemeral: true });
  }
  if (sub === 'timeout') {
    const target = i.options.getMember('target');
    const mins = i.options.getInteger('minutes');
    const reason = i.options.getString('reason') || 'Administrative action';
    await target.timeout(mins * 60000, reason);
    return i.reply({ content: `Applied isolation timeout to <@${target.id}> for **${mins} minutes**.`, ephemeral: true });
  }
  if (sub === 'warn') {
    const target = i.options.getUser('target');
    const reason = i.options.getString('reason');
    db.addWarning(target.id, { reason, date: new Date().toLocaleDateString(), issuer: i.user.tag });
    const count = db.getWarnings(target.id).length;

    const embed = new EmbedBuilder()
      .setColor(PALETTE.WARNING)
      .setTitle('⚠️ Disciplinary Strike Logged')
      .addFields(
        { name: 'Target Member', value: `<@${target.id}>`, inline: true },
        { name: 'Total Strikes', value: `\`${count}\``, inline: true },
        { name: 'Infraction Reason', value: reason, inline: false }
      )
      .setTimestamp();
    return i.reply({ embeds: [embed] });
  }
  if (sub === 'warnings') {
    const target = i.options.getUser('target');
    const list = db.getWarnings(target.id);
    if (!list.length) return i.reply({ content: `Target <@${target.id}> has a clean disciplinary record.`, ephemeral: true });
    
    const formatted = list.map((w, idx) => `\`${idx + 1}.\` ${w.reason} — *Issued by ${w.issuer}* (${w.date})`).join('\n');
    const embed = new EmbedBuilder()
      .setColor(PALETTE.DARK)
      .setTitle(`Disciplinary Records • ${target.username}`)
      .setDescription(formatted);
    return i.reply({ embeds: [embed], ephemeral: true });
  }
  if (sub === 'clearwarnings') {
    const target = i.options.getUser('target');
    db.clearWarnings(target.id);
    return i.reply({ content: `Successfully wiped all disciplinary strikes for <@${target.id}>.`, ephemeral: true });
  }
  if (sub === 'clear') {
    const amount = i.options.getInteger('amount');
    if (amount < 1 || amount > 100) return i.reply({ content: 'Error: Purge count must be between 1 and 100 messages.', ephemeral: true });
    const deleted = await i.channel.bulkDelete(amount, true);
    return i.reply({ content: `Successfully purged \`${deleted.size}\` traffic packets from the channel.`, ephemeral: true });
  }
  if (sub === 'lock') {
    await i.channel.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: false });
    return i.reply({ content: '🔒 Text channel transmission locked down securely.', ephemeral: true });
  }
  if (sub === 'unlock') {
    await i.channel.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: null });
    return i.reply({ content: '🔓 Text channel communication locks restored.', ephemeral: true });
  }
}

async function handleEconomyCommand(i, sub) {
  const userId = i.user.id;
  if (sub === 'balance') {
    const target = i.options.getUser('target') || i.user;
    const eco = db.getEconomy(target.id);
    const embed = new EmbedBuilder()
      .setColor(PALETTE.GOLD)
      .setTitle(`Financial Portfolio • ${target.username}`)
      .addFields(
        { name: 'Wallet Liquidity', value: `\`$${eco.wallet.toLocaleString()}\``, inline: true },
        { name: 'Bank Vault Asset', value: `\`$${eco.bank.toLocaleString()}\``, inline: true },
        { name: 'Total Net Worth', value: `\`$${(eco.wallet + eco.bank).toLocaleString()}\``, inline: false }
      )
      .setThumbnail(target.displayAvatarURL());
    return i.reply({ embeds: [embed], ephemeral: true });
  }
  if (sub === 'daily') {
    const eco = db.getEconomy(userId);
    const now = Date.now();
    if (now - eco.lastDaily < CONSTANTS.COOLDOWN_DAILY) {
      const remaining = Math.ceil((CONSTANTS.COOLDOWN_DAILY - (now - eco.lastDaily)) / 3600000);
      return i.reply({ content: `⏳ Daily allowance already claimed. Next payout available in approximately **${remaining} hours**.`, ephemeral: true });
    }
    const reward = 500;
    eco.wallet += reward;
    eco.lastDaily = now;
    db.setEconomy(userId, eco);

    const embed = new EmbedBuilder()
      .setColor(PALETTE.SUCCESS)
      .setTitle('💰 Daily Allowance Claimed')
      .setDescription(`Successfully deposited **$${reward}** into your wallet balance!`);
    return i.reply({ embeds: [embed] });
  }
  if (sub === 'work') {
    const eco = db.getEconomy(userId);
    const now = Date.now();
    if (now - eco.lastWork < CONSTANTS.COOLDOWN_WORK) {
      const remainingMins = Math.ceil((CONSTANTS.COOLDOWN_WORK - (now - eco.lastWork)) / 60000);
      return i.reply({ content: `⏳ Labor shift on cooldown. Report back for work in **${remainingMins} minutes**.`, ephemeral: true });
    }
    const earned = Math.floor(Math.random() * 200) + 100;
    eco.wallet += earned;
    eco.lastWork = now;
    db.setEconomy(userId, eco);

    const jobs = ['Network Engineer', 'Security Auditor', 'Database Administrator', 'System Architect', 'Full-Stack Developer'];
    const jobTitle = jobs[Math.floor(Math.random() * jobs.length)];

    const embed = new EmbedBuilder()
      .setColor(PALETTE.SUCCESS)
      .setTitle('💼 Labor Shift Completed')
      .setDescription(`You worked as a **${jobTitle}** and earned **$${earned}**!`);
    return i.reply({ embeds: [embed] });
  }
  if (sub === 'deposit') {
    const amount = i.options.getInteger('amount');
    const eco = db.getEconomy(userId);
    if (amount <= 0 || eco.wallet < amount) {
      return i.reply({ content: 'Error: Invalid deposit amount or insufficient wallet liquidity.', ephemeral: true });
    }
    eco.wallet -= amount;
    eco.bank += amount;
    db.setEconomy(userId, eco);
    return i.reply({ content: `Successfully deposited **$${amount.toLocaleString()}** into your secure bank vault.`, ephemeral: true });
  }
  if (sub === 'withdraw') {
    const amount = i.options.getInteger('amount');
    const eco = db.getEconomy(userId);
    if (amount <= 0 || eco.bank < amount) {
      return i.reply({ content: 'Error: Invalid withdrawal amount or insufficient bank vault balance.', ephemeral: true });
    }
    eco.bank -= amount;
    eco.wallet += amount;
    db.setEconomy(userId, eco);
    return i.reply({ content: `Successfully withdrew **$${amount.toLocaleString()}** from your bank vault into your wallet.`, ephemeral: true });
  }
  if (sub === 'pay') {
    const target = i.options.getUser('target');
    const amount = i.options.getInteger('amount');
    if (target.id === userId) return i.reply({ content: 'Error: Cannot transfer capital to yourself.', ephemeral: true });
    if (amount <= 0) return i.reply({ content: 'Error: Transfer amount must be greater than zero.', ephemeral: true });

    const senderEco = db.getEconomy(userId);
    if (senderEco.wallet < amount) {
      return i.reply({ content: 'Error: Insufficient wallet liquidity for this transfer.', ephemeral: true });
    }
    const recipientEco = db.getEconomy(target.id);

    senderEco.wallet -= amount;
    recipientEco.wallet += amount;
    db.setEconomy(userId, senderEco);
    db.setEconomy(target.id, recipientEco);

    return i.reply({ content: `Successfully transferred **$${amount.toLocaleString()}** to <@${target.id}>.` });
  }
}

async function handleLevelingCommand(i, sub) {
  if (sub === 'rank') {
    const target = i.options.getUser('target') || i.user;
    const rankData = db.getLevel(target.id);
    const nextXp = rankData.level * 100;

    const embed = new EmbedBuilder()
      .setColor(PALETTE.PURPLE)
      .setTitle(`Rank Telemetry • ${target.username}`)
      .addFields(
        { name: 'Current Level', value: `\`Level ${rankData.level}\``, inline: true },
        { name: 'XP Progress', value: `\`${rankData.xp} / ${nextXp} XP\``, inline: true }
      )
      .setThumbnail(target.displayAvatarURL());
    return i.reply({ embeds: [embed], ephemeral: true });
  }
  if (sub === 'leaderboard') {
    const sorted = Array.from(db.leveling.entries())
      .sort((a, b) => b[1].level - a[1].level || b[1].xp - a[1].xp)
      .slice(0, 10);

    if (!sorted.length) return i.reply({ content: 'No leveling telemetry data recorded yet.', ephemeral: true });

    const desc = sorted.map(([id, data], idx) => `\`${idx + 1}.\` <@${id}> — Level **${data.level}** (${data.xp} XP)`).join('\n');
    const embed = new EmbedBuilder()
      .setColor(PALETTE.GOLD)
      .setTitle('🏆 Network Rank Leaderboard')
      .setDescription(desc);
    return i.reply({ embeds: [embed] });
  }
}

async function handleUtilityCommand(i, sub) {
  if (sub === 'userinfo') {
    const target = i.options.getUser('target') || i.user;
    const member = await i.guild.members.fetch(target.id).catch(() => null);
    const embed = new EmbedBuilder()
      .setColor(PALETTE.DARK)
      .setThumbnail(target.displayAvatarURL({ size: 512 }))
      .setTitle(`Identity Telemetry • ${target.username}`)
      .addFields(
        { name: 'User ID', value: `\`${target.id}\``, inline: true },
        { name: 'Account Created', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Joined Environment', value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : '`Unknown`', inline: true }
      );
    return i.reply({ embeds: [embed], ephemeral: true });
  }
  if (sub === 'serverinfo') {
    const guild = i.guild;
    const embed = new EmbedBuilder()
      .setColor(PALETTE.DARK)
      .setThumbnail(guild.iconURL({ size: 512 }))
      .setTitle(`Environment Matrix • ${guild.name}`)
      .addFields(
        { name: 'Owner Node', value: `<@${guild.ownerId}>`, inline: true },
        { name: 'Member Nodes', value: `\`${guild.memberCount}\``, inline: true },
        { name: 'Boost Tier', value: `\`Tier ${guild.premiumTier}\``, inline: true },
        { name: 'Created At', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true }
      );
    return i.reply({ embeds: [embed], ephemeral: true });
  }
  if (sub === 'avatar') {
    const target = i.options.getUser('target') || i.user;
    const embed = new EmbedBuilder()
      .setColor(PALETTE.DARK)
      .setTitle(`Asset Retrieval • ${target.username}`)
      .setImage(target.displayAvatarURL({ size: 1024, dynamic: true }));
    return i.reply({ embeds: [embed], ephemeral: true });
  }
  if (sub === 'ping') {
    const embed = new EmbedBuilder()
      .setColor(PALETTE.SUCCESS)
      .setTitle('📡 Gateway Latency Telemetry')
      .addFields(
        { name: 'WebSocket Ping', value: `\`${i.client.ws.ping}ms\``, inline: true },
        { name: 'Round-Trip Delay', value: `\`${Date.now() - i.createdTimestamp}ms\``, inline: true }
      );
    return i.reply({ embeds: [embed], ephemeral: true });
  }
}

async function handleFunCommand(i, sub) {
  if (sub === '8ball') {
    const pool = [
      'Affirmative. The outlook is highly favorable.',
      'Negative. Data indicators suggest otherwise.',
      'Cryptographic oracle response inconclusive. Query again.',
      'Without a doubt.',
      'Outlook unfavorable. Exercise caution.',
      'Signs point to yes.',
      'Cannot predict execution outcome right now.'
    ];
    const answer = pool[Math.floor(Math.random() * pool.length)];
    return i.reply(`🔮 **Oracle Matrix:** ${answer}`);
  }
  if (sub === 'coinflip') {
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    return i.reply(`🪙 **Cryptographic Coinflip:** ${result}`);
  }
  if (sub === 'dice') {
    const roll = Math.floor(Math.random() * 6) + 1;
    return i.reply(`🎲 **Random Number Generator:** Rolled a **${roll}** (1-6).`);
  }
  if (sub === 'choose') {
    const raw = i.options.getString('options');
    const options = raw.split(',').map(o => o.trim()).filter(Boolean);
    if (options.length < 2) return i.reply({ content: 'Error: Provide at least two distinct comma-separated options.', ephemeral: true });
    const selection = options[Math.floor(Math.random() * options.length)];
    return i.reply(`🎯 **Algorithmic Decider Matrix:** I select **"${selection}"**.`);
  }
}

// ============================================================================
// SECTION 8: CLIENT INITIALIZATION & SESSION AUTHENTICATION
// ============================================================================

if (!process.env.DISCORD_TOKEN) {
  console.error('[FATAL CONFIG] Missing DISCORD_TOKEN inside environment variables.');
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
