"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Settings,
  Save,
  Upload,
  FileText,
  Megaphone,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RefreshCcw,
  Pencil,
  X,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useSystemConfig,
  useUpdateSystemConfig,
  useBroadcastAnnouncement,
  useAnnouncements,
} from "@/hooks/useAdmin";
import type {
  SystemConfig,
  SystemConfigUpdateData,
} from "@/hooks/useAdmin";

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
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
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

// ── System Config Tab ─────────────────────────────────────────────────────────

function SystemConfigTab() {
  const { data: configs, isLoading, refetch } = useSystemConfig();
  const { mutate: updateConfig, isPending: isSaving } = useUpdateSystemConfig();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleEdit = (config: SystemConfig) => {
    setEditingKey(config.key);
    setEditValue(config.value);
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditValue("");
  };

  const handleSave = (key: string) => {
    const updates: SystemConfigUpdateData[] = [{ key, value: editValue }];
    updateConfig(updates, {
      onSuccess: () => {
        setEditingKey(null);
        setEditValue("");
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[150px]" />
            <Skeleton className="h-4 w-[100px]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card className="border bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-500" />
            Cấu hình hệ thống
          </CardTitle>
          <CardDescription>
            Cập nhật các tham số cấu hình key-value của nền tảng
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1 text-sm text-emerald-600"
            >
              <CheckCircle2 className="h-4 w-4" />
              Đã lưu
            </motion.div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Tải lại
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="min-w-[200px]">Key</TableHead>
                <TableHead className="min-w-[200px]">Giá trị</TableHead>
                <TableHead className="min-w-[250px]">Mô tả</TableHead>
                <TableHead className="min-w-[140px]">Cập nhật lúc</TableHead>
                <TableHead className="w-[100px] text-center">
                  Thao tác
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(configs ?? []).map((config, index) => (
                <motion.tr
                  key={config.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="group border-b transition-colors hover:bg-muted/40"
                >
                  <TableCell>
                    <code className="rounded-md bg-muted/50 px-2 py-1 text-xs font-mono text-blue-600 dark:text-blue-400">
                      {config.key}
                    </code>
                  </TableCell>
                  <TableCell>
                    {editingKey === config.key ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSave(config.key);
                          if (e.key === "Escape") handleCancel();
                        }}
                      />
                    ) : (
                      <span className="font-medium tabular-nums">
                        {config.value}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {config.description}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(config.updatedAt)}
                  </TableCell>
                  <TableCell className="text-center">
                    {editingKey === config.key ? (
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-emerald-600"
                          onClick={() => handleSave(config.key)}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground"
                          onClick={handleCancel}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => handleEdit(config)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}


// ── Announcement Tab ──────────────────────────────────────────────────────────

function AnnouncementTab() {
  const { mutate: broadcastAnnouncement, isPending } =
    useBroadcastAnnouncement();
  const { data: announcements, isLoading: isLoadingAnnouncements, refetch } =
    useAnnouncements();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sendSuccess, setSendSuccess] = useState(false);

  const handleSend = () => {
    if (!title.trim() || !content.trim()) return;
    broadcastAnnouncement(
      { title, content },
      {
        onSuccess: () => {
          setTitle("");
          setContent("");
          setSendSuccess(true);
          setTimeout(() => setSendSuccess(false), 3000);
        },
      }
    );
  };

  return (
    <Card className="border bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-rose-500" />
            Thông báo hệ thống
          </CardTitle>
          <CardDescription>
            Tạo và broadcast thông báo đến tất cả cửa hàng trên nền tảng
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCcw className="h-3.5 w-3.5" />
          Tải lại
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Compose */}
        <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
          <h4 className="text-sm font-semibold">Tạo thông báo mới</h4>
          <div>
            <Label htmlFor="announcement-title" className="mb-1.5 block text-sm">
              Tiêu đề
            </Label>
            <Input
              id="announcement-title"
              placeholder="Nhập tiêu đề thông báo..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="announcement-content" className="mb-1.5 block text-sm">
              Nội dung
            </Label>
            <Textarea
              id="announcement-content"
              placeholder="Nhập nội dung thông báo..."
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              <AlertTriangle className="mr-1 inline h-3.5 w-3.5 text-amber-500" />
              Thông báo sẽ được gửi đến tất cả cửa hàng
            </p>
            <Button
              onClick={handleSend}
              disabled={isPending || !title.trim() || !content.trim()}
              className="bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/25 hover:from-rose-400 hover:to-pink-400"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Gửi thông báo
                </>
              )}
            </Button>
          </div>
          {sendSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400"
            >
              <CheckCircle2 className="h-4 w-4" />
              Thông báo đã được gửi thành công đến tất cả cửa hàng!
            </motion.div>
          )}
        </div>

        <Separator />

        {/* Recent Announcements */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-muted-foreground">
            Thông báo gần đây
          </h4>
          {isLoadingAnnouncements ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : (announcements ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Chưa có thông báo nào được gửi.
            </p>
          ) : (
            <div className="space-y-3">
              {(announcements ?? []).map((ann, i) => (
                <motion.div
                  key={ann.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="rounded-xl border bg-background p-4 transition-colors hover:bg-muted/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h5 className="font-semibold">{ann.title}</h5>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {ann.content}
                      </p>
                    </div>
                    {ann.createdBy && (
                      <Badge variant="secondary" className="shrink-0">
                        {ann.createdBy}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDate(ann.createdAt)}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page Component ────────────────────────────────────────────────────────────

export default function SystemPage() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* ── Header ── */}
      <motion.div variants={itemVariants}>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
          <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 p-2">
            <Settings className="h-5 w-5 text-white" />
          </div>
          Quản lý Hệ thống
        </h1>
        <p className="mt-1 text-muted-foreground">
          Cấu hình hệ thống, mẫu báo cáo và thông báo nền tảng.
        </p>
      </motion.div>

      {/* ── Tabs ── */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="config" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 max-w-lg">
            <TabsTrigger value="config" className="gap-1.5">
              <Settings className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Cấu hình</span>
            </TabsTrigger>
            <TabsTrigger value="announcements" className="gap-1.5">
              <Megaphone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Thông báo hệ thống</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config">
            <SystemConfigTab />
          </TabsContent>


          <TabsContent value="announcements">
            <AnnouncementTab />
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
