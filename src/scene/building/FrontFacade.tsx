import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { factoryConfig } from '../../config/factoryConfig';
import { HALF_W } from '../../lib/layout';
import { logoTexture } from '../../three/textures';
import { getMaterials } from '../../three/materials';

/** Logotip tekisligi: rasmiy fayl berilsa uni nisbatini saqlab qo‘yadi, aks holda qayta chizilgan variant. */
export function LogoPlane({ position, height, rotationY = 0, dark = false }: { position: [number, number, number]; height: number; rotationY?: number; dark?: boolean }) {
  const url = factoryConfig.brand.logoUrl;
  if (url) {
    return (
      <Suspense fallback={null}>
        <LogoFromFile url={url} position={position} height={height} rotationY={rotationY} />
      </Suspense>
    );
  }
  const tex = logoTexture(dark);
  const aspect = 1024 / 400;
  return (
    <mesh position={position} rotation={[0, rotationY, 0]}>
      <planeGeometry args={[height * aspect, height]} />
      <meshStandardMaterial map={tex} transparent roughness={0.4} metalness={0.2} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.15} polygonOffset polygonOffsetFactor={-2} />
    </mesh>
  );
}

function LogoFromFile({ url, position, height, rotationY }: { url: string; position: [number, number, number]; height: number; rotationY: number }) {
  const tex = useLoader(THREE.TextureLoader, url);
  tex.colorSpace = THREE.SRGBColorSpace;
  const img = tex.image as { width: number; height: number } | undefined;
  const aspect = img ? img.width / img.height : 2.5;
  return (
    <mesh position={position} rotation={[0, rotationY, 0]}>
      <planeGeometry args={[height * aspect, height]} />
      <meshStandardMaterial map={tex} transparent roughness={0.4} polygonOffset polygonOffsetFactor={-2} />
    </mesh>
  );
}

/**
 * Old fasadning brending elementlari: shisha vitrajga osilgan to‘q rangli panel, iMG logotipi va yorug‘lik chizig‘i.
 * Panel darvozalar ustida, fasad markaziga yaqin joylashadi.
 */
export function FrontFacade() {
  const front = factoryConfig.building.segments[0];
  const doors = factoryConfig.rollerDoors.centersX;
  // darvozalar o‘rtasi (showroomdan uzoqroq tomonda)
  const cx0 = (Math.min(...doors) + Math.max(...doors)) / 2;
  const panelX0 = cx0 - 5.1;
  const panelX1 = cx0 + 5.1;
  const cx = cx0;
  void HALF_W;
  const y0 = factoryConfig.rollerDoors.height + 2.5;
  const y1 = front.height - 1.0;
  const h = y1 - y0;
  const mats = getMaterials();
  const panelGeo = useMemo(() => new THREE.BoxGeometry(Math.abs(panelX1 - panelX0), h, 0.12), [panelX0, panelX1, h]);
  return (
    <group>
      <mesh geometry={panelGeo} material={mats.claddingDark} position={[cx, y0 + h / 2, -0.2]} castShadow receiveShadow />
      <LogoPlane position={[cx, y0 + h / 2, -0.27]} height={h * 0.78} rotationY={Math.PI} />
      {/* panel ostidagi LED chiziq */}
      <mesh position={[cx, y0 + 0.06, -0.29]} material={mats.lampWarm}>
        <boxGeometry args={[Math.abs(panelX1 - panelX0) - 0.4, 0.06, 0.04]} />
      </mesh>
    </group>
  );
}
