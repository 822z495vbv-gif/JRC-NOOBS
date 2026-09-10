require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActivityType,
  REST,
  Routes
} = require("discord.js");

const fs = require("fs");
const path = require("path");

/* =========================================================
   CONFIG
   ========================================================= */

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error("❌ TOKEN and CLIENT_ID are required.");
  process.exit(1);
}

/* =========================================================
   CLIENT
   ========================================================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.GuildMember
  ]
});

/* =========================================================
   DATABASE
   ========================================================= */

const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "config.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, "{}");
}

let db;

try {
  db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
} catch {
  db = {};
}

function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function getGuild(guildId) {
  if (!db[guildId]) {
    db[guildId] = {
      welcome: {
        enabled: false,
        channel: null,
        title: "Welcome!",
        message: "Welcome {user} to {server}!",
        color: "#5865F2",
        url: "",
        image: "",
        thumbnail: "",
        footer: "JRC",
        timestamp: true
      },

      goodbye: {
        enabled: false,
        channel: null,
        title: "Goodbye!",
        message: "{user} has left {server}.",
        color: "#5865F2",
        url: "",
        image: "",
        thumbnail: "",
        footer: "JRC",
        timestamp: true
      },

      logs: {
        enabled: false,
        channel: null
      },

      warnings: {},

      security: {
        lockdown: false
      }
    };

    saveDB();
  }

  return db[guildId];
}

/* =========================================================
   EMBEDS
   ========================================================= */

const JRC_COLOR = "#5865F2";

function embed(title, description, color = JRC_COLOR) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`🛡️ ${title}`)
    .setDescription(description || "")
    .setFooter({ text: "JRC • Discord Management" })
    .setTimestamp();
}

function errorEmbed(message) {
  return embed("Something went wrong", `❌ ${message}`, "#ED4245");
}

function successEmbed(message) {
  return embed("Success", `✅ ${message}`, "#57F287");
}

/* =========================================================
   COLOR
   ========================================================= */

function parseColor(value) {
  if (!value) return JRC_COLOR;

  let color = value.trim();

  if (!color.startsWith("#")) {
    color = `#${color}`;
  }

  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return JRC_COLOR;
  }

  return color;
}

/* =========================================================
   PLACEHOLDERS
   ========================================================= */

function replacePlaceholders(text, member) {
  if (!text) return "";

  return text
    .replaceAll("{user}", `<@${member.id}>`)
    .replaceAll("{mention}", `<@${member.id}>`)
    .replaceAll("{username}", member.user.username)
    .replaceAll(
      "{displayname}",
      member.displayName || member.user.username
    )
    .replaceAll("{server}", member.guild.name)
    .replaceAll(
      "{membercount}",
      member.guild.memberCount.toString()
    );
}

/* =========================================================
   BUILD GREETING EMBED
   ========================================================= */

function buildGreeting(guild, member, type) {
  const settings = getGuild(guild.id)[type];

  const e = new EmbedBuilder()
    .setColor(parseColor(settings.color))
    .setTitle(
      replacePlaceholders(settings.title, member)
    )
    .setDescription(
      replacePlaceholders(settings.message, member)
    );

  if (settings.url) {
    e.setURL(settings.url);
  }

  if (settings.image) {
    e.setImage(settings.image);
  }

  if (settings.thumbnail) {
    e.setThumbnail(settings.thumbnail);
  }

  if (settings.footer) {
    e.setFooter({
      text: replacePlaceholders(settings.footer, member)
    });
  }

  if (settings.timestamp) {
    e.setTimestamp();
  }

  return e;
}

/* =========================================================
   SETUP PANEL
   ========================================================= */

function setupPanel(guild) {
  const settings = getGuild(guild.id);

  const welcomeChannel =
    settings.welcome.channel
      ? `<#${settings.welcome.channel}>`
      : "`Not configured`";

  const goodbyeChannel =
    settings.goodbye.channel
      ? `<#${settings.goodbye.channel}>`
      : "`Not configured`";

  const e = embed(
    "JRC Setup",
    "Configure your welcome and goodbye systems using the buttons below."
  );

  e.addFields(
    {
      name: "👋 Welcome",
      value:
        `Status: ${
          settings.welcome.enabled ? "🟢 Enabled" : "🔴 Disabled"
        }\n` +
        `Channel: ${welcomeChannel}\n` +
        `Title: ${settings.welcome.title}`,
      inline: false
    },
    {
      name: "🚪 Goodbye",
      value:
        `Status: ${
          settings.goodbye.enabled ? "🟢 Enabled" : "🔴 Disabled"
        }\n` +
        `Channel: ${goodbyeChannel}\n` +
        `Title: ${settings.goodbye.title}`,
      inline: false
    }
  );

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("jrc_setup_w_toggle")
      .setLabel(
        settings.welcome.enabled
          ? "Disable Welcome"
          : "Enable Welcome"
      )
      .setStyle(
        settings.welcome.enabled
          ? ButtonStyle.Danger
          : ButtonStyle.Success
      ),

    new ButtonBuilder()
      .setCustomId("jrc_setup_g_toggle")
      .setLabel(
        settings.goodbye.enabled
          ? "Disable Goodbye"
          : "Enable Goodbye"
      )
      .setStyle(
        settings.goodbye.enabled
          ? ButtonStyle.Danger
          : ButtonStyle.Success
      )
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("jrc_setup_w_config")
      .setLabel("Configure Welcome")
      .setEmoji("👋")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("jrc_setup_g_config")
      .setLabel("Configure Goodbye")
      .setEmoji("🚪")
      .setStyle(ButtonStyle.Primary)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("jrc_setup_w_channel")
      .setLabel("Welcome Channel")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("jrc_setup_g_channel")
      .setLabel("Goodbye Channel")
      .setStyle(ButtonStyle.Secondary)
  );

  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("jrc_setup_w_preview")
      .setLabel("Welcome Preview")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("jrc_setup_g_preview")
      .setLabel("Goodbye Preview")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("jrc_setup_w_test")
      .setLabel("Test Welcome")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("jrc_setup_g_test")
      .setLabel("Test Goodbye")
      .setStyle(ButtonStyle.Success)
  );

  const row5 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("jrc_setup_w_reset")
      .setLabel("Reset Welcome")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("jrc_setup_g_reset")
      .setLabel("Reset Goodbye")
      .setStyle(ButtonStyle.Danger)
  );

  return {
    embeds: [e],
    components: [row1, row2, row3, row4, row5]
  };
}

/* =========================================================
   CONFIG MODAL
   ========================================================= */

