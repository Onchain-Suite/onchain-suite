import {
  LeftToRightListBulletIcon,
  PlusSignIcon,
  Shield01Icon,
  Tag01Icon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";

import { EmptyState } from "@/shared/components/common/empty-state";
import { Icon } from "@/shared/components/common/hugeicon";

/* The Audience tabs' empty states, in the 2.7 reference's words. Each says
 * what the tab holds, so an empty one still teaches what it is for. */

const FRAME = "rounded-2xl border border-border bg-card";

export function ListsEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      className={FRAME}
      icon={LeftToRightListBulletIcon}
      title="No lists yet"
      description="Lists are built from form sign-ups and imports, or saved from a segment to reuse across campaigns."
      action={
        <Button size="sm" onClick={onCreate}>
          <Icon icon={PlusSignIcon} className="mr-1.5 size-4" />
          New list
        </Button>
      }
    />
  );
}

export function TagsEmpty() {
  return (
    <EmptyState
      className={FRAME}
      icon={Tag01Icon}
      title="No tags yet"
      description="A tag is a label you put on people, by hand or by a rule. Select contacts and apply one, or create it with New tag."
    />
  );
}

export function SuppressedEmpty() {
  return (
    <EmptyState
      className={FRAME}
      icon={Shield01Icon}
      title="Nobody is suppressed"
      description="People who unsubscribe, bounce or ask to be deleted show up here. Everyone in your audience is reachable today."
    />
  );
}
