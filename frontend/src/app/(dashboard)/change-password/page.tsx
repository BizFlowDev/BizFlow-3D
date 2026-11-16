"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  User,
  ShieldAlert,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast, ToastViewport } from "@/components/ui/toast";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/auth-store";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { changePassword } = useAuth();
  const { toasts, showToast, dismiss } = useToast();

  // Form states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Visibility toggles
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Status states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Password strength calculation
  const hasMinLength = newPassword.length >= 6;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

  const passedChecks = [
    hasMinLength,
    hasUpper && hasLower,
    hasNumber || hasSpecial,
  ].filter(Boolean).length;

  const strengthLabel =
    newPassword.length === 0
      ? ""
      : passedChecks === 1
        ? "Yếu"
        : passedChecks === 2
          ? "Trung bình"
          : "Mạnh";

  const strengthColor =
    passedChecks === 1
      ? "bg-red-500"
      : passedChecks === 2
        ? "bg-amber-500"
        : "bg-emerald-500";

  const isMatching =
    confirmPassword.length > 0 && newPassword === confirmPassword;
  const isMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;

  const roleLabel =
    user?.role === "admin"
      ? "Quản trị viên"
      : user?.role === "owner"
        ? "Chủ cửa hàng"
        : "Nhân viên";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Client-side validations
    if (!currentPassword.trim()) {
      setErrorMessage("Vui lòng nhập mật khẩu hiện tại");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage("Mật khẩu mới phải có tối thiểu 6 ký tự");
      return;
    }
    if (newPassword === currentPassword) {
      setErrorMessage("Mật khẩu mới không được trùng với mật khẩu hiện tại");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("Mật khẩu xác nhận không khớp");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await changePassword(currentPassword, newPassword, confirmPassword);

      if (res?.success) {
        setSuccessMessage("Đổi mật khẩu thành công! Mật khẩu mới đã được áp dụng.");
        showToast("success", "Đổi mật khẩu thành công", "Mật khẩu mới đã được cập nhật cho tài khoản của bạn.");
        // Reset form
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const msg = res?.message || "Đổi mật khẩu thất bại. Vui lòng thử lại.";
        setErrorMessage(msg);
        showToast("error", "Đổi mật khẩu thất bại", msg);
      }
    } catch (err: any) {
      const serverMessage =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.[0]?.message ||
        err?.message ||
        "Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại.";
      setErrorMessage(serverMessage);
      showToast("error", "Lỗi đổi mật khẩu", serverMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Toast Notification Viewport */}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />

      {/* Breadcrumb / Top Bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Đổi Mật Khẩu</h1>
            <p className="text-sm text-muted-foreground">
              Cập nhật mật khẩu bảo vệ tài khoản cá nhân của bạn
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Left Column: Form change password (7 cols) */}
        <div className="md:col-span-7">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Thiết lập mật khẩu mới</CardTitle>
                  <CardDescription>
                    Nhập mật khẩu hiện tại và chọn mật khẩu mới có độ bảo mật cao
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {/* Success Banner */}
                {successMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm text-emerald-600 dark:text-emerald-400"
                  >
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <p className="font-medium">{successMessage}</p>
                  </motion.div>
                )}

                {/* Error Banner */}
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive"
                  >
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="font-medium">{errorMessage}</p>
                  </motion.div>
                )}

                {/* Field 1: Mật khẩu hiện tại */}
                <div className="space-y-1.5">
                  <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="pr-10"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showCurrent ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Separator />

                {/* Field 2: Mật khẩu mới */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="newPassword">Mật khẩu mới</Label>
                    {newPassword.length > 0 && (
                      <span className="text-xs font-medium text-muted-foreground">
                        Độ mạnh: <span className="font-semibold">{strengthLabel}</span>
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Ít nhất 6 ký tự"
                      autoComplete="new-password"
                      className="pr-10"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showNew ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* Password strength meter */}
                  {newPassword.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex h-1.5 w-full gap-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full transition-all duration-300 ${
                            passedChecks >= 1 ? strengthColor : "bg-transparent"
                          }`}
                          style={{ width: "33.33%" }}
                        />
                        <div
                          className={`h-full transition-all duration-300 ${
                            passedChecks >= 2 ? strengthColor : "bg-transparent"
                          }`}
                          style={{ width: "33.33%" }}
                        />
                        <div
                          className={`h-full transition-all duration-300 ${
                            passedChecks >= 3 ? strengthColor : "bg-transparent"
                          }`}
                          style={{ width: "33.34%" }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Field 3: Xác nhận mật khẩu mới */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
                    {isMatching && (
                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Khớp mật khẩu
                      </span>
                    )}
                    {isMismatch && (
                      <span className="flex items-center gap-1 text-xs font-medium text-destructive">
                        <AlertCircle className="h-3.5 w-3.5" /> Chưa khớp
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới"
                      autoComplete="new-password"
                      className="pr-10"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showConfirm ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(user?.role === "admin" ? "/admin/stores" : "/")}
                  disabled={isSubmitting}
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !currentPassword ||
                    newPassword.length < 6 ||
                    newPassword !== confirmPassword
                  }
                  className="gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang cập nhật...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Cập nhật mật khẩu
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* Right Column: Account Profile & Security Recommendations (5 cols) */}
        <div className="space-y-6 md:col-span-5">
          {/* User Profile Summary Card */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Tài khoản cá nhân</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                  {user?.fullName
                    ? user.fullName
                        .split(" ")
                        .filter(Boolean)
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    : "ND"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{user?.fullName || "Chưa cập nhật"}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <div className="space-y-2 rounded-lg bg-muted/50 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Vai trò hệ thống:</span>
                  <Badge variant="outline" className="font-medium">
                    {roleLabel}
                  </Badge>
                </div>
                {user?.storeName && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Cửa hàng:</span>
                    <span className="font-medium text-foreground truncate max-w-[150px]">
                      {user.storeName}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Security Recommendations Card */}
          <Card className="border-border/60 bg-muted/20 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="h-5 w-5" />
                <CardTitle className="text-base">Quy định bảo mật</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <CheckCircle2
                  className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                    hasMinLength ? "text-emerald-500" : "text-muted-foreground/40"
                  }`}
                />
                <span className={hasMinLength ? "text-foreground font-medium" : ""}>
                  Độ dài tối thiểu từ 6 ký tự trở lên
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2
                  className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                    hasUpper && hasLower ? "text-emerald-500" : "text-muted-foreground/40"
                  }`}
                />
                <span className={hasUpper && hasLower ? "text-foreground font-medium" : ""}>
                  Kết hợp cả chữ hoa (A-Z) và chữ thường (a-z)
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2
                  className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                    hasNumber || hasSpecial ? "text-emerald-500" : "text-muted-foreground/40"
                  }`}
                />
                <span className={hasNumber || hasSpecial ? "text-foreground font-medium" : ""}>
                  Khuyên dùng thêm chữ số (0-9) hoặc ký tự đặc biệt (!@#$)
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2
                  className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                    isMatching ? "text-emerald-500" : "text-muted-foreground/40"
                  }`}
                />
                <span className={isMatching ? "text-foreground font-medium" : ""}>
                  Mật khẩu mới và mật khẩu xác nhận phải trùng khớp
                </span>
              </div>

              <Separator className="my-2" />

              <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-2.5 text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
                <div className="flex items-center gap-1.5 font-semibold">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Lưu ý an toàn:
                </div>
                Tuyệt đối không chia sẻ mật khẩu của bạn cho người khác. Nếu phát hiện hoạt động bất thường, hãy đổi mật khẩu ngay lập tức.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
