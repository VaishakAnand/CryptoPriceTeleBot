const Database = require("better-sqlite3");
const db = new Database("db.sqlite3");

const createPriceAlertTable = `CREATE TABLE IF NOT EXISTS PriceAlerts(
  fromUserId integer,
  ticker text,
  symbol text,
  targetPrice text,
  PRIMARY KEY(fromUserId, ticker, symbol, targetPrice)
)`;

db.exec(createPriceAlertTable);

module.exports = db;