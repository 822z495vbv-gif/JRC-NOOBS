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

const GUILD_ID = 'YOUR_SERVER_ID_HERE'; // Replace with your Guild ID for instant slash command updates

// --- COMMAND DEFINITIONS (30+ COMMANDS) ---
const commands = [
  // 1. SYSTEM & TELEMETRY
  new SlashCommandBuilder().setName('ping').setDescription('Check precise websocket latency'),
  new SlashCommandBuilder().setName('userinfo').setDescription('View telemetry').addUserOption(opt => opt.setName('target').setDescription('Target user')),
  new SlashCommandBuilder().setName('serverinfo').setDescription('View server telemetry'),
  new SlashCommandBuilder().setName('avatar').setDescription('Fetch avatar').addUserOption(opt => opt.setName('target').setDescription('Target user')),
  new SlashCommandBuilder().setName('banner').setDescription('Fetch target user banner').addUserOption(opt => opt.setName('target').setDescription('Target user')),
  new SlashCommandBuilder().setName('botinfo').setDescription('View bot runtime telemetry'),

  // 2. MODERATION & SECURITY
  new SlashCommandBuilder().setName('clear').setDescription('Purge chat history').setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages).addIntegerOption(opt => opt.setName('amount').setDescription('Number of messages (1-100)').setRequired(true)),
  new SlashCommandBuilder().setName('warn').setDescription('Issue formal user infraction').setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers).addUserOption(opt => opt.setName('target').setDescription('Target user').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('Infraction reason').setRequired(true)),
  new SlashCommandBuilder().setName('timeout').setDescription('Timeout a member').setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers).addUserOption(opt => opt.setName('target').setDescription('Target user').setRequired(true)).addIntegerOption(opt => opt.setName('minutes').setDescription('Duration in minutes').setRequired(true)),
  new SlashCommandBuilder().setName('untimeout').setDescription('Remove timeout from a member').setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers).addUserOption(opt => opt.setName('target').setDescription('Target user').setRequired(true)),
  new SlashCommandBuilder().setName('slowmode').setDescription('Enforce channel rate limits').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels).addIntegerOption(opt => opt.setName('seconds').setDescription('Delay in seconds (0 = off)').setRequired(true)),
  new SlashCommandBuilder().setName('lock').setDescription('Lockdown current channel').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  new SlashCommandBuilder().setName('unlock').setDescription('Lift channel lockdown').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  new SlashCommandBuilder().setName('kick').setDescription('Remove user from server').setDefaultMemberPermissions(PermissionFlagsBits.KickMembers).addUserOption(opt => opt.setName('target').setDescription('Target user').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('Reason')),
  new SlashCommandBuilder().setName('ban').setDescription('Permanently ban user').setDefaultMemberPermissions(PermissionFlagsBits.BanMembers).addUserOption(opt => opt.setName('target').setDescription('Target user').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('Reason')),
  new SlashCommandBuilder().setName('unban').setDescription('Unban a user by ID').setDefaultMemberPermissions(PermissionFlagsBits.BanMembers).addStringOption(opt => opt.setName('userid').setDescription('Target user ID').setRequired(true)),

  // 3. ECONOMY & GAMBLING
  new SlashCommandBuilder().setName('balance').setDescription('Check cash and bank balance').addUserOption(opt => opt.setName('target').setDescription('User to view')),
  new SlashCommandBuilder().setName('daily').setDescription('Claim your daily cash reward'),
  new SlashCommandBuilder().setName('work').setDescription('Work to earn cash'),
  new SlashCommandBuilder().setName('deposit').setDescription('Deposit cash into bank').addIntegerOption(opt => opt.setName('amount').setDescription('Amount to deposit').setRequired(true)),
  new SlashCommandBuilder().setName('withdraw').setDescription('Withdraw cash from bank').addIntegerOption(opt => opt.setName('amount').setDescription('Amount to withdraw').setRequired(true)),
  new SlashCommandBuilder().setName('pay').setDescription('Transfer cash to another user').addUserOption(opt => opt.setName('target').setDescription('Target user').setRequired(true)).addIntegerOption(opt => opt.setName('amount').setDescription('Amount').setRequired(true)),
  new SlashCommandBuilder().setName('slots').setDescription('Spin the slot machine').addIntegerOption(opt => opt.setName('bet').setDescription('Wager').setRequired(true)),
  new SlashCommandBuilder().setName('blackjack').setDescription('Play a hand of blackjack').addIntegerOption(opt => opt.setName('bet').setDescription('Wager').setRequired(true)),

  // 4. LEVELING & PROGRESSION
  new SlashCommandBuilder().setName('rank').setDescription('View level and XP').addUserOption(opt => opt.setName('target').setDescription('User to view')),
  new SlashCommandBuilder().setName('leaderboard').setDescription('View level & economy leaderboards'),

  // 5. SOCIAL & FUN
  new SlashCommandBuilder().setName('ship').setDescription('Calculate user romantic compatibility').addUserOption(opt => opt.setName('user1').setDescription('First user').setRequired(true)).addUserOption(opt => opt.setName('user2').setDescription('Second user')),
  new SlashCommandBuilder().setName('coinflip').setDescription('Flip a coin'),
  new SlashCommandBuilder().setName('dice').setDescription('Roll a custom die').addIntegerOption(opt => opt.setName('sides').setDescription('Number of sides (Default: 6)')),
  new SlashCommandBuilder().setName('8ball').setDescription('Ask the oracle').addStringOption(opt => opt.setName('question').setDescription('Question').setRequired(true)),
  new SlashCommandBuilder().setName('pp').setDescription('Check size metric').addUserOption(opt => opt.setName('target').setDescription('User')),
  new SlashCommandBuilder().setName('marry').setDescription('Propose marriage').addUserOption(opt => opt.setName('partner').setDescription('Partner').setRequired(true)),
  new SlashCommandBuilder().setName('meme').setDescription('Fetch a random meme'),

  // 6. UTILITY & ADMIN
  new SlashCommandBuilder().setName('embed').setDescription('Generate custom styled embed').addStringOption(opt => opt.setName('title').setDescription('Title').setRequired(true)).addStringOption(opt => opt.setName('description').setDescription('Description').setRequired(true)),
  new SlashCommandBuilder().setName('poll').setDescription('Create a poll').addStringOption(opt => opt.setName('question').setDescription('Question').setRequired(true)),
  new SlashCommandBuilder().setName('say').setDescription('Make the bot echo a message').setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages).addStringOption(opt => opt.setName('message').setDescription('Message').setRequired(true))
].map(cmd => cmd.toJSON());

