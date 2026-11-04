import { OFFICE_DEVICE_PRESENTATION, type OfficeDevice } from "@/components/3d/world/officePresentation";

/** Frame the original device in the left portion, with a world-space display covering 55% on the right. */
export function getOfficeScreenLayout(viewportWidth: number, viewportHeight: number, device: OfficeDevice = "settings") {
  const mobile = viewportWidth < 640;
  const spec = OFFICE_DEVICE_PRESENTATION[device];
  const aspect = Math.max(1, viewportWidth) / Math.max(1, viewportHeight);
  const tangent = Math.tan(26 * Math.PI / 180);
  const viewAngle = 10 * Math.PI / 180; // 10 degrees down from the horizontal floor.
  const sin = Math.sin(viewAngle);
  const cos = Math.cos(viewAngle);
  const projectedHeight = spec.height * cos + spec.depth * sin;
  const distance = Math.max(spec.width / (2 * tangent * aspect * 0.28), projectedHeight / (2 * tangent * 0.72));
  const cameraX = spec.center[0] + (mobile ? 0 : 0.57 * distance * tangent * aspect);
  const cameraY = spec.center[1] + distance * sin;
  const cameraZ = spec.center[2] + distance * cos;
  // The panel has its own plane nearer the camera, so its size does not force zooming out of the device.
  const panelDistance = Math.min(distance * 0.7, 4);
  const widthFraction = mobile ? 0.88 : 0.55;
  const worldWidth = 2 * panelDistance * tangent * aspect * widthFraction;
  const worldHeight = 2 * panelDistance * tangent * 0.80;
  const width = mobile ? 600 : Math.max(760, Math.min(1100, viewportWidth * widthFraction));
  const height = width * worldHeight / worldWidth;
  const factor = 400 * worldWidth / width;
  const displayPosition: [number, number, number] = [cameraX + (mobile ? 0 : 0.41 * panelDistance * tangent * aspect), cameraY - panelDistance * sin, cameraZ - panelDistance * cos];
  const cameraPosition: [number, number, number] = [cameraX, cameraY, cameraZ];
  const cameraTarget: [number, number, number] = [cameraX, spec.center[1], spec.center[2]];
  return { width, height, factor, worldWidth, worldHeight, distance, viewAngle, displayPosition, cameraPosition, cameraTarget };
}