function configModal(type) {
  const settings = getGuild(global.guildForModal)[type];

  const modal = new ModalBuilder()
    .setCustomId(`jrc_modal_config_${type}`)
    .setTitle(
      type === "welcome"
        ? "Configure Welcome"
        : "Configure Goodbye"
    );

  const title = new TextInputBuilder()
    .setCustomId("title")
    .setLabel("Greeting Title")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setValue(settings.title || "");

  const message = new TextInputBuilder()
    .setCustomId("message")
    .setLabel("Greeting Message")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setValue(settings.message || "");

  const color = new TextInputBuilder()
    .setCustomId("color")
    .setLabel("Color")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setPlaceholder("#5865F2")
    .setValue(settings.color || "");

  const url = new TextInputBuilder()
    .setCustomId("url")
    .setLabel("Embed URL")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setValue(settings.url || "");

  const footer = new TextInputBuilder()
    .setCustomId("footer")
    .setLabel("Footer")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setValue(settings.footer || "");

  modal.addComponents(
    new ActionRowBuilder().addComponents(title),
    new ActionRowBuilder().addComponents(message),
    new ActionRowBuilder().addComponents(color),
    new ActionRowBuilder().addComponents(url),
    new ActionRowBuilder().addComponents(footer)
  );

  return modal;
}

/* =========================================================
   MEDIA MODAL
   ========================================================= */

function mediaModal(type) {
  const settings = getGuild(global.guildForModal)[type];

  const modal = new ModalBuilder()
    .setCustomId(`jrc_modal_media_${type}`)
    .setTitle(
      type === "welcome"
        ? "Welcome Media"
        : "Goodbye Media"
    );

  const image = new TextInputBuilder()
    .setCustomId("image")
    .setLabel("Image / GIF URL")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setValue(settings.image || "");

  const thumbnail = new TextInputBuilder()
    .setCustomId("thumbnail")
    .setLabel("Thumbnail URL")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setValue(settings.thumbnail || "");

  const timestamp = new TextInputBuilder()
    .setCustomId("timestamp")
    .setLabel("Timestamp")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setPlaceholder("true or false")
    .setValue(String(settings.timestamp));

  modal.addComponents(
    new ActionRowBuilder().addComponents(image),
    new ActionRowBuilder().addComponents(thumbnail),
    new ActionRowBuilder().addComponents(timestamp)
  );

  return modal;
}

/* =========================================================
   COMMANDS
   ========================================================= */

const commands = [

  /* MODERATION */

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("Member to warn")
        .setRequired(true))
    .addStringOption(o =>
      o.setName("reason")
        .setDescription("Reason")
        .setRequired(false)),

  new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("View warnings")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("Member")
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName("clearwarnings")
    .setDescription("Clear warnings")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("Member")
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout a member")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("Member")
        .setRequired(true))
    .addStringOption(o =>
      o.setName("duration")
        .setDescription("Example: 10m, 1h, 1d")
        .setRequired(true))
    .addStringOption(o =>
      o.setName("reason")
        .setDescription("Reason")),

  new SlashCommandBuilder()
    .setName("untimeout")
    .setDescription("Remove a timeout")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("Member")
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("Member")
        .setRequired(true))
    .addStringOption(o =>
      o.setName("reason")
        .setDescription("Reason")),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("Member")
        .setRequired(true))
    .addStringOption(o =>
      o.setName("reason")
        .setDescription("Reason")),

  new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban a user")
    .addStringOption(o =>
      o.setName("userid")
        .setDescription("User ID")
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Delete messages")
    .addIntegerOption(o =>
      o.setName("amount")
        .setDescription("1-100")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName("slowmode")
    .setDescription("Set channel slowmode")
    .addIntegerOption(o =>
      o.setName("seconds")
        .setDescription("0-21600 seconds")
        .setMinValue(0)
        .setMaxValue(21600)
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName("lock")
    .setDescription("Lock this channel"),

  new SlashCommandBuilder()
    .setName("unlock")
    .setDescription("Unlock this channel"),

  /* ROLES */

  new SlashCommandBuilder()
    .setName("role")
    .setDescription("Role management")
    .addSubcommand(s =>
      s.setName("add")
        .setDescription("Add role")
        .addUserOption(o =>
          o.setName("user")
            .setDescription("Member")
            .setRequired(true))
        .addRoleOption(o =>
          o.setName("role")
            .setDescription("Role")
            .setRequired(true)))
    .addSubcommand(s =>
      s.setName("remove")
        .setDescription("Remove role")
        .addUserOption(o =>
          o.setName("user")
            .setDescription("Member")
            .setRequired(true))
        .addRoleOption(o =>
          o.setName("role")
            .setDescription("Role")
            .setRequired(true)))
    .addSubcommand(s =>
      s.setName("create")
        .setDescription("Create a role")
        .addStringOption(o =>
          o.setName("name")
            .setDescription("Role name")
            .setRequired(true))
        .addStringOption(o =>
          o.setName("color")
            .setDescription("#5865F2")))
    .addSubcommand(s =>
      s.setName("delete")
        .setDescription("Delete role")
        .addRoleOption(o =>
          o.setName("role")
            .setDescription("Role")
            .setRequired(true)))
    .addSubcommand(s =>
      s.setName("info")
        .setDescription("Role information")
        .addRoleOption(o =>
          o.setName("role")
            .setDescription("Role")
            .setRequired(true))),

  new SlashCommandBuilder()
    .setName("roles")
    .setDescription("List server roles"),

  new SlashCommandBuilder()
    .setName("nick")
    .setDescription("Change a member nickname")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("Member")
        .setRequired(true))
    .addStringOption(o =>
      o.setName("nickname")
        .setDescription("Nickname")
        .setRequired(true)),

  /* SERVER */

  new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Server information"),

  new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("User information")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("User")),

  new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Show avatar")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("User")),

  /* WELCOME */

  new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Configure JRC welcome and goodbye"),

  /* LOGS */

  new SlashCommandBuilder()
    .setName("logs")
    .setDescription("Logging configuration")
    .addSubcommand(s =>
      s.setName("channel")
        .setDescription("Select logging channel"))
    .addSubcommand(s =>
      s.setName("enable")
        .setDescription("Enable logging"))
    .addSubcommand(s =>
      s.setName("disable")
        .setDescription("Disable logging")),

  /* SECURITY */

  new SlashCommandBuilder()
    .setName("security")
    .setDescription("Security panel"),

  new SlashCommandBuilder()
    .setName("lockdown")
    .setDescription("Lock all text channels"),

  /* EMBEDS */

  new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Send an embed")
    .addStringOption(o =>
      o.setName("title")
        .setDescription("Title")
        .setRequired(true))
    .addStringOption(o =>
      o.setName("description")
        .setDescription("Description")
        .setRequired(true))
    .addStringOption(o =>
      o.setName("color")
        .setDescription("Color"))
    .addStringOption(o =>
      o.setName("image")
        .setDescription("Image URL"))
    .addStringOption(o =>
      o.setName("thumbnail")
        .setDescription("Thumbnail URL"))
    .addStringOption(o =>
      o.setName("footer")
        .setDescription("Footer")),

  new SlashCommandBuilder()
    .setName("say")
    .setDescription("Send a message")
    .addStringOption(o =>
      o.setName("message")
        .setDescription("Message")
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check bot latency"),

  new SlashCommandBuilder()
    .setName("botinfo")
    .setDescription("Bot information"),

  /* FUN */

  new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("Ask the magic 8ball")
    .addStringOption(o =>
      o.setName("question")
        .setDescription("Question")
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Flip a coin"),

  new SlashCommandBuilder()
    .setName("roll")
    .setDescription("Roll a number")
    .addIntegerOption(o =>
      o.setName("sides")
        .setDescription("Number of sides")
        .setMinValue(2)
        .setMaxValue(100000)
        .setRequired(false)),

  new SlashCommandBuilder()
    .setName("choose")
    .setDescription("Choose between options")
    .addStringOption(o =>
      o.setName("choices")
        .setDescription("Separate choices with commas")
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName("dice")
    .setDescription("Roll dice")
    .addStringOption(o =>
      o.setName("dice")
        .setDescription("Example: 2d6")
        .setRequired(true)),

  /* BOT */

  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show JRC commands"),

  new SlashCommandBuilder()
    .setName("about")
    .setDescription("About JRC"),

  new SlashCommandBuilder()
    .setName("uptime")
    .setDescription("Show bot uptime")
].map(c => c.toJSON());

/* =========================================================
   COMMAND DEPLOY
   ========================================================= */

async function deployCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    console.log("🔄 Registering JRC slash commands...");

    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );

    console.log("✅ JRC commands registered.");
  } catch (err) {
    console.error("❌ Command registration failed:", err);
  }
}

