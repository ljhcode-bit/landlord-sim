// =========================================================
// 【갓물주 라이프 3D: 미니미 타운 — 커스텀 입체 간판 & 빌딩 현판 & 다꾸 수첩 리마스터】 (app.js)
// 1. 1층 상가 고해상도 캔버스 간판(createShopSignboardTexture) & 3D 입체 조형물:
//    - 해피마트(MINI MART 24): 3색 스트라이프 간판 + 삼각김밥·장바구니·바코드 + 양면 24H 네온 돌출간판 + 물결 어닝 + A자 입간판
//    - 뽀송 워시(BUBBLE PONG): 구름 프레임 간판 + 노란 네온 포인트 + 비누방울이 보글보글 피어오르는 입체 세탁기 마스코트
//    - 달콤 다방(SWEET CAFE): 브라운·크림 물결 어닝 + 김이 모락모락 나는 입체 커피잔·크루아상 조형물
// 2. 빌딩 고유 이름 현판 시스템:
//    - 옥상 전면 입체 아치형 스카이 사인 + 1층 정문 황동 명패 + 지붕 위 왕관 리본 타이틀 배지 + 실시간 [이름 변경] 작명 기능
// 3. 만화풍 다크 코코아 윤곽선(#5A463C), 호실 골드/크림 격자 몰딩, 바닥 점선 포커스 패드, 호버 발광, 다꾸 스프링 수첩
// =========================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const SAVE_KEY = 'god_landlord_signage_remaster_2026_v4';

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
    trashStage: 0,
    trashProgress: 0,
    evictionCountdown: null,
    activeConflict: null
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
      minRentFloor: 80,
      autoBudgetCap: 90,
      salaryTimer: 0
    },
    pendingCoins: 0,
    shopCycleTimer: 0
  };
}

function createInitialState() {
  const lots = JSON.parse(JSON.stringify(INITIAL_ISLAND_LOTS));
  const buildings = {
    lot_main: makeResidentialBuilding('lot_main', 'mixed_1', '해피 미니미 타운 1차')
  };
  const developments = {};

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

// --------------------- Three.js 전역 변수 및 레지스트리 ---------------------
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
  zoom: 0.9
};

let currentShellOpacity = 1.0;
let focusedRoomId = null;
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
  shownGold: 460,
  targetGold: 460,
  shownNet: 0,
  targetNet: 0,
  shownHappy: 100,
  targetHappy: 100
};

// 3D 공유 캐시
const GEO = {};
const MAT = {};
const TEX = {};
const extrudeGeoCache = new Map();
const edgesGeoCache = new Map();
const domeGeoCache = new Map();

const lot3D = {};
const pickableMeshes = [];
const spinningWashers = [];
const activeBounces = [];
const activeSquashes = [];
const activeParticles = [];
const shockwaveRings = [];
const waterRipples = [];
const odorEmitters = {};
const facadeEmitters = []; // [요구사항 1] 세탁소 비누방울 & 다방 커피 김 파티클 에미터!
const residentActors = {};
const petActors = [];
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
const selectedRoomBeacons = [];

const careBubbles = [];
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
// 1. 클레이 곡면(createRoundedToyMesh) + 만화풍 코코아 윤곽선(#5A463C)
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
    bevelSegments: 5,
    curveSegments: 6
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
    bevelSegments: 5,
    curveSegments: 6
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
    bevelSegments: 4
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
// 2. [요구사항 1 & 2] 고해상도 상가 간판 아트워크 생성기 (createShopSignboardTexture)
//    & 옥상 빌딩 스카이 사인 / 정문 황동 명패 텍스처 생성기
// =========================================================
function createShopSignboardTexture(shopType = 'mart') {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 220;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  if (shopType === 'mart') {
    // 1) 해피마트 / MINI MART 24: 민트·코랄·옐로우 3색 가로 스트라이프 + 삼각김밥·장바구니·바코드 아트워크!
    ctx.fillStyle = '#FFFDF9';
    ctx.beginPath();
    ctx.roundRect(6, 6, w - 12, h - 12, 34);
    ctx.fill();

    // 상·하단 3색 시그니처 스트라이프 컬러 바
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

    // 좌측 귀여운 삼각김밥(Onigiri) 심볼 일러스트
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

    // 김(Nori) + 발그레 볼터치 + 스마일 눈
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

    // 중앙 외곽선이 뚜렷한 둥근 한글·영문 로고 타이포그래피
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

    // 우측 장바구니 배지 & 바코드 디테일
    ctx.fillStyle = '#FEF3C7';
    ctx.strokeStyle = '#43342E';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.roundRect(w - 168, 72, 128, 62, 16);
    ctx.fill();
    ctx.stroke();

    // 미니 바코드 라인
    const bx = w - 150;
    [5, 3, 7, 2, 6, 4, 3, 6, 3].forEach((bw, idx) => {
      ctx.fillStyle = '#43342E';
      ctx.fillRect(bx + idx * 10.5, 84, bw, 28);
    });
    ctx.font = '18px "Cafe24Ssurround", "CookieRun-Regular"';
    ctx.fillStyle = '#B45309';
    ctx.fillText('OPEN 24H', w - 104, 154);
  } else if (shopType === 'wash') {
    // 2) 뽀송 워시 / BUBBLE PONG: 스카이블루 & 화이트 구름 프레임 + 비누방울 일러스트!
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#7CC8FF');
    bgGrad.addColorStop(1, '#38A3F8');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.roundRect(6, 6, w - 12, h - 12, 38);
    ctx.fill();

    // 안쪽 몽글몽글 구름 라운드 배너
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

    // 좌·우 보글보글 비누방울 아트워크
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
    // 3) 달콤 다방 / SWEET CAFE: 브라운 & 밀크크림 + 커피잔·크루아상 일러스트!
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

    // 좌측 크루아상 & 커피 일러스트
    ctx.fillStyle = '#F59E0B';
    ctx.strokeStyle = '#43342E';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.ellipse(105, 118, 38, 22, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 우측 라떼 컵 일러스트
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

// 24H 양면 원형 돌출 네온 간판(Blade Sign) 텍스처
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

// 매장 앞 A자 미니 입간판(A-Frame Menu Board) 텍스처
function createAFrameMenuTexture() {
  return TextureGenerator.create((ctx, w, h) => {
    ctx.fillStyle = '#FFF8EB';
    ctx.beginPath();
    ctx.roundRect(8, 8, w - 16, h - 16, 20);
    ctx.fill();
    ctx.strokeStyle = '#5A463C';
    ctx.lineWidth = 8;
    ctx.stroke();

    // 귀여운 딸기우유 & 삼각김밥 세트 아이콘
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

// [요구사항 2-1] 옥상 전면 아치형 빌딩 스카이 사인 & 1층 정문 황동 명패 텍스처 생성기!
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

  // 좌·우 귀여운 왕관/별 장식
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

  ctx.strokeStyle = '#43342E';
  ctx.lineWidth = 6;
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
    }, 2.2, 2.2, 256, 256);
  }

  static pastelStripeWallpaper(stripeA = '#FFFDF9', stripeB = '#FFE8EE', moldingHex = '#E8B8C6') {
    return this.create((ctx, w, h) => {
      const sw = 24;
      for (let x = 0; x < w; x += sw) {
        ctx.fillStyle = (x / sw) % 2 === 0 ? stripeA : stripeB;
        ctx.fillRect(x, 0, sw, h);
      }
      ctx.fillStyle = '#FFFDF9';
      ctx.fillRect(0, h * 0.66, w, h * 0.34);
      ctx.fillStyle = moldingHex;
      ctx.fillRect(0, h * 0.64, w, 6);
      ctx.strokeStyle = moldingHex;
      ctx.lineWidth = 3;
      for (let px = 14; px < w; px += 60) {
        ctx.strokeRect(px, h * 0.72, 42, h * 0.22);
      }
    }, 2, 1, 256, 256);
  }

  static stripedAwning(accentHex = '#FF758F', creamHex = '#FFFDF9') {
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
      ctx.fillStyle = '#EBDCCB';
      ctx.fillRect(0, 0, w, h);
      const stones = ['#FFFDF9', '#FDF4EA', '#F8EBD9', '#FDEFE5'];
      for (let r = 0; r < 6; r++) {
        const offset = (r % 2) * 22;
        for (let c = -1; c < 7; c++) {
          const sx = c * 44 + offset + 4;
          const sy = r * 42 + 4;
          ctx.fillStyle = stones[(r * 3 + c + 4) % stones.length];
          ctx.beginPath();
          ctx.roundRect(sx, sy, 36, 34, 12);
          ctx.fill();
          ctx.strokeStyle = '#D4BEA6';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }, 3, 1.4, 256, 256);
  }

  static pastelBrickTile(bgHex = '#FFF9F3', tones = ['#F8D6C8', '#F4C3B0', '#FCE7DD']) {
    return this.create((ctx, w, h) => {
      ctx.fillStyle = bgHex;
      ctx.fillRect(0, 0, w, h);
      for (let r = 0; r < 8; r++) {
        const off = (r % 2) * 24;
        for (let c = -1; c < 6; c++) {
          ctx.fillStyle = tones[(r + c + 5) % tones.length];
          ctx.beginPath();
          ctx.roundRect(c * 48 + off + 3, r * 32 + 3, 42, 26, 7);
          ctx.fill();
        }
      }
    }, 3, 2, 256, 256);
  }

  static cloverMeadow() {
    return this.create((ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#9CE8AA');
      grad.addColorStop(1, '#7CD68F');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 60; i++) {
        ctx.fillStyle = i % 3 === 0 ? '#B7F4C2' : '#6BC480';
        ctx.beginPath();
        ctx.arc((i * 47) % w, (i * 73) % h, 4.5 + (i % 4), 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < 14; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#FFFDF9' : '#FFE4EC';
        ctx.beginPath();
        ctx.arc((i * 67 + 20) % w, (i * 97 + 18) % h, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }, 5, 5, 256, 256);
  }

  static streamWater() {
    return this.create((ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#8BE0FF');
      g.addColorStop(1, '#4CC3FA');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.lineWidth = 4;
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
      ctx.strokeStyle = '#5A463C';
      ctx.lineWidth = 8;
      ctx.stroke();

      ctx.fillStyle = '#FFFDF9';
      ctx.strokeStyle = '#5A463C';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.roundRect(w * 0.34, h * 0.44, w * 0.32, h * 0.38, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FF6B8B';
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

  static cementFloor() {
    return this.create((ctx, w, h) => {
      ctx.fillStyle = '#DAD2C8';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#BDB3A7';
      ctx.lineWidth = 2;
      ctx.strokeRect(8, 8, w - 16, h - 16);
    }, 2, 2, 256, 256);
  }

  static softContactShadow() {
    return this.create((ctx, s) => {
      const g = ctx.createRadialGradient(s / 2, s / 2, s * 0.08, s / 2, s / 2, s * 0.48);
      g.addColorStop(0, 'rgba(90, 56, 42, 0.32)');
      g.addColorStop(0.65, 'rgba(110, 72, 54, 0.12)');
      g.addColorStop(1, 'rgba(110, 72, 54, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, s * 0, s, s);
    }, 1, 1, 128, 128);
  }
}

function initSharedResources() {
  TEX.shadow = TextureGenerator.softContactShadow();
  TEX.meadow = TextureGenerator.cloverMeadow();
  TEX.water = TextureGenerator.streamWater();
  TEX.cobble = TextureGenerator.creamCobblestone();
  TEX.brickWarm = TextureGenerator.pastelBrickTile('#FFF9F3', ['#F8D6C8', '#F4C3B0', '#FCE7DD']);
  TEX.brickMint = TextureGenerator.pastelBrickTile('#F6FFFB', ['#CCFBF1', '#A7F3D0', '#E6FFFA']);

  TEX.floor0 = TextureGenerator.cementFloor();
  TEX.floor1 = TextureGenerator.herringboneWood('maple');
  TEX.floor2 = TextureGenerator.herringboneWood('oak');
  TEX.floor3 = TextureGenerator.herringboneWood('royal');

  TEX.wall0 = TextureGenerator.pastelStripeWallpaper('#EFE9E2', '#E5DDD4', '#D6CCC0');
  TEX.wall1 = TextureGenerator.pastelStripeWallpaper('#FFFDF9', '#FFE8EE', '#E8B8C6');
  TEX.wall2 = TextureGenerator.pastelStripeWallpaper('#FFFDF9', '#E6F7F0', '#A8DCC8');
  TEX.wall3 = TextureGenerator.pastelStripeWallpaper('#FFFDF9', '#FEF3C7', '#E8C56B');

  TEX.awningCoral = TextureGenerator.stripedAwning('#FF6B8B', '#FFFDF9');
  TEX.awningSky = TextureGenerator.stripedAwning('#38BDF8', '#FFFDF9');
  TEX.awningBrown = TextureGenerator.stripedAwning('#8B5630', '#FFF8EB');
  TEX.signEmblem = TextureGenerator.woodenSignEmblem();

  TEX.dashMint = TextureGenerator.dashedFocusStrip('#10B981', '#FFFFFF');
  TEX.dashGold = TextureGenerator.dashedFocusStrip('#FBBF24', '#FFFFFF');

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
    color: 0x5A463C,
    transparent: true,
    opacity: 0.54
  });
  MAT.toonHull = new THREE.MeshBasicMaterial({
    color: 0x5A463C,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.58
  });
  MAT.roomGridGold = makeClayMat(0xFDE68A, { emissive: 0xFBBF24, emissiveIntensity: 0.28, roughness: 0.38 });
  MAT.roomGridCream = makeClayMat(0xFFFDF9, { roughness: 0.42 });
  MAT.neonYellow = makeClayMat(0xFDE047, { emissive: 0xFACC15, emissiveIntensity: 0.85, roughness: 0.2 });
  MAT.neonCoral = makeClayMat(0xFF758F, { emissive: 0xFF4D6D, emissiveIntensity: 0.72, roughness: 0.22 });

  MAT.dashBorderMint = new THREE.MeshBasicMaterial({ map: TEX.dashMint, transparent: true, opacity: 0.92 });
  MAT.dashBorderGold = new THREE.MeshBasicMaterial({ map: TEX.dashGold, transparent: true, opacity: 0.95 });
  animatedDashMaterials.push(MAT.dashBorderMint, MAT.dashBorderGold);

  MAT.shadow = new THREE.MeshBasicMaterial({ map: TEX.shadow, transparent: true, depthWrite: false });
  MAT.slab = makeClayMat(0xFFFDF8);
  MAT.basePadCream = makeClayMat(0xFFFDF4, { roughness: 0.5 });
  MAT.basePadMint = makeClayMat(0xECFDF5, { roughness: 0.5 });
  MAT.woodLight = makeClayMat(0xEBB986);
  MAT.woodWarm = makeClayMat(0xC6834B);
  MAT.woodDark = makeClayMat(0x8B5630);
  MAT.white = makeClayMat(0xFFFDF9, { roughness: 0.46 });
  MAT.cream = makeClayMat(0xFFF5E8);
  MAT.coral = makeClayMat(0xFF758F, { roughness: 0.48 });
  MAT.redPost = makeClayMat(0xFF5A76, { roughness: 0.44 });
  MAT.pinkSoft = makeClayMat(0xFFB8CA);
  MAT.mint = makeClayMat(0x34D399);
  MAT.mintSoft = makeClayMat(0xA7F3D0);
  MAT.sky = makeClayMat(0x68B5FF, { coolShadow: true });
  MAT.butter = makeClayMat(0xFDE068, { roughness: 0.46 });
  MAT.duckYellow = makeClayMat(0xFFE14D, { roughness: 0.4 });
  MAT.orangeBill = makeClayMat(0xFF8C42, { roughness: 0.45 });
  MAT.lavender = makeClayMat(0xC8B6FF, { coolShadow: true });
  MAT.purpleDark = makeClayMat(0x6D28D9, { coolShadow: true });
  MAT.charcoal = makeClayMat(0x3B3330, { roughness: 0.5, emissiveIntensity: 0.1 });
  MAT.silver = makeClayMat(0xE2E8F0, { metalness: 0.2, roughness: 0.36, coolShadow: true });
  MAT.gold = makeClayMat(0xFFD43B, { metalness: 0.18, roughness: 0.32, emissive: 0xFFB703, emissiveIntensity: 0.25 });
  MAT.glass = new THREE.MeshStandardMaterial({
    color: 0xE0F4FF,
    emissive: 0xBAE6FD,
    emissiveIntensity: 0.2,
    transparent: true,
    opacity: 0.48,
    roughness: 0.14,
    metalness: 0.08
  });
  MAT.screenCyan = makeClayMat(0x56CCF2, { emissive: 0x38BDF8, emissiveIntensity: 0.82, roughness: 0.22 });
  MAT.screenPurple = makeClayMat(0xD8B4FE, { emissive: 0xA855F7, emissiveIntensity: 0.85, roughness: 0.22 });
  MAT.movingBox = makeClayMat(0xE2AC76);
  MAT.trashBag = makeClayMat(0x4B4453, { coolShadow: true });
  MAT.pizzaBox = makeClayMat(0xF8B466);
  MAT.leafGreen = makeClayMat(0x5AD07A);
  MAT.cloverGreen = makeClayMat(0x38C96B);
  MAT.sakuraPink = makeClayMat(0xFFC2D6);
  MAT.cloudWhite = makeClayMat(0xFFFDFB, { emissive: 0xFFE8F0, emissiveIntensity: 0.26, roughness: 0.65 });
  MAT.coin = MAT.gold;

  // 눈누 폰트 로드 완료 시 모든 상가 간판 및 빌딩 옥상/현관 명패 텍스처 즉시 재렌더링!
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
        entry.mat.needsUpdate = true;
      });

      Object.keys(state.buildings).forEach((lid) => refreshBuildingNameplates3D(lid));
    });
  }
}

// =========================================================
// 4. [요구사항 1 & 2] 입체 물결 어닝, 돌출 간판, A자 입간판, 세탁기/커피 마스코트, 옥상 현판 조립기
// =========================================================

// 입체 물결무늬 어닝(Scalloped Awning)
function createScallopedAwning3D(width, awningTex, scallopMat) {
  const g = new THREE.Group();
  const canopy = createRoundedToyMesh(width, 0.28, 1.22, makeClayMat(0xFFFFFF, { map: awningTex }), 0, 0, 0, 0.1);
  canopy.rotation.x = 0.26;
  g.add(canopy);

  // 앞단 동글동글 물결 레이스 프릴(Scallops)
  const count = Math.max(5, Math.floor(width / 0.66));
  const step = width / count;
  for (let i = 0; i < count; i++) {
    const sx = -width * 0.5 + step * (i + 0.5);
    const flap = new THREE.Mesh(GEO.sphere, i % 2 === 0 ? scallopMat : MAT.white);
    flap.scale.set(step * 0.92, 0.34, 0.22);
    flap.position.set(sx, -0.2, 0.58);
    flap.castShadow = true;
    addToonHullOutline(flap, 1.06);
    g.add(flap);
  }
  return g;
}

// 24H 양면 원형 네온 돌출 간판(Blade Sign)
function createBladeSign24H3D() {
  const g = new THREE.Group();
  // 벽면 브래킷 철제 암 2개
  g.add(createRoundedToyMesh(0.75, 0.1, 0.1, MAT.charcoal, 0.35, 0.24, 0, 0.03));
  g.add(createRoundedToyMesh(0.75, 0.1, 0.1, MAT.charcoal, 0.35, -0.24, 0, 0.03));

  // 은은하게 발광하는 원형 네온 테두리 드럼
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.18, 24), MAT.neonCoral);
  drum.rotation.x = Math.PI / 2;
  addToonEdgeOutline(drum, MAT.toonEdge, 30);
  g.add(drum);

  const faceMat = makeClayMat(0xFFFFFF, { map: TEX.blade24, emissive: 0xFF8FA3, emissiveIntensity: 0.35, roughness: 0.25 });
  signMaterialsToRefresh.push({ mat: faceMat, kind: 'blade24' });

  const frontFace = new THREE.Mesh(new THREE.CircleGeometry(0.56, 24), faceMat);
  frontFace.position.z = 0.1;
  const backFace = new THREE.Mesh(new THREE.CircleGeometry(0.56, 24), faceMat);
  backFace.rotation.y = Math.PI;
  backFace.position.z = -0.1;
  g.add(frontFace, backFace);

  return g;
}

// 매장 앞 A자 미니 입간판(A-Frame Menu Board)
function createAFrameStand3D() {
  const g = new THREE.Group();
  const boardA = createRoundedToyMesh(0.72, 0.88, 0.08, MAT.woodWarm, 0, 0.44, 0.12, 0.08);
  boardA.rotation.x = -0.22;
  const boardB = createRoundedToyMesh(0.72, 0.88, 0.08, MAT.woodWarm, 0, 0.44, -0.12, 0.08);
  boardB.rotation.x = 0.22;

  const menuMat = makeClayMat(0xFFFFFF, { map: TEX.aframeMenu, roughness: 0.4 });
  signMaterialsToRefresh.push({ mat: menuMat, kind: 'aframe' });
  const menuFace = new THREE.Mesh(GEO.quad, menuMat);
  menuFace.scale.set(0.58, 0.66, 1);
  menuFace.position.set(0, 0.46, 0.18);
  menuFace.rotation.x = -0.22;

  g.add(boardA, boardB, menuFace);
  return g;
}

// 코인세탁소 비누방울 입체 세탁기 마스코트 조형물
function createWasherMascot3D(lotX, localX, localY, localZ, lotZ) {
  const g = new THREE.Group();
  const body = createRoundedToyMesh(0.95, 1.08, 0.62, MAT.white, 0, 0, 0, 0.18);
  const topBar = createRoundedToyMesh(0.96, 0.24, 0.64, MAT.sky, 0, 0.44, 0, 0.1);
  const neonRing = new THREE.Mesh(GEO.torus, MAT.neonYellow);
  neonRing.scale.setScalar(0.82);
  neonRing.position.set(0, -0.06, 0.32);
  const glassDoor = new THREE.Mesh(GEO.sphere, MAT.screenCyan);
  glassDoor.scale.set(0.52, 0.52, 0.18);
  glassDoor.position.set(0, -0.06, 0.3);
  g.add(body, topBar, neonRing, glassDoor);
  g.rotation.z = -0.12;
  g.position.set(localX, localY, localZ);

  // 실시간 보글보글 비누방울 파티클 에미터 등록!
  facadeEmitters.push({
    kind: 'bubble',
    wx: lotX + localX,
    wy: localY + 0.65,
    wz: lotZ + localZ + 0.15,
    timer: 0.2
  });
  return g;
}

