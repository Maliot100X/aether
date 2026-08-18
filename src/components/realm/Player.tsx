import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { ZONES, type ZoneId } from "@/lib/constants";
import { playerPose, teleportTo, useRealm } from "@/lib/realm-store";

const FORWARD = new THREE.Vector3();
const RIGHT = new THREE.Vector3();
const NEXT = new THREE.Vector3();
const keys = new Set<string>();

function nearestIsland(x: number, z: number) {
  let best = ZONES[0];
  let bestD = Infinity;
  for (const zdef of ZONES) {
    const dx = x - zdef.position[0];
    const dz = z - zdef.position[2];
    const d = Math.hypot(dx, dz);
    if (d < bestD) {
      bestD = d;
      best = zdef;
    }
  }
  return { zone: best, dist: bestD };
}

export function Player() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const entered = useRealm((s) => s.entered);
  const fly = useRealm((s) => s.fly);
  const setZone = useRealm((s) => s.setZone);
  const setLocked = useRealm((s) => s.setLocked);
  const panel = useRealm((s) => s.panel);
  const yaw = useRef(0);
  const pitch = useRef(0.08);
  const pos = useRef(new THREE.Vector3(0, 14.5, 36));
  const velY = useRef(0);
  const speedRef = useRef(0);

  useEffect(() => {
    teleportTo.current = (zone: ZoneId) => {
      const z = ZONES.find((item) => item.id === zone);
      if (!z) return;
      pos.current.set(z.position[0], z.deckY + 2.4, z.position[2] + 10);
      yaw.current = 0;
      pitch.current = -0.08;
      setZone(zone);
    };
    return () => {
      teleportTo.current = null;
    };
  }, [setZone]);

  useEffect(() => {
    const el = gl.domElement;
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === "KeyF") useRealm.getState().setFly(!useRealm.getState().fly);
      if (e.code === "Escape") {
        document.exitPointerLock();
        useRealm.getState().setPanel(null);
      }
      const zone = ZONES.find((z) => z.key === e.key);
      if (zone && !e.metaKey && !e.ctrlKey) {
        teleportTo.current?.(zone.id);
      }
      keys.add(e.code);
      playerPose.keys = keys;
    };
    const up = (e: KeyboardEvent) => {
      keys.delete(e.code);
      playerPose.keys = keys;
    };
    const blur = () => keys.clear();
    const move = (e: MouseEvent) => {
      if (document.pointerLockElement !== el) return;
      yaw.current -= e.movementX * 0.0022;
      pitch.current -= e.movementY * 0.0022;
      pitch.current = Math.max(-1.2, Math.min(1.2, pitch.current));
    };
    const onLock = () => setLocked(true);
    const onUnlock = () => setLocked(false);
    const click = () => {
      if (useRealm.getState().entered && !useRealm.getState().panel) {
        void el.requestPointerLock();
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", blur);
    el.addEventListener("mousemove", move);
    el.addEventListener("click", click);
    document.addEventListener("pointerlockchange", () => {
      if (document.pointerLockElement === el) onLock();
      else onUnlock();
    });
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", blur);
      el.removeEventListener("mousemove", move);
      el.removeEventListener("click", click);
    };
  }, [gl, setLocked]);

  useEffect(() => {
    if (panel || !entered) {
      if (document.pointerLockElement) document.exitPointerLock();
    }
  }, [panel, entered]);

  useEffect(() => {
    const w = window as Window & {
      __controlsTest?: {
        getYaw: () => number;
        getSpeed: () => number;
        getPosition: () => { x: number; y: number; z: number };
        setKeys: (codes: string[]) => void;
        setSteer: (v: number) => void;
      };
    };
    w.__controlsTest = {
      getYaw: () => yaw.current,
      getSpeed: () => speedRef.current,
      getPosition: () => ({ x: pos.current.x, y: pos.current.y, z: pos.current.z }),
      setKeys: (codes) => {
        keys.clear();
        for (const c of codes) keys.add(c);
      },
      setSteer: (v) => {
        keys.delete("KeyA");
        keys.delete("KeyD");
        if (v > 0.2) keys.add("KeyA");
        if (v < -0.2) keys.add("KeyD");
      },
    };
    return () => {
      delete w.__controlsTest;
    };
  }, []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    if (!entered) {
      const t = performance.now() * 0.00012;
      camera.position.set(Math.sin(t) * 42, 22, Math.cos(t) * 42);
      camera.lookAt(0, 10, 0);
      return;
    }

    const flying = fly;
    FORWARD.set(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    RIGHT.set(Math.cos(yaw.current), 0, -Math.sin(yaw.current));

    let ax = 0;
    let az = 0;
    let ay = 0;
    if (keys.has("KeyW") || keys.has("ArrowUp")) {
      ax += FORWARD.x;
      az += FORWARD.z;
    }
    if (keys.has("KeyS") || keys.has("ArrowDown")) {
      ax -= FORWARD.x;
      az -= FORWARD.z;
    }
    if (keys.has("KeyD") || keys.has("ArrowRight")) {
      ax += RIGHT.x;
      az += RIGHT.z;
    }
    if (keys.has("KeyA") || keys.has("ArrowLeft")) {
      ax -= RIGHT.x;
      az -= RIGHT.z;
    }
    if (flying) {
      if (keys.has("Space") || keys.has("KeyE")) ay += 1;
      if (keys.has("ControlLeft") || keys.has("KeyC") || keys.has("KeyQ")) ay -= 1;
    }

    const sprint = keys.has("ShiftLeft") || keys.has("ShiftRight") ? 1.85 : 1;
    const walk = flying ? 16 : 9;
    const len = Math.hypot(ax, az);
    if (len > 0) {
      ax /= len;
      az /= len;
    }
    pos.current.x += ax * walk * sprint * dt;
    pos.current.z += az * walk * sprint * dt;
    speedRef.current = Math.hypot(ax, az) * walk * sprint;

    const { zone, dist } = nearestIsland(pos.current.x, pos.current.z);
    const onDeck = dist < zone.radius + 2;
    const deck = zone.deckY + 1.75;

    if (flying) {
      pos.current.y += ay * 10 * dt;
      pos.current.y = Math.max(2, Math.min(48, pos.current.y));
      velY.current = 0;
    } else if (onDeck) {
      velY.current = 0;
      pos.current.y += (deck - pos.current.y) * Math.min(1, dt * 10);
    } else {
      velY.current -= 22 * dt;
      pos.current.y += velY.current * dt;
      if (pos.current.y < 2) {
        pos.current.set(0, 8.6, 22);
        velY.current = 0;
      }
    }

    if (useRealm.getState().zone !== zone.id && onDeck) setZone(zone.id);

    camera.position.copy(pos.current);
    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw.current;
    camera.rotation.x = pitch.current;

    playerPose.yaw = yaw.current;
    playerPose.pitch = pitch.current;
    playerPose.x = pos.current.x;
    playerPose.y = pos.current.y;
    playerPose.z = pos.current.z;
    playerPose.speed = speedRef.current;
    playerPose.fly = flying;

    NEXT.copy(pos.current);
  });

  return null;
}
