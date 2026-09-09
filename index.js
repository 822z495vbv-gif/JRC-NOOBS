const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers, // Required for autorole & kick/ban
  ],
});

// SETTINGS (Carl-Bot Style Defaults)
const PREFIX = '!'; 
const AUTO_ROLE_NAME = 'Member'; // Name of the role to automatically give new members

client.once('ready', () => {
  console.log(`Carl-style bot is online as ${client.user.tag}!`);
});

// 1. AUTOROLE: Automatically give new members a role when they join
client.on('guildMemberAdd', async (member) => {
  const role = member.guild.roles.cache.find(r => r.name === AUTO_ROLE_NAME);
  if (role) {
    await member.roles.add(role).catch(console.error);
    console.log(`Gave ${AUTO_ROLE_NAME} role to ${member.user.tag}`);
  }
});

// 2. COMMANDS
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // COMMAND: !ping
  if (command === 'ping') {
    return message.reply('🏓 Pong!');
  }

  // COMMAND: !embed <text> (Carl-bot styled fancy announcement box)
  if (command === 'embed') {
    const text = args.join(' ');
    if (!text) return message.reply('Please provide text for the embed!');

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('📢 Announcement')
      .setDescription(text)
      .setFooter({ text: `Sent by ${message.author.username}` })
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
    return message.delete(); // Deletes original command message
  }

  // COMMAND: !clear <number> (Deletes messages in bulk)
  if (command === 'clear' || command === 'purge') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply('❌ You need the **Manage Messages** permission to do that!');
    }
    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount < 1 || amount > 100) {
      return message.reply('Please provide a number between 1 and 100.');
    }
    await message.channel.bulkDelete(amount, true);
    const msg = await message.channel.send(`🧹 Deleted **${amount}** messages.`);
    setTimeout(() => msg.delete(), 3000); // Auto-delete warning after 3 seconds
  }

  // COMMAND: !kick @user <reason>
  if (command === 'kick') {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
      return message.reply('❌ You do not have permission to kick members.');
    }
    const member = message.mentions.members.first();
    if (!member) return message.reply('Please mention a valid member to kick.');
    if (!member.kickable) return message.reply('I cannot kick this user!');

    const reason = args.slice(1).join(' ') || 'No reason provided';
    await member.kick(reason);
    return message.channel.send(`👞 **${member.user.tag}** was kicked. Reason: ${reason}`);
  }

  // COMMAND: !ban @user <reason>
  if (command === 'ban') {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.reply('❌ You do not have permission to ban members.');
    }
    const member = message.mentions.members.first();
    if (!member) return message.reply('Please mention a valid member to ban.');

    const reason = args.slice(1).join(' ') || 'No reason provided';
    await member.ban({ reason });
    return message.channel.send(`🔨 **${member.user.tag}** was banned. Reason: ${reason}`);
  }
});

client.login(process.env.DISCORD_TOKEN);

