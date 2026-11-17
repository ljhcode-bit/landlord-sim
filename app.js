// =========================================================
// 【갓물주 라이프 3D: 미니미 타운 & 하우스】 메인 Dual-Scale 3D 엔진 (app.js)
// 1) 마을 뷰(LOD 외관 지붕 + 빈 땅 매입/타워크레인 신축 + 상권 시너지 + 스와이프 수금)
// 2) 건물 내부 뷰(더 테넌츠 스타일 Cutaway 호실 + 다중파츠 가구 조립 + 호실별 타이머)
// 3) 모바일/웹앱 60fps 최적화(전역 Geometry/Material 캐시 + Contact Drop Shadow)
// =========================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const SAVE_KEY = 'god_landlord_dual_town_v1';

// --------------------- 전역 게임 상태 ---------------------
let state = createDefaultState();

function createBuildingInstance(lotId, buildingType, title) {
  const cat = BUILDING_CATALOG[buildingType];
  const rooms = [];
  if (cat.roomCount > 0) {
    BUILDING_ROOM_SLOTS.forEach((slot) => {
      rooms.push({
        id: `${lotId}_${slot.subId}`,
        lotId,
        subId: slot.subId,
        name: slot.name,
        floor: slot.floor,
        lx: slot.lx,
        ly: slot.ly,
        lz: slot.lz,
        rentCycleSec: slot.rentCycleSec,
        unlocked: slot.defaultUnlocked,
        unlockCost: slot.unlockCost,
        baseRent: cat.baseRoomRent + (slot.floor === 2 ? 8 : 0),
        furniture: { wallpaper: 0, bed: 0, shower: 0, kitchen: 0, desk: 0, ac: 0 },
        tenant: null,
        rentTimer: 0
      });
    });
  }

  const shops = [];
  if (cat.isFullCommercial) {
    shops.push(
      { id: `${lotId}_store`, lotId, key: 'store', lx: -4.2, ly: 0.25, lz: 0.6, level: 1 },
      { id: `${lotId}_bakery`, lotId, key: 'bakery', lx: 0.0, ly: 0.25, lz: 0.6, level: 1 },
      { id: `${lotId}_laundry`, lotId, key: 'laundry', lx: 4.2, ly: 0.25, lz: 0.6, level: 1 }
    );
  } else if (cat.hasGroundShops) {
    shops.push(
      { id: `${lotId}_store`, lotId, key: 'store', lx: -3.6, ly: 0.25, lz: 3.9, level: 1 },
      { id: `${lotId}_laundry`, lotId, key: 'laundry', lx: 3.6, ly: 0.25, lz: 3.9, level: 1 }
    );
  }

  return {
    lotId,
    buildingType,
    title: title || cat.name,
    rooms,
    shops,
    pendingCoins: 0,
    townGaugeTimer: 0,
    townGaugeCycle: cat.passiveCycleSec || 10
  };
}

function createDefaultState() {
  const lots = JSON.parse(JSON.stringify(INITIAL_LOTS));
  const buildings = {
    lot_1: createBuildingInstance('lot_1', 'mixed_villa', '미니미 하우스 1호점')
  };
  return {
    gold: 420, // 초기 자산 420만원 (1호점 리모델링 후 빠르게 옆 땅 매입 가능!)
    day: 1,
    gameMinutes: 9 * 60,
    questIndex: 0,
    lots,
    buildings,
    stats: {
      evictions: 0,
      totalEarned: 0,
      shopVisits: 0
    },
    lastSavedAt: Date.now()
  };
}

// --------------------- Three.js 및 전역 캐시(60fps 최적화) ---------------------
let scene;
let camera;
let renderer;
let controls;
let hemiLight;
let dirLight;

const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();
const tempVec3 = new THREE.Vector3();

// 현재 뷰 상태: 'TOWN' | 'BUILDING'
let viewMode = 'TOWN';
let activeLotId = 'lot_1';
let camAzimuthIdx = 0;

const TOWN_CAM_OFFSETS = [
  new THREE.Vector3(34, 34, 36),
  new THREE.Vector3(-34, 34, 36),
  new THREE.Vector3(-34, 34, -36),
  new THREE.Vector3(34, 34, -36)
];
const BUILDING_CAM_OFFSETS = [
  new THREE.Vector3(16, 16.5, 18),
  new THREE.Vector3(-16, 16.5, 18),
  new THREE.Vector3(-16, 16.5, -18),
  new THREE.Vector3(16, 16.5, -18)
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

// 전역 Geometry / Material / Texture 공유 캐시 (GC 및 드로우콜/메모리 최적화)
const GEO = {};
const MAT = {};
const TEX = {};

// 3D 씬 관리 맵
const lot3DRegistry = {}; // lotId -> { root, emptyGroup, constructionGroup, exteriorGroup, interiorGroup, roofCoinMesh, roomGroups, shopGroups }
const pickableTownMeshes = [];
const pickableInteriorMeshes = [];
const spinningDrums = [];
const activeBounces = [];
const activeParticles3D = [];
const activeConstructions = []; // { lotId, craneTop, timer, duration, onDone }
const townVehicles = [];
const townWalkers = [];
const interiorActors = {}; // roomId -> 3D Chibi 액터

// DOM 오버레이 엘리먼트 레지스트리
const townLotBadges = {};
const roomBadges = {};
const shopBadges = {};
let activeCareBubbles = [];
let careCooldown = 6.5;
let townShopLoopCooldown = 7.5;
let swipeComboCount = 0;
let swipeResetTimer = null;

let pendingLotIdForModal = null;
let recruitTargetRoom = null;
let currentApplicants = [];

const dom = {};

// =========================================================
// 1. 프로시저럴 CanvasTexture & 공유 Contact Drop Shadow 생성기
// =========================================================
function makeCanvasTex(drawFn, rx = 1, ry = 1, size = 256) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  drawFn(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  return t;
}

function initSharedAssets() {
  // 1) 반투명 부드러운 Contact Drop Shadow 텍스처 (모바일 발열 제로 60fps 그림자!)
  TEX.contactShadow = makeCanvasTex((ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, s * 0.08, s / 2, s / 2, s * 0.48);
    g.addColorStop(0, 'rgba(45, 22, 6, 0.42)');
    g.addColorStop(0.65, 'rgba(45, 22, 6, 0.16)');
    g.addColorStop(1, 'rgba(45, 22, 6, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  }, 1, 1, 128);

  // 2) 시멘트 / 메이플 우드 / 오크 헤링본 / 비앙코 대리석 마루
  TEX.floor0 = makeCanvasTex((ctx, s) => {
    ctx.fillStyle = '#a8a29e';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = 'rgba(63,98,18,0.26)';
    ctx.beginPath();
    ctx.arc(80, 160, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#57534e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(30, 40);
    ctx.lineTo(120, 110);
    ctx.lineTo(180, 200);
    ctx.stroke();
  }, 2, 2);

  TEX.floor1 = makeCanvasTex((ctx, s) => {
    ctx.fillStyle = '#f6d5b0';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 6; i++) {
      const y = (s / 6) * i;
      ctx.fillStyle = i % 2 === 0 ? '#f9dfc1' : '#efc89b';
      ctx.fillRect(0, y, s, s / 6 - 2);
      ctx.fillStyle = '#d4a373';
      ctx.fillRect(0, y + s / 6 - 2, s, 2);
    }
  }, 2, 2);

  TEX.floor2 = makeCanvasTex((ctx, s) => {
    ctx.fillStyle = '#dda15e';
    ctx.fillRect(0, 0, s, s);
    const step = 48;
    const cols = ['#e6b174', '#d5944d', '#cfa065', '#e2ab6c'];
    for (let y = -step; y < s + step; y += step / 2) {
      for (let x = -step; x < s + step; x += step) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = cols[Math.abs((x + y) / 24) % cols.length];
        ctx.fillRect(0, 0, step * 0.72, step * 0.28);
        ctx.strokeStyle = '#9c5a25';
        ctx.lineWidth = 1.8;
        ctx.strokeRect(0, 0, step * 0.72, step * 0.28);
        ctx.restore();

        ctx.save();
        ctx.translate(x + step * 0.5, y + step * 0.25);
        ctx.rotate(-Math.PI / 4);
        ctx.fillStyle = cols[(Math.abs((x + y) / 24) + 2) % cols.length];
        ctx.fillRect(0, 0, step * 0.72, step * 0.28);
        ctx.strokeStyle = '#9c5a25';
        ctx.lineWidth = 1.8;
        ctx.strokeRect(0, 0, step * 0.72, step * 0.28);
        ctx.restore();
      }
    }
  }, 2, 2);

  TEX.floor3 = makeCanvasTex((ctx, s) => {
    ctx.fillStyle = '#fffdf8';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(202,138,4,0.22)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 60);
    ctx.bezierCurveTo(90, 110, 170, 30, s, 90);
    ctx.moveTo(0, 180);
    ctx.bezierCurveTo(100, 140, 190, 220, s, 170);
    ctx.stroke();
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 3;
    for (let i = 0; i <= 4; i++) {
      const p = (s / 4) * i;
      ctx.strokeRect(0, 0, p, p);
    }
  }, 2, 2);

  // 3) 웨인스코팅 벽면 텍스처 (Lv.0~Lv.3)
  [0, 1, 2, 3].forEach((lv) => {
    TEX[`wall${lv}`] = makeCanvasTex((ctx, s) => {
      if (lv === 0) {
        ctx.fillStyle = '#b5afa6';
        ctx.fillRect(0, 0, s, s);
        ctx.fillStyle = 'rgba(63,98,18,0.25)';
        ctx.beginPath();
        ctx.arc(70, 180, 44, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      const tops = ['#fff5eb', '#fffdf5', '#fffef9'];
      const bots = ['#fed7aa', '#ecd2b0', '#f8efd9'];
      const rails = ['#fb923c', '#c88a55', '#eab308'];
      ctx.fillStyle = tops[lv - 1];
      ctx.fillRect(0, 0, s, s * 0.58);
      ctx.fillStyle = bots[lv - 1];
      ctx.fillRect(0, s * 0.58, s, s * 0.42);
      ctx.fillStyle = rails[lv - 1];
      ctx.fillRect(0, s * 0.56, s, 9);
      ctx.strokeStyle = rails[lv - 1];
      ctx.lineWidth = 4;
      for (let i = 0; i < 3; i++) {
        ctx.strokeRect(14 + i * 80, s * 0.65, 68, s * 0.25);
      }
    }, 2, 1);
  });

  // 4) 벽돌 외벽 & 욕실 타일 & 패브릭 & 도로 텍스처
  TEX.brick = makeCanvasTex((ctx, s) => {
    ctx.fillStyle = '#f8e5d0';
    ctx.fillRect(0, 0, s, s);
    const cols = ['#f3cbb0', '#eab696', '#f6d6bd', '#e5a985'];
    for (let r = 0; r < 8; r++) {
      const off = (r % 2) * 24;
      for (let c = -1; c < 6; c++) {
        ctx.fillStyle = cols[(r + c + 4) % cols.length];
        ctx.fillRect(c * 48 + off + 2, r * 32 + 2, 44, 28);
      }
    }
  }, 3, 2);

  TEX.bathTile = makeCanvasTex((ctx, s) => {
    ctx.fillStyle = '#e0f7fa';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    for (let i = 0; i <= 6; i++) {
      const p = (s / 6) * i;
      ctx.beginPath();
      ctx.moveTo(p, 0); ctx.lineTo(p, s);
      ctx.moveTo(0, p); ctx.lineTo(s, p);
      ctx.stroke();
    }
  }, 2, 2, 128);

  TEX.roadH = makeCanvasTex((ctx, s) => {
    ctx.fillStyle = '#6c6762';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#fde047';
    for (let x = 16; x < s; x += 64) {
      ctx.fillRect(x, s / 2 - 5, 36, 10);
    }
  }, 8, 1);

  // 공유 지오메트리 & 머티리얼 초기화
  GEO.unitBox = new THREE.BoxGeometry(1, 1, 1);
  GEO.unitCyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 14);
  GEO.unitSphere = new THREE.SphereGeometry(0.5, 14, 12);
  GEO.shadowPlane = new THREE.PlaneGeometry(1, 1);
  GEO.coin = new THREE.CylinderGeometry(0.24, 0.24, 0.06, 14);
  GEO.sparkle = new THREE.OctahedronGeometry(0.16, 0);

  MAT.shadow = new THREE.MeshBasicMaterial({
    map: TEX.contactShadow,
    transparent: true,
    depthWrite: false
  });
  MAT.coin = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xd97706,
    emissiveIntensity: 0.38,
    metalness: 0.78,
    roughness: 0.2
  });
  MAT.glass = new THREE.MeshStandardMaterial({
    color: 0xbaf2ff,
    transparent: true,
    opacity: 0.35,
    roughness: 0.08,
    metalness: 0.15,
    side: THREE.DoubleSide
  });
  MAT.white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  MAT.woodWarm = new THREE.MeshStandardMaterial({ color: 0xc87d3b, roughness: 0.55 });
  MAT.woodDark = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.65 });
  MAT.gold = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.7, roughness: 0.25 });
  MAT.chrome = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.75, roughness: 0.22 });
}

function createContactShadow(w, d, y = 0.015) {
  const m = new THREE.Mesh(GEO.shadowPlane, MAT.shadow);
  m.rotation.x = -Math.PI / 2;
  m.scale.set(w, d, 1);
  m.position.y = y;
  return m;
}

// =========================================================
// 2. 다중 파츠(THREE.Group, 8~20+ 파츠) 인테리어 가구 & 상가 빌더
// =========================================================
function createBedGroup(lv) {
  const g = new THREE.Group();
  g.add(createContactShadow(1.6, 1.9));

  if (lv === 0) {
    const pad = new THREE.Mesh(GEO.unitBox, new THREE.MeshStandardMaterial({ color: 0xcbd5e1 }));
    pad.scale.set(1.05, 0.06, 1.45);
    pad.position.y = 0.03;
    const blanket = new THREE.Mesh(GEO.unitBox, new THREE.MeshStandardMaterial({ color: 0x94a3b8 }));
    blanket.scale.set(1.02, 0.07, 0.9);
    blanket.position.set(0, 0.06, 0.24);
    const pil = new THREE.Mesh(GEO.unitBox, MAT.white);
    pil.scale.set(0.5, 0.08, 0.28);
    pil.position.set(0, 0.08, -0.48);
    g.add(pad, blanket, pil);
    return g;
  }

  const frameMat = lv >= 3 ? MAT.woodDark : MAT.woodWarm;
  const quiltColor = lv >= 3 ? 0xfef08a : lv === 2 ? 0x6ee7b7 : 0xfda4af;
  const quiltMat = new THREE.MeshStandardMaterial({ color: quiltColor, roughness: 0.7 });

  // 1~4) 침대 원목 다리 4개
  [[-0.54, -0.68], [0.54, -0.68], [-0.54, 0.68], [0.54, 0.68]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(GEO.unitCyl, frameMat);
    leg.scale.set(0.09, 0.22, 0.09);
    leg.position.set(lx, 0.11, lz);
    g.add(leg);
  });

  // 5~6) 베이스 프레임 + 헤드보드
  const base = new THREE.Mesh(GEO.unitBox, frameMat);
  base.scale.set(1.22, 0.15, 1.54);
  base.position.y = 0.24;
  const head = new THREE.Mesh(GEO.unitBox, frameMat);
  head.scale.set(1.26, 0.72, 0.1);
  head.position.set(0, 0.56, -0.74);
  g.add(base, head);

  // 7~9) 매트리스 + 접힌 이불 + 시트 칼라
  const matt = new THREE.Mesh(GEO.unitBox, MAT.white);
  matt.scale.set(1.14, 0.2, 1.42);
  matt.position.set(0, 0.4, 0.02);
  const duvet = new THREE.Mesh(GEO.unitBox, quiltMat);
  duvet.scale.set(1.17, 0.19, 0.96);
  duvet.position.set(0, 0.44, 0.25);
  const collar = new THREE.Mesh(GEO.unitBox, MAT.white);
  collar.scale.set(1.18, 0.06, 0.2);
  collar.position.set(0, 0.52, -0.18);
  g.add(matt, duvet, collar);

  // 10~11) 폭신한 베개 2개
  [-0.28, 0.28].forEach((px) => {
    const p = new THREE.Mesh(GEO.unitBox, MAT.white);
    p.scale.set(0.46, 0.12, 0.28);
    p.position.set(px, 0.55, -0.48);
    p.rotation.x = 0.18;
    g.add(p);
  });

  // 12~15) 침대 옆 협탁 + 손잡이 + 발광 무드등 스탠드
  const ns = new THREE.Mesh(GEO.unitBox, frameMat);
  ns.scale.set(0.38, 0.38, 0.36);
  ns.position.set(0.86, 0.19, -0.54);
  const stem = new THREE.Mesh(GEO.unitCyl, MAT.gold);
  stem.scale.set(0.05, 0.22, 0.05);
  stem.position.set(0.86, 0.48, -0.54);
  const shade = new THREE.Mesh(
    new THREE.ConeGeometry(0.15, 0.18, 12),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xffb703, emissiveIntensity: 0.9 })
  );
  shade.position.set(0.86, 0.62, -0.54);
  g.add(ns, stem, shade);

  return g;
}

