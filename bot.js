require("dotenv").config();
const Telegraf = require("telegraf");
const { Spot } = require("@binance/connector");

const db = require("./database");
const bot = new Telegraf.Telegraf(process.env.BOT_TOKEN);
const client = new Spot();

bot.command("getDB", (ctx) => {
  ctx.replyWithDocument({
    source: "./db.sqlite3",
  });
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
  const userId = ctx.update.message.from.id;
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
      checkIfAlertExists().then((exists) => {
        if (!exists) {
          return;
        }

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
            removePriceAlert().then(() => {
              console.log(
                `priceAlert request SUCCESS: ${ticker} ${comparison} ${value}`
              );
              bot.telegram.sendMessage(
                ctx.chat.id,
                `Reached target alert price value for ${ticker}.\nTarget: ${comparison} ${value}\nCurrent price: ${price}`,
                {}
              );
            });
          }
        });
      });
    }, 60000);
  }

  function addPriceAlert() {
    return new Promise((resolve, reject) => {
      console.log(userId, ticker, comparison, value);
      const add =
        db.prepare(`INSERT INTO PriceAlerts(fromUserId, ticker, symbol, targetPrice)
        VALUES(?, ?, ?, ?)`);
      add.run(userId, ticker, comparison, value);
      resolve();
    });
  }

  function removePriceAlert() {
    return new Promise((resolve, reject) => {
      const removeAlert =
        db.prepare(`DELETE from PriceAlerts WHERE fromUserId = ? 
          AND ticker = ? AND symbol = ? AND targetPrice = ?`);
      removeAlert.run(userId, ticker, comparison, value);
      resolve();
    });
  }

  function checkIfAlertExists() {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`SELECT * FROM PriceAlerts WHERE fromUserId = ? 
          AND ticker = ? AND symbol = ? AND targetPrice = ?`);
      const result = stmt.get(userId, ticker, comparison, value);
      let exists = true;
      if (result == null) {
        exists = false;
      }
      resolve(exists);
    });
  }

  return addPriceAlert(ctx.update.message.from).then(() => {
    bot.telegram
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
});

bot.command("removePriceAlert", (ctx) => {
  console.log(`Remove existing priceAlert request: ${ctx.update.message.text}`);

  const args = ctx.update.message.text.split(" ");
  if (args.length != 4) {
    console.error(`Invalid priceAlert request argument format`);
    bot.telegram.sendMessage(
      ctx.chat.id,
      "Please input the correct number of arguments!\nE.g: /removePriceAlert ETHUSDT > 3000",
      {}
    );
    return;
  }

  const ticker = args[1];
  const comparison = args[2];
  const value = args[3];
  const userId = ctx.update.message.from.id;
  const acceptableComparisons = [">", "<", "=", "<=", ">="];

  if (isNaN(value)) {
    console.error(`Invalid priceAlert request value`);
    bot.telegram.sendMessage(
      ctx.chat.id,
      "The value has to be a number!\nE.g: /removePriceAlert ETHUSDT > 3000",
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

  function checkIfAlertExists() {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`SELECT * FROM PriceAlerts WHERE fromUserId = ? 
          AND ticker = ? AND symbol = ? AND targetPrice = ?`);
      const result = stmt.get(userId, ticker, comparison, value);
      let exists = true;
      if (result == null) {
        exists = false;
      }
      resolve(exists);
    });
  }

  function removePriceAlert() {
    return new Promise((resolve, reject) => {
      const removeAlert =
        db.prepare(`DELETE from PriceAlerts WHERE fromUserId = ? 
          AND ticker = ? AND symbol = ? AND targetPrice = ?`);
      removeAlert.run(userId, ticker, comparison, value);
      resolve();
    });
  }

  return checkIfAlertExists().then((exists) => {
    if (!exists) {
      console.error(`Price Alert does not exist`);
    }
    return removePriceAlert().then(() => {
      bot.telegram.sendMessage(
        ctx.chat.id,
        `Removed Price alert:${ticker} ${comparison} ${value}`,
        {}
      );
      return;
    });
  });
});

function sendPaperTradeDetails(
  symbol,
  buyDate,
  sellDate,
  orderType,
  indexPrice,
  orderPrice,
  margin,
  leverage,
  totalMargin,
  unitsBought,
  fees,
  stopLossPrice,
  takeProfitPrice,
  salePrice,
  netProfit
) {
  const message = `Made Paper Trade:
    Symbol: ${symbol}
    Order Type: ${orderType}
    Order Price: ${orderPrice}
    Units Bought: ${unitsBought}
    Sale Price: ${salePrice}
    Net Profit: ${netProfit}
    Fees: ${fees}
    Index Price on purchase: ${indexPrice}
    Stop Loss Price: ${stopLossPrice}
    Take Profit Price: ${takeProfitPrice}
    Margin: ${margin}
    Leverage: ${leverage}
    Total Margin: ${totalMargin}
    Buy DateTime: ${buyDate}
    Sell DateTime: ${sellDate}`;
  bot.telegram.sendMessage(process.env.TELE_GRP_ID, message, {});
}

module.exports = {
  bot: bot,
  sendPaperTradeDetails: sendPaperTradeDetails,
};
