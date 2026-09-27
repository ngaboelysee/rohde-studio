/**
 * Admin upload API — multipart image upload into Supabase Storage,
 * then attaches the URL to the product's image list. Guarded (404 otherwise).
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

  if (!(file instanceof File) || typeof productId !== "string") {
    return NextResponse.json({ error: "Missing file or product" }, { status: 400 });
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
