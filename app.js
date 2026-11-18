// =========================================================
// 【갓물주 라이프 3D: 미니미 타운 — 2026 Art & UI Remaster】 메인 엔진 (app.js)
// - Three.js PCFSoftShadowMap + ACESFilmicToneMapping(1.15) + 실내 무드 PointLight
// - TextureGenerator 프로시저럴 캔버스 텍스처 5종+ (헤링본/벽지/어닝/돌담길/파스텔벽돌)
// - RoundedBoxGeometry 다중 파츠 입체 가구 & 2등신 치비 캐릭터(눈 안광·볼터치·숨쉬기)
// - 카운팅 애니메이션 클레이 HUD, 68px 리플 FAB, 28:72 스플릿 모달, 황금 코인 슬라이더, 구름 말풍선
// =========================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const SAVE_KEY = 'god_landlord_remaster_2026_v1';

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
      minRentFloor: 80, // 최소 월세 수취 기준선 슬라이더 값
      autoBudgetCap: 90, // 자동 재투자 예산 한도 슬라이더 값
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

// --------------------- Three.js 전역 변수 및 캐시 ---------------------
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
let activeNotebookTab = 'quests';
let selectedSplitItemId = null;
let devModalLotId = null;
let recruitRoomTarget = null;
let recruitCandidates = [];

// HUD 카운팅 애니메이션 보간 상태
const hudAnim = {
  shownGold: 460,
  targetGold: 460,
  shownNet: 0,
  targetNet: 0,
  shownHappy: 100,
  targetHappy: 100
};

// 3D 공유 리소스 레지스트리
const GEO = {};
const MAT = {};
const TEX = {};
const roundedBoxCache = new Map();

const lot3D = {};
const pickableMeshes = [];
const spinningWashers = [];
const activeBounces = [];
const activeParticles = [];
const shockwaveRings = [];
const odorEmitters = {};
const residentActors = {};
const petActors = [];
const careBubbles = [];
let careTimer = 6.5;

// DOM 오버레이 레지스트리
const lotOverlayEls = {};
const roomOverlayEls = {};
const crisisPinEls = {};
const speechEls = {};
const managerTagEls = {};
const dom = {};

