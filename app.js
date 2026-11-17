// =========================================================
// 【갓물주 라이프: 미니미 하우스】 메인 게임 엔진 (app.js)
// 3D 돌하우스 렌더링, 호실별 개별 월세 타이머, 상가 경제 순환, 돌발 케어, 줌앤팬
// =========================================================

const SAVE_KEY = 'god_landlord_minimi_v2';

// --------------------- 전역 게임 상태 ---------------------
let state = createDefaultState();

function createDefaultState() {
  return {
    gold: 300, // 초기 보유 자산 300만원
    day: 1,
    gameMinutes: 9 * 60, // 따스한 오전 09:00 시작
    questIndex: 0,
    rooms: JSON.parse(JSON.stringify(INITIAL_ROOMS)).map((r) => ({
      ...r,
      tenant: null,
      rentTimer: 0,
      dust: 55
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

// 런타임 전용 상태
const camera = {
  x: 0,
  y: 0,
  scale: WORLD_CONFIG.defaultScale,
  animating: false,
  targetX: 0,
  targetY: 0,
  targetScale: WORLD_CONFIG.defaultScale
};

const selection = {
  type: null, // 'room' | 'shop' | null
  id: null
};

const minimiActors = {}; // roomId -> 미니미 액터 런타임 상태
let activeCareBubbles = []; // 월드 위 클릭형 돌발 케어 이벤트 목록
let careSpawnCooldown = 6.5; // 첫 돌발 케어 등장 초
let shopOrderCooldown = 11.0; // 입주민 -> 1층 상가 연쇄 주문 타이머

let currentApplicants = [];
let recruitTargetRoomId = null;
let activeKakaoEvent = null;
let kakaoCooldown = 28;

const dom = {};

// =========================================================
// 1. 초기화 & 세이브/로드 & 오프라인 보상
// =========================================================
window.addEventListener('DOMContentLoaded', () => {
  cacheDom();
  const offlineInfo = loadGameState();
  renderAllRoomsDOM();
  renderAllShopsDOM();
  syncActorsWithTenants();
  fitWorldToScreen(false);
  bindInputEvents();
  updateHudUI();
  updateQuestUI();

  if (offlineInfo && offlineInfo.earned > 0) {
    showOfflineModal(offlineInfo.awaySec, offlineInfo.earned);
  } else {
    setTimeout(() => {
      if (state.questIndex === 0 && state.rooms[0].furniture.wallpaper === 0) {
        focusOnWorldPoint(408, 642, 0.88);
      }
    }, 300);
  }

  startMainLoops();
});

function cacheDom() {
  dom.viewport = document.getElementById('viewport');
  dom.world = document.getElementById('world-canvas');
  dom.roomsLayer = document.getElementById('rooms-layer');
  dom.shopsLayer = document.getElementById('shops-layer');
  dom.minimiLayer = document.getElementById('minimi-layer');
  dom.careLayer = document.getElementById('care-bubbles-layer');
  dom.particleLayer = document.getElementById('particle-layer');

  dom.hudGold = document.getElementById('hud-gold');
  dom.hudGoldWrap = document.getElementById('hud-gold-wrap');
  dom.hudRentTotal = document.getElementById('hud-rent-total');
  dom.hudShopProfitHint = document.getElementById('hud-shop-profit-hint');
  dom.hudTimeBadge = document.getElementById('hud-time-badge');
  dom.hudOccupancy = document.getElementById('hud-occupancy');
  dom.autosaveIndicator = document.getElementById('autosave-indicator');

  dom.questBtn = document.getElementById('quest-floating-btn');
  dom.questStepTag = document.getElementById('quest-step-tag');
  dom.questRewardTag = document.getElementById('quest-reward-tag');
  dom.questTitle = document.getElementById('quest-title');
  dom.questDesc = document.getElementById('quest-desc');
  dom.questHint = document.getElementById('quest-action-hint');

  dom.kakaoFloatingBtn = document.getElementById('kakao-floating-btn');
  dom.kakaoBannerSender = document.getElementById('kakao-banner-sender');
  dom.kakaoBannerPreview = document.getElementById('kakao-banner-preview');

  dom.zoomScaleLabel = document.getElementById('zoom-scale-label');
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
    console.warn('AutoSave skipped:', e);
  }
}

function loadGameState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem('god_landlord_minimi_v1');
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
      const savedRoom = parsed.rooms.find((r) => r.id === initRoom.id);
      if (!savedRoom) return { ...initRoom, tenant: null, rentTimer: 0, dust: 45 };
      return {
        ...initRoom,
        unlocked: savedRoom.unlocked,
        furniture: { ...initRoom.furniture, ...(savedRoom.furniture || {}) },
        tenant: savedRoom.tenant || null,
        rentTimer: typeof savedRoom.rentTimer === 'number' ? savedRoom.rentTimer : 0,
        dust: typeof savedRoom.dust === 'number' ? savedRoom.dust : 35
      };
    });

    state.shops = {
      store: {
        ...INITIAL_SHOPS.store,
        level: parsed.shops?.store?.level || 1
      },
      laundry: {
        ...INITIAL_SHOPS.laundry,
        level: parsed.shops?.laundry?.level || 1
      }
    };

    const now = Date.now();
    const awaySec = Math.min(28800, Math.floor((now - (parsed.lastSavedAt || now)) / 1000));
    const totalRent = calcTotalActiveRent();
    if (awaySec >= 45 && totalRent > 0) {
      const avgCycle = 11.5;
      const cycles = awaySec / avgCycle;
      const shopBonus = Math.floor(cycles * 0.3 * (
        state.shops.store.levels[state.shops.store.level].visitProfit +
        state.shops.laundry.levels[state.shops.laundry.level].visitProfit
      ));
      const earned = Math.max(8, Math.floor(cycles * totalRent * 0.5 + shopBonus));
      return { awaySec, earned };
    }
  } catch (e) {
    console.warn('Load failed, starting fresh:', e);
  }
  return null;
}

function showOfflineModal(awaySec, earned) {
  const mins = Math.max(1, Math.floor(awaySec / 60));
  dom.offlineTimeText.textContent = `약 ${mins}분 동안 호실별 자동 월세와 1층 상가 매출이 차곡차곡 모였어요!`;
  dom.offlineGoldAmount.textContent = earned.toLocaleString();
  dom.offlineModal.classList.remove('hidden');

  document.getElementById('btn-claim-offline').onclick = () => {
    addGold(earned);
    dom.offlineModal.classList.add('hidden');
    showToast(`🏦 부재중 누적 수익 +${earned.toLocaleString()}만원 수령 완료!`, 'emerald');
    saveGameState();
  };
}

// =========================================================
// 2. 줌앤팬(Zoom & Pan) 대형 디오라마 월드 카메라 엔진
// =========================================================
function clampCamera(x, y, scale) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scaledW = WORLD_CONFIG.width * scale;
  const scaledH = WORLD_CONFIG.height * scale;

  const marginX = Math.max(120, vw * 0.28);
  const marginYTop = Math.max(105, vh * 0.22);
  const marginYBottom = Math.max(240, vh * 0.45);

  const minX = Math.min(marginX, vw - scaledW - marginX);
  const maxX = Math.max(marginX, vw - scaledW + marginX);
  const minY = Math.min(marginYTop, vh - scaledH - marginYBottom);
  const maxY = Math.max(marginYTop, (vh - scaledH) * 0.5 + marginYTop);

  return {
    x: Math.max(minX, Math.min(maxX, x)),
    y: Math.max(minY, Math.min(maxY, y)),
    scale
  };
}

function applyCameraTransform() {
  dom.world.style.transform = `translate3d(${camera.x.toFixed(1)}px, ${camera.y.toFixed(1)}px, 0) scale(${camera.scale.toFixed(4)})`;
  dom.zoomScaleLabel.textContent = `${Math.round(camera.scale * 100)}%`;
}

function setCameraImmediate(x, y, scale) {
  const s = Math.max(WORLD_CONFIG.minScale, Math.min(WORLD_CONFIG.maxScale, scale));
  const clamped = clampCamera(x, y, s);
  camera.x = clamped.x;
  camera.y = clamped.y;
  camera.scale = clamped.scale;
  camera.animating = false;
  applyCameraTransform();
}

function animateCameraTo(x, y, scale) {
  const s = Math.max(WORLD_CONFIG.minScale, Math.min(WORLD_CONFIG.maxScale, scale));
  const clamped = clampCamera(x, y, s);
  camera.targetX = clamped.x;
  camera.targetY = clamped.y;
  camera.targetScale = clamped.scale;
  camera.animating = true;
}

function fitWorldToScreen(smooth = true) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const usableH = vh - 88;
  const fitScale = Math.max(
    WORLD_CONFIG.minScale,
    Math.min(0.88, Math.min((vw - 28) / WORLD_CONFIG.width, usableH / WORLD_CONFIG.height))
  );
  const tx = (vw - WORLD_CONFIG.width * fitScale) / 2;
  const ty = Math.max(66, (vh - WORLD_CONFIG.height * fitScale) / 2 + 22);
  if (smooth) {
    animateCameraTo(tx, ty, fitScale);
  } else {
    setCameraImmediate(tx, ty, fitScale);
  }
}

function focusOnWorldPoint(worldX, worldY, targetScale = 1.15, panelOpenOffset = false) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const s = Math.max(WORLD_CONFIG.minScale, Math.min(WORLD_CONFIG.maxScale, targetScale));
  const screenCenterY = panelOpenOffset ? vh * 0.34 : vh * 0.48;
  const tx = vw * 0.5 - worldX * s;
  const ty = screenCenterY - worldY * s;
  animateCameraTo(tx, ty, s);
}

function zoomAroundPoint(newScale, screenX, screenY, smooth = false) {
  const clampedScale = Math.max(WORLD_CONFIG.minScale, Math.min(WORLD_CONFIG.maxScale, newScale));
  const worldX = (screenX - camera.x) / camera.scale;
  const worldY = (screenY - camera.y) / camera.scale;
  const nx = screenX - worldX * clampedScale;
  const ny = screenY - worldY * clampedScale;
  if (smooth) {
    animateCameraTo(nx, ny, clampedScale);
  } else {
    setCameraImmediate(nx, ny, clampedScale);
  }
}

function bindInputEvents() {
  let isPointerDown = false;
  let startX = 0;
  let startY = 0;
  let camStartX = 0;
  let camStartY = 0;
  let dragDistance = 0;

  dom.viewport.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isPointerDown = true;
    camera.animating = false;
    startX = e.clientX;
    startY = e.clientY;
    camStartX = camera.x;
    camStartY = camera.y;
    dragDistance = 0;
    dom.viewport.classList.add('dragging');
  });

  window.addEventListener('mousemove', (e) => {
    if (!isPointerDown) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    dragDistance = Math.hypot(dx, dy);
    if (dragDistance > 3) {
      setCameraImmediate(camStartX + dx, camStartY + dy, camera.scale);
    }
  });

  window.addEventListener('mouseup', () => {
    isPointerDown = false;
    dom.viewport.classList.remove('dragging');
  });

  dom.viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    zoomAroundPoint(camera.scale * factor, e.clientX, e.clientY, false);
  }, { passive: false });

  let touchMode = null;
  let pinchStartDist = 0;
  let pinchStartScale = 1;

  dom.viewport.addEventListener('touchstart', (e) => {
    camera.animating = false;
    if (e.touches.length === 1) {
      touchMode = 'pan';
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      camStartX = camera.x;
      camStartY = camera.y;
      dragDistance = 0;
    } else if (e.touches.length === 2) {
      touchMode = 'pinch';
      pinchStartDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartScale = camera.scale;
      dragDistance = 999;
    }
  }, { passive: false });

  dom.viewport.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (touchMode === 'pan' && e.touches.length === 1) {
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      dragDistance = Math.hypot(dx, dy);
      if (dragDistance > 4) {
        setCameraImmediate(camStartX + dx, camStartY + dy, camera.scale);
      }
    } else if (e.touches.length === 2) {
      touchMode = 'pinch';
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      if (pinchStartDist > 10) {
        zoomAroundPoint(pinchStartScale * (dist / pinchStartDist), midX, midY, false);
      }
    }
  }, { passive: false });

  dom.viewport.addEventListener('touchend', (e) => {
    if (e.touches.length === 0) {
      touchMode = null;
    } else if (e.touches.length === 1) {
      touchMode = 'pan';
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      camStartX = camera.x;
      camStartY = camera.y;
    }
  });

  // 월드 클릭 위임 (돌발 케어 말풍선 우선 -> 호실 -> 상가)
  dom.world.addEventListener('click', (e) => {
    if (dragDistance > 10) return;

    const careBtn = e.target.closest('[data-care-id]');
    if (careBtn) {
      e.stopPropagation();
      resolveCareBubble(careBtn.dataset.careId);
      return;
    }

    const roomCard = e.target.closest('[data-room-id]');
    if (roomCard) {
      selectRoom(roomCard.dataset.roomId, true);
      return;
    }

    const shopCard = e.target.closest('[data-shop-id]');
    if (shopCard) {
      selectShop(shopCard.dataset.shopId, true);
    }
  });

  document.getElementById('btn-zoom-in').addEventListener('click', () => {
    zoomAroundPoint(camera.scale * 1.28, window.innerWidth / 2, window.innerHeight / 2, true);
  });
  document.getElementById('btn-zoom-out').addEventListener('click', () => {
    zoomAroundPoint(camera.scale / 1.28, window.innerWidth / 2, window.innerHeight / 2, true);
  });
  document.getElementById('btn-zoom-fit').addEventListener('click', () => {
    closeBottomPanel();
    fitWorldToScreen(true);
  });

  document.getElementById('btn-close-panel').addEventListener('click', closeBottomPanel);

  document.getElementById('btn-close-recruit').addEventListener('click', () => {
    dom.recruitModal.classList.add('hidden');
  });
  document.getElementById('btn-refresh-applicants').addEventListener('click', () => {
    if (!recruitTargetRoomId) return;
    if (state.gold < 10) {
      showToast('💸 홍보 비용(10만원)이 부족합니다!', 'rose');
      return;
    }
    addGold(-10);
    const room = getRoomById(recruitTargetRoomId);
    currentApplicants = generateApplicants(room);
    renderRecruitCards(room);
    showToast('📢 새로운 입주 희망자 3명이 도착했어요!', 'amber');
  });

  dom.questBtn.addEventListener('click', handleQuestBadgeClick);
  dom.kakaoFloatingBtn.addEventListener('click', openKakaoModal);
  document.getElementById('btn-close-kakao').addEventListener('click', () => {
    dom.kakaoModal.classList.add('hidden');
  });

  let resetArmed = false;
  const resetBtn = document.getElementById('btn-reset-save');
  resetBtn.addEventListener('click', () => {
    if (!resetArmed) {
      resetArmed = true;
      resetBtn.textContent = '⚠️';
      showToast('🔄 데이터를 초기화하려면 3초 안에 ⚠️ 버튼을 한 번 더 눌러주세요!', 'rose');
      setTimeout(() => {
        resetArmed = false;
        resetBtn.textContent = '🔄';
      }, 3200);
      return;
    }
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem('god_landlord_minimi_v1');
    window.location.reload();
  });

  window.addEventListener('resize', () => {
    setCameraImmediate(camera.x, camera.y, camera.scale);
  });
}

// =========================================================
// 3. 3D 미니어처 돌하우스(Dollhouse) 단면도 & 고밀도 커스텀 SVG 에셋
// =========================================================
function renderAllRoomsDOM() {
  dom.roomsLayer.innerHTML = '';
  for (const room of state.rooms) {
    const el = document.createElement('div');
    el.id = `room-dom-${room.id}`;
    el.dataset.roomId = room.id;
    el.style.left = `${room.x}px`;
    el.style.top = `${room.y}px`;
    dom.roomsLayer.appendChild(el);
    updateSingleRoomDOM(room.id);
  }
}

