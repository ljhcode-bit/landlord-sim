// =========================================================
// 【갓물주 라이프 3D: 미니미 타운 — 탈(脫)AI 장난감 미니어처 리마스터】 (app.js)
// 1. 빈 부지 상시 텍스트 라벨 100% 제거 → 하얀 피켓 울타리·네잎클로버·데이지·3D 나무 망치 팻말
// 2. 눈누(Noonnu) 상용 게임 폰트(Cafe24Ssurround / CookieRun / OmyuPretty) 캔버스 간판 동기화
// 3. BoxGeometry·ConeGeometry 전면 폐기 → createRoundedToyMesh (ExtrudeGeometry + 5단 베벨)
//    & 복숭아·라벤더 서브서피스 파스텔 클레이 재질(makeClayMat)
// 4. 8대 힐링 디테일: 솜사탕 구름·나비/새, 시냇물 오리튜브·종이배·물결, 가랜드·풍선다발,
//    발걸음 솜털 구름(Puff), 흔들리는 새싹/왕리본/프로펠러/밀짚모자, 벚꽃잎·보케 파티클,
//    빨간 우체통·미니 자판기·고양이 낮잠 바구니·장난감 미니카, 전 오브젝트 Squash & Stretch 탄성 물리
// =========================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const SAVE_KEY = 'god_landlord_toy_miniature_2026_v2';

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
    lot_main: makeResidentialBuilding('lot_main', 'mixed_1', '미니미 주상복합 1호관')
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
let hoveredEmptyLotId = null;
let activeNotebookTab = 'quests';
let selectedSplitItemId = null;
let devModalLotId = null;
let recruitRoomTarget = null;
let recruitCandidates = [];

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
const domeGeoCache = new Map();

const lot3D = {};
const pickableMeshes = [];
const spinningWashers = [];
const activeBounces = [];
const activeSquashes = []; // [요구사항 4-8] 말랑말랑 Squash & Stretch 탄성 물리 큐
const activeParticles = [];
const shockwaveRings = [];
const waterRipples = []; // [요구사항 4-2] 시냇물 반짝이는 물결 링
const odorEmitters = {};
const residentActors = {};
const petActors = [];
const cloudActors = []; // [요구사항 4-1] 솜사탕 구름
const skyCritters = []; // [요구사항 4-1] 꽃밭 나비 & 작은 새
const streamFloats = []; // [요구사항 4-2] 시냇물 오리 튜브 & 종이배
const swayingBalloons = []; // [요구사항 4-3] 살랑이는 풍선 다발
const ambientFloaters = []; // [요구사항 4-6] 봄바람 벚꽃잎 & 민들레 빛망울
const streetInteractiveProps = []; // [요구사항 4-7] 빨간 우체통, 자판기, 낮잠 고양이, 미니카
const signMaterialsToRefresh = [];

const careBubbles = [];
let careTimer = 7.0;

// DOM 오버레이 레지스트리
const lotOverlayEls = {};
const roomOverlayEls = {};
const crisisPinEls = {};
const speechEls = {};
const managerTagEls = {};
const dom = {};

// =========================================================
// 1. [요구사항 3] 칼각 BoxGeometry·ConeGeometry 전면 금지!
//    베지어 곡선 + 5단 베벨 ExtrudeGeometry 클레이 블록 생성기 (createRoundedToyMesh)
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