// =========================================================
// 1. [요구사항 5] 프로시저럴 캔버스 텍스처 생성기 (TextureGenerator)
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

  // 1) 따뜻한 오크/메이플 헤링본 원목 마루 패턴
  static herringboneWood(style = 'oak') {
    const palettes = {
      maple: ['#F8E2C8', '#F2D3AF', '#EAC396', '#C99A6B'],
      oak: ['#E9B882', '#DDA56A', '#D19558', '#9E6431'],
      royal: ['#FFFBF4', '#F7ECDC', '#EFE0C9', '#D8B475']
    };
    const [c1, c2, c3, lineCol] = palettes[style] || palettes.oak;
    return this.create((ctx, w, h) => {
      ctx.fillStyle = c1;
      ctx.fillRect(0, 0, w, h);
      const cols = [c1, c2, c3];
      const pw = 44;
      const ph = 16;
      for (let y = -48; y < h + 48; y += 22) {
        for (let x = -48; x < w + 48; x += 44) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = cols[Math.abs(Math.floor((x + y) / 22)) % 3];
          ctx.fillRect(0, 0, pw, ph);
          ctx.strokeStyle = lineCol;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(0, 0, pw, ph);
          ctx.restore();

          ctx.save();
          ctx.translate(x + 22, y + 11);
          ctx.rotate(-Math.PI / 4);
          ctx.fillStyle = cols[Math.abs(Math.floor((x - y) / 22) + 1) % 3];
          ctx.fillRect(0, 0, pw, ph);
          ctx.strokeStyle = lineCol;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(0, 0, pw, ph);
          ctx.restore();
        }
      }
    }, 2.2, 2.2, 256, 256);
  }

  // 2) 파스텔 스트라이프 & 크림 웨인스코팅 벽지 패턴
  static pastelStripeWallpaper(stripeA = '#FFFDF9', stripeB = '#FFE6EB', moldingHex = '#F5D0C5') {
    return this.create((ctx, w, h) => {
      const sw = 24;
      for (let x = 0; x < w; x += sw) {
        ctx.fillStyle = (x / sw) % 2 === 0 ? stripeA : stripeB;
        ctx.fillRect(x, 0, sw, h);
      }
      // 하단 웨인스코팅 몰딩 패널
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

  // 3) 1층 상가 스트라이프 어닝(차양막) 패턴
  static stripedAwning(accentHex = '#FF758F') {
    return this.create((ctx, w, h) => {
      const sw = 32;
      for (let x = 0; x < w; x += sw) {
        ctx.fillStyle = (x / sw) % 2 === 0 ? accentHex : '#FFFDF9';
        ctx.fillRect(x, 0, sw, h);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.fillRect(0, 0, w, h * 0.28);
      ctx.fillStyle = 'rgba(90,45,30,0.12)';
      ctx.fillRect(0, h * 0.85, w, h * 0.15);
    }, 2, 1, 256, 128);
  }

  // 4) 아일랜드 크림 보도블록(돌담길) 패턴
  static creamCobblestone() {
    return this.create((ctx, w, h) => {
      ctx.fillStyle = '#EFE3D3';
      ctx.fillRect(0, 0, w, h);
      const stones = ['#FFFDF9', '#FBF2E6', '#F5E6D3', '#FCEEE2'];
      for (let r = 0; r < 6; r++) {
        const offset = (r % 2) * 22;
        for (let c = -1; c < 7; c++) {
          const sx = c * 44 + offset + 4;
          const sy = r * 42 + 4;
          ctx.fillStyle = stones[(r * 3 + c + 4) % stones.length];
          ctx.beginPath();
          ctx.roundRect(sx, sy, 36, 34, 10);
          ctx.fill();
          ctx.strokeStyle = '#DECBB6';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }, 3, 1.4, 256, 256);
  }

  // 5) 건물 외벽 소프트 파스텔 벽돌·타일 질감
  static pastelBrickTile(bgHex = '#FFF8F0', tones = ['#FADCD0', '#F7C9B6', '#FDE8DC']) {
    return this.create((ctx, w, h) => {
      ctx.fillStyle = bgHex;
      ctx.fillRect(0, 0, w, h);
      for (let r = 0; r < 8; r++) {
        const off = (r % 2) * 24;
        for (let c = -1; c < 6; c++) {
          ctx.fillStyle = tones[(r + c + 5) % tones.length];
          ctx.beginPath();
          ctx.roundRect(c * 48 + off + 3, r * 32 + 3, 42, 26, 5);
          ctx.fill();
        }
      }
    }, 3, 2, 256, 256);
  }

  // 아일랜드 클로버 잔디밭 질감
  static cloverMeadow() {
    return this.create((ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#9BE8A8');
      grad.addColorStop(1, '#76D68E');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 65; i++) {
        ctx.fillStyle = i % 3 === 0 ? '#B8F5C2' : '#63C47D';
        ctx.beginPath();
        ctx.arc((i * 47) % w, (i * 73) % h, 4 + (i % 4), 0, Math.PI * 2);
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

  // 반짝이는 시냇물 텍스처
  static streamWater() {
    return this.create((ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#7DD3FC');
      g.addColorStop(1, '#38BDF8');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
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

  // 고해상도 파스텔 상가 간판
  static storeSign(bgTop, bgBot, borderHex, title, subText, textHex = '#FFFFFF') {
    return this.create((ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, bgTop);
      g.addColorStop(1, bgBot);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(4, 4, w - 8, h - 8, 26);
      ctx.fill();
      ctx.strokeStyle = borderHex;
      ctx.lineWidth = 8;
      ctx.stroke();

      ctx.fillStyle = textHex;
      ctx.font = '700 42px Fredoka, Jua, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(title, w / 2, h * 0.44);

      ctx.font = '600 22px Jua, Pretendard Variable, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fillText(subText, w / 2, h * 0.78);
    }, 1, 1, 512, 140);
  }

  // 공실 기본 시멘트 바닥
  static cementFloor() {
    return this.create((ctx, w, h) => {
      ctx.fillStyle = '#D6CFC7';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#B8AFA6';
      ctx.lineWidth = 2;
      ctx.strokeRect(6, 6, w - 12, h - 12);
      ctx.beginPath();
      ctx.moveTo(45, 60);
      ctx.lineTo(95, 110);
      ctx.lineTo(135, 155);
      ctx.stroke();
    }, 2, 2, 256, 256);
  }

  // 부드러운 접촉 그림자 블롭
  static softContactShadow() {
    return this.create((ctx, s) => {
      const g = ctx.createRadialGradient(s / 2, s / 2, s * 0.08, s / 2, s / 2, s * 0.48);
      g.addColorStop(0, 'rgba(72, 42, 20, 0.34)');
      g.addColorStop(0.65, 'rgba(72, 42, 20, 0.12)');
      g.addColorStop(1, 'rgba(72, 42, 20, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    }, 1, 1, 128, 128);
  }
}

// 둥근 모서리 RoundedBoxGeometry 캐싱 및 그림자 자동 세팅 헬퍼
function getRBoxGeo(w, h, d, r = 0.06, segs = 3) {
  const safeR = Math.min(r, w * 0.45, h * 0.45, d * 0.45);
  const key = `${w.toFixed(2)}_${h.toFixed(2)}_${d.toFixed(2)}_${safeR.toFixed(3)}_${segs}`;
  if (!roundedBoxCache.has(key)) {
    roundedBoxCache.set(key, new RoundedBoxGeometry(w, h, d, segs, safeR));
  }
  return roundedBoxCache.get(key);
}

function makeRBox(w, h, d, mat, x = 0, y = 0, z = 0, r = 0.06, cast = true, receive = true) {
  const m = new THREE.Mesh(getRBoxGeo(w, h, d, r, 3), mat);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

function initSharedResources() {
  TEX.shadow = TextureGenerator.softContactShadow();
  TEX.meadow = TextureGenerator.cloverMeadow();
  TEX.water = TextureGenerator.streamWater();
  TEX.cobble = TextureGenerator.creamCobblestone();
  TEX.brickWarm = TextureGenerator.pastelBrickTile('#FFF9F2', ['#FADCD0', '#F8CBB8', '#FDEAE0']);
  TEX.brickMint = TextureGenerator.pastelBrickTile('#F6FFFB', ['#CCFBF1', '#A7F3D0', '#E6FFFA']);

  TEX.floor0 = TextureGenerator.cementFloor();
  TEX.floor1 = TextureGenerator.herringboneWood('maple');
  TEX.floor2 = TextureGenerator.herringboneWood('oak');
  TEX.floor3 = TextureGenerator.herringboneWood('royal');

  TEX.wall0 = TextureGenerator.pastelStripeWallpaper('#EAE4DC', '#E0D8CE', '#CFC5B9');
  TEX.wall1 = TextureGenerator.pastelStripeWallpaper('#FFFDF9', '#FFE8EE', '#F8C8D4');
  TEX.wall2 = TextureGenerator.pastelStripeWallpaper('#FFFDF9', '#E6F7F0', '#BCE6D5');
  TEX.wall3 = TextureGenerator.pastelStripeWallpaper('#FFFDF9', '#FEF3C7', '#F7D488');

  TEX.awningCoral = TextureGenerator.stripedAwning('#FF758F');
  TEX.awningMint = TextureGenerator.stripedAwning('#34D399');
  TEX.awningButter = TextureGenerator.stripedAwning('#FBBF24');

  TEX.martSign = TextureGenerator.storeSign('#FF8FA3', '#FF6B8B', '#FFFDF9', '24H MINI MART', '신선편의점 · 야식 & 도시락');
  TEX.washSign = TextureGenerator.storeSign('#60A5FA', '#38BDF8', '#FFFDF9', 'WASH PONG', '24시 버블 코인세탁소');
  TEX.cafeSign = TextureGenerator.storeSign('#FBBF24', '#F59E0B', '#FFFDF9', 'CREAM BAKERY', '수제 크루아상 & 스페셜티 커피');

  GEO.sphere = new THREE.SphereGeometry(0.5, 18, 14);
  GEO.cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 18);
  GEO.cone = new THREE.ConeGeometry(0.6, 1, 16);
  GEO.quad = new THREE.PlaneGeometry(1, 1);
  GEO.coin = new THREE.CylinderGeometry(0.24, 0.24, 0.08, 16);
  GEO.coin.rotateX(Math.PI / 2);
  GEO.ring = new THREE.RingGeometry(0.32, 0.66, 28);

  MAT.shadow = new THREE.MeshBasicMaterial({ map: TEX.shadow, transparent: true, depthWrite: false });
  MAT.slab = new THREE.MeshStandardMaterial({ color: 0xFFFDF8, roughness: 0.65 });
  MAT.woodLight = new THREE.MeshStandardMaterial({ color: 0xE7B27C, roughness: 0.6 });
  MAT.woodWarm = new THREE.MeshStandardMaterial({ color: 0xB87642, roughness: 0.62 });
  MAT.woodDark = new THREE.MeshStandardMaterial({ color: 0x7A4924, roughness: 0.68 });
  MAT.white = new THREE.MeshStandardMaterial({ color: 0xFFFDF9, roughness: 0.42 });
  MAT.cream = new THREE.MeshStandardMaterial({ color: 0xFFF4E6, roughness: 0.52 });
  MAT.coral = new THREE.MeshStandardMaterial({ color: 0xFF758F, roughness: 0.48 });
  MAT.pinkSoft = new THREE.MeshStandardMaterial({ color: 0xFFB3C6, roughness: 0.52 });
  MAT.mint = new THREE.MeshStandardMaterial({ color: 0x4ADE80, roughness: 0.5 });
  MAT.mintSoft = new THREE.MeshStandardMaterial({ color: 0xA7F3D0, roughness: 0.5 });
  MAT.sky = new THREE.MeshStandardMaterial({ color: 0x60A5FA, roughness: 0.45 });
  MAT.butter = new THREE.MeshStandardMaterial({ color: 0xFCD34D, roughness: 0.45 });
  MAT.lavender = new THREE.MeshStandardMaterial({ color: 0xC4B5FD, roughness: 0.55 });
  MAT.purpleDark = new THREE.MeshStandardMaterial({ color: 0x581C87, roughness: 0.65 });
  MAT.charcoal = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.45 });
  MAT.silver = new THREE.MeshStandardMaterial({ color: 0xE2E8F0, metalness: 0.45, roughness: 0.3 });
  MAT.gold = new THREE.MeshStandardMaterial({ color: 0xFACC15, metalness: 0.4, roughness: 0.25, emissive: 0x92400E, emissiveIntensity: 0.16 });
  MAT.glass = new THREE.MeshStandardMaterial({ color: 0xE0F2FE, transparent: true, opacity: 0.46, roughness: 0.12, metalness: 0.15 });
  MAT.screenCyan = new THREE.MeshStandardMaterial({ color: 0x38BDF8, emissive: 0x0EA5E9, emissiveIntensity: 0.85, roughness: 0.2 });
  MAT.screenPurple = new THREE.MeshStandardMaterial({ color: 0xC084FC, emissive: 0x9333EA, emissiveIntensity: 0.9, roughness: 0.2 });
  MAT.movingBox = new THREE.MeshStandardMaterial({ color: 0xD9A066, roughness: 0.78 });
  MAT.trashBag = new THREE.MeshStandardMaterial({ color: 0x3F3F46, roughness: 0.35 });
  MAT.pizzaBox = new THREE.MeshStandardMaterial({ color: 0xF6AD55, roughness: 0.7 });
  MAT.leafGreen = new THREE.MeshStandardMaterial({ color: 0x52C472, roughness: 0.65 });
  MAT.sakuraPink = new THREE.MeshStandardMaterial({ color: 0xFFB7CE, roughness: 0.6 });
  MAT.coin = MAT.gold;
}

// =========================================================
// 2. 아기자기한 파스텔 수변 플로팅 아일랜드 & 다리 · 나무 조립
// =========================================================
function buildCozyFloatingIsland() {
  const island = new THREE.Group();

  // 잔디 상판 (둥근 실린더)
  const meadowTop = new THREE.Mesh(
    new THREE.CylinderGeometry(33.5, 32.2, 1.3, 48),
    new THREE.MeshStandardMaterial({ map: TEX.meadow, roughness: 0.86 })
  );
  meadowTop.position.y = -0.65;
  meadowTop.receiveShadow = true;
  island.add(meadowTop);

  // 따뜻한 테라코타 크림 절벽 중층 & 하층
  const cliffMid = new THREE.Mesh(
    new THREE.CylinderGeometry(31.8, 25.5, 3.8, 36),
    new THREE.MeshStandardMaterial({ color: 0xE8B288, roughness: 0.88 })
  );
  cliffMid.position.y = -3.1;
  island.add(cliffMid);

  const cliffBot = new THREE.Mesh(
    new THREE.CylinderGeometry(25.2, 13.5, 4.8, 28),
    new THREE.MeshStandardMaterial({ color: 0xC98B63, roughness: 0.92 })
  );
  cliffBot.position.y = -7.2;
  island.add(cliffBot);

  // 반짝이는 시냇물 (북서 -> 남동 S자 흐름)
  const waterMat = new THREE.MeshStandardMaterial({
    map: TEX.water,
    roughness: 0.14,
    metalness: 0.08,
    transparent: true,
    opacity: 0.93
  });
  const streamPts = [
    { x: 4.5, z: -26, w: 4.4, d: 10.5, rot: 0.12 },
    { x: 5.2, z: -16, w: 4.5, d: 11.2, rot: -0.08 },
    { x: 5.0, z: -5.5, w: 4.6, d: 11.5, rot: 0.06 },
    { x: 4.6, z: 5.2, w: 4.6, d: 11.5, rot: 0.1 },
    { x: 4.0, z: 16.0, w: 4.8, d: 12.2, rot: -0.08 },
    { x: 3.4, z: 25.5, w: 5.0, d: 10.0, rot: 0.0 }
  ];
  streamPts.forEach((seg) => {
    const wMesh = makeRBox(seg.w, 0.16, seg.d, waterMat, seg.x, 0.06, seg.z, 0.06, false, true);
    wMesh.rotation.y = seg.rot;
    island.add(wMesh);

    // 시냇가 둥근 조약돌 장식
    for (let s = -1; s <= 1; s += 2) {
      const pebble = new THREE.Mesh(GEO.sphere, MAT.cream);
      pebble.scale.set(0.55, 0.28, 0.45);
      pebble.position.set(seg.x + s * (seg.w * 0.54), 0.1, seg.z + (s * 1.6));
      pebble.receiveShadow = true;
      island.add(pebble);
    }
  });

  // 크림 돌담 산책로 (TextureGenerator.creamCobblestone 적용!)
  const cobbleMat = new THREE.MeshStandardMaterial({ map: TEX.cobble, roughness: 0.8 });
  const mainRoad = makeRBox(38, 0.1, 3.6, cobbleMat, -1.0, 0.05, 3.0, 0.04, false, true);
  island.add(mainRoad);
  const westRoad = makeRBox(3.2, 0.1, 21, cobbleMat, -13.5, 0.05, 1.5, 0.04, false, true);
  island.add(westRoad);
  const eastRoad = makeRBox(3.2, 0.1, 21, cobbleMat, 13.5, 0.05, 2.2, 0.04, false, true);
  island.add(eastRoad);

  // 아기자기한 원목 아치 다리 + 따뜻하게 빛나는 다리 등불
  const bridge = new THREE.Group();
  bridge.position.set(4.8, 0.12, 3.0);
  for (let i = -4; i <= 4; i++) {
    const t = i / 4;
    const archY = Math.cos(t * Math.PI * 0.5) * 0.68;
    const plank = makeRBox(0.72, 0.16, 3.8, MAT.woodLight, i * 0.78, archY, 0, 0.05);
    bridge.add(plank);
  }
  for (const side of [-1.75, 1.75]) {
    for (const px of [-2.8, 0, 2.8]) {
      const post = makeRBox(0.2, 1.15, 0.2, MAT.woodDark, px, 0.75, side, 0.05);
      bridge.add(post);
      if (px === 0) {
        const lantern = new THREE.Mesh(GEO.sphere, MAT.gold);
        lantern.scale.setScalar(0.32);
        lantern.position.set(px, 1.42, side);
        bridge.add(lantern);
      }
    }
    const rail = makeRBox(6.4, 0.14, 0.14, MAT.woodWarm, 0, 1.2, side, 0.04);
    bridge.add(rail);
  }
  island.add(bridge);

  // 몽글몽글 파스텔 나무 & 벚꽃 나무 배치
  const treeCoords = [
    [-25, -13, true], [-23, 9, false], [-8, -19, true], [-2, 18, false],
    [22, -13, true], [23, 9, true], [16, 20, false], [-21, 19, true],
    [10, -21, false], [-15, -16, false], [21, -2, false]
  ];
  treeCoords.forEach(([tx, tz, isSakura], idx) => {
    const tree = createFluffyPastelTree(isSakura, 0.92 + (idx % 3) * 0.16);
    tree.position.set(tx, 0.05, tz);
    island.add(tree);
  });

  // 수변 공원 나무 벤치
  const bench = createParkBench3D();
  bench.position.set(0.8, 0.08, 6.2);
  bench.rotation.y = -0.35;
  island.add(bench);

  scene.add(island);
}

function createFluffyPastelTree(isSakura = false, scale = 1.0) {
  const g = new THREE.Group();
  const shadow = new THREE.Mesh(GEO.quad, MAT.shadow);
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(2.4, 2.4, 1);
  shadow.position.y = 0.02;
  g.add(shadow);

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 1.5, 12), MAT.woodDark);
  trunk.position.y = 0.75;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  g.add(trunk);

  const leafMat = isSakura ? MAT.sakuraPink : MAT.leafGreen;
  const puffs = [
    [0, 1.95, 0, 1.45],
    [-0.55, 1.65, 0.35, 1.05],
    [0.58, 1.7, -0.28, 1.08],
    [0.12, 2.42, 0.15, 1.02]
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
  g.add(makeRBox(1.7, 0.12, 0.55, MAT.woodLight, 0, 0.42, 0, 0.04));
  g.add(makeRBox(1.7, 0.45, 0.1, MAT.woodLight, 0, 0.72, -0.22, 0.04));
  g.add(makeRBox(0.14, 0.42, 0.5, MAT.woodDark, -0.7, 0.21, 0, 0.03));
  g.add(makeRBox(0.14, 0.42, 0.5, MAT.woodDark, 0.7, 0.21, 0, 0.03));
  return g;
}

// =========================================================
// 3. [요구사항 6] 2등신 치비 캐릭터(눈 안광·볼터치·숨쉬기) & 반려동물 3종
// =========================================================
function createChibiPerson3D(style = 'student', isKid = false) {
  const g = new THREE.Group();
  const s = isKid ? 0.68 : 1.0;

  const outfitPalette = {
    student: 0x60A5FA,
    newlywed_m: 0x38BDF8,
    newlywed_f: 0xFF758F,
    family_m: 0x34D399,
    family_f: 0xFBBF24,
    kid: 0xFB923C,
    elderly_m: 0xA8A29E,
    elderly_f: 0xFDBA74,
    hikikomori: 0x581C87,
    manager: 0x1E3A8A
  };
  const bodyColor = outfitPalette[style] || 0x60A5FA;
  const clothMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.5 });
  const skinMat = new THREE.MeshStandardMaterial({
    color: style === 'hikikomori' ? 0xF5EBF9 : 0xFFE2D1,
    roughness: 0.48
  });

  // 바닥 그림자
  const sh = new THREE.Mesh(GEO.quad, MAT.shadow);
  sh.rotation.x = -Math.PI / 2;
  sh.scale.set(0.85, 0.85, 1);
  sh.position.y = 0.02;
  g.add(sh);

  // 숨쉬기 애니메이션용 상체 루트
  const bodyRoot = new THREE.Group();
  g.add(bodyRoot);

  // 통통한 짧은 다리 2개
  const legL = makeRBox(0.16, 0.24, 0.18, MAT.charcoal, -0.11, 0.12, 0, 0.06);
  const legR = makeRBox(0.16, 0.24, 0.18, MAT.charcoal, 0.11, 0.12, 0, 0.06);
  g.add(legL, legR);

  // 동글동글 상체 스웨터/유니폼
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.46, 16), clothMat);
  torso.position.y = 0.44;
  torso.castShadow = true;
  bodyRoot.add(torso);

  // 앙증맞은 양팔
  const armL = makeRBox(0.13, 0.3, 0.14, clothMat, -0.3, 0.44, 0.02, 0.06);
  armL.rotation.z = 0.24;
  const armR = makeRBox(0.13, 0.3, 0.14, clothMat, 0.3, 0.44, 0.02, 0.06);
  armR.rotation.z = -0.24;
  bodyRoot.add(armL, armR);

  // 2등신 큰 머리 그룹
  const headGroup = new THREE.Group();
  headGroup.position.y = 0.92;
  bodyRoot.add(headGroup);

  const head = new THREE.Mesh(GEO.sphere, skinMat);
  head.scale.set(0.66, 0.62, 0.64);
  head.castShadow = true;
  headGroup.add(head);

  // 까만 눈동자 + 반짝이는 하얀 안광(Catchlight) 구체 + 발그레한 볼터치!
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(GEO.sphere, MAT.charcoal);
    eye.scale.set(0.095, 0.115, 0.06);
    eye.position.set(sx * 0.13, -0.01, 0.3);
    headGroup.add(eye);

    const catchlight = new THREE.Mesh(GEO.sphere, MAT.white);
    catchlight.scale.setScalar(0.036);
    catchlight.position.set(sx * 0.13 + 0.022, 0.022, 0.33);
    headGroup.add(catchlight);

    const cheek = new THREE.Mesh(GEO.sphere, style === 'hikikomori' ? MAT.lavender : MAT.coral);
    cheek.scale.set(0.11, 0.065, 0.04);
    cheek.position.set(sx * 0.21, -0.08, 0.27);
    headGroup.add(cheek);
  }

  // 세대별 맞춤 헤어·후드·안경·모자 파츠
  if (style === 'hikikomori') {
    const hood = new THREE.Mesh(GEO.sphere, MAT.purpleDark);
    hood.scale.set(0.74, 0.72, 0.72);
    hood.position.set(0, 0.03, -0.04);
    headGroup.add(hood);
  } else if (style === 'manager') {
    const capCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.33, 0.2, 16), clothMat);
    capCrown.position.y = 0.27;
    const visor = makeRBox(0.46, 0.06, 0.26, MAT.charcoal, 0, 0.2, 0.24, 0.02);
    const goldBadge = new THREE.Mesh(GEO.sphere, MAT.gold);
    goldBadge.scale.setScalar(0.09);
    goldBadge.position.set(0, 0.28, 0.33);
    const tie = makeRBox(0.09, 0.24, 0.06, MAT.coral, 0, 0.45, 0.25, 0.02);
    headGroup.add(capCrown, visor, goldBadge);
    bodyRoot.add(tie);
  } else if (style === 'elderly_m' || style === 'elderly_f') {
    const silverHair = new THREE.MeshStandardMaterial({ color: 0xE5E7EB, roughness: 0.6 });
    const hair = new THREE.Mesh(GEO.sphere, silverHair);
    hair.scale.set(0.69, 0.52, 0.68);
    hair.position.set(0, 0.11, -0.03);
    headGroup.add(hair);
    if (style === 'elderly_f') {
      const bun = new THREE.Mesh(GEO.sphere, silverHair);
      bun.scale.setScalar(0.24);
      bun.position.set(0, 0.34, -0.14);
      headGroup.add(bun);
    }
  } else {
    const hairMat = new THREE.MeshStandardMaterial({
      color: style.endsWith('_f') ? 0x6D3B1E : 0x292524,
      roughness: 0.55
    });
    const hair = new THREE.Mesh(GEO.sphere, hairMat);
    hair.scale.set(0.7, 0.55, 0.69);
    hair.position.set(0, 0.11, -0.03);
    headGroup.add(hair);

    if (style === 'student') {
      // 귀여운 코랄 헤드셋
      const band = makeRBox(0.7, 0.08, 0.12, MAT.coral, 0, 0.26, 0, 0.03);
      const earL = makeRBox(0.1, 0.22, 0.18, MAT.coral, -0.34, 0.02, 0.02, 0.04);
      const earR = makeRBox(0.1, 0.22, 0.18, MAT.coral, 0.34, 0.02, 0.02, 0.04);
      headGroup.add(band, earL, earR);
    } else if (style.endsWith('_f')) {
      const ponytail = new THREE.Mesh(GEO.sphere, hairMat);
      ponytail.scale.setScalar(0.24);
      ponytail.position.set(0, 0.22, -0.32);
      headGroup.add(ponytail);
    }
  }

  g.scale.setScalar(s);
  g.userData.animParts = { bodyRoot, headGroup, legL, legR, armL, armR, baseScale: s };
  return g;
}

function createCutePet3D(kind = 'shiba') {
  const g = new THREE.Group();
  const furColor = kind === 'shiba' ? 0xF59E0B : kind === 'bichon' ? 0xFFFDF9 : 0xFB923C;
  const furMat = new THREE.MeshStandardMaterial({ color: furColor, roughness: 0.58 });

  const sh = new THREE.Mesh(GEO.quad, MAT.shadow);
  sh.rotation.x = -Math.PI / 2;
  sh.scale.set(0.75, 0.75, 1);
  sh.position.y = 0.02;
  g.add(sh);

  // 통통한 몸통
  const body = makeRBox(0.36, 0.28, 0.54, furMat, 0, 0.24, 0, 0.11);
  g.add(body);

  // 큰 머리 (비숑은 솜사탕 아프로!)
  const head = new THREE.Mesh(GEO.sphere, furMat);
  head.scale.setScalar(kind === 'bichon' ? 0.48 : 0.38);
  head.position.set(0, 0.44, 0.24);
  head.castShadow = true;
  g.add(head);

  // 주둥이와 까만 코, 반짝이는 눈
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
    glint.scale.setScalar(0.025);
    glint.position.set(sx * 0.1 + 0.015, 0.485, 0.44);
    g.add(eye, glint);

    if (kind !== 'bichon') {
      const ear = new THREE.Mesh(GEO.cone, kind === 'cat' ? MAT.coral : furMat);
      ear.scale.set(0.16, 0.22, 0.14);
      ear.position.set(sx * 0.12, 0.63, 0.22);
      g.add(ear);
    }
  }

  // 짧은 네 다리 & 살랑거리는 꼬리
  for (const lx of [-0.11, 0.11]) {
    for (const lz of [-0.17, 0.17]) {
      g.add(makeRBox(0.09, 0.16, 0.09, furMat, lx, 0.09, lz, 0.04));
    }
  }
  const tail = new THREE.Mesh(GEO.sphere, furMat);
  tail.scale.set(0.15, 0.22, 0.15);
  tail.position.set(0, 0.36, -0.3);
  g.add(tail);
  g.userData.tail = tail;

  return g;
}

function spawnIslandPets3D() {
  const petConfigs = [
    { kind: 'shiba', x: -1.5, z: 3.6 },
    { kind: 'bichon', x: 8.8, z: 3.4 },
    { kind: 'cat', x: -9.2, z: 3.1 }
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
      tz: cfg.z + 1.0,
      timer: 1.5,
      phase: Math.random() * 6
    });
  });
}

