import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { C } from "@/lib/constants";
import { Player } from "./Player";
import { World } from "./scene";

export function RealmCanvas() {
  const mobile = typeof window !== "undefined" && window.innerWidth < 720;
  return (
    <Canvas
      camera={{ position: [0, 18, 28], fov: 62, near: 0.1, far: 420 }}
      dpr={mobile ? [1, 1.25] : [1, 1.75]}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%", touchAction: "none" }}
      onCreated={({ gl }) => {
        gl.setClearColor(C.void, 1);
      }}
    >
      <World />
      <Player />
      <EffectComposer enableNormalPass={false}>
        <Bloom intensity={mobile ? 0.55 : 0.85} luminanceThreshold={0.35} mipmapBlur />
        <Vignette eskil={false} offset={0.15} darkness={0.72} />
      </EffectComposer>
    </Canvas>
  );
}
