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

const GUILD_ID = 'YOUR_SERVER_ID_HERE'; // Replace with Guild ID for instant slash sync

// --- COMMAND DEFINITIONS (30+ COMMANDS) ---
const commands = [
  // 1. SYSTEM
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

// IN-MEMORY HIGH PERFORMANCE CACHE
const economy = new Map();
const leveling = new Map();

const getEco = (id) => economy.get(id) || { wallet: 1000, bank: 0, lastDaily: 0, lastWork: 0 };
const setEco = (id, data) => economy.set(id, data);

const getXp = (id) => leveling.get(id) || { xp: 0, level: 1, lastMessage: 0 };
const setXp = (id, data) => leveling.set(id, data);

// XP ENGINE
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
      const embed = new EmbedBuilder().setColor(PALETTE.GOLD).setDescription(`✨ <@${message.author.id}> reached **Level ${userXp.level}**!`);
      message.channel.send({ embeds: [embed] }).then(m => setTimeout(() => m.delete().catch(() => {}), 6000));
    }
    setXp(message.author.id, userXp);
  }
});

// READY EVENT & CUSTOM STATUS
client.once('ready', async () => {
  console.log(`Connected as ${client.user.tag}`);
  
  // Set custom status with server invite
  client.user.setPresence({ 
    activities: [{ 
      name: 'JOIN https://discord.gg/8SCGSyTwDb', 
      type: ActivityType.Custom 
    }], 
    status: 'dnd' 
  });

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    if (GUILD_ID === 'YOUR_SERVER_ID_HERE') {
      await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    } else {
      await rest.put(Routes.applicationGuildCommands(client.user.id, GUILD_ID), { body: commands });
    }
    console.log('30+ Commands operational.');
  } catch (e) { console.error(e); }
});

// O(1) MAP-BASED COMMAND HANDLERS
const handlers = new Map();

handlers.set('ping', async (i) => {
  await i.reply({ embeds: [new EmbedBuilder().setColor(PALETTE.DARK).setDescription(`📡 **Websocket Latency:** \`${i.client.ws.ping}ms\``)], ephemeral: true });
});

handlers.set('botinfo', async (i) => {
  const embed = new EmbedBuilder()
    .setColor(PALETTE.DARK)
    .setTitle('System Telemetry')
    .addFields(
      { name: 'Uptime', value: `\`${Math.floor(i.client.uptime / 60000)} mins\``, inline: true },
      { name: 'Latency', value: `\`${i.client.ws.ping}ms\``, inline: true },
      { name: 'Guilds', value: `\`${i.client.guilds.cache.size}\``, inline: true }
    );
  await i.reply({ embeds: [embed] });
});

handlers.set('userinfo', async (i) => {
  const target = i.options.getUser('target') || i.user;
  const embed = new EmbedBuilder()
    .setColor(PALETTE.DARK)
    .setThumbnail(target.displayAvatarURL())
    .setTitle(`Telemetry • ${target.username}`)
    .addFields(
      { name: 'ID', value: `\`${target.id}\``, inline: true },
      { name: 'Created', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, inline: true }
    );
  await i.reply({ embeds: [embed] });
});

handlers.set('serverinfo', async (i) => {
  const embed = new EmbedBuilder()
    .setColor(PALETTE.DARK)
    .setThumbnail(i.guild.iconURL())
    .setTitle(`${i.guild.name}`)
    .addFields(
      { name: 'Owner', value: `<@${i.guild.ownerId}>`, inline: true },
      { name: 'Members', value: `\`${i.guild.memberCount}\``, inline: true }
    );
  await i.reply({ embeds: [embed] });
});

handlers.set('avatar', async (i) => {
  const target = i.options.getUser('target') || i.user;
  await i.reply({ embeds: [new EmbedBuilder().setColor(PALETTE.DARK).setTitle(`${target.username}'s Avatar`).setImage(target.displayAvatarURL({ size: 1024 }))] });
});