// =========================================================
// 4. 부지 전체 빌드: 미매입 공터 / 비주거 랜드마크 / 주상복합 + 무드 PointLight
// =========================================================
function buildAllLots3D() {
  for (const lot of state.lots) {
    const root = new THREE.Group();
    root.position.set(lot.x, 0, lot.z);
    scene.add(root);

    lot3D[lot.lotId] = {
      lotId: lot.lotId,
      root,
      emptyGroup: null,
      shellMaterials: [],
      roofCapGroup: null,
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

  if (!lot.owned) {
    const eg = buildEmptyForSaleLot3D(lot);
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

function buildEmptyForSaleLot3D(lot) {
  const g = new THREE.Group();
  const padMat = new THREE.MeshStandardMaterial({ color: 0xD8F3DC, roughness: 0.85 });
  const pad = makeRBox(9.6, 0.22, 7.6, padMat, 0, 0.11, 0, 0.08, false, true);
  pad.userData = { lotId: lot.lotId, isEmptyLot: true };
  registerPick(pad);
  g.add(pad);

  // 파스텔 화이트 나무 울타리
  for (let x = -4.2; x <= 4.2; x += 2.1) {
    for (const z of [-3.4, 3.4]) {
      g.add(makeRBox(0.18, 0.65, 0.18, MAT.white, x, 0.4, z, 0.05));
    }
  }
  g.add(makeRBox(8.6, 0.1, 0.1, MAT.white, 0, 0.55, 3.4, 0.03));
  g.add(makeRBox(8.6, 0.1, 0.1, MAT.white, 0, 0.55, -3.4, 0.03));

  // 귀여운 분양 팻말
  const post = makeRBox(0.2, 1.5, 0.2, MAT.woodWarm, 0, 0.85, 0, 0.05);
  const board = makeRBox(2.3, 0.95, 0.18, MAT.butter, 0, 1.52, 0.08, 0.08);
  board.userData = { lotId: lot.lotId, isEmptyLot: true };
  registerPick(board);
  g.add(post, board);

  return g;
}

function buildIslandSpecialtyDev3D(lot, reg) {
  const g = new THREE.Group();
  const base = makeRBox(10.8, 0.28, 8.6, MAT.slab, 0, 0.14, 0, 0.1, true, true);
  base.userData = { lotId: lot.lotId };
  registerPick(base);
  g.add(base);

  if (lot.devType === 'solar_plant') {
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x1D4ED8, metalness: 0.55, roughness: 0.22 });
    for (const rz of [-2.0, 1.7]) {
      for (const rx of [-3.1, 0, 3.1]) {
        const stand = makeRBox(0.22, 1.05, 0.22, MAT.silver, rx, 0.65, rz, 0.04);
        const frame = makeRBox(2.5, 0.12, 1.85, MAT.white, rx, 1.24, rz, 0.04);
        frame.rotation.x = 0.44;
        const cell = makeRBox(2.32, 0.14, 1.68, panelMat, rx, 1.26, rz, 0.03);
        cell.rotation.x = 0.44;
        g.add(stand, frame, cell);
      }
    }
    const ess = makeRBox(2.2, 1.5, 1.4, MAT.mintSoft, -3.8, 0.95, 3.1, 0.12);
    g.add(ess);
  } else if (lot.devType === 'urban_farm') {
    const soilMat = new THREE.MeshStandardMaterial({ color: 0x6F4528, roughness: 0.92 });
    for (const rx of [-2.4, 2.4]) {
      g.add(makeRBox(3.8, 0.34, 6.2, MAT.woodWarm, rx, 0.34, -0.2, 0.08));
      g.add(makeRBox(3.45, 0.38, 5.85, soilMat, rx, 0.37, -0.2, 0.06));
      for (let cz = -2.2; cz <= 2.0; cz += 1.4) {
        for (const cx of [rx - 0.85, rx + 0.85]) {
          const sprout = new THREE.Mesh(GEO.sphere, MAT.leafGreen);
          sprout.scale.set(0.42, 0.28, 0.42);
          sprout.position.set(cx, 0.64, cz);
          sprout.castShadow = true;
          const berry = new THREE.Mesh(GEO.sphere, MAT.coral);
          berry.scale.setScalar(0.22);
          berry.position.set(cx + 0.08, 0.8, cz);
          berry.castShadow = true;
          g.add(sprout, berry);
          reg.cropMeshes.push({ sprout, berry });
        }
      }
    }
    // 아기자기한 빨간 지붕 오두막 창고
    const barn = makeRBox(2.3, 1.7, 1.9, MAT.cream, 0, 1.05, -2.8, 0.1);
    const roof = new THREE.Mesh(GEO.cone, MAT.coral);
    roof.scale.set(2.4, 1.2, 2.2);
    roof.position.set(0, 2.35, -2.8);
    roof.castShadow = true;
    g.add(barn, roof);
  } else if (lot.devType === 'sakura_park') {
    const grass = makeRBox(10.0, 0.14, 7.8, new THREE.MeshStandardMaterial({ color: 0xA7F3D0, roughness: 0.85 }), 0, 0.3, 0, 0.06);
    g.add(grass);
    [[-3.1, -2.0], [3.1, -2.0], [-2.7, 2.1], [2.9, 2.1]].forEach(([tx, tz]) => {
      const tr = createFluffyPastelTree(true, 1.12);
      tr.position.set(tx, 0.3, tz);
      g.add(tr);
    });
    // 중앙 파스텔 분수대
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.9, 0.52, 24), MAT.white);
    basin.position.set(0, 0.55, 0);
    basin.castShadow = true;
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.56, 24), MAT.sky);
    pool.position.set(0, 0.57, 0);
    g.add(basin, pool);
  } else if (lot.devType === 'bakery_cafe') {
    const body = makeRBox(7.2, 3.2, 5.2, new THREE.MeshStandardMaterial({ map: TEX.brickWarm, roughness: 0.72 }), 0, 1.85, -0.5, 0.16);
    const roof = makeRBox(7.6, 0.45, 5.6, MAT.coral, 0, 3.62, -0.5, 0.14);
    const sign = new THREE.Mesh(GEO.quad, new THREE.MeshStandardMaterial({ map: TEX.cafeSign, roughness: 0.35 }));
    sign.scale.set(4.8, 1.15, 1);
    sign.position.set(0, 2.95, 2.13);
    const awning = makeRBox(6.8, 0.32, 1.35, new THREE.MeshStandardMaterial({ map: TEX.awningButter, roughness: 0.55 }), 0, 2.1, 2.6, 0.08);
    awning.rotation.x = 0.25;
    g.add(body, roof, sign, awning);

    // 야외 파라솔 테이블 세트
    for (const tx of [-2.2, 2.2]) {
      const tbl = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.1, 18), MAT.white);
      tbl.position.set(tx, 0.85, 3.1);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 10), MAT.woodDark);
      pole.position.set(tx, 1.2, 3.1);
      const umbrella = new THREE.Mesh(GEO.cone, MAT.coral);
      umbrella.scale.set(1.75, 0.65, 1.75);
      umbrella.position.set(tx, 2.18, 3.1);
      umbrella.castShadow = true;
      g.add(tbl, pole, umbrella);
    }
  }

  reg.root.add(g);
}

