// =========================================================
// 【갓물주 라이프: 미니미 하우스 3D (The Tenants Edition)】 메인 WebGL 엔진 (app.js)
// Three.js 쿼터뷰 건축, 프로시저럴 CanvasTexture, 다중파츠 가구 조립, 실시간 그림자,
// 가구 Drop&Bounce 애니메이션, 3D 황금 코인 분수, 방별 플로팅 타이머 & 입주민 AI
// =========================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const SAVE_KEY = 'god_landlord_minimi_3d_v1';

// --------------------- 전역 게임 상태 ---------------------
let state = createDefaultState();

function createDefaultState() {
  return {
    gold: 300,
    day: 1,
    gameMinutes: 9 * 60, // 오전 09:00 따스한 햇살 시작
    questIndex: 0,
    rooms: JSON.parse(JSON.stringify(INITIAL_ROOMS)).map((r) => ({
      ...r,
      tenant: null,
      rentTimer: 0,
      dust: 60
    })),
    shops: JSON.parse(JSON.stringify(INITIAL_SHOPS)),
    stats: {
      evictions: 0,
      totalRentEarned: 0,
      shopVisits: 0,
      careSolved: 0
    },
    lastSavedAt: Date.now()
  };
}

// --------------------- Three.js 핵심 객체 & 런타임 캐시 ---------------------
let scene;
let camera;
let renderer;
let controls;
let sunLight;
let hemiLight;
const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();

const FRUSTUM_SIZE = 28;
const DEFAULT_CAM_OFFSET = new THREE.Vector3(26, 26, 28);
const DEFAULT_TARGET = new THREE.Vector3(0, 4.0, 3.6);
let camAzimuthIndex = 0;
const CAM_AZIMUTHS = [
  new THREE.Vector3(26, 26, 28),
  new THREE.Vector3(-26, 26, 28),
  new THREE.Vector3(-24, 27, -26),
  new THREE.Vector3(24, 27, -26)
];

const camTween = {
  active: false,
  targetPos: new THREE.Vector3(),
  targetLook: new THREE.Vector3(),
  targetZoom: 1.0
};

const selection = {
  type: null, // 'room' | 'shop' | null
  id: null
};

// 프로시저럴 텍스처 캐시 & 3D 오브젝트 레지스트리
const texCache = {};
const pickableMeshes = []; // Raycaster 클릭 감지 대상
const room3DMap = {}; // roomId -> { group, slotsGroup, lampLight, highlightRing }
const shop3DMap = {}; // shopId -> { group, contentGroup }
const spinningWasherDrums = []; // 매 프레임 회전할 3D 드럼세탁기 내부 빨래 그룹
const activeBounces = []; // 가구 설치 시 Drop & Bounce 애니메이션 큐
const active3DParticles = []; // 3D 코인 분수 & 반짝이 파티클 물리 큐
const streetVehicles = {}; // 도로 위 배달 스쿠터 & 미니카 3D 그룹
const tenant3DActors = {}; // roomId -> 3D Chibi 캐릭터 액터 & AI 상태

// 플로팅 DOM 캐시
const roomBadgeEls = {};
const shopBadgeEls = {};
let activeCareBubbles = [];
let careSpawnCooldown = 6.0;
let shopChainCooldown = 12.0;

let currentApplicants = [];
let recruitTargetRoomId = null;
let activeKakaoEvent = null;
let kakaoCooldown = 28.0;

const dom = {};

// =========================================================
// 1. 프로시저럴 HTML5 Canvas 텍스처 생성기 (외부 에셋 없이 고품질 재질 생성!)
// =========================================================
function makeCanvasTex(drawFn, repeatX = 1, repeatY = 1, size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.needsUpdate = true;
  return tex;
}

// Lv.0 갈라진 시멘트 & 곰팡이 얼룩 바닥 텍스처
function getCrackedCementTex() {
  if (texCache.cement) return texCache.cement;
  texCache.cement = makeCanvasTex((ctx, s) => {
    ctx.fillStyle = '#a8a29e';
    ctx.fillRect(0, 0, s, s);
    // 시멘트 입자 노이즈 및 습기 얼룩
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(68,64,60,0.16)' : 'rgba(231,229,228,0.18)';
      ctx.fillRect(Math.random() * s, Math.random() * s, 4, 4);
    }
    const grad = ctx.createRadialGradient(s * 0.3, s * 0.65, 10, s * 0.3, s * 0.65, 130);
    grad.addColorStop(0, 'rgba(63, 98, 18, 0.36)');
    grad.addColorStop(1, 'rgba(68, 64, 60, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);

    // 갈라진 크랙 선
    ctx.strokeStyle = '#57534e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(60, 90);
    ctx.lineTo(150, 160);
    ctx.lineTo(190, 250);
    ctx.lineTo(290, 290);
    ctx.moveTo(150, 160);
    ctx.lineTo(230, 120);
    ctx.moveTo(350, 380);
    ctx.lineTo(440, 460);
    ctx.stroke();
  }, 2, 2);
  return texCache.cement;
}

// Lv.1 화사한 메이플 원목 마루 텍스처
function getPastelWoodTex() {
  if (texCache.pastelWood) return texCache.pastelWood;
  texCache.pastelWood = makeCanvasTex((ctx, s) => {
    ctx.fillStyle = '#f6d5b0';
    ctx.fillRect(0, 0, s, s);
    const plankH = s / 8;
    for (let row = 0; row < 8; row++) {
      const y = row * plankH;
      ctx.fillStyle = row % 2 === 0 ? '#f8ddc0' : '#f1cca1';
      ctx.fillRect(0, y, s, plankH - 2);
      ctx.fillStyle = '#d4a373';
      ctx.fillRect(0, y + plankH - 2, s, 2);
      const jointX = ((row * 173) % (s - 80)) + 40;
      ctx.fillRect(jointX, y, 2, plankH);
      // 나뭇결 라인
      ctx.strokeStyle = 'rgba(180, 110, 50, 0.14)';
      ctx.lineWidth = 1.5;
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.moveTo(0, y + 10 + k * 13);
        ctx.bezierCurveTo(s * 0.35, y + 5 + k * 13, s * 0.7, y + 16 + k * 13, s, y + 10 + k * 13);
        ctx.stroke();
      }
    }
  }, 2, 2);
  return texCache.pastelWood;
}

// Lv.2 따뜻한 오크 헤링본 우드 마루 텍스처
function getHerringboneWoodTex() {
  if (texCache.herringbone) return texCache.herringbone;
  texCache.herringbone = makeCanvasTex((ctx, s) => {
    ctx.fillStyle = '#dda15e';
    ctx.fillRect(0, 0, s, s);
    const step = 64;
    const shades = ['#e6b174', '#d99b52', '#cfa065', '#e2ab6c'];
    for (let y = -step; y < s + step; y += step / 2) {
      for (let x = -step; x < s + step; x += step) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = shades[Math.abs((x + y) / 32) % shades.length];
        ctx.fillRect(0, 0, step * 0.72, step * 0.26);
        ctx.strokeStyle = '#9c5a25';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, step * 0.72, step * 0.26);
        ctx.restore();

        ctx.save();
        ctx.translate(x + step * 0.5, y + step * 0.25);
        ctx.rotate(-Math.PI / 4);
        ctx.fillStyle = shades[(Math.abs((x + y) / 32) + 2) % shades.length];
        ctx.fillRect(0, 0, step * 0.72, step * 0.26);
        ctx.strokeStyle = '#9c5a25';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, step * 0.72, step * 0.26);
        ctx.restore();
      }
    }
  }, 2.4, 2.0);
  return texCache.herringbone;
}

// Lv.3 비앙코 골드 대리석 타일 텍스처
function getMarbleGoldTex() {
  if (texCache.marble) return texCache.marble;
  texCache.marble = makeCanvasTex((ctx, s) => {
    ctx.fillStyle = '#fffdf8';
    ctx.fillRect(0, 0, s, s);
    // 은은한 대리석 마블링 결
    ctx.strokeStyle = 'rgba(202, 138, 4, 0.22)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * 65);
      ctx.bezierCurveTo(s * 0.3, i * 65 + 40, s * 0.65, i * 65 - 35, s, i * 65 + 20);
      ctx.stroke();
    }
    // 골드 줄눈 그리드
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 4;
    const tile = s / 4;
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(i * tile, 0);
      ctx.lineTo(i * tile, s);
      ctx.moveTo(0, i * tile);
      ctx.lineTo(s, i * tile);
      ctx.stroke();
    }
  }, 2, 2);
  return texCache.marble;
}

// 벽면 웨인스코팅 / 곰팡이 벽지 텍스처 (Lv.0 ~ Lv.3)
function getWallTex(lv) {
  const key = `wall_${lv}`;
  if (texCache[key]) return texCache[key];
  texCache[key] = makeCanvasTex((ctx, s) => {
    if (lv === 0) {
      ctx.fillStyle = '#b5afa6';
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = 'rgba(63, 98, 18, 0.28)';
      ctx.beginPath();
      ctx.arc(110, 360, 75, 0, Math.PI * 2);
      ctx.arc(390, 290, 65, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6b635b';
      ctx.fillRect(0, s - 40, s, 40);
      return;
    }
    const topColors = ['#fff5eb', '#fffdf5', '#fffef9'];
    const botColors = ['#fed7aa', '#ecd2b0', '#f8efd9'];
    const railColors = ['#fb923c', '#c88a55', '#eab308'];

    ctx.fillStyle = topColors[lv - 1];
    ctx.fillRect(0, 0, s, s * 0.6);
    ctx.fillStyle = botColors[lv - 1];
    ctx.fillRect(0, s * 0.6, s, s * 0.4);
    ctx.fillStyle = railColors[lv - 1];
    ctx.fillRect(0, s * 0.58, s, 16);
    ctx.fillRect(0, s - 26, s, 26);

    // 웨인스코팅 사각 몰딩 프레임
    ctx.strokeStyle = railColors[lv - 1];
    ctx.lineWidth = 6;
    const cols = 4;
    const pad = 20;
    const boxW = (s - pad * (cols + 1)) / cols;
    for (let i = 0; i < cols; i++) {
      ctx.strokeRect(pad + i * (boxW + pad), s * 0.65, boxW, s * 0.25);
    }
  }, 2, 1);
  return texCache[key];
}

// 욕실 타일 텍스처
function getBathTileTex(lv) {
  const key = `bathTile_${lv}`;
  if (texCache[key]) return texCache[key];
  texCache[key] = makeCanvasTex((ctx, s) => {
    const bg = lv >= 3 ? '#fef9e7' : lv === 2 ? '#e0f2fe' : lv === 1 ? '#ccfbf1' : '#cbd5e1';
    const line = lv >= 3 ? '#eab308' : lv === 2 ? '#38bdf8' : lv === 1 ? '#2dd4bf' : '#64748b';
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = line;
    ctx.lineWidth = 4;
    const step = s / 8;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(i * step, 0);
      ctx.lineTo(i * step, s);
      ctx.moveTo(0, i * step);
      ctx.lineTo(s, i * step);
      ctx.stroke();
    }
  }, 2, 2, 256);
  return texCache[key];
}

// 패브릭 직조 패턴 텍스처 (침구, 소파, 러그용)
function getFabricTex(hexBase, hexStripe) {
  const key = `fab_${hexBase}_${hexStripe}`;
  if (texCache[key]) return texCache[key];
  texCache[key] = makeCanvasTex((ctx, s) => {
    ctx.fillStyle = hexBase;
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = hexStripe;
    for (let y = 0; y < s; y += 24) {
      ctx.fillRect(0, y, s, 8);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    for (let x = 0; x < s; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, s);
      ctx.stroke();
    }
  }, 2, 2, 256);
  return texCache[key];
}

// 외벽 따뜻한 크림&테라코타 벽돌 텍스처
function getBrickExteriorTex() {
  if (texCache.brick) return texCache.brick;
  texCache.brick = makeCanvasTex((ctx, s) => {
    ctx.fillStyle = '#f8e5d0';
    ctx.fillRect(0, 0, s, s);
    const rows = 12;
    const cols = 6;
    const bh = s / rows;
    const bw = s / cols;
    const brickPalette = ['#f3cbb0', '#eab696', '#f6d6bd', '#e5a985'];
    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * (bw / 2);
      for (let c = -1; c <= cols; c++) {
        ctx.fillStyle = brickPalette[(r + c + 4) % brickPalette.length];
        ctx.fillRect(c * bw + offset + 3, r * bh + 3, bw - 6, bh - 6);
      }
    }
  }, 3, 1.5);
  return texCache.brick;
}

// 아스팔트 도로 & 횡단보도 텍스처
function getRoadTex() {
  if (texCache.road) return texCache.road;
  texCache.road = makeCanvasTex((ctx, s) => {
    ctx.fillStyle = '#6b6661';
    ctx.fillRect(0, 0, s, s);
    // 중앙 노란 점선
    ctx.fillStyle = '#fde047';
    for (let x = 20; x < s; x += 84) {
      ctx.fillRect(x, s / 2 - 6, 48, 12);
    }
  }, 5, 1);
  return texCache.road;
}

// 그림자 공통 헬퍼
function enableShadows(obj, cast = true, receive = true) {
  obj.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
  return obj;
}

// =========================================================
// 2. 다중 파츠(THREE.Group, 8~25개 파츠) 3D 가구 & 상가 조립 빌더
// =========================================================

// [철거 전 Lv.0] 먼지 더미 & 방치된 골판지 박스 메쉬
function createDebrisMesh() {
  const g = new THREE.Group();
  const dustMat = new THREE.MeshStandardMaterial({ color: 0x8c857b, roughness: 0.95 });
  const boxMat = new THREE.MeshStandardMaterial({ color: 0xc2956e, roughness: 0.85 });
  const tapeMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.5 });

  // 먼지 뭉치 5개
  const spots = [[-1.1, 0.7], [-0.8, 0.85], [1.2, 0.5], [0.4, 1.6], [-0.4, -0.3]];
  spots.forEach(([x, z], idx) => {
    const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14 + (idx % 2) * 0.05, 0), dustMat);
    puff.position.set(x, 0.1, z);
    g.add(puff);
  });

  // 이사 전 방치된 골판지 박스 2개 + 테이프
  const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.48, 0.52), boxMat);
  b1.position.set(0.35, 0.24, -1.6);
  b1.rotation.y = 0.28;
  const tape1 = new THREE.Mesh(new THREE.BoxGeometry(0.63, 0.04, 0.12), tapeMat);
  tape1.position.set(0.35, 0.47, -1.6);
  tape1.rotation.y = 0.28;

  const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.36, 0.42), boxMat);
  b2.position.set(0.88, 0.18, -1.45);
  b2.rotation.y = -0.35;

  g.add(b1, tape1, b2);
  return enableShadows(g);
}

// [침대 그룹 createBedMesh] 다리 4개 + 프레임 + 헤드보드 + 둥근 매트리스 + 베개 2개 + 접힌 이불 + 협탁 + 스탠드 조명(실제 PointLight)
function createBedMesh(lv) {
  const g = new THREE.Group();

  if (lv === 0) {
    // Lv.0: 맨바닥 얇은 요와 납작 베개, 구겨진 담요 (6파츠)
    const matPad = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.08, 2.1),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.9 })
    );
    matPad.position.set(0, 0.04, 0);
    const blanket = new THREE.Mesh(
      new THREE.BoxGeometry(1.46, 0.09, 1.3),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 })
    );
    blanket.position.set(0, 0.08, 0.35);
    const pillow = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.1, 0.38),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.85 })
    );
    pillow.position.set(0, 0.11, -0.72);
    g.add(matPad, blanket, pillow);
    return enableShadows(g);
  }

  const woodColor = lv >= 3 ? 0x5c3a21 : lv === 2 ? 0xc87d3b : 0xeab676;
  const quiltHex = lv >= 3 ? '#fef08a' : lv === 2 ? '#6ee7b7' : '#fda4af';
  const stripeHex = lv >= 3 ? '#eab308' : lv === 2 ? '#34d399' : '#fb7185';
  const metalColor = lv >= 3 ? 0xfacc15 : 0x92400e;

  const woodMat = new THREE.MeshStandardMaterial({ color: woodColor, roughness: 0.55 });
  const mattressMat = new THREE.MeshStandardMaterial({ color: 0xfffdf9, roughness: 0.7 });
  const quiltMat = new THREE.MeshStandardMaterial({
    map: getFabricTex(quiltHex, stripeHex),
    roughness: 0.75
  });
  const pillowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  const accentMat = new THREE.MeshStandardMaterial({ color: metalColor, metalness: lv >= 3 ? 0.65 : 0.15, roughness: 0.35 });

  // 1~4) 원목 침대 다리 4개
  const legGeo = new THREE.CylinderGeometry(0.06, 0.045, 0.28, 12);
  [[-0.82, -1.02], [0.82, -1.02], [-0.82, 1.02], [0.82, 1.02]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, woodMat);
    leg.position.set(lx, 0.14, lz);
    g.add(leg);
  });

  // 5) 베이스 원목 프레임
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.2, 2.24), woodMat);
  frame.position.set(0, 0.32, 0);
  g.add(frame);

  // 6~7) 헤드보드 & 쿠션 몰딩
  const headboard = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.98, 0.14), woodMat);
  headboard.position.set(0, 0.78, -1.08);
  g.add(headboard);

  if (lv >= 2) {
    const hbPad = new THREE.Mesh(
      new THREE.BoxGeometry(1.64, 0.56, 0.08),
      new THREE.MeshStandardMaterial({ color: lv >= 3 ? 0xfef3c7 : 0xfffbeb, roughness: 0.65 })
    );
    hbPad.position.set(0, 0.84, -1.0);
    g.add(hbPad);
  }

  // 8) 푹신한 매트리스
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.28, 2.08), mattressMat);
  mattress.position.set(0, 0.54, 0.02);
  g.add(mattress);

  // 9~10) 접힌 이불 파츠 + 상단 화이트 시트 칼라
  const duvet = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.26, 1.42), quiltMat);
  duvet.position.set(0, 0.6, 0.36);
  const foldSheet = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.08, 0.26), pillowMat);
  foldSheet.position.set(0, 0.72, -0.26);
  g.add(duvet, foldSheet);

  // 11~12) 폭신한 베개 2개
  const pGeo = new THREE.BoxGeometry(0.68, 0.16, 0.42);
  const p1 = new THREE.Mesh(pGeo, pillowMat);
  p1.position.set(-0.42, 0.75, -0.72);
  p1.rotation.x = 0.18;
  const p2 = new THREE.Mesh(pGeo, pillowMat);
  p2.position.set(0.42, 0.75, -0.72);
  p2.rotation.x = 0.18;
  g.add(p1, p2);

  // 13~17) 침대 옆 협탁 + 서랍 + 손잡이 + 미니 스탠드 조명(갓 + 기둥 + 실제 발광)
  const nsGroup = new THREE.Group();
  nsGroup.position.set(1.26, 0, -0.82);

  const nsBody = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.52, 0.5), woodMat);
  nsBody.position.y = 0.3;
  const nsDrawer = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.18, 0.04), pillowMat);
  nsDrawer.position.set(0, 0.34, 0.25);
  const nsKnob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 10), accentMat);
  nsKnob.position.set(0, 0.34, 0.28);

  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.05, 14), accentMat);
  lampBase.position.y = 0.58;
  const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.28, 10), accentMat);
  lampStem.position.y = 0.72;
  const lampShade = new THREE.Mesh(
    new THREE.ConeGeometry(0.2, 0.24, 16, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xffb703,
      emissiveIntensity: 0.85,
      side: THREE.DoubleSide,
      roughness: 0.3
    })
  );
  lampShade.position.y = 0.88;

  // 실제 방 안을 따뜻하게 비추는 실내 PointLight!
  const bulbLight = new THREE.PointLight(0xffbe55, lv >= 2 ? 1.35 : 0.95, 7.5, 1.6);
  bulbLight.position.set(0, 0.92, 0.1);
  bulbLight.castShadow = false;

  nsGroup.add(nsBody, nsDrawer, nsKnob, lampBase, lampStem, lampShade, bulbLight);
  g.add(nsGroup);

  return enableShadows(g);
}

