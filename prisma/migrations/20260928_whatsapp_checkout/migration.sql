-- WhatsApp checkout + mobile-money verification: payment ledger fields,
-- WhatsApp channel fields on orders, store settings table, and new
-- payment/order statuses.

-- AlterEnum: payment evidence + verification states
ALTER TYPE "PaymentStatus" ADD VALUE 'SUBMITTED';
ALTER TYPE "PaymentStatus" ADD VALUE 'VERIFIED';
ALTER TYPE "PaymentStatus" ADD VALUE 'REJECTED';
ALTER TYPE "PaymentStatus" ADD VALUE 'PARTIALLY_PAID';
ALTER TYPE "PaymentStatus" ADD VALUE 'VERIFICATION_PENDING';
ALTER TYPE "PaymentStatus" ADD VALUE 'UNDER_REVIEW';

-- AlterEnum: fulfilment pipeline
ALTER TYPE "OrderStatus" ADD VALUE 'CONFIRMED';
ALTER TYPE "OrderStatus" ADD VALUE 'PREPARING';
ALTER TYPE "OrderStatus" ADD VALUE 'OUT_FOR_DELIVERY';
ALTER TYPE "OrderStatus" ADD VALUE 'DELIVERED';

-- AlterEnum: checkout channel provider
ALTER TYPE "PaymentProvider" ADD VALUE 'WHATSAPP';

-- AlterTable — WhatsApp checkout fields
ALTER TABLE "Order" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'web';
ALTER TABLE "Order" ADD COLUMN "whatsappPhone" TEXT;
ALTER TABLE "Order" ADD COLUMN "deliveryInstructions" TEXT;
ALTER TABLE "Order" ADD COLUMN "expiresAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "waState" TEXT;
ALTER TABLE "Order" ADD COLUMN "localAmount" DECIMAL(12,2);
ALTER TABLE "Order" ADD COLUMN "localCurrency" TEXT;

-- AlterTable — payment ledger verification fields
ALTER TABLE "Payment" ADD COLUMN "sender" TEXT;
ALTER TABLE "Payment" ADD COLUMN "receiver" TEXT;
ALTER TABLE "Payment" ADD COLUMN "verifiedAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN "verificationSource" TEXT;

-- Indexes for the verification engine + bot lookups
CREATE INDEX "Order_channel_idx" ON "Order"("channel");
CREATE INDEX "Order_expiresAt_idx" ON "Order"("expiresAt");
CREATE INDEX "Order_whatsappPhone_idx" ON "Order"("whatsappPhone");
CREATE INDEX "Payment_orderId_status_idx" ON "Payment"("orderId", "status");

-- CreateTable — admin-managed store settings
CREATE TABLE "StoreSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSetting_pkey" PRIMARY KEY ("key")
);
