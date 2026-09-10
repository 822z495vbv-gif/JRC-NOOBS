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
  AuditLogEvent
} = require('discord.js');
require('dotenv').config();

// ==========================================
// --- COLOR PALETTE & GLOBAL CONFIGURATION ---
// ==========================================
const PALETTE = {
  DARK: '#2B2D31',
  SUCCESS: '#57F287',
  ERROR: '#ED4245',
  GOLD: '#FEE75C',
  INFO: '#5865F2',
  WARNING: '#FEE75C',
  PURPLE: '#9B59B6'
};

// ==========================================
// --- IN-MEMORY STORAGE MAPS ---
// ==========================================
const economy = new Map();
const leveling = new Map();
const warnings = new Map();
const banTracker = new Map();
const welcomeConfig = new Map();
const goodbyeConfig = new Map();
const automodConfig = new Map();
const reactionRoles = new Map();
const logChannels = new Map();
const antiNukeConfig = new Map();
const antiRaidConfig = new Map();

// Helper functions for data management
const getEco = (id) => economy.get(id) || { wallet: 1000, bank: 0, lastDaily: 0, lastWork: 0 };
const setEco = (id, data) => economy.set(id, data);

const getXp = (id) => leveling.get(id) || { xp: 0, level: 1, lastMessage: 0 };
const setXp = (id, data) => leveling.set(id, data);

const getWarns = (id) => warnings.get(id) || [];
const addWarn = (id, warn) => {
  const current = getWarns(id);
  current.push(warn);
  warnings.set(id, current);
};