// [욕실 그룹 createBathroomMesh] 단차 타일 바닥 + 반투명 유리 샤워부스 + 금속 프레임 + 해바라기 샤워기 + 세면대 & 거울 + 양변기
function createBathroomMesh(lv) {
  const g = new THREE.Group();

  // 1) 단차가 있는 욕실 타일 바닥 슬래브
  const baseSlab = new THREE.Mesh(
    new THREE.BoxGeometry(2.55, 0.14, 2.35),
    new THREE.MeshStandardMaterial({ map: getBathTileTex(lv), roughness: 0.35 })
  );
  baseSlab.position.set(0, 0.07, 0);
  g.add(baseSlab);

  const ceramicMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.05 });
  const frameColor = lv >= 3 ? 0xeab308 : lv === 2 ? 0x334155 : 0x94a3b8;
  const metalMat = new THREE.MeshStandardMaterial({ color: frameColor, metalness: 0.78, roughness: 0.22 });

  // 2~5) 3D 양변기 조립 (하단 베이스 + 보울 + 물탱크 + 변기커버)
  const toiletGroup = new THREE.Group();
  toiletGroup.position.set(-0.78, 0.14, -0.72);
  const tBase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.34, 14), ceramicMat);
  tBase.position.y = 0.17;
  const tBowl = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), ceramicMat);
  tBowl.scale.set(1, 0.65, 1.25);
  tBowl.position.set(0, 0.34, 0.08);
  const tTank = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.44, 0.2), ceramicMat);
  tTank.position.set(0, 0.52, -0.18);
  const tLid = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.04, 14), ceramicMat);
  tLid.position.set(0, 0.47, 0.1);
  toiletGroup.add(tBase, tBowl, tTank, tLid);
  g.add(toiletGroup);

  // 6~9) 세면대 하부장 + 세면보울 + 수전 + 벽면 거울
  const vanityGroup = new THREE.Group();
  vanityGroup.position.set(-0.72, 0.14, 0.52);
  const vCab = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.62, 0.46),
    new THREE.MeshStandardMaterial({ color: lv >= 2 ? 0xd97706 : 0xe2e8f0, roughness: 0.55 })
  );
  vCab.position.y = 0.31;
  const vBasin = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.14, 16), ceramicMat);
  vBasin.position.y = 0.68;
  const vTap = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.18, 8), metalMat);
  vTap.position.set(-0.14, 0.78, 0);
  const mirror = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.32, 0.04, 20),
    new THREE.MeshStandardMaterial({ color: 0xe0f2fe, metalness: 0.88, roughness: 0.08 })
  );
  mirror.rotation.z = Math.PI / 2;
  mirror.position.set(-0.34, 1.28, 0);
  vanityGroup.add(vCab, vBasin, vTap, mirror);
  g.add(vanityGroup);

  if (lv >= 1) {
    // 10~15) 반투명 유리 샤워부스 파티션 + 금속 프레임 + 손잡이 + 해바라기 레인샤워기!
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xbaf2ff,
      transparent: true,
      opacity: 0.36,
      roughness: 0.08,
      metalness: 0.15,
      side: THREE.DoubleSide
    });

    const glassFront = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.95, 0.04), glassMat);
    glassFront.position.set(0.56, 1.11, 0.22);

    const glassSide = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.95, 1.28), glassMat);
    glassSide.position.set(-0.02, 1.11, -0.42);

    // 메탈 프레임 기둥 & 상단 바
    const post1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.0, 0.06), metalMat);
    post1.position.set(-0.02, 1.12, 0.22);
    const post2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.0, 0.06), metalMat);
    post2.position.set(1.15, 1.12, 0.22);
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.05, 0.06), metalMat);
    topBar.position.set(0.56, 2.1, 0.22);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.34, 8), metalMat);
    handle.position.set(0.24, 1.1, 0.26);

    // 해바라기 레인샤워 파이프 & 원형 헤드
    const riserPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.65, 10), metalMat);
    riserPipe.position.set(0.72, 1.15, -0.98);
    const showerArm = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.42, 8), metalMat);
    showerArm.rotation.x = Math.PI / 2;
    showerArm.position.set(0.72, 1.96, -0.78);
    const rainHead = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.04, 16), metalMat);
    rainHead.position.set(0.72, 1.93, -0.58);

    g.add(glassFront, glassSide, post1, post2, topBar, handle, riserPipe, showerArm, rainHead);
  }

  return enableShadows(g);
}

// [주방 그룹 createKitchenMesh] 싱크대 하부장 + 도어/손잡이 + 대리석 상판 + 수전 + 인덕션/냄비 + 손잡이형 3D 냉장고
function createKitchenMesh(lv) {
  const g = new THREE.Group();

  if (lv === 0) {
    const oldBox = new THREE.Mesh(
      new THREE.BoxGeometry(1.25, 0.72, 0.65),
      new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.85 })
    );
    oldBox.position.set(0, 0.36, 0);
    const burner = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.08, 0.34),
      new THREE.MeshStandardMaterial({ color: 0x334155 })
    );
    burner.position.set(0.2, 0.76, 0);
    g.add(oldBox, burner);
    return enableShadows(g);
  }

  const cabColor = lv >= 3 ? 0x1e293b : lv === 2 ? 0xa7f3d0 : 0xfde68a;
  const fridgeColor = lv >= 3 ? 0xfef3c7 : lv === 2 ? 0x6ee7b7 : 0xfff1f2;
  const hardwareColor = lv >= 3 ? 0xfacc15 : 0x64748b;

  const cabMat = new THREE.MeshStandardMaterial({ color: cabColor, roughness: 0.5 });
  const topMat = new THREE.MeshStandardMaterial({ map: getMarbleGoldTex(), roughness: 0.25 });
  const metalMat = new THREE.MeshStandardMaterial({ color: hardwareColor, metalness: 0.75, roughness: 0.25 });
  const fridgeMat = new THREE.MeshStandardMaterial({ color: fridgeColor, roughness: 0.32, metalness: 0.1 });

  // 1~4) 싱크대 하부장 + 도어 패널 2개 + 손잡이 2개
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.82, 0.74), cabMat);
  cab.position.set(-0.35, 0.41, 0);
  const door1 = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.66, 0.04), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }));
  door1.position.set(-0.78, 0.42, -0.38);
  const door2 = door1.clone();
  door2.position.set(0.08, 0.42, -0.38);
  g.add(cab, door1, door2);

  // 5) 대리석 상판 오버행
  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.08, 0.82), topMat);
  counterTop.position.set(-0.35, 0.86, 0);
  g.add(counterTop);

  // 6~8) 싱크볼 + 구즈넥 수전 기둥 + 곡선 스파우트
  const sinkBasin = new THREE.Mesh(
    new THREE.BoxGeometry(0.64, 0.05, 0.48),
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.6, roughness: 0.25 })
  );
  sinkBasin.position.set(-0.82, 0.89, 0);
  const tapStem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.28, 10), metalMat);
  tapStem.position.set(-0.82, 1.02, 0.26);
  const tapArch = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.022, 8, 14, Math.PI), metalMat);
  tapArch.rotation.y = Math.PI / 2;
  tapArch.position.set(-0.82, 1.15, 0.17);
  g.add(sinkBasin, tapStem, tapArch);

  // 9~11) 인덕션 쿡탑 + 요리 냄비 + 뚜껑
  const cooktop = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.03, 0.48),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.15 })
  );
  cooktop.position.set(0.12, 0.9, 0);
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.14, 0.16, 16),
    new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35 })
  );
  pot.position.set(0.12, 0.99, 0);
  const potLid = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.03, 16), metalMat);
  potLid.position.set(0.12, 1.08, 0);
  g.add(cooktop, pot, potLid);

  // 12~16) 2도어 3D 미니/스탠드 냉장고 (본체 + 상/하 도어 분리 + 손잡이 2개)
  const fridgeGroup = new THREE.Group();
  fridgeGroup.position.set(0.95, 0, 0);
  const fH = lv >= 2 ? 1.68 : 1.38;
  const fBody = new THREE.Mesh(new THREE.BoxGeometry(0.76, fH, 0.76), fridgeMat);
  fBody.position.y = fH / 2;
  const seam = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.025, 0.78), metalMat);
  seam.position.y = fH * 0.64;
  const fHandle1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.28, 8), metalMat);
  fHandle1.position.set(-0.28, fH * 0.8, -0.4);
  const fHandle2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.38, 8), metalMat);
  fHandle2.position.set(-0.28, fH * 0.4, -0.4);
  fridgeGroup.add(fBody, seam, fHandle1, fHandle2);
  g.add(fridgeGroup);

  return enableShadows(g);
}

// [리빙 소파 & 데스크 그룹 createLivingDeskMesh] 원형 러그 + 다중파츠 소파(좌방석/등받이/팔걸이/쿠션) + 책상/의자 + 노트북/모니터
function createLivingDeskMesh(lv) {
  const g = new THREE.Group();

  // 1~2) 중앙 원형 패브릭 러그
  const rugColors = [
    ['#d6d3d1', '#a8a29e'],
    ['#fce7f3', '#f9a8d4'],
    ['#fef3c7', '#fcd34d'],
    ['#fef9c3', '#eab308']
  ];
  const [rc1, rc2] = rugColors[lv];
  const rug = new THREE.Mesh(
    new THREE.CylinderGeometry(lv === 0 ? 0.95 : 1.38, lv === 0 ? 0.95 : 1.38, 0.03, 28),
    new THREE.MeshStandardMaterial({ map: getFabricTex(rc1, rc2), roughness: 0.88 })
  );
  rug.position.set(-1.75, 0.018, -0.95);
  g.add(rug);

  if (lv === 0) {
    const crateDesk = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.62, 0.65),
      new THREE.MeshStandardMaterial({ color: 0xb4845c, roughness: 0.9 })
    );
    crateDesk.position.set(0.2, 0.31, 0);
    g.add(crateDesk);
    return enableShadows(g);
  }

  // 3~9) 코지 다중 파츠 소파 조립 (좌방석 + 등받이 + 좌/우 팔걸이 + 쿠션 2개 + 다리 4개)
  const sofaColor = lv >= 3 ? 0xfde047 : lv === 2 ? 0xfed7aa : 0xfbcfe8;
  const sofaMat = new THREE.MeshStandardMaterial({ color: sofaColor, roughness: 0.68 });
  const cushionMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  const woodMat = new THREE.MeshStandardMaterial({ color: lv >= 3 ? 0x78350f : 0xc87d3b, roughness: 0.5 });

  const sofaGroup = new THREE.Group();
  sofaGroup.position.set(-1.75, 0, -1.15);

  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.28, 0.72), sofaMat);
  seat.position.y = 0.26;
  const backrest = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.58, 0.2), sofaMat);
  backrest.position.set(0, 0.54, -0.28);
  backrest.rotation.x = -0.1;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.44, 0.74), sofaMat);
  armL.position.set(-0.78, 0.38, 0);
  const armR = armL.clone();
  armR.position.set(0.78, 0.38, 0);

  const cush1 = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.28, 0.14), cushionMat);
  cush1.position.set(-0.42, 0.52, -0.12);
  cush1.rotation.z = 0.15;
  const cush2 = cush1.clone();
  cush2.position.set(0.42, 0.52, -0.12);
  cush2.rotation.z = -0.15;

  sofaGroup.add(seat, backrest, armL, armR, cush1, cush2);
  g.add(sofaGroup);

  // 10~17) 데스크(상판 + 다리 4개) + 회전 체어 + 빛나는 노트북/듀얼모니터 + 머그컵
  const deskGroup = new THREE.Group();
  deskGroup.position.set(0.25, 0, 0.1);

  const dTop = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.08, 0.76), woodMat);
  dTop.position.y = 0.74;
  deskGroup.add(dTop);

  const dLegGeo = new THREE.CylinderGeometry(0.04, 0.03, 0.72, 10);
  [[-0.68, -0.3], [0.68, -0.3], [-0.68, 0.3], [0.68, 0.3]].forEach(([lx, lz]) => {
    const dl = new THREE.Mesh(dLegGeo, woodMat);
    dl.position.set(lx, 0.36, lz);
    deskGroup.add(dl);
  });

  // 노트북 / 와이드 모니터
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: lv >= 3 ? 0xa855f7 : 0x0ea5e9,
    emissiveIntensity: 0.65,
    roughness: 0.2
  });
  const chassisMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });

  if (lv <= 2) {
    const laptopBase = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.03, 0.34), chassisMat);
    laptopBase.position.set(0, 0.8, -0.05);
    const laptopScreen = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.32, 0.03), screenMat);
    laptopScreen.position.set(0, 0.96, 0.12);
    laptopScreen.rotation.x = 0.2;
    deskGroup.add(laptopBase, laptopScreen);
  } else {
    const mon1 = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.36, 0.04), screenMat);
    mon1.position.set(-0.28, 1.02, 0.15);
    mon1.rotation.y = -0.18;
    const mon2 = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.36, 0.04), screenMat);
    mon2.position.set(0.32, 1.02, 0.15);
    mon2.rotation.y = 0.18;
    deskGroup.add(mon1, mon2);
  }

  // 머그컵
  const mug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.055, 0.12, 12),
    new THREE.MeshStandardMaterial({ color: 0xfb7185, roughness: 0.3 })
  );
  mug.position.set(-0.52, 0.84, -0.08);
  deskGroup.add(mug);

  // 귀여운 쿠션 의자
  const chairSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.26, 0.1, 16), sofaMat);
  chairSeat.position.set(0, 0.46, -0.58);
  const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.38, 0.1), sofaMat);
  chairBack.position.set(0, 0.68, -0.8);
  const chairStem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.44, 10), chassisMat);
  chairStem.position.set(0, 0.22, -0.58);
  const chairBase = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 12), chassisMat);
  chairBase.position.set(0, 0.02, -0.58);
  deskGroup.add(chairSeat, chairBack, chairStem, chairBase);

  g.add(deskGroup);
  return enableShadows(g);
}

// [창호 & 에어컨 & 다중잎사귀 화분 그룹 createWallDecorAndACMesh]
function createWallDecorAndACMesh(lv) {
  const g = new THREE.Group();

  // 1~5) 입체 창틀 + 하늘 유리창 + 커튼봉 + 양쪽 커튼 주름
  const frameMat = new THREE.MeshStandardMaterial({ color: lv >= 3 ? 0xca8a04 : 0x8c5530, roughness: 0.45 });
  const skyGlassMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    emissive: 0x7dd3fc,
    emissiveIntensity: 0.45,
    roughness: 0.1
  });

  const winGroup = new THREE.Group();
  winGroup.position.set(-0.25, 1.85, -3.06);

  const winPane = new THREE.Mesh(new THREE.BoxGeometry(1.65, 1.15, 0.08), skyGlassMat);
  const sill = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.08, 0.22), frameMat);
  sill.position.set(0, -0.6, 0.08);
  const mullionV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.15, 0.12), frameMat);
  const mullionH = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.06, 0.12), frameMat);
  winGroup.add(winPane, sill, mullionV, mullionH);

  if (lv >= 1) {
    const curtainColor = lv >= 3 ? 0xfde047 : lv === 2 ? 0xfed7aa : 0xfbcfe8;
    const cMat = new THREE.MeshStandardMaterial({ color: curtainColor, roughness: 0.72 });
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.1, 10), frameMat);
    rod.rotation.z = Math.PI / 2;
    rod.position.set(0, 0.66, 0.12);

    const drapeL = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.38, 12), cMat);
    drapeL.position.set(-0.84, -0.02, 0.14);
    const drapeR = drapeL.clone();
    drapeR.position.set(0.84, -0.02, 0.14);
    winGroup.add(rod, drapeL, drapeR);

    // 햇빛 볼륨 광선(Sunbeam Plane)
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfff5b8,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const sunBeam = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.7), beamMat);
    sunBeam.position.set(0.15, -0.95, 1.1);
    sunBeam.rotation.x = -Math.PI / 3.2;
    winGroup.add(sunBeam);
  }
  g.add(winGroup);

  if (lv >= 1) {
    // 6~8) 벽걸이 에어컨 (본체 + 바람 날개 + 상태 LED)
    const acGroup = new THREE.Group();
    acGroup.position.set(-2.35, 2.38, -3.02);
    const acBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.28, 0.34, 0.28),
      new THREE.MeshStandardMaterial({ color: lv >= 3 ? 0xfef9c3 : 0xffffff, roughness: 0.28 })
    );
    const acVent = new THREE.Mesh(
      new THREE.BoxGeometry(1.14, 0.05, 0.12),
      new THREE.MeshStandardMaterial({ color: lv >= 3 ? 0xeab308 : 0x38bdf8 })
    );
    acVent.position.set(0, -0.14, 0.12);
    const acLed = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x34d399 })
    );
    acLed.position.set(0.48, 0.04, 0.15);
    acGroup.add(acBody, acVent, acLed);
    g.add(acGroup);

    // 9~16) 다중 파츠 반려식물 화분 (화분 몸체 + 테두리 + 흙 디스크 + 줄기 + 초록 잎사귀 5장!)
    const plantGroup = new THREE.Group();
    plantGroup.position.set(0.95, 0, -2.55);

    const potMat = new THREE.MeshStandardMaterial({ color: lv >= 3 ? 0xfffbeb : 0xe07a5f, roughness: 0.55 });
    const potBody = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.17, 0.38, 16), potMat);
    potBody.position.y = 0.19;
    const potRim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.03, 10, 18), potMat);
    potRim.rotation.x = Math.PI / 2;
    potRim.position.y = 0.38;
    const soil = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.04, 14),
      new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.95 })
    );
    soil.position.y = 0.36;

    const leafMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.45 });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.42, 8), leafMat);
    stem.position.y = 0.54;
    plantGroup.add(potBody, potRim, soil, stem);

    const leafCount = lv >= 2 ? 6 : 4;
    for (let i = 0; i < leafCount; i++) {
      const ang = (Math.PI * 2 * i) / leafCount;
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), leafMat);
      leaf.scale.set(1.3, 0.28, 0.72);
      leaf.position.set(Math.cos(ang) * 0.22, 0.68 + (i % 2) * 0.12, Math.sin(ang) * 0.22);
      leaf.rotation.y = -ang;
      leaf.rotation.z = -0.35;
      plantGroup.add(leaf);
    }
    g.add(plantGroup);
  }

  return enableShadows(g);
}