// 달콤 다방 김이 모락모락 나는 입체 커피잔 & 크루아상 조형물
function createCafeCupAndCroissant3D(lotX, localX, localY, localZ, lotZ) {
  const g = new THREE.Group();
  // 받침 접시
  const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.55, 0.12, 22), MAT.white);
  addToonEdgeOutline(saucer, MAT.toonEdge, 30);
  // 통통한 핑크·크림 커피잔 + 라떼 표면 + 손잡이
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.36, 0.66, 22), MAT.coral);
  cup.position.y = 0.36;
  addToonEdgeOutline(cup, MAT.toonEdge, 30);
  const latteTop = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.05, 20), MAT.woodWarm);
  latteTop.position.y = 0.68;
  const handle = new THREE.Mesh(GEO.torus, MAT.white);
  handle.scale.setScalar(0.55);
  handle.position.set(0.48, 0.38, 0);

  // 옆에 놓인 노릇노릇 입체 크루아상(초승달 베벨 3단 조형)
  const croissant = new THREE.Group();
  croissant.position.set(-0.72, 0.22, 0.22);
  croissant.rotation.z = 0.25;
  const cMid = new THREE.Mesh(GEO.sphere, MAT.butter);
  cMid.scale.set(0.52, 0.32, 0.34);
  addToonHullOutline(cMid, 1.07);
  const cL = new THREE.Mesh(GEO.sphere, MAT.woodLight);
  cL.scale.set(0.34, 0.24, 0.26);
  cL.position.set(-0.26, -0.06, 0.08);
  const cR = new THREE.Mesh(GEO.sphere, MAT.woodLight);
  cR.scale.set(0.34, 0.24, 0.26);
  cR.position.set(0.26, -0.06, 0.08);
  croissant.add(cMid, cL, cR);

  g.add(saucer, cup, latteTop, handle, croissant);
  g.position.set(localX, localY, localZ);

  // 모락모락 커피 김 파티클 에미터 등록!
  facadeEmitters.push({
    kind: 'steam',
    wx: lotX + localX,
    wy: localY + 0.82,
    wz: lotZ + localZ,
    timer: 0.35
  });
  return g;
}

// [요구사항 2-1] 옥상 전면 아치형 입체 스카이 사인 조립
function createRooftopSkySign3D(buildingTitle, lotId) {
  const g = new THREE.Group();
  g.userData.origScale = new THREE.Vector3(1, 1, 1);

  // 좌·우 골드 받침 기둥
  g.add(createRoundedToyMesh(0.36, 0.75, 0.36, MAT.gold, -3.1, 0.32, 0, 0.09));
  g.add(createRoundedToyMesh(0.36, 0.75, 0.36, MAT.gold, 3.1, 0.32, 0, 0.09));

  // 코랄·골드 아치형 메인 프레임 보드
  const backFrame = createRoundedToyMesh(7.6, 1.68, 0.34, MAT.coral, 0, 1.05, 0, 0.32);
  const goldRim = createRoundedToyMesh(7.25, 1.42, 0.38, MAT.gold, 0, 1.05, 0.02, 0.28);

  // 상단 왕관 피니얼 장식
  const crownOrb = new THREE.Mesh(GEO.sphere, MAT.neonYellow);
  crownOrb.scale.setScalar(0.38);
  crownOrb.position.set(0, 2.02, 0.05);
  addToonHullOutline(crownOrb, 1.08);

  const skyMat = makeClayMat(0xFFFFFF, {
    map: createBuildingSkySignTexture(buildingTitle),
    emissive: 0xFEF08A,
    emissiveIntensity: 0.2,
    roughness: 0.3
  });
  const signFace = new THREE.Mesh(GEO.quad, skyMat);
  signFace.scale.set(6.85, 1.24, 1);
  signFace.position.set(0, 1.05, 0.23);

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

// =========================================================
// 5. 바닥 점선 포커스 패드 & 호버/선택 포커스 링 초기화
// =========================================================
function createInteractiveBaseRing(w, d, y = 0.04, isMint = true) {
  const g = new THREE.Group();
  const dashMat = isMint ? MAT.dashBorderMint : MAT.dashBorderGold;
  const barThick = 0.22;

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
  const hFront = createRoundedToyMesh(1, 0.14, barT, hoverRingMat, 0, 0, 0.5, 0.04, false, false, false);
  const hBack = createRoundedToyMesh(1, 0.14, barT, hoverRingMat, 0, 0, -0.5, 0.04, false, false, false);
  const hLeft = createRoundedToyMesh(barT, 0.14, 1, hoverRingMat, -0.5, 0, 0, 0.04, false, false, false);
  const hRight = createRoundedToyMesh(barT, 0.14, 1, hoverRingMat, 0.5, 0, 0, 0.04, false, false, false);
  [hFront, hBack, hLeft, hRight].forEach((m) => { m.raycast = () => {}; });
  hoverFocusGroup.userData.bars = { hFront, hBack, hLeft, hRight };
  hoverFocusGroup.add(hFront, hBack, hLeft, hRight);
  scene.add(hoverFocusGroup);

  selectedRoomFrameGroup = new THREE.Group();
  selectedRoomFrameGroup.visible = false;
  const selMat = new THREE.MeshBasicMaterial({ color: 0xFFD166 });
  const selMintMat = new THREE.MeshBasicMaterial({ color: 0x34D399 });

  const RW = GAME_BALANCE.roomWidth;
  const RD = GAME_BALANCE.roomDepth;
  const RH = GAME_BALANCE.wallHeight;

  selectedRoomFrameGroup.add(
    createRoundedToyMesh(RW + 0.14, 0.14, 0.14, selMat, 0, 0.1, RD / 2 + 0.02, 0.04, false, false, false),
    createRoundedToyMesh(RW + 0.14, 0.14, 0.14, selMat, 0, 0.1, -RD / 2 - 0.02, 0.04, false, false, false),
    createRoundedToyMesh(0.14, 0.14, RD + 0.14, selMat, -RW / 2 - 0.02, 0.1, 0, 0.04, false, false, false),
    createRoundedToyMesh(0.14, 0.14, RD + 0.14, selMat, RW / 2 + 0.02, 0.1, 0, 0.04, false, false, false),
    createRoundedToyMesh(RW + 0.14, 0.1, 0.1, selMintMat, 0, RH + 0.06, RD / 2 + 0.02, 0.03, false, false, false),
    createRoundedToyMesh(RW + 0.14, 0.1, 0.1, selMintMat, 0, RH + 0.06, -RD / 2 - 0.02, 0.03, false, false, false),
    createRoundedToyMesh(0.1, 0.1, RD + 0.14, selMintMat, -RW / 2 - 0.02, RH + 0.06, 0, 0.03, false, false, false),
    createRoundedToyMesh(0.1, 0.1, RD + 0.14, selMintMat, RW / 2 + 0.02, RH + 0.06, 0, 0.03, false, false, false)
  );

  for (const cx of [-RW / 2, RW / 2]) {
    for (const cz of [-RD / 2, RD / 2]) {
      const beacon = createRoundedToyMesh(0.28, 0.28, 0.28, selMat, cx, RH + 0.22, cz, 0.06, false, false, true);
      beacon.rotation.x = Math.PI / 4;
      beacon.rotation.z = Math.PI / 4;
      selectedRoomFrameGroup.add(beacon);
      selectedRoomBeacons.push(beacon);
    }
  }
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

// =========================================================
// 6. 아일랜드 배경 및 힐링 디테일 조립
// =========================================================
function buildCozyFloatingIsland() {
  const island = new THREE.Group();

  const meadowTop = new THREE.Mesh(
    new THREE.CylinderGeometry(33.5, 32.2, 1.35, 52),
    makeClayMat(0xFFFFFF, { map: TEX.meadow, roughness: 0.76 })
  );
  meadowTop.position.y = -0.67;
  meadowTop.receiveShadow = true;
  island.add(meadowTop);

  const cliffMid = new THREE.Mesh(new THREE.CylinderGeometry(31.8, 25.5, 3.8, 40), makeClayMat(0xEAB68E, { roughness: 0.8 }));
  cliffMid.position.y = -3.15;
  island.add(cliffMid);

  const cliffBot = new THREE.Mesh(new THREE.CylinderGeometry(25.2, 13.5, 4.8, 32), makeClayMat(0xD2946C, { roughness: 0.84 }));
  cliffBot.position.y = -7.25;
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
    { x: 4.5, z: -26, w: 4.5, d: 10.6, rot: 0.12 },
    { x: 5.2, z: -16, w: 4.6, d: 11.2, rot: -0.08 },
    { x: 5.0, z: -5.5, w: 4.7, d: 11.5, rot: 0.06 },
    { x: 4.6, z: 5.2, w: 4.7, d: 11.5, rot: 0.1 },
    { x: 4.0, z: 16.0, w: 4.9, d: 12.2, rot: -0.08 },
    { x: 3.4, z: 25.5, w: 5.1, d: 10.0, rot: 0.0 }
  ].forEach((seg) => {
    const wMesh = createRoundedToyMesh(seg.w, 0.18, seg.d, waterMat, seg.x, 0.06, seg.z, 0.12, false, true, false);
    wMesh.rotation.y = seg.rot;
    island.add(wMesh);

    for (const s of [-1, 1]) {
      const pebble = new THREE.Mesh(GEO.sphere, MAT.cream);
      pebble.scale.set(0.56, 0.28, 0.44);
      pebble.position.set(seg.x + s * (seg.w * 0.54), 0.11, seg.z + s * 1.6);
      pebble.receiveShadow = true;
      island.add(pebble);
    }
  });

  const cobbleMat = makeClayMat(0xFFFFFF, { map: TEX.cobble, roughness: 0.74 });
  island.add(createRoundedToyMesh(38, 0.12, 3.7, cobbleMat, -1.0, 0.05, 3.0, 0.14, false, true, false));
  island.add(createRoundedToyMesh(3.3, 0.12, 21, cobbleMat, -13.5, 0.05, 1.5, 0.14, false, true, false));
  island.add(createRoundedToyMesh(3.3, 0.12, 21, cobbleMat, 13.5, 0.05, 2.2, 0.14, false, true, false));

  const bridge = new THREE.Group();
  bridge.position.set(4.8, 0.12, 3.0);
  for (let i = -4; i <= 4; i++) {
    const t = i / 4;
    const archY = Math.cos(t * Math.PI * 0.5) * 0.68;
    bridge.add(createRoundedToyMesh(0.74, 0.18, 3.85, MAT.woodLight, i * 0.78, archY, 0, 0.08, true, true, false));
  }
  for (const side of [-1.75, 1.75]) {
    for (const px of [-2.8, 0, 2.8]) {
      bridge.add(createRoundedToyMesh(0.22, 1.15, 0.22, MAT.woodDark, px, 0.75, side, 0.08, true, true, false));
      if (px === 0) {
        const lantern = new THREE.Mesh(GEO.sphere, MAT.gold);
        lantern.scale.setScalar(0.34);
        lantern.position.set(px, 1.44, side);
        bridge.add(lantern);
      }
    }
    bridge.add(createRoundedToyMesh(6.4, 0.16, 0.16, MAT.woodWarm, 0, 1.2, side, 0.06, true, true, false));
  }
  island.add(bridge);

  [
    [-25, -13, true], [-23, 9, false], [-8, -19, true], [-2, 18, false],
    [22, -13, true], [23, 9, true], [16, 20, false], [-21, 19, true],
    [10, -21, false], [-15, -16, false], [21, -2, false]
  ].forEach(([tx, tz, isSakura], idx) => {
    const tree = createFluffyPastelTree(isSakura, 0.94 + (idx % 3) * 0.16);
    tree.position.set(tx, 0.05, tz);
    island.add(tree);
  });

  [[-9.8, 6.2], [0.2, 6.5], [9.5, 6.1], [-11.5, -9.2], [8.8, -9.8], [-3.2, -11.5]].forEach(([fx, fz]) => {
    const patch = createCloverAndDaisyCluster(5);
    patch.position.set(fx, 0.06, fz);
    island.add(patch);
  });

  const bench = createParkBench3D();
  bench.position.set(0.8, 0.08, 6.2);
  bench.rotation.y = -0.35;
  island.add(bench);

  const postbox = createRedPostbox3D();
  postbox.position.set(-10.8, 0.08, 4.95);
  island.add(postbox);

  const streetVending = createPastelVendingMachine3D();
  streetVending.position.set(-2.35, 0.08, 5.15);
  streetVending.rotation.y = 0.22;
  island.add(streetVending);

  const catBasket = createSleepingCatBasket3D();
  catBasket.position.set(-0.65, 0.08, 5.55);
  island.add(catBasket);

  const toyCar = createRoundedToyCar3D();
  toyCar.position.set(-12.0, 0.1, 2.55);
  scene.add(toyCar);
  streetInteractiveProps.push({ kind: 'car', mesh: toyCar, dir: 1, speed: 3.1 });

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

  cushion.userData = { isStreetProp: true, propRoot: g, label: '고양이가 따스한 햇살 아래 골골송을 불러요~' };
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
    { x: -24, y: 15.2, z: -18, s: 1.25, speed: 0.65 },
    { x: 18, y: 16.4, z: -20, s: 1.4, speed: 0.52 },
    { x: -20, y: 14.8, z: 16, s: 1.15, speed: 0.72 },
    { x: 22, y: 15.8, z: 15, s: 1.3, speed: 0.58 }
  ].forEach((cfg, idx) => {
    const cg = new THREE.Group();
    [[0, 0, 0, 2.2, 1.35, 1.6], [-1.15, -0.15, 0.15, 1.65, 1.1, 1.35], [1.2, -0.1, -0.1, 1.7, 1.15, 1.4], [0.25, 0.45, 0.1, 1.45, 1.05, 1.25]].forEach(([px, py, pz, sx, sy, sz]) => {
      const m = new THREE.Mesh(GEO.sphere, MAT.cloudWhite);
      m.position.set(px, py, pz);
      m.scale.set(sx, sy, sz);
      m.castShadow = true;
      cg.add(m);
    });
    cg.scale.setScalar(cfg.s);
    cg.position.set(cfg.x, cfg.y, cfg.z);
    scene.add(cg);
    cloudActors.push({ mesh: cg, baseX: cfg.x, baseY: cfg.y, baseZ: cfg.z, speed: cfg.speed, phase: idx * 1.7 });
  });
}

function spawnButterfliesAndBirds() {
  const wingMats = [MAT.pinkSoft, MAT.butter, MAT.sky, MAT.mintSoft];
  [
    [-9.8, 6.2, 'butterfly'],
    [0.2, 6.5, 'butterfly'],
    [9.5, 6.1, 'butterfly'],
    [-14.2, 10.6, 'butterfly'],
    [13.8, -4.5, 'bird'],
    [-6.0, -10.5, 'bird'],
    [4.8, 3.2, 'bird']
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
    scene.add(g);
    skyCritters.push({
      mesh: g,
      kind,
      cx,
      cz,
      baseY: kind === 'bird' ? 4.4 + (i % 2) * 1.4 : 1.15 + (i % 3) * 0.35,
      radius: kind === 'bird' ? 3.8 : 1.65,
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
  tube.castShadow = true;
  addToonHullOutline(tube, 1.07);

  const duckBody = new THREE.Mesh(GEO.sphere, MAT.duckYellow);
  duckBody.scale.set(0.58, 0.44, 0.68);
  duckBody.position.y = 0.22;
  duckBody.castShadow = true;
  addToonHullOutline(duckBody, 1.07);

  const duckHead = new THREE.Mesh(GEO.sphere, MAT.duckYellow);
  duckHead.scale.setScalar(0.42);
  duckHead.position.set(0, 0.5, 0.2);
  duckHead.castShadow = true;
  addToonHullOutline(duckHead, 1.07);

  const bill = new THREE.Mesh(GEO.sphere, MAT.orangeBill);
  bill.scale.set(0.22, 0.1, 0.24);
  bill.position.set(0, 0.47, 0.42);

  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(GEO.sphere, MAT.charcoal);
    eye.scale.setScalar(0.065);
    eye.position.set(sx * 0.13, 0.54, 0.36);
    duckGroup.add(eye);
  }
  duckGroup.add(tube, duckBody, duckHead, bill);
  duckBody.userData = { isStreetProp: true, propRoot: duckGroup, label: '꽥꽥! 노란 오리 튜브가 시냇물을 타고 둥실둥실~' };
  registerPick(duckBody);
  scene.add(duckGroup);
  streamFloats.push({ mesh: duckGroup, zPos: -14.0, speed: 1.55, rippleTimer: 0.4, phase: 0 });

  const boatGroup = new THREE.Group();
  const hull = createRoundedToyMesh(0.56, 0.22, 1.05, MAT.white, 0, 0.14, 0, 0.1);
  const sail = new THREE.Mesh(getPuffyDomeGeo(0.28, 0.52), MAT.pinkSoft);
  sail.scale.set(0.45, 1.0, 1.1);
  sail.position.set(0, 0.42, 0);
  sail.castShadow = true;
  addToonHullOutline(sail, 1.06);
  boatGroup.add(hull, sail);
  scene.add(boatGroup);
  streamFloats.push({ mesh: boatGroup, zPos: 6.5, speed: 1.35, rippleTimer: 0.6, phase: 2.1 });
}

function getStreamXAtZ(z) {
  return 4.5 + Math.sin((z + 15) * 0.09) * 0.65;
}

function spawnWaterRipple(wx, wz) {
  const r = new THREE.Mesh(
    GEO.ring,
    new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.72, side: THREE.DoubleSide })
  );
  r.rotation.x = -Math.PI / 2;
  r.scale.setScalar(0.45);
  r.position.set(wx, 0.17, wz);
  r.raycast = () => {};
  scene.add(r);
  waterRipples.push({ mesh: r, life: 1.2, maxLife: 1.2 });
}

