"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "motion/react";
import {
  User,
  Mail,
  Phone,
  Lock,
  Loader2,
  CheckCircle2,
  UserPlus,
  Send,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useCreateEmployee } from "@/hooks/useEmployees";

// ── Zod Schema ────────────────────────────────────────────────────────────────

const employeeSchema = z.object({
  fullName: z
    .string()
    .min(1, "Họ tên không được để trống")
    .max(255, "Họ tên không được vượt quá 255 ký tự"),
  email: z
    .string()
    .min(1, "Email không được để trống")
    .email("Email không đúng định dạng"),
  phone: z
    .string()
    .regex(
      /^(03|05|07|08|09)\d{8}$/,
      "Số điện thoại không hợp lệ (VD: 0901234567)"
    )
    .or(z.literal(""))
    .optional(),
  password: z
    .string()
    .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
    .max(128, "Mật khẩu không quá 128 ký tự"),
  sendEmail: z.boolean().optional(),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

// ── Props ─────────────────────────────────────────────────────────────────────

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EmployeeFormDialog({
  open,
  onOpenChange,
}: EmployeeFormDialogProps) {
  const createMutation = useCreateEmployee();
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      sendEmail: false,
    },
  });

  const sendEmail = watch("sendEmail");

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      reset({ fullName: "", email: "", phone: "", password: "", sendEmail: false });
      setShowSuccess(false);
    }
  }, [open, reset]);

  const isLoading = createMutation.isPending;

  const onSubmit = async (data: EmployeeFormValues) => {
    try {
      await createMutation.mutateAsync({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone || undefined,
        password: data.password,
        sendEmail: data.sendEmail,
      });
      setShowSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setShowSuccess(false);
      }, 1200);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] overflow-hidden rounded-2xl border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl">
        <AnimatePresence mode="wait">
          {showSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center justify-center py-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                <CheckCircle2 className="h-16 w-16 text-emerald-500" />
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-4 text-lg font-semibold"
              >
                Tạo nhân viên thành công!
              </motion.p>
              {sendEmail && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="mt-1 text-sm text-muted-foreground"
                >
                  Email thông báo đã được gửi đi.
                </motion.p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <UserPlus className="h-5 w-5 text-blue-500" />
                  Thêm nhân viên
                </DialogTitle>
                <DialogDescription>
                  Tạo tài khoản nhân viên mới cho cửa hàng.
                </DialogDescription>
              </DialogHeader>

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="mt-6 space-y-5"
              >
                {/* Two-column grid for name + email */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <Label htmlFor="emp-fullname" className="text-sm font-medium">
                      Họ tên <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="emp-fullname"
                        placeholder="Nguyễn Văn A"
                        className="pl-9"
                        {...register("fullName")}
                        aria-invalid={errors.fullName ? "true" : "false"}
                      />
                    </div>
                    {errors.fullName && (
                      <p className="text-xs text-red-500" role="alert">
                        {errors.fullName.message}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="emp-email" className="text-sm font-medium">
                      Email <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="emp-email"
                        type="email"
                        placeholder="nhanvien@bizflow.com"
                        className="pl-9"
                        {...register("email")}
                        aria-invalid={errors.email ? "true" : "false"}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-xs text-red-500" role="alert">
                        {errors.email.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Two-column grid for phone + password */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="emp-phone" className="text-sm font-medium">
                      Số điện thoại
                    </Label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="emp-phone"
                        placeholder="0901234567"
                        className="pl-9"
                        {...register("phone")}
                        aria-invalid={errors.phone ? "true" : "false"}
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-xs text-red-500" role="alert">
                        {errors.phone.message}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="emp-password" className="text-sm font-medium">
                      Mật khẩu <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="emp-password"
                        type="password"
                        placeholder="Tối thiểu 6 ký tự"
                        className="pl-9"
                        {...register("password")}
                        aria-invalid={errors.password ? "true" : "false"}
                      />
                    </div>
                    {errors.password && (
                      <p className="text-xs text-red-500" role="alert">
                        {errors.password.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Role badge (fixed employee) */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Vai trò</Label>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400">
                      Nhân viên
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Vai trò được gán tự động
                    </span>
                  </div>
                </div>

                {/* Send email checkbox */}
                <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/30 p-3">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={sendEmail}
                    onClick={() => setValue("sendEmail", !sendEmail)}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                      sendEmail
                        ? "border-blue-500 bg-blue-500 text-white"
                        : "border-muted-foreground/30 bg-background"
                    }`}
                  >
                    {sendEmail && (
                      <motion.svg
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={3}
                        className="h-3 w-3"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </motion.svg>
                    )}
                  </button>
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        Gửi email thông báo tạo tài khoản
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Nhân viên sẽ nhận email chứa thông tin đăng nhập
                      </p>
                    </div>
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isLoading}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-500 font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-500 hover:to-blue-400 hover:shadow-blue-500/40"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang tạo...
                      </>
                    ) : (
                      "Tạo nhân viên"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
