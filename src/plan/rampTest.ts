/**
 * Rampentest auswerten – genau wie im Backend (RampTest.java): FTP = 75 % der besten Minute, aber nur, wenn davor
 * eine echte Rampe lag (8 Minuten fast durchgehend steigend, am Ende mindestens +25 %).
 */

export type RampTestResult = { bestMinuteWatts: number; ftp: number }

const MINUTE = 60
const RAMP_MINUTES = 8
const ALLOWED_DIPS = 1
const MIN_RISE = 1.25
export const FTP_SHARE_OF_BEST_MINUTE = 0.75

/** watts: eine Zahl je gefahrener Sekunde (Pausen schon weggelassen) */
export function evaluateRampTest(watts: number[]): RampTestResult | null {
  const needed = (RAMP_MINUTES + 1) * MINUTE
  if (watts.length < needed) return null
  const sums = [0]
  for (const w of watts) sums.push(sums[sums.length - 1]! + w)
  const minuteSum = (end: number) => sums[end]! - sums[end - MINUTE]!

  let bestEnd = -1
  let bestSum = -1
  for (let end = needed; end <= watts.length; end++) {
    if (minuteSum(end) > bestSum) {
      bestSum = minuteSum(end)
      bestEnd = end
    }
  }
  const minutes = Array.from(
    { length: RAMP_MINUTES + 1 },
    (_, i) => minuteSum(bestEnd - (RAMP_MINUTES - i) * MINUTE) / MINUTE,
  )
  const dips = minutes.slice(1).filter((value, i) => value <= minutes[i]!).length
  if (dips > ALLOWED_DIPS || minutes[0]! <= 0 || minutes[RAMP_MINUTES]! < minutes[0]! * MIN_RISE) {
    return null
  }
  const best = Math.round(bestSum / MINUTE)
  return { bestMinuteWatts: best, ftp: Math.round(best * FTP_SHARE_OF_BEST_MINUTE) }
}