function spawnAmbientPetalsAndBokeh() {
  const petalMat = new THREE.MeshBasicMaterial({ color: 0xFFB7CE, transparent: true, opacity: 0.82, side: THREE.DoubleSide });
  const bokehMat = new THREE.MeshBasicMaterial({ color: 0xFFF7C2, transparent: true, opacity: 0.7 });

  for (let i = 0; i < 30; i++) {
    const isPetal = i < 18;
    const m = new THREE.Mesh(GEO.sphere, isPetal ? petalMat : bokehMat);
    if (isPetal) m.scale.set(0.17, 0.04, 0.11);
    else m.scale.setScalar(0.1 + (i % 3) * 0.04);
    m.position.set((Math.random() - 0.5) * 52, 1.5 + Math.random() * 12, (Math.random() - 0.5) * 46);
    m.raycast = () => {};
    scene.add(m);
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
// 7. 2등신 치비 캐릭터 + 카툰 윤곽선 + 탄성 머리 장식
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
  const s = isKid ? 0.68 : 1.0;

  const outfitPalette = {
    student: 0x68B5FF,
    newlywed_m: 0x4FC3F7,
    newlywed_f: 0xFF758F,
    family_m: 0x34D399,
    family_f: 0xFDE068,
    kid: 0xFF9F68,
    elderly_m: 0xB8B0A8,
    elderly_f: 0xFFC085,
    hikikomori: 0x6D28D9,
    manager: 0x2563EB
  };
  const clothMat = makeClayMat(outfitPalette[style] || 0x68B5FF);
  const skinMat = makeClayMat(style === 'hikikomori' ? 0xF6EEFF : 0xFFE5D6, { roughness: 0.48 });

  const sh = new THREE.Mesh(GEO.quad, MAT.shadow);
  sh.rotation.x = -Math.PI / 2;
  sh.scale.set(0.86, 0.86, 1);
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
  addToonHullOutline(torso, 1.075);
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
  addToonHullOutline(head, 1.065);
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
    addToonHullOutline(hood, 1.06);
    headGroup.add(hood);
    topperPivot.position.y = 0.36;
    topperPivot.add(createSproutTopper3D());
  } else if (style === 'manager') {
    const capCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.33, 0.2, 18), clothMat);
    capCrown.position.y = 0.27;
    addToonHullOutline(capCrown, 1.07);
    const visor = createRoundedToyMesh(0.46, 0.07, 0.26, MAT.charcoal, 0, 0.2, 0.24, 0.03);
    const goldBadge = new THREE.Mesh(GEO.sphere, MAT.gold);
    goldBadge.scale.setScalar(0.095);
    goldBadge.position.set(0, 0.28, 0.33);
    const tie = createRoundedToyMesh(0.09, 0.24, 0.06, MAT.coral, 0, 0.45, 0.25, 0.02, true, true, false);
    headGroup.add(capCrown, visor, goldBadge);
    bodyRoot.add(tie);
  } else if (style === 'elderly_m' || style === 'elderly_f') {
    const silverHair = makeClayMat(0xECEFF1);
    const hair = new THREE.Mesh(GEO.sphere, silverHair);
    hair.scale.set(0.69, 0.52, 0.68);
    hair.position.set(0, 0.11, -0.03);
    addToonHullOutline(hair, 1.06);
    headGroup.add(hair);

    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.54, 0.06, 22), MAT.butter);
    addToonHullOutline(brim, 1.05);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.2, 18), MAT.butter);
    crown.position.y = 0.11;
    const ribbonBand = new THREE.Mesh(new THREE.CylinderGeometry(0.345, 0.35, 0.055, 18), MAT.coral);
    ribbonBand.position.y = 0.05;
    topperPivot.position.y = 0.24;
    topperPivot.add(brim, crown, ribbonBand);
  } else {
    const hairMat = makeClayMat(style.endsWith('_f') ? 0x7A4424 : 0x3A2E2B);
    const hair = new THREE.Mesh(GEO.sphere, hairMat);
    hair.scale.set(0.7, 0.55, 0.69);
    hair.position.set(0, 0.11, -0.03);
    addToonHullOutline(hair, 1.06);
    headGroup.add(hair);

    if (style === 'student') {
      const band = createRoundedToyMesh(0.7, 0.08, 0.12, MAT.coral, 0, 0.26, 0, 0.03);
      const earCupL = createRoundedToyMesh(0.11, 0.22, 0.18, MAT.coral, -0.34, 0.02, 0.02, 0.05, true, true, false);
      const earCupR = createRoundedToyMesh(0.11, 0.22, 0.18, MAT.coral, 0.34, 0.02, 0.02, 0.05, true, true, false);
      const catEarL = new THREE.Mesh(getPuffyDomeGeo(0.09, 0.18), MAT.coral);
      catEarL.position.set(-0.22, 0.34, 0);
      catEarL.rotation.z = 0.28;
      const catEarR = new THREE.Mesh(getPuffyDomeGeo(0.09, 0.18), MAT.coral);
      catEarR.position.set(0.22, 0.34, 0);
      catEarR.rotation.z = -0.28;
      headGroup.add(band, earCupL, earCupR, catEarL, catEarR);
      topperPivot.add(createSproutTopper3D());
    } else if (style === 'newlywed_f') {
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

function createCutePet3D(kind = 'shiba') {
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
    const glint = new THREE.Mesh(GEO.sphere, MAT.white);
    glint.scale.setScalar(0.026);
    glint.position.set(sx * 0.1 + 0.015, 0.485, 0.44);
    g.add(eye, glint);

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
  g.userData.tail = tail;
  g.userData.origScale = new THREE.Vector3(1, 1, 1);

  body.userData = { isStreetProp: true, propRoot: g, label: '멍멍! 꼬리를 살랑살랑 흔들며 반겨줘요!' };
  registerPick(body);
  return g;
}

function spawnIslandPets3D() {
  [
    { kind: 'shiba', x: -1.5, z: 3.6 },
    { kind: 'bichon', x: 8.8, z: 3.4 },
    { kind: 'cat', x: -7.6, z: 3.1 }
  ].forEach((cfg) => {
    const mesh = createCutePet3D(cfg.kind);
    mesh.position.set(cfg.x, 0.08, cfg.z);
    scene.add(mesh);
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
}

// =========================================================
// 8. 전체 부지(빈터 + 비주거 + 주상복합 1층 상가·옥상 현판·정문 명패) 빌드
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
      padW: 10,
      padD: 8,
      emptyGroup: null,
      signpostPivot: null,
      shellMaterials: [],
      shellLineMat: null,
      roofCapGroup: null,
      skySignGroup: null,
      skySignMat: null,
      brassPlateMat: null,
      upperSlab: null,
      interiorGroup: null,
      indoorLights: [],
      infraGroup: null,
      managerGroup: null,
      elevatorCar: null,
      cropMeshes: [],
      roomGroups: {}
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
  // 해당 필지의 기존 파사드 파티클 에미터 정리
  for (let i = facadeEmitters.length - 1; i >= 0; i--) {
    if (facadeEmitters[i].lotId === lotId) facadeEmitters.splice(i, 1);
  }

  reg.shellMaterials = [];
  reg.shellLineMat = null;
  reg.indoorLights = [];
  reg.cropMeshes = [];
  reg.roomGroups = {};
  reg.elevatorCar = null;
  reg.upperSlab = null;
  reg.signpostPivot = null;
  reg.skySignGroup = null;
  reg.skySignMat = null;
  reg.brassPlateMat = null;

  if (!lot.owned) {
    reg.padW = 9.8;
    reg.padD = 7.8;
    const eg = buildEmptyForSaleLot3D(lot, reg);
    reg.emptyGroup = eg;
    reg.root.add(eg);
    return;
  }

  const cat = DEVELOPMENT_CATALOG[lot.devType];
  if (cat && cat.isResidential) {
    reg.padW = 20.4;
    reg.padD = 9.2;
    buildResidentialComplex3D(lot, reg);
  } else {
    reg.padW = 11.4;
    reg.padD = 9.2;
    buildIslandSpecialtyDev3D(lot, reg);
  }
}

function buildEmptyForSaleLot3D(lot, reg) {
  const g = new THREE.Group();

  const outerPlate = createRoundedToyMesh(9.8, 0.16, 7.8, MAT.basePadMint, 0, 0.08, 0, 0.36, false, true, true);
  outerPlate.userData = { lotId: lot.lotId, isEmptyLot: true };
  registerPick(outerPlate);
  g.add(outerPlate);

  const innerGrass = createRoundedToyMesh(8.9, 0.22, 6.9, makeClayMat(0xD2FBD8, { roughness: 0.7 }), 0, 0.13, 0, 0.3, false, true, true);
  innerGrass.userData = { lotId: lot.lotId, isEmptyLot: true };
  registerPick(innerGrass);
  g.add(innerGrass);

  g.add(createInteractiveBaseRing(10.1, 8.1, 0.05, true));

  const picketGeo = getPicketPostGeo();
  for (let x = -4.0; x <= 4.0; x += 0.8) {
    for (const z of [-3.2, 3.2]) {
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
  g.add(createRoundedToyMesh(8.1, 0.09, 0.09, MAT.white, 0, 0.54, -3.2, 0.03, true, true, false));
  g.add(createRoundedToyMesh(2.9, 0.09, 0.09, MAT.white, -2.55, 0.54, 3.2, 0.03, true, true, false));
  g.add(createRoundedToyMesh(2.9, 0.09, 0.09, MAT.white, 2.55, 0.54, 3.2, 0.03, true, true, false));
  g.add(createRoundedToyMesh(0.09, 0.09, 6.4, MAT.white, -4.0, 0.54, 0, 0.03, true, true, false));
  g.add(createRoundedToyMesh(0.09, 0.09, 6.4, MAT.white, 4.0, 0.54, 0, 0.03, true, true, false));

  const daisyMats = [MAT.white, MAT.pinkSoft, MAT.butter];
  [
    [-2.7, -1.9, 'daisy', 0], [-1.9, 1.8, 'clover', 1], [2.6, -1.8, 'daisy', 1],
    [2.3, 1.9, 'clover', 0], [-2.9, 0.5, 'daisy', 2], [2.9, 0.4, 'daisy', 0]
  ].forEach(([fx, fz, kind, mIdx]) => {
    const fl = kind === 'clover' ? createFourLeafClover3D(1.15) : createDaisyFlower3D(daisyMats[mIdx], 1.15);
    fl.position.set(fx, 0.24, fz);
    g.add(fl);
  });

  const signpostPivot = new THREE.Group();
  signpostPivot.position.set(0, 0.24, 0);
  signpostPivot.userData.origScale = new THREE.Vector3(1, 1, 1);

  const post = createRoundedToyMesh(0.28, 1.68, 0.28, MAT.woodWarm, 0, 0.84, 0, 0.1);
  const postCap = new THREE.Mesh(GEO.sphere, MAT.butter);
  postCap.scale.setScalar(0.28);
  postCap.position.set(0, 1.74, 0);
  addToonHullOutline(postCap, 1.08);

  const boardBack = createRoundedToyMesh(2.08, 1.2, 0.24, MAT.woodLight, 0, 1.26, 0.14, 0.18);
  boardBack.rotation.z = -0.05;
  const emblemFace = new THREE.Mesh(GEO.quad, makeClayMat(0xFFFFFF, { map: TEX.signEmblem, roughness: 0.45 }));
  emblemFace.scale.set(1.78, 0.98, 1);
  emblemFace.position.set(0, 1.26, 0.27);
  emblemFace.rotation.z = -0.05;

  const hammerGroup = new THREE.Group();
  hammerGroup.position.set(0.86, 0.45, 0.35);
  hammerGroup.rotation.z = 0.36;
  const hHandle = createRoundedToyMesh(0.14, 0.82, 0.14, MAT.woodLight, 0, 0, 0, 0.05);
  const hHead = createRoundedToyMesh(0.56, 0.32, 0.32, MAT.coral, 0, 0.38, 0, 0.11);
  hammerGroup.add(hHandle, hHead);

  const signSprout = createSproutTopper3D();
  signSprout.position.set(-0.72, 1.82, 0.14);

  [post, boardBack, emblemFace, hHead].forEach((m) => {
    m.userData = { lotId: lot.lotId, isEmptyLot: true };
    registerPick(m);
  });

  signpostPivot.add(post, postCap, boardBack, emblemFace, hammerGroup, signSprout);
  g.add(signpostPivot);
  reg.signpostPivot = signpostPivot;

  return g;
}

function buildIslandSpecialtyDev3D(lot, reg) {
  const g = new THREE.Group();
  const base = createRoundedToyMesh(10.8, 0.3, 8.6, MAT.basePadCream, 0, 0.15, 0, 0.28, true, true, true);
  base.userData = { lotId: lot.lotId };
  registerPick(base);
  g.add(base);
  g.add(createInteractiveBaseRing(11.3, 9.1, 0.05, false));

  if (lot.devType === 'solar_plant') {
    const panelMat = makeClayMat(0x2563EB, { metalness: 0.25, roughness: 0.26, coolShadow: true });
    for (const rz of [-2.0, 1.7]) {
      for (const rx of [-3.1, 0, 3.1]) {
        const stand = createRoundedToyMesh(0.24, 1.05, 0.24, MAT.silver, rx, 0.65, rz, 0.08);
        const frame = createRoundedToyMesh(2.5, 0.14, 1.85, MAT.white, rx, 1.24, rz, 0.08);
        frame.rotation.x = 0.44;
        const cell = createRoundedToyMesh(2.28, 0.16, 1.65, panelMat, rx, 1.27, rz, 0.06);
        cell.rotation.x = 0.44;
        g.add(stand, frame, cell);
      }
    }
    g.add(createRoundedToyMesh(2.2, 1.5, 1.4, MAT.mintSoft, -3.8, 0.95, 3.1, 0.18));
    const bBunch = createBalloonBunch3D(0.88);
    bBunch.position.set(4.2, 0.3, 3.2);
    g.add(bBunch);
  } else if (lot.devType === 'urban_farm') {
    const soilMat = makeClayMat(0x8C583A, { roughness: 0.85 });
    for (const rx of [-2.4, 2.4]) {
      g.add(createRoundedToyMesh(3.8, 0.36, 6.2, MAT.woodWarm, rx, 0.34, -0.2, 0.14));
      g.add(createRoundedToyMesh(3.45, 0.4, 5.85, soilMat, rx, 0.38, -0.2, 0.12));
      for (let cz = -2.2; cz <= 2.0; cz += 1.4) {
        for (const cx of [rx - 0.85, rx + 0.85]) {
          const sprout = new THREE.Mesh(GEO.sphere, MAT.leafGreen);
          sprout.scale.set(0.44, 0.3, 0.44);
          sprout.position.set(cx, 0.65, cz);
          sprout.castShadow = true;
          const berry = new THREE.Mesh(GEO.sphere, MAT.coral);
          berry.scale.setScalar(0.24);
          berry.position.set(cx + 0.08, 0.82, cz);
          berry.castShadow = true;
          g.add(sprout, berry);
          reg.cropMeshes.push({ sprout, berry });
        }
      }
    }
    const barn = createRoundedToyMesh(2.35, 1.72, 1.95, MAT.cream, 0, 1.05, -2.8, 0.18);
    const roof = new THREE.Mesh(getPuffyDomeGeo(1.55, 1.25), MAT.coral);
    roof.position.set(0, 2.42, -2.8);
    roof.castShadow = true;
    addToonHullOutline(roof, 1.05);
    g.add(barn, roof);
  } else if (lot.devType === 'sakura_park') {
    g.add(createRoundedToyMesh(10.0, 0.16, 7.8, makeClayMat(0xB9F8CF), 0, 0.3, 0, 0.22));
    [[-3.1, -2.0], [3.1, -2.0], [-2.7, 2.1], [2.9, 2.1]].forEach(([tx, tz]) => {
      const tr = createFluffyPastelTree(true, 1.14);
      tr.position.set(tx, 0.3, tz);
      g.add(tr);
    });
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.9, 0.52, 26), MAT.white);
    basin.position.set(0, 0.55, 0);
    basin.castShadow = true;
    addToonEdgeOutline(basin, MAT.toonEdge, 28);
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.56, 26), MAT.sky);
    pool.position.set(0, 0.57, 0);
    g.add(basin, pool);
  } else if (lot.devType === 'bakery_cafe') {
    // [요구사항 1-3] 달콤 다방(SWEET CAFE): 브라운·크림 물결 어닝 + 김이 모락모락 나는 커피잔·크루아상 입체 간판 조형물!
    const body = createRoundedToyMesh(7.4, 3.25, 5.2, makeClayMat(0xFFFFFF, { map: TEX.brickWarm }), 0, 1.88, -0.5, 0.22);
    const roof = createRoundedToyMesh(7.8, 0.5, 5.6, MAT.woodDark, 0, 3.68, -0.5, 0.2);

    const signFrame = createRoundedToyMesh(5.6, 1.38, 0.28, MAT.woodDark, 0, 2.95, 2.15, 0.18);
    const cafeSignMat = makeClayMat(0xFFFFFF, { map: TEX.cafeSign, roughness: 0.34 });
    signMaterialsToRefresh.push({ mat: cafeSignMat, kind: 'cafe' });
    const signFace = new THREE.Mesh(GEO.quad, cafeSignMat);
    signFace.scale.set(5.2, 1.18, 1);
    signFace.position.set(0, 2.95, 2.31);
    signFrame.userData = { lotId: lot.lotId, isShopSign: true, shopLabel: '달콤 다방(SWEET CAFE): 갓 구운 크루아상과 라떼 매출 순항 중!' };
    registerPick(signFrame);

    const cafeAwning = createScallopedAwning3D(6.8, TEX.awningBrown, MAT.cream);
    cafeAwning.position.set(0, 2.02, 2.68);

    const cupSculpt = createCafeCupAndCroissant3D(lot.x, 0, 3.92, 1.65, lot.z);
    facadeEmitters[facadeEmitters.length - 1].lotId = lot.lotId;

    const garland = createGarland3D(6.2, 9);
    garland.position.set(0, 1.75, 3.3);
    g.add(body, roof, signFrame, signFace, cafeAwning, cupSculpt, garland);

    for (const tx of [-2.3, 2.3]) {
      const tbl = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.12, 20), MAT.white);
      tbl.position.set(tx, 0.85, 3.25);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 10), MAT.woodDark);
      pole.position.set(tx, 1.2, 3.25);
      const umbrella = new THREE.Mesh(getPuffyDomeGeo(1.05, 0.65), MAT.woodWarm);
      umbrella.position.set(tx, 2.18, 3.25);
      umbrella.castShadow = true;
      addToonHullOutline(umbrella, 1.05);
      g.add(tbl, pole, umbrella);
    }
  }

  reg.root.add(g);
}