// [1층 편의점 다중 파츠 createConvenienceStoreMesh] 투명 유리 쇼케이스 냉장고(음료 캔/병 18개 진열) + 매대 + POS 계산대
function createConvenienceStoreMesh(level = 1) {
  const g = new THREE.Group();

  // 1~2) 두툼한 스트라이프 어닝 & 상단 네온 사인박스
  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(9.8, 0.32, 1.35),
    new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.4 })
  );
  awning.position.set(0, 2.75, 2.85);
  awning.rotation.x = 0.18;

  const signBoard = new THREE.Mesh(
    new THREE.BoxGeometry(6.8, 0.58, 0.24),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.55,
      roughness: 0.25
    })
  );
  signBoard.position.set(0, 3.22, 2.55);
  g.add(awning, signBoard);

  // 3~22) 투명 유리 음료 쇼케이스 냉장고 2동 + 형형색색 음료 캔/병 파츠 18개 촘촘히 조립!
  const fridgeCaseMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
  const shelfMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.5 });
  const glassDoorMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.3,
    roughness: 0.08
  });
  const canColors = [0xf43f5e, 0xfacc15, 0x38bdf8, 0x4ade80, 0xfb923c, 0xc084fc];

  [-3.2, -1.1].forEach((fx, fIdx) => {
    const fGroup = new THREE.Group();
    fGroup.position.set(fx, 0, -1.95);

    const backPanel = new THREE.Mesh(new THREE.BoxGeometry(1.85, 2.15, 0.08), fridgeCaseMat);
    backPanel.position.set(0, 1.08, -0.32);
    const topPanel = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.12, 0.72), fridgeCaseMat);
    topPanel.position.set(0, 2.12, 0);
    const botPanel = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.22, 0.72), fridgeCaseMat);
    botPanel.position.set(0, 0.11, 0);
    const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.15, 0.72), fridgeCaseMat);
    sideL.position.set(-0.88, 1.08, 0);
    const sideR = sideL.clone();
    sideR.position.set(0.88, 1.08, 0);
    fGroup.add(backPanel, topPanel, botPanel, sideL, sideR);

    // 3단 선반 & 음료 캔/병 9개씩 진열
    [0.52, 1.06, 1.58].forEach((sy, sIdx) => {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.04, 0.62), shelfMat);
      shelf.position.set(0, sy, 0.04);
      fGroup.add(shelf);

      for (let c = -2; c <= 2; c++) {
        const drinkMat = new THREE.MeshStandardMaterial({
          color: canColors[(c + 2 + sIdx + fIdx) % canColors.length],
          roughness: 0.25,
          metalness: 0.2
        });
        const can = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.28, 10), drinkMat);
        can.position.set(c * 0.31, sy + 0.16, 0.08);
        fGroup.add(can);
      }
    });

    const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(1.78, 1.96, 0.04), glassDoorMat);
    frontGlass.position.set(0, 1.08, 0.41);
    fGroup.add(frontGlass);
    g.add(fGroup);
  });

  // 23~27) 중앙 간식 & 삼각김밥 진열 곤돌라 매대
  const rackGroup = new THREE.Group();
  rackGroup.position.set(1.15, 0, -0.25);
  const rackBase = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 1.25, 0.95),
    new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.55 })
  );
  rackBase.position.y = 0.62;
  rackGroup.add(rackBase);

  for (let i = -2; i <= 2; i++) {
    const snack = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.26, 0.22),
      new THREE.MeshStandardMaterial({ color: canColors[(i + 3) % canColors.length], roughness: 0.45 })
    );
    snack.position.set(i * 0.36, 1.38, 0);
    rackGroup.add(snack);
  }
  g.add(rackGroup);

  // 28~33) POS 계산대 카운터 + 듀얼 모니터 + 따뜻한 간식 온장고/커피머신(Lv.2+)
  const posGroup = new THREE.Group();
  posGroup.position.set(3.45, 0, 0.65);
  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 0.96, 0.92),
    new THREE.MeshStandardMaterial({ color: 0x34d399, roughness: 0.45 })
  );
  counter.position.y = 0.48;
  const counterTop = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.08, 1.0),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
  );
  counterTop.position.y = 1.0;

  const posScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.36, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, emissive: 0x38bdf8, emissiveIntensity: 0.5 })
  );
  posScreen.position.set(-0.45, 1.24, 0);

  const hotCase = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.48, 0.46),
    new THREE.MeshStandardMaterial({
      color: level >= 2 ? 0xfb923c : 0xfde047,
      transparent: true,
      opacity: 0.72
    })
  );
  hotCase.position.set(0.48, 1.28, 0);
  posGroup.add(counter, counterTop, posScreen, hotCase);
  g.add(posGroup);

  // 상가 내부 따뜻한 무드 조명
  const shopLight = new THREE.PointLight(0xfff1c1, 1.4, 11, 1.5);
  shopLight.position.set(0, 2.5, 0.5);
  g.add(shopLight);

  return enableShadows(g);
}

// [1층 코인세탁소 다중 파츠 createLaundromatMesh] 투명 원형 유리창 안에서 세탁물이 실제로 회전하는 3연동 드럼세탁기 부스!
function createLaundromatMesh(level = 1) {
  const g = new THREE.Group();
  spinningWasherDrums.length = 0;

  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(9.8, 0.32, 1.35),
    new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.4 })
  );
  awning.position.set(0, 2.75, 2.85);
  awning.rotation.x = 0.18;

  const signBoard = new THREE.Mesh(
    new THREE.BoxGeometry(6.8, 0.58, 0.24),
    new THREE.MeshStandardMaterial({
      color: 0x818cf8,
      emissive: 0x6366f1,
      emissiveIntensity: 0.55
    })
  );
  signBoard.position.set(0, 3.22, 2.55);
  g.add(awning, signBoard);

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.28 });
  const topGoldMat = new THREE.MeshStandardMaterial({ color: level >= 3 ? 0xfef08a : 0xe0f2fe, roughness: 0.3 });
  const rimMat = new THREE.MeshStandardMaterial({
    color: level >= 3 ? 0xeab308 : 0x38bdf8,
    metalness: 0.65,
    roughness: 0.2
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    transparent: true,
    opacity: 0.34,
    roughness: 0.06
  });

  // 3연동 대형 드럼세탁기 + (Lv.2 이상 시 2단 건조기 타워까지!)
  [-2.8, -0.8, 1.2].forEach((wx, idx) => {
    const wUnit = new THREE.Group();
    wUnit.position.set(wx, 0, -1.85);

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.65, 1.78, 1.15), bodyMat);
    chassis.position.y = 0.89;
    const ctrlPanel = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.28, 1.17), topGoldMat);
    ctrlPanel.position.y = 1.62;

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.075, 12, 24), rimMat);
    rim.position.set(0, 0.82, 0.59);
    const doorGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.05, 20), glassMat);
    doorGlass.rotation.x = Math.PI / 2;
    doorGlass.position.set(0, 0.82, 0.6);

    // 유리창 내부에서 실시간 빙글빙글 회전할 세탁물 3D 그룹!
    const drumClothes = new THREE.Group();
    drumClothes.position.set(0, 0.82, 0.44);
    const clothColors = [0xfb7185, 0xfde047, 0x38bdf8, 0xa7f3d0];
    for (let k = 0; k < 4; k++) {
      const ang = (Math.PI / 2) * k;
      const cloth = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.17, 1),
        new THREE.MeshStandardMaterial({ color: clothColors[(k + idx) % clothColors.length], roughness: 0.75 })
      );
      cloth.position.set(Math.cos(ang) * 0.22, Math.sin(ang) * 0.22, 0);
      drumClothes.add(cloth);
    }
    spinningWasherDrums.push(drumClothes);

    wUnit.add(chassis, ctrlPanel, rim, doorGlass, drumClothes);

    // Lv.2 이상: 상단 스팀 건조기 유닛 적층
    if (level >= 2 && idx < 2) {
      const dryer = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.92, 1.1), topGoldMat);
      dryer.position.y = 2.24;
      const dRim = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.05, 10, 20), rimMat);
      dRim.position.set(0, 2.22, 0.56);
      wUnit.add(dryer, dRim);
    }

    g.add(wUnit);
  });

  // 우측 세제 자판기 & 빨래 폴딩 테이블 & 세탁 바구니
  const tableGroup = new THREE.Group();
  tableGroup.position.set(3.35, 0, 0.45);
  const foldTable = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.86, 0.95),
    new THREE.MeshStandardMaterial({ color: 0xfed7aa, roughness: 0.5 })
  );
  foldTable.position.y = 0.43;
  const basket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.28, 0.36, 16),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4 })
  );
  basket.position.set(0, 1.04, 0);
  const towel = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 })
  );
  towel.scale.set(1, 0.55, 1);
  towel.position.set(0, 1.22, 0);
  tableGroup.add(foldTable, basket, towel);
  g.add(tableGroup);

  const washLight = new THREE.PointLight(0xe0f7ff, 1.35, 11, 1.5);
  washLight.position.set(0, 2.5, 0.5);
  g.add(washLight);

  return enableShadows(g);
}

// [3D Chibi 입주민 캐릭터 조립 createTenant3DMesh] 머리 + 헤어 + 눈/볼터치 + 액세서리 + 몸통 + 움직이는 양팔/양다리
function createTenant3DMesh(tenant) {
  const g = new THREE.Group();
  const st = tenant.style || TENANT_JOBS[0].style;

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdbb5, roughness: 0.55 });
  const hairMat = new THREE.MeshStandardMaterial({ color: st.hairColor || '#292524', roughness: 0.65 });
  const outfitMat = new THREE.MeshStandardMaterial({ color: st.outfitColor || '#3b82f6', roughness: 0.55 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: st.pantsColor || '#1e3a8a', roughness: 0.65 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
  const blushMat = new THREE.MeshBasicMaterial({ color: 0xfb7185 });

  // 다리 2개
  const legGeo = new THREE.CapsuleGeometry(0.085, 0.18, 6, 10);
  const legL = new THREE.Mesh(legGeo, pantsMat);
  legL.position.set(-0.12, 0.2, 0);
  const legR = new THREE.Mesh(legGeo, pantsMat);
  legR.position.set(0.12, 0.2, 0);

  // 통통한 몸통
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.44, 14), outfitMat);
  torso.position.y = 0.52;

  // 양팔
  const armGeo = new THREE.CapsuleGeometry(0.068, 0.2, 6, 10);
  const armL = new THREE.Mesh(armGeo, outfitMat);
  armL.position.set(-0.28, 0.54, 0);
  armL.rotation.z = 0.22;
  const armR = new THREE.Mesh(armGeo, outfitMat);
  armR.position.set(0.28, 0.54, 0);
  armR.rotation.z = -0.22;

  // 큰 2등신 머리 그룹
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.02;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 18), skinMat);
  head.scale.set(1.06, 0.96, 1.0);

  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.62),
    hairMat
  );
  hairCap.position.y = 0.03;
  hairCap.rotation.x = -0.18;

  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 10), eyeMat);
  eyeL.position.set(-0.11, -0.02, 0.29);
  const eyeR = eyeL.clone();
  eyeR.position.set(0.11, -0.02, 0.29);

  const blushL = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), blushMat);
  blushL.scale.set(1.2, 0.65, 0.4);
  blushL.position.set(-0.19, -0.08, 0.27);
  const blushR = blushL.clone();
  blushR.position.set(0.19, -0.08, 0.27);

  headGroup.add(head, hairCap, eyeL, eyeR, blushL, blushR);

  // 직업별 3D 액세서리 파츠
  if (st.accessory === 'glasses' || st.accessory === 'goldglasses') {
    const gMat = new THREE.MeshStandardMaterial({
      color: st.accessory === 'goldglasses' ? 0xfacc15 : 0x1e293b,
      metalness: 0.6
    });
    const r1 = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.014, 8, 16), gMat);
    r1.position.set(-0.11, -0.02, 0.32);
    const r2 = r1.clone();
    r2.position.set(0.11, -0.02, 0.32);
    headGroup.add(r1, r2);
  } else if (st.accessory === 'beret') {
    const beret = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.22, 0.1, 16),
      new THREE.MeshStandardMaterial({ color: 0xa855f7 })
    );
    beret.position.set(0.05, 0.28, 0);
    beret.rotation.z = -0.22;
    headGroup.add(beret);
  } else if (st.accessory === 'headset') {
    const hsMat = new THREE.MeshStandardMaterial({ color: 0xec4899 });
    const cupL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 12), hsMat);
    cupL.rotation.z = Math.PI / 2;
    cupL.position.set(-0.34, 0.02, 0);
    const cupR = cupL.clone();
    cupR.position.set(0.34, 0.02, 0);
    headGroup.add(cupL, cupR);
  } else if (st.accessory === 'catpin') {
    const earMat = new THREE.MeshStandardMaterial({ color: 0xfb923c });
    const e1 = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.18, 4), earMat);
    e1.position.set(-0.18, 0.32, 0.05);
    const e2 = e1.clone();
    e2.position.set(0.18, 0.32, 0.05);
    headGroup.add(e1, e2);
  }

  g.add(legL, legR, torso, armL, armR, headGroup);
  g.userData.parts = { legL, legR, armL, armR, headGroup };
  return enableShadows(g);
}

// 고양이 집사 전용 3D 치즈냥이 메쉬
function createCat3DMesh() {
  const g = new THREE.Group();
  const catMat = new THREE.MeshStandardMaterial({ color: 0xfb923c, roughness: 0.65 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.22, 8, 12), catMat);
  body.rotation.x = Math.PI / 2;
  body.position.y = 0.14;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), catMat);
  head.position.set(0, 0.24, 0.18);
  const earL = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 4), catMat);
  earL.position.set(-0.07, 0.36, 0.18);
  const earR = earL.clone();
  earR.position.set(0.07, 0.36, 0.18);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.26, 8), catMat);
  tail.position.set(0, 0.24, -0.2);
  tail.rotation.x = -0.6;
  g.add(body, head, earL, earR, tail);
  return enableShadows(g);
}

// =========================================================
// 3. Three.js 씬 & 쿼터뷰 카메라 & 전체 3D 단지 건축 초기화
// =========================================================
function initThreeScene() {
  scene = new THREE.Scene();

  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.OrthographicCamera(
    (-FRUSTUM_SIZE * aspect) / 2,
    (FRUSTUM_SIZE * aspect) / 2,
    FRUSTUM_SIZE / 2,
    -FRUSTUM_SIZE / 2,
    -90,
    220
  );
  camera.position.copy(DEFAULT_CAM_OFFSET.clone().add(DEFAULT_TARGET));
  camera.zoom = 1.02;
  camera.updateProjectionMatrix();

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  dom.webglContainer.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(DEFAULT_TARGET);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minZoom = 0.55;
  controls.maxZoom = 3.2;
  controls.minPolarAngle = Math.PI * 0.14;
  controls.maxPolarAngle = Math.PI * 0.43;
  controls.screenSpacePanning = true;
  controls.update();

  // 따뜻한 환경광 + 그림자 태양광 + 보조 채광
  hemiLight = new THREE.HemisphereLight(0xfff8eb, 0xd4a373, 0.98);
  scene.add(hemiLight);

  sunLight = new THREE.DirectionalLight(0xfff0cc, 1.55);
  sunLight.position.set(22, 36, 24);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -24;
  sunLight.shadow.camera.right = 24;
  sunLight.shadow.camera.top = 24;
  sunLight.shadow.camera.bottom = -24;
  sunLight.shadow.camera.near = 4;
  sunLight.shadow.camera.far = 95;
  sunLight.shadow.bias = -0.0006;
  sunLight.shadow.normalBias = 0.025;
  scene.add(sunLight);

  const fillLight = new THREE.DirectionalLight(0xffd8be, 0.45);
  fillLight.position.set(-20, 18, 16);
  scene.add(fillLight);

  buildWorldArchitecture();
  buildAllRooms3D();
  buildAllShops3D();
}

