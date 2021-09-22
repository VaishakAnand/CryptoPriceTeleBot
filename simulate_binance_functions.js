require("dotenv").config();
const Binance = require("node-binance-api");
const telebot = require("./bot.js");
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
    // Place order:
    //  - Market Order -> Add rng amount
    //  - Limit Order -> Use estimatedSellingPrice
    const estimatedSellingPrice = price.estimatedSellingPrice;
    const marketOrderPrice = rngAmount(0.99, 1.01) * estimatedSellingPrice;
    const limitOrderPrice = estimatedSellingPrice;

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

    // Stop losses and take profit prices
    const marketOrderStopLossPrice = 0.95 * marketOrderPrice;
    const marketOrderTakeProfitPrice = 1.1 * marketOrderPrice;
    const limitOrderStopLossPrice = 0.95 * limitOrderPrice;
    const limitOrderTakeProfitPrice = 1.1 * limitOrderPrice;

    // Wait for either stop loss or take profit to hit
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
      // Maybe add the red alert signal here
      if (
        marketOrderRunning &&
        (latestPrice <= marketOrderStopLossPrice ||
          latestPrice >= marketOrderTakeProfitPrice)
      ) {
        marketOrderSalePrice = latestPrice;
        marketOrderSaleTime = Date.now();
        marketOrderRunning = false;
      }

      if (
        limitOrderRunning &&
        (latestPrice <= limitOrderStopLossPrice ||
          latestPrice >= limitOrderTakeProfitPrice)
      ) {
        limitOrderSalePrice = latestPrice;
        limitOrderSaleTime = Date.now();
        limitOrderRunning = false;
      }

      if (!marketOrderRunning && !limitOrderRunning) {
        binance.futuresTerminate(websocket);
        clearInterval(interval);
      }
    }, 1000);

    const marketOrderNetProfit =
      marketOrderPrice * marketOrderUnits -
      marketOrderSalePrice -
      marketOrderFees;
    const limitOrderNetProfit =
      limitOrderPrice * limitOrderUnits - limitOrderSalePrice - limitOrderFees;

    // Store in Database

    // Send in telegram
  });
}
