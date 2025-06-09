import { DateTime } from 'luxon';
import { erf } from 'mathjs';


async function getDeliveryFeaturesPrice(ticker: string, expirationDate: string): Promise<number> {
  console.log(`Мокаем стоимость фьючерса ${ticker}USDT на дату ${expirationDate}`);
  return 125000;
}

async function getIVIndex(ticker: string, expirationDate: string, strike: number): Promise<number> {
  console.log(`Мокаем имплицированную волатильность актива ${ticker} на дату ${expirationDate} для значения ${strike}`);
  return 0.6;
}

// Cumulative Distribution Function - функция распределения вероятностей
function normalCDF(x: number): number {
  const value = 0.5 * (1 + erf(x / Math.sqrt(2)));
  return value;
}

type ProbabilityInput = {
  expectedPrice: number;    // цена фьючерса (ожидаемая цена)
  targetPrice: number;      // цена, вероятность которой хотим узнать
  daysToExpiry: number;     // дней до указанной даты
  impliedVolatility: number; // имплицированная волатильность
};

function calcProbabilityPriceBelow(input: ProbabilityInput): number {
  const T = input.daysToExpiry / 365;
  const sigma = input.impliedVolatility;
  const d2 = (Math.log(input.expectedPrice / input.targetPrice) - 0.5 * sigma ** 2 * T) / (sigma * Math.sqrt(T));
  return normalCDF(d2); // вероятность, что цена будет ≤ target
}

function calcProbabilityPriceAbove(input: ProbabilityInput): number {
  return 1 - calcProbabilityPriceBelow(input);
}

function calcProbabilityPriceNear(input: ProbabilityInput & { epsilon?: number }): number {
  const { epsilon, ...restInput } = input;
  const upper = calcProbabilityPriceBelow({
    ...restInput,
    targetPrice: restInput.targetPrice + epsilon,
  }); // вероятность что ниже верхней границы

  const lower = calcProbabilityPriceAbove({
    ...restInput,
    targetPrice: restInput.targetPrice - epsilon,
  });  // вероятность что выше нижней границы

  return Math.abs(upper + lower - 1); // вероятность что пападаем в диапазон
}


async function calculateProbability(ticker: string, date: string, price: number): Promise<number> {
  const epsilonPercent = 1;
  const epsilon = Math.round(price * epsilonPercent / 100); // математически точная вероятность попадания равна нулю, поэтому правильно брать диапазон +-epsilon 
  console.log(`Расчет вероятности что стоимость тикера ${ticker} на дату ${date} будет примерно ${price} (попадет в диапазон от плюс/минус ${epsilonPercent}%)`);
  const luxonDate = DateTime.fromISO(date);
  const nowDate = DateTime.now();
  const daysCount = Math.round(luxonDate.diff(nowDate, 'days').as('day'));
  const deliveryFeaturesPrice = await getDeliveryFeaturesPrice(ticker, date);
  const ivIndex = await getIVIndex(ticker, date, price);


  const probabilityPriceNear = calcProbabilityPriceNear({ expectedPrice: deliveryFeaturesPrice, targetPrice: price, daysToExpiry: daysCount, impliedVolatility: ivIndex, epsilon });
  return probabilityPriceNear;
}


(async () => {
  const date = '2025-07-01';
  const price = 115000;
  const ticker = 'BTC';
  const probability = await calculateProbability('BTC', date, price);
  console.log(`Вероятность ≈ ${(probability * 100).toFixed(2)}%`);
})();