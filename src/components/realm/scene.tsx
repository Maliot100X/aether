import { Float, Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { C, NATIVE_AGENTS, ZONES, type ZoneId } from "@/lib/constants";
import { useRealm } from "@/lib/realm-store";

const SKY_VERT = /* glsl */ `
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAG = /* glsl */ `
  varying vec3 vPos;
  uniform float uTime;
  void main() {
    vec3 n = normalize(vPos);
    float h = n.y * 0.5 + 0.5;
    vec3 voidC = vec3(0.027, 0.024, 0.047);
    vec3 horizon = vec3(0.08, 0.07, 0.12);
    vec3 col = mix(horizon, voidC, smoothstep(0.15, 0.72, h));
    float band = sin(n.x * 3.2 + n.z * 1.4 + uTime * 0.12);
    float aurora = smoothstep(0.35, 0.85, h) * smoothstep(0.15, 0.0, abs(band) - 0.35);
    col += vec3(0.22, 0.72, 0.85) * aurora * 0.28;
    col += vec3(0.78, 0.68, 0.38) * aurora * aurora * 0.18;
    float stars = step(0.996, fract(sin(dot(n.xy, vec2(12.9898, 78.233))) * 43758.5453));
    col += stars * smoothstep(0.4, 1.0, h) * 0.65;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function Atmosphere() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  useFrame(({ clock }) => {
    if (mat.current) mat.current.uniforms.uTime.value = clock.elapsedTime;
  });
  return (
    <>
      <mesh scale={380}>
        <sphereGeometry args={[1, 48, 32]} />
        <shaderMaterial
          ref={mat}
          vertexShader={SKY_VERT}
          fragmentShader={SKY_FRAG}
          side={THREE.BackSide}
          depthWrite={false}
          uniforms={{ uTime: { value: 0 } }}
        />
      </mesh>
      <fog attach="fog" args={[C.void, 70, 280]} />
      <color attach="background" args={[C.void]} />
      <ambientLight intensity={0.55} color={C.fg} />
      <hemisphereLight args={["#b7e7ff", "#1a1420", 0.55]} />
      <directionalLight position={[18, 40, 12]} intensity={1.6} color={C.gold} />
      <directionalLight position={[-22, 18, -10]} intensity={0.55} color={C.aether} />
      <pointLight position={[0, 16, 0]} intensity={28} distance={90} color={C.aether} />
      <Sparkles count={140} scale={[180, 50, 180]} size={2.4} speed={0.25} color={C.aether} opacity={0.55} />
    </>
  );
}

function IslandDeck({
  radius,
  color,
  irregular = 0.18,
}: {
  radius: number;
  color: string;
  irregular?: number;
}) {
  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(radius, radius * 0.86, 1.6, 10, 1, false);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      const y = pos.getY(i);
      if (y > 0) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const n = 1 + Math.sin(x * 0.35 + z * 0.28) * irregular;
        pos.setX(i, x * n);
        pos.setZ(i, z * n);
      }
    }
    g.computeVertexNormals();
    return g;
  }, [radius, irregular]);
  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <meshStandardMaterial color="#2a2438" roughness={0.72} metalness={0.22} />
      <mesh position={[0, 0.82, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius * 0.92, 32]} />
        <meshStandardMaterial
          color="#1c1828"
          roughness={0.48}
          metalness={0.32}
          emissive={color}
          emissiveIntensity={0.22}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.88, 0]}>
        <ringGeometry args={[radius * 0.84, radius * 0.97, 48]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.35}
          toneMapped={false}
        />
      </mesh>
    </mesh>
  );
}

function Ring({ radius, color }: { radius: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z += dt * 0.12;
  });
  return (
    <mesh ref={ref} rotation={[Math.PI / 2.4, 0, 0]}>
      <torusGeometry args={[radius, 0.045, 10, 80]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} toneMapped={false} />
    </mesh>
  );
}