// --- CLIENT SETUP ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

const PALETTE = { DARK: '#2B2D31', SUCCESS: '#57F287', ERROR: '#ED4245', GOLD: '#FEE75C' };

// IN-MEMORY CACHE
const economy = new Map();
const leveling = new Map();

const getEco = (id) => economy.get(id) || { wallet: 1000, bank: 0, lastDaily: 0, lastWork: 0 };
const setEco = (id, data) => economy.set(id, data);

const getXp = (id) => leveling.get(id) || { xp: 0, level: 1, lastMessage: 0 };
const setXp = (id, data) => leveling.set(id, data);

// XP ON MESSAGE
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;
  const now = Date.now();
  const userXp = getXp(message.author.id);

  if (now - userXp.lastMessage > 60000) {
    userXp.xp += Math.floor(Math.random() * 15) + 15;
    userXp.lastMessage = now;

    const nextLevelXp = userXp.level * 100;
    if (userXp.xp >= nextLevelXp) {
      userXp.level += 1;
      userXp.xp -= nextLevelXp;
      const embed = new EmbedBuilder().setColor(PALETTE.GOLD).setDescription(`✨ <@${message.author.id}> has advanced to **Level ${userXp.level}**!`);
      message.channel.send({ embeds: [embed] }).then(m => setTimeout(() => m.delete().catch(() => {}), 8000));
    }
    setXp(message.author.id, userXp);
  }
});

// READY EVENT
client.once('ready', async () => {
  console.log(`Connected as ${client.user.tag}`);
  client.user.setPresence({ activities: [{ name: '30+ Commands Loaded | /ping', type: ActivityType.Custom }], status: 'dnd' });

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    if (GUILD_ID === 'YOUR_SERVER_ID_HERE') {
      await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    } else {
      await rest.put(Routes.applicationGuildCommands(client.user.id, GUILD_ID), { body: commands });
    }
    console.log('Successfully synced all 30+ commands!');
  } catch (e) { console.error(e); }
});

