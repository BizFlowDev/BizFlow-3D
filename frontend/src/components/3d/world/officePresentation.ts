export type OfficeDevice = "reports" | "employees" | "accounting" | "settings";

/** Original device bounds; camera framing never changes model scale or position. */
export const OFFICE_DEVICE_PRESENTATION: Record<OfficeDevice, { center: [number, number, number]; width: number; height: number; depth: number }> = {
  reports: { center: [8, 2.4, -31.85], width: 4.46, height: 2.56, depth: 0.1 },
  employees: { center: [9.8, 1.4, -25], width: 1.4, height: 2.8, depth: 0.65 },
  accounting: { center: [3, 0.8, -28.6], width: 2.4, height: 1.6, depth: 1.15 },
  settings: { center: [6.2, 0.8, -25.5], width: 2.6, height: 1.6, depth: 2.2 },
};
