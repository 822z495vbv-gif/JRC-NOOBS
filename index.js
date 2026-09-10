// ============================================================
// JRC BOT — ALL-IN-ONE SINGLE FILE
// Discord.js v14
// ============================================================

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

// ============================================================
// CLIENT
// ============================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.GuildMember, Partials.Message]
});

// ============================================================
// CONFIG
// ============================================================

const CONFIG_FILE = path.join(__dirname, "config.json");

let config = {};

if (fs.existsSync(CONFIG_FILE)) {
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  } catch {
    config = {};
  }
}

function saveConfig() {
  fs.writeFileSync(
    CONFIG_FILE,
    JSON.stringify(config, null, 2),
    "utf8"
  );
}

function guildConfig(guildId) {
  if (!config[guildId]) {
    config[guildId] = {};
  }

  const g = config[guildId];

  // ----------------------------------------------------------
  // WELCOME
  // ----------------------------------------------------------

  if (!g.welcome) {
    g.welcome = {
      enabled: false,
      channel: null,
      title: "Welcome!",
      description: "Welcome to {server}!",
      message: "Welcome {user}!",
      color: "#5865F2",
      image: null,
      gif: null,
      footer: "JRC Bot",
      timestamp: true,
      thumbnail: true
    };
  }

  // ----------------------------------------------------------
  // GOODBYE
  // ----------------------------------------------------------

  if (!g.goodbye) {
    g.goodbye = {
      enabled: false,
      channel: null,
      title: "Goodbye!",
      description: "{username} has left {server}.",
      message: "Goodbye {user}!",
      color: "#ED4245",
      image: null,
      gif: null,
      footer: "JRC Bot",
      timestamp: true,
      thumbnail: true
    };
  }

  // ----------------------------------------------------------
  // WARNINGS
  // ----------------------------------------------------------

  if (!g.warnings) {
    g.warnings = {};
  }

  // ----------------------------------------------------------
  // AUTOMOD
  // ----------------------------------------------------------

  if (!g.automod) {
    g.automod = {
      enabled: false,
      words: [],
      spam: {
        enabled: true,
        limit: 5,
        interval: 5000
      },
      links: false
    };
  }

  // ----------------------------------------------------------
  // LOGS
  // ----------------------------------------------------------

  if (!g.logs) {
    g.logs = {
      enabled: false,
      channel: null
    };
  }

  // ----------------------------------------------------------
  // REACTION ROLES
  // ----------------------------------------------------------

  if (!g.reactionRoles) {
    g.reactionRoles = [];
  }

  // ----------------------------------------------------------
  // ANTINUKE
  // ----------------------------------------------------------

  if (!g.antinuke) {
    g.antinuke = {
      enabled: false,
      threshold: 3,
      interval: 10000
    };
  }

  // ----------------------------------------------------------
  // RAID
  // ----------------------------------------------------------

  if (!g.raid) {
    g.raid = {
      enabled: false,
      threshold: 5,
      interval: 10000,
      action: "alert",
      activeUntil: 0
    };
  }

  saveConfig();

  return g;
}

// ============================================================
// VARIABLES
// ============================================================

function replaceVariables(text, member) {
  if (!text) return "";

  return text
    .replaceAll("{user}", `<@${member.id}>`)
    .replaceAll("{username}", member.user.username)
    .replaceAll("{server}", member.guild.name);
}

// ============================================================
// HELPERS
// ============================================================

function validColor(color) {
  return /^#[0-9A-F]{6}$/i.test(color || "");
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

function replyEmbed(interaction, title, description, color = "#5865F2") {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp();

  return interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral
  });
}

async function safeReply(interaction, data) {
  try {
    if (interaction.replied || interaction.deferred) {
      return await interaction.followUp(data);
    }

    return await interaction.reply(data);
  } catch {}
}

// ============================================================
// WELCOME / GOODBYE EMBED
// ============================================================

