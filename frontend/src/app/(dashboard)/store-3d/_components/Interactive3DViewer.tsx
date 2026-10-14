"use client";

import { useRef, useState, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, Sparkles, ContactShadows, useTexture } from "@react-three/drei";
import * as THREE from "three";
import {
  RotateCcw,
  Maximize2,
  Eye,
  Box,
  Layers,
  Sparkles as SparklesIcon,
} from "lucide-react";

interface Interactive3DViewerProps {
  productName: string;
  categoryName?: string | null;
  code?: string;
  imageUrl?: string | null;
  accentColor?: string;
}

/**
 * TextureMeshBox — Hộp bao bì sản phẩm 3D dán hình ảnh sản phẩm (nếu có)
 */
function TextureMeshBox({
  imageUrl,
  productName,
  accentColor = "#6366f1",
  isWireframe = false,
}: {
  imageUrl?: string | null;
  productName: string;
  accentColor?: string;
  isWireframe?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Tạo canvas texture ảo hiển thị tên và mã sản phẩm sắc nét
  const labelTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Nền gradient tối công nghệ
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, "#0f172a");
    grad.addColorStop(1, "#1e1b4b");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Viền neon
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 12;
    ctx.strokeRect(16, 16, 480, 480);

    // Header BizFlow 3D
    ctx.fillStyle = accentColor;
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("BIZFLOW 3D PREMIUM", 256, 80);

    // Dải trang trí
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(40, 105, 432, 4);

    // Tên sản phẩm
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 34px sans-serif";
    // Giới hạn độ dài tên
    const truncatedName =
      productName.length > 20 ? productName.substring(0, 18) + "..." : productName;
    ctx.fillText(truncatedName, 256, 260);

    // Badge xác thực
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(256, 340, 36, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px sans-serif";
    ctx.fillText("✓", 256, 348);

    // Footer
    ctx.fillStyle = "#94a3b8";
    ctx.font = "18px sans-serif";
    ctx.fillText("OFFICIAL VERIFIED PRODUCT", 256, 440);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [productName, accentColor]);

  // Nếu có imageUrl thì thử load, nếu không dùng labelTexture
  return (
    <group>
      {/* Khối hộp bao bì sản phẩm bo cạnh */}
      <mesh ref={meshRef} castShadow receiveShadow>
        <boxGeometry args={[1.35, 1.55, 0.85]} />
        <meshStandardMaterial
          map={labelTexture || undefined}
          color={isWireframe ? accentColor : "#f8fafc"}
          roughness={0.25}
          metalness={0.15}
          wireframe={isWireframe}
        />
      </mesh>

      {/* Viền LED phát sáng quanh các cạnh hộp */}
      {!isWireframe && (
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(1.36, 1.56, 0.86)]} />
          <lineBasicMaterial color={accentColor} transparent opacity={0.6} />
        </lineSegments>
      )}
    </group>
  );
}

/**
 * BeverageCan3D — Lon nước ngọt / Đồ uống 3D bằng kim loại mạ bóng
 */
function BeverageCan3D({
  productName,
  accentColor = "#0284c7",
  isWireframe = false,
}: {
  productName: string;
  accentColor?: string;
  isWireframe?: boolean;
}) {
  return (
    <group>
      {/* Thân lon kim loại */}
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 1.6, 32]} />
        <meshStandardMaterial
          color={isWireframe ? accentColor : accentColor}
          metalness={0.8}
          roughness={0.2}
          wireframe={isWireframe}
        />
      </mesh>
      {/* Vành nắp nhôm trên */}
      <mesh position={[0, 0.82, 0]}>
        <cylinderGeometry args={[0.5, 0.55, 0.06, 32]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Đáy lon */}
      <mesh position={[0, -0.82, 0]}>
        <cylinderGeometry args={[0.55, 0.5, 0.06, 32]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
}

/**
 * WarehouseBox3D — Kiện hàng thùng carton chuẩn kho dán băng keo
 */
function WarehouseBox3D({
  productName,
  code,
  isWireframe = false,
}: {
  productName: string;
  code?: string;
  isWireframe?: boolean;
}) {
  return (
    <group>
      {/* Thùng carton kraft */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.35, 1.25, 1.35]} />
        <meshStandardMaterial
          color={isWireframe ? "#f59e0b" : "#b47846"}
          roughness={0.7}
          metalness={0.05}
          wireframe={isWireframe}
        />
      </mesh>
      {/* Băng dính niêm phong dán nắp */}
      {!isWireframe && (
        <mesh position={[0, 0.63, 0]}>
          <boxGeometry args={[0.25, 0.01, 1.36]} />
          <meshStandardMaterial color="#78350f" roughness={0.4} />
        </mesh>
      )}
      {/* Tem nhãn barcode vận chuyển */}
      {!isWireframe && (
        <mesh position={[0.35, 0.1, 0.68]}>
          <planeGeometry args={[0.42, 0.32]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} />
        </mesh>
      )}
    </group>
  );
}

