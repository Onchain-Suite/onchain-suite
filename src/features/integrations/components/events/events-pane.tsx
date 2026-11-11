import { Icon, type IconSvgElement } from "@/shared/components/common/hugeicon";

/**
 * One view of the Events tab: a heading with what it is for, an action, then a
 * table that fills the rest of the window and scrolls inside its own box with
 * its header held (2.7). Below md the table is as tall as it needs to be.
 */
export function EventsPane({
  icon,
  title,
  blurb,
  action,
  children,
}: {
  icon: IconSvgElement;
  title: string;
  blurb: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2.5 flex shrink-0 items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon icon={icon} className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold tracking-[-0.2px] text-(--text-primary)">
            {title}
          </h2>
          <p className="mt-0.5 max-w-[74ch] text-[13px] leading-relaxed text-(--text-tertiary)">
            {blurb}
          </p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
