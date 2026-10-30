require("dotenv").config();
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

const command = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("نشر الصور الثلاث مع زر حفظ")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addChannelOption(option =>
    option.setName("room")
      .setDescription("الروم الذي سيتم نشر الصور فيه")
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName("image1")
      .setDescription("رابط الصورة الأولى")
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName("image2")
      .setDescription("رابط الصورة الثانية")
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName("image3")
      .setDescription("رابط الصورة الثالثة")
      .setRequired(true)
  );

const required = ["DISCORD_TOKEN", "CLIENT_ID", "GUILD_ID"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing ${key} in .env`);
    process.exit(1);
  }
}

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: [command.toJSON()] }
    );
    console.log("تم تسجيل أمر /setup في السيرفر.");
  } catch (error) {
    console.error("فشل تسجيل الأمر:", error);
    process.exitCode = 1;
  }
})();