function createBathroomGroup(lv) {
  const g = new THREE.Group();
  const slab = new THREE.Mesh(GEO.unitBox, new THREE.MeshStandardMaterial({ map: TEX.bathTile, roughness: 0.35 }));
  slab.scale.set(1.68, 0.1, 1.56);
  slab.position.y = 0.05;
  g.add(slab);

  // 양변기 3파츠 + 세면대 & 거울 3파츠
  const tBase = new THREE.Mesh(GEO.unitCyl, MAT.white);
  tBase.scale.set(0.26, 0.28, 0.3);
  tBase.position.set(-0.52, 0.24, -0.46);
  const tTank = new THREE.Mesh(GEO.unitBox, MAT.white);
  tTank.scale.set(0.3, 0.34, 0.15);
  tTank.position.set(-0.52, 0.42, -0.6);
  g.add(tBase, tTank);

  const vanity = new THREE.Mesh(GEO.unitBox, lv >= 2 ? MAT.woodWarm : MAT.white);
  vanity.scale.set(0.42, 0.45, 0.34);
  vanity.position.set(-0.5, 0.32, 0.38);
  const mirror = new THREE.Mesh(GEO.unitCyl, new THREE.MeshStandardMaterial({ color: 0xe0f2fe, metalness: 0.85, roughness: 0.1 }));
  mirror.scale.set(0.44, 0.03, 0.44);
  mirror.rotation.z = Math.PI / 2;
  mirror.position.set(-0.78, 0.92, 0.38);
  g.add(vanity, mirror);

  if (lv >= 1) {
    // 반투명 유리 샤워부스 파티션 + 메탈 프레임 + 해바라기 샤워기
    const metal = lv >= 3 ? MAT.gold : MAT.chrome;
    const gFront = new THREE.Mesh(GEO.unitBox, MAT.glass);
    gFront.scale.set(0.82, 1.38, 0.03);
    gFront.position.set(0.36, 0.79, 0.16);
    const gSide = new THREE.Mesh(GEO.unitBox, MAT.glass);
    gSide.scale.set(0.03, 1.38, 0.88);
    gSide.position.set(-0.04, 0.79, -0.28);

    const frameTop = new THREE.Mesh(GEO.unitBox, metal);
    frameTop.scale.set(0.86, 0.04, 0.05);
    frameTop.position.set(0.36, 1.48, 0.16);
    const pipe = new THREE.Mesh(GEO.unitCyl, metal);
    pipe.scale.set(0.04, 1.25, 0.04);
    pipe.position.set(0.48, 0.82, -0.65);
    const head = new THREE.Mesh(GEO.unitCyl, metal);
    head.scale.set(0.24, 0.03, 0.24);
    head.position.set(0.48, 1.42, -0.45);

    g.add(gFront, gSide, frameTop, pipe, head);
  }
  return g;
}

function createKitchenGroup(lv) {
  const g = new THREE.Group();
  g.add(createContactShadow(1.75, 0.8));

  if (lv === 0) {
    const box = new THREE.Mesh(GEO.unitBox, new THREE.MeshStandardMaterial({ color: 0x9ca3af }));
    box.scale.set(0.95, 0.55, 0.5);
    box.position.y = 0.28;
    g.add(box);
    return g;
  }

  const cabColor = lv >= 3 ? 0x1e293b : lv === 2 ? 0xa7f3d0 : 0xfde68a;
  const fridgeColor = lv >= 3 ? 0xfef3c7 : lv === 2 ? 0x6ee7b7 : 0xffe4e6;
  const metal = lv >= 3 ? MAT.gold : MAT.chrome;

  // 싱크대 하부장 + 대리석 상판 + 수전 + 냄비
  const cab = new THREE.Mesh(GEO.unitBox, new THREE.MeshStandardMaterial({ color: cabColor, roughness: 0.5 }));
  cab.scale.set(1.18, 0.62, 0.54);
  cab.position.set(-0.26, 0.31, 0);
  const top = new THREE.Mesh(GEO.unitBox, new THREE.MeshStandardMaterial({ map: TEX.floor3, roughness: 0.25 }));
  top.scale.set(1.24, 0.06, 0.6);
  top.position.set(-0.26, 0.65, 0);
  const tap = new THREE.Mesh(GEO.unitCyl, metal);
  tap.scale.set(0.04, 0.24, 0.04);
  tap.position.set(-0.56, 0.78, 0.16);
  const pot = new THREE.Mesh(GEO.unitCyl, new THREE.MeshStandardMaterial({ color: 0xf97316 }));
  pot.scale.set(0.22, 0.14, 0.22);
  pot.position.set(0.06, 0.75, 0);
  g.add(cab, top, tap, pot);

  // 손잡이 달린 2도어 냉장고
  const fh = lv >= 2 ? 1.24 : 1.02;
  const fridge = new THREE.Mesh(GEO.unitBox, new THREE.MeshStandardMaterial({ color: fridgeColor, roughness: 0.3 }));
  fridge.scale.set(0.54, fh, 0.56);
  fridge.position.set(0.66, fh / 2, 0);
  const handle1 = new THREE.Mesh(GEO.unitBox, metal);
  handle1.scale.set(0.03, 0.22, 0.04);
  handle1.position.set(0.46, fh * 0.76, -0.3);
  const handle2 = handle1.clone();
  handle2.position.set(0.46, fh * 0.38, -0.3);
  g.add(fridge, handle1, handle2);

  return g;
}

function createLivingDeskGroup(lv) {
  const g = new THREE.Group();

  // 원형 러그
  const rugColors = [0xd6d3d1, 0xfbcfe8, 0xfde68a, 0xfef08a];
  const rug = new THREE.Mesh(GEO.unitCyl, new THREE.MeshStandardMaterial({ color: rugColors[lv], roughness: 0.85 }));
  rug.scale.set(1.75, 0.025, 1.75);
  rug.position.set(-1.15, 0.015, -0.65);
  g.add(rug);

  if (lv === 0) {
    const crate = new THREE.Mesh(GEO.unitBox, MAT.woodWarm);
    crate.scale.set(0.8, 0.45, 0.5);
    crate.position.set(0.15, 0.23, 0);
    g.add(crate);
    return g;
  }

  // 분리형 다중 파츠 소파 (좌방석 + 등받이 + 양쪽 팔걸이 + 쿠션 2개)
  const sColor = lv >= 3 ? 0xfacc15 : lv === 2 ? 0xfed7aa : 0xf9a8d4;
  const sMat = new THREE.MeshStandardMaterial({ color: sColor, roughness: 0.65 });
  const sofa = new THREE.Group();
  sofa.position.set(-1.15, 0, -0.78);
  const seat = new THREE.Mesh(GEO.unitBox, sMat);
  seat.scale.set(1.06, 0.22, 0.52);
  seat.position.y = 0.18;
  const back = new THREE.Mesh(GEO.unitBox, sMat);
  back.scale.set(1.06, 0.44, 0.15);
  back.position.set(0, 0.4, -0.2);
  const armL = new THREE.Mesh(GEO.unitBox, sMat);
  armL.scale.set(0.15, 0.34, 0.54);
  armL.position.set(-0.55, 0.28, 0);
  const armR = armL.clone();
  armR.position.x = 0.55;
  const c1 = new THREE.Mesh(GEO.unitBox, MAT.white);
  c1.scale.set(0.25, 0.2, 0.1);
  c1.position.set(-0.28, 0.38, -0.08);
  const c2 = c1.clone();
  c2.position.x = 0.28;
  sofa.add(seat, back, armL, armR, c1, c2);
  g.add(sofa);

  // 책상 + 다리 4개 + 노트북/모니터 + 의자
  const desk = new THREE.Group();
  desk.position.set(0.2, 0, 0.05);
  const dTop = new THREE.Mesh(GEO.unitBox, MAT.woodWarm);
  dTop.scale.set(1.08, 0.06, 0.54);
  dTop.position.y = 0.54;
  desk.add(dTop);
  [[-0.46, -0.2], [0.46, -0.2], [-0.46, 0.2], [0.46, 0.2]].forEach(([lx, lz]) => {
    const dl = new THREE.Mesh(GEO.unitCyl, MAT.woodWarm);
    dl.scale.set(0.05, 0.52, 0.05);
    dl.position.set(lx, 0.26, lz);
    desk.add(dl);
  });

  const scrMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 0.65 });
  const mon = new THREE.Mesh(GEO.unitBox, scrMat);
  mon.scale.set(lv >= 3 ? 0.72 : 0.38, 0.26, 0.03);
  mon.position.set(0, 0.71, 0.1);
  const chair = new THREE.Mesh(GEO.unitCyl, sMat);
  chair.scale.set(0.38, 0.08, 0.38);
  chair.position.set(0, 0.34, -0.42);
  desk.add(mon, chair);
  g.add(desk);

  return g;
}

function createWindowACPlantGroup(lv) {
  const g = new THREE.Group();
  const win = new THREE.Mesh(
    GEO.unitBox,
    new THREE.MeshStandardMaterial({ color: 0xbae6fd, emissive: 0x7dd3fc, emissiveIntensity: 0.45 })
  );
  win.scale.set(1.15, 0.82, 0.08);
  win.position.set(-0.15, 1.38, -2.12);
  g.add(win);

  if (lv >= 1) {
    const cMat = new THREE.MeshStandardMaterial({ color: lv >= 3 ? 0xfde047 : 0xfbcfe8 });
    [-0.62, 0.32].forEach((cx) => {
      const drape = new THREE.Mesh(GEO.unitCyl, cMat);
      drape.scale.set(0.2, 0.96, 0.16);
      drape.position.set(cx, 1.36, -2.04);
      g.add(drape);
    });

    const ac = new THREE.Mesh(GEO.unitBox, MAT.white);
    ac.scale.set(0.92, 0.26, 0.22);
    ac.position.set(-1.45, 1.86, -2.05);
    g.add(ac);

    // 화분(몸체+흙+초록 잎사귀들)
    const plant = new THREE.Group();
    plant.position.set(0.58, 0, -1.78);
    const pot = new THREE.Mesh(GEO.unitCyl, new THREE.MeshStandardMaterial({ color: 0xe07a5f }));
    pot.scale.set(0.32, 0.28, 0.32);
    pot.position.y = 0.14;
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x22c55e });
    for (let i = 0; i < 5; i++) {
      const a = (Math.PI * 2 * i) / 5;
      const lf = new THREE.Mesh(GEO.unitSphere, leafMat);
      lf.scale.set(0.28, 0.08, 0.16);
      lf.position.set(Math.cos(a) * 0.16, 0.38 + (i % 2) * 0.07, Math.sin(a) * 0.16);
      lf.rotation.y = -a;
      plant.add(lf);
    }
    plant.add(pot);
    g.add(plant);
  }
  return g;
}

// 1층 상가 3종 다중 파츠 빌더 (편의점, 코인세탁소, 베이커리 카페)
function createShopInteriorGroup(shopKey, level = 1) {
  const g = new THREE.Group();
  const canColors = [0xf43f5e, 0xfacc15, 0x38bdf8, 0x4ade80, 0xfb923c];

  if (shopKey === 'store') {
    // 투명 유리 음료 쇼케이스 냉장고 2동 + 음료 캔 파츠들 + 간식 매대 + POS 계산대
    [-1.4, -0.1].forEach((fx) => {
      const f = new THREE.Group();
      f.position.set(fx, 0, -0.95);
      const rear = new THREE.Mesh(GEO.unitBox, MAT.white);
      rear.scale.set(1.05, 1.45, 0.06);
      rear.position.set(0, 0.72, -0.2);
      f.add(rear);

      [0.35, 0.75, 1.12].forEach((sy, sIdx) => {
        const shelf = new THREE.Mesh(GEO.unitBox, MAT.chrome);
        shelf.scale.set(0.98, 0.03, 0.38);
        shelf.position.set(0, sy, 0);
        f.add(shelf);
        for (let c = -1; c <= 1; c++) {
          const can = new THREE.Mesh(GEO.unitCyl, new THREE.MeshStandardMaterial({ color: canColors[(c + 2 + sIdx) % 5] }));
          can.scale.set(0.12, 0.2, 0.12);
          can.position.set(c * 0.26, sy + 0.11, 0.04);
          f.add(can);
        }
      });

      const door = new THREE.Mesh(GEO.unitBox, MAT.glass);
      door.scale.set(1.02, 1.38, 0.03);
      door.position.set(0, 0.72, 0.22);
      f.add(door);
      g.add(f);
    });

    const pos = new THREE.Mesh(GEO.unitBox, new THREE.MeshStandardMaterial({ color: 0x34d399 }));
    pos.scale.set(1.25, 0.68, 0.62);
    pos.position.set(1.45, 0.34, 0.35);
    const mon = new THREE.Mesh(GEO.unitBox, new THREE.MeshStandardMaterial({ color: 0x1e293b, emissive: 0x38bdf8, emissiveIntensity: 0.5 }));
    mon.scale.set(0.34, 0.26, 0.05);
    mon.position.set(1.3, 0.82, 0.35);
    g.add(pos, mon);
  } else if (shopKey === 'laundry') {
    // 내부 빨래가 회전하는 3연동 드럼세탁기 부스
    [-1.4, -0.2, 1.0].forEach((wx, idx) => {
      const u = new THREE.Group();
      u.position.set(wx, 0, -0.9);
      const body = new THREE.Mesh(GEO.unitBox, MAT.white);
      body.scale.set(1.02, 1.22, 0.78);
      body.position.y = 0.61;
      const win = new THREE.Mesh(GEO.unitCyl, MAT.glass);
      win.scale.set(0.58, 0.04, 0.58);
      win.rotation.x = Math.PI / 2;
      win.position.set(0, 0.58, 0.41);

      const drum = new THREE.Group();
      drum.position.set(0, 0.58, 0.32);
      for (let k = 0; k < 3; k++) {
        const a = (Math.PI * 2 * k) / 3;
        const cl = new THREE.Mesh(GEO.unitSphere, new THREE.MeshStandardMaterial({ color: canColors[(k + idx) % 5] }));
        cl.scale.set(0.22, 0.22, 0.16);
        cl.position.set(Math.cos(a) * 0.14, Math.sin(a) * 0.14, 0);
        drum.add(cl);
      }
      spinningDrums.push(drum);
      u.add(body, win, drum);

      if (level >= 2 && idx < 2) {
        const dryer = new THREE.Mesh(GEO.unitBox, new THREE.MeshStandardMaterial({ color: 0xfef3c7 }));
        dryer.scale.set(0.98, 0.65, 0.74);
        dryer.position.y = 1.54;
        u.add(dryer);
      }
      g.add(u);
    });
  } else {
    // 베이커리 & 카페 집기 (유리 빵 쇼케이스 + 크루아상/케이크 + 에스프레소 머신 + 원형 테이블)
    const caseBase = new THREE.Mesh(GEO.unitBox, MAT.woodWarm);
    caseBase.scale.set(1.9, 0.62, 0.68);
    caseBase.position.set(-0.7, 0.31, -0.65);
    const caseGlass = new THREE.Mesh(GEO.unitBox, MAT.glass);
    caseGlass.scale.set(1.86, 0.45, 0.62);
    caseGlass.position.set(-0.7, 0.84, -0.65);
    g.add(caseBase, caseGlass);

    for (let i = -2; i <= 2; i++) {
      const bread = new THREE.Mesh(GEO.unitSphere, new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0xd97706 : 0xfda4af }));
      bread.scale.set(0.24, 0.15, 0.18);
      bread.position.set(-0.7 + i * 0.34, 0.72, -0.65);
      g.add(bread);
    }

    const espresso = new THREE.Mesh(GEO.unitBox, new THREE.MeshStandardMaterial({ color: 0xe11d48 }));
    espresso.scale.set(0.55, 0.46, 0.45);
    espresso.position.set(0.95, 0.82, -0.75);
    const cafeCounter = new THREE.Mesh(GEO.unitBox, MAT.woodDark);
    cafeCounter.scale.set(1.1, 0.62, 0.65);
    cafeCounter.position.set(0.95, 0.31, -0.75);
    const roundTable = new THREE.Mesh(GEO.unitCyl, MAT.white);
    roundTable.scale.set(0.85, 0.06, 0.85);
    roundTable.position.set(0.3, 0.56, 0.55);
    const tableLeg = new THREE.Mesh(GEO.unitCyl, MAT.woodDark);
    tableLeg.scale.set(0.1, 0.56, 0.1);
    tableLeg.position.set(0.3, 0.28, 0.55);
    g.add(espresso, cafeCounter, roundTable, tableLeg);
  }

  return g;
}

