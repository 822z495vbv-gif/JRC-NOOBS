require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  SlashCommandBuilder,
  REST,
  Routes,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  AuditLogEvent,
  MessageFlags
} = require("discord.js");

const fs = require("fs");
const path = require("path");

/* =========================================================
   JRC BOT
   Single-file Discord bot
   ========================================================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

const CONFIG_FILE = path.join(__dirname, "config.json");

/* =========================================================
   CONFIG
   ========================================================= */

function loadConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify({}, null, 2));
    }

    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  } catch {
    return {};
  }
}

const config = loadConfig();

function saveConfig() {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function guildConfig(guildId) {
  if (!config[guildId]) {
    config[guildId] = {
      welcome: {
        enabled: false,
        channel: null,
        title: "👋 Welcome to {server}!",
        description: `Welcome to {server}, {user}! 🎉

We're glad to have you here. Before you start chatting, hanging out, or participating in the community, please take a moment to read and understand our server rules and Discord's Terms of Service.

📖 SERVER RULES

• Treat everyone with respect. Harassment, bullying, discrimination, and unnecessary drama are not tolerated.

• Keep conversations appropriate and avoid disturbing, offensive, or excessively inappropriate content.

• Do not spam messages, mentions, emojis, images, or commands.

• Do not intentionally disrupt channels, voice chats, events, or other community activities.

• Do not advertise or promote unrelated servers, services, websites, or social media without permission.

• Do not share personal information about yourself or other people. Respect everyone's privacy.

• Do not impersonate staff, moderators, bots, or other members.

• Do not attempt to exploit, abuse, or interfere with Discord, the server, its bots, or its systems.

• Use the correct channels for their intended purposes and follow any additional channel-specific rules.

• Listen to moderators and staff when they are handling a situation. If you disagree with a moderation decision, discuss it respectfully through the proper channels.

📜 DISCORD TERMS & GUIDELINES

By participating in this server, you are also expected to follow Discord's Terms of Service and Community Guidelines.

Make sure you understand Discord's rules regarding prohibited content, harassment, spam, scams, illegal activities, privacy, and other forms of platform abuse.

⚠️ IMPORTANT

Being new to the server does not exempt anyone from the rules. Claiming that you didn't read the rules does not excuse rule violations.

Rules may be updated when necessary, so check the official rules channel from time to time.

If you're unsure whether something is allowed, ask a moderator before doing it.

🔒 YOUR PRIVACY

Never share passwords, authentication codes, private addresses, financial information, or other sensitive personal information with other members.

🆘 NEED HELP?

If you have a question, notice a problem, or need assistance, contact a moderator or staff member through the appropriate support channel.

Most importantly, have fun, meet new people, and help keep {server} a welcoming and enjoyable community for everyone.

Enjoy your stay, {user}! 💙`,
        message: `🎉 Welcome to {server}, {user}!

Before you get started, please read the server rules and make sure you understand Discord's Terms of Service and Community Guidelines.

Respect others, protect your privacy, don't spam, don't advertise without permission, and follow staff instructions.

Have fun, stay safe, and enjoy your time here! 💙`,
        color: "#5865F2",
        image: null,
        footer: "JRC Bot • Welcome",
        timestamp: true,
        thumbnail: true
      },

      goodbye: {
        enabled: false,
        channel: null,
        title: "👋 Goodbye from {server}",
        description: "We're sorry to see you go, {user}. Thanks for being part of {server}.",
        message: "👋 {user} has left {server}. We wish you the best!",
        color: "#ED4245",
        image: null,
        footer: "JRC Bot • Goodbye",
        timestamp: true,
        thumbnail: true
      },

      warnings: {},

      automod: {
        enabled: false,
        words: [],
        spam: {
          enabled: false,
          limit: 6,
          interval: 5000
        },
        links: false
      },

      logs: {
        enabled: false,
        channel: null
      },

      reactionRoles: [],

      antinuke: {
        enabled: false,
        threshold: 5,
        interval: 10000
      },

      raid: {
        enabled: false,
        threshold: 8,
        interval: 10000,
        action: "kick",
        activeUntil: 0
      }
    };

    saveConfig();
  }

  return config[guildId];
}

/* =========================================================
   HELPERS
   ========================================================= */

function replaceVariables(text, member) {
  if (!text) return "";

  return text
    .replaceAll("{user}", member?.user ? `<@${member.user.id}>` : "")
    .replaceAll("{username}", member?.user?.username || "")
    .replaceAll("{server}", member?.guild?.name || "");
}

function validColor(color) {
  return /^#?[0-9A-F]{6}$/i.test(color || "");
}

function validImage(url) {
  if (!url) return false;

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function buildGreetingEmbed(type, member, settings) {
  const embed = new EmbedBuilder()
    .setColor(settings.color || "#5865F2")
    .setTitle(replaceVariables(settings.title, member))
    .setDescription(replaceVariables(settings.description, member))
    .addFields({
      name: type === "welcome" ? "💬 Greeting" : "💬 Message",
      value: replaceVariables(settings.message, member).slice(0, 1024)
    });

  if (settings.thumbnail && member?.user?.displayAvatarURL) {
    embed.setThumbnail(
      member.user.displayAvatarURL({
        extension: "png",
        size: 256
      })
    );
  }

  if (settings.image && validImage(settings.image)) {
    embed.setImage(settings.image);
  }

  if (settings.footer) {
    embed.setFooter({
      text: replaceVariables(settings.footer, member)
    });
  }

  if (settings.timestamp) {
    embed.setTimestamp();
  }

  return embed;
}

function greetingPanel(type, guild) {
  const settings = guildConfig(guild.id)[type];

  const embed = new EmbedBuilder()
    .setColor(settings.color || "#5865F2")
    .setTitle(
      type === "welcome"
        ? "👋 Welcome System"
        : "👋 Goodbye System"
    )
    .setDescription(
      `Configure the **${type}** system for **${guild.name}**.\n\n` +
      `**Status:** ${settings.enabled ? "🟢 Enabled" : "🔴 Disabled"}\n` +
      `**Channel:** ${
        settings.channel ? `<#${settings.channel}>` : "Not configured"
      }\n\n` +
      `Use the buttons below to configure your embed, channel, preview, and status.`
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`jrc_config_${type}`)
      .setLabel("Configure")
      .setEmoji("⚙️")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId(`jrc_channel_${type}`)
      .setLabel("Channel")
      .setEmoji("📢")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId(`jrc_preview_${type}`)
      .setLabel("Preview")
      .setEmoji("👁️")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId(`jrc_enable_${type}`)
      .setLabel("Enable")
      .setEmoji("🟢")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId(`jrc_disable_${type}`)
      .setLabel("Disable")
      .setEmoji("🔴")
      .setStyle(ButtonStyle.Danger)
  );

  return {
    embeds: [embed],
    components: [row],
    flags: MessageFlags.Ephemeral
  };
}

async function safeReply(interaction, data) {
  try {
    if (interaction.replied || interaction.deferred) {
      return interaction.followUp(data);
    }

    return interaction.reply(data);
  } catch {}
}

async function logAction(guild, title, description, color = "#5865F2") {
  const cfg = guildConfig(guild.id);

  if (!cfg.logs.enabled || !cfg.logs.channel) return;

  const channel = guild.channels.cache.get(cfg.logs.channel);

  if (!channel || !channel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();

  try {
    await channel.send({ embeds: [embed] });
  } catch {}
}

/* =========================================================
   COMMAND DEFINITIONS
   ========================================================= */

const commands = [];

/* JRC */

commands.push(
  new SlashCommandBuilder()
    .setName("jrc")
    .setDescription("JRC Bot control center")
    .addSubcommand(s =>
      s.setName("help").setDescription("Show JRC Bot commands")
    )
    .addSubcommand(s =>
      s.setName("settings").setDescription("Show server settings")
    )
    .addSubcommand(s =>
      s.setName("about").setDescription("About JRC Bot")
    )
    .addSubcommand(s =>
      s.setName("status").setDescription("Show bot status")
    )
    .toJSON()
);

/* WELCOME */

commands.push(
  new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("Configure the welcome system")
    .addSubcommand(s =>
      s.setName("setup").setDescription("Open the welcome dashboard")
    )
    .addSubcommand(s =>
      s.setName("disable").setDescription("Disable welcome messages")
    )
    .addSubcommand(s =>
      s.setName("test").setDescription("Test the welcome message")
    )
    .addSubcommand(s =>
      s.setName("message").setDescription("Show current welcome message")
    )
    .addSubcommand(s =>
      s
        .setName("channel")
        .setDescription("Set the welcome channel")
        .addChannelOption(o =>
          o
            .setName("channel")
            .setDescription("Welcome channel")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("preview").setDescription("Preview the welcome embed")
    )
    .toJSON()
);

/* GOODBYE */

commands.push(
  new SlashCommandBuilder()
    .setName("goodbye")
    .setDescription("Configure the goodbye system")
    .addSubcommand(s =>
      s.setName("setup").setDescription("Open the goodbye dashboard")
    )
    .addSubcommand(s =>
      s.setName("disable").setDescription("Disable goodbye messages")
    )
    .addSubcommand(s =>
      s.setName("test").setDescription("Test the goodbye message")
    )
    .addSubcommand(s =>
      s.setName("message").setDescription("Show current goodbye message")
    )
    .addSubcommand(s =>
      s
        .setName("channel")
        .setDescription("Set the goodbye channel")
        .addChannelOption(o =>
          o
            .setName("channel")
            .setDescription("Goodbye channel")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("preview").setDescription("Preview the goodbye embed")
    )
    .toJSON()
);

/* MOD */

commands.push(
  new SlashCommandBuilder()
    .setName("mod")
    .setDescription("Moderation commands")
    .addSubcommand(s =>
      s
        .setName("ban")
        .setDescription("Ban a member")
        .addUserOption(o =>
          o.setName("user").setDescription("User").setRequired(true)
        )
        .addStringOption(o =>
          o.setName("reason").setDescription("Reason")
        )
    )
    .addSubcommand(s =>
      s
        .setName("kick")
        .setDescription("Kick a member")
        .addUserOption(o =>
          o.setName("user").setDescription("User").setRequired(true)
        )
        .addStringOption(o =>
          o.setName("reason").setDescription("Reason")
        )
    )
    .addSubcommand(s =>
      s
        .setName("timeout")
        .setDescription("Timeout a member")
        .addUserOption(o =>
          o.setName("user").setDescription("User").setRequired(true)
        )
        .addIntegerOption(o =>
          o
            .setName("minutes")
            .setDescription("Timeout duration")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(40320)
        )
        .addStringOption(o =>
          o.setName("reason").setDescription("Reason")
        )
    )
    .addSubcommand(s =>
      s
        .setName("warn")
        .setDescription("Warn a member")
        .addUserOption(o =>
          o.setName("user").setDescription("User").setRequired(true)
        )
        .addStringOption(o =>
          o.setName("reason").setDescription("Reason").setRequired(true)
        )
    )
    .addSubcommand(s =>
      s
        .setName("warnings")
        .setDescription("View member warnings")
        .addUserOption(o =>
          o.setName("user").setDescription("User").setRequired(true)
        )
    )
    .addSubcommand(s =>
      s
        .setName("clear")
        .setDescription("Delete messages")
        .addIntegerOption(o =>
          o
            .setName("amount")
            .setDescription("Amount")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(100)
        )
    )
    .addSubcommand(s =>
      s.setName("lock").setDescription("Lock this channel")
    )
    .addSubcommand(s =>
      s.setName("unlock").setDescription("Unlock this channel")
    )
    .toJSON()
);

/* AUTOMOD */

commands.push(
  new SlashCommandBuilder()
    .setName("automod")
    .setDescription("Configure automod")
    .addSubcommand(s =>
      s.setName("setup").setDescription("Show automod configuration")
    )
    .addSubcommand(s =>
      s.setName("enable").setDescription("Enable automod")
    )
    .addSubcommand(s =>
      s.setName("disable").setDescription("Disable automod")
    )
    .addSubcommand(s =>
      s
        .setName("words")
        .setDescription("Add a blocked word")
        .addStringOption(o =>
          o.setName("word").setDescription("Word").setRequired(true)
        )
    )
    .addSubcommand(s =>
      s
        .setName("spam")
        .setDescription("Configure spam protection")
        .addBooleanOption(o =>
          o.setName("enabled").setDescription("Enable spam protection").setRequired(true)
        )
        .addIntegerOption(o =>
          o.setName("limit").setDescription("Message limit").setMinValue(2).setMaxValue(50)
        )
    )
    .addSubcommand(s =>
      s
        .setName("links")
        .setDescription("Toggle link filtering")
        .addBooleanOption(o =>
          o.setName("enabled").setDescription("Enable link filtering").setRequired(true)
        )
    )
    .toJSON()
);

/* REACTION ROLE */

commands.push(
  new SlashCommandBuilder()
    .setName("reactionrole")
    .setDescription("Reaction role management")
    .addSubcommand(s =>
      s
        .setName("create")
        .setDescription("Create a reaction role")
        .addRoleOption(o =>
          o.setName("role").setDescription("Role").setRequired(true)
        )
        .addStringOption(o =>
          o.setName("emoji").setDescription("Emoji").setRequired(true)
        )
        .addStringOption(o =>
          o.setName("text").setDescription("Message text").setRequired(true)
        )
    )
    .addSubcommand(s =>
      s
        .setName("add")
        .setDescription("Add reaction role")
        .addStringOption(o =>
          o.setName("message").setDescription("Message ID").setRequired(true)
        )
        .addStringOption(o =>
          o.setName("emoji").setDescription("Emoji").setRequired(true)
        )
        .addRoleOption(o =>
          o.setName("role").setDescription("Role").setRequired(true)
        )
    )
    .addSubcommand(s =>
      s
        .setName("remove")
        .setDescription("Remove reaction role")
        .addStringOption(o =>
          o.setName("message").setDescription("Message ID").setRequired(true)
        )
        .addStringOption(o =>
          o.setName("emoji").setDescription("Emoji").setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("list").setDescription("List reaction roles")
    )
    .toJSON()
);

/* LOGS */

commands.push(
  new SlashCommandBuilder()
    .setName("logs")
    .setDescription("Server logging")
    .addSubcommand(s =>
      s
        .setName("setup")
        .setDescription("Set log channel")
        .addChannelOption(o =>
          o
            .setName("channel")
            .setDescription("Log channel")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("disable").setDescription("Disable logs")
    )
    .addSubcommand(s =>
      s.setName("test").setDescription("Test logs")
    )
    .toJSON()
);

/* UTILITY */

commands.push(
  new SlashCommandBuilder()
    .setName("utility")
    .setDescription("Utility commands")
    .addSubcommand(s =>
      s
        .setName("userinfo")
        .setDescription("View user information")
        .addUserOption(o =>
          o.setName("user").setDescription("User").setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("serverinfo").setDescription("View server information")
    )
    .addSubcommand(s =>
      s
        .setName("avatar")
        .setDescription("View an avatar")
        .addUserOption(o =>
          o.setName("user").setDescription("User").setRequired(false)
        )
    )
    .addSubcommand(s =>
      s
        .setName("roleinfo")
        .setDescription("View role information")
        .addRoleOption(o =>
          o.setName("role").setDescription("Role").setRequired(true)
        )
    )
    .addSubcommand(s =>
      s
        .setName("channelinfo")
        .setDescription("View channel information")
        .addChannelOption(o =>
          o.setName("channel").setDescription("Channel").setRequired(true)
        )
    )
    .toJSON()
);

/* FUN */

commands.push(
  new SlashCommandBuilder()
    .setName("fun")
    .setDescription("Fun commands")
    .addSubcommand(s =>
      s
        .setName("8ball")
        .setDescription("Ask the magic 8ball")
        .addStringOption(o =>
          o.setName("question").setDescription("Question").setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("coinflip").setDescription("Flip a coin")
    )
    .addSubcommand(s =>
      s.setName("dice").setDescription("Roll a dice")
    )
    .addSubcommand(s =>
      s
        .setName("choose")
        .setDescription("Choose between options")
        .addStringOption(o =>
          o.setName("options").setDescription("Separate with commas").setRequired(true)
        )
    )
    .addSubcommand(s =>
      s
        .setName("poll")
        .setDescription("Create a poll")
        .addStringOption(o =>
          o.setName("question").setDescription("Question").setRequired(true)
        )
    )
    .toJSON()
);

/* ANTINUKE */

commands.push(
  new SlashCommandBuilder()
    .setName("antinuke")
    .setDescription("Anti-nuke protection")
    .addSubcommand(s =>
      s.setName("setup").setDescription("Configure anti-nuke")
    )
    .addSubcommand(s =>
      s.setName("enable").setDescription("Enable anti-nuke")
    )
    .addSubcommand(s =>
      s.setName("disable").setDescription("Disable anti-nuke")
    )
    .addSubcommand(s =>
      s.setName("config").setDescription("Show anti-nuke config")
    )
    .addSubcommand(s =>
      s.setName("status").setDescription("Show anti-nuke status")
    )
    .toJSON()
);

/* RAID */

commands.push(
  new SlashCommandBuilder()
    .setName("raid")
    .setDescription("Raid protection")
    .addSubcommand(s =>
      s.setName("setup").setDescription("Configure raid protection")
    )
    .addSubcommand(s =>
      s.setName("enable").setDescription("Enable raid protection")
    )
    .addSubcommand(s =>
      s.setName("disable").setDescription("Disable raid protection")
    )
    .addSubcommand(s =>
      s.setName("config").setDescription("Show raid configuration")
    )
    .addSubcommand(s =>
      s.setName("status").setDescription("Show raid status")
    )
    .toJSON()
);

/* =========================================================
   JRC HANDLER
   ========================================================= */

async function handleJRC(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === "help") {
    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("🤖 JRC Bot Help")
      .setDescription(
        [
          "**Core**",
          "`/jrc help` `/jrc settings` `/jrc about` `/jrc status`",
          "",
          "**Server Systems**",
          "`/welcome` `/goodbye` `/logs` `/automod`",
          "`/reactionrole` `/antinuke` `/raid`",
          "",
          "**Moderation**",
          "`/mod ban` `/mod kick` `/mod timeout`",
          "`/mod warn` `/mod warnings` `/mod clear`",
          "`/mod lock` `/mod unlock`",
          "",
          "**Utility**",
          "`/utility userinfo` `/utility serverinfo`",
          "`/utility avatar` `/utility roleinfo` `/utility channelinfo`",
          "",
          "**Fun**",
          "`/fun 8ball` `/fun coinflip` `/fun dice`",
          "`/fun choose` `/fun poll`"
        ].join("\n")
      )
      .setFooter({ text: "JRC Bot • All-in-one server management" })
      .setTimestamp();

    return interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "about") {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#5865F2")
          .setTitle("🤖 JRC Bot")
          .setDescription(
            "A powerful all-in-one Discord server management bot.\n\n" +
            "Built for moderation, automation, protection, utility, and community management."
          )
          .addFields(
            { name: "⚡ Version", value: "JRC 1.0", inline: true },
            { name: "🛠️ Platform", value: "Discord.js", inline: true },
            { name: "🔧 Mode", value: "24/7 Ready", inline: true }
          )
          .setTimestamp()
      ]
    });
  }

  if (sub === "status") {
    const cfg = guildConfig(interaction.guild.id);

    const embed = new EmbedBuilder()
      .setColor("#57F287")
      .setTitle("📊 JRC Bot Status")
      .addFields(
        {
          name: "Bot",
          value: "🟢 Online",
          inline: true
        },
        {
          name: "Ping",
          value: `${client.ws.ping}ms`,
          inline: true
        },
        {
          name: "Welcome",
          value: cfg.welcome.enabled ? "🟢" : "🔴",
          inline: true
        },
        {
          name: "Goodbye",
          value: cfg.goodbye.enabled ? "🟢" : "🔴",
          inline: true
        },
        {
          name: "Automod",
          value: cfg.automod.enabled ? "🟢" : "🔴",
          inline: true
        },
        {
          name: "Logs",
          value: cfg.logs.enabled ? "🟢" : "🔴",
          inline: true
        }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  if (sub === "settings") {
    const cfg = guildConfig(interaction.guild.id);

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#5865F2")
          .setTitle("⚙️ JRC Settings")
          .addFields(
            {
              name: "👋 Welcome",
              value: cfg.welcome.enabled
                ? `🟢 <#${cfg.welcome.channel || "?"}>`
                : "🔴 Disabled"
            },
            {
              name: "👋 Goodbye",
              value: cfg.goodbye.enabled
                ? `🟢 <#${cfg.goodbye.channel || "?"}>`
                : "🔴 Disabled"
            },
            {
              name: "🛡️ Automod",
              value: cfg.automod.enabled ? "🟢 Enabled" : "🔴 Disabled"
            },
            {
              name: "📜 Logs",
              value: cfg.logs.enabled ? "🟢 Enabled" : "🔴 Disabled"
            },
            {
              name: "🛡️ Anti-Nuke",
              value: cfg.antinuke.enabled ? "🟢 Enabled" : "🔴 Disabled"
            },
            {
              name: "🚨 Raid Protection",
              value: cfg.raid.enabled ? "🟢 Enabled" : "🔴 Disabled"
            }
          )
      ],
      flags: MessageFlags.Ephemeral
    });
  }
}