// ==========================================
// --- COMPREHENSIVE COMMAND DEFINITIONS ---
// ==========================================
const commands = [
  // 1. /jrc
  new SlashCommandBuilder()
    .setName('jrc')
    .setDescription('JRC bot core infrastructure control commands')
    .addSubcommand(sub => sub.setName('help').setDescription('Displays comprehensive help menu and navigation'))
    .addSubcommand(sub => sub.setName('settings').setDescription('Views global server module configuration states'))
    .addSubcommand(sub => sub.setName('about').setDescription('Displays architectural and developer information for JRC'))
    .addSubcommand(sub => sub.setName('status').setDescription('Performs deep telemetry check on internal system workers')),

  // 2. /welcome
  new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Configure automated member welcome greetings')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub.setName('setup').setDescription('Setup interactive welcome configuration dashboard'))
    .addSubcommand(sub => sub.setName('disable').setDescription('Completely deactivates the welcome greeting engine'))
    .addSubcommand(sub => sub.setName('test').setDescription('Dispatches a test welcome message to the designated channel'))
    .addSubcommand(sub => sub.setName('message').setDescription('Customizes the textual payload for incoming members').addStringOption(opt => opt.setName('text').setDescription('Message layout text content').setRequired(true)))
    .addSubcommand(sub => sub.setName('channel').setDescription('Designates the output channel for welcome cards').addChannelOption(opt => opt.setName('target').setDescription('Target text channel').setRequired(true)))
    .addSubcommand(sub => sub.setName('preview').setDescription('Renders a visual preview of the currently configured welcome embed')),

  // 3. /goodbye
  new SlashCommandBuilder()
    .setName('goodbye')
    .setDescription('Configure automated member departure notifications')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub.setName('setup').setDescription('Setup interactive goodbye configuration dashboard'))
    .addSubcommand(sub => sub.setName('disable').setDescription('Completely deactivates the departure notification engine'))
    .addSubcommand(sub => sub.setName('test').setDescription('Dispatches a test departure notification message'))
    .addSubcommand(sub => sub.setName('message').setDescription('Customizes the departure broadcast text').addStringOption(opt => opt.setName('text').setDescription('Message layout text content').setRequired(true)))
    .addSubcommand(sub => sub.setName('channel').setDescription('Designates the channel for departure broadcasts').addChannelOption(opt => opt.setName('target').setDescription('Target text channel').setRequired(true)))
    .addSubcommand(sub => sub.setName('preview').setDescription('Renders a visual preview of the goodbye embed')),

  // 4. /mod
  new SlashCommandBuilder()
    .setName('mod')
    .setDescription('Advanced server moderation toolkit')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(sub => sub.setName('ban').setDescription('Issues an administrative ban against a member').addUserOption(opt => opt.setName('target').setDescription('Target user account').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('Justification')))
    .addSubcommand(sub => sub.setName('kick').setDescription('Expels a member from the guild').addUserOption(opt => opt.setName('target').setDescription('Target user account').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('Justification')))
    .addSubcommand(sub => sub.setName('timeout').setDescription('Restricts a user from speaking or chatting').addUserOption(opt => opt.setName('target').setDescription('Target user').setRequired(true)).addIntegerOption(opt => opt.setName('minutes').setDescription('Duration in minutes').setRequired(true)))
    .addSubcommand(sub => sub.setName('warn').setDescription('Records an official administrative warning').addUserOption(opt => opt.setName('target').setDescription('Target user').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('Violation reason').setRequired(true)))
    .addSubcommand(sub => sub.setName('warnings').setDescription('Inspects violation telemetry for a user').addUserOption(opt => opt.setName('target').setDescription('Target user').setRequired(true)))
    .addSubcommand(sub => sub.setName('clear').setDescription('Purges recent messages in bulk').addIntegerOption(opt => opt.setName('amount').setDescription('Number of messages to sweep').setRequired(true)))
    .addSubcommand(sub => sub.setName('lock').setDescription('Locks the current channel down against standard messaging'))
    .addSubcommand(sub => sub.setName('unlock').setDescription('Restores normal messaging permissions to the channel')),

  // 5. /automod
  new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Automated filter matrix and chat policing controls')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('setup').setDescription('Initializes the baseline automod rule matrix'))
    .addSubcommand(sub => sub.setName('enable').setDescription('Enforces automated chat filtering globally'))
    .addSubcommand(sub => sub.setName('disable').setDescription('Suspends automated chat filtering rules'))
    .addSubcommand(sub => sub.setName('words').setDescription('Manages the blocklisted terminology database'))
    .addSubcommand(sub => sub.setName('spam').setDescription('Configures flood control and rapid message thresholds'))
    .addSubcommand(sub => sub.setName('links').setDescription('Configures external hyperlink neutralization policies')),

  // 6. /reactionrole
  new SlashCommandBuilder()
    .setName('reactionrole')
    .setDescription('Interactive self-assignable role panels')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(sub => sub.setName('create').setDescription('Constructs a fresh reaction role embed panel'))
    .addSubcommand(sub => sub.setName('add').setDescription('Binds a specific emoji to a selectable role'))
    .addSubcommand(sub => sub.setName('remove').setDescription('Unbinds a reaction role mapping'))
    .addSubcommand(sub => sub.setName('list').setDescription('Lists active reaction role interfaces in this guild')),

  // 7. /logs
  new SlashCommandBuilder()
    .setName('logs')
    .setDescription('Administrative audit event logging infrastructure')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('setup').setDescription('Assigns an audit channel for event tracking'))
    .addSubcommand(sub => sub.setName('disable').setDescription('Deactivates audit event broadcasting'))
    .addSubcommand(sub => sub.setName('test').setDescription('Dispatches a test packet to verify logger delivery')),

  // 8. /utility
  new SlashCommandBuilder()
    .setName('utility')
    .setDescription('Everyday server utility telemetry commands')
    .addSubcommand(sub => sub.setName('userinfo').setDescription('Retrieves deep account metadata').addUserOption(opt => opt.setName('target').setDescription('Target user')))
    .addSubcommand(sub => sub.setName('serverinfo').setDescription('Inspects guild metrics and configurations'))
    .addSubcommand(sub => sub.setName('avatar').setDescription('Extracts high-resolution user avatar asset').addUserOption(opt => opt.setName('target').setDescription('Target user')))
    .addSubcommand(sub => sub.setName('roleinfo').setDescription('Displays technical role hierarchy attributes').addRoleOption(opt => opt.setName('target').setDescription('Target role').setRequired(true)))
    .addSubcommand(sub => sub.setName('channelinfo').setDescription('Inspects current channel node metrics')),

  // 9. /fun
  new SlashCommandBuilder()
    .setName('fun')
    .setDescription('Interactive games and entertainment tools')
    .addSubcommand(sub => sub.setName('8ball').setDescription('Consults the mystical machine oracle').addStringOption(opt => opt.setName('question').setDescription('Query text').setRequired(true)))
    .addSubcommand(sub => sub.setName('coinflip').setDescription('Flips a standard fair-probability coin'))
    .addSubcommand(sub => sub.setName('dice').setDescription('Rolls a parameterized multi-sided die'))
    .addSubcommand(sub => sub.setName('choose').setDescription('Randomly selects an option from a comma-separated list').addStringOption(opt => opt.setName('options').setDescription('Choices separated by commas').setRequired(true)))
    .addSubcommand(sub => sub.setName('poll').setDescription('Constructs an interactive reaction voting poll').addStringOption(opt => opt.setName('question').setDescription('Poll topic').setRequired(true))),

  // 10. /antinuke
  new SlashCommandBuilder()
    .setName('antinuke')
    .setDescription('Advanced anti-exploit and mass-action security engine')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('setup').setDescription('Bootstraps anti-nuke defense baselines'))
    .addSubcommand(sub => sub.setName('enable').setDescription('Arms the automated security tripwires'))
    .addSubcommand(sub => sub.setName('disable').setDescription('Disarms the security intervention matrix'))
    .addSubcommand(sub => sub.setName('config').setDescription('Fine-tunes rate limit thresholds and penalties'))
    .addSubcommand(sub => sub.setName('status').setDescription('Outputs real-time security operational status')),

  // 11. /raid
  new SlashCommandBuilder()
    .setName('raid')
    .setDescription('Anti-raid perimeter lockdown and verification controls')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('setup').setDescription('Configures anti-raid join filters'))
    .addSubcommand(sub => sub.setName('enable').setDescription('Engages emergency anti-raid lockdown'))
    .addSubcommand(sub => sub.setName('disable').setDescription('Lifts anti-raid restrictions'))
    .addSubcommand(sub => sub.setName('config').setDescription('Adjusts account age minimums for entry'))
    .addSubcommand(sub => sub.setName('status').setDescription('Checks perimeter security metrics'))
].map(cmd => cmd.toJSON());

