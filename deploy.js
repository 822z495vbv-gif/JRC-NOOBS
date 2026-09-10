require("dotenv").config();

const {
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType
} = require("discord.js");

const commands = [];

/*
|--------------------------------------------------------------------------
| MODERATION
|--------------------------------------------------------------------------
*/

commands.push(
    new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Warn a member.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member to warn.")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason for the warning.")
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    new SlashCommandBuilder()
        .setName("warnings")
        .setDescription("View a member's warnings.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("clearwarnings")
        .setDescription("Clear a member's warnings.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member.")
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

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
                .setDescription("Timeout duration.")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(40320)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason.")
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    new SlashCommandBuilder()
        .setName("untimeout")
        .setDescription("Remove a member's timeout.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member.")
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

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
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

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
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    new SlashCommandBuilder()
        .setName("unban")
        .setDescription("Unban a user.")
        .addStringOption(option =>
            option
                .setName("user")
                .setDescription("User ID.")
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    new SlashCommandBuilder()
        .setName("purge")
        .setDescription("Delete messages.")
        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription("Number of messages.")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    new SlashCommandBuilder()
        .setName("slowmode")
        .setDescription("Set channel slowmode.")
        .addIntegerOption(option =>
            option
                .setName("seconds")
                .setDescription("Seconds. Use 0 to disable.")
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(21600)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    new SlashCommandBuilder()
        .setName("lock")
        .setDescription("Lock the current channel.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    new SlashCommandBuilder()
        .setName("unlock")
        .setDescription("Unlock the current channel.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
);

/*
|--------------------------------------------------------------------------
| ROLES
|--------------------------------------------------------------------------
*/

commands.push(
    new SlashCommandBuilder()
        .setName("role")
        .setDescription("Manage server roles.")
        .addSubcommand(sub =>
            sub
                .setName("add")
                .setDescription("Give a role to a member.")
                .addUserOption(o =>
                    o.setName("user").setDescription("Member.").setRequired(true)
                )
                .addRoleOption(o =>
                    o.setName("role").setDescription("Role.").setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("remove")
                .setDescription("Remove a role from a member.")
                .addUserOption(o =>
                    o.setName("user").setDescription("Member.").setRequired(true)
                )
                .addRoleOption(o =>
                    o.setName("role").setDescription("Role.").setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("create")
                .setDescription("Create a role.")
                .addStringOption(o =>
                    o.setName("name").setDescription("Role name.").setRequired(true)
                )
                .addStringOption(o =>
                    o.setName("color").setDescription("#5865F2").setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("delete")
                .setDescription("Delete a role.")
                .addRoleOption(o =>
                    o.setName("role").setDescription("Role.").setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("info")
                .setDescription("View role information.")
                .addRoleOption(o =>
                    o.setName("role").setDescription("Role.").setRequired(true)
                )
        ),

    new SlashCommandBuilder()
        .setName("roles")
        .setDescription("List server roles."),

    new SlashCommandBuilder()
        .setName("nick")
        .setDescription("Change a member's nickname.")
        .addUserOption(o =>
            o.setName("user").setDescription("Member.").setRequired(true)
        )
        .addStringOption(o =>
            o.setName("nickname").setDescription("New nickname.").setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
);

/*
|--------------------------------------------------------------------------
| INFORMATION
|--------------------------------------------------------------------------
*/

commands.push(
    new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription("View server information."),

    new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription("View user information.")
        .addUserOption(o =>
            o.setName("user").setDescription("User.").setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("avatar")
        .setDescription("View a user's avatar.")
        .addUserOption(o =>
            o.setName("user").setDescription("User.").setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("botinfo")
        .setDescription("View JRC information."),

    new SlashCommandBuilder()
        .setName("about")
        .setDescription("About JRC."),

    new SlashCommandBuilder()
        .setName("uptime")
        .setDescription("View JRC uptime."),

    new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Check JRC latency.")
);

/*
|--------------------------------------------------------------------------
| SETUP
|--------------------------------------------------------------------------
*/

commands.push(
    new SlashCommandBuilder()
        .setName("setup")
        .setDescription("Open the interactive JRC setup panel.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
);

/*
|--------------------------------------------------------------------------
| LOGGING
|--------------------------------------------------------------------------
*/

commands.push(
    new SlashCommandBuilder()
        .setName("logs")
        .setDescription("Configure JRC logging.")
        .addSubcommand(sub =>
            sub
                .setName("channel")
                .setDescription("Set the logging channel.")
                .addChannelOption(o =>
                    o
                        .setName("channel")
                        .setDescription("Logging channel.")
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("enable")
                .setDescription("Enable logging.")
        )
        .addSubcommand(sub =>
            sub
                .setName("disable")
                .setDescription("Disable logging.")
        )
);

/*
|--------------------------------------------------------------------------
| SECURITY
|--------------------------------------------------------------------------
*/

commands.push(
    new SlashCommandBuilder()
        .setName("security")
        .setDescription("View JRC security status."),

    new SlashCommandBuilder()
        .setName("lockdown")
        .setDescription("Toggle server lockdown.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
);

/*
|--------------------------------------------------------------------------
| EMBEDS / UTILITY
|--------------------------------------------------------------------------
*/

commands.push(
    new SlashCommandBuilder()
        .setName("say")
        .setDescription("Send a JRC styled message.")
        .addStringOption(o =>
            o.setName("message").setDescription("Message.").setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    new SlashCommandBuilder()
        .setName("embed")
        .setDescription("Create an embed.")
        .addStringOption(o =>
            o.setName("title").setDescription("Embed title.").setRequired(true)
        )
        .addStringOption(o =>
            o.setName("description").setDescription("Description.").setRequired(true)
        )
        .addStringOption(o =>
            o.setName("color").setDescription("#5865F2").setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
);

/*
|--------------------------------------------------------------------------
| FUN
|--------------------------------------------------------------------------
*/

commands.push(
    new SlashCommandBuilder()
        .setName("8ball")
        .setDescription("Ask the magic 8ball.")
        .addStringOption(o =>
            o.setName("question").setDescription("Question.").setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("coinflip")
        .setDescription("Flip a coin."),

    new SlashCommandBuilder()
        .setName("roll")
        .setDescription("Roll a random number.")
        .addIntegerOption(o =>
            o
                .setName("max")
                .setDescription("Maximum number.")
                .setRequired(false)
                .setMinValue(2)
                .setMaxValue(1000000)
        ),

    new SlashCommandBuilder()
        .setName("dice")
        .setDescription("Roll dice.")
        .addIntegerOption(o =>
            o
                .setName("sides")
                .setDescription("Number of sides.")
                .setRequired(false)
                .setMinValue(2)
                .setMaxValue(1000)
        ),

    new SlashCommandBuilder()
        .setName("choose")
        .setDescription("Choose between options.")
        .addStringOption(o =>
            o
                .setName("options")
                .setDescription("Separate options with commas.")
                .setRequired(true)
        )
);

async function deploy() {
    const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

    console.log(`Deploying ${commands.length} JRC commands...`);

    await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        {
            body: commands.map(command => command.toJSON())
        }
    );

    console.log("✅ JRC slash commands deployed.");
}

deploy().catch(console.error);
