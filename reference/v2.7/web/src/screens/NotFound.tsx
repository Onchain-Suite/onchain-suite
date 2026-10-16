import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui';
import { Icon } from '../components/icons';

export default function NotFound() {
  const nav = useNavigate();
  return (
    <div className="page" style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <div style={{ maxWidth: 420, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 48, height: 48, borderRadius: 999, background: 'var(--surface-subtle)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="search-x" size={22} />
        </span>
        <h2 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>Page not found</h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>That route doesn&apos;t exist. Check the address, or head back to the dashboard.</p>
        <div style={{ marginTop: 8 }}><Button icon="layout-grid" onClick={() => nav('/dashboard')}>Go to Home</Button></div>
      </div>
    </div>
  );
}
