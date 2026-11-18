// =========================================================
// 【갓물주 라이프 3D: 미니미 타운 — 유럽/미국풍 부티크 거리 · 단독 상가 · 슈퍼카 GTA 드라이브 에디션】 (app.js)
// 1. 순환 아스팔트 도로(노란 중앙선·횡단보도·맨홀·NO PARKING 연석) + 격자 보도블록 인도 + 유럽풍 2단 분수대 광장
// 2. 8종 스트리트 퍼니처(소화전, NO PARKING 표지판, MINIMI TRANSIT 버스정류장, 주철 가로등 배너, 우체통, 신문가판대, 자전거거치대, TODAY'S CAKE 입간판)
// 3. 단독 상가 3종(바게트 하우스 빵집 · 미니미 로스터스 카페 · 플로레스 꽃집) + 내부 오븐/머신/직원 + 인수 및 3종 3D 설비 업그레이드
// 4. 입주민 거리 산책 & 야외 초록 파라솔 착석 식사(+18만 매출!) & 바게트 종이봉투 귀가 AI
// 5. 건물주 슈퍼카 차고 4종 & GTA식 3인칭 로우앵글 추격 카메라(PerspectiveCamera) 드라이브 모드 + 클락션 환호 & 자석 코인 수금
// =========================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const SAVE_KEY = 'god_landlord_boutique_street_drive_2026_v8';

// --------------------- 전역 게임 상태 생성 및 스키마 보정 ---------------------
function createDefaultFurnitureState(defaultDecor = 'dec_peach') {
  return {
    ownedFurniture: {
      bed: ['bed_iron'],
      sofa: ['sofa_beanbag'],
      appliance: ['app_fan'],
      decor: Array.from(new Set(['dec_peach', defaultDecor]))
    },
    equippedFurniture: {
      bed: 'bed_iron',
      sofa: 'sofa_beanbag',
      appliance: 'app_fan',
      decor: defaultDecor
    }
  };
}

function getFurnitureItemDef(category, itemId) {
  const list = FURNITURE_CATALOG[category] || [];
  return list.find((x) => x.id === itemId) || list[0];
}

function getCarDef(carId) {
  return CAR_CATALOG.find((c) => c.id === carId) || CAR_CATALOG[0];
}

function syncRoomInteriorStats(room) {
  let upgradedCount = 0;
  for (const cat of ['bed', 'sofa', 'appliance', 'decor']) {
    const eqId = room.equippedFurniture?.[cat];
    const def = getFurnitureItemDef(cat, eqId);
    if (def && def.cost > 0) upgradedCount += 1;
    if (def && def.grantsSoundproof) room.soundproofed = true;
  }
  const computedLv = upgradedCount >= 4 ? 3 : upgradedCount >= 2 ? 2 : upgradedCount >= 1 ? 1 : 0;
  room.interiorLv = Math.max(room.manualInteriorLv || 0, computedLv);
}

function calcRoomFurnitureRentAdd(room) {
  if (!room.equippedFurniture) return 0;
  let sum = 0;
  for (const cat of ['bed', 'sofa', 'appliance', 'decor']) {
    const def = getFurnitureItemDef(cat, room.equippedFurniture[cat]);
    if (def) sum += def.rentAdd || 0;
  }
  return sum;
}

function makeResidentialBuilding(lotId, devType, title, withStarterTenant = false) {
  const cat = DEVELOPMENT_CATALOG[devType];
  const rooms = ROOM_SLOTS_TEMPLATE.map((slot) => {
    const fState = createDefaultFurnitureState(slot.defaultDecor || 'dec_peach');
    const rm = {
      id: `${lotId}_${slot.subId}`,
      lotId,
      subId: slot.subId,
      name: slot.name,
      layoutType: slot.layoutType,
      floor: slot.floor,
      col: slot.col,
      colSpan: slot.colSpan || 1,
      lx: slot.lx,
      ly: slot.ly,
      lz: slot.lz,
      rw: slot.rw,
      rd: slot.rd,
      rh: slot.rh,
      cycleSec: slot.cycleSec,
      unlocked: slot.defaultUnlocked,
      unlockCost: slot.unlockCost,
      baseRent: cat.baseRoomRent + (slot.rentBonus || 0) + (slot.floor - 1) * 8,
      interiorLv: 0,
      manualInteriorLv: 0,
      ownedFurniture: fState.ownedFurniture,
      equippedFurniture: fState.equippedFurniture,
      soundproofed: false,
      giftBonusPct: 0,
      giftedItems: [],
      household: null,
      rentTimer: 0,
      trashStage: 0,
      trashProgress: 0,
      evictionCountdown: null,
      activeConflict: null
    };

    if (withStarterTenant && slot.subId === '102') {
      rm.household = {
        type: 'newlywed',
        familyName: '박서연 세대',
        maxBudget: 235,
        happiness: 94
      };
      rm.rentTimer = 4.5;
    }
    syncRoomInteriorStats(rm);
    return rm;
  });

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
      minRentFloor: 80,
      autoBudgetCap: 90,
      salaryTimer: 0
    },
    pendingCoins: 0,
    shopCycleTimer: 8.5
  };
}

function createInitialStandaloneShops() {
  const map = {};
  for (const tpl of STANDALONE_SHOPS_TEMPLATE) {
    map[tpl.shopId] = {
      shopId: tpl.shopId,
      owned: false,
      upgrades: {
        upg_oven: false,
        upg_terrace: false,
        upg_crate: false
      },
      cycleTimer: 4.0 + Math.random() * 3.0,
      totalServed: 0
    };
  }
  return map;
}

function ensureRoomSchema(room) {
  const tpl = ROOM_SLOTS_TEMPLATE.find((s) => s.subId === room.subId) || ROOM_SLOTS_TEMPLATE[0];
  room.name = tpl.subId;
  room.layoutType = tpl.layoutType;
  room.floor = tpl.floor;
  room.col = tpl.col;
  room.colSpan = tpl.colSpan || 1;
  room.lx = tpl.lx;
  room.ly = tpl.ly;
  room.lz = tpl.lz;
  room.rw = tpl.rw;
  room.rd = tpl.rd;
  room.rh = tpl.rh;
  room.cycleSec = tpl.cycleSec;
  room.unlockCost = tpl.unlockCost;

  const defF = createDefaultFurnitureState(tpl.defaultDecor || 'dec_peach');
  if (!room.ownedFurniture) room.ownedFurniture = defF.ownedFurniture;
  if (!room.equippedFurniture) room.equippedFurniture = defF.equippedFurniture;
  for (const k of ['bed', 'sofa', 'appliance', 'decor']) {
    if (!Array.isArray(room.ownedFurniture[k]) || room.ownedFurniture[k].length === 0) {
      room.ownedFurniture[k] = [...defF.ownedFurniture[k]];
    }
    if (!room.equippedFurniture[k]) {
      room.equippedFurniture[k] = defF.equippedFurniture[k];
    }
  }
  if (typeof room.giftBonusPct !== 'number') room.giftBonusPct = 0;
  if (!Array.isArray(room.giftedItems)) room.giftedItems = [];
  syncRoomInteriorStats(room);
}

function createInitialState() {
  const lots = JSON.parse(JSON.stringify(INITIAL_ISLAND_LOTS));
  const buildings = {
    lot_main: makeResidentialBuilding('lot_main', 'mixed_1', '해피 미니미 타운 1차', true)
  };
  const developments = {};
  const standaloneShops = createInitialStandaloneShops();

  return {
    gold: 1250,
    day: 1,
    gameMinutes: 9 * 60,
    feverTimer: 0,
    goldenKeys: 0,
    heldGifts: {
      left: null,
      right: null
    },
    claimedQuests: [],
    lots,
    buildings,
    developments,
    standaloneShops,
    garage: {
      ownedCars: ['car_scooter'],
      currentCar: 'car_scooter'
    },
    stats: {
      evictions: 0,
      crisisResolved: 0,
      totalEarned: 0
    },
    lastSavedAt: Date.now()
  };
}

let state = createInitialState();

// --------------------- Three.js 전역 변수 및 트리플 카메라 레지스트리 ---------------------
let scene;
let camera;        // 타운/호실/상가용 직교 카메라 (OrthographicCamera)
let driveCamera;   // 3인칭 추격 및 1인칭 운전석 콕핏 카메라 (PerspectiveCamera)
let fpCamera;      // 1인칭 상점 입장 & 세입자 방 집들이 카메라 (PerspectiveCamera, 1.6m 눈높이)
let renderer;
let controls;
let dirLight;
let hemiLight;
let shadowFillLight;
let studioKeyLight;
let studioFillLight;
let studioRimLight;
let studioStageDisc;
let islandRootGroup;

function getActiveCamera() {
  if (fpState.active) return fpCamera;
  if (driveState.active) return driveCamera;
  return camera;
}

const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();
const tempVec = new THREE.Vector3();
const camDirVec = new THREE.Vector3();

const OVERVIEW_LOOK = new THREE.Vector3(0.0, 5.8, 7.5);
const CAM_OFFSETS = [
  new THREE.Vector3(44, 34, 52),
  new THREE.Vector3(-44, 34, 52),
  new THREE.Vector3(-44, 34, -52),
  new THREE.Vector3(44, 34, -52)
];
let camAzimuth = 0;

const camTween = {
  active: false,
  pos: new THREE.Vector3(),
  look: new THREE.Vector3(),
  zoom: 0.76
};

let currentShellOpacity = 1.0;
let focusedRoomId = null;
let focusedShopId = null;
let activeFurnitureCategory = 'bed';
let isCatalogCollapsed = false;
let isRfBodyCollapsed = false;

let hoveredLotId = null;
let hoveredRoomId = null;
let hoveredShopId = null;
let hoveredShopMesh = null;
let activeNotebookTab = 'quests';
let selectedSplitItemId = null;
let devModalLotId = null;
let recruitRoomTarget = null;
let recruitCandidates = [];
let renameTargetLotId = null;

// --------------------- [1단계 5] GTA 3인칭 슈퍼카 드라이브 상태 ---------------------
const VIP_PARKING_POS = { x: 13.8, y: 0.24, z: -1.2, rotY: 0 };
const RING_ROAD_WAYPOINTS = [
  { x: 26.5, z: 7.0 },
  { x: -30.5, z: 7.0 },
  { x: -30.5, z: 28.6 },
  { x: 30.5, z: 28.6 },
  { x: 30.5, z: 7.0 }
];

const driveState = {
  active: false,
  cockpitView: false,
  roofOpen: true,
  radioChannelIdx: 0,
  steerVisualDeg: 0,
  driveThruPauseTimer: 0,
  nearestShopId: 'shop_bakery',
  driveThruCooldowns: {},
  driveThruRunners: [],
  autoCruise: true,
  waypointIdx: 1,
  x: VIP_PARKING_POS.x,
  y: VIP_PARKING_POS.y,
  z: VIP_PARKING_POS.z,
  heading: Math.PI * 0.5, // +X 방향 주행 시작
  speed: 0,
  steerAngle: 0,
  sessionLoot: 0,
  exhaustTimer: 0,
  keys: {
    forward: false,
    backward: false,
    left: false,
    right: false
  },
  carRootGroup: null,
  vehicleMesh: null,
  wheels: [],
  camCurrentPos: new THREE.Vector3(),
  camCurrentLook: new THREE.Vector3()
};

// --------------------- 1인칭 갓물주 상점 입장 · 골든벨 · 세입자 집들이 상태 ---------------------
const FP_STAGE_ORIGIN = new THREE.Vector3(0, 82, 0);
const fpState = {
  active: false,
  mode: 'shop',        // 'shop' | 'room'
  returnToDrive: false,
  shopId: 'shop_bakery',
  roomId: null,
  modalTab: 'shops',
  pos: new THREE.Vector3(0, 83.62, 2.5),
  yaw: 0,
  pitch: -0.05,
  walkPhase: 0,
  entryWalkTimer: 0,
  doorHinge: null,
  doorAngle: 0,
  bellPivot: null,
  bellSwingTimer: 0,
  cheerTimer: 0,
  stageGroup: null,
  roomTempGroup: null,
  handsGroup: null,
  leftHandSlot: null,
  rightHandSlot: null,
  pickables: [],
  labelPins: [],
  npcActors: [],
  hostResidentMesh: null,
  hostOrigPos: null,
  bounds: { minX: -4.2, maxX: 4.2, minZ: 0.9, maxZ: 3.7, eyeY: 83.62 },
  keys: { forward: false, backward: false, left: false, right: false },
  draggingLook: false,
  lastPointerX: 0,
  lastPointerY: 0
};

const hudAnim = {
  shownGold: 1250,
  targetGold: 1250,
  shownNet: 0,
  targetNet: 0,
  shownHappy: 100,
  targetHappy: 100
};

// 3D 공유 캐시 및 월드 레지스트리
const GEO = {};
const MAT = {};
const TEX = {};
const extrudeGeoCache = new Map();
const edgesGeoCache = new Map();
const domeGeoCache = new Map();

const lot3D = {};
const standaloneShop3D = {};
const fountainBenchSeats = [];
const pickableMeshes = [];
const spinningWashers = [];
const spinningFans = [];
const activeBounces = [];
const activeSquashes = [];
const activeParticles = [];
const shockwaveRings = [];
const waterRipples = [];
const fountainJets = [];
const odorEmitters = {};
const facadeEmitters = [];
const residentActors = {};
const roomPetActors = {};
const streetOutingActors = [];
let outingSpawnTimer = 1.8;
const petActors = [];
const strollingActors = [];
const cloudActors = [];
const skyCritters = [];
const streamFloats = [];
const swayingBalloons = [];
const ambientFloaters = [];
const streetInteractiveProps = [];
const signMaterialsToRefresh = [];
const animatedDashMaterials = [];

let hoverFocusGroup = null;
let hoverRingMat = null;
let selectedRoomFrameGroup = null;

const careBubbles = [];
const rentBubbles = [];
let careTimer = 8.0;

// DOM 오버레이 레지스트리
const lotOverlayEls = {};
const shopOverlayEls = {};
const devActionPinEls = {};
const roomOverlayEls = {};
const crisisPinEls = {};
const speechEls = {};
const walkerSpeechEls = new Map();
const managerTagEls = {};
let vipParkingPinEl = null;
const dom = {};

// =========================================================
// 1. 클레이 곡면 메쉬 & 만화풍 윤곽선 유틸리티
// =========================================================
function normalizeExtrudeUVs(geo, w, h, d) {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const uv = geo.attributes.uv;
  if (!pos || !uv || !nor) return;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    const nz = Math.abs(nor.getZ(i));

    if (ny >= nx && ny >= nz) {
      uv.setXY(i, (x + w * 0.5) / Math.max(0.05, w), (z + d * 0.5) / Math.max(0.05, d));
    } else if (nx >= nz) {
      uv.setXY(i, (z + d * 0.5) / Math.max(0.05, d), (y + h * 0.5) / Math.max(0.05, h));
    } else {
      uv.setXY(i, (x + w * 0.5) / Math.max(0.05, w), (y + h * 0.5) / Math.max(0.05, h));
    }
  }
  uv.needsUpdate = true;
}

function getRoundedToyGeo(w, h, d, radius = 0.09, bevel = 0.08) {
  const b = Math.min(bevel, w * 0.24, h * 0.24, d * 0.28);
  const iw = Math.max(0.016, w - b * 2);
  const ih = Math.max(0.016, h - b * 2);
  const id = Math.max(0.012, d - b * 2);
  const cr = Math.min(radius, iw * 0.46, ih * 0.46);

  const key = `${w.toFixed(2)}_${h.toFixed(2)}_${d.toFixed(2)}_${cr.toFixed(3)}_${b.toFixed(3)}`;
  if (extrudeGeoCache.has(key)) return extrudeGeoCache.get(key);

  const hw = iw * 0.5;
  const hh = ih * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-hw + cr, -hh);
  shape.lineTo(hw - cr, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + cr);
  shape.lineTo(hw, hh - cr);
  shape.quadraticCurveTo(hw, hh, hw - cr, hh);
  shape.lineTo(-hw + cr, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - cr);
  shape.lineTo(-hw, -hh + cr);
  shape.quadraticCurveTo(-hw, -hh, -hw + cr, -hh);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: id,
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 4,
    curveSegments: 5
  });
  geo.translate(0, 0, -id * 0.5);
  geo.computeVertexNormals();
  normalizeExtrudeUVs(geo, w, h, d);

  extrudeGeoCache.set(key, geo);
  return geo;
}

function addToonEdgeOutline(mesh, lineMat = null, thresholdAngle = 24) {
  const geo = mesh.geometry;
  if (!geo) return null;
  const cacheKey = `${geo.uuid}_${thresholdAngle}`;
  let edgeGeo = edgesGeoCache.get(cacheKey);
  if (!edgeGeo) {
    edgeGeo = new THREE.EdgesGeometry(geo, thresholdAngle);
    edgesGeoCache.set(cacheKey, edgeGeo);
  }
  const lines = new THREE.LineSegments(edgeGeo, lineMat || MAT.toonEdge);
  lines.raycast = () => {};
  mesh.add(lines);
  return lines;
}

function addToonHullOutline(mesh, thicknessScale = 1.07) {
  const hull = new THREE.Mesh(mesh.geometry, MAT.toonHull);
  hull.scale.setScalar(thicknessScale);
  hull.raycast = () => {};
  mesh.add(hull);
  return hull;
}

function createRoundedToyMesh(
  w,
  h,
  d,
  mat,
  x = 0,
  y = 0,
  z = 0,
  radius = 0.09,
  cast = true,
  receive = true,
  withOutline = true,
  customOutlineMat = null
) {
  const mesh = new THREE.Mesh(getRoundedToyGeo(w, h, d, radius, 0.08), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  if (withOutline && Math.max(w, h, d) >= 0.2) {
    addToonEdgeOutline(mesh, customOutlineMat || MAT.toonEdge, 24);
  }
  return mesh;
}

function getPuffyDomeGeo(rBottom = 0.6, height = 1.0) {
  const key = `${rBottom.toFixed(2)}_${height.toFixed(2)}`;
  if (domeGeoCache.has(key)) return domeGeoCache.get(key);

  const pts = [];
  const steps = 12;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const rad = rBottom * Math.cos(t * Math.PI * 0.5) * (1 + 0.14 * Math.sin(t * Math.PI));
    const py = (t - 0.5) * height;
    pts.push(new THREE.Vector2(Math.max(0.001, rad), py));
  }
  const geo = new THREE.LatheGeometry(pts, 20);
  geo.computeVertexNormals();
  domeGeoCache.set(key, geo);
  return geo;
}

function getPicketPostGeo() {
  if (GEO.picketPost) return GEO.picketPost;
  const shape = new THREE.Shape();
  shape.moveTo(-0.08, -0.32);
  shape.lineTo(0.08, -0.32);
  shape.lineTo(0.08, 0.18);
  shape.quadraticCurveTo(0.08, 0.34, 0, 0.36);
  shape.quadraticCurveTo(-0.08, 0.34, -0.08, 0.18);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.06,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.035,
    bevelSegments: 4,
    curveSegments: 5
  });
  geo.translate(0, 0, -0.03);
  geo.computeVertexNormals();
  GEO.picketPost = geo;
  return geo;
}

function getGarlandFlagGeo() {
  if (GEO.garlandFlag) return GEO.garlandFlag;
  const shape = new THREE.Shape();
  shape.moveTo(-0.16, 0.14);
  shape.lineTo(0.16, 0.14);
  shape.quadraticCurveTo(0.06, -0.15, 0, -0.2);
  shape.quadraticCurveTo(-0.06, -0.15, -0.16, 0.14);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.02,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 3
  });
  geo.translate(0, 0, -0.01);
  geo.computeVertexNormals();
  GEO.garlandFlag = geo;
  return geo;
}

function makeClayMat(hex, opts = {}) {
  const baseCol = new THREE.Color(hex);
  const warmPeach = new THREE.Color(opts.coolShadow ? 0xE9D5FF : 0xFFC8B8);
  const subTint = baseCol.clone().lerp(warmPeach, 0.4);

  return new THREE.MeshStandardMaterial({
    color: baseCol,
    map: opts.map || null,
    roughness: opts.roughness !== undefined ? opts.roughness : 0.55,
    metalness: opts.metalness !== undefined ? opts.metalness : 0.05,
    emissive: opts.emissive !== undefined ? new THREE.Color(opts.emissive) : subTint,
    emissiveIntensity: opts.emissiveIntensity !== undefined ? opts.emissiveIntensity : (opts.map ? 0.1 : 0.16),
    transparent: !!opts.transparent,
    opacity: opts.opacity !== undefined ? opts.opacity : 1.0,
    side: opts.side || THREE.FrontSide
  });
}

function triggerSquashStretch(obj, intensity = 1.0) {
  if (!obj) return;
  const existingIdx = activeSquashes.findIndex((s) => s.obj === obj);
  const baseScale = obj.userData.origScale ? obj.userData.origScale.clone() : obj.scale.clone();
  if (!obj.userData.origScale) {
    obj.userData.origScale = baseScale.clone();
  }
  if (existingIdx !== -1) activeSquashes.splice(existingIdx, 1);

  const sx = 1 + 0.14 * intensity;
  const sy = Math.max(0.72, 1 - 0.14 * intensity);
  obj.scale.set(baseScale.x * sx, baseScale.y * sy, baseScale.z * sx);

  activeSquashes.push({
    obj,
    baseScale,
    elapsed: 0,
    duration: 0.56,
    intensity
  });
}

// Web Audio API 경적 · 카오디오 BGM 라디오 · 골든벨 · 집들이 초인종 합성기
let sharedAudioCtx = null;
let radioIntervalId = null;
let radioStepTick = 0;

function ensureAudioCtx() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) sharedAudioCtx = new AudioCtx();
  if (sharedAudioCtx.state === 'suspended') sharedAudioCtx.resume();
  return sharedAudioCtx;
}

function playSupercarHornSound(carId = 'car_supercar') {
  try {
    const ctx = ensureAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = carId === 'car_scooter' ? [523, 659] : carId === 'car_supercar' ? [330, 415] : [277, 349];

    freqs.forEach((f) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 1.04, now + 0.16);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    });
  } catch (e) {
    // 오디오 제한 환경 무시
  }
}

function playSynthTone(freq, type = 'triangle', duration = 0.24, volume = 0.04, delay = 0) {
  try {
    const ctx = ensureAudioCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(Math.max(0.001, volume), t0);
    gain.gain.exponentialRampToValueAtTime(0.0008, t0 + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  } catch (e) {
    // 무시
  }
}

function stopCarRadioBGM() {
  if (radioIntervalId) {
    clearInterval(radioIntervalId);
    radioIntervalId = null;
  }
}

function startOrUpdateCarRadioBGM() {
  stopCarRadioBGM();
  if (!driveState.active) return;
  const ch = FP_RADIO_CHANNELS[driveState.radioChannelIdx % FP_RADIO_CHANNELS.length];
  if (!ch || ch.id === 'off') return;

  const stepMs = ch.id === 'lofi' ? 320 : ch.id === 'citypop' ? 210 : 170;
  radioIntervalId = setInterval(() => {
    if (!driveState.active) {
      stopCarRadioBGM();
      return;
    }
    radioStepTick = (radioStepTick + 1) % 16;

    if (ch.id === 'lofi') {
      // Lo-Fi 재즈 7th 코드 워킹
      const chords = [
        [261.6, 329.6, 392.0, 493.9],
        [293.7, 349.2, 440.0, 523.3],
        [246.9, 293.7, 392.0, 493.9],
        [220.0, 261.6, 329.6, 392.0]
      ];
      if (radioStepTick % 4 === 0) {
        const chord = chords[Math.floor(radioStepTick / 4) % chords.length];
        chord.forEach((f, idx) => playSynthTone(f, 'triangle', 0.55, 0.022, idx * 0.03));
      } else if (radioStepTick % 2 === 1) {
        playSynthTone(130.8, 'sine', 0.18, 0.024, 0);
      }
    } else if (ch.id === 'citypop') {
      // 신나는 시티팝 펑키 신스 아르페지오
      const arp = [392.0, 493.9, 587.3, 659.3, 587.3, 493.9, 523.3, 784.0];
      const bass = [130.8, 130.8, 146.8, 164.8];
      playSynthTone(arp[radioStepTick % arp.length], 'triangle', 0.18, 0.026, 0);
      if (radioStepTick % 2 === 0) {
        playSynthTone(bass[Math.floor(radioStepTick / 4) % bass.length], 'sawtooth', 0.16, 0.018, 0);
      }
    } else if (ch.id === 'club') {
      // 클럽 비트 포온더플로어 킥 + 옥타브 신스 베이스
      try {
        const ctx = ensureAudioCtx();
        if (ctx && radioStepTick % 2 === 0) {
          const t0 = ctx.currentTime;
          const kick = ctx.createOscillator();
          const kg = ctx.createGain();
          kick.type = 'sine';
          kick.frequency.setValueAtTime(140, t0);
          kick.frequency.exponentialRampToValueAtTime(42, t0 + 0.12);
          kg.gain.setValueAtTime(0.06, t0);
          kg.gain.exponentialRampToValueAtTime(0.001, t0 + 0.14);
          kick.connect(kg);
          kg.connect(ctx.destination);
          kick.start(t0);
          kick.stop(t0 + 0.15);
        }
      } catch (e) {
        // 무시
      }
      const electro = [110, 220, 130.8, 261.6, 146.8, 293.7, 164.8, 329.6];
      playSynthTone(electro[radioStepTick % electro.length], 'sawtooth', 0.13, 0.02, 0.02);
    }
  }, stepMs);
}

function playGoldenBellSound() {
  // 땡! 땡! 땡!! 경쾌한 황금 종소리 3연타 + 팡파레 화음
  [0, 0.24, 0.48].forEach((d) => {
    playSynthTone(1046.5, 'triangle', 0.55, 0.07, d);
    playSynthTone(1568.0, 'sine', 0.45, 0.05, d);
    playSynthTone(2093.0, 'sine', 0.35, 0.035, d + 0.01);
  });
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
    playSynthTone(f, 'triangle', 0.7, 0.04, 0.68 + i * 0.05);
  });
}

function playDoorbellChimeSound() {
  // 띵~ 동~ 따뜻한 집들이 초인종
  playSynthTone(659.25, 'triangle', 0.36, 0.06, 0);
  playSynthTone(1318.5, 'sine', 0.25, 0.025, 0);
  playSynthTone(523.25, 'triangle', 0.52, 0.06, 0.28);
  playSynthTone(1046.5, 'sine', 0.35, 0.025, 0.28);
}

function playShopDoorChimeSound() {
  // 상점 입장 딸랑~ 도어벨
  [784.0, 987.8, 1174.7, 1568.0].forEach((f, idx) => {
    playSynthTone(f, 'sine', 0.28, 0.038, idx * 0.06);
  });
}

// =========================================================
// 2. 상가 간판 · 도로 노면 · 유럽풍 거리 표지판 프로시저럴 텍스처
// =========================================================
function createShopSignboardTexture(shopType = 'mart') {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 220;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  if (shopType === 'mart') {
    ctx.fillStyle = '#FFFDF9';
    ctx.beginPath();
    ctx.roundRect(6, 6, w - 12, h - 12, 34);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(10, 10, w - 20, h - 20, 30);
    ctx.clip();
    ctx.fillStyle = '#34D399'; ctx.fillRect(0, 0, w, 24);
    ctx.fillStyle = '#FF6B8B'; ctx.fillRect(0, 24, w, 16);
    ctx.fillStyle = '#FACC15'; ctx.fillRect(0, 40, w, 12);
    ctx.fillStyle = '#34D399'; ctx.fillRect(0, h - 22, w, 22);
    ctx.restore();
    ctx.strokeStyle = '#5A463C'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.roundRect(6, 6, w - 12, h - 12, 34); ctx.stroke();

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.font = '56px "Jua", "Pretendard", sans-serif';
    ctx.strokeStyle = '#43342E'; ctx.lineWidth = 12; ctx.strokeText('해피마트 24', w * 0.5, 108);
    ctx.fillStyle = '#FF5C7A'; ctx.fillText('해피마트 24', w * 0.5, 108);
    ctx.font = '700 25px "Pretendard", sans-serif'; ctx.fillStyle = '#047857';
    ctx.fillText('MINI MART 24 · 도시락 & 간식', w * 0.5, 162);
  } else if (shopType === 'wash') {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#7CC8FF'); bgGrad.addColorStop(1, '#38A3F8');
    ctx.fillStyle = bgGrad; ctx.beginPath(); ctx.roundRect(6, 6, w - 12, h - 12, 38); ctx.fill();
    ctx.fillStyle = '#F8FDFF'; ctx.beginPath(); ctx.roundRect(24, 22, w - 48, h - 44, 32); ctx.fill();
    ctx.strokeStyle = '#FACC15'; ctx.lineWidth = 6; ctx.stroke();

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.font = '56px "Jua", "Pretendard", sans-serif';
    ctx.strokeStyle = '#43342E'; ctx.lineWidth = 12; ctx.strokeText('뽀송 워시', w * 0.5, 92);
    ctx.fillStyle = '#0284C7'; ctx.fillText('뽀송 워시', w * 0.5, 92);
    ctx.font = '700 26px "Pretendard", sans-serif'; ctx.fillStyle = '#D97706';
    ctx.fillText('BUBBLE PONG · 24시 코인세탁', w * 0.5, 152);
  } else if (shopType === 'patisserie') {
    ctx.fillStyle = '#7F1D1D'; ctx.beginPath(); ctx.roundRect(6, 6, w - 12, h - 12, 34); ctx.fill();
    ctx.fillStyle = '#FFFBEB'; ctx.beginPath(); ctx.roundRect(20, 18, w - 40, h - 36, 26); ctx.fill();
    ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 6; ctx.stroke();

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.font = '52px "Jua", "Pretendard", sans-serif';
    ctx.strokeStyle = '#43342E'; ctx.lineWidth = 11; ctx.strokeText('PATISSERIE · 바게트 하우스', w * 0.5, 92);
    ctx.fillStyle = '#DC2626'; ctx.fillText('PATISSERIE · 바게트 하우스', w * 0.5, 92);
    ctx.font = '700 25px "Pretendard", sans-serif'; ctx.fillStyle = '#92400E';
    ctx.fillText('ARTISAN BAKERY & CAKE · 갓 구운 빵', w * 0.5, 154);
  } else if (shopType === 'roastery') {
    ctx.fillStyle = '#1B4332'; ctx.beginPath(); ctx.roundRect(6, 6, w - 12, h - 12, 34); ctx.fill();
    ctx.fillStyle = '#FAF5E8'; ctx.beginPath(); ctx.roundRect(20, 18, w - 40, h - 36, 26); ctx.fill();
    ctx.strokeStyle = '#D97706'; ctx.lineWidth = 6; ctx.stroke();

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.font = '50px "Jua", "Pretendard", sans-serif';
    ctx.strokeStyle = '#292524'; ctx.lineWidth = 11; ctx.strokeText('OAK & BARREL · 로스터스', w * 0.5, 92);
    ctx.fillStyle = '#1B4332'; ctx.fillText('OAK & BARREL · 로스터스', w * 0.5, 92);
    ctx.font = '700 24px "Pretendard", sans-serif'; ctx.fillStyle = '#B45309';
    ctx.fillText('ORGANIC GROCERY & COFFEE ROASTERY', w * 0.5, 154);
  } else if (shopType === 'flores') {
    ctx.fillStyle = '#5E548E'; ctx.beginPath(); ctx.roundRect(6, 6, w - 12, h - 12, 34); ctx.fill();
    ctx.fillStyle = '#FFF5F7'; ctx.beginPath(); ctx.roundRect(20, 18, w - 40, h - 36, 26); ctx.fill();
    ctx.strokeStyle = '#F472B6'; ctx.lineWidth = 6; ctx.stroke();

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.font = '50px "Jua", "Pretendard", sans-serif';
    ctx.strokeStyle = '#43342E'; ctx.lineWidth = 11; ctx.strokeText('FLORES & CO. · 플라워샵', w * 0.5, 92);
    ctx.fillStyle = '#BE185D'; ctx.fillText('FLORES & CO. · 플라워샵', w * 0.5, 92);
    ctx.font = '700 25px "Pretendard", sans-serif'; ctx.fillStyle = '#6D28D9';
    ctx.fillText('FLOWER & VINTAGE BOUTIQUE', w * 0.5, 154);
  } else {
    ctx.fillStyle = '#6F3B1B'; ctx.beginPath(); ctx.roundRect(6, 6, w - 12, h - 12, 34); ctx.fill();
    ctx.fillStyle = '#FFF9EE'; ctx.beginPath(); ctx.roundRect(22, 20, w - 44, h - 40, 26); ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '56px "Jua", "Pretendard", sans-serif';
    ctx.fillStyle = '#B45309'; ctx.fillText('달콤 다방', w * 0.5, 92);
    ctx.font = '700 25px "Pretendard", sans-serif'; ctx.fillStyle = '#78350F';
    ctx.fillText('SWEET CAFE · 수제 크루아상 & 라떼', w * 0.5, 152);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createStreetSignTexture(kind = 'no_parking') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const w = 256;
  const h = 256;

  if (kind === 'no_parking') {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(128, 128, 114, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#DC2626'; ctx.lineWidth = 26;
    ctx.beginPath(); ctx.arc(128, 128, 98, 0, Math.PI * 2); ctx.stroke();

    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 116px "Jua", "Pretendard", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('P', 128, 134);

    ctx.strokeStyle = '#DC2626'; ctx.lineWidth = 24;
    ctx.beginPath(); ctx.moveTo(58, 58); ctx.lineTo(198, 198); ctx.stroke();
  } else if (kind === 'todays_cake') {
    ctx.fillStyle = '#292524';
    ctx.beginPath(); ctx.roundRect(10, 10, w - 20, h - 20, 24); ctx.fill();
    ctx.strokeStyle = '#D97706'; ctx.lineWidth = 10; ctx.stroke();

    ctx.textAlign = 'center'; ctx.fillStyle = '#FDE047';
    ctx.font = '32px "Jua", "Pretendard", sans-serif';
    ctx.fillText("TODAY'S CAKE", 128, 58);
    // 딸기 케이크 아이콘
    ctx.fillStyle = '#FFFBEB';
    ctx.fillRect(68, 108, 120, 56);
    ctx.fillStyle = '#FF758F';
    ctx.fillRect(68, 128, 120, 16);
    ctx.fillStyle = '#EF4444';
    ctx.beginPath(); ctx.arc(128, 98, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#A7F3D0';
    ctx.font = '700 24px "Pretendard", sans-serif';
    ctx.fillText('딸기 쇼트케이크 1+1', 128, 206);
  } else if (kind === 'transit_sign') {
    ctx.fillStyle = '#0F766E';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = '#FEF08A';
    ctx.textAlign = 'center';
    ctx.font = '32px "Jua", "Pretendard", sans-serif';
    ctx.fillText('MINIMI TRANSIT', 128, 54);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 22px "Pretendard", sans-serif';
    ctx.fillText('01 순환버스 · 3분 후 도착', 128, 118);
    ctx.strokeStyle = '#5EEAD4'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(40, 172); ctx.lineTo(216, 172); ctx.stroke();
    [52, 128, 204].forEach((cx) => {
      ctx.fillStyle = '#FACC15';
      ctx.beginPath(); ctx.arc(cx, 172, 11, 0, Math.PI * 2); ctx.fill();
    });
  } else if (kind === 'lamp_banner') {
    ctx.fillStyle = '#E11D48';
    ctx.beginPath(); ctx.roundRect(8, 8, w - 16, h - 16, 18); ctx.fill();
    ctx.strokeStyle = '#FDE047'; ctx.lineWidth = 10; ctx.stroke();
    ctx.fillStyle = '#FFFBEB';
    ctx.textAlign = 'center';
    ctx.font = '36px "Jua", "Pretendard", sans-serif';
    ctx.fillText('MINIMI', 128, 98);
    ctx.fillText('TOWN', 128, 152);
    ctx.fillStyle = '#FDE047';
    ctx.beginPath(); ctx.arc(128, 204, 16, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'vip_parking') {
    ctx.fillStyle = '#292524';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#FACC15'; ctx.lineWidth = 14;
    ctx.strokeRect(14, 14, w - 28, h - 28);
    ctx.fillStyle = '#FDE047';
    ctx.textAlign = 'center';
    ctx.font = '44px "Jua", "Pretendard", sans-serif';
    ctx.fillText('VIP P', 128, 108);
    ctx.font = '700 24px "Pretendard", sans-serif';
    ctx.fillStyle = '#FFFBEB';
    ctx.fillText('건물주 전용 주차', 128, 168);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createBladeNeon24Texture() {
  return TextureGenerator.create((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createRadialGradient(w / 2, h / 2, 16, w / 2, h / 2, w * 0.46);
    g.addColorStop(0, '#FFFBEB'); g.addColorStop(0.7, '#FF758F'); g.addColorStop(1, '#E11D48');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(w / 2, h / 2, w * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#FDE047'; ctx.lineWidth = 10; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '74px "Jua", "Pretendard", sans-serif';
    ctx.fillStyle = '#FFFBEB'; ctx.fillText('24H', w / 2, h * 0.5);
  }, 1, 1, 256, 256);
}

function createBuildingSkySignTexture(buildingTitle) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#FFFBEB'); bg.addColorStop(0.5, '#FEF3C7'); bg.addColorStop(1, '#FDE68A');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(8, 8, w - 16, h - 16, 42); ctx.fill();
  ctx.strokeStyle = '#D97706'; ctx.lineWidth = 10; ctx.stroke();
  ctx.strokeStyle = '#43342E'; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(4, 4, w - 8, h - 8, 44); ctx.stroke();

  const fontSize = buildingTitle.length > 10 ? 50 : 58;
  ctx.font = `${fontSize}px "Jua", "Pretendard", sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 11; ctx.strokeText(buildingTitle, w / 2, h * 0.53);
  ctx.fillStyle = '#43342E'; ctx.fillText(buildingTitle, w / 2, h * 0.53);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createBrassNameplateTexture(buildingTitle) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#FDE68A'); g.addColorStop(0.5, '#F59E0B'); g.addColorStop(1, '#B45309');
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(6, 6, w - 12, h - 12, 24); ctx.fill();
  ctx.strokeStyle = '#4A3B32'; ctx.lineWidth = 7; ctx.stroke();

  ctx.font = '38px "Jua", "Pretendard", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFBEB'; ctx.strokeStyle = '#43342E'; ctx.lineWidth = 7; ctx.lineJoin = 'round';
  ctx.strokeText(buildingTitle, w / 2, h * 0.53);
  ctx.fillText(buildingTitle, w / 2, h * 0.53);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createRoomNumberPlateTexture(numStr, typeLabel = '', unlocked = true) {
  const canvas = document.createElement('canvas');
  canvas.width = 280;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = unlocked ? '#4A3B32' : '#7A685F';
  ctx.beginPath(); ctx.roundRect(4, 4, w - 8, h - 8, 18); ctx.fill();
  ctx.strokeStyle = unlocked ? '#F6BD60' : '#D6CCC0'; ctx.lineWidth = 5; ctx.stroke();

  ctx.font = '34px "Jua", "Pretendard", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = unlocked ? '#FDE68A' : '#EFE9E2';
  const label = typeLabel ? `${numStr} · ${typeLabel}` : String(numStr);
  ctx.fillText(label, w / 2, h * 0.54);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// =========================================================
// 3. 기본 프로시저럴 텍스처 생성기 (아스팔트 도로 · 횡단보도 · 인도 · 돌바닥 포함)
// =========================================================
class TextureGenerator {
  static create(drawFn, rx = 1, ry = 1, w = 256, h = 256) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    drawFn(ctx, w, h);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(rx, ry);
    tex.anisotropy = 4;
    return tex;
  }

  // 가로 방향 아스팔트 도로 (고해상도 골재 입자 + 노란 중앙선 + 가장자리 차선)
  static asphaltRoadHorizontal(repeatsX = 10) {
    return this.create((ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#464C56');
      g.addColorStop(0.25, '#3E444E');
      g.addColorStop(0.5, '#484F5A');
      g.addColorStop(0.75, '#3E444E');
      g.addColorStop(1, '#464C56');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < 360; i++) {
        ctx.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.055)' : 'rgba(20,24,30,0.08)';
        ctx.beginPath();
        ctx.arc((i * 73) % w, (i * 137) % h, 1.5 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(0, 26, w, 12);
      ctx.fillRect(0, h - 38, w, 12);

      ctx.fillStyle = '#FFD93D';
      ctx.beginPath();
      ctx.roundRect(44, h * 0.5 - 11, 260, 22, 10);
      ctx.fill();
    }, repeatsX, 1, 512, 512);
  }

  static asphaltRoadVertical(repeatsZ = 5) {
    return this.create((ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, '#464C56');
      g.addColorStop(0.25, '#3E444E');
      g.addColorStop(0.5, '#484F5A');
      g.addColorStop(0.75, '#3E444E');
      g.addColorStop(1, '#464C56');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < 360; i++) {
        ctx.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.055)' : 'rgba(20,24,30,0.08)';
        ctx.beginPath();
        ctx.arc((i * 73) % w, (i * 137) % h, 1.5 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(26, 0, 12, h);
      ctx.fillRect(w - 38, 0, 12, h);

      ctx.fillStyle = '#FFD93D';
      ctx.beginPath();
      ctx.roundRect(w * 0.5 - 11, 44, 22, 260, 10);
      ctx.fill();
    }, 1, repeatsZ, 512, 512);
  }

  static crosswalkZebra() {
    return this.create((ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#FFFDF7';
      for (let y = 24; y < h - 20; y += 84) {
        ctx.beginPath();
        ctx.roundRect(32, y, w - 64, 48, 12);
        ctx.fill();
      }
    }, 1, 1, 512, 512);
  }

  // 세련된 유럽식 화강암 & 코랄 베벨 연석
  static redNoParkingCurb(repeats = 8) {
    return this.create((ctx, w, h) => {
      ctx.fillStyle = '#E8DDD0';
      ctx.fillRect(0, 0, w, h);
      const blocks = [
        [4, '#E05A47'],
        [132, '#F5EDE2'],
        [260, '#E05A47'],
        [388, '#F5EDE2']
      ];
      for (const [bx, col] of blocks) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.roundRect(bx, 6, 120, h - 12, 10);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(bx + 6, 8, 108, 10);
      }
    }, repeats, 1, 512, 96);
  }

  // 따뜻한 샌드스톤 베벨 보도블록 인도(Sidewalk)
  static warmSidewalkGrid(rx = 12, ry = 2) {
    return this.create((ctx, w, h) => {
      ctx.fillStyle = '#D5C2AE';
      ctx.fillRect(0, 0, w, h);
      const tones = ['#FAF4EC', '#F4EAE0', '#FDF9F3', '#EFE2D3'];
      const cell = w / 4;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          const x = c * cell + 5;
          const y = r * cell + 5;
          const sz = cell - 10;
          ctx.fillStyle = tones[(r * 3 + c) % tones.length];
          ctx.beginPath();
          ctx.roundRect(x, y, sz, sz, 14);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.68)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(x + 2, y + 2, sz - 4, sz - 4, 12);
          ctx.stroke();
        }
      }
    }, rx, ry, 512, 512);
  }

  // 유럽풍 원형 광장 돌바닥(Cobblestone)
  static europeanPlazaCobble() {
    return this.create((ctx, w, h) => {
      ctx.fillStyle = '#C7B7A6';
      ctx.fillRect(0, 0, w, h);
      const cols = ['#F2EAE0', '#E8DDD0', '#DFD1C0', '#F8F3EC'];
      for (let r = 0; r < 8; r++) {
        const off = (r % 2) * 32;
        for (let c = -1; c < 9; c++) {
          const x = c * 64 + off + 4;
          const y = r * 64 + 4;
          ctx.fillStyle = cols[(r * 3 + c + 8) % cols.length];
          ctx.beginPath();
          ctx.roundRect(x, y, 56, 55, 18);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.42)';
          ctx.beginPath();
          ctx.roundRect(x + 5, y + 4, 46, 12, 6);
          ctx.fill();
        }
      }
    }, 5, 5, 512, 512);
  }

  static dashedFocusStrip(dashColor = '#38E54D', subColor = '#FFFFFF') {
    return this.create((ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = dashColor;
      ctx.beginPath(); ctx.roundRect(12, 8, 104, h - 16, 12); ctx.fill();
      ctx.fillStyle = subColor;
      ctx.beginPath(); ctx.roundRect(140, 10, 96, h - 20, 10); ctx.fill();
    }, 6, 1, 256, 48);
  }

  static herringboneWood(style = 'oak') {
    const palettes = {
      maple: ['#FDF0E0', '#F7E0C4', '#EED1AE', '#CEA379'],
      oak: ['#F2C99B', '#E7B682', '#DCA56E', '#A86E3D'],
      royal: ['#FFFDF7', '#FAF2E4', '#F3E5CE', '#D6B378']
    };
    const [c1, c2, c3, lineCol] = palettes[style] || palettes.oak;
    return this.create((ctx, w, h) => {
      ctx.fillStyle = c1; ctx.fillRect(0, 0, w, h);
      const cols = [c1, c2, c3];
      for (let y = -80; y < h + 80; y += 36) {
        for (let x = -80; x < w + 80; x += 72) {
          const drawPlank = (tx, ty, ang, colIdx) => {
            ctx.save(); ctx.translate(tx, ty); ctx.rotate(ang);
            ctx.fillStyle = cols[colIdx % 3];
            ctx.fillRect(0, 0, 72, 26);
            ctx.strokeStyle = 'rgba(130, 80, 35, 0.12)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(4, 8); ctx.bezierCurveTo(24, 6, 48, 11, 68, 8);
            ctx.moveTo(4, 18); ctx.bezierCurveTo(28, 20, 46, 15, 68, 18);
            ctx.stroke();
            ctx.strokeStyle = lineCol; ctx.lineWidth = 1.8; ctx.strokeRect(0, 0, 72, 26);
            ctx.restore();
          };
          drawPlank(x, y, Math.PI / 4, Math.abs(Math.floor((x + y) / 36)));
          drawPlank(x + 36, y + 18, -Math.PI / 4, Math.abs(Math.floor((x - y) / 36) + 1));
        }
      }
    }, 2.4, 2.4, 512, 512);
  }

  static wovenBoucleRug(baseHex = '#FFC4D0', weaveHex = '#FFE3E8') {
    return this.create((ctx, w, h) => {
      ctx.fillStyle = baseHex;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = weaveHex;
      for (let y = 6; y < h; y += 14) {
        for (let x = (y % 28 === 6 ? 6 : 13); x < w; x += 14) {
          ctx.beginPath();
          ctx.roundRect(x, y, 8, 5, 2.5);
          ctx.fill();
        }
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.58)';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w * 0.43, 0, Math.PI * 2);
      ctx.stroke();
    }, 1, 1, 256, 256);
  }

  static pastelStripeWallpaper(stripeA = '#C2DEC8', stripeB = '#B1D3B9', moldingHex = '#8DB898', wainscotHex = '#DFBE9B') {
    return this.create((ctx, w, h) => {
      const sw = 24;
      for (let x = 0; x < w; x += sw) {
        ctx.fillStyle = (x / sw) % 2 === 0 ? stripeA : stripeB;
        ctx.fillRect(x, 0, sw, h);
      }
      ctx.fillStyle = wainscotHex; ctx.fillRect(0, h * 0.68, w, h * 0.32);
      ctx.fillStyle = moldingHex; ctx.fillRect(0, h * 0.66, w, 6);
      ctx.strokeStyle = moldingHex; ctx.lineWidth = 3;
      for (let px = 14; px < w; px += 60) {
        ctx.strokeRect(px, h * 0.74, 42, h * 0.2);
      }
    }, 2.5, 1, 256, 256);
  }

  static pastelSkyBackdrop() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#AEE2FF');
    g.addColorStop(0.55, '#E8F9FD');
    g.addColorStop(1, '#FFFDF9');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);

    const drawCloud = (cx, cy, s) => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
      [[0, 0, 38], [-30, 8, 28], [32, 8, 29], [-12, -14, 26], [15, -12, 25]].forEach(([ox, oy, r]) => {
        ctx.beginPath(); ctx.arc(cx + ox * s, cy + oy * s, r * s, 0, Math.PI * 2); ctx.fill();
      });
    };
    drawCloud(105, 92, 1.05);
    drawCloud(395, 76, 1.15);
    drawCloud(258, 146, 0.85);
    drawCloud(72, 195, 0.75);
    drawCloud(438, 188, 0.82);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  static studioFocusBackdrop() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(256, 230, 40, 256, 256, 360);
    g.addColorStop(0, '#FFFDF7');
    g.addColorStop(0.58, '#E6F4FB');
    g.addColorStop(1, '#BBD9EE');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  static stripedAwning(accentHex = '#E05A47', creamHex = '#FFFDF9') {
    return this.create((ctx, w, h) => {
      const sw = 32;
      for (let x = 0; x < w; x += sw) {
        ctx.fillStyle = (x / sw) % 2 === 0 ? accentHex : creamHex;
        ctx.fillRect(x, 0, sw, h);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ctx.fillRect(0, 0, w, h * 0.3);
    }, 2, 1, 256, 128);
  }

  static podiumPaverTile() {
    return this.create((ctx, w, h) => {
      ctx.fillStyle = '#CFC3B4'; ctx.fillRect(0, 0, w, h);
      const pavers = ['#F7F2EA', '#EFE7DC', '#E8DDD0'];
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          ctx.fillStyle = pavers[(r + c) % pavers.length];
          ctx.beginPath(); ctx.roundRect(c * 64 + 3, r * 64 + 3, 58, 58, 8); ctx.fill();
        }
      }
    }, 4, 2, 256, 256);
  }

  static pastelBrickTile(bgHex = '#FFFDF9', tones = ['#FFFDF7', '#FBEBE4', '#F6D7CC'], mortarHex = '#E6CFC3') {
    return this.create((ctx, w, h) => {
      ctx.fillStyle = mortarHex; ctx.fillRect(0, 0, w, h);
      for (let r = 0; r < 8; r++) {
        const off = (r % 2) * 48;
        for (let c = -1; c < 6; c++) {
          const bx = c * 96 + off + 4;
          const by = r * 64 + 4;
          ctx.fillStyle = tones[(r * 2 + c + 6) % tones.length];
          ctx.beginPath(); ctx.roundRect(bx, by, 88, 56, 11); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.36)';
          ctx.fillRect(bx + 6, by + 4, 76, 8);
        }
      }
    }, 3, 2.5, 512, 512);
  }

  static cloverMeadow() {
    return this.create((ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#C5E6C6'); grad.addColorStop(0.5, '#B7DFBA'); grad.addColorStop(1, '#ABD8B0');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 95; i++) {
        const gx = (i * 83) % w;
        const gy = (i * 127) % h;
        ctx.fillStyle = i % 2 === 0 ? '#CEEBD0' : '#9DCBA3';
        ctx.beginPath(); ctx.arc(gx, gy, 7 + (i % 5), 0, Math.PI * 2); ctx.fill();
        if (i % 9 === 0) {
          ctx.fillStyle = i % 18 === 0 ? '#FFFDF7' : '#FFD93D';
          ctx.beginPath(); ctx.arc(gx + 4, gy - 3, 3.2, 0, Math.PI * 2); ctx.fill();
        }
      }
    }, 9, 9, 512, 512);
  }

  static streamWater() {
    return this.create((ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#9ED8EC'); g.addColorStop(1, '#73BEDA');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.62)'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      for (let i = 0; i < 10; i++) {
        const x = (i * 53) % (w - 40); const y = (i * 37) % h;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 18, y - 6, x + 36, y); ctx.stroke();
      }
    }, 3, 2, 256, 256);
  }

  static woodenSignEmblem() {
    return this.create((ctx, w, h) => {
      ctx.fillStyle = '#FFF8E3'; ctx.beginPath(); ctx.roundRect(6, 6, w - 12, h - 12, 24); ctx.fill();
      ctx.strokeStyle = '#4A3B32'; ctx.lineWidth = 8; ctx.stroke();
      ctx.fillStyle = '#E05A47';
      ctx.beginPath(); ctx.moveTo(w * 0.27, h * 0.56); ctx.lineTo(w * 0.5, h * 0.22); ctx.lineTo(w * 0.73, h * 0.56); ctx.closePath(); ctx.fill();
    }, 1, 1, 256, 160);
  }

  static softContactShadow() {
    return this.create((ctx, s) => {
      const g = ctx.createRadialGradient(s / 2, s / 2, s * 0.08, s / 2, s / 2, s * 0.48);
      g.addColorStop(0, 'rgba(65, 44, 32, 0.34)');
      g.addColorStop(0.65, 'rgba(75, 52, 38, 0.14)');
      g.addColorStop(1, 'rgba(75, 52, 38, 0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
    }, 1, 1, 128, 128);
  }

  static buildingGroundAO() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.save(); ctx.filter = 'blur(16px)';
    ctx.fillStyle = 'rgba(55, 38, 28, 0.44)';
    ctx.beginPath(); ctx.roundRect(24, 24, 208, 208, 36); ctx.fill();
    ctx.restore();
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
}

function initSharedResources() {
  TEX.skyBackdrop = TextureGenerator.pastelSkyBackdrop();
  TEX.studioBackdrop = TextureGenerator.studioFocusBackdrop();
  TEX.shadow = TextureGenerator.softContactShadow();
  TEX.buildingAO = TextureGenerator.buildingGroundAO();
  TEX.meadow = TextureGenerator.cloverMeadow();
  TEX.water = TextureGenerator.streamWater();
  TEX.podiumDeck = TextureGenerator.podiumPaverTile();

  // 거리 인프라 텍스처
  TEX.asphaltH = TextureGenerator.asphaltRoadHorizontal(11);
  TEX.asphaltV = TextureGenerator.asphaltRoadVertical(5);
  TEX.crosswalk = TextureGenerator.crosswalkZebra();
  TEX.curbNoParking = TextureGenerator.redNoParkingCurb(10);
  TEX.sidewalkH = TextureGenerator.warmSidewalkGrid(14, 2);
  TEX.sidewalkV = TextureGenerator.warmSidewalkGrid(2, 6);
  TEX.plazaCobble = TextureGenerator.europeanPlazaCobble();

  TEX.signNoParking = createStreetSignTexture('no_parking');
  TEX.signTodaysCake = createStreetSignTexture('todays_cake');
  TEX.signTransit = createStreetSignTexture('transit_sign');
  TEX.signLampBanner = createStreetSignTexture('lamp_banner');
  TEX.signVipParking = createStreetSignTexture('vip_parking');

  TEX.brickWarm = TextureGenerator.pastelBrickTile('#FFFDF7', ['#FFFDF7', '#FCF0EB', '#F7DDD4', '#F3C7BA'], '#E6CEC4');
  TEX.brickMint = TextureGenerator.pastelBrickTile('#FFFDF7', ['#FFFDF7', '#FBF4E6', '#F6E4BE', '#F0D098'], '#E3CEB0');
  TEX.brickCream = TextureGenerator.pastelBrickTile('#FFFDF7', ['#FFFDF7', '#F8F1E8', '#F0E4D5'], '#DDD0C0');

  TEX.floor1 = TextureGenerator.herringboneWood('maple');
  TEX.floor2 = TextureGenerator.herringboneWood('oak');
  TEX.floor3 = TextureGenerator.herringboneWood('royal');
  TEX.boucleCoral = TextureGenerator.wovenBoucleRug('#FFB8CA', '#FFE0E8');
  TEX.boucleButter = TextureGenerator.wovenBoucleRug('#FFE58F', '#FFF6CC');

  TEX.wallSage = TextureGenerator.pastelStripeWallpaper('#C2DEC8', '#B1D3B9', '#82AE8D', '#DFBE9B');
  TEX.wallLavender = TextureGenerator.pastelStripeWallpaper('#D8CCF0', '#C6B7E6', '#9D88CC', '#E2C4A4');
  TEX.wallButter = TextureGenerator.pastelStripeWallpaper('#F6DE9C', '#EECF82', '#C99E48', '#DFBE9B');
  TEX.wallPeach = TextureGenerator.pastelStripeWallpaper('#F4CCB6', '#EABAA0', '#C98C6E', '#E2C4A4');

  TEX.awningCoral = TextureGenerator.stripedAwning('#E05A47', '#FFFDF9');
  TEX.awningSky = TextureGenerator.stripedAwning('#0284C7', '#FFFDF9');
  TEX.awningBrown = TextureGenerator.stripedAwning('#6F3B1B', '#FFF8EB');
  TEX.awningForest = TextureGenerator.stripedAwning('#1B4332', '#FFFDF9');
  TEX.awningLavender = TextureGenerator.stripedAwning('#7E5A9B', '#FFFDF9');
  TEX.signEmblem = TextureGenerator.woodenSignEmblem();

  TEX.dashMint = TextureGenerator.dashedFocusStrip('#059669', '#FFFFFF');
  TEX.dashGold = TextureGenerator.dashedFocusStrip('#F59E0B', '#FFFFFF');

  TEX.martSign = createShopSignboardTexture('mart');
  TEX.washSign = createShopSignboardTexture('wash');
  TEX.cafeSign = createShopSignboardTexture('cafe');
  TEX.patisserieSign = createShopSignboardTexture('patisserie');
  TEX.roasterySign = createShopSignboardTexture('roastery');
  TEX.floresSign = createShopSignboardTexture('flores');
  TEX.blade24 = createBladeNeon24Texture();

  GEO.sphere = new THREE.SphereGeometry(0.5, 20, 16);
  GEO.cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 20);
  GEO.torus = new THREE.TorusGeometry(0.38, 0.13, 14, 24);
  GEO.quad = new THREE.PlaneGeometry(1, 1);
  GEO.coin = new THREE.CylinderGeometry(0.24, 0.24, 0.08, 18);
  GEO.coin.rotateX(Math.PI / 2);
  GEO.ring = new THREE.RingGeometry(0.32, 0.64, 28);

  MAT.toonEdge = new THREE.LineBasicMaterial({ color: 0x4A3B32, transparent: true, opacity: 0.8 });
  MAT.toonHull = new THREE.MeshBasicMaterial({ color: 0x3A2820, side: THREE.BackSide, transparent: true, opacity: 0.88 });
  MAT.walnutTrim = makeClayMat(0x4A3B32, { roughness: 0.48, emissiveIntensity: 0.06 });
  MAT.castIron = makeClayMat(0x22262E, { metalness: 0.35, roughness: 0.38, emissiveIntensity: 0.03 });
  MAT.transitTeal = makeClayMat(0x0F766E, { metalness: 0.2, roughness: 0.36 });
  MAT.parasolGreen = makeClayMat(0x15803D, { roughness: 0.52, emissiveIntensity: 0.08 });
  MAT.hydrantRed = makeClayMat(0xDC2626, { roughness: 0.36, metalness: 0.15 });
  MAT.supercarRed = makeClayMat(0xEF233C, { roughness: 0.22, metalness: 0.28, emissive: 0x9B0014, emissiveIntensity: 0.18 });
  MAT.limoCream = makeClayMat(0xFFFDF5, { roughness: 0.24, metalness: 0.18 });
  MAT.podiumStone = makeClayMat(0x6D5D53, { roughness: 0.68, emissiveIntensity: 0.05 });
  MAT.fountainStone = makeClayMat(0xDFD5C8, { roughness: 0.58, emissiveIntensity: 0.08 });
  MAT.podiumDeck = makeClayMat(0xFFFFFF, { map: TEX.podiumDeck, roughness: 0.62, emissiveIntensity: 0.06 });
  MAT.buildingAO = new THREE.MeshBasicMaterial({ map: TEX.buildingAO, transparent: true, depthWrite: false });

  MAT.terracottaCoral = makeClayMat(0xF28482, { roughness: 0.45 });
  MAT.butterOak = makeClayMat(0xF6BD60, { roughness: 0.44 });
  MAT.roofBrickCoral = makeClayMat(0xE05A47, { roughness: 0.46 });
  MAT.roofRoyalNavy = makeClayMat(0x3D5A80, { roughness: 0.46, coolShadow: true });
  MAT.roofForest = makeClayMat(0x2D6A4F, { roughness: 0.48 });
  MAT.roofPlum = makeClayMat(0x6D597A, { roughness: 0.48, coolShadow: true });

  MAT.roomGridGold = makeClayMat(0xF6BD60, { emissive: 0xFFB703, emissiveIntensity: 0.26, roughness: 0.36 });
  MAT.roomGridCream = makeClayMat(0xFFFDF9, { roughness: 0.42 });
  MAT.neonYellow = makeClayMat(0xFDE047, { emissive: 0xFFB703, emissiveIntensity: 0.9, roughness: 0.18 });
  MAT.neonCoral = makeClayMat(0xFF6B8B, { emissive: 0xE05A47, emissiveIntensity: 0.78, roughness: 0.2 });
  MAT.ovenFire = makeClayMat(0xFF4500, { emissive: 0xFF5722, emissiveIntensity: 1.15, roughness: 0.2 });

  MAT.dashBorderMint = new THREE.MeshBasicMaterial({ map: TEX.dashMint, transparent: true, opacity: 0.94 });
  MAT.dashBorderGold = new THREE.MeshBasicMaterial({ map: TEX.dashGold, transparent: true, opacity: 0.96 });
  animatedDashMaterials.push(MAT.dashBorderMint, MAT.dashBorderGold);

  MAT.shadow = new THREE.MeshBasicMaterial({ map: TEX.shadow, transparent: true, depthWrite: false });
  MAT.slab = makeClayMat(0xFFFDF9, { roughness: 0.48 });
  MAT.basePadCream = makeClayMat(0xF6EFE6, { roughness: 0.55 });
  MAT.woodLight = makeClayMat(0xEBB986);
  MAT.woodWarm = makeClayMat(0xC6834B);
  MAT.woodDark = makeClayMat(0x6F4528);
  MAT.paperBag = makeClayMat(0xC89B6E, { roughness: 0.72 });
  MAT.leatherCamel = makeClayMat(0x9A582C, { roughness: 0.34 });
  MAT.white = makeClayMat(0xFFFDF9, { roughness: 0.44 });
  MAT.cream = makeClayMat(0xFFF6EC);
  MAT.coral = makeClayMat(0xF28482, { roughness: 0.46 });
  MAT.redPost = makeClayMat(0xE05A47, { roughness: 0.44 });
  MAT.appleRed = makeClayMat(0xEF233C, { roughness: 0.35 });
  MAT.orangeFruit = makeClayMat(0xFB8500, { roughness: 0.4 });
  MAT.pinkSoft = makeClayMat(0xFFB8CA);
  MAT.rugCoral = makeClayMat(0xFFFFFF, { map: TEX.boucleCoral, roughness: 0.78 });
  MAT.rugButter = makeClayMat(0xFFFFFF, { map: TEX.boucleButter, roughness: 0.78 });
  MAT.canopyLace = new THREE.MeshStandardMaterial({
    color: 0xFFD6E4, emissive: 0xFFB3C6, emissiveIntensity: 0.22,
    transparent: true, opacity: 0.68, roughness: 0.35, side: THREE.DoubleSide
  });
  MAT.partitionGlass = new THREE.MeshStandardMaterial({
    color: 0xE0F2FE, emissive: 0xBAE6FD, emissiveIntensity: 0.25,
    transparent: true, opacity: 0.46, roughness: 0.14, metalness: 0.1, side: THREE.DoubleSide
  });
  MAT.clearWindowGlass = new THREE.MeshStandardMaterial({
    color: 0xE8F8FF, emissive: 0xBAE6FD, emissiveIntensity: 0.18,
    transparent: true, opacity: 0.32, roughness: 0.1, metalness: 0.08
  });
  MAT.mint = makeClayMat(0x34D399);
  MAT.mintSoft = makeClayMat(0xA7F3D0);
  MAT.sky = makeClayMat(0x4EA8DE, { coolShadow: true });
  MAT.butter = makeClayMat(0xF6BD60, { roughness: 0.44 });
  MAT.duckYellow = makeClayMat(0xFFE14D, { roughness: 0.4 });
  MAT.orangeBill = makeClayMat(0xFF8C42, { roughness: 0.45 });
  MAT.lavender = makeClayMat(0xC8B6FF, { coolShadow: true });
  MAT.purpleDark = makeClayMat(0x6D28D9, { coolShadow: true });
  MAT.charcoal = makeClayMat(0x3B302A, { roughness: 0.5, emissiveIntensity: 0.08 });
  MAT.ironSteel = makeClayMat(0x475569, { metalness: 0.3, roughness: 0.38, coolShadow: true });
  MAT.silver = makeClayMat(0xE2E8F0, { metalness: 0.25, roughness: 0.32, coolShadow: true });
  MAT.gold = makeClayMat(0xFFD43B, { metalness: 0.24, roughness: 0.28, emissive: 0xFFB703, emissiveIntensity: 0.32 });
  MAT.glass = new THREE.MeshStandardMaterial({
    color: 0xFFEBC2, emissive: 0xFFB703, emissiveIntensity: 0.36,
    transparent: true, opacity: 0.54, roughness: 0.14, metalness: 0.08
  });
  MAT.screenCyan = makeClayMat(0x56CCF2, { emissive: 0x38BDF8, emissiveIntensity: 0.82, roughness: 0.22 });
  MAT.screenPurple = makeClayMat(0xD8B4FE, { emissive: 0xA855F7, emissiveIntensity: 0.85, roughness: 0.22 });
  MAT.screenPink = makeClayMat(0xFF9BB0, { emissive: 0xFF5C7A, emissiveIntensity: 0.85, roughness: 0.22 });
  MAT.movingBox = makeClayMat(0xE2AC76);
  MAT.trashBag = makeClayMat(0x4B4453, { coolShadow: true });
  MAT.pizzaBox = makeClayMat(0xF8B466);

  MAT.leafGreen = makeClayMat(0x8EBA9B, { roughness: 0.68, emissiveIntensity: 0.08 });
  MAT.cloverGreen = makeClayMat(0x63A877, { roughness: 0.62, emissiveIntensity: 0.08 });
  MAT.sakuraPink = makeClayMat(0xE8BEC9, { roughness: 0.65, emissiveIntensity: 0.1 });
  MAT.cloudWhite = makeClayMat(0xFAF8F5, { emissive: 0xF3ECE4, emissiveIntensity: 0.18, roughness: 0.7 });
  MAT.coin = MAT.gold;

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      TEX.martSign = createShopSignboardTexture('mart');
      TEX.washSign = createShopSignboardTexture('wash');
      TEX.cafeSign = createShopSignboardTexture('cafe');
      TEX.patisserieSign = createShopSignboardTexture('patisserie');
      TEX.roasterySign = createShopSignboardTexture('roastery');
      TEX.floresSign = createShopSignboardTexture('flores');
      TEX.blade24 = createBladeNeon24Texture();

      signMaterialsToRefresh.forEach((entry) => {
        if (entry.kind === 'mart') entry.mat.map = TEX.martSign;
        else if (entry.kind === 'wash') entry.mat.map = TEX.washSign;
        else if (entry.kind === 'cafe') entry.mat.map = TEX.cafeSign;
        else if (entry.kind === 'patisserie') entry.mat.map = TEX.patisserieSign;
        else if (entry.kind === 'roastery') entry.mat.map = TEX.roasterySign;
        else if (entry.kind === 'flores') entry.mat.map = TEX.floresSign;
        else if (entry.kind === 'blade24') entry.mat.map = TEX.blade24;
        else if (entry.kind === 'roomPlate') entry.mat.map = createRoomNumberPlateTexture(entry.numStr, entry.typeLabel, entry.unlocked);
        entry.mat.needsUpdate = true;
      });

      Object.keys(state.buildings).forEach((lid) => refreshBuildingNameplates3D(lid));
    });
  }
}


// =========================================================
// 4. 스트리트 소품 · 어닝 · 간판 · 포커스 링 · 슈퍼카 · 단독 상가 3D 빌더
// =========================================================
function createScallopedAwning3D(width, style = 'coral') {
  const grp = new THREE.Group();
  const texMap = {
    coral: TEX.awningCoral,
    sky: TEX.awningSky,
    brown: TEX.awningBrown,
    mint: TEX.awningForest,
    lavender: TEX.awningLavender
  };
  const accentHexMap = {
    coral: 0xE05A47,
    sky: 0x0284C7,
    brown: 0x6F3B1B,
    mint: 0x1B4332,
    lavender: 0x7E5A9B
  };
  const stripeTex = texMap[style] || TEX.awningCoral;
  const accentMat = makeClayMat(accentHexMap[style] || 0xE05A47, { roughness: 0.48 });
  const slopeMat = makeClayMat(0xFFFFFF, { map: stripeTex, roughness: 0.5 });

  const slope = createRoundedToyMesh(width, 0.14, 1.32, slopeMat, 0, 0.18, 0.52, 0.05);
  slope.rotation.x = 0.36;
  grp.add(slope);

  const count = Math.max(5, Math.floor(width / 0.52));
  const step = width / count;
  for (let i = 0; i < count; i++) {
    const valMat = i % 2 === 0 ? accentMat : MAT.white;
    const flap = new THREE.Mesh(GEO.cyl, valMat);
    flap.scale.set(step * 0.94, 0.12, 0.28);
    flap.rotation.x = Math.PI / 2;
    flap.position.set(-width * 0.5 + step * (i + 0.5), -0.08, 1.12);
    grp.add(flap);
  }
  return grp;
}

function createFramedSignboard3D(width, height, kind) {
  const grp = new THREE.Group();
  grp.add(createRoundedToyMesh(width + 0.22, height + 0.2, 0.16, MAT.walnutTrim, 0, 0, 0, 0.08));

  const texLookup = {
    mart: TEX.martSign,
    wash: TEX.washSign,
    cafe: TEX.cafeSign,
    patisserie: TEX.patisserieSign,
    roastery: TEX.roasterySign,
    flores: TEX.floresSign
  };
  const faceMat = new THREE.MeshStandardMaterial({
    map: texLookup[kind] || TEX.martSign,
    roughness: 0.34,
    emissive: 0xFFF3D6,
    emissiveIntensity: 0.14
  });
  signMaterialsToRefresh.push({ kind, mat: faceMat });

  const face = new THREE.Mesh(GEO.quad, faceMat);
  face.scale.set(width, height, 1);
  face.position.set(0, 0, 0.095);
  grp.add(face);
  return grp;
}

function create3DStoreMascot(kind) {
  const grp = new THREE.Group();
  if (kind === 'mart') {
    const cup = new THREE.Mesh(GEO.cyl, MAT.coral);
    cup.scale.set(0.56, 0.68, 0.56);
    cup.position.y = 0.34;
    addToonHullOutline(cup, 1.07);
    grp.add(cup);
    const lid = new THREE.Mesh(getPuffyDomeGeo(0.32, 0.22), MAT.white);
    lid.position.y = 0.72;
    grp.add(lid);
    const straw = new THREE.Mesh(GEO.cyl, MAT.neonYellow);
    straw.scale.set(0.08, 0.45, 0.08);
    straw.position.set(0.1, 0.92, 0);
    straw.rotation.z = -0.25;
    grp.add(straw);
  } else if (kind === 'wash') {
    const body = createRoundedToyMesh(0.68, 0.74, 0.48, MAT.white, 0, 0.37, 0, 0.12);
    grp.add(body);
    const drum = new THREE.Mesh(GEO.torus, MAT.sky);
    drum.scale.setScalar(0.52);
    drum.position.set(0, 0.36, 0.26);
    grp.add(drum);
  } else if (kind === 'bakery') {
    // 골든 크루아상 조형물
    const cMain = new THREE.Mesh(GEO.torus, MAT.gold);
    cMain.scale.set(0.85, 0.68, 0.85);
    cMain.rotation.z = Math.PI * 0.15;
    cMain.position.set(0, 0.38, 0);
    addToonHullOutline(cMain, 1.06);
    grp.add(cMain);
  } else if (kind === 'roastery') {
    // 대형 에스프레소 머그컵 + 김
    const mug = new THREE.Mesh(GEO.cyl, MAT.walnutTrim);
    mug.scale.set(0.62, 0.56, 0.62);
    mug.position.y = 0.28;
    addToonHullOutline(mug, 1.06);
    grp.add(mug);
    const crema = new THREE.Mesh(GEO.cyl, MAT.butter);
    crema.scale.set(0.54, 0.08, 0.54);
    crema.position.y = 0.55;
    grp.add(crema);
    const handle = new THREE.Mesh(GEO.torus, MAT.walnutTrim);
    handle.scale.set(0.38, 0.38, 0.38);
    handle.position.set(0.34, 0.3, 0);
    grp.add(handle);
  } else if (kind === 'flower') {
    // 핑크 튤립 화분 조형물
    const pot = new THREE.Mesh(GEO.cyl, MAT.terracottaCoral);
    pot.scale.set(0.5, 0.44, 0.5);
    pot.position.y = 0.22;
    grp.add(pot);
    const bloom = new THREE.Mesh(getPuffyDomeGeo(0.34, 0.46), MAT.pinkSoft);
    bloom.position.y = 0.58;
    addToonHullOutline(bloom, 1.06);
    grp.add(bloom);
  }
  return grp;
}

function createHoverFocusRing3D() {
  const grp = new THREE.Group();
  hoverRingMat = new THREE.MeshBasicMaterial({
    color: 0x34D399,
    transparent: true,
    opacity: 0.82,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.8, 4.35, 36), hoverRingMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.28;
  grp.add(ring);
  grp.visible = false;
  return grp;
}

function createSelectedRoomFrame3D() {
  const grp = new THREE.Group();
  const barMat = MAT.roomGridGold;
  const top = createRoundedToyMesh(1, 0.14, 0.16, barMat, 0, 0.5, 0, 0.04, false, false, false);
  const bot = createRoundedToyMesh(1, 0.14, 0.16, barMat, 0, -0.5, 0, 0.04, false, false, false);
  const left = createRoundedToyMesh(0.14, 1, 0.16, barMat, -0.5, 0, 0, 0.04, false, false, false);
  const right = createRoundedToyMesh(0.14, 1, 0.16, barMat, 0.5, 0, 0, 0.04, false, false, false);
  grp.userData = { top, bot, left, right };
  grp.add(top, bot, left, right);
  grp.visible = false;
  return grp;
}

function updateSelectedRoomFrame3D(room) {
  if (!selectedRoomFrameGroup) return;
  if (!room) {
    selectedRoomFrameGroup.visible = false;
    return;
  }
  const lot = state.lots.find((l) => l.lotId === room.lotId);
  if (!lot) {
    selectedRoomFrameGroup.visible = false;
    return;
  }
  const { top, bot, left, right } = selectedRoomFrameGroup.userData;
  top.scale.set(room.rw + 0.2, 1, 1);
  top.position.set(0, room.rh + 0.06, 0);
  bot.scale.set(room.rw + 0.2, 1, 1);
  bot.position.set(0, -0.04, 0);
  left.scale.set(1, room.rh + 0.16, 1);
  left.position.set(-room.rw * 0.5 - 0.06, room.rh * 0.5, 0);
  right.scale.set(1, room.rh + 0.16, 1);
  right.position.set(room.rw * 0.5 + 0.06, room.rh * 0.5, 0);

  selectedRoomFrameGroup.position.set(
    lot.x + room.lx,
    room.ly,
    lot.z + room.lz + room.rd * 0.5 + 0.18
  );
  selectedRoomFrameGroup.visible = true;
}

// --------------------- 나무 · 가로수 · 구름 · 스트리트 퍼니처 8종 빌더 ---------------------
function createBoulevardTree3D(scale = 1.0, sakura = false) {
  const grp = new THREE.Group();
  const shadow = new THREE.Mesh(GEO.quad, MAT.shadow);
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(2.3 * scale, 2.3 * scale, 1);
  shadow.position.y = 0.02;
  grp.add(shadow);

  // 원형 석조 가로수 화단 테두리
  const planter = new THREE.Mesh(GEO.cyl, MAT.fountainStone);
  planter.scale.set(1.15 * scale, 0.22, 1.15 * scale);
  planter.position.y = 0.11;
  grp.add(planter);

  const trunk = new THREE.Mesh(GEO.cyl, MAT.woodDark);
  trunk.scale.set(0.34 * scale, 1.65 * scale, 0.34 * scale);
  trunk.position.y = 0.92 * scale;
  trunk.castShadow = true;
  addToonHullOutline(trunk, 1.06);
  grp.add(trunk);

  const leafMat = sakura ? MAT.sakuraPink : MAT.leafGreen;
  const subLeafMat = sakura ? MAT.pinkSoft : MAT.cloverGreen;
  const puffs = [
    [0, 2.05, 0, 1.08, leafMat],
    [-0.55, 1.72, 0.28, 0.78, subLeafMat],
    [0.58, 1.76, -0.22, 0.82, leafMat],
    [0.12, 2.48, 0.12, 0.72, subLeafMat]
  ];
  for (const [px, py, pz, r, m] of puffs) {
    const crown = new THREE.Mesh(getPuffyDomeGeo(r * scale, r * 1.18 * scale), m);
    crown.position.set(px * scale, py * scale, pz * scale);
    crown.castShadow = true;
    addToonHullOutline(crown, 1.05);
    grp.add(crown);
  }
  return grp;
}

function createParkBench3D(rotY = 0) {
  const grp = new THREE.Group();
  const legL = createRoundedToyMesh(0.14, 0.46, 0.62, MAT.castIron, -0.82, 0.23, 0, 0.04);
  const legR = createRoundedToyMesh(0.14, 0.46, 0.62, MAT.castIron, 0.82, 0.23, 0, 0.04);
  const seat = createRoundedToyMesh(1.92, 0.1, 0.56, MAT.woodWarm, 0, 0.46, 0.03, 0.04);
  const back = createRoundedToyMesh(1.92, 0.46, 0.09, MAT.woodLight, 0, 0.78, -0.22, 0.04);
  back.rotation.x = -0.14;
  grp.add(legL, legR, seat, back);
  grp.rotation.y = rotY;
  return grp;
}

// 1) 빨간 원형 사선 NO PARKING 철제 표지판
function createNoParkingSign3D() {
  const grp = new THREE.Group();
  const base = new THREE.Mesh(GEO.cyl, MAT.castIron);
  base.scale.set(0.36, 0.1, 0.36);
  base.position.y = 0.05;
  const pole = new THREE.Mesh(GEO.cyl, MAT.ironSteel);
  pole.scale.set(0.08, 2.15, 0.08);
  pole.position.y = 1.08;
  pole.castShadow = true;

  const signDisc = new THREE.Mesh(GEO.cyl, MAT.white);
  signDisc.scale.set(0.76, 0.06, 0.76);
  signDisc.rotation.x = Math.PI / 2;
  signDisc.position.set(0, 2.18, 0);
  addToonHullOutline(signDisc, 1.06);

  const faceMat = new THREE.MeshBasicMaterial({ map: TEX.signNoParking, transparent: true });
  const front = new THREE.Mesh(GEO.quad, faceMat);
  front.scale.set(0.78, 0.78, 1);
  front.position.set(0, 2.18, 0.042);
  const back = new THREE.Mesh(GEO.quad, faceMat);
  back.scale.set(0.78, 0.78, 1);
  back.rotation.y = Math.PI;
  back.position.set(0, 2.18, -0.042);

  grp.add(base, pole, signDisc, front, back);
  return grp;
}

// 2) 귀여운 빨간색 소화전(Fire Hydrant)
function createFireHydrant3D() {
  const grp = new THREE.Group();
  const base = new THREE.Mesh(GEO.cyl, MAT.hydrantRed);
  base.scale.set(0.46, 0.14, 0.46);
  base.position.y = 0.07;

  const body = new THREE.Mesh(GEO.cyl, MAT.hydrantRed);
  body.scale.set(0.36, 0.74, 0.36);
  body.position.y = 0.46;
  body.castShadow = true;
  addToonHullOutline(body, 1.07);

  const dome = new THREE.Mesh(getPuffyDomeGeo(0.22, 0.24), MAT.hydrantRed);
  dome.position.y = 0.88;

  const topNut = new THREE.Mesh(GEO.cyl, MAT.silver);
  topNut.scale.set(0.11, 0.12, 0.11);
  topNut.position.y = 1.03;

  const nozzleL = new THREE.Mesh(GEO.cyl, MAT.silver);
  nozzleL.scale.set(0.14, 0.16, 0.14);
  nozzleL.rotation.z = Math.PI / 2;
  nozzleL.position.set(-0.22, 0.58, 0);

  const nozzleR = nozzleL.clone();
  nozzleR.position.set(0.22, 0.58, 0);

  const nozzleF = new THREE.Mesh(GEO.cyl, MAT.gold);
  nozzleF.scale.set(0.17, 0.16, 0.17);
  nozzleF.rotation.x = Math.PI / 2;
  nozzleF.position.set(0, 0.54, 0.22);

  grp.add(base, body, dome, topNut, nozzleL, nozzleR, nozzleF);
  return grp;
}

// 3) 유리 지붕 버스 정류장 부스 (MINIMI TRANSIT)
function createBusStopBooth3D() {
  const grp = new THREE.Group();
  // 바닥 플랫폼
  grp.add(createRoundedToyMesh(4.4, 0.12, 2.2, MAT.podiumStone, 0, 0.06, 0, 0.06));

  // 청록색 철제 프레임 기둥 4개
  const posts = [
    [-1.95, 1.45, -0.88],
    [1.95, 1.45, -0.88],
    [-1.95, 1.45, 0.72],
    [1.95, 1.45, 0.72]
  ];
  for (const [px, py, pz] of posts) {
    grp.add(createRoundedToyMesh(0.14, 2.8, 0.14, MAT.transitTeal, px, py, pz, 0.04));
  }

  // 뒷면 투명 강화유리 벽 & 좌측 유리 벽
  const backGlass = new THREE.Mesh(GEO.quad, MAT.partitionGlass);
  backGlass.scale.set(3.75, 2.35, 1);
  backGlass.position.set(0, 1.42, -0.88);
  grp.add(backGlass);

  const sideGlass = new THREE.Mesh(GEO.quad, MAT.partitionGlass);
  sideGlass.scale.set(1.52, 2.35, 1);
  sideGlass.rotation.y = Math.PI / 2;
  sideGlass.position.set(-1.95, 1.42, -0.08);
  grp.add(sideGlass);

  // 우측 노선도 게시판 박스
  grp.add(createRoundedToyMesh(0.14, 1.75, 1.28, MAT.transitTeal, 1.95, 1.45, -0.08, 0.04));
  const mapBoard = new THREE.Mesh(GEO.quad, new THREE.MeshBasicMaterial({ map: TEX.signTransit }));
  mapBoard.scale.set(1.1, 0.62, 1);
  mapBoard.rotation.y = -Math.PI / 2;
  mapBoard.position.set(1.86, 1.56, -0.08);
  grp.add(mapBoard);

  // 유리 지붕 아치 캐노피 + 청록색 테두리 + 상단 MINIMI TRANSIT 간판
  grp.add(createRoundedToyMesh(4.35, 0.16, 2.15, MAT.transitTeal, 0, 2.88, -0.04, 0.06));
  const roofGlass = createRoundedToyMesh(3.95, 0.1, 1.85, MAT.partitionGlass, 0, 2.95, -0.04, 0.04, false, false, false);
  grp.add(roofGlass);

  const headerMat = new THREE.MeshBasicMaterial({ map: TEX.signTransit });
  const headerFront = new THREE.Mesh(GEO.quad, headerMat);
  headerFront.scale.set(2.85, 0.68, 1);
  headerFront.position.set(0, 3.28, 0.92);
  grp.add(createRoundedToyMesh(2.96, 0.78, 0.14, MAT.transitTeal, 0, 3.28, 0.85, 0.05));
  grp.add(headerFront);

  // 대기용 원목 벤치
  const bench = createRoundedToyMesh(2.5, 0.12, 0.48, MAT.woodWarm, -0.25, 0.56, -0.52, 0.04);
  const bLeg1 = createRoundedToyMesh(0.14, 0.48, 0.4, MAT.transitTeal, -1.15, 0.28, -0.52, 0.03);
  const bLeg2 = createRoundedToyMesh(0.14, 0.48, 0.4, MAT.transitTeal, 0.65, 0.28, -0.52, 0.03);
  grp.add(bench, bLeg1, bLeg2);

  return grp;
}

// 4) 클래식 주철 가로등 & MINIMI TOWN 깃발 배너
function createVintageBannerLamp3D(bannerSide = 1) {
  const grp = new THREE.Group();
  const pedestal = new THREE.Mesh(GEO.cyl, MAT.castIron);
  pedestal.scale.set(0.46, 0.34, 0.46);
  pedestal.position.y = 0.17;

  const pole = new THREE.Mesh(GEO.cyl, MAT.castIron);
  pole.scale.set(0.13, 3.65, 0.13);
  pole.position.y = 1.98;
  pole.castShadow = true;

  // 상단 랜턴 글로브
  const cap = new THREE.Mesh(GEO.cyl, MAT.castIron);
  cap.scale.set(0.44, 0.12, 0.44);
  cap.position.y = 3.82;
  const globe = new THREE.Mesh(GEO.sphere, MAT.neonYellow);
  globe.scale.setScalar(0.54);
  globe.position.y = 4.08;
  const finial = new THREE.Mesh(getPuffyDomeGeo(0.24, 0.22), MAT.castIron);
  finial.position.y = 4.36;

  // 기둥 가로 배너 암 + MINIMI TOWN 배너 깃발
  const arm = createRoundedToyMesh(0.76, 0.07, 0.07, MAT.gold, 0.38 * bannerSide, 3.18, 0, 0.02);
  const bannerMat = new THREE.MeshBasicMaterial({ map: TEX.signLampBanner, side: THREE.DoubleSide });
  const banner = new THREE.Mesh(GEO.quad, bannerMat);
  banner.scale.set(0.62, 1.24, 1);
  banner.position.set(0.42 * bannerSide, 2.52, 0);

  grp.add(pedestal, pole, cap, globe, finial, arm, banner);
  return grp;
}

// 5) 클래식 레드 우체통
function createRedPostbox3D() {
  const grp = new THREE.Group();
  const body = createRoundedToyMesh(0.66, 1.24, 0.56, MAT.hydrantRed, 0, 0.62, 0, 0.14);
  const dome = new THREE.Mesh(getPuffyDomeGeo(0.35, 0.3), MAT.hydrantRed);
  dome.position.y = 1.28;
  const slot = createRoundedToyMesh(0.42, 0.09, 0.08, MAT.charcoal, 0, 1.02, 0.28, 0.02);
  const badge = createRoundedToyMesh(0.36, 0.22, 0.05, MAT.gold, 0, 0.72, 0.28, 0.03);
  grp.add(body, dome, slot, badge);
  return grp;
}

// 6) 초록색 신문 가판대 (Newspaper Stand)
function createNewspaperStand3D() {
  const grp = new THREE.Group();
  const cabinet = createRoundedToyMesh(0.95, 1.18, 0.68, MAT.roofForest, 0, 0.59, 0, 0.08);
  const roof = createRoundedToyMesh(1.08, 0.16, 0.82, MAT.parasolGreen, 0, 1.22, 0.04, 0.05);
  roof.rotation.x = 0.16;
  // 신문 더미 2단
  const paper1 = createRoundedToyMesh(0.36, 0.16, 0.42, MAT.white, -0.2, 0.82, 0.24, 0.03);
  const paper2 = createRoundedToyMesh(0.36, 0.16, 0.42, MAT.cream, 0.2, 0.82, 0.24, 0.03);
  const windowPane = new THREE.Mesh(GEO.quad, MAT.clearWindowGlass);
  windowPane.scale.set(0.76, 0.42, 1);
  windowPane.position.set(0, 0.85, 0.35);
  grp.add(cabinet, roof, paper1, paper2, windowPane);
  return grp;
}

// 7) 자전거 거치대 + 파스텔 미니 자전거 2대
function createBikeRack3D() {
  const grp = new THREE.Group();
  grp.add(createRoundedToyMesh(1.9, 0.08, 0.9, MAT.podiumStone, 0, 0.04, 0, 0.03));
  for (let i = -2; i <= 2; i++) {
    const hoop = new THREE.Mesh(GEO.torus, MAT.ironSteel);
    hoop.scale.set(0.45, 0.55, 0.45);
    hoop.rotation.y = Math.PI / 2;
    hoop.position.set(i * 0.36, 0.28, 0);
    grp.add(hoop);
  }

  const buildMiniBike = (ox, frameMat) => {
    const b = new THREE.Group();
    const w1 = new THREE.Mesh(GEO.torus, MAT.charcoal);
    w1.scale.setScalar(0.55);
    w1.rotation.y = Math.PI / 2;
    w1.position.set(0, 0.28, -0.34);
    const w2 = w1.clone();
    w2.position.set(0, 0.28, 0.34);
    const bar = createRoundedToyMesh(0.08, 0.08, 0.72, frameMat, 0, 0.46, 0, 0.03);
    const handle = createRoundedToyMesh(0.44, 0.06, 0.06, MAT.silver, 0, 0.72, 0.28, 0.02);
    const basket = createRoundedToyMesh(0.32, 0.22, 0.24, MAT.woodWarm, 0, 0.64, 0.42, 0.04);
    const seat = createRoundedToyMesh(0.18, 0.08, 0.24, MAT.leatherCamel, 0, 0.62, -0.18, 0.03);
    b.add(w1, w2, bar, handle, basket, seat);
    b.position.x = ox;
    return b;
  };
  grp.add(buildMiniBike(-0.46, MAT.mint));
  grp.add(buildMiniBike(0.42, MAT.coral));
  return grp;
}

// 8) 가게 앞 A자형 원목 입간판 (TODAY'S CAKE)
function createAFrameMenuBoard3D() {
  const grp = new THREE.Group();
  const boardA = createRoundedToyMesh(0.84, 1.12, 0.08, MAT.woodWarm, 0, 0.56, 0.18, 0.05);
  boardA.rotation.x = -0.22;
  const boardB = createRoundedToyMesh(0.84, 1.12, 0.08, MAT.woodWarm, 0, 0.56, -0.18, 0.05);
  boardB.rotation.x = 0.22;

  const faceMat = new THREE.MeshBasicMaterial({ map: TEX.signTodaysCake });
  const frontFace = new THREE.Mesh(GEO.quad, faceMat);
  frontFace.scale.set(0.72, 0.94, 1);
  frontFace.position.set(0, 0.58, 0.235);
  frontFace.rotation.x = -0.22;

  const backFace = new THREE.Mesh(GEO.quad, faceMat);
  backFace.scale.set(0.72, 0.94, 1);
  backFace.position.set(0, 0.58, -0.235);
  backFace.rotation.y = Math.PI;
  backFace.rotation.x = -0.22;

  grp.add(boardA, boardB, frontFace, backFace);
  return grp;
}

// 맨홀 뚜껑 3D 메쉬
function createManholeCover3D(x, z) {
  const grp = new THREE.Group();
  const rim = new THREE.Mesh(GEO.cyl, MAT.castIron);
  rim.scale.set(1.08, 0.04, 1.08);
  rim.position.y = 0.095;
  const inner = new THREE.Mesh(GEO.cyl, MAT.ironSteel);
  inner.scale.set(0.88, 0.05, 0.88);
  inner.position.y = 0.1;
  grp.add(rim, inner);
  grp.position.set(x, 0, z);
  return grp;
}

// 초록색 대형 파라솔 야외 원형 테이블 세트 (착석 좌표 반환 지원)
function createGreenParasolTableSet3D(withExtraCake = false) {
  const grp = new THREE.Group();

  // 원형 카페 테이블
  const base = new THREE.Mesh(GEO.cyl, MAT.castIron);
  base.scale.set(0.56, 0.08, 0.56);
  base.position.y = 0.04;
  const stem = new THREE.Mesh(GEO.cyl, MAT.castIron);
  stem.scale.set(0.12, 0.78, 0.12);
  stem.position.y = 0.42;
  const tableTop = new THREE.Mesh(GEO.cyl, MAT.white);
  tableTop.scale.set(1.36, 0.1, 1.36);
  tableTop.position.y = 0.82;
  tableTop.castShadow = true;
  addToonHullOutline(tableTop, 1.05);
  grp.add(base, stem, tableTop);

  // 테이블 위 기본 꽃병/케이크 장식
  const miniPlate = new THREE.Mesh(GEO.cyl, MAT.butter);
  miniPlate.scale.set(0.32, 0.05, 0.32);
  miniPlate.position.set(0.18, 0.89, 0.12);
  grp.add(miniPlate);
  if (withExtraCake) {
    const cakeSlice = createRoundedToyMesh(0.2, 0.16, 0.2, MAT.pinkSoft, 0.18, 0.98, 0.12, 0.04);
    grp.add(cakeSlice);
  }

  // 초록색 대형 파라솔 기둥 & 8각 캐노피
  const pole = new THREE.Mesh(GEO.cyl, MAT.woodDark);
  pole.scale.set(0.1, 2.55, 0.1);
  pole.position.y = 1.3;
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.52, 0.68, 8), MAT.parasolGreen);
  canopy.position.y = 2.58;
  canopy.castShadow = true;
  addToonHullOutline(canopy, 1.04);
  const finial = new THREE.Mesh(GEO.sphere, MAT.gold);
  finial.scale.setScalar(0.22);
  finial.position.y = 2.96;
  grp.add(pole, canopy, finial);

  // 양옆 카페 의자 2개
  const buildChair = (cx, rotY) => {
    const c = new THREE.Group();
    c.add(createRoundedToyMesh(0.52, 0.08, 0.52, MAT.woodWarm, 0, 0.46, 0, 0.03));
    c.add(createRoundedToyMesh(0.52, 0.52, 0.08, MAT.parasolGreen, 0, 0.74, -0.22, 0.03));
    c.add(createRoundedToyMesh(0.08, 0.44, 0.08, MAT.castIron, -0.18, 0.22, -0.18, 0.02));
    c.add(createRoundedToyMesh(0.08, 0.44, 0.08, MAT.castIron, 0.18, 0.22, -0.18, 0.02));
    c.add(createRoundedToyMesh(0.08, 0.44, 0.08, MAT.castIron, -0.18, 0.22, 0.18, 0.02));
    c.add(createRoundedToyMesh(0.08, 0.44, 0.08, MAT.castIron, 0.18, 0.22, 0.18, 0.02));
    c.position.set(cx, 0, 0);
    c.rotation.y = rotY;
    return c;
  };
  grp.add(buildChair(-0.98, Math.PI / 2));
  grp.add(buildChair(0.98, -Math.PI / 2));

  return grp;
}

// 빨간 사과 & 오렌지가 가득 담긴 나무 상자(Wooden Crate) 진열대
function createFruitWoodenCrate3D(fruitKind = 'apple') {
  const grp = new THREE.Group();
  // 경사진 원목 스탠드 다리 + 나무 상자
  const stand = createRoundedToyMesh(1.12, 0.48, 0.86, MAT.woodDark, 0, 0.24, 0, 0.04);
  const crate = createRoundedToyMesh(1.18, 0.36, 0.92, MAT.woodLight, 0, 0.62, 0.04, 0.05);
  crate.rotation.x = 0.24;
  grp.add(stand, crate);

  const fruitMat = fruitKind === 'orange' ? MAT.orangeFruit : MAT.appleRed;
  for (let r = -1; r <= 1; r++) {
    for (let c = -2; c <= 2; c++) {
      const f = new THREE.Mesh(GEO.sphere, (r + c) % 3 === 0 && fruitKind === 'mix' ? MAT.orangeFruit : fruitMat);
      f.scale.setScalar(0.24);
      f.position.set(c * 0.2, 0.78 - r * 0.05, r * 0.22 + 0.04);
      grp.add(f);
    }
  }
  return grp;
}

// =========================================================
// 5. 유럽/미국풍 부티크 타운 거리 · 순환 차도 · 중앙 2단 석조 분수 광장 구축
// =========================================================
function buildCozyFloatingIsland() {
  islandRootGroup = new THREE.Group();
  scene.add(islandRootGroup);

  // 스튜디오 아이솔레이션 원판 (룸/상가 단독 포커스용)
  studioStageDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(36, 36, 0.16, 48),
    makeClayMat(0xFFFDF7, { roughness: 0.75, emissive: 0xFFF5E8, emissiveIntensity: 0.22 })
  );
  studioStageDisc.position.set(0, 0.1, 0);
  studioStageDisc.visible = false;
  scene.add(studioStageDisc);

  // 1) 확장된 떠 있는 파스텔 아일랜드 지반 (반경 60)
  const meadowTop = new THREE.Mesh(
    new THREE.CylinderGeometry(60, 58.5, 2.2, 64),
    makeClayMat(0xFFFFFF, { map: TEX.meadow, roughness: 0.78 })
  );
  meadowTop.position.y = -1.1;
  meadowTop.receiveShadow = true;
  islandRootGroup.add(meadowTop);

  const cliffLayer1 = new THREE.Mesh(
    new THREE.CylinderGeometry(58.2, 53.5, 4.2, 56),
    makeClayMat(0xDFBE9B, { roughness: 0.82 })
  );
  cliffLayer1.position.y = -4.2;
  islandRootGroup.add(cliffLayer1);

  const cliffLayer2 = new THREE.Mesh(
    new THREE.CylinderGeometry(53.0, 42.0, 5.5, 48),
    makeClayMat(0xB98B68, { roughness: 0.86 })
  );
  cliffLayer2.position.y = -8.9;
  islandRootGroup.add(cliffLayer2);

  // 2) 동쪽 시냇물 & 아치형 원목 다리 (도로 동쪽 x = 37.5)
  const streamMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 76),
    makeClayMat(0xFFFFFF, { map: TEX.water, roughness: 0.2, metalness: 0.08 })
  );
  streamMesh.rotation.x = -Math.PI / 2;
  streamMesh.position.set(37.5, 0.04, 8.0);
  islandRootGroup.add(streamMesh);

  // 시냇물 위 노란 오리 튜브 2마리
  for (let i = 0; i < 2; i++) {
    const duck = new THREE.Group();
    const body = new THREE.Mesh(GEO.sphere, MAT.duckYellow);
    body.scale.set(0.65, 0.48, 0.78);
    body.position.y = 0.2;
    const head = new THREE.Mesh(GEO.sphere, MAT.duckYellow);
    head.scale.setScalar(0.42);
    head.position.set(0, 0.48, 0.24);
    const bill = new THREE.Mesh(GEO.sphere, MAT.orangeBill);
    bill.scale.set(0.22, 0.12, 0.26);
    bill.position.set(0, 0.46, 0.44);
    duck.add(body, head, bill);
    duck.position.set(37.5, 0.06, -4 + i * 16);
    islandRootGroup.add(duck);
    streamFloats.push({ mesh: duck, baseZ: -4 + i * 16, phase: i * 2.1 });
  }

  // 원목 아치교
  const bridge = new THREE.Group();
  bridge.add(createRoundedToyMesh(5.2, 0.24, 3.2, MAT.woodWarm, 0, 0.28, 0, 0.06));
  bridge.add(createRoundedToyMesh(5.2, 0.56, 0.14, MAT.woodDark, 0, 0.62, -1.48, 0.04));
  bridge.add(createRoundedToyMesh(5.2, 0.56, 0.14, MAT.woodDark, 0, 0.62, 1.48, 0.04));
  bridge.position.set(37.5, 0.02, 15.0);
  islandRootGroup.add(bridge);

  // =========================================================
  // 3) [1단계 1] 순환 아스팔트 차도(노란 중앙선·횡단보도·맨홀·NO PARKING 연석) 구축
  // =========================================================
  const roadHMat = makeClayMat(0xFFFFFF, { map: TEX.asphaltH, roughness: 0.75 });
  const roadVMat = makeClayMat(0xFFFFFF, { map: TEX.asphaltV, roughness: 0.75 });
  const roadCornerMat = makeClayMat(0x3E434C, { roughness: 0.75 });

  // 북측 메인 스트리트 (z = 7.0, 폭 6.2, 길이 61.2)
  const northRoad = new THREE.Mesh(new THREE.BoxGeometry(55.0, 0.16, 6.2), roadHMat);
  northRoad.position.set(0, 0.08, 7.0);
  northRoad.receiveShadow = true;
  islandRootGroup.add(northRoad);

  // 남측 순환 스트리트 (z = 28.6, 폭 6.2)
  const southRoad = new THREE.Mesh(new THREE.BoxGeometry(55.0, 0.16, 6.2), roadHMat);
  southRoad.position.set(0, 0.08, 28.6);
  southRoad.receiveShadow = true;
  islandRootGroup.add(southRoad);

  // 서측/동측 연결 도로 (x = ±30.5, z = 17.8, 길이 15.6)
  const westRoad = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.16, 15.6), roadVMat);
  westRoad.position.set(-30.5, 0.08, 17.8);
  westRoad.receiveShadow = true;
  islandRootGroup.add(westRoad);

  const eastRoad = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.16, 15.6), roadVMat);
  eastRoad.position.set(30.5, 0.08, 17.8);
  eastRoad.receiveShadow = true;
  islandRootGroup.add(eastRoad);

  // 4개 도로 코너 교차로 패치
  const corners = [
    [-30.5, 7.0],
    [30.5, 7.0],
    [-30.5, 28.6],
    [30.5, 28.6]
  ];
  for (const [cx, cz] of corners) {
    const patch = new THREE.Mesh(new THREE.BoxGeometry(6.25, 0.162, 6.25), roadCornerMat);
    patch.position.set(cx, 0.08, cz);
    patch.receiveShadow = true;
    islandRootGroup.add(patch);
  }

  // 흰색 줄무늬 횡단보도(Zebra Crosswalk) 5곳
  const cwMat = new THREE.MeshBasicMaterial({ map: TEX.crosswalk, transparent: true, depthWrite: false });
  const addCrosswalk = (x, z, rotY = 0) => {
    const cw = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 5.6), cwMat);
    cw.rotation.x = -Math.PI / 2;
    cw.rotation.z = rotY;
    cw.position.set(x, 0.172, z);
    islandRootGroup.add(cw);
  };
  addCrosswalk(-15.8, 7.0, 0); // 바게트 하우스 앞 횡단보도
  addCrosswalk(-3.8, 7.0, 0);  // 메인 빌딩 정문 -> 중앙 분수대 직결 횡단보도
  addCrosswalk(15.8, 7.0, 0);  // 미니미 로스터스 앞 횡단보도
  addCrosswalk(0.0, 28.6, 0);  // 남측 산책로 횡단보도

  // 아스팔트 위 입체 주철 맨홀 뚜껑 4개
  islandRootGroup.add(createManholeCover3D(-9.5, 7.8));
  islandRootGroup.add(createManholeCover3D(8.8, 6.2));
  islandRootGroup.add(createManholeCover3D(-22.0, 28.6));
  islandRootGroup.add(createManholeCover3D(21.5, 28.6));

  // 붉은색 NO PARKING 연석 단차 (Curb)
  const curbMat = makeClayMat(0xFFFFFF, { map: TEX.curbNoParking, roughness: 0.55 });
  const buildCurbStrip = (w, d, x, z) => {
    const cb = new THREE.Mesh(new THREE.BoxGeometry(w, 0.28, d), curbMat);
    cb.position.set(x, 0.14, z);
    cb.castShadow = true;
    cb.receiveShadow = true;
    islandRootGroup.add(cb);
  };
  // 북측 인도 가장자리 NO PARKING 연석 (횡단보도 구역 제외 깔끔 분할)
  buildCurbStrip(13.5, 0.34, -25.0, 3.82);
  buildCurbStrip(8.2, 0.34, -9.8, 3.82);
  buildCurbStrip(15.4, 0.34, 6.0, 3.82);
  buildCurbStrip(9.5, 0.34, 22.8, 3.82);
  // 중앙 상가 블록 북측 연석
  buildCurbStrip(8.5, 0.34, -22.2, 10.18);
  buildCurbStrip(8.2, 0.34, -9.8, 10.18);
  buildCurbStrip(15.4, 0.34, 6.0, 10.18);
  buildCurbStrip(8.5, 0.34, 22.2, 10.18);
  // 중앙 상가 블록 남측 연석
  buildCurbStrip(24.0, 0.34, -14.2, 25.42);
  buildCurbStrip(24.0, 0.34, 14.2, 25.42);

  // =========================================================
  // 4) 한 단 올라온 따뜻한 격자형 보도블록 인도(Sidewalk) & 중앙 유럽풍 분수 광장
  // =========================================================
  const sidewalkHMat = makeClayMat(0xFFFFFF, { map: TEX.sidewalkH, roughness: 0.65 });
  // 북측 메인 빌딩 & 플라워샵 앞 인도 (y = 0.22)
  const northSidewalk = createRoundedToyMesh(66.5, 0.24, 5.2, sidewalkHMat, 0.5, 0.12, 1.15, 0.08, false, true, false);
  islandRootGroup.add(northSidewalk);

  // 중앙 부티크 상가 & 광장 대형 보행자 데크 (x ∈ [-27.2, 27.2], z ∈ [10.25, 25.35])
  const centralBlockSidewalk = createRoundedToyMesh(54.4, 0.24, 15.0, sidewalkHMat, 0, 0.12, 17.8, 0.12, false, true, false);
  islandRootGroup.add(centralBlockSidewalk);

  // 남측 산책 프롬나드 인도
  const southPromenade = createRoundedToyMesh(66.5, 0.22, 3.0, sidewalkHMat, 0, 0.11, 33.3, 0.08, false, true, false);
  islandRootGroup.add(southPromenade);

  // 유럽풍 원형 코블스톤 중앙 광장 메달리온 (x = 0, z = 17.8)
  const plazaCobbleDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(7.2, 7.3, 0.08, 48),
    makeClayMat(0xFFFFFF, { map: TEX.plazaCobble, roughness: 0.64 })
  );
  plazaCobbleDisc.position.set(0, 0.25, 17.8);
  plazaCobbleDisc.receiveShadow = true;
  islandRootGroup.add(plazaCobbleDisc);

  // 원형 석조 2단 분수대 (물줄기 파티클 & 꽃화단 링 포함)
  const fountainGrp = new THREE.Group();
  fountainGrp.position.set(0, 0.26, 17.8);

  // 외곽 꽃화단 링
  const flowerRim = new THREE.Mesh(new THREE.TorusGeometry(2.75, 0.34, 12, 36), MAT.fountainStone);
  flowerRim.rotation.x = Math.PI / 2;
  flowerRim.position.y = 0.22;
  fountainGrp.add(flowerRim);

  const flowerCols = [MAT.coral, MAT.duckYellow, MAT.pinkSoft, MAT.lavender, MAT.mint];
  for (let i = 0; i < 20; i++) {
    const ang = (i / 20) * Math.PI * 2;
    const bush = new THREE.Mesh(GEO.sphere, MAT.cloverGreen);
    bush.scale.set(0.42, 0.28, 0.42);
    bush.position.set(Math.cos(ang) * 2.75, 0.36, Math.sin(ang) * 2.75);
    const petal = new THREE.Mesh(GEO.sphere, flowerCols[i % flowerCols.length]);
    petal.scale.setScalar(0.22);
    petal.position.set(Math.cos(ang) * 2.75, 0.52, Math.sin(ang) * 2.75);
    fountainGrp.add(bush, petal);
  }

  // 1단 대형 수조
  const poolWall = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.48, 0.58, 32), MAT.fountainStone);
  poolWall.position.y = 0.29;
  addToonHullOutline(poolWall, 1.04);
  const poolWater = new THREE.Mesh(
    new THREE.CylinderGeometry(2.12, 2.12, 0.12, 32),
    makeClayMat(0x56CCF2, { emissive: 0x38BDF8, emissiveIntensity: 0.35, roughness: 0.12 })
  );
  poolWater.position.y = 0.52;
  fountainGrp.add(poolWall, poolWater);

  // 중앙 석조 기둥 & 2단 상부 수조 + 꼭대기 분수 노즐 조각상
  const pillar1 = new THREE.Mesh(GEO.cyl, MAT.fountainStone);
  pillar1.scale.set(0.68, 1.15, 0.68);
  pillar1.position.y = 1.05;
  const basin2 = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 0.72, 0.38, 28), MAT.fountainStone);
  basin2.position.y = 1.68;
  addToonHullOutline(basin2, 1.05);
  const water2 = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.05, 0.08, 24),
    makeClayMat(0x7FE3FF, { emissive: 0x38BDF8, emissiveIntensity: 0.45, roughness: 0.1 })
  );
  water2.position.y = 1.85;
  const topSpire = new THREE.Mesh(getPuffyDomeGeo(0.32, 0.68), MAT.fountainStone);
  topSpire.position.y = 2.18;
  const goldNozzle = new THREE.Mesh(GEO.sphere, MAT.gold);
  goldNozzle.scale.setScalar(0.28);
  goldNozzle.position.y = 2.55;
  fountainGrp.add(pillar1, basin2, water2, topSpire, goldNozzle);

  // 실시간 물줄기 아치 물방울 제트 16개 생성
  const dropMat = makeClayMat(0xBAE6FD, { emissive: 0x7DD3FC, emissiveIntensity: 0.65, roughness: 0.1 });
  for (let i = 0; i < 16; i++) {
    const drop = new THREE.Mesh(GEO.sphere, dropMat);
    drop.scale.setScalar(0.18);
    fountainGrp.add(drop);
    fountainJets.push({
      mesh: drop,
      angle: (i / 16) * Math.PI * 2,
      phase: (i / 16),
      tier: i % 2 === 0 ? 'upper' : 'lower'
    });
  }
  islandRootGroup.add(fountainGrp);

  // 광장 주변 원목 공원 벤치 4개 & 착석 슬롯 등록
  const benchPlacements = [
    { x: -5.3, z: 17.8, rotY: Math.PI / 2 },
    { x: 5.3, z: 17.8, rotY: -Math.PI / 2 },
    { x: -3.4, z: 12.2, rotY: 0 },
    { x: 3.4, z: 12.2, rotY: 0 }
  ];
  for (const bp of benchPlacements) {
    const bench = createParkBench3D(bp.rotY);
    bench.position.set(bp.x, 0.24, bp.z);
    islandRootGroup.add(bench);
    fountainBenchSeats.push({
      x: bp.x,
      y: 0.42,
      z: bp.z,
      rotY: bp.rotY,
      occupiedBy: null
    });
  }

  // 광장 및 산책로 가로수 배치
  const treeCoords = [
    [-6.6, 13.0, 0.92, false],
    [6.6, 13.0, 0.92, false],
    [-6.4, 22.8, 0.96, true],
    [6.4, 22.8, 0.96, true],
    [-25.5, 22.5, 1.0, false],
    [25.5, 22.5, 1.0, false],
    [-28.5, -1.2, 1.05, true],
    [30.5, -2.0, 1.02, false],
    [-16.0, 33.3, 0.95, true],
    [16.0, 33.3, 0.95, false]
  ];
  for (const [tx, tz, sc, sak] of treeCoords) {
    const tr = createBoulevardTree3D(sc, sak);
    tr.position.set(tx, 0.22, tz);
    islandRootGroup.add(tr);
  }

  // =========================================================
  // 5) [1단계 2] 거리의 생동감을 살리는 8종 스트리트 퍼니처 & 표지판 배치
  // =========================================================
  // ① 빨간 원형 사선 NO PARKING 철제 표지판 3곳
  for (const [sx, sz] of [[-10.4, 3.25], [9.4, 3.25], [-24.4, 10.75]]) {
    const np = createNoParkingSign3D();
    np.position.set(sx, 0.24, sz);
    islandRootGroup.add(np);
  }

  // ② 빨간 소화전 (Fire Hydrant) 3곳
  for (const [hx, hz] of [[-18.8, 3.25], [10.8, 10.75], [24.8, 24.75]]) {
    const fh = createFireHydrant3D();
    fh.position.set(hx, 0.24, hz);
    islandRootGroup.add(fh);
  }

  // ③ 유리 지붕 버스 정류장 부스 (MINIMI TRANSIT) — 북측 인도 서편
  const busBooth = createBusStopBooth3D();
  busBooth.position.set(-24.2, 0.24, 1.75);
  islandRootGroup.add(busBooth);

  // ④ 클래식 주철 가로등 & MINIMI TOWN 배너 8기
  const lampPlacements = [
    [-19.8, 3.2, 1],
    [-7.8, 3.2, 1],
    [2.4, 3.2, -1],
    [18.2, 3.2, -1],
    [-22.6, 10.8, 1],
    [-8.6, 10.8, 1],
    [8.6, 10.8, -1],
    [22.6, 10.8, -1]
  ];
  for (const [lx, lz, side] of lampPlacements) {
    const lamp = createVintageBannerLamp3D(side);
    lamp.position.set(lx, 0.24, lz);
    islandRootGroup.add(lamp);
  }

  // ⑤ 빨간 우체통 (메인 빌딩 정문 우측 인도)
  const postbox = createRedPostbox3D();
  postbox.position.set(10.4, 0.24, 2.65);
  islandRootGroup.add(postbox);

  // ⑥ 초록색 신문 가판대 (버스정류장 옆)
  const newsStand = createNewspaperStand3D();
  newsStand.position.set(-21.2, 0.24, 2.35);
  islandRootGroup.add(newsStand);

  // ⑦ 자전거 거치대 & 파스텔 자전거 (바게트 하우스 & 광장 사이)
  const bikeRack = createBikeRack3D();
  bikeRack.position.set(-9.2, 0.24, 18.6);
  islandRootGroup.add(bikeRack);

  // ⑧ 가게 앞 A자형 나무 입간판 (TODAY'S CAKE)
  const cakeBoard = createAFrameMenuBoard3D();
  cakeBoard.position.set(-11.1, 0.24, 19.4);
  cakeBoard.rotation.y = 0.28;
  islandRootGroup.add(cakeBoard);

  // =========================================================
  // 6) [1단계 5] 건물주 전용 VIP 골드 주차 구역 (VIP LANDLORD)
  // =========================================================
  const vipZone = new THREE.Group();
  vipZone.position.set(VIP_PARKING_POS.x, 0.24, VIP_PARKING_POS.z);

  const vipPad = createRoundedToyMesh(6.2, 0.08, 3.8, makeClayMat(0x2D313A, { roughness: 0.6 }), 0, 0.04, 0, 0.08);
  vipZone.add(vipPad);

  // 황금색 주차 라인 테두리
  vipZone.add(createRoundedToyMesh(6.3, 0.1, 0.16, MAT.gold, 0, 0.06, -1.86, 0.03));
  vipZone.add(createRoundedToyMesh(6.3, 0.1, 0.16, MAT.gold, 0, 0.06, 1.86, 0.03));
  vipZone.add(createRoundedToyMesh(0.16, 0.1, 3.8, MAT.gold, -3.08, 0.06, 0, 0.03));
  vipZone.add(createRoundedToyMesh(0.16, 0.1, 3.8, MAT.gold, 3.08, 0.06, 0, 0.03));
  // 카 스토퍼
  vipZone.add(createRoundedToyMesh(0.22, 0.18, 2.2, MAT.neonYellow, -2.45, 0.12, 0, 0.04));

  const vipDecal = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 2.1),
    new THREE.MeshBasicMaterial({ map: TEX.signVipParking, transparent: true })
  );
  vipDecal.rotation.x = -Math.PI / 2;
  vipDecal.position.set(0.25, 0.095, 0);
  vipZone.add(vipDecal);

  // 클릭 시 차고/드라이브 진입용 히트박스
  const vipHit = new THREE.Mesh(
    new THREE.BoxGeometry(6.4, 2.2, 4.0),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  vipHit.position.set(0, 1.1, 0);
  vipHit.userData = { kind: 'vipCar' };
  vipZone.add(vipHit);
  pickableMeshes.push(vipHit);

  islandRootGroup.add(vipZone);

  // 플레이어 3D 차량 루트 그룹 생성 및 배치
  driveState.carRootGroup = new THREE.Group();
  driveState.carRootGroup.position.set(VIP_PARKING_POS.x, VIP_PARKING_POS.y + 0.06, VIP_PARKING_POS.z);
  driveState.carRootGroup.rotation.y = Math.PI * 0.5;
  scene.add(driveState.carRootGroup);
  refreshPlayerCar3D();

  // 하늘 뭉게구름 5개 (옥상 간판 시야를 가리지 않도록 높은 고도·후방 레이어 배치)
  for (let i = 0; i < 5; i++) {
    const cl = new THREE.Group();
    [
      [0, 0, 0, 1.8],
      [-1.4, -0.2, 0.2, 1.3],
      [1.5, -0.15, -0.1, 1.35]
    ].forEach(([cx, cy, cz, r]) => {
      const puff = new THREE.Mesh(GEO.sphere, MAT.cloudWhite);
      puff.scale.set(r * 1.4, r * 0.85, r * 1.1);
      puff.position.set(cx, cy, cz);
      cl.add(puff);
    });
    cl.position.set(-48 + i * 24, 34 + (i % 2) * 3.8, -36 - (i % 3) * 8);
    scene.add(cl);
    cloudActors.push({ mesh: cl, speed: 0.55 + i * 0.12 });
  }

  hoverFocusGroup = createHoverFocusRing3D();
  scene.add(hoverFocusGroup);

  selectedRoomFrameGroup = createSelectedRoomFrame3D();
  scene.add(selectedRoomFrameGroup);
}

// =========================================================
// 6. 귀여운 치비 미니미(직원 · 입주민 · 건물주 오너) & 반려동물 & 4종 슈퍼카 3D
// =========================================================
function createChibiPerson3D(role = 'student', customShirtHex = null) {
  const grp = new THREE.Group();

  const shadow = new THREE.Mesh(GEO.quad, MAT.shadow);
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(0.86, 0.86, 1);
  shadow.position.y = 0.02;
  grp.add(shadow);

  const bodyRig = new THREE.Group();
  grp.add(bodyRig);

  const palette = {
    student: 0x4EA8DE,
    newlywed: 0xFF758F,
    family4: 0x34D399,
    elderly: 0xF6BD60,
    streamer: 0xA855F7,
    hikikomori: 0x5B21B6,
    manager: 0x2563EB,
    baker: 0xFFFDF9,
    barista: 0x6F4528,
    florist: 0xF28482,
    landlord_driver: 0xE11D48
  };
  const shirtMat = makeClayMat(customShirtHex || palette[role] || 0x4EA8DE, { roughness: 0.46 });
  const skinMat = makeClayMat(0xFFE2D1, { roughness: 0.5 });
  const hairMat = makeClayMat(role === 'elderly' ? 0xE5E7EB : role === 'florist' ? 0x9A582C : 0x43342E, { roughness: 0.52 });

  // 양발
  const legL = new THREE.Mesh(GEO.cyl, MAT.charcoal);
  legL.scale.set(0.16, 0.34, 0.16);
  legL.position.set(-0.14, 0.17, 0);
  const legR = legL.clone();
  legR.position.set(0.14, 0.17, 0);
  bodyRig.add(legL, legR);

  // 통통한 몸통
  const torso = new THREE.Mesh(getPuffyDomeGeo(0.36, 0.62), shirtMat);
  torso.position.y = 0.58;
  torso.castShadow = true;
  addToonHullOutline(torso, 1.07);
  bodyRig.add(torso);

  // 직원 앞치마 디테일
  if (role === 'baker' || role === 'barista' || role === 'florist') {
    const apronMat = role === 'baker' ? MAT.coral : role === 'barista' ? MAT.parasolGreen : MAT.cream;
    const apron = createRoundedToyMesh(0.46, 0.42, 0.12, apronMat, 0, 0.52, 0.28, 0.04);
    bodyRig.add(apron);
  }

  // 양팔
  const armL = new THREE.Mesh(GEO.cyl, shirtMat);
  armL.scale.set(0.14, 0.38, 0.14);
  armL.position.set(-0.38, 0.62, 0);
  armL.rotation.z = 0.28;
  const armR = armL.clone();
  armR.position.set(0.38, 0.62, 0);
  armR.rotation.z = -0.28;
  bodyRig.add(armL, armR);

  // 머리 + 눈 + 볼터치
  const head = new THREE.Mesh(GEO.sphere, skinMat);
  head.scale.setScalar(0.68);
  head.position.y = 1.16;
  head.castShadow = true;
  addToonHullOutline(head, 1.06);
  bodyRig.add(head);

  const hairCap = new THREE.Mesh(getPuffyDomeGeo(0.36, 0.34), hairMat);
  hairCap.position.set(0, 1.31, -0.03);
  bodyRig.add(hairCap);

  const eyeL = new THREE.Mesh(GEO.sphere, MAT.charcoal);
  eyeL.scale.setScalar(0.085);
  eyeL.position.set(-0.12, 1.17, 0.31);
  const eyeR = eyeL.clone();
  eyeR.position.set(0.12, 1.17, 0.31);
  const cheekL = new THREE.Mesh(GEO.sphere, MAT.pinkSoft);
  cheekL.scale.set(0.1, 0.06, 0.05);
  cheekL.position.set(-0.2, 1.11, 0.3);
  const cheekR = cheekL.clone();
  cheekR.position.set(0.2, 1.11, 0.3);
  bodyRig.add(eyeL, eyeR, cheekL, cheekR);

  // 직업별 모자/헤드기어
  if (role === 'baker') {
    // 제빵사 하얀 조리모(Toque)
    const band = new THREE.Mesh(GEO.cyl, MAT.white);
    band.scale.set(0.56, 0.22, 0.56);
    band.position.y = 1.48;
    const puff = new THREE.Mesh(GEO.sphere, MAT.white);
    puff.scale.set(0.68, 0.48, 0.68);
    puff.position.y = 1.72;
    addToonHullOutline(puff, 1.06);
    bodyRig.add(band, puff);
  } else if (role === 'barista') {
    const beret = new THREE.Mesh(GEO.sphere, MAT.walnutTrim);
    beret.scale.set(0.66, 0.24, 0.66);
    beret.position.set(0.05, 1.48, 0);
    bodyRig.add(beret);
  } else if (role === 'florist') {
    const brim = new THREE.Mesh(GEO.cyl, MAT.butter);
    brim.scale.set(0.92, 0.06, 0.92);
    brim.position.y = 1.44;
    const crown = new THREE.Mesh(GEO.cyl, MAT.butter);
    crown.scale.set(0.54, 0.22, 0.54);
    crown.position.y = 1.54;
    bodyRig.add(brim, crown);
  } else if (role === 'manager') {
    const cap = new THREE.Mesh(GEO.cyl, MAT.sky);
    cap.scale.set(0.6, 0.2, 0.6);
    cap.position.y = 1.46;
    bodyRig.add(cap);
  } else if (role === 'streamer') {
    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.22, 8), MAT.pinkSoft);
    earL.position.set(-0.2, 1.54, 0);
    const earR = earL.clone();
    earR.position.set(0.2, 1.54, 0);
    bodyRig.add(earL, earR);
  } else if (role === 'landlord_driver') {
    // 건물주 황금 왕관 + 선글라스
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.24, 6), MAT.gold);
    crown.position.y = 1.56;
    const shades = createRoundedToyMesh(0.48, 0.12, 0.08, MAT.charcoal, 0, 1.19, 0.33, 0.03);
    bodyRig.add(crown, shades);
  }

  // 손에 드는 갈색 크래프트 종이봉투 + 노릇한 바게트 슬롯 (기본 숨김)
  const carryBag = new THREE.Group();
  const bagBox = createRoundedToyMesh(0.32, 0.42, 0.24, MAT.paperBag, 0, 0.2, 0, 0.04);
  const baguette1 = new THREE.Mesh(GEO.cyl, MAT.butterOak);
  baguette1.scale.set(0.11, 0.46, 0.11);
  baguette1.rotation.z = 0.22;
  baguette1.position.set(-0.05, 0.46, 0);
  const baguette2 = new THREE.Mesh(GEO.cyl, MAT.gold);
  baguette2.scale.set(0.1, 0.4, 0.1);
  baguette2.rotation.z = -0.18;
  baguette2.position.set(0.06, 0.43, 0.02);
  carryBag.add(bagBox, baguette1, baguette2);
  carryBag.position.set(0.44, 0.38, 0.16);
  carryBag.visible = false;
  bodyRig.add(carryBag);

  grp.userData = { bodyRig, legL, legR, armL, armR, carryBag };
  return grp;
}

function createCutePet3D(kind = 'corgi') {
  const grp = new THREE.Group();
  const bodyMat = kind === 'cat' ? MAT.white : MAT.butterOak;
  const body = createRoundedToyMesh(0.38, 0.28, 0.56, bodyMat, 0, 0.22, 0, 0.09);
  const head = new THREE.Mesh(GEO.sphere, bodyMat);
  head.scale.setScalar(0.36);
  head.position.set(0, 0.38, 0.26);
  addToonHullOutline(head, 1.07);
  const earL = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 6), kind === 'cat' ? MAT.pinkSoft : MAT.woodWarm);
  earL.position.set(-0.1, 0.55, 0.26);
  const earR = earL.clone();
  earR.position.set(0.1, 0.55, 0.26);
  grp.add(body, head, earL, earR);
  return grp;
}

// 4종 차량 3D 메쉬 생성 (스쿠터 · 빈티지 세단 · 페라리 레드 오픈 슈퍼카 · 골드 롱바디 리무진)
function createVehicle3D(carId = 'car_scooter') {
  const grp = new THREE.Group();
  const wheels = [];

  const makeWheel = (wx, wy, wz, radius = 0.42, goldRim = false) => {
    const wGrp = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.26, 20), MAT.charcoal);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.58, radius * 0.58, 0.28, 14), goldRim ? MAT.gold : MAT.silver);
    rim.rotation.z = Math.PI / 2;
    wGrp.add(tire, rim);
    wGrp.position.set(wx, wy, wz);
    grp.add(wGrp);
    wheels.push(wGrp);
    return wGrp;
  };

  // 바닥 그림자
  const shadow = new THREE.Mesh(GEO.quad, MAT.shadow);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  grp.add(shadow);

  let driverRef = null;
  let roofRef = null;

  // 차량 진행 방향은 로컬 +Z
  if (carId === 'car_scooter') {
    shadow.scale.set(1.6, 2.6, 1);
    makeWheel(0, 0.34, 0.78, 0.32, false);
    makeWheel(0, 0.34, -0.76, 0.32, false);

    // 민트 베스파 바디
    grp.add(createRoundedToyMesh(0.72, 0.36, 1.55, MAT.mint, 0, 0.46, -0.05, 0.14));
    const frontShield = createRoundedToyMesh(0.76, 0.92, 0.2, MAT.mint, 0, 0.84, 0.62, 0.1);
    frontShield.rotation.x = -0.18;
    grp.add(frontShield);
    grp.add(createRoundedToyMesh(0.62, 0.08, 0.14, MAT.silver, 0, 1.32, 0.54, 0.03));
    const headLamp = new THREE.Mesh(GEO.sphere, MAT.neonYellow);
    headLamp.scale.setScalar(0.24);
    headLamp.position.set(0, 1.32, 0.66);
    grp.add(headLamp);
    grp.add(createRoundedToyMesh(0.56, 0.2, 0.76, MAT.leatherCamel, 0, 0.72, -0.26, 0.08));

    const driver = createChibiPerson3D('landlord_driver');
    driver.scale.setScalar(0.92);
    driver.position.set(0, 0.54, -0.22);
    grp.add(driver);
    driverRef = driver;
  } else if (carId === 'car_sedan') {
    shadow.scale.set(2.5, 4.4, 1);
    makeWheel(-0.98, 0.4, 1.18, 0.4, false);
    makeWheel(0.98, 0.4, 1.18, 0.4, false);
    makeWheel(-0.98, 0.4, -1.18, 0.4, false);
    makeWheel(0.98, 0.4, -1.18, 0.4, false);

    const bodyMat = makeClayMat(0x7C4728, { roughness: 0.32, metalness: 0.15 });
    grp.add(createRoundedToyMesh(2.05, 0.68, 3.85, bodyMat, 0, 0.66, 0, 0.18));
    roofRef = createRoundedToyMesh(1.78, 0.66, 2.05, MAT.cream, 0, 1.28, -0.15, 0.2);
    roofRef.visible = !driveState.roofOpen;
    grp.add(roofRef);
    grp.add(createRoundedToyMesh(1.82, 0.46, 0.14, MAT.partitionGlass, 0, 1.12, 0.78, 0.05, false, false, false));
    // 크롬 그릴 & 원형 헤드라이트
    grp.add(createRoundedToyMesh(1.1, 0.36, 0.12, MAT.silver, 0, 0.64, 1.94, 0.04));
    for (const lx of [-0.68, 0.68]) {
      const hl = new THREE.Mesh(GEO.sphere, MAT.neonYellow);
      hl.scale.setScalar(0.26);
      hl.position.set(lx, 0.72, 1.94);
      grp.add(hl);
    }
    const sedanDriver = createChibiPerson3D('landlord_driver');
    sedanDriver.scale.setScalar(0.84);
    sedanDriver.position.set(-0.34, 0.56, -0.16);
    grp.add(sedanDriver);
    driverRef = sedanDriver;
  } else if (carId === 'car_supercar') {
    // 페라리 레드 오픈 컨버터블 슈퍼카
    shadow.scale.set(2.8, 4.9, 1);
    makeWheel(-1.12, 0.4, 1.32, 0.42, true);
    makeWheel(1.12, 0.4, 1.32, 0.42, true);
    makeWheel(-1.12, 0.42, -1.32, 0.44, true);
    makeWheel(1.12, 0.42, -1.32, 0.44, true);

    // 낮고 와이드한 에어로 레드 차체
    grp.add(createRoundedToyMesh(2.26, 0.56, 4.35, MAT.supercarRed, 0, 0.56, 0, 0.16));
    // 전면 보닛 & 중앙 레이싱 골드 스트라이프
    const hood = createRoundedToyMesh(2.08, 0.22, 1.55, MAT.supercarRed, 0, 0.84, 1.18, 0.1);
    hood.rotation.x = 0.12;
    grp.add(hood);
    grp.add(createRoundedToyMesh(0.28, 0.06, 4.25, MAT.gold, 0, 0.86, 0, 0.02));

    // 경사진 스포츠 윈드실드 + 개폐 가능한 소프트탑 루프
    const windshield = createRoundedToyMesh(1.92, 0.56, 0.12, MAT.partitionGlass, 0, 1.06, 0.48, 0.05, false, false, false);
    windshield.rotation.x = -0.52;
    grp.add(windshield);

    roofRef = createRoundedToyMesh(1.88, 0.42, 1.65, MAT.charcoal, 0, 1.28, -0.28, 0.14);
    roofRef.visible = !driveState.roofOpen;
    grp.add(roofRef);

    // 오픈카 실내 카멜 가죽 시트 & 황금 왕관 건물주 오너 탑승!
    grp.add(createRoundedToyMesh(1.62, 0.46, 0.32, MAT.leatherCamel, 0, 0.92, -0.56, 0.08));
    const ownerDriver = createChibiPerson3D('landlord_driver');
    ownerDriver.scale.setScalar(0.88);
    ownerDriver.position.set(-0.36, 0.56, -0.22);
    grp.add(ownerDriver);
    driverRef = ownerDriver;

    // 리어 에어로 윙 스포일러 & 듀얼 머플러 & 테일램프
    grp.add(createRoundedToyMesh(0.14, 0.36, 0.22, MAT.charcoal, -0.78, 0.98, -1.92, 0.03));
    grp.add(createRoundedToyMesh(0.14, 0.36, 0.22, MAT.charcoal, 0.78, 0.98, -1.92, 0.03));
    grp.add(createRoundedToyMesh(2.28, 0.1, 0.44, MAT.supercarRed, 0, 1.18, -1.96, 0.04));

    for (const lx of [-0.78, 0.78]) {
      const hl = createRoundedToyMesh(0.42, 0.14, 0.12, MAT.neonYellow, lx, 0.66, 2.18, 0.04);
      const tl = createRoundedToyMesh(0.48, 0.14, 0.1, MAT.neonCoral, lx, 0.72, -2.18, 0.04);
      grp.add(hl, tl);
    }
    for (const ex of [-0.46, 0.46]) {
      const pipe = new THREE.Mesh(GEO.cyl, MAT.gold);
      pipe.scale.set(0.16, 0.24, 0.16);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(ex, 0.38, -2.22);
      grp.add(pipe);
    }
  } else {
    // 골드 크라운 롱바디 리무진 (car_limo)
    shadow.scale.set(2.9, 6.4, 1);
    makeWheel(-1.12, 0.42, 2.05, 0.42, true);
    makeWheel(1.12, 0.42, 2.05, 0.42, true);
    makeWheel(-1.12, 0.42, 0.0, 0.42, true);
    makeWheel(1.12, 0.42, 0.0, 0.42, true);
    makeWheel(-1.12, 0.42, -2.05, 0.42, true);
    makeWheel(1.12, 0.42, -2.05, 0.42, true);

    grp.add(createRoundedToyMesh(2.26, 0.68, 5.85, MAT.limoCream, 0, 0.68, 0, 0.16));
    grp.add(createRoundedToyMesh(2.3, 0.12, 5.88, MAT.gold, 0, 0.56, 0, 0.04));
    roofRef = createRoundedToyMesh(1.96, 0.68, 3.85, MAT.limoCream, 0, 1.3, -0.28, 0.18);
    roofRef.visible = !driveState.roofOpen;
    grp.add(roofRef);
    grp.add(createRoundedToyMesh(1.96, 0.52, 0.14, MAT.partitionGlass, 0, 1.15, 1.62, 0.05, false, false, false));
    // 보닛 위 황금 왕관 엠블럼
    const hoodCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.24, 6), MAT.gold);
    hoodCrown.position.set(0, 1.14, 2.55);
    grp.add(hoodCrown);
    const limoDriver = createChibiPerson3D('landlord_driver');
    limoDriver.scale.setScalar(0.84);
    limoDriver.position.set(-0.38, 0.58, 0.95);
    grp.add(limoDriver);
    driverRef = limoDriver;
    for (const lx of [-0.76, 0.76]) {
      grp.add(createRoundedToyMesh(0.42, 0.18, 0.12, MAT.neonYellow, lx, 0.72, 2.92, 0.04));
      grp.add(createRoundedToyMesh(0.46, 0.16, 0.1, MAT.neonCoral, lx, 0.72, -2.92, 0.04));
    }
  }

  if (driverRef) driverRef.visible = !driveState.cockpitView;
  grp.userData = { wheels, driverRef, roofRef };
  return grp;
}

function refreshPlayerCar3D() {
  if (!driveState.carRootGroup) return;
  while (driveState.carRootGroup.children.length > 0) {
    driveState.carRootGroup.remove(driveState.carRootGroup.children[0]);
  }
  const carId = state.garage?.currentCar || 'car_scooter';
  const vMesh = createVehicle3D(carId);
  driveState.carRootGroup.add(vMesh);
  driveState.vehicleMesh = vMesh;
  driveState.wheels = vMesh.userData.wheels || [];

  // 차량 클릭 시에도 바로 드라이브/차고 액션 연결
  const carHit = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 2.0, 4.8),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  carHit.position.set(0, 1.0, 0);
  carHit.userData = { kind: 'vipCar' };
  driveState.carRootGroup.add(carHit);
  if (!pickableMeshes.includes(carHit)) pickableMeshes.push(carHit);
}

// =========================================================
// 7. [1단계 3 & 4] 단독 상가 3종(빵집 · 로스터리 카페 · 플라워샵) & 내부 집기/직원 3D
// =========================================================
function buildAllStandaloneShops3D() {
  for (const tpl of STANDALONE_SHOPS_TEMPLATE) {
    rebuildStandaloneShop3D(tpl.shopId);
  }
}

function rebuildStandaloneShop3D(shopId) {
  const tpl = STANDALONE_SHOPS_TEMPLATE.find((s) => s.shopId === shopId);
  if (!tpl) return;
  const shopState = state.standaloneShops[shopId];

  // 기존 엔트리 정리
  if (standaloneShop3D[shopId]) {
    const old = standaloneShop3D[shopId];
    scene.remove(old.group);
    if (old.hitMesh) {
      const idx = pickableMeshes.indexOf(old.hitMesh);
      if (idx >= 0) pickableMeshes.splice(idx, 1);
    }
  }

  const grp = new THREE.Group();
  grp.position.set(tpl.x, 0.24, tpl.z);
  scene.add(grp);

  const w = tpl.w;
  const d = tpl.d;
  const h = tpl.h;
  const isFocused = focusedShopId === shopId;

  // 바닥 석재 포디움 & 따뜻한 헤링본 매장 마루
  grp.add(createRoundedToyMesh(w + 0.5, 0.22, d + 0.5, MAT.podiumStone, 0, 0.11, 0, 0.1));
  const floorTex = tpl.kind === 'bakery' ? TEX.floor1 : tpl.kind === 'roastery' ? TEX.floor2 : TEX.floor3;
  grp.add(createRoundedToyMesh(w - 0.3, 0.08, d - 0.3, makeClayMat(0xFFFFFF, { map: floorTex, roughness: 0.55 }), 0, 0.24, 0, 0.06));

  // 외벽 재질
  const wallMat = tpl.kind === 'bakery'
    ? makeClayMat(0xFFFFFF, { map: TEX.brickWarm, roughness: 0.6 })
    : tpl.kind === 'roastery'
      ? makeClayMat(0xFFFFFF, { map: TEX.brickCream, roughness: 0.6 })
      : makeClayMat(0xFFFFFF, { map: TEX.brickMint, roughness: 0.6 });

  // 뒷벽 + 좌·우측 벽 (클로즈업 포커스 시 좌우/지붕을 반투명·컷어웨이로 열어 내부 100% 관찰!)
  const wallH = isFocused ? h * 0.72 : h;
  grp.add(createRoundedToyMesh(w, wallH, 0.28, wallMat, 0, 0.22 + wallH * 0.5, -d * 0.5 + 0.14, 0.08));
  grp.add(createRoundedToyMesh(0.28, wallH * (isFocused ? 0.55 : 1), d, wallMat, -w * 0.5 + 0.14, 0.22 + wallH * (isFocused ? 0.275 : 0.5), 0, 0.08));
  grp.add(createRoundedToyMesh(0.28, wallH * (isFocused ? 0.55 : 1), d, wallMat, w * 0.5 - 0.14, 0.22 + wallH * (isFocused ? 0.275 : 0.5), 0, 0.08));

  // 전면 쇼윈도 필러 + 대형 투명 쇼윈도 유리 + 출입문 프레임
  grp.add(createRoundedToyMesh(0.45, wallH, 0.32, MAT.walnutTrim, -w * 0.5 + 0.24, 0.22 + wallH * 0.5, d * 0.5 - 0.14, 0.06));
  grp.add(createRoundedToyMesh(0.45, wallH, 0.32, MAT.walnutTrim, w * 0.5 - 0.24, 0.22 + wallH * 0.5, d * 0.5 - 0.14, 0.06));
  grp.add(createRoundedToyMesh(0.32, wallH * 0.76, 0.3, MAT.walnutTrim, 1.55, 0.22 + wallH * 0.38, d * 0.5 - 0.14, 0.05));

  if (!isFocused) {
    // 대형 쇼윈도 투명 유리 (안쪽 케이크·에스프레소머신·꽃 선명 노출)
    const showGlass = new THREE.Mesh(GEO.quad, MAT.clearWindowGlass);
    showGlass.scale.set(w * 0.62, h * 0.66, 1);
    showGlass.position.set(-w * 0.14, 0.55 + h * 0.33, d * 0.5 - 0.08);
    grp.add(showGlass);

    // 줄무늬 어닝 & 영문+한글 상가 간판 & 지붕 파라펫
    const awning = createScallopedAwning3D(w - 0.4, tpl.awningStyle);
    awning.position.set(0, h * 0.68, d * 0.5 - 0.05);
    grp.add(awning);

    const signKind = tpl.kind === 'bakery' ? 'patisserie' : tpl.kind === 'roastery' ? 'roastery' : 'flores';
    const signboard = createFramedSignboard3D(w * 0.76, 1.15, signKind);
    signboard.position.set(0, h + 0.25, d * 0.5 + 0.06);
    grp.add(signboard);

    const roofMat = makeClayMat(tpl.roofColor, { roughness: 0.48 });
    grp.add(createRoundedToyMesh(w + 0.42, 0.48, d + 0.42, roofMat, 0, h + 0.46, 0, 0.12));

    // 옥상 마스코트 조형물 & 건물주 인수 시 황금 왕관 엠블럼!
    const mascot = create3DStoreMascot(tpl.kind);
    mascot.scale.setScalar(1.35);
    mascot.position.set(-w * 0.34, h + 0.7, d * 0.22);
    grp.add(mascot);

    if (shopState?.owned) {
      const ownerCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.38, 0.44, 6), MAT.gold);
      ownerCrown.position.set(w * 0.34, h + 0.94, d * 0.24);
      addToonHullOutline(ownerCrown, 1.07);
      grp.add(ownerCrown);
    }
  }

  // =========================================================
  // 매장 내부 100% 3D 설비 · 쇼윈도 진열품 · POS 카운터 · 일하는 직원 구현
  // =========================================================
  const seatSlots = [];
  const hasOvenUpg = !!shopState?.upgrades?.upg_oven;
  const hasTerraceUpg = !!shopState?.upgrades?.upg_terrace;
  const hasCrateUpg = !!shopState?.upgrades?.upg_crate;

  // 공통 원목 카운터 & POS 계산기
  grp.add(createRoundedToyMesh(3.2, 1.05, 0.92, MAT.woodWarm, 0.4, 0.78, -0.35, 0.08));
  grp.add(createRoundedToyMesh(3.32, 0.12, 1.04, MAT.white, 0.4, 1.34, -0.35, 0.04));
  // POS기
  grp.add(createRoundedToyMesh(0.46, 0.38, 0.34, MAT.charcoal, 1.35, 1.56, -0.28, 0.04));
  grp.add(createRoundedToyMesh(0.38, 0.24, 0.06, MAT.screenCyan, 1.35, 1.6, -0.1, 0.02));

  // 상주하는 매장 직원 NPC (제빵사 / 바리스타 / 플로리스트)
  const staffMesh = createChibiPerson3D(tpl.staffRole);
  staffMesh.position.set(0.35, 0.28, -1.25);
  grp.add(staffMesh);

  if (tpl.kind === 'bakery') {
    // ① 쇼윈도 바로 안쪽 3단 케이크 진열대 (유리창 너머로 선명히 보임!)
    const standX = -2.35;
    const standZ = d * 0.5 - 0.92;
    grp.add(createRoundedToyMesh(1.9, 0.72, 0.86, MAT.woodLight, standX, 0.62, standZ, 0.06));
    grp.add(createRoundedToyMesh(1.86, 0.85, 0.82, MAT.partitionGlass, standX, 1.38, standZ, 0.05, false, false, false));
    // 3단 케이크 타워
    for (let tier = 0; tier < 3; tier++) {
      const r = 0.42 - tier * 0.09;
      const cake = new THREE.Mesh(GEO.cyl, tier % 2 === 0 ? MAT.pinkSoft : MAT.cream);
      cake.scale.set(r * 2, 0.22, r * 2);
      cake.position.set(standX - 0.38, 1.08 + tier * 0.24, standZ);
      grp.add(cake);
    }
    // 바게트 & 크루아상 트레이
    for (let bx = 0; bx < 3; bx++) {
      const loaf = createRoundedToyMesh(0.24, 0.16, 0.52, MAT.butterOak, standX + 0.32 + bx * 0.26, 1.08, standZ, 0.06);
      grp.add(loaf);
    }

    // ② 뒷벽 빨간 화구 제빵 오븐 (업그레이드 시 황금 2단 프리미엄 데크 오븐으로 확장!)
    const ovenMat = hasOvenUpg ? MAT.gold : MAT.charcoal;
    grp.add(createRoundedToyMesh(hasOvenUpg ? 2.8 : 2.1, hasOvenUpg ? 2.45 : 1.95, 1.05, ovenMat, -2.2, 1.25, -d * 0.5 + 0.82, 0.1));
    // 이글거리는 빨간 화구(Red Hearth)
    grp.add(createRoundedToyMesh(1.35, 0.48, 0.14, MAT.ovenFire, -2.2, 1.18, -d * 0.5 + 1.36, 0.05));
    if (hasOvenUpg) {
      grp.add(createRoundedToyMesh(1.35, 0.44, 0.14, MAT.ovenFire, -2.2, 1.88, -d * 0.5 + 1.36, 0.05));
    }

    // 실내 창가 원형 테이블 1세트 (grp.position 덮어쓰기 방지!)
    const inTable = new THREE.Mesh(GEO.cyl, MAT.white);
    inTable.scale.set(1.15, 0.09, 1.15);
    inTable.position.set(2.9, 0.88, 0.85);
    const inStem = new THREE.Mesh(GEO.cyl, MAT.castIron);
    inStem.scale.set(0.14, 0.62, 0.14);
    inStem.position.set(2.9, 0.54, 0.85);
    grp.add(inTable, inStem);
    seatSlots.push({
      wx: tpl.x + 2.9,
      wy: 0.52,
      wz: tpl.z + 1.55,
      tableX: tpl.x + 2.9,
      tableY: 1.16,
      tableZ: tpl.z + 0.85,
      rotY: Math.PI,
      outdoor: false,
      occupiedBy: null
    });

    // ③ 가게 앞 인도 초록색 대형 파라솔 야외 원형 테이블 세트 (기본 2세트, 테라스 확장 시 4세트!)
    const terraceXs = hasTerraceUpg ? [-3.8, -1.35, 1.35, 3.8] : [-2.3, 1.9];
    for (const tx of terraceXs) {
      const pSet = createGreenParasolTableSet3D(true);
      pSet.position.set(tx, 0.02, d * 0.5 + 2.35);
      grp.add(pSet);
      seatSlots.push({
        wx: tpl.x + tx - 0.96,
        wy: 0.44,
        wz: tpl.z + d * 0.5 + 2.35,
        tableX: tpl.x + tx,
        tableY: 1.12,
        tableZ: tpl.z + d * 0.5 + 2.35,
        rotY: Math.PI / 2,
        outdoor: true,
        occupiedBy: null
      });
      seatSlots.push({
        wx: tpl.x + tx + 0.96,
        wy: 0.44,
        wz: tpl.z + d * 0.5 + 2.35,
        tableX: tpl.x + tx,
        tableY: 1.12,
        tableZ: tpl.z + d * 0.5 + 2.35,
        rotY: -Math.PI / 2,
        outdoor: true,
        occupiedBy: null
      });
    }

    if (hasCrateUpg) {
      const c1 = createFruitWoodenCrate3D('apple');
      c1.position.set(-3.8, 0.02, d * 0.5 + 0.65);
      grp.add(c1);
    }
  } else if (tpl.kind === 'roastery') {
    // ① 가게 앞 인도 빨간 사과 & 오렌지가 담긴 나무 상자(Wooden Crates) 진열대!
    const crateConfigs = hasCrateUpg
      ? [[-3.7, 'apple'], [-2.35, 'orange'], [-1.0, 'mix'], [3.35, 'apple']]
      : [[-3.3, 'apple'], [-1.95, 'orange']];
    for (const [cx, fk] of crateConfigs) {
      const crate = createFruitWoodenCrate3D(fk);
      crate.position.set(cx, 0.02, d * 0.5 + 0.72);
      grp.add(crate);
    }

    // ② 내부 에스프레소 머신 & 원두 그라인더 & 창가 테이블
    const espMat = hasOvenUpg ? MAT.gold : MAT.silver;
    grp.add(createRoundedToyMesh(1.25, 0.72, 0.62, espMat, -0.25, 1.72, -0.35, 0.08));
    // 원두 그라인더 호퍼
    const grinder = new THREE.Mesh(GEO.cyl, MAT.charcoal);
    grinder.scale.set(0.34, 0.52, 0.34);
    grinder.position.set(0.68, 1.62, -0.35);
    const hopper = new THREE.Mesh(GEO.cyl, MAT.glass);
    hopper.scale.set(0.42, 0.38, 0.42);
    hopper.position.set(0.68, 2.02, -0.35);
    grp.add(grinder, hopper);

    // 로스팅 드럼 설비
    grp.add(createRoundedToyMesh(1.45, 1.85, 0.95, hasOvenUpg ? MAT.gold : MAT.walnutTrim, -2.55, 1.18, -d * 0.5 + 0.85, 0.1));

    // 실내 창가 바 테이블
    grp.add(createRoundedToyMesh(2.2, 0.88, 0.65, MAT.woodWarm, -2.2, 0.7, d * 0.5 - 0.85, 0.05));
    seatSlots.push({
      wx: tpl.x - 2.2,
      wy: 0.48,
      wz: tpl.z + d * 0.5 - 1.5,
      tableX: tpl.x - 2.2,
      tableY: 1.18,
      tableZ: tpl.z + d * 0.5 - 0.85,
      rotY: 0,
      outdoor: false,
      occupiedBy: null
    });

    // 야외 초록 파라솔 테이블 세트
    const terraceXs = hasTerraceUpg ? [-2.6, 0.2, 2.9] : [1.4, 3.6];
    for (const tx of terraceXs) {
      const pSet = createGreenParasolTableSet3D(false);
      pSet.position.set(tx, 0.02, d * 0.5 + 2.35);
      grp.add(pSet);
      seatSlots.push({
        wx: tpl.x + tx - 0.96,
        wy: 0.44,
        wz: tpl.z + d * 0.5 + 2.35,
        tableX: tpl.x + tx,
        tableY: 1.12,
        tableZ: tpl.z + d * 0.5 + 2.35,
        rotY: Math.PI / 2,
        outdoor: true,
        occupiedBy: null
      });
    }
  } else {
    // FLORES & CO. 플라워 & 빈티지 부티크 샵
    // 가게 앞 알록달록한 꽃화분 계단식 진열대
    const flowerCols = [MAT.pinkSoft, MAT.coral, MAT.duckYellow, MAT.lavender, MAT.mint];
    for (let side = -1; side <= 1; side += 2) {
      const fx = side * 2.55;
      grp.add(createRoundedToyMesh(1.85, 0.52, 0.85, MAT.woodWarm, fx, 0.28, d * 0.5 + 0.65, 0.05));
      for (let k = 0; k < 4; k++) {
        const px = fx - 0.62 + k * 0.42;
        const pot = new THREE.Mesh(GEO.cyl, MAT.terracottaCoral);
        pot.scale.set(0.32, 0.34, 0.32);
        pot.position.set(px, 0.72, d * 0.5 + 0.65);
        const bloom = new THREE.Mesh(getPuffyDomeGeo(0.24, 0.3), flowerCols[(k + (side > 0 ? 2 : 0)) % flowerCols.length]);
        bloom.position.set(px, 1.02, d * 0.5 + 0.65);
        grp.add(pot, bloom);
      }
    }

    // 내부 플라워 아치 선반 & 아로마 증류기
    grp.add(createRoundedToyMesh(2.2, 1.95, 0.72, hasOvenUpg ? MAT.gold : MAT.woodLight, -2.1, 1.22, -d * 0.5 + 0.75, 0.08));
    if (hasTerraceUpg) {
      const pSet = createGreenParasolTableSet3D(true);
      pSet.position.set(0, 0.02, d * 0.5 + 2.25);
      grp.add(pSet);
      seatSlots.push({
        wx: tpl.x - 0.96,
        wy: 0.44,
        wz: tpl.z + d * 0.5 + 2.25,
        tableX: tpl.x,
        tableY: 1.12,
        tableZ: tpl.z + d * 0.5 + 2.25,
        rotY: Math.PI / 2,
        outdoor: true,
        occupiedBy: null
      });
    }
    if (hasCrateUpg) {
      const hc = createFruitWoodenCrate3D('mix');
      hc.position.set(0, 0.02, d * 0.5 + 0.7);
      grp.add(hc);
    }
  }

  // 클릭용 히트박스
  const hitMesh = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.6, h + 1.2, d + 1.4),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitMesh.position.set(0, h * 0.5 + 0.4, 0.3);
  hitMesh.userData = { kind: 'standaloneShop', shopId };
  grp.add(hitMesh);
  pickableMeshes.push(hitMesh);

  standaloneShop3D[shopId] = {
    tpl,
    group: grp,
    hitMesh,
    staffMesh,
    seatSlots
  };

  ensureShopOverlayBadge(shopId);
}


// =========================================================
// 8. 메인 빌딩 · 외곽 개발 부지 · 4종 평면도(원룸/투룸/쓰리룸/복층) · 16종 가구 3D
// =========================================================
function buildAllLots3D() {
  for (const lot of state.lots) {
    buildSingleLot3D(lot.lotId);
  }
}

function clearLot3D(lotId) {
  const prev = lot3D[lotId];
  if (!prev) return;
  scene.remove(prev.root);
  if (prev.pickables) {
    for (const pm of prev.pickables) {
      const idx = pickableMeshes.indexOf(pm);
      if (idx >= 0) pickableMeshes.splice(idx, 1);
    }
  }
  delete lot3D[lotId];
}

function buildSingleLot3D(lotId) {
  clearLot3D(lotId);
  const lot = state.lots.find((l) => l.lotId === lotId);
  if (!lot) return;

  if (!lot.owned || !lot.devType) {
    buildUndevelopedLot3D(lot);
  } else if (DEVELOPMENT_CATALOG[lot.devType]?.isResidential) {
    buildResidentialComplex3D(lot);
  } else {
    buildSpecialDevelopment3D(lot);
  }
  ensureLotOverlayBadge(lot.lotId);
}

function buildUndevelopedLot3D(lot) {
  const root = new THREE.Group();
  root.position.set(lot.x, 0.06, lot.z);
  scene.add(root);

  const pad = createRoundedToyMesh(10.5, 0.16, 8.2, MAT.basePadCream, 0, 0.08, 0, 0.14);
  root.add(pad);

  // 귀여운 흰색 피켓 울타리 & 분양 팻말
  const postGeo = getPicketPostGeo();
  for (let x = -4.5; x <= 4.5; x += 1.5) {
    const p1 = new THREE.Mesh(postGeo, MAT.white);
    p1.position.set(x, 0.44, 3.8);
    const p2 = p1.clone();
    p2.position.set(x, 0.44, -3.8);
    root.add(p1, p2);
  }
  const signPost = createRoundedToyMesh(0.18, 1.4, 0.18, MAT.woodDark, 0, 0.72, 0.4, 0.04);
  const signBoard = createRoundedToyMesh(2.2, 1.1, 0.14, MAT.butter, 0, 1.45, 0.4, 0.08);
  const emblem = new THREE.Mesh(GEO.quad, new THREE.MeshBasicMaterial({ map: TEX.signEmblem }));
  emblem.scale.set(1.9, 0.92, 1);
  emblem.position.set(0, 1.45, 0.49);
  root.add(signPost, signBoard, emblem);

  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(10.8, 2.8, 8.6),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hit.position.y = 1.4;
  hit.userData = { kind: 'lot', lotId: lot.lotId };
  root.add(hit);
  pickableMeshes.push(hit);

  lot3D[lot.lotId] = { root, pickables: [hit], isResidential: false };
}

function buildSpecialDevelopment3D(lot) {
  const root = new THREE.Group();
  root.position.set(lot.x, 0.08, lot.z);
  scene.add(root);

  root.add(createRoundedToyMesh(11.4, 0.24, 9.0, MAT.podiumDeck, 0, 0.12, 0, 0.14));

  if (lot.devType === 'solar_plant') {
    for (let r = -1; r <= 1; r += 2) {
      for (let c = -1; c <= 1; c++) {
        const stand = createRoundedToyMesh(0.24, 1.1, 0.24, MAT.ironSteel, c * 3.1, 0.7, r * 2.1, 0.04);
        const panel = createRoundedToyMesh(2.4, 0.12, 1.8, MAT.roofRoyalNavy, c * 3.1, 1.32, r * 2.1, 0.05);
        panel.rotation.x = 0.42;
        root.add(stand, panel);
      }
    }
  } else if (lot.devType === 'urban_farm') {
    for (let r = -1; r <= 1; r++) {
      const bed = createRoundedToyMesh(8.6, 0.42, 1.8, MAT.woodWarm, 0, 0.42, r * 2.4, 0.08);
      root.add(bed);
      for (let bx = -3.4; bx <= 3.4; bx += 1.35) {
        const leaf = new THREE.Mesh(GEO.sphere, MAT.cloverGreen);
        leaf.scale.set(0.58, 0.38, 0.58);
        leaf.position.set(bx, 0.72, r * 2.4);
        const berry = new THREE.Mesh(GEO.sphere, MAT.appleRed);
        berry.scale.setScalar(0.26);
        berry.position.set(bx + 0.14, 0.88, r * 2.4 + 0.1);
        root.add(leaf, berry);
      }
    }
  } else if (lot.devType === 'sakura_park') {
    const t1 = createBoulevardTree3D(1.3, true);
    t1.position.set(-2.8, 0.22, -1.5);
    const t2 = createBoulevardTree3D(1.25, true);
    t2.position.set(2.8, 0.22, -1.4);
    const bench = createParkBench3D(0);
    bench.position.set(0, 0.24, 1.6);
    root.add(t1, t2, bench);
  } else {
    // bakery_cafe
    root.add(createRoundedToyMesh(7.6, 3.8, 5.6, MAT.cream, 0, 2.1, -0.4, 0.14));
    root.add(createRoundedToyMesh(8.2, 0.5, 6.2, MAT.roofBrickCoral, 0, 4.2, -0.4, 0.12));
    const sign = createFramedSignboard3D(5.2, 1.0, 'cafe');
    sign.position.set(0, 3.6, 2.5);
    root.add(sign);
  }

  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(11.6, 4.8, 9.2),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hit.position.y = 2.4;
  hit.userData = { kind: 'lot', lotId: lot.lotId };
  root.add(hit);
  pickableMeshes.push(hit);

  lot3D[lot.lotId] = { root, pickables: [hit], isResidential: false };
}

function buildResidentialComplex3D(lot) {
  const bState = state.buildings[lot.lotId];
  if (!bState) return;

  const W = GAME_BALANCE.buildingWidth; // 24.4
  const D = GAME_BALANCE.buildingDepth; // 8.2
  const root = new THREE.Group();
  root.position.set(lot.x, 0, lot.z);
  scene.add(root);

  const pickables = [];
  const registerPick = (m) => {
    pickables.push(m);
    pickableMeshes.push(m);
  };

  // 그림자 AO & 석조 기초 포디움
  const aoQuad = new THREE.Mesh(GEO.quad, MAT.buildingAO);
  aoQuad.rotation.x = -Math.PI / 2;
  aoQuad.scale.set(W + 4.2, D + 4.2, 1);
  aoQuad.position.y = 0.05;
  root.add(aoQuad);

  const structGroup = new THREE.Group();
  root.add(structGroup);

  structGroup.add(createRoundedToyMesh(W + 1.2, 0.44, D + 1.2, MAT.podiumStone, 0, 0.22, 0, 0.14));

  // ==================== 1층 주상복합 상가 포디움 (높이 4.6) ====================
  const brickMainMat = lot.devType === 'mixed_2'
    ? makeClayMat(0xFFFFFF, { map: TEX.brickMint, roughness: 0.58 })
    : makeClayMat(0xFFFFFF, { map: TEX.brickWarm, roughness: 0.58 });

  // 1층 본체 블록
  structGroup.add(createRoundedToyMesh(W, 4.38, D, MAT.cream, 0, 2.62, 0, 0.12));

  // 좌측 24H 편의점 쇼윈도 & 간판 & 어닝
  const martAwning = createScallopedAwning3D(7.8, 'coral');
  martAwning.position.set(-7.2, 3.65, D * 0.5 + 0.06);
  structGroup.add(martAwning);
  const martSign = createFramedSignboard3D(6.6, 0.96, 'mart');
  martSign.position.set(-7.2, 4.32, D * 0.5 + 0.14);
  structGroup.add(martSign);
  const martWindow = createRoundedToyMesh(6.8, 2.3, 0.16, MAT.glass, -7.2, 1.95, D * 0.5 + 0.02, 0.06, false, false, false);
  structGroup.add(martWindow);

  // 중앙 아치형 메인 로비 출입문 & 황동 현판
  structGroup.add(createRoundedToyMesh(3.4, 3.4, 0.36, MAT.walnutTrim, 0, 2.1, D * 0.5 + 0.05, 0.12));
  structGroup.add(createRoundedToyMesh(2.5, 2.85, 0.24, MAT.glass, 0, 1.86, D * 0.5 + 0.12, 0.08, false, false, false));

  const brassMat = new THREE.MeshBasicMaterial({ map: createBrassNameplateTexture(bState.title) });
  const brassPlate = new THREE.Mesh(GEO.quad, brassMat);
  brassPlate.scale.set(3.2, 0.78, 1);
  brassPlate.position.set(0, 4.18, D * 0.5 + 0.24);
  structGroup.add(brassPlate);

  // 우측 코인세탁소 쇼윈도 & 드럼 세탁기 회전 애니메이션
  const washAwning = createScallopedAwning3D(7.8, 'sky');
  washAwning.position.set(7.2, 3.65, D * 0.5 + 0.06);
  structGroup.add(washAwning);
  const washSign = createFramedSignboard3D(6.6, 0.96, 'wash');
  washSign.position.set(7.2, 4.32, D * 0.5 + 0.14);
  structGroup.add(washSign);
  for (let wi = -1; wi <= 1; wi++) {
    const wx = 7.2 + wi * 1.85;
    structGroup.add(createRoundedToyMesh(1.42, 1.75, 0.32, MAT.white, wx, 1.52, D * 0.5 + 0.04, 0.08));
    const drum = new THREE.Mesh(GEO.torus, MAT.sky);
    drum.scale.setScalar(0.82);
    drum.position.set(wx, 1.48, D * 0.5 + 0.22);
    structGroup.add(drum);
    spinningWashers.push(drum);
  }

  // ==================== 2~4층 주거 외벽 (뒷벽 · 좌우 측벽 · 지붕 · 스카이 현판) ====================
  const totalResH = 17.5; // y = 4.8 ~ 22.3
  // 뒷벽 & 좌우 벽 (사방 완전 마감!)
  structGroup.add(createRoundedToyMesh(W + 0.2, totalResH, 0.34, brickMainMat, 0, 4.8 + totalResH * 0.5, -D * 0.5 - 0.04, 0.1));
  structGroup.add(createRoundedToyMesh(0.36, totalResH, D + 0.2, brickMainMat, -W * 0.5 - 0.04, 4.8 + totalResH * 0.5, 0, 0.1));
  structGroup.add(createRoundedToyMesh(0.36, totalResH, D + 0.2, brickMainMat, W * 0.5 + 0.04, 4.8 + totalResH * 0.5, 0, 0.1));

  // 층간 슬래브 몰딩
  for (const sy of [4.76, 9.36, 14.18, 22.15]) {
    structGroup.add(createRoundedToyMesh(W + 0.55, 0.28, D + 0.55, MAT.slab, 0, sy, 0, 0.08));
  }

  // 지붕 코니스 & 옥상 현판 (Sky Signboard)
  const roofCapMat = lot.devType === 'mixed_2' ? MAT.roofRoyalNavy : MAT.roofBrickCoral;
  structGroup.add(createRoundedToyMesh(W + 0.9, 0.68, D + 0.9, roofCapMat, 0, 22.58, 0, 0.14));

  const skySignFrame = createRoundedToyMesh(11.6, 2.35, 0.36, MAT.walnutTrim, 0, 24.05, D * 0.35, 0.14);
  const skySignMat = new THREE.MeshBasicMaterial({ map: createBuildingSkySignTexture(bState.title) });
  const skySignFace = new THREE.Mesh(GEO.quad, skySignMat);
  skySignFace.scale.set(11.1, 2.0, 1);
  skySignFace.position.set(0, 24.05, D * 0.35 + 0.2);
  structGroup.add(skySignFrame, skySignFace);

  // ==================== 전면 외관 파사드 그룹 (줌인/룸 포커스 시 X-Ray 투시) ====================
  const frontShellGroup = new THREE.Group();
  root.add(frontShellGroup);
  const shellMats = [];
  const makeShellMat = (hex, map = null, opacity = 1) => {
    const m = new THREE.MeshStandardMaterial({
      color: hex,
      map,
      roughness: 0.52,
      transparent: true,
      opacity
    });
    shellMats.push({ mat: m, baseOpacity: opacity });
    return m;
  };

  const facadeBrickMat = makeShellMat(0xFFFFFF, lot.devType === 'mixed_2' ? TEX.brickMint : TEX.brickWarm, 1.0);
  const facadeTrimMat = makeShellMat(0xFFFDF9, null, 1.0);
  const facadeGlassMat = makeShellMat(0xBAE6FD, null, 0.68);

  // 각 호실별 전면 파사드 창문 + 개별 호실 클릭 히트박스 생성!
  for (const rm of bState.rooms) {
    ensureRoomSchema(rm);
    const fz = rm.lz + rm.rd * 0.5 + 0.08;
    const fCenterY = rm.ly + rm.rh * 0.5;

    // 호실 외벽 패널
    const panel = new THREE.Mesh(new THREE.BoxGeometry(rm.rw - 0.12, rm.rh - 0.12, 0.24), facadeBrickMat);
    panel.position.set(rm.lx, fCenterY, fz);
    frontShellGroup.add(panel);

    // 평형별 창문 배치 (복층은 2단 대형 아치창, 쓰리룸은 3연창, 투룸은 2연창)
    const winCount = rm.colSpan === 3 ? 4 : rm.colSpan === 2 ? 2 : 1;
    const stepX = rm.rw / (winCount + 1);
    for (let wi = 1; wi <= winCount; wi++) {
      const wx = rm.lx - rm.rw * 0.5 + stepX * wi;
      const winH = rm.layoutType === 'loft' ? 2.4 : 2.15;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, winH + 0.24, 0.3), facadeTrimMat);
      frame.position.set(wx, rm.ly + 2.15, fz + 0.04);
      const pane = new THREE.Mesh(new THREE.BoxGeometry(1.88, winH - 0.12, 0.32), facadeGlassMat);
      pane.position.set(wx, rm.ly + 2.15, fz + 0.05);
      frontShellGroup.add(frame, pane);

      if (rm.layoutType === 'loft') {
        const frameTop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.1, 0.3), facadeTrimMat);
        frameTop.position.set(wx, rm.ly + 5.35, fz + 0.04);
        const paneTop = new THREE.Mesh(new THREE.BoxGeometry(1.88, 1.82, 0.32), facadeGlassMat);
        paneTop.position.set(wx, rm.ly + 5.35, fz + 0.05);
        frontShellGroup.add(frameTop, paneTop);
      }
    }

    // 호실 호수 명패 (101 · 원룸 등)
    const meta = ROOM_TYPE_META[rm.layoutType] || ROOM_TYPE_META.studio;
    const plateMat = new THREE.MeshBasicMaterial({
      map: createRoomNumberPlateTexture(rm.name, meta.shortBadge, rm.unlocked),
      transparent: true
    });
    shellMats.push({ mat: plateMat, baseOpacity: 1.0 });
    signMaterialsToRefresh.push({
      kind: 'roomPlate',
      mat: plateMat,
      numStr: rm.name,
      typeLabel: meta.shortBadge,
      unlocked: rm.unlocked
    });
    const plate = new THREE.Mesh(GEO.quad, plateMat);
    plate.scale.set(2.35, 0.68, 1);
    plate.position.set(rm.lx - rm.rw * 0.5 + 1.55, rm.ly + rm.rh - 0.62, fz + 0.22);
    frontShellGroup.add(plate);

    // 어느 각도·줌에서든 방 외벽/내부를 클릭하면 즉시 전체화면 단독 룸 뷰 진입!
    const roomHit = new THREE.Mesh(
      new THREE.BoxGeometry(rm.rw - 0.15, rm.rh - 0.15, rm.rd + 0.5),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    roomHit.position.set(rm.lx, fCenterY, rm.lz);
    roomHit.userData = { kind: 'room', lotId: lot.lotId, roomId: rm.id };
    root.add(roomHit);
    registerPick(roomHit);
  }

  const roomsMap = {};
  const infraGroup = new THREE.Group();
  root.add(infraGroup);

  lot3D[lot.lotId] = {
    root,
    structGroup,
    frontShellGroup,
    shellMats,
    roomsMap,
    infraGroup,
    skySignMat,
    brassMat,
    pickables,
    isResidential: true
  };

  for (const rm of bState.rooms) {
    rebuildRoom3D(lot.lotId, rm);
  }
  rebuildPublicInfraAndManager3D(lot.lotId);
  syncBuildingResidents3D(lot.lotId);
}

function refreshBuildingNameplates3D(lotId) {
  const entry = lot3D[lotId];
  const bState = state.buildings[lotId];
  if (!entry || !bState || !entry.isResidential) return;
  if (entry.skySignMat) {
    entry.skySignMat.map = createBuildingSkySignTexture(bState.title);
    entry.skySignMat.needsUpdate = true;
  }
  if (entry.brassMat) {
    entry.brassMat.map = createBrassNameplateTexture(bState.title);
    entry.brassMat.needsUpdate = true;
  }
}

function rebuildPublicInfraAndManager3D(lotId) {
  const entry = lot3D[lotId];
  const bState = state.buildings[lotId];
  if (!entry || !bState || !entry.infraGroup) return;

  while (entry.infraGroup.children.length > 0) {
    entry.infraGroup.remove(entry.infraGroup.children[0]);
  }

  const W = GAME_BALANCE.buildingWidth;
  const D = GAME_BALANCE.buildingDepth;

  // 1) 유리 엘리베이터 타워
  if (bState.infra.elevator) {
    const elevX = W * 0.5 + 1.25;
    entry.infraGroup.add(createRoundedToyMesh(2.2, 22.0, 2.4, MAT.partitionGlass, elevX, 11.2, 1.2, 0.1, false, false, false));
    entry.infraGroup.add(createRoundedToyMesh(2.35, 0.42, 2.55, MAT.sky, elevX, 22.35, 1.2, 0.08));
    entry.infraGroup.add(createRoundedToyMesh(1.65, 2.3, 1.75, MAT.butter, elevX, 8.2, 1.2, 0.1));
  }

  // 2) 클린 분리수거장
  if (bState.infra.recycling) {
    const rx = -W * 0.5 - 1.35;
    entry.infraGroup.add(createRoundedToyMesh(1.6, 0.14, 3.2, MAT.podiumStone, rx, 0.28, 1.5, 0.05));
    const binMats = [MAT.sky, MAT.mint, MAT.butter];
    for (let i = 0; i < 3; i++) {
      entry.infraGroup.add(createRoundedToyMesh(0.75, 1.05, 0.75, binMats[i], rx, 0.85, 0.5 + i * 0.98, 0.08));
    }
  }

  // 3) 스마트 무인 택배함
  if (bState.infra.parcel_box) {
    entry.infraGroup.add(createRoundedToyMesh(1.95, 2.15, 0.68, MAT.coral, -2.85, 1.32, D * 0.5 + 0.34, 0.08));
    entry.infraGroup.add(createRoundedToyMesh(0.52, 0.42, 0.08, MAT.screenCyan, -2.85, 1.65, D * 0.5 + 0.7, 0.02));
  }

  // 4) 옥상 루프탑 힐링 가든
  if (bState.infra.rooftop_garden) {
    entry.infraGroup.add(createRoundedToyMesh(9.0, 0.26, 5.2, MAT.cloverGreen, -5.5, 23.02, -0.5, 0.1));
    const pSet = createGreenParasolTableSet3D(true);
    pSet.position.set(-5.5, 23.14, -0.5);
    entry.infraGroup.add(pSet);
  }

  // 5) 1층 건물 총괄 지배인 NPC
  if (bState.manager.hired) {
    const mgr = createChibiPerson3D('manager');
    mgr.position.set(2.45, 0.26, D * 0.5 + 0.85);
    entry.infraGroup.add(mgr);
  }
}

// --------------------- 16종 인테리어 가구 & 아치 가벽 & 복층 원목계단 3D ---------------------
function createCatalogBed3D(bedId) {
  const grp = new THREE.Group();
  if (bedId === 'bed_iron') {
    grp.add(createRoundedToyMesh(2.1, 0.42, 2.6, MAT.sky, 0, 0.32, 0, 0.08));
    grp.add(createRoundedToyMesh(2.16, 0.95, 0.14, MAT.ironSteel, 0, 0.56, -1.26, 0.04));
    grp.add(createRoundedToyMesh(1.92, 0.24, 2.35, MAT.white, 0, 0.58, 0.04, 0.08));
    grp.add(createRoundedToyMesh(0.95, 0.18, 0.52, MAT.cream, 0, 0.75, -0.86, 0.06));
  } else if (bedId === 'bed_queen') {
    grp.add(createRoundedToyMesh(2.55, 0.46, 2.85, MAT.woodWarm, 0, 0.32, 0, 0.1));
    grp.add(createRoundedToyMesh(2.62, 1.18, 0.18, MAT.woodDark, 0, 0.68, -1.36, 0.06));
    grp.add(createRoundedToyMesh(2.36, 0.3, 2.58, MAT.mintSoft, 0, 0.62, 0.05, 0.1));
    grp.add(createRoundedToyMesh(0.92, 0.2, 0.52, MAT.white, -0.56, 0.84, -0.92, 0.06));
    grp.add(createRoundedToyMesh(0.92, 0.2, 0.52, MAT.white, 0.56, 0.84, -0.92, 0.06));
  } else if (bedId === 'bed_canopy') {
    grp.add(createRoundedToyMesh(2.6, 0.48, 2.85, MAT.white, 0, 0.34, 0, 0.1));
    grp.add(createRoundedToyMesh(2.42, 0.32, 2.62, MAT.pinkSoft, 0, 0.66, 0.04, 0.1));
    grp.add(createRoundedToyMesh(0.92, 0.22, 0.52, MAT.white, -0.55, 0.88, -0.92, 0.06));
    grp.add(createRoundedToyMesh(0.92, 0.22, 0.52, MAT.white, 0.55, 0.88, -0.92, 0.06));
    for (const [px, pz] of [[-1.22, -1.32], [1.22, -1.32], [-1.22, 1.32], [1.22, 1.32]]) {
      grp.add(createRoundedToyMesh(0.12, 2.45, 0.12, MAT.gold, px, 1.32, pz, 0.03));
    }
    const laceTop = createRoundedToyMesh(2.68, 0.22, 2.9, MAT.canopyLace, 0, 2.52, 0, 0.08, false, false, false);
    grp.add(laceTop);
  } else {
    // bed_bunk 패밀리 원목 2층 침대
    grp.add(createRoundedToyMesh(2.3, 0.34, 2.75, MAT.woodWarm, 0, 0.36, 0, 0.08));
    grp.add(createRoundedToyMesh(2.1, 0.22, 2.55, MAT.butter, 0, 0.58, 0, 0.06));
    grp.add(createRoundedToyMesh(2.3, 0.34, 2.75, MAT.woodWarm, 0, 1.78, 0, 0.08));
    grp.add(createRoundedToyMesh(2.1, 0.22, 2.55, MAT.coral, 0, 2.0, 0, 0.06));
    for (const [px, pz] of [[-1.08, -1.3], [1.08, -1.3], [-1.08, 1.3], [1.08, 1.3]]) {
      grp.add(createRoundedToyMesh(0.14, 2.4, 0.14, MAT.woodDark, px, 1.25, pz, 0.03));
    }
    // 사다리
    for (let s = 0; s < 4; s++) {
      grp.add(createRoundedToyMesh(0.56, 0.08, 0.08, MAT.woodLight, 0.65, 0.55 + s * 0.38, 1.38, 0.02));
    }
  }
  return grp;
}

function createCatalogSofa3D(sofaId) {
  const grp = new THREE.Group();
  if (sofaId === 'sofa_beanbag') {
    const puff = new THREE.Mesh(getPuffyDomeGeo(0.86, 0.98), MAT.duckYellow);
    puff.position.y = 0.48;
    addToonHullOutline(puff, 1.06);
    grp.add(puff);
  } else if (sofaId === 'sofa_mint2') {
    grp.add(createRoundedToyMesh(2.35, 0.44, 1.05, MAT.mint, 0, 0.34, 0, 0.12));
    grp.add(createRoundedToyMesh(2.35, 0.68, 0.28, MAT.mint, 0, 0.76, -0.38, 0.1));
    grp.add(createRoundedToyMesh(0.28, 0.58, 1.02, MAT.mintSoft, -1.12, 0.54, 0, 0.08));
    grp.add(createRoundedToyMesh(0.28, 0.58, 1.02, MAT.mintSoft, 1.12, 0.54, 0, 0.08));
  } else if (sofaId === 'sofa_rocker') {
    for (const ox of [-0.88, 0.88]) {
      const ch = new THREE.Group();
      ch.add(createRoundedToyMesh(0.95, 0.14, 0.95, MAT.woodWarm, 0, 0.48, 0, 0.05));
      ch.add(createRoundedToyMesh(0.92, 0.85, 0.14, MAT.woodDark, 0, 0.92, -0.38, 0.05));
      ch.add(createRoundedToyMesh(0.76, 0.16, 0.76, MAT.coral, 0, 0.6, 0.04, 0.06));
      ch.position.x = ox;
      grp.add(ch);
    }
    grp.add(createRoundedToyMesh(0.68, 0.58, 0.68, MAT.woodLight, 0, 0.3, 0.1, 0.08));
  } else {
    // sofa_leather_l 고급 가죽 L자형 패밀리 소파
    grp.add(createRoundedToyMesh(2.85, 0.46, 1.12, MAT.leatherCamel, -0.25, 0.35, 0, 0.12));
    grp.add(createRoundedToyMesh(2.85, 0.72, 0.3, MAT.leatherCamel, -0.25, 0.8, -0.42, 0.1));
    grp.add(createRoundedToyMesh(1.12, 0.46, 2.05, MAT.leatherCamel, 0.78, 0.35, 0.55, 0.12));
    grp.add(createRoundedToyMesh(1.35, 0.38, 0.75, MAT.woodLight, -0.62, 0.22, 1.15, 0.06));
  }
  return grp;
}

function createCatalogAppliance3D(appId, rw, rd, rh) {
  const grp = new THREE.Group();
  if (appId === 'app_fan') {
    const base = new THREE.Mesh(GEO.cyl, MAT.white);
    base.scale.set(0.58, 0.1, 0.58);
    base.position.set(rw * 0.26, 0.12, -rd * 0.26);
    const pole = new THREE.Mesh(GEO.cyl, MAT.silver);
    pole.scale.set(0.09, 1.18, 0.09);
    pole.position.set(rw * 0.26, 0.7, -rd * 0.26);
    const cage = new THREE.Mesh(GEO.torus, MAT.sky);
    cage.scale.setScalar(0.68);
    cage.position.set(rw * 0.26, 1.32, -rd * 0.26 + 0.08);
    const blade = createRoundedToyMesh(0.46, 0.1, 0.04, MAT.sky, rw * 0.26, 1.32, -rd * 0.26 + 0.1, 0.02);
    spinningFans.push(blade);
    grp.add(base, pole, cage, blade);
  } else if (appId === 'app_ac') {
    // 시네마 빔프로젝터 & 홈시어터 대형 스크린
    const screenY = Math.min(2.65, rh - 1.2);
    grp.add(createRoundedToyMesh(2.85, 1.55, 0.1, MAT.white, 0, screenY, -rd * 0.5 + 0.24, 0.05));
    grp.add(createRoundedToyMesh(2.62, 1.32, 0.08, MAT.screenCyan, 0, screenY, -rd * 0.5 + 0.29, 0.03));
    // 프로젝터 본체 & 삼각 스탠드
    const px = 0.0;
    const pz = 0.95;
    grp.add(createRoundedToyMesh(0.62, 0.26, 0.54, MAT.white, px, 1.08, pz, 0.06));
    grp.add(createRoundedToyMesh(0.12, 0.92, 0.12, MAT.woodDark, px, 0.52, pz, 0.03));
    const lens = new THREE.Mesh(GEO.cyl, MAT.charcoal);
    lens.scale.set(0.18, 0.14, 0.18);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(px, 1.08, pz - 0.3);
    grp.add(lens);
  } else if (appId === 'app_soundmat') {
    // 프리미엄 방음 매트 + 빈티지 원목 LP 턴테이블 오디오
    const matPad = createRoundedToyMesh(rw * 0.76, 0.09, rd * 0.66, MAT.mintSoft, 0, 0.12, 0.2, 0.08);
    grp.add(matPad);
    const lx = rw * 0.28;
    const lz = -rd * 0.28;
    grp.add(createRoundedToyMesh(1.35, 0.78, 0.72, MAT.woodWarm, lx, 0.5, lz, 0.07));
    const vinyl = new THREE.Mesh(GEO.cyl, MAT.charcoal);
    vinyl.scale.set(0.58, 0.06, 0.58);
    vinyl.position.set(lx - 0.15, 0.92, lz);
    const label = new THREE.Mesh(GEO.cyl, MAT.coral);
    label.scale.set(0.22, 0.07, 0.22);
    label.position.set(lx - 0.15, 0.93, lz);
    const arm = createRoundedToyMesh(0.38, 0.05, 0.05, MAT.gold, lx + 0.18, 0.96, lz + 0.08, 0.02);
    arm.rotation.y = -0.45;
    grp.add(vinyl, label, arm);
  } else {
    // app_rgb_desk RGB 트리플 모니터 게이밍 데스크
    const dx = rw * 0.24;
    const dz = -rd * 0.28;
    grp.add(createRoundedToyMesh(2.35, 0.12, 0.96, MAT.charcoal, dx, 0.86, dz, 0.05));
    grp.add(createRoundedToyMesh(0.14, 0.82, 0.86, MAT.ironSteel, dx - 1.02, 0.44, dz, 0.03));
    grp.add(createRoundedToyMesh(0.14, 0.82, 0.86, MAT.ironSteel, dx + 1.02, 0.44, dz, 0.03));
    // 트리플 모니터 (시안 · 퍼플 · 핑크 네온)
    const m1 = createRoundedToyMesh(0.72, 0.48, 0.06, MAT.screenCyan, dx - 0.74, 1.24, dz - 0.12, 0.03);
    m1.rotation.y = 0.26;
    const m2 = createRoundedToyMesh(0.78, 0.5, 0.06, MAT.screenPurple, dx, 1.24, dz - 0.22, 0.03);
    const m3 = createRoundedToyMesh(0.72, 0.48, 0.06, MAT.screenPink, dx + 0.74, 1.24, dz - 0.12, 0.03);
    m3.rotation.y = -0.26;
    grp.add(m1, m2, m3);
  }
  return grp;
}

// 투룸·쓰리룸용 실제 3D 내부 아치형 문틀 가벽
function createArchPartitionWall3D(xPos, rd, wallH, wallMat) {
  const grp = new THREE.Group();
  const h = Math.min(3.55, wallH - 0.45);
  // 뒷쪽 가벽 기둥 + 앞쪽 가벽 기둥 + 상단 아치 인방보 + 반투명 격자 유리창
  grp.add(createRoundedToyMesh(0.24, h, rd * 0.38, wallMat, xPos, h * 0.5 + 0.08, -rd * 0.28, 0.06));
  grp.add(createRoundedToyMesh(0.24, h, rd * 0.24, wallMat, xPos, h * 0.5 + 0.08, rd * 0.34, 0.06));
  grp.add(createRoundedToyMesh(0.26, 0.78, rd * 0.42, wallMat, xPos, h - 0.32, 0.04, 0.08));
  grp.add(createRoundedToyMesh(0.28, h, 0.12, MAT.walnutTrim, xPos, h * 0.5 + 0.08, -rd * 0.08, 0.03));
  grp.add(createRoundedToyMesh(0.28, h, 0.12, MAT.walnutTrim, xPos, h * 0.5 + 0.08, rd * 0.21, 0.03));
  const glassWin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.35, rd * 0.26), MAT.partitionGlass);
  glassWin.position.set(xPos, 2.05, -rd * 0.28);
  grp.add(glassWin);
  return grp;
}

// 복층 로프트(Loft) 전용 실내 원목 계단 + 2층 다락 메자닌 침실 바닥 + 안전 난간
function createLoftMezzanineAndStairs3D(rw, rd, stairStyle = 'oak') {
  const grp = new THREE.Group();
  const mezY = 3.62;
  const mezW = rw * 0.54;
  const mezX = -rw * 0.5 + mezW * 0.5 + 0.14;

  const stairMat = stairStyle === 'gold'
    ? MAT.gold
    : stairStyle === 'coral'
      ? MAT.coral
      : stairStyle === 'walnut'
        ? MAT.woodDark
        : MAT.woodWarm;

  // 2층 메자닌 다락방 슬래브 바닥
  grp.add(createRoundedToyMesh(mezW, 0.26, rd - 0.45, MAT.woodLight, mezX, mezY, -0.05, 0.08));

  // 2층 다락방 우측 & 전면 안전 난간
  const railX = mezX + mezW * 0.5 - 0.08;
  grp.add(createRoundedToyMesh(0.12, 0.96, rd * 0.62, stairMat, railX, mezY + 0.58, -rd * 0.14, 0.03));
  grp.add(createRoundedToyMesh(mezW - 0.2, 0.12, 0.12, stairMat, mezX, mezY + 1.02, rd * 0.5 - 0.36, 0.03));
  for (let bx = -mezW * 0.42; bx <= mezW * 0.42; bx += 0.68) {
    grp.add(createRoundedToyMesh(0.08, 0.88, 0.08, MAT.white, mezX + bx, mezY + 0.55, rd * 0.5 - 0.36, 0.02));
  }

  // 1층 거실에서 2층 메자닌으로 이어지는 9단 입체 원목 계단 + 손잡이 난간!
  const steps = 9;
  const startX = railX + 2.55;
  const endX = railX + 0.12;
  const stairZ = -rd * 0.26;
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps;
    const sx = THREE.MathUtils.lerp(startX, endX, t);
    const sy = t * mezY;
    grp.add(createRoundedToyMesh(0.42, 0.14, 1.15, stairMat, sx, sy, stairZ, 0.04));
    grp.add(createRoundedToyMesh(0.12, sy, 0.18, MAT.woodDark, sx, sy * 0.5, stairZ - 0.42, 0.02));
  }
  // 경사 손잡이 레일
  const railBar = createRoundedToyMesh(3.45, 0.1, 0.1, MAT.walnutTrim, (startX + endX) * 0.5, mezY * 0.5 + 0.78, stairZ + 0.54, 0.03);
  railBar.rotation.z = 0.82;
  grp.add(railBar);

  return { grp, mezX, mezY, stairStartX: startX, stairEndX: endX, stairZ };
}

function rebuildRoom3D(lotId, room) {
  const entry = lot3D[lotId];
  if (!entry || !entry.isResidential) return;
  ensureRoomSchema(room);

  if (entry.roomsMap[room.id]) {
    entry.root.remove(entry.roomsMap[room.id]);
  }

  const rGrp = new THREE.Group();
  rGrp.position.set(room.lx, room.ly, room.lz);
  entry.root.add(rGrp);
  entry.roomsMap[room.id] = rGrp;

  const rw = room.rw;
  const rd = room.rd;
  const rh = room.rh;

  const decorDef = getFurnitureItemDef('decor', room.equippedFurniture.decor);
  const floorTex = TEX[decorDef?.floorKey || 'floor1'] || TEX.floor1;
  const wallTex = TEX[decorDef?.wallKey || 'wallPeach'] || TEX.wallPeach;

  // 바닥 마루 & 뒷벽/측벽 벽지
  const floorMat = makeClayMat(room.unlocked ? 0xFFFFFF : 0xB8ABA0, { map: floorTex, roughness: 0.56 });
  const wallMat = makeClayMat(room.unlocked ? 0xFFFFFF : 0xC6B9AE, { map: wallTex, roughness: 0.62 });

  rGrp.add(createRoundedToyMesh(rw - 0.22, 0.14, rd - 0.22, floorMat, 0, 0.07, 0, 0.06));
  rGrp.add(createRoundedToyMesh(rw - 0.24, rh - 0.22, 0.16, wallMat, 0, rh * 0.5, -rd * 0.5 + 0.14, 0.06));
  rGrp.add(createRoundedToyMesh(0.16, rh - 0.22, rd - 0.26, wallMat, -rw * 0.5 + 0.14, rh * 0.5, 0, 0.06));
  rGrp.add(createRoundedToyMesh(0.16, rh - 0.22, rd - 0.26, wallMat, rw * 0.5 - 0.14, rh * 0.5, 0, 0.06));

  if (!room.unlocked) {
    // 미개방 리모델링 대기 호실 박스 연출
    rGrp.add(createRoundedToyMesh(1.15, 0.95, 1.05, MAT.movingBox, -0.8, 0.62, 0.2, 0.08));
    rGrp.add(createRoundedToyMesh(0.95, 0.82, 0.92, MAT.movingBox, 0.65, 0.55, -0.35, 0.08));
    return;
  }

  // ==================== 4가지 평형 구조별 입체 가벽 · 계단 · 가구 배치 ====================
  const bedMesh = createCatalogBed3D(room.equippedFurniture.bed);
  const sofaMesh = createCatalogSofa3D(room.equippedFurniture.sofa);
  const appMesh = createCatalogAppliance3D(room.equippedFurniture.appliance, rw, rd, rh);
  rGrp.add(appMesh);

  if (room.layoutType === 'studio') {
    // 1) 원룸 스튜디오: 부클레 패브릭 러그로 구분된 좌측 침대 구역 + 우측 서재/소파 구역
    const rug = new THREE.Mesh(GEO.cyl, MAT.rugCoral || MAT.pinkSoft);
    rug.scale.set(3.2, 0.05, 2.6);
    rug.position.set(-rw * 0.22, 0.15, 0.35);
    rGrp.add(rug);

    bedMesh.position.set(-rw * 0.24, 0.14, -rd * 0.16);
    sofaMesh.position.set(rw * 0.2, 0.14, 0.85);
    rGrp.add(bedMesh, sofaMesh);
  } else if (room.layoutType === 'tworoom') {
    // 2) 투룸 스위트: 실제 아치형 내부 가벽으로 거실+주방(좌)과 독립 안방(우) 분리!
    const archWall = createArchPartitionWall3D(0.55, rd, rh, wallMat);
    rGrp.add(archWall);

    // 좌측 거실+주방 싱크대 & 소파
    rGrp.add(createRoundedToyMesh(2.8, 0.92, 0.82, MAT.white, -rw * 0.28, 0.6, -rd * 0.5 + 0.68, 0.06));
    sofaMesh.position.set(-rw * 0.24, 0.14, 0.72);
    // 우측 독립 침실
    bedMesh.position.set(rw * 0.26, 0.14, -rd * 0.14);
    rGrp.add(sofaMesh, bedMesh);
  } else if (room.layoutType === 'threeroom') {
    // 3) 쓰리룸 패밀리 펜트하우스: 한 층 전체 독점 (좌 부부안방 | 중 대형거실·식탁 | 우 아이방)
    rGrp.add(createArchPartitionWall3D(-rw * 0.18, rd, rh, wallMat));
    rGrp.add(createArchPartitionWall3D(rw * 0.2, rd, rh, wallMat));

    // 좌측 부부 안방
    bedMesh.position.set(-rw * 0.35, 0.14, -rd * 0.14);
    // 중앙 대형 거실 소파 + 4인 원목 다이닝 식탁 + 65인치 벽걸이 TV
    sofaMesh.position.set(-0.6, 0.14, 0.92);
    rGrp.add(createRoundedToyMesh(2.4, 0.82, 1.25, MAT.woodWarm, 2.1, 0.55, -0.65, 0.08));
    rGrp.add(createRoundedToyMesh(2.8, 1.45, 0.12, MAT.screenCyan, 0.0, 2.35, -rd * 0.5 + 0.3, 0.04));
    // 우측 아이방/서재 보조 침대 & 책장
    const kidsBed = createCatalogBed3D('bed_bunk');
    kidsBed.scale.setScalar(0.88);
    kidsBed.position.set(rw * 0.36, 0.14, -rd * 0.14);
    rGrp.add(bedMesh, sofaMesh, kidsBed);
  } else {
    // 4) 복층 로프트 하우스 (Loft): 1층 높은 층고 거실 + 원목 실내계단 + 2층 다락 침실!
    const loftData = createLoftMezzanineAndStairs3D(rw, rd, decorDef?.stairStyle || 'oak');
    rGrp.add(loftData.grp);

    // 2층 다락 메자닌 위에 침대 배치!
    bedMesh.scale.setScalar(0.92);
    bedMesh.position.set(loftData.mezX - 0.35, loftData.mezY + 0.14, -rd * 0.14);
    // 1층 넓은 거실에 소파 & 부클레 러그 배치!
    const loftRug = new THREE.Mesh(GEO.cyl, MAT.rugButter || MAT.butter);
    loftRug.scale.set(3.6, 0.05, 2.8);
    loftRug.position.set(rw * 0.18, 0.15, 0.65);
    sofaMesh.position.set(rw * 0.18, 0.14, 0.65);
    rGrp.add(loftRug, bedMesh, sofaMesh);
  }

  // 세입자 집들이 선물 증정품 테이블 영구 진열 (케이크·커피·꽃다발 등)
  if (Array.isArray(room.giftedItems) && room.giftedItems.length > 0) {
    const giftTable = new THREE.Group();
    const tx = room.layoutType === 'tworoom' ? -1.15 : room.layoutType === 'loft' ? 1.55 : 0.15;
    const tz = -0.22;
    giftTable.add(createRoundedToyMesh(1.45, 0.09, 0.92, MAT.white, 0, 0.62, 0, 0.04));
    giftTable.add(createRoundedToyMesh(0.14, 0.6, 0.14, MAT.gold, -0.48, 0.31, 0, 0.03));
    giftTable.add(createRoundedToyMesh(0.14, 0.6, 0.14, MAT.gold, 0.48, 0.31, 0, 0.03));
    room.giftedItems.slice(-3).forEach((gid, idx) => {
      const prop = create3DGiftPropMesh(gid, false);
      prop.scale.setScalar(0.82);
      prop.position.set(-0.38 + idx * 0.38, 0.67, 0);
      giftTable.add(prop);
    });
    giftTable.position.set(tx, 0.14, tz);
    rGrp.add(giftTable);
  }

  // 쓰레기방 오염 단계 시각 표현 (히키코모리 등)
  if (room.trashStage > 0) {
    for (let t = 0; t < room.trashStage * 2; t++) {
      const bag = new THREE.Mesh(getPuffyDomeGeo(0.28, 0.36), t % 2 === 0 ? MAT.trashBag : MAT.pizzaBox);
      bag.position.set(-1.4 + t * 0.72, 0.32, 1.45 - (t % 2) * 0.55);
      rGrp.add(bag);
    }
  }
}

// 1인칭 진열대 상품 & 손 파지(Held Hands) & 집들이 테이블 공용 3D 기프트 메쉬
function create3DGiftPropMesh(itemId = 'item_cake', packagedBox = false) {
  const grp = new THREE.Group();
  if (itemId === 'item_cake') {
    if (packagedBox) {
      // 핑크 파스텔 리본 케이크 상자
      grp.add(createRoundedToyMesh(0.46, 0.34, 0.46, MAT.cream, 0, 0.18, 0, 0.05));
      grp.add(createRoundedToyMesh(0.48, 0.08, 0.48, MAT.pinkSoft, 0, 0.36, 0, 0.03));
      grp.add(createRoundedToyMesh(0.09, 0.38, 0.49, MAT.supercarRed, 0, 0.2, 0, 0.02));
      grp.add(createRoundedToyMesh(0.49, 0.38, 0.09, MAT.supercarRed, 0, 0.2, 0, 0.02));
      const bowL = new THREE.Mesh(GEO.sphere, MAT.supercarRed);
      bowL.scale.set(0.14, 0.09, 0.09);
      bowL.position.set(-0.08, 0.43, 0);
      const bowR = bowL.clone();
      bowR.position.set(0.08, 0.43, 0);
      grp.add(bowL, bowR);
    } else {
      // 딸기 생크림 홀케이크
      const plate = new THREE.Mesh(GEO.cyl, MAT.white);
      plate.scale.set(0.76, 0.06, 0.76);
      plate.position.y = 0.03;
      const sponge = new THREE.Mesh(GEO.cyl, MAT.pinkSoft);
      sponge.scale.set(0.62, 0.28, 0.62);
      sponge.position.y = 0.19;
      const icing = new THREE.Mesh(GEO.cyl, MAT.white);
      icing.scale.set(0.64, 0.1, 0.64);
      icing.position.y = 0.32;
      grp.add(plate, sponge, icing);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const berry = new THREE.Mesh(GEO.sphere, MAT.supercarRed);
        berry.scale.set(0.11, 0.14, 0.11);
        berry.position.set(Math.cos(a) * 0.2, 0.41, Math.sin(a) * 0.2);
        grp.add(berry);
      }
    }
  } else if (itemId === 'item_croissant') {
    if (packagedBox) {
      grp.add(createRoundedToyMesh(0.36, 0.44, 0.26, MAT.paperBag, 0, 0.22, 0, 0.04));
      const cr1 = createRoundedToyMesh(0.24, 0.14, 0.16, MAT.gold, -0.04, 0.46, 0, 0.05);
      cr1.rotation.z = 0.2;
      const cr2 = createRoundedToyMesh(0.22, 0.14, 0.15, MAT.butterOak, 0.06, 0.44, 0.04, 0.05);
      cr2.rotation.z = -0.22;
      grp.add(cr1, cr2);
    } else {
      const tray = createRoundedToyMesh(0.68, 0.06, 0.48, MAT.woodWarm, 0, 0.04, 0, 0.03);
      grp.add(tray);
      for (let i = -1; i <= 1; i++) {
        const cr = createRoundedToyMesh(0.18, 0.14, 0.34, MAT.gold, i * 0.2, 0.14, 0, 0.06);
        grp.add(cr);
      }
    }
  } else if (itemId === 'item_coffee') {
    // 시그니처 아인슈페너 크림 라떼컵
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.38, 16), MAT.white);
    cup.position.y = 0.2;
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.152, 0.138, 0.15, 16), MAT.leatherCamel);
    sleeve.position.y = 0.19;
    const creamDome = new THREE.Mesh(getPuffyDomeGeo(0.16, 0.18), MAT.cream);
    creamDome.position.y = 0.42;
    const straw = new THREE.Mesh(GEO.cyl, MAT.parasolGreen);
    straw.scale.set(0.035, 0.24, 0.035);
    straw.position.set(0.06, 0.48, 0);
    straw.rotation.z = -0.22;
    grp.add(cup, sleeve, creamDome, straw);
  } else if (itemId === 'item_bouquet') {
    // 대형 장미 꽃다발
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.52, 14), MAT.pinkSoft);
    cone.rotation.x = Math.PI;
    cone.position.y = 0.26;
    const ribbon = createRoundedToyMesh(0.22, 0.08, 0.22, MAT.gold, 0, 0.2, 0, 0.03);
    grp.add(cone, ribbon);
    const cols = [MAT.supercarRed, MAT.coral, MAT.pinkSoft, MAT.duckYellow, MAT.supercarRed];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const rose = new THREE.Mesh(GEO.sphere, cols[i]);
      rose.scale.setScalar(0.16);
      rose.position.set(Math.cos(a) * 0.11, 0.54 + (i === 0 ? 0.05 : 0), Math.sin(a) * 0.11);
      grp.add(rose);
    }
  } else {
    // 편의점 프리미엄 도시락
    grp.add(createRoundedToyMesh(0.54, 0.12, 0.4, MAT.charcoal, 0, 0.07, 0, 0.04));
    grp.add(createRoundedToyMesh(0.22, 0.06, 0.32, MAT.white, -0.12, 0.14, 0, 0.02));
    grp.add(createRoundedToyMesh(0.22, 0.06, 0.15, MAT.coral, 0.12, 0.14, -0.08, 0.02));
    grp.add(createRoundedToyMesh(0.22, 0.06, 0.15, MAT.gold, 0.12, 0.14, 0.08, 0.02));
    if (packagedBox) {
      grp.add(createRoundedToyMesh(0.1, 0.16, 0.42, MAT.mint, 0, 0.1, 0, 0.02));
    }
  }
  return grp;
}

// 호실 내부 세입자 & 반려동물 동기화 및 일상 루틴 AI
function syncBuildingResidents3D(lotId) {
  const entry = lot3D[lotId];
  const bState = state.buildings[lotId];
  if (!entry || !bState) return;

  for (const rm of bState.rooms) {
    if (residentActors[rm.id]) {
      for (const a of residentActors[rm.id]) {
        if (a.mesh.parent) a.mesh.parent.remove(a.mesh);
      }
      delete residentActors[rm.id];
    }
    if (roomPetActors[rm.id]) {
      if (roomPetActors[rm.id].mesh.parent) roomPetActors[rm.id].mesh.parent.remove(roomPetActors[rm.id].mesh);
      delete roomPetActors[rm.id];
    }

    const rGrp = entry.roomsMap[rm.id];
    if (!rGrp || !rm.unlocked || !rm.household) continue;

    const hType = HOUSEHOLD_TYPES[rm.household.type] || HOUSEHOLD_TYPES.student;
    const count = Math.min(3, hType.memberCount || 1);
    const list = [];

    for (let i = 0; i < count; i++) {
      const mesh = createChibiPerson3D(rm.household.type);
      if (rm.household.type === 'family4' && i >= 2) {
        mesh.scale.setScalar(0.76); // 귀여운 아이 미니미
      }
      const startX = -1.2 + i * 1.35;
      const startZ = 0.85;
      mesh.position.set(startX, 0.16, startZ);
      rGrp.add(mesh);

      list.push({
        mesh,
        room: rm,
        tx: startX,
        ty: 0.16,
        tz: startZ,
        waitTimer: 0.8 + i * 1.1,
        onLoft: false
      });
    }
    residentActors[rm.id] = list;

    // 쾌적한 방에는 귀여운 웰시코기/고양이 반려동물 동거!
    if (rm.interiorLv >= 1 || rm.layoutType !== 'studio') {
      const petMesh = createCutePet3D(rm.subId === '102' ? 'corgi' : 'cat');
      petMesh.position.set(0.6, 0.16, 1.4);
      rGrp.add(petMesh);
      roomPetActors[rm.id] = {
        mesh: petMesh,
        room: rm,
        tx: 0.6,
        tz: 1.4,
        waitTimer: 1.4
      };
    }
  }
}

function tickBuildingResidentsAI(dt, elapsed) {
  for (const roomId of Object.keys(residentActors)) {
    const actors = residentActors[roomId];
    for (const ac of actors) {
      const rm = ac.room;
      if (ac.waitTimer > 0) {
        ac.waitTimer -= dt;
        ac.mesh.userData.legL.rotation.x *= 0.85;
        ac.mesh.userData.legR.rotation.x *= 0.85;
        if (ac.waitTimer <= 0) {
          // 복층 로프트에서는 1층 거실과 2층 다락방을 오르내림!
          if (rm.layoutType === 'loft' && Math.random() < 0.42) {
            ac.onLoft = !ac.onLoft;
            ac.tx = ac.onLoft ? -rm.rw * 0.24 : rm.rw * 0.18;
            ac.ty = ac.onLoft ? 3.78 : 0.16;
            ac.tz = ac.onLoft ? -0.4 : 0.95;
          } else {
            ac.onLoft = false;
            ac.ty = 0.16;
            ac.tx = (Math.random() - 0.5) * (rm.rw * 0.68);
            ac.tz = (Math.random() - 0.35) * (rm.rd * 0.52);
          }
        }
      } else {
        const dx = ac.tx - ac.mesh.position.x;
        const dy = ac.ty - ac.mesh.position.y;
        const dz = ac.tz - ac.mesh.position.z;
        const dist = Math.hypot(dx, dy, dz);
        if (dist < 0.16) {
          ac.waitTimer = 1.6 + Math.random() * 2.4;
        } else {
          const spd = 2.1 * dt;
          ac.mesh.position.x += (dx / dist) * Math.min(dist, spd);
          ac.mesh.position.y += (dy / dist) * Math.min(dist, spd * 1.15);
          ac.mesh.position.z += (dz / dist) * Math.min(dist, spd);
          ac.mesh.rotation.y = Math.atan2(dx, dz);
          const swing = Math.sin(elapsed * 11) * 0.45;
          ac.mesh.userData.legL.rotation.x = swing;
          ac.mesh.userData.legR.rotation.x = -swing;
        }
      }
    }
  }

  for (const roomId of Object.keys(roomPetActors)) {
    const p = roomPetActors[roomId];
    if (p.waitTimer > 0) {
      p.waitTimer -= dt;
      if (p.waitTimer <= 0) {
        p.tx = (Math.random() - 0.5) * (p.room.rw * 0.55);
        p.tz = 0.3 + Math.random() * 1.4;
      }
    } else {
      const dx = p.tx - p.mesh.position.x;
      const dz = p.tz - p.mesh.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.12) {
        p.waitTimer = 1.8 + Math.random() * 2.2;
      } else {
        p.mesh.position.x += (dx / dist) * Math.min(dist, 1.6 * dt);
        p.mesh.position.z += (dz / dist) * Math.min(dist, 1.6 * dt);
        p.mesh.rotation.y = Math.atan2(dx, dz);
        p.mesh.position.y = 0.16 + Math.abs(Math.sin(elapsed * 14)) * 0.08;
      }
    }
  }
}

// =========================================================
// 9. 모드별 X-Ray 투시 & 룸 아이솔레이션 & 드라이브 시야 제어
// =========================================================
function findRoomById(roomId) {
  if (!roomId) return null;
  for (const b of Object.values(state.buildings)) {
    const found = b.rooms.find((r) => r.id === roomId);
    if (found) return found;
  }
  return null;
}

function updateXRayAndFocusHighlights(dt) {
  const inFpShop = fpState.active && fpState.mode === 'shop';
  const inFpRoom = fpState.active && fpState.mode === 'room';
  const targetRoomObj = inFpRoom ? findRoomById(fpState.roomId) : findRoomById(focusedRoomId);
  const inRoomFocus = (!!targetRoomObj && (inFpRoom || (!driveState.active && !fpState.active)));
  const inShopFocus = !!focusedShopId && !driveState.active && !fpState.active;

  // 스튜디오 배경 전환
  scene.background = (inRoomFocus || inShopFocus || inFpShop) ? TEX.studioBackdrop : TEX.skyBackdrop;
  if (studioStageDisc) {
    if (inRoomFocus && targetRoomObj) {
      const lot = state.lots.find((l) => l.lotId === targetRoomObj.lotId);
      studioStageDisc.position.set((lot?.x || 0) + targetRoomObj.lx, targetRoomObj.ly - 0.18, (lot?.z || 0) + targetRoomObj.lz);
      studioStageDisc.visible = true;
    } else if (inShopFocus) {
      const stpl = STANDALONE_SHOPS_TEMPLATE.find((s) => s.shopId === focusedShopId);
      studioStageDisc.position.set(stpl?.x || 0, 0.08, stpl?.z || 0);
      studioStageDisc.visible = true;
    } else {
      studioStageDisc.visible = false;
    }
  }

  // 스튜디오 보조광 강도 제어
  if (studioKeyLight) {
    const targetInt = (inRoomFocus || inShopFocus || inFpShop) ? 1.2 : 0.0;
    studioKeyLight.intensity = THREE.MathUtils.lerp(studioKeyLight.intensity, targetInt, Math.min(1, dt * 8));
    studioFillLight.intensity = THREE.MathUtils.lerp(studioFillLight.intensity, targetInt * 0.68, Math.min(1, dt * 8));
    studioRimLight.intensity = THREE.MathUtils.lerp(studioRimLight.intensity, targetInt * 0.52, Math.min(1, dt * 8));
  }

  // 아일랜드/단독상가/차량/거리 입주민/구름 가시성 제어
  if (islandRootGroup) islandRootGroup.visible = !inRoomFocus && !inFpShop;
  if (driveState.carRootGroup) driveState.carRootGroup.visible = !inRoomFocus && !inShopFocus && !inFpShop;
  if (driveState.vehicleMesh?.userData?.driverRef) {
    driveState.vehicleMesh.userData.driverRef.visible = !(driveState.active && driveState.cockpitView);
  }
  for (const cl of cloudActors) {
    cl.mesh.visible = !inRoomFocus && !inShopFocus && !inFpShop;
  }
  for (const w of streetOutingActors) {
    w.mesh.visible = !inRoomFocus && !inFpShop && (!inShopFocus || w.targetShopId === focusedShopId);
  }
  for (const sid of Object.keys(standaloneShop3D)) {
    standaloneShop3D[sid].group.visible = !inRoomFocus && !inFpShop && (!inShopFocus || sid === focusedShopId);
  }

  // 주거 빌딩 외벽 투시율(Shell Opacity) 계산
  let targetShell = 1.0;
  if (driveState.active) {
    targetShell = 1.0;
  } else if (inRoomFocus) {
    targetShell = 0.0;
  } else if (camera.zoom > 1.38) {
    targetShell = THREE.MathUtils.clamp(1.0 - (camera.zoom - 1.38) / 0.55, 0.08, 1.0);
  }
  currentShellOpacity = THREE.MathUtils.lerp(currentShellOpacity, targetShell, Math.min(1, dt * 9));

  for (const lid of Object.keys(lot3D)) {
    const entry = lot3D[lid];
    if (!entry) continue;

    if (inShopFocus || inFpShop) {
      entry.root.visible = false;
      continue;
    }
    if (inRoomFocus && targetRoomObj && lid !== targetRoomObj.lotId) {
      entry.root.visible = false;
      continue;
    }
    entry.root.visible = true;

    if (entry.isResidential) {
      if (entry.structGroup) entry.structGroup.visible = !inRoomFocus;
      if (entry.infraGroup) entry.infraGroup.visible = !inRoomFocus;
      if (entry.frontShellGroup) entry.frontShellGroup.visible = currentShellOpacity > 0.03 && !inRoomFocus;

      for (const sm of entry.shellMats) {
        sm.mat.opacity = sm.baseOpacity * currentShellOpacity;
      }

      for (const rid of Object.keys(entry.roomsMap)) {
        entry.roomsMap[rid].visible = !inRoomFocus || rid === targetRoomObj.id;
      }
    }
  }

  updateSelectedRoomFrame3D((inRoomFocus && !inFpRoom) ? targetRoomObj : null);

  if (dom.xrayBadge) {
    if (fpState.active) {
      dom.xrayBadge.textContent = fpState.mode === 'shop' ? '1인칭 상점' : '1인칭 집들이';
    } else if (driveState.active) {
      dom.xrayBadge.textContent = driveState.cockpitView ? '1인칭 운전석' : '3인칭 드라이브';
    } else if (inRoomFocus) {
      dom.xrayBadge.textContent = '단독 룸 뷰';
    } else if (inShopFocus) {
      dom.xrayBadge.textContent = '상가 내부 뷰';
    } else {
      const pct = Math.round(currentShellOpacity * 100);
      dom.xrayBadge.textContent = pct >= 95 ? '외관 100%' : `내부 투시 ${100 - pct}%`;
    }
  }
}


// =========================================================
// 10. 수익/행복도 경제 엔진 (골든벨 2.5배 피버 & 집들이 선물 영구 +20% 반영)
// =========================================================
function getFeverMultiplier() {
  return (state.feverTimer || 0) > 0 ? 2.5 : 1.0;
}

function calcGlobalSynergyPct() {
  let pct = 0;
  for (const lot of state.lots) {
    if (lot.owned && lot.devType && DEVELOPMENT_CATALOG[lot.devType]) {
      pct += DEVELOPMENT_CATALOG[lot.devType].rentSynergyPct || 0;
    }
  }
  const carDef = getCarDef(state.garage?.currentCar || 'car_scooter');
  pct += carDef.rentBonusPct || 0;
  return pct;
}

function calcBuildingInfraBonusPct(bState) {
  if (!bState || !bState.infra) return 0;
  let pct = 0;
  for (const [k, installed] of Object.entries(bState.infra)) {
    if (installed && PUBLIC_INFRA_CATALOG[k]) {
      pct += PUBLIC_INFRA_CATALOG[k].rentBonusPct || 0;
    }
  }
  return pct;
}

function calcRoomEffectiveRent(bState, room) {
  if (!room || !room.unlocked) return 0;
  const furnAdd = calcRoomFurnitureRentAdd(room);
  const tierDef = ROOM_INTERIOR_TIERS[room.interiorLv || 0] || ROOM_INTERIOR_TIERS[0];
  let base = (room.baseRent || 38) + furnAdd + (tierDef.rentAdd || 0);

  // 평형 선호도 보너스
  if (room.household) {
    const meta = ROOM_TYPE_META[room.layoutType];
    if (meta && meta.preferredBy.includes(room.household.type)) {
      base = Math.round(base * 1.15);
    }
  }
  const giftMult = 1 + (room.giftBonusPct || 0) / 100;
  const mult = 1 + (calcGlobalSynergyPct() + calcBuildingInfraBonusPct(bState)) / 100;
  return Math.round(base * mult * giftMult * getFeverMultiplier());
}

function calcStandaloneShopStats(shopId) {
  const tpl = STANDALONE_SHOPS_TEMPLATE.find((s) => s.shopId === shopId);
  const st = state.standaloneShops?.[shopId];
  if (!tpl || !st) return { visitRev: 18, cycleRev: 30, upgCount: 0 };

  let visitRev = tpl.baseVisitRevenue;
  let cycleRev = tpl.passiveCycleProfit;
  let upgCount = 0;

  for (const upg of SHOP_UPGRADE_CATALOG) {
    if (st.upgrades?.[upg.id]) {
      visitRev += upg.visitBonus;
      cycleRev += upg.cycleBonus;
      upgCount += 1;
    }
  }
  const carDef = getCarDef(state.garage?.currentCar || 'car_scooter');
  if (carDef.rentBonusPct > 0) {
    cycleRev = Math.round(cycleRev * (1 + carDef.rentBonusPct / 100));
  }
  const fMult = getFeverMultiplier();
  return {
    visitRev: Math.round(visitRev * fMult),
    cycleRev: Math.round(cycleRev * fMult),
    upgCount
  };
}

function calcCycleNetIncome() {
  let sum = 0;
  const fMult = getFeverMultiplier();
  for (const b of Object.values(state.buildings)) {
    // 1층 편의점 + 코인세탁소 기본 상가 수익 (골든벨 피버 2.5배 적용)
    sum += Math.round(((b.shopsLv.mart || 1) * 15 + (b.shopsLv.wash || 1) * 13) * fMult);
    for (const rm of b.rooms) {
      if (rm.unlocked && rm.household) {
        sum += calcRoomEffectiveRent(b, rm);
      }
    }
    if (b.manager.hired) {
      sum -= Math.round(GAME_BALANCE.managerSalaryPerCycle * 0.35);
    }
  }
  for (const lot of state.lots) {
    if (lot.owned && lot.devType && !DEVELOPMENT_CATALOG[lot.devType]?.isResidential) {
      sum += Math.round((DEVELOPMENT_CATALOG[lot.devType]?.cycleProfit || 0) * fMult);
    }
  }
  for (const tpl of STANDALONE_SHOPS_TEMPLATE) {
    const st = state.standaloneShops?.[tpl.shopId];
    if (st?.owned) {
      sum += calcStandaloneShopStats(tpl.shopId).cycleRev;
    }
  }
  return Math.max(0, Math.round(sum));
}

function calcAvgHappiness() {
  const carBonus = getCarDef(state.garage?.currentCar || 'car_scooter').happyBonus || 0;
  let total = 0;
  let cnt = 0;
  for (const b of Object.values(state.buildings)) {
    for (const rm of b.rooms) {
      if (rm.unlocked && rm.household) {
        total += Math.min(100, (rm.household.happiness || 85) + carBonus);
        cnt += 1;
      }
    }
  }
  if (cnt === 0) return 100;
  return Math.min(100, Math.max(15, Math.round(total / cnt)));
}

function addGold(amount, screenX = null, screenY = null) {
  const amt = Math.round(amount);
  if (amt <= 0) return;
  state.gold += amt;
  state.stats.totalEarned = (state.stats.totalEarned || 0) + amt;
  hudAnim.targetGold = state.gold;

  // 상단 HUD 숫자 스프링 팝 & +XX만! 플로팅 상승 연출
  const goldWrap = document.getElementById('hud-gold-wrap');
  if (goldWrap) {
    goldWrap.classList.remove('hud-num-pop');
    void goldWrap.offsetWidth;
    goldWrap.classList.add('hud-num-pop');
  }
  const popAnchor = document.getElementById('hud-gold-pop-anchor');
  if (popAnchor) {
    const popEl = document.createElement('div');
    popEl.className = 'hud-gain-float';
    popEl.textContent = `+${amt.toLocaleString()}만!`;
    popAnchor.appendChild(popEl);
    setTimeout(() => popEl.remove(), 1080);
  }

  if (screenX !== null && screenY !== null) {
    spawnFlyingCoinsUI(screenX, screenY, Math.min(6, Math.max(2, Math.ceil(amt / 35))));
  }
  updateTopHUDTargets();
}

function spendGold(cost) {
  const c = Math.round(cost);
  if (state.gold < c) {
    showToast(`자산이 부족합니다! (필요: ${c.toLocaleString()}만)`, 'coral');
    return false;
  }
  state.gold -= c;
  hudAnim.targetGold = state.gold;
  updateTopHUDTargets();
  return true;
}

function updateTopHUDTargets() {
  hudAnim.targetGold = state.gold;
  hudAnim.targetNet = calcCycleNetIncome();
  hudAnim.targetHappy = calcAvgHappiness();
  refreshQuestRedDot();
}

function showToast(msg, tone = 'mint') {
  if (!dom.toastContainer) return;
  while (dom.toastContainer.children.length >= 2) {
    dom.toastContainer.firstElementChild.remove();
  }
  const el = document.createElement('div');
  const borderCol = tone === 'coral' ? '#FF6B6B' : tone === 'gold' ? '#FFD93D' : '#38E54D';
  const icoKey = tone === 'coral' ? 'sparkle_heart_gauge' : tone === 'gold' ? 'coin_stack' : 'cash_arrow_up';
  el.className = 'pastel-toast font-title !text-[11.5px] sm:!text-[12.5px] transition-all duration-300 max-w-full';
  el.style.borderColor = borderCol;
  el.innerHTML = `${createCustomSVGIcon(icoKey, 18)}<span>${msg}</span>`;
  dom.toastContainer.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-6px)';
    setTimeout(() => el.remove(), 240);
  }, 1900);
}

// 3D 파티클 · 파동 링 · 잭팟 텍스트 · 말풍선 · 월세 버블
function spawnPoofParticles3D(wx, wy, wz, hex = 0xFFD43B, count = 10) {
  const mat = makeClayMat(hex, { emissive: hex, emissiveIntensity: 0.45 });
  for (let i = 0; i < count; i++) {
    const p = new THREE.Mesh(GEO.sphere, mat);
    const s = 0.18 + Math.random() * 0.22;
    p.scale.setScalar(s);
    p.position.set(wx, wy, wz);
    scene.add(p);
    const ang = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const spd = 1.8 + Math.random() * 2.6;
    activeParticles.push({
      mesh: p,
      vx: Math.cos(ang) * spd,
      vy: 2.2 + Math.random() * 2.5,
      vz: Math.sin(ang) * spd,
      life: 0.65 + Math.random() * 0.3,
      maxLife: 0.9
    });
  }
}

function spawnShockwaveRing3D(wx, wy, wz, hex = 0xFFD43B, maxScale = 4.2) {
  const m = new THREE.MeshBasicMaterial({
    color: hex,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const ring = new THREE.Mesh(GEO.ring, m);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(wx, wy, wz);
  scene.add(ring);
  shockwaveRings.push({ mesh: ring, mat: m, elapsed: 0, duration: 0.65, maxScale });
}

function spawnJackpotText3D(wx, wy, wz, text, icoKey = 'coin_stack') {
  if (!dom.jackpotLayer) return;
  const pt = projectWorldToScreen(wx, wy, wz);
  if (!pt.visible) return;
  const el = document.createElement('div');
  el.className = 'jackpot-pop';
  el.style.left = `${pt.x}px`;
  el.style.top = `${pt.y}px`;
  el.innerHTML = `${createCustomSVGIcon(icoKey, 17)}<span>${text}</span>`;
  dom.jackpotLayer.appendChild(el);
  setTimeout(() => el.remove(), 1180);
}

function showSpeechBubble3D(key, wx, wy, wz, text, duration = 3.2) {
  if (!dom.speechLayer) return;
  let entry = speechEls[key];
  if (!entry) {
    const el = document.createElement('div');
    el.className = 'speech-cloud';
    dom.speechLayer.appendChild(el);
    entry = { el, wx, wy, wz, timer: duration };
    speechEls[key] = entry;
  }
  entry.el.textContent = text;
  entry.wx = wx;
  entry.wy = wy;
  entry.wz = wz;
  entry.timer = duration;
}

function spawnFlyingCoinsUI(startX, startY, count = 4) {
  if (!dom.flyingCoinLayer || !dom.hudBadgeGold) return;
  const rect = dom.hudBadgeGold.getBoundingClientRect();
  const dstX = rect.left + rect.width * 0.4;
  const dstY = rect.top + rect.height * 0.5;

  for (let i = 0; i < count; i++) {
    const coin = document.createElement('div');
    coin.className = 'flying-coin-dot';
    coin.innerHTML = createCustomSVGIcon('coin_stack', 22);
    coin.style.position = 'fixed';
    coin.style.left = `${startX + (Math.random() - 0.5) * 28}px`;
    coin.style.top = `${startY + (Math.random() - 0.5) * 20}px`;
    coin.style.transition = `all ${0.48 + i * 0.06}s cubic-bezier(0.2, 0.85, 0.35, 1)`;
    dom.flyingCoinLayer.appendChild(coin);

    requestAnimationFrame(() => {
      coin.style.left = `${dstX}px`;
      coin.style.top = `${dstY}px`;
      coin.style.transform = 'scale(0.55)';
      coin.style.opacity = '0.35';
    });
    setTimeout(() => coin.remove(), 680 + i * 70);
  }
}

function spawnRentBubble(sourceKey, wx, wy, wz, amount, label = '') {
  const existing = rentBubbles.find((b) => b.sourceKey === sourceKey);
  if (existing) {
    existing.amount += Math.round(amount);
    existing.el.querySelector('.rb-amt').textContent = `+${existing.amount}만`;
    return;
  }

  const coin3D = new THREE.Mesh(GEO.coin, MAT.gold);
  coin3D.scale.setScalar(1.35);
  coin3D.position.set(wx, wy, wz);
  addToonHullOutline(coin3D, 1.08);
  scene.add(coin3D);

  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'rent-coin-bubble pointer-events-auto';
  el.innerHTML = `
    ${createCustomSVGIcon('coin_stack', 18)}
    <span class="rb-amt font-num text-[12.5px] text-[#3A2E2B]">+${Math.round(amount)}만</span>
  `;

  const bubble = {
    sourceKey,
    wx,
    wy,
    wz,
    amount: Math.round(amount),
    label,
    el,
    coin3D,
    magnetized: false
  };
  el.addEventListener('click', (ev) => {
    ev.stopPropagation();
    collectRentBubble(bubble, 0, ev.clientX, ev.clientY);
  });

  dom.rentBubblesLayer.appendChild(el);
  rentBubbles.push(bubble);
  updateCollectAllButtonVisibility();
}

function collectRentBubble(bubble, bonusPct = 0, clickX = null, clickY = null) {
  const idx = rentBubbles.indexOf(bubble);
  if (idx < 0) return;
  rentBubbles.splice(idx, 1);

  const finalAmt = Math.round(bubble.amount * (1 + bonusPct / 100));
  const pt = projectWorldToScreen(bubble.wx, bubble.wy, bubble.wz);
  const sx = clickX !== null ? clickX : pt.x;
  const sy = clickY !== null ? clickY : pt.y;

  addGold(finalAmt, sx, sy);
  spawnPoofParticles3D(bubble.wx, bubble.wy, bubble.wz, 0xFFD43B, 7);
  if (bonusPct > 0) {
    spawnJackpotText3D(bubble.wx, bubble.wy + 0.9, bubble.wz, `드라이브 보너스 +${finalAmt}만!`, 'magnet_coin');
  } else {
    spawnJackpotText3D(bubble.wx, bubble.wy + 0.6, bubble.wz, `+${finalAmt}만!`, 'coin_stack');
  }

  bubble.el.remove();
  if (bubble.coin3D) scene.remove(bubble.coin3D);
  updateCollectAllButtonVisibility();
}

function collectAllRentBubbles() {
  if (rentBubbles.length === 0) return;
  const copy = [...rentBubbles];
  for (const b of copy) {
    collectRentBubble(b, 0);
  }
  showToast(`밀린 월세·상가 수익 ${copy.length}건을 일괄 수금했습니다!`, 'gold');
}

function updateCollectAllButtonVisibility() {
  if (!dom.btnCollectAll) return;
  dom.btnCollectAll.classList.toggle('hidden', rentBubbles.length === 0 || driveState.active || !!focusedRoomId);
}

// =========================================================
// 11. 입주민 거리 외출 · 초록 파라솔 착석 식사 · 바게트 종이봉투 귀가 AI (이모지 0%)
// =========================================================
function createTableFoodTray3D(shopKind = 'bakery') {
  const grp = new THREE.Group();
  const plate = new THREE.Mesh(GEO.cyl, MAT.white);
  plate.scale.set(0.46, 0.05, 0.46);
  grp.add(plate);

  const cup = new THREE.Mesh(GEO.cyl, MAT.coral);
  cup.scale.set(0.2, 0.24, 0.2);
  cup.position.set(-0.14, 0.14, 0.05);
  grp.add(cup);

  const treat = createRoundedToyMesh(0.2, 0.16, 0.22, shopKind === 'bakery' ? MAT.pinkSoft : MAT.butterOak, 0.1, 0.12, -0.04, 0.04);
  grp.add(treat);
  return grp;
}

function spawnStreetOutingWalker(initialSeated = false) {
  if (streetOutingActors.length >= 8) return;

  const occupiedRooms = [];
  for (const b of Object.values(state.buildings)) {
    for (const rm of b.rooms) {
      if (rm.unlocked && rm.household) occupiedRooms.push(rm);
    }
  }

  const pickedRoom = occupiedRooms.length > 0
    ? occupiedRooms[Math.floor(Math.random() * occupiedRooms.length)]
    : null;
  const rolePool = ['newlywed', 'student', 'family4', 'streamer', 'elderly'];
  const role = pickedRoom ? pickedRoom.household.type : rolePool[Math.floor(Math.random() * rolePool.length)];
  const displayName = pickedRoom ? pickedRoom.household.familyName : '이웃 미니미';

  const shopIds = STANDALONE_SHOPS_TEMPLATE.map((s) => s.shopId);
  const targetShopId = shopIds[Math.floor(Math.random() * shopIds.length)];
  const shopEntry = standaloneShop3D[targetShopId];
  if (!shopEntry) return;

  const tpl = shopEntry.tpl;
  const mesh = createChibiPerson3D(role);
  scene.add(mesh);

  const mainLot = state.lots.find((l) => l.lotId === 'lot_main') || { x: -4.2, z: -6.4 };
  const homeDoorX = mainLot.x;
  const homeDoorZ = mainLot.z + GAME_BALANCE.buildingDepth * 0.5 + 0.65;

  const cwX = tpl.x < -8 ? -15.8 : tpl.x > 8 && tpl.z > 5 ? 15.8 : -3.8;
  const shopFrontZ = tpl.z + tpl.d * 0.5 + 1.05;

  let pathToShop = [];
  if (tpl.z < 0) {
    pathToShop = [
      { x: homeDoorX, z: 1.8 },
      { x: tpl.x, z: 1.8 },
      { x: tpl.x, z: shopFrontZ }
    ];
  } else {
    pathToShop = [
      { x: homeDoorX, z: 2.2 },
      { x: cwX, z: 2.8 },
      { x: cwX, z: 11.2 },
      { x: tpl.x * 0.5, z: 16.5 },
      { x: tpl.x, z: shopFrontZ }
    ];
  }

  const actor = {
    id: `walker_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    mesh,
    role,
    displayName,
    sourceRoom: pickedRoom,
    targetShopId,
    phase: 'to_shop',
    waypoints: pathToShop,
    wpIndex: 0,
    timer: 0,
    seatSlot: null,
    benchSlot: null,
    tableFoodMesh: null,
    homeDoorX,
    homeDoorZ,
    cwX
  };

  if (initialSeated && shopEntry.seatSlots.length > 0) {
    const freeSeat = shopEntry.seatSlots.find((s) => !s.occupiedBy);
    if (freeSeat) {
      freeSeat.occupiedBy = actor.id;
      actor.seatSlot = freeSeat;
      actor.phase = 'dining';
      actor.timer = 6.5 + Math.random() * 5.0;
      mesh.position.set(freeSeat.wx, freeSeat.wy, freeSeat.wz);
      mesh.rotation.y = freeSeat.rotY;
      mesh.userData.legL.rotation.x = -1.15;
      mesh.userData.legR.rotation.x = -1.15;

      const tray = createTableFoodTray3D(tpl.kind);
      tray.position.set(freeSeat.tableX, freeSeat.tableY, freeSeat.tableZ);
      scene.add(tray);
      actor.tableFoodMesh = tray;
    } else {
      mesh.position.set(cwX, 0.24, 14.5);
    }
  } else {
    mesh.position.set(homeDoorX + (Math.random() - 0.5) * 0.8, 0.24, homeDoorZ);
  }

  streetOutingActors.push(actor);
}

function seedInitialStreetVisitors() {
  spawnStreetOutingWalker(true);
  spawnStreetOutingWalker(true);
  spawnStreetOutingWalker(false);
}

function triggerShopOrderRevenue(actor) {
  const shopEntry = standaloneShop3D[actor.targetShopId];
  const st = state.standaloneShops?.[actor.targetShopId];
  if (!shopEntry || !st) return;

  const tpl = shopEntry.tpl;
  const { visitRev } = calcStandaloneShopStats(actor.targetShopId);
  st.totalServed = (st.totalServed || 0) + 1;

  if (shopEntry.staffMesh) {
    triggerSquashStretch(shopEntry.staffMesh, 1.15);
  }

  // 상가 지붕 배지와 절대 겹치지 않도록 전면 테라스 상단에 코인 버블 배치!
  if (st.owned) {
    spawnJackpotText3D(tpl.x, tpl.h + 1.0, tpl.z + 1.8, `+${visitRev}만! (${tpl.name})`, 'coin_stack');
    spawnRentBubble(
      `shop_sale_${actor.targetShopId}`,
      tpl.x + 1.6,
      1.95,
      tpl.z + 3.6,
      visitRev,
      tpl.name
    );
  } else {
    spawnJackpotText3D(tpl.x, tpl.h + 1.0, tpl.z + 1.8, `매장결제 +${visitRev}만`, 'coin_stack');
  }
  spawnPoofParticles3D(tpl.x, 1.8, tpl.z + 0.5, 0xFFD43B, 6);

  if (focusedShopId === actor.targetShopId) {
    renderFocusedShopPanel();
  }
}

function tickStreetOutingAndDiningAI(dt, elapsed) {
  outingSpawnTimer -= dt;
  if (outingSpawnTimer <= 0) {
    outingSpawnTimer = 4.2 + Math.random() * 2.8;
    spawnStreetOutingWalker(false);
  }

  for (const tpl of STANDALONE_SHOPS_TEMPLATE) {
    const st = state.standaloneShops?.[tpl.shopId];
    if (!st || !st.owned) continue;
    st.cycleTimer -= dt;
    if (st.cycleTimer <= 0) {
      st.cycleTimer = 11.5;
      const { cycleRev } = calcStandaloneShopStats(tpl.shopId);
      spawnRentBubble(`shop_cycle_${tpl.shopId}`, tpl.x - 1.6, 1.95, tpl.z + 3.6, cycleRev, tpl.name);
    }
  }

  for (let i = streetOutingActors.length - 1; i >= 0; i--) {
    const ac = streetOutingActors[i];
    const shopEntry = standaloneShop3D[ac.targetShopId];
    const tpl = shopEntry?.tpl;

    if (ac.phase === 'to_shop' || ac.phase === 'go_home') {
      const target = ac.waypoints[ac.wpIndex];
      if (!target) {
        if (ac.phase === 'to_shop') {
          ac.phase = 'ordering';
          ac.timer = 1.4;
          if (tpl) {
            ac.mesh.position.set(tpl.x + 0.3, 0.48, tpl.z + 0.55);
            ac.mesh.rotation.y = Math.PI;
          }
          ac.mesh.userData.legL.rotation.x = 0;
          ac.mesh.userData.legR.rotation.x = 0;
          showSpeechBubble3D(
            ac.id,
            ac.mesh.position.x,
            ac.mesh.position.y + 1.9,
            ac.mesh.position.z,
            tpl?.kind === 'bakery' ? '갓 구운 바게트랑 딸기케이크 주세요!' : tpl?.kind === 'roastery' ? '아이스 라떼랑 유기농 사과 주세요!' : '오늘 피어난 프리지아 꽃다발 주세요!',
            2.2
          );
        } else {
          if (ac.sourceRoom && ac.sourceRoom.household) {
            ac.sourceRoom.household.happiness = Math.min(100, (ac.sourceRoom.household.happiness || 85) + 8);
            spawnPoofParticles3D(ac.mesh.position.x, 1.5, ac.mesh.position.z, 0xFF6B6B, 6);
          }
          if (speechEls[ac.id]) {
            speechEls[ac.id].el.remove();
            delete speechEls[ac.id];
          }
          scene.remove(ac.mesh);
          streetOutingActors.splice(i, 1);
        }
        continue;
      }

      const dx = target.x - ac.mesh.position.x;
      const dz = target.z - ac.mesh.position.z;
      const dist = Math.hypot(dx, dz);
      const walkSpeed = 4.2;

      if (dist < 0.25) {
        ac.wpIndex += 1;
        if (ac.phase === 'to_shop' && ac.wpIndex === 3 && Math.random() < 0.28) {
          const freeBench = fountainBenchSeats.find((b) => !b.occupiedBy);
          if (freeBench) {
            freeBench.occupiedBy = ac.id;
            ac.benchSlot = freeBench;
            ac.phase = 'bench_rest';
            ac.timer = 3.2;
            ac.mesh.position.set(freeBench.x, freeBench.y, freeBench.z);
            ac.mesh.rotation.y = freeBench.rotY;
            ac.mesh.userData.legL.rotation.x = -1.1;
            ac.mesh.userData.legR.rotation.x = -1.1;
            showSpeechBubble3D(ac.id, freeBench.x, freeBench.y + 1.85, freeBench.z, '분수대 물소리 너무 시원하다~', 2.8);
          }
        }
      } else {
        ac.mesh.position.x += (dx / dist) * Math.min(dist, walkSpeed * dt);
        ac.mesh.position.z += (dz / dist) * Math.min(dist, walkSpeed * dt);
        ac.mesh.position.y = 0.24 + Math.abs(Math.sin(elapsed * 11 + i)) * 0.06;
        ac.mesh.rotation.y = Math.atan2(dx, dz);
        const swing = Math.sin(elapsed * 12 + i) * 0.52;
        ac.mesh.userData.legL.rotation.x = swing;
        ac.mesh.userData.legR.rotation.x = -swing;
        ac.mesh.userData.armL.rotation.x = -swing * 0.7;
        ac.mesh.userData.armR.rotation.x = ac.mesh.userData.carryBag.visible ? -0.45 : swing * 0.7;
      }
    } else if (ac.phase === 'bench_rest') {
      ac.timer -= dt;
      if (ac.timer <= 0) {
        if (ac.benchSlot) {
          ac.benchSlot.occupiedBy = null;
          ac.benchSlot = null;
        }
        ac.phase = 'to_shop';
      }
    } else if (ac.phase === 'ordering') {
      ac.timer -= dt;
      if (ac.timer <= 0) {
        triggerShopOrderRevenue(ac);

        const freeSeat = shopEntry?.seatSlots?.find((s) => !s.occupiedBy);
        if (freeSeat) {
          freeSeat.occupiedBy = ac.id;
          ac.seatSlot = freeSeat;
          ac.phase = 'dining';
          ac.timer = 5.5 + Math.random() * 3.5;
          ac.mesh.position.set(freeSeat.wx, freeSeat.wy, freeSeat.wz);
          ac.mesh.rotation.y = freeSeat.rotY;
          ac.mesh.userData.legL.rotation.x = -1.15;
          ac.mesh.userData.legR.rotation.x = -1.15;

          const tray = createTableFoodTray3D(tpl?.kind || 'bakery');
          tray.position.set(freeSeat.tableX, freeSeat.tableY, freeSeat.tableZ);
          scene.add(tray);
          ac.tableFoodMesh = tray;

          showSpeechBubble3D(
            ac.id,
            freeSeat.wx,
            freeSeat.wy + 1.85,
            freeSeat.wz,
            '초록 파라솔 아래 커피랑 케이크 최고~!',
            3.0
          );
        } else {
          startWalkerReturnHome(ac, tpl);
        }
      }
    } else if (ac.phase === 'dining') {
      ac.timer -= dt;
      ac.mesh.userData.bodyRig.rotation.x = Math.sin(elapsed * 3.2 + i) * 0.06;
      if (ac.timer <= 0) {
        if (ac.seatSlot) {
          ac.seatSlot.occupiedBy = null;
          ac.seatSlot = null;
        }
        if (ac.tableFoodMesh) {
          scene.remove(ac.tableFoodMesh);
          ac.tableFoodMesh = null;
        }
        ac.mesh.userData.bodyRig.rotation.x = 0;
        startWalkerReturnHome(ac, tpl);
      }
    }
  }
}

function startWalkerReturnHome(ac, tpl) {
  ac.mesh.userData.carryBag.visible = true;
  ac.phase = 'go_home';
  ac.wpIndex = 0;

  if (tpl && tpl.z < 0) {
    ac.waypoints = [
      { x: tpl.x, z: 1.8 },
      { x: ac.homeDoorX, z: 1.8 },
      { x: ac.homeDoorX, z: ac.homeDoorZ }
    ];
  } else {
    ac.waypoints = [
      { x: ac.cwX, z: 11.2 },
      { x: ac.cwX, z: 2.6 },
      { x: ac.homeDoorX, z: 2.2 },
      { x: ac.homeDoorX, z: ac.homeDoorZ }
    ];
  }

  showSpeechBubble3D(
    ac.id,
    ac.mesh.position.x,
    ac.mesh.position.y + 1.9,
    ac.mesh.position.z,
    '따끈한 바게트 포장 완료~ 기분 최고!',
    2.6
  );
}

// =========================================================
// 12. 카메라 전환 (모바일 세로 390x844 풀 프레이밍 대응)
// =========================================================
function syncTopBarsByMode() {
  const inFp = fpState.active;
  const inDrive = driveState.active && !inFp;
  const inRoom = !!focusedRoomId && !inDrive && !inFp;
  const inShop = !!focusedShopId && !inDrive && !inFp;

  dom.hudTownControls?.classList.toggle('hidden', inDrive || inRoom || inShop || inFp);
  dom.roomFocusTopbar?.classList.toggle('hidden', !inRoom);
  dom.shopFocusTopbar?.classList.toggle('hidden', !inShop);
  dom.driveFocusTopbar?.classList.toggle('hidden', !inDrive);
  dom.fpFocusTopbar?.classList.toggle('hidden', !inFp);

  dom.roomFocusPanel?.classList.toggle('hidden', !inRoom);
  dom.shopFocusPanel?.classList.toggle('hidden', !inShop);
  dom.furnitureCatalogSheet?.classList.toggle('hidden', !(inRoom || inShop));
  dom.driveModeHud?.classList.toggle('hidden', !inDrive);
  dom.cockpitOverlay?.classList.toggle('hidden', !(inDrive && driveState.cockpitView));
  dom.driveProximityBar?.classList.toggle('hidden', !inDrive);
  dom.fpModeHud?.classList.toggle('hidden', !inFp);
  dom.bottomTownBar?.classList.toggle('hidden', inDrive || inRoom || inShop || inFp);
  dom.isolationVignette?.classList.toggle('hidden', !(inRoom || inShop));

  updateCollectAllButtonVisibility();
}

function setOverviewCamera(animate = true) {
  if (fpState.active) {
    exitFirstPersonMode(false);
    return;
  }
  if (driveState.active) {
    exitDriveMode();
    return;
  }
  const prevShop = focusedShopId;
  focusedRoomId = null;
  focusedShopId = null;
  if (prevShop) rebuildStandaloneShop3D(prevShop);

  controls.enabled = true;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = Math.PI * 0.44;
  controls.enablePan = true;

  const isMobilePortrait = window.innerWidth < 640 && window.innerHeight > window.innerWidth;
  const offset = CAM_OFFSETS[camAzimuth % 4];
  const targetLook = isMobilePortrait ? new THREE.Vector3(-1.2, 4.4, 8.2) : OVERVIEW_LOOK.clone();
  const targetPos = targetLook.clone().add(offset);
  const targetZoom = isMobilePortrait ? 0.45 : 0.78;

  if (animate) {
    camTween.pos.copy(targetPos);
    camTween.look.copy(targetLook);
    camTween.zoom = targetZoom;
    camTween.active = true;
  } else {
    camera.position.copy(targetPos);
    controls.target.copy(targetLook);
    camera.zoom = targetZoom;
    camera.updateProjectionMatrix();
    controls.update();
  }
  syncTopBarsByMode();
}

function ensureCatalogSheetExpanded() {
  isCatalogCollapsed = false;
  dom.fcatCollapsibleBody?.classList.remove('hidden');
  if (dom.fcatToggleLabel) dom.fcatToggleLabel.textContent = '접기';
}

function focusCameraOnRoom(roomId) {
  if (driveState.active) exitDriveMode();
  if (focusedShopId) {
    const oldShop = focusedShopId;
    focusedShopId = null;
    rebuildStandaloneShop3D(oldShop);
  }

  const rm = findRoomById(roomId);
  if (!rm) return;
  const lot = state.lots.find((l) => l.lotId === rm.lotId);
  if (!lot) return;

  focusedRoomId = rm.id;
  ensureCatalogSheetExpanded();

  const wx = lot.x + rm.lx;
  const wy = rm.ly + rm.rh * 0.44;
  const wz = lot.z + rm.lz;

  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  const frustumH = 38;
  const frustumW = frustumH * aspect;
  const spanW = rm.rw * 1.28 + 2.6;
  const spanH = rm.rh * 1.56 + 4.2;
  const fitZoom = Math.min(frustumW / spanW, frustumH / spanH) * 0.86;

  camTween.look.set(wx, wy - 0.25, wz);
  camTween.pos.set(wx + rm.rw * 0.52 + 12.5, wy + rm.rh * 0.85 + 9.2, wz + 22.5);
  camTween.zoom = THREE.MathUtils.clamp(fitZoom, 1.45, 3.65);
  camTween.active = true;

  controls.enablePan = false;
  controls.minPolarAngle = 0.42;
  controls.maxPolarAngle = Math.PI * 0.46;

  syncTopBarsByMode();
  renderRoomSwitcherChips(rm.lotId);
  renderFocusedRoomInspector();
  renderFurnitureCatalogSheet();
}

function exitRoomFocusMode() {
  if (!focusedRoomId) return;
  focusedRoomId = null;
  setOverviewCamera(true);
}

function focusCameraOnShop(shopId) {
  if (driveState.active) exitDriveMode();
  focusedRoomId = null;
  ensureCatalogSheetExpanded();

  const prevShop = focusedShopId;
  focusedShopId = shopId;
  if (prevShop && prevShop !== shopId) rebuildStandaloneShop3D(prevShop);
  rebuildStandaloneShop3D(shopId);

  const tpl = STANDALONE_SHOPS_TEMPLATE.find((s) => s.shopId === shopId);
  if (!tpl) return;

  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  const frustumH = 38;
  const frustumW = frustumH * aspect;
  const fitZoom = Math.min(frustumW / 16.0, frustumH / 13.0) * 0.88;

  camTween.look.set(tpl.x, 1.85, tpl.z + 0.9);
  camTween.pos.set(tpl.x + 13.5, 13.2, tpl.z + 20.5);
  camTween.zoom = THREE.MathUtils.clamp(fitZoom, 1.55, 2.95);
  camTween.active = true;

  controls.enablePan = false;
  syncTopBarsByMode();
  renderShopSwitcherChips();
  renderFocusedShopPanel();
  renderShopUpgradeCatalog();
}

function exitShopFocusMode() {
  const prev = focusedShopId;
  focusedShopId = null;
  if (prev) rebuildStandaloneShop3D(prev);
  setOverviewCamera(true);
}

// =========================================================
// 13. 건물주 VIP 슈퍼카 차고 & GTA식 3인칭 드라이브 모드 (와이드 썸네일 & 커스텀 SVG)
// =========================================================
function openGarageModal() {
  renderGarageCards();
  dom.garageModal?.classList.remove('hidden');
}

function closeGarageModal() {
  dom.garageModal?.classList.add('hidden');
}

function renderGarageCards() {
  if (!dom.garageCardsGrid) return;
  const ownedList = state.garage?.ownedCars || ['car_scooter'];
  const currentId = state.garage?.currentCar || 'car_scooter';

  dom.garageCardsGrid.innerHTML = CAR_CATALOG.map((car) => {
    const isOwned = ownedList.includes(car.id);
    const isEquipped = currentId === car.id;

    let actionBtn = '';
    if (isEquipped) {
      actionBtn = `
        <button type="button" data-car-drive="${car.id}" class="jelly-action-btn btn-coral-lip w-full py-2 mt-0.5">
          ${createCustomSVGIcon('steering_supercar', 18)}
          <span>이 차량으로 드라이브 출발!</span>
        </button>`;
    } else if (isOwned) {
      actionBtn = `
        <button type="button" data-car-equip="${car.id}" class="jelly-action-btn btn-mint-lip w-full py-2 mt-0.5">
          ${createCustomSVGIcon('garage_key', 17)}
          <span>주차구역 배차 & 탑승</span>
        </button>`;
    } else {
      actionBtn = `
        <button type="button" data-car-buy="${car.id}" class="jelly-action-btn btn-gold-lip w-full py-2 mt-0.5">
          ${createCustomSVGIcon('coin_stack', 17)}
          <span>${car.cost.toLocaleString()}만 출고 & 배차</span>
        </button>`;
    }

    return `
      <div class="fcat-item-card !p-2.5 ${isEquipped ? 'equipped-card' : ''}">
        <div class="fcat-thumb-stage !py-1.5">${createCatalogThumbnailSVG(car.id, 210, 76)}</div>
        <div class="space-y-1 mt-0.5">
          <div class="flex items-center justify-between gap-1.5">
            <span class="font-title text-[14.5px] text-[#3A2E2B]">${car.name}</span>
            ${isEquipped
              ? '<span class="kw-chip tone-coral !py-0.5 !px-2">탑승중</span>'
              : isOwned
                ? '<span class="kw-chip tone-mint !py-0.5 !px-2">보유중</span>'
                : ''}
          </div>
          <div class="flex flex-wrap gap-1.5">
            <span class="kw-chip tone-${car.tone}">${car.chip}</span>
            <span class="kw-chip tone-sky">자석수금 +${car.driveTipPct}%</span>
          </div>
        </div>
        ${actionBtn}
      </div>
    `;
  }).join('');

  dom.garageCardsGrid.querySelectorAll('[data-car-buy]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cid = btn.getAttribute('data-car-buy');
      const car = getCarDef(cid);
      if (!spendGold(car.cost)) return;
      if (!state.garage.ownedCars.includes(cid)) state.garage.ownedCars.push(cid);
      state.garage.currentCar = cid;
      refreshPlayerCar3D();
      playSupercarHornSound(cid);
      spawnPoofParticles3D(driveState.carRootGroup.position.x, driveState.carRootGroup.position.y + 1.0, driveState.carRootGroup.position.z, 0xFFD43B, 14);
      spawnShockwaveRing3D(driveState.carRootGroup.position.x, 0.35, driveState.carRootGroup.position.z, 0xFF6B6B, 5.2);
      updateTopHUDTargets();
      renderGarageCards();
      syncDriveTopBadges();
      showToast(`[${car.name}] VIP 출고 완료!`, 'gold');
      saveGameState();
    });
  });

  dom.garageCardsGrid.querySelectorAll('[data-car-equip]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cid = btn.getAttribute('data-car-equip');
      state.garage.currentCar = cid;
      refreshPlayerCar3D();
      playSupercarHornSound(cid);
      updateTopHUDTargets();
      renderGarageCards();
      syncDriveTopBadges();
      showToast(`[${getCarDef(cid).name}] 차량으로 교체했습니다!`, 'mint');
      saveGameState();
    });
  });

  dom.garageCardsGrid.querySelectorAll('[data-car-drive]').forEach((btn) => {
    btn.addEventListener('click', () => {
      closeGarageModal();
      if (!driveState.active) enterDriveMode();
    });
  });
}

function syncDriveTopBadges() {
  const car = getCarDef(state.garage?.currentCar || 'car_scooter');
  if (dom.driveCarBadge) {
    dom.driveCarBadge.innerHTML = `${createCustomSVGIcon('steering_supercar', 16)}<span>${car.name}</span>`;
  }
  if (dom.driveLootBadge) {
    dom.driveLootBadge.innerHTML = `${createCustomSVGIcon('magnet_coin', 16)}<span>드라이브 수금 +${driveState.sessionLoot.toLocaleString()}만</span>`;
  }
  const cruiseLbl = document.getElementById('label-drive-cruise');
  if (cruiseLbl) {
    cruiseLbl.textContent = driveState.autoCruise ? '자율 크루징 ON' : '수동 주행 (WASD)';
  }
  const ckLbl = document.getElementById('label-toggle-cockpit');
  if (ckLbl) {
    ckLbl.textContent = driveState.cockpitView ? '3인칭 추격 시점' : '1인칭 운전석';
  }
  syncCockpitDashboardUI();
}

function syncCockpitDashboardUI() {
  const ch = FP_RADIO_CHANNELS[driveState.radioChannelIdx % FP_RADIO_CHANNELS.length];
  const moodEl = document.getElementById('cockpit-mood-strip');
  if (moodEl && ch) {
    moodEl.style.background = ch.moodHex;
    moodEl.style.boxShadow = `0 0 16px ${ch.glowRgba}`;
  }
  const rTitle = document.getElementById('cockpit-radio-title');
  const rSub = document.getElementById('cockpit-radio-sub');
  const eqWrap = document.getElementById('cockpit-eq-bars');
  if (rTitle && ch) rTitle.textContent = ch.label;
  if (rSub && ch) rSub.textContent = ch.sub;
  if (eqWrap && ch) eqWrap.classList.toggle('paused', ch.id === 'off');

  const visor = document.getElementById('cockpit-roof-visor');
  if (visor) visor.classList.toggle('roof-open', !!driveState.roofOpen);
  const roofLbl = document.getElementById('label-cockpit-roof');
  if (roofLbl) roofLbl.textContent = driveState.roofOpen ? '오픈카 ON' : '루프 닫힘';
  if (driveState.vehicleMesh?.userData?.roofRef) {
    driveState.vehicleMesh.userData.roofRef.visible = !driveState.roofOpen;
  }
}

function toggleCockpitView(forceState = null) {
  if (!driveState.active) return;
  driveState.cockpitView = typeof forceState === 'boolean' ? forceState : !driveState.cockpitView;
  driveCamera.fov = driveState.cockpitView ? 68 : 58;
  driveCamera.updateProjectionMatrix();

  if (driveState.vehicleMesh?.userData?.driverRef) {
    driveState.vehicleMesh.userData.driverRef.visible = !driveState.cockpitView;
  }
  if (driveState.cockpitView) {
    startOrUpdateCarRadioBGM();
    showToast('1인칭 슈퍼카 운전석 시점! 카오디오 라디오와 핸들 조향이 활성화되었습니다!', 'gold');
  } else {
    showToast('3인칭 슈퍼카 추격 시점으로 전환했습니다!', 'sky');
  }
  syncTopBarsByMode();
  syncDriveTopBadges();
}

function cycleCarRadioChannel() {
  driveState.radioChannelIdx = (driveState.radioChannelIdx + 1) % FP_RADIO_CHANNELS.length;
  const ch = FP_RADIO_CHANNELS[driveState.radioChannelIdx];
  syncCockpitDashboardUI();
  startOrUpdateCarRadioBGM();
  showToast(`카오디오 채널 변경: [${ch.label}]`, 'gold');
}

function toggleConvertibleRoof() {
  driveState.roofOpen = !driveState.roofOpen;
  syncCockpitDashboardUI();
  showToast(driveState.roofOpen ? '오픈카 컨버터블 루프를 활짝 열었습니다!' : '루프를 닫아 아늑한 콕핏 모드로 전환했습니다!', 'sky');
}

function updateDriveShopProximityUI() {
  if (!driveState.active) return;
  let best = FP_SHOP_DESTINATIONS[0];
  let minDist = Infinity;
  for (const dest of FP_SHOP_DESTINATIONS) {
    const d = Math.hypot(dest.roadX - driveState.x, dest.roadZ - driveState.z);
    if (d < minDist) {
      minDist = d;
      best = dest;
    }
  }
  driveState.nearestShopId = best.id;

  const icoEl = document.getElementById('prox-shop-ico');
  const nameEl = document.getElementById('prox-shop-name');
  if (icoEl) icoEl.innerHTML = createCustomSVGIcon(best.icon, 22);
  if (nameEl) {
    nameEl.textContent = minDist < 12.5 ? `${best.name} 앞 통과 중!` : `가까운 매장 · ${best.name}`;
  }
}

function triggerDriveThruOrder(targetShopId = null) {
  if (!driveState.active) return;
  const sid = targetShopId || driveState.nearestShopId || 'shop_bakery';
  const dest = FP_SHOP_DESTINATIONS.find((s) => s.id === sid) || FP_SHOP_DESTINATIONS[0];

  // 상가 앞 도로 위치로 부드럽게 정차 정렬
  if (Math.hypot(dest.roadX - driveState.x, dest.roadZ - driveState.z) > 8.5) {
    driveState.x = dest.roadX;
    driveState.z = 7.0;
    if (driveState.carRootGroup) {
      driveState.carRootGroup.position.set(driveState.x, 0.22, driveState.z);
    }
  }
  driveState.driveThruPauseTimer = 2.8;
  driveState.speed = 0;
  driveState.driveThruCooldowns[dest.id] = 12.0;

  // 앞유리 정면 시야(3.6m 전방 우측)로 매장 직원이 달려 나와 인사하도록 배치!
  const fwdX = Math.sin(driveState.heading);
  const fwdZ = Math.cos(driveState.heading);
  const sideSign = dest.roadZ >= 7.0 ? 1 : -1;
  const startZ = dest.roadZ >= 7.0 ? 11.8 : 2.8;
  const targetX = driveState.x + fwdX * 3.6 - fwdZ * 0.9 * sideSign;
  const targetZ = driveState.z + fwdZ * 3.6 + fwdX * 0.9 * sideSign;

  const clerk = createChibiPerson3D(dest.staffRole);
  clerk.userData.carryBag.visible = true;
  clerk.position.set(targetX, 0.24, startZ);
  scene.add(clerk);

  driveState.driveThruRunners.push({
    mesh: clerk,
    tx: targetX,
    tz: targetZ,
    life: 3.6,
    greeted: false,
    dest
  });

  // 양손 슬롯에 모닝커피 + 매장 시그니처 간식 즉시 적재!
  if (!state.heldGifts) state.heldGifts = { left: null, right: null };
  state.heldGifts.left = 'item_coffee';
  if (dest.driveThruItem && dest.driveThruItem !== 'item_coffee') {
    state.heldGifts.right = dest.driveThruItem;
  }
  syncHeldHands3DAndChips();

  playShopDoorChimeSound();
  addGold(25);
  spawnPoofParticles3D(targetX, 1.5, targetZ, 0xFFD93D, 12);
  showSpeechBubble3D(`dt_${dest.id}`, targetX, 2.15, targetZ, dest.driveThruQuote, 3.8);
  showToast(`[${dest.name} 드라이브 스루] 모닝커피 & 테이크아웃 픽업 완료! (+25만)`, 'gold');
  saveGameState();
}

function enterDriveMode(startInCockpit = false) {
  if (fpState.active) exitFirstPersonMode(false);
  if (focusedRoomId) focusedRoomId = null;
  if (focusedShopId) {
    const prevS = focusedShopId;
    focusedShopId = null;
    rebuildStandaloneShop3D(prevS);
  }
  closeGarageModal();
  dom.notebookModal?.classList.add('hidden');

  driveState.active = true;
  driveState.cockpitView = !!startInCockpit;
  driveState.autoCruise = true;
  driveState.waypointIdx = 1;
  driveState.sessionLoot = 0;
  driveState.driveThruPauseTimer = 0;

  driveState.x = 24.5;
  driveState.y = 0.22;
  driveState.z = 7.0;
  driveState.heading = -Math.PI * 0.5;
  driveState.speed = 9.2;

  driveCamera.fov = driveState.cockpitView ? 68 : 58;
  driveCamera.updateProjectionMatrix();

  if (driveState.carRootGroup) {
    driveState.carRootGroup.position.set(driveState.x, driveState.y, driveState.z);
    driveState.carRootGroup.rotation.y = driveState.heading;
  }
  if (driveState.vehicleMesh?.userData?.driverRef) {
    driveState.vehicleMesh.userData.driverRef.visible = !driveState.cockpitView;
  }

  if (rentBubbles.length < 3) {
    spawnRentBubble('drive_welcome_1', 12.5, 1.25, 7.0, 28, '로스터스 앞');
    spawnRentBubble('drive_welcome_2', -2.5, 1.25, 7.0, 35, '분수광장 앞');
    spawnRentBubble('drive_welcome_3', -16.2, 1.25, 7.0, 32, '바게트하우스 앞');
  }

  const fwdX = Math.sin(driveState.heading);
  const fwdZ = Math.cos(driveState.heading);
  driveState.camCurrentPos.set(driveState.x - fwdX * 6.4, 2.55, driveState.z - fwdZ * 6.4);
  driveState.camCurrentLook.set(driveState.x + fwdX * 7.5, 1.55, driveState.z + fwdZ * 7.5);
  driveCamera.position.copy(driveState.camCurrentPos);
  driveCamera.lookAt(driveState.camCurrentLook);

  controls.enabled = false;
  syncTopBarsByMode();
  syncDriveTopBadges();
  updateDriveShopProximityUI();
  if (driveState.cockpitView) startOrUpdateCarRadioBGM();
  playSupercarHornSound(state.garage?.currentCar || 'car_scooter');
  showToast('드라이브 출발! 상단 [1인칭 운전석] 전환 및 상가 앞 [드라이브 스루]가 가능합니다!', 'coral');
}

function exitDriveMode() {
  if (!driveState.active) return;
  stopCarRadioBGM();
  driveState.active = false;
  driveState.cockpitView = false;
  driveState.keys.forward = false;
  driveState.keys.backward = false;
  driveState.keys.left = false;
  driveState.keys.right = false;
  driveState.speed = 0;

  for (const rn of driveState.driveThruRunners) {
    scene.remove(rn.mesh);
  }
  driveState.driveThruRunners.length = 0;

  if (driveState.vehicleMesh?.userData?.driverRef) {
    driveState.vehicleMesh.userData.driverRef.visible = true;
  }
  if (driveState.carRootGroup) {
    driveState.carRootGroup.position.set(VIP_PARKING_POS.x, VIP_PARKING_POS.y + 0.06, VIP_PARKING_POS.z);
    driveState.carRootGroup.rotation.y = Math.PI * 0.5;
  }

  controls.enabled = true;
  setOverviewCamera(true);
  showToast('VIP 전용 주차구역에 주차하고 타운 뷰로 복귀했습니다!', 'mint');
}

function triggerCarHorn() {
  const carId = state.garage?.currentCar || 'car_scooter';
  const carDef = getCarDef(carId);
  playSupercarHornSound(carId);

  if (!driveState.carRootGroup) return;
  const cx = driveState.carRootGroup.position.x;
  const cy = driveState.carRootGroup.position.y;
  const cz = driveState.carRootGroup.position.z;

  triggerSquashStretch(driveState.carRootGroup, 1.25);
  spawnShockwaveRing3D(cx, cy + 0.25, cz, 0xFFD93D, 6.4);
  spawnPoofParticles3D(cx, cy + 1.2, cz, 0xFF6B6B, 10);
  spawnJackpotText3D(cx, cy + 2.1, cz, '빵빵~!! 부아앙!!', 'horn_ico');

  let cheered = 0;
  for (const ac of streetOutingActors) {
    const d = Math.hypot(ac.mesh.position.x - cx, ac.mesh.position.z - cz);
    if (d < 28 || cheered < 2) {
      const quote = carDef.cheerQuotes[cheered % carDef.cheerQuotes.length];
      showSpeechBubble3D(
        ac.id,
        ac.mesh.position.x,
        ac.mesh.position.y + 2.0,
        ac.mesh.position.z,
        quote,
        3.6
      );
      triggerSquashStretch(ac.mesh, 1.2);
      spawnPoofParticles3D(ac.mesh.position.x, ac.mesh.position.y + 1.4, ac.mesh.position.z, 0xFF6B6B, 5);
      cheered += 1;
    }
  }
}

function tickDriveMode(dt, elapsed) {
  if (!driveState.active || !driveState.carRootGroup) return;

  // 드라이브 스루 쿨다운 및 달려 나온 직원 애니메이션 처리
  for (const k of Object.keys(driveState.driveThruCooldowns)) {
    driveState.driveThruCooldowns[k] = Math.max(0, driveState.driveThruCooldowns[k] - dt);
  }
  for (let i = driveState.driveThruRunners.length - 1; i >= 0; i--) {
    const rn = driveState.driveThruRunners[i];
    rn.life -= dt;
    if (rn.life <= 0) {
      scene.remove(rn.mesh);
      driveState.driveThruRunners.splice(i, 1);
      continue;
    }
    const dx = rn.tx - rn.mesh.position.x;
    const dz = rn.tz - rn.mesh.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.14) {
      rn.mesh.position.x += (dx / dist) * Math.min(dist, 5.5 * dt);
      rn.mesh.position.z += (dz / dist) * Math.min(dist, 5.5 * dt);
      rn.mesh.rotation.y = Math.atan2(dx, dz);
      const sw = Math.sin(elapsed * 16) * 0.6;
      rn.mesh.userData.legL.rotation.x = sw;
      rn.mesh.userData.legR.rotation.x = -sw;
    } else {
      rn.mesh.lookAt(driveState.x, rn.mesh.position.y, driveState.z);
      rn.mesh.userData.armL.rotation.z = 2.2 + Math.sin(elapsed * 14) * 0.35;
      rn.mesh.position.y = 0.24 + Math.abs(Math.sin(elapsed * 9)) * 0.12;
    }
  }

  const carDef = getCarDef(state.garage?.currentCar || 'car_scooter');
  const maxSpd = carDef.maxSpeed || 18.0;
  const manualInput = driveState.keys.forward || driveState.keys.backward || driveState.keys.left || driveState.keys.right;
  const prevHeading = driveState.heading;

  if (manualInput && driveState.autoCruise) {
    driveState.autoCruise = false;
    syncDriveTopBadges();
  }

  if (driveState.driveThruPauseTimer > 0) {
    driveState.driveThruPauseTimer -= dt;
    driveState.speed *= Math.pow(0.04, dt);
  } else if (driveState.autoCruise) {
    // 아스팔트 순환 도로 웨이포인트 자동 크루징 주행
    const wp = RING_ROAD_WAYPOINTS[driveState.waypointIdx % RING_ROAD_WAYPOINTS.length];
    const dx = wp.x - driveState.x;
    const dz = wp.z - driveState.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 3.2) {
      driveState.waypointIdx = (driveState.waypointIdx + 1) % RING_ROAD_WAYPOINTS.length;
    }

    const desiredHeading = Math.atan2(dx, dz);
    let diff = desiredHeading - driveState.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    driveState.heading += diff * Math.min(1, dt * 4.2);
    const cornerSlowdown = Math.abs(diff) > 0.35 ? 0.68 : 1.0;
    const targetCruiseSpeed = maxSpd * 0.62 * cornerSlowdown;
    driveState.speed = THREE.MathUtils.lerp(driveState.speed, targetCruiseSpeed, Math.min(1, dt * 4));
  } else {
    // 수동 WASD / 터치 패드 주행 물리
    if (driveState.keys.forward) {
      driveState.speed = Math.min(maxSpd, driveState.speed + 26 * dt);
    } else if (driveState.keys.backward) {
      driveState.speed = Math.max(-maxSpd * 0.48, driveState.speed - 24 * dt);
    } else {
      driveState.speed *= Math.pow(0.18, dt);
      if (Math.abs(driveState.speed) < 0.08) driveState.speed = 0;
    }

    const turnDir = (driveState.keys.left ? 1 : 0) - (driveState.keys.right ? 1 : 0);
    if (turnDir !== 0 && Math.abs(driveState.speed) > 0.25) {
      const revSign = driveState.speed >= 0 ? 1 : -1;
      driveState.heading += turnDir * revSign * 2.15 * dt;
    }

    // 상가 앞 도로에 수동 정차 시 자동 드라이브 스루 발동!
    if (Math.abs(driveState.speed) < 0.9 && !driveState.keys.forward && !driveState.keys.backward) {
      for (const dest of FP_SHOP_DESTINATIONS) {
        const distShop = Math.hypot(dest.roadX - driveState.x, dest.roadZ - driveState.z);
        if (distShop < 6.2 && !(driveState.driveThruCooldowns[dest.id] > 0)) {
          triggerDriveThruOrder(dest.id);
          break;
        }
      }
    }
  }

  // 스티어링 휠 실시간 조향 각도 계산 (좌회전 시 반시계 -deg, 우회전 시 시계 +deg)
  let deltaH = driveState.heading - prevHeading;
  while (deltaH > Math.PI) deltaH -= Math.PI * 2;
  while (deltaH < -Math.PI) deltaH += Math.PI * 2;
  const manualTurn = (driveState.keys.right ? 1 : 0) - (driveState.keys.left ? 1 : 0);
  const targetWheelDeg = manualTurn !== 0
    ? manualTurn * 40
    : THREE.MathUtils.clamp((-deltaH / Math.max(0.008, dt)) * 22, -42, 42);
  driveState.steerVisualDeg = THREE.MathUtils.lerp(driveState.steerVisualDeg, targetWheelDeg, Math.min(1, dt * 10));
  const wheelRotEl = document.getElementById('cockpit-wheel-rotator');
  if (wheelRotEl && driveState.cockpitView) {
    wheelRotEl.style.transform = `rotate(${driveState.steerVisualDeg.toFixed(1)}deg)`;
  }

  const fwdX = Math.sin(driveState.heading);
  const fwdZ = Math.cos(driveState.heading);
  let nx = driveState.x + fwdX * driveState.speed * dt;
  let nz = driveState.z + fwdZ * driveState.speed * dt;

  // 섬 외곽 추락 방지 안전 가드레일 반경 클램프
  const rFromCenter = Math.hypot(nx, nz - 8);
  if (rFromCenter > 47.5) {
    const scale = 47.5 / rFromCenter;
    nx *= scale;
    nz = 8 + (nz - 8) * scale;
    driveState.speed *= 0.6;
  }

  driveState.x = nx;
  driveState.z = nz;
  driveState.carRootGroup.position.set(driveState.x, 0.22 + Math.sin(elapsed * 22) * 0.015, driveState.z);
  driveState.carRootGroup.rotation.y = driveState.heading;

  for (const w of driveState.wheels) {
    w.rotation.x += driveState.speed * dt * 1.6;
  }

  driveState.exhaustTimer -= dt;
  if (Math.abs(driveState.speed) > 4.5 && driveState.exhaustTimer <= 0) {
    driveState.exhaustTimer = 0.16;
    const p = new THREE.Mesh(GEO.sphere, MAT.cloudWhite);
    p.scale.setScalar(0.18);
    p.position.set(driveState.x - fwdX * 2.1, 0.45, driveState.z - fwdZ * 2.1);
    scene.add(p);
    activeParticles.push({
      mesh: p,
      vx: -fwdX * 1.2 + (Math.random() - 0.5) * 0.6,
      vy: 0.9,
      vz: -fwdZ * 1.2 + (Math.random() - 0.5) * 0.6,
      life: 0.45,
      maxLife: 0.45
    });
  }

  // ==================== 1인칭 운전석(Cockpit) vs 3인칭 추격 카메라 분기 ====================
  if (driveState.cockpitView) {
    const hoodFwd = carDef.id === 'car_limo' ? 1.55 : carDef.id === 'car_scooter' ? 0.35 : 0.68;
    const eyeVib = Math.abs(driveState.speed) > 0.5 ? Math.sin(elapsed * 18) * 0.012 : 0;
    const eyePos = new THREE.Vector3(
      driveState.x + fwdX * hoodFwd,
      1.62 + eyeVib,
      driveState.z + fwdZ * hoodFwd
    );
    const lookTarget = new THREE.Vector3(
      driveState.x + fwdX * 18.0,
      1.48,
      driveState.z + fwdZ * 18.0
    );
    driveState.camCurrentPos.lerp(eyePos, Math.min(1, dt * 18));
    driveState.camCurrentLook.lerp(lookTarget, Math.min(1, dt * 18));
    driveCamera.position.copy(driveState.camCurrentPos);
    driveCamera.lookAt(driveState.camCurrentLook);
  } else {
    const chaseDist = carDef.id === 'car_limo' ? 7.6 : 5.9;
    const chaseHeight = 2.38;
    const desiredCamPos = new THREE.Vector3(
      driveState.x - fwdX * chaseDist,
      chaseHeight,
      driveState.z - fwdZ * chaseDist
    );
    const desiredLook = new THREE.Vector3(
      driveState.x + fwdX * 8.2,
      1.55,
      driveState.z + fwdZ * 8.2
    );
    driveState.camCurrentPos.lerp(desiredCamPos, Math.min(1, dt * 8.5));
    driveState.camCurrentLook.lerp(desiredLook, Math.min(1, dt * 10.5));
    driveCamera.position.copy(driveState.camCurrentPos);
    driveCamera.lookAt(driveState.camCurrentLook);
  }

  // 실시간 디지털 속도계 (상단 배지 & 1인칭 클러스터 동시 업데이트)
  const kmh = Math.round(Math.abs(driveState.speed) * 6.8);
  const speedEl = document.getElementById('drive-speed-badge');
  if (speedEl) speedEl.textContent = `${kmh} km/h`;
  const ckKmhEl = document.getElementById('cockpit-kmh-num');
  if (ckKmhEl) ckKmhEl.textContent = String(kmh);
  const ckGearEl = document.getElementById('cockpit-gear-tag');
  if (ckGearEl) {
    ckGearEl.textContent = Math.abs(driveState.speed) < 0.2 ? 'P' : driveState.speed < 0 ? 'R' : 'D';
  }

  updateDriveShopProximityUI();

  // ==================== 주변 건물·상가 코인 자석(Magnetic Vacuum) 자동 수금 ====================
  const bonusPct = carDef.driveTipPct || 20;
  for (let i = rentBubbles.length - 1; i >= 0; i--) {
    const b = rentBubbles[i];
    const distXZ = Math.hypot(b.wx - driveState.x, b.wz - driveState.z);
    if (distXZ < 22.0) {
      b.magnetized = true;
    }
    if (b.magnetized) {
      const pull = Math.min(1, dt * 9.5);
      b.wx = THREE.MathUtils.lerp(b.wx, driveState.x, pull);
      b.wy = THREE.MathUtils.lerp(b.wy, 1.05, pull);
      b.wz = THREE.MathUtils.lerp(b.wz, driveState.z, pull);
      if (b.coin3D) {
        b.coin3D.position.set(b.wx, b.wy, b.wz);
        b.coin3D.rotation.y += dt * 12;
      }
      if (Math.hypot(b.wx - driveState.x, b.wz - driveState.z) < 2.2) {
        const gained = Math.round(b.amount * (1 + bonusPct / 100));
        driveState.sessionLoot += gained;
        collectRentBubble(b, bonusPct);
        syncDriveTopBadges();
      }
    }
  }
}

// =========================================================
// 13B. 1인칭 갓물주 상점 입장 · 3D 진열대 쇼핑 · 골든벨 피버 · 세입자 집들이 엔진
// =========================================================
function initFirstPersonHands3D() {
  if (!fpCamera) return;
  const handsGrp = new THREE.Group();
  fpCamera.add(handsGrp);

  const skinMat = makeClayMat(0xFFE2D1, { roughness: 0.45 });
  const cuffMat = makeClayMat(0xE11D48, { roughness: 0.42 });
  const goldTrim = makeClayMat(0xFFD93D, { roughness: 0.3, metalness: 0.2 });

  const makeArmHand = (sideSign) => {
    const h = new THREE.Group();
    const sleeve = createRoundedToyMesh(0.14, 0.24, 0.14, cuffMat, 0, -0.14, 0.12, 0.04);
    sleeve.rotation.x = 0.72;
    const cuff = createRoundedToyMesh(0.155, 0.045, 0.155, goldTrim, 0, -0.04, 0.03, 0.02);
    cuff.rotation.x = 0.72;
    const palm = new THREE.Mesh(GEO.sphere, skinMat);
    palm.scale.set(0.12, 0.11, 0.13);
    h.add(sleeve, cuff, palm);
    // 시야 중앙을 가리지 않고 화면 좌·우 하단 모서리에 귀엽게 파지되도록 배치
    h.position.set(sideSign * 0.52, -0.44, -0.94);
    return h;
  };

  const leftHand = makeArmHand(-1);
  const rightHand = makeArmHand(1);
  const leftSlot = new THREE.Group();
  leftSlot.position.set(0.02, 0.03, -0.03);
  leftHand.add(leftSlot);

  const rightSlot = new THREE.Group();
  rightSlot.position.set(-0.02, 0.03, -0.03);
  rightHand.add(rightSlot);

  handsGrp.add(leftHand, rightHand);
  handsGrp.visible = false;

  fpState.handsGroup = handsGrp;
  fpState.leftHandSlot = leftSlot;
  fpState.rightHandSlot = rightSlot;
  syncHeldHands3DAndChips();
}

function clearGroupChildren(grp) {
  if (!grp) return;
  while (grp.children.length > 0) {
    grp.remove(grp.children[0]);
  }
}

function syncHeldHands3DAndChips() {
  if (!state.heldGifts) state.heldGifts = { left: null, right: null };
  clearGroupChildren(fpState.leftHandSlot);
  clearGroupChildren(fpState.rightHandSlot);

  if (fpState.leftHandSlot && state.heldGifts.left) {
    const m = create3DGiftPropMesh(state.heldGifts.left, true);
    m.scale.setScalar(0.41);
    m.rotation.y = 0.25;
    fpState.leftHandSlot.add(m);
  }
  if (fpState.rightHandSlot && state.heldGifts.right) {
    const m = create3DGiftPropMesh(state.heldGifts.right, true);
    m.scale.setScalar(0.41);
    m.rotation.y = -0.25;
    fpState.rightHandSlot.add(m);
  }

  const row = document.getElementById('fp-held-chips-row');
  if (row) {
    const chips = [];
    for (const side of ['left', 'right']) {
      const gid = state.heldGifts[side];
      if (!gid) continue;
      const def = FP_GIFT_ITEMS.find((x) => x.id === gid);
      if (def) {
        chips.push(`
          <span class="kw-chip tone-${def.tone} !py-0.5 !px-2.5">
            ${createCustomSVGIcon(def.icon, 15)}
            <span>${side === 'left' ? '왼손' : '오른손'}: ${def.shortName}</span>
          </span>
        `);
      }
    }
    if ((state.goldenKeys || 0) > 0) {
      chips.push(`
        <span class="kw-chip tone-gold !py-0.5 !px-2.5">
          ${createCustomSVGIcon('garage_key', 14)}
          <span>황금열쇠 ${state.goldenKeys}개</span>
        </span>
      `);
    }
    row.innerHTML = chips.length > 0
      ? chips.join('')
      : `<span class="kw-chip tone-cream !py-0.5 !px-2.5">${createCustomSVGIcon('gift_ribbon_box', 14)}<span>양손 비어 있음 · 진열대 3D 상품을 클릭해 담아보세요!</span></span>`;
  }

  const giveBtnLbl = document.getElementById('label-fp-give-gift');
  if (giveBtnLbl) {
    const hasGift = !!(state.heldGifts.left || state.heldGifts.right);
    giveBtnLbl.textContent = hasGift
      ? '사 온 선물 건네주기 (월세 영구 +20%!)'
      : '상점 가서 집들이 선물 사 오기';
  }
}

function clearFpStageAndTempProps() {
  for (const el of fpState.labelPins) {
    el.el.remove();
  }
  fpState.labelPins.length = 0;
  fpState.pickables.length = 0;
  fpState.npcActors.length = 0;
  fpState.bellPivot = null;
  fpState.doorHinge = null;

  if (fpState.stageGroup) {
    scene.remove(fpState.stageGroup);
    fpState.stageGroup = null;
  }
  if (fpState.roomTempGroup && fpState.roomTempGroup.parent) {
    fpState.roomTempGroup.parent.remove(fpState.roomTempGroup);
    fpState.roomTempGroup = null;
  }
  if (fpState.hostResidentMesh && fpState.hostOrigPos) {
    fpState.hostResidentMesh.position.copy(fpState.hostOrigPos);
  }
  fpState.hostResidentMesh = null;
  fpState.hostOrigPos = null;
}

function createFpPinBadge(wx, wy, wz, htmlContent, onClickFn) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'shop-float-badge pointer-events-auto !text-[11px] !py-1 !px-2.5';
  btn.innerHTML = htmlContent;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    onClickFn();
  });
  dom.shopsLayer?.appendChild(btn);
  fpState.labelPins.push({ el: btn, wx, wy, wz });
}

function enterFirstPersonShop(shopId = 'shop_bakery', rememberDrive = null) {
  const dest = FP_SHOP_DESTINATIONS.find((s) => s.id === shopId) || FP_SHOP_DESTINATIONS[0];
  const wasInDrive = rememberDrive !== null ? rememberDrive : driveState.active;

  if (driveState.active) {
    stopCarRadioBGM();
    driveState.active = false;
    driveState.speed = 0;
  }
  if (focusedRoomId) focusedRoomId = null;
  if (focusedShopId) {
    const prevS = focusedShopId;
    focusedShopId = null;
    rebuildStandaloneShop3D(prevS);
  }
  dom.fpVisitModal?.classList.add('hidden');
  clearFpStageAndTempProps();

  fpState.active = true;
  fpState.mode = 'shop';
  fpState.returnToDrive = !!wasInDrive;
  fpState.shopId = dest.id;
  fpState.roomId = null;
  fpState.yaw = 0;
  fpState.pitch = -0.05;
  fpState.entryWalkTimer = 0.95;
  fpState.doorAngle = 0.1;
  fpState.cheerTimer = 0;

  // ==================== 1인칭 전용 풀스케일 부티크 상점 인테리어 스테이지 구축 ====================
  const stg = new THREE.Group();
  stg.position.copy(FP_STAGE_ORIGIN);
  scene.add(stg);
  fpState.stageGroup = stg;

  const W = 12.8;
  const D = 10.2;
  const H = 4.8;
  const wallMat = makeClayMat(dest.wallColor || 0xFFF5EB, { map: TEX.wallPeach, roughness: 0.62 });
  const trimMat = makeClayMat(dest.accentColor || 0xFF6B6B, { roughness: 0.48 });
  const floorMat = makeClayMat(0xFFFFFF, { map: TEX.floor2, roughness: 0.52 });

  // 마루 바닥, 천장, 서까래 원목 빔, 좌우/후면 벽체
  stg.add(createRoundedToyMesh(W, 0.2, D, floorMat, 0, -0.1, 0, 0.06));
  stg.add(createRoundedToyMesh(W, 0.22, D, MAT.cream, 0, H + 0.1, 0, 0.06));
  for (let bz = -3.6; bz <= 3.6; bz += 2.4) {
    stg.add(createRoundedToyMesh(W - 0.3, 0.22, 0.28, MAT.woodWarm, 0, H - 0.12, bz, 0.04));
    const lamp = new THREE.Mesh(GEO.sphere, MAT.neonYellow);
    lamp.scale.setScalar(0.28);
    lamp.position.set(0, H - 0.42, bz);
    stg.add(lamp);
  }
  stg.add(createRoundedToyMesh(W, H, 0.26, wallMat, 0, H * 0.5, -D * 0.5, 0.06));
  stg.add(createRoundedToyMesh(0.26, H, D, wallMat, -W * 0.5, H * 0.5, 0, 0.06));
  stg.add(createRoundedToyMesh(0.26, H, D, wallMat, W * 0.5, H * 0.5, 0, 0.06));
  // 전면 통유리 프레임 & 열리는 출입문 힌지 연출
  stg.add(createRoundedToyMesh(4.2, H, 0.24, wallMat, -4.1, H * 0.5, D * 0.5, 0.05));
  stg.add(createRoundedToyMesh(4.2, H, 0.24, wallMat, 4.1, H * 0.5, D * 0.5, 0.05));

  const doorHinge = new THREE.Group();
  doorHinge.position.set(-1.1, 0, D * 0.5 - 0.1);
  doorHinge.add(createRoundedToyMesh(1.95, 3.2, 0.12, trimMat, 0.98, 1.6, 0, 0.05));
  doorHinge.add(createRoundedToyMesh(1.55, 2.35, 0.14, MAT.partitionGlass, 0.98, 1.75, 0, 0.04, false, false, false));
  stg.add(doorHinge);
  fpState.doorHinge = doorHinge;

  // 뒷벽 업종별 시그니처 설비 & 간판 보드
  const signKind = dest.id === 'shop_roastery' ? 'roastery' : dest.id === 'shop_flower' ? 'flores' : dest.id === 'shop_mart1f' ? 'mart' : dest.id === 'shop_wash1f' ? 'wash' : 'patisserie';
  const backSign = createFramedSignboard3D(5.8, 1.05, signKind);
  backSign.position.set(0, 3.55, -D * 0.5 + 0.24);
  stg.add(backSign);

  if (dest.id === 'shop_bakery') {
    stg.add(createRoundedToyMesh(2.6, 2.3, 0.95, MAT.gold, -3.4, 1.2, -D * 0.5 + 0.75, 0.1));
    stg.add(createRoundedToyMesh(1.4, 0.5, 0.14, MAT.ovenFire, -3.4, 1.25, -D * 0.5 + 1.25, 0.04));
  } else if (dest.id === 'shop_roastery') {
    stg.add(createRoundedToyMesh(2.2, 2.2, 0.9, MAT.walnutTrim, -3.4, 1.15, -D * 0.5 + 0.75, 0.1));
    const cr = createFruitWoodenCrate3D('mix');
    cr.position.set(-3.8, 0.02, -1.2);
    stg.add(cr);
  } else if (dest.id === 'shop_mart1f') {
    for (let rx = -4.2; rx <= -2.4; rx += 1.8) {
      stg.add(createRoundedToyMesh(1.55, 2.5, 0.75, MAT.sky, rx, 1.28, -D * 0.5 + 0.65, 0.08));
      stg.add(createRoundedToyMesh(1.32, 1.9, 0.8, MAT.white, rx, 1.32, -D * 0.5 + 0.68, 0.05));
    }
  } else if (dest.id === 'shop_wash1f') {
    for (let wx = -4.4; wx <= -2.2; wx += 1.1) {
      stg.add(createRoundedToyMesh(0.98, 1.45, 0.75, MAT.white, wx, 0.75, -D * 0.5 + 0.65, 0.08));
      const dr = new THREE.Mesh(GEO.torus, MAT.sky);
      dr.scale.setScalar(0.58);
      dr.position.set(wx, 0.82, -D * 0.5 + 1.05);
      stg.add(dr);
    }
  } else {
    for (let fx = -4.2; fx <= -2.4; fx += 0.9) {
      const pot = new THREE.Mesh(GEO.cyl, MAT.terracottaCoral);
      pot.scale.set(0.42, 0.48, 0.42);
      pot.position.set(fx, 0.25, -D * 0.5 + 0.9);
      const bl = new THREE.Mesh(getPuffyDomeGeo(0.35, 0.42), MAT.pinkSoft);
      bl.position.set(fx, 0.68, -D * 0.5 + 0.9);
      stg.add(pot, bl);
    }
  }

  // ==================== 메인 쇼케이스 카운터 & 5종 3D 클릭형 진열 상품 ====================
  stg.add(createRoundedToyMesh(5.6, 0.96, 1.12, MAT.woodWarm, -0.65, 0.48, -0.85, 0.08));
  stg.add(createRoundedToyMesh(5.76, 0.1, 1.24, MAT.white, -0.65, 1.01, -0.85, 0.04));

  FP_GIFT_ITEMS.forEach((item, idx) => {
    const ix = -2.65 + idx * 1.02;
    const iy = 1.06;
    const iz = -0.78;

    const prop = create3DGiftPropMesh(item.id, false);
    prop.position.set(ix, iy, iz);
    prop.scale.setScalar(1.06);
    stg.add(prop);

    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(0.96, 0.95, 1.0),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.position.set(ix, iy + 0.32, iz);
    hit.userData = { kind: 'fpShopItem', itemId: item.id, visualMesh: prop };
    stg.add(hit);
    fpState.pickables.push(hit);

    createFpPinBadge(
      FP_STAGE_ORIGIN.x + ix,
      FP_STAGE_ORIGIN.y + iy + 0.62,
      FP_STAGE_ORIGIN.z + iz,
      `${createCustomSVGIcon(item.icon, 13)}<span>${item.shortName}</span><span class="text-[#B45309]">${item.cost}만</span>`,
      () => buyFpShowcaseItem(item.id, prop)
    );
  });

  // ==================== 우측 로얄 스탠드 & 반짝이는 3D 황금 종 (기본 시야 내 선명 노출!) ====================
  const bellStand = new THREE.Group();
  bellStand.position.set(2.48, 0, -0.62);
  bellStand.add(createRoundedToyMesh(0.98, 1.12, 0.98, MAT.walnutTrim, 0, 0.56, 0, 0.08));
  bellStand.add(createRoundedToyMesh(1.08, 0.14, 1.08, MAT.supercarRed, 0, 1.16, 0, 0.05));
  bellStand.add(createRoundedToyMesh(0.12, 0.92, 0.12, MAT.gold, -0.34, 1.65, 0, 0.03));
  bellStand.add(createRoundedToyMesh(0.12, 0.92, 0.12, MAT.gold, 0.34, 1.65, 0, 0.03));
  bellStand.add(createRoundedToyMesh(0.88, 0.14, 0.16, MAT.gold, 0, 2.1, 0, 0.04));

  const bellPivot = new THREE.Group();
  bellPivot.position.set(0, 2.04, 0);
  const bellCone = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.52, 20), MAT.gold);
  bellCone.position.y = -0.28;
  addToonHullOutline(bellCone, 1.07);
  const bellRim = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.055, 10, 24), MAT.gold);
  bellRim.rotation.x = Math.PI / 2;
  bellRim.position.y = -0.52;
  const clapper = new THREE.Mesh(GEO.sphere, MAT.coral);
  clapper.scale.setScalar(0.16);
  clapper.position.y = -0.58;
  bellPivot.add(bellCone, bellRim, clapper);
  bellStand.add(bellPivot);
  stg.add(bellStand);
  fpState.bellPivot = bellPivot;

  const bellHit = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 1.6, 1.35),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  bellHit.position.set(2.48, 1.62, -0.62);
  bellHit.userData = { kind: 'fpGoldenBell' };
  stg.add(bellHit);
  fpState.pickables.push(bellHit);

  createFpPinBadge(
    FP_STAGE_ORIGIN.x + 2.48,
    FP_STAGE_ORIGIN.y + 2.42,
    FP_STAGE_ORIGIN.z - 0.62,
    `${createCustomSVGIcon('golden_bell', 15)}<span class="text-[#B45309]">골든벨 (150만)</span>`,
    () => ringShopGoldenBell()
  );

  // ==================== 카운터 직원 단상(상반신·얼굴 100% 노출) & 손님 영접 리액션 ====================
  stg.add(createRoundedToyMesh(1.8, 0.44, 1.1, MAT.woodDark, -0.45, 0.22, -2.05, 0.05));
  const clerkMesh = createChibiPerson3D(dest.staffRole);
  clerkMesh.position.set(-0.45, 0.44, -2.05);
  stg.add(clerkMesh);
  fpState.npcActors.push({ mesh: clerkMesh, isClerk: true, baseY: 0.44, phase: 0 });

  const custConfigs = [
    { role: 'newlywed', x: -3.65, z: 0.25, quote: dest.customerQuotes[0] },
    { role: 'streamer', x: 3.65, z: 0.45, quote: dest.customerQuotes[1] }
  ];
  stg.add(createRoundedToyMesh(1.05, 0.78, 1.05, MAT.white, -3.65, 0.4, 1.25, 0.08));
  stg.add(createRoundedToyMesh(1.05, 0.78, 1.05, MAT.white, 3.65, 0.4, 1.45, 0.08));

  custConfigs.forEach((cfg, idx) => {
    const cm = createChibiPerson3D(cfg.role);
    cm.position.set(cfg.x, 0.04, cfg.z);
    stg.add(cm);
    fpState.npcActors.push({ mesh: cm, isClerk: false, baseY: 0.04, phase: idx * 1.5 + 0.8 });
    showSpeechBubble3D(`fp_cust_${idx}`, FP_STAGE_ORIGIN.x + cfg.x, FP_STAGE_ORIGIN.y + 2.15, FP_STAGE_ORIGIN.z + cfg.z, cfg.quote, 5.2);
  });

  showSpeechBubble3D('fp_clerk_welcome', FP_STAGE_ORIGIN.x - 0.45, FP_STAGE_ORIGIN.y + 2.75, FP_STAGE_ORIGIN.z - 2.05, dest.welcomeQuote, 5.8);

  // 1.62m 사람 눈높이 진입 시작점 (진열대 5종 + 황금 종 + 직원 + 손님이 한 화면에 모두 들어오는 최적 거리)
  fpState.entryWalkTimer = 0.55;
  fpState.bounds = {
    minX: FP_STAGE_ORIGIN.x - 4.2,
    maxX: FP_STAGE_ORIGIN.x + 4.2,
    minZ: FP_STAGE_ORIGIN.z + 1.45,
    maxZ: FP_STAGE_ORIGIN.z + 4.35,
    eyeY: FP_STAGE_ORIGIN.y + 1.62
  };
  fpState.pos.set(FP_STAGE_ORIGIN.x + 0.0, fpState.bounds.eyeY, FP_STAGE_ORIGIN.z + 4.2);
  fpCamera.position.copy(fpState.pos);
  if (fpState.handsGroup) fpState.handsGroup.visible = true;

  controls.enabled = false;
  playShopDoorChimeSound();
  syncFpModeHUD();
  syncTopBarsByMode();
  showToast(`[${dest.name}] 1인칭 입장! 진열대 3D 상품을 터치하거나 골든벨을 울려보세요!`, 'gold');
}

function buyFpShowcaseItem(itemId, visualMesh = null) {
  const item = FP_GIFT_ITEMS.find((x) => x.id === itemId);
  if (!item) return;
  if (!spendGold(item.cost)) return;

  if (!state.heldGifts) state.heldGifts = { left: null, right: null };
  if (item.slot === 'left') {
    state.heldGifts.left = item.id;
  } else {
    state.heldGifts.right = item.id;
  }
  syncHeldHands3DAndChips();

  if (visualMesh) {
    triggerSquashStretch(visualMesh, 1.35);
    const wp = new THREE.Vector3();
    visualMesh.getWorldPosition(wp);
    spawnPoofParticles3D(wp.x, wp.y + 0.35, wp.z, 0xFFD93D, 10);
  }
  if (fpState.handsGroup) {
    triggerSquashStretch(fpState.handsGroup, 1.15);
  }
  playShopDoorChimeSound();
  showSpeechBubble3D(
    'fp_clerk_welcome',
    FP_STAGE_ORIGIN.x - 0.45,
    FP_STAGE_ORIGIN.y + 2.75,
    FP_STAGE_ORIGIN.z - 2.05,
    `갓물주님! [${item.name}] 정성껏 포장해 손에 들려드렸습니다!!`,
    3.6
  );
  showToast(item.buyMsg, 'mint');
  saveGameState();
}

let goldenBellBannerTimeout = null;
function ringShopGoldenBell() {
  if (!fpState.active || fpState.mode !== 'shop') return;
  if (!spendGold(150)) return;

  playGoldenBellSound();
  fpState.bellSwingTimer = 3.6;
  fpState.cheerTimer = 5.5;

  // 매장 내부 화려한 폭죽 파티클 폭발!
  const fireworkCols = [0xFFD93D, 0xFF6B6B, 0x38E54D, 0x4CC2FF, 0xF472B6];
  for (let b = 0; b < 5; b++) {
    const bx = FP_STAGE_ORIGIN.x - 3.2 + b * 1.65;
    const by = FP_STAGE_ORIGIN.y + 2.9 + (b % 2) * 0.45;
    const bz = FP_STAGE_ORIGIN.z - 1.2;
    spawnPoofParticles3D(bx, by, bz, fireworkCols[b % fireworkCols.length], 12);
  }

  // 전 세대 행복도 즉시 100% MAX + 60초간 월세/상가 수익 2.5배 피버 타임 발동!
  for (const b of Object.values(state.buildings)) {
    for (const rm of b.rooms) {
      if (rm.household) rm.household.happiness = 100;
    }
  }
  state.feverTimer = 60.0;

  // 양손이 비어 있다면 골든벨 서비스 선물 세트 자동 증정!
  if (!state.heldGifts.left) state.heldGifts.left = 'item_coffee';
  if (!state.heldGifts.right) state.heldGifts.right = 'item_cake';
  syncHeldHands3DAndChips();
  updateTopHUDTargets();

  showSpeechBubble3D(
    'fp_clerk_welcome',
    FP_STAGE_ORIGIN.x - 0.45,
    FP_STAGE_ORIGIN.y + 2.75,
    FP_STAGE_ORIGIN.z - 2.05,
    '땡땡땡!! 갓물주님이 전 메뉴 골든벨을 울리셨습니다!! 만세~!!',
    4.8
  );
  fpState.npcActors.forEach((ac, idx) => {
    if (!ac.isClerk) {
      const wp = new THREE.Vector3();
      ac.mesh.getWorldPosition(wp);
      showSpeechBubble3D(`fp_cheer_${idx}`, wp.x, wp.y + 2.1, wp.z, '와아아!! 우리 건물주님 클라스 미쳤다!! 평생 살게요!!', 4.8);
    }
  });

  const banner = document.getElementById('golden-bell-banner');
  if (banner) {
    banner.classList.remove('hidden');
    if (goldenBellBannerTimeout) clearTimeout(goldenBellBannerTimeout);
    goldenBellBannerTimeout = setTimeout(() => banner.classList.add('hidden'), 4300);
  }
  showToast('골든벨 발동! 행복도 MAX + 60초간 모든 월세·상가 수익 2.5배 폭증!', 'gold');
  saveGameState();
}

function enterFirstPersonRoom(roomId) {
  const rm = findRoomById(roomId);
  if (!rm) return;
  const lot = state.lots.find((l) => l.lotId === rm.lotId);
  if (!lot) return;

  // 미개방이거나 공실인 방도 바로 집들이 체험이 가능하도록 자동 안내/보정 지원
  if (!rm.unlocked) {
    showToast(`${rm.name}호는 아직 미개방 호실입니다! 먼저 호실을 개방해 주세요.`, 'coral');
    return;
  }

  const wasInDrive = fpState.active ? fpState.returnToDrive : driveState.active;
  if (driveState.active) {
    stopCarRadioBGM();
    driveState.active = false;
  }
  focusedRoomId = null;
  if (focusedShopId) {
    const prevS = focusedShopId;
    focusedShopId = null;
    rebuildStandaloneShop3D(prevS);
  }
  dom.fpVisitModal?.classList.add('hidden');
  clearFpStageAndTempProps();

  fpState.active = true;
  fpState.mode = 'room';
  fpState.returnToDrive = !!wasInDrive;
  fpState.roomId = rm.id;
  fpState.entryWalkTimer = 0.28;
  fpState.pitch = -0.07;

  const rWorldX = lot.x + rm.lx;
  const rWorldY = rm.ly;
  const rWorldZ = lot.z + rm.lz;

  // 평형별 가구(빔프로젝터·캐노피 침대·복층 계단) + 티테이블 + 세입자가 한눈에 들어오는 황금 구도
  let spawnOffsetX = 0;
  let initialYaw = 0;
  const tableLocalX = rm.layoutType === 'tworoom' ? -1.15 : rm.layoutType === 'loft' ? 1.55 : 0.15;
  const tableLocalZ = -0.22;
  const greetLocalX = tableLocalX + (rm.layoutType === 'tworoom' ? -0.15 : -0.25);
  const greetLocalZ = -1.18;

  if (rm.layoutType === 'tworoom') {
    spawnOffsetX = -1.65;
    initialYaw = -0.34;
  } else if (rm.layoutType === 'loft') {
    spawnOffsetX = 2.45;
    initialYaw = 0.38;
  } else if (rm.layoutType === 'studio') {
    spawnOffsetX = 0.65;
    initialYaw = 0.16;
  }
  fpState.yaw = initialYaw;

  fpState.bounds = {
    minX: rWorldX - rm.rw * 0.36,
    maxX: rWorldX + rm.rw * 0.36,
    minZ: rWorldZ + 0.55,
    maxZ: rWorldZ + rm.rd * 0.42,
    eyeY: rWorldY + 1.62
  };
  fpState.pos.set(rWorldX + spawnOffsetX, fpState.bounds.eyeY, rWorldZ + rm.rd * 0.42);
  fpCamera.position.copy(fpState.pos);
  if (fpState.handsGroup) fpState.handsGroup.visible = true;

  // 360도 회전 시 뒷면 허공이 보이지 않도록 실내 현관문 마감벽 + 천장 조명 + 선물 티테이블 배치
  const rGrp = lot3D[rm.lotId]?.roomsMap?.[rm.id];
  if (rGrp) {
    const tempGrp = new THREE.Group();
    const decorDef = getFurnitureItemDef('decor', rm.equippedFurniture.decor);
    const wallTex = TEX[decorDef?.wallKey || 'wallPeach'] || TEX.wallPeach;
    const fWallMat = makeClayMat(0xFFFFFF, { map: wallTex, roughness: 0.62 });

    // 전면 실내 벽체 & 아늑한 원목 현관문 (180도 뒤돌아볼 때 실제 현관 연출)
    const frontZ = rm.rd * 0.5 - 0.08;
    tempGrp.add(createRoundedToyMesh(rm.rw - 0.24, rm.rh - 0.22, 0.14, fWallMat, 0, rm.rh * 0.5, frontZ, 0.05));
    tempGrp.add(createRoundedToyMesh(1.45, 2.55, 0.2, MAT.walnutTrim, spawnOffsetX, 1.35, frontZ - 0.05, 0.06));
    const knob = new THREE.Mesh(GEO.sphere, MAT.gold);
    knob.scale.setScalar(0.12);
    knob.position.set(spawnOffsetX + 0.48, 1.25, frontZ - 0.16);
    tempGrp.add(knob);

    const ceilLamp = new THREE.Mesh(GEO.sphere, MAT.neonYellow);
    ceilLamp.scale.setScalar(0.32);
    ceilLamp.position.set(0, rm.rh - 0.32, 0.2);
    tempGrp.add(ceilLamp);

    if (!rm.giftedItems || rm.giftedItems.length === 0) {
      tempGrp.add(createRoundedToyMesh(1.45, 0.09, 0.92, MAT.white, tableLocalX, 0.76, tableLocalZ, 0.04));
      tempGrp.add(createRoundedToyMesh(0.14, 0.6, 0.14, MAT.gold, tableLocalX - 0.48, 0.45, tableLocalZ, 0.03));
      tempGrp.add(createRoundedToyMesh(0.14, 0.6, 0.14, MAT.gold, tableLocalX + 0.48, 0.45, tableLocalZ, 0.03));
    }
    rGrp.add(tempGrp);
    fpState.roomTempGroup = tempGrp;
  }

  // 세입자가 티테이블 너머 적당한 거리(약 3.8m)에서 전신과 말풍선이 100% 보이도록 마중 인사!
  const actors = residentActors[rm.id];
  if (actors && actors.length > 0) {
    const host = actors[0].mesh;
    fpState.hostResidentMesh = host;
    fpState.hostOrigPos = host.position.clone();
    host.position.set(greetLocalX, 0.16, greetLocalZ);
    actors[0].waitTimer = 999;

    showSpeechBubble3D(
      `fp_room_host_${rm.id}`,
      rWorldX + greetLocalX,
      rWorldY + 1.98,
      rWorldZ + greetLocalZ,
      `띵동~ 어머! 건물주님이 직접 저희 ${rm.name}호에 놀러 오셨네요!! 어서 오세요!`,
      5.5
    );
  }

  controls.enabled = false;
  playDoorbellChimeSound();
  syncFpModeHUD();
  syncTopBarsByMode();
  showToast(`띵동~ [${rm.name}호] 1인칭 집들이 입장! 좌우 드래그로 내가 꾸민 방을 구경하고 선물을 건네보세요!`, 'mint');
}

function giveHousewarmingGiftAction() {
  if (!fpState.active || fpState.mode !== 'room') return;
  const rm = findRoomById(fpState.roomId);
  if (!rm) return;

  const hasGift = !!(state.heldGifts?.left || state.heldGifts?.right);
  if (!hasGift) {
    openFpVisitModal('shops');
    showToast('양손에 들고 있는 선물이 없습니다! 먼저 상점에 들러 케이크나 꽃다발을 골라보세요!', 'gold');
    return;
  }

  if (!rm.household) {
    showToast('현재 공실입니다! 세입자가 입주한 호실에 선물을 전달해 보세요!', 'coral');
    return;
  }

  const lot = state.lots.find((l) => l.lotId === rm.lotId);
  const deliveredNames = [];
  if (!Array.isArray(rm.giftedItems)) rm.giftedItems = [];

  for (const side of ['right', 'left']) {
    const gid = state.heldGifts[side];
    if (gid) {
      rm.giftedItems.push(gid);
      const def = FP_GIFT_ITEMS.find((x) => x.id === gid);
      if (def) deliveredNames.push(def.shortName);
      state.heldGifts[side] = null;
    }
  }

  // 영구 임대료 +20% 보너스 & 행복도 100% & 감사의 황금 열쇠 + 히든 팁 코인 다발 증정!
  const firstTimeBonus = (rm.giftBonusPct || 0) < 20;
  rm.giftBonusPct = Math.max(20, (rm.giftBonusPct || 0) + (firstTimeBonus ? 20 : 5));
  rm.household.happiness = 100;
  state.goldenKeys = (state.goldenKeys || 0) + 1;
  const tipCoins = 180;
  addGold(tipCoins);

  // 방 3D 테이블에 방금 건넨 케이크·꽃다발·커피 즉시 진열 + 실내 현관 벽체 유지!
  rebuildRoom3D(rm.lotId, rm);
  syncBuildingResidents3D(rm.lotId);

  const rGrpAfter = lot3D[rm.lotId]?.roomsMap?.[rm.id];
  if (rGrpAfter) {
    const tempGrp = new THREE.Group();
    const decorDef = getFurnitureItemDef('decor', rm.equippedFurniture.decor);
    const wallTex = TEX[decorDef?.wallKey || 'wallPeach'] || TEX.wallPeach;
    const fWallMat = makeClayMat(0xFFFFFF, { map: wallTex, roughness: 0.62 });
    const frontZ = rm.rd * 0.5 - 0.08;
    const doorX = rm.layoutType === 'tworoom' ? -1.65 : rm.layoutType === 'loft' ? 2.45 : 0.65;
    tempGrp.add(createRoundedToyMesh(rm.rw - 0.24, rm.rh - 0.22, 0.14, fWallMat, 0, rm.rh * 0.5, frontZ, 0.05));
    tempGrp.add(createRoundedToyMesh(1.45, 2.55, 0.2, MAT.walnutTrim, doorX, 1.35, frontZ - 0.05, 0.06));
    rGrpAfter.add(tempGrp);
    fpState.roomTempGroup = tempGrp;
  }

  const tableLocalX = rm.layoutType === 'tworoom' ? -1.15 : rm.layoutType === 'loft' ? 1.55 : 0.15;
  const greetLocalX = tableLocalX + 0.55;
  const greetLocalZ = -1.12;

  const actors = residentActors[rm.id];
  if (actors && actors.length > 0) {
    const host = actors[0].mesh;
    fpState.hostResidentMesh = host;
    fpState.hostOrigPos = host.position.clone();
    host.position.set(greetLocalX, 0.16, greetLocalZ);
    actors[0].waitTimer = 999;
    triggerSquashStretch(host, 1.4);

    const wx = (lot?.x || 0) + rm.lx + greetLocalX;
    const wy = rm.ly + 1.98;
    const wz = (lot?.z || 0) + rm.lz + greetLocalZ;
    spawnPoofParticles3D((lot?.x || 0) + rm.lx + tableLocalX, rm.ly + 1.15, (lot?.z || 0) + rm.lz - 0.22, 0xFF6B6B, 16);
    spawnShockwaveRing3D((lot?.x || 0) + rm.lx + tableLocalX, rm.ly + 0.22, (lot?.z || 0) + rm.lz - 0.22, 0xFFD93D, 4.2);
    showSpeechBubble3D(
      `fp_room_host_${rm.id}`,
      wx,
      wy,
      wz,
      `세상에! 건물주님이 직접 [${deliveredNames.join(' & ')}] 선물을 사 들고 오시다니 평생 여기서 살게요!!`,
      6.0
    );
  }

  playGoldenBellSound();
  syncHeldHands3DAndChips();
  syncFpModeHUD();
  updateTopHUDTargets();
  showToast(
    `[${rm.name}호 재계약 확정!] 임대료 영구 +${rm.giftBonusPct}% 상승 & 감사의 황금 열쇠 + 보너스 ${tipCoins}만 획득!`,
    'gold'
  );
  saveGameState();
}

function syncFpModeHUD() {
  const isShop = fpState.mode === 'shop';
  document.getElementById('fp-shop-shelf-strip')?.classList.toggle('hidden', !isShop);
  document.getElementById('fp-shop-actions')?.classList.toggle('hidden', !isShop);
  document.getElementById('fp-room-actions')?.classList.toggle('hidden', isShop);

  const exitLbl = document.getElementById('label-exit-fp');
  if (exitLbl) {
    exitLbl.textContent = fpState.returnToDrive ? '차량 운전석 복귀' : '타운 거리로 나가기';
  }

  const placeBadge = document.getElementById('fp-place-badge');
  if (placeBadge) {
    if (isShop) {
      const dest = FP_SHOP_DESTINATIONS.find((s) => s.id === fpState.shopId) || FP_SHOP_DESTINATIONS[0];
      placeBadge.innerHTML = `${createCustomSVGIcon(dest.icon, 15)}<span>${dest.name} · 1인칭 방문</span>`;
    } else {
      const rm = findRoomById(fpState.roomId);
      const fam = rm?.household?.familyName || '공실 투어';
      placeBadge.innerHTML = `${createCustomSVGIcon('doorbell_visit', 15)}<span>${rm?.name || ''}호 (${fam}) · 1인칭 집들이</span>`;
    }
  }

  const strip = document.getElementById('fp-shop-shelf-strip');
  if (strip && isShop) {
    strip.innerHTML = FP_GIFT_ITEMS.map((it) => `
      <button type="button" data-fp-buy="${it.id}" class="fp-shelf-pill shrink-0">
        ${createCustomSVGIcon(it.icon, 18)}
        <span>${it.shortName}</span>
        <span class="text-[#B45309]">${it.cost}만</span>
      </button>
    `).join('');
    strip.querySelectorAll('[data-fp-buy]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const iid = btn.getAttribute('data-fp-buy');
        const hitObj = fpState.pickables.find((p) => p.userData?.itemId === iid);
        buyFpShowcaseItem(iid, hitObj?.userData?.visualMesh || null);
      });
    });
  }

  syncHeldHands3DAndChips();
}

function openFpVisitModal(defaultTab = 'shops') {
  fpState.modalTab = defaultTab;
  renderFpVisitModalCards();
  dom.fpVisitModal?.classList.remove('hidden');
}

function renderFpVisitModalCards() {
  const grid = document.getElementById('fp-visit-cards-grid');
  const tabShops = document.getElementById('fp-tab-shops');
  const tabRooms = document.getElementById('fp-tab-rooms');
  if (!grid) return;

  const isShops = fpState.modalTab === 'shops';
  tabShops?.classList.toggle('active', isShops);
  tabRooms?.classList.toggle('active', !isShops);

  if (isShops) {
    grid.innerHTML = FP_SHOP_DESTINATIONS.map((dest) => `
      <div class="diary-card flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-11 h-11 rounded-2xl bg-[#FFFDF7] border-2 border-[#E8CCB0] flex items-center justify-center shrink-0">
            ${createCustomSVGIcon(dest.icon, 26)}
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-title text-[14.5px] text-[#3A2E2B]">${dest.name}</span>
              <span class="kw-chip tone-${dest.tone}">${dest.badge}</span>
            </div>
            <div class="font-body text-[11.5px] font-semibold text-[#69544C] mt-0.5 truncate">
              상주 스태프: ${dest.staffName} · 진열대 3D 쇼핑 & 골든벨 가능
            </div>
          </div>
        </div>
        <button type="button" data-enter-fp-shop="${dest.id}" class="jelly-action-btn btn-gold-lip px-3.5 py-2 shrink-0">
          ${createCustomSVGIcon('walk_enter_door', 16)}
          <span>1인칭 입장</span>
        </button>
      </div>
    `).join('');

    grid.querySelectorAll('[data-enter-fp-shop]').forEach((btn) => {
      btn.addEventListener('click', () => {
        enterFirstPersonShop(btn.getAttribute('data-enter-fp-shop'));
      });
    });
  } else {
    const b = state.buildings.lot_main;
    grid.innerHTML = b.rooms.map((rm) => {
      const meta = ROOM_TYPE_META[rm.layoutType] || ROOM_TYPE_META.studio;
      const hDef = rm.household ? HOUSEHOLD_TYPES[rm.household.type] : null;
      const appDef = getFurnitureItemDef('appliance', rm.equippedFurniture?.appliance);
      return `
        <div class="diary-card flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0 flex-1">
            ${rm.household
              ? createHouseholdAvatarSVG(rm.household.type, 46)
              : `<div class="w-11 h-11 rounded-2xl bg-[#FFFDF7] border-2 border-[#E8CCB0] flex items-center justify-center shrink-0">${createCustomSVGIcon(rm.unlocked ? meta.svgIcon : 'padlock_gold', 24)}</div>`}
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="hotel-num-tag">${rm.name}호</span>
                <span class="kw-chip tone-${meta.tone}">${meta.shortBadge}</span>
                ${hDef ? `<span class="role-accent-badge" style="background:${hDef.accentHex};">${hDef.label}</span>` : ''}
                ${(rm.giftBonusPct || 0) > 0 ? `<span class="kw-chip tone-gold">평생단골 +${rm.giftBonusPct}%</span>` : ''}
              </div>
              <div class="font-body text-[11.5px] font-semibold text-[#69544C] mt-0.5 break-keep">
                ${!rm.unlocked
                  ? `미개방 호실 (${rm.unlockCost}만 개방 후 VIP 세입자 맞이 가능)`
                  : rm.household
                    ? `${rm.household.familyName} 거주 중 · ${appDef?.name || '기본 가전'}`
                    : '공실 (1인칭 내부 투어 또는 즉시 VIP 입주 가능)'}
              </div>
            </div>
          </div>
          ${rm.unlocked && rm.household
            ? `<button type="button" data-enter-fp-room="${rm.id}" class="jelly-action-btn btn-mint-lip px-3.5 py-2 shrink-0">${createCustomSVGIcon('doorbell_visit', 16)}<span>띵동~ 방문</span></button>`
            : `<button type="button" data-quick-vip-room="${rm.id}" class="jelly-action-btn btn-coral-lip px-3 py-2 shrink-0">${createCustomSVGIcon('contract_scroll', 15)}<span>${rm.unlocked ? '즉시 입주&방문' : `${rm.unlockCost}만 개방&방문`}</span></button>`}
        </div>
      `;
    }).join('');

    grid.querySelectorAll('[data-enter-fp-room]').forEach((btn) => {
      btn.addEventListener('click', () => {
        enterFirstPersonRoom(btn.getAttribute('data-enter-fp-room'));
      });
    });

    grid.querySelectorAll('[data-quick-vip-room]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const rm = findRoomById(btn.getAttribute('data-quick-vip-room'));
        if (!rm) return;
        if (!rm.unlocked) {
          if (!spendGold(rm.unlockCost)) return;
          rm.unlocked = true;
        }
        if (!rm.household) {
          const meta = ROOM_TYPE_META[rm.layoutType] || ROOM_TYPE_META.studio;
          const tKey = meta.preferredBy[0] || 'newlywed';
          const hDef = HOUSEHOLD_TYPES[tKey];
          rm.household = {
            type: tKey,
            familyName: `${FAMILY_LAST_NAMES[Math.floor(Math.random() * FAMILY_LAST_NAMES.length)]}${GIVEN_NAMES[Math.floor(Math.random() * GIVEN_NAMES.length)]} 세대`,
            maxBudget: hDef.maxRent,
            happiness: 96
          };
          rm.rentTimer = 5.0;
        }
        rebuildRoom3D(rm.lotId, rm);
        syncBuildingResidents3D(rm.lotId);
        updateTopHUDTargets();
        saveGameState();
        enterFirstPersonRoom(rm.id);
      });
    });
  }
}

function exitFirstPersonMode(returnToDriveOverride = null) {
  if (!fpState.active) return;
  const shouldDrive = returnToDriveOverride !== null ? returnToDriveOverride : fpState.returnToDrive;
  const visitedRoomId = fpState.mode === 'room' ? fpState.roomId : null;

  fpState.active = false;
  fpState.keys.forward = false;
  fpState.keys.backward = false;
  fpState.keys.left = false;
  fpState.keys.right = false;
  if (fpState.handsGroup) fpState.handsGroup.visible = false;

  clearFpStageAndTempProps();
  if (visitedRoomId) {
    const rm = findRoomById(visitedRoomId);
    if (rm) syncBuildingResidents3D(rm.lotId);
  }

  if (shouldDrive) {
    enterDriveMode(true);
  } else {
    controls.enabled = true;
    setOverviewCamera(true);
  }
}

function tickFirstPersonMode(dt, elapsed) {
  if (!fpState.active || !fpCamera) return;

  // 입장 시 자동 문 열림 & 두 걸음 전진 연출 (Head-bobbing 동반)
  let moving = false;
  if (fpState.doorHinge && fpState.doorAngle < 1.35) {
    fpState.doorAngle = Math.min(1.35, fpState.doorAngle + dt * 2.6);
    fpState.doorHinge.rotation.y = fpState.doorAngle;
  }

  if (fpState.entryWalkTimer > 0) {
    fpState.entryWalkTimer -= dt;
    fpState.pos.z -= dt * 1.45;
    moving = true;
  }

  const turnInput = (fpState.keys.left ? 1 : 0) - (fpState.keys.right ? 1 : 0);
  if (turnInput !== 0) {
    fpState.yaw += turnInput * 1.65 * dt;
  }

  const moveInput = (fpState.keys.forward ? 1 : 0) - (fpState.keys.backward ? 1 : 0);
  if (moveInput !== 0) {
    const lookSin = Math.sin(fpState.yaw);
    const lookCos = Math.cos(fpState.yaw);
    fpState.pos.x -= lookSin * moveInput * 3.4 * dt;
    fpState.pos.z -= lookCos * moveInput * 3.4 * dt;
    moving = true;
  }

  fpState.pos.x = THREE.MathUtils.clamp(fpState.pos.x, fpState.bounds.minX, fpState.bounds.maxX);
  fpState.pos.z = THREE.MathUtils.clamp(fpState.pos.z, fpState.bounds.minZ, fpState.bounds.maxZ);

  if (moving) {
    fpState.walkPhase += dt * 10.5;
  }
  const headBobY = moving ? Math.sin(fpState.walkPhase) * 0.055 : Math.sin(elapsed * 2.2) * 0.012;
  const headBobX = moving ? Math.cos(fpState.walkPhase * 0.5) * 0.025 : 0;

  fpCamera.position.set(fpState.pos.x + headBobX, fpState.bounds.eyeY + headBobY, fpState.pos.z);
  fpCamera.rotation.order = 'YXZ';
  fpCamera.rotation.y = fpState.yaw;
  fpCamera.rotation.x = THREE.MathUtils.clamp(fpState.pitch, -0.45, 0.45);

  // 1인칭 양손(커피·케이크·꽃다발) 자연스러운 보행 흔들림
  if (fpState.handsGroup) {
    fpState.handsGroup.position.x = Math.cos(fpState.walkPhase * 0.5) * (moving ? 0.018 : 0.004);
    fpState.handsGroup.position.y = Math.abs(Math.sin(fpState.walkPhase)) * (moving ? -0.022 : 0) + Math.sin(elapsed * 2.5) * 0.006;
  }

  // 황금 종 흔들림 애니메이션
  if (fpState.bellPivot) {
    if (fpState.bellSwingTimer > 0) {
      fpState.bellSwingTimer -= dt;
      fpState.bellPivot.rotation.z = Math.sin(elapsed * 24) * 0.48 * Math.min(1, fpState.bellSwingTimer);
    } else {
      fpState.bellPivot.rotation.z = Math.sin(elapsed * 2.2) * 0.05;
    }
  }

  if (fpState.cheerTimer > 0) fpState.cheerTimer -= dt;

  // 매장 직원 & 손님들이 항상 나를 바라보며 박수/만세 리액션!
  for (const ac of fpState.npcActors) {
    const wp = new THREE.Vector3();
    ac.mesh.getWorldPosition(wp);
    const dx = fpCamera.position.x - wp.x;
    const dz = fpCamera.position.z - wp.z;
    ac.mesh.rotation.y = Math.atan2(dx, dz);

    if (fpState.cheerTimer > 0) {
      // 골든벨 만세 점프!
      ac.mesh.position.y = ac.baseY + Math.abs(Math.sin(elapsed * 12 + ac.phase)) * 0.28;
      ac.mesh.userData.armL.rotation.z = 2.6 + Math.sin(elapsed * 16) * 0.25;
      ac.mesh.userData.armR.rotation.z = -2.6 - Math.sin(elapsed * 16) * 0.25;
    } else {
      // 갓물주 영접 박수 짝짝 리액션
      ac.mesh.position.y = ac.baseY + Math.abs(Math.sin(elapsed * 5 + ac.phase)) * 0.06;
      const clap = Math.sin(elapsed * 11 + ac.phase) * 0.38;
      ac.mesh.userData.armL.rotation.z = 1.05 + clap;
      ac.mesh.userData.armR.rotation.z = -1.05 - clap;
    }
  }

  // 세입자 집들이 모드일 때 세입자가 내 눈을 맞추며 인사!
  if (fpState.mode === 'room' && fpState.hostResidentMesh) {
    const wp = new THREE.Vector3();
    fpState.hostResidentMesh.getWorldPosition(wp);
    fpState.hostResidentMesh.rotation.y = Math.atan2(fpCamera.position.x - wp.x, fpCamera.position.z - wp.z);
    fpState.hostResidentMesh.userData.armR.rotation.z = -2.1 + Math.sin(elapsed * 9) * 0.35;
  }
}


// =========================================================
// 14. 전체화면 단독 룸 인스펙터 · 와이드 쇼케이스 가구 상점 · 단독 상가 UI (이모지 0%)
// =========================================================
function renderRoomSwitcherChips(lotId) {
  if (!dom.roomSwitcherChips) return;
  const bState = state.buildings[lotId];
  if (!bState) return;

  dom.roomSwitcherChips.innerHTML = bState.rooms.map((rm) => {
    const meta = ROOM_TYPE_META[rm.layoutType] || ROOM_TYPE_META.studio;
    const isAct = rm.id === focusedRoomId;
    return `
      <button type="button" data-switch-room="${rm.id}" class="room-switch-chip ${isAct ? 'active' : ''}">
        ${createCustomSVGIcon(meta.svgIcon || 'studio_unit', 16)}
        <span>${rm.name}호 · ${meta.shortBadge}</span>
        ${rm.unlocked ? '' : createCustomSVGIcon('padlock_gold', 14)}
      </button>
    `;
  }).join('');

  dom.roomSwitcherChips.querySelectorAll('[data-switch-room]').forEach((btn) => {
    btn.addEventListener('click', () => {
      focusCameraOnRoom(btn.getAttribute('data-switch-room'));
    });
  });
}

function renderFocusedRoomInspector() {
  const rm = findRoomById(focusedRoomId);
  if (!rm || !dom.rfBody) return;
  const bState = state.buildings[rm.lotId];
  const meta = ROOM_TYPE_META[rm.layoutType] || ROOM_TYPE_META.studio;

  if (dom.rfRoomNum) dom.rfRoomNum.textContent = `${rm.name}호`;
  if (dom.rfTypeBadge) {
    dom.rfTypeBadge.className = `kw-chip tone-${meta.tone} !py-0.5 !px-2 shrink-0`;
    dom.rfTypeBadge.innerHTML = `${createCustomSVGIcon(meta.svgIcon, 14)}<span>${meta.shortBadge}</span>`;
  }
  if (dom.rfTierBadge) dom.rfTierBadge.textContent = `Lv.${rm.interiorLv || 0}`;

  if (!rm.unlocked) {
    dom.rfBody.innerHTML = `
      <div class="diary-subcard space-y-2.5 text-center">
        <div class="flex items-center justify-center gap-1.5 font-title text-[14px] text-[#3A2E2B]">
          ${createCustomSVGIcon('padlock_gold', 18)}
          <span>${rm.name}호 ${meta.badge} 미개방</span>
        </div>
        <div class="font-body text-[12px] font-semibold text-[#69544C]">${meta.specialty}</div>
        <button type="button" id="btn-rf-unlock" class="jelly-action-btn btn-gold-lip w-full py-2.5">
          ${createCustomSVGIcon('blueprint_hammer', 18)}
          <span>${rm.unlockCost.toLocaleString()}만으로 호실 개방</span>
        </button>
      </div>
    `;
    dom.rfBody.querySelector('#btn-rf-unlock')?.addEventListener('click', () => {
      unlockRoomAction(rm);
    });
    return;
  }

  const effRent = calcRoomEffectiveRent(bState, rm);

  if (!rm.household) {
    dom.rfBody.innerHTML = `
      <div class="diary-subcard space-y-2.5">
        <div class="flex items-center justify-between gap-2">
          <span class="font-title text-[14px] text-[#3A2E2B]">${meta.badge}</span>
          <span class="kw-chip tone-mint">${createCustomSVGIcon('coin_stack', 14)}<span>월세 ${effRent}만</span></span>
        </div>
        <div class="font-body text-[12px] font-semibold text-[#69544C]">${meta.specialty}</div>
        <button type="button" id="btn-rf-recruit" class="jelly-action-btn btn-coral-lip w-full py-2.5">
          ${createCustomSVGIcon('contract_scroll', 18)}
          <span>입주 세대 심사 & 계약하기</span>
        </button>
      </div>
    `;
    dom.rfBody.querySelector('#btn-rf-recruit')?.addEventListener('click', () => {
      openRecruitModal(rm);
    });
    return;
  }

  const hDef = HOUSEHOLD_TYPES[rm.household.type] || HOUSEHOLD_TYPES.student;
  const happyVal = Math.round(rm.household.happiness || 90);

  dom.rfBody.innerHTML = `
    <div class="diary-subcard space-y-2.5">
      <div class="flex items-center gap-2.5">
        ${createHouseholdAvatarSVG(rm.household.type, 46)}
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="font-title text-[14px] text-[#3A2E2B]">${rm.household.familyName}</span>
            <span class="role-accent-badge" style="background:${hDef.accentHex};">${hDef.label}</span>
          </div>
          <div class="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span class="kw-chip tone-gold !py-0.5 !px-2">${createCustomSVGIcon('coin_stack', 14)}<span>주기 ${effRent}만</span></span>
            <span class="kw-chip tone-coral !py-0.5 !px-2">${createCustomSVGIcon('sparkle_heart_gauge', 14)}<span>${happyVal}%</span></span>
            ${(rm.giftBonusPct || 0) > 0 ? `<span class="kw-chip tone-mint !py-0.5 !px-2">${createCustomSVGIcon('gift_ribbon_box', 13)}<span>평생단골 +${rm.giftBonusPct}%</span></span>` : ''}
          </div>
        </div>
      </div>

      <div class="candy-gauge-track">
        <div class="candy-gauge-fill candy-coral" style="width:${happyVal}%"></div>
      </div>

      <div class="grid grid-cols-2 gap-2 pt-0.5">
        ${rm.trashStage > 0 ? `
          <button type="button" id="btn-rf-clean" class="jelly-action-btn btn-mint-lip py-2 !text-[11.5px]">
            ${createCustomSVGIcon('broom_clean', 15)}
            <span>특수청소 ${GAME_BALANCE.specialCleanCost}만</span>
          </button>` : ''}
        ${!rm.soundproofed ? `
          <button type="button" id="btn-rf-sound" class="jelly-action-btn btn-sky-lip py-2 !text-[11.5px]">
            ${createCustomSVGIcon('soundproof_hammer', 15)}
            <span>방음시공 ${GAME_BALANCE.soundproofCost}만</span>
          </button>` : `
          <span class="kw-chip tone-mint justify-center py-1.5">
            ${createCustomSVGIcon('soundproof_hammer', 14)}
            <span>층간방음 완료</span>
          </span>`}
        <button type="button" id="btn-rf-evict" class="jelly-action-btn btn-coral-lip py-2 !text-[11.5px]">
          ${createCustomSVGIcon('evict_stamp', 15)}
          <span>퇴거 집행</span>
        </button>
      </div>
    </div>
  `;

  dom.rfBody.querySelector('#btn-rf-clean')?.addEventListener('click', () => cleanRoomTrashAction(rm));
  dom.rfBody.querySelector('#btn-rf-sound')?.addEventListener('click', () => installSoundproofAction(rm));
  dom.rfBody.querySelector('#btn-rf-evict')?.addEventListener('click', () => evictRoomTenantAction(rm));
}

function renderFurnitureCatalogSheet() {
  const rm = findRoomById(focusedRoomId);
  if (!rm || !dom.fcatItemsGrid) return;
  const meta = ROOM_TYPE_META[rm.layoutType] || ROOM_TYPE_META.studio;

  const headerIco = document.getElementById('fcat-header-ico');
  if (headerIco) headerIco.innerHTML = createCustomSVGIcon('sofa_ico', 20);
  if (dom.fcatSheetTitle) dom.fcatSheetTitle.textContent = '인테리어 가구 상점';
  if (dom.fcatRoomBadge) dom.fcatRoomBadge.textContent = `${rm.name}호 · ${meta.shortBadge}`;
  if (dom.fcatBonusBadge) dom.fcatBonusBadge.textContent = `인테리어 +${calcRoomFurnitureRentAdd(rm)}만`;

  dom.fcatTabsRow?.classList.remove('hidden');
  dom.fcatItemsGrid.classList.remove('cols-3');

  document.querySelectorAll('[data-fcat]').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-fcat') === activeFurnitureCategory);
  });

  const list = FURNITURE_CATALOG[activeFurnitureCategory] || [];
  const ownedArr = rm.ownedFurniture?.[activeFurnitureCategory] || [];
  const equippedId = rm.equippedFurniture?.[activeFurnitureCategory];

  dom.fcatItemsGrid.innerHTML = list.map((item) => {
    const isOwned = ownedArr.includes(item.id);
    const isEquipped = equippedId === item.id;

    let btnHtml = '';
    if (!rm.unlocked) {
      btnHtml = `<button type="button" disabled class="diary-pill-badge w-full justify-center py-1.5 opacity-60">개방 후 이용</button>`;
    } else if (isEquipped) {
      btnHtml = `
        <button type="button" disabled class="kw-chip tone-mint w-full justify-center py-1.5">
          ${createCustomSVGIcon('sparkle_star', 14)}
          <span>배치 완료</span>
        </button>`;
    } else if (isOwned) {
      btnHtml = `<button type="button" data-fequip="${item.id}" class="jelly-action-btn btn-mint-lip w-full py-1.5 !text-[12px]">배치 변경</button>`;
    } else {
      btnHtml = `
        <button type="button" data-fbuy="${item.id}" class="jelly-action-btn btn-gold-lip w-full py-1.5 !text-[12px]">
          ${createCustomSVGIcon('coin_stack', 15)}
          <span>${item.cost}만 시공</span>
        </button>`;
    }

    return `
      <div class="fcat-item-card ${isEquipped ? 'equipped' : ''}">
        <div class="fcat-thumb-stage">${createCatalogThumbnailSVG(item.id, 152, 74)}</div>
        <div class="space-y-1">
          <div class="font-title text-[13px] text-[#3A2E2B] leading-snug">${item.name}</div>
          <span class="kw-chip tone-${item.tone} !text-[10.5px] !py-0.5 !px-2">${item.chip}</span>
        </div>
        ${btnHtml}
      </div>
    `;
  }).join('');

  dom.fcatItemsGrid.querySelectorAll('[data-fbuy]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const itemId = btn.getAttribute('data-fbuy');
      handleBuyOrEquipFurniture(rm, activeFurnitureCategory, itemId, true);
    });
  });

  dom.fcatItemsGrid.querySelectorAll('[data-fequip]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const itemId = btn.getAttribute('data-fequip');
      handleBuyOrEquipFurniture(rm, activeFurnitureCategory, itemId, false);
    });
  });
}

function handleBuyOrEquipFurniture(rm, category, itemId, isBuy) {
  const def = getFurnitureItemDef(category, itemId);
  if (!def) return;
  if (isBuy && !spendGold(def.cost)) return;

  if (!rm.ownedFurniture[category].includes(itemId)) {
    rm.ownedFurniture[category].push(itemId);
  }
  rm.equippedFurniture[category] = itemId;
  syncRoomInteriorStats(rm);

  if (rm.household && isBuy) {
    rm.household.happiness = Math.min(100, (rm.household.happiness || 85) + (def.happyAdd || 10));
  }

  rebuildRoom3D(rm.lotId, rm);
  syncBuildingResidents3D(rm.lotId);

  const lot = state.lots.find((l) => l.lotId === rm.lotId);
  const wx = (lot?.x || 0) + rm.lx;
  const wy = rm.ly + 1.4;
  const wz = (lot?.z || 0) + rm.lz;
  spawnPoofParticles3D(wx, wy, wz, 0xFF6B6B, 12);
  spawnShockwaveRing3D(wx, rm.ly + 0.25, wz, 0x38E54D, 3.8);

  if (rm.household && def.reaction) {
    showSpeechBubble3D(`rm_${rm.id}`, wx, wy + 1.4, wz, def.reaction, 3.2);
  }

  updateTopHUDTargets();
  renderFocusedRoomInspector();
  renderFurnitureCatalogSheet();
  showToast(`[${rm.name}호] ${def.name} 배치 완료!`, 'mint');
  saveGameState();
}

function unlockRoomAction(rm) {
  if (!spendGold(rm.unlockCost)) return;
  rm.unlocked = true;
  rebuildSingleResidentialLotPreserveCamera(rm.lotId);
  const lot = state.lots.find((l) => l.lotId === rm.lotId);
  spawnPoofParticles3D((lot?.x || 0) + rm.lx, rm.ly + 1.5, (lot?.z || 0) + rm.lz, 0xFFD93D, 14);
  updateTopHUDTargets();
  renderRoomSwitcherChips(rm.lotId);
  renderFocusedRoomInspector();
  renderFurnitureCatalogSheet();
  showToast(`${rm.name}호 (${ROOM_TYPE_META[rm.layoutType]?.badge}) 개방 완료!`, 'gold');
  saveGameState();
}

function rebuildSingleResidentialLotPreserveCamera(lotId) {
  buildSingleLot3D(lotId);
}

function cleanRoomTrashAction(rm) {
  if (!spendGold(GAME_BALANCE.specialCleanCost)) return;
  rm.trashStage = 0;
  rm.trashProgress = 0;
  state.stats.crisisResolved = (state.stats.crisisResolved || 0) + 1;
  rebuildRoom3D(rm.lotId, rm);
  syncBuildingResidents3D(rm.lotId);
  renderFocusedRoomInspector();
  showToast(`${rm.name}호 특수 청소 완료!`, 'mint');
  saveGameState();
}

function installSoundproofAction(rm) {
  if (!spendGold(GAME_BALANCE.soundproofCost)) return;
  rm.soundproofed = true;
  rm.activeConflict = null;
  state.stats.crisisResolved = (state.stats.crisisResolved || 0) + 1;
  renderFocusedRoomInspector();
  showToast(`${rm.name}호 층간 방음 시공 완료!`, 'mint');
  saveGameState();
}

function evictRoomTenantAction(rm) {
  if (!rm.household) return;
  const fam = rm.household.familyName;
  rm.household = null;
  rm.trashStage = 0;
  rm.activeConflict = null;
  state.stats.evictions = (state.stats.evictions || 0) + 1;

  rebuildRoom3D(rm.lotId, rm);
  syncBuildingResidents3D(rm.lotId);
  updateTopHUDTargets();
  renderFocusedRoomInspector();

  if (dom.evictionOverlay) {
    dom.evictionOverlay.classList.remove('hidden');
    setTimeout(() => dom.evictionOverlay.classList.add('hidden'), 1250);
  }
  showToast(`${rm.name}호 ${fam} 퇴거 집행 완료`, 'coral');
  saveGameState();
}

// --------------------- 단독 상가(빵집·로스터리·플라워샵) 인스펙터 & 3종 설비 쇼케이스 카탈로그 ---------------------
function renderShopSwitcherChips() {
  if (!dom.shopSwitcherChips) return;
  dom.shopSwitcherChips.innerHTML = STANDALONE_SHOPS_TEMPLATE.map((tpl) => {
    const st = state.standaloneShops?.[tpl.shopId];
    const isAct = tpl.shopId === focusedShopId;
    return `
      <button type="button" data-switch-shop="${tpl.shopId}" class="room-switch-chip ${isAct ? 'active' : ''}">
        ${createCustomSVGIcon(tpl.svgIcon, 16)}
        <span>${tpl.name}</span>
        ${st?.owned ? createCustomSVGIcon('crown_badge', 14) : ''}
      </button>
    `;
  }).join('');

  dom.shopSwitcherChips.querySelectorAll('[data-switch-shop]').forEach((btn) => {
    btn.addEventListener('click', () => focusCameraOnShop(btn.getAttribute('data-switch-shop')));
  });
}

function renderFocusedShopPanel() {
  if (!focusedShopId || !dom.sfBody) return;
  const tpl = STANDALONE_SHOPS_TEMPLATE.find((s) => s.shopId === focusedShopId);
  const st = state.standaloneShops?.[focusedShopId];
  if (!tpl || !st) return;

  const { visitRev, cycleRev, upgCount } = calcStandaloneShopStats(focusedShopId);
  const upgPct = Math.round((upgCount / 3) * 100);

  const iconSlot = document.getElementById('sf-icon-slot');
  if (iconSlot) iconSlot.innerHTML = createCustomSVGIcon(tpl.svgIcon, 22);
  if (dom.sfTitle) dom.sfTitle.textContent = tpl.name;
  if (dom.sfOwnerBadge) {
    dom.sfOwnerBadge.className = st.owned
      ? 'kw-chip tone-mint !py-0.5 !px-2.5 shrink-0'
      : 'kw-chip tone-gold !py-0.5 !px-2.5 shrink-0';
    dom.sfOwnerBadge.innerHTML = st.owned
      ? `${createCustomSVGIcon('crown_badge', 13)}<span>직영매장</span>`
      : '<span>미인수</span>';
  }

  dom.sfBody.innerHTML = `
    <div class="diary-subcard space-y-2.5">
      <div class="flex items-center gap-2.5">
        ${createHouseholdAvatarSVG(tpl.staffRole, 48)}
        <div class="min-w-0 flex-1">
          <div class="font-title text-[14px] text-[#3A2E2B]">${tpl.staffName}</div>
          <div class="font-body text-[11px] font-semibold text-[#69544C] break-keep tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">${tpl.engTitle} · ${tpl.subCopy}</div>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-1.5 text-center">
        <div class="bg-[#FFF9DB] border border-[#FACC15] rounded-2xl py-1.5 px-1">
          <div class="font-body text-[10px] font-bold text-[#8C5800]">방문단가</div>
          <div class="font-title text-[13px] text-[#3A2E2B]">+${visitRev}만</div>
        </div>
        <div class="bg-[#E8FCEC] border border-[#6EE780] rounded-2xl py-1.5 px-1">
          <div class="font-body text-[10px] font-bold text-[#137A22]">정기배당</div>
          <div class="font-title text-[13px] text-[#137A22]">+${cycleRev}만</div>
        </div>
        <div class="bg-[#EAF7FF] border border-[#7CCEFF] rounded-2xl py-1.5 px-1">
          <div class="font-body text-[10px] font-bold text-[#0969A6]">누적손님</div>
          <div class="font-title text-[13px] text-[#3A2E2B]">${st.totalServed || 0}명</div>
        </div>
      </div>

      <div class="space-y-1">
        <div class="flex items-center justify-between text-[11px] font-title text-[#5C4942]">
          <span>3D 매장 설비 증설도</span>
          <span>${upgCount} / 3단계</span>
        </div>
        <div class="candy-gauge-track">
          <div class="candy-gauge-fill candy-mint" style="width:${upgPct}%"></div>
        </div>
      </div>

      ${st.owned ? `
        <div class="kw-chip tone-mint w-full justify-center py-2">
          ${createCustomSVGIcon('cash_arrow_up', 16)}
          <span>손님 결제금이 내 자산으로 실시간 적립 중!</span>
        </div>
      ` : `
        <button type="button" id="btn-acquire-shop" class="jelly-action-btn btn-coral-lip w-full py-2.5">
          ${createCustomSVGIcon('crown_badge', 18)}
          <span>단독 상가 직영 인수 (${tpl.buyCost.toLocaleString()}만)</span>
        </button>
      `}
    </div>
  `;

  dom.sfBody.querySelector('#btn-acquire-shop')?.addEventListener('click', () => {
    acquireStandaloneShopAction(focusedShopId);
  });
}

function renderShopUpgradeCatalog() {
  if (!focusedShopId || !dom.fcatItemsGrid) return;
  const tpl = STANDALONE_SHOPS_TEMPLATE.find((s) => s.shopId === focusedShopId);
  const st = state.standaloneShops?.[focusedShopId];
  if (!tpl || !st) return;

  const { visitRev, cycleRev } = calcStandaloneShopStats(focusedShopId);

  const headerIco = document.getElementById('fcat-header-ico');
  if (headerIco) headerIco.innerHTML = createCustomSVGIcon(tpl.svgIcon, 20);
  if (dom.fcatSheetTitle) dom.fcatSheetTitle.textContent = '부티크 상가 3D 설비 상점';
  if (dom.fcatRoomBadge) dom.fcatRoomBadge.textContent = tpl.name;
  if (dom.fcatBonusBadge) dom.fcatBonusBadge.textContent = `방문 +${visitRev}만 · 주기 +${cycleRev}만`;

  dom.fcatTabsRow?.classList.add('hidden');
  dom.fcatItemsGrid.classList.add('cols-3');

  dom.fcatItemsGrid.innerHTML = SHOP_UPGRADE_CATALOG.map((upg) => {
    const installed = !!st.upgrades?.[upg.id];
    let btnHtml = '';
    if (!st.owned) {
      btnHtml = `
        <button type="button" data-shop-acquire-first="1" class="jelly-action-btn btn-coral-lip w-full py-1.5 !text-[12px]">
          ${createCustomSVGIcon('crown_badge', 15)}
          <span>상가 인수 (${tpl.buyCost}만)</span>
        </button>`;
    } else if (installed) {
      btnHtml = `
        <button type="button" disabled class="kw-chip tone-mint w-full justify-center py-1.5">
          ${createCustomSVGIcon('sparkle_star', 14)}
          <span>3D 시공 완료</span>
        </button>`;
    } else {
      btnHtml = `
        <button type="button" data-shop-upg="${upg.id}" class="jelly-action-btn btn-gold-lip w-full py-1.5 !text-[12px]">
          ${createCustomSVGIcon('coin_stack', 15)}
          <span>${upg.cost}만 증설</span>
        </button>`;
    }

    return `
      <div class="fcat-item-card ${installed ? 'equipped' : ''}">
        <div class="fcat-thumb-stage">${createCatalogThumbnailSVG(upg.id, 180, 74)}</div>
        <div class="space-y-1">
          <div class="font-title text-[13px] text-[#3A2E2B] leading-snug">${upg.name}</div>
          <span class="kw-chip tone-${upg.tone} !text-[10.5px] !py-0.5 !px-2">${upg.chip}</span>
        </div>
        ${btnHtml}
      </div>
    `;
  }).join('');

  dom.fcatItemsGrid.querySelectorAll('[data-shop-acquire-first]').forEach((btn) => {
    btn.addEventListener('click', () => acquireStandaloneShopAction(focusedShopId));
  });
  dom.fcatItemsGrid.querySelectorAll('[data-shop-upg]').forEach((btn) => {
    btn.addEventListener('click', () => buyShopUpgradeAction(focusedShopId, btn.getAttribute('data-shop-upg')));
  });
}

function acquireStandaloneShopAction(shopId) {
  const tpl = STANDALONE_SHOPS_TEMPLATE.find((s) => s.shopId === shopId);
  const st = state.standaloneShops?.[shopId];
  if (!tpl || !st || st.owned) return;
  if (!spendGold(tpl.buyCost)) return;

  st.owned = true;
  rebuildStandaloneShop3D(shopId);
  spawnPoofParticles3D(tpl.x, 2.4, tpl.z, 0xFFD93D, 16);
  spawnShockwaveRing3D(tpl.x, 0.35, tpl.z, 0xFF6B6B, 5.5);
  spawnJackpotText3D(tpl.x, 3.6, tpl.z, `${tpl.name} 직영 인수!`, 'crown_badge');

  updateTopHUDTargets();
  renderShopSwitcherChips();
  renderFocusedShopPanel();
  renderShopUpgradeCatalog();
  showToast(`[${tpl.name}] 직영 인수 완료! 손님 결제금이 자산에 합산됩니다!`, 'gold');
  saveGameState();
}

function buyShopUpgradeAction(shopId, upgId) {
  const tpl = STANDALONE_SHOPS_TEMPLATE.find((s) => s.shopId === shopId);
  const st = state.standaloneShops?.[shopId];
  const upg = SHOP_UPGRADE_CATALOG.find((u) => u.id === upgId);
  if (!tpl || !st || !upg || !st.owned || st.upgrades[upgId]) return;
  if (!spendGold(upg.cost)) return;

  st.upgrades[upgId] = true;
  rebuildStandaloneShop3D(shopId);
  spawnPoofParticles3D(tpl.x, 2.2, tpl.z + 1.2, 0x38E54D, 14);
  spawnShockwaveRing3D(tpl.x, 0.35, tpl.z + 1.0, 0xFFD93D, 4.8);
  showSpeechBubble3D(`staff_${shopId}`, tpl.x, 2.6, tpl.z, upg.reaction, 3.4);

  updateTopHUDTargets();
  renderFocusedShopPanel();
  renderShopUpgradeCatalog();
  showToast(`[${tpl.name}] ${upg.name} 3D 시공 완료!`, 'mint');
  saveGameState();
}

// =========================================================
// 15. 택타일 코지 팝 타운 경영 수첩(4탭 풀 구성) · 입주 모집 · 부지 착공 모달
// =========================================================
function refreshQuestRedDot() {
  let claimable = 0;
  let doneTotal = 0;
  for (const q of QUEST_LIST) {
    const isClaimed = state.claimedQuests.includes(q.id);
    if (isClaimed) doneTotal += 1;
    else if (q.check(state)) claimable += 1;
  }
  if (dom.fabRedDot) {
    dom.fabRedDot.textContent = String(claimable);
    dom.fabRedDot.classList.toggle('hidden', claimable === 0);
  }
  if (dom.tabDotQuests) {
    dom.tabDotQuests.classList.toggle('hidden', claimable === 0);
  }
  if (dom.modalQuestSummary) {
    dom.modalQuestSummary.textContent = `${doneTotal}/${QUEST_LIST.length}`;
  }
}

function openNotebookModal(tab = null) {
  if (tab) activeNotebookTab = tab;
  document.querySelectorAll('[data-ntab]').forEach((b) => {
    b.classList.toggle('active', b.getAttribute('data-ntab') === activeNotebookTab);
  });
  renderNotebookUnifiedBody();
  dom.notebookModal?.classList.remove('hidden');
}

function renderNotebookUnifiedBody() {
  if (!dom.notebookBody) return;

  if (activeNotebookTab === 'quests') {
    dom.notebookBody.innerHTML = QUEST_LIST.map((q) => {
      const claimed = state.claimedQuests.includes(q.id);
      const ready = !claimed && q.check(state);
      const prog = q.progress ? q.progress(state) : { cur: ready || claimed ? 1 : 0, max: 1 };
      const pct = Math.min(100, Math.round((prog.cur / Math.max(1, prog.max)) * 100));

      return `
        <div class="diary-card flex items-center justify-between gap-3 ${ready ? '!bg-[#FFFDF2] !border-[#38E54D] !border-2' : ''}">
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <div class="w-12 h-12 rounded-2xl bg-[#FFFDF7] border-2 border-[#E8CCB0] flex items-center justify-center shrink-0">
              ${createCustomSVGIcon(q.icon || 'quest_trophy', 30)}
            </div>
            <div class="min-w-0 flex-1 space-y-1">
              <div class="font-title text-[14.5px] text-[#3A2E2B]">${q.title}</div>
              <div class="font-body text-[11.5px] font-medium text-[#69544C] leading-snug">${q.desc || ''}</div>
              <div class="flex items-center gap-2.5 pt-0.5">
                <div class="candy-gauge-track max-w-[130px]">
                  <div class="candy-gauge-fill candy-mint" style="width:${claimed ? 100 : pct}%"></div>
                </div>
                <span class="kw-chip tone-gold !py-0.5 !px-2">${createCustomSVGIcon('coin_stack', 13)}<span>+${q.reward}만</span></span>
              </div>
            </div>
          </div>
          <div class="shrink-0">
            ${claimed
              ? createNotebookArtworkSVG('stamp_complete', 48)
              : ready
                ? `<button type="button" data-claim-q="${q.id}" class="jelly-action-btn btn-gold-lip px-3.5 py-2">보상 수령</button>`
                : `<button type="button" data-goto-q="${q.id}" class="tactile-pill-btn tone-cream !px-3 !py-1.5">바로가기</button>`}
          </div>
        </div>
      `;
    }).join('');

    dom.notebookBody.querySelectorAll('[data-claim-q]').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        const qid = btn.getAttribute('data-claim-q');
        const q = QUEST_LIST.find((x) => x.id === qid);
        if (!q || state.claimedQuests.includes(qid) || !q.check(state)) return;
        state.claimedQuests.push(qid);
        addGold(q.reward, ev.clientX, ev.clientY);
        renderNotebookUnifiedBody();
        showToast(`퀘스트 달성 보상 +${q.reward}만 수령!`, 'gold');
        saveGameState();
      });
    });

    dom.notebookBody.querySelectorAll('[data-goto-q]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const q = QUEST_LIST.find((x) => x.id === btn.getAttribute('data-goto-q'));
        if (!q) return;
        dom.notebookModal?.classList.add('hidden');
        if (q.openGarage) openGarageModal();
        else if (q.focusShop) focusCameraOnShop(q.focusShop);
        else if (q.focusLot && q.focusSubRoom) focusCameraOnRoom(`${q.focusLot}_${q.focusSubRoom}`);
        else if (q.openTab) openNotebookModal(q.openTab);
      });
    });
  } else if (activeNotebookTab === 'tenants') {
    const b = state.buildings.lot_main;
    dom.notebookBody.innerHTML = b.rooms.map((rm) => {
      const meta = ROOM_TYPE_META[rm.layoutType] || ROOM_TYPE_META.studio;
      const hDef = rm.household ? HOUSEHOLD_TYPES[rm.household.type] : null;
      return `
        <div class="diary-card flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0 flex-1">
            ${rm.household
              ? createHouseholdAvatarSVG(rm.household.type, 48)
              : `<div class="w-12 h-12 rounded-2xl bg-[#FFFDF7] border-2 border-[#E8CCB0] flex items-center justify-center shrink-0">${createCustomSVGIcon(rm.unlocked ? meta.svgIcon : 'padlock_gold', 26)}</div>`}
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="hotel-num-tag">${rm.name}호</span>
                <span class="kw-chip tone-${meta.tone}">${createCustomSVGIcon(meta.svgIcon, 13)}<span>${meta.badge}</span></span>
                ${hDef ? `<span class="role-accent-badge" style="background:${hDef.accentHex};">${hDef.label}</span>` : ''}
              </div>
              <div class="font-body text-[12px] font-semibold text-[#69544C] mt-1 break-keep leading-snug">
                ${!rm.unlocked
                  ? `미개방 호실 · <span class="whitespace-nowrap">개방 비용 ${rm.unlockCost}만</span>`
                  : rm.household
                    ? `${rm.household.familyName} · <span class="whitespace-nowrap">주기 월세 ${calcRoomEffectiveRent(b, rm)}만</span> · <span class="whitespace-nowrap">행복도 ${Math.round(rm.household.happiness || 92)}%</span>`
                    : `공실 대기 중 · <span class="whitespace-nowrap">예상 월세 ${calcRoomEffectiveRent(b, rm)}만</span>`}
              </div>
            </div>
          </div>
          <button type="button" data-nb-room="${rm.id}" class="jelly-action-btn btn-mint-lip px-3.5 py-2 shrink-0">룸 뷰 이동</button>
        </div>
      `;
    }).join('');

    dom.notebookBody.querySelectorAll('[data-nb-room]').forEach((btn) => {
      btn.addEventListener('click', () => {
        dom.notebookModal?.classList.add('hidden');
        focusCameraOnRoom(btn.getAttribute('data-nb-room'));
      });
    });
  } else if (activeNotebookTab === 'manager') {
    // 3섹션 구성으로 빈 공간 없이 꽉 찬 VIP 지배인 관제 센터!
    const b = state.buildings.lot_main;
    const isHired = !!b.manager.hired;
    const floorVal = b.manager.minRentFloor || 80;
    const netCycle = calcCycleNetIncome();

    dom.notebookBody.innerHTML = `
      <div class="diary-card space-y-3">
        <div class="flex items-center gap-3.5">
          ${createHouseholdAvatarSVG('manager', 58)}
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-title text-[16px] text-[#3A2E2B]">1층 전담 총괄 지배인</span>
              <span class="kw-chip ${isHired ? 'tone-mint' : 'tone-coral'}">${isHired ? '정식 근무중' : '미채용 대기'}</span>
            </div>
            <div class="font-body text-[12px] font-semibold text-[#69544C] mt-1">
              전 호실 월세 자동 수금 · 24시 청결 점검 · 입주민 민원 즉시 케어
            </div>
          </div>
        </div>
        ${isHired ? `
          <div class="kw-chip tone-mint w-full justify-center py-2">
            ${createCustomSVGIcon('cash_arrow_up', 16)}
            <span>1층 로비 상주 근무 중 · 모든 월세가 즉시 자산에 적립됩니다!</span>
          </div>
        ` : `
          <button type="button" id="btn-hire-mgr" class="jelly-action-btn btn-coral-lip w-full py-2.5">
            ${createCustomSVGIcon('manager_cap', 18)}
            <span>총괄 지배인 정식 선임 (계약금 ${GAME_BALANCE.managerHireFee}만)</span>
          </button>
        `}
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div class="diary-subcard space-y-1.5">
          <div class="flex items-center gap-1.5 font-title text-[13px] text-[#3A2E2B]">
            ${createCustomSVGIcon('coin_stack', 18)}
            <span>무인 월세 수금</span>
          </div>
          <div class="font-body text-[11.5px] text-[#69544C]">클릭 없이 100% 즉시 회수</div>
          <div class="candy-gauge-track"><div class="candy-gauge-fill candy-gold" style="width:${isHired ? 100 : 25}%"></div></div>
        </div>
        <div class="diary-subcard space-y-1.5">
          <div class="flex items-center gap-1.5 font-title text-[13px] text-[#3A2E2B]">
            ${createCustomSVGIcon('broom_clean', 18)}
            <span>24시 청결 패트롤</span>
          </div>
          <div class="font-body text-[11.5px] text-[#69544C]">공용 복도 및 상가 위생 관리</div>
          <div class="candy-gauge-track"><div class="candy-gauge-fill candy-mint" style="width:${isHired ? 100 : 25}%"></div></div>
        </div>
        <div class="diary-subcard space-y-1.5">
          <div class="flex items-center gap-1.5 font-title text-[13px] text-[#3A2E2B]">
            ${createCustomSVGIcon('soundproof_hammer', 18)}
            <span>세대 분쟁 케어</span>
          </div>
          <div class="font-body text-[11.5px] text-[#69544C]">행복도 하락 방지 및 중재</div>
          <div class="candy-gauge-track"><div class="candy-gauge-fill candy-coral" style="width:${isHired ? 100 : 25}%"></div></div>
        </div>
      </div>

      <div class="diary-card space-y-2.5">
        <div class="flex items-center justify-between">
          <span class="font-title text-[14px] text-[#3A2E2B]">지배인 임대 심사 기준 설정</span>
          <span id="mgr-floor-val" class="kw-chip tone-gold">희망 월세 ${floorVal}만+</span>
        </div>
        <input id="mgr-rent-slider" type="range" min="60" max="260" step="10" value="${floorVal}" class="golden-coin-range" />
        <div class="flex items-center justify-between font-body text-[11.5px] font-semibold text-[#69544C] pt-0.5">
          <span>현재 타운 통합 주기 순익</span>
          <span class="font-title text-[14px] text-[#15803D]">+${netCycle.toLocaleString()}만 / 주기</span>
        </div>
      </div>
    `;

    dom.notebookBody.querySelector('#btn-hire-mgr')?.addEventListener('click', () => {
      if (!spendGold(GAME_BALANCE.managerHireFee)) return;
      b.manager.hired = true;
      rebuildPublicInfraAndManager3D('lot_main');
      renderNotebookUnifiedBody();
      updateTopHUDTargets();
      showToast('총괄 지배인을 선임했습니다! 모든 월세를 자동 수금합니다!', 'mint');
      saveGameState();
    });

    const slider = dom.notebookBody.querySelector('#mgr-rent-slider');
    const lbl = dom.notebookBody.querySelector('#mgr-floor-val');
    slider?.addEventListener('input', () => {
      b.manager.minRentFloor = Number(slider.value);
      if (lbl) lbl.textContent = `희망 월세 ${b.manager.minRentFloor}만+`;
    });
  } else {
    const b = state.buildings.lot_main;
    const infraCards = Object.values(PUBLIC_INFRA_CATALOG).map((inf) => {
      const owned = !!b.infra[inf.key];
      return `
        <div class="diary-card flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            ${createNotebookArtworkSVG(inf.artKey, 46)}
            <div class="min-w-0">
              <div class="font-title text-[14px] text-[#3A2E2B]">${inf.name}</div>
              <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                <span class="kw-chip tone-mint">전 세대 월세 +${inf.rentBonusPct}%</span>
                <span class="font-body text-[11.5px] font-medium text-[#69544C]">${inf.desc || ''}</span>
              </div>
            </div>
          </div>
          ${owned
            ? `<span class="kw-chip tone-gold shrink-0">${createCustomSVGIcon('sparkle_star', 13)}<span>시공 완료</span></span>`
            : `<button type="button" data-buy-infra="${inf.key}" class="jelly-action-btn btn-gold-lip px-3.5 py-2 shrink-0">${createCustomSVGIcon('coin_stack', 15)}<span>${inf.cost}만 시공</span></button>`}
        </div>
      `;
    }).join('');

    const shopCards = STANDALONE_SHOPS_TEMPLATE.map((tpl) => {
      const st = state.standaloneShops?.[tpl.shopId];
      const { visitRev, cycleRev } = calcStandaloneShopStats(tpl.shopId);
      return `
        <div class="diary-card flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-12 h-12 rounded-2xl bg-[#FFFDF7] border-2 border-[#E8CCB0] flex items-center justify-center shrink-0">
              ${createCustomSVGIcon(tpl.svgIcon, 28)}
            </div>
            <div class="min-w-0">
              <div class="font-title text-[14px] text-[#3A2E2B]">${tpl.name} (${tpl.engTitle})</div>
              <div class="font-body text-[11.5px] font-semibold text-[#69544C] mt-0.5">
                ${st?.owned ? `직영 운영 중 · 방문 +${visitRev}만 · 주기 +${cycleRev}만` : `미인수 상가 · 직영 인수가 ${tpl.buyCost}만`}
              </div>
            </div>
          </div>
          <button type="button" data-goto-shop="${tpl.shopId}" class="jelly-action-btn btn-coral-lip px-3.5 py-2 shrink-0">상가 이동</button>
        </div>
      `;
    }).join('');

    dom.notebookBody.innerHTML = `<div class="space-y-2.5">${infraCards}${shopCards}</div>`;

    dom.notebookBody.querySelectorAll('[data-buy-infra]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-buy-infra');
        const inf = PUBLIC_INFRA_CATALOG[key];
        if (!inf || b.infra[key] || !spendGold(inf.cost)) return;
        b.infra[key] = true;
        rebuildPublicInfraAndManager3D('lot_main');
        updateTopHUDTargets();
        renderNotebookUnifiedBody();
        showToast(`[${inf.name}] 공용 인프라 시공 완료!`, 'mint');
        saveGameState();
      });
    });

    dom.notebookBody.querySelectorAll('[data-goto-shop]').forEach((btn) => {
      btn.addEventListener('click', () => {
        dom.notebookModal?.classList.add('hidden');
        focusCameraOnShop(btn.getAttribute('data-goto-shop'));
      });
    });
  }
}

// --------------------- 입주 세대 모집 모달 ---------------------
function openRecruitModal(room) {
  recruitRoomTarget = room;
  const meta = ROOM_TYPE_META[room.layoutType] || ROOM_TYPE_META.studio;
  if (dom.recRoomTitle) dom.recRoomTitle.textContent = `${room.name}호 · ${meta.badge}`;
  rollRecruitCandidates(room);
  renderRecruitCards();
  dom.recruitModal?.classList.remove('hidden');
}

function rollRecruitCandidates(room) {
  const keys = Object.keys(HOUSEHOLD_TYPES);
  const meta = ROOM_TYPE_META[room.layoutType] || ROOM_TYPE_META.studio;
  recruitCandidates = [];

  for (let i = 0; i < 3; i++) {
    const tKey = (i === 0 && meta.preferredBy.length > 0)
      ? meta.preferredBy[Math.floor(Math.random() * meta.preferredBy.length)]
      : keys[Math.floor(Math.random() * keys.length)];
    const hDef = HOUSEHOLD_TYPES[tKey];
    const fam = `${FAMILY_LAST_NAMES[Math.floor(Math.random() * FAMILY_LAST_NAMES.length)]}${GIVEN_NAMES[Math.floor(Math.random() * GIVEN_NAMES.length)]} 세대`;
    const budget = Math.round(hDef.minRent + Math.random() * (hDef.maxRent - hDef.minRent));
    recruitCandidates.push({ type: tKey, familyName: fam, maxBudget: budget });
  }
}

function renderRecruitCards() {
  if (!dom.recCardsGrid || !recruitRoomTarget) return;
  const meta = ROOM_TYPE_META[recruitRoomTarget.layoutType] || ROOM_TYPE_META.studio;

  dom.recCardsGrid.innerHTML = recruitCandidates.map((cand, idx) => {
    const hDef = HOUSEHOLD_TYPES[cand.type];
    const isMatch = meta.preferredBy.includes(cand.type);
    return `
      <div class="diary-card flex flex-col justify-between gap-2.5 ${isMatch ? '!border-[#38E54D] !border-2' : ''}">
        <div class="space-y-2">
          <div class="flex items-center gap-2.5">
            ${createHouseholdAvatarSVG(cand.type, 48)}
            <div class="min-w-0">
              <div class="font-title text-[14px] text-[#3A2E2B] truncate">${cand.familyName}</div>
              <span class="role-accent-badge mt-0.5" style="background:${hDef.accentHex};">${hDef.label}</span>
            </div>
          </div>
          ${isMatch ? `<div class="kw-chip tone-mint !text-[10.5px]">${createCustomSVGIcon('sparkle_star', 13)}<span>${meta.shortBadge} 선호 (+15% 월세)</span></div>` : ''}
          <div class="font-body text-[12px] font-semibold text-[#69544C]">예산 한도: <b class="text-[#3A2E2B]">${cand.maxBudget}만</b></div>
        </div>
        <button type="button" data-sign-cand="${idx}" class="jelly-action-btn btn-coral-lip w-full py-2">
          ${createCustomSVGIcon('contract_scroll', 16)}
          <span>입주 계약 체결</span>
        </button>
      </div>
    `;
  }).join('');

  dom.recCardsGrid.querySelectorAll('[data-sign-cand]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cand = recruitCandidates[Number(btn.getAttribute('data-sign-cand'))];
      if (!cand || !recruitRoomTarget) return;
      recruitRoomTarget.household = {
        type: cand.type,
        familyName: cand.familyName,
        maxBudget: cand.maxBudget,
        happiness: 95
      };
      recruitRoomTarget.rentTimer = 4.0;
      dom.recruitModal?.classList.add('hidden');
      syncBuildingResidents3D(recruitRoomTarget.lotId);
      updateTopHUDTargets();
      renderFocusedRoomInspector();
      showToast(`${recruitRoomTarget.name}호에 [${cand.familyName}] 입주 계약 완료!`, 'mint');
      saveGameState();
    });
  });
}

// --------------------- 외곽 신규 부지 매입 & 착공 모달 ---------------------
function openLotDevModal(lotId) {
  const lot = state.lots.find((l) => l.lotId === lotId);
  if (!lot || !dom.devCardsGrid) return;
  devModalLotId = lotId;
  if (dom.devLotBadge) dom.devLotBadge.textContent = lot.name;

  if (!lot.owned) {
    dom.devCardsGrid.innerHTML = `
      <div class="diary-card p-4 sm:col-span-2 text-center space-y-3">
        <div class="flex items-center justify-center gap-2 font-title text-[16.5px] text-[#3A2E2B]">
          ${createCustomSVGIcon('sprout_lot', 24)}
          <span>${lot.name} 토지 매입</span>
        </div>
        <div class="font-body text-[12.5px] font-medium text-[#69544C]">
          토지를 매입하면 태양광 발전소, 딸기 도시농장, 벚꽃 힐링공원, 럭키 팰리스를 착공할 수 있습니다.
        </div>
        <button type="button" id="btn-buy-lot-land" class="jelly-action-btn btn-gold-lip px-6 py-2.5">
          ${createCustomSVGIcon('coin_stack', 18)}
          <span>${lot.landPrice.toLocaleString()}만으로 토지 매입하기</span>
        </button>
      </div>
    `;
    dom.devCardsGrid.querySelector('#btn-buy-lot-land')?.addEventListener('click', () => {
      if (!spendGold(lot.landPrice)) return;
      lot.owned = true;
      ensureLotOverlayBadge(lot.lotId);
      openLotDevModal(lot.lotId);
      showToast(`[${lot.name}] 토지 매입 완료! 착공할 시설을 선택하세요!`, 'gold');
      saveGameState();
    });
  } else {
    const devKeys = ['solar_plant', 'urban_farm', 'sakura_park', 'bakery_cafe', 'mixed_2'];
    dom.devCardsGrid.innerHTML = devKeys.map((dk) => {
      const cat = DEVELOPMENT_CATALOG[dk];
      return `
        <div class="diary-card flex flex-col justify-between gap-2.5">
          <div class="flex items-center gap-3">
            ${createNotebookArtworkSVG(cat.artKey, 46)}
            <div>
              <div class="font-title text-[14px] text-[#3A2E2B]">${cat.name}</div>
              <span class="kw-chip tone-mint mt-1">타운 시너지 +${cat.rentSynergyPct}%</span>
            </div>
          </div>
          <button type="button" data-build-dev="${dk}" class="jelly-action-btn btn-coral-lip w-full py-2">
            ${createCustomSVGIcon('blueprint_hammer', 17)}
            <span>${cat.buildCost}만 착공</span>
          </button>
        </div>
      `;
    }).join('');

    dom.devCardsGrid.querySelectorAll('[data-build-dev]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const dk = btn.getAttribute('data-build-dev');
        const cat = DEVELOPMENT_CATALOG[dk];
        if (!cat || !spendGold(cat.buildCost)) return;
        lot.devType = dk;
        lot.title = cat.name;
        if (cat.isResidential) {
          state.buildings[lot.lotId] = makeResidentialBuilding(lot.lotId, dk, cat.name, false);
        } else {
          state.developments[lot.lotId] = { lotId: lot.lotId, devType: dk, timer: cat.cycleSec };
        }
        buildSingleLot3D(lot.lotId);
        dom.lotDevModal?.classList.add('hidden');
        updateTopHUDTargets();
        showToast(`[${lot.name}] ${cat.name} 완공!`, 'gold');
        saveGameState();
      });
    });
  }
  dom.lotDevModal?.classList.remove('hidden');
}

function openRenameModal(lotId) {
  const b = state.buildings[lotId];
  if (!b) return;
  renameTargetLotId = lotId;
  if (dom.inputBuildingName) dom.inputBuildingName.value = b.title;
  if (dom.renamePresetsRow) {
    dom.renamePresetsRow.innerHTML = BUILDING_NAME_PRESETS.map((p) => `
      <button type="button" data-preset-name="${p}" class="kw-chip tone-gold cursor-pointer">${p}</button>
    `).join('');
    dom.renamePresetsRow.querySelectorAll('[data-preset-name]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (dom.inputBuildingName) dom.inputBuildingName.value = btn.getAttribute('data-preset-name');
      });
    });
  }
  dom.renameModal?.classList.remove('hidden');
}

// =========================================================
// 16. 시뮬레이션 루프 · 롤링 넘버 HUD · 3D 오버레이 무겹침 투영
// =========================================================
function tickSimulationEconomyAndCrises(dt) {
  // 60초 갓물주 골든벨 피버 타임 카운트다운 및 상단 HUD 동기화
  if ((state.feverTimer || 0) > 0) {
    const prevActive = state.feverTimer > 0;
    state.feverTimer = Math.max(0, state.feverTimer - dt);
    if (dom.hudFeverPill) {
      dom.hudFeverPill.classList.toggle('hidden', state.feverTimer <= 0);
    }
    if (dom.hudFeverText && state.feverTimer > 0) {
      dom.hudFeverText.textContent = `갓물주 골든벨 피버 2.5배! ${Math.ceil(state.feverTimer)}초`;
    }
    if (prevActive && state.feverTimer <= 0) {
      updateTopHUDTargets();
      showToast('골든벨 피버 타임이 종료되었습니다!', 'sky');
    }
  } else if (dom.hudFeverPill && !dom.hudFeverPill.classList.contains('hidden')) {
    dom.hudFeverPill.classList.add('hidden');
  }

  state.gameMinutes += dt * 4.5;
  if (state.gameMinutes >= 24 * 60) {
    state.gameMinutes -= 24 * 60;
    state.day += 1;
  }
  if (dom.hudTimeText) {
    const hh = String(Math.floor(state.gameMinutes / 60)).padStart(2, '0');
    const mm = String(Math.floor(state.gameMinutes % 60)).padStart(2, '0');
    dom.hudTimeText.textContent = `${state.day}일차 ${hh}:${mm}`;
  }

  for (const b of Object.values(state.buildings)) {
    const lot = state.lots.find((l) => l.lotId === b.lotId);
    if (!lot) continue;

    b.shopCycleTimer = (b.shopCycleTimer || 9.0) - dt;
    if (b.shopCycleTimer <= 0) {
      b.shopCycleTimer = 11.0;
      const shopProfit = Math.round(((b.shopsLv.mart || 1) * 15 + (b.shopsLv.wash || 1) * 13) * getFeverMultiplier());
      if (b.manager.hired) {
        addGold(shopProfit);
      } else {
        spawnRentBubble(`bshop_${b.lotId}`, lot.x - 6.5, 4.6, lot.z + 4.8, shopProfit, '1층 상가');
      }
    }

    for (const rm of b.rooms) {
      if (!rm.unlocked || !rm.household) continue;
      rm.rentTimer = (rm.rentTimer || rm.cycleSec) - dt;
      if (rm.rentTimer <= 0) {
        rm.rentTimer = rm.cycleSec || 10.0;
        const rent = calcRoomEffectiveRent(b, rm);
        if (b.manager.hired) {
          addGold(rent);
          spawnJackpotText3D(lot.x + rm.lx, rm.ly + 2.2, lot.z + rm.lz + 3.5, `자동수금 +${rent}만`, 'manager_cap');
        } else {
          spawnRentBubble(`rent_${rm.id}`, lot.x + rm.lx, rm.ly + 2.2, lot.z + rm.lz + 4.1, rent, `${rm.name}호`);
        }
      }

      const hDef = HOUSEHOLD_TYPES[rm.household.type];
      if (hDef?.isHoarder && rm.trashStage < 3) {
        rm.trashProgress = (rm.trashProgress || 0) + dt;
        if (rm.trashProgress >= 26) {
          rm.trashProgress = 0;
          rm.trashStage += 1;
          rebuildRoom3D(b.lotId, rm);
          syncBuildingResidents3D(b.lotId);
        }
      }
    }
  }

  for (const dev of Object.values(state.developments)) {
    const cat = DEVELOPMENT_CATALOG[dev.devType];
    const lot = state.lots.find((l) => l.lotId === dev.lotId);
    if (!cat || !lot) continue;
    dev.timer -= dt;
    if (dev.timer <= 0) {
      dev.timer = cat.cycleSec || 10;
      spawnRentBubble(`dev_${dev.lotId}`, lot.x, 3.2, lot.z, cat.cycleProfit, cat.name);
    }
  }
}

function tickAnimationsAndEffects(dt, elapsed) {
  for (const jet of fountainJets) {
    const t = (elapsed * 1.15 + jet.phase) % 1.0;
    const startR = jet.tier === 'upper' ? 0.16 : 0.95;
    const endR = jet.tier === 'upper' ? 0.96 : 2.02;
    const startY = jet.tier === 'upper' ? 2.52 : 1.82;
    const endY = jet.tier === 'upper' ? 1.85 : 0.55;
    const peakBoost = jet.tier === 'upper' ? 0.85 : 0.65;

    const r = THREE.MathUtils.lerp(startR, endR, t);
    const y = THREE.MathUtils.lerp(startY, endY, t) + Math.sin(t * Math.PI) * peakBoost;
    jet.mesh.position.set(Math.cos(jet.angle) * r, y, Math.sin(jet.angle) * r);
    const s = 0.12 + Math.sin(t * Math.PI) * 0.1;
    jet.mesh.scale.setScalar(s);
  }

  for (const w of spinningWashers) w.rotation.z += dt * 3.8;
  for (const f of spinningFans) f.rotation.z += dt * 9.5;
  for (const c of cloudActors) {
    c.mesh.position.x += c.speed * dt;
    if (c.mesh.position.x > 64) c.mesh.position.x = -64;
  }
  for (const d of streamFloats) {
    d.mesh.position.z = d.baseZ + Math.sin(elapsed * 0.7 + d.phase) * 3.5;
    d.mesh.rotation.y = Math.sin(elapsed * 1.4 + d.phase) * 0.35;
  }

  for (let i = activeSquashes.length - 1; i >= 0; i--) {
    const sq = activeSquashes[i];
    sq.elapsed += dt;
    const t = Math.min(1, sq.elapsed / sq.duration);
    const wave = Math.sin(t * Math.PI * 2.5) * (1 - t) * 0.16 * sq.intensity;
    sq.obj.scale.set(
      sq.baseScale.x * (1 + wave),
      sq.baseScale.y * (1 - wave),
      sq.baseScale.z * (1 + wave)
    );
    if (t >= 1) {
      sq.obj.scale.copy(sq.baseScale);
      activeSquashes.splice(i, 1);
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
    p.vy -= 5.2 * dt;
    p.mesh.position.x += p.vx * dt;
    p.mesh.position.y += p.vy * dt;
    p.mesh.position.z += p.vz * dt;
    p.mesh.scale.multiplyScalar(0.97);
  }

  for (let i = shockwaveRings.length - 1; i >= 0; i--) {
    const r = shockwaveRings[i];
    r.elapsed += dt;
    const t = Math.min(1, r.elapsed / r.duration);
    r.mesh.scale.setScalar(1 + t * r.maxScale);
    r.mat.opacity = (1 - t) * 0.85;
    if (t >= 1) {
      scene.remove(r.mesh);
      shockwaveRings.splice(i, 1);
    }
  }

  for (const rb of rentBubbles) {
    if (rb.coin3D && !rb.magnetized) {
      rb.coin3D.rotation.y += dt * 2.8;
      rb.coin3D.position.y = rb.wy + Math.sin(elapsed * 3.5) * 0.16;
    }
  }

  if (!driveState.active && camTween.active) {
    const alpha = Math.min(1, dt * 7.2);
    camera.position.lerp(camTween.pos, alpha);
    controls.target.lerp(camTween.look, alpha);
    camera.zoom = THREE.MathUtils.lerp(camera.zoom, camTween.zoom, alpha);
    camera.updateProjectionMatrix();
    if (
      camera.position.distanceTo(camTween.pos) < 0.08 &&
      Math.abs(camera.zoom - camTween.zoom) < 0.01
    ) {
      camTween.active = false;
    }
  }

  // 상단 HUD 롤링 넘버 & 행복도 미니 게이지 실시간 동기화
  hudAnim.shownGold = THREE.MathUtils.lerp(hudAnim.shownGold, hudAnim.targetGold, Math.min(1, dt * 11));
  hudAnim.shownNet = THREE.MathUtils.lerp(hudAnim.shownNet, hudAnim.targetNet, Math.min(1, dt * 11));
  hudAnim.shownHappy = THREE.MathUtils.lerp(hudAnim.shownHappy, hudAnim.targetHappy, Math.min(1, dt * 9));

  if (dom.hudGold) dom.hudGold.textContent = Math.round(hudAnim.shownGold).toLocaleString();
  if (dom.hudNetIncome) dom.hudNetIncome.textContent = `+${Math.round(hudAnim.shownNet).toLocaleString()}만`;
  const happyRounded = Math.round(hudAnim.shownHappy);
  if (dom.hudHappiness) dom.hudHappiness.textContent = `${happyRounded}%`;
  if (dom.hudHappyBar) dom.hudHappyBar.style.width = `${happyRounded}%`;
}

function projectWorldToScreen(wx, wy, wz) {
  const activeCam = getActiveCamera();
  tempVec.set(wx, wy, wz);
  tempVec.project(activeCam);
  const visible = tempVec.z >= -1 && tempVec.z <= 1;
  return {
    x: (tempVec.x * 0.5 + 0.5) * window.innerWidth,
    y: (-tempVec.y * 0.5 + 0.5) * window.innerHeight,
    visible
  };
}

function ensureLotOverlayBadge(lotId) {
  if (!dom.lotsLayer) return;
  const lot = state.lots.find((l) => l.lotId === lotId);
  if (!lot || lot.lotId === 'lot_main') return;

  let el = lotOverlayEls[lotId];
  if (!el) {
    el = document.createElement('button');
    el.type = 'button';
    el.className = 'lot-for-sale-sign pointer-events-auto';
    el.addEventListener('click', () => openLotDevModal(lotId));
    dom.lotsLayer.appendChild(el);
    lotOverlayEls[lotId] = el;
  }

  if (!lot.owned) {
    el.innerHTML = `${createCustomSVGIcon('sprout_lot', 15)}<span>${lot.name} · ${lot.landPrice}만</span>`;
  } else if (!lot.devType) {
    el.innerHTML = `${createCustomSVGIcon('blueprint_hammer', 15)}<span>${lot.name} 착공</span>`;
  } else {
    el.innerHTML = `${createCustomSVGIcon('sparkle_star', 14)}<span>${lot.title}</span>`;
  }
}

function ensureShopOverlayBadge(shopId) {
  if (!dom.shopsLayer) return;
  const tpl = STANDALONE_SHOPS_TEMPLATE.find((s) => s.shopId === shopId);
  const st = state.standaloneShops?.[shopId];
  if (!tpl || !st) return;

  let el = shopOverlayEls[shopId];
  if (!el) {
    el = document.createElement('button');
    el.type = 'button';
    el.className = 'shop-float-badge pointer-events-auto';
    el.addEventListener('click', () => focusCameraOnShop(shopId));
    dom.shopsLayer.appendChild(el);
    shopOverlayEls[shopId] = el;
  }

  el.classList.toggle('owned-shop', !!st.owned);
  el.innerHTML = st.owned
    ? `${createCustomSVGIcon(tpl.svgIcon, 16)}<span>${tpl.name}</span><span class="text-[#15803D]">직영</span>`
    : `${createCustomSVGIcon(tpl.svgIcon, 16)}<span>${tpl.name}</span><span class="text-[#B45309]">인수 ${tpl.buyCost}만</span>`;
}

function isInTopHudSafeZone(x, y) {
  const hudW = window.innerWidth < 640 ? window.innerWidth : 540;
  const hudH = window.innerWidth < 640 ? 185 : 148;
  return x < hudW && y < hudH;
}

function isInBottomRightFabZone(x, y) {
  return x > window.innerWidth - 265 && y > window.innerHeight - 95;
}

function updateAllProjectedOverlays(dt) {
  const hideTownBadges = !!focusedRoomId || !!focusedShopId || fpState.active;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const visibleShopBoxes = [];

  // 0) 1인칭 상점 쇼케이스 상품 & 골든벨 플로팅 배지 투영
  for (const pin of fpState.labelPins) {
    if (!fpState.active || fpState.mode !== 'shop') {
      pin.el.style.display = 'none';
      continue;
    }
    const pt = projectWorldToScreen(pin.wx, pin.wy, pin.wz);
    if (!pt.visible || pt.x < 35 || pt.x > vw - 35 || pt.y < 95 || pt.y > vh - 145) {
      pin.el.style.display = 'none';
    } else {
      const halfW = Math.max(68, (pin.el.offsetWidth || 136) * 0.5 + 6);
      const cx = THREE.MathUtils.clamp(pt.x, halfW, Math.max(halfW, vw - halfW));
      pin.el.style.display = 'inline-flex';
      pin.el.style.left = `${cx}px`;
      pin.el.style.top = `${pt.y}px`;
    }
  }

  // 1) 단독 상가 플로팅 배지 투영 (뷰포트 좌우 클리핑 원천 방지 클램프)
  for (const tpl of STANDALONE_SHOPS_TEMPLATE) {
    const el = shopOverlayEls[tpl.shopId];
    if (!el) continue;
    if (hideTownBadges || driveState.active) {
      el.style.display = 'none';
      continue;
    }
    const pt = projectWorldToScreen(tpl.x, tpl.h + 2.05, tpl.z - 0.5);
    if (!pt.visible || isInTopHudSafeZone(pt.x, pt.y) || isInBottomRightFabZone(pt.x, pt.y) || pt.x < 18 || pt.x > vw - 18 || pt.y < 58 || pt.y > vh - 50) {
      el.style.display = 'none';
    } else {
      const halfW = Math.max(88, (el.offsetWidth || 176) * 0.5 + 8);
      const clampedX = THREE.MathUtils.clamp(pt.x, halfW, Math.max(halfW, vw - halfW));
      el.style.display = 'inline-flex';
      el.style.left = `${clampedX}px`;
      el.style.top = `${pt.y}px`;
      visibleShopBoxes.push({ x: clampedX, y: pt.y });
    }
  }

  // 2) 외곽 개발 부지 플로팅 배지 투영
  for (const lot of state.lots) {
    const el = lotOverlayEls[lot.lotId];
    if (!el) continue;
    if (hideTownBadges || driveState.active) {
      el.style.display = 'none';
      continue;
    }
    const pt = projectWorldToScreen(lot.x, 3.2, lot.z);
    if (!pt.visible || isInTopHudSafeZone(pt.x, pt.y) || isInBottomRightFabZone(pt.x, pt.y) || pt.x < 45 || pt.x > vw - 45 || pt.y < 68 || pt.y > vh - 64) {
      el.style.display = 'none';
    } else {
      const halfW = Math.max(82, (el.offsetWidth || 164) * 0.5 + 8);
      const clampedX = THREE.MathUtils.clamp(pt.x, halfW, Math.max(halfW, vw - halfW));
      el.style.display = 'inline-flex';
      el.style.left = `${clampedX}px`;
      el.style.top = `${pt.y}px`;
    }
  }

  // 3) 월세 & 상가 매출 코인 버블 투영 (상가 지붕 배지와 2D 충돌 시 자동 하단 이격)
  for (const rb of rentBubbles) {
    if (focusedRoomId || fpState.active) {
      rb.el.style.display = 'none';
      continue;
    }
    const pt = projectWorldToScreen(rb.wx, rb.wy + 0.65, rb.wz);
    if (!pt.visible || isInTopHudSafeZone(pt.x, pt.y) || isInBottomRightFabZone(pt.x, pt.y) || pt.x < 24 || pt.x > vw - 24 || pt.y < 52 || pt.y > vh - 48) {
      rb.el.style.display = 'none';
    } else {
      const halfW = Math.max(52, (rb.el.offsetWidth || 96) * 0.5 + 8);
      const clampedX = THREE.MathUtils.clamp(pt.x, halfW, Math.max(halfW, vw - halfW));
      let safeY = pt.y;
      for (const sh of visibleShopBoxes) {
        if (Math.abs(clampedX - sh.x) < 108 && Math.abs(safeY - sh.y) < 36) {
          safeY = sh.y + 38;
        }
      }
      rb.el.style.display = 'inline-flex';
      rb.el.style.left = `${clampedX}px`;
      rb.el.style.top = `${safeY}px`;
    }
  }

  // 4) 3D 만화 꼬리 말풍선 투영 (좌우 가장자리 잘림 원천 차단)
  for (const key of Object.keys(speechEls)) {
    const sp = speechEls[key];
    sp.timer -= dt;
    if (sp.timer <= 0) {
      sp.el.remove();
      delete speechEls[key];
      continue;
    }
    const pt = projectWorldToScreen(sp.wx, sp.wy, sp.wz);
    if (!pt.visible || isInTopHudSafeZone(pt.x, pt.y) || pt.x < 32 || pt.x > vw - 32 || pt.y < 52 || pt.y > vh - 52) {
      sp.el.style.display = 'none';
    } else {
      const halfW = Math.max(115, (sp.el.offsetWidth || 220) * 0.5 + 10);
      const clampedX = THREE.MathUtils.clamp(pt.x, halfW, Math.max(halfW, vw - halfW));
      sp.el.style.display = 'inline-flex';
      sp.el.style.left = `${clampedX}px`;
      sp.el.style.top = `${pt.y}px`;
    }
  }
}

// =========================================================
// 17. LocalStorage 자동 저장/불러오기 & Three.js 씬 초기화 & 입력 바인딩
// =========================================================
function saveGameState() {
  try {
    state.lastSavedAt = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    // 저장 공간 제한 무시
  }
}

function loadGameState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return;

    const fresh = createInitialState();
    state = {
      ...fresh,
      ...parsed,
      standaloneShops: {
        ...fresh.standaloneShops,
        ...(parsed.standaloneShops || {})
      },
      garage: {
        ownedCars: Array.isArray(parsed.garage?.ownedCars) && parsed.garage.ownedCars.length > 0
          ? parsed.garage.ownedCars
          : ['car_scooter'],
        currentCar: parsed.garage?.currentCar || 'car_scooter'
      },
      heldGifts: {
        left: parsed.heldGifts?.left || null,
        right: parsed.heldGifts?.right || null
      },
      feverTimer: Number(parsed.feverTimer) > 0 ? Number(parsed.feverTimer) : 0,
      goldenKeys: Number(parsed.goldenKeys) || 0,
      stats: { ...fresh.stats, ...(parsed.stats || {}) }
    };

    const elapsedSec = Math.min(3600, Math.max(0, (Date.now() - (parsed.lastSavedAt || Date.now())) / 1000));
    if (elapsedSec > 25) {
      const offlineGain = Math.min(600, Math.round((calcCycleNetIncome() * elapsedSec) / 45));
      if (offlineGain >= 10) {
        state.gold += offlineGain;
        setTimeout(() => showToast(`부재중 월세·상가 수익 +${offlineGain}만 정산 완료!`, 'gold'), 800);
      }
    }
  } catch (e) {
    state = createInitialState();
  }
}

function resetGameState() {
  localStorage.removeItem(SAVE_KEY);
  window.location.reload();
}

function initThreeScene() {
  scene = new THREE.Scene();
  scene.background = TEX.skyBackdrop;
  scene.fog = new THREE.FogExp2(0xE8F9FD, 0.0022);

  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  const frustum = 38;
  camera = new THREE.OrthographicCamera(
    (-frustum * aspect) / 2,
    (frustum * aspect) / 2,
    frustum / 2,
    -frustum / 2,
    -120,
    260
  );

  driveCamera = new THREE.PerspectiveCamera(58, aspect, 0.3, 320);
  fpCamera = new THREE.PerspectiveCamera(72, aspect, 0.12, 220);
  scene.add(fpCamera);
  initFirstPersonHands3D();

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  dom.webglContainer.innerHTML = '';
  dom.webglContainer.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minZoom = 0.38;
  controls.maxZoom = 4.2;
  controls.maxPolarAngle = Math.PI * 0.45;

  hemiLight = new THREE.HemisphereLight(0xFFFDF9, 0xF5D0B5, 1.18);
  scene.add(hemiLight);

  dirLight = new THREE.DirectionalLight(0xFFF8EB, 1.38);
  dirLight.position.set(36, 54, 38);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(2048, 2048);
  dirLight.shadow.camera.left = -52;
  dirLight.shadow.camera.right = 52;
  dirLight.shadow.camera.top = 52;
  dirLight.shadow.camera.bottom = -52;
  dirLight.shadow.camera.near = 4;
  dirLight.shadow.camera.far = 145;
  dirLight.shadow.bias = -0.0005;
  scene.add(dirLight);

  shadowFillLight = new THREE.DirectionalLight(0xBAE6FD, 0.42);
  shadowFillLight.position.set(-32, 24, -22);
  scene.add(shadowFillLight);

  studioKeyLight = new THREE.DirectionalLight(0xFFFDF8, 0.0);
  studioKeyLight.position.set(16, 26, 28);
  studioFillLight = new THREE.DirectionalLight(0xFFE4E6, 0.0);
  studioFillLight.position.set(-20, 16, 22);
  studioRimLight = new THREE.DirectionalLight(0xE0F2FE, 0.0);
  studioRimLight.position.set(0, 22, -18);
  scene.add(studioKeyLight, studioFillLight, studioRimLight);

  window.addEventListener('resize', () => {
    const asp = window.innerWidth / Math.max(1, window.innerHeight);
    camera.left = (-frustum * asp) / 2;
    camera.right = (frustum * asp) / 2;
    camera.top = frustum / 2;
    camera.bottom = -frustum / 2;
    camera.updateProjectionMatrix();

    driveCamera.aspect = asp;
    driveCamera.updateProjectionMatrix();

    if (fpCamera) {
      fpCamera.aspect = asp;
      fpCamera.updateProjectionMatrix();
    }

    renderer.setSize(window.innerWidth, window.innerHeight);

    if (!focusedRoomId && !focusedShopId && !driveState.active && !fpState.active) {
      setOverviewCamera(false);
    }
  });
}

function cacheDOMElements() {
  dom.webglContainer = document.getElementById('webgl-container');
  dom.isolationVignette = document.getElementById('room-isolation-vignette');
  dom.lotsLayer = document.getElementById('lots-overlay-layer');
  dom.shopsLayer = document.getElementById('shops-overlay-layer');
  dom.roomsLayer = document.getElementById('rooms-overlay-layer');
  dom.rentBubblesLayer = document.getElementById('rent-bubbles-layer');
  dom.speechLayer = document.getElementById('speech-overlay-layer');
  dom.jackpotLayer = document.getElementById('jackpot-overlay-layer');
  dom.flyingCoinLayer = document.getElementById('flying-coin-layer');

  dom.hudBadgeGold = document.getElementById('hud-badge-gold');
  dom.hudGold = document.getElementById('hud-gold');
  dom.hudNetIncome = document.getElementById('hud-net-income');
  dom.hudHappiness = document.getElementById('hud-happiness');
  dom.hudHappyBar = document.getElementById('hud-happy-bar');
  dom.hudTimeText = document.getElementById('hud-time-text');
  dom.xrayBadge = document.getElementById('hud-xray-badge');

  dom.hudTownControls = document.getElementById('hud-town-controls');
  dom.btnOverviewCam = document.getElementById('btn-overview-cam');
  dom.btnEnterDrive = document.getElementById('btn-enter-drive');
  dom.btnOpenGarage = document.getElementById('btn-open-garage');
  dom.btnQuickExpand = document.getElementById('btn-quick-expand');
  dom.btnCollectAll = document.getElementById('btn-collect-all');

  dom.hudFeverPill = document.getElementById('hud-fever-pill');
  dom.hudFeverText = document.getElementById('hud-fever-text');

  dom.roomFocusTopbar = document.getElementById('room-focus-topbar');
  dom.btnExitRoomView = document.getElementById('btn-exit-room-view');
  dom.btnRoomEnterFp = document.getElementById('btn-room-enter-fp');
  dom.roomSwitcherChips = document.getElementById('room-switcher-chips');

  dom.shopFocusTopbar = document.getElementById('shop-focus-topbar');
  dom.btnExitShopView = document.getElementById('btn-exit-shop-view');
  dom.btnShopEnterFp = document.getElementById('btn-shop-enter-fp');
  dom.shopSwitcherChips = document.getElementById('shop-switcher-chips');

  dom.driveFocusTopbar = document.getElementById('drive-focus-topbar');
  dom.btnExitDriveMode = document.getElementById('btn-exit-drive-mode');
  dom.btnToggleCockpit = document.getElementById('btn-toggle-cockpit');
  dom.btnDriveStepOut = document.getElementById('btn-drive-step-out');
  dom.driveCarBadge = document.getElementById('drive-car-badge');
  dom.driveLootBadge = document.getElementById('drive-loot-badge');

  dom.fpFocusTopbar = document.getElementById('fp-focus-topbar');
  dom.btnExitFpMode = document.getElementById('btn-exit-fp-mode');
  dom.btnFpSwitchDest = document.getElementById('btn-fp-switch-dest');

  dom.cockpitOverlay = document.getElementById('cockpit-overlay');
  dom.driveProximityBar = document.getElementById('drive-proximity-bar');
  dom.fpModeHud = document.getElementById('fp-mode-hud');
  dom.fpVisitModal = document.getElementById('fp-visit-modal');

  dom.roomFocusPanel = document.getElementById('room-focus-panel');
  dom.rfRoomNum = document.getElementById('rf-room-num');
  dom.rfTypeBadge = document.getElementById('rf-type-badge');
  dom.rfBtnRename = document.getElementById('rf-btn-rename');
  dom.rfTierBadge = document.getElementById('rf-tier-badge');
  dom.btnToggleRfBody = document.getElementById('btn-toggle-rf-body');
  dom.btnCloseRoomFocus = document.getElementById('btn-close-room-focus');
  dom.rfBody = document.getElementById('rf-body');

  dom.shopFocusPanel = document.getElementById('shop-focus-panel');
  dom.sfTitle = document.getElementById('sf-title');
  dom.sfOwnerBadge = document.getElementById('sf-owner-badge');
  dom.btnCloseShopFocus = document.getElementById('btn-close-shop-focus');
  dom.sfBody = document.getElementById('sf-body');

  dom.furnitureCatalogSheet = document.getElementById('furniture-catalog-sheet');
  dom.fcatSheetTitle = document.getElementById('fcat-sheet-title');
  dom.fcatRoomBadge = document.getElementById('fcat-room-badge');
  dom.fcatBonusBadge = document.getElementById('fcat-bonus-badge');
  dom.btnToggleCatalog = document.getElementById('btn-toggle-catalog');
  dom.fcatToggleLabel = document.getElementById('fcat-toggle-label');
  dom.fcatCollapsibleBody = document.getElementById('fcat-collapsible-body');
  dom.fcatTabsRow = document.getElementById('fcat-tabs-row');
  dom.fcatItemsGrid = document.getElementById('fcat-items-grid');

  dom.driveModeHud = document.getElementById('drive-mode-hud');
  dom.btnSteerLeft = document.getElementById('btn-steer-left');
  dom.btnSteerRight = document.getElementById('btn-steer-right');
  dom.btnToggleCruise = document.getElementById('btn-toggle-cruise');
  dom.btnCarHorn = document.getElementById('btn-car-horn');
  dom.btnDriveGarage = document.getElementById('btn-drive-garage');
  dom.btnBrakePedal = document.getElementById('btn-brake-pedal');
  dom.btnGasPedal = document.getElementById('btn-gas-pedal');

  dom.bottomTownBar = document.getElementById('bottom-town-bar');
  dom.btnZoomIn = document.getElementById('btn-zoom-in');
  dom.btnZoomOut = document.getElementById('btn-zoom-out');
  dom.btnCamRotate = document.getElementById('btn-cam-rotate');
  dom.btnResetSave = document.getElementById('btn-reset-save');
  dom.fabNotebook = document.getElementById('fab-notebook');
  dom.fabRedDot = document.getElementById('fab-red-dot');

  dom.garageModal = document.getElementById('garage-modal');
  dom.btnCloseGarage = document.getElementById('btn-close-garage');
  dom.garageCardsGrid = document.getElementById('garage-cards-grid');

  dom.notebookModal = document.getElementById('notebook-modal');
  dom.modalQuestSummary = document.getElementById('modal-quest-summary');
  dom.btnCloseNotebook = document.getElementById('btn-close-notebook');
  dom.tabDotQuests = document.getElementById('tab-dot-quests');
  dom.notebookBody = document.getElementById('notebook-unified-body');

  dom.lotDevModal = document.getElementById('lot-dev-modal');
  dom.devLotBadge = document.getElementById('dev-lot-badge');
  dom.btnCloseDevModal = document.getElementById('btn-close-dev-modal');
  dom.devCardsGrid = document.getElementById('dev-cards-grid');

  dom.recruitModal = document.getElementById('recruit-modal');
  dom.recRoomTitle = document.getElementById('rec-room-title');
  dom.btnRefreshRec = document.getElementById('btn-refresh-rec');
  dom.btnCloseRecruit = document.getElementById('btn-close-recruit');
  dom.recCardsGrid = document.getElementById('rec-cards-grid');

  dom.renameModal = document.getElementById('rename-building-modal');
  dom.btnCloseRename = document.getElementById('btn-close-rename');
  dom.inputBuildingName = document.getElementById('input-building-name');
  dom.renamePresetsRow = document.getElementById('rename-presets-row');
  dom.btnCancelRename = document.getElementById('btn-cancel-rename');
  dom.btnConfirmRename = document.getElementById('btn-confirm-rename');

  dom.evictionOverlay = document.getElementById('eviction-stamp-overlay');
  dom.toastContainer = document.getElementById('toast-container');

  // 100% 커스텀 다중 레이어 SVG 일러스트 아이콘 슬롯 주입
  const setSvg = (id, ico, sz) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = createCustomSVGIcon(ico, sz);
  };
  setSvg('hud-ico-gold', 'coin_stack', 28);
  setSvg('hud-ico-yield', 'cash_arrow_up', 28);
  setSvg('hud-ico-happy', 'sparkle_heart_gauge', 28);

  setSvg('hud-ico-overview', 'target_aim', 17);
  setSvg('hud-ico-drive', 'steering_supercar', 19);
  setSvg('hud-ico-garage', 'garage_key', 17);
  setSvg('hud-ico-expand', 'blueprint_hammer', 17);
  setSvg('hud-ico-collect', 'coin_stack', 17);

  setSvg('ico-exit-room', 'back_return', 17);
  setSvg('ico-exit-shop', 'back_return', 17);
  setSvg('ico-exit-drive', 'back_return', 17);
  setSvg('ico-rotate-hint', 'rotate_360', 16);

  setSvg('fcat-ico-bed', 'bed_ico', 17);
  setSvg('fcat-ico-sofa', 'sofa_ico', 17);
  setSvg('fcat-ico-appliance', 'tv_ico', 17);
  setSvg('fcat-ico-decor', 'palette_ico', 17);

  setSvg('ico-drive-cruise', 'cruise_loop', 18);
  setSvg('ico-drive-horn', 'horn_ico', 18);
  setSvg('ico-drive-garage', 'garage_key', 17);

  setSvg('fab-svg-slot', 'leather_diary_pen', 31);
  setSvg('garage-ico-header', 'steering_supercar', 26);
  setSvg('modal-ico-notebook', 'leather_diary_pen', 26);
  setSvg('tab-ico-quests', 'quest_trophy', 17);
  setSvg('tab-ico-tenants', 'studio_unit', 17);
  setSvg('tab-ico-manager', 'manager_cap', 17);
  setSvg('tab-ico-infra', 'blueprint_hammer', 17);
  setSvg('dev-ico-header', 'blueprint_hammer', 24);
  setSvg('rec-ico-header', 'contract_scroll', 24);
  setSvg('rename-ico-crown', 'crown_badge', 22);
  setSvg('rename-ico-pen', 'quill_edit', 17);
  setSvg('stamp-ico-slot', 'evict_stamp', 30);
  setSvg('hud-ico-fever', 'fever_flame', 18);
  setSvg('ico-room-fp', 'doorbell_visit', 17);
  setSvg('ico-shop-fp', 'walk_enter_door', 17);
  setSvg('ico-toggle-cockpit', 'cockpit_eye', 17);
  setSvg('ico-drive-step-out', 'walk_enter_door', 17);
  setSvg('ico-exit-fp', 'back_return', 17);
  setSvg('ico-fp-dest', 'doorbell_visit', 16);
  setSvg('ico-cockpit-radio', 'radio_note', 15);
  setSvg('ico-cockpit-roof', 'convertible_roof', 15);
  setSvg('ico-drive-thru', 'drive_thru_cup', 15);
  setSvg('ico-prox-enter', 'walk_enter_door', 15);
  setSvg('ico-golden-bell', 'golden_bell', 18);
  setSvg('ico-fp-visit-tenant', 'doorbell_visit', 18);
  setSvg('ico-fp-give-gift', 'gift_ribbon_box', 18);
  setSvg('ico-fp-other-room', 'studio_unit', 17);
  setSvg('banner-ico-bell', 'golden_bell', 24);
  setSvg('fp-modal-ico', 'walk_enter_door', 24);

  const wheelSlot = document.getElementById('cockpit-wheel-rotator');
  if (wheelSlot && typeof createCockpitSteeringWheelSVG === 'function') {
    wheelSlot.innerHTML = createCockpitSteeringWheelSVG();
  }
  const mirrorSlot = document.getElementById('cockpit-rearview-slot');
  if (mirrorSlot && typeof createCockpitRearviewSVG === 'function') {
    mirrorSlot.innerHTML = createCockpitRearviewSVG();
  }
  if (dom.rfBtnRename) dom.rfBtnRename.innerHTML = createCustomSVGIcon('quill_edit', 14);

  const binderEl = document.getElementById('notebook-binder-rings');
  if (binderEl) {
    binderEl.innerHTML = Array.from({ length: 6 }, () => createNotebookArtworkSVG('binder_ring', 26)).join('');
  }
}

function bindAllUIEvents() {
  let downX = 0;
  let downY = 0;
  renderer.domElement.addEventListener('pointerdown', (e) => {
    downX = e.clientX;
    downY = e.clientY;
    if (fpState.active) {
      fpState.draggingLook = true;
      fpState.lastPointerX = e.clientX;
      fpState.lastPointerY = e.clientY;
    }
  });

  window.addEventListener('pointermove', (e) => {
    if (!fpState.active || !fpState.draggingLook) return;
    const dx = e.clientX - fpState.lastPointerX;
    const dy = e.clientY - fpState.lastPointerY;
    fpState.lastPointerX = e.clientX;
    fpState.lastPointerY = e.clientY;
    fpState.yaw -= dx * 0.0045;
    fpState.pitch = THREE.MathUtils.clamp(fpState.pitch - dy * 0.0032, -0.42, 0.42);
  });

  window.addEventListener('pointerup', () => {
    fpState.draggingLook = false;
  });

  renderer.domElement.addEventListener('pointerup', (e) => {
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 7) return;
    if (driveState.active) return;

    const rect = renderer.domElement.getBoundingClientRect();
    pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointerNDC, getActiveCamera());

    if (fpState.active) {
      const fpHits = raycaster.intersectObjects(fpState.pickables, false);
      if (fpHits.length > 0) {
        const fud = fpHits[0].object.userData;
        if (fud.kind === 'fpShopItem' && fud.itemId) {
          buyFpShowcaseItem(fud.itemId, fud.visualMesh);
        } else if (fud.kind === 'fpGoldenBell') {
          ringShopGoldenBell();
        }
      }
      return;
    }

    const hits = raycaster.intersectObjects(pickableMeshes, false);
    if (hits.length === 0) return;

    const ud = hits[0].object.userData;
    if (ud.kind === 'room' && ud.roomId) {
      focusCameraOnRoom(ud.roomId);
    } else if (ud.kind === 'standaloneShop' && ud.shopId) {
      focusCameraOnShop(ud.shopId);
    } else if (ud.kind === 'vipCar') {
      enterDriveMode();
    } else if (ud.kind === 'lot' && ud.lotId) {
      openLotDevModal(ud.lotId);
    }
  });

  dom.btnOverviewCam?.addEventListener('click', () => setOverviewCamera(true));
  dom.btnEnterDrive?.addEventListener('click', () => enterDriveMode());
  dom.btnOpenGarage?.addEventListener('click', () => openGarageModal());
  dom.btnQuickExpand?.addEventListener('click', () => {
    const nextLot = state.lots.find((l) => l.lotId !== 'lot_main' && (!l.owned || !l.devType)) || state.lots[1];
    if (nextLot) openLotDevModal(nextLot.lotId);
  });
  dom.btnCollectAll?.addEventListener('click', () => collectAllRentBubbles());

  dom.btnExitRoomView?.addEventListener('click', () => exitRoomFocusMode());
  dom.btnCloseRoomFocus?.addEventListener('click', () => exitRoomFocusMode());
  dom.btnRoomEnterFp?.addEventListener('click', () => {
    if (focusedRoomId) enterFirstPersonRoom(focusedRoomId);
  });

  dom.btnExitShopView?.addEventListener('click', () => exitShopFocusMode());
  dom.btnCloseShopFocus?.addEventListener('click', () => exitShopFocusMode());
  dom.btnShopEnterFp?.addEventListener('click', () => {
    if (focusedShopId) enterFirstPersonShop(focusedShopId, false);
  });

  dom.btnExitDriveMode?.addEventListener('click', () => exitDriveMode());
  dom.btnToggleCockpit?.addEventListener('click', () => toggleCockpitView());
  dom.btnDriveStepOut?.addEventListener('click', () => openFpVisitModal('shops'));

  document.getElementById('btn-cockpit-radio')?.addEventListener('click', () => cycleCarRadioChannel());
  document.getElementById('btn-cockpit-roof')?.addEventListener('click', () => toggleConvertibleRoof());
  document.getElementById('btn-drive-thru-order')?.addEventListener('click', () => triggerDriveThruOrder());
  document.getElementById('btn-prox-enter-fp')?.addEventListener('click', () => {
    enterFirstPersonShop(driveState.nearestShopId || 'shop_bakery', true);
  });

  dom.btnExitFpMode?.addEventListener('click', () => exitFirstPersonMode());
  dom.btnFpSwitchDest?.addEventListener('click', () => {
    openFpVisitModal(fpState.mode === 'shop' ? 'rooms' : 'shops');
  });
  document.getElementById('btn-ring-golden-bell')?.addEventListener('click', () => ringShopGoldenBell());
  document.getElementById('btn-fp-visit-tenant')?.addEventListener('click', () => openFpVisitModal('rooms'));
  document.getElementById('btn-fp-give-gift')?.addEventListener('click', () => giveHousewarmingGiftAction());
  document.getElementById('btn-fp-other-room')?.addEventListener('click', () => openFpVisitModal('rooms'));

  document.getElementById('btn-close-fp-modal')?.addEventListener('click', () => dom.fpVisitModal?.classList.add('hidden'));
  document.getElementById('fp-tab-shops')?.addEventListener('click', () => {
    fpState.modalTab = 'shops';
    renderFpVisitModalCards();
  });
  document.getElementById('fp-tab-rooms')?.addEventListener('click', () => {
    fpState.modalTab = 'rooms';
    renderFpVisitModalCards();
  });

  const bindFpHoldBtn = (id, keyName) => {
    const el = document.getElementById(id);
    if (!el) return;
    const setVal = (v) => {
      fpState.keys[keyName] = v;
      el.classList.toggle('pressed', v);
    };
    el.addEventListener('pointerdown', (ev) => { ev.preventDefault(); setVal(true); });
    el.addEventListener('pointerup', () => setVal(false));
    el.addEventListener('pointerleave', () => setVal(false));
    el.addEventListener('pointercancel', () => setVal(false));
  };
  bindFpHoldBtn('btn-fp-left', 'left');
  bindFpHoldBtn('btn-fp-right', 'right');
  bindFpHoldBtn('btn-fp-fwd', 'forward');
  bindFpHoldBtn('btn-fp-back', 'backward');

  dom.rfBtnRename?.addEventListener('click', () => {
    const rm = findRoomById(focusedRoomId);
    if (rm) openRenameModal(rm.lotId);
  });

  dom.btnToggleRfBody?.addEventListener('click', () => {
    isRfBodyCollapsed = !isRfBodyCollapsed;
    dom.rfBody?.classList.toggle('hidden', isRfBodyCollapsed);
    dom.btnToggleRfBody.innerHTML = isRfBodyCollapsed
      ? '<svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M5 3L9 7L5 11" stroke="#3A2E2B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      : '<svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M3 5L7 9L11 5" stroke="#3A2E2B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  });

  dom.btnToggleCatalog?.addEventListener('click', () => {
    isCatalogCollapsed = !isCatalogCollapsed;
    dom.fcatCollapsibleBody?.classList.toggle('hidden', isCatalogCollapsed);
    if (dom.fcatToggleLabel) {
      dom.fcatToggleLabel.textContent = isCatalogCollapsed ? '상점 열기' : '접기';
    }
  });

  document.querySelectorAll('[data-fcat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeFurnitureCategory = btn.getAttribute('data-fcat');
      renderFurnitureCatalogSheet();
    });
  });

  const bindHoldPedal = (el, keyName) => {
    if (!el) return;
    const setKey = (val) => {
      driveState.keys[keyName] = val;
      el.classList.toggle('pressed', val);
      if (val) {
        driveState.autoCruise = false;
        syncDriveTopBadges();
      }
    };
    el.addEventListener('pointerdown', (ev) => { ev.preventDefault(); setKey(true); });
    el.addEventListener('pointerup', () => setKey(false));
    el.addEventListener('pointerleave', () => setKey(false));
    el.addEventListener('pointercancel', () => setKey(false));
  };
  bindHoldPedal(dom.btnSteerLeft, 'left');
  bindHoldPedal(dom.btnSteerRight, 'right');
  bindHoldPedal(dom.btnGasPedal, 'forward');
  bindHoldPedal(dom.btnBrakePedal, 'backward');

  dom.btnToggleCruise?.addEventListener('click', () => {
    driveState.autoCruise = !driveState.autoCruise;
    syncDriveTopBadges();
  });
  dom.btnCarHorn?.addEventListener('click', () => triggerCarHorn());
  dom.btnDriveGarage?.addEventListener('click', () => openGarageModal());

  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.key === 'Escape') {
      if (fpState.active) exitFirstPersonMode();
      else if (driveState.active) exitDriveMode();
      else if (focusedRoomId) exitRoomFocusMode();
      else if (focusedShopId) exitShopFocusMode();
      return;
    }

    const k = e.key.toLowerCase();
    if (fpState.active) {
      if (k === 'w' || e.key === 'ArrowUp') fpState.keys.forward = true;
      else if (k === 's' || e.key === 'ArrowDown') fpState.keys.backward = true;
      else if (k === 'a' || e.key === 'ArrowLeft') fpState.keys.left = true;
      else if (k === 'd' || e.key === 'ArrowRight') fpState.keys.right = true;
      return;
    }

    if (!driveState.active) return;

    if (k === 'w' || e.key === 'ArrowUp') driveState.keys.forward = true;
    else if (k === 's' || e.key === 'ArrowDown') driveState.keys.backward = true;
    else if (k === 'a' || e.key === 'ArrowLeft') driveState.keys.left = true;
    else if (k === 'd' || e.key === 'ArrowRight') driveState.keys.right = true;
    else if (k === 'v' || k === 'c') toggleCockpitView();
    else if (k === ' ' || k === 'h') {
      e.preventDefault();
      triggerCarHorn();
    }
  });

  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'w' || e.key === 'ArrowUp') { driveState.keys.forward = false; fpState.keys.forward = false; }
    else if (k === 's' || e.key === 'ArrowDown') { driveState.keys.backward = false; fpState.keys.backward = false; }
    else if (k === 'a' || e.key === 'ArrowLeft') { driveState.keys.left = false; fpState.keys.left = false; }
    else if (k === 'd' || e.key === 'ArrowRight') { driveState.keys.right = false; fpState.keys.right = false; }
  });

  dom.btnZoomIn?.addEventListener('click', () => {
    camTween.active = false;
    camera.zoom = Math.min(3.8, camera.zoom * 1.24);
    camera.updateProjectionMatrix();
  });
  dom.btnZoomOut?.addEventListener('click', () => {
    camTween.active = false;
    camera.zoom = Math.max(0.42, camera.zoom / 1.24);
    camera.updateProjectionMatrix();
  });
  dom.btnCamRotate?.addEventListener('click', () => {
    camAzimuth = (camAzimuth + 1) % 4;
    setOverviewCamera(true);
  });
  dom.btnResetSave?.addEventListener('click', () => resetGameState());
  dom.fabNotebook?.addEventListener('click', () => openNotebookModal());

  dom.btnCloseGarage?.addEventListener('click', () => closeGarageModal());
  dom.btnCloseNotebook?.addEventListener('click', () => dom.notebookModal?.classList.add('hidden'));
  document.querySelectorAll('[data-ntab]').forEach((btn) => {
    btn.addEventListener('click', () => openNotebookModal(btn.getAttribute('data-ntab')));
  });

  dom.btnCloseDevModal?.addEventListener('click', () => dom.lotDevModal?.classList.add('hidden'));
  dom.btnCloseRecruit?.addEventListener('click', () => dom.recruitModal?.classList.add('hidden'));
  dom.btnRefreshRec?.addEventListener('click', () => {
    if (!recruitRoomTarget || !spendGold(10)) return;
    rollRecruitCandidates(recruitRoomTarget);
    renderRecruitCards();
  });

  dom.btnCloseRename?.addEventListener('click', () => dom.renameModal?.classList.add('hidden'));
  dom.btnCancelRename?.addEventListener('click', () => dom.renameModal?.classList.add('hidden'));
  dom.btnConfirmRename?.addEventListener('click', () => {
    const val = (dom.inputBuildingName?.value || '').trim();
    if (!val || !renameTargetLotId || !state.buildings[renameTargetLotId]) return;
    state.buildings[renameTargetLotId].title = val;
    refreshBuildingNameplates3D(renameTargetLotId);
    renderFocusedRoomInspector();
    dom.renameModal?.classList.add('hidden');
    showToast(`빌딩 현판이 [${val}](으)로 각인되었습니다!`, 'gold');
    saveGameState();
  });
}

// =========================================================
// 18. 부트스트랩 및 메인 애니메이션 루프
// =========================================================
window.addEventListener('DOMContentLoaded', () => {
  loadGameState();
  cacheDOMElements();
  initSharedResources();
  initThreeScene();

  buildCozyFloatingIsland();
  buildAllStandaloneShops3D();
  buildAllLots3D();
  seedInitialStreetVisitors();

  hudAnim.shownGold = state.gold;
  updateTopHUDTargets();
  setOverviewCamera(false);
  bindAllUIEvents();

  setInterval(() => saveGameState(), 3000);

  let prevTime = performance.now();
  function animateLoop(now) {
    requestAnimationFrame(animateLoop);
    const dt = Math.min(0.05, Math.max(0.001, (now - prevTime) / 1000));
    prevTime = now;
    const elapsed = now * 0.001;

    tickSimulationEconomyAndCrises(dt);
    tickBuildingResidentsAI(dt, elapsed);
    tickStreetOutingAndDiningAI(dt, elapsed);
    tickDriveMode(dt, elapsed);
    tickFirstPersonMode(dt, elapsed);
    tickAnimationsAndEffects(dt, elapsed);

    if (!driveState.active && !fpState.active) {
      controls.update();
    }
    updateXRayAndFocusHighlights(dt);
    renderer.render(scene, getActiveCamera());
    updateAllProjectedOverlays(dt);
  }

  requestAnimationFrame(animateLoop);
});