// =========================================================
// 9. 주상복합 빌딩 조립 (해피마트/달콤다방 & 뽀송워시 입체 간판 + 옥상 스카이 사인 + 정문 황동 명패)
// =========================================================
function buildResidentialComplex3D(lot, reg) {
  const b = state.buildings[lot.lotId];
  const W = 17.6;
  const D = 5.6;
  const isSecondComplex = lot.devType === 'mixed_2';

  const baseDeck = createRoundedToyMesh(W + 2.2, 0.46, D + 3.0, MAT.basePadCream, 0, 0.23, 0.35, 0.26, true, true, true);
  baseDeck.userData = { lotId: lot.lotId };
  registerPick(baseDeck);
  reg.root.add(baseDeck);
  reg.root.add(createInteractiveBaseRing(W + 2.75, D + 3.55, 0.05, false));

  const gfGroup = new THREE.Group();
  gfGroup.add(createRoundedToyMesh(W, 2.55, 0.26, MAT.cream, 0, 1.7, -D / 2 + 0.13, 0.08));

  // ---------------- 좌측 1층 상가: 해피마트(1차) 또는 달콤 다방(신축 2차) ----------------
  gfGroup.add(createRoundedToyMesh(6.6, 0.09, D - 0.4, MAT.white, -5.2, 0.47, 0.2, 0.04));
  gfGroup.add(createRoundedToyMesh(1.8, 0.84, 0.74, isSecondComplex ? MAT.woodWarm : MAT.coral, -7.2, 0.86, 1.2, 0.14));
  for (const sx of [-5.2, -3.5]) {
    gfGroup.add(createRoundedToyMesh(1.25, 1.35, 0.5, MAT.mintSoft, sx, 1.12, -0.4, 0.1));
    gfGroup.add(createRoundedToyMesh(1.1, 0.24, 0.4, MAT.butter, sx, 1.9, -0.4, 0.08));
  }
  gfGroup.add(createRoundedToyMesh(1.9, 1.85, 0.48, MAT.sky, -4.4, 1.36, -2.1, 0.12));

  if (!isSecondComplex) {
    // [요구사항 1-1] 해피마트(MINI MART 24) 입체 스트라이프 박스 간판 + 양면 24H 원형 돌출 간판 + 물결 어닝 + A자 입간판!
    const martBox = createRoundedToyMesh(6.25, 1.28, 0.28, MAT.white, -5.2, 2.58, D / 2 + 0.28, 0.18);
    martBox.userData = { lotId: lot.lotId, isShopSign: true, shopLabel: '해피마트 24: 삼각김밥·도시락 24시간 성업 중! (+고정 상가수익)' };
    registerPick(martBox);

    const martSignMat = makeClayMat(0xFFFFFF, { map: TEX.martSign, roughness: 0.3 });
    signMaterialsToRefresh.push({ mat: martSignMat, kind: 'mart' });
    const martFace = new THREE.Mesh(GEO.quad, martSignMat);
    martFace.scale.set(5.96, 1.12, 1);
    martFace.position.set(-5.2, 2.58, D / 2 + 0.44);

    const bladeSign = createBladeSign24H3D();
    bladeSign.position.set(-9.15, 2.48, D / 2 - 0.15);
    bladeSign.userData = { origScale: new THREE.Vector3(1, 1, 1) };

    const martAwning = createScallopedAwning3D(6.3, TEX.awningCoral, MAT.coral);
    martAwning.position.set(-5.2, 1.92, D / 2 + 0.72);

    const aframe = createAFrameStand3D();
    aframe.position.set(-7.65, 0.46, D / 2 + 0.92);
    aframe.rotation.y = 0.24;

    const martGarland = createGarland3D(5.8, 9);
    martGarland.position.set(-5.2, 1.62, D / 2 + 1.28);
    const martBalloons = createBalloonBunch3D(0.95);
    martBalloons.position.set(-8.55, 0.46, D / 2 + 0.95);

    gfGroup.add(martBox, martFace, bladeSign, martAwning, aframe, martGarland, martBalloons);
  } else {
    // [요구사항 1-3] 신축 2호관 1층: 달콤 다방(SWEET CAFE) + 브라운·크림 물결 어닝 + 김이 모락모락 나는 입체 커피잔·크루아상!
    const cafeBox = createRoundedToyMesh(6.25, 1.28, 0.28, MAT.woodDark, -5.2, 2.58, D / 2 + 0.28, 0.18);
    cafeBox.userData = { lotId: lot.lotId, isShopSign: true, shopLabel: '달콤 다방(SWEET CAFE): 향긋한 수제 라떼 & 크루아상 완판 행진!' };
    registerPick(cafeBox);

    const cafeSignMat = makeClayMat(0xFFFFFF, { map: TEX.cafeSign, roughness: 0.3 });
    signMaterialsToRefresh.push({ mat: cafeSignMat, kind: 'cafe' });
    const cafeFace = new THREE.Mesh(GEO.quad, cafeSignMat);
    cafeFace.scale.set(5.96, 1.12, 1);
    cafeFace.position.set(-5.2, 2.58, D / 2 + 0.44);

    const cafeAwning = createScallopedAwning3D(6.3, TEX.awningBrown, MAT.cream);
    cafeAwning.position.set(-5.2, 1.92, D / 2 + 0.72);

    const cupMascot = createCafeCupAndCroissant3D(lot.x, -8.35, 2.52, D / 2 + 0.55, lot.z);
    facadeEmitters[facadeEmitters.length - 1].lotId = lot.lotId;

    gfGroup.add(cafeBox, cafeFace, cafeAwning, cupMascot);
  }

  // ---------------- 우측 1층 상가: [요구사항 1-2] 뽀송 워시(BUBBLE PONG) 구름 간판 + 비누방울 세탁기 마스코트 ----------------
  gfGroup.add(createRoundedToyMesh(6.6, 0.09, D - 0.4, makeClayMat(0xEFF6FF), 5.2, 0.47, 0.2, 0.04));
  for (let i = 0; i < 3; i++) {
    const wx = 3.5 + i * 1.65;
    gfGroup.add(createRoundedToyMesh(1.24, 1.5, 0.96, MAT.white, wx, 1.18, -1.25, 0.16));
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.12, 20), MAT.sky);
    drum.rotation.x = Math.PI / 2;
    drum.position.set(wx, 1.18, -0.74);
    addToonEdgeOutline(drum, MAT.toonEdge, 28);
    gfGroup.add(drum);
    spinningWashers.push(drum);
  }
  gfGroup.add(createRoundedToyMesh(0.86, 0.5, 0.66, MAT.butter, 7.2, 0.69, 1.1, 0.12));

  // 스카이블루 & 화이트 구름 모양 입체 간판 프레임 + 노란 네온 포인트 바
  const washCloudGroup = new THREE.Group();
  const washBox = createRoundedToyMesh(5.85, 1.26, 0.28, MAT.sky, 5.0, 2.58, D / 2 + 0.28, 0.22);
  washBox.userData = { lotId: lot.lotId, isShopSign: true, shopLabel: '뽀송 워시(BUBBLE PONG): 24시 버블 세탁기가 힘차게 돌아가요!' };
  registerPick(washBox);
  washCloudGroup.add(washBox);

  // 간판 가장자리 몽글몽글 하얀 구름 장식 볼 + 노란색 네온 포인트 조명 바
  [-2.65, -1.3, 0, 1.3, 2.65].forEach((cx, i) => {
    const puff = new THREE.Mesh(GEO.sphere, MAT.white);
    puff.scale.set(0.82, 0.48, 0.34);
    puff.position.set(5.0 + cx, 3.22 + (i % 2) * 0.06, D / 2 + 0.26);
    addToonHullOutline(puff, 1.06);
    washCloudGroup.add(puff);
  });
  washCloudGroup.add(createRoundedToyMesh(5.5, 0.1, 0.12, MAT.neonYellow, 5.0, 1.94, D / 2 + 0.42, 0.04, false, false, false));

  const washSignMat = makeClayMat(0xFFFFFF, { map: TEX.washSign, roughness: 0.3 });
  signMaterialsToRefresh.push({ mat: washSignMat, kind: 'wash' });
  const washFace = new THREE.Mesh(GEO.quad, washSignMat);
  washFace.scale.set(5.55, 1.1, 1);
  washFace.position.set(5.0, 2.58, D / 2 + 0.44);
  washCloudGroup.add(washFace);

  // 간판 옆에서 실제로 비누방울이 보글보글 피어오르는 입체 세탁기 마스코트!
  const washerMascot = createWasherMascot3D(lot.x, 8.38, 2.64, D / 2 + 0.42, lot.z);
  facadeEmitters[facadeEmitters.length - 1].lotId = lot.lotId;

  const washAwning = createScallopedAwning3D(6.3, TEX.awningSky, MAT.sky);
  washAwning.position.set(5.2, 1.92, D / 2 + 0.72);
  const washGarland = createGarland3D(5.8, 9);
  washGarland.position.set(5.2, 1.62, D / 2 + 1.28);

  gfGroup.add(washCloudGroup, washerMascot, washAwning, washGarland);

  // ---------------- 중앙 정문 로비 아치 + [요구사항 2-1] 1층 현관 황동 빌딩 명패! ----------------
  gfGroup.add(createRoundedToyMesh(2.9, 2.25, 0.34, MAT.woodWarm, 0, 1.55, D / 2 + 0.1, 0.14));
  gfGroup.add(createRoundedToyMesh(2.2, 1.95, 0.38, MAT.glass, 0, 1.42, D / 2 + 0.12, 0.1, false, false, true));

  const brassFrame = createRoundedToyMesh(2.55, 0.56, 0.18, MAT.gold, 0, 2.66, D / 2 + 0.3, 0.1);
  const brassMat = makeClayMat(0xFFFFFF, { map: createBrassNameplateTexture(b.title), roughness: 0.28, metalness: 0.22 });
  reg.brassPlateMat = brassMat;
  const brassFace = new THREE.Mesh(GEO.quad, brassMat);
  brassFace.scale.set(2.34, 0.44, 1);
  brassFace.position.set(0, 2.66, D / 2 + 0.41);
  brassFrame.userData = { lotId: lot.lotId, isRenameSign: true };
  registerPick(brassFrame);
  gfGroup.add(brassFrame, brassFace);

  const martLight = new THREE.PointLight(0xFFE4B5, 1.18, 9.5, 1.6);
  martLight.position.set(-5.2, 2.2, 0.6);
  const washLight = new THREE.PointLight(0xE0F2FE, 1.08, 9.5, 1.6);
  washLight.position.set(5.2, 2.2, 0.6);
  const roomWarmLight = new THREE.PointLight(0xFFF0D4, 0.0, 16.0, 1.4);
  roomWarmLight.position.set(0, 5.2, 1.6);
  gfGroup.add(martLight, washLight, roomWarmLight);
  reg.indoorLights.push(roomWarmLight);

  reg.root.add(gfGroup);

  // 층간 슬래브
  reg.root.add(createRoundedToyMesh(W + 0.4, 0.3, D + 0.4, MAT.slab, 0, 2.92, 0.2, 0.12));
  const upperSlab = createRoundedToyMesh(W + 0.4, 0.3, D + 0.4, MAT.slab, 0, 5.72, 0.2, 0.12);
  reg.upperSlab = upperSlab;
  reg.root.add(upperSlab);

  // 6개 호실 인테리어 그룹
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

  // X-Ray 반투명 외벽 쉘 & 옥상 전면 스카이 사인(Rooftop Monument Sign)!
  const shellLineMat = new THREE.LineBasicMaterial({
    color: 0x5A463C,
    transparent: true,
    opacity: 0.54
  });
  reg.shellLineMat = shellLineMat;

  const facadeTex = isSecondComplex ? TEX.brickMint : TEX.brickWarm;
  const facadeMat = makeClayMat(0xFFFFFF, {
    map: facadeTex,
    roughness: 0.62,
    transparent: true,
    opacity: 1.0
  });
  const roofMat = makeClayMat(isSecondComplex ? 0x34D399 : 0xFF7E98, {
    roughness: 0.54,
    transparent: true,
    opacity: 1.0
  });
  const glassWinMat = makeClayMat(0xBAE6FD, {
    roughness: 0.18,
    transparent: true,
    opacity: 0.85,
    coolShadow: true
  });
  reg.shellMaterials.push(facadeMat, roofMat, glassWinMat);

  const frontFacade = new THREE.Group();
  const frontWall = createRoundedToyMesh(W + 0.25, 5.65, 0.3, facadeMat, 0, 5.82, D / 2 + 0.34, 0.14, true, true, true, shellLineMat);
  frontWall.userData = { lotId: lot.lotId, isShell: true };
  frontFacade.add(frontWall);

  for (const wy of [4.35, 7.15]) {
    for (const wx of [-5.6, 0, 5.6]) {
      frontFacade.add(createRoundedToyMesh(2.55, 1.48, 0.36, facadeMat, wx, wy, D / 2 + 0.38, 0.12, true, true, true, shellLineMat));
      frontFacade.add(createRoundedToyMesh(2.22, 1.2, 0.4, glassWinMat, wx, wy, D / 2 + 0.41, 0.08, false, false, false));
      frontFacade.add(createRoundedToyMesh(2.68, 0.24, 0.4, MAT.woodWarm, wx, wy - 0.8, D / 2 + 0.52, 0.08, true, true, true, shellLineMat));
    }
  }
  reg.root.add(frontFacade);

  const roofCapGroup = new THREE.Group();
  const roofSlab = createRoundedToyMesh(W + 1.0, 0.56, D + 1.05, roofMat, 0, 8.86, 0.2, 0.24, true, true, true, shellLineMat);
  const chimney = createRoundedToyMesh(0.98, 1.18, 0.98, facadeMat, 6.5, 9.52, -1.2, 0.16, true, true, true, shellLineMat);

  // 옥상 전면 정중앙 아치형 입체 빌딩 현판(Rooftop Monument Sky Sign)!
  const { group: skySignGroup, skyMat } = createRooftopSkySign3D(b.title, lot.lotId);
  skySignGroup.position.set(0, 9.05, D / 2 + 0.22);
  reg.skySignGroup = skySignGroup;
  reg.skySignMat = skyMat;

  const roofBalloonL = createBalloonBunch3D(1.02);
  roofBalloonL.position.set(-7.8, 9.1, 2.2);
  const roofBalloonR = createBalloonBunch3D(1.02);
  roofBalloonR.position.set(7.8, 9.1, 2.2);
  roofCapGroup.add(roofSlab, chimney, skySignGroup, roofBalloonL, roofBalloonR);
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
// 10. 공용시설 4종 & 야외 포커스 패드 조립
// =========================================================
function rebuildPublicInfraAndManager3D(lotId) {
  const b = state.buildings[lotId];
  const reg = lot3D[lotId];
  if (!b || !reg) return;

  while (reg.infraGroup.children.length > 0) reg.infraGroup.remove(reg.infraGroup.children[0]);
  while (reg.managerGroup.children.length > 0) reg.managerGroup.remove(reg.managerGroup.children[0]);
  reg.elevatorCar = null;

  if (b.infra.elevator) {
    const shaft = createRoundedToyMesh(2.1, 8.4, 2.1, MAT.glass, 9.9, 4.5, 0.4, 0.16, false, false, true);
    const topCap = createRoundedToyMesh(2.38, 0.48, 2.38, MAT.sky, 9.9, 8.84, 0.4, 0.16);
    const car = createRoundedToyMesh(1.68, 1.95, 1.68, MAT.butter, 9.9, 3.2, 0.4, 0.18);
    shaft.userData = { lotId };
    registerPick(shaft);
    reg.infraGroup.add(shaft, topCap, car);
    reg.elevatorCar = car;
  } else {
    for (let s = 0; s < 8; s++) {
      reg.infraGroup.add(createRoundedToyMesh(1.25, 0.25, 0.56, MAT.woodWarm, 9.5, 0.8 + s * 0.65, 2.2 - s * 0.45, 0.08));
    }
  }

  const recPad = createRoundedToyMesh(3.2, 0.14, 2.1, MAT.basePadMint, -10.1, 0.52, 1.6, 0.12);
  recPad.userData = { lotId, openNotebookTab: 'infra' };
  registerPick(recPad);
  reg.infraGroup.add(recPad);
  const recRing = createInteractiveBaseRing(3.4, 2.3, 0.61, true);
  recRing.position.set(-10.1, 0, 1.6);
  reg.infraGroup.add(recRing);

  if (b.infra.recycling) {
    reg.infraGroup.add(createRoundedToyMesh(2.85, 0.24, 1.7, MAT.mint, -10.1, 2.18, 1.6, 0.1));
    [MAT.sky, MAT.mint, MAT.butter].forEach((m, idx) => {
      const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.32, 0.98, 18), m);
      bin.position.set(-10.85 + idx * 0.78, 1.05, 1.6);
      bin.castShadow = true;
      addToonEdgeOutline(bin, MAT.toonEdge, 28);
      reg.infraGroup.add(bin);
    });
  } else {
    for (let i = 0; i < 3; i++) {
      const bag = new THREE.Mesh(GEO.sphere, MAT.trashBag);
      bag.scale.set(0.56, 0.46, 0.56);
      bag.position.set(-10.5 + i * 0.44, 0.78, 1.6 + (i % 2) * 0.25);
      bag.castShadow = true;
      addToonHullOutline(bag, 1.07);
      reg.infraGroup.add(bag);
    }
  }

  if (b.infra.parcel_box) {
    reg.infraGroup.add(createRoundedToyMesh(1.52, 1.88, 0.68, MAT.coral, 2.15, 1.38, 3.2, 0.14));
    reg.infraGroup.add(createRoundedToyMesh(0.46, 0.42, 0.72, MAT.screenCyan, 2.15, 1.55, 3.22, 0.05));
  }

  if (b.infra.rooftop_garden) {
    reg.infraGroup.add(createRoundedToyMesh(13.5, 0.24, 3.8, makeClayMat(0x86EFAC), 0, 9.18, -0.4, 0.14));
    for (const tx of [-5.2, 5.2]) {
      const miniTree = createFluffyPastelTree(tx < 0, 0.7);
      miniTree.position.set(tx, 9.22, -0.4);
      reg.infraGroup.add(miniTree);
    }
  }

  if (b.manager.hired) {
    const booth = new THREE.Group();
    booth.position.set(0.1, 0.44, 4.25);

    const mgrPad = createRoundedToyMesh(2.9, 0.1, 2.2, MAT.basePadMint, 0.35, 0.04, 0.05, 0.1);
    const mgrRing = createInteractiveBaseRing(3.15, 2.45, 0.11, true);
    mgrRing.position.set(0.35, 0, 0.05);
    booth.add(mgrPad, mgrRing);

    const bBody = createRoundedToyMesh(1.78, 1.96, 1.48, MAT.cream, 0, 0.98, 0, 0.16);
    bBody.userData = { lotId, openNotebookTab: 'manager' };
    registerPick(bBody);
    booth.add(bBody);
    booth.add(createRoundedToyMesh(2.02, 0.32, 1.72, MAT.sky, 0, 2.08, 0, 0.12));
    booth.add(createRoundedToyMesh(1.38, 0.72, 1.54, MAT.glass, 0, 1.25, 0, 0.06, false, false, true));

    const mgrGarland = createGarland3D(1.85, 5);
    mgrGarland.position.set(0, 1.86, 0.88);
    booth.add(mgrGarland);

    const mgr = createChibiPerson3D('manager', false);
    mgr.position.set(1.38, 0.08, 0.25);
    booth.add(mgr);
    booth.userData.mgrMesh = mgr;
    reg.managerGroup.add(booth);
  }
}

// =========================================================
// 11. 호실 격자 몰딩 프레임 & 5종 세대 맞춤 가구
// =========================================================
function rebuildRoom3D(room) {
  const reg = lot3D[room.lotId];
  if (!reg) return;
  const rg = reg.roomGroups[room.id];
  if (!rg) return;

  while (rg.children.length > 0) rg.remove(rg.children[0]);

  const RW = GAME_BALANCE.roomWidth;
  const RD = GAME_BALANCE.roomDepth;
  const RH = GAME_BALANCE.wallHeight;

  const floorTexMap = [TEX.floor0, TEX.floor1, TEX.floor2, TEX.floor3];
  const wallTexMap = [TEX.wall0, TEX.wall1, TEX.wall2, TEX.wall3];

  const floorMat = makeClayMat(room.unlocked ? 0xFFFFFF : 0xB8B2AA, {
    map: room.unlocked ? floorTexMap[room.interiorLv] : TEX.floor0,
    roughness: room.interiorLv >= 3 ? 0.34 : 0.6
  });

  const wallMat = makeClayMat(
    !room.unlocked ? 0xC4BEB6 : room.household?.type === 'hikikomori' ? 0xE4D9FF : 0xFFFFFF,
    {
      map: room.household?.type === 'hikikomori' ? null : wallTexMap[room.interiorLv],
      roughness: 0.66
    }
  );

  const floorMesh = createRoundedToyMesh(RW - 0.18, 0.16, RD - 0.18, floorMat, 0, 0.08, 0, 0.08, false, true, true);
  floorMesh.userData = { roomId: room.id, lotId: room.lotId };
  registerPick(floorMesh);
  rg.add(floorMesh);

  const backWall = createRoundedToyMesh(RW - 0.12, RH, 0.2, wallMat, 0, RH / 2, -RD / 2 + 0.1, 0.08, true, true, true);
  backWall.userData = { roomId: room.id, lotId: room.lotId };
  registerPick(backWall);
  rg.add(backWall);

  rg.add(createRoundedToyMesh(0.2, RH, RD - 0.12, wallMat, -RW / 2 + 0.1, RH / 2, 0, 0.08, true, true, true));
  if (room.col === 2) {
    rg.add(createRoundedToyMesh(0.2, RH, RD - 0.12, wallMat, RW / 2 - 0.1, RH / 2, 0, 0.08, true, true, true));
  }

  const trimMat = room.unlocked ? MAT.roomGridGold : MAT.roomGridCream;
  rg.add(createRoundedToyMesh(RW - 0.06, 0.14, 0.28, trimMat, 0, RH + 0.04, -RD / 2 + 0.1, 0.05, false, false, true));
  rg.add(createRoundedToyMesh(0.28, 0.14, RD - 0.06, trimMat, -RW / 2 + 0.1, RH + 0.04, 0, 0.05, false, false, true));
  if (room.col === 2) {
    rg.add(createRoundedToyMesh(0.28, 0.14, RD - 0.06, trimMat, RW / 2 - 0.1, RH + 0.04, 0, 0.05, false, false, true));
  }

  const frontSill = createRoundedToyMesh(RW - 0.1, 0.34, 0.22, trimMat, 0, 0.2, RD / 2 - 0.09, 0.07, true, true, true);
  frontSill.userData = { roomId: room.id, lotId: room.lotId };
  registerPick(frontSill);
  rg.add(frontSill);

  rg.add(createRoundedToyMesh(0.24, 0.72, 0.26, MAT.roomGridCream, -RW / 2 + 0.1, 0.38, RD / 2 - 0.09, 0.06, true, true, true));
  if (room.col === 2) {
    rg.add(createRoundedToyMesh(0.24, 0.72, 0.26, MAT.roomGridCream, RW / 2 - 0.1, 0.38, RD / 2 - 0.09, 0.06, true, true, true));
  }

  if (room.soundproofed) {
    rg.add(createRoundedToyMesh(RW - 0.24, 0.13, RD - 0.24, MAT.sky, 0, 0.16, 0, 0.05));
  }

  if (!room.unlocked) {
    const b1 = createRoundedToyMesh(2.9, 0.26, 0.16, MAT.butter, 0, 1.2, 0.3, 0.07);
    b1.rotation.z = 0.26;
    const b2 = createRoundedToyMesh(2.9, 0.26, 0.16, MAT.butter, 0, 1.2, 0.36, 0.07);
    b2.rotation.z = -0.26;
    rg.add(b1, b2);
    return;
  }

  if (!room.household) {
    if (room.interiorLv >= 1) {
      const rug = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.05, 24), MAT.cream);
      rug.position.set(0, 0.17, 0.15);
      rug.receiveShadow = true;
      addToonEdgeOutline(rug, MAT.toonEdge, 35);
      rg.add(rug);
      rg.add(createPottedPlant3D(-1.85, 0.15, -1.45));
    }
    return;
  }

  const hType = room.household.type;
  if (hType === 'student') buildStudentFurniture3D(rg);
  else if (hType === 'newlywed') buildNewlywedFurniture3D(rg);
  else if (hType === 'family4') buildFamily4Furniture3D(rg);
  else if (hType === 'elderly') buildElderlyFurniture3D(rg);
  else if (hType === 'hikikomori') buildHikikomoriAndTrash3D(rg, room.trashStage);

  if (room.evictionCountdown !== null) {
    const b1 = createRoundedToyMesh(0.76, 0.66, 0.66, MAT.movingBox, 1.55, 0.48, 1.35, 0.1);
    const tape1 = createRoundedToyMesh(0.78, 0.09, 0.18, MAT.butter, 1.55, 0.81, 1.35, 0.03);
    const b2 = createRoundedToyMesh(0.62, 0.54, 0.58, MAT.movingBox, 1.48, 1.08, 1.32, 0.1);
    b2.rotation.y = 0.28;
    rg.add(b1, tape1, b2);
  }
}

function createDetailedBed3D(w, d, duvetMat, pillowMat = MAT.white) {
  const bed = new THREE.Group();
  bed.add(createRoundedToyMesh(w, 0.25, d, MAT.woodWarm, 0, 0.22, 0, 0.1));
  bed.add(createRoundedToyMesh(w, 0.8, 0.18, MAT.woodWarm, 0, 0.52, -d / 2 + 0.09, 0.12));
  bed.add(createRoundedToyMesh(w - 0.12, 0.24, d - 0.16, MAT.white, 0, 0.42, 0.04, 0.11));
  bed.add(createRoundedToyMesh(w - 0.08, 0.26, d * 0.62, duvetMat, 0, 0.46, d * 0.16, 0.12));

  if (w > 1.65) {
    bed.add(createRoundedToyMesh(0.62, 0.17, 0.4, pillowMat, -0.38, 0.58, -d * 0.28, 0.09));
    bed.add(createRoundedToyMesh(0.62, 0.17, 0.4, pillowMat, 0.38, 0.58, -d * 0.28, 0.09));
  } else {
    bed.add(createRoundedToyMesh(0.72, 0.17, 0.4, pillowMat, 0, 0.58, -d * 0.28, 0.09));
  }
  return bed;
}

function createDetailedSofa3D(w, sofaMat, rugMat = MAT.cream) {
  const g = new THREE.Group();
  g.add(createRoundedToyMesh(w + 0.7, 0.05, 1.85, rugMat, 0, 0.03, 0.25, 0.14, false, true));
  g.add(createRoundedToyMesh(w, 0.34, 0.88, sofaMat, 0, 0.24, 0, 0.14));
  g.add(createRoundedToyMesh(w, 0.74, 0.28, sofaMat, 0, 0.52, -0.32, 0.14));
  g.add(createRoundedToyMesh(0.26, 0.56, 0.9, sofaMat, -w / 2 + 0.13, 0.4, 0, 0.12));
  g.add(createRoundedToyMesh(0.26, 0.56, 0.9, sofaMat, w / 2 - 0.13, 0.4, 0, 0.12));
  g.add(createRoundedToyMesh(0.36, 0.32, 0.2, MAT.butter, -w * 0.26, 0.54, -0.12, 0.1));
  g.add(createRoundedToyMesh(0.36, 0.32, 0.2, MAT.white, w * 0.26, 0.54, -0.12, 0.1));
  return g;
}

function createPottedPlant3D(x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.38, 16), MAT.coral);
  pot.position.y = 0.19;
  pot.castShadow = true;
  addToonEdgeOutline(pot, MAT.toonEdge, 30);
  const leaf1 = new THREE.Mesh(GEO.sphere, MAT.leafGreen);
  leaf1.scale.set(0.48, 0.54, 0.48);
  leaf1.position.y = 0.56;
  leaf1.castShadow = true;
  addToonHullOutline(leaf1, 1.07);
  g.add(pot, leaf1);
  return g;
}

function buildStudentFurniture3D(rg) {
  const bed = createDetailedBed3D(1.38, 2.25, MAT.sky, MAT.white);
  bed.position.set(-1.72, 0.15, -0.78);
  rg.add(bed);

  const desk = new THREE.Group();
  desk.position.set(1.22, 0.15, -1.42);
  desk.add(createRoundedToyMesh(2.05, 0.14, 0.86, MAT.woodLight, 0, 0.74, 0, 0.08));
  desk.add(createRoundedToyMesh(0.14, 0.74, 0.78, MAT.white, -0.9, 0.37, 0, 0.06));
  desk.add(createRoundedToyMesh(0.14, 0.74, 0.78, MAT.white, 0.9, 0.37, 0, 0.06));

  for (const mx of [-0.42, 0.38]) {
    desk.add(createRoundedToyMesh(0.74, 0.46, 0.08, MAT.charcoal, mx, 1.12, -0.18, 0.06));
    desk.add(createRoundedToyMesh(0.64, 0.36, 0.09, MAT.screenCyan, mx, 1.12, -0.17, 0.04, false, false, false));
    desk.add(createRoundedToyMesh(0.14, 0.18, 0.12, MAT.silver, mx, 0.84, -0.18, 0.04));
  }
  desk.add(createRoundedToyMesh(0.55, 0.05, 0.22, MAT.white, -0.02, 0.82, 0.15, 0.03));
  desk.add(createRoundedToyMesh(0.36, 0.62, 0.58, MAT.charcoal, 0.78, 0.32, 0.05, 0.08));
  desk.add(createRoundedToyMesh(0.58, 0.14, 0.58, MAT.coral, -0.02, 0.46, 0.68, 0.08));
  desk.add(createRoundedToyMesh(0.56, 0.68, 0.14, MAT.coral, -0.02, 0.84, 0.92, 0.08));
  rg.add(desk);

  const guitarBody = new THREE.Mesh(GEO.sphere, MAT.woodWarm);
  guitarBody.scale.set(0.45, 0.58, 0.2);
  guitarBody.position.set(-0.48, 0.48, -1.78);
  const guitarNeck = createRoundedToyMesh(0.1, 0.65, 0.08, MAT.woodDark, -0.48, 0.95, -1.8, 0.03);
  rg.add(guitarBody, guitarNeck);
}

function buildNewlywedFurniture3D(rg) {
  const qBed = createDetailedBed3D(2.05, 2.25, MAT.coral, MAT.pinkSoft);
  qBed.position.set(-1.38, 0.15, -0.78);
  rg.add(qBed);

  const sofa = createDetailedSofa3D(1.95, MAT.pinkSoft, MAT.cream);
  sofa.position.set(1.32, 0.15, -1.25);
  rg.add(sofa);

  const island = new THREE.Group();
  island.position.set(1.25, 0.15, 0.82);
  island.add(createRoundedToyMesh(1.85, 0.86, 0.78, MAT.white, 0, 0.43, 0, 0.14));
  island.add(createRoundedToyMesh(1.95, 0.12, 0.88, MAT.woodLight, 0, 0.9, 0, 0.08));
  island.add(createRoundedToyMesh(0.4, 0.42, 0.36, MAT.coral, -0.52, 1.15, -0.1, 0.09));
  for (const sx of [-0.45, 0.45]) {
    const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.58, 16), MAT.mintSoft);
    stool.position.set(sx, 0.29, 0.65);
    stool.castShadow = true;
    addToonEdgeOutline(stool, MAT.toonEdge, 30);
    island.add(stool);
  }
  rg.add(island);
  rg.add(createPottedPlant3D(-2.25, 0.15, 1.25));
}