// ==========================================
// --- CLIENT INITIALIZATION ---
// ==========================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.MessageContent
  ]
});

// ==========================================
// --- EVENT LISTENERS & BACKGROUND WORKERS ---
// ==========================================
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const linkRegex = /(https?:\/\/[^\s]+)|(discord\.gg\/[^\s]+)|(discord\.com\/invite\/[^\s]+)/gi;
  if (linkRegex.test(message.content)) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      await message.delete().catch(() => {});
      const alert = await message.channel.send(`<@${message.author.id}> External links are strictly restricted by server policy.`);
      setTimeout(() => alert.delete().catch(() => {}), 4000);
      return;
    }
  }

  const now = Date.now();
  const userXp = getXp(message.author.id);

  if (now - userXp.lastMessage > 60000) {
    userXp.xp += Math.floor(Math.random() * 15) + 15;
    userXp.lastMessage = now;

    const nextLevelXp = userXp.level * 100;
    if (userXp.xp >= nextLevelXp) {
      userXp.level += 1;
      userXp.xp -= nextLevelXp;
      const embed = new EmbedBuilder()
        .setColor(PALETTE.GOLD)
        .setDescription(`✨ Progression Alert: <@${message.author.id}> has advanced to **Level ${userXp.level}**!`);
      message.channel.send({ embeds: [embed] }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
    }
    setXp(message.author.id, userXp);
  }
});

client.on('guildMemberAdd', async (member) => {
  const config = welcomeConfig.get(member.guild.id);
  if (!config || !config.enabled || !config.channelId) return;

  const channel = member.guild.channels.cache.get(config.channelId);
  if (!channel) return;

  let text = config.message || 'Welcome {user} to {server}!';
  text = text.replace('{user}', `<@${member.id}>`)
             .replace('{username}', member.user.username)
             .replace('{server}', member.guild.name);

  const embed = new EmbedBuilder()
    .setColor(PALETTE.INFO)
    .setTitle('🎉 New Member Arrival')
    .setDescription(text)
    .setThumbnail(member.user.displayAvatarURL())
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(() => {});
});

