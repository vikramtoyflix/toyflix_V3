
import { ConfirmationDialog } from "../ConfirmationDialog";
import { BulkConfirmationDialog } from "../bulk/BulkConfirmationDialog";
import { BulkInputDialog } from "../bulk/BulkInputDialog";

interface DialogState {
  open: boolean;
  title: string;
  description: string;
  actionLabel: string;
  action: () => void;
  destructive?: boolean;
}

interface DeleteDialogState {
  open: boolean;
  toyId: string;
  toyName: string;
}

interface InputDialogState {
  open: boolean;
  title: string;
  description: string;
  inputType: "text" | "number" | "select" | "percentage";
  options?: { value: string; label: string }[];
  placeholder?: string;
  action: (value: string) => void;
}

interface AdminToysDialogsProps {
  confirmDialog: DialogState;
  setConfirmDialog: (dialog: DialogState) => void;
  deleteDialog: DeleteDialogState;
  setDeleteDialog: (dialog: DeleteDialogState) => void;
  inputDialog: InputDialogState;
  setInputDialog: (dialog: InputDialogState) => void;
  selectedCount: number;
  onConfirmDeleteToy: () => void;
}

export const AdminToysDialogs = ({
  confirmDialog,
  setConfirmDialog,
  deleteDialog,
  setDeleteDialog,
  inputDialog,
  setInputDialog,
  selectedCount,
  onConfirmDeleteToy
}: AdminToysDialogsProps) => {
  return (
    <>
      <BulkConfirmationDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        title={confirmDialog.title}
        description={confirmDialog.description}
        actionLabel={confirmDialog.actionLabel}
        onConfirm={confirmDialog.action}
        destructive={confirmDialog.destructive}
        selectedCount={selectedCount}
      />

      <ConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title="Delete Toy"
        description={`Are you sure you want to delete "${deleteDialog.toyName}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={onConfirmDeleteToy}
      />

      <BulkInputDialog
        open={inputDialog.open}
        onOpenChange={(open) => setInputDialog({ ...inputDialog, open })}
        title={inputDialog.title}
        description={inputDialog.description}
        inputType={inputDialog.inputType}
        options={inputDialog.options}
        placeholder={inputDialog.placeholder}
        onConfirm={inputDialog.action}
        selectedCount={selectedCount}
      />
    </>
  );
};