// INTERACTION ENGINE
client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
    const [action, proposerId, partnerId] = interaction.customId.split('_');
    if (interaction.user.id !== partnerId) return interaction.reply({ content: '❌ Not for you.', ephemeral: true });

    if (action === 'accept') {
      const embed = new EmbedBuilder().setColor(PALETTE.DARK).setDescription(`💍 <@${partnerId}> accepted <@${proposerId}>'s proposal!`);
      await interaction.update({ embeds: [embed], components: [] });
    } else if (action === 'deny') {
      const embed = new EmbedBuilder().setColor(PALETTE.ERROR).setDescription(`💔 <@${partnerId}> rejected <@${proposerId}>'s proposal.`);
      await interaction.update({ embeds: [embed], components: [] });
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;
  const { commandName, options, user, guild, channel } = interaction;

  try {
    // 1. SYSTEM
    if (commandName === 'ping') {
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(PALETTE.DARK).setDescription(`📡 **Websocket Latency:** \`${client.ws.ping}ms\``)], ephemeral: true });
    }
    else if (commandName === 'botinfo') {
      const embed = new EmbedBuilder()
        .setColor(PALETTE.DARK)
        .setTitle('System Telemetry')
        .addFields(
          { name: 'Uptime', value: `\`${Math.floor(client.uptime / 60000)} mins\``, inline: true },
          { name: 'Latency', value: `\`${client.ws.ping}ms\``, inline: true },
          { name: 'Guilds', value: `\`${client.guilds.cache.size}\``, inline: true }
        );
      await interaction.reply({ embeds: [embed] });
    }
    else if (commandName === 'userinfo') {
      const target = options.getUser('target') || user;
      const member = await guild.members.fetch(target.id).catch(() => null);
      const embed = new EmbedBuilder()
        .setColor(PALETTE.DARK)
        .setThumbnail(target.displayAvatarURL())
        .setTitle(`Telemetry • ${target.username}`)
        .addFields(
          { name: 'ID', value: `\`${target.id}\``, inline: true },
          { name: 'Created', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, inline: true },
          { name: 'Joined', value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'N/A', inline: true }
        );
      await interaction.reply({ embeds: [embed] });
    }
    else if (commandName === 'serverinfo') {
      const embed = new EmbedBuilder()
        .setColor(PALETTE.DARK)
        .setThumbnail(guild.iconURL())
        .setTitle(`${guild.name}`)
        .addFields(
          { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
          { name: 'Members', value: `\`${guild.memberCount}\``, inline: true },
          { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true }
        );
      await interaction.reply({ embeds: [embed] });
    }
    else if (commandName === 'avatar') {
      const target = options.getUser('target') || user;
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(PALETTE.DARK).setTitle(`${target.username}'s Avatar`).setImage(target.displayAvatarURL({ size: 1024 }))] });
    }
    else if (commandName === 'banner') {
      const target = await client.users.fetch((options.getUser('target') || user).id, { force: true });
      if (!target.banner) return interaction.reply({ content: 'User has no custom banner.', ephemeral: true });
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(PALETTE.DARK).setTitle(`${target.username}'s Banner`).setImage(target.bannerURL({ size: 1024 }))] });
    }

    // 2. MODERATION
    else if (commandName === 'clear') {
      const amount = options.getInteger('amount');
      await channel.bulkDelete(amount, true);
      await interaction.reply({ content: `🧹 Purged \`${amount}\` messages.`, ephemeral: true });
    }
    else if (commandName === 'warn') {
      const target = options.getUser('target');
      const embed = new EmbedBuilder().setColor(PALETTE.ERROR).setDescription(`⚠️ **Warning Issued**\n**User:** <@${target.id}>\n**Reason:** ${options.getString('reason')}`);
      await interaction.reply({ embeds: [embed] });
    }
    else if (commandName === 'timeout') {
      const member = options.getMember('target');
      const minutes = options.getInteger('minutes');
      await member.timeout(minutes * 60 * 1000);
      await interaction.reply({ content: `🔇 Timed out <@${member.id}> for **${minutes}m**.`, ephemeral: true });
    }
    else if (commandName === 'untimeout') {
      const member = options.getMember('target');
      await member.timeout(null);
      await interaction.reply({ content: `🔊 Lifted timeout for <@${member.id}>.`, ephemeral: true });
    }
    else if (commandName === 'slowmode') {
      const seconds = options.getInteger('seconds');
      await channel.setRateLimitPerUser(seconds);
      await interaction.reply({ content: `⏱️ Slowmode set to \`${seconds}s\`.`, ephemeral: true });
    }
    else if (commandName === 'lock') {
      await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
      await interaction.reply({ content: '🔒 Channel locked.', ephemeral: true });
    }
    else if (commandName === 'unlock') {
      await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null });
      await interaction.reply({ content: '🔓 Channel unlocked.', ephemeral: true });
    }
    else if (commandName === 'kick') {
      const member = options.getMember('target');
      await member.kick(options.getString('reason') || 'No reason');
      await interaction.reply({ content: `👞 Kicked \`${member.user.tag}\`.`, ephemeral: true });
    }
    else if (commandName === 'ban') {
      const member = options.getMember('target');
      await member.ban({ reason: options.getString('reason') || 'No reason' });
      await interaction.reply({ content: `🔨 Banned \`${member.user.tag}\`.`, ephemeral: true });
    }
    else if (commandName === 'unban') {
      const userId = options.getString('userid');
      await guild.members.unban(userId);
      await interaction.reply({ content: `🔓 Unbanned user ID \`${userId}\`.`, ephemeral: true });
    }

    // 3. ECONOMY
    else if (commandName === 'balance') {
      const target = options.getUser('target') || user;
      const eco = getEco(target.id);
      const embed = new EmbedBuilder().setColor(PALETTE.DARK).setTitle(`Vault • ${target.username}`).addFields({ name: '💵 Wallet', value: `\`$${eco.wallet}\``, inline: true }, { name: '🏦 Bank', value: `\`$${eco.bank}\``, inline: true });
      await interaction.reply({ embeds: [embed] });
    }
    else if (commandName === 'daily') {
      const eco = getEco(user.id);
      if (Date.now() - eco.lastDaily < 86400000) return interaction.reply({ content: '⏳ Claim again tomorrow.', ephemeral: true });
      eco.wallet += 2500;
      eco.lastDaily = Date.now();
      setEco(user.id, eco);
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(PALETTE.SUCCESS).setDescription('💵 Claimed **$2,500** daily cash.')] });
    }
    else if (commandName === 'work') {
      const eco = getEco(user.id);
      if (Date.now() - eco.lastWork < 3600000) return interaction.reply({ content: '⏳ Work shift available in 1 hour.', ephemeral: true });
      const earned = Math.floor(Math.random() * 500) + 200;
      eco.wallet += earned;
      eco.lastWork = Date.now();
      setEco(user.id, eco);
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(PALETTE.SUCCESS).setDescription(`💼 You worked and earned **$${earned}**.`)] });
    }
    else if (commandName === 'deposit') {
      const amt = options.getInteger('amount');
      const eco = getEco(user.id);
      if (eco.wallet < amt) return interaction.reply({ content: '❌ Insufficient cash.', ephemeral: true });
      eco.wallet -= amt; eco.bank += amt; setEco(user.id, eco);
      await interaction.reply({ content: `🏦 Deposited **$${amt}** into bank.`, ephemeral: true });
    }
    else if (commandName === 'withdraw') {
      const amt = options.getInteger('amount');
      const eco = getEco(user.id);
      if (eco.bank < amt) return interaction.reply({ content: '❌ Insufficient bank funds.', ephemeral: true });
      eco.bank -= amt; eco.wallet += amt; setEco(user.id, eco);
      await interaction.reply({ content: `💵 Withdrew **$${amt}** from bank.`, ephemeral: true });
    }
    else if (commandName === 'pay') {
      const target = options.getUser('target');
      const amt = options.getInteger('amount');
      const senderEco = getEco(user.id);
      if (senderEco.wallet < amt) return interaction.reply({ content: '❌ Insufficient funds.', ephemeral: true });
      const receiverEco = getEco(target.id);
      senderEco.wallet -= amt; receiverEco.wallet += amt;
      setEco(user.id, senderEco); setEco(target.id, receiverEco);
      await interaction.reply({ content: `💸 Transferred **$${amt}** to <@${target.id}>.` });
    }
    else if (commandName === 'slots') {
      const bet = options.getInteger('bet');
      const eco = getEco(user.id);
      if (eco.wallet < bet) return interaction.reply({ content: '❌ Insufficient funds.', ephemeral: true });
      const items = ['🎰', '🍒', '🍋', '💎'];
      const [s1, s2, s3] = [items[Math.floor(Math.random()*4)], items[Math.floor(Math.random()*4)], items[Math.floor(Math.random()*4)]];
      if (s1 === s2 && s2 === s3) { eco.wallet += bet * 3; setEco(user.id, eco); await interaction.reply(`[ ${s1} ${s2} ${s3} ] 🎉 Win! +$${bet * 3}`); }
      else { eco.wallet -= bet; setEco(user.id, eco); await interaction.reply(`[ ${s1} ${s2} ${s3} ] 💔 Lost -$${bet}`); }
    }
    else if (commandName === 'blackjack') {
      const bet = options.getInteger('bet');
      const eco = getEco(user.id);
      if (eco.wallet < bet) return interaction.reply({ content: '❌ Insufficient funds.', ephemeral: true });
      const p = Math.floor(Math.random()*10)+12, d = Math.floor(Math.random()*10)+12;
      if (p > d || d > 21) { eco.wallet += bet; setEco(user.id, eco); await interaction.reply(`🃏 **Win!** Score: \`${p}\` vs Dealer: \`${d}\` (+$${bet})`); }
      else { eco.wallet -= bet; setEco(user.id, eco); await interaction.reply(`🃏 **Lost!** Score: \`${p}\` vs Dealer: \`${d}\` (-$${bet})`); }
    }

    // 4. LEVELING
    else if (commandName === 'rank') {
      const target = options.getUser('target') || user;
      const xpData = getXp(target.id);
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(PALETTE.DARK).setTitle(`Rank • ${target.username}`).addFields({ name: 'Level', value: `\`${xpData.level}\``, inline: true }, { name: 'XP', value: `\`${xpData.xp} / ${xpData.level * 100}\``, inline: true })] });
    }
    else if (commandName === 'leaderboard') {
      const sorted = Array.from(leveling.entries()).sort((a,b) => b[1].level - a[1].level).slice(0, 5);
      const desc = sorted.map(([id, d], i) => `**${i+1}.** <@${id}> • Level \`${d.level}\``).join('\n') || 'No data.';
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(PALETTE.DARK).setTitle('🏆 XP Leaderboard').setDescription(desc)] });
    }

    // 5. FUN & SOCIAL
    else if (commandName === 'ship') {
      const t1 = options.getUser('user1'), t2 = options.getUser('user2') || user;
      const score = Number((BigInt(t1.id) + BigInt(t2.id)) % 101n);
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(PALETTE.DARK).setTitle(`${t1.username} x ${t2.username}`).setDescription(`Match: \`${score}%\``)] });
    }
    else if (commandName === 'coinflip') {
      await interaction.reply(`🪙 Result: **${Math.random() < 0.5 ? 'Heads' : 'Tails'}**`);
    }
    else if (commandName === 'dice') {
      const sides = options.getInteger('sides') || 6;
      await interaction.reply(`🎲 Rolled a **${Math.floor(Math.random() * sides) + 1}** (1-${sides})`);
    }
    else if (commandName === '8ball') {
      const ans = ['Yes.', 'No.', 'Ask again later.', 'Definitely.', 'Outlook poor.'];
      await interaction.reply(`🔮 **Question:** ${options.getString('question')}\n**Answer:** ${ans[Math.floor(Math.random()*ans.length)]}`);
    }
    else if (commandName === 'pp') {
      const t = options.getUser('target') || user;
      const len = Number((BigInt(t.id) % 12n) + 1n);
      await interaction.reply(`**${t.username}'s Size:**\n\`8${'='.repeat(len)}D\``);
    }
    else if (commandName === 'marry') {
      const partner = options.getUser('partner');
      if (partner.id === user.id) return interaction.reply({ content: 'Invalid target.', ephemeral: true });
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`accept_${user.id}_${partner.id}`).setLabel('Accept').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`deny_${user.id}_${partner.id}`).setLabel('Reject').setStyle(ButtonStyle.Danger)
      );
      await interaction.reply({ content: `<@${partner.id}>`, embeds: [new EmbedBuilder().setColor(PALETTE.DARK).setDescription(`💍 <@${partner.id}>, **${user.username}** proposed to you!`)], components: [row] });
    }
    else if (commandName === 'meme') {
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(PALETTE.DARK).setTitle('Random Meme').setImage('https://picsum.photos/400/300')] });
    }

    // 6. UTILITY
    else if (commandName === 'embed') {
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(PALETTE.DARK).setTitle(options.getString('title')).setDescription(options.getString('description'))] });
    }
    else if (commandName === 'poll') {
      const msg = await interaction.reply({ embeds: [new EmbedBuilder().setColor(PALETTE.DARK).setTitle('📊 Poll').setDescription(options.getString('question'))], fetchReply: true });
      await msg.react('👍'); await msg.react('👎');
    }
    else if (commandName === 'say') {
      await channel.send(options.getString('message'));
      await interaction.reply({ content: 'Sent.', ephemeral: true });
    }

  } catch (err) {
    console.error(err);
  }
});

client.login(process.env.DISCORD_TOKEN);





