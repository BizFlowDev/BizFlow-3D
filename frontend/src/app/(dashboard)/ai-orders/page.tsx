"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Bot,
  Check,
  ChevronRight,
  FileText,
  Loader2,
  Mic,
  MicOff,
  Pencil,
  Send,
  ShoppingCart,
  User,
  Volume2,
  X,
  Wifi,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast, ToastViewport } from "@/components/ui/toast";
import {
  useProcessNaturalLanguage,
  useProcessVoice,
  useConfirmDraftOrder,
  useRejectDraftOrder,
  type DraftOrder,
  type DraftOrderStatus,
} from "@/hooks/useAiOrder";
import { useSocket, type SocketStatus } from "@/hooks/useSocket";

// ── Types ─────────────────────────────────────────────────────────────────────

type MessageRole = "user" | "ai";
type MessageInputType = "text" | "voice";

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  inputType: MessageInputType;
  timestamp: Date;
  draftOrder?: DraftOrder;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  SocketStatus,
  { label: string; dotClass: string; icon: typeof Wifi }
> = {
  connecting: {
    label: "Đang kết nối...",
    dotClass: "bg-amber-500 animate-pulse",
    icon: Wifi,
  },
  connected: {
    label: "Đã kết nối",
    dotClass: "bg-emerald-500",
    icon: Wifi,
  },
  disconnected: {
    label: "Mất kết nối",
    dotClass: "bg-red-500",
    icon: WifiOff,
  },
};

const DRAFT_STATUS_CONFIG: Record<
  DraftOrderStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Chờ duyệt",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400",
  },
  confirmed: {
    label: "Đã xác nhận",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  rejected: {
    label: "Đã từ chối",
    className:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400",
  },
};

// ── Animation variants ────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.08 },
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

const messageVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 25 },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
} as const;

// ── Page Component ────────────────────────────────────────────────────────────

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "ai",
  content:
    'Xin chào! Tôi là AI Order Assistant 🤖\n\nBạn có thể tạo đơn hàng bằng cách nhập văn bản hoặc nói bằng giọng nói.\n\nVí dụ: "Bán cho anh An 3 áo thun cotton và 2 chai kem chống nắng"',
  inputType: "text",
  timestamp: new Date(),
};

