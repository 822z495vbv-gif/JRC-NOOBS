require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    Partials,
    Events,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelSelectMenuBuilder,
    ChannelType,
    PermissionsBitField
} = require("discord.js");

const fs = require("fs");
const path = require("path");

/*
|--------------------------------------------------------------------------
| JRC CORE
|--------------------------------------------------------------------------
*/

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.GuildMember
    ]
});

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "config.json");

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, {
        recursive: true
    });
}

let database = {};

if (fs.existsSync(DATA_FILE)) {
    try {
        database = JSON.parse(
            fs.readFileSync(DATA_FILE, "utf8")
        );
    } catch {
        console.log("⚠️ Config file was invalid. Creating a new one.");
        database = {};
    }
}

/*
|--------------------------------------------------------------------------
| DATABASE
|--------------------------------------------------------------------------
*/

function saveDatabase() {
    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(database, null, 4)
    );
}

function defaultGreeting() {
    return {
        enabled: false,
        channelId: null,

        title: "Welcome!",
        message: "Welcome {user} to **{server}**!",

        color: "#5865F2",

        url: "",

        image: "",
        thumbnail: "",

        footer: "JRC",

        timestamp: true
    };
}

function defaultGuildConfig() {
    return {
        welcome: defaultGreeting(),

        goodbye: {
            ...defaultGreeting(),
            title: "Goodbye!",
            message: "{user} has left **{server}**."
        },

        logs: {
            enabled: false,
            channelId: null
        },

        warnings: {},

        lockdown: false
    };
}

function getGuildConfig(guildId) {
    if (!database[guildId]) {
        database[guildId] = defaultGuildConfig();

        saveDatabase();
    }

    return database[guildId];
}

/*
|--------------------------------------------------------------------------
| EMBED SYSTEM
|--------------------------------------------------------------------------
*/

const JRC = {
    primary: "#5865F2",
    success: "#57F287",
    danger: "#ED4245",
    warning: "#FEE75C",
    info: "#5865F2"
};

function jrcEmbed({
    title,
    description = "",
    color = JRC.primary,
    footer = "JRC • Server Management",
    timestamp = true
}) {
    const embed = new EmbedBuilder()
        .setTitle(`🛡️ ${title}`)
        .setDescription(description)
        .setColor(color);

    if (footer) {
        embed.setFooter({
            text: footer
        });
    }

    if (timestamp) {
        embed.setTimestamp();
    }

    return embed;
}

function success(message) {
    return jrcEmbed({
        title: "Success",
        description: `> ${message}`,
        color: JRC.success
    });
}

function error(message) {
    return jrcEmbed({
        title: "Something went wrong",
        description: `> ❌ ${message}`,
        color: JRC.danger
    });
}

function warning(message) {
    return jrcEmbed({
        title: "Warning",
        description: `> ⚠️ ${message}`,
        color: JRC.warning
    });
}

function info(message) {
    return jrcEmbed({
        title: "Information",
        description: message,
        color: JRC.info
    });
}

/*
|--------------------------------------------------------------------------
| TEXT HELPERS
|--------------------------------------------------------------------------
*/

function replaceVariables(text, member) {
    if (!text) {
        return "";
    }

    const guild = member.guild;

    return text
        .replaceAll("{user}", `<@${member.id}>`)
        .replaceAll("{username}", member.user.username)
        .replaceAll("{server}", guild.name)
        .replaceAll("{membercount}", String(guild.memberCount))
        .replaceAll("{id}", member.id);
}

function validHex(color) {
    return /^#[0-9A-F]{6}$/i.test(color);
}

/*
|--------------------------------------------------------------------------
| PERMISSIONS
|--------------------------------------------------------------------------
*/

async function checkPermission(interaction, permission) {
    if (!interaction.member.permissions.has(permission)) {
        await interaction.reply({
            embeds: [
                error(
                    "You don't have permission to use this command."
                )
            ],
            ephemeral: true
        });

        return false;
    }

    return true;
}

function hierarchyError(actor, target, clientMember) {
    if (!target) {
        return "That member could not be found.";
    }

    if (target.id === actor.id) {
        return "You cannot moderate yourself.";
    }

    if (target.id === clientMember.id) {
        return "I cannot moderate myself.";
    }

    if (
        target.roles.highest.position >=
        actor.roles.highest.position
    ) {
        return "That member has an equal or higher role than you.";
    }

    if (
        target.roles.highest.position >=
        clientMember.roles.highest.position
    ) {
        return "That member's highest role is above my highest role.";
    }

    return null;
}

/*
|--------------------------------------------------------------------------
| LOGGING
|--------------------------------------------------------------------------
*/

async function sendLog(
    guild,
    title,
    description,
    color = JRC.primary
) {
    const config = getGuildConfig(guild.id);

    if (!config.logs.enabled) {
        return;
    }

    if (!config.logs.channelId) {
        return;
    }

    const channel = guild.channels.cache.get(
        config.logs.channelId
    );

    if (!channel || !channel.isTextBased()) {
        return;
    }

    const embed = jrcEmbed({
        title,
        description,
        color,
        footer: "JRC • Audit Log"
    });

    await channel.send({
        embeds: [embed]
    }).catch(() => {});
}

/*
|--------------------------------------------------------------------------
| GREETING EMBED
|--------------------------------------------------------------------------
*/

function buildGreetingEmbed(config, member) {
    const embed = new EmbedBuilder()
        .setTitle(
            replaceVariables(
                config.title,
                member
            )
        )
        .setDescription(
            replaceVariables(
                config.message,
                member
            )
        )
        .setColor(
            validHex(config.color)
                ? config.color
                : JRC.primary
        );

    if (config.url) {
        embed.setURL(config.url);
    }

    if (config.image) {
        embed.setImage(config.image);
    }

    if (config.thumbnail) {
        embed.setThumbnail(config.thumbnail);
    }

    if (config.footer) {
        embed.setFooter({
            text: replaceVariables(
                config.footer,
                member
            )
        });
    }

    if (config.timestamp) {
        embed.setTimestamp();
    }

    return embed;
}

/*
|--------------------------------------------------------------------------
| SEND GREETING
|--------------------------------------------------------------------------
*/

async function sendGreeting(member, type) {
    const guildConfig = getGuildConfig(member.guild.id);

    const config = guildConfig[type];

    if (!config.enabled) {
        return;
    }

    if (!config.channelId) {
        return;
    }

    const channel = member.guild.channels.cache.get(
        config.channelId
    );

    if (!channel || !channel.isTextBased()) {
        return;
    }

    const embed = buildGreetingEmbed(
        config,
        member
    );

    await channel.send({
        embeds: [embed]
    }).catch(() => {});
}

/*
|--------------------------------------------------------------------------
| INTERACTIVE SETUP
|--------------------------------------------------------------------------
*/

function setupMainPanel() {
    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("jrc_setup_welcome")
                .setLabel("Welcome")
                .setEmoji("👋")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId("jrc_setup_goodbye")
                .setLabel("Goodbye")
                .setEmoji("🚪")
                .setStyle(ButtonStyle.Primary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("jrc_preview_welcome")
                .setLabel("Preview Welcome")
                .setEmoji("👀")
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId("jrc_preview_goodbye")
                .setLabel("Preview Goodbye")
                .setEmoji("👀")
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId("jrc_setup_reset")
                .setLabel("Reset")
                .setEmoji("♻️")
                .setStyle(ButtonStyle.Danger)
        );

    return [row1, row2];
}

