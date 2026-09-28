"use client";

/**
 * ProductDetail — PDP client island. Photography dominates; the buy panel
 * stays quiet. Secondary information lives behind hairline accordions, and
 * a sticky bar keeps Add to Bag within thumb reach on mobile.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCartStore } from "@/stores/cart-store";
import { useWishlistStore } from "@/stores/wishlist-store";
import { trackEvent } from "@/lib/analytics/events";
import { formatPrice } from "@/lib/format";
import { GarmentStage, COLORWAYS } from "@/components/product/GarmentFlat";
import { GarmentMockup } from "@/components/product/GarmentMockup";
import { Customizer } from "@/components/product/Customizer";
import type { CustomSpec } from "@/components/product/Customizer";
import { FABRICS } from "@/lib/fabric";
import type { FabricName } from "@/lib/fabric";
import { BLANK_PHOTOS, HERO_JUMPER_PHOTOS } from "@/lib/garment-photos";
import type { CatalogProduct } from "@/lib/catalog";

/** Jumper/tee products use the hero photo set; other garments fall back to the SVG stage. */
function usesPhotoStage(product: CatalogProduct): boolean {
  return product.garment === "CREWNECK" || product.garment === "HOODIE" || product.garment === "TSHIRT";
}

/** Map a free-text variant colour name ("Charcoal", "Off-White"…) to the
 *  nearest display fabric so photography and swatches stay coherent. */
function fabricForColorName(name: string): FabricName {
  const n = name.toLowerCase();
  if (/charcoal|black|onyx|ink|graphite/.test(n)) return "Onyx";
  if (/white|bone|ecru|ivory|cream|off-?white/.test(n)) return "Bone";
  if (/grey|gray|concrete|stone|ash/.test(n)) return "Concrete";
  if (/rust|ember|terracotta|clay|brown/.test(n)) return "Ember";
  if (/moss|olive|green/.test(n)) return "Moss";
  if (/cobalt|blue|navy/.test(n)) return "Cobalt";
  if (/plum|purple|aubergine/.test(n)) return "Plum";
  if (/sand|tan|beige|camel/.test(n)) return "Sand";
  return "Onyx";
}

