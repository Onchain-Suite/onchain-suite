/**
 * Regenerate the email Social block icon set.
 *
 * The committed PNGs in `public/email-assets/social/` are the source of truth at
 * runtime (email clients block inline SVG / data-URI icons, so social marks must
 * be hosted raster images referenced by absolute URL). This script only needs to
 * run when the icon set changes.
 *
 * Brand marks come from `simple-icons` (CC0); it is intentionally NOT a project
 * dependency - install it ad hoc to regenerate, then drop it again:
 *
 *   bun add -d simple-icons && node scripts/gen-social-icons.mjs \
 *     && git checkout -- package.json bun.lock
 *
 * `website` and `email` are generic glyphs (not brand marks). LinkedIn/Mirror are
 * omitted: simple-icons does not ship them (trademark), so we don't fabricate.
 * Each platform is emitted twice: `<platform>.png` (dark, for light backgrounds)
 * and `<platform>-light.png` (white, for dark footers).
 */
import sharp from "sharp";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const SI = resolve(HERE, "../node_modules/simple-icons/icons");
const OUT = resolve(HERE, "../public/email-assets/social");
if (!existsSync(SI)) {
  console.error("simple-icons not installed. Run: bun add -d simple-icons");
  process.exit(1);
}
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const brand = {
  x: "x",
  farcaster: "farcaster",
  discord: "discord",
  telegram: "telegram",
  instagram: "instagram",
  youtube: "youtube",
  github: "github",
  tiktok: "tiktok",
  reddit: "reddit",
  medium: "medium",
  lens: "lens",
};
const custom = {
  website: `<svg viewBox="0 0 24 24"><path d="M12 21a9 9 0 100-18 9 9 0 000 18zm0 0c2.5 0 4-4 4-9s-1.5-9-4-9-4 4-4 9 1.5 9 4 9zM3 12h18" fill="none" stroke="COLOR" stroke-width="1.6"/></svg>`,
  email: `<svg viewBox="0 0 24 24"><path d="M3 6.5h18v11H3v-11zm0 .5l9 6 9-6" fill="none" stroke="COLOR" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
};
const variants = { dark: "#1F2937", light: "#FFFFFF" };
const SIZE = 48;
const PAD = 3;

function svgFor(platform, color) {
  if (custom[platform]) return custom[platform].replaceAll("COLOR", color);
  return readFileSync(`${SI}/${brand[platform]}.svg`, "utf8")
    .replace(/<title>.*?<\/title>/s, "")
    .replace(/<svg /, `<svg fill="${color}" `);
}

const made = [];
for (const platform of [...Object.keys(brand), ...Object.keys(custom)]) {
  for (const [vname, color] of Object.entries(variants)) {
    const inner = SIZE - PAD * 2;
    const png = await sharp(Buffer.from(svgFor(platform, color)))
      .resize(inner, inner, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .extend({
        top: PAD,
        bottom: PAD,
        left: PAD,
        right: PAD,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
    const name = vname === "light" ? `${platform}-light.png` : `${platform}.png`;
    writeFileSync(`${OUT}/${name}`, png);
    made.push(name);
  }
}
console.log(`Wrote ${made.length} icons to ${OUT}`);
