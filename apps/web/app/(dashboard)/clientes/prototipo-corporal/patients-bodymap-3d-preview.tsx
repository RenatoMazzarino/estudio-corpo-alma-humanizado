"use client";
/* eslint-disable react/no-unknown-property -- react-three-fiber usa props JSX do Three.js, como position, rotation, args e roughness. */

import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import type { BodyView, RegionKey } from "./bodymap-shared";

function Segment({
  active,
  color,
  children,
  onClick,
  position,
  rotation,
}: {
  active?: boolean;
  color: string;
  children: React.ReactNode;
  onClick?: () => void;
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <mesh
      position={position}
      rotation={rotation}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "default";
      }}
    >
      {children}
      <meshStandardMaterial
        color={active ? color : "#A7AFA9"}
        roughness={0.32}
        metalness={0.08}
      />
    </mesh>
  );
}

function HumanModel({
  selectedKeys,
  onToggleAction,
}: {
  selectedKeys: RegionKey[];
  onToggleAction: (key: RegionKey) => void;
}) {
  const selected = new Set(selectedKeys);

  return (
    <group position={[0, -0.4, 0]}>
      <Segment color="#D5A06D" active={selected.has("cervical")} onClick={() => onToggleAction("cervical")} position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.34, 32, 32]} />
      </Segment>

      <Segment color="#D5A06D" active={selected.has("cervical")} onClick={() => onToggleAction("cervical")} position={[0, 1.22, 0]}>
        <capsuleGeometry args={[0.11, 0.3, 8, 16]} />
      </Segment>

      <Segment color="#8BA09A" position={[0, 0.45, 0]}>
        <capsuleGeometry args={[0.58, 1.2, 8, 24]} />
      </Segment>

      <Segment color="#8BA09A" position={[0, -0.78, 0]}>
        <capsuleGeometry args={[0.44, 0.48, 8, 20]} />
      </Segment>

      <Segment
        color="#C8866D"
        active={selected.has("torax")}
        onClick={() => onToggleAction("torax")}
        position={[0, 0.62, 0.34]}
      >
        <boxGeometry args={[0.92, 0.62, 0.08]} />
      </Segment>

      <Segment
        color="#C8866D"
        active={selected.has("abdomen")}
        onClick={() => onToggleAction("abdomen")}
        position={[0, 0.05, 0.34]}
      >
        <boxGeometry args={[0.78, 0.56, 0.08]} />
      </Segment>

      <Segment
        color="#6C8C97"
        active={selected.has("dorsal")}
        onClick={() => onToggleAction("dorsal")}
        position={[0, 0.52, -0.34]}
      >
        <boxGeometry args={[0.98, 0.72, 0.08]} />
      </Segment>

      <Segment
        color="#6C8C97"
        active={selected.has("lombar")}
        onClick={() => onToggleAction("lombar")}
        position={[0, -0.02, -0.34]}
      >
        <boxGeometry args={[0.82, 0.42, 0.08]} />
      </Segment>

      <Segment
        color="#B78A74"
        active={selected.has("quadril-e")}
        onClick={() => onToggleAction("quadril-e")}
        position={[-0.28, -0.86, 0.1]}
      >
        <sphereGeometry args={[0.24, 28, 28]} />
      </Segment>

      <Segment
        color="#B78A74"
        active={selected.has("quadril-d")}
        onClick={() => onToggleAction("quadril-d")}
        position={[0.28, -0.86, 0.1]}
      >
        <sphereGeometry args={[0.24, 28, 28]} />
      </Segment>

      <Segment
        color="#E0A375"
        active={selected.has("ombro-e")}
        onClick={() => onToggleAction("ombro-e")}
        position={[-0.76, 0.98, 0]}
      >
        <sphereGeometry args={[0.22, 28, 28]} />
      </Segment>

      <Segment
        color="#E0A375"
        active={selected.has("ombro-d")}
        onClick={() => onToggleAction("ombro-d")}
        position={[0.76, 0.98, 0]}
      >
        <sphereGeometry args={[0.22, 28, 28]} />
      </Segment>

      <Segment color="#9BA49E" position={[-0.96, 0.28, 0]} rotation={[0, 0, -0.3]}>
        <capsuleGeometry args={[0.17, 0.88, 8, 18]} />
      </Segment>
      <Segment color="#9BA49E" position={[0.96, 0.28, 0]} rotation={[0, 0, 0.3]}>
        <capsuleGeometry args={[0.17, 0.88, 8, 18]} />
      </Segment>
      <Segment color="#9BA49E" position={[-0.34, -1.95, 0]} rotation={[0, 0, 0.06]}>
        <capsuleGeometry args={[0.2, 1.32, 8, 18]} />
      </Segment>
      <Segment color="#9BA49E" position={[0.34, -1.95, 0]} rotation={[0, 0, -0.06]}>
        <capsuleGeometry args={[0.2, 1.32, 8, 18]} />
      </Segment>
    </group>
  );
}

function Scene({
  view,
  selectedKeys,
  onToggleAction,
}: {
  view: BodyView;
  selectedKeys: RegionKey[];
  onToggleAction: (key: RegionKey) => void;
}) {
  const cameraPosition =
    view === "front" ? ([0, 0.3, 4.8] as [number, number, number]) : ([0, 0.3, -4.8] as [number, number, number]);

  return (
    <>
      <color attach="background" args={["#f6f4ef"]} />
      <PerspectiveCamera makeDefault key={view} position={cameraPosition} fov={34} />
      <ambientLight intensity={1.15} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} />
      <directionalLight position={[-3, 2, -4]} intensity={0.6} />
      <spotLight position={[0, 5, 6]} intensity={0.8} angle={0.4} penumbra={0.6} />
      <group rotation={[0.08, view === "front" ? 0.05 : Math.PI + 0.05, 0]}>
        <HumanModel
          selectedKeys={selectedKeys}
          onToggleAction={onToggleAction}
        />
      </group>
      <OrbitControls
        enablePan={false}
        minDistance={3.4}
        maxDistance={7.2}
        minPolarAngle={Math.PI / 3.8}
        maxPolarAngle={Math.PI / 1.8}
      />
    </>
  );
}

export function PatientsBodymap3DPreview({
  view,
  selectedKeys,
  onToggleAction,
}: {
  view: BodyView;
  selectedKeys: RegionKey[];
  onToggleAction: (key: RegionKey) => void;
}) {
  return (
    <div className="h-105 overflow-hidden rounded-4xl border border-line bg-[#f6f4ef]">
      <Canvas gl={{ antialias: true }}>
        <Scene
          view={view}
          selectedKeys={selectedKeys}
          onToggleAction={onToggleAction}
        />
      </Canvas>
    </div>
  );
}
