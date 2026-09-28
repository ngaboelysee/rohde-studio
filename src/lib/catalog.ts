/**
 * Catalog service — single entrypoint for catalog reads.
 * Each product maps to a garment silhouette + a colorway for the 3D
 * showroom stage. Logo-free: garments are presented as clean pieces.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import { BLANK_PHOTOS } from "@/lib/garment-photos";

/**
 * Admin-defined display labels per category (falls back to the raw enum
 * value when no override exists). Loaded once per server instance — the
 * admin edits these rarely, so a momentary cache is safe and fast.
 */
/**
 * Admin-managed categories (real table — the dashboard can add, rename,
 * order and hide them). Cached briefly per server instance; the admin
 * edits these rarely, so a momentary cache is safe and fast.
 */
export type CategoryInfo = {
  id: string;
  slug: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
};

let categoryCache: CategoryInfo[] | null = null;
let categoryCacheAt = 0;

export async function categoryList(): Promise<CategoryInfo[]> {
  if (categoryCache && Date.now() - categoryCacheAt < 60_000) return categoryCache;
  try {
    const rows = await prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    categoryCache = rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      label: r.label,
      sortOrder: r.sortOrder,
      isActive: r.isActive,
    }));
    categoryCacheAt = Date.now();
  } catch {
    categoryCache = categoryCache ?? [];
  }
  return categoryCache;
}

/** Active categories as a slug → { label, sortOrder } map (storefront). */
export async function categorySettings(): Promise<Record<string, { label: string; sortOrder: number }>> {
  const list = await categoryList();
  return Object.fromEntries(
    list.filter((c) => c.isActive).map((c) => [c.slug, { label: c.label, sortOrder: c.sortOrder }])
  );
}

export async function categoryLabels(): Promise<Record<string, string>> {
  const settings = await categorySettings();
  return Object.fromEntries(Object.entries(settings).map(([k, v]) => [k, v.label]));
}

export async function categoryLabel(value: string): Promise<string> {
  return (await categoryLabels())[value] ?? value;
}

export type GarmentKind =
  | "TSHIRT"
  | "HOODIE"
  | "JACKET"
  | "PARKA"
  | "CAP"
  | "TROUSER"
  | "CREWNECK"
  | "SNEAKER";

export type CatalogVariant = {
  id: string;
  sku: string;
  size: string;
  color: string;
  price: string | null;
  available: number;
  /** Admin-uploaded photo for this specific colour (null = editorial fallback). */
  photo: string | null;
};

export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  story: string | null;
  category: string;
  basePrice: string;
  currency: string;
  dropName: string | null;
  isFeatured: boolean;
  materials: string[];
  /** Admin-defined display label for the category. */
  categoryLabel: string;
  /** Visual mapping for the 3D showroom stage. */
  garment: GarmentKind;
  colorway: string;
  /** Editorial clothing photo (verified-live URL) for cards/grids. */
  image: string;
  /** Admin-uploaded campaign/gallery photos in order (may be empty). */
  images: string[];
  /** Colour name → admin-uploaded photo for that colour. */
  colorPhotoMap: Record<string, string>;
  variants: CatalogVariant[];
};

/** Verified-live blank garment photography — jumpers and tees, no printing. */
const IMAGE_POOL: string[] = Object.values(BLANK_PHOTOS);

function imageFor(id: string): string {
  const seed = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return IMAGE_POOL[seed % IMAGE_POOL.length] ?? IMAGE_POOL[0]!;
}

const GARMENT_BY_CATEGORY: Record<string, GarmentKind> = {
  outerwear: "JACKET",
  knitwear: "CREWNECK",
  tops: "TSHIRT",
  bottoms: "TROUSER",
  footwear: "SNEAKER",
  accessories: "CAP",
};

const DEFAULT_GARMENT: GarmentKind = "TSHIRT";

function garmentFor(categorySlug: string): GarmentKind {
  return GARMENT_BY_CATEGORY[categorySlug.toLowerCase()] ?? DEFAULT_GARMENT;
}

/** Distinct colorway per product id so the grid shows a spread of shades. */
const COLORWAY_POOL = ["Onyx", "Bone", "Concrete", "Ember", "Moss", "Cobalt", "Plum", "Sand"];

function colorwayFor(id: string, fallbackColor?: string): string {
  if (fallbackColor && COLORWAY_POOL.includes(fallbackColor)) return fallbackColor;
  const seed = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return COLORWAY_POOL[seed % COLORWAY_POOL.length] ?? "Onyx";
}

/**
 * Preview fallback — mirrors prisma/seed.ts so the storefront is browsable
 * before PostgreSQL is connected. Never used when the DB is reachable.
 */
const DEMO_PRODUCTS: Array<
  Pick<
    CatalogProduct,
    "id" | "slug" | "name" | "description" | "story" | "category" | "basePrice" | "currency" | "dropName" | "isFeatured" | "materials"
  > & { photoKey?: keyof typeof BLANK_PHOTOS }
