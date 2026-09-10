require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
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
  ActivityType
} = require("discord.js");

const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember]
});

/* =========================
   DATABASE
========================= */

const DB = "./jrc-data.json";

let data = {};

function loadDB() {
  try {
    if (!fs.existsSync(DB)) {
      fs.writeFileSync(DB, JSON.stringify({}, null, 2));
    }

    data = JSON.parse(fs.readFileSync(DB, "utf8"));
  } catch {
    data = {};
  }
}

function saveDB() {
  try {
    fs.writeFileSync(DB, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Database save error:", err);
  }
}

function guildConfig(guildId) {
  if (!data[guildId]) {
    data[guildId] = {
      welcome: {
        enabled: false,
        channel: null,
        message: "Welcome {user} to **{server}**!",
        image: null,
        embed: true
      },
      goodbye: {
        enabled: false,
        channel: null,
        message: "Goodbye **{user}**. We'll miss you!",
        image: null,
        embed: true
      },
      logs: {
        enabled: false,
        channel: null
      },
      autorole: {
        enabled: false,
        role: null
      },
      roles: {},
      warnings: {}
    };

    saveDB();
  }

  return data[guildId];
}

/* =========================
   COLORS / EMBEDS
========================= */

const COLORS = {
  main: 0x5865f2,
  success: 0x57f287,
  danger: 0xed4245,
  warning: 0xfee75c,
  dark: 0x111318
};

function embed(title, description, color = COLORS.main) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description || "\u200b")
    .setTimestamp()
    .setFooter({
      text: "JRC • Premium"
    });
}

function errorEmbed(message) {
  return embed("❌ Something went wrong", message, COLORS.danger);
}

function successEmbed(message) {
  return embed("✓ JRC", message, COLORS.success);
}

/* =========================
   TEXT HELPERS
========================= */

function formatMessage(text, member, guild) {
  return text
    .replaceAll("{user}", `<@${member.id}>`)
    .replaceAll("{username}", member.user.username)
    .replaceAll("{server}", guild.name)
    .replaceAll("{membercount}", guild.memberCount.toString());
}

async function sendLog(guild, title, description, color = COLORS.main) {
  const cfg = guildConfig(guild.id);

  if (!cfg.logs.enabled || !cfg.logs.channel) return;

  const channel = guild.channels.cache.get(cfg.logs.channel);

  if (!channel) return;

  try {
    await channel.send({
      embeds: [embed(title, description, color)]
    });
  } catch {}
}

/* =========================
   COMMANDS
========================= */

const commands = [

  new SlashCommandBuilder()
    .setName("help")
    .setDescription("View JRC commands"),

  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check JRC latency"),

  new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("View a user's avatar")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("User")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("View user information")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("User")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("View server information"),

  new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Send a premium embed")
    .addStringOption(o =>
      o.setName("title")
        .setDescription("Embed title")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("message")
        .setDescription("Embed message")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o =>
      o.setName("user")
        .setDescription("Member")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("reason")
        .setDescription("Reason")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("View member warnings")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("Member")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("clearwarnings")
    .setDescription("Clear member warnings")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o =>
      o.setName("user")
        .setDescription("Member")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout a member")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o =>
      o.setName("user")
        .setDescription("Member")
        .setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName("minutes")
        .setDescription("Duration")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(40320)
    )
    .addStringOption(o =>
      o.setName("reason")
        .setDescription("Reason")
    ),

  new SlashCommandBuilder()
    .setName("untimeout")
    .setDescription("Remove a timeout")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o =>
      o.setName("user")
        .setDescription("Member")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(o =>
      o.setName("user")
        .setDescription("Member")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("reason")
        .setDescription("Reason")
    ),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(o =>
      o.setName("user")
        .setDescription("Member")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("reason")
        .setDescription("Reason")
    ),

  new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Delete messages")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(o =>
      o.setName("amount")
        .setDescription("1-100")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),

  new SlashCommandBuilder()
    .setName("lock")
    .setDescription("Lock the current channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  new SlashCommandBuilder()
    .setName("unlock")
    .setDescription("Unlock the current channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  new SlashCommandBuilder()
    .setName("slowmode")
    .setDescription("Set channel slowmode")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption(o =>
      o.setName("seconds")
        .setDescription("0-21600")
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(21600)
    ),

  new SlashCommandBuilder()
    .setName("role")
    .setDescription("Manage server roles")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
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
      s.setName("create")
        .setDescription("Create a role")
        .addStringOption(o =>
          o.setName("name")
            .setDescription("Role name")
            .setRequired(true)
        )
    ),

  new SlashCommandBuilder()
    .setName("config")
    .setDescription("Open the JRC configuration panel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName("testwelcome")
    .setDescription("Test the welcome message")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName("testgoodbye")
    .setDescription("Test the goodbye message")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

].map(x => x.toJSON());

/* =========================
   REGISTER
========================= */

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(
      process.env.CLIENT_ID,
      process.env.GUILD_ID
    ),
    { body: commands }
  );

  console.log("✓ JRC slash commands registered");
}

