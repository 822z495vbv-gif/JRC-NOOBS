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
   CLEAN / STABLE EDITION
   Welcome + Goodbye + Embeds + Roles + Mod Logs + Security
   + Utility + Fun
   ========================================================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.Reaction
  ]
});

const CONFIG_FILE = path.join(__dirname, "config.json");
const ACCENT = "#5865F2";
const SUCCESS = "#57F287";
const WARNING = "#FEE75C";
const DANGER = "#ED4245";

function loadConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      fs.writeFileSync(CONFIG_FILE, "{}", "utf8");
    }

    const raw = fs.readFileSync(CONFIG_FILE, "utf8").trim();
    if (!raw) return {};

    return JSON.parse(raw);
  } catch (error) {
    console.error("Config load error:", error);
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
  } catch (error) {
    console.error("Config save error:", error);
  }
}

function guildConfig(guildId) {
  if (!config[guildId]) {
    config[guildId] = {
      welcome: {
        enabled: false,
        channel: null,
        title: "👋 Welcome to {server}!",
        description: "Welcome to {server}, {user}! 🎉",
        message: "We're glad to have you here. Enjoy your stay!",
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
        description: "We're sorry to see you go, {user}.",
        message: "Thanks for being part of the community!",
        color: DANGER,
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

      security: {
        antiSpam: false,
        antiLink: false,
        antiRaid: false,
        antiMention: false,
        raidThreshold: 8,
        raidInterval: 10000,
        mentionLimit: 5
      },

      reactionRoles: [],

      autoRole: {
        enabled: false,
        role: null
      },

      embeds: {},

      staffRole: null
    };

    saveConfig();
  }

  const g = config[guildId];

  /* Migration / safety defaults */
  if (!g.welcome) {
    g.welcome = {
      enabled: false,
      channel: null,
      title: "👋 Welcome to {server}!",
      description: "Welcome to {server}, {user}! 🎉",
      message: "We're glad to have you here.",
      color: ACCENT,
      image: null,
      footer: "JRC Bot • Welcome",
      timestamp: true,
      thumbnail: true
    };
  }

  if (!g.goodbye) {
    g.goodbye = {
      enabled: false,
      channel: null,
      title: "👋 Goodbye from {server}",
      description: "We're sorry to see you go, {user}.",
      message: "Thanks for being part of the community!",
      color: DANGER,
      image: null,
      footer: "JRC Bot • Goodbye",
      timestamp: true,
      thumbnail: true
    };
  }

  if (!g.warnings) g.warnings = {};

  if (!g.automod) {
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
  }

  if (!g.logs) {
    g.logs = {
      enabled: false,
      channel: null
    };
  }

  if (!g.security) {
    g.security = {
      antiSpam: false,
      antiLink: false,
      antiRaid: false,
      antiMention: false,
      raidThreshold: 8,
      raidInterval: 10000,
      mentionLimit: 5
    };
  }

  if (!g.reactionRoles) g.reactionRoles = [];

  if (!g.autoRole) {
    g.autoRole = {
      enabled: false,
      role: null
    };
  }

  if (!g.embeds) g.embeds = {};
  if (!g.staffRole) g.staffRole = null;

  return g;
}

/* =========================================================
   GENERAL HELPERS
   ========================================================= */

function isAdmin(i) {
  return !!i.memberPermissions?.has(
    PermissionFlagsBits.Administrator
  );
}

function hasManageGuild(i) {
  return (
    isAdmin(i) ||
    !!i.memberPermissions?.has(
      PermissionFlagsBits.ManageGuild
    )
  );
}

function hasManageMessages(i) {
  return (
    isAdmin(i) ||
    !!i.memberPermissions?.has(
      PermissionFlagsBits.ManageMessages
    )
  );
}

function hasManageRoles(i) {
  return (
    isAdmin(i) ||
    !!i.memberPermissions?.has(
      PermissionFlagsBits.ManageRoles
    )
  );
}

function hasModerate(i) {
  return (
    isAdmin(i) ||
    !!i.memberPermissions?.has(
      PermissionFlagsBits.ModerateMembers
    )
  );
}

function clip(value, max = 1024) {
  return String(value ?? "").slice(0, max);
}

function validColor(color) {
  return /^#?[0-9A-F]{6}$/i.test(color || "");
}

function normColor(color, fallback = ACCENT) {
  if (!validColor(color)) return fallback;

  return color.startsWith("#")
    ? color
    : `#${color}`;
}

function validImage(url) {
  if (!url) return false;

  try {
    const u = new URL(url);
    return ["http:", "https:"].includes(u.protocol);
  } catch {
    return false;
  }
}

function replaceVariables(text, member) {
  if (!text) return "";

  const user = member?.user;

  return String(text)
    .replaceAll(
      "{user}",
      user ? `<@${user.id}>` : ""
    )
    .replaceAll(
      "{username}",
      user?.username || ""
    )
    .replaceAll(
      "{server}",
      member?.guild?.name || ""
    )
    .replaceAll(
      "{membercount}",
      member?.guild?.memberCount
        ? String(member.guild.memberCount)
        : ""
    )
    .replaceAll(
      "{id}",
      user?.id || ""
    );
}

/* =========================================================
   CENTRAL EMBED SYSTEM
   ========================================================= */

function baseEmbed(color = ACCENT) {
  return new EmbedBuilder()
    .setColor(normColor(color))
    .setFooter({
      text: "JRC Bot"
    })
    .setTimestamp();
}

function buildGreetingEmbed(type, member, settings) {
  const embed = baseEmbed(settings.color)
    .setTitle(
      replaceVariables(settings.title, member)
    )
    .setDescription(
      replaceVariables(settings.description, member)
    );

  if (settings.message) {
    embed.addFields({
      name:
        type === "welcome"
          ? "💬 Welcome"
          : "💬 Message",
      value: clip(
        replaceVariables(
          settings.message,
          member
        ),
        1024
      )
    });
  }

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

  if (
    settings.image &&
    validImage(settings.image)
  ) {
    embed.setImage(settings.image);
  }

  if (settings.footer) {
    embed.setFooter({
      text: replaceVariables(
        settings.footer,
        member
      )
    });
  }

  if (settings.timestamp) {
    embed.setTimestamp();
  }

  return embed;
}

async function safeReply(interaction, data) {
  try {
    if (interaction.replied || interaction.deferred) {
      return await interaction.followUp(data);
    }

    return await interaction.reply(data);
  } catch (error) {
    console.error("Reply error:", error);
  }
}

async function sendEmbed(
  interaction,
  title,
  description,
  color = ACCENT,
  options = {}
) {
  const embed = baseEmbed(color)
    .setTitle(title)
    .setDescription(description);

  if (options.fields?.length) {
    embed.addFields(options.fields);
  }

  if (options.thumbnail) {
    embed.setThumbnail(options.thumbnail);
  }

  if (options.image) {
    embed.setImage(options.image);
  }

  return safeReply(interaction, {
    embeds: [embed],
    flags: options.ephemeral
      ? MessageFlags.Ephemeral
      : undefined
  });
}

/* =========================================================
   LOG SYSTEM
   ========================================================= */

async function logAction(
  guild,
  title,
  description,
  color = ACCENT,
  fields = []
) {
  try {
    const cfg = guildConfig(guild.id);

    if (!cfg.logs.enabled || !cfg.logs.channel) {
      return;
    }

    const channel = guild.channels.cache.get(
      cfg.logs.channel
    );

    if (!channel?.isTextBased()) return;

    const embed = baseEmbed(color)
      .setTitle(title)
      .setDescription(description);

    if (fields.length) {
      embed.addFields(fields);
    }

    await channel.send({
      embeds: [embed]
    });
  } catch (error) {
    console.error("Log error:", error);
  }
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
      s.setName("help")
        .setDescription("Show JRC commands")
    )
    .addSubcommand(s =>
      s.setName("about")
        .setDescription("About JRC")
    )
    .addSubcommand(s =>
      s.setName("status")
        .setDescription("Show JRC status")
    )
    .addSubcommand(s =>
      s.setName("settings")
        .setDescription("Show server settings")
    )
    .toJSON()
);

