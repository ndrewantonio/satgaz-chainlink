import { ThreatLevel } from "../../enums/request.enum";

const DEFAULT_RESPONSE = {
  threatConfirmed: false,
  riskLevel: ThreatLevel.LOW,
  reasoning: "AI analysis unavailable or unparseable",
};

export function parseAiResponse(responseBody: string): {
  threatConfirmed: boolean;
  riskLevel: ThreatLevel;
  reasoning: string;
} {
  try {
    let jsonStr = responseBody.trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return DEFAULT_RESPONSE;
    jsonStr = jsonMatch[0];

    const parsed = JSON.parse(jsonStr);

    if (typeof parsed.threatConfirmed !== "boolean") return DEFAULT_RESPONSE;

    const validLevels = new Set<string>(Object.values(ThreatLevel));
    const riskLevel = validLevels.has(parsed.riskLevel)
      ? (parsed.riskLevel as ThreatLevel)
      : ThreatLevel.LOW;

    return {
      threatConfirmed: parsed.threatConfirmed,
      riskLevel,
      reasoning:
        typeof parsed.reasoning === "string"
          ? parsed.reasoning.slice(0, 200)
          : "No reasoning provided",
    };
  } catch {
    return DEFAULT_RESPONSE;
  }
}
