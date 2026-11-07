/**
 * How many billable SMS segments a message takes. Carriers bill per segment, and
 * the size of a segment depends on the encoding the text forces:
 *
 * - GSM-7 (plain Latin text): 160 characters in a single message, but only 153
 *   per part once it is split, because each part spends 7 on a reassembly header.
 *   A few characters (`^ { } [ ] ~ | \ €` and form feed) are escape sequences
 *   that cost two.
 * - UCS-2 (anything else - emoji, most accents outside GSM, non-Latin scripts):
 *   70 in a single message, 67 per part. One emoji or curly quote switches the
 *   whole message to UCS-2, which is the usual surprise.
 *
 * UCS-2 is counted in UTF-16 code units, which is also how JavaScript measures
 * `length`, so an emoji (a surrogate pair) correctly costs two. This is an
 * estimate: a carrier never splits an escape sequence across parts, which can
 * occasionally push a borderline GSM-7 message into one more segment.
 */

const GSM_BASIC = new Set(
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà"
);
const GSM_EXTENDED = new Set("^{}\\[~]|€\f");

export type SmsEncoding = "GSM-7" | "UCS-2";

export interface SmsSegmentCount {
  encoding: SmsEncoding;
  /** Billable units: septets for GSM-7, UTF-16 code units for UCS-2. */
  units: number;
  segments: number;
}

export function countSmsSegments(text: string): SmsSegmentCount {
  let septets = 0;
  let gsm = true;
  for (const ch of text) {
    if (GSM_BASIC.has(ch)) septets += 1;
    else if (GSM_EXTENDED.has(ch)) septets += 2;
    else {
      gsm = false;
      break;
    }
  }

  const encoding: SmsEncoding = gsm ? "GSM-7" : "UCS-2";
  const units = gsm ? septets : text.length;
  const single = gsm ? 160 : 70;
  const perPart = gsm ? 153 : 67;
  const segments =
    units === 0 ? 0 : units <= single ? 1 : Math.ceil(units / perPart);
  return { encoding, units, segments };
}