// =========================================================
// 5. 주상복합 건물 (1층 24H 마트·워시퐁 + 실내 PointLight + 2~3층 6호실 + X-Ray 외피)
// =========================================================
function buildResidentialComplex3D(lot, reg) {
  const b = state.buildings[lot.lotId];
  const W = 17.6;
  const D = 5.6;

  // 1) 기초 석재 데크 & 층간 슬래브
  const baseDeck = makeRBox(W + 2.2, 0.44, D + 3.0, MAT.slab, 0, 0.22, 0.35, 0.12, true, true);
  baseDeck.userData = { lotId: lot.lotId };
  registerPick(baseDeck);
  reg.root.add(baseDeck);

  // 2) 1층 상가 아케이드 (24H MINI MART & WASH PONG + 따뜻한 실내 PointLight!)
  const gfGroup = new THREE.Group();
  gfGroup.add(makeRBox(W, 2.55, 0.24, MAT.cream, 0, 1.7, -D / 2 + 0.12, 0.05));

  // 좌측: 24H MINI MART (코랄 스트라이프 어닝 + 진열대 + 계산대 + 음료 냉장고)
  gfGroup.add(makeRBox(6.6, 0.08, D - 0.4, MAT.white, -5.2, 0.46, 0.2, 0.02));
  gfGroup.add(makeRBox(1.8, 0.82, 0.72, MAT.coral, -7.2, 0.85, 1.2, 0.08));
  for (const sx of [-5.2, -3.5]) {
    gfGroup.add(makeRBox(1.25, 1.35, 0.48, MAT.mintSoft, sx, 1.12, -0.4, 0.06));
    gfGroup.add(makeRBox(1.1, 0.22, 0.38, MAT.butter, sx, 1.9, -0.4, 0.04));
  }
  // 음료 쇼케이스 냉장고
  gfGroup.add(makeRBox(1.9, 1.85, 0.45, MAT.sky, -4.4, 1.36, -2.1, 0.06));

  const martSign = new THREE.Mesh(GEO.quad, new THREE.MeshStandardMaterial({ map: TEX.martSign, roughness: 0.32 }));
  martSign.scale.set(6.0, 1.05, 1);
  martSign.position.set(-5.2, 2.55, D / 2 + 0.28);
  const martAwning = makeRBox(6.3, 0.3, 1.15, new THREE.MeshStandardMaterial({ map: TEX.awningCoral, roughness: 0.55 }), -5.2, 2.02, D / 2 + 0.65, 0.08);
  martAwning.rotation.x = 0.26;
  gfGroup.add(martSign, martAwning);

  // 우측: WASH PONG 코인세탁소 (민트 스트라이프 어닝 + 회전 드럼세탁기 3대 + 빨래바구니)
  gfGroup.add(makeRBox(6.6, 0.08, D - 0.4, new THREE.MeshStandardMaterial({ color: 0xEFF6FF, roughness: 0.5 }), 5.2, 0.46, 0.2, 0.02));
  for (let i = 0; i < 3; i++) {
    const wx = 3.5 + i * 1.65;
    gfGroup.add(makeRBox(1.22, 1.48, 0.95, MAT.white, wx, 1.18, -1.25, 0.1));
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.12, 18), MAT.sky);
    drum.rotation.x = Math.PI / 2;
    drum.position.set(wx, 1.18, -0.74);
    gfGroup.add(drum);
    spinningWashers.push(drum);
  }
  gfGroup.add(makeRBox(0.85, 0.48, 0.65, MAT.butter, 7.2, 0.68, 1.1, 0.08));

  const washSign = new THREE.Mesh(GEO.quad, new THREE.MeshStandardMaterial({ map: TEX.washSign, roughness: 0.32 }));
  washSign.scale.set(6.0, 1.05, 1);
  washSign.position.set(5.2, 2.55, D / 2 + 0.28);
  const washAwning = makeRBox(6.3, 0.3, 1.15, new THREE.MeshStandardMaterial({ map: TEX.awningMint, roughness: 0.55 }), 5.2, 2.02, D / 2 + 0.65, 0.08);
  washAwning.rotation.x = 0.26;
  gfGroup.add(washSign, washAwning);

  // 중앙 아치형 로비 입구
  gfGroup.add(makeRBox(2.9, 2.25, 0.32, MAT.woodWarm, 0, 1.55, D / 2 + 0.1, 0.08));
  gfGroup.add(makeRBox(2.2, 1.95, 0.36, MAT.glass, 0, 1.42, D / 2 + 0.12, 0.06, false, false));

  // [요구사항 5] 1층 상가 & 실내 공간 따뜻한 무드 조명(PointLight) 배치!
  const martLight = new THREE.PointLight(0xFFE4B5, 1.15, 9.5, 1.6);
  martLight.position.set(-5.2, 2.2, 0.6);
  const washLight = new THREE.PointLight(0xE0F2FE, 1.05, 9.5, 1.6);
  washLight.position.set(5.2, 2.2, 0.6);
  const roomWarmLight = new THREE.PointLight(0xFFF0D4, 0.0, 16.0, 1.4);
  roomWarmLight.position.set(0, 5.2, 1.6);
  gfGroup.add(martLight, washLight, roomWarmLight);
  reg.indoorLights.push(roomWarmLight);

  reg.root.add(gfGroup);

  // 층간 슬래브 (2층 바닥 / 3층 바닥 - 하층부 클로즈업 시 스마트 컷어웨이 지원)
  reg.root.add(makeRBox(W + 0.4, 0.28, D + 0.4, MAT.slab, 0, 2.92, 0.2, 0.08));
  const upperSlab = makeRBox(W + 0.4, 0.28, D + 0.4, MAT.slab, 0, 5.72, 0.2, 0.08);
  reg.upperSlab = upperSlab;
  reg.root.add(upperSlab);

  // 3) 6개 주거 호실 인테리어 그룹
  const interiorGroup = new THREE.Group();
  reg.interiorGroup = interiorGroup;
  reg.root.add(interiorGroup);

  for (const room of b.rooms) {
    const rg = new THREE.Group();
    rg.position.set(room.lx, room.ly, room.lz);
    interiorGroup.add(rg);
    reg.roomGroups[room.id] = rg;
    rebuildRoom3D(room);
  }

  // 4) 줌 배율 연동 반투명 X-Ray 외벽 & 지붕 쉘 (TextureGenerator.pastelBrickTile 적용!)
  const facadeTex = lot.devType === 'mixed_2' ? TEX.brickMint : TEX.brickWarm;
  const facadeMat = new THREE.MeshStandardMaterial({
    map: facadeTex,
    roughness: 0.72,
    transparent: true,
    opacity: 1.0
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: lot.devType === 'mixed_2' ? 0x34D399 : 0xFF758F,
    roughness: 0.58,
    transparent: true,
    opacity: 1.0
  });
  const glassWinMat = new THREE.MeshStandardMaterial({
    color: 0xBAE6FD,
    roughness: 0.18,
    transparent: true,
    opacity: 0.85
  });
  reg.shellMaterials.push(facadeMat, roofMat, glassWinMat);

  const frontFacade = new THREE.Group();
  const frontWall = makeRBox(W + 0.25, 5.65, 0.28, facadeMat, 0, 5.82, D / 2 + 0.34, 0.08);
  frontWall.userData = { lotId: lot.lotId, isShell: true };
  frontFacade.add(frontWall);

  // 아기자기한 창틀과 화분 난간
  for (const wy of [4.35, 7.15]) {
    for (const wx of [-5.6, 0, 5.6]) {
      frontFacade.add(makeRBox(2.55, 1.48, 0.34, facadeMat, wx, wy, D / 2 + 0.38, 0.06));
      frontFacade.add(makeRBox(2.25, 1.22, 0.38, glassWinMat, wx, wy, D / 2 + 0.4, 0.04, false, false));
      frontFacade.add(makeRBox(2.65, 0.22, 0.38, MAT.woodWarm, wx, wy - 0.8, D / 2 + 0.52, 0.05));
    }
  }
  reg.root.add(frontFacade);

  const roofCapGroup = new THREE.Group();
  const roofSlab = makeRBox(W + 0.95, 0.52, D + 1.0, roofMat, 0, 8.85, 0.2, 0.16);
  const chimney = makeRBox(0.95, 1.15, 0.95, facadeMat, 6.2, 9.5, -1.2, 0.1);
  roofCapGroup.add(roofSlab, chimney);
  reg.roofCapGroup = roofCapGroup;
  reg.root.add(roofCapGroup);

  // 5) 공용 인프라(유리 엘리베이터, 클린 분리수거장, 택배함, 루프탑 가든) & 1층 지배인 부스
  const infraGroup = new THREE.Group();
  const managerGroup = new THREE.Group();
  reg.infraGroup = infraGroup;
  reg.managerGroup = managerGroup;
  reg.root.add(infraGroup, managerGroup);

  rebuildPublicInfraAndManager3D(lot.lotId);
  syncBuildingResidents3D(lot.lotId);
}

