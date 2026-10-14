import { useState } from 'react';
import { Button, Modal } from './ui';
import { Icon } from './icons';
import { toast } from './toast';
import { searchMigrations, type Migration } from '../data/sources';
import './migrate.css';

/* Migrating in from another tool.
 *
 * Deliberately not a grid of logos. The question a person has at this moment is not "which of
 * these do you support" — they already know what they are leaving — it is "what comes across,
 * and what do I lose". So the list is a search and a row per tool, and every row answers both
 * before anything starts.
 */
export function MigrateList() {
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Migration | null>(null);
  const rows = searchMigrations(q);

  return (
    <div className="mig">
      <div className="mig__note">
        <Icon name="info" size={15} />
        <span>Coming from something not listed? Export a CSV and import it, or tell us and we will look at it.</span>
        <Button variant="secondary" size="s" onClick={() => toast('We’ll be in touch about your tool')}>Ask us</Button>
      </div>

      <div className="mig__search">
        <Icon name="search" size={16} />
        <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search tools to migrate from"
          placeholder="Search the tool you are moving from" autoComplete="off" />
      </div>

      {rows.length === 0 ? (
        <p className="mig__empty">
          No migration built for &ldquo;{q.trim()}&rdquo; yet. A CSV export from it will import here: wallet or email, one row per contact.
        </p>
      ) : (
        <div className="mig__list">
          {rows.map((m) => (
            <div className="mig__row" key={m.id}>
              <div className="mig__who">
                <b>{m.name}</b>
                <span>{m.brings}</span>
                {/* Said on the row, not in a dialog three steps in. */}
                {m.leaves && <em><Icon name="info" size={12} />{m.leaves}</em>}
              </div>
              <Button variant="secondary" size="s" onClick={() => setPicked(m)}>Migrate</Button>
            </div>
          ))}
        </div>
      )}

      {picked && (
        <Modal title={`Migrate from ${picked.name}`} onClose={() => setPicked(null)}
          footer={<><Button variant="secondary" onClick={() => setPicked(null)}>Cancel</Button>
            <Button icon="external-link" onClick={() => { setPicked(null); toast(`${picked.name} migration started. We’ll email you when it finishes`); }}>
              Connect {picked.name}
            </Button></>}>
          <div className="mig__dlg">
            <p><b>What comes across.</b> {picked.brings}.</p>
            {picked.leaves && <p className="mig__warn"><Icon name="alert-triangle" size={14} /><span>{picked.leaves}.</span></p>}
            <p className="mig__muted">
              Contacts arrive suppressed-safe: anyone unsubscribed in {picked.name} stays unsubscribed here,
              and nothing is sent to anyone as part of a migration.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