// 디오라마 대지, 도로, 나무, 가로등, 벤치, 복도, 계단실, 옥상 테라스 조립
function buildWorldArchitecture() {
  const arch = new THREE.Group();

  // 1) 원목 디오라마 베이스 보드 & 잔디 정원
  const woodBoard = new THREE.Mesh(
    new THREE.BoxGeometry(36.5, 1.1, 33.5),
    new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.65 })
  );
  woodBoard.position.set(0, -0.65, 3.6);
  woodBoard.receiveShadow = true;

  const grassTop = new THREE.Mesh(
    new THREE.BoxGeometry(35.6, 0.25, 32.6),
    new THREE.MeshStandardMaterial({ color: 0x86efac, roughness: 0.85 })
  );
  grassTop.position.set(0, -0.02, 3.6);
  grassTop.receiveShadow = true;
  arch.add(woodBoard, grassTop);

  // 2) 전면 보도블럭 광장 & 아스팔트 도로
  const sidewalk = new THREE.Mesh(
    new THREE.BoxGeometry(34.5, 0.18, 3.2),
    new THREE.MeshStandardMaterial({ color: 0xf5e0c8, roughness: 0.8 })
  );
  sidewalk.position.set(0, 0.14, 14.8);
  sidewalk.receiveShadow = true;

  const road = new THREE.Mesh(
    new THREE.BoxGeometry(35.2, 0.14, 3.8),
    new THREE.MeshStandardMaterial({ map: getRoadTex(), roughness: 0.85 })
  );
  road.position.set(0, 0.12, 18.2);
  road.receiveShadow = true;
  arch.add(sidewalk, road);

  // 3) 건물 하부 파스텔 벽돌 코어 필로티 구조체 (층간 지지 매스)
  const brickMat = new THREE.MeshStandardMaterial({ map: getBrickExteriorTex(), roughness: 0.75 });
  const slabMat = new THREE.MeshStandardMaterial({ color: 0xf5e6d3, roughness: 0.65 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0x8c4f2b, roughness: 0.5 });

  const core1F = new THREE.Mesh(new THREE.BoxGeometry(26.2, 3.5, 8.2), brickMat);
  core1F.position.set(0, 1.8, 3.4);
  core1F.castShadow = true;
  core1F.receiveShadow = true;

  const core2F = new THREE.Mesh(new THREE.BoxGeometry(26.2, 7.1, 7.6), brickMat);
  core2F.position.set(0, 3.6, -4.4);
  core2F.castShadow = true;
  core2F.receiveShadow = true;
  arch.add(core1F, core2F);

  // 4) 1층 & 2층 테라스 복도 슬래브 및 입체 원목 난간 기둥들
  const corr1F = new THREE.Mesh(new THREE.BoxGeometry(27.8, 0.32, 1.8), slabMat);
  corr1F.position.set(0.5, 3.46, 6.75);
  corr1F.castShadow = true;
  corr1F.receiveShadow = true;

  const corr2F = new THREE.Mesh(new THREE.BoxGeometry(27.8, 0.32, 1.8), slabMat);
  corr2F.position.set(0.5, 7.06, -0.45);
  corr2F.castShadow = true;
  corr2F.receiveShadow = true;
  arch.add(corr1F, corr2F);

  // 복도 난간 핸드레일 & 기둥 조립
  [
    { y: 3.62, z: 7.55 },
    { y: 7.22, z: 0.35 }
  ].forEach(({ y, z }) => {
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(26.0, 0.09, 0.1), railMat);
    topRail.position.set(-0.4, y + 0.76, z);
    arch.add(topRail);
    for (let x = -13.0; x <= 12.2; x += 1.4) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.76, 0.08), railMat);
      post.position.set(x, y + 0.38, z);
      post.castShadow = true;
      arch.add(post);
    }
  });

  // 5) 옥상 루프탑 테라코타 지붕 & 화단 크라운
  const roofDeck = new THREE.Mesh(
    new THREE.BoxGeometry(26.8, 0.65, 2.3),
    new THREE.MeshStandardMaterial({ color: 0xe07a5f, roughness: 0.55 })
  );
  roofDeck.position.set(0, 10.65, -8.4);
  roofDeck.castShadow = true;
  arch.add(roofDeck);

  // 6) 우측 외장 3D 계단 타워 (2F <-> 1F <-> 지상 광장 연결)
  for (let i = 0; i < 10; i++) {
    const step1 = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.34, 0.68), slabMat);
    step1.position.set(13.9, 0.35 + i * 0.34, 13.4 - i * 0.66);
    step1.castShadow = true;
    step1.receiveShadow = true;
    arch.add(step1);

    const step2 = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.36, 0.72), slabMat);
    step2.position.set(13.9, 3.75 + i * 0.35, 6.4 - i * 0.68);
    step2.castShadow = true;
    step2.receiveShadow = true;
    arch.add(step2);
  }

  // 7) 중앙 1층 공동현관 & 스마트 무인택배함 포티코
  const lobbyGroup = new THREE.Group();
  lobbyGroup.position.set(0, 0.2, 10.6);
  const lobbyFloor = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.2, 5.4), slabMat);
  const lobbyBack = new THREE.Mesh(new THREE.BoxGeometry(4.8, 3.1, 0.3), brickMat);
  lobbyBack.position.set(0, 1.55, -2.55);
  const parcelLocker = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 2.1, 0.65),
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.45 })
  );
  parcelLocker.position.set(-1.1, 1.15, -2.0);
  const glassEntrance = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 2.3, 0.12),
    new THREE.MeshStandardMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.55 })
  );
  glassEntrance.position.set(1.0, 1.25, -2.2);
  lobbyGroup.add(lobbyFloor, lobbyBack, parcelLocker, glassEntrance);
  enableShadows(lobbyGroup);
  arch.add(lobbyGroup);

  // 8) 단지 주변 귀여운 다중 구체 3D 가로수 4그루 + 원목 벤치 2개 + 가로등 2개
  [[-15.2, 13.8], [15.5, 13.8], [-15.4, 2.5], [15.8, -3.5]].forEach(([tx, tz]) => {
    arch.add(createTree3D(tx, tz));
  });
  [[-11.5, 14.6], [11.5, 14.6]].forEach(([bx, bz]) => {
    arch.add(createParkBench3D(bx, bz));
  });
  [[-4.2, 14.5], [4.2, 14.5]].forEach(([lx, lz]) => {
    arch.add(createStreetLamp3D(lx, lz));
  });

  // 9) 도로 위 달리는 3D 배달 스쿠터 & 3D 파스텔 미니카
  streetVehicles.scooter = createDeliveryScooter3D();
  streetVehicles.scooter.position.set(-16, 0.22, 17.4);
  arch.add(streetVehicles.scooter);

  streetVehicles.car = createMiniCar3D();
  streetVehicles.car.position.set(16, 0.22, 19.0);
  streetVehicles.car.rotation.y = Math.PI;
  arch.add(streetVehicles.car);

  scene.add(arch);
}

function createTree3D(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0.1, z);
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.34, 1.7, 10),
    new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 })
  );
  trunk.position.y = 0.85;
  const leafMat1 = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.65 });
  const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.65 });
  const c1 = new THREE.Mesh(new THREE.SphereGeometry(1.15, 14, 12), leafMat1);
  c1.position.set(0, 2.35, 0);
  const c2 = new THREE.Mesh(new THREE.SphereGeometry(0.82, 12, 10), leafMat2);
  c2.position.set(-0.62, 1.95, 0.35);
  const c3 = new THREE.Mesh(new THREE.SphereGeometry(0.82, 12, 10), leafMat2);
  c3.position.set(0.65, 2.0, -0.25);
  g.add(trunk, c1, c2, c3);
  return enableShadows(g);
}

function createParkBench3D(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0.22, z);
  const wMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.55 });
  const iMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.5), wMat);
  seat.position.y = 0.36;
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.38, 0.08), wMat);
  back.position.set(0, 0.6, -0.22);
  const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.38, 0.5), iMat);
  leg1.position.set(-0.65, 0.19, 0);
  const leg2 = leg1.clone();
  leg2.position.set(0.65, 0.19, 0);
  g.add(seat, back, leg1, leg2);
  return enableShadows(g);
}

function createStreetLamp3D(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0.22, z);
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.09, 2.8, 10),
    new THREE.MeshStandardMaterial({ color: 0x451a03, metalness: 0.4 })
  );
  pole.position.y = 1.4;
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 14, 12),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfbbf24, emissiveIntensity: 0.9 })
  );
  bulb.position.y = 2.88;
  g.add(pole, bulb);
  return enableShadows(g);
}

function createDeliveryScooter3D() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.45, 0.52),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.35 })
  );
  body.position.y = 0.42;
  const foodBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.46, 0.48),
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.4 })
  );
  foodBox.position.set(-0.36, 0.85, 0);
  const wMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
  const w1 = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 14), wMat);
  w1.rotation.x = Math.PI / 2;
  w1.position.set(-0.42, 0.24, 0);
  const w2 = w1.clone();
  w2.position.set(0.45, 0.24, 0);
  g.add(body, foodBox, w1, w2);
  return enableShadows(g);
}

function createMiniCar3D() {
  const g = new THREE.Group();
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 0.56, 1.15),
    new THREE.MeshStandardMaterial({ color: 0xfda4af, roughness: 0.3 })
  );
  chassis.position.y = 0.42;
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.25, 0.48, 1.02),
    new THREE.MeshStandardMaterial({ color: 0xfff1f2, roughness: 0.25 })
  );
  cabin.position.set(-0.1, 0.92, 0);
  const wMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
  [[-0.65, -0.58], [0.65, -0.58], [-0.65, 0.58], [0.65, 0.58]].forEach(([wx, wz]) => {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.18, 14), wMat);
    wh.rotation.x = Math.PI / 2;
    wh.position.set(wx, 0.26, wz);
    g.add(wh);
  });
  g.add(chassis, cabin);
  return enableShadows(g);
}

// =========================================================
// 4. '더 테넌츠' 스타일 3D 단면 벽체(Cutaway Walls) 호실 & 상가 빌드
// =========================================================
function buildAllRooms3D() {
  for (const room of state.rooms) {
    const root = new THREE.Group();
    root.position.set(room.cx, room.cy, room.cz);
    scene.add(root);

    // 선택 하이라이트 테두리
    const highlightRing = new THREE.Mesh(
      new THREE.BoxGeometry(WORLD_3D_CONFIG.roomWidth + 0.22, 0.12, WORLD_3D_CONFIG.roomDepth + 0.22),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.0 })
    );
    highlightRing.position.y = 0.04;
    root.add(highlightRing);

    const shellGroup = new THREE.Group();
    const slotsGroup = new THREE.Group();
    root.add(shellGroup, slotsGroup);

    room3DMap[room.id] = {
      root,
      shellGroup,
      slotsGroup,
      highlightRing,
      furnitureGroups: {}
    };

    rebuildRoom3D(room.id, null);
  }
}

function rebuildRoom3D(roomId, bounceKey = null) {
  const room = getRoomById(roomId);
  const entry = room3DMap[roomId];
  if (!room || !entry) return;

  // 기존 쉘 및 슬롯 클리어
  entry.shellGroup.clear();
  entry.slotsGroup.clear();

  const W = WORLD_3D_CONFIG.roomWidth;
  const D = WORLD_3D_CONFIG.roomDepth;
  const H = WORLD_3D_CONFIG.wallHeight;
  const wpLv = room.furniture.wallpaper || 0;

  // 바닥 텍스처 선택 (Lv.0 시멘트 -> Lv.1 파스텔 원목 -> Lv.2 헤링본 우드 -> Lv.3 비앙코 골드 대리석)
  const floorTex = wpLv === 0
    ? getCrackedCementTex()
    : wpLv === 1
      ? getPastelWoodTex()
      : wpLv === 2
        ? getHerringboneWoodTex()
        : getMarbleGoldTex();

  const floorSlab = new THREE.Mesh(
    new THREE.BoxGeometry(W, 0.26, D),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: wpLv >= 3 ? 0.22 : 0.62 })
  );
  floorSlab.position.y = -0.13;
  floorSlab.receiveShadow = true;
  floorSlab.userData.roomId = room.id;
  entry.shellGroup.add(floorSlab);
  registerPickable(floorSlab);

  // 단면 벽체(Cutaway Walls): 뒷벽은 높게(3.1m), 좌/우 벽은 계단식 단면, 앞쪽 벽은 시야 확보용 낮은 단면(0.45m + 문 개구부)
  const innerWallMat = new THREE.MeshStandardMaterial({ map: getWallTex(wpLv), roughness: 0.72 });
  const wallTopCapMat = new THREE.MeshStandardMaterial({
    color: wpLv >= 3 ? 0xfef3c7 : 0xfff8f0,
    roughness: 0.5
  });

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.24), innerWallMat);
  backWall.position.set(0, H / 2, -D / 2 + 0.12);
  backWall.userData.roomId = room.id;

  // 좌측/우측 벽: 뒤쪽 절반은 높고 앞쪽 절반은 낮게 컷어웨이되어 쿼터뷰 시야 100% 확보!
  const leftWallBack = new THREE.Mesh(new THREE.BoxGeometry(0.24, H, D * 0.52), innerWallMat);
  leftWallBack.position.set(-W / 2 + 0.12, H / 2, -D * 0.24);
  const leftWallFront = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.95, D * 0.48), wallTopCapMat);
  leftWallFront.position.set(-W / 2 + 0.12, 0.475, D * 0.26);

  const rightWallBack = leftWallBack.clone();
  rightWallBack.position.x = W / 2 - 0.12;
  const rightWallFront = leftWallFront.clone();
  rightWallFront.position.x = W / 2 - 0.12;

  // 앞쪽 낮은 단면 벽 (중앙 현관문 오프닝 분리)
  const frontLowL = new THREE.Mesh(new THREE.BoxGeometry(W * 0.38, 0.42, 0.24), wallTopCapMat);
  frontLowL.position.set(-W * 0.31, 0.21, D / 2 - 0.12);
  const frontLowR = frontLowL.clone();
  frontLowR.position.set(W * 0.31, 0.21, D / 2 - 0.12);

  [backWall, leftWallBack, leftWallFront, rightWallBack, rightWallFront, frontLowL, frontLowR].forEach((m) => {
    m.castShadow = true;
    m.receiveShadow = true;
    m.userData.roomId = room.id;
    entry.shellGroup.add(m);
    registerPickable(m);
  });

  // 미개방(분양 전) 호실은 반투명 우드 커버 표시
  if (!room.unlocked) {
    const cover = new THREE.Mesh(
      new THREE.BoxGeometry(W - 0.5, 0.18, D - 0.5),
      new THREE.MeshStandardMaterial({ color: 0x78350f, transparent: true, opacity: 0.55 })
    );
    cover.position.y = 0.2;
    cover.userData.roomId = room.id;
    entry.shellGroup.add(cover);
    registerPickable(cover);
    return;
  }

  // 철거 전(Lv.0)에는 먼지 더미와 이사 박스 배치
  if (wpLv === 0) {
    entry.slotsGroup.add(createDebrisMesh());
  }

  // 1) 침대 & 스탠드 조명 그룹 (좌측 상단 코너)
  const bedMesh = createBedMesh(room.furniture.bed);
  bedMesh.position.set(-2.55, 0, -1.55);
  entry.slotsGroup.add(bedMesh);
  if (bounceKey === 'bed') triggerDropBounce(bedMesh, room.cx - 2.55, room.cy, room.cz - 1.55);

  // 2) 욕실 유리 샤워부스 그룹 (우측 상단 코너)
  const bathMesh = createBathroomMesh(room.furniture.shower);
  bathMesh.position.set(2.55, 0, -1.75);
  entry.slotsGroup.add(bathMesh);
  if (bounceKey === 'shower') triggerDropBounce(bathMesh, room.cx + 2.55, room.cy, room.cz - 1.75);

  // 3) 주방 & 냉장고 그룹 (좌측 하단 코너)
  const kitchenMesh = createKitchenMesh(room.furniture.kitchen);
  kitchenMesh.position.set(-2.25, 0, 2.25);
  entry.slotsGroup.add(kitchenMesh);
  if (bounceKey === 'kitchen') triggerDropBounce(kitchenMesh, room.cx - 2.25, room.cy, room.cz + 2.25);

  // 4) 소파 & 러그 & 노트북 데스크 그룹 (우측 하단 ~ 중앙)
  const deskMesh = createLivingDeskMesh(room.furniture.desk);
  deskMesh.position.set(2.05, 0, 1.85);
  entry.slotsGroup.add(deskMesh);
  if (bounceKey === 'desk') triggerDropBounce(deskMesh, room.cx + 2.05, room.cy, room.cz + 1.85);

  // 5) 창호 & 에어컨 & 화분 그룹
  const acMesh = createWallDecorAndACMesh(room.furniture.ac);
  entry.slotsGroup.add(acMesh);
  if (bounceKey === 'ac') triggerDropBounce(acMesh, room.cx, room.cy + 1.2, room.cz - 2.2);

  // 고양이 집사 입주 시 3D 치즈냥이 러그 위 배치!
  if (room.tenant && room.tenant.style && room.tenant.style.hasCat) {
    const cat = createCat3DMesh();
    cat.position.set(0.3, 0.03, 0.85);
    cat.rotation.y = 0.6;
    entry.slotsGroup.add(cat);
  }

  if (bounceKey === 'wallpaper') {
    spawn3DSparkles(room.cx, room.cy + 0.8, room.cz, 16);
  }
}

function buildAllShops3D() {
  for (const key of ['store', 'laundry']) {
    const shop = state.shops[key];
    const root = new THREE.Group();
    root.position.set(shop.cx, shop.cy, shop.cz);
    scene.add(root);

    const floorSlab = new THREE.Mesh(
      new THREE.BoxGeometry(shop.w, 0.24, shop.d),
      new THREE.MeshStandardMaterial({
        map: key === 'store' ? getPastelWoodTex() : getBathTileTex(2),
        roughness: 0.45
      })
    );
    floorSlab.position.y = -0.12;
    floorSlab.receiveShadow = true;
    floorSlab.userData.shopId = shop.id;

    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(shop.w, 3.1, 0.24),
      new THREE.MeshStandardMaterial({ color: 0xfffbeb, roughness: 0.65 })
    );
    backWall.position.set(0, 1.55, -shop.d / 2 + 0.12);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    backWall.userData.shopId = shop.id;

    const sideWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 2.2, shop.d),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.65 })
    );
    sideWall.position.set(key === 'store' ? -shop.w / 2 + 0.12 : shop.w / 2 - 0.12, 1.1, 0);
    sideWall.castShadow = true;
    sideWall.userData.shopId = shop.id;

    root.add(floorSlab, backWall, sideWall);
    registerPickable(floorSlab);
    registerPickable(backWall);
    registerPickable(sideWall);

    const contentGroup = new THREE.Group();
    root.add(contentGroup);
    shop3DMap[shop.id] = { root, contentGroup };
    rebuildShop3D(shop.id, false);
  }
}