handlers.set('banner', async (i) => {
  const target = await i.client.users.fetch((i.options.getUser('target') || i.user).id, { force: true });
  if (!target.banner) return i.reply({ content: 'User has no custom banner.', ephemeral: true });
  await i.reply({ embeds: [new EmbedBuilder().setColor(PALETTE.DARK).setTitle(`${target.username}'s Banner`).setImage(target.bannerURL({ size: 1024 }))] });
});

handlers.set('clear', async (i) => {
  const amount = i.options.getInteger('amount');
  await i.channel.bulkDelete(amount, true);
  await i.reply({ content: `🧹 Purged \`${amount}\` messages.`, ephemeral: true });
});

handlers.set('warn', async (i) => {
  const target = i.options.getUser('target');
  const embed = new EmbedBuilder().setColor(PALETTE.ERROR).setDescription(`⚠️ **Warning Issued**\n**User:** <@${target.id}>\n**Reason:** ${i.options.getString('reason')}`);
  await i.reply({ embeds: [embed] });
});

handlers.set('timeout', async (i) => {
  const member = i.options.getMember('target');
  const minutes = i.options.getInteger('minutes');
  await member.timeout(minutes * 60 * 1000);
  await i.reply({ content: `🔇 Timed out <@${member.id}> for **${minutes}m**.`, ephemeral: true });
});

handlers.set('untimeout', async (i) => {
  const member = i.options.getMember('target');
  await member.timeout(null);
  await i.reply({ content: `🔊 Lifted timeout for <@${member.id}>.`, ephemeral: true });
});

handlers.set('slowmode', async (i) => {
  const seconds = i.options.getInteger('seconds');
  await i.channel.setRateLimitPerUser(seconds);
  await i.reply({ content: `⏱️ Slowmode set to \`${seconds}s\`.`, ephemeral: true });
});

handlers.set('lock', async (i) => {
  await i.channel.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: false });
  await i.reply({ content: '🔒 Channel locked.', ephemeral: true });
});

handlers.set('unlock', async (i) => {
  await i.channel.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: null });
  await i.reply({ content: '🔓 Channel unlocked.', ephemeral: true });
});

handlers.set('kick', async (i) => {
  const member = i.options.getMember('target');
  await member.kick(i.options.getString('reason') || 'No reason');
  await i.reply({ content: `MD Kicked \`${member.user.tag}\`.`, ephemeral: true });
});

handlers.set('ban', async (i) => {
  const member = i.options.getMember('target');
  await member.ban({ reason: i.options.getString('reason') || 'No reason' });
  await i.reply({ content: `🔨 Banned \`${member.user.tag}\`.`, ephemeral: true });
});

handlers.set('unban', async (i) => {
  const userId = i.options.getString('userid');
  await i.guild.members.unban(userId);
  await i.reply({ content: `🔓 Unbanned user ID \`${userId}\`.`, ephemeral: true });
});

handlers.set('balance', async (i) => {
  const target = i.options.getUser('target') || i.user;
  const eco = getEco(target.id);
  const embed = new EmbedBuilder().setColor(PALETTE.DARK).setTitle(`Vault • ${target.username}`).addFields({ name: '💵 Wallet', value: `\`$${eco.wallet}\``, inline: true }, { name: '🏦 Bank', value: `\`$${eco.bank}\``, inline: true });
  await i.reply({ embeds: [embed] });
});

handlers.set('daily', async (i) => {
  const eco = getEco(i.user.id);
  if (Date.now() - eco.lastDaily < 86400000) return i.reply({ content: '⏳ Claim again tomorrow.', ephemeral: true });
  eco.wallet += 2500;
  eco.lastDaily = Date.now();
  setEco(i.user.id, eco);
  await i.reply({ embeds: [new EmbedBuilder().setColor(PALETTE.SUCCESS).setDescription('💵 Claimed **$2,500** daily cash.')] });
});

