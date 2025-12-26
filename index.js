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

// --- ระบบป้องกันบอทหลับ (Express Server) ---
const app = express();
app.get('/', (req, res) => res.send('บอทกำลังทำงานอยู่ (System is Live!)'));
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

// --- ลงทะเบียน Slash Command ---
const commands = [
    {
        name: 'แนะนำตัว',
        description: 'เริ่มต้นการแนะนำตัวเพื่อเข้าสู่เซิร์ฟเวอร์'
    }
];

client.once('ready', async () => {
    console.log(`✅ บอท ${client.user.tag} ออนไลน์และพร้อมใช้งานแล้ว!`);
    
    // Register Slash Commands แบบอัตโนมัติ
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        console.log('กำลังลงทะเบียน Slash Commands...');
        await rest.put(
            Routes.applicationGuildCommands(client.user.id, GUILD_ID),
            { body: commands }
        );
        console.log('✅ ลงทะเบียน Slash Commands สำเร็จ!');
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการลงทะเบียน Command:', error);
    }
});

// --- ฟังก์ชันส่งหน้าต่างแนะนำตัว ---
function sendIntroEmbed(target) {
    const embed = new EmbedBuilder()
        .setTitle('📝 ระบบแนะนำตัวเข้าเซิร์ฟเวอร์')
        .setDescription('กรุณากดปุ่มด้านล่างเพื่อกรอกข้อมูลแนะนำตัวและรับยศครับ')
        .setColor('#5865F2');

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('register_btn')
            .setLabel('เริ่มแนะนำตัว')
            .setButtonStyle(ButtonStyle.Primary)
    );

    return { embeds: [embed], components: [row] };
}

// --- รองรับทั้งพิมพ์ธรรมดา และ Slash Command ---
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.content === '/แนะนำตัว') {
        await message.channel.send(sendIntroEmbed(message));
    }
});

client.on('interactionCreate', async (interaction) => {
    // 1. ตอบสนองต่อ Slash Command
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'แนะนำตัว') {
            await interaction.reply(sendIntroEmbed(interaction));
        }
    }

    // 2. ตอบสนองต่อการกดปุ่ม (เปิด Modal)
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

        const sourceInput = new TextInputBuilder()
            .setCustomId('source')
            .setLabel('มาจากใคร / รู้จักเราจากไหน')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(ageInput),
            new ActionRowBuilder().addComponents(sourceInput)
        );

        await interaction.showModal(modal);
    }

    // 3. ตอบสนองเมื่อส่ง Modal (ให้ยศและส่ง Log)
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'register_modal') {
        const name = interaction.fields.getTextInputValue('name');
        const age = interaction.fields.getTextInputValue('age');
        const source = interaction.fields.getTextInputValue('source');
        const member = interaction.member;

        try {
            // ให้ยศสมาชิก
            const role = interaction.guild.roles.cache.get(ROLE_ID);
            if (role) await member.roles.add(role);

            // ส่ง Log ไปยังห้องที่กำหนด
            const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('📥 มีสมาชิกใหม่แนะนำตัวแล้ว')
                    .addFields(
                        { name: '👤 ชื่อเล่น', value: name, inline: true },
                        { name: '🎂 อายุ', value: age, inline: true },
                        { name: '🔗 มาจาก', value: source, inline: true },
                        { name: '🆔 บัญชี', value: `<@${member.id}>`, inline: false }
                    )
                    .setColor('#43B581')
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] });
            }

            await interaction.reply({ content: `✅ ขอบคุณครับคุณ **${name}** ยินดีต้อนรับสู่เซิร์ฟเวอร์!`, ephemeral: true });

        } catch (error) {
            console.error('❌ เกิดข้อผิดพลาด:', error);
            await interaction.reply({ content: '❌ เกิดข้อผิดพลาดในการรับยศ กรุณาติดต่อแอดมิน', ephemeral: true });
        }
    }
});

client.login(TOKEN);
