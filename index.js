require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
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
  ChannelType
} = require("discord.js");

const fs = require("fs");
const path = require("path");

// ============================================================
// JRC BOT
// PREMIUM MIMU-STYLE WELCOME + GOODBYE SYSTEM
// SINGLE FILE
// ============================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const CONFIG_FILE = path.join(__dirname, "config.json");

let config = {};

if (fs.existsSync(CONFIG_FILE)) {
  try {
    config = JSON.parse(
      fs.readFileSync(CONFIG_FILE, "utf8")
    );
  } catch {
    config = {};
  }
}

// ============================================================
// CONFIG
// ============================================================

function saveConfig() {
  try {
    fs.writeFileSync(
      CONFIG_FILE,
      JSON.stringify(config, null, 2)
    );
  } catch (error) {
    console.error("❌ Failed to save config:", error);
  }
}

function guildConfig(guildId) {
  if (!config[guildId]) {
    config[guildId] = {
      welcome: {
        enabled: false,
        channel: null,
        title: "🎉 Welcome {user}!",
        description:
          "We're glad to have you here. Enjoy your stay!",
        message:
          "Welcome {user} to **{server}**!",
        color: "#5865F2",
        image: null,
        gif: null,
        footer: null,
        timestamp: true,
        thumbnail: true
      },

      goodbye: {
        enabled: false,
        channel: null,
        title: "👋 Goodbye {user}",
        description:
          "Thanks for being part of our community. We'll miss you!",
        message:
          "{user} has left **{server}**.",
        color: "#ED4245",
        image: null,
        gif: null,
        footer: null,
        timestamp: true,
        thumbnail: true
      }
    };

    saveConfig();
  }

  const cfg = config[guildId];

  if (!cfg.welcome)
    cfg.welcome = {};

  if (!cfg.goodbye)
    cfg.goodbye = {};

  // Welcome migration
  if (cfg.welcome.enabled === undefined)
    cfg.welcome.enabled = false;

  if (cfg.welcome.channel === undefined)
    cfg.welcome.channel = null;

  if (!cfg.welcome.title)
    cfg.welcome.title = "🎉 Welcome {user}!";

  if (!cfg.welcome.description)
    cfg.welcome.description =
      "We're glad to have you here. Enjoy your stay!";

  if (!cfg.welcome.message)
    cfg.welcome.message =
      "Welcome {user} to **{server}**!";

  if (!cfg.welcome.color)
    cfg.welcome.color = "#5865F2";

  if (cfg.welcome.image === undefined)
    cfg.welcome.image = null;

  if (cfg.welcome.gif === undefined)
    cfg.welcome.gif = null;

  if (cfg.welcome.footer === undefined)
    cfg.welcome.footer = null;

  if (cfg.welcome.timestamp === undefined)
    cfg.welcome.timestamp = true;

  if (cfg.welcome.thumbnail === undefined)
    cfg.welcome.thumbnail = true;

  // Goodbye migration
  if (cfg.goodbye.enabled === undefined)
    cfg.goodbye.enabled = false;

  if (cfg.goodbye.channel === undefined)
    cfg.goodbye.channel = null;

  if (!cfg.goodbye.title)
    cfg.goodbye.title = "👋 Goodbye {user}";

  if (!cfg.goodbye.description)
    cfg.goodbye.description =
      "Thanks for being part of our community. We'll miss you!";

  if (!cfg.goodbye.message)
    cfg.goodbye.message =
      "{user} has left **{server}**.";

  if (!cfg.goodbye.color)
    cfg.goodbye.color = "#ED4245";

  if (cfg.goodbye.image === undefined)
    cfg.goodbye.image = null;

  if (cfg.goodbye.gif === undefined)
    cfg.goodbye.gif = null;

  if (cfg.goodbye.footer === undefined)
    cfg.goodbye.footer = null;

  if (cfg.goodbye.timestamp === undefined)
    cfg.goodbye.timestamp = true;

  if (cfg.goodbye.thumbnail === undefined)
    cfg.goodbye.thumbnail = true;

  return cfg;
}

// ============================================================
// VARIABLES
// ONLY:
// {user}
// {username}
// {server}
// ============================================================

