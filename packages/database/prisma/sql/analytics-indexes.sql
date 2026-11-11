-- Queue analytics lookups. Restaurant scope is Queue.businessId; tokens are reached through queueId.
-- QueueToken(queueId, createdAt): period scans for one restaurant's queues.
-- QueueToken(queueId, status, createdAt): completed, cancelled, and no-show counts in a period.
-- QueueToken(customerPhone, createdAt): first-visit lookup for new vs returning guests.
CREATE INDEX IF NOT EXISTS "QueueToken_queueId_createdAt_idx" ON "QueueToken"("queueId", "createdAt");
CREATE INDEX IF NOT EXISTS "QueueToken_queueId_status_createdAt_idx" ON "QueueToken"("queueId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "QueueToken_customerPhone_createdAt_idx" ON "QueueToken"("customerPhone", "createdAt");