function rebuildShop3D(shopId, withBounce = false) {
  const shop = state.shops[shopId];
  const entry = shop3DMap[shopId];
  if (!shop || !entry) return;

  entry.contentGroup.clear();
  const mesh = shopId === 'store'
    ? createConvenienceStoreMesh(shop.level)
    : createLaundromatMesh(shop.level);

  mesh.traverse((c) => {
    if (c.isMesh) c.userData.shopId = shop.id;
  });
  entry.contentGroup.add(mesh);

  if (withBounce) {
    triggerDropBounce(mesh, shop.cx, shop.cy, shop.cz);
  }
}

function registerPickable(mesh) {
  if (!pickableMeshes.includes(mesh)) pickableMeshes.push(mesh);
}

// =========================================================
// 5. 가구 Drop & Bounce 애니메이션 & 3D 황금 코인 분수 물리 이펙트
// =========================================================
function easeOutBounce(t) {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) {
    const u = t - 1.5 / d1;
    return n1 * u * u + 0.75;
  }
  if (t < 2.5 / d1) {
    const u = t - 2.25 / d1;
    return n1 * u * u + 0.9375;
  }
  const u = t - 2.625 / d1;
  return n1 * u * u + 0.984375;
}

function triggerDropBounce(targetGroup, wx, wy, wz) {
  const baseY = targetGroup.position.y;
  targetGroup.position.y = baseY + 2.4;
  targetGroup.scale.set(0.4, 0.4, 0.4);
  activeBounces.push({
    obj: targetGroup,
    baseY,
    elapsed: 0,
    duration: 0.68
  });
  spawn3DSparkles(wx, wy + 0.9, wz, 14);
}

function spawn3DSparkles(wx, wy, wz, count = 12) {
  const colors = [0xfde047, 0x34d399, 0xf472b6, 0x38bdf8, 0xffffff];
  for (let i = 0; i < count; i++) {
    const p = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.14, 0),
      new THREE.MeshBasicMaterial({ color: colors[i % colors.length] })
    );
    p.position.set(wx, wy, wz);
    const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const spd = 2.5 + Math.random() * 2.8;
    scene.add(p);
    active3DParticles.push({
      mesh: p,
      vx: Math.cos(ang) * spd,
      vy: 2.5 + Math.random() * 3.0,
      vz: Math.sin(ang) * spd,
      gravity: 9.5,
      floorY: wy - 0.7,
      life: 0.95,
      maxLife: 0.95,
      spin: 6.0
    });
  }
}

// 호실 타이머 완료 시 해당 방 한가운데서 솟구치는 3D 황금 코인 분수!
function spawn3DCoinFountain(wx, wy, wz, count = 13) {
  const coinGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.06, 16);
  const coinMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xd97706,
    emissiveIntensity: 0.35,
    metalness: 0.82,
    roughness: 0.18
  });

  for (let i = 0; i < count; i++) {
    const coin = new THREE.Mesh(coinGeo, coinMat);
    coin.position.set(wx + (Math.random() - 0.5) * 0.5, wy + 0.4, wz + (Math.random() - 0.5) * 0.5);
    coin.rotation.x = Math.random() * Math.PI;
    coin.castShadow = true;
    scene.add(coin);

    const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const horiz = 1.4 + Math.random() * 2.2;
    active3DParticles.push({
      mesh: coin,
      vx: Math.cos(ang) * horiz,
      vy: 5.2 + Math.random() * 3.4,
      vz: Math.sin(ang) * horiz,
      gravity: 13.5,
      floorY: wy + 0.12,
      life: 1.45,
      maxLife: 1.45,
      spin: 9.5
    });
  }
}

function tickBouncesAndParticles(dt) {
  for (let i = activeBounces.length - 1; i >= 0; i--) {
    const b = activeBounces[i];
    b.elapsed += dt;
    const t = Math.min(1, b.elapsed / b.duration);
    const e = easeOutBounce(t);
    b.obj.position.y = b.baseY + (1 - e) * 2.4;
    const s = 0.4 + 0.6 * Math.min(1, t * 2.2);
    b.obj.scale.set(s, s, s);
    if (t >= 1) {
      b.obj.position.y = b.baseY;
      b.obj.scale.set(1, 1, 1);
      activeBounces.splice(i, 1);
    }
  }

  for (let i = active3DParticles.length - 1; i >= 0; i--) {
    const p = active3DParticles[i];
    p.life -= dt;
    if (p.life <= 0) {
      scene.remove(p.mesh);
      active3DParticles.splice(i, 1);
      continue;
    }
    p.vy -= p.gravity * dt;
    p.mesh.position.x += p.vx * dt;
    p.mesh.position.y += p.vy * dt;
    p.mesh.position.z += p.vz * dt;
    p.mesh.rotation.x += p.spin * dt;
    p.mesh.rotation.y += p.spin * 0.8 * dt;

    if (p.mesh.position.y < p.floorY) {
      p.mesh.position.y = p.floorY;
      p.vy = Math.abs(p.vy) * 0.45;
      p.vx *= 0.75;
      p.vz *= 0.75;
    }
    if (p.life < 0.3) {
      const sc = Math.max(0.05, p.life / 0.3);
      p.mesh.scale.setScalar(sc);
    }
  }
}

// =========================================================
// 6. 3D 좌표 투영(Vector3.project) 호실별 플로팅 월세 타이머 & 오버레이
// =========================================================
const tempProjVec = new THREE.Vector3();

function projectToScreen(wx, wy, wz) {
  tempProjVec.set(wx, wy, wz);
  tempProjVec.project(camera);
  return {
    x: (tempProjVec.x * 0.5 + 0.5) * window.innerWidth,
    y: (-tempProjVec.y * 0.5 + 0.5) * window.innerHeight,
    visible: tempProjVec.z < 1.1
  };
}

function initFloatingBadgesDOM() {
  dom.roomBadgesLayer.innerHTML = '';
  for (const room of state.rooms) {
    const btn = document.createElement('div');
    btn.className = 'floating-room-badge';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectRoom(room.id, true);
    });
    dom.roomBadgesLayer.appendChild(btn);
    roomBadgeEls[room.id] = btn;
    refreshRoomBadgeContent(room.id);
  }

  dom.shopBadgesLayer.innerHTML = '';
  for (const key of ['store', 'laundry']) {
    const shop = state.shops[key];
    const btn = document.createElement('div');
    btn.className = 'floating-shop-badge';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectShop(shop.id, true);
    });
    dom.shopBadgesLayer.appendChild(btn);
    shopBadgeEls[shop.id] = btn;
    refreshShopBadgeContent(shop.id);
  }
}

function refreshRoomBadgeContent(roomId) {
  const room = getRoomById(roomId);
  const el = roomBadgeEls[roomId];
  if (!room || !el) return;

  const isSelected = selection.type === 'room' && selection.id === roomId;
  const activeSet = getRoomThemeSet(room);
  const marketRent = calcRoomMarketRent(room);
  const effRent = getEffectiveRoomRent(room);

  el.classList.toggle('selected', isSelected);
  el.classList.toggle('locked', !room.unlocked);

  if (!room.unlocked) {
    el.innerHTML = `<div class="font-jua text-xs">🔒 ${room.name} · 분양 💰${room.unlockCost}만</div>`;
    return;
  }

  if (!room.tenant) {
    el.innerHTML = `
      <div class="flex items-center gap-1.5 font-jua text-xs text-amber-950">
        <span class="bg-amber-800 text-amber-100 px-2 py-0.2 rounded-full text-[11px]">${room.name}</span>
        ${activeSet ? `<span class="px-1.5 rounded-full text-[10px] ${activeSet.badgeClass}">${activeSet.icon}+${activeSet.bonusPct}%</span>` : ''}
        <span class="text-orange-700">🏡 공실 (${marketRent}만)</span>
      </div>
    `;
    return;
  }

  const remainSec = Math.max(1, Math.ceil(room.rentCycleSec - (room.rentTimer || 0)));
  const pct = Math.min(100, ((room.rentTimer || 0) / room.rentCycleSec) * 100);

  el.innerHTML = `
    <div class="flex items-center justify-between gap-2 font-jua text-xs">
      <span class="bg-amber-900 text-amber-200 px-2 py-0.2 rounded-full text-[11px]">${room.name}</span>
      ${activeSet ? `<span class="px-1.5 rounded-full text-[10px] ${activeSet.badgeClass}">${activeSet.icon}+${activeSet.bonusPct}%</span>` : ''}
      <span class="text-emerald-800">월세 +${effRent}만</span>
      <span class="text-amber-900" id="f-sec-${room.id}">⏱️ ${String(remainSec).padStart(2, '0')}s</span>
    </div>
    <div class="room-timer-bar-track">
      <div class="room-timer-bar-fill" id="f-bar-${room.id}" style="width:${pct.toFixed(1)}%"></div>
    </div>
  `;
}

function refreshShopBadgeContent(shopId) {
  const shop = state.shops[shopId];
  const el = shopBadgeEls[shopId];
  if (!shop || !el) return;
  const profit = shop.levels[shop.level].visitProfit;
  el.classList.toggle('selected', selection.type === 'shop' && selection.id === shopId);
  el.innerHTML = `${shop.icon} ${shop.name} Lv.${shop.level} <span class="text-emerald-800">· 방문 +${profit}만</span>`;
}

