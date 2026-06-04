export function buildClientSummaryEmail(input: {
  clientName: string;
  reportPeriod: string;
  highlights: string[];
  recommendedSteps: string[];
  agencySignature: string;
}): { subject: string; body: string } {
  return {
    subject: `${input.clientName} performance report - ${input.reportPeriod}`,
    body: [
      `Hi ${input.clientName},`,
      "",
      `Please find attached your performance report for ${input.reportPeriod}.`,
      "",
      "Key highlights:",
      ...input.highlights.slice(0, 5).map((highlight) => `- ${highlight}`),
      "",
      "Recommended next steps:",
      ...input.recommendedSteps.slice(0, 3).map((step) => `- ${step}`),
      "",
      input.agencySignature
    ].join("\n")
  };
}