function buildGreetingEmbed(type, member, settings) {
  const embed = new EmbedBuilder()
    .setTitle(
      replaceVariables(settings.title, member)
    )
    .setDescription(
      replaceVariables(settings.description, member)
    )
    .setColor(
      validColor(settings.color)
        ? settings.color
        : "#5865F2"
    );

  if (settings.message) {
    embed.addFields({
      name: "Message",
      value: replaceVariables(settings.message, member)
    });
  }

  if (settings.thumbnail) {
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

  if (settings.gif && validImage(settings.gif)) {
    embed.setImage(settings.gif);
  }

  if (settings.footer) {
    embed.setFooter({
      text: settings.footer
    });
  }

  if (settings.timestamp) {
    embed.setTimestamp();
  }

  return embed;
}

// ============================================================
// WELCOME / GOODBYE CONTROL PANEL
// ============================================================

function greetingPanel(type, guild) {
  const settings = guildConfig(guild.id)[type];

  const status = settings.enabled
    ? "🟢 **Enabled**"
    : "🔴 **Disabled**";

  const channel = settings.channel
    ? `<#${settings.channel}>`
    : "Not configured";

  const embed = new EmbedBuilder()
    .setTitle(
      type === "welcome"
        ? "👋 Welcome System"
        : "👋 Goodbye System"
    )
    .setDescription(
      `Configure your ${type} system from this panel.\n\n` +
      `**Status:** ${status}\n` +
      `**Channel:** ${channel}\n\n` +
      `**Variables**\n` +
      "`{user}` • `{username}` • `{server}`"
    )
    .setColor(
      type === "welcome"
        ? "#5865F2"
        : "#ED4245"
    )
    .setFooter({
      text: "JRC Bot • Configuration Panel"
    })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`jrc_${type}_configure`)
      .setLabel("Configure")
      .setEmoji("⚙️")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId(`jrc_${type}_channel`)
      .setLabel("Channel")
      .setEmoji("📢")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId(`jrc_${type}_preview`)
      .setLabel("Preview")
      .setEmoji("👁️")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId(`jrc_${type}_enable`)
      .setLabel("Enable")
      .setEmoji("🟢")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId(`jrc_${type}_disable`)
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

// ============================================================
// SLASH COMMANDS
// ============================================================

const commands = [

  // ==========================================================
  // JRC
  // ==========================================================

  new SlashCommandBuilder()
    .setName("jrc")
    .setDescription("JRC Bot control panel")
    .addSubcommand(s =>
      s.setName("help").setDescription("Show JRC commands")
    )
    .addSubcommand(s =>
      s.setName("settings").setDescription("View server settings")
    )
    .addSubcommand(s =>
      s.setName("about").setDescription("About JRC Bot")
    )
    .addSubcommand(s =>
      s.setName("status").setDescription("View bot status")
    ),

  // ==========================================================
  // WELCOME
  // ==========================================================

  new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("Configure welcome messages")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    .addSubcommand(s =>
      s.setName("setup").setDescription("Open welcome setup")
    )

    .addSubcommand(s =>
      s.setName("disable").setDescription("Disable welcome messages")
    )

    .addSubcommand(s =>
      s.setName("test").setDescription("Test welcome message")
    )

    .addSubcommand(s =>
      s
        .setName("message")
        .setDescription("Set welcome message")
        .addStringOption(o =>
          o
            .setName("message")
            .setDescription("Message")
            .setRequired(true)
        )
    )

    .addSubcommand(s =>
      s
        .setName("channel")
        .setDescription("Set welcome channel")
        .addChannelOption(o =>
          o
            .setName("channel")
            .setDescription("Channel")
            .addChannelTypes(
              ChannelType.GuildText,
              ChannelType.GuildAnnouncement
            )
            .setRequired(true)
        )
    )

    .addSubcommand(s =>
      s.setName("preview").setDescription("Preview welcome")
    ),

  // ==========================================================
  // GOODBYE
  // ==========================================================

  new SlashCommandBuilder()
    .setName("goodbye")
    .setDescription("Configure goodbye messages")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    .addSubcommand(s =>
      s.setName("setup").setDescription("Open goodbye setup")
    )

    .addSubcommand(s =>
      s.setName("disable").setDescription("Disable goodbye messages")
    )

    .addSubcommand(s =>
      s.setName("test").setDescription("Test goodbye message")
    )

    .addSubcommand(s =>
      s
        .setName("message")
        .setDescription("Set goodbye message")
        .addStringOption(o =>
          o
            .setName("message")
            .setDescription("Message")
            .setRequired(true)
        )
    )

    .addSubcommand(s =>
      s
        .setName("channel")
        .setDescription("Set goodbye channel")
        .addChannelOption(o =>
          o
            .setName("channel")
            .setDescription("Channel")
            .addChannelTypes(
              ChannelType.GuildText,
              ChannelType.GuildAnnouncement
            )
            .setRequired(true)
        )
    )

    .addSubcommand(s =>
      s.setName("preview").setDescription("Preview goodbye")
    ),

  // ==========================================================
  // MOD
  // ==========================================================

  new SlashCommandBuilder()
    .setName("mod")
    .setDescription("Moderation commands")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)

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
            .setDescription("Minutes")
            .setMinValue(1)
            .setMaxValue(40320)
            .setRequired(true)
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
          o.setName("reason").setDescription("Reason")
        )
    )

    .addSubcommand(s =>
      s
        .setName("warnings")
        .setDescription("View warnings")
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
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(true)
        )
    )

    .addSubcommand(s =>
      s.setName("lock").setDescription("Lock current channel")
    )

    .addSubcommand(s =>
      s.setName("unlock").setDescription("Unlock current channel")
    ),

  // ==========================================================
  // AUTOMOD
  // ==========================================================

  new SlashCommandBuilder()
    .setName("automod")
    .setDescription("Auto moderation")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    .addSubcommand(s =>
      s.setName("setup").setDescription("Setup AutoMod")
    )

    .addSubcommand(s =>
      s.setName("enable").setDescription("Enable AutoMod")
    )

    .addSubcommand(s =>
      s.setName("disable").setDescription("Disable AutoMod")
    )

    .addSubcommand(s =>
      s
        .setName("words")
        .setDescription("Set blocked words")
        .addStringOption(o =>
          o
            .setName("words")
            .setDescription("Comma-separated words")
            .setRequired(true)
        )
    )

    .addSubcommand(s =>
      s
        .setName("spam")
        .setDescription("Set spam limit")
        .addIntegerOption(o =>
          o
            .setName("limit")
            .setDescription("Messages allowed")
            .setMinValue(3)
            .setMaxValue(20)
            .setRequired(true)
        )
    )

    .addSubcommand(s =>
      s
        .setName("links")
        .setDescription("Configure link filter")
        .addBooleanOption(o =>
          o
            .setName("enabled")
            .setDescription("Enable links filter")
            .setRequired(true)
        )
    ),

  // ==========================================================
  // REACTION ROLE
  // ==========================================================

  new SlashCommandBuilder()
    .setName("reactionrole")
    .setDescription("Reaction role system")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)

    .addSubcommand(s =>
      s
        .setName("create")
        .setDescription("Create a reaction role")
        .addRoleOption(o =>
          o.setName("role").setDescription("Role").setRequired(true)
        )
        .addStringOption(o =>
          o.setName("label").setDescription("Button label").setRequired(true)
        )
        .addStringOption(o =>
          o.setName("emoji").setDescription("Button emoji")
        )
    )

    .addSubcommand(s =>
      s
        .setName("add")
        .setDescription("Add reaction role to a message")
        .addStringOption(o =>
          o.setName("message").setDescription("Message ID").setRequired(true)
        )
        .addRoleOption(o =>
          o.setName("role").setDescription("Role").setRequired(true)
        )
        .addStringOption(o =>
          o.setName("label").setDescription("Button label").setRequired(true)
        )
        .addStringOption(o =>
          o.setName("emoji").setDescription("Emoji")
        )
    )

    .addSubcommand(s =>
      s
        .setName("remove")
        .setDescription("Remove reaction role")
        .addStringOption(o =>
          o.setName("message").setDescription("Message ID").setRequired(true)
        )
        .addRoleOption(o =>
          o.setName("role").setDescription("Role").setRequired(true)
        )
    )

    .addSubcommand(s =>
      s.setName("list").setDescription("List reaction roles")
    ),

  // ==========================================================
  // LOGS
  // ==========================================================

  new SlashCommandBuilder()
    .setName("logs")
    .setDescription("Server logging")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    .addSubcommand(s =>
      s
        .setName("setup")
        .setDescription("Setup logs")
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
    ),

  // ==========================================================
  // UTILITY
  // ==========================================================

  new SlashCommandBuilder()
    .setName("utility")
    .setDescription("Utility commands")

    .addSubcommand(s =>
      s
        .setName("userinfo")
        .setDescription("User information")
        .addUserOption(o =>
          o.setName("user").setDescription("User")
        )
    )

    .addSubcommand(s =>
      s
        .setName("serverinfo")
        .setDescription("Server information")
    )

    .addSubcommand(s =>
      s
        .setName("avatar")
        .setDescription("User avatar")
        .addUserOption(o =>
          o.setName("user").setDescription("User")
        )
    )

    .addSubcommand(s =>
      s
        .setName("roleinfo")
        .setDescription("Role information")
        .addRoleOption(o =>
          o.setName("role").setDescription("Role").setRequired(true)
        )
    )

    .addSubcommand(s =>
      s
        .setName("channelinfo")
        .setDescription("Channel information")
        .addChannelOption(o =>
          o.setName("channel").setDescription("Channel")
        )
    ),

  // ==========================================================
  // FUN
  // ==========================================================

  new SlashCommandBuilder()
    .setName("fun")
    .setDescription("Fun commands")

    .addSubcommand(s =>
      s
        .setName("8ball")
        .setDescription("Ask the 8-ball")
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
        .setDescription("Choose an option")
        .addStringOption(o =>
          o
            .setName("options")
            .setDescription("Comma-separated choices")
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
    ),

  // ==========================================================
  // ANTINUKE
  // ==========================================================

  new SlashCommandBuilder()
    .setName("antinuke")
    .setDescription("Anti-nuke protection")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

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
      s.setName("config").setDescription("Configure anti-nuke")
    )

    .addSubcommand(s =>
      s.setName("status").setDescription("View anti-nuke status")
    ),

  // ==========================================================
  // RAID
  // ==========================================================

  new SlashCommandBuilder()
    .setName("raid")
    .setDescription("Raid protection")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

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
      s.setName("config").setDescription("Configure raid protection")
    )

    .addSubcommand(s =>
      s.setName("status").setDescription("View raid protection status")
    )

].map(c => c.toJSON());

