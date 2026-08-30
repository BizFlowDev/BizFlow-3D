/**
 * VietQR Helper & Vietnam Banks Directory
 * Chuẩn Napas247 - Miễn phí 100% qua dịch vụ QuickLink của VietQR
 */

export interface VietnamBank {
  code: string;
  bin: string;
  shortName: string;
  name: string;
  logo?: string;
}

/**
 * Danh sách các ngân hàng thương mại phổ biến tại Việt Nam hỗ trợ chuẩn VietQR Napas247
 */
export const VIETNAM_BANKS: VietnamBank[] = [
  {
    code: "MB",
    bin: "970422",
    shortName: "MBBank",
    name: "Ngân hàng TMCP Quân Đội",
    logo: "https://api.vietqr.io/img/MB.png",
  },
  {
    code: "VCB",
    bin: "970436",
    shortName: "Vietcombank",
    name: "Ngân hàng TMCP Ngoại Thương Việt Nam",
    logo: "https://api.vietqr.io/img/VCB.png",
  },
  {
    code: "TCB",
    bin: "970407",
    shortName: "Techcombank",
    name: "Ngân hàng TMCP Kỹ Thương Việt Nam",
    logo: "https://api.vietqr.io/img/TCB.png",
  },
  {
    code: "ACB",
    bin: "970416",
    shortName: "ACB",
    name: "Ngân hàng TMCP Á Châu",
    logo: "https://api.vietqr.io/img/ACB.png",
  },
  {
    code: "VPB",
    bin: "970432",
    shortName: "VPBank",
    name: "Ngân hàng TMCP Việt Nam Thịnh Vượng",
    logo: "https://api.vietqr.io/img/VPB.png",
  },
  {
    code: "TPB",
    bin: "970423",
    shortName: "TPBank",
    name: "Ngân hàng TMCP Tiên Phong",
    logo: "https://api.vietqr.io/img/TPB.png",
  },
  {
    code: "BIDV",
    bin: "970418",
    shortName: "BIDV",
    name: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam",
    logo: "https://api.vietqr.io/img/BIDV.png",
  },
  {
    code: "ICB",
    bin: "970415",
    shortName: "VietinBank",
    name: "Ngân hàng TMCP Công Thương Việt Nam",
    logo: "https://api.vietqr.io/img/ICB.png",
  },
  {
    code: "STB",
    bin: "970403",
    shortName: "Sacombank",
    name: "Ngân hàng TMCP Sài Gòn Thương Tín",
    logo: "https://api.vietqr.io/img/STB.png",
  },
  {
    code: "OCB",
    bin: "970448",
    shortName: "OCB",
    name: "Ngân hàng TMCP Phương Đông",
    logo: "https://api.vietqr.io/img/OCB.png",
  },
  {
    code: "VIB",
    bin: "970441",
    shortName: "VIB",
    name: "Ngân hàng TMCP Quốc Tế Việt Nam",
    logo: "https://api.vietqr.io/img/VIB.png",
  },
  {
    code: "SHB",
    bin: "970443",
    shortName: "SHB",
    name: "Ngân hàng TMCP Sài Gòn - Hà Nội",
    logo: "https://api.vietqr.io/img/SHB.png",
  },
  {
    code: "HDB",
    bin: "970437",
    shortName: "HDBank",
    name: "Ngân hàng TMCP Phát triển TP.HCM",
    logo: "https://api.vietqr.io/img/HDB.png",
  },
  {
    code: "MSB",
    bin: "970426",
    shortName: "MSB",
    name: "Ngân hàng TMCP Hàng Hải Việt Nam",
    logo: "https://api.vietqr.io/img/MSB.png",
  },
  {
    code: "LPB",
    bin: "970449",
    shortName: "LPBank",
    name: "Ngân hàng TMCP Lộc Phát Việt Nam",
    logo: "https://api.vietqr.io/img/LPB.png",
  },
  {
    code: "SEAB",
    bin: "970440",
    shortName: "SeABank",
    name: "Ngân hàng TMCP Đông Nam Á",
    logo: "https://api.vietqr.io/img/SEAB.png",
  },
  {
    code: "ABB",
    bin: "970425",
    shortName: "ABBANK",
    name: "Ngân hàng TMCP An Bình",
    logo: "https://api.vietqr.io/img/ABB.png",
  },
  {
    code: "NAB",
    bin: "970428",
    shortName: "Nam A Bank",
    name: "Ngân hàng TMCP Nam Á",
    logo: "https://api.vietqr.io/img/NAB.png",
  },
  {
    code: "BAB",
    bin: "970409",
    shortName: "Bac A Bank",
    name: "Ngân hàng TMCP Bắc Á",
    logo: "https://api.vietqr.io/img/BAB.png",
  },
  {
    code: "CAKE",
    bin: "546034",
    shortName: "CAKE by VPBank",
    name: "Ngân hàng số CAKE by VPBank",
    logo: "https://api.vietqr.io/img/CAKE.png",
  },
  {
    code: "TIMO",
    bin: "963388",
    shortName: "Timo",
    name: "Ngân hàng số Timo by BanVietBank",
    logo: "https://api.vietqr.io/img/TIMO.png",
  },
];

