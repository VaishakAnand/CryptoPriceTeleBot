require("dotenv").config();
const Binance = require("node-binance-api");
const telebot = require("./bot.js").bot;
const sendPaperTradeDetails = require("./bot.js").sendPaperTradeDetails;
const insertTradeIntoDb = require("./db/paperTradingDb.js").insertTradeIntoDb;
const binance = new Binance().options({
  APIKEY: process.env.BINANCE_API_KEY,
  APISECRET: process.env.BINANCE_API_SECRET,
});

function buy_with_leverage(symbol, priceToBuy) {
  const side = "BUY";
  // change margin type for symbol
  // POST /fapi/v1/marginType (HMAC SHA256)
  // symbol, marginType = ISOLATED, timestamp

  // change leverage for symbol
  // POST /fapi/v1/leverage (HMC)
  // symbol, leverage (1 to 125), timestamp (current time stamp in ms)

  // post buy order
  // POST /fapi/v1/order (HMAC SHA256)
  // symbol, side = BUY, type = LIMIT,

  // Query buy order till filled
  // post sell at stop loss order
  // post sell at take profit order
}

function rngAmount(min, max) {
  return Math.random() * (max - min) + min;
}

function simulatePurchase(symbol) {
  binance.futuresMarkPrice(symbol).then((price) => {
    console.log(price);
    // Place order:
    //  - Market Order -> Add rng amount
    //  - Limit Order -> Use indexPrice
    const indexPrice = price.indexPrice;
    const marketOrderPrice = rngAmount(0.999, 1.001) * indexPrice;
    const limitOrderPrice = indexPrice;

    // Set Leverage
    const leverage = 25;
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
    const marketOrderFees = leverage * marginAmount * (0.036 / 100);
    const limitOrderFees = leverage * marginAmount * (0.018 / 100);

    const stopLossPercentage = -10;
    const takeProfitPercentage = 10;
    // Stop losses and take profit prices
    const marketOrderStopLossPrice =
      ((100 + stopLossPercentage / leverage) / 100) * marketOrderPrice;
    const marketOrderTakeProfitPrice =
      ((100 + takeProfitPercentage / leverage) / 100) * marketOrderPrice;
    const limitOrderStopLossPrice =
      ((100 + stopLossPercentage / leverage) / 100) * limitOrderPrice;
    const limitOrderTakeProfitPrice =
      ((100 + takeProfitPercentage / leverage) / 100) * limitOrderPrice;

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
        marketOrderPurchaseTime,
        marketOrderSaleTime,
        "Market",
        indexPrice,
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
        limitOrderPurchaseTime,
        limitOrderSaleTime,
        "Limit",
        indexPrice,
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
      // sendPaperTradeDetails(...marketOrderDetails);
      // sendPaperTradeDetails(...limitOrderDetails);
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
      const indexPrice = prices.indexPrice;
      latestPrice = indexPrice;
    });
    const interval = setInterval(function () {
      console.log("LOGGING:", latestPrice);
      // Maybe add the red alert signal here
      if (
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
        limitOrderRunning &&
        (latestPrice <= limitOrderStopLossPrice ||
          latestPrice >= limitOrderTakeProfitPrice)
      ) {
        console.log("HIT: Limit order price");
        limitOrderSalePrice = latestPrice;
        limitOrderSaleTime = Date.now();
        limitOrderRunning = false;
      }

      if (!marketOrderRunning && !limitOrderRunning) {
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

simulatePurchase("SOLUSDT");
