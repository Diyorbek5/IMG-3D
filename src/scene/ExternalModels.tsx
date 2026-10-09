import { Component, Suspense, useMemo, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { externalModels } from '../config/externalModels';

/**
 * Blender va boshqa dasturlarda tayyorlangan GLB/GLTF modellarni sahnaga qo‘shish.
 * Ro‘yxat: src/config/externalModels.ts. Fayllar public/models/ papkasida bo‘lishi kerak.
 */
export function ExternalModels() {
  if (externalModels.length === 0) return null;
  return (
    <group name="ExternalModels">
      {externalModels.map((m) => (
        <Boundary key={m.url}>
          <Suspense fallback={null}>
            <Model {...m} />
          </Suspense>
        </Boundary>
      ))}
    </group>
  );
}

function Model({ url, position, rotationY = 0, scale = 1 }: (typeof externalModels)[number]) {
  const gltf = useGLTF(url, false);
  const obj = useMemo(() => {
    const o = gltf.scene.clone(true);
    o.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) {
        c.castShadow = true;
        c.receiveShadow = true;
      }
    });
    return o;
  }, [gltf]);
  return <primitive object={obj} position={position} rotation={[0, rotationY, 0]} scale={scale} />;
}

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn('Tashqi model yuklanmadi:', err);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