/* =========================================================
   WELCOME / GOODBYE COMMANDS
   ========================================================= */

async function handleGreetingCommand(interaction, type) {
  const sub = interaction.options.getSubcommand();
  const cfg = guildConfig(interaction.guild.id)[type];

  if (sub === "setup") {
    return interaction.reply(greetingPanel(type, interaction.guild));
  }

  if (sub === "disable") {
    cfg.enabled = false;
    saveConfig();

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#ED4245")
          .setTitle(`🔴 ${type} disabled`)
          .setDescription(`The **${type}** system has been disabled.`)
      ],
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "channel") {
    const channel = interaction.options.getChannel("channel");

    cfg.channel = channel.id;
    saveConfig();

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#57F287")
          .setTitle("📢 Channel Updated")
          .setDescription(
            `The ${type} channel is now ${channel}.`
          )
      ],
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "message") {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(cfg.color)
          .setTitle(`💬 ${type} Message`)
          .setDescription(
            `**Title**\n${cfg.title}\n\n` +
            `**Description**\n${cfg.description}\n\n` +
            `**Greeting**\n${cfg.message}`
          )
      ],
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "preview" || sub === "test") {
    const fakeMember = interaction.member;

    const embed = buildGreetingEmbed(
      type,
      fakeMember,
      cfg
    );

    return interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral
    });
  }
}

