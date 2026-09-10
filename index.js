require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  SlashCommandBuilder,
} = require("discord.js");

const fs = require("fs");
const path = require("path");

/* =========================================================
   JRC BOT
   Premium Discord utility / moderation / configuration bot
   ========================================================= */

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error("❌ Missing TOKEN, CLIENT_ID, or GUILD_ID in .env");
  process.exit(1);
}

const DATA_FILE = path.join(__dirname, "jrc-data.json");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
});

/* =========================================================
   DATA
   ========================================================= */

function defaultConfig() {
  return {
    welcome: {
      enabled: false,
      channel: null,
      message:
        "Welcome {user} to **{server}**! 🎉\nYou are member **#{membercount}**.",
      image: null,
      embed: true,
      color: "#5865F2",
    },

    goodbye: {
      enabled: false,
      channel: null,
      message:
        "{username} has left **{server}**. 👋\nWe now have **{membercount}** members.",
      image: null,
      embed: true,
      color: "#5865F2",
    },

    logs: {
      enabled: false,
      channel: null,
      messageDelete: true,
      messageEdit: true,
      memberJoin: true,
      memberLeave: true,
      moderation: true,
    },

    security: {
      lockdown: false,
      slowmode: 0,
    },

    warnings: {},
  };
}

let db = {};

function loadDB() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2));
    }

    db = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (err) {
    console.error("Database load error:", err);
    db = {};
  }
}

function saveDB() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error("Database save error:", err);
  }
}

function getConfig(guildId) {
  if (!db[guildId]) {
    db[guildId] = defaultConfig();
    saveDB();
  }

  return db[guildId];
}

/* =========================================================
   EMBEDS
   ========================================================= */

function jrcEmbed(title, description, color = "#5865F2") {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`✦ ${title}`)
    .setDescription(description || null)
    .setFooter({
      text: "JRC Bot • Premium Configuration",
    })
    .setTimestamp();
}

function errorEmbed(message) {
  return jrcEmbed("Something went wrong", `> ${message}`, "#ED4245");
}

function successEmbed(message) {
  return jrcEmbed("Done", `> ${message}`, "#57F287");
}

/* =========================================================
   PERMISSIONS
   ========================================================= */

function hasPermission(interaction, permission) {
  return interaction.memberPermissions?.has(permission);
}

function requirePermission(interaction, permission) {
  if (!hasPermission(interaction, permission)) {
    return interaction.reply({
      embeds: [
        errorEmbed(
          `You need **${permissionName(permission)}** permission to use this.`
        ),
      ],
      ephemeral: true,
    });
  }

  return true;
}

function permissionName(permission) {
  const names = {
    [PermissionsBitField.Flags.Administrator]: "Administrator",
    [PermissionsBitField.Flags.ManageGuild]: "Manage Server",
    [PermissionsBitField.Flags.ManageMessages]: "Manage Messages",
    [PermissionsBitField.Flags.ModerateMembers]: "Moderate Members",
    [PermissionsBitField.Flags.KickMembers]: "Kick Members",
    [PermissionsBitField.Flags.BanMembers]: "Ban Members",
    [PermissionsBitField.Flags.ManageRoles]: "Manage Roles",
    [PermissionsBitField.Flags.ManageChannels]: "Manage Channels",
  };

  return names[permission] || "the required";
}

/* =========================================================
   VARIABLES
   ========================================================= */

function replaceVariables(text, member) {
  if (!member || !member.guild) return text;

  return text
    .replaceAll("{user}", `<@${member.id}>`)
    .replaceAll("{username}", member.user.username)
    .replaceAll("{server}", member.guild.name)
    .replaceAll("{membercount}", String(member.guild.memberCount))
    .replaceAll("{id}", member.id);
}