function buildFamily4Furniture3D(rg) {
  rg.add(createRoundedToyMesh(0.16, 1.55, 2.35, MAT.woodLight, -0.15, 0.92, -0.82, 0.08));

  const bunk = new THREE.Group();
  bunk.position.set(-1.55, 0.15, -0.85);
  for (const px of [-0.68, 0.68]) {
    for (const pz of [-1.02, 1.02]) {
      bunk.add(createRoundedToyMesh(0.15, 1.95, 0.15, MAT.woodWarm, px, 0.98, pz, 0.06));
    }
  }
  bunk.add(createRoundedToyMesh(1.38, 0.2, 2.08, MAT.white, 0, 0.36, 0, 0.08));
  bunk.add(createRoundedToyMesh(1.34, 0.22, 1.25, MAT.mint, 0, 0.43, 0.34, 0.1));
  bunk.add(createRoundedToyMesh(0.65, 0.14, 0.36, MAT.butter, 0, 0.52, -0.68, 0.07));

  bunk.add(createRoundedToyMesh(1.38, 0.2, 2.08, MAT.white, 0, 1.38, 0, 0.08));
  bunk.add(createRoundedToyMesh(1.34, 0.22, 1.25, MAT.sky, 0, 1.45, 0.34, 0.1));
  bunk.add(createRoundedToyMesh(0.65, 0.14, 0.36, MAT.coral, 0, 1.54, -0.68, 0.07));
  bunk.add(createRoundedToyMesh(0.1, 0.32, 1.85, MAT.woodLight, 0.68, 1.66, 0, 0.04));
  for (let r = 0; r < 4; r++) {
    bunk.add(createRoundedToyMesh(0.1, 0.08, 0.44, MAT.butter, 0.75, 0.48 + r * 0.32, 0.68, 0.03));
  }
  rg.add(bunk);

  const sofa = createDetailedSofa3D(1.85, MAT.mintSoft, MAT.cream);
  sofa.position.set(1.38, 0.15, -1.32);
  rg.add(sofa);

  rg.add(createRoundedToyMesh(1.35, 0.68, 0.12, MAT.charcoal, 1.38, 1.35, -2.08, 0.06));
  rg.add(createRoundedToyMesh(1.55, 0.16, 1.05, MAT.woodLight, 1.35, 0.72, 0.88, 0.08));
  rg.add(createRoundedToyMesh(0.16, 0.58, 0.16, MAT.woodDark, 0.85, 0.42, 0.88, 0.05));
  rg.add(createRoundedToyMesh(0.16, 0.58, 0.16, MAT.woodDark, 1.85, 0.42, 0.88, 0.05));
}

function buildElderlyFurniture3D(rg) {
  for (const bx of [-1.85, -0.58]) {
    const twin = createDetailedBed3D(1.06, 2.08, MAT.butter, MAT.cream);
    twin.position.set(bx, 0.15, -0.88);
    rg.add(twin);
  }

  const teaSet = new THREE.Group();
  teaSet.position.set(1.35, 0.15, -0.15);
  teaSet.add(createRoundedToyMesh(1.32, 0.12, 0.92, MAT.woodDark, 0, 0.34, 0, 0.06));
  teaSet.add(createRoundedToyMesh(0.14, 0.32, 0.8, MAT.woodDark, -0.52, 0.16, 0, 0.05));
  teaSet.add(createRoundedToyMesh(0.14, 0.32, 0.8, MAT.woodDark, 0.52, 0.16, 0, 0.05));
  teaSet.add(createRoundedToyMesh(0.52, 0.11, 0.52, MAT.coral, 0, 0.06, -0.75, 0.08));
  teaSet.add(createRoundedToyMesh(0.52, 0.11, 0.52, MAT.mint, 0, 0.06, 0.75, 0.08));
  const pot = new THREE.Mesh(GEO.sphere, MAT.mintSoft);
  pot.scale.setScalar(0.24);
  pot.position.set(0, 0.48, 0);
  teaSet.add(pot);
  rg.add(teaSet);

  const rocker = new THREE.Group();
  rocker.position.set(-1.45, 0.15, 1.15);
  rocker.add(createRoundedToyMesh(0.68, 0.12, 0.68, MAT.woodWarm, 0, 0.38, 0, 0.06));
  rocker.add(createRoundedToyMesh(0.68, 0.65, 0.12, MAT.woodWarm, 0, 0.68, -0.28, 0.06));
  rocker.add(createRoundedToyMesh(0.12, 0.14, 0.92, MAT.woodDark, -0.28, 0.08, 0, 0.06));
  rocker.add(createRoundedToyMesh(0.12, 0.14, 0.92, MAT.woodDark, 0.28, 0.08, 0, 0.06));
  rg.add(rocker);

  rg.add(createRoundedToyMesh(1.5, 1.35, 0.44, MAT.woodWarm, 1.55, 0.82, -1.88, 0.08));
  rg.add(createPottedPlant3D(1.25, 1.5, -1.88));
  rg.add(createPottedPlant3D(1.85, 1.5, -1.88));
}

function buildHikikomoriAndTrash3D(rg, trashStage) {
  const pcDesk = new THREE.Group();
  pcDesk.position.set(1.18, 0.15, -1.35);
  pcDesk.add(createRoundedToyMesh(2.25, 0.14, 0.92, MAT.charcoal, 0, 0.72, 0, 0.08));
  pcDesk.add(createRoundedToyMesh(0.16, 0.72, 0.82, MAT.charcoal, -0.95, 0.36, 0, 0.06));
  pcDesk.add(createRoundedToyMesh(0.16, 0.72, 0.82, MAT.charcoal, 0.95, 0.36, 0, 0.06));

  [-0.65, 0, 0.65].forEach((mx, idx) => {
    const mon = createRoundedToyMesh(0.62, 0.44, 0.08, MAT.screenPurple, mx, 1.08, idx === 1 ? -0.22 : -0.12, 0.05);
    mon.rotation.y = idx === 0 ? 0.28 : idx === 2 ? -0.28 : 0;
    pcDesk.add(mon);
  });
  pcDesk.add(createRoundedToyMesh(0.36, 0.62, 0.56, MAT.purpleDark, 0.85, 0.32, 0.1, 0.08));
  pcDesk.add(createRoundedToyMesh(0.62, 0.72, 0.62, MAT.purpleDark, 0, 0.5, 0.72, 0.12));
  rg.add(pcDesk);

  rg.add(createRoundedToyMesh(1.38, 0.22, 2.05, MAT.lavender, -1.68, 0.24, -0.82, 0.1));
  rg.add(createRoundedToyMesh(1.22, 0.24, 1.15, MAT.purpleDark, -1.62, 0.33, -0.45, 0.1));

  if (trashStage >= 1) {
    for (let p = 0; p < 5; p++) {
      const pBox = createRoundedToyMesh(0.66, 0.1, 0.66, MAT.pizzaBox, -0.42 + (p % 2) * 0.05, 0.2 + p * 0.1, 0.28, 0.04);
      pBox.rotation.y = p * 0.24;
      rg.add(pBox);
    }
    [[0.32, 0.25, -0.45, MAT.coral], [0.52, 0.25, -0.32, MAT.mint], [0.42, 0.25, -0.15, MAT.sky], [-0.08, 0.25, 0.65, MAT.butter]].forEach(([cx, cy, cz, cMat]) => {
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.22, 12), cMat);
      can.position.set(cx, cy, cz);
      can.castShadow = true;
      rg.add(can);
    });
  }

  if (trashStage >= 2) {
    [[-0.88, 0.98], [-0.32, 1.18], [0.24, 1.05], [-0.62, 1.48]].forEach(([bx, bz], i) => {
      const bag = new THREE.Mesh(GEO.sphere, MAT.trashBag);
      bag.scale.set(0.62, 0.54 + (i % 2) * 0.14, 0.62);
      bag.position.set(bx, 0.38, bz);
      bag.castShadow = true;
      addToonHullOutline(bag, 1.07);
      rg.add(bag);
    });
  }

  if (trashStage >= 3) {
    for (let i = 0; i < 6; i++) {
      const bag = new THREE.Mesh(GEO.sphere, MAT.trashBag);
      bag.scale.set(0.68, 0.62, 0.68);
      bag.position.set(-0.95 + (i % 3) * 0.66, 0.45 + Math.floor(i / 3) * 0.36, 0.55 + (i % 2) * 0.52);
      bag.castShadow = true;
      addToonHullOutline(bag, 1.07);
      rg.add(bag);
    }
    for (let p = 0; p < 4; p++) {
      const pb2 = createRoundedToyMesh(0.62, 0.1, 0.62, MAT.pizzaBox, 1.55, 0.2 + p * 0.1, 1.05, 0.04);
      pb2.rotation.y = -p * 0.3;
      rg.add(pb2);
    }
    const stain = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.15, 0.02, 20),
      new THREE.MeshBasicMaterial({ color: 0x84CC16, transparent: true, opacity: 0.38 })
    );
    stain.position.set(-0.35, 0.17, 0.95);
    rg.add(stain);
  }
}

// =========================================================
// 12. 입주민 동기화 & X-Ray + 호버/포커스 하이라이트 업데이트
// =========================================================
function syncBuildingResidents3D(lotId) {
  const b = state.buildings[lotId];
  const reg = lot3D[lotId];
  if (!b || !reg) return;

  for (const room of b.rooms) {
    if (residentActors[room.id]) {
      residentActors[room.id].forEach((ac) => reg.interiorGroup.remove(ac.mesh));
      delete residentActors[room.id];
    }
    if (!room.unlocked || !room.household) continue;

    const hType = room.household.type;
    const styles =
      hType === 'student' ? [['student', false]] :
      hType === 'newlywed' ? [['newlywed_m', false], ['newlywed_f', false]] :
      hType === 'family4' ? [['family_m', false], ['family_f', false], ['kid', true], ['kid', true]] :
      hType === 'elderly' ? [['elderly_m', false], ['elderly_f', false]] :
      [['hikikomori', false]];

    residentActors[room.id] = styles.map(([st, isKid], idx) => {
      const mesh = createChibiPerson3D(st, isKid);
      const sx = room.lx + (idx - 0.5) * 0.55;
      const sz = room.lz + 0.45;
      mesh.position.set(sx, room.ly + 0.15, sz);
      reg.interiorGroup.add(mesh);
      return {
        mesh,
        room,
        cx: sx,
        cz: sz,
        tx: sx,
        tz: sz,
        timer: 0.8 + idx * 0.7,
        puffTimer: 0.2,
        phase: Math.random() * 6,
        breathOffset: Math.random() * Math.PI * 2,
        isKid,
        isHoarder: hType === 'hikikomori'
      };
    });
  }
}

function updateXRayAndFocusHighlights(dt, nowSec) {
  const z = camera.zoom;
  let targetOpacity = 1.0;
  if (z > 1.18) {
    targetOpacity = Math.max(0.06, 1.0 - (z - 1.18) / 0.55);
  }
  currentShellOpacity += (targetOpacity - currentShellOpacity) * Math.min(1, dt * 9);

  const showInterior = currentShellOpacity < 0.93;
  const indoorIntensity = THREE.MathUtils.clamp((1 - currentShellOpacity) * 1.45, 0, 1.35);
  const focusedRm = focusedRoomId ? findRoom(focusedRoomId) : null;

  for (const reg of Object.values(lot3D)) {
    if (reg.interiorGroup) reg.interiorGroup.visible = showInterior;
    if (reg.roofCapGroup) reg.roofCapGroup.visible = currentShellOpacity > 0.28;
    if (reg.shellLineMat) reg.shellLineMat.opacity = currentShellOpacity * 0.54;

    for (const m of reg.shellMaterials) {
      m.opacity = currentShellOpacity;
      m.depthWrite = currentShellOpacity > 0.82;
    }
    for (const ptLight of reg.indoorLights) {
      ptLight.intensity = indoorIntensity;
    }

    const isLotHovered = hoveredLotId === reg.lotId && !hoveredRoomId;
    const targetLift = isLotHovered ? 0.2 : 0;
    reg.hoverY += (targetLift - reg.hoverY) * Math.min(1, dt * 12);
    if (!activeBounces.some((ab) => ab.obj === reg.root)) {
      reg.root.position.y = reg.hoverY;
    }

    const b = state.buildings[reg.lotId];
    if (b && reg.upperSlab) {
      const anyUpperUnlocked = b.rooms.some((r) => r.floor === 2 && r.unlocked);
      const cutUpperFloor =
        showInterior &&
        ((focusedRm && focusedRm.lotId === reg.lotId && focusedRm.floor === 1) ||
          (!anyUpperUnlocked && (!focusedRm || focusedRm.floor !== 2)));

      reg.upperSlab.visible = !cutUpperFloor;
      for (const r of b.rooms) {
        const rg = reg.roomGroups[r.id];
        if (!rg) continue;
        if (r.floor === 2) {
          rg.visible = !cutUpperFloor;
          if (residentActors[r.id]) {
            residentActors[r.id].forEach((ac) => { ac.mesh.visible = !cutUpperFloor; });
          }
        }
        if (!activeBounces.some((ab) => ab.obj === rg)) {
          const rmLift = hoveredRoomId === r.id ? 0.14 : 0;
          rg.position.y += (r.ly + rmLift - rg.position.y) * Math.min(1, dt * 14);
        }
      }
    }
  }

  animatedDashMaterials.forEach((dm) => {
    if (dm.map) dm.map.offset.x = (nowSec * 0.45) % 1;
  });

  if (hoveredRoomId) {
    const rm = findRoom(hoveredRoomId);
    const lot = rm ? getLot(rm.lotId) : null;
    if (rm && lot) {
      setHoverBoxBounds(
        lot.x + rm.lx,
        rm.ly + 0.16 + Math.sin(nowSec * 8) * 0.03,
        lot.z + rm.lz,
        GAME_BALANCE.roomWidth,
        GAME_BALANCE.roomDepth,
        0x34D399
      );
    }
  } else if (hoveredLotId) {
    const lot = getLot(hoveredLotId);
    const reg = lot3D[hoveredLotId];
    if (lot && reg) {
      setHoverBoxBounds(
        lot.x,
        0.18 + Math.sin(nowSec * 7) * 0.04,
        lot.z + (state.buildings[hoveredLotId] ? 0.35 : 0),
        reg.padW,
        reg.padD,
        lot.owned ? 0xFFD166 : 0x34D399
      );
    }
  } else if (hoverFocusGroup) {
    hoverFocusGroup.visible = false;
  }

  if (focusedRm && selectedRoomFrameGroup) {
    const lot = getLot(focusedRm.lotId);
    selectedRoomFrameGroup.visible = true;
    selectedRoomFrameGroup.position.set(lot.x + focusedRm.lx, focusedRm.ly, lot.z + focusedRm.lz);
    selectedRoomBeacons.forEach((bc, idx) => {
      bc.rotation.y = nowSec * 2.8 + idx * 0.8;
      bc.position.y = GAME_BALANCE.wallHeight + 0.22 + Math.sin(nowSec * 5 + idx) * 0.08;
    });
  } else if (selectedRoomFrameGroup) {
    selectedRoomFrameGroup.visible = false;
  }

  if (dom.hudXrayBadge) {
    const pct = Math.round((1 - currentShellOpacity) * 100);
    dom.hudXrayBadge.textContent = pct > 8 ? `내부투시 ${pct}%` : '외관 100%';
  }
}

// =========================================================
// 13. [요구사항 2-3] 빌딩 이름 실시간 작명(Rename) 시스템!
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

  // 3D 옥상 스카이 사인 & 1층 정문 황동 명패 실시간 교체 + 탄성 축하 연출!
  refreshBuildingNameplates3D(renameTargetLotId);
  if (reg?.skySignGroup) triggerSquashStretch(reg.skySignGroup, 1.55);
  if (reg?.root) triggerSquashStretch(reg.root, 0.95);
  if (lot) {
    spawnCoinFountain3D(lot.x, 9.6, lot.z + 2.4, 10, true);
    spawnSmokePoof3D(lot.x, 9.5, lot.z + 2.5, 0xFFFDF9, 8);
  }

  // 플로팅 리본 배지 & 열려 있는 모달/인스펙터 즉시 반영
  if (lotOverlayEls[renameTargetLotId]) lotOverlayEls[renameTargetLotId].dataset.sig = '';
  if (focusedRoomId) renderFocusedRoomDrawer();
  if (!dom.notebookModal.classList.contains('hidden')) renderNotebookSplitView();

  dom.renameModal.classList.add('hidden');
  showToast(`옥상 스카이 사인과 정문 명패가 [${cleanName}](으)로 교체되었습니다!`, 'emerald');
  saveState();
}

// =========================================================
// 14. 층간소음 · 쓰레기방 악취 · 만족도 퇴거 · 관리인 자동 위임
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

      const hDef = HOUSEHOLD_TYPES[room.household.type];
      let deltaHappy = 1.1;
      let conflictReason = null;

      if (hDef.isHoarder) {
        room.trashProgress += dt;
        if (room.trashProgress >= 14 && room.trashStage < 3) {
          room.trashProgress = 0;
          room.trashStage += 1;
          rebuildRoom3D(room);
          if (room.trashStage >= 2) {
            showToast(`[${b.title} ${room.name}] 히키코모리 쓰레기방(${room.trashStage}단계)에서 악취가 퍼집니다!`, 'rose');
          }
        }
        if (room.trashStage >= 2) {
          ensureOdorFlies(room, lot);
          if (emitFX) {
            spawnSmokePoof3D(lot.x + room.lx, room.ly + 0.9, lot.z + room.lz + 0.6, 0x84CC16, 3);
            spawnSmokePoof3D(lot.x + room.lx + 0.35, room.ly + 1.1, lot.z + room.lz + 0.9, 0xC084FC, 2);
          }
        } else {
          clearOdorFlies(room.id);
        }
      } else {
        clearOdorFlies(room.id);
      }

      const upstairs = b.rooms.find((r) => r.col === room.col && r.floor === room.floor + 1);
      if (upstairs && upstairs.household && !upstairs.soundproofed && !room.soundproofed) {
        const upDef = HOUSEHOLD_TYPES[upstairs.household.type];
        if (upDef.noiseOutput >= 40) {
          const dmg = (upDef.noiseOutput * hDef.noiseSensitivity) / 2100;
          deltaHappy -= dmg;
          if (hDef.noiseSensitivity >= 50) conflictReason = 'noise';
          if (emitFX && camera.zoom >= 1.15) {
            spawnNoiseShockwave(lot.x + room.lx, upstairs.ly - 0.08, lot.z + room.lz);
          }
        }
      }

      const pollutedNeighbor = b.rooms.find(
        (r) =>
          r.id !== room.id &&
          r.trashStage >= 2 &&
          Math.abs(r.col - room.col) + Math.abs(r.floor - room.floor) <= 1
      );
      if (pollutedNeighbor && hDef.odorSensitivity > 0) {
        deltaHappy -= pollutedNeighbor.trashStage * (hDef.odorSensitivity / 55);
        conflictReason = 'odor';
      }

      if (room.floor >= 2 && hDef.needsElevator && !b.infra.elevator) {
        deltaHappy -= 1.5;
        if (!conflictReason) conflictReason = 'infra';
      }
      if (hDef.needsRecycling && !b.infra.recycling) {
        deltaHappy -= 0.9;
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
          showToast(`[${room.name} ${room.household.familyName}] 불만 누적으로 이사를 고민 중입니다! (D-30s)`, 'rose');
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
            showToast(`[${room.name}] ${leftName} 세대가 이사를 떠나 공실이 발생했습니다!`, 'rose');
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
          showToast(`자산 부족으로 [${b.title}] 지배인 급여(${sal}만)가 미지급되어 대기 중입니다!`, 'rose');
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
  if (lot) setPinPos(tag, project(lot.x + 0.5, 2.4, lot.z + 4.1));
  dom.careLayer.appendChild(tag);
  managerTagEls[lotId] = tag;
  setTimeout(() => {
    tag.remove();
    delete managerTagEls[lotId];
  }, 2800);
}

// =========================================================
// 15. 3D 파티클·이펙트 (비누방울 & 커피 김 파티클 포함!)
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
  const baseY = obj.userData.baseY !== undefined ? obj.userData.baseY : 0;
  obj.position.y = baseY + 1.6;
  activeBounces.push({ obj, baseY, elapsed: 0, duration: 0.6 });
  triggerSquashStretch(obj, 1.25);
  spawnSmokePoof3D(wx, wy + 0.5, wz, 0xFFFDF9, 8);
  spawnCoinFountain3D(wx, wy + 0.6, wz, 6, true);
}

function spawnSmokePoof3D(wx, wy, wz, colorHex = 0xFFFDF9, count = 7) {
  for (let i = 0; i < count; i++) {
    const puff = new THREE.Mesh(
      GEO.sphere,
      new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.78 })
    );
    puff.scale.setScalar(0.45);
    puff.position.set(wx + (Math.random() - 0.5) * 0.8, wy, wz + (Math.random() - 0.5) * 0.8);
    puff.raycast = () => {};
    const a = (Math.PI * 2 * i) / count;
    scene.add(puff);
    activeParticles.push({
      mesh: puff,
      vx: Math.cos(a) * 1.45,
      vy: 1.55 + Math.random() * 1.35,
      vz: Math.sin(a) * 1.45,
      gravity: -0.45,
      floorY: -10,
      life: 0.78
    });
  }
}

