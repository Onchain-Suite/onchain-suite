import { AnalyticsCard, CardEmpty, type CardSpan } from "../analytics-card";

/**
 * A card the reference dashboard has but the backend cannot fill yet. It keeps
 * its place in the layout and says what it will show and what it needs.
 */
export function NotMeasuredCard({
  title,
  meta,
  shows,
  needs,
  span = 1,
}: {
  title: string;
  meta?: string;
  shows: string;
  needs: string;
  span?: CardSpan;
}) {
  return (
    <AnalyticsCard title={title} meta={meta} span={span}>
      <CardEmpty
        title="Not measured yet"
        reason={`${shows} ${needs}`}
        tag="Coming with the backend"
      />
    </AnalyticsCard>
  );
}