function updateSingleRoomDOM(roomId, upgradedKey = null) {
  const room = getRoomById(roomId);
  const el = document.getElementById(`room-dom-${roomId}`);
  if (!room || !el) return;

  const wpLv = room.furniture.wallpaper || 0;
  const isSelected = selection.type === 'room' && selection.id === roomId;
  const actor = minimiActors[roomId];
  const isShowering = actor && actor.state === 'SHOWERING' && actor.atTarget;
  const isSleeping = actor && actor.state === 'SLEEPING' && actor.atTarget;
  const isDoorOpen = actor && actor.doorOpen;

  el.className = [
    'room-card',
    `wallpaper-lv${wpLv}`,
    isSelected ? 'selected-room' : '',
    isShowering ? 'is-showering' : '',
    isSleeping ? 'is-sleeping' : '',
    isDoorOpen ? 'door-open' : ''
  ].filter(Boolean).join(' ');

  const marketRent = calcRoomMarketRent(room);
  const effectiveRent = getEffectiveRoomRent(room);
  const activeSet = getRoomThemeSet(room);
  const hasCat = room.tenant && room.tenant.style && room.tenant.style.hasCat;

  const remainSec = Math.max(1, Math.ceil(room.rentCycleSec - (room.rentTimer || 0)));
  const pct = Math.min(100, ((room.rentTimer || 0) / room.rentCycleSec) * 100);

  el.innerHTML = `
    <!-- 호실 상단 3D 이름표 & 테마 세트 뱃지 & 호실별 개별 월세 쿨타임 게이지 -->
    <div class="room-top-hud">
      <div class="flex items-center gap-1">
        <span class="room-name-jelly">${room.name}</span>
        ${room.unlocked && activeSet ? `<span class="room-set-mini-tag ${activeSet.badgeClass}">${activeSet.icon} +${activeSet.bonusPct}%</span>` : ''}
      </div>

      ${room.unlocked && room.tenant ? `
        <div class="room-rent-timer-box">
          <div class="room-rent-timer-row">
            <span class="text-emerald-800">월세 +${effectiveRent}만</span>
            <span id="rent-sec-${room.id}" class="text-amber-900">⏱️ ${String(remainSec).padStart(2, '0')}s</span>
          </div>
          <div class="room-rent-progress-track">
            <div id="rent-bar-${room.id}" class="room-rent-progress-fill" style="width:${pct.toFixed(1)}%"></div>
          </div>
        </div>
      ` : room.unlocked ? `
        <div class="bg-white/95 border-2 border-amber-700 rounded-full px-2.5 py-0.5 font-jua text-[11px] text-amber-900 shadow-sm">
          적정 월세 ${marketRent}만
        </div>
      ` : ''}
    </div>

    <!-- 3D 돌하우스 단면 6면체 구조 (천장 몰딩, 좌/우 측면벽, 안쪽 뒷벽, 바닥, 전면 슬래브) -->
    <div class="dollhouse-ceiling"></div>
    <div class="dollhouse-wall-left"></div>
    <div class="dollhouse-wall-right"></div>

    <!-- 뒷벽 & 입체 커튼 창문 & 벽 액자 -->
    <div class="dollhouse-wall-back">
      ${renderWindowWithCurtainSVG(wpLv, room.id)}
      ${wpLv >= 1 ? renderWallArtSVG(wpLv) : ''}
    </div>

    <!-- 원근 바닥면 & 코지 러그 & 먼지 -->
    <div class="dollhouse-floor">
      ${renderCenterRugSVG(wpLv, room.dust, room.id)}
    </div>

    <!-- 창문에서 바닥으로 쏟아지는 따뜻한 햇살 광선(Sunbeam) & 스탠드 무드등 광원 -->
    ${wpLv >= 1 ? '<div class="room-sunbeam"></div>' : ''}
    ${room.furniture.bed >= 1 ? '<div class="room-lamp-glow"></div>' : ''}

    <!-- 에어컨 & 반려식물 화분 (벽면 & 코너) -->
    <div class="furniture-item ${upgradedKey === 'ac' ? 'upgraded-pop' : ''}" style="left: 184px; top: 24px;">
      ${renderFurnitureSVG('ac', room.furniture.ac, room.id)}
    </div>
    <div class="furniture-item ${upgradedKey === 'ac' ? 'upgraded-pop' : ''}" style="left: 222px; top: 88px;">
      ${renderCornerPlantSVG(room.furniture.ac)}
    </div>

    <!-- 폭신한 침대 & 스탠드 조명 (좌측 코너) -->
    <div class="furniture-item ${upgradedKey === 'bed' ? 'upgraded-pop' : ''}" style="left: 22px; top: 62px;">
      ${renderFurnitureSVG('bed', room.furniture.bed, room.id)}
    </div>

    <!-- 반짝이는 유리 부스형 욕실 샤워실 (우측 상단) -->
    <div class="bathroom-3d-pod ${upgradedKey === 'shower' ? 'upgraded-pop' : ''}">
      ${renderFurnitureSVG('shower', room.furniture.shower, room.id)}
      <div class="shower-frosted-glass">
        <span class="text-base">🫧♨️</span>
        <span>SHOWER</span>
      </div>
    </div>

    <!-- 미니 주방 싱크대 (좌측 하단) -->
    <div class="furniture-item ${upgradedKey === 'kitchen' ? 'upgraded-pop' : ''}" style="left: 22px; top: 174px;">
      ${renderFurnitureSVG('kitchen', room.furniture.kitchen, room.id)}
    </div>

    <!-- 감성 데스크 / PC & 체어 (우측 하단) -->
    <div class="furniture-item ${upgradedKey === 'desk' ? 'upgraded-pop' : ''}" style="left: 248px; top: 166px;">
      ${renderFurnitureSVG('desk', room.furniture.desk, room.id)}
    </div>

    <!-- 고양이 집사 전용 치즈냥이 SVG -->
    ${hasCat ? renderPetCatSVG() : ''}

    <!-- 공실 모집 유도 3D 젤리 배지 -->
    ${room.unlocked && !room.tenant ? `
      <div class="absolute left-1/2 top-[134px] -translate-x-1/2 z-[7] jelly-btn-amber font-jua text-xs px-3.5 py-1.5 rounded-full animate-bounce pointer-events-none">
        🏡 공실 · 터치해 꾸미고 입주시키기!
      </div>
    ` : ''}

    <div class="room-sleep-mood"></div>
    <div class="room-door-frame"><div class="room-door-leaf"></div></div>
    <div class="dollhouse-floor-slab"></div>

    <!-- 미개방 호실 잠금 오버레이 -->
    ${!room.unlocked ? `
      <div class="locked-room-overlay">
        <svg width="46" height="46" viewBox="0 0 48 48" class="mb-1">
          <rect x="10" y="20" width="28" height="22" rx="6" fill="#fbbf24" stroke="#78350f" stroke-width="3"/>
          <path d="M16 20 V14 A8 8 0 0 1 32 14 V20" fill="none" stroke="#fef3c7" stroke-width="4" stroke-linecap="round"/>
          <circle cx="24" cy="31" r="3.5" fill="#78350f"/>
        </svg>
        <div class="font-jua text-base text-amber-200 drop-shadow">${room.name} 코지 원룸 미개방</div>
        <div class="jelly-btn-amber font-jua text-xs px-3.5 py-1 rounded-full mt-1.5">
          🔓 분양 오픈 💰${room.unlockCost}만원
        </div>
      </div>
    ` : ''}
  `;
}

// 입체 창문 + 풍경 + 리본 커튼 고밀도 SVG
function renderWindowWithCurtainSVG(wpLv, uid) {
  const frameStroke = wpLv >= 3 ? '#ca8a04' : wpLv >= 2 ? '#92400e' : '#78716c';
  const curtainColor = wpLv >= 3 ? '#fde68a' : wpLv === 2 ? '#fed7aa' : wpLv === 1 ? '#fbcfe8' : '#d6d3d1';
  const curtainShadow = wpLv >= 3 ? '#eab308' : wpLv === 2 ? '#fb923c' : wpLv === 1 ? '#f472b6' : '#a8a29e';

  return `
    <svg width="86" height="62" viewBox="0 0 86 62" style="position:absolute; left:84px; top:14px;">
      <defs>
        <linearGradient id="skyWin_${uid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#7dd3fc"/>
          <stop offset="100%" stop-color="#fef9c3"/>
        </linearGradient>
      </defs>
      <!-- 창틀 그림자 -->
      <rect x="9" y="6" width="68" height="50" rx="7" fill="rgba(67,20,7,0.18)"/>
      <!-- 창밖 하늘 & 구름 & 푸른 언덕 -->
      <rect x="10" y="4" width="66" height="48" rx="6" fill="url(#skyWin_${uid})" stroke="${frameStroke}" stroke-width="3.2"/>
      <circle cx="30" cy="18" r="6" fill="#ffffff" opacity="0.9"/>
      <circle cx="37" cy="17" r="7" fill="#ffffff" opacity="0.9"/>
      <path d="M12 48 Q30 32 48 44 Q62 34 74 48 Z" fill="#86efac"/>
      <!-- 창살 & 유리 빛반사 -->
      <line x1="43" y1="5" x2="43" y2="51" stroke="${frameStroke}" stroke-width="2.6"/>
      <line x1="11" y1="28" x2="75" y2="28" stroke="${frameStroke}" stroke-width="2.2"/>
      <path d="M17 12 L25 12 L18 24 L14 24 Z" fill="rgba(255,255,255,0.55)"/>
      <!-- 양쪽 주름 커튼 & 리본 -->
      <path d="M6 3 Q20 4 21 26 Q17 42 8 54 Q3 30 6 3 Z" fill="${curtainColor}" stroke="${curtainShadow}" stroke-width="1.6"/>
      <path d="M80 3 Q66 4 65 26 Q69 42 78 54 Q83 30 80 3 Z" fill="${curtainColor}" stroke="${curtainShadow}" stroke-width="1.6"/>
      <circle cx="13" cy="34" r="3" fill="${curtainShadow}"/>
      <circle cx="73" cy="34" r="3" fill="${curtainShadow}"/>
      <!-- 창턱 원목 선반 -->
      <rect x="6" y="50" width="74" height="6" rx="3" fill="#fffbeb" stroke="${frameStroke}" stroke-width="2"/>
    </svg>
  `;
}

// 뒷벽 감성 미니 액자 SVG
function renderWallArtSVG(wpLv) {
  const border = wpLv >= 3 ? '#eab308' : '#b45309';
  return `
    <svg width="34" height="38" viewBox="0 0 34 38" style="position:absolute; left:36px; top:18px;">
      <rect x="3" y="5" width="28" height="30" rx="4" fill="#fffbeb" stroke="${border}" stroke-width="2.4"/>
      <circle cx="17" cy="17" r="6" fill="#fda4af"/>
      <path d="M9 29 Q17 21 25 29" fill="#86efac"/>
    </svg>
  `;
}

// 바닥 감성 둥근 러그 & 먼지 SVG
function renderCenterRugSVG(wpLv, dust = 0, uid = 'r') {
  let rugMarkup = '';
  if (wpLv === 0) {
    rugMarkup = `<ellipse cx="188" cy="92" rx="42" ry="22" fill="#cbbfb2" stroke="#8c7f70" stroke-width="2" stroke-dasharray="5 3"/>`;
  } else if (wpLv === 1) {
    rugMarkup = `
      <ellipse cx="188" cy="94" rx="52" ry="28" fill="#fce7f3" stroke="#f472b6" stroke-width="2.5"/>
      <ellipse cx="188" cy="94" rx="38" ry="19" fill="#fff1f2" stroke="#fbcfe8" stroke-width="2"/>
    `;
  } else if (wpLv === 2) {
    rugMarkup = `
      <ellipse cx="188" cy="94" rx="56" ry="30" fill="#fef3c7" stroke="#d97706" stroke-width="2.8"/>
      <ellipse cx="188" cy="94" rx="43" ry="21" fill="#fffbeb" stroke="#f59e0b" stroke-width="1.8" stroke-dasharray="4 3"/>
    `;
  } else {
    rugMarkup = `
      <ellipse cx="188" cy="94" rx="58" ry="31" fill="#fef9c3" stroke="#ca8a04" stroke-width="3"/>
      <ellipse cx="188" cy="94" rx="46" ry="23" fill="#ffffff" stroke="#eab308" stroke-width="2"/>
      <circle cx="188" cy="94" r="7" fill="#fde047"/>
    `;
  }

  const dustMarkup = dust >= 50 ? `
    <g opacity="0.52">
      <circle cx="144" cy="68" r="5" fill="#78716c"/>
      <circle cx="151" cy="71" r="3.5" fill="#a8a29e"/>
      <circle cx="228" cy="116" r="5.5" fill="#78716c"/>
      <circle cx="172" cy="132" r="4.5" fill="#78716c"/>
    </g>
  ` : '';

  return `<svg width="384" height="162" viewBox="0 0 384 162" class="pointer-events-none">${rugMarkup}${dustMarkup}</svg>`;
}

// 코너 반려식물 화분 고밀도 SVG
function renderCornerPlantSVG(acLv) {
  if (acLv === 0) return '';
  if (acLv === 1) {
    return `
      <svg width="34" height="44" viewBox="0 0 34 44">
        <ellipse cx="17" cy="40" rx="11" ry="3.5" fill="rgba(67,20,7,0.2)"/>
        <path d="M9 24 L25 24 L22 39 L12 39 Z" fill="#fb923c" stroke="#7c2d12" stroke-width="2"/>
        <ellipse cx="13" cy="18" rx="6" ry="8" fill="#4ade80" stroke="#166534" stroke-width="1.8" transform="rotate(-22 13 18)"/>
        <ellipse cx="21" cy="18" rx="6" ry="8" fill="#22c55e" stroke="#166534" stroke-width="1.8" transform="rotate(22 21 18)"/>
      </svg>`;
  }
  if (acLv === 2) {
    return `
      <svg width="38" height="50" viewBox="0 0 38 50">
        <ellipse cx="19" cy="45" rx="13" ry="4" fill="rgba(67,20,7,0.22)"/>
        <rect x="10" y="28" width="18" height="17" rx="5" fill="#fef3c7" stroke="#92400e" stroke-width="2"/>
        <ellipse cx="11" cy="20" rx="7" ry="10" fill="#22c55e" stroke="#14532d" stroke-width="1.8" transform="rotate(-28 11 20)"/>
        <ellipse cx="27" cy="20" rx="7" ry="10" fill="#16a34a" stroke="#14532d" stroke-width="1.8" transform="rotate(28 27 20)"/>
        <ellipse cx="19" cy="14" rx="7" ry="11" fill="#4ade80" stroke="#14532d" stroke-width="1.8"/>
      </svg>`;
  }
  return `
    <svg width="40" height="54" viewBox="0 0 40 54">
      <ellipse cx="20" cy="49" rx="14" ry="4" fill="rgba(67,20,7,0.24)"/>
      <path d="M10 31 L30 31 L27 48 L13 48 Z" fill="#fffbeb" stroke="#ca8a04" stroke-width="2.2"/>
      <line x1="20" y1="31" x2="20" y2="16" stroke="#78350f" stroke-width="3"/>
      <circle cx="20" cy="14" r="11" fill="#4ade80" stroke="#166534" stroke-width="2"/>
      <circle cx="13" cy="18" r="7" fill="#22c55e" stroke="#166534" stroke-width="1.8"/>
      <circle cx="27" cy="18" r="7" fill="#86efac" stroke="#166534" stroke-width="1.8"/>
      <circle cx="22" cy="12" r="2.5" fill="#fde047"/>
    </svg>`;
}