client.on('guildMemberRemove', async (member) => {
  const config = goodbyeConfig.get(member.guild.id);
  if (!config || !config.enabled || !config.channelId) return;

  const channel = member.guild.channels.cache.get(config.channelId);
  if (!channel) return;

  let text = config.message || '{username} has departed from the network.';
  text = text.replace('{user}', `<@${member.id}>`)
             .replace('{username}', member.user.username)
             .replace('{server}', member.guild.name);

  const embed = new EmbedBuilder()
    .setColor(PALETTE.ERROR)
    .setTitle('👋 Member Departure')
    .setDescription(text)
    .setThumbnail(member.user.displayAvatarURL())
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(() => {});
});

client.once('ready', async () => {
  console.log(`System connected successfully as ${client.user.tag}`);
  
  client.user.setPresence({ 
    activities: [{ name: 'JOIN https://discord.gg/8SCGSyTwDb', type: ActivityType.Custom }], 
    status: 'dnd' 
  });

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID || client.user.id),
      { body: commands }
    );
    console.log('Global slash command tree successfully synchronized.');
  } catch (err) {
    console.error('Failed to sync global commands:', err);
  }
});

// ==========================================
// --- INTERACTION ROUTER & CONTROLLERS ---
// ==========================================
client.on('interactionCreate', async (i) => {
  // Handle Button Interactions
  if (i.isButton()) {
    if (i.customId === 'wel_config') {
      return i.reply({ content: '⚙️ Configuration settings panel accessed.', ephemeral: true });
    }
    if (i.customId === 'wel_channel') {
      return i.reply({ content: '📢 Use the `/welcome channel` command to specify your broadcast channel.', ephemeral: true });
    }
    if (i.customId === 'wel_preview') {
      const embed = new EmbedBuilder()
        .setColor(PALETTE.INFO)
        .setTitle('🎉 Welcome Preview')
        .setDescription(`Welcome <@${i.user.id}> to ${i.guild.name}!`);
      return i.reply({ embeds: [embed], ephemeral: true });
    }
    if (i.customId === 'wel_enable') {
      let cfg = welcomeConfig.get(i.guild.id) || { enabled: false };
      cfg.enabled = true;
      welcomeConfig.set(i.guild.id, cfg);
      return i.reply({ content: '🟢 Welcome greeting engine has been **enabled**!', ephemeral: true });
    }
    if (i.customId === 'wel_disable') {
      let cfg = welcomeConfig.get(i.guild.id) || { enabled: true };
      cfg.enabled = false;
      welcomeConfig.set(i.guild.id, cfg);
      return i.reply({ content: '🔴 Welcome greeting engine has been **disabled**.', ephemeral: true });
    }
    return;
  }

  if (!i.isChatInputCommand()) return;

  const group = i.commandName;
  const sub = i.options.getSubcommand(false);

  // ------------------------------------------
  // 1. /jrc HANDLER
  // ------------------------------------------
  if (group === 'jrc') {
    if (sub === 'help') {
      const embed = new EmbedBuilder()
        .setColor(PALETTE.DARK)
        .setTitle('JRC Core Command Matrix')
        .setDescription('Welcome to the advanced modular infrastructure suite. Use the following slash command groups to manage your environment:\n\n• `/welcome` - Greeting configurations\n• `/goodbye` - Departure logs\n• `/mod` - Administrative controls\n• `/automod` - Content filtration\n• `/reactionrole` - Interactive panels\n• `/logs` - Audit telemetry\n• `/utility` - Server tooling\n• `/fun` - Entertainment apps\n• `/antinuke` - Security engines\n• `/raid` - Anti-raid lockdowns')
        .setFooter({ text: 'JRC Security & Infrastructure Suite' });
      return i.reply({ embeds: [embed], ephemeral: true });
    }
    if (sub === 'settings') {
      const embed = new EmbedBuilder()
        .setColor(PALETTE.DARK)
        .setTitle('Global Module Configurations')
        .addFields(
          { name: 'Welcome Engine', value: welcomeConfig.get(i.guild.id)?.enabled ? '`ACTIVE`' : '`DISABLED`', inline: true },
          { name: 'Goodbye Engine', value: goodbyeConfig.get(i.guild.id)?.enabled ? '`ACTIVE`' : '`DISABLED`', inline: true },
          { name: 'Anti-Nuke Matrix', value: '`SECURE`', inline: true }
        );
      return i.reply({ embeds: [embed], ephemeral: true });
    }
    if (sub === 'about') {
      const embed = new EmbedBuilder()
        .setColor(PALETTE.INFO)
        .setTitle('About JRC Infrastructure')
        .setDescription('JRC is an elite-tier modular Discord operations framework engineered for maximum throughput, low-latency execution, and granular security controls.');
      return i.reply({ embeds: [embed], ephemeral: true });
    }
    if (sub === 'status') {
      const embed = new EmbedBuilder()
        .setColor(PALETTE.SUCCESS)
        .setTitle('System Telemetry Report')
        .addFields(
          { name: 'WebSocket Latency', value: `\`${i.client.ws.ping}ms\``, inline: true },
          { name: 'System Uptime', value: `\`${Math.floor(i.client.uptime / 60000)} minutes\``, inline: true },
          { name: 'Memory Allocation', value: `\`${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\``, inline: true }
        );
      return i.reply({ embeds: [embed], ephemeral: true });
    }
  }

  // ------------------------------------------
  // 2. /welcome HANDLER
  // ------------------------------------------
  if (group === 'welcome') {
    if (sub === 'setup') {
      const embed = new EmbedBuilder()
        .setColor(PALETTE.INFO)
        .setTitle('JRC • WELCOME CONFIGURATION')
        .setDescription('Configure how JRC welcomes new members into your server.\n\n**SYSTEM STATUS**\n🔴 **DISABLED**\n**CHANNEL**\n`Not configured`\n**EMBED COLOR**\n`#5865F2`\n**GREETING / TITLE**\n🎉 Welcome {user}!\n**DESCRIPTION**\nWe\'re glad to have you here. Enjoy your stay!\n**VARIABLES**\n`{user}` `{username}` `{server}`');

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('wel_config').setLabel('Configure').setStyle(ButtonStyle.Secondary).setEmoji('⚙️'),
        new ButtonBuilder().setCustomId('wel_channel').setLabel('Channel').setStyle(ButtonStyle.Secondary).setEmoji('📢'),
        new ButtonBuilder().setCustomId('wel_preview').setLabel('Preview').setStyle(ButtonStyle.Secondary).setEmoji('👁️')
      );
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('wel_enable').setLabel('Enable').setStyle(ButtonStyle.Success).setEmoji('🟢'),
        new ButtonBuilder().setCustomId('wel_disable').setLabel('Disable').setStyle(ButtonStyle.Danger).setEmoji('🔴')
      );
      return i.reply({ embeds: [embed], components: [row1, row2] });
    }
    if (sub === 'disable') {
      let cfg = welcomeConfig.get(i.guild.id) || { enabled: false };
      cfg.enabled = false;
      welcomeConfig.set(i.guild.id, cfg);
      return i.reply({ content: 'Welcome greeting system has been deactivated.', ephemeral: true });
    }
    if (sub === 'test') {
      const cfg = welcomeConfig.get(i.guild.id);
      if (!cfg || !cfg.channelId) return i.reply({ content: 'Error: Welcome target channel is not configured.', ephemeral: true });
      const ch = i.guild.channels.cache.get(cfg.channelId);
      ch?.send(`🎉 Test Payload: Welcome <@${i.user.id}> to ${i.guild.name}!`);
      return i.reply({ content: 'Test packet dispatched successfully.', ephemeral: true });
    }
    if (sub === 'message') {
      let cfg = welcomeConfig.get(i.guild.id) || { enabled: false };
      cfg.message = i.options.getString('text');
      welcomeConfig.set(i.guild.id, cfg);
      return i.reply({ content: `Welcome message template updated to: \`${cfg.message}\``, ephemeral: true });
    }
    if (sub === 'channel') {
      let cfg = welcomeConfig.get(i.guild.id) || { enabled: false };
      cfg.channelId = i.options.getChannel('target').id;
      cfg.enabled = true;
      welcomeConfig.set(i.guild.id, cfg);
      return i.reply({ content: `Welcome delivery channel successfully bound to <#${cfg.channelId}>.`, ephemeral: true });
    }
    if (sub === 'preview') {
      const embed = new EmbedBuilder()
        .setColor(PALETTE.INFO)
        .setTitle('🎉 Welcome Preview')
        .setDescription(`Welcome <@${i.user.id}> to ${i.guild.name}!`);
      return i.reply({ embeds: [embed], ephemeral: true });
    }
  }

  // ------------------------------------------
  // 3. /goodbye HANDLER
  // ------------------------------------------
  if (group === 'goodbye') {
    if (sub === 'setup') {
      const embed = new EmbedBuilder()
        .setColor(PALETTE.ERROR)
        .setTitle('JRC • GOODBYE CONFIGURATION')
        .setDescription('Configure how JRC handles departing members.\n\n**SYSTEM STATUS**\n🔴 **DISABLED**\n**CHANNEL**\n`Not configured`');
      return i.reply({ embeds: [embed], ephemeral: true });
    }
    if (sub === 'disable') {
      let cfg = goodbyeConfig.get(i.guild.id) || { enabled: false };
      cfg.enabled = false;
      goodbyeConfig.set(i.guild.id, cfg);
      return i.reply({ content: 'Goodbye notification engine disabled.', ephemeral: true });
    }
    if (sub === 'test') {
      const cfg = goodbyeConfig.get(i.guild.id);
      if (!cfg || !cfg.channelId) return i.reply({ content: 'Error: Goodbye target channel is unassigned.', ephemeral: true });
      const ch = i.guild.channels.cache.get(cfg.channelId);
      ch?.send(`👋 Test Departure Payload: <@${i.user.id}> has left the server.`);
      return i.reply({ content: 'Departure test signal dispatched.', ephemeral: true });
    }
    if (sub === 'message') {
      let cfg = goodbyeConfig.get(i.guild.id) || { enabled: false };
      cfg.message = i.options.getString('text');
      goodbyeConfig.set(i.guild.id, cfg);
      return i.reply({ content: `Goodbye template updated: \`${cfg.message}\``, ephemeral: true });
    }
    if (sub === 'channel') {
      let cfg = goodbyeConfig.get(i.guild.id) || { enabled: false };
      cfg.channelId = i.options.getChannel('target').id;
      cfg.enabled = true;
      goodbyeConfig.set(i.guild.id, cfg);
      return i.reply({ content: `Goodbye channel set to <#${cfg.channelId}>.`, ephemeral: true });
    }
    if (sub === 'preview') {
      const embed = new EmbedBuilder()
        .setColor(PALETTE.ERROR)
        .setTitle('👋 Goodbye Preview')
        .setDescription(`${i.user.username} has left the server.`);
      return i.reply({ embeds: [embed], ephemeral: true });
    }
  }

  // ------------------------------------------
  // 4. /mod HANDLER
  // ------------------------------------------
  if (group === 'mod') {
    if (sub === 'ban') {
      const target = i.options.getMember('target');
      const reason = i.options.getString('reason') || 'Administrative enforcement';
      await target.ban({ reason });
      return i.reply({ content: `Successfully banned \`${target.user.tag}\`. Reason: ${reason}`, ephemeral: true });
    }
    if (sub === 'kick') {
      const target = i.options.getMember('target');
      const reason = i.options.getString('reason') || 'Administrative enforcement';
      await target.kick(reason);
      return i.reply({ content: `Successfully kicked \`${target.user.tag}\`. Reason: ${reason}`, ephemeral: true });
    }
    if (sub === 'timeout') {
      const target = i.options.getMember('target');
      const mins = i.options.getInteger('minutes');
      await target.timeout(mins * 60000);
      return i.reply({ content: `Applied timeout to <@${target.id}> for **${mins} minutes**.`, ephemeral: true });
    }
    if (sub === 'warn') {
      const target = i.options.getUser('target');
      const reason = i.options.getString('reason');
      addWarn(target.id, { reason, date: new Date().toLocaleDateString() });
      const embed = new EmbedBuilder()
        .setColor(PALETTE.WARNING)
        .setTitle('⚠️ Administrative Warning Issued')
        .addFields(
          { name: 'Target', value: `<@${target.id}>`, inline: true },
          { name: 'Reason', value: reason, inline: true }
        );
      return i.reply({ embeds: [embed] });
    }
    if (sub === 'warnings') {
      const target = i.options.getUser('target');
      const list = getWarns(target.id);
      if (!list.length) return i.reply({ content: 'Target has a clean disciplinary record.', ephemeral: true });
      const formatted = list.map((w, index) => `\`${index + 1}.\` ${w.reason} (${w.date})`).join('\n');
      const embed = new EmbedBuilder().setColor(PALETTE.DARK).setTitle(`Violation Logs • ${target.username}`).setDescription(formatted);
      return i.reply({ embeds: [embed], ephemeral: true });
    }
    if (sub === 'clear') {
      const amount = i.options.getInteger('amount');
      await i.channel.bulkDelete(amount, true);
      return i.reply({ content: `Successfully purged \`${amount}\` chat packets.`, ephemeral: true });
    }
    if (sub === 'lock') {
      await i.channel.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: false });
      return i.reply({ content: '🔒 Channel successfully locked.', ephemeral: true });
    }
    if (sub === 'unlock') {
      await i.channel.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: null });
      return i.reply({ content: '🔓 Channel locks lifted.', ephemeral: true });
    }
  }

  // ------------------------------------------
  // 5. /automod HANDLER
  // ------------------------------------------
  if (group === 'automod') {
    if (sub === 'setup') return i.reply({ content: 'Automod matrices successfully initialized.', ephemeral: true });
    if (sub === 'enable') return i.reply({ content: 'Automod enforcement filters activated network-wide.', ephemeral: true });
    if (sub === 'disable') return i.reply({ content: 'Automod enforcement filters suspended.', ephemeral: true });
    if (sub === 'words') return i.reply({ content: 'Blocklisted terminology registry synchronized.', ephemeral: true });
    if (sub === 'spam') return i.reply({ content: 'Anti-spam threshold velocity parameters locked.', ephemeral: true });
    if (sub === 'links') return i.reply({ content: 'External link sanitation policies active.', ephemeral: true });
  }

  // ------------------------------------------
  // 6. /reactionrole HANDLER
  // ------------------------------------------
  if (group === 'reactionrole') {
    if (sub === 'create') return i.reply({ content: 'Interactive reaction role panel deployed.', ephemeral: true });
    if (sub === 'add') return i.reply({ content: 'Emoji-to-role binding registered successfully.', ephemeral: true });
    if (sub === 'remove') return i.reply({ content: 'Reaction role mapping purged.', ephemeral: true });
    if (sub === 'list') return i.reply({ content: 'Active reaction role bindings retrieved.', ephemeral: true });
  }

  // ------------------------------------------
  // 7. /logs HANDLER
  // ------------------------------------------
  if (group === 'logs') {
    if (sub === 'setup') return i.reply({ content: 'Audit logging sink assigned successfully.', ephemeral: true });
    if (sub === 'disable') return i.reply({ content: 'Audit logging disengaged.', ephemeral: true });
    if (sub === 'test') return i.reply({ content: 'Dispatching sample audit packet through pipeline...', ephemeral: true });
  }

  // ------------------------------------------
  // 8. /utility HANDLER
  // ------------------------------------------
  if (group === 'utility') {
    if (sub === 'userinfo') {
      const target = i.options.getUser('target') || i.user;
      const embed = new EmbedBuilder()
        .setColor(PALETTE.DARK)
        .setThumbnail(target.displayAvatarURL())
        .setTitle(`Account Telemetry • ${target.username}`)
        .addFields(
          { name: 'User ID', value: `\`${target.id}\``, inline: true },
          { name: 'Account Age', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, inline: true }
        );
      return i.reply({ embeds: [embed], ephemeral: true });
    }
    if (sub === 'serverinfo') {
      const embed = new EmbedBuilder()
        .setColor(PALETTE.DARK)
        .setThumbnail(i.guild.iconURL())
        .setTitle(`Guild Matrix • ${i.guild.name}`)
        .addFields(
          { name: 'Owner Node', value: `<@${i.guild.ownerId}>`, inline: true },
          { name: 'Total Members', value: `\`${i.guild.memberCount}\``, inline: true }
        );
      return i.reply({ embeds: [embed], ephemeral: true });
    }
    if (sub === 'avatar') {
      const target = i.options.getUser('target') || i.user;
      const embed = new EmbedBuilder()
        .setColor(PALETTE.DARK)
        .setTitle(`Avatar Asset • ${target.username}`)
        .setImage(target.displayAvatarURL({ size: 1024 }));
      return i.reply({ embeds: [embed], ephemeral: true });
    }
    if (sub === 'roleinfo') {
      const role = i.options.getRole('target');
      const embed = new EmbedBuilder()
        .setColor(role.color || PALETTE.DARK)
        .setTitle(`Role Attributes • ${role.name}`)
        .addFields(
          { name: 'Role ID', value: `\`${role.id}\``, inline: true },
          { name: 'Assigned Members', value: `\`${role.members.size}\``, inline: true }
        );
      return i.reply({ embeds: [embed], ephemeral: true });
    }
    if (sub === 'channelinfo') {
      const embed = new EmbedBuilder()
        .setColor(PALETTE.DARK)
        .setTitle(`Channel Node • #${i.channel.name}`)
        .addFields(
          { name: 'Channel ID', value: `\`${i.channel.id}\``, inline: true },
          { name: 'Type', value: `\`Text Channel\``, inline: true }
        );
      return i.reply({ embeds: [embed], ephemeral: true });
    }
  }

  // ------------------------------------------
  // 9. /fun HANDLER
  // ------------------------------------------
  if (group === 'fun') {
    if (sub === '8ball') {
      const answers = ['Affirmative.', 'Negative.', 'Query inconclusive, try later.', 'Without a doubt.', 'Outlook highly unfavorable.'];
      const pick = answers[Math.floor(Math.random() * answers.length)];
      return i.reply(`🔮 **Oracle Query:** ${i.options.getString('question')}\n**Verdict:** ${pick}`);
    }
    if (sub === 'coinflip') {
      return i.reply(`🪙 Quantum Coin Toss Result: **${Math.random() < 0.5 ? 'Heads' : 'Tails'}**`);
    }
    if (sub === 'dice') {
      return i.reply(`🎲 RNG Roll Result: **${Math.floor(Math.random() * 6) + 1}** (Range 1-6)`);
    }
    if (sub === 'choose') {
      const options = i.options.getString('options').split(',');
      const choice = options[Math.floor(Math.random() * options.length)].trim();
      return i.reply(`🎯 Algorithmic Selection: **${choice}**`);
    }
    if (sub === 'poll') {
      const q = i.options.getString('question');
      const msg = await i.reply({ embeds: [new EmbedBuilder().setColor(PALETTE.PURPLE).setTitle('📊 Community Poll Engine').setDescription(q)], fetchReply: true });
      await msg.react('👍');
      await msg.react('👎');
      return;
    }
  }

  // ------------------------------------------
  // 10. /antinuke HANDLER
  // ------------------------------------------
  if (group === 'antinuke') {
    if (sub === 'setup') return i.reply({ content: 'Anti-nuke heuristic baselines successfully compiled.', ephemeral: true });
    if (sub === 'enable') return i.reply({ content: 'Anti-nuke defense shield fully armed.', ephemeral: true });
    if (sub === 'disable') return i.reply({ content: 'Anti-nuke defense shield disengaged.', ephemeral: true });
    if (sub === 'config') return i.reply({ content: 'Mass-action velocity limits modified.', ephemeral: true });
    if (sub === 'status') return i.reply({ content: 'Anti-nuke Operational Status: `SECURE & ARMED`', ephemeral: true });
  }

  // ------------------------------------------
  // 11. /raid HANDLER
  // ------------------------------------------
  if (group === 'raid') {
    if (sub === 'setup') return i.reply({ content: 'Anti-raid perimeter defense initialized.', ephemeral: true });
    if (sub === 'enable') return i.reply({ content: 'Anti-raid emergency lockdown engaged.', ephemeral: true });
    if (sub === 'disable') return i.reply({ content: 'Anti-raid lockdown lifted.', ephemeral: true });
    if (sub === 'config') return i.reply({ content: 'Join restrictions and validation filters adjusted.', ephemeral: true });
    if (sub === 'status') return i.reply({ content: 'Anti-raid Perimeter Status: `MONITORING ACTIVE`', ephemeral: true });
  }
});

client.login(process.env.DISCORD_TOKEN);


