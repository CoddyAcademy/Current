const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const express = require("express");
const app = express();

const TelegramToken = process.env.BOT_TOKEN || "8222215060:AAF64Nzxt1HMqbB2a5EikFnLAtBso7yG9nU";
const channel = "@intention_academy";
const bot = new TelegramBot(TelegramToken, { polling: true });
const API_URL = "https://cbu.uz/oz/arkhiv-kursov-valyut/json/";
const userLegacy = {};

// Start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  askToJoin(chatId);
});

// Callback query
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data === "check_sub") {
    const isSubscribed = await checkSubscription(chatId);
    if (isSubscribed) {
      await bot.answerCallbackQuery(query.id, { text: "✅ Obuna tasdiqlandi!" });
      return sendMain(chatId);
    } else {
      await bot.answerCallbackQuery(query.id, { text: "❌ Avval kanalga obuna bo‘ling!" });
      return askToJoin(chatId);
    }
  }
});

// Message handler
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text === "Obunani tekshirish") {
    const isSubscribed = await checkSubscription(chatId);
    if (isSubscribed) return sendMain(chatId);
    else return askToJoin(chatId);
  }

  const isSubscribed = await checkSubscription(chatId);
  if (!isSubscribed) return askToJoin(chatId);

  if (text === "Yangilash") {
    const lastLegacy = userLegacy[chatId];
    if (!lastLegacy) return bot.sendMessage(chatId, "Avval valyutani tanlang!");
    return sendCurrency(chatId, lastLegacy);
  }

  const currencies = ["USD", "EUR", "GBP", "JPY", "RUB", "CNY"];
  if (currencies.includes(text)) {
    userLegacy[chatId] = text;
    return sendCurrency(chatId, text);
  }
});

// Functions
function askToJoin(chatId) {
  bot.sendMessage(chatId, "📢 Botdan foydalanish uchun kanalga obuna bo‘ling:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔗 Kanalga o'tish", url: "https://t.me/intention_academy" }],
        [{ text: "✅ Obunani tekshirish", callback_data: "check_sub" }],
      ],
    },
  });
}

function sendMain(chatId) {
  bot.sendMessage(chatId, "✅ Obuna tasdiqlandi! Endi valyuta kurslarini bilib olishingiz mumkin:", {
    reply_markup: {
      keyboard: [
        ["Yangilash"],
        ["USD", "EUR"],
        ["GBP", "JPY"],
        ["RUB", "CNY"],
      ],
      resize_keyboard: true,
    },
  });
}

async function sendCurrency(chatId, currencyCode) {
  try {
    const res = await axios.get(API_URL);
    const data = res.data.find((c) => c.Ccy === currencyCode);

    if (!data) return bot.sendMessage(chatId, "Bu valyuta topilmadi 😕");

    const date = data.Date.split(" ")[0].split("-").reverse().join(".");
    bot.sendMessage(
      chatId,
      `💱 *${data.CcyNm_UZ}* kursi:\n\n1 ${data.Ccy} = ${data.Rate} so'm\n📅 Sana: ${date}`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          keyboard: [
            ["Yangilash"],
            ["USD", "EUR"],
            ["GBP", "JPY"],
            ["RUB", "CNY"],
          ],
          resize_keyboard: true,
        },
      }
    );
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "❌ Botda hatolik yuz berdi!");
  }
}

async function checkSubscription(chatId) {
  try {
    const member = await bot.getChatMember(channel, chatId);
    return ["member", "administrator", "creator"].includes(member.status);
  } catch (error) {
    return false;
  }
}

// --- Koyeb health check uchun ---
app.get("/", (req, res) => {
  res.send("✅ Bot is running and healthy!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
