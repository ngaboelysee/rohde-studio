/**
 * Zod runtime schemas shared by client and server boundaries.
 * Client forms validate before submit; server actions/routes re-validate
 * before any database query. Never trust the client copy alone.
 */
import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(5)
  .max(320)
  .email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Minimum 8 characters")
  .max(128)
  .regex(/[a-zA-Z]/, "Include at least one letter")
  .regex(/[0-9]/, "Include at least one number");

export const authCredentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Tell us your name").max(80),
  email: emailSchema,
  password: passwordSchema,
  marketingOptIn: z.boolean().optional().default(false),
});

export const checkoutSchema = z.object({
  email: emailSchema,
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(20).regex(/^[+0-9()\-\s]+$/, "Enter a valid phone number"),
  line1: z.string().trim().min(4).max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(2).max(80),
  region: z.string().trim().max(80).optional().or(z.literal("")),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
  country: z.string().trim().length(2, "Use a 2-letter country code"),
  provider: z.enum(["STRIPE", "PAYSTACK", "FLUTTERWAVE", "MOBILE_MONEY", "WHATSAPP"]),
  /** WhatsApp checkout: chosen delivery area name (fee resolved server-side). */
  deliveryArea: z.string().trim().max(80).optional().or(z.literal("")),
  /** WhatsApp checkout: landmark / delivery instructions. */
  deliveryInstructions: z.string().trim().max(300).optional().or(z.literal("")),
});

export const cartLineSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(10),
});

export const checkoutSubmitSchema = z.object({
  customer: checkoutSchema,
  items: z.array(cartLineSchema).min(1, "Your bag is empty").max(50),
});

export const wishlistToggleSchema = z.object({
  productId: z.string().min(1),
});

export const adminProductSchema = z.object({
  name: z.string().trim().min(2).max(140),
  slug: z
    .string()
    .trim()
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and hyphens only")
    .optional()
    .or(z.literal("")),
  description: z.string().trim().min(20).max(4000),
  story: z.string().trim().max(2000).optional().or(z.literal("")),
  category: z.string().min(1).max(60), // category slug — resolved server-side
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  basePrice: z.number().nonnegative().max(1_000_000),
  currency: z.string().length(3).default("USD"),
  dropName: z.string().trim().max(60).optional().or(z.literal("")),
  isFeatured: z.boolean().default(false),
  materials: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
  images: z.array(z.string().url()).max(12).default([]),
});

export const adminVariantSchema = z.object({
  productId: z.string().min(1),
  sku: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[A-Za-z0-9\-]+$/, "SKU: letters, numbers, hyphens"),
  size: z.string().trim().min(1).max(12),
  color: z.string().trim().min(1).max(40),
  price: z.number().nonnegative().max(1_000_000).optional(),
  active: z.boolean().default(true),
});

export const adminCategorySchema = z.object({
  label: z.string().trim().min(2, "Name too short").max(40, "Name too long"),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

export const adminCategoryUpdateSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(2).max(40).optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  isActive: z.boolean().optional(),
});

export const adminInventorySchema = z.object({
  variantId: z.string().min(1),
  onHand: z.number().int().min(0).max(100_000),
});

export const adminLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
  inviteCode: z.string().min(1).optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSubmitSchema>;
export type AdminProductInput = z.infer<typeof adminProductSchema>;
export type AdminVariantInput = z.infer<typeof adminVariantSchema>;
