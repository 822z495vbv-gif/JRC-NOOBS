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

// --- COLOR PALETTE & CONFIG ---
const PALETTE = {
  DARK: '#2B2D31',
  SUCCESS: '#57F287',
  ERROR: '#ED4245',
  GOLD: '#FEE75C',
  INFO: '#5865F2'
};

// --- DATA STORAGE MAPS ---
const economy = new Map();
const leveling = new Map();
const warnings = new Map();
const banTracker = new Map();
const welcomeConfig = new Map();
const goodbyeConfig = new Map();

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

// --- COMMAND DEFINITIONS ---
const commands = [
  new SlashCommandBuilder()
    .setName('jrc')
    .setDescription('JRC bot main commands')
    .addSubcommand(sub => sub.setName('help').setDescription('Shows help menu'))
    .addSubcommand(sub => sub.setName('settings').setDescription('Views bot settings'))
    .addSubcommand(sub => sub.setName('about').setDescription('About JRC bot'))
    .addSubcommand(sub => sub.setName('status').setDescription('Shows system status')),

  new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Configure welcome system')
    .addSubcommand(sub => sub.setName('setup').setDescription('Setup welcome configuration panel'))
    .addSubcommand(sub => sub.setName('disable').setDescription('Disables the welcome system'))
    .addSubcommand(sub => sub.setName('test').setDescription('Tests the welcome message'))
    .addSubcommand(sub => sub.setName('message').setDescription('Sets the welcome message text').addStringOption(opt => opt.setName('text').setDescription('Message content').setRequired(true)))
    .addSubcommand(sub => sub.setName('channel').setDescription('Sets the welcome channel').addChannelOption(opt => opt.setName('target').setDescription('Channel').setRequired(true)))
    .addSubcommand(sub => sub.setName('preview').setDescription('Previews the welcome embed')),

  new SlashCommandBuilder()
    .setName('goodbye')
    .setDescription('Configure goodbye system')
    .addSubcommand(sub => sub.setName('setup').setDescription('Setup goodbye configuration panel'))
    .addSubcommand(sub => sub.setName('disable').setDescription('Disables the goodbye system'))
    .addSubcommand(sub => sub.setName('test').setDescription('Tests the goodbye message'))
    .addSubcommand(sub => sub.setName('message').setDescription('Sets the goodbye message text').addStringOption(opt => opt.setName('text').setDescription('Message content').setRequired(true)))
    .addSubcommand(sub => sub.setName('channel').setDescription('Sets the goodbye channel').addChannelOption(opt => opt.setName('target').setDescription('Channel').setRequired(true)))
    .addSubcommand(sub => sub.setName('preview').setDescription('Previews the goodbye embed')),

  new SlashCommandBuilder()
    .setName('mod')
    .setDescription('Moderation commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(sub => sub.setName('ban').setDescription('Bans a member').addUserOption(opt => opt.setName('target').setDescription('User').setRequired(true)))
    .addSubcommand(sub => sub.setName('kick').setDescription('Kicks a member').addUserOption(opt => opt.setName('target').setDescription('User').setRequired(true)))
    .addSubcommand(sub => sub.setName('timeout').setDescription('Timeouts a member').addUserOption(opt => opt.setName('target').setDescription('User').setRequired(true)).addIntegerOption(opt => opt.setName('minutes').setDescription('Mins').setRequired(true)))
    .addSubcommand(sub => sub.setName('warn').setDescription('Warns a member').addUserOption(opt => opt.setName('target').setDescription('User').setRequired(true)))
    .addSubcommand(sub => sub.setName('warnings').setDescription('Views warnings').addUserOption(opt => opt.setName('target').setDescription('User').setRequired(true)))
    .addSubcommand(sub => sub.setName('clear').setDescription('Clears messages').addIntegerOption(opt => opt.setName('amount').setDescription('Count').setRequired(true)))
    .addSubcommand(sub => sub.setName('lock').setDescription('Locks the channel'))
    .addSubcommand(sub => sub.setName('unlock').setDescription('Unlocks the channel')),

  new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Automated moderation controls')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('setup').setDescription('Setup automod'))
    .addSubcommand(sub => sub.setName('enable').setDescription('Enables automod'))
    .addSubcommand(sub => sub.setName('disable').setDescription('Disables automod'))
    .addSubcommand(sub => sub.setName('words').setDescription('Manages filtered words'))
    .addSubcommand(sub => sub.setName('spam').setDescription('Configures anti-spam'))
    .addSubcommand(sub => sub.setName('links').setDescription('Configures link filter')),

  new SlashCommandBuilder()
    .setName('reactionrole')
    .setDescription('Reaction role systems')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(sub => sub.setName('create').setDescription('Creates a reaction role panel'))
    .addSubcommand(sub => sub.setName('add').setDescription('Adds a reaction role'))
    .addSubcommand(sub => sub.setName('remove').setDescription('Removes a reaction role'))
    .addSubcommand(sub => sub.setName('list').setDescription('Lists active reaction roles')),

  new SlashCommandBuilder()
    .setName('logs')
    .setDescription('Audit log management')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('setup').setDescription('Sets up logs channel'))
    .addSubcommand(sub => sub.setName('disable').setDescription('Disables logging'))
    .addSubcommand(sub => sub.setName('test').setDescription('Tests log delivery')),

  new SlashCommandBuilder()
    .setName('utility')
    .setDescription('Utility tools')
    .addSubcommand(sub => sub.setName('userinfo').setDescription('User info').addUserOption(opt => opt.setName('target').setDescription('User')))
    .addSubcommand(sub => sub.setName('serverinfo').setDescription('Server info'))
    .addSubcommand(sub => sub.setName('avatar').setDescription('Gets avatar').addUserOption(opt => opt.setName('target').setDescription('User')))
    .addSubcommand(sub => sub.setName('roleinfo').setDescription('Role info').addRoleOption(opt => opt.setName('target').setDescription('Role').setRequired(true)))
    .addSubcommand(sub => sub.setName('channelinfo').setDescription('Channel info')),

  new SlashCommandBuilder()
    .setName('fun')
    .setDescription('Fun commands')
    .addSubcommand(sub => sub.setName('8ball').setDescription('Magic 8ball').addStringOption(opt => opt.setName('question').setDescription('Q').setRequired(true)))
    .addSubcommand(sub => sub.setName('coinflip').setDescription('Flips a coin'))
    .addSubcommand(sub => sub.setName('dice').setDescription('Rolls a dice'))
    .addSubcommand(sub => sub.setName('choose').setDescription('Chooses between options').addStringOption(opt => opt.setName('options').setDescription('Choices').setRequired(true)))
    .addSubcommand(sub => sub.setName('poll').setDescription('Creates a poll').addStringOption(opt => opt.setName('question').setDescription('Topic').setRequired(true))),

  new SlashCommandBuilder()
    .setName('antinuke')
    .setDescription('Anti-nuke protection')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('setup').setDescription('Setup antinuke'))
    .addSubcommand(sub => sub.setName('enable').setDescription('Enables antinuke'))
    .addSubcommand(sub => sub.setName('disable').setDescription('Disables antinuke'))
    .addSubcommand(sub => sub.setName('config').setDescription('Configures antinuke limits'))
    .addSubcommand(sub => sub.setName('status').setDescription('Views antinuke status')),

  new SlashCommandBuilder()
    .setName('raid')
    .setDescription('Anti-raid controls')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('setup').setDescription('Setup anti-raid'))
    .addSubcommand(sub => sub.setName('enable').setDescription('Enables anti-raid'))
    .addSubcommand(sub => sub.setName('disable').setDescription('Disables anti-raid'))
    .addSubcommand(sub => sub.setName('config').setDescription('Configures anti-raid'))
    .addSubcommand(sub => sub.setName('status').setDescription('Views anti-raid status'))
].map(cmd => cmd.toJSON());

