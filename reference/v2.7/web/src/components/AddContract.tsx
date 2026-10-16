import { useState } from 'react';
import { Button, Modal } from './ui';
import { toast } from './toast';
import { ContractResolver, type NewContract } from './ContractResolver';

/* Adding a contract from Data (2.7).
 *
 * The box itself is shared with first-run — see ContractResolver. This is only the modal
 * around it, which owns the confirm button because a modal's primary action belongs in its
 * footer and first-run's belongs inline.
 */

export type { NewContract };

export default function AddContract({ onClose, onAdd, initial }: {
  onClose: () => void; onAdd: (c: NewContract[]) => void; initial?: string;
}) {
  const [picked, setPicked] = useState<NewContract[]>([]);

  return (
    <Modal title="Add a contract" onClose={onClose} wide
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button disabled={picked.length === 0} onClick={() => {
          onAdd(picked);
          toast(picked.length === 1
            ? `${picked[0].name} queued for indexing`
            : `${picked.length} contracts queued for indexing`);
        }}>
          {picked.length > 1 ? `Index ${picked.length} contracts` : 'Index contract'}
        </Button>
      </>}>
      <ContractResolver onChange={setPicked} initial={initial} />
    </Modal>
  );
}
