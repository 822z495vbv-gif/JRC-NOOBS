const { 
  Client, 
  GatewayIntentBits, 
  REST, 
  Routes, 
  SlashCommandBuilder, 
  EmbedBuilder, 
  PermissionFlagsBits,
  ActivityType,
  AuditLogEvent
} = require('discord.js');

// 1. Define Slash Commands
const commands = [
  // --- UTILITY & INFO ---
  new SlashCommandBuilder().setName('ping').setDescription('Checks bot latency'),
  new SlashCommandBuilder().setName('userinfo').setDescription('Get details about a user').addUserOption(opt => opt.setName('target').setDescription('User to inspect')),
  new SlashCommandBuilder().setName('serverinfo').setDescription('Get details about this server'),
  new SlashCommandBuilder().setName('avatar').setDescription('View full size avatar of a user').addUserOption(opt => opt.setName('target').setDescription('User to view')),
  new SlashCommandBuilder().setName('embed').setDescription('Create a stylized announcement embed').addStringOption(opt => opt.setName('title').setDescription('Title').setRequired(true)).addStringOption(opt => opt.setName('description').setDescription('Main text').setRequired(true)),
  new SlashCommandBuilder().setName('poll').setDescription('Start a community reaction poll').addStringOption(opt => opt.setName('question').setDescription('Poll question').setRequired(true)),
  new SlashCommandBuilder().setName('roll').setDescription('Roll a random number from 1 to 100'),

  // --- MODERATION ---
  new SlashCommandBuilder().setName('clear').setDescription('Bulk delete messages').setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages).addIntegerOption(opt => opt.setName('amount').setDescription('Number of messages (1-100)').setRequired(true)),
  new SlashCommandBuilder().setName('warn').setDescription('Warn a user for rule breaking').setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers).addUserOption(opt => opt.setName('target').setDescription('Member to warn').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(true)),
  new SlashCommandBuilder().setName('slowmode').setDescription('Set channel slowmode delay').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels).addIntegerOption(opt => opt.setName('seconds').setDescription('Delay in seconds (0 = off)').setRequired(true)),
  new SlashCommandBuilder().setName('lock').setDescription('Lock current channel').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  new SlashCommandBuilder().setName('unlock').setDescription('Unlock current channel').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  new SlashCommandBuilder().setName('kick').setDescription('Kick a member from the server').setDefaultMemberPermissions(PermissionFlagsBits.KickMembers).addUserOption(opt => opt.setName('target').setDescription('Member to kick').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('Reason')),
  new SlashCommandBuilder().setName('ban').setDescription('Ban a member from the server').setDefaultMemberPermissions(PermissionFlagsBits.BanMembers).addUserOption(opt => opt.setName('target').setDescription('Member to ban').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('Reason'))
].map(cmd => cmd.toJSON());

// 2. Initialize Client with Audit Log Intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration
  ]
});

// 3. Anti-Nuke Tracker Cache
const actionTracker = new Map();

const trackAction = async (guild, executorId, actionType, threshold = 3, timeWindow = 10000) => {
  if (executorId === guild.ownerId || executorId === client.user.id) return; // Ignore Server Owner & Bot

  const key = `${guild.id}-${executorId}-${actionType}`;
  const now = Date.now();
  const userActions = actionTracker.get(key) || [];

  const recentActions = userActions.filter(timestamp => now - timestamp < timeWindow);
  recentActions.push(now);
  actionTracker.set(key, recentActions);

  if (recentActions.length >= threshold) {
    actionTracker.delete(key);
    
    // Quarantine offender: strip dangerous roles
    try {
      const member = await guild.members.fetch(executorId);
      if (member && member.manageable) {
        const dangerousRoles = member.roles.cache.filter(role => 
          role.permissions.has(PermissionFlagsBits.Administrator) ||
          role.permissions.has(PermissionFlagsBits.BanMembers) ||
          role.permissions.has(PermissionFlagsBits.KickMembers) ||
          role.permissions.has(PermissionFlagsBits.ManageChannels) ||
          role.permissions.has(PermissionFlagsBits.ManageRoles)
        );

        await member.roles.remove(dangerousRoles, 'Anti-Nuke Triggered: Rapid admin action threshold exceeded.');
        
        console.log(`🚨 ANTI-NUKE TRIGGERED: Stripped permissions from ${member.user.tag} in ${guild.name}`);
      }
    } catch (err) {
      console.error('Failed to strip roles during Anti-Nuke event:', err);
    }
  }
};

// 4. Anti-Nuke Event Watchers
client.on('guildBanAdd', async (ban) => {
  try {
    const logs = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd });
    const entry = logs.entries.first();
    if (entry && entry.executor) {
      await trackAction(ban.guild, entry.executor.id, 'ban', 3, 10000);
    }
  } catch (e) { console.error(e); }
});

client.on('guildMemberRemove', async (member) => {
  try {
    const logs = await member.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberKick });
    const entry = logs.entries.first();
    if (entry && entry.executor && entry.target?.id === member.id) {
      await trackAction(member.guild, entry.executor.id, 'kick', 3, 10000);
    }
  } catch (e) { console.error(e); }
});

client.on('channelDelete', async (channel) => {
  try {
    const logs = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelDelete });
    const entry = logs.entries.first();
    if (entry && entry.executor) {
      await trackAction(channel.guild, entry.executor.id, 'channel_delete', 2, 10000);
    }
  } catch (e) { console.error(e); }
});

