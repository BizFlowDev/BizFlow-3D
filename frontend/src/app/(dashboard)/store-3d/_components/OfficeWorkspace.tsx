"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { BarChart3, BookOpen, Settings2, Users, Loader2, X } from "lucide-react";
import { SpatialPortalContext } from "@/components/ui/spatial-portal";
import { Modal3DCard } from "./Modal3DCard";

function LoadingWorkspace() {
  return <div role="status" className="flex min-h-64 items-center justify-center gap-3 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Đang tải bàn làm việc…</div>;
}

// Reuse the business components and queries from the 2D routes.
const Reports = dynamic(() => import("../../reports/ManagementContent"), { loading: LoadingWorkspace });
const Employees = dynamic(() => import("../../employees/ManagementContent"), { loading: LoadingWorkspace });
const Accounting = dynamic(() => import("../../accounting/ManagementContent"), { loading: LoadingWorkspace });
const Settings = dynamic(() => import("../../settings/ManagementContent"), { loading: LoadingWorkspace });

export type OfficeSection = "reports" | "employees" | "accounting" | "settings";
const sections = [
  { id: "reports", title: "Báo cáo", icon: BarChart3, component: Reports },
  { id: "employees", title: "Nhân viên", icon: Users, component: Employees },
  { id: "accounting", title: "Kế toán", icon: BookOpen, component: Accounting },
  { id: "settings", title: "Cài đặt cửa hàng", icon: Settings2, component: Settings },
] as const;

export function OfficeWorkspace({ section, onSectionChange }: { section: OfficeSection | null; onSectionChange: (section: OfficeSection | null) => void }) {
  const selected = sections.find((item) => item.id === section);
  const Content = selected?.component;
  const [portal, setPortal] = useState<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [closing, setClosing] = useState(false);

  const close = useCallback(() => {
    if (timer.current) return;
    setClosing(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      onSectionChange(null);
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 220);
  }, [onSectionChange]);

  useEffect(() => {
    setClosing(false);
    if (!section) return;
    const previousFocus = document.activeElement;
    closeRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      // Nested dialogs and menus consume their own Escape before this listener.
      if (event.key !== "Escape" || event.defaultPrevented || portal?.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [role="listbox"][data-state="open"], [role="menu"][data-state="open"]')) return;
      event.preventDefault();
      event.stopPropagation();
      close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (timer.current) { clearTimeout(timer.current); timer.current = null; }
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [section, portal, close]);

  if (!section || !selected) return null;
  const Icon = selected.icon;
  return (
    // Keep the panel below the HUD layer and reserve space for both control bars.
    <div className="pointer-events-none fixed inset-x-0 bottom-32 top-24 z-20 flex items-center justify-center px-4 sm:justify-end sm:px-8 lg:px-12">
      <div className="pointer-events-auto w-full min-w-0 max-w-4xl sm:w-[62vw]">
        <Modal3DCard key={section} closing={closing} isFloating enableTilt={false} accentGlowColor="rgba(52, 211, 153, 0.35)">
          <SpatialPortalContext.Provider value={portal}>
            <section data-office-panel role="dialog" aria-modal="false" aria-labelledby="office-workspace-title" className="relative flex h-[calc(100dvh-15rem)] min-h-0 flex-col" onPointerDown={(event) => event.stopPropagation()} onWheel={(event) => event.stopPropagation()}>
              <header className="flex shrink-0 items-center justify-between gap-3 border-b border-emerald-400/20 bg-slate-950/85 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-2 text-emerald-300"><Icon className="h-5 w-5" /></span>
                  <div className="min-w-0"><p className="text-[10px] font-bold tracking-wider text-emerald-400">BIZFLOW · VĂN PHÒNG P.3</p><h2 id="office-workspace-title" className="truncate text-sm font-bold text-white">{selected.title}</h2></div>
                </div>
                <button ref={closeRef} type="button" onClick={close} aria-label="Đóng màn hình văn phòng (Esc)" title="Đóng (Esc)" className="shrink-0 rounded-full p-2 text-slate-400 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"><X className="h-4 w-4" /></button>
              </header>
              <nav aria-label="Chức năng quản lý" className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-white/10 bg-slate-900/60 px-3 py-2">
                {sections.map(({ id, title, icon: TabIcon }) => <button key={id} type="button" aria-current={section === id ? "page" : undefined} onClick={() => onSectionChange(id)} className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold focus-visible:outline focus-visible:outline-2 ${section === id ? "border-emerald-400/40 bg-emerald-500/25 text-emerald-300" : "border-transparent text-slate-400 hover:bg-white/5 hover:text-white"}`}><TabIcon className="h-4 w-4" />{title}</button>)}
              </nav>
              <div key={section} className="min-h-0 flex-1 overflow-auto overscroll-contain bg-background p-3 text-foreground sm:p-4">{Content && <Content />}</div>
              <footer className="shrink-0 border-t border-white/10 bg-slate-950 px-4 py-2 text-[10px] text-slate-400">Esc để đóng · Chọn HUD để đổi góc nhìn hoặc chuyển phòng</footer>
              <div ref={setPortal} className="pointer-events-none absolute inset-0 z-50 [&>*]:pointer-events-auto" />
            </section>
          </SpatialPortalContext.Provider>
        </Modal3DCard>
      </div>
    </div>
  );
}
