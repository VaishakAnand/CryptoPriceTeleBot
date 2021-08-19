require("dotenv").config();
const express = require("express");
const Telegraf = require("telegraf");
const { Spot } = require("@binance/connector");

const app = express();
const bot = new Telegraf.Telegraf(process.env.BOT_TOKEN);
const client = new Spot();

app.listen(process.env.PORT);

app.get("/", (req, res) => {
  res.sendStatus(200);
});

bot.command("priceAlert", (ctx) => {
  console.log(`New priceAlert request: ${ctx.update.message.text}`);
  const args = ctx.update.message.text.split(" ");

  if (args.length != 4) {
    console.error(`Invalid priceAlert request argument format`);
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
    console.error(`Invalid priceAlert request value`);
    bot.telegram.sendMessage(
      ctx.chat.id,
      "The value has to be a number!\nE.g: /priceAlert ETHUSDT > 3000",
      {}
    );
    return;
  } else if (!acceptableComparisons.includes(comparison)) {
    console.error(`Invalid priceAlert request comparison`);
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
          var time = new Date().toLocaleTimeString();
          bot.telegram.editMessageText(
            ctx.chat.id,
            messageId,
            undefined,
            `Will notify you when ${ticker} ${comparison} ${value}.\nLatest pinged price: ${price}\nPinged at: ${time}`
          );
          pingTillSuccess(messageId);
        } else {
          console.log(
            `priceAlert request SUCCESS: ${ticker} ${comparison} ${value}`
          );
          bot.telegram.sendMessage(
            ctx.chat.id,
            `Reached target alert price value for ${ticker}.\nTarget: ${comparison} ${value}\nCurrent price: ${price}`,
            {}
          );
        }
      });
    }, 60000);
  }

  return bot.telegram
    .sendMessage(
      ctx.chat.id,
      `Will notify you when ${ticker} ${comparison} ${value}.`,
      {}
    )
    .then((messageDetails) => {
      const messageId = messageDetails.message_id;
      pingTillSuccess(messageId);
    });
});

bot.launch();