function replaceVariables(text, member) {
  if (!text) return "";

  const username =
    member.user?.username ||
    member.user?.globalName ||
    "User";

  const server =
    member.guild?.name ||
    "Server";

  return String(text)
    .replaceAll(
      "{user}",
      `<@${member.id}>`
    )
    .replaceAll(
      "{username}",
      username
    )
    .replaceAll(
      "{server}",
      server
    );
}

// ============================================================
// VALIDATION
// ============================================================

function validImage(url) {
  if (!url) return false;

  try {
    const parsed = new URL(url);

    return (
      parsed.protocol === "http:" ||
      parsed.protocol === "https:"
    );
  } catch {
    return false;
  }
}

function validColor(color) {
  if (!color) return false;

  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

// ============================================================
// SLASH COMMANDS
// ============================================================

const commands = [

  // ==========================================================
  // /welcome
  // ==========================================================

  new SlashCommandBuilder()
    .setName("welcome")
    .setDescription(
      "Open the JRC Welcome dashboard"
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    ),

  // ==========================================================
  // /welcome-setup
  // ==========================================================

  new SlashCommandBuilder()
    .setName("welcome-setup")
    .setDescription(
      "Quickly configure the JRC Welcome system"
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    )
    .addChannelOption(opt =>
      opt
        .setName("channel")
        .setDescription(
          "Channel where welcome messages are sent"
        )
        .addChannelTypes(
          ChannelType.GuildText,
          ChannelType.GuildAnnouncement
        )
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName("message")
        .setDescription(
          "Welcome message"
        )
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt
        .setName("gif")
        .setDescription(
          "Image/GIF URL"
        )
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt
        .setName("color")
        .setDescription(
          "Embed color, e.g. #5865F2"
        )
        .setRequired(false)
    ),

  // ==========================================================
  // /welcome-disable
  // ==========================================================

  new SlashCommandBuilder()
    .setName("welcome-disable")
    .setDescription(
      "Disable the JRC Welcome system"
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    ),

  // ==========================================================
  // /welcome-test
  // ==========================================================

  new SlashCommandBuilder()
    .setName("welcome-test")
    .setDescription(
      "Preview the current JRC Welcome embed"
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    ),

  // ==========================================================
  // /goodbye
  // ==========================================================

  new SlashCommandBuilder()
    .setName("goodbye")
    .setDescription(
      "Open the JRC Goodbye dashboard"
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    ),

  // ==========================================================
  // /goodbye-setup
  // ==========================================================

  new SlashCommandBuilder()
    .setName("goodbye-setup")
    .setDescription(
      "Quickly configure the JRC Goodbye system"
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    )
    .addChannelOption(opt =>
      opt
        .setName("channel")
        .setDescription(
          "Channel where goodbye messages are sent"
        )
        .addChannelTypes(
          ChannelType.GuildText,
          ChannelType.GuildAnnouncement
        )
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName("message")
        .setDescription(
          "Goodbye message"
        )
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt
        .setName("gif")
        .setDescription(
          "Image/GIF URL"
        )
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt
        .setName("color")
        .setDescription(
          "Embed color, e.g. #ED4245"
        )
        .setRequired(false)
    ),

  // ==========================================================
  // /goodbye-disable
  // ==========================================================

  new SlashCommandBuilder()
    .setName("goodbye-disable")
    .setDescription(
      "Disable the JRC Goodbye system"
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    ),

  // ==========================================================
  // /goodbye-test
  // ==========================================================

  new SlashCommandBuilder()
    .setName("goodbye-test")
    .setDescription(
      "Preview the current JRC Goodbye embed"
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    )

].map(command => command.toJSON());

// ============================================================
// PREMIUM DASHBOARD
// ============================================================

function buildPanel(system, guildId) {

  const cfg = guildConfig(guildId);
  const settings = cfg[system];

  const isWelcome =
    system === "welcome";

  const name =
    isWelcome
      ? "WELCOME"
      : "GOODBYE";

  const icon =
    isWelcome
      ? "🎉"
      : "👋";

  const defaultColor =
    isWelcome
      ? "#5865F2"
      : "#ED4245";

  const status =
    settings.enabled
      ? "🟢 ACTIVE"
      : "🔴 DISABLED";

  const channel =
    settings.channel
      ? `<#${settings.channel}>`
      : "Not configured";

  const media =
    settings.gif ||
    settings.image
      ? "🖼️ Configured"
      : "Not configured";

  const footer =
    settings.footer ||
    `JRC • ${name} Configuration`;

  const embed =
    new EmbedBuilder()
      .setTitle(
        `✦ JRC • ${name} SYSTEM`
      )
      .setDescription(
        `> ${
          isWelcome
            ? "Create a personalized greeting for every member who joins your community."
            : "Customize the message shown whenever a member leaves your community."
        }\n\n` +

        `**SYSTEM STATUS**\n` +
        `${status}\n\n` +

        `**CHANNEL**\n` +
        `${channel}\n\n` +

        `**GREETING / TITLE**\n` +
        `${settings.title || "Not configured"}\n\n` +

        `**DESCRIPTION**\n` +
        `${settings.description || "Not configured"}\n\n` +

        `**MESSAGE**\n` +
        `${settings.message || "Not configured"}\n\n` +

        `**MEDIA**\n` +
        `${media}\n\n` +

        `**EMBED COLOR**\n` +
        `\`${settings.color || defaultColor}\``
      )
      .setColor(
        validColor(settings.color)
          ? settings.color
          : defaultColor
      )
      .setFooter({
        text: footer
      })
      .setTimestamp();

  if (settings.thumbnail !== false) {
    // Dashboard doesn't have a member object,
    // so no user avatar thumbnail here.
  }

  const configure =
    new ButtonBuilder()
      .setCustomId(
        `jrc_${system}_configure`
      )
      .setLabel("Configure")
      .setEmoji("⚙️")
      .setStyle(ButtonStyle.Primary);

  const channelButton =
    new ButtonBuilder()
      .setCustomId(
        `jrc_${system}_channel`
      )
      .setLabel("Channel")
      .setEmoji("📢")
      .setStyle(ButtonStyle.Secondary);

  const preview =
    new ButtonBuilder()
      .setCustomId(
        `jrc_${system}_preview`
      )
      .setLabel("Preview")
      .setEmoji("👁️")
      .setStyle(ButtonStyle.Secondary);

  const enable =
    new ButtonBuilder()
      .setCustomId(
        `jrc_${system}_enable`
      )
      .setLabel("Enable")
      .setEmoji("🟢")
      .setStyle(ButtonStyle.Success);

  const disable =
    new ButtonBuilder()
      .setCustomId(
        `jrc_${system}_disable`
      )
      .setLabel("Disable")
      .setEmoji("🔴")
      .setStyle(ButtonStyle.Danger);

  return {
    embeds: [embed],

    components: [
      new ActionRowBuilder()
        .addComponents(
          configure,
          channelButton,
          preview
        ),

      new ActionRowBuilder()
        .addComponents(
          enable,
          disable
        )
    ]
  };
}

// ============================================================
// CONFIG MODAL
// ============================================================

function buildConfigModal(system, settings) {

  const isWelcome =
    system === "welcome";

  const modal =
    new ModalBuilder()
      .setCustomId(
        `jrc_${system}_modal`
      )
      .setTitle(
        isWelcome
          ? "JRC • Welcome Configuration"
          : "JRC • Goodbye Configuration"
      );

  const title =
    new TextInputBuilder()
      .setCustomId("title")
      .setLabel("Greeting / Embed Title")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(
        isWelcome
          ? "🎉 Welcome {user}!"
          : "👋 Goodbye {user}"
      )
      .setMaxLength(256)
      .setRequired(true)
      .setValue(
        settings.title || ""
      );

  const description =
    new TextInputBuilder()
      .setCustomId("description")
      .setLabel("Description")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder(
        isWelcome
          ? "We're glad to have you here!"
          : "Thanks for being part of our community!"
      )
      .setMaxLength(4000)
      .setRequired(true)
      .setValue(
        settings.description || ""
      );

  const message =
    new TextInputBuilder()
      .setCustomId("message")
      .setLabel("Greeting Message")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder(
        "Welcome {user} to {server}!"
      )
      .setMaxLength(4000)
      .setRequired(true)
      .setValue(
        settings.message || ""
      );

  const color =
    new TextInputBuilder()
      .setCustomId("color")
      .setLabel("Embed Color")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(
        isWelcome
          ? "#5865F2"
          : "#ED4245"
      )
      .setMaxLength(7)
      .setRequired(true)
      .setValue(
        settings.color ||
        (
          isWelcome
            ? "#5865F2"
            : "#ED4245"
        )
      );

  const media =
    new TextInputBuilder()
      .setCustomId("media")
      .setLabel("Image / GIF URL")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(
        "https://example.com/image.gif"
      )
      .setMaxLength(1000)
      .setRequired(false)
      .setValue(
        settings.gif ||
        settings.image ||
        ""
      );

  modal.addComponents(
    new ActionRowBuilder()
      .addComponents(title),

    new ActionRowBuilder()
      .addComponents(description),

    new ActionRowBuilder()
      .addComponents(message),

    new ActionRowBuilder()
      .addComponents(color),

    new ActionRowBuilder()
      .addComponents(media)
  );

  return modal;
}

// ============================================================
// BUILD MEMBER EMBED
// ============================================================

function buildMemberEmbed(
  system,
  member,
  settings,
  preview = false
) {

  const fallback =
    system === "welcome"
      ? "#5865F2"
      : "#ED4245";

  const title =
    replaceVariables(
      settings.title,
      member
    );

  const description =
    replaceVariables(
      settings.description,
      member
    );

  const message =
    replaceVariables(
      settings.message,
      member
    );

  const embed =
    new EmbedBuilder()
      .setTitle(title)
      .setDescription(
        `${description}\n\n${message}`
      )
      .setColor(
        validColor(settings.color)
          ? settings.color
          : fallback
      );

  if (
    settings.thumbnail !== false &&
    member.user
  ) {
    embed.setThumbnail(
      member.user.displayAvatarURL({
        size: 256,
        extension: "png"
      })
    );
  }

  const media =
    settings.gif ||
    settings.image;

  if (validImage(media)) {
    embed.setImage(media);
  }

  if (settings.footer) {
    embed.setFooter({
      text:
        replaceVariables(
          settings.footer,
          member
        )
    });
  } else {
    embed.setFooter({
      text:
        `${member.guild.name} • JRC ${
          preview
            ? "Preview"
            : system === "welcome"
              ? "Welcome"
              : "Goodbye"
        }`
    });
  }

  if (
    settings.timestamp !== false
  ) {
    embed.setTimestamp();
  }

  return embed;
}

// ============================================================
// SEND WELCOME
// ============================================================

async function sendWelcome(member) {

  const cfg =
    guildConfig(
      member.guild.id
    );

  const settings =
    cfg.welcome;

  if (
    !settings.enabled ||
    !settings.channel
  ) return;

  const channel =
    member.guild.channels.cache.get(
      settings.channel
    );

  if (
    !channel ||
    !channel.isTextBased()
  ) return;

  const embed =
    buildMemberEmbed(
      "welcome",
      member,
      settings
    );

  try {

    await channel.send({
      content:
        `Welcome <@${member.id}>! 🎉`,
      embeds: [embed]
    });

  } catch (error) {

    console.error(
      "❌ Welcome message failed:",
      error
    );
  }
}

// ============================================================
// SEND GOODBYE
// ============================================================

async function sendGoodbye(member) {

  const cfg =
    guildConfig(
      member.guild.id
    );

  const settings =
    cfg.goodbye;

  if (
    !settings.enabled ||
    !settings.channel
  ) return;

  const channel =
    member.guild.channels.cache.get(
      settings.channel
    );

  if (
    !channel ||
    !channel.isTextBased()
  ) return;

  const embed =
    buildMemberEmbed(
      "goodbye",
      member,
      settings
    );

  try {

    await channel.send({
      embeds: [embed]
    });

  } catch (error) {

    console.error(
      "❌ Goodbye message failed:",
      error
    );
  }
}

// ============================================================
// READY
// ============================================================

client.once(
  "ready",
  async () => {

    console.log(
      "================================"
    );

    console.log(
      `🤖 Logged in as ${client.user.tag}`
    );

    console.log(
      `🌐 Servers: ${client.guilds.cache.size}`
    );

    console.log(
      "✨ JRC Premium Welcome System"
    );

    console.log(
      "✨ JRC Premium Goodbye System"
    );

    console.log(
      "🌍 Registering slash commands..."
    );

    console.log(
      "================================"
    );

    const rest =
      new REST({
        version: "10"
      })
      .setToken(
        process.env.DISCORD_TOKEN
      );

    try {

      await rest.put(
        Routes.applicationCommands(
          process.env.CLIENT_ID
        ),
        {
          body: commands
        }
      );

      console.log(
        `✅ ${commands.length} slash commands registered.`
      );

      console.log(
        "🚀 JRC is fully online."
      );

    } catch (error) {

      console.error(
        "❌ Command registration failed:",
        error
      );
    }
  }
);

// ============================================================
// MEMBER JOIN
// ============================================================

client.on(
  "guildMemberAdd",
  async member => {
    await sendWelcome(member);
  }
);

// ============================================================
// MEMBER LEAVE
// ============================================================

client.on(
  "guildMemberRemove",
  async member => {
    await sendGoodbye(member);
  }
);

// ============================================================
// SLASH COMMANDS
// ============================================================

client.on(
  "interactionCreate",
  async interaction => {

    if (
      !interaction.isChatInputCommand()
    ) return;

    const guild =
      interaction.guild;

    if (!guild) {

      return interaction.reply({
        content:
          "❌ This command can only be used inside a server.",
        ephemeral: true
      });
    }

    const cfg =
      guildConfig(guild.id);

    // ========================================================
    // /welcome
    // ========================================================

    if (
      interaction.commandName === "welcome"
    ) {

      return interaction.reply(
        buildPanel(
          "welcome",
          guild.id
        )
      );
    }

    // ========================================================
    // /welcome-setup
    // ========================================================

    if (
      interaction.commandName === "welcome-setup"
    ) {

      const channel =
        interaction.options.getChannel(
          "channel"
        );

      const message =
        interaction.options.getString(
          "message"
        );

      const gif =
        interaction.options.getString(
          "gif"
        );

      const color =
        interaction.options.getString(
          "color"
        );

      if (
        gif &&
        !validImage(gif)
      ) {

        return interaction.reply({
          content:
            "❌ That doesn't look like a valid image/GIF URL.",
          ephemeral: true
        });
      }

      if (
        color &&
        !validColor(color)
      ) {

        return interaction.reply({
          content:
            "❌ Invalid color. Use something like `#5865F2`.",
          ephemeral: true
        });
      }

      cfg.welcome.enabled = true;
      cfg.welcome.channel = channel.id;

      if (message)
        cfg.welcome.message = message;

      if (gif) {
        cfg.welcome.gif = gif;
        cfg.welcome.image = gif;
      }

      if (color)
        cfg.welcome.color = color;

      saveConfig();

      return interaction.reply({
        content:
          "🎉 **JRC Welcome System Enabled!**\n\n" +
          `📢 Channel: ${channel}\n` +
          `💬 Message: ${cfg.welcome.message}\n` +
          `🎨 Color: ${cfg.welcome.color}`,
        ephemeral: true
      });
    }

    // ========================================================
    // /welcome-disable
    // ========================================================

    if (
      interaction.commandName === "welcome-disable"
    ) {

      cfg.welcome.enabled = false;

      saveConfig();

      return interaction.reply({
        content:
          "🔴 **JRC Welcome System Disabled.**",
        ephemeral: true
      });
    }

    // ========================================================
    // /welcome-test
    // ========================================================

    if (
      interaction.commandName === "welcome-test"
    ) {

      const settings =
        cfg.welcome;

      if (!settings.channel) {

        return interaction.reply({
          content:
            "❌ Welcome isn't configured yet.",
          ephemeral: true
        });
      }

      const embed =
        buildMemberEmbed(
          "welcome",
          interaction.member,
          settings,
          true
        );

      return interaction.reply({
        content:
          "👁️ **JRC Welcome Preview**",
        embeds: [embed],
        ephemeral: true
      });
    }

    // ========================================================
    // /goodbye
    // ========================================================

    if (
      interaction.commandName === "goodbye"
    ) {

      return interaction.reply(
        buildPanel(
          "goodbye",
          guild.id
        )
      );
    }

    // ========================================================
    // /goodbye-setup
    // ========================================================

    if (
      interaction.commandName === "goodbye-setup"
    ) {

      const channel =
        interaction.options.getChannel(
          "channel"
        );

      const message =
        interaction.options.getString(
          "message"
        );

      const gif =
        interaction.options.getString(
          "gif"
        );

      const color =
        interaction.options.getString(
          "color"
        );

      if (
        gif &&
        !validImage(gif)
      ) {

        return interaction.reply({
          content:
            "❌ That doesn't look like a valid image/GIF URL.",
          ephemeral: true
        });
      }

      if (
        color &&
        !validColor(color)
      ) {

        return interaction.reply({
          content:
            "❌ Invalid color. Use something like `#ED4245`.",
          ephemeral: true
        });
      }

      cfg.goodbye.enabled = true;
      cfg.goodbye.channel = channel.id;

      if (message)
        cfg.goodbye.message = message;

      if (gif) {
        cfg.goodbye.gif = gif;
        cfg.goodbye.image = gif;
      }

      if (color)
        cfg.goodbye.color = color;

      saveConfig();

      return interaction.reply({
        content:
          "👋 **JRC Goodbye System Enabled!**\n\n" +
          `📢 Channel: ${channel}\n` +
          `💬 Message: ${cfg.goodbye.message}\n` +
          `🎨 Color: ${cfg.goodbye.color}`,
        ephemeral: true
      });
    }

    // ========================================================
    // /goodbye-disable
    // ========================================================

    if (
      interaction.commandName === "goodbye-disable"
    ) {

      cfg.goodbye.enabled = false;

      saveConfig();

      return interaction.reply({
        content:
          "🔴 **JRC Goodbye System Disabled.**",
        ephemeral: true
      });
    }

    // ========================================================
    // /goodbye-test
    // ========================================================

    if (
      interaction.commandName === "goodbye-test"
    ) {

      const settings =
        cfg.goodbye;

      if (!settings.channel) {

        return interaction.reply({
          content:
            "❌ Goodbye isn't configured yet.",
          ephemeral: true
        });
      }

      const embed =
        buildMemberEmbed(
          "goodbye",
          interaction.member,
          settings,
          true
        );

      return interaction.reply({
        content:
          "👁️ **JRC Goodbye Preview**",
        embeds: [embed],
        ephemeral: true
      });
    }
  }
);

// ============================================================
// BUTTONS / SELECT MENUS / MODALS
// ============================================================

client.on(
  "interactionCreate",
  async interaction => {

    // ========================================================
    // BUTTONS
    // ========================================================

    if (interaction.isButton()) {

      const id =
        interaction.customId;

      if (
        !id.startsWith("jrc_")
      ) return;

      const parts =
        id.split("_");

      const system =
        parts[1];

      const action =
        parts[2];

      if (
        system !== "welcome" &&
        system !== "goodbye"
      ) return;

      const cfg =
        guildConfig(
          interaction.guild.id
        );

      const settings =
        cfg[system];

      // ======================================================
      // CONFIGURE
      // ======================================================

      if (
        action === "configure"
      ) {

        return interaction.showModal(
          buildConfigModal(
            system,
            settings
          )
        );
      }

      // ======================================================
      // CHANNEL
      // ======================================================

      if (
        action === "channel"
      ) {

        const select =
          new ChannelSelectMenuBuilder()
            .setCustomId(
              `jrc_${system}_channel_select`
            )
            .setPlaceholder(
              "Select your message channel..."
            )
            .addChannelTypes(
              ChannelType.GuildText,
              ChannelType.GuildAnnouncement
            );

        return interaction.reply({
          content:
            `📢 **JRC ${system.toUpperCase()} CHANNEL**\n\n` +
            "Select the channel where JRC should send these messages.",
          components: [
            new ActionRowBuilder()
              .addComponents(select)
          ],
          ephemeral: true
        });
      }

      // ======================================================
      // ENABLE
      // ======================================================

      if (
        action === "enable"
      ) {

        if (!settings.channel) {

          return interaction.reply({
            content:
              "⚠️ Configure a channel first using **📢 Channel**.",
            ephemeral: true
          });
        }

        settings.enabled = true;

        saveConfig();

        return interaction.update(
          buildPanel(
            system,
            interaction.guild.id
          )
        );
      }

      // ======================================================
      // DISABLE
      // ======================================================

      if (
        action === "disable"
      ) {

        settings.enabled = false;

        saveConfig();

        return interaction.update(
          buildPanel(
            system,
            interaction.guild.id
          )
        );
      }

      // ======================================================
      // PREVIEW
      // ======================================================

      if (
        action === "preview"
      ) {

        const embed =
          buildMemberEmbed(
            system,
            interaction.member,
            settings,
            true
          );

        return interaction.reply({
          content:
            `👁️ **JRC ${system.toUpperCase()} PREVIEW**`,
          embeds: [embed],
          ephemeral: true
        });
      }
    }

    // ========================================================
    // CHANNEL SELECT
    // ========================================================

    if (
      interaction.isChannelSelectMenu()
    ) {

      const id =
        interaction.customId;

      if (
        !id.startsWith("jrc_")
      ) return;

      const parts =
        id.split("_");

      const system =
        parts[1];

      const action =
        parts[2];

      if (
        action !== "channel"
      ) return;

      if (
        system !== "welcome" &&
        system !== "goodbye"
      ) return;

      const channel =
        interaction.channels.first();

      if (!channel) {

        return interaction.reply({
          content:
            "❌ No channel selected.",
          ephemeral: true
        });
      }

      const cfg =
        guildConfig(
          interaction.guild.id
        );

      cfg[system].channel =
        channel.id;

      saveConfig();

      return interaction.update({
        content:
          `✅ **${system.toUpperCase()} channel updated!**\n\n` +
          `Messages will now be sent to ${channel}.`,
        components: []
      });
    }

    // ========================================================
    // MODAL
    // ========================================================

    if (
      interaction.isModalSubmit()
    ) {

      const id =
        interaction.customId;

      if (
        !id.startsWith("jrc_")
      ) return;

      const parts =
        id.split("_");

      const system =
        parts[1];

      const action =
        parts[2];

      if (
        action !== "modal"
      ) return;

      if (
        system !== "welcome" &&
        system !== "goodbye"
      ) return;

      const cfg =
        guildConfig(
          interaction.guild.id
        );

      const settings =
        cfg[system];

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
        );

      const media =
        interaction.fields.getTextInputValue(
          "media"
        );

      if (
        !validColor(color)
      ) {

        return interaction.reply({
          content:
            "❌ Invalid embed color.\n\nExample: `#5865F2`",
          ephemeral: true
        });
      }

      if (
        media &&
        !validImage(media)
      ) {

        return interaction.reply({
          content:
            "❌ That isn't a valid image/GIF URL.",
          ephemeral: true
        });
      }

      settings.title =
        title;

      settings.description =
        description;

      settings.message =
        message;

      settings.color =
        color;

      if (media) {

        settings.image =
          media;

        settings.gif =
          media;

      } else {

        settings.image =
          null;

        settings.gif =
          null;
      }

      saveConfig();

      return interaction.reply({
        content:
          `✅ **JRC ${system.toUpperCase()} settings saved!**\n\n` +
          "Your premium embed configuration has been updated.",
        ephemeral: true
      });
    }
  }
);

// ============================================================
// ERRORS
// ============================================================

client.on(
  "error",
  error => {
    console.error(
      "❌ Discord client error:",
      error
    );
  }
);

process.on(
  "unhandledRejection",
  error => {
    console.error(
      "❌ Unhandled rejection:",
      error
    );
  }
);

// ============================================================
// ENVIRONMENT CHECK
// ============================================================

if (!process.env.DISCORD_TOKEN) {

  console.error(
    "❌ DISCORD_TOKEN is missing from your environment variables."
  );

  process.exit(1);
}

if (!process.env.CLIENT_ID) {

  console.error(
    "❌ CLIENT_ID is missing from your environment variables."
  );

  process.exit(1);
}

// ============================================================
// LOGIN
// ============================================================

client.login(
  process.env.DISCORD_TOKEN
);
