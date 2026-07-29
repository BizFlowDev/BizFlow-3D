import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BizFlow 3D",
  description: "Nền tảng chuyển đổi số cho hộ kinh doanh",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