export default function AiOrdersPage() {
  const router = useRouter();
  const { toasts, showToast, dismiss } = useToast();

  // ── State ──
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // ── Refs ──
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Hooks ──
  const { status: socketStatus, on, off } = useSocket();
  const nlMutation = useProcessNaturalLanguage();
  const voiceMutation = useProcessVoice();
  const confirmMutation = useConfirmDraftOrder();
  const rejectMutation = useRejectDraftOrder();

  const isProcessing = nlMutation.isPending || voiceMutation.isPending;

  // ── Auto-scroll ──
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ── Socket: lắng nghe new_draft_order ──
  useEffect(() => {
    const handleNewDraft = (data: DraftOrder) => {
      showToast("info", "Đơn nháp mới", `Đơn nháp #${data.id.slice(-3)} vừa được tạo`);

      const aiMsg: ChatMessage = {
        id: generateId(),
        role: "ai",
        content: "Có đơn nháp mới vừa được tạo từ hệ thống:",
        inputType: "text",
        timestamp: new Date(),
        draftOrder: data,
      };
      setMessages((prev) => [...prev, aiMsg]);
    };

    on("new_draft_order", handleNewDraft);
    return () => {
      off("new_draft_order", handleNewDraft as (...args: unknown[]) => void);
    };
  }, [on, off, showToast]);

  // ── Send text message ──
  const handleSendText = useCallback(() => {
    const text = inputValue.trim();
    if (!text || isProcessing) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      role: "user",
      content: text,
      inputType: "text",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");

    nlMutation.mutate(text, {
      onSuccess: (result) => {
        const aiMsg: ChatMessage = {
          id: generateId(),
          role: "ai",
          content: result.message,
          inputType: "text",
          timestamp: new Date(),
          draftOrder: result.draftOrder,
        };
        setMessages((prev) => [...prev, aiMsg]);
      },
      onError: () => {
        const aiMsg: ChatMessage = {
          id: generateId(),
          role: "ai",
          content: "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.",
          inputType: "text",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      },
    });
  }, [inputValue, isProcessing, nlMutation]);

  // ── Voice recording ──
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      audioChunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        stream.getTracks().forEach((track) => track.stop());
        handleSendVoice(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      // Timer for recording duration
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch {
      showToast(
        "error",
        "Không thể truy cập microphone",
        "Vui lòng cho phép truy cập microphone trong trình duyệt.",
      );
    }
  }, [showToast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  }, [isRecording]);

  const handleSendVoice = useCallback(
    (audioBlob: Blob) => {
      const userMsg: ChatMessage = {
        id: generateId(),
        role: "user",
        content: "🎤 Tin nhắn thoại",
        inputType: "voice",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      voiceMutation.mutate(audioBlob, {
        onSuccess: (result) => {
          // Update user message with transcription
          setMessages((prev) =>
            prev.map((m) =>
              m.id === userMsg.id
                ? { ...m, content: `🎤 "${result.transcription}"` }
                : m,
            ),
          );

          const aiMsg: ChatMessage = {
            id: generateId(),
            role: "ai",
            content: result.message,
            inputType: "text",
            timestamp: new Date(),
            draftOrder: result.draftOrder,
          };
          setMessages((prev) => [...prev, aiMsg]);
        },
        onError: () => {
          const aiMsg: ChatMessage = {
            id: generateId(),
            role: "ai",
            content: "Xin lỗi, không thể xử lý tin nhắn thoại. Vui lòng thử lại.",
            inputType: "text",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMsg]);
        },
      });
    },
    [voiceMutation],
  );

  // ── Draft order actions ──
  const handleConfirmDraft = useCallback(
    (draftId: string) => {
      confirmMutation.mutate(draftId, {
        onSuccess: () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.draftOrder?.id === draftId
                ? {
                    ...m,
                    draftOrder: { ...m.draftOrder!, status: "confirmed" as const },
                  }
                : m,
            ),
          );
          showToast("success", "Đã xác nhận", "Đơn nháp đã được chuyển thành đơn chính thức.");
        },
        onError: () => {
          showToast("error", "Lỗi", "Không thể xác nhận đơn nháp.");
        },
      });
    },
    [confirmMutation, showToast],
  );

  const handleRejectDraft = useCallback(
    (draftId: string) => {
      rejectMutation.mutate(draftId, {
        onSuccess: () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.draftOrder?.id === draftId
                ? {
                    ...m,
                    draftOrder: { ...m.draftOrder!, status: "rejected" as const },
                  }
                : m,
            ),
          );
          showToast("info", "Đã từ chối", "Đơn nháp đã bị từ chối.");
        },
        onError: () => {
          showToast("error", "Lỗi", "Không thể từ chối đơn nháp.");
        },
      });
    },
    [rejectMutation, showToast],
  );

  // ── Keyboard handlers ──
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendText();
      }
    },
    [handleSendText],
  );

  // ── Cleanup recording on unmount ──
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const statusConfig = STATUS_CONFIG[socketStatus];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="mx-auto flex h-[calc(100vh-7rem)] max-w-4xl flex-col"
    >
      {/* ── Header ── */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between rounded-t-2xl border border-b-0 bg-card/50 px-4 py-3 backdrop-blur-sm sm:px-6"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 shadow-lg shadow-violet-500/25">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              AI Order Assistant
            </h1>
            <div className="flex items-center gap-1.5">
              <span
                className={cn("h-2 w-2 rounded-full", statusConfig.dotClass)}
              />
              <span className="text-xs text-muted-foreground">
                {statusConfig.label}
              </span>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/ai-orders/draft")}
          className="gap-1.5 font-semibold"
        >
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Đơn nháp</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </motion.div>

      {/* ── Messages Area ── */}
      <motion.div
        variants={itemVariants}
        className="flex-1 overflow-y-auto border-x bg-gradient-to-b from-background to-muted/20 px-4 py-4 sm:px-6"
      >
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                variants={messageVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                layout
                className={cn(
                  "flex gap-2.5",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row",
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    msg.role === "user"
                      ? "bg-gradient-to-br from-blue-600 to-cyan-500"
                      : "bg-gradient-to-br from-violet-600 to-purple-600",
                  )}
                >
                  {msg.role === "user" ? (
                    <User className="h-4 w-4 text-white" />
                  ) : (
                    <Bot className="h-4 w-4 text-white" />
                  )}
                </div>

                {/* Message content */}
                <div
                  className={cn(
                    "max-w-[75%] space-y-2",
                    msg.role === "user" ? "items-end" : "items-start",
                  )}
                >
                  {/* Bubble */}
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                      msg.role === "user"
                        ? "rounded-tr-md bg-gradient-to-r from-blue-600 to-blue-500 text-white"
                        : "rounded-tl-md border bg-card/80 text-foreground backdrop-blur-sm",
                    )}
                  >
                    {msg.inputType === "voice" && msg.role === "user" && (
                      <div className="mb-1 flex items-center gap-1">
                        <Volume2 className="h-3 w-3" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                          Voice
                        </span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>

                  {/* Draft Order Card */}
                  {msg.draftOrder && (
                    <DraftOrderCard
                      draft={msg.draftOrder}
                      onConfirm={() => handleConfirmDraft(msg.draftOrder!.id)}
                      onReject={() => handleRejectDraft(msg.draftOrder!.id)}
                      onEdit={() => router.push("/orders/new")}
                      isConfirming={confirmMutation.isPending}
                      isRejecting={rejectMutation.isPending}
                    />
                  )}

                  {/* Timestamp */}
                  <p
                    className={cn(
                      "text-[10px] text-muted-foreground/60",
                      msg.role === "user" ? "text-right" : "text-left",
                    )}
                  >
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2.5"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-purple-600">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="rounded-2xl rounded-tl-md border bg-card/80 px-4 py-3 shadow-sm backdrop-blur-sm">
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </motion.div>

      {/* ── Input Area ── */}
      <motion.div
        variants={itemVariants}
        className="rounded-b-2xl border bg-card/50 px-4 py-3 backdrop-blur-sm sm:px-6"
      >
        {/* Recording indicator */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 dark:border-red-900 dark:bg-red-950/30"
            >
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                </span>
                <span className="text-sm font-medium text-red-700 dark:text-red-400">
                  Đang ghi âm...
                </span>
                <span className="font-mono text-sm text-red-500 tabular-nums">
                  {Math.floor(recordingDuration / 60)
                    .toString()
                    .padStart(2, "0")}
                  :{(recordingDuration % 60).toString().padStart(2, "0")}
                </span>
              </div>
              {/* Fake waveform */}
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 12 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 rounded-full bg-red-400"
                    animate={{
                      height: [4, 8 + Math.random() * 14, 4],
                    }}
                    transition={{
                      duration: 0.5 + Math.random() * 0.5,
                      repeat: Infinity,
                      delay: i * 0.05,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input row */}
        <div className="flex items-center gap-2">
          {/* Voice button */}
          <Button
            variant={isRecording ? "destructive" : "outline"}
            size="icon"
            className={cn(
              "h-10 w-10 shrink-0 rounded-full transition-all",
              isRecording
                ? "animate-pulse bg-red-500 shadow-lg shadow-red-500/25 hover:bg-red-600"
                : "hover:bg-violet-50 hover:text-violet-600 hover:border-violet-300 dark:hover:bg-violet-950/40",
            )}
            onMouseDown={(e) => {
              e.preventDefault();
              if (!isRecording) startRecording();
            }}
            onMouseUp={(e) => {
              e.preventDefault();
              if (isRecording) stopRecording();
            }}
            onMouseLeave={() => {
              if (isRecording) stopRecording();
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              if (!isRecording) startRecording();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              if (isRecording) stopRecording();
            }}
            disabled={isProcessing}
            aria-label={isRecording ? "Dừng ghi âm" : "Nhấn giữ để nói"}
            title="Nhấn giữ để nói"
          >
            {isRecording ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>

          {/* Text input */}
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isRecording
                  ? "Đang ghi âm..."
                  : 'Nhập yêu cầu, ví dụ: "Bán 3 áo thun cotton"...'
              }
              disabled={isRecording || isProcessing}
              className="pr-10"
              aria-label="Nhập tin nhắn"
              id="ai-chat-input"
            />
          </div>

          {/* Send button */}
          <Button
            onClick={handleSendText}
            disabled={!inputValue.trim() || isProcessing || isRecording}
            size="icon"
            className={cn(
              "h-10 w-10 shrink-0 rounded-full transition-all",
              inputValue.trim()
                ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 active:scale-95"
                : "bg-muted text-muted-foreground",
            )}
            aria-label="Gửi tin nhắn"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Hint */}
        <p className="mt-2 text-center text-[11px] text-muted-foreground/50">
          Nhấn Enter để gửi · Nhấn giữ 🎤 để nói · AI sẽ tạo đơn nháp từ yêu cầu
        </p>
      </motion.div>

      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </motion.div>
  );
}

// ── Draft Order Card Component ────────────────────────────────────────────────

function DraftOrderCard({
  draft,
  onConfirm,
  onReject,
  onEdit,
  isConfirming,
  isRejecting,
}: {
  draft: DraftOrder;
  onConfirm: () => void;
  onReject: () => void;
  onEdit: () => void;
  isConfirming: boolean;
  isRejecting: boolean;
}) {
  const statusCfg = DRAFT_STATUS_CONFIG[draft.status];
  const isPending = draft.status === "pending";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full overflow-hidden rounded-xl border-2 border-amber-200/60 bg-gradient-to-br from-amber-50/80 via-orange-50/40 to-yellow-50/60 shadow-md dark:border-amber-800/40 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-yellow-950/20"
    >
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-amber-200/50 bg-amber-100/40 px-4 py-2.5 dark:border-amber-800/30 dark:bg-amber-950/30">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span className="text-sm font-bold text-amber-800 dark:text-amber-300">
            Đơn nháp
          </span>
          <span className="font-mono text-xs text-amber-600/70 dark:text-amber-400/70">
            #{draft.id.slice(-3)}
          </span>
        </div>
        <Badge
          variant="secondary"
          className={cn("text-[10px]", statusCfg.className)}
        >
          {statusCfg.label}
        </Badge>
      </div>

      {/* Items list */}
      <div className="space-y-1 px-4 py-3">
        {draft.items.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="shrink-0 text-xs text-amber-500">{idx + 1}.</span>
              <span className="truncate font-medium text-foreground">
                {item.productName}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                x{item.quantity}
              </span>
            </div>
            <span className="shrink-0 font-semibold tabular-nums text-foreground">
              {formatCurrency(item.totalPrice)}
            </span>
          </div>
        ))}
      </div>

      {/* Footer: total + customer + actions */}
      <div className="space-y-2.5 border-t border-amber-200/50 bg-amber-50/40 px-4 py-3 dark:border-amber-800/30 dark:bg-amber-950/20">
        {draft.customerName && (
          <p className="text-xs text-muted-foreground">
            Khách hàng:{" "}
            <span className="font-semibold text-foreground">
              {draft.customerName}
            </span>
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">
            Tổng cộng
          </span>
          <span className="text-lg font-bold tabular-nums text-blue-600 dark:text-blue-400">
            {formatCurrency(draft.totalAmount)}
          </span>
        </div>

        {/* Action buttons */}
        {isPending && (
          <div className="flex items-center gap-2">
            <Button
              onClick={onConfirm}
              disabled={isConfirming || isRejecting}
              size="sm"
              className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 text-xs font-semibold text-white shadow-sm shadow-emerald-500/25 hover:from-emerald-500 hover:to-emerald-400"
            >
              {isConfirming ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Xác nhận
            </Button>
            <Button
              onClick={onEdit}
              variant="outline"
              size="sm"
              className="flex-1 text-xs font-semibold"
            >
              <Pencil className="h-3.5 w-3.5" />
              Chỉnh sửa
            </Button>
            <Button
              onClick={onReject}
              disabled={isConfirming || isRejecting}
              variant="outline"
              size="sm"
              className="flex-1 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              {isRejecting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
              Từ chối
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