function renderPetCatSVG() {
  return `
    <div class="room-pet-cat">
      <svg width="38" height="32" viewBox="0 0 38 32">
        <ellipse cx="19" cy="27" rx="14" ry="4.5" fill="rgba(87,36,8,0.22)"/>
        <ellipse cx="20" cy="20" rx="11" ry="7.5" fill="#fb923c" stroke="#7c2d12" stroke-width="2"/>
        <circle cx="12" cy="14" r="7" fill="#fdba74" stroke="#7c2d12" stroke-width="2"/>
        <polygon points="6,10 8,3 13,8" fill="#fb923c" stroke="#7c2d12" stroke-width="1.6"/>
        <polygon points="13,8 17,3 19,10" fill="#fb923c" stroke="#7c2d12" stroke-width="1.6"/>
        <circle cx="9.8" cy="14" r="1.3" fill="#1e293b"/>
        <circle cx="14.2" cy="14" r="1.3" fill="#1e293b"/>
        <ellipse cx="12" cy="16" rx="1.6" ry="1" fill="#fb7185"/>
        <path d="M30 20 Q36 13 33 8" fill="none" stroke="#fb923c" stroke-width="3.2" stroke-linecap="round"/>
      </svg>
    </div>
  `;
}

// 자체 제작 고밀도 '귀염뽀짝' 3D풍 인라인 SVG 가구 에셋 (Lv.0 ~ Lv.3 완벽 구분)
function renderFurnitureSVG(type, lv, uid = 'f') {
  if (type === 'bed') {
    if (lv === 0) {
      return `
        <svg width="114" height="104" viewBox="0 0 114 104">
          <ellipse cx="56" cy="94" rx="46" ry="7" fill="rgba(0,0,0,0.16)"/>
          <rect x="14" y="30" width="82" height="62" rx="10" fill="#d6d3d1" stroke="#78716c" stroke-width="2.2" stroke-dasharray="5 3"/>
          <rect x="26" y="36" width="36" height="16" rx="6" fill="#e7e5e4" stroke="#78716c" stroke-width="1.8"/>
          <path d="M16 56 Q55 50 94 56 L94 86 Q55 92 16 86 Z" fill="#a8a29e" stroke="#57534e" stroke-width="1.8"/>
        </svg>`;
    }
    if (lv === 1) {
      return `
        <svg width="122" height="106" viewBox="0 0 122 106">
          <ellipse cx="54" cy="96" rx="48" ry="8" fill="rgba(120,53,15,0.2)"/>
          <!-- 침대 헤드 & 원목 다리 -->
          <rect x="8" y="12" width="84" height="22" rx="8" fill="#fed7aa" stroke="#9a3412" stroke-width="2.5"/>
          <rect x="12" y="86" width="8" height="10" rx="3" fill="#9a3412"/>
          <rect x="76" y="86" width="8" height="10" rx="3" fill="#9a3412"/>
          <!-- 매트리스 & 폭신한 코랄핑크 이불 -->
          <rect x="8" y="24" width="84" height="66" rx="12" fill="#fffbeb" stroke="#9a3412" stroke-width="2.5"/>
          <path d="M8 46 Q50 40 92 46 L92 80 Q92 90 80 90 L20 90 Q8 90 8 80 Z" fill="#fda4af" stroke="#be123c" stroke-width="2.2"/>
          <path d="M14 54 Q50 49 86 54" fill="none" stroke="rgba(255,255,255,0.65)" stroke-width="2.5" stroke-linecap="round"/>
          <!-- 통통 베개 -->
          <rect x="18" y="28" width="30" height="16" rx="7" fill="#ffffff" stroke="#f472b6" stroke-width="1.8"/>
          <rect x="52" y="28" width="30" height="16" rx="7" fill="#ffffff" stroke="#f472b6" stroke-width="1.8"/>
          <!-- 옆 협탁 & 노란 미니 스탠드 조명 -->
          <rect x="96" y="42" width="22" height="24" rx="5" fill="#fde68a" stroke="#92400e" stroke-width="2"/>
          <path d="M99 34 L115 34 L112 22 L102 22 Z" fill="#fef08a" stroke="#b45309" stroke-width="1.8"/>
          <rect x="105" y="34" width="4" height="9" fill="#92400e"/>
        </svg>`;
    }
    if (lv === 2) {
      return `
        <svg width="126" height="108" viewBox="0 0 126 108">
          <ellipse cx="56" cy="98" rx="52" ry="8" fill="rgba(120,53,15,0.24)"/>
          <!-- 북유럽 오크 원목 헤드보드 -->
          <rect x="6" y="8" width="88" height="24" rx="9" fill="#d97706" stroke="#572408" stroke-width="2.6"/>
          <rect x="12" y="13" width="76" height="6" rx="3" fill="#f59e0b"/>
          <!-- 폭신한 매트리스 & 세이지그린/크림 퀼팅 구름 이불 -->
          <rect x="8" y="24" width="84" height="68" rx="13" fill="#fffdf9" stroke="#78350f" stroke-width="2.5"/>
          <path d="M8 46 Q50 38 92 46 L92 80 Q92 92 80 92 L20 92 Q8 92 8 80 Z" fill="#6ee7b7" stroke="#065f46" stroke-width="2.4"/>
          <rect x="10" y="43" width="80" height="9" rx="4" fill="#fef3c7" stroke="#b45309" stroke-width="1.6"/>
          <ellipse cx="32" cy="66" rx="12" ry="5" fill="rgba(255,255,255,0.35)"/>
          <!-- 베개 2개 -->
          <rect x="16" y="27" width="31" height="16" rx="7" fill="#ffffff" stroke="#d97706" stroke-width="1.8"/>
          <rect x="53" y="27" width="31" height="16" rx="7" fill="#ffffff" stroke="#d97706" stroke-width="1.8"/>
          <!-- 원목 협탁 & 따뜻한 갓 스탠드 -->
          <rect x="96" y="40" width="24" height="28" rx="6" fill="#e09f3e" stroke="#78350f" stroke-width="2.2"/>
          <circle cx="108" cy="54" r="2.2" fill="#572408"/>
          <path d="M98 32 L118 32 L114 18 L102 18 Z" fill="#fde047" stroke="#92400e" stroke-width="2"/>
          <rect x="106" y="32" width="4" height="9" fill="#78350f"/>
        </svg>`;
    }
    return `
      <svg width="128" height="110" viewBox="0 0 128 110">
        <ellipse cx="58" cy="100" rx="54" ry="9" fill="rgba(120,53,15,0.26)"/>
        <!-- 로얄 골드 아치 벨벳 헤드보드 -->
        <path d="M6 28 Q50 -2 94 28 L94 34 L6 34 Z" fill="#fde047" stroke="#854d0e" stroke-width="2.8"/>
        <rect x="8" y="24" width="84" height="70" rx="14" fill="#ffffff" stroke="#ca8a04" stroke-width="2.8"/>
        <!-- 5성급 구스다운 샴페인골드 침구 -->
        <path d="M8 46 Q50 38 92 46 L92 82 Q92 94 80 94 L20 94 Q8 94 8 82 Z" fill="#fef08a" stroke="#a16207" stroke-width="2.4"/>
        <path d="M12 56 L88 56 M12 72 L88 72" stroke="#eab308" stroke-width="1.8" stroke-dasharray="6 4"/>
        <rect x="16" y="27" width="31" height="17" rx="8" fill="#fffbeb" stroke="#eab308" stroke-width="2"/>
        <rect x="53" y="27" width="31" height="17" rx="8" fill="#fffbeb" stroke="#eab308" stroke-width="2"/>
        <!-- 골드 크리스탈 스탠드 -->
        <rect x="97" y="42" width="25" height="28" rx="7" fill="#fffbeb" stroke="#ca8a04" stroke-width="2.2"/>
        <circle cx="109.5" cy="24" r="9" fill="#fef9c3" stroke="#eab308" stroke-width="2.2"/>
        <rect x="108" y="33" width="3" height="9" fill="#ca8a04"/>
      </svg>`;
  }

  if (type === 'shower') {
    if (lv === 0) {
      return `
        <svg width="92" height="120" viewBox="0 0 92 120">
          <ellipse cx="46" cy="48" rx="22" ry="15" fill="#f1f5f9" stroke="#64748b" stroke-width="2.4"/>
          <circle cx="46" cy="48" r="4" fill="#475569"/>
          <path d="M46 28 L46 38" stroke="#64748b" stroke-width="3" stroke-linecap="round"/>
        </svg>`;
    }
    if (lv === 1) {
      return `
        <svg width="92" height="120" viewBox="0 0 92 120">
          <!-- 샤워기 헤드 & 온수 수전 -->
          <path d="M46 10 L46 22 M36 22 L56 22" stroke="#0284c7" stroke-width="3.2" stroke-linecap="round"/>
          <circle cx="32" cy="52" r="5" fill="#fda4af" stroke="#be123c" stroke-width="1.5"/>
          <circle cx="60" cy="52" r="5" fill="#7dd3fc" stroke="#0369a1" stroke-width="1.5"/>
          <!-- 귀여운 도트 샤워커튼 & 발매트 -->
          <path d="M8 14 Q24 22 40 14 L36 106 L8 106 Z" fill="rgba(255,255,255,0.78)" stroke="#38bdf8" stroke-width="2"/>
          <circle cx="20" cy="38" r="3" fill="#f472b6"/>
          <circle cx="26" cy="62" r="3" fill="#facc15"/>
          <circle cx="18" cy="84" r="3" fill="#38bdf8"/>
          <ellipse cx="52" cy="98" rx="22" ry="9" fill="#fde68a" stroke="#d97706" stroke-width="2"/>
        </svg>`;
    }
    if (lv === 2) {
      return `
        <svg width="92" height="120" viewBox="0 0 92 120">
          <!-- 크롬 레인샤워 & 우드 샴푸 선반 -->
          <rect x="32" y="8" width="28" height="7" rx="3.5" fill="#0284c7"/>
          <rect x="52" y="38" width="28" height="7" rx="3" fill="#d97706" stroke="#78350f" stroke-width="1.5"/>
          <rect x="56" y="27" width="7" height="11" rx="2" fill="#34d399" stroke="#065f46" stroke-width="1.2"/>
          <rect x="66" y="29" width="7" height="9" rx="2" fill="#f472b6" stroke="#9d174d" stroke-width="1.2"/>
          <!-- 반짝이는 강화유리 파티션 & 빛반사 -->
          <rect x="8" y="8" width="38" height="102" rx="6" fill="rgba(224,242,254,0.58)" stroke="#0284c7" stroke-width="2.4"/>
          <line x1="15" y1="22" x2="34" y2="52" stroke="rgba(255,255,255,0.85)" stroke-width="3" stroke-linecap="round"/>
          <line x1="15" y1="58" x2="28" y2="78" stroke="rgba(255,255,255,0.75)" stroke-width="2" stroke-linecap="round"/>
        </svg>`;
    }
    return `
      <svg width="92" height="120" viewBox="0 0 92 120">
        <!-- 골드 레인샤워 & 히노끼 버블 스파 욕조 -->
        <rect x="28" y="7" width="36" height="8" rx="4" fill="#eab308" stroke="#78350f" stroke-width="1.8"/>
        <ellipse cx="46" cy="80" rx="36" ry="24" fill="#e09f3e" stroke="#78350f" stroke-width="2.8"/>
        <ellipse cx="46" cy="77" rx="29" ry="17" fill="#7dd3fc"/>
        <!-- 몽글몽글 목욕 거품 & 러버덕 -->
        <circle cx="30" cy="72" r="7" fill="#ffffff"/>
        <circle cx="42" cy="69" r="8" fill="#ffffff"/>
        <circle cx="56" cy="71" r="7" fill="#ffffff"/>
        <circle cx="62" cy="77" r="5" fill="#fde047" stroke="#b45309" stroke-width="1.4"/>
      </svg>`;
  }

  if (type === 'kitchen') {
    if (lv === 0) {
      return `
        <svg width="110" height="72" viewBox="0 0 110 72">
          <ellipse cx="52" cy="62" rx="32" ry="6" fill="rgba(0,0,0,0.16)"/>
          <rect x="24" y="30" width="52" height="28" rx="6" fill="#78716c" stroke="#44403c" stroke-width="2.2"/>
          <circle cx="50" cy="44" r="9" fill="#fb923c" stroke="#9a3412" stroke-width="2"/>
        </svg>`;
    }
    if (lv === 1) {
      return `
        <svg width="114" height="78" viewBox="0 0 114 78">
          <ellipse cx="57" cy="71" rx="48" ry="6" fill="rgba(120,53,15,0.2)"/>
          <!-- 크림옐로우 하부장 & 화이트 상판 -->
          <rect x="8" y="24" width="96" height="46" rx="9" fill="#fde68a" stroke="#92400e" stroke-width="2.5"/>
          <rect x="6" y="18" width="100" height="14" rx="6" fill="#ffffff" stroke="#92400e" stroke-width="2.2"/>
          <line x1="56" y1="32" x2="56" y2="68" stroke="#b45309" stroke-width="2"/>
          <!-- 싱크볼 & 수전 + 노란 라면 냄비 -->
          <rect x="16" y="20" width="32" height="9" rx="4" fill="#bae6fd" stroke="#0284c7" stroke-width="1.6"/>
          <path d="M32 20 V11 A5 5 0 0 1 40 11 V15" fill="none" stroke="#64748b" stroke-width="2.4" stroke-linecap="round"/>
          <ellipse cx="78" cy="22" rx="13" ry="6" fill="#fb923c" stroke="#9a3412" stroke-width="2"/>
          <ellipse cx="78" cy="19" rx="11" ry="4" fill="#fde047" stroke="#9a3412" stroke-width="1.5"/>
        </svg>`;
    }
    if (lv === 2) {
      return `
        <svg width="118" height="82" viewBox="0 0 118 82">
          <ellipse cx="59" cy="74" rx="52" ry="7" fill="rgba(120,53,15,0.22)"/>
          <!-- 세이지민트 하부장 & 오크 원목 상판 -->
          <rect x="8" y="26" width="102" height="48" rx="10" fill="#d1fae5" stroke="#065f46" stroke-width="2.5"/>
          <rect x="5" y="18" width="108" height="14" rx="6" fill="#e09f3e" stroke="#78350f" stroke-width="2.4"/>
          <circle cx="44" cy="50" r="2.5" fill="#065f46"/>
          <circle cx="74" cy="50" r="2.5" fill="#065f46"/>
          <!-- 도자기 싱크 & 2구 인덕션 & 귀여운 주전자 -->
          <rect x="15" y="20" width="34" height="9" rx="4" fill="#ffffff" stroke="#78350f" stroke-width="1.6"/>
          <path d="M32 20 V9 A6 6 0 0 1 42 9 V14" fill="none" stroke="#d97706" stroke-width="2.6" stroke-linecap="round"/>
          <rect x="58" y="19" width="42" height="10" rx="3" fill="#292524"/>
          <circle cx="70" cy="24" r="4" stroke="#fb7185" stroke-width="1.6" fill="none"/>
          <path d="M84 22 L96 22 L94 11 L86 11 Z" fill="#fda4af" stroke="#881337" stroke-width="1.8"/>
        </svg>`;
    }
    return `
      <svg width="120" height="84" viewBox="0 0 120 84">
        <ellipse cx="60" cy="76" rx="54" ry="7" fill="rgba(120,53,15,0.25)"/>
        <!-- 마블 & 골드 부티크 홈바 + 에스프레소 머신 -->
        <rect x="6" y="26" width="108" height="50" rx="11" fill="#fffbeb" stroke="#ca8a04" stroke-width="2.8"/>
        <rect x="4" y="17" width="112" height="14" rx="7" fill="#ffffff" stroke="#eab308" stroke-width="2.4"/>
        <line x1="20" y1="48" x2="100" y2="48" stroke="#fde047" stroke-width="2.5"/>
        <!-- 골드 수전 & 에스프레소 커피머신 -->
        <rect x="16" y="19" width="32" height="9" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.6"/>
        <path d="M32 19 V8 A6 6 0 0 1 42 8 V14" fill="none" stroke="#eab308" stroke-width="2.8" stroke-linecap="round"/>
        <rect x="76" y="4" width="24" height="18" rx="4" fill="#f43f5e" stroke="#881337" stroke-width="2"/>
        <rect x="83" y="14" width="10" height="7" rx="2" fill="#ffffff"/>
      </svg>`;
  }

  if (type === 'desk') {
    if (lv === 0) {
      return `
        <svg width="112" height="80" viewBox="0 0 112 80">
          <ellipse cx="56" cy="56" rx="34" ry="10" fill="rgba(0,0,0,0.15)"/>
          <ellipse cx="56" cy="46" rx="32" ry="17" fill="#d97706" stroke="#78350f" stroke-width="2.4"/>
          <rect x="32" y="54" width="5" height="12" rx="2" fill="#78350f"/>
          <rect x="75" y="54" width="5" height="12" rx="2" fill="#78350f"/>
        </svg>`;
    }
    if (lv === 1) {
      return `
        <svg width="116" height="86" viewBox="0 0 116 86">
          <ellipse cx="58" cy="76" rx="46" ry="7" fill="rgba(120,53,15,0.2)"/>
          <!-- 화이트 라운드 책상 & 노트북 & 핑크 쿠션의자 -->
          <rect x="16" y="40" width="7" height="32" rx="3" fill="#d97706" stroke="#78350f" stroke-width="1.8"/>
          <rect x="93" y="40" width="7" height="32" rx="3" fill="#d97706" stroke="#78350f" stroke-width="1.8"/>
          <rect x="10" y="24" width="96" height="22" rx="8" fill="#ffffff" stroke="#92400e" stroke-width="2.4"/>
          <rect x="38" y="12" width="36" height="20" rx="4" fill="#7dd3fc" stroke="#0369a1" stroke-width="2"/>
          <rect x="82" y="18" width="10" height="12" rx="3" fill="#fde047" stroke="#b45309" stroke-width="1.6"/>
          <!-- 동글동글 파스텔 체어 -->
          <ellipse cx="56" cy="68" rx="18" ry="11" fill="#fda4af" stroke="#9f1239" stroke-width="2.2"/>
        </svg>`;
    }
    if (lv === 2) {
      return `
        <svg width="118" height="88" viewBox="0 0 118 88">
          <ellipse cx="59" cy="78" rx="48" ry="7" fill="rgba(120,53,15,0.22)"/>
          <!-- 감성 원목 데스크테리어 & 아이맥풍 모니터 & 화분 -->
          <rect x="14" y="40" width="22" height="34" rx="4" fill="#f59e0b" stroke="#78350f" stroke-width="2"/>
          <rect x="92" y="40" width="8" height="34" rx="3" fill="#b45309" stroke="#572408" stroke-width="2"/>
          <rect x="8" y="24" width="102" height="22" rx="9" fill="#fde68a" stroke="#78350f" stroke-width="2.5"/>
          <!-- 와이드 모니터 -->
          <rect x="34" y="6" width="48" height="26" rx="5" fill="#ffffff" stroke="#475569" stroke-width="2.2"/>
          <rect x="38" y="10" width="40" height="17" rx="3" fill="#bae6fd"/>
          <circle cx="94" cy="20" r="7" fill="#4ade80" stroke="#166534" stroke-width="1.8"/>
          <!-- 세이지 쿠션 체어 -->
          <ellipse cx="60" cy="70" rx="20" ry="12" fill="#6ee7b7" stroke="#065f46" stroke-width="2.2"/>
        </svg>`;
    }
    return `
      <svg width="120" height="90" viewBox="0 0 120 90">
        <ellipse cx="60" cy="80" rx="52" ry="8" fill="rgba(120,53,15,0.25)"/>
        <!-- 듀얼 커브드 스튜디오 데스크 & 골드 라운지 체어 -->
        <rect x="12" y="42" width="24" height="34" rx="5" fill="#fffbeb" stroke="#ca8a04" stroke-width="2.2"/>
        <rect x="94" y="42" width="10" height="34" rx="4" fill="#ca8a04"/>
        <rect x="6" y="24" width="108" height="24" rx="10" fill="#fef3c7" stroke="#a16207" stroke-width="2.6"/>
        <!-- 듀얼 모니터 -->
        <rect x="16" y="6" width="42" height="24" rx="5" fill="#1e1b4b" stroke="#ec4899" stroke-width="2.2"/>
        <rect x="62" y="6" width="42" height="24" rx="5" fill="#1e1b4b" stroke="#38bdf8" stroke-width="2.2"/>
        <rect x="20" y="10" width="34" height="15" rx="2" fill="#fbcfe8"/>
        <rect x="66" y="10" width="34" height="15" rx="2" fill="#bae6fd"/>
        <ellipse cx="60" cy="72" rx="22" ry="12" fill="#fde047" stroke="#854d0e" stroke-width="2.4"/>
      </svg>`;
  }

  if (type === 'ac') {
    if (lv === 0) {
      return `
        <svg width="68" height="52" viewBox="0 0 68 52">
          <circle cx="34" cy="22" r="14" fill="#e0f2fe" stroke="#64748b" stroke-width="2.2"/>
          <path d="M34 11 V33 M23 22 H45" stroke="#0284c7" stroke-width="2.5"/>
          <rect x="27" y="36" width="14" height="8" rx="3" fill="#64748b"/>
        </svg>`;
    }
    if (lv === 1) {
      return `
        <svg width="78" height="44" viewBox="0 0 78 44">
          <rect x="4" y="3" width="70" height="23" rx="9" fill="#ffffff" stroke="#0284c7" stroke-width="2.2"/>
          <line x1="12" y1="20" x2="66" y2="20" stroke="#7dd3fc" stroke-width="2"/>
          <circle cx="62" cy="12" r="2.8" fill="#34d399"/>
          <path d="M20 29 Q18 37 14 41 M39 29 Q39 37 39 41 M58 29 Q60 37 64 41" stroke="#38bdf8" stroke-width="2" fill="none" stroke-linecap="round"/>
        </svg>`;
    }
    if (lv === 2) {
      return `
        <svg width="82" height="46" viewBox="0 0 82 46">
          <rect x="3" y="3" width="76" height="24" rx="10" fill="#fffbeb" stroke="#b45309" stroke-width="2.4"/>
          <rect x="10" y="18" width="62" height="5" rx="2.5" fill="#d97706"/>
          <circle cx="66" cy="11" r="3" fill="#10b981"/>
          <path d="M20 30 Q17 39 13 43 M41 30 Q41 39 41 43 M62 30 Q65 39 69 43" stroke="#67e8f9" stroke-width="2.4" fill="none" stroke-linecap="round"/>
        </svg>`;
    }
    return `
      <svg width="84" height="48" viewBox="0 0 84 48">
        <rect x="3" y="2" width="78" height="25" rx="11" fill="#ffffff" stroke="#ca8a04" stroke-width="2.6"/>
        <rect x="12" y="18" width="60" height="5" rx="2.5" fill="#fde047"/>
        <circle cx="68" cy="11" r="3.2" fill="#38bdf8"/>
        <path d="M20 30 Q16 40 12 45 M42 30 Q42 40 42 45 M64 30 Q68 40 72 45" stroke="#38bdf8" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      </svg>`;
  }
  return '';
}

