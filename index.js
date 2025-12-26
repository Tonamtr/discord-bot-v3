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
    InteractionType 
} = require('discord.js');
const express = require('express');

// --- ระบบป้องกันบอทหลับ (Express Server) ---
const app = express();
app.get('/', (req, res) => res.send('บอทกำลังทำงานอยู่ (System is Live)!'));
app.listen(3000, () => {
    console.log('✅ Web Server พร้อมใช้งานที่พอร์ต 3000');
});

// --- ตั้งค่าบอท Discord ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ดึงค่าจาก Environment Variables ใน Render
const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const ROLE_ID = process.env.ROLE_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

client.once('ready', () => {
    console.log(`✅ บอท ${client.user.tag} ออนไลน์และพร้อมใช้งานแล้ว!`);
});

// --- คำสั่ง /แนะนำตัว ---
client.on('messageCreate', async (message) => {
    if (message.content === '/แนะนำตัว') {
        const embed = new EmbedBuilder()
            .setTitle('📝 ระบบแนะนำตัวเข้าเซิร์ฟเวอร์')
            .setDescription('กรุณากดปุ่มด้านล่างเพื่อกรอกข้อมูลแนะนำตัวและรับยศครับ')
            .setColor('#5865F2');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('register_btn')
                .setLabel('เริ่มแนะนำตัว')
                .setStyle(ButtonStyle.Primary)
        );

        await message.channel.send({ embeds: [embed], components: [row] });
    }
});

// --- ระบบ Modal (หน้าต่างกรอกข้อมูล) ---
client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton() && interaction.customId === 'register_btn') {
        const modal = new ModalBuilder()
            .setCustomId('register_modal')
            .setTitle('ข้อมูลแนะนำตัว');

        const nameInput = new TextInputBuilder()
            .setCustomId('name')
            .setLabel('ชื่อเล่น')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const ageInput = new TextInputBuilder()
            .setCustomId('age')
            .setLabel('อายุ')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(ageInput)
        );

        await interaction.showModal(modal);
    }

    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'register_modal') {
        const name = interaction.fields.getTextInputValue('name');
        const age = interaction.fields.getTextInputValue('age');
        const member = interaction.member;

        try {
            // 1. ให้ยศสมาชิก
            const role = interaction.guild.roles.cache.get(ROLE_ID);
            if (role) await member.roles.add(role);

            // 2. ส่ง Log ไปยังห้องที่กำหนด
            const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('📥 มีสมาชิกใหม่แนะนำตัว')
                    .addFields(
                        { name: '👤 ชื่อเล่น', value: name, inline: true },
                        { name: '🎂 อายุ', value: age, inline: true },
                        { name: '🆔 บัญชี', value: `<@${member.id}>`, inline: false }
                    )
                    .setColor('#43B581')
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }

            await interaction.reply({ content: `✅ ขอบคุณครับคุณ ${name} ยินดีต้อนรับสู่เซิร์ฟเวอร์!`, ephemeral: true });

        } catch (error) {
            console.error('❌ เกิดข้อผิดพลาด:', error);
            await interaction.reply({ content: '❌ เกิดข้อผิดพลาดในการรับยศ กรุณาติดต่อแอดมิน', ephemeral: true });
        }
    }
});

// --- ระบบ Login พร้อมตรวจสอบ Error ---
client.login(TOKEN).catch(err => {
    console.error('❌ ไม่สามารถ Login ได้:', err.message);
    if (err.message.includes('privileged intents')) {
        console.error('👉 วิธีแก้: อย่าลืมเปิด Privileged Gateway Intents ในหน้า Discord Developer Portal ให้ครบครับ!');
    }
});