// =========================================================
// 6. 공용시설 4종 & 1층 정문 지배인 부스 3D 조립
// =========================================================
function rebuildPublicInfraAndManager3D(lotId) {
  const b = state.buildings[lotId];
  const reg = lot3D[lotId];
  if (!b || !reg) return;

  while (reg.infraGroup.children.length > 0) reg.infraGroup.remove(reg.infraGroup.children[0]);
  while (reg.managerGroup.children.length > 0) reg.managerGroup.remove(reg.managerGroup.children[0]);
  reg.elevatorCar = null;

  // 1) 유리 전망 엘리베이터 vs 외벽 계단
  if (b.infra.elevator) {
    const shaft = makeRBox(2.1, 8.4, 2.1, MAT.glass, 9.9, 4.5, 0.4, 0.1, false, false);
    const topCap = makeRBox(2.35, 0.45, 2.35, MAT.sky, 9.9, 8.82, 0.4, 0.1);
    const car = makeRBox(1.68, 1.95, 1.68, MAT.butter, 9.9, 3.2, 0.4, 0.12);
    reg.infraGroup.add(shaft, topCap, car);
    reg.elevatorCar = car;
  } else {
    for (let s = 0; s < 8; s++) {
      reg.infraGroup.add(makeRBox(1.25, 0.24, 0.55, MAT.woodWarm, 9.5, 0.8 + s * 0.65, 2.2 - s * 0.45, 0.04));
    }
  }

  // 2) 클린 분리수거장 vs 미설치 시 쓰레기봉투 더미
  if (b.infra.recycling) {
    const roof = makeRBox(2.8, 0.2, 1.65, MAT.mint, -10.1, 2.15, 1.6, 0.06);
    reg.infraGroup.add(roof);
    [MAT.sky, MAT.mint, MAT.butter].forEach((m, idx) => {
      const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.32, 0.98, 16), m);
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

  // 3) 스마트 무인택배함
  if (b.infra.parcel_box) {
    reg.infraGroup.add(makeRBox(1.5, 1.88, 0.65, MAT.coral, 2.15, 1.38, 3.2, 0.08));
    reg.infraGroup.add(makeRBox(0.45, 0.42, 0.7, MAT.screenCyan, 2.15, 1.55, 3.22, 0.03));
  }

  // 4) 옥상 루프탑 가든
  if (b.infra.rooftop_garden) {
    reg.infraGroup.add(makeRBox(13.5, 0.22, 3.8, new THREE.MeshStandardMaterial({ color: 0x86EFAC, roughness: 0.8 }), 0, 9.18, 0.3, 0.08));
    for (const tx of [-4.5, 0, 4.5]) {
      const miniTree = createFluffyPastelTree(tx === 0, 0.68);
      miniTree.position.set(tx, 9.22, 0.3);
      reg.infraGroup.add(miniTree);
    }
  }

  // 5) 1층 정문 앞 상주 관리실 부스 & 제복 지배인
  if (b.manager.hired) {
    const booth = new THREE.Group();
    booth.position.set(0.1, 0.44, 4.25);
    booth.add(makeRBox(1.75, 1.95, 1.45, MAT.cream, 0, 0.98, 0, 0.1));
    booth.add(makeRBox(1.98, 0.3, 1.68, MAT.sky, 0, 2.08, 0, 0.08));
    booth.add(makeRBox(1.38, 0.72, 1.52, MAT.glass, 0, 1.25, 0, 0.04, false, false));

    const mgr = createChibiPerson3D('manager', false);
    mgr.position.set(1.38, 0.02, 0.25);
    booth.add(mgr);
    reg.managerGroup.add(booth);
  }
}

// =========================================================
// 7. [요구사항 6] 호실 내부 RoundedBoxGeometry 다중 파츠 가구 5종 + 쓰레기산 + 이삿짐
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

  const floorMat = new THREE.MeshStandardMaterial({
    map: room.unlocked ? floorTexMap[room.interiorLv] : TEX.floor0,
    color: room.unlocked ? 0xFFFFFF : 0x9CA3AF,
    roughness: room.interiorLv >= 3 ? 0.28 : 0.64
  });

  // 히키코모리 방은 은은한 보랏빛 벽지로 분위기 차별화
  const wallMat = new THREE.MeshStandardMaterial({
    map: room.household?.type === 'hikikomori' ? null : wallTexMap[room.interiorLv],
    color: !room.unlocked ? 0x9CA3AF : room.household?.type === 'hikikomori' ? 0xDDD6FE : 0xFFFFFF,
    roughness: 0.76
  });

  // 클릭 가능한 호실 바닥 & 뒷벽/측벽/방음패드
  const floorMesh = makeRBox(RW - 0.16, 0.14, RD - 0.16, floorMat, 0, 0.07, 0, 0.03, false, true);
  floorMesh.userData = { roomId: room.id, lotId: room.lotId };
  registerPick(floorMesh);
  rg.add(floorMesh);

  const backWall = makeRBox(RW - 0.12, RH, 0.18, wallMat, 0, RH / 2, -RD / 2 + 0.09, 0.03);
  backWall.userData = { roomId: room.id, lotId: room.lotId };
  registerPick(backWall);
  rg.add(backWall);

  const sideWall = makeRBox(0.16, RH, RD - 0.16, wallMat, -RW / 2 + 0.08, RH / 2, 0, 0.03);
  rg.add(sideWall);

  // 방음 시공 시 스카이 파스텔 방음 몰딩 표시
  if (room.soundproofed) {
    rg.add(makeRBox(RW - 0.22, 0.12, RD - 0.22, MAT.sky, 0, 0.15, 0, 0.03));
  }

  // 앞쪽 낮은 컷어웨이 난간
  rg.add(makeRBox(RW - 0.16, 0.34, 0.14, MAT.woodLight, 0, 0.2, RD / 2 - 0.07, 0.04));

  if (!room.unlocked) {
    const b1 = makeRBox(2.9, 0.24, 0.14, MAT.butter, 0, 1.2, 0.3, 0.04);
    b1.rotation.z = 0.26;
    const b2 = makeRBox(2.9, 0.24, 0.14, MAT.butter, 0, 1.2, 0.35, 0.04);
    b2.rotation.z = -0.26;
    rg.add(b1, b2);
    return;
  }

  // 공실이지만 리모델링(Lv.1+)된 경우 아기자기한 화분과 러그 기본 비치
  if (!room.household) {
    if (room.interiorLv >= 1) {
      const rug = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.04, 24), MAT.cream);
      rug.position.set(0, 0.16, 0.15);
      rug.receiveShadow = true;
      rg.add(rug);
      rg.add(createPottedPlant3D(-1.85, 0.14, -1.45));
    }
    return;
  }

  // 입주 세대 유형별 5종 다중 파츠 디오라마 가구 배치!
  const hType = room.household.type;
  if (hType === 'student') {
    buildStudentFurniture3D(rg);
  } else if (hType === 'newlywed') {
    buildNewlywedFurniture3D(rg);
  } else if (hType === 'family4') {
    buildFamily4Furniture3D(rg);
  } else if (hType === 'elderly') {
    buildElderlyFurniture3D(rg);
  } else if (hType === 'hikikomori') {
    buildHikikomoriAndTrash3D(rg, room.trashStage);
  }

  // 만족도 30% 이하 퇴거 위기(D-30s) 시 현관 앞 테이프 붙은 이삿짐 박스 생성!
  if (room.evictionCountdown !== null) {
    const b1 = makeRBox(0.76, 0.66, 0.66, MAT.movingBox, 1.55, 0.47, 1.35, 0.06);
    const tape1 = makeRBox(0.78, 0.08, 0.18, MAT.butter, 1.55, 0.8, 1.35, 0.02);
    const b2 = makeRBox(0.62, 0.54, 0.58, MAT.movingBox, 1.48, 1.07, 1.32, 0.06);
    b2.rotation.y = 0.28;
    rg.add(b1, tape1, b2);
  }
}

// 공통 파츠 조립 헬퍼: 침대(프레임 + 매트리스 + 베개 2개 + 이불 + 헤드보드)
function createDetailedBed3D(w, d, duvetMat, pillowMat = MAT.white) {
  const bed = new THREE.Group();
  bed.add(makeRBox(w, 0.24, d, MAT.woodWarm, 0, 0.22, 0, 0.06));
  bed.add(makeRBox(w, 0.78, 0.16, MAT.woodWarm, 0, 0.5, -d / 2 + 0.08, 0.06));
  bed.add(makeRBox(w - 0.12, 0.22, d - 0.16, MAT.white, 0, 0.42, 0.04, 0.08));
  bed.add(makeRBox(w - 0.08, 0.24, d * 0.62, duvetMat, 0, 0.45, d * 0.16, 0.09));

  const pCount = w > 1.65 ? 2 : 1;
  if (pCount === 2) {
    bed.add(makeRBox(0.62, 0.15, 0.38, pillowMat, -0.38, 0.57, -d * 0.28, 0.07));
    bed.add(makeRBox(0.62, 0.15, 0.38, pillowMat, 0.38, 0.57, -d * 0.28, 0.07));
  } else {
    bed.add(makeRBox(0.72, 0.15, 0.38, pillowMat, 0, 0.57, -d * 0.28, 0.07));
  }
  return bed;
}

// 공통 파츠 조립 헬퍼: 소파(등받이 + 양쪽 팔걸이 + 좌석 쿠션 + 포인트 쿠션 + 하단 러그)
function createDetailedSofa3D(w, sofaMat, rugMat = MAT.cream) {
  const g = new THREE.Group();
  const rug = makeRBox(w + 0.7, 0.04, 1.85, rugMat, 0, 0.02, 0.25, 0.02, false, true);
  g.add(rug);

  g.add(makeRBox(w, 0.32, 0.86, sofaMat, 0, 0.24, 0, 0.1));
  g.add(makeRBox(w, 0.72, 0.26, sofaMat, 0, 0.52, -0.32, 0.1));
  g.add(makeRBox(0.24, 0.54, 0.88, sofaMat, -w / 2 + 0.12, 0.4, 0, 0.09));
  g.add(makeRBox(0.24, 0.54, 0.88, sofaMat, w / 2 - 0.12, 0.4, 0, 0.09));
  g.add(makeRBox(0.36, 0.32, 0.18, MAT.butter, -w * 0.26, 0.52, -0.12, 0.08));
  g.add(makeRBox(0.36, 0.32, 0.18, MAT.white, w * 0.26, 0.52, -0.12, 0.08));
  return g;
}

function createPottedPlant3D(x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.38, 14), MAT.coral);
  pot.position.y = 0.19;
  pot.castShadow = true;
  const leaf1 = new THREE.Mesh(GEO.sphere, MAT.leafGreen);
  leaf1.scale.set(0.46, 0.52, 0.46);
  leaf1.position.y = 0.56;
  leaf1.castShadow = true;
  g.add(pot, leaf1);
  return g;
}

// 1) 대학생·취준생 가구 세트 (침대 + 듀얼모니터 PC 데스크 & 본체 + 게이밍 체어 + 행거 + 통기타)
function buildStudentFurniture3D(rg) {
  const bed = createDetailedBed3D(1.38, 2.25, MAT.sky, MAT.white);
  bed.position.set(-1.72, 0.14, -0.78);
  rg.add(bed);

  // 듀얼모니터 데스크 + 빛나는 화면 + PC 본체 + 의자
  const desk = new THREE.Group();
  desk.position.set(1.22, 0.14, -1.42);
  desk.add(makeRBox(2.05, 0.12, 0.86, MAT.woodLight, 0, 0.74, 0, 0.04));
  desk.add(makeRBox(0.12, 0.74, 0.78, MAT.white, -0.9, 0.37, 0, 0.03));
  desk.add(makeRBox(0.12, 0.74, 0.78, MAT.white, 0.9, 0.37, 0, 0.03));

  // 듀얼 모니터 2대 + 스탠드 + 키보드
  for (const mx of [-0.42, 0.38]) {
    desk.add(makeRBox(0.74, 0.46, 0.06, MAT.charcoal, mx, 1.12, -0.18, 0.03));
    desk.add(makeRBox(0.66, 0.38, 0.07, MAT.screenCyan, mx, 1.12, -0.17, 0.02));
    desk.add(makeRBox(0.12, 0.18, 0.1, MAT.silver, mx, 0.84, -0.18, 0.02));
  }
  desk.add(makeRBox(0.55, 0.04, 0.2, MAT.white, -0.02, 0.82, 0.15, 0.02));
  // RGB 게이밍 본체 타워
  desk.add(makeRBox(0.34, 0.62, 0.58, MAT.charcoal, 0.78, 0.32, 0.05, 0.04));
  desk.add(makeRBox(0.06, 0.48, 0.08, MAT.screenCyan, 0.78, 0.32, 0.33, 0.02));
  // 게이밍 체어
  desk.add(makeRBox(0.56, 0.12, 0.56, MAT.coral, -0.02, 0.46, 0.68, 0.05));
  desk.add(makeRBox(0.54, 0.68, 0.12, MAT.coral, -0.02, 0.84, 0.92, 0.05));
  rg.add(desk);

  // 통기타 & 미니 행거
  const guitarBody = new THREE.Mesh(GEO.sphere, MAT.woodWarm);
  guitarBody.scale.set(0.45, 0.58, 0.2);
  guitarBody.position.set(-0.48, 0.48, -1.78);
  const guitarNeck = makeRBox(0.1, 0.65, 0.08, MAT.woodDark, -0.48, 0.95, -1.8, 0.02);
  rg.add(guitarBody, guitarNeck);
}

