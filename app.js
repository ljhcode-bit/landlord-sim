// =========================================================
// 【갓물주 라이프 3D: 미니미 타운】 메인 WebGL 3D 엔진 (app.js)
// - 가로 모드 클린 HUD & 우측 하단 통합 FAB + 2단 분할 글래스모피즘 수첩
// - 줌 배율 연동 실시간 반투명 X-Ray 투시(Cutaway) & 원거리/근거리 말풍선 분리
// - 5종 세대 맞춤 가구(학생/신혼/4인가족 2층침대/노부부 다도/히키코모리 쓰레기산)
// - 악취 연기·날파리·층간소음 붉은 충격파·이삿짐 박스(D-30s)·강제 퇴거 도장 연출
// - 1층 정문 관리인 부스 & 위임 슬라이더, 공용시설 4종, 수변 아일랜드 & 반려동물
// =========================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const SAVE_KEY = 'god_landlord_island_3d_v2';

// --------------------- 전역 게임 상태 생성 ---------------------
let state = createInitialState();

function makeResidentialBuilding(lotId, devType, title) {
  const cat = DEVELOPMENT_CATALOG[devType];
  const rooms = ROOM_SLOTS_TEMPLATE.map((slot) => ({
    id: `${lotId}_${slot.subId}`,
    lotId,
    subId: slot.subId,
    name: slot.name,
    floor: slot.floor,
    col: slot.col,
    lx: slot.lx,
    ly: slot.ly,
    lz: slot.lz,
    cycleSec: slot.cycleSec,
    unlocked: slot.defaultUnlocked,
    unlockCost: slot.unlockCost,
    baseRent: cat.baseRoomRent + (slot.floor === 2 ? 6 : 0),
    interiorLv: 0,
    soundproofed: false,
    household: null,
    rentTimer: 0,
    trashStage: 0, // 0~3 (히키코모리 쓰레기 누적 단계)
    trashProgress: 0,
    evictionCountdown: null, // 행복도 30% 이하 시 30초 카운트다운
    activeConflict: null // 'noise' | 'odor' | 'infra' | null
  }));

  return {
    lotId,
    devType,
    title,
    rooms,
    shopsLv: { mart: 1, wash: 1 },
    infra: {
      elevator: false,
      recycling: false,
      parcel_box: false,
      rooftop_garden: false
    },
    manager: {
      hired: false,
      minRentFloor: 80, // 최소 월세 수취 기준선(하한선) 슬라이더 값
      autoBudgetCap: 90, // 시설/청소 자동 투자 예산 한도 슬라이더 값
      salaryTimer: 0
    },
    pendingCoins: 0,
    shopCycleTimer: 0
  };
}

function createInitialState() {
  const lots = JSON.parse(JSON.stringify(INITIAL_ISLAND_LOTS));
  const buildings = {
    lot_main: makeResidentialBuilding('lot_main', 'mixed_1', '미니미 주상복합 1호관')
  };
  const developments = {}; // 비주거 부지(태양광, 도시농장, 공원, 카페) 런타임 데이터

  return {
    gold: 460,
    day: 1,
    gameMinutes: 9 * 60,
    claimedQuests: [],
    lots,
    buildings,
    developments,
    stats: {
      evictions: 0,
      crisisResolved: 0,
      totalEarned: 0
    },
    lastSavedAt: Date.now()
  };
}

// --------------------- Three.js 및 전역 캐시 ---------------------
let scene;
let camera;
let renderer;
let controls;
let dirLight;
let hemiLight;

const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();
const tempVec = new THREE.Vector3();

const OVERVIEW_LOOK = new THREE.Vector3(-1.5, 2.2, -1.0);
const CAM_OFFSETS = [
  new THREE.Vector3(30, 27, 34),
  new THREE.Vector3(-30, 27, 34),
  new THREE.Vector3(-30, 27, -34),
  new THREE.Vector3(30, 27, -34)
];
let camAzimuth = 0;

const camTween = {
  active: false,
  pos: new THREE.Vector3(),
  look: new THREE.Vector3(),
  zoom: 0.92
};

let currentShellOpacity = 1.0;
let focusedRoomId = null;
let activeNotebookTab = 'quests';
let selectedSplitItemId = null;
let devModalLotId = null;
let recruitRoomTarget = null;
let recruitCandidates = [];

// 3D 공유 리소스 캐시 (60fps 경량화)
const GEO = {};
const MAT = {};
const TEX = {};

const lot3D = {}; // lotId -> { root, emptyGroup, shellMaterials, shellGroup, interiorGroup, infraGroup, managerGroup, elevatorCar, cropMeshes, roomGroups }
const pickableMeshes = [];
const spinningWashers = [];
const activeBounces = [];
const activeParticles = [];
const shockwaveRings = []; // 층간소음 붉은 충격파 링
const odorEmitters = {}; // roomId -> 날파리 메쉬 그룹
const residentActors = {}; // roomId -> [{ mesh, ox, oz, tx, tz, timer, isKid, isHoarder }]
const petActors = []; // 강아지(시바견/비숑) & 고양이 액터
const careBubbles = [];
let careTimer = 7.0;

// 오버레이 DOM 레지스트리
const lotOverlayEls = {};
const roomOverlayEls = {};
const crisisPinEls = {};
const speechEls = {}; // roomId -> 말풍선 DOM
const managerTagEls = {}; // lotId -> "💡 출동!" 태그

const dom = {};

// =========================================================
// 1. 프로시저럴 텍스처(간판, 마루, 타일, 시냇물) & 공유 지오메트리 초기화
// =========================================================
function makeTex(drawFn, rx = 1, ry = 1, w = 256, h = 256) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  drawFn(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  return t;
}

function makeSignTex(bgHex, borderHex, textStr, textHex = '#ffffff') {
  return makeTex((ctx, w, h) => {
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = borderHex;
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, w - 10, h - 10);
    ctx.fillStyle = textHex;
    ctx.font = 'bold 36px Jua, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(textStr, w / 2, h / 2 + 2);
  }, 1, 1, 512, 128);
}

function initSharedResources() {
  TEX.shadow = makeTex((ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, s * 0.08, s / 2, s / 2, s * 0.48);
    g.addColorStop(0, 'rgba(55, 28, 8, 0.4)');
    g.addColorStop(0.65, 'rgba(55, 28, 8, 0.14)');
    g.addColorStop(1, 'rgba(55, 28, 8, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  }, 1, 1, 128, 128);

  TEX.floor0 = makeTex((ctx, s) => {
    ctx.fillStyle = '#a8a29e';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = '#57534e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(30, 50); ctx.lineTo(130, 120); ctx.lineTo(190, 210);
    ctx.stroke();
  }, 2, 2);

  TEX.floor1 = makeTex((ctx, s) => {
    ctx.fillStyle = '#f8ddc0';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#d4a373';
    for (let y = 0; y < s; y += 42) ctx.fillRect(0, y, s, 3);
  }, 2, 2);

  TEX.floor2 = makeTex((ctx, s) => {
    ctx.fillStyle = '#dda15e';
    ctx.fillRect(0, 0, s, s);
    const cols = ['#e6b174', '#d4944c', '#cfa065'];
    for (let y = -32; y < s + 32; y += 24) {
      for (let x = -32; x < s + 32; x += 48) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = cols[Math.abs((x + y) / 24) % 3];
        ctx.fillRect(0, 0, 34, 14);
        ctx.strokeStyle = '#9c5a25';
        ctx.strokeRect(0, 0, 34, 14);
        ctx.restore();
      }
    }
  }, 2, 2);

  TEX.floor3 = makeTex((ctx, s) => {
    ctx.fillStyle = '#fffdf8';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, s - 8, s - 8);
    ctx.beginPath();
    ctx.moveTo(s / 2, 0); ctx.lineTo(s / 2, s);
    ctx.moveTo(0, s / 2); ctx.lineTo(s, s / 2);
    ctx.stroke();
  }, 2, 2);

  TEX.brick = makeTex((ctx, s) => {
    ctx.fillStyle = '#faebd7';
    ctx.fillRect(0, 0, s, s);
    const cols = ['#f3cbb0', '#eab696', '#f6d6bd'];
    for (let r = 0; r < 8; r++) {
      const off = (r % 2) * 24;
      for (let c = -1; c < 6; c++) {
        ctx.fillStyle = cols[(r + c + 3) % 3];
        ctx.fillRect(c * 48 + off + 2, r * 32 + 2, 44, 28);
      }
    }
  }, 3, 2);

  TEX.martSign = makeSignTex('#0284c7', '#fde047', '🏪 24H MINI MART', '#ffffff');
  TEX.washSign = makeSignTex('#db2777', '#bae6fd', '🫧 WASH PONG 24', '#ffffff');

  GEO.box = new THREE.BoxGeometry(1, 1, 1);
  GEO.cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
  GEO.sphere = new THREE.SphereGeometry(0.5, 14, 12);
  GEO.cone = new THREE.ConeGeometry(0.5, 1, 14);
  GEO.plane = new THREE.PlaneGeometry(1, 1);
  GEO.coin = new THREE.CylinderGeometry(0.24, 0.24, 0.06, 14);
  GEO.ring = new THREE.RingGeometry(0.35, 0.55, 24);

  MAT.shadow = new THREE.MeshBasicMaterial({ map: TEX.shadow, transparent: true, depthWrite: false });
  MAT.white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 });
  MAT.wood = new THREE.MeshStandardMaterial({ color: 0xc87d3b, roughness: 0.55 });
  MAT.darkWood = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.65 });
  MAT.gold = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.65, roughness: 0.25 });
  MAT.chrome = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.72, roughness: 0.22 });
  MAT.glass = new THREE.MeshStandardMaterial({ color: 0xbaf2ff, transparent: true, opacity: 0.34, roughness: 0.1, side: THREE.DoubleSide });
  MAT.coin = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xd97706, emissiveIntensity: 0.4, metalness: 0.75, roughness: 0.2 });
  MAT.trashBag = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.35, metalness: 0.15 });
  MAT.pizzaBox = new THREE.MeshStandardMaterial({ color: 0xd99b66, roughness: 0.8 });
  MAT.movingBox = new THREE.MeshStandardMaterial({ color: 0xc28e5c, roughness: 0.8 });
}

function makeDropShadow(w, d, y = 0.02) {
  const m = new THREE.Mesh(GEO.plane, MAT.shadow);
  m.rotation.x = -Math.PI / 2;
  m.scale.set(w, d, 1);
  m.position.y = y;
  return m;
}

// =========================================================
// 2. 감성적인 '곡선형 수변 & 둥근 플로팅 아일랜드' 지형 & 다리 & 벚꽃숲
// =========================================================
function buildCozyFloatingIsland() {
  const island = new THREE.Group();

  // 1) 둥근 다단 플로팅 아일랜드 절벽 & 잔디 상판 (원통 다층 조립)
  const cliffLower = new THREE.Mesh(
    new THREE.CylinderGeometry(31.5, 25.5, 4.2, 48),
    new THREE.MeshStandardMaterial({ color: 0xc68b59, roughness: 0.85 })
  );
  cliffLower.position.y = -2.3;

  const cliffMid = new THREE.Mesh(
    new THREE.CylinderGeometry(33.6, 31.4, 1.4, 48),
    new THREE.MeshStandardMaterial({ color: 0xe6ccb2, roughness: 0.8 })
  );
  cliffMid.position.y = -0.78;

  const meadowTop = new THREE.Mesh(
    new THREE.CylinderGeometry(33.0, 33.2, 0.42, 48),
    new THREE.MeshStandardMaterial({ color: 0xa7f3d0, roughness: 0.88 })
  );
  meadowTop.position.y = 0.0;
  island.add(cliffLower, cliffMid, meadowTop);

  // 2) 하늘색 곡선형 시냇물 (아일랜드를 부드럽게 가로지름)
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.24,
    roughness: 0.15
  });
  const streamPts = [
    [-22, -24], [-14, -18], [-6, -13], [2, -8], [5.5, -2.5], [5.2, 3.8], [3.5, 10.5], [1.5, 18.5], [-1, 25.5]
  ];
  streamPts.forEach(([sx, sz], idx) => {
    const seg = new THREE.Mesh(GEO.cyl, waterMat);
    seg.scale.set(4.8, 0.18, 6.4);
    seg.position.set(sx, 0.18, sz);
    seg.rotation.y = idx * 0.15;
    island.add(seg);
  });

  // 3) 아치형 크림색 돌다리 (시냇물 위 연결)
  const bridge = new THREE.Group();
  bridge.position.set(5.2, 0.2, 2.2);
  const archStoneMat = new THREE.MeshStandardMaterial({ color: 0xfffbeb, roughness: 0.6 });
  for (let i = -3; i <= 3; i++) {
    const h = Math.cos((i / 3.5) * 1.15) * 0.85;
    const deck = new THREE.Mesh(GEO.box, archStoneMat);
    deck.scale.set(1.2, 0.25, 3.2);
    deck.position.set(i * 1.05, 0.2 + h, 0);
    bridge.add(deck);

    [-1.45, 1.45].forEach((rz) => {
      const post = new THREE.Mesh(GEO.box, MAT.wood);
      post.scale.set(0.18, 0.65, 0.18);
      post.position.set(i * 1.05, 0.55 + h, rz);
      bridge.add(post);
    });
  }
  island.add(bridge);

  // 4) 크림색 곡선 징검돌 산책길 & 중앙 분수대 광장
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.75 });
  const plaza = new THREE.Mesh(GEO.cyl, stoneMat);
  plaza.scale.set(8.2, 0.14, 8.2);
  plaza.position.set(-4.5, 0.22, 5.2);
  island.add(plaza);

  // 중앙 미니 분수대
  const fBasin = new THREE.Mesh(GEO.cyl, MAT.white);
  fBasin.scale.set(2.8, 0.42, 2.8);
  fBasin.position.set(-4.5, 0.42, 5.2);
  const fWater = new THREE.Mesh(GEO.cyl, waterMat);
  fWater.scale.set(2.4, 0.45, 2.4);
  fWater.position.set(-4.5, 0.44, 5.2);
  const fTop = new THREE.Mesh(GEO.sphere, new THREE.MeshStandardMaterial({ color: 0xe0f2fe }));
  fTop.scale.set(0.85, 0.65, 0.85);
  fTop.position.set(-4.5, 1.25, 5.2);
  island.add(fBasin, fWater, fTop);

  // 곡선 돌담길 스텝
  [[-12, 3], [-9.5, 4.2], [-1.2, 4.0], [1.6, 3.0], [9.2, 1.5], [11.5, 0.5], [-8, 8], [-11, 9.5]].forEach(([px, pz]) => {
    const st = new THREE.Mesh(GEO.cyl, stoneMat);
    st.scale.set(1.7, 0.12, 1.4);
    st.position.set(px, 0.21, pz);
    island.add(st);
  });

  // 5) 파스텔 벚꽃나무 숲 & 초록 둥근 나무들
  const sakuraCoords = [
    [-24, -12], [-22, 6], [-19, 16], [21, -12], [23, 3], [19, 17], [-9, -19], [14, -18]
  ];
  sakuraCoords.forEach(([tx, tz], idx) => {
    island.add(createCherryTree3D(tx, tz, idx % 3 === 0 ? false : true));
  });

  scene.add(island);
}

function createCherryTree3D(x, z, isSakura = true) {
  const g = new THREE.Group();
  g.position.set(x, 0.18, z);
  g.add(makeDropShadow(2.6, 2.6));
  const trunk = new THREE.Mesh(GEO.cyl, MAT.darkWood);
  trunk.scale.set(0.4, 1.5, 0.4);
  trunk.position.y = 0.75;
  const leafColor1 = isSakura ? 0xfbcfe8 : 0x4ade80;
  const leafColor2 = isSakura ? 0xf9a8d4 : 0x22c55e;
  const c1 = new THREE.Mesh(GEO.sphere, new THREE.MeshStandardMaterial({ color: leafColor1, roughness: 0.7 }));
  c1.scale.set(2.3, 2.0, 2.3);
  c1.position.y = 2.1;
  const c2 = new THREE.Mesh(GEO.sphere, new THREE.MeshStandardMaterial({ color: leafColor2, roughness: 0.7 }));
  c2.scale.set(1.5, 1.4, 1.5);
  c2.position.set(0.7, 1.75, 0.4);
  g.add(trunk, c1, c2);
  return g;
}

// =========================================================
// 3. 심쿵 2등신(Chibi) 세대별 캐릭터·히키코모리·관리인 & 3D 강아지/고양이 빌더
// =========================================================
function createChibiPerson3D(role = 'student', variant = 0) {
  const g = new THREE.Group();
  const isKid = role === 'kid';
  const sc = isKid ? 0.64 : 1.0;
  g.scale.setScalar(sc);
  g.add(makeDropShadow(0.72, 0.72, 0.02));

  const palette = {
    student: { body: 0x3b82f6, hair: 0x1e293b },
    newlywed_m: { body: 0x6366f1, hair: 0x292524 },
    newlywed_f: { body: 0xf472b6, hair: 0x78350f },
    parent_m: { body: 0x10b981, hair: 0x292524 },
    parent_f: { body: 0xfbbf24, hair: 0x9a3412 },
    kid: { body: variant % 2 === 0 ? 0x38bdf8 : 0xfb7185, hair: 0x451a03 },
    elderly_m: { body: 0xa8a29e, hair: 0xe5e7eb },
    elderly_f: { body: 0xd97706, hair: 0xf3f4f6 },
    hikikomori: { body: 0x3b0764, hair: 0x18181b },
    manager: { body: 0x1e3a8a, hair: 0x1f2937 }
  };
  const cfg = palette[role] || palette.student;

  // 통통한 몸통
  const torso = new THREE.Mesh(GEO.cyl, new THREE.MeshStandardMaterial({ color: cfg.body, roughness: 0.6 }));
  torso.scale.set(0.42, 0.46, 0.4);
  torso.position.y = 0.36;

  // 큼직하고 둥근 2등신 얼굴 + 볼터치
  const head = new THREE.Mesh(GEO.sphere, new THREE.MeshStandardMaterial({ color: role === 'hikikomori' ? 0xf3e8ff : 0xffdfc4, roughness: 0.55 }));
  head.scale.set(0.62, 0.56, 0.58);
  head.position.y = 0.84;

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
  [-0.1, 0.1].forEach((ex) => {
    const eye = new THREE.Mesh(GEO.sphere, eyeMat);
    eye.scale.setScalar(0.08);
    eye.position.set(ex, 0.84, 0.28);
    g.add(eye);
  });

  if (role === 'hikikomori') {
    // 후드티를 푹 눌러쓴 은둔형 히키코모리 + 다크서클!
    const hood = new THREE.Mesh(GEO.sphere, new THREE.MeshStandardMaterial({ color: 0x4c1d95, roughness: 0.75 }));
    hood.scale.set(0.72, 0.66, 0.68);
    hood.position.set(0, 0.87, -0.04);
    g.add(hood);
  } else {
    // 발그레한 볼터치 & 헤어
    const blushMat = new THREE.MeshBasicMaterial({ color: 0xfb7185 });
    [-0.18, 0.18].forEach((bx) => {
      const bl = new THREE.Mesh(GEO.sphere, blushMat);
      bl.scale.set(0.09, 0.05, 0.04);
      bl.position.set(bx, 0.78, 0.26);
      g.add(bl);
    });

    const hair = new THREE.Mesh(GEO.sphere, new THREE.MeshStandardMaterial({ color: cfg.hair, roughness: 0.65 }));
    hair.scale.set(0.65, 0.42, 0.62);
    hair.position.set(0, 0.96, -0.03);
    g.add(hair);
  }

  // 제복 차림 관리인: 정모(모자) + 손에 든 클립보드!
  if (role === 'manager') {
    const capTop = new THREE.Mesh(GEO.cyl, new THREE.MeshStandardMaterial({ color: 0x1e3a8a }));
    capTop.scale.set(0.62, 0.14, 0.62);
    capTop.position.set(0, 1.16, 0);
    const visor = new THREE.Mesh(GEO.box, MAT.gold);
    visor.scale.set(0.42, 0.04, 0.22);
    visor.position.set(0, 1.1, 0.28);
    const clipboard = new THREE.Mesh(GEO.box, MAT.wood);
    clipboard.scale.set(0.22, 0.28, 0.04);
    clipboard.position.set(0.26, 0.44, 0.22);
    clipboard.rotation.x = -0.35;
    g.add(capTop, visor, clipboard);
  }

  g.add(torso, head);
  return g;
}

