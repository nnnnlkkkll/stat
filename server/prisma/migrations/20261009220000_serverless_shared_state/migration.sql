-- Shared state for serverless API instances.
CREATE TABLE "rate_limit_buckets" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "hits" INTEGER NOT NULL,
  "reset_at" TIMESTAMPTZ(6) NOT NULL
);
CREATE INDEX "rate_limit_buckets_reset_at_idx" ON "rate_limit_buckets"("reset_at");

CREATE TABLE "typing_indicators" (
  "conversation_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "typing_indicators_pkey" PRIMARY KEY ("conversation_id", "user_id")
);
CREATE INDEX "typing_indicators_expires_at_idx" ON "typing_indicators"("expires_at");
