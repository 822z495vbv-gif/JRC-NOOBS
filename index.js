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
  ActivityType
} = require('discord.js');
require('dotenv').config();

// ==========================================
// --- HIGH-PERFORMANCE GLOBAL PALETTE ---
// ==========================================
const PALETTE = {
  DARK: '#1E1F22',
  SUCCESS: '#23A55A',
  ERROR: '#F23F43',
  GOLD: '#FEE75C',
  INFO: '#5865F2',
  PURPLE: '#8559DA'
};

// ==========================================
// --- O(1) IN-MEMORY STORAGE CACHE ---
// ==========================================
const economy = new Map();
const leveling = new Map();
const warnings = new Map();
const welcomeConfig = new Map();
const goodbyeConfig = new Map();

// Optimized data access wrappers
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
// --- ENTERPRISE COMMAND METADATA MATRIX ---
// ==========================================
const commands = [
  new SlashCommandBuilder()
    .setName('jrc')
    .setDescription('JRC elite infrastructure telemetry and controls')
    .addSubcommand(sub => sub.setName('help').setDescription('Displays premium command modules'))
    .addSubcommand(sub => sub.setName('settings').setDescription('Views active system configurations'))
    .addSubcommand(sub => sub.setName('about').setDescription('Architectural overview'))
    .addSubcommand(sub => sub.setName('status').setDescription('Performs low-latency system diagnostics')),

  new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Configure Mimu-grade interactive welcome pipelines')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub.setName('setup').setDescription('Launches interactive control panel'))
    .addSubcommand(sub => sub.setName('disable').setDescription('Deactivates welcome broadcasting'))
    .addSubcommand(sub => sub.setName('test').setDescription('Dispatches test card packet'))
    .addSubcommand(sub => sub.setName('title').setDescription('Sets Mimu-style embed headline').addStringOption(opt => opt.setName('text').setDescription('Embed title').setRequired(true)))
    .addSubcommand(sub => sub.setName('message').setDescription('Sets main body description').addStringOption(opt => opt.setName('text').setDescription('Message payload').setRequired(true)))
    .addSubcommand(sub => sub.setName('channel').setDescription('Binds destination channel').addChannelOption(opt => opt.setName('target').setDescription('Target channel').setRequired(true)))
    .addSubcommand(sub => sub.setName('preview').setDescription('Renders live preview asset')),

  new SlashCommandBuilder()
    .setName('goodbye')
    .setDescription('Configure member departure notifications')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub.setName('setup').setDescription('Launch goodbye dashboard'))
    .addSubcommand(sub => sub.setName('disable').setDescription('Deactivate departure engine'))
    .addSubcommand(sub => sub.setName('test').setDescription('Dispatch test signal'))
    .addSubcommand(sub => sub.setName('message').setDescription('Customize departure broadcast text').addStringOption(opt => opt.setName('text').setDescription('Content').setRequired(true)))
    .addSubcommand(sub => sub.setName('channel').setDescription('Bind target channel').addChannelOption(opt => opt.setName('target').setDescription('Channel').setRequired(true)))
    .addSubcommand(sub => sub.setName('preview').setDescription('Render goodbye preview')),

  new SlashCommandBuilder()
    .setName('mod')
    .setDescription('High-speed moderation tools')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(sub => sub.setName('ban').setDescription('Issue guild ban').addUserOption(opt => opt.setName('target').setDescription('User').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('Reason')))
    .addSubcommand(sub => sub.setName('kick').setDescription('Expel member').addUserOption(opt => opt.setName('target').setDescription('User').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('Reason')))
    .addSubcommand(sub => sub.setName('timeout').setDescription('Apply user timeout').addUserOption(opt => opt.setName('target').setDescription('User').setRequired(true)).addIntegerOption(opt => opt.setName('minutes').setDescription('Mins').setRequired(true)))
    .addSubcommand(sub => sub.setName('warn').setDescription('Issue formal warning').addUserOption(opt => opt.setName('target').setDescription('User').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(true)))
    .addSubcommand(sub => sub.setName('warnings').setDescription('Inspect discipline history').addUserOption(opt => opt.setName('target').setDescription('User').setRequired(true)))
    .addSubcommand(sub => sub.setName('clear').setDescription('Purge channel traffic').addIntegerOption(opt => opt.setName('amount').setDescription('Count').setRequired(true)))
    .addSubcommand(sub => sub.setName('lock').setDescription('Lock down text channel'))
    .addSubcommand(sub => sub.setName('unlock').setDescription('Restore text channel')),

  new SlashCommandBuilder()
    .setName('utility')
    .setDescription('Server utility commands')
    .addSubcommand(sub => sub.setName('userinfo').setDescription('User metadata telemetry').addUserOption(opt => opt.setName('target').setDescription('User')))
    .addSubcommand(sub => sub.setName('serverinfo').setDescription('Guild diagnostics'))
    .addSubcommand(sub => sub.setName('avatar').setDescription('Fetch high-res avatar asset').addUserOption(opt => opt.setName('target').setDescription('User'))),

  new SlashCommandBuilder()
    .setName('fun')
    .setDescription('Interactive entertainment routines')
    .addSubcommand(sub => sub.setName('8ball').setDescription('Consult oracle').addStringOption(opt => opt.setName('question').setDescription('Query').setRequired(true)))
    .addSubcommand(sub => sub.setName('coinflip').setDescription('Flip fair currency'))
    .addSubcommand(sub => sub.setName('dice').setDescription('Roll RNG die'))
    .addSubcommand(sub => sub.setName('choose').setDescription('Algorithmic choice matrix').addStringOption(opt => opt.setName('options').setDescription('Choices separated by comma').setRequired(true)))
].map(cmd => cmd.toJSON());