// 3D 반려동물 (시바견 / 비숑 강아지 / 식빵 굽거나 따라다니는 고양이)
function createPet3D(petType = 'shiba') {
  const g = new THREE.Group();
  g.add(makeDropShadow(0.55, 0.65, 0.02));
  const col = petType === 'shiba' ? 0xf59e0b : petType === 'bichon' ? 0xffffff : 0xfb923c;
  const pMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.7 });

  const body = new THREE.Mesh(GEO.sphere, pMat);
  body.scale.set(0.32, 0.26, 0.46);
  body.position.y = 0.2;

  const head = new THREE.Mesh(GEO.sphere, pMat);
  head.scale.set(0.3, 0.28, 0.28);
  head.position.set(0, 0.34, 0.22);

  if (petType !== 'bichon') {
    [-0.09, 0.09].forEach((ex) => {
      const ear = new THREE.Mesh(GEO.cone, pMat);
      ear.scale.set(0.1, 0.14, 0.1);
      ear.position.set(ex, 0.48, 0.22);
      g.add(ear);
    });
  } else {
    const fluff = new THREE.Mesh(GEO.sphere, MAT.white);
    fluff.scale.set(0.38, 0.34, 0.36);
    fluff.position.set(0, 0.36, 0.22);
    g.add(fluff);
  }

  const tail = new THREE.Mesh(GEO.cyl, pMat);
  tail.scale.set(0.07, 0.22, 0.07);
  tail.position.set(0, 0.3, -0.24);
  tail.rotation.x = -0.6;

  g.add(body, head, tail);
  return g;
}

// =========================================================
// 4. 세대별 맞춤형 3D 가구 조립 & 히키코모리 3단계 쓰레기산 & 이삿짐 박스
// =========================================================
function buildRoomInteriorFurniture3D(room) {
  const g = new THREE.Group();
  const hType = room.household ? room.household.type : null;
  const lv = room.interiorLv || 0;

  // 아직 입주 전 공실이면 등급에 맞는 깔끔한 기본 모델하우스 세팅
  if (!hType) {
    if (lv >= 1) {
      const rug = new THREE.Mesh(GEO.cyl, new THREE.MeshStandardMaterial({ color: lv >= 2 ? 0xfef3c7 : 0xfce7f3 }));
      rug.scale.set(1.8, 0.03, 1.8);
      rug.position.set(0, 0.02, 0.2);
      const plant = new THREE.Mesh(GEO.sphere, new THREE.MeshStandardMaterial({ color: 0x4ade80 }));
      plant.scale.set(0.45, 0.55, 0.45);
      plant.position.set(1.8, 0.4, -1.5);
      g.add(rug, plant);
    }
    return g;
  }

  // 1) 🎓 대학생/취준생 스튜디오 (싱글 침대, 듀얼모니터 책상, 게이밍체어, 미니 행거, 빨래바구니, 기타!)
  if (hType === 'student') {
    // 싱글 침대
    const bed = new THREE.Mesh(GEO.box, MAT.wood);
    bed.scale.set(1.15, 0.35, 1.85);
    bed.position.set(-1.75, 0.18, -0.9);
    const quilt = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ color: 0x60a5fa }));
    quilt.scale.set(1.18, 0.15, 1.3);
    quilt.position.set(-1.75, 0.38, -0.65);
    g.add(bed, quilt);

    // 듀얼모니터 책상 & 게이밍 체어
    const desk = new THREE.Mesh(GEO.box, MAT.darkWood);
    desk.scale.set(1.5, 0.58, 0.65);
    desk.position.set(1.35, 0.29, -1.45);
    [-0.32, 0.32].forEach((mx) => {
      const mon = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 0.6 }));
      mon.scale.set(0.54, 0.34, 0.04);
      mon.position.set(1.35 + mx, 0.78, -1.6);
      g.add(mon);
    });
    const gamingChair = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ color: 0xef4444 }));
    gamingChair.scale.set(0.5, 0.85, 0.5);
    gamingChair.position.set(1.35, 0.42, -0.75);
    g.add(desk, gamingChair);

    // 미니 행거 & 빨래 바구니 & 기타(Guitar)
    const rack = new THREE.Mesh(GEO.box, MAT.chrome);
    rack.scale.set(0.85, 1.25, 0.35);
    rack.position.set(-1.8, 0.62, 1.25);
    const basket = new THREE.Mesh(GEO.cyl, new THREE.MeshStandardMaterial({ color: 0xbae6fd }));
    basket.scale.set(0.45, 0.42, 0.45);
    basket.position.set(-1.05, 0.21, 1.35);

    const guitarBody = new THREE.Mesh(GEO.sphere, new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35 }));
    guitarBody.scale.set(0.38, 0.52, 0.14);
    guitarBody.position.set(2.05, 0.35, 0.65);
    guitarBody.rotation.z = -0.2;
    const guitarNeck = new THREE.Mesh(GEO.box, MAT.darkWood);
    guitarNeck.scale.set(0.08, 0.62, 0.06);
    guitarNeck.position.set(2.14, 0.78, 0.65);
    guitarNeck.rotation.z = -0.2;
    g.add(rack, basket, guitarBody, guitarNeck);
  }

  // 2) 💍 신혼부부 스윗홈 (핑크/크림 퀸침대, 2인 소파, 아일랜드 식탁 & 커피머신, 전신거울!)
  else if (hType === 'newlywed') {
    const qBed = new THREE.Mesh(GEO.box, MAT.white);
    qBed.scale.set(1.65, 0.42, 1.85);
    qBed.position.set(-1.55, 0.21, -0.95);
    const pinkDuvet = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ color: 0xf9a8d4 }));
    pinkDuvet.scale.set(1.68, 0.16, 1.3);
    pinkDuvet.position.set(-1.55, 0.44, -0.7);
    [-1.9, -1.2].forEach((px) => {
      const pil = new THREE.Mesh(GEO.box, MAT.white);
      pil.scale.set(0.55, 0.14, 0.32);
      pil.position.set(px, 0.5, -1.58);
      g.add(pil);
    });
    g.add(qBed, pinkDuvet);

    // 2인용 크림 패브릭 소파 & 핑크 러그
    const rug = new THREE.Mesh(GEO.cyl, new THREE.MeshStandardMaterial({ color: 0xfce7f3 }));
    rug.scale.set(1.9, 0.03, 1.5);
    rug.position.set(1.15, 0.02, -0.75);
    const sofa = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ color: 0xfff1f2 }));
    sofa.scale.set(1.5, 0.52, 0.72);
    sofa.position.set(1.15, 0.26, -1.35);
    g.add(rug, sofa);

    // 아일랜드 식탁 & 에스프레소 커피머신 + 전신거울
    const island = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ map: TEX.floor3 }));
    island.scale.set(1.55, 0.72, 0.68);
    island.position.set(-1.25, 0.36, 1.25);
    const coffee = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ color: 0xe11d48 }));
    coffee.scale.set(0.34, 0.36, 0.3);
    coffee.position.set(-1.6, 0.9, 1.25);

    const mirrorFrame = new THREE.Mesh(GEO.box, MAT.gold);
    mirrorFrame.scale.set(0.62, 1.45, 0.08);
    mirrorFrame.position.set(2.15, 0.72, 1.15);
    mirrorFrame.rotation.y = -0.45;
    g.add(island, coffee, mirrorFrame);
  }

  // 3) 👨‍👩‍👧‍👦 4인 가족 패밀리 하우스 (낮은 가벽, 4인 식탁, 대형 L자 소파 & TV, 3D 2층 침대 Bunk Bed, 장난감 매트!)
  else if (hType === 'family4') {
    // 어린이용 3D 2층 침대 (Bunk Bed 조립!)
    const bunk = new THREE.Group();
    bunk.position.set(-1.75, 0, -1.15);
    [[-0.55, -0.75], [0.55, -0.75], [-0.55, 0.75], [0.55, 0.75]].forEach(([bx, bz]) => {
      const post = new THREE.Mesh(GEO.cyl, MAT.wood);
      post.scale.set(0.1, 1.65, 0.1);
      post.position.set(bx, 0.82, bz);
      bunk.add(post);
    });
    const bed1 = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ color: 0x93c5fd }));
    bed1.scale.set(1.12, 0.22, 1.52);
    bed1.position.y = 0.32;
    const bed2 = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ color: 0xfda4af }));
    bed2.scale.set(1.12, 0.22, 1.52);
    bed2.position.y = 1.15;
    const ladder = new THREE.Mesh(GEO.box, MAT.wood);
    ladder.scale.set(0.32, 1.25, 0.08);
    ladder.position.set(0.58, 0.65, 0.35);
    bunk.add(bed1, bed2, ladder);
    g.add(bunk);

    // 낮은 공간분리 가벽 + 장난감 매트
    const lowWall = new THREE.Mesh(GEO.box, MAT.wood);
    lowWall.scale.set(0.12, 0.95, 1.8);
    lowWall.position.set(-0.55, 0.48, -1.1);
    const playMat = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ color: 0xfde047 }));
    playMat.scale.set(1.3, 0.03, 1.2);
    playMat.position.set(-1.5, 0.02, 1.1);
    g.add(lowWall, playMat);

    // 대형 L자형 소파 & 와이드 TV + 4인 식탁
    const lSofa1 = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ color: 0x6ee7b7 }));
    lSofa1.scale.set(1.65, 0.48, 0.68);
    lSofa1.position.set(1.25, 0.24, -1.45);
    const lSofa2 = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ color: 0x6ee7b7 }));
    lSofa2.scale.set(0.68, 0.48, 1.1);
    lSofa2.position.set(2.0, 0.24, -0.85);
    const tv = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x38bdf8, emissiveIntensity: 0.35 }));
    tv.scale.set(1.1, 0.6, 0.06);
    tv.position.set(1.25, 0.65, 0.1);
    const dining = new THREE.Mesh(GEO.box, MAT.wood);
    dining.scale.set(1.25, 0.55, 0.85);
    dining.position.set(0.95, 0.28, 1.35);
    g.add(lSofa1, lSofa2, tv, dining);
  }

  // 4) 🍵 노부부 황혼 힐링룸 (트윈 침대, 흔들의자 2개, 다도 좌탁, 난초 화분 & 분재 선반!)
  else if (hType === 'elderly') {
    [-2.0, -0.9].forEach((bx) => {
      const twin = new THREE.Mesh(GEO.box, MAT.darkWood);
      twin.scale.set(0.92, 0.38, 1.75);
      twin.position.set(bx, 0.19, -1.0);
      const cover = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ color: 0xd9f99d }));
      cover.scale.set(0.94, 0.14, 1.25);
      cover.position.set(bx, 0.4, -0.75);
      g.add(twin, cover);
    });

    // 다도 좌탁 & 찻주전자 + 흔들의자 2개
    const teaTable = new THREE.Mesh(GEO.box, MAT.darkWood);
    teaTable.scale.set(1.1, 0.26, 0.85);
    teaTable.position.set(1.25, 0.13, 0.35);
    const teapot = new THREE.Mesh(GEO.sphere, new THREE.MeshStandardMaterial({ color: 0x15803d }));
    teapot.scale.setScalar(0.2);
    teapot.position.set(1.25, 0.34, 0.35);
    [0.55, 1.95].forEach((cx) => {
      const rocker = new THREE.Mesh(GEO.box, MAT.wood);
      rocker.scale.set(0.52, 0.68, 0.58);
      rocker.position.set(cx, 0.34, -1.1);
      g.add(rocker);
    });

    // 분재 선반 & 난초 화분
    const bonsaiShelf = new THREE.Mesh(GEO.box, MAT.darkWood);
    bonsaiShelf.scale.set(1.1, 0.85, 0.38);
    bonsaiShelf.position.set(-1.6, 0.42, 1.55);
    const bonsaiLeaf = new THREE.Mesh(GEO.sphere, new THREE.MeshStandardMaterial({ color: 0x16a34a }));
    bonsaiLeaf.scale.set(0.55, 0.35, 0.4);
    bonsaiLeaf.position.set(-1.6, 1.02, 1.55);
    g.add(teaTable, teapot, bonsaiShelf, bonsaiLeaf);
  }

  // 5) 🗑️ 은둔형 외톨이 '히키코모리/호더' 룸 (어두운 무드, 트리플 모니터 책상, 바닥 매트리스 + 쓰레기 더미 그룹!)
  else if (hType === 'hikikomori') {
    const floorMatt = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ color: 0x475569 }));
    floorMatt.scale.set(1.25, 0.12, 1.8);
    floorMatt.position.set(-1.75, 0.06, -0.95);
    g.add(floorMatt);

    // 트리플 모니터(3대) 컴퓨터 책상 + 어두운 보랏빛 조명
    const pcDesk = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ color: 0x18181b }));
    pcDesk.scale.set(1.85, 0.58, 0.72);
    pcDesk.position.set(1.15, 0.29, -1.45);
    [-0.55, 0, 0.55].forEach((mx, i) => {
      const m = new THREE.Mesh(
        GEO.box,
        new THREE.MeshStandardMaterial({ color: 0x818cf8, emissive: 0x6366f1, emissiveIntensity: 0.85 })
      );
      m.scale.set(0.5, 0.36, 0.04);
      m.position.set(1.15 + mx, 0.78, -1.55 + Math.abs(i - 1) * 0.08);
      m.rotation.y = (1 - i) * 0.25;
      g.add(m);
    });
    g.add(pcDesk);

    // 쓰레기 누적 단계(1~3단계)에 따라 피자박스 탑, 페트병/캔, 검은 쓰레기봉투 산더미 생성!!
    if (room.trashStage >= 1) {
      g.add(createTrashPileGroup(room.trashStage));
    }
  }

  // 행복도 30% 이하 이탈 위기(이사 고민 중!) 시 갈색 3D 이삿짐 박스(📦) 적치 & 바닥 붉은 경고판!
  if (room.evictionCountdown !== null) {
    const warnPad = new THREE.Mesh(
      GEO.plane,
      new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.26, side: THREE.DoubleSide })
    );
    warnPad.rotation.x = -Math.PI / 2;
    warnPad.scale.set(5.0, 4.1, 1);
    warnPad.position.y = 0.03;
    g.add(warnPad);

    [[-0.2, 1.1, 0], [0.38, 1.15, 0], [0.08, 1.12, 0.44]].forEach(([bx, bz, by], idx) => {
      const mBox = new THREE.Mesh(GEO.box, MAT.movingBox);
      mBox.scale.set(0.52, 0.44, 0.46);
      mBox.position.set(bx, 0.22 + by, bz);
      mBox.rotation.y = idx * 0.3;
      g.add(mBox);
    });
  }

  return g;
}

// 히키코모리 쓰레기 더미 그룹 (피자 박스 탑 + 배달 용기 + 빈 페트병/캔 + 검은 쓰레기봉투 산더미)
function createTrashPileGroup(stage) {
  const tg = new THREE.Group();

  // 1단계부터 생기는 피자 박스 탑 & 빈 페트병들
  const pizzaCount = stage * 3;
  for (let i = 0; i < pizzaCount; i++) {
    const pBox = new THREE.Mesh(GEO.box, MAT.pizzaBox);
    pBox.scale.set(0.56, 0.07, 0.56);
    pBox.position.set(-0.35 + (i % 2) * 0.06, 0.04 + i * 0.075, -0.2);
    pBox.rotation.y = i * 0.22;
    tg.add(pBox);
  }

  // 페트병 & 캔
  const canCols = [0x22c55e, 0xef4444, 0x38bdf8, 0xfacc15];
  for (let i = 0; i < stage * 5; i++) {
    const bottle = new THREE.Mesh(GEO.cyl, new THREE.MeshStandardMaterial({ color: canCols[i % 4] }));
    bottle.scale.set(0.11, 0.26, 0.11);
    bottle.position.set(-1.1 + (i * 0.37) % 2.6, 0.13, 0.3 + ((i * 0.53) % 1.4));
    tg.add(bottle);
  }

  // 2~3단계: 검은 쓰레기봉투 산더미 & 배달 용기 증식!
  if (stage >= 2) {
    const bagSpots = [
      [0.4, 0.85], [0.85, 0.95], [0.6, 1.3], [-0.8, 1.1], [1.6, 0.4]
    ];
    const count = stage >= 3 ? 5 : 3;
    for (let i = 0; i < count; i++) {
      const [bx, bz] = bagSpots[i];
      const bag = new THREE.Mesh(GEO.sphere, MAT.trashBag);
      const sz = stage >= 3 ? 0.62 : 0.48;
      bag.scale.set(sz, sz * 0.88, sz);
      bag.position.set(bx, sz * 0.4, bz);
      tg.add(bag);
    }
  }
  if (stage >= 3) {
    // 3단계: 쓰레기봉투 2단 산더미!
    const topBag = new THREE.Mesh(GEO.sphere, MAT.trashBag);
    topBag.scale.set(0.55, 0.55, 0.55);
    topBag.position.set(0.62, 0.78, 1.02);
    tg.add(topBag);
  }

  return tg;
}