function validUrl(value) {
  if (!value) return true;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/* =========================================================
   WELCOME / GOODBYE PANELS
   ========================================================= */

function welcomePanel(guild) {
  const cfg = getConfig(guild.id).welcome;

  const status = cfg.enabled ? "🟢 Enabled" : "🔴 Disabled";
  const channel = cfg.channel ? `<#${cfg.channel}>` : "Not configured";
  const image = cfg.image ? "Configured" : "None";
  const embed = cfg.embed ? "Enabled" : "Disabled";

  const e = jrcEmbed(
    "Welcome System",
    [
      `**Status:** ${status}`,
      `**Channel:** ${channel}`,
      `**Embed:** ${embed}`,
      `**Image / GIF:** ${image}`,
      "",
      "**Message preview:**",
      `> ${cfg.message.slice(0, 400)}`,
      "",
      "`{user}` • `{username}` • `{server}` • `{membercount}`",
    ].join("\n"),
    cfg.color
  );

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("welcome_toggle")
      .setLabel(cfg.enabled ? "Disable" : "Enable")
      .setEmoji(cfg.enabled ? "🔴" : "🟢")
      .setStyle(cfg.enabled ? ButtonStyle.Danger : ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("welcome_channel")
      .setLabel("Channel")
      .setEmoji("📢")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("welcome_message")
      .setLabel("Message")
      .setEmoji("💬")
      .setStyle(ButtonStyle.Primary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("welcome_image")
      .setLabel("Image / GIF")
      .setEmoji("🖼️")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("welcome_embed")
      .setLabel("Embed")
      .setEmoji("🎨")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("welcome_test")
      .setLabel("Test")
      .setEmoji("🧪")
      .setStyle(ButtonStyle.Success)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("welcome_reset")
      .setLabel("Reset")
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("config_back")
      .setLabel("Back")
      .setEmoji("↩️")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("config_close")
      .setLabel("Close")
      .setEmoji("✕")
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    embeds: [e],
    components: [row1, row2, row3],
  };
}

function goodbyePanel(guild) {
  const cfg = getConfig(guild.id).goodbye;

  const status = cfg.enabled ? "🟢 Enabled" : "🔴 Disabled";
  const channel = cfg.channel ? `<#${cfg.channel}>` : "Not configured";
  const image = cfg.image ? "Configured" : "None";
  const embed = cfg.embed ? "Enabled" : "Disabled";

  const e = jrcEmbed(
    "Goodbye System",
    [
      `**Status:** ${status}`,
      `**Channel:** ${channel}`,
      `**Embed:** ${embed}`,
      `**Image / GIF:** ${image}`,
      "",
      "**Message preview:**",
      `> ${cfg.message.slice(0, 400)}`,
      "",
      "`{user}` • `{username}` • `{server}` • `{membercount}`",
    ].join("\n"),
    cfg.color
  );

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("goodbye_toggle")
      .setLabel(cfg.enabled ? "Disable" : "Enable")
      .setEmoji(cfg.enabled ? "🔴" : "🟢")
      .setStyle(cfg.enabled ? ButtonStyle.Danger : ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("goodbye_channel")
      .setLabel("Channel")
      .setEmoji("📢")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("goodbye_message")
      .setLabel("Message")
      .setEmoji("💬")
      .setStyle(ButtonStyle.Primary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("goodbye_image")
      .setLabel("Image / GIF")
      .setEmoji("🖼️")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("goodbye_embed")
      .setLabel("Embed")
      .setEmoji("🎨")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("goodbye_test")
      .setLabel("Test")
      .setEmoji("🧪")
      .setStyle(ButtonStyle.Success)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("goodbye_reset")
      .setLabel("Reset")
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("config_back")
      .setLabel("Back")
      .setEmoji("↩️")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("config_close")
      .setLabel("Close")
      .setEmoji("✕")
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    embeds: [e],
    components: [row1, row2, row3],
  };
}

/* =========================================================
   MAIN CONFIG PANEL
   ========================================================= */

function configPanel(guild) {
  const cfg = getConfig(guild.id);

  const e = jrcEmbed(
    "JRC Configuration",
    [
      "Welcome to the **JRC control center**.",
      "",
      `👋 **Welcome:** ${
        cfg.welcome.enabled ? "🟢 Enabled" : "🔴 Disabled"
      }`,
      `🚪 **Goodbye:** ${
        cfg.goodbye.enabled ? "🟢 Enabled" : "🔴 Disabled"
      }`,
      `📋 **Logs:** ${cfg.logs.enabled ? "🟢 Enabled" : "🔴 Disabled"}`,
      `🔒 **Lockdown:** ${cfg.security.lockdown ? "🔴 Active" : "🟢 Off"}`,
      "",
      "Select a system below to configure it.",
    ].join("\n")
  );

  const select = new StringSelectMenuBuilder()
    .setCustomId("config_select")
    .setPlaceholder("Choose a configuration...")
    .addOptions(
      {
        label: "Welcome System",
        description: "Configure member welcomes",
        value: "welcome",
        emoji: "👋",
      },
      {
        label: "Goodbye System",
        description: "Configure member departures",
        value: "goodbye",
        emoji: "🚪",
      },
      {
        label: "Logging System",
        description: "Configure moderation and event logs",
        value: "logs",
        emoji: "📋",
      },
      {
        label: "Security",
        description: "Configure lockdown and slowmode",
        value: "security",
        emoji: "🔒",
      }
    );

  const row = new ActionRowBuilder().addComponents(select);

  const close = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("config_close")
      .setLabel("Close")
      .setEmoji("✕")
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    embeds: [e],
    components: [row, close],
  };
}

/* =========================================================
   LOG PANEL
   ========================================================= */

function logsPanel(guild) {
  const cfg = getConfig(guild.id).logs;

  const e = jrcEmbed(
    "Logging System",
    [
      `**Status:** ${cfg.enabled ? "🟢 Enabled" : "🔴 Disabled"}`,
      `**Channel:** ${cfg.channel ? `<#${cfg.channel}>` : "Not configured"}`,
      "",
      `🗑️ Message Delete: ${cfg.messageDelete ? "ON" : "OFF"}`,
      `✏️ Message Edit: ${cfg.messageEdit ? "ON" : "OFF"}`,
      `📥 Member Join: ${cfg.memberJoin ? "ON" : "OFF"}`,
      `📤 Member Leave: ${cfg.memberLeave ? "ON" : "OFF"}`,
      `🛡️ Moderation: ${cfg.moderation ? "ON" : "OFF"}`,
    ].join("\n")
  );

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("logs_toggle")
      .setLabel(cfg.enabled ? "Disable" : "Enable")
      .setEmoji(cfg.enabled ? "🔴" : "🟢")
      .setStyle(cfg.enabled ? ButtonStyle.Danger : ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("logs_channel")
      .setLabel("Channel")
      .setEmoji("📢")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("logs_events")
      .setLabel("Events")
      .setEmoji("⚙️")
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("config_back")
      .setLabel("Back")
      .setEmoji("↩️")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("config_close")
      .setLabel("Close")
      .setEmoji("✕")
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    embeds: [e],
    components: [row1, row2],
  };
}

/* =========================================================
   SECURITY PANEL
   ========================================================= */

function securityPanel(guild) {
  const cfg = getConfig(guild.id).security;

  const e = jrcEmbed(
    "Security",
    [
      `**Lockdown:** ${cfg.lockdown ? "🔴 Active" : "🟢 Off"}`,
      `**Slowmode:** ${cfg.slowmode}s`,
      "",
      "Use the controls below to quickly manage server security.",
    ].join("\n"),
    cfg.lockdown ? "#ED4245" : "#5865F2"
  );

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("security_lockdown")
      .setLabel(cfg.lockdown ? "Unlock" : "Lockdown")
      .setEmoji(cfg.lockdown ? "🔓" : "🔒")
      .setStyle(cfg.lockdown ? ButtonStyle.Success : ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("security_slowmode")
      .setLabel("Slowmode")
      .setEmoji("🐌")
      .setStyle(ButtonStyle.Primary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("config_back")
      .setLabel("Back")
      .setEmoji("↩️")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("config_close")
      .setLabel("Close")
      .setEmoji("✕")
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    embeds: [e],
    components: [row1, row2],
  };
}

/* =========================================================
   LOGGING
   ========================================================= */

async function sendLog(guild, embed) {
  try {
    const cfg = getConfig(guild.id).logs;

    if (!cfg.enabled || !cfg.channel) return;

    const channel = guild.channels.cache.get(cfg.channel);

    if (!channel || !channel.isTextBased()) return;

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("Log error:", err);
  }
}

/* =========================================================
   MEMBER EVENTS
   ========================================================= */

client.on("guildMemberAdd", async (member) => {
  try {
    const cfg = getConfig(member.guild.id);

    if (cfg.welcome.enabled && cfg.welcome.channel) {
      const channel = member.guild.channels.cache.get(cfg.welcome.channel);

      if (channel?.isTextBased()) {
        const message = replaceVariables(cfg.welcome.message, member);

        if (cfg.welcome.embed) {
          const embed = jrcEmbed(
            "Welcome!",
            message,
            cfg.welcome.color
          ).setThumbnail(member.user.displayAvatarURL());

          if (cfg.welcome.image && validUrl(cfg.welcome.image)) {
            embed.setImage(cfg.welcome.image);
          }

          await channel.send({ embeds: [embed] });
        } else {
          await channel.send({
            content: message,
            ...(cfg.welcome.image
              ? { files: [cfg.welcome.image] }
              : {}),
          });
        }
      }
    }

    if (cfg.logs.enabled && cfg.logs.memberJoin) {
      await sendLog(
        member.guild,
        jrcEmbed(
          "Member Joined",
          `${member} **${member.user.tag}** joined the server.\n**ID:** \`${member.id}\``,
          "#57F287"
        ).setThumbnail(member.user.displayAvatarURL())
      );
    }
  } catch (err) {
    console.error("guildMemberAdd:", err);
  }
});

client.on("guildMemberRemove", async (member) => {
  try {
    const cfg = getConfig(member.guild.id);

    if (cfg.goodbye.enabled && cfg.goodbye.channel) {
      const channel = member.guild.channels.cache.get(cfg.goodbye.channel);

      if (channel?.isTextBased()) {
        const message = replaceVariables(cfg.goodbye.message, member);

        if (cfg.goodbye.embed) {
          const embed = jrcEmbed(
            "Goodbye",
            message,
            cfg.goodbye.color
          );

          if (cfg.goodbye.image && validUrl(cfg.goodbye.image)) {
            embed.setImage(cfg.goodbye.image);
          }

          await channel.send({ embeds: [embed] });
        } else {
          await channel.send({ content: message });
        }
      }
    }

    if (cfg.logs.enabled && cfg.logs.memberLeave) {
      await sendLog(
        member.guild,
        jrcEmbed(
          "Member Left",
          `**${member.user?.tag || "Unknown User"}** left the server.\n**ID:** \`${member.id}\``,
          "#ED4245"
        )
      );
    }
  } catch (err) {
    console.error("guildMemberRemove:", err);
  }
});

/* =========================================================
   MESSAGE LOGS
   ========================================================= */

client.on("messageDelete", async (message) => {
  if (!message.guild) return;

  const cfg = getConfig(message.guild.id);

  if (!cfg.logs.enabled || !cfg.logs.messageDelete) return;

  await sendLog(
    message.guild,
    jrcEmbed(
      "Message Deleted",
      [
        `**Channel:** ${message.channel}`,
        `**Author:** ${message.author || "Unknown"}`,
        `**Message ID:** \`${message.id}\``,
      ].join("\n"),
      "#ED4245"
    )
  );
});

client.on("messageUpdate", async (oldMessage, newMessage) => {
  if (!newMessage.guild) return;
  if (oldMessage.content === newMessage.content) return;

  const cfg = getConfig(newMessage.guild.id);

  if (!cfg.logs.enabled || !cfg.logs.messageEdit) return;

  await sendLog(
    newMessage.guild,
    jrcEmbed(
      "Message Edited",
      [
        `**Channel:** ${newMessage.channel}`,
        `**Author:** ${newMessage.author || "Unknown"}`,
        `**Message ID:** \`${newMessage.id}\``,
      ].join("\n"),
      "#FEE75C"
    )
  );
});

/* =========================================================
   COMMANDS
   ========================================================= */

const commands = [
  new SlashCommandBuilder()
    .setName("config")
    .setDescription("Open the JRC configuration dashboard")
    .setDefaultMemberPermissions(
      PermissionsBitField.Flags.ManageGuild.toString()
    ),

  new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("Open the interactive welcome configuration")
    .setDefaultMemberPermissions(
      PermissionsBitField.Flags.ManageGuild.toString()
    ),

  new SlashCommandBuilder()
    .setName("goodbye")
    .setDescription("Open the interactive goodbye configuration")
    .setDefaultMemberPermissions(
      PermissionsBitField.Flags.ManageGuild.toString()
    ),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member")
    .addUserOption((o) =>
      o.setName("user").setDescription("Member to warn").setRequired(true)
    )
    .addStringOption((o) =>
      o.setName("reason").setDescription("Reason").setRequired(false)
    )
    .setDefaultMemberPermissions(
      PermissionsBitField.Flags.ModerateMembers.toString()
    ),

  new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("View a member's warnings")
    .addUserOption((o) =>
      o.setName("user").setDescription("Member").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("clearwarnings")
    .setDescription("Clear a member's warnings")
    .addUserOption((o) =>
      o.setName("user").setDescription("Member").setRequired(true)
    )
    .setDefaultMemberPermissions(
      PermissionsBitField.Flags.ModerateMembers.toString()
    ),

  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout a member")
    .addUserOption((o) =>
      o.setName("user").setDescription("Member").setRequired(true)
    )
    .addIntegerOption((o) =>
      o
        .setName("minutes")
        .setDescription("Timeout duration")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(40320)
    )
    .addStringOption((o) =>
      o.setName("reason").setDescription("Reason").setRequired(false)
    )
    .setDefaultMemberPermissions(
      PermissionsBitField.Flags.ModerateMembers.toString()
    ),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member")
    .addUserOption((o) =>
      o.setName("user").setDescription("Member").setRequired(true)
    )
    .addStringOption((o) =>
      o.setName("reason").setDescription("Reason").setRequired(false)
    )
    .setDefaultMemberPermissions(
      PermissionsBitField.Flags.KickMembers.toString()
    ),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member")
    .addUserOption((o) =>
      o.setName("user").setDescription("Member").setRequired(true)
    )
    .addStringOption((o) =>
      o.setName("reason").setDescription("Reason").setRequired(false)
    )
    .setDefaultMemberPermissions(
      PermissionsBitField.Flags.BanMembers.toString()
    ),

  new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban a user")
    .addStringOption((o) =>
      o.setName("user_id").setDescription("User ID").setRequired(true)
    )
    .setDefaultMemberPermissions(
      PermissionsBitField.Flags.BanMembers.toString()
    ),

  new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Delete messages")
    .addIntegerOption((o) =>
      o
        .setName("amount")
        .setDescription("Number of messages")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .setDefaultMemberPermissions(
      PermissionsBitField.Flags.ManageMessages.toString()
    ),

  new SlashCommandBuilder()
    .setName("slowmode")
    .setDescription("Set channel slowmode")
    .addIntegerOption((o) =>
      o
        .setName("seconds")
        .setDescription("Slowmode seconds")
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(21600)
    )
    .setDefaultMemberPermissions(
      PermissionsBitField.Flags.ManageChannels.toString()
    ),

  new SlashCommandBuilder()
    .setName("lock")
    .setDescription("Lock the current channel")
    .setDefaultMemberPermissions(
      PermissionsBitField.Flags.ManageChannels.toString()
    ),

  new SlashCommandBuilder()
    .setName("unlock")
    .setDescription("Unlock the current channel")
    .setDefaultMemberPermissions(
      PermissionsBitField.Flags.ManageChannels.toString()
    ),

  new SlashCommandBuilder()
    .setName("role")
    .setDescription("Manage roles")
    .addSubcommand((s) =>
      s
        .setName("add")
        .setDescription("Add a role")
        .addUserOption((o) =>
          o.setName("user").setDescription("Member").setRequired(true)
        )
        .addRoleOption((o) =>
          o.setName("role").setDescription("Role").setRequired(true)
        )
    )
    .addSubcommand((s) =>
      s
        .setName("remove")
        .setDescription("Remove a role")
        .addUserOption((o) =>
          o.setName("user").setDescription("Member").setRequired(true)
        )
        .addRoleOption((o) =>
          o.setName("role").setDescription("Role").setRequired(true)
        )
    )
    .addSubcommand((s) =>
      s
        .setName("create")
        .setDescription("Create a role")
        .addStringOption((o) =>
          o.setName("name").setDescription("Role name").setRequired(true)
        )
    )
    .setDefaultMemberPermissions(
      PermissionsBitField.Flags.ManageRoles.toString()
    ),

  new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("View server information"),

  new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("View user information")
    .addUserOption((o) =>
      o.setName("user").setDescription("User").setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("View a user's avatar")
    .addUserOption((o) =>
      o.setName("user").setDescription("User").setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check JRC latency"),

  new SlashCommandBuilder()
    .setName("say")
    .setDescription("Send a message as JRC")
    .addStringOption((o) =>
      o.setName("message").setDescription("Message").setRequired(true)
    )
    .setDefaultMemberPermissions(
      PermissionsBitField.Flags.ManageMessages.toString()
    ),
].map((c) => c.toJSON());

/* =========================================================
   INTERACTION HANDLER
   ========================================================= */

client.on("interactionCreate", async (interaction) => {
  try {
    /* ================= SLASH COMMANDS ================= */

    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;

      if (commandName === "config") {
        if (
          !requirePermission(
            interaction,
            PermissionsBitField.Flags.ManageGuild
          )
        )
          return;

        return interaction.reply({
          ...configPanel(interaction.guild),
          ephemeral: true,
        });
      }

      if (commandName === "welcome") {
        if (
          !requirePermission(
            interaction,
            PermissionsBitField.Flags.ManageGuild
          )
        )
          return;

        return interaction.reply({
          ...welcomePanel(interaction.guild),
          ephemeral: true,
        });
      }

      if (commandName === "goodbye") {
        if (
          !requirePermission(
            interaction,
            PermissionsBitField.Flags.ManageGuild
          )
        )
          return;

        return interaction.reply({
          ...goodbyePanel(interaction.guild),
          ephemeral: true,
        });
      }

      /* ================= WARN ================= */

      if (commandName === "warn") {
        const user = interaction.options.getUser("user");
        const reason =
          interaction.options.getString("reason") || "No reason provided.";

        const cfg = getConfig(interaction.guild.id);

        if (!cfg.warnings[user.id]) cfg.warnings[user.id] = [];

        cfg.warnings[user.id].push({
          reason,
          moderator: interaction.user.id,
          timestamp: Date.now(),
        });

        saveDB();

        await interaction.reply({
          embeds: [
            successEmbed(
              `${user} has been warned.\n**Reason:** ${reason}`
            ),
          ],
        });

        await sendLog(
          interaction.guild,
          jrcEmbed(
            "Member Warned",
            `${user} was warned by ${interaction.user}.\n**Reason:** ${reason}`,
            "#FEE75C"
          )
        );

        return;
      }

      /* ================= WARNINGS ================= */

      if (commandName === "warnings") {
        const user = interaction.options.getUser("user");
        const cfg = getConfig(interaction.guild.id);
        const warnings = cfg.warnings[user.id] || [];

        if (!warnings.length) {
          return interaction.reply({
            embeds: [
              jrcEmbed(
                "Warnings",
                `${user} has **no warnings**.`,
                "#57F287"
              ),
            ],
          });
        }

        const lines = warnings
          .slice(-10)
          .map(
            (w, i) =>
              `**${i + 1}.** ${w.reason}\n└ Moderator: <@${w.moderator}>`
          );

        return interaction.reply({
          embeds: [
            jrcEmbed(
              `Warnings • ${user.username}`,
              lines.join("\n\n"),
              "#FEE75C"
            ),
          ],
        });
      }

      /* ================= CLEAR WARNINGS ================= */

      if (commandName === "clearwarnings") {
        if (
          !requirePermission(
            interaction,
            PermissionsBitField.Flags.ModerateMembers
          )
        )
          return;

        const user = interaction.options.getUser("user");
        const cfg = getConfig(interaction.guild.id);

        delete cfg.warnings[user.id];
        saveDB();

        return interaction.reply({
          embeds: [
            successEmbed(`Cleared all warnings for ${user}.`),
          ],
        });
      }

      /* ================= TIMEOUT ================= */

      if (commandName === "timeout") {
        if (
          !requirePermission(
            interaction,
            PermissionsBitField.Flags.ModerateMembers
          )
        )
          return;

        const user = interaction.options.getUser("user");
        const minutes = interaction.options.getInteger("minutes");
        const reason =
          interaction.options.getString("reason") || "No reason provided.";

        const member = await interaction.guild.members
          .fetch(user.id)
          .catch(() => null);

        if (!member) {
          return interaction.reply({
            embeds: [errorEmbed("That user is not in this server.")],
            ephemeral: true,
          });
        }

        if (!member.moderatable) {
          return interaction.reply({
            embeds: [
              errorEmbed(
                "I cannot timeout that member. Check my role position and permissions."
              ),
            ],
            ephemeral: true,
          });
        }

        await member.timeout(minutes * 60 * 1000, reason);

        await interaction.reply({
          embeds: [
            successEmbed(
              `${user} has been timed out for **${minutes} minute(s)**.\n**Reason:** ${reason}`
            ),
          ],
        });

        await sendLog(
          interaction.guild,
          jrcEmbed(
            "Member Timed Out",
            `${user} was timed out by ${interaction.user}.\n**Duration:** ${minutes} minute(s)\n**Reason:** ${reason}`,
            "#FEE75C"
          )
        );

        return;
      }

      /* ================= KICK ================= */

      if (commandName === "kick") {
        if (
          !requirePermission(
            interaction,
            PermissionsBitField.Flags.KickMembers
          )
        )
          return;

        const user = interaction.options.getUser("user");
        const reason =
          interaction.options.getString("reason") || "No reason provided.";

        const member = await interaction.guild.members
          .fetch(user.id)
          .catch(() => null);

        if (!member || !member.kickable) {
          return interaction.reply({
            embeds: [errorEmbed("I cannot kick that member.")],
            ephemeral: true,
          });
        }

        await member.kick(reason);

        await interaction.reply({
          embeds: [
            successEmbed(
              `${user.tag} was kicked.\n**Reason:** ${reason}`
            ),
          ],
        });

        await sendLog(
          interaction.guild,
          jrcEmbed(
            "Member Kicked",
            `${user.tag} was kicked by ${interaction.user}.\n**Reason:** ${reason}`,
            "#ED4245"
          )
        );

        return;
      }

      /* ================= BAN ================= */

      if (commandName === "ban") {
        if (
          !requirePermission(
            interaction,
            PermissionsBitField.Flags.BanMembers
          )
        )
          return;

        const user = interaction.options.getUser("user");
        const reason =
          interaction.options.getString("reason") || "No reason provided.";

        const member = await interaction.guild.members
          .fetch(user.id)
          .catch(() => null);

        if (member && !member.bannable) {
          return interaction.reply({
            embeds: [errorEmbed("I cannot ban that member.")],
            ephemeral: true,
          });
        }

        await interaction.guild.members.ban(user.id, { reason });

        await interaction.reply({
          embeds: [
            successEmbed(
              `${user.tag} was banned.\n**Reason:** ${reason}`
            ),
          ],
        });

        await sendLog(
          interaction.guild,
          jrcEmbed(
            "Member Banned",
            `${user.tag} was banned by ${interaction.user}.\n**Reason:** ${reason}`,
            "#ED4245"
          )
        );

        return;
      }

      /* ================= UNBAN ================= */

      if (commandName === "unban") {
        if (
          !requirePermission(
            interaction,
            PermissionsBitField.Flags.BanMembers
          )
        )
          return;

        const id = interaction.options.getString("user_id");

        try {
          await interaction.guild.members.unban(id);

          return interaction.reply({
            embeds: [successEmbed(`Unbanned user \`${id}\`.`)],
          });
        } catch {
          return interaction.reply({
            embeds: [
              errorEmbed(
                "That user may not be banned, or the ID is invalid."
              ),
            ],
            ephemeral: true,
          });
        }
      }

      /* ================= PURGE ================= */

      if (commandName === "purge") {
        if (
          !requirePermission(
            interaction,
            PermissionsBitField.Flags.ManageMessages
          )
        )
          return;

        const amount = interaction.options.getInteger("amount");

        await interaction.deferReply({ ephemeral: true });

        const deleted = await interaction.channel.bulkDelete(amount, true);

        return interaction.editReply({
          embeds: [
            successEmbed(
              `Deleted **${deleted.size}** message(s).`
            ),
          ],
        });
      }

      /* ================= SLOWMODE ================= */

      if (commandName === "slowmode") {
        if (
          !requirePermission(
            interaction,
            PermissionsBitField.Flags.ManageChannels
          )
        )
          return;

        const seconds = interaction.options.getInteger("seconds");

        await interaction.channel.setRateLimitPerUser(seconds);

        const cfg = getConfig(interaction.guild.id);
        cfg.security.slowmode = seconds;
        saveDB();

        return interaction.reply({
          embeds: [
            successEmbed(
              `Slowmode set to **${seconds} second(s)**.`
            ),
          ],
        });
      }

      /* ================= LOCK ================= */

      if (commandName === "lock") {
        if (
          !requirePermission(
            interaction,
            PermissionsBitField.Flags.ManageChannels
          )
        )
          return;

        await interaction.channel.permissionOverwrites.edit(
          interaction.guild.roles.everyone,
          {
            SendMessages: false,
          }
        );

        return interaction.reply({
          embeds: [successEmbed("This channel has been locked. 🔒")],
        });
      }

      /* ================= UNLOCK ================= */

      if (commandName === "unlock") {
        if (
          !requirePermission(
            interaction,
            PermissionsBitField.Flags.ManageChannels
          )
        )
          return;

        await interaction.channel.permissionOverwrites.edit(
          interaction.guild.roles.everyone,
          {
            SendMessages: null,
          }
        );

        return interaction.reply({
          embeds: [successEmbed("This channel has been unlocked. 🔓")],
        });
      }

      /* ================= ROLE ================= */

      if (commandName === "role") {
        if (
          !requirePermission(
            interaction,
            PermissionsBitField.Flags.ManageRoles
          )
        )
          return;

        const sub = interaction.options.getSubcommand();

        if (sub === "add") {
          const user = interaction.options.getMember("user");
          const role = interaction.options.getRole("role");

          if (!user || !role) {
            return interaction.reply({
              embeds: [errorEmbed("Member or role not found.")],
              ephemeral: true,
            });
          }

          if (role.position >= interaction.guild.members.me.roles.highest.position) {
            return interaction.reply({
              embeds: [
                errorEmbed(
                  "That role is higher than or equal to my highest role."
                ),
              ],
              ephemeral: true,
            });
          }

          await user.roles.add(role);

          return interaction.reply({
            embeds: [
              successEmbed(
                `Added ${role} to ${user}.`
              ),
            ],
          });
        }

        if (sub === "remove") {
          const user = interaction.options.getMember("user");
          const role = interaction.options.getRole("role");

          if (!user || !role) {
            return interaction.reply({
              embeds: [errorEmbed("Member or role not found.")],
              ephemeral: true,
            });
          }

          await user.roles.remove(role);

          return interaction.reply({
            embeds: [
              successEmbed(
                `Removed ${role} from ${user}.`
              ),
            ],
          });
        }

        if (sub === "create") {
          const name = interaction.options.getString("name");

          const role = await interaction.guild.roles.create({
            name,
            reason: `Created by ${interaction.user.tag}`,
          });

          return interaction.reply({
            embeds: [
              successEmbed(
                `Created ${role}.`
              ),
            ],
          });
        }
      }

      /* ================= SERVER INFO ================= */

      if (commandName === "serverinfo") {
        const guild = interaction.guild;

        const embed = jrcEmbed(
          guild.name,
          [
            `👥 **Members:** ${guild.memberCount}`,
            `📁 **Channels:** ${guild.channels.cache.size}`,
            `🎭 **Roles:** ${guild.roles.cache.size}`,
            `😀 **Emojis:** ${guild.emojis.cache.size}`,
            `🆔 **ID:** \`${guild.id}\``,
            `👑 **Owner:** <@${guild.ownerId}>`,
          ].join("\n")
        );

        if (guild.iconURL()) embed.setThumbnail(guild.iconURL());

        return interaction.reply({ embeds: [embed] });
      }

      /* ================= USER INFO ================= */

      if (commandName === "userinfo") {
        const user =
          interaction.options.getUser("user") || interaction.user;

        const member = await interaction.guild.members
          .fetch(user.id)
          .catch(() => null);

        const embed = jrcEmbed(
          `User Information`,
          [
            `👤 **User:** ${user}`,
            `🏷️ **Username:** ${user.username}`,
            `🆔 **ID:** \`${user.id}\``,
            `📅 **Created:** <t:${Math.floor(
              user.createdTimestamp / 1000
            )}:R>`,
            member
              ? `📥 **Joined:** <t:${Math.floor(
                  member.joinedTimestamp / 1000
                )}:R>`
              : "",
          ]
            .filter(Boolean)
            .join("\n")
        ).setThumbnail(user.displayAvatarURL({ size: 512 }));

        return interaction.reply({ embeds: [embed] });
      }

      /* ================= AVATAR ================= */

      if (commandName === "avatar") {
        const user =
          interaction.options.getUser("user") || interaction.user;

        const embed = jrcEmbed(
          `${user.username}'s Avatar`,
          `[Open Avatar](https://discord.com/users/${user.id})`
        ).setImage(user.displayAvatarURL({ size: 1024 }));

        return interaction.reply({ embeds: [embed] });
      }

      /* ================= PING ================= */

      if (commandName === "ping") {
        return interaction.reply({
          embeds: [
            jrcEmbed(
              "JRC Pong",
              `🏓 **WebSocket:** ${client.ws.ping}ms\n⚡ **Status:** Operational`,
              "#57F287"
            ),
          ],
        });
      }

      /* ================= SAY ================= */

      if (commandName === "say") {
        if (
          !requirePermission(
            interaction,
            PermissionsBitField.Flags.ManageMessages
          )
        )
          return;

        const message = interaction.options.getString("message");

        await interaction.channel.send({
          embeds: [jrcEmbed("JRC", message)],
        });

        return interaction.reply({
          embeds: [successEmbed("Message sent.")],
          ephemeral: true,
        });
      }
    }

    /* =====================================================
       BUTTONS
       ===================================================== */

    if (interaction.isButton()) {
      const id = interaction.customId;
      const guild = interaction.guild;

      if (
        !interaction.memberPermissions?.has(
          PermissionsBitField.Flags.ManageGuild
        )
      ) {
        return interaction.reply({
          embeds: [errorEmbed("You need Manage Server permission.")],
          ephemeral: true,
        });
      }

      /* ---------- CLOSE ---------- */

      if (id === "config_close") {
        return interaction.update({
          embeds: [
            jrcEmbed(
              "JRC Configuration",
              "Configuration panel closed.\nRun `/config` whenever you want to open it again."
            ),
          ],
          components: [],
        });
      }

      /* ---------- BACK ---------- */

      if (id === "config_back") {
        return interaction.update(configPanel(guild));
      }

      /* ---------- WELCOME ---------- */

      if (id === "welcome_toggle") {
        const cfg = getConfig(guild.id).welcome;
        cfg.enabled = !cfg.enabled;
        saveDB();

        return interaction.update(welcomePanel(guild));
      }

      if (id === "welcome_channel") {
        const menu = new ChannelSelectMenuBuilder()
          .setCustomId("welcome_channel_select")
          .setPlaceholder("Select the welcome channel")
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);

        return interaction.update({
          embeds: [
            jrcEmbed(
              "Welcome Channel",
              "Select the channel where JRC should send welcomes."
            ),
          ],
          components: [
            new ActionRowBuilder().addComponents(menu),
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("welcome_back")
                .setLabel("Back")
                .setEmoji("↩️")
                .setStyle(ButtonStyle.Secondary)
            ),
          ],
        });
      }

      if (id === "welcome_message") {
        const cfg = getConfig(guild.id).welcome;

        const modal = new ModalBuilder()
          .setCustomId("welcome_message_modal")
          .setTitle("Welcome Message");

        const input = new TextInputBuilder()
          .setCustomId("message")
          .setLabel("Welcome message")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(2000)
          .setValue(cfg.message);

        modal.addComponents(
          new ActionRowBuilder().addComponents(input)
        );

        return interaction.showModal(modal);
      }

      if (id === "welcome_image") {
        const cfg = getConfig(guild.id).welcome;

        const modal = new ModalBuilder()
          .setCustomId("welcome_image_modal")
          .setTitle("Welcome Image / GIF");

        const input = new TextInputBuilder()
          .setCustomId("image")
          .setLabel("Image/GIF URL — leave blank to remove")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(1000)
          .setValue(cfg.image || "");

        modal.addComponents(
          new ActionRowBuilder().addComponents(input)
        );

        return interaction.showModal(modal);
      }

      if (id === "welcome_embed") {
        const cfg = getConfig(guild.id).welcome;
        cfg.embed = !cfg.embed;
        saveDB();

        return interaction.update(welcomePanel(guild));
      }

      if (id === "welcome_test") {
        const cfg = getConfig(guild.id).welcome;

        if (!cfg.channel) {
          return interaction.reply({
            embeds: [
              errorEmbed(
                "Set a welcome channel before running a test."
              ),
            ],
            ephemeral: true,
          });
        }

        const channel = guild.channels.cache.get(cfg.channel);

        if (!channel?.isTextBased()) {
          return interaction.reply({
            embeds: [errorEmbed("The configured channel is invalid.")],
            ephemeral: true,
          });
        }

        const message = replaceVariables(
          cfg.message,
          interaction.member
        );

        if (cfg.embed) {
          const embed = jrcEmbed(
            "Welcome Test",
            message,
            cfg.color
          );

          if (cfg.image && validUrl(cfg.image)) {
            embed.setImage(cfg.image);
          }

          await channel.send({ embeds: [embed] });
        } else {
          await channel.send({ content: message });
        }

        return interaction.reply({
          embeds: [successEmbed(`Test sent in ${channel}.`)],
          ephemeral: true,
        });
      }

      if (id === "welcome_reset") {
        getConfig(guild.id).welcome = defaultConfig().welcome;
        saveDB();

        return interaction.update(welcomePanel(guild));
      }

      if (id === "welcome_back") {
        return interaction.update(welcomePanel(guild));
      }

      /* ---------- GOODBYE ---------- */

      if (id === "goodbye_toggle") {
        const cfg = getConfig(guild.id).goodbye;
        cfg.enabled = !cfg.enabled;
        saveDB();

        return interaction.update(goodbyePanel(guild));
      }

      if (id === "goodbye_channel") {
        const menu = new ChannelSelectMenuBuilder()
          .setCustomId("goodbye_channel_select")
          .setPlaceholder("Select the goodbye channel")
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);

        return interaction.update({
          embeds: [
            jrcEmbed(
              "Goodbye Channel",
              "Select the channel where JRC should send goodbyes."
            ),
          ],
          components: [
            new ActionRowBuilder().addComponents(menu),
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("goodbye_back")
                .setLabel("Back")
                .setEmoji("↩️")
                .setStyle(ButtonStyle.Secondary)
            ),
          ],
        });
      }

      if (id === "goodbye_message") {
        const cfg = getConfig(guild.id).goodbye;

        const modal = new ModalBuilder()
          .setCustomId("goodbye_message_modal")
          .setTitle("Goodbye Message");

        const input = new TextInputBuilder()
          .setCustomId("message")
          .setLabel("Goodbye message")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(2000)
          .setValue(cfg.message);

        modal.addComponents(
          new ActionRowBuilder().addComponents(input)
        );

        return interaction.showModal(modal);
      }

      if (id === "goodbye_image") {
        const cfg = getConfig(guild.id).goodbye;

        const modal = new ModalBuilder()
          .setCustomId("goodbye_image_modal")
          .setTitle("Goodbye Image / GIF");

        const input = new TextInputBuilder()
          .setCustomId("image")
          .setLabel("Image/GIF URL — leave blank to remove")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(1000)
          .setValue(cfg.image || "");

        modal.addComponents(
          new ActionRowBuilder().addComponents(input)
        );

        return interaction.showModal(modal);
      }

      if (id === "goodbye_embed") {
        const cfg = getConfig(guild.id).goodbye;
        cfg.embed = !cfg.embed;
        saveDB();

        return interaction.update(goodbyePanel(guild));
      }

      if (id === "goodbye_test") {
        const cfg = getConfig(guild.id).goodbye;

        if (!cfg.channel) {
          return interaction.reply({
            embeds: [
              errorEmbed(
                "Set a goodbye channel before running a test."
              ),
            ],
            ephemeral: true,
          });
        }

        const channel = guild.channels.cache.get(cfg.channel);

        if (!channel?.isTextBased()) {
          return interaction.reply({
            embeds: [errorEmbed("The configured channel is invalid.")],
            ephemeral: true,
          });
        }

        const message = replaceVariables(
          cfg.message,
          interaction.member
        );

        if (cfg.embed) {
          const embed = jrcEmbed(
            "Goodbye Test",
            message,
            cfg.color
          );

          if (cfg.image && validUrl(cfg.image)) {
            embed.setImage(cfg.image);
          }

          await channel.send({ embeds: [embed] });
        } else {
          await channel.send({ content: message });
        }

        return interaction.reply({
          embeds: [successEmbed(`Test sent in ${channel}.`)],
          ephemeral: true,
        });
      }

      if (id === "goodbye_reset") {
        getConfig(guild.id).goodbye = defaultConfig().goodbye;
        saveDB();

        return interaction.update(goodbyePanel(guild));
      }

      if (id === "goodbye_back") {
        return interaction.update(goodbyePanel(guild));
      }

      /* ---------- LOGS ---------- */

      if (id === "logs_toggle") {
        const cfg = getConfig(guild.id).logs;
        cfg.enabled = !cfg.enabled;
        saveDB();

        return interaction.update(logsPanel(guild));
      }

      if (id === "logs_channel") {
        const menu = new ChannelSelectMenuBuilder()
          .setCustomId("logs_channel_select")
          .setPlaceholder("Select the log channel")
          .addChannelTypes(ChannelType.GuildText);

        return interaction.update({
          embeds: [
            jrcEmbed(
              "Log Channel",
              "Select where JRC should send logs."
            ),
          ],
          components: [
            new ActionRowBuilder().addComponents(menu),
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("logs_back")
                .setLabel("Back")
                .setEmoji("↩️")
                .setStyle(ButtonStyle.Secondary)
            ),
          ],
        });
      }

      if (id === "logs_events") {
        const cfg = getConfig(guild.id).logs;

        const menu = new StringSelectMenuBuilder()
          .setCustomId("logs_events_select")
          .setPlaceholder("Toggle a logging event...")
          .addOptions(
            {
              label: "Message Delete",
              value: "messageDelete",
              emoji: "🗑️",
              default: cfg.messageDelete,
            },
            {
              label: "Message Edit",
              value: "messageEdit",
              emoji: "✏️",
              default: cfg.messageEdit,
            },
            {
              label: "Member Join",
              value: "memberJoin",
              emoji: "📥",
              default: cfg.memberJoin,
            },
            {
              label: "Member Leave",
              value: "memberLeave",
              emoji: "📤",
              default: cfg.memberLeave,
            },
            {
              label: "Moderation",
              value: "moderation",
              emoji: "🛡️",
              default: cfg.moderation,
            }
          );

        return interaction.update({
          embeds: [
            jrcEmbed(
              "Logging Events",
              "Choose an event to toggle it."
            ),
          ],
          components: [
            new ActionRowBuilder().addComponents(menu),
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("logs_back")
                .setLabel("Back")
                .setEmoji("↩️")
                .setStyle(ButtonStyle.Secondary)
            ),
          ],
        });
      }

      if (id === "logs_back") {
        return interaction.update(logsPanel(guild));
      }

      /* ---------- SECURITY ---------- */

      if (id === "security_lockdown") {
        const cfg = getConfig(guild.id).security;
        const locking = !cfg.lockdown;

        await interaction.guild.channels.cache.forEach(async (channel) => {
          if (!channel.isTextBased()) return;

          try {
            await channel.permissionOverwrites.edit(
              guild.roles.everyone,
              {
                SendMessages: locking ? false : null,
              }
            );
          } catch {}
        });

        cfg.lockdown = locking;
        saveDB();

        return interaction.update(securityPanel(guild));
      }

      if (id === "security_slowmode") {
        const modal = new ModalBuilder()
          .setCustomId("security_slowmode_modal")
          .setTitle("Set Slowmode");

        const input = new TextInputBuilder()
          .setCustomId("seconds")
          .setLabel("Seconds (0-21600)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setValue(String(getConfig(guild.id).security.slowmode));

        modal.addComponents(
          new ActionRowBuilder().addComponents(input)
        );

        return interaction.showModal(modal);
      }
    }

    /* =====================================================
       SELECT MENUS
       ===================================================== */

    if (interaction.isStringSelectMenu()) {
      const guild = interaction.guild;

      if (interaction.customId === "config_select") {
        const value = interaction.values[0];

        if (value === "welcome") {
          return interaction.update(welcomePanel(guild));
        }

        if (value === "goodbye") {
          return interaction.update(goodbyePanel(guild));
        }

        if (value === "logs") {
          return interaction.update(logsPanel(guild));
        }

        if (value === "security") {
          return interaction.update(securityPanel(guild));
        }
      }

      if (interaction.customId === "logs_events_select") {
        const cfg = getConfig(guild.id).logs;
        const value = interaction.values[0];

        cfg[value] = !cfg[value];
        saveDB();

        return interaction.update(logsPanel(guild));
      }
    }

    /* =====================================================
       CHANNEL SELECTS
       ===================================================== */

    if (interaction.isChannelSelectMenu()) {
      const guild = interaction.guild;
      const channelId = interaction.values[0];

      if (interaction.customId === "welcome_channel_select") {
        getConfig(guild.id).welcome.channel = channelId;
        saveDB();

        return interaction.update(welcomePanel(guild));
      }

      if (interaction.customId === "goodbye_channel_select") {
        getConfig(guild.id).goodbye.channel = channelId;
        saveDB();

        return interaction.update(goodbyePanel(guild));
      }

      if (interaction.customId === "logs_channel_select") {
        getConfig(guild.id).logs.channel = channelId;
        saveDB();

        return interaction.update(logsPanel(guild));
      }
    }

    /* =====================================================
       MODALS
       ===================================================== */

    if (interaction.isModalSubmit()) {
      const guild = interaction.guild;

      if (interaction.customId === "welcome_message_modal") {
        const message = interaction.fields.getTextInputValue("message");

        getConfig(guild.id).welcome.message = message;
        saveDB();

        return interaction.reply({
          embeds: [successEmbed("Welcome message updated.")],
          ephemeral: true,
        });
      }

      if (interaction.customId === "welcome_image_modal") {
        const image = interaction.fields.getTextInputValue("image").trim();

        if (image && !validUrl(image)) {
          return interaction.reply({
            embeds: [errorEmbed("That isn't a valid URL.")],
            ephemeral: true,
          });
        }

        getConfig(guild.id).welcome.image = image || null;
        saveDB();

        return interaction.reply({
          embeds: [
            successEmbed(
              image
                ? "Welcome image/GIF updated."
                : "Welcome image/GIF removed."
            ),
          ],
          ephemeral: true,
        });
      }

      if (interaction.customId === "goodbye_message_modal") {
        const message = interaction.fields.getTextInputValue("message");

        getConfig(guild.id).goodbye.message = message;
        saveDB();

        return interaction.reply({
          embeds: [successEmbed("Goodbye message updated.")],
          ephemeral: true,
        });
      }

      if (interaction.customId === "goodbye_image_modal") {
        const image = interaction.fields.getTextInputValue("image").trim();

        if (image && !validUrl(image)) {
          return interaction.reply({
            embeds: [errorEmbed("That isn't a valid URL.")],
            ephemeral: true,
          });
        }

        getConfig(guild.id).goodbye.image = image || null;
        saveDB();

        return interaction.reply({
          embeds: [
            successEmbed(
              image
                ? "Goodbye image/GIF updated."
                : "Goodbye image/GIF removed."
            ),
          ],
          ephemeral: true,
        });
      }

      if (interaction.customId === "security_slowmode_modal") {
        const seconds = Number(
          interaction.fields.getTextInputValue("seconds")
        );

        if (
          !Number.isInteger(seconds) ||
          seconds < 0 ||
          seconds > 21600
        ) {
          return interaction.reply({
            embeds: [
              errorEmbed(
                "Slowmode must be a whole number between 0 and 21600."
              ),
            ],
            ephemeral: true,
          });
        }

        await interaction.channel
          .setRateLimitPerUser(seconds)
          .catch(() => null);

        getConfig(guild.id).security.slowmode = seconds;
        saveDB();

        return interaction.reply({
          embeds: [
            successEmbed(
              `Slowmode set to **${seconds} second(s)**.`
            ),
          ],
          ephemeral: true,
        });
      }
    }
  } catch (err) {
    console.error("Interaction error:", err);

    try {
      const payload = {
        embeds: [
          errorEmbed(
            "JRC encountered an error while processing that action."
          ),
        ],
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload);
      } else {
        await interaction.reply(payload);
      }
    } catch {}
  }
});

/* =========================================================
   COMMAND REGISTRATION
   ========================================================= */

async function registerCommands() {
  try {
    const guild = await client.guilds.fetch(GUILD_ID);

    await guild.commands.set(commands);

    console.log(
      `✅ Registered ${commands.length} commands in ${guild.name}`
    );
  } catch (err) {
    console.error("Command registration failed:", err);
  }
}

/* =========================================================
   READY
   ========================================================= */

client.once("ready", async () => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`🤖 JRC Bot online as ${client.user.tag}`);
  console.log(`🏠 Servers: ${client.guilds.cache.size}`);
  console.log(`📡 Ping: ${client.ws.ping}ms`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  await registerCommands();

  client.user.setPresence({
    activities: [
      {
        name: "/config • JRC Control Center",
        type: 3,
      },
    ],
    status: "online",
  });
});

/* =========================================================
   PROCESS SAFETY
   ========================================================= */

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

/* =========================================================
   START
   ========================================================= */

loadDB();

client.login(TOKEN);
