// import axios from 'axios';
import { DateTime } from 'luxon';

interface IBinanceResult {
  symbol: string;
  price: string;
  time: number;
}

async function getLatestFuturesPrice(symbol: string): Promise<number> {
  // const res = await axios.get(`https://fapi.binance.com/fapi/v2/ticker/price?symbol=${symbol}`, { timeout: 60000 });
  // const data: IBinanceResult = res.data as IBinanceResult;
  const data: IBinanceResult = {
    symbol: 'BTCUSDT',
    price: '106102.50',
    time: 1749461788907,
  };
  return parseFloat(data.price);
}

type ForecastParams = {
  symbol: string; // e.g., "BTCUSDT"
  daysToExpiry?: number;
  impliedVolatility?: number;
};

type ForecastResult = {
  expectedPrice: number;
  lowerBound?: number;
  upperBound?: number;
};

async function forecastFromBinance(params: ForecastParams): Promise<ForecastResult> {
  const { symbol, daysToExpiry, impliedVolatility } = params;

  const futurePrice = await getLatestFuturesPrice(symbol);
  const result: ForecastResult = { expectedPrice: futurePrice };

  if (daysToExpiry !== undefined && impliedVolatility !== undefined) {
    const T = daysToExpiry / 365;
    const stdDev = futurePrice * impliedVolatility * Math.sqrt(T);
    result.lowerBound = futurePrice - stdDev;
    result.upperBound = futurePrice + stdDev;
  }

  return result;
}

const expectedPrice = async (symbol: string, date: Date): Promise<string> => {
  symbol = `${symbol}USDT`;

  const nowDate = DateTime.now();
  const targetDate = DateTime.fromJSDate(date);
  const days = targetDate.diff(nowDate, 'days').as('days');

  const data = await forecastFromBinance({
    symbol,
    daysToExpiry: days,
    impliedVolatility: 0.6, // Например, 60%
  });

  console.log(`Ожидаемая цена BTC через ${days} дней: $${data.expectedPrice.toFixed(2)}`);
  console.log(`Диапазон [–1σ]: [$${data.lowerBound!.toFixed(2)}, $${data.upperBound!.toFixed(2)}]`);

  return data.expectedPrice.toFixed(2);
};

(async () => {
  const date = new Date();
  date.setFullYear(2026);
  const price = await expectedPrice('BTC', date);
  console.log('Expected price:', price);
})();
