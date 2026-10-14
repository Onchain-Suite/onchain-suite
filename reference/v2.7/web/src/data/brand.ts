/* The accent swatches an operator can pick for their own branding.
 *
 * One array, three pickers. They had drifted: Settings and the push composer offered the same
 * four in a different order, and the form builder offered Tailwind's blue-600 (#2563EB) in
 * place of the brand blue — so the colour you could choose depended on which screen you
 * happened to open, and one of the choices was not a house colour at all.
 */
export const ACCENT_SWATCHES = [
  '#FF6828', // brand Orange — orange-500
  '#1727E0', // brand Blue — blue-600
  '#010F31', // brand Oxford Blue — navy-950
  '#17A66B', // green-500
] as const;