// 모든 건축물·가구·소품을 몰랑몰랑한 클레이 곡면으로 조립하는 핵심 생성기
function createRoundedToyMesh(w, h, d, mat, x = 0, y = 0, z = 0, radius = 0.09, cast = true, receive = true, bevel = 0.08) {
  const mesh = new THREE.Mesh(getRoundedToyGeo(w, h, d, radius, bevel), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

// 기존 호환 별칭
const makeRBox = createRoundedToyMesh;

// 뾰족한 ConeGeometry 대신 둥글고 폭신한 클레이 돔 지붕/우산/귀를 만드는 LatheGeometry 생성기
function getPuffyDomeGeo(rBottom = 0.6, height = 1.0) {
  const key = `${rBottom.toFixed(2)}_${height.toFixed(2)}`;
  if (domeGeoCache.has(key)) return domeGeoCache.get(key);

  const pts = [];
  const steps = 12;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // 아랫부분은 통통하고 꼭대기는 둥글게 닫히는 베지어 곡선 프로파일
    const rad = rBottom * Math.cos(t * Math.PI * 0.5) * (1 + 0.14 * Math.sin(t * Math.PI));
    const py = (t - 0.5) * height;
    pts.push(new THREE.Vector2(Math.max(0.001, rad), py));
  }
  const geo = new THREE.LatheGeometry(pts, 20);
  geo.computeVertexNormals();
  domeGeoCache.set(key, geo);
  return geo;
}

// 둥근 아치형 하얀 피켓 울타리 기둥 지오메트리
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

// 삼각 가랜드 깃발 베벨 지오메트리
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

// [요구사항 3] 따뜻한 복숭아·라벤더 서브서피스 보정 파스텔 클레이 재질 생성기
function makeClayMat(hex, opts = {}) {
  const baseCol = new THREE.Color(hex);
  const warmPeach = new THREE.Color(opts.coolShadow ? 0xE9D5FF : 0xFFC8B8);
  const subTint = baseCol.clone().lerp(warmPeach, 0.42);

  return new THREE.MeshStandardMaterial({
    color: baseCol,
    map: opts.map || null,
    roughness: opts.roughness !== undefined ? opts.roughness : 0.55,
    metalness: opts.metalness !== undefined ? opts.metalness : 0.05,
    emissive: opts.emissive !== undefined ? new THREE.Color(opts.emissive) : subTint,
    emissiveIntensity: opts.emissiveIntensity !== undefined ? opts.emissiveIntensity : (opts.map ? 0.11 : 0.17),
    transparent: !!opts.transparent,
    opacity: opts.opacity !== undefined ? opts.opacity : 1.0,
    side: opts.side || THREE.FrontSide
  });
}

// [요구사항 4-8] 말랑말랑 스쿼시 앤 스트레치(Squash & Stretch) 탄성 물리 연출
function triggerSquashStretch(obj, intensity = 1.0) {
  if (!obj) return;
  const existingIdx = activeSquashes.findIndex((s) => s.obj === obj);
  let baseScale = obj.userData.origScale ? obj.userData.origScale.clone() : obj.scale.clone();
  if (!obj.userData.origScale) {
    obj.userData.origScale = baseScale.clone();
  }
  if (existingIdx !== -1) activeSquashes.splice(existingIdx, 1);

  // 즉시 젤리처럼 살짝 납작·통통하게 눌린 상태에서 시작 (1.14, 0.86, 1.14)
  const sx = 1 + 0.14 * intensity;
  const sy = Math.max(0.72, 1 - 0.14 * intensity);
  obj.scale.set(baseScale.x * sx, baseScale.y * sy, baseScale.z * sx);

  activeSquashes.push({
    obj,
    baseScale,
    elapsed: 0,
    duration: 0.58,
    intensity
  });
}

// =========================================================
// 2. 프로시저럴 캔버스 텍스처 생성기 (TextureGenerator)
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

  static herringboneWood(style = 'oak') {
    const palettes = {
      maple: ['#FCE8D2', '#F5D9BA', '#ECCAA3', '#D4A87E'],
      oak: ['#EFC292', '#E4B07A', '#D9A168', '#AD7442'],
      royal: ['#FFFDF7', '#FAF0E1', '#F3E4CE', '#DFBC82']
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
          ctx.lineWidth = 1.4;
          ctx.strokeRect(0, 0, 44, 16);
          ctx.restore();

          ctx.save();
          ctx.translate(x + 22, y + 11);
          ctx.rotate(-Math.PI / 4);
          ctx.fillStyle = cols[Math.abs(Math.floor((x - y) / 22) + 1) % 3];
          ctx.fillRect(0, 0, 44, 16);
          ctx.strokeStyle = lineCol;
          ctx.lineWidth = 1.4;
          ctx.strokeRect(0, 0, 44, 16);
          ctx.restore();
        }
      }
    }, 2.2, 2.2, 256, 256);
  }

  static pastelStripeWallpaper(stripeA = '#FFFDF9', stripeB = '#FFE8EE', moldingHex = '#F7CDD8') {
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

  static stripedAwning(accentHex = '#FF758F') {
    return this.create((ctx, w, h) => {
      const sw = 32;
      for (let x = 0; x < w; x += sw) {
        ctx.fillStyle = (x / sw) % 2 === 0 ? accentHex : '#FFFDF9';
        ctx.fillRect(x, 0, sw, h);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ctx.fillRect(0, 0, w, h * 0.3);
    }, 2, 1, 256, 128);
  }

  static creamCobblestone() {
    return this.create((ctx, w, h) => {
      ctx.fillStyle = '#F4E8DA';
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
          ctx.strokeStyle = '#E5D3BF';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }, 3, 1.4, 256, 256);
  }

  static pastelBrickTile(bgHex = '#FFF9F3', tones = ['#FBDED3', '#F9CEBE', '#FDECE4']) {
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
      grad.addColorStop(0, '#A6F0B2');
      grad.addColorStop(1, '#84DF9B');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 60; i++) {
        ctx.fillStyle = i % 3 === 0 ? '#C2F9CB' : '#73CF8C';
        ctx.beginPath();
        ctx.arc((i * 47) % w, (i * 73) % h, 4.5 + (i % 4), 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < 16; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#FFFDF9' : '#FFE4EC';
        ctx.beginPath();
        ctx.arc((i * 67 + 20) % w, (i * 97 + 18) % h, 3.4, 0, Math.PI * 2);
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

  // 눈누 상용 게임 폰트 + 화이트 스티커 외곽선 간판 텍스처
  static storeSign(bgTop, bgBot, borderHex, title, subText) {
    return this.create((ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, bgTop);
      g.addColorStop(1, bgBot);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(5, 5, w - 10, h - 10, 30);
      ctx.fill();
      ctx.strokeStyle = borderHex;
      ctx.lineWidth = 9;
      ctx.stroke();

      ctx.font = '42px "Cafe24Ssurround", "CookieRun-Regular"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 8;
      ctx.strokeText(title, w / 2, h * 0.43);
      ctx.fillStyle = '#533928';
      ctx.fillText(title, w / 2, h * 0.43);

      ctx.font = '24px "OmyuPretty", "CookieRun-Regular"';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(subText, w / 2, h * 0.78);
    }, 1, 1, 512, 144);
  }

  // 빈 부지 3D 나무 팻말용 귀여운 집·네잎클로버 그림 엠블럼 (텍스트 제로!)
  static woodenSignEmblem() {
    return this.create((ctx, w, h) => {
      ctx.fillStyle = '#FFF7DF';
      ctx.beginPath();
      ctx.roundRect(6, 6, w - 12, h - 12, 24);
      ctx.fill();
      ctx.strokeStyle = '#E09F5A';
      ctx.lineWidth = 8;
      ctx.stroke();

      // 귀여운 빨간 지붕 집 일러스트
      ctx.fillStyle = '#FFFDF9';
      ctx.beginPath();
      ctx.roundRect(w * 0.34, h * 0.44, w * 0.32, h * 0.38, 10);
      ctx.fill();

      ctx.fillStyle = '#FF758F';
      ctx.beginPath();
      ctx.moveTo(w * 0.27, h * 0.48);
      ctx.lineTo(w * 0.5, h * 0.2);
      ctx.lineTo(w * 0.73, h * 0.48);
      ctx.closePath();
      ctx.fill();

      // 작은 네잎클로버 마크
      const cx = w * 0.76;
      const cy = h * 0.68;
      ctx.fillStyle = '#4ADE80';
      [[-7, -7], [7, -7], [-7, 7], [7, 7]].forEach(([ox, oy]) => {
        ctx.beginPath();
        ctx.arc(cx + ox, cy + oy, 7.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }, 1, 1, 256, 160);
  }

  static cementFloor() {
    return this.create((ctx, w, h) => {
      ctx.fillStyle = '#DFD8D0';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#C7BEB4';
      ctx.lineWidth = 2;
      ctx.strokeRect(8, 8, w - 16, h - 16);
    }, 2, 2, 256, 256);
  }

  static softContactShadow() {
    return this.create((ctx, s) => {
      const g = ctx.createRadialGradient(s / 2, s / 2, s * 0.08, s / 2, s / 2, s * 0.48);
      // 까만 그림자 대신 따뜻한 복숭아·코코아 파스텔 그림자!
      g.addColorStop(0, 'rgba(135, 78, 62, 0.28)');
      g.addColorStop(0.65, 'rgba(155, 95, 78, 0.10)');
      g.addColorStop(1, 'rgba(155, 95, 78, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    }, 1, 1, 128, 128);
  }
}

function initSharedResources() {
  TEX.shadow = TextureGenerator.softContactShadow();
  TEX.meadow = TextureGenerator.cloverMeadow();
  TEX.water = TextureGenerator.streamWater();
  TEX.cobble = TextureGenerator.creamCobblestone();
  TEX.brickWarm = TextureGenerator.pastelBrickTile('#FFF9F3', ['#FBDED3', '#F9CEBE', '#FDECE4']);
  TEX.brickMint = TextureGenerator.pastelBrickTile('#F6FFFB', ['#CCFBF1', '#A7F3D0', '#E6FFFA']);

  TEX.floor0 = TextureGenerator.cementFloor();
  TEX.floor1 = TextureGenerator.herringboneWood('maple');
  TEX.floor2 = TextureGenerator.herringboneWood('oak');
  TEX.floor3 = TextureGenerator.herringboneWood('royal');

  TEX.wall0 = TextureGenerator.pastelStripeWallpaper('#EFE9E2', '#E5DDD4', '#D6CCC0');
  TEX.wall1 = TextureGenerator.pastelStripeWallpaper('#FFFDF9', '#FFE8EE', '#F8C8D4');
  TEX.wall2 = TextureGenerator.pastelStripeWallpaper('#FFFDF9', '#E6F7F0', '#BCE6D5');
  TEX.wall3 = TextureGenerator.pastelStripeWallpaper('#FFFDF9', '#FEF3C7', '#F7D488');

  TEX.awningCoral = TextureGenerator.stripedAwning('#FF758F');
  TEX.awningMint = TextureGenerator.stripedAwning('#34D399');
  TEX.awningButter = TextureGenerator.stripedAwning('#FBBF24');
  TEX.signEmblem = TextureGenerator.woodenSignEmblem();

  TEX.martSign = TextureGenerator.storeSign('#FF94A8', '#FF6B8B', '#FFFDF9', '24H MINI MART', '모닝 도시락 · 달콤 간식');
  TEX.washSign = TextureGenerator.storeSign('#7CC4FF', '#4DA3FF', '#FFFDF9', 'WASH PONG', '뽀송뽀송 버블 세탁방');
  TEX.cafeSign = TextureGenerator.storeSign('#FDE073', '#FBBF24', '#FFFDF9', 'CREAM BAKERY', '갓 구운 소금빵 & 라떼');

  GEO.sphere = new THREE.SphereGeometry(0.5, 20, 16);
  GEO.cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 20);
  GEO.torus = new THREE.TorusGeometry(0.38, 0.13, 14, 24);
  GEO.quad = new THREE.PlaneGeometry(1, 1);
  GEO.coin = new THREE.CylinderGeometry(0.24, 0.24, 0.08, 18);
  GEO.coin.rotateX(Math.PI / 2);
  GEO.ring = new THREE.RingGeometry(0.32, 0.64, 28);

  // 모든 재질을 복숭아·라벤더 서브서피스 파스텔 클레이(makeClayMat)로 생성!
  MAT.shadow = new THREE.MeshBasicMaterial({ map: TEX.shadow, transparent: true, depthWrite: false });
  MAT.slab = makeClayMat(0xFFFDF8);
  MAT.woodLight = makeClayMat(0xEBB986);
  MAT.woodWarm = makeClayMat(0xC6834B);
  MAT.woodDark = makeClayMat(0x8B5630);
  MAT.white = makeClayMat(0xFFFDF9, { roughness: 0.46 });
  MAT.cream = makeClayMat(0xFFF5E8);
  MAT.coral = makeClayMat(0xFF758F, { roughness: 0.48 });
  MAT.redPost = makeClayMat(0xFF5A76, { roughness: 0.44 });
  MAT.pinkSoft = makeClayMat(0xFFB8CA);
  MAT.mint = makeClayMat(0x4ADE80);
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

  // 폰트 로드 완료 시 3D 상가 간판 재렌더링 (눈누 폰트 완벽 반영!)
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      TEX.martSign = TextureGenerator.storeSign('#FF94A8', '#FF6B8B', '#FFFDF9', '24H MINI MART', '모닝 도시락 · 달콤 간식');
      TEX.washSign = TextureGenerator.storeSign('#7CC4FF', '#4DA3FF', '#FFFDF9', 'WASH PONG', '뽀송뽀송 버블 세탁방');
      TEX.cafeSign = TextureGenerator.storeSign('#FDE073', '#FBBF24', '#FFFDF9', 'CREAM BAKERY', '갓 구운 소금빵 & 라떼');
      signMaterialsToRefresh.forEach(({ mat, kind }) => {
        mat.map = kind === 'mart' ? TEX.martSign : kind === 'wash' ? TEX.washSign : TEX.cafeSign;
        mat.needsUpdate = true;
      });
    });
  }
}

// =========================================================
// 3. 장난감 미니어처 아일랜드 + 8대 힐링 감성 디테일 조립
// =========================================================
function buildCozyFloatingIsland() {
  const island = new THREE.Group();

  // 몰랑한 잔디 상판 & 파스텔 피치-테라코타 절벽
  const meadowTop = new THREE.Mesh(
    new THREE.CylinderGeometry(33.5, 32.2, 1.35, 52),
    makeClayMat(0xFFFFFF, { map: TEX.meadow, roughness: 0.72 })
  );
  meadowTop.position.y = -0.67;
  meadowTop.receiveShadow = true;
  island.add(meadowTop);

  const cliffMid = new THREE.Mesh(
    new THREE.CylinderGeometry(31.8, 25.5, 3.8, 40),
    makeClayMat(0xF0BC96, { roughness: 0.78 })
  );
  cliffMid.position.y = -3.15;
  island.add(cliffMid);

  const cliffBot = new THREE.Mesh(
    new THREE.CylinderGeometry(25.2, 13.5, 4.8, 32),
    makeClayMat(0xD89A72, { roughness: 0.82 })
  );
  cliffBot.position.y = -7.25;
  island.add(cliffBot);

  // 반짝이는 하늘색 시냇물 (전 구간 베벨 클레이 블록)
  const waterMat = new THREE.MeshStandardMaterial({
    map: TEX.water,
    emissive: 0x7DD3FC,
    emissiveIntensity: 0.18,
    roughness: 0.15,
    metalness: 0.05,
    transparent: true,
    opacity: 0.94
  });
  const streamPts = [
    { x: 4.5, z: -26, w: 4.5, d: 10.6, rot: 0.12 },
    { x: 5.2, z: -16, w: 4.6, d: 11.2, rot: -0.08 },
    { x: 5.0, z: -5.5, w: 4.7, d: 11.5, rot: 0.06 },
    { x: 4.6, z: 5.2, w: 4.7, d: 11.5, rot: 0.1 },
    { x: 4.0, z: 16.0, w: 4.9, d: 12.2, rot: -0.08 },
    { x: 3.4, z: 25.5, w: 5.1, d: 10.0, rot: 0.0 }
  ];
  streamPts.forEach((seg) => {
    const wMesh = createRoundedToyMesh(seg.w, 0.18, seg.d, waterMat, seg.x, 0.06, seg.z, 0.12, false, true);
    wMesh.rotation.y = seg.rot;
    island.add(wMesh);

    for (const s of [-1, 1]) {
      const pebble = new THREE.Mesh(GEO.sphere, MAT.cream);
      pebble.scale.set(0.58, 0.3, 0.46);
      pebble.position.set(seg.x + s * (seg.w * 0.54), 0.11, seg.z + s * 1.6);
      pebble.receiveShadow = true;
      island.add(pebble);
    }
  });

  // 크림 돌담 산책로
  const cobbleMat = makeClayMat(0xFFFFFF, { map: TEX.cobble, roughness: 0.72 });
  island.add(createRoundedToyMesh(38, 0.12, 3.7, cobbleMat, -1.0, 0.05, 3.0, 0.14, false, true));
  island.add(createRoundedToyMesh(3.3, 0.12, 21, cobbleMat, -13.5, 0.05, 1.5, 0.14, false, true));
  island.add(createRoundedToyMesh(3.3, 0.12, 21, cobbleMat, 13.5, 0.05, 2.2, 0.14, false, true));

  // 아기자기한 둥근 통나무 아치 다리
  const bridge = new THREE.Group();
  bridge.position.set(4.8, 0.12, 3.0);
  for (let i = -4; i <= 4; i++) {
    const t = i / 4;
    const archY = Math.cos(t * Math.PI * 0.5) * 0.68;
    bridge.add(createRoundedToyMesh(0.74, 0.18, 3.85, MAT.woodLight, i * 0.78, archY, 0, 0.08));
  }
  for (const side of [-1.75, 1.75]) {
    for (const px of [-2.8, 0, 2.8]) {
      bridge.add(createRoundedToyMesh(0.22, 1.15, 0.22, MAT.woodDark, px, 0.75, side, 0.08));
      if (px === 0) {
        const lantern = new THREE.Mesh(GEO.sphere, MAT.gold);
        lantern.scale.setScalar(0.34);
        lantern.position.set(px, 1.44, side);
        bridge.add(lantern);
      }
    }
    bridge.add(createRoundedToyMesh(6.4, 0.16, 0.16, MAT.woodWarm, 0, 1.2, side, 0.06));
  }
  island.add(bridge);

  // 몽글몽글 파스텔 벚꽃 & 민트 나무 + 꽃밭 클러스터
  const treeCoords = [
    [-25, -13, true], [-23, 9, false], [-8, -19, true], [-2, 18, false],
    [22, -13, true], [23, 9, true], [16, 20, false], [-21, 19, true],
    [10, -21, false], [-15, -16, false], [21, -2, false]
  ];
  treeCoords.forEach(([tx, tz, isSakura], idx) => {
    const tree = createFluffyPastelTree(isSakura, 0.94 + (idx % 3) * 0.16);
    tree.position.set(tx, 0.05, tz);
    island.add(tree);
  });

  // 아일랜드 곳곳의 네잎클로버 & 데이지 꽃밭 군락
  const flowerPatches = [
    [-9.8, 6.2], [0.2, 6.5], [9.5, 6.1], [-11.5, -9.2], [8.8, -9.8], [-3.2, -11.5]
  ];
  flowerPatches.forEach(([fx, fz]) => {
    const patch = createCloverAndDaisyCluster(5);
    patch.position.set(fx, 0.06, fz);
    island.add(patch);
  });

  // 수변 공원 통나무 벤치
  const bench = createParkBench3D();
  bench.position.set(0.8, 0.08, 6.2);
  bench.rotation.y = -0.35;
  island.add(bench);

  // [요구사항 4-7] 돌담길 모퉁이 빨간 우체통 · 파스텔 미니 자판기 · 고양이 낮잠 바구니 · 장난감 미니카!
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

  // [요구사항 4-1] 몽글몽글 솜사탕 구름 4개 & 꽃밭 나비/작은 새 스폰
  spawnCottonCandyClouds();
  spawnButterfliesAndBirds();

  // [요구사항 4-2] 시냇물 위 노란 오리 튜브 & 종이배 스폰
  spawnStreamRubberDuckAndBoat();

  // [요구사항 4-6] 봄바람 벚꽃잎 & 민들레 빛망울(Bokeh) 상시 환경 파티클 스폰
  spawnAmbientPetalsAndBokeh();
}

// 네잎클로버 & 데이지 꽃송이 생성기
function createFourLeafClover3D(scale = 1.0) {
  const g = new THREE.Group();
  const leafOffsets = [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]];
  leafOffsets.forEach(([ox, oz]) => {
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
    if (i % 2 === 0) {
      const d = createDaisyFlower3D(petalMats[i % petalMats.length], 0.95 + (i % 2) * 0.2);
      d.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      g.add(d);
    } else {
      const c = createFourLeafClover3D(1.05);
      c.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      c.rotation.y = a;
      g.add(c);
    }
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

  // 나무 기둥도 둥근 클레이 블록으로 부드럽게 반사!
  const trunk = createRoundedToyMesh(0.52, 1.55, 0.52, MAT.woodDark, 0, 0.78, 0, 0.22);
  g.add(trunk);

  const leafMat = isSakura ? MAT.sakuraPink : MAT.leafGreen;
  const puffs = [
    [0, 1.98, 0, 1.5],
    [-0.56, 1.68, 0.36, 1.1],
    [0.58, 1.72, -0.28, 1.12],
    [0.12, 2.46, 0.15, 1.06]
  ];
  puffs.forEach(([px, py, pz, s]) => {
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
  g.add(createRoundedToyMesh(1.75, 0.15, 0.58, MAT.woodLight, 0, 0.42, 0, 0.06));
  g.add(createRoundedToyMesh(1.75, 0.48, 0.14, MAT.woodLight, 0, 0.74, -0.22, 0.06));
  g.add(createRoundedToyMesh(0.18, 0.42, 0.52, MAT.woodDark, -0.7, 0.21, 0, 0.06));
  g.add(createRoundedToyMesh(0.18, 0.42, 0.52, MAT.woodDark, 0.7, 0.21, 0, 0.06));
  return g;
}

// [요구사항 4-3] 알록달록 파스텔 삼각 가랜드(Garland) & 살랑이는 풍선 다발(Balloon Bunch)
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
    g.add(flag);
  }
  return g;
}

function createBalloonBunch3D(scale = 1.0) {
  const pivot = new THREE.Group();
  const configs = [
    { x: -0.24, y: 1.55, z: 0.06, mat: MAT.coral },
    { x: 0.22, y: 1.72, z: -0.06, mat: MAT.butter },
    { x: 0.0, y: 1.92, z: 0.1, mat: MAT.sky },
    { x: -0.08, y: 1.38, z: -0.14, mat: MAT.mint }
  ];
  configs.forEach((c) => {
    const stringMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, c.y, 6), MAT.white);
    stringMesh.position.set(c.x * 0.5, c.y * 0.5, c.z * 0.5);
    stringMesh.rotation.z = -c.x * 0.32;
    pivot.add(stringMesh);

    const balloon = new THREE.Mesh(GEO.sphere, c.mat);
    balloon.scale.set(0.42, 0.5, 0.42);
    balloon.position.set(c.x, c.y, c.z);
    balloon.castShadow = true;
    pivot.add(balloon);
  });
  pivot.scale.setScalar(scale);
  swayingBalloons.push({ pivot, phase: Math.random() * Math.PI * 2 });
  return pivot;
}

// [요구사항 4-7] 흔들리는 빨간 우체통, 음료수 캔이 보이는 미니 자판기, 고양이 낮잠 바구니, 장난감 미니카
function createRedPostbox3D() {
  const g = new THREE.Group();
  const pole = createRoundedToyMesh(0.24, 0.65, 0.24, MAT.woodDark, 0, 0.32, 0, 0.09);
  const body = createRoundedToyMesh(0.68, 0.88, 0.56, MAT.redPost, 0, 0.98, 0, 0.22);
  const cap = new THREE.Mesh(GEO.sphere, MAT.redPost);
  cap.scale.set(0.7, 0.42, 0.58);
  cap.position.set(0, 1.38, 0);
  cap.castShadow = true;
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

  // 진열창 안에 보이는 알록달록 음료수 미니 캔 6개!
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

  const cushion = new THREE.Mesh(GEO.sphere, MAT.pinkSoft);
  cushion.scale.set(0.78, 0.26, 0.68);
  cushion.position.y = 0.16;

  // 쿨쿨 잠든 동글동글 치즈냥이
  const catGroup = new THREE.Group();
  catGroup.position.set(0, 0.28, 0);
  const catBody = new THREE.Mesh(GEO.sphere, MAT.orangeBill);
  catBody.scale.set(0.5, 0.34, 0.42);
  const catHead = new THREE.Mesh(GEO.sphere, MAT.orangeBill);
  catHead.scale.setScalar(0.32);
  catHead.position.set(0.16, 0.06, 0.08);
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

  // 몰랑몰랑 파스텔 버터-코랄 장난감 자동차 바디 (ExtrudeGeometry 베벨!)
  const chassis = createRoundedToyMesh(1.75, 0.52, 1.05, MAT.coral, 0, 0.38, 0, 0.18);
  const cabin = createRoundedToyMesh(1.05, 0.48, 0.92, MAT.cream, -0.08, 0.78, 0, 0.18);
  const windshield = createRoundedToyMesh(0.12, 0.32, 0.76, MAT.sky, 0.42, 0.78, 0, 0.05);
  g.add(chassis, cabin, windshield);

  // 동글동글 헤드라이트 & 바퀴 4개
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

// [요구사항 4-1] 몽글몽글 솜사탕 구름 & 꽃밭 나비·작은 새
function spawnCottonCandyClouds() {
  const cloudSpots = [
    { x: -24, y: 15.2, z: -18, s: 1.25, speed: 0.65 },
    { x: 18, y: 16.4, z: -20, s: 1.4, speed: 0.52 },
    { x: -20, y: 14.8, z: 16, s: 1.15, speed: 0.72 },
    { x: 22, y: 15.8, z: 15, s: 1.3, speed: 0.58 }
  ];
  cloudSpots.forEach((cfg, idx) => {
    const cg = new THREE.Group();
    const puffs = [
      [0, 0, 0, 2.2, 1.35, 1.6],
      [-1.15, -0.15, 0.15, 1.65, 1.1, 1.35],
      [1.2, -0.1, -0.1, 1.7, 1.15, 1.4],
      [0.25, 0.45, 0.1, 1.45, 1.05, 1.25]
    ];
    puffs.forEach(([px, py, pz, sx, sy, sz]) => {
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
  const centers = [
    [-9.8, 6.2, 'butterfly'],
    [0.2, 6.5, 'butterfly'],
    [9.5, 6.1, 'butterfly'],
    [-14.2, 10.6, 'butterfly'],
    [13.8, -4.5, 'bird'],
    [-6.0, -10.5, 'bird'],
    [4.8, 3.2, 'bird']
  ];
  const wingMats = [MAT.pinkSoft, MAT.butter, MAT.sky, MAT.mintSoft];
  centers.forEach(([cx, cz, kind], i) => {
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

// [요구사항 4-2] 시냇물 위 노란 오리 튜브(Rubber Duck) & 파스텔 종이배 + 물결 반짝임
function spawnStreamRubberDuckAndBoat() {
  // 1) 코랄 튜브를 탄 노란 러버덕
  const duckGroup = new THREE.Group();
  const tube = new THREE.Mesh(GEO.torus, MAT.coral);
  tube.rotation.x = Math.PI / 2;
  tube.scale.setScalar(1.05);
  tube.position.y = 0.08;
  tube.castShadow = true;

  const duckBody = new THREE.Mesh(GEO.sphere, MAT.duckYellow);
  duckBody.scale.set(0.58, 0.44, 0.68);
  duckBody.position.y = 0.22;
  duckBody.castShadow = true;

  const duckHead = new THREE.Mesh(GEO.sphere, MAT.duckYellow);
  duckHead.scale.setScalar(0.42);
  duckHead.position.set(0, 0.5, 0.2);
  duckHead.castShadow = true;

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

  // 2) 하얀 파스텔 종이배
  const boatGroup = new THREE.Group();
  const hull = createRoundedToyMesh(0.56, 0.22, 1.05, MAT.white, 0, 0.14, 0, 0.1);
  const sail = new THREE.Mesh(getPuffyDomeGeo(0.28, 0.52), MAT.pinkSoft);
  sail.scale.set(0.45, 1.0, 1.1);
  sail.position.set(0, 0.42, 0);
  sail.castShadow = true;
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
  scene.add(r);
  waterRipples.push({ mesh: r, life: 1.2, maxLife: 1.2 });
}

// [요구사항 4-6] 봄바람 벚꽃잎 & 반짝이는 민들레 빛망울(Bokeh) 환경 파티클
function spawnAmbientPetalsAndBokeh() {
  const petalMat = new THREE.MeshBasicMaterial({ color: 0xFFB7CE, transparent: true, opacity: 0.82, side: THREE.DoubleSide });
  const bokehMat = new THREE.MeshBasicMaterial({ color: 0xFFF7C2, transparent: true, opacity: 0.7 });

  for (let i = 0; i < 32; i++) {
    const isPetal = i < 20;
    const m = new THREE.Mesh(GEO.sphere, isPetal ? petalMat : bokehMat);
    if (isPetal) {
      m.scale.set(0.18, 0.04, 0.12);
    } else {
      m.scale.setScalar(0.11 + (i % 3) * 0.04);
    }
    m.position.set(
      (Math.random() - 0.5) * 52,
      1.5 + Math.random() * 12,
      (Math.random() - 0.5) * 46
    );
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

// [요구사항 4-4] 걸을 때마다 발밑에서 퐁퐁 피어오르는 솜털 발자국 구름(Puff)
function spawnFootstepPuff(wx, wy, wz, scale = 0.2) {
  if (activeParticles.length > 90) return;
  const puff = new THREE.Mesh(
    GEO.sphere,
    new THREE.MeshBasicMaterial({ color: 0xFFFDF9, transparent: true, opacity: 0.72 })
  );
  puff.scale.setScalar(scale);
  puff.position.set(wx + (Math.random() - 0.5) * 0.12, wy + 0.06, wz + (Math.random() - 0.5) * 0.12);
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
// 4. [요구사항 4-5] 2등신 치비 캐릭터 + 머리 위 흔들리는 새싹/왕리본/고양이귀/밀짚모자/프로펠러!
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
    family_m: 0x4ADE80,
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

  const legL = createRoundedToyMesh(0.16, 0.24, 0.18, MAT.charcoal, -0.11, 0.12, 0, 0.07);
  const legR = createRoundedToyMesh(0.16, 0.24, 0.18, MAT.charcoal, 0.11, 0.12, 0, 0.07);
  g.add(legL, legR);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.46, 18), clothMat);
  torso.position.y = 0.44;
  torso.castShadow = true;
  bodyRoot.add(torso);

  const armL = createRoundedToyMesh(0.13, 0.3, 0.14, clothMat, -0.3, 0.44, 0.02, 0.06);
  armL.rotation.z = 0.24;
  const armR = createRoundedToyMesh(0.13, 0.3, 0.14, clothMat, 0.3, 0.44, 0.02, 0.06);
  armR.rotation.z = -0.24;
  bodyRoot.add(armL, armR);

  const headGroup = new THREE.Group();
  headGroup.position.y = 0.92;
  bodyRoot.add(headGroup);

  const head = new THREE.Mesh(GEO.sphere, skinMat);
  head.scale.set(0.66, 0.62, 0.64);
  head.castShadow = true;
  headGroup.add(head);

  // 반짝이는 눈 안광(Catchlight) + 복숭아 볼터치
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

  // 탄성 있게 흔들리는 머리 위 심쿵 액세서리 피벗!
  const topperPivot = new THREE.Group();
  topperPivot.position.set(0, 0.31, 0);
  headGroup.add(topperPivot);
  let propellerBlade = null;

  if (style === 'hikikomori') {
    const hood = new THREE.Mesh(GEO.sphere, MAT.purpleDark);
    hood.scale.set(0.74, 0.72, 0.72);
    hood.position.set(0, 0.03, -0.04);
    headGroup.add(hood);
    topperPivot.position.y = 0.36;
    topperPivot.add(createSproutTopper3D());
  } else if (style === 'manager') {
    const capCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.33, 0.2, 18), clothMat);
    capCrown.position.y = 0.27;
    const visor = createRoundedToyMesh(0.46, 0.07, 0.26, MAT.charcoal, 0, 0.2, 0.24, 0.03);
    const goldBadge = new THREE.Mesh(GEO.sphere, MAT.gold);
    goldBadge.scale.setScalar(0.095);
    goldBadge.position.set(0, 0.28, 0.33);
    const tie = createRoundedToyMesh(0.09, 0.24, 0.06, MAT.coral, 0, 0.45, 0.25, 0.02);
    headGroup.add(capCrown, visor, goldBadge);
    bodyRoot.add(tie);
  } else if (style === 'elderly_m' || style === 'elderly_f') {
    const silverHair = makeClayMat(0xECEFF1);
    const hair = new THREE.Mesh(GEO.sphere, silverHair);
    hair.scale.set(0.69, 0.52, 0.68);
    hair.position.set(0, 0.11, -0.03);
    headGroup.add(hair);

    // 귀여운 밀짚모자 + 코랄 리본 띠!
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.54, 0.06, 22), MAT.butter);
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
    headGroup.add(hair);

    if (style === 'student') {
      // 고양이 귀 파스텔 헤드셋 + 머리 위 초록 새싹핀!
      const band = createRoundedToyMesh(0.7, 0.08, 0.12, MAT.coral, 0, 0.26, 0, 0.03);
      const earCupL = createRoundedToyMesh(0.11, 0.22, 0.18, MAT.coral, -0.34, 0.02, 0.02, 0.05);
      const earCupR = createRoundedToyMesh(0.11, 0.22, 0.18, MAT.coral, 0.34, 0.02, 0.02, 0.05);
      const catEarL = new THREE.Mesh(getPuffyDomeGeo(0.09, 0.18), MAT.coral);
      catEarL.position.set(-0.22, 0.34, 0);
      catEarL.rotation.z = 0.28;
      const catEarR = new THREE.Mesh(getPuffyDomeGeo(0.09, 0.18), MAT.coral);
      catEarR.position.set(0.22, 0.34, 0);
      catEarR.rotation.z = -0.28;
      headGroup.add(band, earCupL, earCupR, catEarL, catEarR);
      topperPivot.add(createSproutTopper3D());
    } else if (style === 'newlywed_f') {
      // 심쿵 핑크 왕리본!
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
      // 빙글빙글 도는 알록달록 프로펠러 모자!
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
  g.add(head);

  // 강아지/고양이 머리 위에도 앙증맞은 새싹핀!
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
      g.add(createRoundedToyMesh(0.09, 0.16, 0.09, furMat, lx, 0.09, lz, 0.04));
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
  const petConfigs = [
    { kind: 'shiba', x: -1.5, z: 3.6 },
    { kind: 'bichon', x: 8.8, z: 3.4 },
    { kind: 'cat', x: -7.6, z: 3.1 }
  ];
  petConfigs.forEach((cfg) => {
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
// 5. [요구사항 1] 빈 부지 텍스트 말풍선 완전 삭제 → '하얀 피켓 울타리 & 클로버 꽃밭 & 3D 나무 망치 팻말'
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
      emptyGroup: null,
      signpostPivot: null,
      shellMaterials: [],
      roofCapGroup: null,
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
  reg.shellMaterials = [];
  reg.indoorLights = [];
  reg.cropMeshes = [];
  reg.roomGroups = {};
  reg.elevatorCar = null;
  reg.upperSlab = null;
  reg.signpostPivot = null;

  if (!lot.owned) {
    const eg = buildEmptyForSaleLot3D(lot, reg);
    reg.emptyGroup = eg;
    reg.root.add(eg);
    return;
  }

  const cat = DEVELOPMENT_CATALOG[lot.devType];
  if (cat && cat.isResidential) {
    buildResidentialComplex3D(lot, reg);
  } else {
    buildIslandSpecialtyDev3D(lot, reg);
  }
}

function buildEmptyForSaleLot3D(lot, reg) {
  const g = new THREE.Group();

  // 폭신폭신 연두빛 클로버 잔디 터
  const padMat = makeClayMat(0xCAFBCE, { roughness: 0.72 });
  const pad = createRoundedToyMesh(9.4, 0.24, 7.4, padMat, 0, 0.12, 0, 0.42, false, true);
  pad.userData = { lotId: lot.lotId, isEmptyLot: true };
  registerPick(pad);
  g.add(pad);

  // 낮고 둥근 하얀색 나무 피켓 울타리 (Picket Fence)
  const picketGeo = getPicketPostGeo();
  for (let x = -4.0; x <= 4.0; x += 0.8) {
    for (const z of [-3.25, 3.25]) {
      // 정면 중앙은 귀여운 꽃밭 출입문 공간으로 비워둠
      if (z > 0 && Math.abs(x) < 0.9) continue;
      const p = new THREE.Mesh(picketGeo, MAT.white);
      p.position.set(x, 0.48, z);
      p.castShadow = true;
      p.receiveShadow = true;
      g.add(p);
    }
  }
  for (let z = -2.45; z <= 2.45; z += 0.82) {
    for (const x of [-4.0, 4.0]) {
      const p = new THREE.Mesh(picketGeo, MAT.white);
      p.rotation.y = Math.PI / 2;
      p.position.set(x, 0.48, z);
      p.castShadow = true;
      g.add(p);
    }
  }
  // 가로 연결대
  g.add(createRoundedToyMesh(8.1, 0.09, 0.09, MAT.white, 0, 0.52, -3.25, 0.03));
  g.add(createRoundedToyMesh(2.9, 0.09, 0.09, MAT.white, -2.55, 0.52, 3.25, 0.03));
  g.add(createRoundedToyMesh(2.9, 0.09, 0.09, MAT.white, 2.55, 0.52, 3.25, 0.03));
  g.add(createRoundedToyMesh(0.09, 0.09, 6.5, MAT.white, -4.0, 0.52, 0, 0.03));
  g.add(createRoundedToyMesh(0.09, 0.09, 6.5, MAT.white, 4.0, 0.52, 0, 0.03));

  // 네잎클로버와 작은 데이지 꽃송이 군락 배치!
  const daisyMats = [MAT.white, MAT.pinkSoft, MAT.butter];
  const floraSpots = [
    [-2.7, -1.9, 'daisy', 0], [-1.9, 1.8, 'clover', 1], [2.6, -1.8, 'daisy', 1],
    [2.3, 1.9, 'clover', 0], [-2.9, 0.5, 'daisy', 2], [2.9, 0.4, 'daisy', 0],
    [-1.2, -2.1, 'clover', 0], [1.3, -2.0, 'daisy', 1], [-1.4, 2.1, 'daisy', 2]
  ];
  floraSpots.forEach(([fx, fz, kind, mIdx]) => {
    const fl = kind === 'clover'
      ? createFourLeafClover3D(1.18)
      : createDaisyFlower3D(daisyMats[mIdx], 1.15);
    fl.position.set(fx, 0.22, fz);
    g.add(fl);
  });

  // 정중앙의 앙증맞은 '3D 나무 분양 팻말 & 장난감 나무 망치(Wooden Signpost & Toy Mallet)'!
  const signpostPivot = new THREE.Group();
  signpostPivot.position.set(0, 0.22, 0);
  signpostPivot.userData.origScale = new THREE.Vector3(1, 1, 1);

  const post = createRoundedToyMesh(0.28, 1.68, 0.28, MAT.woodWarm, 0, 0.84, 0, 0.1);
  const postCap = new THREE.Mesh(GEO.sphere, MAT.butter);
  postCap.scale.setScalar(0.28);
  postCap.position.set(0, 1.74, 0);

  // 그림 엠블럼이 그려진 통통한 나무 판자 (글자 전혀 없음!)
  const boardBack = createRoundedToyMesh(2.05, 1.18, 0.22, MAT.woodLight, 0, 1.26, 0.14, 0.18);
  boardBack.rotation.z = -0.05;
  const emblemFace = new THREE.Mesh(
    GEO.quad,
    makeClayMat(0xFFFFFF, { map: TEX.signEmblem, roughness: 0.45 })
  );
  emblemFace.scale.set(1.76, 0.96, 1);
  emblemFace.position.set(0, 1.26, 0.26);
  emblemFace.rotation.z = -0.05;

  // 팻말 옆에 기대어 놓은 귀여운 3D 장난감 나무 망치(Toy Hammer)
  const hammerGroup = new THREE.Group();
  hammerGroup.position.set(0.86, 0.45, 0.35);
  hammerGroup.rotation.z = 0.36;
  const hHandle = createRoundedToyMesh(0.14, 0.82, 0.14, MAT.woodLight, 0, 0, 0, 0.05);
  const hHead = createRoundedToyMesh(0.56, 0.32, 0.32, MAT.coral, 0, 0.38, 0, 0.11);
  const hCapL = createRoundedToyMesh(0.08, 0.28, 0.28, MAT.butter, -0.29, 0.38, 0, 0.06);
  const hCapR = createRoundedToyMesh(0.08, 0.28, 0.28, MAT.butter, 0.29, 0.38, 0, 0.06);
  hammerGroup.add(hHandle, hHead, hCapL, hCapR);

  // 팻말 위에도 작은 초록 새싹!
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
  const base = createRoundedToyMesh(10.8, 0.3, 8.6, MAT.slab, 0, 0.15, 0, 0.28, true, true);
  base.userData = { lotId: lot.lotId };
  registerPick(base);
  g.add(base);

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
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.56, 26), MAT.sky);
    pool.position.set(0, 0.57, 0);
    g.add(basin, pool);
    const bBunch = createBalloonBunch3D(0.95);
    bBunch.position.set(0, 0.8, 0);
    g.add(bBunch);
  } else if (lot.devType === 'bakery_cafe') {
    const body = createRoundedToyMesh(7.2, 3.2, 5.2, makeClayMat(0xFFFFFF, { map: TEX.brickWarm }), 0, 1.85, -0.5, 0.22);
    const roof = createRoundedToyMesh(7.6, 0.5, 5.6, MAT.coral, 0, 3.65, -0.5, 0.2);
    const cafeSignMat = makeClayMat(0xFFFFFF, { map: TEX.cafeSign, roughness: 0.36 });
    signMaterialsToRefresh.push({ mat: cafeSignMat, kind: 'cafe' });
    const sign = new THREE.Mesh(GEO.quad, cafeSignMat);
    sign.scale.set(4.8, 1.18, 1);
    sign.position.set(0, 2.98, 2.16);
    const awning = createRoundedToyMesh(6.8, 0.34, 1.35, makeClayMat(0xFFFFFF, { map: TEX.awningButter }), 0, 2.1, 2.6, 0.12);
    awning.rotation.x = 0.25;

    const garland = createGarland3D(6.2, 9);
    garland.position.set(0, 1.85, 3.25);
    const bBunch = createBalloonBunch3D(0.95);
    bBunch.position.set(3.6, 0.3, 2.8);

    g.add(body, roof, sign, awning, garland, bBunch);

    for (const tx of [-2.2, 2.2]) {
      const tbl = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.12, 20), MAT.white);
      tbl.position.set(tx, 0.85, 3.1);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 10), MAT.woodDark);
      pole.position.set(tx, 1.2, 3.1);
      const umbrella = new THREE.Mesh(getPuffyDomeGeo(1.05, 0.65), MAT.coral);
      umbrella.position.set(tx, 2.18, 3.1);
      umbrella.castShadow = true;
      g.add(tbl, pole, umbrella);
    }
  }

  reg.root.add(g);
}

// =========================================================
// 6. 주상복합 건물 + 가랜드·풍선다발 + 6호실 클레이 가구
// =========================================================
function buildResidentialComplex3D(lot, reg) {
  const b = state.buildings[lot.lotId];
  const W = 17.6;
  const D = 5.6;

  const baseDeck = createRoundedToyMesh(W + 2.2, 0.46, D + 3.0, MAT.slab, 0, 0.23, 0.35, 0.26, true, true);
  baseDeck.userData = { lotId: lot.lotId };
  registerPick(baseDeck);
  reg.root.add(baseDeck);

  // 1층 상가 아케이드 (24H MINI MART & WASH PONG + 가랜드 + 풍선다발!)
  const gfGroup = new THREE.Group();
  gfGroup.add(createRoundedToyMesh(W, 2.55, 0.26, MAT.cream, 0, 1.7, -D / 2 + 0.13, 0.08));

  // 좌측 24H MINI MART
  gfGroup.add(createRoundedToyMesh(6.6, 0.09, D - 0.4, MAT.white, -5.2, 0.47, 0.2, 0.04));
  gfGroup.add(createRoundedToyMesh(1.8, 0.84, 0.74, MAT.coral, -7.2, 0.86, 1.2, 0.14));
  for (const sx of [-5.2, -3.5]) {
    gfGroup.add(createRoundedToyMesh(1.25, 1.35, 0.5, MAT.mintSoft, sx, 1.12, -0.4, 0.1));
    gfGroup.add(createRoundedToyMesh(1.1, 0.24, 0.4, MAT.butter, sx, 1.9, -0.4, 0.08));
  }
  gfGroup.add(createRoundedToyMesh(1.9, 1.85, 0.48, MAT.sky, -4.4, 1.36, -2.1, 0.12));

  const martSignMat = makeClayMat(0xFFFFFF, { map: TEX.martSign, roughness: 0.35 });
  signMaterialsToRefresh.push({ mat: martSignMat, kind: 'mart' });
  const martSign = new THREE.Mesh(GEO.quad, martSignMat);
  martSign.scale.set(6.0, 1.08, 1);
  martSign.position.set(-5.2, 2.55, D / 2 + 0.3);
  const martAwning = createRoundedToyMesh(6.3, 0.32, 1.18, makeClayMat(0xFFFFFF, { map: TEX.awningCoral }), -5.2, 2.02, D / 2 + 0.68, 0.12);
  martAwning.rotation.x = 0.26;
  const martGarland = createGarland3D(5.8, 9);
  martGarland.position.set(-5.2, 1.76, D / 2 + 1.26);
  const martBalloons = createBalloonBunch3D(0.95);
  martBalloons.position.set(-8.55, 0.46, D / 2 + 0.95);
  gfGroup.add(martSign, martAwning, martGarland, martBalloons);

  // 우측 WASH PONG 코인세탁소
  gfGroup.add(createRoundedToyMesh(6.6, 0.09, D - 0.4, makeClayMat(0xEFF6FF), 5.2, 0.47, 0.2, 0.04));
  for (let i = 0; i < 3; i++) {
    const wx = 3.5 + i * 1.65;
    gfGroup.add(createRoundedToyMesh(1.24, 1.5, 0.96, MAT.white, wx, 1.18, -1.25, 0.16));
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.12, 20), MAT.sky);
    drum.rotation.x = Math.PI / 2;
    drum.position.set(wx, 1.18, -0.74);
    gfGroup.add(drum);
    spinningWashers.push(drum);
  }
  gfGroup.add(createRoundedToyMesh(0.86, 0.5, 0.66, MAT.butter, 7.2, 0.69, 1.1, 0.12));

  const washSignMat = makeClayMat(0xFFFFFF, { map: TEX.washSign, roughness: 0.35 });
  signMaterialsToRefresh.push({ mat: washSignMat, kind: 'wash' });
  const washSign = new THREE.Mesh(GEO.quad, washSignMat);
  washSign.scale.set(6.0, 1.08, 1);
  washSign.position.set(5.2, 2.55, D / 2 + 0.3);
  const washAwning = createRoundedToyMesh(6.3, 0.32, 1.18, makeClayMat(0xFFFFFF, { map: TEX.awningMint }), 5.2, 2.02, D / 2 + 0.68, 0.12);
  washAwning.rotation.x = 0.26;
  const washGarland = createGarland3D(5.8, 9);
  washGarland.position.set(5.2, 1.76, D / 2 + 1.26);
  const washBalloons = createBalloonBunch3D(0.95);
  washBalloons.position.set(8.55, 0.46, D / 2 + 0.95);
  gfGroup.add(washSign, washAwning, washGarland, washBalloons);

  // 중앙 로비 입구
  gfGroup.add(createRoundedToyMesh(2.9, 2.25, 0.34, MAT.woodWarm, 0, 1.55, D / 2 + 0.1, 0.14));
  gfGroup.add(createRoundedToyMesh(2.2, 1.95, 0.38, MAT.glass, 0, 1.42, D / 2 + 0.12, 0.1, false, false));

  // 실내 따뜻한 무드 조명
  const martLight = new THREE.PointLight(0xFFE4B5, 1.18, 9.5, 1.6);
  martLight.position.set(-5.2, 2.2, 0.6);
  const washLight = new THREE.PointLight(0xE0F2FE, 1.08, 9.5, 1.6);
  washLight.position.set(5.2, 2.2, 0.6);
  const roomWarmLight = new THREE.PointLight(0xFFF0D4, 0.0, 16.0, 1.4);
  roomWarmLight.position.set(0, 5.2, 1.6);
  gfGroup.add(martLight, washLight, roomWarmLight);
  reg.indoorLights.push(roomWarmLight);

  reg.root.add(gfGroup);

  // 층간 클레이 슬래브
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
    rg.userData.origScale = new THREE.Vector3(1, 1, 1);
    interiorGroup.add(rg);
    reg.roomGroups[room.id] = rg;
    rebuildRoom3D(room);
  }

  // X-Ray 반투명 파스텔 클레이 외벽 & 옥상 지붕 + 옥상 풍선다발!
  const facadeTex = lot.devType === 'mixed_2' ? TEX.brickMint : TEX.brickWarm;
  const facadeMat = makeClayMat(0xFFFFFF, {
    map: facadeTex,
    roughness: 0.62,
    transparent: true,
    opacity: 1.0
  });
  const roofMat = makeClayMat(lot.devType === 'mixed_2' ? 0x4ADE80 : 0xFF7E98, {
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
  const frontWall = createRoundedToyMesh(W + 0.25, 5.65, 0.3, facadeMat, 0, 5.82, D / 2 + 0.34, 0.14);
  frontWall.userData = { lotId: lot.lotId, isShell: true };
  frontFacade.add(frontWall);

  for (const wy of [4.35, 7.15]) {
    for (const wx of [-5.6, 0, 5.6]) {
      frontFacade.add(createRoundedToyMesh(2.55, 1.48, 0.36, facadeMat, wx, wy, D / 2 + 0.38, 0.12));
      frontFacade.add(createRoundedToyMesh(2.22, 1.2, 0.4, glassWinMat, wx, wy, D / 2 + 0.41, 0.08, false, false));
      frontFacade.add(createRoundedToyMesh(2.68, 0.24, 0.4, MAT.woodWarm, wx, wy - 0.8, D / 2 + 0.52, 0.08));
    }
  }
  reg.root.add(frontFacade);

  const roofCapGroup = new THREE.Group();
  const roofSlab = createRoundedToyMesh(W + 1.0, 0.56, D + 1.05, roofMat, 0, 8.86, 0.2, 0.24);
  const chimney = createRoundedToyMesh(0.98, 1.18, 0.98, facadeMat, 6.2, 9.52, -1.2, 0.16);
  const roofBalloonL = createBalloonBunch3D(1.05);
  roofBalloonL.position.set(-7.6, 9.1, 2.2);
  const roofBalloonR = createBalloonBunch3D(1.05);
  roofBalloonR.position.set(7.6, 9.1, 2.2);
  roofCapGroup.add(roofSlab, chimney, roofBalloonL, roofBalloonR);
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
// 7. 공용시설 4종 & 1층 정문 지배인 부스 (+ 가랜드!)
// =========================================================
function rebuildPublicInfraAndManager3D(lotId) {
  const b = state.buildings[lotId];
  const reg = lot3D[lotId];
  if (!b || !reg) return;

  while (reg.infraGroup.children.length > 0) reg.infraGroup.remove(reg.infraGroup.children[0]);
  while (reg.managerGroup.children.length > 0) reg.managerGroup.remove(reg.managerGroup.children[0]);
  reg.elevatorCar = null;

  if (b.infra.elevator) {
    const shaft = createRoundedToyMesh(2.1, 8.4, 2.1, MAT.glass, 9.9, 4.5, 0.4, 0.16, false, false);
    const topCap = createRoundedToyMesh(2.38, 0.48, 2.38, MAT.sky, 9.9, 8.84, 0.4, 0.16);
    const car = createRoundedToyMesh(1.68, 1.95, 1.68, MAT.butter, 9.9, 3.2, 0.4, 0.18);
    reg.infraGroup.add(shaft, topCap, car);
    reg.elevatorCar = car;
  } else {
    for (let s = 0; s < 8; s++) {
      reg.infraGroup.add(createRoundedToyMesh(1.25, 0.25, 0.56, MAT.woodWarm, 9.5, 0.8 + s * 0.65, 2.2 - s * 0.45, 0.08));
    }
  }

  if (b.infra.recycling) {
    reg.infraGroup.add(createRoundedToyMesh(2.85, 0.24, 1.7, MAT.mint, -10.1, 2.16, 1.6, 0.1));
    [MAT.sky, MAT.mint, MAT.butter].forEach((m, idx) => {
      const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.32, 0.98, 18), m);
      bin.position.set(-10.85 + idx * 0.78, 0.92, 1.6);
      bin.castShadow = true;
      reg.infraGroup.add(bin);
    });
  } else {
    for (let i = 0; i < 3; i++) {
      const bag = new THREE.Mesh(GEO.sphere, MAT.trashBag);
      bag.scale.set(0.56, 0.46, 0.56);
      bag.position.set(-9.7 + i * 0.42, 0.62, 1.9 + (i % 2) * 0.32);
      bag.castShadow = true;
      reg.infraGroup.add(bag);
    }
  }

  if (b.infra.parcel_box) {
    reg.infraGroup.add(createRoundedToyMesh(1.52, 1.88, 0.68, MAT.coral, 2.15, 1.38, 3.2, 0.14));
    reg.infraGroup.add(createRoundedToyMesh(0.46, 0.42, 0.72, MAT.screenCyan, 2.15, 1.55, 3.22, 0.05));
  }

  if (b.infra.rooftop_garden) {
    reg.infraGroup.add(createRoundedToyMesh(13.5, 0.24, 3.8, makeClayMat(0x86EFAC), 0, 9.18, 0.3, 0.14));
    for (const tx of [-4.5, 0, 4.5]) {
      const miniTree = createFluffyPastelTree(tx === 0, 0.7);
      miniTree.position.set(tx, 9.22, 0.3);
      reg.infraGroup.add(miniTree);
    }
  }

  // 1층 정문 지배인 부스 + 미니 가랜드 + 인사하는 제복 지배인
  if (b.manager.hired) {
    const booth = new THREE.Group();
    booth.position.set(0.1, 0.44, 4.25);
    booth.add(createRoundedToyMesh(1.78, 1.96, 1.48, MAT.cream, 0, 0.98, 0, 0.16));
    booth.add(createRoundedToyMesh(2.02, 0.32, 1.72, MAT.sky, 0, 2.08, 0, 0.12));
    booth.add(createRoundedToyMesh(1.38, 0.72, 1.54, MAT.glass, 0, 1.25, 0, 0.06, false, false));

    const mgrGarland = createGarland3D(1.85, 5);
    mgrGarland.position.set(0, 1.86, 0.88);
    booth.add(mgrGarland);

    const mgr = createChibiPerson3D('manager', false);
    mgr.position.set(1.38, 0.02, 0.25);
    booth.add(mgr);
    booth.userData.mgrMesh = mgr;
    reg.managerGroup.add(booth);
  }
}

// =========================================================
// 8. 호실 내부 몰랑몰랑 클레이 가구 5종 + 쓰레기산 + 이삿짐
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

  const floorMesh = createRoundedToyMesh(RW - 0.16, 0.16, RD - 0.16, floorMat, 0, 0.08, 0, 0.08, false, true);
  floorMesh.userData = { roomId: room.id, lotId: room.lotId };
  registerPick(floorMesh);
  rg.add(floorMesh);

  const backWall = createRoundedToyMesh(RW - 0.12, RH, 0.2, wallMat, 0, RH / 2, -RD / 2 + 0.1, 0.08);
  backWall.userData = { roomId: room.id, lotId: room.lotId };
  registerPick(backWall);
  rg.add(backWall);

  rg.add(createRoundedToyMesh(0.18, RH, RD - 0.16, wallMat, -RW / 2 + 0.09, RH / 2, 0, 0.08));

  if (room.soundproofed) {
    rg.add(createRoundedToyMesh(RW - 0.22, 0.13, RD - 0.22, MAT.sky, 0, 0.16, 0, 0.05));
  }

  rg.add(createRoundedToyMesh(RW - 0.16, 0.36, 0.16, MAT.woodLight, 0, 0.21, RD / 2 - 0.08, 0.08));

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
  const leaf1 = new THREE.Mesh(GEO.sphere, MAT.leafGreen);
  leaf1.scale.set(0.48, 0.54, 0.48);
  leaf1.position.y = 0.56;
  leaf1.castShadow = true;
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
    desk.add(createRoundedToyMesh(0.64, 0.36, 0.09, MAT.screenCyan, mx, 1.12, -0.17, 0.04));
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
    const canPositions = [
      [0.32, 0.25, -0.45, MAT.coral],
      [0.52, 0.25, -0.32, MAT.mint],
      [0.42, 0.25, -0.15, MAT.sky],
      [-0.08, 0.25, 0.65, MAT.butter]
    ];
    canPositions.forEach(([cx, cy, cz, cMat]) => {
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
      rg.add(bag);
    });
  }

  if (trashStage >= 3) {
    for (let i = 0; i < 6; i++) {
      const bag = new THREE.Mesh(GEO.sphere, MAT.trashBag);
      bag.scale.set(0.68, 0.62, 0.68);
      bag.position.set(-0.95 + (i % 3) * 0.66, 0.45 + Math.floor(i / 3) * 0.36, 0.55 + (i % 2) * 0.52);
      bag.castShadow = true;
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
// 9. 호실 입주민 치비 동기화 & X-Ray 스마트 단면 컷어웨이
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

function updateXRayCutaway(dt) {
  const z = camera.zoom;
  let targetOpacity = 1.0;
  if (z > 1.15) {
    targetOpacity = Math.max(0.06, 1.0 - (z - 1.15) / 0.55);
  }
  currentShellOpacity += (targetOpacity - currentShellOpacity) * Math.min(1, dt * 9);

  const showInterior = currentShellOpacity < 0.93;
  const indoorIntensity = THREE.MathUtils.clamp((1 - currentShellOpacity) * 1.45, 0, 1.35);
  const focusedRm = focusedRoomId ? findRoom(focusedRoomId) : null;

  for (const reg of Object.values(lot3D)) {
    if (reg.interiorGroup) reg.interiorGroup.visible = showInterior;
    if (reg.roofCapGroup) reg.roofCapGroup.visible = currentShellOpacity > 0.25;
    for (const m of reg.shellMaterials) {
      m.opacity = currentShellOpacity;
      m.depthWrite = currentShellOpacity > 0.82;
    }
    for (const ptLight of reg.indoorLights) {
      ptLight.intensity = indoorIntensity;
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
        if (r.floor === 2 && reg.roomGroups[r.id]) {
          reg.roomGroups[r.id].visible = !cutUpperFloor;
          if (residentActors[r.id]) {
            residentActors[r.id].forEach((ac) => { ac.mesh.visible = !cutUpperFloor; });
          }
        }
      }
    }
  }

  if (dom.hudXrayBadge) {
    const pct = Math.round((1 - currentShellOpacity) * 100);
    dom.hudXrayBadge.textContent = pct > 8 ? `내부투시 ${pct}%` : '외관 100%';
  }
}

// =========================================================
// 10. 층간소음 · 쓰레기방 악취 · 만족도 퇴거 · 관리인 자동 위임
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
  tag.innerHTML = `${createCustomSVGIcon('manager_cap', 18)}<span>지배인 자동 케어 출동!</span>`;
  if (lot) {
    setPinPos(tag, project(lot.x + 0.5, 2.4, lot.z + 4.1));
  }
  dom.careLayer.appendChild(tag);
  managerTagEls[lotId] = tag;
  setTimeout(() => {
    tag.remove();
    delete managerTagEls[lotId];
  }, 2800);
}

// =========================================================
// 11. 3D 파티클·이펙트 (바운스 + 스쿼시앤스트레치 + 코인 분수 + 소음 링)
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
  const baseY = obj.position.y;
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

function spawnCoinFountain3D(wx, wy, wz, count = 10, isSparkle = false) {
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(
      isSparkle ? GEO.sphere : GEO.coin,
      isSparkle ? new THREE.MeshBasicMaterial({ color: 0xFDE047 }) : MAT.coin
    );
    if (isSparkle) m.scale.setScalar(0.24);
    m.position.set(wx, wy, wz);
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
// 12. 카메라 포커스 & 호실 우측 인스펙터 카드 & 강제 퇴거 연출
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

  if (!room.unlocked) {
    dom.rfBody.innerHTML = `
      <div class="clay-subcard p-4 text-center space-y-3">
        <div class="flex justify-center">${createCustomSVGIcon('gold_key', 38)}</div>
        <div class="font-title text-base text-[#533928]">미개방 호실입니다</div>
        <p class="text-xs text-[#8A6D5B]">호실을 분양 오픈하면 리모델링과 세대 입주 계약을 진행할 수 있어요!</p>
        <button id="rf-btn-unlock" class="clay-btn clay-btn-butter w-full py-2.5 text-sm">
          ${createCustomSVGIcon('coin_stack', 20)}
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
      <div class="clay-subcard p-4 space-y-2.5">
        <div class="flex items-center gap-2">
          ${createCustomSVGIcon('gold_key', 24)}
          <span class="font-title text-sm text-[#065F46]">현재 공실 (적정 월세 ${mRent}만원)</span>
        </div>
        <p class="text-xs text-[#7A5E4B] leading-relaxed">5종 세대 유형별로 몰랑몰랑 맞춤 가구 세트와 층간소음·위생 상성이 적용됩니다.</p>
        <button id="rf-btn-recruit" class="clay-btn clay-btn-mint w-full py-2.5 text-sm">
          ${createCustomSVGIcon('megaphone', 18)}
          <span>입주 세대 모집하기</span>
        </button>
      </div>`;
  } else {
    const h = room.household;
    const hDef = HOUSEHOLD_TYPES[h.type];
    const paid = getEffectiveRent(room);
    const chipsHtml = (hDef.tagChips || []).map((t) => `<span class="pastel-tag-chip">${t}</span>`).join('');

    hhHtml = `
      <div class="clay-subcard p-3.5 space-y-3">
        <div class="flex items-center gap-3">
          ${createHouseholdAvatarSVG(h.type, 54)}
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-1">
              <span class="font-title text-base text-[#533928] truncate">${h.familyName}</span>
              <span class="font-num text-xs px-2.5 py-0.5 rounded-full bg-[#E8FBF3] text-[#059669] shrink-0">+${paid}만/${room.cycleSec}s</span>
            </div>
            <div class="text-xs text-[#8A6D5B] mt-0.5">${hDef.label} · ${hDef.memberCount}인 거주</div>
          </div>
        </div>

        <div class="flex flex-wrap gap-1.5">${chipsHtml}</div>

        <div class="space-y-1.5">
          <div class="flex items-center justify-between text-xs">
            <span class="flex items-center gap-1 text-[#6E503B]">${createCustomSVGIcon('heart_gauge', 15)} 행복도 <b class="font-num">${Math.round(h.happiness)}%</b></span>
            ${room.evictionCountdown !== null ? `<span class="text-[#E11D48] font-display animate-pulse">이사 위기 D-${Math.ceil(room.evictionCountdown)}s</span>` : ''}
          </div>
          <div class="pastel-gauge-track">
            <div class="pastel-gauge-fill ${h.happiness <= 35 ? 'gauge-coral' : 'gauge-mint'}" style="width:${Math.round(h.happiness)}%"></div>
          </div>
        </div>

        ${hDef.isHoarder ? `
          <div class="clay-peach-box p-2.5 space-y-2">
            <div class="flex items-center justify-between text-xs font-display text-[#581C87]">
              <span>쓰레기방 오염 단계: ${room.trashStage} / 3</span>
              ${room.trashStage >= 2 ? '<span class="text-[#E11D48]">이웃 악취 발생!</span>' : ''}
            </div>
            <button id="rf-btn-clean" class="clay-btn clay-btn-sky w-full py-2 text-xs">
              ${createCustomSVGIcon('broom_clean', 18)}
              <span>특수 청소 & 경고장 (${GAME_BALANCE.specialCleanCost}만)</span>
            </button>
          </div>
        ` : ''}

        <div class="grid grid-cols-2 gap-2 pt-0.5">
          ${!room.soundproofed ? `
            <button id="rf-btn-soundproof" class="clay-btn clay-btn-butter py-2 text-xs">
              ${createCustomSVGIcon('soundproof_hammer', 17)}
              <span>방음시공 (${GAME_BALANCE.soundproofCost}만)</span>
            </button>
          ` : `
            <div class="clay-btn clay-btn-cream py-2 text-xs opacity-80 pointer-events-none">
              ${createCustomSVGIcon('soundproof_hammer', 17)}
              <span>방음 완비됨</span>
            </div>
          `}
          <button id="rf-btn-gift" class="clay-btn clay-btn-cream py-2 text-xs">
            ${createCustomSVGIcon('gift_box', 17)}
            <span>중재선물 (${GAME_BALANCE.mediationGiftCost}만)</span>
          </button>
          <button id="rf-btn-relocate" class="clay-btn clay-btn-cream py-2 text-xs">
            ${createCustomSVGIcon('relocate_move', 17)}
            <span>빈방 이사 (${GAME_BALANCE.relocateCost}만)</span>
          </button>
          <button id="rf-btn-evict" class="clay-btn clay-btn-coral py-2 text-xs">
            ${createCustomSVGIcon('evict_stamp', 17)}
            <span>강제 퇴거</span>
          </button>
        </div>
      </div>`;
  }

  const remodelHtml = `
    <div class="clay-subcard p-3.5 space-y-2">
      <div class="flex items-center justify-between">
        <span class="font-display text-xs text-[#533928]">인테리어 등급: ${tier.name}</span>
        ${room.soundproofed ? '<span class="text-[10px] px-2 py-0.5 rounded-full bg-[#E0F2FE] text-[#0369A1] font-display">층간방음 완료</span>' : ''}
      </div>
      <div class="text-xs text-[#8A6D5B]">${nextTier ? `다음 시공: ${nextTier.name} (적정 월세 +${nextTier.rentAdd - tier.rentAdd}만)` : '최고급 로얄 크림 부티크 완성! (+25% 세트보너스)'}</div>
      ${nextTier ? `
        <button id="rf-btn-upgrade" class="clay-btn clay-btn-butter w-full py-2 text-xs">
          ${createCustomSVGIcon('red_house', 18)}
          <span>Lv.${room.interiorLv + 1} 리모델링 시공 (${nextTier.cost}만)</span>
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
      showToast(`${room.name} 층간 방음 시공 완료! 발망치 소음이 완벽 차단됩니다.`, 'emerald');
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
// 13. 28:72 스플릿 뷰 경영 수첩 & 황금 코인 말풍선 슬라이더
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
        <div data-qid="${q.id}" class="split-item-card ${sel ? 'selected' : ''}">
          ${createCustomSVGIcon(claimed ? 'gold_key' : 'quest_trophy', 28)}
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between text-[11px] font-display">
              <span class="text-[#8A6D5B]">퀘스트 ${idx + 1}</span>
              <span class="${claimed ? 'text-[#B09B8C]' : ready ? 'text-[#059669] animate-pulse' : 'text-[#D97706]'}">
                ${claimed ? '수령 완료' : ready ? '보상 대기!' : `+${q.reward}만`}
              </span>
            </div>
            <div class="font-display text-xs text-[#533928] truncate mt-0.5">${q.title}</div>
          </div>
        </div>`;
    }).join('');

    const curQ = QUEST_LIST.find((x) => x.id === selectedSplitItemId) || QUEST_LIST[0];
    const claimed = state.claimedQuests.includes(curQ.id);
    const ready = !claimed && curQ.check(state);
    const doneCount = state.claimedQuests.length;
    const pct = Math.round((doneCount / QUEST_LIST.length) * 100);

    dom.splitRightDetail.innerHTML = `
      <div class="space-y-4">
        <div class="clay-peach-box p-4 space-y-2">
          <div class="flex items-center justify-between font-display text-xs sm:text-sm text-[#5C3D28]">
            <span class="flex items-center gap-1.5">${createCustomSVGIcon('quest_trophy', 20)} 미니어처 타운 마스터 달성률</span>
            <span class="font-num">${doneCount} / ${QUEST_LIST.length} (${pct}%)</span>
          </div>
          <div class="pastel-gauge-track">
            <div class="pastel-gauge-fill gauge-butter" style="width:${pct}%"></div>
          </div>
        </div>

        <div class="clay-subcard p-5 sm:p-6 space-y-4">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <span class="pastel-tag-chip">${createCustomSVGIcon('coin_stack', 16)}<span class="ml-1">달성 보상 +${curQ.reward.toLocaleString()}만원</span></span>
            <span class="font-display text-xs text-[#9A7459]">${claimed ? '달성 완료된 미션' : ready ? '지금 바로 수령 가능!' : '진행 중인 목표'}</span>
          </div>
          <h3 class="font-title text-xl text-[#533928] sticker-tilt">${curQ.title}</h3>
          <p class="text-sm text-[#7A5E4B] leading-relaxed">${curQ.desc}</p>

          <div class="pt-2 flex gap-2.5">
            ${ready ? `
              <button id="sp-claim-q" class="clay-btn clay-btn-mint flex-1 py-3 text-sm">
                ${createCustomSVGIcon('coin_stack', 20)}
                <span>보상 +${curQ.reward.toLocaleString()}만원 즉시 수령하기!</span>
              </button>
            ` : claimed ? `
              <div class="clay-btn clay-btn-cream flex-1 py-3 text-sm opacity-70 pointer-events-none">이미 수령한 업적입니다</div>
            ` : `
              <button id="sp-go-q" class="clay-btn clay-btn-sky flex-1 py-3 text-sm">
                ${createCustomSVGIcon('red_house', 19)}
                <span>해당 현장으로 카메라 이동하기</span>
              </button>
            `}
          </div>
        </div>
      </div>`;

    dom.splitLeftList.querySelectorAll('.split-item-card').forEach((el) => {
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
        <div data-rid="${r.id}" class="split-item-card ${sel ? 'selected' : ''}">
          ${h ? createHouseholdAvatarSVG(h.type, 38) : createCustomSVGIcon('gold_key', 28)}
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between text-xs font-display">
              <span class="text-[#533928]">${r.name}</span>
              <span class="${hasCrisis ? 'text-[#E11D48]' : 'text-[#059669]'}">
                ${hasCrisis ? '케어 필요!' : h ? `${Math.round(h.happiness)}%` : '공실'}
              </span>
            </div>
            <div class="text-xs text-[#8A6D5B] truncate">${h ? `${h.familyName} · ${hDef.label}` : '신규 입주 가능'}</div>
          </div>
        </div>`;
    }).join('');

    const curR = allRooms.find((r) => r.id === selectedSplitItemId);
    if (curR) {
      const h = curR.household;
      const hDef = h ? HOUSEHOLD_TYPES[h.type] : null;
      if (!h) {
        dom.splitRightDetail.innerHTML = `
          <div class="clay-subcard p-7 text-center space-y-4">
            <div class="flex justify-center">${createCustomSVGIcon('red_house', 48)}</div>
            <h3 class="font-title text-xl text-[#533928]">${curR.name}은 현재 깨끗한 공실입니다</h3>
            <p class="text-xs text-[#8A6D5B]">적정 월세 <b>${calcRoomRent(curR)}만원</b> · 입주 세대를 모집해 따스한 보금자리를 채워보세요!</p>
            <button id="sp-rec-now" class="clay-btn clay-btn-mint px-6 py-3 text-sm">
              ${createCustomSVGIcon('megaphone', 19)}
              <span>입주 지원자 확인하기</span>
            </button>
          </div>`;
      } else {
        const chipsHtml = (hDef.tagChips || []).map((c) => `<span class="pastel-tag-chip">${c}</span>`).join('');
        const noiseMeter = hDef.noiseOutput;
        const paid = getEffectiveRent(curR);

        dom.splitRightDetail.innerHTML = `
          <div class="clay-subcard p-5 space-y-4">
            <div class="flex items-center justify-between flex-wrap gap-3">
              <div class="flex items-center gap-3.5">
                ${createHouseholdAvatarSVG(h.type, 64)}
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-title text-xl text-[#533928]">${curR.name} · ${h.familyName}</span>
                    <span class="text-xs font-display px-2.5 py-0.5 rounded-full text-white" style="background:${hDef.accentHex}">${hDef.label}</span>
                  </div>
                  <div class="text-xs text-[#8A6D5B] mt-1">${hDef.traitDesc}</div>
                </div>
              </div>
              <button id="sp-focus-room" class="clay-btn clay-btn-pill clay-btn-sky px-4 py-2 text-xs">
                ${createCustomSVGIcon('red_house', 16)}
                <span>방 클로즈업</span>
              </button>
            </div>

            <div class="flex flex-wrap gap-1.5">${chipsHtml}</div>

            <div class="clay-peach-box p-4 grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
              <div class="space-y-1.5">
                <div class="flex justify-between font-display"><span>행복도</span><span class="font-num">${Math.round(h.happiness)}%</span></div>
                <div class="pastel-gauge-track"><div class="pastel-gauge-fill ${h.happiness <= 35 ? 'gauge-coral' : 'gauge-mint'}" style="width:${Math.round(h.happiness)}%"></div></div>
              </div>
              <div class="space-y-1.5">
                <div class="flex justify-between font-display"><span>수취 월세 / 한도</span><span class="font-num">+${paid}/${h.maxBudget}만</span></div>
                <div class="pastel-gauge-track"><div class="pastel-gauge-fill gauge-butter" style="width:${Math.min(100, Math.round((paid / h.maxBudget) * 100))}%"></div></div>
              </div>
              <div class="space-y-1.5">
                <div class="flex justify-between font-display">
                  <span>${hDef.isHoarder ? '쓰레기 오염도' : '생활소음 지수'}</span>
                  <span class="font-num">${hDef.isHoarder ? `${curR.trashStage}/3단계` : `${noiseMeter}%`}</span>
                </div>
                <div class="pastel-gauge-track"><div class="pastel-gauge-fill gauge-sky" style="width:${hDef.isHoarder ? (curR.trashStage / 3) * 100 : noiseMeter}%"></div></div>
              </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <button id="sp-sound" ${curR.soundproofed ? 'disabled' : ''} class="clay-btn clay-btn-butter py-2.5 px-2 text-xs">
                ${createCustomSVGIcon('soundproof_hammer', 18)}
                <span>${curR.soundproofed ? '방음 완료' : `방음시공 (${GAME_BALANCE.soundproofCost}만)`}</span>
              </button>
              <button id="sp-clean" ${!hDef.isHoarder ? 'disabled' : ''} class="clay-btn clay-btn-sky py-2.5 px-2 text-xs">
                ${createCustomSVGIcon('broom_clean', 18)}
                <span>특수청소 (${GAME_BALANCE.specialCleanCost}만)</span>
              </button>
              <button id="sp-reloc" class="clay-btn clay-btn-cream py-2.5 px-2 text-xs">
                ${createCustomSVGIcon('relocate_move', 18)}
                <span>호실이동 (${GAME_BALANCE.relocateCost}만)</span>
              </button>
              <button id="sp-evict" class="clay-btn clay-btn-coral py-2.5 px-2 text-xs">
                ${createCustomSVGIcon('evict_stamp', 18)}
                <span>강제 퇴거</span>
              </button>
            </div>
          </div>`;
      }

      dom.splitLeftList.querySelectorAll('.split-item-card').forEach((el) => {
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
      <div data-bid="${b.lotId}" class="split-item-card ${selectedSplitItemId === b.lotId ? 'selected' : ''}">
        ${createCustomSVGIcon('manager_cap', 30)}
        <div class="min-w-0 flex-1">
          <div class="font-display text-xs text-[#533928] truncate">${b.title}</div>
          <div class="text-xs ${b.manager.hired ? 'text-[#059669]' : 'text-[#8A6D5B]'}">
            ${b.manager.hired ? '1층 지배인 상주 근무중' : '미고용 (직접 관리)'}
          </div>
        </div>
      </div>`).join('');

    dom.splitRightDetail.innerHTML = `
      <div class="clay-subcard p-5 space-y-4">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div class="flex items-center gap-3">
            ${createCustomSVGIcon('manager_cap', 42)}
            <div>
              <h3 class="font-title text-lg text-[#533928]">[${curB.title}] 1층 지배인실</h3>
              <p class="text-xs text-[#8A6D5B]">선임 시 1층 정문 앞 가랜드 부스에 상주하며 특수청소·중재·자동 입주를 대행합니다.</p>
            </div>
          </div>
          <button id="sp-toggle-mgr" class="clay-btn ${curB.manager.hired ? 'clay-btn-coral' : 'clay-btn-mint'} px-4 py-2.5 text-xs">
            ${createCustomSVGIcon('manager_cap', 18)}
            <span>${curB.manager.hired ? '지배인 해임 (직접관리)' : `지배인 선임 (계약금 ${GAME_BALANCE.managerHireFee}만)`}</span>
          </button>
        </div>

        <div class="clay-peach-box p-4 text-xs space-y-1.5">
          <div class="font-display text-sm text-[#533928]">지배인 고용 손익분기(ROI) 시뮬레이션</div>
          <div class="text-[#6E503B]">건물 주기 총수익: <b class="font-num text-[#059669]">+${grossRent}만원</b> · 지배인 고정 급여: <b class="font-num text-[#E11D48]">-${GAME_BALANCE.managerSalaryPerCycle}만원/주기</b></div>
          <div class="font-display ${netAfterMgr < 0 ? 'text-[#E11D48]' : 'text-[#059669]'}">
            ${netAfterMgr < 0
              ? `주의: 아직 입주 세대가 적어 고용 시 주기당 ${netAfterMgr}만원 적자입니다! 호실을 더 늘린 뒤 선임하세요.`
              : `안정 흑자 구간! 급여 차감 후에도 주기당 +${netAfterMgr}만원 순수익이 발생합니다!`}
          </div>
        </div>

        <div class="space-y-4 pt-1">
          <div class="clay-subcard p-4">
            <div class="flex justify-between items-center font-display text-xs text-[#533928]">
              <span>자동 입주 최소 월세 기준선</span>
              <span class="text-[#8A6D5B]">40만 ~ 260만</span>
            </div>
            <div class="coin-slider-wrap">
              <div id="tip-min-rent" class="coin-slider-bubble">최소 ${curB.manager.minRentFloor}만 원 이상 수취</div>
              <input id="slider-min-rent" type="range" min="40" max="260" step="10" value="${curB.manager.minRentFloor}" class="golden-coin-range" />
            </div>
          </div>

          <div class="clay-subcard p-4">
            <div class="flex justify-between items-center font-display text-xs text-[#533928]">
              <span>주기당 자동 청소·중재 재투자 예산 한도</span>
              <span class="text-[#8A6D5B]">0만 ~ 220만</span>
            </div>
            <div class="coin-slider-wrap">
              <div id="tip-auto-cap" class="coin-slider-bubble">주기당 최대 ${curB.manager.autoBudgetCap}만 원 지출</div>
              <input id="slider-auto-cap" type="range" min="0" max="220" step="15" value="${curB.manager.autoBudgetCap}" class="golden-coin-range" />
            </div>
          </div>
        </div>
      </div>`;

    dom.splitLeftList.querySelectorAll('.split-item-card').forEach((el) => {
      el.onclick = () => { selectedSplitItemId = el.dataset.bid; renderNotebookSplitView(); };
    });

    const sMin = document.getElementById('slider-min-rent');
    const bMin = document.getElementById('tip-min-rent');
    const sCap = document.getElementById('slider-auto-cap');
    const bCap = document.getElementById('tip-auto-cap');

    updateCoinSliderTooltip(sMin, bMin, (v) => `최소 ${v}만 원 이상 수취`);
    updateCoinSliderTooltip(sCap, bCap, (v) => `주기당 최대 ${v}만 원 지출`);

    sMin.oninput = (e) => {
      curB.manager.minRentFloor = Number(e.target.value);
      updateCoinSliderTooltip(sMin, bMin, (v) => `최소 ${v}만 원 이상 수취`);
    };
    sCap.oninput = (e) => {
      curB.manager.autoBudgetCap = Number(e.target.value);
      updateCoinSliderTooltip(sCap, bCap, (v) => `주기당 최대 ${v}만 원 지출`);
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
        showToast(`[${curB.title}] 1층 정문 앞에 가랜드 관리 부스와 지배인이 배치되었습니다!`, 'emerald');
      } else {
        curB.manager.hired = false;
        rebuildPublicInfraAndManager3D(curB.lotId);
        showToast(`[${curB.title}] 지배인을 해임하고 직접 관리로 전환했습니다.`, 'amber');
        renderNotebookSplitView();
      }
      saveState();
    };
  } else if (activeNotebookTab === 'infra') {
    if (!selectedSplitItemId || !state.lots.some((l) => l.lotId === selectedSplitItemId)) {
      selectedSplitItemId = state.lots[0].lotId;
    }

    dom.splitLeftList.innerHTML = state.lots.map((l) => {
      const cat = l.devType ? DEVELOPMENT_CATALOG[l.devType] : null;
      return `
        <div data-lid="${l.lotId}" class="split-item-card ${selectedSplitItemId === l.lotId ? 'selected' : ''}">
          ${createCustomSVGIcon(cat ? cat.svgIcon : 'gold_key', 28)}
          <div class="min-w-0 flex-1">
            <div class="font-display text-xs text-[#533928] truncate">${l.owned ? l.title : l.name}</div>
            <div class="text-xs text-[#8A6D5B]">${l.owned ? '가동 중' : `꽃밭 빈터 (${l.landPrice}만)`}</div>
          </div>
        </div>`;
    }).join('');

    const curLot = getLot(selectedSplitItemId) || state.lots[0];
    const curB = state.buildings[curLot.lotId];

    if (!curLot.owned) {
      dom.splitRightDetail.innerHTML = `
        <div class="clay-subcard p-7 text-center space-y-4">
          <div class="flex justify-center">${createCustomSVGIcon('berry_farm', 48)}</div>
          <h3 class="font-title text-xl text-[#533928]">${curLot.name} (꽃밭 나무 팻말 빈터)</h3>
          <p class="text-xs text-[#8A6D5B]">마을의 하얀 울타리 꽃밭 터입니다! 태양광 발전소, 딸기 농장, 벚꽃 공원, 베이커리, 2호관을 세울 수 있어요.</p>
          <button id="sp-open-dev" class="clay-btn clay-btn-mint px-6 py-3 text-sm">
            ${createCustomSVGIcon('gold_key', 18)}
            <span>나무 팻말 빈터로 이동해 착공하기</span>
          </button>
        </div>`;
      document.getElementById('sp-open-dev').onclick = () => {
        dom.notebookModal.classList.add('hidden');
        focusCameraOnLot(curLot.lotId, 1.25);
        if (lot3D[curLot.lotId]?.signpostPivot) triggerSquashStretch(lot3D[curLot.lotId].signpostPivot, 1.35);
        openLotDevModal(curLot.lotId);
      };
    } else if (curB) {
      const infraCards = Object.values(PUBLIC_INFRA_CATALOG).map((inf) => {
        const installed = curB.infra[inf.key];
        return `
          <div class="clay-subcard p-4 flex flex-col justify-between gap-3">
            <div>
              <div class="flex items-center justify-between gap-2">
                <span class="flex items-center gap-2 font-display text-sm text-[#533928]">
                  ${createCustomSVGIcon(inf.svgIcon, 24)}
                  <span>${inf.name}</span>
                </span>
                <span class="pastel-tag-chip">+${inf.rentBonusPct}% 월세</span>
              </div>
              <p class="text-xs text-[#8A6D5B] mt-2 leading-relaxed">${inf.desc}</p>
            </div>
            ${installed
              ? '<div class="clay-btn clay-btn-cream py-2 text-xs opacity-75 pointer-events-none">3D 시공 완료됨</div>'
              : `<button data-ikey="${inf.key}" class="btn-buy-infra clay-btn clay-btn-butter py-2 text-xs">${createCustomSVGIcon('coin_stack', 17)}<span>시공하기 (${inf.cost}만)</span></button>`}
          </div>`;
      }).join('');

      dom.splitRightDetail.innerHTML = `
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="font-title text-base sm:text-lg text-[#533928]">[${curB.title}] 공용 편의시설 & 상가</h3>
            <button id="sp-go-lot" class="clay-btn clay-btn-pill clay-btn-sky px-3.5 py-1.5 text-xs">현장 보기</button>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${infraCards}</div>
        </div>`;

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
        <div class="clay-subcard p-6 space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              ${createCustomSVGIcon(cat.svgIcon, 38)}
              <span class="font-title text-xl text-[#533928]">${curLot.title}</span>
            </div>
            <button id="sp-go-devlot" class="clay-btn clay-btn-pill clay-btn-sky px-4 py-2 text-xs">현장 보기</button>
          </div>
          <p class="text-sm text-[#7A5E4B]">${cat.desc}</p>
          <div class="clay-peach-box p-4 font-display text-sm text-[#059669]">
            ${cat.cycleSec}초마다 +${cat.cycleProfit}만원 자동 수익 창출 · 타운 전체 월세 시너지 +${cat.rentSynergyPct}%
          </div>
        </div>`;
      document.getElementById('sp-go-devlot').onclick = () => {
        dom.notebookModal.classList.add('hidden');
        focusCameraOnLot(curLot.lotId, 1.4);
      };
    }

    dom.splitLeftList.querySelectorAll('.split-item-card').forEach((el) => {
      el.onclick = () => { selectedSplitItemId = el.dataset.lid; renderNotebookSplitView(); };
    });
  }
}

