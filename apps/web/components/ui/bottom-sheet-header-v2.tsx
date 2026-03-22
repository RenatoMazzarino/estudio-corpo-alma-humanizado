import type { PointerEventHandler, ReactNode } from "react";
import { X } from "lucide-react";
import { IconActionButton } from "./icon-action-button";

type BottomSheetHeaderV2Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  onCloseAction: () => void;
  onDragStartAction?: PointerEventHandler<HTMLDivElement>;
  onDragMoveAction?: PointerEventHandler<HTMLDivElement>;
  onDragEndAction?: PointerEventHandler<HTMLDivElement>;
};

export function BottomSheetHeaderV2({
  title,
  subtitle,
  actions,
  onCloseAction,
  onDragStartAction,
  onDragMoveAction,
  onDragEndAction,
}: BottomSheetHeaderV2Props) {
  return (
    <div
      className="touch-none wl-sheet-header-surface px-5 pb-3 pt-2"
      onPointerDown={onDragStartAction}
      onPointerMove={onDragMoveAction}
      onPointerUp={onDragEndAction}
      onPointerCancel={onDragEndAction}
    >
      <div className="mx-auto mb-2.5 h-1.5 w-10 rounded-full bg-muted/35" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="wl-typo-h1 truncate leading-none text-white">{title}</p>
          {subtitle ? <p className="wl-typo-body pt-1 text-white/85">{subtitle}</p> : null}
        </div>

        <div className="flex items-center gap-2">
          {actions}
          <IconActionButton
            label="Fechar"
            icon={<X className="h-4 w-4" />}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onCloseAction}
            className="wl-header-icon-button-strong"
          />
        </div>
      </div>
    </div>
  );
}