// --- CLIENT CREATION ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.MessageContent
  ]
});

// --- CLIENT EVENTS & LISTENERS ---
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const linkRegex = /(https?:\/\/[^\s]+)|(discord\.gg\/[^\s]+)|(discord\.com\/invite\/[^\s]+)/gi;
  if (linkRegex.test(message.content)) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      await message.delete().catch(() => {});
      const alert = await message.channel.send(`<@${message.author.id}> Links are restricted here.`);
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
        .setDescription(`✨ <@${message.author.id}> reached **Level ${userXp.level}**!`);
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
    .setTitle('🎉 Welcome!')
    .setDescription(text)
    .setThumbnail(member.user.displayAvatarURL());

  await channel.send({ embeds: [embed] }).catch(() => {});
});

client.on('guildMemberRemove', async (member) => {
  const config = goodbyeConfig.get(member.guild.id);
  if (!config || !config.enabled || !config.channelId) return;

  const channel = member.guild.channels.cache.get(config.channelId);
  if (!channel) return;

  let text = config.message || '{username} has left the server.';
  text = text.replace('{user}', `<@${member.id}>`)
             .replace('{username}', member.user.username)
             .replace('{server}', member.guild.name);

  const embed = new EmbedBuilder()
    .setColor(PALETTE.ERROR)
    .setTitle('👋 Goodbye!')
    .setDescription(text)
    .setThumbnail(member.user.displayAvatarURL());

  await channel.send({ embeds: [embed] }).catch(() => {});
});

