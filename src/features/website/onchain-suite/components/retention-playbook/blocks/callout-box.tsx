import {
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/20/solid";

import { RichText } from "@/onchain-suite-website/components/retention-playbook/rich-text";
import type { RichSegment } from "@/onchain-suite-website/utils/glossary-marker";

const ICONS = {
  rules: CheckBadgeIcon,
  warning: ExclamationTriangleIcon,
  note: InformationCircleIcon,
};

/** A boxed aside: the house rules, a warning line, or a note. */
export function CalloutBox({
  tone,
  title,
  text,
  items,
}: {
  tone: keyof typeof ICONS;
  title: string;
  text?: RichSegment[];
  items?: RichSegment[][];
}) {
  const Icon = ICONS[tone];
  const List = tone === "rules" ? "ol" : "ul";
  return (
    <div className={`rp-box is-${tone}`}>
      <p className="rp-box-title">
        <Icon className="rp-box-icon" aria-hidden="true" />
        {title}
      </p>
      {text && (
        <p className="rp-box-text">
          <RichText segments={text} />
        </p>
      )}
      {items && (
        <List className="rp-box-list">
          {items.map((item) => (
            <li key={item.map((s) => s.text).join("")}>
              <RichText segments={item} />
            </li>
          ))}
        </List>
      )}
    </div>
  );
}
