"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  X,
  RefreshCw,
  ExternalLink,
  Loader2,
  AlertCircle,
  Link as LinkIcon,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { Textarea } from "./textarea";
import apiClient from "@/lib/api-client";
import type { ApiResponseData } from "@/lib/api-client";

interface UploadResponse {
  url: string;
  publicId: string;
}

export interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string) => void;
  onRemove?: () => void;
  disabled?: boolean;
  className?: string;
}

export function ImageUpload({
  value,
  onChange,
  onRemove,
  disabled = false,
  className = "",
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    // 1. Kiểm tra định dạng file
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setErrorMessage("Chỉ chấp nhận file ảnh định dạng JPEG, PNG, WEBP hoặc GIF");
      return;
    }

    // 2. Kiểm tra dung lượng (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrorMessage("Dung lượng ảnh tối đa 5MB");
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);

    // 3. Upload lên backend Cloudinary endpoint
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await apiClient.post<ApiResponseData<UploadResponse>>(
        "/upload/image",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      if (res.data?.data?.url) {
        onChange(res.data.data.url);
      } else {
        throw new Error("Không nhận được URL ảnh từ máy chủ");
      }
    } catch (err: unknown) {
      let msg = "Tải ảnh lên thất bại. Vui lòng thử lại.";
      if (
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data?.message
      ) {
        msg = (err as { response: { data: { message: string } } }).response.data.message;
      }
      setErrorMessage(msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled || isUploading) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isUploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFile(file);
    }
  };

  const handleApplyCustomUrl = () => {
    if (!customUrl.trim()) return;
    onChange(customUrl.trim());
    setCustomUrl("");
    setShowUrlInput(false);
    setErrorMessage(null);
  };

  const handleClear = () => {
    onChange("");
    onRemove?.();
    setErrorMessage(null);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Ẩn input file */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        disabled={disabled || isUploading}
        onChange={handleFileChange}
      />

      {/* Trạng thái 1: Đã có ảnh */}
      {value ? (
        <div className="relative group w-full min-w-0 overflow-hidden rounded-xl border border-border/80 bg-muted/20 p-3 transition-all">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 w-full min-w-0">
            {/* Ảnh thumbnail */}
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-background self-center sm:self-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt="Product thumbnail"
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-xs">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              )}
            </div>

            {/* Thông tin & nút thao tác */}
            <div className="flex-1 min-w-0 w-full space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">URL hình ảnh</p>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-medium">
                  Đã tải lên
                </span>
              </div>

              {/* Box URL tự động xuống dòng khi full chiều ngang, không kéo dài box */}
              <div className="w-full min-w-0 rounded-lg border border-border/60 bg-background/90 p-2 text-xs font-mono text-foreground/80 break-all select-all leading-relaxed max-h-24 overflow-y-auto">
                {value}
              </div>

              <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs gap-1.5"
                  disabled={disabled || isUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <RefreshCw className="h-3 w-3" />
                  Đổi ảnh
                </Button>
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-7 items-center justify-center rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Xem ảnh
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={disabled || isUploading}
                  onClick={handleClear}
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Xóa
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Trạng thái 2: Chưa có ảnh -> Khung Kéo Thả / Bấm tải lên */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (!disabled && !isUploading) {
              fileInputRef.current?.click();
            }
          }}
          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-3.5 sm:p-4 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? "border-blue-500 bg-blue-500/10 scale-[1.01]"
              : "border-border/70 hover:border-blue-400 hover:bg-muted/40"
          } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center space-y-2 py-2">
              <div className="rounded-full bg-blue-500/10 p-3 text-blue-500 animate-pulse">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
              <p className="text-sm font-medium text-foreground">
                Đang tải ảnh lên Cloudinary...
              </p>
              <p className="text-xs text-muted-foreground">Vui lòng chờ trong giây lát</p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <div className="rounded-full bg-blue-500/10 p-3 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                <UploadCloud className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Kéo thả ảnh vào đây hoặc{" "}
                  <span className="text-blue-600 dark:text-blue-400 underline underline-offset-2">
                    bấm để chọn
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Hỗ trợ JPG, PNG, WEBP, GIF (Tối đa 5MB)
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Thông báo lỗi nếu có */}
      {errorMessage && (
        <div className="flex items-center gap-2 text-xs text-red-500 bg-red-500/10 p-2.5 rounded-lg">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tùy chọn chuyển đổi: Nhập URL trực tiếp */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
        >
          <LinkIcon className="h-3 w-3" />
          {showUrlInput ? "Ẩn nhập liên kết URL" : "Hoặc dán liên kết ảnh trực tiếp"}
        </button>
      </div>

      {showUrlInput && (
        <div className="flex flex-col sm:flex-row gap-2 pt-1 w-full min-w-0 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="relative flex-1 min-w-0">
            <Textarea
              placeholder="Dán liên kết ảnh (https://res.cloudinary.com/...)"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              rows={2}
              className="min-h-[56px] w-full min-w-0 resize-none text-xs break-all font-mono py-2 px-3 rounded-lg leading-relaxed bg-background"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleApplyCustomUrl();
                }
              }}
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-auto py-2.5 text-xs px-3.5 shrink-0 self-end sm:self-stretch font-medium"
            onClick={handleApplyCustomUrl}
            disabled={!customUrl.trim()}
          >
            Áp dụng
          </Button>
        </div>
      )}
    </div>
  );
}