// =========================================================
// 5. 주상복합 3D 빌딩(1층 상가 육안 식별 + 입구 관리인 + 공용시설 4종 + X-Ray 외피)
// =========================================================
function buildAllLots3D() {
  for (const lot of state.lots) {
    const root = new THREE.Group();
    root.position.set(lot.x, 0.22, lot.z);
    scene.add(root);

    lot3D[lot.lotId] = {
      root,
      emptyGroup: new THREE.Group(),
      devGroup: new THREE.Group(),
      shellGroup: new THREE.Group(),
      interiorGroup: new THREE.Group(),
      infraGroup: new THREE.Group(),
      managerGroup: new THREE.Group(),
      shellMaterials: [],
      elevatorCar: null,
      cropMeshes: [],
      roomGroups: {}
    };

    const reg = lot3D[lot.lotId];
    root.add(reg.emptyGroup, reg.devGroup, reg.interiorGroup, reg.infraGroup, reg.managerGroup, reg.shellGroup);
    refreshLot3D(lot.lotId);
  }
}

function refreshLot3D(lotId) {
  const lot = getLot(lotId);
  const reg = lot3D[lotId];
  if (!lot || !reg) return;

  reg.emptyGroup.clear();
  reg.devGroup.clear();
  reg.shellGroup.clear();
  reg.interiorGroup.clear();
  reg.infraGroup.clear();
  reg.managerGroup.clear();
  reg.shellMaterials = [];
  reg.elevatorCar = null;
  reg.cropMeshes = [];
  reg.roomGroups = {};

  if (!lot.owned) {
    // 빈 부지 울타리 & 팻말
    const pad = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ color: 0xd9f99d, roughness: 0.9 }));
    pad.scale.set(10.5, 0.14, 8.2);
    pad.position.y = 0.07;
    pad.userData.lotId = lotId;
    reg.emptyGroup.add(pad);
    registerPick(pad);

    for (let x = -4.8; x <= 4.8; x += 2.4) {
      [-3.7, 3.7].forEach((z) => {
        const p = new THREE.Mesh(GEO.box, MAT.wood);
        p.scale.set(0.18, 0.65, 0.18);
        p.position.set(x, 0.35, z);
        reg.emptyGroup.add(p);
      });
    }
    const sign = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ color: 0xfef08a }));
    sign.scale.set(2.1, 1.05, 0.16);
    sign.position.set(0, 1.1, 0.5);
    sign.userData.lotId = lotId;
    reg.emptyGroup.add(sign);
    registerPick(sign);
    return;
  }

  const cat = DEVELOPMENT_CATALOG[lot.devType];
  if (!cat.isResidential) {
    // 비주거 부지: 태양광 발전소 / 도시 농장 / 벚꽃 공원 / 베이커리 카페
    const devMesh = buildNonResidential3D(lot.lotId, lot.devType, reg);
    devMesh.traverse((c) => {
      if (c.isMesh) {
        c.userData.lotId = lotId;
        registerPick(c);
      }
    });
    reg.devGroup.add(devMesh);
    return;
  }

  // ===== 주상복합 빌딩 (1층 24H MINI MART & WASH PONG + 상층부 6개 호실 + X-Ray 외피) =====
  const b = state.buildings[lotId];
  if (!b) return;

  reg.root.add(makeDropShadow(18.8, 8.2, 0.01));

  // 1) 1층 상가 베이스 (멀리서도 100% 식별되는 24H MINI MART + 중앙 정문 로비 + WASH PONG!)
  const groundBody = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ color: 0xfffbeb, roughness: 0.55 }));
  groundBody.scale.set(17.2, 2.95, 5.4);
  groundBody.position.set(0, 1.48, 0.2);
  reg.interiorGroup.add(groundBody);

  // 좌측 1층: 24H MINI MART 간판 & 파란 어닝 & 내부 음료 쇼케이스 쇼윈도
  const martSign = new THREE.Mesh(GEO.box, new THREE.MeshBasicMaterial({ map: TEX.martSign }));
  martSign.scale.set(6.2, 0.72, 0.18);
  martSign.position.set(-5.1, 2.52, 2.95);
  const martAwning = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ color: 0x0284c7 }));
  martAwning.scale.set(6.2, 0.25, 0.95);
  martAwning.position.set(-5.1, 1.98, 3.25);
  martAwning.rotation.x = 0.22;
  const martWindow = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ color: 0xe0f2fe, emissive: 0x38bdf8, emissiveIntensity: 0.35 }));
  martWindow.scale.set(5.6, 1.55, 0.1);
  martWindow.position.set(-5.1, 1.02, 2.92);
  reg.interiorGroup.add(martSign, martAwning, martWindow);

  // 중앙 1층: 정문 입구 캐노피
  const lobbyDoor = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ color: 0xfde68a }));
  lobbyDoor.scale.set(2.6, 2.15, 0.3);
  lobbyDoor.position.set(0, 1.08, 2.85);
  reg.interiorGroup.add(lobbyDoor);

  // 우측 1층: WASH PONG 코인세탁소 간판 & 핑크 어닝 & 회전 드럼 쇼윈도
  const washSign = new THREE.Mesh(GEO.box, new THREE.MeshBasicMaterial({ map: TEX.washSign }));
  washSign.scale.set(6.2, 0.72, 0.18);
  washSign.position.set(5.1, 2.52, 2.95);
  const washAwning = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ color: 0xdb2777 }));
  washAwning.scale.set(6.2, 0.25, 0.95);
  washAwning.position.set(5.1, 1.98, 3.25);
  washAwning.rotation.x = 0.22;
  reg.interiorGroup.add(washSign, washAwning);

  // 세탁소 전면에서 보이는 회전 드럼세탁기 3대!
  [3.4, 5.1, 6.8].forEach((wx) => {
    const wBox = new THREE.Mesh(GEO.box, MAT.white);
    wBox.scale.set(1.25, 1.45, 0.4);
    wBox.position.set(wx, 0.85, 2.82);
    const drum = new THREE.Group();
    drum.position.set(wx, 0.85, 3.05);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.06, 10, 18), MAT.chrome);
    const clothes = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ color: 0x38bdf8 }));
    clothes.scale.set(0.38, 0.22, 0.06);
    drum.add(ring, clothes);
    spinningWashers.push(clothes);
    reg.interiorGroup.add(wBox, drum);
  });

  // 2) 상층부 6개 호실 (101~103호, 201~203호) 조립
  for (const room of b.rooms) {
    const rGroup = new THREE.Group();
    rGroup.position.set(room.lx, room.ly, room.lz);
    reg.interiorGroup.add(rGroup);
    reg.roomGroups[room.id] = rGroup;
    rebuildRoom3D(room);
  }

  // 3) 줌 배율 연동 자동 반투명 X-Ray 외벽 & 지붕(Shell Group)!
  const wallXRayMat = new THREE.MeshStandardMaterial({
    map: TEX.brick,
    transparent: true,
    opacity: currentShellOpacity,
    roughness: 0.7
  });
  const roofXRayMat = new THREE.MeshStandardMaterial({
    color: lot.devType === 'mixed_2' ? 0xeab308 : 0xe07a5f,
    transparent: true,
    opacity: currentShellOpacity,
    roughness: 0.55
  });
  reg.shellMaterials.push(wallXRayMat, roofXRayMat);

  // 전면 X-Ray 외벽 (줌아웃 시 불투명한 예쁜 빌라 외관, 줌인 시 투명해지며 방 안이 훤히 보임!)
  const frontShell = new THREE.Mesh(GEO.box, wallXRayMat);
  frontShell.scale.set(17.1, 5.7, 0.22);
  frontShell.position.set(0, 5.85, 2.55);
  reg.shellGroup.add(frontShell);

  // 전면 창문틀 장식 (외관용)
  const winGlassXRay = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.45,
    transparent: true,
    opacity: currentShellOpacity
  });
  reg.shellMaterials.push(winGlassXRay);
  [4.3, 7.1].forEach((wy) => {
    [-5.6, 0, 5.6].forEach((wx) => {
      const win = new THREE.Mesh(GEO.box, winGlassXRay);
      win.scale.set(2.4, 1.35, 0.26);
      win.position.set(wx, wy, 2.56);
      reg.shellGroup.add(win);
    });
  });

  // 상단 지붕 슬래브 & 박공 지붕
  const roofSlab = new THREE.Mesh(GEO.box, roofXRayMat);
  roofSlab.scale.set(17.8, 0.45, 5.8);
  roofSlab.position.set(0, 8.85, 0.2);
  const roofPeak = new THREE.Mesh(new THREE.ConeGeometry(7.8, 1.8, 4), roofXRayMat);
  roofPeak.rotation.y = Math.PI / 4;
  roofPeak.scale.set(1.65, 1, 0.55);
  roofPeak.position.set(0, 9.95, 0.2);
  reg.shellGroup.add(roofSlab, roofPeak);

  // 4) 건물 공용 인프라(엘리베이터 · 분리수거장 · 무인택배함 · 옥상 정원) & 입구 앞 관리인 부스!
  rebuildPublicInfraAndManager3D(lotId);
  syncBuildingResidents3D(lotId);
}

function rebuildPublicInfraAndManager3D(lotId) {
  const b = state.buildings[lotId];
  const reg = lot3D[lotId];
  if (!b || !reg) return;

  reg.infraGroup.clear();
  reg.managerGroup.clear();
  reg.elevatorCar = null;

  // [공용 1] 좌측 유리 전망 엘리베이터
  if (b.infra.elevator) {
    const shaft = new THREE.Mesh(GEO.box, MAT.glass);
    shaft.scale.set(2.0, 8.6, 2.2);
    shaft.position.set(-9.65, 4.3, 0.6);
    const frameTop = new THREE.Mesh(GEO.box, MAT.gold);
    frameTop.scale.set(2.2, 0.35, 2.4);
    frameTop.position.set(-9.65, 8.75, 0.6);
    const car = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 0.4 }));
    car.scale.set(1.5, 1.7, 1.6);
    car.position.set(-9.65, 1.5, 0.6);
    reg.elevatorCar = car;
    reg.infraGroup.add(shaft, frameTop, car);
  }

  // [공용 2] 우측 클린 분리수거장 (미설치 시 야외 쓰레기봉투 더미 생성!)
  if (b.infra.recycling) {
    const roof = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ color: 0x10b981 }));
    roof.scale.set(2.4, 0.2, 1.8);
    roof.position.set(10.1, 1.85, 1.4);
    [0x3b82f6, 0x22c55e, 0xfacc15].forEach((col, i) => {
      const bin = new THREE.Mesh(GEO.cyl, new THREE.MeshStandardMaterial({ color: col }));
      bin.scale.set(0.55, 0.95, 0.55);
      bin.position.set(9.45 + i * 0.65, 0.48, 1.4);
      reg.infraGroup.add(bin);
    });
    reg.infraGroup.add(roof);
  } else {
    // 미설치 페널티 시각 연출: 건물 옆 검은 쓰레기봉투 더미!
    [[9.5, 1.6], [10.0, 1.8], [9.7, 1.2]].forEach(([tx, tz]) => {
      const bag = new THREE.Mesh(GEO.sphere, MAT.trashBag);
      bag.scale.set(0.55, 0.48, 0.55);
      bag.position.set(tx, 0.24, tz);
      reg.infraGroup.add(bag);
    });
  }

  // [공용 3] 정문 옆 스마트 무인택배함
  if (b.infra.parcel_box) {
    const locker = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ color: 0xfbbf24 }));
    locker.scale.set(1.35, 1.75, 0.55);
    locker.position.set(-1.65, 0.88, 3.15);
    reg.infraGroup.add(locker);
  }

  // [공용 4] 옥상 루프탑 힐링 가든
  if (b.infra.rooftop_garden) {
    [[-5.0, 0.2], [5.0, 0.2]].forEach(([gx, gz]) => {
      const bush = new THREE.Mesh(GEO.sphere, new THREE.MeshStandardMaterial({ color: 0x4ade80 }));
      bush.scale.set(1.5, 1.1, 1.5);
      bush.position.set(gx, 9.5, gz);
      reg.infraGroup.add(bush);
    });
  }

  // [핵심 요구사항 6] 건물 1층 정문 입구 앞 미니 관리실 부스 & 2등신 제복 관리인 상주 연출!
  if (b.manager.hired) {
    const booth = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ color: 0xe0f2fe }));
    booth.scale.set(1.45, 1.85, 1.25);
    booth.position.set(1.65, 0.92, 3.65);
    const boothRoof = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ color: 0x1e3a8a }));
    boothRoof.scale.set(1.65, 0.25, 1.45);
    boothRoof.position.set(1.65, 1.92, 3.65);

    const mgrChar = createChibiPerson3D('manager');
    mgrChar.position.set(0.45, 0.02, 4.15);
    reg.managerGroup.add(booth, boothRoof, mgrChar);
    reg.managerGroup.userData.mgrChar = mgrChar;
  }
}

function buildNonResidential3D(lotId, devType, reg) {
  const g = new THREE.Group();
  g.add(makeDropShadow(11.5, 9.2, 0.02));

  if (devType === 'solar_plant') {
    // 🌱 친환경 태양광 발전소 (경사 태양광 패널 6기 + 인버터 변전 부스)
    const base = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ color: 0xdcfce7 }));
    base.scale.set(10.8, 0.2, 8.4);
    base.position.y = 0.1;
    g.add(base);

    const panelMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, metalness: 0.65, roughness: 0.2 });
    [-3.2, 0, 3.2].forEach((px) => {
      [-1.8, 1.6].forEach((pz) => {
        const leg = new THREE.Mesh(GEO.cyl, MAT.chrome);
        leg.scale.set(0.18, 0.9, 0.18);
        leg.position.set(px, 0.5, pz);
        const panel = new THREE.Mesh(GEO.box, panelMat);
        panel.scale.set(2.5, 0.1, 1.8);
        panel.position.set(px, 1.02, pz);
        panel.rotation.x = 0.42;
        g.add(leg, panel);
      });
    });

    const hut = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ color: 0xfef08a }));
    hut.scale.set(2.0, 1.6, 1.6);
    hut.position.set(-3.8, 0.9, -2.8);
    g.add(hut);
  } else if (devType === 'urban_farm') {
    // 🍓 힐링 도시 농장 & 텃밭 (씨앗 ➔ 새싹 ➔ 빨간 딸기로 성장하는 작물 메쉬 등록!)
    const soilMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    [-2.8, 0, 2.8].forEach((bx) => {
      const bed = new THREE.Mesh(GEO.box, soilMat);
      bed.scale.set(2.2, 0.35, 6.4);
      bed.position.set(bx, 0.18, 0.3);
      g.add(bed);

      for (let z = -2.0; z <= 2.2; z += 1.4) {
        const sprout = new THREE.Mesh(GEO.sphere, new THREE.MeshStandardMaterial({ color: 0x22c55e }));
        sprout.scale.set(0.45, 0.35, 0.45);
        sprout.position.set(bx, 0.45, z);
        const berry = new THREE.Mesh(GEO.sphere, new THREE.MeshStandardMaterial({ color: 0xe11d48 }));
        berry.scale.setScalar(0.28);
        berry.position.set(bx, 0.68, z);
        g.add(sprout, berry);
        reg.cropMeshes.push({ sprout, berry });
      }
    });
  } else if (devType === 'sakura_park') {
    const lawn = new THREE.Mesh(GEO.cyl, new THREE.MeshStandardMaterial({ color: 0xbbf7d0 }));
    lawn.scale.set(10.2, 0.22, 8.6);
    lawn.position.y = 0.11;
    g.add(lawn);
    [[-3.2, -2.0], [3.2, -2.0], [-3.0, 2.2], [3.0, 2.2]].forEach(([tx, tz]) => {
      g.add(createCherryTree3D(tx, tz, true));
    });
  } else if (devType === 'bakery_cafe') {
    const shop = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ color: 0xfff1e6 }));
    shop.scale.set(8.4, 3.6, 6.0);
    shop.position.y = 1.8;
    const roof = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ color: 0xd97706 }));
    roof.scale.set(9.0, 0.45, 6.6);
    roof.position.y = 3.8;
    const awn = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ color: 0xf43f5e }));
    awn.scale.set(7.6, 0.25, 1.2);
    awn.position.set(0, 2.1, 3.4);
    awn.rotation.x = 0.22;
    g.add(shop, roof, awn);
  }
  return g;
}

function rebuildRoom3D(room) {
  const reg = lot3D[room.lotId];
  if (!reg || !reg.roomGroups[room.id]) return;
  const g = reg.roomGroups[room.id];
  g.clear();

  const W = GAME_BALANCE.roomWidth;
  const D = GAME_BALANCE.roomDepth;
  const H = GAME_BALANCE.wallHeight;
  const lv = room.interiorLv || 0;

  const floorSlab = new THREE.Mesh(
    GEO.box,
    new THREE.MeshStandardMaterial({ map: TEX[`floor${lv}`], roughness: lv >= 3 ? 0.25 : 0.65 })
  );
  floorSlab.scale.set(W, 0.22, D);
  floorSlab.position.y = -0.11;
  floorSlab.userData.roomId = room.id;
  g.add(floorSlab);
  registerPick(floorSlab);

  const isHoarderRoom = room.household?.type === 'hikikomori';
  const wallColor = isHoarderRoom ? 0x64748b : lv === 0 ? 0xb5afa6 : lv === 1 ? 0xffe4e6 : lv === 2 ? 0xfef3c7 : 0xfffbeb;
  const wMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.72 });

  const backW = new THREE.Mesh(GEO.box, wMat);
  backW.scale.set(W, H, 0.16);
  backW.position.set(0, H / 2, -D / 2 + 0.08);
  backW.userData.roomId = room.id;

  const sideL = new THREE.Mesh(GEO.box, wMat);
  sideL.scale.set(0.16, H * 0.72, D);
  sideL.position.set(-W / 2 + 0.08, H * 0.36, 0);
  sideL.userData.roomId = room.id;

  const sideR = sideL.clone();
  sideR.position.x = W / 2 - 0.08;
  sideR.userData.roomId = room.id;

  g.add(backW, sideL, sideR);
  [backW, sideL, sideR].forEach(registerPick);

  if (!room.unlocked) {
    const cover = new THREE.Mesh(
      GEO.box,
      new THREE.MeshStandardMaterial({ color: 0x78350f, transparent: true, opacity: 0.52 })
    );
    cover.scale.set(W - 0.3, 0.15, D - 0.3);
    cover.position.y = 0.15;
    cover.userData.roomId = room.id;
    g.add(cover);
    registerPick(cover);
    return;
  }

  const furn = buildRoomInteriorFurniture3D(room);
  g.add(furn);
}