// 2) 신혼부부 가구 세트 (핑크 퀸침대 + 쿠션 소파 & 러그 + 아일랜드 식탁 & 커피머신 + 화분)
function buildNewlywedFurniture3D(rg) {
  const qBed = createDetailedBed3D(2.05, 2.25, MAT.coral, MAT.pinkSoft);
  qBed.position.set(-1.38, 0.14, -0.78);
  rg.add(qBed);

  const sofa = createDetailedSofa3D(1.95, MAT.pinkSoft, MAT.cream);
  sofa.position.set(1.32, 0.14, -1.25);
  rg.add(sofa);

  // 아일랜드 홈카페 식탁 & 에스프레소 머신 & 스툴 2개
  const island = new THREE.Group();
  island.position.set(1.25, 0.14, 0.82);
  island.add(makeRBox(1.85, 0.86, 0.78, MAT.white, 0, 0.43, 0, 0.08));
  island.add(makeRBox(1.95, 0.1, 0.88, MAT.woodLight, 0, 0.9, 0, 0.04));
  island.add(makeRBox(0.38, 0.42, 0.34, MAT.coral, -0.52, 1.15, -0.1, 0.06));
  for (const sx of [-0.45, 0.45]) {
    const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.58, 14), MAT.mintSoft);
    stool.position.set(sx, 0.29, 0.65);
    stool.castShadow = true;
    island.add(stool);
  }
  rg.add(island);
  rg.add(createPottedPlant3D(-2.25, 0.14, 1.25));
}

// 3) 4인 가족 가구 세트 (우드 가벽 + 어린이 2층 침대 & 사다리 + 4인 식탁 + 소파 & TV)
function buildFamily4Furniture3D(rg) {
  // 공간 분리용 낮은 원목 가벽
  rg.add(makeRBox(0.15, 1.55, 2.35, MAT.woodLight, -0.15, 0.92, -0.82, 0.05));

  // 어린이 2층 침대 (1·2층 매트리스 + 이불 + 안전난간 + 사다리)
  const bunk = new THREE.Group();
  bunk.position.set(-1.55, 0.14, -0.85);
  for (const px of [-0.68, 0.68]) {
    for (const pz of [-1.02, 1.02]) {
      bunk.add(makeRBox(0.13, 1.95, 0.13, MAT.woodWarm, px, 0.98, pz, 0.04));
    }
  }
  // 1층 & 2층 침상
  bunk.add(makeRBox(1.38, 0.18, 2.08, MAT.white, 0, 0.36, 0, 0.06));
  bunk.add(makeRBox(1.34, 0.2, 1.25, MAT.mint, 0, 0.42, 0.34, 0.07));
  bunk.add(makeRBox(0.65, 0.12, 0.35, MAT.butter, 0, 0.5, -0.68, 0.05));

  bunk.add(makeRBox(1.38, 0.18, 2.08, MAT.white, 0, 1.38, 0, 0.06));
  bunk.add(makeRBox(1.34, 0.2, 1.25, MAT.sky, 0, 1.44, 0.34, 0.07));
  bunk.add(makeRBox(0.65, 0.12, 0.35, MAT.coral, 0, 1.52, -0.68, 0.05));
  // 2층 안전 난간 & 사다리
  bunk.add(makeRBox(0.08, 0.32, 1.85, MAT.woodLight, 0.68, 1.66, 0, 0.03));
  for (let r = 0; r < 4; r++) {
    bunk.add(makeRBox(0.08, 0.07, 0.44, MAT.butter, 0.75, 0.48 + r * 0.32, 0.68, 0.02));
  }
  rg.add(bunk);

  // 우측 거실 소파 & 와이드 TV + 4인 식탁
  const sofa = createDetailedSofa3D(1.85, MAT.mintSoft, MAT.cream);
  sofa.position.set(1.38, 0.14, -1.32);
  rg.add(sofa);

  rg.add(makeRBox(1.35, 0.68, 0.1, MAT.charcoal, 1.38, 1.35, -2.08, 0.03));
  rg.add(makeRBox(1.55, 0.14, 1.05, MAT.woodLight, 1.35, 0.72, 0.88, 0.05));
  rg.add(makeRBox(0.14, 0.58, 0.14, MAT.woodDark, 0.85, 0.42, 0.88, 0.03));
  rg.add(makeRBox(0.14, 0.58, 0.14, MAT.woodDark, 1.85, 0.42, 0.88, 0.03));
}

// 4) 노부부 가구 세트 (트윈 원목침대 + 다도 좌탁 & 방석 & 주전자 + 흔들의자 2개 + 분재 선반)
function buildElderlyFurniture3D(rg) {
  for (const bx of [-1.85, -0.58]) {
    const twin = createDetailedBed3D(1.06, 2.08, MAT.butter, MAT.cream);
    twin.position.set(bx, 0.14, -0.88);
    rg.add(twin);
  }

  // 다도 좌탁 + 방석 2개 + 도자기 찻주전자
  const teaSet = new THREE.Group();
  teaSet.position.set(1.35, 0.14, -0.15);
  teaSet.add(makeRBox(1.32, 0.1, 0.92, MAT.woodDark, 0, 0.34, 0, 0.04));
  teaSet.add(makeRBox(0.12, 0.32, 0.8, MAT.woodDark, -0.52, 0.16, 0, 0.03));
  teaSet.add(makeRBox(0.12, 0.32, 0.8, MAT.woodDark, 0.52, 0.16, 0, 0.03));
  teaSet.add(makeRBox(0.52, 0.09, 0.52, MAT.coral, 0, 0.05, -0.75, 0.04));
  teaSet.add(makeRBox(0.52, 0.09, 0.52, MAT.mint, 0, 0.05, 0.75, 0.04));
  const pot = new THREE.Mesh(GEO.sphere, MAT.mintSoft);
  pot.scale.setScalar(0.24);
  pot.position.set(0, 0.48, 0);
  teaSet.add(pot);
  rg.add(teaSet);

  // 흔들의자 & 분재 선반
  const rocker = new THREE.Group();
  rocker.position.set(-1.45, 0.14, 1.15);
  rocker.add(makeRBox(0.68, 0.1, 0.68, MAT.woodWarm, 0, 0.38, 0, 0.04));
  rocker.add(makeRBox(0.68, 0.65, 0.1, MAT.woodWarm, 0, 0.68, -0.28, 0.04));
  rocker.add(makeRBox(0.1, 0.12, 0.92, MAT.woodDark, -0.28, 0.08, 0, 0.05));
  rocker.add(makeRBox(0.1, 0.12, 0.92, MAT.woodDark, 0.28, 0.08, 0, 0.05));
  rg.add(rocker);

  rg.add(makeRBox(1.5, 1.35, 0.42, MAT.woodWarm, 1.55, 0.82, -1.88, 0.05));
  rg.add(createPottedPlant3D(1.25, 1.5, -1.88));
  rg.add(createPottedPlant3D(1.85, 1.5, -1.88));
}

// 5) 은둔형 히키코모리 가구 + 1~3단계 피자박스 탑 & 빈 캔 & 쓰레기봉투 더미!
function buildHikikomoriAndTrash3D(rg, trashStage) {
  // 보랏빛 트리플 모니터 코너 데스크 & 본체
  const pcDesk = new THREE.Group();
  pcDesk.position.set(1.18, 0.14, -1.35);
  pcDesk.add(makeRBox(2.25, 0.12, 0.92, MAT.charcoal, 0, 0.72, 0, 0.04));
  pcDesk.add(makeRBox(0.14, 0.72, 0.82, MAT.charcoal, -0.95, 0.36, 0, 0.03));
  pcDesk.add(makeRBox(0.14, 0.72, 0.82, MAT.charcoal, 0.95, 0.36, 0, 0.03));

  [-0.65, 0, 0.65].forEach((mx, idx) => {
    const mon = makeRBox(0.62, 0.44, 0.06, MAT.screenPurple, mx, 1.08, idx === 1 ? -0.22 : -0.12, 0.03);
    mon.rotation.y = idx === 0 ? 0.28 : idx === 2 ? -0.28 : 0;
    pcDesk.add(mon);
  });
  pcDesk.add(makeRBox(0.36, 0.62, 0.56, MAT.purpleDark, 0.85, 0.32, 0.1, 0.04));
  pcDesk.add(makeRBox(0.62, 0.72, 0.62, MAT.purpleDark, 0, 0.5, 0.72, 0.08));
  rg.add(pcDesk);

  // 바닥 매트리스와 어질러진 담요
  rg.add(makeRBox(1.38, 0.2, 2.05, MAT.lavender, -1.68, 0.24, -0.82, 0.08));
  rg.add(makeRBox(1.22, 0.22, 1.15, MAT.purpleDark, -1.62, 0.32, -0.45, 0.08));

  // 단계별 쓰레기 더미 누적 (피자박스 타워 + 음료 캔 무더기 + 쓰레기봉투 산!)
  if (trashStage >= 1) {
    // 비뚤빼뚤 쌓인 피자박스 타워 (5단)
    for (let p = 0; p < 5; p++) {
      const pBox = makeRBox(0.66, 0.09, 0.66, MAT.pizzaBox, -0.42 + (p % 2) * 0.05, 0.19 + p * 0.095, 0.28, 0.02);
      pBox.rotation.y = p * 0.24;
      rg.add(pBox);
    }
    // 빈 음료수·에너지드링크 캔 무더기
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
    const bagCoords = [[-0.88, 0.98], [-0.32, 1.18], [0.24, 1.05], [-0.62, 1.48]];
    bagCoords.forEach(([bx, bz], i) => {
      const bag = new THREE.Mesh(GEO.sphere, MAT.trashBag);
      bag.scale.set(0.62, 0.54 + (i % 2) * 0.14, 0.62);
      bag.position.set(bx, 0.38, bz);
      bag.castShadow = true;
      rg.add(bag);
    });
  }

  if (trashStage >= 3) {
    // 방 절반을 뒤덮는 쓰레기봉투 산 & 두 번째 피자박스 탑 + 오염 얼룩
    for (let i = 0; i < 6; i++) {
      const bag = new THREE.Mesh(GEO.sphere, MAT.trashBag);
      bag.scale.set(0.68, 0.62, 0.68);
      bag.position.set(-0.95 + (i % 3) * 0.66, 0.45 + Math.floor(i / 3) * 0.36, 0.55 + (i % 2) * 0.52);
      bag.castShadow = true;
      rg.add(bag);
    }
    for (let p = 0; p < 4; p++) {
      const pb2 = makeRBox(0.62, 0.09, 0.62, MAT.pizzaBox, 1.55, 0.19 + p * 0.095, 1.05, 0.02);
      pb2.rotation.y = -p * 0.3;
      rg.add(pb2);
    }
    const stain = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.15, 0.02, 20),
      new THREE.MeshBasicMaterial({ color: 0x65A30D, transparent: true, opacity: 0.42 })
    );
    stain.position.set(-0.35, 0.16, 0.95);
    rg.add(stain);
  }
}

// =========================================================
// 8. 호실 입주민 치비 액터 동기화
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
      mesh.position.set(sx, room.ly + 0.14, sz);
      reg.interiorGroup.add(mesh);
      return {
        mesh,
        room,
        cx: sx,
        cz: sz,
        tx: sx,
        tz: sz,
        timer: 0.8 + idx * 0.7,
        phase: Math.random() * 6,
        breathOffset: Math.random() * Math.PI * 2,
        isKid,
        isHoarder: hType === 'hikikomori'
      };
    });
  }
}