/* =========================================================
   MODERATION
   ========================================================= */

async function handleMod(interaction) {
  const sub = interaction.options.getSubcommand();

  if (
    !interaction.member.permissions.has(
      PermissionFlagsBits.ModerateMembers
    ) &&
    !interaction.member.permissions.has(
      PermissionFlagsBits.Administrator
    )
  ) {
    return interaction.reply({
      content: "❌ You don't have permission to use this command.",
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "ban") {
    const user = interaction.options.getUser("user");
    const reason =
      interaction.options.getString("reason") || "No reason provided.";

    const member = await interaction.guild.members
      .fetch(user.id)
      .catch(() => null);

    if (!member?.bannable) {
      return interaction.reply({
        content: "❌ I can't ban that member.",
        flags: MessageFlags.Ephemeral
      });
    }

    await member.ban({ reason });

    await logAction(
      interaction.guild,
      "🔨 Member Banned",
      `${user} was banned.\n**Reason:** ${reason}`,
      "#ED4245"
    );

    return interaction.reply(`🔨 Banned **${user.username}**.`);
  }

  if (sub === "kick") {
    const user = interaction.options.getUser("user");
    const reason =
      interaction.options.getString("reason") || "No reason provided.";

    const member = await interaction.guild.members
      .fetch(user.id)
      .catch(() => null);

    if (!member?.kickable) {
      return interaction.reply({
        content: "❌ I can't kick that member.",
        flags: MessageFlags.Ephemeral
      });
    }

    await member.kick(reason);

    await logAction(
      interaction.guild,
      "👢 Member Kicked",
      `${user} was kicked.\n**Reason:** ${reason}`,
      "#ED4245"
    );

    return interaction.reply(`👢 Kicked **${user.username}**.`);
  }

  if (sub === "timeout") {
    const user = interaction.options.getUser("user");
    const minutes = interaction.options.getInteger("minutes");
    const reason =
      interaction.options.getString("reason") || "No reason provided.";

    const member = await interaction.guild.members
      .fetch(user.id)
      .catch(() => null);

    if (!member?.moderatable) {
      return interaction.reply({
        content: "❌ I can't timeout that member.",
        flags: MessageFlags.Ephemeral
      });
    }

    await member.timeout(minutes * 60 * 1000, reason);

    return interaction.reply(
      `⏱️ **${user.username}** has been timed out for **${minutes} minutes**.`
    );
  }

  if (sub === "warn") {
    const user = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason");

    const cfg = guildConfig(interaction.guild.id);

    if (!cfg.warnings[user.id]) {
      cfg.warnings[user.id] = [];
    }

    cfg.warnings[user.id].push({
      reason,
      moderator: interaction.user.id,
      timestamp: Date.now()
    });

    saveConfig();

    await logAction(
      interaction.guild,
      "⚠️ Member Warned",
      `${user} was warned.\n**Reason:** ${reason}`,
      "#FEE75C"
    );

    return interaction.reply(
      `⚠️ **${user.username}** has been warned.`
    );
  }

  if (sub === "warnings") {
    const user = interaction.options.getUser("user");
    const cfg = guildConfig(interaction.guild.id);
    const warnings = cfg.warnings[user.id] || [];

    if (!warnings.length) {
      return interaction.reply({
        content: `✅ **${user.username}** has no warnings.`,
        flags: MessageFlags.Ephemeral
      });
    }

    const text = warnings
      .map(
        (w, i) =>
          `**${i + 1}.** ${w.reason} — <@${w.moderator}>`
      )
      .join("\n");

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#FEE75C")
          .setTitle(`⚠️ Warnings • ${user.username}`)
          .setDescription(text)
      ]
    });
  }

  if (sub === "clear") {
    const amount = interaction.options.getInteger("amount");

    const deleted = await interaction.channel.bulkDelete(
      amount,
      true
    );

    return interaction.reply({
      content: `🧹 Deleted **${deleted.size}** messages.`,
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "lock" || sub === "unlock") {
    const locked = sub === "lock";

    await interaction.channel.permissionOverwrites.edit(
      interaction.guild.roles.everyone,
      {
        SendMessages: !locked
      }
    );

    return interaction.reply(
      locked
        ? "🔒 Channel locked."
        : "🔓 Channel unlocked."
    );
  }
}

/* =========================================================
   AUTOMOD
   ========================================================= */

const spamTracker = new Map();

async function handleAutoMod(interaction) {
  const sub = interaction.options.getSubcommand();
  const cfg = guildConfig(interaction.guild.id).automod;

  if (sub === "setup") {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#5865F2")
          .setTitle("🛡️ Automod Configuration")
          .addFields(
            {
              name: "Status",
              value: cfg.enabled ? "🟢 Enabled" : "🔴 Disabled"
            },
            {
              name: "Blocked Words",
              value: cfg.words.length
                ? cfg.words.join(", ")
                : "None"
            },
            {
              name: "Spam Protection",
              value: cfg.spam.enabled ? "🟢 Enabled" : "🔴 Disabled"
            },
            {
              name: "Link Filter",
              value: cfg.links ? "🟢 Enabled" : "🔴 Disabled"
            }
          )
      ],
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "enable") {
    cfg.enabled = true;
    saveConfig();

    return interaction.reply("🟢 Automod enabled.");
  }

  if (sub === "disable") {
    cfg.enabled = false;
    saveConfig();

    return interaction.reply("🔴 Automod disabled.");
  }

  if (sub === "words") {
    const word = interaction.options.getString("word").toLowerCase();

    if (!cfg.words.includes(word)) {
      cfg.words.push(word);
      saveConfig();
    }

    return interaction.reply(`🚫 Added \`${word}\` to blocked words.`);
  }

  if (sub === "spam") {
    const enabled = interaction.options.getBoolean("enabled");
    const limit = interaction.options.getInteger("limit");

    cfg.spam.enabled = enabled;

    if (limit) {
      cfg.spam.limit = limit;
    }

    saveConfig();

    return interaction.reply(
      `🛡️ Spam protection ${enabled ? "enabled" : "disabled"}.`
    );
  }

  if (sub === "links") {
    const enabled = interaction.options.getBoolean("enabled");

    cfg.links = enabled;
    saveConfig();

    return interaction.reply(
      `🔗 Link filtering ${enabled ? "enabled" : "disabled"}.`
    );
  }
}

