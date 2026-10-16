// One number with the sentence that says what it is. Figures are tabular so a column of them
// lines up, and medium weight rather than bold, which is the house rule for anything large.
import { Card, CardContent } from '@/components/ui/card';

export function Stat({ value, label, tone }: { value: React.ReactNode; label: React.ReactNode; tone?: 'good' | 'bad' }) {
  const colour = tone === 'good' ? 'text-(--green)' : tone === 'bad' ? 'text-(--red)' : 'text-foreground';
  return (
    <Card className="gap-0 py-4">
      <CardContent className="px-4">
        <div className={`font-medium tabular-nums text-xl leading-tight ${colour}`}>{value}</div>
        <p className="mt-1.5 text-xs leading-snug text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

// A plain grid rather than CardRow: CardRow gives a row the first card's height and is meant for
// two or three cards sharing one row, so it collapses when handed six. Stat cards are one line and
// one caption, so they are already the same height and need no equalising.
export function StatRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 @2xl/main:grid-cols-2 @5xl/main:grid-cols-3 lg:px-6">
      {children}
    </div>
  );
}