// ============================================================
// GLOBAL COMMAND REGISTRATION
// ============================================================

async function registerCommands() {
  if (!process.env.DISCORD_TOKEN) {
    console.error("❌ DISCORD_TOKEN is missing.");
    return;
  }

  if (!process.env.CLIENT_ID) {
    console.error("❌ CLIENT_ID is missing.");
    return;
  }

  const rest = new REST({ version: "10" })
    .setToken(process.env.DISCORD_TOKEN);

  try {
    console.log("🔄 Registering GLOBAL slash commands...");

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      {
        body: commands
      }
    );

    console.log(
      `✅ Registered ${commands.length} global command groups.`
    );
  } catch (error) {
    console.error("❌ Command registration failed:", error);
  }
}

// ============================================================
// READY
// ============================================================

client.once("ready", async () => {
  console.log("====================================");
  console.log("        JRC BOT IS ONLINE");
  console.log("====================================");
  console.log(`🤖 Bot: ${client.user.tag}`);
  console.log(`🏠 Servers: ${client.guilds.cache.size}`);
  console.log(`📡 Ping: ${client.ws.ping}ms`);

  client.user.setActivity("JRC Bot • /jrc help");

  await registerCommands();
});

// ============================================================
// /JRC
// ============================================================

async function handleJRC(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === "help") {
    const embed = new EmbedBuilder()
      .setTitle("🤖 JRC Bot")
      .setDescription(
        "**Command Center**\n\n" +
        "⚙️ `/jrc` — Bot controls\n" +
        "👋 `/welcome` — Welcome system\n" +
        "👋 `/goodbye` — Goodbye system\n" +
        "🛡️ `/mod` — Moderation\n" +
        "🤖 `/automod` — AutoMod\n" +
        "🎭 `/reactionrole` — Reaction roles\n" +
        "📋 `/logs` — Server logs\n" +
        "🔧 `/utility` — Utilities\n" +
        "🎮 `/fun` — Fun commands\n" +
        "☢️ `/antinuke` — Anti-nuke\n" +
        "🚨 `/raid` — Raid protection"
      )
      .setColor("#5865F2")
      .setFooter({ text: "JRC Bot" });

    return interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "about") {
    return replyEmbed(
      interaction,
      "🤖 JRC Bot",
      "A modular Discord management bot built with Discord.js v14.\n\n**Version:** 1.0.0\n**Systems:** Moderation • AutoMod • Welcome • Logs • Protection",
      "#5865F2"
    );
  }

  if (sub === "status") {
    const embed = new EmbedBuilder()
      .setTitle("📡 JRC Status")
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
          name: "Users",
          value: `${client.guilds.cache.reduce(
            (a, g) => a + (g.memberCount || 0),
            0
          )}`,
          inline: true
        }
      )
      .setColor("#57F287")
      .setTimestamp();

    return interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === "settings") {
    const g = guildConfig(interaction.guild.id);

    const embed = new EmbedBuilder()
      .setTitle("⚙️ JRC Settings")
      .addFields(
        {
          name: "Welcome",
          value: g.welcome.enabled ? "🟢 Enabled" : "🔴 Disabled",
          inline: true
        },
        {
          name: "Goodbye",
          value: g.goodbye.enabled ? "🟢 Enabled" : "🔴 Disabled",
          inline: true
        },
        {
          name: "AutoMod",
          value: g.automod.enabled ? "🟢 Enabled" : "🔴 Disabled",
          inline: true
        },
        {
          name: "Logs",
          value: g.logs.enabled ? "🟢 Enabled" : "🔴 Disabled",
          inline: true
        },
        {
          name: "Anti-Nuke",
          value: g.antinuke.enabled ? "🟢 Enabled" : "🔴 Disabled",
          inline: true
        },
        {
          name: "Raid Protection",
          value: g.raid.enabled ? "🟢 Enabled" : "🔴 Disabled",
          inline: true
        }
      )
      .setColor("#5865F2");

    return interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral
    });
  }
}

// ============================================================
// WELCOME / GOODBYE COMMANDS
// ============================================================

async function handleGreetingCommand(interaction, type) {
  const sub = interaction.options.getSubcommand();
  const g = guildConfig(interaction.guild.id);
  const settings = g[type];

  if (sub === "setup") {
    return interaction.reply(greetingPanel(type, interaction.guild));
  }

  if (sub === "disable") {
    settings.enabled = false;
    saveConfig();

    return replyEmbed(
      interaction,
      "🔴 Disabled",
      `The ${type} system has been disabled.`,
      "#ED4245"
    );
  }

  if (sub === "message") {
    settings.message =
      interaction.options.getString("message");

    saveConfig();

    return replyEmbed(
      interaction,
      "✅ Message Updated",
      `Your ${type} message has been saved.`,
      "#57F287"
    );
  }

  if (sub === "channel") {
    const channel =
      interaction.options.getChannel("channel");

    settings.channel = channel.id;

    saveConfig();

    return replyEmbed(
      interaction,
      "📢 Channel Updated",
      `The ${type} channel is now ${channel}.`,
      "#57F287"
    );
  }

  if (sub === "preview" || sub === "test") {
    const embed = buildGreetingEmbed(
      type,
      interaction.member,
      settings
    );

    return interaction.reply({
      content: settings.message
        ? replaceVariables(settings.message, interaction.member)
        : null,
      embeds: [embed]
    });
  }
}

// ============================================================
// MODERATION
// ============================================================

