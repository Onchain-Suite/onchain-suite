import { Link } from 'react-router-dom';
import { Icon, type IconName } from './icons';
import { Button } from './ui';
import { useIndexing } from '../data/workspace';
import './section-empty.css';

/* A section in an empty workspace.
 *
 * Every section says three things: what it is for, why it is empty, and the one action that
 * fills it. Most fill in from an indexed contract, so they also say what they are waiting on —
 * and, while an index is running, that it is on its way rather than that nothing is there. */
export function SectionEmpty({ icon, title, body, action, waits = true }: {
  icon: IconName;
  title: string;
  body: string;
  action?: { label: string; to?: string; onClick?: () => void; icon?: IconName };
  /** Fills in from indexed data. False for sections that work on day one, like Forms. */
  waits?: boolean;
}) {
  const indexing = useIndexing();
  return (
    <section className="sempty" aria-label={title}>
      <span className="sempty__ic"><Icon name={icon} size={22} /></span>
      <h2>{title}</h2>
      <p>{body}</p>
      {waits && (
        <p className={`sempty__wait${indexing ? ' is-busy' : ''}`}>
          <Icon name={indexing ? 'loader-circle' : 'clock'} size={14} />
          {indexing ? `Indexing ${indexing}. This fills in when it finishes.` : 'Waiting on your first indexed contract.'}
        </p>
      )}
      {action && (action.to
        ? <Link className="sempty__btn" to={action.to}>{action.label}<Icon name={action.icon ?? 'arrow-right'} size={15} /></Link>
        : <Button icon={action.icon ?? 'plus'} onClick={action.onClick}>{action.label}</Button>)}
    </section>
  );
}