// =========================================================
// 3. [마을 뷰 전용] 3D 외관 쉘(Exterior Shell), 빈 땅 울타리/입간판, 공사장 타워크레인
// =========================================================
function createEmptyLotMesh(landPrice) {
  const g = new THREE.Group();

  // 잔디 패드
  const pad = new THREE.Mesh(GEO.unitBox, new THREE.MeshStandardMaterial({ color: 0xbbf7d0, roughness: 0.9 }));
  pad.scale.set(13.6, 0.14, 10.6);
  pad.position.y = 0.07;
  g.add(pad);

  // 나무 울타리 둘레 조립 (기둥 16개 + 가로 레일)
  for (let x = -6.4; x <= 6.4; x += 1.6) {
    [-5.0, 5.0].forEach((z) => {
      if (z > 0 && Math.abs(x) < 1.7) return; // 전면 입구 개방
      const post = new THREE.Mesh(GEO.unitBox, MAT.woodWarm);
      post.scale.set(0.16, 0.68, 0.16);
      post.position.set(x, 0.4, z);
      g.add(post);
    });
  }
  const railBack = new THREE.Mesh(GEO.unitBox, MAT.woodWarm);
  railBack.scale.set(12.9, 0.1, 0.08);
  railBack.position.set(0, 0.55, -5.0);
  const railL = new THREE.Mesh(GEO.unitBox, MAT.woodWarm);
  railL.scale.set(0.08, 0.1, 10.0);
  railL.position.set(-6.4, 0.55, 0);
  const railR = railL.clone();
  railR.position.x = 6.4;
  g.add(railBack, railL, railR);

  // 3D 매입 입간판 (기둥 2개 + 나무 보드판)
  const signGroup = new THREE.Group();
  signGroup.position.set(0, 0, 1.2);
  signGroup.rotation.y = 0.25;
  [-0.85, 0.85].forEach((sx) => {
    const leg = new THREE.Mesh(GEO.unitCyl, MAT.woodDark);
    leg.scale.set(0.14, 1.85, 0.14);
    leg.position.set(sx, 0.95, 0);
    signGroup.add(leg);
  });
  const board = new THREE.Mesh(
    GEO.unitBox,
    new THREE.MeshStandardMaterial({ color: landPrice >= 5000 ? 0xfef08a : 0xfffbeb, roughness: 0.45 })
  );
  board.scale.set(2.4, 1.15, 0.16);
  board.position.set(0, 1.45, 0);
  const frame = new THREE.Mesh(GEO.unitBox, MAT.woodDark);
  frame.scale.set(2.56, 1.3, 0.12);
  frame.position.set(0, 1.45, -0.02);
  signGroup.add(frame, board);
  g.add(signGroup);

  return g;
}

// 신축 공사 중: 3D 공사장 가림막 + 회전하는 노란 타워크레인!
function createConstructionSite3D() {
  const g = new THREE.Group();

  // 안전 가림막 펜스 4면
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.6 });
  const f1 = new THREE.Mesh(GEO.unitBox, fenceMat);
  f1.scale.set(13.2, 1.8, 0.2);
  f1.position.set(0, 0.9, 4.8);
  const f2 = f1.clone();
  f2.position.z = -4.8;
  const f3 = new THREE.Mesh(GEO.unitBox, fenceMat);
  f3.scale.set(0.2, 1.8, 9.6);
  f3.position.set(-6.5, 0.9, 0);
  const f4 = f3.clone();
  f4.position.x = 6.5;
  g.add(f1, f2, f3, f4);

  // 타워크레인 마스트 기둥 + 상단 회전 지브(Jib)
  const craneYellow = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.3, roughness: 0.4 });
  const mast = new THREE.Mesh(GEO.unitBox, craneYellow);
  mast.scale.set(0.75, 9.2, 0.75);
  mast.position.set(-2.5, 4.6, -1.5);
  g.add(mast);

  const craneTop = new THREE.Group();
  craneTop.position.set(-2.5, 9.2, -1.5);
  const jib = new THREE.Mesh(GEO.unitBox, craneYellow);
  jib.scale.set(7.8, 0.45, 0.45);
  jib.position.set(2.2, 0.2, 0);
  const counterWeight = new THREE.Mesh(GEO.unitBox, MAT.woodDark);
  counterWeight.scale.set(1.1, 0.7, 0.7);
  counterWeight.position.set(-1.6, 0.1, 0);
  const cable = new THREE.Mesh(GEO.unitCyl, MAT.chrome);
  cable.scale.set(0.05, 3.2, 0.05);
  cable.position.set(4.5, -1.5, 0);
  const hookLoad = new THREE.Mesh(GEO.unitBox, MAT.woodWarm);
  hookLoad.scale.set(1.1, 0.7, 0.9);
  hookLoad.position.set(4.5, -3.1, 0);
  craneTop.add(jib, counterWeight, cable, hookLoad);
  g.add(craneTop);

  g.userData.craneTop = craneTop;
  return g;
}

// [마을 뷰 LOD 전용] 경량·고밀도 입체 건물 외관 & 지붕 쉘(Exterior Shell)
function createBuildingExteriorShell(buildingType) {
  const g = new THREE.Group();
  const cat = BUILDING_CATALOG[buildingType];
  g.add(createContactShadow(15.6, 12.2, 0.02));

  if (buildingType === 'park') {
    // 햇살 힐링 공원 3D 조립 (잔디 동산 + 원형 분수대 + 물줄기 + 산책로 + 나무 5그루 + 벤치 2개)
    const lawn = new THREE.Mesh(GEO.unitBox, new THREE.MeshStandardMaterial({ color: 0x86efac, roughness: 0.85 }));
    lawn.scale.set(14.2, 0.25, 11.0);
    lawn.position.y = 0.12;
    const path1 = new THREE.Mesh(GEO.unitBox, new THREE.MeshStandardMaterial({ color: 0xfef3c7 }));
    path1.scale.set(13.6, 0.28, 1.6);
    path1.position.y = 0.14;
    const path2 = new THREE.Mesh(GEO.unitBox, new THREE.MeshStandardMaterial({ color: 0xfef3c7 }));
    path2.scale.set(1.6, 0.28, 10.4);
    path2.position.y = 0.14;
    g.add(lawn, path1, path2);

    // 중앙 2단 분수대
    const basin = new THREE.Mesh(GEO.unitCyl, MAT.white);
    basin.scale.set(3.4, 0.45, 3.4);
    basin.position.y = 0.42;
    const water = new THREE.Mesh(GEO.unitCyl, new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.35 }));
    water.scale.set(3.0, 0.48, 3.0);
    water.position.y = 0.44;
    const spout = new THREE.Mesh(GEO.unitCyl, MAT.white);
    spout.scale.set(0.6, 1.4, 0.6);
    spout.position.y = 0.95;
    const splash = new THREE.Mesh(GEO.unitSphere, new THREE.MeshStandardMaterial({ color: 0xbae6fd }));
    splash.scale.set(1.1, 0.7, 1.1);
    splash.position.y = 1.75;
    g.add(basin, water, spout, splash);

    [[-5.0, -3.5], [5.0, -3.5], [-5.2, 3.4], [5.2, 3.4], [0, -4.0]].forEach(([tx, tz]) => {
      g.add(createMiniTree(tx, tz, 1.05));
    });
    return g;
  }

  if (buildingType === 'commercial') {
    // 2층 모던 상가 전용 빌딩 외관 (쇼윈도 + 컬러 어닝 3개 + 옥상 간판 타워)
    const body = new THREE.Mesh(GEO.unitBox, new THREE.MeshStandardMaterial({ color: 0xfffbeb, roughness: 0.5 }));
    body.scale.set(13.6, 5.2, 8.6);
    body.position.y = 2.6;
    const roof = new THREE.Mesh(GEO.unitBox, new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.4 }));
    roof.scale.set(14.1, 0.55, 9.1);
    roof.position.y = 5.45;
    g.add(body, roof);

    [[-4.2, 0x38bdf8], [0, 0xfb923c], [4.2, 0xf472b6]].forEach(([ax, col]) => {
      const awn = new THREE.Mesh(GEO.unitBox, new THREE.MeshStandardMaterial({ color: col }));
      awn.scale.set(3.6, 0.32, 1.2);
      awn.position.set(ax, 2.35, 4.65);
      awn.rotation.x = 0.22;
      const glass = new THREE.Mesh(GEO.unitBox, new THREE.MeshStandardMaterial({ color: 0xbae6fd, emissive: 0x38bdf8, emissiveIntensity: 0.3 }));
      glass.scale.set(3.2, 1.8, 0.12);
      glass.position.set(ax, 1.1, 4.32);
      g.add(awn, glass);
    });
    return g;
  }

  // 주거/복합 빌라 & 프리미엄 오피스텔 입체 외관 + 지붕!
  const isOfficetel = buildingType === 'officetel';
  const h = isOfficetel ? 8.4 : 7.0;
  const mainWallMat = isOfficetel
    ? new THREE.MeshStandardMaterial({ color: 0xfef9ee, roughness: 0.35 })
    : new THREE.MeshStandardMaterial({ map: TEX.brick, roughness: 0.72 });

  const mass = new THREE.Mesh(GEO.unitBox, mainWallMat);
  mass.scale.set(14.2, h, 9.4);
  mass.position.y = h / 2;
  g.add(mass);

  // 따뜻한 빛이 나는 외벽 창문 그리드
  const winMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.55,
    roughness: 0.2
  });
  const floorsY = isOfficetel ? [2.6, 4.8, 7.0] : [2.5, 5.0];
  floorsY.forEach((fy) => {
    [-4.6, 0, 4.6].forEach((wx) => {
      const w = new THREE.Mesh(GEO.unitBox, winMat);
      w.scale.set(2.2, 1.25, 0.14);
      w.position.set(wx, fy, 4.72);
      g.add(w);
    });
  });

  // 1층 상가 어닝 포인트 (복합빌라/오피스텔)
  if (cat.hasGroundShops) {
    [-3.8, 3.8].forEach((ax, idx) => {
      const awn = new THREE.Mesh(GEO.unitBox, new THREE.MeshStandardMaterial({ color: idx === 0 ? 0x0ea5e9 : 0xf472b6 }));
      awn.scale.set(4.6, 0.28, 1.1);
      awn.position.set(ax, 1.65, 5.05);
      awn.rotation.x = 0.2;
      g.add(awn);
    });
  }

  // 지붕 (빌라: 박공 테라코타 지붕 / 오피스텔: 골드 크라운 루프탑)
  if (isOfficetel) {
    const crown = new THREE.Mesh(GEO.unitBox, MAT.gold);
    crown.scale.set(14.6, 0.55, 9.8);
    crown.position.y = h + 0.25;
    const penthouse = new THREE.Mesh(GEO.unitBox, MAT.white);
    penthouse.scale.set(8.5, 1.3, 5.5);
    penthouse.position.y = h + 1.1;
    g.add(crown, penthouse);
  } else {
    const roofSlab = new THREE.Mesh(GEO.unitBox, new THREE.MeshStandardMaterial({ color: cat.roofColor, roughness: 0.55 }));
    roofSlab.scale.set(15.0, 0.55, 10.2);
    roofSlab.position.y = h + 0.25;
    const pitched = new THREE.Mesh(
      new THREE.ConeGeometry(7.2, 2.2, 4),
      new THREE.MeshStandardMaterial({ color: cat.roofColor, roughness: 0.55 })
    );
    pitched.rotation.y = Math.PI / 4;
    pitched.scale.set(1.45, 1, 0.98);
    pitched.position.y = h + 1.55;
    g.add(roofSlab, pitched);
  }

  return g;
}

function createMiniTree(x, z, scale = 1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.setScalar(scale);
  g.add(createContactShadow(2.2, 2.2, 0.02));
  const trunk = new THREE.Mesh(GEO.unitCyl, MAT.woodDark);
  trunk.scale.set(0.36, 1.3, 0.36);
  trunk.position.y = 0.65;
  const c1 = new THREE.Mesh(GEO.unitSphere, new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.7 }));
  c1.scale.set(1.9, 1.8, 1.9);
  c1.position.y = 1.85;
  const c2 = new THREE.Mesh(GEO.unitSphere, new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.7 }));
  c2.scale.set(1.3, 1.25, 1.3);
  c2.position.set(0.55, 1.55, 0.35);
  g.add(trunk, c1, c2);
  return g;
}

// 3D Chibi 입주민/행인 메쉬
function createChibi3D(style = {}) {
  const g = new THREE.Group();
  g.add(createContactShadow(0.75, 0.75, 0.02));
  const torso = new THREE.Mesh(GEO.unitCyl, new THREE.MeshStandardMaterial({ color: style.outfitColor || '#3b82f6' }));
  torso.scale.set(0.42, 0.46, 0.42);
  torso.position.y = 0.42;
  const head = new THREE.Mesh(GEO.unitSphere, new THREE.MeshStandardMaterial({ color: 0xffdbb5 }));
  head.scale.set(0.56, 0.52, 0.54);
  head.position.y = 0.88;
  const hair = new THREE.Mesh(GEO.unitSphere, new THREE.MeshStandardMaterial({ color: style.hairColor || '#292524' }));
  hair.scale.set(0.59, 0.36, 0.58);
  hair.position.set(0, 0.98, -0.03);
  g.add(torso, head, hair);
  return g;
}

// =========================================================
// 4. Three.js 월드 초기화 & 2단계 LOD 시점 전환(마을 뷰 ↔ 내부 뷰)
// =========================================================
function getResponsiveFrustum() {
  const aspect = window.innerWidth / window.innerHeight;
  // 모바일 세로(9:16) 화면에서도 타운이 잘리지 않도록 자동 보정!
  return aspect < 1 ? 34 / Math.max(0.52, aspect) : 34;
}

function updateCameraFrustum() {
  const aspect = window.innerWidth / window.innerHeight;
  const f = getResponsiveFrustum();
  camera.left = (-f * aspect) / 2;
  camera.right = (f * aspect) / 2;
  camera.top = f / 2;
  camera.bottom = -f / 2;
  camera.updateProjectionMatrix();
}

function initThreeWorld() {
  initSharedAssets();

  scene = new THREE.Scene();
  const aspect = window.innerWidth / window.innerHeight;
  const f = getResponsiveFrustum();
  camera = new THREE.OrthographicCamera((-f * aspect) / 2, (f * aspect) / 2, f / 2, (-f) / 2, -120, 260);
  camera.position.set(34, 34, 38);
  camera.zoom = 0.95;
  camera.updateProjectionMatrix();

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  dom.webglContainer.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.5, 1.0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minZoom = 0.52;
  controls.maxZoom = 3.4;
  controls.minPolarAngle = Math.PI * 0.15;
  controls.maxPolarAngle = Math.PI * 0.42;
  controls.screenSpacePanning = true;
  controls.update();

  hemiLight = new THREE.HemisphereLight(0xfff9eb, 0xd4a373, 1.05);
  scene.add(hemiLight);

  dirLight = new THREE.DirectionalLight(0xfff0cc, 1.35);
  dirLight.position.set(26, 42, 28);
  scene.add(dirLight);

  const backFill = new THREE.DirectionalLight(0xffd8be, 0.42);
  backFill.position.set(-22, 20, -18);
  scene.add(backFill);

  buildTownEnvironment();
  buildAllLots3D();
  spawnTownTrafficAndWalkers();
}

