// The series palette, validated rather than chosen by eye.
//
// Each set was run through the dataviz validator (six checks: lightness band, chroma floor, CVD
// separation, normal-vision floor, contrast against the surface) and reported ALL CHECKS PASS.
// The Datum chart ramp's own first three slots do not pass in either mode - chart-2 is
// sapphire-300, which sits outside the lightness band and cannot be separated from chart-3's cyan
// (normal-vision deltaE 12.2, below the floor of 15). These are the nearest passing steps from the
// same ramps, so the identity is still Datum's.
//
// Dark is stepped on its own rather than flipped: the dark band is L 0.48-0.67, which is LOWER
// than light's 0.43-0.77, so the dark steps are deeper, not lighter.
//
// Extended to five on 26 Sep 2026, when Launch+ and Growth+ were added. Re-validated at five
// rather than assumed to still hold; the two new hues are purple and cyan from the same ramps.
//
//   light  #4A6CF7 #F59E0B #1FA463 #7C5CE0 #0EA5E9  worst adjacent deltaE 8.6 protan, 19.1 normal
//   dark   #5C7AF8 #C2870A #25A96B #7C5CE0 #0E96D0  worst adjacent deltaE 8.3 protan, 16.9 normal
//
// Amber carries a sub-3:1 contrast warning on the light surface. That obligates relief, which is
// why every chart here is directly labelled and sits on the same page as the table of its own
// figures - identity is never colour alone.
export const SERIES = {
  launch:     { light: '#4A6CF7', dark: '#5C7AF8' },
  launchPlus: { light: '#F59E0B', dark: '#C2870A' },
  growth:     { light: '#1FA463', dark: '#25A96B' },
  growthPlus: { light: '#7C5CE0', dark: '#7C5CE0' },
  pro:        { light: '#0EA5E9', dark: '#0E96D0' },
} as const;

/** One series, for charts that plot a single measure. Takes the first slot, never a cycled hue. */
export const SINGLE = SERIES.launch;

/** The market price-curve chart: five entities on the same five validated steps. Colour follows
 *  the entity within this chart; the steps are reused, not re-chosen, so the validation holds. */
export const MARKET_SERIES = {
  ours:      SERIES.launch,
  median:    SERIES.launchPlus,
  octopus:   SERIES.growth,
  brevo:     SERIES.growthPlus,
  mailchimp: SERIES.pro,
} as const;