function syncBuildingResidents3D(lotId) {
  const b = state.buildings[lotId];
  const reg = lot3D[lotId];
  if (!b || !reg) return;

  for (const room of b.rooms) {
    if (residentActors[room.id]) {
      residentActors[room.id].forEach((a) => reg.interiorGroup.remove(a.mesh));
      delete residentActors[room.id];
    }
    if (!room.unlocked || !room.household) continue;

    const type = room.household.type;
    let roles = ['student'];
    if (type === 'newlywed') roles = ['newlywed_m', 'newlywed_f'];
    else if (type === 'family4') roles = ['parent_m', 'parent_f', 'kid', 'kid'];
    else if (type === 'elderly') roles = ['elderly_m', 'elderly_f'];
    else if (type === 'hikikomori') roles = ['hikikomori'];

    residentActors[room.id] = roles.map((role, idx) => {
      const m = createChibiPerson3D(role, idx);
      const ox = room.lx + (idx - (roles.length - 1) / 2) * 0.7;
      const oz = room.lz + 0.45;
      m.position.set(ox, room.ly, oz);
      reg.interiorGroup.add(m);
      return {
        room,
        mesh: m,
        cx: ox,
        cz: oz,
        tx: ox,
        tz: oz,
        timer: 1.0 + idx * 0.8,
        phase: idx * 1.7,
        isHoarder: role === 'hikikomori'
      };
    });
  }
}

function spawnIslandPets3D() {
  const configs = [
    { type: 'shiba', x: 3.5, z: 2.2 }, // 아치형 다리 앞 시바견
    { type: 'bichon', x: -6.2, z: 5.5 }, // 분수대 광장 비숑
    { type: 'cat', x: -11.5, z: 8.5 } // 도시농장 산책길 치즈냥이
  ];
  configs.forEach((c, idx) => {
    const m = createPet3D(c.type);
    m.position.set(c.x, 0.22, c.z);
    scene.add(m);
    petActors.push({
      mesh: m,
      homeX: c.x,
      homeZ: c.z,
      tx: c.x,
      tz: c.z,
      timer: 1.5,
      phase: idx * 2.1
    });
  });
}

// =========================================================
// 6. [핵심 요구사항 10] 카메라 줌(Zoom) 연동 실시간 반투명 X-Ray Cutaway 시스템
// =========================================================
function updateXRayCutaway(dt) {
  const z = camera.zoom;
  let targetOp = 1.0;
  let badgeLabel = '외관 100%';

  if (z <= 1.02) {
    targetOp = 1.0;
    badgeLabel = '외관 100%';
  } else if (z < 1.58) {
    // 중거리: 유리 케이스처럼 은은한 반투명 투시 (0.25 ~ 0.4)
    const t = (z - 1.02) / (1.58 - 1.02);
    targetOp = THREE.MathUtils.lerp(0.45, 0.25, t);
    badgeLabel = '반투명 투시';
  } else {
    // 근거리 클로즈업: 방 내부 가구/쓰레기산/가족이 선명히 보이도록 0.06으로 보간!
    targetOp = 0.06;
    badgeLabel = '내부 클로즈업';
  }

  currentShellOpacity = THREE.MathUtils.lerp(currentShellOpacity, targetOp, Math.min(1, dt * 8.0));
  if (dom.hudXrayBadge) dom.hudXrayBadge.textContent = badgeLabel;

  for (const reg of Object.values(lot3D)) {
    for (const mat of reg.shellMaterials) {
      mat.opacity = currentShellOpacity;
      mat.depthWrite = currentShellOpacity > 0.85;
    }
    reg.shellGroup.visible = currentShellOpacity > 0.03;
  }
}

// =========================================================
// 7. 층간소음 · 쓰레기방 악취 · 만족도 이탈(D-30s) · 전문 관리인 AI 시뮬레이션
// =========================================================
function tickConflictAndSatisfaction(dt) {
  for (const b of Object.values(state.buildings)) {
    const lot = getLot(b.lotId);
    const hasParkSynergy = state.lots.some((l) => l.owned && l.devType === 'sakura_park');

    // 1) 히키코모리 쓰레기 누적 & 초록 독기 연기/날파리 발생!
    for (const room of b.rooms) {
      if (!room.unlocked || !room.household) {
        room.activeConflict = null;
        clearOdorFlies(room.id);
        continue;
      }

      const hDef = HOUSEHOLD_TYPES[room.household.type];
      if (hDef.isHoarder) {
        const speedMul = b.infra.recycling ? 0.65 : 1.15; // 분리수거장 미설치 시 쓰레기 누적 가속!
        room.trashProgress = (room.trashProgress || 0) + dt * 5.2 * speedMul;
        const prevStage = room.trashStage;
        if (room.trashProgress >= 100 && room.trashStage < 3) {
          room.trashProgress = 0;
          room.trashStage += 1;
          rebuildRoom3D(room);
          if (room.trashStage >= 2) {
            showToast(`🤢 [${b.title} ${room.name}] 히키코모리 방에 쓰레기가 가득 차 악취가 퍼지기 시작합니다!`, 'rose');
          }
        }
        if (prevStage !== room.trashStage && focusedRoomId === room.id) renderFocusedRoomDrawer();

        // 쓰레기 2단계 이상 시 초록 독기 파티클 & 날파리 메쉬 생성!
        if (room.trashStage >= 2) {
          ensureOdorFlies(room, lot);
          if (Math.random() < dt * 2.2) {
            spawnSmokePoof3D(lot.x + room.lx, room.ly + 0.9, lot.z + room.lz, 0x84cc16, 2);
          }
        } else {
          clearOdorFlies(room.id);
        }
      } else {
        clearOdorFlies(room.id);
      }
    }

    // 2) 이웃 간 상성 판정 (위층 4인가족/대학생 층간소음 & 옆방/위아래 히키코모리 악취 피해 & 공용시설 부족)
    for (const room of b.rooms) {
      if (!room.unlocked || !room.household) continue;
      const hDef = HOUSEHOLD_TYPES[room.household.type];
      let deltaHappy = 0.5; // 기본 자연 회복
      let conflictReason = null;

      // (A) 위층 층간소음 체크
      const upstairs = b.rooms.find((r) => r.col === room.col && r.floor === room.floor + 1 && r.household);
      if (upstairs && !upstairs.soundproofed && !room.soundproofed) {
        const upDef = HOUSEHOLD_TYPES[upstairs.household.type];
        if (upDef.noiseOutput >= 40 && hDef.noiseSensitivity >= 50) {
          const dmg = (upDef.noiseOutput * hDef.noiseSensitivity) / 2600;
          deltaHappy -= dmg;
          conflictReason = 'noise';

          // 층간 사이 붉은 충격파 링 이펙트 발생!
          if (Math.random() < dt * 1.4) {
            spawnNoiseShockwave(lot.x + room.lx, room.ly + 2.55, lot.z + room.lz + 0.5);
          }
        }
      }

      // (B) 옆방/위아래방 히키코모리 쓰레기 악취 피해 체크!
      const pollutedNeighbor = b.rooms.find((r) =>
        r.id !== room.id &&
        r.trashStage >= 2 &&
        Math.abs(r.col - room.col) + Math.abs(r.floor - room.floor) <= 1
      );
      if (pollutedNeighbor && hDef.odorSensitivity > 0) {
        deltaHappy -= pollutedNeighbor.trashStage * (hDef.odorSensitivity / 55);
        conflictReason = 'odor';
      }

      // (C) 공용 인프라 부족 불만 체크 (2층 엘리베이터 미설치 / 분리수거장 미설치)
      if (room.floor >= 2 && hDef.needsElevator && !b.infra.elevator) {
        deltaHappy -= 1.5;
        if (!conflictReason) conflictReason = 'infra';
      }
      if (hDef.needsRecycling && !b.infra.recycling) {
        deltaHappy -= 0.9;
        if (!conflictReason) conflictReason = 'infra';
      }

      // (D) 옥상 정원 & 벚꽃공원 힐링 보너스
      if (b.infra.rooftop_garden) deltaHappy += 0.8;
      if (hasParkSynergy) deltaHappy += 0.6;

      room.activeConflict = conflictReason;
      room.household.happiness = Math.max(0, Math.min(100, room.household.happiness + deltaHappy * dt));

      // 3) 만족도 30% 이하 -> 🚨 이사 고민 중! (D-30s) 카운트다운 & 3D 이삿짐 박스 표시!
      if (room.household.happiness <= 30) {
        if (room.evictionCountdown === null) {
          room.evictionCountdown = GAME_BALANCE.evictionGraceSec;
          rebuildRoom3D(room); // 이삿짐 박스 생성
          showToast(`🚨 [${room.name} ${room.household.familyName}] 불만 누적으로 이사를 고민 중입니다! (D-30s)`, 'rose');
        } else {
          room.evictionCountdown -= dt;
          if (room.evictionCountdown <= 0) {
            // 자진 퇴거(공실 발생 -> 월세 0원)!
            const leftName = room.household.familyName;
            room.household = null;
            room.evictionCountdown = null;
            room.activeConflict = null;
            room.rentTimer = 0;
            rebuildRoom3D(room);
            syncBuildingResidents3D(b.lotId);
            showToast(`💔 [${room.name}] ${leftName} 세대가 불만을 견디지 못하고 이사 가버렸습니다! (공실 발생)`, 'rose');
            if (focusedRoomId === room.id) renderFocusedRoomDrawer();
          }
        }
      } else if (room.evictionCountdown !== null && room.household.happiness > 38) {
        room.evictionCountdown = null;
        rebuildRoom3D(room);
      }
    }

    // 4) 전문 건물 관리인(지배인) 급여 지출 & 설정된 위임 예산 한도 내 자동 케어 출동!
    if (b.manager.hired) {
      b.manager.salaryTimer += dt;
      if (b.manager.salaryTimer >= GAME_BALANCE.managerCycleSec) {
        b.manager.salaryTimer = 0;
        const sal = GAME_BALANCE.managerSalaryPerCycle;
        if (state.gold >= sal) {
          addGold(-sal);
          runManagerAutoDelegation(b, lot);
        } else {
          showToast(`⚠️ 자산 부족으로 [${b.title}] 관리인 급여(${sal}만)가 미지급되어 업무를 일시 중단합니다!`, 'rose');
        }
      }
    }
  }
}

function runManagerAutoDelegation(b, lot) {
  let remainBudget = b.manager.autoBudgetCap;
  let dispatched = false;

  // 1) 쓰레기방 2단계 이상 자동 특수 청소 (위임 예산 한도 내)
  for (const room of b.rooms) {
    if (room.trashStage >= 2 && remainBudget >= GAME_BALANCE.specialCleanCost && state.gold >= GAME_BALANCE.specialCleanCost) {
      addGold(-GAME_BALANCE.specialCleanCost);
      remainBudget -= GAME_BALANCE.specialCleanCost;
      room.trashStage = 0;
      room.trashProgress = 0;
      rebuildRoom3D(room);
      dispatched = true;
    }
  }

  // 2) 층간소음/불만 위기 세대 자동 중재 케어
  for (const room of b.rooms) {
    if (room.household && room.household.happiness < 55 && remainBudget >= GAME_BALANCE.mediationGiftCost && state.gold >= GAME_BALANCE.mediationGiftCost) {
      addGold(-GAME_BALANCE.mediationGiftCost);
      remainBudget -= GAME_BALANCE.mediationGiftCost;
      room.household.happiness = Math.min(100, room.household.happiness + 26);
      room.evictionCountdown = null;
      rebuildRoom3D(room);
      dispatched = true;
    }
  }

  // 3) 공실에 최소 월세 기준선(minRentFloor) 이상 세대 자동 유치!
  for (const room of b.rooms) {
    if (room.unlocked && !room.household && room.interiorLv >= 1) {
      const mRent = calcRoomRent(room);
      if (mRent >= b.manager.minRentFloor) {
        const eligibleTypes = Object.values(HOUSEHOLD_TYPES).filter((t) => !t.isHoarder && t.maxRent >= mRent);
        if (eligibleTypes.length > 0) {
          const chosen = eligibleTypes[Math.floor(Math.random() * eligibleTypes.length)];
          moveInHousehold(room, chosen.type, Math.min(chosen.maxRent, mRent));
          dispatched = true;
        }
      }
    }
  }

  if (dispatched) {
    triggerManagerDispatchTag(b.lotId);
  }
}

function triggerManagerDispatchTag(lotId) {
  if (managerTagEls[lotId]) managerTagEls[lotId].remove();
  const tag = document.createElement('div');
  tag.className = 'world-tag manager-dispatch-tag';
  tag.textContent = '💡 지배인 출동 완료!';
  dom.careLayer.appendChild(tag);
  managerTagEls[lotId] = tag;
  setTimeout(() => {
    tag.remove();
    delete managerTagEls[lotId];
  }, 2800);
}

// =========================================================
// 8. 3D 이펙트: 하얀 연기(Poof!), 탄성 바운스, 황금 코인 분수, 층간소음 링, 날파리
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

function triggerDropBounce(obj, wx, wy, wz) {
  const baseY = obj.position.y;
  obj.position.y = baseY + 1.8;
  obj.scale.setScalar(0.35);
  activeBounces.push({ obj, baseY, elapsed: 0, duration: 0.65 });
  spawnSmokePoof3D(wx, wy + 0.5, wz, 0xffffff, 8);
  spawnCoinFountain3D(wx, wy + 0.6, wz, 6, true);
}

function spawnSmokePoof3D(wx, wy, wz, colorHex = 0xffffff, count = 7) {
  for (let i = 0; i < count; i++) {
    const puff = new THREE.Mesh(
      GEO.sphere,
      new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.78 })
    );
    puff.scale.setScalar(0.45);
    puff.position.set(wx + (Math.random() - 0.5) * 0.8, wy, wz + (Math.random() - 0.5) * 0.8);
    const a = (Math.PI * 2 * i) / count;
    scene.add(puff);
    activeParticles.push({
      mesh: puff,
      vx: Math.cos(a) * 1.5,
      vy: 1.6 + Math.random() * 1.4,
      vz: Math.sin(a) * 1.5,
      gravity: -0.5,
      floorY: -10,
      life: 0.75
    });
  }
}

function spawnCoinFountain3D(wx, wy, wz, count = 10, isSparkle = false) {
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(
      isSparkle ? new THREE.OctahedronGeometry(0.15, 0) : GEO.coin,
      isSparkle ? new THREE.MeshBasicMaterial({ color: 0xfde047 }) : MAT.coin
    );
    m.position.set(wx, wy, wz);
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.3;
    scene.add(m);
    activeParticles.push({
      mesh: m,
      vx: Math.cos(a) * 1.8,
      vy: 4.2 + Math.random() * 2.5,
      vz: Math.sin(a) * 1.8,
      gravity: 12.5,
      floorY: Math.max(0.25, wy - 0.8),
      life: 1.25
    });
  }
}