async function handleMod(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === "ban") {
    const user = interaction.options.getUser("user");
    const reason =
      interaction.options.getString("reason") ||
      "No reason provided";

    const member =
      await interaction.guild.members.fetch(user.id)
        .catch(() => null);

    if (!member) {
      return replyEmbed(
        interaction,
        "❌ Error",
        "That member could not be found.",
        "#ED4245"
      );
    }

    await member.ban({ reason });

    await sendLog(
      interaction.guild,
      "🔨 Member Banned",
      `${user.tag} was banned.\n**Reason:** ${reason}`,
      "#ED4245"
    );

    return replyEmbed(
      interaction,
      "🔨 Banned",
      `**${user.tag}** has been banned.`,
      "#ED4245"
    );
  }

  if (sub === "kick") {
    const user = interaction.options.getUser("user");
    const reason =
      interaction.options.getString("reason") ||
      "No reason provided";

    const member =
      await interaction.guild.members.fetch(user.id)
        .catch(() => null);

    if (!member) {
      return replyEmbed(
        interaction,
        "❌ Error",
        "Member not found.",
        "#ED4245"
      );
    }

    await member.kick(reason);

    await sendLog(
      interaction.guild,
      "👢 Member Kicked",
      `${user.tag} was kicked.\n**Reason:** ${reason}`,
      "#ED4245"
    );

    return replyEmbed(
      interaction,
      "👢 Kicked",
      `**${user.tag}** has been kicked.`,
      "#ED4245"
    );
  }

  if (sub === "timeout") {
    const user = interaction.options.getUser("user");
    const minutes =
      interaction.options.getInteger("minutes");

    const reason =
      interaction.options.getString("reason") ||
      "No reason provided";

    const member =
      await interaction.guild.members.fetch(user.id)
        .catch(() => null);

    if (!member) {
      return replyEmbed(
        interaction,
        "❌ Error",
        "Member not found.",
        "#ED4245"
      );
    }

    await member.timeout(
      minutes * 60 * 1000,
      reason
    );

    return replyEmbed(
      interaction,
      "⏱️ Timed Out",
      `**${user.tag}** was timed out for **${minutes} minutes**.`,
      "#FEE75C"
    );
  }

  if (sub === "warn") {
    const user = interaction.options.getUser("user");

    const reason =
      interaction.options.getString("reason") ||
      "No reason provided";

    const g = guildConfig(interaction.guild.id);

    if (!g.warnings[user.id]) {
      g.warnings[user.id] = [];
    }

    g.warnings[user.id].push({
      reason,
      moderator: interaction.user.id,
      timestamp: Date.now()
    });

    saveConfig();

    return replyEmbed(
      interaction,
      "⚠️ Warning Issued",
      `**${user.tag}** has been warned.\n\n**Reason:** ${reason}\n**Total warnings:** ${g.warnings[user.id].length}`,
      "#FEE75C"
    );
  }

  if (sub === "warnings") {
    const user = interaction.options.getUser("user");
    const g = guildConfig(interaction.guild.id);

    const warnings = g.warnings[user.id] || [];

    if (!warnings.length) {
      return replyEmbed(
        interaction,
        "⚠️ Warnings",
        `**${user.tag}** has no warnings.`,
        "#57F287"
      );
    }

    const text = warnings
      .slice(-10)
      .map(
        (w, i) =>
          `**${i + 1}.** ${w.reason}\n<t:${Math.floor(
            w.timestamp / 1000
          )}:R>`
      )
      .join("\n\n");

    return replyEmbed(
      interaction,
      `⚠️ Warnings • ${user.tag}`,
      text,
      "#FEE75C"
    );
  }

  if (sub === "clear") {
    const amount =
      interaction.options.getInteger("amount");

    const messages =
      await interaction.channel.bulkDelete(
        amount,
        true
      );

    return replyEmbed(
      interaction,
      "🧹 Messages Cleared",
      `Deleted **${messages.size}** messages.`,
      "#57F287"
    );
  }

  if (sub === "lock" || sub === "unlock") {
    const everyone =
      interaction.guild.roles.everyone;

    await interaction.channel.permissionOverwrites.edit(
      everyone,
      {
        SendMessages:
          sub === "unlock" ? null : false
      }
    );

    return replyEmbed(
      interaction,
      sub === "lock"
        ? "🔒 Channel Locked"
        : "🔓 Channel Unlocked",
      sub === "lock"
        ? "Members can no longer send messages here."
        : "Members can send messages again.",
      sub === "lock"
        ? "#ED4245"
        : "#57F287"
    );
  }
}

// ============================================================
// AUTOMOD
// ============================================================

async function handleAutoMod(interaction) {
  const sub = interaction.options.getSubcommand();
  const g = guildConfig(interaction.guild.id);

  if (sub === "setup") {
    g.automod.enabled = true;
    saveConfig();

    return replyEmbed(
      interaction,
      "🤖 AutoMod Setup",
      "AutoMod has been configured and enabled.\n\nUse `/automod words`, `/automod spam`, and `/automod links` to configure protection.",
      "#5865F2"
    );
  }

  if (sub === "enable") {
    g.automod.enabled = true;
    saveConfig();

    return replyEmbed(
      interaction,
      "🟢 AutoMod Enabled",
      "Auto moderation is now active.",
      "#57F287"
    );
  }

  if (sub === "disable") {
    g.automod.enabled = false;
    saveConfig();

    return replyEmbed(
      interaction,
      "🔴 AutoMod Disabled",
      "Auto moderation is now disabled.",
      "#ED4245"
    );
  }

  if (sub === "words") {
    const words =
      interaction.options
        .getString("words")
        .split(",")
        .map(x => x.trim().toLowerCase())
        .filter(Boolean);

    g.automod.words = words;

    saveConfig();

    return replyEmbed(
      interaction,
      "🚫 Blocked Words Updated",
      `Configured **${words.length}** blocked words.`,
      "#ED4245"
    );
  }

  if (sub === "spam") {
    const limit =
      interaction.options.getInteger("limit");

    g.automod.spam.limit = limit;
    g.automod.spam.enabled = true;

    saveConfig();

    return replyEmbed(
      interaction,
      "💬 Spam Protection",
      `Spam protection allows **${limit} messages** within the configured window.`,
      "#5865F2"
    );
  }

  if (sub === "links") {
    const enabled =
      interaction.options.getBoolean("enabled");

    g.automod.links = enabled;

    saveConfig();

    return replyEmbed(
      interaction,
      "🔗 Link Protection",
      `Link protection is now ${
        enabled ? "**enabled**" : "**disabled**"
      }.`,
      "#5865F2"
    );
  }
}

// ============================================================
// LOGGING
// ============================================================

async function sendLog(guild, title, description, color) {
  const g = guildConfig(guild.id);

  if (!g.logs.enabled || !g.logs.channel) return;

  const channel =
    guild.channels.cache.get(g.logs.channel);

  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color || "#5865F2")
    .setTimestamp();

  await channel.send({
    embeds: [embed]
  }).catch(() => {});
}

async function handleLogs(interaction) {
  const sub = interaction.options.getSubcommand();
  const g = guildConfig(interaction.guild.id);

  if (sub === "setup") {
    const channel =
      interaction.options.getChannel("channel");

    g.logs.channel = channel.id;
    g.logs.enabled = true;

    saveConfig();

    return replyEmbed(
      interaction,
      "📋 Logs Enabled",
      `Server logs will be sent to ${channel}.`,
      "#57F287"
    );
  }

  if (sub === "disable") {
    g.logs.enabled = false;
    saveConfig();

    return replyEmbed(
      interaction,
      "🔴 Logs Disabled",
      "Server logging has been disabled.",
      "#ED4245"
    );
  }

  if (sub === "test") {
    await sendLog(
      interaction.guild,
      "📋 JRC Log Test",
      `Logging is working correctly.\nTriggered by ${interaction.user}.`,
      "#57F287"
    );

    return replyEmbed(
      interaction,
      "✅ Log Sent",
      "Check your configured log channel.",
      "#57F287"
    );
  }
}

// ============================================================
// REACTION ROLES
// ============================================================

