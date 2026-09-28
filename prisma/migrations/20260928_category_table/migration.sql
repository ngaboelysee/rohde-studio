-- Dynamic categories: replace the fixed "Category" enum with a real table
-- so the admin can create, rename, order and hide categories from the
-- dashboard. Existing enum values are preserved as rows; any admin-defined
-- labels migrate with them. The old CategorySetting table is retired —
-- its data (label + sortOrder) moves onto the new Category rows.
--
-- Ordering constraints handled below:
--   * the enum type and the new table cannot share the name "Category",
--     so the type is dropped before the table is created;
--   * the type cannot be dropped while CategorySetting depends on it, so
--     CategorySetting's label data is harvested into a temp table first.

-- 1. Harvest any admin-defined labels, then retire the settings table.
CREATE TEMP TABLE _category_settings AS
SELECT "category"::text AS "category", "label", "sortOrder" FROM "CategorySetting";
DROP TABLE "CategorySetting";

-- 2. Add the new product column (old "category" column stays for mapping).
ALTER TABLE "Product" ADD COLUMN "categoryId" TEXT;

-- 3. Map each product's enum value to the stable id the new row will get.
UPDATE "Product" SET "categoryId" = 'cat_' || LOWER("category"::text);

-- 4. Safety net: anything unexpected falls back to TOPS.
UPDATE "Product" SET "categoryId" = 'cat_tops'
WHERE "categoryId" NOT IN ('cat_outerwear','cat_knitwear','cat_tops','cat_bottoms','cat_accessories','cat_footwear');

-- 5. Enforce NOT NULL, then release the enum dependency.
ALTER TABLE "Product" ALTER COLUMN "categoryId" SET NOT NULL;
ALTER TABLE "Product" DROP COLUMN "category";

-- 6. Swap the (status, category) index for the categoryId equivalent.
-- (Dropping the column above already removed the old composite index.)
DROP INDEX IF EXISTS "Product_status_category_idx";
CREATE INDEX "Product_status_categoryId_idx" ON "Product"("status", "categoryId");

-- 7. Drop the enum (no remaining dependencies).
DROP TYPE "Category";

-- 8. Create the table (name now free).
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- 9. Seed the six former enum values with stable ids; carry over any
--    admin-defined labels and sort order harvested in step 1.
INSERT INTO "Category" ("id", "slug", "label", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT
    'cat_' || LOWER(v.val),
    LOWER(v.val),
    COALESCE(cs."label", v.val),
    COALESCE(cs."sortOrder", 0),
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (VALUES
    ('OUTERWEAR'), ('KNITWEAR'), ('TOPS'), ('BOTTOMS'), ('ACCESSORIES'), ('FOOTWEAR')
) AS v(val)
LEFT JOIN _category_settings cs ON cs."category" = v.val;

-- 10. Indexes + relation.
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE INDEX "Category_isActive_sortOrder_idx" ON "Category"("isActive", "sortOrder");
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
