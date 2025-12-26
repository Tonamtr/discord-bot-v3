const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
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
        description: 'กรอกข้อมูลแนะนำตัวเพื่อรับยศสมาชิก'
    }
];

// --- 3. เมื่อบอทออนไลน์ ---
client.once('ready', async () => {
    console.log(`✅ บอท ${client.user.tag} ออนไลน์แล้ว!`);
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        await rest.put(
            Routes.applicationGuildCommands(client.user.id, GUILD_ID),
            { body: commands }
        );
        console.log('✅ ลงทะเบียน Slash Commands สำเร็จ!');
    } catch (error) {
        console.error('❌ Error Registering Commands:', error);
    }
});

// --- 4. การจัดการคำสั่งและข้อมูล ---
client.on('interactionCreate', async (interaction) => {
    
    // เมื่อใช้คำสั่ง /แนะนำตัว -> ให้เด้งหน้าต่าง (Modal) ทันที
    if (interaction.isChatInputCommand() && interaction.commandName === 'แนะนำตัว') {
        const modal = new ModalBuilder()
            .setCustomId('modal_intro')
            .setTitle('แบบฟอร์มแนะนำตัวสมาชิกใหม่');

        const nameInput = new TextInputBuilder()
            .setCustomId('name_input').setLabel('ชื่อเล่น').setStyle(TextInputStyle.Short).setRequired(true);
        const ageInput = new TextInputBuilder()
            .setCustomId('age_input').setLabel('อายุ').setStyle(TextInputStyle.Short).setRequired(true);
        const sourceInput = new TextInputBuilder()
            .setCustomId('source_input').setLabel('รู้จักเราได้อย่างไร').setStyle(TextInputStyle.Paragraph).setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(ageInput),
            new ActionRowBuilder().addComponents(sourceInput)
        );

        return interaction.showModal(modal);
    }

    // เมื่อกดยืนยันในหน้าต่าง (Modal Submit)
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'modal_intro') {
        // แจ้ง Discord ว่าได้รับข้อมูลแล้ว
        await interaction.deferReply({ ephemeral: true });

        const name = interaction.fields.getTextInputValue('name_input');
        const age = interaction.fields.getTextInputValue('age_input');
        const source = interaction.fields.getTextInputValue('source_input');

        try {
            // 1. ให้ยศ
            const role = interaction.guild.roles.cache.get(ROLE_ID);
            if (role) await interaction.member.roles.add(role);

            // 2. ส่ง Log
            const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('📥 มีสมาชิกใหม่แนะนำตัว')
                    .addFields(
                        { name: '👤 ชื่อ', value: name, inline: true },
                        { name: '🎂 อายุ', value: age, inline: true },
                        { name: '🔗 แหล่งที่มา', value: source, inline: false },
                        { name: '🆔 บัญชี', value: `<@${interaction.user.id}>`, inline: false }
                    )
                    .setColor('#00FF00').setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }

            await interaction.editReply({ content: `✅ ขอบคุณครับคุณ **${name}** ยินดีต้อนรับเข้าสู่เซิร์ฟเวอร์!` });

        } catch (err) {
            console.error('❌ Error Giving Role/Logging:', err);
            await interaction.editReply({ content: '❌ เกิดข้อผิดพลาดในการรับยศ (ตรวจสอบสิทธิ์ยศบอทด้วยครับ)' });
        }
    }
});

client.login(TOKEN);