/* =========================================================
   LOGS
   ========================================================= */

async function handleLogs(interaction) {
  const sub = interaction.options.getSubcommand();
  const cfg = guildConfig(interaction.guild.id).logs;

  if (sub === "setup") {
    const channel = interaction.options.getChannel("channel");

    cfg.channel = channel.id;
    cfg.enabled = true;

    saveConfig();

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#57F287")
          .setTitle("📜 Logs Configured")
          .setDescription(
            `Logging is now enabled in ${channel}.`
          )
      ],
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "disable") {
    cfg.enabled = false;
    saveConfig();

    return interaction.reply("🔴 Logging disabled.");
  }

  if (sub === "test") {
    await logAction(
      interaction.guild,
      "🧪 Log Test",
      `Log system tested by ${interaction.user}.`
    );

    return interaction.reply({
      content: "🧪 Test log sent.",
      flags: MessageFlags.Ephemeral
    });
  }
}

/* =========================================================
   REACTION ROLES
   ========================================================= */

async function handleReactionRole(interaction) {
  const sub = interaction.options.getSubcommand();
  const cfg = guildConfig(interaction.guild.id);

  if (sub === "create") {
    const role = interaction.options.getRole("role");
    const emoji = interaction.options.getString("emoji");
    const text = interaction.options.getString("text");

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("🎭 Reaction Role")
      .setDescription(text)
      .addFields({
        name: "Role",
        value: `${role}`
      });

    const message = await interaction.channel.send({
      embeds: [embed]
    });

    await message.react(emoji).catch(() => {});

    cfg.reactionRoles.push({
      message: message.id,
      emoji,
      role: role.id
    });

    saveConfig();

    return interaction.reply({
      content: `✅ Reaction role created.\nMessage: \`${message.id}\``,
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "add") {
    const message = interaction.options.getString("message");
    const emoji = interaction.options.getString("emoji");
    const role = interaction.options.getRole("role");

    cfg.reactionRoles.push({
      message,
      emoji,
      role: role.id
    });

    saveConfig();

    return interaction.reply({
      content: "✅ Reaction role added.",
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "remove") {
    const message = interaction.options.getString("message");
    const emoji = interaction.options.getString("emoji");

    cfg.reactionRoles = cfg.reactionRoles.filter(
      x => !(x.message === message && x.emoji === emoji)
    );

    saveConfig();

    return interaction.reply({
      content: "🗑️ Reaction role removed.",
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "list") {
    if (!cfg.reactionRoles.length) {
      return interaction.reply({
        content: "No reaction roles configured.",
        flags: MessageFlags.Ephemeral
      });
    }

    const text = cfg.reactionRoles
      .map(
        (x, i) =>
          `**${i + 1}.** ${x.emoji} → <@&${x.role}> • \`${x.message}\``
      )
      .join("\n");

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#5865F2")
          .setTitle("🎭 Reaction Roles")
          .setDescription(text)
      ],
      flags: MessageFlags.Ephemeral
    });
  }
}

/* =========================================================
   UTILITY
   ========================================================= */

async function handleUtility(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === "userinfo") {
    const user = interaction.options.getUser("user");
    const member = await interaction.guild.members
      .fetch(user.id)
      .catch(() => null);

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle(`👤 ${user.username}`)
      .setThumbnail(
        user.displayAvatarURL({
          extension: "png",
          size: 256
        })
      )
      .addFields(
        {
          name: "User ID",
          value: user.id,
          inline: true
        },
        {
          name: "Created",
          value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
          inline: true
        },
        {
          name: "Joined",
          value: member
            ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
            : "Unknown",
          inline: true
        }
      );

    return interaction.reply({ embeds: [embed] });
  }

  if (sub === "serverinfo") {
    const guild = interaction.guild;

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle(`🏠 ${guild.name}`)
      .setThumbnail(
        guild.iconURL({
          extension: "png",
          size: 256
        })
      )
      .addFields(
        {
          name: "Members",
          value: `${guild.memberCount}`,
          inline: true
        },
        {
          name: "Channels",
          value: `${guild.channels.cache.size}`,
          inline: true
        },
        {
          name: "Roles",
          value: `${guild.roles.cache.size}`,
          inline: true
        },
        {
          name: "Owner",
          value: `<@${guild.ownerId}>`,
          inline: true
        },
        {
          name: "Created",
          value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
          inline: true
        }
      );

    return interaction.reply({ embeds: [embed] });
  }

  if (sub === "avatar") {
    const user =
      interaction.options.getUser("user") ||
      interaction.user;

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#5865F2")
          .setTitle(`🖼️ ${user.username}'s Avatar`)
          .setImage(
            user.displayAvatarURL({
              extension: "png",
              size: 1024
            })
          )
      ]
    });
  }

  if (sub === "roleinfo") {
    const role = interaction.options.getRole("role");

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(role.color || "#5865F2")
          .setTitle(`🎨 ${role.name}`)
          .addFields(
            {
              name: "ID",
              value: role.id,
              inline: true
            },
            {
              name: "Members",
              value: `${role.members.size}`,
              inline: true
            },
            {
              name: "Position",
              value: `${role.position}`,
              inline: true
            }
          )
      ]
    });
  }

  if (sub === "channelinfo") {
    const channel = interaction.options.getChannel("channel");

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#5865F2")
          .setTitle(`📺 ${channel.name}`)
          .addFields(
            {
              name: "ID",
              value: channel.id,
              inline: true
            },
            {
              name: "Type",
              value: `${channel.type}`,
              inline: true
            }
          )
      ]
    });
  }
}

