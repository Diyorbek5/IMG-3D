import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import { EffectComposer, N8AO, SMAA, ToneMapping, Bloom } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { cameraConfig } from '../config/cameraConfig';
import { useStore } from '../state/store';
import { AnimationController } from './AnimationController';
import { CameraController } from './CameraController';
import { Lighting } from './Lighting';
import { FactoryBuilding } from './building/FactoryBuilding';
import { AuxBuildings, FinishedGoodsWarehouse, RawMaterialWarehouse } from './building/Warehouse';
import { ProductionLine } from './equipment/ProductionLine';
import { ExternalModels } from './ExternalModels';
import { Dimensions, FlowArrows, ScaleGrid, SelectedTag, SelectionHighlight, ZoneLabels } from './overlays/Overlays';
import { LabelDeclutter } from './overlays/labelManager';
import { Landscape } from './site/Landscape';
import { RoadNetwork } from './site/RoadNetwork';
import { SiteGround } from './site/SiteGround';
import { Vehicles } from './vehicles/Vehicles';

const DPR = { high: [1, 2], medium: [1, 1.5], low: [0.75, 1.1] } as const;

/** Postprotsessing: faqat "Yuqori" sifatda — ambient occlusion, antialiasing va tone mapping */
function Effects() {
  const quality = useStore((s) => s.quality);
  const lighting = useStore((s) => s.lighting);
  if (quality !== 'high') return null;
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <N8AO aoRadius={2.2} intensity={2.4} distanceFalloff={1.2} halfRes quality="medium" />
      <Bloom intensity={lighting === 'night' ? 0.9 : 0.15} luminanceThreshold={lighting === 'night' ? 0.6 : 0.95} mipmapBlur />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <SMAA />
    </EffectComposer>
  );
}

/** Butun 3D sahna */
function SceneContent() {
  return (
    <>
      <Lighting />
      <AnimationController />
      <CameraController />
      <SiteGround />
      <RoadNetwork />
      <Landscape />
      <FactoryBuilding />
      <RawMaterialWarehouse />
      <FinishedGoodsWarehouse />
      <AuxBuildings />
      <ProductionLine />
      <Vehicles />
      <Suspense fallback={null}>
        <ExternalModels />
      </Suspense>
      <Dimensions />
      <ZoneLabels />
      <FlowArrows />
      <ScaleGrid />
      <SelectionHighlight />
      <SelectedTag />
      <LabelDeclutter />
      <Effects />
    </>
  );
}

export function FactoryScene() {
  const quality = useStore((s) => s.quality);
  const setQuality = useStore((s) => s.setQuality);
  const select = useStore((s) => s.select);
  const setReady = useStore((s) => s.setReady);
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={DPR[quality] as unknown as [number, number]}
      camera={{ fov: cameraConfig.fov, near: 0.5, far: 6000, position: cameraConfig.presets.reset.position }}
      gl={{ antialias: quality !== 'high', powerPreference: 'high-performance', preserveDrawingBuffer: false, stencil: false }}
      onCreated={({ gl, scene }) => {
        if (new URLSearchParams(window.location.search).has('debug')) Object.assign(window, { __three: { gl, scene } });
        gl.localClippingEnabled = true;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.outputColorSpace = THREE.SRGBColorSpace;
        requestAnimationFrame(() => setReady(true));
      }}
      onPointerMissed={(e) => {
        if (e.type === 'click') select(null);
      }}
    >
      <PerformanceMonitor
        flipflops={2}
        onDecline={() => {
          const q = useStore.getState().quality;
          if (q === 'high') setQuality('medium');
        }}
      >
        <AdaptiveDpr pixelated={false} />
        <SceneContent />
      </PerformanceMonitor>
    </Canvas>
  );
}