function buildTownEnvironment() {
  const env = new THREE.Group();

  // 거대 타운 아일랜드 보드
  const boardWood = new THREE.Mesh(GEO.unitBox, MAT.woodDark);
  boardWood.scale.set(62, 1.4, 56);
  boardWood.position.set(0, -0.8, -2);
  const grass = new THREE.Mesh(GEO.unitBox, new THREE.MeshStandardMaterial({ color: 0xa7f3d0, roughness: 0.9 }));
  grass.scale.set(60.8, 0.22, 54.8);
  grass.position.set(0, -0.05, -2);
  env.add(boardWood, grass);

  // 동서 메인 대로 (Z = 1.5) & 남북 교차 도로 & 횡단보도
  const mainAve = new THREE.Mesh(GEO.unitBox, new THREE.MeshStandardMaterial({ map: TEX.roadH, roughness: 0.85 }));
  mainAve.scale.set(60, 0.14, 5.2);
  mainAve.position.set(0, 0.06, 1.5);
  env.add(mainAve);

  // 보도블럭 인도
  [-1.8, 4.8].forEach((sz) => {
    const sw = new THREE.Mesh(GEO.unitBox, new THREE.MeshStandardMaterial({ color: 0xf5e0c8, roughness: 0.8 }));
    sw.scale.set(60, 0.16, 1.5);
    sw.position.set(0, 0.08, sz);
    env.add(sw);
  });

  // 횡단보도 화이트 스트라이프 2곳
  [-8.6, 8.6].forEach((cx) => {
    for (let z = -0.5; z <= 3.5; z += 0.75) {
      const stripe = new THREE.Mesh(GEO.unitBox, MAT.white);
      stripe.scale.set(1.8, 0.16, 0.38);
      stripe.position.set(cx, 0.07, z);
      env.add(stripe);
    }
  });

  // 마을 가로수 & 가로등 배치
  [[-26, -2.2], [-10, -2.2], [10, -2.2], [26, -2.2], [-26, 5.2], [0, 5.2], [26, 5.2]].forEach(([tx, tz]) => {
    env.add(createMiniTree(tx, tz, 1.1));
  });

  [[-13, 4.9], [13, 4.9], [-13, -1.9], [13, -1.9]].forEach(([lx, lz]) => {
    const pole = new THREE.Mesh(GEO.unitCyl, MAT.woodDark);
    pole.scale.set(0.12, 2.8, 0.12);
    pole.position.set(lx, 1.4, lz);
    const bulb = new THREE.Mesh(
      GEO.unitSphere,
      new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfbbf24, emissiveIntensity: 0.9 })
    );
    bulb.scale.set(0.45, 0.45, 0.45);
    bulb.position.set(lx, 2.85, lz);
    env.add(pole, bulb);
  });

  scene.add(env);
}

function spawnTownTrafficAndWalkers() {
  // 마을 도로 자동차 2대
  [
    { z: 0.3, dir: 1, color: 0x38bdf8, x: -24 },
    { z: 2.7, dir: -1, color: 0xfda4af, x: 22 }
  ].forEach((cfg) => {
    const car = new THREE.Group();
    car.add(createContactShadow(2.4, 1.4, 0.03));
    const body = new THREE.Mesh(GEO.unitBox, new THREE.MeshStandardMaterial({ color: cfg.color, roughness: 0.3 }));
    body.scale.set(2.1, 0.55, 1.1);
    body.position.y = 0.38;
    const top = new THREE.Mesh(GEO.unitBox, MAT.white);
    top.scale.set(1.2, 0.45, 0.96);
    top.position.y = 0.82;
    car.add(body, top);
    car.position.set(cfg.x, 0.12, cfg.z);
    scene.add(car);
    townVehicles.push({ mesh: car, dir: cfg.dir, speed: 5.5 });
  });

  // 마을 인도를 걸어 다니며 상권을 방문하는 3D 입주민 행인 5명
  for (let i = 0; i < 5; i++) {
    const job = TENANT_JOBS[i % TENANT_JOBS.length];
    const wMesh = createChibi3D(job.style);
    const wz = i % 2 === 0 ? -1.8 : 4.8;
    const wx = -20 + i * 9;
    wMesh.position.set(wx, 0.15, wz);
    scene.add(wMesh);
    townWalkers.push({
      mesh: wMesh,
      dir: i % 2 === 0 ? 1 : -1,
      speed: 2.1 + (i % 3) * 0.4,
      phase: i * 1.4,
      baseZ: wz
    });
  }
}

function buildAllLots3D() {
  for (const lot of state.lots) {
    const root = new THREE.Group();
    root.position.set(lot.x, 0.05, lot.z);
    scene.add(root);

    const emptyGroup = new THREE.Group();
    const constructionGroup = new THREE.Group();
    const exteriorGroup = new THREE.Group();
    const interiorGroup = new THREE.Group();
    interiorGroup.visible = false; // 핵심 LOD: 마을 뷰에서는 내부 가구 그룹을 완전히 숨김!

    // 지붕 위 회전하는 3D 황금 수금 코인 마커
    const roofCoinMesh = new THREE.Mesh(GEO.coin, MAT.coin);
    roofCoinMesh.scale.setScalar(3.2);
    roofCoinMesh.position.set(0, 9.8, 0);
    roofCoinMesh.visible = false;

    root.add(emptyGroup, constructionGroup, exteriorGroup, interiorGroup, roofCoinMesh);

    lot3DRegistry[lot.lotId] = {
      root,
      emptyGroup,
      constructionGroup,
      exteriorGroup,
      interiorGroup,
      roofCoinMesh,
      roomSubGroups: {},
      shopSubGroups: {},
      interiorBuilt: false
    };

    refreshLot3D(lot.lotId);
  }
}

function refreshLot3D(lotId) {
  const lot = state.lots.find((l) => l.lotId === lotId);
  const reg = lot3DRegistry[lotId];
  if (!lot || !reg) return;

  reg.emptyGroup.clear();
  reg.exteriorGroup.clear();

  if (!lot.owned) {
    const emptyMesh = createEmptyLotMesh(lot.landPrice);
    emptyMesh.traverse((c) => {
      if (c.isMesh) {
        c.userData.lotId = lotId;
        if (!pickableTownMeshes.includes(c)) pickableTownMeshes.push(c);
      }
    });
    reg.emptyGroup.add(emptyMesh);
    reg.emptyGroup.visible = true;
    reg.exteriorGroup.visible = false;
    reg.interiorGroup.visible = false;
    return;
  }

  reg.emptyGroup.visible = false;
  const shell = createBuildingExteriorShell(lot.buildingType);
  shell.traverse((c) => {
    if (c.isMesh) {
      c.userData.lotId = lotId;
      if (!pickableTownMeshes.includes(c)) pickableTownMeshes.push(c);
    }
  });
  reg.exteriorGroup.add(shell);

  const isThisInteriorOpen = viewMode === 'BUILDING' && activeLotId === lotId;
  reg.exteriorGroup.visible = !isThisInteriorOpen;
  reg.interiorGroup.visible = isThisInteriorOpen;

  if (isThisInteriorOpen) {
    ensureBuildingInteriorBuilt(lotId);
  }
}

// 특정 건물의 내부 Cutaway 호실 및 상가 3D 조립 (진입 시 생성/업데이트)
function ensureBuildingInteriorBuilt(lotId) {
  const b = state.buildings[lotId];
  const reg = lot3DRegistry[lotId];
  if (!b || !reg) return;

  reg.interiorGroup.clear();
  reg.roomSubGroups = {};
  reg.shopSubGroups = {};

  // 건물 내부 바닥 기단 & 복도 난간
  const base = new THREE.Mesh(GEO.unitBox, new THREE.MeshStandardMaterial({ map: TEX.brick, roughness: 0.75 }));
  base.scale.set(16.6, 2.2, 8.8);
  base.position.set(0, 1.1, -0.4);
  reg.interiorGroup.add(base);

  // 호실들 조립
  for (const room of b.rooms) {
    const rGroup = new THREE.Group();
    rGroup.position.set(room.lx, room.ly, room.lz);
    reg.interiorGroup.add(rGroup);
    reg.roomSubGroups[room.id] = rGroup;
    rebuildSingleRoom3D(room, null);
  }

  // 1층 상가들 조립
  for (const sh of b.shops) {
    const sGroup = new THREE.Group();
    sGroup.position.set(sh.lx, sh.ly, sh.lz);
    reg.interiorGroup.add(sGroup);
    reg.shopSubGroups[sh.id] = sGroup;
    rebuildSingleShop3D(sh, false);
  }

  reg.interiorBuilt = true;
  syncInteriorActorsForBuilding(lotId);
}

function rebuildSingleRoom3D(room, bounceKey = null) {
  const reg = lot3DRegistry[room.lotId];
  if (!reg || !reg.roomSubGroups[room.id]) return;
  const g = reg.roomSubGroups[room.id];
  g.clear();

  const W = TOWN_CONFIG.roomWidth;
  const D = TOWN_CONFIG.roomDepth;
  const H = TOWN_CONFIG.wallHeight;
  const wpLv = room.furniture.wallpaper || 0;

  const floorSlab = new THREE.Mesh(
    GEO.unitBox,
    new THREE.MeshStandardMaterial({ map: TEX[`floor${wpLv}`], roughness: wpLv >= 3 ? 0.25 : 0.65 })
  );
  floorSlab.scale.set(W, 0.2, D);
  floorSlab.position.y = -0.1;
  floorSlab.userData.roomId = room.id;
  g.add(floorSlab);
  if (!pickableInteriorMeshes.includes(floorSlab)) pickableInteriorMeshes.push(floorSlab);

  const wallMat = new THREE.MeshStandardMaterial({ map: TEX[`wall${wpLv}`], roughness: 0.72 });
  const lowCapMat = new THREE.MeshStandardMaterial({ color: 0xfff8f0 });

  // Cutaway 벽체 (뒷벽 높게, 옆벽 절반 단면, 앞벽 낮게)
  const backW = new THREE.Mesh(GEO.unitBox, wallMat);
  backW.scale.set(W, H, 0.18);
  backW.position.set(0, H / 2, -D / 2 + 0.09);
  backW.userData.roomId = room.id;

  const sideL = new THREE.Mesh(GEO.unitBox, wallMat);
  sideL.scale.set(0.18, H, D * 0.5);
  sideL.position.set(-W / 2 + 0.09, H / 2, -D * 0.25);
  const sideLFront = new THREE.Mesh(GEO.unitBox, lowCapMat);
  sideLFront.scale.set(0.18, 0.65, D * 0.5);
  sideLFront.position.set(-W / 2 + 0.09, 0.32, D * 0.25);

  const sideR = sideL.clone();
  sideR.position.x = W / 2 - 0.09;
  const sideRFront = sideLFront.clone();
  sideRFront.position.x = W / 2 - 0.09;

  const frontLow = new THREE.Mesh(GEO.unitBox, lowCapMat);
  frontLow.scale.set(W, 0.32, 0.18);
  frontLow.position.set(0, 0.16, D / 2 - 0.09);

  [backW, sideL, sideLFront, sideR, sideRFront, frontLow].forEach((m) => {
    m.userData.roomId = room.id;
    g.add(m);
    if (!pickableInteriorMeshes.includes(m)) pickableInteriorMeshes.push(m);
  });

  if (!room.unlocked) {
    const lockCover = new THREE.Mesh(
      GEO.unitBox,
      new THREE.MeshStandardMaterial({ color: 0x78350f, transparent: true, opacity: 0.55 })
    );
    lockCover.scale.set(W - 0.3, 0.14, D - 0.3);
    lockCover.position.y = 0.15;
    lockCover.userData.roomId = room.id;
    g.add(lockCover);
    if (!pickableInteriorMeshes.includes(lockCover)) pickableInteriorMeshes.push(lockCover);
    return;
  }

  const lot = getLot(room.lotId);
  const wx = lot.x + room.lx;
  const wy = room.ly;
  const wz = lot.z + room.lz;

  const bed = createBedGroup(room.furniture.bed);
  bed.position.set(-1.55, 0, -1.05);
  g.add(bed);
  if (bounceKey === 'bed') triggerBounce(bed, wx - 1.55, wy, wz - 1.05);

  const bath = createBathroomGroup(room.furniture.shower);
  bath.position.set(1.55, 0, -1.15);
  g.add(bath);
  if (bounceKey === 'shower') triggerBounce(bath, wx + 1.55, wy, wz - 1.15);

  const kit = createKitchenGroup(room.furniture.kitchen);
  kit.position.set(-1.4, 0, 1.45);
  g.add(kit);
  if (bounceKey === 'kitchen') triggerBounce(kit, wx - 1.4, wy, wz + 1.45);

  const desk = createLivingDeskGroup(room.furniture.desk);
  desk.position.set(1.3, 0, 1.25);
  g.add(desk);
  if (bounceKey === 'desk') triggerBounce(desk, wx + 1.3, wy, wz + 1.25);

  const winAc = createWindowACPlantGroup(room.furniture.ac);
  g.add(winAc);
  if (bounceKey === 'ac') triggerBounce(winAc, wx, wy + 1.0, wz - 1.5);

  if (bounceKey === 'wallpaper') spawnSparkles3D(wx, wy + 0.6, wz, 14);
}

function rebuildSingleShop3D(shop, withBounce = false) {
  const reg = lot3DRegistry[shop.lotId];
  if (!reg || !reg.shopSubGroups[shop.id]) return;
  const g = reg.shopSubGroups[shop.id];
  g.clear();

  const slab = new THREE.Mesh(GEO.unitBox, new THREE.MeshStandardMaterial({ map: TEX.floor1, roughness: 0.45 }));
  slab.scale.set(4.2, 0.2, 3.2);
  slab.position.y = -0.1;
  slab.userData.shopId = shop.id;
  g.add(slab);
  if (!pickableInteriorMeshes.includes(slab)) pickableInteriorMeshes.push(slab);

  const mesh = createShopInteriorGroup(shop.key, shop.level);
  mesh.traverse((c) => {
    if (c.isMesh) {
      c.userData.shopId = shop.id;
      if (!pickableInteriorMeshes.includes(c)) pickableInteriorMeshes.push(c);
    }
  });
  g.add(mesh);

  if (withBounce) {
    const lot = getLot(shop.lotId);
    triggerBounce(mesh, lot.x + shop.lx, shop.ly, lot.z + shop.lz);
  }
}

// =========================================================
// 5. 2단계 시점 전환 함수 (마을 전체 뷰 ↔ 건물 내부 집중 뷰)
// =========================================================
function enterBuildingInterior(lotId, focusRoomSubId = null) {
  const lot = getLot(lotId);
  const b = state.buildings[lotId];
  if (!lot || !b) return;

  const cat = BUILDING_CATALOG[b.buildingType];
  if (!cat.canEnterInterior) {
    // 공원은 터치 시 보너스 코인 회수 또는 안내
    if (b.pendingCoins > 0) {
      sweepBuildingCoins(lotId);
    } else {
      showToast('🌳 햇살 힐링 공원이 주변 주거 건물의 월세를 +15% 높여주고 있어요!', 'emerald');
    }
    return;
  }

  // 이전 열려 있던 건물 지붕 닫기(내부 비활성화)
  for (const id of Object.keys(lot3DRegistry)) {
    lot3DRegistry[id].interiorGroup.visible = false;
    if (getLot(id)?.owned) lot3DRegistry[id].exteriorGroup.visible = true;
  }

  viewMode = 'BUILDING';
  activeLotId = lotId;

  // 지붕/외벽이 열리고 내부 호실과 1층 상가 활성화!
  const reg = lot3DRegistry[lotId];
  reg.exteriorGroup.visible = false;
  reg.interiorGroup.visible = true;
  ensureBuildingInteriorBuilt(lotId);

  // 쌓여 있던 지붕 코인이 있으면 자동 수금
  if (b.pendingCoins > 0) sweepBuildingCoins(lotId);

  const offset = BUILDING_CAM_OFFSETS[camAzimuthIdx];
  camTween.targetLook.set(lot.x, 2.4, lot.z);
  camTween.targetPos.set(lot.x + offset.x, 2.4 + offset.y, lot.z + offset.z);
  camTween.targetZoom = 1.62;
  camTween.active = true;

  rebuildOverlayBadgesForCurrentMode();
  updateModeUI();

  if (focusRoomSubId) {
    const targetRoom = b.rooms.find((r) => r.subId === focusRoomSubId);
    if (targetRoom) selectRoom(targetRoom.id, true);
  }
}

