const db = require("../database.js");

function insertTradeIntoDb(
  symbol,
  buyDate,
  sellDate,
  orderType,
  estimatedSettlePrice,
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
    const addTrade =
      db.prepare(`INSERT INTO PaperTrades (symbol, buyDate, sellDate, orderType,
    estimatedSettlePrice, orderPrice, margin, leverage, totalMargin,
    unitsBought, fees, stopLossPrice, takeProfitPrice, salePrice, netprofit)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    addTrade.run(
      symbol,
      buyDate,
      sellDate,
      orderType,
      estimatedSettlePrice,
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
  });
}

function getAllPaperTrades() {
  return new Promise((res, rej) => {
    const getTrades = db.prepare("SELECT * FROM PaperTrades");
    let result = getTrades.get();
    res(result);
  });
}

module.exports = {
  insertTradeIntoDb: insertTradeIntoDb,
};
