// Файл: index.js
const express = require('express');
const { Telegraf, Markup, Scenes, session } = require('telegraf');
const mongoose = require('mongoose');
require('dotenv').config();

// Підключення до MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Модель користувача для статистики
const userSchema = new mongoose.Schema({
  userId: { type: Number, required: true, unique: true },
  firstName: String,
  lastName: String,
  username: String,
  joinDate: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now },
  interactions: { type: Number, default: 0 },
  queries: [{ query: String, timestamp: { type: Date, default: Date.now } }]
});

const User = mongoose.model('User', userSchema);

// База даних аудиторій ХНУРЕ
const classrooms = [
  { id: '100', building: 'Головний корпус', floor: 1, description: 'Лекційна аудиторія' },
  { id: '101', building: 'Головний корпус', floor: 1, description: 'Комп\'ютерний клас' },
  { id: '156', building: 'Головний корпус', floor: 1, description: 'Лабораторія' },
  { id: '232', building: 'Головний корпус', floor: 2, description: 'Семінарська аудиторія' },
  { id: '285', building: 'Головний корпус', floor: 2, description: 'Комп\'ютерний клас' },
  { id: '305', building: 'Головний корпус', floor: 3, description: 'Лекційна аудиторія' },
  { id: '405', building: 'Головний корпус', floor: 4, description: 'Кафедра' },
  { id: '104a', building: 'Корпус "І"', floor: 1, description: 'Лабораторія' },
  { id: '210i', building: 'Корпус "І"', floor: 2, description: 'Комп\'ютерний клас' },
  { id: '320i', building: 'Корпус "І"', floor: 3, description: 'Лекційна аудиторія' },
];

// Створення сцен для реалізації розгалуження діалогу
const searchScene = new Scenes.BaseScene('search');
searchScene.enter(ctx => {
  ctx.reply('Введіть номер аудиторії для пошуку:');
});

searchScene.on('text', async (ctx) => {
  const query = ctx.message.text.trim();

  // Записуємо запит користувача в статистику
  await User.findOneAndUpdate(
    { userId: ctx.from.id },
    {
      $push: { queries: { query: query } },
      $set: { lastActivity: Date.now() },
      $inc: { interactions: 1 }
    }
  );

  const classroom = classrooms.find(room => room.id.toLowerCase() === query.toLowerCase());

  if (classroom) {
    await ctx.reply(`📍 Аудиторія ${classroom.id}:\nКорпус: ${classroom.building}\nПоверх: ${classroom.floor}\nОпис: ${classroom.description}`);
  } else {
    await ctx.reply('❌ Аудиторію не знайдено. Перевірте правильність введеного номера.');
  }
  await ctx.scene.leave();
  await showMainMenu(ctx);
});

const stage = new Scenes.Stage([searchScene]);

// Ініціалізація бота
const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session());
bot.use(stage.middleware());

// Middleware для збереження статистики
bot.use(async (ctx, next) => {
  if (ctx.from) {
    try {
      await User.findOneAndUpdate(
        { userId: ctx.from.id },
        {
          $set: {
            firstName: ctx.from.first_name,
            lastName: ctx.from.last_name,
            username: ctx.from.username,
            lastActivity: Date.now()
          },
          $inc: { interactions: 1 }
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error('Error updating user stats:', err);
    }
  }
  return next();
});

// Функція для відображення головного меню
async function showMainMenu(ctx) {
  return await ctx.reply('Оберіть опцію:', Markup.keyboard([
    ['🔍 Пошук аудиторії'],
    ['ℹ️ Інформація про ХНУРЕ'],
    ['📊 Статистика (для адміністраторів)']
  ]).resize());
}

// Команда /start
bot.start(async (ctx) => {
  await ctx.reply(`Вітаю, ${ctx.from.first_name}! Я бот-помічник ХНУРЕ, який допоможе знайти потрібну аудиторію.`);
  await showMainMenu(ctx);
});

// Команда /help
bot.help(async (ctx) => {
  await ctx.reply('Я можу допомогти вам знайти аудиторію в ХНУРЕ. Використовуйте меню для вибору опцій або команди:\n/start - розпочати роботу\n/search - пошук аудиторії\n/info - інформація про ХНУРЕ');
});

// Обробка натискання кнопок
bot.hears('🔍 Пошук аудиторії', (ctx) => ctx.scene.enter('search'));

bot.hears('ℹ️ Інформація про ХНУРЕ', async (ctx) => {
  await ctx.reply('Харківський національний університет радіоелектроніки (ХНУРЕ) - один з провідних технічних вишів України.\nАдреса: Україна, 61166, м. Харків, пр. Науки, 14\nТелефон: +38 (057) 702-10-16\nВеб-сайт: nure.ua');
  await showMainMenu(ctx);
});

// Перевірка, чи користувач адміністратор
const ADMIN_IDS = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => Number(id)) : [];

bot.hears('📊 Статистика (для адміністраторів)', async (ctx) => {
  if (ADMIN_IDS.includes(ctx.from.id)) {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({
      lastActivity: { $gte: new Date(Date.now() - 24*60*60*1000) }
    });
    const topQueries = await User.aggregate([
      { $unwind: "$queries" },
      { $group: { _id: "$queries.query", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    let statsMessage = `📊 Статистика бота:\nВсього користувачів: ${totalUsers}\nАктивних користувачів за 24 години: ${activeUsers}\n\nТоп-5 запитів:`;

    topQueries.forEach((query, index) => {
      statsMessage += `\n${index + 1}. "${query._id}" - ${query.count} разів`;
    });

    await ctx.reply(statsMessage);
  } else {
    await ctx.reply('⚠️ У вас немає доступу до цієї функції.');
  }
  await showMainMenu(ctx);
});

// Команда для пошуку аудиторії
bot.command('search', (ctx) => ctx.scene.enter('search'));

// Інформація про ХНУРЕ
bot.command('info', async (ctx) => {
  await ctx.reply('Харківський національний університет радіоелектроніки (ХНУРЕ) - один з провідних технічних вишів України.\nАдреса: Україна, 61166, м. Харків, пр. Науки, 14\nТелефон: +38 (057) 702-10-16\nВеб-сайт: nure.ua');
});

// Обробка неопрацьованих повідомлень
bot.on('text', async (ctx) => {
  await ctx.reply('Не розумію команду. Використовуйте кнопки меню або команду /help для отримання допомоги.');
  await showMainMenu(ctx);
});

// Запуск Express серверу
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('ХНУРЕ Telegram Bot Server is running!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Запуск бота
bot.launch().then(() => {
  console.log('Bot started');
}).catch(err => {
  console.error('Bot start error:', err);
});

// Обробка завершення роботи
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));