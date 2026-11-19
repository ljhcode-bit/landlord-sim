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

const SAVE_KEY = 'god_landlord_boutique_street_drive_2026_v9';

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
        happiness: 42
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
      auctionBonusPct: 0,
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
  if (typeof room.poachDefenseBonusPct !== 'number') room.poachDefenseBonusPct = 0;
  if (!Array.isArray(room.giftedItems)) room.giftedItems = [];
  syncRoomInteriorStats(room);
}

function createInitialFirstFloorShops() {
  const map = {};
  for (const tpl of (window.FIRST_FLOOR_SHOPS_TEMPLATE || [])) {
    map[tpl.shopId] = {
      shopId: tpl.shopId,
      owned: true,
      upgrades: {},
      cycleTimer: 6.5,
      totalServed: 12
    };
  }
  return map;
}

const FIRST_START_TS_KEY = 'god_landlord_first_start_ts_v1';

function getOrInitFirstStartTimestamp() {
  try {
    const saved = Number(localStorage.getItem(FIRST_START_TS_KEY));
    if (saved && saved > 1700000000000) return saved;
    const now = Date.now();
    localStorage.setItem(FIRST_START_TS_KEY, String(now));
    return now;
  } catch (e) {
    return Date.now();
  }
}

function createInitialState() {
  const lots = JSON.parse(JSON.stringify(INITIAL_ISLAND_LOTS));
  const harborHotel = makeResidentialBuilding('lot_harbor_main', 'harbor_hotel', '하버 부티크 호텔 & 펜트하우스', false);
  // 하버 호텔 101호 오션뷰 스위트 초기 개방 & 글로벌 영화배우 VIP 입주 셋업
  const h101 = harborHotel.rooms.find((r) => r.subId === '101');
  if (h101) {
    h101.unlocked = true;
    h101.household = {
      type: 'movie_star',
      familyName: '오드리 한 VIP',
      maxBudget: 960,
      happiness: 78
    };
    h101.rentTimer = 5.5;
  }

  const buildings = {
    lot_main: makeResidentialBuilding('lot_main', 'mixed_1', '해피 미니미 타운 1차', true),
    lot_harbor_main: harborHotel
  };
  const developments = {};
  const standaloneShops = createInitialStandaloneShops();
  const firstFloorShops = createInitialFirstFloorShops();

  return {
    gold: 1350,
    day: 1,
    gameMinutes: 9 * 60,
    firstStartedAt: getOrInitFirstStartTimestamp(),
    day2BonusClaimed: false,
    harborUnlocked: false,
    day3SkipForced: false,
    activeTownStage: 1,
    feverTimer: 0,
    feverPower: 2.5,
    townHappinessBoost: 0,
    unlockedMilestones: [],
    goldenKeys: 0,
    rivalWins: 0,
    rivalKangPenalty: 0,
    bestForbesRank: 10,
    vipTitle: '미니미 타운 신예 갓물주',
    heldGifts: {
      left: null,
      right: null
    },
    furnitureInventory: {},
    duelTrophies: 0,
    selectedHeroCharId: 'char_05_hamster',
    hasChosenHeroAnimal: false,
    claimedQuests: [],
    lots,
    buildings,
    developments,
    standaloneShops,
    firstFloorShops,
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
let harborRootGroup;
let harborBridgeGateL = null;
let harborBridgeGateR = null;
let harborVipMegaYacht = null;
const harborYachtActors = [];
const harborWalkerActors = [];
const harborPointLights = [];
let hqDividendTimer = 0;
let hqDividendAccum = 0;
let hqDividendToastTimeout = null;
let coronationBannerTimeout = null;

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
const HARBOR_OVERVIEW_LOOK = new THREE.Vector3(0.0, 6.4, 118.0);
const CAM_OFFSETS = [
  new THREE.Vector3(44, 34, 52),
  new THREE.Vector3(-44, 34, 52),
  new THREE.Vector3(-44, 34, -52),
  new THREE.Vector3(44, 34, -52)
];
let camAzimuth = 0;

const camTween = {
  active: false,
  elapsed: 0,
  duration: 0.6,
  startPos: new THREE.Vector3(),
  startLook: new THREE.Vector3(),
  startZoom: 0.78,
  pos: new THREE.Vector3(),
  look: new THREE.Vector3(),
  zoom: 0.76,
  onArrive: null
};

// [핵심 개편 2] 2단계 포커스 시퀀스(① 카메라 정중앙 이동·클린 감상 0.4s -> ② 비가림 컨트롤 독 슬라이드업)
const focusRevealState = {
  pending: false,
  holdTimer: 0,
  revealed: false,
  tuckTimer: 0
};

let currentShellOpacity = 0.22;
let focusedRoomId = null;
let focusedShopId = null;
let focusedFirstFloorShopId = null;
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

let flagshipShop3DGroup = null;
let activeFlagshipCategory = 'bed';
let activeFlagshipTier = 0;
const crashableStreetProps = [];

const SHOWROOM_DUEL_ORIGIN = new THREE.Vector3(185, 0, 0);
const duelState = {
  active: false,
  modeTab: 'rival',
  opponentIdx: 0,
  activeCat: 'all',
  stageGroup: null,
  myRoomGrp: null,
  oppRoomGrp: null,
  judgesGrp: null,
  myEquipped: { bed: 'bed_iron', sofa: 'sofa_beanbag', appliance: 'app_fan', decor: 'dec_peach' },
  oppEquipped: { bed: 'bed_iron', sofa: 'sofa_beanbag', appliance: 'app_fan', decor: 'dec_peach' },
  aiTimer: 1.8,
  aiStep: 0,
  judging: false,
  finished: false
};

// --------------------- [1단계 5 + 신규 확장 6] 도심 순환 + 외곽 해안·레드아치교 8자형 드라이브 코스 ---------------------
const VIP_PARKING_POS = { x: 13.8, y: 0.24, z: -1.2, rotY: 0 };
const RING_ROAD_WAYPOINTS = [
  { x: 26.5, z: 7.0, zone: 'town' },
  { x: -30.5, z: 7.0, zone: 'town' },
  { x: -30.5, z: 28.6, zone: 'town' },
  { x: 18.0, z: 28.6, zone: 'junction_in' },     // 삼거리 교차로 -> SCENIC DRIVE ZONE 진입!
  { x: 23.5, z: 36.8, zone: 'scenic' },          // 야자수 직선 가속 구간
  { x: 22.0, z: 46.8, zone: 'scenic' },          // S자 해안 코너 진입
  { x: 10.5, z: 50.2, zone: 'bridge' },          // 빨간 철제 아치형 다리 동측 진입
  { x: -3.5, z: 50.2, zone: 'bridge' },          // 빨간 철제 아치형 다리 중앙 도하
  { x: -16.8, z: 48.2, zone: 'overlook' },       // 해안 전망대 휴게소 & 푸드/커피트럭 앞 통과
  { x: -23.5, z: 40.5, zone: 'scenic' },         // 서측 벚꽃 S자 복귀 코너
  { x: -18.5, z: 28.6, zone: 'junction_out' },   // 도심 순환도로 삼거리 합류
  { x: 30.5, z: 28.6, zone: 'town' },
  { x: 30.5, z: 7.0, zone: 'town' }
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
  camShakeTimer: 0,
  v12SfxCooldown: 0,
  shopZoneLock: {},
  boostFlames: [],
  keys: {
    forward: false,
    backward: false,
    left: false,
    right: false,
    boost: false
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

// 신규 3D 시스템 레지스트리 (실사 에셋 · 오프스크린 3D 썸네일 · 머니건 · 마일스톤 · 외곽 드라이빙 존 · 시공 연출)
const REAL_TEX = {
  faces: [],
  outfits: [],
  snacks: {},
  foods: {},
  bills: {}
};
const catalog3DPreviewCache = new Map();
let offscreenThumbScene = null;
let offscreenThumbCam = null;
const activeDropBounces = [];
const activeTileAnimations = [];
const scenicBoostCoins = [];
const scenicWaveMeshes = [];
const characterAuraRings = [];
const auraMoteEls = {};
const firstFloorShop3D = {};

const makeItRainState = {
  active: false,
  timer: 0,
  spawnAccum: 0,
  avatarGroup: null,
  gunL: null,
  gunR: null,
  fpGunL: null,
  fpGunR: null,
  bills: [],
  crowdActors: []
};

const milestoneState = {
  group: null,
  swayingBanners: [],
  rooftopActors: [],
  paradeActors: [],
  fireworkTimer: 0,
  fireworks: [],
  flashTimer: 0,
  statueGroup: null,
  statueCrowd: [],
  ceremonyActive: false,
  ceremonyTimer: 0,
  ceremonyQueue: []
};

// [신규 8] 비대칭 분할 3D 인형의 집 라이브 오프닝 타이틀 & 5단계 시네마틱 투어 상태
let sfxEnabled = true;
let highQualityShadows = true;
const risingGroundCoins = [];

const titleScreenState = {
  active: true,
  progress: 6,
  ready: false,
  entering: false,
  swayPhase: 0
};

const guidedTourState = {
  active: false,
  stepIdx: 0,
  stepTimer: 0,
  demoGroup: null,
  tempCarMesh: null,
  tempCarProgress: 0,
  tempKangGroup: null,
  ringPulseAccum: 0,
  savedMilestones: null,
  milestonePreviewed: false
};

// [신규 1 & 2] 1층 직영매장 & 단독상가 내부 스마트 손님/직원 일상 루틴 레지스트리
const shopSmartAI = {
  martCustomers: [],
  washCustomers: [],
  martClerk: null,
  washClerk: null,
  martTimer: 0.8,
  washTimer: 1.4
};

// [신규 3~6] 라이벌 '블랙타워 강 회장' 침공 & 3대 자본력 승부 상태 레지스트리
const rivalState = {
  periodicTimer: 60.0,
  poach: {
    active: false,
    roomId: null,
    carMesh: null,
    kangMesh: null,
    pinEl: null,
    pulsePhase: 0
  },
  bidding: {
    active: false,
    shopId: null,
    myBid: 360,
    rivalBid: 390,
    stageGrp: null,
    myAvatar: null,
    kangAvatar: null,
    myPaddleGrp: null,
    kangPaddleGrp: null,
    myPaddleMat: null,
    kangPaddleMat: null,
    briefcaseMesh: null,
    swingPhase: 0,
    resolving: false
  },
  race: {
    active: false,
    rivalCar: null,
    rivalWpIdx: 4,
    rivalX: 19.5,
    rivalZ: 31.5,
    rivalHeading: 0.56,
    rivalSpeed: 9.8,
    playerProg: 0,
    rivalProg: 0,
    finished: false
  },
  fpKangMesh: null,
  fpKangActive: false
};

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
  const warmPeach = new THREE.Color(opts.coolShadow ? 0xE9D5FF : 0xFFD6BA);
  const subTint = baseCol.clone().lerp(warmPeach, 0.36);

  return new THREE.MeshStandardMaterial({
    color: baseCol,
    map: opts.map || null,
    roughness: opts.roughness !== undefined ? opts.roughness : 0.68,
    metalness: opts.metalness !== undefined ? opts.metalness : 0.04,
    emissive: opts.emissive !== undefined ? new THREE.Color(opts.emissive) : subTint,
    emissiveIntensity: opts.emissiveIntensity !== undefined ? opts.emissiveIntensity : (opts.map ? 0.09 : 0.14),
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
  if (!sfxEnabled) return null;
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
  } else if (shopType === 'lobster') {
    ctx.fillStyle = '#7F1D1D'; ctx.beginPath(); ctx.roundRect(6, 6, w - 12, h - 12, 34); ctx.fill();
    ctx.fillStyle = '#FFFBEB'; ctx.beginPath(); ctx.roundRect(20, 18, w - 40, h - 36, 26); ctx.fill();
    ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 7; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '800 46px "Pretendard", sans-serif';
    ctx.fillStyle = '#B91C1C'; ctx.fillText('ROYAL LOBSTER · 파인다이닝', w * 0.5, 92);
    ctx.font = '700 24px "Pretendard", sans-serif'; ctx.fillStyle = '#92400E';
    ctx.fillText('OCEAN VIEW LOBSTER & TOMAHAWK STEAK', w * 0.5, 154);
  } else if (shopType === 'winelounge') {
    ctx.fillStyle = '#2E1065'; ctx.beginPath(); ctx.roundRect(6, 6, w - 12, h - 12, 34); ctx.fill();
    ctx.fillStyle = '#FAF5FF'; ctx.beginPath(); ctx.roundRect(20, 18, w - 40, h - 36, 26); ctx.fill();
    ctx.strokeStyle = '#FBBF24'; ctx.lineWidth = 7; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '800 46px "Pretendard", sans-serif';
    ctx.fillStyle = '#581C87'; ctx.fillText('SUNSET WINE & JAZZ 라운지', w * 0.5, 92);
    ctx.font = '700 24px "Pretendard", sans-serif'; ctx.fillStyle = '#B45309';
    ctx.fillText('GRAND PIANO LIVE · VINTAGE CELLAR', w * 0.5, 154);
  } else if (shopType === 'marina') {
    ctx.fillStyle = '#0F172A'; ctx.beginPath(); ctx.roundRect(6, 6, w - 12, h - 12, 34); ctx.fill();
    ctx.fillStyle = '#F0F9FF'; ctx.beginPath(); ctx.roundRect(20, 18, w - 40, h - 36, 26); ctx.fill();
    ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 7; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '800 46px "Pretendard", sans-serif';
    ctx.fillStyle = '#0369A1'; ctx.fillText('VIP YACHT MARINA 클럽', w * 0.5, 92);
    ctx.font = '700 24px "Pretendard", sans-serif'; ctx.fillStyle = '#92400E';
    ctx.fillText('PRIVATE SUPERYACHT & CHAMPAGNE PIER', w * 0.5, 154);
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

function createTwilightSkyBackdropTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0.0, '#141236');
  grad.addColorStop(0.28, '#3B1C63');
  grad.addColorStop(0.54, '#9D2A63');
  grad.addColorStop(0.78, '#EA6A47');
  grad.addColorStop(1.0, '#FBBF24');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 1024);

  // 상단 황혼 별빛 은하 디테일
  for (let i = 0; i < 95; i++) {
    const sx = (Math.sin(i * 91.7) * 0.5 + 0.5) * 1024;
    const sy = (Math.cos(i * 53.3) * 0.5 + 0.5) * 430;
    const sr = 0.8 + (i % 3) * 0.9;
    ctx.fillStyle = `rgba(255, 248, 220, ${0.35 + (i % 5) * 0.12})`;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  // 수평선 노을 태양 후광
  const sunGlow = ctx.createRadialGradient(512, 820, 20, 512, 820, 380);
  sunGlow.addColorStop(0, 'rgba(255, 236, 179, 0.55)');
  sunGlow.addColorStop(0.5, 'rgba(251, 146, 60, 0.22)');
  sunGlow.addColorStop(1, 'rgba(251, 146, 60, 0)');
  ctx.fillStyle = sunGlow;
  ctx.fillRect(0, 420, 1024, 604);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function initSharedResources() {
  TEX.skyBackdrop = TextureGenerator.pastelSkyBackdrop();
  TEX.twilightSkyBackdrop = createTwilightSkyBackdropTexture();
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

  TEX.awningCoral = TextureGenerator.stripedAwning('#F28B66', '#FFFDF9');
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
  TEX.lobsterSign = createShopSignboardTexture('lobster');
  TEX.wineloungeSign = createShopSignboardTexture('winelounge');
  TEX.marinaSign = createShopSignboardTexture('marina');
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
  MAT.slab = makeClayMat(0xF4ECE1, { roughness: 0.7 });
  MAT.dollhouseCutaway = makeClayMat(0xF4ECE1, { roughness: 0.7, emissive: 0xFFEAD2, emissiveIntensity: 0.14 });
  MAT.dollhouseWarmTrim = makeClayMat(0xD8BC9F, { roughness: 0.68 });
  MAT.pendantShadeCream = makeClayMat(0xFFF6E0, { emissive: 0xFFD180, emissiveIntensity: 0.55, roughness: 0.5 });
  MAT.pendantBulbWarm = makeClayMat(0xFFE8A3, { emissive: 0xFFB703, emissiveIntensity: 1.15, roughness: 0.25 });
  MAT.julietIron = makeClayMat(0x3A2E2B, { roughness: 0.56, metalness: 0.2 });
  MAT.mullionGlowPane = makeClayMat(0xFFF3D1, { emissive: 0xFFD98E, emissiveIntensity: 0.48, roughness: 0.32 });
  MAT.slateRoofCharcoal = makeClayMat(0x2B3140, { roughness: 0.58, metalness: 0.08, coolShadow: true });
  MAT.terracottaRoof = makeClayMat(0xC85A3B, { roughness: 0.58 });
  MAT.amberWindowGlow = makeClayMat(0xFFD27D, { emissive: 0xFF9F1C, emissiveIntensity: 1.15, roughness: 0.22 });
  MAT.stringBulbAmber = makeClayMat(0xFFE8A3, { emissive: 0xFFB703, emissiveIntensity: 1.4, roughness: 0.18 });
  MAT.yachtHullWhite = makeClayMat(0xFFFFFF, { roughness: 0.24, metalness: 0.12 });
  MAT.yachtTeakDeck = makeClayMat(0xBA7A44, { roughness: 0.52 });
  MAT.lobsterCoral = makeClayMat(0xE63946, { roughness: 0.28, emissive: 0x991B1B, emissiveIntensity: 0.22 });
  MAT.steakSeared = makeClayMat(0x7F2F1D, { roughness: 0.38 });
  MAT.basePadCream = makeClayMat(0xF6EFE6, { roughness: 0.68 });
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

  // ==================== 신규 고품격 물리 재질(MeshPhysicalMaterial) & 실사 PNG 에셋 로더 ====================
  MAT.pureGold24k = new THREE.MeshPhysicalMaterial({
    color: 0xFFE44D,
    metalness: 0.34,
    roughness: 0.16,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    emissive: 0xF59E0B,
    emissiveIntensity: 0.52
  });
  MAT.cutawayGlass = new THREE.MeshStandardMaterial({
    color: 0xE0F2FE,
    emissive: 0xBAE6FD,
    emissiveIntensity: 0.12,
    transparent: true,
    opacity: 0.09,
    roughness: 0.06,
    metalness: 0.05,
    depthWrite: false
  });
  MAT.chillerBlueLed = new THREE.MeshStandardMaterial({
    color: 0x7DD3FC,
    emissive: 0x0EA5E9,
    emissiveIntensity: 1.15,
    roughness: 0.18
  });
  MAT.roomBorderGlow = new THREE.MeshBasicMaterial({
    color: 0xFFE58F,
    transparent: true,
    opacity: 0.86
  });
  MAT.carClearRed = new THREE.MeshPhysicalMaterial({
    color: 0xEF233C,
    metalness: 0.35,
    roughness: 0.14,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    emissive: 0x7F0010,
    emissiveIntensity: 0.12
  });
  MAT.carClearMint = new THREE.MeshPhysicalMaterial({
    color: 0x34D399,
    metalness: 0.24,
    roughness: 0.16,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08
  });
  MAT.carClearBronze = new THREE.MeshPhysicalMaterial({
    color: 0xB86B35,
    metalness: 0.28,
    roughness: 0.18,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    emissive: 0x451A03,
    emissiveIntensity: 0.14
  });
  MAT.carClearCream = new THREE.MeshPhysicalMaterial({
    color: 0xFFFDF5,
    metalness: 0.2,
    roughness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06
  });
  MAT.carbonFiber = new THREE.MeshPhysicalMaterial({
    color: 0x283548,
    metalness: 0.28,
    roughness: 0.28,
    clearcoat: 0.65
  });
  MAT.chromeAlloy = new THREE.MeshPhysicalMaterial({
    color: 0xF8FAFC,
    metalness: 0.42,
    roughness: 0.14,
    clearcoat: 0.9,
    emissive: 0xCBD5E1,
    emissiveIntensity: 0.18
  });
  MAT.carClearPurple = new THREE.MeshPhysicalMaterial({
    color: 0x7E22CE,
    metalness: 0.34,
    roughness: 0.14,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    emissive: 0x4C1D95,
    emissiveIntensity: 0.28
  });
  MAT.rivalRimPurple = new THREE.MeshBasicMaterial({
    color: 0xA855F7,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  MAT.bridgeSteelRed = new THREE.MeshPhysicalMaterial({
    color: 0xDC2626,
    metalness: 0.38,
    roughness: 0.28,
    clearcoat: 0.45
  });

  // 캔버스 현수막 · 해안 드라이빙 아치 · 애드벌룬 · 황금 동상 명판 텍스처 생성
  const makeBannerCanvasTex = (bg1, bg2, borderHex, line1, line2, w = 512, h = 256) => {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const cx = cv.getContext('2d');
    const grd = cx.createLinearGradient(0, 0, w, h);
    grd.addColorStop(0, bg1);
    grd.addColorStop(1, bg2);
    cx.fillStyle = grd;
    cx.fillRect(0, 0, w, h);
    cx.strokeStyle = borderHex;
    cx.lineWidth = 14;
    cx.strokeRect(10, 10, w - 20, h - 20);
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillStyle = '#3A2E2B';
    cx.font = 'bold 40px Jua, Pretendard, sans-serif';
    cx.fillText(line1, w * 0.5, h * 0.38);
    cx.fillStyle = borderHex;
    cx.font = 'bold 34px Jua, Pretendard, sans-serif';
    cx.fillText(line2, w * 0.5, h * 0.7);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };

  TEX.praiseBanner1 = makeBannerCanvasTex('#FFFBEB', '#FDE68A', '#D97706', '우리 동네 최고의 갓물주님', '사랑해요! 영원히 함께해요!');
  TEX.praiseBanner2 = makeBannerCanvasTex('#FFF1F2', '#FECDD3', '#E11D48', '월세 동결 천사 건물주님', '만세!! 평생 입주 확정!!');
  TEX.scenicArchSign = makeBannerCanvasTex('#0F172A', '#1E3A8A', '#38BDF8', 'SCENIC DRIVE ZONE ➔', 'COASTAL PALM & RED ARCH BRIDGE');
  TEX.balloonSign = makeBannerCanvasTex('#FFFDF7', '#FFD93D', '#FF6B6B', 'HAPPY MINIMI TOWN', 'GOD LANDLORD FESTIVAL');
  TEX.statuePlaque = makeBannerCanvasTex('#291D12', '#452C16', '#FFD700', 'THE LEGENDARY LANDLORD', '전설의 성군 건물주 기념비');
  TEX.foodTruckSign = makeBannerCanvasTex('#FFF1F2', '#FFE4E6', '#FB7185', 'COASTAL FOOD & TACO', 'SUNSET DRIVE-THRU');
  TEX.coffeeTruckSign = makeBannerCanvasTex('#ECFDF5', '#D1FAE5', '#10B981', 'OCEAN BREEZE COFFEE', 'COLD BREW & WAFFLE');

  // 실사 음식 · 스낵 · 아트토이 얼굴/의상 PNG 텍스처 로더
  const texLoader = new THREE.TextureLoader();
  let pendingRealTex = 0;
  const loadCrispTex = (url) => {
    pendingRealTex += 1;
    const tx = texLoader.load(url, () => {
      pendingRealTex = Math.max(0, pendingRealTex - 1);
      if (pendingRealTex === 0) {
        catalog3DPreviewCache.clear();
        if (focusedRoomId) renderFurnitureCatalogSheet();
        if (focusedShopId) renderShopUpgradeCatalog();
        if (focusedFirstFloorShopId) renderFirstFloorShopUpgradeCatalog();
      }
    });
    tx.colorSpace = THREE.SRGBColorSpace;
    tx.anisotropy = 4;
    return tx;
  };

  for (let i = 1; i <= 12; i++) {
    REAL_TEX.faces.push(loadCrispTex(`./assets/characters/face_${String(i).padStart(2, '0')}.png`));
  }
  for (let i = 1; i <= 15; i++) {
    REAL_TEX.outfits.push(loadCrispTex(`./assets/characters/outfit_${String(i).padStart(2, '0')}.png`));
  }

  REAL_TEX.foods.croissant = loadCrispTex('./assets/foods/croissant_real.png');
  REAL_TEX.foods.baguette = loadCrispTex('./assets/foods/baguette_real.png');
  REAL_TEX.foods.cake = loadCrispTex('./assets/foods/strawberry_cake_real.png');
  REAL_TEX.foods.einspanner = loadCrispTex('./assets/foods/einspanner_real.png');
  REAL_TEX.foods.fruits = loadCrispTex('./assets/foods/fruits_real.png');
  REAL_TEX.foods.bento = loadCrispTex('./assets/foods/bento_real.png');

  REAL_TEX.snacks.chips = loadCrispTex('./assets/snacks/snack_chips_real.png');
  REAL_TEX.snacks.shrimp = loadCrispTex('./assets/snacks/snack_shrimp_real.png');
  REAL_TEX.snacks.choco = loadCrispTex('./assets/snacks/snack_choco_real.png');
  REAL_TEX.snacks.ramen = loadCrispTex('./assets/snacks/snack_ramen_real.png');
  REAL_TEX.snacks.strawberry = loadCrispTex('./assets/snacks/snack_strawberry_real.png');
  REAL_TEX.snacks.cheese = loadCrispTex('./assets/snacks/snack_cheese_real.png');
  REAL_TEX.snacks.matcha = loadCrispTex('./assets/snacks/snack_matcha_real.png');
  REAL_TEX.snacks.cola = loadCrispTex('./assets/snacks/snack_cola_real.png');
  REAL_TEX.snacks.beer = loadCrispTex('./assets/snacks/snack_beer_real.png');
  REAL_TEX.snacks.kimbap = loadCrispTex('./assets/snacks/snack_kimbap_real.png');

  REAL_TEX.bills.krw50k = loadCrispTex('./assets/snacks/money_bill_50k.png');
  REAL_TEX.bills.usd100 = loadCrispTex('./assets/snacks/money_bill_100usd.png');

  // 실사 베이커리 & 과자봉지 유광 클리어코트 재질 사전 빌드
  MAT.realCroissant = new THREE.MeshPhysicalMaterial({
    map: REAL_TEX.foods.croissant,
    roughness: 0.28,
    clearcoat: 0.46,
    clearcoatRoughness: 0.18
  });
  MAT.realBaguette = new THREE.MeshPhysicalMaterial({
    map: REAL_TEX.foods.baguette,
    roughness: 0.36,
    clearcoat: 0.28
  });
  MAT.realCake = new THREE.MeshPhysicalMaterial({
    map: REAL_TEX.foods.cake,
    roughness: 0.26,
    clearcoat: 0.42
  });
  MAT.realEinspanner = new THREE.MeshPhysicalMaterial({
    map: REAL_TEX.foods.einspanner,
    roughness: 0.18,
    clearcoat: 0.65
  });
  MAT.realFruits = new THREE.MeshPhysicalMaterial({
    map: REAL_TEX.foods.fruits,
    roughness: 0.2,
    clearcoat: 0.65,
    clearcoatRoughness: 0.12
  });
  MAT.realBento = new THREE.MeshPhysicalMaterial({
    map: REAL_TEX.foods.bento,
    roughness: 0.3,
    clearcoat: 0.35
  });
  MAT.bentoClearLid = new THREE.MeshPhysicalMaterial({
    color: 0xFFFFFF,
    transparent: true,
    opacity: 0.22,
    roughness: 0.05,
    clearcoat: 1.0,
    depthWrite: false
  });

  MAT.snackMats = {};
  for (const [sk, stx] of Object.entries(REAL_TEX.snacks)) {
    MAT.snackMats[sk] = new THREE.MeshPhysicalMaterial({
      map: stx,
      roughness: 0.24,
      metalness: 0.12,
      clearcoat: 0.68,
      clearcoatRoughness: 0.14
    });
  }

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
    coral: 0xF28B66,
    sky: 0x0284C7,
    brown: 0x6F3B1B,
    mint: 0x1B4332,
    lavender: 0x7E5A9B
  };
  const stripeTex = texMap[style] || TEX.awningCoral;
  const accentMat = makeClayMat(accentHexMap[style] || 0xF28B66, { roughness: 0.62 });
  const slopeMat = makeClayMat(0xFFFFFF, { map: stripeTex, roughness: 0.64 });

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
    flores: TEX.floresSign,
    lobster: TEX.lobsterSign,
    winelounge: TEX.wineloungeSign,
    marina: TEX.marinaSign
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

// --------------------- 나무 · 가로수 · 아치형 돌다리 · 야외 원목 테이블 빌더 ---------------------
function createBoulevardTree3D(scale = 1.0, sakura = false) {
  const grp = new THREE.Group();
  const shadow = new THREE.Mesh(GEO.quad, MAT.shadow);
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(2.3 * scale, 2.3 * scale, 1);
  shadow.position.y = 0.02;
  grp.add(shadow);

  // 크림 석조 원형 가로수 화단 테두리
  const planter = new THREE.Mesh(GEO.cyl, MAT.dollhouseCutaway || MAT.fountainStone);
  planter.scale.set(1.12 * scale, 0.24, 1.12 * scale);
  planter.position.y = 0.12;
  grp.add(planter);

  const soil = new THREE.Mesh(GEO.cyl, MAT.woodDark);
  soil.scale.set(0.88 * scale, 0.06, 0.88 * scale);
  soil.position.y = 0.24;
  grp.add(soil);

  const trunk = new THREE.Mesh(GEO.cyl, MAT.woodWarm);
  trunk.scale.set(0.32 * scale, 1.62 * scale, 0.32 * scale);
  trunk.position.y = 0.94 * scale;
  trunk.castShadow = true;
  grp.add(trunk);

  // 동글동글한 미니어처 토피어리 구형 수관 (Round Miniature Street Tree)
  const leafMat = sakura ? MAT.sakuraPink : MAT.leafGreen;
  const subLeafMat = sakura ? MAT.pinkSoft : MAT.cloverGreen;
  const spheres = [
    [0, 2.28, 0, 1.08, leafMat],
    [-0.56, 1.98, 0.3, 0.76, subLeafMat],
    [0.58, 2.02, -0.24, 0.78, leafMat],
    [0.14, 2.72, 0.12, 0.7, subLeafMat]
  ];
  for (const [px, py, pz, r, m] of spheres) {
    const ball = new THREE.Mesh(GEO.sphere, m);
    ball.scale.set(r * scale, r * 0.96 * scale, r * scale);
    ball.position.set(px * scale, py * scale, pz * scale);
    ball.castShadow = true;
    grp.add(ball);
  }
  return grp;
}

function createArchedStoneBridge3D() {
  const grp = new THREE.Group();
  const stoneMat = MAT.dollhouseCutaway || MAT.fountainStone;
  const trimMat = MAT.dollhouseWarmTrim || MAT.podiumStone;
  const cobbleMat = makeClayMat(0xFFFFFF, { map: TEX.plazaCobble, roughness: 0.68 });

  // 아치형 하부 석조 볼트 & 교대 기둥
  grp.add(createRoundedToyMesh(1.15, 0.92, 3.6, trimMat, -2.35, 0.42, 0, 0.1));
  grp.add(createRoundedToyMesh(1.15, 0.92, 3.6, trimMat, 2.35, 0.42, 0, 0.1));

  // 곡선 아치 상판 세그먼트 7단 (가운데가 부드럽게 솟은 아치형 돌다리)
  const segs = [-2.1, -1.4, -0.7, 0, 0.7, 1.4, 2.1];
  for (const sx of segs) {
    const archLift = Math.cos((sx / 2.55) * (Math.PI * 0.5)) * 0.54;
    const tilt = -(sx / 2.55) * 0.24;
    const deckSeg = createRoundedToyMesh(0.86, 0.24, 3.35, stoneMat, sx, 0.52 + archLift, 0, 0.05);
    deckSeg.rotation.z = tilt;
    const roadSeg = createRoundedToyMesh(0.82, 0.06, 2.75, cobbleMat, sx, 0.65 + archLift, 0, 0.02);
    roadSeg.rotation.z = tilt;
    grp.add(deckSeg, roadSeg);

    // 좌우 석조 난간 포스트 & 핸드레일
    for (const sideZ of [-1.48, 1.48]) {
      const railSeg = createRoundedToyMesh(0.84, 0.16, 0.22, trimMat, sx, 1.02 + archLift, sideZ, 0.04);
      railSeg.rotation.z = tilt;
      grp.add(railSeg);
      if (Math.abs(sx % 1.4) < 0.05) {
        const post = createRoundedToyMesh(0.24, 0.52, 0.26, stoneMat, sx, 0.84 + archLift, sideZ, 0.05);
        grp.add(post);
      }
    }
  }
  return grp;
}

function createOutdoorWoodenBistroSet3D() {
  const grp = new THREE.Group();
  const top = new THREE.Mesh(GEO.cyl, MAT.woodLight);
  top.scale.set(0.76, 0.08, 0.76);
  top.position.y = 0.76;
  top.castShadow = true;
  const leg = new THREE.Mesh(GEO.cyl, MAT.woodDark);
  leg.scale.set(0.11, 0.72, 0.11);
  leg.position.y = 0.38;
  const base = new THREE.Mesh(GEO.cyl, MAT.woodDark);
  base.scale.set(0.42, 0.06, 0.42);
  base.position.y = 0.04;
  const cup1 = new THREE.Mesh(GEO.cyl, MAT.coral);
  cup1.scale.set(0.11, 0.16, 0.11);
  cup1.position.set(-0.18, 0.88, 0.08);
  const plate = new THREE.Mesh(GEO.cyl, MAT.white);
  plate.scale.set(0.24, 0.03, 0.24);
  plate.position.set(0.16, 0.82, -0.06);
  const pastry = new THREE.Mesh(GEO.sphere, MAT.butterOak || MAT.woodWarm);
  pastry.scale.set(0.15, 0.1, 0.12);
  pastry.position.set(0.16, 0.88, -0.06);
  grp.add(top, leg, base, cup1, plate, pastry);

  for (const sx of [-0.88, 0.88]) {
    const seat = createRoundedToyMesh(0.46, 0.08, 0.46, MAT.woodWarm, sx, 0.46, 0, 0.04);
    const sLeg = new THREE.Mesh(GEO.cyl, MAT.woodDark);
    sLeg.scale.set(0.08, 0.44, 0.08);
    sLeg.position.set(sx, 0.22, 0);
    const back = createRoundedToyMesh(0.08, 0.42, 0.44, MAT.woodLight, sx + (sx < 0 ? -0.19 : 0.19), 0.68, 0, 0.03);
    grp.add(seat, sLeg, back);
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

// 물방울 맺힌 초고화질 실사 사과 & 오렌지 나무 상자(Wooden Crate) 진열대
function createFruitWoodenCrate3D(fruitKind = 'apple') {
  const grp = new THREE.Group();
  const stand = createRoundedToyMesh(1.14, 0.48, 0.88, MAT.woodDark, 0, 0.24, 0, 0.04);
  const crate = createRoundedToyMesh(1.22, 0.36, 0.94, MAT.woodLight, 0, 0.62, 0.04, 0.05);
  crate.rotation.x = 0.24;
  // 상자 내부 실사 과일 바닥 베드
  const bedPlane = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.08, 0.78), MAT.realFruits || MAT.appleRed);
  bedPlane.position.set(0, 0.72, 0.05);
  bedPlane.rotation.x = 0.24;
  grp.add(stand, crate, bedPlane);

  const glossyApple = new THREE.MeshPhysicalMaterial({
    color: 0xEF233C,
    map: REAL_TEX.foods?.fruits || null,
    roughness: 0.16,
    clearcoat: 0.85,
    clearcoatRoughness: 0.08
  });
  const glossyOrange = new THREE.MeshPhysicalMaterial({
    color: 0xFB8500,
    map: REAL_TEX.foods?.fruits || null,
    roughness: 0.22,
    clearcoat: 0.78,
    clearcoatRoughness: 0.1
  });

  for (let r = -1; r <= 1; r++) {
    for (let c = -2; c <= 2; c++) {
      const useOrange = fruitKind === 'orange' || (fruitKind === 'mix' && (r + c) % 2 === 0);
      const f = new THREE.Mesh(GEO.sphere, useOrange ? glossyOrange : glossyApple);
      f.scale.setScalar(0.245);
      const fx = c * 0.2;
      const fy = 0.8 - r * 0.055;
      const fz = r * 0.22 + 0.04;
      f.position.set(fx, fy, fz);
      grp.add(f);
      // 이슬 물방울 하이라이트
      if ((r + c) % 2 === 0) {
        const drop = new THREE.Mesh(GEO.sphere, MAT.bentoClearLid || MAT.white);
        drop.scale.setScalar(0.055);
        drop.position.set(fx + 0.06, fy + 0.1, fz + 0.07);
        grp.add(drop);
      }
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

  // 아치형 돌다리(Arched Stone Bridge) & 그 아래로 흐르는 맑은 시냇물 수로
  const streamChannel = createRoundedToyMesh(2.9, 0.08, 34.0, MAT.screenCyan, 37.5, 0.03, 10.5, 0.04, false, false, false);
  const streamBankL = createRoundedToyMesh(0.45, 0.16, 34.2, MAT.fountainStone, 35.85, 0.08, 10.5, 0.05);
  const streamBankR = createRoundedToyMesh(0.45, 0.16, 34.2, MAT.fountainStone, 39.15, 0.08, 10.5, 0.05);
  islandRootGroup.add(streamChannel, streamBankL, streamBankR);

  const eastStoneBridge = createArchedStoneBridge3D();
  eastStoneBridge.position.set(37.5, 0.05, 15.0);
  islandRootGroup.add(eastStoneBridge);

  // 메인 빌딩 우측 수변 공원 미니 시냇물 & 아치형 돌다리 (오프닝/타운 뷰 핵심 포인트)
  const gardenBrook = createRoundedToyMesh(2.8, 0.07, 8.8, MAT.screenCyan, 13.5, 0.04, -5.2, 0.04, false, false, false);
  const gardenBankL = createRoundedToyMesh(0.36, 0.18, 9.0, MAT.dollhouseWarmTrim || MAT.fountainStone, 11.95, 0.09, -5.2, 0.05);
  const gardenBankR = createRoundedToyMesh(0.36, 0.18, 9.0, MAT.dollhouseWarmTrim || MAT.fountainStone, 15.05, 0.09, -5.2, 0.05);
  const gardenStoneBridge = createArchedStoneBridge3D();
  gardenStoneBridge.scale.setScalar(0.86);
  gardenStoneBridge.position.set(13.5, 0.05, -4.4);
  islandRootGroup.add(gardenBrook, gardenBankL, gardenBankR, gardenStoneBridge);

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

  // 남측 산책 프롬나드 인도 (삼거리 교차로 x = -18.5, x = +18.0 진출입 개구부 확보!)
  islandRootGroup.add(createRoundedToyMesh(14.5, 0.22, 3.0, sidewalkHMat, -29.2, 0.11, 33.3, 0.08, false, true, false));
  islandRootGroup.add(createRoundedToyMesh(29.2, 0.22, 3.0, sidewalkHMat, -0.2, 0.11, 33.3, 0.08, false, true, false));
  islandRootGroup.add(createRoundedToyMesh(14.0, 0.22, 3.0, sidewalkHMat, 28.5, 0.11, 33.3, 0.08, false, true, false));

  // =========================================================
  // [신규 확장 6] 외곽 해안 & 레드 아치교 드라이빙 존 (Outer Scenic Coastal & Bridge Drive Zone)
  // =========================================================
  buildOuterScenicDrivingZone3D(roadHMat, roadVMat, roadCornerMat, cwMat);

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

  // 광장 및 메인 빌딩 앞 미니어처 동글 가로수 배치
  const treeCoords = [
    [-17.6, 2.8, 0.92, false],
    [10.2, 2.8, 0.94, false],
    [16.8, -1.8, 0.9, true],
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
  crashableStreetProps.length = 0;
  const registerCrashProp = (mesh, hitRadius = 1.65, label = '도로 기물') => {
    if (!mesh) return;
    crashableStreetProps.push({
      mesh,
      baseX: mesh.position.x,
      baseY: mesh.position.y,
      baseZ: mesh.position.z,
      baseRotX: mesh.rotation.x,
      baseRotY: mesh.rotation.y,
      baseRotZ: mesh.rotation.z,
      baseScale: mesh.scale.clone(),
      hitRadius,
      label,
      crashed: false,
      timer: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      spinX: 0,
      spinZ: 0
    });
  };

  for (const [sx, sz] of [[-10.4, 3.25], [9.4, 3.25], [-24.4, 10.75]]) {
    const np = createNoParkingSign3D();
    np.position.set(sx, 0.24, sz);
    islandRootGroup.add(np);
    registerCrashProp(np, 1.85, '주차금지 표지판');
  }

  // ② 빨간 소화전 (Fire Hydrant) 3곳
  for (const [hx, hz] of [[-18.8, 3.25], [10.8, 10.75], [24.8, 24.75]]) {
    const fh = createFireHydrant3D();
    fh.position.set(hx, 0.24, hz);
    islandRootGroup.add(fh);
    registerCrashProp(fh, 1.75, '소화전');
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
    registerCrashProp(lamp, 1.95, '주철 가로등');
  }

  // ⑤ 빨간 우체통 (메인 빌딩 정문 우측 인도)
  const postbox = createRedPostbox3D();
  postbox.position.set(10.4, 0.24, 2.65);
  islandRootGroup.add(postbox);
  registerCrashProp(postbox, 1.85, '빨간 우체통');

  // ⑥ 초록색 신문 가판대 (버스정류장 옆)
  const newsStand = createNewspaperStand3D();
  newsStand.position.set(-21.2, 0.24, 2.35);
  islandRootGroup.add(newsStand);
  registerCrashProp(newsStand, 1.9, '신문 가판대');

  // ⑦ 자전거 거치대 & 파스텔 자전거 (바게트 하우스 & 광장 사이)
  const bikeRack = createBikeRack3D();
  bikeRack.position.set(-9.2, 0.24, 18.6);
  islandRootGroup.add(bikeRack);
  registerCrashProp(bikeRack, 1.95, '자전거 거치대');

  // ⑧ 가게 앞 A자형 나무 입간판 (TODAY'S CAKE) + 도로변 안전 라바콘·화분·테이블 배치 (충돌 물리 체험용!)
  const cakeBoard = createAFrameMenuBoard3D();
  cakeBoard.position.set(-11.1, 0.24, 19.4);
  cakeBoard.rotation.y = 0.28;
  islandRootGroup.add(cakeBoard);
  registerCrashProp(cakeBoard, 1.8, '원목 입간판');

  const roadConeSpots = [
    [15.6, 4.4], [-14.2, 4.4], [-27.8, 13.5], [-27.8, 24.5],
    [-12.5, 25.8], [8.5, 25.8], [27.8, 17.5], [19.8, 9.6]
  ];
  roadConeSpots.forEach(([cx, cz], idx) => {
    const propGrp = new THREE.Group();
    if (idx % 2 === 0) {
      // 오렌지 반사띠 도로 안전 라바콘
      propGrp.add(createRoundedToyMesh(0.72, 0.1, 0.72, MAT.charcoal, 0, 0.05, 0, 0.03));
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.78, 14), MAT.coral);
      cone.position.y = 0.44;
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.21, 0.16, 14), MAT.white);
      stripe.position.y = 0.46;
      propGrp.add(cone, stripe);
    } else {
      // 부티크 테라코타 화분 & 가드레일 볼라드
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.3, 0.56, 14), MAT.coral);
      pot.position.y = 0.28;
      const bush = new THREE.Mesh(GEO.sphere, MAT.leafGreen);
      bush.scale.set(0.46, 0.42, 0.46);
      bush.position.y = 0.68;
      propGrp.add(pot, bush);
    }
    propGrp.position.set(cx, 0.22, cz);
    islandRootGroup.add(propGrp);
    registerCrashProp(propGrp, 2.05, idx % 2 === 0 ? '안전 라바콘' : '가로변 화분');
  });

  // 야외 비스트로 테이블 세트 (도로변 카페 테라스 충돌 가능 기물)
  for (const [bx, bz] of [[-4.2, 10.6], [14.8, 10.6]]) {
    const bst = createOutdoorWoodenBistroSet3D();
    bst.position.set(bx, 0.22, bz);
    islandRootGroup.add(bst);
    registerCrashProp(bst, 2.15, '야외 카페 테이블');
  }

  // ⑨ 신규 3D 『메종 드 럭셔리 가구 백화점 (MAISON DE LUXURY)』 플래그십 쇼룸 빌딩 배치!
  buildLuxuryFurnitureFlagship3D();

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

  milestoneState.group = new THREE.Group();
  scene.add(milestoneState.group);
}

function createFlagshipSignTexture() {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 128;
  const ctx = cv.getContext('2d');
  const grd = ctx.createLinearGradient(0, 0, 512, 128);
  grd.addColorStop(0, '#1E1B4B');
  grd.addColorStop(0.5, '#312E81');
  grd.addColorStop(1, '#1E1B4B');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#FBBF24';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 112);
  ctx.fillStyle = '#FDE68A';
  ctx.font = '800 34px Pretendard, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🛋️ MAISON DE LUXURY', 256, 56);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 22px Pretendard, sans-serif';
  ctx.fillText('리빙 & 하이엔드 가구·설비 백화점', 256, 96);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildLuxuryFurnitureFlagship3D() {
  if (!islandRootGroup) return;
  if (flagshipShop3DGroup) {
    islandRootGroup.remove(flagshipShop3DGroup);
  }
  const grp = new THREE.Group();
  grp.position.set(25.2, 0.22, -6.2);
  flagshipShop3DGroup = grp;

  const W = 12.2;
  const D = 7.4;
  const H = 6.2;
  const cutawayMat = MAT.dollhouseCutaway || MAT.cream;
  const trimMat = MAT.pureGold24k || MAT.gold;
  const floorMat = makeClayMat(0xFFFFFF, { map: TEX.floor3, roughness: 0.42 });

  // 대리석 기단 & 골드 프레임 쇼룸 외관 (전면 통유리 개방형 Cutaway!)
  grp.add(createRoundedToyMesh(W + 0.8, 0.36, D + 0.8, cutawayMat, 0, 0.18, 0, 0.1));
  grp.add(createRoundedToyMesh(W, 0.12, D, floorMat, 0, 0.4, 0, 0.05));
  grp.add(createRoundedToyMesh(W, H, 0.32, cutawayMat, 0, 0.4 + H * 0.5, -D * 0.5, 0.08));
  grp.add(createRoundedToyMesh(0.32, H, D, cutawayMat, -W * 0.5, 0.4 + H * 0.5, 0, 0.08));
  grp.add(createRoundedToyMesh(0.32, H, D, cutawayMat, W * 0.5, 0.4 + H * 0.5, 0, 0.08));
  grp.add(createRoundedToyMesh(0.42, H, 0.42, trimMat, -W * 0.5 + 0.1, 0.4 + H * 0.5, D * 0.5, 0.06));
  grp.add(createRoundedToyMesh(0.42, H, 0.42, trimMat, W * 0.5 - 0.1, 0.4 + H * 0.5, D * 0.5, 0.06));

  // 유럽풍 로열 네이비 박공지붕 + 도머 창문 2개 + 황금 간판
  const roof = createEuropeanGableRoofWithDormers3D(W + 0.4, D + 0.3, MAT.slateRoofCharcoal || MAT.roofRoyalNavy, 2);
  roof.position.set(0, 0.4 + H, 0);
  grp.add(roof);

  const signFrame = createRoundedToyMesh(8.6, 1.85, 0.3, trimMat, 0, 0.4 + H + 2.55, 0.4, 0.1);
  const signFace = new THREE.Mesh(GEO.quad, new THREE.MeshBasicMaterial({ map: createFlagshipSignTexture() }));
  signFace.scale.set(8.2, 1.56, 1);
  signFace.position.set(0, 0.4 + H + 2.55, 0.58);
  grp.add(signFrame, signFace);

  // 쇼룸 내부: 캐노피 킹 침대 + 24K 순금 그랜드 피아노 + 천장 크리스탈 샹들리에 + 스포트라이트!
  const showBed = createCatalogBed3D('bed_canopy');
  showBed.scale.setScalar(0.88);
  showBed.position.set(-3.1, 0.46, -0.4);
  const showGoldPiano = create3DGrandPianoMesh();
  showGoldPiano.traverse((c) => {
    if (c.isMesh && c.material && c.material !== MAT.white && c.material !== MAT.supercarRed) {
      c.material = MAT.pureGold24k || MAT.gold;
    }
  });
  showGoldPiano.scale.setScalar(0.92);
  showGoldPiano.position.set(2.8, 0.46, 0.25);
  const chand = create3DWineCellarAndChandelierMesh(H - 0.3, D);
  chand.position.set(0.4, 0.42, 0);
  const spot = new THREE.PointLight(0xFFD166, 1.85, 16);
  spot.position.set(0, 5.2, 1.2);
  grp.add(showBed, showGoldPiano, chand, spot);

  // 쇼룸 매니저 NPC
  const curator = createChibiPerson3D('manager', null, 11);
  curator.position.set(0.1, 0.46, 1.65);
  grp.add(curator);

  // 클릭 시 가구 백화점 우측 슬림 드로어 즉시 오픈!
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(W + 1.2, H + 3.2, D + 1.4),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hit.position.set(0, H * 0.5 + 1.2, 0);
  hit.userData = { kind: 'furnitureFlagship' };
  grp.add(hit);
  pickableMeshes.push(hit);

  islandRootGroup.add(grp);
}

// =========================================================
// 5B. [신규 확장 6] 외곽 해안 & 빨간 철제 아치교 드라이빙 존 (Scenic Coastal & Bridge Drive Zone)
// =========================================================
function createPalmTree3D(scale = 1.0) {
  const grp = new THREE.Group();
  for (let s = 0; s < 6; s++) {
    const seg = new THREE.Mesh(GEO.cyl, MAT.woodWarm);
    seg.scale.set((0.36 - s * 0.03) * scale, 0.62 * scale, (0.36 - s * 0.03) * scale);
    seg.position.set(Math.sin(s * 0.16) * 0.28 * scale, (0.31 + s * 0.56) * scale, 0);
    seg.rotation.z = -s * 0.04;
    grp.add(seg);
  }
  const topX = Math.sin(5 * 0.16) * 0.28 * scale;
  const topY = 3.65 * scale;
  for (let f = 0; f < 7; f++) {
    const ang = (f / 7) * Math.PI * 2;
    const frondPivot = new THREE.Group();
    frondPivot.position.set(topX, topY, 0);
    frondPivot.rotation.y = ang;
    const leaf = createRoundedToyMesh(0.42 * scale, 0.08 * scale, 1.85 * scale, f % 2 === 0 ? MAT.parasolGreen : MAT.cloverGreen, 0, -0.14 * scale, 0.88 * scale, 0.04, false, false, false);
    leaf.rotation.x = 0.42;
    frondPivot.add(leaf);
    grp.add(frondPivot);
  }
  for (let c = 0; c < 3; c++) {
    const coco = new THREE.Mesh(GEO.sphere, MAT.woodDark);
    coco.scale.setScalar(0.24 * scale);
    coco.position.set(topX + Math.cos(c * 2.1) * 0.22, topY - 0.16, Math.sin(c * 2.1) * 0.22);
    grp.add(coco);
  }
  return grp;
}

function createScenicTruck3D(isCoffee = false) {
  const grp = new THREE.Group();
  const bodyMat = isCoffee ? MAT.carClearMint : makeClayMat(0xFF758F, { roughness: 0.3 });
  const roofMat = MAT.white;
  grp.add(createRoundedToyMesh(3.4, 1.95, 1.85, bodyMat, 0, 1.24, 0, 0.14));
  grp.add(createRoundedToyMesh(3.46, 0.24, 1.92, roofMat, 0, 2.28, 0, 0.08));
  grp.add(createRoundedToyMesh(1.05, 1.35, 1.76, bodyMat, 2.05, 0.96, 0, 0.12));
  grp.add(createRoundedToyMesh(0.12, 0.62, 1.52, MAT.partitionGlass, 2.56, 1.28, 0, 0.03, false, false, false));

  // 오픈 서빙 윈도우 & 어닝 + 메뉴 사인보드
  grp.add(createRoundedToyMesh(2.1, 0.92, 0.12, MAT.charcoal, -0.2, 1.48, -0.92, 0.03));
  const awning = createScallopedAwning3D(2.3, isCoffee ? 'mint' : 'coral');
  awning.rotation.y = Math.PI;
  awning.position.set(-0.2, 1.98, -0.92);
  grp.add(awning);

  const signFace = new THREE.Mesh(
    GEO.quad,
    new THREE.MeshBasicMaterial({ map: isCoffee ? TEX.coffeeTruckSign : TEX.foodTruckSign })
  );
  signFace.scale.set(2.4, 0.62, 1);
  signFace.rotation.y = Math.PI;
  signFace.position.set(-0.15, 2.66, -0.1);
  grp.add(createRoundedToyMesh(2.54, 0.72, 0.14, MAT.walnutTrim, -0.15, 2.66, -0.02, 0.05));
  grp.add(signFace);

  for (const wx of [-1.05, 1.65]) {
    for (const wz of [-0.92, 0.92]) {
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.24, 16), MAT.charcoal);
      wh.rotation.x = Math.PI / 2;
      wh.position.set(wx, 0.38, wz);
      grp.add(wh);
    }
  }
  return grp;
}

function buildOuterScenicDrivingZone3D(roadHMat, roadVMat, roadCornerMat, cwMat) {
  scenicBoostCoins.length = 0;
  scenicWaveMeshes.length = 0;

  // 1) 남측 푸른 해안가 수변 라군 & 넘실대는 흰 파도 거품 라인
  const seaMat = new THREE.MeshPhysicalMaterial({
    color: 0x0EA5E9,
    map: TEX.water,
    roughness: 0.12,
    metalness: 0.08,
    clearcoat: 0.9,
    emissive: 0x0284C7,
    emissiveIntensity: 0.22
  });
  const coastalBay = new THREE.Mesh(new THREE.CylinderGeometry(24, 24, 0.26, 48), seaMat);
  coastalBay.scale.set(1.55, 1, 0.56);
  coastalBay.position.set(2.0, -0.02, 51.5);
  islandRootGroup.add(coastalBay);

  const sandBeach = new THREE.Mesh(
    new THREE.CylinderGeometry(26.5, 27.0, 0.18, 48),
    makeClayMat(0xFDE68A, { roughness: 0.78 })
  );
  sandBeach.scale.set(1.55, 1, 0.58);
  sandBeach.position.set(2.0, -0.06, 50.8);
  islandRootGroup.add(sandBeach);

  for (let w = 0; w < 8; w++) {
    const wave = createRoundedToyMesh(3.4, 0.06, 0.42, MAT.white, -16 + w * 5.2, 0.14, 44.5 + (w % 2) * 1.4, 0.03, false, false, false);
    islandRootGroup.add(wave);
    scenicWaveMeshes.push({ mesh: wave, baseZ: wave.position.z, phase: w * 0.9 });
  }

  // 2) 삼거리 교차로 분기 도로 세그먼트 + S자 코너 + 해안 직선 코스 연결
  const addRoadSeg = (x1, z1, x2, z2, width = 5.8) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz) + 2.2;
    const seg = new THREE.Mesh(new THREE.BoxGeometry(width, 0.165, len), roadVMat);
    seg.position.set((x1 + x2) * 0.5, 0.085, (z1 + z2) * 0.5);
    seg.rotation.y = Math.atan2(dx, dz);
    seg.receiveShadow = true;
    islandRootGroup.add(seg);
  };

  addRoadSeg(18.0, 28.6, 23.5, 36.8, 5.8);
  addRoadSeg(23.5, 36.8, 22.0, 46.8, 5.8);
  addRoadSeg(22.0, 46.8, 12.2, 50.2, 5.8);
  addRoadSeg(-5.5, 50.2, -16.8, 48.2, 5.8);
  addRoadSeg(-16.8, 48.2, -23.5, 40.5, 5.8);
  addRoadSeg(-23.5, 40.5, -18.5, 28.6, 5.8);

  // 삼거리 교차로 아스팔트 패치 & 횡단보도
  for (const jx of [18.0, -18.5]) {
    const jPatch = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.168, 6.8), roadCornerMat);
    jPatch.position.set(jx, 0.085, 28.6);
    islandRootGroup.add(jPatch);
    const cw = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 5.4), cwMat);
    cw.rotation.x = -Math.PI / 2;
    cw.rotation.z = Math.PI / 2;
    cw.position.set(jx, 0.176, 31.8);
    islandRootGroup.add(cw);
  }

  // 3) 갈림길 [SCENIC DRIVE ZONE ➔] 입체 게이트 아치 & 도로 표지판
  const gateGrp = new THREE.Group();
  gateGrp.position.set(19.6, 0.2, 32.2);
  gateGrp.rotation.y = Math.atan2(5.5, 8.2);
  gateGrp.add(createRoundedToyMesh(0.42, 4.8, 0.42, MAT.bridgeSteelRed, -3.4, 2.4, 0, 0.08));
  gateGrp.add(createRoundedToyMesh(0.42, 4.8, 0.42, MAT.bridgeSteelRed, 3.4, 2.4, 0, 0.08));
  gateGrp.add(createRoundedToyMesh(7.6, 1.18, 0.36, MAT.walnutTrim, 0, 4.65, 0, 0.1));
  const gateFace = new THREE.Mesh(GEO.quad, new THREE.MeshBasicMaterial({ map: TEX.scenicArchSign }));
  gateFace.scale.set(7.1, 0.96, 1);
  gateFace.position.set(0, 4.65, 0.2);
  const gateBack = gateFace.clone();
  gateBack.rotation.y = Math.PI;
  gateBack.position.z = -0.2;
  gateGrp.add(gateFace, gateBack);
  islandRootGroup.add(gateGrp);

  // 4) 푸른 해안 위를 가로지르는 '빨간 철제 아치형 다리 (Red Steel Arch Bridge)'
  const bridgeGrp = new THREE.Group();
  bridgeGrp.position.set(3.4, 0.16, 50.2);
  const bridgeLen = 19.2;
  // 교량 상판 데크 & 석조 교각 2기
  bridgeGrp.add(createRoundedToyMesh(bridgeLen, 0.36, 6.4, roadCornerMat, 0, 0.18, 0, 0.08));
  bridgeGrp.add(createRoundedToyMesh(1.6, 1.4, 6.8, MAT.fountainStone, -7.2, -0.35, 0, 0.08));
  bridgeGrp.add(createRoundedToyMesh(1.6, 1.4, 6.8, MAT.fountainStone, 7.2, -0.35, 0, 0.08));

  // 좌·우 대형 빨간 강철 아치 트러스 + 수직 행어 케이블 + 상부 X-브레이싱
  for (const bz of [-3.05, 3.05]) {
    bridgeGrp.add(createRoundedToyMesh(bridgeLen, 0.42, 0.26, MAT.bridgeSteelRed, 0, 0.56, bz, 0.05));
    const segs = 12;
    for (let s = 0; s < segs; s++) {
      const t0 = s / segs;
      const t1 = (s + 1) / segs;
      const x0 = THREE.MathUtils.lerp(-8.8, 8.8, t0);
      const x1 = THREE.MathUtils.lerp(-8.8, 8.8, t1);
      const y0 = 0.6 + Math.sin(t0 * Math.PI) * 5.2;
      const y1 = 0.6 + Math.sin(t1 * Math.PI) * 5.2;
      const cx = (x0 + x1) * 0.5;
      const cy = (y0 + y1) * 0.5;
      const slen = Math.hypot(x1 - x0, y1 - y0) + 0.18;
      const rib = createRoundedToyMesh(slen, 0.34, 0.32, MAT.bridgeSteelRed, cx, cy, bz, 0.05, false, false, false);
      rib.rotation.z = Math.atan2(y1 - y0, x1 - x0);
      bridgeGrp.add(rib);

      if (s > 0 && s < segs) {
        const cableH = y0 - 0.55;
        const cable = new THREE.Mesh(GEO.cyl, MAT.silver);
        cable.scale.set(0.08, cableH, 0.08);
        cable.position.set(x0, 0.55 + cableH * 0.5, bz);
        bridgeGrp.add(cable);
      }
    }
  }
  for (const bx of [-4.4, 0, 4.4]) {
    const hY = 0.6 + Math.sin(((bx + 8.8) / 17.6) * Math.PI) * 5.2;
    bridgeGrp.add(createRoundedToyMesh(0.32, 0.26, 6.2, MAT.bridgeSteelRed, bx, hY - 0.1, 0, 0.04));
    const lampOrb = new THREE.Mesh(GEO.sphere, MAT.neonYellow);
    lampOrb.scale.setScalar(0.38);
    lampOrb.position.set(bx, hY - 0.35, 0);
    bridgeGrp.add(lampOrb);
  }
  islandRootGroup.add(bridgeGrp);

  // 5) 전망대 휴게소 데크 & 벤치 & 푸드트럭/커피트럭 배치
  const restDeck = createRoundedToyMesh(13.5, 0.24, 5.4, makeClayMat(0xFFFFFF, { map: TEX.floor2, roughness: 0.6 }), -16.8, 0.14, 53.2, 0.1);
  islandRootGroup.add(restDeck);
  const foodTruck = createScenicTruck3D(false);
  foodTruck.position.set(-14.2, 0.26, 53.8);
  islandRootGroup.add(foodTruck);
  const coffeeTruck = createScenicTruck3D(true);
  coffeeTruck.position.set(-19.4, 0.26, 53.6);
  coffeeTruck.rotation.y = 0.18;
  islandRootGroup.add(coffeeTruck);

  const ovBench = createParkBench3D(Math.PI);
  ovBench.position.set(-16.8, 0.26, 51.2);
  islandRootGroup.add(ovBench);

  // 6) 해안 야자수 & 벚꽃 가로수길 식재
  const palmSpots = [
    [27.2, 34.5, 1.05], [27.8, 41.5, 1.12], [26.2, 48.2, 1.0],
    [15.8, 53.8, 0.98], [-9.2, 53.8, 1.04], [-22.8, 52.0, 1.08]
  ];
  for (const [px, pz, sc] of palmSpots) {
    const pm = createPalmTree3D(sc);
    pm.position.set(px, 0.16, pz);
    islandRootGroup.add(pm);
  }
  const sakuraSpots = [
    [-27.5, 44.5, 1.08], [-26.8, 37.8, 1.02], [-24.5, 32.8, 0.96], [14.2, 36.2, 0.95]
  ];
  for (const [sx, sz, sc] of sakuraSpots) {
    const sk = createBoulevardTree3D(sc, true);
    sk.position.set(sx, 0.16, sz);
    islandRootGroup.add(sk);
  }

  // 7) 도로 위 황금 부스트 코인 라인 12개 배치 + 해안 다리/전망대 구경꾼 NPC (1인칭 드라이브 시 생생한 말풍선 출력!)
  const coinSpots = [
    [20.8, 33.0], [23.2, 38.5], [22.6, 44.2], [16.8, 48.8],
    [10.2, 50.2], [5.6, 50.2], [1.0, 50.2], [-3.6, 50.2],
    [-11.2, 49.2], [-16.8, 48.2], [-22.2, 43.2], [-20.8, 35.0]
  ];
  for (const [cx, cz] of coinSpots) {
    const cMesh = new THREE.Mesh(GEO.coin, MAT.pureGold24k);
    cMesh.scale.setScalar(1.45);
    cMesh.position.set(cx, 0.88, cz);
    islandRootGroup.add(cMesh);
    scenicBoostCoins.push({ mesh: cMesh, x: cx, z: cz, cooldown: 0 });
  }

  const sightseerSpots = [
    { x: 9.2, z: 47.4, role: 'streamer', quote: '우와!! 빨간 아치 대교 위를 달리는 갓물주님 슈퍼카 대박 멋져요!!' },
    { x: -1.8, z: 47.4, role: 'newlywed', quote: '바다 바람 맞으며 드라이브하시는 모습 완전 영화 같아요~!!' },
    { x: -14.2, z: 51.6, role: 'barista', quote: '오션뷰 커피트럭 앞까지 행차하셨네요!! 안전 운전하세요!!' },
    { x: -19.2, z: 51.4, role: 'musician', quote: '해안 도로 배기음 소리 예술이다~ 갓물주님 최고!!' }
  ];
  sightseerSpots.forEach((sp, idx) => {
    const npc = createChibiPerson3D(sp.role, idx + 3);
    npc.position.set(sp.x, 0.26, sp.z);
    npc.lookAt(sp.x, 0.26, 50.2);
    islandRootGroup.add(npc);
    streetInteractiveProps.push({ kind: 'scenicSightseer', id: `scenic_${idx}`, mesh: npc, x: sp.x, z: sp.z, quote: sp.quote });
  });
}

// =========================================================
// 5C. [제2마을 확장] 트와일라잇 하버 리조트 타운 (유럽풍 박공지붕·도머창·호박색 창문·스트링 라이트·3D 요트 선착장)
// =========================================================
function createAmberLatticeWindow3D(w = 1.9, h = 2.2) {
  const grp = new THREE.Group();
  const trim = MAT.dollhouseWarmTrim || MAT.walnutTrim;
  const cutaway = MAT.dollhouseCutaway || MAT.cream;
  const glow = MAT.amberWindowGlow || MAT.pendantBulbWarm;

  grp.add(createRoundedToyMesh(w + 0.24, h + 0.24, 0.16, trim, 0, 0, 0, 0.04));
  grp.add(createRoundedToyMesh(w, h, 0.18, glow, 0, 0, 0.02, 0.02, false, false, false));
  // 유럽풍 십자 + 격자 창살
  grp.add(createRoundedToyMesh(0.09, h + 0.04, 0.22, cutaway, 0, 0, 0.04, 0.02));
  grp.add(createRoundedToyMesh(w + 0.04, 0.09, 0.22, cutaway, 0, h * 0.14, 0.04, 0.02));
  grp.add(createRoundedToyMesh(w + 0.04, 0.08, 0.22, cutaway, 0, -h * 0.22, 0.04, 0.02));
  grp.add(createRoundedToyMesh(w + 0.42, 0.16, 0.34, trim, 0, -h * 0.5 - 0.1, 0.08, 0.04));
  return grp;
}

function createEuropeanGableRoofWithDormers3D(width, depth, roofMat, dormerCount = 2) {
  const grp = new THREE.Group();
  const ridgeH = Math.min(3.4, Math.max(2.1, depth * 0.36));
  const halfD = depth * 0.5 + 0.48;
  const slopeLen = Math.hypot(halfD, ridgeH) + 0.28;
  const slopeAng = Math.atan2(ridgeH, halfD);
  const cutawayMat = MAT.dollhouseCutaway || MAT.cream;
  const trimMat = MAT.dollhouseWarmTrim || MAT.walnutTrim;

  // 앞·뒤 경사 박공 지붕면
  const frontSlope = createRoundedToyMesh(width + 0.85, 0.26, slopeLen, roofMat, 0, ridgeH * 0.5, halfD * 0.5, 0.07);
  frontSlope.rotation.x = slopeAng;
  const backSlope = createRoundedToyMesh(width + 0.85, 0.26, slopeLen, roofMat, 0, ridgeH * 0.5, -halfD * 0.5, 0.07);
  backSlope.rotation.x = -slopeAng;
  const ridgeBeam = createRoundedToyMesh(width + 1.0, 0.32, 0.42, trimMat, 0, ridgeH + 0.06, 0, 0.08);
  grp.add(frontSlope, backSlope, ridgeBeam);

  // 좌·우 박공 삼각 벽체 스텝 마감
  for (const sideX of [-width * 0.5 + 0.08, width * 0.5 - 0.08]) {
    grp.add(createRoundedToyMesh(0.32, ridgeH * 0.46, depth * 0.68, cutawayMat, sideX, ridgeH * 0.25, 0, 0.05));
    grp.add(createRoundedToyMesh(0.32, ridgeH * 0.38, depth * 0.36, cutawayMat, sideX, ridgeH * 0.64, 0, 0.05));
  }

  // 다락방 도머 창문 (Attic Dormer Windows + 호박색 불빛)
  if (dormerCount > 0) {
    const stepX = width / (dormerCount + 1);
    for (let i = 1; i <= dormerCount; i++) {
      const dx = -width * 0.5 + stepX * i;
      const dormer = new THREE.Group();
      dormer.position.set(dx, ridgeH * 0.46, halfD * 0.48);
      dormer.add(createRoundedToyMesh(1.85, 1.48, 1.55, cutawayMat, 0, 0, 0, 0.06));
      const dRoofL = createRoundedToyMesh(1.18, 0.18, 1.72, roofMat, -0.45, 0.92, 0.04, 0.04);
      dRoofL.rotation.z = 0.48;
      const dRoofR = createRoundedToyMesh(1.18, 0.18, 1.72, roofMat, 0.45, 0.92, 0.04, 0.04);
      dRoofR.rotation.z = -0.48;
      const dWin = createAmberLatticeWindow3D(1.12, 1.02);
      dWin.position.set(0, -0.02, 0.78);
      dormer.add(dRoofL, dRoofR, dWin);
      grp.add(dormer);
    }
  }
  return grp;
}

function createHarborStringLightsSpan3D(x1, y1, z1, x2, y2, z2, bulbCount = 9, sag = 0.65) {
  const grp = new THREE.Group();
  const wireMat = MAT.julietIron || MAT.castIron;
  const bulbMat = MAT.stringBulbAmber || MAT.neonYellow;

  for (let i = 0; i < bulbCount; i++) {
    const t0 = i / bulbCount;
    const t1 = (i + 1) / bulbCount;
    const tm = (t0 + t1) * 0.5;
    const p0x = THREE.MathUtils.lerp(x1, x2, t0);
    const p0z = THREE.MathUtils.lerp(z1, z2, t0);
    const p0y = THREE.MathUtils.lerp(y1, y2, t0) - Math.sin(t0 * Math.PI) * sag;
    const p1x = THREE.MathUtils.lerp(x1, x2, t1);
    const p1z = THREE.MathUtils.lerp(z1, z2, t1);
    const p1y = THREE.MathUtils.lerp(y1, y2, t1) - Math.sin(t1 * Math.PI) * sag;

    const segLen = Math.hypot(p1x - p0x, p1y - p0y, p1z - p0z);
    const wire = new THREE.Mesh(GEO.cyl, wireMat);
    wire.scale.set(0.035, segLen, 0.035);
    wire.position.set((p0x + p1x) * 0.5, (p0y + p1y) * 0.5, (p0z + p1z) * 0.5);
    wire.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(p1x - p0x, p1y - p0y, p1z - p0z).normalize()
    );
    grp.add(wire);

    const bx = THREE.MathUtils.lerp(x1, x2, tm);
    const bz = THREE.MathUtils.lerp(z1, z2, tm);
    const by = THREE.MathUtils.lerp(y1, y2, tm) - Math.sin(tm * Math.PI) * sag - 0.14;
    const bulb = new THREE.Mesh(GEO.sphere, bulbMat);
    bulb.scale.set(0.2, 0.24, 0.2);
    bulb.position.set(bx, by, bz);
    grp.add(bulb);
  }
  return grp;
}

function createLuxuryYacht3D(isGoldenVip = false) {
  const grp = new THREE.Group();
  const hullMat = isGoldenVip ? MAT.pureGold24k : (MAT.yachtHullWhite || MAT.white);
  const stripeMat = isGoldenVip ? MAT.supercarRed : MAT.roofRoyalNavy;
  const teakMat = MAT.yachtTeakDeck || MAT.woodWarm;
  const glassMat = makeClayMat(0x1E293B, { roughness: 0.15, metalness: 0.5, emissive: 0x38BDF8, emissiveIntensity: 0.22 });
  const glowMat = MAT.amberWindowGlow || MAT.neonYellow;

  // 유선형 선체(Hull) & 선수(Bow) + 티크 원목 애프터 데크
  grp.add(createRoundedToyMesh(3.2, 1.15, 7.6, hullMat, 0, 0.62, -0.2, 0.28));
  const bowCone = new THREE.Mesh(new THREE.ConeGeometry(1.62, 2.8, 18), hullMat);
  bowCone.rotation.x = Math.PI * 0.5;
  bowCone.scale.set(1.0, 1.0, 0.68);
  bowCone.position.set(0, 0.72, 4.65);
  grp.add(bowCone);

  grp.add(createRoundedToyMesh(3.28, 0.16, 7.7, stripeMat, 0, 0.92, -0.15, 0.04));
  grp.add(createRoundedToyMesh(2.85, 0.12, 7.2, teakMat, 0, 1.22, -0.1, 0.05));

  // 1층 메인 살롱 캐빈 & 호박빛 선실 포트홀 창문
  grp.add(createRoundedToyMesh(2.35, 1.05, 4.2, hullMat, 0, 1.76, -0.35, 0.18));
  const windshield = createRoundedToyMesh(2.22, 0.72, 0.95, glassMat, 0, 1.82, 1.55, 0.08);
  windshield.rotation.x = -0.38;
  grp.add(windshield);
  for (const sideX of [-1.2, 1.2]) {
    for (const pz of [-1.4, -0.3, 0.8]) {
      const porthole = new THREE.Mesh(GEO.sphere, glowMat);
      porthole.scale.set(0.08, 0.26, 0.44);
      porthole.position.set(sideX, 1.78, pz);
      grp.add(porthole);
    }
  }

  // 2층 플라이브릿지 선데크 & 레이더 아치 마스트 + 후미 선베드 라운지
  grp.add(createRoundedToyMesh(1.95, 0.22, 2.8, hullMat, 0, 2.38, -0.55, 0.08));
  grp.add(createRoundedToyMesh(1.82, 0.68, 0.28, hullMat, 0, 2.78, -1.55, 0.06));
  grp.add(createRoundedToyMesh(2.1, 0.14, 0.52, stripeMat, 0, 3.16, -1.55, 0.04));
  const beacon = new THREE.Mesh(GEO.sphere, glowMat);
  beacon.scale.setScalar(0.22);
  beacon.position.set(0, 3.36, -1.55);
  grp.add(beacon);

  // 선수 일광욕 쿠션 & 후미 티크 스윔 플랫폼
  grp.add(createRoundedToyMesh(1.55, 0.18, 1.85, MAT.cream, 0, 1.34, 2.55, 0.06));
  grp.add(createRoundedToyMesh(2.75, 0.18, 1.15, teakMat, 0, 0.36, -4.35, 0.06));
  return grp;
}

function create3DLobsterPlatterMesh() {
  const grp = new THREE.Group();
  const plate = new THREE.Mesh(GEO.cyl, MAT.white);
  plate.scale.set(1.15, 0.08, 0.82);
  plate.position.y = 0.04;
  const lobsterMat = MAT.lobsterCoral || MAT.coral;
  const body = new THREE.Mesh(GEO.sphere, lobsterMat);
  body.scale.set(0.28, 0.18, 0.56);
  body.position.set(0, 0.16, 0.04);
  const tail = new THREE.Mesh(GEO.sphere, lobsterMat);
  tail.scale.set(0.24, 0.1, 0.28);
  tail.position.set(0, 0.13, -0.32);
  const clawL = new THREE.Mesh(GEO.sphere, lobsterMat);
  clawL.scale.set(0.18, 0.12, 0.28);
  clawL.position.set(-0.24, 0.15, 0.32);
  const clawR = clawL.clone();
  clawR.position.x = 0.24;
  const lemon = new THREE.Mesh(GEO.sphere, MAT.duckYellow);
  lemon.scale.set(0.14, 0.1, 0.14);
  lemon.position.set(0.32, 0.13, -0.14);
  grp.add(plate, body, tail, clawL, clawR, lemon);
  return grp;
}

function create3DTomahawkSteakMesh() {
  const grp = new THREE.Group();
  const board = createRoundedToyMesh(1.08, 0.08, 0.72, MAT.woodWarm, 0, 0.04, 0, 0.03);
  const meat = createRoundedToyMesh(0.58, 0.16, 0.44, MAT.steakSeared || MAT.woodDark, -0.1, 0.14, 0, 0.06);
  const bone = createRoundedToyMesh(0.52, 0.06, 0.08, MAT.cream, 0.34, 0.13, 0.08, 0.02);
  bone.rotation.y = 0.22;
  const herb = createRoundedToyMesh(0.34, 0.05, 0.08, MAT.leafGreen, -0.1, 0.23, 0, 0.02);
  grp.add(board, meat, bone, herb);
  return grp;
}

function create3DChampagneBucketMesh() {
  const grp = new THREE.Group();
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.38, 16), MAT.pureGold24k || MAT.gold);
  bucket.position.y = 0.19;
  const bottle = new THREE.Mesh(GEO.cyl, MAT.parasolGreen);
  bottle.scale.set(0.14, 0.52, 0.14);
  bottle.position.set(0, 0.38, 0);
  bottle.rotation.z = 0.16;
  const foil = new THREE.Mesh(GEO.cyl, MAT.pureGold24k || MAT.gold);
  foil.scale.set(0.145, 0.16, 0.145);
  foil.position.set(-0.03, 0.56, 0);
  foil.rotation.z = 0.16;
  grp.add(bucket, bottle, foil);
  return grp;
}

function create3DGrandPianoMesh() {
  const grp = new THREE.Group();
  const blackGloss = makeClayMat(0x18181B, { roughness: 0.16, metalness: 0.32 });
  const goldMat = MAT.pureGold24k || MAT.gold;

  // 그랜드 피아노 곡선 바디 & 건반부
  grp.add(createRoundedToyMesh(1.95, 0.28, 1.55, blackGloss, 0, 0.92, -0.15, 0.1));
  const curveBack = new THREE.Mesh(GEO.cyl, blackGloss);
  curveBack.scale.set(1.75, 0.28, 1.45);
  curveBack.position.set(-0.08, 0.92, -0.58);
  grp.add(curveBack);
  // 황금 내부 하프 프레임 & 비스듬히 열린 상판 리드
  const harp = new THREE.Mesh(GEO.cyl, goldMat);
  harp.scale.set(1.48, 0.05, 1.25);
  harp.position.set(-0.05, 1.08, -0.45);
  const lid = createRoundedToyMesh(1.88, 0.06, 1.52, blackGloss, 0.12, 1.48, -0.28, 0.04);
  lid.rotation.z = 0.42;
  const propStick = new THREE.Mesh(GEO.cyl, goldMat);
  propStick.scale.set(0.04, 0.72, 0.04);
  propStick.position.set(0.76, 1.32, -0.15);
  propStick.rotation.z = -0.18;
  // 피아노 흰 건반 + 3개 다리 + 벨벳 벤치
  grp.add(harp, lid, propStick);
  grp.add(createRoundedToyMesh(1.62, 0.09, 0.28, MAT.white, 0, 0.88, 0.68, 0.02));
  for (const [lx, lz] of [[-0.78, 0.48], [0.78, 0.48], [-0.1, -1.05]]) {
    const leg = new THREE.Mesh(GEO.cyl, blackGloss);
    leg.scale.set(0.12, 0.78, 0.12);
    leg.position.set(lx, 0.4, lz);
    grp.add(leg);
  }
  grp.add(createRoundedToyMesh(1.12, 0.44, 0.46, MAT.supercarRed, 0, 0.24, 1.18, 0.06));
  return grp;
}

function create3DOceanJacuzziMesh() {
  const grp = new THREE.Group();
  const teakMat = MAT.yachtTeakDeck || MAT.woodWarm;
  const waterMat = makeClayMat(0x38BDF8, { emissive: 0x0EA5E9, emissiveIntensity: 0.62, roughness: 0.12 });

  // 티크 원목 스파 데크 + 월풀 자쿠지 수조 + 거품 + 리조트 선베드
  grp.add(createRoundedToyMesh(3.25, 0.24, 2.55, teakMat, 0, 0.12, 0, 0.08));
  grp.add(createRoundedToyMesh(2.55, 0.68, 1.95, MAT.white, -0.2, 0.52, 0, 0.14));
  grp.add(createRoundedToyMesh(2.15, 0.12, 1.55, waterMat, -0.2, 0.82, 0, 0.08));
  for (let b = 0; b < 7; b++) {
    const foam = new THREE.Mesh(GEO.sphere, MAT.white);
    foam.scale.setScalar(0.16 + (b % 3) * 0.05);
    foam.position.set(-0.85 + b * 0.22, 0.89, (b % 2 === 0 ? -0.35 : 0.32));
    grp.add(foam);
  }
  const champ = create3DChampagneBucketMesh();
  champ.scale.setScalar(0.85);
  champ.position.set(1.22, 0.24, 0.55);
  grp.add(champ);
  return grp;
}

function create3DWineCellarAndChandelierMesh(rh = 4.2, rd = 7.2) {
  const grp = new THREE.Group();
  const rackX = -2.2;
  const rackZ = -rd * 0.5 + 0.48;
  // 호박색 간접조명 오크 와인 셀러 월
  grp.add(createRoundedToyMesh(2.85, 2.65, 0.52, MAT.walnutTrim, rackX, 1.48, rackZ, 0.06));
  grp.add(createRoundedToyMesh(2.55, 2.35, 0.14, MAT.amberWindowGlow || MAT.gold, rackX, 1.48, rackZ - 0.12, 0.03, false, false, false));
  for (const sy of [0.68, 1.22, 1.76, 2.28]) {
    grp.add(createRoundedToyMesh(2.6, 0.07, 0.48, MAT.woodWarm, rackX, sy, rackZ + 0.04, 0.02));
    for (let bx = -1.0; bx <= 1.0; bx += 0.4) {
      const btl = new THREE.Mesh(GEO.cyl, bx > 0 ? MAT.parasolGreen : MAT.roofPlum);
      btl.scale.set(0.11, 0.36, 0.11);
      btl.rotation.x = Math.PI * 0.5;
      btl.position.set(rackX + bx, sy + 0.12, rackZ + 0.08);
      grp.add(btl);
    }
  }

  // 천장 크리스탈 골드 샹들리에
  const chY = rh - 0.88;
  const chain = new THREE.Mesh(GEO.cyl, MAT.pureGold24k || MAT.gold);
  chain.scale.set(0.06, 0.65, 0.06);
  chain.position.set(0, rh - 0.42, 0.2);
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.06, 10, 24), MAT.pureGold24k || MAT.gold);
  ring1.rotation.x = Math.PI * 0.5;
  ring1.position.set(0, chY, 0.2);
  grp.add(chain, ring1);
  for (let c = 0; c < 8; c++) {
    const ang = (c / 8) * Math.PI * 2;
    const candle = new THREE.Mesh(GEO.sphere, MAT.stringBulbAmber || MAT.neonYellow);
    candle.scale.set(0.16, 0.24, 0.16);
    candle.position.set(Math.cos(ang) * 0.68, chY + 0.14, 0.2 + Math.sin(ang) * 0.68);
    grp.add(candle);
  }
  return grp;
}

function buildTwilightHarborTown3D() {
  harborRootGroup = new THREE.Group();
  scene.add(harborRootGroup);
  harborYachtActors.length = 0;
  harborWalkerActors.length = 0;
  harborPointLights.length = 0;

  const cobbleMat = makeClayMat(0xFFFFFF, { map: TEX.plazaCobble, roughness: 0.66 });
  const quayStoneMat = MAT.dollhouseCutaway || MAT.fountainStone;
  const trimStoneMat = MAT.dollhouseWarmTrim || MAT.podiumStone;
  const roadVMat = makeClayMat(0xFFFFFF, { map: TEX.asphaltV, roughness: 0.74 });
  const roadHMat = makeClayMat(0xFFFFFF, { map: TEX.asphaltH, roughness: 0.74 });
  const teakMat = MAT.yachtTeakDeck || MAT.woodWarm;

  // 1) 제1마을 해안 도로(z=50.2)와 제2마을 하버(z=88)를 잇는 초대형 '해안 연결 빨간 철제 아치 대교'
  const straitSea = new THREE.Mesh(
    new THREE.PlaneGeometry(156, 132),
    new THREE.MeshPhysicalMaterial({
      color: 0x0B4F6C,
      map: TEX.water,
      roughness: 0.14,
      metalness: 0.18,
      clearcoat: 0.92,
      emissive: 0x1E3A8A,
      emissiveIntensity: 0.25
    })
  );
  straitSea.rotation.x = -Math.PI * 0.5;
  straitSea.position.set(0, -0.08, 114.0);
  harborRootGroup.add(straitSea);

  const causewayBridge = new THREE.Group();
  causewayBridge.position.set(2.0, 0.18, 70.5);
  const spanLen = 36.5;
  causewayBridge.add(createRoundedToyMesh(6.6, 0.38, spanLen, roadVMat, 0, 0.16, 0, 0.08));
  for (const pz of [-11.5, 0, 11.5]) {
    causewayBridge.add(createRoundedToyMesh(7.2, 2.2, 1.8, MAT.fountainStone, 0, -0.9, pz, 0.1));
  }
  for (const bx of [-3.15, 3.15]) {
    causewayBridge.add(createRoundedToyMesh(0.32, 0.45, spanLen, MAT.bridgeSteelRed, bx, 0.56, 0, 0.05));
    const segs = 14;
    for (let s = 0; s < segs; s++) {
      const t0 = s / segs;
      const t1 = (s + 1) / segs;
      const z0 = THREE.MathUtils.lerp(-16.5, 16.5, t0);
      const z1 = THREE.MathUtils.lerp(-16.5, 16.5, t1);
      const y0 = 0.65 + Math.sin(t0 * Math.PI) * 6.6;
      const y1 = 0.65 + Math.sin(t1 * Math.PI) * 6.6;
      const ribLen = Math.hypot(z1 - z0, y1 - y0) + 0.2;
      const rib = createRoundedToyMesh(0.36, 0.36, ribLen, MAT.bridgeSteelRed, bx, (y0 + y1) * 0.5, (z0 + z1) * 0.5, 0.05, false, false, false);
      rib.rotation.x = -Math.atan2(y1 - y0, z1 - z0);
      causewayBridge.add(rib);
      if (s > 0 && s < segs) {
        const cabH = y0 - 0.55;
        const cab = new THREE.Mesh(GEO.cyl, MAT.silver);
        cab.scale.set(0.08, cabH, 0.08);
        cab.position.set(bx, 0.55 + cabH * 0.5, z0);
        causewayBridge.add(cab);
      }
    }
  }
  for (const bz of [-8.0, 0, 8.0]) {
    const hY = 0.65 + Math.sin(((bz + 16.5) / 33.0) * Math.PI) * 6.6;
    causewayBridge.add(createRoundedToyMesh(6.5, 0.28, 0.34, MAT.bridgeSteelRed, 0, hY - 0.1, bz, 0.04));
    const orb = new THREE.Mesh(GEO.sphere, MAT.stringBulbAmber || MAT.neonYellow);
    orb.scale.setScalar(0.42);
    orb.position.set(0, hY - 0.38, bz);
    causewayBridge.add(orb);
  }

  // 3일 차 해금 전 차단기 & 해금 후 상향 개방 게이트
  harborBridgeGateL = new THREE.Group();
  harborBridgeGateL.position.set(-2.9, 1.05, -15.5);
  harborBridgeGateL.add(createRoundedToyMesh(2.85, 0.18, 0.18, MAT.pureGold24k || MAT.gold, 1.42, 0, 0, 0.04));
  harborBridgeGateR = new THREE.Group();
  harborBridgeGateR.position.set(2.9, 1.05, -15.5);
  harborBridgeGateR.add(createRoundedToyMesh(2.85, 0.18, 0.18, MAT.pureGold24k || MAT.gold, -1.42, 0, 0, 0.04));
  causewayBridge.add(harborBridgeGateL, harborBridgeGateR);
  harborRootGroup.add(causewayBridge);

  // 2) 트와일라잇 하버 석조 해안 방파제 지반 & 코블스톤 해안 광장 (z = 88 .. 140)
  harborRootGroup.add(createRoundedToyMesh(76.0, 2.4, 52.0, trimStoneMat, 0, -1.05, 114.0, 0.22));
  const harborDeck = createRoundedToyMesh(73.5, 0.26, 49.5, cobbleMat, 0, 0.13, 114.0, 0.14, false, true, false);
  harborRootGroup.add(harborDeck);

  // 해안 순환 도로
  const hRoad = new THREE.Mesh(new THREE.BoxGeometry(64.0, 0.17, 5.6), roadHMat);
  hRoad.position.set(0, 0.19, 112.5);
  harborRootGroup.add(hRoad);
  const hEntryRoad = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.17, 22.0), roadVMat);
  hEntryRoad.position.set(2.0, 0.19, 99.0);
  harborRootGroup.add(hEntryRoad);

  // 중앙 황금 닻(Golden Anchor) 노을 분수 광장 (x = 0, z = 121.5)
  const hPlaza = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 6.8, 0.1, 42), quayStoneMat);
  hPlaza.position.set(0, 0.28, 121.5);
  harborRootGroup.add(hPlaza);
  const fPool = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.65, 0.56, 32), trimStoneMat);
  fPool.position.set(0, 0.56, 121.5);
  const fWater = new THREE.Mesh(
    new THREE.CylinderGeometry(2.25, 2.25, 0.12, 32),
    makeClayMat(0x38BDF8, { emissive: 0xF59E0B, emissiveIntensity: 0.38, roughness: 0.12 })
  );
  fWater.position.set(0, 0.82, 121.5);
  const anchorPillar = new THREE.Mesh(GEO.cyl, MAT.pureGold24k || MAT.gold);
  anchorPillar.scale.set(0.45, 2.1, 0.45);
  anchorPillar.position.set(0, 1.65, 121.5);
  const anchorRing = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.14, 12, 24), MAT.pureGold24k || MAT.gold);
  anchorRing.position.set(0, 2.35, 121.5);
  harborRootGroup.add(fPool, fWater, anchorPillar, anchorRing);

  // 3) 바다 위 티크 원목 요트 선착장(Marina Pier) & 정박 중인 3D 럭셔리 요트 선단!
  const mainPier = createRoundedToyMesh(38.0, 0.34, 4.2, teakMat, 0, 0.28, 142.0, 0.08);
  harborRootGroup.add(mainPier);
  for (const slipX of [-14.0, 0.0, 14.0]) {
    harborRootGroup.add(createRoundedToyMesh(2.8, 0.32, 11.5, teakMat, slipX, 0.26, 149.2, 0.06));
    for (const postZ of [144.5, 149.5, 154.2]) {
      const bollard = new THREE.Mesh(GEO.cyl, MAT.woodDark);
      bollard.scale.set(0.32, 1.15, 0.32);
      bollard.position.set(slipX - 1.25, 0.58, postZ);
      const bollardLamp = new THREE.Mesh(GEO.sphere, MAT.stringBulbAmber || MAT.neonYellow);
      bollardLamp.scale.setScalar(0.22);
      bollardLamp.position.set(slipX - 1.25, 1.22, postZ);
      harborRootGroup.add(bollard, bollardLamp);
    }
  }

  const yachtPlacements = [
    { x: -18.8, z: 150.5, rotY: 0.08, phase: 0.0 },
    { x: -6.2,  z: 151.2, rotY: -0.05, phase: 1.7 },
    { x: 18.8,  z: 150.2, rotY: -0.1, phase: 3.1 }
  ];
  for (const yp of yachtPlacements) {
    const yacht = createLuxuryYacht3D(false);
    yacht.position.set(yp.x, 0.08, yp.z);
    yacht.rotation.y = yp.rotY;
    harborRootGroup.add(yacht);
    harborYachtActors.push({ mesh: yacht, baseY: 0.08, baseRotY: yp.rotY, phase: yp.phase });
  }

  // 마리나 클럽 프라이빗 슈퍼요트 업그레이드 시 추가 정박되는 24K 골드 VIP 메가요트
  harborVipMegaYacht = createLuxuryYacht3D(true);
  harborVipMegaYacht.scale.setScalar(1.22);
  harborVipMegaYacht.position.set(6.8, 0.1, 152.0);
  harborVipMegaYacht.visible = !!state.standaloneShops?.shop_marina?.upgrades?.upg_crate;
  harborRootGroup.add(harborVipMegaYacht);
  harborYachtActors.push({ mesh: harborVipMegaYacht, baseY: 0.1, baseRotY: 0.04, phase: 2.4 });

  // 4) 항구 알전구 스트링 라이트(Harbor Festoon String Lights) & 주철 가로등 & 야자수
  const poleSpots = [
    [-26, 115], [-10, 115], [10, 115], [26, 115],
    [-26, 128], [-10, 128], [10, 128], [26, 128],
    [-16, 140.5], [0, 140.5], [16, 140.5]
  ];
  for (const [px, pz] of poleSpots) {
    const pole = new THREE.Mesh(GEO.cyl, MAT.julietIron || MAT.castIron);
    pole.scale.set(0.18, 4.6, 0.18);
    pole.position.set(px, 2.45, pz);
    const lantern = new THREE.Mesh(GEO.sphere, MAT.stringBulbAmber || MAT.neonYellow);
    lantern.scale.setScalar(0.34);
    lantern.position.set(px, 4.82, pz);
    harborRootGroup.add(pole, lantern);
  }

  const stringSpans = [
    [-26, 4.75, 115, -10, 4.75, 115],
    [-10, 4.75, 115, 10, 4.75, 115],
    [10, 4.75, 115, 26, 4.75, 115],
    [-26, 4.75, 128, -10, 4.75, 128],
    [-10, 4.75, 128, 10, 4.75, 128],
    [10, 4.75, 128, 26, 4.75, 128],
    [-16, 4.75, 140.5, 0, 4.75, 140.5],
    [0, 4.75, 140.5, 16, 4.75, 140.5],
    [-10, 4.75, 115, -10, 4.75, 128],
    [10, 4.75, 115, 10, 4.75, 128]
  ];
  for (const [x1, y1, z1, x2, y2, z2] of stringSpans) {
    harborRootGroup.add(createHarborStringLightsSpan3D(x1, y1, z1, x2, y2, z2, 10, 0.68));
  }

  // 트와일라잇 하버 따뜻한 호박빛 포인트 라이트 2기
  const hLightL = new THREE.PointLight(0xFFA94D, 1.8, 42);
  hLightL.position.set(-14, 7.5, 120);
  const hLightR = new THREE.PointLight(0xFFB703, 1.8, 42);
  hLightR.position.set(14, 7.5, 126);
  harborRootGroup.add(hLightL, hLightR);
  harborPointLights.push(hLightL, hLightR);

  for (const [tx, tz] of [[-31, 104], [31, 104], [-32, 124], [32, 124], [-24, 138], [24, 138]]) {
    const pm = createPalmTree3D(1.08);
    pm.position.set(tx, 0.24, tz);
    harborRootGroup.add(pm);
  }

  // 5) 하버 프롬나드를 산책하고 요트를 감상하는 VIP 주민(글로벌 영화배우·월스트리트 펀드매니저·크루즈 선장) 액터 배치
  const vipRoles = ['movie_star', 'fund_manager', 'cruise_captain', 'streamer', 'newlywed'];
  for (let i = 0; i < 5; i++) {
    const vip = createChibiPerson3D(vipRoles[i], null, i + 7);
    const startX = -18 + i * 9;
    const startZ = i % 2 === 0 ? 117.5 : 139.5;
    vip.position.set(startX, 0.28, startZ);
    vip.userData.auraTimer = 5.0;
    vip.userData.auraHex = i % 2 === 0 ? 0xFBBF24 : 0x34D399;
    harborRootGroup.add(vip);
    harborWalkerActors.push({
      mesh: vip,
      centerX: startX,
      baseZ: startZ,
      range: 5.5 + (i % 3) * 1.8,
      speed: 1.15 + i * 0.16,
      phase: i * 1.4
    });
  }

  syncHarborBridgeGate3D();
}

function syncHarborBridgeGate3D() {
  const open = !!state.harborUnlocked;
  if (harborBridgeGateL) harborBridgeGateL.rotation.z = open ? 1.32 : 0;
  if (harborBridgeGateR) harborBridgeGateR.rotation.z = open ? -1.32 : 0;
  if (harborVipMegaYacht) {
    harborVipMegaYacht.visible = !!state.standaloneShops?.shop_marina?.upgrades?.upg_crate;
  }
}

// =========================================================
// 6. 팝마트 · 동물의 숲 아트토이 2.5~3등신 치비 캐릭터 (12종 얼굴 PNG · 15종 의상 PNG · 12종 3D 헤어)
// =========================================================
let chibiVariantCounter = 0;

function addVolumetricArtToyHair3D(parent, styleName, hairMat, role) {
  // 기본 후두부 풍성한 헤어 볼륨 돔 (정면 얼굴 데칼 침범 0% & 후두부 대머리 0% 완벽 보장!)
  const backCap = new THREE.Mesh(new THREE.SphereGeometry(0.418, 22, 18, 0, Math.PI * 2, 0, Math.PI * 0.51), hairMat);
  backCap.position.set(0, 1.26, -0.045);
  backCap.rotation.x = -0.48;
  addToonHullOutline(backCap, 1.05);
  parent.add(backCap);

  // 앞머리(Bangs) 볼륨 레이어 (눈썹 위 이마 라인 y = 1.45, z = 0.275에 단정하게 배치)
  for (let b = -2; b <= 2; b++) {
    const bang = new THREE.Mesh(GEO.sphere, hairMat);
    bang.scale.set(0.185, 0.145, 0.145);
    bang.position.set(b * 0.092, 1.45 - Math.abs(b) * 0.015, 0.275 - Math.abs(b) * 0.032);
    parent.add(bang);
  }
  // 양옆 귀 옆 애교머리(Sidelocks)
  for (const sx of [-0.37, 0.37]) {
    const sideLock = new THREE.Mesh(GEO.sphere, hairMat);
    sideLock.scale.set(0.15, 0.32, 0.19);
    sideLock.position.set(sx, 1.18, 0.02);
    parent.add(sideLock);
  }

  if (styleName === 'double_buns') {
    for (const bx of [-0.32, 0.32]) {
      const bun = new THREE.Mesh(GEO.sphere, hairMat);
      bun.scale.setScalar(0.34);
      bun.position.set(bx, 1.56, -0.04);
      addToonHullOutline(bun, 1.06);
      const scrunchie = new THREE.Mesh(GEO.torus, MAT.coral);
      scrunchie.scale.setScalar(0.32);
      scrunchie.rotation.x = Math.PI * 0.35;
      scrunchie.position.set(bx * 0.85, 1.47, -0.03);
      parent.add(bun, scrunchie);
    }
  } else if (styleName === 'braided_pigtails') {
    for (const side of [-1, 1]) {
      for (let k = 0; k < 4; k++) {
        const knot = new THREE.Mesh(GEO.sphere, hairMat);
        knot.scale.setScalar(0.21 - k * 0.02);
        knot.position.set(side * (0.39 + k * 0.03), 1.16 - k * 0.13, -0.05);
        parent.add(knot);
      }
      const tie = new THREE.Mesh(GEO.sphere, MAT.duckYellow);
      tie.scale.setScalar(0.13);
      tie.position.set(side * 0.38, 1.24, 0.02);
      parent.add(tie);
    }
  } else if (styleName === 'bob_bangs') {
    const bobBack = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.45, 0.36, 20, 1, true, Math.PI * 0.35, Math.PI * 1.3), hairMat);
    bobBack.rotation.y = Math.PI;
    bobBack.position.set(0, 1.12, -0.02);
    parent.add(bobBack);
    const clip = createRoundedToyMesh(0.16, 0.06, 0.06, MAT.neonYellow, -0.26, 1.36, 0.28, 0.02);
    clip.rotation.z = 0.25;
    parent.add(clip);
  } else if (styleName === 'wavy_perm') {
    for (let a = 0; a < 7; a++) {
      const ang = Math.PI * 0.62 + (a / 6) * Math.PI * 0.76;
      const curl = new THREE.Mesh(GEO.sphere, hairMat);
      curl.scale.set(0.28, 0.42, 0.28);
      curl.position.set(Math.sin(ang) * 0.36, 1.02, Math.cos(ang) * 0.36);
      parent.add(curl);
    }
  } else if (styleName === 'high_ponytail') {
    const tie = new THREE.Mesh(GEO.torus, MAT.mint);
    tie.scale.setScalar(0.28);
    tie.position.set(0, 1.54, -0.24);
    const tail = new THREE.Mesh(GEO.sphere, hairMat);
    tail.scale.set(0.32, 0.52, 0.34);
    tail.position.set(0, 1.44, -0.42);
    tail.rotation.x = 0.45;
    parent.add(tie, tail);
  } else if (styleName === 'fluffy_curl') {
    for (let c = 0; c < 8; c++) {
      const ang = (c / 8) * Math.PI * 2;
      const puff = new THREE.Mesh(GEO.sphere, hairMat);
      puff.scale.setScalar(0.28);
      puff.position.set(Math.cos(ang) * 0.28, 1.46 + (c % 2) * 0.06, Math.sin(ang) * 0.26 - 0.03);
      parent.add(puff);
    }
  } else if (styleName === 'cat_headset') {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.045, 10, 24, Math.PI), MAT.pinkSoft);
    band.position.set(0, 1.24, 0);
    parent.add(band);
    for (const sx of [-0.42, 0.42]) {
      const cup = new THREE.Mesh(GEO.cyl, MAT.screenPink);
      cup.scale.set(0.24, 0.1, 0.24);
      cup.rotation.z = Math.PI / 2;
      cup.position.set(sx, 1.2, 0.02);
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.24, 8), MAT.pinkSoft);
      ear.position.set(sx * 0.58, 1.62, 0.02);
      ear.rotation.z = sx < 0 ? 0.25 : -0.25;
      parent.add(cup, ear);
    }
  } else {
    // parted_perm 기본 가르마 볼륨펌
    const waveL = new THREE.Mesh(GEO.sphere, hairMat);
    waveL.scale.set(0.38, 0.24, 0.34);
    waveL.position.set(-0.14, 1.48, 0.08);
    const waveR = new THREE.Mesh(GEO.sphere, hairMat);
    waveR.scale.set(0.36, 0.22, 0.34);
    waveR.position.set(0.16, 1.46, 0.06);
    parent.add(waveL, waveR);
  }

  // 직업군 전용 시그니처 모자 & 소품 (풍성한 머리카락 위에 착용!)
  if (role === 'baker') {
    const band = new THREE.Mesh(GEO.cyl, MAT.white);
    band.scale.set(0.58, 0.22, 0.58);
    band.position.y = 1.56;
    const puff = new THREE.Mesh(GEO.sphere, MAT.white);
    puff.scale.set(0.72, 0.48, 0.72);
    puff.position.y = 1.8;
    addToonHullOutline(puff, 1.05);
    parent.add(band, puff);
  } else if (role === 'barista') {
    const beret = new THREE.Mesh(GEO.sphere, MAT.walnutTrim);
    beret.scale.set(0.72, 0.25, 0.72);
    beret.position.set(0.06, 1.56, -0.02);
    beret.rotation.z = -0.15;
    parent.add(beret);
  } else if (role === 'florist') {
    const brim = new THREE.Mesh(GEO.cyl, MAT.butter);
    brim.scale.set(0.98, 0.06, 0.98);
    brim.position.y = 1.52;
    const crown = new THREE.Mesh(GEO.cyl, MAT.butter);
    crown.scale.set(0.56, 0.22, 0.56);
    crown.position.y = 1.63;
    const ribbon = new THREE.Mesh(GEO.cyl, MAT.coral);
    ribbon.scale.set(0.58, 0.06, 0.58);
    ribbon.position.y = 1.55;
    parent.add(brim, crown, ribbon);
  } else if (role === 'mart_clerk' || role === 'wash_clerk' || role === 'manager') {
    const capCol = role === 'mart_clerk' ? MAT.mint : role === 'wash_clerk' ? MAT.sky : MAT.roofRoyalNavy;
    const capDome = new THREE.Mesh(new THREE.SphereGeometry(0.36, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), capCol);
    capDome.position.set(0, 1.44, 0);
    const visor = createRoundedToyMesh(0.48, 0.05, 0.28, capCol, 0, 1.45, 0.32, 0.02);
    parent.add(capDome, visor);
  } else if (role === 'landlord_driver' || role === 'landlord' || role === 'landlord_avatar') {
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.25, 0.26, 7), MAT.pureGold24k);
    crown.position.y = 1.64;
    const shades = createRoundedToyMesh(0.54, 0.14, 0.09, MAT.carbonFiber, 0, 1.24, 0.39, 0.03);
    const bridge = createRoundedToyMesh(0.58, 0.03, 0.04, MAT.pureGold24k, 0, 1.29, 0.41, 0.01);
    parent.add(crown, shades, bridge);
  } else if (role === 'rival_kang') {
    // 블랙타워 강 회장 시그니처: 검은색 보스 중절모(24K 골드 리본) + 선글라스 + 두꺼운 3D 순금 체인 목걸이!
    const brim = new THREE.Mesh(GEO.cyl, MAT.carbonFiber);
    brim.scale.set(1.06, 0.07, 1.06);
    brim.position.y = 1.53;
    const fedoraTop = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.36, 0.28, 20), MAT.carbonFiber);
    fedoraTop.position.y = 1.68;
    const goldBand = new THREE.Mesh(GEO.cyl, MAT.pureGold24k);
    goldBand.scale.set(0.73, 0.06, 0.73);
    goldBand.position.y = 1.58;
    const shades = createRoundedToyMesh(0.58, 0.16, 0.1, MAT.carbonFiber, 0, 1.25, 0.39, 0.03);
    const goldBridge = createRoundedToyMesh(0.62, 0.035, 0.05, MAT.pureGold24k, 0, 1.31, 0.41, 0.01);
    // 가슴팍 위 두꺼운 3D 24K 금목걸이 체인 + 골드 메달리온
    const goldChain = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.048, 12, 24), MAT.pureGold24k);
    goldChain.rotation.x = Math.PI * 0.36;
    goldChain.position.set(0, 0.84, 0.14);
    const medallion = new THREE.Mesh(GEO.coin, MAT.pureGold24k);
    medallion.scale.setScalar(0.56);
    medallion.position.set(0, 0.69, 0.34);
    parent.add(brim, fedoraTop, goldBand, shades, goldBridge, goldChain, medallion);
  } else if (role === 'cruise_captain') {
    const capBase = new THREE.Mesh(GEO.cyl, MAT.white);
    capBase.scale.set(0.68, 0.2, 0.68);
    capBase.position.y = 1.58;
    const navyBand = new THREE.Mesh(GEO.cyl, MAT.roofRoyalNavy);
    navyBand.scale.set(0.66, 0.07, 0.66);
    navyBand.position.y = 1.5;
    const visor = createRoundedToyMesh(0.5, 0.05, 0.26, MAT.carbonFiber, 0, 1.46, 0.31, 0.02);
    const badge = new THREE.Mesh(GEO.sphere, MAT.pureGold24k);
    badge.scale.setScalar(0.12);
    badge.position.set(0, 1.56, 0.34);
    parent.add(capBase, navyBand, visor, badge);
  } else if (role === 'movie_star') {
    const shades = createRoundedToyMesh(0.56, 0.15, 0.09, MAT.carbonFiber, 0, 1.25, 0.39, 0.03);
    const goldBridge = createRoundedToyMesh(0.6, 0.03, 0.04, MAT.pureGold24k, 0, 1.3, 0.41, 0.01);
    parent.add(shades, goldBridge);
  }
}

function createChibiPerson3D(role = 'student', customShirtHex = null, variantOverride = null) {
  const grp = new THREE.Group();
  const vIdx = typeof variantOverride === 'number' ? variantOverride : (chibiVariantCounter++);
  const presets = window.CHARACTER_STYLE_PRESETS || [];
  const preset = presets[vIdx % Math.max(1, presets.length)] || { face: 1, outfit: 1, hair: 'bob_bangs', hairHex: 0x4A342E };

  const shadow = new THREE.Mesh(GEO.quad, MAT.shadow);
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(0.94, 0.94, 1);
  shadow.position.y = 0.02;
  grp.add(shadow);

  // 전체 타운 뷰 말풍선 대체용 부드러운 발광 파동 오라 링 (Foot Aura Glow)
  const auraMat = new THREE.MeshBasicMaterial({
    color: 0xFFD93D,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const auraRing = new THREE.Mesh(new THREE.RingGeometry(0.46, 0.68, 28), auraMat);
  auraRing.rotation.x = -Math.PI / 2;
  auraRing.position.y = 0.045;
  grp.add(auraRing);
  characterAuraRings.push({ ring: auraRing, mat: auraMat, owner: grp });

  const bodyRig = new THREE.Group();
  grp.add(bodyRig);

  // 직업군별 전용 의상/얼굴 매핑
  let outfitNum = preset.outfit;
  let faceNum = preset.face;
  let hairStyle = preset.hair;
  let hairColor = preset.hairHex;

  if (role === 'mart_clerk') { outfitNum = 9; hairStyle = 'parted_perm'; faceNum = 2; }
  else if (role === 'baker') { outfitNum = 10; hairStyle = 'bob_bangs'; faceNum = 1; }
  else if (role === 'barista') { outfitNum = 11; hairStyle = 'parted_perm'; faceNum = 4; }
  else if (role === 'florist') { outfitNum = 12; hairStyle = 'wavy_perm'; faceNum = 8; hairColor = 0x8D5524; }
  else if (role === 'manager') { outfitNum = 13; hairStyle = 'parted_perm'; faceNum = 6; }
  else if (role === 'landlord_driver' || role === 'landlord') { outfitNum = 14; hairStyle = 'parted_perm'; faceNum = 12; hairColor = 0x2B1F1C; }
  else if (role === 'wash_clerk') { outfitNum = 15; hairStyle = 'double_buns'; faceNum = 3; }
  else if (role === 'elderly') { outfitNum = 7; hairStyle = 'fluffy_curl'; faceNum = 7; hairColor = 0xE5E7EB; }
  else if (role === 'streamer') { outfitNum = 6; hairStyle = 'cat_headset'; faceNum = 5; hairColor = 0xC084FC; }
  else if (role === 'rival_kang') { outfitNum = 13; hairStyle = 'parted_perm'; faceNum = 11; hairColor = 0x1E1B24; }
  else if (role === 'movie_star') { outfitNum = 14; hairStyle = 'wavy_perm'; faceNum = 8; hairColor = 0xF59E0B; }
  else if (role === 'fund_manager') { outfitNum = 13; hairStyle = 'parted_perm'; faceNum = 12; hairColor = 0x1E293B; }
  else if (role === 'cruise_captain') { outfitNum = 10; hairStyle = 'parted_perm'; faceNum = 6; hairColor = 0x334155; }
  else if (role === 'it_ceo') { outfitNum = 14; hairStyle = 'parted_perm'; faceNum = 4; hairColor = 0x0F172A; }

  const outfitTex = REAL_TEX.outfits[(outfitNum - 1) % Math.max(1, REAL_TEX.outfits.length)] || null;
  const faceTex = REAL_TEX.faces[(faceNum - 1) % Math.max(1, REAL_TEX.faces.length)] || null;

  const outfitMat = role === 'rival_kang'
    ? (MAT.carClearPurple || makeClayMat(0x7E22CE, { roughness: 0.32 }))
    : outfitTex
      ? new THREE.MeshStandardMaterial({ map: outfitTex, roughness: 0.46 })
      : makeClayMat(customShirtHex || 0x4EA8DE, { roughness: 0.46 });
  const sleeveMat = role === 'rival_kang'
    ? (MAT.carClearPurple || makeClayMat(0x6B21A8, { roughness: 0.35 }))
    : makeClayMat(customShirtHex || 0xFFF6EC, { roughness: 0.46 });
  const skinMat = makeClayMat(0xFFE4D4, { roughness: 0.44 });
  const faceMat = faceTex
    ? new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.36 })
    : skinMat;
  const hairMat = makeClayMat(hairColor, { roughness: 0.48 });

  // 귀여운 아트토이 다리 & 둥근 스니커즈 신발
  const makeLegWithShoe = (lx) => {
    const lg = new THREE.Group();
    const pant = new THREE.Mesh(GEO.cyl, MAT.charcoal);
    pant.scale.set(0.17, 0.32, 0.17);
    pant.position.y = -0.14;
    const shoe = createRoundedToyMesh(0.2, 0.12, 0.28, MAT.white, 0, -0.29, 0.04, 0.05);
    lg.add(pant, shoe);
    lg.position.set(lx, 0.35, 0);
    return lg;
  };
  const legL = makeLegWithShoe(-0.15);
  const legR = makeLegWithShoe(0.15);
  bodyRig.add(legL, legR);

  // 통통한 팝마트 비율 상체 몸통 (CylinderGeometry u=0.5 정면 매핑: rotation.y = Math.PI)
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 0.56, 24), outfitMat);
  torso.rotation.y = Math.PI;
  torso.position.y = 0.62;
  torso.castShadow = true;
  addToonHullOutline(torso, 1.06);
  bodyRig.add(torso);

  // 양팔 + 동글동글 귀여운 손
  const makeArm = (ax, rotZ) => {
    const ag = new THREE.Group();
    const slv = new THREE.Mesh(GEO.cyl, sleeveMat);
    slv.scale.set(0.15, 0.34, 0.15);
    slv.position.y = -0.12;
    const hand = new THREE.Mesh(GEO.sphere, skinMat);
    hand.scale.setScalar(0.15);
    hand.position.y = -0.3;
    ag.add(slv, hand);
    ag.position.set(ax, 0.78, 0);
    ag.rotation.z = rotZ;
    return ag;
  };
  const armL = makeArm(-0.36, 0.28);
  const armR = makeArm(0.36, -0.28);
  bodyRig.add(armL, armR);

  // 2.5등신 귀염뽀짝 아트토이 대형 헤드 (SphereGeometry u=0.5 정면 +Z 매핑: rotation.y = -Math.PI * 0.5)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.39, 28, 22), faceMat);
  head.rotation.y = -Math.PI * 0.5;
  head.scale.set(1.04, 0.97, 1.0);
  head.position.y = 1.24;
  head.castShadow = true;
  addToonHullOutline(head, 1.05);
  bodyRig.add(head);

  // 양쪽 귀여운 아트토이 귀
  for (const ex of [-0.39, 0.39]) {
    const ear = new THREE.Mesh(GEO.sphere, skinMat);
    ear.scale.set(0.11, 0.15, 0.09);
    ear.position.set(ex, 1.22, 0);
    bodyRig.add(ear);
  }

  // 풍성한 3D 입체 헤어 & 직업 모자 장착 (대머리 0%!)
  addVolumetricArtToyHair3D(bodyRig, hairStyle, hairMat, role);

  // 손에 드는 갈색 크래프트 종이봉투 + 실사 바게트 슬롯
  const carryBag = new THREE.Group();
  const bagBox = createRoundedToyMesh(0.32, 0.42, 0.24, MAT.paperBag, 0, 0.2, 0, 0.04);
  const baguette1 = new THREE.Mesh(GEO.cyl, MAT.realBaguette || MAT.butterOak);
  baguette1.scale.set(0.12, 0.48, 0.12);
  baguette1.rotation.z = 0.22;
  baguette1.position.set(-0.05, 0.46, 0);
  const baguette2 = new THREE.Mesh(GEO.cyl, MAT.realCroissant || MAT.gold);
  baguette2.scale.set(0.12, 0.4, 0.12);
  baguette2.rotation.z = -0.18;
  baguette2.position.set(0.06, 0.43, 0.02);
  carryBag.add(bagBox, baguette1, baguette2);
  carryBag.position.set(0.44, 0.42, 0.16);
  carryBag.visible = false;
  bodyRig.add(carryBag);

  // 스마트 일상 루틴 전용 소품: ① 스마트폰(침대/벤치 휴식용) ② 팝콘/음료컵(소파 영화감상용) ③ 라이벌 보라색 확성기
  const phoneProp = createRoundedToyMesh(0.16, 0.24, 0.04, MAT.screenCyan, 0, 0.68, 0.38, 0.02);
  phoneProp.rotation.x = -0.48;
  phoneProp.visible = false;
  bodyRig.add(phoneProp);

  const cupProp = new THREE.Group();
  const cBody = new THREE.Mesh(GEO.cyl, MAT.coral);
  cBody.scale.set(0.18, 0.24, 0.18);
  const cTop = new THREE.Mesh(GEO.sphere, MAT.white);
  cTop.scale.setScalar(0.17);
  cTop.position.y = 0.13;
  cupProp.add(cBody, cTop);
  cupProp.position.set(-0.34, 0.64, 0.34);
  cupProp.visible = false;
  bodyRig.add(cupProp);

  const megaphoneProp = new THREE.Group();
  const megaCone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.56, 16), MAT.carClearPurple || MAT.purpleDark);
  megaCone.rotation.x = -Math.PI * 0.5;
  megaCone.position.z = 0.26;
  const megaRim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.035, 10, 20), MAT.pureGold24k);
  megaRim.position.z = 0.54;
  megaphoneProp.add(megaCone, megaRim);
  megaphoneProp.position.set(0.38, 1.06, 0.32);
  megaphoneProp.visible = false;
  bodyRig.add(megaphoneProp);

  grp.userData = {
    bodyRig,
    legL,
    legR,
    armL,
    armR,
    armLPivot: armL,
    armRPivot: armR,
    head,
    carryBag,
    phoneProp,
    cupProp,
    megaphoneProp,
    auraMat,
    auraTimer: 0
  };
  if (typeof attachPopMartAnimalSpriteToActor === 'function') {
    attachPopMartAnimalSpriteToActor(grp, role, vIdx);
  }
  return grp;
}

function createCutePet3D(kind = 'corgi') {
  const grp = new THREE.Group();
  const bodyMat = kind === 'cat' ? MAT.white : MAT.butterOak;
  const body = createRoundedToyMesh(0.38, 0.28, 0.56, bodyMat, 0, 0.22, 0, 0.09);
  const head = new THREE.Mesh(GEO.sphere, bodyMat);
  head.scale.setScalar(0.38);
  head.position.set(0, 0.39, 0.26);
  addToonHullOutline(head, 1.07);
  const earL = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.17, 6), kind === 'cat' ? MAT.pinkSoft : MAT.woodWarm);
  earL.position.set(-0.1, 0.56, 0.26);
  const earR = earL.clone();
  earR.position.set(0.1, 0.56, 0.26);
  const tail = new THREE.Mesh(GEO.sphere, MAT.white);
  tail.scale.setScalar(0.16);
  tail.position.set(0, 0.3, -0.3);
  grp.add(body, head, earL, earR, tail);
  return grp;
}

// =========================================================
// 6B. 고디테일 다중 파츠(20~28+ 파츠) 4종 차량 3D 모델링 (유광 클리어코트 & 버킷시트 & 5스포크 휠)
// =========================================================
function createVehicle3D(carId = 'car_scooter', includeDriver = true) {
  const grp = new THREE.Group();
  const wheels = [];

  const makeAlloyWheel = (wx, wy, wz, radius = 0.42, goldRim = false, redCaliper = false) => {
    const wGrp = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.28, 24), MAT.carbonFiber);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    const rimMat = goldRim ? MAT.pureGold24k : MAT.chromeAlloy;
    const rimOuter = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.68, radius * 0.68, 0.29, 20), rimMat);
    rimOuter.rotation.z = Math.PI / 2;
    wGrp.add(tire, rimOuter);

    // 5-스포크 입체 휠 스타 & 허브캡
    for (let sp = 0; sp < 5; sp++) {
      const ang = (sp / 5) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.3, radius * 0.62, 0.06), rimMat);
      spoke.position.set(0, Math.cos(ang) * radius * 0.3, Math.sin(ang) * radius * 0.3);
      spoke.rotation.x = -ang;
      wGrp.add(spoke);
    }
    if (redCaliper) {
      const cal = new THREE.Mesh(new THREE.BoxGeometry(0.29, radius * 0.35, radius * 0.24), MAT.carClearRed);
      cal.position.set(0, radius * 0.25, -radius * 0.22);
      wGrp.add(cal);
    }
    wGrp.position.set(wx, wy, wz);
    grp.add(wGrp);
    wheels.push(wGrp);
    return wGrp;
  };

  const shadow = new THREE.Mesh(GEO.quad, MAT.shadow);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  grp.add(shadow);

  let driverRef = null;
  let roofRef = null;

  if (carId === 'car_scooter') {
    shadow.scale.set(1.7, 2.8, 1);
    makeAlloyWheel(0, 0.34, 0.82, 0.33, false, false);
    makeAlloyWheel(0, 0.34, -0.78, 0.33, false, false);

    // 민트 유광 클리어코트 베스파 18+ 파츠 조립
    grp.add(createRoundedToyMesh(0.74, 0.16, 1.48, MAT.carClearMint, 0, 0.38, -0.02, 0.07)); // 플로어보드
    grp.add(createRoundedToyMesh(0.84, 0.48, 0.92, MAT.carClearMint, 0, 0.62, -0.52, 0.18)); // 리어 엔진 카울
    grp.add(createRoundedToyMesh(0.58, 0.28, 0.48, MAT.carClearMint, 0, 0.56, 0.82, 0.12));  // 프론트 휀더
    const legShield = createRoundedToyMesh(0.82, 0.98, 0.18, MAT.carClearMint, 0, 0.88, 0.6, 0.1);
    legShield.rotation.x = -0.2;
    grp.add(legShield);
    grp.add(createRoundedToyMesh(0.32, 0.48, 0.14, MAT.chromeAlloy, 0, 0.82, 0.71, 0.04)); // 프론트 혼 그릴
    // 크롬 핸들바 + 그립 + 원형 백미러 2개 + 계기판
    grp.add(createRoundedToyMesh(0.76, 0.08, 0.12, MAT.chromeAlloy, 0, 1.36, 0.5, 0.03));
    grp.add(createRoundedToyMesh(0.18, 0.09, 0.09, MAT.charcoal, -0.4, 1.36, 0.5, 0.02));
    grp.add(createRoundedToyMesh(0.18, 0.09, 0.09, MAT.charcoal, 0.4, 1.36, 0.5, 0.02));
    for (const mx of [-0.36, 0.36]) {
      const stem = new THREE.Mesh(GEO.cyl, MAT.chromeAlloy);
      stem.scale.set(0.04, 0.26, 0.04);
      stem.position.set(mx, 1.5, 0.52);
      const mir = new THREE.Mesh(GEO.cyl, MAT.chromeAlloy);
      mir.scale.set(0.18, 0.04, 0.18);
      mir.rotation.x = Math.PI / 2;
      mir.position.set(mx * 1.12, 1.62, 0.52);
      grp.add(stem, mir);
    }
    const headBezel = new THREE.Mesh(GEO.torus, MAT.chromeAlloy);
    headBezel.scale.setScalar(0.36);
    headBezel.position.set(0, 1.35, 0.63);
    const headLamp = new THREE.Mesh(GEO.sphere, MAT.neonYellow);
    headLamp.scale.setScalar(0.24);
    headLamp.position.set(0, 1.35, 0.64);
    grp.add(headBezel, headLamp);
    // 퀼팅 카멜 가죽 시트 + 리어 크롬 랙 & 가죽 탑박스 + 배기 머플러
    grp.add(createRoundedToyMesh(0.58, 0.22, 0.82, MAT.leatherCamel, 0, 0.88, -0.34, 0.09));
    grp.add(createRoundedToyMesh(0.52, 0.34, 0.42, MAT.leatherCamel, 0, 1.06, -0.98, 0.08));
    grp.add(createRoundedToyMesh(0.54, 0.05, 0.44, MAT.pureGold24k, 0, 1.08, -0.98, 0.02));
    const exhaust = new THREE.Mesh(GEO.cyl, MAT.chromeAlloy);
    exhaust.scale.set(0.12, 0.55, 0.12);
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(0.36, 0.36, -0.75);
    grp.add(exhaust);

    if (includeDriver) {
      const driver = createChibiPerson3D('landlord_driver');
      driver.scale.setScalar(0.9);
      driver.position.set(0, 0.62, -0.24);
      grp.add(driver);
      driverRef = driver;
    }
  } else if (carId === 'car_sedan') {
    shadow.scale.set(2.6, 4.6, 1);
    makeAlloyWheel(-1.02, 0.41, 1.24, 0.41, false, false);
    makeAlloyWheel(1.02, 0.41, 1.24, 0.41, false, false);
    makeAlloyWheel(-1.02, 0.41, -1.24, 0.41, false, false);
    makeAlloyWheel(1.02, 0.41, -1.24, 0.41, false, false);

    // 클래식 브론즈 유광 클리어코트 세단 24+ 파츠
    grp.add(createRoundedToyMesh(2.08, 0.56, 4.1, MAT.carClearBronze, 0, 0.62, 0, 0.16)); // 메인 차체
    grp.add(createRoundedToyMesh(1.82, 0.26, 1.42, MAT.carClearBronze, 0, 0.92, 1.18, 0.1)); // 조각 보닛
    grp.add(createRoundedToyMesh(1.78, 0.22, 1.05, MAT.carClearBronze, 0, 0.9, -1.42, 0.09)); // 리어 트렁크
    // 플레어 휀더 아치 4개 & 사이드 크롬 몰딩
    for (const fx of [-1.02, 1.02]) {
      grp.add(createRoundedToyMesh(0.28, 0.28, 0.98, MAT.carClearBronze, fx, 0.62, 1.24, 0.1));
      grp.add(createRoundedToyMesh(0.28, 0.28, 0.98, MAT.carClearBronze, fx, 0.62, -1.24, 0.1));
      grp.add(createRoundedToyMesh(0.08, 0.08, 3.65, MAT.chromeAlloy, fx * 1.02, 0.56, 0, 0.02));
    }
    // 크롬 프론트·리어 범퍼 & 세로 슬랫 클래식 라디에이터 그릴
    grp.add(createRoundedToyMesh(2.16, 0.18, 0.22, MAT.chromeAlloy, 0, 0.44, 2.08, 0.06));
    grp.add(createRoundedToyMesh(2.16, 0.18, 0.22, MAT.chromeAlloy, 0, 0.44, -2.08, 0.06));
    grp.add(createRoundedToyMesh(0.96, 0.48, 0.12, MAT.chromeAlloy, 0, 0.72, 2.06, 0.05));
    // 앞유리 프레임 & 버킷 시트 2개 & 핸들 & 개폐식 크림 루프
    const ws = createRoundedToyMesh(1.78, 0.58, 0.1, MAT.partitionGlass, 0, 1.18, 0.52, 0.04, false, false, false);
    ws.rotation.x = -0.35;
    grp.add(ws);
    for (const sx of [-0.44, 0.44]) {
      grp.add(createRoundedToyMesh(0.62, 0.52, 0.24, MAT.leatherCamel, sx, 0.98, -0.35, 0.06));
      grp.add(createRoundedToyMesh(0.62, 0.16, 0.56, MAT.leatherCamel, sx, 0.76, -0.15, 0.05));
    }
    const sWheel = new THREE.Mesh(GEO.torus, MAT.charcoal);
    sWheel.scale.setScalar(0.42);
    sWheel.rotation.x = -0.45;
    sWheel.position.set(-0.44, 1.04, 0.22);
    grp.add(sWheel);

    roofRef = createRoundedToyMesh(1.78, 0.56, 1.85, MAT.carClearCream, 0, 1.34, -0.26, 0.16);
    roofRef.visible = !driveState.roofOpen;
    grp.add(roofRef);

    for (const lx of [-0.72, 0.72]) {
      const hl = new THREE.Mesh(GEO.sphere, MAT.neonYellow);
      hl.scale.setScalar(0.28);
      hl.position.set(lx, 0.76, 2.06);
      const tl = createRoundedToyMesh(0.36, 0.18, 0.1, MAT.neonCoral, lx, 0.74, -2.06, 0.04);
      const mir = createRoundedToyMesh(0.18, 0.12, 0.14, MAT.chromeAlloy, lx * 1.48, 1.02, 0.44, 0.03);
      grp.add(hl, tl, mir);
    }

    if (includeDriver) {
      const sedanDriver = createChibiPerson3D('landlord_driver');
      sedanDriver.scale.setScalar(0.84);
      sedanDriver.position.set(-0.44, 0.58, -0.16);
      grp.add(sedanDriver);
      driverRef = sedanDriver;
    }
  } else if (carId === 'car_supercar' || carId === 'car_rival_purple') {
    // 이탈리안 페라리 레드 & 라이벌 강 회장 전용 보라+24K 골드 크롬 오픈 슈퍼카 (28+ 세부 파츠!)
    const isRivalCar = carId === 'car_rival_purple';
    const bodyPaint = isRivalCar ? (MAT.carClearPurple || MAT.purpleDark) : MAT.carClearRed;
    const accentTrim = isRivalCar ? MAT.pureGold24k : MAT.carbonFiber;

    shadow.scale.set(2.9, 5.1, 1);
    makeAlloyWheel(-1.14, 0.41, 1.36, 0.42, true, !isRivalCar);
    makeAlloyWheel(1.14, 0.41, 1.36, 0.42, true, !isRivalCar);
    makeAlloyWheel(-1.14, 0.43, -1.36, 0.45, true, !isRivalCar);
    makeAlloyWheel(1.14, 0.43, -1.36, 0.45, true, !isRivalCar);

    // 프론트 스플리터 & 사이드 스커트 & 리어 디퓨저
    grp.add(createRoundedToyMesh(2.34, 0.1, 4.56, accentTrim, 0, 0.28, 0, 0.04));
    // 로우 와이드 메인 바디 + 조각 보닛 + 좌우 에어로 휀더 + 측면 에어 인테이크
    grp.add(createRoundedToyMesh(2.28, 0.48, 4.42, bodyPaint, 0, 0.56, 0, 0.15));
    const hood = createRoundedToyMesh(1.96, 0.22, 1.58, bodyPaint, 0, 0.82, 1.24, 0.1);
    hood.rotation.x = 0.14;
    grp.add(hood);
    grp.add(createRoundedToyMesh(0.86, 0.07, 0.48, accentTrim, 0, 0.89, 1.35, 0.02));
    grp.add(createRoundedToyMesh(0.28, 0.045, 4.35, MAT.pureGold24k, 0, 0.87, 0, 0.01)); // 24K 골드 레이싱 스트라이프
    grp.add(createRoundedToyMesh(1.38, 0.22, 0.14, accentTrim, 0, 0.44, 2.22, 0.04));

    for (const sx of [-1.14, 1.14]) {
      grp.add(createRoundedToyMesh(0.26, 0.34, 1.05, bodyPaint, sx, 0.66, 1.32, 0.1));
      grp.add(createRoundedToyMesh(0.28, 0.38, 1.15, bodyPaint, sx, 0.7, -1.32, 0.1));
      grp.add(createRoundedToyMesh(0.14, 0.26, 0.68, accentTrim, sx * 0.98, 0.62, -0.48, 0.03));
      grp.add(createRoundedToyMesh(0.24, 0.12, 0.18, bodyPaint, sx * 1.04, 0.98, 0.52, 0.04));
    }

    // 경사진 스포츠 윈드실드 + A필러 + 개폐식 소프트탑
    const windshield = createRoundedToyMesh(1.92, 0.58, 0.1, MAT.partitionGlass, 0, 1.06, 0.56, 0.04, false, false, false);
    windshield.rotation.x = -0.56;
    grp.add(windshield);
    for (const px of [-0.94, 0.94]) {
      const pillar = createRoundedToyMesh(0.09, 0.62, 0.09, accentTrim, px, 1.06, 0.56, 0.02);
      pillar.rotation.x = -0.56;
      grp.add(pillar);
    }

    roofRef = createRoundedToyMesh(1.88, 0.38, 1.62, accentTrim, 0, 1.28, -0.25, 0.12);
    roofRef.visible = isRivalCar ? false : !driveState.roofOpen;
    grp.add(roofRef);

    // 실내 스포츠 버킷 시트 2개 + 롤후프 2개 + 센터콘솔 + 레이싱 스티어링 휠
    grp.add(createRoundedToyMesh(0.32, 0.28, 1.1, accentTrim, 0, 0.72, -0.1, 0.05));
    for (const bx of [-0.52, 0.52]) {
      grp.add(createRoundedToyMesh(0.58, 0.58, 0.22, MAT.leatherCamel, bx, 0.95, -0.58, 0.07));
      grp.add(createRoundedToyMesh(0.34, 0.24, 0.18, bodyPaint, bx, 1.28, -0.6, 0.05));
      grp.add(createRoundedToyMesh(0.58, 0.15, 0.56, MAT.leatherCamel, bx, 0.7, -0.26, 0.05));
      const hoop = new THREE.Mesh(GEO.torus, isRivalCar ? MAT.pureGold24k : MAT.chromeAlloy);
      hoop.scale.setScalar(0.42);
      hoop.position.set(bx, 1.26, -0.74);
      grp.add(hoop);
    }
    const raceWheel = new THREE.Mesh(GEO.torus, MAT.carbonFiber);
    raceWheel.scale.setScalar(0.38);
    raceWheel.rotation.x = -0.35;
    raceWheel.position.set(-0.52, 0.98, 0.18);
    grp.add(raceWheel);

    if (includeDriver) {
      const ownerDriver = createChibiPerson3D(isRivalCar ? 'rival_kang' : 'landlord_driver');
      ownerDriver.scale.setScalar(0.86);
      ownerDriver.position.set(-0.52, 0.56, -0.22);
      grp.add(ownerDriver);
      driverRef = ownerDriver;
    }

    // 리어 엔진 데크 루버 + GT 리어 윙 스포일러 + 쿼드 황금 머플러 + 날카로운 LED 램프
    for (let lv = 0; lv < 3; lv++) {
      grp.add(createRoundedToyMesh(1.15, 0.05, 0.18, accentTrim, 0, 0.92, -1.15 - lv * 0.26, 0.02));
    }
    grp.add(createRoundedToyMesh(0.12, 0.42, 0.26, accentTrim, -0.78, 1.04, -1.96, 0.03));
    grp.add(createRoundedToyMesh(0.12, 0.42, 0.26, accentTrim, 0.78, 1.04, -1.96, 0.03));
    grp.add(createRoundedToyMesh(2.36, 0.1, 0.48, isRivalCar ? MAT.pureGold24k : bodyPaint, 0, 1.26, -2.02, 0.04));

    for (const lx of [-0.8, 0.8]) {
      const hl = createRoundedToyMesh(0.46, 0.13, 0.16, MAT.neonYellow, lx, 0.68, 2.2, 0.04);
      hl.rotation.y = lx < 0 ? 0.2 : -0.2;
      const tl = createRoundedToyMesh(0.52, 0.14, 0.1, MAT.neonCoral, lx, 0.76, -2.22, 0.04);
      grp.add(hl, tl);
    }
    for (const ex of [-0.62, -0.38, 0.38, 0.62]) {
      const pipe = new THREE.Mesh(GEO.cyl, MAT.pureGold24k);
      pipe.scale.set(0.14, 0.26, 0.14);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(ex, 0.38, -2.26);
      grp.add(pipe);
    }
  } else {
    // 24K 골드 크라운 6륜 롱바디 리무진 (26+ 파츠)
    shadow.scale.set(3.0, 6.5, 1);
    for (const wz of [2.05, 0.0, -2.05]) {
      makeAlloyWheel(-1.14, 0.43, wz, 0.43, true, false);
      makeAlloyWheel(1.14, 0.43, wz, 0.43, true, false);
    }

      grp.add(createRoundedToyMesh(2.28, 0.68, 5.92, MAT.carClearCream, 0, 0.68, 0, 0.16));
      grp.add(createRoundedToyMesh(2.34, 0.18, 5.98, MAT.pureGold24k, 0, 0.52, 0, 0.05)); // 24K 골드 투톤 하부 바디벨트
      grp.add(createRoundedToyMesh(1.94, 0.25, 1.38, MAT.pureGold24k, 0, 0.99, 2.15, 0.08)); // 24K 골드 보닛 후드
      // 판테온 크롬&골드 프론트 그릴 + 보닛 24K 왕관 오너먼트
      grp.add(createRoundedToyMesh(1.08, 0.58, 0.14, MAT.pureGold24k, 0, 0.76, 2.96, 0.04));
      grp.add(createRoundedToyMesh(2.32, 0.2, 0.22, MAT.pureGold24k, 0, 0.42, 2.98, 0.05));
      grp.add(createRoundedToyMesh(2.32, 0.2, 0.22, MAT.pureGold24k, 0, 0.42, -2.98, 0.05));
      const hoodCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.28, 6), MAT.pureGold24k);
      hoodCrown.position.set(0, 1.21, 2.68);
      grp.add(hoodCrown);

      const limoWs = createRoundedToyMesh(1.98, 0.56, 0.12, MAT.partitionGlass, 0, 1.18, 1.52, 0.04, false, false, false);
      limoWs.rotation.x = -0.34;
      grp.add(limoWs);

      // 실내 VIP 라운지 소파 시트 & 운전석 버킷시트
      grp.add(createRoundedToyMesh(1.72, 0.48, 0.52, MAT.leatherCamel, 0, 0.92, -1.65, 0.08));
      grp.add(createRoundedToyMesh(0.58, 0.48, 1.55, MAT.leatherCamel, 0.62, 0.92, -0.45, 0.08));
      grp.add(createRoundedToyMesh(0.58, 0.52, 0.24, MAT.leatherCamel, -0.48, 0.96, 0.85, 0.06));

      roofRef = createRoundedToyMesh(1.98, 0.66, 3.85, MAT.pureGold24k, 0, 1.34, -0.32, 0.16);
      roofRef.visible = !driveState.roofOpen;
      grp.add(roofRef);

    if (includeDriver) {
      const limoDriver = createChibiPerson3D('landlord_driver');
      limoDriver.scale.setScalar(0.84);
      limoDriver.position.set(-0.48, 0.58, 0.96);
      grp.add(limoDriver);
      driverRef = limoDriver;
    }
    for (const lx of [-0.78, 0.78]) {
      grp.add(createRoundedToyMesh(0.42, 0.2, 0.12, MAT.neonYellow, lx, 0.76, 2.96, 0.04));
      grp.add(createRoundedToyMesh(0.46, 0.18, 0.1, MAT.neonCoral, lx, 0.76, -2.96, 0.04));
    }
  }

  if (driverRef) driverRef.visible = carId === 'car_rival_purple' ? true : !driveState.cockpitView;
  grp.userData = { wheels, driverRef, roofRef };
  return grp;
}

// =========================================================
// 6C. 초고해상도 실사 음식 · 과자 봉지 · 도시락 · 음료 캔 3D 에셋 생성기
// =========================================================
function createPhotorealSnackBag3D(snackKey = 'chips', scale = 1.0) {
  const grp = new THREE.Group();
  const mat = MAT.snackMats?.[snackKey] || MAT.gold;
  // 가운데가 통통하게 부푼 알루미늄 과자 봉지 본체 + 상하단 압착 크림프 실링 엣지
  const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.28 * scale, 0.36 * scale, 0.11 * scale), mat);
  pouch.position.y = 0.19 * scale;
  const topSeal = new THREE.Mesh(new THREE.BoxGeometry(0.3 * scale, 0.035 * scale, 0.025 * scale), MAT.chromeAlloy);
  topSeal.position.y = 0.38 * scale;
  const botSeal = topSeal.clone();
  botSeal.position.y = 0.015 * scale;
  grp.add(pouch, topSeal, botSeal);
  return grp;
}

function createPhotorealBeverageCan3D(canKey = 'cola', scale = 1.0) {
  const grp = new THREE.Group();
  const mat = MAT.snackMats?.[canKey] || MAT.carClearRed;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.095 * scale, 0.095 * scale, 0.28 * scale, 18), mat);
  body.position.y = 0.14 * scale;
  const topRim = new THREE.Mesh(new THREE.CylinderGeometry(0.092 * scale, 0.096 * scale, 0.022 * scale, 18), MAT.chromeAlloy);
  topRim.position.y = 0.285 * scale;
  grp.add(body, topRim);
  return grp;
}

function createPhotorealBentoBox3D(scale = 1.0, angledDisplay = false) {
  const grp = new THREE.Group();
  const body = new THREE.Group();
  body.add(createRoundedToyMesh(0.56 * scale, 0.08 * scale, 0.44 * scale, MAT.woodWarm, 0, 0.04 * scale, 0, 0.03));
  body.add(createRoundedToyMesh(0.52 * scale, 0.075 * scale, 0.4 * scale, MAT.carbonFiber, 0, 0.082 * scale, 0, 0.025));
  const bentoMat = MAT.realBento || MAT.gold;
  const foodPlane = new THREE.Mesh(new THREE.BoxGeometry(0.47 * scale, 0.035 * scale, 0.35 * scale), bentoMat);
  foodPlane.position.y = 0.128 * scale;
  const clearLidMat = new THREE.MeshPhysicalMaterial({
    color: 0xFFFFFF,
    transparent: true,
    opacity: 0.15,
    roughness: 0.05,
    clearcoat: 1.0,
    depthWrite: false
  });
  const clearLid = new THREE.Mesh(new THREE.BoxGeometry(0.5 * scale, 0.045 * scale, 0.38 * scale), clearLidMat);
  clearLid.position.y = 0.158 * scale;
  body.add(foodPlane, clearLid);
  if (angledDisplay) {
    body.rotation.x = 0.28;
    body.position.y = 0.05 * scale;
  }
  grp.add(body);
  return grp;
}

function createPhotorealKimbap3D(scale = 1.0) {
  const grp = new THREE.Group();
  const tri = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * scale, 0.14 * scale, 0.08 * scale, 3), MAT.snackMats?.kimbap || MAT.charcoal);
  tri.rotation.x = Math.PI / 2;
  tri.position.y = 0.12 * scale;
  grp.add(tri);
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

  // 뒷벽 + 낮은 오픈형 좌·우측 벽 + 매장 안쪽 밝은 백색 포인트 조명 (기본 뷰부터 내부 100% 투시!)
  const wallH = isFocused ? h * 0.65 : h * 0.92;
  grp.add(createRoundedToyMesh(w, wallH, 0.26, wallMat, 0, 0.22 + wallH * 0.5, -d * 0.5 + 0.14, 0.08));
  grp.add(createRoundedToyMesh(0.26, wallH * (isFocused ? 0.38 : 0.72), d, wallMat, -w * 0.5 + 0.14, 0.22 + wallH * (isFocused ? 0.19 : 0.36), 0, 0.08));
  grp.add(createRoundedToyMesh(0.26, wallH * (isFocused ? 0.38 : 0.72), d, wallMat, w * 0.5 - 0.14, 0.22 + wallH * (isFocused ? 0.19 : 0.36), 0, 0.08));

  const shopLight = new THREE.PointLight(0xFFFBF2, 1.55, 14);
  shopLight.position.set(0, 3.2, 0.3);
  grp.add(shopLight);

  // 인형의 집 웜 크림 베이지(#F4ECE1) 단면 프레임 기둥 & 상부 슬래브
  const cutawayMat = MAT.dollhouseCutaway || MAT.slab;
  grp.add(createRoundedToyMesh(0.42, wallH + 0.16, 0.38, cutawayMat, -w * 0.5 + 0.2, 0.22 + wallH * 0.5, d * 0.5 - 0.1, 0.08));
  grp.add(createRoundedToyMesh(0.42, wallH + 0.16, 0.38, cutawayMat, w * 0.5 - 0.2, 0.22 + wallH * 0.5, d * 0.5 - 0.1, 0.08));
  grp.add(createRoundedToyMesh(w + 0.24, 0.32, 0.42, cutawayMat, 0, wallH + 0.28, d * 0.5 - 0.08, 0.08));

  // 제2마을(트와일라잇 하버) 단독 상가는 양측 벽면에 호박색 불빛이 새어 나오는 유럽풍 격자 창문 장착!
  if (tpl.stage === 2) {
    for (const sideDir of [-1, 1]) {
      const sideWin = createAmberLatticeWindow3D(1.65, 1.85);
      sideWin.rotation.y = sideDir * Math.PI * 0.5;
      sideWin.position.set(sideDir * (w * 0.5 + 0.08), 2.15, -0.15);
      grp.add(sideWin);
    }
  }

  if (!isFocused) {
    const awningStyle = tpl.kind === 'bakery' ? 'coral' : tpl.awningStyle;
    const awning = createScallopedAwning3D(w - 0.36, awningStyle);
    awning.position.set(0, h * 0.82, d * 0.5 + 0.02);
    grp.add(awning);

    const signKindMap = {
      bakery: 'patisserie',
      roastery: 'roastery',
      flower: 'flores',
      lobster: 'lobster',
      winelounge: 'winelounge',
      marina: 'marina'
    };
    const signKind = signKindMap[tpl.kind] || 'flores';
    const signboard = createFramedSignboard3D(w * 0.8, 1.14, signKind);
    signboard.position.set(0, h + 0.36, d * 0.5 + 0.1);
    grp.add(signboard);

    if (tpl.stage === 2) {
      const gableMat = tpl.kind === 'lobster' ? (MAT.terracottaRoof || MAT.coral) : (MAT.slateRoofCharcoal || MAT.roofRoyalNavy);
      const gableRoof = createEuropeanGableRoofWithDormers3D(w, d, gableMat, 2);
      gableRoof.position.set(0, h + 0.22, -0.08);
      grp.add(gableRoof);
    } else {
      const roofMat = makeClayMat(tpl.kind === 'bakery' ? 0xF28B66 : tpl.roofColor, { roughness: 0.56 });
      grp.add(createRoundedToyMesh(w + 0.48, 0.44, d * 0.6, roofMat, 0, h + 0.46, -d * 0.18, 0.1));

      const mascot = create3DStoreMascot(tpl.kind);
      mascot.scale.setScalar(1.35);
      mascot.position.set(-w * 0.34, h + 0.68, -d * 0.12);
      grp.add(mascot);
    }

    if (shopState?.owned) {
      const ownerCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.38, 0.44, 6), MAT.pureGold24k);
      ownerCrown.position.set(w * 0.36, h + (tpl.stage === 2 ? 2.15 : 0.92), -d * 0.12);
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
    // ① 쇼윈도 안쪽 실사 딸기 생크림 홀케이크 & 버터 윤기(clearcoat) 크루아상·바게트 진열 쇼케이스!
    const standX = -2.25;
    const standZ = d * 0.5 - 1.05;
    grp.add(createRoundedToyMesh(2.35, 0.78, 0.96, MAT.woodLight, standX, 0.64, standZ, 0.06));
    grp.add(createRoundedToyMesh(2.3, 0.82, 0.9, MAT.cutawayGlass, standX, 1.4, standZ, 0.04, false, false, false));

    const realCake1 = create3DGiftPropMesh('item_cake', false);
    realCake1.scale.setScalar(1.15);
    realCake1.position.set(standX - 0.58, 1.04, standZ);
    grp.add(realCake1);

    const realCroissantTray = create3DGiftPropMesh('item_croissant', false);
    realCroissantTray.scale.setScalar(1.22);
    realCroissantTray.position.set(standX + 0.48, 1.04, standZ + 0.05);
    grp.add(realCroissantTray);

    // 노릇노릇한 실사 프랑스 바게트 바구니
    const bagBasket = createRoundedToyMesh(0.62, 0.46, 0.52, MAT.woodWarm, 2.25, 0.52, -0.35, 0.06);
    grp.add(bagBasket);
    for (let bi = -1; bi <= 1; bi++) {
      const bagMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.72, 16), MAT.realBaguette || MAT.butterOak);
      bagMesh.position.set(2.25 + bi * 0.14, 0.88, -0.35);
      bagMesh.rotation.z = bi * 0.18;
      grp.add(bagMesh);
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

    // ③ 가게 앞 인도 초록색 대형 파라솔 야외 원형 테이블 세트 (기본 1세트 측면 배치로 입구·경매 레드카펫 개방, 테라스 확장 시 4세트!)
    const terraceXs = hasTerraceUpg ? [-3.9, -1.65, 1.65, 3.9] : [-3.15];
    for (const tx of terraceXs) {
      const pSet = createGreenParasolTableSet3D(true);
      pSet.position.set(tx, 0.02, d * 0.5 + 2.15);
      grp.add(pSet);
      seatSlots.push({
        wx: tpl.x + tx - 0.96,
        wy: 0.44,
        wz: tpl.z + d * 0.5 + 2.15,
        tableX: tpl.x + tx,
        tableY: 1.12,
        tableZ: tpl.z + d * 0.5 + 2.15,
        rotY: Math.PI / 2,
        outdoor: true,
        occupiedBy: null
      });
      seatSlots.push({
        wx: tpl.x + tx + 0.96,
        wy: 0.44,
        wz: tpl.z + d * 0.5 + 2.15,
        tableX: tpl.x + tx,
        tableY: 1.12,
        tableZ: tpl.z + d * 0.5 + 2.15,
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

    // 실내 창가 바 테이블 + 실사 아인슈페너 & 라떼 진열
    grp.add(createRoundedToyMesh(2.2, 0.88, 0.65, MAT.woodWarm, -2.2, 0.7, d * 0.5 - 0.85, 0.05));
    for (const cx of [-2.65, -1.85]) {
      const cupProp = create3DGiftPropMesh('item_coffee', false);
      cupProp.scale.setScalar(1.08);
      cupProp.position.set(cx, 1.15, d * 0.5 - 0.85);
      grp.add(cupProp);
    }
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
  } else if (tpl.kind === 'lobster') {
    // 오션뷰 랍스터 파인다이닝: 실사 활랍스터 플래터 · 토마호크 스테이크 · 크리스탈 샹들리에 · 화이트 리넨 다이닝 테이블
    const cellarChand = create3DWineCellarAndChandelierMesh(h, d);
    grp.add(cellarChand);

    for (const tx of [-2.35, 2.55]) {
      const fineTable = new THREE.Mesh(GEO.cyl, MAT.white);
      fineTable.scale.set(1.38, 0.1, 1.38);
      fineTable.position.set(tx, 0.88, 1.05);
      const tBase = new THREE.Mesh(GEO.cyl, MAT.pureGold24k || MAT.gold);
      tBase.scale.set(0.18, 0.68, 0.18);
      tBase.position.set(tx, 0.52, 1.05);
      grp.add(fineTable, tBase);

      const lob = create3DLobsterPlatterMesh();
      lob.scale.setScalar(0.88);
      lob.position.set(tx - 0.2, 0.94, 1.02);
      grp.add(lob);

      if (hasOvenUpg || tx > 0) {
        const steak = create3DTomahawkSteakMesh();
        steak.scale.setScalar(0.75);
        steak.position.set(tx + 0.25, 0.94, 1.18);
        grp.add(steak);
      }
    }
    if (hasTerraceUpg) {
      const champ = create3DChampagneBucketMesh();
      champ.position.set(0.4, 1.4, -0.32);
      grp.add(champ);
    }
  } else if (tpl.kind === 'winelounge') {
    // 선셋 와인 & 재즈 라운지: 콘서트 그랜드 피아노 · 호박빛 오크 와인 셀러 · 빈티지 샴페인
    const cellarChand = create3DWineCellarAndChandelierMesh(h, d);
    grp.add(cellarChand);

    const grandPiano = create3DGrandPianoMesh();
    grandPiano.scale.setScalar(0.95);
    grandPiano.position.set(-2.35, 0.26, 0.95);
    grandPiano.rotation.y = 0.35;
    grp.add(grandPiano);

    const champ = create3DChampagneBucketMesh();
    champ.position.set(2.55, 0.28, 1.15);
    grp.add(champ);

    if (hasOvenUpg) {
      const lob = create3DLobsterPlatterMesh();
      lob.scale.setScalar(0.85);
      lob.position.set(0.35, 1.42, -0.35);
      grp.add(lob);
    }
  } else if (tpl.kind === 'marina') {
    // VIP 요트 마리나 클럽: 오션뷰 월풀 스파 자쿠지 · 샴페인 바 · 프라이빗 요트 차터 데크
    const jacuzzi = create3DOceanJacuzziMesh();
    jacuzzi.scale.setScalar(0.92);
    jacuzzi.position.set(-2.45, 0.26, 0.85);
    grp.add(jacuzzi);

    const cellarChand = create3DWineCellarAndChandelierMesh(h, d);
    grp.add(cellarChand);

    const champ = create3DChampagneBucketMesh();
    champ.scale.setScalar(1.15);
    champ.position.set(2.65, 0.28, 1.05);
    grp.add(champ);

    syncHarborBridgeGate3D();
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

  const upperStructGroup = new THREE.Group();
  root.add(upperStructGroup);

  structGroup.add(createRoundedToyMesh(W + 1.2, 0.44, D + 1.2, MAT.podiumStone, 0, 0.22, 0, 0.14));

  // ==================== 1층 편의점(MINIMI MART) & 코인세탁소(BUBBLE LAUNDRY) 코지 크림 인형의 집 단면 오픈 구조 ====================
  const cutawayMat = MAT.dollhouseCutaway || MAT.slab;
  const warmTrimMat = MAT.dollhouseWarmTrim || MAT.woodLight;
  const brickMainMat = lot.devType === 'mixed_2'
    ? makeClayMat(0xF3ECE2, { roughness: 0.68 })
    : makeClayMat(0xF6EDE2, { roughness: 0.68 });

  const f1H = 4.28;
  const f1CenterY = 0.44 + f1H * 0.5;
  structGroup.add(createRoundedToyMesh(W + 0.18, f1H, 0.3, brickMainMat, 0, f1CenterY, -D * 0.5 + 0.12, 0.08));
  const f1SideWallL = createRoundedToyMesh(0.36, f1H, D, cutawayMat, -W * 0.5 + 0.12, f1CenterY, 0, 0.08);
  const f1SideWallR = createRoundedToyMesh(0.36, f1H, D, cutawayMat, W * 0.5 - 0.12, f1CenterY, 0, 0.08);
  const f1LobbyWallL = createRoundedToyMesh(0.28, f1H, D - 0.2, cutawayMat, -2.15, f1CenterY, -0.05, 0.06);
  const f1LobbyWallR = createRoundedToyMesh(0.28, f1H, D - 0.2, cutawayMat, 2.15, f1CenterY, -0.05, 0.06);
  // 1층 전면 인형의 집 크림 베이지 단면 기둥
  structGroup.add(
    f1SideWallL,
    f1SideWallR,
    f1LobbyWallL,
    f1LobbyWallR,
    createRoundedToyMesh(0.52, f1H + 0.1, 0.44, cutawayMat, -W * 0.5 + 0.14, f1CenterY, D * 0.5 + 0.04, 0.08),
    createRoundedToyMesh(0.52, f1H + 0.1, 0.44, cutawayMat, W * 0.5 - 0.14, f1CenterY, D * 0.5 + 0.04, 0.08)
  );

  const isHarborHotel = lot.devType === 'harbor_hotel';

  // ---------------- 좌측 1층 매장: 본점 MINIMI MART / 하버 호텔 그랜드 피아노 라운지 ----------------
  const martGrp = new THREE.Group();
  martGrp.position.set(-7.15, 0.45, 0);
  root.add(martGrp);
  if (isHarborHotel) {
    martGrp.add(createRoundedToyMesh(9.2, 0.1, D - 0.5, makeClayMat(0xFFFFFF, { map: TEX.floor3, roughness: 0.48 }), 0, 0.06, 0, 0.04));
    const piano = create3DGrandPianoMesh();
    piano.position.set(-1.5, 0.1, 0.45);
    piano.rotation.y = 0.35;
    const cellar = create3DWineCellarAndChandelierMesh(3.9, D - 0.6);
    martGrp.add(piano, cellar);
  } else {
    build1FMinimiMartInterior3D(martGrp, lot.lotId);
  }

  const martAwning = createScallopedAwning3D(9.2, isHarborHotel ? 'brown' : 'coral');
  martAwning.position.set(-7.15, 3.88, D * 0.5 + 0.12);
  structGroup.add(martAwning);
  const martSign = createFramedSignboard3D(7.6, 0.92, isHarborHotel ? 'winelounge' : 'mart');
  martSign.position.set(-7.15, 4.4, D * 0.5 + 0.22);
  structGroup.add(martSign);

  // 1층 전면 원목 쇼케이스 & A자 입간판 & 야외 원목 테이블
  const martShowcase = new THREE.Group();
  martShowcase.add(createRoundedToyMesh(2.4, 0.76, 0.72, MAT.woodWarm, -9.6, 0.82, D * 0.5 + 0.42, 0.06));
  martShowcase.add(createRoundedToyMesh(2.46, 0.1, 0.78, MAT.woodLight, -9.6, 1.24, D * 0.5 + 0.42, 0.03));
  const scCake = isHarborHotel ? create3DLobsterPlatterMesh() : create3DGiftPropMesh('item_croissant', false);
  scCake.scale.setScalar(isHarborHotel ? 0.8 : 0.95);
  scCake.position.set(-9.6, 1.32, D * 0.5 + 0.42);
  martShowcase.add(scCake);
  const martBoard = createAFrameMenuBoard3D();
  martBoard.position.set(-3.4, 0.44, D * 0.5 + 1.15);
  martBoard.rotation.y = 0.22;
  const bistroL = createOutdoorWoodenBistroSet3D();
  bistroL.position.set(-6.4, 0.44, D * 0.5 + 1.55);
  martShowcase.add(martBoard, bistroL);
  structGroup.add(martShowcase);

  const martGlass = new THREE.Group();
  const martBorderGlow = createRoundedToyMesh(9.5, 0.09, 0.1, warmTrimMat, -7.15, 3.76, D * 0.5 + 0.06, 0.02);
  structGroup.add(martBorderGlow);

  const martHit = new THREE.Mesh(
    new THREE.BoxGeometry(9.6, 4.2, D + 0.8),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  martHit.position.set(-7.15, 2.45, 0.1);
  martHit.userData = isHarborHotel
    ? { kind: 'room', lotId: lot.lotId, roomId: `${lot.lotId}_101` }
    : { kind: 'firstFloorShop', shopId: 'shop_mart1f', lotId: lot.lotId };
  root.add(martHit);
  registerPick(martHit);

  // ---------------- 중앙 아치형 메인 로비 출입문 & 황동 현판 ----------------
  upperStructGroup.add(createRoundedToyMesh(4.1, 0.12, D - 0.2, makeClayMat(0xFFFFFF, { map: TEX.floor3, roughness: 0.5 }), 0, 0.48, 0, 0.04));
  upperStructGroup.add(createRoundedToyMesh(0.48, 4.15, 0.42, cutawayMat, -1.92, 2.48, D * 0.5 + 0.06, 0.08));
  upperStructGroup.add(createRoundedToyMesh(0.48, 4.15, 0.42, cutawayMat, 1.92, 2.48, D * 0.5 + 0.06, 0.08));
  upperStructGroup.add(createRoundedToyMesh(4.2, 0.48, 0.44, warmTrimMat, 0, 3.92, D * 0.5 + 0.06, 0.08));

  const brassMat = new THREE.MeshBasicMaterial({ map: createBrassNameplateTexture(bState.title) });
  const brassPlate = new THREE.Mesh(GEO.quad, brassMat);
  brassPlate.scale.set(3.4, 0.78, 1);
  brassPlate.position.set(0, 4.3, D * 0.5 + 0.3);
  upperStructGroup.add(brassPlate);

  // ---------------- 우측 1층 매장: 본점 BUBBLE LAUNDRY / 하버 호텔 오션 스파 컨시어지 ----------------
  const washGrp = new THREE.Group();
  washGrp.position.set(7.15, 0.45, 0);
  root.add(washGrp);
  if (isHarborHotel) {
    washGrp.add(createRoundedToyMesh(9.2, 0.1, D - 0.5, makeClayMat(0xFFFFFF, { map: TEX.floor2, roughness: 0.48 }), 0, 0.06, 0, 0.04));
    const spa = create3DOceanJacuzziMesh();
    spa.position.set(-0.6, 0.1, 0.35);
    const champ = create3DChampagneBucketMesh();
    champ.position.set(2.4, 0.12, 0.85);
    washGrp.add(spa, champ);
  } else {
    build1FBubbleLaundryInterior3D(washGrp, lot.lotId);
  }

  const washAwning = createScallopedAwning3D(9.2, 'coral');
  washAwning.position.set(7.15, 3.88, D * 0.5 + 0.12);
  structGroup.add(washAwning);
  const washSign = createFramedSignboard3D(7.6, 0.92, isHarborHotel ? 'marina' : 'wash');
  washSign.position.set(7.15, 4.4, D * 0.5 + 0.22);
  structGroup.add(washSign);

  const washOutdoor = new THREE.Group();
  const bistroR = createOutdoorWoodenBistroSet3D();
  bistroR.position.set(6.8, 0.44, D * 0.5 + 1.55);
  washOutdoor.add(bistroR);
  structGroup.add(washOutdoor);

  const washGlass = new THREE.Group();
  const washBorderGlow = createRoundedToyMesh(9.5, 0.09, 0.1, warmTrimMat, 7.15, 3.76, D * 0.5 + 0.06, 0.02);
  structGroup.add(washBorderGlow);

  const washHit = new THREE.Mesh(
    new THREE.BoxGeometry(9.6, 4.2, D + 0.8),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  washHit.position.set(7.15, 2.45, 0.1);
  washHit.userData = isHarborHotel
    ? { kind: 'room', lotId: lot.lotId, roomId: `${lot.lotId}_102` }
    : { kind: 'firstFloorShop', shopId: 'shop_wash1f', lotId: lot.lotId };
  root.add(washHit);
  registerPick(washHit);

  if (lot.lotId === 'lot_main') {
    firstFloorShop3D.shop_mart1f = {
      group: martGrp,
      lotId: lot.lotId,
      glassMesh: martShowcase,
      awningMesh: martAwning,
      signMesh: martSign,
      borderGlowMesh: martBorderGlow,
      otherShopFronts: [washAwning, washSign, washOutdoor, washBorderGlow, f1SideWallR, f1LobbyWallR],
      cutawaySideWall: f1LobbyWallL
    };
    firstFloorShop3D.shop_wash1f = {
      group: washGrp,
      lotId: lot.lotId,
      glassMesh: washOutdoor,
      awningMesh: washAwning,
      signMesh: washSign,
      borderGlowMesh: washBorderGlow,
      otherShopFronts: [martAwning, martSign, martShowcase, martBorderGlow, f1SideWallL, f1LobbyWallL],
      cutawaySideWall: f1LobbyWallR
    };
    ensureFirstFloorShopOverlayBadge('shop_mart1f');
    ensureFirstFloorShopOverlayBadge('shop_wash1f');
  }

  // ==================== 2~4층 인형의 집 단면 프레임(Open Cutaway Frame #F4ECE1) & 측면 미니 발코니/격자창 ====================
  const totalResH = 17.5; // y = 4.8 ~ 22.3
  // 뒷벽 & 좌우 측벽 (웜 크림 인형의 집 외벽)
  upperStructGroup.add(createRoundedToyMesh(W + 0.24, totalResH, 0.36, brickMainMat, 0, 4.8 + totalResH * 0.5, -D * 0.5 - 0.04, 0.1));
  upperStructGroup.add(createRoundedToyMesh(0.42, totalResH, D + 0.28, cutawayMat, -W * 0.5 - 0.04, 4.8 + totalResH * 0.5, 0, 0.1));
  upperStructGroup.add(createRoundedToyMesh(0.42, totalResH, D + 0.28, cutawayMat, W * 0.5 + 0.04, 4.8 + totalResH * 0.5, 0, 0.1));

  // 전면 양끝 도톰한 인형의 집 단면 기둥 (#F4ECE1)
  const frontCutZ = D * 0.5 + 0.1;
  upperStructGroup.add(createRoundedToyMesh(0.56, totalResH + 0.3, 0.46, cutawayMat, -W * 0.5 + 0.02, 4.8 + totalResH * 0.5, frontCutZ, 0.08));
  upperStructGroup.add(createRoundedToyMesh(0.56, totalResH + 0.3, 0.46, cutawayMat, W * 0.5 - 0.02, 4.8 + totalResH * 0.5, frontCutZ, 0.08));

  // 층간 바닥 슬래브 단면 프레임 (#F4ECE1 + 원목 엣지 몰딩)
  for (const sy of [4.76, 9.36, 14.18, 22.15]) {
    upperStructGroup.add(createRoundedToyMesh(W + 0.72, 0.42, D + 0.62, cutawayMat, 0, sy, 0.04, 0.09));
    upperStructGroup.add(createRoundedToyMesh(W + 0.76, 0.11, 0.48, warmTrimMat, 0, sy - 0.17, frontCutZ + 0.04, 0.03));
  }

  // 건물 좌·우 측면 격자 창문(Mullion Windows) & 철제 미니 발코니 난간(Juliet Iron Balcony)
  const ironMat = MAT.julietIron || MAT.castIron;
  const paneGlowMat = isHarborHotel
    ? (MAT.amberWindowGlow || MAT.mullionGlowPane || MAT.cream)
    : (MAT.mullionGlowPane || MAT.cream);
  for (const sideDir of [-1, 1]) {
    const sx = sideDir * (W * 0.5 + 0.22);
    for (const wy of [7.05, 11.75, 17.6]) {
      // 아담한 격자 창문 프레임 + 십자 살대
      upperStructGroup.add(createRoundedToyMesh(0.14, 2.25, 2.1, warmTrimMat, sx, wy, 0.15, 0.04));
      upperStructGroup.add(createRoundedToyMesh(0.16, 1.92, 1.76, paneGlowMat, sx + sideDir * 0.02, wy, 0.15, 0.02));
      upperStructGroup.add(createRoundedToyMesh(0.2, 1.96, 0.1, cutawayMat, sx + sideDir * 0.04, wy, 0.15, 0.02));
      upperStructGroup.add(createRoundedToyMesh(0.2, 0.1, 1.8, cutawayMat, sx + sideDir * 0.04, wy + 0.15, 0.15, 0.02));

      // 철제 미니 발코니 슬래브 & 세로 창살 난간 + 미니 꽃화분
      const balX = sx + sideDir * 0.36;
      upperStructGroup.add(createRoundedToyMesh(0.72, 0.14, 2.45, cutawayMat, balX - sideDir * 0.08, wy - 1.15, 0.15, 0.04));
      upperStructGroup.add(createRoundedToyMesh(0.08, 0.08, 2.42, ironMat, balX + sideDir * 0.2, wy - 0.38, 0.15, 0.02));
      for (const bz of [-0.95, -0.48, 0, 0.48, 0.95]) {
        upperStructGroup.add(createRoundedToyMesh(0.06, 0.76, 0.06, ironMat, balX + sideDir * 0.2, wy - 0.76, 0.15 + bz, 0.02));
      }
      for (const sideEnd of [-1.18, 1.18]) {
        upperStructGroup.add(createRoundedToyMesh(0.56, 0.08, 0.06, ironMat, balX, wy - 0.38, 0.15 + sideEnd, 0.02));
      }
      const planterBox = createRoundedToyMesh(0.28, 0.24, 1.1, MAT.coral, balX + sideDir * 0.06, wy - 0.96, 0.15, 0.04);
      const greenery = new THREE.Mesh(GEO.sphere, MAT.leafGreen);
      greenery.scale.set(0.18, 0.18, 0.52);
      greenery.position.set(balX + sideDir * 0.06, wy - 0.78, 0.15);
      upperStructGroup.add(planterBox, greenery);
    }
  }

  // 지붕 코니스(제2마을 하버 호텔은 유럽풍 차콜 슬레이트 경사 박공지붕 + 다락방 도머 창문 3개!) & 옥상 현판 (Sky Signboard)
  const skySignMat = new THREE.MeshBasicMaterial({ map: createBuildingSkySignTexture(bState.title) });
  if (isHarborHotel) {
    const harborGableRoof = createEuropeanGableRoofWithDormers3D(W + 0.6, D + 0.4, MAT.slateRoofCharcoal || MAT.charcoal, 3);
    harborGableRoof.position.set(0, 22.38, 0);
    upperStructGroup.add(harborGableRoof);

    const skySignFrame = createRoundedToyMesh(12.2, 2.25, 0.36, warmTrimMat, 0, 26.45, 0.2, 0.14);
    const skySignFace = new THREE.Mesh(GEO.quad, skySignMat);
    skySignFace.scale.set(11.7, 1.92, 1);
    skySignFace.position.set(0, 26.45, 0.4);
    upperStructGroup.add(skySignFrame, skySignFace);
  } else {
    const roofCapMat = makeClayMat(0xF28B66, { roughness: 0.62 });
    upperStructGroup.add(createRoundedToyMesh(W + 1.0, 0.64, D + 0.96, roofCapMat, 0, 22.58, 0, 0.14));

    const skySignFrame = createRoundedToyMesh(11.6, 2.25, 0.36, warmTrimMat, 0, 23.98, D * 0.32, 0.14);
    const skySignFace = new THREE.Mesh(GEO.quad, skySignMat);
    skySignFace.scale.set(11.1, 1.92, 1);
    skySignFace.position.set(0, 23.98, D * 0.32 + 0.2);
    upperStructGroup.add(skySignFrame, skySignFace);
  }

  // ==================== 전면 완전 개방형 인형의 집 호실 단면 기둥 & 호수 명패 (불투명 전면 벽 0%!) ====================
  const frontShellGroup = new THREE.Group();
  root.add(frontShellGroup);
  const shellMats = [];

  for (const rm of bState.rooms) {
    ensureRoomSchema(rm);
    const fz = rm.lz + rm.rd * 0.5 + 0.08;
    const fCenterY = rm.ly + rm.rh * 0.5;

    // 호실 우측 경계 단면 기둥 (인형의 집 칸막이 단면 프레임 #F4ECE1)
    const rightEdgeX = rm.lx + rm.rw * 0.5;
    if (rightEdgeX < W * 0.5 - 0.5) {
      upperStructGroup.add(createRoundedToyMesh(0.4, rm.rh + 0.08, 0.42, cutawayMat, rightEdgeX, fCenterY, fz, 0.06));
    }

    // 호실 상단 슬림 크림 헤더에 부착된 아담한 호수 명패 (방 내부 시야 가림 제로!)
    const meta = ROOM_TYPE_META[rm.layoutType] || ROOM_TYPE_META.studio;
    const plateMat = new THREE.MeshBasicMaterial({
      map: createRoomNumberPlateTexture(rm.name, meta.shortBadge, rm.unlocked),
      transparent: true
    });
    signMaterialsToRefresh.push({
      kind: 'roomPlate',
      mat: plateMat,
      numStr: rm.name,
      typeLabel: meta.shortBadge,
      unlocked: rm.unlocked
    });
    const plate = new THREE.Mesh(GEO.quad, plateMat);
    plate.scale.set(1.95, 0.54, 1);
    plate.position.set(rm.lx - rm.rw * 0.5 + 1.28, rm.ly + rm.rh - 0.06, fz + 0.26);
    upperStructGroup.add(plate);

    // 어느 각도·줌에서든 방 내부를 클릭하면 즉시 단독 룸 뷰 진입!
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
    upperStructGroup,
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

// --------------------- 1층 편의점(MINIMI MART) & 코인세탁소(BUBBLE LAUNDRY) 풀 3D 인테리어 빌더 ---------------------
function createMartGondolaShelf3D(snackKeys = ['chips', 'shrimp', 'choco', 'ramen']) {
  const grp = new THREE.Group();
  grp.add(createRoundedToyMesh(2.05, 1.78, 0.12, MAT.white, 0, 0.9, 0, 0.04));
  grp.add(createRoundedToyMesh(2.08, 0.1, 0.72, MAT.mint, 0, 1.78, 0, 0.03));

  for (let tier = 0; tier < 3; tier++) {
    const sy = 0.36 + tier * 0.48;
    grp.add(createRoundedToyMesh(2.02, 0.06, 0.68, MAT.silver, 0, sy, 0, 0.02));
    for (const sideZ of [-0.18, 0.18]) {
      for (let c = -2; c <= 2; c++) {
        const sk = snackKeys[(Math.abs(c) + tier + (sideZ > 0 ? 1 : 0)) % snackKeys.length];
        if (tier === 0 && c % 2 === 0) {
          const bento = createPhotorealBentoBox3D(0.68);
          bento.position.set(c * 0.37, sy + 0.03, sideZ);
          grp.add(bento);
        } else if (sk === 'kimbap') {
          const kb = createPhotorealKimbap3D(1.1);
          kb.position.set(c * 0.36, sy + 0.03, sideZ);
          grp.add(kb);
        } else {
          const bag = createPhotorealSnackBag3D(sk, 0.92);
          bag.rotation.y = sideZ > 0 ? 0 : Math.PI;
          bag.position.set(c * 0.36, sy + 0.03, sideZ);
          grp.add(bag);
        }
      }
    }
  }
  return grp;
}

function createMartBlueLedChiller3D() {
  const grp = new THREE.Group();
  grp.add(createRoundedToyMesh(1.75, 2.75, 0.78, MAT.silver, 0, 1.38, 0, 0.07));
  grp.add(createRoundedToyMesh(1.78, 0.22, 0.82, MAT.sky, 0, 2.68, 0, 0.05));
  // 파란색 LED 백라이트 내벽 (고휘도 아이스 블루 발광)
  grp.add(createRoundedToyMesh(1.56, 2.34, 0.08, MAT.chillerBlueLed, 0, 1.38, -0.26, 0.03, false, false, false));
  for (let sh = 0; sh < 4; sh++) {
    const sy = 0.46 + sh * 0.55;
    grp.add(createRoundedToyMesh(1.54, 0.05, 0.56, MAT.white, 0, sy, 0.02, 0.01));
    for (let cx = -2; cx <= 2; cx++) {
      const can = createPhotorealBeverageCan3D((sh + cx) % 2 === 0 ? 'cola' : 'beer', 1.12);
      can.position.set(cx * 0.27, sy + 0.03, 0.12);
      grp.add(can);
    }
  }
  // 투명 강화유리 도어 2짝 + 크롬 손잡이
  const glassDoor = new THREE.Mesh(new THREE.BoxGeometry(1.58, 2.36, 0.04), MAT.cutawayGlass);
  glassDoor.position.set(0, 1.38, 0.38);
  grp.add(glassDoor);
  grp.add(createRoundedToyMesh(0.05, 0.65, 0.06, MAT.pureGold24k, -0.07, 1.38, 0.42, 0.01));
  grp.add(createRoundedToyMesh(0.05, 0.65, 0.06, MAT.pureGold24k, 0.07, 1.38, 0.42, 0.01));
  return grp;
}

function build1FMinimiMartInterior3D(martGrp, lotId) {
  clearGroupChildren(martGrp);
  const fSt = state.firstFloorShops?.shop_mart1f;
  const hasExtraGondola = !!fSt?.upgrades?.upg_mart_gondola;
  const hasExtraFridge = !!fSt?.upgrades?.upg_mart_fridge;
  const hasExtraRamen = !!fSt?.upgrades?.upg_mart_ramenbar;

  // 밝은 편의점 타일 바닥 + 백색 포인트 조명
  martGrp.add(createRoundedToyMesh(9.5, 0.08, 7.6, MAT.white, 0, 0.04, 0, 0.04));
  const ptLight = new THREE.PointLight(0xFFFFFF, 1.85, 16);
  ptLight.position.set(0, 3.45, 0.4);
  martGrp.add(ptLight);

  // ① 뒷벽 블루 LED 음료·맥주 냉장 쇼케이스 (기본 3베이, 증설 시 4베이 풀벽면!)
  const chillerXs = hasExtraFridge ? [-3.4, -1.45, 0.5, 2.45] : [-3.1, -1.1, 0.9];
  for (const cx of chillerXs) {
    const ch = createMartBlueLedChiller3D();
    ch.position.set(cx, 0.08, -3.28);
    martGrp.add(ch);
  }

  // ② 중앙 실사 과자·라면·도시락 곤돌라 진열 매대 3열!
  const shelfRows = [
    { x: -2.65, z: -0.35, keys: ['chips', 'shrimp', 'cheese', 'kimbap'] },
    { x: -0.25, z: -0.35, keys: ['strawberry', 'choco', 'matcha', 'chips'] },
    { x: 2.1,   z: -0.35, keys: ['ramen', 'shrimp', 'cola', 'kimbap'] }
  ];
  for (const sr of shelfRows) {
    const sh = createMartGondolaShelf3D(sr.keys);
    sh.scale.setScalar(hasExtraGondola ? 1.08 : 0.98);
    sh.rotation.y = Math.PI * 0.5;
    sh.position.set(sr.x, 0.08, sr.z);
    martGrp.add(sh);
  }

  // ③ 입구 우측 POS 계산대 카운터 & 민트 조끼 유니폼 알바생!
  martGrp.add(createRoundedToyMesh(2.25, 0.98, 0.86, MAT.mint, 3.35, 0.56, 1.35, 0.07));
  martGrp.add(createRoundedToyMesh(2.35, 0.1, 0.94, MAT.white, 3.35, 1.08, 1.35, 0.03));
  // 듀얼 스크린 POS기 + 바코드 스캐너 + 삼각김밥/도시락 진열
  martGrp.add(createRoundedToyMesh(0.44, 0.36, 0.28, MAT.charcoal, 2.85, 1.28, 1.35, 0.04));
  martGrp.add(createRoundedToyMesh(0.38, 0.24, 0.05, MAT.screenCyan, 2.85, 1.32, 1.5, 0.02));
  const posBento = createPhotorealBentoBox3D(0.76);
  posBento.position.set(3.75, 1.13, 1.35);
  martGrp.add(posBento);

  // 카운터 뒤 원목 발판 단상으로 알바생 상반신과 미소가 선명하게 보이도록 설계
  martGrp.add(createRoundedToyMesh(1.35, 0.22, 0.86, MAT.woodWarm, 3.45, 0.18, 0.42, 0.04));
  const clerk = createChibiPerson3D('mart_clerk');
  clerk.position.set(3.45, 0.3, 0.42);
  martGrp.add(clerk);

  // ④ 전면 통유리 창가 쪽 컵라면 취식용 바 테이블 + 스툴 의자 3개 + 전자레인지 & 온수기!
  const barW = hasExtraRamen ? 4.8 : 3.8;
  martGrp.add(createRoundedToyMesh(barW, 0.1, 0.62, MAT.woodLight, -1.65, 0.96, 3.18, 0.04));
  martGrp.add(createRoundedToyMesh(0.14, 0.9, 0.52, MAT.ironSteel, -1.65 - barW * 0.44, 0.5, 3.18, 0.03));
  martGrp.add(createRoundedToyMesh(0.14, 0.9, 0.52, MAT.ironSteel, -1.65 + barW * 0.44, 0.5, 3.18, 0.03));
  // 전자레인지 & 온수기 디스펜서
  martGrp.add(createRoundedToyMesh(0.64, 0.4, 0.44, MAT.white, -3.55, 1.21, 3.15, 0.04));
  martGrp.add(createRoundedToyMesh(0.4, 0.26, 0.05, MAT.screenCyan, -3.62, 1.21, 2.92, 0.02));
  martGrp.add(createRoundedToyMesh(0.38, 0.54, 0.38, MAT.silver, -2.95, 1.28, 3.15, 0.04));

  // 창가 스툴 의자 & 실사 컵라면 용기
  for (let si = -1; si <= 1; si++) {
    const sx = -1.35 + si * 0.92;
    const stoolTop = new THREE.Mesh(GEO.cyl, MAT.coral);
    stoolTop.scale.set(0.42, 0.08, 0.42);
    stoolTop.position.set(sx, 0.64, 2.55);
    const stoolLeg = new THREE.Mesh(GEO.cyl, MAT.ironSteel);
    stoolLeg.scale.set(0.08, 0.6, 0.08);
    stoolLeg.position.set(sx, 0.34, 2.55);
    const ramenCup = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.22, 16), MAT.snackMats?.ramen || MAT.coral);
    ramenCup.position.set(sx, 1.12, 3.16);
    martGrp.add(stoolTop, stoolLeg, ramenCup);
  }

  // [스마트 매장 일상 루틴 AI] 메인 빌딩 1층 편의점 손님 2명(통로 보행 ➔ 과자 고르기 ➔ POS 계산 ➔ 창가 취식) 등록!
  if (lotId === 'lot_main') {
    shopSmartAI.martClerk = clerk;
    shopSmartAI.martCustomers = [];
    const roles = ['student', 'developer'];
    for (let ci = 0; ci < 2; ci++) {
      const cust = createChibiPerson3D(roles[ci], null, ci + 3);
      const aisleX = ci === 0 ? -1.45 : 0.92;
      cust.position.set(aisleX, 0.08, ci === 0 ? -0.25 : 1.95);
      martGrp.add(cust);
      shopSmartAI.martCustomers.push({
        mesh: cust,
        slotIdx: ci,
        aisleX,
        phase: ci === 0 ? 'browse_shelf' : 'walk_to_shelf',
        timer: ci === 0 ? 2.4 : 0,
        waypoints: ci === 0 ? [] : [{ x: aisleX, z: 1.95 }, { x: aisleX, z: -0.18 }],
        wpIdx: 0
      });
    }
  }
}

function createStackedDrumWasherPair3D() {
  const grp = new THREE.Group();
  // 하단 대용량 드럼세탁기 + 상단 대형 회전 건조기 (2단 스택!)
  for (let tier = 0; tier < 2; tier++) {
    const cy = 0.82 + tier * 1.56;
    const cabMat = tier === 0 ? MAT.white : makeClayMat(0xF0F9FF, { roughness: 0.34 });
    grp.add(createRoundedToyMesh(1.38, 1.48, 1.05, cabMat, 0, cy, 0, 0.09));
    // 상단 컨트롤 패널 & LED 다이얼
    grp.add(createRoundedToyMesh(1.28, 0.22, 0.08, MAT.sky, 0, cy + 0.56, 0.52, 0.03));
    grp.add(createRoundedToyMesh(0.32, 0.12, 0.09, MAT.screenCyan, -0.32, cy + 0.56, 0.54, 0.02));

    // 원형 크롬 도어 베젤 + 투명 유리창
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.075, 14, 28), MAT.chromeAlloy);
    bezel.position.set(0, cy - 0.08, 0.54);
    const portholeGlass = new THREE.Mesh(new THREE.CircleGeometry(0.39, 24), MAT.cutawayGlass);
    portholeGlass.position.set(0, cy - 0.08, 0.56);
    grp.add(bezel, portholeGlass);

    // 원형 유리창 안에서 실제로 빙글빙글 회전(rotation.z)하는 빨랫감 & 비눗방울 클러스터!
    const spinPivot = new THREE.Group();
    spinPivot.position.set(0, cy - 0.08, 0.44);
    const clothCols = [MAT.coral, MAT.sky, MAT.duckYellow, MAT.mint, MAT.pinkSoft];
    for (let k = 0; k < 5; k++) {
      const ang = (k / 5) * Math.PI * 2;
      const cloth = new THREE.Mesh(GEO.sphere, clothCols[k]);
      cloth.scale.set(0.24, 0.17, 0.16);
      cloth.position.set(Math.cos(ang) * 0.2, Math.sin(ang) * 0.2, 0);
      cloth.rotation.z = ang;
      spinPivot.add(cloth);
    }
    for (let b = 0; b < 4; b++) {
      const ang = (b / 4) * Math.PI * 2 + 0.4;
      const sud = new THREE.Mesh(GEO.sphere, MAT.white);
      sud.scale.setScalar(0.11);
      sud.position.set(Math.cos(ang) * 0.26, Math.sin(ang) * 0.26, 0.05);
      spinPivot.add(sud);
    }
    grp.add(spinPivot);
    spinningWashers.push(spinPivot);
  }
  return grp;
}

function build1FBubbleLaundryInterior3D(washGrp, lotId) {
  clearGroupChildren(washGrp);
  const fSt = state.firstFloorShops?.shop_wash1f;
  const hasExtraDrum = !!fSt?.upgrades?.upg_wash_drum6;
  const hasExtraVending = !!fSt?.upgrades?.upg_wash_vending;
  const hasExtraLounge = !!fSt?.upgrades?.upg_wash_lounge;

  // 따뜻한 우드&민트 바닥 + 밝은 스카이화이트 조명
  washGrp.add(createRoundedToyMesh(9.5, 0.08, 7.6, makeClayMat(0xFFFFFF, { map: TEX.floor1, roughness: 0.52 }), 0, 0.04, 0, 0.04));
  const ptLight = new THREE.PointLight(0xF0F9FF, 1.85, 16);
  ptLight.position.set(0, 3.45, 0.4);
  washGrp.add(ptLight);

  // ① 뒷벽을 따라 일렬로 배치된 상하 2단 대형 회전 드럼세탁기 & 건조기 3열(= 6대! 증설 시 4열=8대!)
  const stackXs = hasExtraDrum ? [-3.3, -1.45, 0.4, 2.25] : [-2.85, -0.95, 0.95];
  for (const wx of stackXs) {
    const pair = createStackedDrumWasherPair3D();
    pair.position.set(wx, 0.08, -3.05);
    washGrp.add(pair);
  }

  // ② 파란색 스마트 세제 자판기 & 빨간/골드 동전 교환기
  const vendX = 3.65;
  washGrp.add(createRoundedToyMesh(1.18, 2.25, 0.78, MAT.sky, vendX, 1.2, -2.55, 0.08));
  washGrp.add(createRoundedToyMesh(0.88, 0.95, 0.06, MAT.screenCyan, vendX, 1.56, -2.14, 0.03));
  washGrp.add(createRoundedToyMesh(0.72, 0.24, 0.08, MAT.charcoal, vendX, 0.62, -2.14, 0.02));

  washGrp.add(createRoundedToyMesh(0.86, 1.75, 0.68, hasExtraVending ? MAT.pureGold24k : MAT.butter, vendX, 0.95, -0.95, 0.07));
  washGrp.add(createRoundedToyMesh(0.56, 0.42, 0.06, MAT.coral, vendX, 1.28, -0.59, 0.02));

  // ③ 매장 중앙 바퀴 달린 빨래 바구니 카트 (Wheeled Laundry Cart) 2대!
  const cartPositions = hasExtraLounge ? [[-2.35, 0.55], [1.65, 0.65]] : [[-1.85, 0.55]];
  for (const [cx, cz] of cartPositions) {
    const cart = new THREE.Group();
    cart.add(createRoundedToyMesh(0.96, 0.58, 0.68, MAT.chromeAlloy, 0, 0.56, 0, 0.06));
    // 바구니 속 뽀송뽀송한 수건 더미
    cart.add(createRoundedToyMesh(0.76, 0.28, 0.5, MAT.pinkSoft, 0, 0.82, 0, 0.07));
    cart.add(createRoundedToyMesh(0.62, 0.2, 0.42, MAT.white, 0.04, 0.98, 0, 0.06));
    for (const [wx, wz] of [[-0.36, -0.24], [0.36, -0.24], [-0.36, 0.24], [0.36, 0.24]]) {
      const caster = new THREE.Mesh(GEO.sphere, MAT.charcoal);
      caster.scale.setScalar(0.15);
      caster.position.set(wx, 0.14, wz);
      cart.add(caster);
    }
    cart.position.set(cx, 0.08, cz);
    washGrp.add(cart);
  }

  // ④ 빨래 개는 원목 폴딩 테이블 + 개어 놓은 파스텔 빨래 더미
  washGrp.add(createRoundedToyMesh(2.45, 0.12, 1.05, MAT.woodWarm, 0.15, 0.92, 0.72, 0.05));
  for (const [lx, lz] of [[-0.96, 0.36], [1.26, 0.36], [-0.96, 1.08], [1.26, 1.08]]) {
    washGrp.add(createRoundedToyMesh(0.12, 0.84, 0.12, MAT.woodDark, lx, 0.46, lz, 0.02));
  }
  // 접힌 옷 스택
  washGrp.add(createRoundedToyMesh(0.52, 0.12, 0.42, MAT.mintSoft, -0.35, 1.04, 0.72, 0.03));
  washGrp.add(createRoundedToyMesh(0.5, 0.12, 0.4, MAT.white, -0.35, 1.16, 0.72, 0.03));
  washGrp.add(createRoundedToyMesh(0.52, 0.12, 0.42, MAT.butter, 0.45, 1.04, 0.72, 0.03));

  // ⑤ 창가 쪽 손님용 원목 대기 벤치 & 매니저/손님 캐릭터!
  const waitBench = createParkBench3D(Math.PI);
  waitBench.position.set(-1.55, 0.08, 2.85);
  washGrp.add(waitBench);

  const washStaff = createChibiPerson3D('wash_clerk');
  washStaff.position.set(2.45, 0.08, 1.95);
  washGrp.add(washStaff);

  // [스마트 매장 일상 루틴 AI] 1층 코인세탁소 손님 2명(드럼세탁기 앞 투입 ➔ 대기 벤치 착석 스마트폰 ➔ 원목 테이블 빨래 개기) 등록!
  if (lotId === 'lot_main') {
    shopSmartAI.washClerk = washStaff;
    shopSmartAI.washCustomers = [];
    const roles = ['newlywed', 'streamer'];
    for (let wi = 0; wi < 2; wi++) {
      const cust = createChibiPerson3D(roles[wi], null, wi + 6);
      const targetWasherX = wi === 0 ? -2.85 : 0.95;
      cust.position.set(wi === 0 ? targetWasherX : -1.55, 0.08, wi === 0 ? -1.82 : 2.62);
      washGrp.add(cust);
      shopSmartAI.washCustomers.push({
        mesh: cust,
        slotIdx: wi,
        washerX: targetWasherX,
        phase: wi === 0 ? 'load_washer' : 'wait_bench',
        timer: wi === 0 ? 2.6 : 3.4,
        waypoints: [],
        wpIdx: 0
      });
    }
  }
}

// --------------------- 16종 고디테일 다중 파츠 인테리어 가구 & 방음 패드 타일 3D ---------------------
function createCatalogBed3D(bedId) {
  if (bedId === 'bed_jacuzzi') {
    return create3DOceanJacuzziMesh();
  }
  if (bedId === 'bed_golden_float') {
    const fg = new THREE.Group();
    const goldMat = MAT.pureGold24k || MAT.gold;
    const haloMat = makeClayMat(0xFDE047, { emissive: 0xF59E0B, emissiveIntensity: 0.9, roughness: 0.15 });
    const haloRing = new THREE.Mesh(new THREE.TorusGeometry(1.38, 0.08, 12, 32), haloMat);
    haloRing.rotation.x = Math.PI * 0.5;
    haloRing.position.y = 0.14;
    fg.add(haloRing);
    // 공중 부양(y=0.52) 24K 순금 킹 베드 프레임 + 실크 화이트 구스다운 + 골드 왕관 헤드보드
    fg.add(createRoundedToyMesh(2.68, 0.28, 2.86, goldMat, 0, 0.56, 0, 0.1));
    fg.add(createRoundedToyMesh(2.74, 1.48, 0.22, goldMat, 0, 1.18, -1.36, 0.08));
    fg.add(createRoundedToyMesh(2.48, 0.24, 2.64, MAT.white, 0, 0.82, 0.04, 0.09));
    fg.add(createRoundedToyMesh(2.5, 0.24, 1.72, goldMat, 0, 0.92, 0.46, 0.09));
    fg.add(createRoundedToyMesh(0.95, 0.22, 0.52, MAT.white, -0.58, 1.02, -0.92, 0.07));
    fg.add(createRoundedToyMesh(0.95, 0.22, 0.52, MAT.white, 0.58, 1.02, -0.92, 0.07));
    return fg;
  }
  if (bedId === 'bed_wood_single') {
    const wg = new THREE.Group();
    wg.add(createRoundedToyMesh(2.05, 0.26, 2.55, MAT.woodWarm, 0, 0.26, 0, 0.06));
    wg.add(createRoundedToyMesh(2.08, 1.05, 0.16, MAT.woodDark, 0, 0.68, -1.24, 0.05));
    wg.add(createRoundedToyMesh(1.92, 0.22, 2.38, MAT.white, 0, 0.48, 0.02, 0.06));
    wg.add(createRoundedToyMesh(1.94, 0.2, 1.52, MAT.mintSoft, 0, 0.56, 0.42, 0.07));
    wg.add(createRoundedToyMesh(0.86, 0.18, 0.46, MAT.white, 0, 0.68, -0.86, 0.06));
    return wg;
  }
  const grp = new THREE.Group();
  const addLegs = (w, d, mat) => {
    for (const [lx, lz] of [[-w * 0.45, -d * 0.45], [w * 0.45, -d * 0.45], [-w * 0.45, d * 0.45], [w * 0.45, d * 0.45]]) {
      grp.add(createRoundedToyMesh(0.14, 0.24, 0.14, mat, lx, 0.12, lz, 0.03));
    }
  };

  if (bedId === 'bed_iron') {
    addLegs(2.05, 2.55, MAT.ironSteel);
    grp.add(createRoundedToyMesh(2.12, 0.24, 2.62, MAT.ironSteel, 0, 0.28, 0, 0.06)); // 철제 프레임
    // 철제 창살 헤드보드 & 풋보드
    grp.add(createRoundedToyMesh(2.16, 1.08, 0.12, MAT.ironSteel, 0, 0.68, -1.28, 0.04));
    grp.add(createRoundedToyMesh(2.16, 0.62, 0.1, MAT.ironSteel, 0, 0.46, 1.28, 0.04));
    for (let s = -3; s <= 3; s++) {
      grp.add(createRoundedToyMesh(0.05, 0.82, 0.05, MAT.silver, s * 0.26, 0.68, -1.28, 0.01));
    }
    // 2단 매트리스 + 접힌 스카이 이불 + 폭신한 베개 2개
    grp.add(createRoundedToyMesh(1.98, 0.2, 2.44, MAT.cream, 0, 0.48, 0.02, 0.06));
    grp.add(createRoundedToyMesh(1.94, 0.18, 2.38, MAT.white, 0, 0.64, 0.02, 0.07));
    grp.add(createRoundedToyMesh(1.98, 0.22, 1.56, MAT.sky, 0, 0.68, 0.44, 0.08));
    grp.add(createRoundedToyMesh(1.99, 0.09, 0.34, MAT.white, 0, 0.78, -0.26, 0.03)); // 접힌 시트 칼라
    grp.add(createRoundedToyMesh(0.78, 0.18, 0.48, MAT.white, -0.46, 0.8, -0.88, 0.06));
    grp.add(createRoundedToyMesh(0.78, 0.18, 0.48, MAT.white, 0.46, 0.8, -0.88, 0.06));
  } else if (bedId === 'bed_queen') {
    addLegs(2.5, 2.8, MAT.woodDark);
    grp.add(createRoundedToyMesh(2.58, 0.28, 2.86, MAT.woodWarm, 0, 0.3, 0, 0.08));
    grp.add(createRoundedToyMesh(2.64, 1.28, 0.18, MAT.woodDark, 0, 0.76, -1.36, 0.06)); // 원목 몰딩 헤드보드
    grp.add(createRoundedToyMesh(2.24, 0.68, 0.08, MAT.leatherCamel, 0, 0.86, -1.26, 0.04)); // 쿠션 헤드패드
    // 2단 호텔 매트리스 + 접힌 세이지민트 구스다운 이불 + 베개 2개 + 협탁 스탠드
    grp.add(createRoundedToyMesh(2.42, 0.22, 2.66, MAT.cream, 0, 0.52, 0.04, 0.07));
    grp.add(createRoundedToyMesh(2.38, 0.2, 2.6, MAT.white, 0, 0.7, 0.04, 0.08));
    grp.add(createRoundedToyMesh(2.42, 0.24, 1.68, MAT.mintSoft, 0, 0.75, 0.48, 0.09));
    grp.add(createRoundedToyMesh(2.44, 0.08, 0.38, MAT.mint, 0, 0.86, -0.28, 0.03));
    grp.add(createRoundedToyMesh(0.9, 0.2, 0.52, MAT.white, -0.56, 0.88, -0.92, 0.07));
    grp.add(createRoundedToyMesh(0.9, 0.2, 0.52, MAT.white, 0.56, 0.88, -0.92, 0.07));
  } else if (bedId === 'bed_canopy') {
    addLegs(2.55, 2.8, MAT.pureGold24k);
    grp.add(createRoundedToyMesh(2.62, 0.32, 2.88, MAT.white, 0, 0.34, 0, 0.09));
    grp.add(createRoundedToyMesh(2.64, 1.36, 0.18, MAT.pinkSoft, 0, 0.82, -1.36, 0.08));
    grp.add(createRoundedToyMesh(2.44, 0.22, 2.68, MAT.cream, 0, 0.58, 0.04, 0.08));
    grp.add(createRoundedToyMesh(2.4, 0.22, 2.62, MAT.white, 0, 0.76, 0.04, 0.08));
    grp.add(createRoundedToyMesh(2.44, 0.25, 1.72, MAT.pinkSoft, 0, 0.82, 0.48, 0.09));
    grp.add(createRoundedToyMesh(2.45, 0.09, 0.38, MAT.coral, 0, 0.93, -0.28, 0.03));
    grp.add(createRoundedToyMesh(0.92, 0.22, 0.52, MAT.white, -0.56, 0.94, -0.92, 0.07));
    grp.add(createRoundedToyMesh(0.92, 0.22, 0.52, MAT.white, 0.56, 0.94, -0.92, 0.07));
    for (const [px, pz] of [[-1.24, -1.34], [1.24, -1.34], [-1.24, 1.34], [1.24, 1.34]]) {
      grp.add(createRoundedToyMesh(0.12, 2.48, 0.12, MAT.pureGold24k, px, 1.36, pz, 0.03));
      const finial = new THREE.Mesh(GEO.sphere, MAT.pureGold24k);
      finial.scale.setScalar(0.2);
      finial.position.set(px, 2.66, pz);
      grp.add(finial);
    }
    const laceTop = createRoundedToyMesh(2.72, 0.22, 2.94, MAT.canopyLace, 0, 2.54, 0, 0.08, false, false, false);
    grp.add(laceTop);
  } else {
    // bed_bunk 패밀리 원목 2층 침대 (1층+2층 2단 매트리스·이불·베개·안전난간·사다리 풀구성)
    for (const [px, pz] of [[-1.12, -1.32], [1.12, -1.32], [-1.12, 1.32], [1.12, 1.32]]) {
      grp.add(createRoundedToyMesh(0.15, 2.48, 0.15, MAT.woodDark, px, 1.26, pz, 0.03));
    }
    for (const [by, quiltMat] of [[0.36, MAT.butter], [1.76, MAT.coral]]) {
      grp.add(createRoundedToyMesh(2.32, 0.22, 2.76, MAT.woodWarm, 0, by, 0, 0.06));
      grp.add(createRoundedToyMesh(2.14, 0.2, 2.58, MAT.white, 0, by + 0.18, 0, 0.06));
      grp.add(createRoundedToyMesh(2.16, 0.18, 1.65, quiltMat, 0, by + 0.24, 0.42, 0.06));
      grp.add(createRoundedToyMesh(0.76, 0.16, 0.46, MAT.white, -0.48, by + 0.33, -0.88, 0.05));
      grp.add(createRoundedToyMesh(0.76, 0.16, 0.46, MAT.white, 0.48, by + 0.33, -0.88, 0.05));
    }
    // 2층 안전 가드레일 & 5단 원목 사다리
    grp.add(createRoundedToyMesh(1.45, 0.32, 0.08, MAT.woodWarm, -0.35, 2.12, 1.34, 0.03));
    grp.add(createRoundedToyMesh(0.09, 1.85, 0.09, MAT.woodDark, 0.42, 1.15, 1.4, 0.02));
    grp.add(createRoundedToyMesh(0.09, 1.85, 0.09, MAT.woodDark, 0.96, 1.15, 1.4, 0.02));
    for (let s = 0; s < 5; s++) {
      grp.add(createRoundedToyMesh(0.56, 0.07, 0.08, MAT.woodLight, 0.69, 0.42 + s * 0.36, 1.4, 0.02));
    }
  }
  return grp;
}

function createCatalogSofa3D(sofaId) {
  if (sofaId === 'sofa_piano') {
    return create3DGrandPianoMesh();
  }
  if (sofaId === 'sofa_gold_piano') {
    const gp = create3DGrandPianoMesh();
    const goldMat = MAT.pureGold24k || MAT.gold;
    gp.traverse((c) => {
      if (c.isMesh && c.material && c.material !== MAT.white && c.material !== MAT.supercarRed) {
        c.material = goldMat;
      }
    });
    return gp;
  }
  if (sofaId === 'sofa_simple_lamp') {
    const lg = new THREE.Group();
    const base = new THREE.Mesh(GEO.cyl, MAT.woodWarm);
    base.scale.set(0.55, 0.08, 0.55);
    base.position.set(-0.65, 0.04, -0.2);
    const pole = new THREE.Mesh(GEO.cyl, MAT.woodDark);
    pole.scale.set(0.08, 1.55, 0.08);
    pole.position.set(-0.65, 0.82, -0.2);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.44, 18), MAT.pendantBulbWarm || MAT.butter);
    shade.position.set(-0.65, 1.62, -0.2);
    const stool = createRoundedToyMesh(0.95, 0.46, 0.95, MAT.mintSoft, 0.42, 0.25, 0.15, 0.09);
    lg.add(base, pole, shade, stool);
    return lg;
  }
  const grp = new THREE.Group();
  if (sofaId === 'sofa_beanbag') {
    const rug = new THREE.Mesh(GEO.cyl, MAT.mintSoft);
    rug.scale.set(1.9, 0.04, 1.9);
    rug.position.y = 0.02;
    const puff = new THREE.Mesh(getPuffyDomeGeo(0.88, 0.96), MAT.duckYellow);
    puff.position.y = 0.46;
    addToonHullOutline(puff, 1.06);
    const cushion = createRoundedToyMesh(0.54, 0.36, 0.22, MAT.coral, 0.12, 0.68, 0.16, 0.08);
    cushion.rotation.z = -0.25;
    const footPouf = new THREE.Mesh(getPuffyDomeGeo(0.38, 0.34), MAT.cream);
    footPouf.position.set(0.68, 0.18, 0.58);
    grp.add(rug, puff, cushion, footPouf);
  } else if (sofaId === 'sofa_mint2') {
    for (const [lx, lz] of [[-1.02, -0.38], [1.02, -0.38], [-1.02, 0.38], [1.02, 0.38]]) {
      grp.add(createRoundedToyMesh(0.11, 0.22, 0.11, MAT.woodWarm, lx, 0.11, lz, 0.02));
    }
    grp.add(createRoundedToyMesh(2.38, 0.26, 1.06, MAT.mint, 0, 0.32, 0, 0.09));
    // 좌·우 독립 시트 쿠션 2개 + 푹신한 등받이 쿠션 2개 + 롤 암레스트 + 포인트 쿠션
    for (const cx of [-0.54, 0.54]) {
      grp.add(createRoundedToyMesh(1.02, 0.2, 0.86, MAT.mintSoft, cx, 0.52, 0.05, 0.07));
      grp.add(createRoundedToyMesh(1.02, 0.58, 0.26, MAT.mint, cx, 0.82, -0.36, 0.08));
    }
    grp.add(createRoundedToyMesh(0.28, 0.56, 1.04, MAT.mint, -1.14, 0.58, 0, 0.09));
    grp.add(createRoundedToyMesh(0.28, 0.56, 1.04, MAT.mint, 1.14, 0.58, 0, 0.09));
    grp.add(createRoundedToyMesh(0.42, 0.38, 0.16, MAT.butter, -0.78, 0.74, -0.14, 0.06));
    grp.add(createRoundedToyMesh(0.42, 0.38, 0.16, MAT.coral, 0.78, 0.74, -0.14, 0.06));
  } else if (sofaId === 'sofa_rocker') {
    for (const ox of [-0.92, 0.92]) {
      const ch = new THREE.Group();
      ch.add(createRoundedToyMesh(0.12, 0.12, 1.08, MAT.woodDark, -0.38, 0.08, 0, 0.04));
      ch.add(createRoundedToyMesh(0.12, 0.12, 1.08, MAT.woodDark, 0.38, 0.08, 0, 0.04));
      ch.add(createRoundedToyMesh(0.95, 0.14, 0.92, MAT.woodWarm, 0, 0.48, 0, 0.05));
      ch.add(createRoundedToyMesh(0.92, 0.88, 0.14, MAT.woodDark, 0, 0.92, -0.38, 0.05));
      ch.add(createRoundedToyMesh(0.78, 0.18, 0.76, MAT.coral, 0, 0.6, 0.04, 0.06));
      ch.position.x = ox;
      grp.add(ch);
    }
    grp.add(createRoundedToyMesh(0.74, 0.58, 0.74, MAT.woodLight, 0, 0.3, 0.1, 0.08));
    const cup = create3DGiftPropMesh('item_coffee', false);
    cup.scale.setScalar(0.85);
    cup.position.set(0, 0.6, 0.1);
    grp.add(cup);
  } else {
    // sofa_leather_l 프리미엄 가죽 L자형 카우치 소파 + 원목 커피테이블
    grp.add(createRoundedToyMesh(2.92, 0.34, 1.14, MAT.leatherCamel, -0.25, 0.3, 0, 0.1));
    for (const cx of [-1.15, -0.25, 0.65]) {
      grp.add(createRoundedToyMesh(0.86, 0.2, 0.92, MAT.leatherCamel, cx, 0.54, 0.05, 0.07));
      grp.add(createRoundedToyMesh(0.86, 0.58, 0.28, MAT.leatherCamel, cx, 0.84, -0.4, 0.08));
    }
    grp.add(createRoundedToyMesh(1.08, 0.52, 2.1, MAT.leatherCamel, 0.76, 0.38, 0.58, 0.1));
    grp.add(createRoundedToyMesh(0.46, 0.4, 0.18, MAT.cream, -1.18, 0.76, -0.15, 0.06));
    grp.add(createRoundedToyMesh(1.42, 0.36, 0.78, MAT.woodLight, -0.68, 0.22, 1.18, 0.06));
  }
  return grp;
}

function createCatalogAppliance3D(appId, rw = 8.5, rd = 7.2, rh = 4.2) {
  if (appId === 'app_winecellar') {
    return create3DWineCellarAndChandelierMesh(rh, rd);
  }
  if (appId === 'app_mini_fridge') {
    const mg = new THREE.Group();
    const fx = rw * 0.26;
    const fz = -rd * 0.28;
    mg.add(createRoundedToyMesh(1.05, 1.58, 0.88, MAT.mint, fx, 0.84, fz, 0.12));
    mg.add(createRoundedToyMesh(0.08, 0.42, 0.1, MAT.chromeAlloy, fx - 0.36, 1.12, fz + 0.46, 0.03));
    mg.add(createRoundedToyMesh(0.98, 0.04, 0.9, MAT.white, fx, 1.18, fz, 0.01));
    return mg;
  }
  if (appId === 'app_aquarium') {
    const aq = new THREE.Group();
    const ax = 0;
    const az = -rd * 0.5 + 0.58;
    const waterGlow = new THREE.MeshPhysicalMaterial({
      color: 0x06B6D4,
      emissive: 0x0284C7,
      emissiveIntensity: 0.58,
      roughness: 0.1,
      transmission: 0.45,
      transparent: true,
      opacity: 0.86
    });
    aq.add(createRoundedToyMesh(3.85, 0.58, 0.86, MAT.pureGold24k || MAT.gold, ax, 0.32, az, 0.07));
    aq.add(createRoundedToyMesh(3.75, 1.95, 0.72, waterGlow, ax, 1.58, az, 0.06, false, false, false));
    aq.add(createRoundedToyMesh(3.88, 0.2, 0.88, MAT.pureGold24k || MAT.gold, ax, 2.64, az, 0.06));
    const coralCols = [MAT.coral, MAT.pinkSoft, MAT.duckYellow, MAT.mint];
    for (let c = -3; c <= 3; c++) {
      const cr = new THREE.Mesh(GEO.sphere, coralCols[Math.abs(c) % coralCols.length]);
      cr.scale.set(0.24, 0.38 + (Math.abs(c) % 2) * 0.18, 0.22);
      cr.position.set(ax + c * 0.46, 0.86, az);
      aq.add(cr);
    }
    for (let f = 0; f < 5; f++) {
      const fish = new THREE.Mesh(GEO.sphere, f % 2 === 0 ? MAT.gold : MAT.coral);
      fish.scale.set(0.24, 0.13, 0.1);
      fish.position.set(ax - 1.2 + f * 0.62, 1.38 + (f % 3) * 0.32, az + 0.08);
      aq.add(fish);
    }
    return aq;
  }
  const grp = new THREE.Group();
  if (appId === 'app_fan') {
    const fx = rw * 0.26;
    const fz = -rd * 0.26;
    const base = new THREE.Mesh(GEO.cyl, MAT.white);
    base.scale.set(0.62, 0.12, 0.62);
    base.position.set(fx, 0.12, fz);
    const pole = new THREE.Mesh(GEO.cyl, MAT.chromeAlloy);
    pole.scale.set(0.09, 1.2, 0.09);
    pole.position.set(fx, 0.72, fz);
    const motor = createRoundedToyMesh(0.28, 0.26, 0.32, MAT.white, fx, 1.34, fz - 0.06, 0.06);
    const cage = new THREE.Mesh(GEO.torus, MAT.sky);
    cage.scale.setScalar(0.72);
    cage.position.set(fx, 1.34, fz + 0.12);
    const bladeGrp = new THREE.Group();
    bladeGrp.position.set(fx, 1.34, fz + 0.11);
    for (let b = 0; b < 3; b++) {
      const bl = createRoundedToyMesh(0.48, 0.11, 0.03, MAT.sky, 0, 0, 0, 0.02);
      bl.rotation.z = (b / 3) * Math.PI * 2;
      bladeGrp.add(bl);
    }
    spinningFans.push(bladeGrp);
    grp.add(base, pole, motor, cage, bladeGrp);
  } else if (appId === 'app_ac') {
    // 시네마 빔프로젝터 (원목 3각 삼각대 + 렌즈 경통 + 투명 볼류메트릭 빛줄기 + 상단 롤스크린!)
    const screenY = Math.min(2.62, rh - 1.15);
    const screenZ = -rd * 0.5 + 0.25;
    grp.add(createRoundedToyMesh(3.05, 0.18, 0.2, MAT.charcoal, 0, screenY + 0.86, screenZ, 0.05)); // 롤스크린 하우징
    grp.add(createRoundedToyMesh(2.9, 1.58, 0.08, MAT.white, 0, screenY, screenZ, 0.04));
    grp.add(createRoundedToyMesh(2.68, 1.36, 0.06, MAT.screenCyan, 0, screenY, screenZ + 0.04, 0.03));

    const px = 0.0;
    const pz = 1.05;
    // 원목 3각 삼각대 다리 3개
    for (const [angX, angZ] of [[0, 0.24], [-0.22, -0.16], [0.22, -0.16]]) {
      const leg = new THREE.Mesh(GEO.cyl, MAT.woodDark);
      leg.scale.set(0.08, 1.12, 0.08);
      leg.position.set(px + angX * 0.9, 0.54, pz + angZ * 0.9);
      leg.rotation.z = -angX * 1.1;
      leg.rotation.x = angZ * 1.1;
      grp.add(leg);
    }
    grp.add(createRoundedToyMesh(0.68, 0.28, 0.58, MAT.white, px, 1.12, pz, 0.07));
    const lensRing = new THREE.Mesh(GEO.cyl, MAT.pureGold24k);
    lensRing.scale.set(0.24, 0.16, 0.24);
    lensRing.rotation.x = Math.PI / 2;
    lensRing.position.set(px, 1.12, pz - 0.32);
    const lensGlass = new THREE.Mesh(GEO.sphere, MAT.screenCyan);
    lensGlass.scale.setScalar(0.18);
    lensGlass.position.set(px, 1.12, pz - 0.39);
    grp.add(lensRing, lensGlass);

    // 반투명 시네마 빛줄기 콘 (Volumetric Light Beam)
    const beamDist = Math.max(1.2, pz - screenZ - 0.45);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xBAE6FD,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const beamCone = new THREE.Mesh(new THREE.ConeGeometry(1.15, beamDist, 20, 1, true), beamMat);
    beamCone.rotation.x = Math.PI * 0.5 + Math.atan2(screenY - 1.12, beamDist);
    beamCone.position.set(px, (1.12 + screenY) * 0.5, (pz - 0.38 + screenZ) * 0.5);
    grp.add(beamCone);
  } else if (appId === 'app_soundmat') {
    // 두툼한 격자형 방음 패드 매트 + 빈티지 원목 LP 턴테이블 & 북쉘프 스피커
    const cols = 4;
    const rows = 3;
    const padW = (rw * 0.72) / cols;
    const padD = (rd * 0.62) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isAlt = (r + c) % 2 === 0;
        grp.add(createRoundedToyMesh(
          padW - 0.08,
          0.11,
          padD - 0.08,
          isAlt ? MAT.mintSoft : MAT.cream,
          (c - (cols - 1) * 0.5) * padW,
          0.12,
          0.22 + (r - (rows - 1) * 0.5) * padD,
          0.04
        ));
      }
    }
    const lx = rw * 0.28;
    const lz = -rd * 0.28;
    grp.add(createRoundedToyMesh(1.65, 0.78, 0.76, MAT.woodWarm, lx, 0.5, lz, 0.07));
    const platter = new THREE.Mesh(GEO.cyl, MAT.chromeAlloy);
    platter.scale.set(0.64, 0.05, 0.64);
    platter.position.set(lx - 0.18, 0.91, lz);
    const vinyl = new THREE.Mesh(GEO.cyl, MAT.carbonFiber);
    vinyl.scale.set(0.6, 0.06, 0.6);
    vinyl.position.set(lx - 0.18, 0.93, lz);
    const label = new THREE.Mesh(GEO.cyl, MAT.coral);
    label.scale.set(0.22, 0.07, 0.22);
    label.position.set(lx - 0.18, 0.94, lz);
    const arm = createRoundedToyMesh(0.42, 0.045, 0.045, MAT.pureGold24k, lx + 0.16, 0.97, lz + 0.06, 0.02);
    arm.rotation.y = -0.45;
    // 우측 북쉘프 스피커
    grp.add(createRoundedToyMesh(0.42, 0.56, 0.38, MAT.walnutTrim, lx + 0.54, 1.16, lz, 0.04));
    const cone = new THREE.Mesh(GEO.cyl, MAT.gold);
    cone.scale.set(0.22, 0.06, 0.22);
    cone.rotation.x = Math.PI / 2;
    cone.position.set(lx + 0.54, 1.16, lz + 0.2);
    grp.add(platter, vinyl, label, arm, cone);
  } else {
    // app_rgb_desk RGB 트리플 모니터 + 본체 타워 + 키보드 게이밍 데스크
    const dx = rw * 0.24;
    const dz = -rd * 0.28;
    grp.add(createRoundedToyMesh(2.42, 0.12, 0.98, MAT.carbonFiber, dx, 0.86, dz, 0.05));
    grp.add(createRoundedToyMesh(2.44, 0.04, 1.0, MAT.screenPink, dx, 0.81, dz, 0.02));
    grp.add(createRoundedToyMesh(0.14, 0.82, 0.86, MAT.ironSteel, dx - 1.04, 0.44, dz, 0.03));
    grp.add(createRoundedToyMesh(0.14, 0.82, 0.86, MAT.ironSteel, dx + 1.04, 0.44, dz, 0.03));
    const m1 = createRoundedToyMesh(0.74, 0.5, 0.06, MAT.screenCyan, dx - 0.75, 1.25, dz - 0.12, 0.03);
    m1.rotation.y = 0.28;
    const m2 = createRoundedToyMesh(0.8, 0.52, 0.06, MAT.screenPurple, dx, 1.25, dz - 0.22, 0.03);
    const m3 = createRoundedToyMesh(0.74, 0.5, 0.06, MAT.screenPink, dx + 0.75, 1.25, dz - 0.12, 0.03);
    m3.rotation.y = -0.28;
    grp.add(createRoundedToyMesh(0.68, 0.04, 0.24, MAT.screenCyan, dx, 0.94, dz + 0.18, 0.02)); // RGB 키보드
    grp.add(createRoundedToyMesh(0.36, 0.58, 0.52, MAT.carbonFiber, dx + 0.95, 1.2, dz + 0.05, 0.04)); // 게이밍 본체
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
    // 미개방 리모델링 대기 호실: 아기자기한 설계 도면 이젤 + 페인트통 + 골드리본 포장 박스 연출!
    const rug = new THREE.Mesh(GEO.cyl, MAT.cream);
    rug.scale.set(2.8, 0.04, 2.2);
    rug.position.set(0, 0.15, 0.1);
    rGrp.add(rug);

    // 원목 설계도 이젤(Blueprint Easel)
    const easel = new THREE.Group();
    easel.add(createRoundedToyMesh(0.1, 1.65, 0.1, MAT.woodWarm, -0.45, 0.85, 0, 0.02));
    easel.add(createRoundedToyMesh(0.1, 1.65, 0.1, MAT.woodWarm, 0.45, 0.85, 0, 0.02));
    easel.add(createRoundedToyMesh(0.1, 1.55, 0.1, MAT.woodDark, 0, 0.78, -0.42, 0.02));
    easel.add(createRoundedToyMesh(1.38, 0.96, 0.1, MAT.sky, 0, 1.18, 0.08, 0.04));
    easel.add(createRoundedToyMesh(1.18, 0.74, 0.04, MAT.white, 0, 1.18, 0.13, 0.02));
    easel.add(createRoundedToyMesh(0.82, 0.08, 0.05, MAT.pureGold24k, 0, 1.38, 0.15, 0.02));
    easel.position.set(0.1, 0.14, -0.35);
    rGrp.add(easel);

    // 리모델링 박스 & 골드 리본 + 민트 페인트통 + 귀여운 안전 라바콘
    rGrp.add(createRoundedToyMesh(1.12, 0.92, 1.02, MAT.movingBox, -1.25, 0.6, 0.35, 0.08));
    rGrp.add(createRoundedToyMesh(1.16, 0.12, 1.06, MAT.pureGold24k, -1.25, 0.62, 0.35, 0.02));
    rGrp.add(createRoundedToyMesh(0.86, 0.76, 0.86, MAT.movingBox, 1.28, 0.52, 0.45, 0.08));
    const paintCan = new THREE.Mesh(GEO.cyl, MAT.mint);
    paintCan.scale.set(0.34, 0.44, 0.34);
    paintCan.position.set(0.88, 0.36, 1.05);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.58, 14), MAT.coral);
    cone.position.set(-0.62, 0.43, 1.12);
    rGrp.add(paintCan, cone);
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

  // 인형의 집 방 내부 따뜻한 펜던트 조명 & 실내 원목 화분 배치
  const pendantPositions = room.colSpan >= 3 ? [-rw * 0.28, 0.2, rw * 0.3] : room.colSpan === 2 ? [-rw * 0.22, rw * 0.22] : [0];
  for (const px of pendantPositions) {
    const cord = new THREE.Mesh(GEO.cyl, MAT.julietIron || MAT.charcoal);
    cord.scale.set(0.04, 0.58, 0.04);
    cord.position.set(px, rh - 0.36, 0.15);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.34, 18, 1, true), MAT.pendantShadeCream || MAT.cream);
    shade.position.set(px, rh - 0.68, 0.15);
    const bulb = new THREE.Mesh(GEO.sphere, MAT.pendantBulbWarm || MAT.gold);
    bulb.scale.setScalar(0.18);
    bulb.position.set(px, rh - 0.8, 0.15);
    rGrp.add(cord, shade, bulb);
  }

  const plantPot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.42, 14), MAT.coral);
  const plantX = rw * 0.5 - 0.72;
  const plantZ = rd * 0.5 - 0.68;
  plantPot.position.set(plantX, 0.35, plantZ);
  const plantStem = new THREE.Mesh(GEO.cyl, MAT.woodDark);
  plantStem.scale.set(0.06, 0.46, 0.06);
  plantStem.position.set(plantX, 0.66, plantZ);
  const leaf1 = new THREE.Mesh(GEO.sphere, MAT.leafGreen);
  leaf1.scale.set(0.38, 0.34, 0.38);
  leaf1.position.set(plantX, 0.94, plantZ);
  const leaf2 = new THREE.Mesh(GEO.sphere, MAT.cloverGreen);
  leaf2.scale.set(0.28, 0.26, 0.28);
  leaf2.position.set(plantX - 0.16, 0.82, plantZ + 0.1);
  rGrp.add(plantPot, plantStem, leaf1, leaf2);

  // [제2마을 하버 부티크 호텔 & 로열 마리나 스위트] 호박색 무드 조명 + 실사 랍스터·토마호크·샴페인 VIP 다이닝 테이블!
  if (room.equippedFurniture.decor === 'dec_basic_shelf') {
    const sh = new THREE.Group();
    sh.add(createRoundedToyMesh(1.65, 1.85, 0.42, MAT.woodWarm, -rw * 0.3, 1.05, -rd * 0.5 + 0.38, 0.05));
    sh.add(createRoundedToyMesh(1.48, 0.08, 0.38, MAT.white, -rw * 0.3, 0.95, -rd * 0.5 + 0.4, 0.02));
    sh.add(createRoundedToyMesh(1.48, 0.08, 0.38, MAT.white, -rw * 0.3, 1.45, -rd * 0.5 + 0.4, 0.02));
    rGrp.add(sh);
  }
  if (room.equippedFurniture.decor === 'dec_diamond_art') {
    const artGrp = new THREE.Group();
    const backZ = -rd * 0.5 + 0.24;
    for (const ax of [-2.1, 2.1]) {
      artGrp.add(createRoundedToyMesh(1.55, 1.25, 0.1, MAT.pureGold24k || MAT.gold, ax, 2.25, backZ, 0.04));
      artGrp.add(createRoundedToyMesh(1.28, 0.98, 0.12, ax < 0 ? MAT.sky : MAT.coral, ax, 2.25, backZ + 0.02, 0.02));
    }
    // 중앙 황금 박물관 좌대 + 영롱한 블루 다이아몬드 오브제!
    artGrp.add(createRoundedToyMesh(0.76, 1.02, 0.76, MAT.pureGold24k || MAT.gold, 0, 0.62, 0.95, 0.06));
    const gemMat = new THREE.MeshPhysicalMaterial({ color: 0x38BDF8, emissive: 0x0284C7, emissiveIntensity: 0.7, roughness: 0.05, metalness: 0.2, clearcoat: 1.0 });
    const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), gemMat);
    diamond.position.set(0, 1.48, 0.95);
    artGrp.add(diamond);
    rGrp.add(artGrp);
  }
  if (room.lotId === 'lot_harbor_main' || room.equippedFurniture.decor === 'dec_harbor_royal' || room.equippedFurniture.decor === 'dec_diamond_art') {
    const suiteGlow = new THREE.PointLight(0xFFB703, 1.35, 13.5);
    suiteGlow.position.set(0, rh - 0.95, 0.35);
    rGrp.add(suiteGlow);

    const vipTable = new THREE.Group();
    const tblX = room.layoutType === 'tworoom' ? -0.85 : room.layoutType === 'threeroom' ? 2.1 : 0.05;
    const tblZ = room.layoutType === 'threeroom' ? -0.65 : 1.05;
    if (room.layoutType !== 'threeroom') {
      vipTable.add(createRoundedToyMesh(1.68, 0.09, 0.95, MAT.white, 0, 0.62, 0, 0.04));
      vipTable.add(createRoundedToyMesh(0.14, 0.58, 0.14, MAT.pureGold24k || MAT.gold, -0.58, 0.31, 0, 0.03));
      vipTable.add(createRoundedToyMesh(0.14, 0.58, 0.14, MAT.pureGold24k || MAT.gold, 0.58, 0.31, 0, 0.03));
    }
    const baseTblY = room.layoutType === 'threeroom' ? 0.84 : 0.67;
    const lob = create3DLobsterPlatterMesh();
    lob.scale.setScalar(0.58);
    lob.position.set(-0.42, baseTblY, 0);
    const stk = create3DTomahawkSteakMesh();
    stk.scale.setScalar(0.58);
    stk.position.set(0.12, baseTblY, 0.05);
    const chp = create3DChampagneBucketMesh();
    chp.scale.setScalar(0.62);
    chp.position.set(0.55, baseTblY, -0.06);
    vipTable.add(lob, stk, chp);
    vipTable.position.set(tblX, 0.14, tblZ);
    rGrp.add(vipTable);
  }

  // [시각 피드백 5] 세입자 입주 호실 전면 창틀 황금빛 LED 간접조명 프레임 (Room Border Glow)
  if (room.household) {
    const fz = rd * 0.5 - 0.04;
    rGrp.add(createRoundedToyMesh(rw - 0.35, 0.08, 0.08, MAT.roomBorderGlow, 0, rh - 0.16, fz, 0.02, false, false, false));
    rGrp.add(createRoundedToyMesh(rw - 0.35, 0.08, 0.08, MAT.roomBorderGlow, 0, 0.16, fz, 0.02, false, false, false));
    rGrp.add(createRoundedToyMesh(0.08, rh - 0.3, 0.08, MAT.roomBorderGlow, -rw * 0.5 + 0.2, rh * 0.5, fz, 0.02, false, false, false));
    rGrp.add(createRoundedToyMesh(0.08, rh - 0.3, 0.08, MAT.roomBorderGlow, rw * 0.5 - 0.2, rh * 0.5, fz, 0.02, false, false, false));
  }

  // [마일스톤 50%] 각 호실 창가 발코니 꽃화분 개화!
  if ((state.unlockedMilestones || []).includes(50)) {
    const flowerCols = [MAT.coral, MAT.duckYellow, MAT.pinkSoft, MAT.lavender, MAT.mint];
    const boxCount = Math.max(1, room.colSpan || 1);
    for (let bi = 0; bi < boxCount; bi++) {
      const bx = (bi - (boxCount - 1) * 0.5) * 3.4;
      const bz = rd * 0.5 + 0.24;
      rGrp.add(createRoundedToyMesh(1.85, 0.32, 0.44, MAT.woodWarm, bx, 0.32, bz, 0.05));
      for (let f = -2; f <= 2; f++) {
        const leaf = new THREE.Mesh(GEO.sphere, MAT.cloverGreen);
        leaf.scale.set(0.28, 0.2, 0.28);
        leaf.position.set(bx + f * 0.32, 0.52, bz);
        const bloom = new THREE.Mesh(GEO.sphere, flowerCols[(bi + f + 4) % flowerCols.length]);
        bloom.scale.setScalar(0.2);
        bloom.position.set(bx + f * 0.32, 0.66, bz + 0.03);
        rGrp.add(leaf, bloom);
      }
    }
  }

  // [방음 시공 완료 상태] 바닥·벽면 두툼한 격자형 방음 패드 타일 표시
  if (room.soundproofed && room.equippedFurniture.appliance !== 'app_soundmat') {
    const cols = 4;
    const rows = 2;
    const pw = (rw * 0.68) / cols;
    const pd = (rd * 0.44) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        rGrp.add(createRoundedToyMesh(
          pw - 0.08,
          0.08,
          pd - 0.08,
          (r + c) % 2 === 0 ? MAT.mintSoft : MAT.cream,
          (c - (cols - 1) * 0.5) * pw,
          0.145,
          -0.25 + (r - 0.5) * pd,
          0.03
        ));
      }
    }
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

// 1인칭 진열대 상품 & 손 파지(Held Hands) & 집들이 테이블 공용 3D 실사 기프트 메쉬
function create3DGiftPropMesh(itemId = 'item_cake', packagedBox = false) {
  const grp = new THREE.Group();
  if (itemId === 'item_cake') {
    if (packagedBox) {
      grp.add(createRoundedToyMesh(0.46, 0.34, 0.46, MAT.cream, 0, 0.18, 0, 0.05));
      grp.add(createRoundedToyMesh(0.48, 0.08, 0.48, MAT.pinkSoft, 0, 0.36, 0, 0.03));
      grp.add(createRoundedToyMesh(0.09, 0.38, 0.49, MAT.carClearRed, 0, 0.2, 0, 0.02));
      grp.add(createRoundedToyMesh(0.49, 0.38, 0.09, MAT.carClearRed, 0, 0.2, 0, 0.02));
      const bowL = new THREE.Mesh(GEO.sphere, MAT.carClearRed);
      bowL.scale.set(0.14, 0.09, 0.09);
      bowL.position.set(-0.08, 0.43, 0);
      const bowR = bowL.clone();
      bowR.position.set(0.08, 0.43, 0);
      grp.add(bowL, bowR);
    } else {
      // 실사 딸기 생크림 홀케이크 (strawberry_cake_real.png + 생크림 & 윤기 나는 생딸기!)
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.06, 24), MAT.white);
      plate.position.y = 0.03;
      const sponge = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.28, 28), MAT.realCake || MAT.pinkSoft);
      sponge.position.y = 0.2;
      const creamTop = new THREE.Mesh(new THREE.CylinderGeometry(0.335, 0.335, 0.06, 28), MAT.white);
      creamTop.position.y = 0.35;
      grp.add(plate, sponge, creamTop);
      const glossyBerry = new THREE.MeshPhysicalMaterial({ color: 0xDC2626, roughness: 0.14, clearcoat: 0.9 });
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const whip = new THREE.Mesh(GEO.sphere, MAT.white);
        whip.scale.setScalar(0.1);
        whip.position.set(Math.cos(a) * 0.22, 0.39, Math.sin(a) * 0.22);
        const berry = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.13, 12), glossyBerry);
        berry.position.set(Math.cos(a) * 0.22, 0.46, Math.sin(a) * 0.22);
        grp.add(whip, berry);
      }
    }
  } else if (itemId === 'item_croissant') {
    if (packagedBox) {
      grp.add(createRoundedToyMesh(0.36, 0.44, 0.26, MAT.paperBag, 0, 0.22, 0, 0.04));
      const cr1 = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.055, 12, 18, Math.PI * 1.3), MAT.realCroissant || MAT.gold);
      cr1.position.set(-0.04, 0.46, 0);
      const cr2 = cr1.clone();
      cr2.position.set(0.06, 0.44, 0.04);
      grp.add(cr1, cr2);
    } else {
      // 버터 윤기(clearcoat: 0.46)가 흐르는 실사 크루아상 트레이!
      const tray = createRoundedToyMesh(0.74, 0.06, 0.52, MAT.woodWarm, 0, 0.03, 0, 0.03);
      const parchment = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.015, 0.44), MAT.cream);
      parchment.position.y = 0.065;
      grp.add(tray, parchment);
      for (let i = -1; i <= 1; i++) {
        const crGrp = new THREE.Group();
        for (let seg = -2; seg <= 2; seg++) {
          const r = (0.085 - Math.abs(seg) * 0.014);
          const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 14), MAT.realCroissant || MAT.gold);
          puff.scale.set(1.25, 0.95, 1.35);
          puff.position.set(Math.abs(seg) * 0.028, r * 0.85, seg * 0.072);
          crGrp.add(puff);
        }
        crGrp.position.set(i * 0.21, 0.08, 0);
        crGrp.rotation.y = 0.18;
        grp.add(crGrp);
      }
    }
  } else if (itemId === 'item_coffee') {
    // 에스프레소·우유 마블링이 살아있는 실사 아인슈페너 (einspanner_real.png)!
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.125, 0.38, 22), MAT.realEinspanner || MAT.white);
    cup.rotation.y = Math.PI;
    cup.position.y = 0.2;
    const creamDome = new THREE.Mesh(getPuffyDomeGeo(0.168, 0.17), MAT.white);
    creamDome.position.y = 0.41;
    const cocoa = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.02, 16), MAT.leatherCamel);
    cocoa.position.y = 0.5;
    const straw = new THREE.Mesh(GEO.cyl, MAT.parasolGreen);
    straw.scale.set(0.032, 0.24, 0.032);
    straw.position.set(0.06, 0.49, 0);
    straw.rotation.z = -0.22;
    grp.add(cup, creamDome, cocoa, straw);
  } else if (itemId === 'item_bouquet') {
    // 유러피안 더블 크래프트·로즈핑크 래핑 + 골드 리본 + 유칼립투스 잎 + 11송이 입체 장미 부케!
    const outerWrap = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.62, 20), MAT.paperBag);
    outerWrap.rotation.x = Math.PI;
    outerWrap.position.y = 0.31;
    const innerWrap = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.56, 20), MAT.pinkSoft);
    innerWrap.rotation.x = Math.PI;
    innerWrap.position.y = 0.35;
    const ribbon = createRoundedToyMesh(0.24, 0.09, 0.24, MAT.pureGold24k, 0, 0.22, 0, 0.03);
    grp.add(outerWrap, innerWrap, ribbon);
    for (let lf = 0; lf < 6; lf++) {
      const la = (lf / 6) * Math.PI * 2 + 0.25;
      const leaf = new THREE.Mesh(GEO.sphere, MAT.cloverGreen);
      leaf.scale.set(0.14, 0.08, 0.22);
      leaf.position.set(Math.cos(la) * 0.22, 0.56, Math.sin(la) * 0.22);
      leaf.rotation.y = -la;
      grp.add(leaf);
    }
    const cols = [MAT.carClearRed, MAT.coral, MAT.pinkSoft, MAT.duckYellow, MAT.carClearRed, MAT.lavender];
    const centerRose = new THREE.Mesh(GEO.sphere, MAT.carClearRed);
    centerRose.scale.setScalar(0.18);
    centerRose.position.set(0, 0.66, 0);
    grp.add(centerRose);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rose = new THREE.Mesh(GEO.sphere, cols[i % cols.length]);
      rose.scale.setScalar(0.145);
      rose.position.set(Math.cos(a) * 0.165, 0.6 + (i % 2) * 0.035, Math.sin(a) * 0.165);
      grp.add(rose);
    }
  } else if (itemId === 'item_baguette') {
    const basket = createRoundedToyMesh(0.56, 0.32, 0.44, MAT.woodWarm, 0, 0.16, 0, 0.06);
    grp.add(basket);
    for (let bi = -1; bi <= 1; bi++) {
      const bag = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.62, 16), MAT.realBaguette || MAT.butterOak);
      bag.position.set(bi * 0.13, 0.42, 0);
      bag.rotation.z = bi * 0.2;
      grp.add(bag);
    }
  } else if (itemId === 'item_matcha_box') {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.36, 0.24), MAT.snackMats?.matcha || MAT.mint);
    box.position.y = 0.2;
    const goldSeal = createRoundedToyMesh(0.48, 0.05, 0.26, MAT.pureGold24k, 0, 0.39, 0, 0.02);
    grp.add(box, goldSeal);
  } else if (itemId === 'item_fruit_basket') {
    grp.add(createRoundedToyMesh(0.58, 0.22, 0.46, MAT.woodWarm, 0, 0.11, 0, 0.06));
    const fruitCols = [MAT.carClearRed, MAT.orangeBill, MAT.duckYellow, MAT.cloverGreen];
    for (let fx = -1; fx <= 1; fx++) {
      for (let fz = -0.5; fz <= 0.5; fz += 1) {
        const fr = new THREE.Mesh(GEO.sphere, fruitCols[Math.abs(fx * 2 + (fz > 0 ? 1 : 0)) % fruitCols.length]);
        fr.scale.setScalar(0.15);
        fr.position.set(fx * 0.15, 0.27, fz * 0.13);
        grp.add(fr);
      }
    }
  } else if (itemId === 'item_kimbap') {
    grp.add(createRoundedToyMesh(0.58, 0.05, 0.42, MAT.white, 0, 0.025, 0, 0.02));
    const kb1 = createPhotorealKimbap3D(1.35);
    kb1.position.set(-0.14, 0.04, 0.04);
    const kb2 = createPhotorealKimbap3D(1.35);
    kb2.position.set(0.02, 0.04, -0.05);
    const ramenCup = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.24, 16), MAT.snackMats?.ramen || MAT.coral);
    ramenCup.position.set(0.17, 0.16, 0.04);
    grp.add(kb1, kb2, ramenCup);
  } else if (itemId === 'item_chips_pack') {
    const b1 = createPhotorealSnackBag3D('chips', 1.12);
    b1.position.set(-0.13, 0.02, 0.03);
    b1.rotation.z = 0.1;
    const b2 = createPhotorealSnackBag3D('shrimp', 1.08);
    b2.position.set(0.13, 0.02, -0.03);
    b2.rotation.z = -0.1;
    grp.add(b1, b2);
  } else if (itemId === 'item_drink_six') {
    grp.add(createRoundedToyMesh(0.56, 0.07, 0.38, MAT.sky, 0, 0.035, 0, 0.03));
    for (let cx = -1; cx <= 1; cx++) {
      for (const cz of [-0.09, 0.09]) {
        const can = createPhotorealBeverageCan3D(cz < 0 ? 'cola' : 'beer', 1.05);
        can.position.set(cx * 0.16, 0.06, cz);
        grp.add(can);
      }
    }
  } else if (itemId === 'item_rose_vase') {
    const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.19, 0.38, 20), MAT.partitionGlass);
    vase.position.y = 0.19;
    const goldRim = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.02, 10, 20), MAT.pureGold24k);
    goldRim.rotation.x = Math.PI * 0.5;
    goldRim.position.y = 0.38;
    grp.add(vase, goldRim);
    for (let r = 0; r < 5; r++) {
      const a = (r / 5) * Math.PI * 2;
      const stem = new THREE.Mesh(GEO.cyl, MAT.cloverGreen);
      stem.scale.set(0.03, 0.34, 0.03);
      stem.position.set(Math.cos(a) * 0.05, 0.36, Math.sin(a) * 0.05);
      const bloom = new THREE.Mesh(GEO.sphere, r % 2 === 0 ? MAT.carClearRed : MAT.pinkSoft);
      bloom.scale.setScalar(0.14);
      bloom.position.set(Math.cos(a) * 0.11, 0.54 + (r === 0 ? 0.05 : 0), Math.sin(a) * 0.11);
      grp.add(stem, bloom);
    }
  } else if (itemId === 'item_aroma_kit') {
    grp.add(createRoundedToyMesh(0.54, 0.06, 0.4, MAT.white, 0, 0.03, 0, 0.02));
    const bottle1 = createRoundedToyMesh(0.18, 0.38, 0.14, MAT.sky, -0.13, 0.23, 0, 0.05);
    const cap1 = new THREE.Mesh(GEO.cyl, MAT.pureGold24k);
    cap1.scale.set(0.09, 0.08, 0.09);
    cap1.position.set(-0.13, 0.45, 0);
    const bottle2 = createRoundedToyMesh(0.16, 0.32, 0.14, MAT.pinkSoft, 0.12, 0.2, 0.04, 0.05);
    const cap2 = cap1.clone();
    cap2.position.set(0.12, 0.39, 0.04);
    grp.add(bottle1, cap1, bottle2, cap2);
  } else {
    // 투명 뚜껑 너머로 흰쌀밥과 반찬이 선명히 보이는 실사 한상 도시락 (쇼케이스에서는 살짝 기울여 음식면 극대화!)
    const bento = createPhotorealBentoBox3D(1.12, !packagedBox);
    grp.add(bento);
    if (packagedBox) {
      grp.add(createRoundedToyMesh(0.09, 0.16, 0.45, MAT.mint, 0, 0.09, 0, 0.02));
    }
  }
  return grp;
}

// =========================================================
// 8B. [핵심 개편 1 & 2] 2D AABB 충돌 회피 NavGrid & 목적 기반 스마트 일상 AI (Context-Aware Smart Routine FSM)
// =========================================================
function resetCharacterPoseNeutral(mesh) {
  const ud = mesh?.userData;
  if (!ud) return;
  if (ud.bodyRig) {
    ud.bodyRig.position.set(0, 0, 0);
    ud.bodyRig.rotation.set(0, 0, 0);
  }
  if (ud.legL) ud.legL.rotation.set(0, 0, 0);
  if (ud.legR) ud.legR.rotation.set(0, 0, 0);
  if (ud.armL) { ud.armL.rotation.set(0, 0, 0.28); }
  if (ud.armR) { ud.armR.rotation.set(0, 0, -0.28); }
  if (ud.phoneProp) ud.phoneProp.visible = false;
  if (ud.cupProp) ud.cupProp.visible = false;
}

function segmentHitsAABB2D(x1, z1, x2, z2, box, pad = 0.28) {
  const minX = box.minX - pad;
  const maxX = box.maxX + pad;
  const minZ = box.minZ - pad;
  const maxZ = box.maxZ + pad;
  const steps = 8;
  for (let s = 1; s < steps; s++) {
    const t = s / steps;
    const px = x1 + (x2 - x1) * t;
    const pz = z1 + (z2 - z1) * t;
    if (px > minX && px < maxX && pz > minZ && pz < maxZ) return true;
  }
  return false;
}

function pushOutOfObstaclesAndWalls2D(pos, obstacles, bounds, radius = 0.34) {
  pos.x = THREE.MathUtils.clamp(pos.x, bounds.minX, bounds.maxX);
  pos.z = THREE.MathUtils.clamp(pos.z, bounds.minZ, bounds.maxZ);

  for (const ob of obstacles) {
    if ((ob.onlyFloor1 && pos.y > 1.5) || (ob.onlyLoft && pos.y < 1.5)) continue;
    const minX = ob.minX - radius;
    const maxX = ob.maxX + radius;
    const minZ = ob.minZ - radius;
    const maxZ = ob.maxZ + radius;
    if (pos.x > minX && pos.x < maxX && pos.z > minZ && pos.z < maxZ) {
      const dLeft = Math.abs(pos.x - minX);
      const dRight = Math.abs(maxX - pos.x);
      const dBack = Math.abs(pos.z - minZ);
      const dFront = Math.abs(maxZ - pos.z);
      const m = Math.min(dLeft, dRight, dBack, dFront);
      if (m === dLeft) pos.x = minX;
      else if (m === dRight) pos.x = maxX;
      else if (m === dBack) pos.z = minZ;
      else pos.z = maxZ;
    }
  }
  pos.x = THREE.MathUtils.clamp(pos.x, bounds.minX, bounds.maxX);
  pos.z = THREE.MathUtils.clamp(pos.z, bounds.minZ, bounds.maxZ);
}

function enforceCharacterSeparation(actorList, minDist = 0.62) {
  for (let i = 0; i < actorList.length; i++) {
    const a = actorList[i];
    if (!a?.mesh?.visible || a.allowFurnitureOverlap) continue;
    for (let j = i + 1; j < actorList.length; j++) {
      const b = actorList[j];
      if (!b?.mesh?.visible || b.allowFurnitureOverlap) continue;
      if (Math.abs(a.mesh.position.y - b.mesh.position.y) > 0.9) continue;
      const dx = a.mesh.position.x - b.mesh.position.x;
      const dz = a.mesh.position.z - b.mesh.position.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.001 && d < minDist) {
        const push = (minDist - d) * 0.5;
        const nx = dx / d;
        const nz = dz / d;
        a.mesh.position.x += nx * push;
        a.mesh.position.z += nz * push;
        b.mesh.position.x -= nx * push;
        b.mesh.position.z -= nz * push;
      } else if (d <= 0.001) {
        a.mesh.position.x += 0.31;
        b.mesh.position.x -= 0.31;
      }
    }
  }
}

function buildRoomNavData(room) {
  const rw = room.rw;
  const rd = room.rd;
  const bounds = {
    minX: -rw * 0.5 + 0.52,
    maxX: rw * 0.5 - 0.52,
    minZ: -rd * 0.5 + 0.52,
    maxZ: rd * 0.5 - 0.52
  };
  const obstacles = [];
  const nodes = [];
  let stations = {};

  if (room.layoutType === 'studio') {
    const bx = -rw * 0.24;
    const bz = -rd * 0.16;
    const sx = rw * 0.2;
    const sz = 0.85;
    const ax = rw * 0.24;
    const az = -rd * 0.28;

    obstacles.push(
      { minX: bx - 1.32, maxX: bx + 1.32, minZ: bz - 1.42, maxZ: bz + 1.42, onlyFloor1: true },
      { minX: sx - 1.32, maxX: sx + 1.32, minZ: sz - 0.62, maxZ: sz + 0.62, onlyFloor1: true },
      { minX: ax - 1.15, maxX: ax + 1.15, minZ: az - 0.55, maxZ: az + 0.55, onlyFloor1: true }
    );
    nodes.push(
      { id: 'door', x: 0.0, y: 0.16, z: rd * 0.36 },
      { id: 'mid_front', x: 0.0, y: 0.16, z: 0.85 },
      { id: 'center', x: 0.08, y: 0.16, z: -0.05 },
      { id: 'bed_side', x: bx + 1.56, y: 0.16, z: bz + 0.2 },
      { id: 'sofa_front', x: sx, y: 0.16, z: sz - 0.86 },
      { id: 'desk_front', x: ax - 0.1, y: 0.16, z: az + 0.82 }
    );
    stations = {
      bedApproach: 'bed_side',
      bedPose: { x: bx, y: 0.66, z: bz + 0.1, yaw: 0 },
      sofaApproach: 'sofa_front',
      sofaPose: { x: sx, y: 0.22, z: sz - 0.06, yaw: Math.PI },
      deskApproach: 'desk_front',
      deskPose: { x: ax - 0.1, y: 0.16, z: az + 0.72, yaw: Math.PI },
      doorNode: 'door',
      snackApproach: 'center',
      snackPose: { x: 0.12, y: 0.16, z: 0.32, yaw: Math.PI }
    };
  } else if (room.layoutType === 'tworoom') {
    const sx = -rw * 0.24;
    const sz = 0.72;
    const bx = rw * 0.26;
    const bz = -rd * 0.14;
    const ax = rw * 0.24;
    const az = -rd * 0.28;

    // 아치형 가벽(x=0.55) 충돌 박스 — 중앙 아치 문틀(z = -0.35 ~ +1.35)만 통과 가능!
    obstacles.push(
      { minX: 0.32, maxX: 0.78, minZ: -rd * 0.5, maxZ: -0.42, onlyFloor1: true },
      { minX: 0.32, maxX: 0.78, minZ: 1.48, maxZ: rd * 0.5, onlyFloor1: true },
      { minX: -rw * 0.28 - 1.4, maxX: -rw * 0.28 + 1.4, minZ: -rd * 0.5, maxZ: -rd * 0.5 + 1.15, onlyFloor1: true },
      { minX: sx - 1.32, maxX: sx + 1.32, minZ: sz - 0.62, maxZ: sz + 0.62, onlyFloor1: true },
      { minX: bx - 1.32, maxX: bx + 1.32, minZ: bz - 1.42, maxZ: bz + 1.42, onlyFloor1: true }
    );
    nodes.push(
      { id: 'door', x: -1.35, y: 0.16, z: rd * 0.36 },
      { id: 'liv_mid', x: -1.25, y: 0.16, z: -0.18 },
      { id: 'sofa_front', x: sx, y: 0.16, z: sz - 0.88 },
      { id: 'arch_door', x: 0.55, y: 0.16, z: 0.48 },
      { id: 'bed_aisle', x: bx - 1.55, y: 0.16, z: 0.45 },
      { id: 'desk_front', x: -rw * 0.22, y: 0.16, z: -rd * 0.5 + 1.48 }
    );
    stations = {
      bedApproach: 'bed_aisle',
      bedPose: { x: bx, y: 0.66, z: bz + 0.1, yaw: 0 },
      sofaApproach: 'sofa_front',
      sofaPose: { x: sx, y: 0.22, z: sz - 0.06, yaw: Math.PI },
      deskApproach: 'desk_front',
      deskPose: { x: ax > 0 ? -rw * 0.22 : ax, y: 0.16, z: -rd * 0.5 + 1.42, yaw: Math.PI },
      doorNode: 'door',
      snackApproach: 'liv_mid',
      snackPose: { x: -1.15, y: 0.16, z: 0.38, yaw: Math.PI }
    };
  } else if (room.layoutType === 'threeroom') {
    const w1 = -rw * 0.18;
    const w2 = rw * 0.2;
    const bx = -rw * 0.35;
    const bz = -rd * 0.14;
    const sx = -0.6;
    const sz = 0.92;

    obstacles.push(
      { minX: w1 - 0.22, maxX: w1 + 0.22, minZ: -rd * 0.5, maxZ: -0.42, onlyFloor1: true },
      { minX: w1 - 0.22, maxX: w1 + 0.22, minZ: 1.48, maxZ: rd * 0.5, onlyFloor1: true },
      { minX: w2 - 0.22, maxX: w2 + 0.22, minZ: -rd * 0.5, maxZ: -0.42, onlyFloor1: true },
      { minX: w2 - 0.22, maxX: w2 + 0.22, minZ: 1.48, maxZ: rd * 0.5, onlyFloor1: true },
      { minX: bx - 1.32, maxX: bx + 1.32, minZ: bz - 1.42, maxZ: bz + 1.42, onlyFloor1: true },
      { minX: sx - 1.38, maxX: sx + 1.38, minZ: sz - 0.62, maxZ: sz + 0.62, onlyFloor1: true },
      { minX: 2.1 - 1.3, maxX: 2.1 + 1.3, minZ: -0.65 - 0.72, maxZ: -0.65 + 0.72, onlyFloor1: true },
      { minX: rw * 0.36 - 1.2, maxX: rw * 0.36 + 1.2, minZ: bz - 1.3, maxZ: bz + 1.3, onlyFloor1: true }
    );
    nodes.push(
      { id: 'door', x: 0.35, y: 0.16, z: rd * 0.36 },
      { id: 'hall_mid', x: 0.4, y: 0.16, z: 0.35 },
      { id: 'sofa_front', x: sx, y: 0.16, z: sz - 0.9 },
      { id: 'arch_left', x: w1, y: 0.16, z: 0.48 },
      { id: 'bed_aisle', x: bx + 1.58, y: 0.16, z: 0.42 },
      { id: 'arch_right', x: w2, y: 0.16, z: 0.48 },
      { id: 'desk_front', x: 2.1, y: 0.16, z: 0.38 }
    );
    stations = {
      bedApproach: 'bed_aisle',
      bedPose: { x: bx, y: 0.66, z: bz + 0.1, yaw: 0 },
      sofaApproach: 'sofa_front',
      sofaPose: { x: sx, y: 0.22, z: sz - 0.06, yaw: Math.PI },
      deskApproach: 'desk_front',
      deskPose: { x: 2.1, y: 0.16, z: 0.28, yaw: Math.PI },
      doorNode: 'door',
      snackApproach: 'desk_front',
      snackPose: { x: 1.85, y: 0.16, z: 0.28, yaw: Math.PI }
    };
  } else {
    // 복층 로프트(Loft): 실제 9단 원목 계단 발판 노드를 따라 2층 다락 침실로 오르내림!
    const mezW = rw * 0.54;
    const mezX = -rw * 0.5 + mezW * 0.5 + 0.14;
    const railX = mezX + mezW * 0.5 - 0.08;
    const stairStartX = railX + 2.55;
    const stairEndX = railX + 0.12;
    const stairZ = -rd * 0.26;
    const sx = rw * 0.18;
    const sz = 0.65;
    const bx = mezX - 0.35;
    const bz = -rd * 0.14;

    obstacles.push(
      { minX: sx - 1.35, maxX: sx + 1.35, minZ: sz - 0.62, maxZ: sz + 0.62, onlyFloor1: true },
      { minX: bx - 1.25, maxX: bx + 1.25, minZ: bz - 1.35, maxZ: bz + 1.35, onlyLoft: true }
    );
    nodes.push(
      { id: 'door', x: 2.1, y: 0.16, z: rd * 0.36 },
      { id: 'liv_aisle', x: 0.25, y: 0.16, z: -0.15 },
      { id: 'sofa_front', x: sx, y: 0.16, z: sz - 0.9 },
      { id: 'desk_front', x: rw * 0.22, y: 0.16, z: -rd * 0.16 },
      { id: 'stair_bot', x: stairStartX + 0.22, y: 0.16, z: stairZ },
      { id: 'stair_mid', x: (stairStartX + stairEndX) * 0.5, y: 1.95, z: stairZ },
      { id: 'stair_top', x: stairEndX - 0.28, y: 3.78, z: stairZ },
      { id: 'bed_aisle', x: bx + 1.35, y: 3.78, z: 0.35 }
    );
    stations = {
      bedApproach: 'bed_aisle',
      bedPose: { x: bx, y: 4.24, z: bz + 0.08, yaw: 0 },
      sofaApproach: 'sofa_front',
      sofaPose: { x: sx, y: 0.22, z: sz - 0.06, yaw: Math.PI },
      deskApproach: 'desk_front',
      deskPose: { x: rw * 0.22, y: 0.16, z: -rd * 0.16, yaw: Math.PI },
      doorNode: 'door',
      snackApproach: 'liv_aisle',
      snackPose: { x: 1.35, y: 0.16, z: 0.22, yaw: Math.PI }
    };
  }

  return { bounds, obstacles, nodes, stations };
}

function findRoomAislePath(nav, curPos, targetNodeId) {
  const nodes = nav.nodes;
  const dstNode = nodes.find((n) => n.id === targetNodeId);
  if (!dstNode) return [];

  // 현재 위치에서 가장 가까운 같은 층 노드 선택
  let startNode = nodes[0];
  let bestD = Infinity;
  for (const n of nodes) {
    const floorDiff = Math.abs(n.y - curPos.y);
    const d = Math.hypot(n.x - curPos.x, n.z - curPos.z) + floorDiff * 2.2;
    if (d < bestD) {
      bestD = d;
      startNode = n;
    }
  }
  if (startNode.id === dstNode.id) return [{ x: dstNode.x, y: dstNode.y, z: dstNode.z }];

  // 노드 간 장애물 비관통 인접 그래프 BFS 최단 우회 경로 탐색!
  const canLink = (a, b) => {
    const dy = Math.abs(a.y - b.y);
    if (dy > 2.2) return false;
    if (dy > 0.4) {
      // 복층 계단 노드끼리만 층간 이동 허용!
      return a.id.startsWith('stair_') && b.id.startsWith('stair_');
    }
    for (const ob of nav.obstacles) {
      if ((ob.onlyFloor1 && a.y > 1.5) || (ob.onlyLoft && a.y < 1.5)) continue;
      if (segmentHitsAABB2D(a.x, a.z, b.x, b.z, ob, 0.24)) return false;
    }
    return true;
  };

  const queue = [[startNode]];
  const visited = new Set([startNode.id]);
  while (queue.length > 0) {
    const path = queue.shift();
    const last = path[path.length - 1];
    if (last.id === dstNode.id) {
      return path.map((p) => ({ x: p.x, y: p.y, z: p.z }));
    }
    for (const nxt of nodes) {
      if (visited.has(nxt.id)) continue;
      if (canLink(last, nxt)) {
        visited.add(nxt.id);
        queue.push([...path, nxt]);
      }
    }
  }
  return [{ x: startNode.x, y: startNode.y, z: startNode.z }, { x: dstNode.x, y: dstNode.y, z: dstNode.z }];
}

function chooseNextSmartRoomRoutine(ac, actorIdx = 0) {
  const rm = ac.room;
  const nav = ac.nav;
  const st = nav.stations;
  resetCharacterPoseNeutral(ac.mesh);
  ac.allowFurnitureOverlap = false;

  // 순환 루틴: ① 침대 수면/스마트폰 ➔ ② 소파 착석 영화/TV 감상 ➔ ③ 책상 타이핑 / LP 음악감상 ➔ ④ 1층 편의점·빵집 간식 외출 & 귀가 취식!
  const cycleOrder = ['sofa_watch', 'desk_work', 'bed_sleep', 'outing_snack'];
  ac.routineStep = ((ac.routineStep || 0) + 1) % cycleOrder.length;
  const pick = cycleOrder[(ac.routineStep + actorIdx) % cycleOrder.length];

  if (pick === 'bed_sleep') {
    ac.nextAction = 'bed_sleep';
    ac.path = findRoomAislePath(nav, ac.mesh.position, st.bedApproach);
  } else if (pick === 'sofa_watch') {
    ac.nextAction = 'sofa_watch';
    ac.path = findRoomAislePath(nav, ac.mesh.position, st.sofaApproach);
  } else if (pick === 'desk_work') {
    ac.nextAction = 'desk_work';
    ac.path = findRoomAislePath(nav, ac.mesh.position, st.deskApproach);
  } else {
    ac.nextAction = 'go_outing';
    ac.path = findRoomAislePath(nav, ac.mesh.position, st.doorNode);
  }
  ac.pathIdx = 0;
  ac.state = 'walking';
}

function syncBuildingResidents3D(lotId) {
  const entry = lot3D[lotId];
  const bState = state.buildings[lotId];
  if (!entry || !bState) return;

  for (const rm of bState.rooms) {
    if (residentActors[rm.id]) {
      for (const a of residentActors[rm.id]) {
        if (a.zzzEl) a.zzzEl.remove();
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

    const nav = buildRoomNavData(rm);
    const hType = HOUSEHOLD_TYPES[rm.household.type] || HOUSEHOLD_TYPES.student;
    const count = Math.min(3, hType.memberCount || 1);
    const list = [];

    for (let i = 0; i < count; i++) {
      const mesh = createChibiPerson3D(rm.household.type, null, i + Number(rm.subId || 1));
      if (rm.household.type === 'family4' && i >= 2) {
        mesh.scale.setScalar(0.76);
      }
      const spawnNode = nav.nodes[Math.min(i, nav.nodes.length - 1)] || { x: 0, y: 0.16, z: 0.6 };
      mesh.position.set(spawnNode.x + i * 0.45, spawnNode.y, spawnNode.z);
      rGrp.add(mesh);

      const actorObj = {
        mesh,
        room: rm,
        nav,
        actorIdx: i,
        routineStep: i,
        state: 'idle',
        nextAction: 'sofa_watch',
        path: [],
        pathIdx: 0,
        actionTimer: 0.4 + i * 0.9,
        zzzTimer: 0,
        zzzEl: null,
        allowFurnitureOverlap: false,
        waitTimer: 0
      };
      chooseNextSmartRoomRoutine(actorObj, i);
      list.push(actorObj);
    }
    residentActors[rm.id] = list;

    if (rm.interiorLv >= 1 || rm.layoutType !== 'studio') {
      const petMesh = createCutePet3D(rm.subId === '102' ? 'corgi' : 'cat');
      const doorN = nav.nodes[0] || { x: 0.4, z: 1.1 };
      petMesh.position.set(doorN.x, 0.16, doorN.z);
      rGrp.add(petMesh);
      roomPetActors[rm.id] = {
        mesh: petMesh,
        room: rm,
        nav,
        tx: doorN.x,
        tz: doorN.z,
        waitTimer: 1.2
      };
    }
  }
}

function tickBuildingResidentsAI(dt, elapsed) {
  for (const roomId of Object.keys(residentActors)) {
    const actors = residentActors[roomId];
    for (let idx = 0; idx < actors.length; idx++) {
      const ac = actors[idx];
      const rm = ac.room;
      const ud = ac.mesh.userData;
      const lot = state.lots.find((l) => l.lotId === rm.lotId);
      const roomWorldX = (lot?.x || 0) + rm.lx;
      const roomWorldZ = (lot?.z || 0) + rm.lz;

      // 1인칭 집들이 방문 중 마중 나온 호스트는 정중히 인사 대기 유지
      if (fpState.active && fpState.mode === 'room' && fpState.roomId === rm.id && idx === 0) {
        resetCharacterPoseNeutral(ac.mesh);
        continue;
      }

      if (ac.state === 'walking') {
        const wp = ac.path[ac.pathIdx];
        if (!wp) {
          // 목적지 통로 도착 -> 가구/설비 상호작용 상태 돌입!
          const st = ac.nav.stations;
          if (ac.nextAction === 'bed_sleep') {
            ac.state = 'bed_sleep';
            ac.allowFurnitureOverlap = true;
            ac.actionTimer = 5.8 + Math.random() * 2.2;
            ac.usePhoneOnBed = Math.random() < 0.35;
            ac.mesh.position.set(st.bedPose.x + idx * 0.28, st.bedPose.y, st.bedPose.z);
            ac.mesh.rotation.y = st.bedPose.yaw;
            if (ac.usePhoneOnBed) {
              ud.legL.rotation.x = -1.15;
              ud.legR.rotation.x = -1.15;
              ud.armL.rotation.x = -0.85;
              ud.armR.rotation.x = -0.85;
              if (ud.phoneProp) ud.phoneProp.visible = true;
              showSpeechBubble3D(`res_act_${rm.id}_${idx}`, roomWorldX + st.bedPose.x, rm.ly + st.bedPose.y + 1.85, roomWorldZ + st.bedPose.z, '새 침대에 걸터앉아 스마트폰 보는 시간이 제일 행복해~', 3.0);
            } else {
              ud.bodyRig.rotation.x = -1.38;
              ud.bodyRig.position.y = -0.22;
              ud.bodyRig.position.z = 0.32;
              ud.armL.rotation.z = 0.1;
              ud.armR.rotation.z = -0.1;
            }
          } else if (ac.nextAction === 'sofa_watch') {
            ac.state = 'sofa_watch';
            ac.allowFurnitureOverlap = true;
            ac.actionTimer = 5.6 + Math.random() * 2.0;
            ac.mesh.position.set(st.sofaPose.x + (idx - 0.5) * 0.52, st.sofaPose.y, st.sofaPose.z);
            ac.mesh.rotation.y = st.sofaPose.yaw;
            // 무릎을 실제로 굽혀 소파 시트에 착석 + 빔프로젝터/TV 정면 응시 + 음료컵 파지!
            ud.bodyRig.position.y = -0.14;
            ud.legL.rotation.x = -1.24;
            ud.legR.rotation.x = -1.24;
            ud.armL.rotation.x = -0.68;
            if (ud.cupProp) ud.cupProp.visible = true;
            const watchingMsg = rm.equippedFurniture?.appliance === 'app_cinema'
              ? '소파에 앉아 빔프로젝터 대화면으로 영화 보니까 극장이 따로 없네!'
              : '푹신한 소파에 앉아 시원한 음료 마시며 TV 타임~';
            showSpeechBubble3D(`res_act_${rm.id}_${idx}`, roomWorldX + st.sofaPose.x, rm.ly + 2.0, roomWorldZ + st.sofaPose.z, watchingMsg, 3.2);
          } else if (ac.nextAction === 'desk_work') {
            ac.state = 'desk_work';
            ac.allowFurnitureOverlap = false;
            ac.actionTimer = 5.2 + Math.random() * 2.0;
            ac.mesh.position.set(st.deskPose.x, st.deskPose.y, st.deskPose.z);
            ac.mesh.rotation.y = st.deskPose.yaw;
            const isVinyl = rm.equippedFurniture?.appliance === 'app_vinyl' || rm.household?.type === 'musician';
            ac.isVinylDance = isVinyl;
            showSpeechBubble3D(
              `res_act_${rm.id}_${idx}`,
              roomWorldX + st.deskPose.x,
              rm.ly + 2.05,
              roomWorldZ + st.deskPose.z,
              isVinyl ? 'LP 턴테이블 아날로그 재즈 선율 최고다~' : '집중 모드 ON! 오늘 작업 진도 쭉쭉 나간다!',
              3.0
            );
          } else if (ac.nextAction === 'go_outing') {
            // 현관문을 통해 1층 편의점·빵집 간식 사러 외출!
            ac.state = 'outing_away';
            ac.actionTimer = 4.2;
            ac.mesh.visible = false;
          } else if (ac.nextAction === 'eat_snack') {
            ac.state = 'eat_snack';
            ac.actionTimer = 4.4;
            ac.mesh.position.set(st.snackPose.x, st.snackPose.y, st.snackPose.z);
            ac.mesh.rotation.y = st.snackPose.yaw;
            ud.carryBag.visible = true;
            showSpeechBubble3D(
              `res_act_${rm.id}_${idx}`,
              roomWorldX + st.snackPose.x,
              rm.ly + 2.05,
              roomWorldZ + st.snackPose.z,
              '1층 마트랑 빵집에서 갓 사 온 간식 타임! 너무 맛있다~',
              3.2
            );
          } else {
            chooseNextSmartRoomRoutine(ac, idx);
          }
          continue;
        }

        const dx = wp.x - ac.mesh.position.x;
        const dy = wp.y - ac.mesh.position.y;
        const dz = wp.z - ac.mesh.position.z;
        const dist = Math.hypot(dx, dy, dz);
        if (dist < 0.15) {
          ac.pathIdx += 1;
        } else {
          const spd = 2.25 * dt;
          ac.mesh.position.x += (dx / dist) * Math.min(dist, spd);
          ac.mesh.position.y += (dy / dist) * Math.min(dist, spd * 1.25);
          ac.mesh.position.z += (dz / dist) * Math.min(dist, spd);
          if (Math.abs(dy) < 0.25) {
            pushOutOfObstaclesAndWalls2D(ac.mesh.position, ac.nav.obstacles, ac.nav.bounds, 0.28);
          }
          ac.mesh.rotation.y = Math.atan2(dx, dz);
          const swing = Math.sin(elapsed * 11.5 + idx * 1.7) * 0.48;
          ud.legL.rotation.x = swing;
          ud.legR.rotation.x = -swing;
          ud.armL.rotation.x = -swing * 0.65;
          ud.armR.rotation.x = ud.carryBag.visible ? -0.55 : swing * 0.65;
        }
      } else if (ac.state === 'bed_sleep') {
        ac.actionTimer -= dt;
        ac.zzzTimer -= dt;
        if (!ac.usePhoneOnBed) {
          // 새근새근 수면 호흡 & Zzz 수면 구름 파티클
          ud.bodyRig.scale.y = 1.0 + Math.sin(elapsed * 3.2) * 0.03;
          if (ac.zzzTimer <= 0) {
            ac.zzzTimer = 1.6;
            showSpeechBubble3D(
              `zzz_${rm.id}_${idx}`,
              roomWorldX + ac.mesh.position.x,
              rm.ly + ac.mesh.position.y + 1.35,
              roomWorldZ + ac.mesh.position.z,
              '쿨쿨... Zzz 꿀잠 자는 중~',
              1.45
            );
          }
        } else {
          ud.armR.rotation.x = -0.85 + Math.sin(elapsed * 6.0) * 0.1;
        }
        if (ac.actionTimer <= 0) {
          ud.bodyRig.scale.set(1, 1, 1);
          const appNode = ac.nav.nodes.find((n) => n.id === ac.nav.stations.bedApproach);
          if (appNode) ac.mesh.position.set(appNode.x, appNode.y, appNode.z);
          chooseNextSmartRoomRoutine(ac, idx);
        }
      } else if (ac.state === 'sofa_watch') {
        ac.actionTimer -= dt;
        // 화면 쪽을 바라보며 고개를 까딱이고 음료를 홀짝이는 리얼 모션
        if (ud.head) ud.head.rotation.x = Math.sin(elapsed * 3.4 + idx) * 0.08;
        ud.armL.rotation.x = -0.68 + Math.sin(elapsed * 2.8) * 0.16;
        if (ac.actionTimer <= 0) {
          if (ud.head) ud.head.rotation.x = 0;
          const appNode = ac.nav.nodes.find((n) => n.id === ac.nav.stations.sofaApproach);
          if (appNode) ac.mesh.position.set(appNode.x, appNode.y, appNode.z);
          chooseNextSmartRoomRoutine(ac, idx);
        }
      } else if (ac.state === 'desk_work') {
        ac.actionTimer -= dt;
        if (ac.isVinylDance) {
          // LP 턴테이블 리듬에 맞춰 몸을 흔들며 음악 감상!
          ud.bodyRig.rotation.z = Math.sin(elapsed * 5.6) * 0.11;
          ud.bodyRig.position.y = Math.abs(Math.sin(elapsed * 5.6)) * 0.08;
          ud.armL.rotation.z = 0.45 + Math.sin(elapsed * 5.6) * 0.25;
          ud.armR.rotation.z = -0.45 - Math.sin(elapsed * 5.6) * 0.25;
        } else {
          // 책상 의자 착석 포즈 + 양팔 고속 타이핑/드로잉!
          ud.bodyRig.position.y = -0.1;
          ud.legL.rotation.x = -1.05;
          ud.legR.rotation.x = -1.05;
          ud.armL.rotation.x = -0.95 + Math.sin(elapsed * 18.0) * 0.22;
          ud.armR.rotation.x = -0.95 + Math.cos(elapsed * 18.0) * 0.22;
        }
        if (ac.actionTimer <= 0) {
          chooseNextSmartRoomRoutine(ac, idx);
        }
      } else if (ac.state === 'outing_away') {
        ac.actionTimer -= dt;
        if (ac.actionTimer <= 0) {
          // 1층에서 간식 봉투를 사 들고 자기 방 현관으로 귀가!
          ac.mesh.visible = true;
          const doorN = ac.nav.nodes.find((n) => n.id === ac.nav.stations.doorNode) || ac.nav.nodes[0];
          ac.mesh.position.set(doorN.x, doorN.y, doorN.z);
          ud.carryBag.visible = true;
          ac.nextAction = 'eat_snack';
          ac.path = findRoomAislePath(ac.nav, ac.mesh.position, ac.nav.stations.snackApproach);
          ac.pathIdx = 0;
          ac.state = 'walking';
        }
      } else if (ac.state === 'eat_snack') {
        ac.actionTimer -= dt;
        ud.armR.rotation.x = -0.75 + Math.sin(elapsed * 8.0) * 0.24;
        if (ac.actionTimer <= 0) {
          ud.carryBag.visible = false;
          chooseNextSmartRoomRoutine(ac, idx);
        }
      }
    }
    // 세입자 캐릭터 간 최소 안전거리(0.62m) 유지로 겹침 원천 차단!
    enforceCharacterSeparation(actors, 0.62);
  }

  for (const roomId of Object.keys(roomPetActors)) {
    const p = roomPetActors[roomId];
    if (p.waitTimer > 0) {
      p.waitTimer -= dt;
      if (p.waitTimer <= 0) {
        const pickNode = p.nav.nodes[Math.floor(Math.random() * p.nav.nodes.length)];
        if (pickNode && pickNode.y < 1.0) {
          p.tx = pickNode.x;
          p.tz = pickNode.z;
        }
      }
    } else {
      const dx = p.tx - p.mesh.position.x;
      const dz = p.tz - p.mesh.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.14) {
        p.waitTimer = 1.8 + Math.random() * 2.2;
      } else {
        p.mesh.position.x += (dx / dist) * Math.min(dist, 1.55 * dt);
        p.mesh.position.z += (dz / dist) * Math.min(dist, 1.55 * dt);
        pushOutOfObstaclesAndWalls2D(p.mesh.position, p.nav.obstacles, p.nav.bounds, 0.22);
        p.mesh.rotation.y = Math.atan2(dx, dz);
        p.mesh.position.y = 0.16 + Math.abs(Math.sin(elapsed * 14)) * 0.08;
      }
    }
  }

  // 1층 편의점 · 코인세탁소 · 부티크 단독상가 직원 & 손님 스마트 일상 AI 동시 구동!
  tickShopInteriorSmartAI(dt, elapsed);
}

function tickShopInteriorSmartAI(dt, elapsed) {
  const mainLot = state.lots.find((l) => l.lotId === 'lot_main') || { x: -4.2, z: -6.4 };

  // 1) 1층 미니미 마트 24 손님 & POS 알바생 리얼 루틴 (통로 이동 ➔ 과자 고르기 ➔ POS 계산 차링! ➔ 창가 컵라면 취식)
  const martWorldX = mainLot.x - 7.15;
  const martWorldZ = mainLot.z;
  let someoneAtMartPos = false;

  for (const mc of shopSmartAI.martCustomers) {
    const ud = mc.mesh?.userData;
    if (!ud) continue;

    if (mc.waypoints && mc.wpIdx < mc.waypoints.length) {
      const wp = mc.waypoints[mc.wpIdx];
      const dx = wp.x - mc.mesh.position.x;
      const dz = wp.z - mc.mesh.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.14) {
        mc.wpIdx += 1;
      } else {
        mc.mesh.position.x += (dx / d) * Math.min(d, 2.15 * dt);
        mc.mesh.position.z += (dz / d) * Math.min(d, 2.15 * dt);
        mc.mesh.position.y = 0.08 + Math.abs(Math.sin(elapsed * 11 + mc.slotIdx)) * 0.05;
        mc.mesh.rotation.y = Math.atan2(dx, dz);
        const sw = Math.sin(elapsed * 11.5) * 0.46;
        ud.legL.rotation.x = sw;
        ud.legR.rotation.x = -sw;
        ud.armL.rotation.x = -sw * 0.6;
        ud.armR.rotation.x = ud.carryBag.visible ? -0.5 : sw * 0.6;
        continue;
      }
    }

    ud.legL.rotation.x = 0;
    ud.legR.rotation.x = 0;

    if (mc.phase === 'walk_to_shelf') {
      mc.phase = 'browse_shelf';
      mc.timer = 2.8 + Math.random() * 1.4;
    } else if (mc.phase === 'browse_shelf') {
      // 곤돌라 진열대 쪽으로 몸을 돌려 실사 과자봉지·라면을 팔 뻗어 고르는 모션!
      mc.timer -= dt;
      mc.mesh.rotation.y = mc.slotIdx === 0 ? -Math.PI * 0.5 : Math.PI * 0.5;
      ud.armR.rotation.x = -1.05 + Math.sin(elapsed * 5.5) * 0.22;
      if (ud.head) ud.head.rotation.y = -Math.PI * 0.5 + Math.sin(elapsed * 2.5) * 0.18;
      if (mc.timer <= 0) {
        if (ud.head) ud.head.rotation.y = -Math.PI * 0.5;
        mc.phase = 'to_pos';
        mc.waypoints = [
          { x: mc.aisleX, z: 1.95 },
          { x: 2.05, z: 1.35 - mc.slotIdx * 0.62 }
        ];
        mc.wpIdx = 0;
      }
    } else if (mc.phase === 'to_pos') {
      mc.phase = 'pay_pos';
      mc.timer = 2.1;
      mc.paidEffectDone = false;
    } else if (mc.phase === 'pay_pos') {
      someoneAtMartPos = true;
      mc.timer -= dt;
      mc.mesh.rotation.y = Math.PI * 0.5; // 알바생과 정면 마주 보기!
      ud.armR.rotation.x = -0.65 + Math.sin(elapsed * 7.0) * 0.15;
      if (!mc.paidEffectDone && mc.timer < 1.2) {
        mc.paidEffectDone = true;
        ud.carryBag.visible = true;
        spawnPoofParticles3D(martWorldX + 2.75, 1.85, martWorldZ + 1.35, 0xFFD93D, 6);
        if (focusedFirstFloorShopId === 'shop_mart1f') {
          spawnJackpotText3D(martWorldX + 2.8, 2.25, martWorldZ + 1.35, '차링! 바코드 결제 완료!', 'coin_stack');
          showSpeechBubble3D(`mart_pay_${mc.slotIdx}`, martWorldX + 2.05, 2.45, martWorldZ + 1.35, '허니버터칩이랑 도시락 결제할게요~!', 2.4, true);
        }
      }
      if (mc.timer <= 0) {
        if (mc.slotIdx === 0) {
          // 창가 스툴 의자로 돌아가 컵라면/도시락 취식!
          mc.phase = 'to_ramen_bar';
          mc.waypoints = [
            { x: 1.45, z: 2.05 },
            { x: -0.43, z: 2.48 }
          ];
          mc.wpIdx = 0;
        } else {
          // 쇼핑백 들고 출입문 앞까지 이동 후 다음 손님 순환
          mc.phase = 'to_door_cycle';
          mc.waypoints = [
            { x: 1.15, z: 2.15 },
            { x: 0.85, z: 3.35 }
          ];
          mc.wpIdx = 0;
        }
      }
    } else if (mc.phase === 'to_ramen_bar') {
      mc.phase = 'eat_ramen';
      mc.timer = 3.8;
    } else if (mc.phase === 'eat_ramen') {
      mc.timer -= dt;
      mc.mesh.rotation.y = 0; // 통유리 창밖 거리 감상하며 컵라면 호로록!
      ud.bodyRig.position.y = -0.08;
      ud.legL.rotation.x = -1.16;
      ud.legR.rotation.x = -1.16;
      ud.armR.rotation.x = -0.88 + Math.sin(elapsed * 8.5) * 0.22;
      if (mc.timer <= 0) {
        resetCharacterPoseNeutral(mc.mesh);
        ud.carryBag.visible = false;
        mc.phase = 'walk_to_shelf';
        mc.waypoints = [
          { x: -1.45, z: 1.95 },
          { x: -1.45, z: -0.28 }
        ];
        mc.wpIdx = 0;
      }
    } else if (mc.phase === 'to_door_cycle') {
      ud.carryBag.visible = false;
      mc.phase = 'walk_to_shelf';
      mc.waypoints = [
        { x: 0.92, z: 1.95 },
        { x: 0.92, z: -0.22 }
      ];
      mc.wpIdx = 0;
    }
  }
  enforceCharacterSeparation(shopSmartAI.martCustomers, 0.6);

  // 편의점 POS 알바생 민수 능동 모션 (손님 계산 시 포스기 타건 & 인사, 평소엔 매대/포스 점검)
  if (shopSmartAI.martClerk?.userData) {
    const cud = shopSmartAI.martClerk.userData;
    if (someoneAtMartPos) {
      shopSmartAI.martClerk.rotation.y = -Math.PI * 0.35;
      cud.armL.rotation.x = -0.75 + Math.sin(elapsed * 14) * 0.22;
      cud.armR.rotation.x = -0.75 + Math.cos(elapsed * 14) * 0.22;
    } else {
      shopSmartAI.martClerk.rotation.y = Math.sin(elapsed * 0.9) * 0.35;
      cud.armL.rotation.x = -0.25 + Math.sin(elapsed * 3.2) * 0.1;
      cud.armR.rotation.x = -0.25;
    }
  }

  // 2) 1층 버블 코인세탁소 손님 & 매니저 리얼 루틴 (회전 세탁기 앞 투입 ➔ 대기 벤치 스마트폰 ➔ 원목 테이블 빨래 개기)
  const washWorldX = mainLot.x + 7.15;
  const washWorldZ = mainLot.z;
  for (const wc of shopSmartAI.washCustomers) {
    const ud = wc.mesh?.userData;
    if (!ud) continue;

    if (wc.waypoints && wc.wpIdx < wc.waypoints.length) {
      const wp = wc.waypoints[wc.wpIdx];
      const dx = wp.x - wc.mesh.position.x;
      const dz = wp.z - wc.mesh.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.14) {
        wc.wpIdx += 1;
      } else {
        wc.mesh.position.x += (dx / d) * Math.min(d, 2.05 * dt);
        wc.mesh.position.z += (dz / d) * Math.min(d, 2.05 * dt);
        wc.mesh.position.y = 0.08 + Math.abs(Math.sin(elapsed * 11 + wc.slotIdx)) * 0.05;
        wc.mesh.rotation.y = Math.atan2(dx, dz);
        const sw = Math.sin(elapsed * 11.2) * 0.45;
        ud.legL.rotation.x = sw;
        ud.legR.rotation.x = -sw;
        continue;
      }
    }

    ud.legL.rotation.x = 0;
    ud.legR.rotation.x = 0;

    if (wc.phase === 'to_washer') {
      wc.phase = 'load_washer';
      wc.timer = 3.0;
    } else if (wc.phase === 'load_washer') {
      // 돌아가는 2단 드럼세탁기 정면 앞에 서서 빨랫감을 넣는 모션!
      wc.timer -= dt;
      resetCharacterPoseNeutral(wc.mesh);
      wc.mesh.rotation.y = Math.PI;
      ud.armL.rotation.x = -0.95 + Math.sin(elapsed * 7.5) * 0.25;
      ud.armR.rotation.x = -0.95 - Math.sin(elapsed * 7.5) * 0.25;
      if (wc.timer <= 0) {
        // 원목 폴딩 테이블과 바퀴 카트를 우회해 대기 벤치로 이동!
        wc.phase = 'to_bench';
        wc.waypoints = [
          { x: -3.25, z: -1.65 },
          { x: -3.25, z: 2.25 },
          { x: -1.55 + wc.slotIdx * 0.68, z: 2.62 }
        ];
        wc.wpIdx = 0;
      }
    } else if (wc.phase === 'to_bench') {
      wc.phase = 'wait_bench';
      wc.timer = 3.8;
    } else if (wc.phase === 'wait_bench') {
      // 대기 벤치에 걸터앉아 스마트폰을 보며 세탁 완료 대기!
      wc.timer -= dt;
      wc.mesh.rotation.y = Math.PI;
      ud.bodyRig.position.y = -0.1;
      ud.legL.rotation.x = -1.16;
      ud.legR.rotation.x = -1.16;
      ud.armR.rotation.x = -0.82 + Math.sin(elapsed * 5.0) * 0.08;
      if (ud.phoneProp) ud.phoneProp.visible = true;
      if (wc.timer <= 0) {
        resetCharacterPoseNeutral(wc.mesh);
        wc.phase = 'to_fold_table';
        wc.waypoints = [
          { x: -0.2 + wc.slotIdx * 0.72, z: 1.56 }
        ];
        wc.wpIdx = 0;
      }
    } else if (wc.phase === 'to_fold_table') {
      wc.phase = 'fold_towels';
      wc.timer = 3.2;
      if (focusedFirstFloorShopId === 'shop_wash1f') {
        showSpeechBubble3D(`wash_fold_${wc.slotIdx}`, washWorldX + wc.mesh.position.x, 2.45, washWorldZ + 1.56, '건조기 돌린 수건이 뽀송뽀송 따끈해요~!', 2.5, true);
      }
    } else if (wc.phase === 'fold_towels') {
      // 원목 폴딩 테이블 앞에서 빨래를 반듯하게 개는 양손 모션!
      wc.timer -= dt;
      wc.mesh.rotation.y = Math.PI;
      ud.armL.rotation.x = -0.85 + Math.sin(elapsed * 9.0) * 0.24;
      ud.armR.rotation.x = -0.85 + Math.cos(elapsed * 9.0) * 0.24;
      if (wc.timer <= 0) {
        resetCharacterPoseNeutral(wc.mesh);
        wc.phase = 'to_washer';
        wc.waypoints = [
          { x: 2.35, z: 1.56 },
          { x: 2.35, z: -1.75 },
          { x: wc.washerX, z: -1.82 }
        ];
        wc.wpIdx = 0;
      }
    }
  }
  enforceCharacterSeparation(shopSmartAI.washCustomers, 0.62);

  if (shopSmartAI.washClerk?.userData) {
    const wud = shopSmartAI.washClerk.userData;
    shopSmartAI.washClerk.rotation.y = -Math.PI * 0.65 + Math.sin(elapsed * 1.2) * 0.35;
    wud.armL.rotation.x = -0.35 + Math.sin(elapsed * 4.2) * 0.16;
  }

  // 3) 단독 상가 3곳(빵집 제빵사 · 카페 바리스타 · 플라워샵 플로리스트) 능동 설비 작업 모션!
  for (const sid of Object.keys(standaloneShop3D)) {
    const entry = standaloneShop3D[sid];
    const staff = entry?.staffMesh;
    if (!staff?.userData) continue;
    const sud = staff.userData;
    // 오븐/에스프레소 머신 쪽과 전면 POS 카운터 쪽을 번갈아 돌며 조리·추출·계산 수행!
    const workCycle = (elapsed * 0.45 + (sid === 'shop_bakery' ? 0 : sid === 'shop_roastery' ? 1.5 : 3.0)) % 2.0;
    if (workCycle < 1.0) {
      // 뒷벽 화덕 오븐 / 에스프레소 머신 작업
      staff.rotation.y = Math.PI + Math.sin(elapsed * 2.0) * 0.25;
      sud.armL.rotation.x = -0.85 + Math.sin(elapsed * 10.0) * 0.22;
      sud.armR.rotation.x = -0.85 - Math.sin(elapsed * 10.0) * 0.22;
    } else {
      // 전면 쇼케이스 진열 & 손님 맞이 인사
      staff.rotation.y = Math.sin(elapsed * 1.8) * 0.25;
      sud.armL.rotation.x = -0.35;
      sud.armR.rotation.x = -0.55 + Math.sin(elapsed * 7.5) * 0.22;
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
  const inDuel = !!duelState.active;
  const targetRoomObj = inFpRoom ? findRoomById(fpState.roomId) : findRoomById(focusedRoomId);
  const inRoomFocus = (!!targetRoomObj && !inDuel && (inFpRoom || (!driveState.active && !fpState.active)));
  const inShopFocus = !!focusedShopId && !inDuel && !driveState.active && !fpState.active;
  const in1FShopFocus = !!focusedFirstFloorShopId && !inDuel && !driveState.active && !fpState.active;

  // 스튜디오 배경 전환 (제2마을 타운 뷰에서는 노을빛 트와일라잇 황혼 배경 적용!)
  const townSkyTex = state.activeTownStage === 2
    ? (TEX.twilightSkyBackdrop || TEX.skyBackdrop)
    : TEX.skyBackdrop;
  scene.background = (inRoomFocus || inShopFocus || in1FShopFocus || inFpShop || inDuel)
    ? TEX.studioBackdrop
    : townSkyTex;
  if (studioStageDisc) {
    if (inDuel) {
      studioStageDisc.position.set(SHOWROOM_DUEL_ORIGIN.x, -0.25, SHOWROOM_DUEL_ORIGIN.z);
      studioStageDisc.visible = true;
    } else if (inRoomFocus && targetRoomObj) {
      const lot = state.lots.find((l) => l.lotId === targetRoomObj.lotId);
      studioStageDisc.position.set((lot?.x || 0) + targetRoomObj.lx, targetRoomObj.ly - 0.18, (lot?.z || 0) + targetRoomObj.lz);
      studioStageDisc.visible = true;
    } else if (inShopFocus) {
      const stpl = STANDALONE_SHOPS_TEMPLATE.find((s) => s.shopId === focusedShopId);
      studioStageDisc.position.set(stpl?.x || 0, 0.08, stpl?.z || 0);
      studioStageDisc.visible = true;
    } else if (in1FShopFocus) {
      const ftpl = (window.FIRST_FLOOR_SHOPS_TEMPLATE || []).find((s) => s.shopId === focusedFirstFloorShopId);
      const lot = state.lots.find((l) => l.lotId === (ftpl?.lotId || 'lot_main'));
      studioStageDisc.position.set((lot?.x || 0) + (ftpl?.localX || 0), 0.06, (lot?.z || 0));
      studioStageDisc.visible = true;
    } else {
      studioStageDisc.visible = false;
    }
  }

  // 스튜디오 보조광 강도 제어
  if (studioKeyLight) {
    const targetInt = (inRoomFocus || inShopFocus || in1FShopFocus || inFpShop || inDuel) ? 1.28 : 0.0;
    studioKeyLight.intensity = THREE.MathUtils.lerp(studioKeyLight.intensity, targetInt, Math.min(1, dt * 8));
    studioFillLight.intensity = THREE.MathUtils.lerp(studioFillLight.intensity, targetInt * 0.68, Math.min(1, dt * 8));
    studioRimLight.intensity = THREE.MathUtils.lerp(studioRimLight.intensity, targetInt * 0.52, Math.min(1, dt * 8));
  }

  // 아일랜드/트와일라잇 하버/단독상가/차량/거리 입주민/구름/마일스톤 가시성 제어
  if (islandRootGroup) islandRootGroup.visible = !inRoomFocus && !inShopFocus && !in1FShopFocus && !inFpShop && !inDuel;
  if (harborRootGroup) harborRootGroup.visible = !inRoomFocus && !inShopFocus && !in1FShopFocus && !inFpShop && !inDuel;
  if (milestoneState.group) milestoneState.group.visible = !inRoomFocus && !inShopFocus && !in1FShopFocus && !inFpShop && !inDuel;
  if (driveState.carRootGroup) driveState.carRootGroup.visible = !inRoomFocus && !inShopFocus && !in1FShopFocus && !inFpShop && !inDuel;
  if (driveState.vehicleMesh?.userData?.driverRef) {
    driveState.vehicleMesh.userData.driverRef.visible = !(driveState.active && driveState.cockpitView);
  }
  for (const cl of cloudActors) {
    cl.mesh.visible = !inRoomFocus && !inShopFocus && !in1FShopFocus && !inFpShop && !inDuel;
  }
  for (const w of streetOutingActors) {
    w.mesh.visible = !inRoomFocus && !in1FShopFocus && !inFpShop && !inDuel && (!inShopFocus || w.targetShopId === focusedShopId);
  }
  for (const sid of Object.keys(standaloneShop3D)) {
    standaloneShop3D[sid].group.visible = !inRoomFocus && !in1FShopFocus && !inFpShop && !inDuel && (!inShopFocus || sid === focusedShopId);
  }

  // [요구사항 3: 투시 거리 대폭 완화] 기본 타운 뷰(zoom 0.78)에서도 인형의 집처럼 내부가 시원하게 투시!
  let targetShell = 0.16;
  if (inRoomFocus || in1FShopFocus) {
    targetShell = 0.0;
  } else if (driveState.active) {
    targetShell = 0.24;
  } else if (camera.zoom > 0.92) {
    targetShell = THREE.MathUtils.clamp(0.16 * (1.0 - (camera.zoom - 0.92) / 0.45), 0.0, 0.16);
  }
  currentShellOpacity = THREE.MathUtils.lerp(currentShellOpacity, targetShell, Math.min(1, dt * 9));

  // 월세 3D 코인 & 머니샤워 지폐가 스튜디오 단독 뷰 허공에 떠다니지 않도록 가시성 동기화
  const inAnyIsolated = inRoomFocus || inShopFocus || in1FShopFocus || inFpShop || inFpRoom || inDuel;
  for (const rb of rentBubbles) {
    if (rb.coin3D) rb.coin3D.visible = !inAnyIsolated;
  }
  if (!fpState.active) {
    for (const bill of makeItRainState.bills) {
      if (bill.mesh) bill.mesh.visible = !inAnyIsolated;
    }
  }
  if (inDuel) {
    for (const lid of Object.keys(lot3D)) {
      if (lot3D[lid]?.root) lot3D[lid].root.visible = false;
    }
    return;
  }

  // 1층 편의점/세탁소 포커스 시 전면 통유리·어닝·간판·타 매장 외벽을 깔끔하게 커트어웨이하여 매장 내부 100% 오픈!
  for (const [fId, fObj] of Object.entries(firstFloorShop3D)) {
    const isTarget1F = !!(in1FShopFocus && focusedFirstFloorShopId === fId);
    if (fObj?.group) fObj.group.visible = !in1FShopFocus || isTarget1F;
    if (fObj?.glassMesh) fObj.glassMesh.visible = !in1FShopFocus;
    if (fObj?.awningMesh) fObj.awningMesh.visible = !in1FShopFocus;
    if (fObj?.signMesh) fObj.signMesh.visible = !in1FShopFocus;
    if (fObj?.borderGlowMesh) fObj.borderGlowMesh.visible = !in1FShopFocus;
    if (fObj?.cutawaySideWall) fObj.cutawaySideWall.visible = !isTarget1F;
    if (Array.isArray(fObj?.otherShopFronts) && isTarget1F) {
      for (const m of fObj.otherShopFronts) {
        if (m) m.visible = false;
      }
    }
  }
  if (!in1FShopFocus) {
    for (const fObj of Object.values(firstFloorShop3D)) {
      if (Array.isArray(fObj?.otherShopFronts)) {
        for (const m of fObj.otherShopFronts) {
          if (m) m.visible = true;
        }
      }
      if (fObj?.cutawaySideWall) fObj.cutawaySideWall.visible = true;
    }
  }

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
    if (in1FShopFocus && lid !== 'lot_main') {
      entry.root.visible = false;
      continue;
    }
    entry.root.visible = true;

    if (entry.isResidential) {
      if (entry.structGroup) entry.structGroup.visible = !inRoomFocus;
      if (entry.upperStructGroup) entry.upperStructGroup.visible = !inRoomFocus && !in1FShopFocus;
      if (entry.infraGroup) entry.infraGroup.visible = !inRoomFocus && !in1FShopFocus;
      if (entry.frontShellGroup) entry.frontShellGroup.visible = currentShellOpacity > 0.02 && !inRoomFocus && !in1FShopFocus;

      for (const sm of entry.shellMats) {
        sm.mat.opacity = sm.baseOpacity * currentShellOpacity;
      }

      for (const rid of Object.keys(entry.roomsMap)) {
        entry.roomsMap[rid].visible = in1FShopFocus ? false : (!inRoomFocus || rid === targetRoomObj.id);
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
    } else if (inShopFocus || in1FShopFocus) {
      dom.xrayBadge.textContent = '매장 투시 뷰';
    } else {
      const pct = Math.round((1 - currentShellOpacity) * 100);
      dom.xrayBadge.textContent = `인형의집 투시 ${pct}%`;
    }
  }
}


// =========================================================
// 10. 수익/행복도 & 4단계 마일스톤 경제 엔진 (포브스 1위까지 쫄깃한 성장 곡선 밸런싱)
// =========================================================
function getFeverMultiplier() {
  if ((state.feverTimer || 0) <= 0) return 1.0;
  return Math.min(2.15, Math.max(1.5, (state.feverPower || 2.0) * 0.72));
}

function getLegendaryTotalMultiplier() {
  return (state.unlockedMilestones || []).includes(100) ? 1.35 : 1.0;
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
  const ms = state.unlockedMilestones || [];
  if (ms.includes(50)) pct += 15;
  if (ms.includes(90)) pct += 35;
  if (ms.includes(100)) pct += 30;
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

  if (room.household) {
    const meta = ROOM_TYPE_META[room.layoutType];
    if (meta && meta.preferredBy.includes(room.household.type)) {
      base = Math.round(base * 1.15);
    }
  }
  const totalBonusPct =
    calcGlobalSynergyPct() +
    calcBuildingInfraBonusPct(bState) +
    (room.giftBonusPct || 0) +
    (room.poachDefenseBonusPct || 0);
  const mult = 1 + totalBonusPct / 100;
  return Math.round(base * mult * getFeverMultiplier() * getLegendaryTotalMultiplier());
}

function calcFirstFloorShopStats(shopId) {
  const tpl = (window.FIRST_FLOOR_SHOPS_TEMPLATE || []).find((s) => s.shopId === shopId);
  const st = state.firstFloorShops?.[shopId];
  if (!tpl) return { visitRev: 16, cycleRev: 28, upgCount: 0 };
  let visitRev = tpl.baseVisitRevenue;
  let cycleRev = tpl.passiveCycleProfit;
  let upgCount = 0;
  for (const upg of tpl.upgradesCatalog) {
    if (st?.upgrades?.[upg.id]) {
      visitRev += upg.visitBonus;
      cycleRev += upg.cycleBonus;
      upgCount += 1;
    }
  }
  const shopMult = ((state.unlockedMilestones || []).includes(75) ? 1.2 : 1.0) * getFeverMultiplier() * getLegendaryTotalMultiplier();
  return {
    visitRev: Math.round(visitRev * shopMult),
    cycleRev: Math.round(cycleRev * shopMult),
    upgCount
  };
}

function getShopUpgradeCatalogFor(tpl) {
  if (tpl && tpl.stage === 2 && Array.isArray(window.HARBOR_SHOP_UPGRADE_CATALOG)) {
    return window.HARBOR_SHOP_UPGRADE_CATALOG;
  }
  return SHOP_UPGRADE_CATALOG;
}

function calcStandaloneShopStats(shopId) {
  const tpl = STANDALONE_SHOPS_TEMPLATE.find((s) => s.shopId === shopId);
  const st = state.standaloneShops?.[shopId];
  if (!tpl || !st) return { visitRev: 18, cycleRev: 30, upgCount: 0 };

  let visitRev = tpl.baseVisitRevenue;
  let cycleRev = tpl.passiveCycleProfit;
  let upgCount = 0;

  for (const upg of getShopUpgradeCatalogFor(tpl)) {
    if (st.upgrades?.[upg.id]) {
      visitRev += upg.visitBonus;
      cycleRev += upg.cycleBonus;
      upgCount += 1;
    }
  }
  const carDef = getCarDef(state.garage?.currentCar || 'car_scooter');
  const bonusPct =
    (st.auctionBonusPct || 0) +
    (carDef.rentBonusPct || 0) +
    ((state.unlockedMilestones || []).includes(75) ? 25 : 0);
  const mult = (1 + bonusPct / 100) * getFeverMultiplier() * getLegendaryTotalMultiplier();
  return {
    visitRev: Math.round(visitRev * mult),
    cycleRev: Math.round(cycleRev * mult),
    upgCount
  };
}

function calcCycleNetIncome() {
  let sum = 0;
  const fMult = getFeverMultiplier() * getLegendaryTotalMultiplier();
  sum += calcFirstFloorShopStats('shop_mart1f').cycleRev;
  sum += calcFirstFloorShopStats('shop_wash1f').cycleRev;

  for (const b of Object.values(state.buildings)) {
    if (b.lotId === 'lot_harbor_main' && !state.harborUnlocked) continue;
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
    if (lot.stage === 2 && !state.harborUnlocked) continue;
    if (lot.owned && lot.devType && !DEVELOPMENT_CATALOG[lot.devType]?.isResidential) {
      sum += Math.round((DEVELOPMENT_CATALOG[lot.devType]?.cycleProfit || 0) * fMult);
    }
  }
  for (const tpl of STANDALONE_SHOPS_TEMPLATE) {
    if (tpl.stage === 2 && !state.harborUnlocked) continue;
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
  let furnBonus = 0;
  for (const b of Object.values(state.buildings)) {
    for (const rm of b.rooms) {
      if (rm.unlocked && rm.household) {
        total += (rm.household.happiness || 42);
        cnt += 1;
      }
      if (rm.unlocked) furnBonus += (rm.interiorLv || 0) * 3;
    }
    for (const installed of Object.values(b.infra || {})) {
      if (installed) furnBonus += 4;
    }
  }
  const ownedShopBonus = Object.values(state.standaloneShops || {}).filter((s) => s.owned).length * 4;
  const baseAvg = cnt === 0 ? 40 : total / cnt;
  const raw = Math.round(baseAvg + carBonus + furnBonus + ownedShopBonus + (state.townHappinessBoost || 0));
  return Math.min(100, Math.max(15, raw));
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
  const happyLabel = document.getElementById('hud-happy-label');
  if (happyLabel) {
    happyLabel.textContent = (state.unlockedMilestones || []).includes(100) ? '성군' : '행복';
  }
  checkAndTriggerHappinessMilestones(hudAnim.targetHappy);
  if (typeof updateForbesRankAndHUD === 'function') {
    updateForbesRankAndHUD(true);
  }
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

// 3D 파티클 · 파동 링 · 잭팟 텍스트 · 말풍선 · 월세 버블 (동시 파티클 캡 110개로 WebGL 60fps 보장!)
const PARTICLE_MAT_CACHE = new Map();
function spawnPoofParticles3D(wx, wy, wz, hex = 0xFFD43B, count = 10) {
  let mat = PARTICLE_MAT_CACHE.get(hex);
  if (!mat) {
    mat = makeClayMat(hex, { emissive: hex, emissiveIntensity: 0.45 });
    PARTICLE_MAT_CACHE.set(hex, mat);
  }
  const safeCount = Math.min(count, 14);
  while (activeParticles.length + safeCount > 110 && activeParticles.length > 0) {
    const oldest = activeParticles.shift();
    if (oldest?.mesh) scene.remove(oldest.mesh);
  }
  for (let i = 0; i < safeCount; i++) {
    const p = new THREE.Mesh(GEO.sphere, mat);
    const s = 0.18 + Math.random() * 0.22;
    p.scale.setScalar(s);
    p.position.set(wx, wy, wz);
    scene.add(p);
    const ang = (i / safeCount) * Math.PI * 2 + Math.random() * 0.5;
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

function clearTransientSpeechBubbles(keepPrefix = null) {
  for (const key of Object.keys(speechEls)) {
    if (keepPrefix && key.startsWith(keepPrefix)) continue;
    speechEls[key].el?.remove();
    speechEls[key].moteEl?.remove();
    delete speechEls[key];
  }
}

function spawnShockwaveRing3D(wx, wy, wz, hex = 0xFFD43B, maxScale = 4.2, duration = 0.85) {
  const grp = new THREE.Group();
  grp.position.set(wx, wy, wz);

  const innerMat = new THREE.MeshBasicMaterial({
    color: hex,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const glowMat = new THREE.MeshBasicMaterial({
    color: hex,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const ring = new THREE.Mesh(GEO.ring, innerMat);
  ring.rotation.x = -Math.PI / 2;
  const glow = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.96, 32), glowMat);
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = -0.005;
  grp.add(glow, ring);
  scene.add(grp);

  shockwaveRings.push({
    mesh: grp,
    mat: innerMat,
    glowMat,
    elapsed: 0,
    duration,
    maxScale
  });
}

function spawnGroundStatusRing3D(wx, wy, wz, statusKind = 'happy') {
  if (shockwaveRings.length > 36) return;
  const groundY = wy <= 1.2 ? 0.28 : wy;
  if (statusKind === 'rival') {
    spawnShockwaveRing3D(wx, groundY, wz, 0xA855F7, 3.8, 1.05);
    spawnShockwaveRing3D(wx, groundY + 0.015, wz, 0xEF4444, 2.7, 0.85);
  } else if (statusKind === 'income') {
    spawnShockwaveRing3D(wx, groundY, wz, 0xFBBF24, 3.1, 0.9);
  } else {
    const useMint = Math.random() < 0.48;
    spawnShockwaveRing3D(wx, groundY, wz, useMint ? 0x34D399 : 0xFBBF24, 2.35, 0.95);
  }
}

function spawnRisingGroundCoins3D(wx, wy, wz, count = 2) {
  const safeCount = Math.min(3, Math.max(1, count));
  while (risingGroundCoins.length + safeCount > 28 && risingGroundCoins.length > 0) {
    const old = risingGroundCoins.shift();
    if (old?.mesh) scene.remove(old.mesh);
  }
  const baseGroundY = wy <= 2.2 ? 0.34 : wy;
  spawnGroundStatusRing3D(wx, baseGroundY, wz, 'income');

  for (let i = 0; i < safeCount; i++) {
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xFFD43B,
      emissive: 0xF59E0B,
      emissiveIntensity: 0.42,
      roughness: 0.25,
      metalness: 0.65,
      transparent: true,
      opacity: 1.0
    });
    const coin = new THREE.Mesh(GEO.coin, coinMat);
    coin.scale.setScalar(0.95);
    const jitterX = (Math.random() - 0.5) * 0.7;
    const jitterZ = (Math.random() - 0.5) * 0.7;
    coin.position.set(wx + jitterX, baseGroundY + i * 0.22, wz + jitterZ);
    scene.add(coin);
    risingGroundCoins.push({
      mesh: coin,
      mat: coinMat,
      vy: 1.75 + i * 0.25,
      elapsed: 0,
      duration: 1.15
    });
  }
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

function isSpeechBubbleAllowedInCurrentView(forceShow = false) {
  if (!forceShow) return false;
  if (titleScreenState.active) return false;
  return true;
}

function showSpeechBubble3D(key, wx, wy, wz, text, duration = 2.0, forceShow = false) {
  const isRivalLine = key.includes('kang') || key.includes('rival') || key.includes('poach') || key.includes('bid_kang');

  // 발밑 3D 컬러 오라 링 활성화 (일상 말풍선 100% 바닥 3D 링으로 대체!)
  let matchedAura = false;
  for (const ar of characterAuraRings) {
    if (!ar.owner?.parent) continue;
    const wp = new THREE.Vector3();
    ar.owner.getWorldPosition(wp);
    if (Math.hypot(wp.x - wx, wp.z - wz) < 2.5) {
      ar.owner.userData.auraTimer = 2.4;
      ar.owner.userData.auraHex = isRivalLine ? 0xA855F7 : ((key.length % 2 === 0) ? 0xFBBF24 : 0x34D399);
      matchedAura = true;
    }
  }
  if (!matchedAura && Math.random() < 0.45) {
    spawnGroundStatusRing3D(wx, wy < 2.8 ? 0.28 : wy - 1.4, wz, isRivalLine ? 'rival' : 'happy');
  }

  // 일상 자동 대사(forceShow === false) 및 군중 환호 다중 말풍선은 100% 차단 -> 평소 말풍선 0개 보장!
  const isCrowdSpam = key.includes('cheer') || key.startsWith('rain_') || key.startsWith('ms_');
  if (!forceShow || isCrowdSpam || !dom.speechLayer) {
    if (isRivalLine) spawnGroundStatusRing3D(wx, 0.28, wz, 'rival');
    return;
  }

  // 결정적 순간에만 반투명 글래스 한 줄 캡슐 토스트 딱 1개만 2초간 표시 후 소멸!
  clearTransientSpeechBubbles(null);
  const el = document.createElement('div');
  el.className = isRivalLine ? 'speech-cloud rival-dark-glass' : 'speech-cloud';
  el.textContent = text;
  dom.speechLayer.appendChild(el);
  speechEls[key] = {
    el,
    wx,
    wy,
    wz,
    timer: Math.min(2.0, duration),
    forceShow: true,
    moteEl: null
  };
}

function spawnFlyingCoinsUI(startX, startY, count = 4) {
  if (!dom.flyingCoinLayer || !dom.hudBadgeGold) return;
  const rect = dom.hudBadgeGold.getBoundingClientRect();
  const dstX = rect.left + rect.width * 0.35;
  const dstY = rect.top + rect.height * 0.5;

  for (let i = 0; i < count; i++) {
    const coin = document.createElement('div');
    coin.className = 'flying-coin-dot';
    coin.innerHTML = createCustomSVGIcon('coin_stack', 20);
    coin.style.position = 'fixed';
    coin.style.left = `${startX + (Math.random() - 0.5) * 24}px`;
    coin.style.top = `${startY + (Math.random() - 0.5) * 18}px`;
    coin.style.transition = `all ${0.46 + i * 0.06}s cubic-bezier(0.2, 0.85, 0.35, 1)`;
    dom.flyingCoinLayer.appendChild(coin);

    requestAnimationFrame(() => {
      coin.style.left = `${dstX}px`;
      coin.style.top = `${dstY}px`;
      coin.style.transform = 'scale(0.5)';
      coin.style.opacity = '0.3';
    });
    setTimeout(() => coin.remove(), 650 + i * 65);
  }
}

function spawnRentBubble(sourceKey, wx, wy, wz, amount, label = '') {
  spawnRisingGroundCoins3D(wx, wy, wz, 2);

  const existing = rentBubbles.find((b) => b.sourceKey === sourceKey);
  if (existing) {
    existing.amount += Math.round(amount);
    const amtEl = existing.el?.querySelector('.rb-amt');
    if (amtEl) amtEl.textContent = `+${existing.amount}만`;
    updateCollectAllButtonVisibility();
    return;
  }

  const groundCoinY = Math.min(wy, 1.15);
  const coin3D = new THREE.Mesh(GEO.coin, MAT.pureGold24k || MAT.gold);
  coin3D.scale.setScalar(1.25);
  coin3D.position.set(wx, groundCoinY, wz + 0.55);
  scene.add(coin3D);

  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'rent-coin-bubble pointer-events-auto hidden';
  el.style.display = 'none';
  el.innerHTML = `<span class="rb-amt">+${Math.round(amount)}만</span>`;

  const bubble = {
    sourceKey,
    wx,
    wy: groundCoinY,
    wz: wz + 0.55,
    amount: Math.round(amount),
    label,
    el,
    coin3D,
    magnetized: false
  };
  coin3D.userData = { kind: 'rentCoin3D', bubbleRef: bubble };
  pickableMeshes.push(coin3D);

  dom.rentBubblesLayer?.appendChild(el);
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
  spawnGroundStatusRing3D(bubble.wx, 0.28, bubble.wz, 'income');
  spawnPoofParticles3D(bubble.wx, bubble.wy, bubble.wz, 0xFFD43B, 7);

  bubble.el?.remove();
  if (bubble.coin3D) {
    const pIdx = pickableMeshes.indexOf(bubble.coin3D);
    if (pIdx >= 0) pickableMeshes.splice(pIdx, 1);
    scene.remove(bubble.coin3D);
  }
  updateCollectAllButtonVisibility();
}

function collectAllRentBubbles() {
  if (rentBubbles.length === 0) {
    showToast('현재 수금할 대기 수익이 없습니다.', 'mint');
    return;
  }
  const copy = [...rentBubbles];
  for (const b of copy) {
    collectRentBubble(b, 0);
  }
  if (typeof spawnPopMartSkillBurstVFX === 'function') {
    spawnPopMartSkillBurstVFX('rent_collect', { count: copy.length });
  }
  showToast(`수익 ${copy.length}건을 일괄 수금했습니다!`, 'gold');
}

function updateCollectAllButtonVisibility() {
  const countBadge = document.getElementById('stamp-collect-badge');
  if (countBadge) {
    countBadge.textContent = String(rentBubbles.length);
    countBadge.classList.toggle('hidden', rentBubbles.length === 0);
  }
  refreshQuestRedDot();
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
    if (b.lotId === 'lot_harbor_main') continue;
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

  const shopIds = STANDALONE_SHOPS_TEMPLATE.filter((s) => (s.stage || 1) === 1).map((s) => s.shopId);
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
    if (tpl.stage === 2 && !state.harborUnlocked) continue;
    const st = state.standaloneShops?.[tpl.shopId];
    if (!st || !st.owned) continue;
    st.cycleTimer -= dt;
    if (st.cycleTimer <= 0) {
      st.cycleTimer = 11.5;
      const { cycleRev } = calcStandaloneShopStats(tpl.shopId);
      const shopStage = tpl.stage || 1;
      const activeStage = state.activeTownStage === 2 && state.harborUnlocked ? 2 : 1;
      if (shopStage === 1 && activeStage === 2) {
        addGold(cycleRev);
        hqDividendAccum += cycleRev;
      } else if (shopStage === 2 && activeStage === 1) {
        addGold(cycleRev);
      } else if (shopStage === 2) {
        addGold(cycleRev);
        spawnRisingGroundCoins3D(tpl.x, 0.35, tpl.z + 3.4, 2);
      } else {
        spawnRentBubble(`shop_cycle_${tpl.shopId}`, tpl.x - 1.6, 1.95, tpl.z + 3.6, cycleRev, tpl.name);
      }
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
          // 매장 출입문으로 걸어 들어와 쇼케이스/진열대 앞 통로(무충돌 지점)에서 상품을 고르는 단계!
          ac.phase = 'browse_showcase';
          ac.timer = 1.65;
          if (tpl) {
            ac.mesh.position.set(tpl.x - 1.55, 0.48, tpl.z + 1.48);
            ac.mesh.rotation.y = Math.PI;
          }
          ac.mesh.userData.legL.rotation.x = 0;
          ac.mesh.userData.legR.rotation.x = 0;
          showSpeechBubble3D(
            ac.id,
            ac.mesh.position.x,
            ac.mesh.position.y + 1.9,
            ac.mesh.position.z,
            tpl?.kind === 'bakery' ? '우와~ 실사 크루아상이랑 딸기케이크 윤기 대박!' : tpl?.kind === 'roastery' ? '원두 향기 너무 좋다~ 유기농 사과도 담자!' : '프리지아 꽃다발이 방금 피어난 것 같아요!',
            2.0
          );
        } else {
          if (ac.sourceRoom && ac.sourceRoom.household) {
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
    } else if (ac.phase === 'browse_showcase') {
      // 쇼케이스 앞 통로에 멈춰 고개를 돌리고 손을 뻗어 상품을 집어 드는 스마트 모션!
      ac.timer -= dt;
      ac.mesh.rotation.y = Math.PI + Math.sin(elapsed * 3.6 + i) * 0.22;
      ac.mesh.userData.armR.rotation.x = -1.05 + Math.sin(elapsed * 7.5 + i) * 0.28;
      if (ac.timer <= 0) {
        ac.phase = 'walk_to_pos';
      }
    } else if (ac.phase === 'walk_to_pos') {
      // 카운터를 관통하지 않고 전면 통로를 따라 POS 계산대 앞(z + 0.92)으로 우회 이동!
      const posX = (tpl ? tpl.x : 0) + 0.45;
      const posZ = (tpl ? tpl.z : 0) + 0.92;
      const dx = posX - ac.mesh.position.x;
      const dz = posZ - ac.mesh.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.16) {
        ac.mesh.position.set(posX, 0.48, posZ);
        ac.mesh.rotation.y = Math.PI;
        ac.mesh.userData.legL.rotation.x = 0;
        ac.mesh.userData.legR.rotation.x = 0;
        ac.mesh.userData.armR.rotation.x = -0.55;
        ac.phase = 'ordering';
        ac.timer = 1.25;
        showSpeechBubble3D(
          ac.id,
          posX,
          ac.mesh.position.y + 1.9,
          posZ,
          tpl?.kind === 'bakery' ? '크루아상이랑 딸기케이크 결제할게요! 차링~!' : tpl?.kind === 'roastery' ? '아이스 라떼랑 사과 포장 결제할게요!' : '프리지아 꽃다발 예쁘게 포장해 주세요!',
          2.1
        );
      } else {
        ac.mesh.position.x += (dx / dist) * Math.min(dist, 3.6 * dt);
        ac.mesh.position.z += (dz / dist) * Math.min(dist, 3.6 * dt);
        ac.mesh.rotation.y = Math.atan2(dx, dz);
        const sw = Math.sin(elapsed * 12 + i) * 0.46;
        ac.mesh.userData.legL.rotation.x = sw;
        ac.mesh.userData.legR.rotation.x = -sw;
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
// 12. [핵심 조작 개편 2] 2단계 포커스 시퀀스(① 카메라 정중앙 배치 & 0.4s 클린 감상 ➔ ② 비가림 컨트롤 독 슬라이드업)
// =========================================================
function closeMoneyGunPopover() {
  document.getElementById('moneygun-flex-popover')?.classList.add('hidden');
}

function closeAllModalsImmediate(exceptId = null) {
  const modalIds = [
    'garage-modal',
    'notebook-modal',
    'lot-dev-modal',
    'recruit-modal',
    'rename-building-modal',
    'fp-visit-modal',
    'happiness-milestone-modal',
    'rival-battle-hub-modal',
    'forbes-modal',
    'harbor-chronicle-modal',
    'settings-modal',
    'flagship-shop-drawer',
    'animal-select-modal'
  ];
  for (const id of modalIds) {
    if (id !== exceptId) {
      document.getElementById(id)?.classList.add('hidden');
    }
  }
  if (exceptId !== 'pocket-planner-popover') closePocketPlanner();
  if (exceptId !== 'moneygun-flex-popover') closeMoneyGunPopover();
}

function triggerDockSlideUpAnimation(el) {
  if (!el) return;
  el.classList.remove('dock-slide-up-enter');
  void el.offsetWidth;
  el.classList.add('dock-slide-up-enter');
}

function tuckFocusDockTemporarily(durationSec = 0.85) {
  focusRevealState.tuckTimer = Math.max(focusRevealState.tuckTimer, durationSec);
}

function closePocketPlanner() {
  document.getElementById('pocket-planner-popover')?.classList.add('hidden');
  document.getElementById('fab-notebook')?.classList.remove('is-open');
}

function togglePocketPlanner() {
  const pop = document.getElementById('pocket-planner-popover');
  const fab = document.getElementById('fab-notebook');
  if (!pop) return;
  const willOpen = pop.classList.contains('hidden');
  if (willOpen) {
    closeAllModalsImmediate('pocket-planner-popover');
  }
  pop.classList.toggle('hidden', !willOpen);
  fab?.classList.toggle('is-open', willOpen);
}

function syncTopBarsByMode() {
  const inTitle = !!titleScreenState.active;
  const inTour = !!guidedTourState.active;
  const inDuel = !!duelState.active && !inTitle && !inTour;
  const inFp = fpState.active && !inTitle && !inDuel;
  const inDrive = driveState.active && !inFp && !inTitle && !inDuel;
  const inRoom = !!focusedRoomId && !inDrive && !inFp && !inTitle && !inTour && !inDuel;
  const inShop = (!!focusedShopId || !!focusedFirstFloorShopId) && !inDrive && !inFp && !inTitle && !inTour && !inDuel;
  const showFocusDock = focusRevealState.revealed && !focusRevealState.pending;

  const isPoachRoom = !!(rivalState.poach.active && inRoom && focusedRoomId === rivalState.poach.roomId);
  const isBiddingShop = !!(rivalState.bidding.active && inShop && focusedShopId === rivalState.bidding.shopId);

  if (inTitle || inTour || inDrive || inRoom || inShop || inFp || inDuel) {
    closePocketPlanner();
    closeMoneyGunPopover();
  }

  dom.hudTownControls?.classList.add('hidden');
  dom.roomFocusTopbar?.classList.toggle('hidden', !inRoom);
  dom.shopFocusTopbar?.classList.toggle('hidden', !inShop);
  dom.driveFocusTopbar?.classList.toggle('hidden', !inDrive || inTour);
  dom.fpFocusTopbar?.classList.toggle('hidden', !inFp || inTour);

  // 우측 상단 [⚙️] 환경설정 고정 버튼 & 줌인/특수모드 시 옆에 뜨는 [✕] 전체타운 복귀 버튼
  document.getElementById('btn-top-settings')?.classList.toggle('hidden', inTitle || inTour);
  const showFloatingClose = !inTitle && !inTour && (inDrive || inFp || inRoom || inShop || inDuel);
  document.getElementById('btn-focus-close-floating')?.classList.toggle('hidden', !showFloatingClose);

  // [요구사항 5] 방/상가 클릭 시 자동 팝업 제로 -> 하단 수동 오픈 캡슐 바 표시!
  const cleanCapsule = document.getElementById('focus-clean-capsule');
  const showCleanCapsule = (inRoom || inShop) && !isPoachRoom && !isBiddingShop;
  if (cleanCapsule) {
    cleanCapsule.classList.toggle('hidden', !showCleanCapsule);
    if (showCleanCapsule) {
      const capLabel = document.getElementById('focus-capsule-label');
      const openTxt = document.getElementById('focus-cap-open-text');
      const recBtn = document.getElementById('btn-focus-open-recruit');
      if (inRoom) {
        const rm = findRoomById(focusedRoomId);
        const stars = rm ? calcRoomLuxuryStars(rm) : 1;
        if (capLabel) capLabel.textContent = rm ? `${rm.name}호 · ★${stars}` : '호실 뷰';
        if (openTxt) openTxt.textContent = showFocusDock ? '🛋️ 관리창 닫기' : '🛋️ 가구 세팅 · 관리';
        recBtn?.classList.toggle('hidden', !rm?.unlocked);
      } else {
        const tpl = focusedShopId
          ? STANDALONE_SHOPS_TEMPLATE.find((s) => s.shopId === focusedShopId)
          : (window.FIRST_FLOOR_SHOPS_TEMPLATE || []).find((s) => s.shopId === focusedFirstFloorShopId);
        if (capLabel) capLabel.textContent = tpl?.name || '상가 뷰';
        if (openTxt) openTxt.textContent = showFocusDock ? '🛠️ 관리창 닫기' : '🛠️ 매장 설비 · 인수';
        recBtn?.classList.add('hidden');
      }
    }
  }

  dom.roomFocusPanel?.classList.toggle('hidden', !(inRoom && showFocusDock && !isPoachRoom));
  dom.shopFocusPanel?.classList.toggle('hidden', !(inShop && showFocusDock && !isBiddingShop));
  // 16:9 가로모드 방/상가 관리 시 하단 시트는 숨기고 우측 340px 슬림 드로어로 완벽 통합!
  dom.furnitureCatalogSheet?.classList.add('hidden');
  document.getElementById('rival-poach-dock')?.classList.toggle('hidden', !isPoachRoom);
  document.getElementById('bidding-war-dock')?.classList.toggle('hidden', !isBiddingShop);
  document.getElementById('showroom-duel-hud')?.classList.toggle('hidden', !inDuel);

  dom.driveModeHud?.classList.toggle('hidden', !inDrive || inTour);
  dom.cockpitOverlay?.classList.toggle('hidden', !(inDrive && driveState.cockpitView) || inTour);
  if (!inDrive || rivalState.race.active || inTour) {
    dom.driveProximityBar?.classList.add('hidden');
  }
  document.getElementById('drive-race-hud')?.classList.toggle('hidden', !(inDrive && rivalState.race.active));
  dom.fpModeHud?.classList.toggle('hidden', !inFp || inTour);
  dom.bottomTownBar?.classList.toggle('hidden', inTitle || inTour || inDrive || inRoom || inShop || inFp || inDuel);
  dom.isolationVignette?.classList.toggle('hidden', !(inRoom || inShop));

  updateCollectAllButtonVisibility();
  if (typeof syncChronicleAndStageUI === 'function') {
    syncChronicleAndStageUI();
  }
}

function startSmoothCameraTween(targetPos, targetLook, targetZoom, duration = 0.6, onArrive = null) {
  camTween.startPos.copy(camera.position);
  camTween.startLook.copy(controls.target);
  camTween.startZoom = camera.zoom;
  camTween.pos.copy(targetPos);
  camTween.look.copy(targetLook);
  camTween.zoom = targetZoom;
  camTween.elapsed = 0;
  camTween.duration = Math.max(0.15, duration);
  camTween.onArrive = onArrive;
  camTween.active = true;
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
  focusedFirstFloorShopId = null;
  focusRevealState.pending = false;
  focusRevealState.revealed = false;
  focusRevealState.holdTimer = 0;
  if (prevShop) rebuildStandaloneShop3D(prevShop);

  controls.enabled = true;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = Math.PI * 0.44;
  controls.enablePan = true;

  const isMobilePortrait = window.innerWidth < 640 && window.innerHeight > window.innerWidth;
  const offset = CAM_OFFSETS[camAzimuth % 4];
  const inHarbor = state.activeTownStage === 2 && !!state.harborUnlocked;
  const baseLook = inHarbor ? HARBOR_OVERVIEW_LOOK : OVERVIEW_LOOK;
  const targetLook = isMobilePortrait
    ? new THREE.Vector3(inHarbor ? 0.0 : -1.2, inHarbor ? 6.0 : 4.4, inHarbor ? 120.0 : 8.2)
    : baseLook.clone();
  const targetPos = targetLook.clone().add(offset);
  const targetZoom = isMobilePortrait ? (inHarbor ? 0.42 : 0.45) : (inHarbor ? 0.72 : 0.78);

  if (typeof applyTownAtmosphere === 'function') {
    applyTownAtmosphere(inHarbor ? 2 : 1);
  }

  if (animate) {
    startSmoothCameraTween(targetPos, targetLook, targetZoom, 0.58, null);
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

function beginTwoStepFocusSequence(targetPos, targetLook, targetZoom, renderDockCallback) {
  closeAllModalsImmediate();
  clearTransientSpeechBubbles(rivalState.bidding.active ? 'bid_' : rivalState.poach.active ? 'rival_' : null);
  // [요구사항 5] 방/상가 클릭 시 0.6~2초 뒤 자동 팝업 타이머 100% 제거! 무제한 클린 감상 뷰 유지!
  focusRevealState.pending = false;
  focusRevealState.revealed = false;
  focusRevealState.holdTimer = 0;
  focusRevealState.tuckTimer = 0;
  focusRevealState.onHoldDone = null;
  focusRevealState.renderDockFn = renderDockCallback;
  focusRevealState.baseLook = targetLook.clone();
  focusRevealState.basePos = targetPos.clone();
  focusRevealState.baseZoom = targetZoom;

  dom.roomFocusPanel?.classList.remove('dock-tucked');
  dom.shopFocusPanel?.classList.remove('dock-tucked');
  syncTopBarsByMode();

  startSmoothCameraTween(targetPos, targetLook, targetZoom, 0.45, null);
}

function toggleFocusedManualDrawer() {
  if (!focusedRoomId && !focusedShopId && !focusedFirstFloorShopId) return;
  if (focusRevealState.revealed) {
    closeFocusedManualDrawerKeepView();
    return;
  }
  closeAllModalsImmediate();
  focusRevealState.revealed = true;
  focusRevealState.pending = false;
  if (focusedRoomId) {
    renderFocusedRoomInspector();
  } else if (focusedShopId) {
    renderFocusedShopPanel();
  } else if (focusedFirstFloorShopId) {
    renderFocusedFirstFloorShopPanel();
  }
  // 우측 340px 슬림 드로어가 열릴 때 좌측~중앙 75% 영역에 3D 방/매장이 정중앙 배치되도록 살짝 우측 오프셋 패닝!
  if (focusRevealState.baseLook && focusRevealState.basePos && window.innerWidth >= 768) {
    const shiftedLook = focusRevealState.baseLook.clone();
    shiftedLook.x += 2.1;
    const shiftedPos = focusRevealState.basePos.clone();
    shiftedPos.x += 2.1;
    startSmoothCameraTween(shiftedPos, shiftedLook, focusRevealState.baseZoom || camera.zoom, 0.28, null);
  }
  syncTopBarsByMode();
}

function closeFocusedManualDrawerKeepView() {
  focusRevealState.revealed = false;
  focusRevealState.pending = false;
  if (focusRevealState.baseLook && focusRevealState.basePos) {
    startSmoothCameraTween(
      focusRevealState.basePos,
      focusRevealState.baseLook,
      focusRevealState.baseZoom || camera.zoom,
      0.26,
      null
    );
  }
  syncTopBarsByMode();
}

function focusCameraOnRoom(roomId) {
  if (driveState.active) exitDriveMode();
  if (focusedShopId) {
    const oldShop = focusedShopId;
    focusedShopId = null;
    rebuildStandaloneShop3D(oldShop);
  }
  focusedFirstFloorShopId = null;

  const rm = findRoomById(roomId);
  if (!rm) return;
  const lot = state.lots.find((l) => l.lotId === rm.lotId);
  if (!lot) return;

  if (lot.stage === 2 && state.harborUnlocked) {
    state.activeTownStage = 2;
  } else if (lot.stage === 1) {
    state.activeTownStage = 1;
  }
  focusedRoomId = rm.id;
  ensureCatalogSheetExpanded();
  renderRoomSwitcherChips(rm.lotId);

  const wx = lot.x + rm.lx;
  const wy = rm.ly + rm.rh * 0.46;
  const wz = lot.z + rm.lz;

  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  const frustumH = 38;
  const frustumW = frustumH * aspect;
  const spanW = rm.rw * 1.3 + 2.8;
  const spanH = rm.rh * 1.62 + 4.4;
  const fitZoom = THREE.MathUtils.clamp(Math.min(frustumW / spanW, frustumH / spanH) * 0.88, 1.48, 3.55);

  // 하단 가구 시트가 올라와도 방 정중앙이 절대 가려지지 않도록 타겟 Y를 살짝 아래로 오프셋하여 화면 중앙 상단에 방 배치!
  const lookPt = new THREE.Vector3(wx, wy - 0.55, wz);
  const camPt = new THREE.Vector3(wx + rm.rw * 0.44 + 11.5, wy + rm.rh * 0.78 + 8.5, wz + 23.0);

  controls.enablePan = false;
  controls.minPolarAngle = 0.42;
  controls.maxPolarAngle = Math.PI * 0.46;

  beginTwoStepFocusSequence(camPt, lookPt, fitZoom, () => {
    renderFocusedRoomInspector();
    renderFurnitureCatalogSheet();
  });
}

function exitRoomFocusMode() {
  if (!focusedRoomId) return;
  focusedRoomId = null;
  setOverviewCamera(true);
}

function focusCameraOnShop(shopId) {
  if (driveState.active) exitDriveMode();
  focusedRoomId = null;
  focusedFirstFloorShopId = null;
  ensureCatalogSheetExpanded();

  const prevShop = focusedShopId;
  focusedShopId = shopId;
  const tpl = STANDALONE_SHOPS_TEMPLATE.find((s) => s.shopId === shopId);
  if (!tpl) return;
  if (tpl.stage === 2 && state.harborUnlocked) {
    state.activeTownStage = 2;
  } else if (tpl.stage === 1) {
    state.activeTownStage = 1;
  }
  if (prevShop && prevShop !== shopId) rebuildStandaloneShop3D(prevShop);
  rebuildStandaloneShop3D(shopId);
  renderShopSwitcherChips();

  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  const frustumH = 38;
  const frustumW = frustumH * aspect;
  const isBiddingTarget = !!(rivalState.bidding.active && rivalState.bidding.shopId === shopId);
  const baseFitZoom = THREE.MathUtils.clamp(Math.min(frustumW / 15.5, frustumH / 12.8) * 0.9, 1.6, 2.95);
  const fitZoom = isBiddingTarget ? baseFitZoom * 0.84 : baseFitZoom;

  const lookPt = isBiddingTarget
    ? new THREE.Vector3(tpl.x, 0.35, tpl.z + 2.65)
    : new THREE.Vector3(tpl.x, 1.45, tpl.z + 0.65);
  const camPt = new THREE.Vector3(tpl.x + 11.5, 12.2, tpl.z + (isBiddingTarget ? 23.5 : 21.5));

  controls.enablePan = false;
  beginTwoStepFocusSequence(camPt, lookPt, fitZoom, () => {
    renderFocusedShopPanel();
    renderShopUpgradeCatalog();
  });
}

function focusCameraOnFirstFloorShop(shopId) {
  if (driveState.active) exitDriveMode();
  focusedRoomId = null;
  if (focusedShopId) {
    const prev = focusedShopId;
    focusedShopId = null;
    rebuildStandaloneShop3D(prev);
  }
  focusedFirstFloorShopId = shopId;
  ensureCatalogSheetExpanded();
  renderShopSwitcherChips();

  const tpl = (window.FIRST_FLOOR_SHOPS_TEMPLATE || []).find((s) => s.shopId === shopId);
  const lot = state.lots.find((l) => l.lotId === (tpl?.lotId || 'lot_main')) || { x: -4.2, z: -6.4 };
  const wx = lot.x + (tpl?.localX || -7.15);
  const wz = lot.z + 0.15;

  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  const frustumH = 38;
  const frustumW = frustumH * aspect;
  const fitZoom = THREE.MathUtils.clamp(Math.min(frustumW / 14.2, frustumH / 12.2) * 0.94, 1.75, 2.88);

  // 상층부 슬래브와 전면 간판을 커트어웨이한 상태에서, 뒷벽 냉장고/2단 세탁기 6대 + 과자 곤돌라 + 알바생/손님이 화면 상단 중앙에 막힘없이 들어오는 얼짱 앵글!
  const lookPt = new THREE.Vector3(wx + 0.65, 1.05, wz - 0.15);
  const camPt = new THREE.Vector3(wx + (shopId === 'shop_mart1f' ? 8.2 : -8.2), 11.4, wz + 21.8);

  controls.enablePan = false;
  beginTwoStepFocusSequence(camPt, lookPt, fitZoom, () => {
    renderFocusedFirstFloorShopPanel();
    renderFirstFloorShopUpgradeCatalog();
  });
}

function exitShopFocusMode() {
  const prev = focusedShopId;
  focusedShopId = null;
  focusedFirstFloorShopId = null;
  if (prev) rebuildStandaloneShop3D(prev);
  setOverviewCamera(true);
}

// =========================================================
// 12B. [핵심 비주얼 8] Three.js 오프스크린 45도 쿼터뷰 3D 입체 렌더링 썸네일 생성기 (toDataURL)
// =========================================================
function buildPreviewSubject3D(itemId) {
  if (itemId.startsWith('car_')) {
    const v = createVehicle3D(itemId, false);
    if (itemId === 'car_limo') v.scale.setScalar(0.68);
    else if (itemId === 'car_scooter') v.scale.setScalar(1.38);
    else v.scale.setScalar(0.88);
    v.rotation.y = Math.PI * 0.3;
    return v;
  }
  if (itemId.startsWith('bed_')) {
    const b = createCatalogBed3D(itemId);
    b.scale.setScalar(0.95);
    b.rotation.y = Math.PI * 0.22;
    return b;
  }
  if (itemId.startsWith('sofa_')) {
    const s = createCatalogSofa3D(itemId);
    s.scale.setScalar(1.05);
    s.rotation.y = Math.PI * 0.2;
    return s;
  }
  if (itemId.startsWith('app_')) {
    const a = createCatalogAppliance3D(itemId, 5.2, 4.2, 3.8);
    a.position.set(-0.6, 0, 0.3);
    a.scale.setScalar(0.92);
    a.rotation.y = Math.PI * 0.16;
    return a;
  }
  if (itemId.startsWith('dec_')) {
    const dDef = getFurnitureItemDef('decor', itemId);
    const dg = new THREE.Group();
    const fMat = makeClayMat(0xFFFFFF, { map: TEX[dDef?.floorKey || 'floor1'] });
    const wMat = makeClayMat(0xFFFFFF, { map: TEX[dDef?.wallKey || 'wallPeach'] });
    dg.add(createRoundedToyMesh(2.8, 0.16, 2.4, fMat, 0, 0.08, 0, 0.05));
    dg.add(createRoundedToyMesh(2.8, 1.85, 0.18, wMat, 0, 1.0, -1.1, 0.05));
    dg.add(createRoundedToyMesh(0.18, 1.85, 2.4, wMat, -1.3, 1.0, 0, 0.05));
    const stairCol = dDef?.stairStyle === 'gold' ? MAT.pureGold24k : dDef?.stairStyle === 'coral' ? MAT.coral : MAT.woodWarm;
    for (let s = 0; s < 4; s++) {
      dg.add(createRoundedToyMesh(0.85, 0.16, 0.42, stairCol, 0.35, 0.24 + s * 0.32, 0.65 - s * 0.38, 0.03));
    }
    dg.rotation.y = Math.PI * 0.18;
    return dg;
  }
  const focusedTpl = focusedShopId ? STANDALONE_SHOPS_TEMPLATE.find((s) => s.shopId === focusedShopId) : null;
  const isHarborShopPreview = focusedTpl?.stage === 2;

  if (itemId === 'upg_oven') {
    if (isHarborShopPreview) {
      const hg = new THREE.Group();
      hg.add(createRoundedToyMesh(2.2, 0.9, 1.1, MAT.white, 0, 0.46, 0, 0.08));
      const lob = create3DLobsterPlatterMesh();
      lob.position.set(-0.45, 0.92, 0);
      const stk = create3DTomahawkSteakMesh();
      stk.position.set(0.45, 0.92, 0.05);
      hg.add(lob, stk);
      hg.rotation.y = Math.PI * 0.18;
      return hg;
    }
    const og = new THREE.Group();
    og.add(createRoundedToyMesh(2.2, 2.15, 1.0, MAT.pureGold24k, 0, 1.08, 0, 0.1));
    og.add(createRoundedToyMesh(1.3, 0.44, 0.14, MAT.ovenFire, 0, 0.95, 0.5, 0.04));
    og.add(createRoundedToyMesh(1.3, 0.42, 0.14, MAT.ovenFire, 0, 1.62, 0.5, 0.04));
    og.rotation.y = Math.PI * 0.18;
    return og;
  }
  if (itemId === 'upg_terrace') {
    if (isHarborShopPreview) {
      const wg = new THREE.Group();
      const chp = create3DChampagneBucketMesh();
      chp.scale.setScalar(1.45);
      chp.position.set(0.55, 0.12, 0.25);
      const pno = create3DGrandPianoMesh();
      pno.scale.setScalar(0.62);
      pno.position.set(-0.45, 0, -0.1);
      wg.add(chp, pno);
      wg.rotation.y = Math.PI * 0.18;
      return wg;
    }
    const tg = createGreenParasolTableSet3D(true);
    tg.scale.setScalar(0.84);
    return tg;
  }
  if (itemId === 'upg_crate') {
    if (isHarborShopPreview) {
      const yg = createLuxuryYacht3D(true);
      yg.scale.setScalar(0.34);
      yg.position.set(0, 0.32, 0);
      yg.rotation.y = Math.PI * 0.28;
      return yg;
    }
    const cg = createFruitWoodenCrate3D('mix');
    cg.scale.setScalar(1.65);
    cg.rotation.y = Math.PI * 0.18;
    return cg;
  }
  if (itemId === 'upg_mart_gondola') {
    const mg = createMartGondolaShelf3D(['chips', 'shrimp', 'choco', 'strawberry']);
    mg.scale.setScalar(1.15);
    mg.rotation.y = Math.PI * 0.18;
    return mg;
  }
  if (itemId === 'upg_mart_fridge') {
    const fg = createMartBlueLedChiller3D();
    fg.scale.setScalar(0.9);
    fg.rotation.y = 0.22;
    return fg;
  }
  if (itemId === 'upg_mart_ramenbar') {
    const rg = new THREE.Group();
    rg.add(createRoundedToyMesh(2.4, 0.12, 0.72, MAT.woodLight, 0, 0.95, 0, 0.04));
    rg.add(createRoundedToyMesh(0.68, 0.44, 0.48, MAT.white, -0.62, 1.24, 0, 0.04));
    rg.add(createRoundedToyMesh(0.42, 0.28, 0.05, MAT.screenCyan, -0.62, 1.24, 0.24, 0.02));
    const b = createPhotorealBentoBox3D(1.15);
    b.position.set(0.45, 1.02, 0);
    rg.add(b);
    rg.rotation.y = Math.PI * 0.18;
    return rg;
  }
  if (itemId === 'upg_wash_drum6') {
    const wg = createStackedDrumWasherPair3D();
    wg.scale.setScalar(0.76);
    wg.rotation.y = Math.PI * 0.18;
    return wg;
  }
  if (itemId === 'upg_wash_vending') {
    const vg = new THREE.Group();
    vg.add(createRoundedToyMesh(1.18, 2.15, 0.78, MAT.sky, -0.58, 1.08, 0, 0.08));
    vg.add(createRoundedToyMesh(0.88, 0.92, 0.06, MAT.screenCyan, -0.58, 1.42, 0.4, 0.03));
    vg.add(createRoundedToyMesh(0.88, 1.72, 0.68, MAT.pureGold24k, 0.62, 0.86, 0, 0.07));
    vg.rotation.y = Math.PI * 0.18;
    return vg;
  }
  // upg_wash_lounge 기본 폴백
  const lg = new THREE.Group();
  lg.add(createRoundedToyMesh(1.1, 0.68, 0.78, MAT.chromeAlloy, -0.55, 0.52, 0, 0.06));
  lg.add(createRoundedToyMesh(0.86, 0.34, 0.56, MAT.pinkSoft, -0.55, 0.86, 0, 0.07));
  lg.add(createRoundedToyMesh(1.35, 0.12, 0.88, MAT.woodWarm, 0.68, 0.88, 0, 0.04));
  lg.rotation.y = Math.PI * 0.18;
  return lg;
}

function getOrRender3DCatalogPreview(itemId, width = 220, height = 128) {
  if (typeof getPopMartCatalogThumbDataUrl === 'function') {
    const popThumbUrl = getPopMartCatalogThumbDataUrl(itemId);
    if (popThumbUrl) {
      return `<img src="${popThumbUrl}" alt="${itemId}" class="catalog-3d-preview-img object-contain" />`;
    }
  }
  if (!renderer) return createCatalogThumbnailSVG(itemId, width, height);
  const focusedTpl = focusedShopId ? STANDALONE_SHOPS_TEMPLATE.find((s) => s.shopId === focusedShopId) : null;
  const stageSuffix = (focusedTpl?.stage === 2 && itemId.startsWith('upg_')) ? '_harbor' : '';
  const cacheKey = `${itemId}${stageSuffix}_${width}x${height}`;
  if (catalog3DPreviewCache.has(cacheKey)) {
    return `<img src="${catalog3DPreviewCache.get(cacheKey)}" alt="${itemId}" class="catalog-3d-preview-img" />`;
  }

  try {
    if (!offscreenThumbScene) {
      offscreenThumbScene = new THREE.Scene();
      const hemi = new THREE.HemisphereLight(0xFFFDF8, 0xF3DEC8, 1.55);
      const key = new THREE.DirectionalLight(0xFFF9EC, 1.95);
      key.position.set(6.5, 11, 8.5);
      const fill = new THREE.DirectionalLight(0xFFF1F2, 0.92);
      fill.position.set(-5.5, 8, 7.5);
      const rim = new THREE.DirectionalLight(0xBAE6FD, 0.95);
      rim.position.set(-7, 6, -5);
      offscreenThumbScene.add(hemi, key, fill, rim);

      const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(2.15, 2.28, 0.16, 36),
        makeClayMat(0xF8ECE0, { roughness: 0.68 })
      );
      pedestal.position.y = -0.08;
      pedestal.name = 'thumb_pedestal';
      offscreenThumbScene.add(pedestal);

      offscreenThumbCam = new THREE.OrthographicCamera(-2.6, 2.6, 1.65, -1.65, 0.1, 40);
      // 45도 쿼터뷰(Isometric 3D Angle) 카메라 세팅!
      offscreenThumbCam.position.set(6.8, 5.6, 6.8);
      offscreenThumbCam.lookAt(0, 0.92, 0);
    }

    const oldSub = offscreenThumbScene.getObjectByName('thumb_subject');
    if (oldSub) offscreenThumbScene.remove(oldSub);

    const subject = buildPreviewSubject3D(itemId);
    subject.name = 'thumb_subject';
    offscreenThumbScene.add(subject);

    const aspect = width / Math.max(1, height);
    const frustumH = 3.25;
    offscreenThumbCam.left = (-frustumH * aspect) / 2;
    offscreenThumbCam.right = (frustumH * aspect) / 2;
    offscreenThumbCam.top = frustumH / 2;
    offscreenThumbCam.bottom = -frustumH / 2;
    offscreenThumbCam.updateProjectionMatrix();

    const rtW = width * 2;
    const rtH = height * 2;
    const prevTarget = renderer.getRenderTarget();
    const prevClearAlpha = renderer.getClearAlpha();
    const prevClearCol = new THREE.Color();
    renderer.getClearColor(prevClearCol);

    const rt = new THREE.WebGLRenderTarget(rtW, rtH, {
      samples: 4,
      type: THREE.UnsignedByteType
    });
    renderer.setRenderTarget(rt);
    renderer.setClearColor(0xFFFDF8, 0);
    renderer.clear();
    renderer.render(offscreenThumbScene, offscreenThumbCam);

    const pixels = new Uint8Array(rtW * rtH * 4);
    renderer.readRenderTargetPixels(rt, 0, 0, rtW, rtH, pixels);

    renderer.setRenderTarget(prevTarget);
    renderer.setClearColor(prevClearCol, prevClearAlpha);
    rt.dispose();

    const cv = document.createElement('canvas');
    cv.width = rtW;
    cv.height = rtH;
    const ctx = cv.getContext('2d');
    const imgData = ctx.createImageData(rtW, rtH);
    const dst = imgData.data;
    // WebGLRenderTarget은 Linear 색공간으로 픽셀을 반환하므로, Y-flip과 함께 Linear -> sRGB 감마 보정을 적용해 실물 선명도 복원!
    const linToSrgbByte = (byteVal) => {
      if (byteVal <= 0) return 0;
      const lin = Math.min(1, (byteVal / 255) * 1.08);
      const srgb = lin <= 0.0031308 ? lin * 12.92 : 1.055 * Math.pow(lin, 1 / 2.4) - 0.055;
      return Math.min(255, Math.max(0, Math.round(srgb * 255)));
    };
    for (let y = 0; y < rtH; y++) {
      const srcRow = (rtH - 1 - y) * rtW * 4;
      const dstRow = y * rtW * 4;
      for (let x = 0; x < rtW; x++) {
        const si = srcRow + x * 4;
        const di = dstRow + x * 4;
        const a = pixels[si + 3];
        if (a === 0) {
          dst[di] = 0;
          dst[di + 1] = 0;
          dst[di + 2] = 0;
          dst[di + 3] = 0;
        } else {
          dst[di] = linToSrgbByte(pixels[si]);
          dst[di + 1] = linToSrgbByte(pixels[si + 1]);
          dst[di + 2] = linToSrgbByte(pixels[si + 2]);
          dst[di + 3] = a;
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);

    const dataUrl = cv.toDataURL('image/png');
    catalog3DPreviewCache.set(cacheKey, dataUrl);
    return `<img src="${dataUrl}" alt="${itemId}" class="catalog-3d-preview-img" />`;
  } catch (err) {
    return createCatalogThumbnailSVG(itemId, width, height);
  }
}

// =========================================================
// 12C. [시공 리얼 애니메이션 4] 낙하 바운스(Drop & Jelly Bounce) & 격자 방음 패드 타일 시공 연출 + 효과음
// =========================================================
function playHeavyDropThudSFX() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!window._landlordAudioCtx) window._landlordAudioCtx = new AC();
    const ctx = window._landlordAudioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(165, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.22);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);

    // 반짝이는 젤리 스파클 차임
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.type = 'sine';
      o2.frequency.value = freq;
      const t0 = now + 0.14 + i * 0.055;
      g2.gain.setValueAtTime(0.09, t0);
      g2.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);
      o2.connect(g2);
      g2.connect(ctx.destination);
      o2.start(t0);
      o2.stop(t0 + 0.2);
    });
  } catch (e) {}
}

function playHammerBuildSFX() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!window._landlordAudioCtx) window._landlordAudioCtx = new AC();
    const ctx = window._landlordAudioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    for (let h = 0; h < 5; h++) {
      const t0 = now + h * 0.13;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(280 + (h % 2) * 70, t0);
      osc.frequency.exponentialRampToValueAtTime(90, t0 + 0.08);
      g.gain.setValueAtTime(0.14, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.09);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.1);
    }
  } catch (e) {}
}

function playDropBouncePlacement3D(targetObj, wx, wy, wz) {
  if (!targetObj) return;
  if (typeof triggerGlobalAnimalCheer === 'function') {
    triggerGlobalAnimalCheer(2.6);
  }
  const baseY = targetObj.position.y;
  const baseScale = targetObj.scale.clone();
  targetObj.position.y = baseY + 4.8;
  activeDropBounces.push({
    obj: targetObj,
    baseY,
    baseScale,
    elapsed: 0,
    dropDur: 0.34,
    bounceDur: 0.56,
    landed: false,
    wx,
    wy,
    wz
  });
}

function playSoundproofTileLaying3D(room) {
  const lot = state.lots.find((l) => l.lotId === room.lotId);
  const rGrp = lot3D[room.lotId]?.roomsMap?.[room.id];
  if (!rGrp || !lot) return;

  tuckFocusDockTemporarily(1.45);
  playHammerBuildSFX();

  const tempTileGrp = new THREE.Group();
  rGrp.add(tempTileGrp);

  const cols = 4;
  const rows = 3;
  const pw = (room.rw * 0.72) / cols;
  const pd = (room.rd * 0.56) / rows;
  const wxBase = lot.x + room.lx;
  const wzBase = lot.z + room.lz;

  let delayIdx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lx = (c - (cols - 1) * 0.5) * pw;
      const lz = (r - (rows - 1) * 0.5) * pd;
      const tile = createRoundedToyMesh(
        pw - 0.08,
        0.12,
        pd - 0.08,
        (r + c) % 2 === 0 ? MAT.mint : MAT.butter,
        lx,
        0.18,
        lz,
        0.04
      );
      tile.scale.setScalar(0.01);
      tempTileGrp.add(tile);
      activeTileAnimations.push({
        mesh: tile,
        delay: delayIdx * 0.065,
        elapsed: 0,
        wx: wxBase + lx,
        wy: room.ly + 0.35,
        wz: wzBase + lz,
        poofed: false
      });
      delayIdx += 1;
    }
  }
  spawnJackpotText3D(wxBase, room.ly + 2.2, wzBase, '뚝딱뚝딱! 방음 타일 시공!', 'soundproof_hammer');
  setTimeout(() => {
    if (tempTileGrp.parent) tempTileGrp.parent.remove(tempTileGrp);
    rebuildRoom3D(room.lotId, room);
    syncBuildingResidents3D(room.lotId);
  }, 1350);
}

// =========================================================
// 13. 건물주 VIP 슈퍼카 차고 & GTA식 3인칭 드라이브 모드 (와이드 썸네일 & 커스텀 SVG)
// =========================================================
function openGarageModal() {
  closeAllModalsImmediate('garage-modal');
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
        <div class="fcat-thumb-stage !py-1">${getOrRender3DCatalogPreview(car.id, 224, 96)}</div>
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
      closeGarageModal();
      refreshPlayerCar3D();
      if (!driveState.active) {
        startSmoothCameraTween(
          new THREE.Vector3(VIP_PARKING_POS.x + 12.5, 11.5, VIP_PARKING_POS.z + 18.5),
          new THREE.Vector3(VIP_PARKING_POS.x, 1.0, VIP_PARKING_POS.z),
          1.65,
          0.55,
          null
        );
      }
      playDropBouncePlacement3D(driveState.vehicleMesh, driveState.carRootGroup.position.x, 1.1, driveState.carRootGroup.position.z);
      playSupercarHornSound(cid);
      showSpeechBubble3D('vip_car_delivery', driveState.carRootGroup.position.x, 2.5, driveState.carRootGroup.position.z, `와아!! 새 드림카 [${car.name}] 출고 완료!!`, 3.6, true);
      updateTopHUDTargets();
      syncDriveTopBadges();
      showToast(`[${car.name}] VIP 출고! 하늘에서 착지 출고 세리머니가 펼쳐집니다!`, 'gold');
      saveGameState();
    });
  });

  dom.garageCardsGrid.querySelectorAll('[data-car-equip]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cid = btn.getAttribute('data-car-equip');
      state.garage.currentCar = cid;
      closeGarageModal();
      refreshPlayerCar3D();
      playDropBouncePlacement3D(driveState.vehicleMesh, driveState.carRootGroup.position.x, 1.1, driveState.carRootGroup.position.z);
      playSupercarHornSound(cid);
      updateTopHUDTargets();
      syncDriveTopBadges();
      showToast(`[${getCarDef(cid).name}] 배차 완료!`, 'mint');
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
    // 외곽 해안 경계선에서 바다 쪽(+Z)만 바라보며 멈춰 있는 경우, 해안 도로(레드 아치교/전망대 방향)로 시선을 자연스럽게 정렬!
    if (driveState.z > 49.0 && Math.cos(driveState.heading) > 0.35) {
      driveState.z = Math.min(driveState.z, 50.2);
      driveState.heading = -Math.PI * 0.5;
      if (driveState.carRootGroup) {
        driveState.carRootGroup.position.set(driveState.x, driveState.y, driveState.z);
        driveState.carRootGroup.rotation.y = driveState.heading;
      }
    }
    const carDef = getCarDef(state.garage?.currentCar || 'car_scooter');
    const fwdX = Math.sin(driveState.heading);
    const fwdZ = Math.cos(driveState.heading);
    const hoodFwd = carDef.id === 'car_limo' ? 1.25 : carDef.id === 'car_scooter' ? 0.72 : 0.38;
    driveState.camCurrentPos.set(
      driveState.x + fwdX * hoodFwd,
      carDef.id === 'car_scooter' ? 1.66 : 1.58,
      driveState.z + fwdZ * hoodFwd
    );
    driveState.camCurrentLook.set(
      driveState.x + fwdX * 16.5,
      1.12,
      driveState.z + fwdZ * 16.5
    );
    driveCamera.position.copy(driveState.camCurrentPos);
    driveCamera.lookAt(driveState.camCurrentLook);
    startOrUpdateCarRadioBGM();
    showToast('1인칭 슈퍼카 운전석 시점! 카오디오 라디오와 핸들 조향이 활성화되었습니다!', 'gold');
  } else {
    const fwdX = Math.sin(driveState.heading);
    const fwdZ = Math.cos(driveState.heading);
    driveState.camCurrentPos.set(driveState.x - fwdX * 6.2, 2.72, driveState.z - fwdZ * 6.2);
    driveState.camCurrentLook.set(driveState.x + fwdX * 8.2, 1.45, driveState.z + fwdZ * 8.2);
    driveCamera.position.copy(driveState.camCurrentPos);
    driveCamera.lookAt(driveState.camCurrentLook);
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

function ensureDriveZoneLock(shopId) {
  if (!driveState.shopZoneLock) driveState.shopZoneLock = {};
  if (!driveState.shopZoneLock[shopId]) {
    driveState.shopZoneLock[shopId] = { hasTriggeredDriveThru: false, cooldown: 0 };
  }
  return driveState.shopZoneLock[shopId];
}

function dismissDriveProximityBanner() {
  const sid = driveState.nearestShopId || 'shop_bakery';
  const lock = ensureDriveZoneLock(sid);
  lock.hasTriggeredDriveThru = true;
  lock.cooldown = 15.0;
  dom.driveProximityBar?.classList.add('hidden');
}

function updateDriveShopProximityUI() {
  if (!driveState.active) return;
  let best = FP_SHOP_DESTINATIONS[0];
  let minDist = Infinity;
  const exitRadius = 18.5;

  for (const dest of FP_SHOP_DESTINATIONS) {
    const d = Math.hypot(dest.roadX - driveState.x, dest.roadZ - driveState.z);
    const zLock = ensureDriveZoneLock(dest.id);
    // [요구사항 8] 차량이 해당 상점 반경(exitRadius 18.5m) 밖으로 완전히 벗어났고 쿨타임이 끝났을 때만 재진입 플래그 초기화!
    if (d > exitRadius && zLock.cooldown <= 0) {
      zLock.hasTriggeredDriveThru = false;
    }
    if (d < minDist) {
      minDist = d;
      best = dest;
    }
  }
  driveState.nearestShopId = best.id;

  const bestLock = ensureDriveZoneLock(best.id);
  const canShowBanner =
    minDist <= 10.8 &&
    !bestLock.hasTriggeredDriveThru &&
    bestLock.cooldown <= 0 &&
    !(driveState.driveThruCooldowns[best.id] > 0) &&
    !rivalState.race?.active;

  if (dom.driveProximityBar) {
    dom.driveProximityBar.classList.toggle('hidden', !canShowBanner);
  }
  if (!canShowBanner) return;

  const icoEl = document.getElementById('prox-shop-ico');
  const nameEl = document.getElementById('prox-shop-name');
  if (icoEl) icoEl.innerHTML = createCustomSVGIcon(best.icon, 20);
  if (nameEl) {
    nameEl.textContent = minDist < 8.5 ? `${best.name} 앞 도착` : `인근 · ${best.name}`;
  }
}

function triggerDriveThruOrder(targetShopId = null) {
  if (!driveState.active) return;
  const sid = targetShopId || driveState.nearestShopId || 'shop_bakery';
  const dest = FP_SHOP_DESTINATIONS.find((s) => s.id === sid) || FP_SHOP_DESTINATIONS[0];

  // [요구사항 8] 드라이브스루 이용 즉시 hasTriggeredDriveThru = true 잠금 + 15초 쿨타임 + 상단 배너 즉시 숨김!
  const lock = ensureDriveZoneLock(dest.id);
  lock.hasTriggeredDriveThru = true;
  lock.cooldown = 15.0;
  driveState.driveThruCooldowns[dest.id] = 15.0;
  dom.driveProximityBar?.classList.add('hidden');

  // 상가 앞 도로 위치로 부드럽게 정차 정렬
  if (Math.hypot(dest.roadX - driveState.x, dest.roadZ - driveState.z) > 8.5) {
    driveState.x = dest.roadX;
    driveState.z = 7.0;
    if (driveState.carRootGroup) {
      driveState.carRootGroup.position.set(driveState.x, 0.22, driveState.z);
    }
  }
  driveState.driveThruPauseTimer = 2.4;
  driveState.speed = 0;

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
  focusedFirstFloorShopId = null;
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
  if (typeof endRivalCoastalRaceCleanup === 'function') {
    endRivalCoastalRaceCleanup();
  }
  driveState.active = false;
  driveState.cockpitView = false;
  driveState.keys.forward = false;
  driveState.keys.backward = false;
  driveState.keys.left = false;
  driveState.keys.right = false;
  driveState.keys.boost = false;
  driveState.speed = 0;
  dom.driveProximityBar?.classList.add('hidden');
  document.getElementById('btn-nitro-boost')?.classList.remove('pressed');

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

function playV12BoostRoarSFX() {
  if (!sfxEnabled) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!window._landlordAudioCtx) window._landlordAudioCtx = new AC();
    const ctx = window._landlordAudioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const g = ctx.createGain();
    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(118, now);
    osc1.frequency.exponentialRampToValueAtTime(340, now + 0.22);
    osc2.frequency.setValueAtTime(236, now);
    osc2.frequency.exponentialRampToValueAtTime(680, now + 0.22);
    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(g);
    osc2.connect(g);
    g.connect(ctx.destination);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.26);
    osc2.stop(now + 0.26);
  } catch (e) {}
}

function playCrashImpactSFX() {
  if (!sfxEnabled) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!window._landlordAudioCtx) window._landlordAudioCtx = new AC();
    const ctx = window._landlordAudioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    // 쾅!! 메탈릭 크런치 & 우당탕 충돌 타격음
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(195, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.24);
    g.gain.setValueAtTime(0.16, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.28);

    const clang = ctx.createOscillator();
    const cg = ctx.createGain();
    clang.type = 'triangle';
    clang.frequency.setValueAtTime(760, now + 0.02);
    clang.frequency.exponentialRampToValueAtTime(180, now + 0.19);
    cg.gain.setValueAtTime(0.11, now + 0.02);
    cg.gain.exponentialRampToValueAtTime(0.001, now + 0.21);
    clang.connect(cg);
    cg.connect(ctx.destination);
    clang.start(now + 0.02);
    clang.stop(now + 0.22);
  } catch (e) {}
}

function checkDriveStreetPropCollisions() {
  if (!driveState.active || Math.abs(driveState.speed) < 2.2) return;
  for (const p of crashableStreetProps) {
    if (p.crashed || !p.mesh) continue;
    const px = p.baseX ?? p.wx ?? p.mesh.position.x;
    const py = p.baseY ?? p.wy ?? p.mesh.position.y;
    const pz = p.baseZ ?? p.wz ?? p.mesh.position.z;
    const dx = driveState.x - px;
    const dz = driveState.z - pz;
    const d = Math.hypot(dx, dz);
    if (!Number.isFinite(d) || d >= p.hitRadius) continue;

    // [요구사항 7] 기물 충돌 반발 물리 + 찌그러짐(Crumple Deformation) + 공중 튕겨남 연출!
    const safeD = Math.max(0.05, d);
    const nxNorm = dx / safeD;
    const nzNorm = dz / safeD;
    const impactSpd = Math.abs(driveState.speed);

    // 차량이 기물 바깥으로 튕겨나며 반동 체감! (부스트 중에는 뚫고 돌진하되 강한 카메라 쉐이크, 일반 주행은 반발 바운스)
    driveState.x = px + nxNorm * (p.hitRadius + 0.35);
    driveState.z = pz + nzNorm * (p.hitRadius + 0.35);
    if (driveState.keys.boost) {
      driveState.speed *= 0.78;
    } else {
      driveState.speed = -driveState.speed * 0.42;
    }
    driveState.camShakeTimer = 0.38;

    p.crashed = true;
    p.timer = 6.0;
    const pushDirX = -nxNorm;
    const pushDirZ = -nzNorm;
    p.vx = pushDirX * (5.2 + Math.min(8.5, impactSpd * 0.28));
    p.vz = pushDirZ * (5.2 + Math.min(8.5, impactSpd * 0.28));
    p.vy = 5.6 + Math.min(5.5, impactSpd * 0.18);
    p.tiltX = (pushDirZ >= 0 ? 1 : -1) * (1.08 + Math.random() * 0.28); // 62°~78° 휘어짐!
    p.tiltZ = (-pushDirX >= 0 ? 1 : -1) * (0.78 + Math.random() * 0.32);

    const bRotX = p.baseRotX ?? 0;
    const bRotY = p.baseRotY ?? 0;
    const bRotZ = p.baseRotZ ?? 0;

    // 비대칭 스케일 변형으로 차체 타격에 의해 납작하게 찌그러진 기물 표현!
    p.mesh.scale.set(
      p.baseScale.x * 1.36,
      p.baseScale.y * 0.54,
      p.baseScale.z * 0.72
    );
    p.mesh.rotation.set(bRotX + p.tiltX * 0.55, bRotY + 0.4, bRotZ + p.tiltZ * 0.55);

    playCrashImpactSFX();
    if (driveState.carRootGroup) triggerSquashStretch(driveState.carRootGroup, 1.35);
    spawnPoofParticles3D(px, py + 0.85, pz, 0xFFD93D, 12);
    spawnPoofParticles3D(px, py + 0.55, pz, 0xFFFDF7, 8);
    spawnShockwaveRing3D(px, 0.3, pz, 0xFF6B6B, 3.8);
    spawnJackpotText3D(px, py + 1.85, pz, `쾅!! ${p.label || '기물'} 파손!`, 'nitro_flame_ico');
  }
}

let insuranceRestoreToastCooldown = 0;
function tickCrashedStreetPropsRecovery(dt) {
  if (insuranceRestoreToastCooldown > 0) {
    insuranceRestoreToastCooldown = Math.max(0, insuranceRestoreToastCooldown - dt);
  }
  for (const p of crashableStreetProps) {
    if (!p.crashed || !p.mesh) continue;

    const bx = p.baseX ?? 0;
    const by = p.baseY ?? 0.24;
    const bz = p.baseZ ?? 0;
    const bRotX = p.baseRotX ?? 0;
    const bRotY = p.baseRotY ?? 0;
    const bRotZ = p.baseRotZ ?? 0;

    // 공중 튕겨남 -> 중력 낙하 -> 바닥에 찌그러진 채 널브러짐
    const groundFloorY = by + 0.08;
    if (p.mesh.position.y > groundFloorY || p.vy > 0) {
      p.vy -= 18.5 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotation.x = THREE.MathUtils.lerp(p.mesh.rotation.x, bRotX + (p.tiltX || 1.1), Math.min(1, dt * 8));
      p.mesh.rotation.z = THREE.MathUtils.lerp(p.mesh.rotation.z, bRotZ + (p.tiltZ || 0.8), Math.min(1, dt * 8));
      if (p.mesh.position.y <= groundFloorY) {
        p.mesh.position.y = groundFloorY;
        p.vy = 0;
        p.vx *= 0.2;
        p.vz *= 0.2;
      }
    }

    p.timer -= dt;
    if (p.timer <= 0) {
      // 6초 뒤 보험 처리 원상 복구 (-1,000원 = 0.1만)
      p.crashed = false;
      p.vx = 0;
      p.vy = 0;
      p.vz = 0;
      p.mesh.position.set(bx, by, bz);
      p.mesh.rotation.set(bRotX, bRotY, bRotZ);
      p.mesh.scale.copy(p.baseScale);
      triggerSquashStretch(p.mesh, 1.22);
      spawnPoofParticles3D(bx, by + 0.65, bz, 0x38E54D, 7);

      if (state.gold >= 0.1) {
        state.gold = Math.max(0, Math.round((state.gold - 0.1) * 10) / 10);
        hudAnim.targetGold = state.gold;
      }
      if (insuranceRestoreToastCooldown <= 0) {
        insuranceRestoreToastCooldown = 2.8;
        showToast('🛠️ 파손된 거리 기물 보험 처리 원상 복구 완료! (-1,000원)', 'mint');
      }
    }
  }
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

  // 드라이브 스루 쿨다운 · 상점 존 락(Zone Lock) · 달려 나온 직원 애니메이션 처리
  for (const k of Object.keys(driveState.driveThruCooldowns)) {
    driveState.driveThruCooldowns[k] = Math.max(0, driveState.driveThruCooldowns[k] - dt);
  }
  if (driveState.shopZoneLock) {
    for (const zk of Object.keys(driveState.shopZoneLock)) {
      driveState.shopZoneLock[zk].cooldown = Math.max(0, (driveState.shopZoneLock[zk].cooldown || 0) - dt);
    }
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
  const baseMaxSpd = carDef.maxSpeed || 18.0;
  const isBoosting = !!driveState.keys.boost;
  const effectiveMaxSpd = isBoosting ? Math.max(40.5, baseMaxSpd * 2.85) : baseMaxSpd;
  const manualInput = isBoosting || driveState.keys.forward || driveState.keys.backward || driveState.keys.left || driveState.keys.right;
  const prevHeading = driveState.heading;

  if (manualInput && driveState.autoCruise) {
    driveState.autoCruise = false;
    syncDriveTopBadges();
  }

  if (isBoosting) {
    driveState.boostSfxTimer = (driveState.boostSfxTimer || 0) - dt;
    if (driveState.boostSfxTimer <= 0) {
      driveState.boostSfxTimer = 0.24;
      playV12BoostRoarSFX();
    }
  } else {
    driveState.boostSfxTimer = 0;
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
    const targetCruiseSpeed = baseMaxSpd * 0.62 * cornerSlowdown;
    driveState.speed = THREE.MathUtils.lerp(driveState.speed, targetCruiseSpeed, Math.min(1, dt * 4));
  } else {
    // 수동 WASD / 터치 패드 / V12 풀악셀 니트로 부스트 주행 물리 (정차 시 자동 드라이브스루 팝업 버그 완전 제거!)
    if (isBoosting) {
      driveState.speed = Math.min(effectiveMaxSpd, Math.max(driveState.speed, 8.0) + 86 * dt);
    } else if (driveState.keys.forward) {
      driveState.speed = Math.min(effectiveMaxSpd, driveState.speed + 28 * dt);
    } else if (driveState.keys.backward) {
      driveState.speed = Math.max(-baseMaxSpd * 0.52, driveState.speed - 26 * dt);
    } else {
      driveState.speed *= Math.pow(0.22, dt);
      if (Math.abs(driveState.speed) < 0.08) driveState.speed = 0;
    }

    const turnDir = (driveState.keys.left ? 1 : 0) - (driveState.keys.right ? 1 : 0);
    if (turnDir !== 0 && Math.abs(driveState.speed) > 0.25) {
      const revSign = driveState.speed >= 0 ? 1 : -1;
      const steerRate = isBoosting ? 2.45 : 2.15;
      driveState.heading += turnDir * revSign * steerRate * dt;
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

  let fwdX = Math.sin(driveState.heading);
  let fwdZ = Math.cos(driveState.heading);
  let nx = driveState.x + fwdX * driveState.speed * dt;
  let nz = driveState.z + fwdZ * driveState.speed * dt;

  // 섬 & 외곽 해안 드라이빙 존 안전 가드레일 (바다 쪽으로 코를 박지 않고 해안 도로를 따라 부드럽게 코너링 유도!)
  if (nz > 51.4 && fwdZ > 0.15) {
    const steerGoal = nx > -8.0 ? -Math.PI * 0.5 : -Math.PI * 0.72;
    let gDiff = steerGoal - driveState.heading;
    while (gDiff > Math.PI) gDiff -= Math.PI * 2;
    while (gDiff < -Math.PI) gDiff += Math.PI * 2;
    driveState.heading += gDiff * Math.min(1, dt * 6.5);
    fwdX = Math.sin(driveState.heading);
    fwdZ = Math.cos(driveState.heading);
  }
  nx = THREE.MathUtils.clamp(nx, -35.5, 35.5);
  nz = THREE.MathUtils.clamp(nz, -7.5, 51.6);

  driveState.x = nx;
  driveState.z = nz;

  // [요구사항 7] 가로등 · 우체통 · 입간판 · 야외테이블 · 소화전 · 러버콘 물리 충돌 & 찌그러짐 판정!
  checkDriveStreetPropCollisions();

  // 1) 외곽 해안 드라이빙 존 황금 부스트 코인 획득 판정!
  for (const sc of scenicBoostCoins) {
    if (sc.cooldown > 0) {
      sc.cooldown -= dt;
      sc.mesh.visible = sc.cooldown <= 0;
      continue;
    }
    sc.mesh.rotation.y += dt * 3.8;
    if (Math.hypot(sc.x - driveState.x, sc.z - driveState.z) < 2.8) {
      sc.cooldown = 14.0;
      sc.mesh.visible = false;
      driveState.speed = Math.min(baseMaxSpd * 1.65, Math.max(driveState.speed, baseMaxSpd * 1.15));
      driveState.sessionLoot += 15;
      addGold(15);
      spawnPoofParticles3D(sc.x, 1.1, sc.z, 0xFFD93D, 8);
      spawnJackpotText3D(sc.x, 1.8, sc.z, '해안 부스트 +15만!', 'magnet_coin');
      syncDriveTopBadges();
    }
  }

  // 2) 1인칭 슈퍼카 운전석(Cockpit) 시점 주행 시 도심 행인 & 외곽 해안 구경꾼들의 생생한 환호 말풍선 자동 출력!
  if (driveState.cockpitView) {
    for (const ac of streetOutingActors) {
      const dist = Math.hypot(ac.mesh.position.x - driveState.x, ac.mesh.position.z - driveState.z);
      if (dist < 17.5 && !speechEls[`ck_greet_${ac.id}`]) {
        const msg = carDef.cheerQuotes[Math.floor(Math.random() * carDef.cheerQuotes.length)];
        showSpeechBubble3D(`ck_greet_${ac.id}`, ac.mesh.position.x, ac.mesh.position.y + 1.95, ac.mesh.position.z, msg, 3.2, true);
      }
    }
    for (const sp of streetInteractiveProps) {
      if (sp.kind === 'scenicSightseer') {
        const dist = Math.hypot(sp.x - driveState.x, sp.z - driveState.z);
        if (dist < 24.0 && !speechEls[`ck_scenic_${sp.id}`]) {
          showSpeechBubble3D(`ck_scenic_${sp.id}`, sp.x, 2.25, sp.z, sp.quote, 3.8, true);
        }
      }
    }
    const mirrorCap = document.getElementById('cockpit-mirror-caption');
    if (mirrorCap) {
      mirrorCap.textContent = driveState.z > 33.5
        ? '외곽 해안 · 빨간 아치교 드라이빙 존 주행 중!'
        : '분수대 부티크 거리 주행 중';
    }
  }
  const boostVib = isBoosting ? Math.sin(elapsed * 42) * 0.032 : Math.sin(elapsed * 22) * 0.015;
  driveState.carRootGroup.position.set(driveState.x, 0.22 + boostVib, driveState.z);
  driveState.carRootGroup.rotation.y = driveState.heading;
  if (typeof updateDriveNitroFlameSprite3D === 'function') {
    updateDriveNitroFlameSprite3D(isBoosting, elapsed);
  }

  for (const w of driveState.wheels) {
    w.rotation.x += driveState.speed * dt * 1.6;
  }

  // [요구사항 7] 풀악셀 니트로 부스트 시 후방 트윈 머플러 불꽃(3D Flame Cones) & 일반 배기 연기 분사!
  driveState.exhaustTimer -= dt;
  if (isBoosting && driveState.exhaustTimer <= 0) {
    driveState.exhaustTimer = 0.045;
    const rightX = fwdZ;
    const rightZ = -fwdX;
    for (const side of [-0.46, 0.46]) {
      const flameMat = Math.random() < 0.35 ? MAT.screenCyan : (Math.random() < 0.5 ? MAT.neonYellow : MAT.ovenFire);
      const fMesh = new THREE.Mesh(GEO.sphere, flameMat);
      fMesh.scale.set(0.24, 0.24, 0.52);
      fMesh.position.set(
        driveState.x - fwdX * 2.15 + rightX * side,
        0.44 + (Math.random() - 0.5) * 0.08,
        driveState.z - fwdZ * 2.15 + rightZ * side
      );
      scene.add(fMesh);
      activeParticles.push({
        mesh: fMesh,
        vx: -fwdX * 5.2 + (Math.random() - 0.5) * 0.9,
        vy: 0.45 + Math.random() * 0.5,
        vz: -fwdZ * 5.2 + (Math.random() - 0.5) * 0.9,
        life: 0.24,
        maxLife: 0.24
      });
    }
  } else if (Math.abs(driveState.speed) > 4.5 && driveState.exhaustTimer <= 0) {
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

  // [요구사항 7] 풀악셀 시 카메라 FOV(시야각) 박진감 있는 줌아웃(58 -> 76 / 운전석 68 -> 84) + 충돌 카메라 쉐이크!
  const targetFov = driveState.cockpitView
    ? (isBoosting ? 84 : 68)
    : (isBoosting ? 76 : 58);
  if (Math.abs(driveCamera.fov - targetFov) > 0.15) {
    driveCamera.fov = THREE.MathUtils.lerp(driveCamera.fov, targetFov, Math.min(1, dt * 8.5));
    driveCamera.updateProjectionMatrix();
  }

  let shakeX = 0;
  let shakeY = 0;
  if (driveState.camShakeTimer > 0) {
    driveState.camShakeTimer = Math.max(0, driveState.camShakeTimer - dt);
    const amp = driveState.camShakeTimer * 0.65;
    shakeX = (Math.random() - 0.5) * amp;
    shakeY = (Math.random() - 0.5) * amp;
  } else if (isBoosting) {
    shakeX = (Math.random() - 0.5) * 0.06;
    shakeY = (Math.random() - 0.5) * 0.05;
  }

  // ==================== 1인칭 운전석(Cockpit) vs 3인칭 추격 카메라 분기 ====================
  if (driveState.cockpitView) {
    const hoodFwd = carDef.id === 'car_limo' ? 1.25 : carDef.id === 'car_scooter' ? 0.72 : 0.38;
    const eyeVib = Math.abs(driveState.speed) > 0.5 ? Math.sin(elapsed * 18) * 0.01 : 0;
    const eyePos = new THREE.Vector3(
      driveState.x + fwdX * hoodFwd + shakeX,
      (carDef.id === 'car_scooter' ? 1.66 : 1.58) + eyeVib + shakeY,
      driveState.z + fwdZ * hoodFwd
    );
    const lookTarget = new THREE.Vector3(
      driveState.x + fwdX * 16.5,
      1.12,
      driveState.z + fwdZ * 16.5
    );
    driveState.camCurrentPos.lerp(eyePos, Math.min(1, dt * 20));
    driveState.camCurrentLook.lerp(lookTarget, Math.min(1, dt * 20));
    driveCamera.position.copy(driveState.camCurrentPos);
    driveCamera.lookAt(driveState.camCurrentLook);
  } else {
    const chaseDist = (carDef.id === 'car_limo' ? 7.8 : 6.1) + (isBoosting ? 1.25 : 0);
    const chaseHeight = 2.72 + (isBoosting ? 0.25 : 0);
    const desiredCamPos = new THREE.Vector3(
      driveState.x - fwdX * chaseDist + shakeX,
      chaseHeight + shakeY,
      driveState.z - fwdZ * chaseDist
    );
    const desiredLook = new THREE.Vector3(
      driveState.x + fwdX * 8.2,
      1.45,
      driveState.z + fwdZ * 8.2
    );
    driveState.camCurrentPos.lerp(desiredCamPos, Math.min(1, dt * 8.5));
    driveState.camCurrentLook.lerp(desiredLook, Math.min(1, dt * 10.5));
    driveCamera.position.copy(driveState.camCurrentPos);
    driveCamera.lookAt(driveState.camCurrentLook);
  }

  // 실시간 디지털 속도계 (상단 배지 & 하단 V12 계기판 & 1인칭 클러스터 동시 업데이트)
  const kmh = Math.round(Math.abs(driveState.speed) * 6.8);
  const speedEl = document.getElementById('drive-speed-badge');
  if (speedEl) speedEl.textContent = `${kmh} km/h`;
  const hudKmhEl = document.getElementById('drive-hud-kmh-val');
  if (hudKmhEl) hudKmhEl.textContent = String(kmh);
  const boostTagEl = document.getElementById('drive-boost-tag');
  if (boostTagEl) boostTagEl.classList.toggle('hidden', !isBoosting && kmh < 185);
  const ckKmhEl = document.getElementById('cockpit-kmh-num');
  if (ckKmhEl) ckKmhEl.textContent = String(kmh);
  const ckGearEl = document.getElementById('cockpit-gear-tag');
  if (ckGearEl) {
    ckGearEl.textContent = isBoosting ? 'S+' : (Math.abs(driveState.speed) < 0.2 ? 'P' : driveState.speed < 0 ? 'R' : 'D');
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
  focusedFirstFloorShopId = null;
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
  const signKind = dest.id === 'shop_roastery'
    ? 'roastery'
    : dest.id === 'shop_flower'
      ? 'flores'
      : dest.id === 'shop_mart1f'
        ? 'mart'
        : dest.id === 'shop_wash1f'
          ? 'wash'
          : dest.id === 'shop_lobster'
            ? 'lobster'
            : dest.id === 'shop_winelounge'
              ? 'winelounge'
              : dest.id === 'shop_marina'
                ? 'marina'
                : 'patisserie';
  const backSign = createFramedSignboard3D(5.8, 1.05, signKind);
  backSign.position.set(0, 3.55, -D * 0.5 + 0.24);
  stg.add(backSign);

  if (dest.id === 'shop_bakery') {
    stg.add(createRoundedToyMesh(2.6, 2.3, 0.95, MAT.gold, -3.4, 1.2, -D * 0.5 + 0.75, 0.1));
    stg.add(createRoundedToyMesh(1.4, 0.5, 0.14, MAT.ovenFire, -3.4, 1.25, -D * 0.5 + 1.25, 0.04));
  } else if (dest.id === 'shop_lobster') {
    const lob = create3DLobsterPlatterMesh();
    lob.scale.setScalar(1.35);
    lob.position.set(-3.5, 0.95, -D * 0.5 + 1.25);
    stg.add(createRoundedToyMesh(2.6, 0.92, 1.1, MAT.white, -3.5, 0.46, -D * 0.5 + 1.25, 0.08), lob);
  } else if (dest.id === 'shop_winelounge') {
    const pno = create3DGrandPianoMesh();
    pno.position.set(-3.4, 0.02, -D * 0.5 + 1.85);
    stg.add(pno);
  } else if (dest.id === 'shop_marina') {
    const yModel = createLuxuryYacht3D(false);
    yModel.scale.setScalar(0.32);
    yModel.position.set(-3.4, 1.08, -D * 0.5 + 1.45);
    stg.add(createRoundedToyMesh(2.6, 0.92, 1.2, MAT.yachtTeakDeck || MAT.woodWarm, -3.4, 0.46, -D * 0.5 + 1.45, 0.08), yModel);
  } else if (dest.id === 'shop_roastery') {
    stg.add(createRoundedToyMesh(2.2, 2.2, 0.9, MAT.walnutTrim, -3.4, 1.15, -D * 0.5 + 0.75, 0.1));
    const cr = createFruitWoodenCrate3D('mix');
    cr.position.set(-3.8, 0.02, -1.2);
    stg.add(cr);
  } else if (dest.id === 'shop_mart1f') {
    const chiller = createMartBlueLedChiller3D();
    chiller.position.set(-3.4, 0.02, -D * 0.5 + 0.65);
    stg.add(chiller);
    const gond = createMartGondolaShelf3D(['chips', 'shrimp', 'choco', 'ramen']);
    gond.position.set(-4.35, 0.02, -1.55);
    gond.rotation.y = Math.PI * 0.5;
    stg.add(gond);
  } else if (dest.id === 'shop_wash1f') {
    for (let wx = -4.2; wx <= -2.1; wx += 1.05) {
      const pair = createStackedDrumWasherPair3D();
      pair.scale.setScalar(0.84);
      pair.position.set(wx, 0.02, -D * 0.5 + 0.72);
      stg.add(pair);
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

  // ==================== 메인 쇼케이스 카운터 & 업종별 시그니처 5종 3D 클릭형 진열 상품 ====================
  stg.add(createRoundedToyMesh(5.6, 0.96, 1.12, MAT.woodWarm, -0.65, 0.48, -0.85, 0.08));
  stg.add(createRoundedToyMesh(5.76, 0.1, 1.24, MAT.white, -0.65, 1.01, -0.85, 0.04));
  const counterSpot = new THREE.PointLight(0xFFF9EC, 1.55, 9.5);
  counterSpot.position.set(-0.65, 2.55, -0.35);
  stg.add(counterSpot);

  const shopItemIds = Array.isArray(dest.showcaseItems) && dest.showcaseItems.length > 0
    ? dest.showcaseItems
    : ['item_cake', 'item_croissant', 'item_coffee', 'item_bouquet', 'item_bento'];
  const shopShowcaseList = shopItemIds
    .map((id) => FP_GIFT_ITEMS.find((g) => g.id === id))
    .filter(Boolean);

  shopShowcaseList.forEach((item, idx) => {
    const ix = -2.65 + idx * 1.02;
    const iy = 1.06;
    const iz = -0.78;

    const prop = create3DGiftPropMesh(item.id, false);
    prop.position.set(ix, iy, iz);
    prop.scale.setScalar(1.08);
    stg.add(prop);

    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(0.96, 0.95, 1.0),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.position.set(ix, iy + 0.32, iz);
    hit.userData = { kind: 'fpShopItem', itemId: item.id, visualMesh: prop };
    stg.add(hit);
    fpState.pickables.push(hit);

    // 하단 구매 바와 중복되지 않도록 진열대 앞에는 깔끔한 미니 가격표 태그만 부착!
    createFpPinBadge(
      FP_STAGE_ORIGIN.x + ix,
      FP_STAGE_ORIGIN.y + iy - 0.16,
      FP_STAGE_ORIGIN.z + iz + 0.56,
      `<span class="text-[#B45309] font-num text-[11.5px]">${item.cost}만</span>`,
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

  // [승부 ③-B] 1인칭 매장 내 라이벌 '블랙타워 강 회장' 거들먹 등장 및 더블 골든벨 맞불 대치!
  if (rivalState.fpKangActive) {
    const kangFp = createChibiPerson3D('rival_kang');
    kangFp.position.set(1.38, 0.04, 0.58);
    stg.add(kangFp);
    rivalState.fpKangMesh = kangFp;
    fpState.npcActors.push({ mesh: kangFp, isClerk: false, isRivalKang: true, baseY: 0.04, phase: 2.1 });
    showSpeechBubble3D(
      'fp_rival_kang_brag',
      FP_STAGE_ORIGIN.x + 1.38,
      FP_STAGE_ORIGIN.y + 2.38,
      FP_STAGE_ORIGIN.z + 0.58,
      '흥! 고작 150만 골든벨로 생색이냐? 내 블랙타워에선 껌값이지!',
      7.5,
      true
    );
  } else {
    rivalState.fpKangMesh = null;
  }

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
  state.feverTimer = Math.max(state.feverTimer || 0, 60.0);
  state.feverPower = Math.max(state.feverPower || 2.5, 2.5);

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
  document.getElementById('btn-fp-double-bell')?.classList.toggle('hidden', !(isShop && rivalState.fpKangActive));

  const exitLbl = document.getElementById('label-exit-fp');
  if (exitLbl) {
    exitLbl.textContent = fpState.returnToDrive ? '차량 운전석 복귀' : '타운 거리로 나가기';
  }

  const dest = FP_SHOP_DESTINATIONS.find((s) => s.id === fpState.shopId) || FP_SHOP_DESTINATIONS[0];
  const placeBadge = document.getElementById('fp-place-badge');
  if (placeBadge) {
    if (isShop) {
      placeBadge.innerHTML = `${createCustomSVGIcon(dest.icon, 15)}<span>${dest.name} · 1인칭 방문</span>`;
    } else {
      const rm = findRoomById(fpState.roomId);
      const fam = rm?.household?.familyName || '공실 투어';
      placeBadge.innerHTML = `${createCustomSVGIcon('doorbell_visit', 15)}<span>${rm?.name || ''}호 (${fam}) · 1인칭 집들이</span>`;
    }
  }

  const strip = document.getElementById('fp-shop-shelf-strip');
  if (strip && isShop) {
    const shopIds = Array.isArray(dest.showcaseItems) && dest.showcaseItems.length > 0
      ? dest.showcaseItems
      : ['item_cake', 'item_croissant', 'item_coffee', 'item_bouquet', 'item_bento'];
    const shopItems = shopIds.map((id) => FP_GIFT_ITEMS.find((g) => g.id === id)).filter(Boolean);
    strip.innerHTML = shopItems.map((it) => `
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
            happiness: 45
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

  rivalState.fpKangActive = false;
  syncFpModeHUD();
  rivalState.fpKangMesh = null;
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

function calcRoomLuxuryStars(rm) {
  if (!rm || !rm.unlocked) return 0;
  const bDef = getFurnitureItemDef('bed', rm.equippedFurniture?.bed) || { tier: 1 };
  const sDef = getFurnitureItemDef('sofa', rm.equippedFurniture?.sofa) || { tier: 1 };
  const aDef = getFurnitureItemDef('appliance', rm.equippedFurniture?.appliance) || { tier: 1 };
  const dDef = getFurnitureItemDef('decor', rm.equippedFurniture?.decor) || { tier: 1 };

  const bT = bDef.tier || 1;
  const sT = sDef.tier || 1;
  const aT = aDef.tier || 1;
  const dT = dDef.tier || 1;
  const maxFacility = Math.max(sT, aT, dT);

  if (bT >= 4 && maxFacility >= 4) return 5;
  if (bT >= 3 && sT >= 3 && aT >= 3) return 4;
  // VIP 입주 핵심 조건: Tier 3~4 침대 + 하이엔드 설비(자쿠지/피아노/와인셀러/수조 등 Tier 3~4) 세팅 완료 시 ★3 이상!
  if (bT >= 3 && maxFacility >= 3) return 3;
  if (Math.max(bT, maxFacility) >= 2) return 2;
  return 1;
}

function buildInlineRoomFurnitureSectionHTML(rm) {
  const showHarbor = true;
  const rawList = FURNITURE_CATALOG[activeFurnitureCategory] || [];
  const list = rawList.filter((item) => !item.harborTier || showHarbor);
  const ownedArr = rm.ownedFurniture?.[activeFurnitureCategory] || [];
  const equippedId = rm.equippedFurniture?.[activeFurnitureCategory];
  const tierMeta = window.FURNITURE_TIER_META || {};

  const catTabsHtml = (FURNITURE_CATEGORIES || []).map((c) => `
    <button type="button" data-rf-cat="${c.key}" class="fcat-tab-btn !py-1 !px-1 !text-[10.5px] ${activeFurnitureCategory === c.key ? 'active' : ''}">
      <span>${c.label}</span>
    </button>
  `).join('');

  const cardsHtml = list.map((item) => {
    const isOwnedInRoom = ownedArr.includes(item.id);
    const isEquipped = equippedId === item.id;
    const invCount = Number(state.furnitureInventory?.[item.id] || 0);
    const tInfo = tierMeta[item.tier || 1] || { short: `T${item.tier || 1}`, color: '#5C4938', bg: '#F7EFE5' };

    let actionBtn = '';
    if (!rm.unlocked) {
      actionBtn = `<button type="button" disabled class="diary-pill-badge !text-[10.5px] px-2.5 py-1 opacity-55">개방 필요</button>`;
    } else if (isEquipped) {
      actionBtn = `<span class="kw-chip tone-mint !text-[10.5px] !py-1 !px-2.5">✨ 세팅됨</span>`;
    } else if (isOwnedInRoom) {
      actionBtn = `<button type="button" data-rf-equip="${item.id}" class="jelly-action-btn btn-mint-lip !py-1.5 !px-2.5 !text-[11px]">배치 변경</button>`;
    } else if (invCount > 0) {
      actionBtn = `<button type="button" data-rf-inv-equip="${item.id}" class="jelly-action-btn btn-sky-lip !py-1.5 !px-2.5 !text-[11px]">📦 창고세팅 (${invCount})</button>`;
    } else {
      actionBtn = `<button type="button" data-rf-buy-equip="${item.id}" class="jelly-action-btn btn-gold-lip !py-1.5 !px-2.5 !text-[11px]">🛒 ${item.cost.toLocaleString()}만 세팅</button>`;
    }

    return `
      <div class="diary-subcard !p-2 flex items-center justify-between gap-2 ${isEquipped ? '!border-2 !border-[#38E54D] !bg-[#EDFCF0]' : ''}">
        <div class="w-[66px] h-[44px] rounded-xl overflow-hidden bg-[#FFFDF9] border border-[#E9D5C0] shrink-0 flex items-center justify-center">
          ${getOrRender3DCatalogPreview(item.id, 132, 84)}
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1 flex-wrap">
            <span class="px-1.5 py-0.5 rounded-full font-extrabold text-[9.5px]" style="background:${tInfo.bg};color:${tInfo.color};">${tInfo.short}</span>
            <span class="font-title text-[12px] text-[#3A2E2B] truncate">${item.name}</span>
          </div>
          <div class="font-body text-[10.5px] font-bold text-[#69544C] mt-0.5">${item.chip}</div>
        </div>
        <div class="shrink-0">${actionBtn}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="space-y-2 pt-1 border-t border-[#EED6BE]">
      <div class="flex items-center justify-between">
        <span class="font-title text-[12.5px] text-[#3A2E2B]">🛋️ 방 가구·설비 세팅 (인테리어 +${calcRoomFurnitureRentAdd(rm)}만)</span>
        <button type="button" id="btn-rf-goto-flagship" class="kw-chip tone-coral cursor-pointer !text-[10px] !py-0.5 !px-2">가구샵 ➔</button>
      </div>
      <div class="grid grid-cols-4 gap-1">${catTabsHtml}</div>
      <div class="space-y-1.5">${cardsHtml}</div>
    </div>
  `;
}

function bindInlineRoomFurnitureEvents(rm) {
  if (!dom.rfBody) return;
  dom.rfBody.querySelector('#btn-rf-goto-flagship')?.addEventListener('click', () => {
    openFurnitureFlagshipDrawer(activeFurnitureCategory);
  });
  dom.rfBody.querySelectorAll('[data-rf-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeFurnitureCategory = btn.getAttribute('data-rf-cat');
      renderFocusedRoomInspector();
    });
  });
  dom.rfBody.querySelectorAll('[data-rf-equip]').forEach((btn) => {
    btn.addEventListener('click', () => {
      handleBuyOrEquipFurniture(rm, activeFurnitureCategory, btn.getAttribute('data-rf-equip'), false, false);
    });
  });
  dom.rfBody.querySelectorAll('[data-rf-inv-equip]').forEach((btn) => {
    btn.addEventListener('click', () => {
      handleBuyOrEquipFurniture(rm, activeFurnitureCategory, btn.getAttribute('data-rf-inv-equip'), false, true);
    });
  });
  dom.rfBody.querySelectorAll('[data-rf-buy-equip]').forEach((btn) => {
    btn.addEventListener('click', () => {
      handleBuyOrEquipFurniture(rm, activeFurnitureCategory, btn.getAttribute('data-rf-buy-equip'), true, false);
    });
  });
}

function renderFocusedRoomInspector() {
  const rm = findRoomById(focusedRoomId);
  if (!rm || !dom.rfBody) return;
  const bState = state.buildings[rm.lotId];
  const meta = ROOM_TYPE_META[rm.layoutType] || ROOM_TYPE_META.studio;
  const stars = calcRoomLuxuryStars(rm);
  const starStr = '★'.repeat(Math.max(1, stars)) + '☆'.repeat(Math.max(0, 5 - Math.max(1, stars)));

  if (dom.rfRoomNum) dom.rfRoomNum.textContent = `${rm.name}호`;
  if (dom.rfTypeBadge) {
    dom.rfTypeBadge.className = `kw-chip tone-${meta.tone} !py-0.5 !px-2 shrink-0`;
    dom.rfTypeBadge.innerHTML = `${createCustomSVGIcon(meta.svgIcon, 14)}<span>${meta.shortBadge}</span>`;
  }
  if (dom.rfTierBadge) dom.rfTierBadge.textContent = rm.unlocked ? `럭셔리 ★${stars}` : '미개방';

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
  const vipReadyBadge = stars >= 3
    ? `<div class="kw-chip tone-gold w-full justify-center !py-1 !text-[11px]">👑 럭셔리 ${starStr} · 고액 VIP 세입자 계약 가능!</div>`
    : `<div class="kw-chip tone-cream w-full justify-center !py-1 !text-[10.5px]">💡 럭셔리 ${starStr} (T3+ 침대 & 설비 세팅 시 ★3 VIP 해금!)</div>`;

  if (!rm.household) {
    dom.rfBody.innerHTML = `
      <div class="diary-subcard space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="font-title text-[13.5px] text-[#3A2E2B]">${meta.badge} · 공실</span>
          <span class="kw-chip tone-mint">${createCustomSVGIcon('coin_stack', 14)}<span>예상 ${effRent}만</span></span>
        </div>
        ${vipReadyBadge}
        <div class="grid grid-cols-2 gap-1.5">
          <button type="button" id="btn-rf-recruit" class="jelly-action-btn btn-coral-lip py-2 !text-[11.5px]">
            <span>🤝 세입자 심사·계약</span>
          </button>
          ${!rm.soundproofed ? `
            <button type="button" id="btn-rf-sound-vacant" class="jelly-action-btn btn-sky-lip py-2 !text-[11.5px]">
              <span>🔨 방음시공 ${GAME_BALANCE.soundproofCost}만</span>
            </button>
          ` : `
            <span class="kw-chip tone-mint justify-center py-1.5 !text-[11px]">방음시공 완료</span>
          `}
        </div>
      </div>
      ${buildInlineRoomFurnitureSectionHTML(rm)}
    `;
    dom.rfBody.querySelector('#btn-rf-recruit')?.addEventListener('click', () => openRecruitModal(rm));
    dom.rfBody.querySelector('#btn-rf-sound-vacant')?.addEventListener('click', () => installSoundproofAction(rm));
    bindInlineRoomFurnitureEvents(rm);
    syncTopBarsByMode();
    return;
  }

  const hDef = HOUSEHOLD_TYPES[rm.household.type] || HOUSEHOLD_TYPES.student;
  const happyVal = Math.round(rm.household.happiness || 90);

  dom.rfBody.innerHTML = `
    <div class="diary-subcard space-y-2">
      <div class="flex items-center gap-2.5">
        ${createHouseholdAvatarSVG(rm.household.type, 44)}
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="font-title text-[13.5px] text-[#3A2E2B]">${rm.household.familyName}</span>
            <span class="role-accent-badge" style="background:${hDef.accentHex};">${hDef.label}</span>
          </div>
          <div class="flex items-center gap-1.5 mt-1 flex-wrap">
            <span class="kw-chip tone-gold !py-0.5 !px-2">${createCustomSVGIcon('coin_stack', 13)}<span>주기 ${effRent}만</span></span>
            <span class="kw-chip tone-coral !py-0.5 !px-2">♥ ${happyVal}%</span>
          </div>
        </div>
      </div>
      ${vipReadyBadge}
      <div class="grid grid-cols-2 gap-1.5">
        ${rm.trashStage > 0 ? `
          <button type="button" id="btn-rf-clean" class="jelly-action-btn btn-mint-lip py-1.5 !text-[11px]">특수청소 ${GAME_BALANCE.specialCleanCost}만</button>` : ''}
        ${!rm.soundproofed ? `
          <button type="button" id="btn-rf-sound" class="jelly-action-btn btn-sky-lip py-1.5 !text-[11px]">방음시공 ${GAME_BALANCE.soundproofCost}만</button>` : `
          <span class="kw-chip tone-mint justify-center py-1 !text-[10.5px]">층간방음 완료</span>`}
        <button type="button" id="btn-rf-evict" class="jelly-action-btn btn-coral-lip py-1.5 !text-[11px]">퇴거 집행</button>
      </div>
    </div>
    ${buildInlineRoomFurnitureSectionHTML(rm)}
  `;

  dom.rfBody.querySelector('#btn-rf-clean')?.addEventListener('click', () => cleanRoomTrashAction(rm));
  dom.rfBody.querySelector('#btn-rf-sound')?.addEventListener('click', () => installSoundproofAction(rm));
  dom.rfBody.querySelector('#btn-rf-evict')?.addEventListener('click', () => evictRoomTenantAction(rm));
  bindInlineRoomFurnitureEvents(rm);
  syncTopBarsByMode();
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

  const rawList = FURNITURE_CATALOG[activeFurnitureCategory] || [];
  const showHarborItems = rm.lotId === 'lot_harbor_main' || !!state.harborUnlocked;
  const list = rawList.filter((item) => !item.harborTier || showHarborItems);
  dom.fcatItemsGrid.classList.toggle('cols-5', list.length >= 5);
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
        <div class="fcat-thumb-stage">${getOrRender3DCatalogPreview(item.id, 180, 92)}</div>
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

function handleBuyOrEquipFurniture(rm, category, itemId, isBuy, useInventory = false) {
  const def = getFurnitureItemDef(category, itemId);
  if (!def) return;
  if (useInventory) {
    if (!state.furnitureInventory || !(state.furnitureInventory[itemId] > 0)) {
      showToast('보유 창고에 해당 가구 재고가 없습니다!', 'coral');
      return;
    }
    state.furnitureInventory[itemId] -= 1;
    syncFlagshipInventoryBadge();
  } else if (isBuy) {
    if (!spendGold(def.cost)) return;
  }

  if (!rm.ownedFurniture[category].includes(itemId)) {
    rm.ownedFurniture[category].push(itemId);
  }
  rm.equippedFurniture[category] = itemId;
  syncRoomInteriorStats(rm);

  if (rm.household && isBuy) {
    rm.household.happiness = Math.min(100, (rm.household.happiness || 45) + (def.happyAdd || 12));
  } else if (isBuy) {
    state.townHappinessBoost = Math.min(65, (state.townHappinessBoost || 0) + 5);
  }

  const lot = state.lots.find((l) => l.lotId === rm.lotId);
  const wx = (lot?.x || 0) + rm.lx;
  const wy = rm.ly + 1.4;
  const wz = (lot?.z || 0) + rm.lz;

  if (def.grantsSoundproof) {
    playSoundproofTileLaying3D(rm);
  } else {
    tuckFocusDockTemporarily(1.22);
    rebuildRoom3D(rm.lotId, rm);
    syncBuildingResidents3D(rm.lotId);
    const rGrp = lot3D[rm.lotId]?.roomsMap?.[rm.id];
    if (rGrp && category !== 'decor') {
      const targetChild = rGrp.children[rGrp.children.length - 1] || rGrp;
      playDropBouncePlacement3D(targetChild, wx, rm.ly + 0.5, wz);
    }
  }

  // 세입자가 새 가구 앞으로 다가와 감탄하며 리액션!
  const resList = residentActors[rm.id];
  if (resList && resList.length > 0) {
    resList[0].tx = 0.0;
    resList[0].tz = 0.45;
    resList[0].waitTimer = 0;
    triggerSquashStretch(resList[0].mesh, 1.3);
  }
  if (def.reaction) {
    showSpeechBubble3D(`rm_${rm.id}`, wx, wy + 1.45, wz, def.reaction, 3.6, true);
  }

  updateTopHUDTargets();
  renderFocusedRoomInspector();
  renderFurnitureCatalogSheet();
  showToast(`[${rm.name}호] ${def.name} 3D 시공 & 착지 연출 완료!`, 'mint');
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
  if (rm.household) {
    rm.household.happiness = Math.min(100, (rm.household.happiness || 50) + 14);
  }
  state.stats.crisisResolved = (state.stats.crisisResolved || 0) + 1;

  const lot = state.lots.find((l) => l.lotId === rm.lotId);
  const wx = (lot?.x || 0) + rm.lx;
  const wz = (lot?.z || 0) + rm.lz;
  spawnPoofParticles3D(wx, rm.ly + 0.8, wz, 0xF8FAFC, 16);
  playSoundproofTileLaying3D(rm);
  showSpeechBubble3D(`sp_${rm.id}`, wx, rm.ly + 2.5, wz, '우와! 두툼한 격자 방음 패드가 깔려서 이제 층간소음 걱정 제로예요!!', 3.6, true);

  updateTopHUDTargets();
  renderFocusedRoomInspector();
  showToast(`${rm.name}호 격자 방음 패드 타일 시공 완료!`, 'mint');
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

// --------------------- 1층 상가(편의점·세탁소) + 단독 상가(빵집·로스터리·플라워샵) 통합 인스펙터 & 3D 설비 카탈로그 ---------------------
function renderShopSwitcherChips() {
  if (!dom.shopSwitcherChips) return;
  const activeStage = state.activeTownStage === 2 && state.harborUnlocked ? 2 : 1;
  const f1Chips = activeStage === 1
    ? (window.FIRST_FLOOR_SHOPS_TEMPLATE || []).map((ft) => {
      const isAct = ft.shopId === focusedFirstFloorShopId;
      return `
        <button type="button" data-switch-1fshop="${ft.shopId}" class="room-switch-chip ${isAct ? 'active' : ''}">
          ${createCustomSVGIcon(ft.svgIcon, 16)}
          <span>${ft.name}</span>
          ${createCustomSVGIcon('crown_badge', 13)}
        </button>
      `;
    }).join('')
    : '';

  const standaloneChips = STANDALONE_SHOPS_TEMPLATE
    .filter((tpl) => (tpl.stage || 1) === activeStage)
    .map((tpl) => {
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

  dom.shopSwitcherChips.innerHTML = f1Chips + standaloneChips;

  dom.shopSwitcherChips.querySelectorAll('[data-switch-1fshop]').forEach((btn) => {
    btn.addEventListener('click', () => focusCameraOnFirstFloorShop(btn.getAttribute('data-switch-1fshop')));
  });
  dom.shopSwitcherChips.querySelectorAll('[data-switch-shop]').forEach((btn) => {
    btn.addEventListener('click', () => focusCameraOnShop(btn.getAttribute('data-switch-shop')));
  });
}

function renderFocusedFirstFloorShopPanel() {
  if (!focusedFirstFloorShopId || !dom.sfBody) return;
  const tpl = (window.FIRST_FLOOR_SHOPS_TEMPLATE || []).find((s) => s.shopId === focusedFirstFloorShopId);
  const st = state.firstFloorShops?.[focusedFirstFloorShopId];
  if (!tpl) return;

  const { visitRev, cycleRev, upgCount } = calcFirstFloorShopStats(focusedFirstFloorShopId);
  const upgPct = Math.round((upgCount / 3) * 100);

  const iconSlot = document.getElementById('sf-icon-slot');
  if (iconSlot) iconSlot.innerHTML = createCustomSVGIcon(tpl.svgIcon, 22);
  if (dom.sfTitle) dom.sfTitle.textContent = tpl.name;
  if (dom.sfOwnerBadge) {
    dom.sfOwnerBadge.className = 'kw-chip tone-mint !py-0.5 !px-2.5 shrink-0';
    dom.sfOwnerBadge.innerHTML = `${createCustomSVGIcon('crown_badge', 13)}<span>빌딩1층 직영</span>`;
  }

  dom.sfBody.innerHTML = `
    <div class="diary-subcard space-y-2.5">
      <div class="flex items-center gap-2.5">
        ${createHouseholdAvatarSVG(tpl.kind === 'mart1f' ? 'student' : 'newlywed', 48)}
        <div class="min-w-0 flex-1">
          <div class="font-title text-[14px] text-[#3A2E2B]">${tpl.staffName}</div>
          <div class="font-body text-[11px] font-semibold text-[#69544C] break-keep">${tpl.engTitle} · ${tpl.subCopy}</div>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-1.5 text-center">
        <div class="bg-[#FFF9DB] border border-[#FACC15] rounded-2xl py-1.5 px-1">
          <div class="font-body text-[10px] font-bold text-[#8C5800]">건당단가</div>
          <div class="font-title text-[13px] text-[#3A2E2B]">+${visitRev}만</div>
        </div>
        <div class="bg-[#E8FCEC] border border-[#6EE780] rounded-2xl py-1.5 px-1">
          <div class="font-body text-[10px] font-bold text-[#137A22]">주기순익</div>
          <div class="font-title text-[13px] text-[#137A22]">+${cycleRev}만</div>
        </div>
        <div class="bg-[#EAF7FF] border border-[#7CCEFF] rounded-2xl py-1.5 px-1">
          <div class="font-body text-[10px] font-bold text-[#0969A6]">누적이용</div>
          <div class="font-title text-[13px] text-[#3A2E2B]">${st?.totalServed || 12}명</div>
        </div>
      </div>

      <div class="space-y-1">
        <div class="flex items-center justify-between text-[11px] font-title text-[#5C4942]">
          <span>1층 매장 3D 집기 업그레이드</span>
          <span>${upgCount} / 3단계</span>
        </div>
        <div class="candy-gauge-track">
          <div class="candy-gauge-fill candy-mint" style="width:${upgPct}%"></div>
        </div>
      </div>
    </div>
    <div class="space-y-1.5 pt-1 border-t border-[#EED6BE]">
      <div class="font-title text-[12.5px] text-[#3A2E2B]">🛠️ 1층 직영매장 3D 설비 증설</div>
      ${tpl.upgradesCatalog.map((upg) => {
        const installed = !!st?.upgrades?.[upg.id];
        return `
          <div class="diary-subcard !p-2 flex items-center justify-between gap-2 ${installed ? '!border-2 !border-[#38E54D] !bg-[#EDFCF0]' : ''}">
            <div class="w-[62px] h-[42px] rounded-xl overflow-hidden bg-[#FFFDF9] border border-[#E9D5C0] shrink-0 flex items-center justify-center">
              ${getOrRender3DCatalogPreview(upg.id, 128, 80)}
            </div>
            <div class="min-w-0 flex-1">
              <div class="font-title text-[12px] text-[#3A2E2B] leading-tight">${upg.name}</div>
              <div class="font-body text-[10.5px] font-bold text-[#69544C]">${upg.chip}</div>
            </div>
            ${installed
              ? `<span class="kw-chip tone-mint !text-[10.5px] shrink-0">시공됨</span>`
              : `<button type="button" data-sf-1fupg="${upg.id}" class="jelly-action-btn btn-gold-lip !py-1.5 !px-2.5 !text-[11px] shrink-0">${upg.cost}만 증설</button>`}
          </div>
        `;
      }).join('')}
    </div>
  `;
  dom.sfBody.querySelectorAll('[data-sf-1fupg]').forEach((btn) => {
    btn.addEventListener('click', () => buyFirstFloorShopUpgradeAction(focusedFirstFloorShopId, btn.getAttribute('data-sf-1fupg')));
  });
}

function renderFirstFloorShopUpgradeCatalog() {
  if (!focusedFirstFloorShopId || !dom.fcatItemsGrid) return;
  const tpl = (window.FIRST_FLOOR_SHOPS_TEMPLATE || []).find((s) => s.shopId === focusedFirstFloorShopId);
  const st = state.firstFloorShops?.[focusedFirstFloorShopId];
  if (!tpl) return;

  const { visitRev, cycleRev } = calcFirstFloorShopStats(focusedFirstFloorShopId);
  const headerIco = document.getElementById('fcat-header-ico');
  if (headerIco) headerIco.innerHTML = createCustomSVGIcon(tpl.svgIcon, 20);
  if (dom.fcatSheetTitle) dom.fcatSheetTitle.textContent = '1층 직영매장 3D 설비 카탈로그';
  if (dom.fcatRoomBadge) dom.fcatRoomBadge.textContent = tpl.name;
  if (dom.fcatBonusBadge) dom.fcatBonusBadge.textContent = `방문 +${visitRev}만 · 주기 +${cycleRev}만`;

  dom.fcatTabsRow?.classList.add('hidden');
  dom.fcatItemsGrid.classList.remove('cols-5');
  dom.fcatItemsGrid.classList.add('cols-3');

  dom.fcatItemsGrid.innerHTML = tpl.upgradesCatalog.map((upg) => {
    const installed = !!st?.upgrades?.[upg.id];
    const btnHtml = installed
      ? `<button type="button" disabled class="kw-chip tone-mint w-full justify-center py-1.5">${createCustomSVGIcon('sparkle_star', 14)}<span>3D 시공 완료</span></button>`
      : `<button type="button" data-1f-upg="${upg.id}" class="jelly-action-btn btn-gold-lip w-full py-1.5 !text-[12px]">${createCustomSVGIcon('coin_stack', 15)}<span>${upg.cost}만 증설</span></button>`;

    return `
      <div class="fcat-item-card ${installed ? 'equipped' : ''}">
        <div class="fcat-thumb-stage">${getOrRender3DCatalogPreview(upg.id, 188, 92)}</div>
        <div class="space-y-1">
          <div class="font-title text-[13px] text-[#3A2E2B] leading-snug">${upg.name}</div>
          <span class="kw-chip tone-${upg.tone} !text-[10.5px] !py-0.5 !px-2">${upg.chip}</span>
        </div>
        ${btnHtml}
      </div>
    `;
  }).join('');

  dom.fcatItemsGrid.querySelectorAll('[data-1f-upg]').forEach((btn) => {
    btn.addEventListener('click', () => buyFirstFloorShopUpgradeAction(focusedFirstFloorShopId, btn.getAttribute('data-1f-upg')));
  });
}

function buyFirstFloorShopUpgradeAction(shopId, upgId) {
  const tpl = (window.FIRST_FLOOR_SHOPS_TEMPLATE || []).find((s) => s.shopId === shopId);
  if (!tpl) return;
  if (!state.firstFloorShops) state.firstFloorShops = createInitialFirstFloorShops();
  const st = state.firstFloorShops[shopId];
  const upg = tpl.upgradesCatalog.find((u) => u.id === upgId);
  if (!st || !upg || st.upgrades[upgId]) return;
  if (!spendGold(upg.cost)) return;

  st.upgrades[upgId] = true;
  state.townHappinessBoost = Math.min(65, (state.townHappinessBoost || 0) + 6);
  tuckFocusDockTemporarily(1.28);

  const fObj = firstFloorShop3D[shopId];
  const lot = state.lots.find((l) => l.lotId === 'lot_main') || { x: -4.2, z: -6.4 };
  const wx = lot.x + tpl.localX;
  const wz = lot.z + 0.5;

  if (fObj?.group) {
    if (shopId === 'shop_mart1f') build1FMinimiMartInterior3D(fObj.group, 'lot_main');
    else build1FBubbleLaundryInterior3D(fObj.group, 'lot_main');
    playDropBouncePlacement3D(fObj.group, wx, 0.5, wz);
  }
  showSpeechBubble3D(`staff_1f_${shopId}`, wx, 2.75, wz, upg.reaction, 3.8, true);

  updateTopHUDTargets();
  renderFocusedFirstFloorShopPanel();
  renderFirstFloorShopUpgradeCatalog();
  showToast(`[${tpl.name}] ${upg.name} 3D 증설 완료!`, 'mint');
  saveGameState();
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

      ${(st.auctionBonusPct || 0) > 0 ? `
        <div class="kw-chip tone-gold w-full justify-center py-1.5">
          ${createCustomSVGIcon('auction_paddle', 15)}
          <span>강 회장 경매 배틀 완승! 기본수익 영구 +${st.auctionBonusPct}% 적용</span>
        </div>
      ` : ''}

      ${st.owned ? `
        <div class="kw-chip tone-mint w-full justify-center py-2">
          ${createCustomSVGIcon('cash_arrow_up', 16)}
          <span>손님 결제금이 내 자산으로 실시간 적립 중!</span>
        </div>
      ` : `
        <div class="space-y-1.5">
          <button type="button" id="btn-acquire-shop" class="jelly-action-btn btn-coral-lip w-full py-2.5">
            ${createCustomSVGIcon('crown_badge', 18)}
            <span>단독 상가 직영 인수 (${tpl.buyCost.toLocaleString()}만)</span>
          </button>
          <button type="button" id="btn-auction-war-shop" class="rival-bolt-pill w-full justify-center py-2 !text-[12px]">
            ${createCustomSVGIcon('auction_paddle', 16)}
            <span>라이벌 1:1 경매 배틀로 인수 (수익 +40%!)</span>
          </button>
        </div>
      `}
    </div>
  `;

  dom.sfBody.querySelector('#btn-acquire-shop')?.addEventListener('click', () => {
    acquireStandaloneShopAction(focusedShopId);
  });
  dom.sfBody.querySelector('#btn-auction-war-shop')?.addEventListener('click', () => {
    startShopBiddingWar(focusedShopId);
  });

  // 우측 340px 슬림 드로어 안에서 3D 설비 증설까지 한 번에 처리!
  const upgCatalog = getShopUpgradeCatalogFor(tpl);
  const upgWrap = document.createElement('div');
  upgWrap.className = 'space-y-1.5 pt-2 border-t border-[#EED6BE]';
  upgWrap.innerHTML = `
    <div class="font-title text-[12.5px] text-[#3A2E2B]">🛠️ 부티크 매장 3D 설비 증설</div>
    ${upgCatalog.map((upg) => {
      const installed = !!st.upgrades?.[upg.id];
      const actBtn = !st.owned
        ? `<span class="diary-pill-badge !text-[10px] opacity-60 shrink-0">인수 필요</span>`
        : installed
          ? `<span class="kw-chip tone-mint !text-[10.5px] shrink-0">시공됨</span>`
          : `<button type="button" data-sf-upg="${upg.id}" class="jelly-action-btn btn-gold-lip !py-1.5 !px-2.5 !text-[11px] shrink-0">${upg.cost}만 증설</button>`;
      return `
        <div class="diary-subcard !p-2 flex items-center justify-between gap-2 ${installed ? '!border-2 !border-[#38E54D] !bg-[#EDFCF0]' : ''}">
          <div class="w-[62px] h-[42px] rounded-xl overflow-hidden bg-[#FFFDF9] border border-[#E9D5C0] shrink-0 flex items-center justify-center">
            ${getOrRender3DCatalogPreview(upg.id, 128, 80)}
          </div>
          <div class="min-w-0 flex-1">
            <div class="font-title text-[12px] text-[#3A2E2B] leading-tight">${upg.name}</div>
            <div class="font-body text-[10.5px] font-bold text-[#69544C]">${upg.chip}</div>
          </div>
          ${actBtn}
        </div>
      `;
    }).join('')}
  `;
  dom.sfBody.appendChild(upgWrap);
  upgWrap.querySelectorAll('[data-sf-upg]').forEach((btn) => {
    btn.addEventListener('click', () => buyShopUpgradeAction(focusedShopId, btn.getAttribute('data-sf-upg')));
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
  dom.fcatItemsGrid.classList.remove('cols-5');
  dom.fcatItemsGrid.classList.add('cols-3');

  const upgCatalog = getShopUpgradeCatalogFor(tpl);
  dom.fcatItemsGrid.innerHTML = upgCatalog.map((upg) => {
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
        <div class="fcat-thumb-stage">${getOrRender3DCatalogPreview(upg.id, 188, 92)}</div>
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
  const upg = getShopUpgradeCatalogFor(tpl).find((u) => u.id === upgId);
  if (!tpl || !st || !upg || !st.owned || st.upgrades[upgId]) return;
  if (!spendGold(upg.cost)) return;

  st.upgrades[upgId] = true;
  syncHarborBridgeGate3D();
  state.townHappinessBoost = Math.min(65, (state.townHappinessBoost || 0) + 6);
  tuckFocusDockTemporarily(1.25);
  rebuildStandaloneShop3D(shopId);
  const sGrp = standaloneShop3D[shopId]?.group;
  if (sGrp) {
    playDropBouncePlacement3D(sGrp, tpl.x, 0.35, tpl.z);
  }
  showSpeechBubble3D(`staff_${shopId}`, tpl.x, 2.6, tpl.z, upg.reaction, 3.6, true);

  updateTopHUDTargets();
  renderFocusedShopPanel();
  renderShopUpgradeCatalog();
  showToast(`[${tpl.name}] ${upg.name} 3D 시공 & 착지 완료!`, 'mint');
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
  closeAllModalsImmediate('notebook-modal');
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
    const activeLotId = (state.activeTownStage === 2 && state.harborUnlocked) ? 'lot_harbor_main' : 'lot_main';
    const b = state.buildings[activeLotId] || state.buildings.lot_main;
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
    const activeLotId = (state.activeTownStage === 2 && state.harborUnlocked) ? 'lot_harbor_main' : 'lot_main';
    const b = state.buildings[activeLotId] || state.buildings.lot_main;
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
      rebuildPublicInfraAndManager3D(b.lotId);
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
    const activeLotId = (state.activeTownStage === 2 && state.harborUnlocked) ? 'lot_harbor_main' : 'lot_main';
    const b = state.buildings[activeLotId] || state.buildings.lot_main;
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

    const visibleShops = STANDALONE_SHOPS_TEMPLATE.filter((tpl) => tpl.stage !== 2 || state.harborUnlocked);
    const shopCards = visibleShops.map((tpl) => {
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
        rebuildPublicInfraAndManager3D(b.lotId);
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

// --------------------- 입주 세대 모집 모달 (방 럭셔리 등급 ★1~★5 조건 연동!) ---------------------
function openRecruitModal(room) {
  if (!room) return;
  closeAllModalsImmediate('recruit-modal');
  recruitRoomTarget = room;
  const meta = ROOM_TYPE_META[room.layoutType] || ROOM_TYPE_META.studio;
  const stars = calcRoomLuxuryStars(room);
  if (dom.recRoomTitle) dom.recRoomTitle.textContent = `${room.name}호 (럭셔리 ★${stars}) · ${meta.shortBadge}`;
  rollRecruitCandidates(room);
  renderRecruitCards();
  dom.recruitModal?.classList.remove('hidden');
}

function rollRecruitCandidates(room) {
  const isHarborSuite = room?.lotId === 'lot_harbor_main';
  const normalKeys = Object.keys(HOUSEHOLD_TYPES).filter((k) => !HOUSEHOLD_TYPES[k]?.isVipTenant && !HOUSEHOLD_TYPES[k]?.isHarborVip);
  const stage1VipKeys = Object.keys(HOUSEHOLD_TYPES).filter((k) => HOUSEHOLD_TYPES[k]?.isVipTenant && !HOUSEHOLD_TYPES[k]?.isHarborVip);
  const harborVipKeys = Object.keys(HOUSEHOLD_TYPES).filter((k) => HOUSEHOLD_TYPES[k]?.isHarborVip);

  recruitCandidates = [];
  const chosenTypes = [];

  if (isHarborSuite) {
    chosenTypes.push(
      harborVipKeys[0] || 'movie_star',
      harborVipKeys[1] || 'fund_manager',
      harborVipKeys[2] || 'cruise_captain',
      stage1VipKeys[1] || 'it_ceo'
    );
  } else {
    // 일반 입주 희망자 2팀(★1 베이직 조건) + 고액 임대료 3~10배 VIP 입주 희망자 2팀(★3 하이엔드 조건)!
    const n1 = normalKeys[Math.floor(Math.random() * normalKeys.length)] || 'student';
    const remNormals = normalKeys.filter((k) => k !== n1);
    const n2 = remNormals[Math.floor(Math.random() * remNormals.length)] || 'newlywed';
    chosenTypes.push(n1, n2, 'streamer', 'it_ceo');
  }

  for (const tKey of chosenTypes) {
    const hDef = HOUSEHOLD_TYPES[tKey];
    if (!hDef) continue;
    const fam = `${FAMILY_LAST_NAMES[Math.floor(Math.random() * FAMILY_LAST_NAMES.length)]}${GIVEN_NAMES[Math.floor(Math.random() * GIVEN_NAMES.length)]} ${hDef.isVipTenant ? 'VIP' : '세대'}`;
    const budget = Math.round(hDef.minRent + Math.random() * (hDef.maxRent - hDef.minRent));
    recruitCandidates.push({ type: tKey, familyName: fam, maxBudget: budget });
  }
}

function renderRecruitCards() {
  if (!dom.recCardsGrid || !recruitRoomTarget) return;
  const meta = ROOM_TYPE_META[recruitRoomTarget.layoutType] || ROOM_TYPE_META.studio;
  const roomStars = calcRoomLuxuryStars(recruitRoomTarget);
  const starStr = '★'.repeat(Math.max(1, roomStars)) + '☆'.repeat(Math.max(0, 5 - Math.max(1, roomStars)));

  const roomSummaryBanner = `
    <div class="diary-subcard !p-2.5 flex items-center justify-between gap-2 bg-[#FFFBEB] border border-[#FCD34D]">
      <div class="font-title text-[12px] text-[#92400E]">현재 ${recruitRoomTarget.name}호 세팅: <b class="text-[#B45309]">${starStr} (★${roomStars})</b></div>
      <span class="kw-chip ${roomStars >= 3 ? 'tone-mint' : 'tone-gold'} !text-[10px] !py-0.5 !px-2">${roomStars >= 3 ? 'VIP 계약 해금!' : '★3+ 시 VIP 해금'}</span>
    </div>
  `;

  const cardsHtml = recruitCandidates.map((cand, idx) => {
    const hDef = HOUSEHOLD_TYPES[cand.type];
    const isMatch = meta.preferredBy.includes(cand.type);
    const reqStars = hDef.minLuxuryStars || (hDef.isVipTenant ? 3 : 1);
    const canContract = roomStars >= reqStars;

    return `
      <div class="diary-card !p-3 flex flex-col justify-between gap-2 ${hDef.isVipTenant ? '!border-[#F59E0B] !border-2 !bg-[#FFFDF4]' : isMatch ? '!border-[#38E54D] !border-2' : ''}">
        <div class="space-y-1.5">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              ${createHouseholdAvatarSVG(cand.type, 42)}
              <div class="min-w-0">
                <div class="font-title text-[13.5px] text-[#3A2E2B] truncate">${cand.familyName}</div>
                <span class="role-accent-badge mt-0.5" style="background:${hDef.accentHex};">${hDef.label}</span>
              </div>
            </div>
            <span class="kw-chip ${hDef.isVipTenant ? 'tone-gold' : 'tone-cream'} !text-[10px] !py-0.5 !px-2 shrink-0">필요 ★${reqStars}</span>
          </div>
          <div class="flex items-center justify-between gap-1.5 flex-wrap pt-0.5">
            <span class="font-body text-[12px] font-bold text-[#5C4942]">희망 월세 한도: <b class="text-[#15803D] text-[13.5px]">${cand.maxBudget.toLocaleString()}만</b></span>
            ${isMatch ? `<span class="kw-chip tone-mint !text-[9.5px] !py-0.5 !px-1.5">${meta.shortBadge} +15%</span>` : ''}
          </div>
          ${!canContract ? `
            <div class="rounded-xl px-2.5 py-1.5 bg-[#FEF2F2] border border-[#FECACA] font-title text-[10.5px] text-[#B91C1C]">
              🔒 VIP 입주 조건 미충족: 방에 <b>Tier 3+ 하이엔드 침대 & 설비</b>를 세팅해 <b>럭셔리 ★${reqStars}</b>를 달성하세요!
            </div>
          ` : ''}
        </div>
        ${canContract ? `
          <button type="button" data-sign-cand="${idx}" class="jelly-action-btn ${hDef.isVipTenant ? 'btn-gold-lip' : 'btn-coral-lip'} w-full py-2 !text-[12px]">
            ${createCustomSVGIcon('contract_scroll', 15)}
            <span>${hDef.isVipTenant ? '👑 VIP 고액 입주 계약 체결!' : '입주 계약 체결'}</span>
          </button>
        ` : `
          <button type="button" data-goto-room-furn="${recruitRoomTarget.id}" class="jelly-action-btn btn-sky-lip w-full py-1.5 !text-[11.5px]">
            <span>🛋️ 가구 세팅으로 ★${reqStars} 맞추기</span>
          </button>
        `}
      </div>
    `;
  }).join('');

  dom.recCardsGrid.innerHTML = roomSummaryBanner + cardsHtml;

  dom.recCardsGrid.querySelectorAll('[data-goto-room-furn]').forEach((btn) => {
    btn.addEventListener('click', () => {
      dom.recruitModal?.classList.add('hidden');
      if (focusedRoomId !== recruitRoomTarget.id) {
        focusCameraOnRoom(recruitRoomTarget.id);
      }
      focusRevealState.revealed = true;
      renderFocusedRoomInspector();
      syncTopBarsByMode();
    });
  });

  dom.recCardsGrid.querySelectorAll('[data-sign-cand]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cand = recruitCandidates[Number(btn.getAttribute('data-sign-cand'))];
      if (!cand || !recruitRoomTarget) return;
      const hDef = HOUSEHOLD_TYPES[cand.type];
      const reqStars = hDef?.minLuxuryStars || 1;
      if (calcRoomLuxuryStars(recruitRoomTarget) < reqStars) {
        showToast(`럭셔리 ★${reqStars} 이상 가구 세팅이 필요합니다!`, 'coral');
        return;
      }
      recruitRoomTarget.household = {
        type: cand.type,
        familyName: cand.familyName,
        maxBudget: cand.maxBudget,
        happiness: hDef?.isVipTenant ? 88 : 65
      };
      recruitRoomTarget.rentTimer = 4.0;
      dom.recruitModal?.classList.add('hidden');
      syncBuildingResidents3D(recruitRoomTarget.lotId);
      updateTopHUDTargets();
      if (focusRevealState.revealed) renderFocusedRoomInspector();
      syncTopBarsByMode();
      showToast(`${recruitRoomTarget.name}호에 [${cand.familyName}] 입주 계약 완료! (한도 ${cand.maxBudget}만)`, 'gold');
      saveGameState();
    });
  });
}

// --------------------- 외곽 신규 부지 매입 & 착공 모달 ---------------------
function openLotDevModal(lotId) {
  const lot = state.lots.find((l) => l.lotId === lotId);
  if (!lot || !dom.devCardsGrid) return;
  closeAllModalsImmediate('lot-dev-modal');
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
// 15B. [핵심 개편 6 · 10 · 11] 외곽 해안 점프 · 만수르 머니건(MAKE IT RAIN!) · 4단계 행복도 마일스톤 & 황금 동상
// =========================================================
function ensureFirstFloorShopOverlayBadge(shopId) {
  if (!dom.shopsLayer) return;
  const tpl = (window.FIRST_FLOOR_SHOPS_TEMPLATE || []).find((s) => s.shopId === shopId);
  if (!tpl) return;

  let el = shopOverlayEls[shopId];
  if (!el) {
    el = document.createElement('button');
    el.type = 'button';
    el.className = 'shop-float-badge owned-shop pointer-events-auto';
    el.addEventListener('click', () => focusCameraOnFirstFloorShop(shopId));
    dom.shopsLayer.appendChild(el);
    shopOverlayEls[shopId] = el;
  }
  const stats = calcFirstFloorShopStats(shopId);
  el.innerHTML = `${createCustomSVGIcon(tpl.svgIcon, 16)}<span>${tpl.name}</span><span class="text-[#15803D]">+${stats.cycleRev}만</span>`;
}

function jumpToScenicDriveZone() {
  if (!driveState.active) {
    enterDriveMode();
  }
  // 빨간 철제 아치형 다리(Red Steel Arch Bridge) 정면 진입 차선에 정렬해 1인칭·3인칭 모두 다리와 부스트 코인이 한눈에 펼쳐지도록 세팅!
  driveState.x = 15.8;
  driveState.z = 50.2;
  driveState.y = 0.24;
  driveState.heading = -Math.PI * 0.5;
  driveState.waypointIdx = 7;
  driveState.autoCruise = true;
  driveState.speed = 11.2;
  if (driveState.carRootGroup) {
    driveState.carRootGroup.position.set(driveState.x, driveState.y, driveState.z);
    driveState.carRootGroup.rotation.y = driveState.heading;
  }
  const fwdX = Math.sin(driveState.heading);
  const fwdZ = Math.cos(driveState.heading);
  if (driveState.cockpitView) {
    driveState.camCurrentPos.set(driveState.x + fwdX * 0.38, 1.58, driveState.z + fwdZ * 0.38);
    driveState.camCurrentLook.set(driveState.x + fwdX * 16.5, 1.12, driveState.z + fwdZ * 16.5);
  } else {
    driveState.camCurrentPos.set(driveState.x - fwdX * 6.2, 2.72, driveState.z - fwdZ * 6.2);
    driveState.camCurrentLook.set(driveState.x + fwdX * 8.5, 1.45, driveState.z + fwdZ * 8.5);
  }
  driveCamera.position.copy(driveState.camCurrentPos);
  driveCamera.lookAt(driveState.camCurrentLook);
  playSupercarHornSound(state.garage?.currentCar || 'car_supercar');
  syncDriveTopBadges();
  updateDriveShopProximityUI();
  showToast('해안 레드아치교 & 푸드트럭 코스 진입!', 'sky');
}

function create3DMoneyGunMesh() {
  const gun = new THREE.Group();
  // 슈프림 스타일 24K 순금 머니건 본체 + 장전된 오만원권/100달러 지폐 뭉치 + 크라운 엠블럼
  gun.add(createRoundedToyMesh(0.24, 0.28, 0.72, MAT.pureGold24k, 0, 0.16, -0.08, 0.04));
  gun.add(createRoundedToyMesh(0.16, 0.34, 0.2, MAT.pureGold24k, 0, -0.1, 0.14, 0.04));
  gun.add(createRoundedToyMesh(0.08, 0.14, 0.16, MAT.walnutTrim, 0, -0.02, 0.0, 0.02));
  // 총구 배출 슬릿
  gun.add(createRoundedToyMesh(0.2, 0.05, 0.06, MAT.castIron, 0, 0.18, -0.45, 0.01));
  // 상단 오픈 챔버 속 지폐 다발
  const stackMat = new THREE.MeshStandardMaterial({
    map: REAL_TEX.bills.krw50k || null,
    color: 0xFFFDF5,
    roughness: 0.42
  });
  gun.add(createRoundedToyMesh(0.19, 0.12, 0.42, stackMat, 0, 0.31, -0.1, 0.02));
  // 측면 크라운 골드 디테일
  const gem = new THREE.Mesh(GEO.sphere, MAT.carClearRed);
  gem.scale.setScalar(0.08);
  gem.position.set(0.13, 0.18, -0.08);
  const gem2 = gem.clone();
  gem2.position.x = -0.13;
  gun.add(gem, gem2);
  return gun;
}

function playMoneyGunFlutterSFX() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!window._landlordAudioCtx) window._landlordAudioCtx = new AC();
    const ctx = window._landlordAudioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    // 촤르르륵!! 고속 지폐 발사 퍼커션 사운드
    for (let i = 0; i < 14; i++) {
      const t0 = now + i * 0.055;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(620 + (i % 4) * 140, t0);
      osc.frequency.exponentialRampToValueAtTime(210, t0 + 0.042);
      g.gain.setValueAtTime(0.09, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.048);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.05);
    }

    // 황금 팡파르 코드
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, idx) => {
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.type = 'sine';
      o2.frequency.value = freq;
      const st = now + 0.08 + idx * 0.07;
      g2.gain.setValueAtTime(0.11, st);
      g2.gain.exponentialRampToValueAtTime(0.001, st + 0.42);
      o2.connect(g2);
      g2.connect(ctx.destination);
      o2.start(st);
      o2.stop(st + 0.45);
    });
  } catch (e) {}
}

let sharedBillPlaneGeo = null;
let sharedUsdBillMat = null;
let sharedKrwBillMat = null;

function spawnSingleFlutterBill3D(originX, originY, originZ, dirX, dirZ, spread = 1.0, allowCoins = true) {
  const cap = makeItRainState.maxBillCap || 195;
  while (makeItRainState.bills.length >= cap) {
    const oldest = makeItRainState.bills.shift();
    if (oldest?.mesh) scene.remove(oldest.mesh);
  }

  const isCoin = allowCoins && Math.random() < 0.24;
  let mesh;
  if (typeof POPMART_ASSETS !== 'undefined' && POPMART_ASSETS.moneyRainMats && POPMART_ASSETS.moneyRainMats.length === 4) {
    if (!POPMART_ASSETS.sharedCurrencyGeo) {
      POPMART_ASSETS.sharedCurrencyGeo = new THREE.PlaneGeometry(0.76, 0.76);
    }
    const matIdx = isCoin
      ? (Math.random() < 0.72 ? 2 : 3)
      : (Math.random() < 0.62 ? 0 : 1);
    mesh = new THREE.Mesh(POPMART_ASSETS.sharedCurrencyGeo, POPMART_ASSETS.moneyRainMats[matIdx]);
    mesh.scale.setScalar(isCoin ? (0.82 + Math.random() * 0.28) : (0.95 + Math.random() * 0.35));
  } else if (isCoin) {
    mesh = new THREE.Mesh(GEO.coin, MAT.pureGold24k);
    mesh.scale.setScalar(0.95 + Math.random() * 0.35);
  } else {
    if (!sharedBillPlaneGeo) sharedBillPlaneGeo = new THREE.PlaneGeometry(0.68, 0.32);
    const useUsd = Math.random() < 0.42;
    if (useUsd) {
      if (!sharedUsdBillMat || (REAL_TEX.bills.usd100 && !sharedUsdBillMat.map)) {
        sharedUsdBillMat = new THREE.MeshStandardMaterial({
          map: REAL_TEX.bills.usd100 || null,
          color: REAL_TEX.bills.usd100 ? 0xFFFFFF : 0xBBF7D0,
          roughness: 0.42,
          metalness: 0.06,
          side: THREE.DoubleSide
        });
      }
      mesh = new THREE.Mesh(sharedBillPlaneGeo, sharedUsdBillMat);
    } else {
      if (!sharedKrwBillMat || (REAL_TEX.bills.krw50k && !sharedKrwBillMat.map)) {
        sharedKrwBillMat = new THREE.MeshStandardMaterial({
          map: REAL_TEX.bills.krw50k || null,
          color: REAL_TEX.bills.krw50k ? 0xFFFFFF : 0xFDE68A,
          roughness: 0.42,
          metalness: 0.06,
          side: THREE.DoubleSide
        });
      }
      mesh = new THREE.Mesh(sharedBillPlaneGeo, sharedKrwBillMat);
    }
  }

  mesh.position.set(
    originX + (Math.random() - 0.5) * 0.45,
    originY + (Math.random() - 0.5) * 0.25,
    originZ + (Math.random() - 0.5) * 0.45
  );
  mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
  scene.add(mesh);

  const speed = (6.8 + Math.random() * 6.5) * spread;
  const jitterAng = (Math.random() - 0.5) * 1.25;
  const cosA = Math.cos(jitterAng);
  const sinA = Math.sin(jitterAng);
  const vx = (dirX * cosA - dirZ * sinA) * speed;
  const vz = (dirX * sinA + dirZ * cosA) * speed;

  const floorY = fpState.active
    ? (fpState.mode === 'shop' ? FP_STAGE_ORIGIN.y + 0.05 : (fpState.bounds.eyeY - 1.56))
    : 0.31;

  makeItRainState.bills.push({
    mesh,
    isCoin,
    vx,
    vy: 3.4 + Math.random() * 4.2,
    vz,
    floorY,
    swayPhase: Math.random() * Math.PI * 2,
    spinX: (Math.random() - 0.5) * 9.0,
    spinY: (Math.random() - 0.5) * 11.0,
    spinZ: (Math.random() - 0.5) * 8.0,
    landed: false,
    life: 6.8 + Math.random() * 2.2
  });
}

function calcMoneyGunTierCost(tier) {
  if (!tier) return 10;
  const pct = tier.pctOfGold ?? tier.percentOfGold;
  if (pct) {
    return Math.max(tier.minCost || 10, Math.round((state.gold || 0) * pct));
  }
  return tier.fixedCost ?? tier.cost ?? 10;
}

function toggleMoneyGunPopover() {
  const pop = document.getElementById('moneygun-flex-popover');
  if (!pop) {
    triggerMansourMakeItRain();
    return;
  }
  if (!pop.classList.contains('hidden')) {
    closeMoneyGunPopover();
    return;
  }
  closeAllModalsImmediate('moneygun-flex-popover');
  renderMoneyGunPopover();
  pop.classList.remove('hidden');
}

function renderMoneyGunPopover() {
  const listEl = document.getElementById('moneygun-tiers-list') || document.getElementById('moneygun-tier-list');
  if (!listEl) return;
  const tiers = window.MONEYGUN_FLEX_TIERS || [];
  listEl.innerHTML = tiers.map((t) => {
    const pct = t.pctOfGold ?? t.percentOfGold;
    const actualCost = calcMoneyGunTierCost(t);
    const canAfford = (state.gold || 0) >= actualCost;
    const costLabel = pct ? `-${actualCost.toLocaleString()}만 (20%)` : `-${actualCost.toLocaleString()}만`;
    const isAllIn = !!pct;
    const subText = t.subDesc || t.sub || '';
    return `
      <button type="button" data-mg-tier="${t.id}" ${!canAfford ? 'disabled' : ''} class="w-full text-left rounded-2xl p-2.5 border-2 transition-transform active:scale-95 ${!canAfford ? 'opacity-45 cursor-not-allowed bg-[#F3EDE4] border-[#D6C5B5]' : isAllIn ? 'bg-gradient-to-r from-[#FFFBEB] to-[#FEF3C7] border-[#F59E0B] shadow-sm hover:scale-[1.01]' : 'bg-[#FFFDF9] border-[#E8CCB0] hover:border-[#F59E0B]'}">
        <div class="flex items-center justify-between gap-2">
          <span class="font-title text-[12.5px] text-[#3A2E2B]">${t.emoji} ${t.title}</span>
          <span class="px-2 py-0.5 rounded-full font-num text-[11px] ${canAfford ? 'bg-[#FEE2E2] text-[#B91C1C]' : 'bg-[#E5E7EB] text-[#6B7280]'}">${canAfford ? costLabel : '잔액 부족'}</span>
        </div>
        <div class="font-body text-[10.5px] font-bold text-[#69544C] mt-0.5">${subText}</div>
      </button>
    `;
  }).join('');

  listEl.querySelectorAll('[data-mg-tier]').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const tid = btn.getAttribute('data-mg-tier');
      const tier = (window.MONEYGUN_FLEX_TIERS || []).find((x) => x.id === tid);
      if (tier) triggerMoneyGunTier(tier);
    });
  });
}

function triggerMoneyGunTier(tier) {
  const actualCost = calcMoneyGunTierCost(tier);
  if ((state.gold || 0) < actualCost) {
    showToast(`보유자산이 부족합니다! (필요: ${actualCost.toLocaleString()}만)`, 'coral');
    renderMoneyGunPopover();
    return;
  }
  closeMoneyGunPopover();
  triggerMansourMakeItRain({
    cost: actualCost,
    billCount: tier.billCount || 80,
    happyAdd: tier.happyAdd || 15,
    maxHappy: !!tier.maxHappy,
    feverMult: tier.feverMult || 2.0,
    feverSec: tier.feverSec || 30,
    coinBurst: !!tier.coinBurst,
    crowdCheer: !!tier.crowdCheer,
    skyFireworks: !!tier.skyFireworks,
    title: tier.title
  });
}

function triggerMansourMakeItRain(customOpt = null) {
  const opt = customOpt || {
    cost: 50,
    billCount: 80,
    happyAdd: 15,
    maxHappy: false,
    feverMult: 2.0,
    feverSec: 30,
    coinBurst: true,
    crowdCheer: true,
    skyFireworks: false,
    title: '강남 클럽 플렉스'
  };

  if (!spendGold(opt.cost)) return;

  // [요구사항 2] 발사 즉시 상단 자산 숫자가 실시간으로 깎이는 손맛 반영!
  hudAnim.shownGold = state.gold;
  hudAnim.targetGold = state.gold;
  if (dom.hudGold) dom.hudGold.textContent = Math.round(state.gold).toLocaleString();

  playMoneyGunFlutterSFX();
  if (typeof spawnPopMartSkillBurstVFX === 'function') {
    spawnPopMartSkillBurstVFX('moneygun', typeof opt !== 'undefined' ? opt : { billCount: 40, feverMult: 2.0 });
  }

  if (opt.maxHappy) {
    state.townHappinessBoost = 80;
    for (const b of Object.values(state.buildings || {})) {
      for (const rm of (b.rooms || [])) {
        if (rm.household) rm.household.happiness = 100;
      }
    }
  } else {
    state.townHappinessBoost = Math.min(80, (state.townHappinessBoost || 0) + (opt.happyAdd || 15));
    for (const b of Object.values(state.buildings || {})) {
      for (const rm of (b.rooms || [])) {
        if (rm.household) rm.household.happiness = Math.min(100, (rm.household.happiness || 75) + Math.round((opt.happyAdd || 15) * 0.6));
      }
    }
  }
  state.feverTimer = opt.feverSec || 30;
  state.feverPower = opt.feverMult || 2.0;

  document.getElementById('happiness-milestone-modal')?.classList.add('hidden');

  const totalBurstBills = opt.billCount || 80;
  makeItRainState.maxBillCap = Math.min(260, Math.max(100, totalBurstBills + 40));
  makeItRainState.active = true;
  makeItRainState.timer = opt.skyFireworks ? 7.2 : (totalBurstBills >= 150 ? 6.2 : 4.2);
  makeItRainState.spawnAccum = 0;

  const inHarbor = state.activeTownStage === 2 && !!state.harborUnlocked;
  let centerX = inHarbor ? 0.0 : 0.0;
  let centerY = 0.28;
  let centerZ = inHarbor ? 118.5 : 11.8;

  if (fpState.active) {
    if (fpState.leftHandSlot && fpState.rightHandSlot) {
      if (makeItRainState.fpGunL?.parent) makeItRainState.fpGunL.parent.remove(makeItRainState.fpGunL);
      if (makeItRainState.fpGunR?.parent) makeItRainState.fpGunR.parent.remove(makeItRainState.fpGunR);
      const gL = create3DMoneyGunMesh();
      const gR = create3DMoneyGunMesh();
      gL.scale.setScalar(0.95);
      gR.scale.setScalar(0.95);
      fpState.leftHandSlot.add(gL);
      fpState.rightHandSlot.add(gR);
      makeItRainState.fpGunL = gL;
      makeItRainState.fpGunR = gR;
    }
    fpState.cheerTimer = Math.max(fpState.cheerTimer || 0, 6.2);
    fpCamera.getWorldDirection(camDirVec);
    centerX = fpCamera.position.x + camDirVec.x * 1.1;
    centerY = fpCamera.position.y - 0.15;
    centerZ = fpCamera.position.z + camDirVec.z * 1.1;
    for (let i = 0; i < Math.min(120, totalBurstBills); i++) {
      spawnSingleFlutterBill3D(centerX, centerY, centerZ, camDirVec.x, camDirVec.z, 0.85, !!opt.coinBurst);
    }
  } else if (driveState.active) {
    centerX = driveState.x;
    centerY = driveState.y + 1.45;
    centerZ = driveState.z;
    const fwdX = Math.sin(driveState.heading);
    const fwdZ = Math.cos(driveState.heading);
    for (let i = 0; i < Math.min(140, totalBurstBills); i++) {
      spawnSingleFlutterBill3D(centerX, centerY, centerZ, fwdX, fwdZ, 1.15, !!opt.coinBurst);
    }
    spawnShockwaveRing3D(centerX, 0.32, centerZ, 0xFFD700, 7.5);
  } else {
    if (focusedRoomId) exitRoomFocusMode();
    if (focusedShopId || focusedFirstFloorShopId) exitShopFocusMode();

    if (!makeItRainState.avatarGroup) {
      const av = createChibiPerson3D('landlord_avatar');
      av.scale.setScalar(1.22);
      const gunL = create3DMoneyGunMesh();
      gunL.position.set(-0.56, 1.02, 0.34);
      gunL.rotation.x = -0.24;
      const gunR = create3DMoneyGunMesh();
      gunR.position.set(0.56, 1.02, 0.34);
      gunR.rotation.x = -0.24;
      av.add(gunL, gunR);
      scene.add(av);
      makeItRainState.avatarGroup = av;
      makeItRainState.gunL = gunL;
      makeItRainState.gunR = gunR;
    }
    makeItRainState.avatarGroup.visible = true;
    makeItRainState.avatarGroup.position.set(centerX, centerY, centerZ);

    const immediateCount = Math.min(190, totalBurstBills);
    for (let i = 0; i < immediateCount; i++) {
      const ang = (i / Math.max(1, immediateCount)) * Math.PI * 2;
      const skyLift = opt.skyFireworks && i % 2 === 0 ? 7.5 + Math.random() * 5.0 : 1.4;
      const spreadScale = opt.skyFireworks ? 1.55 : (totalBurstBills >= 150 ? 1.25 : 0.95);
      spawnSingleFlutterBill3D(
        centerX + (opt.skyFireworks ? (Math.random() - 0.5) * 14 : 0),
        centerY + skyLift,
        centerZ + (opt.skyFireworks ? (Math.random() - 0.5) * 10 : 0),
        Math.cos(ang),
        Math.sin(ang),
        spreadScale,
        !!opt.coinBurst
      );
    }
    spawnShockwaveRing3D(centerX, 0.34, centerZ, 0xFFD700, opt.skyFireworks ? 13.5 : 8.5);

    if (opt.skyFireworks) {
      playFireworkPopSFX();
      for (let f = 0; f < 4; f++) {
        spawn3DFireworkRocket();
        spawnPoofParticles3D(centerX - 9 + f * 6, 8.5 + (f % 2) * 2.5, centerZ - 2, 0xFFD700, 18);
      }
    }

    const crowdCount = opt.crowdCheer ? 10 : 4;
    while (makeItRainState.crowdActors.length < 10) {
      const idx = makeItRainState.crowdActors.length;
      const roles = ['newlywed', 'streamer', 'developer', 'musician', 'chef', 'florist', 'student', 'elderly', 'barista', 'petlover'];
      const cm = createChibiPerson3D(roles[idx % roles.length], idx + 2);
      scene.add(cm);
      makeItRainState.crowdActors.push({
        mesh: cm,
        idx,
        phase: idx * 0.7
      });
    }
    makeItRainState.crowdActors.forEach((cr, idx) => {
      cr.mesh.visible = idx < crowdCount;
      if (!cr.mesh.visible) return;
      const startAng = Math.PI * 0.12 + (idx / 9) * Math.PI * 0.88 + (idx % 2 === 0 ? -0.25 : 0.25);
      const startDist = 9.5 + (idx % 3) * 2.8;
      const targetDist = 3.4 + (idx % 2) * 1.15;
      cr.mesh.position.set(centerX + Math.cos(startAng) * startDist, 0.26, centerZ + Math.sin(startAng) * startDist);
      cr.targetX = centerX + Math.cos(startAng) * targetDist;
      cr.targetZ = centerZ + Math.sin(startAng) * targetDist;
    });
  }

  const prevMilestonesLen = (state.unlockedMilestones || []).length;
  updateTopHUDTargets();
  const unlockedNewMilestone = (state.unlockedMilestones || []).length > prevMilestonesLen;

  if (!fpState.active && !driveState.active && !unlockedNewMilestone) {
    startSmoothCameraTween(
      new THREE.Vector3(centerX + 14.5, 13.5, centerZ + 22.0),
      new THREE.Vector3(centerX, 1.8, centerZ + 0.8),
      1.52,
      0.55,
      null
    );
  }

  const happyNote = opt.maxHappy ? '행복도 즉시 100% MAX!' : `행복도 +${opt.happyAdd}%`;
  showToast(`💸 [${opt.title}] -${opt.cost.toLocaleString()}만 플렉스! ${happyNote} · ${opt.feverSec}초간 전 수익 ${opt.feverMult}배 피버!`, 'gold');
  saveGameState();
}

function tickMakeItRain(dt, elapsed) {
  if (makeItRainState.active) {
    makeItRainState.timer -= dt;
    makeItRainState.spawnAccum += dt;

    // 발사 지속 시간 동안 연속 지폐·금화 추가 분사!
    if (makeItRainState.timer > 1.4 && makeItRainState.spawnAccum >= 0.085) {
      makeItRainState.spawnAccum = 0;
      if (fpState.active) {
        fpCamera.getWorldDirection(camDirVec);
        for (let k = 0; k < 4; k++) {
          spawnSingleFlutterBill3D(
            fpCamera.position.x + camDirVec.x * 0.95,
            fpCamera.position.y - 0.14,
            fpCamera.position.z + camDirVec.z * 0.95,
            camDirVec.x,
            camDirVec.z,
            0.8
          );
        }
      } else if (driveState.active) {
        const fx = Math.sin(driveState.heading);
        const fz = Math.cos(driveState.heading);
        for (let k = 0; k < 5; k++) {
          spawnSingleFlutterBill3D(driveState.x, driveState.y + 1.4, driveState.z, fx, fz, 1.1);
        }
      } else if (makeItRainState.avatarGroup) {
        const sweep = Math.sin(elapsed * 5.2) * 1.35;
        makeItRainState.avatarGroup.rotation.y = sweep;
        makeItRainState.avatarGroup.position.y = 0.28 + Math.abs(Math.sin(elapsed * 8.5)) * 0.22;
        const dxL = Math.sin(sweep - 0.45);
        const dzL = Math.cos(sweep - 0.45);
        const dxR = Math.sin(sweep + 0.45);
        const dzR = Math.cos(sweep + 0.45);
        const ax = makeItRainState.avatarGroup.position.x;
        const az = makeItRainState.avatarGroup.position.z;
        for (let k = 0; k < 3; k++) {
          spawnSingleFlutterBill3D(ax - 0.5, 1.75, az + 0.3, dxL, dzL, 0.95);
          spawnSingleFlutterBill3D(ax + 0.5, 1.75, az + 0.3, dxR, dzR, 0.95);
        }
      }
    }

    // 군중 자석 AI 이동 및 폴짝폴짝 점프 환호
    for (const cr of makeItRainState.crowdActors) {
      if (!cr.mesh.visible) continue;
      cr.mesh.position.x = THREE.MathUtils.lerp(cr.mesh.position.x, cr.targetX, Math.min(1, dt * 3.8));
      cr.mesh.position.z = THREE.MathUtils.lerp(cr.mesh.position.z, cr.targetZ, Math.min(1, dt * 3.8));
      cr.mesh.position.y = 0.26 + Math.abs(Math.sin(elapsed * 9.5 + cr.phase)) * 0.46;
      if (makeItRainState.avatarGroup) {
        cr.mesh.lookAt(
          makeItRainState.avatarGroup.position.x,
          cr.mesh.position.y,
          makeItRainState.avatarGroup.position.z
        );
      }
      const ud = cr.mesh.userData;
      if (ud?.armLPivot && ud?.armRPivot) {
        ud.armLPivot.rotation.z = 2.45 + Math.sin(elapsed * 12 + cr.phase) * 0.35;
        ud.armRPivot.rotation.z = -2.45 - Math.cos(elapsed * 12 + cr.phase) * 0.35;
      }
    }

    if (makeItRainState.timer <= 0) {
      makeItRainState.active = false;
      if (makeItRainState.avatarGroup) makeItRainState.avatarGroup.visible = false;
      for (const cr of makeItRainState.crowdActors) cr.mesh.visible = false;
      if (makeItRainState.fpGunL?.parent) makeItRainState.fpGunL.parent.remove(makeItRainState.fpGunL);
      if (makeItRainState.fpGunR?.parent) makeItRainState.fpGunR.parent.remove(makeItRainState.fpGunR);
      makeItRainState.fpGunL = null;
      makeItRainState.fpGunR = null;
      syncHeldHands3DAndChips();
    }
  }

  // 공기 저항 & 낙엽처럼 하늘하늘 나부끼며 바닥에 수북이 쌓이는 3D 지폐 물리 업데이트
  for (let i = makeItRainState.bills.length - 1; i >= 0; i--) {
    const b = makeItRainState.bills[i];
    b.life -= dt;
    if (b.life <= 0) {
      scene.remove(b.mesh);
      makeItRainState.bills.splice(i, 1);
      continue;
    }
    if (!b.landed) {
      b.vx *= (1 - Math.min(0.9, dt * 2.1));
      b.vz *= (1 - Math.min(0.9, dt * 2.1));
      b.vy -= (b.isCoin ? 11.5 : 5.4) * dt;
      if (!b.isCoin) {
        b.vy = Math.max(b.vy, -2.35);
      }
      const flutterX = b.isCoin ? 0 : Math.sin(elapsed * 6.5 + b.swayPhase) * 1.65;
      const flutterZ = b.isCoin ? 0 : Math.cos(elapsed * 5.8 + b.swayPhase) * 1.45;
      b.mesh.position.x += (b.vx + flutterX) * dt;
      b.mesh.position.y += b.vy * dt;
      b.mesh.position.z += (b.vz + flutterZ) * dt;
      b.mesh.rotation.x += b.spinX * dt;
      b.mesh.rotation.y += b.spinY * dt;
      b.mesh.rotation.z += b.spinZ * dt;

      if (b.mesh.position.y <= b.floorY) {
        b.mesh.position.y = b.floorY + (i % 5) * 0.008;
        b.mesh.rotation.set(-Math.PI * 0.5, 0, b.swayPhase);
        b.landed = true;
      }
    }
  }
}

// --------------------- 4단계 행복도 마일스톤(50% ➔ 75% ➔ 90% ➔ 100%) 3D 영구 진화 & 황금 동상 ---------------------
let milestoneBannerTimeout = null;

function checkAndTriggerHappinessMilestones(currentHappyPct) {
  if (!scene) return;
  if (!Array.isArray(state.unlockedMilestones)) state.unlockedMilestones = [];
  const newlyUnlocked = [];
  for (const ms of (window.HAPPINESS_MILESTONES || [])) {
    if (currentHappyPct >= ms.threshold && !state.unlockedMilestones.includes(ms.threshold)) {
      state.unlockedMilestones.push(ms.threshold);
      newlyUnlocked.push(ms);
    }
  }
  if (newlyUnlocked.length === 0) return;

  state.unlockedMilestones.sort((a, b) => a - b);
  rebuildHappinessMilestones3D();

  // 50% 달성 시 전 호실 창가 발코니 꽃화분 즉시 개화 반영!
  if (newlyUnlocked.some((m) => m.threshold === 50) && state.buildings?.lot_main) {
    for (const rm of state.buildings.lot_main.rooms) {
      rebuildRoom3D('lot_main', rm);
    }
    syncBuildingResidents3D('lot_main');
  }

  // 가장 높은 달성 단계 기준으로 제막식 배너 & 카메라 클로즈업 연출!
  const topMs = newlyUnlocked[newlyUnlocked.length - 1];
  const banner = document.getElementById('milestone-ceremony-banner');
  const bTitle = document.getElementById('ms-banner-title');
  const bSub = document.getElementById('ms-banner-sub');
  const bIco = document.getElementById('ms-banner-ico');
  if (banner && bTitle && bSub) {
    if (bIco) bIco.innerHTML = createCustomSVGIcon(topMs.icon || 'statue_gold', 26);
    bTitle.textContent = `[행복도 ${topMs.threshold}% 달성] ${topMs.title}!`;
    bSub.textContent = `${topMs.rewardDesc} · 마을에 영구 랜드마크가 건설되었습니다!`;
    banner.classList.remove('hidden');
    if (milestoneBannerTimeout) clearTimeout(milestoneBannerTimeout);
    milestoneBannerTimeout = setTimeout(() => banner.classList.add('hidden'), 5200);
  }

  milestoneState.ceremonyActive = true;
  milestoneState.ceremonyTimer = 4.5;
  playFireworkPopSFX();

  if (!fpState.active && !driveState.active && !focusedRoomId && !focusedShopId && !focusedFirstFloorShopId) {
    startSmoothCameraTween(
      new THREE.Vector3(topMs.camPos.x, topMs.camPos.y, topMs.camPos.z),
      new THREE.Vector3(topMs.camLook.x, topMs.camLook.y, topMs.camLook.z),
      topMs.camZoom || 1.45,
      0.7,
      null
    );
  }
  hudAnim.targetNet = calcCycleNetIncome();
  saveGameState();
}

function create24KGoldenLandlordStatue3D() {
  const grp = new THREE.Group();

  // 3단 화이트 마블 & 24K 골드 몰딩 좌대
  grp.add(createRoundedToyMesh(4.4, 0.42, 4.4, MAT.white, 0, 0.21, 0, 0.1));
  grp.add(createRoundedToyMesh(3.6, 0.56, 3.6, MAT.fountainStone, 0, 0.68, 0, 0.1));
  grp.add(createRoundedToyMesh(2.9, 1.35, 2.9, MAT.white, 0, 1.62, 0, 0.12));
  grp.add(createRoundedToyMesh(3.15, 0.18, 3.15, MAT.pureGold24k, 0, 2.34, 0, 0.06));

  // 전면 [THE LEGENDARY LANDLORD] 황금 현판
  const plaqueMat = new THREE.MeshStandardMaterial({
    map: TEX.statuePlaque,
    roughness: 0.28,
    metalness: 0.45
  });
  const plaque = new THREE.Mesh(GEO.quad, plaqueMat);
  plaque.scale.set(2.45, 0.92, 1);
  plaque.position.set(0, 1.62, 1.48);
  grp.add(plaque);

  // 3방향 황금 스포트라이트
  for (let s = 0; s < 3; s++) {
    const ang = (s / 3) * Math.PI * 2 + Math.PI * 0.5;
    const lx = Math.cos(ang) * 1.85;
    const lz = Math.sin(ang) * 1.85;
    grp.add(createRoundedToyMesh(0.32, 0.24, 0.32, MAT.castIron, lx, 0.52, lz, 0.05));
    const bulb = new THREE.Mesh(GEO.sphere, MAT.neonYellow);
    bulb.scale.setScalar(0.24);
    bulb.position.set(lx, 0.68, lz);
    grp.add(bulb);
  }
  const statueLight = new THREE.PointLight(0xFFD700, 2.4, 15);
  statueLight.position.set(0, 5.8, 2.2);
  grp.add(statueLight);

  // 초대형 24K 순금 건물주 조각상 본체 (머리부터 발끝·왕관·머니건까지 100% 눈부신 순금!)
  const hero = createChibiPerson3D('golden_statue_hero', 0);
  hero.userData.isGoldenStatueHero = true;
  hero.scale.setScalar(2.48);
  hero.position.set(0, 2.42, 0);

  const raisedGun = create3DMoneyGunMesh();
  raisedGun.position.set(0.56, 1.28, 0.25);
  raisedGun.rotation.set(-0.68, 0.15, -0.25);
  hero.add(raisedGun);

  // 왼손에는 황금 마스터키 홀딩
  const keyStaff = new THREE.Group();
  keyStaff.position.set(-0.56, 1.05, 0.25);
  keyStaff.add(createRoundedToyMesh(0.1, 0.85, 0.1, MAT.pureGold24k, 0, 0.35, 0, 0.03));
  const keyRing = new THREE.Mesh(GEO.torus, MAT.pureGold24k);
  keyRing.scale.setScalar(0.52);
  keyRing.position.set(0, 0.88, 0);
  keyStaff.add(keyRing);
  hero.add(keyStaff);

  hero.traverse((child) => {
    if (child.isMesh && child.material !== MAT.toonHull && child.geometry !== GEO.ring) {
      child.material = MAT.pureGold24k;
    }
  });
  if (hero.userData?.armRPivot) {
    hero.userData.armRPivot.rotation.z = -2.35;
  }
  grp.add(hero);
  if (typeof attachGoldStatuePopMartSprite3D === 'function') {
    attachGoldStatuePopMartSprite3D(grp, hero);
  }

  // 동상 클릭 시 보너스 코인 샤워가 터지는 넉넉한 히트박스!
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(4.6, 7.6, 4.6),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hit.position.set(0, 3.8, 0);
  hit.userData = { kind: 'goldenStatue' };
  grp.add(hit);
  pickableMeshes.push(hit);

  return grp;
}

function clickGoldenLandlordStatue() {
  if (!milestoneState.statueGroup) return;
  const sx = milestoneState.statueGroup.position.x;
  const sz = milestoneState.statueGroup.position.z;
  playMoneyGunFlutterSFX();
  if (typeof spawnPopMartSkillBurstVFX === 'function') {
    spawnPopMartSkillBurstVFX('moneygun', typeof opt !== 'undefined' ? opt : { billCount: 40, feverMult: 2.0 });
  }
  triggerSquashStretch(milestoneState.statueGroup, 0.85);
  spawnShockwaveRing3D(sx, 0.42, sz, 0xFFD700, 10.5);
  spawnPoofParticles3D(sx, 5.2, sz, 0xFFD700, 22);
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    spawnSingleFlutterBill3D(sx, 4.8, sz, Math.cos(a), Math.sin(a), 0.9);
  }
  const pt = projectWorldToScreen(sx, 4.5, sz);
  addGold(250, pt.x, pt.y);
  spawnJackpotText3D(sx, 6.4, sz, '전설의 성군 동상 축복 +250만!', 'statue_gold');
  showSpeechBubble3D(
    'golden_statue_blessing',
    sx,
    7.2,
    sz,
    '번쩍~!! 전설의 성군 건물주 동상이 황금 축복 코인(+250만)을 내렸습니다!!',
    4.2,
    true
  );
  saveGameState();
}

function rebuildHappinessMilestones3D() {
  if (!scene) return;
  if (milestoneState.group) {
    // 기존 동상 히트박스 제거
    for (let i = pickableMeshes.length - 1; i >= 0; i--) {
      if (pickableMeshes[i]?.userData?.kind === 'goldenStatue') {
        pickableMeshes.splice(i, 1);
      }
    }
    scene.remove(milestoneState.group);
  }

  const grp = new THREE.Group();
  scene.add(grp);
  milestoneState.group = grp;
  milestoneState.swayingBanners = [];
  milestoneState.rooftopActors = [];
  milestoneState.paradeActors = [];
  milestoneState.statueCrowd = [];
  milestoneState.statueGroup = null;
  milestoneState.hotAirBalloon = null;

  const unlocked = state.unlockedMilestones || [];
  if (unlocked.length === 0) return;

  const mainLot = state.lots.find((l) => l.lotId === 'lot_main') || { x: -4.2, z: -6.4 };

  // ==================== [1단계: 행복도 50%] 칭송 현수막 & 가로등 배너 ====================
  if (unlocked.includes(50)) {
    const bMat1 = new THREE.MeshStandardMaterial({ map: TEX.praiseBanner1, roughness: 0.45, side: THREE.DoubleSide });
    const bMat2 = new THREE.MeshStandardMaterial({ map: TEX.praiseBanner2, roughness: 0.45, side: THREE.DoubleSide });

    // 메인 빌딩 정면·측면 대형 칭송 현수막 (전망대 핀과 겹치지 않고 한눈에 문구가 읽히도록 정면 배치 & 사이즈 업!)
    const sideConfigs = [
      { x: mainLot.x - 10.6, y: 9.8, z: mainLot.z + 4.45, rotY: 0.06, mat: bMat1, scale: 1.18 },
      { x: mainLot.x + 10.6, y: 9.8, z: mainLot.z + 4.45, rotY: -0.06, mat: bMat2, scale: 1.18 },
      { x: -11.5, y: 5.15, z: 11.2, rotY: 0.08, mat: bMat1, scale: 0.78 },
      { x: 11.5, y: 5.15, z: 11.2, rotY: -0.08, mat: bMat2, scale: 0.78 }
    ];
    sideConfigs.forEach((cfg, idx) => {
      const piv = new THREE.Group();
      const sc = cfg.scale || 1.0;
      piv.position.set(cfg.x, cfg.y, cfg.z);
      piv.rotation.y = cfg.rotY;
      piv.add(createRoundedToyMesh(4.6 * sc, 0.14 * sc, 0.14 * sc, MAT.pureGold24k, 0, 0, 0, 0.03));
      const cloth = new THREE.Mesh(GEO.quad, cfg.mat);
      cloth.scale.set(4.4 * sc, 2.2 * sc, 1);
      cloth.position.set(0, -1.15 * sc, 0);
      piv.add(cloth);
      grp.add(piv);
      milestoneState.swayingBanners.push({ pivot: piv, baseRotY: cfg.rotY, phase: idx * 1.1 });
    });
  }

  // ==================== [2단계: 행복도 75%] 스트링 라이트 가랜드 · 애드벌룬 · 옥상 루프탑 파티 가든 ====================
  if (unlocked.includes(75)) {
    // 1) 거리 허공 알전구 스트링 라이트 & 삼각 가랜드 플래그
    const flagMats = [MAT.coral, MAT.butter, MAT.mint, MAT.sky, MAT.pinkSoft];
    for (const gz of [4.8, 12.2]) {
      for (let i = 0; i <= 16; i++) {
        const t = i / 16;
        const gx = THREE.MathUtils.lerp(-22.0, 22.0, t);
        const sag = Math.sin(t * Math.PI) * 1.35;
        const gy = 6.8 - sag;
        const bulb = new THREE.Mesh(GEO.sphere, MAT.neonYellow);
        bulb.scale.setScalar(0.22);
        bulb.position.set(gx, gy, gz);
        grp.add(bulb);

        if (i < 16) {
          const tri = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.56, 3), flagMats[i % flagMats.length]);
          tri.rotation.x = Math.PI;
          tri.position.set(gx + 1.35, gy - 0.28, gz);
          grp.add(tri);
        }
      }
    }

    // 2) 하늘에 둥실 떠 있는 "HAPPY MINIMI TOWN" 열기구 애드벌룬
    const balloon = new THREE.Group();
    balloon.position.set(17.5, 25.5, -6.5);
    const envGeo = new THREE.SphereGeometry(2.85, 24, 20);
    const envMat = makeClayMat(0xFF6B8B, { roughness: 0.38 });
    const envMesh = new THREE.Mesh(envGeo, envMat);
    envMesh.scale.set(1.0, 1.22, 1.0);
    balloon.add(envMesh);
    const bandSign = new THREE.Mesh(GEO.quad, new THREE.MeshBasicMaterial({ map: TEX.balloonSign }));
    bandSign.scale.set(4.2, 1.45, 1);
    bandSign.position.set(0, 0.1, 2.86);
    balloon.add(bandSign);
    balloon.add(createRoundedToyMesh(1.35, 0.95, 1.35, MAT.woodWarm, 0, -4.4, 0, 0.08));
    balloon.add(createRoundedToyMesh(0.08, 1.4, 0.08, MAT.pureGold24k, -0.5, -3.5, 0.5, 0.02));
    balloon.add(createRoundedToyMesh(0.08, 1.4, 0.08, MAT.pureGold24k, 0.5, -3.5, 0.5, 0.02));
    grp.add(balloon);
    milestoneState.hotAirBalloon = balloon;

    // 3) 메인 빌딩 옥상 '루프탑 파티 가든(인조잔디 · 자쿠지 풀 · BBQ 그릴 · 파라솔 테이블 · 파티 주민)'
    const roofY = 22.92;
    const rg = new THREE.Group();
    rg.position.set(mainLot.x, roofY, mainLot.z);
    // 에메랄드 인조잔디 데크
    rg.add(createRoundedToyMesh(28.5, 0.18, 7.6, MAT.cloverGreen, 0, 0.09, -0.3, 0.08));
    // 옥상 안전 유리 난간
    rg.add(createRoundedToyMesh(28.8, 0.95, 0.12, MAT.partitionGlass, 0, 0.55, 3.6, 0.03, false, false, false));
    // 스파클링 루프탑 자쿠지 미니 풀장
    rg.add(createRoundedToyMesh(6.2, 0.72, 3.8, MAT.white, -8.5, 0.38, -0.4, 0.12));
    const poolWater = createRoundedToyMesh(5.5, 0.58, 3.1, MAT.screenCyan, -8.5, 0.48, -0.4, 0.08);
    rg.add(poolWater);
    // 레드 브릭 & 차콜 바비큐 그릴
    rg.add(createRoundedToyMesh(2.2, 1.15, 1.2, MAT.roofBrickCoral, 8.8, 0.58, -1.2, 0.08));
    rg.add(createRoundedToyMesh(1.8, 0.22, 0.95, MAT.castIron, 8.8, 1.2, -1.2, 0.04));
    rg.add(createRoundedToyMesh(1.4, 0.12, 0.65, MAT.ovenFire, 8.8, 1.32, -1.2, 0.03));
    // 루프탑 파라솔 칵테일 테이블 2세트
    for (const tx of [-1.8, 3.6]) {
      const pSet = createGreenParasolTableSet3D(true);
      pSet.position.set(tx, 0.16, -0.35);
      rg.add(pSet);
    }
    // 옥상에서 신나게 춤추며 파티하는 입주민 4명
    const partyRoles = ['streamer', 'musician', 'newlywed', 'developer'];
    [-8.5, -3.2, 2.2, 7.4].forEach((px, idx) => {
      const pActor = createChibiPerson3D(partyRoles[idx], idx + 4);
      pActor.position.set(px, idx === 0 ? 0.52 : 0.18, idx === 0 ? -0.4 : 0.65);
      rg.add(pActor);
      milestoneState.rooftopActors.push({ mesh: pActor, baseY: pActor.position.y, phase: idx * 1.3 });
    });
    grp.add(rg);
  }

  // ==================== [3단계: 행복도 90%] VIP 레드카펫 & 거리 퍼레이드 행진 & 3D 불꽃놀이 ====================
  if (unlocked.includes(90)) {
    // 1) 메인 빌딩 정문 VIP 레드카펫 & 황금 벨벳 차단봉(Stanchions)
    const entX = mainLot.x;
    const entZ = mainLot.z + 5.6;
    grp.add(createRoundedToyMesh(4.2, 0.08, 5.2, MAT.supercarRed, entX, 0.3, entZ, 0.04));
    grp.add(createRoundedToyMesh(4.45, 0.05, 5.4, MAT.pureGold24k, entX, 0.27, entZ, 0.04));
    for (const szOff of [-1.8, 0.0, 1.8]) {
      for (const sxSide of [-2.15, 2.15]) {
        const px = entX + sxSide;
        const pz = entZ + szOff;
        grp.add(createRoundedToyMesh(0.14, 1.12, 0.14, MAT.pureGold24k, px, 0.82, pz, 0.04));
        const topBall = new THREE.Mesh(GEO.sphere, MAT.pureGold24k);
        topBall.scale.setScalar(0.24);
        topBall.position.set(px, 1.44, pz);
        grp.add(topBall);
        if (szOff < 1.8) {
          grp.add(createRoundedToyMesh(0.09, 0.09, 1.8, MAT.supercarRed, px, 1.16, pz + 0.9, 0.03));
        }
      }
    }

    // 2) 고깔모자 & 컬러 풍선을 든 5인 거리 찬양 퍼레이드 행진단!
    const balloonMats = [MAT.coral, MAT.neonYellow, MAT.mint, MAT.sky, MAT.pinkSoft];
    for (let p = 0; p < 5; p++) {
      const marcher = createChibiPerson3D(['musician', 'streamer', 'florist', 'student', 'newlywed'][p], p + 1);
      // 머리 위 파티 고깔모자 + 손에 든 컬러 풍선
      const coneHat = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.52, 14), balloonMats[p]);
      coneHat.position.set(0, 2.38, 0);
      marcher.add(coneHat);

      const bString = createRoundedToyMesh(0.03, 1.25, 0.03, MAT.white, 0.52, 1.85, 0.15, 0.01);
      const bSphere = new THREE.Mesh(GEO.sphere, balloonMats[(p + 2) % 5]);
      bSphere.scale.set(0.58, 0.68, 0.58);
      bSphere.position.set(0.52, 2.55, 0.15);
      marcher.add(bString, bSphere);

      grp.add(marcher);
      milestoneState.paradeActors.push({
        mesh: marcher,
        offset: p * 3.1
      });
    }
  }

  // ==================== [4단계: 행복도 100% MAX] 광장 중앙 초대형 24K 순금 건물주 동상 & 카메라 플래시 인파 ====================
  if (unlocked.includes(100)) {
    const stX = 0.0;
    const stZ = 21.8; // 중앙 분수대 바로 앞 남측 로얄 플라자 포컬 포인트!
    const statue = create24KGoldenLandlordStatue3D();
    statue.position.set(stX, 0.26, stZ);
    grp.add(statue);
    milestoneState.statueGroup = statue;

    // 동상 주변에 모여 박수치고 인증샷 플래시(번쩍!)를 터뜨리는 6명의 주민들
    for (let c = 0; c < 6; c++) {
      const ang = -Math.PI * 0.15 + (c / 5) * Math.PI * 1.3;
      const dist = 3.35 + (c % 2) * 0.55;
      const cx = stX + Math.cos(ang) * dist;
      const cz = stZ + Math.sin(ang) * dist;
      const fan = createChibiPerson3D(['newlywed', 'chef', 'developer', 'streamer', 'barista', 'petlover'][c], c + 6);
      fan.position.set(cx, 0.26, cz);
      fan.lookAt(stX, 0.26, stZ);
      grp.add(fan);
      milestoneState.statueCrowd.push({ mesh: fan, wx: cx, wz: cz, phase: c * 1.05 });
    }
  }
}

function playFireworkPopSFX() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!window._landlordAudioCtx) window._landlordAudioCtx = new AC();
    const ctx = window._landlordAudioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    // 피유우웅~ 상승 휘슬 + 펑! 스파클
    const whistle = ctx.createOscillator();
    const wg = ctx.createGain();
    whistle.type = 'sine';
    whistle.frequency.setValueAtTime(360, now);
    whistle.frequency.exponentialRampToValueAtTime(1180, now + 0.34);
    wg.gain.setValueAtTime(0.06, now);
    wg.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    whistle.connect(wg);
    wg.connect(ctx.destination);
    whistle.start(now);
    whistle.stop(now + 0.38);

    const pop = ctx.createOscillator();
    const pg = ctx.createGain();
    pop.type = 'triangle';
    pop.frequency.setValueAtTime(210, now + 0.36);
    pop.frequency.exponentialRampToValueAtTime(52, now + 0.58);
    pg.gain.setValueAtTime(0.16, now + 0.36);
    pg.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    pop.connect(pg);
    pg.connect(ctx.destination);
    pop.start(now + 0.36);
    pop.stop(now + 0.62);
  } catch (e) {}
}

function spawn3DFireworkRocket() {
  if (milestoneState.fireworks.length >= 4) return;
  const colors = [0xFFD93D, 0xFF6B8B, 0x38E54D, 0x38BDF8, 0xC084FC];
  const hex = colors[Math.floor(Math.random() * colors.length)];
  const rx = -18 + Math.random() * 36;
  const rz = -12 + Math.random() * 24;
  let fwMat = PARTICLE_MAT_CACHE.get(hex);
  if (!fwMat) {
    fwMat = makeClayMat(hex, { emissive: hex, emissiveIntensity: 1.1 });
    PARTICLE_MAT_CACHE.set(hex, fwMat);
  }
  const rocket = new THREE.Mesh(GEO.sphere, fwMat);
  rocket.scale.setScalar(0.36);
  rocket.position.set(rx, 4.0, rz);
  scene.add(rocket);
  milestoneState.fireworks.push({
    mesh: rocket,
    hex,
    vy: 24 + Math.random() * 6,
    targetY: 24 + Math.random() * 8
  });
}

function tickMilestones3D(dt, elapsed) {
  if (milestoneState.ceremonyActive) {
    milestoneState.ceremonyTimer -= dt;
    if (milestoneState.ceremonyTimer <= 0) {
      milestoneState.ceremonyActive = false;
    }
  }

  // 50% 현수막 살랑살랑 흔들림
  for (const sb of milestoneState.swayingBanners) {
    sb.pivot.rotation.z = Math.sin(elapsed * 2.4 + sb.phase) * 0.06;
    sb.pivot.rotation.y = sb.baseRotY + Math.cos(elapsed * 1.8 + sb.phase) * 0.05;
  }

  // 75% 열기구 둥실둥실 & 루프탑 파티 주민 댄스
  if (milestoneState.hotAirBalloon) {
    milestoneState.hotAirBalloon.position.y = 25.5 + Math.sin(elapsed * 1.2) * 1.15;
    milestoneState.hotAirBalloon.rotation.y = Math.sin(elapsed * 0.5) * 0.24;
  }
  for (const ra of milestoneState.rooftopActors) {
    ra.mesh.position.y = ra.baseY + Math.abs(Math.sin(elapsed * 6.5 + ra.phase)) * 0.28;
    ra.mesh.rotation.y = Math.sin(elapsed * 2.2 + ra.phase) * 0.65;
  }

  // 90% 거리 퍼레이드 행진 & 하늘 3D 불꽃놀이 발사!
  const unlocked = state.unlockedMilestones || [];
  if (unlocked.includes(90)) {
    milestoneState.paradeActors.forEach((pa, idx) => {
      const span = 44.0;
      const prog = ((elapsed * 3.2 + pa.offset) % span) / span;
      const px = THREE.MathUtils.lerp(-22.0, 22.0, prog);
      const pz = 9.4 + Math.sin(prog * Math.PI * 4) * 0.55;
      pa.mesh.position.set(px, 0.26 + Math.abs(Math.sin(elapsed * 8.0 + idx)) * 0.22, pz);
      pa.mesh.rotation.y = Math.PI * 0.5;
    });

    milestoneState.fireworkTimer -= dt;
    if (milestoneState.fireworkTimer <= 0) {
      milestoneState.fireworkTimer = 1.65 + Math.random() * 1.2;
      if (!fpState.active && !focusedRoomId && !focusedShopId && !focusedFirstFloorShopId) {
        spawn3DFireworkRocket();
      }
    }
  }

  for (let i = milestoneState.fireworks.length - 1; i >= 0; i--) {
    const fw = milestoneState.fireworks[i];
    fw.mesh.position.y += fw.vy * dt;
    if (fw.mesh.position.y >= fw.targetY) {
      const bx = fw.mesh.position.x;
      const by = fw.mesh.position.y;
      const bz = fw.mesh.position.z;
      scene.remove(fw.mesh);
      milestoneState.fireworks.splice(i, 1);
      spawnPoofParticles3D(bx, by, bz, fw.hex, 20);
      spawnPoofParticles3D(bx, by, bz, 0xFFFDF7, 8);
    }
  }

  // 100% 황금 동상 후광 파티클 & 주민 인증샷 카메라 플래시(번쩍!)
  if (unlocked.includes(100) && milestoneState.statueGroup) {
    milestoneState.flashTimer -= dt;
    for (const fan of milestoneState.statueCrowd) {
      fan.mesh.position.y = 0.26 + Math.abs(Math.sin(elapsed * 6.8 + fan.phase)) * 0.22;
    }
    if (milestoneState.flashTimer <= 0) {
      milestoneState.flashTimer = 0.95 + Math.random() * 0.85;
      const pick = milestoneState.statueCrowd[Math.floor(Math.random() * milestoneState.statueCrowd.length)];
      if (pick && !fpState.active && !focusedRoomId) {
        spawnShockwaveRing3D(pick.wx, 1.55, pick.wz, 0xFFFFFF, 2.2);
        spawnPoofParticles3D(
          milestoneState.statueGroup.position.x + (Math.random() - 0.5) * 1.8,
          4.8 + Math.random() * 1.6,
          milestoneState.statueGroup.position.z + (Math.random() - 0.5) * 1.8,
          0xFFD700,
          4
        );
      }
    }
  }
}

function openHappinessMilestoneModal() {
  renderHappinessMilestoneModal();
  document.getElementById('happiness-milestone-modal')?.classList.remove('hidden');
}

function renderHappinessMilestoneModal() {
  const pct = calcAvgHappiness();
  const unlocked = state.unlockedMilestones || [];
  const pctChip = document.getElementById('ms-modal-pct-chip');
  const titleChip = document.getElementById('ms-modal-title-chip');
  const gaugeFill = document.getElementById('ms-modal-gauge-fill');
  const listEl = document.getElementById('ms-cards-list');

  if (pctChip) pctChip.textContent = `현재 행복도 ${pct}%`;
  if (titleChip) titleChip.classList.toggle('hidden', !unlocked.includes(100));
  if (gaugeFill) gaugeFill.style.width = `${pct}%`;
  if (!listEl) return;

  listEl.innerHTML = (window.HAPPINESS_MILESTONES || []).map((ms) => {
    const done = unlocked.includes(ms.threshold);
    return `
      <div class="diary-card flex items-center justify-between gap-3 ${done ? '!border-[#38E54D] !bg-[#F4FDF7]' : ''}">
        <div class="flex items-start gap-3 min-w-0">
          <div class="w-11 h-11 rounded-2xl bg-[#FFFDF7] border-2 border-[#E8CCB0] flex items-center justify-center shrink-0">
            ${createCustomSVGIcon(ms.icon || 'statue_gold', 26)}
          </div>
          <div class="min-w-0 space-y-0.5">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-title text-[14.5px] text-[#3A2E2B]">${ms.title}</span>
              <span class="kw-chip tone-${done ? 'mint' : ms.tone}">${done ? '진화 완료!' : `행복도 ${ms.threshold}%`}</span>
            </div>
            <div class="font-title text-[12px] text-[#D6384C]">${ms.rewardDesc}</div>
            <div class="font-body text-[11.5px] font-semibold text-[#5C4942]">${ms.detailDesc}</div>
          </div>
        </div>
        ${done
          ? `<button type="button" data-ms-view="${ms.threshold}" class="tactile-pill-btn tone-gold shrink-0"><span>3D 감상</span></button>`
          : `<span class="kw-chip tone-cream shrink-0">${Math.max(0, ms.threshold - pct)}% 남음</span>`
        }
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('[data-ms-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const th = Number(btn.getAttribute('data-ms-view'));
      const ms = (window.HAPPINESS_MILESTONES || []).find((m) => m.threshold === th);
      document.getElementById('happiness-milestone-modal')?.classList.add('hidden');
      if (ms) {
        if (focusedRoomId) exitRoomFocusMode();
        if (focusedShopId || focusedFirstFloorShopId) exitShopFocusMode();
        startSmoothCameraTween(
          new THREE.Vector3(ms.camPos.x, ms.camPos.y, ms.camPos.z),
          new THREE.Vector3(ms.camLook.x, ms.camLook.y, ms.camLook.z),
          ms.camZoom || 1.45,
          0.6,
          null
        );
      }
    });
  });
}

// =========================================================
// 16. 시뮬레이션 루프 · 롤링 넘버 HUD · 3D 오버레이 무겹침 투영
// =========================================================
function tickSimulationEconomyAndCrises(dt) {
  // 골든벨(2.5배) & 만수르 머니건(3.0배) 피버 타임 카운트다운 및 상단 HUD 동기화
  if ((state.feverTimer || 0) > 0) {
    const prevActive = state.feverTimer > 0;
    state.feverTimer = Math.max(0, state.feverTimer - dt);
    if (dom.hudFeverPill) {
      dom.hudFeverPill.classList.toggle('hidden', state.feverTimer <= 0 || !!duelState.active);
    }
    if (dom.hudFeverText && state.feverTimer > 0) {
      const pwr = state.feverPower || 2.5;
      dom.hudFeverText.textContent = pwr >= 5.0
        ? `👑 만수르 올인 슈퍼피버 ${pwr}배! ${Math.ceil(state.feverTimer)}초`
        : pwr >= 3.0
          ? `만수르 머니샤워 피버 ${pwr}배! ${Math.ceil(state.feverTimer)}초`
          : `갓물주 플렉스 피버 ${pwr}배! ${Math.ceil(state.feverTimer)}초`;
    }
    if (prevActive && state.feverTimer <= 0) {
      state.feverPower = 2.5;
      updateTopHUDTargets();
      showToast('피버 타임이 종료되었습니다!', 'sky');
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

  const activeStageNow = state.activeTownStage === 2 && state.harborUnlocked ? 2 : 1;

  for (const b of Object.values(state.buildings)) {
    if (b.lotId === 'lot_harbor_main' && !state.harborUnlocked) continue;
    const lot = state.lots.find((l) => l.lotId === b.lotId);
    if (!lot) continue;
    const lotStage = lot.stage || 1;

    b.shopCycleTimer = (b.shopCycleTimer || 9.0) - dt;
    if (b.shopCycleTimer <= 0) {
      b.shopCycleTimer = 11.0;
      const shopProfit = b.lotId === 'lot_main'
        ? (calcFirstFloorShopStats('shop_mart1f').cycleRev + calcFirstFloorShopStats('shop_wash1f').cycleRev)
        : Math.round(((b.shopsLv.mart || 1) * 15 + (b.shopsLv.wash || 1) * 13) * getFeverMultiplier() * getLegendaryTotalMultiplier());
      if (lotStage === 1 && activeStageNow === 2) {
        addGold(shopProfit);
        hqDividendAccum += shopProfit;
      } else if (lotStage === 2 && activeStageNow === 1) {
        addGold(shopProfit);
      } else if (b.manager.hired || lotStage === 2) {
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
        if (lotStage === 1 && activeStageNow === 2) {
          addGold(rent);
          hqDividendAccum += rent;
        } else if (lotStage === 2 && activeStageNow === 1) {
          addGold(rent);
        } else if (b.manager.hired || lotStage === 2) {
          addGold(rent);
          if (lotStage === 2) {
            spawnRisingGroundCoins3D(lot.x + rm.lx, rm.ly + 0.35, lot.z + rm.lz + 3.8, 2);
          } else {
            spawnJackpotText3D(lot.x + rm.lx, rm.ly + 2.2, lot.z + rm.lz + 3.5, `자동수금 +${rent}만`, 'manager_cap');
          }
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
      if ((lot.stage || 1) === 1 && activeStageNow === 2) {
        addGold(cat.cycleProfit);
        hqDividendAccum += cat.cycleProfit;
      } else {
        spawnRentBubble(`dev_${dev.lotId}`, lot.x, 3.2, lot.z, cat.cycleProfit, cat.name);
      }
    }
  }

  // 제2마을(트와일라잇 하버) 체류 중: 제1마을 본점 빌딩·편의점·빵집 자동 배당금 실시간 입금 & 상단 미니 토스트 피드백!
  if (activeStageNow === 2 && !titleScreenState.active && !guidedTourState.active) {
    hqDividendTimer += dt;
    if (hqDividendTimer >= 6.8) {
      hqDividendTimer = 0;
      const payout = Math.max(36, Math.round(hqDividendAccum));
      if (hqDividendAccum < 1) {
        addGold(payout);
      }
      hqDividendAccum = 0;
      if (typeof showHqDividendToast === 'function') {
        showHqDividendToast(payout);
      }
    }
  }

  // 현실 시간(Real-Time) 일차 갱신 주기 체크 (2일 차 보너스 & 3일 차 자연 달성 자동 감지)
  if (!titleScreenState.active && typeof checkRealtimeChronicleAutoUnlock === 'function') {
    checkRealtimeChronicleAutoUnlock(dt);
  }
}

function tickAnimationsAndEffects(dt, elapsed, uiDt = dt) {
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

  // 외곽 해안 드라이빙 존 파도 물결 애니메이션
  for (const sw of scenicWaveMeshes) {
    sw.mesh.position.z = sw.baseZ + Math.sin(elapsed * 1.8 + sw.phase) * 0.55;
    sw.mesh.scale.x = 1.0 + Math.cos(elapsed * 2.1 + sw.phase) * 0.08;
  }

  // 제2마을 트와일라잇 하버 3D 럭셔리 요트 잔물결 흔들림 & VIP 주민 프롬나드 산책 애니메이션
  for (const ya of harborYachtActors) {
    if (!ya.mesh) continue;
    ya.mesh.position.y = ya.baseY + Math.sin(elapsed * 1.55 + ya.phase) * 0.14;
    ya.mesh.rotation.z = Math.sin(elapsed * 1.25 + ya.phase) * 0.032;
    ya.mesh.rotation.x = Math.cos(elapsed * 1.05 + ya.phase) * 0.022;
  }
  for (const hw of harborWalkerActors) {
    const ud = hw.mesh?.userData;
    if (!ud) continue;
    const prevX = hw.mesh.position.x;
    const nextX = hw.centerX + Math.sin(elapsed * 0.45 * hw.speed + hw.phase) * hw.range;
    const dx = nextX - prevX;
    hw.mesh.position.x = nextX;
    hw.mesh.position.y = 0.28 + Math.abs(Math.sin(elapsed * 9.5 + hw.phase)) * 0.05;
    if (Math.abs(dx) > 0.0005) {
      hw.mesh.rotation.y = dx >= 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
    }
    const swing = Math.sin(elapsed * 9.5 + hw.phase) * 0.38;
    ud.legL.rotation.x = swing;
    ud.legR.rotation.x = -swing;
    ud.armL.rotation.x = -swing * 0.65;
    ud.armR.rotation.x = swing * 0.65;
  }

  // 캐릭터 발밑 땅바닥 3D 컬러 파동 링 업데이트 (행복/만족 = 골드·민트 링, 라이벌 = 보라·레드 경고 링)
  for (let ai = 0; ai < characterAuraRings.length; ai++) {
    const ar = characterAuraRings[ai];
    if (!ar.owner?.parent) continue;
    ar.owner.userData.auraTimer = Math.max(0, (ar.owner.userData.auraTimer || 0) - dt);
    const isRivalActor = ar.owner.userData.auraHex === 0xA855F7;
    const baseHex = isRivalActor ? 0xA855F7 : ((ai % 2 === 0) ? 0xFBBF24 : 0x34D399);
    ar.mat.color.setHex(ar.owner.userData.auraHex || baseHex);

    // 평소 만족한 주민 발밑에도 은은한 골드·민트 3D 링이 숨쉬듯 퍼지고, 이벤트 시 선명하게 파동!
    const activePulse = ar.owner.userData.auraTimer > 0;
    const pulseWave = Math.sin(elapsed * 4.2 + ai * 0.9);
    ar.mat.opacity = activePulse
      ? (0.52 + pulseWave * 0.22)
      : (0.28 + pulseWave * 0.12);
    ar.ring.scale.setScalar(activePulse ? (1.08 + pulseWave * 0.22) : (0.94 + pulseWave * 0.1));
  }

  // 라이벌 등장/스카우트/경매 진행 중 건물·현장 바닥에 보라·레드 경고 3D 파동 링 주기 발산
  if (rivalState.poach.active || rivalState.bidding.active) {
    guidedTourState.ringPulseAccum = (guidedTourState.ringPulseAccum || 0) + dt;
    if (guidedTourState.ringPulseAccum >= 1.15) {
      guidedTourState.ringPulseAccum = 0;
      if (rivalState.poach.active && rivalState.poach.roomId) {
        const rm = findRoomById(rivalState.poach.roomId);
        const lot = state.lots.find((l) => l.lotId === (rm?.lotId || 'lot_main'));
        if (lot && rm) spawnGroundStatusRing3D(lot.x + rm.lx, 0.28, lot.z + 4.8, 'rival');
      }
      if (rivalState.bidding.active && rivalState.bidding.shopId) {
        const tpl = STANDALONE_SHOPS_TEMPLATE.find((s) => s.shopId === rivalState.bidding.shopId);
        if (tpl) spawnGroundStatusRing3D(tpl.x + 1.65, 0.28, tpl.z + tpl.d * 0.5 + 1.9, 'rival');
      }
    }
  }

  // [실시간 3D 배치 연출 1] 하늘 드롭인 + 착지 쿵! + 젤리 탄성 Squash & Stretch + 별빛 파티클
  for (let i = activeDropBounces.length - 1; i >= 0; i--) {
    const db = activeDropBounces[i];
    if (!db.obj) {
      activeDropBounces.splice(i, 1);
      continue;
    }
    db.elapsed += dt;
    if (db.elapsed <= db.dropDur) {
      const t = db.elapsed / db.dropDur;
      const easeIn = t * t;
      db.obj.position.y = THREE.MathUtils.lerp(db.baseY + 4.8, db.baseY, easeIn);
      db.obj.scale.set(
        db.baseScale.x * (1 - t * 0.08),
        db.baseScale.y * (1 + t * 0.14),
        db.baseScale.z * (1 - t * 0.08)
      );
    } else {
      if (!db.landed) {
        db.landed = true;
        db.obj.position.y = db.baseY;
        playHeavyDropThudSFX();
        spawnPoofParticles3D(db.wx, db.wy + 0.35, db.wz, 0xFFD93D, 12);
        spawnShockwaveRing3D(db.wx, db.wy + 0.08, db.wz, 0x38E54D, 3.4);
      }
      const bt = Math.min(1, (db.elapsed - db.dropDur) / db.bounceDur);
      const jelly = Math.sin(bt * Math.PI * 3.0) * (1 - bt) * 0.26;
      db.obj.scale.set(
        db.baseScale.x * (1 + jelly),
        db.baseScale.y * (1 - jelly * 1.15),
        db.baseScale.z * (1 + jelly)
      );
      if (bt >= 1) {
        db.obj.position.y = db.baseY;
        db.obj.scale.copy(db.baseScale);
        activeDropBounces.splice(i, 1);
      }
    }
  }

  // [실시간 3D 시공 연출 2] 방음 바닥재 격자 타일 촤르륵 깔림 + 뽀얀 먼지 구름 Poof
  for (let i = activeTileAnimations.length - 1; i >= 0; i--) {
    const ta = activeTileAnimations[i];
    ta.elapsed += dt;
    if (ta.elapsed < ta.delay) continue;
    const t = Math.min(1, (ta.elapsed - ta.delay) / 0.28);
    if (!ta.poofed) {
      ta.poofed = true;
      spawnPoofParticles3D(ta.wx, ta.wy, ta.wz, 0xFFFDF7, 4);
    }
    const pop = t < 0.7 ? (t / 0.7) * 1.18 : 1.18 - ((t - 0.7) / 0.3) * 0.18;
    ta.mesh.scale.setScalar(Math.max(0.01, pop));
    if (t >= 1) {
      ta.mesh.scale.setScalar(1);
      activeTileAnimations.splice(i, 1);
    }
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
    if (r.mat) r.mat.opacity = (1 - t) * 0.78;
    if (r.glowMat) r.glowMat.opacity = (1 - t) * 0.26;
    if (t >= 1) {
      scene.remove(r.mesh);
      shockwaveRings.splice(i, 1);
    }
  }

  // 바닥에서 솟아오르는 3D 코인 애니메이션 (수익 발생 인디케이터)
  for (let i = risingGroundCoins.length - 1; i >= 0; i--) {
    const rc = risingGroundCoins[i];
    rc.elapsed += dt;
    const t = Math.min(1, rc.elapsed / rc.duration);
    rc.mesh.position.y += rc.vy * dt * (1 - t * 0.45);
    rc.mesh.rotation.y += dt * 7.2;
    const popScale = t < 0.22 ? (t / 0.22) * 1.05 : 1.05 * (1 - Math.max(0, t - 0.55) / 0.45 * 0.45);
    rc.mesh.scale.setScalar(Math.max(0.1, popScale));
    if (rc.mat) rc.mat.opacity = t < 0.65 ? 1.0 : Math.max(0, 1 - (t - 0.65) / 0.35);
    if (t >= 1) {
      scene.remove(rc.mesh);
      risingGroundCoins.splice(i, 1);
    }
  }

  for (const rb of rentBubbles) {
    if (rb.coin3D && !rb.magnetized) {
      rb.coin3D.rotation.y += dt * 2.8;
      rb.coin3D.position.y = rb.wy + Math.sin(elapsed * 3.5) * 0.16;
    }
  }

  // [2단계 포커스 시퀀스] ① 0.42초 3차 이징 카메라 정중앙 트윈 ➔ 0.18초 무가림 클린 감상 홀드 ➔ ② 비가림 컨트롤 독 슬라이드업!
  if (!driveState.active && camTween.active) {
    camTween.elapsed += uiDt;
    const rawT = Math.min(1, camTween.elapsed / Math.max(0.12, camTween.duration || 0.42));
    const easeOutCubic = 1 - Math.pow(1 - rawT, 3);
    camera.position.lerpVectors(camTween.startPos, camTween.pos, easeOutCubic);
    controls.target.lerpVectors(camTween.startLook, camTween.look, easeOutCubic);
    camera.zoom = THREE.MathUtils.lerp(camTween.startZoom, camTween.zoom, easeOutCubic);
    camera.updateProjectionMatrix();

    if (rawT >= 1) {
      camTween.active = false;
      if (typeof camTween.onArrive === 'function') {
        const cb = camTween.onArrive;
        camTween.onArrive = null;
        cb();
      }
    }
  }

  if (focusRevealState.pending && !camTween.active) {
    focusRevealState.holdTimer -= uiDt;
    if (focusRevealState.holdTimer <= 0) {
      const fn = focusRevealState.onHoldDone;
      focusRevealState.onHoldDone = null;
      if (typeof fn === 'function') fn();
    }
  }

  if (focusRevealState.tuckTimer > 0) {
    focusRevealState.tuckTimer -= uiDt;
    if (focusRevealState.tuckTimer <= 0) {
      dom.furnitureCatalogSheet?.classList.remove('dock-tucked');
      dom.roomFocusPanel?.classList.remove('dock-tucked');
      dom.shopFocusPanel?.classList.remove('dock-tucked');
    }
  }

  tickMakeItRain(dt, elapsed);
  tickMilestones3D(dt, elapsed);
  tickGuidedSimulationTour(dt, elapsed, uiDt);

  // 상단 미니멀 수첩 인덱스 HUD 롤링 넘버 동기화 (1,250만 · +4.2만/s · ♥ 85%)
  hudAnim.shownGold = THREE.MathUtils.lerp(hudAnim.shownGold, hudAnim.targetGold, Math.min(1, dt * 11));
  hudAnim.shownNet = THREE.MathUtils.lerp(hudAnim.shownNet, hudAnim.targetNet, Math.min(1, dt * 11));
  hudAnim.shownHappy = THREE.MathUtils.lerp(hudAnim.shownHappy, hudAnim.targetHappy, Math.min(1, dt * 9));

  if (dom.hudGold) dom.hudGold.textContent = Math.round(hudAnim.shownGold).toLocaleString();
  if (dom.hudNetIncome) {
    const secRate = Math.max(0.2, hudAnim.shownNet / 6.5);
    dom.hudNetIncome.textContent = `+${secRate.toFixed(1)}만/s`;
  }
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
  const feverShown = !!(dom.hudFeverPill && !dom.hudFeverPill.classList.contains('hidden'));
  const hudW = window.innerWidth < 640 ? window.innerWidth : 550;
  const hudH = (window.innerWidth < 640 ? 190 : 152) + (feverShown ? 44 : 0);
  return x < hudW && y < hudH;
}

function isInBottomRightFabZone(x, y) {
  return x > window.innerWidth - 265 && y > window.innerHeight - 95;
}

// =========================================================
// 16C. [신규 핵심 컨텐츠]
//  - FORBES 대한민국 갓물주 자산 순위 보드 & 실시간 서열 추월 시스템
//  - 숙명의 라이벌 '블랙타워 강 회장' 침공 & 3대 자본력 승부 (스카우트 방어전 · 1:1 입찰 경매 · 해안 레이스 & 더블 골든벨)
//  - 시네마틱 3D 라이브 오프닝 로딩 & 타이틀 스크린 ('갓물주 라이프 : 해피 미니미 타운')
// =========================================================
let forbesRankBannerTimeout = null;

function calcPlayerNetWorthBreakdown() {
  const cash = Math.max(0, Math.round(state.gold || 0));

  // 1) 제1마을 본점 부동산 & 상권 가치 (본점 빌딩·호실·가구·방음·공용인프라·추가부지 + 1층/단독상가)
  let stage1Estate = 650;
  for (const b of Object.values(state.buildings || {})) {
    if (b.lotId === 'lot_harbor_main') continue;
    for (const rm of (b.rooms || [])) {
      if (rm.unlocked) {
        stage1Estate += 110 + (rm.interiorLv || 0) * 85;
        if (rm.soundproofed) stage1Estate += 95;
        if ((rm.giftBonusPct || 0) > 0) stage1Estate += 120;
        if ((rm.poachDefenseBonusPct || 0) > 0) stage1Estate += 260;
        for (const cat of ['bed', 'sofa', 'appliance', 'decor']) {
          const eqId = rm.equippedFurniture?.[cat];
          const fDef = getFurnitureItemDef(cat, eqId);
          if (fDef && fDef.cost > 0) stage1Estate += Math.round(fDef.cost * 1.15);
        }
      }
    }
    for (const [infKey, installed] of Object.entries(b.infra || {})) {
      if (installed && PUBLIC_INFRA_CATALOG[infKey]) {
        stage1Estate += Math.round(PUBLIC_INFRA_CATALOG[infKey].cost * 1.2);
      }
    }
  }
  for (const lot of (state.lots || [])) {
    if (lot.lotId !== 'lot_main' && lot.stage !== 2 && lot.owned) {
      stage1Estate += lot.landPrice || 450;
      if (lot.devType && DEVELOPMENT_CATALOG[lot.devType]) {
        stage1Estate += Math.round(DEVELOPMENT_CATALOG[lot.devType].buildCost * 1.25);
      }
    }
  }
  for (const tpl of (window.FIRST_FLOOR_SHOPS_TEMPLATE || [])) {
    const fst = state.firstFloorShops?.[tpl.shopId];
    for (const upg of (tpl.upgradesCatalog || [])) {
      if (fst?.upgrades?.[upg.id]) stage1Estate += Math.round(upg.cost * 1.25);
    }
  }
  for (const tpl of STANDALONE_SHOPS_TEMPLATE) {
    if ((tpl.stage || 1) !== 1) continue;
    const sst = state.standaloneShops?.[tpl.shopId];
    if (sst?.owned) {
      stage1Estate += Math.round(tpl.buyCost * 1.35);
      if ((sst.auctionBonusPct || 0) > 0) stage1Estate += 420;
      for (const upg of getShopUpgradeCatalogFor(tpl)) {
        if (sst.upgrades?.[upg.id]) stage1Estate += Math.round(upg.cost * 1.25);
      }
    }
  }

  // 2) 제2마을 트와일라잇 하버 해안 리조트 가치 (부티크 호텔·펜트하우스·VIP 인테리어·해안 플래그십 상가 3종)
  let harborResort = 0;
  if (state.harborUnlocked) {
    harborResort += 4200; // 로열 하버 개발권 & 부티크 호텔 본관 감정가
    const hb = state.buildings?.lot_harbor_main;
    if (hb) {
      for (const rm of (hb.rooms || [])) {
        if (rm.unlocked) {
          harborResort += 750 + (rm.interiorLv || 0) * 180;
          if (rm.soundproofed) harborResort += 180;
          for (const cat of ['bed', 'sofa', 'appliance', 'decor']) {
            const eqId = rm.equippedFurniture?.[cat];
            const fDef = getFurnitureItemDef(cat, eqId);
            if (fDef && fDef.cost > 0) {
              harborResort += Math.round(fDef.cost * (fDef.harborTier ? 2.4 : 1.35));
            }
          }
        }
      }
    }
    for (const tpl of STANDALONE_SHOPS_TEMPLATE) {
      if (tpl.stage !== 2) continue;
      const sst = state.standaloneShops?.[tpl.shopId];
      if (sst?.owned) {
        harborResort += Math.round(tpl.buyCost * 3.8);
        if ((sst.auctionBonusPct || 0) > 0) harborResort += 850;
        for (const upg of getShopUpgradeCatalogFor(tpl)) {
          if (sst.upgrades?.[upg.id]) harborResort += Math.round(upg.cost * 2.8);
        }
      }
    }
  }

  // 3) 슈퍼카 차고 & 마리나 3D 럭셔리 요트 선단 감정가
  let vehicles = 45;
  for (const cid of (state.garage?.ownedCars || ['car_scooter'])) {
    const cDef = CAR_CATALOG.find((c) => c.id === cid);
    if (cDef && cDef.cost > 0) vehicles += Math.round(cDef.cost * 1.15);
  }
  if (state.harborUnlocked) {
    vehicles += 1850; // 하버 마리나 요트 계류권 & 기본 크루저 지분
    if (state.standaloneShops?.shop_marina?.owned) vehicles += 1600;
    if (state.standaloneShops?.shop_marina?.upgrades?.upg_crate) vehicles += 3400; // 24K VIP 메가요트
  }

  // 4) 가구 백화점 보유 창고 하이엔드 컬렉션 & 1:1 쇼룸 결투 트로피 & 명성 프리미엄
  let invLuxuryWorth = 0;
  for (const [fId, qty] of Object.entries(state.furnitureInventory || {})) {
    if ((qty || 0) <= 0) continue;
    for (const cat of ['bed', 'sofa', 'appliance', 'decor']) {
      const fDef = getFurnitureItemDef(cat, fId);
      if (fDef && fDef.cost > 0) {
        invLuxuryWorth += Math.round(fDef.cost * 1.2 * qty);
        break;
      }
    }
  }
  stage1Estate += invLuxuryWorth;

  const prestige =
    (state.unlockedMilestones?.length || 0) * 520 +
    (state.rivalWins || 0) * 760 +
    (state.duelTrophies || 0) * 650 +
    (state.goldenKeys || 0) * 140 +
    (state.harborUnlocked ? 1200 : 0);

  const realEstate = stage1Estate;
  const commercial = harborResort;
  const total = Math.round(cash + stage1Estate + harborResort + vehicles + prestige);
  return { cash, realEstate, commercial, stage1Estate, harborResort, vehicles, prestige, total };
}

function getForbesStandings() {
  const breakdown = calcPlayerNetWorthBreakdown();
  const rankersRaw = window.FORBES_RIVAL_RANKERS || [];
  const entries = rankersRaw.map((rk) => {
    let worth = rk.netWorth;
    if (rk.isArchRival) {
      // 강 회장을 참교육할 때마다 강 회장의 블랙타워 지분 가치가 깎여 4위 추월의 발판이 됨! (5위 마 회장 5,100만 위는 유지)
      worth = Math.max(5180, rk.netWorth - (state.rivalKangPenalty || 0));
    }
    return {
      ...rk,
      netWorth: Math.round(worth),
      isMe: false
    };
  });

  entries.push({
    id: 'player_me',
    name: '해피 타운 갓물주 (나)',
    badge: state.vipTitle || '미니미 타운 신예 갓물주',
    titleUnlock: state.vipTitle || '미니미 타운 신예 갓물주',
    netWorth: breakdown.total,
    tone: 'gold',
    avatarRole: 'streamer',
    desc: '실사 베이커리·편의점 상권과 럭셔리 세대 인테리어로 급부상 중인 주인공 건물주',
    isMe: true
  });

  entries.sort((a, b) => {
    if (b.netWorth !== a.netWorth) return b.netWorth - a.netWorth;
    return a.isMe ? -1 : 1;
  });

  entries.forEach((item, idx) => {
    item.liveRank = idx + 1;
  });

  const meEntry = entries.find((e) => e.isMe) || entries[entries.length - 1];
  return { breakdown, entries, myRank: meEntry.liveRank };
}

function updateForbesRankAndHUD(allowCelebration = true) {
  const { breakdown, entries, myRank } = getForbesStandings();

  const rankTextEl = document.getElementById('hud-forbes-rank-text');
  if (rankTextEl) {
    rankTextEl.textContent = `${myRank}위`;
  }
  const subEl = document.getElementById('hud-forbes-worth-sub');
  if (subEl) {
    subEl.textContent = `(${breakdown.total.toLocaleString()}만)`;
  }

  // 타이틀 화면 중에는 초기 순위 기준점만 조용히 동기화
  if (titleScreenState.active) {
    if (typeof state.bestForbesRank !== 'number' || state.bestForbesRank > myRank) {
      state.bestForbesRank = myRank;
    }
    return;
  }

  if (typeof state.bestForbesRank !== 'number') {
    state.bestForbesRank = myRank;
  }

  if (allowCelebration && myRank < state.bestForbesRank) {
    const prevRank = state.bestForbesRank;
    state.bestForbesRank = myRank;

    // 방금 내가 제친 바로 아래 순위 거물(특히 4위 등극 시 블랙타워 강 회장 우선 표시!)
    let overtaken = entries.find((e) => !e.isMe && e.liveRank === myRank + 1);
    const kangEntry = entries.find((e) => e.isArchRival);
    if (kangEntry && prevRank > kangEntry.liveRank - 1 && myRank <= kangEntry.liveRank) {
      overtaken = kangEntry;
    }
    if (!overtaken) {
      overtaken = entries.find((e) => !e.isMe && e.liveRank > myRank) || {
        name: '기존 거물 건물주',
        dividendReward: 200,
        titleUnlock: '대한민국 상위권 갓물주'
      };
    }

    const reward = overtaken.dividendReward || 220;
    if (overtaken.isArchRival) {
      state.vipTitle = (state.rivalWins || 0) > 0 ? '강 회장 참교육자 · 4대 천왕' : '블랙타워 추월 · 4대 천왕';
    } else if (overtaken.titleUnlock) {
      state.vipTitle = overtaken.titleUnlock;
    }

    // 재귀 축하 방지 후 배당금 입금
    state.gold += reward;
    state.stats.totalEarned = (state.stats.totalEarned || 0) + reward;
    hudAnim.targetGold = state.gold;

    playGoldenBellSound();
    const fwCols = [0xFFD93D, 0xFF6B6B, 0x38E54D, 0x4CC2FF, 0xA855F7];
    for (let f = 0; f < 5; f++) {
      spawnPoofParticles3D(-8 + f * 4, 8.5 + (f % 2) * 2.2, 6.0, fwCols[f % fwCols.length], 14);
    }

    const banner = document.getElementById('forbes-rankup-banner');
    const titleEl = document.getElementById('rankup-banner-title');
    const subBannerEl = document.getElementById('rankup-banner-sub');
    if (titleEl) {
      titleEl.textContent = `FORBES RANK UP! '${overtaken.name}'을(를) 제치고 대한민국 자산 순위 ${myRank}위 등극!!`;
    }
    if (subBannerEl) {
      subBannerEl.textContent = `서열 추월 축하 배당금 +${reward.toLocaleString()}만 지급 · 신규 칭호 [${state.vipTitle}] 해금!`;
    }
    if (banner) {
      banner.classList.remove('hidden');
      if (forbesRankBannerTimeout) clearTimeout(forbesRankBannerTimeout);
      forbesRankBannerTimeout = setTimeout(() => banner.classList.add('hidden'), 4800);
    }

    const forbesModal = document.getElementById('forbes-modal');
    if (forbesModal && !forbesModal.classList.contains('hidden')) {
      renderForbesModal();
    }
    saveGameState();
  }
}

function openForbesModal() {
  closeAllModalsImmediate('forbes-modal');
  renderForbesModal();
  document.getElementById('forbes-modal')?.classList.remove('hidden');
}

function renderForbesModal() {
  const { breakdown, entries, myRank } = getForbesStandings();

  const rankChip = document.getElementById('forbes-my-rank-chip');
  if (rankChip) rankChip.textContent = `대한민국 ${myRank}위`;

  const totalEl = document.getElementById('forbes-total-worth');
  if (totalEl) totalEl.textContent = `${breakdown.total.toLocaleString()}만`;

  const titleEl = document.getElementById('forbes-vip-title');
  if (titleEl) titleEl.textContent = state.vipTitle || '미니미 타운 신예 갓물주';

  const kangEntry = entries.find((e) => e.isArchRival);
  const kangBtn = document.getElementById('btn-forbes-challenge-kang');
  if (kangBtn && kangEntry) {
    const lblSpan = kangBtn.querySelector('span:last-child');
    if (lblSpan) lblSpan.textContent = `${kangEntry.liveRank}위 강 회장 승부 도발!`;
  }

  const portGrid = document.getElementById('forbes-portfolio-grid');
  if (portGrid) {
    const items = [
      { label: '보유 현금', val: breakdown.cash, col: '#B45309', bg: '#FEF3C7' },
      { label: '제1마을 본점', val: breakdown.stage1Estate ?? breakdown.realEstate, col: '#1D4ED8', bg: '#DBEAFE' },
      { label: '제2마을 리조트', val: breakdown.harborResort ?? breakdown.commercial, col: '#15803D', bg: '#DCFCE7' },
      { label: '슈퍼카·요트', val: breakdown.vehicles, col: '#BE123C', bg: '#FFE4E6' },
      { label: '명성·칭호', val: breakdown.prestige, col: '#6B21A8', bg: '#F3E8FF' }
    ];
    portGrid.innerHTML = items.map((it) => `
      <div class="rounded-2xl py-2 px-1.5 border border-[#EED6BE]" style="background:${it.bg};">
        <div class="font-title text-[10.5px]" style="color:${it.col};">${it.label}</div>
        <div class="font-num text-[13px] text-[#3A2E2B] mt-0.5">${it.val.toLocaleString()}만</div>
      </div>
    `).join('');
  }

  const listEl = document.getElementById('forbes-ranking-list');
  if (listEl) {
    listEl.innerHTML = entries.map((rk) => {
      const rowCls = rk.isMe
        ? 'diary-card forbes-row-me'
        : rk.isArchRival
          ? 'diary-card forbes-row-kang'
          : 'diary-card';
      const rankBadgeBg = rk.liveRank === 1
        ? 'background:linear-gradient(180deg,#FFE869,#F59E0B);color:#3A2E2B;'
        : rk.liveRank <= 3
          ? 'background:linear-gradient(180deg,#E2E8F0,#94A3B8);color:#1E293B;'
          : rk.isArchRival
            ? 'background:linear-gradient(180deg,#A855F7,#6B21A8);color:#FFFDF7;'
            : 'background:#F7EFE5;color:#5C4942;';

      return `
        <div class="${rowCls} !p-3 flex items-center justify-between gap-2.5">
          <div class="flex items-center gap-2.5 min-w-0 flex-1">
            <div class="w-9 h-9 rounded-xl border-2 border-[#3A2E2B] font-num text-[14px] flex items-center justify-center shrink-0" style="${rankBadgeBg}">
              ${rk.liveRank}위
            </div>
            ${createHouseholdAvatarSVG(rk.avatarRole || 'manager', 44)}
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-title text-[13.5px] sm:text-[14.5px] ${rk.isArchRival ? 'text-[#581C87]' : 'text-[#3A2E2B]'}">${rk.name}</span>
                <span class="kw-chip tone-${rk.tone || 'gold'} !text-[10px] !py-0.5 !px-2">${rk.badge}</span>
              </div>
              <div class="font-body text-[11px] font-semibold text-[#69544C] truncate mt-0.5">${rk.desc}</div>
            </div>
          </div>
          <div class="text-right shrink-0">
            <div class="font-num text-[14.5px] sm:text-[16px] ${rk.isMe ? 'text-[#B45309]' : rk.isArchRival ? 'text-[#7E22CE]' : 'text-[#3A2E2B]'}">
              ${rk.netWorth.toLocaleString()}만
            </div>
            ${rk.isArchRival ? `
              <button type="button" data-forbes-fight-kang="1" class="mt-1 kw-chip tone-coral cursor-pointer !text-[10px] !py-0.5 !px-2">
                ${createCustomSVGIcon('rival_bolt', 12)}<span>승부 도발</span>
              </button>
            ` : `<div class="font-title text-[10px] text-[#8C746A]">총자산 감정가</div>`}
          </div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('[data-forbes-fight-kang]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.getElementById('forbes-modal')?.classList.add('hidden');
        openRivalBattleHubModal();
      });
    });
  }
}

// --------------------- 라이벌 '블랙타워 강 회장' 3D 경매 패들 & 대형 황금 돈가방 메쉬 ---------------------
function createAuctionPaddleTexture(priceStr, isRival = false) {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 192;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = isRival ? '#581C87' : '#FFFBEB';
  ctx.fillRect(0, 0, 256, 192);
  ctx.strokeStyle = isRival ? '#FFD93D' : '#D97706';
  ctx.lineWidth = 14;
  ctx.strokeRect(10, 10, 236, 172);
  ctx.fillStyle = isRival ? '#E9D5FF' : '#9A4E04';
  ctx.font = 'bold 30px Jua, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(isRival ? 'BLACK TOWER' : 'MY BID', 128, 58);
  ctx.fillStyle = isRival ? '#FFD93D' : '#15803D';
  ctx.font = 'bold 54px Jua, sans-serif';
  ctx.fillText(priceStr, 128, 134);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createAuctionPaddle3D(priceStr, isRival = false) {
  const grp = new THREE.Group();
  grp.add(createRoundedToyMesh(0.08, 0.65, 0.08, MAT.woodDark, 0, 0.32, 0, 0.02));
  const tex = createAuctionPaddleTexture(priceStr, isRival);
  const faceMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35 });
  const board = createRoundedToyMesh(0.92, 0.68, 0.1, faceMat, 0, 0.88, 0, 0.04);
  grp.add(board);
  grp.userData = { faceMat };
  return grp;
}

function createGiantGoldenBriefcase3D() {
  const grp = new THREE.Group();
  // 초거대 24K 순금 돈가방 + 다이아몬드 잠금쇠 + 삐져나온 오만원권 지폐 다발!
  grp.add(createRoundedToyMesh(2.55, 1.72, 0.92, MAT.pureGold24k, 0, 0.86, 0, 0.14));
  grp.add(createRoundedToyMesh(2.64, 0.16, 0.98, MAT.chromeAlloy, 0, 0.88, 0, 0.04));
  // 손잡이
  grp.add(createRoundedToyMesh(0.14, 0.42, 0.14, MAT.walnutTrim, -0.42, 1.88, 0, 0.03));
  grp.add(createRoundedToyMesh(0.14, 0.42, 0.14, MAT.walnutTrim, 0.42, 1.88, 0, 0.03));
  grp.add(createRoundedToyMesh(0.98, 0.14, 0.16, MAT.walnutTrim, 0, 2.06, 0, 0.04));
  // 황금 버클 2개
  grp.add(createRoundedToyMesh(0.24, 0.32, 1.02, MAT.white, -0.68, 0.88, 0, 0.04));
  grp.add(createRoundedToyMesh(0.24, 0.32, 1.02, MAT.white, 0.68, 0.88, 0, 0.04));
  // 틈새로 삐져나온 실사 오만원권/달러 지폐!
  const billMat = new THREE.MeshStandardMaterial({
    map: REAL_TEX.bills.krw50k || null,
    color: 0xFFFDF5,
    roughness: 0.42
  });
  const peek1 = createRoundedToyMesh(0.65, 0.08, 0.45, billMat, -0.75, 1.72, 0.25, 0.02);
  peek1.rotation.z = 0.18;
  const peek2 = createRoundedToyMesh(0.65, 0.08, 0.45, billMat, 0.78, 1.72, -0.22, 0.02);
  peek2.rotation.z = -0.2;
  grp.add(peek1, peek2);
  return grp;
}

function openRivalBattleHubModal(defaultTab = 'rival') {
  // [요구사항 4] [🦹‍♂️ 결투] 클릭 시 기존 추상 대결 대신 2개의 모델하우스(내 쇼룸 VS 라이벌/온라인 랭커 쇼룸) 1:1 럭셔리 인테리어 결투 스테이지로 즉시 진입!
  enterShowroomFlexDuel(defaultTab || 'rival');
}

// --------------------- [승부 ①] 우량 세입자 스카우트 방어전 ---------------------
function cleanupRivalPoachEvent() {
  rivalState.poach.active = false;
  rivalState.poach.roomId = null;
  if (rivalState.poach.carMesh) {
    scene.remove(rivalState.poach.carMesh);
    rivalState.poach.carMesh = null;
  }
  if (rivalState.poach.kangMesh) {
    scene.remove(rivalState.poach.kangMesh);
    rivalState.poach.kangMesh = null;
  }
  if (rivalState.poach.pinEl) {
    rivalState.poach.pinEl.remove();
    rivalState.poach.pinEl = null;
  }
  document.getElementById('rival-poach-dock')?.classList.add('hidden');
  syncTopBarsByMode();
}

function startRivalPoachEvent(focusImmediately = true) {
  cleanupShopBiddingWar();
  cleanupRivalPoachEvent();

  // 입주 중인 호실 우선 선택 (없으면 개방된 호실에 즉시 VIP 입주 생성하여 배틀 보장)
  const b = state.buildings.lot_main;
  let targetRoom = b.rooms.find((r) => r.unlocked && r.household) || b.rooms.find((r) => r.unlocked) || b.rooms[0];
  if (!targetRoom.unlocked) targetRoom.unlocked = true;
  if (!targetRoom.household) {
    targetRoom.household = {
      type: 'newlywed',
      familyName: '한서준 세대',
      maxBudget: 180,
      happiness: 82
    };
    rebuildRoom3D('lot_main', targetRoom);
    syncBuildingResidents3D('lot_main');
  }

  rivalState.poach.active = true;
  rivalState.poach.roomId = targetRoom.id;
  rivalState.poach.pulsePhase = 0;

  // 메인 빌딩 정문 도로변에 보라색+24K 골드 오픈 슈퍼카 주차 & 확성기 든 강 회장 출현!
  const carGrp = createVehicle3D('car_rival_purple', false);
  carGrp.position.set(-5.8, 0.24, 4.85);
  carGrp.rotation.y = Math.PI * 0.48;
  scene.add(carGrp);
  rivalState.poach.carMesh = carGrp;

  const kang = createChibiPerson3D('rival_kang');
  kang.position.set(-2.35, 0.28, 2.05);
  kang.rotation.y = Math.PI;
  if (kang.userData?.megaphoneProp) {
    kang.userData.megaphoneProp.visible = true;
  }
  scene.add(kang);
  rivalState.poach.kangMesh = kang;

  spawnShockwaveRing3D(-2.35, 0.35, 2.05, 0x9333EA, 5.2);
  playSupercarHornSound('car_supercar');

  showSpeechBubble3D(
    'rival_kang_poach',
    -2.35,
    2.65,
    2.05,
    `이봐 ${targetRoom.name}호 세입자! 내 블랙타워로 이사 오면 첫 달 월세 반값에 위약금도 다 내줄게!!`,
    7.0,
    true
  );

  // 호실 상단 [라이벌 스카우트 방어!] 3D 투영 경고 핀 생성
  const rivalLayer = document.getElementById('rival-pins-layer');
  if (rivalLayer) {
    const pin = document.createElement('button');
    pin.type = 'button';
    pin.className = 'poach-alert-pin pointer-events-auto';
    pin.innerHTML = `${createCustomSVGIcon('megaphone_purple', 17)}<span>${targetRoom.name}호 라이벌 스카우트 방어!</span>`;
    pin.addEventListener('click', (e) => {
      e.stopPropagation();
      focusCameraOnRoom(targetRoom.id);
    });
    rivalLayer.appendChild(pin);
    rivalState.poach.pinEl = pin;
  }

  const dockTitle = document.getElementById('poach-dock-title');
  if (dockTitle) {
    dockTitle.textContent = `${targetRoom.name}호 (${targetRoom.household.familyName}) 스카우트 방어전!`;
  }
  const tauntEl = document.getElementById('poach-taunt-text');
  if (tauntEl) {
    tauntEl.textContent = `강 회장: "이봐 ${targetRoom.name}호! 내 블랙타워로 오면 첫 달 월세 반값에 위약금도 다 내줄게!"`;
  }

  if (focusImmediately) {
    focusCameraOnRoom(targetRoom.id);
    showToast(`[라이벌 침공!] 강 회장이 ${targetRoom.name}호 세입자를 유혹합니다! 맞불 플렉스로 방어하세요!`, 'coral');
  } else {
    showToast(`[경보!] 블랙타워 강 회장이 ${targetRoom.name}호 앞에서 확성기 스카우트 공세를 시작했습니다!`, 'coral');
  }
}

function resolveRivalPoachDefense(method = 'furn') {
  if (!rivalState.poach.active || !rivalState.poach.roomId) return;
  const rm = findRoomById(rivalState.poach.roomId);
  if (!rm) return;

  const costMap = { furn: 110, gift: 80, rain: 130 };
  const cost = costMap[method] || 100;
  if (!spendGold(cost)) return;

  const lot = state.lots.find((l) => l.lotId === rm.lotId) || { x: -4.2, z: -6.4 };
  const wx = lot.x + rm.lx;
  const wy = rm.ly + 1.5;
  const wz = lot.z + rm.lz;

  if (method === 'furn') {
    if (!rm.ownedFurniture.sofa.includes('sofa_leather_l')) rm.ownedFurniture.sofa.push('sofa_leather_l');
    rm.equippedFurniture.sofa = 'sofa_leather_l';
    syncRoomInteriorStats(rm);
    rebuildRoom3D(rm.lotId, rm);
    syncBuildingResidents3D(rm.lotId);
    const rGrp = lot3D[rm.lotId]?.roomsMap?.[rm.id];
    if (rGrp) playDropBouncePlacement3D(rGrp, wx, rm.ly + 0.4, wz);
  } else if (method === 'gift') {
    if (!Array.isArray(rm.giftedItems)) rm.giftedItems = [];
    rm.giftedItems.push('item_cake', 'item_coffee');
    rebuildRoom3D(rm.lotId, rm);
    syncBuildingResidents3D(rm.lotId);
    spawnPoofParticles3D(wx, wy, wz, 0xFF6B6B, 18);
  } else {
    playMoneyGunFlutterSFX();
  if (typeof spawnPopMartSkillBurstVFX === 'function') {
    spawnPopMartSkillBurstVFX('moneygun', typeof opt !== 'undefined' ? opt : { billCount: 40, feverMult: 2.0 });
  }
    for (let i = 0; i < 26; i++) {
      spawnSingleFlutterBill3D(wx, wy + 1.8, wz + 0.8, (Math.random() - 0.5) * 2.5, -1.2, 1.4);
    }
  }

  // 방어 성공 보상: 해당 호실 임대료 영구 +30% 인상 + 세입자 충성 보너스 코인 +320만 폭발 + 강 회장 자산 타격!
  rm.poachDefenseBonusPct = (rm.poachDefenseBonusPct || 0) + 30;
  if (rm.household) rm.household.happiness = 100;
  state.rivalWins = (state.rivalWins || 0) + 1;
  state.rivalKangPenalty = (state.rivalKangPenalty || 0) + 450;

  const loyaltyBonus = 320;
  addGold(loyaltyBonus);
  playGoldenBellSound();
  spawnShockwaveRing3D(wx, rm.ly + 0.25, wz, 0xFFD93D, 5.0);
  spawnJackpotText3D(wx, wy + 1.2, wz, `방어 대성공! 임대료 영구 +30% & 충성보너스 +${loyaltyBonus}만!`, 'forbes_trophy');

  showSpeechBubble3D(
    `poach_win_${rm.id}`,
    wx,
    wy + 0.9,
    wz,
    '블랙타워 안 가요!! 우리 건물주님이 우주 최고 갓물주예요!! 평생 재계약할게요!!',
    5.2,
    true
  );
  showSpeechBubble3D(
    'rival_kang_flee',
    -2.35,
    2.65,
    2.05,
    '크악!! 저 압도적인 플렉스에 세입자가 감동해버렸다니!! 두고 보자!!',
    4.0,
    true
  );

  cleanupRivalPoachEvent();
  updateTopHUDTargets();
  renderFocusedRoomInspector();
  renderFurnitureCatalogSheet();
  showToast(`[참교육 완승!] 강 회장 격퇴! ${rm.name}호 임대료 영구 +30% 상승 & 보너스 +${loyaltyBonus}만!`, 'gold');
  saveGameState();
}

// --------------------- [승부 ②] 미인수 상가 1:1 실시간 3D 입찰 경매 배틀 ---------------------
function cleanupShopBiddingWar() {
  rivalState.bidding.active = false;
  rivalState.bidding.resolving = false;
  rivalState.bidding.shopId = null;
  if (rivalState.bidding.stageGrp) {
    scene.remove(rivalState.bidding.stageGrp);
    rivalState.bidding.stageGrp = null;
  }
  rivalState.bidding.myAvatar = null;
  rivalState.bidding.kangAvatar = null;
  rivalState.bidding.myPaddleGrp = null;
  rivalState.bidding.kangPaddleGrp = null;
  rivalState.bidding.briefcaseMesh = null;
  document.getElementById('bidding-war-dock')?.classList.add('hidden');
  syncTopBarsByMode();
}

function updateBiddingDockLabels() {
  const tpl = STANDALONE_SHOPS_TEMPLATE.find((s) => s.shopId === rivalState.bidding.shopId);
  if (!tpl) return;
  const myEl = document.getElementById('bid-my-price');
  const rvEl = document.getElementById('bid-rival-price');
  const stepLbl = document.getElementById('label-bid-step-up');
  const slamLbl = document.getElementById('label-bid-briefcase');
  const nextStepPrice = Math.round(rivalState.bidding.rivalBid * 1.1);
  const slamCost = Math.round(tpl.buyCost * 1.55);

  if (myEl) myEl.textContent = `${rivalState.bidding.myBid.toLocaleString()}만`;
  if (rvEl) rvEl.textContent = `${rivalState.bidding.rivalBid.toLocaleString()}만!`;
  if (stepLbl) stepLbl.textContent = `+10% 호가 올리기 (${nextStepPrice.toLocaleString()}만)`;
  if (slamLbl) slamLbl.textContent = `만수르 200% 황금 돈가방 폭격 (${slamCost.toLocaleString()}만 · 즉시 낙찰!)`;

  if (rivalState.bidding.myPaddleGrp?.userData?.faceMat) {
    rivalState.bidding.myPaddleGrp.userData.faceMat.map = createAuctionPaddleTexture(`${rivalState.bidding.myBid}만!`, false);
    rivalState.bidding.myPaddleGrp.userData.faceMat.needsUpdate = true;
  }
  if (rivalState.bidding.kangPaddleGrp?.userData?.faceMat) {
    rivalState.bidding.kangPaddleGrp.userData.faceMat.map = createAuctionPaddleTexture(`${rivalState.bidding.rivalBid}만!`, true);
    rivalState.bidding.kangPaddleGrp.userData.faceMat.needsUpdate = true;
  }
}

function startShopBiddingWar(preferredShopId = null) {
  cleanupRivalPoachEvent();
  cleanupShopBiddingWar();

  const unowned = STANDALONE_SHOPS_TEMPLATE.find((s) => !state.standaloneShops?.[s.shopId]?.owned);
  const targetShopId = preferredShopId || unowned?.shopId || 'shop_bakery';
  const tpl = STANDALONE_SHOPS_TEMPLATE.find((s) => s.shopId === targetShopId) || STANDALONE_SHOPS_TEMPLATE[0];

  rivalState.bidding.active = true;
  rivalState.bidding.resolving = false;
  rivalState.bidding.shopId = tpl.shopId;
  rivalState.bidding.myBid = tpl.buyCost;
  rivalState.bidding.rivalBid = Math.round(tpl.buyCost * 1.1);
  rivalState.bidding.rallyCount = 0;

  // 매장 전면 파라솔 앞 오픈 보행 데크에 레드카펫 경매 단상 + 내 건물주 아바타(좌) vs 블랙타워 강 회장(우) + 대형 3D 번호 패들 배치!
  const stg = new THREE.Group();
  const frontZ = tpl.z + tpl.d * 0.5 + 3.65;
  stg.position.set(tpl.x, 0.26, frontZ);

  // 경매 레드카펫 & 황금 포디움
  stg.add(createRoundedToyMesh(4.9, 0.12, 2.3, MAT.supercarRed, 0, 0.06, 0, 0.05));
  stg.add(createRoundedToyMesh(1.22, 0.82, 0.9, MAT.walnutTrim, 0, 0.46, -0.25, 0.06));
  stg.add(createRoundedToyMesh(1.34, 0.12, 1.0, MAT.pureGold24k, 0, 0.9, -0.25, 0.04));

  const myAv = createChibiPerson3D('streamer');
  const crown = createRoundedToyMesh(0.46, 0.24, 0.46, MAT.pureGold24k, 0, 1.98, 0, 0.05);
  myAv.add(crown);
  myAv.position.set(-1.68, 0.12, 0.22);
  myAv.rotation.y = 0.28;
  const myPad = createAuctionPaddle3D(`${rivalState.bidding.myBid}만!`, false);
  myPad.scale.setScalar(1.18);
  myPad.position.set(0.32, 0.45, 0.18);
  myAv.userData.armR.add(myPad);
  stg.add(myAv);

  const kangAv = createChibiPerson3D('rival_kang');
  kangAv.position.set(1.68, 0.12, 0.22);
  kangAv.rotation.y = -0.28;
  const kangPad = createAuctionPaddle3D(`${rivalState.bidding.rivalBid}만!`, true);
  kangPad.scale.setScalar(1.18);
  kangPad.position.set(-0.32, 0.45, 0.18);
  kangAv.userData.armL.add(kangPad);
  stg.add(kangAv);

  scene.add(stg);
  rivalState.bidding.stageGrp = stg;
  rivalState.bidding.myAvatar = myAv;
  rivalState.bidding.kangAvatar = kangAv;
  rivalState.bidding.myPaddleGrp = myPad;
  rivalState.bidding.kangPaddleGrp = kangPad;

  const titleEl = document.getElementById('bid-shop-title');
  if (titleEl) titleEl.textContent = `${tpl.name} · 1:1 실시간 입찰 경매 배틀!`;
  const msgEl = document.getElementById('bid-status-msg');
  if (msgEl) {
    msgEl.textContent = `강 회장이 [${rivalState.bidding.rivalBid}만!] 패들을 들었습니다! 호가를 올리거나 황금 돈가방 폭격으로 참교육하세요!`;
  }
  updateBiddingDockLabels();

  focusCameraOnShop(tpl.shopId);
  showSpeechBubble3D('bid_kang_taunt', tpl.x + 1.68, 2.55, frontZ, `${rivalState.bidding.rivalBid}만!! 이 알짜 상가는 내 블랙타워 거다!`, 4.5, true);
}

function finishShopBiddingVictory(tpl, paidCost, usedBriefcaseSlam = false) {
  const st = state.standaloneShops[tpl.shopId];
  st.owned = true;
  st.auctionBonusPct = Math.max(40, (st.auctionBonusPct || 0) + 40);

  state.rivalWins = (state.rivalWins || 0) + 1;
  state.rivalKangPenalty = (state.rivalKangPenalty || 0) + 520;
  state.townHappinessBoost = Math.min(65, (state.townHappinessBoost || 0) + 8);

  // 경매 명성 리베이트 지급으로 연속 배틀 자금 선순환!
  const prestigeRebate = usedBriefcaseSlam ? 460 : 320;
  addGold(prestigeRebate);

  rebuildStandaloneShop3D(tpl.shopId);
  ensureShopOverlayBadge(tpl.shopId);
  updateTopHUDTargets();

  const frontZ = tpl.z + tpl.d * 0.5 + 3.65;
  spawnJackpotText3D(
    tpl.x,
    3.6,
    frontZ,
    `${tpl.name} 경매 낙찰! 기본수익 영구 +40% & 명성배당 +${prestigeRebate}만!`,
    'golden_briefcase'
  );
  showSpeechBubble3D(
    'bid_kang_ko',
    tpl.x + 1.68,
    2.45,
    frontZ,
    usedBriefcaseSlam
      ? '크아악!! 하늘에서 24K 순금 돈가방이 떨어지다니!! 내 자금력이 완패했다...!!'
      : '헉... 저 끝없는 현금 동원력은 도대체 뭐냐?! 내가 졌다!!',
    4.5,
    true
  );

  const msgEl = document.getElementById('bid-status-msg');
  if (msgEl) {
    msgEl.textContent = `낙찰 성공!! [${tpl.name}] 직영권 획득 & 매장 기본 수익 영구 +40% 보너스 적용 완료!`;
  }

  setTimeout(() => {
    cleanupShopBiddingWar();
    if (focusedShopId === tpl.shopId) {
      renderFocusedShopPanel();
      renderShopUpgradeCatalog();
    }
  }, 1550);

  showToast(`[경매 완승!] ${tpl.name} 즉시 낙찰 & 기본수익 영구 +40% 상승!`, 'gold');
  saveGameState();
}

function raiseShopBidStep() {
  if (!rivalState.bidding.active || rivalState.bidding.resolving) return;
  const tpl = STANDALONE_SHOPS_TEMPLATE.find((s) => s.shopId === rivalState.bidding.shopId);
  if (!tpl) return;

  const nextBid = Math.round(rivalState.bidding.rivalBid * 1.1);
  if (state.gold < nextBid) {
    showToast(`호가 입찰 자산이 부족합니다! (필요: ${nextBid.toLocaleString()}만)`, 'coral');
    return;
  }

  rivalState.bidding.myBid = nextBid;
  rivalState.bidding.rallyCount = (rivalState.bidding.rallyCount || 0) + 1;
  const frontZ = tpl.z + tpl.d * 0.5 + 3.65;

  if (rivalState.bidding.myAvatar) {
    triggerSquashStretch(rivalState.bidding.myAvatar, 1.3);
  }
  playShopDoorChimeSound();
  showSpeechBubble3D('bid_me_shout', tpl.x - 1.68, 2.55, frontZ, `내 호가 ${nextBid}만!! 따라올 수 있겠나?!`, 3.0, true);

  if (rivalState.bidding.rallyCount >= 2) {
    if (!spendGold(nextBid)) return;
    rivalState.bidding.resolving = true;
    if (rivalState.bidding.kangAvatar) {
      rivalState.bidding.kangAvatar.rotation.x = -0.55;
    }
    updateBiddingDockLabels();
    finishShopBiddingVictory(tpl, nextBid, false);
  } else {
    rivalState.bidding.rivalBid = Math.round(nextBid * 1.06);
    updateBiddingDockLabels();
    const msgEl = document.getElementById('bid-status-msg');
    if (msgEl) {
      msgEl.textContent = `강 회장이 식은땀을 흘리며 [${rivalState.bidding.rivalBid}만!]을 불렀습니다! 한 번 더 올리거나 돈가방으로 끝내세요!`;
    }
    showSpeechBubble3D('bid_kang_taunt', tpl.x + 1.68, 2.55, frontZ, `크윽... 지지 않는다! ${rivalState.bidding.rivalBid}만!!`, 3.2, true);
  }
}

function slamGoldenBriefcaseBuyout() {
  if (!rivalState.bidding.active || rivalState.bidding.resolving) return;
  const tpl = STANDALONE_SHOPS_TEMPLATE.find((s) => s.shopId === rivalState.bidding.shopId);
  if (!tpl) return;

  const slamCost = Math.round(tpl.buyCost * 1.55);
  if (!spendGold(slamCost)) return;

  rivalState.bidding.resolving = true;
  rivalState.bidding.myBid = slamCost;
  updateBiddingDockLabels();

  const frontZ = tpl.z + tpl.d * 0.5 + 3.65;
  if (rivalState.bidding.stageGrp) {
    const briefcase = createGiantGoldenBriefcase3D();
    briefcase.position.set(0, 0.94, -0.2);
    rivalState.bidding.stageGrp.add(briefcase);
    rivalState.bidding.briefcaseMesh = briefcase;
    playDropBouncePlacement3D(briefcase, tpl.x, 1.15, frontZ);
  }

  // 지폐 폭풍 & 강 회장 넉다운 연출!
  playMoneyGunFlutterSFX();
  if (typeof spawnPopMartSkillBurstVFX === 'function') {
    spawnPopMartSkillBurstVFX('moneygun', typeof opt !== 'undefined' ? opt : { billCount: 40, feverMult: 2.0 });
  }
  for (let i = 0; i < 28; i++) {
    spawnSingleFlutterBill3D(tpl.x, 2.8, frontZ, (Math.random() - 0.5) * 3.0, (Math.random() - 0.5) * 2.4, 1.5);
  }
  if (rivalState.bidding.kangAvatar) {
    rivalState.bidding.kangAvatar.rotation.x = -0.92;
    rivalState.bidding.kangAvatar.position.z = 0.65;
  }
  spawnShockwaveRing3D(tpl.x, 0.38, frontZ, 0xFFD93D, 6.2);

  finishShopBiddingVictory(tpl, slamCost, true);
}

// --------------------- [승부 ③-A] 외곽 해안 드라이빙 존 1:1 슈퍼카 레이스 ---------------------
function endRivalCoastalRaceCleanup() {
  rivalState.race.active = false;
  rivalState.race.finished = false;
  if (rivalState.race.rivalCar) {
    scene.remove(rivalState.race.rivalCar);
    rivalState.race.rivalCar = null;
  }
  document.getElementById('drive-race-hud')?.classList.add('hidden');
}

function startRivalCoastalRace() {
  cleanupRivalPoachEvent();
  cleanupShopBiddingWar();
  endRivalCoastalRaceCleanup();

  if (!driveState.active) {
    enterDriveMode(false);
  }

  // 외곽 해안 야자수 대로 출발선에 내 차량(좌) vs 강 회장 보라+골드 오픈 슈퍼카(우) 나란히 정렬!
  driveState.x = 18.8;
  driveState.z = 30.2;
  driveState.y = 0.24;
  driveState.heading = 0.42;
  driveState.waypointIdx = 4;
  driveState.autoCruise = true;
  driveState.speed = 13.5;

  if (driveState.carRootGroup) {
    driveState.carRootGroup.position.set(driveState.x, driveState.y, driveState.z);
    driveState.carRootGroup.rotation.y = driveState.heading;
  }

  const rvCarGrp = createVehicle3D('car_rival_purple', true);
  rvCarGrp.position.set(21.4, 0.24, 30.2);
  rvCarGrp.rotation.y = 0.42;
  scene.add(rvCarGrp);

  rivalState.race.active = true;
  rivalState.race.finished = false;
  rivalState.race.rivalCar = rvCarGrp;
  rivalState.race.rivalWheels = rvCarGrp.userData?.wheels || [];
  rivalState.race.rivalWpIdx = 4;
  rivalState.race.rivalX = 21.4;
  rivalState.race.rivalZ = 30.2;
  rivalState.race.rivalHeading = 0.42;
  rivalState.race.rivalSpeed = 10.6;
  rivalState.race.elapsed = 0;

  syncTopBarsByMode();
  playSupercarHornSound('car_supercar');
  showSpeechBubble3D(
    'race_kang_start',
    21.4,
    2.45,
    30.2,
    '해안 빨간 아치교 끝 전망대까지 1:1 승부다!! 내 보라색 슈퍼카 먼지나 마셔라!!',
    4.2,
    true
  );
  showToast('[해안 1:1 슈퍼카 레이스 출발!] 부스트 코인을 먹으며 빨간 아치교 너머 전망대 결승선으로 질주하세요!', 'gold');
}

// --------------------- [승부 ③-B] 1인칭 상점 '만수르 더블 골든벨' 맞불 참교육 ---------------------
function startDoubleGoldenBellBattle() {
  cleanupRivalPoachEvent();
  cleanupShopBiddingWar();
  rivalState.fpKangActive = true;
  const targetShop = (fpState.active && fpState.mode === 'shop') ? fpState.shopId : 'shop_bakery';
  enterFirstPersonShop(targetShop, false);
  showToast('[1인칭 맞불 대결!] 매장에서 거들먹거리는 강 회장 코앞에서 [만수르 더블 골든벨]을 울려 참교육하세요!', 'gold');
}

function triggerDoubleGoldenBellShowdown() {
  if (!fpState.active || fpState.mode !== 'shop') return;
  if (!spendGold(200)) return;

  playGoldenBellSound();
  playMoneyGunFlutterSFX();
  if (typeof spawnPopMartSkillBurstVFX === 'function') {
    spawnPopMartSkillBurstVFX('moneygun', typeof opt !== 'undefined' ? opt : { billCount: 40, feverMult: 2.0 });
  }
  fpState.bellSwingTimer = 4.5;
  fpState.cheerTimer = 6.5;

  const fwCols = [0xFFD93D, 0xA855F7, 0xFF6B6B, 0x38E54D, 0x4CC2FF];
  for (let b = 0; b < 6; b++) {
    const bx = FP_STAGE_ORIGIN.x - 3.4 + b * 1.35;
    const by = FP_STAGE_ORIGIN.y + 2.95 + (b % 2) * 0.4;
    const bz = FP_STAGE_ORIGIN.z - 0.9;
    spawnPoofParticles3D(bx, by, bz, fwCols[b % fwCols.length], 14);
  }
  for (let m = 0; m < 24; m++) {
    spawnSingleFlutterBill3D(FP_STAGE_ORIGIN.x, FP_STAGE_ORIGIN.y + 2.5, FP_STAGE_ORIGIN.z + 0.5, (Math.random() - 0.5) * 2.8, -1.0, 1.4);
  }

  // 강 회장 패배 연출 + 카운터에 황금 위자료 팁 +480만 투척 후 줄행랑!
  const kangTip = 480;
  addGold(kangTip);
  state.rivalWins = (state.rivalWins || 0) + 1;
  state.rivalKangPenalty = (state.rivalKangPenalty || 0) + 480;
  state.feverTimer = 60.0;
  state.feverPower = 3.0;

  for (const b of Object.values(state.buildings)) {
    for (const rm of b.rooms) {
      if (rm.household) rm.household.happiness = 100;
    }
  }

  if (rivalState.fpKangMesh) {
    rivalState.fpKangMesh.rotation.x = -0.65;
    rivalState.fpKangMesh.position.z = 2.6;
    showSpeechBubble3D(
      'fp_rival_kang_brag',
      FP_STAGE_ORIGIN.x + 1.38,
      FP_STAGE_ORIGIN.y + 2.35,
      FP_STAGE_ORIGIN.z + 1.8,
      `컥!! 더블 골든벨이라니!! 여기 황금 팁 ${kangTip}만 내놓고 간다... 완패다!!`,
      4.2,
      true
    );
    const kangRef = rivalState.fpKangMesh;
    setTimeout(() => {
      if (kangRef && kangRef.parent) kangRef.parent.remove(kangRef);
    }, 1800);
    rivalState.fpKangMesh = null;
  }
  rivalState.fpKangActive = false;
  syncFpModeHUD();

  showSpeechBubble3D(
    'fp_clerk_welcome',
    FP_STAGE_ORIGIN.x - 0.45,
    FP_STAGE_ORIGIN.y + 2.75,
    FP_STAGE_ORIGIN.z - 2.05,
    '땡땡땡!! 우리 건물주님의 만수르 더블 골든벨 완승!! 강 회장이 꼬리를 내리고 도망갔습니다!!',
    5.0,
    true
  );

  updateTopHUDTargets();
  showToast(`[더블 골든벨 참교육 완승!] 강 회장 골든팁 +${kangTip}만 회수 & 60초 수익 3배 피버 발동!`, 'gold');
  saveGameState();
}

function tickRivalBattlesAndRace(dt, elapsed) {
  if (titleScreenState.active) return;

  // 1) 60초 주기 라이벌 자동 도발 타이머 (타운 전체 뷰에서 평화로울 때 자동 발동)
  if (!rivalState.poach.active && !rivalState.bidding.active && !rivalState.race.active && !driveState.active && !fpState.active && !focusedRoomId && !focusedShopId) {
    rivalState.periodicTimer -= dt;
    if (rivalState.periodicTimer <= 0) {
      rivalState.periodicTimer = 65.0;
      startRivalPoachEvent(false);
    }
  }

  // 2) 스카우트 방어전 중 강 회장 확성기 흔들기 & 보라색 오라 펄스
  if (rivalState.poach.active && rivalState.poach.kangMesh) {
    rivalState.poach.pulsePhase += dt;
    const km = rivalState.poach.kangMesh;
    km.position.y = 0.28 + Math.abs(Math.sin(elapsed * 5.5)) * 0.1;
    km.rotation.y = Math.PI + Math.sin(elapsed * 2.6) * 0.25;
    if (km.userData?.armR) {
      km.userData.armR.rotation.x = -1.15 + Math.sin(elapsed * 8.0) * 0.2;
    }
    if (rivalState.poach.pulsePhase > 2.2) {
      rivalState.poach.pulsePhase = 0;
      spawnShockwaveRing3D(km.position.x, 0.34, km.position.z, 0x9333EA, 3.6);
    }
  }

  // 3) 상가 1:1 입찰 경매 배틀 중 내 아바타 vs 강 회장 3D 번호판 교차 번쩍 들기 모션!
  if (rivalState.bidding.active && !rivalState.bidding.resolving) {
    const myLift = Math.max(0, Math.sin(elapsed * 4.2));
    const rvLift = Math.max(0, Math.sin(elapsed * 4.2 + Math.PI));
    if (rivalState.bidding.myAvatar?.userData?.armR) {
      rivalState.bidding.myAvatar.userData.armR.rotation.x = -0.85 - myLift * 1.35;
      rivalState.bidding.myAvatar.position.y = 0.12 + myLift * 0.14;
    }
    if (rivalState.bidding.kangAvatar?.userData?.armL) {
      rivalState.bidding.kangAvatar.userData.armL.rotation.x = -0.85 - rvLift * 1.35;
      rivalState.bidding.kangAvatar.position.y = 0.12 + rvLift * 0.14;
    }
  }

  // 4) 외곽 해안 1:1 슈퍼카 레이스 AI 주행 및 결승선 승리 판정!
  if (rivalState.race.active && driveState.active && rivalState.race.rivalCar) {
    rivalState.race.elapsed = (rivalState.race.elapsed || 0) + dt;

    // 플레이어가 크루징 중일 때도 시원한 레이스 속도감 보장
    if (driveState.autoCruise) {
      driveState.speed = Math.max(driveState.speed, 15.2);
    }

    const rWp = RING_ROAD_WAYPOINTS[Math.min(9, rivalState.race.rivalWpIdx)];
    const dx = rWp.x - rivalState.race.rivalX;
    const dz = rWp.z - rivalState.race.rivalZ;
    const dist = Math.hypot(dx, dz);
    if (dist < 3.4 && rivalState.race.rivalWpIdx < 9) {
      rivalState.race.rivalWpIdx += 1;
    }
    const targetH = Math.atan2(dx, dz);
    let diff = targetH - rivalState.race.rivalHeading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    rivalState.race.rivalHeading += diff * Math.min(1, dt * 4.5);

    rivalState.race.rivalX += Math.sin(rivalState.race.rivalHeading) * rivalState.race.rivalSpeed * dt;
    rivalState.race.rivalZ += Math.cos(rivalState.race.rivalHeading) * rivalState.race.rivalSpeed * dt;
    rivalState.race.rivalCar.position.set(rivalState.race.rivalX, 0.24, rivalState.race.rivalZ);
    rivalState.race.rivalCar.rotation.y = rivalState.race.rivalHeading;

    for (const rw of (rivalState.race.rivalWheels || [])) {
      rw.rotation.x += rivalState.race.rivalSpeed * dt * 1.6;
    }

    const finishPt = RING_ROAD_WAYPOINTS[8]; // 해안 전망대 결승 지점 (-16.8, 48.2)
    const myDistToFinish = Math.hypot(finishPt.x - driveState.x, finishPt.z - driveState.z);
    const rvDistToFinish = Math.hypot(finishPt.x - rivalState.race.rivalX, finishPt.z - rivalState.race.rivalZ);
    const totalSpan = 44.0;
    const progPct = THREE.MathUtils.clamp(Math.round((1 - myDistToFinish / totalSpan) * 100), 8, 100);

    const fillEl = document.getElementById('race-progress-fill');
    const gapEl = document.getElementById('race-gap-label');
    if (fillEl) fillEl.style.width = `${progPct}%`;
    if (gapEl) {
      const ahead = rvDistToFinish - myDistToFinish;
      gapEl.textContent = ahead >= -0.5 ? `내가 +${Math.max(1, Math.round(ahead + 2))}m 선두 질주!` : '맹추격 중! 부스트 코인 획득!';
    }

    if (!rivalState.race.finished && (myDistToFinish < 7.2 || driveState.waypointIdx >= 9 || rivalState.race.elapsed > 11.5)) {
      rivalState.race.finished = true;
      state.rivalWins = (state.rivalWins || 0) + 1;
      state.rivalKangPenalty = (state.rivalKangPenalty || 0) + 500;

      // 도로 위에 황금 위자료 코인 보따리 8개 대폭발 -> 차량 자석으로 즉시 촤르륵 흡수!
      for (let c = 0; c < 8; c++) {
        const ang = (c / 8) * Math.PI * 2;
        spawnRentBubble(
          `race_prize_${Date.now()}_${c}`,
          driveState.x + Math.cos(ang) * 3.2,
          1.35,
          driveState.z + Math.sin(ang) * 3.2,
          70,
          '강 회장 레이스 위자료'
        );
      }
      playGoldenBellSound();
      spawnShockwaveRing3D(driveState.x, 0.4, driveState.z, 0xFFD93D, 7.5);
      showSpeechBubble3D(
        'race_kang_lose',
        rivalState.race.rivalX,
        2.5,
        rivalState.race.rivalZ,
        '크아악!! 내 24K 골드 슈퍼카가 코너링에서 따이다니!! 위자료 코인 받아라!!',
        4.5,
        true
      );
      updateTopHUDTargets();
      showToast('[해안 레이스 우승!] 강 회장 슈퍼카 추월 완승! 위자료 황금 코인 보따리가 폭발합니다!', 'gold');
      saveGameState();

      setTimeout(() => {
        endRivalCoastalRaceCleanup();
      }, 2400);
    }
  }
}

// --------------------- [신규 8] 시네마틱 3D 라이브 오프닝 로딩 & 타이틀 스크린 ---------------------
function playTitleStartFanfareSFX() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!window._landlordAudioCtx) window._landlordAudioCtx = new AC();
    const ctx = window._landlordAudioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    // 경쾌한 차링~ 코인 스파클 + 브라스 팡파르 화음!
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx < 3 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.065);
      gain.gain.setValueAtTime(0.13, now + idx * 0.065);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.065 + 0.48);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.065);
      osc.stop(now + idx * 0.065 + 0.5);
    });
  } catch (e) {}
}

function applyTitleDollhouseShowcaseCamera(swayT = 0) {
  if (!camera || !controls) return;
  const isMobile = window.innerWidth < 640;
  controls.enabled = false;

  const gentleX = Math.sin(swayT * 0.45) * 0.85;
  const gentleY = Math.cos(swayT * 0.35) * 0.35;

  if (isMobile) {
    controls.target.set(-3.8 + gentleX * 0.4, 6.2 + gentleY, -1.8);
    camera.position.set(3.2 + gentleX, 22.0, 34.5);
    camera.zoom = 0.62;
  } else {
    // 좌측 35% 플로팅 카드 여백 확보 + 우측 60~65% 지점에 3D 인형의 집 단면 빌딩 & 1층 상가 & 거리 쇼케이스 배치!
    controls.target.set(-11.4 + gentleX * 0.5, 9.4 + gentleY, -2.6);
    camera.position.set(-4.6 + gentleX, 23.8, 35.5);
    camera.zoom = Math.min(1.16, Math.max(0.88, window.innerWidth / 1280));
  }
  camera.updateProjectionMatrix();
  camera.lookAt(controls.target);
}

function initTitleScreenUI() {
  const fillEl = document.getElementById('title-progress-fill');
  if (fillEl) fillEl.style.width = '8%';
  document.getElementById('title-loading-box')?.classList.remove('hidden');
  document.getElementById('btn-start-game')?.classList.add('hidden');

  const hasSavedData = !!localStorage.getItem(SAVE_KEY);
  const continueBtn = document.getElementById('btn-continue-game');
  if (continueBtn) {
    continueBtn.style.opacity = hasSavedData ? '1' : '0.65';
  }

  applyTitleDollhouseShowcaseCamera(0);
}

function enterTownFromTitleScreen(runOnboardingTour = false) {
  if (!titleScreenState.active || titleScreenState.entering) return;
  titleScreenState.entering = true;

  playTitleStartFanfareSFX();

  const overlay = document.getElementById('title-screen-overlay');
  if (overlay) {
    overlay.classList.add('fade-out-swoop');
    setTimeout(() => {
      overlay.classList.add('hidden');
    }, 620);
  }

  titleScreenState.active = false;
  document.getElementById('main-game-header')?.classList.remove('hidden');
  document.getElementById('bottom-town-bar')?.classList.remove('hidden');

  controls.enabled = true;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = Math.PI * 0.44;
  controls.enablePan = true;

  const isMobilePortrait = window.innerWidth < 640 && window.innerHeight > window.innerWidth;
  const offset = CAM_OFFSETS[camAzimuth % 4];
  const targetLook = isMobilePortrait ? new THREE.Vector3(-1.2, 4.4, 8.2) : OVERVIEW_LOOK.clone();
  const targetPos = targetLook.clone().add(offset);
  const targetZoom = isMobilePortrait ? 0.48 : 0.82;

  syncTopBarsByMode();
  updateForbesRankAndHUD(false);

  if (runOnboardingTour) {
    state.activeTownStage = 1;
    applyTownAtmosphere(1);
    syncChronicleAndStageUI();
    setTimeout(() => {
      startGuidedSimulationTour();
    }, 420);
  } else {
    const startStage = state.activeTownStage === 2 && state.harborUnlocked ? 2 : 1;
    state.activeTownStage = startStage;
    applyTownAtmosphere(startStage);
    syncChronicleAndStageUI();
    const destLook = startStage === 2 ? HARBOR_OVERVIEW_LOOK.clone() : targetLook;
    const destPos = destLook.clone().add(offset);
    startSmoothCameraTween(destPos, destLook, startStage === 2 ? 0.72 : targetZoom, 0.9, null);
  }
}

function tickTitleScreenAndDroneCam(dt) {
  if (!titleScreenState.active) return;

  titleScreenState.swayPhase = (titleScreenState.swayPhase || 0) + dt;
  applyTitleDollhouseShowcaseCamera(titleScreenState.swayPhase);

  if (!titleScreenState.ready) {
    titleScreenState.progress = Math.min(100, titleScreenState.progress + dt * 155);
    const pct = Math.round(titleScreenState.progress);
    const fillEl = document.getElementById('title-progress-fill');
    if (fillEl) fillEl.style.width = `${pct}%`;

    if (pct >= 100) {
      titleScreenState.ready = true;
      setTimeout(() => {
        if (!titleScreenState.active) return;
        document.getElementById('title-loading-box')?.classList.add('hidden');
        document.getElementById('btn-start-game')?.classList.remove('hidden');
      }, 90);
    }
  }
}

// --------------------- [신규 9] 5단계 시네마틱 라이브 시뮬레이션 온보딩 투어 엔진 ---------------------
function cleanupGuidedTourStepProps() {
  if (guidedTourState.demoGroup) {
    scene.remove(guidedTourState.demoGroup);
    guidedTourState.demoGroup = null;
  }
  guidedTourState.tempCarMesh = null;
  guidedTourState.tempKangGroup = null;

  if (guidedTourState.milestonePreviewed && Array.isArray(guidedTourState.savedMilestones)) {
    state.unlockedMilestones = [...guidedTourState.savedMilestones];
    guidedTourState.savedMilestones = null;
    guidedTourState.milestonePreviewed = false;
    rebuildHappinessMilestones3D();
    buildSingleLot3D('lot_main');
  }

  if (fpState.active) {
    exitFirstPersonMode(false);
  }
  document.getElementById('tour-forbes-preview-card')?.remove();
}

function launchTourFreeMoneyShowerDemo() {
  const gun = create3DMoneyGunMesh();
  gun.position.set(0, 3.6, 20.4);
  gun.rotation.set(-0.22, Math.PI, 0.15);
  gun.scale.setScalar(1.45);
  guidedTourState.demoGroup.add(gun);

  playMoneyGunFlutterSFX();
  if (typeof spawnPopMartSkillBurstVFX === 'function') {
    spawnPopMartSkillBurstVFX('moneygun', typeof opt !== 'undefined' ? opt : { billCount: 40, feverMult: 2.0 });
  }
  for (let i = 0; i < 34; i++) {
    const ang = (i / 34) * Math.PI * 2;
    spawnSingleFlutterBill3D(
      (Math.random() - 0.5) * 1.4,
      3.5 + Math.random() * 0.8,
      18.2 + (Math.random() - 0.5) * 1.4,
      Math.cos(ang),
      Math.sin(ang),
      1.35
    );
  }
  spawnGroundStatusRing3D(0, 0.28, 17.8, 'income');
  spawnRisingGroundCoins3D(-2.2, 0.3, 16.8, 3);
  spawnRisingGroundCoins3D(2.2, 0.3, 16.8, 3);

  for (const w of streetOutingActors) {
    w.mesh.userData.auraTimer = 4.0;
    w.mesh.userData.auraHex = 0xFBBF24;
    triggerSquashStretch(w.mesh, 1.25);
  }
}

function applyGuidedTourStep(stepIdx) {
  const steps = window.GUIDED_TOUR_STEPS || [];
  if (stepIdx < 0 || stepIdx >= steps.length) {
    stopGuidedSimulationTour();
    return;
  }

  cleanupGuidedTourStepProps();
  clearTransientSpeechBubbles(null);

  guidedTourState.stepIdx = stepIdx;
  guidedTourState.stepTimer = 0;
  guidedTourState.fpPreviewTriggered = false;
  guidedTourState.demoGroup = new THREE.Group();
  scene.add(guidedTourState.demoGroup);

  const info = steps[stepIdx];
  const badgeEl = document.getElementById('tour-step-badge');
  const captionEl = document.getElementById('tour-step-caption');
  const nextBtn = document.getElementById('btn-tour-next');
  if (badgeEl) badgeEl.textContent = info.badge;
  if (captionEl) captionEl.textContent = info.text;
  if (nextBtn) nextBtn.textContent = stepIdx === steps.length - 1 ? '투어 완료 ✨' : '다음 ▶';

  if (stepIdx === 0) {
    // Step 1: 1층 상가 & 2층 방 클로즈업 + 위에서 3D 침대와 진열대가 '쿵!' 떨어져 통통 튀며 배치
    const look = new THREE.Vector3(-8.2, 5.4, -3.2);
    const pos = new THREE.Vector3(-1.8, 15.2, 21.5);
    startSmoothCameraTween(pos, look, 1.42, 0.65, () => {
      if (!guidedTourState.active || guidedTourState.stepIdx !== 0 || !guidedTourState.demoGroup) return;
      const demoBed = createCatalogBed3D('bed_canopy');
      demoBed.position.set(-12.2, 5.05, -6.6);
      guidedTourState.demoGroup.add(demoBed);
      playDropBouncePlacement3D(demoBed, -12.2, 5.05, -6.6);

      setTimeout(() => {
        if (!guidedTourState.active || guidedTourState.stepIdx !== 0 || !guidedTourState.demoGroup) return;
        const showcase = new THREE.Group();
        showcase.add(createRoundedToyMesh(2.5, 0.85, 0.95, MAT.woodLight, 0, 0.42, 0, 0.06));
        const cake = create3DGiftPropMesh('item_cake', false);
        cake.scale.setScalar(1.25);
        cake.position.set(-0.45, 0.92, 0);
        const crois = create3DGiftPropMesh('item_croissant', false);
        crois.scale.setScalar(1.25);
        crois.position.set(0.48, 0.92, 0);
        showcase.add(cake, crois);
        showcase.position.set(-10.8, 0.46, -1.2);
        guidedTourState.demoGroup.add(showcase);
        playDropBouncePlacement3D(showcase, -10.8, 0.46, -1.2);
      }, 380);
    });
  } else if (stepIdx === 1) {
    // Step 2: 광장 황금 머니건 3D 지폐 다발 발사 & 주민 환호 바닥 3D 링 시뮬레이션
    const look = new THREE.Vector3(0, 2.2, 16.8);
    const pos = new THREE.Vector3(8.5, 17.5, 42.5);
    startSmoothCameraTween(pos, look, 1.15, 0.65, () => {
      if (!guidedTourState.active || guidedTourState.stepIdx !== 1 || !guidedTourState.demoGroup) return;
      launchTourFreeMoneyShowerDemo();
    });
  } else if (stepIdx === 2) {
    // Step 3: 광장 24K 황금 건물주 동상 + 빌딩 칭송 현수막 + 루프탑 파티장 시연
    guidedTourState.savedMilestones = [...(state.unlockedMilestones || [])];
    guidedTourState.milestonePreviewed = true;
    state.unlockedMilestones = [25, 50, 75, 100];
    rebuildHappinessMilestones3D();
    buildSingleLot3D('lot_main');

    const look = new THREE.Vector3(-2.4, 11.2, 6.2);
    const pos = new THREE.Vector3(12.5, 26.8, 41.0);
    startSmoothCameraTween(pos, look, 0.84, 0.72, () => {
      if (!guidedTourState.active || guidedTourState.stepIdx !== 2) return;
      spawn3DFireworkRocket();
      spawnGroundStatusRing3D(0, 0.3, 13.8, 'income');
    });
  } else if (stepIdx === 3) {
    // Step 4: 슈퍼카 해안 드라이빙 존 질주 & 1인칭 매장 내부 뷰 시연
    const demoCar = createVehicle3D('car_supercar', true);
    demoCar.position.set(-24.0, 0.24, 41.5);
    demoCar.rotation.y = Math.PI * 0.5;
    guidedTourState.demoGroup.add(demoCar);
    guidedTourState.tempCarMesh = demoCar;
    guidedTourState.tempCarProgress = 0;

    const look = new THREE.Vector3(-8.0, 1.6, 41.5);
    const pos = new THREE.Vector3(6.5, 15.0, 64.0);
    startSmoothCameraTween(pos, look, 1.02, 0.65, () => {
      if (!guidedTourState.active || guidedTourState.stepIdx !== 3) return;
      playSupercarHornSound('car_supercar');
    });
  } else if (stepIdx === 4) {
    // Step 5: 라이벌 강 회장 대결 & 포브스 자산 순위 1위 등극 목표 하이라이트!
    const kangGrp = new THREE.Group();
    const kangChar = createChibiPerson3D('chairman_kang');
    kangChar.scale.setScalar(1.22);
    kangChar.userData.auraHex = 0xA855F7;
    kangChar.userData.auraTimer = 8.0;
    const paddle = createAuctionPaddle3D('990만!', true);
    paddle.position.set(0.62, 1.55, 0.25);
    kangGrp.add(kangChar, paddle);

    const rivalSedan = createVehicle3D('car_limo', false);
    rivalSedan.position.set(3.4, 0, -0.8);
    rivalSedan.rotation.y = -0.45;
    kangGrp.add(rivalSedan);
    kangGrp.position.set(-9.5, 0.26, 18.8);
    guidedTourState.demoGroup.add(kangGrp);
    guidedTourState.tempKangGroup = kangGrp;

    // 우측 상단 포브스 자산 순위 1위 목표 미니 프리뷰 카드 표시
    const previewCard = document.createElement('div');
    previewCard.id = 'tour-forbes-preview-card';
    previewCard.className = 'fixed top-[20px] right-[20px] z-[83] pointer-events-none diary-card !p-3.5 !bg-[#FFFDF9]/95 max-w-[248px] shadow-xl forbes-tour-highlight';
    previewCard.innerHTML = `
      <div class="text-[10.5px] font-extrabold text-[#B45309] tracking-wider">FORBES GOAL #1</div>
      <div class="mt-1 font-extrabold text-[14px] text-[#2C221E]">🏆 대한민국 자산 서열 1위</div>
      <div class="mt-1 text-[11.5px] font-bold text-[#6E5A4F]">블랙타워 강 회장을 꺾고 포브스 1위 갓물주 왕좌에 등극하세요!</div>
    `;
    document.body.appendChild(previewCard);

    const look = new THREE.Vector3(-9.5, 2.2, 17.8);
    const pos = new THREE.Vector3(1.5, 14.8, 38.5);
    startSmoothCameraTween(pos, look, 1.24, 0.65, () => {
      if (!guidedTourState.active || guidedTourState.stepIdx !== 4) return;
      spawnGroundStatusRing3D(-9.5, 0.28, 18.8, 'rival');
    });
  }

  syncTopBarsByMode();
}

function startGuidedSimulationTour() {
  closeAllModalsImmediate();
  closePocketPlanner();
  if (driveState.active) exitDriveMode();
  if (fpState.active) exitFirstPersonMode(false);
  focusedRoomId = null;
  focusedShopId = null;
  focusedFirstFloorShopId = null;

  guidedTourState.active = true;
  document.getElementById('cinematic-tour-bar')?.classList.remove('hidden');
  try {
    localStorage.setItem('god_landlord_tour_seen_v1', '1');
  } catch (e) {}

  applyGuidedTourStep(0);
}

function stopGuidedSimulationTour() {
  if (!guidedTourState.active) return;
  guidedTourState.active = false;
  cleanupGuidedTourStepProps();
  document.getElementById('cinematic-tour-bar')?.classList.add('hidden');
  setOverviewCamera(true);
  syncTopBarsByMode();
}

function tickGuidedSimulationTour(dt, elapsed, uiDt = dt) {
  if (!guidedTourState.active) return;
  guidedTourState.stepTimer += uiDt;

  // Step 2: 황금 머니건 지폐 다발 연속 분사 & 주민 환호 바닥 링 지속 시연
  if (guidedTourState.stepIdx === 1) {
    guidedTourState.ringPulseAccum = (guidedTourState.ringPulseAccum || 0) + uiDt;
    if (guidedTourState.ringPulseAccum >= 0.42) {
      guidedTourState.ringPulseAccum = 0;
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2 + elapsed;
        spawnSingleFlutterBill3D(
          (Math.random() - 0.5) * 1.6,
          4.2 + Math.random() * 1.2,
          17.8 + (Math.random() - 0.5) * 1.6,
          Math.cos(ang),
          Math.sin(ang),
          1.4
        );
      }
      spawnGroundStatusRing3D((Math.random() - 0.5) * 5.0, 0.28, 17.8 + (Math.random() - 0.5) * 4.0, 'happy');
    }
  }

  // Step 4: 해안 도로 슈퍼카 질주 시연(1.6초) 후 -> 1인칭 부티크 베이커리 매장 내부 뷰 자동 전환 시연!
  if (guidedTourState.stepIdx === 3) {
    if (guidedTourState.tempCarMesh && !fpState.active) {
      guidedTourState.tempCarMesh.position.x += uiDt * 14.5;
      const lookX = guidedTourState.tempCarMesh.position.x + 2.5;
      controls.target.x = THREE.MathUtils.lerp(controls.target.x, lookX, Math.min(1, uiDt * 6));
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, lookX + 12.0, Math.min(1, uiDt * 6));
    }
    if (guidedTourState.stepTimer >= 1.65 && !guidedTourState.fpPreviewTriggered) {
      guidedTourState.fpPreviewTriggered = true;
      enterFirstPersonShop('shop_bakery', false);
      syncTopBarsByMode();
    }
    if (fpState.active) {
      fpState.yaw = Math.sin(elapsed * 0.85) * 0.35;
    }
  }

  // Step 5: 강 회장 발밑 보라·레드 경고 3D 파동 링 반복 연출
  if (guidedTourState.stepIdx === 4 && guidedTourState.tempKangGroup) {
    guidedTourState.ringPulseAccum = (guidedTourState.ringPulseAccum || 0) + uiDt;
    if (guidedTourState.ringPulseAccum >= 0.85) {
      guidedTourState.ringPulseAccum = 0;
      spawnGroundStatusRing3D(-9.5, 0.28, 18.8, 'rival');
    }
  }
}

function updateAllProjectedOverlays(dt) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // 라이벌 스카우트 핀 외에 평소 메인 타운 화면의 2D 상가/부지/월세 글자 배지는 100% 숨겨 클린 뷰 보장!
  if (rivalState.poach.active && rivalState.poach.pinEl && rivalState.poach.roomId) {
    rivalState.poach.pinEl.style.display = 'none';
  }

  // 1인칭 상점 쇼케이스 상품 핀 (1인칭 매장 내부에서만 표시)
  for (const pin of fpState.labelPins) {
    if (!fpState.active || fpState.mode !== 'shop' || guidedTourState.active) {
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

  // 평소 메인 뷰 글자 버튼/배지 제로(Zero): 2D 상가·부지·월세 플로팅 배지 비노출 (3D 오브젝트 직접 클릭 & 수첩 지원)
  for (const el of Object.values(shopOverlayEls)) {
    if (el) el.style.display = 'none';
  }
  for (const el of Object.values(lotOverlayEls)) {
    if (el) el.style.display = 'none';
  }
  for (const rb of rentBubbles) {
    if (rb?.el) rb.el.style.display = 'none';
  }

  // 결정적 순간 1개만 2초간 떴다 사라지는 반투명 글래스 한 줄 캡슐 토스트 투영
  for (const key of Object.keys(speechEls)) {
    const sp = speechEls[key];
    sp.timer -= dt;
    if (sp.timer <= 0) {
      sp.el?.remove();
      sp.moteEl?.remove();
      delete speechEls[key];
      continue;
    }
    if (titleScreenState.active || guidedTourState.active) {
      sp.el.style.display = 'none';
      continue;
    }
    const pt = projectWorldToScreen(sp.wx, sp.wy, sp.wz);
    const inBounds = pt.visible && pt.x >= 32 && pt.x <= vw - 32 && pt.y >= 64 && pt.y <= vh - 52;
    if (!inBounds || !isSpeechBubbleAllowedInCurrentView(sp.forceShow)) {
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
// 16D. [핵심 확장 콘텐츠]
//  - 현실 시간(Real-Time) 3일 차 칭호 각성 시스템 ('3일간의 갓물주 연대기' & 빨간 해안 다리 개통)
//  - 제2마을 '트와일라잇 하버 리조트 타운(Twilight Harbor Resort Town)' 노을빛 황혼~야경 무드 전환
//  - 제1마을(본점) ⇄ 제2마을(하버) 1초 양방향 왕래 & 본점 자동 배당금 토스트 피드백
// =========================================================
let chronicleCheckAccum = 0;

function getChronicleProgress() {
  const tiers = window.CHRONICLE_DAY_TIERS || [
    { day: 1, requiredHours: 0, emoji: '🌱', title: '코지 타운 명예 동장', fullBadge: 'DAY 1 · 🌱 코지 타운 명예 동장', bonusGold: 0, desc: '본점 빌딩 및 1층 상가 집중 육성 기간', rewardLabel: '기본 자격 부여' },
    { day: 2, requiredHours: 24, emoji: '🏢', title: '스트리트 상권 지배자', fullBadge: 'DAY 2 · 🏢 스트리트 상권 지배자', bonusGold: 50, desc: '최초 접속 후 현실 24시간 경과 승급', rewardLabel: '출석 보너스 +50만' },
    { day: 3, requiredHours: 48, emoji: '👑', title: '로열 하버 개발 총독', fullBadge: 'DAY 3 · 👑 로열 하버 개발 총독', bonusGold: 300, desc: '최초 접속 후 현실 48시간 경과 마스터 각성', rewardLabel: '제2마을 영구 해금 +300만' }
  ];

  const startTs = Number(state.firstStartedAt) || Date.now();
  const rawElapsedHours = Math.max(0, (Date.now() - startTs) / (1000 * 60 * 60));
  const effectiveHours = (state.day3SkipForced || state.harborUnlocked)
    ? Math.max(48.0, rawElapsedHours)
    : rawElapsedHours;

  const realDay = effectiveHours >= 48 ? 3 : effectiveHours >= 24 ? 2 : 1;
  const activeTier = tiers.find((t) => t.day === realDay) || tiers[0];
  const hoursToDay2 = Math.max(0, 24 - effectiveHours);
  const hoursToDay3 = Math.max(0, 48 - effectiveHours);

  return {
    tiers,
    realDay,
    effectiveHours,
    hoursToDay2,
    hoursToDay3,
    activeTier,
    harborReady: realDay >= 3 || !!state.harborUnlocked
  };
}

function checkRealtimeChronicleAutoUnlock(dt) {
  chronicleCheckAccum += dt;
  if (chronicleCheckAccum < 2.0) return;
  chronicleCheckAccum = 0;

  const prog = getChronicleProgress();
  if (prog.realDay >= 2 && !state.day2BonusClaimed) {
    state.day2BonusClaimed = true;
    addGold(50);
    if (!state.harborUnlocked) {
      state.vipTitle = '🏢 스트리트 상권 지배자';
    }
    syncChronicleAndStageUI();
    showToast('[2일 차 출석 승급!] 🏢 스트리트 상권 지배자 달성 · 출석 보너스 +50만 지급!', 'gold');
    saveGameState();
  }
  if (prog.realDay >= 3 && !state.harborUnlocked) {
    triggerDay3CoronationAndOpenBridge(false);
  }
}

function syncChronicleAndStageUI() {
  const prog = getChronicleProgress();
  const inTitle = !!titleScreenState.active;
  const inTour = !!guidedTourState.active;
  const inHarbor = state.activeTownStage === 2 && !!state.harborUnlocked;

  const headerTitleEl = document.getElementById('pocket-day-title-text');
  if (headerTitleEl) {
    headerTitleEl.textContent = prog.activeTier.badgeLabel || prog.activeTier.fullBadge || `DAY ${prog.realDay} · ${prog.activeTier.emoji} ${prog.activeTier.title}`;
  }

  const stampDot = document.getElementById('stamp-harbor-dot');
  if (stampDot) {
    if (state.harborUnlocked) {
      stampDot.textContent = inHarbor ? '1마을로' : 'OPEN';
      stampDot.classList.add('unlocked');
    } else {
      stampDot.textContent = prog.realDay === 2 ? 'D-1' : 'D-2';
      stampDot.classList.remove('unlocked');
    }
  }

  const stampLbl = document.getElementById('stamp-harbor-label');
  if (stampLbl) {
    stampLbl.textContent = (state.harborUnlocked && inHarbor) ? '본점복귀' : '해안타운';
  }

  const switchPill = document.getElementById('town-stage-switch-pill');
  if (switchPill) {
    const hideSwitch = !state.harborUnlocked || inTitle || inTour;
    switchPill.classList.toggle('hidden', hideSwitch);
  }
  document.getElementById('btn-switch-stage-1')?.classList.toggle('active', !inHarbor);
  const btnS2 = document.getElementById('btn-switch-stage-2');
  if (btnS2) {
    btnS2.classList.toggle('active', false);
    btnS2.classList.toggle('active-harbor', inHarbor);
  }
}

function applyTownAtmosphere(stage = 1) {
  if (!scene || !hemiLight || !dirLight) return;
  const isHarbor = stage === 2 && !!state.harborUnlocked;

  if (isHarbor) {
    if (!focusedRoomId && !focusedShopId && !focusedFirstFloorShopId && !(fpState.active && fpState.mode === 'shop')) {
      scene.background = TEX.twilightSkyBackdrop || TEX.skyBackdrop;
    }
    scene.fog = new THREE.FogExp2(0x2B1947, 0.00135);
    hemiLight.color.setHex(0xFFB38A);
    hemiLight.groundColor.setHex(0x2E1A47);
    hemiLight.intensity = 1.02;

    dirLight.color.setHex(0xFF9654);
    dirLight.intensity = 1.24;
    dirLight.position.set(-34, 42, 152);
    dirLight.target.position.set(0, 0, 118);
    dirLight.target.updateMatrixWorld();

    if (shadowFillLight) {
      shadowFillLight.color.setHex(0x818CF8);
      shadowFillLight.intensity = 0.54;
      shadowFillLight.position.set(32, 26, 92);
    }
    if (renderer) renderer.toneMappingExposure = 1.15;
    for (const pl of harborPointLights) {
      if (pl) pl.intensity = 2.05;
    }
  } else {
    if (!focusedRoomId && !focusedShopId && !focusedFirstFloorShopId && !(fpState.active && fpState.mode === 'shop')) {
      scene.background = TEX.skyBackdrop;
    }
    scene.fog = new THREE.FogExp2(0xE8F9FD, 0.0019);
    hemiLight.color.setHex(0xFFFDF9);
    hemiLight.groundColor.setHex(0xF5D0B5);
    hemiLight.intensity = 1.18;

    dirLight.color.setHex(0xFFF8EB);
    dirLight.intensity = 1.38;
    dirLight.position.set(36, 54, 38);
    dirLight.target.position.set(0, 0, 0);
    dirLight.target.updateMatrixWorld();

    if (shadowFillLight) {
      shadowFillLight.color.setHex(0xBAE6FD);
      shadowFillLight.intensity = 0.42;
      shadowFillLight.position.set(-32, 24, -22);
    }
    if (renderer) renderer.toneMappingExposure = 1.08;
    for (const pl of harborPointLights) {
      if (pl) pl.intensity = 1.35;
    }
  }
}

function showHqDividendToast(amount) {
  const pill = document.getElementById('hq-dividend-pill');
  const txt = document.getElementById('hq-dividend-text');
  if (!pill || !txt) return;
  txt.textContent = `+ 본점(1마을) 자동 배당금 +${Math.round(amount).toLocaleString()}만 입금!`;
  pill.classList.remove('hidden');
  if (hqDividendToastTimeout) clearTimeout(hqDividendToastTimeout);
  hqDividendToastTimeout = setTimeout(() => {
    pill.classList.add('hidden');
  }, 2900);
}

function travelToTownStage(targetStage = 2) {
  if (targetStage === 2 && !state.harborUnlocked) {
    openHarborChronicleModal();
    return;
  }

  closePocketPlanner();
  closeAllModalsImmediate();

  if (fpState.active) exitFirstPersonMode(false);
  if (driveState.active) exitDriveMode();

  const prevShop = focusedShopId;
  focusedRoomId = null;
  focusedShopId = null;
  focusedFirstFloorShopId = null;
  focusRevealState.pending = false;
  focusRevealState.revealed = false;
  focusRevealState.holdTimer = 0;
  if (prevShop) rebuildStandaloneShop3D(prevShop);

  state.activeTownStage = targetStage === 2 ? 2 : 1;
  hqDividendTimer = 3.6;

  controls.enabled = true;
  controls.enablePan = true;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = Math.PI * 0.44;

  applyTownAtmosphere(state.activeTownStage);
  syncChronicleAndStageUI();
  syncTopBarsByMode();

  const isMobilePortrait = window.innerWidth < 640 && window.innerHeight > window.innerWidth;
  const offset = CAM_OFFSETS[camAzimuth % 4];
  const bridgeMidLook = new THREE.Vector3(2.0, 4.8, 70.5);
  const bridgeMidPos = bridgeMidLook.clone().add(offset);

  const finalLook = state.activeTownStage === 2
    ? (isMobilePortrait ? new THREE.Vector3(0.0, 6.0, 120.0) : HARBOR_OVERVIEW_LOOK.clone())
    : (isMobilePortrait ? new THREE.Vector3(-1.2, 4.4, 8.2) : OVERVIEW_LOOK.clone());
  const finalPos = finalLook.clone().add(offset);
  const finalZoom = state.activeTownStage === 2
    ? (isMobilePortrait ? 0.42 : 0.72)
    : (isMobilePortrait ? 0.45 : 0.78);

  // 빨간 철제 아치형 해안 대교 위를 스치듯 건너가는 2단 시네마틱 카메라 글라이드 (총 ~0.95초!)
  startSmoothCameraTween(bridgeMidPos, bridgeMidLook, 0.68, 0.42, () => {
    startSmoothCameraTween(finalPos, finalLook, finalZoom, 0.52, null);
  });

  if (state.activeTownStage === 2) {
    showToast('🌅 빨간 해안 아치교를 건너 [제2마을: 트와일라잇 하버]에 도착했습니다!', 'gold');
  } else {
    showToast('☀️ 화사한 낮 조명의 [제1마을: 코지 본점 타운]으로 복귀했습니다!', 'mint');
  }
  saveGameState();
}

function openHarborChronicleModal() {
  closeAllModalsImmediate('harbor-chronicle-modal');
  renderHarborChronicleModal();
  document.getElementById('harbor-chronicle-modal')?.classList.remove('hidden');
}

function renderHarborChronicleModal() {
  const prog = getChronicleProgress();
  const badgeEl = document.getElementById('chronicle-elapsed-badge');
  if (badgeEl) {
    badgeEl.textContent = prog.harborReady
      ? `실시간 ${Math.floor(prog.effectiveHours)}시간 달성 · 개통 완료`
      : `실시간 ${prog.effectiveHours.toFixed(1)}h 경과 · D-${Math.max(1, 3 - prog.realDay)}`;
  }

  const bannerEl = document.getElementById('chronicle-current-banner');
  if (bannerEl) {
    const nextHint = prog.harborReady
      ? '축하합니다! 빨간 철제 아치형 해안 다리가 영구 개통되어 언제든 1초 만에 제1마을 ⇄ 제2마을을 오갈 수 있습니다.'
      : `제2마을 개통 자격(3일 차 · 48시간)까지 남은 현실 시간: 약 ${Math.ceil(prog.hoursToDay3)}시간 (자산 규모 무관 · 출석 연대기 기준)`;
    bannerEl.innerHTML = `
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <span class="kw-chip tone-gold !text-[11px]">현재 작위 · REAL-TIME DAY ${prog.realDay}</span>
        <span class="font-title text-[12px] text-[#92400E]">${state.harborUnlocked ? '🌅 트와일라잇 하버 개통됨' : '🌉 해안 대교 개통 대기'}</span>
      </div>
      <div class="font-title text-[19px] sm:text-[21px] text-[#3A2E2B] mt-1.5">${prog.activeTier.emoji} ${prog.activeTier.title}</div>
      <p class="font-body text-[12px] font-semibold text-[#5C4942] mt-1 leading-snug">${nextHint}</p>
    `;
  }

  const listEl = document.getElementById('chronicle-days-list');
  if (listEl) {
    listEl.innerHTML = prog.tiers.map((t) => {
      const achieved = prog.realDay >= t.day || (t.day === 3 && state.harborUnlocked);
      const isCurrent = prog.realDay === t.day;
      const reqHours = t.hoursRequired ?? t.requiredHours ?? 0;
      const rewardTxt = t.rewardText || t.rewardLabel || '자격 부여';
      return `
        <div class="diary-subcard flex items-center justify-between gap-3 ${isCurrent ? '!border-2 !border-[#F59E0B] !bg-[#FFFBEB]' : ''}">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-11 h-11 rounded-2xl border-2 border-[#3A2E2B] flex items-center justify-center text-[22px] shrink-0" style="background:${achieved ? 'linear-gradient(180deg,#FFE869,#F59E0B)' : '#F3EDE4'};">
              ${t.emoji}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-title text-[14px] text-[#3A2E2B]">${t.day}일 차 · [${t.emoji} ${t.title}]</span>
                <span class="kw-chip ${achieved ? 'tone-mint' : 'tone-cream'} !text-[10px] !py-0.5 !px-2">${achieved ? '달성 완료' : `${reqHours}시간 경과 시`}</span>
              </div>
              <div class="font-body text-[11.5px] font-semibold text-[#69544C] mt-0.5">${t.desc}</div>
            </div>
          </div>
          <div class="shrink-0 text-right">
            <span class="kw-chip tone-gold !text-[10.5px] !py-1 !px-2.5">${rewardTxt}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  const travelBtn = document.getElementById('btn-chronicle-travel-harbor');
  const skipBtn = document.getElementById('btn-skip-day3-test');
  if (travelBtn) {
    travelBtn.classList.toggle('hidden', !state.harborUnlocked);
    const destText = state.activeTownStage === 2
      ? '☀️ 빨간 해안 다리 건너 제1마을(본점)로 이동 ➔'
      : '🌅 빨간 해안 다리 건너 제2마을(트와일라잇 하버) 이동 ➔';
    const spanEl = travelBtn.querySelector('span');
    if (spanEl) spanEl.textContent = destText;
  }
  if (skipBtn) {
    skipBtn.classList.toggle('hidden', !!state.harborUnlocked);
  }
}

function triggerDay3CoronationAndOpenBridge(autoTravel = true) {
  const wasUnlocked = !!state.harborUnlocked;
  if (!state.day2BonusClaimed) {
    state.day2BonusClaimed = true;
    state.gold += 50;
  }
  state.harborUnlocked = true;
  state.vipTitle = '👑 로열 하버 개발 총독';

  if (!wasUnlocked) {
    state.gold += 300;
    state.stats.totalEarned = (state.stats.totalEarned || 0) + 350;
    hudAnim.targetGold = state.gold;
  }

  syncHarborBridgeGate3D();
  syncChronicleAndStageUI();
  updateTopHUDTargets();
  updateForbesRankAndHUD(false);

  playGoldenBellSound();
  const fwCols = [0xFFD93D, 0xFF6B6B, 0x38BDF8, 0xA855F7, 0x34D399];
  for (let i = 0; i < 7; i++) {
    spawnPoofParticles3D(-12 + i * 4, 8.5 + (i % 2) * 2.5, 72.0, fwCols[i % fwCols.length], 16);
    spawnPoofParticles3D(-14 + i * 4.5, 9.5 + (i % 2) * 2.5, 118.0, fwCols[(i + 2) % fwCols.length], 18);
  }

  const corBanner = document.getElementById('day3-coronation-banner');
  if (corBanner) {
    corBanner.classList.remove('hidden');
    if (coronationBannerTimeout) clearTimeout(coronationBannerTimeout);
    coronationBannerTimeout = setTimeout(() => {
      corBanner.classList.add('hidden');
    }, 4800);
  }

  saveGameState();
  if (autoTravel) {
    travelToTownStage(2);
  } else {
    renderHarborChronicleModal();
  }
}

function triggerDay3InstantSkip() {
  state.day3SkipForced = true;
  state.firstStartedAt = Date.now() - 49 * 60 * 60 * 1000;
  try {
    localStorage.setItem(FIRST_START_TS_KEY, String(state.firstStartedAt));
  } catch (e) {
    // ignore storage quota errors
  }
  document.getElementById('harbor-chronicle-modal')?.classList.add('hidden');
  triggerDay3CoronationAndOpenBridge(true);
}

// =========================================================
// 16E. [신규 핵심 경제 & PvP 콘텐츠]
//  - 『🛋️ 메종 드 럭셔리 가구·설비 백화점(Furniture Flagship Shop)』 4등급 카탈로그 & 창고 인벤토리
//  - 『🦹‍♂️ 1:1 럭셔리 쇼룸 플렉스 꾸미기 결투(PvP / 라이벌 쇼룸 대결)』 듀얼 모델하우스 & 3인 심사위원 평가
// =========================================================
let flagshipShopTab = 'bed';
let flagshipTierFilter = '0';
let duelActiveCat = 'all';

function countTotalFurnitureInventory() {
  let sum = 0;
  for (const qty of Object.values(state.furnitureInventory || {})) {
    sum += Math.max(0, Number(qty) || 0);
  }
  return sum;
}

function syncFlagshipInventoryBadge() {
  const totalInv = countTotalFurnitureInventory();
  const sumEl = document.getElementById('flagship-inv-summary');
  if (sumEl) sumEl.textContent = `내 보유 창고: ${totalInv}개 확보 중`;
  const stampEl = document.getElementById('stamp-inv-badge');
  if (stampEl) {
    stampEl.textContent = String(totalInv);
    stampEl.classList.toggle('hidden', totalInv <= 0);
  }
}

function openFurnitureFlagshipDrawer(defaultCat = null) {
  if (defaultCat && defaultCat !== 'all') flagshipShopTab = defaultCat;
  closeAllModalsImmediate('flagship-shop-drawer');
  syncFlagshipInventoryBadge();
  renderFurnitureFlagshipDrawer();
  document.getElementById('flagship-shop-drawer')?.classList.remove('hidden');

  // 타운 뷰(1마을)에서 백화점을 열었을 때 좌측~중앙 75% 화면에 3D 메종 드 럭셔리 통유리 쇼윈도가 비스듬히 보이도록 포커싱!
  if (!duelState.active && !focusedRoomId && !focusedShopId && !focusedFirstFloorShopId && !driveState.active && !fpState.active && state.activeTownStage !== 2) {
    startSmoothCameraTween(
      new THREE.Vector3(33.5, 13.8, 16.8),
      new THREE.Vector3(23.5, 2.2, -5.2),
      1.42,
      0.5,
      null
    );
  }
}

function renderFurnitureFlagshipDrawer() {
  const listEl = document.getElementById('flagship-items-list');
  if (!listEl) return;

  document.querySelectorAll('[data-shopcat]').forEach((btn) => {
    const active = btn.getAttribute('data-shopcat') === flagshipShopTab;
    btn.classList.toggle('active', active);
  });
  document.querySelectorAll('[data-shoptier]').forEach((btn) => {
    const active = btn.getAttribute('data-shoptier') === String(flagshipTierFilter);
    btn.classList.toggle('active', active);
  });

  const tierMeta = window.FURNITURE_TIER_META || {};
  const rawItems = (FURNITURE_CATALOG[flagshipShopTab] || []).filter((it) => it.cost > 0);
  const filtered = (flagshipTierFilter === '0' || flagshipTierFilter === 'all')
    ? rawItems
    : rawItems.filter((it) => String(it.tier || 1) === String(flagshipTierFilter));

  listEl.innerHTML = filtered.map((it) => {
    const tNum = it.tier || 1;
    const tInfo = tierMeta[tNum] || { badge: `Tier ${tNum}`, bg: '#FEF3C7', color: '#92400E', border: '#F59E0B' };
    const invQty = state.furnitureInventory?.[it.id] || 0;
    const canAfford = (state.gold || 0) >= it.cost;

    return `
      <div class="diary-subcard !p-2.5 space-y-2 border-2" style="border-color:${tNum >= 4 ? '#F59E0B' : '#E8CCB0'};background:${tNum >= 4 ? '#FFFDF2' : '#FFFDF9'};">
        <div class="flex items-center gap-2.5">
          <div class="w-16 h-14 rounded-xl bg-[#FFFDF7] border border-[#E8CCB0] flex items-center justify-center shrink-0 overflow-hidden">
            ${getOrRender3DCatalogPreview(it.id, 96, 68)}
          </div>
          <div class="min-w-0 flex-1 space-y-0.5">
            <div class="flex items-center justify-between gap-1">
              <span class="px-2 py-0.5 rounded-full font-extrabold text-[9.5px]" style="background:${tInfo.bg};color:${tInfo.color};">${tInfo.badge}</span>
              ${invQty > 0 ? `<span class="kw-chip tone-mint !text-[9.5px] !py-0.5 !px-1.5">📦 보유 ${invQty}</span>` : ''}
            </div>
            <div class="font-title text-[13px] text-[#3A2E2B] truncate">${it.name}</div>
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-body text-[10.5px] font-bold text-[#15803D]">${it.chip}</span>
              <span class="font-body text-[10.5px] font-bold text-[#7E22CE]">· 럭셔리 +${it.luxuryPts ?? it.luxuryScore ?? (tNum * 100)}점</span>
            </div>
          </div>
        </div>
        <button type="button" data-buy-flagship="${it.id}" ${!canAfford ? 'disabled' : ''} class="jelly-action-btn ${tNum >= 4 ? 'btn-gold-lip' : 'btn-coral-lip'} w-full py-1.5 !text-[11.5px] ${!canAfford ? 'opacity-50 cursor-not-allowed' : ''}">
          ${createCustomSVGIcon('coin_stack', 14)}
          <span>${canAfford ? `${it.cost.toLocaleString()}만 구매 · 창고 보관` : `${it.cost.toLocaleString()}만 (자산 부족)`}</span>
        </button>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('[data-buy-flagship]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const iid = btn.getAttribute('data-buy-flagship');
      buyFlagshipFurnitureToInventory(flagshipShopTab, iid);
    });
  });
}

function buyFlagshipFurnitureToInventory(cat, itemId) {
  const item = getFurnitureItemDef(cat, itemId);
  if (!item) return;
  if (!spendGold(item.cost)) return;

  if (!state.furnitureInventory) state.furnitureInventory = {};
  state.furnitureInventory[itemId] = (state.furnitureInventory[itemId] || 0) + 1;

  playShopDoorChimeSound();
  if (flagshipShop3DGroup) {
    triggerSquashStretch(flagshipShop3DGroup, 1.12);
    spawnPoofParticles3D(25.2, 2.8, -4.5, 0xFFD700, 12);
  }

  syncFlagshipInventoryBadge();
  updateTopHUDTargets();
  updateForbesRankAndHUD(true);
  renderFurnitureFlagshipDrawer();
  if (duelState.active) {
    renderDuelBottomDock();
  }
  if (focusedRoomId && focusRevealState.revealed) {
    renderFocusedRoomInspector();
  }

  showToast(`🛋️ [${item.name}] 백화점 구매 완료! 세입자 방 세팅 및 1:1 쇼룸 결투에 즉시 출격 가능합니다!`, 'gold');
  saveGameState();
}

// --------------------- 『1:1 럭셔리 쇼룸 플렉스 꾸미기 결투』 3D 듀얼 스테이지 엔진 ---------------------
function createDuelOverheadSign3D(titleText, subText, isOpponent = false) {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 128;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = isOpponent ? '#2E1065' : '#1E1B18';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = isOpponent ? '#C084FC' : '#FBBF24';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 496, 112);

  ctx.fillStyle = isOpponent ? '#F3E8FF' : '#FEF3C7';
  ctx.font = 'bold 38px Jua, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(titleText, 256, 58);

  ctx.fillStyle = isOpponent ? '#FBBF24' : '#34D399';
  ctx.font = 'bold 26px Jua, sans-serif';
  ctx.fillText(subText, 256, 98);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex });
  const mesh = new THREE.Mesh(GEO.quad, mat);
  mesh.scale.set(9.2, 2.25, 1);
  return mesh;
}

function playCameraShutterSFX() {
  if (!sfxEnabled) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!window._landlordAudioCtx) window._landlordAudioCtx = new AC();
    const ctx = window._landlordAudioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1450, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.06);
    g.gain.setValueAtTime(0.11, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  } catch (e) {}
}

function getDuelOpponentMode(opp) {
  return opp?.modeTab || opp?.mode || 'rival';
}

function getDuelOpponentDef() {
  const list = window.SHOWROOM_DUEL_OPPONENTS || [];
  if (duelState.tab === 'rival') {
    return list.find((o) => getDuelOpponentMode(o) === 'rival') || list[0];
  }
  const pvpList = list.filter((o) => getDuelOpponentMode(o) === 'pvp');
  return pvpList.find((o) => o.id === duelState.opponentId) || pvpList[0] || list[0];
}

function pickOpponentItemForCat(opp, cat) {
  const pool = opp?.aiBuildPool;
  if (Array.isArray(pool)) {
    const matchId = pool.find((id) => getFurnitureItemDef(cat, id));
    if (matchId) return matchId;
  } else if (pool && Array.isArray(pool[cat]) && pool[cat].length > 0) {
    return pool[cat][pool[cat].length - 1];
  }
  const catList = FURNITURE_CATALOG[cat] || [];
  return catList[Math.min(catList.length - 1, 2)]?.id || catList[0]?.id;
}

function calcShowroomScoreBreakdown(equippedMap) {
  let valuePts = 0;
  let highCatCount = 0;
  let limitedCount = 0;

  for (const cat of ['bed', 'sofa', 'appliance', 'decor']) {
    const eqId = equippedMap?.[cat];
    const fDef = getFurnitureItemDef(cat, eqId);
    if (!fDef) continue;
    const tier = fDef.tier || 1;
    const rawLux = fDef.luxuryPts ?? fDef.luxuryScore ?? (tier * 90);
    valuePts += rawLux;
    if (tier >= 2) highCatCount += 1;
    if (tier >= 4) limitedCount += 1;
  }

  // ① 총 럭셔리 가치(50% 스케일) + ② 4대 카테고리 조화도 보너스(30%) + ③ Tier 4 만수르 한정판 가산점(20%)
  const scoreValue = Math.round(valuePts * 0.55);
  const scoreHarmony = highCatCount === 4 ? 720 : highCatCount * 155;
  const scoreLimited = limitedCount * 420;
  const total = scoreValue + scoreHarmony + scoreLimited;

  return {
    scoreValue,
    scoreHarmony,
    scoreLimited,
    highCatCount,
    limitedCount,
    total
  };
}

function rebuildSingleDuelShowroom3D(isOpponent, dropCategory = null) {
  const targetContainer = isOpponent ? duelState.oppRoomGrp : duelState.myRoomGrp;
  if (!targetContainer) return;
  clearGroupChildren(targetContainer);

  const eq = isOpponent ? duelState.oppEquipped : duelState.myEquipped;
  const rw = 11.4;
  const rd = 7.4;
  const rh = 4.55;

  const decorDef = getFurnitureItemDef('decor', eq.decor);
  const floorTex = TEX[decorDef?.floorKey || 'floor2'] || TEX.floor2;
  const wallTex = TEX[decorDef?.wallKey || 'wallCream'] || TEX.wallCream;
  const floorMat = makeClayMat(0xFFFFFF, { map: floorTex, roughness: 0.5 });
  const wallMat = makeClayMat(0xFFFFFF, { map: wallTex, roughness: 0.62 });
  const frameTrimMat = isOpponent ? MAT.kangPurple : MAT.pureGold24k;

  // 단면 투시(Cutaway) 쇼룸 바닥 & 뒷벽 & 외곽 측벽
  targetContainer.add(createRoundedToyMesh(rw, 0.24, rd, floorMat, 0, 0.12, 0, 0.05));
  targetContainer.add(createRoundedToyMesh(rw + 0.28, 0.14, rd + 0.28, frameTrimMat, 0, 0.05, 0, 0.04));
  targetContainer.add(createRoundedToyMesh(rw, rh, 0.24, wallMat, 0, rh * 0.5, -rd * 0.5 + 0.12, 0.05));
  const sideX = isOpponent ? (rw * 0.5 - 0.12) : (-rw * 0.5 + 0.12);
  targetContainer.add(createRoundedToyMesh(0.24, rh, rd, wallMat, sideX, rh * 0.5, 0, 0.05));

  // 뒷벽 파노라마 아치형 창문 & 골드 몰딩
  targetContainer.add(createRoundedToyMesh(4.6, 2.5, 0.28, MAT.windowGlow, 0, 2.45, -rd * 0.5 + 0.16, 0.06));
  targetContainer.add(createRoundedToyMesh(4.9, 0.14, 0.34, frameTrimMat, 0, 3.74, -rd * 0.5 + 0.18, 0.03));

  // 1) 침대 (좌측 후방)
  const bedMesh = createCatalogBed3D(eq.bed || 'bed_basic');
  bedMesh.position.set(-3.15, 0.24, -1.55);
  targetContainer.add(bedMesh);

  // 2) 소파 / 그랜드 피아노 (중앙 전방)
  const sofaMesh = createCatalogSofa3D(eq.sofa || 'sofa_basic');
  sofaMesh.position.set(0.35, 0.24, 1.05);
  targetContainer.add(sofaMesh);

  // 3) 가전 · 설비 (우측 후방)
  const appMesh = createCatalogAppliance3D(eq.appliance || 'app_basic', 5.2, rd, rh);
  appMesh.position.set(2.35, 0.24, -0.45);
  targetContainer.add(appMesh);

  // 4) Tier 4 블루 다이아몬드 & 명화 / 기본 선반 오브제 (좌전방 포컬 포인트)
  const decoHolder = new THREE.Group();
  if (eq.decor === 'dec_diamond_art') {
    decoHolder.add(createRoundedToyMesh(0.95, 1.18, 0.95, MAT.white, -3.55, 0.82, 1.95, 0.08));
    decoHolder.add(createRoundedToyMesh(1.05, 0.12, 1.05, MAT.pureGold24k, -3.55, 1.44, 1.95, 0.03));
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.46, 0), MAT.screenCyan);
    gem.position.set(-3.55, 1.98, 1.95);
    decoHolder.add(gem);
    decoHolder.add(createRoundedToyMesh(2.4, 1.45, 0.12, MAT.pureGold24k, -3.2, 2.65, -rd * 0.5 + 0.3, 0.04));
    decoHolder.add(createRoundedToyMesh(2.05, 1.12, 0.15, MAT.coral, -3.2, 2.65, -rd * 0.5 + 0.33, 0.02));
  } else if (eq.decor === 'dec_harbor_royal' || eq.decor === 'dec_penthouse') {
    const chand = new THREE.Group();
    chand.position.set(0, rh - 0.55, 0.2);
    chand.add(createRoundedToyMesh(1.3, 0.12, 1.3, MAT.pureGold24k, 0, 0, 0, 0.04));
    const cOrb = new THREE.Mesh(GEO.sphere, MAT.neonYellow);
    cOrb.scale.setScalar(0.32);
    cOrb.position.set(0, -0.22, 0);
    chand.add(cOrb);
    decoHolder.add(chand);
  } else if (eq.decor === 'dec_basic_shelf') {
    decoHolder.add(createRoundedToyMesh(1.4, 1.35, 0.45, MAT.woodWarm, -3.55, 0.9, 1.95, 0.05));
  }
  targetContainer.add(decoHolder);

  // 방금 배치한 카테고리 가구가 하늘에서 '쿵!' 하고 젤리 바운스로 떨어지는 타격감!
  const worldRoomX = SHOWROOM_DUEL_ORIGIN.x + (isOpponent ? 6.85 : -6.85);
  const worldRoomZ = SHOWROOM_DUEL_ORIGIN.z;
  if (dropCategory === 'bed') {
    playDropBouncePlacement3D(bedMesh, worldRoomX - 3.15, 0.6, worldRoomZ - 1.55);
  } else if (dropCategory === 'sofa') {
    playDropBouncePlacement3D(sofaMesh, worldRoomX + 0.35, 0.6, worldRoomZ + 1.05);
  } else if (dropCategory === 'appliance') {
    playDropBouncePlacement3D(appMesh, worldRoomX + 2.35, 0.6, worldRoomZ - 0.45);
  } else if (dropCategory === 'decor') {
    playDropBouncePlacement3D(targetContainer, worldRoomX, 0.5, worldRoomZ);
  }
}

function buildShowroomDuelStage3D() {
  if (duelState.stageGroup) {
    scene.remove(duelState.stageGroup);
    duelState.stageGroup = null;
  }

  const grp = new THREE.Group();
  grp.position.set(SHOWROOM_DUEL_ORIGIN.x, SHOWROOM_DUEL_ORIGIN.y, SHOWROOM_DUEL_ORIGIN.z);
  scene.add(grp);
  duelState.stageGroup = grp;

  // 럭셔리 방송국 쇼케이스 포디움 무대 바닥 & 황금 VS 카펫
  grp.add(createRoundedToyMesh(31.5, 0.45, 16.5, MAT.asphaltRoad, 0, -0.22, 0.8, 0.14));
  grp.add(createRoundedToyMesh(29.6, 0.14, 14.6, MAT.plazaCream, 0, 0.04, 0.8, 0.1));
  grp.add(createRoundedToyMesh(1.15, 0.18, 9.2, MAT.pureGold24k, 0, 0.1, 0.2, 0.04));

  // 전용 스튜디오 조명 2기
  const leftSpot = new THREE.PointLight(0xFFFbeb, 1.9, 28);
  leftSpot.position.set(-6.85, 8.5, 6.5);
  const rightSpot = new THREE.PointLight(0xF3E8FF, 1.9, 28);
  rightSpot.position.set(6.85, 8.5, 6.5);
  grp.add(leftSpot, rightSpot);

  const opp = getDuelOpponentDef();

  // 좌측: 내 쇼룸 + 상단 네임플레이트 + 내 아바타
  const myRoomGrp = new THREE.Group();
  myRoomGrp.position.set(-6.85, 0.12, 0);
  grp.add(myRoomGrp);
  duelState.myRoomGrp = myRoomGrp;

  const mySign = createDuelOverheadSign3D('👑 내 럭셔리 쇼룸', 'MY LUXURY SHOWROOM', false);
  mySign.position.set(-6.85, 6.05, -2.2);
  grp.add(mySign);

  const myAvatar = createChibiPerson3D('landlord_avatar', 1);
  myAvatar.position.set(-13.3, 0.14, 2.6);
  myAvatar.rotation.y = 0.42;
  grp.add(myAvatar);

  // 우측: 상대(강 회장 / 온라인 랭커) 쇼룸 + 상단 네임플레이트 + 상대 아바타
  const oppRoomGrp = new THREE.Group();
  oppRoomGrp.position.set(6.85, 0.12, 0);
  grp.add(oppRoomGrp);
  duelState.oppRoomGrp = oppRoomGrp;

  const oppSign = createDuelOverheadSign3D(`${opp.badge} · ${opp.name}`, 'OPPONENT SHOWROOM', true);
  oppSign.position.set(6.85, 6.05, -2.2);
  grp.add(oppSign);

  const oppAvatar = createChibiPerson3D(opp.avatarRole || 'rival_kang', 3);
  oppAvatar.position.set(13.3, 0.14, 2.6);
  oppAvatar.rotation.y = -0.42;
  grp.add(oppAvatar);

  const judgeGrp = new THREE.Group();
  grp.add(judgeGrp);
  duelState.judgeGroup = judgeGrp;
  duelState.judges = [];

  rebuildSingleDuelShowroom3D(false, null);
  rebuildSingleDuelShowroom3D(true, null);
}

function getBestOwnedFurnitureForDuelInit(cat) {
  const list = FURNITURE_CATALOG[cat] || [];
  let best = list[0]?.id || null;
  let bestScore = -1;
  for (const it of list) {
    let owned = (state.furnitureInventory?.[it.id] || 0) > 0 || it.cost === 0;
    if (!owned) {
      for (const b of Object.values(state.buildings || {})) {
        if ((b.rooms || []).some((rm) => rm.ownedFurniture?.[cat]?.includes(it.id) || rm.unlockedFurniture?.[cat]?.includes(it.id))) {
          owned = true;
          break;
        }
      }
    }
    const pts = it.luxuryPts ?? it.luxuryScore ?? 0;
    if (owned && pts > bestScore) {
      bestScore = pts;
      best = it.id;
    }
  }
  return best;
}

function enterShowroomFlexDuel(initialTab = 'rival') {
  closeAllModalsImmediate();
  if (fpState.active) exitFirstPersonMode(false);
  if (driveState.active) exitDriveMode();
  if (focusedRoomId) focusedRoomId = null;
  if (focusedFirstFloorShopId) focusedFirstFloorShopId = null;
  if (focusedShopId) {
    const prevS = focusedShopId;
    focusedShopId = null;
    rebuildStandaloneShop3D(prevS);
  }

  duelState.active = true;
  duelState.judging = false;
  duelState.judged = false;
  duelState.tab = initialTab === 'pvp' ? 'pvp' : 'rival';
  const pvpList = (window.SHOWROOM_DUEL_OPPONENTS || []).filter((o) => getDuelOpponentMode(o) === 'pvp');
  if (duelState.tab === 'pvp' && pvpList.length > 0) {
    const pick = pvpList[(state.duelTrophies || 0) % pvpList.length];
    duelState.opponentId = pick.id;
  } else {
    duelState.opponentId = 'duel_kang';
  }

  duelState.myEquipped = {
    bed: getBestOwnedFurnitureForDuelInit('bed'),
    sofa: getBestOwnedFurnitureForDuelInit('sofa'),
    appliance: getBestOwnedFurnitureForDuelInit('appliance'),
    decor: getBestOwnedFurnitureForDuelInit('decor')
  };
  duelState.oppEquipped = {
    bed: 'bed_wood_single',
    sofa: 'sofa_simple_lamp',
    appliance: 'app_mini_fridge',
    decor: 'dec_basic_shelf'
  };
  duelState.aiStepTimer = 1.15;
  duelState.aiPlacedSteps = 0;

  document.getElementById('duel-result-drawer')?.classList.add('hidden');
  document.getElementById('duel-catalog-dock')?.classList.remove('hidden');

  buildShowroomDuelStage3D();
  syncDuelScoreHUD();
  renderDuelBottomDock();
  syncTopBarsByMode();

  // 좌·우 2개의 단면 쇼룸이 중앙 화면에 나란히 한눈에 들어오는 황금 비율 카메라 프레이밍!
  controls.enabled = true;
  controls.enablePan = false;
  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  const fitZoom = THREE.MathUtils.clamp(aspect >= 1.5 ? 1.24 : 0.92, 0.72, 1.38);
  startSmoothCameraTween(
    new THREE.Vector3(SHOWROOM_DUEL_ORIGIN.x, 14.5, SHOWROOM_DUEL_ORIGIN.z + 26.8),
    new THREE.Vector3(SHOWROOM_DUEL_ORIGIN.x, 1.85, SHOWROOM_DUEL_ORIGIN.z + 0.8),
    fitZoom,
    0.52,
    null
  );

  const opp = getDuelOpponentDef();
  showToast(`🦹‍♂️ [${opp.name}] 1:1 럭셔리 쇼룸 플렉스 결투 개막! 보유한 하이엔드 가구로 압도하세요!`, 'gold');
}

function switchShowroomDuelTab(nextTab) {
  if (!duelState.active) return;
  if (nextTab === 'pvp') {
    const pvpList = (window.SHOWROOM_DUEL_OPPONENTS || []).filter((o) => getDuelOpponentMode(o) === 'pvp');
    const curIdx = pvpList.findIndex((o) => o.id === duelState.opponentId);
    const nextOpp = pvpList[(curIdx + 1) % Math.max(1, pvpList.length)];
    duelState.tab = 'pvp';
    if (nextOpp) duelState.opponentId = nextOpp.id;
  } else {
    duelState.tab = 'rival';
    duelState.opponentId = 'duel_kang';
  }
  duelState.judging = false;
  duelState.judged = false;
  duelState.oppEquipped = {
    bed: 'bed_wood_single',
    sofa: 'sofa_simple_lamp',
    appliance: 'app_mini_fridge',
    decor: 'dec_basic_shelf'
  };
  duelState.aiStepTimer = 0.95;
  duelState.aiPlacedSteps = 0;
  document.getElementById('duel-result-drawer')?.classList.add('hidden');
  document.getElementById('duel-catalog-dock')?.classList.remove('hidden');

  buildShowroomDuelStage3D();
  syncDuelScoreHUD();
  renderDuelBottomDock();
}

function exitShowroomFlexDuel() {
  if (!duelState.active) return;
  duelState.active = false;
  duelState.judging = false;
  duelState.judged = false;
  if (duelState.stageGroup) {
    scene.remove(duelState.stageGroup);
    duelState.stageGroup = null;
  }
  document.getElementById('duel-result-drawer')?.classList.add('hidden');
  document.getElementById('flagship-shop-drawer')?.classList.add('hidden');
  controls.enablePan = true;
  setOverviewCamera(true);
}

function syncDuelScoreHUD() {
  const opp = getDuelOpponentDef();
  const myBrk = calcShowroomScoreBreakdown(duelState.myEquipped);
  const oppBrk = calcShowroomScoreBreakdown(duelState.oppEquipped);

  const myLbl = document.getElementById('duel-my-score-label');
  const oppLbl = document.getElementById('duel-opp-score-label');
  const potChip = document.getElementById('duel-stake-badge') || document.getElementById('duel-prize-pot-chip');
  const tugFill = document.getElementById('duel-tug-fill');

  if (myLbl) myLbl.textContent = `👑 내 럭셔리 쇼룸: ${myBrk.total.toLocaleString()}점`;
  if (oppLbl) oppLbl.textContent = `${getDuelOpponentMode(opp) === 'rival' ? '🦹‍♂️' : '🏆'} ${opp.name}: ${oppBrk.total.toLocaleString()}점`;
  if (potChip) potChip.textContent = `우승 상금 +${(opp.stakePrize * 2).toLocaleString()}만`;

  const sum = Math.max(1, myBrk.total + oppBrk.total);
  const myRatio = THREE.MathUtils.clamp(Math.round((myBrk.total / sum) * 100), 12, 88);
  if (tugFill) tugFill.style.width = `${myRatio}%`;

  const tabRival = document.getElementById('btn-duel-tab-rival');
  const tabPvp = document.getElementById('btn-duel-tab-pvp');
  if (tabRival) tabRival.classList.toggle('active', duelState.tab === 'rival');
  if (tabPvp) tabPvp.classList.toggle('active', duelState.tab === 'pvp');
}

function isFurnitureOwnedByPlayerAnywhere(cat, itemId) {
  if ((state.furnitureInventory?.[itemId] || 0) > 0) return true;
  const def = getFurnitureItemDef(cat, itemId);
  if (def && def.cost === 0) return true;
  for (const b of Object.values(state.buildings || {})) {
    for (const rm of (b.rooms || [])) {
      if (rm.ownedFurniture?.[cat]?.includes(itemId) || rm.unlockedFurniture?.[cat]?.includes(itemId)) return true;
    }
  }
  return false;
}

function renderDuelBottomDock() {
  const rowEl = document.getElementById('duel-items-row');
  if (!rowEl) return;

  document.querySelectorAll('[data-duelcat]').forEach((btn) => {
    const active = btn.getAttribute('data-duelcat') === duelActiveCat;
    btn.classList.toggle('active', active);
  });

  const tierMeta = window.FURNITURE_TIER_META || {};
  const targetCats = duelActiveCat === 'all'
    ? ['bed', 'sofa', 'appliance', 'decor']
    : [duelActiveCat];

  const list = [];
  for (const ck of targetCats) {
    for (const rawIt of (FURNITURE_CATALOG[ck] || [])) {
      if (duelActiveCat === 'all' && rawIt.cost === 0 && !isFurnitureOwnedByPlayerAnywhere(ck, rawIt.id)) continue;
      list.push({ ...rawIt, _cat: ck });
    }
  }

  // 내가 가구 백화점에서 사둔 창고 보유 가구 최우선 정렬 -> 전체 보유 가구 -> 높은 럭셔리 점수 순!
  list.sort((a, b) => {
    const invA = (state.furnitureInventory?.[a.id] || 0) > 0 ? 1 : 0;
    const invB = (state.furnitureInventory?.[b.id] || 0) > 0 ? 1 : 0;
    if (invA !== invB) return invB - invA;
    const ownA = isFurnitureOwnedByPlayerAnywhere(a._cat, a.id) ? 1 : 0;
    const ownB = isFurnitureOwnedByPlayerAnywhere(b._cat, b.id) ? 1 : 0;
    if (ownA !== ownB) return ownB - ownA;
    const ptsA = a.luxuryPts ?? a.luxuryScore ?? 0;
    const ptsB = b.luxuryPts ?? b.luxuryScore ?? 0;
    return ptsB - ptsA;
  });

  rowEl.innerHTML = list.map((it) => {
    const ck = it._cat;
    const isEquipped = duelState.myEquipped?.[ck] === it.id;
    const isOwned = isFurnitureOwnedByPlayerAnywhere(ck, it.id);
    const invCnt = state.furnitureInventory?.[it.id] || 0;
    const tInfo = tierMeta[it.tier || 1] || { short: 'T1', bg: '#FEF3C7', color: '#92400E' };
    const itemPts = it.luxuryPts ?? it.luxuryScore ?? ((it.tier || 1) * 80);

    return `
      <button type="button" data-duel-cat="${ck}" data-duel-equip="${it.id}" data-duel-needbuy="${isOwned ? '0' : '1'}" class="shrink-0 w-[172px] rounded-2xl p-2 border-2 text-left transition-transform active:scale-95 flex items-center gap-2 ${isEquipped ? 'bg-[#ECFDF5] border-[#10B981]' : isOwned ? 'bg-[#FFFDF5] border-[#F59E0B]' : 'bg-white/90 border-[#D6C5B5]'}">
        <div class="w-12 h-12 rounded-xl bg-[#FFFDF7] border border-[#E8CCB0] flex items-center justify-center shrink-0 overflow-hidden">
          ${getOrRender3DCatalogPreview(it.id, 72, 54)}
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1">
            <span class="px-1.5 py-0.5 rounded-full font-extrabold text-[9px]" style="background:${tInfo.bg};color:${tInfo.color};">${tInfo.short}</span>
            <span class="font-num text-[10px] text-[#7E22CE]">+${itemPts.toLocaleString()}점</span>
          </div>
          <div class="font-title text-[11.5px] text-[#3A2E2B] truncate mt-0.5">${it.name}</div>
          <div class="font-title text-[10px] mt-0.5 ${isEquipped ? 'text-[#059669]' : isOwned ? 'text-[#B45309]' : 'text-[#DC2626]'}">
            ${isEquipped ? '✔ 배치됨' : isOwned ? `📦 보유출격${invCnt > 0 ? `(${invCnt})` : ''}` : `⚡ 현장공수 ${it.cost.toLocaleString()}만`}
          </div>
        </div>
      </button>
    `;
  }).join('');

  rowEl.querySelectorAll('[data-duel-equip]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ck = btn.getAttribute('data-duel-cat') || 'bed';
      const iid = btn.getAttribute('data-duel-equip');
      const needBuy = btn.getAttribute('data-duel-needbuy') === '1';
      equipDuelFurnitureItem(ck, iid, needBuy);
    });
  });
}

function equipDuelFurnitureItem(cat, itemId, needBuy = false) {
  if (!duelState.active || duelState.judging) return;
  const item = getFurnitureItemDef(cat, itemId);
  if (!item) return;

  if (needBuy) {
    if (!spendGold(item.cost)) return;
    if (!state.furnitureInventory) state.furnitureInventory = {};
    state.furnitureInventory[itemId] = (state.furnitureInventory[itemId] || 0) + 1;
    syncFlagshipInventoryBadge();
    updateTopHUDTargets();
  }

  duelState.myEquipped[cat] = itemId;
  rebuildSingleDuelShowroom3D(false, cat);
  syncDuelScoreHUD();
  renderDuelBottomDock();
  saveGameState();
}

function tickShowroomDuelAI(dt, elapsed) {
  if (!duelState.active) return;

  // 심사위원 3인 환호 점프 애니메이션
  for (let i = 0; i < duelState.judges.length; i++) {
    const jg = duelState.judges[i];
    if (jg?.mesh) {
      jg.mesh.position.y = 0.16 + Math.abs(Math.sin(elapsed * 8.5 + i * 1.1)) * 0.26;
    }
  }

  if (duelState.judging || duelState.judged) return;
  const opp = getDuelOpponentDef();
  const orderCats = ['bed', 'sofa', 'appliance', 'decor'];
  if (duelState.aiPlacedSteps >= orderCats.length) return;

  duelState.aiStepTimer -= dt;
  if (duelState.aiStepTimer <= 0) {
    duelState.aiStepTimer = 1.65;
    const cat = orderCats[duelState.aiPlacedSteps];
    const pickId = pickOpponentItemForCat(opp, cat);
    if (pickId) {
      duelState.oppEquipped[cat] = pickId;
      rebuildSingleDuelShowroom3D(true, cat);
      syncDuelScoreHUD();
    }
    duelState.aiPlacedSteps += 1;
  }
}

function startShowroomDuelJudging() {
  if (!duelState.active || duelState.judging) return;

  // 상대가 아직 배치를 덜 끝냈다면 즉시 최종 풀세팅 완료 후 공정 심사!
  const opp = getDuelOpponentDef();
  for (const cat of ['bed', 'sofa', 'appliance', 'decor']) {
    if (duelState.aiPlacedSteps < 4) {
      const pickId = pickOpponentItemForCat(opp, cat);
      if (pickId) duelState.oppEquipped[cat] = pickId;
    }
  }
  duelState.aiPlacedSteps = 4;
  rebuildSingleDuelShowroom3D(true, null);
  syncDuelScoreHUD();

  duelState.judging = true;
  document.getElementById('flagship-shop-drawer')?.classList.add('hidden');

  // 3명의 VIP 인테리어 심사위원 등장 + 카메라 셔터 플래시(📸) 3연속 연출!
  if (duelState.judgeGroup) {
    clearGroupChildren(duelState.judgeGroup);
    duelState.judges = [];
    const judgeRoles = ['movie_star', 'fund_manager', 'florist'];
    [-3.6, 0.0, 3.6].forEach((jx, idx) => {
      const jm = createChibiPerson3D(judgeRoles[idx], idx + 5);
      jm.scale.setScalar(1.12);
      jm.position.set(jx, 0.16, 5.6);
      jm.rotation.y = Math.PI;
      duelState.judgeGroup.add(jm);
      duelState.judges.push({ mesh: jm });
      spawnPoofParticles3D(SHOWROOM_DUEL_ORIGIN.x + jx, 1.2, SHOWROOM_DUEL_ORIGIN.z + 5.6, 0xFFD700, 10);
    });
  }

  const flashEl = document.getElementById('duel-camera-flash');
  [80, 420, 760].forEach((ms) => {
    setTimeout(() => {
      if (!duelState.active) return;
      playCameraShutterSFX();
      if (flashEl) {
        flashEl.classList.remove('hidden');
        flashEl.style.opacity = '0.82';
        setTimeout(() => {
          flashEl.style.opacity = '0';
          setTimeout(() => flashEl.classList.add('hidden'), 140);
        }, 75);
      }
    }, ms);
  });

  setTimeout(() => {
    if (!duelState.active) return;
    duelState.judging = false;
    duelState.judged = true;

    const myBrk = calcShowroomScoreBreakdown(duelState.myEquipped);
    const oppBrk = calcShowroomScoreBreakdown(duelState.oppEquipped);
    const isWin = myBrk.total >= oppBrk.total;
    const prize = (opp?.stakePrize || 480) * 2;

    if (isWin) {
      addGold(prize);
      state.rivalWins = (state.rivalWins || 0) + 1;
      state.duelTrophies = (state.duelTrophies || 0) + 1;
      if (getDuelOpponentMode(opp) === 'rival') {
        state.rivalKangPenalty = (state.rivalKangPenalty || 0) + 480;
      }
      playGoldenBellSound();
      spawnShockwaveRing3D(SHOWROOM_DUEL_ORIGIN.x - 6.85, 0.35, SHOWROOM_DUEL_ORIGIN.z, 0xFFD700, 9.5);
      spawnPoofParticles3D(SHOWROOM_DUEL_ORIGIN.x - 6.85, 3.8, SHOWROOM_DUEL_ORIGIN.z, 0xFFD700, 24);
      updateForbesRankAndHUD(true);
      updateTopHUDTargets();
    } else {
      playCrashImpactSFX();
    }

    const resDrawer = document.getElementById('duel-result-drawer');
    const resBody = document.getElementById('duel-result-body') || resDrawer;
    if (resBody) {
      resBody.innerHTML = `
        <div class="rounded-2xl p-3 text-center border-2 ${isWin ? 'bg-gradient-to-b from-[#FFFBEB] to-[#FEF3C7] border-[#F59E0B]' : 'bg-[#FEF2F2] border-[#FCA5A5]'}">
          <div class="text-[28px]">${isWin ? '🏆✨' : '🔥'}</div>
          <div class="font-title text-[17px] ${isWin ? 'text-[#92400E]' : 'text-[#991B1B]'}">
            ${isWin ? '압도적 쇼룸 플렉스 승리!!' : '아쉬운 석패 · 하이엔드 보강 필요!'}
          </div>
          <div class="font-num text-[14px] text-[#3A2E2B] mt-1">
            내 쇼룸 <b class="text-[#B45309]">${myBrk.total.toLocaleString()}점</b> VS 상대 <b class="text-[#6B21A8]">${oppBrk.total.toLocaleString()}점</b>
          </div>
        </div>

        <div class="diary-subcard !p-2.5 space-y-1.5 text-[11.5px]">
          <div class="font-title text-[12px] text-[#3A2E2B] border-b border-[#EED6BE] pb-1">📸 3인 심사위원 채점표 (내 쇼룸 기준)</div>
          <div class="flex justify-between"><span>① 가구 총 럭셔리 가치 (50%)</span><b class="font-num text-[#B45309]">+${myBrk.scoreValue.toLocaleString()}점</b></div>
          <div class="flex justify-between"><span>② 4대 카테고리 조화도 (30%)</span><b class="font-num text-[#15803D]">+${myBrk.scoreHarmony.toLocaleString()}점</b></div>
          <div class="flex justify-between"><span>③ Tier 4 한정판 가산점 (20%)</span><b class="font-num text-[#7E22CE]">+${myBrk.scoreLimited.toLocaleString()}점</b></div>
        </div>

        ${isWin ? `
          <div class="rounded-2xl p-2.5 bg-[#ECFDF5] border border-[#6EE7B7] text-center space-y-0.5">
            <div class="font-title text-[12.5px] text-[#065F46]">💰 대전 판돈 독식 +${prize.toLocaleString()}만 입금 완료!</div>
            <div class="font-body text-[10.5px] font-bold text-[#047857]">누적 트로피 ${state.duelTrophies}개 · FORBES 서열 자산 대폭 상승!</div>
          </div>
        ` : `
          <div class="rounded-2xl p-2.5 bg-[#FFFBEB] border border-[#FDE68A] text-center font-body text-[11px] font-bold text-[#92400E]">
            💡 가구 백화점에서 <b>Tier 3~4 24K 순금 피아노 · 아쿠아리움 · 플로팅 베드</b>를 구매해 출격시켜 보세요!
          </div>
        `}

        <div class="grid grid-cols-2 gap-1.5 pt-1">
          <button type="button" id="btn-duel-rematch" class="jelly-action-btn btn-gold-lip py-2 !text-[12px]">🔄 다른 상대 매칭</button>
          <button type="button" id="btn-duel-exit-town" class="jelly-action-btn btn-mint-lip py-2 !text-[12px]">🏡 타운 복귀</button>
        </div>
      `;

      resBody.querySelector('#btn-duel-rematch')?.addEventListener('click', () => {
        switchShowroomDuelTab('pvp');
      });
      resBody.querySelector('#btn-duel-exit-town')?.addEventListener('click', () => {
        exitShowroomFlexDuel();
      });
    }
    resDrawer?.classList.remove('hidden');
    saveGameState();
  }, 1050);
}

// =========================================================
// 16F. [팝마트 & 동물의 숲 3D 아트토이 에셋 엔진]
//  - removeWhiteBackground 캔버스 투명 누끼 전처리 로더 (R>242, G>242, B>242 외곽/분할선 시드 BFS Flood-Fill)
//  - 10종 동물 캐릭터 가로 4프레임 액션 스프라이트 시트(Idle / Walk L / Walk R / Cheer Jump) 실시간 UV 애니메이터
//  - 스타터 10종 동물 주인공 선택 쇼케이스 모달 & 상시 교체 시스템
//  - 머니건·만수르 피버·월세 수금·슈퍼카 풀악셀 니트로 부스트 스킬 비주얼 VFX & 가구/차량/간판/UI 아이콘 연동
// =========================================================
const POPMART_ASSETS = {
  loaded: false,
  loading: false,
  characters: {},
  skills: {},
  vehicles: {},
  furniture: {},
  ui: {},
  moneyRainUrls: [],
  moneyRainMats: [],
  luxurySetUrls: [],
  shopSignUrls: [],
  shopSignMats: [],
  quickIconUrls: [],
  goldStatueTex: null,
  goldStatueUrl: null,
  nitroFlameTex: null,
  nitroFlameSprite: null,
  prevBoosting: false,
  sharedCurrencyGeo: null
};

const popMartActorRegistry = [];
let globalCharacterCheerTimer = 0;
let animalSelectPendingStart = false;
const animalModalLiveCanvases = [];
const origCreateHouseholdAvatarSVG = typeof window.createHouseholdAvatarSVG === 'function'
  ? window.createHouseholdAvatarSVG
  : null;

function triggerGlobalAnimalCheer(durationSec = 3.0) {
  globalCharacterCheerTimer = Math.max(globalCharacterCheerTimer, durationSec);
}

function removeWhiteBackground(img, mode = 'single', threshold = 242) {
  const w = Math.max(1, img.naturalWidth || img.width || 512);
  const h = Math.max(1, img.naturalHeight || img.height || 512);
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const total = w * h;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const isBgWhite = (idx4) => {
    if (data[idx4 + 3] === 0) return false;
    const r = data[idx4];
    const g = data[idx4 + 1];
    const b = data[idx4 + 2];
    if (r > threshold && g > threshold && b > threshold) return true;
    if (mode === 'vfx') {
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      // 스튜디오 바닥 연회색 그림자(채도가 거의 없는 무채색 밝은 회색)까지 깔끔하게 투명화!
      if (minC > 162 && (maxC - minC) < 24) return true;
    }
    return false;
  };

  const trySeed = (x, y) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const p = y * w + x;
    if (visited[p]) return;
    const i4 = p * 4;
    if (isBgWhite(i4)) {
      visited[p] = 1;
      queue[tail++] = p;
    }
  };

  for (let x = 0; x < w; x++) {
    trySeed(x, 0);
    trySeed(x, 1);
    trySeed(x, h - 1);
    trySeed(x, h - 2);
  }
  for (let y = 0; y < h; y++) {
    trySeed(0, y);
    trySeed(1, y);
    trySeed(w - 1, y);
    trySeed(w - 2, y);
  }

  if (mode === '4frame') {
    for (const frac of [0.25, 0.5, 0.75]) {
      const cx = Math.floor(w * frac);
      for (let y = 0; y < h; y++) {
        trySeed(cx - 1, y);
        trySeed(cx, y);
        trySeed(cx + 1, y);
      }
    }
  } else if (mode === '2x2') {
    const mx = Math.floor(w * 0.5);
    const my = Math.floor(h * 0.5);
    for (let y = 0; y < h; y++) {
      trySeed(mx - 1, y);
      trySeed(mx, y);
      trySeed(mx + 1, y);
    }
    for (let x = 0; x < w; x++) {
      trySeed(x, my - 1);
      trySeed(x, my);
      trySeed(x, my + 1);
    }
  }

  while (head < tail) {
    const p = queue[head++];
    const i4 = p * 4;
    data[i4 + 3] = 0;

    const px = p % w;
    const py = (p - px) / w;

    if (px > 0) {
      const np = p - 1;
      if (!visited[np] && isBgWhite(np * 4)) { visited[np] = 1; queue[tail++] = np; }
    }
    if (px + 1 < w) {
      const np = p + 1;
      if (!visited[np] && isBgWhite(np * 4)) { visited[np] = 1; queue[tail++] = np; }
    }
    if (py > 0) {
      const np = p - w;
      if (!visited[np] && isBgWhite(np * 4)) { visited[np] = 1; queue[tail++] = np; }
    }
    if (py + 1 < h) {
      const np = p + w;
      if (!visited[np] && isBgWhite(np * 4)) { visited[np] = 1; queue[tail++] = np; }
    }
  }

  // 팔다리 사이 닫힌 순백색(#FFFFFF 부근 >=251) 홀 제거 및 경계 안티앨리어싱 소프트 페더링
  for (let y = 1; y < h - 1; y++) {
    const row = y * w;
    for (let x = 1; x < w - 1; x++) {
      const p = row + x;
      if (visited[p]) continue;
      const i4 = p * 4;
      const r = data[i4];
      const g = data[i4 + 1];
      const b = data[i4 + 2];
      if (r >= 251 && g >= 251 && b >= 251) {
        data[i4 + 3] = 0;
        visited[p] = 1;
        continue;
      }
      if (visited[p - 1] || visited[p + 1] || visited[p - w] || visited[p + w]) {
        const minCh = Math.min(r, g, b);
        if (minCh > 228) {
          const softFactor = Math.max(0.08, Math.min(1, (245 - minCh) / 17));
          data[i4 + 3] = Math.round(data[i4 + 3] * softFactor);
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return cv;
}

function cropTrimmedRegionToCanvas(srcCanvas, sx, sy, sw, sh, outW = 512, outH = 512, alignBottom = false) {
  const sCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
  const sub = sCtx.getImageData(sx, sy, sw, sh);
  const d = sub.data;

  // 미세 먼지 픽셀(주변 5x5 내 불투명 이웃이 6개 미만인 고립 점) 제거로 판다·양 크기 정규화 완벽 보장!
  for (let y = 2; y < sh - 2; y++) {
    const row = y * sw;
    for (let x = 2; x < sw - 2; x++) {
      const idx = (row + x) * 4;
      if (d[idx + 3] === 0) continue;
      let neighbors = 0;
      for (let dy = -2; dy <= 2; dy++) {
        const nr = (y + dy) * sw;
        for (let dx = -2; dx <= 2; dx++) {
          if (d[(nr + x + dx) * 4 + 3] > 32) neighbors++;
        }
      }
      if (neighbors < 6) {
        d[idx + 3] = 0;
      }
    }
  }
  sCtx.putImageData(sub, sx, sy);

  let minX = sw;
  let minY = sh;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < sh; y++) {
    const row = y * sw;
    for (let x = 0; x < sw; x++) {
      if (d[(row + x) * 4 + 3] > 28) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const out = document.createElement('canvas');
  out.width = outW;
  out.height = outH;
  const oCtx = out.getContext('2d');
  oCtx.imageSmoothingEnabled = true;
  oCtx.imageSmoothingQuality = 'high';

  if (maxX < minX || maxY < minY) {
    oCtx.drawImage(srcCanvas, sx, sy, sw, sh, 0, 0, outW, outH);
    return out;
  }

  const bw = Math.max(1, maxX - minX + 1);
  const bh = Math.max(1, maxY - minY + 1);
  const padFrac = alignBottom ? 0.88 : 0.88;
  const scale = Math.min((outW * padFrac) / bw, (outH * padFrac) / bh);
  const dw = bw * scale;
  const dh = bh * scale;
  const dx = (outW - dw) * 0.5;
  const dy = alignBottom ? (outH * 0.94 - dh) : ((outH - dh) * 0.5);

  oCtx.drawImage(srcCanvas, sx + minX, sy + minY, bw, bh, dx, dy, dw, dh);
  return out;
}

function normalize4FrameSpriteSheet(cleanCanvas) {
  const w = cleanCanvas.width;
  const h = cleanCanvas.height;
  const colW = Math.floor(w / 4);
  const cellW = 512;
  const cellH = 600;

  const master = document.createElement('canvas');
  master.width = cellW * 4;
  master.height = cellH;
  const mCtx = master.getContext('2d');
  mCtx.imageSmoothingEnabled = true;
  mCtx.imageSmoothingQuality = 'high';

  const frameCanvases = [];
  const frameUrls = [];

  for (let f = 0; f < 4; f++) {
    const sx = f * colW;
    const sw = f === 3 ? (w - sx) : colW;
    const fCv = cropTrimmedRegionToCanvas(cleanCanvas, sx, 0, sw, h, cellW, cellH, f !== 3);
    if (f === 3) {
      // 4번 환호·점프 포즈는 살짝 위로 띄워 역동적인 체공감 부여
      mCtx.drawImage(fCv, f * cellW, -16);
    } else {
      mCtx.drawImage(fCv, f * cellW, 0);
    }
    frameCanvases.push(fCv);
    frameUrls.push(fCv.toDataURL('image/png'));
  }

  const baseTex = new THREE.CanvasTexture(master);
  baseTex.colorSpace = THREE.SRGBColorSpace;
  baseTex.wrapS = THREE.ClampToEdgeWrapping;
  baseTex.wrapT = THREE.ClampToEdgeWrapping;
  baseTex.repeat.set(0.25, 1.0);
  baseTex.offset.set(0, 0);
  baseTex.needsUpdate = true;

  return {
    canvas: master,
    baseTex,
    frameCanvases,
    frameUrls
  };
}

function split2x2Sheet(cleanCanvas) {
  const hw = Math.floor(cleanCanvas.width * 0.5);
  const hh = Math.floor(cleanCanvas.height * 0.5);
  const quads = [
    [0, 0, hw, hh],
    [hw, 0, cleanCanvas.width - hw, hh],
    [0, hh, hw, cleanCanvas.height - hh],
    [hw, hh, cleanCanvas.width - hw, cleanCanvas.height - hh]
  ];
  const urls = [];
  const textures = [];
  const mats = [];

  for (const [sx, sy, sw, sh] of quads) {
    const subCv = cropTrimmedRegionToCanvas(cleanCanvas, sx, sy, sw, sh, 384, 384, false);
    urls.push(subCv.toDataURL('image/png'));
    const tex = new THREE.CanvasTexture(subCv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    textures.push(tex);
    mats.push(new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.06,
      side: THREE.DoubleSide
    }));
  }
  return { urls, textures, mats };
}

function loadRawImagePromise(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

function resolveAnimalIdForRole(role = 'student', vIdx = 0) {
  if (role === 'golden_statue_hero') return null;
  if (role === 'landlord_avatar' || role === 'landlord' || role === 'landlord_driver') {
    return state?.selectedHeroCharId || 'char_05_hamster';
  }
  if (role === 'rival_kang' || role === 'chairman_kang') {
    return 'char_06_panther';
  }
  const mapByRole = {
    baker: 'char_01_bunny',
    newlywed: 'char_01_bunny',
    elderly: 'char_02_sheep',
    wash_clerk: 'char_02_sheep',
    mart_clerk: 'char_03_shiba',
    manager: 'char_03_shiba',
    student: 'char_04_duck',
    family4: 'char_04_duck',
    hikikomori: 'char_04_duck',
    cruise_captain: 'char_05_hamster',
    movie_star: 'char_07_cat',
    florist: 'char_07_cat',
    barista: 'char_08_bear',
    chef: 'char_08_bear',
    fund_manager: 'char_09_fox',
    it_ceo: 'char_09_fox',
    developer: 'char_09_fox',
    mansour: 'char_09_fox',
    streamer: 'char_10_panda',
    musician: 'char_10_panda',
    petlover: 'char_10_panda'
  };
  if (vIdx !== null && vIdx !== undefined && Number(vIdx) > 0 && (role === 'student' || role === 'pedestrian')) {
    const townPool = [
      'char_01_bunny',
      'char_02_sheep',
      'char_03_shiba',
      'char_04_duck',
      'char_05_hamster',
      'char_07_cat',
      'char_08_bear',
      'char_09_fox',
      'char_10_panda'
    ];
    return townPool[Math.abs(Number(vIdx)) % townPool.length];
  }
  return mapByRole[role] || 'char_01_bunny';
}

function hideGeometricBodyKeepProps(grp) {
  const ud = grp?.userData;
  if (!ud || !ud.bodyRig || ud.isGoldenStatueHero) return;
  const keepSet = new Set([ud.carryBag, ud.phoneProp, ud.cupProp, ud.megaphoneProp].filter(Boolean));
  for (const child of ud.bodyRig.children) {
    if (!keepSet.has(child)) {
      child.visible = false;
    }
  }
}

function applyLoadedSheetToActor(entry) {
  if (!entry || !entry.grp || entry.grp.userData?.isGoldenStatueHero) return;
  const charId = (entry.role === 'landlord_avatar' || entry.role === 'landlord' || entry.role === 'landlord_driver')
    ? (state?.selectedHeroCharId || 'char_05_hamster')
    : entry.charId;
  entry.charId = charId;

  const sheetData = POPMART_ASSETS.characters[charId];
  if (!sheetData || !sheetData.baseTex) return;

  const actorTex = sheetData.baseTex.clone();
  actorTex.colorSpace = THREE.SRGBColorSpace;
  actorTex.wrapS = THREE.ClampToEdgeWrapping;
  actorTex.wrapT = THREE.ClampToEdgeWrapping;
  actorTex.repeat.set(0.25, 1.0);
  actorTex.offset.set(0, 0);
  actorTex.needsUpdate = true;

  if (!entry.sprite) {
    const mat = new THREE.SpriteMaterial({
      map: actorTex,
      transparent: true,
      alphaTest: 0.04,
      depthWrite: true
    });
    const sp = new THREE.Sprite(mat);
    const isBoss = entry.role === 'rival_kang' || entry.role === 'chairman_kang';
    const baseW = isBoss ? 2.02 : 1.84;
    const baseH = isBoss ? 2.34 : 2.14;
    sp.scale.set(baseW, baseH, 1);
    sp.position.set(0, baseH * 0.49, 0.04);
    sp.userData = { baseW, baseH, isPopMartSprite: true };
    entry.grp.add(sp);
    entry.sprite = sp;
  } else {
    if (entry.tex && entry.tex !== actorTex) entry.tex.dispose();
    entry.sprite.material.map = actorTex;
    entry.sprite.material.needsUpdate = true;
  }

  entry.tex = actorTex;
  entry.frameIdx = 0;
  hideGeometricBodyKeepProps(entry.grp);
}

function attachPopMartAnimalSpriteToActor(grp, role = 'student', vIdx = 0) {
  if (!grp || role === 'golden_statue_hero') return;
  const charId = resolveAnimalIdForRole(role, vIdx);
  if (!charId) return;

  const entry = {
    grp,
    role,
    vIdx: Number(vIdx) || 0,
    charId,
    sprite: null,
    tex: null,
    frameIdx: 0,
    walkPhase: Math.random() * 10,
    prevWX: null,
    prevWZ: null
  };
  grp.userData.popMartEntry = entry;
  popMartActorRegistry.push(entry);

  if (POPMART_ASSETS.characters[charId]) {
    applyLoadedSheetToActor(entry);
  }
}

const _tmpActorWorldVec = new THREE.Vector3();

function tickPopMartCharacterSprites(dt, elapsed) {
  if (globalCharacterCheerTimer > 0) {
    globalCharacterCheerTimer = Math.max(0, globalCharacterCheerTimer - dt);
  }
  if (popMartActorRegistry.length === 0) return;

  for (let i = popMartActorRegistry.length - 1; i >= 0; i--) {
    const entry = popMartActorRegistry[i];
    const grp = entry.grp;
    if (!grp) {
      popMartActorRegistry.splice(i, 1);
      continue;
    }
    if (!entry.sprite || !entry.tex) {
      if (POPMART_ASSETS.characters[entry.charId]) {
        applyLoadedSheetToActor(entry);
      }
      continue;
    }
    if (!grp.visible) continue;

    grp.getWorldPosition(_tmpActorWorldVec);
    let movedDist = 0;
    if (entry.prevWX !== null) {
      movedDist = Math.hypot(_tmpActorWorldVec.x - entry.prevWX, _tmpActorWorldVec.z - entry.prevWZ);
    }
    entry.prevWX = _tmpActorWorldVec.x;
    entry.prevWZ = _tmpActorWorldVec.z;

    const ud = grp.userData || {};
    const legSwing = ud.legL ? Math.abs(ud.legL.rotation.x) : 0;
    const isWalking = (movedDist / Math.max(0.008, dt)) > 0.32 || (legSwing > 0.06 && legSwing < 0.92);
    const isCheering = (
      globalCharacterCheerTimer > 0 ||
      makeItRainState.active ||
      (ud.auraTimer && ud.auraTimer > 0.1)
    );

    const baseW = entry.sprite.userData.baseW || 1.84;
    const baseH = entry.sprite.userData.baseH || 2.14;
    let targetFrame = 0;
    let bounceY = 0;
    let squashX = 1.0;
    let squashY = 1.0;

    if (isCheering) {
      targetFrame = 3;
      const jumpWave = Math.abs(Math.sin(elapsed * 9.2 + i * 0.7));
      bounceY = jumpWave * 0.28;
      squashX = 1.0 - jumpWave * 0.05;
      squashY = 1.0 + jumpWave * 0.08;
    } else if (isWalking) {
      entry.walkPhase += dt * 7.2;
      targetFrame = (Math.floor(entry.walkPhase) % 2 === 0) ? 1 : 2;
      const waddle = Math.abs(Math.sin(entry.walkPhase * Math.PI));
      bounceY = waddle * 0.12;
      squashX = 1.0 + (1 - waddle) * 0.03;
      squashY = 1.0 + waddle * 0.04;
    } else {
      targetFrame = 0;
      const breath = Math.sin(elapsed * 2.8 + i * 0.9);
      squashX = 1.0 + breath * 0.015;
      squashY = 1.0 - breath * 0.015;
    }

    if (entry.frameIdx !== targetFrame) {
      entry.frameIdx = targetFrame;
      entry.tex.offset.x = targetFrame * 0.25;
    }
    entry.sprite.position.y = baseH * 0.49 + bounceY;
    entry.sprite.scale.set(baseW * squashX, baseH * squashY, 1);
  }
}

function attachGoldStatuePopMartSprite3D(statueGrp, fallbackHeroMesh) {
  if (!statueGrp) return;
  statueGrp.userData.fallbackHeroMesh = fallbackHeroMesh;
  if (!POPMART_ASSETS.goldStatueTex) return;

  const existing = statueGrp.getObjectByName('popmart_gold_statue_sprite');
  if (existing) statueGrp.remove(existing);

  const spMat = new THREE.SpriteMaterial({
    map: POPMART_ASSETS.goldStatueTex,
    transparent: true,
    alphaTest: 0.04
  });
  const sp = new THREE.Sprite(spMat);
  sp.name = 'popmart_gold_statue_sprite';
  sp.scale.set(4.5, 4.8, 1);
  sp.position.set(0, 4.65, 0.05);
  statueGrp.add(sp);
  if (fallbackHeroMesh) fallbackHeroMesh.visible = false;
}

function updateDriveNitroFlameSprite3D(isBoosting, elapsed) {
  if (!driveState.active || !driveState.carRootGroup || !POPMART_ASSETS.nitroFlameTex) return;

  if (!POPMART_ASSETS.nitroFlameSprite || POPMART_ASSETS.nitroFlameSprite.parent !== driveState.carRootGroup) {
    if (POPMART_ASSETS.nitroFlameSprite?.parent) {
      POPMART_ASSETS.nitroFlameSprite.parent.remove(POPMART_ASSETS.nitroFlameSprite);
    }
    const mat = new THREE.SpriteMaterial({
      map: POPMART_ASSETS.nitroFlameTex,
      transparent: true,
      alphaTest: 0.06,
      depthWrite: false
    });
    const sp = new THREE.Sprite(mat);
    sp.position.set(0, 0.56, -2.32);
    driveState.carRootGroup.add(sp);
    POPMART_ASSETS.nitroFlameSprite = sp;
  }

  const sp = POPMART_ASSETS.nitroFlameSprite;
  sp.visible = !!isBoosting && !driveState.cockpitView;
  if (isBoosting) {
    const pulse = 1.0 + Math.sin(elapsed * 38) * 0.16;
    sp.scale.set(1.85 * pulse, 1.32 * pulse, 1);
    if (!POPMART_ASSETS.prevBoosting) {
      spawnPopMartSkillBurstVFX('nitro_boost', {});
    }
  }
  POPMART_ASSETS.prevBoosting = !!isBoosting;
}

function spawnPopMartSkillBurstVFX(kind = 'moneygun', opt = {}) {
  const layer = document.getElementById('skill-vfx-burst-layer');
  if (!layer) return;

  const popCutinImg = (url, sizePx, topPct, leftPct, durMs = 1350) => {
    if (!url) return;
    const img = document.createElement('img');
    img.src = url;
    img.alt = kind;
    img.className = 'skill-cutin-burst';
    img.style.width = `${sizePx}px`;
    img.style.height = `${sizePx}px`;
    img.style.objectFit = 'contain';
    img.style.left = `${leftPct}%`;
    img.style.top = `${topPct}%`;
    layer.appendChild(img);
    setTimeout(() => img.remove(), durMs);
  };

  if (kind === 'moneygun') {
    triggerGlobalAnimalCheer(6.2);
    const isMansourTier = !!(opt?.skyFireworks || (opt?.feverMult && opt.feverMult >= 3.0));
    if (isMansourTier && POPMART_ASSETS.skills.mansourFeverAura) {
      popCutinImg(POPMART_ASSETS.skills.mansourFeverAura, 310, 46, 50, 1550);
    }
    if (POPMART_ASSETS.skills.moneygunBlast) {
      popCutinImg(POPMART_ASSETS.skills.moneygunBlast, isMansourTier ? 250 : 205, 52, isMansourTier ? 38 : 50, 1380);
    }
    if (POPMART_ASSETS.moneyRainUrls.length > 0) {
      const dropCount = Math.min(28, Math.max(10, Math.round((opt?.billCount || 60) * 0.2)));
      for (let i = 0; i < dropCount; i++) {
        const drop = document.createElement('img');
        drop.src = POPMART_ASSETS.moneyRainUrls[i % POPMART_ASSETS.moneyRainUrls.length];
        drop.alt = 'currency';
        drop.className = 'skill-currency-rain-drop';
        const sz = 38 + (i % 3) * 12;
        drop.style.width = `${sz}px`;
        drop.style.height = `${sz}px`;
        drop.style.objectFit = 'contain';
        drop.style.left = `${6 + Math.random() * 88}%`;
        drop.style.animationDuration = `${1.35 + Math.random() * 0.95}s`;
        drop.style.animationDelay = `${(i % 7) * 0.06}s`;
        layer.appendChild(drop);
        setTimeout(() => drop.remove(), 2500);
      }
    }
  } else if (kind === 'rent_collect') {
    triggerGlobalAnimalCheer(2.8);
    if (POPMART_ASSETS.skills.rentCollectBurst) {
      popCutinImg(POPMART_ASSETS.skills.rentCollectBurst, 215, 48, 50, 1320);
    }
  } else if (kind === 'nitro_boost') {
    if (POPMART_ASSETS.skills.nitroBoostFlame) {
      popCutinImg(POPMART_ASSETS.skills.nitroBoostFlame, 136, 56, 50, 720);
    }
  }
}

function getPopMartCatalogThumbDataUrl(itemId) {
  if (!itemId) return null;
  const f = POPMART_ASSETS.furniture;
  const v = POPMART_ASSETS.vehicles;
  const lux = POPMART_ASSETS.luxurySetUrls || [];

  switch (itemId) {
    case 'bed_iron':
    case 'bed_wood_single':
      return f.bedTier1Wood || null;
    case 'bed_queen':
    case 'bed_bunk':
      return f.bedTier2Hotel || null;
    case 'bed_canopy':
      return f.bedTier3Canopy || null;
    case 'bed_jacuzzi':
      return lux[2] || f.bedTier3Canopy || null;
    case 'bed_golden_float':
      return f.bedTier4Gold || null;
    case 'sofa_mint2':
    case 'sofa_leather_l':
      return lux[0] || null;
    case 'sofa_piano':
    case 'sofa_gold_piano':
      return lux[1] || null;
    case 'app_winecellar':
    case 'dec_harbor_royal':
    case 'dec_diamond_art':
      return lux[3] || null;
    case 'dec_peach':
    case 'dec_basic_shelf':
    case 'dec_sage':
      return f.wallpaperCreamUrl || null;
    case 'dec_butter':
    case 'dec_lavender':
      return f.wallpaperMarbleUrl || null;
    case 'car_supercar':
      return v.redSupercar || null;
    case 'car_sedan':
      return v.purpleRival || null;
    case 'car_limo':
      return v.goldMansour || null;
    default:
      return null;
  }
}

function syncHeroMiniHudAvatar() {
  const heroId = state?.selectedHeroCharId || 'char_05_hamster';
  const roster = window.ANIMAL_CHARACTER_ROSTER || [];
  const def = roster.find((c) => c.id === heroId) || roster[4] || roster[0];
  const cv = document.getElementById('hud-hero-mini-canvas');
  if (cv) {
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    const sheet = POPMART_ASSETS.characters[heroId];
    if (sheet?.frameCanvases?.[0]) {
      ctx.drawImage(sheet.frameCanvases[0], 0, 0, cv.width, cv.height);
    } else if (def) {
      ctx.font = '22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.emoji || '🐹', cv.width * 0.5, cv.height * 0.54);
    }
  }
  const titlePickBtn = document.getElementById('btn-title-pick-animal');
  if (titlePickBtn && def) {
    titlePickBtn.textContent = `${def.emoji} 주인공: ${def.name}`;
  }
}

function selectHeroAnimalId(charId) {
  const roster = window.ANIMAL_CHARACTER_ROSTER || [];
  const picked = roster.find((c) => c.id === charId);
  if (!picked) return;

  state.selectedHeroCharId = picked.id;
  syncHeroMiniHudAvatar();

  for (const entry of popMartActorRegistry) {
    if (entry.role === 'landlord_avatar' || entry.role === 'landlord' || entry.role === 'landlord_driver') {
      applyLoadedSheetToActor(entry);
    }
  }

  const sumEl = document.getElementById('animal-selected-summary');
  if (sumEl) {
    sumEl.textContent = `선택됨: ${picked.emoji} ${picked.name} (${picked.title}) — ${picked.desc}`;
  }
  document.querySelectorAll('#animal-roster-grid .animal-blindbox-card').forEach((el) => {
    el.classList.toggle('selected', el.getAttribute('data-animal-id') === picked.id);
  });
  saveGameState();
}

function openAnimalSelectModal(fromTitleStart = false) {
  animalSelectPendingStart = !!fromTitleStart;
  closeAllModalsImmediate('animal-select-modal');
  const modal = document.getElementById('animal-select-modal');
  const grid = document.getElementById('animal-roster-grid');
  if (!modal || !grid) return;

  const roster = window.ANIMAL_CHARACTER_ROSTER || [];
  const curId = state?.selectedHeroCharId || 'char_05_hamster';
  animalModalLiveCanvases.length = 0;

  grid.innerHTML = roster.map((ch) => {
    const isSel = ch.id === curId;
    return `
      <button type="button" data-animal-id="${ch.id}" class="animal-blindbox-card text-left ${isSel ? 'selected' : ''}">
        <div class="w-full flex items-center justify-between text-[10px] font-extrabold text-[#7C5836] mb-0.5">
          <span>NO.${String(ch.num).padStart(2, '0')}</span>
          <span>${ch.isRivalBoss ? '🔥 BOSS' : '✨ 4-FRAME'}</span>
        </div>
        <div class="w-[74px] h-[74px] rounded-2xl bg-gradient-to-b from-[#FFFDF9] to-[#FDEFD9] border border-[#E8CCB0] flex items-center justify-center overflow-hidden">
          <canvas data-live-animal="${ch.id}" width="96" height="96" class="w-[70px] h-[70px]"></canvas>
        </div>
        <div class="font-title text-[12.5px] text-[#3A2E2B] mt-1 leading-tight text-center">${ch.emoji} ${ch.name}</div>
        <div class="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold mt-0.5" style="background:#FEF3C7;color:#92400E;">${ch.title}</div>
      </button>
    `;
  }).join('');

  grid.querySelectorAll('[data-live-animal]').forEach((cv) => {
    const cid = cv.getAttribute('data-live-animal');
    animalModalLiveCanvases.push({ id: cid, canvas: cv, ctx: cv.getContext('2d') });
  });

  grid.querySelectorAll('[data-animal-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectHeroAnimalId(btn.getAttribute('data-animal-id'));
    });
  });

  selectHeroAnimalId(curId);
  const confirmBtn = document.getElementById('btn-confirm-animal-hero');
  if (confirmBtn) {
    confirmBtn.textContent = fromTitleStart
      ? '✨ 이 동물 주인공으로 타운 입장! ▶'
      : '✨ 이 동물 주인공으로 변경 완료!';
  }
  modal.classList.remove('hidden');
}

function closeAnimalSelectModal() {
  document.getElementById('animal-select-modal')?.classList.add('hidden');
  animalModalLiveCanvases.length = 0;
}

function tickAnimalModalLiveCanvases(elapsed) {
  const modal = document.getElementById('animal-select-modal');
  if (!modal || modal.classList.contains('hidden') || animalModalLiveCanvases.length === 0) return;

  // 0(기본) -> 1(왼발) -> 2(오른발) -> 1(왼발) -> 3(만세 점프) 4프레임 프리뷰 루프
  const seq = [0, 1, 2, 1, 2, 3];
  const stepFrame = seq[Math.floor(elapsed * 4.5) % seq.length];

  for (const item of animalModalLiveCanvases) {
    const { id, canvas, ctx } = item;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const sheet = POPMART_ASSETS.characters[id];
    if (sheet?.frameCanvases?.[stepFrame]) {
      const bob = stepFrame === 3 ? -5 : (stepFrame === 1 || stepFrame === 2 ? -2 : 0);
      ctx.drawImage(sheet.frameCanvases[stepFrame], 0, bob, canvas.width, canvas.height);
    }
  }
}

function applyPopMartWorldDecorations() {
  // 1) UI 수첩 & 우측 하단 3대 퀵 아이콘 + 우측 상단 기어 아이콘 3D 아트토이 이미지 주입
  if (POPMART_ASSETS.ui.pocketNotebookUrl) {
    const fabSlot = document.getElementById('fab-svg-slot');
    if (fabSlot) {
      fabSlot.innerHTML = `<img src="${POPMART_ASSETS.ui.pocketNotebookUrl}" alt="notebook" class="w-9 h-9 object-contain drop-shadow-sm pointer-events-none" />`;
    }
  }
  if (POPMART_ASSETS.quickIconUrls.length === 4) {
    const iconTargets = [
      ['hud-ico-moneygun', POPMART_ASSETS.quickIconUrls[0], 'w-7 h-7'],
      ['hud-ico-drive', POPMART_ASSETS.quickIconUrls[1], 'w-7 h-7'],
      ['hud-ico-forbes', POPMART_ASSETS.quickIconUrls[2], 'w-7 h-7'],
      ['hud-ico-top-settings', POPMART_ASSETS.quickIconUrls[3], 'w-6 h-6']
    ];
    for (const [elId, url, cls] of iconTargets) {
      const slot = document.getElementById(elId);
      if (slot && url) {
        slot.innerHTML = `<img src="${url}" alt="${elId}" class="${cls} object-contain drop-shadow-sm pointer-events-none" />`;
      }
    }
  }

  // 2) 상가 4종 입체 팝마트 돌출 간판 부착 (베이커리 / 1층 편의점 / 가구 백화점 / 1층 코인세탁소)
  if (POPMART_ASSETS.shopSignMats.length === 4) {
    const attachSignBadge = (parentGrp, mat, lx, ly, lz, sc = 1.95) => {
      if (!parentGrp) return;
      const old = parentGrp.getObjectByName('popmart_shop_emblem_3d');
      if (old) parentGrp.remove(old);
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(sc, sc), mat);
      plane.name = 'popmart_shop_emblem_3d';
      plane.position.set(lx, ly, lz);
      parentGrp.add(plane);
    };
    attachSignBadge(standaloneShop3D.shop_bakery?.group, POPMART_ASSETS.shopSignMats[0], 0, 5.15, 4.05, 2.05);
    attachSignBadge(firstFloorShop3D.shop_mart1f?.group, POPMART_ASSETS.shopSignMats[1], -3.9, 3.35, 4.18, 1.75);
    attachSignBadge(flagshipShop3DGroup, POPMART_ASSETS.shopSignMats[2], 0, 6.35, 4.65, 2.35);
    attachSignBadge(firstFloorShop3D.shop_wash1f?.group, POPMART_ASSETS.shopSignMats[3], 3.9, 3.35, 4.18, 1.75);
  }

  // 3) 인테리어 벽지 2종(크림 웨인스코팅 / 로열 화이트&골드 마블) 3D 텍스처 업그레이드 및 방 리빌드
  if (POPMART_ASSETS.furniture.wallpaperCreamTex) {
    TEX.wallPeach = POPMART_ASSETS.furniture.wallpaperCreamTex;
    TEX.wallSage = POPMART_ASSETS.furniture.wallpaperCreamTex;
    TEX.wallCream = POPMART_ASSETS.furniture.wallpaperCreamTex;
  }
  if (POPMART_ASSETS.furniture.wallpaperMarbleTex) {
    TEX.wallButter = POPMART_ASSETS.furniture.wallpaperMarbleTex;
    TEX.wallLavender = POPMART_ASSETS.furniture.wallpaperMarbleTex;
  }
  if (POPMART_ASSETS.furniture.wallpaperCreamTex || POPMART_ASSETS.furniture.wallpaperMarbleTex) {
    for (const [lid, b] of Object.entries(state.buildings || {})) {
      if (!lot3D[lid]) continue;
      for (const rm of (b.rooms || [])) {
        if (rm.unlocked) rebuildRoom3D(lid, rm);
      }
    }
    if (duelState.active) {
      rebuildSingleDuelShowroom3D(false, null);
      rebuildSingleDuelShowroom3D(true, null);
    }
  }

  // 4) 광장 24K 황금 건물주 동상 3D 팝마트 피규어 적용
  if (milestoneState.statueGroup && POPMART_ASSETS.goldStatueTex) {
    attachGoldStatuePopMartSprite3D(milestoneState.statueGroup, milestoneState.statueGroup.userData?.fallbackHeroMesh);
  }

  // 5) 세입자·지배인·라이벌·포브스 2D 초상화를 10종 팝마트 동물 캐릭터 렌더링으로 업그레이드
  if (origCreateHouseholdAvatarSVG) {
    window.createHouseholdAvatarSVG = (roleKey = 'student', size = 44) => {
      const cid = resolveAnimalIdForRole(roleKey, 0);
      const frame0 = cid ? POPMART_ASSETS.characters[cid]?.frameUrls?.[0] : null;
      if (frame0) {
        return `<span class="inline-flex items-center justify-center rounded-2xl bg-[#FFFDF8] border border-[#E8CCB0] overflow-hidden shrink-0 shadow-sm" style="width:${size}px;height:${size}px;"><img src="${frame0}" alt="${roleKey}" style="width:94%;height:94%;object-fit:contain;" /></span>`;
      }
      return origCreateHouseholdAvatarSVG(roleKey, size);
    };
  }

  catalog3DPreviewCache.clear();
  syncHeroMiniHudAvatar();
  if (!document.getElementById('flagship-shop-drawer')?.classList.contains('hidden')) {
    renderFurnitureFlagshipDrawer();
  }
  if (focusedRoomId && focusRevealState.revealed) {
    renderFocusedRoomInspector();
  }
}

async function initPopMartAssetsAsync() {
  if (POPMART_ASSETS.loading || POPMART_ASSETS.loaded) return;
  POPMART_ASSETS.loading = true;

  const roster = window.ANIMAL_CHARACTER_ROSTER || [];
  const paths = window.POPMART_ASSET_PATHS || {};

  // 1) Batch 1: 동물 캐릭터 10종 4프레임 액션 스프라이트 시트 로드 & 누끼 전처리
  await Promise.all(roster.map(async (ch) => {
    try {
      const rawImg = await loadRawImagePromise(ch.sheetPath);
      const cleanCv = removeWhiteBackground(rawImg, '4frame', 242);
      POPMART_ASSETS.characters[ch.id] = normalize4FrameSpriteSheet(cleanCv);
    } catch (e) {
      // 개별 시트 로드 실패 시 안전 폴백 유지
    }
  }));

  for (const entry of popMartActorRegistry) {
    applyLoadedSheetToActor(entry);
  }
  syncHeroMiniHudAvatar();

  // 2) Batch 2: 스킬 VFX 5종 & 차량/황금동상 4종 로드 & 누끼 전처리
  const loadSingleCleanAsset = async (url, mode = 'single') => {
    if (!url) return null;
    const raw = await loadRawImagePromise(url);
    const rawClean = removeWhiteBackground(raw, mode, 242);
    const cv = cropTrimmedRegionToCanvas(rawClean, 0, 0, rawClean.width, rawClean.height, 448, 448, false);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return { cv, url: cv.toDataURL('image/png'), tex };
  };

  await Promise.all([
    (async () => {
      try {
        const res = await loadSingleCleanAsset(paths.skills?.moneygunBlast, 'vfx');
        if (res) POPMART_ASSETS.skills.moneygunBlast = res.url;
      } catch (e) {}
    })(),
    (async () => {
      try {
        const raw = await loadRawImagePromise(paths.skills?.moneyRainParticles);
        const clean = removeWhiteBackground(raw, '2x2', 242);
        const sp = split2x2Sheet(clean);
        POPMART_ASSETS.moneyRainUrls = sp.urls;
        POPMART_ASSETS.moneyRainMats = sp.mats;
      } catch (e) {}
    })(),
    (async () => {
      try {
        const res = await loadSingleCleanAsset(paths.skills?.mansourFeverAura, 'vfx');
        if (res) POPMART_ASSETS.skills.mansourFeverAura = res.url;
      } catch (e) {}
    })(),
    (async () => {
      try {
        const res = await loadSingleCleanAsset(paths.skills?.rentCollectBurst, 'vfx');
        if (res) POPMART_ASSETS.skills.rentCollectBurst = res.url;
      } catch (e) {}
    })(),
    (async () => {
      try {
        const res = await loadSingleCleanAsset(paths.skills?.nitroBoostFlame, 'vfx');
        if (res) {
          POPMART_ASSETS.skills.nitroBoostFlame = res.url;
          POPMART_ASSETS.nitroFlameTex = res.tex;
        }
      } catch (e) {}
    })(),
    (async () => {
      try {
        const res = await loadSingleCleanAsset(paths.vehicles?.redSupercar);
        if (res) POPMART_ASSETS.vehicles.redSupercar = res.url;
      } catch (e) {}
    })(),
    (async () => {
      try {
        const res = await loadSingleCleanAsset(paths.vehicles?.purpleRival);
        if (res) POPMART_ASSETS.vehicles.purpleRival = res.url;
      } catch (e) {}
    })(),
    (async () => {
      try {
        const res = await loadSingleCleanAsset(paths.vehicles?.goldMansour);
        if (res) POPMART_ASSETS.vehicles.goldMansour = res.url;
      } catch (e) {}
    })(),
    (async () => {
      try {
        const res = await loadSingleCleanAsset(paths.vehicles?.goldStatue);
        if (res) {
          POPMART_ASSETS.goldStatueUrl = res.url;
          POPMART_ASSETS.goldStatueTex = res.tex;
        }
      } catch (e) {}
    })()
  ]);

  // 3) Batch 3: 가구/벽지 7종 & 상가 간판/UI 아이콘 3종 로드 & 전처리
  await Promise.all([
    (async () => {
      try {
        const res = await loadSingleCleanAsset(paths.furniture?.bedTier1Wood);
        if (res) POPMART_ASSETS.furniture.bedTier1Wood = res.url;
      } catch (e) {}
    })(),
    (async () => {
      try {
        const res = await loadSingleCleanAsset(paths.furniture?.bedTier2Hotel);
        if (res) POPMART_ASSETS.furniture.bedTier2Hotel = res.url;
      } catch (e) {}
    })(),
    (async () => {
      try {
        const res = await loadSingleCleanAsset(paths.furniture?.bedTier3Canopy);
        if (res) POPMART_ASSETS.furniture.bedTier3Canopy = res.url;
      } catch (e) {}
    })(),
    (async () => {
      try {
        const res = await loadSingleCleanAsset(paths.furniture?.bedTier4Gold);
        if (res) POPMART_ASSETS.furniture.bedTier4Gold = res.url;
      } catch (e) {}
    })(),
    (async () => {
      try {
        const raw = await loadRawImagePromise(paths.furniture?.luxurySetSheet);
        const clean = removeWhiteBackground(raw, '2x2', 242);
        const sp = split2x2Sheet(clean);
        POPMART_ASSETS.luxurySetUrls = sp.urls;
      } catch (e) {}
    })(),
    (async () => {
      try {
        const raw = await loadRawImagePromise(paths.furniture?.wallpaperCream);
        const tex = new THREE.Texture(raw);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2.2, 1.0);
        tex.needsUpdate = true;
        POPMART_ASSETS.furniture.wallpaperCreamTex = tex;
        POPMART_ASSETS.furniture.wallpaperCreamUrl = paths.furniture.wallpaperCream;
      } catch (e) {}
    })(),
    (async () => {
      try {
        const raw = await loadRawImagePromise(paths.furniture?.wallpaperMarble);
        const tex = new THREE.Texture(raw);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2.2, 1.0);
        tex.needsUpdate = true;
        POPMART_ASSETS.furniture.wallpaperMarbleTex = tex;
        POPMART_ASSETS.furniture.wallpaperMarbleUrl = paths.furniture.wallpaperMarble;
      } catch (e) {}
    })(),
    (async () => {
      try {
        const raw = await loadRawImagePromise(paths.ui?.signsShopsSheet);
        const clean = removeWhiteBackground(raw, '2x2', 242);
        const sp = split2x2Sheet(clean);
        POPMART_ASSETS.shopSignUrls = sp.urls;
        POPMART_ASSETS.shopSignMats = sp.mats;
      } catch (e) {}
    })(),
    (async () => {
      try {
        const res = await loadSingleCleanAsset(paths.ui?.pocketNotebook);
        if (res) POPMART_ASSETS.ui.pocketNotebookUrl = res.url;
      } catch (e) {}
    })(),
    (async () => {
      try {
        const raw = await loadRawImagePromise(paths.ui?.quickIconsSheet);
        const clean = removeWhiteBackground(raw, '2x2', 242);
        const sp = split2x2Sheet(clean);
        POPMART_ASSETS.quickIconUrls = sp.urls;
      } catch (e) {}
    })()
  ]);

  POPMART_ASSETS.loaded = true;
  POPMART_ASSETS.loading = false;
  applyPopMartWorldDecorations();
}

// =========================================================
// 17. LocalStorage 자동 저장/불러오기 & Three.js 씬 초기화 & 입력 바인딩
// =========================================================
let isResettingGame = false;

function saveGameState() {
  if (isResettingGame) return;
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
    const mergedLots = fresh.lots.map((fl) => {
      const savedLot = Array.isArray(parsed.lots) ? parsed.lots.find((pl) => pl.lotId === fl.lotId) : null;
      return savedLot ? { ...fl, ...savedLot, stage: fl.stage } : fl;
    });
    const mergedBuildings = {
      ...fresh.buildings,
      ...(parsed.buildings || {})
    };
    if (!mergedBuildings.lot_harbor_main) {
      mergedBuildings.lot_harbor_main = fresh.buildings.lot_harbor_main;
    }

    state = {
      ...fresh,
      ...parsed,
      lots: mergedLots,
      buildings: mergedBuildings,
      standaloneShops: {
        ...fresh.standaloneShops,
        ...(parsed.standaloneShops || {})
      },
      firstFloorShops: {
        ...fresh.firstFloorShops,
        ...(parsed.firstFloorShops || {})
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
      firstStartedAt: Number(parsed.firstStartedAt) || fresh.firstStartedAt,
      day2BonusClaimed: !!parsed.day2BonusClaimed,
      harborUnlocked: !!parsed.harborUnlocked,
      day3SkipForced: !!parsed.day3SkipForced,
      activeTownStage: parsed.activeTownStage === 2 && parsed.harborUnlocked ? 2 : 1,
      feverTimer: Number(parsed.feverTimer) > 0 ? Number(parsed.feverTimer) : 0,
      feverPower: Number(parsed.feverPower) > 0 ? Number(parsed.feverPower) : 2.5,
      townHappinessBoost: Number(parsed.townHappinessBoost) || 0,
      unlockedMilestones: Array.isArray(parsed.unlockedMilestones) ? parsed.unlockedMilestones : [],
      goldenKeys: Number(parsed.goldenKeys) || 0,
      rivalWins: Number(parsed.rivalWins) || 0,
      duelTrophies: Number(parsed.duelTrophies) || 0,
      rivalKangPenalty: Number(parsed.rivalKangPenalty) || 0,
      bestForbesRank: typeof parsed.bestForbesRank === 'number' ? parsed.bestForbesRank : 10,
      vipTitle: parsed.vipTitle || '🌱 코지 타운 명예 동장',
      selectedHeroCharId: parsed.selectedHeroCharId || 'char_05_hamster',
      hasChosenHeroAnimal: !!parsed.hasChosenHeroAnimal,
      furnitureInventory: {
        ...(fresh.furnitureInventory || {}),
        ...(parsed.furnitureInventory || {})
      },
      stats: { ...fresh.stats, ...(parsed.stats || {}) }
    };

    // 기존 저장 호실/상가 스키마 보정
    for (const b of Object.values(state.buildings || {})) {
      for (const rm of (b.rooms || [])) {
        ensureRoomSchema(rm);
      }
    }
    for (const tpl of STANDALONE_SHOPS_TEMPLATE) {
      if (state.standaloneShops[tpl.shopId] && typeof state.standaloneShops[tpl.shopId].auctionBonusPct !== 'number') {
        state.standaloneShops[tpl.shopId].auctionBonusPct = 0;
      }
    }

    const elapsedSec = Math.min(3600, Math.max(0, (Date.now() - (parsed.lastSavedAt || Date.now())) / 1000));
    if (elapsedSec > 25) {
      const offlineGain = Math.min(600, Math.round((calcCycleNetIncome() * elapsedSec) / 45));
      if (offlineGain >= 10) {
        state.gold += offlineGain;
        setTimeout(() => {
          if (!titleScreenState.active) {
            showToast(`부재중 월세·상가 수익 +${offlineGain}만 정산 완료!`, 'gold');
          }
        }, 3800);
      }
    }
  } catch (e) {
    state = createInitialState();
  }
}

function resetGameState() {
  isResettingGame = true;
  localStorage.removeItem(SAVE_KEY);
  localStorage.removeItem(FIRST_START_TS_KEY);
  window.location.reload();
}

function initThreeScene() {
  scene = new THREE.Scene();
  scene.background = TEX.skyBackdrop;
  scene.fog = new THREE.FogExp2(0xE8F9FD, 0.0019);

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

  driveCamera = new THREE.PerspectiveCamera(58, aspect, 0.3, 340);
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
  dirLight.shadow.camera.left = -56;
  dirLight.shadow.camera.right = 56;
  dirLight.shadow.camera.top = 56;
  dirLight.shadow.camera.bottom = -56;
  dirLight.shadow.camera.near = 4;
  dirLight.shadow.camera.far = 160;
  dirLight.shadow.bias = -0.0005;
  scene.add(dirLight);
  scene.add(dirLight.target);

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

    if (titleScreenState.active) {
      applyTitleDollhouseShowcaseCamera(titleScreenState.swayPhase || 0);
    } else if (!guidedTourState.active && !duelState.active && !focusedRoomId && !focusedShopId && !focusedFirstFloorShopId && !driveState.active && !fpState.active) {
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
  dom.btnMakeItRain = document.getElementById('btn-make-it-rain');
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
  setSvg('hud-ico-moneygun', 'money_gun', 22);
  setSvg('hud-ico-drive', 'steering_supercar', 22);
  setSvg('hud-ico-garage', 'garage_key', 17);
  setSvg('hud-ico-expand', 'blueprint_hammer', 22);
  setSvg('hud-ico-collect', 'coin_stack', 22);
  setSvg('hud-ico-tour', 'tour_clapper', 22);
  setSvg('hud-ico-ledger', 'contract_scroll', 22);
  setSvg('hud-ico-settings', 'settings_gear', 18);
  setSvg('hud-ico-harbor', 'harbor_map', 22);
  setSvg('chronicle-ico-header', 'crown_badge', 24);

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
  setSvg('ico-drive-scenic', 'palm_road', 17);
  setSvg('ico-drive-rain', 'money_gun', 18);
  setSvg('ico-fp-rain', 'money_gun', 18);

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
  setSvg('ms-modal-ico', 'statue_gold', 26);
  setSvg('ico-ms-rain', 'money_gun', 18);
  setSvg('ms-banner-ico', 'statue_gold', 26);

  // 신규 FORBES 랭킹 · 라이벌 1:1 쇼룸 결투 · 가구 백화점 · V12 니트로 부스트 커스텀 SVG 주입
  setSvg('hud-ico-top-settings', 'settings_gear', 21);
  setSvg('hud-ico-flagship', 'furniture_shop_ico', 22);
  setSvg('flagship-drawer-ico', 'furniture_shop_ico', 22);
  setSvg('hud-ico-forbes', 'forbes_trophy', 22);
  setSvg('hud-ico-rival', 'duel_versus_ico', 21);
  setSvg('ico-nitro-boost', 'nitro_flame_ico', 19);
  setSvg('ico-drive-race', 'race_flag', 17);
  setSvg('ico-race-hud', 'race_flag', 20);
  setSvg('ico-fp-double-bell', 'rival_bolt', 18);
  setSvg('rival-hub-ico', 'rival_bolt', 24);
  setSvg('poach-dock-ico', 'megaphone_purple', 21);
  setSvg('ico-poach-furn', 'sofa_ico', 16);
  setSvg('ico-poach-gift', 'gift_ribbon_box', 16);
  setSvg('ico-poach-rain', 'money_gun', 17);
  setSvg('bid-dock-ico', 'auction_paddle', 22);
  setSvg('ico-bid-up', 'auction_paddle', 18);
  setSvg('ico-bid-briefcase', 'golden_briefcase', 19);
  setSvg('forbes-modal-ico', 'forbes_trophy', 25);
  setSvg('ico-forbes-kang', 'rival_bolt', 17);
  setSvg('rankup-banner-ico', 'forbes_trophy', 26);
  setSvg('settings-ico-header', 'settings_gear', 23);

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
  // [요구사항 9] UI 클릭 관통(Click Bleed-Through) 원천 차단: 모든 드로어·팝오버·퀵버튼에서 3D 캔버스로 포인터 이벤트 전파 차단!
  const uiShieldSelectors = [
    '#top-right-action-cluster',
    '#quick-trio-stack',
    '#moneygun-flex-popover',
    '#pocket-planner-popover',
    '#focus-clean-capsule',
    '#room-focus-panel',
    '#shop-focus-panel',
    '#flagship-shop-drawer',
    '#showroom-duel-hud',
    '#drive-proximity-bar',
    '#drive-mode-hud',
    '#fp-mode-hud',
    '#animal-select-modal',
    '.slim-right-drawer-modal'
  ];
  for (const sel of uiShieldSelectors) {
    document.querySelectorAll(sel).forEach((el) => {
      el.addEventListener('pointerdown', (ev) => ev.stopPropagation());
      el.addEventListener('pointerup', (ev) => ev.stopPropagation());
    });
  }

  // 수첩 또는 머니건 팝오버 밖 화면 클릭 시 깔끔하게 접기 연동!
  window.addEventListener('pointerdown', (e) => {
    const target = e.target;
    const pop = document.getElementById('pocket-planner-popover');
    const fab = document.getElementById('fab-notebook');
    if (pop && !pop.classList.contains('hidden')) {
      if (!pop.contains(target) && (!fab || !fab.contains(target))) {
        closePocketPlanner();
      }
    }
    const mgPop = document.getElementById('moneygun-flex-popover');
    const mgBtn = document.getElementById('btn-make-it-rain');
    if (mgPop && !mgPop.classList.contains('hidden')) {
      if (!mgPop.contains(target) && (!mgBtn || !mgBtn.contains(target))) {
        closeMoneyGunPopover();
      }
    }
  });

  let downX = 0;
  let downY = 0;
  renderer.domElement.addEventListener('pointerdown', (e) => {
    downX = e.clientX;
    downY = e.clientY;
    if (fpState.active && !guidedTourState.active) {
      fpState.draggingLook = true;
      fpState.lastPointerX = e.clientX;
      fpState.lastPointerY = e.clientY;
    }
  });

  window.addEventListener('pointermove', (e) => {
    if (!fpState.active || !fpState.draggingLook || guidedTourState.active) return;
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
    if (titleScreenState.active || guidedTourState.active || driveState.active || duelState.active) return;

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
    if (ud.kind === 'rentCoin3D' && ud.bubbleRef) {
      collectRentBubble(ud.bubbleRef, 0, e.clientX, e.clientY);
    } else if (ud.kind === 'goldenStatue') {
      clickGoldenLandlordStatue();
    } else if (ud.kind === 'furnitureFlagship') {
      openFurnitureFlagshipDrawer();
    } else if (ud.kind === 'firstFloorShop' && ud.shopId) {
      focusCameraOnFirstFloorShop(ud.shopId);
    } else if (ud.kind === 'room' && ud.roomId) {
      focusCameraOnRoom(ud.roomId);
    } else if (ud.kind === 'standaloneShop' && ud.shopId) {
      focusCameraOnShop(ud.shopId);
    } else if (ud.kind === 'vipCar') {
      enterDriveMode();
    } else if (ud.kind === 'lot' && ud.lotId) {
      openLotDevModal(ud.lotId);
    }
  });

  // 타이틀 화면 버튼 & 10종 동물 주인공 아바타 선택 바인딩
  document.getElementById('btn-start-game')?.addEventListener('click', () => {
    if (!state.hasChosenHeroAnimal) {
      openAnimalSelectModal(true);
      return;
    }
    const firstPlay = !localStorage.getItem('god_landlord_tour_seen_v1');
    enterTownFromTitleScreen(firstPlay);
  });
  document.getElementById('btn-continue-game')?.addEventListener('click', () => {
    enterTownFromTitleScreen(false);
  });
  document.getElementById('btn-title-pick-animal')?.addEventListener('click', () => {
    openAnimalSelectModal(false);
  });
  document.getElementById('hud-hero-avatar-btn')?.addEventListener('click', (ev) => {
    ev.stopPropagation();
    openAnimalSelectModal(false);
  });
  document.getElementById('btn-close-animal-modal')?.addEventListener('click', () => {
    closeAnimalSelectModal();
  });
  document.getElementById('btn-confirm-animal-hero')?.addEventListener('click', () => {
    const shouldEnter = animalSelectPendingStart;
    state.hasChosenHeroAnimal = true;
    saveGameState();
    closeAnimalSelectModal();
    triggerGlobalAnimalCheer(3.5);
    showToast('귀여운 동물 주인공 아바타가 설정되었습니다!', 'gold');
    if (shouldEnter && titleScreenState.active) {
      const firstPlay = !localStorage.getItem('god_landlord_tour_seen_v1');
      enterTownFromTitleScreen(firstPlay);
    }
  });

  const openSettingsModal = () => {
    const sm = document.getElementById('settings-modal');
    if (sm && !sm.classList.contains('hidden')) {
      sm.classList.add('hidden');
      return;
    }
    closeAllModalsImmediate('settings-modal');
    sm?.classList.remove('hidden');
  };
  document.getElementById('btn-top-settings')?.addEventListener('click', openSettingsModal);
  document.getElementById('btn-title-settings')?.addEventListener('click', openSettingsModal);
  document.getElementById('btn-pocket-settings')?.addEventListener('click', openSettingsModal);
  document.getElementById('btn-close-settings')?.addEventListener('click', () => {
    document.getElementById('settings-modal')?.classList.add('hidden');
  });

  document.getElementById('btn-toggle-sfx')?.addEventListener('click', (ev) => {
    sfxEnabled = !sfxEnabled;
    if (!sfxEnabled) stopCarRadioBGM();
    ev.currentTarget.textContent = sfxEnabled ? 'ON' : 'OFF';
    ev.currentTarget.classList.toggle('tone-mint', sfxEnabled);
    ev.currentTarget.classList.toggle('tone-cream', !sfxEnabled);
  });

  document.getElementById('btn-toggle-shadows')?.addEventListener('click', (ev) => {
    highQualityShadows = !highQualityShadows;
    if (renderer) renderer.shadowMap.enabled = highQualityShadows;
    if (dirLight) dirLight.castShadow = highQualityShadows;
    ev.currentTarget.textContent = highQualityShadows ? '고품질' : '경량';
  });

  document.getElementById('btn-settings-run-tour')?.addEventListener('click', () => {
    document.getElementById('settings-modal')?.classList.add('hidden');
    if (titleScreenState.active) {
      enterTownFromTitleScreen(true);
    } else {
      startGuidedSimulationTour();
    }
  });
  document.getElementById('btn-settings-reset')?.addEventListener('click', () => resetGameState());

  // 5단계 시네마틱 시뮬레이션 투어 컨트롤
  document.getElementById('btn-guide-tour')?.addEventListener('click', () => {
    closePocketPlanner();
    startGuidedSimulationTour();
  });
  document.getElementById('btn-tour-next')?.addEventListener('click', () => {
    const steps = window.GUIDED_TOUR_STEPS || [];
    if (guidedTourState.stepIdx + 1 >= steps.length) {
      stopGuidedSimulationTour();
    } else {
      applyGuidedTourStep(guidedTourState.stepIdx + 1);
    }
  });
  document.getElementById('btn-tour-skip')?.addEventListener('click', () => stopGuidedSimulationTour());

  // 우측 상단 플로팅 원형 [ ✕ ] 닫기 버튼 (줌인/결투/드라이브/1인칭 공용 복귀)
  document.getElementById('btn-focus-close-floating')?.addEventListener('click', () => {
    if (duelState.active) exitShowroomFlexDuel();
    else if (rivalState.bidding.active) cleanupShopBiddingWar();
    else if (rivalState.poach.active && focusedRoomId === rivalState.poach.roomId) cleanupRivalPoachEvent();
    else if (fpState.active) exitFirstPersonMode();
    else if (driveState.active) exitDriveMode();
    else if (focusedRoomId) exitRoomFocusMode();
    else if (focusedShopId || focusedFirstFloorShopId) exitShopFocusMode();
  });

  // [요구사항 5] 방·상가 클로즈업 시 하단 수동 미니 캡슐 버튼 바인딩 (자동 팝업 제거!)
  document.getElementById('btn-focus-open-drawer')?.addEventListener('click', () => {
    toggleFocusedManualDrawer();
  });
  document.getElementById('btn-focus-open-recruit')?.addEventListener('click', () => {
    const rm = findRoomById(focusedRoomId);
    if (rm) openRecruitModal(rm);
  });
  document.getElementById('btn-focus-enter-fp')?.addEventListener('click', () => {
    if (focusedRoomId) {
      enterFirstPersonRoom(focusedRoomId);
    } else {
      const targetShop = focusedShopId || focusedFirstFloorShopId;
      if (targetShop) enterFirstPersonShop(targetShop, false);
    }
  });

  // 미니 수첩 스탬프 클릭 시 자동으로 수첩 접기 연동
  document.querySelectorAll('#pocket-planner-popover .pocket-stamp-btn').forEach((btn) => {
    btn.addEventListener('click', () => closePocketPlanner());
  });
  document.getElementById('btn-close-pocket-planner')?.addEventListener('click', () => closePocketPlanner());
  document.getElementById('btn-open-ledger-modal')?.addEventListener('click', () => {
    closePocketPlanner();
    openNotebookModal();
  });

  // [요구사항 3] 메종 드 럭셔리 가구 백화점 슬림 드로어 이벤트 바인딩
  document.getElementById('btn-open-furniture-flagship')?.addEventListener('click', () => {
    openFurnitureFlagshipDrawer();
  });
  document.getElementById('btn-close-flagship-drawer')?.addEventListener('click', () => {
    document.getElementById('flagship-shop-drawer')?.classList.add('hidden');
  });
  document.querySelectorAll('[data-shopcat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      flagshipShopTab = btn.getAttribute('data-shopcat') || 'bed';
      renderFurnitureFlagshipDrawer();
    });
  });
  document.querySelectorAll('[data-shoptier]').forEach((btn) => {
    btn.addEventListener('click', () => {
      flagshipTierFilter = btn.getAttribute('data-shoptier') || '0';
      renderFurnitureFlagshipDrawer();
    });
  });

  // [요구사항 4] 1:1 럭셔리 쇼룸 플렉스 꾸미기 결투 이벤트 바인딩
  document.getElementById('btn-duel-tab-rival')?.addEventListener('click', () => switchShowroomDuelTab('rival'));
  document.getElementById('btn-duel-tab-pvp')?.addEventListener('click', () => switchShowroomDuelTab('pvp'));
  document.getElementById('btn-duel-judge-now')?.addEventListener('click', () => startShowroomDuelJudging());
  document.getElementById('btn-duel-open-shop-quick')?.addEventListener('click', () => {
    openFurnitureFlagshipDrawer(duelActiveCat === 'all' ? 'bed' : duelActiveCat);
  });
  document.querySelectorAll('[data-duelcat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      duelActiveCat = btn.getAttribute('data-duelcat') || 'all';
      renderDuelBottomDock();
    });
  });

  // 3일간의 갓물주 연대기 & 제2마을(트와일라잇 하버) 왕래 스위치 바인딩
  document.getElementById('btn-open-chronicle-header')?.addEventListener('click', () => {
    openHarborChronicleModal();
  });
  document.getElementById('btn-harbor-town')?.addEventListener('click', () => {
    closePocketPlanner();
    if (state.harborUnlocked) {
      travelToTownStage(state.activeTownStage === 2 ? 1 : 2);
    } else {
      openHarborChronicleModal();
    }
  });
  document.getElementById('btn-close-chronicle')?.addEventListener('click', () => {
    document.getElementById('harbor-chronicle-modal')?.classList.add('hidden');
  });
  document.getElementById('btn-skip-day3-test')?.addEventListener('click', () => {
    triggerDay3InstantSkip();
  });
  document.getElementById('btn-chronicle-travel-harbor')?.addEventListener('click', () => {
    document.getElementById('harbor-chronicle-modal')?.classList.add('hidden');
    travelToTownStage(state.activeTownStage === 2 ? 1 : 2);
  });
  document.getElementById('btn-switch-stage-1')?.addEventListener('click', () => {
    travelToTownStage(1);
  });
  document.getElementById('btn-switch-stage-2')?.addEventListener('click', () => {
    travelToTownStage(2);
  });

  document.getElementById('hud-badge-forbes')?.addEventListener('click', () => openForbesModal());
  document.getElementById('btn-close-forbes')?.addEventListener('click', () => {
    document.getElementById('forbes-modal')?.classList.add('hidden');
  });
  document.getElementById('btn-forbes-challenge-kang')?.addEventListener('click', () => {
    document.getElementById('forbes-modal')?.classList.add('hidden');
    enterShowroomFlexDuel('rival');
  });

  document.getElementById('btn-rival-battle')?.addEventListener('click', () => enterShowroomFlexDuel('rival'));
  document.getElementById('btn-close-rival-hub')?.addEventListener('click', () => {
    document.getElementById('rival-battle-hub-modal')?.classList.add('hidden');
  });
  document.getElementById('btn-drive-rival-race')?.addEventListener('click', () => startRivalCoastalRace());
  document.getElementById('btn-fp-double-bell')?.addEventListener('click', () => triggerDoubleGoldenBellShowdown());

  document.getElementById('btn-close-poach-dock')?.addEventListener('click', () => cleanupRivalPoachEvent());
  document.getElementById('btn-poach-def-furn')?.addEventListener('click', () => resolveRivalPoachDefense('furn'));
  document.getElementById('btn-poach-def-gift')?.addEventListener('click', () => resolveRivalPoachDefense('gift'));
  document.getElementById('btn-poach-def-rain')?.addEventListener('click', () => resolveRivalPoachDefense('rain'));

  document.getElementById('btn-close-bid-dock')?.addEventListener('click', () => cleanupShopBiddingWar());
  document.getElementById('btn-bid-step-up')?.addEventListener('click', () => raiseShopBidStep());
  document.getElementById('btn-bid-briefcase-slam')?.addEventListener('click', () => slamGoldenBriefcaseBuyout());

  document.getElementById('hud-badge-happy')?.addEventListener('click', () => openHappinessMilestoneModal());
  document.getElementById('btn-close-ms-modal')?.addEventListener('click', () => {
    document.getElementById('happiness-milestone-modal')?.classList.add('hidden');
  });
  document.getElementById('btn-ms-trigger-rain')?.addEventListener('click', () => triggerMansourMakeItRain());

  dom.btnOverviewCam?.addEventListener('click', () => setOverviewCamera(true));

  // [요구사항 2] 우측 하단 [💸] 머니건 클릭 시 4단계 금액 선택 팝오버 오픈!
  dom.btnMakeItRain?.addEventListener('click', (ev) => {
    ev.stopPropagation();
    toggleMoneyGunPopover();
  });
  document.getElementById('btn-close-moneygun-popover')?.addEventListener('click', () => closeMoneyGunPopover());
  document.getElementById('btn-drive-rain')?.addEventListener('click', () => triggerMansourMakeItRain());
  document.getElementById('btn-fp-rain')?.addEventListener('click', () => triggerMansourMakeItRain());
  document.getElementById('btn-drive-scenic-jump')?.addEventListener('click', () => jumpToScenicDriveZone());

  dom.btnEnterDrive?.addEventListener('click', () => enterDriveMode());
  dom.btnOpenGarage?.addEventListener('click', () => openGarageModal());
  dom.btnQuickExpand?.addEventListener('click', () => {
    const nextLot = state.lots.find((l) => l.lotId !== 'lot_main' && l.stage !== 2 && (!l.owned || !l.devType)) || state.lots[1];
    if (nextLot) openLotDevModal(nextLot.lotId);
  });
  dom.btnCollectAll?.addEventListener('click', () => collectAllRentBubbles());

  // [요구사항 5] 우측 슬림 드로어 내부 [✕] 닫기 클릭 시 방/상가 클로즈업 뷰는 그대로 유지하고 우측 드로어만 닫기!
  dom.btnExitRoomView?.addEventListener('click', () => exitRoomFocusMode());
  dom.btnCloseRoomFocus?.addEventListener('click', () => closeFocusedManualDrawerKeepView());
  dom.btnRoomEnterFp?.addEventListener('click', () => {
    if (focusedRoomId) enterFirstPersonRoom(focusedRoomId);
  });

  dom.btnExitShopView?.addEventListener('click', () => exitShopFocusMode());
  dom.btnCloseShopFocus?.addEventListener('click', () => closeFocusedManualDrawerKeepView());
  dom.btnShopEnterFp?.addEventListener('click', () => {
    const targetShop = focusedShopId || focusedFirstFloorShopId;
    if (targetShop) enterFirstPersonShop(targetShop, false);
  });

  dom.btnExitDriveMode?.addEventListener('click', () => exitDriveMode());
  dom.btnToggleCockpit?.addEventListener('click', () => toggleCockpitView());
  dom.btnDriveStepOut?.addEventListener('click', () => openFpVisitModal('shops'));

  document.getElementById('btn-cockpit-radio')?.addEventListener('click', () => cycleCarRadioChannel());
  document.getElementById('btn-cockpit-roof')?.addEventListener('click', () => toggleConvertibleRoof());
  document.getElementById('btn-drive-thru-order')?.addEventListener('click', () => triggerDriveThruOrder());
  document.getElementById('btn-close-prox-banner')?.addEventListener('click', () => dismissDriveProximityBanner());
  document.getElementById('btn-prox-enter-fp')?.addEventListener('click', () => {
    dismissDriveProximityBanner();
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

  const bindFpHoldBtn = (id, keyName, tapYawDelta = 0) => {
    const el = document.getElementById(id);
    if (!el) return;
    const setVal = (v) => {
      fpState.keys[keyName] = v;
      el.classList.toggle('pressed', v);
    };
    el.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      if (tapYawDelta !== 0 && fpState.active) {
        fpState.yaw += tapYawDelta;
      }
      setVal(true);
    });
    el.addEventListener('pointerup', () => setVal(false));
    el.addEventListener('pointerleave', () => setVal(false));
    el.addEventListener('pointercancel', () => setVal(false));
  };
  bindFpHoldBtn('btn-fp-left', 'left', 0.24);
  bindFpHoldBtn('btn-fp-right', 'right', -0.24);
  bindFpHoldBtn('btn-fp-fwd', 'forward', 0);
  bindFpHoldBtn('btn-fp-back', 'backward', 0);

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
  bindHoldPedal(document.getElementById('btn-nitro-boost'), 'boost');

  dom.btnToggleCruise?.addEventListener('click', () => {
    driveState.autoCruise = !driveState.autoCruise;
    syncDriveTopBadges();
  });
  dom.btnCarHorn?.addEventListener('click', () => triggerCarHorn());
  dom.btnDriveGarage?.addEventListener('click', () => openGarageModal());

  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.key === 'Escape') {
      const pocketPop = document.getElementById('pocket-planner-popover');
      if (pocketPop && !pocketPop.classList.contains('hidden')) {
        closePocketPlanner();
        return;
      }
      const mgPop = document.getElementById('moneygun-flex-popover');
      if (mgPop && !mgPop.classList.contains('hidden')) {
        closeMoneyGunPopover();
        return;
      }
      if (guidedTourState.active) {
        stopGuidedSimulationTour();
        return;
      }
      const anyOpenModal = [
        document.getElementById('animal-select-modal'),
        document.getElementById('flagship-shop-drawer'),
        document.getElementById('harbor-chronicle-modal'),
        document.getElementById('settings-modal'),
        document.getElementById('forbes-modal'),
        document.getElementById('rival-battle-hub-modal'),
        document.getElementById('happiness-milestone-modal'),
        dom.notebookModal,
        dom.garageModal,
        dom.lotDevModal,
        dom.recruitModal,
        dom.renameModal,
        dom.fpVisitModal
      ].find((m) => m && !m.classList.contains('hidden'));
      if (anyOpenModal) {
        anyOpenModal.classList.add('hidden');
      } else if (focusRevealState.revealed) {
        closeFocusedManualDrawerKeepView();
      } else if (duelState.active) {
        exitShowroomFlexDuel();
      } else if (rivalState.bidding.active) {
        cleanupShopBiddingWar();
      } else if (rivalState.poach.active && focusedRoomId === rivalState.poach.roomId) {
        cleanupRivalPoachEvent();
      } else if (fpState.active) exitFirstPersonMode();
      else if (driveState.active) exitDriveMode();
      else if (focusedRoomId) exitRoomFocusMode();
      else if (focusedShopId || focusedFirstFloorShopId) exitShopFocusMode();
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
    else if (e.key === 'Shift' || e.key === ' ') {
      e.preventDefault();
      driveState.keys.boost = true;
      driveState.autoCruise = false;
      document.getElementById('btn-nitro-boost')?.classList.add('pressed');
      syncDriveTopBadges();
    } else if (k === 'v' || k === 'c') toggleCockpitView();
    else if (k === 'h') {
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
    else if (e.key === 'Shift' || e.key === ' ') {
      driveState.keys.boost = false;
      document.getElementById('btn-nitro-boost')?.classList.remove('pressed');
    }
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
  dom.fabNotebook?.addEventListener('click', (ev) => {
    ev.stopPropagation();
    closeMoneyGunPopover();
    togglePocketPlanner();
  });

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
  buildTwilightHarborTown3D();
  buildAllStandaloneShops3D();
  buildAllLots3D();
  rebuildHappinessMilestones3D();
  seedInitialStreetVisitors();

  hudAnim.shownGold = state.gold;
  hudAnim.shownHappy = calcAvgHappiness();
  syncFlagshipInventoryBadge();
  syncChronicleAndStageUI();
  applyTownAtmosphere(1);
  updateTopHUDTargets();
  setOverviewCamera(false);
  initTitleScreenUI();
  bindAllUIEvents();
  syncHeroMiniHudAvatar();
  initPopMartAssetsAsync();

  setInterval(() => saveGameState(), 3000);

  let prevTime = performance.now();
  function animateLoop(now) {
    requestAnimationFrame(animateLoop);
    const rawDt = Math.max(0.001, (now - prevTime) / 1000);
    const dt = Math.min(0.05, rawDt);
    const uiDt = Math.min(0.25, rawDt);
    prevTime = now;
    const elapsed = now * 0.001;

    tickTitleScreenAndDroneCam(uiDt);
    tickSimulationEconomyAndCrises(dt);
    tickBuildingResidentsAI(dt, elapsed);
    tickShopInteriorSmartAI(dt, elapsed);
    tickStreetOutingAndDiningAI(dt, elapsed);
    tickRivalBattlesAndRace(dt, elapsed);
    tickShowroomDuelAI(dt, elapsed);
    tickDriveMode(dt, elapsed);
    tickCrashedStreetPropsRecovery(dt);
    tickFirstPersonMode(dt, elapsed);
    tickPopMartCharacterSprites(dt, elapsed);
    tickAnimalModalLiveCanvases(elapsed);
    tickAnimationsAndEffects(dt, elapsed, uiDt);

    if (!titleScreenState.active && !driveState.active && !fpState.active) {
      controls.update();
    }
    updateXRayAndFocusHighlights(dt);
    renderer.render(scene, getActiveCamera());
    updateAllProjectedOverlays(dt);
  }

  requestAnimationFrame(animateLoop);
});
