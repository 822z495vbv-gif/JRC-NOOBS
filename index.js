const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  EmbedBuilder,
  SlashCommandBuilder,
  REST,
  Routes
} = require("discord.js");

const fs = require("fs");
const path = require("path");

// ============================================================
// JRC BOT v2
// Premium moderation / security / roles / logs / utility bot
// ============================================================

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN is missing.");
  process.exit(1);
}

// ============================================================
// DATABASE
// ============================================================

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "settings.json");

fs.mkdirSync(DATA_DIR, { recursive: true });

function loadDatabase() {
  try {
    if (!fs.existsSync(DATA_FILE)) return {};

    return JSON.parse(
      fs.readFileSync(DATA_FILE, "utf8")
    );
  } catch (error) {
    console.error("❌ Database load error:", error);
    return {};
  }
}

const db = loadDatabase();

function saveDatabase() {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(db, null, 2)
    );
  } catch (error) {
    console.error("❌ Database save error:", error);
  }
}

function getGuildSettings(guildId) {
  if (!db[guildId]) {
    db[guildId] = {
      welcome: {
        enabled: false,
        channelId: null,
        title: "WELCOME",
        message: "Welcome {user} to **{server}**!",
        color: "#5865F2",
        image: null
      },

      goodbye: {
        enabled: false,
        channelId: null,
        title: "GOODBYE",
        message: "Goodbye {user}. Take care!",
        color: "#5865F2",
        image: null
      },

      logs: {
        enabled: false,
        channelId: null
      },

      security: {
        antiInvite: false,
        antiSpam: false,
        verification: false
      },

      autorole: null,

      warnings: {}
    };

    saveDatabase();
  }

  return db[guildId];
}

// ============================================================
// COLORS
// ============================================================

const COLORS = {
  primary: 0x5865F2,
  success: 0x57F287,
  danger: 0xED4245,
  warning: 0xFEE75C,
  neutral: 0x2B2D31
};

function hexToInt(hex) {
  if (!hex) return COLORS.primary;

  const clean = String(hex).replace("#", "");
  const number = parseInt(clean, 16);

  return Number.isFinite(number)
    ? number
    : COLORS.primary;
}

// ============================================================
// EMBEDS
// ============================================================

function createEmbed(title, description, color = COLORS.primary) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description || "\u200B")
    .setTimestamp()
    .setFooter({
      text: "JRC • Premium Server Utility"
    });
}

function replaceVariables(text, guild, user) {
  return String(text || "")
    .replaceAll("{user}", `<@${user.id}>`)
    .replaceAll("{username}", user.username)
    .replaceAll("{server}", guild.name)
    .replaceAll(
      "{membercount}",
      String(guild.memberCount)
    );
}

// ============================================================
// PERMISSION HELPERS
// ============================================================

async function requirePermission(interaction, permission) {
  if (
    !interaction.memberPermissions ||
    !interaction.memberPermissions.has(permission)
  ) {
    await interaction.reply({
      embeds: [
        createEmbed(
          "🚫 Permission Denied",
          "You don't have permission to use this command.",
          COLORS.danger
        )
      ],
      ephemeral: true
    });

    return false;
  }

  return true;
}

// ============================================================
// LOGGING
// ============================================================

async function sendLog(guild, embed) {
  const settings = getGuildSettings(guild.id);

  if (
    !settings.logs.enabled ||
    !settings.logs.channelId
  ) {
    return;
  }

  const channel = guild.channels.cache.get(
    settings.logs.channelId
  );

  if (!channel || !channel.isTextBased()) return;

  try {
    await channel.send({
      embeds: [embed]
    });
  } catch (error) {
    console.error("Log send error:", error);
  }
}

// ============================================================
// MODERATION EMBED
// ============================================================

function moderationEmbed(
  action,
  interaction,
  target,
  reason
) {
  return createEmbed(
    `🛡️ ${action}`,
    [
      `**Target:** ${target}`,
      `**Moderator:** ${interaction.user}`,
      `**Reason:** ${reason || "No reason provided"}`
    ].join("\n"),
    COLORS.danger
  );
}

// ============================================================
// SLASH COMMANDS
// ============================================================

