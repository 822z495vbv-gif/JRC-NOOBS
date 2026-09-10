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
  MessageFlags,
  PermissionsBitField
} = require("discord.js");

const fs = require("fs");
const path = require("path");

/* =========================================================
   JRC BOT — SINGLE FILE EDITION
   Existing commands preserved + new systems added.
   ========================================================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message]
});

const CONFIG_FILE = path.join(__dirname, "config.json");
const ACCENT = "#5865F2";

function loadConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE))
      fs.writeFileSync(CONFIG_FILE, "{}", "utf8");
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  } catch (e) {
    console.error("Config load error:", e);
    return {};
  }
}

const config = loadConfig();

function saveConfig() {
  try {
    fs.writeFileSync(
      CONFIG_FILE,
      JSON.stringify(config, null, 2),
      "utf8"
    );
  } catch (e) {
    console.error("Config save error:", e);
  }
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

⚠️ IMPORTANT

Being new to the server does not exempt anyone from the rules. Rules may be updated when necessary.

🔒 YOUR PRIVACY

Never share passwords, authentication codes, private addresses, financial information, or other sensitive personal information with other members.

🆘 NEED HELP?

If you're unsure whether something is allowed, ask a moderator before doing it.

Most importantly, have fun, meet new people, and help keep {server} a welcoming and enjoyable community for everyone.

Enjoy your stay, {user}! 💙`,
        message: `🎉 Welcome to {server}, {user}!

Before you get started, please read the server rules and make sure you understand Discord's Terms of Service and Community Guidelines.

Respect others, protect your privacy, don't spam, don't advertise without permission, and follow staff instructions.

Have fun, stay safe, and enjoy your time here! 💙`,
        color: ACCENT,
        image: null,
        footer: "JRC Bot • Welcome",
        timestamp: true,
        thumbnail: true
      },

      goodbye: {
        enabled: false,
        channel: null,
        title: "👋 Goodbye from {server}",
        description:
          "We're sorry to see you go, {user}. Thanks for being part of {server}.",
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
      },

      tickets: {
        enabled: false,
        category: null,
        supportRole: null,
        logChannel: null,
        open: {}
      },

      embeds: [],
      events: [],

      serverSetup: {
        completed: false
      }
    };

    saveConfig();
  }

  const g = config[guildId];

  if (!g.welcome)
    g.welcome = {
      enabled: false,
      channel: null,
      title: "👋 Welcome to {server}!",
      description: "Welcome to {server}, {user}!",
      message: "Have fun!",
      color: ACCENT,
      image: null,
      footer: "JRC Bot • Welcome",
      timestamp: true,
      thumbnail: true
    };

  if (!g.goodbye)
    g.goodbye = {
      enabled: false,
      channel: null,
      title: "👋 Goodbye from {server}",
      description: "We're sorry to see you go, {user}.",
      message: "👋 {user} has left {server}.",
      color: "#ED4245",
      image: null,
      footer: "JRC Bot • Goodbye",
      timestamp: true,
      thumbnail: true
    };

  if (!g.warnings) g.warnings = {};

  if (!g.automod)
    g.automod = {
      enabled: false,
      words: [],
      spam: {
        enabled: false,
        limit: 6,
        interval: 5000
      },
      links: false
    };

  if (!g.logs)
    g.logs = {
      enabled: false,
      channel: null
    };

  if (!g.reactionRoles) g.reactionRoles = [];

  if (!g.antinuke)
    g.antinuke = {
      enabled: false,
      threshold: 5,
      interval: 10000
    };

  if (!g.raid)
    g.raid = {
      enabled: false,
      threshold: 8,
      interval: 10000,
      action: "kick",
      activeUntil: 0
    };

  if (!g.tickets)
    g.tickets = {
      enabled: false,
      category: null,
      supportRole: null,
      logChannel: null,
      open: {}
    };

  if (!g.tickets.open) g.tickets.open = {};
  if (!g.embeds) g.embeds = [];
  if (!g.events) g.events = [];

  if (!g.serverSetup)
    g.serverSetup = {
      completed: false
    };

  return g;
}

function replaceVariables(text, member) {
  if (!text) return "";

  return text
    .replaceAll(
      "{user}",
      member?.user ? `<@${member.user.id}>` : ""
    )
    .replaceAll(
      "{username}",
      member?.user?.username || ""
    )
    .replaceAll(
      "{server}",
      member?.guild?.name || ""
    );
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

function normColor(color, fallback = ACCENT) {
  return validColor(color)
    ? color.startsWith("#")
      ? color
      : `#${color}`
    : fallback;
}

function clip(s, n = 1024) {
  return String(s ?? "").slice(0, n);
}

function baseEmbed(color = ACCENT) {
  return new EmbedBuilder()
    .setColor(color)
    .setFooter({ text: "JRC Bot" })
    .setTimestamp();
}

function buildGreetingEmbed(type, member, settings) {
  const embed = new EmbedBuilder()
    .setColor(normColor(settings.color))
    .setTitle(replaceVariables(settings.title, member))
    .setDescription(
      replaceVariables(settings.description, member)
    )
    .addFields({
      name: type === "welcome" ? "💬 Greeting" : "💬 Message",
      value: clip(
        replaceVariables(settings.message, member),
        1024
      )
    });

  if (
    settings.thumbnail &&
    member?.user?.displayAvatarURL
  ) {
    embed.setThumbnail(
      member.user.displayAvatarURL({
        extension: "png",
        size: 256
      })
    );
  }

  if (settings.image && validImage(settings.image))
    embed.setImage(settings.image);

  if (settings.footer)
    embed.setFooter({
      text: replaceVariables(settings.footer, member)
    });

  if (settings.timestamp) embed.setTimestamp();

  return embed;
}

function greetingPanel(type, guild) {
  const settings = guildConfig(guild.id)[type];

  const embed = baseEmbed(normColor(settings.color))
    .setTitle(
      type === "welcome"
        ? "👋 Welcome System"
        : "👋 Goodbye System"
    )
    .setDescription(
      `Configure the **${type}** system for **${guild.name}**.

**Status:** ${
        settings.enabled ? "🟢 Enabled" : "🔴 Disabled"
      }
**Channel:** ${
        settings.channel
          ? `<#${settings.channel}>`
          : "Not configured"
      }

Use the buttons below to configure your embed, channel, preview, and status.`
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
    return interaction.replied || interaction.deferred
      ? interaction.followUp(data)
      : interaction.reply(data);
  } catch {}
}

async function logAction(
  guild,
  title,
  description,
  color = ACCENT,
  fields = []
) {
  const cfg = guildConfig(guild.id);

  if (!cfg.logs.enabled || !cfg.logs.channel) return;

  const ch = guild.channels.cache.get(cfg.logs.channel);

  if (!ch?.isTextBased()) return;

  const e = baseEmbed(color)
    .setTitle(title)
    .setDescription(description);

  if (fields.length) e.addFields(fields);

  try {
    await ch.send({ embeds: [e] });
  } catch {}
}

/* =========================================================
   COMMAND DEFINITIONS
   ========================================================= */

const commands = [];

commands.push(
  new SlashCommandBuilder()
    .setName("jrc")
    .setDescription("JRC Bot control panel")
    .addSubcommand(s =>
      s
        .setName("help")
        .setDescription("View JRC Bot commands")
    )
    .addSubcommand(s =>
      s
        .setName("settings")
        .setDescription("View server settings")
    )
    .addSubcommand(s =>
      s
        .setName("about")
        .setDescription("About JRC Bot")
    )
    .addSubcommand(s =>
      s
        .setName("status")
        .setDescription("View bot status")
    )
);

commands.push(
  new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("Configure welcome messages")
    .addSubcommand(s =>
      s.setName("setup").setDescription("Open welcome setup")
    )
    .addSubcommand(s =>
      s.setName("disable").setDescription("Disable welcome")
    )
    .addSubcommand(s =>
      s.setName("test").setDescription("Test welcome")
    )
    .addSubcommand(s =>
      s
        .setName("message")
        .setDescription("View welcome message")
    )
    .addSubcommand(s =>
      s
        .setName("channel")
        .setDescription("Set welcome channel")
    )
    .addSubcommand(s =>
      s.setName("preview").setDescription("Preview welcome")
    )
);

commands.push(
  new SlashCommandBuilder()
    .setName("goodbye")
    .setDescription("Configure goodbye messages")
    .addSubcommand(s =>
      s.setName("setup").setDescription("Open goodbye setup")
    )
    .addSubcommand(s =>
      s.setName("disable").setDescription("Disable goodbye")
    )
    .addSubcommand(s =>
      s.setName("test").setDescription("Test goodbye")
    )
    .addSubcommand(s =>
      s
        .setName("message")
        .setDescription("View goodbye message")
    )
    .addSubcommand(s =>
      s
        .setName("channel")
        .setDescription("Set goodbye channel")
    )
    .addSubcommand(s =>
      s.setName("preview").setDescription("Preview goodbye")
    )
);

