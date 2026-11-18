// =========================================================
// 【갓물주 라이프 3D: 미니미 타운 — 전체화면 단독 룸 뷰 · 4종 대형 입체 평면도 · 가구 카탈로그 에디션】 (app.js)
// 1. [핵심 1] 방 클릭 시 화면 85% 밀착 클로즈업(Full-Screen Room Focus Mode) + 주변 아이솔레이션/스튜디오 조명 + 360° 회전 & 나가기 버튼
// 2. [핵심 2] 건물 스케일 대폭 확장 + 원룸(studio) / 투룸 아치가벽(tworoom) / 쓰리룸 펜트하우스(threeroom) / 복층 원목계단 로프트(loft)
// 3. [핵심 3] 하단 인테리어 가구 카탈로그 바텀시트 (침대 4종 · 소파 4종 · 가전 4종 · 벽지/바닥/복층계단 4종 실시간 3D 교체 & Poof 연출)
// 4. [핵심 4] 파스텔 스카이 블루(#AEE2FF~#FFFDF9) + 바닐라 크림(#FFFDF7) 다이어리 수첩 + 고대비 캐릭터·벽지 색감 분리
// =========================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const SAVE_KEY = 'god_landlord_grand_architect_2026_v7';

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
      household: null,
      rentTimer: 0,
      trashStage: 0,
      trashProgress: 0,
      evictionCountdown: null,
      activeConflict: null
    };

    // 102호 투룸 스위트에 초기 신혼부부 세대를 입주시켜 시작 직후 아치 가벽 통과 일상을 바로 감상 가능하게 구성
    if (withStarterTenant && slot.subId === '102') {
      rm.household = {
        type: 'newlywed',
        familyName: '박서연 세대',
        maxBudget: 215,
        happiness: 92
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
  syncRoomInteriorStats(room);
}

function createInitialState() {
  const lots = JSON.parse(JSON.stringify(INITIAL_ISLAND_LOTS));
  const buildings = {
    lot_main: makeResidentialBuilding('lot_main', 'mixed_1', '해피 미니미 타운 1차', true)
  };
  const developments = {};

  return {
    gold: 880,
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

let state = createInitialState();

// --------------------- Three.js 전역 변수 및 레지스트리 ---------------------
let scene;
let camera;
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

const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();
const tempVec = new THREE.Vector3();
const camDirVec = new THREE.Vector3();

const OVERVIEW_LOOK = new THREE.Vector3(-2.5, 7.6, -2.5);
const CAM_OFFSETS = [
  new THREE.Vector3(38, 30, 44),
  new THREE.Vector3(-38, 30, 44),
  new THREE.Vector3(-38, 30, -44),
  new THREE.Vector3(38, 30, -44)
];
let camAzimuth = 0;

const camTween = {
  active: false,
  pos: new THREE.Vector3(),
  look: new THREE.Vector3(),
  zoom: 0.85
};

let currentShellOpacity = 1.0;
let focusedRoomId = null;
let activeFurnitureCategory = 'bed';
let isCatalogCollapsed = false;
let isRfBodyCollapsed = false;

let hoveredLotId = null;
let hoveredRoomId = null;
let hoveredShopMesh = null;
let activeNotebookTab = 'quests';
let selectedSplitItemId = null;
let devModalLotId = null;
let recruitRoomTarget = null;
let recruitCandidates = [];
let renameTargetLotId = null;

const hudAnim = {
  shownGold: 880,
  targetGold: 880,
  shownNet: 0,
  targetNet: 0,
  shownHappy: 100,
  targetHappy: 100
};

// 3D 공유 캐시 및 액터 배열
const GEO = {};
const MAT = {};
const TEX = {};
const extrudeGeoCache = new Map();
const edgesGeoCache = new Map();
const domeGeoCache = new Map();

const lot3D = {};
const pickableMeshes = [];
const spinningWashers = [];
const spinningFans = [];
const activeBounces = [];
const activeSquashes = [];
const activeParticles = [];
const shockwaveRings = [];
const waterRipples = [];
const odorEmitters = {};
const facadeEmitters = [];
const residentActors = {};
const roomPetActors = {};
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
let careTimer = 7.0;

// DOM 오버레이 레지스트리
const lotOverlayEls = {};
const devActionPinEls = {};
const roomOverlayEls = {};
const crisisPinEls = {};
const speechEls = {};
const managerTagEls = {};
const dom = {};

// =========================================================
// 1. 클레이 곡면(createRoundedToyMesh) + 만화풍 코코아 윤곽선
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

// =========================================================
// 2. 고해상도 상가 간판 · 옥상 빌딩 스카이 사인 · 호실 플레이트 텍스처
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
    ctx.fillStyle = '#34D399';
    ctx.fillRect(0, 0, w, 24);
    ctx.fillStyle = '#FF6B8B';
    ctx.fillRect(0, 24, w, 16);
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(0, 40, w, 12);
    ctx.fillStyle = '#34D399';
    ctx.fillRect(0, h - 22, w, 22);
    ctx.restore();

    ctx.strokeStyle = '#5A463C';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.roundRect(6, 6, w - 12, h - 12, 34);
    ctx.stroke();

    const ox = 112;
    const oy = 126;
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#43342E';
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(ox, oy - 50);
    ctx.quadraticCurveTo(ox + 54, oy + 28, ox + 42, oy + 42);
    ctx.lineTo(ox - 42, oy + 42);
    ctx.quadraticCurveTo(ox - 54, oy + 28, ox, oy - 50);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#292524';
    ctx.beginPath();
    ctx.roundRect(ox - 20, oy + 12, 40, 30, 6);
    ctx.fill();
    ctx.fillStyle = '#FF8FA3';
    ctx.beginPath(); ctx.arc(ox - 20, oy + 2, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ox + 20, oy + 2, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#43342E';
    ctx.beginPath(); ctx.arc(ox - 11, oy - 6, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ox + 11, oy - 6, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.font = '56px "Cafe24Ssurround", "CookieRun-Regular"';
    ctx.strokeStyle = '#43342E';
    ctx.lineWidth = 13;
    ctx.strokeText('해피마트 24', w * 0.5, 108);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 6;
    ctx.strokeText('해피마트 24', w * 0.5, 108);
    ctx.fillStyle = '#FF5C7A';
    ctx.fillText('해피마트 24', w * 0.5, 108);

    ctx.font = '26px "CookieRun-Regular", "OmyuPretty"';
    ctx.fillStyle = '#047857';
    ctx.fillText('MINI MART 24 · 도시락 & 간식', w * 0.5, 162);

    ctx.fillStyle = '#FEF3C7';
    ctx.strokeStyle = '#43342E';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.roundRect(w - 168, 72, 128, 62, 16);
    ctx.fill();
    ctx.stroke();

    const bx = w - 150;
    [5, 3, 7, 2, 6, 4, 3, 6, 3].forEach((bw, idx) => {
      ctx.fillStyle = '#43342E';
      ctx.fillRect(bx + idx * 10.5, 84, bw, 28);
    });
    ctx.font = '18px "Cafe24Ssurround", "CookieRun-Regular"';
    ctx.fillStyle = '#B45309';
    ctx.fillText('OPEN 24H', w - 104, 154);
  } else if (shopType === 'wash') {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#7CC8FF');
    bgGrad.addColorStop(1, '#38A3F8');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.roundRect(6, 6, w - 12, h - 12, 38);
    ctx.fill();

    ctx.fillStyle = '#F8FDFF';
    ctx.beginPath();
    ctx.roundRect(24, 22, w - 48, h - 44, 32);
    ctx.fill();
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.strokeStyle = '#5A463C';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.roundRect(6, 6, w - 12, h - 12, 38);
    ctx.stroke();

    [
      [96, 95, 28, '#BAE6FD'],
      [136, 138, 18, '#E0F2FE'],
      [74, 145, 14, '#FEF08A'],
      [w - 102, 96, 26, '#BAE6FD'],
      [w - 140, 138, 17, '#FDE68A'],
      [w - 76, 144, 14, '#BAE6FD']
    ].forEach(([cx, cy, r, col]) => {
      ctx.fillStyle = col;
      ctx.strokeStyle = '#0284C7';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(cx - r * 0.32, cy - r * 0.32, r * 0.26, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.font = '56px "Cafe24Ssurround", "CookieRun-Regular"';
    ctx.strokeStyle = '#43342E';
    ctx.lineWidth = 13;
    ctx.strokeText('뽀송 워시', w * 0.5, 92);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 6;
    ctx.strokeText('뽀송 워시', w * 0.5, 92);
    ctx.fillStyle = '#0284C7';
    ctx.fillText('뽀송 워시', w * 0.5, 92);

    ctx.font = '27px "CookieRun-Regular", "OmyuPretty"';
    ctx.fillStyle = '#D97706';
    ctx.fillText('BUBBLE PONG · 24시 코인세탁', w * 0.5, 152);
  } else {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#9A582C');
    bgGrad.addColorStop(1, '#6F3B1B');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.roundRect(6, 6, w - 12, h - 12, 34);
    ctx.fill();

    ctx.fillStyle = '#FFF9EE';
    ctx.beginPath();
    ctx.roundRect(22, 20, w - 44, h - 40, 26);
    ctx.fill();
    ctx.strokeStyle = '#FBBF24';
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.strokeStyle = '#43342E';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.roundRect(6, 6, w - 12, h - 12, 34);
    ctx.stroke();

    ctx.fillStyle = '#F59E0B';
    ctx.strokeStyle = '#43342E';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.ellipse(105, 118, 38, 22, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FF8FA3';
    ctx.beginPath();
    ctx.roundRect(w - 135, 96, 54, 46, [6, 6, 22, 22]);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.font = '56px "Cafe24Ssurround", "CookieRun-Regular"';
    ctx.strokeStyle = '#43342E';
    ctx.lineWidth = 12;
    ctx.strokeText('달콤 다방', w * 0.5, 92);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 5;
    ctx.strokeText('달콤 다방', w * 0.5, 92);
    ctx.fillStyle = '#B45309';
    ctx.fillText('달콤 다방', w * 0.5, 92);

    ctx.font = '26px "CookieRun-Regular", "OmyuPretty"';
    ctx.fillStyle = '#78350F';
    ctx.fillText('SWEET CAFE · 수제 크루아상 & 라떼', w * 0.5, 152);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createBladeNeon24Texture() {
  return TextureGenerator.create((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createRadialGradient(w / 2, h / 2, 16, w / 2, h / 2, w * 0.46);
    g.addColorStop(0, '#FFFBEB');
    g.addColorStop(0.7, '#FF758F');
    g.addColorStop(1, '#E11D48');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w * 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#FDE047';
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.strokeStyle = '#43342E';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w * 0.47, 0, Math.PI * 2);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '74px "Cafe24Ssurround", "CookieRun-Regular"';
    ctx.strokeStyle = '#43342E';
    ctx.lineWidth = 12;
    ctx.strokeText('24H', w / 2, h * 0.46);
    ctx.fillStyle = '#FFFBEB';
    ctx.fillText('24H', w / 2, h * 0.46);

    ctx.font = '28px "CookieRun-Regular"';
    ctx.fillStyle = '#FDE047';
    ctx.fillText('MART', w / 2, h * 0.74);
  }, 1, 1, 256, 256);
}

function createAFrameMenuTexture() {
  return TextureGenerator.create((ctx, w, h) => {
    ctx.fillStyle = '#FFF8EB';
    ctx.beginPath();
    ctx.roundRect(8, 8, w - 16, h - 16, 20);
    ctx.fill();
    ctx.strokeStyle = '#5A463C';
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.fillStyle = '#FF8FA3';
    ctx.fillRect(42, 48, 48, 68);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(148, 48);
    ctx.lineTo(186, 114);
    ctx.lineTo(110, 114);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#43342E';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = '30px "Cafe24Ssurround", "CookieRun-Regular"';
    ctx.fillStyle = '#E11D48';
    ctx.fillText('1+1 행사중!', w / 2, 158);
  }, 1, 1, 220, 200);
}

function createBuildingSkySignTexture(buildingTitle) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#FFFBEB');
  bg.addColorStop(0.5, '#FEF3C7');
  bg.addColorStop(1, '#FDE68A');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(8, 8, w - 16, h - 16, 42);
  ctx.fill();

  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 10;
  ctx.stroke();

  ctx.strokeStyle = '#43342E';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(4, 4, w - 8, h - 8, 44);
  ctx.stroke();

  ctx.fillStyle = '#FF6B8B';
  ctx.beginPath(); ctx.arc(64, h / 2, 16, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(w - 64, h / 2, 16, 0, Math.PI * 2); ctx.fill();

  const fontSize = buildingTitle.length > 10 ? 50 : 58;
  ctx.font = `${fontSize}px "Cafe24Ssurround", "CookieRun-Regular"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 11;
  ctx.strokeText(buildingTitle, w / 2, h * 0.53);
  ctx.fillStyle = '#43342E';
  ctx.fillText(buildingTitle, w / 2, h * 0.53);

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
  g.addColorStop(0, '#FDE68A');
  g.addColorStop(0.5, '#F59E0B');
  g.addColorStop(1, '#B45309');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(6, 6, w - 12, h - 12, 24);
  ctx.fill();

  ctx.strokeStyle = '#4A3B32';
  ctx.lineWidth = 7;
  ctx.stroke();

  ctx.font = '38px "Cafe24Ssurround", "CookieRun-Regular"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFBEB';
  ctx.strokeStyle = '#43342E';
  ctx.lineWidth = 7;
  ctx.lineJoin = 'round';
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
  ctx.beginPath();
  ctx.roundRect(4, 4, w - 8, h - 8, 18);
  ctx.fill();

  ctx.strokeStyle = unlocked ? '#F6BD60' : '#D6CCC0';
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.font = '34px "Cafe24Ssurround", "CookieRun-Regular"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = unlocked ? '#FDE68A' : '#EFE9E2';
  const label = typeLabel ? `${numStr} · ${typeLabel}` : String(numStr);
  ctx.fillText(label, w / 2, h * 0.54);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// =========================================================
// 3. 기본 프로시저럴 텍스처 생성기 (TextureGenerator)
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

  static dashedFocusStrip(dashColor = '#10B981', subColor = '#FFFFFF') {
    return this.create((ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = dashColor;
      ctx.beginPath();
      ctx.roundRect(12, 8, 104, h - 16, 12);
      ctx.fill();
      ctx.fillStyle = subColor;
      ctx.beginPath();
      ctx.roundRect(140, 10, 96, h - 20, 10);
      ctx.fill();
    }, 6, 1, 256, 48);
  }

  static herringboneWood(style = 'oak') {
    const palettes = {
      maple: ['#FCE8D2', '#F5D9BA', '#ECCAA3', '#C99B70'],
      oak: ['#EFC292', '#E4B07A', '#D9A168', '#9E6637'],
      royal: ['#FFFDF7', '#FAF0E1', '#F3E4CE', '#D4AF72']
    };
    const [c1, c2, c3, lineCol] = palettes[style] || palettes.oak;
    return this.create((ctx, w, h) => {
      ctx.fillStyle = c1;
      ctx.fillRect(0, 0, w, h);
      const cols = [c1, c2, c3];
      for (let y = -48; y < h + 48; y += 22) {
        for (let x = -48; x < w + 48; x += 44) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = cols[Math.abs(Math.floor((x + y) / 22)) % 3];
          ctx.fillRect(0, 0, 44, 16);
          ctx.strokeStyle = lineCol;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(0, 0, 44, 16);
          ctx.restore();

          ctx.save();
          ctx.translate(x + 22, y + 11);
          ctx.rotate(-Math.PI / 4);
          ctx.fillStyle = cols[Math.abs(Math.floor((x - y) / 22) + 1) % 3];
          ctx.fillRect(0, 0, 44, 16);
          ctx.strokeStyle = lineCol;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(0, 0, 44, 16);
          ctx.restore();
        }
      }
    }, 2.8, 2.8, 256, 256);
  }

  static pastelStripeWallpaper(stripeA = '#C2DEC8', stripeB = '#B1D3B9', moldingHex = '#8DB898', wainscotHex = '#DFBE9B') {
    return this.create((ctx, w, h) => {
      const sw = 24;
      for (let x = 0; x < w; x += sw) {
        ctx.fillStyle = (x / sw) % 2 === 0 ? stripeA : stripeB;
        ctx.fillRect(x, 0, sw, h);
      }
      ctx.fillStyle = wainscotHex;
      ctx.fillRect(0, h * 0.68, w, h * 0.32);
      ctx.fillStyle = moldingHex;
      ctx.fillRect(0, h * 0.66, w, 6);
      ctx.strokeStyle = moldingHex;
      ctx.lineWidth = 3;
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
      [
        [0, 0, 38],
        [-30, 8, 28],
        [32, 8, 29],
        [-12, -14, 26],
        [15, -12, 25]
      ].forEach(([ox, oy, r]) => {
        ctx.beginPath();
        ctx.arc(cx + ox * s, cy + oy * s, r * s, 0, Math.PI * 2);
        ctx.fill();
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

  static creamCobblestone() {
    return this.create((ctx, w, h) => {
      ctx.fillStyle = '#DDD3C3';
      ctx.fillRect(0, 0, w, h);
      const stones = ['#EFE9DF', '#EAE2D6', '#E5DCCE', '#F2EDE4'];
      for (let r = 0; r < 6; r++) {
        const offset = (r % 2) * 22;
        for (let c = -1; c < 7; c++) {
          const sx = c * 44 + offset + 4;
          const sy = r * 42 + 4;
          ctx.fillStyle = stones[(r * 3 + c + 4) % stones.length];
          ctx.beginPath();
          ctx.roundRect(sx, sy, 36, 34, 11);
          ctx.fill();
          ctx.strokeStyle = '#C9BCAA';
          ctx.lineWidth = 1.8;
          ctx.stroke();
        }
      }
    }, 3, 1.4, 256, 256);
  }

  static podiumPaverTile() {
    return this.create((ctx, w, h) => {
      ctx.fillStyle = '#CFC3B4';
      ctx.fillRect(0, 0, w, h);
      const pavers = ['#F7F2EA', '#EFE7DC', '#E8DDD0'];
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          ctx.fillStyle = pavers[(r + c) % pavers.length];
          ctx.beginPath();
          ctx.roundRect(c * 64 + 3, r * 64 + 3, 58, 58, 8);
          ctx.fill();
          ctx.strokeStyle = '#B8A898';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }, 4, 2, 256, 256);
  }

  static pastelBrickTile(bgHex = '#FFFDF9', tones = ['#FFFDF9', '#FDEAE6', '#F28482'], mortarHex = '#E5C8BE') {
    return this.create((ctx, w, h) => {
      ctx.fillStyle = mortarHex;
      ctx.fillRect(0, 0, w, h);
      for (let r = 0; r < 8; r++) {
        const off = (r % 2) * 24;
        for (let c = -1; c < 6; c++) {
          ctx.fillStyle = tones[(r * 2 + c + 6) % tones.length];
          ctx.beginPath();
          ctx.roundRect(c * 48 + off + 2.5, r * 32 + 2.5, 43, 27, 6);
          ctx.fill();
        }
      }
    }, 4, 3, 256, 256);
  }

  static cloverMeadow() {
    return this.create((ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#D2E7D6');
      grad.addColorStop(1, '#C2DCC8');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 46; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#D8ECDC' : '#B6D2BD';
        ctx.beginPath();
        ctx.arc((i * 47) % w, (i * 73) % h, 4.5 + (i % 4), 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#FAF6EE' : '#F3DCE2';
        ctx.beginPath();
        ctx.arc((i * 67 + 20) % w, (i * 97 + 18) % h, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }, 6, 6, 256, 256);
  }

  static streamWater() {
    return this.create((ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#9ED8EC');
      g.addColorStop(1, '#73BEDA');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.62)';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      for (let i = 0; i < 10; i++) {
        const x = (i * 53) % (w - 40);
        const y = (i * 37) % h;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 18, y - 6, x + 36, y);
        ctx.stroke();
      }
    }, 3, 2, 256, 256);
  }

  static woodenSignEmblem() {
    return this.create((ctx, w, h) => {
      ctx.fillStyle = '#FFF8E3';
      ctx.beginPath();
      ctx.roundRect(6, 6, w - 12, h - 12, 24);
      ctx.fill();
      ctx.strokeStyle = '#4A3B32';
      ctx.lineWidth = 8;
      ctx.stroke();

      ctx.fillStyle = '#FFFDF9';
      ctx.strokeStyle = '#4A3B32';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.roundRect(w * 0.34, h * 0.44, w * 0.32, h * 0.38, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#E05A47';
      ctx.beginPath();
      ctx.moveTo(w * 0.27, h * 0.48);
      ctx.lineTo(w * 0.5, h * 0.2);
      ctx.lineTo(w * 0.73, h * 0.48);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      const cx = w * 0.76;
      const cy = h * 0.68;
      ctx.fillStyle = '#22C55E';
      [[-7, -7], [7, -7], [-7, 7], [7, 7]].forEach(([ox, oy]) => {
        ctx.beginPath();
        ctx.arc(cx + ox, cy + oy, 7.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }, 1, 1, 256, 160);
  }

  static softContactShadow() {
    return this.create((ctx, s) => {
      const g = ctx.createRadialGradient(s / 2, s / 2, s * 0.08, s / 2, s / 2, s * 0.48);
      g.addColorStop(0, 'rgba(65, 44, 32, 0.34)');
      g.addColorStop(0.65, 'rgba(75, 52, 38, 0.14)');
      g.addColorStop(1, 'rgba(75, 52, 38, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    }, 1, 1, 128, 128);
  }

  static buildingGroundAO() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 256);
    ctx.save();
    ctx.filter = 'blur(16px)';
    ctx.fillStyle = 'rgba(55, 38, 28, 0.46)';
    ctx.beginPath();
    ctx.roundRect(24, 24, 208, 208, 36);
    ctx.fill();
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
  TEX.cobble = TextureGenerator.creamCobblestone();
  TEX.podiumDeck = TextureGenerator.podiumPaverTile();

  TEX.brickWarm = TextureGenerator.pastelBrickTile('#FFFDF9', ['#FFFDF9', '#FCEEE9', '#F6C2BC', '#F28482'], '#DFBFB6');
  TEX.brickMint = TextureGenerator.pastelBrickTile('#FFFDF9', ['#FFFDF9', '#FEF6E4', '#F8DBA4', '#F6BD60'], '#DFC8A7');

  TEX.floor1 = TextureGenerator.herringboneWood('maple');
  TEX.floor2 = TextureGenerator.herringboneWood('oak');
  TEX.floor3 = TextureGenerator.herringboneWood('royal');

  // 따뜻한 파스텔 벽지 4종 (세이지 그린 / 웜 라벤더 / 버터 옐로우 / 피치 베이지)
  TEX.wallSage = TextureGenerator.pastelStripeWallpaper('#C2DEC8', '#B1D3B9', '#82AE8D', '#DFBE9B');
  TEX.wallLavender = TextureGenerator.pastelStripeWallpaper('#D8CCF0', '#C6B7E6', '#9D88CC', '#E2C4A4');
  TEX.wallButter = TextureGenerator.pastelStripeWallpaper('#F6DE9C', '#EECF82', '#C99E48', '#DFBE9B');
  TEX.wallPeach = TextureGenerator.pastelStripeWallpaper('#F4CCB6', '#EABAA0', '#C98C6E', '#E2C4A4');

  TEX.awningCoral = TextureGenerator.stripedAwning('#E05A47', '#FFFDF9');
  TEX.awningSky = TextureGenerator.stripedAwning('#0284C7', '#FFFDF9');
  TEX.awningBrown = TextureGenerator.stripedAwning('#6F3B1B', '#FFF8EB');
  TEX.awningMint = TextureGenerator.stripedAwning('#2EC4B6', '#FFFDF9');
  TEX.signEmblem = TextureGenerator.woodenSignEmblem();

  TEX.dashMint = TextureGenerator.dashedFocusStrip('#059669', '#FFFFFF');
  TEX.dashGold = TextureGenerator.dashedFocusStrip('#F59E0B', '#FFFFFF');

  TEX.martSign = createShopSignboardTexture('mart');
  TEX.washSign = createShopSignboardTexture('wash');
  TEX.cafeSign = createShopSignboardTexture('cafe');
  TEX.blade24 = createBladeNeon24Texture();
  TEX.aframeMenu = createAFrameMenuTexture();

  GEO.sphere = new THREE.SphereGeometry(0.5, 20, 16);
  GEO.cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 20);
  GEO.torus = new THREE.TorusGeometry(0.38, 0.13, 14, 24);
  GEO.quad = new THREE.PlaneGeometry(1, 1);
  GEO.coin = new THREE.CylinderGeometry(0.24, 0.24, 0.08, 18);
  GEO.coin.rotateX(Math.PI / 2);
  GEO.ring = new THREE.RingGeometry(0.32, 0.64, 28);

  MAT.toonEdge = new THREE.LineBasicMaterial({
    color: 0x4A3B32,
    transparent: true,
    opacity: 0.8
  });
  MAT.toonHull = new THREE.MeshBasicMaterial({
    color: 0x3A2820,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.88
  });
  MAT.walnutTrim = makeClayMat(0x4A3B32, { roughness: 0.48, emissiveIntensity: 0.06 });
  MAT.podiumStone = makeClayMat(0x6D5D53, { roughness: 0.68, emissiveIntensity: 0.05 });
  MAT.podiumDeck = makeClayMat(0xFFFFFF, { map: TEX.podiumDeck, roughness: 0.62, emissiveIntensity: 0.06 });
  MAT.buildingAO = new THREE.MeshBasicMaterial({ map: TEX.buildingAO, transparent: true, depthWrite: false });

  MAT.terracottaCoral = makeClayMat(0xF28482, { roughness: 0.45 });
  MAT.butterOak = makeClayMat(0xF6BD60, { roughness: 0.44 });
  MAT.roofBrickCoral = makeClayMat(0xE05A47, { roughness: 0.46 });
  MAT.roofRoyalNavy = makeClayMat(0x3D5A80, { roughness: 0.46, coolShadow: true });

  MAT.roomGridGold = makeClayMat(0xF6BD60, { emissive: 0xFFB703, emissiveIntensity: 0.26, roughness: 0.36 });
  MAT.roomGridCream = makeClayMat(0xFFFDF9, { roughness: 0.42 });
  MAT.neonYellow = makeClayMat(0xFDE047, { emissive: 0xFFB703, emissiveIntensity: 0.9, roughness: 0.18 });
  MAT.neonCoral = makeClayMat(0xFF6B8B, { emissive: 0xE05A47, emissiveIntensity: 0.78, roughness: 0.2 });

  MAT.dashBorderMint = new THREE.MeshBasicMaterial({ map: TEX.dashMint, transparent: true, opacity: 0.94 });
  MAT.dashBorderGold = new THREE.MeshBasicMaterial({ map: TEX.dashGold, transparent: true, opacity: 0.96 });
  animatedDashMaterials.push(MAT.dashBorderMint, MAT.dashBorderGold);

  MAT.shadow = new THREE.MeshBasicMaterial({ map: TEX.shadow, transparent: true, depthWrite: false });
  MAT.slab = makeClayMat(0xFFFDF9, { roughness: 0.48 });
  MAT.basePadCream = makeClayMat(0xF6EFE6, { roughness: 0.55 });
  MAT.basePadMint = makeClayMat(0xE6F4EC, { roughness: 0.55 });
  MAT.woodLight = makeClayMat(0xEBB986);
  MAT.woodWarm = makeClayMat(0xC6834B);
  MAT.woodDark = makeClayMat(0x6F4528);
  MAT.leatherCamel = makeClayMat(0x9A582C, { roughness: 0.34 });
  MAT.white = makeClayMat(0xFFFDF9, { roughness: 0.44 });
  MAT.cream = makeClayMat(0xFFF6EC);
  MAT.coral = makeClayMat(0xF28482, { roughness: 0.46 });
  MAT.redPost = makeClayMat(0xE05A47, { roughness: 0.44 });
  MAT.pinkSoft = makeClayMat(0xFFB8CA);
  MAT.canopyLace = new THREE.MeshStandardMaterial({
    color: 0xFFD6E4,
    emissive: 0xFFB3C6,
    emissiveIntensity: 0.22,
    transparent: true,
    opacity: 0.68,
    roughness: 0.35,
    side: THREE.DoubleSide
  });
  MAT.partitionGlass = new THREE.MeshStandardMaterial({
    color: 0xE0F2FE,
    emissive: 0xBAE6FD,
    emissiveIntensity: 0.25,
    transparent: true,
    opacity: 0.48,
    roughness: 0.14,
    metalness: 0.1,
    side: THREE.DoubleSide
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
  MAT.silver = makeClayMat(0xE2E8F0, { metalness: 0.2, roughness: 0.36, coolShadow: true });
  MAT.gold = makeClayMat(0xFFD43B, { metalness: 0.22, roughness: 0.3, emissive: 0xFFB703, emissiveIntensity: 0.32 });
  MAT.glass = new THREE.MeshStandardMaterial({
    color: 0xFFEBC2,
    emissive: 0xFFB703,
    emissiveIntensity: 0.36,
    transparent: true,
    opacity: 0.54,
    roughness: 0.14,
    metalness: 0.08
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
      TEX.blade24 = createBladeNeon24Texture();
      TEX.aframeMenu = createAFrameMenuTexture();

      signMaterialsToRefresh.forEach((entry) => {
        if (entry.kind === 'mart') entry.mat.map = TEX.martSign;
        else if (entry.kind === 'wash') entry.mat.map = TEX.washSign;
        else if (entry.kind === 'cafe') entry.mat.map = TEX.cafeSign;
        else if (entry.kind === 'blade24') entry.mat.map = TEX.blade24;
        else if (entry.kind === 'aframe') entry.mat.map = TEX.aframeMenu;
        else if (entry.kind === 'roomPlate') entry.mat.map = createRoomNumberPlateTexture(entry.numStr, entry.typeLabel, entry.unlocked);
        entry.mat.needsUpdate = true;
      });

      Object.keys(state.buildings).forEach((lid) => refreshBuildingNameplates3D(lid));
    });
  }
}

// =========================================================
// 4. 상가 어닝 · 네온 간판 · 마스코트 · 옥상 현판 · 아일랜드 조립
// =========================================================
function createScallopedAwning3D(width, awningTex, scallopMat) {
  const g = new THREE.Group();
  const canopy = createRoundedToyMesh(width, 0.32, 1.48, makeClayMat(0xFFFFFF, { map: awningTex, emissive: 0xFFB703, emissiveIntensity: 0.08 }), 0, 0, 0, 0.1);
  canopy.rotation.x = 0.26;
  g.add(canopy);

  const count = Math.max(6, Math.floor(width / 0.72));
  const step = width / count;
  for (let i = 0; i < count; i++) {
    const sx = -width * 0.5 + step * (i + 0.5);
    const flap = new THREE.Mesh(GEO.sphere, i % 2 === 0 ? scallopMat : MAT.white);
    flap.scale.set(step * 0.92, 0.38, 0.24);
    flap.position.set(sx, -0.22, 0.68);
    flap.castShadow = true;
    addToonHullOutline(flap, 1.06);
    g.add(flap);
  }
  return g;
}

function createBladeSign24H3D() {
  const g = new THREE.Group();
  g.add(createRoundedToyMesh(0.88, 0.12, 0.12, MAT.walnutTrim, 0.42, 0.26, 0, 0.03));
  g.add(createRoundedToyMesh(0.88, 0.12, 0.12, MAT.walnutTrim, 0.42, -0.26, 0, 0.03));

  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.22, 24), MAT.roofRoyalNavy);
  drum.rotation.x = Math.PI / 2;
  addToonEdgeOutline(drum, MAT.toonEdge, 30);
  g.add(drum);

  const neonRim = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.06, 12, 28), MAT.neonYellow);
  neonRim.position.z = 0.1;
  g.add(neonRim);

  const faceMat = makeClayMat(0xFFFFFF, { map: TEX.blade24, emissive: 0xFFB703, emissiveIntensity: 0.42, roughness: 0.22 });
  signMaterialsToRefresh.push({ mat: faceMat, kind: 'blade24' });

  const frontFace = new THREE.Mesh(new THREE.CircleGeometry(0.62, 24), faceMat);
  frontFace.position.z = 0.12;
  const backFace = new THREE.Mesh(new THREE.CircleGeometry(0.62, 24), faceMat);
  backFace.rotation.y = Math.PI;
  backFace.position.z = -0.12;
  g.add(frontFace, backFace);

  return g;
}

function createAFrameStand3D() {
  const g = new THREE.Group();
  const boardA = createRoundedToyMesh(0.82, 0.98, 0.08, MAT.walnutTrim, 0, 0.48, 0.14, 0.08);
  boardA.rotation.x = -0.22;
  const boardB = createRoundedToyMesh(0.82, 0.98, 0.08, MAT.walnutTrim, 0, 0.48, -0.14, 0.08);
  boardB.rotation.x = 0.22;

  const menuMat = makeClayMat(0xFFFFFF, { map: TEX.aframeMenu, roughness: 0.38 });
  signMaterialsToRefresh.push({ mat: menuMat, kind: 'aframe' });
  const menuFace = new THREE.Mesh(GEO.quad, menuMat);
  menuFace.scale.set(0.66, 0.74, 1);
  menuFace.position.set(0, 0.5, 0.2);
  menuFace.rotation.x = -0.22;

  g.add(boardA, boardB, menuFace);
  return g;
}

function createWasherMascot3D(lotX, localX, localY, localZ, lotZ) {
  const g = new THREE.Group();
  const body = createRoundedToyMesh(1.08, 1.2, 0.68, MAT.white, 0, 0, 0, 0.18);
  const topBar = createRoundedToyMesh(1.1, 0.26, 0.7, MAT.roofRoyalNavy, 0, 0.48, 0, 0.1);
  const neonRing = new THREE.Mesh(GEO.torus, MAT.neonYellow);
  neonRing.scale.setScalar(0.9);
  neonRing.position.set(0, -0.06, 0.35);
  const glassDoor = new THREE.Mesh(GEO.sphere, MAT.screenCyan);
  glassDoor.scale.set(0.58, 0.58, 0.2);
  glassDoor.position.set(0, -0.06, 0.33);
  g.add(body, topBar, neonRing, glassDoor);
  g.rotation.z = -0.12;
  g.position.set(localX, localY, localZ);

  facadeEmitters.push({
    kind: 'bubble',
    wx: lotX + localX,
    wy: localY + 0.72,
    wz: lotZ + localZ + 0.18,
    timer: 0.2
  });
  return g;
}

function createCafeCupAndCroissant3D(lotX, localX, localY, localZ, lotZ) {
  const g = new THREE.Group();
  const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.58, 0.12, 22), MAT.white);
  addToonEdgeOutline(saucer, MAT.toonEdge, 30);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.38, 0.72, 22), MAT.roofBrickCoral);
  cup.position.y = 0.38;
  addToonEdgeOutline(cup, MAT.toonEdge, 30);
  const latteTop = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.05, 20), MAT.woodWarm);
  latteTop.position.y = 0.72;
  const handle = new THREE.Mesh(GEO.torus, MAT.white);
  handle.scale.setScalar(0.58);
  handle.position.set(0.52, 0.4, 0);

  const croissant = new THREE.Group();
  croissant.position.set(-0.78, 0.24, 0.24);
  croissant.rotation.z = 0.25;
  const cMid = new THREE.Mesh(GEO.sphere, MAT.butterOak);
  cMid.scale.set(0.56, 0.34, 0.36);
  addToonHullOutline(cMid, 1.07);
  const cL = new THREE.Mesh(GEO.sphere, MAT.woodLight);
  cL.scale.set(0.36, 0.25, 0.28);
  cL.position.set(-0.28, -0.06, 0.08);
  const cR = new THREE.Mesh(GEO.sphere, MAT.woodLight);
  cR.scale.set(0.36, 0.25, 0.28);
  cR.position.set(0.28, -0.06, 0.08);
  croissant.add(cMid, cL, cR);

  g.add(saucer, cup, latteTop, handle, croissant);
  g.position.set(localX, localY, localZ);

  facadeEmitters.push({
    kind: 'steam',
    wx: lotX + localX,
    wy: localY + 0.88,
    wz: lotZ + localZ,
    timer: 0.35
  });
  return g;
}

function createRooftopSkySign3D(buildingTitle, lotId, useNavyFrame = true) {
  const g = new THREE.Group();
  g.userData.origScale = new THREE.Vector3(1, 1, 1);

  g.add(createRoundedToyMesh(0.44, 0.92, 0.44, MAT.walnutTrim, -4.1, 0.42, 0, 0.1));
  g.add(createRoundedToyMesh(0.44, 0.92, 0.44, MAT.walnutTrim, 4.1, 0.42, 0, 0.1));

  const outerFrameMat = useNavyFrame ? MAT.roofRoyalNavy : MAT.roofBrickCoral;
  const backFrame = createRoundedToyMesh(9.8, 2.15, 0.44, outerFrameMat, 0, 1.32, 0, 0.36);
  const goldRim = createRoundedToyMesh(9.2, 1.74, 0.48, MAT.neonYellow, 0, 1.32, 0.03, 0.28);

  const crownOrb = new THREE.Mesh(GEO.sphere, MAT.neonYellow);
  crownOrb.scale.setScalar(0.5);
  crownOrb.position.set(0, 2.52, 0.08);
  addToonHullOutline(crownOrb, 1.08);

  const skyMat = makeClayMat(0xFFFFFF, {
    map: createBuildingSkySignTexture(buildingTitle),
    emissive: 0xFFB703,
    emissiveIntensity: 0.34,
    roughness: 0.25
  });
  const signFace = new THREE.Mesh(GEO.quad, skyMat);
  signFace.scale.set(8.65, 1.5, 1);
  signFace.position.set(0, 1.32, 0.29);

  [backFrame, goldRim, signFace].forEach((m) => {
    m.userData = { lotId, isRenameSign: true };
    registerPick(m);
  });

  g.add(backFrame, goldRim, crownOrb, signFace);
  return { group: g, skyMat };
}

function refreshBuildingNameplates3D(lotId) {
  const b = state.buildings[lotId];
  const reg = lot3D[lotId];
  if (!b || !reg) return;
  if (reg.skySignMat) {
    if (reg.skySignMat.map) reg.skySignMat.map.dispose();
    reg.skySignMat.map = createBuildingSkySignTexture(b.title);
    reg.skySignMat.needsUpdate = true;
  }
  if (reg.brassPlateMat) {
    if (reg.brassPlateMat.map) reg.brassPlateMat.map.dispose();
    reg.brassPlateMat.map = createBrassNameplateTexture(b.title);
    reg.brassPlateMat.needsUpdate = true;
  }
}

function createInteractiveBaseRing(w, d, y = 0.04, isMint = true) {
  const g = new THREE.Group();
  const dashMat = isMint ? MAT.dashBorderMint : MAT.dashBorderGold;
  const barThick = 0.26;

  const front = new THREE.Mesh(GEO.quad, dashMat);
  front.rotation.x = -Math.PI / 2;
  front.scale.set(w, barThick, 1);
  front.position.set(0, y, d * 0.5);

  const back = new THREE.Mesh(GEO.quad, dashMat);
  back.rotation.x = -Math.PI / 2;
  back.scale.set(w, barThick, 1);
  back.position.set(0, y, -d * 0.5);

  const left = new THREE.Mesh(GEO.quad, dashMat);
  left.rotation.x = -Math.PI / 2;
  left.rotation.z = Math.PI / 2;
  left.scale.set(d, barThick, 1);
  left.position.set(-w * 0.5, y, 0);

  const right = new THREE.Mesh(GEO.quad, dashMat);
  right.rotation.x = -Math.PI / 2;
  right.rotation.z = Math.PI / 2;
  right.scale.set(d, barThick, 1);
  right.position.set(w * 0.5, y, 0);

  [front, back, left, right].forEach((m) => { m.raycast = () => {}; });
  g.add(front, back, left, right);
  return g;
}

function initFocusAndSelectionGuides3D() {
  hoverFocusGroup = new THREE.Group();
  hoverFocusGroup.visible = false;
  hoverRingMat = new THREE.MeshBasicMaterial({ color: 0xFFD166, transparent: true, opacity: 0.94 });

  const barT = 0.24;
  const hFront = createRoundedToyMesh(1, 0.16, barT, hoverRingMat, 0, 0, 0.5, 0.04, false, false, false);
  const hBack = createRoundedToyMesh(1, 0.16, barT, hoverRingMat, 0, 0, -0.5, 0.04, false, false, false);
  const hLeft = createRoundedToyMesh(barT, 0.16, 1, hoverRingMat, -0.5, 0, 0, 0.04, false, false, false);
  const hRight = createRoundedToyMesh(barT, 0.16, 1, hoverRingMat, 0.5, 0, 0, 0.04, false, false, false);
  [hFront, hBack, hLeft, hRight].forEach((m) => { m.raycast = () => {}; });
  hoverFocusGroup.userData.bars = { hFront, hBack, hLeft, hRight };
  hoverFocusGroup.add(hFront, hBack, hLeft, hRight);
  scene.add(hoverFocusGroup);

  selectedRoomFrameGroup = new THREE.Group();
  selectedRoomFrameGroup.visible = false;
  const selMat = new THREE.MeshBasicMaterial({ color: 0xFFD166 });
  const f1 = createRoundedToyMesh(1, 0.14, 0.14, selMat, 0, 0, 0.5, 0.04, false, false, false);
  const f2 = createRoundedToyMesh(1, 0.14, 0.14, selMat, 0, 0, -0.5, 0.04, false, false, false);
  const f3 = createRoundedToyMesh(0.14, 0.14, 1, selMat, -0.5, 0, 0, 0.04, false, false, false);
  const f4 = createRoundedToyMesh(0.14, 0.14, 1, selMat, 0.5, 0, 0, 0.04, false, false, false);
  selectedRoomFrameGroup.userData.bars = { f1, f2, f3, f4 };
  selectedRoomFrameGroup.add(f1, f2, f3, f4);
  selectedRoomFrameGroup.traverse((c) => { c.raycast = () => {}; });
  scene.add(selectedRoomFrameGroup);
}

function setHoverBoxBounds(wx, wy, wz, w, d, colorHex = 0xFFD166) {
  if (!hoverFocusGroup) return;
  hoverFocusGroup.visible = true;
  hoverFocusGroup.position.set(wx, wy, wz);
  hoverRingMat.color.setHex(colorHex);

  const { hFront, hBack, hLeft, hRight } = hoverFocusGroup.userData.bars;
  hFront.scale.set(w + 0.35, 1, 1);
  hFront.position.set(0, 0, d * 0.5 + 0.12);
  hBack.scale.set(w + 0.35, 1, 1);
  hBack.position.set(0, 0, -d * 0.5 - 0.12);
  hLeft.scale.set(1, 1, d + 0.35);
  hLeft.position.set(-w * 0.5 - 0.12, 0, 0);
  hRight.scale.set(1, 1, d + 0.35);
  hRight.position.set(w * 0.5 + 0.12, 0, 0);
}

function setSelectedRoomFrameBounds(wx, wy, wz, w, d) {
  if (!selectedRoomFrameGroup) return;
  selectedRoomFrameGroup.visible = true;
  selectedRoomFrameGroup.position.set(wx, wy + 0.06, wz);
  const { f1, f2, f3, f4 } = selectedRoomFrameGroup.userData.bars;
  f1.scale.set(w + 0.24, 1, 1);
  f1.position.set(0, 0, d * 0.5 + 0.08);
  f2.scale.set(w + 0.24, 1, 1);
  f2.position.set(0, 0, -d * 0.5 - 0.08);
  f3.scale.set(1, 1, d + 0.24);
  f3.position.set(-w * 0.5 - 0.08, 0, 0);
  f4.scale.set(1, 1, d + 0.24);
  f4.position.set(w * 0.5 + 0.08, 0, 0);
}

// =========================================================
// 5. 대형 플로팅 아일랜드 및 힐링 디테일 조립
// =========================================================
function getStreamXAtZ(z) {
  return 13.8 + Math.sin((z + 18) * 0.08) * 0.75;
}

function buildCozyFloatingIsland() {
  const island = new THREE.Group();
  islandRootGroup = island;

  const meadowTop = new THREE.Mesh(
    new THREE.CylinderGeometry(45.5, 43.8, 1.5, 56),
    makeClayMat(0xCBE4D0, { map: TEX.meadow, roughness: 0.82, emissiveIntensity: 0.05 })
  );
  meadowTop.position.y = -0.75;
  meadowTop.receiveShadow = true;
  island.add(meadowTop);

  const cliffMid = new THREE.Mesh(new THREE.CylinderGeometry(43.2, 34.5, 4.4, 44), makeClayMat(0xDDD1C0, { roughness: 0.84, emissiveIntensity: 0.05 }));
  cliffMid.position.y = -3.6;
  island.add(cliffMid);

  const cliffBot = new THREE.Mesh(new THREE.CylinderGeometry(34.0, 18.5, 5.6, 36), makeClayMat(0xC2B19E, { roughness: 0.88, emissiveIntensity: 0.04 }));
  cliffBot.position.y = -8.4;
  island.add(cliffBot);

  const waterMat = new THREE.MeshStandardMaterial({
    map: TEX.water,
    emissive: 0x7DD3FC,
    emissiveIntensity: 0.16,
    roughness: 0.16,
    metalness: 0.05,
    transparent: true,
    opacity: 0.94
  });
  [
    { x: 13.8, z: -32, w: 5.0, d: 13.5, rot: 0.08 },
    { x: 14.3, z: -19, w: 5.0, d: 13.8, rot: -0.06 },
    { x: 14.0, z: -6, w: 5.1, d: 14.0, rot: 0.05 },
    { x: 13.6, z: 7, w: 5.1, d: 14.0, rot: 0.08 },
    { x: 13.2, z: 20, w: 5.2, d: 14.2, rot: -0.06 },
    { x: 12.8, z: 32, w: 5.4, d: 12.0, rot: 0.0 }
  ].forEach((seg) => {
    const wMesh = createRoundedToyMesh(seg.w, 0.18, seg.d, waterMat, seg.x, 0.06, seg.z, 0.12, false, true, false);
    wMesh.rotation.y = seg.rot;
    island.add(wMesh);

    for (const s of [-1, 1]) {
      const pebble = new THREE.Mesh(GEO.sphere, MAT.cream);
      pebble.scale.set(0.62, 0.3, 0.48);
      pebble.position.set(seg.x + s * (seg.w * 0.54), 0.11, seg.z + s * 1.8);
      pebble.receiveShadow = true;
      island.add(pebble);
    }
  });

  const cobbleMat = makeClayMat(0xFFFFFF, { map: TEX.cobble, roughness: 0.74 });
  island.add(createRoundedToyMesh(54, 0.12, 4.2, cobbleMat, -1.0, 0.05, 5.2, 0.14, false, true, false));
  island.add(createRoundedToyMesh(3.6, 0.12, 28, cobbleMat, -18.5, 0.05, 2.5, 0.14, false, true, false));
  island.add(createRoundedToyMesh(3.6, 0.12, 28, cobbleMat, 19.5, 0.05, 2.5, 0.14, false, true, false));

  const bridge = new THREE.Group();
  bridge.position.set(13.8, 0.12, 5.2);
  for (let i = -4; i <= 4; i++) {
    const t = i / 4;
    const archY = Math.cos(t * Math.PI * 0.5) * 0.72;
    bridge.add(createRoundedToyMesh(0.84, 0.18, 4.2, MAT.woodLight, i * 0.86, archY, 0, 0.08, true, true, false));
  }
  for (const side of [-1.92, 1.92]) {
    for (const px of [-3.1, 0, 3.1]) {
      bridge.add(createRoundedToyMesh(0.24, 1.2, 0.24, MAT.woodDark, px, 0.78, side, 0.08, true, true, false));
      if (px === 0) {
        const lantern = new THREE.Mesh(GEO.sphere, MAT.gold);
        lantern.scale.setScalar(0.36);
        lantern.position.set(px, 1.5, side);
        bridge.add(lantern);
      }
    }
    bridge.add(createRoundedToyMesh(7.0, 0.16, 0.16, MAT.woodWarm, 0, 1.24, side, 0.06, true, true, false));
  }
  island.add(bridge);

  [
    [-34, -15, true], [-33, 11, false], [-14, -24, true], [-4, 24, false],
    [34, -15, true], [35, 11, true], [22, 25, false], [-29, 24, true],
    [16, -26, false], [-22, -20, false], [33, -2, false]
  ].forEach(([tx, tz, isSakura], idx) => {
    const tree = createFluffyPastelTree(isSakura, 1.05 + (idx % 3) * 0.18);
    tree.position.set(tx, 0.05, tz);
    island.add(tree);
  });

  [[-12.5, 8.4], [1.5, 8.6], [10.2, 8.3], [-16.5, -12.5], [10.5, -13.2]].forEach(([fx, fz]) => {
    const patch = createCloverAndDaisyCluster(5);
    patch.position.set(fx, 0.06, fz);
    island.add(patch);
  });

  const bench = createParkBench3D();
  bench.position.set(3.2, 0.08, 8.2);
  bench.rotation.y = -0.3;
  island.add(bench);

  const postbox = createRedPostbox3D();
  postbox.position.set(-15.5, 0.08, 7.3);
  island.add(postbox);

  const streetVending = createPastelVendingMachine3D();
  streetVending.position.set(-4.2, 0.08, 7.6);
  streetVending.rotation.y = 0.18;
  island.add(streetVending);

  const catBasket = createSleepingCatBasket3D();
  catBasket.position.set(-1.8, 0.08, 7.8);
  island.add(catBasket);

  const toyCar = createRoundedToyCar3D();
  toyCar.position.set(-14.0, 0.1, 4.6);
  island.add(toyCar);
  streetInteractiveProps.push({ kind: 'car', mesh: toyCar, dir: 1, speed: 3.4 });

  scene.add(island);

  spawnCottonCandyClouds();
  spawnButterfliesAndBirds();
  spawnStreamRubberDuckAndBoat();
  spawnAmbientPetalsAndBokeh();
}

function createFourLeafClover3D(scale = 1.0) {
  const g = new THREE.Group();
  [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]].forEach(([ox, oz]) => {
    const leaf = new THREE.Mesh(GEO.sphere, MAT.cloverGreen);
    leaf.scale.set(0.24, 0.07, 0.24);
    leaf.position.set(ox, 0.08, oz);
    g.add(leaf);
  });
  g.scale.setScalar(scale);
  return g;
}

function createDaisyFlower3D(petalMat = MAT.white, scale = 1.0) {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.22, 8), MAT.leafGreen);
  stem.position.y = 0.11;
  g.add(stem);

  const center = new THREE.Mesh(GEO.sphere, MAT.butter);
  center.scale.set(0.18, 0.12, 0.18);
  center.position.y = 0.23;
  g.add(center);

  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 * i) / 6;
    const petal = new THREE.Mesh(GEO.sphere, petalMat);
    petal.scale.set(0.16, 0.06, 0.24);
    petal.position.set(Math.cos(a) * 0.15, 0.22, Math.sin(a) * 0.15);
    petal.rotation.y = -a;
    g.add(petal);
  }
  g.scale.setScalar(scale);
  return g;
}

function createCloverAndDaisyCluster(count = 5) {
  const g = new THREE.Group();
  const petalMats = [MAT.white, MAT.pinkSoft, MAT.butter];
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count + 0.3;
    const r = 0.45 + (i % 3) * 0.38;
    const item = i % 2 === 0
      ? createDaisyFlower3D(petalMats[i % petalMats.length], 0.95 + (i % 2) * 0.2)
      : createFourLeafClover3D(1.05);
    item.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    g.add(item);
  }
  return g;
}

function createFluffyPastelTree(isSakura = false, scale = 1.0) {
  const g = new THREE.Group();
  const shadow = new THREE.Mesh(GEO.quad, MAT.shadow);
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(2.5, 2.5, 1);
  shadow.position.y = 0.02;
  g.add(shadow);

  const trunk = createRoundedToyMesh(0.52, 1.55, 0.52, MAT.woodDark, 0, 0.78, 0, 0.22, true, true, false);
  g.add(trunk);

  const leafMat = isSakura ? MAT.sakuraPink : MAT.leafGreen;
  [[0, 1.98, 0, 1.5], [-0.56, 1.68, 0.36, 1.1], [0.58, 1.72, -0.28, 1.12], [0.12, 2.46, 0.15, 1.06]].forEach(([px, py, pz, s]) => {
    const p = new THREE.Mesh(GEO.sphere, leafMat);
    p.position.set(px, py, pz);
    p.scale.setScalar(s);
    p.castShadow = true;
    p.receiveShadow = true;
    g.add(p);
  });

  g.scale.setScalar(scale);
  return g;
}

function createParkBench3D() {
  const g = new THREE.Group();
  g.add(createRoundedToyMesh(1.75, 0.15, 0.58, MAT.woodLight, 0, 0.42, 0, 0.06, true, true, false));
  g.add(createRoundedToyMesh(1.75, 0.48, 0.14, MAT.woodLight, 0, 0.74, -0.22, 0.06, true, true, false));
  g.add(createRoundedToyMesh(0.18, 0.42, 0.52, MAT.woodDark, -0.7, 0.21, 0, 0.06, true, true, false));
  g.add(createRoundedToyMesh(0.18, 0.42, 0.52, MAT.woodDark, 0.7, 0.21, 0, 0.06, true, true, false));
  return g;
}

function createGarland3D(width = 5.4, flagCount = 9) {
  const g = new THREE.Group();
  const flagMats = [MAT.coral, MAT.butter, MAT.mint, MAT.sky, MAT.lavender];
  const flagGeo = getGarlandFlagGeo();

  for (let i = 0; i < flagCount; i++) {
    const u = i / Math.max(1, flagCount - 1);
    const fx = (u - 0.5) * width;
    const sagY = -Math.sin(u * Math.PI) * 0.24;
    const flag = new THREE.Mesh(flagGeo, flagMats[i % flagMats.length]);
    flag.position.set(fx, sagY, 0);
    flag.rotation.z = (0.5 - u) * 0.22;
    flag.castShadow = true;
    addToonEdgeOutline(flag, MAT.toonEdge, 35);
    g.add(flag);
  }
  return g;
}

function createBalloonBunch3D(scale = 1.0) {
  const pivot = new THREE.Group();
  [
    { x: -0.24, y: 1.55, z: 0.06, mat: MAT.coral },
    { x: 0.22, y: 1.72, z: -0.06, mat: MAT.butter },
    { x: 0.0, y: 1.92, z: 0.1, mat: MAT.sky },
    { x: -0.08, y: 1.38, z: -0.14, mat: MAT.mint }
  ].forEach((c) => {
    const stringMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, c.y, 6), MAT.white);
    stringMesh.position.set(c.x * 0.5, c.y * 0.5, c.z * 0.5);
    stringMesh.rotation.z = -c.x * 0.32;
    pivot.add(stringMesh);

    const balloon = new THREE.Mesh(GEO.sphere, c.mat);
    balloon.scale.set(0.42, 0.5, 0.42);
    balloon.position.set(c.x, c.y, c.z);
    balloon.castShadow = true;
    addToonHullOutline(balloon, 1.06);
    pivot.add(balloon);
  });
  pivot.scale.setScalar(scale);
  swayingBalloons.push({ pivot, phase: Math.random() * Math.PI * 2 });
  return pivot;
}

function createRedPostbox3D() {
  const g = new THREE.Group();
  const pole = createRoundedToyMesh(0.24, 0.65, 0.24, MAT.woodDark, 0, 0.32, 0, 0.09);
  const body = createRoundedToyMesh(0.68, 0.88, 0.56, MAT.redPost, 0, 0.98, 0, 0.22);
  const cap = new THREE.Mesh(GEO.sphere, MAT.redPost);
  cap.scale.set(0.7, 0.42, 0.58);
  cap.position.set(0, 1.38, 0);
  cap.castShadow = true;
  addToonHullOutline(cap, 1.07);
  const slot = createRoundedToyMesh(0.42, 0.1, 0.12, MAT.white, 0, 1.18, 0.27, 0.04);
  g.add(pole, body, cap, slot);

  body.userData = { isStreetProp: true, propRoot: g, label: '빨간 우체통에 행복 엽서가 도착했어요!' };
  registerPick(body);
  streetInteractiveProps.push({ kind: 'postbox', mesh: g, wiggleTimer: 3.5 });
  return g;
}

function createPastelVendingMachine3D() {
  const g = new THREE.Group();
  const body = createRoundedToyMesh(1.18, 1.92, 0.78, MAT.pinkSoft, 0, 0.96, 0, 0.16);
  const displayBg = createRoundedToyMesh(0.88, 0.92, 0.12, MAT.white, 0, 1.24, 0.35, 0.08);
  const pickupSlot = createRoundedToyMesh(0.72, 0.26, 0.14, MAT.charcoal, 0, 0.36, 0.35, 0.06);
  g.add(body, displayBg, pickupSlot);

  const canMats = [MAT.coral, MAT.mint, MAT.sky, MAT.butter, MAT.lavender, MAT.coral];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.2, 12), canMats[r * 3 + c]);
      can.position.set(-0.24 + c * 0.24, 1.05 + r * 0.34, 0.42);
      g.add(can);
    }
  }

  body.userData = { isStreetProp: true, propRoot: g, label: '시원한 복숭아 소다 캔이 딸깍 나왔어요!' };
  registerPick(body);
  streetInteractiveProps.push({ kind: 'vending', mesh: g });
  return g;
}

function createSleepingCatBasket3D() {
  const g = new THREE.Group();
  const rim = new THREE.Mesh(GEO.torus, MAT.woodLight);
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(1.15, 1.0, 0.9);
  rim.position.y = 0.18;
  rim.castShadow = true;
  addToonHullOutline(rim, 1.06);

  const cushion = new THREE.Mesh(GEO.sphere, MAT.pinkSoft);
  cushion.scale.set(0.78, 0.26, 0.68);
  cushion.position.y = 0.16;

  const catGroup = new THREE.Group();
  catGroup.position.set(0, 0.28, 0);
  const catBody = new THREE.Mesh(GEO.sphere, MAT.orangeBill);
  catBody.scale.set(0.5, 0.34, 0.42);
  addToonHullOutline(catBody, 1.07);
  const catHead = new THREE.Mesh(GEO.sphere, MAT.orangeBill);
  catHead.scale.setScalar(0.32);
  catHead.position.set(0.16, 0.06, 0.08);
  addToonHullOutline(catHead, 1.07);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(getPuffyDomeGeo(0.07, 0.14), MAT.coral);
    ear.position.set(0.16 + sx * 0.08, 0.22, 0.08);
    catHead.add(ear);
  }
  catGroup.add(catBody, catHead);
  g.add(rim, cushion, catGroup);

  cushion.userData = { isPettableActor: true, propRoot: g, label: '고양이를 쓰다듬자 따스한 골골송과 하트가 피어나요!' };
  registerPick(cushion);
  streetInteractiveProps.push({ kind: 'catBasket', mesh: g, catGroup });
  return g;
}

function createRoundedToyCar3D() {
  const g = new THREE.Group();
  const sh = new THREE.Mesh(GEO.quad, MAT.shadow);
  sh.rotation.x = -Math.PI / 2;
  sh.scale.set(2.1, 1.4, 1);
  sh.position.y = 0.02;
  g.add(sh);

  const chassis = createRoundedToyMesh(1.75, 0.52, 1.05, MAT.coral, 0, 0.38, 0, 0.18);
  const cabin = createRoundedToyMesh(1.05, 0.48, 0.92, MAT.cream, -0.08, 0.78, 0, 0.18);
  const windshield = createRoundedToyMesh(0.12, 0.32, 0.76, MAT.sky, 0.42, 0.78, 0, 0.05);
  g.add(chassis, cabin, windshield);

  for (const sz of [-0.3, 0.3]) {
    const lamp = new THREE.Mesh(GEO.sphere, MAT.butter);
    lamp.scale.setScalar(0.16);
    lamp.position.set(0.88, 0.4, sz);
    g.add(lamp);
  }
  for (const wx of [-0.52, 0.52]) {
    for (const wz of [-0.52, 0.52]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.16, 16), MAT.charcoal);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, 0.22, wz);
      wheel.castShadow = true;
      g.add(wheel);
    }
  }
  chassis.userData = { isStreetProp: true, propRoot: g, label: '부릉부릉~ 미니미 장난감 택배차가 지나가요!' };
  registerPick(chassis);
  return g;
}

function spawnCottonCandyClouds() {
  [
    { x: -30, y: 24.5, z: -24, s: 1.45, speed: 0.65 },
    { x: 24, y: 26.0, z: -26, s: 1.6, speed: 0.52 },
    { x: -26, y: 23.8, z: 22, s: 1.35, speed: 0.72 },
    { x: 28, y: 25.2, z: 20, s: 1.5, speed: 0.58 }
  ].forEach((cfg, idx) => {
    const cg = new THREE.Group();
    [[0, 0, 0, 2.2, 1.35, 1.6], [-1.15, -0.15, 0.15, 1.65, 1.1, 1.35], [1.2, -0.1, -0.1, 1.7, 1.15, 1.4], [0.25, 0.45, 0.1, 1.45, 1.05, 1.25]].forEach(([px, py, pz, sx, sy, sz]) => {
      const m = new THREE.Mesh(GEO.sphere, MAT.cloudWhite);
      m.position.set(px, py, pz);
      m.scale.set(sx, sy, sz);
      cg.add(m);
    });
    cg.scale.setScalar(cfg.s);
    cg.position.set(cfg.x, cfg.y, cfg.z);
    islandRootGroup.add(cg);
    cloudActors.push({ mesh: cg, baseX: cfg.x, baseY: cfg.y, baseZ: cfg.z, speed: cfg.speed, phase: idx * 1.7 });
  });
}

function spawnButterfliesAndBirds() {
  const wingMats = [MAT.pinkSoft, MAT.butter, MAT.sky, MAT.mintSoft];
  [
    [-12.5, 8.4, 'butterfly'],
    [1.5, 8.6, 'butterfly'],
    [10.2, 8.3, 'butterfly'],
    [24.5, -4.5, 'bird'],
    [-10.0, -14.5, 'bird'],
    [13.8, 5.2, 'bird']
  ].forEach(([cx, cz, kind], i) => {
    const g = new THREE.Group();
    if (kind === 'butterfly') {
      const m = wingMats[i % wingMats.length];
      const wL = new THREE.Mesh(GEO.sphere, m);
      wL.scale.set(0.22, 0.04, 0.28);
      wL.position.x = -0.1;
      const wR = new THREE.Mesh(GEO.sphere, m);
      wR.scale.set(0.22, 0.04, 0.28);
      wR.position.x = 0.1;
      g.add(wL, wR);
      g.userData.wings = [wL, wR];
    } else {
      const body = new THREE.Mesh(GEO.sphere, MAT.sky);
      body.scale.set(0.26, 0.22, 0.34);
      const beak = new THREE.Mesh(GEO.sphere, MAT.orangeBill);
      beak.scale.set(0.09, 0.07, 0.12);
      beak.position.set(0, 0, 0.18);
      const wL = new THREE.Mesh(GEO.sphere, MAT.white);
      wL.scale.set(0.26, 0.05, 0.16);
      wL.position.x = -0.16;
      const wR = new THREE.Mesh(GEO.sphere, MAT.white);
      wR.scale.set(0.26, 0.05, 0.16);
      wR.position.x = 0.16;
      g.add(body, beak, wL, wR);
      g.userData.wings = [wL, wR];
    }
    islandRootGroup.add(g);
    skyCritters.push({
      mesh: g,
      kind,
      cx,
      cz,
      baseY: kind === 'bird' ? 6.5 + (i % 2) * 1.8 : 1.2 + (i % 3) * 0.35,
      radius: kind === 'bird' ? 4.4 : 1.65,
      angle: i * 1.3,
      speed: kind === 'bird' ? 1.35 : 2.1
    });
  });
}

function spawnStreamRubberDuckAndBoat() {
  const duckGroup = new THREE.Group();
  const tube = new THREE.Mesh(GEO.torus, MAT.coral);
  tube.rotation.x = Math.PI / 2;
  tube.scale.setScalar(1.05);
  tube.position.y = 0.08;
  addToonHullOutline(tube, 1.07);

  const duckBody = new THREE.Mesh(GEO.sphere, MAT.duckYellow);
  duckBody.scale.set(0.58, 0.44, 0.68);
  duckBody.position.y = 0.22;
  addToonHullOutline(duckBody, 1.07);

  const duckHead = new THREE.Mesh(GEO.sphere, MAT.duckYellow);
  duckHead.scale.setScalar(0.42);
  duckHead.position.set(0, 0.5, 0.2);
  addToonHullOutline(duckHead, 1.07);

  const bill = new THREE.Mesh(GEO.sphere, MAT.orangeBill);
  bill.scale.set(0.22, 0.1, 0.24);
  bill.position.set(0, 0.47, 0.42);

  duckGroup.add(tube, duckBody, duckHead, bill);
  duckBody.userData = { isStreetProp: true, propRoot: duckGroup, label: '꽥꽥! 노란 오리 튜브가 시냇물을 타고 둥실둥실~' };
  registerPick(duckBody);
  islandRootGroup.add(duckGroup);
  streamFloats.push({ mesh: duckGroup, zPos: -18.0, speed: 1.6, rippleTimer: 0.4, phase: 0 });

  const boatGroup = new THREE.Group();
  const hull = createRoundedToyMesh(0.56, 0.22, 1.05, MAT.white, 0, 0.14, 0, 0.1);
  const sail = new THREE.Mesh(getPuffyDomeGeo(0.28, 0.52), MAT.pinkSoft);
  sail.scale.set(0.45, 1.0, 1.1);
  sail.position.set(0, 0.42, 0);
  addToonHullOutline(sail, 1.06);
  boatGroup.add(hull, sail);
  islandRootGroup.add(boatGroup);
  streamFloats.push({ mesh: boatGroup, zPos: 8.5, speed: 1.4, rippleTimer: 0.6, phase: 2.1 });
}

function spawnWaterRipple(wx, wz) {
  if (focusedRoomId) return;
  const r = new THREE.Mesh(
    GEO.ring,
    new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.72, side: THREE.DoubleSide })
  );
  r.rotation.x = -Math.PI / 2;
  r.scale.setScalar(0.45);
  r.position.set(wx, 0.17, wz);
  r.raycast = () => {};
  islandRootGroup.add(r);
  waterRipples.push({ mesh: r, life: 1.2, maxLife: 1.2 });
}

function spawnAmbientPetalsAndBokeh() {
  const petalMat = new THREE.MeshBasicMaterial({ color: 0xFFB7CE, transparent: true, opacity: 0.82, side: THREE.DoubleSide });
  const bokehMat = new THREE.MeshBasicMaterial({ color: 0xFFF7C2, transparent: true, opacity: 0.7 });

  for (let i = 0; i < 28; i++) {
    const isPetal = i < 16;
    const m = new THREE.Mesh(GEO.sphere, isPetal ? petalMat : bokehMat);
    if (isPetal) m.scale.set(0.17, 0.04, 0.11);
    else m.scale.setScalar(0.1 + (i % 3) * 0.04);
    m.position.set((Math.random() - 0.5) * 64, 1.5 + Math.random() * 18, (Math.random() - 0.5) * 56);
    m.raycast = () => {};
    islandRootGroup.add(m);
    ambientFloaters.push({
      mesh: m,
      isPetal,
      vx: 0.45 + Math.random() * 0.45,
      vy: isPetal ? -(0.42 + Math.random() * 0.32) : 0.18 + Math.random() * 0.2,
      vz: 0.25 + Math.random() * 0.35,
      phase: Math.random() * Math.PI * 2
    });
  }
}

function spawnFootstepPuff(wx, wy, wz, scale = 0.2) {
  if (activeParticles.length > 90) return;
  const puff = new THREE.Mesh(
    GEO.sphere,
    new THREE.MeshBasicMaterial({ color: 0xFFFDF9, transparent: true, opacity: 0.72 })
  );
  puff.scale.setScalar(scale);
  puff.position.set(wx + (Math.random() - 0.5) * 0.12, wy + 0.06, wz + (Math.random() - 0.5) * 0.12);
  puff.raycast = () => {};
  scene.add(puff);
  activeParticles.push({
    mesh: puff,
    vx: (Math.random() - 0.5) * 0.35,
    vy: 0.55 + Math.random() * 0.35,
    vz: (Math.random() - 0.5) * 0.35,
    gravity: -0.25,
    floorY: -10,
    life: 0.46,
    shrink: true
  });
}

// =========================================================
// 6. 2등신 치비 캐릭터 + 반려동물 생성기 (스트리머 의상 포함)
// =========================================================
function createSproutTopper3D() {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.22, 8), MAT.cloverGreen);
  stem.position.y = 0.11;
  const l1 = new THREE.Mesh(GEO.sphere, MAT.mint);
  l1.scale.set(0.18, 0.06, 0.1);
  l1.position.set(-0.09, 0.22, 0);
  l1.rotation.z = 0.35;
  const l2 = new THREE.Mesh(GEO.sphere, MAT.mint);
  l2.scale.set(0.18, 0.06, 0.1);
  l2.position.set(0.09, 0.22, 0);
  l2.rotation.z = -0.35;
  g.add(stem, l1, l2);
  return g;
}

function createChibiPerson3D(style = 'student', isKid = false) {
  const g = new THREE.Group();
  const s = isKid ? 0.8 : 1.15;

  const outfitPalette = {
    student: 0x1E3A8A,
    newlywed_m: 0x0D9488,
    newlywed_f: 0xF43F5E,
    family_m: 0x059669,
    family_f: 0xD97706,
    kid: 0xFF5C7A,
    elderly_m: 0x1D3557,
    elderly_f: 0xE11D48,
    hikikomori: 0x6D28D9,
    streamer: 0xDB2777,
    manager: 0x1E40AF,
    stroller_a: 0xFF5C7A,
    stroller_b: 0x0D9488
  };
  const clothMat = makeClayMat(outfitPalette[style] || 0x1E3A8A, { roughness: 0.44 });
  const skinMat = makeClayMat(style === 'hikikomori' ? 0xF6EEFF : 0xFFE3D1, { roughness: 0.46 });

  const sh = new THREE.Mesh(GEO.quad, MAT.shadow);
  sh.rotation.x = -Math.PI / 2;
  sh.scale.set(0.92, 0.92, 1);
  sh.position.y = 0.02;
  g.add(sh);

  const bodyRoot = new THREE.Group();
  g.add(bodyRoot);

  const legL = createRoundedToyMesh(0.16, 0.24, 0.18, MAT.charcoal, -0.11, 0.12, 0, 0.07, true, true, false);
  const legR = createRoundedToyMesh(0.16, 0.24, 0.18, MAT.charcoal, 0.11, 0.12, 0, 0.07, true, true, false);
  g.add(legL, legR);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.46, 18), clothMat);
  torso.position.y = 0.44;
  torso.castShadow = true;
  addToonHullOutline(torso, 1.09);
  bodyRoot.add(torso);

  const armL = createRoundedToyMesh(0.13, 0.3, 0.14, clothMat, -0.3, 0.44, 0.02, 0.06, true, true, false);
  armL.rotation.z = 0.24;
  const armR = createRoundedToyMesh(0.13, 0.3, 0.14, clothMat, 0.3, 0.44, 0.02, 0.06, true, true, false);
  armR.rotation.z = -0.24;
  bodyRoot.add(armL, armR);

  const headGroup = new THREE.Group();
  headGroup.position.y = 0.92;
  bodyRoot.add(headGroup);

  const head = new THREE.Mesh(GEO.sphere, skinMat);
  head.scale.set(0.66, 0.62, 0.64);
  head.castShadow = true;
  addToonHullOutline(head, 1.08);
  headGroup.add(head);

  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(GEO.sphere, MAT.charcoal);
    eye.scale.set(0.095, 0.115, 0.06);
    eye.position.set(sx * 0.13, -0.01, 0.3);
    headGroup.add(eye);

    const catchlight = new THREE.Mesh(GEO.sphere, MAT.white);
    catchlight.scale.setScalar(0.038);
    catchlight.position.set(sx * 0.13 + 0.022, 0.022, 0.33);
    headGroup.add(catchlight);

    const cheek = new THREE.Mesh(GEO.sphere, style === 'hikikomori' ? MAT.lavender : MAT.coral);
    cheek.scale.set(0.115, 0.068, 0.04);
    cheek.position.set(sx * 0.21, -0.08, 0.27);
    headGroup.add(cheek);
  }

  const topperPivot = new THREE.Group();
  topperPivot.position.set(0, 0.31, 0);
  headGroup.add(topperPivot);
  let propellerBlade = null;

  if (style === 'hikikomori') {
    const hood = new THREE.Mesh(GEO.sphere, MAT.purpleDark);
    hood.scale.set(0.74, 0.72, 0.72);
    hood.position.set(0, 0.03, -0.04);
    addToonHullOutline(hood, 1.075);
    headGroup.add(hood);
    topperPivot.position.y = 0.36;
    topperPivot.add(createSproutTopper3D());
  } else if (style === 'manager') {
    const capCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.33, 0.2, 18), clothMat);
    capCrown.position.y = 0.27;
    addToonHullOutline(capCrown, 1.08);
    const visor = createRoundedToyMesh(0.46, 0.07, 0.26, MAT.charcoal, 0, 0.2, 0.24, 0.03);
    const goldBadge = new THREE.Mesh(GEO.sphere, MAT.gold);
    goldBadge.scale.setScalar(0.095);
    goldBadge.position.set(0, 0.28, 0.33);
    const tie = createRoundedToyMesh(0.09, 0.24, 0.06, MAT.coral, 0, 0.45, 0.25, 0.02, true, true, false);
    headGroup.add(capCrown, visor, goldBadge);
    bodyRoot.add(tie);
  } else if (style === 'elderly_m' || style === 'elderly_f') {
    const silverHair = makeClayMat(0xB8C4D0, { roughness: 0.48 });
    const hair = new THREE.Mesh(GEO.sphere, silverHair);
    hair.scale.set(0.69, 0.52, 0.68);
    hair.position.set(0, 0.11, -0.03);
    addToonHullOutline(hair, 1.085);
    headGroup.add(hair);

    const hatMat = style === 'elderly_m' ? MAT.butterOak : MAT.coral;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.54, 0.06, 22), hatMat);
    addToonHullOutline(brim, 1.06);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.2, 18), hatMat);
    crown.position.y = 0.11;
    addToonHullOutline(crown, 1.07);
    const ribbonBand = new THREE.Mesh(new THREE.CylinderGeometry(0.345, 0.35, 0.055, 18), MAT.roofRoyalNavy);
    ribbonBand.position.y = 0.05;
    topperPivot.position.y = 0.24;
    topperPivot.add(brim, crown, ribbonBand);
  } else {
    const hairColor = style === 'streamer' ? 0x9333EA : (style.endsWith('_f') || style === 'stroller_a' ? 0x7A4424 : 0x3A2E2B);
    const hairMat = makeClayMat(hairColor);
    const hair = new THREE.Mesh(GEO.sphere, hairMat);
    hair.scale.set(0.7, 0.55, 0.69);
    hair.position.set(0, 0.11, -0.03);
    addToonHullOutline(hair, 1.075);
    headGroup.add(hair);

    if (style === 'student' || style === 'streamer') {
      const hMat = style === 'streamer' ? MAT.neonCoral : MAT.coral;
      const band = createRoundedToyMesh(0.7, 0.08, 0.12, hMat, 0, 0.26, 0, 0.03);
      const earCupL = createRoundedToyMesh(0.11, 0.22, 0.18, hMat, -0.34, 0.02, 0.02, 0.05, true, true, false);
      const earCupR = createRoundedToyMesh(0.11, 0.22, 0.18, hMat, 0.34, 0.02, 0.02, 0.05, true, true, false);
      const catEarL = new THREE.Mesh(getPuffyDomeGeo(0.09, 0.18), style === 'streamer' ? MAT.screenCyan : hMat);
      catEarL.position.set(-0.22, 0.34, 0);
      catEarL.rotation.z = 0.28;
      const catEarR = new THREE.Mesh(getPuffyDomeGeo(0.09, 0.18), style === 'streamer' ? MAT.screenCyan : hMat);
      catEarR.position.set(0.22, 0.34, 0);
      catEarR.rotation.z = -0.28;
      headGroup.add(band, earCupL, earCupR, catEarL, catEarR);
      if (style === 'student') topperPivot.add(createSproutTopper3D());
    } else if (style === 'newlywed_f' || style === 'stroller_a') {
      const bowL = new THREE.Mesh(GEO.sphere, MAT.coral);
      bowL.scale.set(0.28, 0.18, 0.12);
      bowL.position.set(-0.14, 0.06, 0.04);
      bowL.rotation.z = 0.25;
      const bowR = new THREE.Mesh(GEO.sphere, MAT.coral);
      bowR.scale.set(0.28, 0.18, 0.12);
      bowR.position.set(0.14, 0.06, 0.04);
      bowR.rotation.z = -0.25;
      const knot = new THREE.Mesh(GEO.sphere, MAT.white);
      knot.scale.setScalar(0.11);
      knot.position.set(0, 0.06, 0.06);
      topperPivot.add(bowL, bowR, knot);
    } else if (style === 'kid') {
      const cap = new THREE.Mesh(GEO.sphere, MAT.sky);
      cap.scale.set(0.56, 0.32, 0.56);
      cap.position.y = -0.04;
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.14, 8), MAT.butter);
      pin.position.y = 0.12;
      propellerBlade = createRoundedToyMesh(0.44, 0.04, 0.09, MAT.coral, 0, 0.19, 0, 0.02);
      topperPivot.add(cap, pin, propellerBlade);
    } else {
      topperPivot.add(createSproutTopper3D());
    }
  }

  g.scale.setScalar(s);
  g.userData.origScale = new THREE.Vector3(s, s, s);
  g.userData.torsoMesh = torso;
  g.userData.headMesh = head;
  g.userData.animParts = {
    bodyRoot,
    headGroup,
    topperPivot,
    propellerBlade,
    legL,
    legR,
    armL,
    armR,
    baseScale: s
  };
  return g;
}

function createCutePet3D(kind = 'shiba', scale = 1.0) {
  const g = new THREE.Group();
  const furColor = kind === 'shiba' ? 0xF8A836 : kind === 'bichon' ? 0xFFFDF9 : 0xFFA25B;
  const furMat = makeClayMat(furColor);

  const sh = new THREE.Mesh(GEO.quad, MAT.shadow);
  sh.rotation.x = -Math.PI / 2;
  sh.scale.set(0.75, 0.75, 1);
  sh.position.y = 0.02;
  g.add(sh);

  const body = createRoundedToyMesh(0.36, 0.28, 0.54, furMat, 0, 0.24, 0, 0.12);
  g.add(body);

  const head = new THREE.Mesh(GEO.sphere, furMat);
  head.scale.setScalar(kind === 'bichon' ? 0.48 : 0.38);
  head.position.set(0, 0.44, 0.24);
  head.castShadow = true;
  addToonHullOutline(head, 1.07);
  g.add(head);

  const miniSprout = createSproutTopper3D();
  miniSprout.scale.setScalar(0.65);
  miniSprout.position.set(0, kind === 'bichon' ? 0.66 : 0.6, 0.24);
  g.add(miniSprout);

  const muzzle = new THREE.Mesh(GEO.sphere, MAT.white);
  muzzle.scale.set(0.2, 0.15, 0.18);
  muzzle.position.set(0, 0.39, 0.41);
  const nose = new THREE.Mesh(GEO.sphere, MAT.charcoal);
  nose.scale.setScalar(0.06);
  nose.position.set(0, 0.42, 0.49);
  g.add(muzzle, nose);

  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(GEO.sphere, MAT.charcoal);
    eye.scale.setScalar(0.065);
    eye.position.set(sx * 0.1, 0.47, 0.41);
    g.add(eye);

    if (kind !== 'bichon') {
      const ear = new THREE.Mesh(getPuffyDomeGeo(0.08, 0.18), kind === 'cat' ? MAT.coral : furMat);
      ear.position.set(sx * 0.12, 0.62, 0.22);
      g.add(ear);
    }
  }

  for (const lx of [-0.11, 0.11]) {
    for (const lz of [-0.17, 0.17]) {
      g.add(createRoundedToyMesh(0.09, 0.16, 0.09, furMat, lx, 0.09, lz, 0.04, true, true, false));
    }
  }
  const tail = new THREE.Mesh(GEO.sphere, furMat);
  tail.scale.set(0.15, 0.22, 0.15);
  tail.position.set(0, 0.36, -0.3);
  g.add(tail);
  g.scale.setScalar(scale);
  g.userData.tail = tail;
  g.userData.origScale = new THREE.Vector3(scale, scale, scale);

  body.userData = { isPettableActor: true, propRoot: g, label: '반려동물을 쓰다듬자 신나게 꼬리를 흔들며 하트를 뿜어요!' };
  head.userData = { isPettableActor: true, propRoot: g, label: '반려동물을 쓰다듬자 신나게 꼬리를 흔들며 하트를 뿜어요!' };
  registerPick(body);
  registerPick(head);
  return g;
}

function spawnIslandPets3D() {
  [
    { kind: 'shiba', x: -2.0, z: 5.8 },
    { kind: 'bichon', x: 9.8, z: 5.5 },
    { kind: 'cat', x: -10.5, z: 5.2 }
  ].forEach((cfg) => {
    const mesh = createCutePet3D(cfg.kind, 1.0);
    mesh.position.set(cfg.x, 0.08, cfg.z);
    islandRootGroup.add(mesh);
    petActors.push({
      mesh,
      homeX: cfg.x,
      homeZ: cfg.z,
      tx: cfg.x + 2.0,
      tz: cfg.z + 0.8,
      timer: 1.5,
      puffTimer: 0.25,
      phase: Math.random() * 6
    });
  });

  [
    { style: 'stroller_a', x: -6.2, z: 5.1, label: '산책 중인 주민이 반갑게 인사하며 하트를 보냈어요!' },
    { style: 'stroller_b', x: 5.6, z: 5.4, label: '동네 단골 이웃이 해피 타운 최고라며 응원해요!' }
  ].forEach((cfg, idx) => {
    const mesh = createChibiPerson3D(cfg.style, false);
    mesh.position.set(cfg.x, 0.09, cfg.z);
    if (mesh.userData.torsoMesh) {
      mesh.userData.torsoMesh.userData = { isPettableActor: true, propRoot: mesh, label: cfg.label };
      registerPick(mesh.userData.torsoMesh);
    }
    if (mesh.userData.headMesh) {
      mesh.userData.headMesh.userData = { isPettableActor: true, propRoot: mesh, label: cfg.label };
      registerPick(mesh.userData.headMesh);
    }
    islandRootGroup.add(mesh);
    strollingActors.push({
      mesh,
      homeX: cfg.x,
      homeZ: cfg.z,
      tx: cfg.x + (idx === 0 ? 4.5 : -4.2),
      tz: cfg.z,
      timer: 1.8,
      puffTimer: 0.3,
      phase: idx * 2.4
    });
  });
}

// =========================================================
// 7. 전체 부지 빌드 & 대형 부티크 주상복합 빌딩 조립 (W=24.4, D=8.2)
// =========================================================
function buildAllLots3D() {
  for (const lot of state.lots) {
    const root = new THREE.Group();
    root.position.set(lot.x, 0, lot.z);
    root.userData.origScale = new THREE.Vector3(1, 1, 1);
    scene.add(root);

    lot3D[lot.lotId] = {
      lotId: lot.lotId,
      root,
      hoverY: 0,
      padW: 11,
      padD: 9,
      emptyGroup: null,
      signpostPivot: null,
      shellMaterials: [],
      shellLineMat: null,
      frontFacadeGroup: null,
      exteriorWindowGroup: null,
      roofCapGroup: null,
      skySignGroup: null,
      skySignMat: null,
      brassPlateMat: null,
      gfGroup: null,
      podiumGroup: null,
      floorSlabs: {},
      interiorGroup: null,
      indoorLights: [],
      infraGroup: null,
      managerGroup: null,
      elevatorCar: null,
      cropMeshes: [],
      roomGroups: {},
      roomCutawayMeta: {}
    };

    refreshLot3D(lot.lotId);
  }
}

function refreshLot3D(lotId) {
  const lot = getLot(lotId);
  const reg = lot3D[lotId];
  if (!lot || !reg) return;

  while (reg.root.children.length > 0) {
    reg.root.remove(reg.root.children[0]);
  }
  for (let i = facadeEmitters.length - 1; i >= 0; i--) {
    if (facadeEmitters[i].lotId === lotId) facadeEmitters.splice(i, 1);
  }

  reg.shellMaterials = [];
  reg.shellLineMat = null;
  reg.frontFacadeGroup = null;
  reg.exteriorWindowGroup = null;
  reg.roofCapGroup = null;
  reg.gfGroup = null;
  reg.podiumGroup = null;
  reg.floorSlabs = {};
  reg.indoorLights = [];
  reg.cropMeshes = [];
  reg.roomGroups = {};
  reg.roomCutawayMeta = {};
  reg.elevatorCar = null;
  reg.signpostPivot = null;
  reg.skySignGroup = null;
  reg.skySignMat = null;
  reg.brassPlateMat = null;

  if (!lot.owned) {
    reg.padW = 10.4;
    reg.padD = 8.4;
    const eg = buildEmptyForSaleLot3D(lot, reg);
    reg.emptyGroup = eg;
    reg.root.add(eg);
    return;
  }

  const cat = DEVELOPMENT_CATALOG[lot.devType];
  if (cat && cat.isResidential) {
    reg.padW = 28.0;
    reg.padD = 12.6;
    buildResidentialComplex3D(lot, reg);
  } else {
    reg.padW = 11.8;
    reg.padD = 9.4;
    buildIslandSpecialtyDev3D(lot, reg);
  }
}

function buildEmptyForSaleLot3D(lot, reg) {
  const g = new THREE.Group();

  const lotAO = new THREE.Mesh(GEO.quad, MAT.buildingAO);
  lotAO.rotation.x = -Math.PI / 2;
  lotAO.scale.set(11.2, 9.2, 1);
  lotAO.position.y = 0.02;
  lotAO.raycast = () => {};
  g.add(lotAO);

  const outerPlate = createRoundedToyMesh(10.2, 0.16, 8.2, MAT.basePadCream, 0, 0.08, 0, 0.36, false, true, true);
  outerPlate.userData = { lotId: lot.lotId, isEmptyLot: true };
  registerPick(outerPlate);
  g.add(outerPlate);

  const innerGrass = createRoundedToyMesh(9.2, 0.22, 7.2, makeClayMat(0xCBE4D0, { roughness: 0.76, emissiveIntensity: 0.05 }), 0, 0.13, 0, 0.3, false, true, true);
  innerGrass.userData = { lotId: lot.lotId, isEmptyLot: true };
  registerPick(innerGrass);
  g.add(innerGrass);

  g.add(createInteractiveBaseRing(10.6, 8.6, 0.05, true));

  const picketGeo = getPicketPostGeo();
  for (let x = -4.0; x <= 4.0; x += 0.8) {
    for (const z of [-3.3, 3.3]) {
      if (z > 0 && Math.abs(x) < 0.9) continue;
      const p = new THREE.Mesh(picketGeo, MAT.white);
      p.position.set(x, 0.5, z);
      p.castShadow = true;
      addToonEdgeOutline(p, MAT.toonEdge, 30);
      g.add(p);
    }
  }
  for (let z = -2.4; z <= 2.4; z += 0.8) {
    for (const x of [-4.0, 4.0]) {
      const p = new THREE.Mesh(picketGeo, MAT.white);
      p.rotation.y = Math.PI / 2;
      p.position.set(x, 0.5, z);
      p.castShadow = true;
      addToonEdgeOutline(p, MAT.toonEdge, 30);
      g.add(p);
    }
  }

  const signpostPivot = new THREE.Group();
  signpostPivot.position.set(0, 0.24, 0);
  signpostPivot.userData.origScale = new THREE.Vector3(1, 1, 1);

  const post = createRoundedToyMesh(0.28, 1.68, 0.28, MAT.woodWarm, 0, 0.84, 0, 0.1);
  const postCap = new THREE.Mesh(GEO.sphere, MAT.butter);
  postCap.scale.setScalar(0.28);
  postCap.position.set(0, 1.74, 0);
  addToonHullOutline(postCap, 1.08);

  const boardBack = createRoundedToyMesh(2.15, 1.24, 0.24, MAT.woodLight, 0, 1.26, 0.14, 0.18);
  boardBack.rotation.z = -0.05;
  const emblemFace = new THREE.Mesh(GEO.quad, makeClayMat(0xFFFFFF, { map: TEX.signEmblem, roughness: 0.45 }));
  emblemFace.scale.set(1.84, 1.02, 1);
  emblemFace.position.set(0, 1.26, 0.27);
  emblemFace.rotation.z = -0.05;

  [post, boardBack, emblemFace].forEach((m) => {
    m.userData = { lotId: lot.lotId, isEmptyLot: true };
    registerPick(m);
  });

  signpostPivot.add(post, postCap, boardBack, emblemFace);
  g.add(signpostPivot);
  reg.signpostPivot = signpostPivot;

  return g;
}

function createTwoTierStonePodium(upperW, upperD, zOffset, topY, lotId) {
  const podium = new THREE.Group();

  const aoQuad = new THREE.Mesh(GEO.quad, MAT.buildingAO);
  aoQuad.rotation.x = -Math.PI / 2;
  aoQuad.scale.set(upperW + 3.6, upperD + 3.6, 1);
  aoQuad.position.set(0, 0.025, zOffset + 0.15);
  aoQuad.raycast = () => {};
  podium.add(aoQuad);

  const h1 = topY * 0.58;
  const lowerPlinth = createRoundedToyMesh(
    upperW + 1.35,
    h1,
    upperD + 1.35,
    MAT.podiumStone,
    0,
    h1 * 0.5,
    zOffset,
    0.26
  );
  lowerPlinth.userData = { lotId };
  registerPick(lowerPlinth);
  podium.add(lowerPlinth);

  const frontStep = createRoundedToyMesh(
    Math.min(5.6, upperW * 0.3),
    h1 * 0.72,
    1.0,
    MAT.podiumStone,
    0,
    h1 * 0.36,
    zOffset + (upperD + 1.35) * 0.5 + 0.3,
    0.12
  );
  frontStep.userData = { lotId };
  registerPick(frontStep);
  podium.add(frontStep);

  const h2 = topY * 0.46;
  const upperDeck = createRoundedToyMesh(
    upperW,
    h2,
    upperD,
    MAT.podiumDeck,
    0,
    topY - h2 * 0.5,
    zOffset,
    0.22
  );
  upperDeck.userData = { lotId };
  registerPick(upperDeck);
  podium.add(upperDeck);

  const focusRing = createInteractiveBaseRing(upperW + 1.9, upperD + 1.9, 0.05, false);
  focusRing.position.z = zOffset;
  podium.add(focusRing);

  return podium;
}

function buildIslandSpecialtyDev3D(lot, reg) {
  const g = new THREE.Group();
  g.add(createTwoTierStonePodium(10.8, 8.6, 0, 0.32, lot.lotId));

  if (lot.devType === 'solar_plant') {
    const panelMat = makeClayMat(0x2563EB, { metalness: 0.25, roughness: 0.26, coolShadow: true });
    for (const rz of [-2.0, 1.7]) {
      for (const rx of [-3.1, 0, 3.1]) {
        const stand = createRoundedToyMesh(0.24, 1.05, 0.24, MAT.walnutTrim, rx, 0.65, rz, 0.08);
        const frame = createRoundedToyMesh(2.5, 0.14, 1.85, MAT.white, rx, 1.24, rz, 0.08);
        frame.rotation.x = 0.44;
        const cell = createRoundedToyMesh(2.28, 0.16, 1.65, panelMat, rx, 1.27, rz, 0.06);
        cell.rotation.x = 0.44;
        g.add(stand, frame, cell);
      }
    }
    g.add(createRoundedToyMesh(2.2, 1.5, 1.4, MAT.butterOak, -3.8, 0.95, 3.1, 0.18));
  } else if (lot.devType === 'urban_farm') {
    const soilMat = makeClayMat(0x7A4B31, { roughness: 0.85 });
    for (const rx of [-2.4, 2.4]) {
      g.add(createRoundedToyMesh(3.8, 0.36, 6.2, MAT.woodWarm, rx, 0.36, -0.2, 0.14));
      g.add(createRoundedToyMesh(3.45, 0.4, 5.85, soilMat, rx, 0.4, -0.2, 0.12));
      for (let cz = -2.2; cz <= 2.0; cz += 1.4) {
        for (const cx of [rx - 0.85, rx + 0.85]) {
          const sprout = new THREE.Mesh(GEO.sphere, MAT.cloverGreen);
          sprout.scale.set(0.44, 0.3, 0.44);
          sprout.position.set(cx, 0.67, cz);
          const berry = new THREE.Mesh(GEO.sphere, MAT.roofBrickCoral);
          berry.scale.setScalar(0.24);
          berry.position.set(cx + 0.08, 0.84, cz);
          g.add(sprout, berry);
          reg.cropMeshes.push({ sprout, berry });
        }
      }
    }
    const barn = createRoundedToyMesh(2.35, 1.72, 1.95, MAT.white, 0, 1.07, -2.8, 0.18);
    const roof = new THREE.Mesh(getPuffyDomeGeo(1.55, 1.25), MAT.roofBrickCoral);
    roof.position.set(0, 2.44, -2.8);
    addToonHullOutline(roof, 1.05);
    g.add(barn, roof);
  } else if (lot.devType === 'sakura_park') {
    g.add(createRoundedToyMesh(9.8, 0.14, 7.6, makeClayMat(0xB8DEC2), 0, 0.34, 0, 0.22));
    [[-3.1, -2.0], [3.1, -2.0], [-2.7, 2.1], [2.9, 2.1]].forEach(([tx, tz]) => {
      const tr = createFluffyPastelTree(true, 1.14);
      tr.position.set(tx, 0.34, tz);
      g.add(tr);
    });
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.9, 0.52, 26), MAT.white);
    basin.position.set(0, 0.58, 0);
    addToonEdgeOutline(basin, MAT.toonEdge, 28);
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.56, 26), MAT.sky);
    pool.position.set(0, 0.6, 0);
    g.add(basin, pool);
  } else if (lot.devType === 'bakery_cafe') {
    const body = createRoundedToyMesh(7.4, 3.25, 5.2, makeClayMat(0xFFFFFF, { map: TEX.brickMint }), 0, 1.9, -0.5, 0.22);
    const roof = createRoundedToyMesh(7.9, 0.52, 5.7, MAT.roofRoyalNavy, 0, 3.72, -0.5, 0.2);

    const signFrame = createRoundedToyMesh(5.6, 1.38, 0.3, MAT.walnutTrim, 0, 2.98, 2.15, 0.18);
    const cafeSignMat = makeClayMat(0xFFFFFF, { map: TEX.cafeSign, emissive: 0xFFB703, emissiveIntensity: 0.25, roughness: 0.28 });
    signMaterialsToRefresh.push({ mat: cafeSignMat, kind: 'cafe' });
    const signFace = new THREE.Mesh(GEO.quad, cafeSignMat);
    signFace.scale.set(5.2, 1.18, 1);
    signFace.position.set(0, 2.98, 2.32);
    signFrame.userData = { lotId: lot.lotId, isShopSign: true, shopLabel: '달콤 다방(SWEET CAFE): 크루아상 & 라떼 +92만' };
    registerPick(signFrame);

    const cafeAwning = createScallopedAwning3D(6.8, TEX.awningBrown, MAT.butterOak);
    cafeAwning.position.set(0, 2.04, 2.68);
    const cupSculpt = createCafeCupAndCroissant3D(lot.x, 0, 3.96, 1.65, lot.z);
    facadeEmitters[facadeEmitters.length - 1].lotId = lot.lotId;

    g.add(body, roof, signFrame, signFace, cafeAwning, cupSculpt);
  }

  reg.root.add(g);
}

// =========================================================
// 8. [핵심 2] 약 2배 스케일 확장! 4종 평형(원룸·투룸·쓰리룸·복층 로프트) 부티크 주상복합 빌딩
// =========================================================
function createExteriorWindowModule(w, h, trimMat, walnutMat, frameMat, paneMat, curtainMat, shellLineMat, room) {
  const wg = new THREE.Group();

  const casing = createRoundedToyMesh(w, h, 0.3, walnutMat, 0, 0, 0, 0.14, true, true, true, shellLineMat);
  const innerFrame = createRoundedToyMesh(w - 0.28, h - 0.26, 0.35, frameMat, 0, 0, 0.03, 0.1, true, true, true, shellLineMat);
  const glassPane = createRoundedToyMesh(w - 0.56, h - 0.52, 0.38, paneMat, 0, 0, 0.04, 0.06, false, false, false);

  [casing, innerFrame, glassPane].forEach((m) => {
    m.userData = { roomId: room.id, lotId: room.lotId, isRoomWindow: true };
    registerPick(m);
  });
  wg.add(casing, innerFrame, glassPane);

  // 파스텔 양개 커튼 + 상단 발란스 어닝
  const drapeW = Math.min(0.62, w * 0.15);
  const drapeL = createRoundedToyMesh(drapeW, h - 0.62, 0.41, curtainMat, -w * 0.5 + drapeW * 0.85, -0.02, 0.055, 0.09, false, false, true, shellLineMat);
  drapeL.rotation.z = 0.05;
  const drapeR = createRoundedToyMesh(drapeW, h - 0.62, 0.41, curtainMat, w * 0.5 - drapeW * 0.85, -0.02, 0.055, 0.09, false, false, true, shellLineMat);
  drapeR.rotation.z = -0.05;
  const valanceTop = createRoundedToyMesh(w + 0.16, 0.28, 0.56, trimMat, 0, h * 0.5 - 0.04, 0.14, 0.08, true, true, true, shellLineMat);
  valanceTop.rotation.x = 0.2;
  wg.add(drapeL, drapeR, valanceTop);

  // 십자(+) 창살 프레임
  const vCount = w > 7.5 ? 2 : 1;
  for (let i = 1; i <= vCount; i++) {
    const vx = -w * 0.5 + (w / (vCount + 1)) * i;
    wg.add(createRoundedToyMesh(0.14, h - 0.46, 0.44, frameMat, vx, 0, 0.075, 0.03, false, false, true, shellLineMat));
  }
  wg.add(createRoundedToyMesh(w - 0.48, 0.13, 0.44, frameMat, 0, h > 3.2 ? -0.35 : 0.04, 0.075, 0.03, false, false, true, shellLineMat));
  if (h > 3.5) {
    wg.add(createRoundedToyMesh(w - 0.48, 0.15, 0.45, walnutMat, 0, 0.55, 0.08, 0.03, false, false, true, shellLineMat));
  }

  // 창턱 우드 플랜터 박스 & 삼색 꽃화분
  wg.add(createRoundedToyMesh(w + 0.2, 0.24, 0.52, frameMat, 0, -h * 0.5 - 0.06, 0.12, 0.07, true, true, true, shellLineMat));
  const planterW = Math.min(3.4, w * 0.66);
  wg.add(createRoundedToyMesh(planterW, 0.28, 0.4, MAT.woodWarm, 0, -h * 0.5 + 0.1, 0.28, 0.07, true, true, true, shellLineMat));
  [-planterW * 0.3, 0, planterW * 0.3].forEach((fx, fi) => {
    const bush = new THREE.Mesh(GEO.sphere, MAT.cloverGreen);
    bush.scale.set(0.42, 0.26, 0.3);
    bush.position.set(fx, -h * 0.5 + 0.28, 0.29);
    const bloomMat = fi === 0 ? MAT.coral : fi === 1 ? MAT.duckYellow : MAT.white;
    const bloom = new THREE.Mesh(GEO.sphere, bloomMat);
    bloom.scale.setScalar(0.2);
    bloom.position.set(fx, -h * 0.5 + 0.42, 0.33);
    wg.add(bush, bloom);
  });

  return wg;
}

function buildResidentialComplex3D(lot, reg) {
  const b = state.buildings[lot.lotId];
  const W = GAME_BALANCE.buildingWidth; // 24.4
  const D = GAME_BALANCE.buildingDepth; // 8.2
  const isSecondComplex = lot.devType === 'mixed_2';

  reg.padW = W + 3.8;
  reg.padD = D + 4.4;

  // 1) 2단 입체 석재 기단
  const podiumGroup = createTwoTierStonePodium(W + 2.4, D + 3.2, 0.35, 0.54, lot.lotId);
  reg.podiumGroup = podiumGroup;
  reg.root.add(podiumGroup);

  // 2) 1층 상가 & 중앙 부티크 로비 (y = 0.54 ~ 4.55, 층고 4.0)
  const gfGroup = new THREE.Group();
  reg.gfGroup = gfGroup;
  gfGroup.add(createRoundedToyMesh(W, 4.0, 0.32, MAT.white, 0, 2.54, -D / 2 + 0.16, 0.1));

  for (const px of [-W / 2 + 0.18, -2.35, 2.35, W / 2 - 0.18]) {
    gfGroup.add(createRoundedToyMesh(0.42, 4.0, 0.5, MAT.walnutTrim, px, 2.54, D / 2 + 0.1, 0.08));
  }

  // 좌측 1층 대형 상가 (x = -7.25, 폭 9.2)
  gfGroup.add(createRoundedToyMesh(9.2, 0.1, D - 0.5, MAT.white, -7.25, 0.58, 0.15, 0.04));
  gfGroup.add(createRoundedToyMesh(8.4, 2.55, 0.14, MAT.glass, -7.25, 1.92, D / 2 + 0.06, 0.06, false, false, true));
  gfGroup.add(createRoundedToyMesh(2.4, 1.05, 0.95, isSecondComplex ? MAT.butterOak : MAT.roofBrickCoral, -9.8, 1.08, 1.8, 0.14));
  for (const sx of [-7.4, -5.0]) {
    gfGroup.add(createRoundedToyMesh(1.65, 1.85, 0.65, MAT.mintSoft, sx, 1.48, -0.8, 0.1));
    gfGroup.add(createRoundedToyMesh(1.45, 0.3, 0.5, MAT.butterOak, sx, 2.54, -0.8, 0.08));
  }

  if (!isSecondComplex) {
    const martBox = createRoundedToyMesh(8.6, 1.62, 0.36, MAT.roofRoyalNavy, -7.25, 3.72, D / 2 + 0.32, 0.2);
    martBox.userData = { lotId: lot.lotId, isShopSign: true, shopLabel: '해피마트 24: 24시 성업 중! (+상가수익)' };
    registerPick(martBox);

    const martSignMat = makeClayMat(0xFFFFFF, { map: TEX.martSign, emissive: 0xFFB703, emissiveIntensity: 0.26, roughness: 0.25 });
    signMaterialsToRefresh.push({ mat: martSignMat, kind: 'mart' });
    const martFace = new THREE.Mesh(GEO.quad, martSignMat);
    martFace.scale.set(8.15, 1.38, 1);
    martFace.position.set(-7.25, 3.72, D / 2 + 0.52);

    const bladeSign = createBladeSign24H3D();
    bladeSign.position.set(-W / 2 - 0.68, 3.6, D / 2 - 0.1);

    const martAwning = createScallopedAwning3D(8.7, TEX.awningCoral, MAT.roofBrickCoral);
    martAwning.position.set(-7.25, 2.75, D / 2 + 0.85);

    const aframe = createAFrameStand3D();
    aframe.position.set(-10.2, 0.55, D / 2 + 1.15);
    aframe.rotation.y = 0.24;

    const martGarland = createGarland3D(8.0, 11);
    martGarland.position.set(-7.25, 2.38, D / 2 + 1.5);
    const martBalloons = createBalloonBunch3D(1.08);
    martBalloons.position.set(-11.4, 0.55, D / 2 + 1.2);

    gfGroup.add(martBox, martFace, bladeSign, martAwning, aframe, martGarland, martBalloons);
  } else {
    const cafeBox = createRoundedToyMesh(8.6, 1.62, 0.36, MAT.walnutTrim, -7.25, 3.72, D / 2 + 0.32, 0.2);
    cafeBox.userData = { lotId: lot.lotId, isShopSign: true, shopLabel: '달콤 다방(SWEET CAFE): 수제 라떼 & 크루아상!' };
    registerPick(cafeBox);

    const cafeSignMat = makeClayMat(0xFFFFFF, { map: TEX.cafeSign, emissive: 0xFFB703, emissiveIntensity: 0.26, roughness: 0.25 });
    signMaterialsToRefresh.push({ mat: cafeSignMat, kind: 'cafe' });
    const cafeFace = new THREE.Mesh(GEO.quad, cafeSignMat);
    cafeFace.scale.set(8.15, 1.38, 1);
    cafeFace.position.set(-7.25, 3.72, D / 2 + 0.52);

    const cafeAwning = createScallopedAwning3D(8.7, TEX.awningBrown, MAT.butterOak);
    cafeAwning.position.set(-7.25, 2.75, D / 2 + 0.85);

    const cupMascot = createCafeCupAndCroissant3D(lot.x, -11.2, 3.6, D / 2 + 0.65, lot.z);
    facadeEmitters[facadeEmitters.length - 1].lotId = lot.lotId;

    gfGroup.add(cafeBox, cafeFace, cafeAwning, cupMascot);
  }

  // 우측 1층 대형 상가: 뽀송 워시 (x = +7.25, 폭 9.2)
  gfGroup.add(createRoundedToyMesh(9.2, 0.1, D - 0.5, makeClayMat(0xEFF6FF), 7.25, 0.58, 0.15, 0.04));
  gfGroup.add(createRoundedToyMesh(8.4, 2.55, 0.14, MAT.glass, 7.25, 1.92, D / 2 + 0.06, 0.06, false, false, true));
  for (let i = 0; i < 3; i++) {
    const wx = 4.9 + i * 2.25;
    gfGroup.add(createRoundedToyMesh(1.62, 1.95, 1.15, MAT.white, wx, 1.56, -1.65, 0.18));
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.14, 20), MAT.sky);
    drum.rotation.x = Math.PI / 2;
    drum.position.set(wx, 1.56, -1.04);
    addToonEdgeOutline(drum, MAT.toonEdge, 28);
    gfGroup.add(drum);
    spinningWashers.push(drum);
  }

  const washBox = createRoundedToyMesh(8.3, 1.6, 0.36, MAT.roofRoyalNavy, 7.1, 3.72, D / 2 + 0.32, 0.24);
  washBox.userData = { lotId: lot.lotId, isShopSign: true, shopLabel: '뽀송 워시(BUBBLE PONG): 24시 코인세탁 가동 중!' };
  registerPick(washBox);
  gfGroup.add(washBox);

  const washSignMat = makeClayMat(0xFFFFFF, { map: TEX.washSign, emissive: 0xFFB703, emissiveIntensity: 0.24, roughness: 0.25 });
  signMaterialsToRefresh.push({ mat: washSignMat, kind: 'wash' });
  const washFace = new THREE.Mesh(GEO.quad, washSignMat);
  washFace.scale.set(7.85, 1.36, 1);
  washFace.position.set(7.1, 3.72, D / 2 + 0.52);

  const washerMascot = createWasherMascot3D(lot.x, 11.45, 3.75, D / 2 + 0.52, lot.z);
  facadeEmitters[facadeEmitters.length - 1].lotId = lot.lotId;

  const washAwning = createScallopedAwning3D(8.6, TEX.awningSky, MAT.sky);
  washAwning.position.set(7.25, 2.75, D / 2 + 0.85);
  const washGarland = createGarland3D(8.0, 11);
  washGarland.position.set(7.25, 2.38, D / 2 + 1.5);
  gfGroup.add(washFace, washerMascot, washAwning, washGarland);

  // 중앙 부티크 아치 로비 & 황동 명패
  gfGroup.add(createRoundedToyMesh(4.1, 3.35, 0.44, MAT.walnutTrim, 0, 2.22, D / 2 + 0.14, 0.18));
  gfGroup.add(createRoundedToyMesh(3.2, 2.95, 0.48, MAT.glass, 0, 2.02, D / 2 + 0.16, 0.12, false, false, true));

  const brassFrame = createRoundedToyMesh(3.6, 0.76, 0.24, MAT.neonYellow, 0, 3.92, D / 2 + 0.38, 0.12);
  const brassMat = makeClayMat(0xFFFFFF, {
    map: createBrassNameplateTexture(b.title),
    emissive: 0xFFB703,
    emissiveIntensity: 0.26,
    roughness: 0.24,
    metalness: 0.22
  });
  reg.brassPlateMat = brassMat;
  const brassFace = new THREE.Mesh(GEO.quad, brassMat);
  brassFace.scale.set(3.32, 0.6, 1);
  brassFace.position.set(0, 3.92, D / 2 + 0.52);
  brassFrame.userData = { lotId: lot.lotId, isRenameSign: true };
  registerPick(brassFrame);
  gfGroup.add(brassFrame, brassFace);

  const martLight = new THREE.PointLight(0xFFB703, 1.8, 16, 1.4);
  martLight.position.set(-7.2, 2.9, 2.0);
  const washLight = new THREE.PointLight(0xFFB703, 1.65, 16, 1.4);
  washLight.position.set(7.2, 2.9, 2.0);
  const roomLight1 = new THREE.PointLight(0xFFB703, 1.6, 24, 1.3);
  roomLight1.position.set(-5.0, 9.5, 2.2);
  const roomLight2 = new THREE.PointLight(0xFFB703, 1.6, 24, 1.3);
  roomLight2.position.set(5.5, 15.5, 2.2);
  gfGroup.add(martLight, washLight, roomLight1, roomLight2);
  reg.indoorLights.push(roomLight1, roomLight2);

  reg.root.add(gfGroup);

  // 3) 층간 슬래브 (1층 상가 위, 2층 쓰리룸 바닥, 3층 스튜디오/복층 바닥)
  const makeSlabAtY = (yPos) => {
    const sg = new THREE.Group();
    sg.add(createRoundedToyMesh(W + 0.55, 0.3, D + 0.55, MAT.slab, 0, yPos, 0.15, 0.1));
    sg.add(createRoundedToyMesh(W + 0.78, 0.16, D + 0.78, MAT.walnutTrim, 0, yPos + 0.11, 0.15, 0.06));
    reg.root.add(sg);
    return sg;
  };
  reg.floorSlabs[1] = makeSlabAtY(4.66);
  reg.floorSlabs[2] = makeSlabAtY(9.28);
  reg.floorSlabs[3] = makeSlabAtY(14.10);

  // 4) 5개 입체 호실 인테리어 그룹 (101 원룸, 102 투룸, 201 쓰리룸 펜트하우스, 301 스튜디오, 302 복층 로프트)
  const interiorGroup = new THREE.Group();
  reg.interiorGroup = interiorGroup;
  reg.root.add(interiorGroup);

  for (const room of b.rooms) {
    const rg = new THREE.Group();
    rg.position.set(room.lx, room.ly, room.lz);
    rg.userData.baseY = room.ly;
    rg.userData.origScale = new THREE.Vector3(1, 1, 1);
    interiorGroup.add(rg);
    reg.roomGroups[room.id] = rg;
    rebuildRoom3D(room);
  }

  // 5) 고대비 외벽 쉘 & 클릭 즉시 전체화면 룸 뷰로 진입하는 파노라마 창문 모듈
  const shellLineMat = new THREE.LineBasicMaterial({
    color: 0x4A3B32,
    transparent: true,
    opacity: 0.82
  });
  reg.shellLineMat = shellLineMat;

  const facadeTex = isSecondComplex ? TEX.brickMint : TEX.brickWarm;
  const facadeMat = makeClayMat(0xFFFDF9, { map: facadeTex, roughness: 0.56, transparent: true, opacity: 1.0 });
  const trimAccentMat = makeClayMat(isSecondComplex ? 0xF6BD60 : 0xF28482, { roughness: 0.44, transparent: true, opacity: 1.0 });
  const walnutShellMat = makeClayMat(0x4A3B32, { roughness: 0.48, emissiveIntensity: 0.05, transparent: true, opacity: 1.0 });
  const roofMat = makeClayMat(isSecondComplex ? 0x3D5A80 : 0xE05A47, { roughness: 0.46, transparent: true, opacity: 1.0, coolShadow: isSecondComplex });
  const skyPaneMat = new THREE.MeshStandardMaterial({
    color: isSecondComplex ? 0x99F6E4 : 0xBAE6FD,
    emissive: 0x7DD3FC,
    emissiveIntensity: 0.34,
    roughness: 0.14,
    metalness: 0.08,
    transparent: true,
    opacity: 0.82
  });
  const whiteFrameShellMat = makeClayMat(0xFFFFFF, { roughness: 0.38, transparent: true, opacity: 1.0 });
  const curtainCoralShellMat = makeClayMat(0xFF8FA3, { roughness: 0.52, transparent: true, opacity: 1.0 });
  const curtainMintShellMat = makeClayMat(0x6EE7B7, { roughness: 0.52, transparent: true, opacity: 1.0 });
  const curtainButterShellMat = makeClayMat(0xFDE068, { roughness: 0.52, transparent: true, opacity: 1.0 });

  reg.shellMaterials.push(
    facadeMat,
    trimAccentMat,
    walnutShellMat,
    roofMat,
    skyPaneMat,
    whiteFrameShellMat,
    curtainCoralShellMat,
    curtainMintShellMat,
    curtainButterShellMat
  );

  const frontFacade = new THREE.Group();
  reg.frontFacadeGroup = frontFacade;

  // 좌측 3층 스튜디오 라인 외벽 & 측면/후면 벽돌 마감 (외관 100% 일체감 확보)
  const leftFacadeWall = createRoundedToyMesh(10.8, 14.0, 0.32, facadeMat, -6.8, 11.75, D / 2 + 0.34, 0.16, true, true, true, shellLineMat);
  leftFacadeWall.userData = { lotId: lot.lotId, isShell: true };
  // 우측 복층 로프트 타워 외벽 — 층고가 1.8배 솟은 스카이라인!
  const rightLoftFacadeWall = createRoundedToyMesh(13.8, 17.35, 0.32, facadeMat, 5.3, 13.42, D / 2 + 0.34, 0.16, true, true, true, shellLineMat);
  rightLoftFacadeWall.userData = { lotId: lot.lotId, isShell: true };

  // 측면·후면·단차 외벽 쉘 추가 (아이소메트릭 측면에서도 건물 외벽이 꽉 차 보이게 마감)
  const rightSideShell = createRoundedToyMesh(0.32, 21.5, D + 0.5, facadeMat, W / 2 + 0.04, 11.3, 0.15, 0.12, true, true, true, shellLineMat);
  const leftSideShell = createRoundedToyMesh(0.32, 18.2, D + 0.5, facadeMat, -W / 2 - 0.04, 9.65, 0.15, 0.12, true, true, true, shellLineMat);
  const stepSideShell = createRoundedToyMesh(0.32, 3.6, D + 0.5, facadeMat, -1.48, 20.35, 0.15, 0.1, true, true, true, shellLineMat);
  const backLowerShell = createRoundedToyMesh(10.8, 14.0, 0.3, facadeMat, -6.8, 11.75, -D / 2 - 0.05, 0.12, true, true, true, shellLineMat);
  const backLoftShell = createRoundedToyMesh(13.8, 17.35, 0.3, facadeMat, 5.3, 13.42, -D / 2 - 0.05, 0.12, true, true, true, shellLineMat);

  frontFacade.add(leftFacadeWall, rightLoftFacadeWall, rightSideShell, leftSideShell, stepSideShell, backLowerShell, backLoftShell);

  // 모서리 월넛 필라스터 & 층간 코랄/버터 벨트 몰딩
  frontFacade.add(createRoundedToyMesh(0.34, 14.1, 0.42, walnutShellMat, -W / 2 - 0.04, 11.75, D / 2 + 0.38, 0.06, true, true, true, shellLineMat));
  frontFacade.add(createRoundedToyMesh(0.34, 17.4, 0.42, walnutShellMat, -1.48, 13.42, D / 2 + 0.38, 0.06, true, true, true, shellLineMat));
  frontFacade.add(createRoundedToyMesh(0.34, 17.4, 0.42, walnutShellMat, W / 2 + 0.04, 13.42, D / 2 + 0.38, 0.06, true, true, true, shellLineMat));
  frontFacade.add(createRoundedToyMesh(W + 0.6, 0.28, 0.44, trimAccentMat, 0, 9.28, D / 2 + 0.39, 0.06, true, true, true, shellLineMat));
  frontFacade.add(createRoundedToyMesh(W + 0.6, 0.28, 0.44, trimAccentMat, 0, 14.10, D / 2 + 0.39, 0.06, true, true, true, shellLineMat));

  // 평형 크기에 맞춰 비례가 다른 입체 아파트 창문 모듈 + 방 전체 외벽 클릭 히트박스 배치
  const exteriorWindowGroup = new THREE.Group();
  const curtains = [curtainCoralShellMat, curtainMintShellMat, curtainButterShellMat];
  const invisibleHitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });

  b.rooms.forEach((rm, idx) => {
    const winW = Math.min(rm.rw - 2.4, rm.layoutType === 'threeroom' ? 18.6 : rm.layoutType === 'tworoom' ? 10.6 : rm.layoutType === 'loft' ? 9.8 : 5.8);
    const winH = rm.layoutType === 'loft' ? 5.2 : 2.35;
    const winY = rm.ly + rm.rh * 0.52;
    const wMod = createExteriorWindowModule(
      winW,
      winH,
      trimAccentMat,
      walnutShellMat,
      whiteFrameShellMat,
      skyPaneMat,
      curtains[idx % curtains.length],
      shellLineMat,
      rm
    );
    wMod.position.set(rm.lx, winY, D / 2 + 0.42);
    exteriorWindowGroup.add(wMod);

    // 외관 어느 구역을 클릭해도 해당 방의 전체화면 단독 룸 뷰로 직행하는 넉넉한 정면 히트박스
    const roomFacadeHit = new THREE.Mesh(GEO.quad, invisibleHitMat);
    roomFacadeHit.scale.set(rm.rw - 0.2, rm.rh - 0.2, 1);
    roomFacadeHit.position.set(rm.lx, rm.ly + rm.rh * 0.5, D / 2 + 0.68);
    roomFacadeHit.userData = { roomId: rm.id, lotId: lot.lotId, isRoomWindow: true };
    registerPick(roomFacadeHit);
    exteriorWindowGroup.add(roomFacadeHit);
  });

  reg.exteriorWindowGroup = exteriorWindowGroup;
  frontFacade.add(exteriorWindowGroup);
  reg.root.add(frontFacade);

  // 6) 비대칭 스텝 루프 (좌측 301호 스튜디오 루프 + 우측 302호 하이실링 복층 로프트 루프 + 발광 옥상 현판)
  const roofCapGroup = new THREE.Group();
  // 좌측 301호 위 지붕 (y = 18.85)
  roofCapGroup.add(createRoundedToyMesh(11.4, 0.24, D + 1.3, walnutShellMat, -6.7, 18.72, 0.15, 0.1, true, true, true, shellLineMat));
  roofCapGroup.add(createRoundedToyMesh(11.1, 0.56, D + 1.1, roofMat, -6.7, 19.08, 0.15, 0.22, true, true, true, shellLineMat));

  // 우측 302호 복층 로프트 지붕 (y = 22.15)
  roofCapGroup.add(createRoundedToyMesh(14.6, 0.26, D + 1.4, walnutShellMat, 5.2, 22.05, 0.15, 0.1, true, true, true, shellLineMat));
  roofCapGroup.add(createRoundedToyMesh(14.3, 0.64, D + 1.2, roofMat, 5.2, 22.42, 0.15, 0.24, true, true, true, shellLineMat));
  roofCapGroup.add(createRoundedToyMesh(1.15, 1.35, 1.15, trimAccentMat, 10.2, 23.25, -1.6, 0.14, true, true, true, shellLineMat));

  const { group: skySignGroup, skyMat } = createRooftopSkySign3D(b.title, lot.lotId, !isSecondComplex);
  skySignGroup.position.set(4.8, 22.68, D / 2 + 0.25);
  reg.skySignGroup = skySignGroup;
  reg.skySignMat = skyMat;

  const roofBalloonL = createBalloonBunch3D(1.15);
  roofBalloonL.position.set(-10.8, 19.35, 2.6);
  const roofBalloonR = createBalloonBunch3D(1.15);
  roofBalloonR.position.set(10.8, 22.75, 2.6);
  roofCapGroup.add(skySignGroup, roofBalloonL, roofBalloonR);

  reg.roofCapGroup = roofCapGroup;
  reg.root.add(roofCapGroup);

  const infraGroup = new THREE.Group();
  const managerGroup = new THREE.Group();
  reg.infraGroup = infraGroup;
  reg.managerGroup = managerGroup;
  reg.root.add(infraGroup, managerGroup);

  rebuildPublicInfraAndManager3D(lot.lotId);
  syncBuildingResidents3D(lot.lotId);
}

// =========================================================
// 9. 공용시설 4종 & 야외 지배인 부스 조립
// =========================================================
function rebuildPublicInfraAndManager3D(lotId) {
  const b = state.buildings[lotId];
  const reg = lot3D[lotId];
  if (!b || !reg) return;

  while (reg.infraGroup.children.length > 0) reg.infraGroup.remove(reg.infraGroup.children[0]);
  while (reg.managerGroup.children.length > 0) reg.managerGroup.remove(reg.managerGroup.children[0]);
  reg.elevatorCar = null;

  const W = GAME_BALANCE.buildingWidth;

  if (b.infra.elevator) {
    const shaftX = W / 2 + 1.55;
    const shaft = createRoundedToyMesh(2.5, 21.4, 2.5, MAT.glass, shaftX, 11.2, 0.4, 0.18, false, false, true);
    const topCap = createRoundedToyMesh(2.85, 0.56, 2.85, MAT.roofRoyalNavy, shaftX, 22.15, 0.4, 0.18);
    const car = createRoundedToyMesh(1.98, 2.35, 1.98, MAT.butterOak, shaftX, 5.2, 0.4, 0.2);
    shaft.userData = { lotId };
    registerPick(shaft);
    reg.infraGroup.add(shaft, topCap, car);
    reg.elevatorCar = car;
  } else {
    for (let s = 0; s < 10; s++) {
      reg.infraGroup.add(createRoundedToyMesh(1.45, 0.28, 0.68, MAT.woodWarm, W / 2 + 1.05, 0.95 + s * 0.85, 3.2 - s * 0.55, 0.08));
    }
  }

  const recX = -W / 2 - 2.1;
  const recPad = createRoundedToyMesh(3.5, 0.16, 2.4, MAT.podiumDeck, recX, 0.56, 2.1, 0.12);
  recPad.userData = { lotId, openNotebookTab: 'infra' };
  registerPick(recPad);
  reg.infraGroup.add(recPad);
  const recRing = createInteractiveBaseRing(3.7, 2.6, 0.65, true);
  recRing.position.set(recX, 0, 2.1);
  reg.infraGroup.add(recRing);

  if (b.infra.recycling) {
    reg.infraGroup.add(createRoundedToyMesh(3.1, 0.26, 1.9, MAT.mint, recX, 2.35, 2.1, 0.1));
    [MAT.sky, MAT.mint, MAT.butterOak].forEach((m, idx) => {
      const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.35, 1.1, 18), m);
      bin.position.set(recX - 0.85 + idx * 0.85, 1.12, 2.1);
      addToonEdgeOutline(bin, MAT.toonEdge, 28);
      reg.infraGroup.add(bin);
    });
  } else {
    for (let i = 0; i < 3; i++) {
      const bag = new THREE.Mesh(GEO.sphere, MAT.trashBag);
      bag.scale.set(0.6, 0.5, 0.6);
      bag.position.set(recX - 0.5 + i * 0.5, 0.84, 2.1 + (i % 2) * 0.25);
      addToonHullOutline(bag, 1.07);
      reg.infraGroup.add(bag);
    }
  }

  if (b.infra.parcel_box) {
    reg.infraGroup.add(createRoundedToyMesh(1.85, 2.25, 0.82, MAT.roofBrickCoral, 3.1, 1.68, 4.65, 0.14));
    reg.infraGroup.add(createRoundedToyMesh(0.55, 0.48, 0.86, MAT.screenCyan, 3.1, 1.9, 4.68, 0.05));
  }

  // 좌측 301호 지붕 위 옥상 루프탑가든 테라스 (y = 19.38)
  if (b.infra.rooftop_garden) {
    reg.infraGroup.add(createRoundedToyMesh(9.8, 0.26, 6.4, makeClayMat(0x86EFAC), -6.7, 19.45, 0.15, 0.16));
    for (const tx of [-9.5, -3.9]) {
      const miniTree = createFluffyPastelTree(tx < -6.7, 0.88);
      miniTree.position.set(tx, 19.52, -0.8);
      reg.infraGroup.add(miniTree);
    }
    const bench = createParkBench3D();
    bench.position.set(-6.7, 19.55, 1.2);
    reg.infraGroup.add(bench);
  }

  if (b.manager.hired) {
    const booth = new THREE.Group();
    booth.position.set(0.0, 0.55, 5.95);

    const mgrPad = createRoundedToyMesh(3.2, 0.12, 2.4, MAT.podiumDeck, 0.35, 0.04, 0.05, 0.1);
    const mgrRing = createInteractiveBaseRing(3.45, 2.65, 0.12, true);
    mgrRing.position.set(0.35, 0, 0.05);
    booth.add(mgrPad, mgrRing);

    const bBody = createRoundedToyMesh(1.95, 2.15, 1.62, MAT.white, 0, 1.08, 0, 0.16);
    bBody.userData = { lotId, openNotebookTab: 'manager' };
    registerPick(bBody);
    booth.add(bBody);
    booth.add(createRoundedToyMesh(2.24, 0.36, 1.9, MAT.roofRoyalNavy, 0, 2.28, 0, 0.12));
    booth.add(createRoundedToyMesh(1.52, 0.78, 1.68, MAT.glass, 0, 1.38, 0, 0.06, false, false, true));

    const mgr = createChibiPerson3D('manager', false);
    mgr.position.set(1.55, 0.08, 0.25);
    booth.add(mgr);
    booth.userData.mgrMesh = mgr;
    reg.managerGroup.add(booth);
  }
}

// =========================================================
// 10. [핵심 3] 카탈로그 16종 커스텀 3D 가구·가전 조립 함수
// =========================================================
function createPottedPlant3D(x, y, z, scale = 1.0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.23, 0.44, 16), MAT.coral);
  pot.position.y = 0.22;
  pot.castShadow = true;
  addToonEdgeOutline(pot, MAT.toonEdge, 30);
  const leaf1 = new THREE.Mesh(GEO.sphere, MAT.leafGreen);
  leaf1.scale.set(0.56, 0.64, 0.56);
  leaf1.position.y = 0.64;
  leaf1.castShadow = true;
  addToonHullOutline(leaf1, 1.07);
  g.add(pot, leaf1);
  g.scale.setScalar(scale);
  return g;
}

function createWarmMoodStandLamp3D(x, y, z, withPointLight = false) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.add(createRoundedToyMesh(0.44, 0.1, 0.44, MAT.gold, 0, 0.05, 0, 0.05));
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.55, 12), MAT.gold);
  pole.position.y = 0.82;
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.46, 0.52, 20), MAT.neonYellow);
  shade.position.y = 1.66;
  addToonEdgeOutline(shade, MAT.toonEdge, 30);
  g.add(pole, shade);
  if (withPointLight) {
    const pt = new THREE.PointLight(0xFFD166, 1.15, 7.5, 1.6);
    pt.position.set(0, 1.55, 0);
    g.add(pt);
  }
  return g;
}

// 10-A. 침실/침대 4종 (bed_iron / bed_queen / bed_canopy / bed_bunk)
function createCatalogBed3D(bedId = 'bed_iron') {
  const g = new THREE.Group();
  g.userData.origScale = new THREE.Vector3(1, 1, 1);

  if (bedId === 'bed_iron') {
    // 심플 철제 침대
    const w = 1.85;
    const d = 2.65;
    g.add(createRoundedToyMesh(w, 0.18, d, MAT.ironSteel, 0, 0.28, 0, 0.06));
    // 철제 헤드보드 & 풋보드 창살
    g.add(createRoundedToyMesh(w, 1.05, 0.12, MAT.ironSteel, 0, 0.68, -d / 2 + 0.06, 0.05));
    g.add(createRoundedToyMesh(w, 0.68, 0.12, MAT.ironSteel, 0, 0.48, d / 2 - 0.06, 0.05));
    g.add(createRoundedToyMesh(w - 0.14, 0.26, d - 0.2, MAT.white, 0, 0.48, 0, 0.1));
    g.add(createRoundedToyMesh(w - 0.1, 0.28, d * 0.62, MAT.sky, 0, 0.52, d * 0.16, 0.12));
    g.add(createRoundedToyMesh(0.86, 0.18, 0.48, MAT.white, 0, 0.66, -d * 0.28, 0.09));
  } else if (bedId === 'bed_queen') {
    // 코지 원목 퀸침대 + 협탁 무드등
    const w = 2.55;
    const d = 2.85;
    g.add(createRoundedToyMesh(w + 0.16, 0.28, d + 0.12, MAT.woodWarm, 0, 0.22, 0, 0.12));
    g.add(createRoundedToyMesh(w + 0.2, 1.18, 0.22, MAT.woodWarm, 0, 0.72, -d / 2 + 0.08, 0.14));
    g.add(createRoundedToyMesh(w - 0.1, 0.28, d - 0.14, MAT.white, 0, 0.48, 0.04, 0.12));
    g.add(createRoundedToyMesh(w - 0.04, 0.3, d * 0.64, MAT.mintSoft, 0, 0.54, d * 0.16, 0.14));
    g.add(createRoundedToyMesh(0.86, 0.2, 0.48, MAT.white, -0.54, 0.7, -d * 0.28, 0.1));
    g.add(createRoundedToyMesh(0.86, 0.2, 0.48, MAT.butter, 0.54, 0.7, -d * 0.28, 0.1));
    // 원목 협탁 & 미니 램프
    g.add(createRoundedToyMesh(0.68, 0.58, 0.62, MAT.woodLight, w * 0.5 + 0.52, 0.32, -d * 0.32, 0.08));
    const bulb = new THREE.Mesh(GEO.sphere, MAT.neonYellow);
    bulb.scale.setScalar(0.32);
    bulb.position.set(w * 0.5 + 0.52, 0.78, -d * 0.32);
    g.add(bulb);
  } else if (bedId === 'bed_canopy') {
    // 핑크 프린세스 캐노피 침대 (4기둥 + 상단 캐노피 프레임 + 핑크 레이스 커튼)
    const w = 2.6;
    const d = 2.88;
    const postH = 2.85;
    g.add(createRoundedToyMesh(w + 0.12, 0.3, d + 0.12, MAT.white, 0, 0.24, 0, 0.14));
    g.add(createRoundedToyMesh(w, 1.28, 0.22, MAT.pinkSoft, 0, 0.78, -d / 2 + 0.1, 0.18));
    g.add(createRoundedToyMesh(w - 0.08, 0.28, d - 0.14, MAT.white, 0, 0.5, 0.04, 0.12));
    g.add(createRoundedToyMesh(w - 0.02, 0.32, d * 0.65, MAT.coral, 0, 0.56, d * 0.16, 0.15));
    g.add(createRoundedToyMesh(0.84, 0.2, 0.48, MAT.pinkSoft, -0.54, 0.72, -d * 0.28, 0.1));
    g.add(createRoundedToyMesh(0.84, 0.2, 0.48, MAT.white, 0.54, 0.72, -d * 0.28, 0.1));

    // 4개 골드·화이트 캐노피 기둥 + 상단 레이스 캐노피
    for (const px of [-w / 2, w / 2]) {
      for (const pz of [-d / 2, d / 2]) {
        g.add(createRoundedToyMesh(0.14, postH, 0.14, MAT.gold, px, postH * 0.5 + 0.1, pz, 0.05));
        const finial = new THREE.Mesh(GEO.sphere, MAT.neonYellow);
        finial.scale.setScalar(0.22);
        finial.position.set(px, postH + 0.16, pz);
        g.add(finial);

        const drape = createRoundedToyMesh(0.38, postH - 0.55, 0.38, MAT.canopyLace, px * 0.94, postH * 0.5, pz * 0.94, 0.12, false, false, false);
        g.add(drape);
      }
    }
    g.add(createRoundedToyMesh(w + 0.22, 0.18, d + 0.22, MAT.pinkSoft, 0, postH + 0.02, 0, 0.08));
    const roofVeil = createRoundedToyMesh(w - 0.06, 0.1, d - 0.06, MAT.canopyLace, 0, postH - 0.04, 0, 0.06, false, false, false);
    g.add(roofVeil);
  } else {
    // 패밀리 원목 2층 침대 (bed_bunk)
    const w = 1.95;
    const d = 2.82;
    for (const px of [-w / 2 + 0.08, w / 2 - 0.08]) {
      for (const pz of [-d / 2 + 0.08, d / 2 - 0.08]) {
        g.add(createRoundedToyMesh(0.18, 2.68, 0.18, MAT.woodWarm, px, 1.38, pz, 0.06));
      }
    }
    // 1층 침상
    g.add(createRoundedToyMesh(w, 0.24, d, MAT.woodLight, 0, 0.42, 0, 0.08));
    g.add(createRoundedToyMesh(w - 0.1, 0.24, d * 0.64, MAT.mint, 0, 0.56, d * 0.14, 0.1));
    g.add(createRoundedToyMesh(0.84, 0.18, 0.44, MAT.butter, 0, 0.66, -d * 0.28, 0.08));

    // 2층 침상 & 안전 난간 & 원목 사다리
    g.add(createRoundedToyMesh(w, 0.24, d, MAT.woodLight, 0, 1.78, 0, 0.08));
    g.add(createRoundedToyMesh(w - 0.1, 0.24, d * 0.64, MAT.sky, 0, 1.92, d * 0.14, 0.1));
    g.add(createRoundedToyMesh(0.84, 0.18, 0.44, MAT.coral, 0, 2.02, -d * 0.28, 0.08));
    g.add(createRoundedToyMesh(0.1, 0.42, d - 0.3, MAT.woodLight, w / 2 - 0.08, 2.18, 0, 0.04));

    for (let r = 0; r < 5; r++) {
      g.add(createRoundedToyMesh(0.12, 0.09, 0.56, MAT.butter, w / 2 + 0.04, 0.58 + r * 0.34, d * 0.28, 0.03));
    }
  }

  return g;
}

// 10-B. 거실/소파 4종 (sofa_beanbag / sofa_mint2 / sofa_leather_l / sofa_rocker)
function createCatalogSofa3D(sofaId = 'sofa_beanbag') {
  const g = new THREE.Group();
  g.userData.origScale = new THREE.Vector3(1, 1, 1);

  if (sofaId === 'sofa_beanbag') {
    // 1인용 옐로우 빈백 + 원형 러그 + 발받침 스툴
    const rug = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.05, 24), MAT.cream);
    rug.position.set(0, 0.03, 0.15);
    g.add(rug);

    const bagBase = new THREE.Mesh(GEO.sphere, MAT.duckYellow);
    bagBase.scale.set(1.58, 0.92, 1.52);
    bagBase.position.set(0, 0.44, 0);
    bagBase.castShadow = true;
    addToonHullOutline(bagBase, 1.06);

    const bagBack = new THREE.Mesh(GEO.sphere, MAT.butterOak);
    bagBack.scale.set(1.12, 0.96, 0.95);
    bagBack.position.set(0, 0.78, -0.28);
    bagBack.castShadow = true;
    addToonHullOutline(bagBack, 1.06);

    const pouf = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.32, 18), MAT.coral);
    pouf.position.set(0.95, 0.18, 0.58);
    addToonEdgeOutline(pouf, MAT.toonEdge, 30);
    g.add(bagBase, bagBack, pouf);
  } else if (sofaId === 'sofa_mint2') {
    // 민트 패브릭 2인 소파 + 원형 티테이블
    const w = 2.45;
    g.add(createRoundedToyMesh(w + 0.9, 0.05, 2.35, MAT.cream, 0, 0.03, 0.42, 0.16, false, true));
    g.add(createRoundedToyMesh(w, 0.42, 1.08, MAT.mint, 0, 0.28, 0, 0.16));
    g.add(createRoundedToyMesh(w, 0.92, 0.34, MAT.mint, 0, 0.64, -0.38, 0.16));
    g.add(createRoundedToyMesh(0.32, 0.68, 1.1, MAT.mintSoft, -w / 2 + 0.16, 0.48, 0, 0.14));
    g.add(createRoundedToyMesh(0.32, 0.68, 1.1, MAT.mintSoft, w / 2 - 0.16, 0.48, 0, 0.14));
    g.add(createRoundedToyMesh(0.46, 0.38, 0.24, MAT.butter, -w * 0.25, 0.66, -0.14, 0.1));
    g.add(createRoundedToyMesh(0.46, 0.38, 0.24, MAT.coral, w * 0.25, 0.66, -0.14, 0.1));

    const tblTop = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.12, 20), MAT.white);
    tblTop.position.set(0, 0.52, 1.12);
    addToonEdgeOutline(tblTop, MAT.toonEdge, 30);
    const tblPed = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.24, 0.5, 14), MAT.woodLight);
    tblPed.position.set(0, 0.25, 1.12);
    g.add(tblTop, tblPed);
  } else if (sofaId === 'sofa_leather_l') {
    // 고급 가죽 L자형 패밀리 소파 + 골드 대리석 테이블
    const w = 3.15;
    g.add(createRoundedToyMesh(w + 1.0, 0.06, 2.95, MAT.cream, 0, 0.03, 0.65, 0.18, false, true));
    // 메인 가로 소파
    g.add(createRoundedToyMesh(w, 0.44, 1.12, MAT.leatherCamel, 0, 0.3, 0, 0.16));
    g.add(createRoundedToyMesh(w, 0.96, 0.36, MAT.woodDark, 0, 0.66, -0.4, 0.16));
    g.add(createRoundedToyMesh(0.34, 0.7, 1.14, MAT.woodDark, -w / 2 + 0.17, 0.48, 0, 0.14));
    // 우측 연장 L자 카우치 섹션
    g.add(createRoundedToyMesh(1.18, 0.44, 2.25, MAT.leatherCamel, w / 2 - 0.59, 0.3, 0.58, 0.16));
    g.add(createRoundedToyMesh(0.32, 0.7, 2.25, MAT.woodDark, w / 2 - 0.16, 0.48, 0.58, 0.14));
    // 쿠션 & 골드 테이블
    g.add(createRoundedToyMesh(0.5, 0.4, 0.24, MAT.butterOak, -0.85, 0.68, -0.14, 0.1));
    g.add(createRoundedToyMesh(0.5, 0.4, 0.24, MAT.white, 0.15, 0.68, -0.14, 0.1));
    g.add(createRoundedToyMesh(1.38, 0.12, 0.82, MAT.white, -0.48, 0.48, 1.18, 0.1));
    g.add(createRoundedToyMesh(1.26, 0.42, 0.7, MAT.gold, -0.48, 0.22, 1.18, 0.08));
  } else {
    // 노부부용 원목 흔들의자 세트 + 전통 다도상 & 주전자
    g.add(createRoundedToyMesh(3.2, 0.05, 2.4, MAT.mintSoft, 0, 0.03, 0.35, 0.16, false, true));
    for (const rx of [-1.05, 1.05]) {
      const rk = new THREE.Group();
      rk.position.set(rx, 0, 0.15);
      rk.rotation.y = rx < 0 ? 0.32 : -0.32;
      rk.add(createRoundedToyMesh(0.86, 0.14, 0.84, MAT.woodWarm, 0, 0.46, 0, 0.08));
      rk.add(createRoundedToyMesh(0.86, 0.88, 0.15, MAT.woodWarm, 0, 0.86, -0.34, 0.08));
      rk.add(createRoundedToyMesh(0.72, 0.14, 0.68, MAT.butter, 0, 0.56, 0.02, 0.08));
      rk.add(createRoundedToyMesh(0.14, 0.18, 1.18, MAT.woodDark, -0.36, 0.12, 0, 0.06));
      rk.add(createRoundedToyMesh(0.14, 0.18, 1.18, MAT.woodDark, 0.36, 0.12, 0, 0.06));
      rk.add(createRoundedToyMesh(0.14, 0.36, 0.14, MAT.woodDark, -0.36, 0.3, -0.25, 0.04));
      rk.add(createRoundedToyMesh(0.14, 0.36, 0.14, MAT.woodDark, 0.36, 0.3, -0.25, 0.04));
      g.add(rk);
    }
    // 중앙 전통 다도 찻상 & 다기
    g.add(createRoundedToyMesh(1.12, 0.12, 0.86, MAT.woodDark, 0, 0.42, 0.35, 0.08));
    g.add(createRoundedToyMesh(0.92, 0.36, 0.68, MAT.woodWarm, 0, 0.2, 0.35, 0.06));
    const teapot = new THREE.Mesh(GEO.sphere, MAT.mint);
    teapot.scale.setScalar(0.3);
    teapot.position.set(0, 0.62, 0.35);
    addToonHullOutline(teapot, 1.07);
    g.add(teapot);
  }

  return g;
}

// 10-C. 주방/가전/특수시설 4종 (app_fan / app_ac / app_rgb_desk / app_soundmat)
function createCatalogAppliance3D(appId = 'app_fan', RW = 9.0, RD = 7.5, RH = 4.25, localPos = { x: 2.0, z: -2.2 }) {
  const g = new THREE.Group();
  g.userData.origScale = new THREE.Vector3(1, 1, 1);

  if (appId === 'app_fan') {
    // 보급형 스탠드 선풍기 (실제 회전 날개!) + 미니 협탁
    const stand = new THREE.Group();
    stand.position.set(localPos.x, 0.15, localPos.z);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.12, 20), MAT.white);
    base.position.y = 0.06;
    addToonEdgeOutline(base, MAT.toonEdge, 30);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.28, 12), MAT.silver);
    pole.position.y = 0.7;
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.16, 22), MAT.sky);
    cage.rotation.x = Math.PI / 2;
    cage.position.set(0, 1.42, 0.08);
    addToonEdgeOutline(cage, MAT.toonEdge, 30);

    const bladePivot = new THREE.Group();
    bladePivot.position.set(0, 1.42, 0.18);
    for (let i = 0; i < 3; i++) {
      const b = createRoundedToyMesh(0.14, 0.38, 0.04, MAT.white, 0, 0.18, 0, 0.04, false, false, false);
      const wrap = new THREE.Group();
      wrap.rotation.z = (Math.PI * 2 * i) / 3;
      wrap.add(b);
      bladePivot.add(wrap);
    }
    spinningFans.push(bladePivot);
    stand.add(base, pole, cage, bladePivot);
    g.add(stand);
  } else if (appId === 'app_ac') {
    // 무풍 벽걸이 에어컨 (뒷벽 상단 부착) + 파스텔 레트로 미니 냉장고
    const ac = new THREE.Group();
    ac.position.set(localPos.x, Math.min(RH - 0.85, 3.25), -RD / 2 + 0.42);
    ac.add(createRoundedToyMesh(2.35, 0.62, 0.48, MAT.white, 0, 0, 0, 0.14));
    ac.add(createRoundedToyMesh(2.05, 0.12, 0.5, MAT.screenCyan, 0, -0.18, 0.02, 0.04, false, false, false));
    g.add(ac);

    const fridge = new THREE.Group();
    fridge.position.set(localPos.x, 0.15, localPos.z);
    fridge.add(createRoundedToyMesh(1.18, 1.98, 0.92, MAT.mintSoft, 0, 0.99, 0, 0.2));
    fridge.add(createRoundedToyMesh(1.2, 0.06, 0.94, MAT.white, 0, 1.28, 0, 0.02));
    fridge.add(createRoundedToyMesh(0.1, 0.36, 0.12, MAT.gold, -0.42, 1.56, 0.48, 0.04));
    fridge.add(createRoundedToyMesh(0.1, 0.52, 0.12, MAT.gold, -0.42, 0.86, 0.48, 0.04));
    g.add(fridge);
  } else if (appId === 'app_rgb_desk') {
    // RGB 트리플 모니터 게이밍 데스크 + RGB 본체 + 게이밍 체어
    const desk = new THREE.Group();
    desk.position.set(localPos.x, 0.15, localPos.z);
    desk.add(createRoundedToyMesh(2.75, 0.16, 1.08, MAT.charcoal, 0, 0.84, 0, 0.08));
    desk.add(createRoundedToyMesh(2.78, 0.06, 1.1, MAT.neonCoral, 0, 0.84, 0.02, 0.03, false, false, false));
    desk.add(createRoundedToyMesh(0.18, 0.84, 0.95, MAT.charcoal, -1.18, 0.42, 0, 0.06));
    desk.add(createRoundedToyMesh(0.18, 0.84, 0.95, MAT.charcoal, 1.18, 0.42, 0, 0.06));

    const screens = [MAT.screenPurple, MAT.screenCyan, MAT.screenPink];
    [-0.82, 0, 0.82].forEach((mx, idx) => {
      const monFrame = createRoundedToyMesh(0.78, 0.54, 0.08, MAT.charcoal, mx, 1.28, idx === 1 ? -0.24 : -0.1, 0.05);
      const monGlow = createRoundedToyMesh(0.68, 0.44, 0.09, screens[idx], mx, 1.28, idx === 1 ? -0.23 : -0.09, 0.04, false, false, false);
      const rot = idx === 0 ? 0.3 : idx === 2 ? -0.3 : 0;
      monFrame.rotation.y = rot;
      monGlow.rotation.y = rot;
      desk.add(monFrame, monGlow);
    });
    // RGB 게이밍 타워 본체 & 체어
    desk.add(createRoundedToyMesh(0.44, 0.74, 0.68, MAT.purpleDark, 1.05, 0.38, 0.08, 0.08));
    desk.add(createRoundedToyMesh(0.72, 0.16, 0.72, MAT.coral, 0, 0.54, 0.88, 0.1));
    desk.add(createRoundedToyMesh(0.68, 0.96, 0.18, MAT.coral, 0, 1.02, 1.18, 0.1));
    g.add(desk);
  } else {
    // 프리미엄 층간 방음 매트 (바닥 전체 도톰한 파스텔 방음 시공 + 타워형 공기청정기)
    g.add(createRoundedToyMesh(RW - 0.9, 0.12, RD - 0.9, MAT.mintSoft, 0, 0.16, 0, 0.16, false, true, true));
    g.add(createRoundedToyMesh(RW - 2.2, 0.13, RD - 2.2, MAT.sky, 0, 0.17, 0, 0.16, false, true, false));

    const purifier = new THREE.Group();
    purifier.position.set(localPos.x, 0.22, localPos.z);
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 1.35, 22), MAT.white);
    cyl.position.y = 0.68;
    addToonEdgeOutline(cyl, MAT.toonEdge, 30);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.12, 22), MAT.screenCyan);
    ring.position.y = 1.18;
    purifier.add(cyl, ring);
    g.add(purifier);
  }

  return g;
}

// =========================================================
// 11. [핵심 2] 4종 입체 평면도(원룸 · 투룸 아치가벽 · 쓰리룸 펜트하우스 · 복층 원목계단 로프트) 빌드
// =========================================================
function createInteriorArchPartitionWall3D(xPos, RD, RH, wallMat, trimMat, archCenterZ = 0.75, archWidth = 2.15) {
  const wg = new THREE.Group();
  const zMin = -RD / 2 + 0.18;
  const zMax = RD / 2 - 0.24;
  const archL = archCenterZ - archWidth * 0.5;
  const archR = archCenterZ + archWidth * 0.5;
  const doorH = Math.min(3.15, RH - 0.95);

  // 1) 뒤쪽 가벽 구간 (인테리어 유리 파티션 창 포함!)
  const backLen = Math.max(0.4, archL - zMin);
  const backCenterZ = (zMin + archL) * 0.5;
  if (backLen > 1.8) {
    // 하부 허리벽 + 상부 인방벽 + 중간 유리 파티션 창
    wg.add(createRoundedToyMesh(0.24, 1.25, backLen, wallMat, xPos, 0.62, backCenterZ, 0.06));
    wg.add(createRoundedToyMesh(0.24, RH - 2.85, backLen, wallMat, xPos, 2.85 + (RH - 2.85) * 0.5, backCenterZ, 0.06));
    wg.add(createRoundedToyMesh(0.1, 1.56, backLen - 0.36, MAT.partitionGlass, xPos, 2.05, backCenterZ, 0.04, false, false, false));
    wg.add(createRoundedToyMesh(0.28, 0.12, backLen - 0.2, trimMat, xPos, 1.26, backCenterZ, 0.03));
    wg.add(createRoundedToyMesh(0.28, 0.12, backLen - 0.2, trimMat, xPos, 2.84, backCenterZ, 0.03));
  } else {
    wg.add(createRoundedToyMesh(0.24, RH, backLen, wallMat, xPos, RH * 0.5, backCenterZ, 0.06));
  }

  // 2) 앞쪽 가벽 기둥 구간
  const frontLen = Math.max(0.35, zMax - archR);
  const frontCenterZ = (archR + zMax) * 0.5;
  wg.add(createRoundedToyMesh(0.24, RH, frontLen, wallMat, xPos, RH * 0.5, frontCenterZ, 0.06));

  // 3) 아치형 문틀 위 상부 인방벽 (y = doorH ~ RH)
  const lintelH = Math.max(0.45, RH - doorH);
  wg.add(createRoundedToyMesh(0.24, lintelH, archWidth + 0.12, wallMat, xPos, doorH + lintelH * 0.5, archCenterZ, 0.06));

  // 4) 아치형 문틀 다크 월넛 기둥 & 둥근 아치 몰딩
  wg.add(createRoundedToyMesh(0.32, doorH, 0.22, trimMat, xPos, doorH * 0.5, archL, 0.05));
  wg.add(createRoundedToyMesh(0.32, doorH, 0.22, trimMat, xPos, doorH * 0.5, archR, 0.05));

  const archRadius = archWidth * 0.5;
  const archTorus = new THREE.Mesh(new THREE.TorusGeometry(archRadius, 0.13, 12, 24, Math.PI), trimMat);
  archTorus.rotation.y = Math.PI / 2;
  archTorus.position.set(xPos, doorH - archRadius * 0.35, archCenterZ);
  addToonEdgeOutline(archTorus, MAT.toonEdge, 30);
  wg.add(archTorus);

  // 가벽 상단 몰딩 캡
  wg.add(createRoundedToyMesh(0.32, 0.16, zMax - zMin, trimMat, xPos, RH + 0.04, (zMin + zMax) * 0.5, 0.04));

  return wg;
}

function buildLoftStairsAndMezzanine3D(rg, RW, RD, RH, floorMat, stairStyle = 'oak') {
  const loftGroup = new THREE.Group();

  const stairAccentMat =
    stairStyle === 'gold' ? MAT.gold :
    stairStyle === 'coral' ? MAT.coral :
    stairStyle === 'walnut' ? MAT.woodDark : MAT.woodWarm;
  const treadMat = stairStyle === 'walnut' ? MAT.woodWarm : MAT.woodLight;

  // 1) 2층 중층 다락방(Mezzanine) 발코니 바닥 슬래브 (y = 3.68, 좌측 x: -RW/2+0.15 ~ -0.35, z: -RD/2+0.18 ~ +2.15)
  const mezMinX = -RW / 2 + 0.18;
  const mezMaxX = -0.35;
  const mezW = mezMaxX - mezMinX;
  const mezMinZ = -RD / 2 + 0.18;
  const mezMaxZ = 2.15;
  const mezD = mezMaxZ - mezMinZ;
  const mezCenterX = (mezMinX + mezMaxX) * 0.5;
  const mezCenterZ = (mezMinZ + mezMaxZ) * 0.5;
  const mezY = 3.68;

  loftGroup.add(createRoundedToyMesh(mezW, 0.24, mezD, floorMat, mezCenterX, mezY, mezCenterZ, 0.08));
  loftGroup.add(createRoundedToyMesh(mezW + 0.08, 0.14, 0.22, MAT.walnutTrim, mezCenterX, mezY - 0.06, mezMaxZ, 0.04));
  loftGroup.add(createRoundedToyMesh(0.22, 0.14, mezD + 0.08, MAT.walnutTrim, mezMaxX, mezY - 0.06, mezCenterZ, 0.04));

  // 다락방 하부 지지 원목 기둥
  loftGroup.add(createRoundedToyMesh(0.28, mezY - 0.1, 0.28, MAT.walnutTrim, mezMaxX - 0.18, (mezY - 0.1) * 0.5 + 0.1, mezMaxZ - 0.18, 0.06));

  // 2) 2층 다락방 안전 난간 (전면 유리+우드 난간 & 우측 계단 입구 제외 난간)
  const railH = 1.05;
  // 전면 난간 (z = mezMaxZ - 0.08)
  loftGroup.add(createRoundedToyMesh(mezW - 0.1, 0.11, 0.14, stairAccentMat, mezCenterX, mezY + railH, mezMaxZ - 0.08, 0.04));
  loftGroup.add(createRoundedToyMesh(mezW - 0.28, railH - 0.22, 0.06, MAT.partitionGlass, mezCenterX, mezY + railH * 0.52, mezMaxZ - 0.08, 0.02, false, false, false));
  for (let i = 0; i <= 4; i++) {
    const px = mezMinX + 0.15 + ((mezW - 0.3) * i) / 4;
    loftGroup.add(createRoundedToyMesh(0.12, railH, 0.12, MAT.walnutTrim, px, mezY + railH * 0.5, mezMaxZ - 0.08, 0.03));
  }

  // 우측 난간 (x = mezMaxX - 0.08, 계단 랜딩 구역 z: -3.5 ~ -1.55 개방!)
  const sideRailZMin = -1.45;
  const sideRailLen = mezMaxZ - sideRailZMin;
  const sideRailCenterZ = (sideRailZMin + mezMaxZ) * 0.5;
  loftGroup.add(createRoundedToyMesh(0.14, 0.11, sideRailLen, stairAccentMat, mezMaxX - 0.08, mezY + railH, sideRailCenterZ, 0.04));
  loftGroup.add(createRoundedToyMesh(0.06, railH - 0.22, sideRailLen - 0.2, MAT.partitionGlass, mezMaxX - 0.08, mezY + railH * 0.52, sideRailCenterZ, 0.02, false, false, false));
  loftGroup.add(createRoundedToyMesh(0.12, railH, 0.12, MAT.walnutTrim, mezMaxX - 0.08, mezY + railH * 0.5, sideRailZMin, 0.03));

  // 3) 3D 원목 실내 계단 (1층 우측 x=+3.45, y=0.16 -> 2층 다락방 랜딩 x=-0.35, y=3.68, z=-2.45)
  const stepCount = 10;
  const startX = 3.45;
  const endX = -0.32;
  const stairZ = -RD / 2 + 1.15;
  const treadDepthZ = 1.38;

  for (let s = 0; s < stepCount; s++) {
    const t = (s + 0.5) / stepCount;
    const sx = startX + (endX - startX) * t;
    const sy = 0.24 + (mezY - 0.22) * ((s + 1) / stepCount);
    // 디딤판 + 하부 챌판/서포트
    loftGroup.add(createRoundedToyMesh(0.46, 0.14, treadDepthZ, treadMat, sx, sy, stairZ, 0.05));
    loftGroup.add(createRoundedToyMesh(0.22, sy - 0.1, 0.22, stairAccentMat, sx, (sy - 0.1) * 0.5 + 0.1, stairZ - 0.45, 0.04));

    if (s % 2 === 0 || s === stepCount - 1) {
      // 앞쪽 계단 난간 동자주
      loftGroup.add(createRoundedToyMesh(0.09, 0.92, 0.09, MAT.walnutTrim, sx, sy + 0.46, stairZ + treadDepthZ * 0.46, 0.03));
    }
  }

  // 경사 손잡이 핸드레일 (Sloped Handrail)
  const dx = endX - startX;
  const dy = mezY - 0.24;
  const railLength = Math.hypot(dx, dy) + 0.25;
  const railAngle = Math.atan2(dy, -dx);
  const slopedRail = createRoundedToyMesh(railLength, 0.11, 0.12, stairAccentMat, (startX + endX) * 0.5, (0.24 + mezY) * 0.5 + 0.92, stairZ + treadDepthZ * 0.46, 0.04);
  slopedRail.rotation.z = -railAngle;
  loftGroup.add(slopedRail);

  const slopedStringer = createRoundedToyMesh(railLength, 0.22, 0.16, MAT.walnutTrim, (startX + endX) * 0.5, (0.24 + mezY) * 0.5 - 0.08, stairZ + treadDepthZ * 0.42, 0.05);
  slopedStringer.rotation.z = -railAngle;
  loftGroup.add(slopedStringer);

  rg.add(loftGroup);
  return { mezY, mezCenterX, mezCenterZ };
}

function rebuildRoom3D(room) {
  ensureRoomSchema(room);
  const reg = lot3D[room.lotId];
  if (!reg) return;
  const rg = reg.roomGroups[room.id];
  if (!rg) return;

  while (rg.children.length > 0) rg.remove(rg.children[0]);

  const RW = room.rw;
  const RD = room.rd;
  const RH = room.rh;
  const typeMeta = ROOM_TYPE_META[room.layoutType] || ROOM_TYPE_META.studio;

  const decorDef = getFurnitureItemDef('decor', room.equippedFurniture.decor);
  const chosenWallTex = TEX[decorDef?.wallKey] || TEX.wallPeach;
  const chosenFloorTex = TEX[decorDef?.floorKey] || TEX.floor1;
  const stairStyle = decorDef?.stairStyle || 'oak';

  const floorMat = makeClayMat(room.unlocked ? 0xFFFFFF : 0xF5ECE2, {
    map: chosenFloorTex,
    roughness: 0.44
  });

  const wallMat = makeClayMat(0xFFFFFF, {
    map: chosenWallTex,
    roughness: 0.6,
    transparent: true,
    opacity: 1.0
  });
  const leftWallMat = wallMat.clone();
  const rightWallMat = wallMat.clone();
  const backWallMat = wallMat.clone();

  // 1) 바닥 슬래브
  const floorMesh = createRoundedToyMesh(RW - 0.16, 0.18, RD - 0.16, floorMat, 0, 0.09, 0, 0.08, false, true, true);
  floorMesh.userData = { roomId: room.id, lotId: room.lotId };
  registerPick(floorMesh);
  rg.add(floorMesh);

  // 2) 뒷벽 / 좌측벽 / 우측벽 (360° 회전 시 카메라 시야를 가리는 방향 벽은 스마트 반투명 컷어웨이 지원!)
  const backWall = createRoundedToyMesh(RW - 0.12, RH, 0.22, backWallMat, 0, RH / 2, -RD / 2 + 0.11, 0.08, true, true, true);
  backWall.userData = { roomId: room.id, lotId: room.lotId };
  registerPick(backWall);
  rg.add(backWall);

  const leftWall = createRoundedToyMesh(0.22, RH, RD - 0.12, leftWallMat, -RW / 2 + 0.11, RH / 2, 0, 0.08, true, true, true);
  const rightWall = createRoundedToyMesh(0.22, RH, RD - 0.12, rightWallMat, RW / 2 - 0.11, RH / 2, 0, 0.08, true, true, true);
  rg.add(leftWall, rightWall);

  reg.roomCutawayMeta[room.id] = {
    leftWallMat,
    rightWallMat,
    backWallMat,
    leftWall,
    rightWall,
    backWall
  };

  // 상단 월넛 테두리 몰딩 & 전면 문턱 실(Sill) 프레임
  rg.add(createRoundedToyMesh(RW - 0.04, 0.18, 0.3, MAT.walnutTrim, 0, RH + 0.05, -RD / 2 + 0.11, 0.05, false, false, true));
  rg.add(createRoundedToyMesh(0.3, 0.18, RD - 0.04, MAT.walnutTrim, -RW / 2 + 0.11, RH + 0.05, 0, 0.05, false, false, true));
  rg.add(createRoundedToyMesh(0.3, 0.18, RD - 0.04, MAT.walnutTrim, RW / 2 - 0.11, RH + 0.05, 0, 0.05, false, false, true));

  const frontSill = createRoundedToyMesh(RW - 0.08, 0.38, 0.26, MAT.walnutTrim, 0, 0.21, RD / 2 - 0.09, 0.07, true, true, true);
  frontSill.userData = { roomId: room.id, lotId: room.lotId };
  registerPick(frontSill);
  rg.add(frontSill);

  const sillGoldLip = createRoundedToyMesh(RW - 0.12, 0.09, 0.28, room.unlocked ? MAT.roomGridGold : MAT.roomGridCream, 0, 0.41, RD / 2 - 0.09, 0.03, false, false, false);
  sillGoldLip.raycast = () => {};
  rg.add(sillGoldLip);

  // 호실 번호 & 평형 각인 명패 (예: 101 · 원룸, 102 · 투룸, 201 · 쓰리룸, 302 · 복층)
  const plateMat = makeClayMat(0xFFFFFF, {
    map: createRoomNumberPlateTexture(room.subId, typeMeta.shortBadge, room.unlocked),
    emissive: room.unlocked ? 0xFFB703 : 0x000000,
    emissiveIntensity: room.unlocked ? 0.18 : 0.0,
    roughness: 0.3
  });
  signMaterialsToRefresh.push({ mat: plateMat, kind: 'roomPlate', numStr: room.subId, typeLabel: typeMeta.shortBadge, unlocked: room.unlocked });
  const numPlate = new THREE.Mesh(GEO.quad, plateMat);
  numPlate.scale.set(1.58, 0.38, 1);
  numPlate.position.set(-RW / 2 + 1.15, 0.22, RD / 2 + 0.06);
  numPlate.userData = { roomId: room.id, lotId: room.lotId };
  registerPick(numPlate);
  rg.add(numPlate);

  // 벽 액자 데코
  const artFrame = createRoundedToyMesh(1.45, 1.05, 0.1, MAT.gold, 0, Math.min(2.65, RH * 0.62), -RD / 2 + 0.24, 0.06);
  const artCanvas = createRoundedToyMesh(1.22, 0.82, 0.12, MAT.pinkSoft, 0, Math.min(2.65, RH * 0.62), -RD / 2 + 0.25, 0.04);
  rg.add(artFrame, artCanvas);

  // 방음 시공이 되어 있고 가전이 방음매트가 아닌 경우 은은한 방음 보더 표시
  if (room.soundproofed && room.equippedFurniture.appliance !== 'app_soundmat') {
    rg.add(createRoundedToyMesh(RW - 0.5, 0.08, RD - 0.5, MAT.sky, 0, 0.16, 0, 0.08, false, true, false));
  }

  // 카탈로그 선택 가구 생성
  const bedGroup = createCatalogBed3D(room.equippedFurniture.bed);
  const sofaGroup = createCatalogSofa3D(room.equippedFurniture.sofa);
  let appGroup = null;

  // ---------------- 평형별 입체 구조 및 가구 배치 ----------------
  if (room.layoutType === 'studio') {
    // 1. 🏠 원룸 스튜디오 (1.6배 확장 쾌적 오픈형: 침실 러그 구역 vs 거실/작업 러그 구역 분리!)
    rg.add(createRoundedToyMesh(3.4, 0.05, 3.6, MAT.pinkSoft, -RW * 0.24, 0.16, -0.8, 0.18, false, true, false));
    rg.add(createRoundedToyMesh(3.6, 0.05, 3.4, MAT.mintSoft, RW * 0.22, 0.16, 0.55, 0.18, false, true, false));

    bedGroup.position.set(-RW * 0.24, 0.16, -1.15);
    sofaGroup.position.set(RW * 0.21, 0.16, 0.85);
    appGroup = createCatalogAppliance3D(room.equippedFurniture.appliance, RW, RD, RH, { x: RW * 0.22, z: -2.05 });

    rg.add(bedGroup, sofaGroup, appGroup);
    rg.add(createPottedPlant3D(-RW * 0.38, 0.16, 2.25, 1.12));
    rg.add(createWarmMoodStandLamp3D(-RW * 0.4, 0.16, -2.75, false));
  } else if (room.layoutType === 'tworoom') {
    // 2. 🚪 투룸 스위트 (아치형 문틀+유리 파티션 가벽으로 '안방 침실'과 '거실+주방' 2개 공간 명확 분리!)
    const partX = -0.75;
    rg.add(createInteriorArchPartitionWall3D(partX, RD, RH, wallMat, MAT.walnutTrim, 0.85, 2.2));

    // 좌측 독립 안방(침실)
    rg.add(createRoundedToyMesh(4.2, 0.05, 3.8, MAT.pinkSoft, -4.1, 0.16, -1.1, 0.18, false, true, false));
    bedGroup.position.set(-4.15, 0.16, -1.25);
    // 안방 원목 옷장 & 스탠드
    rg.add(createRoundedToyMesh(1.65, 2.45, 0.82, MAT.woodWarm, -6.15, 1.38, 1.45, 0.12));
    rg.add(createWarmMoodStandLamp3D(-6.2, 0.16, -2.75, false));
    rg.add(createPottedPlant3D(-2.2, 0.16, 2.45, 1.1));

    // 우측 거실 + 주방 아일랜드 공간
    sofaGroup.position.set(3.45, 0.16, -1.55);
    appGroup = createCatalogAppliance3D(room.equippedFurniture.appliance, RW, RD, RH, { x: 0.95, z: -2.35 });

    // 주방 아일랜드 홈바 & 에스프레소 머신 & 스툴 2개
    const kitchen = new THREE.Group();
    kitchen.position.set(3.85, 0.16, 1.78);
    kitchen.add(createRoundedToyMesh(2.85, 1.02, 0.95, MAT.white, 0, 0.51, 0, 0.14));
    kitchen.add(createRoundedToyMesh(3.0, 0.14, 1.08, MAT.woodLight, 0, 1.06, 0, 0.08));
    kitchen.add(createRoundedToyMesh(0.48, 0.5, 0.42, MAT.coral, -0.85, 1.35, -0.1, 0.09));
    for (const sx of [-0.65, 0.65]) {
      const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.68, 16), MAT.mintSoft);
      stool.position.set(sx, 0.34, 0.78);
      addToonEdgeOutline(stool, MAT.toonEdge, 30);
      kitchen.add(stool);
    }
    rg.add(bedGroup, sofaGroup, appGroup, kitchen);
    rg.add(createPottedPlant3D(6.15, 0.16, 2.35, 1.15));
  } else if (room.layoutType === 'threeroom') {
    // 3. 👨‍👩‍👧‍👦 쓰리룸 패밀리 펜트하우스 (한 층 전체 23.6m! 좌측 부부 안방 + 중앙 대형 거실/식탁 + 우측 아이들 방 3공간 분리!)
    rg.add(createInteriorArchPartitionWall3D(-4.85, RD, RH, wallMat, MAT.walnutTrim, 1.15, 2.25));
    rg.add(createInteriorArchPartitionWall3D(4.85, RD, RH, wallMat, MAT.walnutTrim, 1.15, 2.25));

    // 내부 연결 복도 러너 러그
    rg.add(createRoundedToyMesh(13.2, 0.04, 1.35, MAT.cream, 0, 0.16, 1.15, 0.14, false, true, false));

    // [좌측 방] 부부 안방 (퀸 침대 + 화장대 & 거울 + 스탠드)
    rg.add(createRoundedToyMesh(4.4, 0.05, 3.8, MAT.pinkSoft, -8.5, 0.16, -1.2, 0.18, false, true, false));
    bedGroup.position.set(-8.65, 0.16, -1.35);

    const vanity = new THREE.Group();
    vanity.position.set(-6.15, 0.16, -2.55);
    vanity.add(createRoundedToyMesh(1.55, 0.82, 0.68, MAT.white, 0, 0.41, 0, 0.1));
    vanity.add(createRoundedToyMesh(1.62, 0.1, 0.74, MAT.woodLight, 0, 0.85, 0, 0.06));
    const mirror = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.08, 22), MAT.gold);
    mirror.rotation.x = Math.PI / 2;
    mirror.position.set(0, 1.48, -0.24);
    const mirrorGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.1, 22), MAT.screenCyan);
    mirrorGlass.rotation.x = Math.PI / 2;
    mirrorGlass.position.set(0, 1.48, -0.22);
    const vStool = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.48, 16), MAT.coral);
    vStool.position.set(0, 0.24, 0.62);
    vanity.add(mirror, mirrorGlass, vStool);
    rg.add(bedGroup, vanity, createPottedPlant3D(-10.7, 0.16, 2.35, 1.2));

    // [중앙 방] 메인 대형 거실 (벽걸이 와이드 TV + 선택 소파 + 4인 원목 식탁)
    rg.add(createRoundedToyMesh(2.65, 1.28, 0.12, MAT.charcoal, -0.8, 2.25, -RD / 2 + 0.28, 0.06));
    rg.add(createRoundedToyMesh(2.42, 1.08, 0.13, MAT.screenCyan, -0.8, 2.25, -RD / 2 + 0.3, 0.04, false, false, false));
    rg.add(createRoundedToyMesh(3.2, 0.48, 0.65, MAT.walnutTrim, -0.8, 0.42, -RD / 2 + 0.58, 0.08));

    sofaGroup.position.set(-0.75, 0.16, -1.25);
    appGroup = createCatalogAppliance3D(room.equippedFurniture.appliance, RW, RD, RH, { x: -3.45, z: -2.45 });

    const dining = new THREE.Group();
    dining.position.set(2.35, 0.16, 2.05);
    dining.add(createRoundedToyMesh(2.35, 0.14, 1.35, MAT.woodLight, 0, 0.82, 0, 0.08));
    for (const lx of [-0.95, 0.95]) {
      for (const lz of [-0.48, 0.48]) {
        dining.add(createRoundedToyMesh(0.14, 0.8, 0.14, MAT.woodDark, lx, 0.4, lz, 0.04));
      }
    }
    [[-0.62, -0.85], [0.62, -0.85], [-0.62, 0.85], [0.62, 0.85]].forEach(([cx, cz], i) => {
      dining.add(createRoundedToyMesh(0.52, 0.48, 0.52, i % 2 === 0 ? MAT.mintSoft : MAT.butter, cx, 0.26, cz, 0.08));
    });
    rg.add(sofaGroup, appGroup, dining);

    // [우측 방] 아이들 방 (2층 원목 침대 + 컬러풀 장난감 놀이 매트 + 키즈 학습 책상)
    const kidsBunk = createCatalogBed3D('bed_bunk');
    kidsBunk.position.set(9.75, 0.16, -1.25);

    const playMat = new THREE.Group();
    playMat.position.set(6.95, 0.16, 1.65);
    [
      [-0.65, -0.55, MAT.coral], [0.65, -0.55, MAT.butter],
      [-0.65, 0.55, MAT.sky], [0.65, 0.55, MAT.mint]
    ].forEach(([px, pz, pMat]) => {
      playMat.add(createRoundedToyMesh(1.26, 0.06, 1.06, pMat, px, 0.03, pz, 0.1, false, true, false));
    });
    // 귀여운 장난감 블록들
    playMat.add(createRoundedToyMesh(0.32, 0.32, 0.32, MAT.coral, -0.35, 0.22, 0.1, 0.06));
    playMat.add(createRoundedToyMesh(0.28, 0.28, 0.28, MAT.duckYellow, 0.15, 0.2, -0.2, 0.06));
    playMat.add(createRoundedToyMesh(0.26, 0.26, 0.26, MAT.sky, -0.32, 0.5, 0.1, 0.05));

    const kidsDesk = new THREE.Group();
    kidsDesk.position.set(6.75, 0.16, -2.45);
    kidsDesk.add(createRoundedToyMesh(1.85, 0.14, 0.82, MAT.woodLight, 0, 0.76, 0, 0.08));
    kidsDesk.add(createRoundedToyMesh(0.14, 0.74, 0.74, MAT.white, -0.78, 0.37, 0, 0.05));
    kidsDesk.add(createRoundedToyMesh(0.14, 0.74, 0.74, MAT.white, 0.78, 0.37, 0, 0.05));
    kidsDesk.add(createRoundedToyMesh(0.54, 0.46, 0.54, MAT.sky, 0, 0.44, 0.68, 0.08));
    rg.add(kidsBunk, playMat, kidsDesk);
  } else if (room.layoutType === 'loft') {
    // 4. 🪜 복층 로프트 하우스 (1.8배 층고 7.65m + 3D 원목 실내 계단 + 2층 다락방 발코니 & 난간!)
    const { mezY } = buildLoftStairsAndMezzanine3D(rg, RW, RD, RH, floorMat, stairStyle);

    // [1층 바닥] 우측 오픈 거실 소파 + 작업실/가전 + 좌측 다락 아래 주방 홈바
    sofaGroup.position.set(3.05, 0.16, 1.25);
    appGroup = createCatalogAppliance3D(room.equippedFurniture.appliance, RW, RD, RH, { x: 3.45, z: -0.95 });

    const loftKitchen = new THREE.Group();
    loftKitchen.position.set(-3.65, 0.16, -1.55);
    loftKitchen.add(createRoundedToyMesh(3.2, 0.96, 0.9, MAT.white, 0, 0.48, 0, 0.12));
    loftKitchen.add(createRoundedToyMesh(3.32, 0.12, 1.0, MAT.woodLight, 0, 1.0, 0, 0.06));
    loftKitchen.add(createRoundedToyMesh(0.95, 1.85, 0.85, MAT.mintSoft, -2.15, 0.92, 0, 0.14));
    rg.add(sofaGroup, appGroup, loftKitchen);

    // 1층 높은 천장에서 내려오는 샹들리에 펜던트 조명
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 8), MAT.gold);
    cord.position.set(3.05, RH - 0.85, 0.2);
    const orb = new THREE.Mesh(GEO.sphere, MAT.neonYellow);
    orb.scale.setScalar(0.58);
    orb.position.set(3.05, RH - 1.72, 0.2);
    rg.add(cord, orb);

    // [2층 복층 다락 공간 (y = mezY + 0.12 = 3.80)] 침대 + 스탠드 무드등 + 감성 화분 2종!
    const loftFloorY = mezY + 0.12;
    rg.add(createRoundedToyMesh(4.1, 0.05, 3.6, MAT.pinkSoft, -3.55, loftFloorY + 0.02, -0.95, 0.16, false, true, false));
    bedGroup.position.set(-3.55, loftFloorY, -1.05);
    rg.add(bedGroup);
    rg.add(createWarmMoodStandLamp3D(-5.55, loftFloorY, -2.45, true));
    rg.add(createPottedPlant3D(-1.35, loftFloorY, 1.35, 1.08));
    rg.add(createPottedPlant3D(-5.55, loftFloorY, 1.45, 0.95));
  }

  bedGroup.userData.fcat = 'bed';
  sofaGroup.userData.fcat = 'sofa';
  if (appGroup) appGroup.userData.fcat = 'appliance';
  rg.userData.furnitureGroups = { bed: bedGroup, sofa: sofaGroup, appliance: appGroup };

  // 미개방 호실 안내 골드 리본 (3D 가구·가벽·복층 계단은 100% 그대로 보여줌!)
  if (!room.unlocked) {
    const lockRibbon = createRoundedToyMesh(2.6, 0.28, 0.18, MAT.butterOak, 0, 1.35, RD / 2 - 0.14, 0.08);
    lockRibbon.userData = { roomId: room.id, lotId: room.lotId };
    registerPick(lockRibbon);
    rg.add(lockRibbon);
    return;
  }

  // 히키코모리 쓰레기방 더미 연출
  if (room.household?.type === 'hikikomori' && room.trashStage >= 1) {
    buildRoomTrashClutter3D(rg, room.trashStage);
  }

  // 퇴거 카운트다운 이삿짐 박스
  if (room.evictionCountdown !== null) {
    const b1 = createRoundedToyMesh(0.86, 0.74, 0.74, MAT.movingBox, 1.85, 0.54, 1.85, 0.1);
    const b2 = createRoundedToyMesh(0.68, 0.58, 0.64, MAT.movingBox, 1.78, 1.18, 1.82, 0.1);
    b2.rotation.y = 0.28;
    rg.add(b1, b2);
  }
}

function buildRoomTrashClutter3D(rg, trashStage) {
  for (let p = 0; p < 5; p++) {
    const pBox = createRoundedToyMesh(0.72, 0.11, 0.72, MAT.pizzaBox, -0.45 + (p % 2) * 0.06, 0.22 + p * 0.11, 0.65, 0.04);
    pBox.rotation.y = p * 0.24;
    rg.add(pBox);
  }
  if (trashStage >= 2) {
    [[-1.1, 1.35], [-0.45, 1.55], [0.35, 1.4], [-0.75, 1.9]].forEach(([bx, bz], i) => {
      const bag = new THREE.Mesh(GEO.sphere, MAT.trashBag);
      bag.scale.set(0.68, 0.58 + (i % 2) * 0.14, 0.68);
      bag.position.set(bx, 0.42, bz);
      addToonHullOutline(bag, 1.07);
      rg.add(bag);
    });
  }
  if (trashStage >= 3) {
    for (let i = 0; i < 5; i++) {
      const bag = new THREE.Mesh(GEO.sphere, MAT.trashBag);
      bag.scale.set(0.74, 0.66, 0.74);
      bag.position.set(-1.2 + (i % 3) * 0.75, 0.48 + Math.floor(i / 3) * 0.4, 0.85 + (i % 2) * 0.55);
      addToonHullOutline(bag, 1.07);
      rg.add(bag);
    }
  }
}

// =========================================================
// 12. 입주민 & 실내 반려동물 동기화 + 아치문·복층계단 AI 경로 생성
// =========================================================
function planRoomWaypoints(room, curLocalX, curLocalY, curLocalZ, isHoarder = false) {
  const RW = room.rw;
  const RD = room.rd;

  if (room.layoutType === 'loft') {
    // 복층 로프트: 1층 거실(y=0.18) <-> 원목 실내 계단 <-> 2층 다락 침실(y=3.82) 실제 계단 등반!
    const currentlyUpstairs = curLocalY > 1.8;
    const goUpstairs = Math.random() < (currentlyUpstairs ? 0.45 : 0.58);
    const stairBot = { x: 3.55, y: 0.18, z: -RD / 2 + 1.15 };
    const stairTop = { x: -0.55, y: 3.82, z: -RD / 2 + 1.15 };

    if (!currentlyUpstairs && goUpstairs) {
      return [
        stairBot,
        stairTop,
        { x: -3.2 + (Math.random() - 0.5) * 2.2, y: 3.82, z: 0.35 + (Math.random() - 0.5) * 1.6 }
      ];
    }
    if (currentlyUpstairs && !goUpstairs) {
      return [
        stairTop,
        stairBot,
        { x: 2.6 + (Math.random() - 0.5) * 2.4, y: 0.18, z: 0.8 + (Math.random() - 0.5) * 2.2 }
      ];
    }
    if (currentlyUpstairs) {
      return [{ x: -3.4 + (Math.random() - 0.5) * 2.4, y: 3.82, z: 0.25 + (Math.random() - 0.5) * 1.8 }];
    }
    return [{ x: 2.2 + (Math.random() - 0.5) * 3.0, y: 0.18, z: 0.9 + (Math.random() - 0.5) * 2.4 }];
  }

  if (room.layoutType === 'tworoom') {
    // 투룸 스위트: 아치형 가벽 문(x = -0.75, z = +0.85)을 실제로 통과해 안방 <-> 거실 이동!
    const targetInBedroom = Math.random() < 0.48;
    const destX = targetInBedroom
      ? -4.1 + (Math.random() - 0.5) * 2.6
      : 3.1 + (Math.random() - 0.5) * 3.8;
    const destZ = (Math.random() - 0.5) * 3.2;
    const crossesWall = (curLocalX < -0.75 && destX > -0.75) || (curLocalX > -0.75 && destX < -0.75);

    if (crossesWall) {
      return [
        { x: -0.75, y: 0.18, z: 0.85 },
        { x: destX, y: 0.18, z: destZ }
      ];
    }
    return [{ x: destX, y: 0.18, z: destZ }];
  }

  if (room.layoutType === 'threeroom') {
    // 쓰리룸 펜트하우스: 좌측 안방(x<-4.85) <-> 중앙 거실(-4.85~4.85) <-> 우측 아이방(x>4.85) 아치 복도 통과!
    const zoneRoll = Math.random();
    const destX =
      zoneRoll < 0.3 ? -8.2 + (Math.random() - 0.5) * 3.0 :
      zoneRoll < 0.7 ? (Math.random() - 0.5) * 5.6 :
      7.9 + (Math.random() - 0.5) * 3.0;
    const destZ = (Math.random() - 0.5) * 3.4;

    const pts = [];
    const curZone = curLocalX < -4.85 ? 0 : curLocalX > 4.85 ? 2 : 1;
    const dstZone = destX < -4.85 ? 0 : destX > 4.85 ? 2 : 1;
    if (curZone !== dstZone) {
      if (curZone === 0 || dstZone === 0) pts.push({ x: -4.85, y: 0.18, z: 1.15 });
      if (curZone === 2 || dstZone === 2) {
        if (curZone === 0 && dstZone === 2) {
          // 좌측 안방 -> 중앙 -> 우측 아이방
        } else if (curZone === 2 && dstZone === 0) {
          pts.reverse();
        }
        pts.push({ x: 4.85, y: 0.18, z: 1.15 });
        if (curZone === 2 && dstZone === 0) {
          pts.length = 0;
          pts.push({ x: 4.85, y: 0.18, z: 1.15 }, { x: -4.85, y: 0.18, z: 1.15 });
        }
      }
    }
    pts.push({ x: destX, y: 0.18, z: destZ });
    return pts;
  }

  // 원룸 스튜디오
  const rx = isHoarder ? 1.1 : RW * 0.34;
  return [{
    x: (Math.random() - 0.5) * rx * 2,
    y: 0.18,
    z: (Math.random() - 0.5) * (RD * 0.52)
  }];
}

function syncBuildingResidents3D(lotId) {
  const b = state.buildings[lotId];
  const reg = lot3D[lotId];
  if (!b || !reg) return;

  for (const room of b.rooms) {
    if (residentActors[room.id]) {
      residentActors[room.id].forEach((ac) => reg.interiorGroup.remove(ac.mesh));
      delete residentActors[room.id];
    }
    if (roomPetActors[room.id]) {
      reg.interiorGroup.remove(roomPetActors[room.id].mesh);
      delete roomPetActors[room.id];
    }
    if (!room.unlocked || !room.household) continue;

    const hType = room.household.type;
    const styles =
      hType === 'student' ? [['student', false]] :
      hType === 'newlywed' ? [['newlywed_m', false], ['newlywed_f', false]] :
      hType === 'family4' ? [['family_m', false], ['family_f', false], ['kid', true], ['kid', true]] :
      hType === 'elderly' ? [['elderly_m', false], ['elderly_f', false]] :
      hType === 'streamer' ? [['streamer', false]] :
      [['hikikomori', false]];

    residentActors[room.id] = styles.map(([st, isKid], idx) => {
      const mesh = createChibiPerson3D(st, isKid);
      const startLocalX = room.layoutType === 'loft' ? 2.2 : (idx - 0.5) * 1.1;
      const startLocalY = 0.18;
      const startLocalZ = 0.85;
      mesh.position.set(room.lx + startLocalX, room.ly + startLocalY, room.lz + startLocalZ);
      if (mesh.userData.torsoMesh) {
        mesh.userData.torsoMesh.userData = { isPettableActor: true, propRoot: mesh, roomId: room.id, label: `${room.household.familyName} 입주민이 환하게 웃으며 인사해요!` };
        registerPick(mesh.userData.torsoMesh);
      }
      reg.interiorGroup.add(mesh);
      return {
        mesh,
        room,
        localX: startLocalX,
        localY: startLocalY,
        localZ: startLocalZ,
        waypoints: [],
        timer: 0.6 + idx * 0.6,
        puffTimer: 0.25,
        phase: Math.random() * 6,
        breathOffset: Math.random() * Math.PI * 2,
        isKid,
        isHoarder: hType === 'hikikomori'
      };
    });

    // 실내 반려동물 배치 (히키코모리 제외 모든 입주 세대에 귀여운 고양이/비숑/시바견 동거!)
    if (hType !== 'hikikomori') {
      const petKind = hType === 'newlywed' ? 'bichon' : hType === 'family4' ? 'shiba' : 'cat';
      const petMesh = createCutePet3D(petKind, 1.08);
      const px = room.layoutType === 'loft' ? 1.5 : 0.8;
      const pz = 1.45;
      petMesh.position.set(room.lx + px, room.ly + 0.18, room.lz + pz);
      reg.interiorGroup.add(petMesh);
      roomPetActors[room.id] = {
        mesh: petMesh,
        room,
        localX: px,
        localZ: pz,
        tx: px,
        tz: pz,
        timer: 1.4,
        phase: Math.random() * 6
      };
    }
  }
}

// =========================================================
// 13. [핵심 1] X-Ray 투시 & 전체화면 단독 룸 뷰 아이솔레이션/스튜디오 조명 엔진
// =========================================================
function updateXRayAndFocusHighlights(dt, nowSec) {
  const focusedRm = focusedRoomId ? findRoom(focusedRoomId) : null;
  const inFullRoomMode = Boolean(focusedRm);

  // 전체화면 단독 룸 뷰 시 외벽 0%, 평소 줌인 시 X-Ray 투시
  let targetOpacity = 1.0;
  if (inFullRoomMode) {
    targetOpacity = 0.0;
  } else if (camera.zoom > 1.14) {
    targetOpacity = Math.max(0.03, 1.0 - (camera.zoom - 1.14) / 0.42);
  }
  currentShellOpacity += (targetOpacity - currentShellOpacity) * Math.min(1, dt * 11.0);

  const showInterior = inFullRoomMode || currentShellOpacity < 0.94;

  // 스튜디오 조명 & 배경 아이솔레이션 전환
  if (inFullRoomMode) {
    const fLot = getLot(focusedRm.lotId);
    const wx = fLot.x + focusedRm.lx;
    const wy = focusedRm.ly + focusedRm.rh * 0.5;
    const wz = fLot.z + focusedRm.lz;

    scene.background = TEX.studioBackdrop;
    if (islandRootGroup) islandRootGroup.visible = false;

    hemiLight.intensity = 0.95;
    dirLight.intensity = 1.18;

    studioKeyLight.visible = true;
    studioKeyLight.position.set(wx + 4.5, wy + focusedRm.rh + 3.5, wz + 7.5);
    studioFillLight.visible = true;
    studioFillLight.position.set(wx - 5.5, wy + 2.5, wz + 5.5);
    studioRimLight.visible = true;
    studioRimLight.position.set(wx, wy + focusedRm.rh + 1.5, wz - 5.0);

    if (studioStageDisc) {
      studioStageDisc.visible = true;
      studioStageDisc.position.set(wx, focusedRm.ly - 0.14, wz);
      studioStageDisc.scale.set(focusedRm.rw * 1.48, 1, focusedRm.rd * 1.65);
    }
  } else {
    scene.background = TEX.skyBackdrop;
    if (islandRootGroup) islandRootGroup.visible = true;
    hemiLight.intensity = 1.12;
    dirLight.intensity = 1.56;
    studioKeyLight.visible = false;
    studioFillLight.visible = false;
    studioRimLight.visible = false;
    if (studioStageDisc) studioStageDisc.visible = false;
  }

  // 카메라 방향 계산 (전체화면 룸 뷰에서 360° 드래그 회전 시 시야를 가리는 벽 자동 반투명화!)
  camDirVec.copy(camera.position).sub(controls.target).normalize();

  for (const reg of Object.values(lot3D)) {
    // 다른 필지 건물은 단독 룸 뷰에서 완벽 숨김(아이솔레이션)
    if (inFullRoomMode && reg.lotId !== focusedRm.lotId) {
      reg.root.visible = false;
      continue;
    }
    reg.root.visible = true;

    if (reg.interiorGroup) reg.interiorGroup.visible = showInterior;
    if (reg.frontFacadeGroup) reg.frontFacadeGroup.visible = !inFullRoomMode && currentShellOpacity > 0.04;
    if (reg.roofCapGroup) reg.roofCapGroup.visible = !inFullRoomMode && currentShellOpacity > 0.24;
    if (reg.exteriorWindowGroup) reg.exteriorWindowGroup.visible = !inFullRoomMode && currentShellOpacity > 0.22;
    if (reg.gfGroup) reg.gfGroup.visible = !inFullRoomMode;
    if (reg.podiumGroup) reg.podiumGroup.visible = !inFullRoomMode;
    if (reg.infraGroup) reg.infraGroup.visible = !inFullRoomMode;
    if (reg.managerGroup) reg.managerGroup.visible = !inFullRoomMode;

    if (reg.shellLineMat) reg.shellLineMat.opacity = currentShellOpacity * 0.82;
    for (const m of reg.shellMaterials) {
      m.opacity = currentShellOpacity;
      m.depthWrite = currentShellOpacity > 0.82;
    }

    const b = state.buildings[reg.lotId];
    if (b) {
      // 단독 룸 뷰 시 모든 층간 슬래브도 숨기고 선택한 방만 초대형 미니어처 디오라마처럼 공중에 깔끔히 부각!
      for (const sMesh of Object.values(reg.floorSlabs)) {
        sMesh.visible = !inFullRoomMode;
      }

      for (const r of b.rooms) {
        const rg = reg.roomGroups[r.id];
        if (!rg) continue;

        const isThisRoomFocused = inFullRoomMode && r.id === focusedRm.id;
        const roomVis = inFullRoomMode ? isThisRoomFocused : true;
        rg.visible = roomVis;

        if (residentActors[r.id]) {
          residentActors[r.id].forEach((ac) => { ac.mesh.visible = roomVis; });
        }
        if (roomPetActors[r.id]) {
          roomPetActors[r.id].mesh.visible = roomVis;
        }

        // 선택된 방 360° 회전 시 카메라 쪽 외벽 스마트 컷어웨이
        const cutMeta = reg.roomCutawayMeta[r.id];
        if (cutMeta) {
          if (isThisRoomFocused) {
            const hideLeft = camDirVec.x < -0.28;
            const hideRight = camDirVec.x > 0.28;
            const hideBack = camDirVec.z < -0.2;
            cutMeta.leftWall.visible = !hideLeft;
            cutMeta.rightWall.visible = !hideRight;
            cutMeta.backWall.visible = !hideBack;
          } else {
            cutMeta.leftWall.visible = true;
            cutMeta.rightWall.visible = true;
            cutMeta.backWall.visible = true;
          }
        }

        if (!activeBounces.some((ab) => ab.obj === rg)) {
          const rmLift = !inFullRoomMode && hoveredRoomId === r.id ? 0.16 : 0;
          rg.position.y += (r.ly + rmLift - rg.position.y) * Math.min(1, dt * 14);
        }
      }
    }

    const isLotHovered = !inFullRoomMode && hoveredLotId === reg.lotId && !hoveredRoomId;
    const targetLift = isLotHovered ? 0.2 : 0;
    reg.hoverY += (targetLift - reg.hoverY) * Math.min(1, dt * 12);
    if (!activeBounces.some((ab) => ab.obj === reg.root)) {
      reg.root.position.y = inFullRoomMode ? 0 : reg.hoverY;
    }
  }

  animatedDashMaterials.forEach((dm) => {
    if (dm.map) dm.map.offset.x = (nowSec * 0.45) % 1;
  });

  if (!inFullRoomMode && hoveredRoomId) {
    const rm = findRoom(hoveredRoomId);
    const lot = rm ? getLot(rm.lotId) : null;
    if (rm && lot) {
      setHoverBoxBounds(lot.x + rm.lx, rm.ly + 0.2, lot.z + rm.lz, rm.rw, rm.rd, 0x34D399);
    }
  } else if (!inFullRoomMode && hoveredLotId) {
    const lot = getLot(hoveredLotId);
    const reg = lot3D[hoveredLotId];
    if (lot && reg) {
      setHoverBoxBounds(lot.x, 0.22, lot.z + (state.buildings[hoveredLotId] ? 0.35 : 0), reg.padW, reg.padD, lot.owned ? 0xFFD166 : 0x34D399);
    }
  } else if (hoverFocusGroup) {
    hoverFocusGroup.visible = false;
  }

  if (inFullRoomMode) {
    const lot = getLot(focusedRm.lotId);
    setSelectedRoomFrameBounds(lot.x + focusedRm.lx, focusedRm.ly, lot.z + focusedRm.lz, focusedRm.rw, focusedRm.rd);
  } else if (selectedRoomFrameGroup) {
    selectedRoomFrameGroup.visible = false;
  }

  if (dom.hudXrayBadge) {
    const pct = Math.round((1 - currentShellOpacity) * 100);
    dom.hudXrayBadge.textContent = pct > 8 ? `내부투시 ${pct}%` : '외관 100%';
  }
}

// =========================================================
// 14. 빌딩 이름 실시간 작명(Rename) 시스템
// =========================================================
function openRenameBuildingModal(lotId) {
  const lot = getLot(lotId);
  if (!lot || !lot.owned) return;
  renameTargetLotId = lotId;
  const curName = state.buildings[lotId]?.title || lot.title || '';

  dom.inputBuildingName.value = curName;
  dom.renamePresetsRow.innerHTML = BUILDING_NAME_PRESETS.map((preset) => `
    <button type="button" data-preset="${preset}" class="diary-pill-badge cursor-pointer hover:!bg-[#FEF3C7] hover:!border-[#D97706]">
      ${preset}
    </button>
  `).join('');

  dom.renamePresetsRow.querySelectorAll('[data-preset]').forEach((btn) => {
    btn.onclick = () => {
      dom.inputBuildingName.value = btn.dataset.preset;
      dom.inputBuildingName.focus();
    };
  });

  dom.renameModal.classList.remove('hidden');
  setTimeout(() => {
    dom.inputBuildingName.focus();
    dom.inputBuildingName.select();
  }, 40);
}

function confirmRenameBuilding() {
  if (!renameTargetLotId) return;
  const raw = dom.inputBuildingName.value.trim();
  if (!raw) {
    showToast('새 빌딩 이름을 입력해 주세요!', 'rose');
    return;
  }
  const cleanName = raw.slice(0, 16);
  const lot = getLot(renameTargetLotId);
  const b = state.buildings[renameTargetLotId];
  const reg = lot3D[renameTargetLotId];

  if (lot) lot.title = cleanName;
  if (b) b.title = cleanName;

  refreshBuildingNameplates3D(renameTargetLotId);
  if (reg?.skySignGroup) triggerSquashStretch(reg.skySignGroup, 1.55);
  if (reg?.root) triggerSquashStretch(reg.root, 0.95);
  if (lot) {
    spawnCoinFountain3D(lot.x, 22.8, lot.z + 3.0, 10, true);
    spawnSmokePoof3D(lot.x, 22.6, lot.z + 3.0, 0xFFFDF9, 8);
  }

  if (lotOverlayEls[renameTargetLotId]) lotOverlayEls[renameTargetLotId].dataset.sig = '';
  if (focusedRoomId) renderFocusedRoomDrawer();
  if (!dom.notebookModal.classList.contains('hidden')) renderNotebookSplitView();

  dom.renameModal.classList.add('hidden');
  showToast(`옥상 스카이 사인과 정문 명패가 [${cleanName}](으)로 교체되었습니다!`, 'emerald');
  saveState();
}

// =========================================================
// 15. 층간소음 · 쓰레기방 악취 · 만족도 퇴거 · 지배인 자동 위임
// =========================================================
let fxAccum = 0;

function tickConflictAndSatisfaction(dt) {
  fxAccum += dt;
  const emitFX = fxAccum >= 1.6;
  if (emitFX) fxAccum = 0;

  const hasParkSynergy = state.lots.some((l) => l.owned && l.devType === 'sakura_park');

  for (const b of Object.values(state.buildings)) {
    const lot = getLot(b.lotId);

    for (const room of b.rooms) {
      if (!room.unlocked || !room.household) {
        clearOdorFlies(room.id);
        continue;
      }

      const hDef = HOUSEHOLD_TYPES[room.household.type] || HOUSEHOLD_TYPES.student;
      const typeMeta = ROOM_TYPE_META[room.layoutType];
      let deltaHappy = 1.15;
      if (typeMeta && typeMeta.preferredBy.includes(hDef.type)) deltaHappy += 0.45;
      let conflictReason = null;

      if (hDef.isHoarder) {
        room.trashProgress += dt;
        if (room.trashProgress >= 16 && room.trashStage < 3) {
          room.trashProgress = 0;
          room.trashStage += 1;
          rebuildRoom3D(room);
          if (room.trashStage >= 2) {
            showToast(`[${b.title} ${room.name}호] 쓰레기방(${room.trashStage}단계)에서 악취가 퍼집니다!`, 'rose');
          }
        }
        if (room.trashStage >= 2) {
          ensureOdorFlies(room, lot);
          if (emitFX && (!focusedRoomId || focusedRoomId === room.id)) {
            spawnSmokePoof3D(lot.x + room.lx, room.ly + 1.1, lot.z + room.lz + 0.8, 0x84CC16, 3);
          }
        } else {
          clearOdorFlies(room.id);
        }
      } else {
        clearOdorFlies(room.id);
      }

      // 위층 호실 층간소음 체크 (X좌표 범위가 겹치는 직상층 호실)
      const upstairs = b.rooms.find(
        (r) =>
          r.floor === room.floor + 1 &&
          Math.abs(r.lx - room.lx) < (r.rw + room.rw) * 0.48
      );
      if (upstairs && upstairs.household && !upstairs.soundproofed && !room.soundproofed) {
        const upDef = HOUSEHOLD_TYPES[upstairs.household.type];
        if (upDef && upDef.noiseOutput >= 40) {
          const dmg = (upDef.noiseOutput * hDef.noiseSensitivity) / 2200;
          deltaHappy -= dmg;
          if (hDef.noiseSensitivity >= 50) conflictReason = 'noise';
          if (emitFX && (!focusedRoomId || focusedRoomId === room.id)) {
            spawnNoiseShockwave(lot.x + room.lx, upstairs.ly - 0.1, lot.z + room.lz);
          }
        }
      }

      const pollutedNeighbor = b.rooms.find(
        (r) =>
          r.id !== room.id &&
          r.trashStage >= 2 &&
          Math.abs(r.floor - room.floor) <= 1
      );
      if (pollutedNeighbor && hDef.odorSensitivity > 0) {
        deltaHappy -= pollutedNeighbor.trashStage * (hDef.odorSensitivity / 60);
        conflictReason = 'odor';
      }

      if (room.floor >= 2 && hDef.needsElevator && !b.infra.elevator) {
        deltaHappy -= 1.35;
        if (!conflictReason) conflictReason = 'infra';
      }
      if (hDef.needsRecycling && !b.infra.recycling) {
        deltaHappy -= 0.85;
        if (!conflictReason) conflictReason = 'infra';
      }

      if (b.infra.rooftop_garden) deltaHappy += 0.85;
      if (hasParkSynergy) deltaHappy += 0.65;

      room.activeConflict = conflictReason;
      room.household.happiness = Math.max(0, Math.min(100, room.household.happiness + deltaHappy * dt));

      if (room.household.happiness <= 30) {
        if (room.evictionCountdown === null) {
          room.evictionCountdown = GAME_BALANCE.evictionGraceSec;
          rebuildRoom3D(room);
          showToast(`[${room.name}호 ${room.household.familyName}] 불만 누적으로 이사를 고민 중입니다!`, 'rose');
        } else {
          room.evictionCountdown -= dt;
          if (room.evictionCountdown <= 0) {
            const leftName = room.household.familyName;
            room.household = null;
            room.evictionCountdown = null;
            room.activeConflict = null;
            room.rentTimer = 0;
            rebuildRoom3D(room);
            syncBuildingResidents3D(b.lotId);
            showToast(`[${room.name}호] ${leftName} 세대가 이사를 떠나 공실이 발생했습니다!`, 'rose');
            if (focusedRoomId === room.id) renderFocusedRoomDrawer();
          }
        }
      } else if (room.evictionCountdown !== null && room.household.happiness > 38) {
        room.evictionCountdown = null;
        rebuildRoom3D(room);
      }
    }

    if (b.manager.hired) {
      b.manager.salaryTimer += dt;
      if (b.manager.salaryTimer >= GAME_BALANCE.managerCycleSec) {
        b.manager.salaryTimer = 0;
        const sal = GAME_BALANCE.managerSalaryPerCycle;
        if (state.gold >= sal) {
          addGold(-sal);
          runManagerAutoDelegation(b);
        } else {
          showToast(`자산 부족으로 [${b.title}] 지배인 급여(${sal}만)가 대기 중입니다!`, 'rose');
        }
      }
    }
  }
}

function runManagerAutoDelegation(b) {
  let remainBudget = b.manager.autoBudgetCap;
  let dispatched = false;

  for (const room of b.rooms) {
    if (room.trashStage >= 2 && remainBudget >= GAME_BALANCE.specialCleanCost && state.gold >= GAME_BALANCE.specialCleanCost) {
      addGold(-GAME_BALANCE.specialCleanCost);
      remainBudget -= GAME_BALANCE.specialCleanCost;
      room.trashStage = 0;
      room.trashProgress = 0;
      clearOdorFlies(room.id);
      rebuildRoom3D(room);
      dispatched = true;
    }
  }

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
    const reg = lot3D[b.lotId];
    const mgrBooth = reg?.managerGroup?.children[0];
    if (mgrBooth?.userData?.mgrMesh) triggerSquashStretch(mgrBooth.userData.mgrMesh, 1.3);
    triggerManagerDispatchTag(b.lotId);
  }
}

function triggerManagerDispatchTag(lotId) {
  if (managerTagEls[lotId]) managerTagEls[lotId].remove();
  const lot = getLot(lotId);
  const tag = document.createElement('div');
  tag.className = 'world-pin care-clay-bubble';
  tag.innerHTML = `${createCustomSVGIcon('manager_cap', 16)}<span>지배인 자동 케어 출동!</span>`;
  if (lot) setPinPos(tag, project(lot.x + 0.5, 2.8, lot.z + 5.8));
  dom.careLayer.appendChild(tag);
  managerTagEls[lotId] = tag;
  setTimeout(() => {
    tag.remove();
    delete managerTagEls[lotId];
  }, 2800);
}

// =========================================================
// 16. 3D 파티클·이펙트 (Poof 연기 · 코인 분수 · 비누방울 · 커피 김)
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
  if (!obj) return;
  const baseY = obj.userData.baseY !== undefined ? obj.userData.baseY : obj.position.y;
  obj.position.y = baseY + 1.4;
  activeBounces.push({ obj, baseY, elapsed: 0, duration: 0.58 });
  triggerSquashStretch(obj, 1.25);
  spawnSmokePoof3D(wx, wy + 0.6, wz, 0xFFFDF9, 9);
  spawnCoinFountain3D(wx, wy + 0.8, wz, 7, true);
}

function spawnSmokePoof3D(wx, wy, wz, colorHex = 0xFFFDF9, count = 8) {
  for (let i = 0; i < count; i++) {
    const puff = new THREE.Mesh(
      GEO.sphere,
      new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.82 })
    );
    puff.scale.setScalar(0.52);
    puff.position.set(wx + (Math.random() - 0.5) * 0.9, wy, wz + (Math.random() - 0.5) * 0.9);
    puff.raycast = () => {};
    const a = (Math.PI * 2 * i) / count;
    scene.add(puff);
    activeParticles.push({
      mesh: puff,
      vx: Math.cos(a) * 1.65,
      vy: 1.65 + Math.random() * 1.4,
      vz: Math.sin(a) * 1.65,
      gravity: -0.45,
      floorY: -10,
      life: 0.82
    });
  }
}

function spawnSoapBubbleOrSteam3D(em) {
  if (focusedRoomId || activeParticles.length > 95) return;
  const isBubble = em.kind === 'bubble';
  const mat = new THREE.MeshBasicMaterial({
    color: isBubble ? (Math.random() < 0.7 ? 0xBAE6FD : 0xFEF08A) : 0xFFFDF9,
    transparent: true,
    opacity: isBubble ? 0.75 : 0.52
  });
  const m = new THREE.Mesh(GEO.sphere, mat);
  m.scale.setScalar(isBubble ? 0.18 + Math.random() * 0.14 : 0.24 + Math.random() * 0.12);
  m.position.set(em.wx + (Math.random() - 0.5) * 0.35, em.wy, em.wz + (Math.random() - 0.5) * 0.24);
  m.raycast = () => {};
  scene.add(m);
  activeParticles.push({
    mesh: m,
    vx: (Math.random() - 0.5) * 0.45,
    vy: isBubble ? 0.95 + Math.random() * 0.5 : 0.75 + Math.random() * 0.35,
    vz: (Math.random() - 0.5) * 0.35,
    gravity: -0.15,
    floorY: -10,
    life: isBubble ? 1.35 : 1.15,
    grow: !isBubble
  });
}

function spawnCoinFountain3D(wx, wy, wz, count = 10, isSparkle = false) {
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(
      isSparkle ? GEO.sphere : GEO.coin,
      isSparkle ? new THREE.MeshBasicMaterial({ color: 0xFDE047 }) : MAT.coin
    );
    if (isSparkle) m.scale.setScalar(0.26);
    m.position.set(wx, wy, wz);
    m.raycast = () => {};
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.3;
    scene.add(m);
    activeParticles.push({
      mesh: m,
      vx: Math.cos(a) * 1.9,
      vy: 4.4 + Math.random() * 2.4,
      vz: Math.sin(a) * 1.9,
      gravity: 12.5,
      floorY: Math.max(0.25, wy - 0.8),
      life: 1.25
    });
  }
}

function spawnNoiseShockwave(wx, wy, wz) {
  const ring = new THREE.Mesh(
    GEO.ring,
    new THREE.MeshBasicMaterial({ color: 0xFF6B8B, transparent: true, opacity: 0.88, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(wx, wy, wz);
  ring.raycast = () => {};
  scene.add(ring);
  shockwaveRings.push({ mesh: ring, life: 0.75, maxLife: 0.75 });
}

function ensureOdorFlies(room, lot) {
  if (odorEmitters[room.id]) return;
  const fg = new THREE.Group();
  fg.position.set(lot.x + room.lx + 0.35, room.ly + 1.15, lot.z + room.lz + 0.75);
  const flyMat = new THREE.MeshBasicMaterial({ color: 0x4B4453 });
  for (let i = 0; i < 5; i++) {
    const fly = new THREE.Mesh(GEO.sphere, flyMat);
    fly.scale.setScalar(0.085);
    const a = (Math.PI * 2 * i) / 5;
    fly.position.set(Math.cos(a) * 0.48, (i % 2) * 0.22, Math.sin(a) * 0.48);
    fly.raycast = () => {};
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
// 17. [핵심 1 & 3] 전체화면 단독 룸 뷰 카메라 락 & 인테리어 가구 카탈로그 UI
// =========================================================
function computeFullScreenRoomViewParams(room) {
  const frustumW = camera.right - camera.left;
  const frustumH = camera.top - camera.bottom;
  const projW = room.rw * 0.91 + room.rd * 0.42;
  const projH = room.rh * 0.94 + room.rd * 0.36;

  // 화면의 82~88%를 가득 채우도록 평형 크기별 최적 직교 줌 자동 산출
  const stageHeightRatio = isCatalogCollapsed ? 0.78 : 0.62;
  const zoomW = (frustumW * 0.85) / projW;
  const zoomH = (frustumH * stageHeightRatio) / projH;
  const targetZoom = Math.max(1.45, Math.min(6.8, Math.min(zoomW, zoomH)));

  const lot = getLot(room.lotId);
  const wx = lot.x + room.lx;
  const wz = lot.z + room.lz;
  // 하단 가구 카탈로그 시트 위쪽 중앙 스테이지에 방이 정확히 들어오도록 시점 높이 보정
  const verticalShift = isCatalogCollapsed ? 0.0 : -(frustumH / targetZoom) * 0.11;
  const wy = room.ly + room.rh * 0.46 + verticalShift;

  return { wx, wy, wz, targetZoom };
}

function focusCameraOnRoom(roomId) {
  const room = findRoom(roomId);
  if (!room) return;
  focusedRoomId = roomId;

  const rg = lot3D[room.lotId]?.roomGroups[room.id];
  if (rg) triggerSquashStretch(rg, 0.72);

  const { wx, wy, wz, targetZoom } = computeFullScreenRoomViewParams(room);

  // 정면 입체 미니어처 하우스 뷰 각도로 밀착 클로즈업 + 좌우 360° 드래그 회전 활성화
  const viewDir = new THREE.Vector3(14, 11.5, 32).normalize().multiplyScalar(36);
  camTween.look.set(wx, wy, wz);
  camTween.pos.set(wx + viewDir.x, wy + viewDir.y, wz + viewDir.z);
  camTween.zoom = targetZoom;
  camTween.active = true;

  controls.enablePan = false;
  controls.enableRotate = true;
  controls.minZoom = Math.max(1.1, targetZoom * 0.68);
  controls.maxZoom = Math.min(8.5, targetZoom * 1.65);
  controls.minPolarAngle = Math.PI * 0.12;
  controls.maxPolarAngle = Math.PI * 0.46;

  // UI 전환: 타운 하단 바 숨김 -> 전체화면 룸 뷰 상단바 + 우측 세대카드 + 하단 가구 카탈로그 바텀시트 오픈!
  if (dom.roomVignette) dom.roomVignette.classList.remove('hidden');
  if (dom.hudTownControls) dom.hudTownControls.classList.add('hidden');
  if (dom.roomFocusTopbar) dom.roomFocusTopbar.classList.remove('hidden');
  if (dom.bottomTownBar) dom.bottomTownBar.classList.add('hidden');
  dom.roomFocusPanel.classList.remove('hidden');
  if (dom.furnitureSheet) dom.furnitureSheet.classList.remove('hidden');

  renderRoomSwitcherChips(room);
  renderFocusedRoomDrawer();
  renderFurnitureCatalogSheet();
}

function exitRoomFocusMode() {
  const prevRoom = focusedRoomId ? findRoom(focusedRoomId) : null;
  focusedRoomId = null;

  if (dom.roomVignette) dom.roomVignette.classList.add('hidden');
  if (dom.hudTownControls) dom.hudTownControls.classList.remove('hidden');
  if (dom.roomFocusTopbar) dom.roomFocusTopbar.classList.add('hidden');
  if (dom.bottomTownBar) dom.bottomTownBar.classList.remove('hidden');
  dom.roomFocusPanel.classList.add('hidden');
  if (dom.furnitureSheet) dom.furnitureSheet.classList.add('hidden');

  controls.enablePan = true;
  controls.minZoom = 0.45;
  controls.maxZoom = 7.5;
  controls.minPolarAngle = Math.PI * 0.16;
  controls.maxPolarAngle = Math.PI * 0.44;

  if (prevRoom) {
    const lot = getLot(prevRoom.lotId);
    const off = CAM_OFFSETS[camAzimuth];
    camTween.look.set(lot.x, 10.5, lot.z);
    camTween.pos.set(lot.x + off.x, 10.5 + off.y * 0.82, lot.z + off.z);
    camTween.zoom = 1.05;
    camTween.active = true;
  } else {
    resetOverviewCamera();
  }
}

function focusCameraOnLot(lotId, zoomLv = 1.05) {
  const lot = getLot(lotId);
  if (!lot) return;
  if (focusedRoomId) exitRoomFocusMode();

  if (lot3D[lotId]?.root) {
    triggerSquashStretch(lot3D[lotId].root, 0.8);
  }

  const isBldg = Boolean(state.buildings[lotId]);
  const lookY = isBldg ? 10.2 : 2.5;
  const off = CAM_OFFSETS[camAzimuth];
  camTween.look.set(lot.x, lookY, lot.z);
  camTween.pos.set(lot.x + off.x, lookY + off.y * 0.85, lot.z + off.z);
  camTween.zoom = zoomLv;
  camTween.active = true;
}

function resetOverviewCamera() {
  if (focusedRoomId) {
    focusedRoomId = null;
    if (dom.roomVignette) dom.roomVignette.classList.add('hidden');
    if (dom.hudTownControls) dom.hudTownControls.classList.remove('hidden');
    if (dom.roomFocusTopbar) dom.roomFocusTopbar.classList.add('hidden');
    if (dom.bottomTownBar) dom.bottomTownBar.classList.remove('hidden');
    dom.roomFocusPanel.classList.add('hidden');
    if (dom.furnitureSheet) dom.furnitureSheet.classList.add('hidden');
  }
  controls.enablePan = true;
  controls.minZoom = 0.45;
  controls.maxZoom = 7.5;

  const off = CAM_OFFSETS[camAzimuth];
  camTween.look.copy(OVERVIEW_LOOK);
  camTween.pos.copy(OVERVIEW_LOOK).add(off);
  camTween.zoom = 0.82;
  camTween.active = true;
}

function renderRoomSwitcherChips(curRoom) {
  if (!dom.roomSwitcherChips) return;
  const b = state.buildings[curRoom.lotId];
  if (!b) return;

  dom.roomSwitcherChips.innerHTML = b.rooms.map((r) => {
    const meta = ROOM_TYPE_META[r.layoutType] || ROOM_TYPE_META.studio;
    const isAct = r.id === curRoom.id;
    return `
      <button type="button" data-hop-room="${r.id}" class="room-hop-chip ${isAct ? 'active' : ''}">
        <span>${meta.emoji} ${r.subId}호</span>
        <span class="opacity-85">${meta.shortBadge}${!r.unlocked ? '(잠김)' : ''}</span>
      </button>`;
  }).join('');

  dom.roomSwitcherChips.querySelectorAll('[data-hop-room]').forEach((btn) => {
    btn.onclick = () => focusCameraOnRoom(btn.dataset.hopRoom);
  });
}

// [핵심 3] 인테리어 가구 카탈로그 바텀시트 렌더링 & 구매/교체 로직
function renderFurnitureCatalogSheet() {
  const room = findRoom(focusedRoomId);
  if (!room || !dom.furnitureSheet) return;

  const meta = ROOM_TYPE_META[room.layoutType] || ROOM_TYPE_META.studio;
  const furnBonus = calcRoomFurnitureRentAdd(room);
  const totalRent = calcRoomRent(room);

  if (dom.fcatRoomBadge) {
    dom.fcatRoomBadge.textContent = `${meta.emoji} ${room.subId}호 · ${meta.badge}`;
  }
  if (dom.fcatBonusBadge) {
    dom.fcatBonusBadge.textContent = `가구보너스 +${furnBonus}만 (월세 +${totalRent}만)`;
  }

  document.querySelectorAll('.fcat-tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.fcat === activeFurnitureCategory);
  });

  if (dom.fcatCollapsibleBody) {
    dom.fcatCollapsibleBody.classList.toggle('hidden', isCatalogCollapsed);
  }
  if (dom.btnToggleCatalog) {
    dom.btnToggleCatalog.textContent = isCatalogCollapsed ? '▲ 가구 카탈로그 펼치기' : '▼ 접기';
  }
  if (isCatalogCollapsed) return;

  const items = FURNITURE_CATALOG[activeFurnitureCategory] || [];
  const ownedList = room.ownedFurniture[activeFurnitureCategory] || [];
  const equippedId = room.equippedFurniture[activeFurnitureCategory];

  dom.fcatItemsGrid.innerHTML = items.map((item) => {
    const isEquipped = equippedId === item.id;
    const isOwned = ownedList.includes(item.id) || item.cost === 0;
    const canAfford = state.gold >= item.cost;

    let btnHtml = '';
    if (!room.unlocked) {
      btnHtml = `
        <button type="button" data-unlock-first="1" class="jelly-action-btn btn-gold-lip w-full !py-1.5">
          ${createCustomSVGIcon('gold_key', 13)}
          <span>호실 개방 필요 (${room.unlockCost}만)</span>
        </button>`;
    } else if (isEquipped) {
      btnHtml = `
        <button type="button" disabled class="jelly-action-btn btn-mint-lip w-full !py-1.5 !opacity-95">
          ${createCustomSVGIcon('sparkle_star', 13)}
          <span>시공 장착중</span>
        </button>`;
    } else if (isOwned) {
      btnHtml = `
        <button type="button" data-fitem="${item.id}" class="btn-pick-furniture jelly-action-btn btn-coral-lip w-full !py-1.5">
          <span>무료 교체 배치</span>
        </button>`;
    } else {
      btnHtml = `
        <button type="button" data-fitem="${item.id}" ${!canAfford ? 'disabled' : ''} class="btn-pick-furniture jelly-action-btn ${canAfford ? 'btn-gold-lip' : 'btn-coral-lip'} w-full !py-1.5">
          ${createCustomSVGIcon('coin_stack', 13)}
          <span>구매 시공 · ${item.cost}만</span>
        </button>`;
    }

    return `
      <div class="fcat-item-card ${isEquipped ? 'equipped-card' : ''}">
        <div class="flex items-center gap-2">
          ${createFurnitureArtworkSVG(item.id, 40)}
          <div class="min-w-0 flex-1 space-y-0.5">
            <div class="diary-card-title !text-[12px] leading-snug break-keep">${item.name}</div>
            <div class="flex items-center gap-1 flex-wrap">
              <span class="kw-chip tone-${item.tone || 'gold'} !py-0.5 !px-2 !text-[10px]">${item.chip}</span>
              ${item.happyAdd > 0 ? `<span class="kw-chip tone-coral !py-0.5 !px-1.5 !text-[10px]">행복 +${item.happyAdd}%</span>` : ''}
            </div>
          </div>
        </div>
        ${btnHtml}
      </div>`;
  }).join('');

  dom.fcatItemsGrid.querySelectorAll('[data-unlock-first]').forEach((btn) => {
    btn.onclick = () => unlockRoomAction(room);
  });

  dom.fcatItemsGrid.querySelectorAll('.btn-pick-furniture').forEach((btn) => {
    btn.onclick = () => purchaseOrEquipFurniture(room, activeFurnitureCategory, btn.dataset.fitem);
  });
}

function purchaseOrEquipFurniture(room, category, itemId) {
  if (!room.unlocked) {
    showToast('먼저 호실을 개방해 주세요!', 'rose');
    return;
  }
  const itemDef = getFurnitureItemDef(category, itemId);
  if (!itemDef) return;

  const ownedList = room.ownedFurniture[category] || [];
  const alreadyOwned = ownedList.includes(itemId) || itemDef.cost === 0;

  if (!alreadyOwned) {
    if (state.gold < itemDef.cost) {
      showToast(`시공 비용(${itemDef.cost}만)이 부족합니다!`, 'rose');
      return;
    }
    addGold(-itemDef.cost);
    ownedList.push(itemId);
    room.ownedFurniture[category] = ownedList;
    if (itemDef.grantsSoundproof) {
      room.soundproofed = true;
      state.stats.crisisResolved += 1;
    }
  }

  room.equippedFurniture[category] = itemId;
  syncRoomInteriorStats(room);

  // 즉시 3D 가구 메쉬 교체 + 탄성 바운스(Poof!) + 세입자 환호 리액션!
  rebuildRoom3D(room);
  const lot = getLot(room.lotId);
  const rg = lot3D[room.lotId]?.roomGroups[room.id];

  let poofWorldX = lot.x + room.lx;
  let poofWorldY = room.ly + 1.0;
  let poofWorldZ = lot.z + room.lz;

  if (rg) {
    const targetSubGroup = rg.userData.furnitureGroups?.[category];
    if (targetSubGroup) {
      triggerSquashStretch(targetSubGroup, 1.55);
      poofWorldX = lot.x + room.lx + targetSubGroup.position.x;
      poofWorldY = room.ly + targetSubGroup.position.y + 0.85;
      poofWorldZ = lot.z + room.lz + targetSubGroup.position.z;
    } else {
      triggerSquashStretch(rg, 0.9);
    }
  }

  spawnSmokePoof3D(poofWorldX, poofWorldY, poofWorldZ, 0xFFFDF9, 12);
  spawnCoinFountain3D(poofWorldX, poofWorldY + 0.35, poofWorldZ, 9, true);

  if (room.household) {
    room.household.happiness = Math.min(100, room.household.happiness + (alreadyOwned ? 6 : Math.max(12, itemDef.happyAdd)));
    room.evictionCountdown = null;
    if (residentActors[room.id]) {
      residentActors[room.id].forEach((ac) => triggerSquashStretch(ac.mesh, 1.45));
    }
    showRoomSpeech(room, itemDef.reaction, false, 4.2);
  }

  showToast(`[${room.subId}호] ${itemDef.name} 배치 완료!`, 'emerald');
  renderFocusedRoomDrawer();
  renderFurnitureCatalogSheet();
  saveState();
}

function unlockRoomAction(room) {
  if (state.gold < room.unlockCost) {
    showToast(`호실 개방 비용(${room.unlockCost}만) 부족!`, 'rose');
    return;
  }
  const lot = getLot(room.lotId);
  addGold(-room.unlockCost);
  room.unlocked = true;
  rebuildRoom3D(room);
  triggerDropBounce(lot3D[room.lotId].roomGroups[room.id], lot.x + room.lx, room.ly, lot.z + room.lz);
  showToast(`[${room.subId}호 · ${ROOM_TYPE_META[room.layoutType].badge}] 개방 완료!`, 'emerald');
  if (focusedRoomId === room.id) {
    renderRoomSwitcherChips(room);
    renderFocusedRoomDrawer();
    renderFurnitureCatalogSheet();
  }
  saveState();
}

function renderVisualChipList(items = []) {
  return items
    .map((it) => `<span class="kw-chip tone-${it.tone || 'gold'}">${createCustomSVGIcon(it.ico || 'sparkle_star', 13)}<span>${it.label || it.text}</span></span>`)
    .join('');
}

function getRoomCleanPct(room, hDef) {
  if (hDef.isHoarder) return Math.round(((3 - room.trashStage) / 3) * 100);
  return room.activeConflict === 'odor' ? 50 : 100;
}

function getRoomNoiseGauge(room, hDef) {
  if (room.soundproofed) return { text: '방음 완료', pct: 8, barCls: 'candy-mint' };
  const lv = hDef.noiseLv || 1;
  return {
    text: `소음 Lv.${lv}`,
    pct: Math.round((lv / 3) * 100),
    barCls: lv >= 3 ? 'candy-coral' : lv === 2 ? 'candy-gold' : 'candy-sky'
  };
}

function renderRoomComplaintBadge(room) {
  if (!room.household) return '';
  const b = state.buildings[room.lotId];
  const hDef = HOUSEHOLD_TYPES[room.household.type] || HOUSEHOLD_TYPES.student;
  let ico = null;
  let label = null;

  if (room.evictionCountdown !== null) {
    ico = 'relocate_move';
    label = `퇴거 D-${Math.ceil(room.evictionCountdown)}s`;
  } else if (room.floor >= 2 && hDef.needsElevator && b && !b.infra.elevator) {
    ico = 'elevator';
    label = '엘리베이터 필요!';
  } else if (hDef.needsRecycling && b && !b.infra.recycling) {
    ico = 'recycle_bin';
    label = '분리수거장 필요!';
  } else if (room.trashStage >= 2) {
    ico = 'broom_clean';
    label = '특수청소 시급!';
  } else if (room.activeConflict === 'noise') {
    ico = 'sound_wave';
    label = '층간소음 호소!';
  } else if (room.activeConflict === 'odor') {
    ico = 'broom_clean';
    label = '악취 민원!';
  }

  if (!label) return '';
  return `<span class="inline-flex items-center gap-1">${createCustomSVGIcon('alert_bubble', 15)}<span class="complaint-alert-chip">${createCustomSVGIcon(ico, 13)}<span>${label}</span></span></span>`;
}

function renderFocusedRoomDrawer() {
  const room = findRoom(focusedRoomId);
  if (!room) {
    dom.roomFocusPanel.classList.add('hidden');
    return;
  }
  const b = state.buildings[room.lotId];
  const lot = getLot(room.lotId);
  const meta = ROOM_TYPE_META[room.layoutType] || ROOM_TYPE_META.studio;
  const mRent = calcRoomRent(room);

  if (dom.rfRoomNum) dom.rfRoomNum.textContent = room.subId;
  if (dom.rfTypeBadge) {
    dom.rfTypeBadge.className = `kw-chip tone-${meta.tone} !py-0.5 !px-2 shrink-0`;
    dom.rfTypeBadge.textContent = `${meta.emoji} ${meta.shortBadge}`;
  }
  if (dom.rfTitle) dom.rfTitle.textContent = b.title;
  dom.rfTierBadge.textContent = `Lv.${room.interiorLv}`;
  if (dom.rfBtnRename) {
    dom.rfBtnRename.onclick = () => openRenameBuildingModal(room.lotId);
  }
  if (dom.rfBody) {
    dom.rfBody.classList.toggle('hidden', isRfBodyCollapsed);
  }

  if (!room.unlocked) {
    dom.rfBody.innerHTML = `
      <div class="diary-card text-center space-y-2">
        <div class="text-[11.5px] font-display text-[#7A6254]">${meta.badge} (${meta.specialty})</div>
        <button id="rf-btn-unlock" class="jelly-action-btn btn-gold-lip w-full">
          ${createCustomSVGIcon('gold_key', 15)}
          <span>호실 개방하기 (${room.unlockCost}만)</span>
        </button>
      </div>`;
    document.getElementById('rf-btn-unlock').onclick = () => unlockRoomAction(room);
    return;
  }

  if (!room.household) {
    dom.rfBody.innerHTML = `
      <div class="diary-card space-y-2">
        <div class="flex items-center justify-between flex-wrap gap-1">
          <span class="kw-chip tone-mint">${createCustomSVGIcon('red_house', 13)}<span>공실 대기</span></span>
          <span class="kw-chip tone-gold">${createCustomSVGIcon('coin_stack', 13)}<span>+${mRent}만/주기</span></span>
        </div>
        <div class="text-[11px] font-display text-[#7A6254]">${meta.specialty}</div>
        <button id="rf-btn-recruit" class="jelly-action-btn btn-mint-lip w-full">
          ${createCustomSVGIcon('megaphone', 15)}
          <span>입주 계약 체결</span>
        </button>
      </div>`;
    document.getElementById('rf-btn-recruit').onclick = () => openRecruitModal(room);
    return;
  }

  const h = room.household;
  const hDef = HOUSEHOLD_TYPES[h.type] || HOUSEHOLD_TYPES.student;
  const paid = getEffectiveRent(room);
  const cleanPct = getRoomCleanPct(room, hDef);
  const complaintHtml = renderRoomComplaintBadge(room);

  dom.rfBody.innerHTML = `
    <div class="diary-card space-y-2">
      <div class="flex items-center gap-2">
        ${createNotebookArtworkSVG(`avatar_${h.type}`, 42)}
        <div class="min-w-0 flex-1 space-y-0.5">
          <div class="flex items-center justify-between gap-1">
            <span class="diary-card-title truncate">${h.familyName}</span>
            <span class="kw-chip tone-mint !py-0.5 !px-2">${createCustomSVGIcon('coin_stack', 12)}<span>+${paid}만</span></span>
          </div>
          <div class="flex items-center gap-1 flex-wrap">
            <span class="role-accent-badge !py-0.5" style="background:${hDef.accentHex}">${hDef.label} · ${hDef.memberCount}인</span>
          </div>
        </div>
      </div>

      ${complaintHtml ? `<div class="flex flex-wrap gap-1">${complaintHtml}</div>` : ''}

      <div class="diary-soft-box space-y-1.5">
        <div class="space-y-0.5">
          <div class="flex items-center justify-between diary-body-text !text-[11px]">
            <span class="flex items-center gap-1">${createCustomSVGIcon('heart_gauge', 12)} 행복도</span>
            <b>${Math.round(h.happiness)}%</b>
          </div>
          <div class="candy-gauge-track"><div class="candy-gauge-fill ${h.happiness <= 35 ? 'candy-coral' : 'candy-mint'}" style="width:${Math.round(h.happiness)}%"></div></div>
        </div>
        <div class="space-y-0.5">
          <div class="flex items-center justify-between diary-body-text !text-[11px]">
            <span class="flex items-center gap-1">${createCustomSVGIcon('broom_clean', 12)} 청결 · 한도</span>
            <b>${cleanPct}% · ${h.maxBudget}만</b>
          </div>
          <div class="candy-gauge-track"><div class="candy-gauge-fill ${cleanPct <= 40 ? 'candy-coral' : 'candy-sky'}" style="width:${cleanPct}%"></div></div>
        </div>
      </div>

      ${hDef.isHoarder ? `
        <button id="rf-btn-clean" class="jelly-action-btn btn-sky-lip w-full !py-1.5">
          ${createCustomSVGIcon('broom_clean', 14)}
          <span>특수청소 ${GAME_BALANCE.specialCleanCost}만</span>
        </button>
      ` : ''}

      <div class="grid grid-cols-2 gap-1">
        <button id="rf-btn-soundproof" ${room.soundproofed ? 'disabled' : ''} class="jelly-action-btn btn-gold-lip !py-1.5">
          ${createCustomSVGIcon('soundproof_hammer', 13)}
          <span>${room.soundproofed ? '방음완료' : `방음 ${GAME_BALANCE.soundproofCost}만`}</span>
        </button>
        <button id="rf-btn-gift" class="jelly-action-btn btn-mint-lip !py-1.5">
          ${createCustomSVGIcon('gift_box', 13)}
          <span>선물 ${GAME_BALANCE.mediationGiftCost}만</span>
        </button>
        <button id="rf-btn-relocate" class="jelly-action-btn btn-sky-lip !py-1.5">
          ${createCustomSVGIcon('relocate_move', 13)}
          <span>이사 ${GAME_BALANCE.relocateCost}만</span>
        </button>
        <button id="rf-btn-evict" class="jelly-action-btn btn-coral-lip !py-1.5">
          ${createCustomSVGIcon('evict_stamp', 13)}
          <span>퇴거</span>
        </button>
      </div>
    </div>`;

  const cleanBtn = document.getElementById('rf-btn-clean');
  if (cleanBtn) cleanBtn.onclick = () => executeSpecialClean(room);

  const spBtn = document.getElementById('rf-btn-soundproof');
  if (spBtn) {
    spBtn.onclick = () => {
      if (state.gold < GAME_BALANCE.soundproofCost) { showToast('방음 시공비 부족!', 'rose'); return; }
      addGold(-GAME_BALANCE.soundproofCost);
      room.soundproofed = true;
      state.stats.crisisResolved += 1;
      rebuildRoom3D(room);
      triggerSquashStretch(lot3D[room.lotId].roomGroups[room.id], 0.95);
      spawnSmokePoof3D(lot.x + room.lx, room.ly + 0.8, lot.z + room.lz, 0xFFFDF9, 9);
      showToast(`[${room.subId}호] 방음 시공 완료!`, 'emerald');
      renderFocusedRoomDrawer();
      renderFurnitureCatalogSheet();
      saveState();
    };
  }

  const giftBtn = document.getElementById('rf-btn-gift');
  if (giftBtn) {
    giftBtn.onclick = () => {
      if (state.gold < GAME_BALANCE.mediationGiftCost) { showToast('선물 비용 부족!', 'rose'); return; }
      addGold(-GAME_BALANCE.mediationGiftCost);
      room.household.happiness = Math.min(100, room.household.happiness + 30);
      room.evictionCountdown = null;
      state.stats.crisisResolved += 1;
      rebuildRoom3D(room);
      showRoomSpeech(room, '집주인님 따뜻한 선물 정말 감사합니다! 💕', false, 3.6);
      showToast(`[${room.subId}호] 행복도 +30% 회복!`, 'emerald');
      renderFocusedRoomDrawer();
      saveState();
    };
  }

  const relocBtn = document.getElementById('rf-btn-relocate');
  if (relocBtn) relocBtn.onclick = () => relocateHouseholdToVacant(room);

  const evictBtn = document.getElementById('rf-btn-evict');
  if (evictBtn) evictBtn.onclick = () => executeDramaticEviction(room);
}

function executeSpecialClean(room) {
  if (state.gold < GAME_BALANCE.specialCleanCost) {
    showToast(`특수청소 비용(${GAME_BALANCE.specialCleanCost}만) 부족!`, 'rose');
    return;
  }
  const lot = getLot(room.lotId);
  addGold(-GAME_BALANCE.specialCleanCost);
  room.trashStage = 0;
  room.trashProgress = 0;
  clearOdorFlies(room.id);
  state.stats.crisisResolved += 1;

  rebuildRoom3D(room);
  triggerSquashStretch(lot3D[room.lotId].roomGroups[room.id], 1.1);
  spawnSmokePoof3D(lot.x + room.lx, room.ly + 0.9, lot.z + room.lz, 0xFFFDF9, 12);
  spawnCoinFountain3D(lot.x + room.lx, room.ly + 1.1, lot.z + room.lz, 8, true);

  showRoomSpeech(room, HOUSEHOLD_TYPES.hikikomori.cleanedGrumbleQuote, true, 4.2);
  showToast(`[${room.subId}호] 특수청소 완료!`, 'emerald');
  if (focusedRoomId === room.id) renderFocusedRoomDrawer();
  if (!dom.notebookModal.classList.contains('hidden')) renderNotebookSplitView();
  saveState();
}

function executeDramaticEviction(room) {
  if (!room.household) return;
  const lot = getLot(room.lotId);
  const evictedName = room.household.familyName;

  dom.evictionOverlay.classList.remove('hidden');
  dom.evictionStampBox.classList.remove('stamp-slam-anim');
  void dom.evictionStampBox.offsetWidth;
  dom.evictionStampBox.classList.add('stamp-slam-anim');
  setTimeout(() => dom.evictionOverlay.classList.add('hidden'), 1200);

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
  spawnSmokePoof3D(lot.x + room.lx, room.ly + 1.0, lot.z + room.lz, 0xFFFDF9, 14);

  showToast(`[${room.subId}호] ${evictedName} 퇴거 완료!`, 'amber');
  if (focusedRoomId === room.id) renderFocusedRoomDrawer();
  if (!dom.notebookModal.classList.contains('hidden')) renderNotebookSplitView();
  saveState();
}

function relocateHouseholdToVacant(room) {
  const b = state.buildings[room.lotId];
  const vacant = b.rooms.find((r) => r.unlocked && !r.household && r.id !== room.id);
  if (!vacant) {
    showToast('빈 개방 호실이 없습니다!', 'rose');
    return;
  }
  if (state.gold < GAME_BALANCE.relocateCost) {
    showToast('이사 비용 부족!', 'rose');
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
  showToast(`[${vacant.subId}호] 이전 완료!`, 'emerald');
  saveState();
}

// =========================================================
// 18. [핵심 4] 밝은 바닐라 크림 단일 통합형 타운 수첩 모달
// =========================================================
function openNotebookModal(tab = null) {
  if (tab) activeNotebookTab = tab;
  selectedSplitItemId = null;
  dom.notebookModal.classList.remove('hidden');
  renderNotebookSplitView();
}

function updateCoinSliderTooltip(inputEl, bubbleEl, textFn) {
  if (!inputEl || !bubbleEl) return;
  const min = Number(inputEl.min);
  const max = Number(inputEl.max);
  const val = Number(inputEl.value);
  const pct = ((val - min) / Math.max(1, max - min)) * 100;
  const clampedPct = Math.max(14, Math.min(86, pct));
  bubbleEl.style.left = `${clampedPct}%`;
  bubbleEl.textContent = textFn(val);
}

function navigateToQuestTarget(curQ) {
  if (curQ.openTab) {
    openNotebookModal(curQ.openTab);
    return;
  }
  dom.notebookModal.classList.add('hidden');
  if (curQ.focusSubRoom) {
    const rm = state.buildings[curQ.focusLot]?.rooms.find((r) => r.subId === curQ.focusSubRoom);
    if (rm) focusCameraOnRoom(rm.id);
  } else if (curQ.focusLot) {
    const targetLot = getLot(curQ.focusLot);
    focusCameraOnLot(curQ.focusLot, 1.15);
    if (targetLot && !targetLot.owned) {
      if (lot3D[curQ.focusLot]?.signpostPivot) triggerSquashStretch(lot3D[curQ.focusLot].signpostPivot, 1.4);
      openLotDevModal(curQ.focusLot);
    }
  }
}

function renderNotebookSplitView() {
  if (!dom.notebookBody) return;

  document.querySelectorAll('.ntab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.ntab === activeNotebookTab);
  });

  const doneTotal = state.claimedQuests.length;
  if (dom.modalQuestSummary) {
    dom.modalQuestSummary.textContent = `${doneTotal}/${QUEST_LIST.length}`;
  }

  // 탭 1: 퀘스트
  if (activeNotebookTab === 'quests') {
    const totalPct = Math.round((doneTotal / QUEST_LIST.length) * 100);

    dom.notebookBody.innerHTML = `
      <div class="diary-soft-box space-y-1.5">
        <div class="flex items-center justify-between diary-body-text">
          <span class="flex items-center gap-1.5">${createCustomSVGIcon('quest_trophy', 15)} <b>타운 퀘스트 달성률</b></span>
          <b>${doneTotal} / ${QUEST_LIST.length} 완료</b>
        </div>
        <div class="candy-gauge-track">
          <div class="candy-gauge-fill candy-gold" style="width:${totalPct}%"></div>
        </div>
      </div>

      <div class="space-y-2">
        ${QUEST_LIST.map((q) => {
          const claimed = state.claimedQuests.includes(q.id);
          const ready = !claimed && q.check(state);
          const prog = q.progress ? q.progress(state) : { cur: ready || claimed ? 1 : 0, max: 1 };
          const pRatio = Math.min(100, Math.round((prog.cur / Math.max(1, prog.max)) * 100));

          let actionHtml = '';
          if (claimed) {
            actionHtml = `<div class="shrink-0 flex items-center justify-end">${createNotebookArtworkSVG('stamp_complete', 38)}</div>`;
          } else if (ready) {
            actionHtml = `
              <button data-claim-id="${q.id}" class="btn-q-claim jelly-action-btn btn-mint-lip shrink-0">
                ${createCustomSVGIcon('coin_stack', 14)}
                <span>+${q.reward}만 수령</span>
              </button>`;
          } else {
            actionHtml = `
              <button data-go-id="${q.id}" class="btn-q-go jelly-action-btn btn-coral-lip shrink-0">
                ${createCustomSVGIcon('target_aim', 14)}
                <span>바로가기</span>
              </button>`;
          }

          return `
            <div id="qcard_${q.id}" class="quest-unified-card ${ready ? 'ready-card' : ''}">
              <div class="flex items-start justify-between gap-2 w-full">
                <div class="flex items-center gap-2 min-w-0 flex-1">
                  ${createCustomSVGIcon(q.icon || 'sparkle_star', 20)}
                  <span class="diary-card-title leading-snug break-keep">${q.title}</span>
                </div>
                <span class="kw-chip ${claimed ? 'tone-coral' : ready ? 'tone-mint' : 'tone-gold'} shrink-0">
                  ${createCustomSVGIcon('coin_stack', 12)}
                  <span>+${q.reward}만</span>
                </span>
              </div>

              <div class="flex items-center justify-between gap-3 w-full">
                <div class="flex-1 min-w-0 space-y-1">
                  <div class="flex justify-between text-[11px] font-num text-[#7A6254]">
                    <span>진행도</span>
                    <span>${prog.cur} / ${prog.max}</span>
                  </div>
                  <div class="candy-gauge-track">
                    <div class="candy-gauge-fill ${claimed || ready ? 'candy-mint' : 'candy-gold'}" style="width:${pRatio}%"></div>
                  </div>
                </div>
                ${actionHtml}
              </div>
            </div>`;
        }).join('')}
      </div>
    `;

    dom.notebookBody.querySelectorAll('.btn-q-claim').forEach((btn) => {
      btn.onclick = () => {
        const q = QUEST_LIST.find((x) => x.id === btn.dataset.claimId);
        if (!q || state.claimedQuests.includes(q.id)) return;
        state.claimedQuests.push(q.id);
        addGold(q.reward);
        showToast(`[${q.title}] +${q.reward}만 수령!`, 'emerald');
        renderNotebookSplitView();
        saveState();
      };
    });

    dom.notebookBody.querySelectorAll('.btn-q-go').forEach((btn) => {
      btn.onclick = () => {
        const q = QUEST_LIST.find((x) => x.id === btn.dataset.goId);
        if (q) navigateToQuestTarget(q);
      };
    });
  }

  // 탭 2: 세대도감 (단일 통합 리스트 — 중복 리스트 원천 제거!)
  else if (activeNotebookTab === 'tenants') {
    const allRooms = Object.values(state.buildings).flatMap((b) => b.rooms);
    if (!selectedSplitItemId || !allRooms.some((r) => r.id === selectedSplitItemId)) {
      const firstOccupied = allRooms.find((r) => r.unlocked && r.household);
      selectedSplitItemId = (firstOccupied || allRooms[0])?.id;
    }

    const chipBarHtml = `
      <div class="flex items-center gap-1.5 overflow-x-auto custom-scroll pb-1">
        ${allRooms.map((r) => {
          const h = r.household;
          const meta = ROOM_TYPE_META[r.layoutType] || ROOM_TYPE_META.studio;
          const hasCrisis = h && (r.trashStage >= 2 || r.activeConflict || r.evictionCountdown !== null);
          const sel = selectedSplitItemId === r.id;
          const statusTxt = !r.unlocked ? '잠김' : hasCrisis ? '민원!' : h ? `${Math.round(h.happiness)}%` : '공실';
          return `
            <button type="button" data-rid="${r.id}" class="selector-chip-btn ${sel ? 'active' : ''}">
              <span>${meta.emoji} ${r.subId}호(${meta.shortBadge})</span>
              <span class="opacity-85">· ${statusTxt}</span>
            </button>`;
        }).join('')}
      </div>`;

    const curR = allRooms.find((r) => r.id === selectedSplitItemId) || allRooms[0];
    const curMeta = ROOM_TYPE_META[curR?.layoutType] || ROOM_TYPE_META.studio;
    let detailHtml = '';

    if (curR && !curR.unlocked) {
      detailHtml = `
        <div class="diary-card text-center space-y-3 !py-6">
          <div class="flex justify-center">${createCustomSVGIcon('gold_key', 38)}</div>
          <div class="flex items-center justify-center gap-2 flex-wrap">
            <span class="hotel-num-tag">${curR.subId}</span>
            <span class="kw-chip tone-${curMeta.tone}">${curMeta.emoji} ${curMeta.badge}</span>
            <span class="kw-chip tone-gold">${createCustomSVGIcon('gold_key', 13)}<span>미개방</span></span>
          </div>
          <div class="flex items-center justify-center gap-2">
            <button id="sp-preview-room" class="jelly-action-btn btn-coral-lip px-4 py-2">
              <span>전체화면 구조 보기</span>
            </button>
            <button id="sp-unlock-room" class="jelly-action-btn btn-gold-lip px-4 py-2">
              ${createCustomSVGIcon('coin_stack', 15)}
              <span>개방하기 (${curR.unlockCost}만)</span>
            </button>
          </div>
        </div>`;
    } else if (curR && !curR.household) {
      detailHtml = `
        <div class="diary-card text-center space-y-3 !py-6">
          <div class="flex justify-center">${createCustomSVGIcon('red_house', 40)}</div>
          <div class="flex items-center justify-center gap-2 flex-wrap">
            <span class="hotel-num-tag">${curR.subId}</span>
            <span class="kw-chip tone-${curMeta.tone}">${curMeta.emoji} ${curMeta.badge}</span>
            <span class="kw-chip tone-gold">${createCustomSVGIcon('coin_stack', 13)}<span>+${calcRoomRent(curR)}만/주기</span></span>
          </div>
          <div class="flex items-center justify-center gap-2">
            <button id="sp-preview-room" class="jelly-action-btn btn-coral-lip px-4 py-2">
              <span>가구 꾸미러 가기</span>
            </button>
            <button id="sp-rec-now" class="jelly-action-btn btn-mint-lip px-4 py-2">
              ${createCustomSVGIcon('megaphone', 15)}
              <span>입주 계약 체결</span>
            </button>
          </div>
        </div>`;
    } else if (curR) {
      const h = curR.household;
      const hDef = HOUSEHOLD_TYPES[h.type] || HOUSEHOLD_TYPES.student;
      const paid = getEffectiveRent(curR);
      const cleanPct = getRoomCleanPct(curR, hDef);
      const noiseG = getRoomNoiseGauge(curR, hDef);
      const complaintBadge = renderRoomComplaintBadge(curR);

      detailHtml = `
        <div class="diary-card space-y-3 relative">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-2.5">
              ${createNotebookArtworkSVG(`avatar_${h.type}`, 48)}
              <div class="space-y-1">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="hotel-num-tag">${curR.subId}</span>
                  <span class="kw-chip tone-${curMeta.tone}">${curMeta.emoji} ${curMeta.shortBadge}</span>
                  <span class="diary-card-title !text-[14px]">${h.familyName}</span>
                  <span class="role-accent-badge" style="background:${hDef.accentHex}">${hDef.label} · ${hDef.memberCount}인</span>
                </div>
                <div class="flex flex-wrap items-center gap-1">
                  ${renderVisualChipList(hDef.traitBadges)}
                  ${complaintBadge}
                </div>
              </div>
            </div>
            <button id="sp-focus-room" class="jelly-action-btn pill btn-coral-lip">
              ${createCustomSVGIcon('red_house', 14)}
              <span>전체화면 방 보기</span>
            </button>
          </div>

          <div class="diary-soft-box grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div class="space-y-1">
              <div class="flex justify-between diary-body-text">
                <span class="flex items-center gap-1">${createCustomSVGIcon('heart_gauge', 14)} 행복도</span>
                <b>${Math.round(h.happiness)}%</b>
              </div>
              <div class="candy-gauge-track"><div class="candy-gauge-fill ${h.happiness <= 35 ? 'candy-coral' : 'candy-mint'}" style="width:${Math.round(h.happiness)}%"></div></div>
            </div>

            <div class="space-y-1">
              <div class="flex justify-between diary-body-text">
                <span class="flex items-center gap-1">${createCustomSVGIcon('broom_clean', 14)} 청결도</span>
                <b>${cleanPct}%</b>
              </div>
              <div class="candy-gauge-track"><div class="candy-gauge-fill ${cleanPct <= 40 ? 'candy-coral' : 'candy-sky'}" style="width:${cleanPct}%"></div></div>
            </div>

            <div class="space-y-1">
              <div class="flex justify-between diary-body-text">
                <span class="flex items-center gap-1">${createCustomSVGIcon('sound_wave', 14)} ${noiseG.text}</span>
                <b>${curR.soundproofed ? '차단됨' : `${noiseG.pct}%`}</b>
              </div>
              <div class="candy-gauge-track"><div class="candy-gauge-fill ${noiseG.barCls}" style="width:${noiseG.pct}%"></div></div>
            </div>

            <div class="space-y-1">
              <div class="flex justify-between diary-body-text">
                <span class="flex items-center gap-1">${createCustomSVGIcon('coin_stack', 14)} 월세 한도</span>
                <b>+${paid} / ${h.maxBudget}만</b>
              </div>
              <div class="candy-gauge-track"><div class="candy-gauge-fill candy-gold" style="width:${Math.min(100, Math.round((paid / h.maxBudget) * 100))}%"></div></div>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5 items-center">
            ${curR.soundproofed
              ? `<div class="diary-soft-box !py-1 flex items-center justify-center gap-1">${createNotebookArtworkSVG('stamp_complete', 26)}<span class="diary-muted-text">방음완료</span></div>`
              : `<button id="sp-sound" class="jelly-action-btn btn-gold-lip">${createCustomSVGIcon('soundproof_hammer', 14)}<span>방음 ${GAME_BALANCE.soundproofCost}만</span></button>`}
            <button id="sp-clean" ${!hDef.isHoarder ? 'disabled' : ''} class="jelly-action-btn btn-mint-lip">
              ${createCustomSVGIcon('broom_clean', 14)}
              <span>청소 ${GAME_BALANCE.specialCleanCost}만</span>
            </button>
            <button id="sp-reloc" class="jelly-action-btn btn-mint-lip">
              ${createCustomSVGIcon('relocate_move', 14)}
              <span>이사 ${GAME_BALANCE.relocateCost}만</span>
            </button>
            <button id="sp-evict" class="jelly-action-btn btn-coral-lip">
              ${createCustomSVGIcon('evict_stamp', 14)}
              <span>강제 퇴거</span>
            </button>
          </div>
        </div>`;
    }

    dom.notebookBody.innerHTML = chipBarHtml + detailHtml;

    dom.notebookBody.querySelectorAll('[data-rid]').forEach((el) => {
      el.onclick = () => { selectedSplitItemId = el.dataset.rid; renderNotebookSplitView(); };
    });

    const prevBtn = document.getElementById('sp-preview-room');
    if (prevBtn && curR) prevBtn.onclick = () => { dom.notebookModal.classList.add('hidden'); focusCameraOnRoom(curR.id); };

    const ulBtn = document.getElementById('sp-unlock-room');
    if (ulBtn && curR) {
      ulBtn.onclick = () => {
        unlockRoomAction(curR);
        renderNotebookSplitView();
      };
    }

    const fBtn = document.getElementById('sp-focus-room');
    if (fBtn && curR) fBtn.onclick = () => { dom.notebookModal.classList.add('hidden'); focusCameraOnRoom(curR.id); };
    const cBtn = document.getElementById('sp-clean');
    if (cBtn && curR) cBtn.onclick = () => executeSpecialClean(curR);
    const sBtn = document.getElementById('sp-sound');
    if (sBtn && curR) {
      sBtn.onclick = () => {
        if (state.gold < GAME_BALANCE.soundproofCost) { showToast('방음 시공비 부족!', 'rose'); return; }
        addGold(-GAME_BALANCE.soundproofCost);
        curR.soundproofed = true;
        state.stats.crisisResolved += 1;
        rebuildRoom3D(curR);
        showToast(`[${curR.subId}호] 방음 시공 완료!`, 'emerald');
        renderNotebookSplitView();
        saveState();
      };
    }
    const rlBtn = document.getElementById('sp-reloc');
    if (rlBtn && curR) rlBtn.onclick = () => { dom.notebookModal.classList.add('hidden'); relocateHouseholdToVacant(curR); };
    const evBtn = document.getElementById('sp-evict');
    if (evBtn && curR) evBtn.onclick = () => { dom.notebookModal.classList.add('hidden'); focusCameraOnRoom(curR.id); setTimeout(() => executeDramaticEviction(curR), 320); };
    const rcBtn = document.getElementById('sp-rec-now');
    if (rcBtn && curR) rcBtn.onclick = () => { dom.notebookModal.classList.add('hidden'); focusCameraOnRoom(curR.id); openRecruitModal(curR); };
  }

  // 탭 3: 관리인
  else if (activeNotebookTab === 'manager') {
    const bList = Object.values(state.buildings);
    if (!selectedSplitItemId || !state.buildings[selectedSplitItemId]) selectedSplitItemId = bList[0].lotId;
    const curB = state.buildings[selectedSplitItemId];
    const grossRent = calcBuildingGrossCycle(curB);
    const netAfterMgr = grossRent - GAME_BALANCE.managerSalaryPerCycle;

    const busyRoom = curB.rooms.find((r) => r.household && (r.trashStage >= 2 || r.household.happiness < 60));
    const mgrStateChip = !curB.manager.hired
      ? `<span class="kw-chip">${createCustomSVGIcon('manager_cap', 14)}<span>미고용 대기</span></span>`
      : busyRoom
        ? `<span class="kw-chip tone-coral">${createCustomSVGIcon('wrench_tool', 14)}<span>${busyRoom.subId}호 케어 출동</span></span>`
        : `<span class="kw-chip tone-mint">${createCustomSVGIcon('coffee_cup', 14)}<span>1층 로비 상주 중</span></span>`;

    const bSelectorHtml = bList.length > 1
      ? `<div class="flex items-center gap-1.5 overflow-x-auto custom-scroll pb-1">
          ${bList.map((b) => `<button type="button" data-bid="${b.lotId}" class="selector-chip-btn ${selectedSplitItemId === b.lotId ? 'active' : ''}">${b.title}</button>`).join('')}
        </div>`
      : '';

    dom.notebookBody.innerHTML = `
      ${bSelectorHtml}
      <div class="diary-card space-y-3">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-2.5">
            ${createNotebookArtworkSVG('avatar_manager', 48)}
            <div class="space-y-1">
              <div class="diary-card-title !text-[14px]">${curB.title}</div>
              <div class="flex items-center gap-1.5 flex-wrap">${mgrStateChip}</div>
            </div>
          </div>
          <button id="sp-toggle-mgr" class="jelly-action-btn ${curB.manager.hired ? 'btn-coral-lip' : 'btn-mint-lip'}">
            ${createCustomSVGIcon('manager_cap', 15)}
            <span>${curB.manager.hired ? '해임하기' : `지배인 고용 (${GAME_BALANCE.managerHireFee}만)`}</span>
          </button>
        </div>

        <div class="diary-soft-box flex items-center justify-around flex-wrap gap-2">
          <span class="kw-chip tone-mint">${createCustomSVGIcon('coin_stack', 13)}<span>총수익 +${grossRent}만</span></span>
          <span class="kw-chip tone-coral">${createCustomSVGIcon('manager_cap', 13)}<span>급여 -${GAME_BALANCE.managerSalaryPerCycle}만</span></span>
          <span class="kw-chip ${netAfterMgr >= 0 ? 'tone-gold' : 'tone-coral'}">${createCustomSVGIcon('sparkle_star', 13)}<span>순익 ${netAfterMgr >= 0 ? '+' : ''}${netAfterMgr}만</span></span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div class="diary-card space-y-1">
            <div class="flex items-center justify-between diary-card-title">
              <span class="flex items-center gap-1">${createCustomSVGIcon('coin_stack', 15)} 최소 월세 마지노선</span>
              <span class="diary-muted-text">40~320만</span>
            </div>
            <div class="coin-slider-wrap">
              <div id="tip-min-rent" class="coin-slider-bubble">${curB.manager.minRentFloor}만 이상</div>
              <input id="slider-min-rent" type="range" min="40" max="320" step="10" value="${curB.manager.minRentFloor}" class="golden-coin-range" />
            </div>
          </div>

          <div class="diary-card space-y-1">
            <div class="flex items-center justify-between diary-card-title">
              <span class="flex items-center gap-1">${createCustomSVGIcon('wrench_tool', 15)} 자동 수리 예산</span>
              <span class="diary-muted-text">0~240만</span>
            </div>
            <div class="coin-slider-wrap">
              <div id="tip-auto-cap" class="coin-slider-bubble">최대 ${curB.manager.autoBudgetCap}만</div>
              <input id="slider-auto-cap" type="range" min="0" max="240" step="15" value="${curB.manager.autoBudgetCap}" class="golden-coin-range" />
            </div>
          </div>
        </div>
      </div>`;

    dom.notebookBody.querySelectorAll('[data-bid]').forEach((el) => {
      el.onclick = () => { selectedSplitItemId = el.dataset.bid; renderNotebookSplitView(); };
    });

    const sMin = document.getElementById('slider-min-rent');
    const bMin = document.getElementById('tip-min-rent');
    const sCap = document.getElementById('slider-auto-cap');
    const bCap = document.getElementById('tip-auto-cap');

    updateCoinSliderTooltip(sMin, bMin, (v) => `${v}만 이상`);
    updateCoinSliderTooltip(sCap, bCap, (v) => `최대 ${v}만`);

    sMin.oninput = (e) => {
      curB.manager.minRentFloor = Number(e.target.value);
      updateCoinSliderTooltip(sMin, bMin, (v) => `${v}만 이상`);
    };
    sCap.oninput = (e) => {
      curB.manager.autoBudgetCap = Number(e.target.value);
      updateCoinSliderTooltip(sCap, bCap, (v) => `최대 ${v}만`);
    };

    document.getElementById('sp-toggle-mgr').onclick = () => {
      if (!curB.manager.hired) {
        if (state.gold < GAME_BALANCE.managerHireFee) { showToast('계약금 부족!', 'rose'); return; }
        addGold(-GAME_BALANCE.managerHireFee);
        curB.manager.hired = true;
        rebuildPublicInfraAndManager3D(curB.lotId);
        const booth = lot3D[curB.lotId]?.managerGroup?.children[0];
        if (booth) triggerSquashStretch(booth, 1.3);
        dom.notebookModal.classList.add('hidden');
        focusCameraOnLot(curB.lotId, 1.2);
        showToast(`[${curB.title}] 1층 지배인 배치 완료!`, 'emerald');
      } else {
        curB.manager.hired = false;
        rebuildPublicInfraAndManager3D(curB.lotId);
        showToast(`[${curB.title}] 지배인 해임 완료`, 'amber');
        renderNotebookSplitView();
      }
      saveState();
    };
  }

  // 탭 4: 건물장부
  else if (activeNotebookTab === 'infra') {
    if (!selectedSplitItemId || !state.lots.some((l) => l.lotId === selectedSplitItemId)) {
      selectedSplitItemId = state.lots[0].lotId;
    }

    const lotChipsHtml = `
      <div class="flex items-center gap-1.5 overflow-x-auto custom-scroll pb-1">
        ${state.lots.map((l) => `
          <button type="button" data-lid="${l.lotId}" class="selector-chip-btn ${selectedSplitItemId === l.lotId ? 'active' : ''}">
            <span>${l.owned ? l.title : l.name}</span>
            <span class="opacity-85">· ${l.owned ? '운영' : `${l.landPrice}만`}</span>
          </button>`).join('')}
      </div>`;

    const curLot = getLot(selectedSplitItemId) || state.lots[0];
    const curB = state.buildings[curLot.lotId];
    let bodyHtml = '';

    if (!curLot.owned) {
      bodyHtml = `
        <div class="diary-card text-center space-y-3 !py-6">
          <div class="flex justify-center">${createCustomSVGIcon('berry_farm', 40)}</div>
          <div class="flex items-center justify-center gap-1.5 flex-wrap">
            <span class="diary-card-title !text-[14px]">${curLot.name}</span>
            <span class="kw-chip tone-gold">${createCustomSVGIcon('coin_stack', 13)}<span>토지 ${curLot.landPrice}만</span></span>
          </div>
          <button id="sp-open-dev" class="jelly-action-btn btn-mint-lip px-5 py-2">
            ${createCustomSVGIcon('plus_pin', 15)}
            <span>신규 부지 착공하기</span>
          </button>
        </div>`;
    } else if (curB) {
      const bLv = calcBuildingLevel(curB);
      const infraCards = Object.values(PUBLIC_INFRA_CATALOG).map((inf) => {
        const installed = curB.infra[inf.key];
        return `
          <div class="diary-card flex items-center justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0">
              ${createNotebookArtworkSVG(inf.artKey, 40)}
              <div class="min-w-0 space-y-1">
                <div class="diary-card-title">${inf.name}</div>
                <div class="flex flex-wrap gap-1">${renderVisualChipList(inf.chips)}</div>
              </div>
            </div>
            ${installed
              ? `<div class="shrink-0">${createNotebookArtworkSVG('stamp_complete', 40)}</div>`
              : `<button data-ikey="${inf.key}" class="btn-buy-infra jelly-action-btn btn-gold-lip shrink-0">${createCustomSVGIcon('coin_stack', 14)}<span>${inf.cost}만</span></button>`}
          </div>`;
      }).join('');

      const leftShopName = curLot.devType === 'mixed_2' ? '달콤 다방' : '해피마트 24';
      const leftShopArt = curLot.devType === 'mixed_2' ? 'dev_bakery' : 'shop_mart';

      bodyHtml = `
        <div class="space-y-2.5">
          <div class="diary-card flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-2">
              ${createCustomSVGIcon('crown_badge', 22)}
              <span class="diary-card-title !text-[14px]">${curB.title}</span>
              <span class="diary-pill-badge !bg-[#FFE4EC] !text-[#BE123C]">Lv.${bLv}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <button id="sp-rename-bldg" class="jelly-action-btn pill btn-coral-lip">
                ${createCustomSVGIcon('edit_pen', 13)}
                <span>이름 변경</span>
              </button>
              <button id="sp-go-lot" class="jelly-action-btn pill btn-mint-lip">이동</button>
            </div>
          </div>

          <div class="diary-soft-box flex items-center justify-between gap-2 flex-wrap">
            <div class="flex items-center gap-2 flex-wrap">
              ${createNotebookArtworkSVG(leftShopArt, 34)}
              ${createNotebookArtworkSVG('shop_wash', 34)}
              <span class="kw-chip tone-coral">${leftShopName}</span>
              <span class="kw-chip tone-sky">뽀송 워시</span>
            </div>
            <span class="kw-chip tone-gold">${createCustomSVGIcon('coin_stack', 13)}<span>+28만 / 주기</span></span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">${infraCards}</div>
        </div>`;
    } else {
      const cat = DEVELOPMENT_CATALOG[curLot.devType];
      bodyHtml = `
        <div class="diary-card space-y-3">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-2.5">
              ${createNotebookArtworkSVG(cat.artKey || 'dev_solar', 44)}
              <div class="space-y-1">
                <div class="diary-card-title !text-[14px]">${curLot.title}</div>
                <div class="flex flex-wrap gap-1">${renderVisualChipList(cat.chips)}</div>
              </div>
            </div>
            <div class="flex items-center gap-1.5">
              <button id="sp-rename-dev" class="jelly-action-btn pill btn-coral-lip">
                ${createCustomSVGIcon('edit_pen', 13)}
                <span>이름 변경</span>
              </button>
              <button id="sp-go-devlot" class="jelly-action-btn pill btn-mint-lip">이동</button>
            </div>
          </div>
        </div>`;
    }

    dom.notebookBody.innerHTML = lotChipsHtml + bodyHtml;

    dom.notebookBody.querySelectorAll('[data-lid]').forEach((el) => {
      el.onclick = () => { selectedSplitItemId = el.dataset.lid; renderNotebookSplitView(); };
    });

    const openDevBtn = document.getElementById('sp-open-dev');
    if (openDevBtn) {
      openDevBtn.onclick = () => {
        dom.notebookModal.classList.add('hidden');
        focusCameraOnLot(curLot.lotId, 1.15);
        openLotDevModal(curLot.lotId);
      };
    }

    const renBldgBtn = document.getElementById('sp-rename-bldg');
    if (renBldgBtn) renBldgBtn.onclick = () => openRenameBuildingModal(curLot.lotId);
    const goLotBtn = document.getElementById('sp-go-lot');
    if (goLotBtn) {
      goLotBtn.onclick = () => {
        dom.notebookModal.classList.add('hidden');
        focusCameraOnLot(curLot.lotId, 1.05);
      };
    }

    dom.notebookBody.querySelectorAll('.btn-buy-infra').forEach((btn) => {
      btn.onclick = () => {
        if (!curB) return;
        const inf = PUBLIC_INFRA_CATALOG[btn.dataset.ikey];
        if (state.gold < inf.cost) { showToast('설치비 부족!', 'rose'); return; }
        addGold(-inf.cost);
        curB.infra[inf.key] = true;
        rebuildPublicInfraAndManager3D(curLot.lotId);
        triggerSquashStretch(lot3D[curLot.lotId].root, 0.9);
        showToast(`[${inf.name}] 시공 완료!`, 'emerald');
        renderNotebookSplitView();
        saveState();
      };
    });

    const renDevBtn = document.getElementById('sp-rename-dev');
    if (renDevBtn) renDevBtn.onclick = () => openRenameBuildingModal(curLot.lotId);
    const goDevBtn = document.getElementById('sp-go-devlot');
    if (goDevBtn) {
      goDevBtn.onclick = () => {
        dom.notebookModal.classList.add('hidden');
        focusCameraOnLot(curLot.lotId, 1.3);
      };
    }
  }
}

// =========================================================
// 19. 세대 입주 계약 모달 & 신규 부지 착공 모달
// =========================================================
function openRecruitModal(room) {
  recruitRoomTarget = room;
  generateRecruitCandidates(room);
  const meta = ROOM_TYPE_META[room.layoutType] || ROOM_TYPE_META.studio;
  dom.recRoomTitle.textContent = `${room.subId}호 · ${meta.badge}`;
  renderRecruitCards();
  dom.recruitModal.classList.remove('hidden');
}

function generateRecruitCandidates(room) {
  const keys = Object.keys(HOUSEHOLD_TYPES);
  const meta = ROOM_TYPE_META[room?.layoutType] || ROOM_TYPE_META.studio;
  const preferred = keys.filter((k) => meta.preferredBy.includes(k));
  const others = keys.filter((k) => !meta.preferredBy.includes(k)).sort(() => Math.random() - 0.5);
  const picked = [...preferred.sort(() => Math.random() - 0.5).slice(0, 2), ...others].slice(0, 3);

  recruitCandidates = picked.map((k) => {
    const def = HOUSEHOLD_TYPES[k];
    const budget = Math.floor(def.minRent + Math.random() * (def.maxRent - def.minRent + 1));
    const fam =
      FAMILY_LAST_NAMES[Math.floor(Math.random() * FAMILY_LAST_NAMES.length)] +
      GIVEN_NAMES[Math.floor(Math.random() * GIVEN_NAMES.length)];
    return { type: k, familyName: `${fam} 세대`, budget, def };
  });
}

function renderRecruitCards() {
  const room = recruitRoomTarget;
  const mRent = calcRoomRent(room);
  const meta = ROOM_TYPE_META[room.layoutType] || ROOM_TYPE_META.studio;

  dom.recCardsGrid.innerHTML = recruitCandidates.map((c, idx) => {
    const noiseLv = c.def.noiseLv || 1;
    const noisePct = Math.round((noiseLv / 3) * 100);
    const budgetPct = Math.min(100, Math.round((c.budget / 380) * 100));
    const isMatch = meta.preferredBy.includes(c.type);

    return `
      <div class="diary-card flex flex-col justify-between gap-2.5">
        <div class="space-y-2">
          <div class="flex items-center gap-2.5">
            ${createNotebookArtworkSVG(`avatar_${c.type}`, 48)}
            <div class="min-w-0 space-y-0.5">
              <div class="diary-card-title truncate">${c.familyName}</div>
              <div class="flex items-center gap-1 flex-wrap">
                <span class="role-accent-badge" style="background:${c.def.accentHex}">
                  ${c.def.label} · ${c.def.memberCount}인
                </span>
                ${isMatch ? `<span class="kw-chip tone-mint !py-0.5 !px-1.5 !text-[10px]">평형 찰떡!</span>` : ''}
              </div>
            </div>
          </div>

          <div class="flex flex-wrap gap-1">${renderVisualChipList(c.def.traitBadges)}</div>

          <div class="diary-soft-box space-y-1.5">
            <div class="space-y-0.5">
              <div class="flex justify-between diary-body-text">
                <span class="flex items-center gap-1">${createCustomSVGIcon('coin_stack', 13)} 한도</span>
                <b>${c.budget}만</b>
              </div>
              <div class="candy-gauge-track"><div class="candy-gauge-fill candy-gold" style="width:${budgetPct}%"></div></div>
            </div>
            <div class="space-y-0.5">
              <div class="flex justify-between diary-body-text">
                <span class="flex items-center gap-1">${createCustomSVGIcon('sound_wave', 13)} 소음</span>
                <b>Lv.${noiseLv}</b>
              </div>
              <div class="candy-gauge-track"><div class="candy-gauge-fill ${noiseLv >= 3 ? 'candy-coral' : noiseLv === 2 ? 'candy-gold' : 'candy-sky'}" style="width:${noisePct}%"></div></div>
            </div>
          </div>
        </div>

        <button data-cidx="${idx}" class="btn-sign-hh jelly-action-btn btn-mint-lip w-full">
          ${createCustomSVGIcon('gold_key', 14)}
          <span>계약 +${Math.min(mRent, c.budget)}만</span>
        </button>
      </div>`;
  }).join('');

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
    happiness: 90
  };
  room.rentTimer = room.cycleSec * 0.5;
  room.trashStage = typeKey === 'hikikomori' ? 1 : 0;
  room.trashProgress = 0;
  room.evictionCountdown = null;

  rebuildRoom3D(room);
  syncBuildingResidents3D(room.lotId);
  triggerDropBounce(lot3D[room.lotId].roomGroups[room.id], lot.x + room.lx, room.ly, lot.z + room.lz);
  showToast(`[${room.subId}호] ${fam} 입주 완료!`, 'emerald');
  saveState();
}

function openLotDevModal(lotId) {
  const lot = getLot(lotId);
  if (!lot || lot.owned) return;
  devModalLotId = lotId;
  dom.devLotBadge.textContent = `${lot.name} · 토지 ${lot.landPrice}만`;

  const devKeys = ['solar_plant', 'urban_farm', 'sakura_park', 'bakery_cafe', 'mixed_2'];
  dom.devCardsGrid.innerHTML = devKeys.map((k) => {
    const cat = DEVELOPMENT_CATALOG[k];
    const total = lot.landPrice + cat.buildCost;
    const ok = state.gold >= total;
    return `
      <div class="diary-card flex flex-col justify-between gap-2.5">
        <div class="flex items-center gap-2.5">
          ${createNotebookArtworkSVG(cat.artKey || 'dev_solar', 42)}
          <div class="min-w-0 space-y-1">
            <div class="diary-card-title">${cat.name}</div>
            <div class="flex flex-wrap gap-1">${renderVisualChipList(cat.chips)}</div>
          </div>
        </div>
        <button data-dtype="${k}" ${!ok ? 'disabled' : ''} class="btn-build-dev jelly-action-btn ${ok ? 'btn-mint-lip' : 'btn-gold-lip'} w-full">
          ${createCustomSVGIcon('coin_stack', 14)}
          <span>착공 ${total.toLocaleString()}만</span>
        </button>
      </div>`;
  }).join('');

  dom.devCardsGrid.querySelectorAll('.btn-build-dev').forEach((btn) => {
    btn.onclick = () => {
      const k = btn.dataset.dtype;
      const cat = DEVELOPMENT_CATALOG[k];
      const total = lot.landPrice + cat.buildCost;
      if (state.gold < total) { showToast('착공비 부족!', 'rose'); return; }

      addGold(-total);
      lot.owned = true;
      lot.devType = k;
      lot.title = cat.name;

      if (cat.isResidential) {
        state.buildings[lotId] = makeResidentialBuilding(lotId, k, cat.name, false);
      } else {
        state.developments[lotId] = { lotId, devType: k, timer: 0, cropStage: 0 };
      }

      dom.lotDevModal.classList.add('hidden');
      refreshLot3D(lotId);
      triggerDropBounce(lot3D[lotId].root, lot.x, 0.4, lot.z);
      rebuildStaticOverlayDOM();
      focusCameraOnLot(lotId, 1.05);
      showToast(`[${cat.name}] 완공!`, 'emerald');
      saveState();
    };
  });

  dom.lotDevModal.classList.remove('hidden');
}

// =========================================================
// 20. 경제 틱 · 미니어처 라이프(아치문/복층계단 보행 AI) · 오버레이
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

function calcBuildingLevel(b) {
  const unlockedPts = b.rooms.filter((r) => r.unlocked).length;
  const upgradePts = b.rooms.reduce((acc, r) => acc + (r.interiorLv || 0), 0);
  const infraPts = Object.values(b.infra).filter(Boolean).length;
  return Math.max(1, Math.min(9, 1 + Math.floor((unlockedPts - 2 + upgradePts + infraPts) / 2)));
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
  const tier = ROOM_INTERIOR_TIERS[room.interiorLv || 0] || ROOM_INTERIOR_TIERS[0];
  const furnAdd = calcRoomFurnitureRentAdd(room);
  let rent = room.baseRent + furnAdd + tier.rentAdd;
  if (room.interiorLv >= 3) rent = Math.round(rent * 1.2);

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
  let sum = 28;
  for (const r of b.rooms) sum += getEffectiveRent(r);
  return sum;
}

function calcAverageTownHappiness() {
  const occupied = Object.values(state.buildings).flatMap((b) => b.rooms.filter((r) => r.unlocked && r.household));
  if (occupied.length === 0) return 100;
  const total = occupied.reduce((acc, r) => acc + r.household.happiness, 0);
  return Math.round(total / occupied.length);
}

function launchFlyingCoinToHud(startX, startY, labelText) {
  if (!dom.flyingCoinLayer) return;
  const token = document.createElement('div');
  token.className = 'flying-coin-token';
  token.innerHTML = `${createCustomSVGIcon('coin_stack', 15)}<span>${labelText}</span>`;
  token.style.left = `${startX.toFixed(1)}px`;
  token.style.top = `${startY.toFixed(1)}px`;
  token.style.transform = 'translate(-50%, -50%) scale(1.08)';
  dom.flyingCoinLayer.appendChild(token);

  const targetRect = dom.hudBadgeGold
    ? dom.hudBadgeGold.getBoundingClientRect()
    : { left: 64, top: 28, width: 90, height: 36 };
  const destX = targetRect.left + targetRect.width * 0.45;
  const destY = targetRect.top + targetRect.height * 0.5;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      token.style.left = `${destX.toFixed(1)}px`;
      token.style.top = `${destY.toFixed(1)}px`;
      token.style.transform = 'translate(-50%, -50%) scale(0.55)';
      token.style.opacity = '0.2';
    });
  });

  setTimeout(() => {
    token.remove();
    triggerBadgeBounce(dom.hudGoldWrap);
  }, 600);
}

function collectRentCoinBubble(entry, isManualTap = false) {
  const idx = rentBubbles.indexOf(entry);
  if (idx !== -1) rentBubbles.splice(idx, 1);
  if (entry.el) entry.el.remove();

  const finalAmt = isManualTap ? Math.max(entry.amount + 1, Math.round(entry.amount * 1.2)) : entry.amount;
  const bonusAmt = finalAmt - entry.amount;
  addGold(finalAmt);
  state.stats.totalEarned += finalAmt;

  const pt = project(entry.wx, entry.wy, entry.wz);
  if (isManualTap) {
    launchFlyingCoinToHud(pt.x, pt.y, `+${finalAmt}만`);
    if (lot3D[entry.lotId]?.root && !focusedRoomId) triggerSquashStretch(lot3D[entry.lotId].root, 0.72);
    spawnCoinFountain3D(entry.wx, Math.max(0.8, entry.wy - 0.5), entry.wz, 9);
    spawnFloatText(entry.wx, entry.wy + 0.55, entry.wz, `+${finalAmt}만 (팁 +${bonusAmt}만!)`);
  } else if (!focusedRoomId || entry.roomId === focusedRoomId) {
    spawnFloatText(entry.wx, entry.wy + 0.35, entry.wz, `+${finalAmt}만`);
  }
}

function spawnRentCoinBubble({ sourceKey, lotId, roomId = null, wx, wy, wz, amount, autoSec = 9.5 }) {
  if (!dom.rentBubblesLayer) {
    addGold(amount);
    state.stats.totalEarned += amount;
    return;
  }

  const existing = rentBubbles.find((rb) => rb.sourceKey === sourceKey);
  if (existing) {
    existing.amount += amount;
    existing.remainSec = Math.max(existing.remainSec, autoSec);
    if (existing.amountSpan) existing.amountSpan.textContent = `+${existing.amount}만`;
    return;
  }

  if (rentBubbles.length >= 10) {
    collectRentCoinBubble(rentBubbles[0], false);
  }

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'world-pin rent-coin-bubble';
  btn.title = '터치하면 +20% 보너스 팁과 함께 즉시 수금!';
  btn.innerHTML = `${createCustomSVGIcon('coin_stack', 16)}<span class="rent-amt-txt">+${amount}만</span>`;

  const entry = {
    sourceKey,
    lotId,
    roomId,
    wx,
    wy,
    wz,
    amount,
    remainSec: autoSec,
    el: btn,
    amountSpan: btn.querySelector('.rent-amt-txt')
  };

  btn.onclick = (e) => {
    e.stopPropagation();
    collectRentCoinBubble(entry, true);
  };

  setPinPos(btn, project(wx, wy, wz));
  dom.rentBubblesLayer.appendChild(btn);
  rentBubbles.push(entry);
}

function handleHeartTouchBonus(wx, wy, wz, actorRoot, labelText) {
  if (actorRoot) triggerSquashStretch(actorRoot, 1.4);

  for (let i = 0; i < 8; i++) {
    const heartOrb = new THREE.Mesh(
      GEO.sphere,
      new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xFF5C7A : 0xFFB3C6, transparent: true, opacity: 0.92 })
    );
    heartOrb.scale.setScalar(0.24);
    heartOrb.position.set(wx + (Math.random() - 0.5) * 0.4, wy + 0.55, wz + (Math.random() - 0.5) * 0.4);
    heartOrb.raycast = () => {};
    const a = (Math.PI * 2 * i) / 8;
    scene.add(heartOrb);
    activeParticles.push({
      mesh: heartOrb,
      vx: Math.cos(a) * 1.15,
      vy: 2.2 + Math.random() * 1.1,
      vz: Math.sin(a) * 1.15,
      gravity: 1.8,
      floorY: -10,
      life: 0.95,
      shrink: true
    });
  }

  addGold(15);
  state.stats.totalEarned += 15;
  for (const b of Object.values(state.buildings)) {
    for (const r of b.rooms) {
      if (r.unlocked && r.household) {
        r.household.happiness = Math.min(100, r.household.happiness + 4);
      }
    }
  }

  const pt = project(wx, wy + 1.15, wz);
  if (dom.jackpotLayer && pt.inView) {
    const heartEl = document.createElement('div');
    heartEl.className = 'heart-pop-float';
    heartEl.style.left = `${pt.x.toFixed(1)}px`;
    heartEl.style.top = `${pt.y.toFixed(1)}px`;
    heartEl.textContent = '❤️ 행복 +4% · +15만!';
    dom.jackpotLayer.appendChild(heartEl);
    setTimeout(() => heartEl.remove(), 1250);
  }

  if (labelText) showToast(labelText, 'emerald');
  if (focusedRoomId) renderFocusedRoomDrawer();
}

function tickEconomy(dt) {
  for (let i = rentBubbles.length - 1; i >= 0; i--) {
    rentBubbles[i].remainSec -= dt;
    if (rentBubbles[i].remainSec <= 0) {
      collectRentCoinBubble(rentBubbles[i], false);
    }
  }

  for (const b of Object.values(state.buildings)) {
    const lot = getLot(b.lotId);
    const autoCollectDelay = b.manager.hired ? 3.8 : 10.5;

    for (const r of b.rooms) {
      if (!r.unlocked || !r.household) continue;
      r.rentTimer += dt;
      if (r.rentTimer >= r.cycleSec) {
        r.rentTimer = 0;
        const rent = getEffectiveRent(r);
        spawnRentCoinBubble({
          sourceKey: `room_${r.id}`,
          lotId: b.lotId,
          roomId: r.id,
          wx: lot.x + r.lx,
          wy: r.ly + 2.8,
          wz: lot.z + r.lz + 2.5,
          amount: rent,
          autoSec: autoCollectDelay
        });
      }
    }

    b.shopCycleTimer += dt;
    if (b.shopCycleTimer >= 11) {
      b.shopCycleTimer = 0;
      const isWashTurn = Math.random() < 0.5;
      spawnRentCoinBubble({
        sourceKey: `shop_${b.lotId}_${isWashTurn ? 'wash' : 'mart'}`,
        lotId: b.lotId,
        wx: lot.x + (isWashTurn ? 7.1 : -7.2),
        wy: 4.4,
        wz: lot.z + 4.4,
        amount: 28,
        autoSec: autoCollectDelay
      });
    }
  }

  for (const dev of Object.values(state.developments)) {
    const cat = DEVELOPMENT_CATALOG[dev.devType];
    const lot = getLot(dev.lotId);
    dev.timer += dt;

    if (dev.devType === 'urban_farm' && lot3D[dev.lotId]) {
      const ratio = dev.timer / cat.cycleSec;
      const stage = ratio < 0.35 ? 0 : ratio < 0.72 ? 1 : 2;
      lot3D[dev.lotId].cropMeshes.forEach(({ sprout, berry }) => {
        sprout.visible = stage >= 1;
        sprout.scale.setScalar(stage === 1 ? 0.34 : 0.5);
        berry.visible = stage >= 2;
      });
    }

    if (dev.timer >= cat.cycleSec) {
      dev.timer = 0;
      triggerSquashStretch(lot3D[dev.lotId]?.root, 0.85);
      spawnRentCoinBubble({
        sourceKey: `dev_${dev.lotId}`,
        lotId: dev.lotId,
        wx: lot.x,
        wy: 3.6,
        wz: lot.z + 1.4,
        amount: cat.cycleProfit,
        autoSec: 10.5
      });
    }
  }

  const anyPending = rentBubbles.length > 0 || Object.values(state.buildings).some((b) => b.pendingCoins > 0);
  dom.btnCollectAll.classList.toggle('hidden', !anyPending);
}

function showRoomSpeech(room, text, isComplaint = false, duration = 3.8) {
  if (speechEls[room.id]) speechEls[room.id].remove();
  const lot = getLot(room.lotId);
  const hType = room.household ? room.household.type : 'student';

  const el = document.createElement('div');
  el.className = `world-pin cloud-speech-bubble ${isComplaint ? 'conflict-bubble' : ''}`;
  el.innerHTML = `
    ${createNotebookArtworkSVG(`avatar_${hType}`, 28)}
    <span class="leading-snug">${text}</span>
  `;

  const anchorActor = residentActors[room.id]?.[0];
  const wy = anchorActor ? room.ly + anchorActor.localY + 1.95 : room.ly + 2.25;
  const wx = anchorActor ? lot.x + room.lx + anchorActor.localX : lot.x + room.lx;
  const wz = anchorActor ? lot.z + room.lz + anchorActor.localZ : lot.z + room.lz + 0.4;

  if (lot) setPinPos(el, project(wx, wy, wz));
  dom.speechLayer.appendChild(el);
  speechEls[room.id] = el;

  setTimeout(() => {
    if (speechEls[room.id] === el) {
      el.remove();
      delete speechEls[room.id];
    }
  }, duration * 1000);
}

function tickMiniatureWorldLife(dt, nowSec) {
  facadeEmitters.forEach((em) => {
    em.timer -= dt;
    if (em.timer <= 0) {
      em.timer = em.kind === 'bubble' ? 0.42 : 0.55;
      spawnSoapBubbleOrSteam3D(em);
    }
  });

  // 1) 호실 입주민 AI (원룸 / 투룸 아치문 통과 / 쓰리룸 아치 복도 통과 / 복층 3D 원목계단 오르내리기!)
  for (const list of Object.values(residentActors)) {
    list.forEach((ac, idx) => {
      const lot = getLot(ac.room.lotId);
      const parts = ac.mesh.userData.animParts;
      const breath = Math.sin(nowSec * 3.4 + ac.breathOffset);
      if (parts) {
        parts.bodyRoot.scale.y = 1 + breath * 0.035;
        parts.bodyRoot.scale.x = 1 - breath * 0.018;
        parts.headGroup.rotation.z = Math.sin(nowSec * 1.8 + ac.breathOffset) * 0.04;
        if (parts.topperPivot) parts.topperPivot.rotation.z = Math.sin(nowSec * 4.5 + ac.breathOffset) * 0.14;
        if (parts.propellerBlade) parts.propellerBlade.rotation.y += dt * 11.0;
      }

      const targetWp = ac.waypoints[0];
      if (targetWp) {
        const dx = targetWp.x - ac.localX;
        const dy = targetWp.y - ac.localY;
        const dz = targetWp.z - ac.localZ;
        const dist = Math.hypot(dx, dy, dz);
        const walkSpeed = ac.isHoarder ? 1.4 : 2.55;

        if (dist > 0.08) {
          ac.phase += dt * 13;
          const step = Math.min(dist, walkSpeed * dt);
          ac.localX += (dx / dist) * step;
          ac.localY += (dy / dist) * step;
          ac.localZ += (dz / dist) * step;
          if (Math.hypot(dx, dz) > 0.02) {
            ac.mesh.rotation.y = Math.atan2(dx, dz);
          }
          ac.mesh.position.set(
            ac.room.lx + ac.localX,
            ac.room.ly + ac.localY + Math.abs(Math.sin(ac.phase)) * 0.08,
            ac.room.lz + ac.localZ
          );

          if (parts) {
            const swing = Math.sin(ac.phase) * 0.48;
            parts.legL.rotation.x = swing;
            parts.legR.rotation.x = -swing;
            parts.armL.rotation.x = -swing * 0.7;
            parts.armR.rotation.x = swing * 0.7;
          }

          ac.puffTimer -= dt;
          if (ac.puffTimer <= 0 && lot && ac.mesh.visible && currentShellOpacity < 0.9) {
            ac.puffTimer = 0.28;
            spawnFootstepPuff(lot.x + ac.room.lx + ac.localX, ac.room.ly + ac.localY, lot.z + ac.room.lz + ac.localZ, 0.18);
          }
        } else {
          ac.localX = targetWp.x;
          ac.localY = targetWp.y;
          ac.localZ = targetWp.z;
          ac.waypoints.shift();
        }
      } else {
        ac.mesh.position.set(ac.room.lx + ac.localX, ac.room.ly + ac.localY, ac.room.lz + ac.localZ);
        if (parts) {
          parts.legL.rotation.x *= 0.82;
          parts.legR.rotation.x *= 0.82;
          parts.armL.rotation.x *= 0.82;
          parts.armR.rotation.x *= 0.82;
        }
        ac.timer -= dt;
        if (ac.timer <= 0) {
          ac.timer = 1.9 + Math.random() * 2.2;
          ac.waypoints = planRoomWaypoints(ac.room, ac.localX, ac.localY, ac.localZ, ac.isHoarder);

          if (idx === 0 && (focusedRoomId === ac.room.id || camera.zoom >= 1.25) && !speechEls[ac.room.id] && Math.random() < 0.48) {
            const r = ac.room;
            if (r.household) {
              const def = HOUSEHOLD_TYPES[r.household.type] || HOUSEHOLD_TYPES.student;
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
              showRoomSpeech(r, line, bad, 3.8);
            }
          }
        }
      }
    });
  }

  // 2) 실내 반려동물 보행 애니메이션
  for (const rp of Object.values(roomPetActors)) {
    if (rp.mesh.userData.tail) {
      rp.mesh.userData.tail.rotation.z = Math.sin(nowSec * 9.5 + rp.phase) * 0.38;
    }
    const dx = rp.tx - rp.localX;
    const dz = rp.tz - rp.localZ;
    const d = Math.hypot(dx, dz);
    if (d > 0.06) {
      rp.phase += dt * 13;
      rp.localX += (dx / d) * 1.65 * dt;
      rp.localZ += (dz / d) * 1.65 * dt;
      rp.mesh.rotation.y = Math.atan2(dx, dz);
      rp.mesh.position.set(
        rp.room.lx + rp.localX,
        rp.room.ly + 0.18 + Math.abs(Math.sin(rp.phase)) * 0.06,
        rp.room.lz + rp.localZ
      );
    } else {
      rp.mesh.position.set(rp.room.lx + rp.localX, rp.room.ly + 0.18, rp.room.lz + rp.localZ);
      rp.timer -= dt;
      if (rp.timer <= 0) {
        rp.timer = 2.0 + Math.random() * 2.2;
        if (rp.room.layoutType === 'loft') {
          rp.tx = 1.4 + (Math.random() - 0.5) * 2.8;
          rp.tz = 1.1 + (Math.random() - 0.5) * 2.2;
        } else {
          rp.tx = (Math.random() - 0.5) * Math.min(5.0, rp.room.rw * 0.45);
          rp.tz = 0.85 + (Math.random() - 0.5) * 2.0;
        }
      }
    }
  }

  if (focusedRoomId) return;

  // 3) 마을 야외 펫·산책 주민·구름·시냇물 애니메이션
  petActors.forEach((p) => {
    if (p.mesh.userData.tail) {
      p.mesh.userData.tail.rotation.z = Math.sin(nowSec * 9 + p.phase) * 0.35;
    }
    const dx = p.tx - p.mesh.position.x;
    const dz = p.tz - p.mesh.position.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.08) {
      p.phase += dt * 13;
      p.mesh.position.x += (dx / d) * 1.75 * dt;
      p.mesh.position.z += (dz / d) * 1.75 * dt;
      p.mesh.position.y = 0.08 + Math.abs(Math.sin(p.phase)) * 0.08;
      p.mesh.rotation.y = Math.atan2(dx, dz);
    } else {
      p.mesh.position.y = 0.08 + Math.sin(nowSec * 3.5 + p.phase) * 0.015;
      p.timer -= dt;
      if (p.timer <= 0) {
        p.timer = 2.0 + Math.random() * 2.5;
        p.tx = p.homeX + (Math.random() - 0.5) * 4.5;
        p.tz = p.homeZ + (Math.random() - 0.5) * 2.6;
      }
    }
  });

  strollingActors.forEach((st) => {
    const parts = st.mesh.userData.animParts;
    const dx = st.tx - st.mesh.position.x;
    const dz = st.tz - st.mesh.position.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.08) {
      st.phase += dt * 11;
      st.mesh.position.x += (dx / d) * 1.55 * dt;
      st.mesh.position.z += (dz / d) * 1.55 * dt;
      st.mesh.position.y = 0.09 + Math.abs(Math.sin(st.phase)) * 0.07;
      st.mesh.rotation.y = Math.atan2(dx, dz);
      if (parts) {
        const sw = Math.sin(st.phase) * 0.42;
        parts.legL.rotation.x = sw;
        parts.legR.rotation.x = -sw;
        parts.armL.rotation.x = -sw * 0.65;
        parts.armR.rotation.x = sw * 0.65;
      }
    } else {
      st.mesh.position.y = 0.09;
      st.timer -= dt;
      if (st.timer <= 0) {
        st.timer = 2.2 + Math.random() * 2.4;
        st.tx = -12.0 + Math.random() * 24.0;
        st.tz = 4.6 + Math.random() * 1.1;
      }
    }
  });

  cloudActors.forEach((c) => {
    c.mesh.position.x = c.baseX + Math.sin(nowSec * 0.18 * c.speed + c.phase) * 5.5;
    c.mesh.position.y = c.baseY + Math.sin(nowSec * 0.8 + c.phase) * 0.35;
  });

  skyCritters.forEach((sc) => {
    sc.angle += dt * sc.speed * 0.7;
    const nx = sc.cx + Math.cos(sc.angle) * sc.radius;
    const nz = sc.cz + Math.sin(sc.angle * 1.3) * sc.radius;
    const ny = sc.baseY + Math.sin(nowSec * 3.5 + sc.angle) * 0.28;
    sc.mesh.rotation.y = Math.atan2(nx - sc.mesh.position.x, nz - sc.mesh.position.z);
    sc.mesh.position.set(nx, ny, nz);
    if (sc.mesh.userData.wings) {
      const flap = Math.sin(nowSec * 18) * 0.65;
      sc.mesh.userData.wings[0].rotation.z = flap;
      sc.mesh.userData.wings[1].rotation.z = -flap;
    }
  });

  streamFloats.forEach((sf) => {
    sf.zPos += dt * sf.speed;
    if (sf.zPos > 32.0) sf.zPos = -32.0;
    const sx = getStreamXAtZ(sf.zPos);
    const bob = Math.sin(nowSec * 3.2 + sf.phase) * 0.05;
    sf.mesh.position.set(sx, 0.14 + bob, sf.zPos);
    sf.mesh.rotation.z = Math.sin(nowSec * 2.5 + sf.phase) * 0.08;
    sf.rippleTimer -= dt;
    if (sf.rippleTimer <= 0) {
      sf.rippleTimer = 0.85;
      spawnWaterRipple(sx, sf.zPos - 0.15);
    }
  });

  for (let i = waterRipples.length - 1; i >= 0; i--) {
    const wr = waterRipples[i];
    wr.life -= dt;
    if (wr.life <= 0) {
      islandRootGroup.remove(wr.mesh);
      waterRipples.splice(i, 1);
    } else {
      const p = 1 - wr.life / wr.maxLife;
      wr.mesh.scale.setScalar(0.45 + p * 1.45);
      wr.mesh.material.opacity = (1 - p) * 0.65;
    }
  }

  swayingBalloons.forEach((b) => {
    b.pivot.rotation.z = Math.sin(nowSec * 1.9 + b.phase) * 0.09;
    b.pivot.rotation.x = Math.cos(nowSec * 1.5 + b.phase) * 0.06;
  });

  ambientFloaters.forEach((af) => {
    af.mesh.position.x += (af.vx + Math.sin(nowSec + af.phase) * 0.25) * dt;
    af.mesh.position.y += af.vy * dt;
    af.mesh.position.z += af.vz * dt;
    if (af.isPetal && af.mesh.position.y < 0.3) {
      af.mesh.position.y = 18.0;
    } else if (!af.isPetal && af.mesh.position.y > 20.0) {
      af.mesh.position.y = 1.2;
    }
  });

  streetInteractiveProps.forEach((sp) => {
    if (sp.kind === 'car') {
      sp.mesh.position.x += sp.dir * sp.speed * dt;
      if (sp.mesh.position.x > 8.5) {
        sp.dir = -1;
        sp.mesh.rotation.y = Math.PI;
        sp.mesh.position.z = 5.65;
      } else if (sp.mesh.position.x < -22.5) {
        sp.dir = 1;
        sp.mesh.rotation.y = 0;
        sp.mesh.position.z = 4.65;
      }
      sp.mesh.position.y = 0.1 + Math.abs(Math.sin(nowSec * 14)) * 0.025;
    }
  });

  for (const reg of Object.values(lot3D)) {
    if (reg.elevatorCar) {
      reg.elevatorCar.position.y = 11.2 + Math.sin(nowSec * 1.1) * 7.2;
    }
    if (reg.signpostPivot) {
      const isHovered = hoveredLotId === reg.lotId;
      reg.signpostPivot.rotation.z = Math.sin(nowSec * (isHovered ? 8.5 : 2.2)) * (isHovered ? 0.14 : 0.035);
    }
  }

  careTimer -= dt;
  if (careTimer <= 0) {
    careTimer = 12.0 + Math.random() * 5.0;
    if (careBubbles.length < 2) spawnCareBubble();
  }
}

function spawnCareBubble() {
  const tpl = CARE_BUBBLE_TYPES[Math.floor(Math.random() * CARE_BUBBLE_TYPES.length)];
  const owned = state.lots.filter((l) => l.owned);
  const lot = owned[Math.floor(Math.random() * owned.length)];
  const id = `cb_${Date.now()}`;
  const btn = document.createElement('button');
  btn.className = 'world-pin care-clay-bubble';
  btn.innerHTML = `${createCustomSVGIcon(tpl.svgIcon, 16)}<span>${tpl.label} +${tpl.cashReward}만!</span>`;

  setPinPos(btn, project(lot.x, 7.2, lot.z + 4.5));

  btn.onclick = (e) => {
    e.stopPropagation();
    const idx = careBubbles.findIndex((x) => x.id === id);
    if (idx !== -1) careBubbles.splice(idx, 1);
    btn.remove();
    addGold(tpl.cashReward);
    if (!focusedRoomId) triggerSquashStretch(lot3D[lot.lotId]?.root, 0.82);
    spawnCoinFountain3D(lot.x, 4.5, lot.z + 3.5, 9);
    spawnFloatText(lot.x, 6.8, lot.z + 3.5, `+${tpl.cashReward}만`);
    showToast(tpl.toastMsg, 'emerald');
  };
  dom.careLayer.appendChild(btn);
  careBubbles.push({ id, el: btn, wx: lot.x, wy: 7.2, wz: lot.z + 4.5 });
}

function project(wx, wy, wz) {
  tempVec.set(wx, wy, wz).project(camera);
  return {
    x: (tempVec.x * 0.5 + 0.5) * window.innerWidth,
    y: (-tempVec.y * 0.5 + 0.5) * window.innerHeight,
    inView: tempVec.z >= -1 && tempVec.z <= 1
  };
}

function setPinPos(el, pt) {
  if (!pt.inView) {
    el.style.left = '-9999px';
    el.style.top = '-9999px';
    return;
  }
  el.style.left = `${pt.x.toFixed(1)}px`;
  el.style.top = `${pt.y.toFixed(1)}px`;
}

function spawnFloatText(wx, wy, wz, text) {
  const pt = project(wx, wy, wz);
  const el = document.createElement('div');
  el.className = 'floating-gold-text';
  el.style.left = `${pt.x.toFixed(1)}px`;
  el.style.top = `${pt.y.toFixed(1)}px`;
  el.textContent = text;
  dom.jackpotLayer.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

function rebuildStaticOverlayDOM() {
  dom.lotsLayer.innerHTML = '';
  dom.roomsLayer.innerHTML = '';
  dom.crisisLayer.innerHTML = '';
  Object.keys(lotOverlayEls).forEach((k) => delete lotOverlayEls[k]);
  Object.keys(devActionPinEls).forEach((k) => delete devActionPinEls[k]);
  Object.keys(roomOverlayEls).forEach((k) => delete roomOverlayEls[k]);
  Object.keys(crisisPinEls).forEach((k) => delete crisisPinEls[k]);

  for (const lot of state.lots) {
    if (!lot.owned) {
      const devPin = document.createElement('button');
      devPin.className = 'world-pin action-indicator-pin pin-dev hidden';
      devPin.innerHTML = `${createCustomSVGIcon('plus_pin', 14)}<span>부지 개발</span>`;
      devPin.onclick = (e) => {
        e.stopPropagation();
        const reg = lot3D[lot.lotId];
        if (reg?.signpostPivot) triggerSquashStretch(reg.signpostPivot, 1.5);
        openLotDevModal(lot.lotId);
      };
      dom.lotsLayer.appendChild(devPin);
      devActionPinEls[lot.lotId] = devPin;
      continue;
    }

    const b = state.buildings[lot.lotId];
    const el = document.createElement('div');
    el.className = b ? 'world-pin building-ribbon-badge' : 'world-pin lot-clay-badge';
    el.dataset.sig = '';
    el.onclick = (e) => {
      e.stopPropagation();
      if (e.target.closest('.ribbon-edit-chip')) {
        openRenameBuildingModal(lot.lotId);
        return;
      }
      if (b && b.pendingCoins > 0) {
        collectLotPendingCoins(lot.lotId);
      } else {
        focusCameraOnLot(lot.lotId, b ? 1.24 : 1.3);
      }
    };
    dom.lotsLayer.appendChild(el);
    lotOverlayEls[lot.lotId] = el;
  }

  for (const b of Object.values(state.buildings)) {
    for (const r of b.rooms) {
      const meta = ROOM_TYPE_META[r.layoutType] || ROOM_TYPE_META.studio;
      const rEl = document.createElement('div');
      rEl.className = 'world-pin hotel-room-pin';
      rEl.textContent = `${meta.emoji} ${r.subId} · ${meta.shortBadge}`;
      rEl.onclick = (e) => {
        e.stopPropagation();
        focusCameraOnRoom(r.id);
      };
      dom.roomsLayer.appendChild(rEl);
      roomOverlayEls[r.id] = rEl;

      const cPin = document.createElement('div');
      cPin.className = 'world-pin action-indicator-pin hidden';
      cPin.dataset.sig = '';
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
  if (!focusedRoomId) triggerSquashStretch(lot3D[lotId]?.root, 1.0);
  spawnCoinFountain3D(lot.x, 12.5, lot.z, 12);
  spawnFloatText(lot.x, 14.2, lot.z, `+${amt.toLocaleString()}만`);
}

function updateProjectedOverlays() {
  const inFullRoom = Boolean(focusedRoomId);
  const isCloseUp = inFullRoom || camera.zoom >= 1.24;
  const readyQuests = QUEST_LIST.filter((q) => !state.claimedQuests.includes(q.id) && q.check(state)).length;
  let tenantCrisisCount = 0;

  for (const lot of state.lots) {
    if (!lot.owned) {
      const devPin = devActionPinEls[lot.lotId];
      if (!devPin) continue;
      const showDevPin = !inFullRoom && !isCloseUp && hoveredLotId === lot.lotId;
      devPin.classList.toggle('hidden', !showDevPin);
      if (showDevPin) setPinPos(devPin, project(lot.x, 2.75, lot.z));
      continue;
    }

    const el = lotOverlayEls[lot.lotId];
    if (!el) continue;
    const b = state.buildings[lot.lotId];

    if (b) {
      const bLv = calcBuildingLevel(b);
      const sig = `rb_${b.title}_${bLv}_${b.pendingCoins}`;
      if (el.dataset.sig !== sig) {
        el.dataset.sig = sig;
        el.className = `world-pin building-ribbon-badge ${b.pendingCoins > 0 ? 'coin-ready' : ''}`;
        el.innerHTML = b.pendingCoins > 0
          ? `${createCustomSVGIcon('coin_stack', 17)}<span>${b.title}</span><span class="ribbon-lv-tag">+${b.pendingCoins}만 수금!</span>`
          : `${createCustomSVGIcon('crown_badge', 17)}<span>${b.title}</span><span class="ribbon-lv-tag">Lv.${bLv}</span><span class="ribbon-edit-chip" title="빌딩 이름 변경">${createCustomSVGIcon('edit_pen', 12)}</span>`;
      }
      const rbPt = project(lot.x + 6.5, 25.4, lot.z + 1.5);
      if (rbPt.inView && rbPt.x < 640 && rbPt.y < 124) rbPt.y = 124;
      el.style.opacity = isCloseUp ? '0' : '1';
      el.style.pointerEvents = isCloseUp ? 'none' : 'auto';
      setPinPos(el, rbPt);
    } else {
      const cat = DEVELOPMENT_CATALOG[lot.devType];
      const sig = `dev_${lot.title}`;
      if (el.dataset.sig !== sig) {
        el.dataset.sig = sig;
        el.className = 'world-pin lot-clay-badge';
        el.innerHTML = `${createCustomSVGIcon(cat.svgIcon, 16)}<span>${lot.title} (+${cat.cycleProfit}만)</span>`;
      }
      el.style.opacity = inFullRoom ? '0' : isCloseUp ? '0.2' : '1';
      el.style.pointerEvents = inFullRoom ? 'none' : 'auto';
      setPinPos(el, project(lot.x, 4.9, lot.z));
    }
  }

  for (const b of Object.values(state.buildings)) {
    const lot = getLot(b.lotId);
    for (const r of b.rooms) {
      const rEl = roomOverlayEls[r.id];
      const cPin = crisisPinEls[r.id];
      const hasCrisis = r.household && (r.evictionCountdown !== null || r.trashStage >= 2 || r.activeConflict);
      if (hasCrisis) tenantCrisisCount += 1;

      if (cPin) {
        if (hasCrisis && !inFullRoom) {
          cPin.className = 'world-pin action-indicator-pin pin-crisis';
          const label =
            r.evictionCountdown !== null ? `D-${Math.ceil(r.evictionCountdown)}s` :
            r.trashStage >= 2 ? '청소!' : '민원!';
          const sig = `c_${label}`;
          if (cPin.dataset.sig !== sig) {
            cPin.dataset.sig = sig;
            cPin.innerHTML = `${createCustomSVGIcon('alert_bubble', 14)}<span>${label}</span>`;
          }
          setPinPos(cPin, project(lot.x + r.lx, r.ly + r.rh * 0.72, lot.z + r.lz + 2.8));
        } else {
          cPin.classList.add('hidden');
        }
      }

      if (rEl) {
        const showRoomPin = !inFullRoom && hoveredRoomId === r.id;
        rEl.classList.toggle('visible-pin', showRoomPin);
        if (showRoomPin) {
          setPinPos(rEl, project(lot.x + r.lx, r.ly + r.rh * 0.62, lot.z + r.lz + 3.8));
        }
      }

      const spEl = speechEls[r.id];
      if (spEl) {
        const showSpeech = inFullRoom ? focusedRoomId === r.id : isCloseUp;
        spEl.style.opacity = showSpeech ? '1' : '0';
        if (showSpeech) {
          const anchor = residentActors[r.id]?.[0];
          const wx = anchor ? lot.x + r.lx + anchor.localX : lot.x + r.lx;
          const wy = anchor ? r.ly + anchor.localY + 1.95 : r.ly + 2.25;
          const wz = anchor ? lot.z + r.lz + anchor.localZ : lot.z + r.lz + 0.4;
          setPinPos(spEl, project(wx, wy, wz));
        }
      }
    }

    if (managerTagEls[b.lotId]) {
      managerTagEls[b.lotId].style.opacity = inFullRoom ? '0' : '1';
      setPinPos(managerTagEls[b.lotId], project(lot.x + 0.5, 2.8, lot.z + 5.8));
    }
  }

  for (const cb of careBubbles) {
    cb.el.style.opacity = inFullRoom ? '0' : '1';
    cb.el.style.pointerEvents = inFullRoom ? 'none' : 'auto';
    setPinPos(cb.el, project(cb.wx, cb.wy, cb.wz));
  }

  for (const rb of rentBubbles) {
    const visibleInMode = !inFullRoom || rb.roomId === focusedRoomId;
    rb.el.style.opacity = visibleInMode ? '1' : '0';
    rb.el.style.pointerEvents = visibleInMode ? 'auto' : 'none';
    setPinPos(rb.el, project(rb.wx, rb.wy, rb.wz));
  }

  const totalUrgent = readyQuests + tenantCrisisCount;
  if (totalUrgent > 0) {
    dom.fabRedDot.textContent = totalUrgent;
    dom.fabRedDot.classList.remove('hidden');
  } else {
    dom.fabRedDot.classList.add('hidden');
  }
  if (dom.tabDotQuests) dom.tabDotQuests.classList.toggle('hidden', readyQuests === 0);
  if (dom.tabDotTenants) dom.tabDotTenants.classList.toggle('hidden', tenantCrisisCount === 0);
  if (dom.modalAlertSummary) {
    if (tenantCrisisCount > 0) {
      dom.modalAlertSummary.textContent = `민원 ${tenantCrisisCount}`;
      dom.modalAlertSummary.classList.remove('hidden');
    } else {
      dom.modalAlertSummary.classList.add('hidden');
    }
  }
}

// =========================================================
// 21. HUD 카운팅 · 씬/스튜디오 조명 초기화 · 입력 바인딩
// =========================================================
function registerPick(mesh) {
  if (!pickableMeshes.includes(mesh)) pickableMeshes.push(mesh);
}

function triggerBadgeBounce(el) {
  if (!el) return;
  el.classList.remove('hud-value-pop');
  void el.offsetWidth;
  el.classList.add('hud-value-pop');
}

function addGold(delta) {
  state.gold = Math.max(0, Math.round(state.gold + delta));
  if (delta > 0) triggerBadgeBounce(dom.hudGoldWrap);
}

function tickHudCounters(dt) {
  hudAnim.targetGold = state.gold;

  let net = 0;
  for (const b of Object.values(state.buildings)) {
    net += calcBuildingGrossCycle(b);
    if (b.manager.hired) net -= GAME_BALANCE.managerSalaryPerCycle;
  }
  for (const dev of Object.values(state.developments)) {
    net += DEVELOPMENT_CATALOG[dev.devType].cycleProfit;
  }
  if (net > hudAnim.targetNet) triggerBadgeBounce(dom.hudNetIncome);
  hudAnim.targetNet = net;

  const avgHappy = calcAverageTownHappiness();
  if (avgHappy > hudAnim.targetHappy) triggerBadgeBounce(dom.hudHappiness);
  hudAnim.targetHappy = avgHappy;

  const k = Math.min(1, dt * 11);
  hudAnim.shownGold += (hudAnim.targetGold - hudAnim.shownGold) * k;
  hudAnim.shownNet += (hudAnim.targetNet - hudAnim.shownNet) * k;
  hudAnim.shownHappy += (hudAnim.targetHappy - hudAnim.shownHappy) * k;

  if (Math.abs(hudAnim.targetGold - hudAnim.shownGold) < 0.6) hudAnim.shownGold = hudAnim.targetGold;
  if (Math.abs(hudAnim.targetNet - hudAnim.shownNet) < 0.6) hudAnim.shownNet = hudAnim.targetNet;
  if (Math.abs(hudAnim.targetHappy - hudAnim.shownHappy) < 0.6) hudAnim.shownHappy = hudAnim.targetHappy;

  dom.hudGold.textContent = Math.round(hudAnim.shownGold).toLocaleString();
  const roundedNet = Math.round(hudAnim.shownNet);
  dom.hudNetIncome.textContent = `${roundedNet >= 0 ? '+' : ''}${roundedNet.toLocaleString()}만`;
  dom.hudNetIncome.className = `font-num text-[13px] sm:text-base leading-tight mt-0.5 whitespace-nowrap ${roundedNet >= 0 ? 'text-[#059669]' : 'text-[#E11D48]'}`;

  if (dom.hudHappiness) {
    dom.hudHappiness.textContent = `${Math.round(hudAnim.shownHappy)}%`;
  }

  const hr = Math.floor(state.gameMinutes / 60) % 24;
  const mn = Math.floor(state.gameMinutes % 60);
  if (dom.hudTimeText) {
    dom.hudTimeText.textContent = `${state.day}일차 ${String(hr).padStart(2, '0')}:${String(mn).padStart(2, '0')}`;
  }
}

function showToast(msg, tone = 'amber') {
  const iconName = tone === 'emerald' ? 'coin_stack' : tone === 'rose' ? 'megaphone' : 'town_notebook';
  const el = document.createElement('div');
  el.className = 'pastel-toast transition-all duration-300';
  el.innerHTML = `${createCustomSVGIcon(iconName, 17)}<span>${msg}</span>`;
  dom.toastContainer.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-8px)';
    setTimeout(() => el.remove(), 260);
  }, 2400);
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
      for (const b of Object.values(state.buildings)) {
        b.rooms.forEach((r) => ensureRoomSchema(r));
      }
      hudAnim.shownGold = state.gold;
      hudAnim.targetGold = state.gold;
    }
  } catch (e) {
    console.warn('Load failed:', e);
  }
}

function updateCameraFrustum() {
  const aspect = window.innerWidth / window.innerHeight;
  const baseH = aspect < 1 ? 38 / Math.max(0.5, aspect) : 38;
  camera.left = (-baseH * aspect) / 2;
  camera.right = (baseH * aspect) / 2;
  camera.top = baseH / 2;
  camera.bottom = -baseH / 2;
  camera.updateProjectionMatrix();

  if (focusedRoomId) {
    const rm = findRoom(focusedRoomId);
    if (rm) {
      const { wx, wy, wz, targetZoom } = computeFullScreenRoomViewParams(rm);
      camTween.look.set(wx, wy, wz);
      camTween.zoom = targetZoom;
      camTween.active = true;
    }
  }
}

function initSceneAndControls() {
  initSharedResources();
  scene = new THREE.Scene();
  scene.background = TEX.skyBackdrop;

  const aspect = window.innerWidth / window.innerHeight;
  const baseH = aspect < 1 ? 38 / Math.max(0.5, aspect) : 38;
  camera = new THREE.OrthographicCamera(
    (-baseH * aspect) / 2,
    (baseH * aspect) / 2,
    baseH / 2,
    -baseH / 2,
    -180,
    340
  );
  camera.position.copy(OVERVIEW_LOOK.clone().add(CAM_OFFSETS[0]));
  camera.zoom = 0.82;
  camera.updateProjectionMatrix();

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0xD8F3FF, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.14;
  dom.webglContainer.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(OVERVIEW_LOOK);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minZoom = 0.45;
  controls.maxZoom = 7.5;
  controls.minPolarAngle = Math.PI * 0.16;
  controls.maxPolarAngle = Math.PI * 0.44;
  controls.screenSpacePanning = true;
  controls.update();

  hemiLight = new THREE.HemisphereLight(0xFFFDF8, 0xD8CEC0, 1.12);
  scene.add(hemiLight);

  dirLight = new THREE.DirectionalLight(0xFFF6E5, 1.56);
  dirLight.position.set(28, 46, 34);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 4;
  dirLight.shadow.camera.far = 140;
  dirLight.shadow.camera.left = -48;
  dirLight.shadow.camera.right = 48;
  dirLight.shadow.camera.top = 48;
  dirLight.shadow.camera.bottom = -48;
  dirLight.shadow.bias = -0.0005;
  dirLight.shadow.normalBias = 0.025;
  scene.add(dirLight);

  shadowFillLight = new THREE.DirectionalLight(0xEDE8F5, 0.52);
  shadowFillLight.position.set(-28, 22, -22);
  scene.add(shadowFillLight);

  // [핵심 1] 단독 룸 뷰 전용 3점 스튜디오 조명 리그 & 미니어처 받침 스테이지
  studioKeyLight = new THREE.PointLight(0xFFF6E5, 2.25, 36, 1.3);
  studioKeyLight.visible = false;
  studioFillLight = new THREE.PointLight(0xFFE8D6, 1.35, 30, 1.4);
  studioFillLight.visible = false;
  studioRimLight = new THREE.PointLight(0xE0F2FE, 1.15, 30, 1.4);
  studioRimLight.visible = false;
  scene.add(studioKeyLight, studioFillLight, studioRimLight);

  studioStageDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.54, 0.18, 48),
    makeClayMat(0xFFF7EB, { roughness: 0.72, emissiveIntensity: 0.08 })
  );
  studioStageDisc.receiveShadow = true;
  studioStageDisc.visible = false;
  studioStageDisc.raycast = () => {};
  scene.add(studioStageDisc);

  buildCozyFloatingIsland();
  buildAllLots3D();
  spawnIslandPets3D();
  initFocusAndSelectionGuides3D();
}

function mountStaticCustomSVGIcons() {
  const mounts = [
    ['hud-ico-gold', 'coin_stack', 24],
    ['hud-ico-yield', 'red_house', 22],
    ['hud-ico-happy', 'heart_gauge', 21],
    ['hud-ico-overview', 'red_house', 15],
    ['hud-ico-collect', 'coin_stack', 16],
    ['rf-btn-rename', 'edit_pen', 12],
    ['fab-svg-slot', 'town_notebook', 28],
    ['modal-ico-notebook', 'town_notebook', 22],
    ['tab-ico-quests', 'quest_trophy', 15],
    ['tab-ico-tenants', 'megaphone', 15],
    ['tab-ico-manager', 'manager_cap', 15],
    ['tab-ico-infra', 'elevator', 15],
    ['dev-ico-header', 'solar_panel', 22],
    ['rec-ico-header', 'gold_key', 22],
    ['rename-ico-crown', 'crown_badge', 20],
    ['rename-ico-pen', 'edit_pen', 14]
  ];
  for (const [id, name, size] of mounts) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = createCustomSVGIcon(name, size);
  }

  const stampSlot = document.getElementById('stamp-ico-slot');
  if (stampSlot) {
    stampSlot.innerHTML = createNotebookArtworkSVG('stamp_complete', 44);
  }

  const binderEl = document.getElementById('notebook-binder-rings');
  if (binderEl) {
    binderEl.innerHTML = Array.from({ length: 8 })
      .map(() => createNotebookArtworkSVG('binder_ring'))
      .join('');
  }
}

function isHitSelectable(hit) {
  const obj = hit.object;
  if (!obj.visible) return false;
  // 부모 그룹 중 숨겨진(visible === false) 객체는 레이캐스트에서 즉시 제외
  let p = obj.parent;
  while (p) {
    if (!p.visible) return false;
    p = p.parent;
  }
  const ud = obj.userData;
  if (focusedRoomId) {
    if (ud.roomId && ud.roomId !== focusedRoomId) return false;
    if (!ud.roomId && !ud.isPettableActor) return false;
  }
  if (ud.isShell && currentShellOpacity < 0.65) return false;
  return true;
}

function bindUIAndInput() {
  const ptrs = new Map();
  let downX = 0;
  let downY = 0;
  let multi = false;

  renderer.domElement.addEventListener('pointermove', (e) => {
    if (ptrs.size > 0) return;
    pointerNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointerNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointerNDC, camera);
    const hits = raycaster.intersectObjects(pickableMeshes, false);

    const validHit =
      (!focusedRoomId && hits.find((h) => isHitSelectable(h) && h.object.userData.isRoomWindow)) ||
      hits.find(isHitSelectable);
    if (validHit) {
      renderer.domElement.style.cursor = 'pointer';
      const ud = validHit.object.userData;
      hoveredRoomId = ud.roomId ? ud.roomId : null;
      hoveredLotId = ud.lotId || null;
      if (!focusedRoomId && ud.isShopSign && hoveredShopMesh !== validHit.object) {
        hoveredShopMesh = validHit.object;
        triggerSquashStretch(validHit.object, 0.72);
      }
    } else {
      renderer.domElement.style.cursor = 'grab';
      hoveredRoomId = null;
      hoveredLotId = null;
      hoveredShopMesh = null;
    }
  });

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
    if (Math.hypot(e.clientX - downX, e.clientY - downY) >= 6) return;

    pointerNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointerNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointerNDC, camera);
    const hits = raycaster.intersectObjects(pickableMeshes, false);
    const validHit =
      (!focusedRoomId && hits.find((h) => isHitSelectable(h) && h.object.userData.isRoomWindow)) ||
      hits.find(isHitSelectable);

    if (validHit) {
      const ud = validHit.object.userData;
      if (ud.isPettableActor && ud.propRoot) {
        handleHeartTouchBonus(validHit.point.x, validHit.point.y, validHit.point.z, ud.propRoot, ud.label);
      } else if (ud.roomId) {
        // 외벽 창문 클릭이든 X-Ray 내부 클릭이든 방 클릭 시 즉시 전체화면 단독 룸 뷰 진입!
        if (focusedRoomId !== ud.roomId) {
          focusCameraOnRoom(ud.roomId);
        }
      } else if (!focusedRoomId && ud.isRenameSign && ud.lotId) {
        openRenameBuildingModal(ud.lotId);
      } else if (!focusedRoomId && ud.isShopSign) {
        triggerSquashStretch(validHit.object, 1.35);
        spawnSmokePoof3D(validHit.point.x, validHit.point.y + 0.2, validHit.point.z, 0xFFFDF9, 6);
        if (ud.shopLabel) showToast(ud.shopLabel, 'emerald');
      } else if (!focusedRoomId && ud.openNotebookTab) {
        selectedSplitItemId = ud.lotId;
        openNotebookModal(ud.openNotebookTab);
      } else if (!focusedRoomId && ud.isStreetProp && ud.propRoot) {
        triggerSquashStretch(ud.propRoot, 1.35);
        spawnSmokePoof3D(validHit.point.x, validHit.point.y + 0.3, validHit.point.z, 0xFFFDF9, 5);
        if (ud.label) showToast(ud.label, 'amber');
      } else if (!focusedRoomId && ud.lotId) {
        const lot = getLot(ud.lotId);
        if (lot && !lot.owned) {
          const reg = lot3D[lot.lotId];
          if (reg?.signpostPivot) triggerSquashStretch(reg.signpostPivot, 1.55);
          openLotDevModal(lot.lotId);
        } else if (lot) {
          focusCameraOnLot(lot.lotId, 1.28);
        }
      }
    }
  });

  // 수첩 탭 바인딩
  dom.fabNotebook.onclick = () => openNotebookModal();
  document.getElementById('btn-close-notebook').onclick = () => dom.notebookModal.classList.add('hidden');
  document.querySelectorAll('.ntab-btn').forEach((btn) => {
    btn.onclick = () => {
      activeNotebookTab = btn.dataset.ntab;
      selectedSplitItemId = null;
      renderNotebookSplitView();
    };
  });

  // [핵심 1] 전체화면 룸 뷰 나가기 & 세대 카드 접기 버튼
  if (dom.btnExitRoomView) {
    dom.btnExitRoomView.onclick = exitRoomFocusMode;
  }
  document.getElementById('btn-close-room-focus').onclick = exitRoomFocusMode;

  if (dom.btnToggleRfBody) {
    dom.btnToggleRfBody.onclick = () => {
      isRfBodyCollapsed = !isRfBodyCollapsed;
      dom.btnToggleRfBody.textContent = isRfBodyCollapsed ? '▸' : '▾';
      if (dom.rfBody) dom.rfBody.classList.toggle('hidden', isRfBodyCollapsed);
    };
  }

  // [핵심 3] 가구 카탈로그 카테고리 탭 & 접기 토글 바인딩
  document.querySelectorAll('.fcat-tab-btn').forEach((btn) => {
    btn.onclick = () => {
      activeFurnitureCategory = btn.dataset.fcat;
      isCatalogCollapsed = false;
      renderFurnitureCatalogSheet();
    };
  });

  if (dom.btnToggleCatalog) {
    dom.btnToggleCatalog.onclick = () => {
      isCatalogCollapsed = !isCatalogCollapsed;
      renderFurnitureCatalogSheet();
      if (focusedRoomId) {
        const rm = findRoom(focusedRoomId);
        if (rm) {
          const { wx, wy, wz, targetZoom } = computeFullScreenRoomViewParams(rm);
          camTween.look.set(wx, wy, wz);
          camTween.zoom = targetZoom;
          camTween.active = true;
        }
      }
    };
  }

  document.getElementById('btn-overview-cam').onclick = resetOverviewCamera;
  dom.btnCollectAll.onclick = () => {
    [...rentBubbles].forEach((rb) => collectRentCoinBubble(rb, true));
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
    if (state.gold < 10) { showToast('비용(10만) 부족!', 'rose'); return; }
    addGold(-10);
    generateRecruitCandidates(recruitRoomTarget);
    renderRecruitCards();
  };

  document.getElementById('btn-close-rename').onclick = () => dom.renameModal.classList.add('hidden');
  document.getElementById('btn-cancel-rename').onclick = () => dom.renameModal.classList.add('hidden');
  document.getElementById('btn-confirm-rename').onclick = confirmRenameBuilding;
  dom.inputBuildingName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmRenameBuilding();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && focusedRoomId) {
      exitRoomFocusMode();
    }
  });

  let resetArmed = false;
  const resetBtn = document.getElementById('btn-reset-save');
  resetBtn.onclick = () => {
    if (!resetArmed) {
      resetArmed = true;
      resetBtn.textContent = '확인?';
      showToast('초기화하려면 [확인?]을 한 번 더 누르세요', 'rose');
      setTimeout(() => {
        resetArmed = false;
        resetBtn.textContent = '초기화';
      }, 3000);
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
  dom.roomVignette = document.getElementById('room-isolation-vignette');
  dom.lotsLayer = document.getElementById('lots-overlay-layer');
  dom.roomsLayer = document.getElementById('rooms-overlay-layer');
  dom.crisisLayer = document.getElementById('crisis-pins-layer');
  dom.rentBubblesLayer = document.getElementById('rent-bubbles-layer');
  dom.flyingCoinLayer = document.getElementById('flying-coin-layer');
  dom.speechLayer = document.getElementById('speech-overlay-layer');
  dom.careLayer = document.getElementById('care-overlay-layer');
  dom.jackpotLayer = document.getElementById('jackpot-overlay-layer');

  dom.hudBadgeGold = document.getElementById('hud-badge-gold');
  dom.hudGold = document.getElementById('hud-gold');
  dom.hudGoldWrap = document.getElementById('hud-gold-wrap');
  dom.hudNetIncome = document.getElementById('hud-net-income');
  dom.hudHappiness = document.getElementById('hud-happiness');
  dom.hudTimeText = document.getElementById('hud-time-text');
  dom.hudXrayBadge = document.getElementById('hud-xray-badge');
  dom.btnCollectAll = document.getElementById('btn-collect-all');

  dom.hudTownControls = document.getElementById('hud-town-controls');
  dom.roomFocusTopbar = document.getElementById('room-focus-topbar');
  dom.btnExitRoomView = document.getElementById('btn-exit-room-view');
  dom.roomSwitcherChips = document.getElementById('room-switcher-chips');
  dom.bottomTownBar = document.getElementById('bottom-town-bar');

  dom.roomFocusPanel = document.getElementById('room-focus-panel');
  dom.rfRoomNum = document.getElementById('rf-room-num');
  dom.rfTypeBadge = document.getElementById('rf-type-badge');
  dom.rfTitle = document.getElementById('rf-title');
  dom.rfBtnRename = document.getElementById('rf-btn-rename');
  dom.rfTierBadge = document.getElementById('rf-tier-badge');
  dom.btnToggleRfBody = document.getElementById('btn-toggle-rf-body');
  dom.rfBody = document.getElementById('rf-body');

  dom.furnitureSheet = document.getElementById('furniture-catalog-sheet');
  dom.fcatRoomBadge = document.getElementById('fcat-room-badge');
  dom.fcatBonusBadge = document.getElementById('fcat-bonus-badge');
  dom.btnToggleCatalog = document.getElementById('btn-toggle-catalog');
  dom.fcatCollapsibleBody = document.getElementById('fcat-collapsible-body');
  dom.fcatItemsGrid = document.getElementById('fcat-items-grid');

  dom.fabNotebook = document.getElementById('fab-notebook');
  dom.fabRedDot = document.getElementById('fab-red-dot');
  dom.tabDotQuests = document.getElementById('tab-dot-quests');
  dom.tabDotTenants = document.getElementById('tab-dot-tenants');
  dom.modalQuestSummary = document.getElementById('modal-quest-summary');
  dom.modalAlertSummary = document.getElementById('modal-alert-summary');
  dom.notebookModal = document.getElementById('notebook-modal');
  dom.notebookBody = document.getElementById('notebook-unified-body');

  dom.lotDevModal = document.getElementById('lot-dev-modal');
  dom.devLotBadge = document.getElementById('dev-lot-badge');
  dom.devCardsGrid = document.getElementById('dev-cards-grid');

  dom.recruitModal = document.getElementById('recruit-modal');
  dom.recRoomTitle = document.getElementById('rec-room-title');
  dom.recCardsGrid = document.getElementById('rec-cards-grid');

  dom.renameModal = document.getElementById('rename-building-modal');
  dom.inputBuildingName = document.getElementById('input-building-name');
  dom.renamePresetsRow = document.getElementById('rename-presets-row');

  dom.evictionOverlay = document.getElementById('eviction-stamp-overlay');
  dom.evictionStampBox = document.getElementById('eviction-stamp-box');
  dom.toastContainer = document.getElementById('toast-container');
}

// --------------------- 엔트리포인트 ---------------------
window.addEventListener('DOMContentLoaded', () => {
  cacheDom();
  mountStaticCustomSVGIcons();
  loadState();
  initSceneAndControls();
  rebuildStaticOverlayDOM();
  bindUIAndInput();
  tickHudCounters(1);

  let last = performance.now();

  function frame(now) {
    const dt = Math.min(0.06, (now - last) / 1000);
    last = now;
    const nowSec = now * 0.001;

    if (camTween.active) {
      const k = Math.min(1, dt * 8.0);
      camera.position.lerp(camTween.pos, k);
      controls.target.lerp(camTween.look, k);
      camera.zoom += (camTween.zoom - camera.zoom) * k;
      camera.updateProjectionMatrix();
      if (camera.position.distanceTo(camTween.pos) < 0.08 && Math.abs(camera.zoom - camTween.zoom) < 0.01) {
        camTween.active = false;
      }
    }
    controls.update();

    updateXRayAndFocusHighlights(dt, nowSec);

    spinningWashers.forEach((w) => { w.rotation.z += dt * 3.8; });
    spinningFans.forEach((f) => { f.rotation.z += dt * 12.0; });
    Object.values(odorEmitters).forEach((fg) => { fg.rotation.y += dt * 4.5; });

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

    for (let i = activeBounces.length - 1; i >= 0; i--) {
      const b = activeBounces[i];
      b.elapsed += dt;
      const t = Math.min(1, b.elapsed / b.duration);
      b.obj.position.y = b.baseY + (1 - easeOutBounce(t)) * 1.4;
      if (t >= 1) {
        b.obj.position.y = b.baseY;
        activeBounces.splice(i, 1);
      }
    }

    for (let i = activeSquashes.length - 1; i >= 0; i--) {
      const sq = activeSquashes[i];
      sq.elapsed += dt;
      const t = sq.elapsed / sq.duration;
      if (t >= 1) {
        sq.obj.scale.copy(sq.baseScale);
        activeSquashes.splice(i, 1);
      } else {
        const wave = Math.cos(t * Math.PI * 3.2) * Math.exp(-t * 4.2) * 0.16 * sq.intensity;
        const sx = 1 + wave;
        const sy = Math.max(0.7, 1 - wave * 1.15);
        sq.obj.scale.set(sq.baseScale.x * sx, sq.baseScale.y * sy, sq.baseScale.z * sx);
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
      if (p.shrink) p.mesh.scale.multiplyScalar(0.95);
      if (p.grow) p.mesh.scale.multiplyScalar(1.015);
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
    tickMiniatureWorldLife(dt, nowSec);
    tickHudCounters(dt);

    renderer.render(scene, camera);
    updateProjectedOverlays();

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
  setInterval(saveState, 3000);
});
