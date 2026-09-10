require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder,
  REST,
  Routes,
  PermissionFlagsBits
} = require("discord.js");

const fs = require("fs");
const path = require("path");

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
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  } catch {
    config = {};
  }
}

function saveConfig() {
  fs.writeFileSync(
    CONFIG_FILE,
    JSON.stringify(config, null, 2)
  );
}

function guildConfig(guildId) {
  if (!config[guildId]) {
    config[guildId] = {
      welcome: {
        enabled: false,
        channel: null,
        title: "🎉 Welcome!",
        message: "Welcome {user} to **{server}**!",
        color: "#5865F2",
        image: null,
        gif: null
      },
      goodbye: {
        enabled: false,
        channel: null,
        title: "👋 Goodbye!",
        message: "{user} has left **{server}**.",
        color: "#ED4245",
        image: null,
        gif: null
      }
    };

    saveConfig();
  }

  return config[guildId];
}

function replaceVariables(text, member) {
  return text
    .replaceAll("{user}", `<@${member.id}>`)
    .replaceAll("{username}", member.user.username)
    .replaceAll("{server}", member.guild.name)
    .replaceAll("{membercount}", String(member.guild.memberCount))
    .replaceAll("{userid}", member.id);
}

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

const commands = [

  new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("Configure the welcome system")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    )
    .addSubcommand(sub =>
      sub
        .setName("setup")
        .setDescription("Enable welcome messages")
        .addChannelOption(opt =>
          opt
            .setName("channel")
            .setDescription("Welcome channel")
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName("message")
            .setDescription("Welcome message")
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName("gif")
            .setDescription("GIF/image URL")
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName("color")
            .setDescription("Embed color, e.g. #5865F2")
            .setRequired(false)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("disable")
        .setDescription("Disable welcome messages")
    )

    .addSubcommand(sub =>
      sub
        .setName("test")
        .setDescription("Test the welcome message")
    ),

  new SlashCommandBuilder()
    .setName("goodbye")
    .setDescription("Configure the goodbye system")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    )
    .addSubcommand(sub =>
      sub
        .setName("setup")
        .setDescription("Enable goodbye messages")
        .addChannelOption(opt =>
          opt
            .setName("channel")
            .setDescription("Goodbye channel")
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName("message")
            .setDescription("Goodbye message")
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName("gif")
            .setDescription("GIF/image URL")
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName("color")
            .setDescription("Embed color, e.g. #ED4245")
            .setRequired(false)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("disable")
        .setDescription("Disable goodbye messages")
    )

    .addSubcommand(sub =>
      sub
        .setName("test")
        .setDescription("Test the goodbye message")
    )

].map(command => command.toJSON());

client.once("ready", async () => {

  console.log("================================");
  console.log(`🤖 Logged in as ${client.user.tag}`);
  console.log(`🌐 Servers: ${client.guilds.cache.size}`);
  console.log("🚀 Welcome/Goodbye system online");
  console.log("================================");

  const rest = new REST({ version: "10" })
    .setToken(process.env.DISCORD_TOKEN);

  try {

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      {
        body: commands
      }
    );

    console.log("✅ Slash commands registered.");

  } catch (error) {
    console.error("❌ Command registration failed:", error);
  }
});