> = [
  {
    id: "demo_orbit-heavy-jumper", slug: "orbit-heavy-jumper", name: "Orbit Heavy Jumper",
    description: "Flagship heavyweight jumper in 450gsm loopback cotton. Boxy body, ribbed collar, cuffs and hem.",
    story: "ORBIT 001 opens with the flagship jumper — cut boxy, printed to order in-studio.",
    category: "knitwear", basePrice: "260", currency: "USD", dropName: "ORBIT 001", isFeatured: true,
    materials: ["450gsm loopback cotton", "Ribbed trims", "Boxy oversized cut"],
    photoKey: "sweatshirt",
  },
  {
    id: "demo_gravity-knit-crewneck", slug: "gravity-knit-crewneck", name: "Gravity Knit Crewneck",
    description: "Heavyweight merino crew with tonal detailing. Boxy shoulders, dropped hem.",
    story: "Weight you can feel, restraint you can see.",
    category: "knitwear", basePrice: "260", currency: "USD", dropName: "ORBIT 001", isFeatured: true,
    materials: ["Extra-fine merino wool", "Ribbed cuffs", "Tonal embroidery"],
  },
  {
    id: "demo_concrete-oversized-tee", slug: "concrete-oversized-tee", name: "Concrete Oversized Tee",
    description: "Boxy 240gsm jersey tee with dropped shoulders. Blank canvas for the print studio.",
    story: "Brutalist drape — the tee as architecture.",
    category: "tops", basePrice: "110", currency: "USD", dropName: "ORBIT 001", isFeatured: true,
    materials: ["240gsm cotton jersey", "Dropped shoulders", "Ribbed collar"],
    photoKey: "greyTee",
  },
  {
    id: "demo_satellite-graphic-tee", slug: "satellite-graphic-tee", name: "Satellite Graphic Tee",
    description: "Classic-cut 220gsm tee — the everyday layer for the full back print.",
    story: "Every print lands where the eye already travels.",
    category: "tops", basePrice: "90", currency: "USD", dropName: "ORBIT 001", isFeatured: false,
    materials: ["220gsm cotton jersey", "Classic cut", "Print-ready"],
    photoKey: "modelTee",
  },
  {
    id: "demo_eclipse-hoodie", slug: "eclipse-hoodie", name: "Eclipse Heavy Hoodie",
    description: "Heavyweight fleece hoodie, double-lined hood, kangaroo pocket.",
    story: "Made for the hours when the city is quiet.",
    category: "knitwear", basePrice: "310", currency: "USD", dropName: "ORBIT 001", isFeatured: false,
    materials: ["480gsm brushed fleece", "Double-lined hood", "Kangaroo pocket"],
    photoKey: "darkHoodie",
  },
  {
    id: "demo_fog-oversized-hoodie", slug: "fog-oversized-hoodie", name: "Fog Oversized Hoodie",
    description: "Heavyweight fleece hoodie, double-lined hood, kangaroo pocket.",
    story: "Made for the hours when the city is quiet.",
    category: "knitwear", basePrice: "310", currency: "USD", dropName: "ORBIT 001", isFeatured: true,
    materials: ["480gsm brushed fleece", "Double-lined hood"],
  },
  {
    id: "demo_monolith-white-tee", slug: "monolith-white-tee", name: "Monolith White Tee",
    description: "The studio blank — heavyweight 260gsm tee in raw white. Print-ready.",
    story: "Architecture for the torso.",
    category: "tops", basePrice: "95", currency: "USD", dropName: "ORBIT 001", isFeatured: true,
    materials: ["260gsm cotton jersey", "Tubular body", "Tonal neck tape"],
    photoKey: "whiteTeeFlat",
  },
  {
    id: "demo_studio-black-tee", slug: "studio-black-tee", name: "Studio Black Tee",
    description: "240gsm tee in deep onyx. Crew collar, straight hem, print-ready front and back.",
    story: "The quiet finale of every fit.",
    category: "tops", basePrice: "105", currency: "USD", dropName: "ORBIT 001", isFeatured: false,
    materials: ["240gsm cotton jersey", "Crew collar", "Straight hem"],
    photoKey: "blackTee",
  },
  {
    id: "demo_signal-crewneck", slug: "signal-crewneck", name: "Signal Crewneck",
    description: "Midweight crewneck sweatshirt with set-in sleeves. A quiet carrier for the mark.",
    story: "Between jumper and jersey.",
    category: "knitwear", basePrice: "195", currency: "USD", dropName: "ORBIT 001", isFeatured: false,
    materials: ["320gsm loopback cotton", "Set-in sleeves", "Ribbed trims"],
    photoKey: "hangingTees",
  },
];