// =========================================================
// 9. 줌 배율 연동 자동 X-Ray 투시 + 층별 스마트 단면 컷어웨이 + 실내 무드등 점등
// =========================================================
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

    // 101~103호 집중 시(또는 상층부가 전부 미개방일 때 내부투시 시) 상층 슬래브를 열어 채광 & 시야 100% 개방!
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
// 10. 층간소음 충격파 · 쓰레기방 악취 · 만족도 퇴거 카운트다운 · 관리인 자동 위임
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

      // 1) 히키코모리 쓰레기 누적 및 보라·초록 악취 연기 + 날파리 파티클
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
            spawnSmokePoof3D(lot.x + room.lx + 0.35, room.ly + 1.1, lot.z + room.lz + 0.9, 0xA855F7, 2);
          }
        } else {
          clearOdorFlies(room.id);
        }
      } else {
        clearOdorFlies(room.id);
      }

      // 2) 윗집 발망치 층간소음 체크 & 코랄 레드 충격파 링
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

      // 3) 인접 호실 쓰레기방 악취 피해 체크
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

      // 4) 공용 인프라 부족 불만 체크
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

      // 5) 만족도 30% 이하 -> D-30s 퇴거 카운트다운 & 3D 이삿짐 박스 표시
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

    // 6) 지배인 급여 지출 & 위임 예산 범위 내 자동 케어 출동
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

  if (dispatched) triggerManagerDispatchTag(b.lotId);
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
// 11. 3D 파티클·이펙트 (Poof 연기, 바운스, 코인 분수, 소음 링, 날파리)
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
      isSparkle ? new THREE.OctahedronGeometry(0.15, 0) : GEO.coin,
      isSparkle ? new THREE.MeshBasicMaterial({ color: 0xFDE047 }) : MAT.coin
    );
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
  const flyMat = new THREE.MeshBasicMaterial({ color: 0x3F3F46 });
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
// 12. 카메라 포커스 & 호실 우측 인스펙터 카드 & 퇴거 도장 연출
// =========================================================
function focusCameraOnRoom(roomId) {
  const room = findRoom(roomId);
  if (!room) return;
  const lot = getLot(room.lotId);
  focusedRoomId = roomId;

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
        <div class="font-display text-base text-[#4A3528]">미개방 호실입니다</div>
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
          <span class="font-display text-sm text-[#065F46]">현재 공실 (적정 월세 ${mRent}만원)</span>
        </div>
        <p class="text-xs text-[#7A5E4B] leading-relaxed">5종 세대 유형별로 아기자기한 맞춤 가구 세트와 층간소음·위생 상성이 적용됩니다.</p>
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
        <!-- 커스텀 일러스트 프로필 아바타 + 이름 & 임대 수익 -->
        <div class="flex items-center gap-3">
          ${createHouseholdAvatarSVG(h.type, 54)}
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-1">
              <span class="font-display text-base text-[#4A3528] truncate">${h.familyName}</span>
              <span class="font-display font-num text-xs px-2.5 py-0.5 rounded-full bg-[#E8FBF3] text-[#059669] shrink-0">+${paid}만/${room.cycleSec}s</span>
            </div>
            <div class="text-xs font-semibold text-[#8A6D5B] mt-0.5">${hDef.label} · ${hDef.memberCount}인 거주</div>
          </div>
        </div>

        <!-- 해시태그 칩 -->
        <div class="flex flex-wrap gap-1.5">${chipsHtml}</div>

        <!-- 파스텔 그라데이션 게이지 바 -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between text-xs font-bold">
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

        <!-- 하단 3D 젤리 액션 그리드 -->
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
        <span class="font-display text-xs text-[#4A3528]">인테리어 등급: ${tier.name}</span>
        ${room.soundproofed ? '<span class="text-[10px] px-2 py-0.5 rounded-full bg-[#E0F2FE] text-[#0369A1] font-display">층간방음 완료</span>' : ''}
      </div>
      <div class="text-[11px] text-[#8A6D5B]">${nextTier ? `다음 시공: ${nextTier.name} (적정 월세 +${nextTier.rentAdd - tier.rentAdd}만)` : '최고급 로얄 크림 부티크 완성! (+25% 세트보너스)'}</div>
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
      showToast(`${room.name} 세대에 프리미엄 화해 선물을 전달해 행복도가 회복됐어요!`, 'emerald');
      renderFocusedRoomDrawer();
      saveState();
    };
  }

  const relocBtn = document.getElementById('rf-btn-relocate');
  if (relocBtn) relocBtn.onclick = () => relocateHouseholdToVacant(room);

  const evictBtn = document.getElementById('rf-btn-evict');
  if (evictBtn) evictBtn.onclick = () => executeDramaticEviction(room);
}

// 특수 청소 실행
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
  spawnSmokePoof3D(lot.x + room.lx, room.ly + 0.7, lot.z + room.lz, 0xFFFDF9, 12);
  spawnCoinFountain3D(lot.x + room.lx, room.ly + 0.9, lot.z + room.lz, 8, true);

  showRoomSpeech(room, HOUSEHOLD_TYPES.hikikomori.cleanedGrumbleQuote, true, 4.4);
  showToast('특수 청소 완료! 피자박스와 쓰레기 더미를 말끔히 치웠습니다!', 'emerald');
  if (focusedRoomId === room.id) renderFocusedRoomDrawer();
  if (!dom.notebookModal.classList.contains('hidden')) renderNotebookSplitView();
  saveState();
}

// 단호한 강제 퇴거 조치 (스탬프 도장 + 퇴거 행진 + 원상복구)
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
  const bag = makeRBox(0.38, 0.34, 0.34, MAT.movingBox, 0.32, 0.45, 0.14, 0.05);
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
// 13. [요구사항 4] 28:72 스플릿 뷰 경영 수첩 & 황금 코인 말풍선 슬라이더
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

  // 탭 1: 퀘스트 & 업적
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
            <div class="font-display text-xs text-[#4A3528] truncate mt-0.5">${q.title}</div>
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
            <span class="flex items-center gap-1.5">${createCustomSVGIcon('quest_trophy', 20)} 파스텔 타운 마스터 달성률</span>
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
          <h3 class="font-display text-xl text-[#4A3528]">${curQ.title}</h3>
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
          focusCameraOnLot(curQ.focusLot, 1.3);
        }
      };
    }
  }

  // 탭 2: 세입자 & 층간소음·쓰레기방 분쟁 관리
  else if (activeNotebookTab === 'tenants') {
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
              <span class="text-[#4A3528]">${r.name}</span>
              <span class="${hasCrisis ? 'text-[#E11D48]' : 'text-[#059669]'}">
                ${hasCrisis ? '케어 필요!' : h ? `${Math.round(h.happiness)}%` : '공실'}
              </span>
            </div>
            <div class="text-[11px] text-[#8A6D5B] truncate">${h ? `${h.familyName} · ${hDef.label}` : '신규 입주 가능'}</div>
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
            <h3 class="font-display text-xl text-[#4A3528]">${curR.name}은 현재 깨끗한 공실입니다</h3>
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
            <!-- 커스텀 일러스트 프로필 프레임 -->
            <div class="flex items-center justify-between flex-wrap gap-3">
              <div class="flex items-center gap-3.5">
                ${createHouseholdAvatarSVG(h.type, 64)}
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-display text-xl text-[#4A3528]">${curR.name} · ${h.familyName}</span>
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

            <!-- 해시태그 칩 -->
            <div class="flex flex-wrap gap-1.5">${chipsHtml}</div>

            <!-- 파스텔 그라데이션 3종 게이지 바 (행복도 / 임대예산 / 소음·위생) -->
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

            <!-- 하단 정돈된 3D 젤리 액션 그리드 -->
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
  }

  // 탭 3: 전문 지배인 선임 & 커스텀 황금 코인 슬라이더 위임
  else if (activeNotebookTab === 'manager') {
    const bList = Object.values(state.buildings);
    if (!selectedSplitItemId || !state.buildings[selectedSplitItemId]) selectedSplitItemId = bList[0].lotId;
    const curB = state.buildings[selectedSplitItemId];
    const grossRent = calcBuildingGrossCycle(curB);
    const netAfterMgr = grossRent - GAME_BALANCE.managerSalaryPerCycle;

    dom.splitLeftList.innerHTML = bList.map((b) => `
      <div data-bid="${b.lotId}" class="split-item-card ${selectedSplitItemId === b.lotId ? 'selected' : ''}">
        ${createCustomSVGIcon('manager_cap', 30)}
        <div class="min-w-0 flex-1">
          <div class="font-display text-xs text-[#4A3528] truncate">${b.title}</div>
          <div class="text-[11px] font-semibold ${b.manager.hired ? 'text-[#059669]' : 'text-[#8A6D5B]'}">
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
              <h3 class="font-display text-lg text-[#4A3528]">[${curB.title}] 1층 지배인실</h3>
              <p class="text-xs text-[#8A6D5B]">선임 시 1층 정문 앞 관리 부스에 상주하며 특수청소·중재·자동 입주를 대행합니다.</p>
            </div>
          </div>
          <button id="sp-toggle-mgr" class="clay-btn ${curB.manager.hired ? 'clay-btn-coral' : 'clay-btn-mint'} px-4 py-2.5 text-xs">
            ${createCustomSVGIcon('manager_cap', 18)}
            <span>${curB.manager.hired ? '지배인 해임 (직접관리)' : `지배인 선임 (계약금 ${GAME_BALANCE.managerHireFee}만)`}</span>
          </button>
        </div>

        <!-- 손익분기(ROI) 분석 카드 -->
        <div class="clay-peach-box p-4 text-xs space-y-1.5">
          <div class="font-display text-sm text-[#4A3528]">지배인 고용 손익분기(ROI) 시뮬레이션</div>
          <div class="text-[#6E503B]">건물 주기 총수익: <b class="font-num text-[#059669]">+${grossRent}만원</b> · 지배인 고정 급여: <b class="font-num text-[#E11D48]">-${GAME_BALANCE.managerSalaryPerCycle}만원/주기</b></div>
          <div class="font-bold ${netAfterMgr < 0 ? 'text-[#E11D48]' : 'text-[#059669]'}">
            ${netAfterMgr < 0
              ? `주의: 아직 입주 세대가 적어 고용 시 주기당 ${netAfterMgr}만원 적자입니다! 호실을 더 늘린 뒤 선임하세요.`
              : `안정 흑자 구간! 급여 차감 후에도 주기당 +${netAfterMgr}만원 순수익이 발생합니다!`}
          </div>
        </div>

        <!-- [요구사항 4] 파스텔 트랙 + 황금 코인 핸들 + 실시간 말풍선 툴팁 슬라이더 2종 -->
        <div class="space-y-4 pt-1">
          <div class="clay-subcard p-4">
            <div class="flex justify-between items-center font-display text-xs text-[#4A3528]">
              <span>자동 입주 최소 월세 기준선</span>
              <span class="text-[#8A6D5B]">40만 ~ 260만</span>
            </div>
            <div class="coin-slider-wrap">
              <div id="tip-min-rent" class="coin-slider-bubble">최소 ${curB.manager.minRentFloor}만 원 이상 수취</div>
              <input id="slider-min-rent" type="range" min="40" max="260" step="10" value="${curB.manager.minRentFloor}" class="golden-coin-range" />
            </div>
          </div>

          <div class="clay-subcard p-4">
            <div class="flex justify-between items-center font-display text-xs text-[#4A3528]">
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
        dom.notebookModal.classList.add('hidden');
        focusCameraOnLot(curB.lotId, 1.55);
        showToast(`[${curB.title}] 1층 정문 앞에 관리 부스와 전문 지배인이 배치되었습니다!`, 'emerald');
      } else {
        curB.manager.hired = false;
        rebuildPublicInfraAndManager3D(curB.lotId);
        showToast(`[${curB.title}] 지배인을 해임하고 직접 관리로 전환했습니다.`, 'amber');
        renderNotebookSplitView();
      }
      saveState();
    };
  }

  // 탭 4: 공용 인프라 & 아일랜드 부지 장부
  else if (activeNotebookTab === 'infra') {
    if (!selectedSplitItemId || !state.lots.some((l) => l.lotId === selectedSplitItemId)) {
      selectedSplitItemId = state.lots[0].lotId;
    }

    dom.splitLeftList.innerHTML = state.lots.map((l) => {
      const cat = l.devType ? DEVELOPMENT_CATALOG[l.devType] : null;
      return `
        <div data-lid="${l.lotId}" class="split-item-card ${selectedSplitItemId === l.lotId ? 'selected' : ''}">
          ${createCustomSVGIcon(cat ? cat.svgIcon : 'gold_key', 28)}
          <div class="min-w-0 flex-1">
            <div class="font-display text-xs text-[#4A3528] truncate">${l.owned ? l.title : l.name}</div>
            <div class="text-[11px] text-[#8A6D5B]">${l.owned ? '가동 중' : `분양가 ${l.landPrice}만`}</div>
          </div>
        </div>`;
    }).join('');

    const curLot = getLot(selectedSplitItemId) || state.lots[0];
    const curB = state.buildings[curLot.lotId];

    if (!curLot.owned) {
      dom.splitRightDetail.innerHTML = `
        <div class="clay-subcard p-7 text-center space-y-4">
          <div class="flex justify-center">${createCustomSVGIcon('berry_farm', 48)}</div>
          <h3 class="font-display text-xl text-[#4A3528]">${curLot.name} (미개발 아일랜드 필지)</h3>
          <p class="text-xs text-[#8A6D5B]">태양광 발전소, 딸기 도시 농장, 벚꽃 힐링 공원, 크림 베이커리, 주상복합 2호관을 지을 수 있습니다.</p>
          <button id="sp-open-dev" class="clay-btn clay-btn-mint px-6 py-3 text-sm">
            ${createCustomSVGIcon('gold_key', 18)}
            <span>필지로 이동해 개발 착공하기</span>
          </button>
        </div>`;
      document.getElementById('sp-open-dev').onclick = () => {
        dom.notebookModal.classList.add('hidden');
        focusCameraOnLot(curLot.lotId, 1.25);
        openLotDevModal(curLot.lotId);
      };
    } else if (curB) {
      const infraCards = Object.values(PUBLIC_INFRA_CATALOG).map((inf) => {
        const installed = curB.infra[inf.key];
        return `
          <div class="clay-subcard p-4 flex flex-col justify-between gap-3">
            <div>
              <div class="flex items-center justify-between gap-2">
                <span class="flex items-center gap-2 font-display text-sm text-[#4A3528]">
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
            <h3 class="font-display text-base sm:text-lg text-[#4A3528]">[${curB.title}] 공용 편의시설 & 상가</h3>
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
              <span class="font-display text-xl text-[#4A3528]">${curLot.title}</span>
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
// 14. 세대 모집 모달 & 부지 개발 모달 렌더링
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
              <div class="font-display text-base text-[#4A3528] truncate">${c.familyName}</div>
              <span class="inline-block text-[11px] font-display text-white px-2.5 py-0.5 rounded-full mt-0.5" style="background:${c.def.accentHex}">
                ${c.def.label} (${c.def.memberCount}인)
              </span>
            </div>
          </div>

          <div class="flex flex-wrap gap-1">${chips}</div>

          <div class="clay-peach-box p-3 text-xs space-y-1.5">
            <div class="flex justify-between font-bold">
              <span class="text-[#6E503B]">희망 월세 한도</span>
              <span class="font-display font-num text-[#059669]">최대 ${c.budget}만원</span>
            </div>
            <div class="text-[11px] text-[#9F1239] font-semibold">${c.def.traitDesc}</div>
            <div class="text-[11px] text-[#7A5E4B]">${c.def.furnitureDesc}</div>
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
  dom.devLotBadge.textContent = `${lot.name} · 토지비 ${lot.landPrice}만`;

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
              <span class="font-display text-base text-[#4A3528]">${cat.name}</span>
            </div>
            <span class="pastel-tag-chip">시너지 +${cat.rentSynergyPct}%</span>
          </div>
          <p class="text-xs text-[#7A5E4B] leading-relaxed">${cat.desc}</p>
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
// 15. 경제 틱 · 치비 숨쉬기/산책 · 구름 꼬리 말풍선 · 오버레이 투영
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
        sprout.scale.setScalar(stage === 1 ? 0.32 : 0.48);
        berry.visible = stage >= 2;
      });
    }

    if (dev.timer >= cat.cycleSec) {
      dev.timer = 0;
      addGold(cat.cycleProfit);
      spawnCoinFountain3D(lot.x, 1.8, lot.z, 8);
      spawnFloatText(lot.x, 3.2, lot.z, `+${cat.cycleProfit}만`);
    }
  }

  dom.btnCollectAll.classList.toggle('hidden', !anyPending);
}