// ==========================================
// --- ZERO-LAG CLIENT INSTANTIATION ---
// ==========================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.MessageContent
  ],
  allowedMentions: { parse: ['users'], repliedUser: false }
});

// ==========================================
// --- OPTIMIZED EVENT PIPELINES ---
// ==========================================
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  // Real-time link sanitization guard
  const linkRegex = /(https?:\/\/[^\s]+)|(discord\.gg\/[^\s]+)|(discord\.com\/invite\/[^\s]+)/gi;
  if (linkRegex.test(message.content)) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      await message.delete().catch(() => {});
      const alert = await message.channel.send(`<@${message.author.id}> 🛡️ External links are isolated by security policy.`);
      setTimeout(() => alert.delete().catch(() => {}), 3500);
      return;
    }
  }

  // Optimized rate-limited XP tracking engine
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
        .setDescription(`✨ **Rank Matrix Elevation:** <@${message.author.id}> achieved **Level ${userXp.level}**!`);
      message.channel.send({ embeds: [embed] }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
    }
    setXp(message.author.id, userXp);
  }
});

// Asynchronous non-blocking welcome broadcast driver
client.on('guildMemberAdd', async (member) => {
  const config = welcomeConfig.get(member.guild.id);
  if (!config || !config.enabled || !config.channelId) return;

  const channel = member.guild.channels.cache.get(config.channelId);
  if (!channel) return;

  const title = config.title || '🎉 Welcome to the Network!';
  const description = (config.message || 'Hey {user}, welcome to {server}! We are thrilled to have you onboard.')
    .replace('{user}', `<@${member.id}>`)
    .replace('{username}', member.user.username)
    .replace('{server}', member.guild.name);

  const embed = new EmbedBuilder()
    .setColor(PALETTE.INFO)
    .setTitle(title)
    .setDescription(description)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
    .setFooter({ text: `Member Node #${member.guild.memberCount}` })
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(() => {});
});

client.on('guildMemberRemove', async (member) => {
  const config = goodbyeConfig.get(member.guild.id);
  if (!config || !config.enabled || !config.channelId) return;

  const channel = member.guild.channels.cache.get(config.channelId);
  if (!channel) return;

  const text = (config.message || 'Node disconnected: {username} has left the environment.')
    .replace('{user}', `<@${member.id}>`)
    .replace('{username}', member.user.username)
    .replace('{server}', member.guild.name);

  const embed = new EmbedBuilder()
    .setColor(PALETTE.ERROR)
    .setTitle('👋 Departure Broadcast')
    .setDescription(text)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(() => {});
});