/* =========================================================
   FUN
   ========================================================= */

async function handleFun(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === "8ball") {
    const answers = [
      "Yes.",
      "No.",
      "Definitely.",
      "Probably.",
      "Maybe.",
      "Ask again later.",
      "Absolutely not.",
      "The signs point to yes."
    ];

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#5865F2")
          .setTitle("🎱 Magic 8-Ball")
          .addFields(
            {
              name: "Question",
              value: interaction.options.getString("question")
            },
            {
              name: "Answer",
              value: answers[Math.floor(Math.random() * answers.length)]
            }
          )
      ]
    });
  }

  if (sub === "coinflip") {
    return interaction.reply(
      `🪙 **${Math.random() < 0.5 ? "Heads" : "Tails"}**`
    );
  }

  if (sub === "dice") {
    return interaction.reply(
      `🎲 You rolled **${Math.floor(Math.random() * 6) + 1}**`
    );
  }

  if (sub === "choose") {
    const options = interaction.options
      .getString("options")
      .split(",")
      .map(x => x.trim())
      .filter(Boolean);

    if (!options.length) {
      return interaction.reply({
        content: "❌ Give me at least one option.",
        flags: MessageFlags.Ephemeral
      });
    }

    return interaction.reply(
      `🎯 I choose **${
        options[Math.floor(Math.random() * options.length)]
      }**`
    );
  }

  if (sub === "poll") {
    const question = interaction.options.getString("question");

    const message = await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#5865F2")
          .setTitle("📊 Poll")
          .setDescription(question)
          .setFooter({
            text: `Poll by ${interaction.user.username}`
          })
      ],
      fetchReply: true
    });

    await message.react("👍");
    await message.react("👎");

    return;
  }
}