function update3DProjectedOverlays() {
  for (const room of state.rooms) {
    const el = roomBadgeEls[room.id];
    if (!el) continue;
    const pt = projectToScreen(room.cx, room.cy + 3.45, room.cz - 1.2);
    el.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
  }

  for (const key of ['store', 'laundry']) {
    const shop = state.shops[key];
    const el = shopBadgeEls[shop.id];
    if (!el) continue;
    const pt = projectToScreen(shop.cx, shop.cy + 3.8, shop.cz + 1.2);
    el.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
  }

  for (const roomId of Object.keys(tenant3DActors)) {
    const actor = tenant3DActors[roomId];
    if (actor.speechEl && !actor.speechEl.classList.contains('hidden')) {
      const pt = projectToScreen(actor.wx, actor.wy + 1.68, actor.wz);
      actor.speechEl.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
    }
  }

  for (const cb of activeCareBubbles) {
    const bob = Math.sin(performance.now() * 0.0045 + cb.phase) * 6;
    const pt = projectToScreen(cb.wx, cb.wy, cb.wz);
    cb.el.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${(pt.y + bob).toFixed(1)}px, 0) translate(-50%, -100%)`;
  }
}

function spawn3DJackpotText(wx, wy, wz, text, icon = '🪙') {
  const pt = projectToScreen(wx, wy, wz);
  const el = document.createElement('div');
  el.className = 'floating-jackpot-text';
  el.style.left = `${pt.x.toFixed(1)}px`;
  el.style.top = `${pt.y.toFixed(1)}px`;
  el.innerHTML = `<span>${icon}</span><span>${text}</span>`;
  dom.jackpotLayer.appendChild(el);
  setTimeout(() => el.remove(), 1800);
}

// =========================================================
// 7. 호실별 개별 월세 타이머 & 돌발 케어 이벤트 & 상가 연쇄 루프
// =========================================================
function tickRoomRentTimers(dt) {
  for (const room of state.rooms) {
    if (!room.unlocked || !room.tenant) continue;

    room.rentTimer = (room.rentTimer || 0) + dt;
    if (room.rentTimer >= room.rentCycleSec) {
      room.rentTimer = 0;
      collectRoomRent(room, false);
    } else {
      const remainSec = Math.max(1, Math.ceil(room.rentCycleSec - room.rentTimer));
      const pct = Math.min(100, (room.rentTimer / room.rentCycleSec) * 100);
      const secEl = document.getElementById(`f-sec-${room.id}`);
      const barEl = document.getElementById(`f-bar-${room.id}`);
      if (secEl) secEl.textContent = `⏱️ ${String(remainSec).padStart(2, '0')}s`;
      if (barEl) barEl.style.width = `${pct.toFixed(1)}%`;
    }
  }
}

function collectRoomRent(room, isInstantCare = false) {
  const rent = getEffectiveRoomRent(room);
  if (rent <= 0) return;

  state.stats.totalRentEarned += rent;
  addGold(rent);

  // 해당 호실 정중앙에서 3D 황금 코인 메쉬 분수 폭발 + "+72만 원!" 플로팅 텍스트!
  spawn3DCoinFountain(room.cx, room.cy + 0.35, room.cz + 0.2, 14);
  spawn3DJackpotText(
    room.cx,
    room.cy + 2.1,
    room.cz,
    `+${rent.toLocaleString()}만 원!`,
    isInstantCare ? '⚡즉시수금' : '🪙'
  );

  const secEl = document.getElementById(`f-sec-${room.id}`);
  const barEl = document.getElementById(`f-bar-${room.id}`);
  if (secEl) secEl.textContent = `⏱️ ${String(Math.ceil(room.rentCycleSec)).padStart(2, '0')}s`;
  if (barEl) barEl.style.width = '0%';
}

function tickCareBubbles(dt) {
  careSpawnCooldown -= dt;
  if (careSpawnCooldown <= 0) {
    careSpawnCooldown = 9.0 + Math.random() * 5.0;
    if (activeCareBubbles.length < 3) spawnRandomCareBubble();
  }
}

function spawnRandomCareBubble() {
  const unlockedRooms = state.rooms.filter((r) => r.unlocked);
  const template = pickRandom(CARE_BUBBLE_TYPES);
  const id = `care_${Date.now()}_${Math.floor(Math.random() * 999)}`;

  let wx = 0;
  let wy = 4.5;
  let wz = 3.0;
  let targetRoomId = null;

  if (template.targetType === 'shop') {
    const shop = state.shops[template.shopId] || state.shops.store;
    if (activeCareBubbles.some((b) => b.shopId === shop.id)) return;
    wx = shop.cx;
    wy = shop.cy + 2.4;
    wz = shop.cz + 1.5;
  } else {
    const occupied = unlockedRooms.filter((r) => r.tenant);
    const pool = occupied.length > 0 ? occupied : unlockedRooms;
    const rm = pickRandom(pool);
    if (!rm || activeCareBubbles.some((b) => b.roomId === rm.id)) return;
    targetRoomId = rm.id;
    wx = rm.cx;
    wy = rm.cy + 2.25;
    wz = rm.cz + 0.8;
  }

  const btn = document.createElement('button');
  btn.className = 'floating-care-bubble';
  btn.innerHTML = `<span>${template.icon}</span><span>${template.label}!</span>`;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    resolveCareBubble(id);
  });
  dom.careLayer.appendChild(btn);

  activeCareBubbles.push({
    id,
    el: btn,
    wx,
    wy,
    wz,
    phase: Math.random() * 6,
    roomId: targetRoomId,
    shopId: template.shopId || null,
    template
  });
}

function resolveCareBubble(careId) {
  const idx = activeCareBubbles.findIndex((b) => b.id === careId);
  if (idx === -1) return;

  const cb = activeCareBubbles[idx];
  activeCareBubbles.splice(idx, 1);
  cb.el.remove();

  state.stats.careSolved += 1;
  const tpl = cb.template;
  const room = cb.roomId ? getRoomById(cb.roomId) : null;

  if (room && room.tenant && tpl.effectType === 'instant_rent') {
    room.rentTimer = 0;
    room.dust = 0;
    room.tenant.happiness = Math.min(100, room.tenant.happiness + 10);
    collectRoomRent(room, true);
    addGold(tpl.cashReward);
    if (tenant3DActors[room.id]) {
      showTenantSpeech(tenant3DActors[room.id], '갓물주님 빠른 케어 최고!! 월세 바로 보냈어요 💕', 4.0);
    }
  } else {
    if (room) room.dust = 0;
    addGold(tpl.cashReward);
    spawn3DCoinFountain(cb.wx, cb.wy - 1.2, cb.wz, 10);
    spawn3DJackpotText(cb.wx, cb.wy, cb.wz, `+${tpl.cashReward}만 원!`, tpl.icon);
  }

  showToast(tpl.toastMsg, 'emerald');
  saveGameState();
}

// 건물 내 1층 상가 연쇄 소비 루프
function tickBuildingShopChain(dt) {
  shopChainCooldown -= dt;
  if (shopChainCooldown > 0) return;
  shopChainCooldown = 11.5 + Math.random() * 5.5;

  const occupied = state.rooms.filter((r) => r.unlocked && r.tenant);
  if (occupied.length === 0) return;

  const rm = pickRandom(occupied);
  const useStore = Math.random() < 0.55;
  const shop = useStore ? state.shops.store : state.shops.laundry;
  const profit = shop.levels[shop.level].visitProfit;

  addGold(profit);
  state.stats.shopVisits += 1;
  spawn3DCoinFountain(shop.cx, shop.cy + 0.5, shop.cz + 1.2, 8);
  spawn3DJackpotText(shop.cx, shop.cy + 2.2, shop.cz + 1.2, `${shop.icon} 매출 +${profit}만!`, '✨');

  const actor = tenant3DActors[rm.id];
  if (actor && actor.speechTimer <= 0) {
    showTenantSpeech(
      actor,
      useStore ? '1층 편의점 간식 배달 도착! 🍙' : '1층 코인세탁소 세탁 대행 완료! 🧺',
      3.2
    );
  }
}

// =========================================================
// 8. 3D 입주민 캐릭터 이동 & 일상 행동 AI 상태 머신
// =========================================================
function syncTenantActors3D() {
  for (const rId of Object.keys(tenant3DActors)) {
    const rm = getRoomById(rId);
    if (!rm || !rm.tenant) {
      scene.remove(tenant3DActors[rId].mesh);
      tenant3DActors[rId].speechEl.remove();
      delete tenant3DActors[rId];
    }
  }
  for (const room of state.rooms) {
    if (room.unlocked && room.tenant && !tenant3DActors[room.id]) {
      createTenantActorForRoom(room, false);
    }
  }
}

function createTenantActorForRoom(room, isFreshMoveIn = false) {
  const mesh = createTenant3DMesh(room.tenant);
  const wx = room.cx + ROOM_3D_LOCAL_SPOTS.center.x;
  const wy = room.cy;
  const wz = room.cz + ROOM_3D_LOCAL_SPOTS.center.z;
  mesh.position.set(wx, wy, wz);
  scene.add(mesh);

  const speechEl = document.createElement('div');
  speechEl.className = 'floating-speech-bubble hidden';
  dom.speechLayer.appendChild(speechEl);

  const actor = {
    roomId: room.id,
    mesh,
    speechEl,
    wx,
    wy,
    wz,
    waypoints: [],
    state: 'IDLE',
    stateTimer: 2.0,
    speechTimer: 0,
    walkPhase: 0,
    outingPhase: null,
    targetShopId: null
  };

  tenant3DActors[room.id] = actor;
  if (isFreshMoveIn) {
    startTenantRoutine3D(actor, room, 'CLEANING', true);
  } else {
    pickNextTenantRoutine3D(actor, room);
  }
}

function showTenantSpeech(actor, text, sec = 4.2) {
  if (!actor || !actor.speechEl) return;
  actor.speechEl.textContent = text;
  actor.speechEl.classList.remove('hidden');
  actor.speechTimer = sec;
}

function pickNextTenantRoutine3D(actor, room) {
  const tenant = room.tenant;
  if (!tenant) return;
  const job = getJobData(tenant.jobId);
  const marketRent = calcRoomMarketRent(room);

  if (marketRent > tenant.maxBudget && Math.random() < 0.3) {
    actor.waypoints = [{ x: room.cx, y: room.cy, z: room.cz + 0.5 }];
    actor.state = 'IDLE';
    actor.stateTimer = 4.0;
    showTenantSpeech(actor, pickRandom(job.quotes.overbudget), 4.0);
    return;
  }

  if (room.furniture.wallpaper >= 1 && Math.random() < 0.25) {
    actor.waypoints = [{ x: room.cx + ROOM_3D_LOCAL_SPOTS.sofa.x, y: room.cy, z: room.cz + ROOM_3D_LOCAL_SPOTS.sofa.z }];
    actor.state = 'IDLE';
    actor.stateTimer = 4.0;
    showTenantSpeech(actor, pickRandom(job.quotes.ambient), 4.0);
    return;
  }

  // 1층 상가 외출 루틴 (30% 확률)
  if (Math.random() < 0.3) {
    const isStore = Math.random() < 0.55;
    const shop = isStore ? state.shops.store : state.shops.laundry;
    const sp = pickRandom(shop.spots);
    actor.state = isStore ? 'SHOPPING' : 'LAUNDRY';
    actor.outingPhase = 'GOING';
    actor.targetShopId = shop.id;
    actor.waypoints = [
      { x: room.cx, y: room.cy, z: room.corridorZ },
      { x: WORLD_3D_CONFIG.stairX, y: room.cy, z: room.corridorZ },
      { x: WORLD_3D_CONFIG.stairX, y: 0.3, z: 14.0 },
      { x: shop.doorX, y: 0.3, z: 14.0 },
      { x: sp.x, y: 0.3, z: sp.z }
    ];
    actor.stateTimer = 3.8;
    return;
  }

  const routines = ['WORKING', 'EATING', 'SHOWERING', 'SLEEPING', 'CLEANING'];
  startTenantRoutine3D(actor, room, pickRandom(routines), false);
}

function startTenantRoutine3D(actor, room, rName, isMoveIn = false) {
  const job = getJobData(room.tenant.jobId);
  actor.state = rName;

  if (rName === 'CLEANING') {
    actor.waypoints = ROOM_3D_LOCAL_SPOTS.cleanSpots.map((p) => ({
      x: room.cx + p.x,
      y: room.cy,
      z: room.cz + p.z
    }));
    actor.stateTimer = 4.8;
    showTenantSpeech(actor, isMoveIn ? '새 3D 하우스 입주! 반짝반짝 청소부터~ ✨' : pickRandom(job.quotes.cleaning), 4.4);
  } else if (rName === 'SHOWERING') {
    actor.waypoints = [{ x: room.cx + ROOM_3D_LOCAL_SPOTS.shower.x, y: room.cy + 0.14, z: room.cz + ROOM_3D_LOCAL_SPOTS.shower.z }];
    actor.stateTimer = 5.0;
  } else if (rName === 'EATING') {
    actor.waypoints = [
      { x: room.cx + ROOM_3D_LOCAL_SPOTS.kitchen.x, y: room.cy, z: room.cz + ROOM_3D_LOCAL_SPOTS.kitchen.z },
      { x: room.cx + ROOM_3D_LOCAL_SPOTS.sofa.x, y: room.cy, z: room.cz + ROOM_3D_LOCAL_SPOTS.sofa.z }
    ];
    actor.stateTimer = 5.0;
  } else if (rName === 'WORKING') {
    actor.waypoints = [{ x: room.cx + ROOM_3D_LOCAL_SPOTS.desk.x, y: room.cy, z: room.cz + ROOM_3D_LOCAL_SPOTS.desk.z }];
    actor.stateTimer = 5.5;
  } else if (rName === 'SLEEPING') {
    actor.waypoints = [{ x: room.cx + ROOM_3D_LOCAL_SPOTS.bed.x, y: room.cy + 0.35, z: room.cz + ROOM_3D_LOCAL_SPOTS.bed.z }];
    actor.stateTimer = 6.0;
  }
}

function tickTenantActors3D(dt) {
  const speed = 4.2;

  for (const room of state.rooms) {
    if (!room.unlocked || !room.tenant) continue;
    const actor = tenant3DActors[room.id];
    if (!actor) continue;

    if (actor.speechTimer > 0) {
      actor.speechTimer -= dt;
      if (actor.speechTimer <= 0) actor.speechEl.classList.add('hidden');
    }

    const parts = actor.mesh.userData.parts;

    if (actor.waypoints.length > 0) {
      const wp = actor.waypoints[0];
      const dx = wp.x - actor.wx;
      const dy = wp.y - actor.wy;
      const dz = wp.z - actor.wz;
      const dist = Math.hypot(dx, dy, dz);

      actor.walkPhase += dt * 13;
      const swing = Math.sin(actor.walkPhase) * 0.55;
      parts.legL.rotation.x = swing;
      parts.legR.rotation.x = -swing;
      parts.armL.rotation.x = -swing * 0.8;
      parts.armR.rotation.x = swing * 0.8;

      if (Math.hypot(dx, dz) > 0.02) {
        actor.mesh.rotation.y = Math.atan2(dx, dz);
      }

      const step = speed * dt;
      if (dist <= step) {
        actor.wx = wp.x;
        actor.wy = wp.y;
        actor.wz = wp.z;
        actor.waypoints.shift();
        if (actor.waypoints.length === 0) {
          onTenantArrived3D(actor, room);
        }
      } else {
        actor.wx += (dx / dist) * step;
        actor.wy += (dy / dist) * step;
        actor.wz += (dz / dist) * step;
      }

      actor.mesh.position.set(actor.wx, actor.wy + Math.abs(Math.sin(actor.walkPhase)) * 0.08, actor.wz);
      continue;
    }

    // 도착 후 포즈 리셋 및 상태 유지
    parts.legL.rotation.x = 0;
    parts.legR.rotation.x = 0;
    parts.armL.rotation.x = 0;
    parts.armR.rotation.x = 0;
    actor.mesh.position.set(actor.wx, actor.wy, actor.wz);

    actor.stateTimer -= dt;
    if (actor.stateTimer <= 0) {
      if ((actor.state === 'SHOPPING' || actor.state === 'LAUNDRY') && actor.outingPhase === 'AT_SHOP') {
        const shop = state.shops[actor.targetShopId];
        const profit = shop.levels[shop.level].visitProfit;
        addGold(profit);
        state.stats.shopVisits += 1;
        spawn3DCoinFountain(actor.wx, actor.wy + 0.5, actor.wz, 9);
        spawn3DJackpotText(actor.wx, actor.wy + 1.9, actor.wz, `${shop.icon} +${profit}만 원!`, '🪙');

        actor.outingPhase = 'RETURNING';
        actor.waypoints = [
          { x: shop.doorX, y: 0.3, z: 14.0 },
          { x: WORLD_3D_CONFIG.stairX, y: 0.3, z: 14.0 },
          { x: WORLD_3D_CONFIG.stairX, y: room.cy, z: room.corridorZ },
          { x: room.cx, y: room.cy, z: room.corridorZ },
          { x: room.cx, y: room.cy, z: room.cz + 0.5 }
        ];
        actor.stateTimer = 1.0;
        continue;
      }

      actor.mesh.rotation.x = 0;
      pickNextTenantRoutine3D(actor, room);
    }
  }
}

function onTenantArrived3D(actor, room) {
  const job = getJobData(room.tenant.jobId);
  if (actor.state === 'SHOWERING') {
    showTenantSpeech(actor, room.furniture.shower >= 1 ? pickRandom(job.quotes.shower) : '유리 샤워부스가 있으면 좋겠어요 🫧', 4.4);
  } else if (actor.state === 'EATING') {
    showTenantSpeech(actor, pickRandom(job.quotes.eating), 4.4);
  } else if (actor.state === 'WORKING') {
    actor.mesh.rotation.y = Math.PI;
    showTenantSpeech(actor, pickRandom(job.quotes.working), 4.6);
  } else if (actor.state === 'SLEEPING') {
    showTenantSpeech(actor, pickRandom(job.quotes.sleeping), 4.5);
  } else if ((actor.state === 'SHOPPING' || actor.state === 'LAUNDRY') && actor.outingPhase === 'GOING') {
    actor.outingPhase = 'AT_SHOP';
    showTenantSpeech(actor, pickRandom(actor.state === 'SHOPPING' ? job.quotes.store : job.quotes.laundry), 4.0);
  }
}

// =========================================================
// 9. 카메라 이동/회전 & UI 리모델링 / 입주 / 퇴거 / 퀘스트 연동
// =========================================================
function focusCameraOn3DPoint(tx, ty, tz, zoomLevel = 1.65) {
  const curOffset = camera.position.clone().sub(controls.target);
  camTween.targetLook.set(tx, ty, tz);
  camTween.targetPos.set(tx + curOffset.x, ty + curOffset.y, tz + curOffset.z);
  camTween.targetZoom = zoomLevel;
  camTween.active = true;
}

function resetCameraQuarterView() {
  const offset = CAM_AZIMUTHS[camAzimuthIndex];
  camTween.targetLook.copy(DEFAULT_TARGET);
  camTween.targetPos.copy(DEFAULT_TARGET).add(offset);
  camTween.targetZoom = 1.02;
  camTween.active = true;
}

function rotateCameraQuarterStep() {
  camAzimuthIndex = (camAzimuthIndex + 1) % CAM_AZIMUTHS.length;
  const offset = CAM_AZIMUTHS[camAzimuthIndex];
  camTween.targetLook.copy(controls.target);
  camTween.targetPos.copy(controls.target).add(offset);
  camTween.targetZoom = camera.zoom;
  camTween.active = true;
}

function getRoomById(id) {
  return state.rooms.find((r) => r.id === id);
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getJobData(jobId) {
  return TENANT_JOBS.find((j) => j.id === jobId) || TENANT_JOBS[0];
}

function updateRoomHighlights() {
  for (const r of state.rooms) {
    const entry = room3DMap[r.id];
    if (entry && entry.highlightRing) {
      entry.highlightRing.material.opacity = selection.type === 'room' && selection.id === r.id ? 0.75 : 0.0;
    }
    refreshRoomBadgeContent(r.id);
  }
  for (const sKey of ['store', 'laundry']) {
    refreshShopBadgeContent(sKey);
  }
}

function selectRoom(roomId, smoothFocus = true) {
  const room = getRoomById(roomId);
  if (!room) return;
  selection.type = 'room';
  selection.id = roomId;
  updateRoomHighlights();
  openRoomPanel(room);

  if (smoothFocus) {
    focusCameraOn3DPoint(room.cx, room.cy - 0.8, room.cz + 1.2, Math.max(camera.zoom, 1.58));
  }
}

function selectShop(shopId, smoothFocus = true) {
  const shop = state.shops[shopId];
  if (!shop) return;
  selection.type = 'shop';
  selection.id = shopId;
  updateRoomHighlights();
  openShopPanel(shop);

  if (smoothFocus) {
    focusCameraOn3DPoint(shop.cx, shop.cy - 0.4, shop.cz + 1.2, Math.max(camera.zoom, 1.48));
  }
}

function closeBottomPanel() {
  selection.type = null;
  selection.id = null;
  dom.bottomPanel.classList.add('translate-y-full');
  updateRoomHighlights();
}

// 2D 아바타 초상화 SVG (부동산 모집 카드 & 카톡 모달용)
function buildPortraitSVG(tenant) {
  const st = tenant.style || TENANT_JOBS[0].style;
  return `
    <svg width="48" height="52" viewBox="0 0 48 52">
      <circle cx="24" cy="21" r="15" fill="${st.hairColor}"/>
      <path d="M11 48 Q24 34 37 48 Z" fill="${st.outfitColor}" stroke="#451a03" stroke-width="2"/>
      <circle cx="24" cy="23" r="12.5" fill="#fed7aa" stroke="#7c2d12" stroke-width="1.8"/>
      <path d="M12 20 Q24 9 36 20 Q28 16 24 16 Q18 16 12 20 Z" fill="${st.hairColor}"/>
      <circle cx="19.5" cy="23.5" r="2" fill="#1e293b"/>
      <circle cx="28.5" cy="23.5" r="2" fill="#1e293b"/>
      <ellipse cx="16" cy="26.5" rx="2.8" ry="1.6" fill="#fb7185" opacity="0.6"/>
      <ellipse cx="32" cy="26.5" rx="2.8" ry="1.6" fill="#fb7185" opacity="0.6"/>
      <path d="M21 28 Q24 31 27 28" fill="none" stroke="#7c2d12" stroke-width="1.6" stroke-linecap="round"/>
    </svg>
  `;
}

function openRoomPanel(room) {
  dom.bottomPanel.classList.remove('translate-y-full');
  renderRoomPanelBody(room);
}

function renderRoomPanelBody(room) {
  const gradeInfo = getRoomInteriorGrade(room);
  const marketRent = calcRoomMarketRent(room);
  const activeSet = getRoomThemeSet(room);

  dom.panelRoomTitle.textContent = `🏠 ${room.name}`;
  dom.panelGradeBadge.textContent = gradeInfo.name;
  dom.panelGradeBadge.className = `font-jua text-xs px-2.5 py-0.5 rounded-full border ${gradeInfo.badgeClass}`;
  dom.panelRentBadge.textContent = room.unlocked ? `적정 월세 ${marketRent}만원 (${room.rentCycleSec}초 주기)` : '미개방 호실';

  if (!room.unlocked) {
    dom.panelBody.innerHTML = `
      <div class="bg-white border-2 border-amber-300 rounded-2xl p-5 text-center shadow-sm">
        <div class="text-3xl mb-1.5">🔑🏡</div>
        <div class="font-jua text-lg text-amber-950">${room.name} 3D 테라스 호실을 오픈할까요?</div>
        <p class="text-xs text-stone-600 mt-1">개방 즉시 다중 파츠 3D 가구 리노베이션과 독립 월세 수금이 시작됩니다!</p>
        <button id="btn-unlock-room" class="jelly-btn-amber mt-4 font-jua text-base px-6 py-2.5 rounded-2xl">
          🔓 ${room.name} 분양 오픈하기 (💰 ${room.unlockCost}만원)
        </button>
      </div>
    `;
    document.getElementById('btn-unlock-room').onclick = () => unlockRoom(room.id);
    return;
  }

  let tenantSectionHTML = '';
  if (!room.tenant) {
    tenantSectionHTML = `
      <div class="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-white border-2 border-amber-500 flex items-center justify-center text-2xl shrink-0">🏡</div>
          <div>
            <div class="font-jua text-sm sm:text-base text-amber-950">공실입니다! 리모델링 후 3D 입주민과 계약하세요</div>
            <div class="text-xs text-stone-600">모든 요소를 업그레이드하면 <b class="text-rose-700">[코지 우드 하우스 · 월세 +20%]</b> 등 세트 효과가 켜집니다!</div>
          </div>
        </div>
        <button id="btn-open-recruit" class="jelly-btn-mint w-full sm:w-auto shrink-0 font-jua text-sm px-4 py-2.5 rounded-2xl">
          📱 세입자 구하기 (부동산 앱)
        </button>
      </div>
    `;
  } else {
    const t = room.tenant;
    const job = getJobData(t.jobId);
    const isOverBudget = marketRent > t.maxBudget;
    const effRent = getEffectiveRoomRent(room);

    tenantSectionHTML = `
      <div class="${isOverBudget ? 'bg-rose-50 border-rose-300' : 'bg-white border-amber-300'} border-2 rounded-2xl p-3 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-3">
            <div class="w-12 h-13 rounded-2xl bg-amber-50 border-2 border-amber-800 flex items-center justify-center overflow-hidden shrink-0">
              ${buildPortraitSVG(t)}
            </div>
            <div>
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-jua text-base text-amber-950">${t.name}</span>
                <span class="font-jua text-[11px] text-white px-2 py-0.5 rounded-full" style="background:${job.badgeColor}">${job.jobName}</span>
                <span class="text-[11px] bg-amber-100 border border-amber-300 text-amber-900 px-2 py-0.5 rounded-full font-medium">${t.personality}</span>
              </div>
              <div class="text-xs text-stone-700 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span>💖 행복도 <b>${Math.round(t.happiness)}%</b></span>
                <span>💳 예산 한도 <b>${t.maxBudget}만</b></span>
                <span class="text-emerald-700 font-bold">⏱️ ${room.rentCycleSec}초마다 +${effRent}만원 코인분수!</span>
              </div>
            </div>
          </div>

          <button id="btn-evict-tenant" class="jelly-btn-rose font-jua text-xs sm:text-sm px-3.5 py-2 rounded-xl">
            ⚡ 계약 해지 / 내쫓기
          </button>
        </div>

        ${isOverBudget ? `
          <div class="mt-2 bg-rose-100 border border-rose-300 text-rose-900 rounded-xl px-3 py-1.5 text-xs font-medium">
            ⚠️ 호실 적정 월세(${marketRent}만)가 현재 입주민 예산(${t.maxBudget}만)을 넘었어요! [계약 해지] 후 상위 직업군 입주민과 계약해보세요!
          </div>
        ` : ''}
      </div>
    `;
  }

  const setBannerHTML = activeSet
    ? `<div class="px-3 py-1.5 rounded-xl font-jua text-xs flex items-center justify-between ${activeSet.badgeClass}">
         <span>✨ 세트 효과 발동 중: [${activeSet.badgeText}]</span>
         <span>풀옵션 조화 보너스 적용됨!</span>
       </div>`
    : `<div class="px-3 py-1.5 rounded-xl bg-amber-100/70 border border-amber-300 text-amber-900 font-jua text-xs">
         💡 6종 리모델링을 모두 Lv.1 / Lv.2 / Lv.3 달성 시 [세트 월세 보너스 +12%~35%]가 자동 발동됩니다!
       </div>`;

  const furnitureCardsHTML = Object.keys(FURNITURE_TREE).map((key) => {
    const item = FURNITURE_TREE[key];
    const curLv = room.furniture[key] || 0;
    const curData = item.levels[curLv];
    const nextData = item.levels[curLv + 1];
    const stars = [1, 2, 3].map((i) => (i <= curLv ? '⭐' : '☆')).join('');

    return `
      <div class="bg-white border-2 ${curLv >= 3 ? 'border-amber-400 bg-amber-50/40' : 'border-amber-200'} rounded-2xl p-2.5 flex flex-col justify-between gap-2 shadow-sm">
        <div>
          <div class="flex items-center justify-between">
            <span class="font-jua text-sm text-amber-950">${item.icon} ${item.label}</span>
            <span class="text-xs font-jua text-amber-600">${stars}</span>
          </div>
          <div class="text-[11px] font-bold text-stone-800 mt-0.5">[${curData.tier}] ${curData.name}</div>
          <div class="text-[11px] text-stone-500 leading-snug mt-0.5">${nextData ? `다음: ${nextData.name} (+${nextData.rentBonus - curData.rentBonus}만)` : '👑 최고급 3D 부티크 풀옵션!'}</div>
        </div>

        ${nextData ? `
          <button data-upgrade-key="${key}" class="btn-upgrade-furn w-full font-jua text-xs py-1.5 px-2.5 rounded-xl ${
            state.gold >= nextData.cost ? 'jelly-btn-amber' : 'bg-stone-200 text-stone-400 border-2 border-stone-300'
          }">
            ⬆️ Lv.${curLv + 1} 시공 (💰${nextData.cost}만)
          </button>
        ` : `
          <div class="w-full text-center font-jua text-xs py-1.5 rounded-xl bg-amber-100 text-amber-900 border border-amber-400">
            👑 MAX 풀옵션
          </div>
        `}
      </div>
    `;
  }).join('');

  dom.panelBody.innerHTML = `
    ${tenantSectionHTML}
    ${setBannerHTML}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
      ${furnitureCardsHTML}
    </div>
  `;

  const recruitBtn = document.getElementById('btn-open-recruit');
  if (recruitBtn) recruitBtn.onclick = () => openRecruitModal(room.id);
  const evictBtn = document.getElementById('btn-evict-tenant');
  if (evictBtn) evictBtn.onclick = () => evictTenant(room.id);
  dom.panelBody.querySelectorAll('.btn-upgrade-furn').forEach((btn) => {
    btn.onclick = () => upgradeFurniture(room.id, btn.dataset.upgradeKey);
  });
}

function openShopPanel(shop) {
  dom.bottomPanel.classList.remove('translate-y-full');
  const curLv = shop.level;
  const curInfo = shop.levels[curLv];
  const nextInfo = shop.levels[curLv + 1];

  dom.panelRoomTitle.textContent = `${shop.icon} ${shop.name}`;
  dom.panelGradeBadge.textContent = `1층 3D 상가 Lv.${curLv}`;
  dom.panelGradeBadge.className = 'font-jua text-xs px-2.5 py-0.5 rounded-full border bg-amber-100 text-amber-950 border-amber-400';
  dom.panelRentBadge.textContent = `방문/주문당 +${curInfo.visitProfit}만원`;

  dom.panelBody.innerHTML = `
    <div class="bg-white border-2 border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
      <div>
        <div class="font-jua text-base text-amber-950">[Lv.${curLv}] ${curInfo.title}</div>
        <p class="text-xs text-stone-600 mt-1">${curInfo.desc}</p>
        <p class="text-xs text-emerald-700 font-bold mt-1.5">💡 입주민들이 계단을 내려와 상가를 이용하거나 주문할 때마다 3D 코인 분수(+${curInfo.visitProfit}만)가 터집니다! (누적 ${state.stats.shopVisits}회)</p>
      </div>
      ${nextInfo ? `
        <button id="btn-upgrade-shop" class="w-full sm:w-auto shrink-0 font-jua text-sm px-5 py-3 rounded-2xl ${
          state.gold >= nextInfo.upgradeCost ? 'jelly-btn-amber' : 'bg-stone-200 text-stone-400 border-2 border-stone-300'
        }">
          ⬆️ Lv.${curLv + 1} 상가 리모델링 (💰${nextInfo.upgradeCost}만원)<br/>
          <span class="text-[11px]">매출 +${curInfo.visitProfit}만 ➔ +${nextInfo.visitProfit}만</span>
        </button>
      ` : `
        <div class="font-jua text-sm bg-amber-100 text-amber-950 border-2 border-amber-400 px-4 py-2.5 rounded-2xl">
          👑 최고 등급 플래그십 상가 완성!
        </div>
      `}
    </div>
  `;

  const upBtn = document.getElementById('btn-upgrade-shop');
  if (upBtn && nextInfo) {
    upBtn.onclick = () => {
      if (state.gold < nextInfo.upgradeCost) {
        showToast(`💸 리모델링 자금(${nextInfo.upgradeCost}만원)이 부족합니다!`, 'rose');
        return;
      }
      addGold(-nextInfo.upgradeCost);
      shop.level += 1;
      rebuildShop3D(shop.id, true);
      refreshShopBadgeContent(shop.id);
      showToast(`${shop.icon} ${shop.name} Lv.${shop.level} 3D 확장 완료!`, 'emerald');
      openShopPanel(shop);
      updateHudUI();
      updateQuestUI();
      saveGameState();
    };
  }
}

function unlockRoom(roomId) {
  const room = getRoomById(roomId);
  if (!room || room.unlocked) return;
  if (state.gold < room.unlockCost) {
    showToast(`💸 분양 자금(${room.unlockCost}만원)이 부족합니다!`, 'rose');
    return;
  }
  addGold(-room.unlockCost);
  room.unlocked = true;
  rebuildRoom3D(room.id, 'wallpaper');
  refreshRoomBadgeContent(room.id);
  showToast(`🎊 ${room.name} 3D 호실 오픈 완료! 지금 리모델링을 시작해보세요.`, 'emerald');
  renderRoomPanelBody(room);
  updateHudUI();
  updateQuestUI();
  saveGameState();
}

function upgradeFurniture(roomId, key) {
  const room = getRoomById(roomId);
  const tree = FURNITURE_TREE[key];
  if (!room || !tree) return;

  const prevSet = getRoomThemeSet(room);
  const curLv = room.furniture[key] || 0;
  const nextData = tree.levels[curLv + 1];
  if (!nextData) return;

  if (state.gold < nextData.cost) {
    showToast(`💸 시공 비용(${nextData.cost}만원)이 부족합니다!`, 'rose');
    return;
  }

  addGold(-nextData.cost);
  room.furniture[key] = curLv + 1;
  const newSet = getRoomThemeSet(room);

  // 3D 가구 즉시 재조립 + 위에서 아래로 통! 떨어지는 Drop & Bounce 연출!
  rebuildRoom3D(room.id, key);
  refreshRoomBadgeContent(room.id);

  if (room.tenant) {
    room.tenant.happiness = Math.min(100, room.tenant.happiness + 9);
    const actor = tenant3DActors[room.id];
    if (actor) {
      showTenantSpeech(actor, `우와!! 새 ${tree.label} 너무 예뻐요!! ✨`, 4.0);
    }
  }

  if (newSet && (!prevSet || newSet.minLevel > prevSet.minLevel)) {
    spawn3DCoinFountain(room.cx, room.cy + 0.5, room.cz, 12);
    showToast(`🎊 [${newSet.badgeText}] 세트 효과 발동!!`, 'emerald');
  } else {
    showToast(`🛠️ ${room.name} [${tree.label}] Lv.${curLv + 1} 시공 완료! (월세 ${calcRoomMarketRent(room)}만)`, 'emerald');
  }

  renderRoomPanelBody(room);
  updateHudUI();
  updateQuestUI();
  saveGameState();
}

// =========================================================
// 10. 입주민 모집 모달 & 강제 퇴거 & 퀘스트 & 카톡 민원
// =========================================================
function openRecruitModal(roomId) {
  const room = getRoomById(roomId);
  if (!room || !room.unlocked || room.tenant) return;
  recruitTargetRoomId = roomId;
  currentApplicants = generateApplicants(room);
  renderRecruitCards(room);
  dom.recruitModal.classList.remove('hidden');
}

function generateApplicants(room) {
  const marketRent = calcRoomMarketRent(room);
  const affordable = TENANT_JOBS.filter((j) => j.maxBudget >= marketRent - 12);
  const pool = affordable.length >= 2 ? affordable : TENANT_JOBS;
  const chosen = [...pool].sort(() => Math.random() - 0.5).slice(0, 2);
  const rest = TENANT_JOBS.filter((j) => !chosen.includes(j));
  chosen.push(pickRandom(rest.length ? rest : TENANT_JOBS));

  return chosen.map((job, idx) => ({
    tempId: `ap_${Date.now()}_${idx}`,
    name: pickRandom(KOREAN_LAST_NAMES) + pickRandom(KOREAN_FIRST_NAMES),
    jobId: job.id,
    jobName: job.jobName,
    badgeColor: job.badgeColor,
    maxBudget: Math.floor(job.minBudget + Math.random() * (job.maxBudget - job.minBudget + 1)),
    wishText: job.wishText,
    requirements: job.requirements,
    personality: job.traitTag,
    style: job.style
  }));
}

function renderRecruitCards(room) {
  const marketRent = calcRoomMarketRent(room);
  dom.recruitRoomBadge.textContent = room.name;
  dom.recruitRoomInfo.textContent = `현재 ${room.name} 적정 월세: ${marketRent}만원 (${room.rentCycleSec}초 주기 3D 코인 수금)`;

  dom.recruitCardsGrid.innerHTML = currentApplicants.map((app, index) => {
    const reqBadges = Object.entries(app.requirements || {}).map(([fKey, reqLv]) => {
      const ok = (room.furniture[fKey] || 0) >= reqLv;
      return `<span class="inline-block text-[11px] px-2 py-0.5 rounded-full border ${
        ok ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-amber-50 text-amber-800 border-amber-300'
      }">${ok ? '✅' : '⚠️'} ${FURNITURE_TREE[fKey].label} Lv.${reqLv}+</span>`;
    }).join(' ');

    return `
      <div class="bg-white rounded-2xl border-2 border-amber-300 hover:border-emerald-500 p-3.5 flex flex-col justify-between shadow-sm transition">
        <div>
          <div class="flex items-center gap-3">
            <div class="w-14 h-15 rounded-2xl bg-amber-50 border-2 border-amber-800 flex items-center justify-center shrink-0">
              ${buildPortraitSVG(app)}
            </div>
            <div>
              <span class="font-jua text-[11px] text-white px-2 py-0.5 rounded-full" style="background:${app.badgeColor}">${app.jobName}</span>
              <div class="font-jua text-base text-amber-950 mt-0.5">${app.name}</div>
              <div class="text-[11px] text-amber-800 font-medium">${app.personality}</div>
            </div>
          </div>

          <div class="mt-3 bg-[#fffaf2] rounded-xl p-2.5 border border-amber-200 space-y-1">
            <div class="flex items-center justify-between text-xs">
              <span class="text-stone-600">최대 월세 예산</span>
              <span class="font-jua text-sm ${app.maxBudget >= marketRent ? 'text-emerald-700' : 'text-rose-600'}">${app.maxBudget}만원</span>
            </div>
            <div class="text-[11px] text-stone-600 leading-snug pt-1 border-t border-amber-200/70">💬 "${app.wishText}"</div>
            <div class="flex flex-wrap gap-1 pt-1">${reqBadges}</div>
          </div>
        </div>

        <button data-app-idx="${index}" class="btn-sign-contract jelly-btn-mint mt-3 w-full font-jua text-sm py-2.5 rounded-xl">
          ✍️ 입주 계약하기 (월 ${Math.min(marketRent, app.maxBudget)}만)
        </button>
      </div>
    `;
  }).join('');

  dom.recruitCardsGrid.querySelectorAll('.btn-sign-contract').forEach((btn) => {
    btn.onclick = () => signTenantContract(room.id, currentApplicants[Number(btn.dataset.appIdx)]);
  });
}

