-- Add PAID to PaymentStatus: order-level marker written when the sum of
-- VERIFIED ledger entries covers the order total (WhatsApp checkout).
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PAID';
