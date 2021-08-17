require("dotenv").config();
const Telegraf = require("telegraf");

const bot = new Telegraf.Telegraf(process.env.BOT_TOKEN);

bot.command("start", (ctx) => {
  console.log(ctx.from);
  bot.telegram.sendMessage(
    ctx.chat.id,
    "hello there! Welcome to my new telegram bot.",
    {}
  );
});

bot.command("priceAlert", (ctx) => {
  const args = ctx.update.message.text.split(" ");

  if (args != 4) {
    bot.telegram.sendMessage(
      ctx.chat.id,
      "Please input the correct number of arguments!\nE.g: /priceAlert ETH > 3000",
      {}
    );
  }

  const ticker = args[1];
  const comparison = args[2];
  const value = args[3];

  if (!isNaN(args[3])) {
    
  }
});
bot.launch();
