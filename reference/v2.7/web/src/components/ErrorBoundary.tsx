import { Component, type ReactNode } from 'react';
import { Button } from './ui';
import { Icon } from './icons';

/* Catches render failures so a broken screen never blanks the whole app mid-demo. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error('Screen failed to render:', error); }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <div style={{ maxWidth: 460, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 48, height: 48, borderRadius: 999, background: 'var(--status-error-bg)', color: 'var(--status-error-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="alert-triangle" size={22} />
          </span>
          <h2 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>This screen didn&apos;t load</h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            This view failed to render. Nothing you have saved is affected. Try again re-renders it, Reload app restarts the workspace.
            {this.state.error?.message ? <><br /><code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-tertiary)' }}>{this.state.error.message}</code></> : null}
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Button variant="secondary" onClick={() => this.setState({ error: null })}>Try again</Button>
            <Button icon="refresh-cw" onClick={() => window.location.reload()}>Reload app</Button>
          </div>
        </div>
      </div>
    );
  }
}