async function handleReactionRole(interaction) {
  const sub = interaction.options.getSubcommand();
  const g = guildConfig(interaction.guild.id);

  if (sub === "create") {
    const role =
      interaction.options.getRole("role");

    const label =
      interaction.options.getString("label");

    const emoji =
      interaction.options.getString("emoji") || "🎭";

    const buttonId =
      `jrc_rr_${Date.now()}`;

    const button =
      new ButtonBuilder()
        .setCustomId(buttonId)
        .setLabel(label.slice(0, 80))
        .setStyle(ButtonStyle.Primary)
        .setEmoji(emoji);

    const embed =
      new EmbedBuilder()
        .setTitle("🎭 Reaction Role")
        .setDescription(
          `Click the button below to toggle ${role}.`
        )
        .setColor("#5865F2")
        .setFooter({
          text: "JRC Bot • Reaction Roles"
        });

    const message =
      await interaction.channel.send({
        embeds: [embed],
        components: [
          new ActionRowBuilder().addComponents(button)
        ]
      });

    g.reactionRoles.push({
      message: message.id,
      channel: interaction.channel.id,
      role: role.id,
      customId: buttonId,
      label
    });

    saveConfig();

    return replyEmbed(
      interaction,
      "🎭 Reaction Role Created",
      `Created a reaction role for ${role}.`,
      "#57F287"
    );
  }

  if (sub === "add") {
    const messageId =
      interaction.options.getString("message");

    const role =
      interaction.options.getRole("role");

    const label =
      interaction.options.getString("label");

    const emoji =
      interaction.options.getString("emoji") || "🎭";

    const message =
      await interaction.channel.messages
        .fetch(messageId)
        .catch(() => null);

    if (!message) {
      return replyEmbed(
        interaction,
        "❌ Error",
        "Message not found.",
        "#ED4245"
      );
    }

    const customId =
      `jrc_rr_${Date.now()}`;

    const button =
      new ButtonBuilder()
        .setCustomId(customId)
        .setLabel(label.slice(0, 80))
        .setEmoji(emoji)
        .setStyle(ButtonStyle.Primary);

    const rows =
      message.components.length
        ? message.components.map(row =>
            ActionRowBuilder.from(row)
          )
        : [new ActionRowBuilder()];

    let targetRow = rows[0];

    if (targetRow.components.length >= 5) {
      targetRow = new ActionRowBuilder();
      rows.push(targetRow);
    }

    targetRow.addComponents(button);

    await message.edit({
      components: rows
    });

    g.reactionRoles.push({
      message: message.id,
      channel: interaction.channel.id,
      role: role.id,
      customId,
      label
    });

    saveConfig();

    return replyEmbed(
      interaction,
      "✅ Reaction Role Added",
      `Added ${role} to the reaction role message.`,
      "#57F287"
    );
  }

  if (sub === "remove") {
    const messageId =
      interaction.options.getString("message");

    const role =
      interaction.options.getRole("role");

    const index =
      g.reactionRoles.findIndex(
        x =>
          x.message === messageId &&
          x.role === role.id
      );

    if (index === -1) {
      return replyEmbed(
        interaction,
        "❌ Not Found",
        "That reaction role was not found.",
        "#ED4245"
      );
    }

    const item =
      g.reactionRoles[index];

    const message =
      await interaction.channel.messages
        .fetch(messageId)
        .catch(() => null);

    if (message) {
      const rows =
        message.components.map(row =>
          ActionRowBuilder.from(row)
        );

      for (const row of rows) {
        const components =
          row.components.filter(
            c => c.customId !== item.customId
          );

        row.setComponents(components);
      }

      await message.edit({
        components: rows.filter(
          row => row.components.length
        )
      }).catch(() => {});
    }

    g.reactionRoles.splice(index, 1);
    saveConfig();

    return replyEmbed(
      interaction,
      "🗑️ Removed",
      `Removed ${role} from the reaction role system.`,
      "#57F287"
    );
  }

  if (sub === "list") {
    if (!g.reactionRoles.length) {
      return replyEmbed(
        interaction,
        "🎭 Reaction Roles",
        "No reaction roles are configured.",
        "#5865F2"
      );
    }

    const text =
      g.reactionRoles
        .map(
          (x, i) =>
            `**${i + 1}.** <@&${x.role}> • Message \`${x.message}\``
        )
        .join("\n");

    return replyEmbed(
      interaction,
      "🎭 Reaction Roles",
      text,
      "#5865F2"
    );
  }
}

// ============================================================
// UTILITY
// ============================================================

async function handleUtility(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === "userinfo") {
    const user =
      interaction.options.getUser("user") ||
      interaction.user;

    const member =
      await interaction.guild.members
        .fetch(user.id)
        .catch(() => null);

    const embed =
      new EmbedBuilder()
        .setTitle(`👤 ${user.username}`)
        .setThumbnail(
          user.displayAvatarURL({
            extension: "png",
            size: 512
          })
        )
        .addFields(
          {
            name: "ID",
            value: user.id,
            inline: true
          },
          {
            name: "Created",
            value: `<t:${Math.floor(
              user.createdTimestamp / 1000
            )}:R>`,
            inline: true
          }
        )
        .setColor("#5865F2");

    if (member) {
      embed.addFields({
        name: "Joined Server",
        value: `<t:${Math.floor(
          member.joinedTimestamp / 1000
        )}:R>`,
        inline: true
      });
    }

    return interaction.reply({
      embeds: [embed]
    });
  }

  if (sub === "serverinfo") {
    const guild = interaction.guild;

    const embed =
      new EmbedBuilder()
        .setTitle(`🏠 ${guild.name}`)
        .setThumbnail(
          guild.iconURL({
            extension: "png",
            size: 512
          })
        )
        .addFields(
          {
            name: "Owner",
            value: `<@${guild.ownerId}>`,
            inline: true
          },
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
            name: "Created",
            value: `<t:${Math.floor(
              guild.createdTimestamp / 1000
            )}:R>`,
            inline: true
          }
        )
        .setColor("#5865F2");

    return interaction.reply({
      embeds: [embed]
    });
  }

  if (sub === "avatar") {
    const user =
      interaction.options.getUser("user") ||
      interaction.user;

    const embed =
      new EmbedBuilder()
        .setTitle(`🖼️ ${user.username}'s Avatar`)
        .setImage(
          user.displayAvatarURL({
            extension: "png",
            size: 1024
          })
        )
        .setColor("#5865F2");

    return interaction.reply({
      embeds: [embed]
    });
  }

  if (sub === "roleinfo") {
    const role =
      interaction.options.getRole("role");

    const embed =
      new EmbedBuilder()
        .setTitle(`🎭 ${role.name}`)
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
        .setColor(role.color || "#5865F2");

    return interaction.reply({
      embeds: [embed]
    });
  }

  if (sub === "channelinfo") {
    const channel =
      interaction.options.getChannel("channel") ||
      interaction.channel;

    const embed =
      new EmbedBuilder()
        .setTitle(`📢 ${channel.name}`)
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
          },
          {
            name: "Created",
            value: `<t:${Math.floor(
              channel.createdTimestamp / 1000
            )}:R>`,
            inline: true
          }
        )
        .setColor("#5865F2");

    return interaction.reply({
      embeds: [embed]
    });
  }
}