/* =========================================================
   ANTINUKE
   ========================================================= */

async function handleAntiNuke(interaction) {
  const sub = interaction.options.getSubcommand();
  const cfg = guildConfig(interaction.guild.id).antinuke;

  if (sub === "setup") {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#ED4245")
          .setTitle("🛡️ Anti-Nuke")
          .setDescription(
            `**Status:** ${cfg.enabled ? "🟢 Enabled" : "🔴 Disabled"}\n` +
            `**Threshold:** ${cfg.threshold} actions\n` +
            `**Interval:** ${cfg.interval / 1000}s`
          )
      ],
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "enable") {
    cfg.enabled = true;
    saveConfig();

    return interaction.reply("🟢 Anti-nuke enabled.");
  }

  if (sub === "disable") {
    cfg.enabled = false;
    saveConfig();

    return interaction.reply("🔴 Anti-nuke disabled.");
  }

  if (sub === "config") {
    return interaction.reply({
      content:
        `Threshold: **${cfg.threshold}**\n` +
        `Interval: **${cfg.interval / 1000}s**`,
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "status") {
    return interaction.reply(
      `🛡️ Anti-nuke is **${cfg.enabled ? "enabled" : "disabled"}**.`
    );
  }
}

/* =========================================================
   RAID
   ========================================================= */

async function handleRaid(interaction) {
  const sub = interaction.options.getSubcommand();
  const cfg = guildConfig(interaction.guild.id).raid;

  if (sub === "setup") {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#ED4245")
          .setTitle("🚨 Raid Protection")
          .setDescription(
            `**Status:** ${cfg.enabled ? "🟢 Enabled" : "🔴 Disabled"}\n` +
            `**Threshold:** ${cfg.threshold} joins\n` +
            `**Interval:** ${cfg.interval / 1000}s\n` +
            `**Action:** ${cfg.action}`
          )
      ],
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "enable") {
    cfg.enabled = true;
    saveConfig();

    return interaction.reply("🟢 Raid protection enabled.");
  }

  if (sub === "disable") {
    cfg.enabled = false;
    saveConfig();

    return interaction.reply("🔴 Raid protection disabled.");
  }

  if (sub === "config") {
    return interaction.reply({
      content:
        `Threshold: **${cfg.threshold}**\n` +
        `Interval: **${cfg.interval / 1000}s**\n` +
        `Action: **${cfg.action}**`,
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "status") {
    const active =
      cfg.activeUntil && cfg.activeUntil > Date.now();

    return interaction.reply(
      `🚨 Raid protection: **${
        cfg.enabled ? "Enabled" : "Disabled"
      }**\n` +
      `Current raid mode: **${active ? "ACTIVE" : "Normal"}**`
    );
  }
}

/* =========================================================
   INTERACTIONS
   ========================================================= */

client.on("interactionCreate", async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "jrc") {
        return handleJRC(interaction);
      }

      if (interaction.commandName === "welcome") {
        return handleGreetingCommand(interaction, "welcome");
      }

      if (interaction.commandName === "goodbye") {
        return handleGreetingCommand(interaction, "goodbye");
      }

      if (interaction.commandName === "mod") {
        return handleMod(interaction);
      }

      if (interaction.commandName === "automod") {
        return handleAutoMod(interaction);
      }

      if (interaction.commandName === "logs") {
        return handleLogs(interaction);
      }

      if (interaction.commandName === "reactionrole") {
        return handleReactionRole(interaction);
      }

      if (interaction.commandName === "utility") {
        return handleUtility(interaction);
      }

      if (interaction.commandName === "fun") {
        return handleFun(interaction);
      }

      if (interaction.commandName === "antinuke") {
        return handleAntiNuke(interaction);
      }

      if (interaction.commandName === "raid") {
        return handleRaid(interaction);
      }
    }

    /* BUTTONS */

    if (interaction.isButton()) {
      const parts = interaction.customId.split("_");

      if (parts[0] !== "jrc") return;

      const action = parts[1];
      const type = parts[2];

      const cfg = guildConfig(interaction.guild.id)[type];

      if (!cfg) return;

      if (action === "enable") {
        cfg.enabled = true;
        saveConfig();

        return interaction.update(
          greetingPanel(type, interaction.guild)
        );
      }

      if (action === "disable") {
        cfg.enabled = false;
        saveConfig();

        return interaction.update(
          greetingPanel(type, interaction.guild)
        );
      }

      if (action === "preview") {
        const embed = buildGreetingEmbed(
          type,
          interaction.member,
          cfg
        );

        return interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral
        });
      }

      if (action === "channel") {
        const menu = new ChannelSelectMenuBuilder()
          .setCustomId(`jrc_select_channel_${type}`)
          .setPlaceholder(`Select ${type} channel`)
          .setChannelTypes(ChannelType.GuildText);

        return interaction.reply({
          components: [
            new ActionRowBuilder().addComponents(menu)
          ],
          flags: MessageFlags.Ephemeral
        });
      }

      if (action === "config") {
        const modal = new ModalBuilder()
          .setCustomId(`jrc_modal_${type}`)
          .setTitle(
            type === "welcome"
              ? "Welcome Configuration"
              : "Goodbye Configuration"
          );

        const titleInput = new TextInputBuilder()
          .setCustomId("title")
          .setLabel("Greeting / Embed Title")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(256)
          .setValue(cfg.title || "");

        const descriptionInput = new TextInputBuilder()
          .setCustomId("description")
          .setLabel("Description")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(4000)
          .setValue(cfg.description || "");

        const messageInput = new TextInputBuilder()
          .setCustomId("message")
          .setLabel("Greeting Message")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(1000)
          .setValue(cfg.message || "");

        const colorInput = new TextInputBuilder()
          .setCustomId("color")
          .setLabel("Embed Color")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(7)
          .setValue(cfg.color || "#5865F2");

        const imageInput = new TextInputBuilder()
          .setCustomId("image")
          .setLabel("Image / GIF URL")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(1000)
          .setValue(cfg.image || "");

        modal.addComponents(
          new ActionRowBuilder().addComponents(titleInput),
          new ActionRowBuilder().addComponents(descriptionInput),
          new ActionRowBuilder().addComponents(messageInput),
          new ActionRowBuilder().addComponents(colorInput),
          new ActionRowBuilder().addComponents(imageInput)
        );

        return interaction.showModal(modal);
      }
    }

    /* CHANNEL SELECT */

    if (interaction.isChannelSelectMenu()) {
      if (!interaction.customId.startsWith("jrc_select_channel_")) {
        return;
      }

      const type = interaction.customId.replace(
        "jrc_select_channel_",
        ""
      );

      const channel = interaction.channels.first();

      const cfg = guildConfig(interaction.guild.id)[type];

      cfg.channel = channel.id;

      saveConfig();

      return interaction.update({
        content: `📢 ${type} channel set to ${channel}.`,
        components: []
      });
    }

    /* MODAL */

    if (interaction.isModalSubmit()) {
      if (!interaction.customId.startsWith("jrc_modal_")) {
        return;
      }

      const type = interaction.customId.replace(
        "jrc_modal_",
        ""
      );

      const cfg = guildConfig(interaction.guild.id)[type];

      const title = interaction.fields.getTextInputValue("title");
      const description =
        interaction.fields.getTextInputValue("description");
      const message =
        interaction.fields.getTextInputValue("message");
      const color =
        interaction.fields.getTextInputValue("color") || "#5865F2";
      const image =
        interaction.fields.getTextInputValue("image") || null;

      if (!validColor(color)) {
        return interaction.reply({
          content:
            "❌ Invalid color. Use a hex color such as `#5865F2`.",
          flags: MessageFlags.Ephemeral
        });
      }

      if (image && !validImage(image)) {
        return interaction.reply({
          content: "❌ Invalid image/GIF URL.",
          flags: MessageFlags.Ephemeral
        });
      }

      cfg.title = title;
      cfg.description = description;
      cfg.message = message;
      cfg.color = color.startsWith("#") ? color : `#${color}`;
      cfg.image = image;

      saveConfig();

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(cfg.color)
            .setTitle("✅ Configuration Saved")
            .setDescription(
              `Your **${type}** embed configuration has been saved.`
            )
        ],
        flags: MessageFlags.Ephemeral
      });
    }
  } catch (error) {
    console.error("Interaction error:", error);

    await safeReply(interaction, {
      content: "❌ Something went wrong while processing that.",
      flags: MessageFlags.Ephemeral
    });
  }
});