function greetingPanel(type, guild) {
    const config = getGuildConfig(guild.id)[type];

    const displayName =
        type === "welcome"
            ? "Welcome"
            : "Goodbye";

    const status =
        config.enabled
            ? "🟢 **Enabled**"
            : "🔴 **Disabled**";

    const channel =
        config.channelId
            ? `<#${config.channelId}>`
            : "`Not configured`";

    const embed = jrcEmbed({
        title: `${displayName} Configuration`,
        description:
            `Configure your **${displayName} system** below.\n\n` +

            `### Status\n` +
            `${status}\n\n` +

            `### Channel\n` +
            `${channel}\n\n` +

            `### Greeting\n` +
            `**Title:** ${config.title || "`None`"}\n` +
            `**Message:** ${config.message || "`None`"}\n\n` +

            `### Appearance\n` +
            `**Color:** \`${config.color}\`\n` +
            `**Embed URL:** ${config.url || "`None`"}\n` +
            `**Image/GIF:** ${config.image || "`None`"}\n` +
            `**Thumbnail:** ${config.thumbnail || "`None`"}\n` +
            `**Footer:** ${config.footer || "`None`"}\n` +
            `**Timestamp:** ${config.timestamp ? "Enabled" : "Disabled"}`,

        color:
            validHex(config.color)
                ? config.color
                : JRC.primary,

        footer:
            `JRC • ${displayName} Setup`
    });

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(
                    `jrc_toggle_${type}`
                )
                .setLabel(
                    config.enabled
                        ? "Disable"
                        : "Enable"
                )
                .setEmoji(
                    config.enabled
                        ? "🔴"
                        : "🟢"
                )
                .setStyle(
                    config.enabled
                        ? ButtonStyle.Danger
                        : ButtonStyle.Success
                ),

            new ButtonBuilder()
                .setCustomId(
                    `jrc_config_${type}`
                )
                .setLabel("Configure")
                .setEmoji("⚙️")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId(
                    `jrc_extra_${type}`
                )
                .setLabel("Appearance")
                .setEmoji("🎨")
                .setStyle(ButtonStyle.Secondary)
        );

    const channelSelect =
        new ChannelSelectMenuBuilder()
            .setCustomId(
                `jrc_channel_${type}`
            )
            .setPlaceholder(
                `Select ${displayName.toLowerCase()} channel`
            )
            .setChannelTypes(
                ChannelType.GuildText
            );

    const row2 = new ActionRowBuilder()
        .addComponents(channelSelect);

    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(
                    `jrc_preview_${type}`
                )
                .setLabel("Preview")
                .setEmoji("👀")
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId(
                    `jrc_test_${type}`
                )
                .setLabel("Send Test")
                .setEmoji("🧪")
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId(
                    "jrc_setup_back"
                )
                .setLabel("Back")
                .setEmoji("↩️")
                .setStyle(ButtonStyle.Secondary)
        );

    return {
        embeds: [embed],
        components: [
            row1,
            row2,
            row3
        ]
    };
}

/*
|--------------------------------------------------------------------------
| READY
|--------------------------------------------------------------------------
*/

client.once(
    Events.ClientReady,
    async readyClient => {
        console.log("");
        console.log("================================");
        console.log("        JRC V2 ONLINE");
        console.log("================================");
        console.log(`🤖 ${readyClient.user.tag}`);
        console.log(`🌐 ${readyClient.guilds.cache.size} servers`);
        console.log(`📡 ${readyClient.ws.ping}ms`);
        console.log("================================");
        console.log("");

        readyClient.user.setPresence({
            activities: [
                {
                    name: "/help • JRC",
                    type: 0
                }
            ],
            status: "online"
        });
    }
);

/*
|--------------------------------------------------------------------------
| MEMBER JOIN
|--------------------------------------------------------------------------
*/

client.on(
    Events.GuildMemberAdd,
    async member => {

        await sendGreeting(
            member,
            "welcome"
        );

        await sendLog(
            member.guild,
            "Member Joined",
            `👤 **Member:** ${member.user}\n` +
            `**Username:** ${member.user.tag}\n` +
            `**ID:** \`${member.id}\`\n` +
            `**Account Created:** <t:${Math.floor(
                member.user.createdTimestamp / 1000
            )}:F>`,
            JRC.success
        );
    }
);

/*
|--------------------------------------------------------------------------
| MEMBER LEAVE
|--------------------------------------------------------------------------
*/

client.on(
    Events.GuildMemberRemove,
    async member => {

        await sendGreeting(
            member,
            "goodbye"
        );

        await sendLog(
            member.guild,
            "Member Left",
            `👤 **Member:** ${member.user.tag}\n` +
            `**ID:** \`${member.id}\``,
            JRC.danger
        );
    }
);

/*
|--------------------------------------------------------------------------
| MESSAGE DELETE
|--------------------------------------------------------------------------
*/

client.on(
    Events.MessageDelete,
    async message => {

        if (!message.guild) {
            return;
        }

        if (message.author?.bot) {
            return;
        }

        await sendLog(
            message.guild,
            "Message Deleted",
            `🗑️ **Channel:** ${message.channel}\n` +
            `**Author:** ${message.author || "Unknown"}\n\n` +
            `**Content:**\n${message.content
                ? message.content.slice(0, 1000)
                : "`Content unavailable`"}`,
            JRC.danger
        );
    }
);

/*
|--------------------------------------------------------------------------
| MESSAGE EDIT
|--------------------------------------------------------------------------
*/

client.on(
    Events.MessageUpdate,
    async (oldMessage, newMessage) => {

        if (!newMessage.guild) {
            return;
        }

        if (newMessage.author?.bot) {
            return;
        }

        if (
            oldMessage.content ===
            newMessage.content
        ) {
            return;
        }

        await sendLog(
            newMessage.guild,
            "Message Edited",
            `✏️ **Channel:** ${newMessage.channel}\n` +
            `**Author:** ${newMessage.author}\n\n` +
            `**Before:**\n${oldMessage.content
                ?.slice(0, 500) || "`Unavailable`"}\n\n` +
            `**After:**\n${newMessage.content
                ?.slice(0, 500) || "`Unavailable`"}`,
            JRC.warning
        );
    }
);

/*
|--------------------------------------------------------------------------
| INTERACTION HANDLER
|--------------------------------------------------------------------------
*/