handlers.set('work', async (i) => {
  const eco = getEco(i.user.id);
  if (Date.now() - eco.lastWork < 3600000) return i.reply({ content: '⏳ Work shift available in 1 hour.', ephemeral: true });
  const earned = Math.floor(Math.random() * 500) + 200;
  eco.wallet += earned;
  eco.lastWork = Date.now();
  setEco(i.user.id, eco);
  await i.reply({ embeds: [new EmbedBuilder().setColor(PALETTE.SUCCESS).setDescription(`💼 You worked and earned **$${earned}**.`)] });
});

handlers.set('deposit', async (i) => {
  const amt = i.options.getInteger('amount');
  const eco = getEco(i.user.id);
  if (eco.wallet < amt) return i.reply({ content: '❌ Insufficient cash.', ephemeral: true });
  eco.wallet -= amt; eco.bank += amt; setEco(i.user.id, eco);
  await i.reply({ content: `🏦 Deposited **$${amt}** into bank.`, ephemeral: true });
});

handlers.set('withdraw', async (i) => {
  const amt = i.options.getInteger('amount');
  const eco = getEco(i.user.id);
  if (eco.bank < amt) return i.reply({ content: '❌ Insufficient bank funds.', ephemeral: true });
  eco.bank -= amt; eco.wallet += amt; setEco(i.user.id, eco);
  await i.reply({ content: `💵 Withdrew **$${amt}** from bank.`, ephemeral: true });
});

handlers.set('pay', async (i) => {
  const target = i.options.getUser('target');
  const amt = i.options.getInteger('amount');
  const senderEco = getEco(i.user.id);
  if (senderEco.wallet < amt) return i.reply({ content: '❌ Insufficient funds.', ephemeral: true });
  const receiverEco = getEco(target.id);
  senderEco.wallet -= amt; receiverEco.wallet += amt;
  setEco(i.user.id, senderEco); setEco(target.id, receiverEco);
  await i.reply({ content: `💸 Transferred **$${amt}** to <@${target.id}>.` });
});

handlers.set('slots', async (i) => {
  const bet = i.options.getInteger('amount');
  const eco = getEco(i.user.id);
  if (eco.wallet < bet) return i.reply({ content: '❌ Insufficient funds.', ephemeral: true });
  const items = ['🎰', '🍒', '🍋', '💎'];
  const [s1, s2, s3] = [items[Math.floor(Math.random()*4)], items[Math.floor(Math.random()*4)], items[Math.floor(Math.random()*4)]];
  if (s1 === s2 && s2 === s3) { eco.wallet += bet * 3; setEco(i.user.id, eco); await i.reply(`[ ${s1} ${s2} ${s3} ] 🎉 Win! +$${bet * 3}`); }
  else { eco.wallet -= bet; setEco(i.user.id, eco); await i.reply(`[ ${s1} ${s2} ${s3} ] 💔 Lost -$${bet}`); }
});

handlers.set('blackjack', async (i) => {
  const bet = i.options.getInteger('bet');
  const eco = getEco(i.user.id);
  if (eco.wallet < bet) return i.reply({ content: '❌ Insufficient funds.', ephemeral: true });
  const p = Math.floor(Math.random()*10)+12, d = Math.floor(Math.random()*10)+12;
  if (p > d || d > 21) { eco.wallet += bet; setEco(i.user.id, eco); await i.reply(`🃏 **Win!** Score: \`${p}\` vs Dealer: \`${d}\` (+$${bet})`); }
  else { eco.wallet -= bet; setEco(i.user.id, eco); await i.reply(`🃏 **Lost!** Score: \`${p}\` vs Dealer: \`${d}\` (-$${bet})`); }
});