function signTenantContract(roomId, applicant) {
  const room = getRoomById(roomId);
  if (!room || !applicant) return;

  const allMet = Object.entries(applicant.requirements || {}).every(([k, lv]) => (room.furniture[k] || 0) >= lv);
  room.tenant = {
    name: applicant.name,
    jobId: applicant.jobId,
    jobName: applicant.jobName,
    maxBudget: applicant.maxBudget,
    personality: applicant.personality,
    style: applicant.style,
    happiness: allMet ? 88 : 74
  };
  room.rentTimer = room.rentCycleSec * 0.5;
  room.dust = 0;

  dom.recruitModal.classList.add('hidden');
  rebuildRoom3D(room.id, null);
  createTenantActorForRoom(room, true);
  refreshRoomBadgeContent(room.id);

  spawn3DSparkles(room.cx, room.cy + 1.1, room.cz, 14);
  showToast(`🏡 ${room.name}에 [${applicant.jobName}] ${applicant.name}님이 입주했습니다!`, 'emerald');

  selectRoom(room.id, true);
  updateHudUI();
  updateQuestUI();
  saveGameState();
}

function evictTenant(roomId) {
  const room = getRoomById(roomId);
  if (!room || !room.tenant) return;
  room.tenant = null;
  room.rentTimer = 0;
  state.stats.evictions += 1;

  syncTenantActors3D();
  rebuildRoom3D(room.id, null);
  refreshRoomBadgeContent(room.id);
  renderRoomPanelBody(room);
  updateHudUI();
  updateQuestUI();
  saveGameState();

  showToast(`⚡ ${room.name} 계약 해지 완료! 더 높은 예산의 VIP 입주민을 맞이해보세요.`, 'amber');
}

function updateQuestUI() {
  if (state.questIndex >= MAIN_QUESTS.length) {
    dom.questStepTag.textContent = '👑 모든 미션 마스터!';
    dom.questRewardTag.textContent = '완료';
    dom.questTitle.textContent = '축하합니다! 전설의 3D 갓물주 등극!';
    dom.questDesc.textContent = '전 호실 로얄 부티크 스위트와 랜드마크 상가를 자유롭게 운영해보세요.';
    dom.questHint.innerHTML = '<span>✨ 자유 타이쿤 플레이 모드</span>';
    dom.questBtn.classList.remove('quest-ready-glow');
    return;
  }

  const q = MAIN_QUESTS[state.questIndex];
  const isComplete = q.check(state);
  dom.questStepTag.textContent = `📋 갓물주 미션 ${state.questIndex + 1}/${MAIN_QUESTS.length}`;
  dom.questRewardTag.textContent = `🎁 +${q.reward}만`;
  dom.questTitle.textContent = q.title;
  dom.questDesc.textContent = q.desc;

  if (isComplete) {
    dom.questBtn.classList.add('quest-ready-glow');
    dom.questHint.innerHTML = '<span class="text-emerald-700 font-bold">🎉 미션 성공! 터치하여 지원금 보상을 받으세요!</span>';
  } else {
    dom.questBtn.classList.remove('quest-ready-glow');
    dom.questHint.innerHTML = '<span>👉 터치하면 해당 3D 호실로 클로즈업합니다</span>';
  }
}

function handleQuestBadgeClick() {
  if (state.questIndex >= MAIN_QUESTS.length) {
    resetCameraQuarterView();
    return;
  }
  const q = MAIN_QUESTS[state.questIndex];
  if (q.check(state)) {
    addGold(q.reward);
    showToast(`🎁 미션 달성! 지원금 +${q.reward}만원 지급!`, 'emerald');
    const rm = q.focusRoom ? getRoomById(q.focusRoom) : null;
    if (rm) {
      spawn3DCoinFountain(rm.cx, rm.cy + 0.5, rm.cz, 14);
      spawn3DJackpotText(rm.cx, rm.cy + 2.2, rm.cz, `+${q.reward}만 원!`, '🎁');
    }
    state.questIndex += 1;
    updateQuestUI();
    if (selection.type === 'room' && selection.id) {
      renderRoomPanelBody(getRoomById(selection.id));
    }
    saveGameState();
    return;
  }
  if (q.focusRoom) selectRoom(q.focusRoom, true);
  else if (q.focusShop) selectShop(q.focusShop, true);
}

function triggerRandomKakaoComplaint() {
  if (activeKakaoEvent) return;
  const occupied = state.rooms.filter((r) => r.unlocked && r.tenant);
  if (occupied.length === 0) return;

  const room = pickRandom(occupied);
  const eventData = pickRandom(KAKAO_EVENTS);
  activeKakaoEvent = { roomId: room.id, eventData };
  dom.kakaoBannerSender.textContent = `${room.name} ${room.tenant.name} (${room.tenant.jobName})`;
  dom.kakaoBannerPreview.textContent = `"${eventData.message}"`;
  dom.kakaoFloatingBtn.classList.remove('hidden');
}

