import { useMemo, useState } from 'react';
import { Button, Modal } from '../components/ui';
import { Icon } from '../components/icons';
import type { IconName } from '../components/icons';
import {
  ALL_FIELDS, CHARTS, FIELDS, MEASURES, RANGES, SPLITS,
  computeSpec, describeSpec, type ChartSpec,
} from '../data/chartBuilder';
import { SpecChart } from './SpecChart';
import { useDashboardRange } from './chartKit';
import { useSegments } from '../data/store';

/* The builder, as one sentence of dropdowns.
 *
 * A form of labelled fields would have been easier to build and worse to read: the thing that
 * makes a query legible is the order the clauses come in, and a sentence enforces it. You can
 * read a half-finished chart aloud and hear what is missing.
 *
 * It previews live rather than behind an Apply button, because every choice here is cheap to
 * compute and the whole point is to see what a split does before committing to it.
 */
function Pick<T extends string>({ value, onChange, options, wide }: {
  value: T; onChange: (v: T) => void; options: { id: T; label: string }[]; wide?: boolean;
}) {
  return (
    <span className={`cbpick${wide ? ' cbpick--wide' : ''}`}>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      <Icon name="chevron-down" size={14} color="var(--text-tertiary)" />
    </span>
  );
}

export function ChartBuilder({ initial, onSave, onClose, onRemove }: {
  initial: ChartSpec;
  onSave: (s: ChartSpec) => void;
  onClose: () => void;
  onRemove?: () => void;
}) {
  const segments = useSegments();
  const [spec, setSpec] = useState<ChartSpec>(initial);
  const set = <K extends keyof ChartSpec>(k: K, v: ChartSpec[K]) => setSpec((s) => ({ ...s, [k]: v }));
  // The preview shows the chart as the dashboard will: in the dashboard's range.
  const shared = useDashboardRange();
  const computed = useMemo(() => computeSpec(shared ? { ...spec, range: shared.range } : spec), [spec, shared]);

  /* A stacked bar claims the parts add up to the whole. For a split where one wallet lands in
     several buckets — channels, apps, tokens — they do not, so that pairing is refused rather
     than drawn with a total that is quietly wrong. */
  const multi = SPLITS.find((s) => s.id === spec.splitBy)!.multi;
  const stackedOnMulti = spec.chart === 'stacked' && multi;

  return (
    <Modal wide title={initial.title === 'Untitled chart' ? 'New chart' : 'Edit chart'} onClose={onClose}
      footer={<>
        {onRemove && <span style={{ marginRight: 'auto' }}><Button variant="tertiary" icon="trash-2" onClick={onRemove}>Remove</Button></span>}
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave({ ...spec, title: spec.title.trim() || 'Untitled chart' })}>Save to dashboard</Button>
      </>}>
      <div className="cb">
        <input className="cb__title" value={spec.title} aria-label="Chart title"
          onChange={(e) => set('title', e.target.value)} placeholder="Name this chart" />

        <p className="cb__sentence">
          Show <Pick value={spec.measure} onChange={(v) => set('measure', v)} options={MEASURES} />
          {' '}for wallets that{' '}
          <Pick wide value={spec.field} onChange={(v) => set('field', v)}
            options={ALL_FIELDS.map((f) => ({ id: f, label: f.toLowerCase() }))} />
          {' '}in{' '}
          <Pick wide value={spec.audience} onChange={(v) => set('audience', v)}
            options={[{ id: 'all', label: 'the whole audience' }, ...segments.map((s) => ({ id: s.id, label: s.name }))]} />
          {' '}split by{' '}
          <Pick value={spec.splitBy} onChange={(v) => set('splitBy', v)} options={SPLITS} />
          {' '}as a{' '}
          <Pick value={spec.chart} onChange={(v) => set('chart', v)} options={CHARTS} />
          {/* Inside a dashboard the window is the dashboard's, so the chart does not ask for one. */}
          {shared ? '.' : <>
            {' '}over the{' '}
            <Pick value={spec.range} onChange={(v) => set('range', v)}
              options={RANGES.map((r) => ({ id: r.id, label: r.label.replace('Last ', '') }))} />.
          </>}
        </p>

        <div className="cb__hint">
          <Icon name={FIELDS.offchain.includes(spec.field) ? 'mail' : 'activity'} size={13} />
          {FIELDS.offchain.includes(spec.field)
            ? 'A messaging event. Only wallets you can reach on some channel can produce it.'
            : 'An on-chain event. Every wallet can produce it, reachable or not.'}
        </div>

        {stackedOnMulti && (
          <div className="cb__warn">
            <Icon name="triangle-alert" size={14} />
            <span>
              A wallet can be in several {SPLITS.find((s) => s.id === spec.splitBy)!.label.toLowerCase()} buckets,
              so stacking them would show a total larger than your audience.
              <button type="button" onClick={() => set('chart', 'bar')}>Use a bar chart instead</button>
            </span>
          </div>
        )}

        <div className="cb__preview">
          <SpecChart spec={spec} computed={computed} />
        </div>
        {computed.basis && <p className="cb__basis">{computed.basis}</p>}
      </div>
    </Modal>
  );
}

/** The card as it sits on the dashboard, with the controls that open this builder. */
export function ChartCard({ spec: saved, onEdit }: { spec: ChartSpec; onEdit: () => void }) {
  // On a dashboard, a chart follows the dashboard's range rather than the one it was built with.
  const shared = useDashboardRange();
  const spec = useMemo(() => (shared ? { ...saved, range: shared.range } : saved), [saved, shared]);
  const computed = useMemo(() => computeSpec(spec), [spec]);
  return (
    <div className="card cbcard">
      <div className="card__head">
        <h2>{spec.title}</h2>
        <span className="m">{describeSpec(spec)}</span>
        <button type="button" className="cbcard__edit" onClick={onEdit} aria-label={`Edit ${spec.title}`}>
          <Icon name={'sliders-horizontal' as IconName} size={15} />
        </button>
      </div>
      <SpecChart spec={spec} computed={computed} />
    </div>
  );
}
