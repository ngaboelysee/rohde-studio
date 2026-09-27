/**
 * Verified blank-garment photography (every URL curl-checked 200 before
 * landing here). Plain garments only — no printing, so the atelier mark is
 * always applied by the storefront, never baked into the photo.
 */

const U = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

export const BLANK_PHOTOS = {
  whiteTeeHanger: U("photo-1618354691373-d851c5c3a990"),
  teesStack: U("photo-1620799140408-edc6dcb6d633"),
  hangingTees: U("photo-1583743814966-8936f5b7be1a"),
  whiteTeeFlat: U("photo-1562157873-818bc0726f68"),
  greyTee: U("photo-1503341504253-dff4815485f1"),
  darkHoodie: U("photo-1622445275576-721325763afe"),
  sweatshirt: U("photo-1594633312681-425c7b97ccd1"),
  blackTee: U("photo-1622560480605-d83c853bc5c3"),
  modelTee: U("photo-1515886657613-9f3515b0c78f"),
  teeOnHanger: U("photo-1521572163474-6864f9cf17ab"),
} as const;

/** Hero jumper photo per hero fabric (Raw White / Onyx Black / Concrete Grey). */
export const HERO_JUMPER_PHOTOS: Record<"Bone" | "Onyx" | "Concrete", string> = {
  Bone: BLANK_PHOTOS.sweatshirt,
  Onyx: BLANK_PHOTOS.darkHoodie,
  Concrete: BLANK_PHOTOS.hangingTees,
};