client.once('ready', async () => {
  console.log(`[SECURE CORE] Authenticated successfully as ${client.user.tag}`);
  
  client.user.setPresence({ 
    activities: [{ name: 'JRC Infrastructure Suite', type: ActivityType.Custom }], 
    status: 'online' 
  });

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID || client.user.id),
      { body: commands }
    );
    console.log('[API CORE] Command registration tree synchronized instantly.');
  } catch (err) {
    console.error('[API CORE] Synchronization failed:', err);
  }
});

// ==========================================
// --- INTERACTION DISPATCH CONTROLLER ---
// ==========================================
client.on('interactionCreate', async (i) => {
  if (i.isButton()) {
    if (i.customId === 'wel_config') {
      return i.reply({ content: '⚙️ Configuration matrix accessed. Use `/welcome title` or `/welcome message` to customize parameters.', ephemeral: true });
    }
    if (i.customId === 'wel_channel') {
      return i.reply({ content: '📢 Route target channel via `/welcome channel target:#channel`.', ephemeral: true });
    }
    if (i.customId === 'wel_preview') {
      const cfg = welcomeConfig.get(i.guild.id);
      const title = cfg?.title || '🎉 Welcome to the Network!';
      const desc = (cfg?.message || 'Hey {user}, welcome to {server}! We are thrilled to have you onboard.')
        .replace('{user}', `<@${i.user.id}>`)
        .replace('{username}', i.user.username)
        .replace('{server}', i.guild.name);

      const embed = new EmbedBuilder()
        .setColor(PALETTE.INFO)
        .setTitle(title)
        .setDescription(desc)
        .setThumbnail(i.user.displayAvatarURL({ dynamic: true, size: 512 }))
        .setFooter({ text: `Member Node #${i.guild.memberCount}` })
        .setTimestamp();
      return i.reply({ embeds: [embed], ephemeral: true });
    }
    if (i.customId === 'wel_enable') {
      let cfg = welcomeConfig.get(i.guild.id) || { enabled: false };
      cfg.enabled = true;
      welcomeConfig.set(i.guild.id, cfg);
      return i.reply({ content: '🟢 Welcome engine state shifted to: **ACTIVE**', ephemeral: true });
    }
    if (i.customId === 'wel_disable') {
      let cfg = welcomeConfig.get(i.guild.id) || { enabled: true };
      cfg.enabled = false;
      welcomeConfig.set(i.guild.id, cfg);
      return i.reply({ content: '🔴 Welcome engine state shifted to: **SUSPENDED**', ephemeral: true });
    }
    return;
  }

  if (!i.isChatInputCommand()) return;

  const group = i.commandName;
  const sub = i.options.getSubcommand(false);

  // 1. /jrc HANDLER
  if (group === 'jrc') {
    if (sub === 'help') {
      const embed = new EmbedBuilder()
        .setColor(PALETTE.DARK)
        .setTitle('JRC Enterprise Core')
        .setDescription('High-performance modular architecture active.\n\n• `/welcome` - Mimu layout pipeline\n• `/goodbye` - Departure subsystem\n• `/mod` - Administrative control\n• `/utility` - Network telemetry\n• `/fun` - Entertainment matrix')
        .setFooter({ text: 'Zero-Lag Execution Framework' });
      return i.reply({ embeds: [embed], ephemeral: true });
    }
    if (sub === 'settings') {
      const embed = new EmbedBuilder()
        .setColor(PALETTE.DARK)
        .setTitle('System Module Status')
        .addFields(
          { name: 'Welcome Pipeline', value: welcomeConfig.get(i.guild.id)?.enabled ? '`ONLINE`' : '`OFFLINE`', inline: true },
          { name: 'Goodbye Pipeline', value: goodbyeConfig.get(i.guild.id)?.enabled ? '`ONLINE`' : '`OFFLINE`', inline: true }
        );
      return i.reply({ embeds: [embed], ephemeral: true });
    }
    if (sub === 'about') {
      const embed = new EmbedBuilder()
        .setColor(PALETTE.INFO)
        .setTitle('About JRC Suite')
        .setDescription('Engineered for absolute speed, zero runtime overhead, and high-tier aesthetic precision.');
      return i.reply({ embeds: [embed], ephemeral: true });
    }
    if (sub === 'status') {
      const embed = new EmbedBuilder()
        .setColor(PALETTE.SUCCESS)
        .setTitle('Diagnostic Telemetry')
        .addFields(
          { name: 'WebSocket Ping', value: `\`${i.client.ws.ping}ms\``, inline: true },
          { name: 'Memory Footprint', value: `\`${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\``, inline: true }
        );
      return i.reply({ embeds: [embed], ephemeral: true });
    }
  }

  // 2. /welcome HANDLER
  if (group === 'welcome') {
    if (sub === 'setup') {
      const cfg = welcomeConfig.get(i.guild.id);
      const isEnabled = cfg?.enabled ? '🟢 **ONLINE**' : '🔴 **OFFLINE**';
      const channelText = cfg?.channelId ? `<#${cfg.channelId}>` : '`Unassigned`';
      const customTitle = cfg?.title || '🎉 Welcome to the Network!';
      const customMsg = cfg?.message || 'Hey {user}, welcome to {server}! We are thrilled to have you onboard.';

      const embed = new EmbedBuilder()
        .setColor(PALETTE.INFO)
        .setTitle('JRC • MIMU CONFIGURATION DASHBOARD')
        .setDescription(`Manage high-performance greeting outputs instantly.\n\n**STATUS:** ${isEnabled}\n**CHANNEL:** ${channelText}\n**TITLE:** ${customTitle}\n**MESSAGE:** ${customMsg}\n\n*Use variables: \`{user}\`, \`{username}\`, \`{server}\`*`);

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
      let cfg = welcomeConfig.get(i.guild.id) || { enabled: false };
      cfg.enabled = false;
      welcomeConfig.set(i.guild.id, cfg);
      return i.reply({ content: 'Welcome subsystem suspended.', ephemeral: true });
    }
    if (sub === 'test') {
      const cfg = welcomeConfig.get(i.guild.id);
      if (!cfg || !cfg.channelId) return i.reply({ content: 'Error: Target delivery channel is unassigned.', ephemeral: true });
      const ch = i.guild.channels.cache.get(cfg.channelId);

      const title = cfg.title || '🎉 Welcome to the Network!';
      const desc = (cfg.message || 'Hey {user}, welcome to {server}! We are thrilled to have you onboard.')
        .replace('{user}', `<@${i.user.id}>`)
        .replace('{username}', i.user.username)
        .replace('{server}', i.guild.name);

      const testEmbed = new EmbedBuilder()
        .setColor(PALETTE.INFO)
        .setTitle(title)
        .setDescription(desc)
        .setThumbnail(i.user.displayAvatarURL({ dynamic: true, size: 512 }))
        .setFooter({ text: `Member Node #${i.guild.memberCount}` })
        .setTimestamp();

      ch?.send({ embeds: [testEmbed] });
      return i.reply({ content: 'Test Mimu payload dispatched successfully.', ephemeral: true });
    }
    if (sub === 'title') {
      let cfg = welcomeConfig.get(i.guild.id) || { enabled: false };
      cfg.title = i.options.getString('text');
      welcomeConfig.set(i.guild.id, cfg);
      return i.reply({ content: `Embed title locked to: \`${cfg.title}\``, ephemeral: true });
    }
    if (sub === 'message') {
      let cfg = welcomeConfig.get(i.guild.id) || { enabled: false };
      cfg.message = i.options.getString('text');
      welcomeConfig.set(i.guild.id, cfg);
      return i.reply({ content: `Embed description locked to: \`${cfg.message}\``, ephemeral: true });
    }
    if (sub === 'channel') {
      let cfg = welcomeConfig.get(i.guild.id) || { enabled: false };
      cfg.channelId = i.options.getChannel('target').id;
      cfg.enabled = true;
      welcomeConfig.set(i.guild.id, cfg);
      return i.reply({ content: `Welcome transmission channel bound to <#${cfg.channelId}>.`, ephemeral: true });
    }
    if (sub === 'preview') {
      const cfg = welcomeConfig.get(i.guild.id);
      const title = cfg?.title || '🎉 Welcome to the Network!';
      const desc = (cfg?.message || 'Hey {user}, welcome to {server}! We are thrilled to have you onboard.')
        .replace('{user}', `<@${i.user.id}>`)
        .replace('{username}', i.user.username)
        .replace('{server}', i.guild.name);

      const embed = new EmbedBuilder()
        .setColor(PALETTE.INFO)
        .setTitle(title)
        .setDescription(desc)
        .setThumbnail(i.user.displayAvatarURL({ dynamic: true, size: 512 }))
        .setFooter({ text: `Member Node #${i.guild.memberCount}` })
        .setTimestamp();
      return i.reply({ embeds: [embed], ephemeral: true });
    }
  }

  // 3. /goodbye HANDLER
  if (group === 'goodbye') {
    if (sub === 'setup') {
      return i.reply({ content: 'Configure departure output via `/goodbye channel` and `/goodbye message`.', ephemeral: true });
    }
    if (sub === 'disable') {
      let cfg = goodbyeConfig.get(i.guild.id) || { enabled: false };
      cfg.enabled = false;
      goodbyeConfig.set(i.guild.id, cfg);
      return i.reply({ content: 'Goodbye subsystem suspended.', ephemeral: true });
    }
    if (sub === 'test') {
      const cfg = goodbyeConfig.get(i.guild.id);
      if (!cfg || !cfg.channelId) return i.reply({ content: 'Error: Target channel unassigned.', ephemeral: true });
      const ch = i.guild.channels.cache.get(cfg.channelId);
      ch?.send(`👋 Test Departure: <@${i.user.id}> disconnected.`);
      return i.reply({ content: 'Test goodbye payload transmitted.', ephemeral: true });
    }
    if (sub === 'message') {
      let cfg = goodbyeConfig.get(i.guild.id) || { enabled: false };
      cfg.message = i.options.getString('text');
      goodbyeConfig.set(i.guild.id, cfg);
      return i.reply({ content: `Departure message updated: \`${cfg.message}\``, ephemeral: true });
    }
    if (sub === 'channel') {
      let cfg = goodbyeConfig.get(i.guild.id) || { enabled: false };
      cfg.channelId = i.options.getChannel('target').id;
      cfg.enabled = true;
      goodbyeConfig.set(i.guild.id, cfg);
      return i.reply({ content: `Departure channel bound to <#${cfg.channelId}>.`, ephemeral: true });
    }
    if (sub === 'preview') {
      const embed = new EmbedBuilder()
        .setColor(PALETTE.ERROR)
        .setTitle('👋 Departure Broadcast')
        .setDescription(`Node disconnected: ${i.user.username} has left the environment.`)
        .setThumbnail(i.user.displayAvatarURL())
        .setTimestamp();
      return i.reply({ embeds: [embed], ephemeral: true });
    }
  }

  // 4. /mod HANDLER
  if (group === 'mod') {
    if (sub === 'ban') {
      const target = i.options.getMember('target');
      const reason = i.options.getString('reason') || 'Administrative action';
      await target.ban({ reason });
      return i.reply({ content: `Target banned: \`${target.user.tag}\`.`, ephemeral: true });
    }
    if (sub === 'kick') {
      const target = i.options.getMember('target');
      const reason = i.options.getString('reason') || 'Administrative action';
      await target.kick(reason);
      return i.reply({ content: `Target expelled: \`${target.user.tag}\`.`, ephemeral: true });
    }
    if (sub === 'timeout') {
      const target = i.options.getMember('target');
      const mins = i.options.getInteger('minutes');
      await target.timeout(mins * 60000);
      return i.reply({ content: `Timeout enforced on <@${target.id}> for **${mins}m**.`, ephemeral: true });
    }
    if (sub === 'warn') {
      const target = i.options.getUser('target');
      const reason = i.options.getString('reason');
      addWarn(target.id, { reason, date: new Date().toLocaleDateString() });
      const embed = new EmbedBuilder()
        .setColor(PALETTE.GOLD)
        .setTitle('⚠️ Disciplinary Strike Logged')
        .addFields({ name: 'Target', value: `<@${target.id}>`, inline: true }, { name: 'Reason', value: reason, inline: true });
      return i.reply({ embeds: [embed] });
    }
    if (sub === 'warnings') {
      const target = i.options.getUser('target');
      const list = getWarns(target.id);
      if (!list.length) return i.reply({ content: 'Clean disciplinary history.', ephemeral: true });
      const formatted = list.map((w, idx) => `\`${idx + 1}.\` ${w.reason} (${w.date})`).join('\n');
      const embed = new EmbedBuilder().setColor(PALETTE.DARK).setTitle(`Strike Records • ${target.username}`).setDescription(formatted);
      return i.reply({ embeds: [embed], ephemeral: true });
    }
    if (sub === 'clear') {
      const amount = i.options.getInteger('amount');
      await i.channel.bulkDelete(amount, true);
      return i.reply({ content: `Purged \`${amount}\` traffic packets.`, ephemeral: true });
    }
    if (sub === 'lock') {
      await i.channel.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: false });
      return i.reply({ content: '🔒 Channel locked down securely.', ephemeral: true });
    }
    if (sub === 'unlock') {
      await i.channel.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: null });
      return i.reply({ content: '🔓 Channel locks cleared.', ephemeral: true });
    }
  }

  // 5. /utility HANDLER
  if (group === 'utility') {
    if (sub === 'userinfo') {
      const target = i.options.getUser('target') || i.user;
      const embed = new EmbedBuilder()
        .setColor(PALETTE.DARK)
        .setThumbnail(target.displayAvatarURL())
        .setTitle(`Identity Telemetry • ${target.username}`)
        .addFields({ name: 'ID', value: `\`${target.id}\``, inline: true }, { name: 'Created', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, inline: true });
      return i.reply({ embeds: [embed], ephemeral: true });
    }
    if (sub === 'serverinfo') {
      const embed = new EmbedBuilder()
        .setColor(PALETTE.DARK)
        .setThumbnail(i.guild.iconURL())
        .setTitle(`Environment Matrix • ${i.guild.name}`)
        .addFields({ name: 'Owner Node', value: `<@${i.guild.ownerId}>`, inline: true }, { name: 'Active Members', value: `\`${i.guild.memberCount}\``, inline: true });
      return i.reply({ embeds: [embed], ephemeral: true });
    }
    if (sub === 'avatar') {
      const target = i.options.getUser('target') || i.user;
      const embed = new EmbedBuilder().setColor(PALETTE.DARK).setTitle(`Asset • ${target.username}`).setImage(target.displayAvatarURL({ size: 1024 }));
      return i.reply({ embeds: [embed], ephemeral: true });
    }
  }

  // 6. /fun HANDLER
  if (group === 'fun') {
    if (sub === '8ball') {
      const pool = ['Affirmative.', 'Negative.', 'Data inconclusive.', 'Without a doubt.', 'Outlook unfavorable.'];
      return i.reply(`🔮 **Oracle:** ${pool[Math.floor(Math.random() * pool.length)]}`);
    }
    if (sub === 'coinflip') {
      return i.reply(`🪙 **Result:** ${Math.random() < 0.5 ? 'Heads' : 'Tails'}`);
    }
    if (sub === 'dice') {
      return i.reply(`🎲 **Roll:** ${Math.floor(Math.random() * 6) + 1}`);
    }
    if (sub === 'choose') {
      const opts = i.options.getString('options').split(',');
      return i.reply(`🎯 **Selection:** ${opts[Math.floor(Math.random() * opts.length)].trim()}`);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