/* =========================================================
   PERMISSIONS
   ========================================================= */

function hasPermission(interaction, permission) {
  return interaction.memberPermissions?.has(permission);
}

/* =========================================================
   DURATION
   ========================================================= */

function parseDuration(input) {
  const match = /^(\d+)\s*(s|m|h|d)$/i.exec(input);

  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };

  return amount * multipliers[unit];
}

/* =========================================================
   LOGGING
   ========================================================= */

async function sendLog(guild, title, description, color = JRC_COLOR) {
  const settings = getGuild(guild.id);

  if (!settings.logs.enabled || !settings.logs.channel) {
    return;
  }

  const channel = guild.channels.cache.get(
    settings.logs.channel
  );

  if (!channel || !channel.isTextBased()) {
    return;
  }

  try {
    await channel.send({
      embeds: [
        embed(title, description, color)
      ]
    });
  } catch {}
}

/* =========================================================
   READY
   ========================================================= */

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  client.user.setPresence({
    activities: [
      {
        name: "/help • JRC",
        type: ActivityType.Watching
      }
    ],
    status: "online"
  });

  await deployCommands();
});

/* =========================================================
   WELCOME
   ========================================================= */

client.on("guildMemberAdd", async member => {
  const settings = getGuild(member.guild.id);

  if (settings.welcome.enabled && settings.welcome.channel) {
    const channel = member.guild.channels.cache.get(
      settings.welcome.channel
    );

    if (channel?.isTextBased()) {
      try {
        await channel.send({
          embeds: [
            buildGreeting(
              member.guild,
              member,
              "welcome"
            )
          ]
        });
      } catch {}
    }
  }

  await sendLog(
    member.guild,
    "Member Joined",
    `👋 ${member.user.tag} joined the server.`
  );
});

/* =========================================================
   GOODBYE
   ========================================================= */

client.on("guildMemberRemove", async member => {
  const settings = getGuild(member.guild.id);

  if (settings.goodbye.enabled && settings.goodbye.channel) {
    const channel = member.guild.channels.cache.get(
      settings.goodbye.channel
    );

    if (channel?.isTextBased()) {
      try {
        await channel.send({
          embeds: [
            buildGreeting(
              member.guild,
              member,
              "goodbye"
            )
          ]
        });
      } catch {}
    }
  }

  await sendLog(
    member.guild,
    "Member Left",
    `🚪 ${member.user.tag} left the server.`
  );
});

/* =========================================================
   MESSAGE DELETE
   ========================================================= */

client.on("messageDelete", async message => {
  if (!message.guild || message.author?.bot) return;

  await sendLog(
    message.guild,
    "Message Deleted",
    `👤 **Author:** ${message.author?.tag || "Unknown"}\n` +
    `📍 **Channel:** ${message.channel}\n` +
    `💬 **Content:** ${
      message.content
        ? message.content.slice(0, 1000)
        : "Unavailable"
    }`,
    "#ED4245"
  );
});

/* =========================================================
   MESSAGE EDIT
   ========================================================= */

client.on("messageUpdate", async (oldMessage, newMessage) => {
  if (!newMessage.guild) return;
  if (newMessage.author?.bot) return;

  if (oldMessage.content === newMessage.content) return;

  await sendLog(
    newMessage.guild,
    "Message Edited",
    `👤 **Author:** ${newMessage.author?.tag || "Unknown"}\n` +
    `📍 **Channel:** ${newMessage.channel}\n\n` +
    `**Before:** ${oldMessage.content || "Unavailable"}\n` +
    `**After:** ${newMessage.content || "Unavailable"}`
  );
});

/* =========================================================
   INTERACTIONS
   ========================================================= */