/**
 * TurntablePedestal — Bệ xoay studio công nghệ có đèn LED
 */
function TurntablePedestal({ accentColor = "#38bdf8" }: { accentColor?: string }) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ringRef.current) {
      ringRef.current.rotation.y = clock.getElapsedTime() * 0.3;
    }
  });

  return (
    <group position={[0, -1.05, 0]}>
      {/* Đế tròn chính kim loại xám titan */}
      <mesh receiveShadow position={[0, -0.05, 0]}>
        <cylinderGeometry args={[1.4, 1.5, 0.1, 36]} />
        <meshStandardMaterial color="#0f172a" metalness={0.85} roughness={0.25} />
      </mesh>

      {/* Vành LED neon phát sáng bao quanh bệ xoay */}
      <mesh position={[0, 0.01, 0]}>
        <torusGeometry args={[1.41, 0.025, 12, 36]} />
        <meshStandardMaterial
          color={accentColor}
          emissive={accentColor}
          emissiveIntensity={1.5}
        />
      </mesh>

      {/* Vòng chia độ xoay kỹ thuật (dial ticks) */}
      <mesh ref={ringRef} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.15, 1.35, 24]} />
        <meshBasicMaterial color={accentColor} wireframe transparent opacity={0.35} />
      </mesh>

      {/* Đổ bóng mềm xuống mặt sàn bệ */}
      <ContactShadows
        position={[0, -0.02, 0]}
        opacity={0.65}
        scale={3.2}
        blur={1.8}
        far={2.5}
        color="#000000"
      />
    </group>
  );
}

/**
 * Component chính: Khung xem sản phẩm 3D tương tác 360 độ
 */
