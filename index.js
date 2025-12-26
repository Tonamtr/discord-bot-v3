const express = require("express");
const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  Routes,
  EmbedBuilder,
} = require("discord.js");
const { REST } = require("@discordjs/rest");

// --- 1. ระบบรักษาการออนไลน์ (Uptime) ---
const app = express();
app.get("/", (req, res) => res.send("บอทแนะนำตัวออนไลน์แล้ว!"));
app.listen(3000);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

// --- 2. การสร้างคำสั่ง Slash Command ---
const commands = [
  new SlashCommandBuilder()
    .setName("แนะนำตัว")
    .setDescription("กรอกข้อมูลแนะนำตัวเพื่อรับยศและเข้าสู่เซิร์ฟเวอร์")
    .addStringOption((opt) =>
      opt.setName("ชื่อ").setDescription("ชื่อเล่นของคุณ").setRequired(true),
    )
    .addIntegerOption((opt) =>
      opt
        .setName("อายุ")
        .setDescription("อายุของคุณ (ตัวเลข)")
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("มาจากใคร")
        .setDescription("คนที่แนะนำคุณมา หรือรู้จักเราจากไหน")
        .setRequired(true),
    ),
].map((command) => command.toJSON());

// --- 3. ลงทะเบียนคำสั่งเมื่อบอทพร้อม ---
client.on("ready", async () => {
  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
  try {
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID),
      { body: commands },
    );
    console.log(
      `✅ บอท ${client.user.tag} พร้อมใช้งานและแยกห้อง Log เรียบร้อย!`,
    );
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการลงทะเบียนคำสั่ง:", error);
  }
});

// --- 4. ระบบรับข้อมูล/ให้ยศ/แยกห้องส่งข้อมูล ---
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "แนะนำตัว") {
    const name = interaction.options.getString("ชื่อ");
    const age = interaction.options.getInteger("อายุ");
    const ref = interaction.options.getString("มาจากใคร");

    try {
      // --- ส่วนที่ 1: ให้ยศสมาชิก ---
      const role = interaction.guild.roles.cache.get(process.env.ROLE_ID);
      if (role) {
        await interaction.member.roles.add(role);
      }

      // --- ส่วนที่ 2: ส่งข้อมูลสรุปไปที่ "ห้องยืนยันสำเร็จ" (LOG_CHANNEL_ID) ---
      const logChannel = interaction.guild.channels.cache.get(
        process.env.LOG_CHANNEL_ID,
      );
      const successEmbed = new EmbedBuilder()
        .setTitle("🎉 มีสมาชิกใหม่แนะนำตัวสำเร็จ!")
        .setColor(0x2ecc71) // สีเขียว
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields(
          {
            name: "👤 สมาชิก",
            value: `${interaction.user} (${interaction.user.tag})`,
            inline: false,
          },
          { name: "📝 ชื่อเล่น", value: name, inline: true },
          { name: "🎂 อายุ", value: `${age} ปี`, inline: true },
          { name: "🔗 แนะนำโดย", value: ref, inline: false },
        )
        .setTimestamp()
        .setFooter({ text: `ID: ${interaction.user.id}` });

      if (logChannel) {
        await logChannel.send({ embeds: [successEmbed] });
      }

      // --- ส่วนที่ 3: ตอบกลับผู้ใช้ (เห็นเฉพาะเจ้าตัว) ---
      await interaction.reply({
        content: `✅ บันทึกข้อมูลเรียบร้อยและคุณได้รับยศสมาชิกแล้ว! ยินดีต้อนรับครับคุณ **${name}**`,
        ephemeral: true,
      });

      // --- ส่วนที่ 4: ส่งวิธีใช้งานกลับมาที่ "ห้องแนะนำตัว" (ให้คนต่อไปเห็น) ---
      const helpEmbed = new EmbedBuilder()
        .setTitle("📢 วิธีการแนะนำตัวเพื่อรับยศสมาชิก")
        .setDescription("หากคุณยังไม่ได้รับยศ โปรดทำตามขั้นตอนด้านล่างนี้:")
        .setColor(0x3498db) // สีฟ้า
        .addFields(
          {
            name: "1. พิมพ์คำสั่ง",
            value: "พิมพ์ `/แนะนำตัว` ในช่องแชทนี้",
            inline: false,
          },
          {
            name: "2. กรอกข้อมูล",
            value: "ใส่ชื่อ, อายุ และคนที่แนะนำมาให้ครบถ้วน",
            inline: false,
          },
          {
            name: "3. กดส่ง",
            value:
              "เมื่อส่งแล้ว ระบบจะให้ยศสมาชิกและส่งข้อมูลคุณไปที่ห้อง Log ทันที!",
            inline: false,
          },
        )
        .setFooter({ text: "ระบบแนะนำตัวอัตโนมัติ 24 ชม." });

      await interaction.channel.send({ embeds: [helpEmbed] });
    } catch (err) {
      console.error("เกิดข้อผิดพลาด:", err);
      if (!interaction.replied) {
        await interaction.reply({
          content:
            "❌ เกิดข้อผิดพลาด: บอทอาจจะไม่มีสิทธิ์ให้ยศ หรือตั้งค่า ID ใน Secrets ผิด",
          ephemeral: true,
        });
      }
    }
  }
});

client.login(process.env.TOKEN);
