import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, Switch, Table, truncate, type Column } from './ui';

describe('truncate', () => {
  it('middle-truncates long addresses 6+4', () => {
    expect(truncate('0x1234567890abcdef1234567890abcdef12345678')).toBe('0x1234…5678');
  });
  it('leaves short strings untouched', () => {
    expect(truncate('maya')).toBe('maya');
  });
});

describe('Button', () => {
  it('fires onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Create segment</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Create segment' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('Switch', () => {
  it('is an accessible checkbox that toggles', async () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} label="Pause automation" />);
    const box = screen.getByRole('checkbox', { name: 'Pause automation' });
    await userEvent.click(box);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('Table', () => {
  interface Row { id: string; name: string }
  const columns: Column<Row>[] = [{ key: 'name', label: 'Name' }];
  const rows: Row[] = [{ id: '1', name: 'Base whales' }];

  it('renders rows and invokes onRowClick', async () => {
    const onRowClick = vi.fn();
    render(<Table columns={columns} rows={rows} onRowClick={onRowClick} />);
    expect(screen.getByText('Base whales')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Base whales'));
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });
});