client.on("guildMemberAdd", async member => {

  const cfg = guildConfig(member.guild.id);
  const welcome = cfg.welcome;

  if (!welcome.enabled || !welcome.channel) return;

  const channel = member.guild.channels.cache.get(
    welcome.channel
  );

  if (!channel || !channel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setTitle(
      replaceVariables(welcome.title, member)
    )
    .setDescription(
      replaceVariables(welcome.message, member)
    )
    .setColor(welcome.color || "#5865F2")
    .setThumbnail(member.user.displayAvatarURL({
      size: 256,
      extension: "png"
    }))
    .setFooter({
      text: `${member.guild.name} • Member #${member.guild.memberCount}`
    })
    .setTimestamp();

  const media = welcome.gif || welcome.image;

  if (validImage(media)) {
    embed.setImage(media);
  }

  try {
    await channel.send({
      content: `Welcome <@${member.id}>! 🎉`,
      embeds: [embed]
    });
  } catch (error) {
    console.error("Welcome message failed:", error);
  }
});

client.on("guildMemberRemove", async member => {

  const cfg = guildConfig(member.guild.id);
  const goodbye = cfg.goodbye;

  if (!goodbye.enabled || !goodbye.channel) return;

  const channel = member.guild.channels.cache.get(
    goodbye.channel
  );

  if (!channel || !channel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setTitle(
      replaceVariables(goodbye.title, member)
    )
    .setDescription(
      replaceVariables(goodbye.message, member)
    )
    .setColor(goodbye.color || "#ED4245")
    .setThumbnail(member.user.displayAvatarURL({
      size: 256,
      extension: "png"
    }))
    .setFooter({
      text: `${member.guild.name} • ${member.guild.memberCount} members`
    })
    .setTimestamp();

  const media = goodbye.gif || goodbye.image;

  if (validImage(media)) {
    embed.setImage(media);
  }

  try {
    await channel.send({
      embeds: [embed]
    });
  } catch (error) {
    console.error("Goodbye message failed:", error);
  }
});

client.on("interactionCreate", async interaction => {

  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (
    commandName !== "welcome" &&
    commandName !== "goodbye"
  ) return;

  const system = commandName;
  const sub = interaction.options.getSubcommand();

  const cfg = guildConfig(interaction.guild.id);
  const settings = cfg[system];

  if (sub === "setup") {

    const channel =
      interaction.options.getChannel("channel");

    const message =
      interaction.options.getString("message");

    const gif =
      interaction.options.getString("gif");

    const color =
      interaction.options.getString("color");

    if (gif && !validImage(gif)) {
      return interaction.reply({
        content: "❌ That doesn't look like a valid image/GIF URL.",
        ephemeral: true
      });
    }

    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return interaction.reply({
        content:
          "❌ Invalid color. Use something like `#5865F2`.",
        ephemeral: true
      });
    }

    settings.enabled = true;
    settings.channel = channel.id;

    if (message)
      settings.message = message;

    if (gif)
      settings.gif = gif;

    if (color)
      settings.color = color;

    saveConfig();

    const embed = new EmbedBuilder()
      .setTitle(
        system === "welcome"
          ? "🎉 Welcome System Enabled"
          : "👋 Goodbye System Enabled"
      )
      .setDescription(
        `Messages will now be sent to ${channel}.`
      )
      .addFields(
        {
          name: "Message",
          value:
            settings.message || "Default message"
        },
        {
          name: "Media",
          value:
            settings.gif
              ? "🎞️ GIF/Image configured"
              : "None"
        },
        {
          name: "Color",
          value: settings.color
        }
      )
      .setColor(settings.color)
      .setTimestamp();

    return interaction.reply({
      embeds: [embed]
    });
  }

  if (sub === "disable") {

    settings.enabled = false;

    saveConfig();

    return interaction.reply({
      content:
        `✅ ${system} messages have been disabled.`
    });
  }

  if (sub === "test") {

    if (!settings.channel) {
      return interaction.reply({
        content:
          `❌ ${system} isn't configured yet. Use \`/${system} setup\`.`,
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(
        replaceVariables(settings.title, interaction.member)
      )
      .setDescription(
        replaceVariables(
          settings.message,
          interaction.member
        )
      )
      .setColor(settings.color)
      .setThumbnail(
        interaction.user.displayAvatarURL({
          size: 256
        })
      )
      .setFooter({
        text: `${interaction.guild.name} • TEST`
      })
      .setTimestamp();

    const media =
      settings.gif || settings.image;

    if (validImage(media)) {
      embed.setImage(media);
    }

    return interaction.reply({
      embeds: [embed]
    });
  }
});

client.on("error", console.error);

process.on("unhandledRejection", error => {
  console.error("Unhandled rejection:", error);
});

client.login(process.env.DISCORD_TOKEN);









