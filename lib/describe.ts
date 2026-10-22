/* Sentences built from numbers, in the reader's language. The backend's own
 * `message` is English-only, so the UI words everything itself. */

import type { Outlook, RiskSnapshot } from './types';
import type { MsgKey, Params } from './i18n';
import { rainBucket } from './outlook';

type T = (key: MsgKey, params?: Params) => string;
type Num = (n: number, digits?: number) => string;

export function riskSentence(risk: RiskSnapshot, t: T, num: Num): string {
  const tier = t(`tier.${risk.tier}`);
  if (risk.bufferFt == null || risk.nearestMiles == null) return t('risk.sentenceNoGauge', { tier });
  const params = { tier, miles: num(risk.nearestMiles, 1), buffer: num(Math.abs(risk.bufferFt), 1) };
  return risk.bufferFt < 0 ? t('risk.sentenceOver', params) : t('risk.sentence', params);
}

export function outlookDetail(o: Outlook, t: T, num: Num): string {
  const buffer = num(o.bufferFt, 1);
  const rate = num(Math.abs(o.trendFtHr), 2);
  const gauge =
    o.trend === 'rising'
      ? t('outlook.gauge.rising', { rate, buffer })
      : o.trend === 'falling'
        ? t('outlook.gauge.falling', { rate, buffer })
        : t('outlook.gauge.steady', { buffer });
  const rain = t(`outlook.rain.${rainBucket(o.rain6)}`, { inches: num(o.rain6, 2) });
  return [gauge, rain, o.level === 'WARNING' ? t('outlook.official') : '']
    .filter(Boolean)
    .join(' ');
}

const WX_CODES = new Set([0, 1, 2, 3, 45, 48, 51, 53, 55, 61, 63, 65, 66, 67, 71, 73, 75, 80, 81, 82, 95, 96, 99]);

export function weatherLabel(code: number, t: T): string {
  return WX_CODES.has(code) ? t(`wx.${code}` as MsgKey) : t('wx.unknown');
}
