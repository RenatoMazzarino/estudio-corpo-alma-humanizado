"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { deleteService } from "../../../app/actions";
import { ServiceForm } from "../../../components/service-form";
import { Toast, useToast } from "../../../components/ui/toast";
import { feedbackFromError } from "../../../src/shared/feedback/user-feedback";
import { Service } from "../../../types/service";

interface CatalogoViewProps {
  initialServices: Service[];
  defaultBufferBefore: number | null;
  defaultBufferAfter: number | null;
}

type ActiveScreen = Service | "new" | null;

const LONG_PRESS_MS = 520;
const MOVE_CANCEL_PX = 14;

type PressState = {
  serviceId: string;
  x: number;
  y: number;
  longPressTriggered: boolean;
};

export function CatalogoView({
  initialServices,
  defaultBufferBefore,
  defaultBufferAfter,
}: CatalogoViewProps) {
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>(null);
  const [services, setServices] = useState<Service[]>(initialServices);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isRefreshing, startRefreshTransition] = useTransition();

  const holdTimerRef = useRef<number | null>(null);
  const pressRef = useRef<PressState | null>(null);

  useEffect(() => {
    setServices(initialServices);
    setSelectedIds((prev) => prev.filter((id) => initialServices.some((service) => service.id === id)));
  }, [initialServices]);

  useEffect(() => {
    if (selectionMode && selectedIds.length === 0) {
      setSelectionMode(false);
    }
  }, [selectionMode, selectedIds.length]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedCount = selectedIds.length;

  const clearHoldTimer = () => {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const resetPressState = () => {
    clearHoldTimer();
    pressRef.current = null;
  };

  const enterSelectionMode = (serviceId: string) => {
    setSelectionMode(true);
    setSelectedIds((prev) => (prev.includes(serviceId) ? prev : [...prev, serviceId]));

    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(10);
    }
  };

  const toggleServiceSelection = (serviceId: string) => {
    setSelectedIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    );
  };

  const handleCardPointerDown = (serviceId: string, event: React.PointerEvent<HTMLDivElement>) => {
    if (activeScreen || isDeleting) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    pressRef.current = {
      serviceId,
      x: event.clientX,
      y: event.clientY,
      longPressTriggered: false,
    };

    clearHoldTimer();
    holdTimerRef.current = window.setTimeout(() => {
      if (!pressRef.current) return;
      pressRef.current.longPressTriggered = true;
      enterSelectionMode(serviceId);
      showToast("Modo seleção ativado.");
    }, LONG_PRESS_MS);
  };

  const handleCardPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pressRef.current) return;

    const dx = Math.abs(event.clientX - pressRef.current.x);
    const dy = Math.abs(event.clientY - pressRef.current.y);
    if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) {
      clearHoldTimer();
    }
  };

  const handleCardPointerEnd = (service: Service) => {
    const press = pressRef.current;
    const longPressTriggered = Boolean(press?.longPressTriggered);
    resetPressState();

    if (longPressTriggered) return;

    if (selectionMode) {
      toggleServiceSelection(service.id);
      return;
    }

    setActiveScreen(service);
  };

  const handleCardContextMenu = (serviceId: string, event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!selectionMode) {
      enterSelectionMode(serviceId);
      showToast("Modo seleção ativado.");
      return;
    }
    toggleServiceSelection(serviceId);
  };

  const handleCancelSelection = () => {
    setSelectionMode(false);
    setSelectedIds([]);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0 || isDeleting) return;

    const count = selectedIds.length;
    const confirmed = window.confirm(
      count === 1
        ? "Excluir este serviço? Essa ação não pode ser desfeita."
        : `Excluir ${count} serviços selecionados? Essa ação não pode ser desfeita.`
    );
    if (!confirmed) return;

    const idsToDelete = [...selectedIds];
    startDeleteTransition(async () => {
      const deletedIds: string[] = [];
      let firstError: unknown = null;

      for (const id of idsToDelete) {
        const result = await deleteService(id);
        if (result.ok) {
          deletedIds.push(id);
          continue;
        }
        if (!firstError) firstError = result.error;
      }

      if (deletedIds.length > 0) {
        setServices((prev) => prev.filter((service) => !deletedIds.includes(service.id)));
      }

      if (deletedIds.length === idsToDelete.length) {
        showToast(
          deletedIds.length === 1
            ? "Serviço excluído."
            : `${deletedIds.length} serviços excluídos.`,
          "success"
        );
        handleCancelSelection();
      } else if (deletedIds.length > 0) {
        setSelectedIds(idsToDelete.filter((id) => !deletedIds.includes(id)));
        showToast(
          feedbackFromError(firstError ?? new Error("Alguns serviços não puderam ser excluídos."), "agenda")
        );
      } else {
        showToast(feedbackFromError(firstError ?? new Error("Não foi possível excluir os serviços."), "agenda"));
      }

      router.refresh();
    });
  };

  const handleFormSuccess = () => {
    setActiveScreen(null);
    startRefreshTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="relative h-full bg-stone-50">
      <Toast toast={toast} />

      {/* TELA 1: LISTA */}
      <div
        className={`transition-all duration-300 p-4 ${
          activeScreen ? "-translate-x-full opacity-0 absolute inset-0 pointer-events-none" : "translate-x-0 opacity-100"
        }`}
      >
        {/* Header da Lista / Seleção */}
        {selectionMode ? (
          <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleCancelSelection}
                className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50"
              >
                <X size={14} />
                Cancelar
              </button>
              <div className="min-w-0 text-center">
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-stone-400">
                  Seleção de serviços
                </p>
                <p className="text-sm font-bold text-stone-800">
                  {selectedCount} {selectedCount === 1 ? "selecionado" : "selecionados"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={selectedCount === 0 || isDeleting}
                className="inline-flex items-center gap-1 rounded-xl bg-red-500 px-3 py-2 text-xs font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 size={14} />
                {isDeleting ? "Excluindo..." : "Excluir"}
              </button>
            </div>
            <p className="mt-2 px-1 text-[11px] text-stone-500">
              Toque nos cards para marcar. Segure pressionado para entrar nesse modo.
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-6 px-1">
            <div className="flex items-center gap-3">
              <Link
                href="/menu"
                className="p-2 bg-white rounded-full text-gray-600 shadow-sm border border-stone-100 hover:bg-stone-50 transition"
              >
                <ChevronLeft size={20} />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-stone-800">Catálogo</h1>
                <p className="text-xs text-stone-500">Gerencie seus serviços</p>
              </div>
            </div>
            <button
              onClick={() => setActiveScreen("new")}
              disabled={isRefreshing}
              className="bg-studio-green text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg shadow-green-100 flex items-center gap-2 hover:bg-studio-green-dark transition disabled:opacity-70"
            >
              <Plus size={16} /> Novo
            </button>
          </div>
        )}

        {/* Lista de Cards */}
        <div className="space-y-3 pb-24">
          {services.length === 0 && (
            <div className="text-center py-10 text-stone-400">
              <p>Nenhum serviço ainda.</p>
              <p className="text-sm">Clique no + para adicionar.</p>
            </div>
          )}

          {services.map((service) => {
            const isSelected = selectedSet.has(service.id);
            return (
              <div
                key={service.id}
                onPointerDown={(event) => handleCardPointerDown(service.id, event)}
                onPointerMove={handleCardPointerMove}
                onPointerUp={() => handleCardPointerEnd(service)}
                onPointerCancel={resetPressState}
                onPointerLeave={resetPressState}
                onContextMenu={(event) => handleCardContextMenu(service.id, event)}
                className={`relative bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-4 transition-transform cursor-pointer group select-none ${
                  selectionMode ? "" : "active:scale-[0.99]"
                } ${
                  isSelected
                    ? "border-studio-green/40 ring-2 ring-studio-green/15"
                    : "border-stone-100 hover:border-studio-green/30"
                }`}
              >
                {selectionMode ? (
                  <div className="absolute right-3 top-3">
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                        isSelected
                          ? "border-studio-green bg-studio-green text-white"
                          : "border-stone-300 bg-white text-stone-300"
                      }`}
                    >
                      <CheckCircle2 size={14} />
                    </div>
                  </div>
                ) : null}

                {/* Ícone / "Foto" */}
                <div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${
                    service.accepts_home_visit ? "bg-dom/20 text-dom-strong" : "bg-studio-green/10 text-studio-green"
                  }`}
                >
                  {service.accepts_home_visit ? (
                    <MapPin size={24} />
                  ) : (
                    <span className="text-xl font-bold">{service.name.charAt(0)}</span>
                  )}
                </div>

                {/* Informações */}
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="font-bold text-stone-800 text-sm truncate">{service.name}</h3>
                  <p className="text-xs text-stone-500 truncate mb-1">{service.description || "Sem descrição"}</p>
                  <div className="flex items-center gap-3 text-xs text-stone-400">
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {service.duration_minutes}min
                    </span>
                    {service.accepts_home_visit && (
                      <span className="text-dom-strong font-medium">Domicílio disponível</span>
                    )}
                  </div>
                </div>

                {/* Preço e Seta */}
                <div className="text-right">
                  <span className="block font-bold text-stone-800 text-sm">R$ {service.price}</span>
                  {!selectionMode ? (
                    <ChevronRight size={16} className="text-stone-300 ml-auto mt-1 group-hover:text-studio-green" />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* TELA 2: FORMULÁRIO (Slide Over) */}
      <div
        className={`absolute inset-0 bg-stone-50 transition-transform duration-300 z-20 overflow-y-auto ${
          activeScreen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {activeScreen && (
          <ServiceForm
            service={activeScreen === "new" ? undefined : activeScreen}
            defaultBufferBefore={defaultBufferBefore}
            defaultBufferAfter={defaultBufferAfter}
            onSuccess={handleFormSuccess}
            onCancel={() => setActiveScreen(null)}
          />
        )}
      </div>
    </div>
  );
}
