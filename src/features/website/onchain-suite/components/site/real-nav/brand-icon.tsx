/**
 * OnchainSuite logo mark - the `ocs-mark` glyph from the site source
 * (OnchainSuiteSite.jsx), rendered with that file's #mg gradient
 * (#1727E0 -> #4F8BFF, diagonal). This is the brand mark used in the navbar on
 * its own (no wordmark). Pass a unique gradientId per instance. The glyph fills
 * its viewBox edge-to-edge, so `size` is the rendered height.
 */
const MARK =
  "M1047.3 2518.32c483.09,-45.16 860.34,-436.64 860.34,-912.94 0,-478.08 -380.11,-870.73 -866.11,-913.4 -49.69,-7.76 -87.72,-50.73 -87.72,-102.61l0 -136.1c0,-60.31 48.9,-109.22 109.22,-109.22l181.92 0c29.12,0 52.92,-23.8 52.92,-52.92l0 -238.22c0,-29.12 -23.81,-52.92 -52.92,-52.92l-238.22 0c-29.12,0 -52.92,23.8 -52.92,52.92l0 187.39c0,54.97 -40.64,100.47 -93.48,108.09 -483.09,45.16 -860.33,436.64 -860.33,912.94 0,478.09 380.1,870.7 866.1,913.4 49.69,7.76 87.72,50.74 87.72,102.61l0 136.1c0,60.32 -48.9,109.22 -109.22,109.22l-181.92 0c-29.12,0 -52.92,23.81 -52.92,52.92l0 238.22c0,29.12 23.8,52.93 52.92,52.93l238.22 0c29.12,0 52.92,-23.81 52.92,-52.93l0 -187.39c0,-54.96 40.64,-100.46 93.48,-108.09zm1.24 -346.95c-50.78,4.64 -94.72,-34.55 -94.72,-85.85l0 -192.27c0,-37.58 -29.35,-58.33 -66.22,-62.21 -298.33,-31.36 -530.02,-274.63 -530.02,-569.7 0,-285.58 217.23,-522.31 501.69,-565.99 2.73,-0.25 5.48,-0.39 8.27,-0.39 47.66,0 86.28,38.61 86.28,86.26l0 192.27c0,37.57 29.36,58.33 66.23,62.2 298.32,31.36 530.02,274.63 530.02,569.7 0,285.59 -217.28,522.37 -501.52,565.98z";

export default function OnchainLogo({
  size = 26,
  gradientId = "ocsBrandGrad",
}: {
  size?: number;
  gradientId?: string;
}) {
  const width = (size * 1908) / 2867; // ocs-mark aspect (~0.665)
  return (
    <svg
      width={width}
      height={size}
      viewBox="0 0 1908 2867"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flex: "none" }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#1727E0" />
          <stop offset="1" stopColor="#4F8BFF" />
        </linearGradient>
      </defs>
      <path d={MARK} fill={`url(#${gradientId})`} />
    </svg>
  );
}