// ============================================================
// FUN
// ============================================================

async function handleFun(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === "8ball") {
    const answers = [
      "Absolutely.",
      "Most likely.",
      "Yes.",
      "Definitely.",
      "Ask me again later.",
      "I'm not sure.",
      "Probably not.",
      "No.",
      "Absolutely not."
    ];

    const answer =
      answers[Math.floor(Math.random() * answers.length)];

    return replyEmbed(
      interaction,
      "🎱 Magic 8-Ball",
      `**Question:** ${interaction.options.getString("question")}\n\n**Answer:** ${answer}`,
      "#5865F2"
    );
  }

  if (sub === "coinflip") {
    const result =
      Math.random() < 0.5
        ? "🪙 Heads"
        : "🪙 Tails";

    return replyEmbed(
      interaction,
      "🪙 Coin Flip",
      `The coin landed on **${result}**.`,
      "#5865F2"
    );
  }

  if (sub === "dice") {
    const result =
      Math.floor(Math.random() * 6) + 1;

    return replyEmbed(
      interaction,
      "🎲 Dice",
      `You rolled **${result}**.`,
      "#5865F2"
    );
  }

  if (sub === "choose") {
    const choices =
      interaction.options
        .getString("options")
        .split(",")
        .map(x => x.trim())
        .filter(Boolean);

    if (!choices.length) {
      return replyEmbed(
        interaction,
        "❌ Error",
        "Give me at least one option.",
        "#ED4245"
      );
    }

    const choice =
      choices[Math.floor(Math.random() * choices.length)];

    return replyEmbed(
      interaction,
      "🤔 Choice",
      `I choose **${choice}**.`,
      "#5865F2"
    );
  }

  if (sub === "poll") {
    const question =
      interaction.options.getString("question");

    const embed =
      new EmbedBuilder()
        .setTitle("📊 Poll")
        .setDescription(question)
        .setColor("#5865F2")
        .setFooter({
          text: `Poll by ${interaction.user.username}`
        });

    const row =
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("jrc_poll_yes")
          .setLabel("Yes")
          .setEmoji("👍")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId("jrc_poll_no")
          .setLabel("No")
          .setEmoji("👎")
          .setStyle(ButtonStyle.Danger)
      );

    return interaction.reply({
      embeds: [embed],
      components: [row]
    });
  }
}

// ============================================================
// ANTINUKE
// ============================================================

async function handleAntiNuke(interaction) {
  const sub = interaction.options.getSubcommand();
  const g = guildConfig(interaction.guild.id);

  if (sub === "setup") {
    g.antinuke.enabled = true;
    saveConfig();

    return replyEmbed(
      interaction,
      "☢️ Anti-Nuke Setup",
      "Anti-nuke protection has been configured and enabled.",
      "#57F287"
    );
  }

  if (sub === "enable") {
    g.antinuke.enabled = true;
    saveConfig();

    return replyEmbed(
      interaction,
      "🟢 Anti-Nuke Enabled",
      "Destructive action monitoring is active.",
      "#57F287"
    );
  }

  if (sub === "disable") {
    g.antinuke.enabled = false;
    saveConfig();

    return replyEmbed(
      interaction,
      "🔴 Anti-Nuke Disabled",
      "Anti-nuke protection has been disabled.",
      "#ED4245"
    );
  }

  if (sub === "config") {
    g.antinuke.threshold = 3;
    g.antinuke.interval = 10000;

    saveConfig();

    return replyEmbed(
      interaction,
      "☢️ Anti-Nuke Configuration",
      `**Threshold:** ${g.antinuke.threshold} actions\n**Window:** ${g.antinuke.interval / 1000}s\n\nProtection is designed to react to repeated destructive audit-log activity.`,
      "#5865F2"
    );
  }

  if (sub === "status") {
    return replyEmbed(
      interaction,
      "☢️ Anti-Nuke Status",
      `**Status:** ${
        g.antinuke.enabled
          ? "🟢 Enabled"
          : "🔴 Disabled"
      }\n**Threshold:** ${g.antinuke.threshold}\n**Window:** ${g.antinuke.interval / 1000}s`,
      "#5865F2"
    );
  }
}

// ============================================================
// RAID
// ============================================================

async function handleRaid(interaction) {
  const sub = interaction.options.getSubcommand();
  const g = guildConfig(interaction.guild.id);

  if (sub === "setup") {
    g.raid.enabled = true;
    saveConfig();

    return replyEmbed(
      interaction,
      "🚨 Raid Protection Setup",
      "Raid protection has been configured and enabled.",
      "#57F287"
    );
  }

  if (sub === "enable") {
    g.raid.enabled = true;
    saveConfig();

    return replyEmbed(
      interaction,
      "🟢 Raid Protection Enabled",
      "JRC will monitor rapid member joins.",
      "#57F287"
    );
  }

  if (sub === "disable") {
    g.raid.enabled = false;
    g.raid.activeUntil = 0;

    saveConfig();

    return replyEmbed(
      interaction,
      "🔴 Raid Protection Disabled",
      "Raid protection has been disabled.",
      "#ED4245"
    );
  }

  if (sub === "config") {
    g.raid.threshold = 5;
    g.raid.interval = 10000;
    g.raid.action = "alert";

    saveConfig();

    return replyEmbed(
      interaction,
      "🚨 Raid Configuration",
      `**Join threshold:** ${g.raid.threshold}\n**Window:** ${g.raid.interval / 1000}s\n**Action:** ${g.raid.action}`,
      "#5865F2"
    );
  }

  if (sub === "status") {
    const active =
      g.raid.activeUntil > Date.now();

    return replyEmbed(
      interaction,
      "🚨 Raid Status",
      `**Protection:** ${
        g.raid.enabled
          ? "🟢 Enabled"
          : "🔴 Disabled"
      }\n**Raid mode:** ${
        active ? "🔴 ACTIVE" : "🟢 Normal"
      }\n**Threshold:** ${g.raid.threshold}\n**Window:** ${g.raid.interval / 1000}s`,
      "#5865F2"
    );
  }
}

// ============================================================
// INTERACTION HANDLER
// ============================================================