/* =========================
   CONFIG PANEL
========================= */

function configPanel(guild) {
  const cfg = guildConfig(guild.id);

  const w = cfg.welcome.enabled ? "🟢 Enabled" : "🔴 Disabled";
  const g = cfg.goodbye.enabled ? "🟢 Enabled" : "🔴 Disabled";
  const l = cfg.logs.enabled ? "🟢 Enabled" : "🔴 Disabled";
  const a = cfg.autorole.enabled ? "🟢 Enabled" : "🔴 Disabled";

  const panel = embed(
    "⚙️ JRC CONFIGURATION",
    `Welcome: **${w}**
Goodbye: **${g}**
Mod Logs: **${l}**
Autorole: **${a}**

Use the buttons below to configure JRC.

**Premium Features**
> Interactive configuration
> Persistent settings
> Custom embeds
> GIF/image support
> Moderation logging`,
    COLORS.main
  );

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("cfg_welcome")
      .setLabel("Welcome")
      .setEmoji("👋")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("cfg_goodbye")
      .setLabel("Goodbye")
      .setEmoji("🚪")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("cfg_logs")
      .setLabel("Mod Logs")
      .setEmoji("📋")
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("cfg_autorole")
      .setLabel("Autorole")
      .setEmoji("🎭")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("cfg_refresh")
      .setLabel("Refresh")
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    embeds: [panel],
    components: [row1, row2]
  };
}

/* =========================
   CLIENT READY
========================= */

client.once("ready", async () => {
  console.log(`
╔══════════════════════════════╗
║       JRC PREMIUM 2.0       ║
║          ONLINE              ║
╚══════════════════════════════╝
  `);

  client.user.setPresence({
    activities: [
      {
        name: "JRC • /help",
        type: ActivityType.Watching
      }
    ],
    status: "online"
  });

  try {
    await registerCommands();
  } catch (err) {
    console.error("Command registration failed:", err);
  }
});

/* =========================
   MEMBER JOIN
========================= */

client.on("guildMemberAdd", async member => {
  const cfg = guildConfig(member.guild.id);

  if (cfg.autorole.enabled && cfg.autorole.role) {
    const role = member.guild.roles.cache.get(cfg.autorole.role);

    if (role && role.position < member.guild.members.me.roles.highest.position) {
      try {
        await member.roles.add(role);
      } catch {}
    }
  }

  if (!cfg.welcome.enabled || !cfg.welcome.channel) return;

  const channel = member.guild.channels.cache.get(cfg.welcome.channel);

  if (!channel) return;

  const message = formatMessage(
    cfg.welcome.message,
    member,
    member.guild
  );

  const e = embed(
    "👋 Welcome!",
    message,
    COLORS.success
  )
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }));

  if (cfg.welcome.image) {
    e.setImage(cfg.welcome.image);
  }

  try {
    await channel.send({
      content: cfg.welcome.embed ? null : message,
      embeds: cfg.welcome.embed ? [e] : []
    });
  } catch {}

  await sendLog(
    member.guild,
    "📥 Member Joined",
    `${member} joined the server.`,
    COLORS.success
  );
});

/* =========================
   MEMBER LEAVE
========================= */

client.on("guildMemberRemove", async member => {
  const cfg = guildConfig(member.guild.id);

  if (cfg.goodbye.enabled && cfg.goodbye.channel) {
    const channel = member.guild.channels.cache.get(cfg.goodbye.channel);

    if (channel) {
      const message = formatMessage(
        cfg.goodbye.message,
        member,
        member.guild
      );

      const e = embed(
        "🚪 Goodbye",
        message,
        COLORS.warning
      )
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }));

      if (cfg.goodbye.image) {
        e.setImage(cfg.goodbye.image);
      }

      try {
        await channel.send({
          content: cfg.goodbye.embed ? null : message,
          embeds: cfg.goodbye.embed ? [e] : []
        });
      } catch {}
    }
  }

  await sendLog(
    member.guild,
    "📤 Member Left",
    `**${member.user.tag}** left the server.`,
    COLORS.warning
  );
});

