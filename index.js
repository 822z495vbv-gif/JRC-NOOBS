
const { 
  Client, 
  GatewayIntentBits, 
  REST, 
  Routes, 
  SlashCommandBuilder, 
  EmbedBuilder, 
  PermissionFlagsBits,
  ActivityType
} = require('discord.js');

// 1. Define Slash Commands
const commands = [
  // --- UTILITY & INFO ---
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Checks bot latency'),

  new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Get details about a user')
    .addUserOption(opt => opt.setName('target').setDescription('User to inspect')),

  new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Get details about this server'),

  new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('View full size avatar of a user')
    .addUserOption(opt => opt.setName('target').setDescription('User to view')),

  new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Create a stylized announcement embed')
    .addStringOption(opt => opt.setName('title').setDescription('Title').setRequired(true))
    .addStringOption(opt => opt.setName('description').setDescription('Main text').setRequired(true)),

  new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Start a community reaction poll')
    .addStringOption(opt => opt.setName('question').setDescription('Poll question').setRequired(true)),

  new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll a random number from 1 to 100'),

  // --- MODERATION ---
  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Bulk delete messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(opt => opt.setName('amount').setDescription('Number of messages (1-100)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user for rule breaking')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt => opt.setName('target').setDescription('Member to warn').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(true)),

  new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set channel slowmode delay')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption(opt => opt.setName('seconds').setDescription('Delay in seconds (0 = off)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock current channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock current channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(opt => opt.setName('target').setDescription('Member to kick').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason')),

  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(opt => opt.setName('target').setDescription('Member to ban').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason'))
].map(cmd => cmd.toJSON());

// 2. Initialize Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers
  ]
});

// 3. Ready Event & Registration
client.once('ready', async () => {
  console.log(`LoggedIn as ${client.user.tag}`);

  // Set Profile Playing Status
  client.user.setPresence({
    activities: [{ name: '/ping | Managing Server', type: ActivityType.Playing }],
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

// 4. Command Executor with Error Protection
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, guild, channel, user } = interaction;

  try {
    // /ping
    if (commandName === 'ping') {
      await interaction.reply({
        content: `🏓 **Pong!** API Latency: \`${client.ws.ping}ms\``,
        ephemeral: true
      });
    }

    // /userinfo
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

    // /serverinfo
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

    // /avatar
    else if (commandName === 'avatar') {
      const targetUser = options.getUser('target') || user;
      const embed = new EmbedBuilder()
        .setColor('#2B2D31')
        .setTitle(`${targetUser.username}'s Avatar`)
        .setImage(targetUser.displayAvatarURL({ dynamic: true, size: 1024 }));

      await interaction.reply({ embeds: [embed] });
    }

    // /poll
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

    // /roll
    else if (commandName === 'roll') {
      const roll = Math.floor(Math.random() * 100) + 1;
      await interaction.reply(`🎲 **${user.username}** rolled **${roll}** (1-100)!`);
    }

    // /warn
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

    // /slowmode
    else if (commandName === 'slowmode') {
      const seconds = options.getInteger('seconds');
      await channel.setRateLimitPerUser(seconds);
      await interaction.reply({ content: `⏱️ Slowmode set to **${seconds} seconds**.`, ephemeral: true });
    }

    // /lock
    else if (commandName === 'lock') {
      await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
      await interaction.reply({ content: '🔒 Channel locked.', ephemeral: true });
    }

    // /unlock
    else if (commandName === 'unlock') {
      await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null });
      await interaction.reply({ content: '🔓 Channel unlocked.', ephemeral: true });
    }

    // /embed
    else if (commandName === 'embed') {
      const embed = new EmbedBuilder()
        .setColor('#2B2D31')
        .setTitle(options.getString('title'))
        .setDescription(options.getString('description'))
        .setFooter({ text: `Posted by ${user.username}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    // /clear
    else if (commandName === 'clear') {
      const amount = options.getInteger('amount');
      if (amount < 1 || amount > 100) {
        return interaction.reply({ content: 'Enter a number between 1 and 100.', ephemeral: true });
      }
      await channel.bulkDelete(amount, true);
      await interaction.reply({ content: `🧹 Cleared **${amount}** messages.`, ephemeral: true });
    }

    // /kick
    else if (commandName === 'kick') {
      const target = options.getMember('target');
      const reason = options.getString('reason') || 'No reason provided';
      if (!target || !target.kickable) {
        return interaction.reply({ content: 'Unable to kick this user.', ephemeral: true });
      }
      await target.kick(reason);
      await interaction.reply(`👞 Kicked **${target.user.tag}**. Reason: ${reason}`);
    }

    // /ban
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

