// index.js
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { MongoClient } = require('mongodb');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const PREFIX = '!';

// -------------------- MONGODB SETUP --------------------
const mongoClient = new MongoClient(process.env.MONGO_URI);
let birthdaysCollection;

async function initMongo() {
  await mongoClient.connect();
  const db = mongoClient.db('birthdayBot'); // database name
  birthdaysCollection = db.collection('birthdays'); // collection name
  console.log('✅ Connected to MongoDB Atlas');
}

// -------------------- HELPER FUNCTIONS --------------------

// Add or update a birthday
async function addBirthday(userId, serverId, date) {
  await birthdaysCollection.updateOne(
    { userId, serverId },
    { $set: { userId, serverId, date } },
    { upsert: true }
  );
}

// Remove a birthday
async function removeBirthday(userId, serverId) {
  await birthdaysCollection.deleteOne({ userId, serverId });
}

// Get all birthdays for a server
async function getServerBirthdays(serverId) {
  return await birthdaysCollection.find({ serverId }).toArray();
}

// Validate MM/DD date format
function isValidDate(dateStr) {
  const regex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])$/;
  return regex.test(dateStr);
}

// Calculate days until next birthday
function getDaysUntilBirthday(dateStr) {
  const [month, day] = dateStr.split('/').map(Number);
  const today = new Date();
  const currentYear = today.getFullYear();
  let nextBirthday = new Date(currentYear, month - 1, day);
  if (nextBirthday < today) nextBirthday = new Date(currentYear + 1, month - 1, day);
  const diffTime = nextBirthday - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Get next upcoming birthday in a server
async function getNextBirthday(serverId) {
  const serverBirthdays = await getServerBirthdays(serverId);
  if (serverBirthdays.length === 0) return null;
  return serverBirthdays
    .map(b => ({ ...b, daysUntil: getDaysUntilBirthday(b.date) }))
    .sort((a, b) => a.daysUntil - b.daysUntil)[0];
}

// Check birthdays daily/hourly and send messages
async function checkBirthdays() {
  const today = new Date();
  const todayStr = `${today.getMonth() + 1}/${today.getDate()}`;

  const birthdaysToday = await birthdaysCollection.find({ date: todayStr }).toArray();

  for (const birthday of birthdaysToday) {
    try {
      const guild = await client.guilds.fetch(birthday.serverId);
      const channel = guild.systemChannel || guild.channels.cache.find(ch => ch.name === 'general');

      if (channel) {
        const embed = new EmbedBuilder()
          .setColor('#FF1493')
          .setTitle('🎉 Happy Birthday! 🎂')
          .setDescription(`It's <@${birthday.userId}>'s birthday today! 🎊`)
          .setTimestamp();

        channel.send({ content: '@everyone', embeds: [embed] });
      }
    } catch (err) {
      console.error('Error sending birthday message:', err);
    }
  }
}

// -------------------- DISCORD EVENTS --------------------
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  await initMongo();
  checkBirthdays();
  setInterval(checkBirthdays, 60 * 60 * 1000); // check every hour
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // Add birthday
  if (command === 'addbirthday') {
    let user = message.mentions.users.first() || message.author;
    const date = message.mentions.users.first() ? args[1] : args[0];

    if (!date || !isValidDate(date)) {
      return message.reply('Please use the format: `!addbirthday MM/DD` or `!addbirthday @user MM/DD`');
    }

    await addBirthday(user.id, message.guild.id, date);
    return message.reply(`✅ Birthday added for ${user.username} on ${date}!`);
  }

  // Remove birthday
  if (command === 'removebirthday') {
    const user = message.mentions.users.first() || message.author;
    await removeBirthday(user.id, message.guild.id);
    return message.reply(`🗑️ Birthday removed for ${user.username}`);
  }

  // List birthdays
  if (command === 'birthdays') {
    const serverBirthdays = await getServerBirthdays(message.guild.id);
    if (serverBirthdays.length === 0) return message.reply('No birthdays saved yet!');

    const embed = new EmbedBuilder()
      .setColor('#FF69B4')
      .setTitle('🎂 Birthday List')
      .setDescription(serverBirthdays.map(b => `<@${b.userId}> - ${b.date}`).join('\n'))
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  }

  // Next birthday
  if (command === 'nextbirthday') {
    const next = await getNextBirthday(message.guild.id);
    if (!next) return message.reply('No upcoming birthdays!');

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🎉 Next Birthday')
      .setDescription(`<@${next.userId}> - ${next.date}`)
      .addFields({ name: 'Days until birthday', value: next.daysUntil.toString() })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  }

  // Help command
  if (command === 'help') {
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('🎂 Birthday Bot Commands')
      .addFields(
        { name: '!addbirthday MM/DD', value: 'Add your own birthday' },
        { name: '!addbirthday @user MM/DD', value: 'Add someone else\'s birthday' },
        { name: '!removebirthday', value: 'Remove your birthday' },
        { name: '!birthdays', value: 'List all birthdays' },
        { name: '!nextbirthday', value: 'Show the next upcoming birthday' },
        { name: '!help', value: 'Show this help message' }
      )
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  }
});

// -------------------- LOGIN --------------------
client.login(process.env.TOKEN);