client.on("interactionCreate", async interaction => {
  try {

    // --------------------------------------------------------
    // SLASH COMMANDS
    // --------------------------------------------------------

    if (interaction.isChatInputCommand()) {
      const command = interaction.commandName;

      if (command === "jrc") {
        return handleJRC(interaction);
      }

      if (command === "welcome") {
        return handleGreetingCommand(
          interaction,
          "welcome"
        );
      }

      if (command === "goodbye") {
        return handleGreetingCommand(
          interaction,
          "goodbye"
        );
      }

      if (command === "mod") {
        return handleMod(interaction);
      }

      if (command === "automod") {
        return handleAutoMod(interaction);
      }

      if (command === "logs") {
        return handleLogs(interaction);
      }

      if (command === "reactionrole") {
        return handleReactionRole(interaction);
      }

      if (command === "utility") {
        return handleUtility(interaction);
      }

      if (command === "fun") {
        return handleFun(interaction);
      }

      if (command === "antinuke") {
        return handleAntiNuke(interaction);
      }

      if (command === "raid") {
        return handleRaid(interaction);
      }
    }

    // --------------------------------------------------------
    // BUTTONS
    // --------------------------------------------------------

    if (interaction.isButton()) {

      const id = interaction.customId;

      // ------------------------------------------------------
      // WELCOME / GOODBYE BUTTONS
      // ------------------------------------------------------

      if (
        id.startsWith("jrc_welcome_") ||
        id.startsWith("jrc_goodbye_")
      ) {
        const parts = id.split("_");
        const type = parts[1];
        const action = parts.slice(2).join("_");

        const g =
          guildConfig(interaction.guild.id);

        const settings = g[type];

        if (action === "configure") {
          const modal =
            new ModalBuilder()
              .setCustomId(`jrc_${type}_modal`)
              .setTitle(
                type === "welcome"
                  ? "Welcome Configuration"
                  : "Goodbye Configuration"
              );

          const titleInput =
            new TextInputBuilder()
              .setCustomId("title")
              .setLabel("Embed Title")
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setValue(settings.title || "")
              .setMaxLength(256);

          const descriptionInput =
            new TextInputBuilder()
              .setCustomId("description")
              .setLabel("Embed Description")
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
              .setValue(settings.description || "")
              .setMaxLength(4000);

          const messageInput =
            new TextInputBuilder()
              .setCustomId("message")
              .setLabel("Greeting Message")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setValue(settings.message || "")
              .setMaxLength(2000);

          const colorInput =
            new TextInputBuilder()
              .setCustomId("color")
              .setLabel("Embed Color (#5865F2)")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setValue(settings.color || "#5865F2")
              .setMaxLength(7);

          const imageInput =
            new TextInputBuilder()
              .setCustomId("image")
              .setLabel("Image / GIF URL")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setValue(
                settings.image ||
                settings.gif ||
                ""
              )
              .setMaxLength(1000);

          modal.addComponents(
            new ActionRowBuilder().addComponents(
              titleInput
            ),
            new ActionRowBuilder().addComponents(
              descriptionInput
            ),
            new ActionRowBuilder().addComponents(
              messageInput
            ),
            new ActionRowBuilder().addComponents(
              colorInput
            ),
            new ActionRowBuilder().addComponents(
              imageInput
            )
          );

          return interaction.showModal(modal);
        }

        if (action === "channel") {
          const menu =
            new ChannelSelectMenuBuilder()
              .setCustomId(
                `jrc_${type}_channel_select`
              )
              .setPlaceholder(
                `Select ${type} channel`
              )
              .addChannelTypes(
                ChannelType.GuildText,
                ChannelType.GuildAnnouncement
              );

          return interaction.reply({
            content: `📢 Select the ${type} channel:`,
            components: [
              new ActionRowBuilder().addComponents(menu)
            ],
            flags: MessageFlags.Ephemeral
          });
        }

        if (action === "preview") {
          const embed =
            buildGreetingEmbed(
              type,
              interaction.member,
              settings
            );

          return interaction.reply({
            content: replaceVariables(
              settings.message,
              interaction.member
            ),
            embeds: [embed],
            flags: MessageFlags.Ephemeral
          });
        }

        if (action === "enable") {
          settings.enabled = true;
          saveConfig();

          return interaction.update(
            greetingPanel(
              type,
              interaction.guild
            )
          );
        }

        if (action === "disable") {
          settings.enabled = false;
          saveConfig();

          return interaction.update(
            greetingPanel(
              type,
              interaction.guild
            )
          );
        }
      }

      // ------------------------------------------------------
      // REACTION ROLES
      // ------------------------------------------------------

      if (id.startsWith("jrc_rr_")) {
        const g =
          guildConfig(interaction.guild.id);

        const rr =
          g.reactionRoles.find(
            x => x.customId === id
          );

        if (!rr) {
          return replyEmbed(
            interaction,
            "❌ Reaction Role",
            "This reaction role no longer exists.",
            "#ED4245"
          );
        }

        const member =
          interaction.member;

        if (member.roles.cache.has(rr.role)) {
          await member.roles.remove(rr.role);

          return replyEmbed(
            interaction,
            "➖ Role Removed",
            `Removed <@&${rr.role}> from you.`,
            "#ED4245"
          );
        }

        await member.roles.add(rr.role);

        return replyEmbed(
          interaction,
          "➕ Role Added",
          `You now have <@&${rr.role}>.`,
          "#57F287"
        );
      }

      // ------------------------------------------------------
      // POLL
      // ------------------------------------------------------

      if (
        id === "jrc_poll_yes" ||
        id === "jrc_poll_no"
      ) {
        return interaction.reply({
          content:
            id === "jrc_poll_yes"
              ? "👍 Your vote: **Yes**"
              : "👎 Your vote: **No**",
          flags: MessageFlags.Ephemeral
        });
      }
    }

    // --------------------------------------------------------
    // CHANNEL SELECT
    // --------------------------------------------------------

    if (interaction.isChannelSelectMenu()) {
      const parts =
        interaction.customId.split("_");

      if (
        parts[0] === "jrc" &&
        (parts[1] === "welcome" ||
          parts[1] === "goodbye") &&
        parts[2] === "channel"
      ) {
        const type = parts[1];

        const channel =
          interaction.channels.first();

        const g =
          guildConfig(interaction.guild.id);

        g[type].channel = channel.id;

        saveConfig();

        return interaction.update({
          content: `✅ ${type} channel set to ${channel}.`,
          components: []
        });
      }
    }

    // --------------------------------------------------------
    // MODAL
    // --------------------------------------------------------

    if (interaction.isModalSubmit()) {
      const parts =
        interaction.customId.split("_");

      if (
        parts[0] === "jrc" &&
        (parts[1] === "welcome" ||
          parts[1] === "goodbye") &&
        parts[2] === "modal"
      ) {
        const type = parts[1];

        const g =
          guildConfig(interaction.guild.id);

        const settings = g[type];

        const title =
          interaction.fields.getTextInputValue("title");

        const description =
          interaction.fields.getTextInputValue(
            "description"
          );

        const message =
          interaction.fields.getTextInputValue("message");

        const color =
          interaction.fields.getTextInputValue("color");

        const image =
          interaction.fields.getTextInputValue("image");

        settings.title = title;
        settings.description = description;
        settings.message = message;

        if (validColor(color)) {
          settings.color = color;
        }

        if (image && validImage(image)) {
          settings.image = image;
          settings.gif = image;
        } else if (!image) {
          settings.image = null;
          settings.gif = null;
        }

        saveConfig();

        return interaction.reply({
          content: `✅ ${type} configuration saved.`,
          flags: MessageFlags.Ephemeral
        });
      }
    }

  } catch (error) {
    console.error("Interaction error:", error);

    await safeReply(interaction, {
      content:
        "❌ Something went wrong while processing that command.",
      flags: MessageFlags.Ephemeral
    });
  }
});

// ============================================================
// WELCOME
// ============================================================