function spawnNoiseShockwave(wx, wy, wz) {
  const ring = new THREE.Mesh(
    GEO.ring,
    new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.88, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(wx, wy, wz);
  scene.add(ring);
  shockwaveRings.push({ mesh: ring, life: 0.75, maxLife: 0.75 });
}

function ensureOdorFlies(room, lot) {
  if (odorEmitters[room.id]) return;
  const fg = new THREE.Group();
  fg.position.set(lot.x + room.lx + 0.4, room.ly + 1.05, lot.z + room.lz + 0.8);
  const flyMat = new THREE.MeshBasicMaterial({ color: 0x18181b });
  for (let i = 0; i < 5; i++) {
    const fly = new THREE.Mesh(GEO.sphere, flyMat);
    fly.scale.setScalar(0.08);
    const a = (Math.PI * 2 * i) / 5;
    fly.position.set(Math.cos(a) * 0.45, (i % 2) * 0.2, Math.sin(a) * 0.45);
    fg.add(fly);
  }
  scene.add(fg);
  odorEmitters[room.id] = fg;
}

function clearOdorFlies(roomId) {
  if (odorEmitters[roomId]) {
    scene.remove(odorEmitters[roomId]);
    delete odorEmitters[roomId];
  }
}

// =========================================================
// 9. 호실 클로즈업(Camera Lerp Focus) & 우측 액션 패널 & 강제 퇴거 도장 연출
// =========================================================
function focusCameraOnRoom(roomId) {
  const room = findRoom(roomId);
  if (!room) return;
  const lot = getLot(room.lotId);
  focusedRoomId = roomId;

  // 카메라가 해당 호실 정면 앞으로 부드럽게 줌인·포커스 이동 (X-Ray 자동 투명화 발동!)
  const off = CAM_OFFSETS[camAzimuth].clone().normalize().multiplyScalar(19.5);
  const tx = lot.x + room.lx + 1.1; // 우측 컴팩트 패널 여백 확보
  const ty = room.ly + 0.8;
  const tz = lot.z + room.lz;

  camTween.look.set(tx, ty, tz);
  camTween.pos.set(tx + off.x, ty + off.y * 0.75, tz + off.z);
  camTween.zoom = 2.08;
  camTween.active = true;

  dom.roomFocusPanel.classList.remove('hidden');
  renderFocusedRoomDrawer();
}

function focusCameraOnLot(lotId, zoomLv = 1.35) {
  const lot = getLot(lotId);
  if (!lot) return;
  focusedRoomId = null;
  dom.roomFocusPanel.classList.add('hidden');

  const off = CAM_OFFSETS[camAzimuth];
  camTween.look.set(lot.x, 2.5, lot.z);
  camTween.pos.set(lot.x + off.x, 2.5 + off.y, lot.z + off.z);
  camTween.zoom = zoomLv;
  camTween.active = true;
}

function resetOverviewCamera() {
  focusedRoomId = null;
  dom.roomFocusPanel.classList.add('hidden');
  const off = CAM_OFFSETS[camAzimuth];
  camTween.look.copy(OVERVIEW_LOOK);
  camTween.pos.copy(OVERVIEW_LOOK).add(off);
  camTween.zoom = 0.88;
  camTween.active = true;
}

function renderFocusedRoomDrawer() {
  const room = findRoom(focusedRoomId);
  if (!room) {
    dom.roomFocusPanel.classList.add('hidden');
    return;
  }
  const b = state.buildings[room.lotId];
  const lot = getLot(room.lotId);
  const tier = ROOM_INTERIOR_TIERS[room.interiorLv];
  const nextTier = ROOM_INTERIOR_TIERS[room.interiorLv + 1];
  const mRent = calcRoomRent(room);

  dom.rfTitle.textContent = `🏠 ${b.title} · ${room.name}`;
  dom.rfTierBadge.textContent = `Lv.${room.interiorLv}`;

  if (!room.unlocked) {
    dom.rfBody.innerHTML = `
      <div class="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 text-center space-y-2">
        <div class="font-jua text-base text-amber-950">🔒 미개방 호실입니다</div>
        <button id="rf-btn-unlock" class="jelly-btn-amber w-full py-2 font-jua text-sm">
          분양 오픈하기 (💰${room.unlockCost}만)
        </button>
      </div>`;
    document.getElementById('rf-btn-unlock').onclick = () => {
      if (state.gold < room.unlockCost) { showToast('💸 자산이 부족합니다!', 'rose'); return; }
      addGold(-room.unlockCost);
      room.unlocked = true;
      rebuildRoom3D(room);
      triggerDropBounce(lot3D[room.lotId].roomGroups[room.id], lot.x + room.lx, room.ly, lot.z + room.lz);
      renderFocusedRoomDrawer();
      saveState();
    };
    return;
  }

  let hhHtml = '';
  if (!room.household) {
    hhHtml = `
      <div class="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-3 space-y-2">
        <div class="font-jua text-sm text-emerald-950">🏡 현재 공실 (적정 월세 ${mRent}만원)</div>
        <p class="text-[11px] text-stone-600">세대 유형별로 방 내부 3D 가구 배치와 소음·위생 특성이 달라집니다!</p>
        <button id="rf-btn-recruit" class="jelly-btn-mint w-full py-2 font-jua text-sm">📱 입주 세대 선택하기</button>
      </div>`;
  } else {
    const h = room.household;
    const hDef = HOUSEHOLD_TYPES[h.type];
    const paid = getEffectiveRent(room);

    hhHtml = `
      <div class="bg-white border-2 ${room.evictionCountdown !== null || room.trashStage >= 2 ? 'border-rose-400 bg-rose-50/40' : 'border-amber-300'} rounded-2xl p-3 space-y-2">
        <div class="flex items-center justify-between">
          <span class="font-jua text-sm text-amber-950">${hDef.icon} ${h.familyName} <span class="text-[11px] text-stone-500">(${hDef.label})</span></span>
          <span class="font-jua text-xs text-emerald-700">+${paid}만/${room.cycleSec}s</span>
        </div>

        <div>
          <div class="flex justify-between text-[11px] font-bold">
            <span>💖 만족도 ${Math.round(h.happiness)}%</span>
            ${room.evictionCountdown !== null ? `<span class="text-rose-600 animate-pulse">🚨 이사 고민 D-${Math.ceil(room.evictionCountdown)}s</span>` : ''}
          </div>
          <div class="mini-bar-track"><div class="mini-bar-fill" style="width:${h.happiness}%"></div></div>
        </div>

        ${hDef.isHoarder ? `
          <div class="bg-purple-50 border border-purple-300 rounded-xl p-2 space-y-1.5">
            <div class="font-jua text-xs text-purple-950">🗑️ 쓰레기 누적: ${room.trashStage}/3단계 ${room.trashStage >= 2 ? '🤢(이웃 악취 피해중!)' : ''}</div>
            <button id="rf-btn-clean" class="jelly-btn-sky w-full py-1.5 font-jua text-xs">
              🧹 강제 특수 청소 & 경고장 (💰${GAME_BALANCE.specialCleanCost}만)
            </button>
          </div>
        ` : ''}

        ${room.activeConflict === 'noise' || (!room.soundproofed && hDef.noiseOutput >= 40) ? `
          <button id="rf-btn-soundproof" class="jelly-btn-amber w-full py-1.5 font-jua text-xs">
            🔨 층간 방음 시공하기 (💰${GAME_BALANCE.soundproofCost}만)
          </button>
        ` : ''}

        <div class="grid grid-cols-2 gap-1.5 pt-1">
          <button id="rf-btn-gift" class="jelly-btn-white py-1.5 font-jua text-[11px]">🎁 중재선물 (${GAME_BALANCE.mediationGiftCost}만)</button>
          <button id="rf-btn-relocate" class="jelly-btn-white py-1.5 font-jua text-[11px]">🔄 빈방 이사권유</button>
        </div>

        <button id="rf-btn-evict" class="jelly-btn-rose w-full py-2 font-jua text-xs mt-1">
          🚨 계약 해지 및 내쫓기 (강제 퇴거)
        </button>
      </div>`;
  }

  const remodelHtml = `
    <div class="bg-white border-2 border-amber-200 rounded-2xl p-3 space-y-2">
      <div class="flex items-center justify-between">
        <span class="font-jua text-xs text-amber-950">🛠️ 인테리어: ${tier.name}</span>
        ${room.soundproofed ? '<span class="text-[10px] bg-sky-100 text-sky-800 px-2 rounded-full font-jua">방음완료</span>' : ''}
      </div>
      <div class="text-[11px] text-stone-600">${nextTier ? `다음 단계: ${nextTier.name} (월세 +${nextTier.rentAdd - tier.rentAdd}만)` : '👑 최고급 로얄 부티크 완성!'}</div>
      ${nextTier ? `
        <button id="rf-btn-upgrade" class="jelly-btn-amber w-full py-2 font-jua text-xs">
          ⬆️ Lv.${room.interiorLv + 1} 리모델링 시공 (💰${nextTier.cost}만)
        </button>
      ` : ''}
    </div>`;

  dom.rfBody.innerHTML = hhHtml + remodelHtml;

  // 액션 버튼 이벤트 바인딩
  const recBtn = document.getElementById('rf-btn-recruit');
  if (recBtn) recBtn.onclick = () => openRecruitModal(room);

  const upBtn = document.getElementById('rf-btn-upgrade');
  if (upBtn && nextTier) {
    upBtn.onclick = () => {
      if (state.gold < nextTier.cost) { showToast('💸 시공 비용이 부족합니다!', 'rose'); return; }
      addGold(-nextTier.cost);
      room.interiorLv += 1;
      if (room.household) room.household.happiness = Math.min(100, room.household.happiness + 18);
      rebuildRoom3D(room);
      triggerDropBounce(lot3D[room.lotId].roomGroups[room.id], lot.x + room.lx, room.ly, lot.z + room.lz);
      showToast(`✨ ${room.name} [${nextTier.name}] 시공 완료!`, 'emerald');
      renderFocusedRoomDrawer();
      saveState();
    };
  }

  const cleanBtn = document.getElementById('rf-btn-clean');
  if (cleanBtn) {
    cleanBtn.onclick = () => executeSpecialClean(room);
  }

  const spBtn = document.getElementById('rf-btn-soundproof');
  if (spBtn) {
    spBtn.onclick = () => {
      if (state.gold < GAME_BALANCE.soundproofCost) { showToast('💸 방음 시공비가 부족합니다!', 'rose'); return; }
      addGold(-GAME_BALANCE.soundproofCost);
      room.soundproofed = true;
      state.stats.crisisResolved += 1;
      spawnSmokePoof3D(lot.x + room.lx, room.ly + 0.6, lot.z + room.lz, 0xffffff, 9);
      showToast(`🔨 ${room.name} 층간 방음 시공 완료! 이제 층간소음이 완벽 차단됩니다.`, 'emerald');
      renderFocusedRoomDrawer();
      saveState();
    };
  }

  const giftBtn = document.getElementById('rf-btn-gift');
  if (giftBtn) {
    giftBtn.onclick = () => {
      if (state.gold < GAME_BALANCE.mediationGiftCost) { showToast('💸 비용이 부족합니다!', 'rose'); return; }
      addGold(-GAME_BALANCE.mediationGiftCost);
      room.household.happiness = Math.min(100, room.household.happiness + 30);
      room.evictionCountdown = null;
      state.stats.crisisResolved += 1;
      rebuildRoom3D(room);
      showToast(`🎁 ${room.name} 세대에 프리미엄 과일 바구니를 보내 만족도가 크게 회복됐습니다!`, 'emerald');
      renderFocusedRoomDrawer();
      saveState();
    };
  }

  const relocBtn = document.getElementById('rf-btn-relocate');
  if (relocBtn) {
    relocBtn.onclick = () => relocateHouseholdToVacant(room);
  }

  const evictBtn = document.getElementById('rf-btn-evict');
  if (evictBtn) {
    evictBtn.onclick = () => executeDramaticEviction(room);
  }
}

// 🧹 강제 특수 청소 & 경고장 발송
function executeSpecialClean(room) {
  if (state.gold < GAME_BALANCE.specialCleanCost) {
    showToast(`💸 특수 청소 비용(${GAME_BALANCE.specialCleanCost}만)이 부족합니다!`, 'rose');
    return;
  }
  const lot = getLot(room.lotId);
  addGold(-GAME_BALANCE.specialCleanCost);
  room.trashStage = 0;
  room.trashProgress = 0;
  clearOdorFlies(room.id);
  state.stats.crisisResolved += 1;

  rebuildRoom3D(room);
  spawnSmokePoof3D(lot.x + room.lx, room.ly + 0.7, lot.z + room.lz, 0xffffff, 12);
  spawnCoinFountain3D(lot.x + room.lx, room.ly + 0.9, lot.z + room.lz, 8, true);

  showRoomSpeech(room, HOUSEHOLD_TYPES.hikikomori.cleanedGrumbleQuote, true, 4.5);
  showToast(`🧹 특수 청소 완료! 쓰레기산을 싹 치우고 경고장을 발송했습니다!`, 'emerald');
  if (focusedRoomId === room.id) renderFocusedRoomDrawer();
  if (!dom.notebookModal.classList.contains('hidden')) renderNotebookSplitView();
  saveState();
}

// 🚨 단호한 강제 퇴거 조치 ("쾅! 강제 퇴거 명령" 도장 + 퇴거 행진 + 특수 청소 복구!)
function executeDramaticEviction(room) {
  if (!room.household) return;
  const lot = getLot(room.lotId);
  const evictedType = room.household.type;
  const evictedName = room.household.familyName;

  // 1) 화면 중앙 단호한 붉은 퇴거 도장 애니메이션!
  dom.evictionOverlay.classList.remove('hidden');
  dom.evictionStampBox.classList.remove('eviction-stamp-slam');
  void dom.evictionStampBox.offsetWidth;
  dom.evictionStampBox.classList.add('eviction-stamp-slam');
  setTimeout(() => dom.evictionOverlay.classList.add('hidden'), 1500);

  // 2) 건물 정문 밖으로 짐 싸서 투덜거리며 쫓겨나는 3D 퇴거 캐릭터 연출!
  const outMesh = createChibiPerson3D(evictedType === 'hikikomori' ? 'hikikomori' : 'student');
  outMesh.position.set(lot.x, 0.25, lot.z + 3.8);
  const bag = new THREE.Mesh(GEO.box, MAT.movingBox);
  bag.scale.set(0.38, 0.34, 0.34);
  bag.position.set(0.3, 0.45, 0.15);
  outMesh.add(bag);
  scene.add(outMesh);

  let walkT = 0;
  const walkInt = setInterval(() => {
    walkT += 0.04;
    outMesh.position.z += 0.18;
    outMesh.position.y = 0.25 + Math.abs(Math.sin(walkT * 12)) * 0.12;
    if (walkT >= 2.2) {
      clearInterval(walkInt);
      scene.remove(outMesh);
    }
  }, 30);

  // 3) 특수 청소부 하얀 연기 Poof & 방 완전 초기화 복구!
  room.household = null;
  room.trashStage = 0;
  room.trashProgress = 0;
  room.evictionCountdown = null;
  room.activeConflict = null;
  room.rentTimer = 0;
  clearOdorFlies(room.id);

  state.stats.evictions += 1;
  state.stats.crisisResolved += 1;

  rebuildRoom3D(room);
  syncBuildingResidents3D(room.lotId);
  spawnSmokePoof3D(lot.x + room.lx, room.ly + 0.8, lot.z + room.lz, 0xffffff, 14);

  showToast(`🚨 [${room.name}] ${evictedName} 강제 퇴거 및 특수 청소 원상복구 완료!`, 'amber');
  if (focusedRoomId === room.id) renderFocusedRoomDrawer();
  if (!dom.notebookModal.classList.contains('hidden')) renderNotebookSplitView();
  saveState();
}

function relocateHouseholdToVacant(room) {
  const b = state.buildings[room.lotId];
  const vacant = b.rooms.find((r) => r.unlocked && !r.household && r.id !== room.id);
  if (!vacant) {
    showToast('⚠️ 같은 건물 내에 이사 갈 수 있는 빈 호실이 없습니다! 다른 호실을 먼저 오픈하세요.', 'rose');
    return;
  }
  if (state.gold < GAME_BALANCE.relocateCost) {
    showToast('💸 이사 지원금이 부족합니다!', 'rose');
    return;
  }
  addGold(-GAME_BALANCE.relocateCost);
  vacant.household = room.household;
  vacant.household.happiness = Math.min(100, vacant.household.happiness + 20);
  vacant.trashStage = room.trashStage;
  room.household = null;
  room.trashStage = 0;
  room.evictionCountdown = null;
  clearOdorFlies(room.id);
  state.stats.crisisResolved += 1;

  rebuildRoom3D(room);
  rebuildRoom3D(vacant);
  syncBuildingResidents3D(room.lotId);
  focusCameraOnRoom(vacant.id);
  showToast(`🔄 ${vacant.household.familyName} 세대를 [${vacant.name}]로 쾌적하게 재배치했습니다!`, 'emerald');
  saveState();
}

// =========================================================
// 10. 우측 하단 통합 FAB & 2단 화면 분할(Split-View) 관리 모달 렌더링
// =========================================================
function openNotebookModal(tab = null) {
  if (tab) activeNotebookTab = tab;
  selectedSplitItemId = null;
  dom.notebookModal.classList.remove('hidden');
  renderNotebookSplitView();
}

function renderNotebookSplitView() {
  // 탭 버튼 활성화 스타일
  document.querySelectorAll('.ntab-btn').forEach((btn) => {
    const isAct = btn.dataset.ntab === activeNotebookTab;
    btn.className = `ntab-btn ${isAct ? 'jelly-btn-amber' : 'jelly-btn-white'} py-2 px-2 text-xs font-jua flex items-center justify-center gap-1 relative`;
  });

  // 탭 1: 🎯 퀘스트 & 업적
  if (activeNotebookTab === 'quests') {
    if (!selectedSplitItemId) selectedSplitItemId = QUEST_LIST[0].id;
    dom.splitLeftList.innerHTML = QUEST_LIST.map((q, idx) => {
      const claimed = state.claimedQuests.includes(q.id);
      const ready = !claimed && q.check(state);
      const sel = selectedSplitItemId === q.id;
      return `
        <button data-qid="${q.id}" class="split-item w-full text-left p-2.5 rounded-2xl border-2 transition ${
          sel ? 'bg-amber-200/80 border-amber-800' : 'bg-white/90 border-amber-200 hover:border-amber-400'
        }">
          <div class="flex items-center justify-between text-[11px] font-jua">
            <span class="text-amber-900">미션 ${idx + 1}</span>
            <span class="${claimed ? 'text-stone-400' : ready ? 'text-emerald-700 animate-pulse' : 'text-amber-700'}">
              ${claimed ? '✅ 완료됨' : ready ? '🎁 수령 가능!' : `+${q.reward}만`}
            </span>
          </div>
          <div class="font-jua text-xs text-amber-950 truncate mt-0.5">${q.title}</div>
        </button>`;
    }).join('');

    const curQ = QUEST_LIST.find((x) => x.id === selectedSplitItemId) || QUEST_LIST[0];
    const claimed = state.claimedQuests.includes(curQ.id);
    const ready = !claimed && curQ.check(state);
    const doneCount = state.claimedQuests.length;

    dom.splitRightDetail.innerHTML = `
      <div class="space-y-4">
        <div class="bg-amber-100/80 border-2 border-amber-300 rounded-2xl p-3.5">
          <div class="flex justify-between font-jua text-xs text-amber-900">
            <span>타운 마스터 달성률</span>
            <span>${doneCount} / ${QUEST_LIST.length} (${Math.round((doneCount / QUEST_LIST.length) * 100)}%)</span>
          </div>
          <div class="mini-bar-track h-2.5 mt-1.5"><div class="mini-bar-fill" style="width:${(doneCount / QUEST_LIST.length) * 100}%"></div></div>
        </div>

        <div class="bg-white border-2 border-amber-300 rounded-3xl p-5 space-y-3 shadow-sm">
          <span class="font-jua text-xs bg-emerald-100 text-emerald-800 border border-emerald-400 px-3 py-0.5 rounded-full">🎁 보상 지원금 +${curQ.reward.toLocaleString()}만원</span>
          <h3 class="font-jua text-lg text-amber-950">${curQ.title}</h3>
          <p class="text-sm text-stone-600 leading-relaxed">${curQ.desc}</p>

          <div class="flex gap-2 pt-2">
            ${ready ? `
              <button id="sp-claim-q" class="jelly-btn-mint flex-1 py-3 font-jua text-sm">🎉 보상 +${curQ.reward}만원 즉시 수령!</button>
            ` : claimed ? `
              <div class="flex-1 text-center py-2.5 rounded-2xl bg-stone-100 text-stone-500 font-jua text-sm">✅ 이미 수령한 업적입니다</div>
            ` : `
              <button id="sp-go-q" class="jelly-btn-sky flex-1 py-2.5 font-jua text-sm">🔍 해당 위치로 이동해 진행하기</button>
            `}
          </div>
        </div>
      </div>`;

    dom.splitLeftList.querySelectorAll('.split-item').forEach((b) => {
      b.onclick = () => { selectedSplitItemId = b.dataset.qid; renderNotebookSplitView(); };
    });
    const claimB = document.getElementById('sp-claim-q');
    if (claimB) {
      claimB.onclick = () => {
        state.claimedQuests.push(curQ.id);
        addGold(curQ.reward);
        showToast(`🎁 [${curQ.title}] 보상 +${curQ.reward}만원 수령!`, 'emerald');
        renderNotebookSplitView();
        saveState();
      };
    }
    const goB = document.getElementById('sp-go-q');
    if (goB) {
      goB.onclick = () => {
        if (curQ.openTab) { openNotebookModal(curQ.openTab); return; }
        dom.notebookModal.classList.add('hidden');
        if (curQ.focusSubRoom) {
          const rm = state.buildings[curQ.focusLot]?.rooms.find((r) => r.subId === curQ.focusSubRoom);
          if (rm) focusCameraOnRoom(rm.id);
        } else if (curQ.focusLot) {
          focusCameraOnLot(curQ.focusLot, 1.3);
        }
      };
    }
  }

  // 탭 2: 🧑‍🤝‍🧑 세입자 & 문제 세대 관리
  else if (activeNotebookTab === 'tenants') {
    const allRooms = Object.values(state.buildings).flatMap((b) => b.rooms.filter((r) => r.unlocked));
    if (!selectedSplitItemId || !allRooms.some((r) => r.id === selectedSplitItemId)) {
      selectedSplitItemId = allRooms[0]?.id;
    }

    dom.splitLeftList.innerHTML = allRooms.map((r) => {
      const b = state.buildings[r.lotId];
      const h = r.household;
      const hDef = h ? HOUSEHOLD_TYPES[h.type] : null;
      const hasCrisis = h && (r.trashStage >= 2 || r.activeConflict || r.evictionCountdown !== null);
      return `
        <button data-rid="${r.id}" class="split-item w-full text-left p-2.5 rounded-2xl border-2 transition ${
          selectedSplitItemId === r.id ? 'bg-amber-200 border-amber-800' : hasCrisis ? 'bg-rose-50 border-rose-400' : 'bg-white border-amber-200'
        }">
          <div class="flex items-center justify-between font-jua text-xs">
            <span>${b.title.slice(0, 6)} · ${r.name}</span>
            <span>${hasCrisis ? '🚨 분쟁/위기!' : h ? `${hDef.icon} ${Math.round(h.happiness)}%` : '공실'}</span>
          </div>
          <div class="text-[11px] text-stone-600 mt-0.5">${h ? `${h.familyName} (${hDef.label})` : '입주자 모집 가능'}</div>
        </button>`;
    }).join('');

    const curR = allRooms.find((r) => r.id === selectedSplitItemId);
    if (curR) {
      const h = curR.household;
      const hDef = h ? HOUSEHOLD_TYPES[h.type] : null;
      dom.splitRightDetail.innerHTML = h ? `
        <div class="bg-white border-2 border-amber-300 rounded-3xl p-5 space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <span class="font-jua text-lg text-amber-950">${hDef.icon} ${curR.name} · ${h.familyName}</span>
              <span class="ml-2 text-xs font-jua text-white px-2.5 py-0.5 rounded-full" style="background:${hDef.badgeColor}">${hDef.label}</span>
            </div>
            <button id="sp-focus-room" class="jelly-btn-sky px-3 py-1.5 font-jua text-xs">🔍 방 클로즈업 확인</button>
          </div>
          <p class="text-xs text-stone-600 bg-amber-50 p-2.5 rounded-xl border border-amber-200">${hDef.traitDesc}<br/><b>맞춤 가구:</b> ${hDef.furnitureDesc}</p>

          <div class="grid grid-cols-2 gap-3 text-xs">
            <div class="bg-stone-50 p-3 rounded-xl border">만족도: <b class="text-emerald-700">${Math.round(h.happiness)}%</b> ${curR.evictionCountdown !== null ? `<span class="text-rose-600">(퇴거 D-${Math.ceil(curR.evictionCountdown)}s)</span>` : ''}</div>
            <div class="bg-stone-50 p-3 rounded-xl border">위생/갈등: <b>${hDef.isHoarder ? `쓰레기 ${curR.trashStage}/3단계` : curR.activeConflict === 'noise' ? '⚡ 층간소음 피해중' : curR.activeConflict === 'odor' ? '🤢 옆방 악취 피해중' : '쾌적함 ✨'}</b></div>
          </div>

          <div class="flex flex-wrap gap-2 pt-2">
            ${hDef.isHoarder ? `<button id="sp-clean" class="jelly-btn-sky px-4 py-2 font-jua text-xs">🧹 강제 특수청소 & 경고장 (${GAME_BALANCE.specialCleanCost}만)</button>` : ''}
            ${!curR.soundproofed ? `<button id="sp-sound" class="jelly-btn-amber px-4 py-2 font-jua text-xs">🔨 층간 방음 시공 (${GAME_BALANCE.soundproofCost}만)</button>` : ''}
            <button id="sp-reloc" class="jelly-btn-white px-4 py-2 font-jua text-xs">🔄 빈 호실로 이사 권유 (${GAME_BALANCE.relocateCost}만)</button>
            <button id="sp-evict" class="jelly-btn-rose px-4 py-2 font-jua text-xs">🚨 계약 해지 및 내쫓기</button>
          </div>
        </div>
      ` : `
        <div class="bg-white border-2 border-amber-300 rounded-3xl p-6 text-center space-y-3">
          <div class="font-jua text-lg text-amber-950">${curR.name}은 현재 공실입니다</div>
          <button id="sp-rec-now" class="jelly-btn-mint px-6 py-2.5 font-jua text-sm">📱 세대 모집하기</button>
        </div>`;

      dom.splitLeftList.querySelectorAll('.split-item').forEach((b) => {
        b.onclick = () => { selectedSplitItemId = b.dataset.rid; renderNotebookSplitView(); };
      });
      const fBtn = document.getElementById('sp-focus-room');
      if (fBtn) fBtn.onclick = () => { dom.notebookModal.classList.add('hidden'); focusCameraOnRoom(curR.id); };
      const cBtn = document.getElementById('sp-clean');
      if (cBtn) cBtn.onclick = () => executeSpecialClean(curR);
      const sBtn = document.getElementById('sp-sound');
      if (sBtn) sBtn.onclick = () => {
        if (state.gold < GAME_BALANCE.soundproofCost) { showToast('💸 비용이 부족합니다!', 'rose'); return; }
        addGold(-GAME_BALANCE.soundproofCost);
        curR.soundproofed = true;
        state.stats.crisisResolved += 1;
        renderNotebookSplitView();
      };
      const rlBtn = document.getElementById('sp-reloc');
      if (rlBtn) rlBtn.onclick = () => { dom.notebookModal.classList.add('hidden'); relocateHouseholdToVacant(curR); };
      const evBtn = document.getElementById('sp-evict');
      if (evBtn) evBtn.onclick = () => { dom.notebookModal.classList.add('hidden'); focusCameraOnRoom(curR.id); setTimeout(() => executeDramaticEviction(curR), 350); };
      const rcBtn = document.getElementById('sp-rec-now');
      if (rcBtn) rcBtn.onclick = () => { dom.notebookModal.classList.add('hidden'); focusCameraOnRoom(curR.id); openRecruitModal(curR); };
    }
  }

  // 탭 3: 👔 전문 관리인(지배인) 고용 & 재무 가이드라인 슬라이더 위임
  else if (activeNotebookTab === 'manager') {
    const bList = Object.values(state.buildings);
    if (!selectedSplitItemId || !state.buildings[selectedSplitItemId]) selectedSplitItemId = bList[0].lotId;
    const curB = state.buildings[selectedSplitItemId];
    const grossRent = calcBuildingGrossCycle(curB);
    const netAfterMgr = grossRent - GAME_BALANCE.managerSalaryPerCycle;

    dom.splitLeftList.innerHTML = bList.map((b) => `
      <button data-bid="${b.lotId}" class="split-item w-full text-left p-3 rounded-2xl border-2 ${
        selectedSplitItemId === b.lotId ? 'bg-amber-200 border-amber-800' : 'bg-white border-amber-200'
      }">
        <div class="font-jua text-xs text-amber-950">${b.title}</div>
        <div class="text-[11px] mt-0.5 ${b.manager.hired ? 'text-emerald-700 font-bold' : 'text-stone-500'}">
          ${b.manager.hired ? '👔 지배인 상주 근무중' : '미고용 (직접 관리)'}
        </div>
      </button>`).join('');

    dom.splitRightDetail.innerHTML = `
      <div class="bg-white border-2 border-amber-300 rounded-3xl p-5 space-y-4">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 class="font-jua text-lg text-amber-950">👔 [${curB.title}] 전문 지배인실</h3>
            <p class="text-xs text-stone-600">선임 시 건물 1층 정문 앞에 3D 관리실 부스와 제복 관리인이 상주하며 청소·중재·입주를 대행합니다.</p>
          </div>
          <button id="sp-toggle-mgr" class="${curB.manager.hired ? 'jelly-btn-rose' : 'jelly-btn-mint'} px-4 py-2 font-jua text-xs">
            ${curB.manager.hired ? '해고하기 (직접 관리 전환)' : `즉시 고용하기 (계약금 ${GAME_BALANCE.managerHireFee}만)`}
          </button>
        </div>

        <div class="p-3.5 rounded-2xl border-2 ${netAfterMgr < 0 ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-emerald-50 border-emerald-300 text-emerald-900'} text-xs space-y-1">
          <div class="font-jua text-sm">📊 지배인 고용 손익분기(ROI) 분석</div>
          <div>현재 건물 주기 매출: <b>+${grossRent}만원</b> | 지배인 고정 급여: <b>-${GAME_BALANCE.managerSalaryPerCycle}만원/주기</b></div>
          <div class="font-bold">${netAfterMgr < 0
            ? `⚠️ 주의: 아직 입주 호실이 적어 고용 시 주기당 ${netAfterMgr}만원 적자(배보다 배꼽이 큼!)가 납니다. 호실을 더 늘린 뒤 고용하면 효율이 극대화됩니다!`
            : `✅ 흑자 구간 달성! 지배인 급여를 제하고도 주기당 +${netAfterMgr}만원 순수익이 발생합니다!`}</div>
        </div>

        <div class="space-y-3 pt-1">
          <div class="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200">
            <div class="flex justify-between font-jua text-xs text-amber-950 mb-1.5">
              <span>💰 최소 월세 수취 기준선 (하한선)</span>
              <span id="lbl-min-rent" class="text-emerald-700">${curB.manager.minRentFloor}만원 이상만 자동계약</span>
            </div>
            <input id="slider-min-rent" type="range" min="40" max="260" step="10" value="${curB.manager.minRentFloor}" class="jelly-slider"/>
          </div>

          <div class="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200">
            <div class="flex justify-between font-jua text-xs text-amber-950 mb-1.5">
              <span>🛠️ 시설/청소 자동 재투자 예산 한도</span>
              <span id="lbl-auto-cap" class="text-sky-700">주기당 최대 ${curB.manager.autoBudgetCap}만원</span>
            </div>
            <input id="slider-auto-cap" type="range" min="0" max="220" step="15" value="${curB.manager.autoBudgetCap}" class="jelly-slider"/>
          </div>
        </div>
      </div>`;

    dom.splitLeftList.querySelectorAll('.split-item').forEach((b) => {
      b.onclick = () => { selectedSplitItemId = b.dataset.bid; renderNotebookSplitView(); };
    });

    document.getElementById('sp-toggle-mgr').onclick = () => {
      if (!curB.manager.hired) {
        if (state.gold < GAME_BALANCE.managerHireFee) { showToast('💸 계약금이 부족합니다!', 'rose'); return; }
        addGold(-GAME_BALANCE.managerHireFee);
        curB.manager.hired = true;
        rebuildPublicInfraAndManager3D(curB.lotId);
        dom.notebookModal.classList.add('hidden');
        focusCameraOnLot(curB.lotId, 1.55);
        showToast(`👔 [${curB.title}] 1층 정문 앞에 관리실 부스와 전문 지배인이 배치되었습니다!`, 'emerald');
      } else {
        curB.manager.hired = false;
        rebuildPublicInfraAndManager3D(curB.lotId);
        showToast(`👔 [${curB.title}] 지배인을 해고하고 직접 관리 체제로 전환했습니다.`, 'amber');
        renderNotebookSplitView();
      }
      saveState();
    };

    document.getElementById('slider-min-rent').oninput = (e) => {
      curB.manager.minRentFloor = Number(e.target.value);
      document.getElementById('lbl-min-rent').textContent = `${curB.manager.minRentFloor}만원 이상만 자동계약`;
    };
    document.getElementById('slider-auto-cap').oninput = (e) => {
      curB.manager.autoBudgetCap = Number(e.target.value);
      document.getElementById('lbl-auto-cap').textContent = `주기당 최대 ${curB.manager.autoBudgetCap}만원`;
    };
  }

  // 탭 4: 🏘️ 건물 공용시설 & 부지 장부
  else if (activeNotebookTab === 'infra') {
    if (!selectedSplitItemId) selectedSplitItemId = state.lots[0].lotId;
    dom.splitLeftList.innerHTML = state.lots.map((l) => {
      const cat = l.devType ? DEVELOPMENT_CATALOG[l.devType] : null;
      return `
        <button data-lid="${l.lotId}" class="split-item w-full text-left p-2.5 rounded-2xl border-2 ${
          selectedSplitItemId === l.lotId ? 'bg-amber-200 border-amber-800' : 'bg-white border-amber-200'
        }">
          <div class="font-jua text-xs text-amber-950">${l.owned ? `${cat.icon} ${l.title}` : `🚩 ${l.name} (미매입)`}</div>
          <div class="text-[11px] text-stone-500">${l.owned ? '운영 중' : `매입비 ${l.landPrice}만`}</div>
        </button>`;
    }).join('');

    const curLot = getLot(selectedSplitItemId) || state.lots[0];
    const curB = state.buildings[curLot.lotId];

    if (!curLot.owned) {
      dom.splitRightDetail.innerHTML = `
        <div class="bg-white border-2 border-amber-300 rounded-3xl p-6 text-center space-y-3">
          <div class="font-jua text-lg text-amber-950">🌱 ${curLot.name} (미개발 부지)</div>
          <p class="text-xs text-stone-600">태양광 발전소, 딸기 도시 농장, 벚꽃 공원, 신규 주상복합을 건설할 수 있습니다.</p>
          <button id="sp-open-dev" class="jelly-btn-mint px-6 py-2.5 font-jua text-sm">🔍 부지로 이동해 개발하기</button>
        </div>`;
      document.getElementById('sp-open-dev').onclick = () => {
        dom.notebookModal.classList.add('hidden');
        focusCameraOnLot(curLot.lotId, 1.2);
        openLotDevModal(curLot.lotId);
      };
    } else if (curB) {
      const infraHtml = Object.values(PUBLIC_INFRA_CATALOG).map((inf) => {
        const installed = curB.infra[inf.key];
        return `
          <div class="bg-amber-50/60 border-2 ${installed ? 'border-emerald-400' : 'border-amber-200'} rounded-2xl p-3 flex flex-col justify-between gap-2">
            <div>
              <div class="flex justify-between font-jua text-sm text-amber-950">
                <span>${inf.icon} ${inf.name}</span>
                <span class="text-xs text-emerald-700">+${inf.rentBonusPct}% 월세</span>
              </div>
              <p class="text-[11px] text-stone-600 mt-1">${inf.desc}</p>
            </div>
            ${installed
              ? '<div class="text-center py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-jua text-xs">✅ 3D 설치 완료</div>'
              : `<button data-ikey="${inf.key}" class="btn-buy-infra jelly-btn-amber py-1.5 font-jua text-xs">설치하기 (💰${inf.cost}만)</button>`}
          </div>`;
      }).join('');

      dom.splitRightDetail.innerHTML = `
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="font-jua text-base text-amber-950">🏘️ [${curB.title}] 공용 인프라 & 1층 상가</h3>
            <button id="sp-go-lot" class="jelly-btn-sky px-3 py-1.5 font-jua text-xs">🔍 위치로 이동</button>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">${infraHtml}</div>
        </div>`;

      document.getElementById('sp-go-lot').onclick = () => {
        dom.notebookModal.classList.add('hidden');
        focusCameraOnLot(curLot.lotId, 1.35);
      };
      dom.splitRightDetail.querySelectorAll('.btn-buy-infra').forEach((btn) => {
        btn.onclick = () => {
          const inf = PUBLIC_INFRA_CATALOG[btn.dataset.ikey];
          if (state.gold < inf.cost) { showToast('💸 비용이 부족합니다!', 'rose'); return; }
          addGold(-inf.cost);
          curB.infra[inf.key] = true;
          rebuildPublicInfraAndManager3D(curB.lotId);
          showToast(`${inf.icon} [${inf.name}] 3D 시공 완료!`, 'emerald');
          renderNotebookSplitView();
          saveState();
        };
      });
    } else {
      const cat = DEVELOPMENT_CATALOG[curLot.devType];
      dom.splitRightDetail.innerHTML = `
        <div class="bg-white border-2 border-amber-300 rounded-3xl p-5 space-y-3">
          <div class="flex items-center justify-between">
            <span class="font-jua text-lg text-amber-950">${cat.icon} ${curLot.title}</span>
            <button id="sp-go-devlot" class="jelly-btn-sky px-3 py-1.5 font-jua text-xs">🔍 위치로 이동</button>
          </div>
          <p class="text-xs text-stone-600">${cat.desc}</p>
          <div class="bg-emerald-50 border border-emerald-300 rounded-xl p-3 font-jua text-sm text-emerald-800">
            ⚡ ${cat.cycleSec}초마다 +${cat.cycleProfit}만원 자동 생산 중 (타운 월세 시너지 +${cat.rentSynergyPct}%)
          </div>
        </div>`;
      document.getElementById('sp-go-devlot').onclick = () => {
        dom.notebookModal.classList.add('hidden');
        focusCameraOnLot(curLot.lotId, 1.4);
      };
    }

    dom.splitLeftList.querySelectorAll('.split-item').forEach((b) => {
      b.onclick = () => { selectedSplitItemId = b.dataset.lid; renderNotebookSplitView(); };
    });
  }
}

// =========================================================
// 11. 세대 입주 모집 모달 & 빈 부지 개발 모달
// =========================================================
function openRecruitModal(room) {
  recruitRoomTarget = room;
  generateRecruitCandidates(room);
  dom.recRoomTitle.textContent = `${state.buildings[room.lotId].title} · ${room.name}`;
  renderRecruitCards();
  dom.recruitModal.classList.remove('hidden');
}

function generateRecruitCandidates() {
  const keys = Object.keys(HOUSEHOLD_TYPES);
  const shuffled = [...keys].sort(() => Math.random() - 0.5).slice(0, 3);
  // 히키코모리도 자주 등장해 재미있는 딜레마를 주도록 보장!
  if (!shuffled.includes('hikikomori') && Math.random() < 0.55) {
    shuffled[2] = 'hikikomori';
  }
  recruitCandidates = shuffled.map((k) => {
    const def = HOUSEHOLD_TYPES[k];
    const budget = Math.floor(def.minRent + Math.random() * (def.maxRent - def.minRent + 1));
    const fam = FAMILY_LAST_NAMES[Math.floor(Math.random() * FAMILY_LAST_NAMES.length)] +
      GIVEN_NAMES[Math.floor(Math.random() * GIVEN_NAMES.length)];
    return { type: k, familyName: `${fam} 세대`, budget, def };
  });
}

function renderRecruitCards() {
  const room = recruitRoomTarget;
  const mRent = calcRoomRent(room);
  dom.recCardsGrid.innerHTML = recruitCandidates.map((c, idx) => `
    <div class="bg-white rounded-3xl border-2 ${c.type === 'hikikomori' ? 'border-purple-400' : 'border-amber-300'} p-4 flex flex-col justify-between gap-3 shadow-sm">
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="font-jua text-base text-amber-950">${c.def.icon} ${c.familyName}</span>
          <span class="font-jua text-[11px] text-white px-2.5 py-0.5 rounded-full" style="background:${c.def.badgeColor}">${c.def.label} (${c.def.memberCount}인)</span>
        </div>
        <div class="bg-amber-50/80 rounded-xl p-2.5 text-xs space-y-1 border border-amber-200">
          <div class="flex justify-between"><span>지불 가능 한도</span><b class="font-jua text-emerald-700">최대 ${c.budget}만원</b></div>
          <div class="text-[11px] text-rose-800 font-medium">⚡ ${c.def.traitDesc}</div>
          <div class="text-[11px] text-stone-600">🛋️ ${c.def.furnitureDesc}</div>
        </div>
      </div>
      <button data-cidx="${idx}" class="btn-sign-hh jelly-btn-mint w-full py-2.5 font-jua text-xs">
        ✍️ 입주 계약 체결 (주기당 +${Math.min(mRent, c.budget)}만)
      </button>
    </div>`).join('');

  dom.recCardsGrid.querySelectorAll('.btn-sign-hh').forEach((btn) => {
    btn.onclick = () => {
      const c = recruitCandidates[Number(btn.dataset.cidx)];
      moveInHousehold(room, c.type, c.budget, c.familyName);
      dom.recruitModal.classList.add('hidden');
      focusCameraOnRoom(room.id);
    };
  });
}

function moveInHousehold(room, typeKey, budget, customName = null) {
  const lot = getLot(room.lotId);
  const fam = customName || `${FAMILY_LAST_NAMES[Math.floor(Math.random() * FAMILY_LAST_NAMES.length)]}씨네`;
  room.household = {
    type: typeKey,
    familyName: fam,
    maxBudget: budget,
    happiness: 86
  };
  room.rentTimer = room.cycleSec * 0.5;
  room.trashStage = typeKey === 'hikikomori' ? 1 : 0;
  room.trashProgress = 0;
  room.evictionCountdown = null;

  rebuildRoom3D(room);
  syncBuildingResidents3D(room.lotId);
  triggerDropBounce(lot3D[room.lotId].roomGroups[room.id], lot.x + room.lx, room.ly, lot.z + room.lz);
  showToast(`🏡 [${room.name}]에 ${HOUSEHOLD_TYPES[typeKey].label} (${fam}) 입주 완료! 맞춤형 가구가 배치되었습니다!`, 'emerald');
  saveState();
}

function openLotDevModal(lotId) {
  const lot = getLot(lotId);
  if (!lot || lot.owned) return;
  devModalLotId = lotId;
  dom.devLotBadge.textContent = `${lot.name} (토지비 ${lot.landPrice}만)`;

  const devKeys = ['solar_plant', 'urban_farm', 'sakura_park', 'bakery_cafe', 'mixed_2'];
  dom.devCardsGrid.innerHTML = devKeys.map((k) => {
    const cat = DEVELOPMENT_CATALOG[k];
    const total = lot.landPrice + cat.buildCost;
    const ok = state.gold >= total;
    return `
      <div class="bg-white rounded-3xl border-2 ${ok ? 'border-emerald-400' : 'border-stone-200'} p-4 flex flex-col justify-between gap-3">
        <div>
          <div class="flex justify-between items-center">
            <span class="font-jua text-base text-amber-950">${cat.icon} ${cat.name}</span>
            <span class="font-jua text-[11px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">시너지 +${cat.rentSynergyPct}%</span>
          </div>
          <p class="text-xs text-stone-600 mt-1.5">${cat.desc}</p>
        </div>
        <button data-dtype="${k}" class="btn-build-dev ${ok ? 'jelly-btn-mint' : 'bg-stone-200 text-stone-400 rounded-2xl'} w-full py-2.5 font-jua text-xs">
          🏗️ 개발 착공 (총 💰${total.toLocaleString()}만)
        </button>
      </div>`;
  }).join('');

  dom.devCardsGrid.querySelectorAll('.btn-build-dev').forEach((btn) => {
    btn.onclick = () => {
      const k = btn.dataset.dtype;
      const cat = DEVELOPMENT_CATALOG[k];
      const total = lot.landPrice + cat.buildCost;
      if (state.gold < total) { showToast('💸 개발 자금이 부족합니다!', 'rose'); return; }

      addGold(-total);
      lot.owned = true;
      lot.devType = k;
      lot.title = cat.name;

      if (cat.isResidential) {
        state.buildings[lotId] = makeResidentialBuilding(lotId, k, cat.name);
      } else {
        state.developments[lotId] = { lotId, devType: k, timer: 0, cropStage: 0 };
      }

      dom.lotDevModal.classList.add('hidden');
      refreshLot3D(lotId);
      triggerDropBounce(lot3D[lotId].root, lot.x, 0.4, lot.z);
      rebuildStaticOverlayDOM();
      focusCameraOnLot(lotId, 1.25);
      showToast(`🎊 [${lot.name}]에 ${cat.icon} ${cat.name} 완공!!`, 'emerald');
      saveState();
    };
  });

  dom.lotDevModal.classList.remove('hidden');
}

// =========================================================
// 12. 경제 계산 · 줌 연동 원거리/근거리 오버레이 · 메인 루프
// =========================================================
function getLot(lotId) {
  return state.lots.find((l) => l.lotId === lotId);
}

function findRoom(roomId) {
  for (const b of Object.values(state.buildings)) {
    const r = b.rooms.find((x) => x.id === roomId);
    if (r) return r;
  }
  return null;
}

function calcGlobalSynergyPct() {
  let pct = 0;
  for (const l of state.lots) {
    if (l.owned && l.devType) {
      pct += DEVELOPMENT_CATALOG[l.devType]?.rentSynergyPct || 0;
    }
  }
  return pct;
}

function calcRoomRent(room) {
  const b = state.buildings[room.lotId];
  const tier = ROOM_INTERIOR_TIERS[room.interiorLv || 0];
  let rent = room.baseRent + tier.rentAdd;
  if (room.interiorLv >= 3) rent = Math.round(rent * 1.25);

  let bonusPct = calcGlobalSynergyPct();
  if (b) {
    for (const [k, installed] of Object.entries(b.infra)) {
      if (installed) bonusPct += PUBLIC_INFRA_CATALOG[k].rentBonusPct;
    }
  }
  return Math.round(rent * (1 + bonusPct / 100));
}

function getEffectiveRent(room) {
  if (!room.unlocked || !room.household) return 0;
  return Math.min(calcRoomRent(room), room.household.maxBudget);
}

function calcBuildingGrossCycle(b) {
  let sum = 28; // 1층 24H 마트 & 워시퐁 기본 상가 매출
  for (const r of b.rooms) sum += getEffectiveRent(r);
  return sum;
}

function tickEconomy(dt) {
  let anyPending = false;

  // 1) 주상복합 건물 호실별 & 상가 수익
  for (const b of Object.values(state.buildings)) {
    const lot = getLot(b.lotId);
    for (const r of b.rooms) {
      if (!r.unlocked || !r.household) continue;
      r.rentTimer += dt;
      if (r.rentTimer >= r.cycleSec) {
        r.rentTimer = 0;
        const rent = getEffectiveRent(r);
        if (camera.zoom >= 1.35) {
          addGold(rent);
          spawnCoinFountain3D(lot.x + r.lx, r.ly + 0.5, lot.z + r.lz, 8);
          spawnFloatText(lot.x + r.lx, r.ly + 1.8, lot.z + r.lz, `🪙 +${rent}만!`);
        } else {
          b.pendingCoins += rent;
        }
      }
    }

    b.shopCycleTimer += dt;
    if (b.shopCycleTimer >= 11) {
      b.shopCycleTimer = 0;
      addGold(28);
      if (camera.zoom >= 1.2) {
        spawnFloatText(lot.x, 2.5, lot.z + 3.2, '🏪 상가 +28만!');
      }
    }
    if (b.pendingCoins > 0) anyPending = true;
  }

  // 2) 태양광 발전소 / 딸기 도시 농장(3단계 성장!) / 공원 / 카페 수익
  for (const dev of Object.values(state.developments)) {
    const cat = DEVELOPMENT_CATALOG[dev.devType];
    const lot = getLot(dev.lotId);
    dev.timer += dt;

    // 딸기 도시농장 3단계 작물 성장 시각 변화 (씨앗 -> 새싹 -> 빨간 딸기!)
    if (dev.devType === 'urban_farm' && lot3D[dev.lotId]) {
      const ratio = dev.timer / cat.cycleSec;
      const stage = ratio < 0.35 ? 0 : ratio < 0.72 ? 1 : 2;
      lot3D[dev.lotId].cropMeshes.forEach(({ sprout, berry }) => {
        sprout.visible = stage >= 1;
        sprout.scale.setScalar(stage === 1 ? 0.32 : 0.48);
        berry.visible = stage >= 2;
      });
    }

    if (dev.timer >= cat.cycleSec) {
      dev.timer = 0;
      addGold(cat.cycleProfit);
      spawnCoinFountain3D(lot.x, 1.8, lot.z, 8);
      spawnFloatText(lot.x, 3.2, lot.z, `${cat.icon} +${cat.cycleProfit}만!`);
    }
  }

  dom.btnCollectAll.classList.toggle('hidden', !anyPending);
}

function showRoomSpeech(room, text, isComplaint = false, duration = 3.8) {
  if (speechEls[room.id]) speechEls[room.id].remove();
  const lot = getLot(room.lotId);
  const el = document.createElement('div');
  el.className = `world-tag zoom-speech-bubble ${isComplaint ? 'complaint' : ''}`;
  el.textContent = text;
  if (lot) {
    const pt = project(lot.x + room.lx, room.ly + 1.65, lot.z + room.lz + 0.4);
    el.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
  }
  dom.speechLayer.appendChild(el);
  speechEls[room.id] = el;
  setTimeout(() => {
    if (speechEls[room.id] === el) {
      el.remove();
      delete speechEls[room.id];
    }
  }, duration * 1000);
}

function tickChibiAndPets(dt) {
  // 방 안 가족/히키코모리 뒤뚱뒤뚱 이동 + 근거리(Zoom In) 순차 현실 말풍선!
  for (const list of Object.values(residentActors)) {
    list.forEach((ac, idx) => {
      const dx = ac.tx - ac.cx;
      const dz = ac.tz - ac.cz;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.06) {
        ac.phase += dt * 12;
        ac.cx += (dx / dist) * (ac.isHoarder ? 1.1 : 1.9) * dt;
        ac.cz += (dz / dist) * (ac.isHoarder ? 1.1 : 1.9) * dt;
        ac.mesh.rotation.y = Math.atan2(dx, dz);
        ac.mesh.position.set(ac.cx, ac.room.ly + Math.abs(Math.sin(ac.phase)) * 0.08, ac.cz);
      } else {
        ac.mesh.position.set(ac.cx, ac.room.ly, ac.cz);
        ac.timer -= dt;
        if (ac.timer <= 0) {
          ac.timer = 2.8 + Math.random() * 3.0;
          const rx = ac.isHoarder ? 0.6 : 1.6;
          ac.tx = ac.room.lx + (Math.random() - 0.5) * rx * 2;
          ac.tz = ac.room.lz + (Math.random() - 0.5) * 2.2;

          // 줌인 상태일 때 현재 상태(만족/층간소음/악취/히키코모리 혼잣말)에 맞는 현실 말풍선 팝업!
          if (idx === 0 && camera.zoom >= 1.32 && !speechEls[ac.room.id] && Math.random() < 0.45) {
            const r = ac.room;
            const def = HOUSEHOLD_TYPES[r.household.type];
            let line = def.happyQuotes[Math.floor(Math.random() * def.happyQuotes.length)];
            let bad = false;
            if (r.activeConflict === 'odor' && def.odorVictimQuotes) {
              line = def.odorVictimQuotes[0];
              bad = true;
            } else if (r.activeConflict === 'noise' && def.noiseVictimQuotes) {
              line = def.noiseVictimQuotes[0];
              bad = true;
            } else if (r.activeConflict === 'infra' && def.infraQuotes) {
              line = def.infraQuotes[0];
              bad = true;
            }
            showRoomSpeech(r, line, bad, 3.6);
          }
        }
      }
    });
  }

  // 시바견, 비숑, 치즈냥이 총총 산책
  petActors.forEach((p) => {
    const dx = p.tx - p.mesh.position.x;
    const dz = p.tz - p.mesh.position.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.08) {
      p.phase += dt * 14;
      p.mesh.position.x += (dx / d) * 1.8 * dt;
      p.mesh.position.z += (dz / d) * 1.8 * dt;
      p.mesh.position.y = 0.22 + Math.abs(Math.sin(p.phase)) * 0.08;
      p.mesh.rotation.y = Math.atan2(dx, dz);
    } else {
      p.timer -= dt;
      if (p.timer <= 0) {
        p.timer = 2.0 + Math.random() * 2.5;
        p.tx = p.homeX + (Math.random() - 0.5) * 4.2;
        p.tz = p.homeZ + (Math.random() - 0.5) * 4.2;
      }
    }
  });

  // 유리 엘리베이터 승강 모션
  const tNow = performance.now() * 0.0012;
  for (const reg of Object.values(lot3D)) {
    if (reg.elevatorCar) {
      reg.elevatorCar.position.y = 4.2 + Math.sin(tNow) * 2.7;
    }
  }

  // 돌발 케어 버블 스폰
  careTimer -= dt;
  if (careTimer <= 0) {
    careTimer = 11.0 + Math.random() * 5.0;
    if (careBubbles.length < 2) spawnCareBubble();
  }
}