function LightBridge({ a, b }: { a: [number, number, number]; b: [number, number, number] }) {
  const mid = useMemo<[number, number, number]>(() => {
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 1.2, (a[2] + b[2]) / 2];
  }, [a, b]);
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const quat = useMemo(() => {
    const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    return q;
  }, [a, b]);
  return (
    <mesh position={mid} quaternion={quat}>
      <cylinderGeometry args={[0.045, 0.045, len, 6]} />
      <meshStandardMaterial
        color={C.aether}
        emissive={C.aether}
        emissiveIntensity={0.7}
        transparent
        opacity={0.55}
        toneMapped={false}
      />
    </mesh>
  );
}

function Crystal() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.elapsedTime * 0.18;
    ref.current.position.y = 9.2 + Math.sin(clock.elapsedTime * 0.7) * 0.35;
  });
  return (
    <group ref={ref} position={[0, 10.4, 0]}>
      <mesh>
        <octahedronGeometry args={[2.1, 0]} />
        <meshPhysicalMaterial
          color={C.aether}
          emissive={C.aether}
          emissiveIntensity={0.35}
          roughness={0.08}
          metalness={0.15}
          transmission={0.65}
          thickness={1.4}
          transparent
          opacity={0.92}
        />
      </mesh>
      <mesh scale={0.42}>
        <octahedronGeometry args={[2.1, 0]} />
        <meshStandardMaterial color={C.gold} emissive={C.gold} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Stall({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 1.1, z]}>
      <mesh>
        <boxGeometry args={[1.6, 0.15, 1.1]} />
        <meshStandardMaterial color="#1c1826" metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[0.08, 2.1, 0.08]} />
        <meshStandardMaterial color={C.aether} emissive={C.aether} emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 2.15, 0]}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshStandardMaterial color={C.gold} emissive={C.gold} emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
    </group>
  );
}

function ZoneIsland({ id }: { id: ZoneId }) {
  const def = ZONES.find((z) => z.id === id)!;
  return (
    <group position={def.position}>
      <pointLight intensity={10} distance={36} color={def.hue} position={[0, 6, 0]} />
      <IslandDeck radius={def.radius} color={def.hue} />
      {id === "nexus" && (
        <>
          <Crystal />
          <Ring radius={8} color={C.aether} />
          <Ring radius={12} color={C.gold} />
        </>
      )}
      {id === "forge" && (
        <>
          <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.4}>
            <mesh position={[0, 3.2, 0]}>
              <torusGeometry args={[3.4, 0.08, 8, 48]} />
              <meshStandardMaterial color={C.gold} emissive={C.gold} emissiveIntensity={0.8} />
            </mesh>
          </Float>
          <mesh position={[0, 2.4, 0]}>
            <dodecahedronGeometry args={[1.1, 0]} />
            <meshStandardMaterial color={C.gold} emissive={C.gold} emissiveIntensity={0.45} metalness={0.6} />
          </mesh>
        </>
      )}
      {id === "bazaar" && (
        <>
          {[-8, -4, 0, 4, 8].map((x) => (
            <Stall key={x} x={x} z={-3} />
          ))}
          {[-6, -2, 2, 6].map((x) => (
            <Stall key={`b${x}`} x={x} z={4} />
          ))}
        </>
      )}
      {id === "sanctum" && (
        <>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh key={i} position={[0, 0.4 + i * 0.35, 0]}>
              <torusGeometry args={[6 - i * 0.7, 0.12, 8, 40]} />
              <meshStandardMaterial
                color={C.gold}
                emissive={C.gold}
                emissiveIntensity={0.25 + i * 0.08}
                transparent
                opacity={0.8}
              />
            </mesh>
          ))}
        </>
      )}
      {id === "cathedral" && (
        <>
          {[-6, 0, 6].map((x) => (
            <mesh key={x} position={[x, 6, -4]}>
              <cylinderGeometry args={[0.35, 0.55, 12, 6]} />
              <meshStandardMaterial color="#161320" metalness={0.4} roughness={0.45} />
            </mesh>
          ))}
          <mesh position={[0, 13.2, -4]}>
            <coneGeometry args={[2.4, 3.2, 6]} />
            <meshStandardMaterial color={C.aether} emissive={C.aether} emissiveIntensity={0.4} />
          </mesh>
        </>
      )}
      {id === "arena" && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.9, 0]}>
            <ringGeometry args={[10, 14, 40]} />
            <meshStandardMaterial color="#1a1622" metalness={0.35} roughness={0.5} />
          </mesh>
          {Array.from({ length: 16 }).map((_, i) => {
            const a = (i / 16) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 13, 2.4, Math.sin(a) * 13]}>
                <boxGeometry args={[1.1, 3.2, 0.45]} />
                <meshStandardMaterial color="#18141f" metalness={0.3} roughness={0.55} />
              </mesh>
            );
          })}
        </>
      )}
    </group>
  );
}