/* =========================================================
   WELCOME
   ========================================================= */

client.on("guildMemberAdd", async member => {
  try {
    const cfg = guildConfig(member.guild.id);
    const settings = cfg.welcome;

    if (!settings.enabled || !settings.channel) return;

    const channel = member.guild.channels.cache.get(
      settings.channel
    );

    if (!channel || !channel.isTextBased()) return;

    const embed = buildGreetingEmbed(
      "welcome",
      member,
      settings
    );

    await channel.send({
      embeds: [embed]
    });

    /* RAID DETECTION */

    if (cfg.raid.enabled) {
      const now = Date.now();

      if (!cfg.raid._joins) {
        cfg.raid._joins = [];
      }

      cfg.raid._joins = cfg.raid._joins.filter(
        t => now - t < cfg.raid.interval
      );

      cfg.raid._joins.push(now);

      if (cfg.raid._joins.length >= cfg.raid.threshold) {
        cfg.raid.activeUntil = now + 60000;

        await logAction(
          member.guild,
          "🚨 RAID DETECTED",
          `Raid protection triggered after **${cfg.raid._joins.length} joins**.`,
          "#ED4245"
        );

        if (cfg.raid.action === "kick") {
          for (const [, m] of member.guild.members.cache) {
            if (
              m.user.bot === false &&
              m.id !== member.guild.ownerId &&
              m.kickable &&
              Date.now() - m.joinedTimestamp < 30000
            ) {
              await m.kick("Raid protection").catch(() => {});
            }
          }
        }

        saveConfig();
      }
    }
  } catch (error) {
    console.error("Welcome error:", error);
  }
});

/* =========================================================
   GOODBYE
   ========================================================= */

client.on("guildMemberRemove", async member => {
  try {
    const cfg = guildConfig(member.guild.id);
    const settings = cfg.goodbye;

    if (!settings.enabled || !settings.channel) return;

    const channel = member.guild.channels.cache.get(
      settings.channel
    );

    if (!channel || !channel.isTextBased()) return;

    const embed = buildGreetingEmbed(
      "goodbye",
      member,
      settings
    );

    await channel.send({
      embeds: [embed]
    });
  } catch (error) {
    console.error("Goodbye error:", error);
  }
});