function exitToTownView(focusLotId = null) {
  closeBottomPanel();
  clearInteriorActors();

  viewMode = 'TOWN';
  for (const lot of state.lots) {
    const reg = lot3DRegistry[lot.lotId];
    if (!reg) continue;
    reg.interiorGroup.visible = false; // 모바일 60fps 보장: 모든 내부 가구 그룹 완벽 차단!
    reg.exteriorGroup.visible = !!lot.owned;
  }

  const targetLot = focusLotId ? getLot(focusLotId) : null;
  const lookX = targetLot ? targetLot.x * 0.45 : 0;
  const lookZ = targetLot ? targetLot.z * 0.45 : 0.5;
  const offset = TOWN_CAM_OFFSETS[camAzimuthIdx];

  camTween.targetLook.set(lookX, 1.2, lookZ);
  camTween.targetPos.set(lookX + offset.x, 1.2 + offset.y, lookZ + offset.z);
  camTween.targetZoom = 0.92;
  camTween.active = true;

  rebuildOverlayBadgesForCurrentMode();
  updateModeUI();
}

function updateModeUI() {
  const isBuilding = viewMode === 'BUILDING';
  const curBuilding = state.buildings[activeLotId];

  dom.btnBackToTown.classList.toggle('hidden', !isBuilding);
  if (isBuilding && curBuilding) {
    dom.hudModePill.textContent = `🏠 ${curBuilding.title} 내부`;
    dom.toggleViewIcon.textContent = '🏙️';
    dom.toggleViewLabel.innerHTML = '마을<br/>전체보기';
    if (dom.bottomHelpPill) {
      dom.bottomHelpPill.textContent = '🏠 내부 뷰: 호실/상가 터치해 리모델링 · [🏙️ 마을 전체 보기]로 지붕 덮고 타운 확장!';
    }
  } else {
    dom.hudModePill.textContent = '🏙️ 마을 전체 뷰';
    dom.toggleViewIcon.textContent = '🏠';
    dom.toggleViewLabel.innerHTML = '1호점<br/>내부관리';
    if (dom.bottomHelpPill) {
      dom.bottomHelpPill.textContent = '🏙️ 마을 뷰: 건물 터치 시 내부 인테리어 진입 · 빈 땅 터치 시 신축 · 지붕 코인 스와이프 수금!';
    }
  }
}

// =========================================================
// 6. 빈 땅 매입 & 3D 공사장 애니메이션 & 상권 시너지 버프 계산
// =========================================================
function getLot(lotId) {
  return state.lots.find((l) => l.lotId === lotId);
}

// 주변 공원/상가/오피스텔 인접 시너지 보너스 % 계산
function calcBuildingSynergyInfo(lotId) {
  const targetLot = getLot(lotId);
  if (!targetLot) return { totalPct: 0, tags: [] };

  let totalPct = 0;
  const tags = [];

  for (const otherLot of state.lots) {
    if (otherLot.lotId === lotId || !otherLot.owned || !otherLot.buildingType) continue;
    const dist = Math.hypot(otherLot.x - targetLot.x, otherLot.z - targetLot.z);
    if (dist <= TOWN_CONFIG.synergyRadius) {
      const cat = BUILDING_CATALOG[otherLot.buildingType];
      if (cat && cat.synergy) {
        totalPct += cat.synergy.rentBonusPct;
        tags.push(`${cat.icon}+${cat.synergy.rentBonusPct}%`);
      }
    }
  }
  return { totalPct, tags };
}

function calcRoomMarketRent(room) {
  let subtotal = room.baseRent;
  for (const key of Object.keys(FURNITURE_TREE)) {
    const lv = room.furniture[key] || 0;
    subtotal += FURNITURE_TREE[key].levels[lv].rentBonus;
  }
  const activeSet = getRoomThemeSet(room);
  if (activeSet) {
    subtotal = Math.round(subtotal * (1 + activeSet.bonusPct / 100));
  }
  // 타운 상권 시너지 버프(예: 공원 인접 +15%) 합산!
  const syn = calcBuildingSynergyInfo(room.lotId);
  if (syn.totalPct > 0) {
    subtotal = Math.round(subtotal * (1 + syn.totalPct / 100));
  }
  return subtotal;
}

function getEffectiveRoomRent(room) {
  if (!room.unlocked || !room.tenant) return 0;
  const market = calcRoomMarketRent(room);
  const paid = Math.min(market, room.tenant.maxBudget);
  const happyBonus = room.tenant.happiness >= 85 ? Math.round(paid * 0.1) : 0;
  return paid + happyBonus;
}

function calcBuildingCycleIncome(b) {
  const cat = BUILDING_CATALOG[b.buildingType];
  let sum = cat.passiveIncome || 0;
  for (const r of b.rooms) sum += getEffectiveRoomRent(r);
  for (const sh of b.shops) {
    sum += SHOP_TEMPLATES[sh.key].levels[sh.level].visitProfit;
  }
  return sum;
}

function openEmptyLotModal(lotId) {
  const lot = getLot(lotId);
  if (!lot || lot.owned) return;
  pendingLotIdForModal = lotId;

  dom.lotModalName.textContent = `${lot.lotName} (토지비 ${lot.landPrice.toLocaleString()}만원)`;
  const buildableKeys = ['villa', 'commercial', 'officetel', 'park'];

  dom.lotBuildCards.innerHTML = buildableKeys.map((bKey) => {
    const cat = BUILDING_CATALOG[bKey];
    const totalCost = lot.landPrice + cat.buildCost;
    const canAfford = state.gold >= totalCost;

    return `
      <div class="bg-white rounded-2xl border-2 ${canAfford ? 'border-amber-400' : 'border-stone-200'} p-4 flex flex-col justify-between gap-3 shadow-sm">
        <div>
          <div class="flex items-center justify-between">
            <span class="font-jua text-base text-amber-950">${cat.icon} ${cat.name}</span>
            ${cat.synergy ? `<span class="font-jua text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-400 px-2 py-0.5 rounded-full">${cat.synergy.label} (+${cat.synergy.rentBonusPct}%)</span>` : '<span class="font-jua text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">내부 리모델링 가능</span>'}
          </div>
          <p class="text-xs text-stone-600 mt-1.5 leading-relaxed">${cat.desc}</p>
          <div class="mt-2 text-[11px] text-amber-900 bg-amber-50 rounded-xl px-2.5 py-1.5 border border-amber-200">
            땅값 ${lot.landPrice.toLocaleString()}만 + 건축비 ${cat.buildCost.toLocaleString()}만 = <b>총 ${totalCost.toLocaleString()}만원</b>
          </div>
        </div>

        <button data-btype="${bKey}" class="btn-confirm-build w-full font-jua text-sm py-2.5 rounded-xl ${
          canAfford ? 'jelly-btn-mint' : 'bg-stone-200 text-stone-400 border-2 border-stone-300'
        }">
          🏗️ ${cat.name} 신축 착공 (💰${totalCost.toLocaleString()}만)
        </button>
      </div>
    `;
  }).join('');

  dom.lotBuildCards.querySelectorAll('.btn-confirm-build').forEach((btn) => {
    btn.onclick = () => purchaseAndConstructLot(lotId, btn.dataset.btype);
  });

  dom.lotBuildModal.classList.remove('hidden');
}

function purchaseAndConstructLot(lotId, buildingType) {
  const lot = getLot(lotId);
  const cat = BUILDING_CATALOG[buildingType];
  if (!lot || lot.owned || !cat) return;

  const totalCost = lot.landPrice + cat.buildCost;
  if (state.gold < totalCost) {
    showToast(`💸 자금이 부족합니다! (총 ${totalCost.toLocaleString()}만원 필요)`, 'rose');
    return;
  }

  addGold(-totalCost);
  dom.lotBuildModal.classList.add('hidden');

  // 3D 공사장 가림막 + 타워크레인 착공 연출!
  const reg = lot3DRegistry[lotId];
  reg.emptyGroup.visible = false;
  reg.constructionGroup.clear();
  const siteMesh = createConstructionSite3D();
  reg.constructionGroup.add(siteMesh);
  reg.constructionGroup.visible = true;

  if (townLotBadges[lotId]) {
    townLotBadges[lotId].innerHTML = `<div class="font-jua text-xs text-amber-900">🏗️ 타워크레인 신축 공사중...</div>`;
  }

  showToast(`🏗️ [${lot.lotName}]에 ${cat.name} 신축 공사를 시작합니다!`, 'amber');

  activeConstructions.push({
    lotId,
    craneTop: siteMesh.userData.craneTop,
    dustTimer: 0,
    elapsed: 0,
    duration: 2.6,
    onDone: () => {
      reg.constructionGroup.clear();
      reg.constructionGroup.visible = false;

      const countSame = Object.values(state.buildings).filter((x) => x.buildingType === buildingType).length + 1;
      const customTitle = `${cat.name} ${countSame}호`;
      lot.owned = true;
      lot.buildingType = buildingType;
      lot.customTitle = customTitle;
      state.buildings[lotId] = createBuildingInstance(lotId, buildingType, customTitle);

      refreshLot3D(lotId);
      triggerBounce(reg.exteriorGroup, lot.x, 0.2, lot.z);
      spawnCoinFountain3D(lot.x, 4.5, lot.z, 15);
      spawnJackpotPopup(lot.x, 7.5, lot.z, `🎊 ${customTitle} 완공!`, cat.icon);

      if (cat.synergy) {
        showToast(`🌟 [${cat.synergy.label}] 발동! 주변 주거 건물 월세가 +${cat.synergy.rentBonusPct}% 상승했습니다!`, 'emerald');
      } else {
        showToast(`🎉 ${customTitle} 준공 완료! 건물을 터치해 내부를 꾸며보세요!`, 'emerald');
      }

      rebuildOverlayBadgesForCurrentMode();
      updateHudUI();
      updateQuestUI();
      saveGameState();
    }
  });
}

// =========================================================
// 7. 오버레이 배지 & 지붕 코인 스와이프/일괄 수금 시스템
// =========================================================
function rebuildOverlayBadgesForCurrentMode() {
  dom.townLotsLayer.innerHTML = '';
  dom.roomBadgesLayer.innerHTML = '';
  dom.shopBadgesLayer.innerHTML = '';
  Object.keys(townLotBadges).forEach((k) => delete townLotBadges[k]);
  Object.keys(roomBadges).forEach((k) => delete roomBadges[k]);
  Object.keys(shopBadges).forEach((k) => delete shopBadges[k]);

  if (viewMode === 'TOWN') {
    for (const lot of state.lots) {
      const el = document.createElement('div');
      if (!lot.owned) {
        el.className = `empty-lot-badge ${state.gold >= lot.landPrice + 250 ? 'affordable' : ''}`;
        el.innerHTML = `🚩 땅 매입 가능 · <b>${lot.landPrice.toLocaleString()}만 원</b>`;
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          openEmptyLotModal(lot.lotId);
        });
      } else {
        el.className = 'town-roof-badge';
        // 지붕 코인 스와이프 수금(마우스 드래그/손가락 스와이프 오버 시 즉시 수금!)
        el.addEventListener('pointerenter', (e) => {
          if (e.buttons > 0 || e.pointerType === 'touch') {
            const b = state.buildings[lot.lotId];
            if (b && b.pendingCoins > 0) sweepBuildingCoins(lot.lotId, true);
          }
        });
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const b = state.buildings[lot.lotId];
          if (b && b.pendingCoins > 0) {
            sweepBuildingCoins(lot.lotId, false);
          } else {
            enterBuildingInterior(lot.lotId);
          }
        });
      }
      dom.townLotsLayer.appendChild(el);
      townLotBadges[lot.lotId] = el;
      if (lot.owned) refreshTownRoofBadge(lot.lotId);
    }
  } else {
    // BUILDING 내부 뷰 배지 생성
    const b = state.buildings[activeLotId];
    if (!b) return;

    for (const room of b.rooms) {
      const el = document.createElement('div');
      el.className = 'floating-room-badge';
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        selectRoom(room.id, true);
      });
      dom.roomBadgesLayer.appendChild(el);
      roomBadges[room.id] = el;
      refreshInteriorRoomBadge(room);
    }

    for (const sh of b.shops) {
      const el = document.createElement('div');
      el.className = 'floating-shop-badge';
      const tpl = SHOP_TEMPLATES[sh.key];
      el.innerHTML = `${tpl.icon} ${tpl.name} Lv.${sh.level} · <span class="text-emerald-800">+${tpl.levels[sh.level].visitProfit}만</span>`;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        selectShop(sh.id, true);
      });
      dom.shopBadgesLayer.appendChild(el);
      shopBadges[sh.id] = el;
    }
  }
}

function refreshTownRoofBadge(lotId) {
  const el = townLotBadges[lotId];
  const b = state.buildings[lotId];
  if (!el || !b) return;

  const cat = BUILDING_CATALOG[b.buildingType];
  const syn = calcBuildingSynergyInfo(lotId);
  const occ = b.rooms.filter((r) => !!r.tenant).length;
  const pct = Math.min(100, (b.townGaugeTimer / b.townGaugeCycle) * 100);

  el.classList.toggle('has-coins', b.pendingCoins > 0);

  const occText = cat.roomCount > 0 ? `입주 ${occ}/${cat.roomCount}` : (b.buildingType === 'park' ? '숲세권 +15%' : '상가 3동');
  const synBadge = syn.tags.length > 0 ? `<span class="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 rounded-full border border-emerald-400">${syn.tags[0]}</span>` : '';

  if (b.pendingCoins > 0) {
    el.innerHTML = `
      <div class="flex items-center justify-between gap-2 font-jua text-xs text-amber-950">
        <span>${cat.icon} ${b.title}</span>
        ${synBadge}
      </div>
      <div class="font-jua text-sm text-emerald-800 mt-0.5 flex items-center justify-between gap-2">
        <span>💰 +${b.pendingCoins.toLocaleString()}만 수금!</span>
        <span class="text-[10px] bg-amber-900 text-amber-100 px-2 rounded-full">터치/스와이프</span>
      </div>
    `;
  } else {
    el.innerHTML = `
      <div class="flex items-center justify-between gap-2 font-jua text-xs text-amber-950">
        <span>${cat.icon} ${b.title}</span>
        <span class="text-stone-600 text-[11px]">${occText}</span>
        ${synBadge}
      </div>
      <div class="gauge-bar-track">
        <div class="gauge-bar-fill" id="town-bar-${lotId}" style="width:${pct.toFixed(1)}%"></div>
      </div>
    `;
  }
}

function refreshInteriorRoomBadge(room) {
  const el = roomBadges[room.id];
  if (!el) return;

  el.classList.toggle('selected', selection.type === 'room' && selection.id === room.id);
  el.classList.toggle('locked', !room.unlocked);

  if (!room.unlocked) {
    el.innerHTML = `<div class="font-jua text-xs">🔒 ${room.name} · 오픈 💰${room.unlockCost}만</div>`;
    return;
  }

  const activeSet = getRoomThemeSet(room);
  const marketRent = calcRoomMarketRent(room);
  const effRent = getEffectiveRoomRent(room);

  if (!room.tenant) {
    el.innerHTML = `
      <div class="flex items-center gap-1.5 font-jua text-xs text-amber-950">
        <span class="bg-amber-800 text-amber-100 px-2 rounded-full text-[11px]">${room.name}</span>
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
      <span class="bg-amber-900 text-amber-200 px-2 rounded-full text-[11px]">${room.name}</span>
      ${activeSet ? `<span class="px-1.5 rounded-full text-[10px] ${activeSet.badgeClass}">${activeSet.icon}+${activeSet.bonusPct}%</span>` : ''}
      <span class="text-emerald-800">+${effRent}만</span>
      <span class="text-amber-900" id="r-sec-${room.id}">⏱️ ${String(remainSec).padStart(2, '0')}s</span>
    </div>
    <div class="gauge-bar-track">
      <div class="gauge-bar-fill" id="r-bar-${room.id}" style="width:${pct.toFixed(1)}%"></div>
    </div>
  `;
}

function sweepBuildingCoins(lotId, isSwipe = false) {
  const b = state.buildings[lotId];
  const lot = getLot(lotId);
  const reg = lot3DRegistry[lotId];
  if (!b || b.pendingCoins <= 0 || !lot) return;

  const amount = b.pendingCoins;
  b.pendingCoins = 0;
  if (reg) reg.roofCoinMesh.visible = false;

  state.stats.totalEarned += amount;
  addGold(amount);

  if (isSwipe) {
    swipeComboCount += 1;
    clearTimeout(swipeResetTimer);
    swipeResetTimer = setTimeout(() => { swipeComboCount = 0; }, 1600);
  }

  const comboTag = swipeComboCount >= 2 ? `🔥${swipeComboCount}콤보!` : '🪙';
  spawnCoinFountain3D(lot.x, 7.2, lot.z, 12);
  spawnJackpotPopup(lot.x, 9.5, lot.z, `+${amount.toLocaleString()}만 원!`, comboTag);
  refreshTownRoofBadge(lotId);
}

function collectAllBuildingsCoins() {
  let total = 0;
  let count = 0;
  for (const lotId of Object.keys(state.buildings)) {
    const b = state.buildings[lotId];
    if (b.pendingCoins > 0) {
      total += b.pendingCoins;
      count += 1;
      sweepBuildingCoins(lotId, true);
    }
  }
  if (count > 0) {
    showToast(`🧲 ${count}개 건물 지붕에서 총 +${total.toLocaleString()}만원 일괄 수금 완료!`, 'emerald');
    saveGameState();
  }
}

// =========================================================
// 8. 물리 파티클(Drop&Bounce, 3D 코인 분수) & 실시간 타이머 루프
// =========================================================
function easeOutBounce(t) {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) { const u = t - 1.5 / d1; return n1 * u * u + 0.75; }
  if (t < 2.5 / d1) { const u = t - 2.25 / d1; return n1 * u * u + 0.9375; }
  const u = t - 2.625 / d1;
  return n1 * u * u + 0.984375;
}

