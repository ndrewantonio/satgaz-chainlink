import { ThreatType } from "../enums/request.enum";

export type RequestPayload = {
  targetProtocol: string;
  targetChain: string;
  threatType: ThreatType;
  paymentTxHash?: string; // TX hash of the SubmissionPaid payment transaction.
  evidence: {
    description: string;
    txHashes: string[];
    contractAddresses: string[];
    additionalData: string;
  };
  payoutAddress: string;
};
