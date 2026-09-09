const { 
  Client, 
  GatewayIntentBits, 
  REST, 
  Routes, 
  SlashCommandBuilder, 
  EmbedBuilder, 
  PermissionFlagsBits 
} = require('discord.js');

// 1. Define All Dyno & Carl-Bot Style Slash Commands
const commands = [
  // --- UTILITY & INFO ---
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Checks bot response time'),

  new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Displays information about a user')
    .addUserOption(option => option.setName('target').setDescription('The user to inspect')),

  new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Displays details about this server'),

  new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Get the full-size avatar of a user')
    .addUserOption(option => option.setName('target').setDescription('The user')),

  new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Creates a Carl-bot styled announcement embed')
    .addStringOption(option => option.setName('title').setDescription('Title').setRequired(true))
    .addStringOption(option => option.setName('description').setDescription('Main text').setRequired(true)),

  new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Creates a quick reaction poll (Dyno style)')
    .addStringOption(option => option.setName('question').setDescription('Poll question').setRequired(true)),

  new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Rolls a random number (1-100) or dice'),

  // --- MODERATION & CHANNEL CONTROL ---
  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Deletes a specified number of messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(option => option.setName('amount').setDescription('Number of messages (1-100)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warns a member for breaking rules')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option => option.setName('target').setDescription('Member to warn').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for warning').setRequired(true)),

  new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set chat slowmode delay (Dyno feature)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption(option => option.setName('seconds').setDescription('Delay in seconds (0 to turn off)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Locks the current channel from member messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlocks the current channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(option => option.setName('target').setDescription('Member to kick').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason')),

  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(option => option.setName('target').setDescription('Member to ban').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason'))
].map(command => command.toJSON());

// 2. Initialize Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers
  ]
});

// 3. Register Commands on Startup
client.once('ready', async () => {
  console.log(`LoggedIn as ${client.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('Registering Dyno & Carl-bot slash commands...');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('Successfully registered all global slash commands!');
  } catch (error) {
    console.error('Failed to register commands:', error);
  }
});

// 4. Command Handlers
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, guild, channel } = interaction;

  // /ping
  if (commandName === 'ping') {
    await interaction.reply(`🏓 Pong! Latency: \`${client.ws.ping}ms\``);
  }

  // /userinfo
  if (commandName === 'userinfo') {
    const user = options.getUser('target') || interaction.user;
    const member = await guild.members.fetch(user.id);

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .setTitle(`User Info - ${user.username}`)
      .addFields(
        { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
        { name: 'Roles', value: `${member.roles.cache.size - 1}`, inline: true }
      );
    await interaction.reply({ embeds: [embed] });
  }

  // /serverinfo
  if (commandName === 'serverinfo') {
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle(`${guild.name} Info`)
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .addFields(
        { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
        { name: 'Members', value: `${guild.memberCount}`, inline: true },
        { name: 'Created On', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true }
      );
    await interaction.reply({ embeds: [embed] });
  }

  // /avatar
  if (commandName === 'avatar') {
    const user = options.getUser('target') || interaction.user;
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`${user.username}'s Avatar`)
      .setImage(user.displayAvatarURL({ dynamic: true, size: 512 }));
    await interaction.reply({ embeds: [embed] });
  }

  // /poll
  if (commandName === 'poll') {
    const question = options.getString('question');
    const embed = new EmbedBuilder()
      .setColor('#00ff7f')
      .setTitle('📊 Community Poll')
      .setDescription(question)
      .setFooter({ text: `Created by ${interaction.user.username}` });

    const pollMsg = await interaction.reply({ embeds: [embed], fetchReply: true });
    await pollMsg.react('👍');
    await pollMsg.react('👎');
  }

  // /roll
  if (commandName === 'roll') {
    const roll = Math.floor(Math.random() * 100) + 1;
    await interaction.reply(`🎲 **${interaction.user.username}** rolled a **${roll}** (1-100)!`);
  }

  // /warn
  if (commandName === 'warn') {
    const target = options.getUser('target');
    const reason = options.getString('reason');

    const embed = new EmbedBuilder()
      .setColor('#ff9900')
      .setTitle('⚠️ Warning Issued')
      .setDescription(`**User:** ${target.tag}\n**Reason:** ${reason}\n**Moderator:** ${interaction.user.tag}`);

    await interaction.reply({ embeds: [embed] });
  }

  // /slowmode
  if (commandName === 'slowmode') {
    const seconds = options.getInteger('seconds');
    await channel.setRateLimitPerUser(seconds);
    await interaction.reply(`⏱️ Slowmode set to **${seconds} seconds** for this channel.`);
  }

  // /lock
  if (commandName === 'lock') {
    await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
    await interaction.reply('🔒 Channel locked! Members cannot send messages.');
  }

  // /unlock
  if (commandName === 'unlock') {
    await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null });
    await interaction.reply('🔓 Channel unlocked!');
  }

  // /embed
  if (commandName === 'embed') {
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(options.getString('title'))
      .setDescription(options.getString('description'))
      .setFooter({ text: `Posted by ${interaction.user.username}` })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }

  // /clear
  if (commandName === 'clear') {
    const amount = options.getInteger('amount');
    await channel.bulkDelete(amount, true);
    await interaction.reply({ content: `🧹 Cleared **${amount}** messages.`, ephemeral: true });
  }

  // /kick
  if (commandName === 'kick') {
    const target = options.getMember('target');
    const reason = options.getString('reason') || 'No reason provided';
    await target.kick(reason);
    await interaction.reply(`👞 **${target.user.tag}** kicked. Reason: ${reason}`);
  }

  // /ban
  if (commandName === 'ban') {
    const target = options.getMember('target');
    const reason = options.getString('reason') || 'No reason provided';
    await target.ban({ reason });
    await interaction.reply(`🔨 **${target.user.tag}** banned. Reason: ${reason}`);
  }
});

client.login(process.env.DISCORD_TOKEN);