/* =========================================================
   AUTOMOD MESSAGE HANDLER
   ========================================================= */

client.on("messageCreate", async message => {
  try {
    if (!message.guild || message.author.bot) return;

    const cfg = guildConfig(message.guild.id).automod;

    if (!cfg.enabled) return;

    const content = message.content.toLowerCase();

    /* BLOCKED WORDS */

    if (
      cfg.words.some(word =>
        content.includes(word.toLowerCase())
      )
    ) {
      if (
        message.member?.moderatable
      ) {
        await message.delete().catch(() => {});
      }

      await message.channel
        .send({
          content: `🛡️ ${message.author}, that message was removed by automod.`
        })
        .then(m =>
          setTimeout(() => m.delete().catch(() => {}), 5000)
        );

      return;
    }

    /* LINKS */

    if (
      cfg.links &&
      /(https?:\/\/|www\.)/i.test(message.content)
    ) {
      if (
        !message.member?.permissions.has(
          PermissionFlagsBits.ManageMessages
        )
      ) {
        await message.delete().catch(() => {});

        const warning = await message.channel.send({
          content: `🔗 ${message.author}, links aren't allowed here.`
        });

        setTimeout(
          () => warning.delete().catch(() => {}),
          5000
        );

        return;
      }
    }

    /* SPAM */

    if (cfg.spam.enabled) {
      const key = `${message.guild.id}:${message.author.id}`;
      const now = Date.now();

      const existing = spamTracker.get(key) || [];

      const recent = existing.filter(
        t => now - t < cfg.spam.interval
      );

      recent.push(now);

      spamTracker.set(key, recent);

      if (recent.length >= cfg.spam.limit) {
        spamTracker.set(key, []);

        if (message.member?.moderatable) {
          await message.member
            .timeout(10000, "Automod spam protection")
            .catch(() => {});
        }

        await logAction(
          message.guild,
          "🛡️ Spam Protection",
          `${message.author} triggered spam protection.`,
          "#FEE75C"
        );
      }
    }
  } catch (error) {
    console.error("Automod error:", error);
  }
});

/* =========================================================
   REACTION ROLE EVENTS
   ========================================================= */

client.on("messageReactionAdd", async (reaction, user) => {
  try {
    if (user.bot) return;

    if (reaction.partial) {
      await reaction.fetch().catch(() => {});
    }

    const guild = reaction.message.guild;

    if (!guild) return;

    const cfg = guildConfig(guild.id);

    const emojiName =
      reaction.emoji.id
        ? `<:${reaction.emoji.name}:${reaction.emoji.id}>`
        : reaction.emoji.name;

    const match = cfg.reactionRoles.find(
      x =>
        x.message === reaction.message.id &&
        (x.emoji === reaction.emoji.name ||
          x.emoji === emojiName)
    );

    if (!match) return;

    const member = await guild.members
      .fetch(user.id)
      .catch(() => null);

    if (!member) return;

    await member.roles.add(match.role).catch(() => {});
  } catch {}
});

client.on("messageReactionRemove", async (reaction, user) => {
  try {
    if (user.bot) return;

    if (reaction.partial) {
      await reaction.fetch().catch(() => {});
    }

    const guild = reaction.message.guild;

    if (!guild) return;

    const cfg = guildConfig(guild.id);

    const emojiName =
      reaction.emoji.id
        ? `<:${reaction.emoji.name}:${reaction.emoji.id}>`
        : reaction.emoji.name;

    const match = cfg.reactionRoles.find(
      x =>
        x.message === reaction.message.id &&
        (x.emoji === reaction.emoji.name ||
          x.emoji === emojiName)
    );

    if (!match) return;

    const member = await guild.members
      .fetch(user.id)
      .catch(() => null);

    if (!member) return;

    await member.roles.remove(match.role).catch(() => {});
  } catch {}
});

/* =========================================================
   ANTI-NUKE
   ========================================================= */

const nukeTracker = new Map();

client.on("guildAuditLogEntryCreate", async (entry, guild) => {
  try {
    const cfg = guildConfig(guild.id).antinuke;

    if (!cfg.enabled) return;

    const destructiveActions = [
      AuditLogEvent.ChannelDelete,
      AuditLogEvent.RoleDelete,
      AuditLogEvent.GuildBanAdd
    ];

    if (!destructiveActions.includes(entry.action)) return;

    const executor = entry.executor;

    if (!executor || executor.id === guild.ownerId) return;

    const key = `${guild.id}:${executor.id}`;
    const now = Date.now();

    const history = nukeTracker.get(key) || [];

    const recent = history.filter(
      t => now - t < cfg.interval
    );

    recent.push(now);

    nukeTracker.set(key, recent);

    if (recent.length >= cfg.threshold) {
      const member = await guild.members
        .fetch(executor.id)
        .catch(() => null);

      if (member?.moderatable) {
        await member
          .timeout(60 * 60 * 1000, "Anti-nuke protection")
          .catch(() => {});
      }

      await logAction(
        guild,
        "🚨 ANTI-NUKE TRIGGERED",
        `${executor} triggered anti-nuke protection.`,
        "#ED4245"
      );

      nukeTracker.set(key, []);
    }
  } catch (error) {
    console.error("Anti-nuke error:", error);
  }
});

/* =========================================================
   READY + COMMAND REGISTRATION
   ========================================================= */

client.once("ready", async () => {
  console.log("======================================");
  console.log(`🤖 JRC Bot online as ${client.user.tag}`);
  console.log(`🌐 Servers: ${client.guilds.cache.size}`);
  console.log(`📡 Ping: ${client.ws.ping}ms`);
  console.log("======================================");

  client.user.setActivity("JRC Bot • /jrc help");

  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;

  if (!token || !clientId) {
    console.error(
      "❌ Missing DISCORD_TOKEN or CLIENT_ID environment variable."
    );
    return;
  }

  try {
    const rest = new REST({ version: "10" }).setToken(token);

    console.log("🔄 Registering slash commands...");

    await rest.put(
      Routes.applicationCommands(clientId),
      {
        body: commands
      }
    );

    console.log(
      `✅ Registered ${commands.length} slash command groups.`
    );
  } catch (error) {
    console.error("❌ Command registration failed:", error);
  }
});

/* =========================================================
   ERROR HANDLING
   ========================================================= */

process.on("unhandledRejection", error => {
  console.error("Unhandled rejection:", error);
});

process.on("uncaughtException", error => {
  console.error("Uncaught exception:", error);
});

/* =========================================================
   LOGIN
   ========================================================= */

if (!process.env.DISCORD_TOKEN) {
  console.error(
    "❌ DISCORD_TOKEN is missing. Add it to your environment variables."
  );
} else {
  client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error("❌ Login failed:", error);
  });
}