// 1층 상가(편의점 & 코인세탁소) 고밀도 3D 쇼윈도 커스텀 SVG 렌더링
function renderAllShopsDOM() {
  dom.shopsLayer.innerHTML = '';
  for (const key of ['store', 'laundry']) {
    const shop = state.shops[key];
    const el = document.createElement('div');
    el.id = `shop-dom-${shop.id}`;
    el.dataset.shopId = shop.id;
    el.style.left = `${shop.x}px`;
    el.style.top = `${shop.y}px`;
    el.style.width = `${shop.w}px`;
    el.style.height = `${shop.h}px`;
    dom.shopsLayer.appendChild(el);
    updateSingleShopDOM(shop.id);
  }
}

function updateSingleShopDOM(shopId) {
  const shop = state.shops[shopId];
  const el = document.getElementById(`shop-dom-${shopId}`);
  if (!shop || !el) return;

  const isSelected = selection.type === 'shop' && selection.id === shopId;
  const lvInfo = shop.levels[shop.level];
  el.className = `shop-card ${isSelected ? 'selected-shop' : ''}`;

  if (shopId === 'store') {
    el.innerHTML = `
      <div class="w-full h-full bg-gradient-to-b from-[#fffbeb] to-[#fde6c4] relative">
        <!-- 입체 스트라이프 어닝 천막 & 네온 간판 -->
        <div class="h-[52px] bg-gradient-to-r from-[#38bdf8] via-[#2dd4bf] to-[#fbbf24] border-b-4 border-[#7c3f1d] px-4 flex items-center justify-between shadow-md">
          <div class="flex items-center gap-2">
            <span class="bg-white border-2 border-[#78350f] rounded-xl px-2 py-0.5 font-jua text-xs text-sky-700 shadow-sm">24H</span>
            <span class="font-jua text-base text-amber-950 drop-shadow-sm">미니미 편의점 <span class="text-rose-700">Lv.${shop.level}</span></span>
          </div>
          <span class="jelly-btn-amber font-jua text-xs px-3 py-0.5 rounded-full">매출 +${lvInfo.visitProfit}만원</span>
        </div>

        <!-- 편의점 내부 고밀도 인라인 3D SVG (음료 냉장고, 삼각김밥/간식 매대, 커피머신, POS 계산대) -->
        <svg width="474" height="196" viewBox="0 0 474 196">
          <!-- 우드 타일 바닥 -->
          <rect x="0" y="154" width="474" height="42" fill="#f3d5b5"/>
          <line x1="0" y1="154" x2="474" y2="154" stroke="#b07d62" stroke-width="3"/>

          <!-- 1) 형형색색 음료 쇼케이스 냉장고 -->
          <rect x="18" y="20" width="102" height="138" rx="10" fill="#e0f2fe" stroke="#0369a1" stroke-width="3"/>
          <rect x="24" y="26" width="90" height="16" rx="4" fill="#38bdf8"/>
          <text x="69" y="38" text-anchor="middle" font-family="Jua" font-size="10" fill="#ffffff">FRESH DRINK</text>
          <!-- 선반 1: 딸기우유, 바나나우유, 콜라 -->
          <line x1="24" y1="74" x2="114" y2="74" stroke="#0284c7" stroke-width="2.5"/>
          <rect x="32" y="52" width="14" height="20" rx="3" fill="#fda4af" stroke="#be123c" stroke-width="1.5"/>
          <rect x="52" y="52" width="14" height="20" rx="3" fill="#fde047" stroke="#ca8a04" stroke-width="1.5"/>
          <rect x="72" y="50" width="13" height="22" rx="4" fill="#ef4444" stroke="#991b1b" stroke-width="1.5"/>
          <rect x="91" y="52" width="14" height="20" rx="3" fill="#6ee7b7" stroke="#047857" stroke-width="1.5"/>
          <!-- 선반 2: 캔음료 & 주스 -->
          <line x1="24" y1="112" x2="114" y2="112" stroke="#0284c7" stroke-width="2.5"/>
          <rect x="32" y="88" width="14" height="22" rx="4" fill="#60a5fa" stroke="#1d4ed8" stroke-width="1.5"/>
          <rect x="52" y="88" width="14" height="22" rx="4" fill="#fb923c" stroke="#c2410c" stroke-width="1.5"/>
          <rect x="72" y="88" width="14" height="22" rx="4" fill="#c084fc" stroke="#7e22ce" stroke-width="1.5"/>
          <rect x="92" y="88" width="14" height="22" rx="4" fill="#facc15" stroke="#a16207" stroke-width="1.5"/>
          <!-- 선반 3 -->
          <rect x="34" y="122" width="28" height="24" rx="4" fill="#bae6fd" stroke="#0284c7" stroke-width="1.5"/>
          <rect x="72" y="122" width="32" height="24" rx="4" fill="#fef08a" stroke="#ca8a04" stroke-width="1.5"/>

          <!-- 2) 삼각김밥 & 스낵 진열대 -->
          <rect x="134" y="34" width="108" height="124" rx="10" fill="#fffbeb" stroke="#b45309" stroke-width="3"/>
          <rect x="140" y="40" width="96" height="15" rx="4" fill="#f59e0b"/>
          <text x="188" y="51" text-anchor="middle" font-family="Jua" font-size="10" fill="#ffffff">SNACK & FOOD</text>
          <!-- 삼각김밥 3개 -->
          <polygon points="158,64 148,82 168,82" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
          <polygon points="188,64 178,82 198,82" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
          <polygon points="218,64 208,82 228,82" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
          <line x1="140" y1="86" x2="236" y2="86" stroke="#d97706" stroke-width="2.5"/>
          <!-- 컵라면 & 과자 봉지 -->
          <rect x="148" y="96" width="18" height="22" rx="3" fill="#fb7185" stroke="#9f1239" stroke-width="1.5"/>
          <rect x="174" y="96" width="18" height="22" rx="3" fill="#facc15" stroke="#854d0e" stroke-width="1.5"/>
          <rect x="200" y="96" width="22" height="22" rx="4" fill="#4ade80" stroke="#166534" stroke-width="1.5"/>
          <line x1="140" y1="122" x2="236" y2="122" stroke="#d97706" stroke-width="2.5"/>

          <!-- 3) Lv.2+ 원두커피 & 디저트 바 -->
          ${shop.level >= 2 ? `
            <rect x="256" y="48" width="72" height="110" rx="10" fill="#fce7f3" stroke="#be185d" stroke-width="2.8"/>
            <rect x="268" y="58" width="48" height="36" rx="6" fill="#78350f" stroke="#451a03" stroke-width="2"/>
            <rect x="284" y="76" width="16" height="16" rx="3" fill="#ffffff"/>
            <text x="292" y="114" text-anchor="middle" font-family="Jua" font-size="10" fill="#9d174d">${shop.level >= 3 ? '와인&카페' : '즉석원두'}</text>
          ` : ''}

          <!-- 4) POS 계산대 & 바코드 스캐너 -->
          <rect x="344" y="88" width="112" height="72" rx="10" fill="#6ee7b7" stroke="#065f46" stroke-width="3"/>
          <rect x="340" y="80" width="120" height="14" rx="6" fill="#ffffff" stroke="#065f46" stroke-width="2.4"/>
          <rect x="368" y="54" width="38" height="26" rx="4" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>
          <rect x="372" y="58" width="30" height="18" rx="2" fill="#38bdf8"/>
          <text x="400" y="128" text-anchor="middle" font-family="Jua" font-size="12" fill="#064e3b">POS 계산대</text>
        </svg>

        <div class="absolute bottom-0 left-[212px] w-[60px] h-[14px] bg-sky-300 border-2 border-[#78350f] border-b-0 rounded-t-lg"></div>
      </div>
    `;
  } else {
    el.innerHTML = `
      <div class="w-full h-full bg-gradient-to-b from-[#f0fdfa] to-[#ffedd5] relative">
        <!-- 코인세탁소 어닝 간판 -->
        <div class="h-[52px] bg-gradient-to-r from-[#38bdf8] via-[#818cf8] to-[#f472b6] border-b-4 border-[#7c3f1d] px-4 flex items-center justify-between shadow-md">
          <div class="flex items-center gap-2">
            <span class="bg-white border-2 border-[#78350f] rounded-xl px-2 py-0.5 font-jua text-xs text-indigo-700 shadow-sm">WASH</span>
            <span class="font-jua text-base text-white drop-shadow">워시퐁 코인세탁소 <span class="text-amber-200">Lv.${shop.level}</span></span>
          </div>
          <span class="jelly-btn-amber font-jua text-xs px-3 py-0.5 rounded-full">매출 +${lvInfo.visitProfit}만원</span>
        </div>

        <!-- 코인세탁소 고밀도 인라인 3D SVG (빨래가 회전하는 입체 드럼세탁기 3대 + 세제 자판기 + 폴딩 테이블) -->
        <svg width="456" height="196" viewBox="0 0 456 196">
          <rect x="0" y="154" width="456" height="42" fill="#e0f2fe"/>
          <line x1="0" y1="154" x2="456" y2="154" stroke="#0284c7" stroke-width="3"/>

          ${[0, 1, 2].map((idx) => {
            const x = 20 + idx * 96;
            const frameFill = idx === 2 && shop.level >= 2 ? '#fef3c7' : '#ffffff';
            const rimColor = idx === 2 && shop.level >= 2 ? '#f59e0b' : '#38bdf8';
            return `
              <g transform="translate(${x}, 28)">
                <rect x="0" y="0" width="84" height="128" rx="14" fill="${frameFill}" stroke="#475569" stroke-width="3"/>
                <rect x="8" y="8" width="68" height="18" rx="5" fill="#e2e8f0"/>
                <circle cx="18" cy="17" r="4" fill="#34d399"/>
                <circle cx="29" cy="17" r="4" fill="#fbbf24"/>
                <rect x="46" y="12" width="22" height="10" rx="3" fill="#0f172a"/>
                <!-- 회전하는 세탁물 드럼창 -->
                <circle cx="42" cy="74" r="30" fill="#bae6fd" stroke="${rimColor}" stroke-width="5"/>
                <g class="washer-drum-spinning">
                  <path d="M18 74 Q32 56 42 74 T66 74 A24 24 0 0 1 18 74 Z" fill="#38bdf8"/>
                  <circle cx="33" cy="64" r="7" fill="#fda4af"/>
                  <circle cx="51" cy="80" r="6" fill="#fde047"/>
                  <circle cx="38" cy="84" r="5" fill="#ffffff"/>
                </g>
                <path d="M26 56 L36 52" stroke="rgba(255,255,255,0.85)" stroke-width="3" stroke-linecap="round"/>
              </g>
            `;
          }).join('')}

          <!-- 우측 세탁바구니 & 폴딩 라운지 -->
          <rect x="320" y="82" width="116" height="74" rx="12" fill="#fed7aa" stroke="#9a3412" stroke-width="3"/>
          <rect x="336" y="54" width="44" height="30" rx="8" fill="#7dd3fc" stroke="#0369a1" stroke-width="2.4"/>
          <path d="M342 54 Q358 40 374 54 Z" fill="#ffffff"/>
          <text x="378" y="126" text-anchor="middle" font-family="Jua" font-size="12" fill="#7c2d12">${shop.level >= 3 ? '런드리 카페존' : '뽀송 빨래바구니'}</text>
        </svg>

        <div class="absolute bottom-0 left-[202px] w-[60px] h-[14px] bg-cyan-300 border-2 border-[#78350f] border-b-0 rounded-t-lg"></div>
      </div>
    `;
  }
}

