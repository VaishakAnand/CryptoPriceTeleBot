require("dotenv").config();
const Telegraf = require("telegraf");
const axios = require("axios");
const { Spot } = require("@binance/connector");

const bot = new Telegraf.Telegraf(process.env.BOT_TOKEN);
const client = new Spot();

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

  if (args.length != 4) {
    bot.telegram.sendMessage(
      ctx.chat.id,
      "Please input the correct number of arguments!\nE.g: /priceAlert ETHUSDT > 3000",
      {}
    );
    return;
  }

  const ticker = args[1];
  const comparison = args[2];
  const value = args[3];

  const acceptableComparisons = [">", "<", "=", "<=", ">="];
  if (isNaN(value)) {
    bot.telegram.sendMessage(
      ctx.chat.id,
      "The value has to be a number!\nE.g: /priceAlert ETHUSDT > 3000",
      {}
    );
    return;
  } else if (!acceptableComparisons.includes(comparison)) {
    bot.telegram.sendMessage(
      ctx.chat.id,
      "Please input an appropriate comparison symbol!\n" +
        "Choose one from this list: [ >, <, =, >=, <= ]" +
        "\nE.g: /priceAlert ETHUSDT > 3000",
      {}
    );
    return;
  }

  function pingTillSuccess(messageId) {
    setTimeout(() => {
      return client.tickerPrice(ticker).then((response) => {
        const price = response.data.price;
        console.log(response.data);

        let isSuccess = true;
        switch (comparison) {
          case ">":
            isSuccess = price > value;
            break;
          case "<":
            isSuccess = price < value;
            break;
          case "=":
            isSuccess = price = value;
            break;
          case ">=":
            isSuccess = price >= value;
            break;
          case "<=":
            isSuccess = price <= value;
            break;
          default:
            console.log(
              "ERROR: Reached impossible default of switch case for printAlert"
            );
        }

        if (!isSuccess) {
          bot.telegram.editMessageText(
            ctx.chat.id,
            messageId,
            undefined,
            `Will notify you when ${ticker} ${comparison} ${value}\nLatest pinged price: ${price}`
          );
          pingTillSuccess(messageId);
        } else {
          bot.telegram.sendMessage(
            ctx.chat.id,
            `Reached target alert price value for ${ticker}\nTarget: ${comparison} ${value}\nCurrent: ${price}`,
            {}
          );
        }
      });
    }, 10000);
  }

  return bot.telegram
    .sendMessage(
      ctx.chat.id,
      `Will notify you when ${ticker} ${comparison} ${value}`,
      {}
    )
    .then((messageDetails) => {
      const messageId = messageDetails.message_id;
      pingTillSuccess(messageId);
    });
});

bot.launch();
