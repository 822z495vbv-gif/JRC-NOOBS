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

// --- COMMAND DEFINITIONS ---
const commands = [
  // ECONOMY & GAMBLING
  new SlashCommandBuilder().setName('balance').setDescription('Check cash and bank balance').addUserOption(opt => opt.setName('target').setDescription('User to view')),
  new SlashCommandBuilder().setName('daily').setDescription('Claim your daily cash reward'),
  new SlashCommandBuilder().setName('blackjack').setDescription('Play a hand of high-stakes blackjack').addIntegerOption(opt => opt.setName('bet').setDescription('Amount to wager').setRequired(true)),
  new SlashCommandBuilder().setName('slots').setDescription('Spin the Bleed slot machine').addIntegerOption(opt => opt.setName('bet').setDescription('Amount to wager').setRequired(true)),
  new SlashCommandBuilder().setName('rob').setDescription('Attempt to steal cash from another user').addUserOption(opt => opt.setName('target').setDescription('Target user').setRequired(true)),

  // LEVELING & XP
  new SlashCommandBuilder().setName('rank').setDescription('View current level and XP progression').addUserOption(opt => opt.setName('target').setDescription('User to view')),
  new SlashCommandBuilder().setName('leaderboard').setDescription('View server level & economy leaderboards'),

  // SOCIAL & FUN
  new SlashCommandBuilder().setName('ship').setDescription('Calculate user romantic compatibility').addUserOption(opt => opt.setName('user1').setDescription('First user').setRequired(true)).addUserOption(opt => opt.setName('user2').setDescription('Second user')),
  new SlashCommandBuilder().setName('coinflip').setDescription('Flip a coin').addIntegerOption(opt => opt.setName('bet').setDescription('Optional wager')),
  new SlashCommandBuilder().setName('8ball').setDescription('Ask the oracle').addStringOption(opt => opt.setName('question').setDescription('Question').setRequired(true)),
  new SlashCommandBuilder().setName('pp').setDescription('Check size metric').addUserOption(opt => opt.setName('target').setDescription('User')),
  new SlashCommandBuilder().setName('marry').setDescription('Propose marriage').addUserOption(opt => opt.setName('partner').setDescription('Partner').setRequired(true)),

  // SYSTEM & TELEMETRY
  new SlashCommandBuilder().setName('ping').setDescription('Check precise websocket latency'),
  new SlashCommandBuilder().setName('userinfo').setDescription('View telemetry').addUserOption(opt => opt.setName('target').setDescription('Target user')),
  new SlashCommandBuilder().setName('serverinfo').setDescription('View server telemetry'),
  new SlashCommandBuilder().setName('avatar').setDescription('Fetch avatar').addUserOption(opt => opt.setName('target').setDescription('Target user'))
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

// IN-MEMORY DATABASES (Ultra-fast execution)
const economy = new Map(); // userId -> { wallet, bank, lastDaily }
const leveling = new Map(); // userId -> { xp, level, lastMessage }

const getEco = (id) => economy.get(id) || { wallet: 1000, bank: 0, lastDaily: 0 };
const setEco = (id, data) => economy.set(id, data);

const getXp = (id) => leveling.get(id) || { xp: 0, level: 1, lastMessage: 0 };
const setXp = (id, data) => leveling.set(id, data);

// --- XP AUTOMATION ON MESSAGE ---
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;
  
  const now = Date.now();
  const userXp = getXp(message.author.id);

  // Cooldown of 60 seconds per XP drop to prevent spamming
  if (now - userXp.lastMessage > 60000) {
    const xpGained = Math.floor(Math.random() * 15) + 15;
    userXp.xp += xpGained;
    userXp.lastMessage = now;

    const nextLevelXp = userXp.level * 100;
    if (userXp.xp >= nextLevelXp) {
      userXp.level += 1;
      userXp.xp -= nextLevelXp;

      const embed = new EmbedBuilder()
        .setColor(PALETTE.GOLD)
        .setDescription(`✨ <@${message.author.id}> has advanced to **Level ${userXp.level}**!`);
      
      message.channel.send({ embeds: [embed] }).then(m => setTimeout(() => m.delete().catch(() => {}), 8000));
    }
    setXp(message.author.id, userXp);
  }
});

