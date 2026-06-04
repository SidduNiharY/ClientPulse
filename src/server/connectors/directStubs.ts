import type { Connector, ConnectorResult } from "./types";

export class NeedsAuthorizationConnector implements Connector {
  constructor(public readonly connectorType: string) {}

  async fetch(): Promise<ConnectorResult> {
    throw new Error(
      `${this.connectorType} requires official authorization before direct API sync can run`
    );
  }
}
