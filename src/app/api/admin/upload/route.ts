/**
 * Admin upload API — multipart image upload into Supabase Storage.
 *
 * With `productId`: appends to the product's campaign gallery (card image
 * + PDP thumbnails). With `variantId` instead: stores the photograph as
 * that variant's dedicated per-colour photo. Guarded (404 otherwise).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminGuard } from "@/lib/api";
import { uploadAdminImage } from "@/lib/supabase-storage";

export const runtime = "nodejs";

export const POST = withAdminGuard(async (req) => {
  const form = await req.formData();
  const file = form.get("file");
  const productId = form.get("productId");
  const variantId = form.get("variantId");

  if (!(file instanceof File) || (typeof productId !== "string" && typeof variantId !== "string")) {
    return NextResponse.json({ error: "Missing file or target" }, { status: 400 });
  }

  if (typeof variantId === "string") {
    // Per-colour photo: attach directly to the variant.
    const variant = await prisma.variant.findUnique({
      where: { id: variantId },
      select: { id: true, sku: true, image: true },
    });
    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }
    const uploaded = await uploadAdminImage({ file, bucket: "product", session: req.session });
    await prisma.variant.update({ where: { id: variant.id }, data: { image: uploaded.url } });
    return NextResponse.json({ ok: true, url: uploaded.url });
  }

  if (typeof productId !== "string") {
    return NextResponse.json({ error: "Missing product" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, images: true, slug: true },
  });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const uploaded = await uploadAdminImage({ file, bucket: "product", session: req.session });

  await prisma.product.update({
    where: { id: product.id },
    data: { images: [...product.images, uploaded.url] },
  });

  return NextResponse.json({ ok: true, url: uploaded.url });
});
