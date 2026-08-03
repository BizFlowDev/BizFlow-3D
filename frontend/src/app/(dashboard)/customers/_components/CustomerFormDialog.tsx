"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "motion/react";
import {
  User,
  Phone,
  Mail,
  MapPin,
  StickyNote,
  Loader2,
  CheckCircle2,
  UserPlus,
  Pencil,
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
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateCustomer,
  useUpdateCustomer,
} from "@/hooks/useCustomers";
import type { Customer } from "@/hooks/useCustomers";

// ── Zod Schema ────────────────────────────────────────────────────────────────

const customerSchema = z.object({
  name: z
    .string()
    .min(1, "Tên khách hàng không được để trống")
    .max(255, "Tên không được vượt quá 255 ký tự"),
  phone: z
    .string()
    .min(1, "Số điện thoại không được để trống")
    .regex(
      /^(03|05|07|08|09)\d{8}$/,
      "Số điện thoại không hợp lệ (VD: 0901234567)"
    ),
  email: z
    .string()
    .email("Email không đúng định dạng")
    .or(z.literal(""))
    .optional(),
  address: z.string().max(500, "Địa chỉ không quá 500 ký tự").optional(),
  note: z.string().max(1000, "Ghi chú không quá 1000 ký tự").optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

// ── Props ─────────────────────────────────────────────────────────────────────

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null; // null = create mode, Customer = edit mode
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
}: CustomerFormDialogProps) {
  const isEdit = !!customer;
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      note: "",
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (customer && open) {
      reset({
        name: customer.name,
        phone: customer.phone || "",
        email: customer.email || "",
        address: customer.address || "",
        note: customer.note || "",
      });
    } else if (!open) {
      reset({ name: "", phone: "", email: "", address: "", note: "" });
      setShowSuccess(false);
    }
  }, [customer, open, reset]);

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (data: CustomerFormValues) => {
    try {
      if (isEdit && customer) {
        await updateMutation.mutateAsync({ id: customer.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
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
                {isEdit
                  ? "Cập nhật thành công!"
                  : "Tạo khách hàng thành công!"}
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
                  {isEdit ? (
                    <>
                      <Pencil className="h-5 w-5 text-blue-500" />
                      Chỉnh sửa khách hàng
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-5 w-5 text-blue-500" />
                      Thêm khách hàng
                    </>
                  )}
                </DialogTitle>
                <DialogDescription>
                  {isEdit
                    ? "Cập nhật thông tin khách hàng."
                    : "Tạo hồ sơ khách hàng mới."}
                </DialogDescription>
              </DialogHeader>

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="mt-6 space-y-5"
              >
                {/* Two-column grid for name + phone */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="customer-name" className="text-sm font-medium">
                      Tên khách hàng <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="customer-name"
                        placeholder="Nguyễn Văn A"
                        className="pl-9"
                        {...register("name")}
                        aria-invalid={errors.name ? "true" : "false"}
                      />
                    </div>
                    {errors.name && (
                      <p className="text-xs text-red-500" role="alert">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="customer-phone" className="text-sm font-medium">
                      Số điện thoại <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="customer-phone"
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
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="customer-email" className="text-sm font-medium">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="customer-email"
                      type="email"
                      placeholder="email@example.com"
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

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="customer-address" className="text-sm font-medium">
                    Địa chỉ
                  </Label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="customer-address"
                      placeholder="123 Nguyễn Huệ, Q.1, TP.HCM"
                      className="pl-9"
                      {...register("address")}
                    />
                  </div>
                </div>

                {/* Note */}
                <div className="space-y-2">
                  <Label htmlFor="customer-note" className="text-sm font-medium">
                    Ghi chú
                  </Label>
                  <div className="relative">
                    <StickyNote className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Textarea
                      id="customer-note"
                      placeholder="Ghi chú về khách hàng..."
                      className="min-h-[80px] pl-9 resize-none"
                      {...register("note")}
                    />
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
                        Đang lưu...
                      </>
                    ) : isEdit ? (
                      "Cập nhật"
                    ) : (
                      "Lưu khách hàng"
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
