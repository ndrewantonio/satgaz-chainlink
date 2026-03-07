import { ok, json, type HTTPSendRequester } from "@chainlink/cre-sdk";

export function fetchProtocolEnrichment(
  sendRequester: HTTPSendRequester,
  defiLlamaBaseUrl: string,
  targetProtocol: string,
): { tvlChange: number; hasData: boolean } {
  try {
    const response = sendRequester
      .sendRequest({
        url: `${defiLlamaBaseUrl}/protocol/${targetProtocol}`,
        method: "GET",
        timeout: "10000",
      })
      .result();

    if (!ok(response)) {
      return { tvlChange: 0, hasData: false };
    }

    const data = json(response) as {
      tvl?: Array<{ date: number; totalLiquidityUSD: number }>;
    };

    if (!data.tvl || data.tvl.length < 2) {
      return { tvlChange: 0, hasData: false };
    }

    const latest = data.tvl[data.tvl.length - 1].totalLiquidityUSD;
    const daysAgo30Idx = Math.max(0, data.tvl.length - 31);
    const past = data.tvl[daysAgo30Idx].totalLiquidityUSD;
    const tvlChange = past > 0 ? ((latest - past) / past) * 100 : 0;

    return { tvlChange, hasData: true };
  } catch {
    return { tvlChange: 0, hasData: false };
  }
}
