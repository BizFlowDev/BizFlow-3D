"use client";

import { useEffect, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import dynamic from "next/dynamic";
import { getOfficeScreenLayout } from "./officeScreenLayout";
import type { Group, MeshStandardMaterial, PointLight, MeshBasicMaterial } from "three";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BarChart3, BookOpen, Settings2, Users, ArrowUpRight, Loader2, X } from "lucide-react";
import { SpatialPortalContext, SpatialStoreContext } from "@/components/ui/spatial-portal";

function LoadingWorkspace() {
  return <div role="status" className="flex min-h-64 items-center justify-center gap-3 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Đang tải bàn làm việc…</div>;
}

// The 2D routes and 3D workspace share the same business components and queries.
const Reports = dynamic(() => import("../../reports/ManagementContent"), { loading: LoadingWorkspace });
const Employees = dynamic(() => import("../../employees/ManagementContent"), { loading: LoadingWorkspace });
const Accounting = dynamic(() => import("../../accounting/ManagementContent"), { loading: LoadingWorkspace });
const Settings = dynamic(() => import("../../settings/ManagementContent"), { loading: LoadingWorkspace });

export type OfficeSection = "reports" | "employees" | "accounting" | "settings";
const sections = [
  { id: "reports", title: "Báo cáo", icon: BarChart3, description: "Doanh thu, đơn hàng & xuất báo cáo", component: Reports },
  { id: "employees", title: "Nhân viên", icon: Users, description: "Tài khoản, trạng thái & lịch sử", component: Employees },
  { id: "accounting", title: "Kế toán", icon: BookOpen, description: "Sổ sách, công nợ & kết quả kinh doanh", component: Accounting },
  { id: "settings", title: "Cài đặt cửa hàng", icon: Settings2, description: "Thông tin cửa hàng & thanh toán", component: Settings },
] as const;

export function OfficeLauncher({ canManage, onSelect }: { canManage: boolean; onSelect: (section: OfficeSection) => void }) {
  return (0
    // <section aria-label="Chức năng văn phòng" className="absolute left-3 right-3 top-20 z-30 rounded-2xl border border-white/15 bg-slate-950/90 p-3 text-white shadow-2xl backdrop-blur-xl sm:left-auto sm:right-5 sm:top-24 sm:w-72 sm:p-4">
    //   <div className="mb-3 flex items-center gap-3"><span className="rounded-lg bg-emerald-400/15 px-2 py-1 text-xs font-bold text-emerald-300">P.3</span><div><h2 className="text-sm font-semibold">Văn phòng quản lý</h2><p className="text-xs text-slate-400">Không gian điều hành cửa hàng</p></div></div>
    //   {canManage ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">{sections.map(({ id, title, icon: Icon, description }) => (
    //     <button key={id} type="button" onClick={() => onSelect(id)} className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-emerald-400/50 hover:bg-emerald-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
    //       <Icon className="h-4 w-4 shrink-0 text-emerald-300" /><span className="min-w-0 flex-1"><span className="block text-xs font-semibold sm:text-sm">{title}</span><span className="mt-1 hidden text-[11px] leading-relaxed text-slate-400 sm:block">{description}</span></span><ArrowUpRight className="hidden h-3.5 w-3.5 text-slate-500 group-hover:text-emerald-300 sm:block" />
    //     </button>
    //   ))}</div> : <p className="text-xs leading-relaxed text-slate-400">Các chức năng quản lý dành cho chủ cửa hàng.</p>}
    //   <p className="mt-3 hidden text-[11px] leading-relaxed text-slate-400 sm:block">Chọn chức năng ở đây hoặc nhấn vào thiết bị trong phòng.</p>
    // </section>
  );
}

export const OFFICE_SCREENS: Record<OfficeSection, [number, number, number]> = {
  reports: [8, 2.5, -31.65],
  employees: [9.8, 2.4, -24.45],
  accounting: [3, 2.4, -28.25],
  settings: [6.2, 2.3, -25.05],
};