// =========================================================
// 14. 세대 모집 모달 & 3D 나무 팻말 클릭 시 열리는 개발 모달
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
      <div class="clay-subcard p-4 flex flex-col justify-between gap-3">
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            ${createHouseholdAvatarSVG(c.type, 54)}
            <div class="min-w-0">
              <div class="font-title text-base text-[#533928] truncate">${c.familyName}</div>
              <span class="inline-block text-xs font-display text-white px-2.5 py-0.5 rounded-full mt-0.5" style="background:${c.def.accentHex}">
                ${c.def.label} (${c.def.memberCount}인)
              </span>
            </div>
          </div>

          <div class="flex flex-wrap gap-1">${chips}</div>

          <div class="clay-peach-box p-3 text-xs space-y-1.5">
            <div class="flex justify-between">
              <span class="text-[#6E503B]">희망 월세 한도</span>
              <span class="font-num text-[#059669]">최대 ${c.budget}만원</span>
            </div>
            <div class="text-xs text-[#9F1239]">${c.def.traitDesc}</div>
            <div class="text-xs text-[#7A5E4B]">${c.def.furnitureDesc}</div>
          </div>
        </div>

        <button data-cidx="${idx}" class="btn-sign-hh clay-btn clay-btn-mint w-full py-2.5 text-xs">
          ${createCustomSVGIcon('gold_key', 18)}
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
  dom.devLotBadge.textContent = `${lot.name} · 토지 분양비 ${lot.landPrice}만원`;

  const devKeys = ['solar_plant', 'urban_farm', 'sakura_park', 'bakery_cafe', 'mixed_2'];
  dom.devCardsGrid.innerHTML = devKeys.map((k) => {
    const cat = DEVELOPMENT_CATALOG[k];
    const total = lot.landPrice + cat.buildCost;
    const ok = state.gold >= total;
    return `
      <div class="clay-subcard p-4 flex flex-col justify-between gap-3">
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2.5">
              ${createCustomSVGIcon(cat.svgIcon, 30)}
              <span class="font-title text-base text-[#533928]">${cat.name}</span>
            </div>
            <span class="pastel-tag-chip">시너지 +${cat.rentSynergyPct}%</span>
          </div>
          <p class="text-xs text-[#7A5E4B] leading-relaxed">${cat.desc}</p>
          <div class="text-[11.5px] text-[#9A7459] font-display">토지 ${lot.landPrice}만 + 시공 ${cat.buildCost}만</div>
        </div>
        <button data-dtype="${k}" ${!ok ? 'disabled' : ''} class="btn-build-dev clay-btn ${ok ? 'clay-btn-mint' : 'clay-btn-cream'} w-full py-2.5 text-xs">
          ${createCustomSVGIcon('coin_stack', 18)}
          <span>개발 착공 (총 ${total.toLocaleString()}만원)</span>
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
// 15. 경제 틱 · 8대 힐링 액터 애니메이션 · 투영 오버레이(빈 땅 텍스트 제로!)
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
    ${createHouseholdAvatarSVG(hType, 30)}
    <span class="leading-snug">${text}</span>
  `;

  if (lot) {
    setPinPos(el, project(lot.x + room.lx, room.ly + 1.72, lot.z + room.lz + 0.4));
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

function tickMiniatureWorldLife(dt, nowSec) {
  // 1) 치비 입주민: 숨쉬기 + 머리 위 새싹/리본/프로펠러 탄성 흔들림 + 걸을 때 솜털 먼지구름(Puff)!
  for (const list of Object.values(residentActors)) {
    list.forEach((ac, idx) => {
      const lot = getLot(ac.room.lotId);
      const parts = ac.mesh.userData.animParts;
      const breath = Math.sin(nowSec * 3.4 + ac.breathOffset);
      if (parts) {
        parts.bodyRoot.scale.y = 1 + breath * 0.035;
        parts.bodyRoot.scale.x = 1 - breath * 0.018;
        parts.headGroup.rotation.z = Math.sin(nowSec * 1.8 + ac.breathOffset) * 0.04;
        if (parts.topperPivot) {
          parts.topperPivot.rotation.z = Math.sin(nowSec * 4.5 + ac.breathOffset) * 0.14;
        }
        if (parts.propellerBlade) {
          parts.propellerBlade.rotation.y += dt * 11.0;
        }
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
          if (parts.topperPivot) {
            parts.topperPivot.rotation.x = -Math.abs(Math.sin(ac.phase)) * 0.22;
          }
        }

        // 걸을 때 발밑 솜털 구름(Puff)!
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

  // 2) 시바견·비숑·고양이 산책 & 총총 발자국 솜털 구름(Puff)!
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

  // 3) 몽글몽글 솜사탕 구름 유영 & 꽃밭 나비/새 날갯짓
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

  // 4) 시냇물 위 노란 러버덕 튜브 & 종이배 둥실둥실 + 하얀 물결 반짝임!
  streamFloats.forEach((sf) => {
    sf.zPos += dt * sf.speed;
    if (sf.zPos > 25.5) sf.zPos = -25.5;
    // 아치 다리 아래를 자연스럽게 통과
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

  // 5) 풍선 다발 바람에 살랑살랑 & 봄바람 벚꽃잎·민들레 빛망울 부유
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

  // 6) 길거리 빨간 우체통 흔들림 · 낮잠 고양이 숨쉬기 · 장난감 미니카 주행 · 빈 부지 나무 팻말 살랑임
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
      // 아치 다리 근처에서 귀엽게 유턴
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
      const isHovered = hoveredEmptyLotId === reg.lotId;
      reg.signpostPivot.rotation.z = Math.sin(nowSec * (isHovered ? 8.5 : 2.2)) * (isHovered ? 0.12 : 0.035);
    }
  }

  // 7) 스쿼시 앤 스트레치(Squash & Stretch) 스프링 물리 업데이트
  for (let i = activeSquashes.length - 1; i >= 0; i--) {
    const sq = activeSquashes[i];
    sq.elapsed += dt;
    const t = sq.elapsed / sq.duration;
    if (t >= 1) {
      sq.obj.scale.copy(sq.baseScale);
      activeSquashes.splice(i, 1);
    } else {
      // 감쇠 조화 진동으로 쫀득한 젤리 텐션 구현
      const wave = Math.cos(t * Math.PI * 3.2) * Math.exp(-t * 4.2) * 0.16 * sq.intensity;
      const sx = 1 + wave;
      const sy = Math.max(0.7, 1 - wave * 1.15);
      sq.obj.scale.set(sq.baseScale.x * sx, sq.baseScale.y * sy, sq.baseScale.z * sx);
    }
  }

  // 8) 돌발 케어 버블 스폰
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
  btn.innerHTML = `${createCustomSVGIcon(tpl.svgIcon, 18)}<span>${tpl.label} +${tpl.cashReward}만!</span>`;

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
  setTimeout(() => el.remove(), 1250);
}

// [요구사항 1] 빈 부지(Empty Lot)의 상시 HTML 텍스트/말풍선은 아예 생성조차 하지 않음!
function rebuildStaticOverlayDOM() {
  dom.lotsLayer.innerHTML = '';
  dom.roomsLayer.innerHTML = '';
  dom.crisisLayer.innerHTML = '';
  Object.keys(lotOverlayEls).forEach((k) => delete lotOverlayEls[k]);
  Object.keys(roomOverlayEls).forEach((k) => delete roomOverlayEls[k]);
  Object.keys(crisisPinEls).forEach((k) => delete crisisPinEls[k]);

  for (const lot of state.lots) {
    // 빈 땅(!lot.owned)은 3D 피켓 울타리·꽃밭·나무 팻말로만 표현하고 텍스트 배지 전면 금지!
    if (!lot.owned) continue;

    const el = document.createElement('div');
    el.className = 'world-pin lot-clay-badge';
    el.dataset.sig = '';
    el.onclick = (e) => {
      e.stopPropagation();
      const b = state.buildings[lot.lotId];
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
      cPin.className = 'world-pin crisis-clay-pin hidden';
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

  // 소유 중인 건물에만 깔끔한 배지 표시 (빈 땅은 100% 무텍스트!)
  for (const lot of state.lots) {
    if (!lot.owned) continue;
    const el = lotOverlayEls[lot.lotId];
    if (!el) continue;
    const b = state.buildings[lot.lotId];

    if (b) {
      const occ = b.rooms.filter((r) => r.household).length;
      const sig = `b_${occ}_${b.pendingCoins}`;
      if (el.dataset.sig !== sig) {
        el.dataset.sig = sig;
        el.className = `world-pin lot-clay-badge ${b.pendingCoins > 0 ? 'coin-ready' : ''}`;
        el.innerHTML = b.pendingCoins > 0
          ? `${createCustomSVGIcon('coin_stack', 19)}<span>${b.title} · <b>+${b.pendingCoins}만 수금!</b></span>`
          : `${createCustomSVGIcon('red_house', 18)}<span>${b.title} · 입주 ${occ}/6</span>`;
      }
      el.style.opacity = isCloseUp ? '0' : '1';
      el.style.pointerEvents = isCloseUp ? 'none' : 'auto';
      setPinPos(el, project(lot.x, 10.7, lot.z));
    } else {
      const cat = DEVELOPMENT_CATALOG[lot.devType];
      const sig = `dev_${lot.devType}`;
      if (el.dataset.sig !== sig) {
        el.dataset.sig = sig;
        el.className = 'world-pin lot-clay-badge';
        el.innerHTML = `${createCustomSVGIcon(cat.svgIcon, 18)}<span>${lot.title} (+${cat.cycleProfit}만)</span>`;
      }
      el.style.opacity = isCloseUp ? '0.2' : '1';
      setPinPos(el, project(lot.x, 4.4, lot.z));
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
        if (!isCloseUp && hasCrisis) {
          cPin.classList.remove('hidden');
          const label =
            r.evictionCountdown !== null ? `퇴거 D-${Math.ceil(r.evictionCountdown)}s` :
            r.trashStage >= 2 ? '악취 민원!' : '소음 주의!';
          const sig = `c_${label}`;
          if (cPin.dataset.sig !== sig) {
            cPin.dataset.sig = sig;
            cPin.innerHTML = `${createCustomSVGIcon(r.trashStage >= 2 ? 'broom_clean' : 'megaphone', 16)}<span>${label}</span>`;
          }
          setPinPos(cPin, project(lot.x + r.lx, r.ly + 2.4, lot.z + r.lz + 1.8));
        } else {
          cPin.classList.add('hidden');
        }
      }

      if (rEl) {
        rEl.style.opacity = isCloseUp ? '1' : '0';
        rEl.style.pointerEvents = isCloseUp ? 'auto' : 'none';
        if (isCloseUp) {
          let sig = '';
          if (!r.unlocked) {
            sig = `lock_${r.unlockCost}`;
            if (rEl.dataset.sig !== sig) {
              rEl.dataset.sig = sig;
              rEl.innerHTML = `${createCustomSVGIcon('gold_key', 15)}<span>${r.name} (${r.unlockCost}만)</span>`;
            }
          } else if (!r.household) {
            const mr = calcRoomRent(r);
            sig = `vac_${mr}`;
            if (rEl.dataset.sig !== sig) {
              rEl.dataset.sig = sig;
              rEl.innerHTML = `${createCustomSVGIcon('red_house', 15)}<span>${r.name} · 공실 (${mr}만)</span>`;
            }
          } else {
            const rem = Math.max(1, Math.ceil(r.cycleSec - r.rentTimer));
            const paid = getEffectiveRent(r);
            const warn =
              r.evictionCountdown !== null ? ` · 위기 D-${Math.ceil(r.evictionCountdown)}s` :
              r.trashStage >= 2 ? ' · 악취!' :
              r.activeConflict === 'noise' ? ' · 소음!' : '';
            sig = `occ_${r.household.type}_${paid}_${rem}_${warn}`;
            if (rEl.dataset.sig !== sig) {
              rEl.dataset.sig = sig;
              rEl.innerHTML = `${createCustomSVGIcon('coin_stack', 15)}<span>${r.name} +${paid}만 (${rem}s)${warn}</span>`;
            }
          }
          setPinPos(rEl, project(lot.x + r.lx, r.ly + 2.55, lot.z + r.lz));
        }
      }

      const spEl = speechEls[r.id];
      if (spEl) {
        spEl.style.opacity = isCloseUp ? '1' : '0';
        if (isCloseUp) {
          setPinPos(spEl, project(lot.x + r.lx, r.ly + 1.72, lot.z + r.lz + 0.4));
        }
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
// 16. HUD 카운팅 보간 · 동화책 파스텔 채광 파이프라인 · 입력 바인딩
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
  dom.hudNetIncome.className = `font-num text-sm sm:text-lg leading-tight mt-0.5 ${roundedNet >= 0 ? 'text-[#059669]' : 'text-[#E11D48]'}`;

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
  el.innerHTML = `${createCustomSVGIcon(iconName, 20)}<span>${msg}</span>`;
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

  // [요구사항 3] 까만 그림자 제로! 복숭아빛·라벤더빛 파스텔 채광 설계
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

  // 그림자 면을 따뜻하게 물들이는 라벤더·피치 반사 보조광
  const pastelShadowFill = new THREE.DirectionalLight(0xF3E8FF, 0.58);
  pastelShadowFill.position.set(-24, 18, -18);
  scene.add(pastelShadowFill);

  buildCozyFloatingIsland();
  buildAllLots3D();
  spawnIslandPets3D();
}

function mountStaticCustomSVGIcons() {
  const mounts = [
    ['hud-ico-gold', 'coin_stack', 26],
    ['hud-ico-yield', 'red_house', 24],
    ['hud-ico-happy', 'heart_gauge', 23],
    ['hud-ico-overview', 'red_house', 17],
    ['hud-ico-collect', 'coin_stack', 18],
    ['rf-ico-house', 'red_house', 22],
    ['fab-svg-slot', 'town_notebook', 30],
    ['modal-ico-notebook', 'town_notebook', 30],
    ['tab-ico-quests', 'quest_trophy', 18],
    ['tab-ico-tenants', 'megaphone', 18],
    ['tab-ico-manager', 'manager_cap', 18],
    ['tab-ico-infra', 'elevator', 18],
    ['dev-ico-header', 'solar_panel', 28],
    ['rec-ico-header', 'gold_key', 28],
    ['stamp-ico-slot', 'evict_stamp', 36]
  ];
  for (const [id, name, size] of mounts) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = createCustomSVGIcon(name, size);
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

  // 마우스 호버 시 빈 부지 3D 나무 팻말 흔들림 인터랙션 및 커서 피드백
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (ptrs.size > 0) return;
    pointerNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointerNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointerNDC, camera);
    const hits = raycaster.intersectObjects(pickableMeshes, false);
    if (hits.length > 0) {
      renderer.domElement.style.cursor = 'pointer';
      const ud = hits[0].object.userData;
      hoveredEmptyLotId = ud.isEmptyLot ? ud.lotId : null;
    } else {
      renderer.domElement.style.cursor = 'grab';
      hoveredEmptyLotId = null;
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
    if (hits.length > 0) {
      const ud = hits[0].object.userData;
      if (ud.isStreetProp && ud.propRoot) {
        triggerSquashStretch(ud.propRoot, 1.35);
        spawnSmokePoof3D(hits[0].point.x, hits[0].point.y + 0.3, hits[0].point.z, 0xFFFDF9, 5);
        if (ud.label) showToast(ud.label, 'amber');
      } else if (ud.roomId) {
        focusCameraOnRoom(ud.roomId);
      } else if (ud.lotId) {
        const lot = getLot(ud.lotId);
        if (lot && !lot.owned) {
          // 빈 부지 클릭 시 3D 나무 망치 팻말이 통통 튀어 오르며 개발 젤리 팝업 오픈!
          const reg = lot3D[lot.lotId];
          if (reg?.signpostPivot) triggerSquashStretch(reg.signpostPivot, 1.55);
          if (reg?.root) triggerSquashStretch(reg.root, 1.05);
          spawnSmokePoof3D(lot.x, 1.1, lot.z, 0xFFFDF9, 7);
          openLotDevModal(lot.lotId);
        } else if (lot) {
          focusCameraOnLot(lot.lotId, 1.55);
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

    updateXRayCutaway(dt);

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
      if (p.shrink) {
        p.mesh.scale.multiplyScalar(0.95);
      }
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
