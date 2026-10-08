/**
 * OnchainSuite brand mark (from the visual identity kit), ported verbatim from
 * the onchainsuite-marketing repo. Vertical gradient #010F31 (navy) -> #1727E0
 * (electric) -> #2F94FF (sky). Pass a unique gradientId per instance.
 */
export default function OnchainLogo({
  size = 26,
  gradientId = "ocsBrandGrad",
}: {
  size?: number;
  gradientId?: string;
}) {
  const width = (size * 976) / 1466; // glyph is taller than wide (~2:3)
  return (
    <svg
      width={width}
      height={size}
      viewBox="592 348 976 1466"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flex: "none" }}
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="1080.05"
          y1="1786.94"
          x2="1080.05"
          y2="375.065"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#010F31" />
          <stop offset="0.501961" stopColor="#1727E0" />
          <stop offset="1" stopColor="#2F94FF" />
        </linearGradient>
      </defs>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1127.83 1635.83C1374.99 1612.74 1568 1412.54 1568 1168.97C1568 924.49 1373.53 723.692 1124.88 701.871C1099.45 697.906 1080 675.925 1080 649.398V579.802C1080 548.957 1105.02 523.947 1135.88 523.947H1228.95C1243.85 523.947 1256.03 511.775 1256.03 496.883V375.062C1256.03 360.173 1243.85 347.998 1228.95 347.998H1107.07C1092.18 347.998 1080 360.173 1080 375.062V470.889C1080 499.001 1059.21 522.269 1032.17 526.171C785.008 549.26 591.997 749.459 591.997 993.029C591.997 1237.52 786.472 1438.29 1035.12 1460.13C1060.54 1464.09 1080 1486.08 1080 1512.6V1582.2C1080 1613.04 1054.98 1638.05 1024.12 1638.05H931.045C916.145 1638.05 903.965 1650.23 903.965 1665.12V1786.94C903.965 1801.83 916.145 1814 931.045 1814H1052.92C1067.82 1814 1080 1801.83 1080 1786.94V1691.11C1080 1663 1100.79 1639.73 1127.83 1635.83ZM1128.46 1458.4C1102.48 1460.78 1080 1440.74 1080 1414.5V1316.18C1080 1296.96 1064.98 1286.35 1046.12 1284.36C893.481 1268.32 774.946 1143.92 774.946 993.029C774.946 846.991 886.086 725.93 1031.63 703.589C1033.03 703.462 1034.43 703.389 1035.86 703.389C1060.24 703.389 1080 723.14 1080 747.502V845.825C1080 865.04 1095.02 875.655 1113.88 877.636C1266.51 893.676 1385.05 1018.08 1385.05 1168.97C1385.05 1315.02 1273.89 1436.1 1128.46 1458.4Z"
        fill={`url(#${gradientId})`}
      />
    </svg>
  );
}