/* =========================
   MESSAGE LOGS
========================= */

client.on("messageDelete", async message => {
  if (!message.guild || message.author?.bot) return;

  await sendLog(
    message.guild,
    "🗑️ Message Deleted",
    `A message by **${message.author?.tag || "Unknown"}** was deleted in ${message.channel}.`,
    COLORS.danger
  );
});

client.on("messageUpdate", async (oldMessage, newMessage) => {
  if (!oldMessage.guild || oldMessage.author?.bot) return;
  if (oldMessage.content === newMessage.content) return;

  await sendLog(
    oldMessage.guild,
    "✏️ Message Edited",
    `A message by **${oldMessage.author?.tag || "Unknown"}** was edited in ${oldMessage.channel}.`,
    COLORS.warning
  );
});

/* =========================
   INTERACTIONS
========================= */

client.on("interactionCreate", async interaction => {

  try {

    /* ---------- BUTTONS ---------- */

    if (interaction.isButton()) {

      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
          embeds: [errorEmbed("You need **Manage Server** permission.")],
          ephemeral: true
        });
      }

      const cfg = guildConfig(interaction.guild.id);

      if (interaction.customId === "cfg_refresh") {
        return interaction.update(configPanel(interaction.guild));
      }

      if (interaction.customId === "cfg_welcome") {

        const channelMenu = new ChannelSelectMenuBuilder()
          .setCustomId("welcome_channel")
          .setPlaceholder("Select the welcome channel")
          .setChannelTypes(ChannelType.GuildText);

        const buttons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("welcome_toggle")
            .setLabel(cfg.welcome.enabled ? "Disable" : "Enable")
            .setEmoji(cfg.welcome.enabled ? "🔴" : "🟢")
            .setStyle(
              cfg.welcome.enabled
                ? ButtonStyle.Danger
                : ButtonStyle.Success
            ),

          new ButtonBuilder()
            .setCustomId("welcome_message")
            .setLabel("Message")
            .setEmoji("✏️")
            .setStyle(ButtonStyle.Primary),

          new ButtonBuilder()
            .setCustomId("welcome_image")
            .setLabel("GIF / Image")
            .setEmoji("🎞️")
            .setStyle(ButtonStyle.Secondary),

          new ButtonBuilder()
            .setCustomId("welcome_test")
            .setLabel("Test")
            .setEmoji("🧪")
            .setStyle(ButtonStyle.Secondary)
        );

        return interaction.update({
          embeds: [
            embed(
              "👋 WELCOME CONFIGURATION",
              `Status: **${cfg.welcome.enabled ? "Enabled" : "Disabled"}**
Channel: ${cfg.welcome.channel ? `<#${cfg.welcome.channel}>` : "**Not set**"}

Current message:
> ${cfg.welcome.message}

Image/GIF:
${cfg.welcome.image || "**None**"}`,
              COLORS.success
            )
          ],
          components: [
            new ActionRowBuilder().addComponents(channelMenu),
            buttons,
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("cfg_home")
                .setLabel("Back")
                .setEmoji("◀️")
                .setStyle(ButtonStyle.Secondary)
            )
          ]
        });
      }

      if (interaction.customId === "cfg_goodbye") {

        const channelMenu = new ChannelSelectMenuBuilder()
          .setCustomId("goodbye_channel")
          .setPlaceholder("Select the goodbye channel")
          .setChannelTypes(ChannelType.GuildText);

        const buttons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("goodbye_toggle")
            .setLabel(cfg.goodbye.enabled ? "Disable" : "Enable")
            .setEmoji(cfg.goodbye.enabled ? "🔴" : "🟢")
            .setStyle(
              cfg.goodbye.enabled
                ? ButtonStyle.Danger
                : ButtonStyle.Success
            ),

          new ButtonBuilder()
            .setCustomId("goodbye_message")
            .setLabel("Message")
            .setEmoji("✏️")
            .setStyle(ButtonStyle.Primary),

          new ButtonBuilder()
            .setCustomId("goodbye_image")
            .setLabel("GIF / Image")
            .setEmoji("🎞️")
            .setStyle(ButtonStyle.Secondary),

          new ButtonBuilder()
            .setCustomId("goodbye_test")
            .setLabel("Test")
            .setEmoji("🧪")
            .setStyle(ButtonStyle.Secondary)
        );

        return interaction.update({
          embeds: [
            embed(
              "🚪 GOODBYE CONFIGURATION",
              `Status: **${cfg.goodbye.enabled ? "Enabled" : "Disabled"}**
Channel: ${cfg.goodbye.channel ? `<#${cfg.goodbye.channel}>` : "**Not set**"}

Current message:
> ${cfg.goodbye.message}

Image/GIF:
${cfg.goodbye.image || "**None**"}`,
              COLORS.warning
            )
          ],
          components: [
            new ActionRowBuilder().addComponents(channelMenu),
            buttons,
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("cfg_home")
                .setLabel("Back")
                .setEmoji("◀️")
                .setStyle(ButtonStyle.Secondary)
            )
          ]
        });
      }

      if (interaction.customId === "cfg_logs") {

        const menu = new ChannelSelectMenuBuilder()
          .setCustomId("logs_channel")
          .setPlaceholder("Select the mod-log channel")
          .setChannelTypes(ChannelType.GuildText);

        return interaction.update({
          embeds: [
            embed(
              "📋 MOD LOG CONFIGURATION",
              `Status: **${cfg.logs.enabled ? "Enabled" : "Disabled"}**
Channel: ${cfg.logs.channel ? `<#${cfg.logs.channel}>` : "**Not set**"}

JRC will log:
• Member joins/leaves
• Message deletions
• Message edits
• Moderation actions`,
              COLORS.main
            )
          ],
          components: [
            new ActionRowBuilder().addComponents(menu),
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("logs_toggle")
                .setLabel(cfg.logs.enabled ? "Disable Logs" : "Enable Logs")
                .setEmoji("📋")
                .setStyle(
                  cfg.logs.enabled
                    ? ButtonStyle.Danger
                    : ButtonStyle.Success
                ),

              new ButtonBuilder()
                .setCustomId("cfg_home")
                .setLabel("Back")
                .setEmoji("◀️")
                .setStyle(ButtonStyle.Secondary)
            )
          ]
        });
      }

      if (interaction.customId === "cfg_autorole") {

        const roles = interaction.guild.roles.cache
          .filter(r => r.id !== interaction.guild.id)
          .sort((a, b) => b.position - a.position)
          .first(25);

        const options = roles.map(r => ({
          label: r.name.slice(0, 100),
          value: r.id
        }));

        const menu = new StringSelectMenuBuilder()
          .setCustomId("autorole_select")
          .setPlaceholder("Select an autorole")
          .addOptions(options);

        return interaction.update({
          embeds: [
            embed(
              "🎭 AUTOROLE",
              `Status: **${cfg.autorole.enabled ? "Enabled" : "Disabled"}**
Current role: ${
                cfg.autorole.role
                  ? `<@&${cfg.autorole.role}>`
                  : "**None**"
              }`,
              COLORS.main
            )
          ],
          components: [
            new ActionRowBuilder().addComponents(menu),
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("autorole_toggle")
                .setLabel(cfg.autorole.enabled ? "Disable" : "Enable")
                .setStyle(
                  cfg.autorole.enabled
                    ? ButtonStyle.Danger
                    : ButtonStyle.Success
                ),

              new ButtonBuilder()
                .setCustomId("cfg_home")
                .setLabel("Back")
                .setEmoji("◀️")
                .setStyle(ButtonStyle.Secondary)
            )
          ]
        });
      }

      if (interaction.customId === "cfg_home") {
        return interaction.update(configPanel(interaction.guild));
      }

      if (interaction.customId === "welcome_toggle") {
        cfg.welcome.enabled = !cfg.welcome.enabled;
        saveDB();
        return interaction.update(configPanel(interaction.guild));
      }

      if (interaction.customId === "goodbye_toggle") {
        cfg.goodbye.enabled = !cfg.goodbye.enabled;
        saveDB();
        return interaction.update(configPanel(interaction.guild));
      }

      if (interaction.customId === "logs_toggle") {
        cfg.logs.enabled = !cfg.logs.enabled;
        saveDB();
        return interaction.update(configPanel(interaction.guild));
      }

      if (interaction.customId === "autorole_toggle") {
        cfg.autorole.enabled = !cfg.autorole.enabled;
        saveDB();
        return interaction.update(configPanel(interaction.guild));
      }

      if (
        interaction.customId === "welcome_message" ||
        interaction.customId === "goodbye_message"
      ) {

        const type = interaction.customId.startsWith("welcome")
          ? "welcome"
          : "goodbye";

        const modal = new ModalBuilder()
          .setCustomId(`message_modal_${type}`)
          .setTitle(`${type === "welcome" ? "Welcome" : "Goodbye"} Message`);

        const input = new TextInputBuilder()
          .setCustomId("message")
          .setLabel("Message")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(1000)
          .setValue(cfg[type].message);

        modal.addComponents(
          new ActionRowBuilder().addComponents(input)
        );

        return interaction.showModal(modal);
      }

      if (
        interaction.customId === "welcome_image" ||
        interaction.customId === "goodbye_image"
      ) {

        const type = interaction.customId.startsWith("welcome")
          ? "welcome"
          : "goodbye";

        const modal = new ModalBuilder()
          .setCustomId(`image_modal_${type}`)
          .setTitle(`${type === "welcome" ? "Welcome" : "Goodbye"} GIF`);

        const input = new TextInputBuilder()
          .setCustomId("image")
          .setLabel("Direct GIF/Image URL")
          .setPlaceholder("https://...")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(1000)
          .setValue(cfg[type].image || "");

        modal.addComponents(
          new ActionRowBuilder().addComponents(input)
        );

        return interaction.showModal(modal);
      }

      if (
        interaction.customId === "welcome_test" ||
        interaction.customId === "goodbye_test"
      ) {

        const type = interaction.customId.startsWith("welcome")
          ? "welcome"
          : "goodbye";

        const c = cfg[type];

        const message = formatMessage(
          c.message,
          interaction.member,
          interaction.guild
        );

        const e = embed(
          type === "welcome" ? "👋 Welcome!" : "🚪 Goodbye",
          message,
          type === "welcome" ? COLORS.success : COLORS.warning
        );

        if (c.image) e.setImage(c.image);

        return interaction.reply({
          embeds: [e],
          ephemeral: true
        });
      }
    }

    /* ---------- CHANNEL SELECT ---------- */

    if (interaction.isChannelSelectMenu()) {

      const cfg = guildConfig(interaction.guild.id);

      if (interaction.customId === "welcome_channel") {
        cfg.welcome.channel = interaction.values[0];
        saveDB();

        return interaction.reply({
          embeds: [
            successEmbed(
              `Welcome channel set to <#${interaction.values[0]}>.`
            )
          ],
          ephemeral: true
        });
      }

      if (interaction.customId === "goodbye_channel") {
        cfg.goodbye.channel = interaction.values[0];
        saveDB();

        return interaction.reply({
          embeds: [
            successEmbed(
              `Goodbye channel set to <#${interaction.values[0]}>.`
            )
          ],
          ephemeral: true
        });
      }

      if (interaction.customId === "logs_channel") {
        cfg.logs.channel = interaction.values[0];
        saveDB();

        return interaction.reply({
          embeds: [
            successEmbed(
              `Mod-log channel set to <#${interaction.values[0]}>.`
            )
          ],
          ephemeral: true
        });
      }
    }

    /* ---------- ROLE SELECT ---------- */

    if (interaction.isStringSelectMenu()) {

      if (interaction.customId === "autorole_select") {

        const cfg = guildConfig(interaction.guild.id);

        cfg.autorole.role = interaction.values[0];

        saveDB();

        return interaction.reply({
          embeds: [
            successEmbed(
              `Autorole set to <@&${interaction.values[0]}>.`
            )
          ],
          ephemeral: true
        });
      }
    }

    /* ---------- MODALS ---------- */

    if (interaction.isModalSubmit()) {

      const cfg = guildConfig(interaction.guild.id);

      if (interaction.customId.startsWith("message_modal_")) {

        const type = interaction.customId.replace(
          "message_modal_",
          ""
        );

        cfg[type].message =
          interaction.fields.getTextInputValue("message");

        saveDB();

        return interaction.reply({
          embeds: [
            successEmbed(
              `${type === "welcome" ? "Welcome" : "Goodbye"} message updated.`
            )
          ],
          ephemeral: true
        });
      }

      if (interaction.customId.startsWith("image_modal_")) {

        const type = interaction.customId.replace(
          "image_modal_",
          ""
        );

        cfg[type].image =
          interaction.fields.getTextInputValue("image") || null;

        saveDB();

        return interaction.reply({
          embeds: [
            successEmbed(
              `${type === "welcome" ? "Welcome" : "Goodbye"} image/GIF updated.`
            )
          ],
          ephemeral: true
        });
      }
    }

    /* ---------- SLASH COMMANDS ---------- */

    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === "help") {

      return interaction.reply({
        embeds: [
          embed(
            "⚡ JRC PREMIUM",
            `**Administration**
\`/config\` • Configure JRC
\`/embed\` • Create an embed

**Moderation**
\`/warn\` • Warn
\`/warnings\` • View warnings
\`/clearwarnings\` • Clear warnings
\`/timeout\` • Timeout
\`/untimeout\` • Remove timeout
\`/kick\` • Kick
\`/ban\` • Ban
\`/purge\` • Delete messages
\`/lock\` • Lock channel
\`/unlock\` • Unlock channel
\`/slowmode\` • Slowmode

**Roles**
\`/role add\`
\`/role remove\`
\`/role create\`

**Utility**
\`/ping\`
\`/avatar\`
\`/userinfo\`
\`/serverinfo\`

**Testing**
\`/testwelcome\`
\`/testgoodbye\`

> JRC • clean, fast & premium`,
            COLORS.main
          )
        ]
      });
    }

    if (commandName === "ping") {

      return interaction.reply({
        embeds: [
          embed(
            "🏓 PONG",
            `Bot latency: **${client.ws.ping}ms**`,
            COLORS.success
          )
        ]
      });
    }

    if (commandName === "avatar") {

      const user =
        interaction.options.getUser("user") ||
        interaction.user;

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.main)
            .setTitle(`🖼️ ${user.username}'s Avatar`)
            .setImage(user.displayAvatarURL({ size: 1024 }))
            .setTimestamp()
            .setFooter({ text: "JRC • Premium" })
        ]
      });
    }

    if (commandName === "userinfo") {

      const user =
        interaction.options.getUser("user") ||
        interaction.user;

      const member =
        interaction.guild.members.cache.get(user.id);

      return interaction.reply({
        embeds: [
          embed(
            `👤 ${user.username}`,
            `**Username:** ${user.tag}
**ID:** \`${user.id}\`
**Joined Discord:** <t:${Math.floor(user.createdTimestamp / 1000)}:R>
**Joined Server:** ${
              member
                ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
                : "Unknown"
            }
**Roles:** ${
              member
                ? member.roles.cache.size - 1
                : 0
            }`,
            COLORS.main
          ).setThumbnail(user.displayAvatarURL({ size: 256 }))
        ]
      });
    }

    if (commandName === "serverinfo") {

      const g = interaction.guild;

      return interaction.reply({
        embeds: [
          embed(
            `🏠 ${g.name}`,
            `**Owner:** <@${g.ownerId}>
**Members:** ${g.memberCount}
**Channels:** ${g.channels.cache.size}
**Roles:** ${g.roles.cache.size - 1}
**Boost Level:** ${g.premiumTier}
**Boosts:** ${g.premiumSubscriptionCount || 0}
**Created:** <t:${Math.floor(g.createdTimestamp / 1000)}:D>`,
            COLORS.main
          ).setThumbnail(g.iconURL({ size: 256 }))
        ]
      });
    }

    if (commandName === "embed") {

      const title = interaction.options.getString("title");
      const message = interaction.options.getString("message");

      return interaction.reply({
        embeds: [
          embed(title, message, COLORS.main)
        ]
      });
    }

    if (commandName === "config") {
      return interaction.reply({
        ...configPanel(interaction.guild),
        ephemeral: true
      });
    }

    /* ---------- WARN ---------- */

    if (commandName === "warn") {

      const user = interaction.options.getUser("user");
      const reason =
        interaction.options.getString("reason") ||
        "No reason provided.";

      const member = await interaction.guild.members
        .fetch(user.id)
        .catch(() => null);

      if (!member) {
        return interaction.reply({
          embeds: [errorEmbed("That member isn't in this server.")],
          ephemeral: true
        });
      }

      if (
        member.id === interaction.guild.ownerId ||
        member.roles.highest.position >=
        interaction.member.roles.highest.position
      ) {
        return interaction.reply({
          embeds: [errorEmbed("You can't moderate this member.")],
          ephemeral: true
        });
      }

      const cfg = guildConfig(interaction.guild.id);

      if (!cfg.warnings[user.id]) {
        cfg.warnings[user.id] = [];
      }

      cfg.warnings[user.id].push({
        reason,
        moderator: interaction.user.id,
        timestamp: Date.now()
      });

      saveDB();

      await sendLog(
        interaction.guild,
        "⚠️ Member Warned",
        `${user} was warned by ${interaction.user}.\n**Reason:** ${reason}`,
        COLORS.warning
      );

      return interaction.reply({
        embeds: [
          successEmbed(
            `${user} has been warned.\n\n**Reason:** ${reason}`
          )
        ]
      });
    }

    /* ---------- WARNINGS ---------- */

    if (commandName === "warnings") {

      const user = interaction.options.getUser("user");
      const cfg = guildConfig(interaction.guild.id);
      const warnings = cfg.warnings[user.id] || [];

      if (!warnings.length) {
        return interaction.reply({
          embeds: [
            embed(
              "📋 Warnings",
              `${user} has no warnings.`,
              COLORS.success
            )
          ]
        });
      }

      const list = warnings
        .map(
          (w, i) =>
            `**${i + 1}.** ${w.reason}\n<@${w.moderator}> • <t:${Math.floor(w.timestamp / 1000)}:R>`
        )
        .join("\n\n");

      return interaction.reply({
        embeds: [
          embed(
            `📋 Warnings • ${user.username}`,
            list,
            COLORS.warning
          )
        ]
      });
    }

    /* ---------- CLEAR WARNINGS ---------- */

    if (commandName === "clearwarnings") {

      const user = interaction.options.getUser("user");
      const cfg = guildConfig(interaction.guild.id);

      cfg.warnings[user.id] = [];

      saveDB();

      await sendLog(
        interaction.guild,
        "🧹 Warnings Cleared",
        `Warnings for ${user} were cleared by ${interaction.user}.`,
        COLORS.success
      );

      return interaction.reply({
        embeds: [
          successEmbed(`Cleared all warnings for ${user}.`)
        ]
      });
    }

    /* ---------- TIMEOUT ---------- */

    if (commandName === "timeout") {

      const user = interaction.options.getUser("user");
      const minutes = interaction.options.getInteger("minutes");
      const reason =
        interaction.options.getString("reason") ||
        "No reason provided.";

      const member = await interaction.guild.members
        .fetch(user.id)
        .catch(() => null);

      if (!member) {
        return interaction.reply({
          embeds: [errorEmbed("Member not found.")],
          ephemeral: true
        });
      }

      if (!member.moderatable) {
        return interaction.reply({
          embeds: [errorEmbed("I can't moderate that member.")],
          ephemeral: true
        });
      }

      await member.timeout(minutes * 60 * 1000, reason);

      await sendLog(
        interaction.guild,
        "🔇 Member Timed Out",
        `${user} was timed out for **${minutes} minutes** by ${interaction.user}.\n**Reason:** ${reason}`,
        COLORS.warning
      );

      return interaction.reply({
        embeds: [
          successEmbed(
            `${user} has been timed out for **${minutes} minutes**.\n\n**Reason:** ${reason}`
          )
        ]
      });
    }

    /* ---------- UNTIMEOUT ---------- */

    if (commandName === "untimeout") {

      const user = interaction.options.getUser("user");
      const member = await interaction.guild.members
        .fetch(user.id)
        .catch(() => null);

      if (!member) {
        return interaction.reply({
          embeds: [errorEmbed("Member not found.")],
          ephemeral: true
        });
      }

      await member.timeout(null);

      return interaction.reply({
        embeds: [
          successEmbed(`${user} is no longer timed out.`)
        ]
      });
    }

    /* ---------- KICK ---------- */

    if (commandName === "kick") {

      const user = interaction.options.getUser("user");
      const reason =
        interaction.options.getString("reason") ||
        "No reason provided.";

      const member = await interaction.guild.members
        .fetch(user.id)
        .catch(() => null);

      if (!member || !member.kickable) {
        return interaction.reply({
          embeds: [errorEmbed("I can't kick that member.")],
          ephemeral: true
        });
      }

      await member.kick(reason);

      await sendLog(
        interaction.guild,
        "👢 Member Kicked",
        `${user} was kicked by ${interaction.user}.\n**Reason:** ${reason}`,
        COLORS.danger
      );

      return interaction.reply({
        embeds: [
          successEmbed(`${user} has been kicked.\n\n**Reason:** ${reason}`)
        ]
      });
    }

    /* ---------- BAN ---------- */

    if (commandName === "ban") {

      const user = interaction.options.getUser("user");
      const reason =
        interaction.options.getString("reason") ||
        "No reason provided.";

      const member = await interaction.guild.members
        .fetch(user.id)
        .catch(() => null);

      if (member && !member.bannable) {
        return interaction.reply({
          embeds: [errorEmbed("I can't ban that member.")],
          ephemeral: true
        });
      }

      await interaction.guild.members.ban(user.id, { reason });

      await sendLog(
        interaction.guild,
        "🔨 Member Banned",
        `${user} was banned by ${interaction.user}.\n**Reason:** ${reason}`,
        COLORS.danger
      );

      return interaction.reply({
        embeds: [
          successEmbed(`${user} has been banned.\n\n**Reason:** ${reason}`)
        ]
      });
    }

    /* ---------- PURGE ---------- */

    if (commandName === "purge") {

      const amount = interaction.options.getInteger("amount");

      const deleted = await interaction.channel.bulkDelete(
        amount,
        true
      );

      return interaction.reply({
        embeds: [
          successEmbed(`Deleted **${deleted.size}** messages.`)
        ],
        ephemeral: true
      });
    }

    /* ---------- LOCK ---------- */

    if (commandName === "lock") {

      await interaction.channel.permissionOverwrites.edit(
        interaction.guild.roles.everyone,
        { SendMessages: false }
      );

      await sendLog(
        interaction.guild,
        "🔒 Channel Locked",
        `${interaction.channel} was locked by ${interaction.user}.`,
        COLORS.warning
      );

      return interaction.reply({
        embeds: [
          successEmbed("🔒 This channel has been locked.")
        ]
      });
    }

    /* ---------- UNLOCK ---------- */

    if (commandName === "unlock") {

      await interaction.channel.permissionOverwrites.edit(
        interaction.guild.roles.everyone,
        { SendMessages: null }
      );

      return interaction.reply({
        embeds: [
          successEmbed("🔓 This channel has been unlocked.")
        ]
      });
    }

    /* ---------- SLOWMODE ---------- */

    if (commandName === "slowmode") {

      const seconds = interaction.options.getInteger("seconds");

      await interaction.channel.setRateLimitPerUser(seconds);

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

    /* ---------- ROLE ---------- */

    if (commandName === "role") {

      const sub = interaction.options.getSubcommand();

      if (sub === "add") {

        const user = interaction.options.getUser("user");
        const role = interaction.options.getRole("role");
        const member = await interaction.guild.members.fetch(user.id);

        if (role.position >= interaction.guild.members.me.roles.highest.position) {
          return interaction.reply({
            embeds: [errorEmbed("That role is higher than my highest role.")],
            ephemeral: true
          });
        }

        await member.roles.add(role);

        return interaction.reply({
          embeds: [
            successEmbed(`Added ${role} to ${user}.`)
          ]
        });
      }

      if (sub === "remove") {

        const user = interaction.options.getUser("user");
        const role = interaction.options.getRole("role");
        const member = await interaction.guild.members.fetch(user.id);

        await member.roles.remove(role);

        return interaction.reply({
          embeds: [
            successEmbed(`Removed ${role} from ${user}.`)
          ]
        });
      }

      if (sub === "create") {

        const name = interaction.options.getString("name");

        const role = await interaction.guild.roles.create({
          name,
          reason: `Created by ${interaction.user.tag}`
        });

        return interaction.reply({
          embeds: [
            successEmbed(`Created ${role}.`)
          ]
        });
      }
    }

    /* ---------- TEST WELCOME ---------- */

    if (commandName === "testwelcome") {

      const cfg = guildConfig(interaction.guild.id);

      const message = formatMessage(
        cfg.welcome.message,
        interaction.member,
        interaction.guild
      );

      const e = embed(
        "👋 Welcome!",
        message,
        COLORS.success
      ).setThumbnail(
        interaction.user.displayAvatarURL({ size: 256 })
      );

      if (cfg.welcome.image) {
        e.setImage(cfg.welcome.image);
      }

      return interaction.reply({
        embeds: [e]
      });
    }

    /* ---------- TEST GOODBYE ---------- */

    if (commandName === "testgoodbye") {

      const cfg = guildConfig(interaction.guild.id);

      const message = formatMessage(
        cfg.goodbye.message,
        interaction.member,
        interaction.guild
      );

      const e = embed(
        "🚪 Goodbye",
        message,
        COLORS.warning
      ).setThumbnail(
        interaction.user.displayAvatarURL({ size: 256 })
      );

      if (cfg.goodbye.image) {
        e.setImage(cfg.goodbye.image);
      }

      return interaction.reply({
        embeds: [e]
      });
    }

  } catch (err) {

    console.error("Interaction error:", err);

    const response = {
      embeds: [
        errorEmbed(
          "JRC encountered an error while processing that command."
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

/* =========================
   PROCESS SAFETY
========================= */

process.on("unhandledRejection", err => {
  console.error("Unhandled rejection:", err);
});

process.on("uncaughtException", err => {
  console.error("Uncaught exception:", err);
});

/* =========================
   START
========================= */

loadDB();

if (!process.env.TOKEN) {
  console.error("❌ TOKEN is missing from .env");
  process.exit(1);
}

if (!process.env.CLIENT_ID) {
  console.error("❌ CLIENT_ID is missing from .env");
  process.exit(1);
}

if (!process.env.GUILD_ID) {
  console.error("❌ GUILD_ID is missing from .env");
  process.exit(1);
}

client.login(process.env.TOKEN);
