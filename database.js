const Database = require("better-sqlite3");
const db = new Database("db.sqlite3");

const createPriceAlertTable = `CREATE TABLE IF NOT EXISTS PriceAlerts(
  fromUserId integer,
  ticker text,
  symbol text,
  targetPrice text,
  PRIMARY KEY(fromUserId, ticker, symbol, targetPrice)
)`;

const createPaperTradeTable = `CREATE TABLE IF NOT EXISTS PaperTrades(
  symbol text,
  buyDate text,
  sellDate text,
  orderType text,
  estimatedSettlePrice double,
  orderPrice text,
  margin integer,
  leverage integer,
  totalMargin integer,
  unitsBought double,
  fees double,
  stopLossPrice double,
  takeProfitPrice double,
  salePrice double,
  netProfit double,
  PRIMARY KEY(symbol, orderType, buyDate, sellDate)
)`;

db.exec(createPriceAlertTable);
db.exec(createPaperTradeTable);

module.exports = db;
