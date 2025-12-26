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

// --- 1. ระบบป้องกันบอทหลับ (Express Server) ---
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

// ข้อมูลสำหรับลงทะเบียนคำสั่ง Slash Command
const commands = [
    {
        name: 'แนะนำตัว',
        description: 'เริ่มต้นการแนะนำตัวเพื่อรับยศในเซิร์ฟเวอร์'
    }
];

// --- 3. เมื่อบอทพร้อมใช้งาน ---
client.once('ready', async () => {
    console.log(`✅ บอท ${client.user.tag} ออนไลน์แล้ว!`);
    
    // บังคับลงทะเบียน Slash Commands ใหม่ทุกครั้งที่รัน
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

// ฟังก์ชันสร้างหน้าต่างหลัก (Embed + ปุ่ม)
function getIntroMenu() {
    const embed = new EmbedBuilder()
        .setTitle('📝 แบบฟอร์มแนะนำตัว')
        .setDescription('ยินดีต้อนรับ! กรุณากดปุ่มด้านล่างเพื่อเริ่มแนะนำตัวครับ')
        .setColor('#00ff00');

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('btn_intro')
            .setLabel('เริ่มแนะนำตัว')
            .setButtonStyle(ButtonStyle.Primary