commands.push(
  new SlashCommandBuilder()
    .setName("mod")
    .setDescription("Moderation commands")
    .addSubcommand(s =>
      s
        .setName("ban")
        .setDescription("Ban a member")
        .addUserOption(o =>
          o
            .setName("user")
            .setDescription("Member")
            .setRequired(true)
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
          o
            .setName("user")
            .setDescription("Member")
            .setRequired(true)
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
          o
            .setName("user")
            .setDescription("Member")
            .setRequired(true)
        )
        .addIntegerOption(o =>
          o
            .setName("minutes")
            .setDescription("Minutes")
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
          o
            .setName("user")
            .setDescription("Member")
            .setRequired(true)
        )
        .addStringOption(o =>
          o
            .setName("reason")
            .setDescription("Reason")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s
        .setName("warnings")
        .setDescription("View warnings")
        .addUserOption(o =>
          o
            .setName("user")
            .setDescription("Member")
            .setRequired(true)
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
      s.setName("lock").setDescription("Lock channel")
    )
    .addSubcommand(s =>
      s.setName("unlock").setDescription("Unlock channel")
    )
);

commands.push(
  new SlashCommandBuilder()
    .setName("automod")
    .setDescription("Configure automod")
    .addSubcommand(s =>
      s.setName("setup").setDescription("View automod setup")
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
        .setDescription("Configure blocked words")
        .addStringOption(o =>
          o
            .setName("words")
            .setDescription("Comma separated words")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s
        .setName("spam")
        .setDescription("Configure spam protection")
        .addIntegerOption(o =>
          o
            .setName("limit")
            .setDescription("Message limit")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s
        .setName("links")
        .setDescription("Configure link blocking")
        .addBooleanOption(o =>
          o
            .setName("enabled")
            .setDescription("Enabled")
            .setRequired(true)
        )
    )
);

commands.push(
  new SlashCommandBuilder()
    .setName("reactionrole")
    .setDescription("Reaction role commands")
    .addSubcommand(s =>
      s
        .setName("create")
        .setDescription("Create reaction role message")
        .addChannelOption(o =>
          o
            .setName("channel")
            .setDescription("Channel")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
        .addStringOption(o =>
          o
            .setName("message")
            .setDescription("Message")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s
        .setName("add")
        .setDescription("Add reaction role")
        .addStringOption(o =>
          o
            .setName("message")
            .setDescription("Message ID")
            .setRequired(true)
        )
        .addStringOption(o =>
          o
            .setName("emoji")
            .setDescription("Emoji")
            .setRequired(true)
        )
        .addRoleOption(o =>
          o
            .setName("role")
            .setDescription("Role")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s
        .setName("remove")
        .setDescription("Remove reaction role")
        .addStringOption(o =>
          o
            .setName("message")
            .setDescription("Message ID")
            .setRequired(true)
        )
        .addStringOption(o =>
          o
            .setName("emoji")
            .setDescription("Emoji")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("list").setDescription("List reaction roles")
    )
);

commands.push(
  new SlashCommandBuilder()
    .setName("logs")
    .setDescription("Configure logging")
    .addSubcommand(s =>
      s.setName("setup").setDescription("Setup logs")
    )
    .addSubcommand(s =>
      s.setName("disable").setDescription("Disable logs")
    )
    .addSubcommand(s =>
      s.setName("test").setDescription("Test logs")
    )
);

commands.push(
  new SlashCommandBuilder()
    .setName("utility")
    .setDescription("Utility commands")
    .addSubcommand(s =>
      s
        .setName("userinfo")
        .setDescription("View user information")
        .addUserOption(o =>
          o.setName("user").setDescription("User")
        )
    )
    .addSubcommand(s =>
      s.setName("serverinfo").setDescription("Server information")
    )
    .addSubcommand(s =>
      s
        .setName("avatar")
        .setDescription("View avatar")
        .addUserOption(o =>
          o.setName("user").setDescription("User")
        )
    )
    .addSubcommand(s =>
      s
        .setName("roleinfo")
        .setDescription("View role information")
        .addRoleOption(o =>
          o
            .setName("role")
            .setDescription("Role")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s
        .setName("channelinfo")
        .setDescription("View channel information")
        .addChannelOption(o =>
          o.setName("channel").setDescription("Channel")
        )
    )
);

commands.push
  new SlashCommandBuilder()
    .setName("fun")
    .setDescription("Fun commands")
    .addSubcommand(s =>
      s
        .setName("8ball")
        .setDescription("Ask the 8ball")
        .addStringOption(o =>
          o
            .setName("question")
            .setDescription("Question")
            .setRequired(true)
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
          o
            .setName("options")
            .setDescription("Comma separated options")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s
        .setName("poll")
        .setDescription("Create a poll")
        .addStringOption(o =>
          o
            .setName("question")
            .setDescription("Question")
            .setRequired(true)
        )
    )
    )
    .toJSON()




commands.push(
  new SlashCommandBuilder()
    .setName("antinuke")
    .setDescription("Anti-nuke protection")
    .addSubcommand(s =>
      s.setName("setup").setDescription("Setup anti-nuke")
    )
    .addSubcommand(s =>
      s.setName("enable").setDescription("Enable anti-nuke")
    )
    .addSubcommand(s =>
      s.setName("disable").setDescription("Disable anti-nuke")
    )
    .addSubcommand(s =>
      s
        .setName("config")
        .setDescription("Configure anti-nuke")
        .addIntegerOption(o =>
          o
            .setName("threshold")
            .setDescription("Action threshold")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("status").setDescription("Anti-nuke status")
    )
);

commands.push(
  new SlashCommandBuilder()
    .setName("raid")
    .setDescription("Raid protection")
    .addSubcommand(s =>
      s.setName("setup").setDescription("Setup raid protection")
    )
    .addSubcommand(s =>
      s.setName("enable").setDescription("Enable raid protection")
    )
    .addSubcommand(s =>
      s.setName("disable").setDescription("Disable raid protection")
    )
    .addSubcommand(s =>
      s
        .setName("config")
        .setDescription("Configure raid protection")
        .addIntegerOption(o =>
          o
            .setName("threshold")
            .setDescription("Join threshold")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("status").setDescription("Raid status")
    )
);

/* =========================================================
   TICKET SYSTEM
   ========================================================= */

commands.push(
  new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Ticket system")
    .addSubcommand(s =>
      s
        .setName("setup")
        .setDescription("Configure the ticket system")
        .addChannelOption(o =>
          o
            .setName("category")
            .setDescription("Ticket category")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildCategory)
        )
        .addRoleOption(o =>
          o
            .setName("support")
            .setDescription("Support role")
            .setRequired(true)
        )
        .addChannelOption(o =>
          o
            .setName("logs")
            .setDescription("Optional ticket log channel")
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand(s =>
      s.setName("panel").setDescription("Post the ticket panel")
    )
    .addSubcommand(s =>
      s.setName("close").setDescription("Close this ticket")
    )
    .addSubcommand(s =>
      s
        .setName("add")
        .setDescription("Add a user to this ticket")
        .addUserOption(o =>
          o
            .setName("user")
            .setDescription("User")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s
        .setName("remove")
        .setDescription("Remove a user from this ticket")
        .addUserOption(o =>
          o
            .setName("user")
            .setDescription("User")
            .setRequired(true)
        )
    )
);

commands.push(
  new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Create announcement embeds")
    .addSubcommand(s =>
      s
        .setName("create")
        .setDescription("Create an embed")
        .addChannelOption(o =>
          o
            .setName("channel")
            .setDescription("Announcement channel")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
        .addStringOption(o =>
          o
            .setName("thumbnail")
            .setDescription("Optional thumbnail URL")
        )
    )
    .addSubcommand(s =>
      s
        .setName("edit")
        .setDescription("Edit a saved embed")
        .addStringOption(o =>
          o
            .setName("id")
            .setDescription("Embed ID")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s
        .setName("delete")
        .setDescription("Delete a saved embed")
        .addStringOption(o =>
          o
            .setName("id")
            .setDescription("Embed ID")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s
        .setName("preview")
        .setDescription("Preview a saved embed")
        .addStringOption(o =>
          o
            .setName("id")
            .setDescription("Embed ID")
            .setRequired(true)
        )
    )
);

commands.push(
  new SlashCommandBuilder()
    .setName("server")
    .setDescription("Server setup")
    .addSubcommand(s =>
      s
        .setName("setup")
        .setDescription("Create recommended JRC channels")
    )
);

commands.push(
  new SlashCommandBuilder()
    .setName("event")
    .setDescription("Server events")
    .addSubcommand(s =>
      s
        .setName("create")
        .setDescription("Create an event")
        .addStringOption(o =>
          o
            .setName("title")
            .setDescription("Event title")
            .setRequired(true)
        )
        .addStringOption(o =>
          o
            .setName("description")
            .setDescription("Event description")
            .setRequired(true)
        )
        .addStringOption(o =>
          o
            .setName("date")
            .setDescription("Date/time text")
            .setRequired(true)
        )
        .addChannelOption(o =>
          o
            .setName("channel")
            .setDescription("Event channel")
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand(s =>
      s
        .setName("edit")
        .setDescription("Edit an event")
        .addStringOption(o =>
          o
            .setName("id")
            .setDescription("Event ID")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s
        .setName("cancel")
        .setDescription("Cancel an event")
        .addStringOption(o =>
          o
            .setName("id")
            .setDescription("Event ID")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("list").setDescription("List active events")
    )
);

/* =========================================================
   HELPERS
   ========================================================= */

function hasAdmin(i) {
  return i.memberPermissions?.has(
    PermissionFlagsBits.Administrator
  );
}

function hasManageChannels(i) {
  return (
    hasAdmin(i) ||
    i.memberPermissions?.has(
      PermissionFlagsBits.ManageChannels
    )
  );
}

function hasManageMessages(i) {
  return (
    hasAdmin(i) ||
    i.memberPermissions?.has(
      PermissionFlagsBits.ManageMessages
    )
  );
}

function hasManageEvents(i) {
  return (
    hasAdmin(i) ||
    i.memberPermissions?.has(
      PermissionFlagsBits.ManageGuild
    )
  );
}

function isTicketChannel(channel) {
  return channel?.topic?.startsWith("JRC-TICKET:");
}

function ticketData(channel) {
  if (!isTicketChannel(channel)) return null;

  try {
    return JSON.parse(
      channel.topic.replace("JRC-TICKET:", "")
    );
  } catch {
    return null;
  }
}

function ticketButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("jrc_ticket_create")
      .setLabel("Open Ticket")
      .setEmoji("🎫")
      .setStyle(ButtonStyle.Primary)
  );
}

function eventButtons(id, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`jrc_event_rsvp_${id}`)
      .setLabel("RSVP")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled)
  );
}

function buildSavedEmbed(r) {
  const e = baseEmbed(normColor(r.color))
    .setTitle(r.title)
    .setDescription(r.description);

  if (r.image && validImage(r.image))
    e.setImage(r.image);

  if (r.thumbnail && validImage(r.thumbnail))
    e.setThumbnail(r.thumbnail);

  if (r.footer)
    e.setFooter({
      text: r.footer
    });

  return e;
}

function eventEmbed(ev, guild) {
  return baseEmbed(ev.cancelled ? "#ED4245" : ACCENT)
    .setTitle(
      ev.cancelled
        ? `❌ ${ev.title} — Cancelled`
        : `🎉 ${ev.title}`
    )
    .setDescription(ev.description)
    .addFields(
      {
        name: "📅 Date / Time",
        value: ev.date,
        inline: false
      },
      {
        name: "👥 RSVPs",
        value: `${ev.attendees.length}`,
        inline: true
      },
      {
        name: "🆔 Event ID",
        value: `\`${ev.id}\``,
        inline: true
      }
    )
    .setFooter({
      text: `JRC Bot • ${guild.name}`
    });
}

/* =========================================================
   TICKETS
   ========================================================= */

async function ticketLog(
  guild,
  title,
  description,
  color = ACCENT
) {
  const cfg = guildConfig(guild.id);

  if (!cfg.tickets.logChannel) return;

  const ch = guild.channels.cache.get(
    cfg.tickets.logChannel
  );

  if (!ch?.isTextBased()) return;

  await ch
    .send({
      embeds: [
        baseEmbed(color)
          .setTitle(title)
          .setDescription(description)
      ]
    })
    .catch(() => {});
}

async function handleTicket(i) {
  const sub = i.options.getSubcommand();
  const cfg = guildConfig(i.guild.id);

  if (sub === "setup") {
    if (!hasManageChannels(i))
      return i.reply({
        content:
          "❌ Manage Channels or Administrator is required.",
        flags: MessageFlags.Ephemeral
      });

    const category = i.options.getChannel("category");
    const support = i.options.getRole("support");
    const logs = i.options.getChannel("logs");

    cfg.tickets.enabled = true;
    cfg.tickets.category = category.id;
    cfg.tickets.supportRole = support.id;

    if (logs) cfg.tickets.logChannel = logs.id;

    saveConfig();

    return i.reply({
      embeds: [
        baseEmbed()
          .setTitle("🎫 Ticket System Configured")
          .setDescription(
            "The JRC ticket system is ready."
          )
          .addFields(
            {
              name: "📁 Category",
              value: `${category}`
            },
            {
              name: "🛠️ Support Role",
              value: `${support}`
            },
            {
              name: "📜 Logs",
              value: logs
                ? `${logs}`
                : "Not configured"
            }
          )
      ],
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "panel") {
    if (!hasManageChannels(i))
      return i.reply({
        content:
          "❌ Manage Channels or Administrator is required.",
        flags: MessageFlags.Ephemeral
      });

    if (
      !cfg.tickets.enabled ||
      !cfg.tickets.category ||
      !cfg.tickets.supportRole
    )
      return i.reply({
        content:
          "❌ Configure the ticket system first with `/ticket setup`.",
        flags: MessageFlags.Ephemeral
      });

    return i.channel.send({
      embeds: [
        baseEmbed()
          .setTitle("🎫 JRC Support")
          .setDescription(
            "Need help? Click the button below to open a private support ticket.\n\n" +
              "A member of the support team will assist you as soon as possible."
          )
      ],
      components: [ticketButtons()]
    }).then(() =>
      i.reply({
        content: "✅ Ticket panel posted.",
        flags: MessageFlags.Ephemeral
      })
    );
  }

  if (sub === "close")
    return closeTicket(i);

  if (sub === "add")
    return ticketAdd(i);

  if (sub === "remove")
    return ticketRemove(i);
}

async function createTicket(i) {
  const cfg = guildConfig(i.guild.id);

  if (
    !cfg.tickets.enabled ||
    !cfg.tickets.category ||
    !cfg.tickets.supportRole
  ) {
    return i.reply({
      content:
        "❌ Tickets are not configured yet.",
      flags: MessageFlags.Ephemeral
    });
  }

  if (cfg.tickets.open[i.user.id]) {
    const existing = i.guild.channels.cache.get(
      cfg.tickets.open[i.user.id]
    );

    if (existing)
      return i.reply({
        content: `❌ You already have an open ticket: ${existing}`,
        flags: MessageFlags.Ephemeral
      });

    delete cfg.tickets.open[i.user.id];
    saveConfig();
  }

  const category = i.guild.channels.cache.get(
    cfg.tickets.category
  );

  if (!category)
    return i.reply({
      content:
        "❌ The configured ticket category no longer exists.",
      flags: MessageFlags.Ephemeral
    });

  const channelName =
    `ticket-${i.user.username}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .slice(0, 80);

  const channel = await i.guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category.id,
    topic: `JRC-TICKET:${JSON.stringify({
      owner: i.user.id,
      createdAt: Date.now()
    })}`,
    permissionOverwrites: [
      {
        id: i.guild.id,
        deny: [
          PermissionFlagsBits.ViewChannel
        ]
      },
      {
        id: i.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles
        ]
      },
      {
        id: cfg.tickets.supportRole,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles
        ]
      },
      {
        id: client.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.ManageMessages
        ]
      }
    ]
  });

  cfg.tickets.open[i.user.id] = channel.id;
  saveConfig();

  await channel.send({
    content: `${i.user} <@&${cfg.tickets.supportRole}>`,
    embeds: [
      baseEmbed()
        .setTitle("🎫 Ticket Opened")
        .setDescription(
          "Thanks for contacting support. Please explain what you need help with. A staff member will respond here."
        )
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("jrc_ticket_close")
          .setLabel("Close Ticket")
          .setEmoji("🔒")
          .setStyle(ButtonStyle.Danger)
      )
    ]
  });

  await ticketLog(
    i.guild,
    "🎫 Ticket Created",
    `${i.user} opened ${channel}.`,
    "#57F287"
  );

  return i.reply({
    content: `✅ Your ticket has been created: ${channel}`,
    flags: MessageFlags.Ephemeral
  });
}

async function closeTicketButton(i) {
  return closeTicket(i);
}

async function closeTicket(i) {
  const data = ticketData(i.channel);

  if (!data)
    return i.reply({
      content:
        "❌ This command can only be used inside a ticket.",
      flags: MessageFlags.Ephemeral
    });

  const cfg = guildConfig(i.guild.id);
  const member = i.member;

  const isOwner = data.owner === i.user.id;
  const isSupport =
    cfg.tickets.supportRole &&
    member.roles?.cache?.has(
      cfg.tickets.supportRole
    );

  if (
    !isOwner &&
    !isSupport &&
    !hasManageChannels(i)
  )
    return i.reply({
      content:
        "❌ You don't have permission to close this ticket.",
      flags: MessageFlags.Ephemeral
    });

  await ticketLog(
    i.guild,
    "🎫 Ticket Closed",
    `**Ticket:** ${i.channel}\n**Closed by:** ${i.user}`,
    "#ED4245"
  );

  delete cfg.tickets.open[data.owner];
  saveConfig();

  await i.reply({
    content:
      "🔒 This ticket will be closed in 3 seconds."
  });

  setTimeout(() => {
    i.channel.delete("JRC ticket closed").catch(() => {});
  }, 3000);
}

async function ticketAdd(i) {
  const data = ticketData(i.channel);

  if (!data)
    return i.reply({
      content:
        "❌ This command can only be used inside a ticket.",
      flags: MessageFlags.Ephemeral
    });

  const cfg = guildConfig(i.guild.id);
  const member = i.member;

  const allowed =
    data.owner === i.user.id ||
    member.roles?.cache?.has(
      cfg.tickets.supportRole
    ) ||
    hasManageChannels(i);

  if (!allowed)
    return i.reply({
      content:
        "❌ You don't have permission to add users.",
      flags: MessageFlags.Ephemeral
    });

  const user = i.options.getUser("user");
  const target = await i.guild.members
    .fetch(user.id)
    .catch(() => null);

  if (!target)
    return i.reply({
      content: "❌ User not found.",
      flags: MessageFlags.Ephemeral
    });

  await i.channel.permissionOverwrites.edit(
    user.id,
    {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      AttachFiles: true
    }
  );

  return i.reply({
    content: `✅ ${user} was added to the ticket.`
  });
}

async function ticketRemove(i) {
  const data = ticketData(i.channel);

  if (!data)
    return i.reply({
      content:
        "❌ This command can only be used inside a ticket.",
      flags: MessageFlags.Ephemeral
    });

  const cfg = guildConfig(i.guild.id);
  const member = i.member;

  const allowed =
    data.owner === i.user.id ||
    member.roles?.cache?.has(
      cfg.tickets.supportRole
    ) ||
    hasManageChannels(i);

  if (!allowed)
    return i.reply({
      content:
        "❌ You don't have permission to remove users.",
      flags: MessageFlags.Ephemeral
    });

  const user = i.options.getUser("user");

  if (user.id === data.owner)
    return i.reply({
      content:
        "❌ You can't remove the ticket owner.",
      flags: MessageFlags.Ephemeral
    });

  await i.channel.permissionOverwrites.delete(
    user.id
  ).catch(() => {});

  return i.reply({
    content: `✅ ${user} was removed from the ticket.`
  });
}

/* =========================================================
   EMBED CREATOR
   ========================================================= */

const pendingEmbeds = new Map();
const pendingEventEdits = new Map();

function embedCreateModal() {
  const m = new ModalBuilder()
    .setCustomId("jrc_embed_create")
    .setTitle("Create Announcement Embed");

  const inputs = [
    [
      "title",
      "Title",
      "",
      TextInputStyle.Short,
      true,
      256
    ],
    [
      "description",
      "Description",
      "",
      TextInputStyle.Paragraph,
      true,
      4000
    ],
    [
      "color",
      "Color",
      ACCENT,
      TextInputStyle.Short,
      false,
      7
    ],
    [
      "image",
      "Image URL",
      "",
      TextInputStyle.Short,
      false,
      1000
    ],
    [
      "footer",
      "Footer",
      "",
      TextInputStyle.Short,
      false,
      256
    ]
  ];

  for (const [
    id,
    label,
    value,
    style,
    required,
    max
  ] of inputs) {
    m.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(id)
          .setLabel(label)
          .setStyle(style)
          .setRequired(required)
          .setMaxLength(max)
          .setValue(value)
      )
    );
  }

  return m;
}

function embedEditModal(record) {
  const m = new ModalBuilder()
    .setCustomId(`jrc_embed_edit_${record.id}`)
    .setTitle("Edit Announcement Embed");

  const fields = [
    [
      "title",
      "Title",
      record.title,
      TextInputStyle.Short,
      true,
      256
    ],
    [
      "description",
      "Description",
      record.description,
      TextInputStyle.Paragraph,
      true,
      4000
    ],
    [
      "color",
      "Color",
      record.color || ACCENT,
      TextInputStyle.Short,
      false,
      7
    ],
    [
      "image",
      "Image URL",
      record.image || "",
      TextInputStyle.Short,
      false,
      1000
    ],
    [
      "footer",
      "Footer",
      record.footer || "",
      TextInputStyle.Short,
      false,
      256
    ]
  ];

  for (const [
    id,
    label,
    val,
    style,
    req,
    max
  ] of fields) {
    m.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(id)
          .setLabel(label)
          .setStyle(style)
          .setRequired(req)
          .setMaxLength(max)
          .setValue(String(val).slice(0, max))
      )
    );
  }

  return m;
}

async function handleEmbed(i) {
  const sub = i.options.getSubcommand();
  const cfg = guildConfig(i.guild.id);

  if (!hasManageMessages(i))
    return i.reply({
      content:
        "❌ Manage Messages or Administrator is required.",
      flags: MessageFlags.Ephemeral
    });

  if (sub === "create") {
    const ch = i.options.getChannel("channel");
    const thumb =
      i.options.getString("thumbnail") || null;

    if (thumb && !validImage(thumb))
      return i.reply({
        content: "❌ Invalid thumbnail URL.",
        flags: MessageFlags.Ephemeral
      });

    pendingEmbeds.set(i.user.id, {
      channelId: ch.id,
      thumbnail: thumb
    });

    return i.showModal(embedCreateModal());
  }

  const id = i.options.getString("id");
  const record = cfg.embeds.find(
    x => x.id === id
  );

  if (!record)
    return i.reply({
      content: "❌ Saved embed not found.",
      flags: MessageFlags.Ephemeral
    });

  if (sub === "preview") {
    return i.reply({
      embeds: [buildSavedEmbed(record)],
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "delete") {
    const ch = i.guild.channels.cache.get(
      record.channelId
    );

    if (ch?.isTextBased())
      await ch.messages
        .delete(record.messageId)
        .catch(() => {});

    cfg.embeds = cfg.embeds.filter(
      x => x.id !== id
    );

    saveConfig();

    return i.reply({
      content: `🗑️ Embed **${id}** deleted.`,
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "edit") {
    pendingEmbeds.set(i.user.id, {
      recordId: id,
      channelId: record.channelId,
      thumbnail: record.thumbnail || null
    });

    return i.showModal(
      embedEditModal(record)
    );
  }
}

async function submitEmbed(i, editing = false) {
  const cfg = guildConfig(i.guild.id);
  const pending =
    pendingEmbeds.get(i.user.id) || {};

  const title =
    i.fields.getTextInputValue("title");

  const description =
    i.fields.getTextInputValue("description");

  const color =
    i.fields.getTextInputValue("color") ||
    ACCENT;

  const image =
    i.fields.getTextInputValue("image") ||
    null;

  const footer =
    i.fields.getTextInputValue("footer") ||
    null;

  if (!validColor(color))
    return i.reply({
      content:
        "❌ Invalid color. Use `#5865F2`.",
      flags: MessageFlags.Ephemeral
    });

  if (
    image &&
    !validImage(image)
  )
    return i.reply({
      content:
        "❌ Invalid image URL.",
      flags: MessageFlags.Ephemeral
    });

  const data = {
    title,
    description,
    color: normColor(color),
    image,
    thumbnail: pending.thumbnail || null,
    footer
  };

  if (editing) {
    const id = i.customId.replace(
      "jrc_embed_edit_",
      ""
    );

    const r = cfg.embeds.find(
      x => x.id === id
    );

    if (!r)
      return i.reply({
        content:
          "❌ Embed no longer exists.",
        flags: MessageFlags.Ephemeral
      });

    Object.assign(r, data);

    const ch = i.guild.channels.cache.get(
      r.channelId
    );

    const msg = await ch?.messages
      .fetch(r.messageId)
      .catch(() => null);

    if (!msg)
      return i.reply({
        content:
          "❌ Original embed message could not be found.",
        flags: MessageFlags.Ephemeral
      });

    await msg.edit({
      embeds: [buildSavedEmbed(r)]
    });

    saveConfig();
    pendingEmbeds.delete(i.user.id);

    return i.reply({
      content: `✅ Embed **${id}** updated.`,
      flags: MessageFlags.Ephemeral
    });
  }

  const channel = i.guild.channels.cache.get(
    pending.channelId
  );

  if (!channel?.isTextBased())
    return i.reply({
      content:
        "❌ Target channel could not be found.",
      flags: MessageFlags.Ephemeral
    });

  const id =
    `${Date.now().toString(36)}${Math.random()
      .toString(36)
      .slice(2, 6)}`;

  const record = {
    id,
    messageId: null,
    channelId: channel.id,
    title,
    description,
    color: normColor(color),
    image,
    thumbnail: pending.thumbnail || null,
    footer,
    createdBy: i.user.id,
    createdAt: Date.now()
  };

  const msg = await channel.send({
    embeds: [buildSavedEmbed(record)]
  });

  record.messageId = msg.id;

  cfg.embeds.push(record);
  saveConfig();
  pendingEmbeds.delete(i.user.id);

  return i.reply({
    content: `✅ Embed created.\n**ID:** \`${id}\``,
    flags: MessageFlags.Ephemeral
  });
}

/* =========================================================
   SERVER SETUP
   ========================================================= */

async function findOrCreateCategory(
  guild,
  name
) {
  const existing = guild.channels.cache.find(
    c =>
      c.type === ChannelType.GuildCategory &&
      c.name.toLowerCase() ===
        name.toLowerCase()
  );

  if (existing) return existing;

  return guild.channels.create({
    name,
    type: ChannelType.GuildCategory
  });
}

async function findOrCreateText(
  guild,
  name,
  parent = null
) {
  const existing = guild.channels.cache.find(
    c =>
      c.type === ChannelType.GuildText &&
      c.name.toLowerCase() ===
        name.toLowerCase()
  );

  if (existing) return existing;

  return guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: parent?.id || undefined
  });
}

async function handleServer(i) {
  if (!hasManageChannels(i))
    return i.reply({
      content:
        "❌ Manage Channels or Administrator is required.",
      flags: MessageFlags.Ephemeral
    });

  const g = i.guild;
  const cfg = guildConfig(g.id);

  const info =
    await findOrCreateCategory(
      g,
      "JRC • INFORMATION"
    );

  const community =
    await findOrCreateCategory(
      g,
      "JRC • COMMUNITY"
    );

  const support =
    await findOrCreateCategory(
      g,
      "JRC • SUPPORT"
    );

  const rules =
    await findOrCreateText(
      g,
      "rules",
      info
    );

  const announcements =
    await findOrCreateText(
      g,
      "announcements",
      info
    );

  const general =
    await findOrCreateText(
      g,
      "general",
      community
    );

  const botcmd =
    await findOrCreateText(
      g,
      "bot-commands",
      community
    );

  const tickets =
    await findOrCreateText(
      g,
      "tickets",
      support
    );

  const logs =
    await findOrCreateText(
      g,
      "jrc-logs",
      null
    );

  if (!cfg.tickets.category)
    cfg.tickets.category = support.id;

  if (!cfg.logs.channel)
    cfg.logs.channel = logs.id;

  cfg.serverSetup.completed = true;

  saveConfig();

  return i.reply({
    embeds: [
      baseEmbed("#57F287")
        .setTitle(
          "⚙️ JRC Server Setup Complete"
        )
        .setDescription(
          "JRC checked the server and created only missing recommended channels/categories. Existing channels were not deleted or renamed."
        )
        .addFields(
          {
            name: "📖 Information",
            value: `${rules}\n${announcements}`
          },
          {
            name: "💬 Community",
            value: `${general}\n${botcmd}`
          },
          {
            name: "🎫 Support",
            value: `${tickets}`
          },
          {
            name: "📜 Logs",
            value: `${logs}`
          }
        )
    ],
    flags: MessageFlags.Ephemeral
  });
}

/* =========================================================
   EVENTS
   ========================================================= */

function eventModal(customId, ev) {
  const m = new ModalBuilder()
    .setCustomId(customId)
    .setTitle("Edit Event");

  const fields = [
    [
      "title",
      "Title",
      ev.title,
      TextInputStyle.Short,
      true,
      256
    ],
    [
      "description",
      "Description",
      ev.description,
      TextInputStyle.Paragraph,
      true,
      4000
    ],
    [
      "date",
      "Date / Time",
      ev.date,
      TextInputStyle.Short,
      true,
      256
    ]
  ];

  for (const [
    id,
    label,
    value,
    style,
    required,
    max
  ] of fields) {
    m.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(id)
          .setLabel(label)
          .setStyle(style)
          .setRequired(required)
          .setMaxLength(max)
          .setValue(String(value).slice(0, max))
      )
    );
  }

  return m;
}

async function handleEvent(i) {
  const sub = i.options.getSubcommand();
  const cfg = guildConfig(i.guild.id);

  if (!hasManageEvents(i))
    return i.reply({
      content:
        "❌ Manage Events, Manage Server, or Administrator is required.",
      flags: MessageFlags.Ephemeral
    });

  if (sub === "create") {
    const ch =
      i.options.getChannel("channel") ||
      i.channel;

    const record = {
      id:
        `${Date.now().toString(36)}${Math.random()
          .toString(36)
          .slice(2, 6)}`,

      messageId: null,
      channelId: ch.id,
      title: i.options.getString("title"),
      date: i.options.getString("date"),
      description:
        i.options.getString("description"),
      attendees: [],
      cancelled: false,
      createdBy: i.user.id,
      createdAt: Date.now()
    };

    const msg = await ch.send({
      embeds: [
        eventEmbed(record, i.guild)
      ],
      components: [
        eventButtons(record.id)
      ]
    });

    record.messageId = msg.id;
    cfg.events.push(record);
    saveConfig();

    return i.reply({
      content:
        `🎉 Event created in ${ch}.\n` +
        `**Event ID:** \`${record.id}\``,
      flags: MessageFlags.Ephemeral
    });
  }

  const id =
    i.options.getString("id");

  const ev = cfg.events.find(
    x => x.id === id
  );

  if (!ev)
    return i.reply({
      content: "❌ Event not found.",
      flags: MessageFlags.Ephemeral
    });

  if (sub === "edit") {
    pendingEventEdits.set(
      i.user.id,
      id
    );

    return i.showModal(
      eventModal(
        `jrc_event_edit_${id}`,
        ev
      )
    );
  }

  if (sub === "cancel") {
    ev.cancelled = true;

    const ch =
      i.guild.channels.cache.get(
        ev.channelId
      );

    const msg =
      await ch?.messages
        .fetch(ev.messageId)
        .catch(() => null);

    if (msg) {
      await msg.edit({
        embeds: [
          eventEmbed(
            ev,
            i.guild
          )
        ],
        components: [
          eventButtons(
            ev.id,
            true
          )
        ]
      });
    }

    saveConfig();

    return i.reply({
      content:
        `❌ Event **${id}** cancelled.`,
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "list") {
    const active =
      cfg.events.filter(
        x => !x.cancelled
      );

    if (!active.length)
      return i.reply({
        content:
          "📭 There are no active events.",
        flags: MessageFlags.Ephemeral
      });

    const embed = baseEmbed()
      .setTitle("🎉 Active Events")
      .setDescription(
        active
          .map(
            x =>
              `**${x.title}**\n📅 ${x.date}\n🆔 \`${x.id}\`\n👥 ${x.attendees.length} RSVP(s)`
          )
          .join("\n\n")
      );

    return i.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral
    });
  }
}

async function submitEventEdit(i) {
  const id =
    i.customId.replace(
      "jrc_event_edit_",
      ""
    );

  const cfg =
    guildConfig(i.guild.id);

  const ev =
    cfg.events.find(
      x => x.id === id
    );

  if (!ev)
    return i.reply({
      content:
        "❌ Event not found.",
      flags: MessageFlags.Ephemeral
    });

  ev.title =
    i.fields.getTextInputValue(
      "title"
    );

  ev.description =
    i.fields.getTextInputValue(
      "description"
    );

  ev.date =
    i.fields.getTextInputValue(
      "date"
    );

  const ch =
    i.guild.channels.cache.get(
      ev.channelId
    );

  const msg =
    await ch?.messages
      .fetch(ev.messageId)
      .catch(() => null);

  if (msg) {
    await msg.edit({
      embeds: [
        eventEmbed(
          ev,
          i.guild
        )
      ],
      components: [
        eventButtons(
          ev.id,
          ev.cancelled
        )
      ]
    });
  }

  saveConfig();

  pendingEventEdits.delete(
    i.user.id
  );

  return i.reply({
    content:
      `✅ Event **${id}** updated.`,
    flags: MessageFlags.Ephemeral
  });
}

async function handleEventRSVP(i) {
  const id =
    i.customId.replace(
      "jrc_event_rsvp_",
      ""
    );

  const cfg =
    guildConfig(i.guild.id);

  const ev =
    cfg.events.find(
      x => x.id === id
    );

  if (!ev || ev.cancelled)
    return i.reply({
      content:
        "❌ This event is no longer active.",
      flags: MessageFlags.Ephemeral
    });

  const idx =
    ev.attendees.indexOf(
      i.user.id
    );

  if (idx >= 0) {
    ev.attendees.splice(
      idx,
      1
    );

    await i.reply({
      content:
        "❌ RSVP removed.",
      flags: MessageFlags.Ephemeral
    });
  } else {
    ev.attendees.push(
      i.user.id
    );

    await i.reply({
      content:
        "✅ You're on the RSVP list!",
      flags: MessageFlags.Ephemeral
    });
  }

  saveConfig();

  const msg =
    await i.message.fetch()
      .catch(() => null);

  if (msg) {
    await msg.edit({
      embeds: [
        eventEmbed(
          ev,
          i.guild
        )
      ],
      components: [
        eventButtons(
          ev.id
        )
      ]
    }).catch(() => {});
  }
}

/* =========================================================
   EXISTING HANDLERS
   ========================================================= */

async function handleJRC(i) {
  const cfg =
    guildConfig(i.guild.id);

  const sub =
    i.options.getSubcommand();

  if (sub === "help") {
    return i.reply({
      embeds: [
        baseEmbed()
          .setTitle("🤖 JRC Bot")
          .setDescription(
            "Professional all-in-one Discord server management."
          )
          .addFields(
            {
              name: "🛠️ Moderation",
              value:
                "`/mod` • `/automod` • `/logs`"
            },
            {
              name: "🎫 Community",
              value:
                "`/ticket` • `/event` • `/reactionrole`"
            },
            {
              name: "⚙️ Setup",
              value:
                "`/server setup` • `/welcome` • `/goodbye`"
            },
            {
              name: "🛡️ Security",
              value:
                "`/antinuke` • `/raid`"
            },
            {
              name: "🎨 Tools",
              value:
                "`/embed` • `/utility` • `/fun`"
            }
          )
      ],
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "settings") {
    return i.reply({
      embeds: [
        baseEmbed()
          .setTitle("⚙️ Server Settings")
          .addFields(
            {
              name: "👋 Welcome",
              value: cfg.welcome.enabled
                ? "🟢 Enabled"
                : "🔴 Disabled",
              inline: true
            },
            {
              name: "👋 Goodbye",
              value: cfg.goodbye.enabled
                ? "🟢 Enabled"
                : "🔴 Disabled",
              inline: true
            },
            {
              name: "🛡️ AutoMod",
              value: cfg.automod.enabled
                ? "🟢 Enabled"
                : "🔴 Disabled",
              inline: true
            },
            {
              name: "📜 Logs",
              value: cfg.logs.enabled
                ? "🟢 Enabled"
                : "🔴 Disabled",
              inline: true
            },
            {
              name: "🎫 Tickets",
              value: cfg.tickets.enabled
                ? "🟢 Enabled"
                : "🔴 Disabled",
              inline: true
            },
            {
              name: "🛡️ Anti-Nuke",
              value: cfg.antinuke.enabled
                ? "🟢 Enabled"
                : "🔴 Disabled",
              inline: true
            },
            {
              name: "🚨 Raid",
              value: cfg.raid.enabled
                ? "🟢 Enabled"
                : "🔴 Disabled",
              inline: true
            }
          )
      ],
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "about") {
    return i.reply({
      embeds: [
        baseEmbed()
          .setTitle("🤖 JRC Bot")
          .setDescription(
            "JRC Bot is a single-file Discord management bot built for moderation, automation, support, events and server utilities."
          )
          .addFields({
            name: "✨ Style",
            value:
              "Clean • Modern • Professional"
          })
      ],
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "status") {
    return i.reply({
      embeds: [
        baseEmbed("#57F287")
          .setTitle("🟢 JRC Bot Status")
          .addFields(
            {
              name: "Latency",
              value: `${client.ws.ping}ms`,
              inline: true
            },
            {
              name: "Servers",
              value: `${client.guilds.cache.size}`,
              inline: true
            },
            {
              name: "Uptime",
              value: `${Math.floor(
                client.uptime / 1000
              )}s`,
              inline: true
            }
          )
      ],
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleGreetingCommand(
  i,
  type
) {
  const cfg =
    guildConfig(i.guild.id);

  const sub =
    i.options.getSubcommand();

  if (sub === "setup") {
    if (!hasManageMessages(i))
      return i.reply({
        content:
          "❌ Manage Messages or Administrator is required.",
        flags: MessageFlags.Ephemeral
      });

    return i.reply(
      greetingPanel(
        type,
        i.guild
      )
    );
  }

  if (sub === "disable") {
    cfg[type].enabled = false;
    saveConfig();

    return i.reply({
      content:
        `🔴 ${type} disabled.`,
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "preview") {
    return i.reply({
      embeds: [
        buildGreetingEmbed(
          type,
          i.member,
          cfg[type]
        )
      ],
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "test") {
    if (!cfg[type].channel)
      return i.reply({
        content:
          `❌ Configure a ${type} channel first.`,
        flags: MessageFlags.Ephemeral
      });

    const ch =
      i.guild.channels.cache.get(
        cfg[type].channel
      );

    if (!ch?.isTextBased())
      return i.reply({
        content:
          "❌ Configured channel is unavailable.",
        flags: MessageFlags.Ephemeral
      });

    await ch.send({
      embeds: [
        buildGreetingEmbed(
          type,
          i.member,
          cfg[type]
        )
      ]
    });

    return i.reply({
      content:
        `✅ ${type} test sent.`,
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "message") {
    return i.reply({
      content:
        cfg[type].message,
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "channel") {
    return i.reply({
      content:
        `Select the ${type} channel below.`,
      components: [
        new ActionRowBuilder().addComponents(
          new ChannelSelectMenuBuilder()
            .setCustomId(
              `jrc_select_channel_${type}`
            )
            .setPlaceholder(
              `Select ${type} channel`
            )
            .addChannelTypes(
              ChannelType.GuildText
            )
        )
      ],
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleMod(i) {
  const sub =
    i.options.getSubcommand();

  if (
    !i.memberPermissions?.has(
      PermissionFlagsBits.ModerateMembers
    ) &&
    !hasAdmin(i)
  )
    return i.reply({
      content:
        "❌ Moderate Members or Administrator is required.",
      flags: MessageFlags.Ephemeral
    });

  if (sub === "ban") {
    const user =
      i.options.getUser("user");

    const member =
      await i.guild.members
        .fetch(user.id)
        .catch(() => null);

    if (!member?.bannable)
      return i.reply({
        content:
          "❌ I cannot ban that member.",
        flags: MessageFlags.Ephemeral
      });

    const reason =
      i.options.getString("reason") ||
      "No reason provided";

    await member.ban({ reason });

    await logAction(
      i.guild,
      "🔨 MEMBER BANNED",
      `${user} was banned by ${i.user}.`,
      "#ED4245",
      [
        {
          name: "Reason",
          value: reason
        }
      ]
    );

    return i.reply(
      `🔨 ${user} has been banned.`
    );
  }

  if (sub === "kick") {
    const user =
      i.options.getUser("user");

    const member =
      await i.guild.members
        .fetch(user.id)
        .catch(() => null);

    if (!member?.kickable)
      return i.reply({
        content:
          "❌ I cannot kick that member.",
        flags: MessageFlags.Ephemeral
      });

    const reason =
      i.options.getString("reason") ||
      "No reason provided";

    await member.kick(reason);

    await logAction(
      i.guild,
      "👢 MEMBER KICKED",
      `${user} was kicked by ${i.user}.`,
      "#ED4245",
      [
        {
          name: "Reason",
          value: reason
        }
      ]
    );

    return i.reply(
      `👢 ${user} has been kicked.`
    );
  }

  if (sub === "timeout") {
    const user =
      i.options.getUser("user");

    const member =
      await i.guild.members
        .fetch(user.id)
        .catch(() => null);

    if (!member?.moderatable)
      return i.reply({
        content:
          "❌ I cannot timeout that member.",
        flags: MessageFlags.Ephemeral
      });

    const minutes =
      i.options.getInteger(
        "minutes"
      );

    const reason =
      i.options.getString("reason") ||
      "No reason provided";

    await member.timeout(
      minutes * 60000,
      reason
    );

    await logAction(
      i.guild,
      "⏱️ MEMBER TIMED OUT",
      `${user} was timed out by ${i.user}.`,
      "#FEE75C",
      [
        {
          name: "Duration",
          value: `${minutes} minute(s)`
        },
        {
          name: "Reason",
          value: reason
        }
      ]
    );

    return i.reply(
      `⏱️ ${user} has been timed out for ${minutes} minute(s).`
    );
  }

  if (sub === "warn") {
    const user =
      i.options.getUser("user");

    const reason =
      i.options.getString(
        "reason"
      );

    const cfg =
      guildConfig(
        i.guild.id
      );

    if (!cfg.warnings[user.id])
      cfg.warnings[user.id] = [];

    cfg.warnings[user.id].push({
      reason,
      moderator: i.user.id,
      createdAt: Date.now()
    });

    saveConfig();

    await logAction(
      i.guild,
      "⚠️ MEMBER WARNED",
      `${user} was warned by ${i.user}.`,
      "#FEE75C",
      [
        {
          name: "Reason",
          value: reason
        }
      ]
    );

    return i.reply(
      `⚠️ ${user} has been warned.`
    );
  }

  if (sub === "warnings") {
    const user =
      i.options.getUser("user");

    const cfg =
      guildConfig(
        i.guild.id
      );

    const warnings =
      cfg.warnings[user.id] ||
      [];

    return i.reply({
      embeds: [
        baseEmbed("#FEE75C")
          .setTitle(
            `⚠️ Warnings • ${user.tag}`
          )
          .setDescription(
            warnings.length
              ? warnings
                  .map(
                    (w, n) =>
                      `**${n + 1}.** ${w.reason}`
                  )
                  .join("\n")
              : "No warnings."
          )
      ],
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "clear") {
    const amount =
      i.options.getInteger(
        "amount"
      );

    if (!i.channel?.isTextBased())
      return i.reply({
        content:
          "❌ This isn't a text channel.",
        flags: MessageFlags.Ephemeral
      });

    const deleted =
      await i.channel.bulkDelete(
        amount,
        true
      );

    await logAction(
      i.guild,
      "🧹 MESSAGES CLEARED",
      `${i.user} cleared ${deleted.size} message(s) in ${i.channel}.`,
      "#FEE75C"
    );

    return i.reply({
      content:
        `🧹 Deleted ${deleted.size} message(s).`,
      flags: MessageFlags.Ephemeral
    });
  }

  if (
    sub === "lock" ||
    sub === "unlock"
  ) {
    if (!i.channel?.permissionOverwrites)
      return i.reply({
        content:
          "❌ This channel cannot be locked.",
        flags: MessageFlags.Ephemeral
      });

    const locked =
      sub === "lock";

    await i.channel.permissionOverwrites.edit(
      i.guild.roles.everyone,
      {
        SendMessages: !locked
      }
    );

    await logAction(
      i.guild,
      locked
        ? "🔒 CHANNEL LOCKED"
        : "🔓 CHANNEL UNLOCKED",
      `${i.user} ${
        locked
          ? "locked"
          : "unlocked"
      } ${i.channel}.`,
      locked
        ? "#ED4245"
        : "#57F287"
    );

    return i.reply(
      locked
        ? "🔒 Channel locked."
        : "🔓 Channel unlocked."
    );
  }
}

async function handleAutoMod(i) {
  const cfg =
    guildConfig(
      i.guild.id
    ).automod;

  const sub =
    i.options.getSubcommand();

  if (!hasManageMessages(i))
    return i.reply({
      content:
        "❌ Manage Messages or Administrator is required.",
      flags: MessageFlags.Ephemeral
    });

  if (sub === "setup") {
    return i.reply({
      embeds: [
        baseEmbed()
          .setTitle(
            "🛡️ AutoMod"
          )
          .setDescription(
            `Status: ${
              cfg.enabled
                ? "🟢 Enabled"
                : "🔴 Disabled"
            }\n\n` +
              `Blocked words: ${cfg.words.length}\n` +
              `Spam: ${
                cfg.spam.enabled
                  ? "🟢"
                  : "🔴"
              }\n` +
              `Links: ${
                cfg.links
                  ? "🟢"
                  : "🔴"
              }`
          )
      ],
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "enable") {
    cfg.enabled = true;
    saveConfig();

    return i.reply(
      "🟢 AutoMod enabled."
    );
  }

  if (sub === "disable") {
    cfg.enabled = false;
    saveConfig();

    return i.reply(
      "🔴 AutoMod disabled."
    );
  }

  if (sub === "words") {
    const words =
      i.options
        .getString("words")
        .split(",")
        .map(x => x.trim())
        .filter(Boolean);

    cfg.words = words;
    saveConfig();

    return i.reply({
      content:
        `✅ Added ${words.length} blocked word(s).`,
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "spam") {
    const limit =
      i.options.getInteger(
        "limit"
      );

    cfg.spam.enabled = true;
    cfg.spam.limit = limit;

    saveConfig();

    return i.reply({
      content:
        `✅ Spam protection set to ${limit} messages.`,
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "links") {
    cfg.links =
      i.options.getBoolean(
        "enabled"
      );

    saveConfig();

    return i.reply({
      content:
        `🔗 Link blocking ${
          cfg.links
            ? "enabled"
            : "disabled"
        }.`,
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleLogs(i) {
  const cfg =
    guildConfig(
      i.guild.id
    ).logs;

  const sub =
    i.options.getSubcommand();

  if (!hasManageMessages(i))
    return i.reply({
      content:
        "❌ Manage Messages or Administrator is required.",
      flags: MessageFlags.Ephemeral
    });

  if (sub === "setup") {
    cfg.enabled = true;
    cfg.channel = i.channel.id;

    saveConfig();

    return i.reply({
      content:
        `📜 Logs enabled in ${i.channel}.`,
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "disable") {
    cfg.enabled = false;
    saveConfig();

    return i.reply({
      content:
        "🔴 Logs disabled.",
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "test") {
    await logAction(
      i.guild,
      "🧪 LOG TEST",
      `${i.user} tested the logging system.`,
      ACCENT
    );

    return i.reply({
      content:
        "✅ Log test sent.",
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleReactionRole(i) {
  if (!hasManageMessages(i))
    return i.reply({
      content:
        "❌ Manage Messages or Administrator is required.",
      flags: MessageFlags.Ephemeral
    });

  const cfg =
    guildConfig(
      i.guild.id
    );

  const sub =
    i.options.getSubcommand();

  if (sub === "create") {
    const ch =
      i.options.getChannel(
        "channel"
      );

    const message =
      i.options.getString(
        "message"
      );

    const msg =
      await ch.send({
        content: message
      });

    return i.reply({
      content:
        `✅ Reaction role message created.\nID: \`${msg.id}\``,
      flags: MessageFlags.Ephemeral
    });
  }

  const message =
    i.options.getString(
      "message"
    );

  const emoji =
    i.options.getString(
      "emoji"
    );

  if (sub === "add") {
    const role =
      i.options.getRole(
        "role"
      );

    cfg.reactionRoles.push({
      message,
      emoji,
      role: role.id
    });

    saveConfig();

    const ch =
      i.channel;

    const msg =
      await ch.messages
        .fetch(message)
        .catch(() => null);

    if (msg)
      await msg.react(
        emoji
      ).catch(() => {});

    return i.reply({
      content:
        `✅ Reaction role added for ${role}.`,
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "remove") {
    cfg.reactionRoles =
      cfg.reactionRoles.filter(
        x =>
          !(
            x.message === message &&
            x.emoji === emoji
          )
      );

    saveConfig();

    return i.reply({
      content:
        "🗑️ Reaction role removed.",
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "list") {
    return i.reply({
      embeds: [
        baseEmbed()
          .setTitle(
            "🎭 Reaction Roles"
          )
          .setDescription(
            cfg.reactionRoles.length
              ? cfg.reactionRoles
                  .map(
                    x =>
                      `${x.emoji} → <@&${x.role}> • \`${x.message}\``
                  )
                  .join("\n")
              : "No reaction roles configured."
          )
      ],
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleUtility(i) {
  const sub =
    i.options.getSubcommand();

  if (sub === "userinfo") {
    const user =
      i.options.getUser("user") ||
      i.user;

    return i.reply({
      embeds: [
        baseEmbed()
          .setTitle(
            `👤 ${user.tag}`
          )
          .setThumbnail(
            user.displayAvatarURL({
              extension: "png",
              size: 256
            })
          )
          .addFields(
            {
              name: "ID",
              value: user.id,
              inline: true
            },
            {
              name: "Bot",
              value: user.bot
                ? "Yes"
                : "No",
              inline: true
            }
          )
      ],
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "serverinfo") {
    return i.reply({
      embeds: [
        baseEmbed()
          .setTitle(
            `🏠 ${i.guild.name}`
          )
          .addFields(
            {
              name: "Members",
              value: `${i.guild.memberCount}`,
              inline: true
            },
            {
              name: "Channels",
              value: `${i.guild.channels.cache.size}`,
              inline: true
            },
            {
              name: "Roles",
              value: `${i.guild.roles.cache.size}`,
              inline: true
            }
          )
      ],
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "avatar") {
    const user =
      i.options.getUser("user") ||
      i.user;

    return i.reply({
      embeds: [
        baseEmbed()
          .setTitle(
            `🖼️ ${user.tag}'s Avatar`
          )
          .setImage(
            user.displayAvatarURL({
              extension: "png",
              size: 1024
            })
          )
      ],
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "roleinfo") {
    const role =
      i.options.getRole(
        "role"
      );

    return i.reply({
      embeds: [
        baseEmbed(
          role.hexColor === "#000000"
            ? ACCENT
            : role.hexColor
        )
          .setTitle(
            `🏷️ ${role.name}`
          )
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
      ],
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "channelinfo") {
    const ch =
      i.options.getChannel(
        "channel"
      ) || i.channel;

    return i.reply({
      embeds: [
        baseEmbed()
          .setTitle(
            `📺 ${ch.name}`
          )
          .addFields(
            {
              name: "ID",
              value: ch.id,
              inline: true
            },
            {
              name: "Type",
              value: `${ch.type}`,
              inline: true
            }
          )
      ],
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleFun(i) {
  const sub =
    i.options.getSubcommand();

  if (sub === "8ball") {
    const answers = [
      "Yes.",
      "No.",
      "Probably.",
      "Definitely.",
      "Maybe.",
      "Ask again later."
    ];

    return i.reply({
      embeds: [
        baseEmbed()
          .setTitle(
            "🎱 Magic 8-Ball"
          )
          .setDescription(
            answers[
              Math.floor(
                Math.random() *
                  answers.length
              )
            ]
          )
      ]
    });
  }

  if (sub === "coinflip") {
    return i.reply(
      Math.random() < 0.5
        ? "🪙 Heads!"
        : "🪙 Tails!"
    );
  }

  if (sub === "dice") {
    return i.reply(
      `🎲 You rolled **${
        Math.floor(
          Math.random() * 6
        ) + 1
      }**!`
    );
  }

  if (sub === "choose") {
    const options =
      i.options
        .getString(
          "options"
        )
        .split(",")
        .map(x => x.trim())
        .filter(Boolean);

    if (!options.length)
      return i.reply(
        "❌ No options provided."
      );

    return i.reply(
      `🎯 I choose **${
        options[
          Math.floor(
            Math.random() *
              options.length
          )
        ]
      }**!`
    );
  }

  if (sub === "poll") {
    const question =
      i.options.getString(
        "question"
      );

    const msg =
      await i.reply({
        content:
          `📊 **Poll:** ${question}\n\n👍 Yes\n👎 No`,
        fetchReply: true
      });

    await msg.react("👍");
    await msg.react("👎");
  }
}

async function handleAntiNuke(i) {
  const cfg =
    guildConfig(
      i.guild.id
    ).antinuke;

  const sub =
    i.options.getSubcommand();

  if (!hasAdmin(i))
    return i.reply({
      content:
        "❌ Administrator is required.",
      flags: MessageFlags.Ephemeral
    });

  if (sub === "setup") {
    cfg.enabled = true;
    saveConfig();

    return i.reply(
      "🛡️ Anti-nuke enabled with current configuration."
    );
  }

  if (sub === "enable") {
    cfg.enabled = true;
    saveConfig();

    return i.reply(
      "🟢 Anti-nuke enabled."
    );
  }

  if (sub === "disable") {
    cfg.enabled = false;
    saveConfig();

    return i.reply(
      "🔴 Anti-nuke disabled."
    );
  }

  if (sub === "config") {
    cfg.threshold =
      i.options.getInteger(
        "threshold"
      );

    saveConfig();

    return i.reply(
      `✅ Anti-nuke threshold set to ${cfg.threshold}.`
    );
  }

  if (sub === "status") {
    return i.reply({
      content:
        `🛡️ Anti-nuke: ${
          cfg.enabled
            ? "🟢 Enabled"
            : "🔴 Disabled"
        }\nThreshold: ${cfg.threshold}`,
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleRaid(i) {
  const cfg =
    guildConfig(
      i.guild.id
    ).raid;

  const sub =
    i.options.getSubcommand();

  if (!hasAdmin(i))
    return i.reply({
      content:
        "❌ Administrator is required.",
      flags: MessageFlags.Ephemeral
    });

  if (sub === "setup") {
    cfg.enabled = true;
    saveConfig();

    return i.reply(
      "🚨 Raid protection enabled."
    );
  }

  if (sub === "enable") {
    cfg.enabled = true;
    saveConfig();

    return i.reply(
      "🟢 Raid protection enabled."
    );
  }

  if (sub === "disable") {
    cfg.enabled = false;
    saveConfig();

    return i.reply(
      "🔴 Raid protection disabled."
    );
  }

  if (sub === "config") {
    cfg.threshold =
      i.options.getInteger(
        "threshold"
      );

    saveConfig();

    return i.reply(
      `✅ Raid threshold set to ${cfg.threshold}.`
    );
  }

  if (sub === "status") {
    return i.reply({
      content:
        `🚨 Raid protection: ${
          cfg.enabled
            ? "🟢 Enabled"
            : "🔴 Disabled"
        }\nThreshold: ${cfg.threshold}`,
      flags: MessageFlags.Ephemeral
    });
  }
}

/* =========================================================
   INTERACTIONS
   ========================================================= */

client.on(
  "interactionCreate",
  async i => {
    try {
      if (
        i.isChatInputCommand()
      ) {
        if (
          i.commandName ===
          "jrc"
        )
          return handleJRC(i);

        if (
          i.commandName ===
          "welcome"
        )
          return handleGreetingCommand(
            i,
            "welcome"
          );

        if (
          i.commandName ===
          "goodbye"
        )
          return handleGreetingCommand(
            i,
            "goodbye"
          );

        if (
          i.commandName ===
          "mod"
        )
          return handleMod(i);

        if (
          i.commandName ===
          "automod"
        )
          return handleAutoMod(i);

        if (
          i.commandName ===
          "logs"
        )
          return handleLogs(i);

        if (
          i.commandName ===
          "reactionrole"
        )
          return handleReactionRole(i);

        if (
          i.commandName ===
          "utility"
        )
          return handleUtility(i);

        if (
          i.commandName ===
          "fun"
        )
          return handleFun(i);

        if (
          i.commandName ===
          "antinuke"
        )
          return handleAntiNuke(i);

        if (
          i.commandName ===
          "raid"
        )
          return handleRaid(i);

        if (
          i.commandName ===
          "ticket"
        )
          return handleTicket(i);

        if (
          i.commandName ===
          "embed"
        )
          return handleEmbed(i);

        if (
          i.commandName ===
          "server"
        )
          return handleServer(i);

        if (
          i.commandName ===
          "event"
        )
          return handleEvent(i);
      }

      if (i.isButton()) {
        if (
          i.customId ===
          "jrc_ticket_create"
        )
          return createTicket(i);

        if (
          i.customId ===
          "jrc_ticket_close"
        )
          return closeTicketButton(i);

        if (
          i.customId.startsWith(
            "jrc_event_rsvp_"
          )
        )
          return handleEventRSVP(i);

        const parts =
          i.customId.split("_");

        if (
          parts[0] !==
          "jrc"
        )
          return;

        const type =
          parts[2];

        const action =
          parts[1];

        const cfg =
          guildConfig(
            i.guild.id
          )[type];

        if (!cfg)
          return;

        if (
          action ===
          "enable"
        ) {
          cfg.enabled =
            true;

          saveConfig();

          return i.update(
            greetingPanel(
              type,
              i.guild
            )
          );
        }

        if (
          action ===
          "disable"
        ) {
          cfg.enabled =
            false;

          saveConfig();

          return i.update(
            greetingPanel(
              type,
              i.guild
            )
          );
        }

        if (
          action ===
          "preview"
        ) {
          return i.reply({
            embeds: [
              buildGreetingEmbed(
                type,
                i.member,
                cfg
              )
            ],
            flags: MessageFlags.Ephemeral
          });
        }

        if (
          action ===
          "channel"
        ) {
          return i.reply({
            content:
              `Select the ${type} channel below.`,
            components: [
              new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder()
                  .setCustomId(
                    `jrc_select_channel_${type}`
                  )
                  .setPlaceholder(
                    `Select ${type} channel`
                  )
                  .addChannelTypes(
                    ChannelType.GuildText
                  )
              ]
            ],
            flags: MessageFlags.Ephemeral
          });
        }

        if (
          action ===
          "config"
        ) {
          const modal =
            new ModalBuilder()
              .setCustomId(
                `jrc_modal_${type}`
              )
              .setTitle(
                `Configure ${type}`
              );

          const fields = [
            [
              "title",
              "Title",
              cfg.title,
              TextInputStyle.Short,
              true,
              256
            ],
            [
              "description",
              "Description",
              cfg.description,
              TextInputStyle.Paragraph,
              true,
              4000
            ],
            [
              "message",
              "Message",
              cfg.message,
              TextInputStyle.Paragraph,
              true,
              4000
            ],
            [
              "color",
              "Color",
              cfg.color,
              TextInputStyle.Short,
              false,
              7
            ],
            [
              "image",
              "Image URL",
              cfg.image || "",
              TextInputStyle.Short,
              false,
              1000
            ]
          ];

          for (
            const [
              id,
              label,
              value,
              style,
              required,
              max
            ] of fields
          ) {
            modal.addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId(id)
                  .setLabel(label)
                  .setStyle(style)
                  .setRequired(
                    required
                  )
                  .setMaxLength(
                    max
                  )
                  .setValue(
                    String(
                      value || ""
                    ).slice(
                      0,
                      max
                    )
                  )
              )
            );
          }

          return i.showModal(
            modal
          );
        }
      }

      if (
        i.isChannelSelectMenu()
      ) {
        if (
          !i.customId.startsWith(
            "jrc_select_channel_"
          )
        )
          return;

        const type =
          i.customId.replace(
            "jrc_select_channel_",
            ""
          );

        const ch =
          i.channels.first();

        const cfg =
          guildConfig(
            i.guild.id
          )[type];

        if (!cfg)
          return;

        cfg.channel =
          ch.id;

        saveConfig();

        return i.update({
          content:
            `📢 ${type} channel set to ${ch}.`,
          components: []
        });
      }

      if (
        i.isModalSubmit()
      ) {
        if (
          i.customId ===
          "jrc_embed_create"
        )
          return submitEmbed(
            i,
            false
          );

        if (
          i.customId.startsWith(
            "jrc_embed_edit_"
          )
        )
          return submitEmbed(
            i,
            true
          );

        if (
          i.customId.startsWith(
            "jrc_event_edit_"
          )
        )
          return submitEventEdit(
            i
          );

        if (
          !i.customId.startsWith(
            "jrc_modal_"
          )
        )
          return;

        const type =
          i.customId.replace(
            "jrc_modal_",
            ""
          );

        const cfg =
          guildConfig(
            i.guild.id
          )[type];

        const title =
          i.fields.getTextInputValue(
            "title"
          );

        const description =
          i.fields.getTextInputValue(
            "description"
          );

        const message =
          i.fields.getTextInputValue(
            "message"
          );

        const color =
          i.fields.getTextInputValue(
            "color"
          ) || ACCENT;

        const image =
          i.fields.getTextInputValue(
            "image"
          ) || null;

        if (!validColor(color))
          return i.reply({
            content:
              "❌ Invalid color. Use a hex color such as `#5865F2`.",
            flags:
              MessageFlags.Ephemeral
          });

        if (
          image &&
          !validImage(image)
        )
          return i.reply({
            content:
              "❌ Invalid image/GIF URL.",
            flags:
              MessageFlags.Ephemeral
          });

        Object.assign(
          cfg,
          {
            title,
            description,
            message,
            color:
              normColor(
                color
              ),
            image
          }
        );

        saveConfig();

        return i.reply({
          embeds: [
            baseEmbed(
              cfg.color
            )
              .setTitle(
                "✅ Configuration Saved"
              )
              .setDescription(
                `Your **${type}** embed configuration has been saved.`
              )
          ],
          flags:
            MessageFlags.Ephemeral
        });
      }
    } catch (e) {
      console.error(
        "Interaction error:",
        e
      );

      await safeReply(
        i,
        {
          content:
            "❌ Something went wrong while processing that.",
          flags:
            MessageFlags.Ephemeral
        }
      );
    }
  }
);

/* =========================================================
   WELCOME / GOODBYE / RAID
   ========================================================= */

client.on(
  "guildMemberAdd",
  async member => {
    try {
      const cfg =
        guildConfig(
          member.guild.id
        );

      await logAction(
        member.guild,
        "📥 MEMBER JOINED",
        `${member} joined the server.`,
        "#57F287",
        [
          {
            name: "👤 User",
            value: `${member.user} (${member.id})`
          }
        ]
      );

      if (cfg.raid.enabled) {
        const now =
          Date.now();

        cfg.raid._joins =
          (
            cfg.raid._joins ||
            []
          ).filter(
            t =>
              now - t <
              cfg.raid.interval
          );

        cfg.raid._joins.push(
          now
        );

        if (
          cfg.raid._joins
            .length >=
          cfg.raid.threshold
        ) {
          cfg.raid.activeUntil =
            now + 60000;

          await logAction(
            member.guild,
            "🚨 RAID DETECTED",
            `Raid protection triggered after **${cfg.raid._joins.length} joins**.`,
            "#ED4245"
          );

          if (
            cfg.raid.action ===
            "kick"
          ) {
            for (
              const [
                ,
                m
              ] of member.guild
                .members.cache
            ) {
              if (
                !m.user.bot &&
                m.id !==
                  member.guild
                    .ownerId &&
                m.kickable &&
                m.joinedTimestamp &&
                Date.now() -
                  m.joinedTimestamp <
                  30000
              ) {
                await m
                  .kick(
                    "Raid protection"
                  )
                  .catch(
                    () => {}
                  );
              }
            }
          }

          saveConfig();
        }
      }

      const s =
        cfg.welcome;

      if (
        !s.enabled ||
        !s.channel
      )
        return;

      const ch =
        member.guild.channels.cache.get(
          s.channel
        );

      if (!ch?.isTextBased())
        return;

      await ch.send({
        embeds: [
          buildGreetingEmbed(
            "welcome",
            member,
            s
          )
        ]
      });
    } catch (e) {
      console.error(
        "Welcome error:",
        e
      );
    }
  }
);

client.on(
  "guildMemberRemove",
  async member => {
    try {
      const cfg =
        guildConfig(
          member.guild.id
        );

      await logAction(
        member.guild,
        "📤 MEMBER LEFT",
        `${
          member.user?.tag ||
          member.id
        } left the server.`,
        "#ED4245",
        [
          {
            name: "👤 User",
            value:
              member.user?.tag ||
              member.id
          }
        ]
      );

      const s =
        cfg.goodbye;

      if (
        !s.enabled ||
        !s.channel
      )
        return;

      const ch =
        member.guild.channels.cache.get(
          s.channel
        );

      if (ch?.isTextBased())
        await ch.send({
          embeds: [
            buildGreetingEmbed(
              "goodbye",
              member,
              s
            )
          ]
        });
    } catch (e) {
      console.error(
        "Goodbye error:",
        e
      );
    }
  }
);

/* =========================================================
   AUTOMOD
   ========================================================= */

const spamTracker =
  new Map();

client.on(
  "messageCreate",
  async message => {
    try {
      if (
        !message.guild ||
        message.author.bot
      )
        return;

      const cfg =
        guildConfig(
          message.guild.id
        ).automod;

      if (!cfg.enabled)
        return;

      const content =
        message.content.toLowerCase();

      if (
        cfg.words.some(
          w =>
            content.includes(
              w.toLowerCase()
            )
        )
      ) {
        await message
          .delete()
          .catch(
            () => {}
          );

        const w =
          await message.channel
            .send({
              content:
                `🛡️ ${message.author}, that message was removed by automod.`
            })
            .catch(
              () => null
            );

        if (w)
          setTimeout(
            () =>
              w.delete().catch(
                () => {}
              ),
            5000
          );

        await logAction(
          message.guild,
          "🛡️ AUTOMOD • BLOCKED WORD",
          `${message.author} triggered blocked-word protection in ${message.channel}.`,
          "#FEE75C"
        );

        return;
      }

      if (
        cfg.links &&
        /(https?:\/\/|www\.)/i.test(
          message.content
        ) &&
        !message.member?.permissions.has(
          PermissionFlagsBits.ManageMessages
        )
      ) {
        await message
          .delete()
          .catch(
            () => {}
          );

        const w =
          await message.channel
            .send({
              content:
                `🔗 ${message.author}, links aren't allowed here.`
            })
            .catch(
              () => null
            );

        if (w)
          setTimeout(
            () =>
              w.delete().catch(
                () => {}
              ),
            5000
          );

        await logAction(
          message.guild,
          "🔗 AUTOMOD • LINK BLOCKED",
          `${message.author} posted a blocked link in ${message.channel}.`,
          "#FEE75C"
        );

        return;
      }

      if (cfg.spam.enabled) {
        const key =
          `${message.guild.id}:${message.author.id}`;

        const now =
          Date.now();

        const recent =
          (
            spamTracker.get(
              key
            ) || []
          ).filter(
            t =>
              now - t <
              cfg.spam.interval
          );

        recent.push(now);

        spamTracker.set(
          key,
          recent
        );

        if (
          recent.length >=
          cfg.spam.limit
        ) {
          spamTracker.set(
            key,
            []
          );

          if (
            message.member
              ?.moderatable
          ) {
            await message.member
              .timeout(
                10000,
                "Automod spam protection"
              )
              .catch(
                () => {}
              );
          }

          await logAction(
            message.guild,
            "🛡️ SPAM PROTECTION",
            `${message.author} triggered spam protection.`,
            "#FEE75C"
          );
        }
      }
    } catch (e) {
      console.error(
        "Automod error:",
        e
      );
    }
  }
);

/* =========================================================
   REACTION ROLES
   ========================================================= */

async function reactionRoleEvent(
  reaction,
  user,
  add
) {
  try {
    if (user.bot) return;

    if (reaction.partial)
      await reaction
        .fetch()
        .catch(
          () => {}
        );

    const guild =
      reaction.message.guild;

    if (!guild) return;

    const cfg =
      guildConfig(
        guild.id
      );

    const emojiName =
      reaction.emoji.id
        ? `<:${reaction.emoji.name}:${reaction.emoji.id}>`
        : reaction.emoji.name;

    const match =
      cfg.reactionRoles.find(
        x =>
          x.message ===
            reaction.message.id &&
          (
            x.emoji ===
              reaction.emoji.name ||
            x.emoji ===
              emojiName
          )
      );

    if (!match) return;

    const member =
      await guild.members
        .fetch(user.id)
        .catch(
          () => null
        );

    if (!member) return;

    if (add)
      await member.roles
        .add(match.role)
        .catch(
          () => {}
        );
    else
      await member.roles
        .remove(match.role)
        .catch(
          () => {}
        );
  } catch {}
}

client.on(
  "messageReactionAdd",
  (r, u) =>
    reactionRoleEvent(
      r,
      u,
      true
    )
);

client.on(
  "messageReactionRemove",
  (r, u) =>
    reactionRoleEvent(
      r,
      u,
      false
    )
);

/* =========================================================
   EXPANDED LOGS
   ========================================================= */

client.on(
  "messageDelete",
  async message => {
    try {
      if (
        !message.guild ||
        message.author?.bot
      )
        return;

      await logAction(
        message.guild,
        "🗑️ MESSAGE DELETED",
        `${message.author || "Unknown user"} deleted message in ${message.channel}.`,
        "#ED4245",
        [
          {
            name: "💬 Content",
            value: clip(
              message.content ||
                "[No cached content]",
              1024
            )
          }
        ]
      );
    } catch {}
  }
);

client.on(
  "messageUpdate",
  async (
    oldMessage,
    newMessage
  ) => {
    try {
      if (
        !newMessage.guild ||
        newMessage.author?.bot
      )
        return;

      if (
        oldMessage.content ===
        newMessage.content
      )
        return;

      await logAction(
        newMessage.guild,
        "✏️ MESSAGE EDITED",
        `${newMessage.author} edited a message in ${newMessage.channel}.`,
        "#FEE75C",
        [
          {
            name: "Before",
            value: clip(
              oldMessage.content ||
                "[Unknown]",
              900
            )
          },
          {
            name: "After",
            value: clip(
              newMessage.content ||
                "[Empty]",
              900
            )
          }
        ]
      );
    } catch {}
  }
);

client.on(
  "guildMemberUpdate",
  async (
    oldMember,
    newMember
  ) => {
    try {
      const oldRoles =
        new Set(
          oldMember.roles.cache.keys()
        );

      const newRoles =
        new Set(
          newMember.roles.cache.keys()
        );

      const added =
        [
          ...newRoles
        ].filter(
          x =>
            !oldRoles.has(x) &&
            x !==
              newMember.guild
                .id
        );

      const removed =
        [
          ...oldRoles
        ].filter(
          x =>
            !newRoles.has(x) &&
            x !==
              newMember.guild
                .id
        );

      if (added.length)
        await logAction(
          newMember.guild,
          "➕ ROLE ADDED",
          `${newMember} received role(s): ${added
            .map(
              x =>
                `<@&${x}>`
            )
            .join(", ")}.`,
          "#57F287"
        );

      if (removed.length)
        await logAction(
          newMember.guild,
          "➖ ROLE REMOVED",
          `${newMember} lost role(s): ${removed
            .map(
              x =>
                `<@&${x}>`
            )
            .join(", ")}.`,
          "#ED4245"
        );
    } catch {}
  }
);

/* =========================================================
   ANTI-NUKE
   ========================================================= */

const nukeTracker =
  new Map();

client.on(
  "guildAuditLogEntryCreate",
  async (
    entry,
    guild
  ) => {
    try {
      const cfg =
        guildConfig(
          guild.id
        ).antinuke;

      if (!cfg.enabled)
        return;

      const destructive = [
        AuditLogEvent.ChannelDelete,
        AuditLogEvent.RoleDelete,
        AuditLogEvent.GuildBanAdd
      ];

      if (
        !destructive.includes(
          entry.action
        )
      )
        return;

      const executor =
        entry.executor;

      if (
        !executor ||
        executor.id ===
          guild.ownerId ||
        executor.id ===
          client.user.id
      )
        return;

      const key =
        `${guild.id}:${executor.id}`;

      const now =
        Date.now();

      const recent =
        (
          nukeTracker.get(
            key
          ) || []
        ).filter(
          t =>
            now - t <
            cfg.interval
        );

      recent.push(now);

      nukeTracker.set(
        key,
        recent
      );

      if (
        recent.length >=
        cfg.threshold
      ) {
        const member =
          await guild.members
            .fetch(
              executor.id
            )
            .catch(
              () => null
            );

        if (
          member?.moderatable
        ) {
          await member
            .timeout(
              3600000,
              "Anti-nuke protection"
            )
            .catch(
              () => {}
            );
        }

        await logAction(
          guild,
          "🚨 ANTI-NUKE TRIGGERED",
          `${executor} triggered anti-nuke protection.`,
          "#ED4245"
        );

        nukeTracker.set(
          key,
          []
        );
      }
    } catch (e) {
      console.error(
        "Anti-nuke error:",
        e
      );
    }
  }
);

/* =========================================================
   READY / REGISTRATION / ERRORS
   ========================================================= */

client.once(
  "ready",
  async () => {
    console.log(
      "======================================"
    );

    console.log(
      `🤖 JRC Bot online as ${client.user.tag}`
    );

    console.log(
      `🌐 Servers: ${client.guilds.cache.size}`
    );

    console.log(
      `📡 Ping: ${client.ws.ping}ms`
    );

    console.log(
      "======================================"
    );

    client.user.setActivity(
      "JRC Bot • /jrc help"
    );

    const token =
      process.env.DISCORD_TOKEN;

    const clientId =
      process.env.CLIENT_ID;

    if (!token || !clientId) {
      console.error(
        "❌ Missing DISCORD_TOKEN or CLIENT_ID environment variable."
      );
      return;
    }

    try {
      const rest =
        new REST({
          version: "10"
        }).setToken(
          token
        );

      console.log(
        "🔄 Registering slash commands..."
      );

      await rest.put(
        Routes.applicationCommands(
          clientId
        ),
        {
          body: commands
        }
      );

      console.log(
        `✅ Registered ${commands.length} slash command groups.`
      );
    } catch (e) {
      console.error(
        "❌ Command registration failed:",
        e
      );
    }
  }
);

process.on(
  "unhandledRejection",
  e =>
    console.error(
      "Unhandled rejection:",
      e
    )
);

process.on(
  "uncaughtException",
  e =>
    console.error(
      "Uncaught exception:",
      e
    )
);

if (
  !process.env.DISCORD_TOKEN
) {
  console.error(
    "❌ DISCORD_TOKEN is missing. Add it to your hosting environment variables."
  );
} else {
  client
    .login(
      process.env.DISCORD_TOKEN
    )
    .catch(
      e =>
        console.error(
          "❌ Login failed:",
          e
        )
    );
}
