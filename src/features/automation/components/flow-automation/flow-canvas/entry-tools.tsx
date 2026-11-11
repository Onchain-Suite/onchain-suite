/**
 * The line above the ways in (2.7): what starts the Loop, the button to add
 * another way in, and, once there are two, whether everyone takes the same
 * first steps or each way in has its own. One line, so nothing interrupts the
 * path from the ways in down to what everyone does.
 */
export function EntryTools({
  count,
  split,
  canUnsplit,
  onSetSplit,
  addMenu,
}: {
  /** How many ways in the Loop has. */
  count: number;
  /** Each way in has its own first steps. */
  split: boolean;
  /** The per-way-in steps are empty, so they can be merged back. */
  canUnsplit: boolean;
  onSetSplit: (split: boolean) => void;
  /** The "Add another way in" button and its menu, or null at the limit. */
  addMenu: React.ReactNode;
}) {
  const many = count > 1;
  return (
    <div className="ab-entrytools">
      <span className="ab-caption">
        {many ? "People start when any of these happen" : "People start when"}
      </span>
      {addMenu ? <div className="ab-entryadd">{addMenu}</div> : null}
      {many ? (
        <div className="ab-splitseg" role="radiogroup" aria-label="First steps">
          <button
            type="button"
            role="radio"
            aria-checked={!split}
            disabled={split && !canUnsplit}
            title={
              split && !canUnsplit
                ? "Empty the steps under each way in first"
                : undefined
            }
            onClick={() => onSetSplit(false)}
          >
            Same steps for everyone
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={split}
            onClick={() => onSetSplit(true)}
          >
            Different first steps for each
          </button>
        </div>
      ) : null}
    </div>
  );
}