client.on(
    Events.InteractionCreate,
    async interaction => {

        try {

            /*
            |--------------------------------------------------------------------------
            | SLASH COMMANDS
            |--------------------------------------------------------------------------
            */

            if (interaction.isChatInputCommand()) {

                const command =
                    interaction.commandName;

                /*
                |--------------------------------------------------------------------------
                | PING
                |--------------------------------------------------------------------------
                */

                if (command === "ping") {

                    return interaction.reply({
                        embeds: [
                            jrcEmbed({
                                title: "Pong!",
                                description:
                                    `🏓 **${client.ws.ping}ms**`,
                                color: JRC.success
                            })
                        ]
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | HELP
                |--------------------------------------------------------------------------
                */

                if (command === "help") {

                    const embed =
                        jrcEmbed({
                            title: "JRC Command Center",
                            description:
                                `Welcome to **JRC** — your all-in-one server management bot.\n\n` +

                                `### 🛡️ Moderation\n` +
                                "`/warn` `/warnings` `/clearwarnings`\n" +
                                "`/timeout` `/untimeout` `/kick` `/ban` `/unban`\n" +
                                "`/purge` `/slowmode` `/lock` `/unlock`\n\n" +

                                `### 👤 Server Management\n` +
                                "`/role add` `/role remove` `/role create`\n" +
                                "`/role delete` `/role info` `/roles`\n" +
                                "`/nick` `/serverinfo` `/userinfo` `/avatar`\n\n" +

                                `### 👋 Welcome / Goodbye\n` +
                                "`/setup`\n\n" +

                                `### 📋 Logging\n` +
                                "`/logs` `/logs channel` `/logs enable` `/logs disable`\n\n" +

                                `### 🔐 Security\n` +
                                "`/security` `/lockdown` `/lock` `/unlock` `/slowmode`\n\n" +

                                `### 🎨 Utility\n` +
                                "`/embed` `/say` `/ping` `/serverinfo` `/userinfo` `/avatar` `/botinfo`\n\n" +

                                `### 😂 Fun\n` +
                                "`/8ball` `/coinflip` `/roll` `/choose` `/dice`\n\n" +

                                `### ⚙️ Bot\n` +
                                "`/help` `/about` `/uptime`"
                        });

                    return interaction.reply({
                        embeds: [embed]
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | BOT INFO
                |--------------------------------------------------------------------------
                */

                if (
                    command === "botinfo" ||
                    command === "about"
                ) {

                    return interaction.reply({
                        embeds: [
                            jrcEmbed({
                                title: "JRC",
                                description:
                                    `🛡️ **JRC Server Management**\n\n` +
                                    `A polished moderation and utility bot built for Discord servers.\n\n` +
                                    `**Servers:** ${client.guilds.cache.size}\n` +
                                    `**Ping:** ${client.ws.ping}ms\n` +
                                    `**Node:** ${process.version}\n` +
                                    `**discord.js:** v14`,
                                color: JRC.primary
                            })
                        ]
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | UPTIME
                |--------------------------------------------------------------------------
                */

                if (command === "uptime") {

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
                            (seconds % 86400) /
                            3600
                        );

                    const minutes =
                        Math.floor(
                            (seconds % 3600) /
                            60
                        );

                    const secs =
                        seconds % 60;

                    return interaction.reply({
                        embeds: [
                            jrcEmbed({
                                title: "JRC Uptime",
                                description:
                                    `⏱️ **${days}d ${hours}h ${minutes}m ${secs}s**`,
                                color: JRC.success
                            })
                        ]
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | WARN
                |--------------------------------------------------------------------------
                */

                if (command === "warn") {

                    if (
                        !await checkPermission(
                            interaction,
                            PermissionsBitField.Flags.ModerateMembers
                        )
                    ) {
                        return;
                    }

                    const member =
                        interaction.options.getMember(
                            "user"
                        );

                    const reason =
                        interaction.options.getString(
                            "reason"
                        ) ||
                        "No reason provided.";

                    const hierarchy =
                        hierarchyError(
                            interaction.member,
                            member,
                            interaction.guild.members.me
                        );

                    if (hierarchy) {
                        return interaction.reply({
                            embeds: [error(hierarchy)],
                            ephemeral: true
                        });
                    }

                    const config =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    if (
                        !config.warnings[member.id]
                    ) {
                        config.warnings[
                            member.id
                        ] = [];
                    }

                    config.warnings[
                        member.id
                    ].push({
                        reason,
                        moderator:
                            interaction.user.id,
                        timestamp: Date.now()
                    });

                    saveDatabase();

                    await sendLog(
                        interaction.guild,
                        "Member Warned",
                        `⚠️ **Member:** ${member}\n` +
                        `**Reason:** ${reason}\n` +
                        `**Moderator:** ${interaction.user}\n` +
                        `**Total Warnings:** ${config.warnings[member.id].length}`,
                        JRC.warning
                    );

                    return interaction.reply({
                        embeds: [
                            success(
                                `${member} has been warned.\n\n**Reason:** ${reason}`
                            )
                        ]
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | WARNINGS
                |--------------------------------------------------------------------------
                */

                if (command === "warnings") {

                    const member =
                        interaction.options.getMember(
                            "user"
                        );

                    const config =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    const warnings =
                        config.warnings[
                            member.id
                        ] || [];

                    if (
                        warnings.length === 0
                    ) {
                        return interaction.reply({
                            embeds: [
                                info(
                                    `${member} has no warnings.`
                                )
                            ]
                        });
                    }

                    const list =
                        warnings
                            .map(
                                (warning, index) =>
                                    `**${index + 1}.** ${warning.reason}\n` +
                                    `Moderator: <@${warning.moderator}> • ` +
                                    `<t:${Math.floor(
                                        warning.timestamp / 1000
                                    )}:R>`
                            )
                            .join("\n\n");

                    return interaction.reply({
                        embeds: [
                            jrcEmbed({
                                title:
                                    `Warnings • ${member.user.tag}`,
                                description:
                                    list,
                                color:
                                    JRC.warning
                            })
                        ]
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | CLEAR WARNINGS
                |--------------------------------------------------------------------------
                */

                if (
                    command ===
                    "clearwarnings"
                ) {

                    if (
                        !await checkPermission(
                            interaction,
                            PermissionsBitField.Flags.ModerateMembers
                        )
                    ) {
                        return;
                    }

                    const member =
                        interaction.options.getMember(
                            "user"
                        );

                    const config =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    config.warnings[
                        member.id
                    ] = [];

                    saveDatabase();

                    await sendLog(
                        interaction.guild,
                        "Warnings Cleared",
                        `🧹 **Member:** ${member}\n` +
                        `**Moderator:** ${interaction.user}`,
                        JRC.info
                    );

                    return interaction.reply({
                        embeds: [
                            success(
                                `Cleared all warnings for ${member}.`
                            )
                        ]
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | TIMEOUT
                |--------------------------------------------------------------------------
                */

                if (command === "timeout") {

                    if (
                        !await checkPermission(
                            interaction,
                            PermissionsBitField.Flags.ModerateMembers
                        )
                    ) {
                        return;
                    }

                    const member =
                        interaction.options.getMember(
                            "user"
                        );

                    const minutes =
                        interaction.options.getInteger(
                            "minutes"
                        );

                    const reason =
                        interaction.options.getString(
                            "reason"
                        ) ||
                        "No reason provided.";

                    const hierarchy =
                        hierarchyError(
                            interaction.member,
                            member,
                            interaction.guild.members.me
                        );

                    if (hierarchy) {
                        return interaction.reply({
                            embeds: [error(hierarchy)],
                            ephemeral: true
                        });
                    }

                    await member.timeout(
                        minutes * 60 * 1000,
                        reason
                    );

                    await sendLog(
                        interaction.guild,
                        "Member Timed Out",
                        `⏱️ **Member:** ${member}\n` +
                        `**Duration:** ${minutes} minutes\n` +
                        `**Reason:** ${reason}\n` +
                        `**Moderator:** ${interaction.user}`,
                        JRC.warning
                    );

                    return interaction.reply({
                        embeds: [
                            success(
                                `${member} has been timed out for **${minutes} minutes**.`
                            )
                        ]
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | UNTIMEOUT
                |--------------------------------------------------------------------------
                */

                if (
                    command === "untimeout"
                ) {

                    if (
                        !await checkPermission(
                            interaction,
                            PermissionsBitField.Flags.ModerateMembers
                        )
                    ) {
                        return;
                    }

                    const member =
                        interaction.options.getMember(
                            "user"
                        );

                    await member.timeout(
                        null
                    );

                    await sendLog(
                        interaction.guild,
                        "Timeout Removed",
                        `🔓 **Member:** ${member}\n` +
                        `**Moderator:** ${interaction.user}`,
                        JRC.success
                    );

                    return interaction.reply({
                        embeds: [
                            success(
                                `${member} is no longer timed out.`
                            )
                        ]
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | KICK
                |--------------------------------------------------------------------------
                */

                if (command === "kick") {

                    if (
                        !await checkPermission(
                            interaction,
                            PermissionsBitField.Flags.KickMembers
                        )
                    ) {
                        return;
                    }

                    const member =
                        interaction.options.getMember(
                            "user"
                        );

                    const reason =
                        interaction.options.getString(
                            "reason"
                        ) ||
                        "No reason provided.";

                    const hierarchy =
                        hierarchyError(
                            interaction.member,
                            member,
                            interaction.guild.members.me
                        );

                    if (hierarchy) {
                        return interaction.reply({
                            embeds: [error(hierarchy)],
                            ephemeral: true
                        });
                    }

                    await member.kick(reason);

                    await sendLog(
                        interaction.guild,
                        "Member Kicked",
                        `👢 **Member:** ${member.user.tag}\n` +
                        `**Reason:** ${reason}\n` +
                        `**Moderator:** ${interaction.user}`,
                        JRC.danger
                    );

                    return interaction.reply({
                        embeds: [
                            success(
                                `Kicked **${member.user.tag}**.`
                            )
                        ]
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | BAN
                |--------------------------------------------------------------------------
                */

                if (command === "ban") {

                    if (
                        !await checkPermission(
                            interaction,
                            PermissionsBitField.Flags.BanMembers
                        )
                    ) {
                        return;
                    }

                    const member =
                        interaction.options.getMember(
                            "user"
                        );

                    const reason =
                        interaction.options.getString(
                            "reason"
                        ) ||
                        "No reason provided.";

                    const hierarchy =
                        hierarchyError(
                            interaction.member,
                            member,
                            interaction.guild.members.me
                        );

                    if (hierarchy) {
                        return interaction.reply({
                            embeds: [error(hierarchy)],
                            ephemeral: true
                        });
                    }

                    await member.ban({
                        reason
                    });

                    await sendLog(
                        interaction.guild,
                        "Member Banned",
                        `🔨 **Member:** ${member.user.tag}\n` +
                        `**Reason:** ${reason}\n` +
                        `**Moderator:** ${interaction.user}`,
                        JRC.danger
                    );

                    return interaction.reply({
                        embeds: [
                            success(
                                `Banned **${member.user.tag}**.`
                            )
                        ]
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | UNBAN
                |--------------------------------------------------------------------------
                */

                if (command === "unban") {

                    if (
                        !await checkPermission(
                            interaction,
                            PermissionsBitField.Flags.BanMembers
                        )
                    ) {
                        return;
                    }

                    const id =
                        interaction.options.getString(
                            "user"
                        );

                    try {

                        await interaction.guild.members.unban(
                            id
                        );

                    } catch {
                        return interaction.reply({
                            embeds: [
                                error(
                                    "That user is not banned or the ID is invalid."
                                )
                            ],
                            ephemeral: true
                        });
                    }

                    await sendLog(
                        interaction.guild,
                        "User Unbanned",
                        `🔓 **User ID:** \`${id}\`\n` +
                        `**Moderator:** ${interaction.user}`,
                        JRC.success
                    );

                    return interaction.reply({
                        embeds: [
                            success(
                                `Unbanned user \`${id}\`.`
                            )
                        ]
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | PURGE
                |--------------------------------------------------------------------------
                */

                if (command === "purge") {

                    if (
                        !await checkPermission(
                            interaction,
                            PermissionsBitField.Flags.ManageMessages
                        )
                    ) {
                        return;
                    }

                    const amount =
                        interaction.options.getInteger(
                            "amount"
                        );

                    const deleted =
                        await interaction.channel.bulkDelete(
                            amount,
                            true
                        );

                    await sendLog(
                        interaction.guild,
                        "Messages Purged",
                        `🗑️ **Channel:** ${interaction.channel}\n` +
                        `**Messages:** ${deleted.size}\n` +
                        `**Moderator:** ${interaction.user}`,
                        JRC.danger
                    );

                    return interaction.reply({
                        embeds: [
                            success(
                                `Deleted **${deleted.size} messages**.`
                            )
                        ],
                        ephemeral: true
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | SLOWMODE
                |--------------------------------------------------------------------------
                */

                if (
                    command === "slowmode"
                ) {

                    if (
                        !await checkPermission(
                            interaction,
                            PermissionsBitField.Flags.ManageChannels
                        )
                    ) {
                        return;
                    }

                    const seconds =
                        interaction.options.getInteger(
                            "seconds"
                        );

                    await interaction.channel.setRateLimitPerUser(
                        seconds
                    );

                    return interaction.reply({
                        embeds: [
                            success(
                                seconds === 0
                                    ? "Slowmode disabled."
                                    : `Slowmode set to **${seconds} seconds**.`
                            )
                        ]
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | LOCK
                |--------------------------------------------------------------------------
                */

                if (command === "lock") {

                    if (
                        !await checkPermission(
                            interaction,
                            PermissionsBitField.Flags.ManageChannels
                        )
                    ) {
                        return;
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
                        `🔒 **Channel:** ${interaction.channel}\n` +
                        `**Moderator:** ${interaction.user}`,
                        JRC.warning
                    );

                    return interaction.reply({
                        embeds: [
                            success(
                                `🔒 Locked ${interaction.channel}.`
                            )
                        ]
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | UNLOCK
                |--------------------------------------------------------------------------
                */

                if (command === "unlock") {

                    if (
                        !await checkPermission(
                            interaction,
                            PermissionsBitField.Flags.ManageChannels
                        )
                    ) {
                        return;
                    }

                    await interaction.channel.permissionOverwrites.edit(
                        interaction.guild.roles.everyone,
                        {
                            SendMessages: null
                        }
                    );

                    await sendLog(
                        interaction.guild,
                        "Channel Unlocked",
                        `🔓 **Channel:** ${interaction.channel}\n` +
                        `**Moderator:** ${interaction.user}`,
                        JRC.success
                    );

                    return interaction.reply({
                        embeds: [
                            success(
                                `🔓 Unlocked ${interaction.channel}.`
                            )
                        ]
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | ROLE
                |--------------------------------------------------------------------------
                */

                if (command === "role") {

                    if (
                        !await checkPermission(
                            interaction,
                            PermissionsBitField.Flags.ManageRoles
                        )
                    ) {
                        return;
                    }

                    const subcommand =
                        interaction.options.getSubcommand();

                    const me =
                        interaction.guild.members.me;

                    if (
                        subcommand === "add" ||
                        subcommand === "remove"
                    ) {

                        const member =
                            interaction.options.getMember(
                                "user"
                            );

                        const role =
                            interaction.options.getRole(
                                "role"
                            );

                        if (
                            role.position >=
                            me.roles.highest.position
                        ) {
                            return interaction.reply({
                                embeds: [
                                    error(
                                        "I cannot manage that role because it is above my highest role."
                                    )
                                ],
                                ephemeral: true
                            });
                        }

                        if (
                            role.position >=
                            interaction.member.roles.highest.position
                        ) {
                            return interaction.reply({
                                embeds: [
                                    error(
                                        "You cannot manage a role equal to or higher than your highest role."
                                    )
                                ],
                                ephemeral: true
                            });
                        }

                        if (
                            subcommand === "add"
                        ) {

                            await member.roles.add(
                                role
                            );

                            await sendLog(
                                interaction.guild,
                                "Role Added",
                                `➕ **Member:** ${member}\n` +
                                `**Role:** ${role}\n` +
                                `**Moderator:** ${interaction.user}`,
                                JRC.success
                            );

                            return interaction.reply({
                                embeds: [
                                    success(
                                        `Added ${role} to ${member}.`
                                    )
                                ]
                            });
                        }

                        await member.roles.remove(
                            role
                        );

                        await sendLog(
                            interaction.guild,
                            "Role Removed",
                            `➖ **Member:** ${member}\n` +
                            `**Role:** ${role}\n` +
                            `**Moderator:** ${interaction.user}`,
                            JRC.warning
                        );

                        return interaction.reply({
                            embeds: [
                                success(
                                    `Removed ${role} from ${member}.`
                                )
                            ]
                        });
                    }

                    if (
                        subcommand ===
                        "create"
                    ) {

                        const name =
                            interaction.options.getString(
                                "name"
                            );

                        const color =
                            interaction.options.getString(
                                "color"
                            );

                        if (
                            color &&
                            !validHex(color)
                        ) {
                            return interaction.reply({
                                embeds: [
                                    error(
                                        "Color must be in HEX format, for example `#5865F2`."
                                    )
                                ],
                                ephemeral: true
                            });
                        }

                        const role =
                            await interaction.guild.roles.create({
                                name,
                                color:
                                    color ||
                                    undefined,
                                reason:
                                    `Created by ${interaction.user.tag}`
                            });

                        return interaction.reply({
                            embeds: [
                                success(
                                    `Created ${role}.`
                                )
                            ]
                        });
                    }

                    if (
                        subcommand ===
                        "delete"
                    ) {

                        const role =
                            interaction.options.getRole(
                                "role"
                            );

                        if (
                            role.position >=
                            interaction.guild.members.me.roles.highest.position
                        ) {
                            return interaction.reply({
                                embeds: [
                                    error(
                                        "I cannot delete that role."
                                    )
                                ],
                                ephemeral: true
                            });
                        }

                        await role.delete();

                        return interaction.reply({
                            embeds: [
                                success(
                                    `Deleted **${role.name}**.`
                                )
                            ]
                        });
                    }

                    if (
                        subcommand ===
                        "info"
                    ) {

                        const role =
                            interaction.options.getRole(
                                "role"
                            );

                        return interaction.reply({
                            embeds: [
                                jrcEmbed({
                                    title:
                                        `Role • ${role.name}`,
                                    description:
                                        `**ID:** \`${role.id}\`\n` +
                                        `**Position:** ${role.position}\n` +
                                        `**Members:** ${role.members.size}\n` +
                                        `**Mentionable:** ${role.mentionable ? "Yes" : "No"}\n` +
                                        `**Hoisted:** ${role.hoist ? "Yes" : "No"}`,
                                    color:
                                        role.hexColor
                                })
                            ]
                        });
                    }
                }

                /*
                |--------------------------------------------------------------------------
                | ROLES
                |--------------------------------------------------------------------------
                */

                if (command === "roles") {

                    const roles =
                        interaction.guild.roles.cache
                            .filter(
                                role =>
                                    role.id !==
                                    interaction.guild.id
                            )
                            .sort(
                                (a, b) =>
                                    b.position -
                                    a.position
                            )
                            .map(
                                role =>
                                    `${role} \`${role.id}\``
                            );

                    const chunks =
                        roles.slice(0, 40);

                    return interaction.reply({
                        embeds: [
                            jrcEmbed({
                                title:
                                    "Server Roles",
                                description:
                                    chunks.length
                                        ? chunks.join("\n")
                                        : "No roles found."
                            })
                        ]
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | NICK
                |--------------------------------------------------------------------------
                */

                if (command === "nick") {

                    if (
                        !await checkPermission(
                            interaction,
                            PermissionsBitField.Flags.ManageNicknames
                        )
                    ) {
                        return;
                    }

                    const member =
                        interaction.options.getMember(
                            "user"
                        );

                    const nickname =
                        interaction.options.getString(
                            "nickname"
                        );

                    const hierarchy =
                        hierarchyError(
                            interaction.member,
                            member,
                            interaction.guild.members.me
                        );

                    if (hierarchy) {
                        return interaction.reply({
                            embeds: [error(hierarchy)],
                            ephemeral: true
                        });
                    }

                    await member.setNickname(
                        nickname || null
                    );

                    return interaction.reply({
                        embeds: [
                            success(
                                nickname
                                    ? `Nickname changed to **${nickname}**.`
                                    : "Nickname reset."
                            )
                        ]
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | SERVER INFO
                |--------------------------------------------------------------------------
                */

                if (
                    command === "serverinfo"
                ) {

                    const guild =
                        interaction.guild;

                    return interaction.reply({
                        embeds: [
                            jrcEmbed({
                                title:
                                    guild.name,
                                description:
                                    `**Owner:** <@${guild.ownerId}>\n` +
                                    `**Members:** ${guild.memberCount}\n` +
                                    `**Channels:** ${guild.channels.cache.size}\n` +
                                    `**Roles:** ${guild.roles.cache.size}\n` +
                                    `**Boost Level:** ${guild.premiumTier}\n` +
                                    `**Boosts:** ${guild.premiumSubscriptionCount || 0}\n` +
                                    `**Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:F>`,
                                color:
                                    JRC.primary
                            })
                        ]
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | USER INFO
                |--------------------------------------------------------------------------
                */

                if (
                    command === "userinfo"
                ) {

                    const member =
                        interaction.options.getMember(
                            "user"
                        ) ||
                        interaction.member;

                    const roles =
                        member.roles.cache
                            .filter(
                                role =>
                                    role.id !==
                                    interaction.guild.id
                            )
                            .sort(
                                (a, b) =>
                                    b.position -
                                    a.position
                            )
                            .map(
                                role =>
                                    role.toString()
                            )
                            .slice(0, 20)
                            .join(" ");

                    const embed =
                        new EmbedBuilder()
                            .setTitle(
                                `👤 ${member.user.tag}`
                            )
                            .setThumbnail(
                                member.user.displayAvatarURL({
                                    size: 512
                                })
                            )
                            .setColor(
                                JRC.primary
                            )
                            .addFields(
                                {
                                    name:
                                        "User ID",
                                    value:
                                        `\`${member.id}\``,
                                    inline:
                                        true
                                },
                                {
                                    name:
                                        "Joined",
                                    value:
                                        `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
                                    inline:
                                        true
                                },
                                {
                                    name:
                                        "Account",
                                    value:
                                        `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
                                    inline:
                                        true
                                },
                                {
                                    name:
                                        "Roles",
                                    value:
                                        roles ||
                                        "None"
                                }
                            )
                            .setFooter({
                                text:
                                    "JRC • User Information"
                            })
                            .setTimestamp();

                    return interaction.reply({
                        embeds: [embed]
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | AVATAR
                |--------------------------------------------------------------------------
                */

                if (
                    command === "avatar"
                ) {

                    const user =
                        interaction.options.getUser(
                            "user"
                        ) ||
                        interaction.user;

                    return interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle(
                                    `🖼️ ${user.username}'s Avatar`
                                )
                                .setDescription(
                                    `[Open Full Resolution Avatar](${user.displayAvatarURL({
                                        size: 4096,
                                        extension: "png"
                                    })})`
                                )
                                .setImage(
                                    user.displayAvatarURL({
                                        size: 1024
                                    })
                                )
                                .setColor(
                                    JRC.primary
                                )
                                .setFooter({
                                    text:
                                        "JRC • Avatar"
                                })
                        ]
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | SETUP
                |--------------------------------------------------------------------------
                */

                if (command === "setup") {

                    if (
                        !await checkPermission(
                            interaction,
                            PermissionsBitField.Flags.ManageGuild
                        )
                    ) {
                        return;
                    }

                    const embed =
                        jrcEmbed({
                            title:
                                "JRC Greeting Setup",
                            description:
                                `Configure your **Welcome** and **Goodbye** systems from this control panel.\n\n` +
                                `👋 **Welcome** — Configure new-member greetings.\n` +
                                `🚪 **Goodbye** — Configure member-leave messages.\n\n` +
                                `Use **Preview** to see the current configuration before enabling it.`
                        });

                    return interaction.reply({
                        embeds: [embed],
                        components:
                            setupMainPanel()
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | LOGS
                |--------------------------------------------------------------------------
                */

                if (command === "logs") {

                    if (
                        !await checkPermission(
                            interaction,
                            PermissionsBitField.Flags.ManageGuild
                        )
                    ) {
                        return;
                    }

                    const subcommand =
                        interaction.options.getSubcommand();

                    const config =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    if (
                        subcommand ===
                        "channel"
                    ) {

                        const channel =
                            interaction.options.getChannel(
                                "channel"
                            );

                        config.logs.channelId =
                            channel.id;

                        saveDatabase();

                        return interaction.reply({
                            embeds: [
                                success(
                                    `Logging channel set to ${channel}.`
                                )
                            ]
                        });
                    }

                    if (
                        subcommand ===
                        "enable"
                    ) {

                        if (
                            !config.logs.channelId
                        ) {
                            return interaction.reply({
                                embeds: [
                                    error(
                                        "Set a logging channel first with `/logs channel`."
                                    )
                                ],
                                ephemeral: true
                            });
                        }

                        config.logs.enabled =
                            true;

                        saveDatabase();

                        return interaction.reply({
                            embeds: [
                                success(
                                    "Automatic logging has been enabled."
                                )
                            ]
                        });
                    }

                    if (
                        subcommand ===
                        "disable"
                    ) {

                        config.logs.enabled =
                            false;

                        saveDatabase();

                        return interaction.reply({
                            embeds: [
                                success(
                                    "Automatic logging has been disabled."
                                )
                            ]
                        });
                    }
                }

                /*
                |--------------------------------------------------------------------------
                | SECURITY
                |--------------------------------------------------------------------------
                */

                if (
                    command === "security"
                ) {

                    const config =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    return interaction.reply({
                        embeds: [
                            jrcEmbed({
                                title:
                                    "JRC Security",
                                description:
                                    `🔐 **Server Lockdown:** ${config.lockdown ? "🟢 ACTIVE" : "🔴 INACTIVE"}\n\n` +
                                    `**Logging:** ${config.logs.enabled ? "🟢 Enabled" : "🔴 Disabled"}\n` +
                                    `**Log Channel:** ${config.logs.channelId ? `<#${config.logs.channelId}>` : "Not configured"}\n\n` +
                                    `Use \`/lockdown\` to toggle server lockdown.`,
                                color:
                                    config.lockdown
                                        ? JRC.danger
                                        : JRC.success
                            })
                        ]
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | LOCKDOWN
                |--------------------------------------------------------------------------
                */

                if (
                    command === "lockdown"
                ) {

                    if (
                        !await checkPermission(
                            interaction,
                            PermissionsBitField.Flags.ManageChannels
                        )
                    ) {
                        return;
                    }

                    const config =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    config.lockdown =
                        !config.lockdown;

                    saveDatabase();

                    const everyone =
                        interaction.guild.roles.everyone;

                    let changed = 0;

                    for (
                        const channel
                        of interaction.guild.channels.cache.values()
                    ) {

                        if (
                            !channel.permissionOverwrites
                        ) {
                            continue;
                        }

                        await channel.permissionOverwrites
                            .edit(
                                everyone,
                                {
                                    SendMessages:
                                        config.lockdown
                                            ? false
                                            : null
                                }
                            )
                            .then(() => {
                                changed++;
                            })
                            .catch(() => {});
                    }

                    await sendLog(
                        interaction.guild,
                        config.lockdown
                            ? "Server Lockdown Enabled"
                            : "Server Lockdown Disabled",
                        `${config.lockdown ? "🔒" : "🔓"} **Moderator:** ${interaction.user}\n` +
                        `**Channels affected:** ${changed}`,
                        config.lockdown
                            ? JRC.danger
                            : JRC.success
                    );

                    return interaction.reply({
                        embeds: [
                            success(
                                config.lockdown
                                    ? `🔒 Server lockdown enabled. **${changed} channels** updated.`
                                    : `🔓 Server lockdown disabled. **${changed} channels** updated.`
                            )
                        ]
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | SAY
                |--------------------------------------------------------------------------
                */

                if (command === "say") {

                    if (
                        !await checkPermission(
                            interaction,
                            PermissionsBitField.Flags.ManageMessages
                        )
                    ) {
                        return;
                    }

                    const message =
                        interaction.options.getString(
                            "message"
                        );

                    await interaction.channel.send({
                        embeds: [
                            jrcEmbed({
                                title: "JRC",
                                description:
                                    message
                            })
                        ]
                    });

                    return interaction.reply({
                        embeds: [
                            success(
                                "Message sent."
                            )
                        ],
                        ephemeral: true
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | EMBED
                |--------------------------------------------------------------------------
                */

                if (
                    command === "embed"
                ) {

                    if (
                        !await checkPermission(
                            interaction,
                            PermissionsBitField.Flags.ManageMessages
                        )
                    ) {
                        return;
                    }

                    const title =
                        interaction.options.getString(
                            "title"
                        );

                    const description =
                        interaction.options.getString(
                            "description"
                        );

                    const color =
                        interaction.options.getString(
                            "color"
                        ) ||
                        JRC.primary;

                    if (
                        !validHex(color)
                    ) {
                        return interaction.reply({
                            embeds: [
                                error(
                                    "Invalid HEX color."
                                )
                            ],
                            ephemeral: true
                        });
                    }

                    await interaction.channel.send({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle(title)
                                .setDescription(
                                    description
                                )
                                .setColor(color)
                                .setFooter({
                                    text:
                                        "JRC"
                                })
                                .setTimestamp()
                        ]
                    });

                    return interaction.reply({
                        embeds: [
                            success(
                                "Embed sent."
                            )
                        ],
                        ephemeral: true
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | 8BALL
                |--------------------------------------------------------------------------
                */

                if (
                    command === "8ball"
                ) {

                    const answers = [
                        "Absolutely.",
                        "Definitely.",
                        "Yes.",
                        "Most likely.",
                        "Probably.",
                        "Maybe.",
                        "Ask again later.",
                        "Probably not.",
                        "No.",
                        "Absolutely not."
                    ];

                    const result =
                        answers[
                            Math.floor(
                                Math.random() *
                                answers.length
                            )
                        ];

                    return interaction.reply({
                        embeds: [
                            jrcEmbed({
                                title:
                                    "Magic 8Ball",
                                description:
                                    `🎱 **${result}**`
                            })
                        ]
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | COINFLIP
                |--------------------------------------------------------------------------
                */

                if (
                    command ===
                    "coinflip"
                ) {

                    const result =
                        Math.random() <
                        0.5
                            ? "Heads"
                            : "Tails";

                    return interaction.reply({
                        embeds: [
                            jrcEmbed({
                                title:
                                    "Coinflip",
                                description:
                                    `🪙 **${result}!**`
                            })
                        ]
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | ROLL
                |--------------------------------------------------------------------------
                */

                if (
                    command === "roll"
                ) {

                    const max =
                        interaction.options.getInteger(
                            "max"
                        ) ||
                        100;

                    const result =
                        Math.floor(
                            Math.random() *
                            max
                        ) + 1;

                    return interaction.reply({
                        embeds: [
                            jrcEmbed({
                                title:
                                    "Roll",
                                description:
                                    `🎲 You rolled **${result} / ${max}**`
                            })
                        ]
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | DICE
                |--------------------------------------------------------------------------
                */

                if (
                    command === "dice"
                ) {

                    const sides =
                        interaction.options.getInteger(
                            "sides"
                        ) ||
                        6;

                    const result =
                        Math.floor(
                            Math.random() *
                            sides
                        ) + 1;

                    return interaction.reply({
                        embeds: [
                            jrcEmbed({
                                title:
                                    "Dice",
                                description:
                                    `🎲 You rolled **${result}** on a **D${sides}**.`
                            })
                        ]
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | CHOOSE
                |--------------------------------------------------------------------------
                */

                if (
                    command === "choose"
                ) {

                    const input =
                        interaction.options.getString(
                            "options"
                        );

                    const options =
                        input
                            .split(",")
                            .map(
                                option =>
                                    option.trim()
                            )
                            .filter(
                                Boolean
                            );

                    if (
                        options.length <
                        2
                    ) {
                        return interaction.reply({
                            embeds: [
                                error(
                                    "Give me at least two options separated by commas."
                                )
                            ],
                            ephemeral: true
                        });
                    }

                    const selected =
                        options[
                            Math.floor(
                                Math.random() *
                                options.length
                            )
                        ];

                    return interaction.reply({
                        embeds: [
                            jrcEmbed({
                                title:
                                    "Choose",
                                description:
                                    `🎯 I choose **${selected}**`
                            })
                        ]
                    });
                }
            }

            /*
            |--------------------------------------------------------------------------
            | BUTTONS
            |--------------------------------------------------------------------------
            */

            if (interaction.isButton()) {

                if (
                    !interaction.member.permissions.has(
                        PermissionsBitField.Flags.ManageGuild
                    )
                ) {
                    return interaction.reply({
                        embeds: [
                            error(
                                "You need **Manage Server** permission to use this panel."
                            )
                        ],
                        ephemeral: true
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | WELCOME / GOODBYE DASHBOARD
                |--------------------------------------------------------------------------
                */

                if (
                    interaction.customId ===
                    "jrc_setup_welcome"
                ) {

                    const panel =
                        greetingPanel(
                            "welcome",
                            interaction.guild
                        );

                    return interaction.update(
                        panel
                    );
                }

                if (
                    interaction.customId ===
                    "jrc_setup_goodbye"
                ) {

                    const panel =
                        greetingPanel(
                            "goodbye",
                            interaction.guild
                        );

                    return interaction.update(
                        panel
                    );
                }

                /*
                |--------------------------------------------------------------------------
                | BACK
                |--------------------------------------------------------------------------
                */

                if (
                    interaction.customId ===
                    "jrc_setup_back"
                ) {

                    return interaction.update({
                        embeds: [
                            jrcEmbed({
                                title:
                                    "JRC Greeting Setup",
                                description:
                                    "Choose the greeting system you want to configure."
                            })
                        ],
                        components:
                            setupMainPanel()
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | TOGGLE
                |--------------------------------------------------------------------------
                */

                if (
                    interaction.customId.startsWith(
                        "jrc_toggle_"
                    )
                ) {

                    const type =
                        interaction.customId.replace(
                            "jrc_toggle_",
                            ""
                        );

                    const config =
                        getGuildConfig(
                            interaction.guild.id
                        )[type];

                    config.enabled =
                        !config.enabled;

                    saveDatabase();

                    return interaction.update(
                        greetingPanel(
                            type,
                            interaction.guild
                        )
                    );
                }

                /*
                |--------------------------------------------------------------------------
                | CONFIGURE MODAL
                |--------------------------------------------------------------------------
                */

                if (
                    interaction.customId.startsWith(
                        "jrc_config_"
                    )
                ) {

                    const type =
                        interaction.customId.replace(
                            "jrc_config_",
                            ""
                        );

                    const config =
                        getGuildConfig(
                            interaction.guild.id
                        )[type];

                    const name =
                        type === "welcome"
                            ? "Welcome"
                            : "Goodbye";

                    const modal =
                        new ModalBuilder()
                            .setCustomId(
                                `jrc_modal_${type}`
                            )
                            .setTitle(
                                `${name} Configuration`
                            );

                    const title =
                        new TextInputBuilder()
                            .setCustomId(
                                "title"
                            )
                            .setLabel(
                                "Greeting Title"
                            )
                            .setStyle(
                                TextInputStyle.Short
                            )
                            .setRequired(
                                false
                            )
                            .setValue(
                                config.title ||
                                ""
                            )
                            .setMaxLength(
                                256
                            );

                    const message =
                        new TextInputBuilder()
                            .setCustomId(
                                "message"
                            )
                            .setLabel(
                                "Greeting Message"
                            )
                            .setStyle(
                                TextInputStyle.Paragraph
                            )
                            .setRequired(
                                false
                            )
                            .setValue(
                                config.message ||
                                ""
                            )
                            .setMaxLength(
                                4000
                            );

                    const color =
                        new TextInputBuilder()
                            .setCustomId(
                                "color"
                            )
                            .setLabel(
                                "Embed Color"
                            )
                            .setStyle(
                                TextInputStyle.Short
                            )
                            .setRequired(
                                false
                            )
                            .setValue(
                                config.color ||
                                JRC.primary
                            );

                    const url =
                        new TextInputBuilder()
                            .setCustomId(
                                "url"
                            )
                            .setLabel(
                                "Embed URL"
                            )
                            .setStyle(
                                TextInputStyle.Short
                            )
                            .setRequired(
                                false
                            )
                            .setValue(
                                config.url ||
                                ""
                            );

                    const image =
                        new TextInputBuilder()
                            .setCustomId(
                                "image"
                            )
                            .setLabel(
                                "Image / GIF URL"
                            )
                            .setStyle(
                                TextInputStyle.Short
                            )
                            .setRequired(
                                false
                            )
                            .setValue(
                                config.image ||
                                ""
                            );

                    modal.addComponents(
                        new ActionRowBuilder()
                            .addComponents(
                                title
                            ),

                        new ActionRowBuilder()
                            .addComponents(
                                message
                            ),

                        new ActionRowBuilder()
                            .addComponents(
                                color
                            ),

                        new ActionRowBuilder()
                            .addComponents(
                                url
                            ),

                        new ActionRowBuilder()
                            .addComponents(
                                image
                            )
                    );

                    return interaction.showModal(
                        modal
                    );
                }

                /*
                |--------------------------------------------------------------------------
                | APPEARANCE MODAL
                |--------------------------------------------------------------------------
                */

                if (
                    interaction.customId.startsWith(
                        "jrc_extra_"
                    )
                ) {

                    const type =
                        interaction.customId.replace(
                            "jrc_extra_",
                            ""
                        );

                    const config =
                        getGuildConfig(
                            interaction.guild.id
                        )[type];

                    const modal =
                        new ModalBuilder()
                            .setCustomId(
                                `jrc_extra_modal_${type}`
                            )
                            .setTitle(
                                "Appearance Settings"
                            );

                    const thumbnail =
                        new TextInputBuilder()
                            .setCustomId(
                                "thumbnail"
                            )
                            .setLabel(
                                "Thumbnail URL"
                            )
                            .setStyle(
                                TextInputStyle.Short
                            )
                            .setRequired(
                                false
                            )
                            .setValue(
                                config.thumbnail ||
                                ""
                            );

                    const footer =
                        new TextInputBuilder()
                            .setCustomId(
                                "footer"
                            )
                            .setLabel(
                                "Footer"
                            )
                            .setStyle(
                                TextInputStyle.Short
                            )
                            .setRequired(
                                false
                            )
                            .setValue(
                                config.footer ||
                                ""
                            );

                    const timestamp =
                        new TextInputBuilder()
                            .setCustomId(
                                "timestamp"
                            )
                            .setLabel(
                                "Timestamp: true / false"
                            )
                            .setStyle(
                                TextInputStyle.Short
                            )
                            .setRequired(
                                false
                            )
                            .setValue(
                                config.timestamp
                                    ? "true"
                                    : "false"
                            );

                    modal.addComponents(
                        new ActionRowBuilder()
                            .addComponents(
                                thumbnail
                            ),

                        new ActionRowBuilder()
                            .addComponents(
                                footer
                            ),

                        new ActionRowBuilder()
                            .addComponents(
                                timestamp
                            )
                    );

                    return interaction.showModal(
                        modal
                    );
                }

                /*
                |--------------------------------------------------------------------------
                | PREVIEW
                |--------------------------------------------------------------------------
                */

                if (
                    interaction.customId.startsWith(
                        "jrc_preview_"
                    )
                ) {

                    const type =
                        interaction.customId.replace(
                            "jrc_preview_",
                            ""
                        );

                    const config =
                        getGuildConfig(
                            interaction.guild.id
                        )[type];

                    const embed =
                        buildGreetingEmbed(
                            config,
                            interaction.member
                        );

                    return interaction.reply({
                        embeds: [embed],
                        ephemeral: true
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | TEST
                |--------------------------------------------------------------------------
                */

                if (
                    interaction.customId.startsWith(
                        "jrc_test_"
                    )
                ) {

                    const type =
                        interaction.customId.replace(
                            "jrc_test_",
                            ""
                        );

                    const config =
                        getGuildConfig(
                            interaction.guild.id
                        )[type];

                    if (
                        !config.channelId
                    ) {
                        return interaction.reply({
                            embeds: [
                                error(
                                    "Select a channel first."
                                )
                            ],
                            ephemeral: true
                        });
                    }

                    const channel =
                        interaction.guild.channels.cache.get(
                            config.channelId
                        );

                    if (
                        !channel ||
                        !channel.isTextBased()
                    ) {
                        return interaction.reply({
                            embeds: [
                                error(
                                    "The configured channel no longer exists."
                                )
                            ],
                            ephemeral: true
                        });
                    }

                    const embed =
                        buildGreetingEmbed(
                            config,
                            interaction.member
                        );

                    await channel.send({
                        embeds: [embed]
                    });

                    return interaction.reply({
                        embeds: [
                            success(
                                `Test ${type} message sent to ${channel}.`
                            )
                        ],
                        ephemeral: true
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | RESET
                |--------------------------------------------------------------------------
                */

                if (
                    interaction.customId ===
                    "jrc_setup_reset"
                ) {

                    const config =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    config.welcome =
                        defaultGreeting();

                    config.goodbye =
                        {
                            ...defaultGreeting(),
                            title:
                                "Goodbye!",
                            message:
                                "{user} has left **{server}**."
                        };

                    saveDatabase();

                    return interaction.update({
                        embeds: [
                            success(
                                "Welcome and Goodbye configuration has been completely reset."
                            )
                        ],
                        components: []
                    });
                }
            }

            /*
            |--------------------------------------------------------------------------
            | CHANNEL SELECT
            |--------------------------------------------------------------------------
            */

            if (
                interaction.isChannelSelectMenu()
            ) {

                if (
                    interaction.customId.startsWith(
                        "jrc_channel_"
                    )
                ) {

                    const type =
                        interaction.customId.replace(
                            "jrc_channel_",
                            ""
                        );

                    const channel =
                        interaction.channels.first();

                    const config =
                        getGuildConfig(
                            interaction.guild.id
                        )[type];

                    config.channelId =
                        channel.id;

                    saveDatabase();

                    return interaction.update(
                        greetingPanel(
                            type,
                            interaction.guild
                        )
                    );
                }
            }

            /*
            |--------------------------------------------------------------------------
            | MODALS
            |--------------------------------------------------------------------------
            */

            if (
                interaction.isModalSubmit()
            ) {

                /*
                |--------------------------------------------------------------------------
                | GREETING CONFIG
                |--------------------------------------------------------------------------
                */

                if (
                    interaction.customId.startsWith(
                        "jrc_modal_"
                    )
                ) {

                    const type =
                        interaction.customId.replace(
                            "jrc_modal_",
                            ""
                        );

                    const config =
                        getGuildConfig(
                            interaction.guild.id
                        )[type];

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

                    const image =
                        interaction.fields.getTextInputValue(
                            "image"
                        );

                    if (
                        color &&
                        !validHex(color)
                    ) {
                        return interaction.reply({
                            embeds: [
                                error(
                                    "The color must be a valid HEX color such as `#5865F2`."
                                )
                            ],
                            ephemeral: true
                        });
                    }

                    config.title =
                        title ||
                        config.title;

                    config.message =
                        message ||
                        config.message;

                    config.color =
                        color ||
                        config.color;

                    config.url =
                        url;

                    config.image =
                        image;

                    saveDatabase();

                    return interaction.reply({
                        embeds: [
                            success(
                                `The ${type} greeting configuration was updated.`
                            )
                        ],
                        ephemeral: true
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | APPEARANCE CONFIG
                |--------------------------------------------------------------------------
                */

                if (
                    interaction.customId.startsWith(
                        "jrc_extra_modal_"
                    )
                ) {

                    const type =
                        interaction.customId.replace(
                            "jrc_extra_modal_",
                            ""
                        );

                    const config =
                        getGuildConfig(
                            interaction.guild.id
                        )[type];

                    config.thumbnail =
                        interaction.fields.getTextInputValue(
                            "thumbnail"
                        );

                    config.footer =
                        interaction.fields.getTextInputValue(
                            "footer"
                        );

                    const timestamp =
                        interaction.fields.getTextInputValue(
                            "timestamp"
                        );

                    config.timestamp =
                        timestamp.toLowerCase() !==
                        "false";

                    saveDatabase();

                    return interaction.reply({
                        embeds: [
                            success(
                                `Appearance settings for ${type} have been updated.`
                            )
                        ],
                        ephemeral: true
                    });
                }
            }

        } catch (err) {

            console.error(
                "Interaction error:",
                err
            );

            if (
                interaction.replied ||
                interaction.deferred
            ) {
                await interaction.followUp({
                    embeds: [
                        error(
                            "An unexpected error occurred while processing that interaction."
                        )
                    ],
                    ephemeral: true
                }).catch(() => {});
            } else {
                await interaction.reply({
                    embeds: [
                        error(
                            "An unexpected error occurred while processing that interaction."
                        )
                    ],
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
);

/*
|--------------------------------------------------------------------------
| PROCESS ERROR HANDLING
|--------------------------------------------------------------------------
*/

process.on(
    "unhandledRejection",
    error => {
        console.error(
            "Unhandled Promise Rejection:",
            error
        );
    }
);

process.on(
    "uncaughtException",
    error => {
        console.error(
            "Uncaught Exception:",
            error
        );
    }
);

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
*/

client.login(
    process.env.TOKEN
);