// =========================================================
// 4. 볼살 통통 2등신(Chibi/SD) 3D 피규어 커스텀 SVG 생성기
// =========================================================
function buildMinimiSVG(tenant, actionState = 'IDLE', uid = 'p') {
  const st = tenant.style || TENANT_JOBS[0].style;
  const skinId = `skin_${uid}`;
  const hairColor = st.hairColor || '#292524';
  const outfitColor = st.outfitColor || '#60a5fa';
  const outfitSub = st.outfitSub || '#eff6ff';

  let eyesMarkup = `
    <ellipse cx="26.5" cy="30" rx="2.8" ry="3.3" fill="#1e293b"/>
    <ellipse cx="39.5" cy="30" rx="2.8" ry="3.3" fill="#1e293b"/>
    <circle cx="27.5" cy="28.7" r="1.1" fill="#ffffff"/>
    <circle cx="40.5" cy="28.7" r="1.1" fill="#ffffff"/>
  `;
  let mouthMarkup = `<path d="M29.8 35.5 Q33 38.8 36.2 35.5" fill="none" stroke="#7c2d12" stroke-width="1.9" stroke-linecap="round"/>`;

  if (actionState === 'SLEEPING') {
    eyesMarkup = `
      <path d="M24 30 Q26.5 32.5 29 30" fill="none" stroke="#334155" stroke-width="2" stroke-linecap="round"/>
      <path d="M37 30 Q39.5 32.5 42 30" fill="none" stroke="#334155" stroke-width="2" stroke-linecap="round"/>
    `;
    mouthMarkup = `<circle cx="33" cy="36" r="1.8" fill="#fb7185"/>`;
  } else if (actionState === 'SHOWERING' || actionState === 'EATING') {
    eyesMarkup = `
      <path d="M24 30 Q26.5 26.8 29 30" fill="none" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M37 30 Q39.5 26.8 42 30" fill="none" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
    `;
    mouthMarkup = `<path d="M29.5 35 Q33 40 36.5 35 Z" fill="#fb7185" stroke="#881337" stroke-width="1.2"/>`;
  } else if (actionState === 'OVERBUDGET') {
    mouthMarkup = `<path d="M30 37.5 Q33 34.5 36 37.5" fill="none" stroke="#7c2d12" stroke-width="1.8" stroke-linecap="round"/>`;
  }

  let accMarkup = '';
  if (st.accessory === 'glasses' || st.accessory === 'goldglasses') {
    const gStroke = st.accessory === 'goldglasses' ? '#eab308' : '#334155';
    accMarkup = `
      <circle cx="26.5" cy="30" r="5" fill="rgba(255,255,255,0.25)" stroke="${gStroke}" stroke-width="1.8"/>
      <circle cx="39.5" cy="30" r="5" fill="rgba(255,255,255,0.25)" stroke="${gStroke}" stroke-width="1.8"/>
      <line x1="31.5" y1="30" x2="34.5" y2="30" stroke="${gStroke}" stroke-width="1.8"/>
    `;
  } else if (st.accessory === 'headset') {
    accMarkup = `
      <path d="M14 28 C14 9, 52 9, 52 28" fill="none" stroke="#ec4899" stroke-width="3.5"/>
      <rect x="11" y="23" width="6" height="12" rx="3" fill="#38bdf8" stroke="#1e293b" stroke-width="1.5"/>
      <rect x="49" y="23" width="6" height="12" rx="3" fill="#38bdf8" stroke="#1e293b" stroke-width="1.5"/>
    `;
  } else if (st.accessory === 'beret') {
    accMarkup = `
      <ellipse cx="34" cy="12.5" rx="16" ry="6.5" fill="#a855f7" stroke="#581c87" stroke-width="1.8" transform="rotate(-8 34 12.5)"/>
      <line x1="33" y1="4.5" x2="35" y2="8" stroke="#581c87" stroke-width="2" stroke-linecap="round"/>
    `;
  } else if (st.accessory === 'headband') {
    accMarkup = `<rect x="16" y="18" width="34" height="4.5" rx="2" fill="#f43f5e" stroke="#881337" stroke-width="1.2"/>`;
  } else if (st.accessory === 'cap') {
    accMarkup = `
      <path d="M16 20 Q33 8 50 20 Z" fill="#34d399" stroke="#065f46" stroke-width="1.8"/>
      <path d="M34 18 L55 21 L49 23 L32 20 Z" fill="#10b981" stroke="#065f46" stroke-width="1.2"/>
    `;
  } else if (st.accessory === 'catpin') {
    accMarkup = `
      <polygon points="18,16 21,8 26,14" fill="#fb923c" stroke="#7c2d12" stroke-width="1.5"/>
      <polygon points="40,14 45,8 48,16" fill="#fb923c" stroke="#7c2d12" stroke-width="1.5"/>
    `;
  }

  let propMarkup = '';
  if (actionState === 'CLEANING') {
    propMarkup = `
      <g transform="translate(45, 36) rotate(18)">
        <line x1="4" y1="0" x2="4" y2="26" stroke="#92400e" stroke-width="3" stroke-linecap="round"/>
        <path d="M-2 24 L10 24 L13 34 L-5 34 Z" fill="#fde047" stroke="#854d0e" stroke-width="1.6"/>
      </g>
    `;
  } else if (actionState === 'EATING') {
    propMarkup = `
      <g transform="translate(44, 44)">
        <ellipse cx="7" cy="6" rx="6.5" ry="5" fill="#d97706" stroke="#78350f" stroke-width="1.5"/>
        <rect x="12" y="4" width="6" height="3.5" rx="1.5" fill="#fef3c7" stroke="#78350f" stroke-width="1.2"/>
      </g>
    `;
  } else if (actionState === 'SHOPPING') {
    propMarkup = `
      <g transform="translate(46, 45)">
        <rect x="0" y="3" width="12" height="14" rx="3" fill="#fef08a" stroke="#b45309" stroke-width="1.6"/>
        <path d="M3 3 Q6 -2 9 3" fill="none" stroke="#b45309" stroke-width="1.5"/>
      </g>
    `;
  } else if (actionState === 'LAUNDRY') {
    propMarkup = `
      <g transform="translate(43, 45)">
        <rect x="0" y="2" width="15" height="12" rx="3" fill="#7dd3fc" stroke="#0369a1" stroke-width="1.5"/>
        <circle cx="5" cy="1" r="3" fill="#ffffff"/>
        <circle cx="10" cy="1" r="3" fill="#fda4af"/>
      </g>
    `;
  }

  return `
    <svg width="68" height="80" viewBox="0 0 66 78" overflow="visible">
      <defs>
        <radialGradient id="${skinId}" cx="36%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#fff7ed"/>
          <stop offset="68%" stop-color="#fed7aa"/>
          <stop offset="100%" stop-color="#fdba74"/>
        </radialGradient>
      </defs>

      <ellipse cx="33" cy="26" rx="20" ry="18" fill="${hairColor}"/>

      <rect x="24" y="61" width="7" height="11" rx="3.5" fill="#573619"/>
      <rect x="35" y="61" width="7" height="11" rx="3.5" fill="#573619"/>
      <ellipse cx="27" cy="72" rx="5" ry="2.8" fill="#3b1d08"/>
      <ellipse cx="39" cy="72" rx="5" ry="2.8" fill="#3b1d08"/>

      <path d="M20 44 Q33 40 46 44 L48 61 Q33 65 18 61 Z" fill="${outfitColor}" stroke="#451a03" stroke-width="2.2"/>
      <polygon points="28,43 33,50 38,43" fill="${outfitSub}"/>

      <ellipse cx="17" cy="51" rx="4.5" ry="7.5" fill="${outfitColor}" stroke="#451a03" stroke-width="2" transform="rotate(16 17 51)"/>
      <ellipse cx="49" cy="51" rx="4.5" ry="7.5" fill="${outfitColor}" stroke="#451a03" stroke-width="2" transform="rotate(-16 49 51)"/>
      <circle cx="15" cy="57" r="3.4" fill="url(#${skinId})" stroke="#9a3412" stroke-width="1.2"/>
      <circle cx="51" cy="57" r="3.4" fill="url(#${skinId})" stroke="#9a3412" stroke-width="1.2"/>

      <circle cx="14.5" cy="30" r="4" fill="url(#${skinId})" stroke="#9a3412" stroke-width="1.5"/>
      <circle cx="51.5" cy="30" r="4" fill="url(#${skinId})" stroke="#9a3412" stroke-width="1.5"/>

      <ellipse cx="33" cy="29" rx="18.5" ry="16.5" fill="url(#${skinId})" stroke="#7c2d12" stroke-width="2.2"/>

      <ellipse cx="20.8" cy="33.5" rx="4.4" ry="2.5" fill="#fb7185" opacity="0.62"/>
      <ellipse cx="45.2" cy="33.5" rx="4.4" ry="2.5" fill="#fb7185" opacity="0.62"/>

      ${eyesMarkup}
      ${mouthMarkup}

      <path d="M14.5 26 C15 11, 51 11, 51.5 26 C46 19, 39 22, 33 19 C26 22, 20 19, 14.5 26 Z" fill="${hairColor}" stroke="#292524" stroke-width="1.6"/>
      <ellipse cx="27" cy="16" rx="6" ry="2.2" fill="rgba(255,255,255,0.34)" transform="rotate(-12 27 16)"/>

      ${accMarkup}
      ${propMarkup}
    </svg>
  `;
}

// =========================================================
// 5. 호실별 개별 월세 쿨타임 게이지 & 수금 타격감 폭발 시스템
// =========================================================
function tickRoomRentTimers(dt) {
  for (const room of state.rooms) {
    if (!room.unlocked || !room.tenant) continue;

    room.rentTimer = (room.rentTimer || 0) + dt;
    if (room.rentTimer >= room.rentCycleSec) {
      room.rentTimer = 0;
      collectRoomRent(room, false);
    } else {
      // DOM 전체 리렌더링 없이 미니 게이지만 매끄럽게 실시간 업데이트!
      const remainSec = Math.max(1, Math.ceil(room.rentCycleSec - room.rentTimer));
      const pct = Math.min(100, (room.rentTimer / room.rentCycleSec) * 100);
      const secEl = document.getElementById(`rent-sec-${room.id}`);
      const barEl = document.getElementById(`rent-bar-${room.id}`);
      if (secEl) secEl.textContent = `⏱️ ${String(remainSec).padStart(2, '0')}s`;
      if (barEl) barEl.style.width = `${pct.toFixed(1)}%`;
    }
  }
}

function collectRoomRent(room, isInstantBonus = false) {
  const rent = getEffectiveRoomRent(room);
  if (rent <= 0) return;

  state.stats.totalRentEarned += rent;
  addGold(rent);

  // 호실 카드 도파민 플래시 연출
  const roomEl = document.getElementById(`room-dom-${room.id}`);
  if (roomEl) {
    roomEl.classList.remove('payday-flash');
    void roomEl.offsetWidth;
    roomEl.classList.add('payday-flash');
  }

  // 방 정중앙에서 반짝이는 3D 골드 코인 조각 폭발 + "+72만 원!" 플로팅 텍스트 팝업!
  const cx = room.x + room.w / 2;
  const cy = room.y + room.h / 2 + 10;
  spawnCoinBurst(cx, cy, 6);
  spawnRentJackpotPopup(cx, cy - 12, `+${rent.toLocaleString()}만 원!`, isInstantBonus ? '⚡즉시수금' : '🪙');

  // 미니 게이지 바 즉시 리셋 표시
  const secEl = document.getElementById(`rent-sec-${room.id}`);
  const barEl = document.getElementById(`rent-bar-${room.id}`);
  if (secEl) secEl.textContent = `⏱️ ${String(Math.ceil(room.rentCycleSec)).padStart(2, '0')}s`;
  if (barEl) barEl.style.width = '0%';
}

