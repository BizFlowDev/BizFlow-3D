"use client";

import { useState, useEffect } from "react";
import {
  X,
  Tag,
  Plus,
  Pencil,
  Trash2,
  Check,
  Loader2,
  Search,
  Sparkles,
  Eye,
  Layers,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useSpatialModalClose } from "./useSpatialModalClose";
import { Modal3DCard } from "./Modal3DCard";
import {
  useCategoryList,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  type ProductCategory,
} from "@/hooks/useProducts";
import { useInventoryCatalog } from "@/hooks/useInventory";
import { useQueryClient } from "@tanstack/react-query";

interface CategoryManageModal3DProps {
  isOpen: boolean;
  onClose: () => void;
  highlightCategoryId?: string | null;
  onHighlightCategory?: (categoryId: string | null) => void;
}

export function CategoryManageModal3D({
  isOpen,
  onClose: requestClose,
  highlightCategoryId,
  onHighlightCategory,
}: CategoryManageModal3DProps) {
  const { close: onClose, closing } = useSpatialModalClose(isOpen, requestClose);
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading } = useCategoryList();
  const { data: catalog = [] } = useInventoryCatalog();

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  // Create form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  // Edit form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  // Search & Status message
  const [search, setSearch] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredCategories = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(search.toLowerCase())),
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;

    try {
      await createCategory.mutateAsync({
        name: trimmed,
        description: newDesc.trim() || undefined,
      });
      setNewName("");
      setNewDesc("");
      setShowAddForm(false);
      setStatusMsg(`Đã tạo danh mục mới "${trimmed}"`);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setTimeout(() => setStatusMsg(null), 2500);
    } catch {
      // error handled by hook
    }
  };

  const startEdit = (cat: ProductCategory) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditDesc(cat.description || "");
  };

  const handleSaveEdit = async (id: string) => {
    const trimmed = editName.trim();
    if (!trimmed) return;

    try {
      await updateCategory.mutateAsync({
        id,
        data: {
          name: trimmed,
          description: editDesc.trim() || undefined,
        },
      });
      setEditingId(null);
      setStatusMsg(`Đã cập nhật danh mục "${trimmed}"`);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setTimeout(() => setStatusMsg(null), 2500);
    } catch {
      // error handled by hook
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteCategory.mutateAsync(id);
      if (highlightCategoryId === id && onHighlightCategory) {
        onHighlightCategory(null);
      }
      setDeletingId(null);
      setStatusMsg(`Đã xóa danh mục "${name}"`);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setTimeout(() => setStatusMsg(null), 2500);
    } catch {
      // error handled by hook
    }
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center sm:justify-end sm:pr-10 md:pr-14 p-4 overflow-hidden animate-in fade-in duration-300">
      <div
        className="pointer-events-auto fixed inset-0 -z-10 bg-transparent"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="pointer-events-auto w-full max-w-lg">
        <Modal3DCard closing={closing}
          className="w-full my-auto border-indigo-400/40 shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(129,140,248,0.22)]"
          accentGlowColor="rgba(129, 140, 248, 0.45)"
          isFloating={true}
          showTechCorners={true}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between border-b border-indigo-400/20 bg-slate-950/85 px-5 py-3 text-[11px]"
            style={{ transform: "translateZ(30px)" }}
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-400" />
              </span>
              <div className="flex flex-col">
                <span className="font-extrabold tracking-wider uppercase text-indigo-400 text-[11px]">
                  BẢNG QUẢN LÝ DANH MỤC KHO 3D
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Trạm Bảng Treo Tường LED &bull; Phân Bổ Kệ Kho
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-all active:scale-90"
              title="Đóng bảng danh mục"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div
            className="p-5 sm:p-6 space-y-4 max-h-[78vh] overflow-y-auto"
            style={{ transform: "translateZ(20px)" }}
          >
            {/* Status Feedback Banner */}
            {statusMsg && (
              <div className="flex items-center gap-2 rounded-xl border border-indigo-400/30 bg-indigo-950/50 px-3.5 py-2 text-xs text-indigo-200 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" />
                <span>{statusMsg}</span>
              </div>
            )}

            {/* Thanh Tìm Kiếm & Nút Thêm Mới */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm kiếm danh mục..."
                  className="w-full rounded-xl border border-white/10 bg-slate-900/80 pl-9 pr-3 py-2 text-xs text-white focus:border-indigo-400 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                  showAddForm
                    ? "bg-slate-800 text-slate-300 border border-white/10"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30"
                }`}
              >
                {showAddForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                <span>{showAddForm ? "Hủy" : "Thêm mới"}</span>
              </button>
            </div>

            {/* Khối Form Thêm Mới Danh Mục */}
            {showAddForm && (
              <form
                onSubmit={handleCreate}
                className="rounded-2xl border border-indigo-400/30 bg-slate-900/90 p-3.5 space-y-2.5 animate-in fade-in zoom-in-95"
              >
                <div className="text-[11px] font-bold text-indigo-300 uppercase tracking-wide">
                  Tạo phân loại danh mục mới
                </div>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Tên danh mục (VD: Thiết Bị Điện Tử, Phụ Kiện...)"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-400 focus:outline-none"
                  autoFocus
                />
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Mô tả khu vực hoặc nhóm mặt hàng (tùy chọn)"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-slate-300 focus:border-indigo-400 focus:outline-none"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="rounded-xl px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={createCategory.isPending || !newName.trim()}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-xs font-bold text-white shadow-md disabled:opacity-50"
                  >
                    {createCategory.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    <span>Xác Nhận Tạo</span>
                  </button>
                </div>
              </form>
            )}

            {/* Danh Sách Danh Mục */}
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {filteredCategories.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Không tìm thấy danh mục nào phù hợp
                </div>
              ) : (
                filteredCategories.map((cat) => {
                  const productCount = catalog.filter((p) => p.categoryId === cat.id).length;
                  const isHighlighted = highlightCategoryId === cat.id;

                  if (editingId === cat.id) {
                    return (
                      <div
                        key={cat.id}
                        className="rounded-2xl border border-indigo-400/40 bg-slate-900/90 p-3 space-y-2"
                      >
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded-lg border border-white/10 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:border-indigo-400 focus:outline-none"
                          autoFocus
                        />
                        <input
                          type="text"
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          placeholder="Mô tả..."
                          className="w-full rounded-lg border border-white/10 bg-slate-950 px-2.5 py-1 text-xs text-slate-300 focus:border-indigo-400 focus:outline-none"
                        />
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="text-xs text-slate-400 hover:text-white px-2 py-1"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(cat.id)}
                            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white"
                          >
                            <Check className="h-3 w-3" />
                            <span>Lưu</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={cat.id}
                      className={`group flex items-center justify-between rounded-2xl border p-3 transition-all ${
                        isHighlighted
                          ? "border-indigo-400 bg-indigo-950/60 shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-400/40"
                          : "border-white/10 bg-slate-900/60 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                            isHighlighted
                              ? "bg-indigo-500 text-white"
                              : "bg-indigo-500/15 text-indigo-300 group-hover:bg-indigo-500/25"
                          }`}
                        >
                          <Tag className="h-4 w-4" />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{cat.name}</span>
                            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300 border border-white/5">
                              {productCount} SP
                            </span>
                          </div>
                          {cat.description && (
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              {cat.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Nút hành động */}
                      <div className="flex items-center gap-1.5">
                        {/* Nút Highlight trên Kệ Kho 3D */}
                        {onHighlightCategory && (
                          <button
                            type="button"
                            onClick={() => onHighlightCategory(isHighlighted ? null : cat.id)}
                            title={isHighlighted ? "Tắt làm nổi bật 3D" : "Làm nổi bật các kiện hàng thuộc danh mục này trên Kệ 3D"}
                            className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-semibold transition-all ${
                              isHighlighted
                                ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/30"
                                : "text-slate-400 hover:text-indigo-300 hover:bg-white/5"
                            }`}
                          >
                            <Sparkles className="h-3 w-3" />
                            <span className="hidden sm:inline">
                              {isHighlighted ? "Đang sáng" : "Soi Kệ 3D"}
                            </span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => startEdit(cat)}
                          title="Sửa tên danh mục"
                          className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>

                        {deletingId === cat.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDelete(cat.id, cat.name)}
                              className="rounded-lg bg-red-600 px-2 py-1 text-[10px] font-bold text-white shadow-sm"
                            >
                              Xóa
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingId(null)}
                              className="rounded-lg p-1 text-slate-400 hover:text-white"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeletingId(cat.id)}
                            title="Xóa danh mục"
                            className="rounded-lg p-1.5 text-slate-400 hover:text-red-400 hover:bg-white/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Modal3DCard>
      </div>
    </div>
  );
}