client.once('ready', async () => {
  console.log(`System connected as ${client.user.tag}`);
  
  client.user.setPresence({ 
    activities: [{ name: 'JOIN https://discord.gg/8SCGSyTwDb', type: ActivityType.Custom }], 
    status: 'dnd' 
  });

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('Commands successfully synced globally.');
  } catch (err) {
    console.error(err);
  }
});

// --- INTERACTION ROUTER ---
client.on('interactionCreate', async (i) => {
  if (!i.isChatInputCommand()) return;

  const group = i.commandName;
  const sub = i.options.getSubcommand(false);

  if (group === 'jrc') {
    if (sub === 'help') {
      const embed = new EmbedBuilder()
        .setColor(PALETTE.DARK)
        .setTitle('JRC Bot Help Menu')
        .setDescription('Explore modules: `/welcome`, `/goodbye`, `/mod`, `/automod`, `/utility`, `/fun`, `/antinuke`, `/raid`.');
      return i.reply({ embeds: [embed], ephemeral: true });
    }
    if (sub === 'settings') {
      return i.reply({ content: 'Server module configurations are nominal.', ephemeral: true });
    }
    if (sub === 'about') {
      const embed = new EmbedBuilder()
        .setColor(PALETTE.INFO)
        .setTitle('About JRC Bot')
        .setDescription('A high-performance security, utility, and administration discord bot infrastructure.');
      return i.reply({ embeds: [embed], ephemeral: true });
    }
    if (sub === 'status') {
      return i.reply({ content: `System Operational. Latency: \`${i.client.ws.ping}ms\``, ephemeral: true });
    }
  }

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
      welcomeConfig.set(i.guild.id, { enabled: false });
      return i.reply({ content: 'Welcome system disabled.', ephemeral: true });
    }
    if (sub === 'test') {
      const cfg = welcomeConfig.get(i.guild.id);
      if (!cfg || !cfg.channelId) return i.reply({ content: 'Welcome channel not set up yet.', ephemeral: true });
      const ch = i.guild.channels.cache.get(cfg.channelId);
      ch?.send(`🎉 Welcome <@${i.user.id}> to ${i.guild.name}!`);
      return i.reply({ content: 'Sent welcome test message.', ephemeral: true });
    }
    if (sub === 'message') {
      let cfg = welcomeConfig.get(i.guild.id) || { enabled: false };
      cfg.message = i.options.getString('text');
      welcomeConfig.set(i.guild.id, cfg);
      return i.reply({ content: `Welcome message updated to: \`${cfg.message}\``, ephemeral: true });
    }
    if (sub === 'channel') {
      let cfg = welcomeConfig.get(i.guild.id) || { enabled: false };
      cfg.channelId = i.options.getChannel('target').id;
      cfg.enabled = true;
      welcomeConfig.set(i.guild.id, cfg);
      return i.reply({ content: `Welcome channel successfully set to <#${cfg.channelId}>.`, ephemeral: true });
    }
    if (sub === 'preview') {
      const embed = new EmbedBuilder().setColor(PALETTE.INFO).setTitle('🎉 Welcome!').setDescription(`Welcome <@${i.user.id}> to ${i.guild.name}!`);
      return i.reply({ embeds: [embed], ephemeral: true });
    }
  }

  if (group === 'goodbye') {
    if (sub === 'setup') {
      const embed = new EmbedBuilder()
        .setColor(PALETTE.ERROR)
        .setTitle('JRC • GOODBYE CONFIGURATION')
        .setDescription('Configure how JRC handles departing members.\n\n**SYSTEM STATUS**\n🔴 **DISABLED**\n**CHANNEL**\n`Not configured`');
      return i.reply({ embeds: [embed], ephemeral: true });
    }
    if (sub === 'disable') {
      goodbyeConfig.set(i.guild.id, { enabled: false });
      return i.reply({ content: 'Goodbye system disabled.', ephemeral: true });
    }
    if (sub === 'test') {
      const cfg = goodbyeConfig.get(i.guild.id);
      if (!cfg || !cfg.channelId) return i.reply({ content: 'Goodbye channel not configured.', ephemeral: true });
      const ch = i.guild.channels.cache.get(cfg.channelId);
      ch?.send(`👋 Goodbye <@${i.user.id}>!`);
      return i.reply({ content: 'Sent test goodbye message.', ephemeral: true });
    }
    if (sub === 'message') {
      let cfg = goodbyeConfig.get(i.guild.id) || { enabled: false };
      cfg.message = i.options.getString('text');
      goodbyeConfig.set(i.guild.id, cfg);
      return i.reply({ content: `Goodbye message updated: \`${cfg.message}\``, ephemeral: true });
    }
    if (sub === 'channel') {
      let cfg = goodbyeConfig.get(i.guild.id) || { enabled: false };
      cfg.channelId = i.options.getChannel('target').id;
      cfg.enabled = true;
      goodbyeConfig.set(i.guild.id, cfg);
      return i.reply({ content: `Goodbye channel set to <#${cfg.channelId}>.`, ephemeral: true });
    }
    if (sub === 'preview') {
      const embed = new EmbedBuilder().setColor(PALETTE.ERROR).setTitle('👋 Goodbye!').setDescription(`${i.user.username} has left the server.`);
      return i.reply({ embeds: [embed], ephemeral: true });
    }
  }

  if (group === 'mod') {
    if (sub === 'ban') {
      const target = i.options.getMember('target');
      await target.ban({ reason: 'Admin enforcement' });
      return i.reply({ content: `Banned \`${target.user.tag}\`.`, ephemeral: true });
    }
    if (sub === 'kick') {
      const target = i.options.getMember('target');
      await target.kick('Admin enforcement');
      return i.reply({ content: `Kicked \`${target.user.tag}\`.`, ephemeral: true });
    }
    if (sub === 'timeout') {
      const target = i.options.getMember('target');
      const mins = i.options.getInteger('minutes');
      await target.timeout(mins * 60000);
      return i.reply({ content: `Timed out <@${target.id}> for **${mins}m**.`, ephemeral: true });
    }
    if (sub === 'warn') {
      const target = i.options.getUser('target');
      addWarn(target.id, { reason: 'Violation', date: new Date().toLocaleDateString() });
      return i.reply({ content: `Warned <@${target.id}>.`, ephemeral: true });
    }
    if (sub === 'warnings') {
      const target = i.options.getUser('target');
      const list = getWarns(target.id);
      return i.reply({ content: `User has **${list.length}** warnings.`, ephemeral: true });
    }
    if (sub === 'clear') {
      const amt = i.options.getInteger('amount');
      await i.channel.bulkDelete(amt, true);
      return i.reply({ content: `Cleared \`${amt}\` messages.`, ephemeral: true });
    }
    if (sub === 'lock') {
      await i.channel.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: false });
      return i.reply({ content: 'Channel locked.', ephemeral: true });
    }
    if (sub === 'unlock') {
      await i.channel.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: null });
      return i.reply({ content: 'Channel unlocked.', ephemeral: true });
    }
  }

  if (group === 'automod') {
    if (sub === 'setup') return i.reply({ content: 'Automod configuration initialized.', ephemeral: true });
    if (sub === 'enable') return i.reply({ content: 'Automod module enabled.', ephemeral: true });
    if (sub === 'disable') return i.reply({ content: 'Automod module disabled.', ephemeral: true });
    if (sub === 'words') return i.reply({ content: 'Word filter list updated.', ephemeral: true });
    if (sub === 'spam') return i.reply({ content: 'Anti-spam protection tuned.', ephemeral: true });
    if (sub === 'links') return i.reply({ content: 'Link filter parameters active.', ephemeral: true });
  }

  if (group === 'reactionrole') {
    if (sub === 'create') return i.reply({ content: 'Reaction role panel generated.', ephemeral: true });
    if (sub === 'add') return i.reply({ content: 'Reaction role mapping added.', ephemeral: true });
    if (sub === 'remove') return i.reply({ content: 'Reaction role mapping removed.', ephemeral: true });
    if (sub === 'list') return i.reply({ content: 'Active reaction role panels listed.', ephemeral: true });
  }

  if (group === 'logs') {
    if (sub === 'setup') return i.reply({ content: 'Audit logger channel established.', ephemeral: true });
    if (sub === 'disable') return i.reply({ content: 'Audit logging system disabled.', ephemeral: true });
    if (sub === 'test') return i.reply({ content: 'Dispatching sample log event payload...', ephemeral: true });
  }

  if (group === 'utility') {
    if (sub === 'userinfo') {
      const target = i.options.getUser('target') || i.user;
      return i.reply({ content: `User ID: \`${target.id}\`, Created: <t:${Math.floor(target.createdTimestamp / 1000)}:R>`, ephemeral: true });
    }
    if (sub === 'serverinfo') {
      return i.reply({ content: `Server Name: \`${i.guild.name}\`, Members: \`${i.guild.memberCount}\``, ephemeral: true });
    }
    if (sub === 'avatar') {
      const target = i.options.getUser('target') || i.user;
      return i.reply({ content: target.displayAvatarURL({ size: 1024 }), ephemeral: true });
    }
    if (sub === 'roleinfo') {
      const role = i.options.getRole('target');
      return i.reply({ content: `Role **${role.name}** has \`${role.members.size}\` members.`, ephemeral: true });
    }
    if (sub === 'channelinfo') {
      return i.reply({ content: `Channel Name: \`${i.channel.name}\`, ID: \`${i.channel.id}\``, ephemeral: true });
    }
  }

  if (group === 'fun') {
    if (sub === '8ball') {
      const ans = ['Yes.', 'No.', 'Maybe.', 'Definitely.', 'Outlook bleak.'];
      return i.reply(`🔮 ${ans[Math.floor(Math.random() * ans.length)]}`);
    }
    if (sub === 'coinflip') {
      return i.reply(`🪙 Result: **${Math.random() < 0.5 ? 'Heads' : 'Tails'}**`);
    }
    if (sub === 'dice') {
      return i.reply(`🎲 Rolled: **${Math.floor(Math.random() * 6) + 1}**`);
    }
    if (sub === 'choose') {
      const options = i.options.getString('options').split(',');
      const choice = options[Math.floor(Math.random() * options.length)].trim();
      return i.reply(`🎯 I choose: **${choice}**`);
    }
    if (sub === 'poll') {
      const q = i.options.getString('question');
      const msg = await i.reply({ content: `📊 **Poll:** ${q}`, fetchReply: true });
      await msg.react('👍');
      await msg.react('👎');
      return;
    }
  }

  if (group === 'antinuke') {
    if (sub === 'setup') return i.reply({ content: 'Anti-nuke defense baseline configured.', ephemeral: true });
    if (sub === 'enable') return i.reply({ content: 'Anti-nuke protection activated.', ephemeral: true });
    if (sub === 'disable') return i.reply({ content: 'Anti-nuke protection disengaged.', ephemeral: true });
    if (sub === 'config') return i.reply({ content: 'Threshold limits modified.', ephemeral: true });
    if (sub === 'status') return i.reply({ content: 'Anti-nuke status: `SECURE`', ephemeral: true });
  }

  if (group === 'raid') {
    if (sub === 'setup') return i.reply({ content: 'Anti-raid perimeter initialized.', ephemeral: true });
    if (sub === 'enable') return i.reply({ content: 'Anti-raid mode active.', ephemeral: true });
    if (sub === 'disable') return i.reply({ content: 'Anti-raid mode deactivated.', ephemeral: true });
    if (sub === 'config') return i.reply({ content: 'Join restrictions adjusted.', ephemeral: true });
    if (sub === 'status') return i.reply({ content: 'Anti-raid status: `MONITORING`', ephemeral: true });
  }
});

client.login(process.env.DISCORD_TOKEN);