client.on("interactionCreate", async interaction => {
  try {

    /* =====================================================
       BUTTONS
       ===================================================== */

    if (interaction.isButton()) {

      /* SETUP */

      if (
        interaction.customId === "jrc_setup_w_toggle" ||
        interaction.customId === "jrc_setup_g_toggle"
      ) {
        if (!hasPermission(
          interaction,
          PermissionFlagsBits.ManageGuild
        )) {
          return interaction.reply({
            embeds: [
              errorEmbed(
                "You need **Manage Server** permission."
              )
            ],
            ephemeral: true
          });
        }

        const type =
          interaction.customId.includes("_w_")
            ? "welcome"
            : "goodbye";

        const settings = getGuild(interaction.guild.id);

        settings[type].enabled =
          !settings[type].enabled;

        saveDB();

        return interaction.update(
          setupPanel(interaction.guild)
        );
      }

      /* CONFIGURE */

      if (
        interaction.customId === "jrc_setup_w_config" ||
        interaction.customId === "jrc_setup_g_config"
      ) {
        if (!hasPermission(
          interaction,
          PermissionFlagsBits.ManageGuild
        )) {
          return interaction.reply({
            embeds: [
              errorEmbed(
                "You need **Manage Server** permission."
              )
            ],
            ephemeral: true
          });
        }

        const type =
          interaction.customId.includes("_w_")
            ? "welcome"
            : "goodbye";

        global.guildForModal = interaction.guild.id;

        return interaction.showModal(
          configModal(type)
        );
      }

      /* CHANNEL */

      if (
        interaction.customId === "jrc_setup_w_channel" ||
        interaction.customId === "jrc_setup_g_channel"
      ) {
        const type =
          interaction.customId.includes("_w_")
            ? "welcome"
            : "goodbye";

        const menu = new ChannelSelectMenuBuilder()
          .setCustomId(
            `jrc_channel_select_${type}`
          )
          .setPlaceholder(
            `Select ${type} channel...`
          )
          .setChannelTypes(
            ChannelType.GuildText,
            ChannelType.GuildAnnouncement
          );

        return interaction.reply({
          embeds: [
            embed(
              `${type === "welcome" ? "👋" : "🚪"} Select Channel`,
              `Choose the channel where the ${type} message will be sent.`
            )
          ],
          components: [
            new ActionRowBuilder().addComponents(menu)
          ],
          ephemeral: true
        });
      }

      /* PREVIEW */

      if (
        interaction.customId === "jrc_setup_w_preview" ||
        interaction.customId === "jrc_setup_g_preview"
      ) {
        const type =
          interaction.customId.includes("_w_")
            ? "welcome"
            : "goodbye";

        const fakeMember =
          interaction.member;

        return interaction.reply({
          embeds: [
            buildGreeting(
              interaction.guild,
              fakeMember,
              type
            )
          ],
          ephemeral: true
        });
      }

      /* TEST */

      if (
        interaction.customId === "jrc_setup_w_test" ||
        interaction.customId === "jrc_setup_g_test"
      ) {
        const type =
          interaction.customId.includes("_w_")
            ? "welcome"
            : "goodbye";

        const settings =
          getGuild(interaction.guild.id)[type];

        if (!settings.channel) {
          return interaction.reply({
            embeds: [
              errorEmbed(
                `No ${type} channel has been configured yet.`
              )
            ],
            ephemeral: true
          });
        }

        const channel =
          interaction.guild.channels.cache.get(
            settings.channel
          );

        if (!channel?.isTextBased()) {
          return interaction.reply({
            embeds: [
              errorEmbed(
                "The configured channel no longer exists."
              )
            ],
            ephemeral: true
          });
        }

        await channel.send({
          embeds: [
            buildGreeting(
              interaction.guild,
              interaction.member,
              type
            )
          ]
        });

        return interaction.reply({
          embeds: [
            successEmbed(
              `Test ${type} message sent to ${channel}.`
            )
          ],
          ephemeral: true
        });
      }

      /* RESET */

      if (
        interaction.customId === "jrc_setup_w_reset" ||
        interaction.customId === "jrc_setup_g_reset"
      ) {
        const type =
          interaction.customId.includes("_w_")
            ? "welcome"
            : "goodbye";

        const settings = getGuild(
          interaction.guild.id
        );

        settings[type] = {
          enabled: false,
          channel: null,
          title:
            type === "welcome"
              ? "Welcome!"
              : "Goodbye!",
          message:
            type === "welcome"
              ? "Welcome {user} to {server}!"
              : "{user} has left {server}.",
          color: JRC_COLOR,
          url: "",
          image: "",
          thumbnail: "",
          footer: "JRC",
          timestamp: true
        };

        saveDB();

        return interaction.update(
          setupPanel(interaction.guild)
        );
      }

      /* SECURITY BUTTONS */

      if (interaction.customId === "jrc_sec_lock") {
        if (!hasPermission(
          interaction,
          PermissionFlagsBits.ManageChannels
        )) {
          return interaction.reply({
            embeds: [
              errorEmbed(
                "You need **Manage Channels** permission."
              )
            ],
            ephemeral: true
          });
        }

        await interaction.channel.permissionOverwrites.edit(
          interaction.guild.roles.everyone,
          {
            SendMessages: false
          }
        );

        return interaction.reply({
          embeds: [
            successEmbed(
              "This channel has been locked."
            )
          ]
        });
      }

      if (interaction.customId === "jrc_sec_unlock") {
        if (!hasPermission(
          interaction,
          PermissionFlagsBits.ManageChannels
        )) {
          return interaction.reply({
            embeds: [
              errorEmbed(
                "You need **Manage Channels** permission."
              )
            ],
            ephemeral: true
          });
        }

        await interaction.channel.permissionOverwrites.edit(
          interaction.guild.roles.everyone,
          {
            SendMessages: null
          }
        );

        return interaction.reply({
          embeds: [
            successEmbed(
              "This channel has been unlocked."
            )
          ]
        });
      }
    }

    /* =====================================================
       CHANNEL SELECT
       ===================================================== */

    if (interaction.isChannelSelectMenu()) {
      if (
        interaction.customId.startsWith(
          "jrc_channel_select_"
        )
      ) {
        const type =
          interaction.customId.endsWith("welcome")
            ? "welcome"
            : "goodbye";

        const channelId =
          interaction.values[0];

        const settings =
          getGuild(interaction.guild.id);

        settings[type].channel = channelId;

        saveDB();

        return interaction.update({
          embeds: [
            successEmbed(
              `${type} channel set to <#${channelId}>.`
            )
          ],
          components: []
        });
      }
    }

    /* =====================================================
       MODALS
       ===================================================== */

    if (interaction.isModalSubmit()) {

      /* MAIN CONFIG */

      if (
        interaction.customId ===
          "jrc_modal_config_welcome" ||
        interaction.customId ===
          "jrc_modal_config_goodbye"
      ) {
        const type =
          interaction.customId.includes("welcome")
            ? "welcome"
            : "goodbye";

        const settings =
          getGuild(interaction.guild.id)[type];

        const title =
          interaction.fields.getTextInputValue(
            "title"
          );

        const message =
          interaction.fields.getTextInputValue(
            "message"
          );

        const color =
          interaction.fields.getTextInputValue(
            "color"
          );

        const url =
          interaction.fields.getTextInputValue(
            "url"
          );

        const footer =
          interaction.fields.getTextInputValue(
            "footer"
          );

        if (title.trim()) {
          settings.title = title;
        }

        if (message.trim()) {
          settings.message = message;
        }

        if (color.trim()) {
          settings.color =
            parseColor(color);
        }

        settings.url = url.trim();
        settings.footer = footer.trim();

        saveDB();

        return interaction.reply({
          embeds: [
            successEmbed(
              `${type} configuration saved.`
            )
          ],
          ephemeral: true
        });
      }

      /* MEDIA CONFIG */

      if (
        interaction.customId ===
          "jrc_modal_media_welcome" ||
        interaction.customId ===
          "jrc_modal_media_goodbye"
      ) {
        const type =
          interaction.customId.includes("welcome")
            ? "welcome"
            : "goodbye";

        const settings =
          getGuild(interaction.guild.id)[type];

        settings.image =
          interaction.fields.getTextInputValue(
            "image"
          ).trim();

        settings.thumbnail =
          interaction.fields.getTextInputValue(
            "thumbnail"
          ).trim();

        const timestamp =
          interaction.fields.getTextInputValue(
            "timestamp"
          ).trim().toLowerCase();

        if (
          timestamp === "true" ||
          timestamp === "false"
        ) {
          settings.timestamp =
            timestamp === "true";
        }

        saveDB();

        return interaction.reply({
          embeds: [
            successEmbed(
              `${type} media configuration saved.`
            )
          ],
          ephemeral: true
        });
      }
    }

    /* =====================================================
       SLASH COMMANDS
       ===================================================== */

    if (!interaction.isChatInputCommand()) {
      return;
    }

    const { commandName } = interaction;

    /* =====================================================
       SETUP
       ===================================================== */

    if (commandName === "setup") {
      if (!hasPermission(
        interaction,
        PermissionFlagsBits.ManageGuild
      )) {
        return interaction.reply({
          embeds: [
            errorEmbed(
              "You need **Manage Server** permission."
            )
          ],
          ephemeral: true
        });
      }

      return interaction.reply(
        setupPanel(interaction.guild)
      );
    }

    /* =====================================================
       WARN
       ===================================================== */

    if (commandName === "warn") {
      if (!hasPermission(
        interaction,
        PermissionFlagsBits.ModerateMembers
      )) {
        return interaction.reply({
          embeds: [
            errorEmbed(
              "You need **Moderate Members** permission."
            )
          ],
          ephemeral: true
        });
      }

      const user =
        interaction.options.getUser("user");

      const reason =
        interaction.options.getString("reason") ||
        "No reason provided";

      const settings =
        getGuild(interaction.guild.id);

      if (!settings.warnings[user.id]) {
        settings.warnings[user.id] = [];
      }

      settings.warnings[user.id].push({
        reason,
        moderator: interaction.user.id,
        time: Date.now()
      });

      saveDB();

      await sendLog(
        interaction.guild,
        "Member Warned",
        `👤 ${user.tag}\n📝 ${reason}`,
        "#FEE75C"
      );

      return interaction.reply({
        embeds: [
          successEmbed(
            `${user} has been warned.\n**Reason:** ${reason}`
          )
        ]
      });
    }

    /* =====================================================
       WARNINGS
       ===================================================== */

    if (commandName === "warnings") {
      const user =
        interaction.options.getUser("user");

      const settings =
        getGuild(interaction.guild.id);

      const warnings =
        settings.warnings[user.id] || [];

      if (!warnings.length) {
        return interaction.reply({
          embeds: [
            embed(
              "Warnings",
              `${user} has no warnings.`
            )
          ]
        });
      }

      const text = warnings
        .map(
          (w, i) =>
            `**${i + 1}.** ${w.reason}\n` +
            `Moderator: <@${w.moderator}>`
        )
        .join("\n\n");

      return interaction.reply({
        embeds: [
          embed(
            `Warnings • ${user.tag}`,
            text
          )
        ]
      });
    }

    /* =====================================================
       CLEAR WARNINGS
       ===================================================== */

    if (commandName === "clearwarnings") {
      if (!hasPermission(
        interaction,
        PermissionFlagsBits.ModerateMembers
      )) {
        return interaction.reply({
          embeds: [
            errorEmbed(
              "You need **Moderate Members** permission."
            )
          ],
          ephemeral: true
        });
      }

      const user =
        interaction.options.getUser("user");

      const settings =
        getGuild(interaction.guild.id);

      settings.warnings[user.id] = [];

      saveDB();

      return interaction.reply({
        embeds: [
          successEmbed(
            `Cleared all warnings for ${user}.`
          )
        ]
      });
    }

    /* =====================================================
       TIMEOUT
       ===================================================== */

    if (commandName === "timeout") {
      if (!hasPermission(
        interaction,
        PermissionFlagsBits.ModerateMembers
      )) {
        return interaction.reply({
          embeds: [
            errorEmbed(
              "You need **Moderate Members** permission."
            )
          ],
          ephemeral: true
        });
      }

      const member =
        interaction.options.getMember("user");

      const duration =
        interaction.options.getString("duration");

      const reason =
        interaction.options.getString("reason") ||
        "No reason provided";

      const ms =
        parseDuration(duration);

      if (!ms || ms > 28 * 24 * 60 * 60 * 1000) {
        return interaction.reply({
          embeds: [
            errorEmbed(
              "Invalid duration. Use something like `10m`, `1h`, or `1d`. Maximum is 28 days."
            )
          ],
          ephemeral: true
        });
      }

      if (!member) {
        return interaction.reply({
          embeds: [
            errorEmbed("Member not found.")
          ],
          ephemeral: true
        });
      }

      await member.timeout(ms, reason);

      await sendLog(
        interaction.guild,
        "Member Timed Out",
        `👤 ${member.user.tag}\n⏱️ ${duration}\n📝 ${reason}`
      );

      return interaction.reply({
        embeds: [
          successEmbed(
            `${member} has been timed out for **${duration}**.\n**Reason:** ${reason}`
          )
        ]
      });
    }

    /* =====================================================
       UNTIMEOUT
       ===================================================== */

    if (commandName === "untimeout") {
      if (!hasPermission(
        interaction,
        PermissionFlagsBits.ModerateMembers
      )) {
        return interaction.reply({
          embeds: [
            errorEmbed(
              "You need **Moderate Members** permission."
            )
          ],
          ephemeral: true
        });
      }

      const member =
        interaction.options.getMember("user");

      if (!member) {
        return interaction.reply({
          embeds: [
            errorEmbed("Member not found.")
          ],
          ephemeral: true
        });
      }

      await member.timeout(null);

      return interaction.reply({
        embeds: [
          successEmbed(
            `${member} is no longer timed out.`
          )
        ]
      });
    }

    /* =====================================================
       KICK
       ===================================================== */

    if (commandName === "kick") {
      if (!hasPermission(
        interaction,
        PermissionFlagsBits.KickMembers
      )) {
        return interaction.reply({
          embeds: [
            errorEmbed(
              "You need **Kick Members** permission."
            )
          ],
          ephemeral: true
        });
      }

      const member =
        interaction.options.getMember("user");

      const reason =
        interaction.options.getString("reason") ||
        "No reason provided";

      if (!member) {
        return interaction.reply({
          embeds: [
            errorEmbed("Member not found.")
          ],
          ephemeral: true
        });
      }

      await member.kick(reason);

      await sendLog(
        interaction.guild,
        "Member Kicked",
        `👤 ${member.user.tag}\n📝 ${reason}`,
        "#ED4245"
      );

      return interaction.reply({
        embeds: [
          successEmbed(
            `${member.user.tag} was kicked.\n**Reason:** ${reason}`
          )
        ]
      });
    }

    /* =====================================================
       BAN
       ===================================================== */

    if (commandName === "ban") {
      if (!hasPermission(
        interaction,
        PermissionFlagsBits.BanMembers
      )) {
        return interaction.reply({
          embeds: [
            errorEmbed(
              "You need **Ban Members** permission."
            )
          ],
          ephemeral: true
        });
      }

      const user =
        interaction.options.getUser("user");

      const reason =
        interaction.options.getString("reason") ||
        "No reason provided";

      await interaction.guild.members.ban(
        user.id,
        { reason }
      );

      await sendLog(
        interaction.guild,
        "Member Banned",
        `👤 ${user.tag}\n📝 ${reason}`,
        "#ED4245"
      );

      return interaction.reply({
        embeds: [
          successEmbed(
            `${user.tag} was banned.\n**Reason:** ${reason}`
          )
        ]
      });
    }

    /* =====================================================
       UNBAN
       ===================================================== */

    if (commandName === "unban") {
      if (!hasPermission(
        interaction,
        PermissionFlagsBits.BanMembers
      )) {
        return interaction.reply({
          embeds: [
            errorEmbed(
              "You need **Ban Members** permission."
            )
          ],
          ephemeral: true
        });
      }

      const id =
        interaction.options.getString("userid");

      await interaction.guild.members.unban(id);

      return interaction.reply({
        embeds: [
          successEmbed(
            `User \`${id}\` has been unbanned.`
          )
        ]
      });
    }

    /* =====================================================
       PURGE
       ===================================================== */

    if (commandName === "purge") {
      if (!hasPermission(
        interaction,
        PermissionFlagsBits.ManageMessages
      )) {
        return interaction.reply({
          embeds: [
            errorEmbed(
              "You need **Manage Messages** permission."
            )
          ],
          ephemeral: true
        });
      }

      const amount =
        interaction.options.getInteger("amount");

      const deleted =
        await interaction.channel.bulkDelete(
          amount,
          true
        );

      return interaction.reply({
        embeds: [
          successEmbed(
            `Deleted **${deleted.size}** messages.`
          )
        ],
        ephemeral: true
      });
    }

    /* =====================================================
       SLOWMODE
       ===================================================== */

    if (commandName === "slowmode") {
      if (!hasPermission(
        interaction,
        PermissionFlagsBits.ManageChannels
      )) {
        return interaction.reply({
          embeds: [
            errorEmbed(
              "You need **Manage Channels** permission."
            )
          ],
          ephemeral: true
        });
      }

      const seconds =
        interaction.options.getInteger("seconds");

      await interaction.channel.setRateLimitPerUser(
        seconds
      );

      return interaction.reply({
        embeds: [
          successEmbed(
            seconds === 0
              ? "Slowmode disabled."
              : `Slowmode set to **${seconds} seconds**.`
          )
        ]
      });
    }

    /* =====================================================
       LOCK
       ===================================================== */

    if (commandName === "lock") {
      if (!hasPermission(
        interaction,
        PermissionFlagsBits.ManageChannels
      )) {
        return interaction.reply({
          embeds: [
            errorEmbed(
              "You need **Manage Channels** permission."
            )
          ],
          ephemeral: true
        });
      }

      await interaction.channel.permissionOverwrites.edit(
        interaction.guild.roles.everyone,
        {
          SendMessages: false
        }
      );

      await sendLog(
        interaction.guild,
        "Channel Locked",
        `${interaction.channel} was locked by ${interaction.user}.`
      );

      return interaction.reply({
        embeds: [
          successEmbed(
            "This channel is now locked."
          )
        ]
      });
    }

    /* =====================================================
       UNLOCK
       ===================================================== */

    if (commandName === "unlock") {
      if (!hasPermission(
        interaction,
        PermissionFlagsBits.ManageChannels
      )) {
        return interaction.reply({
          embeds: [
            errorEmbed(
              "You need **Manage Channels** permission."
            )
          ],
          ephemeral: true
        });
      }

      await interaction.channel.permissionOverwrites.edit(
        interaction.guild.roles.everyone,
        {
          SendMessages: null
        }
      );

      return interaction.reply({
        embeds: [
          successEmbed(
            "This channel is now unlocked."
          )
        ]
      });
    }

    /* =====================================================
       ROLE
       ===================================================== */

    if (commandName === "role") {
      if (!hasPermission(
        interaction,
        PermissionFlagsBits.ManageRoles
      )) {
        return interaction.reply({
          embeds: [
            errorEmbed(
              "You need **Manage Roles** permission."
            )
          ],
          ephemeral: true
        });
      }

      const sub =
        interaction.options.getSubcommand();

      if (sub === "add") {
        const member =
          interaction.options.getMember("user");

        const role =
          interaction.options.getRole("role");

        await member.roles.add(role);

        return interaction.reply({
          embeds: [
            successEmbed(
              `Added ${role} to ${member}.`
            )
          ]
        });
      }

      if (sub === "remove") {
        const member =
          interaction.options.getMember("user");

        const role =
          interaction.options.getRole("role");

        await member.roles.remove(role);

        return interaction.reply({
          embeds: [
            successEmbed(
              `Removed ${role} from ${member}.`
            )
          ]
        });
      }

      if (sub === "create") {
        const name =
          interaction.options.getString("name");

        const color =
          interaction.options.getString("color");

        const role =
          await interaction.guild.roles.create({
            name,
            color: parseColor(color)
          });

        return interaction.reply({
          embeds: [
            successEmbed(
              `Created ${role}.`
            )
          ]
        });
      }

      if (sub === "delete") {
        const role =
          interaction.options.getRole("role");

        await role.delete();

        return interaction.reply({
          embeds: [
            successEmbed(
              `Deleted **${role.name}**.`
            )
          ]
        });
      }

      if (sub === "info") {
        const role =
          interaction.options.getRole("role");

        return interaction.reply({
          embeds: [
            embed(
              `Role • ${role.name}`,
              `**ID:** \`${role.id}\`\n` +
              `**Members:** ${role.members.size}\n` +
              `**Position:** ${role.position}\n` +
              `**Mentionable:** ${role.mentionable}\n` +
              `**Hoisted:** ${role.hoist}`
            )
          ]
        });
      }
    }

    /* =====================================================
       ROLES
       ===================================================== */

    if (commandName === "roles") {
      const roles =
        interaction.guild.roles.cache
          .filter(r => r.id !== interaction.guild.id)
          .sort((a, b) => b.position - a.position)
          .map(r => `${r} — ${r.members.size}`)
          .slice(0, 50)
          .join("\n");

      return interaction.reply({
        embeds: [
          embed(
            "Server Roles",
            roles || "No roles found."
          )
        ]
      });
    }

    /* =====================================================
       NICK
       ===================================================== */

    if (commandName === "nick") {
      if (!hasPermission(
        interaction,
        PermissionFlagsBits.ManageNicknames
      )) {
        return interaction.reply({
          embeds: [
            errorEmbed(
              "You need **Manage Nicknames** permission."
            )
          ],
          ephemeral: true
        });
      }

      const member =
        interaction.options.getMember("user");

      const nickname =
        interaction.options.getString("nickname");

      await member.setNickname(nickname);

      return interaction.reply({
        embeds: [
          successEmbed(
            `Nickname changed to **${nickname}**.`
          )
        ]
      });
    }

    /* =====================================================
       SERVER INFO
       ===================================================== */

    if (commandName === "serverinfo") {
      const guild = interaction.guild;

      return interaction.reply({
        embeds: [
          embed(
            `Server • ${guild.name}`,
            `**Owner:** <@${guild.ownerId}>\n` +
            `**Members:** ${guild.memberCount}\n` +
            `**Channels:** ${guild.channels.cache.size}\n` +
            `**Roles:** ${guild.roles.cache.size}\n` +
            `**Created:** <t:${Math.floor(
              guild.createdTimestamp / 1000
            )}:F>`
          )
        ]
      });
    }

    /* =====================================================
       USER INFO
       ===================================================== */

    if (commandName === "userinfo") {
      const user =
        interaction.options.getUser("user") ||
        interaction.user;

      const member =
        interaction.guild.members.cache.get(
          user.id
        );

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(JRC_COLOR)
            .setTitle(`👤 ${user.tag}`)
            .setThumbnail(
              user.displayAvatarURL({
                size: 512
              })
            )
            .addFields(
              {
                name: "User ID",
                value: `\`${user.id}\``
              },
              {
                name: "Account Created",
                value:
                  `<t:${Math.floor(
                    user.createdTimestamp / 1000
                  )}:F>`
              },
              {
                name: "Joined Server",
                value: member
                  ? `<t:${Math.floor(
                      member.joinedTimestamp / 1000
                    )}:F>`
                  : "Unknown"
              }
            )
            .setFooter({ text: "JRC" })
        ]
      });
    }

    /* =====================================================
       AVATAR
       ===================================================== */

    if (commandName === "avatar") {
      const user =
        interaction.options.getUser("user") ||
        interaction.user;

      const url =
        user.displayAvatarURL({
          size: 4096,
          extension: "png"
        });

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(JRC_COLOR)
            .setTitle(`🖼️ ${user.tag}'s Avatar`)
            .setImage(url)
            .setURL(url)
            .setFooter({ text: "JRC" })
        ]
      });
    }

    /* =====================================================
       LOGS
       ===================================================== */

    if (commandName === "logs") {
      if (!hasPermission(
        interaction,
        PermissionFlagsBits.ManageGuild
      )) {
        return interaction.reply({
          embeds: [
            errorEmbed(
              "You need **Manage Server** permission."
            )
          ],
          ephemeral: true
        });
      }

      const sub =
        interaction.options.getSubcommand();

      const settings =
        getGuild(interaction.guild.id);

      if (sub === "enable") {
        settings.logs.enabled = true;
        saveDB();

        return interaction.reply({
          embeds: [
            successEmbed(
              "Logging enabled."
            )
          ]
        });
      }

      if (sub === "disable") {
        settings.logs.enabled = false;
        saveDB();

        return interaction.reply({
          embeds: [
            successEmbed(
              "Logging disabled."
            )
          ]
        });
      }

      if (sub === "channel") {
        const menu =
          new ChannelSelectMenuBuilder()
            .setCustomId("jrc_logs_channel")
            .setPlaceholder(
              "Select logging channel..."
            )
            .setChannelTypes(
              ChannelType.GuildText,
              ChannelType.GuildAnnouncement
            );

        return interaction.reply({
          embeds: [
            embed(
              "📋 Logging Channel",
              "Select the channel where JRC should send logs."
            )
          ],
          components: [
            new ActionRowBuilder()
              .addComponents(menu)
          ],
          ephemeral: true
        });
      }
    }

    /* =====================================================
       SECURITY
       ===================================================== */

    if (commandName === "security") {
      if (!hasPermission(
        interaction,
        PermissionFlagsBits.ManageChannels
      )) {
        return interaction.reply({
          embeds: [
            errorEmbed(
              "You need **Manage Channels** permission."
            )
          ],
          ephemeral: true
        });
      }

      const e = embed(
        "Security Center",
        "Quick security controls for this channel."
      );

      const row =
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("jrc_sec_lock")
            .setLabel("Lock")
            .setStyle(ButtonStyle.Danger),

          new ButtonBuilder()
            .setCustomId("jrc_sec_unlock")
            .setLabel("Unlock")
            .setStyle(ButtonStyle.Success)
        );

      return interaction.reply({
        embeds: [e],
        components: [row]
      });
    }

    /* =====================================================
       LOCKDOWN
       ===================================================== */

    if (commandName === "lockdown") {
      if (!hasPermission(
        interaction,
        PermissionFlagsBits.Administrator
      )) {
        return interaction.reply({
          embeds: [
            errorEmbed(
              "You need **Administrator** permission."
            )
          ],
          ephemeral: true
        });
      }

      await interaction.deferReply();

      let count = 0;

      for (const channel of interaction.guild.channels.cache.values()) {
        if (
          channel.type === ChannelType.GuildText ||
          channel.type === ChannelType.GuildAnnouncement
        ) {
          try {
            await channel.permissionOverwrites.edit(
              interaction.guild.roles.everyone,
              {
                SendMessages: false
              }
            );

            count++;
          } catch {}
        }
      }

      return interaction.editReply({
        embeds: [
          successEmbed(
            `Lockdown enabled on **${count}** channels.`
          )
        ]
      });
    }

    /* =====================================================
       EMBED
       ===================================================== */

    if (commandName === "embed") {
      if (!hasPermission(
        interaction,
        PermissionFlagsBits.ManageMessages
      )) {
        return interaction.reply({
          embeds: [
            errorEmbed(
              "You need **Manage Messages** permission."
            )
          ],
          ephemeral: true
        });
      }

      const e =
        new EmbedBuilder()
          .setColor(
            parseColor(
              interaction.options.getString("color")
            )
          )
          .setTitle(
            interaction.options.getString("title")
          )
          .setDescription(
            interaction.options.getString(
              "description"
            )
          );

      const image =
        interaction.options.getString("image");

      const thumbnail =
        interaction.options.getString(
          "thumbnail"
        );

      const footer =
        interaction.options.getString("footer");

      if (image) e.setImage(image);
      if (thumbnail) e.setThumbnail(thumbnail);
      if (footer) e.setFooter({ text: footer });

      return interaction.reply({
        embeds: [e]
      });
    }

    /* =====================================================
       SAY
       ===================================================== */

    if (commandName === "say") {
      if (!hasPermission(
        interaction,
        PermissionFlagsBits.ManageMessages
      )) {
        return interaction.reply({
          embeds: [
            errorEmbed(
              "You need **Manage Messages** permission."
            )
          ],
          ephemeral: true
        });
      }

      const message =
        interaction.options.getString("message");

      await interaction.channel.send(message);

      return interaction.reply({
        embeds: [
          successEmbed("Message sent.")
        ],
        ephemeral: true
      });
    }

    /* =====================================================
       PING
       ===================================================== */

    if (commandName === "ping") {
      return interaction.reply({
        embeds: [
          embed(
            "Pong!",
            `🏓 WebSocket: **${client.ws.ping}ms**`
          )
        ]
      });
    }

    /* =====================================================
       BOT INFO
       ===================================================== */

    if (commandName === "botinfo") {
      return interaction.reply({
        embeds: [
          embed(
            "JRC Bot",
            `🛡️ **JRC**\n` +
            `⚙️ Discord.js v14\n` +
            `🌐 Servers: **${client.guilds.cache.size}**\n` +
            `👥 Users: **${client.guilds.cache.reduce(
              (a, g) => a + g.memberCount,
              0
            )}**`
          )
        ]
      });
    }

    /* =====================================================
       8BALL
       ===================================================== */

    if (commandName === "8ball") {
      const answers = [
        "Yes.",
        "No.",
        "Definitely.",
        "Probably.",
        "Maybe.",
        "Ask again later.",
        "It is looking good.",
        "I wouldn't count on it."
      ];

      const answer =
        answers[
          Math.floor(
            Math.random() * answers.length
          )
        ];

      return interaction.reply({
        embeds: [
          embed(
            "🎱 Magic 8Ball",
            `**Question:** ${
              interaction.options.getString(
                "question"
              )
            }\n\n**Answer:** ${answer}`
          )
        ]
      });
    }

    /* =====================================================
       COINFLIP
       ===================================================== */

    if (commandName === "coinflip") {
      const result =
        Math.random() < 0.5
          ? "Heads"
          : "Tails";

      return interaction.reply({
        embeds: [
          embed(
            "🪙 Coinflip",
            `The coin landed on **${result}**.`
          )
        ]
      });
    }

    /* =====================================================
       ROLL
       ===================================================== */

    if (commandName === "roll") {
      const sides =
        interaction.options.getInteger(
          "sides"
        ) || 6;

      const result =
        Math.floor(
          Math.random() * sides
        ) + 1;

      return interaction.reply({
        embeds: [
          embed(
            "🎲 Roll",
            `You rolled **${result}** on a **d${sides}**.`
          )
        ]
      });
    }

    /* =====================================================
       CHOOSE
       ===================================================== */

    if (commandName === "choose") {
      const choices =
        interaction.options
          .getString("choices")
          .split(",")
          .map(x => x.trim())
          .filter(Boolean);

      if (choices.length < 2) {
        return interaction.reply({
          embeds: [
            errorEmbed(
              "Give me at least two choices separated by commas."
            )
          ],
          ephemeral: true
        });
      }

      const choice =
        choices[
          Math.floor(
            Math.random() * choices.length
          )
        ];

      return interaction.reply({
        embeds: [
          embed(
            "🤔 Choose",
            `I choose **${choice}**.`
          )
        ]
      });
    }

    /* =====================================================
       DICE
       ===================================================== */

    if (commandName === "dice") {
      const input =
        interaction.options.getString("dice");

      const match =
        /^(\d+)d(\d+)$/i.exec(input);

      if (!match) {
        return interaction.reply({
          embeds: [
            errorEmbed(
              "Use dice notation like `2d6` or `1d20`."
            )
          ],
          ephemeral: true
        });
      }

      const count =
        Number(match[1]);

      const sides =
        Number(match[2]);

      if (
        count < 1 ||
        count > 100 ||
        sides < 2 ||
        sides > 1000
      ) {
        return interaction.reply({
          embeds: [
            errorEmbed(
              "Dice limits: 1-100 dice and 2-1000 sides."
            )
          ],
          ephemeral: true
        });
      }

      const rolls = [];

      for (let i = 0; i < count; i++) {
        rolls.push(
          Math.floor(
            Math.random() * sides
          ) + 1
        );
      }

      const total =
        rolls.reduce(
          (a, b) => a + b,
          0
        );

      return interaction.reply({
        embeds: [
          embed(
            "🎲 Dice",
            `**Rolls:** ${rolls.join(", ")}\n` +
            `**Total:** ${total}`
          )
        ]
      });
    }

    /* =====================================================
       HELP
       ===================================================== */

    if (commandName === "help") {
      return interaction.reply({
        embeds: [
          embed(
            "JRC Commands",
            [
              "**🛡️ Moderation**",
              "`/warn` `/warnings` `/clearwarnings`",
              "`/timeout` `/untimeout` `/kick` `/ban` `/unban`",
              "`/purge` `/slowmode` `/lock` `/unlock`",
              "",
              "**👤 Roles**",
              "`/role` `/roles` `/nick`",
              "",
              "**👋 Welcome**",
              "`/setup`",
              "",
              "**📋 Logging**",
              "`/logs`",
              "",
              "**🔐 Security**",
              "`/security` `/lockdown`",
              "",
              "**🎨 Utility**",
              "`/embed` `/say` `/ping`",
              "`/serverinfo` `/userinfo` `/avatar` `/botinfo`",
              "",
              "**😂 Fun**",
              "`/8ball` `/coinflip` `/roll` `/choose` `/dice`",
              "",
              "**⚙️ Bot**",
              "`/help` `/about` `/uptime`"
            ].join("\n")
          )
        ]
      });
    }

    /* =====================================================
       ABOUT
       ===================================================== */

    if (commandName === "about") {
      return interaction.reply({
        embeds: [
          embed(
            "About JRC",
            "JRC is a multipurpose Discord management bot built around a clean interactive configuration system."
          )
        ]
      });
    }

    /* =====================================================
       UPTIME
       ===================================================== */

    if (commandName === "uptime") {
      const seconds =
        Math.floor(
          process.uptime()
        );

      const days =
        Math.floor(
          seconds / 86400
        );

      const hours =
        Math.floor(
          (seconds % 86400) / 3600
        );

      const minutes =
        Math.floor(
          (seconds % 3600) / 60
        );

      const secs =
        seconds % 60;

      return interaction.reply({
        embeds: [
          embed(
            "⏱️ Uptime",
            `${days}d ${hours}h ${minutes}m ${secs}s`
          )
        ]
      });
    }

  } catch (error) {
    console.error("Interaction error:", error);

    const response = {
      embeds: [
        errorEmbed(
          "An unexpected error occurred. Check the bot console."
        )
      ],
      ephemeral: true
    };

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(response);
      } else {
        await interaction.reply(response);
      }
    } catch {}
  }
});

/* =========================================================
   LOG CHANNEL SELECT
   ========================================================= */

client.on("interactionCreate", async interaction => {
  if (!interaction.isChannelSelectMenu()) return;

  if (interaction.customId !== "jrc_logs_channel") {
    return;
  }

  const channelId =
    interaction.values[0];

  const settings =
    getGuild(interaction.guild.id);

  settings.logs.channel =
    channelId;

  saveDB();

  return interaction.update({
    embeds: [
      successEmbed(
        `Logging channel set to <#${channelId}>.`
      )
    ],
    components: []
  });
});

/* =========================================================
   LOGIN
   ========================================================= */

client.login(TOKEN);
