import Image from "next/image";

import type { BlogAuthor } from "../../blog.types";
import { initials } from "../../utils/share";

/** An author's photo, or their initials when they haven't uploaded one. */
export function AuthorAvatar({
  author,
  size,
}: {
  author: BlogAuthor;
  size: number;
}) {
  const style = { width: size, height: size };

  if (author.avatar?.url) {
    return (
      <Image
        src={author.avatar.url}
        alt=""
        width={size}
        height={size}
        sizes={`${size * 2}px`}
        className="ba-avatar"
        style={style}
      />
    );
  }

  return (
    <span
      className="ba-avatar ba-avatar--initials"
      style={{ ...style, fontSize: Math.round(size * 0.38) }}
      aria-hidden="true"
    >
      {initials(author.name)}
    </span>
  );
}
