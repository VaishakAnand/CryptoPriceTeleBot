require("dotenv").config();
const Binance = require("node-binance-api");
const sendPaperTradeDetails = require("./bot.js").sendPaperTradeDetails;
const insertTradeIntoDb = require("./db/paperTradingDb.js").insertTradeIntoDb;
const binance = new Binance().options({
  APIKEY: process.env.BINANCE_API_KEY,
  APISECRET: process.env.BINANCE_API_SECRET,
});

function rngAmount(min, max) {
  return Math.random() * (max - min) + min;
}

function convertEpochToNormalTime(timeEpoch) {
  var d = new Date(timeEpoch);
  var utc = d.getTime() + d.getTimezoneOffset() * 60000; //This converts to UTC 00:00
  var nd = new Date(utc + 3600000 * 8);
  return nd.toLocaleString("en-NZ");
}

function simulatePurchase(symbol) {
  console.log("Simulating Purchase for", symbol);
  binance.futuresMarkPrice(symbol).then((price) => {
    // Place order:
    //  - Market Order -> Add rng amount
    //  - Limit Order -> Use indexPrice
    const markPrice = price.markPrice;
    const marketOrderPrice = rngAmount(0.999, 1.001) * markPrice;
    const limitOrderPrice = markPrice;

    // Set Leverage
    const leverage = 50;
    // Set Margin Type
    const marginType = "ISOLATED";
    const marginAmount = 100;

    // Make purchase
    setTimeout(() => {
      // Purchase waiting to be filled
    }, rngAmount(0, 10000));

    // Purchase Time
    const marketOrderPurchaseTime = Date.now();
    const limitOrderPurchaseTime = Date.now();

    // Number of units bought
    const marketOrderUnits = (leverage * marginAmount) / marketOrderPrice;
    const limitOrderUnits = (leverage * marginAmount) / limitOrderPrice;
    // Fees
    const marketOrderFees = leverage * marginAmount * (0.036 / 100) * 2;
    const limitOrderFees = leverage * marginAmount * (0.018 / 100) * 2;

    const stopLossPercentage = -0.4;
    const takeProfitPercentage = 0.5;
    // Stop losses and take profit prices
    // const marketOrderStopLossPrice =
    //   ((100 + stopLossPercentage / leverage) / 100) * marketOrderPrice;
    // const marketOrderTakeProfitPrice =
    //   ((100 + takeProfitPercentage / leverage) / 100) * marketOrderPrice;
    // const limitOrderStopLossPrice =
    //   ((100 + stopLossPercentage / leverage) / 100) * limitOrderPrice;
    // const limitOrderTakeProfitPrice =
    //   ((100 + takeProfitPercentage / leverage) / 100) * limitOrderPrice;

    const marketOrderStopLossPrice =
      ((100 + stopLossPercentage) / 100) * marketOrderPrice;
    const marketOrderTakeProfitPrice =
      ((100 + takeProfitPercentage) / 100) * marketOrderPrice;
    const limitOrderStopLossPrice =
      ((100 + stopLossPercentage) / 100) * limitOrderPrice;
    const limitOrderTakeProfitPrice =
      ((100 + takeProfitPercentage) / 100) * limitOrderPrice;

    console.log(
      marketOrderPrice,
      marketOrderStopLossPrice,
      marketOrderTakeProfitPrice
    );
    console.log(
      limitOrderPrice,
      limitOrderStopLossPrice,
      limitOrderTakeProfitPrice
    );
    // Wait for either stop loss or take profit to hit
    pingTillSuccess(
      symbol,
      marketOrderStopLossPrice,
      marketOrderTakeProfitPrice,
      limitOrderStopLossPrice,
      limitOrderTakeProfitPrice
    ).then((orderFulfilled) => {
      let marketOrderSaleTime = orderFulfilled[1];
      let limitOrderSaleTime = orderFulfilled[3];
      let marketOrderSalePrice = orderFulfilled[0];
      let limitOrderSalePrice = orderFulfilled[2];

      const marketOrderNetProfit =
        marketOrderSalePrice * marketOrderUnits -
        marketOrderPrice * marketOrderUnits -
        marketOrderFees;
      const limitOrderNetProfit =
        limitOrderSalePrice * limitOrderUnits -
        limitOrderPrice * limitOrderUnits -
        limitOrderFees;

      let marketOrderDetails = [
        symbol,
        convertEpochToNormalTime(marketOrderPurchaseTime),
        convertEpochToNormalTime(marketOrderSaleTime),
        "Market",
        markPrice,
        marketOrderPrice,
        marginAmount,
        leverage,
        marginAmount * leverage,
        marketOrderUnits,
        marketOrderFees,
        marketOrderStopLossPrice,
        marketOrderTakeProfitPrice,
        marketOrderSalePrice,
        marketOrderNetProfit,
      ];

      let limitOrderDetails = [
        symbol,
        convertEpochToNormalTime(limitOrderPurchaseTime),
        convertEpochToNormalTime(limitOrderSaleTime),
        "Limit",
        markPrice,
        limitOrderPrice,
        marginAmount,
        leverage,
        marginAmount * leverage,
        limitOrderUnits,
        limitOrderFees,
        limitOrderStopLossPrice,
        limitOrderTakeProfitPrice,
        limitOrderSalePrice,
        limitOrderNetProfit,
      ];
      // Store in Database
      insertTradeIntoDb(...marketOrderDetails);
      insertTradeIntoDb(...limitOrderDetails);
      // Send in telegram
      sendPaperTradeDetails(...marketOrderDetails);
      sendPaperTradeDetails(...limitOrderDetails);
    });
  });
}

function pingTillSuccess(
  symbol,
  marketOrderStopLossPrice,
  marketOrderTakeProfitPrice,
  limitOrderStopLossPrice,
  limitOrderTakeProfitPrice
) {
  return new Promise((res, rej) => {
    let latestPrice = 0;
    let marketOrderRunning = true;
    let limitOrderRunning = true;
    let marketOrderSalePrice = -1;
    let limitOrderSalePrice = -1;
    let marketOrderSaleTime = -1;
    let limitOrderSaleTime = -1;
    const websocket = binance.futuresMarkPriceStream(symbol, (prices) => {
      latestPrice = prices.indexPrice;
    });
    const interval = setInterval(function () {
      // console.log("LOGGING:", latestPrice);
      // Maybe add the red alert signal here
      if (
        latestPrice != 0 &&
        marketOrderRunning &&
        (latestPrice <= marketOrderStopLossPrice ||
          latestPrice >= marketOrderTakeProfitPrice)
      ) {
        console.log("HIT: Market order price");
        marketOrderSalePrice = latestPrice;
        marketOrderSaleTime = Date.now();
        marketOrderRunning = false;
      }

      if (
        latestPrice != 0 &&
        limitOrderRunning &&
        (latestPrice <= limitOrderStopLossPrice ||
          latestPrice >= limitOrderTakeProfitPrice)
      ) {
        console.log("HIT: Limit order price");
        limitOrderSalePrice = latestPrice;
        limitOrderSaleTime = Date.now();
        limitOrderRunning = false;
      }

      if (latestPrice != 0 && !marketOrderRunning && !limitOrderRunning) {
        binance.futuresTerminate(websocket);
        clearInterval(interval);
        res([
          marketOrderSalePrice,
          marketOrderSaleTime,
          limitOrderSalePrice,
          limitOrderSaleTime,
        ]);
      }
    }, 1000);
  });
}

module.exports = simulatePurchase;