function spawnCareBubble() {
  const tpl = CARE_BUBBLE_TYPES[Math.floor(Math.random() * CARE_BUBBLE_TYPES.length)];
  const owned = state.lots.filter((l) => l.owned);
  const lot = owned[Math.floor(Math.random() * owned.length)];
  const id = `cb_${Date.now()}`;
  const btn = document.createElement('button');
  btn.className = 'world-tag care-action-bubble';
  btn.textContent = `${tpl.icon} ${tpl.label}!`;
  btn.onclick = (e) => {
    e.stopPropagation();
    const idx = careBubbles.findIndex((x) => x.id === id);
    if (idx !== -1) careBubbles.splice(idx, 1);
    btn.remove();
    addGold(tpl.cashReward);
    spawnCoinFountain3D(lot.x, 3.5, lot.z + 2.0, 9);
    spawnFloatText(lot.x, 5.2, lot.z + 2.0, `+${tpl.cashReward}만!`);
    showToast(tpl.toastMsg, 'emerald');
  };
  dom.careLayer.appendChild(btn);
  careBubbles.push({ id, el: btn, wx: lot.x, wy: 5.5, wz: lot.z + 2.5 });
}

// =========================================================
// 13. 3D 투영 오버레이(원거리 텍스트 제거 ↔ 근거리 디테일 전환) & 긴급 Red Dot
// =========================================================
function project(wx, wy, wz) {
  tempVec.set(wx, wy, wz).project(camera);
  return {
    x: (tempVec.x * 0.5 + 0.5) * window.innerWidth,
    y: (-tempVec.y * 0.5 + 0.5) * window.innerHeight
  };
}

