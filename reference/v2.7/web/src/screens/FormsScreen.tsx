import { useEffect, useState } from 'react';
import { SectionEmpty } from '../components/SectionEmpty';
import { useWorkspaceMode } from '../data/workspace';
import { PageHeader } from '../shell/Shell';
import { Badge, Button, Card, Table, type Column } from '../components/ui';
import { Icon } from '../components/icons';
import { useAsync } from '../data/useAsync';
import { loadPersisted, savePersisted } from '../data/persist';
import { api } from '../data/api';
import type { FormRow } from '../data/types';
import { FormBuilder } from './FormBuilder';

export default function FormsScreen() {
  const workspace = useWorkspaceMode();
  const { data, loading } = useAsync(api.forms, []);
  const [forms, setForms] = useState<FormRow[]>(() => loadPersisted<FormRow[]>('forms', []));
  const [editing, setEditing] = useState<{ form: FormRow; isNew: boolean } | null>(null);

  // Seed local state from the API once it resolves; mutations then happen locally.
  // Seed from the API only on first run; user edits persist and win thereafter.
  // An empty workspace is not re-seeded: its forms are the ones made in it, starting with none.
  useEffect(() => {
    if (workspace !== 'empty' && data && !loadPersisted<FormRow[]>('forms', []).length) setForms(data);
  }, [data, workspace]);
  useEffect(() => { if (forms.length) savePersisted('forms', forms); }, [forms]);


  const cols: Column<FormRow>[] = [
    { key: 'name', label: 'Form', render: (r) => <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{r.name}</span> },
    { key: 'captureType', label: 'Type', render: (r) => <span style={{ color: 'var(--text-secondary)' }}>{r.captureType}</span> },
    { key: 'surface', label: 'Surface', render: (r) => <Badge status="neutral" dot={false}>{r.surface}</Badge> },
    { key: 'submissions', label: 'Submissions', numeric: true, render: (r) => r.submissions.toLocaleString() },
    { key: 'conversionPct', label: 'Conversion', render: (r) => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <b style={{ fontVariantNumeric: 'tabular-nums' }}>{r.conversionPct}%</b>
        <span style={{ width: 60, height: 6, borderRadius: 2, background: 'var(--surface-subtle)', overflow: 'hidden' }}>
          <span style={{ display: 'block', height: '100%', width: `${r.conversionPct}%`, background: 'var(--action-primary)' }} />
        </span>
      </span>
    ) },
    { key: 'enrolsInto', label: 'Enrols into', render: (r) => r.enrolsInto ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}><Icon name="zap" size={14} color="var(--action-primary)" />{r.enrolsInto}</span> : <span style={{ color: 'var(--text-tertiary)' }}>None</span> },
    { key: 'status', label: 'Status', render: (r) => <Badge status={r.status === 'Live' ? 'success' : 'neutral'}>{r.status}</Badge> },
    { key: 'chev', label: '', srLabel: 'Open', render: () => <Icon name="chevron-right" size={16} color="var(--text-tertiary)" /> },
  ];

  const newForm = () => setEditing({ form: { id: `form-${Date.now()}`, name: 'Untitled form', captureType: 'Identity capture', surface: 'Widget', submissions: 0, conversionPct: 0, enrolsInto: 'Welcome new wallets', status: 'Draft' }, isNew: true });

  /* Forms are the one section that works before any data arrives, so the empty state here
     offers to build one rather than pointing at Integrations. Once a form exists, the list
     is the right view. */
  if (workspace === 'empty' && forms.length === 0 && !editing) {
    return (
      <div className="page">
        <PageHeader title="Forms" sub="Capture forms that turn visitors into ZK-verified contacts and enrol them into Loops." />
        <SectionEmpty icon="clipboard-list" title="No forms yet" waits={false}
          body="A form turns a visitor into a verified contact. It does not need any indexed data, so you can build one now."
          action={{ label: 'New form', onClick: newForm }} />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader title="Forms" sub="Capture forms that turn visitors into ZK-verified contacts and enrol them into Loops."
        actions={<Button icon="plus" onClick={newForm}>New form</Button>} />
      <div className="kpis" style={{ marginBottom: 20 }}>
        <div className="stat"><span className="stat__label">Total submissions · 30d</span><div className="stat__value">{forms.reduce((s, f) => s + f.submissions, 0).toLocaleString()}</div></div>
        <div className="stat"><span className="stat__label">Avg conversion</span><div className="stat__value">{forms.length ? Math.round(forms.reduce((s, f) => s + f.conversionPct, 0) / forms.length) : 0}%</div></div>
        <div className="stat"><span className="stat__label">ZK-verified links</span><div className="stat__value">5,102</div></div>
        <div className="stat"><span className="stat__label">Live forms</span><div className="stat__value">{forms.filter((f) => f.status === 'Live').length}</div></div>
      </div>
      <Card pad={false} style={{ overflow: 'hidden' }}>
        {loading ? <div className="sk" style={{ height: 220, margin: 16 }} /> : <Table columns={cols} rows={forms} onRowClick={(f) => setEditing({ form: f, isNew: false })} />}
      </Card>

      {editing && (
        <FormBuilder
          form={editing.form}
          isNew={editing.isNew}
          onClose={() => setEditing(null)}
          onSave={(saved) => {
            setForms((list) => (list.some((f) => f.id === saved.id) ? list.map((f) => (f.id === saved.id ? saved : f)) : [saved, ...list]));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}