// [요구사항 6] 클로즈업 전용 구름 꼬리 말풍선 + 좌측 세대 미니 아바타 아이콘 팝업
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

function tickChibiAndPets(dt, nowSec) {
  // 입주민 2등신 치비: Idle 숨쉬기(Breathing) + 아장아장 팔다리 스윙 보행
  for (const list of Object.values(residentActors)) {
    list.forEach((ac, idx) => {
      const parts = ac.mesh.userData.animParts;
      const breath = Math.sin(nowSec * 3.4 + ac.breathOffset);
      if (parts) {
        parts.bodyRoot.scale.y = 1 + breath * 0.035;
        parts.bodyRoot.scale.x = 1 - breath * 0.018;
        parts.headGroup.rotation.z = Math.sin(nowSec * 1.8 + ac.breathOffset) * 0.04;
      }

      const dx = ac.tx - ac.cx;
      const dz = ac.tz - ac.cz;
      const dist = Math.hypot(dx, dz);

      if (dist > 0.06) {
        ac.phase += dt * 12;
        ac.cx += (dx / dist) * (ac.isHoarder ? 1.05 : 1.85) * dt;
        ac.cz += (dz / dist) * (ac.isHoarder ? 1.05 : 1.85) * dt;
        ac.mesh.rotation.y = Math.atan2(dx, dz);
        ac.mesh.position.set(ac.cx, ac.room.ly + 0.14 + Math.abs(Math.sin(ac.phase)) * 0.075, ac.cz);
        if (parts) {
          const swing = Math.sin(ac.phase) * 0.45;
          parts.legL.rotation.x = swing;
          parts.legR.rotation.x = -swing;
          parts.armL.rotation.x = -swing * 0.7;
          parts.armR.rotation.x = swing * 0.7;
        }
      } else {
        ac.mesh.position.set(ac.cx, ac.room.ly + 0.14, ac.cz);
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

          if (idx === 0 && camera.zoom >= 1.32 && !speechEls[ac.room.id] && Math.random() < 0.48) {
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

  // 시바견, 비숑, 치즈냥이 산책 & 꼬리 살랑임
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
        p.tx = p.homeX + (Math.random() - 0.5) * 4.2;
        p.tz = p.homeZ + (Math.random() - 0.5) * 3.2;
      }
    }
  });

  // 유리 전망 엘리베이터 승강 모션
  for (const reg of Object.values(lot3D)) {
    if (reg.elevatorCar) {
      reg.elevatorCar.position.y = 4.3 + Math.sin(nowSec * 1.2) * 2.65;
    }
  }

  // 돌발 보너스 케어 버블 스폰 (커스텀 벡터 SVG 아이콘 장착!)
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
  btn.className = 'world-pin care-clay-bubble';
  btn.innerHTML = `${createCustomSVGIcon(tpl.svgIcon, 18)}<span>${tpl.label} +${tpl.cashReward}만!</span>`;

  setPinPos(btn, project(lot.x, 5.5, lot.z + 2.5));

  btn.onclick = (e) => {
    e.stopPropagation();
    const idx = careBubbles.findIndex((x) => x.id === id);
    if (idx !== -1) careBubbles.splice(idx, 1);
    btn.remove();
    addGold(tpl.cashReward);
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

function rebuildStaticOverlayDOM() {
  dom.lotsLayer.innerHTML = '';
  dom.roomsLayer.innerHTML = '';
  dom.crisisLayer.innerHTML = '';
  Object.keys(lotOverlayEls).forEach((k) => delete lotOverlayEls[k]);
  Object.keys(roomOverlayEls).forEach((k) => delete roomOverlayEls[k]);
  Object.keys(crisisPinEls).forEach((k) => delete crisisPinEls[k]);

  for (const lot of state.lots) {
    const el = document.createElement('div');
    el.className = `world-pin lot-clay-badge ${!lot.owned ? 'for-sale' : ''}`;
    el.dataset.sig = '';
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
  spawnCoinFountain3D(lot.x, 8.5, lot.z, 12);
  spawnFloatText(lot.x, 10.2, lot.z, `+${amt.toLocaleString()}만`);
}

function updateProjectedOverlays() {
  const isCloseUp = camera.zoom >= 1.28;
  const readyQuests = QUEST_LIST.filter((q) => !state.claimedQuests.includes(q.id) && q.check(state)).length;
  let tenantCrisisCount = 0;

  // 1) 아일랜드 부지/건물 상단 클레이 배지 (상태 변경 시에만 SVG DOM 갱신해 60fps 보장!)
  for (const lot of state.lots) {
    const el = lotOverlayEls[lot.lotId];
    if (!el) continue;
    const b = state.buildings[lot.lotId];

    if (!lot.owned) {
      const sig = `sale_${lot.landPrice}`;
      if (el.dataset.sig !== sig) {
        el.dataset.sig = sig;
        el.className = 'world-pin lot-clay-badge for-sale';
        el.innerHTML = `${createCustomSVGIcon('gold_key', 17)}<span>${lot.name} · <b>${lot.landPrice}만</b></span>`;
      }
      el.style.opacity = isCloseUp ? '0.15' : '1';
      setPinPos(el, project(lot.x, 2.35, lot.z));
    } else if (b) {
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
      setPinPos(el, project(lot.x, 10.6, lot.z));
    } else {
      const cat = DEVELOPMENT_CATALOG[lot.devType];
      const sig = `dev_${lot.devType}`;
      if (el.dataset.sig !== sig) {
        el.dataset.sig = sig;
        el.className = 'world-pin lot-clay-badge';
        el.innerHTML = `${createCustomSVGIcon(cat.svgIcon, 18)}<span>${lot.title} (+${cat.cycleProfit}만)</span>`;
      }
      el.style.opacity = isCloseUp ? '0.25' : '1';
      setPinPos(el, project(lot.x, 4.3, lot.z));
    }
  }

  // 2) 호실 클로즈업 칩 & 원거리 위기 핀 & 구름 말풍선 분리
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

  // 원형 FAB 긴급 코랄 뱃지 & 모달 탭 알림 점 갱신
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
// 16. [요구사항 2 & 5] HUD 카운팅 보간 · 소프트 섀도우 렌더러 · 초기화
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
  if (delta > 0) {
    triggerBadgeBounce(dom.hudGoldWrap);
  }
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

  // 부드러운 롤링 숫자 카운팅 보간
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
  dom.hudNetIncome.className = `font-display font-num text-xs sm:text-base leading-tight mt-0.5 ${roundedNet >= 0 ? 'text-emerald-600' : 'text-[#E11D48]'}`;

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

// [요구사항 5] PCFSoftShadowMap + ACESFilmicToneMapping(1.15) + 따스한 채광 파이프라인 초기화
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
  renderer.toneMappingExposure = 1.15;
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

  // 하늘과 땅의 은은한 파스텔 반사광 (HemisphereLight: #E0F2FE / #FDE68A)
  hemiLight = new THREE.HemisphereLight(0xE0F2FE, 0xFDE68A, 1.05);
  scene.add(hemiLight);

  // 따뜻한 햇살 주광원 (DirectionalLight: #FFF5E4 + 실시간 소프트 섀도우)
  dirLight = new THREE.DirectionalLight(0xFFF5E4, 1.55);
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
  dirLight.shadow.normalBias = 0.02;
  scene.add(dirLight);

  // 피치 보조광
  const rimLight = new THREE.DirectionalLight(0xFFD8BE, 0.42);
  rimLight.position.set(-22, 18, -16);
  scene.add(rimLight);

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
    if (state.gold < 10) { showToast('탐색 비용(10만)이 부족합니다!', 'rose'); return; }
    addGold(-10);
    generateRecruitCandidates();
    renderRecruitCards();
  };

  // 웹뷰 호환 2-탭 초기화 확인 버튼
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
    tickChibiAndPets(dt, nowSec);
    tickHudCounters(dt);

    renderer.render(scene, camera);
    updateProjectedOverlays();

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
  setInterval(saveState, 3000);
});