client.on("guildMemberAdd", async member => {
  const g =
    guildConfig(member.guild.id);

  // ----------------------------------------------------------
  // WELCOME
  // ----------------------------------------------------------

  if (
    g.welcome.enabled &&
    g.welcome.channel
  ) {
    const channel =
      member.guild.channels.cache.get(
        g.welcome.channel
      );

    if (channel) {
      const embed =
        buildGreetingEmbed(
          "welcome",
          member,
          g.welcome
        );

      await channel.send({
        content: replaceVariables(
          g.welcome.message,
          member
        ),
        embeds: [embed]
      }).catch(() => {});
    }
  }

  // ----------------------------------------------------------
  // RAID DETECTION
  // ----------------------------------------------------------

  if (g.raid.enabled) {
    if (!joinTracker.has(member.guild.id)) {
      joinTracker.set(
        member.guild.id,
        []
      );
    }

    const joins =
      joinTracker.get(member.guild.id);

    const now = Date.now();

    joins.push(now);

    const filtered =
      joins.filter(
        t =>
          now - t <=
          g.raid.interval
      );

    joinTracker.set(
      member.guild.id,
      filtered
    );

    if (
      filtered.length >=
      g.raid.threshold
    ) {
      g.raid.activeUntil =
        Date.now() + 60000;

      saveConfig();

      await sendLog(
        member.guild,
        "🚨 Possible Raid Detected",
        `**${filtered.length}** members joined within **${g.raid.interval / 1000}s**.`,
        "#ED4245"
      );

      if (g.raid.action === "kick") {
        await member.kick(
          "Raid protection"
        ).catch(() => {});
      }
    }
  }
});

// ============================================================
// GOODBYE
// ============================================================

client.on("guildMemberRemove", async member => {
  const g =
    guildConfig(member.guild.id);

  if (
    !g.goodbye.enabled ||
    !g.goodbye.channel
  ) {
    return;
  }

  const channel =
    member.guild.channels.cache.get(
      g.goodbye.channel
    );

  if (!channel) return;

  const embed =
    buildGreetingEmbed(
      "goodbye",
      member,
      g.goodbye
    );

  await channel.send({
    content: replaceVariables(
      g.goodbye.message,
      member
    ),
    embeds: [embed]
  }).catch(() => {});
});

// ============================================================
// AUTOMOD TRACKING
// ============================================================

const spamTracker = new Map();
const joinTracker = new Map();

// ============================================================
// MESSAGE AUTOMOD
// ============================================================

client.on("messageCreate", async message => {
  if (!message.guild) return;
  if (message.author.bot) return;

  const g =
    guildConfig(message.guild.id);

  if (!g.automod.enabled) return;

  // ----------------------------------------------------------
  // BLOCKED WORDS
  // ----------------------------------------------------------

  const content =
    message.content.toLowerCase();

  if (
    g.automod.words.some(
      word =>
        word &&
        content.includes(word)
    )
  ) {
    await message.delete().catch(() => {});

    await message.channel.send({
      content:
        `⚠️ ${message.author}, that message contained a blocked word.`
    }).then(m =>
      setTimeout(
        () => m.delete().catch(() => {}),
        4000
      )
    ).catch(() => {});

    await sendLog(
      message.guild,
      "🚫 AutoMod • Blocked Word",
      `${message.author} sent a message containing a blocked word in ${message.channel}.`,
      "#ED4245"
    );

    return;
  }

  // ----------------------------------------------------------
  // LINKS
  // ----------------------------------------------------------

  if (
    g.automod.links &&
    /(https?:\/\/|www\.)/i.test(
      message.content
    )
  ) {
    await message.delete().catch(() => {});

    await message.channel.send({
      content:
        `🔗 ${message.author}, links are not allowed here.`
    }).then(m =>
      setTimeout(
        () => m.delete().catch(() => {}),
        4000
      )
    ).catch(() => {});

    await sendLog(
      message.guild,
      "🔗 AutoMod • Link Removed",
      `${message.author} posted a link in ${message.channel}.`,
      "#ED4245"
    );

    return;
  }

  // ----------------------------------------------------------
  // SPAM
  // ----------------------------------------------------------

  if (g.automod.spam.enabled) {
    const key =
      `${message.guild.id}:${message.author.id}`;

    const now = Date.now();

    const previous =
      spamTracker.get(key) || [];

    const recent =
      previous.filter(
        timestamp =>
          now - timestamp <
          g.automod.spam.interval
      );

    recent.push(now);

    spamTracker.set(
      key,
      recent
    );

    if (
      recent.length >=
      g.automod.spam.limit
    ) {
      await message.delete().catch(() => {});

      await sendLog(
        message.guild,
        "💬 AutoMod • Spam Detected",
        `${message.author} triggered the spam filter in ${message.channel}.`,
        "#ED4245"
      );

      spamTracker.set(
        key,
        []
      );
    }
  }
});

// ============================================================
// BASIC ANTINUKE TRACKER
// ============================================================

const antiNukeTracker = new Map();

client.on(
  "guildAuditLogEntryCreate",
  async (entry, guild) => {
    try {
      const g =
        guildConfig(guild.id);

      if (!g.antinuke.enabled) return;

      if (!entry.executorId) return;

      if (
        entry.executorId ===
        client.user.id
      ) return;

      if (
        entry.executorId ===
        guild.ownerId
      ) return;

      const dangerousActions = [
        AuditLogEvent.ChannelDelete,
        AuditLogEvent.RoleDelete,
        AuditLogEvent.MemberBanAdd,
        AuditLogEvent.MemberKick,
        AuditLogEvent.GuildUpdate
      ];

      if (
        !dangerousActions.includes(
          entry.action
        )
      ) {
        return;
      }

      const key =
        `${guild.id}:${entry.executorId}`;

      const now = Date.now();

      const previous =
        antiNukeTracker.get(key) || [];

      const recent =
        previous.filter(
          timestamp =>
            now - timestamp <
            g.antinuke.interval
        );

      recent.push(now);

      antiNukeTracker.set(
        key,
        recent
      );

      if (
        recent.length >=
        g.antinuke.threshold
      ) {
        const member =
          await guild.members
            .fetch(entry.executorId)
            .catch(() => null);

        if (member) {
          await member.timeout(
            60 * 60 * 1000,
            "JRC Anti-Nuke protection"
          ).catch(() => {});
        }

        await sendLog(
          guild,
          "☢️ Anti-Nuke Triggered",
          `${member || entry.executorId} triggered anti-nuke protection after repeated destructive actions.`,
          "#ED4245"
        );

        antiNukeTracker.set(
          key,
          []
        );
      }
    } catch (error) {
      console.error(
        "Anti-nuke error:",
        error
      );
    }
  }
);

// ============================================================
// ERROR HANDLING
// ============================================================

client.on("error", error => {
  console.error(
    "Discord client error:",
    error
  );
});

process.on(
  "unhandledRejection",
  error => {
    console.error(
      "Unhandled rejection:",
      error
    );
});

// ============================================================
// LOGIN
// ============================================================

if (!process.env.DISCORD_TOKEN) {
  console.error(
    "❌ DISCORD_TOKEN is not configured."
  );
  process.exit(1);
}

client.login(
  process.env.DISCORD_TOKEN
);