/* WELCOME */
commands.push(
  new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("Configure welcome messages")
    .addSubcommand(s =>
      s.setName("setup")
        .setDescription("Open welcome setup")
    )
    .addSubcommand(s =>
      s.setName("disable")
        .setDescription("Disable welcome messages")
    )
    .addSubcommand(s =>
      s.setName("message")
        .setDescription("View welcome configuration")
    )
    .addSubcommand(s =>
      s.setName("channel")
        .setDescription("Set welcome channel")
        .addChannelOption(o =>
          o.setName("channel")
            .setDescription("Welcome channel")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("preview")
        .setDescription("Preview welcome embed")
    )
    .toJSON()
);

/* GOODBYE */
commands.push(
  new SlashCommandBuilder()
    .setName("goodbye")
    .setDescription("Configure goodbye messages")
    .addSubcommand(s =>
      s.setName("setup")
        .setDescription("Open goodbye setup")
    )
    .addSubcommand(s =>
      s.setName("disable")
        .setDescription("Disable goodbye messages")
    )
    .addSubcommand(s =>
      s.setName("message")
        .setDescription("View goodbye configuration")
    )
    .addSubcommand(s =>
      s.setName("channel")
        .setDescription("Set goodbye channel")
        .addChannelOption(o =>
          o.setName("channel")
            .setDescription("Goodbye channel")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("preview")
        .setDescription("Preview goodbye embed")
    )
    .toJSON()
);

/* MODERATION */
commands.push(
  new SlashCommandBuilder()
    .setName("mod")
    .setDescription("Moderation commands")
    .addSubcommand(s =>
      s.setName("ban")
        .setDescription("Ban a member")
        .addUserOption(o =>
          o.setName("user")
            .setDescription("Member")
            .setRequired(true)
        )
        .addStringOption(o =>
          o.setName("reason")
            .setDescription("Reason")
        )
    )
    .addSubcommand(s =>
      s.setName("kick")
        .setDescription("Kick a member")
        .addUserOption(o =>
          o.setName("user")
            .setDescription("Member")
            .setRequired(true)
        )
        .addStringOption(o =>
          o.setName("reason")
            .setDescription("Reason")
        )
    )
    .addSubcommand(s =>
      s.setName("timeout")
        .setDescription("Timeout a member")
        .addUserOption(o =>
          o.setName("user")
            .setDescription("Member")
            .setRequired(true)
        )
        .addIntegerOption(o =>
          o.setName("minutes")
            .setDescription("Minutes")
            .setMinValue(1)
            .setMaxValue(40320)
            .setRequired(true)
        )
        .addStringOption(o =>
          o.setName("reason")
            .setDescription("Reason")
        )
    )
    .addSubcommand(s =>
      s.setName("warn")
        .setDescription("Warn a member")
        .addUserOption(o =>
          o.setName("user")
            .setDescription("Member")
            .setRequired(true)
        )
        .addStringOption(o =>
          o.setName("reason")
            .setDescription("Reason")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("warnings")
        .setDescription("View warnings")
        .addUserOption(o =>
          o.setName("user")
            .setDescription("Member")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("clear")
        .setDescription("Delete messages")
        .addIntegerOption(o =>
          o.setName("amount")
            .setDescription("Amount")
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("lock")
        .setDescription("Lock this channel")
    )
    .addSubcommand(s =>
      s.setName("unlock")
        .setDescription("Unlock this channel")
    )
    .toJSON()
);

/* LOGS */
commands.push(
  new SlashCommandBuilder()
    .setName("logs")
    .setDescription("Configure moderation logs")
    .addSubcommand(s =>
      s.setName("setup")
        .setDescription("Set log channel")
        .addChannelOption(o =>
          o.setName("channel")
            .setDescription("Log channel")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("disable")
        .setDescription("Disable logs")
    )
    .addSubcommand(s =>
      s.setName("test")
        .setDescription("Send a test log")
    )
    .toJSON()
);

/* SECURITY */
commands.push(
  new SlashCommandBuilder()
    .setName("security")
    .setDescription("JRC security protection")
    .addSubcommand(s =>
      s.setName("status")
        .setDescription("View security status")
    )
    .addSubcommand(s =>
      s.setName("antispam")
        .setDescription("Toggle anti-spam")
        .addBooleanOption(o =>
          o.setName("enabled")
            .setDescription("Enable or disable")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("antilink")
        .setDescription("Toggle anti-link")
        .addBooleanOption(o =>
          o.setName("enabled")
            .setDescription("Enable or disable")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("antiraid")
        .setDescription("Toggle anti-raid")
        .addBooleanOption(o =>
          o.setName("enabled")
            .setDescription("Enable or disable")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("antimention")
        .setDescription("Toggle mention protection")
        .addBooleanOption(o =>
          o.setName("enabled")
            .setDescription("Enable or disable")
            .setRequired(true)
        )
    )
    .toJSON()
);

/* AUTOMOD */
commands.push(
  new SlashCommandBuilder()
    .setName("automod")
    .setDescription("Configure automod")
    .addSubcommand(s =>
      s.setName("setup")
        .setDescription("View automod settings")
    )
    .addSubcommand(s =>
      s.setName("enable")
        .setDescription("Enable automod")
    )
    .addSubcommand(s =>
      s.setName("disable")
        .setDescription("Disable automod")
    )
    .addSubcommand(s =>
      s.setName("words")
        .setDescription("Add blocked word")
        .addStringOption(o =>
          o.setName("word")
            .setDescription("Word")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("spam")
        .setDescription("Configure spam protection")
        .addBooleanOption(o =>
          o.setName("enabled")
            .setDescription("Enable")
            .setRequired(true)
        )
        .addIntegerOption(o =>
          o.setName("limit")
            .setDescription("Messages")
            .setMinValue(2)
            .setMaxValue(50)
        )
    )
    .addSubcommand(s =>
      s.setName("links")
        .setDescription("Toggle link filtering")
        .addBooleanOption(o =>
          o.setName("enabled")
            .setDescription("Enable")
            .setRequired(true)
        )
    )
    .toJSON()
);

/* ROLES */
commands.push(
  new SlashCommandBuilder()
    .setName("role")
    .setDescription("Role management")
    .addSubcommand(s =>
      s.setName("add")
        .setDescription("Give a role")
        .addUserOption(o =>
          o.setName("user")
            .setDescription("Member")
            .setRequired(true)
        )
        .addRoleOption(o =>
          o.setName("role")
            .setDescription("Role")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("remove")
        .setDescription("Remove a role")
        .addUserOption(o =>
          o.setName("user")
            .setDescription("Member")
            .setRequired(true)
        )
        .addRoleOption(o =>
          o.setName("role")
            .setDescription("Role")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("info")
        .setDescription("Role information")
        .addRoleOption(o =>
          o.setName("role")
            .setDescription("Role")
            .setRequired(true)
        )
    )
    .toJSON()
);

/* AUTOROLE */
commands.push(
  new SlashCommandBuilder()
    .setName("autorole")
    .setDescription("Configure automatic roles")
    .addSubcommand(s =>
      s.setName("setup")
        .setDescription("Set the automatic role")
        .addRoleOption(o =>
          o.setName("role")
            .setDescription("Role")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("enable")
        .setDescription("Enable autorole")
    )
    .addSubcommand(s =>
      s.setName("disable")
        .setDescription("Disable autorole")
    )
    .addSubcommand(s =>
      s.setName("status")
        .setDescription("View autorole status")
    )
    .toJSON()
);

/* REACTION ROLES */
commands.push(
  new SlashCommandBuilder()
    .setName("reactionrole")
    .setDescription("Self-role system")
    .addSubcommand(s =>
      s.setName("create")
        .setDescription("Create a self-role")
        .addRoleOption(o =>
          o.setName("role")
            .setDescription("Role")
            .setRequired(true)
        )
        .addStringOption(o =>
          o.setName("emoji")
            .setDescription("Emoji")
            .setRequired(true)
        )
        .addStringOption(o =>
          o.setName("text")
            .setDescription("Panel text")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("remove")
        .setDescription("Remove a self-role")
        .addStringOption(o =>
          o.setName("message")
            .setDescription("Message ID")
            .setRequired(true)
        )
        .addStringOption(o =>
          o.setName("emoji")
            .setDescription("Emoji")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("list")
        .setDescription("List self-roles")
    )
    .toJSON()
);

/* EMBEDS */
commands.push(
  new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Create custom embeds")
    .addSubcommand(s =>
      s.setName("create")
        .setDescription("Create an embed")
        .addChannelOption(o =>
          o.setName("channel")
            .setDescription("Target channel")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addStringOption(o =>
          o.setName("title")
            .setDescription("Embed title")
            .setRequired(true)
        )
        .addStringOption(o =>
          o.setName("description")
            .setDescription("Embed description")
            .setRequired(true)
        )
        .addStringOption(o =>
          o.setName("color")
            .setDescription("Hex color")
        )
        .addStringOption(o =>
          o.setName("image")
            .setDescription("Image or GIF URL")
        )
        .addStringOption(o =>
          o.setName("footer")
            .setDescription("Footer")
        )
    )
    .addSubcommand(s =>
      s.setName("delete")
        .setDescription("Delete a saved embed")
        .addStringOption(o =>
          o.setName("id")
            .setDescription("Embed ID")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("list")
        .setDescription("List saved embeds")
    )
    .toJSON()
);

/* UTILITY */
commands.push(
  new SlashCommandBuilder()
    .setName("utility")
    .setDescription("Useful utilities")
    .addSubcommand(s =>
      s.setName("userinfo")
        .setDescription("User information")
        .addUserOption(o =>
          o.setName("user")
            .setDescription("User")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("serverinfo")
        .setDescription("Server information")
    )
    .addSubcommand(s =>
      s.setName("avatar")
        .setDescription("View avatar")
        .addUserOption(o =>
          o.setName("user")
            .setDescription("User")
        )
    )
    .addSubcommand(s =>
      s.setName("roleinfo")
        .setDescription("Role information")
        .addRoleOption(o =>
          o.setName("role")
            .setDescription("Role")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("ping")
        .setDescription("Check bot latency")
    )
    .toJSON()
);

/* FUN */
commands.push(
  new SlashCommandBuilder()
    .setName("fun")
    .setDescription("Fun commands")
    .addSubcommand(s =>
      s.setName("8ball")
        .setDescription("Ask the magic 8-ball")
        .addStringOption(o =>
          o.setName("question")
            .setDescription("Question")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("coinflip")
        .setDescription("Flip a coin")
    )
    .addSubcommand(s =>
      s.setName("dice")
        .setDescription("Roll a dice")
    )
    .addSubcommand(s =>
      s.setName("choose")
        .setDescription("Choose an option")
        .addStringOption(o =>
          o.setName("options")
            .setDescription("Separate options with commas")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("rps")
        .setDescription("Play rock paper scissors")
        .addStringOption(o =>
          o.setName("choice")
            .setDescription("Your choice")
            .setRequired(true)
            .addChoices(
              {
                name: "Rock",
                value: "rock"
              },
              {
                name: "Paper",
                value: "paper"
              },
              {
                name: "Scissors",
                value: "scissors"
              }
            )
        )
    )
    .addSubcommand(s =>
      s.setName("rate")
        .setDescription("Rate something")
        .addStringOption(o =>
          o.setName("thing")
            .setDescription("Thing to rate")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("compliment")
        .setDescription("Get a compliment")
    )
    .toJSON()
);

/* =========================================================
   WELCOME / GOODBYE SETUP
   ========================================================= */

function greetingPanel(type, guild) {
  const settings =
    guildConfig(guild.id)[type];

  const embed = baseEmbed(
    settings.color
  )
    .setTitle(
      type === "welcome"
        ? "👋 Welcome System"
        : "🚪 Goodbye System"
    )
    .setDescription(
      `Configure the **${type}** system for **${guild.name}**.\n\n` +
      `**Status:** ${
        settings.enabled
          ? "🟢 Enabled"
          : "🔴 Disabled"
      }\n` +
      `**Channel:** ${
        settings.channel
          ? `<#${settings.channel}>`
          : "Not configured"
      }\n\n` +
      `Use the buttons below to customize the embed.`
    );

  const row =
    new ActionRowBuilder().addComponents(
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

async function handleGreetingCommand(
  interaction,
  type
) {
  if (!hasManageGuild(interaction)) {
    return safeReply(interaction, {
      content:
        "❌ You need **Manage Server** or **Administrator**.",
      flags: MessageFlags.Ephemeral
    });
  }

  const sub =
    interaction.options.getSubcommand();

  const cfg =
    guildConfig(interaction.guild.id)[type];

  if (sub === "setup") {
    return interaction.reply(
      greetingPanel(
        type,
        interaction.guild
      )
    );
  }

  if (sub === "disable") {
    cfg.enabled = false;
    saveConfig();

    return sendEmbed(
      interaction,
      `🔴 ${type} disabled`,
      `The **${type}** system is now disabled.`,
      DANGER,
      { ephemeral: true }
    );
  }

  if (sub === "channel") {
    const channel =
      interaction.options.getChannel(
        "channel"
      );

    cfg.channel = channel.id;
    saveConfig();

    return sendEmbed(
      interaction,
      "📢 Channel Updated",
      `The ${type} channel is now ${channel}.`,
      SUCCESS,
      { ephemeral: true }
    );
  }

  if (sub === "message") {
    const embed = baseEmbed(
      cfg.color
    )
      .setTitle(
        `💬 ${type} Configuration`
      )
      .addFields(
        {
          name: "Title",
          value: clip(cfg.title, 1024)
        },
        {
          name: "Description",
          value: clip(
            cfg.description,
            1024
          )
        },
        {
          name: "Message",
          value: clip(
            cfg.message,
            1024
          )
        },
        {
          name: "Image / GIF",
          value:
            cfg.image || "None"
        }
      );

    return interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "preview") {
    return interaction.reply({
      embeds: [
        buildGreetingEmbed(
          type,
          interaction.member,
          cfg
        )
      ],
      flags: MessageFlags.Ephemeral
    });
  }
}

/* =========================================================
   MODERATION
   ========================================================= */

async function handleMod(i) {
  if (!hasModerate(i)) {
    return safeReply(i, {
      content:
        "❌ You need **Moderate Members** or **Administrator**.",
      flags: MessageFlags.Ephemeral
    });
  }

  const sub =
    i.options.getSubcommand();

  if (
    sub === "ban" ||
    sub === "kick"
  ) {
    const user =
      i.options.getUser("user");

    const reason =
      i.options.getString("reason") ||
      "No reason provided.";

    const member =
      await i.guild.members
        .fetch(user.id)
        .catch(() => null);

    if (!member) {
      return safeReply(i, {
        content:
          "❌ I couldn't find that member.",
        flags: MessageFlags.Ephemeral
      });
    }

    if (
      member.id === i.user.id
    ) {
      return safeReply(i, {
        content:
          "❌ You can't moderate yourself.",
        flags: MessageFlags.Ephemeral
      });
    }

    if (
      member.id ===
      i.guild.ownerId
    ) {
      return safeReply(i, {
        content:
          "❌ The server owner cannot be moderated by JRC.",
        flags: MessageFlags.Ephemeral
      });
    }

    if (
      sub === "ban" &&
      !member.bannable
    ) {
      return safeReply(i, {
        content:
          "❌ I can't ban that member. Check my role hierarchy.",
        flags: MessageFlags.Ephemeral
      });
    }

    if (
      sub === "kick" &&
      !member.kickable
    ) {
      return safeReply(i, {
        content:
          "❌ I can't kick that member. Check my role hierarchy.",
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === "ban") {
      await member.ban({
        reason
      });

      await logAction(
        i.guild,
        "🔨 MEMBER BANNED",
        `${user} was banned.`,
        DANGER,
        [
          {
            name: "👤 User",
            value: `${user} (${user.id})`
          },
          {
            name: "🛡️ Moderator",
            value: `${i.user}`
          },
          {
            name: "📝 Reason",
            value: clip(reason)
          }
        ]
      );

      return sendEmbed(
        i,
        "🔨 Member Banned",
        `**${user.username}** has been banned.`,
        DANGER,
        { ephemeral: true }
      );
    }

    await member.kick(reason);

    await logAction(
      i.guild,
      "👢 MEMBER KICKED",
      `${user} was kicked.`,
      DANGER,
      [
        {
          name: "👤 User",
          value: `${user} (${user.id})`
        },
        {
          name: "🛡️ Moderator",
          value: `${i.user}`
        },
        {
          name: "📝 Reason",
          value: clip(reason)
        }
      ]
    );

    return sendEmbed(
      i,
      "👢 Member Kicked",
      `**${user.username}** has been kicked.`,
      DANGER,
      { ephemeral: true }
    );
  }

  if (sub === "timeout") {
    const user =
      i.options.getUser("user");

    const minutes =
      i.options.getInteger(
        "minutes"
      );

    const reason =
      i.options.getString("reason") ||
      "No reason provided.";

    const member =
      await i.guild.members
        .fetch(user.id)
        .catch(() => null);

    if (!member?.moderatable) {
      return safeReply(i, {
        content:
          "❌ I can't timeout that member. Check role hierarchy.",
        flags: MessageFlags.Ephemeral
      });
    }

    await member.timeout(
      minutes * 60000,
      reason
    );

    await logAction(
      i.guild,
      "⏱️ MEMBER TIMEOUT",
      `${user} was timed out.`,
      WARNING,
      [
        {
          name: "🛡️ Moderator",
          value: `${i.user}`
        },
        {
          name: "⏱️ Duration",
          value: `${minutes} minutes`
        },
        {
          name: "📝 Reason",
          value: clip(reason)
        }
      ]
    );

    return sendEmbed(
      i,
      "⏱️ Member Timed Out",
      `**${user.username}** was timed out for **${minutes} minutes**.`,
      WARNING,
      { ephemeral: true }
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
      guildConfig(i.guild.id);

    cfg.warnings[user.id] ??= [];

    cfg.warnings[user.id].push({
      reason,
      moderator: i.user.id,
      timestamp: Date.now()
    });

    saveConfig();

    await logAction(
      i.guild,
      "⚠️ MEMBER WARNED",
      `${user} was warned.`,
      WARNING,
      [
        {
          name: "🛡️ Moderator",
          value: `${i.user}`
        },
        {
          name: "📝 Reason",
          value: clip(reason)
        }
      ]
    );

    return sendEmbed(
      i,
      "⚠️ Warning Added",
      `**${user.username}** has been warned.`,
      WARNING,
      { ephemeral: true }
    );
  }

  if (sub === "warnings") {
    const user =
      i.options.getUser("user");

    const warnings =
      guildConfig(
        i.guild.id
      ).warnings[user.id] || [];

    if (!warnings.length) {
      return sendEmbed(
        i,
        "✅ No Warnings",
        `**${user.username}** has no warnings.`,
        SUCCESS,
        { ephemeral: true }
      );
    }

    const text =
      warnings
        .map(
          (w, index) =>
            `**${index + 1}.** ${clip(
              w.reason,
              500
            )} — <@${w.moderator}>`
        )
        .join("\n");

    return i.reply({
      embeds: [
        baseEmbed(WARNING)
          .setTitle(
            `⚠️ Warnings • ${user.username}`
          )
          .setDescription(
            clip(text, 4000)
          )
      ],
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "clear") {
    if (!hasManageMessages(i)) {
      return safeReply(i, {
        content:
          "❌ You need **Manage Messages**.",
        flags: MessageFlags.Ephemeral
      });
    }

    const amount =
      i.options.getInteger(
        "amount"
      );

    const deleted =
      await i.channel.bulkDelete(
        amount,
        true
      );

    await logAction(
      i.guild,
      "🧹 MESSAGES CLEARED",
      `${i.user} deleted **${deleted.size}** messages in ${i.channel}.`,
      ACCENT
    );

    return sendEmbed(
      i,
      "🧹 Messages Cleared",
      `Deleted **${deleted.size}** messages.`,
      SUCCESS,
      { ephemeral: true }
    );
  }

  if (
    sub === "lock" ||
    sub === "unlock"
  ) {
    if (!hasManageMessages(i)) {
      return safeReply(i, {
        content:
          "❌ You need **Manage Messages**.",
        flags: MessageFlags.Ephemeral
      });
    }

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
      ACCENT
    );

    return sendEmbed(
      i,
      locked
        ? "🔒 Channel Locked"
        : "🔓 Channel Unlocked",
      locked
        ? "This channel is now locked."
        : "This channel is now unlocked.",
      ACCENT,
      { ephemeral: true }
    );
  }
}

/* =========================================================
   LOG COMMANDS
   ========================================================= */

async function handleLogs(i) {
  if (!hasManageGuild(i)) {
    return safeReply(i, {
      content:
        "❌ You need **Manage Server** or **Administrator**.",
      flags: MessageFlags.Ephemeral
    });
  }

  const sub =
    i.options.getSubcommand();

  const cfg =
    guildConfig(i.guild.id).logs;

  if (sub === "setup") {
    const channel =
      i.options.getChannel(
        "channel"
      );

    cfg.channel = channel.id;
    cfg.enabled = true;

    saveConfig();

    return sendEmbed(
      i,
      "📋 Logs Configured",
      `JRC moderation logs are now being sent to ${channel}.`,
      SUCCESS,
      { ephemeral: true }
    );
  }

  if (sub === "disable") {
    cfg.enabled = false;
    saveConfig();

    return sendEmbed(
      i,
      "🔴 Logs Disabled",
      "JRC moderation logging has been disabled.",
      DANGER,
      { ephemeral: true }
    );
  }

  if (sub === "test") {
    await logAction(
      i.guild,
      "🧪 LOG TEST",
      `Log system tested by ${i.user}.`,
      ACCENT
    );

    return sendEmbed(
      i,
      "🧪 Test Sent",
      "The test log was sent to your configured log channel.",
      SUCCESS,
      { ephemeral: true }
    );
  }
}

/* =========================================================
   SECURITY
   ========================================================= */

async function handleSecurity(i) {
  if (!hasManageGuild(i)) {
    return safeReply(i, {
      content:
        "❌ You need **Manage Server** or **Administrator**.",
      flags: MessageFlags.Ephemeral
    });
  }

  const sub =
    i.options.getSubcommand();

  const cfg =
    guildConfig(i.guild.id)
      .security;

  if (sub === "status") {
    const embed =
      baseEmbed()
        .setTitle("🔐 JRC Security")
        .addFields(
          {
            name: "🚫 Anti-Spam",
            value: cfg.antiSpam
              ? "🟢 Enabled"
              : "🔴 Disabled",
            inline: true
          },
          {
            name: "🔗 Anti-Link",
            value: cfg.antiLink
              ? "🟢 Enabled"
              : "🔴 Disabled",
            inline: true
          },
          {
            name: "🚨 Anti-Raid",
            value: cfg.antiRaid
              ? "🟢 Enabled"
              : "🔴 Disabled",
            inline: true
          },
          {
            name: "📢 Mention Protection",
            value: cfg.antiMention
              ? "🟢 Enabled"
              : "🔴 Disabled",
            inline: true
          }
        );

    return i.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral
    });
  }

  const enabled =
    i.options.getBoolean(
      "enabled"
    );

  if (sub === "antispam") {
    cfg.antiSpam = enabled;
  }

  if (sub === "antilink") {
    cfg.antiLink = enabled;
  }

  if (sub === "antiraid") {
    cfg.antiRaid = enabled;
  }

  if (sub === "antimention") {
    cfg.antiMention = enabled;
  }

  saveConfig();

  return sendEmbed(
    i,
    "🔐 Security Updated",
    `**${sub}** is now ${
      enabled
        ? "🟢 enabled"
        : "🔴 disabled"
    }.`,
    enabled
      ? SUCCESS
      : DANGER,
    { ephemeral: true }
  );
}

/* =========================================================
   AUTOMOD
   ========================================================= */

async function handleAutoMod(i) {
  if (!hasManageGuild(i)) {
    return safeReply(i, {
      content:
        "❌ You need **Manage Server**.",
      flags: MessageFlags.Ephemeral
    });
  }

  const sub =
    i.options.getSubcommand();

  const cfg =
    guildConfig(i.guild.id)
      .automod;

  if (sub === "setup") {
    return i.reply({
      embeds: [
        baseEmbed()
          .setTitle(
            "🛡️ Automod Configuration"
          )
          .addFields(
            {
              name: "Status",
              value: cfg.enabled
                ? "🟢 Enabled"
                : "🔴 Disabled"
            },
            {
              name: "Blocked Words",
              value: cfg.words.length
                ? cfg.words.join(", ")
                : "None"
            },
            {
              name: "Spam",
              value: cfg.spam.enabled
                ? "🟢 Enabled"
                : "🔴 Disabled"
            },
            {
              name: "Links",
              value: cfg.links
                ? "🟢 Enabled"
                : "🔴 Disabled"
            }
          )
      ],
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "enable") {
    cfg.enabled = true;
    saveConfig();

    return sendEmbed(
      i,
      "🟢 Automod Enabled",
      "JRC automod is now active.",
      SUCCESS,
      { ephemeral: true }
    );
  }

  if (sub === "disable") {
    cfg.enabled = false;
    saveConfig();

    return sendEmbed(
      i,
      "🔴 Automod Disabled",
      "JRC automod is now disabled.",
      DANGER,
      { ephemeral: true }
    );
  }

  if (sub === "words") {
    const word =
      i.options
        .getString("word")
        .toLowerCase()
        .trim();

    if (!cfg.words.includes(word)) {
      cfg.words.push(word);
    }

    saveConfig();

    return sendEmbed(
      i,
      "🚫 Blocked Word Added",
      `Added \`${word}\` to the blocked-word list.`,
      SUCCESS,
      { ephemeral: true }
    );
  }

  if (sub === "spam") {
    cfg.spam.enabled =
      i.options.getBoolean(
        "enabled"
      );

    const limit =
      i.options.getInteger(
        "limit"
      );

    if (limit) {
      cfg.spam.limit = limit;
    }

    saveConfig();

    return sendEmbed(
      i,
      "🛡️ Spam Protection Updated",
      `Spam protection is now ${
        cfg.spam.enabled
          ? "🟢 enabled"
          : "🔴 disabled"
      }.`,
      ACCENT,
      { ephemeral: true }
    );
  }

  if (sub === "links") {
    cfg.links =
      i.options.getBoolean(
        "enabled"
      );

    saveConfig();

    return sendEmbed(
      i,
      "🔗 Link Protection Updated",
      `Link filtering is now ${
        cfg.links
          ? "🟢 enabled"
          : "🔴 disabled"
      }.`,
      ACCENT,
      { ephemeral: true }
    );
  }
}

/* =========================================================
   ROLE SYSTEM
   ========================================================= */

function canManageTargetRole(i, role) {
  if (!role) return false;

  if (role.managed) return false;

  if (
    role.id === i.guild.id
  ) {
    return false;
  }

  const botMember =
    i.guild.members.me;

  if (!botMember) return false;

  if (
    role.position >=
    botMember.roles.highest.position
  ) {
    return false;
  }

  if (
    !isAdmin(i) &&
    i.member?.roles?.highest?.position <=
      role.position
  ) {
    return false;
  }

  return true;
}

async function handleRole(i) {
  if (!hasManageRoles(i)) {
    return safeReply(i, {
      content:
        "❌ You need **Manage Roles** or **Administrator**.",
      flags: MessageFlags.Ephemeral
    });
  }

  const sub =
    i.options.getSubcommand();

  if (
    sub === "add" ||
    sub === "remove"
  ) {
    const user =
      i.options.getUser("user");

    const role =
      i.options.getRole("role");

    if (!canManageTargetRole(i, role)) {
      return safeReply(i, {
        content:
          "❌ I can't manage that role. Check the role hierarchy.",
        flags: MessageFlags.Ephemeral
      });
    }

    const member =
      await i.guild.members
        .fetch(user.id)
        .catch(() => null);

    if (!member) {
      return safeReply(i, {
        content:
          "❌ Member not found.",
        flags: MessageFlags.Ephemeral
      });
    }

    if (
      sub === "add"
    ) {
      await member.roles.add(
        role,
        `JRC role command by ${i.user.tag}`
      );

      await logAction(
        i.guild,
        "🎭 ROLE ADDED",
        `${role} was added to ${member}.`,
        SUCCESS,
        [
          {
            name: "Moderator",
            value: `${i.user}`
          }
        ]
      );

      return sendEmbed(
        i,
        "🎭 Role Added",
        `Added ${role} to ${member}.`,
        SUCCESS,
        { ephemeral: true }
      );
    }

    await member.roles.remove(
      role,
      `JRC role command by ${i.user.tag}`
    );

    await logAction(
      i.guild,
      "🎭 ROLE REMOVED",
      `${role} was removed from ${member}.`,
      DANGER,
      [
        {
          name: "Moderator",
          value: `${i.user}`
        }
      ]
    );

    return sendEmbed(
      i,
      "🎭 Role Removed",
      `Removed ${role} from ${member}.`,
      DANGER,
      { ephemeral: true }
    );
  }

  if (sub === "info") {
    const role =
      i.options.getRole("role");

    return i.reply({
      embeds: [
        baseEmbed(
          role.hexColor !== "#000000"
            ? role.hexColor
            : ACCENT
        )
          .setTitle(
            `🎨 ${role.name}`
          )
          .addFields(
            {
              name: "ID",
              value: role.id,
              inline: true
            },
            {
              name: "Members",
              value: String(
                role.members.size
              ),
              inline: true
            },
            {
              name: "Position",
              value: String(
                role.position
              ),
              inline: true
            },
            {
              name: "Mentionable",
              value: role.mentionable
                ? "Yes"
                : "No",
              inline: true
            }
          )
      ],
      flags: MessageFlags.Ephemeral
    });
  }
}

/* =========================================================
   AUTOROLE
   ========================================================= */

async function handleAutoRole(i) {
  if (!hasManageRoles(i)) {
    return safeReply(i, {
      content:
        "❌ You need **Manage Roles**.",
      flags: MessageFlags.Ephemeral
    });
  }

  const sub =
    i.options.getSubcommand();

  const cfg =
    guildConfig(i.guild.id)
      .autoRole;

  if (sub === "setup") {
    const role =
      i.options.getRole("role");

    if (!canManageTargetRole(i, role)) {
      return safeReply(i, {
        content:
          "❌ JRC can't assign that role. Move JRC's bot role above it.",
        flags: MessageFlags.Ephemeral
      });
    }

    cfg.role = role.id;
    saveConfig();

    return sendEmbed(
      i,
      "🎭 Autorole Configured",
      `New members will receive ${role} when autorole is enabled.`,
      SUCCESS,
      { ephemeral: true }
    );
  }

  if (sub === "enable") {
    if (!cfg.role) {
      return safeReply(i, {
        content:
          "❌ Run `/autorole setup` first.",
        flags: MessageFlags.Ephemeral
      });
    }

    cfg.enabled = true;
    saveConfig();

    return sendEmbed(
      i,
      "🟢 Autorole Enabled",
      `New members will automatically receive <@&${cfg.role}>.`,
      SUCCESS,
      { ephemeral: true }
    );
  }

  if (sub === "disable") {
    cfg.enabled = false;
    saveConfig();

    return sendEmbed(
      i,
      "🔴 Autorole Disabled",
      "Autorole is now disabled.",
      DANGER,
      { ephemeral: true }
    );
  }

  if (sub === "status") {
    return i.reply({
      embeds: [
        baseEmbed()
          .setTitle("🎭 Autorole")
          .setDescription(
            `**Status:** ${
              cfg.enabled
                ? "🟢 Enabled"
                : "🔴 Disabled"
            }\n` +
            `**Role:** ${
              cfg.role
                ? `<@&${cfg.role}>`
                : "Not configured"
            }`
          )
      ],
      flags: MessageFlags.Ephemeral
    });
  }
}

/* =========================================================
   REACTION / SELF ROLES
   ========================================================= */

async function handleReactionRole(i) {
  if (!hasManageRoles(i)) {
    return safeReply(i, {
      content:
        "❌ You need **Manage Roles**.",
      flags: MessageFlags.Ephemeral
    });
  }

  const sub =
    i.options.getSubcommand();

  const cfg =
    guildConfig(i.guild.id);

  if (sub === "create") {
    const role =
      i.options.getRole("role");

    const emoji =
      i.options.getString("emoji");

    const text =
      i.options.getString("text");

    if (!canManageTargetRole(i, role)) {
      return safeReply(i, {
        content:
          "❌ JRC can't manage that role. Check role hierarchy.",
        flags: MessageFlags.Ephemeral
      });
    }

    const message =
      await i.channel.send({
        embeds: [
          baseEmbed()
            .setTitle("🎭 Self Role")
            .setDescription(text)
            .addFields({
              name: "Role",
              value: `${role}`
            })
        ]
      });

    try {
      await message.react(
        emoji
      );
    } catch {
      return safeReply(i, {
        content:
          "❌ I couldn't use that emoji.",
        flags: MessageFlags.Ephemeral
      });
    }

    cfg.reactionRoles.push({
      message: message.id,
      emoji,
      role: role.id
    });

    saveConfig();

    return sendEmbed(
      i,
      "🎭 Self Role Created",
      `React to the message to receive ${role}.`,
      SUCCESS,
      { ephemeral: true }
    );
  }

  if (sub === "remove") {
    const message =
      i.options.getString(
        "message"
      );

    const emoji =
      i.options.getString(
        "emoji"
      );

    const before =
      cfg.reactionRoles.length;

    cfg.reactionRoles =
      cfg.reactionRoles.filter(
        x =>
          !(
            x.message === message &&
            x.emoji === emoji
          )
      );

    saveConfig();

    return sendEmbed(
      i,
      "🗑️ Self Role Removed",
      before === cfg.reactionRoles.length
        ? "No matching self-role was found."
        : "The self-role configuration was removed.",
      before === cfg.reactionRoles.length
        ? WARNING
        : SUCCESS,
      { ephemeral: true }
    );
  }

  if (sub === "list") {
    if (!cfg.reactionRoles.length) {
      return sendEmbed(
        i,
        "🎭 Self Roles",
        "No self-roles are configured.",
        ACCENT,
        { ephemeral: true }
      );
    }

    const text =
      cfg.reactionRoles
        .map(
          (x, index) =>
            `**${index + 1}.** ${x.emoji} → <@&${x.role}> • \`${x.message}\``
        )
        .join("\n");

    return i.reply({
      embeds: [
        baseEmbed()
          .setTitle(
            "🎭 Self Roles"
          )
          .setDescription(
            clip(text, 4000)
          )
      ],
      flags: MessageFlags.Ephemeral
    });
  }
}

/* =========================================================
   EMBED CREATOR
   ========================================================= */

async function handleEmbed(i) {
  if (!hasManageGuild(i)) {
    return safeReply(i, {
      content:
        "❌ You need **Manage Server** or **Administrator**.",
      flags: MessageFlags.Ephemeral
    });
  }

  const sub =
    i.options.getSubcommand();

  const cfg =
    guildConfig(i.guild.id);

  if (sub === "create") {
    const channel =
      i.options.getChannel(
        "channel"
      );

    const title =
      i.options.getString(
        "title"
      );

    const description =
      i.options.getString(
        "description"
      );

    const color =
      i.options.getString(
        "color"
      ) || ACCENT;

    const image =
      i.options.getString(
        "image"
      );

    const footer =
      i.options.getString(
        "footer"
      ) || "JRC Bot";

    if (!validColor(color)) {
      return safeReply(i, {
        content:
          "❌ Invalid color. Example: `#5865F2`",
        flags: MessageFlags.Ephemeral
      });
    }

    if (
      image &&
      !validImage(image)
    ) {
      return safeReply(i, {
        content:
          "❌ Invalid image/GIF URL.",
        flags: MessageFlags.Ephemeral
      });
    }

    const id =
      `${Date.now().toString(36)}${Math.random()
        .toString(36)
        .slice(2, 7)}`;

    const embed =
      baseEmbed(color)
        .setTitle(title)
        .setDescription(description)
        .setFooter({
          text: footer
        });

    if (image) {
      embed.setImage(image);
    }

    const message =
      await channel.send({
        embeds: [embed]
      });

    cfg.embeds[id] = {
      id,
      channelId: channel.id,
      messageId: message.id,
      title,
      description,
      color: normColor(color),
      image: image || null,
      footer,
      createdBy: i.user.id,
      createdAt: Date.now()
    };

    saveConfig();

    return sendEmbed(
      i,
      "✅ Embed Created",
      `Your embed was posted in ${channel}.\n\n**Embed ID:** \`${id}\``,
      SUCCESS,
      { ephemeral: true }
    );
  }

  if (sub === "delete") {
    const id =
      i.options.getString("id");

    const record =
      cfg.embeds[id];

    if (!record) {
      return safeReply(i, {
        content:
          "❌ Embed not found.",
        flags: MessageFlags.Ephemeral
      });
    }

    const channel =
      i.guild.channels.cache.get(
        record.channelId
      );

    if (channel?.isTextBased()) {
      const message =
        await channel.messages
          .fetch(record.messageId)
          .catch(() => null);

      if (message) {
        await message
          .delete()
          .catch(() => {});
      }
    }

    delete cfg.embeds[id];
    saveConfig();

    return sendEmbed(
      i,
      "🗑️ Embed Deleted",
      `Embed \`${id}\` has been deleted.`,
      SUCCESS,
      { ephemeral: true }
    );
  }

  if (sub === "list") {
    const records =
      Object.values(
        cfg.embeds
      );

    if (!records.length) {
      return sendEmbed(
        i,
        "🧩 Saved Embeds",
        "No saved embeds.",
        ACCENT,
        { ephemeral: true }
      );
    }

    const text =
      records
        .slice(0, 20)
        .map(
          x =>
            `• \`${x.id}\` — ${clip(
              x.title,
              80
            )}`
        )
        .join("\n");

    return i.reply({
      embeds: [
        baseEmbed()
          .setTitle(
            "🧩 Saved Embeds"
          )
          .setDescription(text)
      ],
      flags: MessageFlags.Ephemeral
    });
  }
}

/* =========================================================
   UTILITY
   ========================================================= */

async function handleUtility(i) {
  const sub =
    i.options.getSubcommand();

  if (sub === "ping") {
    return sendEmbed(
      i,
      "🏓 Pong!",
      `Bot latency: **${client.ws.ping}ms**`,
      SUCCESS
    );
  }

  if (sub === "userinfo") {
    const user =
      i.options.getUser(
        "user"
      );

    const member =
      await i.guild.members
        .fetch(user.id)
        .catch(() => null);

    return i.reply({
      embeds: [
        baseEmbed()
          .setTitle(
            `👤 ${user.username}`
          )
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
              value: `<t:${Math.floor(
                user.createdTimestamp /
                  1000
              )}:R>`,
              inline: true
            },
            {
              name: "Joined",
              value:
                member?.joinedTimestamp
                  ? `<t:${Math.floor(
                      member.joinedTimestamp /
                        1000
                    )}:R>`
                  : "Unknown",
              inline: true
            }
          )
      ]
    });
  }

  if (sub === "serverinfo") {
    const guild =
      i.guild;

    return i.reply({
      embeds: [
        baseEmbed()
          .setTitle(
            `🏠 ${guild.name}`
          )
          .setThumbnail(
            guild.iconURL({
              extension: "png",
              size: 256
            })
          )
          .addFields(
            {
              name: "Members",
              value: String(
                guild.memberCount
              ),
              inline: true
            },
            {
              name: "Channels",
              value: String(
                guild.channels.cache.size
              ),
              inline: true
            },
            {
              name: "Roles",
              value: String(
                guild.roles.cache.size
              ),
              inline: true
            },
            {
              name: "Owner",
              value: `<@${guild.ownerId}>`,
              inline: true
            }
          )
      ]
    });
  }

  if (sub === "avatar") {
    const user =
      i.options.getUser(
        "user"
      ) || i.user;

    return i.reply({
      embeds: [
        baseEmbed()
          .setTitle(
            `🖼️ ${user.username}'s Avatar`
          )
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
    const role =
      i.options.getRole(
        "role"
      );

    return i.reply({
      embeds: [
        baseEmbed(
          validColor(role.hexColor)
            ? role.hexColor
            : ACCENT
        )
          .setTitle(
            `🎨 ${role.name}`
          )
          .addFields(
            {
              name: "ID",
              value: role.id,
              inline: true
            },
            {
              name: "Members",
              value: String(
                role.members.size
              ),
              inline: true
            },
            {
              name: "Position",
              value: String(
                role.position
              ),
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

async function handleFun(i) {
  const sub =
    i.options.getSubcommand();

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

    const question =
      i.options.getString(
        "question"
      );

    return i.reply({
      embeds: [
        baseEmbed()
          .setTitle(
            "🎱 Magic 8-Ball"
          )
          .addFields(
            {
              name: "Question",
              value: clip(
                question,
                1024
              )
            },
            {
              name: "Answer",
              value:
                answers[
                  Math.floor(
                    Math.random() *
                      answers.length
                  )
                ]
            }
          )
      ]
    });
  }

  if (sub === "coinflip") {
    return sendEmbed(
      i,
      "🪙 Coin Flip",
      `The coin landed on **${
        Math.random() < 0.5
          ? "Heads"
          : "Tails"
      }**.`,
      ACCENT
    );
  }

  if (sub === "dice") {
    return sendEmbed(
      i,
      "🎲 Dice Roll",
      `You rolled **${
        Math.floor(
          Math.random() * 6
        ) + 1
      }**.`,
      ACCENT
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

    if (!options.length) {
      return safeReply(i, {
        content:
          "❌ Give me some options.",
        flags: MessageFlags.Ephemeral
      });
    }

    return sendEmbed(
      i,
      "🎯 JRC Chooses",
      `I choose **${
        options[
          Math.floor(
            Math.random() *
              options.length
          )
        ]
      }**.`,
      ACCENT
    );
  }

  if (sub === "rps") {
    const choices = [
      "rock",
      "paper",
      "scissors"
    ];

    const userChoice =
      i.options.getString(
        "choice"
      );

    const botChoice =
      choices[
        Math.floor(
          Math.random() *
            choices.length
        )
      ];

    let result = "It's a tie!";

    if (
      (userChoice === "rock" &&
        botChoice === "scissors") ||
      (userChoice === "paper" &&
        botChoice === "rock") ||
      (userChoice === "scissors" &&
        botChoice === "paper")
    ) {
      result = "You win! 🏆";
    } else if (
      userChoice !== botChoice
    ) {
      result = "JRC wins! 🤖";
    }

    return i.reply({
      embeds: [
        baseEmbed()
          .setTitle(
            "✊ Rock Paper Scissors"
          )
          .addFields(
            {
              name: "You",
              value: userChoice,
              inline: true
            },
            {
              name: "JRC",
              value: botChoice,
              inline: true
            },
            {
              name: "Result",
              value: result
            }
          )
      ]
    });
  }

  if (sub === "rate") {
    const thing =
      i.options.getString(
        "thing"
      );

    const rating =
      Math.floor(
        Math.random() * 101
      );

    return sendEmbed(
      i,
      "⭐ JRC Rating",
      `I rate **${clip(
        thing,
        200
      )}** a **${rating}/100**.`,
      ACCENT
    );
  }

  if (sub === "compliment") {
    const compliments = [
      "You're doing great.",
      "You've got this.",
      "Your energy is unmatched.",
      "You're genuinely awesome.",
      "Keep going — you're making progress."
    ];

    return sendEmbed(
      i,
      "💙 JRC Says",
      compliments[
        Math.floor(
          Math.random() *
            compliments.length
        )
      ],
      SUCCESS
    );
  }
}

/* =========================================================
   JRC CORE
   ========================================================= */

async function handleJRC(i) {
  const sub =
    i.options.getSubcommand();

  const cfg =
    guildConfig(
      i.guild.id
    );

  if (sub === "help") {
    const embed =
      baseEmbed()
        .setTitle(
          "🤖 JRC Bot"
        )
        .setDescription(
          "Your server's all-in-one management bot."
        )
        .addFields(
          {
            name: "👋 Community",
            value:
              "`/welcome` • `/goodbye`"
          },
          {
            name: "🎭 Roles",
            value:
              "`/role` • `/autorole` • `/reactionrole`"
          },
          {
            name: "🛡️ Moderation",
            value:
              "`/mod` • `/logs`"
          },
          {
            name: "🔐 Security",
            value:
              "`/security` • `/automod`"
          },
          {
            name: "🧩 Embeds",
            value:
              "`/embed`"
          },
          {
            name: "⚙️ Utility",
            value:
              "`/utility`"
          },
          {
            name: "😂 Fun",
            value:
              "`/fun`"
          }
        );

    return i.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "about") {
    return i.reply({
      embeds: [
        baseEmbed()
          .setTitle(
            "🤖 JRC Bot"
          )
          .setDescription(
            "A lightweight Discord server management bot built for JRC."
          )
          .addFields(
            {
              name: "⚡ Version",
              value: "JRC 3.0",
              inline: true
            },
            {
              name: "📡 Status",
              value: "Online",
              inline: true
            },
            {
              name: "🌐 Servers",
              value: String(
                client.guilds.cache.size
              ),
              inline: true
            }
          )
      ]
    });
  }

  if (sub === "status") {
    return i.reply({
      embeds: [
        baseEmbed(SUCCESS)
          .setTitle(
            "📊 JRC Status"
          )
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
              value:
                cfg.welcome.enabled
                  ? "🟢"
                  : "🔴",
              inline: true
            },
            {
              name: "Goodbye",
              value:
                cfg.goodbye.enabled
                  ? "🟢"
                  : "🔴",
              inline: true
            },
            {
              name: "Logs",
              value:
                cfg.logs.enabled
                  ? "🟢"
                  : "🔴",
              inline: true
            },
            {
              name: "Security",
              value:
                Object.values(
                  cfg.security
                ).some(
                  x => x === true
                )
                  ? "🟢 Active"
                  : "🔴 Off",
              inline: true
            }
          )
      ]
    });
  }

  if (sub === "settings") {
    return i.reply({
      embeds: [
        baseEmbed()
          .setTitle(
            "⚙️ JRC Settings"
          )
          .addFields(
            {
              name: "👋 Welcome",
              value:
                cfg.welcome.enabled
                  ? `🟢 <#${cfg.welcome.channel || "?"}>`
                  : "🔴 Disabled"
            },
            {
              name: "🚪 Goodbye",
              value:
                cfg.goodbye.enabled
                  ? `🟢 <#${cfg.goodbye.channel || "?"}>`
                  : "🔴 Disabled"
            },
            {
              name: "📋 Logs",
              value:
                cfg.logs.enabled
                  ? `🟢 <#${cfg.logs.channel || "?"}>`
                  : "🔴 Disabled"
            },
            {
              name: "🎭 Autorole",
              value:
                cfg.autoRole.enabled
                  ? "🟢 Enabled"
                  : "🔴 Disabled"
            },
            {
              name: "🛡️ Automod",
              value:
                cfg.automod.enabled
                  ? "🟢 Enabled"
                  : "🔴 Disabled"
            }
          ],
        flags: MessageFlags.Ephemeral
      ]
    });
  }
}

/* =========================================================
   INTERACTION HANDLER
   ========================================================= */

client.on(
  "interactionCreate",
  async interaction => {
    try {
      if (
        interaction.isChatInputCommand()
      ) {
        switch (
          interaction.commandName
        ) {
          case "jrc":
            return handleJRC(
              interaction
            );

          case "welcome":
            return handleGreetingCommand(
              interaction,
              "welcome"
            );

          case "goodbye":
            return handleGreetingCommand(
              interaction,
              "goodbye"
            );

          case "mod":
            return handleMod(
              interaction
            );

          case "logs":
            return handleLogs(
              interaction
            );

          case "security":
            return handleSecurity(
              interaction
            );

          case "automod":
            return handleAutoMod(
              interaction
            );

          case "role":
            return handleRole(
              interaction
            );

          case "autorole":
            return handleAutoRole(
              interaction
            );

          case "reactionrole":
            return handleReactionRole(
              interaction
            );

          case "embed":
            return handleEmbed(
              interaction
            );

          case "utility":
            return handleUtility(
              interaction
            );

          case "fun":
            return handleFun(
              interaction
            );
        }
      }

      /* =====================================================
         BUTTONS
         ===================================================== */

      if (
        interaction.isButton()
      ) {
        const id =
          interaction.customId;

        if (
          !id.startsWith("jrc_")
        ) {
          return;
        }

        const parts =
          id.split("_");

        const action =
          parts[1];

        const type =
          parts[2];

        if (
          !["welcome", "goodbye"]
            .includes(type)
        ) {
          return;
        }

        if (!hasManageGuild(interaction)) {
          return safeReply(
            interaction,
            {
              content:
                "❌ You need **Manage Server**.",
              flags:
                MessageFlags.Ephemeral
            }
          );
        }

        const cfg =
          guildConfig(
            interaction.guild.id
          )[type];

        if (action === "enable") {
          cfg.enabled = true;
          saveConfig();

          return interaction.update(
            greetingPanel(
              type,
              interaction.guild
            )
          );
        }

        if (action === "disable") {
          cfg.enabled = false;
          saveConfig();

          return interaction.update(
            greetingPanel(
              type,
              interaction.guild
            )
          );
        }

        if (action === "preview") {
          return interaction.reply({
            embeds: [
              buildGreetingEmbed(
                type,
                interaction.member,
                cfg
              )
            ],
            flags:
              MessageFlags.Ephemeral
          });
        }

        if (
          action === "channel"
        ) {
          const menu =
            new ChannelSelectMenuBuilder()
              .setCustomId(
                `jrc_select_channel_${type}`
              )
              .setPlaceholder(
                `Select ${type} channel`
              )
              .setChannelTypes(
                ChannelType.GuildText
              );

          return interaction.reply({
            components: [
              new ActionRowBuilder().addComponents(
                menu
              )
            ],
            flags:
              MessageFlags.Ephemeral
          });
        }

        if (
          action === "config"
        ) {
          const modal =
            new ModalBuilder()
              .setCustomId(
                `jrc_modal_${type}`
              )
              .setTitle(
                type === "welcome"
                  ? "Welcome Configuration"
                  : "Goodbye Configuration"
              );

          const fields = [
            [
              "title",
              "Embed Title",
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
              1000
            ],
            [
              "color",
              "Embed Color",
              cfg.color,
              TextInputStyle.Short,
              false,
              7
            ],
            [
              "image",
              "Image / GIF URL",
              cfg.image || "",
              TextInputStyle.Short,
              false,
              1000
            ]
          ];

          for (
            const [
              fieldId,
              label,
              value,
              style,
              required,
              max
            ] of fields
          ) {
            const input =
              new TextInputBuilder()
                .setCustomId(
                  fieldId
                )
                .setLabel(label)
                .setStyle(style)
                .setRequired(required)
                .setMaxLength(max)
                .setValue(
                  String(
                    value || ""
                  ).slice(0, max)
                );

            modal.addComponents(
              new ActionRowBuilder().addComponents(
                input
              )
            );
          }

          return interaction.showModal(
            modal
          );
        }
      }

      /* =====================================================
         CHANNEL SELECT
         ===================================================== */

      if (
        interaction.isChannelSelectMenu()
      ) {
        if (
          !interaction.customId.startsWith(
            "jrc_select_channel_"
          )
        ) {
          return;
        }

        const type =
          interaction.customId.replace(
            "jrc_select_channel_",
            ""
          );

        if (
          !["welcome", "goodbye"]
            .includes(type)
        ) {
          return;
        }

        const channel =
          interaction.channels.first();

        const cfg =
          guildConfig(
            interaction.guild.id
          )[type];

        cfg.channel =
          channel.id;

        saveConfig();

        return interaction.update({
          content:
            `📢 ${type} channel set to ${channel}.`,
          components: []
        });
      }

      /* =====================================================
         MODALS
         ===================================================== */

      if (
        interaction.isModalSubmit()
      ) {
        if (
          !interaction.customId.startsWith(
            "jrc_modal_"
          )
        ) {
          return;
        }

        if (!hasManageGuild(interaction)) {
          return safeReply(
            interaction,
            {
              content:
                "❌ You need **Manage Server**.",
              flags:
                MessageFlags.Ephemeral
            }
          );
        }

        const type =
          interaction.customId.replace(
            "jrc_modal_",
            ""
          );

        if (
          !["welcome", "goodbye"]
            .includes(type)
        ) {
          return;
        }

        const cfg =
          guildConfig(
            interaction.guild.id
          )[type];

        const title =
          interaction.fields.getTextInputValue(
            "title"
          );

        const description =
          interaction.fields.getTextInputValue(
            "description"
          );

        const message =
          interaction.fields.getTextInputValue(
            "message"
          );

        const color =
          interaction.fields.getTextInputValue(
            "color"
          ) || ACCENT;

        const image =
          interaction.fields.getTextInputValue(
            "image"
          ) || null;

        if (!validColor(color)) {
          return safeReply(
            interaction,
            {
              content:
                "❌ Invalid color. Example: `#5865F2`",
              flags:
                MessageFlags.Ephemeral
            }
          );
        }

        if (
          image &&
          !validImage(image)
        ) {
          return safeReply(
            interaction,
            {
              content:
                "❌ Invalid image/GIF URL.",
              flags:
                MessageFlags.Ephemeral
            }
          );
        }

        Object.assign(
          cfg,
          {
            title,
            description,
            message,
            color: normColor(
              color
            ),
            image
          }
        );

        saveConfig();

        return interaction.reply({
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
    } catch (error) {
      console.error(
        "Interaction error:",
        error
      );

      return safeReply(
        interaction,
        {
          content:
            "❌ JRC couldn't complete that action. Check the bot's permissions and try again.",
          flags:
            MessageFlags.Ephemeral
        }
      );
    }
  }
);

/* =========================================================
   WELCOME
   ========================================================= */

client.on(
  "guildMemberAdd",
  async member => {
    try {
      const cfg =
        guildConfig(
          member.guild.id
        );

      /* Autorole */
      if (
        cfg.autoRole.enabled &&
        cfg.autoRole.role
      ) {
        const role =
          member.guild.roles.cache.get(
            cfg.autoRole.role
          );

        if (
          role &&
          !role.managed &&
          member.guild.members.me &&
          role.position <
            member.guild.members.me.roles
              .highest.position
        ) {
          await member.roles
            .add(
              role,
              "JRC autorole"
            )
            .catch(() => {});
        }
      }

      await logAction(
        member.guild,
        "📥 MEMBER JOINED",
        `${member} joined the server.`,
        SUCCESS,
        [
          {
            name: "👤 User",
            value: `${member.user} (${member.id})`
          }
        ]
      );

      if (
        cfg.security.antiRaid
      ) {
        const now =
          Date.now();

        cfg._joins =
          (
            cfg._joins || []
          ).filter(
            t =>
              now - t <
              cfg.security
                .raidInterval
          );

        cfg._joins.push(
          now
        );

        if (
          cfg._joins.length >=
          cfg.security
            .raidThreshold
        ) {
          await logAction(
            member.guild,
            "🚨 RAID ALERT",
            `JRC detected **${cfg._joins.length} joins** in a short period.`,
            DANGER
          );
        }

        saveConfig();
      }

      const settings =
        cfg.welcome;

      if (
        !settings.enabled ||
        !settings.channel
      ) {
        return;
      }

      const channel =
        member.guild.channels.cache.get(
          settings.channel
        );

      if (
        !channel?.isTextBased()
      ) {
        return;
      }

      await channel.send({
        embeds: [
          buildGreetingEmbed(
            "welcome",
            member,
            settings
          )
        ]
      });
    } catch (error) {
      console.error(
        "Welcome error:",
        error
      );
    }
  }
);

/* =========================================================
   GOODBYE
   ========================================================= */

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
        DANGER,
        [
          {
            name: "👤 User",
            value:
              member.user?.tag ||
              member.id
          }
        ]
      );

      const settings =
        cfg.goodbye;

      if (
        !settings.enabled ||
        !settings.channel
      ) {
        return;
      }

      const channel =
        member.guild.channels.cache.get(
          settings.channel
        );

      if (
        !channel?.isTextBased()
      ) {
        return;
      }

      await channel.send({
        embeds: [
          buildGreetingEmbed(
            "goodbye",
            member,
            settings
          )
        ]
      });
    } catch (error) {
      console.error(
        "Goodbye error:",
        error
      );
    }
  }
);

/* =========================================================
   MESSAGE SECURITY / AUTOMOD
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
      ) {
        return;
      }

      const cfg =
        guildConfig(
          message.guild.id
        );

      const content =
        message.content.toLowerCase();

      /* Anti mention */
      if (
        cfg.security.antiMention &&
        (
          message.mentions.everyone ||
          message.mentions.users.size >=
            cfg.security
              .mentionLimit
        ) &&
        !message.member?.permissions.has(
          PermissionFlagsBits.MentionEveryone
        )
      ) {
        await message.delete()
          .catch(() => {});

        await logAction(
          message.guild,
          "📢 MENTION PROTECTION",
          `${message.author} triggered mention protection in ${message.channel}.`,
          WARNING
        );

        return;
      }

      /* Anti link */
      if (
        (
          cfg.security.antiLink ||
          (
            cfg.automod.enabled &&
            cfg.automod.links
          )
        ) &&
        /(https?:\/\/|www\.)/i.test(
          message.content
        ) &&
        !message.member?.permissions.has(
          PermissionFlagsBits.ManageMessages
        )
      ) {
        await message.delete()
          .catch(() => {});

        const warning =
          await message.channel.send({
            embeds: [
              baseEmbed(WARNING)
                .setTitle(
                  "🔗 Link Blocked"
                )
                .setDescription(
                  `${message.author}, links aren't allowed here.`
                )
            ]
          })
            .catch(() => null);

        if (warning) {
          setTimeout(
            () =>
              warning
                .delete()
                .catch(() => {}),
            5000
          );
        }

        await logAction(
          message.guild,
          "🔗 LINK BLOCKED",
          `${message.author} posted a blocked link in ${message.channel}.`,
          WARNING
        );

        return;
      }

      /* Blocked words */
      if (
        cfg.automod.enabled &&
        cfg.automod.words.some(
          word =>
            content.includes(
              word.toLowerCase()
            )
        )
      ) {
        await message.delete()
          .catch(() => {});

        await logAction(
          message.guild,
          "🚫 BLOCKED WORD",
          `${message.author} triggered blocked-word protection in ${message.channel}.`,
          WARNING
        );

        return;
      }

      /* Anti-spam */
      const antiSpam =
        cfg.security.antiSpam ||
        (
          cfg.automod.enabled &&
          cfg.automod.spam.enabled
        );

      if (antiSpam) {
        const key =
          `${message.guild.id}:${message.author.id}`;

        const now =
          Date.now();

        const interval =
          cfg.automod.spam.interval ||
          5000;

        const limit =
          cfg.automod.spam.limit ||
          6;

        const recent =
          (
            spamTracker.get(
              key
            ) || []
          ).filter(
            timestamp =>
              now - timestamp <
              interval
          );

        recent.push(now);

        spamTracker.set(
          key,
          recent
        );

        if (
          recent.length >=
          limit
        ) {
          spamTracker.set(
            key,
            []
          );

          if (
            message.member?.moderatable
          ) {
            await message.member
              .timeout(
                10000,
                "JRC anti-spam protection"
              )
              .catch(() => {});
          }

          await logAction(
            message.guild,
            "🛡️ SPAM PROTECTION",
            `${message.author} triggered anti-spam protection.`,
            WARNING
          );
        }
      }
    } catch (error) {
      console.error(
        "Security error:",
        error
      );
    }
  }
);

/* =========================================================
   REACTION ROLES
   ========================================================= */

async function handleReactionRoleEvent(
  reaction,
  user,
  add
) {
  try {
    if (user.bot) return;

    if (reaction.partial) {
      await reaction
        .fetch()
        .catch(() => {});
    }

    const guild =
      reaction.message.guild;

    if (!guild) return;

    const cfg =
      guildConfig(
        guild.id
      );

    const emoji =
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
            x.emoji === emoji
          )
      );

    if (!match) return;

    const member =
      await guild.members
        .fetch(user.id)
        .catch(() => null);

    if (!member) return;

    const role =
      guild.roles.cache.get(
        match.role
      );

    if (
      !role ||
      role.managed ||
      !guild.members.me ||
      role.position >=
        guild.members.me.roles
          .highest.position
    ) {
      return;
    }

    if (add) {
      await member.roles
        .add(
          role,
          "JRC self-role"
        )
        .catch(() => {});
    } else {
      await member.roles
        .remove(
          role,
          "JRC self-role"
        )
        .catch(() => {});
    }
  } catch (error) {
    console.error(
      "Reaction role error:",
      error
    );
  }
}

client.on(
  "messageReactionAdd",
  (reaction, user) =>
    handleReactionRoleEvent(
      reaction,
      user,
      true
    )
);

client.on(
  "messageReactionRemove",
  (reaction, user) =>
    handleReactionRoleEvent(
      reaction,
      user,
      false
    )
);

/* =========================================================
   MOD LOG EVENTS
   ========================================================= */

client.on(
  "messageDelete",
  async message => {
    try {
      if (
        !message.guild ||
        message.author?.bot
      ) {
        return;
      }

      await logAction(
        message.guild,
        "🗑️ MESSAGE DELETED",
        `${message.author || "Unknown user"} deleted a message in ${message.channel}.`,
        DANGER,
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
      ) {
        return;
      }

      if (
        oldMessage.content ===
        newMessage.content
      ) {
        return;
      }

      await logAction(
        newMessage.guild,
        "✏️ MESSAGE EDITED",
        `${newMessage.author} edited a message in ${newMessage.channel}.`,
        WARNING,
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
        [...newRoles].filter(
          role =>
            !oldRoles.has(role) &&
            role !== newMember.guild.id
        );

      const removed =
        [...oldRoles].filter(
          role =>
            !newRoles.has(role) &&
            role !== newMember.guild.id
        );

      if (added.length) {
        await logAction(
          newMember.guild,
          "➕ ROLE ADDED",
          `${newMember} received ${added
            .map(
              id => `<@&${id}>`
            )
            .join(", ")}.`,
          SUCCESS
        );
      }

      if (removed.length) {
        await logAction(
          newMember.guild,
          "➖ ROLE REMOVED",
          `${newMember} lost ${removed
            .map(
              id => `<@&${id}>`
            )
            .join(", ")}.`,
          DANGER
        );
      }

      if (
        oldMember.nickname !==
        newMember.nickname
      ) {
        await logAction(
          newMember.guild,
          "✏️ NICKNAME UPDATED",
          `${newMember} changed nickname.`,
          WARNING,
          [
            {
              name: "Before",
              value:
                oldMember.nickname ||
                oldMember.user.username
            },
            {
              name: "After",
              value:
                newMember.nickname ||
                newMember.user.username
            }
          ]
        );
      }
    } catch {}
  }
);

/* =========================================================
   READY
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
        "❌ Missing DISCORD_TOKEN or CLIENT_ID."
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
        `✅ Registered ${commands.length} command groups.`
      );
    } catch (error) {
      console.error(
        "❌ Command registration failed:",
        error
      );
    }
  }
);

/* =========================================================
   ERROR PROTECTION
   ========================================================= */

process.on(
  "unhandledRejection",
  error => {
    console.error(
      "Unhandled rejection:",
      error
    );
  }
);

process.on(
  "uncaughtException",
  error => {
    console.error(
      "Uncaught exception:",
      error
    );
  }
);

/* =========================================================
   LOGIN
   ========================================================= */

if (
  !process.env.DISCORD_TOKEN
) {
  console.error(
    "❌ DISCORD_TOKEN is missing."
  );
} else {
  client
    .login(
      process.env.DISCORD_TOKEN
    )
    .catch(error => {
      console.error(
        "❌ Login failed:",
        error
      );
    });
}