export interface GenerateVietQROptions {
  bankCode: string;
  accountNumber: string;
  accountName?: string;
  amount?: number;
  memo?: string;
  /** Template giao diện QR của VietQR: 'compact2' (mặc định cho POS), 'compact', 'qr_only', 'print' */
  template?: "compact2" | "compact" | "qr_only" | "print";
}

/**
 * Tạo URL hình ảnh mã QR VietQR Napas247 động
 * Sử dụng dịch vụ QuickLink miễn phí từ VietQR API
 */
export function generateVietQRUrl({
  bankCode,
  accountNumber,
  accountName = "",
  amount = 0,
  memo = "",
  template = "compact2",
}: GenerateVietQROptions): string {
  if (!bankCode || !accountNumber) {
    return "";
  }

  const cleanBank = bankCode.trim().toUpperCase();
  const cleanAccNum = accountNumber.trim().replace(/\s+/g, "");
  const cleanAmount = Math.max(0, Math.round(amount));

  const params = new URLSearchParams();
  if (cleanAmount > 0) {
    params.set("amount", cleanAmount.toString());
  }
  if (memo && memo.trim()) {
    params.set("addInfo", memo.trim());
  }
  if (accountName && accountName.trim()) {
    params.set("accountName", accountName.trim());
  }

  const queryString = params.toString();
  return `https://img.vietqr.io/image/${cleanBank}-${cleanAccNum}-${template}.png${
    queryString ? `?${queryString}` : ""
  }`;
}

/**
 * Format nội dung chuyển khoản ngắn gọn, chuẩn hóa cho đơn hàng (VD: BF3D A1B2C3)
 */
export function formatPaymentMemo(orderCodeOrId: string, prefix = "BF3D"): string {
  if (!orderCodeOrId) return prefix;
  // Lấy tối đa 8 ký tự mã đơn không dấu/khoảng trắng
  const code = orderCodeOrId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();
  return `${prefix} ${code}`.trim();
}

/**
 * Tìm kiếm ngân hàng theo mã code hoặc bin
 */
export function getBankByCode(codeOrBin?: string | null): VietnamBank | undefined {
  if (!codeOrBin) return undefined;
  const search = codeOrBin.trim().toUpperCase();
  return VIETNAM_BANKS.find(
    (b) => b.code.toUpperCase() === search || b.bin === search,
  );
}

/**
 * Chuẩn hóa tên chủ tài khoản thành in hoa không dấu (VD: "nguyễn văn an" -> "NGUYEN VAN AN")
 */
export function sanitizeAccountHolder(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toUpperCase()
    .trim();
}
