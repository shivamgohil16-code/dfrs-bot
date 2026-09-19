require('dotenv').config();
const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    MessageFlags
} = require('discord.js');
const { secondsToHMS, todayDDMMYYYY } = require('./src/time');
const { findUserRow, addQuotaSeconds, QUOTA_TARGET_SECONDS } = require('./src/sheets');

const TIMEZONE = process.env.TIMEZONE || 'Europe/London';
const RED = 0xed4245;
const GREEN = 0x57f287;

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once('ready', () => {
    console.log(`Defence Fire and Rescue Service Bot online as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'logpatrol') return;

    await interaction.deferReply();

    const username = interaction.options.getString('username', true);
    const seconds = interaction.options.getInteger('seconds', true);
    const screenshot = interaction.options.getAttachment('screenshot');

    try {
        const row = await findUserRow(username);

        if (!row) {
            await interaction.editReply({
                content: `Couldn't find **${username}** on the ORBAT sheet. Check the spelling matches the USERNAME column exactly, or add them to the sheet first.`
            });
            return;
        }

        const { newSeconds, newHMS, quotaMet } = await addQuotaSeconds(row, seconds);
        const date = todayDDMMYYYY(TIMEZONE);
        const converted = secondsToHMS(seconds);

        const embed = new EmbedBuilder()
            .setAuthor({ name: username })
            .setColor(quotaMet ? GREEN : RED)
            .addFields([
                { name: 'Username', value: username, inline: false },
                { name: 'Date', value: date, inline: false },
                { name: 'Seconds', value: String(seconds), inline: false },
                { name: 'Converted Time', value: converted, inline: false },
                {
                    name: 'Total Quota',
                    value: `${newHMS} / ${secondsToHMS(QUOTA_TARGET_SECONDS)}${quotaMet ? ' :white_check_mark: Quota complete' : ''}`,
                    inline: false
                }
            ])
            .setTimestamp(new Date());

        if (screenshot) {
            embed.setImage(screenshot.url);
        }

        const roleId = process.env.ORBAT_MANAGER_ROLE_ID;
        const content = roleId ? `<@&${roleId}>` : undefined;

        const targetChannel = process.env.LOG_CHANNEL_ID
            ? await client.channels.fetch(process.env.LOG_CHANNEL_ID).catch(() => null)
            : null;

        if (targetChannel && targetChannel.id !== interaction.channelId) {
            await targetChannel.send({
                content,
                embeds: [embed],
                allowedMentions: roleId ? { roles: [roleId] } : undefined
            });

            await interaction.editReply({
                content: `Logged ${converted} for **${username}** — see <#${targetChannel.id}>. New total: **${newHMS}**${quotaMet ? ' (quota complete :white_check_mark:)' : ''}.`
            });
        } else {
            await interaction.editReply({
                content,
                embeds: [embed],
                allowedMentions: roleId ? { roles: [roleId] } : undefined
            });
        }
    } catch (err) {
        console.error('logpatrol failed:', err);
        const message = 'Something went wrong logging that quota. Check the bot logs and that the Google Sheet is shared with the service account.';
        
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: message });
        } else {
            await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
const http = require('http');
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running!');
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Keep-alive server listening on port ${PORT}`));