function AgentBody({ color, emote }: { color: string; emote: string }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!g.current) return;
    const t = clock.elapsedTime;
    const bounce = emote === "wave" ? Math.abs(Math.sin(t * 6)) * 0.25 : Math.sin(t * 1.6) * 0.08;
    g.current.position.y = bounce;
    g.current.rotation.y = Math.sin(t * 0.4) * 0.25 + (emote === "bow" ? 0.4 : 0);
  });
  return (
    <group ref={g}>
      <mesh position={[0, 1.15, 0]}>
        <capsuleGeometry args={[0.28, 0.7, 6, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.55}
          roughness={0.25}
          metalness={0.35}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 1.95, 0]}>
        <sphereGeometry args={[0.26, 16, 16]} />
        <meshStandardMaterial color={C.fg} emissive={color} emissiveIntensity={0.35} roughness={0.2} />
      </mesh>
      <mesh position={[0, 2.28, 0]}>
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshStandardMaterial color={C.gold} emissive={C.gold} emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function LivingAgents() {
  const userAgents = useRealm((s) => s.agents);
  const emote = useRealm((s) => s.vtuberEmote);
  const extras = userAgents.filter((a) => !NATIVE_AGENTS.some((n) => n.id === a.id));

  return (
    <group>
      {NATIVE_AGENTS.map((agent) => {
        const zone = ZONES.find((z) => z.id === agent.zone)!;
        return (
          <group
            key={agent.id}
            position={[zone.position[0] + 3.2, zone.deckY + 0.9, zone.position[2] + 2.4]}
          >
            <AgentBody color={agent.color} emote={agent.zone === "cathedral" ? emote : "idle"} />
            <pointLight distance={8} intensity={3.2} color={agent.color} position={[0, 1.6, 0]} />
          </group>
        );
      })}
      {extras.map((agent, i) => {
        const zone = ZONES.find((z) => z.id === agent.zone) ?? ZONES[0];
        const a = i * 0.9;
        return (
          <group
            key={agent.id}
            position={[
              zone.position[0] + Math.cos(a) * 5,
              zone.deckY + 0.9,
              zone.position[2] + Math.sin(a) * 5,
            ]}
          >
            <AgentBody color={agent.color || C.aether} emote="idle" />
          </group>
        );
      })}
    </group>
  );
}

export function LightStreams() {
  const claw = useRealm((s) => s.zone);
  const refs = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (refs.current) refs.current.rotation.y = clock.elapsedTime * 0.05;
  });
  return (
    <group ref={refs}>
      {ZONES.filter((z) => z.id !== "nexus").map((z) => (
        <LightBridge key={z.id} a={[0, 8, 0]} b={[z.position[0], z.deckY + 2, z.position[2]]} />
      ))}
      <mesh position={[0, 7.2, 0]}>
        <sphereGeometry args={[0.2 + (claw === "nexus" ? 0.08 : 0), 12, 12]} />
        <meshStandardMaterial color={C.gold} emissive={C.gold} emissiveIntensity={2} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function World() {
  return (
    <group>
      <Atmosphere />
      {ZONES.map((z) => (
        <ZoneIsland key={z.id} id={z.id} />
      ))}
      <LightStreams />
      <LivingAgents />
    </group>
  );
}
