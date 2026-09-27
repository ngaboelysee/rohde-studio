/**
 * Supabase Storage service — server-side uploads for product imagery and
 * campaign lookbooks. Buckets must be private; reads happen through signed
 * URLs or the CDN domain configured in Supabase.
 */
import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { audit } from "@/lib/admin-auth";
import type { AdminSession } from "@/lib/admin-session";

const PRODUCT_BUCKET = "product-images";
const LOOKBOOK_BUCKET = "campaign-lookbooks";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

function buildObjectPath(bucket: string, fileName: string): string {
  const ext = (fileName.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${bucket}/${stamp}-${rand}.${ext}`;
}

export async function uploadAdminImage(params: {
  file: File;
  bucket: "product" | "lookbook";
  session: AdminSession;
}): Promise<{ url: string; path: string }> {
  const { file, bucket, session } = params;

  if (!(file instanceof File)) throw new Error("Invalid upload");
  if (!ALLOWED_MIME.has(file.type)) throw new Error("Unsupported image format");
  if (file.size > MAX_BYTES) throw new Error("Image exceeds 8MB limit");

  const supabase = getSupabaseAdmin();
  const bucketName = bucket === "product" ? PRODUCT_BUCKET : LOOKBOOK_BUCKET;
  const objectPath = buildObjectPath(bucketName, file.name);

  const { error } = await supabase.storage
    .from(bucketName)
    .upload(objectPath, file, { contentType: file.type, upsert: false });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(bucketName).getPublicUrl(objectPath);

  await audit({
    session,
    action: "storage.uploaded",
    entity: "Storage",
    entityId: objectPath,
    detail: { bucket: bucketName, size: file.size, mime: file.type },
  });

  return { url: data.publicUrl, path: objectPath };
}