function triggerBounce(obj, wx, wy, wz) {
  const baseY = obj.position.y;
  obj.position.y = baseY + 2.0;
  obj.scale.setScalar(0.38);
  activeBounces.push({ obj, baseY, elapsed: 0, duration: 0.65 });
  spawnSparkles3D(wx, wy + 0.8, wz, 10);
}

function spawnSparkles3D(wx, wy, wz, count = 10) {
  const cols = [0xfde047, 0x34d399, 0xf472b6, 0x38bdf8];
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(GEO.sparkle, new THREE.MeshBasicMaterial({ color: cols[i % 4] }));
    m.position.set(wx, wy, wz);
    const a = (Math.PI * 2 * i) / count;
    scene.add(m);
    activeParticles3D.push({
      mesh: m,
      vx: Math.cos(a) * 2.6,
      vy: 2.8 + Math.random() * 2.2,
      vz: Math.sin(a) * 2.6,
      floorY: wy - 0.5,
      life: 0.85
    });
  }
}

function spawnCoinFountain3D(wx, wy, wz, count = 11) {
  for (let i = 0; i < count; i++) {
    const c = new THREE.Mesh(GEO.coin, MAT.coin);
    c.position.set(wx, wy, wz);
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.3;
    const spd = 1.4 + Math.random() * 2.0;
    scene.add(c);
    activeParticles3D.push({
      mesh: c,
      vx: Math.cos(a) * spd,
      vy: 4.8 + Math.random() * 3.0,
      vz: Math.sin(a) * spd,
      floorY: Math.max(0.2, wy - 1.2),
      life: 1.35
    });
  }
}

function projectToScreen(wx, wy, wz) {
  tempVec3.set(wx, wy, wz).project(camera);
  return {
    x: (tempVec3.x * 0.5 + 0.5) * window.innerWidth,
    y: (-tempVec3.y * 0.5 + 0.5) * window.innerHeight
  };
}

function spawnJackpotPopup(wx, wy, wz, text, icon = '🪙') {
  const pt = projectToScreen(wx, wy, wz);
  const el = document.createElement('div');
  el.className = 'floating-jackpot-text';
  el.style.left = `${pt.x.toFixed(1)}px`;
  el.style.top = `${pt.y.toFixed(1)}px`;
  el.innerHTML = `<span>${icon}</span><span>${text}</span>`;
  dom.jackpotLayer.appendChild(el);
  setTimeout(() => el.remove(), 1700);
}

function tickEconomyAndTimers(dt) {
  let anyPendingRoofCoins = false;

  for (const lotId of Object.keys(state.buildings)) {
    const b = state.buildings[lotId];
    const lot = getLot(lotId);
    const reg = lot3DRegistry[lotId];
    const isInsideThis = viewMode === 'BUILDING' && activeLotId === lotId;

    // 1) 호실별 개별 타이머
    for (const room of b.rooms) {
      if (!room.unlocked || !room.tenant) continue;
      room.rentTimer = (room.rentTimer || 0) + dt;

      if (room.rentTimer >= room.rentCycleSec) {
        room.rentTimer = 0;
        const rent = getEffectiveRoomRent(room);
        if (isInsideThis) {
          // 내부 뷰: 해당 호실 정중앙에서 즉시 3D 황금 코인 분수 폭발 & 수금!
          addGold(rent);
          state.stats.totalEarned += rent;
          const wx = lot.x + room.lx;
          const wz = lot.z + room.lz;
          spawnCoinFountain3D(wx, room.ly + 0.3, wz, 11);
          spawnJackpotPopup(wx, room.ly + 1.8, wz, `+${rent.toLocaleString()}만 원!`, '🪙');
        } else {
          // 마을 뷰: 지붕 위 코인 단지에 누적되어 스와이프/일괄 수금 쾌감 제공!
          b.pendingCoins += rent;
          if (reg) reg.roofCoinMesh.visible = true;
          refreshTownRoofBadge(lotId);
        }
      } else if (isInsideThis) {
        const secEl = document.getElementById(`r-sec-${room.id}`);
        const barEl = document.getElementById(`r-bar-${room.id}`);
        if (secEl) secEl.textContent = `⏱️ ${String(Math.max(1, Math.ceil(room.rentCycleSec - room.rentTimer))).padStart(2, '0')}s`;
        if (barEl) barEl.style.width = `${((room.rentTimer / room.rentCycleSec) * 100).toFixed(1)}%`;
      }
    }

    // 2) 건물 전체 게이지 & 상가/공원 수익 (마을 뷰 지붕 표시용)
    const cycleIncome = calcBuildingCycleIncome(b);
    if (cycleIncome > 0) {
      b.townGaugeTimer = (b.townGaugeTimer || 0) + dt;
      if (b.townGaugeTimer >= b.townGaugeCycle) {
        b.townGaugeTimer = 0;
        const cat = BUILDING_CATALOG[b.buildingType];
        const shopOrParkBonus = (cat.passiveIncome || 0) + b.shops.reduce((s, sh) => s + SHOP_TEMPLATES[sh.key].levels[sh.level].visitProfit, 0);
        if (shopOrParkBonus > 0) {
          if (isInsideThis) {
            addGold(shopOrParkBonus);
            spawnCoinFountain3D(lot.x, 1.0, lot.z + 2.8, 8);
            spawnJackpotPopup(lot.x, 2.4, lot.z + 2.8, `🏪 +${shopOrParkBonus}만!`, '✨');
          } else {
            b.pendingCoins += shopOrParkBonus;
            if (reg) reg.roofCoinMesh.visible = true;
            refreshTownRoofBadge(lotId);
          }
        }
      } else if (viewMode === 'TOWN' && b.pendingCoins === 0) {
        const tBar = document.getElementById(`town-bar-${lotId}`);
        if (tBar) tBar.style.width = `${((b.townGaugeTimer / b.townGaugeCycle) * 100).toFixed(1)}%`;
      }
    }

    if (b.pendingCoins > 0) {
      anyPendingRoofCoins = true;
      if (reg && viewMode === 'TOWN') {
        reg.roofCoinMesh.visible = true;
        reg.roofCoinMesh.rotation.y += dt * 3.0;
        reg.roofCoinMesh.position.y = 9.6 + Math.sin(performance.now() * 0.004) * 0.35;
      }
    } else if (reg) {
      reg.roofCoinMesh.visible = false;
    }
  }

  dom.btnCollectAll.classList.toggle('hidden', !(viewMode === 'TOWN' && anyPendingRoofCoins));

  // 3) 마을 상권 방문 연쇄 매출 팝업 (마을 입주민이 이웃 편의점/세탁소/베이커리 방문!)
  townShopLoopCooldown -= dt;
  if (townShopLoopCooldown <= 0) {
    townShopLoopCooldown = 9.0 + Math.random() * 5.0;
    const totalTenants = Object.values(state.buildings).reduce((acc, b) => acc + b.rooms.filter((r) => r.tenant).length, 0);
    const allShops = Object.values(state.buildings).flatMap((b) => b.shops);
    if (totalTenants > 0 && allShops.length > 0) {
      const sh = allShops[Math.floor(Math.random() * allShops.length)];
      const tpl = SHOP_TEMPLATES[sh.key];
      const bonus = tpl.levels[sh.level].visitProfit;
      addGold(bonus);
      state.stats.shopVisits += 1;
      const lot = getLot(sh.lotId);
      spawnCoinFountain3D(lot.x, 2.5, lot.z + 3.5, 7);
      spawnJackpotPopup(lot.x, 4.5, lot.z + 3.5, `${tpl.icon} 방문매출 +${bonus}만!`, '🛍️');
    }
  }
}

// =========================================================
// 9. 내부 3D 입주민 액터 & 돌발 케어 말풍선 시스템
// =========================================================
function clearInteriorActors() {
  for (const rId of Object.keys(interiorActors)) {
    scene.remove(interiorActors[rId].mesh);
    interiorActors[rId].speechEl.remove();
    delete interiorActors[rId];
  }
}

function syncInteriorActorsForBuilding(lotId) {
  clearInteriorActors();
  if (viewMode !== 'BUILDING' || activeLotId !== lotId) return;

  const b = state.buildings[lotId];
  const lot = getLot(lotId);
  if (!b || !lot) return;

  for (const room of b.rooms) {
    if (!room.unlocked || !room.tenant) continue;
    const mesh = createChibi3D(room.tenant.style);
    const wx = lot.x + room.lx;
    const wy = room.ly;
    const wz = lot.z + room.lz + 0.3;
    mesh.position.set(wx, wy, wz);
    scene.add(mesh);

    const spEl = document.createElement('div');
    spEl.className = 'floating-speech-bubble hidden';
    dom.speechLayer.appendChild(spEl);

    interiorActors[room.id] = {
      room,
      lot,
      mesh,
      speechEl: spEl,
      wx,
      wy,
      wz,
      tx: wx,
      tz: wz,
      timer: 1.5,
      speechTimer: 0,
      phase: Math.random() * 5
    };
  }
}

function tickInteriorAndTownActors(dt) {
  // 마을 자동차 & 행인 이동
  for (const v of townVehicles) {
    v.mesh.position.x += v.dir * v.speed * dt;
    if (v.mesh.position.x > 30) v.mesh.position.x = -30;
    if (v.mesh.position.x < -30) v.mesh.position.x = 30;
  }

  for (const w of townWalkers) {
    w.phase += dt * 9;
    w.mesh.position.x += w.dir * w.speed * dt;
    w.mesh.position.y = 0.15 + Math.abs(Math.sin(w.phase)) * 0.08;
    w.mesh.rotation.y = w.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    if (w.mesh.position.x > 26) w.dir = -1;
    if (w.mesh.position.x < -26) w.dir = 1;
  }

  // 내부 호실 입주민 보행 & 일상 말풍선
  if (viewMode === 'BUILDING') {
    for (const rId of Object.keys(interiorActors)) {
      const ac = interiorActors[rId];
      if (ac.speechTimer > 0) {
        ac.speechTimer -= dt;
        if (ac.speechTimer <= 0) ac.speechEl.classList.add('hidden');
      }

      const dx = ac.tx - ac.wx;
      const dz = ac.tz - ac.wz;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.08) {
        ac.phase += dt * 11;
        ac.wx += (dx / dist) * 2.4 * dt;
        ac.wz += (dz / dist) * 2.4 * dt;
        ac.mesh.rotation.y = Math.atan2(dx, dz);
        ac.mesh.position.set(ac.wx, ac.wy + Math.abs(Math.sin(ac.phase)) * 0.07, ac.wz);
      } else {
        ac.mesh.position.set(ac.wx, ac.wy, ac.wz);
        ac.timer -= dt;
        if (ac.timer <= 0) {
          ac.timer = 3.5 + Math.random() * 3.0;
          const spots = [ROOM_LOCAL_SPOTS_3D.bed, ROOM_LOCAL_SPOTS_3D.desk, ROOM_LOCAL_SPOTS_3D.kitchen, ROOM_LOCAL_SPOTS_3D.shower, ROOM_LOCAL_SPOTS_3D.sofa];
          const sp = spots[Math.floor(Math.random() * spots.length)];
          ac.tx = ac.lot.x + ac.room.lx + sp.x;
          ac.tz = ac.lot.z + ac.room.lz + sp.z;

          if (Math.random() < 0.65) {
            const job = TENANT_JOBS.find((j) => j.id === ac.room.tenant.jobId) || TENANT_JOBS[0];
            ac.speechEl.textContent = job.quotes[Math.floor(Math.random() * job.quotes.length)];
            ac.speechEl.classList.remove('hidden');
            ac.speechTimer = 3.8;
          }
        }
      }
    }
  }

  // 돌발 케어 말풍선 생성
  careCooldown -= dt;
  if (careCooldown <= 0) {
    careCooldown = 10.0 + Math.random() * 5.0;
    if (activeCareBubbles.length < 2) spawnCareBubble();
  }
}

function spawnCareBubble() {
  const tpl = CARE_BUBBLE_TYPES[Math.floor(Math.random() * CARE_BUBBLE_TYPES.length)];
  const id = `cb_${Date.now()}`;
  let wx = 0; let wy = 4.0; let wz = 0;
  let targetRoom = null;

  if (viewMode === 'BUILDING') {
    const b = state.buildings[activeLotId];
    const lot = getLot(activeLotId);
    if (!b || !lot) return;
    const unlocked = b.rooms.filter((r) => r.unlocked);
    targetRoom = unlocked[Math.floor(Math.random() * unlocked.length)];
    if (!targetRoom) return;
    wx = lot.x + targetRoom.lx;
    wy = targetRoom.ly + 1.8;
    wz = lot.z + targetRoom.lz;
  } else {
    const ownedLots = state.lots.filter((l) => l.owned);
    const chosenLot = ownedLots[Math.floor(Math.random() * ownedLots.length)];
    wx = chosenLot.x;
    wy = 6.2;
    wz = chosenLot.z + 2.5;
  }

  const btn = document.createElement('button');
  btn.className = 'floating-care-bubble';
  btn.innerHTML = `<span>${tpl.icon}</span><span>${tpl.label}!</span>`;
  btn.onclick = (e) => {
    e.stopPropagation();
    const idx = activeCareBubbles.findIndex((x) => x.id === id);
    if (idx !== -1) activeCareBubbles.splice(idx, 1);
    btn.remove();

    let bonus = tpl.cashReward;
    if (targetRoom && targetRoom.tenant && tpl.instantRent) {
      targetRoom.rentTimer = 0;
      bonus += getEffectiveRoomRent(targetRoom);
    }
    addGold(bonus);
    spawnCoinFountain3D(wx, wy - 1.0, wz, 10);
    spawnJackpotPopup(wx, wy, wz, `+${bonus}만 원!`, tpl.icon);
    showToast(tpl.toastMsg, 'emerald');
    saveGameState();
  };
  dom.careLayer.appendChild(btn);
  activeCareBubbles.push({ id, el: btn, wx, wy, wz, phase: Math.random() * 5 });
}

