"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  Megaphone,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RefreshCcw,
  History,
  Radio,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useBroadcastAnnouncement,
  useAnnouncements,
} from "@/hooks/useAdmin";

const ITEMS_PER_PAGE = 5;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

// ── Animation variants ────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
} as const;

// ── Page Component ────────────────────────────────────────────────────────────

export default function SystemPage() {
  const { mutate: broadcastAnnouncement, isPending } = useBroadcastAnnouncement();
  const {
    data: announcements,
    isLoading: isLoadingAnnouncements,
    refetch,
    isRefetching,
  } = useAnnouncements();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sendSuccess, setSendSuccess] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const handleSend = () => {
    if (!title.trim() || !content.trim()) return;
    broadcastAnnouncement(
      { title: title.trim(), content: content.trim() },
      {
        onSuccess: () => {
          setTitle("");
          setContent("");
          setSendSuccess(true);
          setCurrentPage(1); // Về trang 1 để xem thông báo mới gửi
          setTimeout(() => setSendSuccess(false), 3500);
        },
      }
    );
  };

  // Phân trang
  const totalItems = announcements?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validPage - 1) * ITEMS_PER_PAGE;
  const paginatedAnnouncements = (announcements ?? []).slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  const getVisiblePages = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (validPage <= 3) {
      return [1, 2, 3, 4, 5];
    }
    if (validPage >= totalPages - 2) {
      return [
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }
    return [
      validPage - 2,
      validPage - 1,
      validPage,
      validPage + 1,
      validPage + 2,
    ];
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* ── Header ── */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight md:text-3xl">
            <div className="rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 p-2.5 shadow-md shadow-rose-500/20">
              <Megaphone className="h-5 w-5 text-white" />
            </div>
            Thông báo nền tảng
          </h1>
          <p className="mt-1 text-sm text-muted-foreground md:text-base">
            Tạo, quản lý và phát thông báo trực tiếp đến tất cả cửa hàng và người dùng trên hệ thống.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching || isLoadingAnnouncements}
          className="self-start sm:self-auto gap-1.5"
        >
          <RefreshCcw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
          Tải lại
        </Button>
      </motion.div>

      {/* ── Content Grid ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Cột trái: Soạn thông báo mới */}
        <motion.div variants={itemVariants} className="lg:col-span-5">
          <Card className="border bg-card/50 backdrop-blur-sm shadow-sm h-full flex flex-col justify-between">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Send className="h-4 w-4 text-rose-500" />
                Tạo thông báo mới
              </CardTitle>
              <CardDescription>
                Nội dung sẽ được phát tức thời đến toàn bộ cửa hàng đang sử dụng BizFlow
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 flex-1">
              <div className="space-y-1.5">
                <Label htmlFor="announcement-title" className="text-sm font-medium">
                  Tiêu đề thông báo <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="announcement-title"
                  placeholder="Ví dụ: Lịch bảo trì hệ thống định kỳ..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="announcement-content" className="text-sm font-medium">
                  Nội dung chi tiết <span className="text-rose-500">*</span>
                </Label>
                <Textarea
                  id="announcement-content"
                  placeholder="Nhập thông tin chi tiết về thông báo hoặc cập nhật mới..."
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="resize-none"
                />
              </div>

              <div className="rounded-lg border border-amber-200/60 bg-amber-50/50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                  <span>
                    Thông báo này sẽ xuất hiện trên màn hình quản lý của toàn bộ chủ shop và nhân viên.
                  </span>
                </div>
              </div>

              {sendSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Thông báo đã được phát thành công!</span>
                </motion.div>
              )}

              <Button
                onClick={handleSend}
                disabled={isPending || !title.trim() || !content.trim()}
                className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/25 hover:from-rose-600 hover:to-pink-600 font-medium"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang phát thông báo...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Phát thông báo ngay
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Cột phải: Lịch sử thông báo */}
        <motion.div variants={itemVariants} className="lg:col-span-7">
          <Card className="border bg-card/50 backdrop-blur-sm shadow-sm h-full flex flex-col justify-between">
            <div>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <History className="h-4 w-4 text-primary" />
                    Lịch sử thông báo
                  </CardTitle>
                  <CardDescription>
                    Danh sách các thông báo hệ thống đã được gửi
                  </CardDescription>
                </div>
                {totalItems > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {totalItems} thông báo
                    </Badge>
                    {totalPages > 1 && (
                      <Badge variant="outline" className="text-xs">
                        Trang {validPage}/{totalPages}
                      </Badge>
                    )}
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-3">
                {isLoadingAnnouncements ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full rounded-xl" />
                    ))}
                  </div>
                ) : totalItems === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                    <div className="rounded-full bg-muted/60 p-4 mb-3">
                      <Megaphone className="h-8 w-8 opacity-40" />
                    </div>
                    <p className="font-medium text-foreground">Chưa có thông báo nào</p>
                    <p className="text-sm mt-1 max-w-sm">
                      Các thông báo được tạo sẽ hiển thị tại đây để bạn tiện theo dõi lịch sử gửi.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paginatedAnnouncements.map((ann, i) => (
                      <motion.div
                        key={ann.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="group relative rounded-xl border bg-background/80 p-4 transition-all hover:bg-muted/30 hover:border-border/80"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <Radio className="h-3.5 w-3.5 text-rose-500 animate-pulse shrink-0" />
                              <h4 className="font-semibold text-foreground text-sm sm:text-base leading-snug">
                                {ann.title}
                              </h4>
                            </div>
                            <p className="text-sm text-muted-foreground whitespace-pre-line pt-1">
                              {ann.content}
                            </p>
                          </div>

                          {ann.createdBy && (
                            <Badge
                              variant="outline"
                              className="shrink-0 text-xs gap-1 bg-muted/40"
                            >
                              <User className="h-3 w-3" />
                              {ann.createdBy}
                            </Badge>
                          )}
                        </div>

                        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground/80 pt-2 border-t border-border/40">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(ann.createdAt)}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </div>

            {/* Phân trang Footer */}
            {totalItems > 0 && totalPages > 1 && (
              <div className="border-t border-border/50 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground order-2 sm:order-1">
                  Hiển thị{" "}
                  <span className="font-medium text-foreground">
                    {startIndex + 1} - {Math.min(startIndex + ITEMS_PER_PAGE, totalItems)}
                  </span>{" "}
                  trên tổng số{" "}
                  <span className="font-medium text-foreground">{totalItems}</span> thông báo
                </div>

                <div className="flex items-center gap-1.5 order-1 sm:order-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={validPage <= 1}
                    title="Trang trước"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <div className="flex items-center gap-1">
                    {getVisiblePages().map((pageNum) => (
                      <Button
                        key={pageNum}
                        variant={pageNum === validPage ? "default" : "outline"}
                        size="sm"
                        className={`h-8 min-w-[32px] px-2 text-xs ${
                          pageNum === validPage
                            ? "bg-rose-500 hover:bg-rose-600 text-white shadow-sm"
                            : ""
                        }`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={validPage >= totalPages}
                    title="Trang sau"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
