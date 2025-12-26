const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    InteractionType,
    REST,
    Routes
} = require('discord.js');
const express = require('express');

// --- 1. ระบบป้องกันบอทหลับ ---
const app = express();
app.get('/', (req, res) => res.send('System is Live!'));
app.listen(3000, () => {
    console.log('✅ Web Server พร้อมใช้งานที่พอร์ต 3000');
});

// --- 2. ตั้งค่าบอท Discord ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const ROLE_ID = process.env.ROLE_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

const commands = [
    {
        name: 'แนะนำตัว',
        description: 'เริ่มต้นการแนะนำตัวเพื่อรับยศในเซิร์ฟเวอร์'
    }
];

// --- 3. เมื่อบอทพร้อมใช้งาน ---
client.once('ready', async () => {
    console.log(`✅ บอท ${client.user.tag} ออนไลน์แล้ว!`);
    
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        console.log('🔄 กำลังลงทะเบียน Slash Commands...');
        await rest.put(
            Routes.applicationGuildCommands(client.user.id, GUILD_ID),
            { body: commands }
        );
        console.log('✅ ลงทะเบียน Slash Commands สำเร็จ!');
    } catch (error) {
        console.error('❌ ไม่สามารถลงทะเบียนคำสั่งได้:', error);
    }
});

// ฟังก์ชันสร้างเมนูหลัก
function getIntroMenu() {
    const embed = new EmbedBuilder()
        .setTitle('📝 แบบฟอร์มแนะนำตัว')
        .setDescription('ยินดีต้อนรับ! กรุณากดปุ่มด้านล่างเพื่อเริ่มแนะนำตัวครับ')
        .setColor('#00ff00');

    const button = new ButtonBuilder()
        .setCustomId('btn_intro')
        .setLabel('เริ่มแนะนำตัว')
        .setButtonStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);
    
    return { embeds: [embed], components: [row] };
}

// --- 4. การจัดการ Interaction ---
client.on('interactionCreate', async (interaction) => {
    
    // ตอบสนองต่อ Slash Command
    if (interaction.isChatInputCommand() && interaction.commandName === 'แนะนำตัว') {
        return interaction.reply(getIntroMenu());
    }

    // ตอบสนองต่อการกดปุ่ม
    if (interaction.isButton() && interaction.customId === 'btn_intro') {
        const modal = new ModalBuilder()
            .setCustomId('modal_intro')
            .setTitle('ข้อมูลแนะนำตัว');

        const nameInput = new TextInputBuilder()
            .setCustomId('name_input')
            .setLabel('ชื่อเล่น')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const ageInput = new TextInputBuilder()
            .setCustomId('age_input')
            .setLabel('อายุ')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const sourceInput = new TextInputBuilder()
            .setCustomId('source_input')
            .setLabel('รู้จักเราได้ยังไง')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(ageInput),
            new ActionRowBuilder().addComponents(sourceInput)
        );
        
        return interaction.showModal(modal);
    }

    // ตอบสนองเมื่อส่ง Modal
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'modal_intro') {
        await interaction.deferReply({ ephemeral: true });

        const name = interaction.fields.getTextInputValue('name_input');
        const age = interaction.fields.getTextInputValue('age_input');
        const source = interaction.fields.getTextInputValue('source_input');

        try {
            const role = interaction.guild.roles.cache.get(ROLE_ID);
            if (role) await interaction.member.roles.add(role);

            const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('📥 สมาชิกใหม่แนะนำตัว')
                    .addFields(
                        { name: '👤 ชื่อ', value: name, inline: true },
                        { name: '🎂 อายุ', value: age, inline: true },
                        { name: '🔗 แหล่งที่มา', value: source, inline: true },
                        { name: '🆔 บัญชี', value: `<@${interaction.user.id}>`, inline: false }
                    )
                    .setColor('#5865F2')
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }

            await interaction.editReply({ content: `✅ ขอบคุณครับคุณ **${name}** แนะนำตัวเสร็จเรียบร้อย!` });
        } catch (err) {
            console.error('❌ Error:', err);
            await interaction.editReply({ content: '❌ มีข้อผิดพลาด (ตรวจสอบสิทธิ์ยศบอทด้วยครับ)' });
        }
    }
});

// รองรับการพิมพ์ข้อความปกติ
client.on('messageCreate', async (message) => {
    if (message.content === '/แนะนำตัว' && !message.author.bot) {
        await message.channel.send(getIntroMenu());
    }
});

client.login(TOKEN);