function openKakaoModal() {
  if (!activeKakaoEvent) return;
  const room = getRoomById(activeKakaoEvent.roomId);
  if (!room || !room.tenant) {
    activeKakaoEvent = null;
    dom.kakaoFloatingBtn.classList.add('hidden');
    return;
  }
  const ev = activeKakaoEvent.eventData;
  dom.kakaoModalHeader.textContent = `${room.name} ${room.tenant.name}님과의 카톡`;
  dom.kakaoAvatarBox.innerHTML = buildPortraitSVG(room.tenant);
  dom.kakaoSenderName.textContent = `${room.name} ${room.tenant.name} · ${room.tenant.jobName}`;
  dom.kakaoMessageBubble.textContent = ev.message;

  dom.kakaoChoicesBox.innerHTML = ev.choices.map((ch, idx) => `
    <button data-choice-idx="${idx}" class="btn-kakao-choice jelly-btn-amber w-full text-left font-jua text-xs sm:text-sm px-3.5 py-2.5 rounded-2xl">
      ${ch.label}
    </button>
  `).join('');

  dom.kakaoChoicesBox.querySelectorAll('.btn-kakao-choice').forEach((btn) => {
    btn.onclick = () => resolveKakaoChoice(Number(btn.dataset.choiceIdx));
  });
  dom.kakaoModal.classList.remove('hidden');
}

function resolveKakaoChoice(choiceIdx) {
  if (!activeKakaoEvent) return;
  const room = getRoomById(activeKakaoEvent.roomId);
  const choice = activeKakaoEvent.eventData.choices[choiceIdx];

  if (choice.cost > 0 && state.gold < choice.cost) {
    showToast(`💸 보유 자산(${choice.cost}만원)이 부족합니다!`, 'rose');
    return;
  }
  if (choice.cost > 0) addGold(-choice.cost);
  if (choice.bonusGold > 0) addGold(choice.bonusGold);

  if (room && room.tenant) {
    room.tenant.happiness = Math.max(15, Math.min(100, room.tenant.happiness + choice.happinessDelta));
    if (tenant3DActors[room.id]) showTenantSpeech(tenant3DActors[room.id], choice.reply, 4.5);
    if (choice.bonusGold > 0) {
      spawn3DCoinFountain(room.cx, room.cy + 0.5, room.cz, 10);
      spawn3DJackpotText(room.cx, room.cy + 2.0, room.cz, `+${choice.bonusGold}만 원!`, '💖');
    }
    focusCameraOn3DPoint(room.cx, room.cy - 0.6, room.cz + 1.0, Math.max(camera.zoom, 1.5));
  }

  dom.kakaoModal.classList.add('hidden');
  dom.kakaoFloatingBtn.classList.add('hidden');
  activeKakaoEvent = null;
  kakaoCooldown = 36 + Math.random() * 18;
  showToast(`💬 ${choice.reply}`, choice.happinessDelta >= 0 ? 'emerald' : 'amber');
  if (selection.type === 'room' && room && selection.id === room.id) renderRoomPanelBody(room);
  saveGameState();
}

// =========================================================
// 11. 세이브/로드 & 이벤트 바인딩 & 메인 WebGL 애니메이션 루프
// =========================================================
function getEffectiveRoomRent(room) {
  if (!room.unlocked || !room.tenant) return 0;
  const market = calcRoomMarketRent(room);
  const basePaid = Math.min(market, room.tenant.maxBudget);
  const happyBonus = room.tenant.happiness >= 85 ? Math.round(basePaid * 0.1) : 0;
  return basePaid + happyBonus;
}

function calcTotalActiveRent() {
  return state.rooms.reduce((sum, r) => sum + getEffectiveRoomRent(r), 0);
}

function addGold(delta) {
  state.gold = Math.max(0, Math.round(state.gold + delta));
  if (delta > 0 && dom.hudGoldWrap) {
    dom.hudGoldWrap.classList.remove('gold-pop-anim');
    void dom.hudGoldWrap.offsetWidth;
    dom.hudGoldWrap.classList.add('gold-pop-anim');
  }
  updateHudUI();
}

function updateHudUI() {
  dom.hudGold.textContent = state.gold.toLocaleString();
  dom.hudRentTotal.textContent = calcTotalActiveRent().toLocaleString();

  const sProfit = state.shops.store.levels[state.shops.store.level].visitProfit;
  const lProfit = state.shops.laundry.levels[state.shops.laundry.level].visitProfit;
  if (dom.hudShopProfitHint) {
    dom.hudShopProfitHint.textContent = `🏪상가 매출 +${sProfit}~${lProfit}만`;
  }

  const unlockedCount = state.rooms.filter((r) => r.unlocked).length;
  const occupiedCount = state.rooms.filter((r) => r.unlocked && r.tenant).length;
  dom.hudOccupancy.textContent = `입주 ${occupiedCount}/${unlockedCount}실`;

  const totalMins = Math.floor(state.gameMinutes);
  const hour = Math.floor(totalMins / 60) % 24;
  const min = Math.floor(totalMins % 60);
  const periodIcon = hour >= 6 && hour < 18 ? '☀️' : hour >= 18 && hour < 22 ? '🌇' : '🌙';
  const periodName = hour >= 6 && hour < 12 ? '오전' : hour >= 12 && hour < 18 ? '오후' : hour >= 18 && hour < 22 ? '노을' : '밤';
  dom.hudTimeBadge.textContent = `${periodIcon} ${state.day}일차 · ${periodName} ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;

  if (dom.zoomScaleLabel && camera) {
    dom.zoomScaleLabel.textContent = `${Math.round(camera.zoom * 100)}%`;
  }
}

function showToast(msg, color = 'amber') {
  const palette = {
    emerald: 'bg-emerald-500 text-white border-emerald-900',
    amber: 'bg-amber-300 text-amber-950 border-amber-900',
    rose: 'bg-rose-500 text-white border-rose-950'
  };
  const el = document.createElement('div');
  el.className = `font-jua text-xs sm:text-sm px-4 py-2 rounded-full border-[3px] shadow-[0_4px_0_rgba(67,20,7,0.35)] transition-all duration-300 ${palette[color] || palette.amber}`;
  el.textContent = msg;
  dom.toastContainer.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-8px)';
    setTimeout(() => el.remove(), 300);
  }, 2600);
}

function saveGameState() {
  try {
    state.lastSavedAt = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    if (dom.autosaveIndicator) {
      dom.autosaveIndicator.style.opacity = '1';
      setTimeout(() => {
        if (dom.autosaveIndicator) dom.autosaveIndicator.style.opacity = '0.72';
      }, 650);
    }
  } catch (e) {
    console.warn('Save skipped:', e);
  }
}

function loadGameState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.rooms)) return null;

    const defaults = createDefaultState();
    state = {
      ...defaults,
      ...parsed,
      stats: { ...defaults.stats, ...(parsed.stats || {}) }
    };

    state.rooms = INITIAL_ROOMS.map((initRoom) => {
      const saved = parsed.rooms.find((r) => r.id === initRoom.id);
      if (!saved) return { ...initRoom, tenant: null, rentTimer: 0, dust: 50 };
      return {
        ...initRoom,
        unlocked: saved.unlocked,
        furniture: { ...initRoom.furniture, ...(saved.furniture || {}) },
        tenant: saved.tenant || null,
        rentTimer: typeof saved.rentTimer === 'number' ? saved.rentTimer : 0,
        dust: typeof saved.dust === 'number' ? saved.dust : 40
      };
    });

    state.shops = {
      store: { ...INITIAL_SHOPS.store, level: parsed.shops?.store?.level || 1 },
      laundry: { ...INITIAL_SHOPS.laundry, level: parsed.shops?.laundry?.level || 1 }
    };

    const awaySec = Math.min(28800, Math.floor((Date.now() - (parsed.lastSavedAt || Date.now())) / 1000));
    const totalRent = calcTotalActiveRent();
    if (awaySec >= 45 && totalRent > 0) {
      const cycles = awaySec / 11.5;
      const earned = Math.max(10, Math.floor(cycles * totalRent * 0.52));
      return { awaySec, earned };
    }
  } catch (e) {
    console.warn('Load failed:', e);
  }
  return null;
}

function bindEvents() {
  let downX = 0;
  let downY = 0;

  renderer.domElement.addEventListener('pointerdown', (e) => {
    downX = e.clientX;
    downY = e.clientY;
    camTween.active = false;
  });

  renderer.domElement.addEventListener('pointerup', (e) => {
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 7) return;
    pointerNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointerNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointerNDC, camera);
    const hits = raycaster.intersectObjects(pickableMeshes, false);
    if (hits.length > 0) {
      const hitObj = hits[0].object;
      if (hitObj.userData.roomId) {
        selectRoom(hitObj.userData.roomId, true);
      } else if (hitObj.userData.shopId) {
        selectShop(hitObj.userData.shopId, true);
      }
    }
  });

  document.getElementById('btn-zoom-in').addEventListener('click', () => {
    camTween.targetLook.copy(controls.target);
    camTween.targetPos.copy(camera.position);
    camTween.targetZoom = Math.min(controls.maxZoom, camera.zoom * 1.28);
    camTween.active = true;
  });

  document.getElementById('btn-zoom-out').addEventListener('click', () => {
    camTween.targetLook.copy(controls.target);
    camTween.targetPos.copy(camera.position);
    camTween.targetZoom = Math.max(controls.minZoom, camera.zoom / 1.28);
    camTween.active = true;
  });

  document.getElementById('btn-cam-rotate').addEventListener('click', rotateCameraQuarterStep);

  document.getElementById('btn-zoom-fit').addEventListener('click', () => {
    closeBottomPanel();
    resetCameraQuarterView();
  });

  document.getElementById('btn-close-panel').addEventListener('click', closeBottomPanel);
  document.getElementById('btn-close-recruit').addEventListener('click', () => dom.recruitModal.classList.add('hidden'));

  document.getElementById('btn-refresh-applicants').addEventListener('click', () => {
    if (!recruitTargetRoomId) return;
    if (state.gold < 10) {
      showToast('💸 홍보비(10만원)가 부족합니다!', 'rose');
      return;
    }
    addGold(-10);
    const room = getRoomById(recruitTargetRoomId);
    currentApplicants = generateApplicants(room);
    renderRecruitCards(room);
    showToast('📢 새로운 입주 지원자 3명이 도착했어요!', 'amber');
  });

  dom.questBtn.addEventListener('click', handleQuestBadgeClick);
  dom.kakaoFloatingBtn.addEventListener('click', openKakaoModal);
  document.getElementById('btn-close-kakao').addEventListener('click', () => dom.kakaoModal.classList.add('hidden'));

  let resetArmed = false;
  const resetBtn = document.getElementById('btn-reset-save');
  resetBtn.addEventListener('click', () => {
    if (!resetArmed) {
      resetArmed = true;
      resetBtn.textContent = '⚠️';
      showToast('🔄 초기화하려면 3초 안에 ⚠️ 버튼을 한 번 더 눌러주세요!', 'rose');
      setTimeout(() => {
        resetArmed = false;
        resetBtn.textContent = '🔄';
      }, 3200);
      return;
    }
    localStorage.removeItem(SAVE_KEY);
    window.location.reload();
  });

  window.addEventListener('resize', () => {
    const aspect = window.innerWidth / window.innerHeight;
    camera.left = (-FRUSTUM_SIZE * aspect) / 2;
    camera.right = (FRUSTUM_SIZE * aspect) / 2;
    camera.top = FRUSTUM_SIZE / 2;
    camera.bottom = -FRUSTUM_SIZE / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function cacheDom() {
  dom.webglContainer = document.getElementById('webgl-container');
  dom.roomBadgesLayer = document.getElementById('room-badges-layer');
  dom.shopBadgesLayer = document.getElementById('shop-badges-layer');
  dom.speechLayer = document.getElementById('speech-bubbles-layer');
  dom.careLayer = document.getElementById('care-bubbles-layer');
  dom.jackpotLayer = document.getElementById('jackpot-popups-layer');

  dom.hudGold = document.getElementById('hud-gold');
  dom.hudGoldWrap = document.getElementById('hud-gold-wrap');
  dom.hudRentTotal = document.getElementById('hud-rent-total');
  dom.hudShopProfitHint = document.getElementById('hud-shop-profit-hint');
  dom.hudTimeBadge = document.getElementById('hud-time-badge');
  dom.hudOccupancy = document.getElementById('hud-occupancy');
  dom.autosaveIndicator = document.getElementById('autosave-indicator');
  dom.zoomScaleLabel = document.getElementById('zoom-scale-label');

  dom.questBtn = document.getElementById('quest-floating-btn');
  dom.questStepTag = document.getElementById('quest-step-tag');
  dom.questRewardTag = document.getElementById('quest-reward-tag');
  dom.questTitle = document.getElementById('quest-title');
  dom.questDesc = document.getElementById('quest-desc');
  dom.questHint = document.getElementById('quest-action-hint');

  dom.kakaoFloatingBtn = document.getElementById('kakao-floating-btn');
  dom.kakaoBannerSender = document.getElementById('kakao-banner-sender');
  dom.kakaoBannerPreview = document.getElementById('kakao-banner-preview');

  dom.bottomPanel = document.getElementById('bottom-panel');
  dom.panelRoomTitle = document.getElementById('panel-room-title');
  dom.panelGradeBadge = document.getElementById('panel-grade-badge');
  dom.panelRentBadge = document.getElementById('panel-rent-badge');
  dom.panelBody = document.getElementById('panel-body');

  dom.recruitModal = document.getElementById('recruit-modal');
  dom.recruitRoomBadge = document.getElementById('recruit-room-badge');
  dom.recruitRoomInfo = document.getElementById('recruit-room-info');
  dom.recruitCardsGrid = document.getElementById('recruit-cards-grid');

  dom.kakaoModal = document.getElementById('kakao-modal');
  dom.kakaoModalHeader = document.getElementById('kakao-modal-header');
  dom.kakaoAvatarBox = document.getElementById('kakao-avatar-box');
  dom.kakaoSenderName = document.getElementById('kakao-sender-name');
  dom.kakaoMessageBubble = document.getElementById('kakao-message-bubble');
  dom.kakaoChoicesBox = document.getElementById('kakao-choices-box');

  dom.offlineModal = document.getElementById('offline-modal');
  dom.offlineTimeText = document.getElementById('offline-time-text');
  dom.offlineGoldAmount = document.getElementById('offline-gold-amount');
  dom.toastContainer = document.getElementById('toast-container');
}

// --------------------- 엔트리포인트 실행 ---------------------
window.addEventListener('DOMContentLoaded', () => {
  cacheDom();
  const offlineInfo = loadGameState();
  initThreeScene();
  initFloatingBadgesDOM();
  syncTenantActors3D();
  bindEvents();
  updateHudUI();
  updateQuestUI();

  if (offlineInfo && offlineInfo.earned > 0) {
    dom.offlineTimeText.textContent = `약 ${Math.max(1, Math.floor(offlineInfo.awaySec / 60))}분 동안 3D 하우스 월세가 누적되었어요!`;
    dom.offlineGoldAmount.textContent = offlineInfo.earned.toLocaleString();
    dom.offlineModal.classList.remove('hidden');
    document.getElementById('btn-claim-offline').onclick = () => {
      addGold(offlineInfo.earned);
      dom.offlineModal.classList.add('hidden');
      showToast(`🏦 부재중 월세 +${offlineInfo.earned.toLocaleString()}만원 수령 완료!`, 'emerald');
      saveGameState();
    };
  }

  let lastTime = performance.now();

  function animate(now) {
    const dt = Math.min(0.06, (now - lastTime) / 1000);
    lastTime = now;

    // 1) 카메라 부드러운 클로즈업/회전 보간
    if (camTween.active) {
      const lerp = Math.min(1, dt * 7.5);
      camera.position.lerp(camTween.targetPos, lerp);
      controls.target.lerp(camTween.targetLook, lerp);
      camera.zoom += (camTween.targetZoom - camera.zoom) * lerp;
      camera.updateProjectionMatrix();

      if (
        camera.position.distanceTo(camTween.targetPos) < 0.06 &&
        Math.abs(camera.zoom - camTween.targetZoom) < 0.008
      ) {
        camTween.active = false;
      }
    }
    controls.update();

    // 2) 코인세탁소 3연동 드럼세탁기 내부 세탁물 실시간 회전!
    for (const drum of spinningWasherDrums) {
      drum.rotation.z += dt * 3.4;
    }

    // 3) 거리 배달 스쿠터 & 미니카 주행
    if (streetVehicles.scooter) {
      streetVehicles.scooter.position.x += dt * 5.2;
      if (streetVehicles.scooter.position.x > 18) streetVehicles.scooter.position.x = -18;
    }
    if (streetVehicles.car) {
      streetVehicles.car.position.x -= dt * 4.2;
      if (streetVehicles.car.position.x < -18) streetVehicles.car.position.x = 18;
    }

    // 4) 시간대별 조명 색온도 변화
    state.gameMinutes += dt * 14;
    if (state.gameMinutes >= 24 * 60) {
      state.gameMinutes -= 24 * 60;
      state.day += 1;
    }
    const hr = (state.gameMinutes / 60) % 24;
    const isNight = hr >= 21 || hr < 6;
    sunLight.intensity = isNight ? 0.65 : 1.55;
    hemiLight.intensity = isNight ? 0.62 : 0.98;

    // 5) 물리 바운스, 3D 코인 분수, 방별 월세 타이머, 돌발 케어, 상가 순환, 입주민 AI
    tickBouncesAndParticles(dt);
    tickRoomRentTimers(dt);
    tickCareBubbles(dt);
    tickBuildingShopChain(dt);
    tickTenantActors3D(dt);

    if (!activeKakaoEvent) {
      kakaoCooldown -= dt;
      if (kakaoCooldown <= 0) {
        kakaoCooldown = 35 + Math.random() * 18;
        triggerRandomKakaoComplaint();
      }
    }

    renderer.render(scene, camera);
    update3DProjectedOverlays();
    updateHudUI();

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);

  setInterval(() => {
    saveGameState();
    updateQuestUI();
  }, 3000);
});
