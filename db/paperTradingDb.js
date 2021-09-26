const db = require("../database.js");

function insertTradeIntoDb(
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
  return new Promise((res, rej) => {
    try {
      const addTrade =
        db.prepare(`INSERT INTO PaperTrades (symbol, buyDate, sellDate, orderType,
    indexPrice, orderPrice, margin, leverage, totalMargin,
    unitsBought, fees, stopLossPrice, takeProfitPrice, salePrice, netprofit)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      addTrade.run(
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
      );
      res();
    } catch (err) {
      rej(err);
    }
  });
}

function getAllPaperTrades() {
  return new Promise((res, rej) => {
    try {
      const getTrades = db.prepare("SELECT * FROM PaperTrades");
      let result = getTrades.get();
      res(result);
    } catch (err) {
      rej(err);
    }
  });
}

function getStats() {
  return new Promise((resolve, rej) => {
    try {
      const getAllTrades = db.prepare("SELECT * FROM PaperTrades");
      let result = getAllTrades.all();
      if (result == undefined) {
        resolve(result);
      }
      let netProfit = 0;
      let winStreak = 0;
      for (let i = 0; i < result.length; i++) {
        const currResult = result[i];
        netProfit += currResult.netProfit;
        if (currResult.netProfit > 0) {
          winStreak++;
        } else {
          winStreak = 0;
        }
      }
      resolve({
        netProfit: netProfit,
        winStreak: winStreak,
      });
    } catch (err) {
      rej(err);
    }
  });
}

module.exports = {
  insertTradeIntoDb: insertTradeIntoDb,
  getStats: getStats,
};
