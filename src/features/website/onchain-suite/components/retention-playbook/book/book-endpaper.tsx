import Image from "next/image";

/**
 * Inside the front cover: our mark beside the client's, on the left of the
 * first spread, where the cover leaves the page empty. The mark comes from
 * the site's sprite.
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
        <Image
          className="rp-bk-mark"
          src={client.logo}
          alt=""
          width={96}
          height={96}
        />
      </div>
      <p className="rp-bk-pair">
        OnchainSuite <span aria-hidden="true">×</span> {client.name}
      </p>
    </div>
  );
}
