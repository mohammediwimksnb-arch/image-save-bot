require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits
} = require("discord.js");

const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) {
  console.error("ضع DISCORD_TOKEN داخل ملف .env");
  process.exit(1);
}

const DATA_FILE = path.join(__dirname, "saved-posts.json");

function readStore() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return {};
  }
}

function writeStore(store) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

// نقبل روابط HTTPS فقط. يفضّل أن تكون روابط مباشرة لملفات الصور.
function isValidImageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function makeImageEmbed(url, title) {
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(title)
    .setImage(url);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("ready", () => {
  console.log(`تم تشغيل البوت: ${client.user.tag}`);
});

client.on("interactionCreate", async interaction => {
  // أمر إعداد ونشر الصور
  if (interaction.isChatInputCommand() && interaction.commandName === "setup") {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: "❌ هذا الأمر للإدارة فقط.",
        ephemeral: true
      });
    }

    const channel = interaction.options.getChannel("room");
    const image1 = interaction.options.getString("image1").trim();
    const image2 = interaction.options.getString("image2").trim();
    const image3 = interaction.options.getString("image3").trim();

    if (!channel || channel.type !== ChannelType.GuildText) {
      return interaction.reply({
        content: "❌ اختر روم نصي عادي.",
        ephemeral: true
      });
    }

    if (![image1, image2, image3].every(isValidImageUrl)) {
      return interaction.reply({
        content: "❌ تأكد أن روابط الصور صحيحة وتبدأ بـ https://",
        ephemeral: true
      });
    }

    const botMember = interaction.guild.members.me;
    const permissions = channel.permissionsFor(botMember);
    if (!permissions?.has([
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.EmbedLinks
    ])) {
      return interaction.reply({
        content: "❌ البوت يحتاج صلاحيات View Channel وSend Messages وEmbed Links في الروم المحدد.",
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      // الصورتان الأولى والثانية في رسالة واحدة
      const firstMessage = await channel.send({
        embeds: [
          makeImageEmbed(image1, "الصورة الأولى"),
          makeImageEmbed(image2, "الصورة الثانية")
        ]
      });

      // الصورة الثالثة في رسالة منفصلة مع زر الحفظ
      const saveButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("save_three_images")
          .setLabel("حفظ الصور")
          .setEmoji("💾")
          .setStyle(ButtonStyle.Success)
      );

      const thirdMessage = await channel.send({
        embeds: [makeImageEmbed(image3, "الصورة الثالثة")],
        components: [saveButton]
      });

      // نخزّن الروابط على رسالة الزر حتى يبقى الزر يعمل بعد إعادة تشغيل البوت
      const store = readStore();
      store[thirdMessage.id] = {
        guildId: interaction.guildId,
        channelId: channel.id,
        firstMessageId: firstMessage.id,
        images: [image1, image2, image3]
      };
      writeStore(store);

      await interaction.editReply({
        content: `✅ تم نشر الصور في ${channel} بنجاح.`
      });
    } catch (error) {
      console.error("خطأ أثناء النشر:", error);
      await interaction.editReply({
        content: "❌ حدث خطأ أثناء نشر الصور. تأكد من صلاحيات البوت وأن الروابط تعمل."
      }).catch(() => {});
    }
    return;
  }

  // زر إرسال الصور في الخاص
  if (interaction.isButton() && interaction.customId === "save_three_images") {
    const store = readStore();
    const saved = store[interaction.message.id];

    if (!saved) {
      return interaction.reply({
        content: "❌ تعذر العثور على الصور المرتبطة بهذا الزر. اطلب من الإدارة إعادة نشرها.",
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      await interaction.user.send({
        content: "💾 هذه الصور الثلاث التي طلبت حفظها:",
        embeds: [
          makeImageEmbed(saved.images[0], "الصورة الأولى"),
          makeImageEmbed(saved.images[1], "الصورة الثانية")
        ]
      });

      await interaction.user.send({
        embeds: [makeImageEmbed(saved.images[2], "الصورة الثالثة")]
      });

      await interaction.editReply({
        content: "✅ أرسلت الصور الثلاث إلى الخاص. تفقد رسائلك الخاصة."
      });
    } catch (error) {
      console.error("تعذر إرسال الخاص:", error);
      await interaction.editReply({
        content: "❌ ما قدرت أرسل لك بالخاص. افتح استقبال الرسائل الخاصة من أعضاء السيرفر ثم جرّب مرة ثانية."
      }).catch(() => {});
    }
  }
});

client.login(TOKEN);