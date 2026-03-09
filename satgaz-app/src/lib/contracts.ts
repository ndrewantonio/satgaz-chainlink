export const ESCROW_ADDRESS = (import.meta.env.VITE_ESCROW_ADDRESS ??
  "0xf217CE89D15455e68276718e499eC87bF9b5b207") as `0x${string}`;

export const WORKFLOW_HTTP_URL: string =
  import.meta.env.VITE_WORKFLOW_HTTP_URL ?? "http://localhost:8080";

export const SUBMISSION_ESCROW_ABI = [
  {
    type: "function",
    name: "pay",
    inputs: [
      { name: "paymentId", type: "bytes32" },
      { name: "payload", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "submissionFee",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "SubmissionPaid",
    inputs: [
      { name: "submitter", type: "address", indexed: true },
      { name: "paymentId", type: "bytes32", indexed: true },
      { name: "feePaid", type: "uint256", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
      { name: "payload", type: "bytes", indexed: false },
    ],
  },
] as const;