function spawnFloatText(wx, wy, wz, text) {
  const pt = project(wx, wy, wz);
  const el = document.createElement('div');
  el.className = 'jackpot-float';
  el.style.left = `${pt.x.toFixed(1)}px`;
  el.style.top = `${pt.y.toFixed(1)}px`;
  el.textContent = text;
  dom.jackpotLayer.appendChild(el);
  setTimeout(() => el.remove(), 1550);
}

function rebuildStaticOverlayDOM() {
  dom.lotsLayer.innerHTML = '';
  dom.roomsLayer.innerHTML = '';
  dom.crisisLayer.innerHTML = '';
  Object.keys(lotOverlayEls).forEach((k) => delete lotOverlayEls[k]);
  Object.keys(roomOverlayEls).forEach((k) => delete roomOverlayEls[k]);
  Object.keys(crisisPinEls).forEach((k) => delete crisisPinEls[k]);

  for (const lot of state.lots) {
    const el = document.createElement('div');
    el.className = `world-tag lot-pill ${!lot.owned ? 'empty-site' : ''}`;
    el.onclick = (e) => {
      e.stopPropagation();
      if (!lot.owned) {
        openLotDevModal(lot.lotId);
      } else {
        const b = state.buildings[lot.lotId];
        if (b && b.pendingCoins > 0) {
          collectLotPendingCoins(lot.lotId);
        } else {
          focusCameraOnLot(lot.lotId, b ? 1.65 : 1.35);
        }
      }
    };
    dom.lotsLayer.appendChild(el);
    lotOverlayEls[lot.lotId] = el;
  }

  for (const b of Object.values(state.buildings)) {
    for (const r of b.rooms) {
      const rEl = document.createElement('div');
      rEl.className = 'world-tag room-mini-pill';
      rEl.onclick = (e) => {
        e.stopPropagation();
        focusCameraOnRoom(r.id);
      };
      dom.roomsLayer.appendChild(rEl);
      roomOverlayEls[r.id] = rEl;

      const cPin = document.createElement('div');
      cPin.className = 'world-tag crisis-icon-pin hidden';
      cPin.onclick = (e) => {
        e.stopPropagation();
        focusCameraOnRoom(r.id);
      };
      dom.crisisLayer.appendChild(cPin);
      crisisPinEls[r.id] = cPin;
    }
  }
}

function collectLotPendingCoins(lotId) {
  const b = state.buildings[lotId];
  const lot = getLot(lotId);
  if (!b || b.pendingCoins <= 0) return;
  const amt = b.pendingCoins;
  b.pendingCoins = 0;
  addGold(amt);
  spawnCoinFountain3D(lot.x, 8.5, lot.z, 12);
  spawnFloatText(lot.x, 10.2, lot.z, `🪙 +${amt.toLocaleString()}만!`);
}

