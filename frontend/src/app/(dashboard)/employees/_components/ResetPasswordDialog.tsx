"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "motion/react";
import {
  Lock,
  Loader2,
  CheckCircle2,
  KeyRound,
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
import { useResetPassword } from "@/hooks/useEmployees";
import type { Employee } from "@/hooks/useEmployees";

// ── Zod Schema ────────────────────────────────────────────────────────────────

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
      .max(128, "Mật khẩu không quá 128 ký tự"),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

// ── Props ─────────────────────────────────────────────────────────────────────

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ResetPasswordDialog({
  open,
  onOpenChange,
  employee,
}: ResetPasswordDialogProps) {
  const resetMutation = useResetPassword();
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      reset({ newPassword: "", confirmPassword: "" });
      setShowSuccess(false);
    }
  }, [open, reset]);

  const isLoading = resetMutation.isPending;

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!employee) return;
    try {
      await resetMutation.mutateAsync({
        employeeId: employee.id,
        newPassword: data.newPassword,
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
      <DialogContent className="sm:max-w-[440px] overflow-hidden rounded-2xl border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl">
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
                Đặt lại mật khẩu thành công!
              </motion.p>
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
                  <KeyRound className="h-5 w-5 text-amber-500" />
                  Đặt lại mật khẩu
                </DialogTitle>
                <DialogDescription>
                  Đặt mật khẩu mới cho nhân viên{" "}
                  <span className="font-medium text-foreground">
                    {employee?.fullName}
                  </span>
                  .
                </DialogDescription>
              </DialogHeader>

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="mt-6 space-y-5"
              >
                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-sm font-medium">
                    Mật khẩu mới <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Tối thiểu 6 ký tự"
                      className="pl-9"
                      {...register("newPassword")}
                      aria-invalid={errors.newPassword ? "true" : "false"}
                    />
                  </div>
                  {errors.newPassword && (
                    <p className="text-xs text-red-500" role="alert">
                      {errors.newPassword.message}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label
                    htmlFor="confirm-password"
                    className="text-sm font-medium"
                  >
                    Xác nhận mật khẩu <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Nhập lại mật khẩu mới"
                      className="pl-9"
                      {...register("confirmPassword")}
                      aria-invalid={errors.confirmPassword ? "true" : "false"}
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-red-500" role="alert">
                      {errors.confirmPassword.message}
                    </p>
                  )}
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
                    className="relative overflow-hidden bg-gradient-to-r from-amber-600 to-amber-500 font-semibold text-white shadow-lg shadow-amber-500/25 transition-all hover:from-amber-500 hover:to-amber-400 hover:shadow-amber-500/40"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      "Đặt lại mật khẩu"
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