// --- READY EVENT ---
client.once('ready', async () => {
  console.log(`High-Performance Engine connected as ${client.user.tag}`);
  client.user.setPresence({ activities: [{ name: 'bleed.bot | /ping', type: ActivityType.Custom }], status: 'dnd' });

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    if (GUILD_ID === 'YOUR_SERVER_ID_HERE') {
      await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    } else {
      await rest.put(Routes.applicationGuildCommands(client.user.id, GUILD_ID), { body: commands });
    }
    console.log('Commands synced.');
  } catch (e) { console.error(e); }
});

// --- COMMAND INTERACTION ENGINE ---
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
  const { commandName, options, user, guild } = interaction;

  try {
    // 1. PING (Telemetry Check)
    if (commandName === 'ping') {
      const ping = client.ws.ping;
      const embed = new EmbedBuilder()
        .setColor(PALETTE.DARK)
        .setDescription(`📡 **Websocket Latency:** \`${ping}ms\`\n-# Gateway Status: ${ping < 30 ? 'Optimal (Ultra Fast)' : 'Stable'}`);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // 2. BALANCE
    else if (commandName === 'balance') {
      const target = options.getUser('target') || user;
      const eco = getEco(target.id);
      const embed = new EmbedBuilder()
        .setColor(PALETTE.DARK)
        .setAuthor({ name: target.username, iconURL: target.displayAvatarURL() })
        .setTitle('Vault Telemetry')
        .addFields(
          { name: '💵 Wallet', value: `\`$${eco.wallet.toLocaleString()}\``, inline: true },
          { name: '🏦 Bank', value: `\`$${eco.bank.toLocaleString()}\``, inline: true },
          { name: '🌐 Net Worth', value: `\`$${(eco.wallet + eco.bank).toLocaleString()}\``, inline: true }
        );
      await interaction.reply({ embeds: [embed] });
    }

    // 3. DAILY
    else if (commandName === 'daily') {
      const eco = getEco(user.id);
      const now = Date.now();
      const cooldown = 86400000; // 24 hours

      if (now - eco.lastDaily < cooldown) {
        const remaining = cooldown - (now - eco.lastDaily);
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        return interaction.reply({ content: `⏳ You can claim your daily reward in **${hours}h ${mins}m**.`, ephemeral: true });
      }

      eco.wallet += 2500;
      eco.lastDaily = now;
      setEco(user.id, eco);

      const embed = new EmbedBuilder().setColor(PALETTE.SUCCESS).setDescription('💵 Claimed **$2,500** daily cash stipend.');
      await interaction.reply({ embeds: [embed] });
    }

    // 4. SLOTS GAMBLING
    else if (commandName === 'slots') {
      const bet = options.getInteger('bet');
      const eco = getEco(user.id);

      if (bet <= 0 || eco.wallet < bet) return interaction.reply({ content: '❌ Invalid bet amount or insufficient funds.', ephemeral: true });

      const items = ['🎰', '🍒', '🍋', '👑', '💎'];
      const s1 = items[Math.floor(Math.random() * items.length)];
      const s2 = items[Math.floor(Math.random() * items.length)];
      const s3 = items[Math.floor(Math.random() * items.length)];

      let multiplier = 0;
      if (s1 === s2 && s2 === s3) multiplier = 5;
      else if (s1 === s2 || s2 === s3 || s1 === s3) multiplier = 2;

      if (multiplier > 0) {
        const winnings = bet * multiplier;
        eco.wallet += winnings;
        setEco(user.id, eco);
        const embed = new EmbedBuilder().setColor(PALETTE.SUCCESS).setDescription(`\`[ ${s1} | ${s2} | ${s3} ]\`\n\n🎉 Winner! You multiplied your bet by **${multiplier}x** and gained **$${winnings.toLocaleString()}**.`);
        await interaction.reply({ embeds: [embed] });
      } else {
        eco.wallet -= bet;
        setEco(user.id, eco);
        const embed = new EmbedBuilder().setColor(PALETTE.ERROR).setDescription(`\`[ ${s1} | ${s2} | ${s3} ]\`\n\n💔 You lost **$${bet.toLocaleString()}**.`);
        await interaction.reply({ embeds: [embed] });
      }
    }

    // 5. BLACKJACK
    else if (commandName === 'blackjack') {
      const bet = options.getInteger('bet');
      const eco = getEco(user.id);

      if (bet <= 0 || eco.wallet < bet) return interaction.reply({ content: '❌ Invalid bet amount or insufficient funds.', ephemeral: true });

      const playerHand = Math.floor(Math.random() * 10) + 12;
      const dealerHand = Math.floor(Math.random() * 10) + 12;

      if (playerHand > dealerHand || dealerHand > 21) {
        eco.wallet += bet;
        setEco(user.id, eco);
        const embed = new EmbedBuilder().setColor(PALETTE.SUCCESS).setDescription(`🃏 **Blackjack Victory**\n**Your Score:** \`${playerHand}\` | **Dealer:** \`${dealerHand}\`\n\n+**$${bet.toLocaleString()}**`);
        await interaction.reply({ embeds: [embed] });
      } else {
        eco.wallet -= bet;
        setEco(user.id, eco);
        const embed = new EmbedBuilder().setColor(PALETTE.ERROR).setDescription(`🃏 **Blackjack Defeat**\n**Your Score:** \`${playerHand}\` | **Dealer:** \`${dealerHand}\`\n\n-**$${bet.toLocaleString()}**`);
        await interaction.reply({ embeds: [embed] });
      }
    }

    // 6. RANK
    else if (commandName === 'rank') {
      const target = options.getUser('target') || user;
      const xpData = getXp(target.id);
      const nextXp = xpData.level * 100;

      const embed = new EmbedBuilder()
        .setColor(PALETTE.DARK)
        .setAuthor({ name: target.username, iconURL: target.displayAvatarURL() })
        .setTitle('XP & Progression')
        .addFields(
          { name: 'Level', value: `\`${xpData.level}\``, inline: true },
          { name: 'Experience', value: `\`${xpData.xp} / ${nextXp} XP\``, inline: true }
        );
      await interaction.reply({ embeds: [embed] });
    }

    // 7. LEADERBOARD
    else if (commandName === 'leaderboard') {
      const sortedXp = Array.from(leveling.entries()).sort((a, b) => b[1].level - a[1].level).slice(0, 5);
      
      let list = sortedXp.map(([id, data], i) => `**${i + 1}.** <@${id}> • Level \`${data.level}\` (\`${data.xp} XP\`)`).join('\n') || 'No progression recorded yet.';

      const embed = new EmbedBuilder()
        .setColor(PALETTE.DARK)
        .setTitle('🏆 Server Rank Leaderboard')
        .setDescription(list);
      await interaction.reply({ embeds: [embed] });
    }

    // OTHER COMMANDS
    else if (commandName === 'ship') {
      const target1 = options.getUser('user1');
      const target2 = options.getUser('user2') || user;
      const seed = (BigInt(target1.id) + BigInt(target2.id)) % 101n;
      const percentage = Number(seed);
      const progress = '█'.repeat(Math.floor(percentage / 10)) + '░'.repeat(10 - Math.floor(percentage / 10));

      const embed = new EmbedBuilder()
        .setColor(PALETTE.DARK)
        .setTitle(`${target1.username} x ${target2.username}`)
        .setDescription(`**Match Rating:** \`${percentage}%\`\n\`[${progress}]\``);
      await interaction.reply({ embeds: [embed] });
    }
    else if (commandName === 'marry') {
      const partner = options.getUser('partner');
      if (partner.id === user.id || partner.bot) return interaction.reply({ content: 'Invalid target.', ephemeral: true });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`accept_${user.id}_${partner.id}`).setLabel('Accept').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`deny_${user.id}_${partner.id}`).setLabel('Reject').setStyle(ButtonStyle.Danger)
      );
      const embed = new EmbedBuilder().setColor(PALETTE.DARK).setDescription(`💍 <@${partner.id}>, **${user.username}** proposed to you!`);
      await interaction.reply({ content: `<@${partner.id}>`, embeds: [embed], components: [row] });
    }
  } catch (err) {
    console.error(err);
  }
});

client.login(process.env.DISCORD_TOKEN);




