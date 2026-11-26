import type {ReactNode} from 'react';
import {Button} from '@astryxdesign/core/Button';

interface ConfirmDialogProps {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Simple confirmation dialog built with Astryx buttons. Nothing happens until 確認 is pressed. */
export default function ConfirmDialog(props: ConfirmDialogProps) {
  return (
    <div className="dialog-backdrop">
      <div className="dialog-box" role="alertdialog" aria-modal="true" aria-label={props.title}>
        <h2>{props.title}</h2>
        <div>{props.children}</div>
        <div className="dialog-actions">
          <Button label="取消" variant="secondary" onClick={props.onCancel} />
          <Button
            label={props.confirmLabel}
            variant={props.isDestructive ? 'destructive' : 'primary'}
            onClick={props.onConfirm}
          />
        </div>
      </div>
    </div>
  );
}