function spawnSoapBubbleOrSteam3D(em) {
  if (activeParticles.length > 95) return;
  const isBubble = em.kind === 'bubble';
  const mat = new THREE.MeshBasicMaterial({
    color: isBubble ? (Math.random() < 0.7 ? 0xBAE6FD : 0xFEF08A) : 0xFFFDF9,
    transparent: true,
    opacity: isBubble ? 0.75 : 0.52
  });
  const m = new THREE.Mesh(GEO.sphere, mat);
  m.scale.setScalar(isBubble ? 0.16 + Math.random() * 0.14 : 0.22 + Math.random() * 0.12);
  m.position.set(
    em.wx + (Math.random() - 0.5) * 0.32,
    em.wy,
    em.wz + (Math.random() - 0.5) * 0.22
  );
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
    if (isSparkle) m.scale.setScalar(0.24);
    m.position.set(wx, wy, wz);
    m.raycast = () => {};
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.3;
    scene.add(m);
    activeParticles.push({
      mesh: m,
      vx: Math.cos(a) * 1.8,
      vy: 4.2 + Math.random() * 2.4,
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
  fg.position.set(lot.x + room.lx + 0.35, room.ly + 1.05, lot.z + room.lz + 0.75);
  const flyMat = new THREE.MeshBasicMaterial({ color: 0x4B4453 });
  for (let i = 0; i < 5; i++) {
    const fly = new THREE.Mesh(GEO.sphere, flyMat);
    fly.scale.setScalar(0.075);
    const a = (Math.PI * 2 * i) / 5;
    fly.position.set(Math.cos(a) * 0.44, (i % 2) * 0.2, Math.sin(a) * 0.44);
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
// 16. 카메라 포커스 & 우측 다이어리 호실 인스펙터
// =========================================================
function focusCameraOnRoom(roomId) {
  const room = findRoom(roomId);
  if (!room) return;
  const lot = getLot(room.lotId);
  focusedRoomId = roomId;

  const rg = lot3D[room.lotId]?.roomGroups[room.id];
  if (rg) triggerSquashStretch(rg, 0.9);

  const off = CAM_OFFSETS[camAzimuth].clone().normalize().multiplyScalar(19.5);
  const tx = lot.x + room.lx + 1.15;
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

  if (lot3D[lotId]?.root) {
    triggerSquashStretch(lot3D[lotId].root, 0.85);
  }

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

  dom.rfTitle.textContent = `${b.title} · ${room.name}`;
  dom.rfTierBadge.textContent = `Lv.${room.interiorLv}`;
  if (dom.rfBtnRename) {
    dom.rfBtnRename.onclick = () => openRenameBuildingModal(room.lotId);
  }

  if (!room.unlocked) {
    dom.rfBody.innerHTML = `
      <div class="diary-card text-center space-y-2.5">
        <div class="flex justify-center">${createCustomSVGIcon('gold_key', 34)}</div>
        <div class="diary-card-title">미개방 호실입니다</div>
        <p class="diary-muted-text">분양 오픈 후 리모델링과 세대 계약을 진행할 수 있습니다.</p>
        <button id="rf-btn-unlock" class="jelly-action-btn btn-gold-lip w-full">
          ${createCustomSVGIcon('coin_stack', 16)}
          <span>분양 오픈하기 (${room.unlockCost}만)</span>
        </button>
      </div>`;
    document.getElementById('rf-btn-unlock').onclick = () => {
      if (state.gold < room.unlockCost) { showToast('보유 자산이 부족합니다!', 'rose'); return; }
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
      <div class="diary-card space-y-2">
        <div class="flex items-center justify-between">
          <span class="diary-card-title text-[#065F46]">현재 공실</span>
          <span class="diary-pill-badge">적정 +${mRent}만</span>
        </div>
        <p class="diary-muted-text">세대 유형별로 3D 가구 배치와 층간소음·위생 상성이 적용됩니다.</p>
        <button id="rf-btn-recruit" class="jelly-action-btn btn-mint-lip w-full">
          ${createCustomSVGIcon('megaphone', 15)}
          <span>입주 세대 모집하기</span>
        </button>
      </div>`;
  } else {
    const h = room.household;
    const hDef = HOUSEHOLD_TYPES[h.type];
    const paid = getEffectiveRent(room);
    const chipsHtml = (hDef.tagChips || []).map((t) => `<span class="pastel-tag-chip">${t}</span>`).join('');

    hhHtml = `
      <div class="diary-card space-y-2.5">
        <div class="flex items-center gap-2.5">
          ${createNotebookArtworkSVG(`avatar_${h.type}`, 44)}
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-1">
              <span class="diary-card-title truncate">${h.familyName}</span>
              <span class="diary-pill-badge !bg-[#ECFDF5] !text-[#047857] !border-[#A7F3D0]">+${paid}만/${room.cycleSec}s</span>
            </div>
            <div class="diary-muted-text mt-0.5">${hDef.label} · ${hDef.memberCount}인 거주</div>
          </div>
        </div>

        <div class="flex flex-wrap gap-1">${chipsHtml}</div>

        <div class="space-y-1">
          <div class="flex items-center justify-between diary-body-text">
            <span class="flex items-center gap-1">${createCustomSVGIcon('heart_gauge', 14)} 행복도 <b>${Math.round(h.happiness)}%</b></span>
            ${room.evictionCountdown !== null ? `<span class="text-[#BE123C] font-display animate-pulse">퇴거 D-${Math.ceil(room.evictionCountdown)}s</span>` : ''}
          </div>
          <div class="candy-gauge-track">
            <div class="candy-gauge-fill ${h.happiness <= 35 ? 'candy-coral' : 'candy-mint'}" style="width:${Math.round(h.happiness)}%"></div>
          </div>
        </div>

        ${hDef.isHoarder ? `
          <div class="diary-soft-box space-y-1.5">
            <div class="flex items-center justify-between diary-body-text">
              <span>쓰레기 오염도: <b>${room.trashStage} / 3단계</b></span>
              ${room.trashStage >= 2 ? '<span class="text-[#BE123C] font-display">악취 민원!</span>' : ''}
            </div>
            <button id="rf-btn-clean" class="jelly-action-btn btn-sky-lip w-full">
              ${createCustomSVGIcon('broom_clean', 15)}
              <span>특수 청소 (${GAME_BALANCE.specialCleanCost}만)</span>
            </button>
          </div>
        ` : ''}

        <div class="grid grid-cols-2 gap-1.5 pt-0.5">
          <button id="rf-btn-soundproof" ${room.soundproofed ? 'disabled' : ''} class="jelly-action-btn btn-gold-lip">
            ${createCustomSVGIcon('soundproof_hammer', 15)}
            <span>${room.soundproofed ? '방음 완료' : `방음시공 (${GAME_BALANCE.soundproofCost}만)`}</span>
          </button>
          <button id="rf-btn-gift" class="jelly-action-btn btn-mint-lip">
            ${createCustomSVGIcon('gift_box', 15)}
            <span>중재선물 (${GAME_BALANCE.mediationGiftCost}만)</span>
          </button>
          <button id="rf-btn-relocate" class="jelly-action-btn btn-sky-lip">
            ${createCustomSVGIcon('relocate_move', 15)}
            <span>빈방 이사 (${GAME_BALANCE.relocateCost}만)</span>
          </button>
          <button id="rf-btn-evict" class="jelly-action-btn btn-coral-lip">
            ${createCustomSVGIcon('evict_stamp', 15)}
            <span>강제 퇴거</span>
          </button>
        </div>
      </div>`;
  }

  const remodelHtml = `
    <div class="diary-card space-y-2">
      <div class="flex items-center justify-between">
        <span class="diary-card-title">인테리어: ${tier.name}</span>
        ${room.soundproofed ? '<span class="diary-pill-badge !bg-[#E0F2FE] !text-[#0369A1]">방음완비</span>' : ''}
      </div>
      <div class="diary-muted-text">${nextTier ? `다음 단계: ${nextTier.name} (월세 +${nextTier.rentAdd - tier.rentAdd}만)` : '최고급 로얄 크림 부티크 완성! (+25% 세트보너스)'}</div>
      ${nextTier ? `
        <button id="rf-btn-upgrade" class="jelly-action-btn btn-gold-lip w-full">
          ${createCustomSVGIcon('sparkle_star', 15)}
          <span>Lv.${room.interiorLv + 1} 업그레이드 (${nextTier.cost}만)</span>
        </button>
      ` : ''}
    </div>`;

  dom.rfBody.innerHTML = hhHtml + remodelHtml;

  const recBtn = document.getElementById('rf-btn-recruit');
  if (recBtn) recBtn.onclick = () => openRecruitModal(room);

  const upBtn = document.getElementById('rf-btn-upgrade');
  if (upBtn && nextTier) {
    upBtn.onclick = () => {
      if (state.gold < nextTier.cost) { showToast('리모델링 시공 비용이 부족합니다!', 'rose'); return; }
      addGold(-nextTier.cost);
      room.interiorLv += 1;
      if (room.household) room.household.happiness = Math.min(100, room.household.happiness + 18);
      rebuildRoom3D(room);
      triggerDropBounce(lot3D[room.lotId].roomGroups[room.id], lot.x + room.lx, room.ly, lot.z + room.lz);
      triggerSquashStretch(lot3D[room.lotId].root, 0.75);
      showToast(`${room.name} [${nextTier.name}] 시공 완료!`, 'emerald');
      renderFocusedRoomDrawer();
      saveState();
    };
  }

  const cleanBtn = document.getElementById('rf-btn-clean');
  if (cleanBtn) cleanBtn.onclick = () => executeSpecialClean(room);

  const spBtn = document.getElementById('rf-btn-soundproof');
  if (spBtn) {
    spBtn.onclick = () => {
      if (state.gold < GAME_BALANCE.soundproofCost) { showToast('방음 시공비가 부족합니다!', 'rose'); return; }
      addGold(-GAME_BALANCE.soundproofCost);
      room.soundproofed = true;
      state.stats.crisisResolved += 1;
      rebuildRoom3D(room);
      triggerSquashStretch(lot3D[room.lotId].roomGroups[room.id], 1.1);
      spawnSmokePoof3D(lot.x + room.lx, room.ly + 0.6, lot.z + room.lz, 0xFFFDF9, 9);
      showToast(`${room.name} 층간 방음 시공 완료!`, 'emerald');
      renderFocusedRoomDrawer();
      saveState();
    };
  }

  const giftBtn = document.getElementById('rf-btn-gift');
  if (giftBtn) {
    giftBtn.onclick = () => {
      if (state.gold < GAME_BALANCE.mediationGiftCost) { showToast('선물 비용이 부족합니다!', 'rose'); return; }
      addGold(-GAME_BALANCE.mediationGiftCost);
      room.household.happiness = Math.min(100, room.household.happiness + 30);
      room.evictionCountdown = null;
      state.stats.crisisResolved += 1;
      rebuildRoom3D(room);
      triggerSquashStretch(lot3D[room.lotId].roomGroups[room.id], 1.0);
      showToast(`${room.name} 세대에 화해 선물을 전달해 행복도가 회복됐어요!`, 'emerald');
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
    showToast(`특수 청소 비용(${GAME_BALANCE.specialCleanCost}만)이 부족합니다!`, 'rose');
    return;
  }
  const lot = getLot(room.lotId);
  addGold(-GAME_BALANCE.specialCleanCost);
  room.trashStage = 0;
  room.trashProgress = 0;
  clearOdorFlies(room.id);
  state.stats.crisisResolved += 1;

  rebuildRoom3D(room);
  triggerSquashStretch(lot3D[room.lotId].roomGroups[room.id], 1.15);
  spawnSmokePoof3D(lot.x + room.lx, room.ly + 0.7, lot.z + room.lz, 0xFFFDF9, 12);
  spawnCoinFountain3D(lot.x + room.lx, room.ly + 0.9, lot.z + room.lz, 8, true);

  showRoomSpeech(room, HOUSEHOLD_TYPES.hikikomori.cleanedGrumbleQuote, true, 4.4);
  showToast('특수 청소 완료! 피자박스와 쓰레기 더미를 말끔히 치웠습니다!', 'emerald');
  if (focusedRoomId === room.id) renderFocusedRoomDrawer();
  if (!dom.notebookModal.classList.contains('hidden')) renderNotebookSplitView();
  saveState();
}

function executeDramaticEviction(room) {
  if (!room.household) return;
  const lot = getLot(room.lotId);
  const evictedType = room.household.type;
  const evictedName = room.household.familyName;

  dom.evictionOverlay.classList.remove('hidden');
  dom.evictionStampBox.classList.remove('stamp-slam-anim');
  void dom.evictionStampBox.offsetWidth;
  dom.evictionStampBox.classList.add('stamp-slam-anim');
  setTimeout(() => dom.evictionOverlay.classList.add('hidden'), 1200);

  const outMesh = createChibiPerson3D(evictedType === 'hikikomori' ? 'hikikomori' : 'student', false);
  outMesh.position.set(lot.x, 0.25, lot.z + 3.8);
  const bag = createRoundedToyMesh(0.38, 0.34, 0.34, MAT.movingBox, 0.32, 0.45, 0.14, 0.08);
  outMesh.add(bag);
  scene.add(outMesh);

  let walkT = 0;
  const walkInt = setInterval(() => {
    walkT += 0.04;
    outMesh.position.z += 0.18;
    outMesh.position.y = 0.25 + Math.abs(Math.sin(walkT * 12)) * 0.12;
    spawnFootstepPuff(outMesh.position.x, 0.1, outMesh.position.z, 0.16);
    if (walkT >= 2.2) {
      clearInterval(walkInt);
      scene.remove(outMesh);
    }
  }, 35);

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
  triggerSquashStretch(lot3D[room.lotId].root, 1.1);
  spawnSmokePoof3D(lot.x + room.lx, room.ly + 0.8, lot.z + room.lz, 0xFFFDF9, 14);

  showToast(`[${room.name}] ${evictedName} 강제 퇴거 및 원상복구 완료!`, 'amber');
  if (focusedRoomId === room.id) renderFocusedRoomDrawer();
  if (!dom.notebookModal.classList.contains('hidden')) renderNotebookSplitView();
  saveState();
}

function relocateHouseholdToVacant(room) {
  const b = state.buildings[room.lotId];
  const vacant = b.rooms.find((r) => r.unlocked && !r.household && r.id !== room.id);
  if (!vacant) {
    showToast('같은 건물 내 비어 있는 개방 호실이 없습니다! 먼저 다른 호실을 오픈해주세요.', 'rose');
    return;
  }
  if (state.gold < GAME_BALANCE.relocateCost) {
    showToast('이사 지원 비용이 부족합니다!', 'rose');
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
  showToast(`${vacant.household.familyName}을(를) [${vacant.name}]로 쾌적하게 이전시켰습니다!`, 'emerald');
  saveState();
}

// =========================================================
// 17. 다꾸 스프링 제본 수첩 & [이름 변경] 버튼 연동
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
  const clampedPct = Math.max(12, Math.min(88, pct));
  bubbleEl.style.left = `${clampedPct}%`;
  bubbleEl.textContent = textFn(val);
}

function renderNotebookSplitView() {
  document.querySelectorAll('.ntab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.ntab === activeNotebookTab);
  });

  if (activeNotebookTab === 'quests') {
    if (!selectedSplitItemId || !QUEST_LIST.some((q) => q.id === selectedSplitItemId)) {
      const firstReady = QUEST_LIST.find((q) => !state.claimedQuests.includes(q.id) && q.check(state));
      const firstOpen = QUEST_LIST.find((q) => !state.claimedQuests.includes(q.id));
      selectedSplitItemId = (firstReady || firstOpen || QUEST_LIST[0]).id;
    }

    dom.splitLeftList.innerHTML = QUEST_LIST.map((q, idx) => {
      const claimed = state.claimedQuests.includes(q.id);
      const ready = !claimed && q.check(state);
      const sel = selectedSplitItemId === q.id;
      return `
        <div data-qid="${q.id}" class="diary-item-row ${sel ? 'selected' : ''}">
          ${claimed ? createNotebookArtworkSVG('stamp_well_done', 34) : createCustomSVGIcon('quest_trophy', 24)}
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between">
              <span class="diary-muted-text">미션 ${idx + 1}</span>
              <span class="diary-pill-badge ${claimed ? '!bg-[#FFF0F3] !text-[#BE123C]' : ready ? '!bg-[#ECFDF5] !text-[#047857]' : ''}">
                ${claimed ? '완료 도장' : ready ? '보상 대기!' : `+${q.reward}만`}
              </span>
            </div>
            <div class="diary-card-title truncate mt-0.5">${q.title}</div>
          </div>
        </div>`;
    }).join('');

    const curQ = QUEST_LIST.find((x) => x.id === selectedSplitItemId) || QUEST_LIST[0];
    const claimed = state.claimedQuests.includes(curQ.id);
    const ready = !claimed && curQ.check(state);
    const doneCount = state.claimedQuests.length;
    const pct = Math.round((doneCount / QUEST_LIST.length) * 100);

    dom.splitRightDetail.innerHTML = `
      <div class="space-y-3">
        <div class="diary-card space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="diary-card-title flex items-center gap-1.5">${createCustomSVGIcon('sparkle_star', 16)} 타운 도감 달성률</span>
            <span class="diary-pill-badge">${doneCount} / ${QUEST_LIST.length} (${pct}%)</span>
          </div>
          <div class="candy-gauge-track">
            <div class="candy-gauge-fill candy-gold" style="width:${pct}%"></div>
          </div>
        </div>

        <div class="diary-card relative space-y-3">
          ${claimed ? `<div class="absolute right-3.5 top-3">${createNotebookArtworkSVG('stamp_well_done', 62)}</div>` : ''}
          <div class="flex items-center gap-2 flex-wrap">
            <span class="diary-pill-badge !bg-[#FEF3C7] !border-[#FBBF24]">${createCustomSVGIcon('coin_stack', 14)} 보상 +${curQ.reward.toLocaleString()}만</span>
            <span class="diary-muted-text">${claimed ? '참 잘했어요! 스탬프 획득 완료' : ready ? '달성 완료! 지금 보상을 수령하세요' : '진행 중인 목표'}</span>
          </div>
          <h3 class="diary-card-title !text-[15px] pr-16">${curQ.title}</h3>
          <p class="diary-body-text pr-12">${curQ.desc}</p>

          <div class="pt-1 flex gap-2">
            ${ready ? `
              <button id="sp-claim-q" class="jelly-action-btn btn-mint-lip flex-1 py-2.5">
                ${createCustomSVGIcon('coin_stack', 16)}
                <span>보상 +${curQ.reward.toLocaleString()}만원 즉시 수령!</span>
              </button>
            ` : claimed ? `
              <div class="diary-soft-box flex-1 text-center diary-muted-text">이미 수령 완료된 퀘스트입니다</div>
            ` : `
              <button id="sp-go-q" class="jelly-action-btn btn-sky-lip flex-1 py-2.5">
                ${createCustomSVGIcon('red_house', 16)}
                <span>위치로 이동해 진행하기</span>
              </button>
            `}
          </div>
        </div>
      </div>`;

    dom.splitLeftList.querySelectorAll('.diary-item-row').forEach((el) => {
      el.onclick = () => { selectedSplitItemId = el.dataset.qid; renderNotebookSplitView(); };
    });

    const claimB = document.getElementById('sp-claim-q');
    if (claimB) {
      claimB.onclick = () => {
        state.claimedQuests.push(curQ.id);
        addGold(curQ.reward);
        showToast(`[${curQ.title}] 보상 +${curQ.reward}만원 수령 완료!`, 'emerald');
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
          const targetLot = getLot(curQ.focusLot);
          focusCameraOnLot(curQ.focusLot, 1.3);
          if (targetLot && !targetLot.owned) {
            if (lot3D[curQ.focusLot]?.signpostPivot) triggerSquashStretch(lot3D[curQ.focusLot].signpostPivot, 1.4);
            openLotDevModal(curQ.focusLot);
          }
        }
      };
    }
  } else if (activeNotebookTab === 'tenants') {
    const allRooms = Object.values(state.buildings).flatMap((b) => b.rooms.filter((r) => r.unlocked));
    if (!selectedSplitItemId || !allRooms.some((r) => r.id === selectedSplitItemId)) {
      selectedSplitItemId = allRooms[0]?.id;
    }

    dom.splitLeftList.innerHTML = allRooms.map((r) => {
      const h = r.household;
      const hDef = h ? HOUSEHOLD_TYPES[h.type] : null;
      const hasCrisis = h && (r.trashStage >= 2 || r.activeConflict || r.evictionCountdown !== null);
      const sel = selectedSplitItemId === r.id;
      return `
        <div data-rid="${r.id}" class="diary-item-row ${sel ? 'selected' : ''}">
          ${h ? createNotebookArtworkSVG(`avatar_${h.type}`, 40) : createCustomSVGIcon('gold_key', 24)}
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between">
              <span class="diary-card-title">${r.name}</span>
              <span class="diary-pill-badge ${hasCrisis ? '!bg-[#FFE4E9] !text-[#BE123C]' : '!bg-[#ECFDF5] !text-[#047857]'}">
                ${hasCrisis ? '케어 필요' : h ? `${Math.round(h.happiness)}%` : '공실'}
              </span>
            </div>
            <div class="diary-muted-text truncate">${h ? `${h.familyName} (${hDef.label})` : '입주자 모집 가능'}</div>
          </div>
        </div>`;
    }).join('');

    const curR = allRooms.find((r) => r.id === selectedSplitItemId);
    if (curR) {
      const h = curR.household;
      const hDef = h ? HOUSEHOLD_TYPES[h.type] : null;
      if (!h) {
        dom.splitRightDetail.innerHTML = `
          <div class="diary-card text-center space-y-3 !py-6">
            <div class="flex justify-center">${createCustomSVGIcon('red_house', 40)}</div>
            <h3 class="diary-card-title !text-[15px]">${curR.name}은 현재 공실입니다</h3>
            <p class="diary-muted-text">적정 월세 <b>${calcRoomRent(curR)}만원</b> · 새 입주 세대를 맞이해보세요!</p>
            <button id="sp-rec-now" class="jelly-action-btn btn-mint-lip px-5 py-2.5">
              ${createCustomSVGIcon('megaphone', 16)}
              <span>입주 지원자 확인하기</span>
            </button>
          </div>`;
      } else {
        const chipsHtml = (hDef.tagChips || []).map((c) => `<span class="pastel-tag-chip">${c}</span>`).join('');
        const noiseMeter = hDef.noiseOutput;
        const paid = getEffectiveRent(curR);

        dom.splitRightDetail.innerHTML = `
          <div class="diary-card space-y-3">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div class="flex items-center gap-3">
                ${createNotebookArtworkSVG(`avatar_${h.type}`, 46)}
                <div>
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="diary-card-title !text-[15px]">${curR.name} · ${h.familyName}</span>
                    <span class="diary-pill-badge !text-white !border-transparent" style="background:${hDef.accentHex}">${hDef.label}</span>
                  </div>
                  <div class="diary-muted-text mt-0.5">${hDef.traitDesc}</div>
                </div>
              </div>
              <button id="sp-focus-room" class="jelly-action-btn pill btn-sky-lip">
                ${createCustomSVGIcon('red_house', 14)}
                <span>방 위치로 이동</span>
              </button>
            </div>

            <div class="flex flex-wrap gap-1">${chipsHtml}</div>

            <div class="diary-soft-box grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div class="space-y-1">
                <div class="flex justify-between diary-body-text">
                  <span class="flex items-center gap-1">${createCustomSVGIcon('heart_gauge', 13)} 행복도</span>
                  <b>${Math.round(h.happiness)}%</b>
                </div>
                <div class="candy-gauge-track"><div class="candy-gauge-fill ${h.happiness <= 35 ? 'candy-coral' : 'candy-mint'}" style="width:${Math.round(h.happiness)}%"></div></div>
              </div>
              <div class="space-y-1">
                <div class="flex justify-between diary-body-text">
                  <span class="flex items-center gap-1">${createCustomSVGIcon('sparkle_star', 13)} 월세/한도</span>
                  <b>+${paid}/${h.maxBudget}만</b>
                </div>
                <div class="candy-gauge-track"><div class="candy-gauge-fill candy-gold" style="width:${Math.min(100, Math.round((paid / h.maxBudget) * 100))}%"></div></div>
              </div>
              <div class="space-y-1">
                <div class="flex justify-between diary-body-text">
                  <span>${hDef.isHoarder ? '오염도' : '소음지수'}</span>
                  <b>${hDef.isHoarder ? `${curR.trashStage}/3단계` : `${noiseMeter}%`}</b>
                </div>
                <div class="candy-gauge-track"><div class="candy-gauge-fill candy-sky" style="width:${hDef.isHoarder ? (curR.trashStage / 3) * 100 : noiseMeter}%"></div></div>
              </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
              <button id="sp-sound" ${curR.soundproofed ? 'disabled' : ''} class="jelly-action-btn btn-gold-lip">
                ${createCustomSVGIcon('soundproof_hammer', 15)}
                <span>${curR.soundproofed ? '방음 완료' : `방음시공 (${GAME_BALANCE.soundproofCost}만)`}</span>
              </button>
              <button id="sp-clean" ${!hDef.isHoarder ? 'disabled' : ''} class="jelly-action-btn btn-sky-lip">
                ${createCustomSVGIcon('broom_clean', 15)}
                <span>특수청소 (${GAME_BALANCE.specialCleanCost}만)</span>
              </button>
              <button id="sp-reloc" class="jelly-action-btn btn-mint-lip">
                ${createCustomSVGIcon('relocate_move', 15)}
                <span>호실이동 (${GAME_BALANCE.relocateCost}만)</span>
              </button>
              <button id="sp-evict" class="jelly-action-btn btn-coral-lip">
                ${createCustomSVGIcon('evict_stamp', 15)}
                <span>강제 퇴거</span>
              </button>
            </div>
          </div>`;
      }

      dom.splitLeftList.querySelectorAll('.diary-item-row').forEach((el) => {
        el.onclick = () => { selectedSplitItemId = el.dataset.rid; renderNotebookSplitView(); };
      });
      const fBtn = document.getElementById('sp-focus-room');
      if (fBtn) fBtn.onclick = () => { dom.notebookModal.classList.add('hidden'); focusCameraOnRoom(curR.id); };
      const cBtn = document.getElementById('sp-clean');
      if (cBtn) cBtn.onclick = () => executeSpecialClean(curR);
      const sBtn = document.getElementById('sp-sound');
      if (sBtn) {
        sBtn.onclick = () => {
          if (state.gold < GAME_BALANCE.soundproofCost) { showToast('방음 시공비가 부족합니다!', 'rose'); return; }
          addGold(-GAME_BALANCE.soundproofCost);
          curR.soundproofed = true;
          state.stats.crisisResolved += 1;
          rebuildRoom3D(curR);
          showToast(`${curR.name} 층간 방음 시공이 완료되었습니다!`, 'emerald');
          renderNotebookSplitView();
          saveState();
        };
      }
      const rlBtn = document.getElementById('sp-reloc');
      if (rlBtn) rlBtn.onclick = () => { dom.notebookModal.classList.add('hidden'); relocateHouseholdToVacant(curR); };
      const evBtn = document.getElementById('sp-evict');
      if (evBtn) evBtn.onclick = () => { dom.notebookModal.classList.add('hidden'); focusCameraOnRoom(curR.id); setTimeout(() => executeDramaticEviction(curR), 320); };
      const rcBtn = document.getElementById('sp-rec-now');
      if (rcBtn) rcBtn.onclick = () => { dom.notebookModal.classList.add('hidden'); focusCameraOnRoom(curR.id); openRecruitModal(curR); };
    }
  } else if (activeNotebookTab === 'manager') {
    const bList = Object.values(state.buildings);
    if (!selectedSplitItemId || !state.buildings[selectedSplitItemId]) selectedSplitItemId = bList[0].lotId;
    const curB = state.buildings[selectedSplitItemId];
    const grossRent = calcBuildingGrossCycle(curB);
    const netAfterMgr = grossRent - GAME_BALANCE.managerSalaryPerCycle;

    dom.splitLeftList.innerHTML = bList.map((b) => `
      <div data-bid="${b.lotId}" class="diary-item-row ${selectedSplitItemId === b.lotId ? 'selected' : ''}">
        ${createNotebookArtworkSVG('avatar_manager', 40)}
        <div class="min-w-0 flex-1">
          <div class="diary-card-title truncate">${b.title}</div>
          <div class="diary-muted-text">${b.manager.hired ? '1층 지배인 상주 근무중' : '미고용 (직접 관리)'}</div>
        </div>
      </div>`).join('');

    dom.splitRightDetail.innerHTML = `
      <div class="diary-card space-y-3">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-2.5">
            ${createNotebookArtworkSVG('avatar_manager', 46)}
            <div>
              <h3 class="diary-card-title !text-[15px]">[${curB.title}] 전문 지배인실</h3>
              <p class="diary-muted-text">1층 정문 앞 부스에 상주하며 특수청소·중재·자동 입주를 대행합니다.</p>
            </div>
          </div>
          <button id="sp-toggle-mgr" class="jelly-action-btn ${curB.manager.hired ? 'btn-coral-lip' : 'btn-mint-lip'}">
            ${createCustomSVGIcon('manager_cap', 15)}
            <span>${curB.manager.hired ? '지배인 해임' : `지배인 고용 (${GAME_BALANCE.managerHireFee}만)`}</span>
          </button>
        </div>

        <div class="diary-soft-box space-y-1">
          <div class="diary-card-title">지배인 고용 손익분기(ROI) 분석</div>
          <div class="diary-body-text">주기 총수익 <b class="text-[#047857]">+${grossRent}만원</b> · 고정 급여 <b class="text-[#BE123C]">-${GAME_BALANCE.managerSalaryPerCycle}만원/주기</b></div>
          <div class="diary-body-text ${netAfterMgr < 0 ? '!text-[#BE123C]' : '!text-[#047857]'}">
            ${netAfterMgr < 0
              ? `주의: 입주 호실이 적어 고용 시 주기당 ${netAfterMgr}만원 적자입니다! 호실을 늘린 뒤 선임하세요.`
              : `안정 흑자 구간! 급여 차감 후 주기당 +${netAfterMgr}만원 순수익이 발생합니다.`}
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div class="diary-card">
            <div class="flex justify-between diary-card-title">
              <span>자동 입주 최소 월세</span>
              <span class="diary-muted-text">40~260만</span>
            </div>
            <div class="coin-slider-wrap">
              <div id="tip-min-rent" class="coin-slider-bubble">최소 ${curB.manager.minRentFloor}만 원 이상 수취</div>
              <input id="slider-min-rent" type="range" min="40" max="260" step="10" value="${curB.manager.minRentFloor}" class="golden-coin-range" />
            </div>
          </div>

          <div class="diary-card">
            <div class="flex justify-between diary-card-title">
              <span>자동 케어 예산 한도</span>
              <span class="diary-muted-text">0~220만</span>
            </div>
            <div class="coin-slider-wrap">
              <div id="tip-auto-cap" class="coin-slider-bubble">최대 ${curB.manager.autoBudgetCap}만 원 지출</div>
              <input id="slider-auto-cap" type="range" min="0" max="220" step="15" value="${curB.manager.autoBudgetCap}" class="golden-coin-range" />
            </div>
          </div>
        </div>
      </div>`;

    dom.splitLeftList.querySelectorAll('.diary-item-row').forEach((el) => {
      el.onclick = () => { selectedSplitItemId = el.dataset.bid; renderNotebookSplitView(); };
    });

    const sMin = document.getElementById('slider-min-rent');
    const bMin = document.getElementById('tip-min-rent');
    const sCap = document.getElementById('slider-auto-cap');
    const bCap = document.getElementById('tip-auto-cap');

    updateCoinSliderTooltip(sMin, bMin, (v) => `최소 ${v}만 원 이상 수취`);
    updateCoinSliderTooltip(sCap, bCap, (v) => `최대 ${v}만 원 지출`);

    sMin.oninput = (e) => {
      curB.manager.minRentFloor = Number(e.target.value);
      updateCoinSliderTooltip(sMin, bMin, (v) => `최소 ${v}만 원 이상 수취`);
    };
    sCap.oninput = (e) => {
      curB.manager.autoBudgetCap = Number(e.target.value);
      updateCoinSliderTooltip(sCap, bCap, (v) => `최대 ${v}만 원 지출`);
    };

    document.getElementById('sp-toggle-mgr').onclick = () => {
      if (!curB.manager.hired) {
        if (state.gold < GAME_BALANCE.managerHireFee) { showToast('계약금이 부족합니다!', 'rose'); return; }
        addGold(-GAME_BALANCE.managerHireFee);
        curB.manager.hired = true;
        rebuildPublicInfraAndManager3D(curB.lotId);
        const booth = lot3D[curB.lotId]?.managerGroup?.children[0];
        if (booth) triggerSquashStretch(booth, 1.3);
        dom.notebookModal.classList.add('hidden');
        focusCameraOnLot(curB.lotId, 1.55);
        showToast(`[${curB.title}] 1층 정문 앞에 관리 부스와 지배인이 배치되었습니다!`, 'emerald');
      } else {
        curB.manager.hired = false;
        rebuildPublicInfraAndManager3D(curB.lotId);
        showToast(`[${curB.title}] 지배인을 해임하고 직접 관리로 전환했습니다.`, 'amber');
        renderNotebookSplitView();
      }
      saveState();
    };
  }

  // 탭 4: 건물장부 ([이름 변경] 버튼으로 옥상 현판·정문 명패 실시간 교체!)
  else if (activeNotebookTab === 'infra') {
    if (!selectedSplitItemId || !state.lots.some((l) => l.lotId === selectedSplitItemId)) {
      selectedSplitItemId = state.lots[0].lotId;
    }

    dom.splitLeftList.innerHTML = state.lots.map((l) => {
      const cat = l.devType ? DEVELOPMENT_CATALOG[l.devType] : null;
      return `
        <div data-lid="${l.lotId}" class="diary-item-row ${selectedSplitItemId === l.lotId ? 'selected' : ''}">
          ${cat ? createNotebookArtworkSVG(cat.artKey || 'shop_mart', 34) : createCustomSVGIcon('plus_pin', 24)}
          <div class="min-w-0 flex-1">
            <div class="diary-card-title truncate">${l.owned ? l.title : l.name}</div>
            <div class="diary-muted-text">${l.owned ? '운영 중' : `부지 개발 (${l.landPrice}만)`}</div>
          </div>
        </div>`;
    }).join('');

    const curLot = getLot(selectedSplitItemId) || state.lots[0];
    const curB = state.buildings[curLot.lotId];

    if (!curLot.owned) {
      dom.splitRightDetail.innerHTML = `
        <div class="diary-card text-center space-y-3 !py-6">
          <div class="flex justify-center">${createCustomSVGIcon('berry_farm', 40)}</div>
          <h3 class="diary-card-title !text-[15px]">${curLot.name} (미개발 꽃밭 빈터)</h3>
          <p class="diary-muted-text">태양광 발전소, 딸기 농장, 벚꽃 힐링 공원, 달콤 다방, 신규 주상복합을 세울 수 있습니다.</p>
          <button id="sp-open-dev" class="jelly-action-btn btn-mint-lip px-5 py-2.5">
            ${createCustomSVGIcon('plus_pin', 16)}
            <span>부지 개발하러 이동</span>
          </button>
        </div>`;
      document.getElementById('sp-open-dev').onclick = () => {
        dom.notebookModal.classList.add('hidden');
        focusCameraOnLot(curLot.lotId, 1.25);
        if (lot3D[curLot.lotId]?.signpostPivot) triggerSquashStretch(lot3D[curLot.lotId].signpostPivot, 1.35);
        openLotDevModal(curLot.lotId);
      };
    } else if (curB) {
      const bLv = calcBuildingLevel(curB);
      const infraCards = Object.values(PUBLIC_INFRA_CATALOG).map((inf) => {
        const installed = curB.infra[inf.key];
        return `
          <div class="diary-card flex flex-col justify-between gap-2.5">
            <div class="flex items-start gap-2.5">
              ${createNotebookArtworkSVG(inf.artKey, 38)}
              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between gap-1">
                  <span class="diary-card-title truncate">${inf.name}</span>
                  <span class="diary-pill-badge !bg-[#ECFDF5] !text-[#047857]">+${inf.rentBonusPct}%</span>
                </div>
                <p class="diary-muted-text mt-1">${inf.desc}</p>
              </div>
            </div>
            ${installed
              ? `<div class="diary-soft-box text-center diary-body-text !py-1.5 flex items-center justify-center gap-1.5">${createNotebookArtworkSVG('stamp_well_done', 22)} <span>3D 시공 완료됨</span></div>`
              : `<button data-ikey="${inf.key}" class="btn-buy-infra jelly-action-btn btn-gold-lip w-full">${createCustomSVGIcon('coin_stack', 15)}<span>시공하기 (${inf.cost}만)</span></button>`}
          </div>`;
      }).join('');

      const leftShopName = curLot.devType === 'mixed_2' ? '달콤 다방 (SWEET CAFE)' : '해피마트 24 (MINI MART 24)';
      const leftShopArt = curLot.devType === 'mixed_2' ? 'dev_bakery' : 'shop_mart';

      dom.splitRightDetail.innerHTML = `
        <div class="space-y-3">
          <div class="diary-card flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-2">
              ${createCustomSVGIcon('crown_badge', 24)}
              <span class="diary-card-title !text-[15px]">${curB.title}</span>
              <span class="diary-pill-badge !bg-[#FFE4EC] !text-[#BE123C]">Lv.${bLv}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <button id="sp-rename-bldg" class="jelly-action-btn pill btn-coral-lip">
                ${createCustomSVGIcon('edit_pen', 14)}
                <span>이름 변경</span>
              </button>
              <button id="sp-go-lot" class="jelly-action-btn pill btn-sky-lip">위치로 이동</button>
            </div>
          </div>

          <div class="diary-soft-box flex items-center justify-between gap-2 flex-wrap">
            <div class="flex items-center gap-2">
              ${createNotebookArtworkSVG(leftShopArt, 34)}
              ${createNotebookArtworkSVG('shop_wash', 34)}
              <div>
                <div class="diary-card-title">1층 입점 상가: ${leftShopName} & 뽀송 워시</div>
                <div class="diary-muted-text">11초마다 고정 상가 임대 수익 +28만원 자동 입금 중</div>
              </div>
            </div>
            <span class="diary-pill-badge !bg-[#FEF3C7]">성업 중</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">${infraCards}</div>
        </div>`;

      document.getElementById('sp-rename-bldg').onclick = () => openRenameBuildingModal(curLot.lotId);
      document.getElementById('sp-go-lot').onclick = () => {
        dom.notebookModal.classList.add('hidden');
        focusCameraOnLot(curLot.lotId, 1.35);
      };
      dom.splitRightDetail.querySelectorAll('.btn-buy-infra').forEach((btn) => {
        btn.onclick = () => {
          const inf = PUBLIC_INFRA_CATALOG[btn.dataset.ikey];
          if (state.gold < inf.cost) { showToast('설치 비용이 부족합니다!', 'rose'); return; }
          addGold(-inf.cost);
          curB.infra[inf.key] = true;
          rebuildPublicInfraAndManager3D(curB.lotId);
          triggerSquashStretch(lot3D[curLot.lotId].root, 1.0);
          showToast(`[${inf.name}] 3D 시공이 완료되었습니다!`, 'emerald');
          renderNotebookSplitView();
          saveState();
        };
      });
    } else {
      const cat = DEVELOPMENT_CATALOG[curLot.devType];
      dom.splitRightDetail.innerHTML = `
        <div class="diary-card space-y-3">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-2.5">
              ${createNotebookArtworkSVG(cat.artKey || 'dev_solar', 38)}
              <span class="diary-card-title !text-[15px]">${curLot.title}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <button id="sp-rename-dev" class="jelly-action-btn pill btn-coral-lip">
                ${createCustomSVGIcon('edit_pen', 14)}
                <span>이름 변경</span>
              </button>
              <button id="sp-go-devlot" class="jelly-action-btn pill btn-sky-lip">위치로 이동</button>
            </div>
          </div>
          <p class="diary-body-text">${cat.desc}</p>
          <div class="diary-soft-box diary-card-title !text-[#047857]">
            ${cat.cycleSec}초마다 +${cat.cycleProfit}만원 자동 수익 창출 · 타운 전체 월세 시너지 +${cat.rentSynergyPct}%
          </div>
        </div>`;
      document.getElementById('sp-rename-dev').onclick = () => openRenameBuildingModal(curLot.lotId);
      document.getElementById('sp-go-devlot').onclick = () => {
        dom.notebookModal.classList.add('hidden');
        focusCameraOnLot(curLot.lotId, 1.4);
      };
    }

    dom.splitLeftList.querySelectorAll('.diary-item-row').forEach((el) => {
      el.onclick = () => { selectedSplitItemId = el.dataset.lid; renderNotebookSplitView(); };
    });
  }
}

// =========================================================
// 18. 세대 입주 계약서 & 부지 개발 모달
// =========================================================
function openRecruitModal(room) {
  recruitRoomTarget = room;
  generateRecruitCandidates();
  dom.recRoomTitle.textContent = `${state.buildings[room.lotId].title} · ${room.name}`;
  renderRecruitCards();
  dom.recruitModal.classList.remove('hidden');
}

function generateRecruitCandidates() {
  const keys = Object.keys(HOUSEHOLD_TYPES);
  const shuffled = [...keys].sort(() => Math.random() - 0.5).slice(0, 3);
  if (!shuffled.includes('hikikomori') && Math.random() < 0.55) {
    shuffled[2] = 'hikikomori';
  }
  recruitCandidates = shuffled.map((k) => {
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

  dom.recCardsGrid.innerHTML = recruitCandidates.map((c, idx) => {
    const chips = (c.def.tagChips || []).map((t) => `<span class="pastel-tag-chip">${t}</span>`).join('');
    return `
      <div class="diary-card flex flex-col justify-between gap-2.5">
        <div class="space-y-2">
          <div class="flex items-center gap-2.5">
            ${createNotebookArtworkSVG(`avatar_${c.type}`, 44)}
            <div class="min-w-0">
              <div class="diary-card-title truncate">${c.familyName}</div>
              <span class="diary-pill-badge !text-white !border-transparent mt-0.5" style="background:${c.def.accentHex}">
                ${c.def.label} (${c.def.memberCount}인)
              </span>
            </div>
          </div>

          <div class="flex flex-wrap gap-1">${chips}</div>

          <div class="diary-soft-box space-y-1">
            <div class="flex justify-between diary-body-text">
              <span>희망 월세 한도</span>
              <b class="text-[#047857]">최대 ${c.budget}만원</b>
            </div>
            <div class="diary-muted-text !text-[#9F1239]">${c.def.traitDesc}</div>
            <div class="diary-muted-text">${c.def.furnitureDesc}</div>
          </div>
        </div>

        <button data-cidx="${idx}" class="btn-sign-hh jelly-action-btn btn-mint-lip w-full">
          ${createCustomSVGIcon('gold_key', 15)}
          <span>입주 계약 (+${Math.min(mRent, c.budget)}만/주기)</span>
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
    happiness: 88
  };
  room.rentTimer = room.cycleSec * 0.5;
  room.trashStage = typeKey === 'hikikomori' ? 1 : 0;
  room.trashProgress = 0;
  room.evictionCountdown = null;

  rebuildRoom3D(room);
  syncBuildingResidents3D(room.lotId);
  triggerDropBounce(lot3D[room.lotId].roomGroups[room.id], lot.x + room.lx, room.ly, lot.z + room.lz);
  showToast(`[${room.name}] ${HOUSEHOLD_TYPES[typeKey].label} (${fam}) 입주 완료!`, 'emerald');
  saveState();
}

function openLotDevModal(lotId) {
  const lot = getLot(lotId);
  if (!lot || lot.owned) return;
  devModalLotId = lotId;
  dom.devLotBadge.textContent = `${lot.name} · 토지비 ${lot.landPrice}만`;

  const devKeys = ['solar_plant', 'urban_farm', 'sakura_park', 'bakery_cafe', 'mixed_2'];
  dom.devCardsGrid.innerHTML = devKeys.map((k) => {
    const cat = DEVELOPMENT_CATALOG[k];
    const total = lot.landPrice + cat.buildCost;
    const ok = state.gold >= total;
    return `
      <div class="diary-card flex flex-col justify-between gap-2.5">
        <div class="space-y-1.5">
          <div class="flex items-center justify-between gap-1.5">
            <div class="flex items-center gap-2">
              ${createNotebookArtworkSVG(cat.artKey || 'dev_solar', 34)}
              <span class="diary-card-title">${cat.name}</span>
            </div>
            <span class="diary-pill-badge !bg-[#ECFDF5] !text-[#047857]">+${cat.rentSynergyPct}%</span>
          </div>
          <p class="diary-muted-text">${cat.desc}</p>
          <div class="diary-body-text">토지 ${lot.landPrice}만 + 시공 ${cat.buildCost}만</div>
        </div>
        <button data-dtype="${k}" ${!ok ? 'disabled' : ''} class="btn-build-dev jelly-action-btn ${ok ? 'btn-mint-lip' : 'btn-gold-lip'} w-full">
          ${createCustomSVGIcon('coin_stack', 15)}
          <span>개발 착공 (총 ${total.toLocaleString()}만)</span>
        </button>
      </div>`;
  }).join('');

  dom.devCardsGrid.querySelectorAll('.btn-build-dev').forEach((btn) => {
    btn.onclick = () => {
      const k = btn.dataset.dtype;
      const cat = DEVELOPMENT_CATALOG[k];
      const total = lot.landPrice + cat.buildCost;
      if (state.gold < total) { showToast('개발 자금이 부족합니다!', 'rose'); return; }

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
      showToast(`[${lot.name}]에 ${cat.name} 완공!`, 'emerald');
      saveState();
    };
  });

  dom.lotDevModal.classList.remove('hidden');
}

// =========================================================
// 19. 경제 틱 · 미니어처 라이프 · 플로팅 왕관 리본 배지 & 고대비 핀 오버레이
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

function tickEconomy(dt) {
  let anyPending = false;

  for (const b of Object.values(state.buildings)) {
    const lot = getLot(b.lotId);
    for (const r of b.rooms) {
      if (!r.unlocked || !r.household) continue;
      r.rentTimer += dt;
      if (r.rentTimer >= r.cycleSec) {
        r.rentTimer = 0;
        const rent = getEffectiveRent(r);
        state.stats.totalEarned += rent;
        if (camera.zoom >= 1.35) {
          addGold(rent);
          spawnCoinFountain3D(lot.x + r.lx, r.ly + 0.5, lot.z + r.lz, 8);
          spawnFloatText(lot.x + r.lx, r.ly + 1.85, lot.z + r.lz, `+${rent}만`);
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
        spawnFloatText(lot.x, 2.5, lot.z + 3.2, '상가 +28만');
      }
    }
    if (b.pendingCoins > 0) anyPending = true;
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
      addGold(cat.cycleProfit);
      triggerSquashStretch(lot3D[dev.lotId]?.root, 0.85);
      spawnCoinFountain3D(lot.x, 1.8, lot.z, 8);
      spawnFloatText(lot.x, 3.2, lot.z, `+${cat.cycleProfit}만`);
    }
  }

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

  if (lot) setPinPos(el, project(lot.x + room.lx, room.ly + 1.72, lot.z + room.lz + 0.4));
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
  // 세탁기 마스코트 비누방울 & 달콤 다방 커피 김 파티클 실시간 발사!
  facadeEmitters.forEach((em) => {
    em.timer -= dt;
    if (em.timer <= 0) {
      em.timer = em.kind === 'bubble' ? 0.42 : 0.55;
      spawnSoapBubbleOrSteam3D(em);
    }
  });

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

      const dx = ac.tx - ac.cx;
      const dz = ac.tz - ac.cz;
      const dist = Math.hypot(dx, dz);

      if (dist > 0.06) {
        ac.phase += dt * 12;
        ac.cx += (dx / dist) * (ac.isHoarder ? 1.05 : 1.85) * dt;
        ac.cz += (dz / dist) * (ac.isHoarder ? 1.05 : 1.85) * dt;
        ac.mesh.rotation.y = Math.atan2(dx, dz);
        ac.mesh.position.set(ac.cx, ac.room.ly + 0.15 + Math.abs(Math.sin(ac.phase)) * 0.075, ac.cz);

        if (parts) {
          const swing = Math.sin(ac.phase) * 0.45;
          parts.legL.rotation.x = swing;
          parts.legR.rotation.x = -swing;
          parts.armL.rotation.x = -swing * 0.7;
          parts.armR.rotation.x = swing * 0.7;
          if (parts.topperPivot) parts.topperPivot.rotation.x = -Math.abs(Math.sin(ac.phase)) * 0.22;
        }

        ac.puffTimer -= dt;
        if (ac.puffTimer <= 0 && lot && currentShellOpacity < 0.9 && ac.mesh.visible) {
          ac.puffTimer = 0.28;
          spawnFootstepPuff(lot.x + ac.cx, ac.room.ly + 0.15, lot.z + ac.cz, 0.16);
        }
      } else {
        ac.mesh.position.set(ac.cx, ac.room.ly + 0.15, ac.cz);
        if (parts) {
          parts.legL.rotation.x *= 0.82;
          parts.legR.rotation.x *= 0.82;
          parts.armL.rotation.x *= 0.82;
          parts.armR.rotation.x *= 0.82;
        }
        ac.timer -= dt;
        if (ac.timer <= 0) {
          ac.timer = 2.8 + Math.random() * 3.0;
          const rx = ac.isHoarder ? 0.55 : 1.55;
          ac.tx = ac.room.lx + (Math.random() - 0.5) * rx * 2;
          ac.tz = ac.room.lz + (Math.random() - 0.5) * 2.1;

          if (idx === 0 && camera.zoom >= 1.32 && !speechEls[ac.room.id] && Math.random() < 0.5) {
            const r = ac.room;
            if (r.household) {
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
              showRoomSpeech(r, line, bad, 3.8);
            }
          }
        }
      }
    });
  }

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

      p.puffTimer -= dt;
      if (p.puffTimer <= 0) {
        p.puffTimer = 0.24;
        spawnFootstepPuff(p.mesh.position.x, 0.08, p.mesh.position.z, 0.14);
      }
    } else {
      p.mesh.position.y = 0.08 + Math.sin(nowSec * 3.5 + p.phase) * 0.015;
      p.timer -= dt;
      if (p.timer <= 0) {
        p.timer = 2.0 + Math.random() * 2.5;
        p.tx = p.homeX + (Math.random() - 0.5) * 4.2;
        p.tz = p.homeZ + (Math.random() - 0.5) * 3.0;
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
    if (sf.zPos > 25.5) sf.zPos = -25.5;
    const sx = getStreamXAtZ(sf.zPos);
    const bob = Math.sin(nowSec * 3.2 + sf.phase) * 0.05;
    sf.mesh.position.set(sx, 0.14 + bob, sf.zPos);
    sf.mesh.rotation.z = Math.sin(nowSec * 2.5 + sf.phase) * 0.08;
    sf.mesh.rotation.y = Math.sin(nowSec * 0.9 + sf.phase) * 0.22;

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
      scene.remove(wr.mesh);
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
    if (af.isPetal) {
      af.mesh.rotation.x += dt * 1.8;
      af.mesh.rotation.z += dt * 1.4;
      if (af.mesh.position.y < 0.3) {
        af.mesh.position.y = 12.5;
        af.mesh.position.x = (Math.random() - 0.5) * 48;
        af.mesh.position.z = (Math.random() - 0.5) * 42;
      }
    } else {
      const pulse = 0.09 + Math.abs(Math.sin(nowSec * 2.2 + af.phase)) * 0.06;
      af.mesh.scale.setScalar(pulse);
      if (af.mesh.position.y > 13.5) {
        af.mesh.position.y = 1.2;
        af.mesh.position.x = (Math.random() - 0.5) * 46;
        af.mesh.position.z = (Math.random() - 0.5) * 40;
      }
    }
    if (af.mesh.position.x > 26) af.mesh.position.x = -26;
    if (af.mesh.position.z > 24) af.mesh.position.z = -24;
  });

  streetInteractiveProps.forEach((sp) => {
    if (sp.kind === 'postbox') {
      sp.wiggleTimer -= dt;
      if (sp.wiggleTimer <= 0) {
        sp.wiggleTimer = 5.5 + Math.random() * 3.0;
        triggerSquashStretch(sp.mesh, 0.9);
      }
      sp.mesh.rotation.z = Math.sin(nowSec * 4.5) * 0.03;
    } else if (sp.kind === 'catBasket' && sp.catGroup) {
      const s = 1 + Math.sin(nowSec * 2.6) * 0.055;
      sp.catGroup.scale.set(s, 1 / s, s);
    } else if (sp.kind === 'car') {
      sp.mesh.position.x += sp.dir * sp.speed * dt;
      if (sp.mesh.position.x > 0.6) {
        sp.dir = -1;
        sp.mesh.rotation.y = Math.PI;
        sp.mesh.position.z = 3.35;
      } else if (sp.mesh.position.x < -16.5) {
        sp.dir = 1;
        sp.mesh.rotation.y = 0;
        sp.mesh.position.z = 2.55;
      }
      sp.mesh.position.y = 0.1 + Math.abs(Math.sin(nowSec * 14)) * 0.025;
    }
  });

  for (const reg of Object.values(lot3D)) {
    if (reg.elevatorCar) {
      reg.elevatorCar.position.y = 4.3 + Math.sin(nowSec * 1.2) * 2.65;
    }
    if (reg.signpostPivot) {
      const isHovered = hoveredLotId === reg.lotId;
      reg.signpostPivot.rotation.z = Math.sin(nowSec * (isHovered ? 8.5 : 2.2)) * (isHovered ? 0.14 : 0.035);
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

  careTimer -= dt;
  if (careTimer <= 0) {
    careTimer = 11.5 + Math.random() * 5.0;
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

  setPinPos(btn, project(lot.x, 5.5, lot.z + 2.5));

  btn.onclick = (e) => {
    e.stopPropagation();
    const idx = careBubbles.findIndex((x) => x.id === id);
    if (idx !== -1) careBubbles.splice(idx, 1);
    btn.remove();
    addGold(tpl.cashReward);
    triggerSquashStretch(lot3D[lot.lotId]?.root, 0.9);
    spawnCoinFountain3D(lot.x, 3.5, lot.z + 2.0, 9);
    spawnFloatText(lot.x, 5.2, lot.z + 2.0, `+${tpl.cashReward}만`);
    showToast(tpl.toastMsg, 'emerald');
  };
  dom.careLayer.appendChild(btn);
  careBubbles.push({ id, el: btn, wx: lot.x, wy: 5.5, wz: lot.z + 2.5 });
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

// [요구사항 2-2 & 4] 파스텔 왕관 리본 타이틀 배지 & 고대비 미니 인디케이터 핀 생성
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
      devPin.innerHTML = `${createCustomSVGIcon('plus_pin', 15)}<span>부지 개발</span>`;
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
        focusCameraOnLot(lot.lotId, b ? 1.65 : 1.35);
      }
    };
    dom.lotsLayer.appendChild(el);
    lotOverlayEls[lot.lotId] = el;
  }

  for (const b of Object.values(state.buildings)) {
    for (const r of b.rooms) {
      const rEl = document.createElement('div');
      rEl.className = 'world-pin room-clay-chip';
      rEl.dataset.sig = '';
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
  triggerSquashStretch(lot3D[lotId]?.root, 1.15);
  spawnCoinFountain3D(lot.x, 8.5, lot.z, 12);
  spawnFloatText(lot.x, 10.2, lot.z, `+${amt.toLocaleString()}만`);
}

function updateProjectedOverlays() {
  const isCloseUp = camera.zoom >= 1.28;
  const readyQuests = QUEST_LIST.filter((q) => !state.claimedQuests.includes(q.id) && q.check(state)).length;
  let tenantCrisisCount = 0;

  for (const lot of state.lots) {
    if (!lot.owned) {
      const devPin = devActionPinEls[lot.lotId];
      if (!devPin) continue;
      const canAfford = state.gold >= lot.landPrice + 220;
      const showDevPin = !isCloseUp && (canAfford || hoveredLotId === lot.lotId);
      devPin.classList.toggle('hidden', !showDevPin);
      if (showDevPin) setPinPos(devPin, project(lot.x, 2.55, lot.z));
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
      // 줌인 시 내부 시야 확보를 위해 부드럽게 페이드아웃!
      el.style.opacity = isCloseUp ? '0' : '1';
      el.style.pointerEvents = isCloseUp ? 'none' : 'auto';
      setPinPos(el, project(lot.x, 11.45, lot.z));
    } else {
      const cat = DEVELOPMENT_CATALOG[lot.devType];
      const sig = `dev_${lot.title}`;
      if (el.dataset.sig !== sig) {
        el.dataset.sig = sig;
        el.className = 'world-pin lot-clay-badge';
        el.innerHTML = `${createCustomSVGIcon(cat.svgIcon, 17)}<span>${lot.title} (+${cat.cycleProfit}만)</span>`;
      }
      el.style.opacity = isCloseUp ? '0.2' : '1';
      setPinPos(el, project(lot.x, 4.7, lot.z));
    }
  }

  for (const b of Object.values(state.buildings)) {
    const lot = getLot(b.lotId);
    for (const r of b.rooms) {
      const rEl = roomOverlayEls[r.id];
      const cPin = crisisPinEls[r.id];
      const hasCrisis = r.household && (r.evictionCountdown !== null || r.trashStage >= 2 || r.activeConflict);
      if (hasCrisis) tenantCrisisCount += 1;

      const canUpgradeRoom = r.unlocked && r.interiorLv === 0 && state.gold >= 65;

      if (cPin) {
        if (!isCloseUp && hasCrisis) {
          cPin.className = 'world-pin action-indicator-pin pin-crisis';
          const label =
            r.evictionCountdown !== null ? `퇴거 D-${Math.ceil(r.evictionCountdown)}s` :
            r.trashStage >= 2 ? '청소 필요' : '수리 필요';
          const sig = `c_${label}`;
          if (cPin.dataset.sig !== sig) {
            cPin.dataset.sig = sig;
            cPin.innerHTML = `${createCustomSVGIcon('soundproof_hammer', 15)}<span>${label}</span>`;
          }
          setPinPos(cPin, project(lot.x + r.lx, r.ly + 2.4, lot.z + r.lz + 1.8));
        } else if (isCloseUp && canUpgradeRoom && focusedRoomId !== r.id) {
          cPin.className = 'world-pin action-indicator-pin pin-upgrade';
          const sig = 'up_ready';
          if (cPin.dataset.sig !== sig) {
            cPin.dataset.sig = sig;
            cPin.innerHTML = `${createCustomSVGIcon('sparkle_star', 14)}<span>업그레이드</span>`;
          }
          setPinPos(cPin, project(lot.x + r.lx, r.ly + 1.45, lot.z + r.lz + 1.1));
        } else {
          cPin.classList.add('hidden');
        }
      }

      if (rEl) {
        rEl.style.opacity = isCloseUp ? '1' : '0';
        rEl.style.pointerEvents = isCloseUp ? 'auto' : 'none';
        if (isCloseUp) {
          rEl.classList.toggle('active-room', focusedRoomId === r.id);
          let sig = '';
          if (!r.unlocked) {
            sig = `lock_${r.unlockCost}`;
            if (rEl.dataset.sig !== sig) {
              rEl.dataset.sig = sig;
              rEl.innerHTML = `${createCustomSVGIcon('gold_key', 14)}<span>${r.name} (${r.unlockCost}만)</span>`;
            }
          } else if (!r.household) {
            const mr = calcRoomRent(r);
            sig = `vac_${mr}`;
            if (rEl.dataset.sig !== sig) {
              rEl.dataset.sig = sig;
              rEl.innerHTML = `${createCustomSVGIcon('red_house', 14)}<span>${r.name} · 공실 (+${mr}만)</span>`;
            }
          } else {
            const rem = Math.max(1, Math.ceil(r.cycleSec - r.rentTimer));
            const paid = getEffectiveRent(r);
            const warn =
              r.evictionCountdown !== null ? ` · D-${Math.ceil(r.evictionCountdown)}s` :
              r.trashStage >= 2 ? ' · 악취!' :
              r.activeConflict === 'noise' ? ' · 소음!' : '';
            sig = `occ_${r.household.type}_${paid}_${rem}_${warn}`;
            if (rEl.dataset.sig !== sig) {
              rEl.dataset.sig = sig;
              rEl.innerHTML = `${createCustomSVGIcon('coin_stack', 14)}<span>${r.name} +${paid}만 (${rem}s)${warn}</span>`;
            }
          }
          setPinPos(rEl, project(lot.x + r.lx, r.ly + 2.55, lot.z + r.lz));
        }
      }

      const spEl = speechEls[r.id];
      if (spEl) {
        spEl.style.opacity = isCloseUp ? '1' : '0';
        if (isCloseUp) setPinPos(spEl, project(lot.x + r.lx, r.ly + 1.72, lot.z + r.lz + 0.4));
      }
    }

    if (managerTagEls[b.lotId]) {
      setPinPos(managerTagEls[b.lotId], project(lot.x + 0.5, 2.4, lot.z + 4.1));
    }
  }

  for (const cb of careBubbles) {
    setPinPos(cb.el, project(cb.wx, cb.wy, cb.wz));
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
      dom.modalAlertSummary.textContent = `민원 케어 ${tenantCrisisCount}건`;
      dom.modalAlertSummary.classList.remove('hidden');
    } else {
      dom.modalAlertSummary.classList.add('hidden');
    }
  }
}

// =========================================================
// 20. HUD 카운팅 · 씬 초기화 · 입력 바인딩
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
  dom.hudNetIncome.className = `font-num text-xs sm:text-base leading-tight mt-0.5 ${roundedNet >= 0 ? 'text-[#059669]' : 'text-[#E11D48]'}`;

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
  el.innerHTML = `${createCustomSVGIcon(iconName, 18)}<span>${msg}</span>`;
  dom.toastContainer.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-8px)';
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
      hudAnim.shownGold = state.gold;
      hudAnim.targetGold = state.gold;
    }
  } catch (e) {
    console.warn('Load failed:', e);
  }
}

