const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');

const client = new Client({
intents: [
@@ -8,13 +9,45 @@ const client = new Client({
],
});

// Store birthdays in memory (use a database for production)
// Store birthdays in memory
const birthdays = new Map();
const BIRTHDAY_FILE = 'birthdays.json';

// Keep track of active singing sessions per channel
const activeSingers = new Map();

const PREFIX = '!';

// Load birthdays from file on startup
function loadBirthdays() {
  try {
    if (fs.existsSync(BIRTHDAY_FILE)) {
      const data = fs.readFileSync(BIRTHDAY_FILE, 'utf8');
      const savedBirthdays = JSON.parse(data);
      Object.entries(savedBirthdays).forEach(([key, value]) => {
        birthdays.set(key, value);
      });
      console.log(`Loaded ${birthdays.size} birthdays from file`);
    }
  } catch (error) {
    console.error('Error loading birthdays:', error);
  }
}

// Save birthdays to file
function saveBirthdays() {
  try {
    const birthdayObj = Object.fromEntries(birthdays);
    fs.writeFileSync(BIRTHDAY_FILE, JSON.stringify(birthdayObj, null, 2));
    console.log('Birthdays saved to file');
  } catch (error) {
    console.error('Error saving birthdays:', error);
  }
}

client.once('ready', () => {
console.log(`Logged in as ${client.user.tag}`);
  loadBirthdays();
checkBirthdays();
// Check for birthdays every hour
setInterval(checkBirthdays, 60 * 60 * 1000);
@@ -45,6 +78,7 @@ client.on('messageCreate', async (message) => {
const serverId = message.guild.id;
const key = `${serverId}-${user.id}`;
birthdays.set(key, { userId: user.id, date, serverId });
    saveBirthdays();

message.reply(`✅ Birthday added for ${user.username} on ${date}!`);
}
@@ -56,6 +90,7 @@ client.on('messageCreate', async (message) => {

if (birthdays.has(key)) {
birthdays.delete(key);
      saveBirthdays();
message.reply(`🗑️ Birthday removed for ${user.username}`);
} else {
message.reply('No birthday found for this user.');
@@ -118,12 +153,76 @@ client.on('messageCreate', async (message) => {
{ name: '!removebirthday', value: 'Remove your birthday' },
{ name: '!birthdays', value: 'List all birthdays' },
{ name: '!nextbirthday', value: 'Show the next upcoming birthday' },
        { name: '!play 1', value: 'Play song 1 (Boolymon)' },
        { name: '!play 2', value: 'Play song 2 (Duvet style)' },
        { name: '!stop', value: 'Stop the bot from singing' },
{ name: '!help', value: 'Show this help message' }
)
.setTimestamp();

message.channel.send({ embeds: [embed] });
}

  if (command === 'play') {
    if (activeSingers.has(message.channel.id)) {
      return message.reply('I am already singing in this channel! Use `!stop` to make me quit.');
    }

    const songChoice = args[0];
    let lyrics = [];

    if (songChoice === '1') {
      lyrics = [
            "I don't got nothin' for your love",
        "I don't got nothin' for your love",
        "Tight-ass jeans, they Rick Owens",
        "Slight fit, put that shit on",
        "Stupid ho, leave me alone",
        "Stupid bitch, yeah, fix your tone",
        "He tryna' slide, I send him home",
        "Hit a pussy with the chrome (Boop-boop, boop-boop)",
        "Yeah, I hope I don't OD",
        "Won't let the Jews control me",
        "These boys cap, they so bologna (So bologna)",
        "Tryna' see what you talkin' 'bout, you gotta show me",
        "I don't give a fuck what you talkin' 'bout, homie",
      ];
    } else if (songChoice === '2') {
      lyrics = [
        "And you don't seem to understand",
        "A shame you seemed an honest man",
        "And all the fears you hold so dear",
        "Will turn to whisper in your ear",
        "And you know what they say might hurt you",
        "And you know that it means so much",
        "And you don't even feel a thing",
        "I am falling, I am fading",
        "I have lost it all"
      ];
    } else {
      return message.reply('Please specify a song number! Use `!play 1` or `!play 2`.');
    }

    activeSingers.set(message.channel.id, true);

    for (const line of lyrics) {
      if (!activeSingers.has(message.channel.id)) break;
      if (line.trim() === "") continue;
      await message.channel.send(line);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    activeSingers.delete(message.channel.id);
  }

  if (command === 'stop') {
    if (activeSingers.has(message.channel.id)) {
      activeSingers.delete(message.channel.id);
      message.reply('🛑 Stopped singing.');
    } else {
      message.reply('I am not singing right now.');
    }
  }
});

function isValidDate(dateStr) {
@@ -135,13 +234,13 @@ function getDaysUntilBirthday(dateStr) {
const [month, day] = dateStr.split('/').map(Number);
const today = new Date();
const currentYear = today.getFullYear();
  

let nextBirthday = new Date(currentYear, month - 1, day);
  

if (nextBirthday < today) {
nextBirthday = new Date(currentYear + 1, month - 1, day);
}
  

const diffTime = nextBirthday - today;
return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
@@ -166,7 +265,7 @@ async function checkBirthdays() {
try {
const guild = await client.guilds.fetch(birthday.serverId);
const channel = guild.systemChannel || guild.channels.cache.find(ch => ch.name === 'general');
        

if (channel) {
const embed = new EmbedBuilder()
.setColor('#FF1493')
