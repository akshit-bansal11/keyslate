import { Modal } from "@/components/ui/modal";
import { useAppStore } from "@/lib/store/app-store";
import { answerConfirm } from "@/lib/store/ui-actions";

/** Renders the pending `askConfirm` request. Cancel is first, so Enter cannot destroy by reflex. */
export function ConfirmDialog() {
  const request = useAppStore((state) => state.confirm);

  return (
    <Modal
      open={request !== null}
      onClose={() => answerConfirm(false)}
      label="Confirm"
      className="ks-modal-narrow"
    >
      <div className="flex flex-col gap-4 p-5">
        <p className="selectable text-base">{request?.message}</p>
        <div className="flex justify-end gap-2">
          <button type="button" className="ks-button" onClick={() => answerConfirm(false)}>
            Cancel
          </button>
          <button
            type="button"
            className="ks-button border-danger text-danger"
            onClick={() => answerConfirm(true)}
          >
            {request?.confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