function updateProjectedDOMPositions() {
  if (viewMode === 'TOWN') {
    for (const lot of state.lots) {
      const el = townLotBadges[lot.lotId];
      if (!el) continue;
      const h = lot.owned ? (lot.buildingType === 'park' ? 3.8 : 9.4) : 3.2;
      const pt = projectToScreen(lot.x, h, lot.z);
      el.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
    }
  } else {
    const b = state.buildings[activeLotId];
    const lot = getLot(activeLotId);
    if (b && lot) {
      for (const room of b.rooms) {
        const el = roomBadges[room.id];
        if (!el) continue;
        const pt = projectToScreen(lot.x + room.lx, room.ly + 2.75, lot.z + room.lz - 0.8);
        el.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
      }
      for (const sh of b.shops) {
        const el = shopBadges[sh.id];
        if (!el) continue;
        const pt = projectToScreen(lot.x + sh.lx, sh.ly + 2.35, lot.z + sh.lz + 1.0);
        el.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
      }
    }

    for (const rId of Object.keys(interiorActors)) {
      const ac = interiorActors[rId];
      if (!ac.speechEl.classList.contains('hidden')) {
        const pt = projectToScreen(ac.wx, ac.wy + 1.45, ac.wz);
        ac.speechEl.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
      }
    }
  }

  for (const cb of activeCareBubbles) {
    const bob = Math.sin(performance.now() * 0.005 + cb.phase) * 5;
    const pt = projectToScreen(cb.wx, cb.wy, cb.wz);
    cb.el.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${(pt.y + bob).toFixed(1)}px, 0) translate(-50%, -100%)`;
  }
}

// =========================================================
// 10. 내부 호실/상가 관리 패널 & 입주민 계약 & 미션 UI
// =========================================================
function findRoomGlobal(roomId) {
  for (const b of Object.values(state.buildings)) {
    const r = b.rooms.find((x) => x.id === roomId);
    if (r) return r;
  }
  return null;
}

function findShopGlobal(shopId) {
  for (const b of Object.values(state.buildings)) {
    const s = b.shops.find((x) => x.id === shopId);
    if (s) return s;
  }
  return null;
}

function selectRoom(roomId, smoothFocus = true) {
  const room = findRoomGlobal(roomId);
  if (!room) return;
  selection.type = 'room';
  selection.id = roomId;

  const b = state.buildings[room.lotId];
  if (b) b.rooms.forEach((r) => refreshInteriorRoomBadge(r));

  dom.bottomPanel.classList.remove('translate-y-full');
  renderRoomPanel(room);

  if (smoothFocus) {
    const lot = getLot(room.lotId);
    const off = BUILDING_CAM_OFFSETS[camAzimuthIdx];
    const tx = lot.x + room.lx;
    const ty = room.ly - 0.6;
    const tz = lot.z + room.lz + 0.8;
    camTween.targetLook.set(tx, ty, tz);
    camTween.targetPos.set(tx + off.x, ty + off.y, tz + off.z);
    camTween.targetZoom = Math.max(camera.zoom, 1.95);
    camTween.active = true;
  }
}

function selectShop(shopId, smoothFocus = true) {
  const shop = findShopGlobal(shopId);
  if (!shop) return;
  selection.type = 'shop';
  selection.id = shopId;

  dom.bottomPanel.classList.remove('translate-y-full');
  renderShopPanel(shop);

  if (smoothFocus) {
    const lot = getLot(shop.lotId);
    const off = BUILDING_CAM_OFFSETS[camAzimuthIdx];
    const tx = lot.x + shop.lx;
    const tz = lot.z + shop.lz;
    camTween.targetLook.set(tx, 0.5, tz);
    camTween.targetPos.set(tx + off.x, 0.5 + off.y, tz + off.z);
    camTween.targetZoom = Math.max(camera.zoom, 1.85);
    camTween.active = true;
  }
}

function closeBottomPanel() {
  selection.type = null;
  selection.id = null;
  dom.bottomPanel.classList.add('translate-y-full');
  const b = state.buildings[activeLotId];
  if (b) b.rooms.forEach((r) => refreshInteriorRoomBadge(r));
}

function buildPortraitSVG(t) {
  const st = t.style || TENANT_JOBS[0].style;
  return `
    <svg width="44" height="48" viewBox="0 0 48 52">
      <circle cx="24" cy="21" r="15" fill="${st.hairColor}"/>
      <path d="M11 48 Q24 34 37 48 Z" fill="${st.outfitColor}" stroke="#451a03" stroke-width="2"/>
      <circle cx="24" cy="23" r="12.5" fill="#fed7aa" stroke="#7c2d12" stroke-width="1.8"/>
      <circle cx="19.5" cy="23.5" r="2" fill="#1e293b"/>
      <circle cx="28.5" cy="23.5" r="2" fill="#1e293b"/>
      <path d="M21 28 Q24 31 27 28" fill="none" stroke="#7c2d12" stroke-width="1.6" stroke-linecap="round"/>
    </svg>`;
}

function renderRoomPanel(room) {
  const activeSet = getRoomThemeSet(room);
  const syn = calcBuildingSynergyInfo(room.lotId);
  const marketRent = calcRoomMarketRent(room);

  dom.panelRoomTitle.textContent = `🏠 ${state.buildings[room.lotId].title} · ${room.name}`;
  dom.panelGradeBadge.textContent = activeSet ? activeSet.badgeText : (syn.totalPct > 0 ? `타운 시너지 +${syn.totalPct}% 적용` : '인테리어 커스텀');
  dom.panelGradeBadge.className = `font-jua text-xs px-2.5 py-0.5 rounded-full border ${activeSet ? activeSet.badgeClass : 'bg-amber-100 text-amber-900 border-amber-400'}`;
  dom.panelRentBadge.textContent = room.unlocked ? `적정 월세 ${marketRent}만원` : '미개방 호실';

  if (!room.unlocked) {
    dom.panelBody.innerHTML = `
      <div class="bg-white border-2 border-amber-300 rounded-2xl p-5 text-center">
        <div class="font-jua text-lg text-amber-950">${room.name} 호실을 분양 오픈할까요?</div>
        <button id="btn-unlock-rm" class="jelly-btn-amber mt-3 font-jua text-base px-6 py-2.5 rounded-2xl">
          🔓 오픈하기 (💰${room.unlockCost}만원)
        </button>
      </div>`;
    document.getElementById('btn-unlock-rm').onclick = () => {
      if (state.gold < room.unlockCost) { showToast('💸 자금이 부족합니다!', 'rose'); return; }
      addGold(-room.unlockCost);
      room.unlocked = true;
      rebuildSingleRoom3D(room, 'wallpaper');
      refreshInteriorRoomBadge(room);
      renderRoomPanel(room);
      saveGameState();
    };
    return;
  }

  let tenantHTML = '';
  if (!room.tenant) {
    tenantHTML = `
      <div class="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <div class="font-jua text-sm sm:text-base text-amber-950">현재 공실입니다! 리모델링 후 3D 입주민을 모집하세요</div>
          <div class="text-xs text-stone-600">${syn.totalPct > 0 ? `🌳 타운 상권 시너지로 월세가 +${syn.totalPct}% 추가 상승 중입니다!` : '주변 빈 땅에 공원이나 상가를 지으면 월세 시너지 버프가 켜집니다!'}</div>
        </div>
        <button id="btn-open-rec" class="jelly-btn-mint shrink-0 font-jua text-sm px-4 py-2 rounded-2xl">📱 세입자 구하기</button>
      </div>`;
  } else {
    const t = room.tenant;
    const over = marketRent > t.maxBudget;
    tenantHTML = `
      <div class="${over ? 'bg-rose-50 border-rose-300' : 'bg-white border-amber-300'} border-2 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2.5">
          <div class="w-11 h-12 rounded-xl bg-amber-50 border-2 border-amber-800 flex items-center justify-center">${buildPortraitSVG(t)}</div>
          <div>
            <div class="font-jua text-sm sm:text-base text-amber-950">${t.name} <span class="text-xs text-emerald-700">(${t.jobName})</span></div>
            <div class="text-xs text-stone-600">예산 한도 ${t.maxBudget}만 · <b>실수령 +${getEffectiveRoomRent(room)}만 / ${room.rentCycleSec}s</b></div>
          </div>
        </div>
        <button id="btn-evict" class="jelly-btn-rose font-jua text-xs px-3 py-2 rounded-xl">⚡ 계약 해지</button>
      </div>`;
  }

  const cards = Object.keys(FURNITURE_TREE).map((key) => {
    const tree = FURNITURE_TREE[key];
    const lv = room.furniture[key] || 0;
    const cur = tree.levels[lv];
    const nxt = tree.levels[lv + 1];
    return `
      <div class="bg-white border-2 border-amber-200 rounded-2xl p-2.5 flex flex-col justify-between gap-2">
        <div>
          <div class="flex justify-between font-jua text-sm text-amber-950">
            <span>${tree.icon} ${tree.label}</span>
            <span class="text-xs text-amber-600">Lv.${lv}/3</span>
          </div>
          <div class="text-[11px] font-bold text-stone-700 mt-0.5">${cur.name}</div>
          <div class="text-[11px] text-stone-500">${nxt ? `다음: +${nxt.rentBonus - cur.rentBonus}만 상승` : '👑 풀옵션 완성'}</div>
        </div>
        ${nxt ? `<button data-fkey="${key}" class="btn-up-furn w-full font-jua text-xs py-1.5 rounded-xl ${state.gold >= nxt.cost ? 'jelly-btn-amber' : 'bg-stone-200 text-stone-400'}">⬆️ Lv.${lv + 1} 시공 (💰${nxt.cost}만)</button>` : '<div class="text-center font-jua text-xs py-1 rounded-xl bg-amber-100 text-amber-900">👑 MAX</div>'}
      </div>`;
  }).join('');

  dom.panelBody.innerHTML = `${tenantHTML}<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">${cards}</div>`;

  const recBtn = document.getElementById('btn-open-rec');
  if (recBtn) recBtn.onclick = () => openRecruitModal(room);
  const evBtn = document.getElementById('btn-evict');
  if (evBtn) {
    evBtn.onclick = () => {
      room.tenant = null;
      room.rentTimer = 0;
      state.stats.evictions += 1;
      syncInteriorActorsForBuilding(room.lotId);
      refreshInteriorRoomBadge(room);
      renderRoomPanel(room);
      updateHudUI();
      saveGameState();
      showToast('⚡ 퇴거 완료! 상위 예산 세입자와 새로 계약해보세요.', 'amber');
    };
  }
  dom.panelBody.querySelectorAll('.btn-up-furn').forEach((btn) => {
    btn.onclick = () => {
      const k = btn.dataset.fkey;
      const nxt = FURNITURE_TREE[k].levels[(room.furniture[k] || 0) + 1];
      if (!nxt || state.gold < nxt.cost) { showToast('💸 시공 자금이 부족합니다!', 'rose'); return; }
      addGold(-nxt.cost);
      room.furniture[k] += 1;
      rebuildSingleRoom3D(room, k);
      refreshInteriorRoomBadge(room);
      renderRoomPanel(room);
      updateHudUI();
      updateQuestUI();
      saveGameState();
    };
  });
}

function renderShopPanel(shop) {
  const tpl = SHOP_TEMPLATES[shop.key];
  const cur = tpl.levels[shop.level];
  const nxt = tpl.levels[shop.level + 1];

  dom.panelRoomTitle.textContent = `${tpl.icon} ${tpl.name}`;
  dom.panelGradeBadge.textContent = `Lv.${shop.level}`;
  dom.panelGradeBadge.className = 'font-jua text-xs px-2.5 py-0.5 rounded-full border bg-amber-100 text-amber-900 border-amber-400';
  dom.panelRentBadge.textContent = `방문 매출 +${cur.visitProfit}만원`;

  dom.panelBody.innerHTML = `
    <div class="bg-white border-2 border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div>
        <div class="font-jua text-base text-amber-950">[Lv.${shop.level}] ${cur.title}</div>
        <p class="text-xs text-stone-600 mt-1">${cur.desc}</p>
      </div>
      ${nxt ? `<button id="btn-up-shop" class="font-jua text-sm px-5 py-2.5 rounded-2xl ${state.gold >= nxt.upgradeCost ? 'jelly-btn-amber' : 'bg-stone-200 text-stone-400'}">⬆️ Lv.${shop.level + 1} 확장 (💰${nxt.upgradeCost}만)</button>` : '<div class="font-jua text-sm bg-amber-100 text-amber-900 px-4 py-2 rounded-xl">👑 최고 등급 완성</div>'}
    </div>`;

  const btn = document.getElementById('btn-up-shop');
  if (btn && nxt) {
    btn.onclick = () => {
      if (state.gold < nxt.upgradeCost) { showToast('💸 자금이 부족합니다!', 'rose'); return; }
      addGold(-nxt.upgradeCost);
      shop.level += 1;
      rebuildSingleShop3D(shop, true);
      rebuildOverlayBadgesForCurrentMode();
      renderShopPanel(shop);
      updateQuestUI();
      saveGameState();
      showToast(`${tpl.icon} ${tpl.name} Lv.${shop.level} 확장 완료!`, 'emerald');
    };
  }
}

function openRecruitModal(room) {
  recruitTargetRoom = room;
  const market = calcRoomMarketRent(room);
  const pool = TENANT_JOBS.filter((j) => j.maxBudget >= market - 15);
  const src = pool.length >= 3 ? pool : TENANT_JOBS;
  currentApplicants = [...src].sort(() => Math.random() - 0.5).slice(0, 3).map((job) => ({
    name: KOREAN_LAST_NAMES[Math.floor(Math.random() * KOREAN_LAST_NAMES.length)] + KOREAN_FIRST_NAMES[Math.floor(Math.random() * KOREAN_FIRST_NAMES.length)],
    jobId: job.id,
    jobName: job.jobName,
    badgeColor: job.badgeColor,
    maxBudget: Math.floor(job.minBudget + Math.random() * (job.maxBudget - job.minBudget + 1)),
    wishText: job.wishText,
    style: job.style
  }));

  dom.recruitRoomBadge.textContent = room.name;
  dom.recruitRoomInfo.textContent = `현재 적정 월세: ${market}만원`;
  renderApplicantCards();
  dom.recruitModal.classList.remove('hidden');
}

function renderApplicantCards() {
  const room = recruitTargetRoom;
  const market = calcRoomMarketRent(room);
  dom.recruitCardsGrid.innerHTML = currentApplicants.map((app, idx) => `
    <div class="bg-white rounded-2xl border-2 border-amber-300 p-3.5 flex flex-col justify-between gap-3">
      <div>
        <div class="flex items-center gap-2.5">
          <div class="w-12 h-13 rounded-xl bg-amber-50 border-2 border-amber-800 flex items-center justify-center">${buildPortraitSVG(app)}</div>
          <div>
            <span class="font-jua text-[11px] text-white px-2 py-0.5 rounded-full" style="background:${app.badgeColor}">${app.jobName}</span>
            <div class="font-jua text-base text-amber-950 mt-0.5">${app.name}</div>
          </div>
        </div>
        <div class="mt-2.5 bg-amber-50/70 rounded-xl p-2 text-xs">
          <div class="flex justify-between"><span>최대 예산</span><b class="font-jua text-emerald-700">${app.maxBudget}만원</b></div>
          <div class="text-[11px] text-stone-600 mt-1">💬 "${app.wishText}"</div>
        </div>
      </div>
      <button data-idx="${idx}" class="btn-contract jelly-btn-mint w-full font-jua text-sm py-2 rounded-xl">✍️ 계약하기 (월 ${Math.min(market, app.maxBudget)}만)</button>
    </div>
  `).join('');

  dom.recruitCardsGrid.querySelectorAll('.btn-contract').forEach((btn) => {
    btn.onclick = () => {
      const app = currentApplicants[Number(btn.dataset.idx)];
      room.tenant = {
        name: app.name,
        jobId: app.jobId,
        jobName: app.jobName,
        maxBudget: app.maxBudget,
        style: app.style,
        happiness: 88
      };
      room.rentTimer = room.rentCycleSec * 0.5;
      dom.recruitModal.classList.add('hidden');
      syncInteriorActorsForBuilding(room.lotId);
      refreshInteriorRoomBadge(room);
      renderRoomPanel(room);
      updateHudUI();
      updateQuestUI();
      saveGameState();
      showToast(`🏡 ${room.name}에 ${app.name}(${app.jobName})님이 입주했습니다!`, 'emerald');
    };
  });
}

