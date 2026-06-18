"use client";

import { useEffect, useRef } from "react";
import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  TorusGeometry,
  WebGLRenderer
} from "three";

export function ReportOrbitScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;

    if (!mount) return;

    const container = mount;
    const scene = new Scene();
    const camera = new PerspectiveCamera(38, 1, 0.1, 100);
    const renderer = new WebGLRenderer({ alpha: true, antialias: true });
    const startedAt = performance.now();
    const group = new Group();
    const accentMaterial = new MeshStandardMaterial({
      color: new Color("#2f6bff"),
      emissive: new Color("#0b2d8f"),
      emissiveIntensity: 0.46,
      metalness: 0.42,
      roughness: 0.28
    });
    const redMaterial = new MeshStandardMaterial({
      color: new Color("#ff3158"),
      emissive: new Color("#7a071d"),
      emissiveIntensity: 0.55,
      metalness: 0.34,
      roughness: 0.32
    });
    const glassMaterial = new MeshStandardMaterial({
      color: new Color("#d7e6ff"),
      emissive: new Color("#163b8f"),
      emissiveIntensity: 0.16,
      metalness: 0.12,
      opacity: 0.34,
      roughness: 0.12,
      transparent: true
    });
    const bars = [1.2, 1.78, 1.04, 2.32, 1.46, 2.06, 1.3].map(
      (height, index) => {
        const material = index % 3 === 0 ? redMaterial : accentMaterial;
        const mesh = new Mesh(new BoxGeometry(0.22, height, 0.22), material);
        mesh.position.set((index - 3) * 0.38, -0.9 + height / 2, 0.52);
        mesh.rotation.y = -0.28;
        return mesh;
      }
    );
    const core = new Mesh(new SphereGeometry(0.72, 48, 48), accentMaterial);
    const innerRing = new Mesh(new TorusGeometry(1.35, 0.018, 16, 96), redMaterial);
    const outerRing = new Mesh(new TorusGeometry(2.08, 0.014, 16, 128), glassMaterial);
    const satellite = new Mesh(new SphereGeometry(0.12, 24, 24), redMaterial);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    camera.position.set(0, 0.55, 6.2);
    innerRing.rotation.x = 1.18;
    innerRing.rotation.y = -0.34;
    outerRing.rotation.x = 1.1;
    outerRing.rotation.y = 0.46;
    satellite.position.set(1.7, 0.8, 0.5);
    group.position.set(0.08, 0.08, 0);
    group.add(core, innerRing, outerRing, satellite, ...bars);
    scene.add(group);
    scene.add(new AmbientLight(0xffffff, 1.7));

    const keyLight = new DirectionalLight(0xffffff, 3.1);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);

    function resize() {
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    }

    function animate() {
      const elapsed = (performance.now() - startedAt) / 1000;
      group.rotation.y = elapsed * 0.34;
      group.rotation.x = Math.sin(elapsed * 0.52) * 0.08;
      innerRing.rotation.z = elapsed * 0.42;
      outerRing.rotation.z = -elapsed * 0.24;
      satellite.position.x = Math.cos(elapsed * 0.9) * 1.8;
      satellite.position.z = Math.sin(elapsed * 0.9) * 1.2;
      satellite.position.y = 0.72 + Math.sin(elapsed * 1.4) * 0.28;
      renderer.render(scene, camera);
    }

    renderer.setAnimationLoop(animate);
    container.appendChild(renderer.domElement);
    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    return () => {
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      renderer.dispose();
      for (const mesh of [core, innerRing, outerRing, satellite, ...bars]) {
        mesh.geometry.dispose();
      }
      accentMaterial.dispose();
      redMaterial.dispose();
      glassMaterial.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div aria-hidden="true" className="three-scene" ref={mountRef} />;
}
