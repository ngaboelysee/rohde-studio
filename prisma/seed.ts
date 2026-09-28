/**
 * Rohde — database seed.
 * Creates the launch collection ("ORBIT 001") with variants, inventory,
 * and the initial admin registry row (identity itself lives in Supabase Auth).
 *
 * Run: npm run db:seed
 */
import { PrismaClient, ProductStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type SeedVariant = {
  sku: string;
  size: string;
  color: string;
  onHand: number;
};

type SeedProduct = {
  slug: string;
  name: string;
  description: string;
  story: string;
  category: string; // category slug (admin-managed Category table)
  basePrice: number;
  dropName: string;
  isFeatured: boolean;
  materials: string[];
  images: string[];
  variants: SeedVariant[];
};

// Unsplash images are used as editorial stand-ins during development; replace
// with Rohde campaign assets in Supabase Storage via the admin panel.
const img = (seed: string) =>
  `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=1600&q=80`;

const PRODUCTS: SeedProduct[] = [
  {
    slug: "orbit-puffer-jacket",
    name: "Orbit Puffer Jacket",
    description:
      "A sculptural down puffer with matte technical shell and orbital-quilted channels. Built for the cold season, cut for the city.",
    story:
      "ORBIT 001 studies gravity. The jacket's quilted channels trace satellite paths around the body — engineered volume, zero noise.",
    category: "OUTERWEAR",
    basePrice: 640,
    dropName: "ORBIT 001",
    isFeatured: true,
    materials: ["Recycled nylon shell", "RDS-certified down", "YKK AquaGuard zips"],
    images: [img("1556905055-8f358a7a47b2"), img("1551028719-00167b16eac5"), img("1591047139829-d91aecb6caea")],
    variants: [
      { sku: "RHD-ORB-PUF-SC-01", size: "S", color: "Charcoal", onHand: 8 },
      { sku: "RHD-ORB-PUF-MC-01", size: "M", color: "Charcoal", onHand: 12 },
      { sku: "RHD-ORB-PUF-LC-01", size: "L", color: "Charcoal", onHand: 6 },
      { sku: "RHD-ORB-PUF-XLC01", size: "XL", color: "Charcoal", onHand: 0 },
    ],
  },
  {
    slug: "gravity-knit-crewneck",
    name: "Gravity Knit Crewneck",
    description:
      "Heavyweight merino crew with tonal orbital embroidery at the chest. Boxy shoulders, dropped hem, silent luxury.",
    story:
      "Weight you can feel, restraint you can see. The Gravity crew is the quiet center of the drop.",
    category: "KNITWEAR",
    basePrice: 260,
    dropName: "ORBIT 001",
    isFeatured: true,
    materials: ["Extra-fine merino wool", "Ribbed cuffs", "Tonal embroidery"],
    images: [img("1529139574466-a303027c1d8b"), img("1564859228273-274232fdb516")],
    variants: [
      { sku: "RHD-GRV-KNT-SC-01", size: "S", color: "Charcoal", onHand: 10 },
      { sku: "RHD-GRV-KNT-MC-01", size: "M", color: "Charcoal", onHand: 14 },
      { sku: "RHD-GRV-KNT-LC-01", size: "L", color: "Charcoal", onHand: 9 },
      { sku: "RHD-GRV-KNT-SW-02", size: "S", color: "Off-White", onHand: 5 },
      { sku: "RHD-GRV-KNT-MW-02", size: "M", color: "Off-White", onHand: 7 },
    ],
  },
  {
    slug: "concrete-field-parka",
    name: "Concrete Field Parka",
    description:
      "Long-line parka in washed technical cotton. Raw concrete tone, sealed seams, hidden placket. Utility without the costume.",
    story:
      "Inspired by brutalist façades after rain — the Concrete parka wears weather as texture.",
    category: "OUTERWEAR",
    basePrice: 780,
    dropName: "ORBIT 001",
    isFeatured: true,
    materials: ["Washed cotton twill", "Sealed seams", "Matte hardware"],
    images: [img("1591195853828-11db59a44f6b"), img("1592878904946-b3cd8ae243d0")],
    variants: [
      { sku: "RHD-CNC-PRK-MC-01", size: "M", color: "Concrete", onHand: 5 },
      { sku: "RHD-CNC-PRK-LC-01", size: "L", color: "Concrete", onHand: 4 },
    ],
  },
  {
    slug: "satellite-cargo-trouser",
    name: "Satellite Cargo Trouser",
    description:
      "Wide-leg cargo with articulated knees and magnetic pocket closures. Charcoal dyed garment wash.",
    story: "Movement study. Every pocket is placed where the hand already travels.",
    category: "BOTTOMS",
    basePrice: 320,
    dropName: "ORBIT 001",
    isFeatured: false,
    materials: ["Garment-dyed cotton ripstop", "Magnetic closures", "Articulated knee"],
    images: [img("1485231183945-fffde7cc051e"), img("1598033129183-c4f50c736f10")],
    variants: [
      { sku: "RHD-SAT-CGO-30C01", size: "30", color: "Charcoal", onHand: 7 },
      { sku: "RHD-SAT-CGO-32C01", size: "32", color: "Charcoal", onHand: 11 },
      { sku: "RHD-SAT-CGO-34C01", size: "34", color: "Charcoal", onHand: 8 },
      { sku: "RHD-SAT-CGO-36C01", size: "36", color: "Charcoal", onHand: 2 },
    ],
  },
  {
    slug: "eclipse-long-sleeve",
    name: "Eclipse Long Sleeve",
    description:
      "Cotton-jersey long sleeve with reflective eclipse print across the back. Boxy fit, tonal stitching.",
    story: "The eclipse print reacts to flash photography — visible only when the city decides to look.",
    category: "TOPS",
    basePrice: 140,
    dropName: "ORBIT 001",
    isFeatured: false,
    materials: ["260gsm cotton jersey", "Reflective ink", "Ribbed collar"],
    images: [img("1521572163474-6864f9cf17ab"), img("1503341504253-dff4815485f1")],
    variants: [
      { sku: "RHD-ECL-LSL-SC-01", size: "S", color: "Charcoal", onHand: 16 },
      { sku: "RHD-ECL-LSL-MC-01", size: "M", color: "Charcoal", onHand: 20 },
      { sku: "RHD-ECL-LSL-LC-01", size: "L", color: "Charcoal", onHand: 15 },
    ],
  },
  {
    slug: "rohde-orbit-cap",
    name: "Rohde Orbit Cap",
    description:
      "Six-panel cap with embossed orbital logotype and matte metal adjuster.",
    story: "The orbit, miniaturized.",
    category: "ACCESSORIES",
    basePrice: 90,
    dropName: "ORBIT 001",
    isFeatured: false,
    materials: ["Brushed cotton twill", "Embossed leather patch", "Matte metal adjuster"],
    images: [img("1588850561407-ed78c282e89b"), img("1517948430535-1e2469d314fe")],
    variants: [
      { sku: "RHD-ORB-CAP-OS-C1", size: "OS", color: "Charcoal", onHand: 25 },
      { sku: "RHD-ORB-CAP-OS-W1", size: "OS", color: "Off-White", onHand: 18 },
    ],
  },
  {
    slug: "monolith-high-top",
    name: "Monolith High-Top",
    description:
      "Minimal high-top in full-grain leather. Blake-stitched, gum outsole, debossed heel stamp.",
    story: "Architecture for the foot. A single unbroken volume from toe to collar.",
    category: "FOOTWEAR",
    basePrice: 420,
    dropName: "ORBIT 001",
    isFeatured: true,
    materials: ["Full-grain leather", "Blake stitch", "Gum outsole"],
    images: [img("1549298916-b41d501d3772"), img("1560769629-975ec94e6a86")],
    variants: [
      { sku: "RHD-MNL-HTP-41C1", size: "41", color: "Charcoal", onHand: 6 },
      { sku: "RHD-MNL-HTP-42C1", size: "42", color: "Charcoal", onHand: 8 },
      { sku: "RHD-MNL-HTP-43C1", size: "43", color: "Charcoal", onHand: 8 },
      { sku: "RHD-MNL-HTP-44C1", size: "44", color: "Charcoal", onHand: 3 },
    ],
  },
  {
    slug: "signal-overshirt",
    name: "Signal Overshirt",
    description:
      "Boxy overshirt in double-faced wool blend with concealed placket and strap-detail cuffs.",
    story: "Between shirt and jacket — the Signal layer carries the drop's signature strap hardware.",
    category: "OUTERWEAR",
    basePrice: 380,
    dropName: "ORBIT 001",
    isFeatured: false,
    materials: ["Double-faced wool blend", "Concealed placket", "Strap cuffs"],
    images: [img("1596755094514-f87e34085b2c"), img("1593030761757-71fae45fa0e7")],
    variants: [
      { sku: "RHD-SIG-OVR-SC-01", size: "S", color: "Concrete", onHand: 4 },
      { sku: "RHD-SIG-OVR-MC-01", size: "M", color: "Concrete", onHand: 0 }, // sold out variant
      { sku: "RHD-SIG-OVR-LC-01", size: "L", color: "Concrete", onHand: 3 },
    ],
  },
];

async function main() {
  console.log("⭒ Seeding Rohde flagship database…");

  // Catalog — ensure the six base categories exist (seeded by migration,
  // but upserted here too so a fresh empty DB works).
  const BASE_CATEGORIES = ["outerwear", "knitwear", "tops", "bottoms", "accessories", "footwear"];
  for (const slug of BASE_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { slug, label: slug.charAt(0).toUpperCase() + slug.slice(1) },
    });
  }

  for (const p of PRODUCTS) {
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        slug: p.slug,
        name: p.name,
        description: p.description,
        story: p.story,
        categoryId: (
          await prisma.category.upsert({
            where: { slug: p.category },
            update: {},
            create: { slug: p.category, label: p.category.charAt(0).toUpperCase() + p.category.slice(1) },
          })
        ).id,
        status: ProductStatus.ACTIVE,
        basePrice: p.basePrice,
        currency: "USD",
        dropName: p.dropName,
        isFeatured: p.isFeatured,
        materials: p.materials,
        images: p.images,
      },
    });

    for (const v of p.variants) {
      const variant = await prisma.variant.upsert({
        where: { sku: v.sku },
        update: {},
        create: {
          productId: product.id,
          sku: v.sku,
          size: v.size,
          color: v.color,
        },
      });
      await prisma.inventory.upsert({
        where: { variantId: variant.id },
        update: {},
        create: { variantId: variant.id, onHand: v.onHand, reserved: 0 },
      });
    }
  }

  // Demo customer (credentials sign-in). Password: rohde-demo
  const passwordHash = await bcrypt.hash("rohde-demo", 12);
  await prisma.user.upsert({
    where: { email: "demo@rohde.store" },
    update: {},
    create: {
      email: "demo@rohde.store",
      name: "Demo Customer",
      passwordHash,
      emailVerified: new Date(),
    },
  });

  // Admin registry row — create the matching Supabase Auth user separately, then
  // record its UUID here. Seed one placeholder staff row for local development.
  const existingAdmin = await prisma.adminUser.findFirst();
  if (!existingAdmin) {
    await prisma.adminUser.create({
      data: {
        supabaseUserId: "00000000-0000-0000-0000-000000000000",
        email: "admin@rohde.store",
        name: "Rohde Owner",
        role: "OWNER",
      },
    });
  }

  console.log(`✓ Seeded ${PRODUCTS.length} products with variants + inventory.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