// =========================================================
// 11. 퀘스트, HUD, 엄격한 터치 분리(이동 5px 미만 탭 판정) & 메인 루프
// =========================================================
function updateQuestUI() {
  if (state.questIndex >= MAIN_QUESTS.length) {
    dom.questStepTag.textContent = '👑 모든 타운 미션 마스터!';
    dom.questRewardTag.textContent = '완료';
    dom.questTitle.textContent = '축하합니다! 미니미 부동산 대도시 완성!';
    dom.questDesc.textContent = '전 건물을 자유롭게 리모델링하고 타운 수익을 만끽하세요.';
    dom.questHint.textContent = '✨ 자유 타이쿤 모드';
    dom.questBtn.classList.remove('quest-ready-glow');
    return;
  }

  const q = MAIN_QUESTS[state.questIndex];
  const ok = q.check(state);
  dom.questStepTag.textContent = `📋 타운 미션 ${state.questIndex + 1}/${MAIN_QUESTS.length}`;
  dom.questRewardTag.textContent = `🎁 +${q.reward}만`;
  dom.questTitle.textContent = q.title;
  dom.questDesc.textContent = q.desc;
  dom.questBtn.classList.toggle('quest-ready-glow', ok);
  dom.questHint.innerHTML = ok
    ? '<span class="text-emerald-700 font-bold">🎉 미션 성공! 터치하여 지원금을 수령하세요!</span>'
    : '<span>👉 터치하면 해당 목표 위치로 자동 이동합니다</span>';
}

function handleQuestClick() {
  if (state.questIndex >= MAIN_QUESTS.length) return;
  const q = MAIN_QUESTS[state.questIndex];
  if (q.check(state)) {
    addGold(q.reward);
    showToast(`🎁 미션 완료! 지원금 +${q.reward.toLocaleString()}만원 수령!`, 'emerald');
    state.questIndex += 1;
    updateQuestUI();
    if (viewMode === 'TOWN') rebuildOverlayBadgesForCurrentMode();
    saveGameState();
    return;
  }

  if (q.targetMode === 'BUILDING') {
    enterBuildingInterior(q.targetLotId || 'lot_1', q.targetSubRoom || null);
  } else {
    exitToTownView(q.targetLotId || null);
    if (q.targetLotId && !getLot(q.targetLotId)?.owned) {
      setTimeout(() => openEmptyLotModal(q.targetLotId), 450);
    }
  }
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
  const totalTownIncome = Object.values(state.buildings).reduce((acc, b) => acc + calcBuildingCycleIncome(b), 0);
  dom.hudRentTotal.textContent = totalTownIncome.toLocaleString();

  const ownedCount = state.lots.filter((l) => l.owned).length;
  dom.hudTownSummary.textContent = `보유 필지 ${ownedCount}/${state.lots.length}`;

  const totalMins = Math.floor(state.gameMinutes);
  const hr = Math.floor(totalMins / 60) % 24;
  const mn = Math.floor(totalMins % 60);
  const icon = hr >= 6 && hr < 18 ? '☀️' : hr >= 18 && hr < 22 ? '🌇' : '🌙';
  dom.hudTimeBadge.textContent = `${icon} ${state.day}일차 · ${String(hr).padStart(2, '0')}:${String(mn).padStart(2, '0')}`;

  if (camera && dom.zoomScaleLabel) {
    dom.zoomScaleLabel.textContent = `${Math.round(camera.zoom * 100)}%`;
  }
}

function showToast(msg, color = 'amber') {
  const map = {
    emerald: 'bg-emerald-500 text-white border-emerald-900',
    amber: 'bg-amber-300 text-amber-950 border-amber-900',
    rose: 'bg-rose-500 text-white border-rose-950'
  };
  const el = document.createElement('div');
  el.className = `font-jua text-xs sm:text-sm px-4 py-2 rounded-full border-[3px] shadow-lg transition-all duration-300 ${map[color] || map.amber}`;
  el.textContent = msg;
  dom.toastContainer.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 280);
  }, 2500);
}

function saveGameState() {
  try {
    state.lastSavedAt = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Save skipped:', e);
  }
}

function loadGameState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.buildings || !Array.isArray(parsed.lots)) return null;
    state = { ...createDefaultState(), ...parsed };

    const awaySec = Math.min(28800, Math.floor((Date.now() - (parsed.lastSavedAt || Date.now())) / 1000));
    const totalIncome = Object.values(state.buildings).reduce((acc, b) => acc + calcBuildingCycleIncome(b), 0);
    if (awaySec >= 45 && totalIncome > 0) {
      return { awaySec, earned: Math.max(12, Math.floor((awaySec / 11) * totalIncome * 0.5)) };
    }
  } catch (e) {
    console.warn('Load failed:', e);
  }
  return null;
}

function bindEvents() {
  // 엄격한 크로스플랫폼 터치/드래그/핀치 분리 (이동 거리 5px 미만만 짧은 탭으로 인정!)
  const activePointers = new Map();
  let downX = 0;
  let downY = 0;
  let downTime = 0;
  let hadMultiTouch = false;

  renderer.domElement.addEventListener('pointerdown', (e) => {
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointers.size > 1) hadMultiTouch = true;
    if (activePointers.size === 1) {
      downX = e.clientX;
      downY = e.clientY;
      downTime = performance.now();
      hadMultiTouch = false;
    }
    camTween.active = false;
  });

  // 모바일 터치 스와이프로 지붕 코인 연속 쓸어담기 지원!
  window.addEventListener('pointermove', (e) => {
    if (viewMode === 'TOWN' && (e.buttons > 0 || e.pointerType === 'touch')) {
      const hitEl = document.elementFromPoint(e.clientX, e.clientY);
      const badge = hitEl && hitEl.closest('.town-roof-badge.has-coins');
      if (badge) {
        const foundLotId = Object.keys(townLotBadges).find((id) => townLotBadges[id] === badge);
        if (foundLotId) sweepBuildingCoins(foundLotId, true);
      }
    }
  });

  renderer.domElement.addEventListener('pointerup', (e) => {
    activePointers.delete(e.pointerId);
    if (hadMultiTouch || activePointers.size > 0) return;

    const moveDist = Math.hypot(e.clientX - downX, e.clientY - downY);
    const elapsed = performance.now() - downTime;
    // 엄격히 5px 미만 짧은 탭만 건물 진입 / 호실 선택 실행!
    if (moveDist >= 5 || elapsed > 450) return;

    pointerNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointerNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointerNDC, camera);

    if (viewMode === 'TOWN') {
      const hits = raycaster.intersectObjects(pickableTownMeshes, false);
      if (hits.length > 0) {
        const lotId = hits[0].object.userData.lotId;
        const lot = getLot(lotId);
        if (lot && !lot.owned) {
          openEmptyLotModal(lotId);
        } else if (lot && lot.owned) {
          const b = state.buildings[lotId];
          if (b && b.pendingCoins > 0) sweepBuildingCoins(lotId, false);
          else enterBuildingInterior(lotId);
        }
      }
    } else {
      const hits = raycaster.intersectObjects(pickableInteriorMeshes, false);
      if (hits.length > 0) {
        const ud = hits[0].object.userData;
        if (ud.roomId) selectRoom(ud.roomId, true);
        else if (ud.shopId) selectShop(ud.shopId, true);
      }
    }
  });

  renderer.domElement.addEventListener('pointercancel', (e) => activePointers.delete(e.pointerId));

  // UI 버튼 바인딩
  dom.btnBackToTown.onclick = () => exitToTownView(activeLotId);
  document.getElementById('btn-toggle-view').onclick = () => {
    if (viewMode === 'BUILDING') exitToTownView(activeLotId);
    else enterBuildingInterior(activeLotId || 'lot_1');
  };

  dom.btnCollectAll.onclick = collectAllBuildingsCoins;

  document.getElementById('btn-zoom-in').onclick = () => {
    camTween.targetLook.copy(controls.target);
    camTween.targetPos.copy(camera.position);
    camTween.targetZoom = Math.min(controls.maxZoom, camera.zoom * 1.28);
    camTween.active = true;
  };
  document.getElementById('btn-zoom-out').onclick = () => {
    camTween.targetLook.copy(controls.target);
    camTween.targetPos.copy(camera.position);
    camTween.targetZoom = Math.max(controls.minZoom, camera.zoom / 1.28);
    camTween.active = true;
  };
  document.getElementById('btn-cam-rotate').onclick = () => {
    camAzimuthIdx = (camAzimuthIdx + 1) % 4;
    const offsets = viewMode === 'TOWN' ? TOWN_CAM_OFFSETS : BUILDING_CAM_OFFSETS;
    camTween.targetLook.copy(controls.target);
    camTween.targetPos.copy(controls.target).add(offsets[camAzimuthIdx]);
    camTween.targetZoom = camera.zoom;
    camTween.active = true;
  };

  document.getElementById('btn-close-panel').onclick = closeBottomPanel;
  document.getElementById('btn-close-lot-modal').onclick = () => dom.lotBuildModal.classList.add('hidden');
  document.getElementById('btn-close-recruit').onclick = () => dom.recruitModal.classList.add('hidden');

  document.getElementById('btn-refresh-applicants').onclick = () => {
    if (!recruitTargetRoom) return;
    if (state.gold < 10) { showToast('💸 홍보비(10만원)가 부족합니다!', 'rose'); return; }
    addGold(-10);
    openRecruitModal(recruitTargetRoom);
    showToast('📢 새 입주 지원자 3명이 도착했습니다!', 'amber');
  };

  dom.questBtn.onclick = handleQuestClick;

  let resetArmed = false;
  const resetBtn = document.getElementById('btn-reset-save');
  resetBtn.onclick = () => {
    if (!resetArmed) {
      resetArmed = true;
      resetBtn.textContent = '⚠️';
      showToast('🔄 초기화하려면 3초 안에 ⚠️ 버튼을 한 번 더 눌러주세요!', 'rose');
      setTimeout(() => { resetArmed = false; resetBtn.textContent = '🔄'; }, 3200);
      return;
    }
    localStorage.removeItem(SAVE_KEY);
    window.location.reload();
  };

  window.addEventListener('resize', () => {
    updateCameraFrustum();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function cacheDom() {
  dom.webglContainer = document.getElementById('webgl-container');
  dom.townLotsLayer = document.getElementById('town-lots-layer');
  dom.roomBadgesLayer = document.getElementById('room-badges-layer');
  dom.shopBadgesLayer = document.getElementById('shop-badges-layer');
  dom.speechLayer = document.getElementById('speech-bubbles-layer');
  dom.careLayer = document.getElementById('care-bubbles-layer');
  dom.jackpotLayer = document.getElementById('jackpot-popups-layer');

  dom.hudModePill = document.getElementById('hud-mode-pill');
  dom.btnBackToTown = document.getElementById('btn-back-to-town');
  dom.hudTimeBadge = document.getElementById('hud-time-badge');
  dom.hudTownSummary = document.getElementById('hud-town-summary');
  dom.hudGold = document.getElementById('hud-gold');
  dom.hudGoldWrap = document.getElementById('hud-gold-wrap');
  dom.hudRentTotal = document.getElementById('hud-rent-total');
  dom.btnCollectAll = document.getElementById('btn-collect-all');

  dom.toggleViewIcon = document.getElementById('toggle-view-icon');
  dom.toggleViewLabel = document.getElementById('toggle-view-label');
  dom.zoomScaleLabel = document.getElementById('zoom-scale-label');
  dom.bottomHelpPill = document.getElementById('bottom-help-pill');

  dom.questBtn = document.getElementById('quest-floating-btn');
  dom.questStepTag = document.getElementById('quest-step-tag');
  dom.questRewardTag = document.getElementById('quest-reward-tag');
  dom.questTitle = document.getElementById('quest-title');
  dom.questDesc = document.getElementById('quest-desc');
  dom.questHint = document.getElementById('quest-action-hint');

  dom.bottomPanel = document.getElementById('bottom-panel');
  dom.panelRoomTitle = document.getElementById('panel-room-title');
  dom.panelGradeBadge = document.getElementById('panel-grade-badge');
  dom.panelRentBadge = document.getElementById('panel-rent-badge');
  dom.panelBody = document.getElementById('panel-body');

  dom.lotBuildModal = document.getElementById('lot-build-modal');
  dom.lotModalName = document.getElementById('lot-modal-name');
  dom.lotBuildCards = document.getElementById('lot-build-cards');

  dom.recruitModal = document.getElementById('recruit-modal');
  dom.recruitRoomBadge = document.getElementById('recruit-room-badge');
  dom.recruitRoomInfo = document.getElementById('recruit-room-info');
  dom.recruitCardsGrid = document.getElementById('recruit-cards-grid');

  dom.offlineModal = document.getElementById('offline-modal');
  dom.offlineTimeText = document.getElementById('offline-time-text');
  dom.offlineGoldAmount = document.getElementById('offline-gold-amount');
  dom.toastContainer = document.getElementById('toast-container');
}

// --------------------- 메인 실행 ---------------------
window.addEventListener('DOMContentLoaded', () => {
  cacheDom();
  const offline = loadGameState();
  initThreeWorld();
  exitToTownView(); // 시작 시 마을 전체 뷰(Town View)에서 시작!
  bindEvents();
  updateHudUI();
  updateQuestUI();

  if (offline && offline.earned > 0) {
    dom.offlineTimeText.textContent = `약 ${Math.max(1, Math.floor(offline.awaySec / 60))}분 동안 3D 타운 임대 수익이 모였어요!`;
    dom.offlineGoldAmount.textContent = offline.earned.toLocaleString();
    dom.offlineModal.classList.remove('hidden');
    document.getElementById('btn-claim-offline').onclick = () => {
      addGold(offline.earned);
      dom.offlineModal.classList.add('hidden');
      showToast(`🏦 부재중 타운 수익 +${offline.earned.toLocaleString()}만원 수령!`, 'emerald');
      saveGameState();
    };
  }

  let last = performance.now();

  function loop(now) {
    const dt = Math.min(0.06, (now - last) / 1000);
    last = now;

    if (camTween.active) {
      const k = Math.min(1, dt * 7.2);
      camera.position.lerp(camTween.targetPos, k);
      controls.target.lerp(camTween.targetLook, k);
      camera.zoom += (camTween.targetZoom - camera.zoom) * k;
      camera.updateProjectionMatrix();
      if (camera.position.distanceTo(camTween.targetPos) < 0.08 && Math.abs(camera.zoom - camTween.targetZoom) < 0.01) {
        camTween.active = false;
      }
    }
    controls.update();

    // 세탁조 회전
    for (const d of spinningDrums) d.rotation.z += dt * 3.5;

    // 신축 공사 중 타워크레인 회전 & 먼지 파티클 연출!
    for (let i = activeConstructions.length - 1; i >= 0; i--) {
      const cs = activeConstructions[i];
      cs.elapsed += dt;
      cs.dustTimer -= dt;
      if (cs.craneTop) cs.craneTop.rotation.y += dt * 2.2;
      if (cs.dustTimer <= 0) {
        cs.dustTimer = 0.35;
        const lot = getLot(cs.lotId);
        spawnSparkles3D(lot.x + (Math.random() - 0.5) * 4, 1.2, lot.z + (Math.random() - 0.5) * 4, 4);
      }
      if (cs.elapsed >= cs.duration) {
        const doneFn = cs.onDone;
        activeConstructions.splice(i, 1);
        doneFn();
      }
    }

    // 바운스 & 3D 코인 물리
    for (let i = activeBounces.length - 1; i >= 0; i--) {
      const b = activeBounces[i];
      b.elapsed += dt;
      const t = Math.min(1, b.elapsed / b.duration);
      b.obj.position.y = b.baseY + (1 - easeOutBounce(t)) * 2.0;
      b.obj.scale.setScalar(0.38 + 0.62 * Math.min(1, t * 2.1));
      if (t >= 1) {
        b.obj.position.y = b.baseY;
        b.obj.scale.setScalar(1);
        activeBounces.splice(i, 1);
      }
    }

    for (let i = activeParticles3D.length - 1; i >= 0; i--) {
      const p = activeParticles3D[i];
      p.life -= dt;
      if (p.life <= 0) {
        scene.remove(p.mesh);
        activeParticles3D.splice(i, 1);
        continue;
      }
      p.vy -= 13.0 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotation.x += 8 * dt;
      p.mesh.rotation.y += 6 * dt;
      if (p.mesh.position.y < p.floorY) {
        p.mesh.position.y = p.floorY;
        p.vy = Math.abs(p.vy) * 0.45;
      }
    }

    state.gameMinutes += dt * 15;
    if (state.gameMinutes >= 24 * 60) {
      state.gameMinutes -= 24 * 60;
      state.day += 1;
    }

    tickEconomyAndTimers(dt);
    tickInteriorAndTownActors(dt);

    renderer.render(scene, camera);
    updateProjectedDOMPositions();
    updateHudUI();

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);

  setInterval(() => {
    saveGameState();
    updateQuestUI();
  }, 3000);
});
