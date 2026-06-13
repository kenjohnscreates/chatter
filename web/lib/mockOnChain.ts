export interface MockOnChain {
  onChainMomentum: number;
  priceDeltaPercent: number;
  agreementLabel: string;
}

function hashTicker(ticker: string) {
  return ticker.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

export function mockOnChainForAsset(
  ticker: string,
  socialConfidence: number,
): MockOnChain {
  const hash = hashTicker(ticker);
  const onChainMomentum = 25 + (hash % 76);
  const priceDeltaPercent = Math.round(((hash % 41) - 20) * 10) / 10;

  const socialHigh = socialConfidence >= 0.6;
  const chainHigh = onChainMomentum >= 60;

  let agreementLabel = "Watch";
  if (socialHigh && chainHigh) agreementLabel = "Confirmed trend";
  else if (socialHigh && !chainHigh) agreementLabel = "Narrative only";
  else if (!socialHigh && chainHigh) agreementLabel = "Quiet accumulation";

  return { onChainMomentum, priceDeltaPercent, agreementLabel };
}
