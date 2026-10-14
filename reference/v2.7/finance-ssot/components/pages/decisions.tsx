'use client';
import { PageHeader } from '@/components/page-header';
import { FigureTable, Section } from '@/components/figure-table';
import { DECISION_LOG } from '@/lib/decisions';

export function DecisionsContent({ controls }: { controls?: React.ReactNode }) {
  const total = DECISION_LOG.reduce((a, t) => a + t.rows.length, 0);

  void controls;
  return (
    <>
      <PageHeader
        eyebrow="12 Company decisions"
        question="What was decided, when, and what changed because of it?"
        answer={`${total} dated entries. Every figure here is a literal, frozen at the date of the decision, and the build refuses to compile if a live value is rendered into one. A record that re-renders whatever an input happens to be today is not a record.`}
      />

      {DECISION_LOG.map((t) => (
        <Section key={t.caption}>
          <FigureTable
            title={t.caption}
            description={`${t.rows.length} entries, oldest decisions first within each group.`}
            columns={t.columns.map((c, i) => ({ key: String(i), label: c }))}
            rows={t.rows.map((r) => ({
              cells: r.map((cell, i) => (
                <span key={i} className={i === 0 ? 'whitespace-nowrap' : 'block max-w-[70ch] whitespace-normal'}>
                  {cell}
                </span>
              )),
            }))}
          />
        </Section>
      ))}
    </>
  );
}
