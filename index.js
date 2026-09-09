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
  // 1. /moderation GROUP
  new SlashCommandBuilder()
    .setName('moderation')
    .setDescription('Moderation and administrative enforcement tools')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(sub => 
      sub.setName('ban').setDescription('Bans a member from the server')
         .addUserOption(opt => opt.setName('target').setDescription('Target user').setRequired(true))
         .addStringOption(opt => opt.setName('reason').setDescription('Reason for ban'))
    )
    .addSubcommand(sub => 
      sub.setName('unban').setDescription('Unbans a user via user ID')
         .addStringOption(opt => opt.setName('userid').setDescription('Target user ID').setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('kick').setDescription('Kicks a member from the server')
         .addUserOption(opt => opt.setName('target').setDescription('Target user').setRequired(true))
         .addStringOption(opt => opt.setName('reason').setDescription('Reason for kick'))
    )
    .addSubcommand(sub => 
      sub.setName('mute').setDescription('Mutes a member for a specified duration')
         .addUserOption(opt => opt.setName('target').setDescription('Target user').setRequired(true))
         .addIntegerOption(opt => opt.setName('minutes').setDescription('Duration in minutes').setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('removetimeout').setDescription('Remove timeout from a member')
         .addUserOption(opt => opt.setName('target').setDescription('Target user').setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('warn').setDescription('Issues a warning to a member')
         .addUserOption(opt => opt.setName('target').setDescription('Target user').setRequired(true))
         .addStringOption(opt => opt.setName('reason').setDescription('Reason for warning').setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('clearwarnings').setDescription('Clears all warnings for a member')
         .addUserOption(opt => opt.setName('target').setDescription('Target user').setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('warnings').setDescription('Views warning logs for a member')
         .addUserOption(opt => opt.setName('target').setDescription('Target user').setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('cleanup').setDescription('Cleans up recent chat messages')
         .addIntegerOption(opt => opt.setName('amount').setDescription('Number of messages').setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('softban').setDescription('Bans and immediately unbans to clear recent messages')
         .addUserOption(opt => opt.setName('target').setDescription('Target user').setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('hardmute').setDescription('Mutes a member and strips all roles')
         .addUserOption(opt => opt.setName('target').setDescription('Target user').setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('slowmode').setDescription('Sets channel message rate limit delay')
         .addIntegerOption(opt => opt.setName('seconds').setDescription('Delay in seconds').setRequired(true))
    )
    .addSubcommand(sub => sub.setName('lock').setDescription('Locks the current channel'))
    .addSubcommand(sub => sub.setName('unlock').setDescription('Unlocks the current channel')),

  // 2. /role GROUP
  new SlashCommandBuilder()
    .setName('role')
    .setDescription('Role management system')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(sub => 
      sub.setName('add').setDescription('Adds a role to a specified user')
         .addUserOption(opt => opt.setName('target').setDescription('Target member').setRequired(true))
         .addRoleOption(opt => opt.setName('role').setDescription('Role to grant').setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('remove').setDescription('Removes a role from the specified member')
         .addUserOption(opt => opt.setName('target').setDescription('Target member').setRequired(true))
         .addRoleOption(opt => opt.setName('role').setDescription('Role to remove').setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('removeall').setDescription('Removes all roles from a user')
         .addUserOption(opt => opt.setName('target').setDescription('Target member').setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('humans').setDescription('Adds a role to all human members')
         .addRoleOption(opt => opt.setName('role').setDescription('Role to grant').setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('removehumans').setDescription('Removes a role from all human members')
         .addRoleOption(opt => opt.setName('role').setDescription('Role to remove').setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('bots').setDescription('Adds a role to all bot accounts')
         .addRoleOption(opt => opt.setName('role').setDescription('Role to grant').setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('removebots').setDescription('Removes a role from all bot accounts')
         .addRoleOption(opt => opt.setName('role').setDescription('Role to remove').setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('removein').setDescription('Removes a role from all members in a specific role')
         .addRoleOption(opt => opt.setName('from_role').setDescription('Source role').setRequired(true))
         .addRoleOption(opt => opt.setName('target_role').setDescription('Role to strip').setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('info').setDescription('Checks detailed information for a role')
         .addRoleOption(opt => opt.setName('role').setDescription('Role to inspect').setRequired(true))
    ),

  // 3. /security GROUP
  new SlashCommandBuilder()
    .setName('security')
    .setDescription('Server protection and anti-raid controls')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('antinuke').setDescription('View Anti-Nuke automated status'))
    .addSubcommand(sub => sub.setName('lockdown').setDescription('Locks down all public text channels'))
    .addSubcommand(sub => sub.setName('unlockall').setDescription('Lifts server-wide channel lockdown')),

  // 4. /utility GROUP
  new SlashCommandBuilder()
    .setName('utility')
    .setDescription('Everyday server utility commands')
    .addSubcommand(sub => sub.setName('ping').setDescription('Checks WebSocket latency'))
    .addSubcommand(sub => sub.setName('botinfo').setDescription('Displays bot system metrics'))
    .addSubcommand(sub => sub.setName('serverinfo').setDescription('Displays detailed server metrics'))
    .addSubcommand(sub => 
      sub.setName('userinfo').setDescription('Inspects account telemetry')
         .addUserOption(opt => opt.setName('target').setDescription('Target user'))
    )
    .addSubcommand(sub => 
      sub.setName('avatar').setDescription('Displays full avatar image')
         .addUserOption(opt => opt.setName('target').setDescription('Target user'))
    )
    .addSubcommand(sub => 
      sub.setName('banner').setDescription('Displays target banner image')
         .addUserOption(opt => opt.setName('target').setDescription('Target user'))
    )
    .addSubcommand(sub => 
      sub.setName('embed').setDescription('Posts a formatted embed message')
         .addStringOption(opt => opt.setName('title').setDescription('Title').setRequired(true))
         .addStringOption(opt => opt.setName('text').setDescription('Content text').setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('poll').setDescription('Creates a binary reaction poll')
         .addStringOption(opt => opt.setName('question').setDescription('Question topic').setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('say').setDescription('Makes the bot post custom text')
         .addStringOption(opt => opt.setName('message').setDescription('Text message').setRequired(true))
    ),

  // 5. /economy GROUP
  new SlashCommandBuilder()
    .setName('economy')
    .setDescription('Virtual wallet and bank progression')
    .addSubcommand(sub => 
      sub.setName('balance').setDescription('Check current balance')
         .addUserOption(opt => opt.setName('target').setDescription('Target user'))
    )
    .addSubcommand(sub => sub.setName('daily').setDescription('Claim daily cash allowance'))
    .addSubcommand(sub => sub.setName('work').setDescription('Perform shift for cash'))
    .addSubcommand(sub => 
      sub.setName('deposit').setDescription('Deposit wallet cash into bank')
         .addIntegerOption(opt => opt.setName('amount').setDescription('Amount').setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('withdraw').setDescription('Withdraw bank cash to wallet')
         .addIntegerOption(opt => opt.setName('amount').setDescription('Amount').setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('pay').setDescription('Transfers money to another user')
         .addUserOption(opt => opt.setName('target').setDescription('Recipient').setRequired(true))
         .addIntegerOption(opt => opt.setName('amount').setDescription('Amount').setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('slots').setDescription('Gamble cash on slot machine')
         .addIntegerOption(opt => opt.setName('bet').setDescription('Wager amount').setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('blackjack').setDescription('Play blackjack hand against house')
         .addIntegerOption(opt => opt.setName('bet').setDescription('Wager amount').setRequired(true))
    ),

  // 6. /fun GROUP
  new SlashCommandBuilder()
    .setName('fun')
    .setDescription('Entertainment and social interaction tools')
    .addSubcommand(sub => 
      sub.setName('ship').setDescription('Calculates love compatibility rating')
         .addUserOption(opt => opt.setName('user1').setDescription('First user').setRequired(true))
         .addUserOption(opt => opt.setName('user2').setDescription('Second user'))
    )
    .addSubcommand(sub => sub.setName('coinflip').setDescription('Flips a standard coin'))
    .addSubcommand(sub => 
      sub.setName('dice').setDescription('Rolls custom sided die')
         .addIntegerOption(opt => opt.setName('sides').setDescription('Number of sides'))
    )
    .addSubcommand(sub => 
      sub.setName('8ball').setDescription('Asks magic oracle a question')
         .addStringOption(opt => opt.setName('question').setDescription('Question text').setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('pp').setDescription('Generates random size metric')
         .addUserOption(opt => opt.setName('target').setDescription('Target user'))
    )
    .addSubcommand(sub => 
      sub.setName('marry').setDescription('Proposes interactive marriage')
         .addUserOption(opt => opt.setName('partner').setDescription('Target user').setRequired(true))
    )
    .addSubcommand(sub => sub.setName('meme').setDescription('Fetches a meme image card')),

  // 7. /leveling GROUP
  new SlashCommandBuilder()
    .setName('leveling')
    .setDescription('XP and chatting ranking system')
    .addSubcommand(sub => 
      sub.setName('rank').setDescription('Views XP rank')
         .addUserOption(opt => opt.setName('target').setDescription('Target user'))
    )
    .addSubcommand(sub => sub.setName('leaderboard').setDescription('Views top server ranks')),

  // STANDALONE COMMAND
  new SlashCommandBuilder().setName('bump').setDescription('Bumps the server listing')
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

// --- LINK SANITIZER & XP LISTENER ---
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  // LINK REMOVAL (Http, https, discord invites) - Bad words left completely unfiltered
  const linkRegex = /(https?:\/\/[^\s]+)|(discord\.gg\/[^\s]+)|(discord\.com\/invite\/[^\s]+)/gi;
  if (linkRegex.test(message.content)) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      await message.delete().catch(() => {});
      const alert = await message.channel.send(`<@${message.author.id}> Links are restricted here.`);
      setTimeout(() => alert.delete().catch(() => {}), 4000);
      return;
    }
  }

  // XP PROGRESSION ENGINE
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

// --- ANTI-NUKE MONITORING ---
client.on('guildBanAdd', async (ban) => {
  const guild = ban.guild;
  const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd }).catch(() => null);
  if (!auditLogs) return;

  const entry = auditLogs.entries.first();
  if (!entry || !entry.executor || entry.executor.id === client.user.id) return;

  const executorId = entry.executor.id;
  const now = Date.now();
  const userBans = banTracker.get(executorId) || [];
  const recentBans = userBans.filter(t => now - t < 10000);
  recentBans.push(now);
  banTracker.set(executorId, recentBans);

  if (recentBans.length >= 3) {
    const member = await guild.members.fetch(executorId).catch(() => null);
    if (member && member.id !== guild.ownerId) {
      const adminRoles = member.roles.cache.filter(r => 
        r.permissions.has(PermissionFlagsBits.Administrator) || r.permissions.has(PermissionFlagsBits.BanMembers)
      );
      await member.roles.remove(adminRoles, 'Anti-Nuke triggered: Exceeded mass ban rate').catch(() => {});
      
      const systemChannel = guild.systemChannel || guild.channels.cache.find(c => c.isTextBased());
      if (systemChannel) {
        const embed = new EmbedBuilder()
          .setColor(PALETTE.ERROR)
          .setTitle('🚨 ANTI-NUKE SYSTEM ACTIVATED')
          .setDescription(`**Offender:** <@${executorId}>\n**Action:** Administrative roles revoked.\n**Reason:** Mass ban threshold hit (3+ bans under 10s).`);
        systemChannel.send({ embeds: [embed] });
      }
    }
  }
});

// --- BOT STARTUP & GLOBAL REGISTER ---
client.once('ready', async () => {
  console.log(`System connected as ${client.user.tag}`);
  
  client.user.setPresence({ 
    activities: [{ name: 'JOIN https://discord.gg/8SCGSyTwDb', type: ActivityType.Custom }], 
    status: 'dnd' 
  });

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    // Global deployment ensures commands show under "View All Commands" on profile cards
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('Commands successfully synced globally.');
  } catch (err) {
    console.error(err);
  }
});

// --- MAIN INTERACTION ROUTER ---
client.on('interactionCreate', async (i) => {
  if (i.isButton()) {
    const [action, proposerId, partnerId] = i.customId.split('_');
    if (i.user.id !== partnerId) return i.reply({ content: 'This menu is not for you.', ephemeral: true });

    if (action === 'accept') {
      const embed = new EmbedBuilder().setColor(PALETTE.SUCCESS).setDescription(`💍 <@${partnerId}> accepted <@${proposerId}>'s proposal!`);
      await i.update({ embeds: [embed], components: [] });
    } else if (action === 'deny') {
      const embed = new EmbedBuilder().setColor(PALETTE.ERROR).setDescription(`💔 <@${partnerId}> rejected <@${proposerId}>'s proposal.`);
      await i.update({ embeds: [embed], components: [] });
    }
    return;
  }

  if (!i.isChatInputCommand()) return;

  const group = i.commandName;
  const sub = i.options.getSubcommand(false);

  // ---------------- /moderation HANDLERS ----------------
  if (group === 'moderation') {
    if (sub === 'ban') {
      const target = i.options.getMember('target');
      const reason = i.options.getString('reason') || 'No reason provided';
      await target.ban({ reason });
      return i.reply({ content: `Banned \`${target.user.tag}\`. Reason: ${reason}`, ephemeral: true });
    }
    if (sub === 'unban') {
      const userId = i.options.getString('userid');
      await i.guild.members.unban(userId);
      return i.reply({ content: `Unbanned user ID \`${userId}\`.`, ephemeral: true });
    }
    if (sub === 'kick') {
      const target = i.options.getMember('target');
      const reason = i.options.getString('reason') || 'No reason provided';
      await target.kick(reason);
      return i.reply({ content: `Kicked \`${target.user.tag}\`.`, ephemeral: true });
    }
    if (sub === 'mute') {
      const target = i.options.getMember('target');
      const minutes = i.options.getInteger('minutes');
      await target.timeout(minutes * 60000);
      return i.reply({ content: `Timed out <@${target.id}> for **${minutes}m**.`, ephemeral: true });
    }
    if (sub === 'removetimeout') {
      const target = i.options.getMember('target');
      await target.timeout(null);
      return i.reply({ content: `Lifted timeout for <@${target.id}>.`, ephemeral: true });
    }
    if (sub === 'warn') {
      const target = i.options.getUser('target');
      const reason = i.options.getString('reason');
      addWarn(target.id, { reason, date: new Date().toLocaleDateString() });
      const embed = new EmbedBuilder()
        .setColor(PALETTE.ERROR)
        .setDescription(`⚠️ **Warning Issued**\n**User:** <@${target.id}>\n**Reason:** ${reason}`);
      return i.reply({ embeds: [embed] });
    }
    if (sub === 'warnings') {
      const target = i.options.getUser('target');
      const list = getWarns(target.id);
      if (!list.length) return i.reply({ content: 'User has no recorded warnings.', ephemeral: true });
      const formatted = list.map((w, index) => `\`${index + 1}.\` ${w.reason} (${w.date})`).join('\n');
      const embed = new EmbedBuilder().setColor(PALETTE.DARK).setTitle(`Warnings • ${target.username}`).setDescription(formatted);
      return i.reply({ embeds: [embed] });
    }
    if (sub === 'clearwarnings') {
      const target = i.options.getUser('target');
      warnings.delete(target.id);
      return i.reply({ content: `Cleared all warnings for <@${target.id}>.`, ephemeral: true });
    }
    if (sub === 'cleanup') {
      const amount = i.options.getInteger('amount');
      await i.channel.bulkDelete(amount, true);
      return i.reply({ content: `Purged \`${amount}\` messages.`, ephemeral: true });
    }
    if (sub === 'softban') {
      const target = i.options.getMember('target');
      await target.ban({ reason: 'Softban cleanup', deleteMessageSeconds: 86400 });
      await i.guild.members.unban(target.id);
      return i.reply({ content: `Softbanned \`${target.user.tag}\`.`, ephemeral: true });
    }
    if (sub === 'hardmute') {
      const target = i.options.getMember('target');
      await target.timeout(2419200000);
      const roles = target.roles.cache.filter(r => r.name !== '@everyone');
      await target.roles.remove(roles).catch(() => {});
      return i.reply({ content: `Hardmuted <@${target.id}> and stripped roles.`, ephemeral: true });
    }
    if (sub === 'slowmode') {
      const seconds = i.options.getInteger('seconds');
      await i.channel.setRateLimitPerUser(seconds);
      return i.reply({ content: `Set slowmode delay to \`${seconds}s\`.`, ephemeral: true });
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

  // ---------------- /role HANDLERS ----------------
  if (group === 'role') {
    if (sub === 'add') {
      const target = i.options.getMember('target');
      const role = i.options.getRole('role');
      await target.roles.add(role);
      return i.reply({ content: `Granted **${role.name}** to <@${target.id}>.`, ephemeral: true });
    }
    if (sub === 'remove') {
      const target = i.options.getMember('target');
      const role = i.options.getRole('role');
      await target.roles.remove(role);
      return i.reply({ content: `Removed **${role.name}** from <@${target.id}>.`, ephemeral: true });
    }
    if (sub === 'removeall') {
      const target = i.options.getMember('target');
      const roles = target.roles.cache.filter(r => r.name !== '@everyone');
      await target.roles.remove(roles);
      return i.reply({ content: `Stripped all roles from <@${target.id}>.`, ephemeral: true });
    }
    if (sub === 'humans') {
      const role = i.options.getRole('role');
      const members = await i.guild.members.fetch();
      members.filter(m => !m.user.bot).forEach(m => m.roles.add(role).catch(() => {}));
      return i.reply({ content: `Adding **${role.name}** to all human accounts...`, ephemeral: true });
    }
    if (sub === 'removehumans') {
      const role = i.options.getRole('role');
      const members = await i.guild.members.fetch();
      members.filter(m => !m.user.bot).forEach(m => m.roles.remove(role).catch(() => {}));
      return i.reply({ content: `Removing **${role.name}** from all human accounts...`, ephemeral: true });
    }
    if (sub === 'bots') {
      const role = i.options.getRole('role');
      const members = await i.guild.members.fetch();
      members.filter(m => m.user.bot).forEach(m => m.roles.add(role).catch(() => {}));
      return i.reply({ content: `Adding **${role.name}** to all bot accounts...`, ephemeral: true });
    }
    if (sub === 'removebots') {
      const role = i.options.getRole('role');
      const members = await i.guild.members.fetch();
      members.filter(m => m.user.bot).forEach(m => m.roles.remove(role).catch(() => {}));
      return i.reply({ content: `Removing **${role.name}** from all bot accounts...`, ephemeral: true });
    }
    if (sub === 'removein') {
      const source = i.options.getRole('from_role');
      const targetRole = i.options.getRole('target_role');
      const members = await i.guild.members.fetch();
      members.filter(m => m.roles.cache.has(source.id)).forEach(m => m.roles.remove(targetRole).catch(() => {}));
      return i.reply({ content: `Removing **${targetRole.name}** from members in **${source.name}**...`, ephemeral: true });
    }
    if (sub === 'info') {
      const role = i.options.getRole('role');
      const embed = new EmbedBuilder()
        .setColor(role.color || PALETTE.DARK)
        .setTitle(`Role Info • ${role.name}`)
        .addFields(
          { name: 'ID', value: `\`${role.id}\``, inline: true },
          { name: 'Color', value: `\`${role.hexColor}\``, inline: true },
          { name: 'Members', value: `\`${role.members.size}\``, inline: true }
        );
      return i.reply({ embeds: [embed] });
    }
  }

  // ---------------- /security HANDLERS ----------------
  if (group === 'security') {
    if (sub === 'antinuke') {
      const embed = new EmbedBuilder()
        .setColor(PALETTE.DARK)
        .setTitle('🛡️ Anti-Nuke Security Engine')
        .setDescription('**Status:** `ACTIVE`\n**Ban Threshold:** `3 bans per 10s`\n**Penalty:** Automatic administrative role neutralization.');
      return i.reply({ embeds: [embed] });
    }
    if (sub === 'lockdown') {
      i.guild.channels.cache.forEach(c => {
        if (c.isTextBased()) c.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: false }).catch(() => {});
      });
      return i.reply({ content: '🚨 **Server Lockdown Executed.** All public text channels locked.' });
    }
    if (sub === 'unlockall') {
      i.guild.channels.cache.forEach(c => {
        if (c.isTextBased()) c.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: null }).catch(() => {});
      });
      return i.reply({ content: '🔓 **Server Lockdown Lifted.** Public channels restored.' });
    }
  }

  // ---------------- /utility HANDLERS ----------------
  if (group === 'utility') {
    if (sub === 'ping') {
      return i.reply({ embeds: [new EmbedBuilder().setColor(PALETTE.DARK).setDescription(`📡 **Websocket Latency:** \`${i.client.ws.ping}ms\``)], ephemeral: true });
    }
    if (sub === 'botinfo') {
      const embed = new EmbedBuilder()
        .setColor(PALETTE.DARK)
        .setTitle('System Telemetry')
        .addFields(
          { name: 'Uptime', value: `\`${Math.floor(i.client.uptime / 60000)} mins\``, inline: true },
          { name: 'Latency', value: `\`${i.client.ws.ping}ms\``, inline: true },
          { name: 'Servers', value: `\`${i.client.guilds.cache.size}\``, inline: true }
        );
      return i.reply({ embeds: [embed] });
    }
    if (sub === 'userinfo') {
      const target = i.options.getUser('target') || i.user;
      const embed = new EmbedBuilder()
        .setColor(PALETTE.DARK)
        .setThumbnail(target.displayAvatarURL())
        .setTitle(`Profile Telemetry • ${target.username}`)
        .addFields(
          { name: 'User ID', value: `\`${target.id}\``, inline: true },
          { name: 'Registered', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, inline: true }
        );
      return i.reply({ embeds: [embed] });
    }
    if (sub === 'serverinfo') {
      const embed = new EmbedBuilder()
        .setColor(PALETTE.DARK)
        .setThumbnail(i.guild.iconURL())
        .setTitle(`${i.guild.name}`)
        .addFields(
          { name: 'Owner', value: `<@${i.guild.ownerId}>`, inline: true },
          { name: 'Members', value: `\`${i.guild.memberCount}\``, inline: true }
        );
      return i.reply({ embeds: [embed] });
    }
    if (sub === 'avatar') {
      const target = i.options.getUser('target') || i.user;
      return i.reply({ embeds: [new EmbedBuilder().setColor(PALETTE.DARK).setTitle(`${target.username}'s Avatar`).setImage(target.displayAvatarURL({ size: 1024 }))] });
    }
    if (sub === 'banner') {
      const target = await i.client.users.fetch((i.options.getUser('target') || i.user).id, { force: true });
      if (!target.banner) return i.reply({ content: 'User has no custom banner.', ephemeral: true });
      return i.reply({ embeds: [new EmbedBuilder().setColor(PALETTE.DARK).setTitle(`${target.username}'s Banner`).setImage(target.bannerURL({ size: 1024 }))] });
    }
    if (sub === 'embed') {
      const title = i.options.getString('title');
      const text = i.options.getString('text');
      return i.reply({ embeds: [new EmbedBuilder().setColor(PALETTE.DARK).setTitle(title).setDescription(text)] });
    }
    if (sub === 'poll') {
      const question = i.options.getString('question');
      const msg = await i.reply({ embeds: [new EmbedBuilder().setColor(PALETTE.DARK).setTitle('📊 Community Poll').setDescription(question)], fetchReply: true });
      await msg.react('👍');
      await msg.react('👎');
      return;
    }
    if (sub === 'say') {
      await i.channel.send(i.options.getString('message'));
      return i.reply({ content: 'Message delivered.', ephemeral: true });
    }
  }

  // ---------------- /economy HANDLERS ----------------
  if (group === 'economy') {
    if (sub === 'balance') {
      const target = i.options.getUser('target') || i.user;
      const eco = getEco(target.id);
      const embed = new EmbedBuilder()
        .setColor(PALETTE.DARK)
        .setTitle(`Vault Balance • ${target.username}`)
        .addFields(
          { name: '💵 Wallet', value: `\`$${eco.wallet}\``, inline: true },
          { name: '🏦 Bank', value: `\`$${eco.bank}\``, inline: true }
        );
      return i.reply({ embeds: [embed] });
    }
    if (sub === 'daily') {
      const eco = getEco(i.user.id);
      if (Date.now() - eco.lastDaily < 86400000) return i.reply({ content: '⏳ Claim again tomorrow.', ephemeral: true });
      eco.wallet += 2500;
      eco.lastDaily = Date.now();
      setEco(i.user.id, eco);
      return i.reply({ embeds: [new EmbedBuilder().setColor(PALETTE.SUCCESS).setDescription('💵 Claimed **$2,500** daily cash.')] });
    }
    if (sub === 'work') {
      const eco = getEco(i.user.id);
      if (Date.now() - eco.lastWork < 3600000) return i.reply({ content: '⏳ Shift available in 1 hour.', ephemeral: true });
      const earned = Math.floor(Math.random() * 500) + 200;
      eco.wallet += earned;
      eco.lastWork = Date.now();
      setEco(i.user.id, eco);
      return i.reply({ embeds: [new EmbedBuilder().setColor(PALETTE.SUCCESS).setDescription(`💼 Earned **$${earned}** from work shift.`)] });
    }
    if (sub === 'deposit') {
      const amt = i.options.getInteger('amount');
      const eco = getEco(i.user.id);
      if (eco.wallet < amt) return i.reply({ content: '❌ Insufficient wallet cash.', ephemeral: true });
      eco.wallet -= amt; eco.bank += amt; setEco(i.user.id, eco);
      return i.reply({ content: `🏦 Deposited **$${amt}** into bank vault.`, ephemeral: true });
    }
    if (sub === 'withdraw') {
      const amt = i.options.getInteger('amount');
      const eco = getEco(i.user.id);
      if (eco.bank < amt) return i.reply({ content: '❌ Insufficient bank funds.', ephemeral: true });
      eco.bank -= amt; eco.wallet += amt; setEco(i.user.id, eco);
      return i.reply({ content: `💵 Withdrew **$${amt}** from bank vault.`, ephemeral: true });
    }
    if (sub === 'pay') {
      const target = i.options.getUser('target');
      const amt = i.options.getInteger('amount');
      const senderEco = getEco(i.user.id);
      if (senderEco.wallet < amt) return i.reply({ content: '❌ Insufficient wallet funds.', ephemeral: true });
      const receiverEco = getEco(target.id);
      senderEco.wallet -= amt; receiverEco.wallet += amt;
      setEco(i.user.id, senderEco); setEco(target.id, receiverEco);
      return i.reply({ content: `💸 Transferred **$${amt}** cash to <@${target.id}>.` });
    }
    if (sub === 'slots') {
      const bet = i.options.getInteger('bet');
      const eco = getEco(i.user.id);
      if (eco.wallet < bet) return i.reply({ content: '❌ Insufficient cash.', ephemeral: true });
      const items = ['🎰', '🍒', '🍋', '💎'];
      const [s1, s2, s3] = [items[Math.floor(Math.random()*4)], items[Math.floor(Math.random()*4)], items[Math.floor(Math.random()*4)]];
      if (s1 === s2 && s2 === s3) {
        eco.wallet += bet * 3; setEco(i.user.id, eco);
        return i.reply(`[ ${s1} ${s2} ${s3} ] 🎉 Jackpot! +$${bet * 3}`);
      } else {
        eco.wallet -= bet; setEco(i.user.id, eco);
        return i.reply(`[ ${s1} ${s2} ${s3} ] 💔 Lost -$${bet}`);
      }
    }
    if (sub === 'blackjack') {
      const bet = i.options.getInteger('bet');
      const eco = getEco(i.user.id);
      if (eco.wallet < bet) return i.reply({ content: '❌ Insufficient cash.', ephemeral: true });
      const p = Math.floor(Math.random()*10)+12, d = Math.floor(Math.random()*10)+12;
      if (p > d || d > 21) {
        eco.wallet += bet; setEco(i.user.id, eco);
        return i.reply(`🃏 **Win!** Score: \`${p}\` vs Dealer: \`${d}\` (+$${bet})`);
      } else {
        eco.wallet -= bet; setEco(i.user.id, eco);
        return i.reply(`🃏 **Lost!** Score: \`${p}\` vs Dealer: \`${d}\` (-$${bet})`);
      }
    }
  }

  // ---------------- /fun HANDLERS ----------------
  if (group === 'fun') {
    if (sub === 'ship') {
      const t1 = i.options.getUser('user1'), t2 = i.options.getUser('user2') || i.user;
      const score = Number((BigInt(t1.id) + BigInt(t2.id)) % 101n);
      return i.reply({ embeds: [new EmbedBuilder().setColor(PALETTE.DARK).setTitle(`${t1.username} x ${t2.username}`).setDescription(`Compatibility: \`${score}%\``)] });
    }
    if (sub === 'coinflip') {
      return i.reply(`🪙 Coin result: **${Math.random() < 0.5 ? 'Heads' : 'Tails'}**`);
    }
    if (sub === 'dice') {
      const sides = i.options.getInteger('sides') || 6;
      return i.reply(`🎲 Rolled a **${Math.floor(Math.random() * sides) + 1}** (1-${sides})`);
    }
    if (sub === '8ball') {
      const answers = ['Yes.', 'No.', 'Ask again later.', 'Definitely.', 'Outlook poor.'];
      const pick = answers[Math.floor(Math.random() * answers.length)];
      return i.reply(`🔮 **Question:** ${i.options.getString('question')}\n**Answer:** ${pick}`);
    }
    if (sub === 'pp') {
      const t = i.options.getUser('target') || i.user;
      const len = Number((BigInt(t.id) % 12n) + 1n);
      return i.reply(`**${t.username}'s Size:**\n\`8${'='.repeat(len)}D\``);
    }
    if (sub === 'marry') {
      const partner = i.options.getUser('partner');
      if (partner.id === i.user.id) return i.reply({ content: 'Invalid target.', ephemeral: true });
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`accept_${i.user.id}_${partner.id}`).setLabel('Accept').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`deny_${i.user.id}_${partner.id}`).setLabel('Reject').setStyle(ButtonStyle.Danger)
      );
      return i.reply({ content: `<@${partner.id}>`, embeds: [new EmbedBuilder().setColor(PALETTE.DARK).setDescription(`💍 <@${partner.id}>, **${i.user.username}** proposed to you!`)], components: [row] });
    }
    if (sub === 'meme') {
      return i.reply({ embeds: [new EmbedBuilder().setColor(PALETTE.DARK).setTitle('Random Meme Card').setImage('https://picsum.photos/400/300')] });
    }
  }

  // ---------------- /leveling HANDLERS ----------------
  if (group === 'leveling') {
    if (sub === 'rank') {
      const target = i.options.getUser('target') || i.user;
      const xpData = getXp(target.id);
      const embed = new EmbedBuilder()
        .setColor(PALETTE.DARK)
        .setTitle(`Rank Card • ${target.username}`)
        .addFields(
          { name: 'Level', value: `\`${xpData.level}\``, inline: true },
          { name: 'XP', value: `\`${xpData.xp} / ${xpData.level * 100}\``, inline: true }
        );
      return i.reply({ embeds: [embed] });
    }
    if (sub === 'leaderboard') {
      const sorted = Array.from(leveling.entries()).sort((a,b) => b[1].level - a[1].level).slice(0, 5);
      const desc = sorted.map(([id, d], index) => `**${index+1}.** <@${id}> • Level \`${d.level}\``).join('\n') || 'No data.';
      return i.reply({ embeds: [new EmbedBuilder().setColor(PALETTE.DARK).setTitle('🏆 XP Leaderboard').setDescription(desc)] });
    }
  }

  // ---------------- /bump HANDLER ----------------
  if (group === 'bump') {
    return i.reply({ embeds: [new EmbedBuilder().setColor(PALETTE.SUCCESS).setTitle('Bumped!').setDescription('Server bump recorded.')] });
  }
});

// START BOT LOGINS
client.login(process.env.DISCORD_TOKEN);








