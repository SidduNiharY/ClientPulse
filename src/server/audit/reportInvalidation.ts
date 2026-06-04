export function shouldInvalidateApproval(input: {
  approvedVersion: number;
  latestVersion: number;
  latestSyncRunFinishedAt: Date | null;
  approvedAt: Date | null;
}): boolean {
  if (!input.approvedAt) return false;
  if (input.latestVersion > input.approvedVersion) return true;
  if (
    input.latestSyncRunFinishedAt &&
    input.latestSyncRunFinishedAt > input.approvedAt
  ) {
    return true;
  }
  return false;
}
