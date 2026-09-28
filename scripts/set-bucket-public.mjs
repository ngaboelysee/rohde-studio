// One-off: make the product-images bucket public so uploaded product photos
// render on the storefront (campaign-lookbooks stays private by design).
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);
const { data, error } = await supabase.storage.updateBucket("product-images", { public: true });
if (error) {
  console.error("updateBucket failed:", error.message);
  process.exit(1);
}
console.log("product-images is now public:", data);
