const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login("MTQ3MTY4NDMzNjA3OTA3NzYyNQ.GEZ2L3.cTX-m2j0yqcoyFtH7HpZNKiF-3klBhPEXVlFWQ");
