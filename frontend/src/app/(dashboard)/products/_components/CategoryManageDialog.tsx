"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FolderTree,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
  Search,
  Tag,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast, ToastViewport } from "@/components/ui/toast";
import {
  useCategoryList,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "@/hooks/useProducts";
import type { ProductCategory } from "@/hooks/useProducts";

interface CategoryManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryManageDialog({
  open,
  onOpenChange,
}: CategoryManageDialogProps) {
  const { data: categories = [], isLoading } = useCategoryList();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const { toasts, showToast, dismiss } = useToast();

  // Create form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  // Delete state
  const [deletingCategory, setDeletingCategory] = useState<ProductCategory | null>(null);

  // Search filter
  const [search, setSearch] = useState("");

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      showToast("error", "Vui lòng nhập tên danh mục");
      return;
    }

    try {
      await createCategory.mutateAsync({
        name: trimmed,
        description: description.trim() || undefined,
      });
      showToast("success", "Tạo danh mục thành công!", `Danh mục "${trimmed}" đã được thêm.`);
      setName("");
      setDescription("");
      setShowAddForm(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Không thể tạo danh mục";
      showToast("error", "Lỗi tạo danh mục", msg);
    }
  };

  const startEdit = (cat: ProductCategory) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditDesc(cat.description || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditDesc("");
  };

  const handleSaveEdit = async (id: string) => {
    const trimmed = editName.trim();
    if (!trimmed) {
      showToast("error", "Tên danh mục không được để trống");
      return;
    }

    try {
      await updateCategory.mutateAsync({
        id,
        data: {
          name: trimmed,
          description: editDesc.trim() || undefined,
        },
      });
      showToast("success", "Cập nhật thành công!", `Danh mục đã được cập nhật.`);
      cancelEdit();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Không thể cập nhật danh mục";
      showToast("error", "Lỗi cập nhật", msg);
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    try {
      await deleteCategory.mutateAsync(deletingCategory.id);
      showToast("success", "Đã xóa danh mục", `Danh mục "${deletingCategory.name}" đã được gỡ bỏ.`);
      setDeletingCategory(null);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Không thể xóa danh mục";
      showToast("error", "Lỗi xóa danh mục", msg);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] flex flex-col p-6 rounded-2xl border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-xl">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                <FolderTree className="h-5 w-5" />
              </div>
              Quản lý danh mục sản phẩm
            </DialogTitle>
            <DialogDescription>
              Tổ chức, phân loại sản phẩm giúp tìm kiếm và quản lý kho hàng dễ dàng hơn.
            </DialogDescription>
          </DialogHeader>

          {/* ── Toolbar: Search & Toggle Add Form ── */}
          <div className="mt-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm danh mục..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              size="sm"
              variant={showAddForm ? "secondary" : "default"}
              className="gap-1.5 shrink-0"
            >
              {showAddForm ? (
                <>
                  <X className="h-4 w-4" /> Đóng form
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" /> Thêm danh mục
                </>
              )}
            </Button>
          </div>

          {/* ── Collapsible Add Category Form ── */}
          <AnimatePresence>
            {showAddForm && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleCreate}
                className="mt-3 overflow-hidden rounded-xl border border-blue-500/20 bg-blue-50/50 p-4 dark:bg-blue-950/20 space-y-3"
              >
                <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                  <Tag className="h-4 w-4" /> Tạo mới danh mục
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">
                      Tên danh mục <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="VD: Đồ uống, Bánh kẹo..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-9 bg-background"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Mô tả (tùy chọn)</Label>
                    <Input
                      placeholder="Mô tả ngắn..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="h-9 bg-background"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAddForm(false);
                      setName("");
                      setDescription("");
                    }}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={createCategory.isPending}
                    className="gap-1.5"
                  >
                    {createCategory.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Lưu danh mục
                  </Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* ── Categories List ── */}
          <div className="mt-4 flex-1 overflow-y-auto space-y-2 pr-1 max-h-[360px]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mb-2" />
                <span className="text-sm">Đang tải danh mục...</span>
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 rounded-xl border border-dashed border-border text-muted-foreground">
                <FolderTree className="h-10 w-10 stroke-1 mb-2 text-muted-foreground/50" />
                <p className="text-sm font-medium">
                  {search ? "Không tìm thấy danh mục phù hợp" : "Chưa có danh mục nào"}
                </p>
                {!search && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setShowAddForm(true)}
                    className="mt-1 text-xs text-blue-500"
                  >
                    + Tạo danh mục đầu tiên
                  </Button>
                )}
              </div>
            ) : (
              filteredCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border border-border/60 hover:border-border transition-all bg-card/50 hover:bg-card/90"
                >
                  {editingId === cat.id ? (
                    // Inline Edit Mode
                    <div className="flex-1 flex flex-col sm:flex-row gap-2 items-center w-full">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Tên danh mục"
                        className="h-8 text-sm flex-1"
                        autoFocus
                      />
                      <Input
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="Mô tả"
                        className="h-8 text-sm flex-1"
                      />
                      <div className="flex items-center gap-1 self-end sm:self-auto">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          onClick={() => handleSaveEdit(cat.id)}
                          disabled={updateCategory.isPending}
                        >
                          {updateCategory.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:bg-muted"
                          onClick={cancelEdit}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Display Mode
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">
                            {cat.name}
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-[10px] h-4 px-1.5 font-normal bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none"
                          >
                            Hoạt động
                          </Badge>
                        </div>
                        {cat.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {cat.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 self-end sm:self-auto opacity-80 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => startEdit(cat)}
                          title="Chỉnh sửa"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={() => setDeletingCategory(cat)}
                          title="Xóa danh mục"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          <DialogFooter className="mt-4 pt-3 border-t border-border/50">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog
        open={!!deletingCategory}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
      >
        <DialogContent className="sm:max-w-[420px] rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Xác nhận xóa danh mục
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm">
              Bạn có chắc chắn muốn xóa danh mục{" "}
              <strong className="text-foreground">{deletingCategory?.name}</strong>?
              <br />
              <span className="text-xs text-muted-foreground block mt-2">
                * Các sản phẩm thuộc danh mục này sẽ được chuyển thành "Không có danh mục". Dữ liệu sản phẩm không bị xóa.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setDeletingCategory(null)}
              disabled={deleteCategory.isPending}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteCategory.isPending}
              className="gap-1.5"
            >
              {deleteCategory.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Xóa danh mục
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