function updateCameraFrustum() {
  const aspect = window.innerWidth / window.innerHeight;
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
  camera = new THREE.OrthographicCamera(
    (-baseH * aspect) / 2,
    (baseH * aspect) / 2,
    baseH / 2,
    -baseH / 2,
    -120,
    260
  );
  camera.position.copy(OVERVIEW_LOOK.clone().add(CAM_OFFSETS[0]));
  camera.zoom = 0.88;
  camera.updateProjectionMatrix();

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
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
  controls.minZoom = 0.55;
  controls.maxZoom = 2.9;
  controls.minPolarAngle = Math.PI * 0.16;
  controls.maxPolarAngle = Math.PI * 0.43;
  controls.screenSpacePanning = true;
  controls.update();

  hemiLight = new THREE.HemisphereLight(0xFFF0F6, 0xFFE0C8, 1.22);
  scene.add(hemiLight);

  dirLight = new THREE.DirectionalLight(0xFFF6E8, 1.48);
  dirLight.position.set(24, 38, 28);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 4;
  dirLight.shadow.camera.far = 110;
  dirLight.shadow.camera.left = -36;
  dirLight.shadow.camera.right = 36;
  dirLight.shadow.camera.top = 36;
  dirLight.shadow.camera.bottom = -36;
  dirLight.shadow.bias = -0.0005;
  dirLight.shadow.normalBias = 0.025;
  scene.add(dirLight);

  const pastelShadowFill = new THREE.DirectionalLight(0xF3E8FF, 0.58);
  pastelShadowFill.position.set(-24, 18, -18);
  scene.add(pastelShadowFill);

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
    ['rf-ico-house', 'red_house', 18],
    ['rf-btn-rename', 'edit_pen', 12],
    ['fab-svg-slot', 'town_notebook', 28],
    ['modal-ico-notebook', 'town_notebook', 24],
    ['tab-ico-quests', 'quest_trophy', 15],
    ['tab-ico-tenants', 'megaphone', 15],
    ['tab-ico-manager', 'manager_cap', 15],
    ['tab-ico-infra', 'elevator', 15],
    ['dev-ico-header', 'solar_panel', 24],
    ['rec-ico-header', 'gold_key', 24],
    ['rename-ico-crown', 'crown_badge', 22],
    ['rename-ico-pen', 'edit_pen', 15],
    ['stamp-ico-slot', 'evict_stamp', 32]
  ];
  for (const [id, name, size] of mounts) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = createCustomSVGIcon(name, size);
  }

  const binderEl = document.getElementById('notebook-binder-rings');
  if (binderEl) {
    binderEl.innerHTML = Array.from({ length: 8 })
      .map(() => createNotebookArtworkSVG('binder_ring'))
      .join('');
  }
}

