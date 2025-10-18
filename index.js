const TelegramToken = "8222215060:AAF64Nzxt1HMqbB2a5EikFnLAtBso7yG9nU"
const TelegramBot = require("node-telegram-bot-api")
const axios = require("axios")
const channel = "@intention_academy"

const bot = new TelegramBot(TelegramToken, { polling: true })
const API_URL = "https://cbu.uz/oz/arkhiv-kursov-valyut/json/"
const userLegacy = {}



bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id
  askToJoin(chatId)
})


bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id
  const data = query.data

  if (data === "check_sub") {
    const isSubscribed = await checkSubscription(chatId)
    if (isSubscribed) {
      await bot.answerCallbackQuery(query.id, { text: "✅ Obuna tasdiqlandi!" })
      return sendMain(chatId)
    } else {
      await bot.answerCallbackQuery(query.id, { text: "❌ Avval kanalga obuna bo‘ling!" })
      return askToJoin(chatId)
    }
  }
})

bot.on("message", async (msg) => {
  const chatId = msg.chat.id
  const text = msg.text

  // “Obunani tekshirish” klaviaturadan yozilsa
  if (text === "Obunani tekshirish") {
    const isSubscribed = await checkSubscription(chatId)
    if (isSubscribed) return sendMain(chatId)
    else return askToJoin(chatId)
  }

  // Obuna bo‘lmagan foydalanuvchilarni to‘xtatish
  const isSubscribed = await checkSubscription(chatId)
  if (!isSubscribed) return askToJoin(chatId)

  // 🔹 Yangilash tugmasi
  if (text === "Yangilash") {
    const lastLegacy = userLegacy[chatId]
    if (!lastLegacy) {
      return bot.sendMessage(chatId, "Avval valyutani tanlang!")
    }
    return sendCurrency(chatId, lastLegacy)
  }

  // 🔹 Valyuta tanlash
  let currencyCode
  if (text === "USD") currencyCode = "USD"
  else if (text === "EUR" || text === "EURO") currencyCode = "EUR"
  else if (text === "GBP") currencyCode = "GBP"
  else if (text === "JPY") currencyCode = "JPY"
  else if (text === "RUB") currencyCode = "RUB"
  else if (text === "CNY") currencyCode = "CNY"
  else return

  userLegacy[chatId] = currencyCode
  sendCurrency(chatId, currencyCode)
})


// 🔹 Obuna so‘rash funksiyasi
function askToJoin(chatId) {
  bot.sendMessage(
    chatId,
    "📢 Botdan foydalanish uchun kanalga obuna bo‘ling:",
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔗 Kanalga o'tish", url: "https://t.me/intention_academy" }],
          [{ text: "✅ Obunani tekshirish", callback_data: "check_sub" }]
        ]
      }
    }
  )
}


// 🔹 Asosiy menyu
function sendMain(chatId) {
  bot.sendMessage(
    chatId,
    "✅ Obuna tasdiqlandi! Endi valyuta kurslarini bilib olishingiz mumkin:",
    {
      reply_markup: {
        keyboard: [
          ["Yangilash"],
          ["USD", "EUR"],
          ["GBP", "JPY"],
          ["RUB", "CNY"]
        ],
        resize_keyboard: true
      }
    }
  )
}


// 🔹 Valyutani yuborish funksiyasi
async function sendCurrency(chatId, currencyCode) {
  try {
    const res = await axios.get(API_URL)
    const data = res.data.find((c) => c.Ccy === currencyCode)

    if (!data) return bot.sendMessage(chatId, "Bu valyuta topilmadi 😕")

    const date = data.Date.split(" ")[0].split("-").reverse().join(".")
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
            ["RUB", "CNY"]
          ],
          resize_keyboard: true
        }
      }
    )
  } catch (error) {
    console.error(error)
    bot.sendMessage(chatId, "❌ Botda hatolik yuz berdi!")
  }
}


// 🔹 Obuna holatini tekshirish
async function checkSubscription(chatId) {
  try {
    const member = await bot.getChatMember(channel, chatId)
    const status = member.status
    return ['member', 'administrator', 'creator'].includes(status)
  } catch (error) {
    return false
  }
}