function spawnCoinBurst(wx, wy, count = 5) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count - Math.PI / 2 + (Math.random() * 0.5 - 0.25);
    const radius = 38 + Math.random() * 34;
    const tx = Math.cos(angle) * radius;
    const ty = Math.sin(angle) * radius - 22;

    const c = document.createElement('div');
    c.className = 'world-particle pt-burst-coin';
    c.style.left = `${wx}px`;
    c.style.top = `${wy}px`;
    c.style.setProperty('--tx', `${tx.toFixed(0)}px`);
    c.style.setProperty('--ty', `${ty.toFixed(0)}px`);
    c.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="#fde047" stroke="#92400e" stroke-width="2.2"/>
        <circle cx="12" cy="12" r="6.5" fill="#fbbf24"/>
        <text x="12" y="15.5" text-anchor="middle" font-family="Jua" font-size="10" fill="#78350f">₩</text>
      </svg>
    `;
    dom.particleLayer.appendChild(c);
    setTimeout(() => c.remove(), 1300);
  }
}

function spawnRentJackpotPopup(wx, wy, amountText, prefix = '🪙') {
  const el = document.createElement('div');
  el.className = 'world-particle pt-rent-jackpot';
  el.style.left = `${wx}px`;
  el.style.top = `${wy}px`;
  el.innerHTML = `<span>${prefix}</span><span>${amountText}</span>`;
  dom.particleLayer.appendChild(el);
  setTimeout(() => el.remove(), 1900);
}

// =========================================================
// 6. 건물주 돌발 케어 이벤트 (Active Play 터치 보상 시스템)
// =========================================================
function tickCareBubbles(dt) {
  careSpawnCooldown -= dt;
  if (careSpawnCooldown <= 0) {
    careSpawnCooldown = 9.5 + Math.random() * 5.5;
    if (activeCareBubbles.length < 3) {
      spawnRandomCareBubble();
    }
  }
}

function spawnRandomCareBubble() {
  const unlockedRooms = state.rooms.filter((r) => r.unlocked);
  const template = pickRandom(CARE_BUBBLE_TYPES);
  const id = `care_${Date.now()}_${Math.floor(Math.random() * 999)}`;

  let wx = 450;
  let wy = 920;
  let targetRoomId = null;

  if (template.targetType === 'shop') {
    const shop = state.shops[template.shopId] || state.shops.store;
    if (activeCareBubbles.some((b) => b.shopId === shop.id)) return;
    wx = shop.x + shop.w * 0.5;
    wy = shop.y + 52;
  } else {
    const occupied = unlockedRooms.filter((r) => r.tenant);
    const pool = occupied.length > 0 ? occupied : unlockedRooms;
    const rm = pickRandom(pool);
    if (!rm || activeCareBubbles.some((b) => b.roomId === rm.id)) return;
    targetRoomId = rm.id;
    wx = rm.x + rm.w * 0.52;
    wy = rm.y + 68;
  }

  const btn = document.createElement('button');
  btn.className = 'care-bubble-btn';
  btn.dataset.careId = id;
  btn.style.left = `${wx}px`;
  btn.style.top = `${wy}px`;
  btn.innerHTML = `<span class="text-base">${template.icon}</span><span>${template.label}!</span>`;
  dom.careLayer.appendChild(btn);

  activeCareBubbles.push({
    id,
    el: btn,
    wx,
    wy,
    roomId: targetRoomId,
    shopId: template.shopId || null,
    template
  });
}

function resolveCareBubble(careId) {
  const idx = activeCareBubbles.findIndex((b) => b.id === careId);
  if (idx === -1) return;

  const bubble = activeCareBubbles[idx];
  activeCareBubbles.splice(idx, 1);
  bubble.el.remove();

  state.stats.careSolved += 1;
  const tpl = bubble.template;
  const room = bubble.roomId ? getRoomById(bubble.roomId) : null;

  if (room && room.tenant && (tpl.effectType === 'instant_rent' || tpl.effectType === 'instant_rent_or_cash')) {
    // 해당 방 월세 쿨타임 즉시 100% 완료 & 보너스 용돈!
    room.rentTimer = 0;
    room.dust = 0;
    room.tenant.happiness = Math.min(100, room.tenant.happiness + 10);
    collectRoomRent(room, true);
    addGold(tpl.cashReward);
    spawnParticle(bubble.wx, bubble.wy - 28, `💖 케어보너스 +${tpl.cashReward}만`, 'pt-coin');
    if (minimiActors[room.id]) {
      showActorSpeech(minimiActors[room.id], '갓물주님 최고예요!! 월세 바로 입금했어요 💕', 4.2);
    }
  } else {
    if (room) room.dust = 0;
    addGold(tpl.cashReward);
    spawnCoinBurst(bubble.wx, bubble.wy, 5);
    spawnRentJackpotPopup(bubble.wx, bubble.wy - 10, `+${tpl.cashReward}만 원!`, tpl.icon);
  }

  showToast(tpl.toastMsg, 'emerald');
  saveGameState();
}

// =========================================================
// 7. 개성 만점 미니미 입주민 일상 AI & 1층 상가 연쇄 소비 루프
// =========================================================
function syncActorsWithTenants() {
  for (const rId of Object.keys(minimiActors)) {
    const rm = getRoomById(rId);
    if (!rm || !rm.tenant) {
      if (minimiActors[rId].el) minimiActors[rId].el.remove();
      delete minimiActors[rId];
    }
  }
  for (const room of state.rooms) {
    if (room.unlocked && room.tenant && !minimiActors[room.id]) {
      createActorForRoom(room, false);
    }
  }
}

function createActorForRoom(room, isFreshMoveIn = false) {
  const el = document.createElement('div');
  el.className = 'minimi-entity';
  el.innerHTML = `
    <div class="minimi-shadow"></div>
    <div class="minimi-body-wrap"></div>
    <div class="minimi-speech hidden"></div>
  `;
  dom.minimiLayer.appendChild(el);

  const startX = room.x + ROOM_LOCAL_SPOTS.center.x;
  const startY = room.y + ROOM_LOCAL_SPOTS.center.y;

  const actor = {
    roomId: room.id,
    el,
    bodyWrap: el.querySelector('.minimi-body-wrap'),
    speechEl: el.querySelector('.minimi-speech'),
    wx: startX,
    wy: startY,
    waypoints: [],
    state: 'IDLE',
    atTarget: true,
    stateTimer: 1.5,
    particleTimer: 0,
    doorOpen: false,
    speechTimer: 0,
    lastActionStateRendered: ''
  };

  minimiActors[room.id] = actor;
  updateActorVisual(actor, room.tenant, true);
  positionActorDOM(actor);

  if (isFreshMoveIn) {
    startRoutine(actor, room, 'CLEANING', true);
  } else {
    pickNextRoutine(actor, room);
  }
}

function positionActorDOM(actor) {
  actor.el.style.left = `${actor.wx.toFixed(1)}px`;
  actor.el.style.top = `${actor.wy.toFixed(1)}px`;
}

function showActorSpeech(actor, text, durationSec = 4.2) {
  if (!actor || !actor.speechEl) return;
  actor.speechEl.textContent = text;
  actor.speechEl.classList.remove('hidden');
  actor.speechTimer = durationSec;
}

function updateActorVisual(actor, tenant, force = false) {
  const marketRent = calcRoomMarketRent(getRoomById(actor.roomId));
  const visualKey = marketRent > tenant.maxBudget && actor.state === 'IDLE'
    ? 'OVERBUDGET'
    : actor.state;

  if (force || actor.lastActionStateRendered !== visualKey) {
    actor.bodyWrap.innerHTML = buildMinimiSVG(tenant, visualKey, actor.roomId);
    actor.lastActionStateRendered = visualKey;
  }
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getJobData(jobId) {
  return TENANT_JOBS.find((j) => j.id === jobId) || TENANT_JOBS[0];
}

function pickNextRoutine(actor, room) {
  const tenant = room.tenant;
  if (!tenant) return;

  const hour = Math.floor(state.gameMinutes / 60) % 24;
  const f = room.furniture;
  const marketRent = calcRoomMarketRent(room);
  const job = getJobData(tenant.jobId);

  if (marketRent > tenant.maxBudget && Math.random() < 0.3) {
    actor.waypoints = [{ x: room.x + ROOM_LOCAL_SPOTS.center.x, y: room.y + ROOM_LOCAL_SPOTS.center.y }];
    actor.state = 'IDLE';
    actor.atTarget = false;
    actor.stateTimer = 4.0;
    showActorSpeech(actor, pickRandom(job.quotes.overbudget), 4.0);
    updateActorVisual(actor, tenant, true);
    return;
  }

  // 방 감성 칭찬 일상 대사
  if (f.wallpaper >= 1 && Math.random() < 0.22) {
    actor.waypoints = [{ x: room.x + ROOM_LOCAL_SPOTS.center.x, y: room.y + ROOM_LOCAL_SPOTS.center.y }];
    actor.state = 'IDLE';
    actor.atTarget = false;
    actor.stateTimer = 3.6;
    showActorSpeech(actor, pickRandom(job.quotes.ambient), 3.8);
    spawnParticle(room.x + 192, room.y + 135, '💖', 'pt-heart');
    return;
  }

  if (room.dust >= 60) {
    startRoutine(actor, room, 'CLEANING', false);
    return;
  }

  if ((hour >= 23 || hour < 6) || tenant.needs.energy < 26) {
    startRoutine(actor, room, 'SLEEPING', false);
    return;
  }

  if (tenant.needs.cleanliness < 44) {
    startRoutine(actor, room, 'SHOWERING', false);
    return;
  }

  if (tenant.needs.hunger < 44 || ((hour >= 18 && hour <= 22) && Math.random() < 0.42)) {
    startRoutine(actor, room, 'EATING', false);
    return;
  }

  // 외출해서 1층 편의점 / 코인세탁소 직접 방문! (35% 확률로 활발히 방문)
  if (hour >= 7 && hour <= 22 && Math.random() < 0.35) {
    const outingType = Math.random() < 0.55 ? 'SHOPPING' : 'LAUNDRY';
    startOutingRoutine(actor, room, outingType);
    return;
  }

  const roll = Math.random();
  if (roll < 0.52) {
    startRoutine(actor, room, 'WORKING', false);
  } else if (roll < 0.78 && f.shower >= 1) {
    startRoutine(actor, room, 'SHOWERING', false);
  } else {
    startRoutine(actor, room, 'EATING', false);
  }
}

function startRoutine(actor, room, routineName, isMoveInClean = false) {
  const tenant = room.tenant;
  const job = getJobData(tenant.jobId);
  actor.state = routineName;
  actor.atTarget = false;
  actor.particleTimer = 0.2;
  updateSingleRoomDOM(room.id);

  if (routineName === 'CLEANING') {
    const sp = ROOM_LOCAL_SPOTS.cleanSpots;
    actor.waypoints = [
      { x: room.x + sp[0].x, y: room.y + sp[0].y },
      { x: room.x + sp[1].x, y: room.y + sp[1].y },
      { x: room.x + sp[2].x, y: room.y + sp[2].y }
    ];
    actor.stateTimer = 5.8;
    showActorSpeech(
      actor,
      isMoveInClean ? '새집 입주 완료! 반짝반짝 청소부터 시작~ ✨' : pickRandom(job.quotes.cleaning),
      4.8
    );
  } else if (routineName === 'SHOWERING') {
    if (room.furniture.shower >= 1) {
      actor.waypoints = [{ x: room.x + ROOM_LOCAL_SPOTS.shower.x, y: room.y + ROOM_LOCAL_SPOTS.shower.y }];
      actor.stateTimer = 6.0;
    } else {
      actor.waypoints = [{ x: room.x + 262, y: room.y + 150 }];
      actor.stateTimer = 3.8;
      showActorSpeech(actor, '온수 샤워부스가 설치되면 거품 목욕 하고 싶어요 🫧', 3.8);
    }
  } else if (routineName === 'EATING') {
    actor.waypoints = [
      { x: room.x + ROOM_LOCAL_SPOTS.kitchen.x, y: room.y + ROOM_LOCAL_SPOTS.kitchen.y },
      { x: room.x + ROOM_LOCAL_SPOTS.desk.x - 16, y: room.y + ROOM_LOCAL_SPOTS.desk.y }
    ];
    actor.stateTimer = 6.0;
  } else if (routineName === 'WORKING') {
    actor.waypoints = [{ x: room.x + ROOM_LOCAL_SPOTS.desk.x, y: room.y + ROOM_LOCAL_SPOTS.desk.y }];
    actor.stateTimer = 6.5;
  } else if (routineName === 'SLEEPING') {
    actor.waypoints = [{ x: room.x + ROOM_LOCAL_SPOTS.bed.x, y: room.y + ROOM_LOCAL_SPOTS.bed.y }];
    actor.stateTimer = 7.2;
  }

  updateActorVisual(actor, tenant, true);
}

function startOutingRoutine(actor, room, outingType) {
  const shop = outingType === 'SHOPPING' ? state.shops.store : state.shops.laundry;
  const spot = pickRandom(shop.spots);
  const doorWorldX = room.x + ROOM_LOCAL_SPOTS.door.x;
  const doorWorldY = room.y + ROOM_LOCAL_SPOTS.door.y;

  actor.state = outingType;
  actor.atTarget = false;
  actor.outingPhase = 'GOING';
  actor.targetShopId = shop.id;

  actor.waypoints = [
    { x: doorWorldX, y: doorWorldY, onArrive: () => setRoomDoor(room.id, true) },
    { x: doorWorldX, y: room.corridorY, onArrive: () => setRoomDoor(room.id, false) },
    { x: WORLD_CONFIG.stairX, y: room.corridorY },
    { x: WORLD_CONFIG.stairX, y: WORLD_CONFIG.plazaY },
    { x: shop.doorX, y: WORLD_CONFIG.plazaY },
    { x: spot.x, y: spot.y }
  ];
  actor.stateTimer = 4.2;
  updateActorVisual(actor, room.tenant, true);
}

function startReturnToRoomWaypoints(actor, room) {
  const shop = state.shops[actor.targetShopId] || state.shops.store;
  const doorWorldX = room.x + ROOM_LOCAL_SPOTS.door.x;
  const doorWorldY = room.y + ROOM_LOCAL_SPOTS.door.y;

  actor.outingPhase = 'RETURNING';
  actor.atTarget = false;
  actor.waypoints = [
    { x: shop.doorX, y: WORLD_CONFIG.plazaY },
    { x: WORLD_CONFIG.stairX, y: WORLD_CONFIG.plazaY },
    { x: WORLD_CONFIG.stairX, y: room.corridorY },
    { x: doorWorldX, y: room.corridorY, onArrive: () => setRoomDoor(room.id, true) },
    { x: doorWorldX, y: doorWorldY, onArrive: () => setRoomDoor(room.id, false) },
    { x: room.x + ROOM_LOCAL_SPOTS.center.x, y: room.y + ROOM_LOCAL_SPOTS.center.y }
  ];
  actor.stateTimer = 1.0;
}

function setRoomDoor(roomId, open) {
  const actor = minimiActors[roomId];
  if (!actor) return;
  actor.doorOpen = open;
  const el = document.getElementById(`room-dom-${roomId}`);
  if (el) el.classList.toggle('door-open', open);
}

// 1층 상가 연쇄 소비 이펙트 (입주민 배달/세탁 대행 주문 시에도 실시간 매출 팡팡!)
function tickBuildingShopChainLoop(dt) {
  shopOrderCooldown -= dt;
  if (shopOrderCooldown > 0) return;
  shopOrderCooldown = 12 + Math.random() * 6;

  const occupied = state.rooms.filter((r) => r.unlocked && r.tenant);
  if (occupied.length === 0) return;

  const rm = pickRandom(occupied);
  const useStore = Math.random() < 0.55;
  const shop = useStore ? state.shops.store : state.shops.laundry;
  const profit = shop.levels[shop.level].visitProfit;

  addGold(profit);
  state.stats.shopVisits += 1;

  const sx = shop.x + shop.w * 0.5;
  const sy = shop.y + 118;
  spawnCoinBurst(sx, sy, 4);
  spawnRentJackpotPopup(sx, sy - 8, `${shop.icon} 매출 +${profit}만!`, '✨');

  const actor = minimiActors[rm.id];
  if (actor && actor.speechTimer <= 0 && actor.outingPhase !== 'GOING') {
    const msg = useStore
      ? `1층 편의점 간식 픽업 주문 완료! 🍙`
      : `1층 워시퐁 세탁서비스 맡겼어요! 🧺`;
    showActorSpeech(actor, msg, 3.2);
  }
}

function tickMinimiActors(dt) {
  const walkSpeed = 158;

  for (const room of state.rooms) {
    if (!room.unlocked || !room.tenant) continue;
    const actor = minimiActors[room.id];
    if (!actor) continue;

    room.dust = Math.min(100, room.dust + dt * 0.85);
    room.tenant.needs.hunger = Math.max(5, room.tenant.needs.hunger - dt * 0.72);
    room.tenant.needs.cleanliness = Math.max(5, room.tenant.needs.cleanliness - dt * 0.65);
    room.tenant.needs.energy = Math.max(5, room.tenant.needs.energy - dt * 0.52);

    if (actor.speechTimer > 0) {
      actor.speechTimer -= dt;
      if (actor.speechTimer <= 0) actor.speechEl.classList.add('hidden');
    }

    if (actor.waypoints.length > 0) {
      const wp = actor.waypoints[0];
      const dx = wp.x - actor.wx;
      const dy = wp.y - actor.wy;
      const dist = Math.hypot(dx, dy);

      actor.el.classList.add('is-walking');
      actor.el.classList.remove('is-cleaning', 'is-working', 'is-sleeping');

      if (actor.state === 'CLEANING') {
        actor.particleTimer -= dt;
        if (actor.particleTimer <= 0) {
          actor.particleTimer = 0.55;
          spawnParticle(actor.wx - 10, actor.wy - 8, '💨', 'pt-dust');
          spawnParticle(actor.wx + 12, actor.wy - 26, '✨', 'pt-sparkle');
        }
      }

      const step = walkSpeed * dt;
      if (dist <= step) {
        actor.wx = wp.x;
        actor.wy = wp.y;
        if (typeof wp.onArrive === 'function') wp.onArrive();
        actor.waypoints.shift();
        if (actor.waypoints.length === 0) {
          onActorArrivedAtDestination(actor, room);
        }
      } else {
        actor.wx += (dx / dist) * step;
        actor.wy += (dy / dist) * step;
      }
      positionActorDOM(actor);
      continue;
    }

    actor.el.classList.remove('is-walking');
    actor.stateTimer -= dt;
    actor.particleTimer -= dt;

    if (actor.state === 'CLEANING') {
      actor.el.classList.add('is-cleaning');
      if (actor.particleTimer <= 0) {
        actor.particleTimer = 0.7;
        spawnParticle(actor.wx + (Math.random() * 24 - 12), actor.wy - 18, '✨', 'pt-sparkle');
      }
    } else if (actor.state === 'SHOWERING' && room.furniture.shower >= 1) {
      if (actor.particleTimer <= 0) {
        actor.particleTimer = 0.65;
        spawnParticle(room.x + 305 + Math.random() * 22, room.y + 46, '💧', 'pt-water');
        spawnParticle(room.x + 300 + Math.random() * 26, room.y + 36, '🫧', 'pt-steam');
      }
    } else if (actor.state === 'EATING') {
      if (actor.particleTimer <= 0) {
        actor.particleTimer = 1.1;
        spawnParticle(actor.wx, actor.wy - 48, '💖', 'pt-heart');
      }
    } else if (actor.state === 'WORKING') {
      actor.el.classList.add('is-working');
    } else if (actor.state === 'SLEEPING') {
      actor.el.classList.add('is-sleeping');
      if (actor.particleTimer <= 0) {
        actor.particleTimer = 1.25;
        spawnParticle(actor.wx + 12, actor.wy - 46, '💤', 'pt-zzz');
      }
    }

    if (actor.stateTimer <= 0) {
      finishCurrentRoutine(actor, room);
    }
  }
}

function onActorArrivedAtDestination(actor, room) {
  actor.atTarget = true;
  const tenant = room.tenant;
  if (!tenant) return;
  const job = getJobData(tenant.jobId);

  if (actor.state === 'SHOWERING' && room.furniture.shower >= 1) {
    updateSingleRoomDOM(room.id);
    showActorSpeech(actor, pickRandom(job.quotes.shower), 4.8);
  } else if (actor.state === 'EATING') {
    showActorSpeech(actor, pickRandom(job.quotes.eating), 4.8);
  } else if (actor.state === 'WORKING') {
    showActorSpeech(actor, pickRandom(job.quotes.working), 5.0);
  } else if (actor.state === 'SLEEPING') {
    updateSingleRoomDOM(room.id);
    showActorSpeech(actor, pickRandom(job.quotes.sleeping), 4.6);
  } else if ((actor.state === 'SHOPPING' || actor.state === 'LAUNDRY') && actor.outingPhase === 'GOING') {
    actor.outingPhase = 'AT_SHOP';
    const quoteList = actor.state === 'SHOPPING' ? job.quotes.store : job.quotes.laundry;
    showActorSpeech(actor, pickRandom(quoteList), 4.2);
    spawnParticle(actor.wx, actor.wy - 44, actor.state === 'SHOPPING' ? '🛍️' : '✨', 'pt-sparkle');
  }
}

function finishCurrentRoutine(actor, room) {
  const tenant = room.tenant;
  if (!tenant) return;

  actor.el.classList.remove('is-cleaning', 'is-working', 'is-sleeping');

  if (actor.state === 'CLEANING') {
    room.dust = 0;
    tenant.happiness = Math.min(100, tenant.happiness + 4);
    updateSingleRoomDOM(room.id);
  } else if (actor.state === 'SHOWERING') {
    tenant.needs.cleanliness = 100;
    tenant.happiness = Math.min(100, tenant.happiness + 6);
  } else if (actor.state === 'EATING') {
    tenant.needs.hunger = 100;
    tenant.happiness = Math.min(100, tenant.happiness + 7);
  } else if (actor.state === 'WORKING') {
    tenant.needs.energy = Math.max(12, tenant.needs.energy - 10);
  } else if (actor.state === 'SLEEPING') {
    tenant.needs.energy = 100;
    tenant.happiness = Math.min(100, tenant.happiness + 5);
  } else if (actor.state === 'SHOPPING' || actor.state === 'LAUNDRY') {
    if (actor.outingPhase === 'AT_SHOP') {
      const shop = state.shops[actor.targetShopId];
      const profit = shop.levels[shop.level].visitProfit;
      addGold(profit);
      state.stats.shopVisits += 1;
      tenant.happiness = Math.min(100, tenant.happiness + 7);
      spawnCoinBurst(actor.wx, actor.wy - 30, 5);
      spawnRentJackpotPopup(actor.wx, actor.wy - 48, `${shop.icon} +${profit}만 원!`, '🪙');
      startReturnToRoomWaypoints(actor, room);
      return;
    }
  }

  actor.state = 'IDLE';
  updateSingleRoomDOM(room.id);
  pickNextRoutine(actor, room);

  if (selection.type === 'room' && selection.id === room.id) {
    renderRoomPanelBody(room);
  }
}

function spawnParticle(wx, wy, content, cls) {
  const p = document.createElement('div');
  p.className = `world-particle ${cls}`;
  p.textContent = content;
  p.style.left = `${wx}px`;
  p.style.top = `${wy}px`;
  if (cls === 'pt-dust') {
    p.style.setProperty('--dx', `${(Math.random() * 36 - 18).toFixed(0)}px`);
  }
  dom.particleLayer.appendChild(p);
  setTimeout(() => p.remove(), 1950);
}

// =========================================================
// 8. 호실 리모델링 & 세트 효과 & 입주민 모집 / 강제 퇴거 시스템
// =========================================================
function getRoomById(id) {
  return state.rooms.find((r) => r.id === id);
}

function selectRoom(roomId, smoothFocus = true) {
  const room = getRoomById(roomId);
  if (!room) return;

  selection.type = 'room';
  selection.id = roomId;

  for (const r of state.rooms) updateSingleRoomDOM(r.id);
  for (const sKey of ['store', 'laundry']) updateSingleShopDOM(sKey);

  openRoomPanel(room);
  if (smoothFocus) {
    focusOnWorldPoint(room.x + room.w / 2, room.y + room.h / 2, Math.max(camera.scale, 1.08), true);
  }
}

function selectShop(shopId, smoothFocus = true) {
  const shop = state.shops[shopId];
  if (!shop) return;

  selection.type = 'shop';
  selection.id = shopId;

  for (const r of state.rooms) updateSingleRoomDOM(r.id);
  for (const sKey of ['store', 'laundry']) updateSingleShopDOM(sKey);

  openShopPanel(shop);
  if (smoothFocus) {
    focusOnWorldPoint(shop.x + shop.w / 2, shop.y + shop.h / 2, Math.max(camera.scale, 0.98), true);
  }
}

function closeBottomPanel() {
  selection.type = null;
  selection.id = null;
  dom.bottomPanel.classList.add('translate-y-full');
  for (const r of state.rooms) updateSingleRoomDOM(r.id);
  for (const sKey of ['store', 'laundry']) updateSingleShopDOM(sKey);
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
        <div class="font-jua text-lg text-amber-950">${room.name} 코지 하우스를 오픈할까요?</div>
        <p class="text-xs text-stone-600 mt-1">개방 즉시 독립된 월세 쿨타임 게이지가 작동하는 새 원룸을 꾸밀 수 있어요!</p>
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
          <div class="w-12 h-12 rounded-2xl bg-white border-2 border-amber-500 flex items-center justify-center text-2xl shrink-0 shadow-sm">🏡</div>
          <div>
            <div class="font-jua text-sm sm:text-base text-amber-950">공실 상태입니다! 첫 입주민을 맞이해보세요</div>
            <div class="text-xs text-stone-600">6종 시설을 모두 Lv.1 / Lv.2 / Lv.3 이상 맞추면 <b class="text-rose-700">[테마 세트 월세 보너스 +12%~35%]</b>가 발동됩니다!</div>
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
    const effectiveRent = getEffectiveRoomRent(room);

    tenantSectionHTML = `
      <div class="${isOverBudget ? 'bg-rose-50 border-rose-300' : 'bg-white border-amber-300'} border-2 rounded-2xl p-3 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-3">
            <div class="w-14 h-15 rounded-2xl bg-amber-50 border-2 border-amber-800 flex items-center justify-center overflow-hidden shrink-0">
              <div class="scale-[0.74] translate-y-1">${buildMinimiSVG(t, isOverBudget ? 'OVERBUDGET' : 'IDLE', `panel_${room.id}`)}</div>
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
                <span class="text-emerald-700 font-bold">⏱️ ${room.rentCycleSec}초마다 +${effectiveRent}만원 입금!</span>
              </div>
            </div>
          </div>

          <button id="btn-evict-tenant" class="jelly-btn-rose font-jua text-xs sm:text-sm px-3.5 py-2 rounded-xl">
            ⚡ 계약 해지 / 내쫓기
          </button>
        </div>

        ${isOverBudget ? `
          <div class="mt-2 bg-rose-100 border border-rose-300 text-rose-900 rounded-xl px-3 py-1.5 text-xs font-medium">
            ⚠️ 호실 적정 월세(${marketRent}만)가 현재 입주민 예산(${t.maxBudget}만)을 초과했어요! [계약 해지] 후 상위 직업군 입주민을 받으면 월세를 전액 받을 수 있습니다!
          </div>
        ` : ''}
      </div>
    `;
  }

  const setBannerHTML = activeSet
    ? `<div class="px-3 py-1.5 rounded-xl font-jua text-xs flex items-center justify-between ${activeSet.badgeClass}">
         <span>✨ 세트 효과 발동 중: [${activeSet.badgeText}]</span>
         <span>모든 가구 조화 보너스 적용됨!</span>
       </div>`
    : `<div class="px-3 py-1.5 rounded-xl bg-amber-100/70 border border-amber-300 text-amber-900 font-jua text-xs">
         💡 팁: 6종 시설을 모두 Lv.1 이상 설치하면 [🌸 파스텔 스윗홈 · 월세 +12%] 세트 뱃지가 켜져요!
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
          <div class="text-[11px] text-stone-500 leading-snug mt-0.5">${nextData ? `다음: ${nextData.name} (+${nextData.rentBonus - curData.rentBonus}만)` : '👑 최고급 로얄 부티크 완성!'}</div>
        </div>

        ${nextData ? `
          <button data-upgrade-key="${key}" class="btn-upgrade-furn w-full font-jua text-xs py-1.5 px-2.5 rounded-xl ${
            state.gold >= nextData.cost ? 'jelly-btn-amber' : 'bg-stone-200 text-stone-400 border-2 border-stone-300'
          }">
            ⬆️ Lv.${curLv + 1} 리모델링 (💰${nextData.cost}만)
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
  dom.panelGradeBadge.textContent = `단지 상가 Lv.${curLv}`;
  dom.panelGradeBadge.className = 'font-jua text-xs px-2.5 py-0.5 rounded-full border bg-amber-100 text-amber-950 border-amber-400';
  dom.panelRentBadge.textContent = `이용 시마다 +${curInfo.visitProfit}만원`;

  dom.panelBody.innerHTML = `
    <div class="bg-white border-2 border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
      <div>
        <div class="font-jua text-base text-amber-950">[Lv.${curLv}] ${curInfo.title}</div>
        <p class="text-xs text-stone-600 mt-1">${curInfo.desc}</p>
        <p class="text-xs text-emerald-700 font-bold mt-1.5">💡 위층 입주민들이 외출하거나 픽업 주문할 때마다 실시간 상가 매출(+${curInfo.visitProfit}만)이 팡팡 터집니다! (누적 이용 ${state.stats.shopVisits}회)</p>
      </div>
      ${nextInfo ? `
        <button id="btn-upgrade-shop" class="w-full sm:w-auto shrink-0 font-jua text-sm px-5 py-3 rounded-2xl ${
          state.gold >= nextInfo.upgradeCost ? 'jelly-btn-amber' : 'bg-stone-200 text-stone-400 border-2 border-stone-300'
        }">
          ⬆️ Lv.${curLv + 1} 상가 확장 (💰${nextInfo.upgradeCost}만원)<br/>
          <span class="text-[11px]">매출 +${curInfo.visitProfit}만 ➔ +${nextInfo.visitProfit}만</span>
        </button>
      ` : `
        <div class="font-jua text-sm bg-amber-100 text-amber-950 border-2 border-amber-400 px-4 py-2.5 rounded-2xl">
          👑 최고 등급 랜드마크 상가 완성!
        </div>
      `}
    </div>
  `;

  const upBtn = document.getElementById('btn-upgrade-shop');
  if (upBtn && nextInfo) {
    upBtn.onclick = () => {
      if (state.gold < nextInfo.upgradeCost) {
        showToast(`💸 확장 자금이 부족합니다! (${nextInfo.upgradeCost}만원 필요)`, 'rose');
        return;
      }
      addGold(-nextInfo.upgradeCost);
      shop.level += 1;
      updateSingleShopDOM(shop.id);
      spawnCoinBurst(shop.x + shop.w / 2, shop.y + 100, 6);
      showToast(`${shop.icon} ${shop.name} Lv.${shop.level} 업그레이드 완료!`, 'emerald');
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
    showToast(`💸 분양 오픈 비용(${room.unlockCost}만원)이 부족합니다!`, 'rose');
    return;
  }
  addGold(-room.unlockCost);
  room.unlocked = true;
  updateSingleRoomDOM(room.id);
  spawnCoinBurst(room.x + room.w / 2, room.y + 130, 6);
  showToast(`🎊 ${room.name} 코지 원룸이 오픈되었습니다!`, 'emerald');
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
    showToast(`💸 리모델링 비용(${nextData.cost}만원)이 부족합니다!`, 'rose');
    return;
  }

  addGold(-nextData.cost);
  room.furniture[key] = curLv + 1;
  const newSet = getRoomThemeSet(room);

  if (room.tenant) {
    room.tenant.happiness = Math.min(100, room.tenant.happiness + 9);
    const actor = minimiActors[room.id];
    if (actor) {
      if (key === 'shower' && room.furniture.shower === 1) {
        startRoutine(actor, room, 'SHOWERING', false);
      } else if (key === 'wallpaper') {
        showActorSpeech(actor, '우와!! 새 벽지랑 바닥 너무 예뻐요! 살고 싶은 집 최고 🌸', 4.2);
      } else {
        showActorSpeech(actor, `새 ${tree.label} 덕분에 너무 아늑해요! 💕`, 3.8);
      }
      updateActorVisual(actor, room.tenant, true);
    }
  }

  updateSingleRoomDOM(room.id, key);
  spawnParticle(room.x + 192, room.y + 135, '✨', 'pt-sparkle');

  if (newSet && (!prevSet || newSet.minLevel > prevSet.minLevel)) {
    spawnCoinBurst(room.x + 192, room.y + 120, 7);
    showToast(`🎊 [${newSet.badgeText}] 세트 효과 발동!!`, 'emerald');
  } else {
    showToast(`🛠️ ${room.name} [${tree.label}] Lv.${curLv + 1} 설치 완료! (월세 ${calcRoomMarketRent(room)}만)`, 'emerald');
  }

  renderRoomPanelBody(room);
  updateHudUI();
  updateQuestUI();
  saveGameState();
}

// =========================================================
// 9. 세입자 모집 & 강제 퇴거 시스템
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
  const affordableJobs = TENANT_JOBS.filter((j) => j.maxBudget >= marketRent - 12);
  const pool = affordableJobs.length >= 2 ? affordableJobs : TENANT_JOBS;

  const chosenJobs = [];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  for (const j of shuffled) {
    if (chosenJobs.length < 2) chosenJobs.push(j);
  }
  const extraPool = TENANT_JOBS.filter((j) => !chosenJobs.includes(j));
  chosenJobs.push(pickRandom(extraPool.length ? extraPool : TENANT_JOBS));

  return chosenJobs.map((job, idx) => {
    const budget = Math.floor(job.minBudget + Math.random() * (job.maxBudget - job.minBudget + 1));
    const fullName = pickRandom(KOREAN_LAST_NAMES) + pickRandom(KOREAN_FIRST_NAMES);
    return {
      tempId: `app_${Date.now()}_${idx}`,
      name: fullName,
      jobId: job.id,
      jobName: job.jobName,
      badgeColor: job.badgeColor,
      maxBudget: budget,
      wishText: job.wishText,
      requirements: job.requirements,
      personality: job.traitTag,
      style: job.style
    };
  });
}

function renderRecruitCards(room) {
  const marketRent = calcRoomMarketRent(room);
  dom.recruitRoomBadge.textContent = room.name;
  dom.recruitRoomInfo.textContent = `현재 ${room.name} 적정 월세: ${marketRent}만원 (${room.rentCycleSec}초마다 자동 수금!)`;

  dom.recruitCardsGrid.innerHTML = currentApplicants.map((app, index) => {
    const reqBadges = Object.entries(app.requirements || {}).map(([fKey, reqLv]) => {
      const ok = (room.furniture[fKey] || 0) >= reqLv;
      const label = FURNITURE_TREE[fKey].label;
      return `<span class="inline-block text-[11px] px-2 py-0.5 rounded-full border ${
        ok ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-amber-50 text-amber-800 border-amber-300'
      }">${ok ? '✅' : '⚠️'} ${label} Lv.${reqLv}+</span>`;
    }).join(' ');

    const budgetEnough = app.maxBudget >= marketRent;

    return `
      <div class="bg-white rounded-2xl border-2 border-amber-300 hover:border-emerald-500 p-3.5 flex flex-col justify-between shadow-sm transition">
        <div>
          <div class="flex items-center gap-3">
            <div class="w-14 h-16 rounded-2xl bg-amber-50 border-2 border-amber-800 flex items-center justify-center overflow-hidden shrink-0">
              <div class="scale-[0.82] translate-y-1">${buildMinimiSVG(app, 'IDLE', app.tempId)}</div>
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
              <span class="font-jua text-sm ${budgetEnough ? 'text-emerald-700' : 'text-rose-600'}">${app.maxBudget}만원</span>
            </div>
            <div class="text-[11px] text-stone-600 leading-snug pt-1 border-t border-amber-200/70">
              💬 "${app.wishText}"
            </div>
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

  const allMet = Object.entries(applicant.requirements || {}).every(
    ([k, lv]) => (room.furniture[k] || 0) >= lv
  );

  room.tenant = {
    name: applicant.name,
    jobId: applicant.jobId,
    jobName: applicant.jobName,
    maxBudget: applicant.maxBudget,
    personality: applicant.personality,
    style: applicant.style,
    happiness: allMet ? 88 : 72,
    needs: { cleanliness: 68, hunger: 75, energy: 84 }
  };
  // 입주 후 첫 월세 타격감을 빠르게 느낄 수 있도록 타이머 45% 충전 상태로 시작!
  room.rentTimer = room.rentCycleSec * 0.45;
  room.dust = Math.max(room.dust, 62);

  dom.recruitModal.classList.add('hidden');
  updateSingleRoomDOM(room.id);
  createActorForRoom(room, true);

  spawnCoinBurst(room.x + room.w / 2, room.y + 130, 5);
  showToast(`🏡 ${room.name}에 [${applicant.jobName}] ${applicant.name}님이 입주했어요!`, 'emerald');

  selectRoom(room.id, true);
  updateHudUI();
  updateQuestUI();
  saveGameState();
}

function evictTenant(roomId) {
  const room = getRoomById(roomId);
  if (!room || !room.tenant) return;

  const evictedTenant = room.tenant;
  room.tenant = null;
  room.rentTimer = 0;
  state.stats.evictions += 1;

  if (minimiActors[roomId]) {
    minimiActors[roomId].el.remove();
    delete minimiActors[roomId];
  }
  playEvictionWalkOutAnimation(room, evictedTenant);

  updateSingleRoomDOM(room.id);
  renderRoomPanelBody(room);
  updateHudUI();
  updateQuestUI();
  saveGameState();

  showToast(`⚡ ${room.name} 계약 해지 완료! 더 높은 예산의 VIP 입주민을 맞이해보세요.`, 'amber');
}

function playEvictionWalkOutAnimation(room, evictedTenant) {
  const tempEl = document.createElement('div');
  tempEl.className = 'minimi-entity is-walking';
  tempEl.style.left = `${room.x + 192}px`;
  tempEl.style.top = `${room.corridorY}px`;
  tempEl.innerHTML = `
    <div class="minimi-shadow"></div>
    <div class="minimi-body-wrap">${buildMinimiSVG(evictedTenant, 'OVERBUDGET', 'evict')}</div>
    <div class="minimi-speech">짐 싸서 이사 갑니다~ 성공해서 다시 올게요! 📦</div>
  `;
  dom.minimiLayer.appendChild(tempEl);

  tempEl.animate(
    [
      { left: `${room.x + 192}px`, opacity: 1 },
      { left: `${WORLD_CONFIG.stairX}px`, opacity: 1 },
      { left: `${WORLD_CONFIG.stairX + 40}px`, opacity: 0 }
    ],
    { duration: 3000, easing: 'linear', fill: 'forwards' }
  );
  setTimeout(() => tempEl.remove(), 3100);
}

// =========================================================
// 10. 메인 가이드 퀘스트 & 입주민 카톡 소통 시스템
// =========================================================
function updateQuestUI() {
  if (state.questIndex >= MAIN_QUESTS.length) {
    dom.questStepTag.textContent = '👑 모든 초보 미션 마스터!';
    dom.questRewardTag.textContent = '달성 완료';
    dom.questTitle.textContent = '축하합니다! 전설의 코지 갓물주 등극!';
    dom.questDesc.textContent = '전 호실 로얄 부티크 스위트와 1층 랜드마크 상가를 완성해보세요.';
    dom.questHint.innerHTML = '<span>✨ 자유 타이쿤 플레이 진행 중</span>';
    dom.questBtn.classList.remove('quest-ready-glow');
    return;
  }

  const q = MAIN_QUESTS[state.questIndex];
  const isComplete = q.check(state);

  dom.questStepTag.textContent = `📋 초보 갓물주 미션 ${state.questIndex + 1}/${MAIN_QUESTS.length}`;
  dom.questRewardTag.textContent = `🎁 +${q.reward}만`;
  dom.questTitle.textContent = q.title;
  dom.questDesc.textContent = q.desc;

  if (isComplete) {
    dom.questBtn.classList.add('quest-ready-glow');
    dom.questHint.innerHTML = '<span class="text-emerald-700 font-bold">🎉 미션 달성! 터치해서 지원금 보상을 받으세요!</span>';
  } else {
    dom.questBtn.classList.remove('quest-ready-glow');
    dom.questHint.innerHTML = '<span>👉 터치하면 해당 위치로 카메라가 이동합니다</span>';
  }
}

function handleQuestBadgeClick() {
  if (state.questIndex >= MAIN_QUESTS.length) {
    fitWorldToScreen(true);
    return;
  }

  const q = MAIN_QUESTS[state.questIndex];
  if (q.check(state)) {
    addGold(q.reward);
    showToast(`🎁 미션 완료! 지원금 +${q.reward}만원 지급!`, 'emerald');
    const targetRoom = q.focusRoom ? getRoomById(q.focusRoom) : null;
    if (targetRoom) {
      spawnCoinBurst(targetRoom.x + 192, targetRoom.y + 120, 7);
      spawnRentJackpotPopup(targetRoom.x + 192, targetRoom.y + 100, `+${q.reward}만 원!`, '🎁');
    }
    state.questIndex += 1;
    updateQuestUI();
    if (selection.type === 'room' && selection.id) {
      renderRoomPanelBody(getRoomById(selection.id));
    }
    saveGameState();
    return;
  }

  if (q.focusRoom) {
    selectRoom(q.focusRoom, true);
  } else if (q.focusShop) {
    selectShop(q.focusShop, true);
  }
}

function triggerRandomKakaoComplaint() {
  if (activeKakaoEvent) return;
  const occupiedRooms = state.rooms.filter((r) => r.unlocked && r.tenant);
  if (occupiedRooms.length === 0) return;

  const room = pickRandom(occupiedRooms);
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
  dom.kakaoAvatarBox.innerHTML = `<div class="scale-[0.68] translate-y-1">${buildMinimiSVG(room.tenant, 'IDLE', 'kakao')}</div>`;
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
    const actor = minimiActors[room.id];
    if (actor) showActorSpeech(actor, choice.reply, 4.8);
    if (choice.bonusGold > 0) {
      spawnCoinBurst(room.x + 192, room.y + 120, 5);
      spawnRentJackpotPopup(room.x + 192, room.y + 105, `+${choice.bonusGold}만 원!`, '💖');
    }
    focusOnWorldPoint(room.x + 192, room.y + 140, Math.max(camera.scale, 1.05), selection.type !== null);
  }

  dom.kakaoModal.classList.add('hidden');
  dom.kakaoFloatingBtn.classList.add('hidden');
  activeKakaoEvent = null;
  kakaoCooldown = 36 + Math.random() * 18;

  showToast(`💬 ${choice.reply}`, choice.happinessDelta >= 0 ? 'emerald' : 'amber');
  if (selection.type === 'room' && room && selection.id === room.id) {
    renderRoomPanelBody(room);
  }
  saveGameState();
}

// =========================================================
// 11. 자산 업데이트 & 시간 흐름 & 메인 애니메이션 루프
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
    dom.hudShopProfitHint.textContent = `🏪상가 방문 +${sProfit}~${lProfit}만`;
  }

  const unlockedCount = state.rooms.filter((r) => r.unlocked).length;
  const occupiedCount = state.rooms.filter((r) => r.unlocked && r.tenant).length;
  dom.hudOccupancy.textContent = `입주 ${occupiedCount}/${unlockedCount}실`;

  const totalMins = Math.floor(state.gameMinutes);
  const hour = Math.floor(totalMins / 60) % 24;
  const min = Math.floor(totalMins % 60);
  const hh = String(hour).padStart(2, '0');
  const mm = String(min).padStart(2, '0');

  let periodIcon = '☀️';
  let periodName = '오전';
  let skyClass = 'time-morning';

  if (hour >= 6 && hour < 12) {
    periodIcon = '☀️';
    periodName = '오전';
    skyClass = 'time-morning';
  } else if (hour >= 12 && hour < 18) {
    periodIcon = '🌤️';
    periodName = '오후';
    skyClass = 'time-afternoon';
  } else if (hour >= 18 && hour < 22) {
    periodIcon = '🌇';
    periodName = '노을';
    skyClass = 'time-evening';
  } else {
    periodIcon = '🌙';
    periodName = '밤';
    skyClass = 'time-night';
  }

  dom.hudTimeBadge.textContent = `${periodIcon} ${state.day}일차 · ${periodName} ${hh}:${mm}`;
  if (!dom.world.classList.contains(skyClass)) {
    dom.world.classList.remove('time-morning', 'time-afternoon', 'time-evening', 'time-night');
    dom.world.classList.add(skyClass);
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

function startMainLoops() {
  let lastTime = performance.now();

  function frame(now) {
    const dt = Math.min(0.08, (now - lastTime) / 1000);
    lastTime = now;

    // 1) 카메라 부드러운 이동 보간
    if (camera.animating) {
      const lerp = Math.min(1, dt * 8.5);
      camera.x += (camera.targetX - camera.x) * lerp;
      camera.y += (camera.targetY - camera.y) * lerp;
      camera.scale += (camera.targetScale - camera.scale) * lerp;
      applyCameraTransform();

      if (
        Math.abs(camera.targetX - camera.x) < 0.4 &&
        Math.abs(camera.targetY - camera.y) < 0.4 &&
        Math.abs(camera.targetScale - camera.scale) < 0.002
      ) {
        camera.x = camera.targetX;
        camera.y = camera.targetY;
        camera.scale = camera.targetScale;
        camera.animating = false;
        applyCameraTransform();
      }
    }

    // 2) 시간 진행
    state.gameMinutes += dt * 15;
    if (state.gameMinutes >= 24 * 60) {
      state.gameMinutes -= 24 * 60;
      state.day += 1;
    }

    // 3) 호실별 독립 월세 쿨타임 게이지 & 코인 폭발 수금
    tickRoomRentTimers(dt);

    // 4) 건물주 돌발 케어 클릭 이벤트 스폰
    tickCareBubbles(dt);

    // 5) 1층 상가 연쇄 소비 루프
    tickBuildingShopChainLoop(dt);

    // 6) 카톡 민원 타이머
    if (!activeKakaoEvent) {
      kakaoCooldown -= dt;
      if (kakaoCooldown <= 0) {
        kakaoCooldown = 35 + Math.random() * 18;
        triggerRandomKakaoComplaint();
      }
    }

    // 7) 미니미 입주민 보행 & 일상 루틴
    tickMinimiActors(dt);
    updateHudUI();

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  setInterval(() => {
    saveGameState();
    updateQuestUI();
  }, 3000);
}