export function OfficeWorkspace({ section, onSectionChange, queryClient }: { section: OfficeSection | null; onSectionChange: (section: OfficeSection | null) => void; queryClient: QueryClient }) {
  const selected = sections.find((item) => item.id === section);
  const Content = selected?.component;
  const [portal, setPortal] = useState<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const { size } = useThree();
  const screenRef = useRef<Group>(null);
  const frameRef = useRef<MeshStandardMaterial>(null);
  const panelRef = useRef<HTMLElement>(null);
  const lightRef = useRef<PointLight>(null);
  const haloRef = useRef<MeshBasicMaterial>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const progress = useRef(0);
  const closing = useRef(false);
  const reducedMotion = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { reducedMotion.current = preference.matches; };
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    progress.current = 0;
    pointer.current = { x: 0, y: 0 };
    closing.current = false;
    setIsClosing(false);
    if (section) closeRef.current?.focus({ preventScroll: true });
    return () => { if (closeTimer.current) clearTimeout(closeTimer.current); };
  }, [section]);

  const closeScreen = () => {
    if (closing.current) return;
    closing.current = true;
    setIsClosing(true);
    // Keep the screen and camera in place until its closing transition finishes.
    closeTimer.current = setTimeout(() => onSectionChange(null), reducedMotion.current ? 0 : 220);
  };

  useFrame((_, delta) => {
    const target = closing.current ? 0 : 1;
    progress.current = reducedMotion.current ? target : Math.max(0, Math.min(1, progress.current + (closing.current ? -1 : 1) * delta / (closing.current ? 0.22 : 0.48)));
    const t = progress.current;
    const eased = 1 - Math.pow(1 - t, 3);
    const screen = screenRef.current;
    if (screen) {
      screen.scale.setScalar(reducedMotion.current ? 1 : 0.68 + eased * 0.32);
      // Animate the actual world transform, keeping DOM and mesh bezels aligned.
      const settle = reducedMotion.current ? 0 : 1 - eased;
      const leanX = reducedMotion.current ? 0 : pointer.current.y * 0.018;
      const leanY = reducedMotion.current ? 0 : pointer.current.x * 0.025;
      const damping = 1 - Math.exp(-8 * delta);
      screen.rotation.x += (-0.025 - settle * 0.18 + leanX - screen.rotation.x) * damping;
      screen.rotation.y += (-0.035 + settle * 0.26 + leanY - screen.rotation.y) * damping;
      screen.position.y = -settle * 0.35;
      screen.position.z = -settle * 0.45;
    }
    if (lightRef.current) lightRef.current.intensity = eased * 3;
    if (haloRef.current) haloRef.current.opacity = eased * 0.14;
    if (panelRef.current) panelRef.current.style.opacity = String(eased);
    if (frameRef.current) {
      frameRef.current.opacity = eased;
      frameRef.current.emissiveIntensity = 0.25 + (1 - eased) * 0.65;
    }
  });
  if (!section) return null;
  // A real world-space surface: its DOM follows the camera's perspective matrix.
  const { width, height, factor, worldWidth, worldHeight, viewAngle, displayPosition } = getOfficeScreenLayout(size.width, size.height, section);
  return <group position={displayPosition}>
    {/* Contact cues remain anchored to the room while the display unfolds. */}
    <mesh position={[0, -displayPosition[1] + 0.018, 0.15]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.8, 0.65, 1]}>
      <circleGeometry args={[1, 48]} />
      <meshBasicMaterial color="#020617" transparent opacity={0.2} depthWrite={false} />
    </mesh>
    <mesh position={[0, -displayPosition[1] + 0.022, 0.1]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.7, 0.6, 1]}>
      <ringGeometry args={[0.88, 1, 48]} />
      <meshBasicMaterial ref={haloRef} color="#34d399" transparent opacity={0} depthWrite={false} />
    </mesh>
    <group rotation={[-viewAngle, 0, 0]}>
    <group ref={screenRef} scale={0.68}>
      <pointLight ref={lightRef} position={[0, -worldHeight / 2, 0.45]} color="#6ee7b7" intensity={0} distance={5} decay={2} />
      {/* Deep side rails and a rear shell make the silhouette read as a solid device. */}
      <mesh position={[0, 0, -0.17]}>
        <boxGeometry args={[worldWidth + 0.22, worldHeight + 0.22, 0.2]} />
        <meshStandardMaterial color="#071820" metalness={0.75} roughness={0.35} transparent opacity={0.85} />
      </mesh>
      {[-1, 1].map((side) => <mesh key={`rail-${side}`} position={[side * (worldWidth / 2 + 0.08), 0, -0.035]}>
        <boxGeometry args={[0.035, worldHeight + 0.12, 0.12]} />
        <meshStandardMaterial color="#5eead4" emissive="#14b8a6" emissiveIntensity={0.65} metalness={0.6} roughness={0.25} />
      </mesh>)}
      <mesh position={[0, 0, -0.045]}>
        <boxGeometry args={[width * factor / 400 + 0.14, height * factor / 400 + 0.14, 0.08]} />
        <meshStandardMaterial ref={frameRef} transparent opacity={0} color="#102e34" metalness={0.6} roughness={0.3} emissive="#0d9488" emissiveIntensity={0.25} />
      </mesh>
      <Html transform distanceFactor={factor} zIndexRange={[45, 41]}>
        {/* Html creates a separate React DOM root: explicitly restore app providers. */}
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <SpatialStoreContext.Provider value={true}>
              <SpatialPortalContext.Provider value={portal}>
                <section ref={panelRef} data-office-panel data-closing={isClosing} aria-label={`Màn hình ${selected?.title}`} style={{ width, height, opacity: 0, pointerEvents: isClosing ? "none" : "auto" }} className="relative flex flex-col rounded-xl border border-emerald-300/40 bg-slate-950 text-slate-100 shadow-[14px_20px_45px_#0008,0_0_35px_#10b98130]" onPointerMove={(e) => { const rect = e.currentTarget.getBoundingClientRect(); pointer.current = { x: Math.max(-1, Math.min(1, (e.clientX - rect.left) / rect.width * 2 - 1)), y: Math.max(-1, Math.min(1, (e.clientY - rect.top) / rect.height * 2 - 1)) }; }} onPointerLeave={() => { pointer.current = { x: 0, y: 0 }; }} onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === "Escape" && !e.defaultPrevented && !portal?.querySelector('[role="dialog"], [role="alertdialog"], [role="listbox"], [role="menu"]')) { e.stopPropagation(); closeScreen(); } }}>
                  <style>{`
            @keyframes officeScreenSweep {
              from { transform: translateY(-100%); opacity: 0; }
              20% { opacity: 0.5; }
              to { transform: translateY(650%); opacity: 0; }
            }
            [data-office-sweep] { animation: officeScreenSweep 850ms ease-out both; }
            @media (prefers-reduced-motion: reduce) {
              [data-office-sweep] { display: none; }
            }
          `}</style>
                  {!isClosing && <div key={`sweep-${section}`} className="pointer-events-none absolute inset-0 z-40 overflow-hidden rounded-xl" aria-hidden="true"><div data-office-sweep className="h-1/5 w-full bg-gradient-to-b from-transparent via-emerald-200/15 to-transparent" /></div>}
                  <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-40 rounded-xl ring-1 ring-inset ring-white/15" style={{ background: "linear-gradient(125deg, rgba(167,243,208,0.09), transparent 28%, transparent 75%, rgba(56,189,248,0.04))" }} />
                  <header className="flex shrink-0 items-center justify-between border-b border-emerald-300/20 px-5 py-3">
                    <div><p className="text-[10px] tracking-[0.25em] text-emerald-300">BIZFLOW · P.3 / THIẾT BỊ ĐIỀU HÀNH</p><h2 className="mt-1 text-lg font-semibold">{selected?.title}</h2></div>
                    <button ref={closeRef} type="button" onClick={closeScreen} aria-label="Đóng màn hình, quay lại văn phòng" className="rounded-lg border border-white/20 p-2 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"><X className="h-5 w-5" /></button>
                  </header>
                  <nav aria-label="Chức năng quản lý" className="flex shrink-0 gap-2 overflow-x-auto border-b border-white/10 px-4 py-2">
                    {sections.map(({ id, title, icon: Icon }) => <button key={id} type="button" aria-current={section === id ? "page" : undefined} onClick={() => onSectionChange(id)} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 ${section === id ? "bg-emerald-600 text-white" : "text-slate-300 hover:bg-white/10"}`}><Icon className="h-4 w-4" />{title}</button>)}
                  </nav>
                  <div key={`content-${section}`} className="min-h-0 flex-1 overflow-auto overscroll-contain rounded-b-xl bg-background p-4 text-foreground">{Content && <Content />}</div>
                  <div ref={setPortal} className="pointer-events-none absolute inset-0 z-50 [&>*]:pointer-events-auto" />
                </section>
              </SpatialPortalContext.Provider>
            </SpatialStoreContext.Provider>
          </TooltipProvider>
        </QueryClientProvider>
      </Html>
    </group>
    </group>
  </group>;
}