function Accordion({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-charcoal/10">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="text-[12px] font-medium uppercase tracking-[0.14em]">{title}</span>
        <svg
          width="11"
          height="11"
          viewBox="0 0 11 11"
          fill="none"
          aria-hidden="true"
          className={`shrink-0 transition-transform duration-300 ease-luxe ${open ? "rotate-45" : ""}`}
        >
          <path d="M5.5 0v11M0 5.5h11" stroke="currentColor" strokeWidth="1" />
        </svg>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-luxe ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="pb-6 text-sm leading-loose text-concrete-dim">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function ProductDetail({ product }: { product: CatalogProduct }) {
  const add = useCartStore((s) => s.add);
  const wishlistToggle = useWishlistStore((s) => s.toggle);
  const wishlisted = useWishlistStore((s) => s.entries.some((e) => e.productId === product.id));

  const variants = product.variants;
  const firstAvailable = useMemo(() => variants.find((v) => v.available > 0) ?? null, [variants]);
  const [selectedId, setSelectedId] = useState<string | null>(firstAvailable?.id ?? variants[0]?.id ?? null);
  const [colorway, setColorway] = useState(product.colorway);
  const [notice, setNotice] = useState<string | null>(null);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [custom, setCustom] = useState<CustomSpec | null>(null);

  const selected = variants.find((v) => v.id === selectedId) ?? null;
  const price = selected?.price ?? product.basePrice;
  const totalAvailable = variants.reduce((sum, v) => sum + v.available, 0);
  const photoStage = usesPhotoStage(product);
  const fabricName = (colorway in FABRICS ? colorway : "Onyx") as FabricName;

  /** Photo for the selected colour: admin-uploaded colour photo wins, then
   *  the editorial campaign set, then the verified blank-garment fallback. */
  const selectedColor = selected?.color ?? colorway;
  const colorPhoto = (c: string): string => {
    const uploaded = product.colorPhotoMap[c];
    if (uploaded) return uploaded;
    const campaign = product.images[0];
    if (campaign) return campaign;
    return HERO_JUMPER_PHOTOS[fabricName as keyof typeof HERO_JUMPER_PHOTOS] ?? BLANK_PHOTOS.whiteTeeFlat;
  };
  const photo = colorPhoto(selectedColor);
  /** Real photography renders untouched — never tinted by the fabric filter. */
  const usingRealPhoto = Boolean(product.colorPhotoMap[selectedColor]) || product.images.length > 0;
  const mockupFabric = usingRealPhoto ? { ...FABRICS[fabricName], filter: "none" } : FABRICS[fabricName];

  // Keep the display fabric in step with the selected variant's colour name
  // ("Charcoal" → Onyx, "Off-White" → Bone…) so swatches and photography agree.
  useEffect(() => {
    if (selected) setColorway(fabricForColorName(selected.color));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    trackEvent("product_viewed", {
      currency: product.currency,
      value: parseFloat(product.basePrice),
      contents: [{ id: selected?.sku ?? product.id, item_price: parseFloat(price), content_name: product.name }],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  function handleAdd() {
    if (!selected) return;
    if (selected.available <= 0) {
      setNotice("This size is sold out — choose another.");
      return;
    }

    const result = add({
      variantId: selected.id,
      productId: product.id,
      slug: product.slug,
      productName: custom ? `${product.name} — custom print` : product.name,
      sku: selected.sku,
      size: selected.size,
      color: colorway,
      image: photo,
      unitPrice: parseFloat(selected.price ?? product.basePrice),
      currency: product.currency,
      quantity: 1,
      maxAvailable: selected.available,
    });

    trackEvent("product_added_to_cart", {
      currency: product.currency,
      value: parseFloat(selected.price ?? product.basePrice),
      contents: [{ id: selected.sku, quantity: 1, item_price: parseFloat(price), content_name: product.name }],
    });

    setNotice(result.reason ?? null);
  }

  function handleWishlist() {
    const saved = wishlistToggle({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: photo,
      price: parseFloat(product.basePrice),
      currency: product.currency,
      addedAt: Date.now(),
    });
    if (saved) {
      trackEvent("wishlist_added", { contents: [{ id: product.id, content_name: product.name }] });
    }
  }

  const allSoldOut = totalAvailable <= 0;
  const distinctColors = useMemo(
    () => Array.from(new Set(variants.map((v) => v.color))),
    [variants]
  );

  return (
    <article className="relative pb-24 lg:pb-0">
      <div className="grid lg:grid-cols-2 lg:gap-16">
        {/* ─── Photography — full bleed on the left, nothing framing it ─── */}
        <section aria-label="Garment preview" className="lg:sticky lg:top-24 lg:self-start">
          <div className="relative aspect-[4/5] bg-bone-deep">
            {photoStage ? (
              <GarmentMockup
                photo={photo}
                fabric={mockupFabric}
                placement={custom?.placement ?? "center"}
                scale={custom?.scale}
                ink={custom?.ink ?? "auto"}
                print={custom !== null}
                alt={product.name}
              />
            ) : (
              <GarmentStage garment={product.garment} colorway={colorway} />
            )}
            <span className="absolute left-5 top-5 font-mono text-[9px] uppercase tracking-wider2 text-concrete-dim">
              {custom ? "Print preview" : product.colorPhotoMap[colorway] ? "Studio photograph" : "Blank garment"}
            </span>
          </div>

          {/* Campaign gallery — admin-uploaded editorial photography */}
          {product.images.length > 0 ? (
            <div className="container-rohde mt-4 grid grid-cols-3 gap-3 lg:px-12">
              {product.images.slice(0, 6).map((src, i) => (
                <div key={src} className="relative aspect-square overflow-hidden bg-bone-deep">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`${product.name} — look ${i + 1}`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : null}

          {/* Fabric — product colour, the one permitted accent */}
          <div className="container-rohde mt-6 lg:px-12">
            <div className="flex items-center gap-4">
              <span className="label-rohde">
                Colour — {selected ? selected.color : FABRICS[fabricName].label}
              </span>
              <div className="flex flex-wrap gap-2.5">
                {distinctColors.map((c) => {
                  const swatchFabric = fabricForColorName(c);
                  const active = selected ? selected.color === c : colorway === swatchFabric;
                  const firstOfColor =
                    variants.find((v) => v.color === c && v.available > 0) ??
                    variants.find((v) => v.color === c);
                  return (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={active}
                      aria-label={`View in ${c}`}
                      disabled={!firstOfColor}
                      onClick={() => {
                        if (!firstOfColor) return;
                        setSelectedId(firstOfColor.id);
                        setNotice(null);
                        setCustom((prev) => (prev ? { ...prev, fabric: swatchFabric } : null));
                      }}
                      title={product.colorPhotoMap[c] ? `${c} — studio photograph` : c}
                      className={`h-7 w-7 rounded-full border transition-all duration-200 disabled:opacity-40 ${
                        active ? "border-charcoal" : "border-charcoal/20 hover:border-brass"
                      }`}
                      style={{ backgroundColor: FABRICS[swatchFabric].hex }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ─── Buy panel — quiet type, hairline rules ─────────────────── */}
        <section aria-label="Product details" className="container-rohde pt-8 lg:px-12 lg:pt-24">
          <p className="label-rohde">{product.dropName ?? "Rohde"}</p>
          <h1 className="heading-rohde mt-3 text-3xl md:text-5xl">{product.name}</h1>
          <p className="mt-4 font-mono text-base text-concrete-dim">{formatPrice(price, product.currency)}</p>

          {selected && selected.available > 0 && selected.available <= 3 ? (
            <p className="mt-3 font-mono text-[10px] uppercase tracking-wider2 text-concrete-dim" role="status">
              Only {selected.available} left in {selected.size}
            </p>
          ) : null}

          {/* Size */}
          <fieldset className="mt-10">
            <legend className="label-rohde">Size</legend>
            <div className="mt-4 flex flex-wrap gap-2">
              {variants.map((variant) => {
                const isSelected = variant.id === selectedId;
                const soldOut = variant.available <= 0;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    aria-pressed={isSelected}
                    disabled={soldOut}
                    onClick={() => {
                      setSelectedId(variant.id);
                      setNotice(null);
                    }}
                    className={`min-w-14 border px-4 py-2.5 font-mono text-xs transition-all duration-200 ${
                      isSelected
                        ? "border-charcoal bg-charcoal text-offwhite"
                        : soldOut
                          ? "border-charcoal/10 text-concrete/50 line-through"
                          : "border-charcoal/25 hover:border-brass"
                    }`}
                  >
                    {variant.size}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Actions */}
          <div className="mt-9 space-y-3">
            <button type="button" onClick={handleAdd} disabled={allSoldOut || !selected} className="btn-charcoal w-full">
              {allSoldOut ? "Sold out" : custom ? "Add custom piece to bag" : "Add to bag"}
            </button>
            {photoStage ? (
              <button type="button" onClick={() => setCustomizerOpen(true)} className="btn-ghost w-full">
                {custom ? "Edit print" : "Customize print"}
              </button>
            ) : null}
            <button type="button" onClick={handleWishlist} className="btn-ghost w-full">
              {wishlisted ? "Saved" : "Save to wishlist"}
            </button>
          </div>
          <div aria-live="polite" className="mt-2 min-h-5 text-right font-mono text-[11px] text-error">
            {notice}
          </div>

          {/* Secondary information — behind hairline accordions */}
          <div className="mt-12 border-t border-charcoal/10">
            <Accordion title="Description" defaultOpen>
              {product.description}
              {product.story ? <span className="mt-4 block italic">{product.story}</span> : null}
            </Accordion>
            <Accordion title="Materials">
              {product.materials.length > 0 ? (
                <ul className="space-y-2">
                  {product.materials.map((m) => (
                    <li key={m}>— {m}</li>
                  ))}
                </ul>
              ) : (
                <p>Heavyweight blank, printed in-studio.</p>
              )}
            </Accordion>
            <Accordion title="Shipping &amp; returns">
              <p>
                Printed to order in Kigali and shipped worldwide in plain packaging. 30-day returns on
                unworn pieces; custom prints are one-of-one and final sale.
              </p>
            </Accordion>
          </div>

          <p className="mt-8 text-xs leading-relaxed text-concrete-dim">
            Custom prints are applied in-studio in Kigali before dispatch — each piece stays one-of-one.{" "}
            <Link href="/products" className="underline underline-offset-4 transition-colors duration-300 hover:text-brass">
              Back to the collection
            </Link>
          </p>
        </section>
      </div>

      {/* Sticky mobile add-to-bag — appears once the main controls scroll away */}
      <div
        aria-hidden={customizerOpen}
        className={`fixed inset-x-0 bottom-0 z-30 border-t border-charcoal/10 bg-bone transition-transform duration-500 ease-luxe lg:hidden ${
          customizerOpen ? "translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="flex items-center gap-4 px-5 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{product.name}</p>
            <p className="font-mono text-xs text-concrete-dim">{formatPrice(price, product.currency)}</p>
          </div>
          <button type="button" onClick={handleAdd} disabled={allSoldOut || !selected} className="btn-charcoal shrink-0 px-8">
            {allSoldOut ? "Sold out" : "Add to bag"}
          </button>
        </div>
        <div aria-live="polite" className="px-5 pb-2 text-right font-mono text-[10px] text-error">
          {notice}
        </div>
      </div>

      {/* Print studio window */}
      <Customizer
        open={customizerOpen ? "customize" : "closed"}
        onClose={() => setCustomizerOpen(false)}
        photo={photo}
        initialFabric={fabricName}
        onApply={(spec) => {
          setCustom(spec);
          setCustomizerOpen(false);
          setNotice(null);
        }}
      />
    </article>
  );
}