export function Interactive3DViewer({
  productName,
  categoryName,
  code,
  imageUrl,
  accentColor = "#6366f1",
}: Interactive3DViewerProps) {
  const [autoRotate, setAutoRotate] = useState(true);
  const [isWireframe, setIsWireframe] = useState(false);
  const controlsRef = useRef<any>(null);

  // Xác định loại mô hình dựa theo danh mục hoặc tên
  const modelKind = useMemo(() => {
    const text = (categoryName || "" + productName).toLowerCase();
    if (text.includes("uống") || text.includes("nước") || text.includes("drink") || text.includes("beverage")) {
      return "can";
    }
    if (text.includes("kho") || text.includes("thùng") || text.includes("pallet") || text.includes("wh-")) {
      return "warehouse_box";
    }
    return "box";
  }, [categoryName, productName]);

  // Các nút chuyển góc nhìn nhanh
  const handleSetPresetView = (preset: "front" | "side" | "top" | "iso") => {
    if (!controlsRef.current) return;
    setAutoRotate(false);
    switch (preset) {
      case "front":
        controlsRef.current.object.position.set(0, 0.2, 2.8);
        controlsRef.current.target.set(0, 0, 0);
        break;
      case "side":
        controlsRef.current.object.position.set(2.8, 0.2, 0);
        controlsRef.current.target.set(0, 0, 0);
        break;
      case "top":
        controlsRef.current.object.position.set(0, 3.2, 0.1);
        controlsRef.current.target.set(0, 0, 0);
        break;
      case "iso":
      default:
        controlsRef.current.object.position.set(2.2, 1.6, 2.2);
        controlsRef.current.target.set(0, 0, 0);
        break;
    }
    controlsRef.current.update();
  };

  return (
    <div className="relative w-full h-72 sm:h-80 rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-b from-slate-950 via-slate-900 to-[#070b14] shadow-inner select-none">
      {/* ── 3D CANVAS CHÍNH ───────────────────────────────────────── */}
      <Canvas
        camera={{ position: [2.2, 1.4, 2.2], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        shadows
      >
        {/* Ánh sáng Studio 3 điểm */}
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[4, 5, 4]}
          intensity={1.4}
          castShadow
          shadow-mapSize={[512, 512]}
          color="#ffffff"
        />
        {/* Rim light sau lưng tạo viền sáng màu accent */}
        <pointLight
          position={[-3, 2, -3]}
          intensity={1.6}
          distance={8}
          color={accentColor}
        />
        {/* Bounce light từ dưới lên */}
        <pointLight
          position={[0, -1.5, 2]}
          intensity={0.8}
          distance={5}
          color="#38bdf8"
        />

        {/* Bệ xoay studio chân đế */}
        <TurntablePedestal accentColor={accentColor} />

        {/* Mô hình 3D lơ lửng nhẹ */}
        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
          <Suspense fallback={null}>
            {modelKind === "can" ? (
              <BeverageCan3D
                productName={productName}
                accentColor={accentColor}
                isWireframe={isWireframe}
              />
            ) : modelKind === "warehouse_box" ? (
              <WarehouseBox3D
                productName={productName}
                code={code}
                isWireframe={isWireframe}
              />
            ) : (
              <TextureMeshBox
                imageUrl={imageUrl}
                productName={productName}
                accentColor={accentColor}
                isWireframe={isWireframe}
              />
            )}
          </Suspense>
        </Float>

        {/* Hạt bụi sáng xung quanh */}
        <Sparkles
          count={25}
          scale={3.5}
          size={2.2}
          speed={0.5}
          color={accentColor}
          opacity={0.4}
        />

        {/* Bộ điều khiển xoay 360 độ */}
        <OrbitControls
          ref={controlsRef}
          autoRotate={autoRotate}
          autoRotateSpeed={2.4}
          enableZoom={true}
          minDistance={1.6}
          maxDistance={5.0}
          minPolarAngle={Math.PI * 0.15}
          maxPolarAngle={Math.PI * 0.55}
          enablePan={false}
        />
      </Canvas>

      {/* ── THANH CÔNG CỤ ĐIỀU KHIỂN GÓC NHÌN & TƯƠNG TÁC 3D ──────── */}
      <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-950/80 px-2 py-1 backdrop-blur-md text-[11px] text-slate-300">
        <SparklesIcon className="h-3.5 w-3.5 text-amber-400" />
        <span className="font-semibold text-white">Chế Độ 3D 360°</span>
      </div>

      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1">
        {/* Nút bật/tắt xoay tự động */}
        <button
          type="button"
          onClick={() => setAutoRotate((prev) => !prev)}
          className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold backdrop-blur-md transition-all ${
            autoRotate
              ? "border-sky-400/50 bg-sky-500/20 text-sky-200 shadow-sm shadow-sky-500/30"
              : "border-white/10 bg-slate-900/80 text-slate-400 hover:text-white"
          }`}
          title="Bật/Tắt tự động xoay 360 độ"
        >
          <RotateCcw className={`h-3 w-3 ${autoRotate ? "animate-spin [animation-duration:6s]" : ""}`} />
          <span>{autoRotate ? "Xoay" : "Dừng"}</span>
        </button>

        {/* Nút Wireframe lưới Sci-Fi */}
        <button
          type="button"
          onClick={() => setIsWireframe((prev) => !prev)}
          className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold backdrop-blur-md transition-all ${
            isWireframe
              ? "border-indigo-400/50 bg-indigo-500/20 text-indigo-200"
              : "border-white/10 bg-slate-900/80 text-slate-400 hover:text-white"
          }`}
          title="Chế độ lưới kỹ thuật số Wireframe"
        >
          <Layers className="h-3 w-3" />
          <span>Lưới</span>
        </button>
      </div>

      {/* ── CÁC PHÍM TẮT GÓC NHÌN ĐÁY CANVAS ───────────────────────── */}
      <div className="absolute bottom-2.5 inset-x-2.5 z-10 flex items-center justify-between">
        <div className="flex items-center gap-1 bg-slate-950/80 border border-white/10 rounded-xl p-0.5 backdrop-blur-md">
          <button
            type="button"
            onClick={() => handleSetPresetView("iso")}
            className="rounded-lg px-2 py-0.5 text-[10px] font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-all"
          >
            Góc 3D
          </button>
          <button
            type="button"
            onClick={() => handleSetPresetView("front")}
            className="rounded-lg px-2 py-0.5 text-[10px] font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-all"
          >
            Mặt Trước
          </button>
          <button
            type="button"
            onClick={() => handleSetPresetView("side")}
            className="rounded-lg px-2 py-0.5 text-[10px] font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-all"
          >
            Mặt Bên
          </button>
          <button
            type="button"
            onClick={() => handleSetPresetView("top")}
            className="rounded-lg px-2 py-0.5 text-[10px] font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-all"
          >
            Từ Trên
          </button>
        </div>

        <span className="hidden sm:inline text-[10px] text-slate-400 font-medium px-2 py-0.5 rounded-lg bg-black/40 backdrop-blur-sm border border-white/5">
          🖐️ Kéo để xoay &bull; Cuộn để phóng to
        </span>
      </div>
    </div>
  );
}