const DEMO_SIZES = ["S", "M", "L"];

function demoProduct(p: (typeof DEMO_PRODUCTS)[number]): CatalogProduct {
  const colorway = colorwayFor(p.id);
  return {
    ...p,
    categoryLabel: p.category.charAt(0).toUpperCase() + p.category.slice(1),
    garment: garmentFor(p.category),
    colorway,
    image: p.photoKey ? BLANK_PHOTOS[p.photoKey] : imageFor(p.id),
    images: [],
    colorPhotoMap: {},
    variants: DEMO_SIZES.map((size, i) => ({
      id: `${p.id}_v${i}`,
      sku: `${p.id.slice(5).toUpperCase().slice(0, 12)}-${size}`,
      size,
      color: colorway,
      price: null,
      // Deterministic stock so sold-out / low-stock states are visible too.
      available: (p.id.length * 7 + i * 3) % 9,
      photo: null,
    })),
  };
}

export async function listProducts(options: {
  category?: string;
  featuredOnly?: boolean;
  search?: string;
  take?: number;
}): Promise<{ products: CatalogProduct[]; demo: boolean }> {
  const { category, featuredOnly, search, take } = options;

  try {
    let categoryId: string | undefined;
    if (category) {
      const cats = await categoryList();
      categoryId = cats.find((c) => c.slug === category)?.id;
      if (!categoryId) return { products: [], demo: false }; // unknown category slug
    }
    const products = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        ...(categoryId ? { categoryId } : {}),
        ...(featuredOnly ? { isFeatured: true } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { description: { contains: search, mode: "insensitive" as const } },
                { dropName: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      include: {
        category: true,
        variants: { where: { active: true }, orderBy: { size: "asc" }, include: { inventory: true } },
      },
      orderBy: { createdAt: "asc" },
      ...(take ? { take } : {}),
    });

    const cats = await categoryList();
    const labelBySlug = new Map(cats.map((c) => [c.slug, c.label] as const));

    return {
      demo: false,
      products: products.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        description: p.description,
        story: p.story,
        category: p.category.slug,
        categoryLabel: labelBySlug.get(p.category.slug) ?? p.category.label,
        basePrice: p.basePrice.toString(),
        currency: p.currency,
        dropName: p.dropName,
        isFeatured: p.isFeatured,
        materials: p.materials,
        garment: garmentFor(p.category.slug),
        colorway: colorwayFor(p.id, p.variants[0]?.color),
        image: p.images[0] ?? imageFor(p.id),
        images: p.images,
        colorPhotoMap: Object.fromEntries(
          p.variants
            .filter((v): v is typeof v & { image: string } => Boolean(v.image))
            .map((v) => [v.color, v.image])
        ),
        variants: p.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          size: v.size,
          color: v.color,
          price: v.price ? v.price.toString() : null,
          available: v.inventory ? Math.max(0, v.inventory.onHand - v.inventory.reserved) : 0,
          photo: v.image ?? null,
        })),
      })),
    };
  } catch (error) {
    console.error("[catalog] database unavailable — serving preview catalog", error);
    let demo = DEMO_PRODUCTS.map(demoProduct);
    if (category) demo = demo.filter((p) => p.category === category);
    if (featuredOnly) demo = demo.filter((p) => p.isFeatured);
    if (search) {
      const q = search.toLowerCase();
      demo = demo.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }
    if (take) demo = demo.slice(0, take);
    return { products: demo, demo: true };
  }
}

export async function getProductBySlug(slug: string): Promise<CatalogProduct | null> {
  try {
    const p = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        variants: { where: { active: true }, orderBy: { size: "asc" }, include: { inventory: true } },
      },
    });
    if (!p || p.status === "DRAFT") return null;
    const label = p.category.label;

    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      story: p.story,
      category: p.category.slug,
      categoryLabel: label,
      basePrice: p.basePrice.toString(),
      currency: p.currency,
      dropName: p.dropName,
      isFeatured: p.isFeatured,
      materials: p.materials,
      garment: garmentFor(p.category.slug),
      colorway: colorwayFor(p.id, p.variants[0]?.color),
      image: p.images[0] ?? imageFor(p.id),
      images: p.images,
      colorPhotoMap: Object.fromEntries(
        p.variants
          .filter((v): v is typeof v & { image: string } => Boolean(v.image))
          .map((v) => [v.color, v.image])
      ),
      variants: p.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        size: v.size,
        color: v.color,
        price: v.price ? v.price.toString() : null,
        available: v.inventory ? Math.max(0, v.inventory.onHand - v.inventory.reserved) : 0,
        photo: v.image ?? null,
      })),
    };
  } catch (error) {
    console.error("[catalog] database unavailable — serving preview product", error);
    const demo = DEMO_PRODUCTS.find((p) => p.slug === slug);
    return demo ? demoProduct(demo) : null;
  }
}