function bindUIAndInput() {
  window.addEventListener('pointerdown', () => {
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(() => {});
    }
  }, { once: true });

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

    const validHit = hits.find((h) => !(h.object.userData.isShell && currentShellOpacity < 0.65));
    if (validHit) {
      renderer.domElement.style.cursor = 'pointer';
      const ud = validHit.object.userData;
      hoveredRoomId = currentShellOpacity < 0.78 && ud.roomId ? ud.roomId : null;
      hoveredLotId = ud.lotId || null;
      if (ud.isShopSign && hoveredShopMesh !== validHit.object) {
        hoveredShopMesh = validHit.object;
        triggerSquashStretch(validHit.object, 0.75);
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
    if (Math.hypot(e.clientX - downX, e.clientY - downY) >= 5) return;

    pointerNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointerNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointerNDC, camera);
    const hits = raycaster.intersectObjects(pickableMeshes, false);
    const validHit = hits.find((h) => !(h.object.userData.isShell && currentShellOpacity < 0.65));

    if (validHit) {
      const ud = validHit.object.userData;
      if (ud.isRenameSign && ud.lotId) {
        openRenameBuildingModal(ud.lotId);
      } else if (ud.isShopSign) {
        triggerSquashStretch(validHit.object, 1.35);
        spawnSmokePoof3D(validHit.point.x, validHit.point.y + 0.2, validHit.point.z, 0xFFFDF9, 6);
        if (ud.shopLabel) showToast(ud.shopLabel, 'emerald');
      } else if (ud.openNotebookTab) {
        selectedSplitItemId = ud.lotId;
        openNotebookModal(ud.openNotebookTab);
      } else if (ud.isStreetProp && ud.propRoot) {
        triggerSquashStretch(ud.propRoot, 1.35);
        spawnSmokePoof3D(validHit.point.x, validHit.point.y + 0.3, validHit.point.z, 0xFFFDF9, 5);
        if (ud.label) showToast(ud.label, 'amber');
      } else if (ud.roomId && currentShellOpacity < 0.85) {
        focusCameraOnRoom(ud.roomId);
      } else if (ud.lotId) {
        const lot = getLot(ud.lotId);
        if (lot && !lot.owned) {
          const reg = lot3D[lot.lotId];
          if (reg?.signpostPivot) triggerSquashStretch(reg.signpostPivot, 1.55);
          if (reg?.root) triggerSquashStretch(reg.root, 1.05);
          spawnSmokePoof3D(lot.x, 1.1, lot.z, 0xFFFDF9, 7);
          openLotDevModal(lot.lotId);
        } else if (lot) {
          focusCameraOnLot(lot.lotId, 1.65);
        }
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
    if (state.gold < 10) { showToast('탐색 비용(10만)이 부족합니다!', 'rose'); return; }
    addGold(-10);
    generateRecruitCandidates();
    renderRecruitCards();
  };

  // 빌딩 이름 작명 모달 이벤트 바인딩
  document.getElementById('btn-close-rename').onclick = () => dom.renameModal.classList.add('hidden');
  document.getElementById('btn-cancel-rename').onclick = () => dom.renameModal.classList.add('hidden');
  document.getElementById('btn-confirm-rename').onclick = confirmRenameBuilding;
  dom.inputBuildingName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmRenameBuilding();
  });

  let resetArmed = false;
  const resetBtn = document.getElementById('btn-reset-save');
  resetBtn.onclick = () => {
    if (!resetArmed) {
      resetArmed = true;
      resetBtn.textContent = '확인?';
      showToast('초기화하려면 3초 안에 [확인?]을 한 번 더 누르세요!', 'rose');
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
  dom.lotsLayer = document.getElementById('lots-overlay-layer');
  dom.roomsLayer = document.getElementById('rooms-overlay-layer');
  dom.crisisLayer = document.getElementById('crisis-pins-layer');
  dom.speechLayer = document.getElementById('speech-overlay-layer');
  dom.careLayer = document.getElementById('care-overlay-layer');
  dom.jackpotLayer = document.getElementById('jackpot-overlay-layer');

  dom.hudGold = document.getElementById('hud-gold');
  dom.hudGoldWrap = document.getElementById('hud-gold-wrap');
  dom.hudNetIncome = document.getElementById('hud-net-income');
  dom.hudHappiness = document.getElementById('hud-happiness');
  dom.hudTimeText = document.getElementById('hud-time-text');
  dom.hudXrayBadge = document.getElementById('hud-xray-badge');
  dom.btnCollectAll = document.getElementById('btn-collect-all');

  dom.roomFocusPanel = document.getElementById('room-focus-panel');
  dom.rfTitle = document.getElementById('rf-title');
  dom.rfBtnRename = document.getElementById('rf-btn-rename');
  dom.rfTierBadge = document.getElementById('rf-tier-badge');
  dom.rfBody = document.getElementById('rf-body');

  dom.fabNotebook = document.getElementById('fab-notebook');
  dom.fabRedDot = document.getElementById('fab-red-dot');
  dom.tabDotQuests = document.getElementById('tab-dot-quests');
  dom.tabDotTenants = document.getElementById('tab-dot-tenants');
  dom.modalAlertSummary = document.getElementById('modal-alert-summary');
  dom.notebookModal = document.getElementById('notebook-modal');
  dom.splitLeftList = document.getElementById('split-left-list');
  dom.splitRightDetail = document.getElementById('split-right-detail');

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

    updateXRayAndFocusHighlights(dt, nowSec);

    spinningWashers.forEach((w) => { w.rotation.z += dt * 3.8; });
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
      b.obj.position.y = b.baseY + (1 - easeOutBounce(t)) * 1.6;
      if (t >= 1) {
        b.obj.position.y = b.baseY;
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
