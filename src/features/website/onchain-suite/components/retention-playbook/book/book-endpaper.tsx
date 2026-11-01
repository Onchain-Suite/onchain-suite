import Image from "next/image";

/**
 * Inside the front cover: our mark beside the client's, on the left of the
 * first spread, where the cover leaves the page empty. Our mark comes from
 * the site's sprite; the client's is a transparent mark (an SVG is served
 * as it is, hence unoptimized), set on a white tile the same size as ours.
 */
export function BookEndpaper({
  client,
}: {
  client: { name: string; logo: string };
}) {
  return (
    <div className="rp-bk-endpaper-in">
      <div className="rp-bk-marks">
        <span className="rp-bk-mark rp-bk-mark-ocs">
          <svg aria-hidden="true">
            <use href="#ocs-mark" fill="#FFFFFF" />
          </svg>
        </span>
        <span className="rp-bk-x" aria-hidden="true">
          ×
        </span>
        <span className="rp-bk-mark rp-bk-mark-client">
          <Image src={client.logo} alt="" width={64} height={64} unoptimized />
        </span>
      </div>
      <p className="rp-bk-pair">
        OnchainSuite <span aria-hidden="true">×</span> {client.name}
      </p>
    </div>
  );
}
