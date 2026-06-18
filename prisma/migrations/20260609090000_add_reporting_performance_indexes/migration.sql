-- Reporting table indexes for large imported datasets.
CREATE INDEX "AccountMapping_clientId_idx" ON "AccountMapping"("clientId");
CREATE INDEX "AccountMapping_clientId_isActive_idx" ON "AccountMapping"("clientId", "isActive");
CREATE INDEX "AccountMapping_platform_sourceAccountId_idx" ON "AccountMapping"("platform", "sourceAccountId");

CREATE INDEX "Connector_accountMappingId_idx" ON "Connector"("accountMappingId");
CREATE INDEX "Connector_healthStatus_idx" ON "Connector"("healthStatus");

CREATE INDEX "SyncRun_clientId_startedAt_idx" ON "SyncRun"("clientId", "startedAt");
CREATE INDEX "SyncRun_clientId_status_startedAt_idx" ON "SyncRun"("clientId", "status", "startedAt");
CREATE INDEX "SyncRun_accountMappingId_status_idx" ON "SyncRun"("accountMappingId", "status");

CREATE INDEX "RawSourceRow_syncRunId_idx" ON "RawSourceRow"("syncRunId");
CREATE INDEX "RawSourceRow_sourceReference_idx" ON "RawSourceRow"("sourceReference");

CREATE INDEX "MetricRow_clientId_occurredOn_idx" ON "MetricRow"("clientId", "occurredOn");
CREATE INDEX "MetricRow_clientId_platform_sourceAccountId_occurredOn_idx" ON "MetricRow"("clientId", "platform", "sourceAccountId", "occurredOn");
CREATE INDEX "MetricRow_clientId_metricName_occurredOn_idx" ON "MetricRow"("clientId", "metricName", "occurredOn");
CREATE INDEX "MetricRow_syncRunId_idx" ON "MetricRow"("syncRunId");
CREATE INDEX "MetricRow_metricName_idx" ON "MetricRow"("metricName");
CREATE INDEX "MetricRow_occurredOn_idx" ON "MetricRow"("occurredOn");
CREATE INDEX "MetricRow_importedAt_idx" ON "MetricRow"("importedAt");

CREATE INDEX "ClientGoal_clientId_idx" ON "ClientGoal"("clientId");

CREATE INDEX "ClientBudget_clientId_idx" ON "ClientBudget"("clientId");
CREATE INDEX "ClientBudget_clientId_startsOn_endsOn_idx" ON "ClientBudget"("clientId", "startsOn", "endsOn");

CREATE INDEX "Report_clientId_createdAt_idx" ON "Report"("clientId", "createdAt");
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

CREATE INDEX "ReportVersion_reportId_versionNumber_idx" ON "ReportVersion"("reportId", "versionNumber");

CREATE INDEX "Insight_reportVersionId_idx" ON "Insight"("reportVersionId");

CREATE INDEX "Anomaly_reportVersionId_idx" ON "Anomaly"("reportVersionId");
CREATE INDEX "Anomaly_severity_clientSafe_idx" ON "Anomaly"("severity", "clientSafe");

CREATE INDEX "DataQualityScore_reportVersionId_idx" ON "DataQualityScore"("reportVersionId");

CREATE INDEX "ApprovalEvent_reportId_createdAt_idx" ON "ApprovalEvent"("reportId", "createdAt");
CREATE INDEX "ApprovalEvent_userId_createdAt_idx" ON "ApprovalEvent"("userId", "createdAt");

CREATE INDEX "DeliveryLog_reportId_createdAt_idx" ON "DeliveryLog"("reportId", "createdAt");
CREATE INDEX "DeliveryLog_status_createdAt_idx" ON "DeliveryLog"("status", "createdAt");

CREATE INDEX "EmailDraft_reportId_createdAt_idx" ON "EmailDraft"("reportId", "createdAt");