client.on('roleDelete', async (role) => {
  try {
    const logs = await role.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleDelete });
    const entry = logs.entries.first();
    if (entry && entry.executor) {
      await trackAction(role.guild, entry.executor.id, 'role_delete', 2, 10000);
    }
  } catch (e) { console.error(e); }
});

// 5. Ready Event & Command Registration
client.once('ready', async () => {
  console.log(`LoggedIn as ${client.user.tag}`);

  client.user.setPresence({
    activities: [{ name: '🛡️ Anti-Nuke Active | /ping', type: ActivityType.Playing }],
    status: 'online',
  });

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('Syncing Slash Commands with Discord API...');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('Successfully loaded all global commands!');
  } catch (error) {
    console.error('Command registration error:', error);
  }
});

// 6. Command Handler
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, guild, channel, user } = interaction;

  try {
    if (commandName === 'ping') {
      await interaction.reply({ content: `🏓 **Pong!** API Latency: \`${client.ws.ping}ms\``, ephemeral: true });
    }
    else if (commandName === 'userinfo') {
      const targetUser = options.getUser('target') || user;
      const member = await guild.members.fetch(targetUser.id).catch(() => null);

      const embed = new EmbedBuilder()
        .setColor('#2B2D31')
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setTitle(`User Overview • ${targetUser.username}`)
        .addFields(
          { name: '🆔 User ID', value: `\`${targetUser.id}\``, inline: true },
          { name: '📅 Created', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`, inline: true },
          { name: '📥 Joined', value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true }
        )
        .setFooter({ text: 'XGFX System' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
    else if (commandName === 'serverinfo') {
      const embed = new EmbedBuilder()
        .setColor('#2B2D31')
        .setTitle(`${guild.name}`)
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .addFields(
          { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
          { name: '👥 Members', value: `\`${guild.memberCount}\``, inline: true },
          { name: '✨ Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true }
        )
        .setFooter({ text: 'XGFX System' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
    else if (commandName === 'avatar') {
      const targetUser = options.getUser('target') || user;
      const embed = new EmbedBuilder()
        .setColor('#2B2D31')
        .setTitle(`${targetUser.username}'s Avatar`)
        .setImage(targetUser.displayAvatarURL({ dynamic: true, size: 1024 }));

      await interaction.reply({ embeds: [embed] });
    }
    else if (commandName === 'poll') {
      const question = options.getString('question');
      const embed = new EmbedBuilder()
        .setColor('#2B2D31')
        .setTitle('📊 Community Poll')
        .setDescription(`${question}\n\n-# Created by <@${user.id}>`)
        .setTimestamp();

      const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
      await msg.react('👍');
      await msg.react('👎');
    }
    else if (commandName === 'roll') {
      const roll = Math.floor(Math.random() * 100) + 1;
      await interaction.reply(`🎲 **${user.username}** rolled **${roll}** (1-100)!`);
    }
    else if (commandName === 'warn') {
      const target = options.getUser('target');
      const reason = options.getString('reason');

      const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('⚠️ Warning Issued')
        .addFields(
          { name: 'User', value: `<@${target.id}>`, inline: true },
          { name: 'Moderator', value: `<@${user.id}>`, inline: true },
          { name: 'Reason', value: reason }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
    else if (commandName === 'slowmode') {
      const seconds = options.getInteger('seconds');
      await channel.setRateLimitPerUser(seconds);
      await interaction.reply({ content: `⏱️ Slowmode set to **${seconds} seconds**.`, ephemeral: true });
    }
    else if (commandName === 'lock') {
      await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
      await interaction.reply({ content: '🔒 Channel locked.', ephemeral: true });
    }
    else if (commandName === 'unlock') {
      await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null });
      await interaction.reply({ content: '🔓 Channel unlocked.', ephemeral: true });
    }
    else if (commandName === 'embed') {
      const embed = new EmbedBuilder()
        .setColor('#2B2D31')
        .setTitle(options.getString('title'))
        .setDescription(options.getString('description'))
        .setFooter({ text: `Posted by ${user.username}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
    else if (commandName === 'clear') {
      const amount = options.getInteger('amount');
      if (amount < 1 || amount > 100) {
        return interaction.reply({ content: 'Enter a number between 1 and 100.', ephemeral: true });
      }
      await channel.bulkDelete(amount, true);
      await interaction.reply({ content: `🧹 Cleared **${amount}** messages.`, ephemeral: true });
    }
    else if (commandName === 'kick') {
      const target = options.getMember('target');
      const reason = options.getString('reason') || 'No reason provided';
      if (!target || !target.kickable) {
        return interaction.reply({ content: 'Unable to kick this user.', ephemeral: true });
      }
      await target.kick(reason);
      await interaction.reply(`👞 Kicked **${target.user.tag}**. Reason: ${reason}`);
    }
    else if (commandName === 'ban') {
      const target = options.getMember('target');
      const reason = options.getString('reason') || 'No reason provided';
      if (!target) {
        return interaction.reply({ content: 'Member not found.', ephemeral: true });
      }
      await target.ban({ reason });
      await interaction.reply(`🔨 Banned **${target.user.tag}**. Reason: ${reason}`);
    }

  } catch (error) {
    console.error(`Error executing ${commandName}:`, error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ An error occurred executing this command.', ephemeral: true }).catch(() => {});
    }
  }
});

client.login(process.env.DISCORD_TOKEN);