const commands = [

  // ---------------- UTILITY ----------------

  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show all JRC commands."),

  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check JRC latency."),

  new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Show server information."),

  new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Show member information.")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Member to inspect.")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Show a member's avatar.")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Member.")
        .setRequired(false)
    ),

  // ---------------- MODERATION ----------------

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member.")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Member.")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("reason")
        .setDescription("Reason.")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member.")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Member.")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("reason")
        .setDescription("Reason.")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout a member.")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Member.")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("minutes")
        .setDescription("1-40320 minutes.")
        .setMinValue(1)
        .setMaxValue(40320)
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("reason")
        .setDescription("Reason.")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("untimeout")
    .setDescription("Remove a timeout.")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Member.")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("reason")
        .setDescription("Reason.")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member.")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Member.")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("reason")
        .setDescription("Reason.")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("View member warnings.")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Member.")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Delete recent messages.")
    .addIntegerOption(option =>
      option
        .setName("amount")
        .setDescription("1-100 messages.")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("lock")
    .setDescription("Lock the current channel."),

  new SlashCommandBuilder()
    .setName("unlock")
    .setDescription("Unlock the current channel."),

  // ---------------- ROLES ----------------

  new SlashCommandBuilder()
    .setName("role")
    .setDescription("Manage server roles.")

    .addSubcommand(sub =>
      sub
        .setName("add")
        .setDescription("Give a role.")
        .addUserOption(option =>
          option
            .setName("user")
            .setDescription("Member.")
            .setRequired(true)
        )
        .addRoleOption(option =>
          option
            .setName("role")
            .setDescription("Role.")
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("remove")
        .setDescription("Remove a role.")
        .addUserOption(option =>
          option
            .setName("user")
            .setDescription("Member.")
            .setRequired(true)
        )
        .addRoleOption(option =>
          option
            .setName("role")
            .setDescription("Role.")
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("info")
        .setDescription("Show role information.")
        .addRoleOption(option =>
          option
            .setName("role")
            .setDescription("Role.")
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("create")
        .setDescription("Create a role.")
        .addStringOption(option =>
          option
            .setName("name")
            .setDescription("Role name.")
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName("color")
            .setDescription("Hex color.")
            .setRequired(false)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("delete")
        .setDescription("Delete a role.")
        .addRoleOption(option =>
          option
            .setName("role")
            .setDescription("Role.")
            .setRequired(true)
        )
    ),

  // ---------------- AUTOROLE ----------------

  new SlashCommandBuilder()
    .setName("autorole")
    .setDescription("Configure join autorole.")
    .addRoleOption(option =>
      option
        .setName("role")
        .setDescription("Role to give.")
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option
        .setName("disable")
        .setDescription("Disable autorole.")
        .setRequired(false)
    ),

  // ---------------- LOGS ----------------

  new SlashCommandBuilder()
    .setName("logs")
    .setDescription("Configure server logs.")

    .addSubcommand(sub =>
      sub
        .setName("setup")
        .setDescription(
          "Use this channel for logs."
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("disable")
        .setDescription("Disable logs.")
    )

    .addSubcommand(sub =>
      sub
        .setName("status")
        .setDescription("Show log status.")
    ),

  // ---------------- WELCOME ----------------

  new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("Configure welcome messages.")

    .addSubcommand(sub =>
      sub
        .setName("setup")
        .setDescription("Configure welcome messages.")
        .addStringOption(option =>
          option
            .setName("message")
            .setDescription(
              "Use {user}, {username}, {server}, {membercount}."
            )
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName("title")
            .setDescription("Embed title.")
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName("color")
            .setDescription("Hex color.")
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName("image")
            .setDescription(
              "Direct image/GIF URL."
            )
            .setRequired(false)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("test")
        .setDescription("Test the welcome message.")
    )

    .addSubcommand(sub =>
      sub
        .setName("disable")
        .setDescription("Disable welcome.")
    ),

  // ---------------- GOODBYE ----------------

  new SlashCommandBuilder()
    .setName("goodbye")
    .setDescription("Configure goodbye messages.")

    .addSubcommand(sub =>
      sub
        .setName("setup")
        .setDescription("Configure goodbye messages.")
        .addStringOption(option =>
          option
            .setName("message")
            .setDescription(
              "Use {user}, {username}, {server}, {membercount}."
            )
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName("title")
            .setDescription("Embed title.")
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName("color")
            .setDescription("Hex color.")
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName("image")
            .setDescription(
              "Direct image/GIF URL."
            )
            .setRequired(false)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("test")
        .setDescription("Test the goodbye message.")
    )

    .addSubcommand(sub =>
      sub
        .setName("disable")
        .setDescription("Disable goodbye.")
    ),

  // ---------------- SECURITY ----------------

  new SlashCommandBuilder()
    .setName("security")
    .setDescription("Show security settings."),

  new SlashCommandBuilder()
    .setName("antiinvite")
    .setDescription("Toggle invite filtering.")
    .addBooleanOption(option =>
      option
        .setName("enabled")
        .setDescription("Enable or disable.")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("antispam")
    .setDescription("Toggle anti-spam.")
    .addBooleanOption(option =>
      option
        .setName("enabled")
        .setDescription("Enable or disable.")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("verification")
    .setDescription("Toggle verification.")
    .addBooleanOption(option =>
      option
        .setName("enabled")
        .setDescription("Enable or disable.")
        .setRequired(true)
    ),

  // ---------------- EMBEDS ----------------

  new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Send a custom embed.")
    .addStringOption(option =>
      option
        .setName("title")
        .setDescription("Embed title.")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("description")
        .setDescription("Embed description.")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("color")
        .setDescription("Hex color.")
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName("image")
        .setDescription("Direct image/GIF URL.")
        .setRequired(false)
    ),

  // ---------------- FUN ----------------

  new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("Ask the magic 8-ball.")
    .addStringOption(option =>
      option
        .setName("question")
        .setDescription("Your question.")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Flip a coin."),

  new SlashCommandBuilder()
    .setName("roll")
    .setDescription("Roll a die.")
    .addIntegerOption(option =>
      option
        .setName("sides")
        .setDescription("2-1000 sides.")
        .setMinValue(2)
        .setMaxValue(1000)
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("choose")
    .setDescription("Choose between options.")
    .addStringOption(option =>
      option
        .setName("options")
        .setDescription(
          "Separate choices with commas."
        )
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("ship")
    .setDescription("Calculate a fun compatibility score.")
    .addUserOption(option =>
      option
        .setName("user1")
        .setDescription("First user.")
        .setRequired(true)
    )
    .addUserOption(option =>
      option
        .setName("user2")
        .setDescription("Second user.")
        .setRequired(true)
    )

].map(command => command.toJSON());

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

  partials: [
    Partials.Channel,
    Partials.Message
  ]
});

// ============================================================
// READY
// ============================================================

client.once("ready", async () => {

  console.log(
    `✅ JRC ONLINE AS ${client.user.tag}`
  );

  console.log(
    `📡 Servers: ${client.guilds.cache.size}`
  );

  try {

    const rest = new REST({
      version: "10"
    }).setToken(TOKEN);

    if (CLIENT_ID && GUILD_ID) {

      await rest.put(
        Routes.applicationGuildCommands(
          CLIENT_ID,
          GUILD_ID
        ),
        {
          body: commands
        }
      );

      console.log(
        "✅ Guild slash commands registered."
      );

    } else if (CLIENT_ID) {

      await rest.put(
        Routes.applicationCommands(
          CLIENT_ID
        ),
        {
          body: commands
        }
      );

      console.log(
        "✅ Global slash commands registered."
      );

    } else {

      console.log(
        "⚠️ CLIENT_ID missing — commands were not registered."
      );

    }

  } catch (error) {

    console.error(
      "❌ Command registration error:",
      error
    );

  }
});

// ============================================================
// MEMBER JOIN
// ============================================================

client.on(
  "guildMemberAdd",
  async member => {

    const settings =
      getGuildSettings(member.guild.id);

    // AUTOROLE
    if (settings.autorole) {

      const role =
        member.guild.roles.cache.get(
          settings.autorole
        );

      if (
        role &&
        role.editable
      ) {

        try {

          await member.roles.add(
            role,
            "JRC autorole"
          );

        } catch {}

      }

    }

    // WELCOME
    if (
      settings.welcome.enabled &&
      settings.welcome.channelId
    ) {

      const channel =
        member.guild.channels.cache.get(
          settings.welcome.channelId
        );

      if (channel?.isTextBased()) {

        const embed = createEmbed(
          replaceVariables(
            settings.welcome.title,
            member.guild,
            member.user
          ),

          replaceVariables(
            settings.welcome.message,
            member.guild,
            member.user
          ),

          hexToInt(
            settings.welcome.color
          )
        );

        embed.setThumbnail(
          member.user.displayAvatarURL({
            size: 256
          })
        );

        if (settings.welcome.image) {

          embed.setImage(
            settings.welcome.image
          );

        }

        try {

          await channel.send({
            embeds: [embed]
          });

        } catch {}

      }

    }

    // LOG
    await sendLog(
      member.guild,

      createEmbed(
        "📥 MEMBER JOINED",

        `**User:** ${member.user}\n` +
        `**Tag:** ${member.user.tag}\n` +
        `**Members:** ${member.guild.memberCount}`,

        COLORS.success
      )
    );

  }
);

// ============================================================
// MEMBER LEAVE
// ============================================================

client.on(
  "guildMemberRemove",
  async member => {

    const settings =
      getGuildSettings(member.guild.id);

    if (
      settings.goodbye.enabled &&
      settings.goodbye.channelId
    ) {

      const channel =
        member.guild.channels.cache.get(
          settings.goodbye.channelId
        );

      if (channel?.isTextBased()) {

        const embed = createEmbed(
          replaceVariables(
            settings.goodbye.title,
            member.guild,
            member.user
          ),

          replaceVariables(
            settings.goodbye.message,
            member.guild,
            member.user
          ),

          hexToInt(
            settings.goodbye.color
          )
        );

        embed.setThumbnail(
          member.user.displayAvatarURL({
            size: 256
          })
        );

        if (settings.goodbye.image) {

          embed.setImage(
            settings.goodbye.image
          );

        }

        try {

          await channel.send({
            embeds: [embed]
          });

        } catch {}

      }

    }

    await sendLog(
      member.guild,

      createEmbed(
        "📤 MEMBER LEFT",

        `**User:** ${member.user.tag}\n` +
        `**Members:** ${member.guild.memberCount}`,

        COLORS.warning
      )
    );

  }
);

// ============================================================
// ANTI-SPAM
// ============================================================

const spamTracker = new Map();

client.on(
  "messageCreate",
  async message => {

    if (
      !message.guild ||
      message.author.bot
    ) {
      return;
    }

    const settings =
      getGuildSettings(message.guild.id);

    // ---------------- ANTI INVITE ----------------

    if (
      settings.security.antiInvite &&
      /(?:discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\//i
        .test(message.content)
    ) {

      if (
        !message.member.permissions.has(
          PermissionsBitField.Flags.ManageMessages
        )
      ) {

        try {
          await message.delete();
        } catch {}

        try {

          const warning =
            await message.channel.send({
              embeds: [
                createEmbed(
                  "🔒 INVITE BLOCKED",
                  `${message.author}, invite links aren't allowed here.`,
                  COLORS.warning
                )
              ]
            });

          setTimeout(
            () => warning.delete().catch(() => {}),
            5000
          );

        } catch {}

        await sendLog(
          message.guild,

          createEmbed(
            "🔒 INVITE BLOCKED",

            `**User:** ${message.author}\n` +
            `**Channel:** ${message.channel}`,

            COLORS.warning
          )
        );

      }

    }

    // ---------------- ANTI SPAM ----------------

    if (
      settings.security.antiSpam
    ) {

      const now = Date.now();

      const previous =
        spamTracker.get(
          message.author.id
        ) || [];

      const recent =
        previous.filter(
          timestamp =>
            now - timestamp < 5000
        );

      recent.push(now);

      spamTracker.set(
        message.author.id,
        recent
      );

      if (
        recent.length >= 6 &&
        message.member.moderatable
      ) {

        try {

          await message.member.timeout(
            30_000,
            "JRC anti-spam"
          );

          spamTracker.set(
            message.author.id,
            []
          );

          await sendLog(
            message.guild,

            createEmbed(
              "🚨 ANTI-SPAM",
              `${message.author} was temporarily timed out for rapid message spam.`,
              COLORS.danger
            )
          );

        } catch {}

      }

    }

  }
);

// ============================================================
// MESSAGE DELETE LOG
// ============================================================

client.on(
  "messageDelete",
  async message => {

    if (
      !message.guild ||
      message.author?.bot
    ) {
      return;
    }

    await sendLog(
      message.guild,

      createEmbed(
        "🗑️ MESSAGE DELETED",

        `**Author:** ${message.author || "Unknown"}\n` +
        `**Channel:** ${message.channel}\n` +
        `**Content:** ${
          message.content
            ? message.content.slice(0, 900)
            : "Unavailable"
        }`,

        COLORS.warning
      )
    );

  }
);

// ============================================================
// MESSAGE EDIT LOG
// ============================================================

client.on(
  "messageUpdate",
  async (oldMessage, newMessage) => {

    if (
      !newMessage.guild ||
      newMessage.author?.bot
    ) {
      return;
    }

    if (
      !oldMessage.content ||
      !newMessage.content ||
      oldMessage.content ===
        newMessage.content
    ) {
      return;
    }

    await sendLog(
      newMessage.guild,

      createEmbed(
        "✏️ MESSAGE EDITED",

        `**Author:** ${newMessage.author}\n` +
        `**Channel:** ${newMessage.channel}\n\n` +
        `**Before:** ${oldMessage.content.slice(0, 400)}\n` +
        `**After:** ${newMessage.content.slice(0, 400)}`,

        COLORS.primary
      )
    );

  }
);

// ============================================================
// INTERACTIONS
// ============================================================

client.on(
  "interactionCreate",
  async interaction => {

    if (
      !interaction.isChatInputCommand() ||
      !interaction.guild
    ) {
      return;
    }

    const settings =
      getGuildSettings(
        interaction.guild.id
      );

    const command =
      interaction.commandName;

    try {

      // ======================================================
      // HELP
      // ======================================================

      if (command === "help") {

        return interaction.reply({
          embeds: [
            createEmbed(
              "⚡ JRC COMMAND CENTER",

              [
                "**🛡️ MODERATION**",
                "`/ban` `/kick` `/timeout` `/untimeout` `/warn` `/warnings` `/clear` `/lock` `/unlock`",

                "**🎭 ROLES**",
                "`/role` `/autorole`",

                "**📋 LOGGING**",
                "`/logs`",

                "**👋 MEMBER SYSTEMS**",
                "`/welcome` `/goodbye`",

                "**🔐 SECURITY**",
                "`/security` `/antiinvite` `/antispam` `/verification`",

                "**⚙️ UTILITY**",
                "`/ping` `/serverinfo` `/userinfo` `/avatar` `/embed`",

                "**🎲 FUN**",
                "`/8ball` `/coinflip` `/roll` `/choose` `/ship`"
              ].join("\n\n")
            )
          ]
        });

      }

      // ======================================================
      // PING
      // ======================================================

      if (command === "ping") {

        return interaction.reply({
          embeds: [
            createEmbed(
              "🏓 PONG",
              `WebSocket latency: **${client.ws.ping}ms**\n\nJRC is online and responding.`,
              COLORS.success
            )
          ]
        });

      }

      // ======================================================
      // SERVER INFO
      // ======================================================

      if (command === "serverinfo") {

        const guild =
          interaction.guild;

        const embed = createEmbed(
          `🌐 ${guild.name}`,

          [
            `**Owner:** <@${guild.ownerId}>`,
            `**Members:** ${guild.memberCount}`,
            `**Channels:** ${guild.channels.cache.size}`,
            `**Roles:** ${guild.roles.cache.size}`,
            `**Created:** <t:${Math.floor(
              guild.createdTimestamp / 1000
            )}:F>`
          ].join("\n")
        );

        if (guild.iconURL()) {
          embed.setThumbnail(
            guild.iconURL({
              size: 256
            })
          );
        }

        return interaction.reply({
          embeds: [embed]
        });

      }

      // ======================================================
      // USER INFO
      // ======================================================

      if (command === "userinfo") {

        const user =
          interaction.options.getUser(
            "user"
          ) || interaction.user;

        const member =
          await interaction.guild.members
            .fetch(user.id)
            .catch(() => null);

        const roles =
          member
            ? member.roles.cache
                .filter(
                  role =>
                    role.id !==
                    interaction.guild.id
                )
                .map(role => role.name)
                .slice(0, 15)
            : [];

        const embed = createEmbed(
          `👤 ${user.username}`,

          [
            `**ID:** \`${user.id}\``,
            `**Created:** <t:${Math.floor(
              user.createdTimestamp / 1000
            )}:F>`,
            `**Joined:** ${
              member
                ? `<t:${Math.floor(
                    member.joinedTimestamp / 1000
                  )}:F>`
                : "Unknown"
            }`,
            `**Roles:** ${
              roles.length
                ? roles.join(", ")
                : "None"
            }`
          ].join("\n")
        );

        embed.setThumbnail(
          user.displayAvatarURL({
            size: 256
          })
        );

        return interaction.reply({
          embeds: [embed]
        });

      }

      // ======================================================
      // AVATAR
      // ======================================================

      if (command === "avatar") {

        const user =
          interaction.options.getUser(
            "user"
          ) || interaction.user;

        const avatar =
          user.displayAvatarURL({
            size: 4096
          });

        const embed = createEmbed(
          "🖼️ AVATAR",
          `[Open full-size avatar](${avatar})`
        );

        embed.setImage(
          user.displayAvatarURL({
            size: 1024
          })
        );

        return interaction.reply({
          embeds: [embed]
        });

      }

      // ======================================================
      // PERMISSIONS
      // ======================================================

      const moderationCommands = [
        "ban",
        "kick",
        "timeout",
        "untimeout",
        "warn",
        "clear",
        "lock",
        "unlock"
      ];

      const managementCommands = [
        "autorole",
        "logs",
        "welcome",
        "goodbye",
        "antiinvite",
        "antispam",
        "verification",
        "embed"
      ];

      if (
        moderationCommands.includes(
          command
        )
      ) {

        if (
          !(await requirePermission(
            interaction,
            command === "ban"
              ? PermissionsBitField.Flags.BanMembers
              : command === "kick"
              ? PermissionsBitField.Flags.KickMembers
              : command === "clear"
              ? PermissionsBitField.Flags.ManageMessages
              : command === "lock" ||
                command === "unlock"
              ? PermissionsBitField.Flags.ManageChannels
              : PermissionsBitField.Flags.ModerateMembers
          ))
        ) {
          return;
        }

      }

      if (
        managementCommands.includes(
          command
        )
      ) {

        if (
          !(await requirePermission(
            interaction,
            PermissionsBitField.Flags.ManageGuild
          ))
        ) {
          return;
        }

      }

      if (
        command === "warnings"
      ) {

        if (
          !(await requirePermission(
            interaction,
            PermissionsBitField.Flags.ModerateMembers
          ))
        ) {
          return;
        }

      }

      // ======================================================
      // BAN / KICK / TIMEOUT
      // ======================================================

      if (
        [
          "ban",
          "kick",
          "timeout",
          "untimeout"
        ].includes(command)
      ) {

        const user =
          interaction.options.getUser(
            "user",
            true
          );

        const member =
          await interaction.guild.members
            .fetch(user.id)
            .catch(() => null);

        const reason =
          interaction.options.getString(
            "reason"
          ) ||
          "No reason provided";

        if (!member) {

          return interaction.reply({
            embeds: [
              createEmbed(
                "❌ Member Not Found",
                "That member is not in this server.",
                COLORS.danger
              )
            ],
            ephemeral: true
          });

        }

        if (
          member.id ===
          interaction.user.id
        ) {

          return interaction.reply({
            embeds: [
              createEmbed(
                "🚫 Invalid Target",
                "You can't moderate yourself.",
                COLORS.danger
              )
            ],
            ephemeral: true
          });

        }

        if (
          member.id ===
          interaction.guild.ownerId
        ) {

          return interaction.reply({
            embeds: [
              createEmbed(
                "🛡️ Protected",
                "The server owner cannot be moderated.",
                COLORS.danger
              )
            ],
            ephemeral: true
          });

        }

        if (
          command !== "ban" &&
          !member.moderatable
        ) {

          return interaction.reply({
            embeds: [
              createEmbed(
                "⚠️ Role Hierarchy",
                "JRC's role must be above the target member.",
                COLORS.danger
              )
            ],
            ephemeral: true
          });

        }

        if (command === "ban") {

          if (
            !interaction.guild.members.me.permissions.has(
              PermissionsBitField.Flags.BanMembers
            )
          ) {

            return interaction.reply({
              embeds: [
                createEmbed(
                  "❌ Missing Permission",
                  "JRC needs **Ban Members** permission.",
                  COLORS.danger
                )
              ],
              ephemeral: true
            });

          }

          if (!member.bannable) {

            return interaction.reply({
              embeds: [
                createEmbed(
                  "⚠️ Role Hierarchy",
                  "JRC cannot ban that member.",
                  COLORS.danger
                )
              ],
              ephemeral: true
            });

          }

          await member.ban({
            reason
          });

        }

        if (command === "kick") {

          if (
            !member.kickable
          ) {

            return interaction.reply({
              embeds: [
                createEmbed(
                  "⚠️ Role Hierarchy",
                  "JRC cannot kick that member.",
                  COLORS.danger
                )
              ],
              ephemeral: true
            });

          }

          await member.kick(
            reason
          );

        }

        if (command === "timeout") {

          const minutes =
            interaction.options.getInteger(
              "minutes",
              true
            );

          await member.timeout(
            minutes * 60_000,
            reason
          );

        }

        if (command === "untimeout") {

          await member.timeout(
            null,
            reason
          );

        }

        await sendLog(
          interaction.guild,

          moderationEmbed(
            command.toUpperCase(),
            interaction,
            user,
            reason
          )
        );

        const actionText =
          command === "untimeout"
            ? `Removed timeout from **${user.tag}**.`
            : `${command.charAt(0).toUpperCase() +
                command.slice(1)}ed **${user.tag}**.`;

        return interaction.reply({
          embeds: [
            createEmbed(
              "✅ ACTION COMPLETE",
              actionText,
              COLORS.success
            )
          ]
        });

      }

      // ======================================================
      // WARN
      // ======================================================

      if (command === "warn") {

        const user =
          interaction.options.getUser(
            "user",
            true
          );

        const reason =
          interaction.options.getString(
            "reason",
            true
          );

        settings.warnings[user.id] ??= [];

        settings.warnings[user.id].push({
          reason,
          moderator:
            interaction.user.id,
          timestamp: Date.now()
        });

        saveDatabase();

        await sendLog(
          interaction.guild,

          moderationEmbed(
            "WARNING",
            interaction,
            user,
            reason
          )
        );

        return interaction.reply({
          embeds: [
            createEmbed(
              "⚠️ WARNING ADDED",

              `${user} has been warned.\n\n` +
              `**Reason:** ${reason}\n` +
              `**Total warnings:** ${settings.warnings[user.id].length}`,

              COLORS.warning
            )
          ]
        });

      }

      // ======================================================
      // WARNINGS
      // ======================================================

      if (command === "warnings") {

        const user =
          interaction.options.getUser(
            "user",
            true
          );

        const warnings =
          settings.warnings[user.id] || [];

        const text =
          warnings.length
            ? warnings
                .slice(-10)
                .map(
                  (warning, index) =>
                    `**${index + 1}.** ${warning.reason} — <@${warning.moderator}>`
                )
                .join("\n")
            : "No warnings recorded.";

        return interaction.reply({
          embeds: [
            createEmbed(
              `⚠️ WARNINGS • ${user.username}`,
              text,
              warnings.length
                ? COLORS.warning
                : COLORS.success
            )
          ]
        });

      }

      // ======================================================
      // CLEAR
      // ======================================================

      if (command === "clear") {

        if (
          !interaction.channel ||
          !interaction.channel.bulkDelete
        ) {

          return interaction.reply({
            embeds: [
              createEmbed(
                "❌ Unavailable",
                "This channel doesn't support bulk deletion.",
                COLORS.danger
              )
            ],
            ephemeral: true
          });

        }

        const amount =
          interaction.options.getInteger(
            "amount",
            true
          );

        const deleted =
          await interaction.channel.bulkDelete(
            amount,
            true
          );

        await sendLog(
          interaction.guild,

          createEmbed(
            "🧹 MESSAGES CLEARED",

            `**Moderator:** ${interaction.user}\n` +
            `**Channel:** ${interaction.channel}\n` +
            `**Deleted:** ${deleted.size}`,

            COLORS.warning
          )
        );

        return interaction.reply({
          embeds: [
            createEmbed(
              "🧹 CLEARED",
              `Deleted **${deleted.size}** recent messages.`,
              COLORS.success
            )
          ],
          ephemeral: true
        });

      }

      // ======================================================
      // LOCK / UNLOCK
      // ======================================================

      if (
        command === "lock" ||
        command === "unlock"
      ) {

        const channel =
          interaction.channel;

        if (
          !channel ||
          !channel.permissionOverwrites
        ) {

          return interaction.reply({
            embeds: [
              createEmbed(
                "❌ Unavailable",
                "This channel cannot be locked.",
                COLORS.danger
              )
            ],
            ephemeral: true
          });

        }

        await channel.permissionOverwrites.edit(
          interaction.guild.roles.everyone,
          {
            SendMessages:
              command === "unlock"
          }
        );

        await sendLog(
          interaction.guild,

          createEmbed(
            command === "lock"
              ? "🔒 CHANNEL LOCKED"
              : "🔓 CHANNEL UNLOCKED",

            `${interaction.user} changed access for ${channel}.`,

            COLORS.warning
          )
        );

        return interaction.reply({
          embeds: [
            createEmbed(
              command === "lock"
                ? "🔒 LOCKED"
                : "🔓 UNLOCKED",

              `${channel} is now ${
                command === "lock"
                  ? "locked"
                  : "unlocked"
              }.`,
              
              COLORS.success
            )
          ]
        });

      }

      // ======================================================
      // ROLE COMMANDS
      // ======================================================

      if (command === "role") {

        const subcommand =
          interaction.options.getSubcommand();

        const role =
          interaction.options.getRole(
            "role"
          );

        // ROLE INFO
        if (
          subcommand === "info"
        ) {

          return interaction.reply({
            embeds: [
              createEmbed(
                `🎭 ${role.name}`,

                `**ID:** \`${role.id}\`\n` +
                `**Members:** ${role.members.size}\n` +
                `**Position:** ${role.position}\n` +
                `**Mentionable:** ${
                  role.mentionable
                    ? "Yes"
                    : "No"
                }\n` +
                `**Color:** ${role.hexColor}`,

                role.color ||
                  COLORS.primary
              )
            ]
          });

        }

        // ROLE CREATE
        if (
          subcommand === "create"
        ) {

          const name =
            interaction.options.getString(
              "name",
              true
            );

          const color =
            interaction.options.getString(
              "color"
            ) || "#5865F2";

          const newRole =
            await interaction.guild.roles.create({
              name,
              color,
              reason:
                `Created by ${interaction.user.tag}`
            });

          return interaction.reply({
            embeds: [
              createEmbed(
                "🎭 ROLE CREATED",
                `Created ${newRole}.`,
                COLORS.success
              )
            ]
          });

        }

        // ROLE DELETE
        if (
          subcommand === "delete"
        ) {

          if (
            !role.editable
          ) {

            return interaction.reply({
              embeds: [
                createEmbed(
                  "⚠️ ROLE HIERARCHY",
                  "JRC can't delete that role.",
                  COLORS.danger
                )
              ],
              ephemeral: true
            });

          }

          const roleName =
            role.name;

          await role.delete(
            `Deleted by ${interaction.user.tag}`
          );

          return interaction.reply({
            embeds: [
              createEmbed(
                "🗑️ ROLE DELETED",
                `Deleted **${roleName}**.`,
                COLORS.success
              )
            ]
          });

        }

        // ROLE ADD / REMOVE
        const member =
          interaction.options.getMember(
            "user"
          );

        if (!member) {

          return interaction.reply({
            embeds: [
              createEmbed(
                "❌ Member Not Found",
                "That member could not be found.",
                COLORS.danger
              )
            ],
            ephemeral: true
          });

        }

        if (
          !role.editable
        ) {

          return interaction.reply({
            embeds: [
              createEmbed(
                "⚠️ ROLE HIERARCHY",
                "JRC's role must be above the target role.",
                COLORS.danger
              )
            ],
            ephemeral: true
          });

        }

        if (
          subcommand === "add"
        ) {

          await member.roles.add(
            role,
            `JRC role add by ${interaction.user.tag}`
          );

        }

        if (
          subcommand === "remove"
        ) {

          await member.roles.remove(
            role,
            `JRC role remove by ${interaction.user.tag}`
          );

        }

        return interaction.reply({
          embeds: [
            createEmbed(
              "🎭 ROLE UPDATED",

              `${role} was **${
                subcommand === "add"
                  ? "added to"
                  : "removed from"
              }** ${member}.`,

              COLORS.success
            )
          ]
        });

      }

      // ======================================================
      // AUTOROLE
      // ======================================================

      if (
        command === "autorole"
      ) {

        const disable =
          interaction.options.getBoolean(
            "disable"
          );

        const role =
          interaction.options.getRole(
            "role"
          );

        if (disable) {

          settings.autorole = null;

          saveDatabase();

          return interaction.reply({
            embeds: [
              createEmbed(
                "🎭 AUTOROLE DISABLED",
                "New members will no longer receive an autorole.",
                COLORS.success
              )
            ]
          });

        }

        if (!role) {

          return interaction.reply({
            embeds: [
              createEmbed(
                "⚠️ MISSING ROLE",
                "Choose a role or set `disable` to true.",
                COLORS.warning
              )
            ],
            ephemeral: true
          });

        }

        if (!role.editable) {

          return interaction.reply({
            embeds: [
              createEmbed(
                "⚠️ ROLE HIERARCHY",
                "Put JRC's role above the autorole.",
                COLORS.danger
              )
            ],
            ephemeral: true
          });

        }

        settings.autorole =
          role.id;

        saveDatabase();

        return interaction.reply({
          embeds: [
            createEmbed(
              "🎭 AUTOROLE SET",
              `New members will receive ${role}.`,
              COLORS.success
            )
          ]
        });

      }

      // ======================================================
      // LOGS
      // ======================================================

      if (
        command === "logs"
      ) {

        const subcommand =
          interaction.options.getSubcommand();

        if (
          subcommand === "setup"
        ) {

          settings.logs.enabled =
            true;

          settings.logs.channelId =
            interaction.channelId;

          saveDatabase();

          return interaction.reply({
            embeds: [
              createEmbed(
                "📋 LOGS ENABLED",
                `Server logs will be sent to ${interaction.channel}.`,
                COLORS.success
              )
            ]
          });

        }

        if (
          subcommand === "disable"
        ) {

          settings.logs.enabled =
            false;

          saveDatabase();

          return interaction.reply({
            embeds: [
              createEmbed(
                "📋 LOGS DISABLED",
                "JRC server logs are now disabled.",
                COLORS.success
              )
            ]
          });

        }

        return interaction.reply({
          embeds: [
            createEmbed(
              "📋 LOG STATUS",

              settings.logs.enabled
                ? `🟢 Enabled → <#${settings.logs.channelId}>`
                : "🔴 Disabled.",

              settings.logs.enabled
                ? COLORS.success
                : COLORS.warning
            )
          ]
        });

      }

      // ======================================================
      // WELCOME / GOODBYE
      // ======================================================

      if (
        command === "welcome" ||
        command === "goodbye"
      ) {

        const subcommand =
          interaction.options.getSubcommand();

        const config =
          command === "welcome"
            ? settings.welcome
            : settings.goodbye;

        if (
          subcommand === "disable"
        ) {

          config.enabled =
            false;

          saveDatabase();

          return interaction.reply({
            embeds: [
              createEmbed(
                command === "welcome"
                  ? "👋 WELCOME DISABLED"
                  : "🚪 GOODBYE DISABLED",

                `The ${command} system is now disabled.`,

                COLORS.success
              )
            ]
          });

        }

        if (
          subcommand === "setup"
        ) {

          config.enabled =
            true;

          config.channelId =
            interaction.channelId;

          const message =
            interaction.options.getString(
              "message"
            );

          const title =
            interaction.options.getString(
              "title"
            );

          const color =
            interaction.options.getString(
              "color"
            );

          const image =
            interaction.options.getString(
              "image"
            );

          if (message)
            config.message =
              message;

          if (title)
            config.title =
              title;

          if (color)
            config.color =
              color;

          if (image !== null)
            config.image =
              image || null;

          saveDatabase();

          return interaction.reply({
            embeds: [
              createEmbed(
                command === "welcome"
                  ? "👋 WELCOME CONFIGURED"
                  : "🚪 GOODBYE CONFIGURED",

                `**Channel:** ${interaction.channel}\n\n` +
                `**Message:** ${config.message}\n` +
                `**Title:** ${config.title}\n` +
                `**Image/GIF:** ${
                  config.image
                    ? "Configured"
                    : "None"
                }\n\n` +
                `Variables:\n` +
                "`{user}` `{username}` `{server}` `{membercount}`",

                COLORS.success
              )
            ]
          });

        }

        if (
          subcommand === "test"
        ) {

          const embed =
            createEmbed(

              replaceVariables(
                config.title,
                interaction.guild,
                interaction.user
              ),

              replaceVariables(
                config.message,
                interaction.guild,
                interaction.user
              ),

              hexToInt(
                config.color
              )

            );

          embed.setThumbnail(
            interaction.user.displayAvatarURL({
              size: 256
            })
          );

          if (
            config.image
          ) {

            embed.setImage(
              config.image
            );

          }

          return interaction.reply({
            embeds: [embed]
          });

        }

      }

      // ======================================================
      // SECURITY
      // ======================================================

      if (
        command === "security"
      ) {

        return interaction.reply({
          embeds: [
            createEmbed(
              "🔐 JRC SECURITY",

              `**Anti-invite:** ${
                settings.security.antiInvite
                  ? "🟢 ON"
                  : "🔴 OFF"
              }\n` +

              `**Anti-spam:** ${
                settings.security.antiSpam
                  ? "🟢 ON"
                  : "🔴 OFF"
              }\n` +

              `**Verification:** ${
                settings.security.verification
                  ? "🟢 ON"
                  : "🔴 OFF"
              }`
            )
          ]
        });

      }

      if (
        [
          "antiinvite",
          "antispam",
          "verification"
        ].includes(command)
      ) {

        const enabled =
          interaction.options.getBoolean(
            "enabled",
            true
          );

        const key =
          command === "antiinvite"
            ? "antiInvite"
            : command === "antispam"
            ? "antiSpam"
            : "verification";

        settings.security[key] =
          enabled;

        saveDatabase();

        return interaction.reply({
          embeds: [
            createEmbed(
              "🔐 SECURITY UPDATED",

              `**${command}** is now **${
                enabled
                  ? "ON"
                  : "OFF"
              }**.`,

              enabled
                ? COLORS.success
                : COLORS.warning
            )
          ]
        });

      }

      // ======================================================
      // CUSTOM EMBED
      // ======================================================

      if (
        command === "embed"
      ) {

        const title =
          interaction.options.getString(
            "title",
            true
          );

        const description =
          interaction.options.getString(
            "description",
            true
          );

        const color =
          interaction.options.getString(
            "color"
          );

        const image =
          interaction.options.getString(
            "image"
          );

        const embed =
          createEmbed(
            title,
            description,
            hexToInt(color)
          );

        if (image) {
          embed.setImage(image);
        }

        await interaction.channel.send({
          embeds: [embed]
        });

        return interaction.reply({
          embeds: [
            createEmbed(
              "✅ EMBED SENT",
              "Your embed was successfully sent.",
              COLORS.success
            )
          ],
          ephemeral: true
        });

      }

      // ======================================================
      // 8BALL
      // ======================================================

      if (
        command === "8ball"
      ) {

        const answers = [
          "Absolutely.",
          "Most likely.",
          "Yep.",
          "Ask me later.",
          "Probably not.",
          "I wouldn't count on it.",
          "Nope."
        ];

        const answer =
          answers[
            Math.floor(
              Math.random() *
              answers.length
            )
          ];

        return interaction.reply({
          embeds: [
            createEmbed(
              "🎱 8-BALL",
              answer
            )
          ]
        });

      }

      // ======================================================
      // COINFLIP
      // ======================================================

      if (
        command === "coinflip"
      ) {

        return interaction.reply({
          embeds: [
            createEmbed(
              "🪙 COINFLIP",
              Math.random() < 0.5
                ? "Heads!"
                : "Tails!"
            )
          ]
        });

      }

      // ======================================================
      // ROLL
      // ======================================================

      if (
        command === "roll"
      ) {

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
            createEmbed(
              "🎲 ROLL",
              `You rolled **${result}** / ${sides}.`
            )
          ]
        });

      }

      // ======================================================
      // CHOOSE
      // ======================================================

      if (
        command === "choose"
      ) {

        const options =
          interaction.options
            .getString(
              "options",
              true
            )
            .split(",")
            .map(option =>
              option.trim()
            )
            .filter(Boolean);

        if (!options.length) {

          return interaction.reply({
            embeds: [
              createEmbed(
                "⚠️ NO OPTIONS",
                "Separate your choices with commas.",
                COLORS.warning
              )
            ],
            ephemeral: true
          });

        }

        const chosen =
          options[
            Math.floor(
              Math.random() *
              options.length
            )
          ];

        return interaction.reply({
          embeds: [
            createEmbed(
              "🎯 CHOICE",
              `I choose **${chosen}**.`
            )
          ]
        });

      }

      // ======================================================
      // SHIP
      // ======================================================

      if (
        command === "ship"
      ) {

        const user1 =
          interaction.options.getUser(
            "user1",
            true
          );

        const user2 =
          interaction.options.getUser(
            "user2",
            true
          );

        const score =
          Math.floor(
            Math.random() * 101
          );

        return interaction.reply({
          embeds: [
            createEmbed(
              "💫 SHIP CALCULATOR",

              `${user1} + ${user2}\n\n` +
              `**Compatibility:** ${score}%\n\n` +
              `*Just for fun.*`,

              score >= 70
                ? COLORS.success
                : COLORS.primary
            )
          ]
        });

      }

    } catch (error) {

      console.error(
        `❌ /${command} error:`,
        error
      );

      const message =
        error?.code === 50013
          ? "JRC is missing a Discord permission for that action."
          : "Something went wrong. Check JRC's permissions and role position.";

      if (
        !interaction.replied &&
        !interaction.deferred
      ) {

        await interaction.reply({
          embeds: [
            createEmbed(
              "⚠️ COMMAND ERROR",
              message,
              COLORS.danger
            )
          ],
          ephemeral: true
        }).catch(() => {});

      }

    }

  }
);

// ============================================================
// PROCESS ERROR HANDLING
// ============================================================

process.on(
  "unhandledRejection",
  error => {
    console.error(
      "❌ Unhandled rejection:",
      error
    );
  }
);

process.on(
  "uncaughtException",
  error => {
    console.error(
      "❌ Uncaught exception:",
      error
    );
  }
);

// ============================================================
// LOGIN
// ============================================================

client.login(TOKEN);