handlers.set('rank', async (i) => {
  const target = i.options.getUser('target') || i.user;
  const xpData = getXp(target.id);
  await i.reply({ embeds: [new EmbedBuilder().setColor(PALETTE.DARK).setTitle(`Rank • ${target.username}`).addFields({ name: 'Level', value: `\`${xpData.level}\``, inline: true }, { name: 'XP', value: `\`${xpData.xp} / ${xpData.level * 100}\``, inline: true })] });
});

handlers.set('leaderboard', async (i) => {
  const sorted = Array.from(leveling.entries()).sort((a,b) => b[1].level - a[1].level).slice(0, 5);
  const desc = sorted.map(([id, d], index) => `**${index+1}.** <@${id}> • Level \`${d.level}\``).join('\n') || 'No data.';
  await i.reply({ embeds: [new EmbedBuilder().setColor(PALETTE.DARK).setTitle('🏆 XP Leaderboard').setDescription(desc)] });
});

handlers.set('ship', async (i) => {
  const t1 = i.options.getUser('user1'), t2 = i.options.getUser('user2') || i.user;
  const score = Number((BigInt(t1.id) + BigInt(t2.id)) % 101n);
  await i.reply({ embeds: [new EmbedBuilder().setColor(PALETTE.DARK).setTitle(`${t1.username} x ${t2.username}`).setDescription(`Match: \`${score}%\``)] });
});

handlers.set('coinflip', async (i) => {
  await i.reply(`🪙 Result: **${Math.random() < 0.5 ? 'Heads' : 'Tails'}**`);
});

handlers.set('dice', async (i) => {
  const sides = i.options.getInteger('sides') || 6;
  await i.reply(`🎲 Rolled a **${Math.floor(Math.random() * sides) + 1}** (1-${sides})`);
});

handlers.set('8ball', async (i) => {
  const ans = ['Yes.', 'No.', 'Ask again later.', 'Definitely.', 'Outlook poor.'];
  await i.reply(`🔮 **Question:** ${i.options.getString('question')}\n**Answer:** ${ans[Math.floor(Math.random()*ans.length)]}`);
});

handlers.set('pp', async (i) => {
  const t = i.options.getUser('target') || i.user;
  const len = Number((BigInt(t.id) % 12n) + 1n);
  await i.reply(`**${t.username}'s Size:**\n\`8${'='.repeat(len)}D\``);
});

handlers.set('marry', async (i) => {
  const partner = i.options.getUser('partner');
  if (partner.id === i.user.id) return i.reply({ content: 'Invalid target.', ephemeral: true });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`accept_${i.user.id}_${partner.id}`).setLabel('Accept').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`deny_${i.user.id}_${partner.id}`).setLabel('Reject').setStyle(ButtonStyle.Danger)
  );
  await i.reply({ content: `<@${partner.id}>`, embeds: [new EmbedBuilder().setColor(PALETTE.DARK).setDescription(`💍 <@${partner.id}>, **${i.user.username}** proposed to you!`)], components: [row] });
});

handlers.set('meme', async (i) => {
  await i.reply({ embeds: [new EmbedBuilder().setColor(PALETTE.DARK).setTitle('Random Meme').setImage('https://picsum.photos/400/300')] });
});

handlers.set('embed', async (i) => {
  await i.reply({ embeds: [new EmbedBuilder().setColor(PALETTE.DARK).setTitle(i.options.getString('title')).setDescription(i.options.getString('description'))] });
});

handlers.set('poll', async (i) => {
  const msg = await i.reply({ embeds: [new EmbedBuilder().setColor(PALETTE.DARK).setTitle('📊 Poll').setDescription(i.options.getString('question'))], fetchReply: true });
  await msg.react('👍'); await msg.react('👎');
});

handlers.set('say', async (i) => {
  await i.channel.send(i.options.getString('message'));
  await i.reply({ content: 'Sent.', ephemeral: true });
});

// INTERACTION ROUTER
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

  const handler = handlers.get(interaction.commandName);
  if (handler) {
    try {
      await handler(interaction);
    } catch (err) {
      console.error(err);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);