function updateProjectedOverlays() {
  const isCloseUp = camera.zoom >= 1.28;
  let urgentCount = QUEST_LIST.filter((q) => !state.claimedQuests.includes(q.id) && q.check(state)).length;
  let tenantCrisisCount = 0;

  // 1) 부지/건물 지붕 배지 (원거리 메인 표시, 클로즈업 시 숨김)
  for (const lot of state.lots) {
    const el = lotOverlayEls[lot.lotId];
    if (!el) continue;
    const b = state.buildings[lot.lotId];

    if (!lot.owned) {
      el.innerHTML = `🌱 ${lot.name} · <b>${lot.landPrice}만</b>`;
      el.style.opacity = isCloseUp ? '0.15' : '1';
      const pt = project(lot.x, 2.2, lot.z);
      el.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
    } else if (b) {
      const occ = b.rooms.filter((r) => r.household).length;
      el.classList.toggle('has-coins', b.pendingCoins > 0);
      el.innerHTML = b.pendingCoins > 0
        ? `🏠 ${b.title} | 💰 <b>+${b.pendingCoins}만 수금!</b>`
        : `🏠 ${b.title} | 입주 ${occ}/6`;
      el.style.opacity = isCloseUp ? '0' : '1';
      el.style.pointerEvents = isCloseUp ? 'none' : 'auto';
      const pt = project(lot.x, 10.6, lot.z);
      el.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
    } else {
      const cat = DEVELOPMENT_CATALOG[lot.devType];
      el.innerHTML = `${cat.icon} ${lot.title} (+${cat.cycleProfit}만)`;
      el.style.opacity = isCloseUp ? '0.25' : '1';
      const pt = project(lot.x, 4.2, lot.z);
      el.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
    }
  }

  // 2) 호실 배지 & 원거리 긴급 위기 핀(🚨, ⚡, 🤢) & 근거리 말풍선 분리!
  for (const b of Object.values(state.buildings)) {
    const lot = getLot(b.lotId);
    for (const r of b.rooms) {
      const rEl = roomOverlayEls[r.id];
      const cPin = crisisPinEls[r.id];
      const hasCrisis = r.household && (r.evictionCountdown !== null || r.trashStage >= 2 || r.activeConflict);
      if (hasCrisis) {
        urgentCount += 1;
        tenantCrisisCount += 1;
      }

      // 원거리에서는 긴급 위기 아이콘만 깔끔하게 노출!
      if (cPin) {
        if (!isCloseUp && hasCrisis) {
          cPin.classList.remove('hidden');
          cPin.textContent = r.evictionCountdown !== null
            ? `🚨 D-${Math.ceil(r.evictionCountdown)}s`
            : r.trashStage >= 2
              ? '🤢 악취!'
              : '⚡ 소음!';
          const pt = project(lot.x + r.lx, r.ly + 2.4, lot.z + r.lz + 1.8);
          cPin.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
        } else {
          cPin.classList.add('hidden');
        }
      }

      // 근거리(Zoom In)에서는 호실 상세 타이머/상태 배지 표시
      if (rEl) {
        rEl.style.opacity = isCloseUp ? '1' : '0';
        rEl.style.pointerEvents = isCloseUp ? 'auto' : 'none';
        if (isCloseUp) {
          rEl.classList.toggle('selected', focusedRoomId === r.id);
          rEl.classList.toggle('crisis', !!hasCrisis);
          if (!r.unlocked) {
            rEl.textContent = `🔒 ${r.name} (${r.unlockCost}만)`;
          } else if (!r.household) {
            rEl.textContent = `${r.name} · 공실 (${calcRoomRent(r)}만)`;
          } else {
            const def = HOUSEHOLD_TYPES[r.household.type];
            const rem = Math.max(1, Math.ceil(r.cycleSec - r.rentTimer));
            const warn = r.evictionCountdown !== null
              ? ` 🚨D-${Math.ceil(r.evictionCountdown)}s`
              : r.trashStage >= 2
                ? ' 🤢악취!'
                : r.activeConflict === 'noise'
                  ? ' ⚡소음!'
                  : '';
            rEl.textContent = `${def.icon} ${r.name} +${getEffectiveRent(r)}만 (${rem}s)${warn}`;
          }
          const pt = project(lot.x + r.lx, r.ly + 2.55, lot.z + r.lz);
          rEl.style.setProperty('--tx', `${pt.x.toFixed(1)}px`);
          rEl.style.setProperty('--ty', `${pt.y.toFixed(1)}px`);
          rEl.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
        }
      }

      // 말풍선: 원거리에서는 완전히 숨김(opacity: 0)!
      const spEl = speechEls[r.id];
      if (spEl) {
        spEl.style.opacity = isCloseUp ? '1' : '0';
        if (isCloseUp) {
          const pt = project(lot.x + r.lx, r.ly + 1.65, lot.z + r.lz + 0.4);
          spEl.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
        }
      }
    }

    if (managerTagEls[b.lotId]) {
      const pt = project(lot.x + 0.5, 2.2, lot.z + 4.1);
      managerTagEls[b.lotId].style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
    }
  }

  for (const cb of careBubbles) {
    const pt = project(cb.wx, cb.wy, cb.wz);
    cb.el.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
  }

  // 우측 하단 통합 FAB 긴급 Red Dot 업데이트!
  if (urgentCount > 0) {
    dom.fabRedDot.textContent = urgentCount;
    dom.fabRedDot.classList.remove('hidden');
  } else {
    dom.fabRedDot.classList.add('hidden');
  }
  if (dom.tabDotTenants) {
    dom.tabDotTenants.classList.toggle('hidden', tenantCrisisCount === 0);
  }
}

// =========================================================
// 14. 초기화 · 가로 모드 유도 · 터치/탭 분리 · 저장 및 메인 루프
// =========================================================
function registerPick(mesh) {
  if (!pickableMeshes.includes(mesh)) pickableMeshes.push(mesh);
}

function addGold(delta) {
  state.gold = Math.max(0, Math.round(state.gold + delta));
  if (delta > 0 && dom.hudGoldWrap) {
    dom.hudGoldWrap.classList.remove('gold-pop-anim');
    void dom.hudGoldWrap.offsetWidth;
    dom.hudGoldWrap.classList.add('gold-pop-anim');
  }
  updateHud();
}

function updateHud() {
  dom.hudGold.textContent = state.gold.toLocaleString();

  let net = 0;
  for (const b of Object.values(state.buildings)) {
    net += calcBuildingGrossCycle(b);
    if (b.manager.hired) net -= GAME_BALANCE.managerSalaryPerCycle;
  }
  for (const dev of Object.values(state.developments)) {
    net += DEVELOPMENT_CATALOG[dev.devType].cycleProfit;
  }

  dom.hudNetIncome.textContent = `${net >= 0 ? '+' : ''}${net.toLocaleString()}만`;
  dom.hudNetIncome.className = `font-jua text-xs sm:text-sm leading-tight ${net >= 0 ? 'text-emerald-700' : 'text-rose-600'}`;

  const hr = Math.floor(state.gameMinutes / 60) % 24;
  const mn = Math.floor(state.gameMinutes % 60);
  if (dom.hudTimeText) {
    dom.hudTimeText.textContent = `${hr >= 6 && hr < 19 ? '☀️' : '🌙'} ${state.day}일차 ${String(hr).padStart(2, '0')}:${String(mn).padStart(2, '0')}`;
  }
}

function showToast(msg, color = 'amber') {
  const map = {
    emerald: 'bg-emerald-500 text-white border-emerald-900',
    amber: 'bg-amber-300 text-amber-950 border-amber-900',
    rose: 'bg-rose-600 text-white border-rose-950'
  };
  const el = document.createElement('div');
  el.className = `font-jua text-xs sm:text-sm px-4 py-2 rounded-full border-[2.5px] shadow-xl transition-all duration-300 ${map[color] || map.amber}`;
  el.textContent = msg;
  dom.toastContainer.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 260);
  }, 2600);
}

function saveState() {
  try {
    state.lastSavedAt = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Save skipped:', e);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.buildings && Array.isArray(parsed.lots)) {
      state = { ...createInitialState(), ...parsed };
    }
  } catch (e) {
    console.warn('Load failed:', e);
  }
}

function updateCameraFrustum() {
  const aspect = window.innerWidth / window.innerHeight;
  // 가로(16:9) 기본 기준 + 세로 화면일 때도 잘리지 않게 시야 자동 확장!
  const baseH = aspect < 1 ? 30 / Math.max(0.5, aspect) : 30;
  camera.left = (-baseH * aspect) / 2;
  camera.right = (baseH * aspect) / 2;
  camera.top = baseH / 2;
  camera.bottom = -baseH / 2;
  camera.updateProjectionMatrix();
}

function initSceneAndControls() {
  initSharedResources();
  scene = new THREE.Scene();

  const aspect = window.innerWidth / window.innerHeight;
  const baseH = aspect < 1 ? 30 / Math.max(0.5, aspect) : 30;
  camera = new THREE.OrthographicCamera((-baseH * aspect) / 2, (baseH * aspect) / 2, baseH / 2, -baseH / 2, -120, 260);
  camera.position.copy(OVERVIEW_LOOK.clone().add(CAM_OFFSETS[0]));
  camera.zoom = 0.88;
  camera.updateProjectionMatrix();

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  dom.webglContainer.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(OVERVIEW_LOOK);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minZoom = 0.55;
  controls.maxZoom = 2.9;
  controls.minPolarAngle = Math.PI * 0.16;
  controls.maxPolarAngle = Math.PI * 0.43;
  controls.screenSpacePanning = true;
  controls.update();

  hemiLight = new THREE.HemisphereLight(0xfff9ec, 0xd4a373, 1.08);
  scene.add(hemiLight);
  dirLight = new THREE.DirectionalLight(0xfff1cc, 1.35);
  dirLight.position.set(24, 38, 28);
  scene.add(dirLight);
  const fill = new THREE.DirectionalLight(0xffd8be, 0.42);
  fill.position.set(-22, 18, -16);
  scene.add(fill);

  buildCozyFloatingIsland();
  buildAllLots3D();
  spawnIslandPets3D();
}

function bindUIAndInput() {
  // Screen Orientation API 가로 모드 시도 (지원 브라우저)
  window.addEventListener('pointerdown', () => {
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(() => {});
    }
  }, { once: true });

  // 이동 거리 5px 미만 짧은 탭만 선택으로 판정!
  const ptrs = new Map();
  let downX = 0; let downY = 0; let multi = false;

  renderer.domElement.addEventListener('pointerdown', (e) => {
    ptrs.set(e.pointerId, true);
    if (ptrs.size > 1) multi = true;
    if (ptrs.size === 1) {
      downX = e.clientX;
      downY = e.clientY;
      multi = false;
    }
    camTween.active = false;
  });

  renderer.domElement.addEventListener('pointerup', (e) => {
    ptrs.delete(e.pointerId);
    if (multi || ptrs.size > 0) return;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) >= 5) return;

    pointerNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointerNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointerNDC, camera);
    const hits = raycaster.intersectObjects(pickableMeshes, false);
    if (hits.length > 0) {
      const ud = hits[0].object.userData;
      if (ud.roomId) {
        focusCameraOnRoom(ud.roomId);
      } else if (ud.lotId) {
        const lot = getLot(ud.lotId);
        if (lot && !lot.owned) openLotDevModal(lot.lotId);
        else if (lot) focusCameraOnLot(lot.lotId, 1.55);
      }
    }
  });

  dom.fabNotebook.onclick = () => openNotebookModal();
  document.getElementById('btn-close-notebook').onclick = () => dom.notebookModal.classList.add('hidden');
  document.querySelectorAll('.ntab-btn').forEach((btn) => {
    btn.onclick = () => {
      activeNotebookTab = btn.dataset.ntab;
      selectedSplitItemId = null;
      renderNotebookSplitView();
    };
  });

  document.getElementById('btn-close-room-focus').onclick = () => {
    focusedRoomId = null;
    dom.roomFocusPanel.classList.add('hidden');
  };
  document.getElementById('btn-overview-cam').onclick = resetOverviewCamera;
  dom.btnCollectAll.onclick = () => {
    Object.keys(state.buildings).forEach(collectLotPendingCoins);
  };

  document.getElementById('btn-zoom-in').onclick = () => {
    camTween.look.copy(controls.target);
    camTween.pos.copy(camera.position);
    camTween.zoom = Math.min(controls.maxZoom, camera.zoom * 1.32);
    camTween.active = true;
  };
  document.getElementById('btn-zoom-out').onclick = () => {
    camTween.look.copy(controls.target);
    camTween.pos.copy(camera.position);
    camTween.zoom = Math.max(controls.minZoom, camera.zoom / 1.32);
    camTween.active = true;
  };
  document.getElementById('btn-cam-rotate').onclick = () => {
    camAzimuth = (camAzimuth + 1) % 4;
    camTween.look.copy(controls.target);
    camTween.pos.copy(controls.target).add(CAM_OFFSETS[camAzimuth]);
    camTween.zoom = camera.zoom;
    camTween.active = true;
  };

  document.getElementById('btn-close-dev-modal').onclick = () => dom.lotDevModal.classList.add('hidden');
  document.getElementById('btn-close-recruit').onclick = () => dom.recruitModal.classList.add('hidden');
  document.getElementById('btn-refresh-rec').onclick = () => {
    if (!recruitRoomTarget) return;
    if (state.gold < 10) { showToast('💸 비용(10만)이 부족합니다!', 'rose'); return; }
    addGold(-10);
    generateRecruitCandidates(recruitRoomTarget);
    renderRecruitCards();
  };

  let resetArmed = false;
  const resetBtn = document.getElementById('btn-reset-save');
  resetBtn.onclick = () => {
    if (!resetArmed) {
      resetArmed = true;
      resetBtn.textContent = '⚠️';
      showToast('🔄 초기화하려면 3초 안에 ⚠️ 버튼을 한 번 더 눌러주세요!', 'rose');
      setTimeout(() => { resetArmed = false; resetBtn.textContent = '🔄'; }, 3000);
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
  dom.lotsLayer = document.getElementById('lots-overlay-layer');
  dom.roomsLayer = document.getElementById('rooms-overlay-layer');
  dom.crisisLayer = document.getElementById('crisis-pins-layer');
  dom.speechLayer = document.getElementById('speech-overlay-layer');
  dom.careLayer = document.getElementById('care-overlay-layer');
  dom.jackpotLayer = document.getElementById('jackpot-overlay-layer');

  dom.hudGold = document.getElementById('hud-gold');
  dom.hudGoldWrap = document.getElementById('hud-gold-wrap');
  dom.hudNetIncome = document.getElementById('hud-net-income');
  dom.hudTimeText = document.getElementById('hud-time-text');
  dom.hudXrayBadge = document.getElementById('hud-xray-badge');
  dom.btnCollectAll = document.getElementById('btn-collect-all');

  dom.roomFocusPanel = document.getElementById('room-focus-panel');
  dom.rfTitle = document.getElementById('rf-title');
  dom.rfTierBadge = document.getElementById('rf-tier-badge');
  dom.rfBody = document.getElementById('rf-body');

  dom.fabNotebook = document.getElementById('fab-notebook');
  dom.fabRedDot = document.getElementById('fab-red-dot');
  dom.tabDotTenants = document.getElementById('tab-dot-tenants');
  dom.notebookModal = document.getElementById('notebook-modal');
  dom.splitLeftList = document.getElementById('split-left-list');
  dom.splitRightDetail = document.getElementById('split-right-detail');

  dom.lotDevModal = document.getElementById('lot-dev-modal');
  dom.devLotBadge = document.getElementById('dev-lot-badge');
  dom.devCardsGrid = document.getElementById('dev-cards-grid');

  dom.recruitModal = document.getElementById('recruit-modal');
  dom.recRoomTitle = document.getElementById('rec-room-title');
  dom.recCardsGrid = document.getElementById('rec-cards-grid');

  dom.evictionOverlay = document.getElementById('eviction-stamp-overlay');
  dom.evictionStampBox = document.getElementById('eviction-stamp-box');
  dom.toastContainer = document.getElementById('toast-container');
}

// --------------------- 엔트리포인트 ---------------------
window.addEventListener('DOMContentLoaded', () => {
  cacheDom();
  loadState();
  initSceneAndControls();
  rebuildStaticOverlayDOM();
  bindUIAndInput();
  updateHud();

  let last = performance.now();

  function frame(now) {
    const dt = Math.min(0.06, (now - last) / 1000);
    last = now;

    if (camTween.active) {
      const k = Math.min(1, dt * 7.5);
      camera.position.lerp(camTween.pos, k);
      controls.target.lerp(camTween.look, k);
      camera.zoom += (camTween.zoom - camera.zoom) * k;
      camera.updateProjectionMatrix();
      if (camera.position.distanceTo(camTween.pos) < 0.08 && Math.abs(camera.zoom - camTween.zoom) < 0.01) {
        camTween.active = false;
      }
    }
    controls.update();

    // 줌 배율 연동 자동 반투명 X-Ray 외피 업데이트
    updateXRayCutaway(dt);

    // 세탁조 & 날파리 회전
    spinningWashers.forEach((w) => { w.rotation.z += dt * 3.8; });
    Object.values(odorEmitters).forEach((fg) => { fg.rotation.y += dt * 4.5; });

    // 층간소음 붉은 충격파 링 확산
    for (let i = shockwaveRings.length - 1; i >= 0; i--) {
      const sw = shockwaveRings[i];
      sw.life -= dt;
      if (sw.life <= 0) {
        scene.remove(sw.mesh);
        shockwaveRings.splice(i, 1);
      } else {
        const p = 1 - sw.life / sw.maxLife;
        sw.mesh.scale.setScalar(1 + p * 3.2);
        sw.mesh.material.opacity = (1 - p) * 0.85;
      }
    }

    // Drop&Bounce & 3D 코인/연기 파티클
    for (let i = activeBounces.length - 1; i >= 0; i--) {
      const b = activeBounces[i];
      b.elapsed += dt;
      const t = Math.min(1, b.elapsed / b.duration);
      b.obj.position.y = b.baseY + (1 - easeOutBounce(t)) * 1.8;
      b.obj.scale.setScalar(0.35 + 0.65 * Math.min(1, t * 2.1));
      if (t >= 1) {
        b.obj.position.y = b.baseY;
        b.obj.scale.setScalar(1);
        activeBounces.splice(i, 1);
      }
    }

    for (let i = activeParticles.length - 1; i >= 0; i--) {
      const p = activeParticles[i];
      p.life -= dt;
      if (p.life <= 0) {
        scene.remove(p.mesh);
        activeParticles.splice(i, 1);
        continue;
      }
      p.vy -= p.gravity * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
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

    tickEconomy(dt);
    tickConflictAndSatisfaction(dt);
    tickChibiAndPets(dt);

    renderer.render(scene, camera);
    updateProjectedOverlays();
    updateHud();

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
  setInterval(saveState, 3000);
});
