// =========================================================
// 【갓물주 라이프: 미니미 하우스】 메인 게임 엔진 (app.js)
// 줌앤팬 디오라마 카메라, 미니미 일상 루틴 AI, 인테리어/임대/퇴거, 카톡 민원, 자동저장
// =========================================================

const SAVE_KEY = 'god_landlord_minimi_v1';
const PAYDAY_INTERVAL_SEC = 18; // 18초마다 월세 정기 입금

// --------------------- 전역 게임 상태 ---------------------
let state = createDefaultState();

function createDefaultState() {
  return {
    gold: 300, // 초기 자본금 300만원
    day: 1,
    gameMinutes: 8 * 60, // 오전 08:00 시작
    paydayTimer: 0,
    questIndex: 0,
    rooms: JSON.parse(JSON.stringify(INITIAL_ROOMS)).map((r) => ({
      ...r,
      tenant: null,
      dust: 65
    })),
    shops: JSON.parse(JSON.stringify(INITIAL_SHOPS)),
    stats: {
      evictions: 0,
      totalRentEarned: 0,
      shopVisits: 0
    },
    lastSavedAt: Date.now()
  };
}

// 런타임 전용 상태 (DOM, 카메라, 미니미 액터, 카톡 알림 등)
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

const minimiActors = {}; // roomId -> 실시간 위치/경로/상태 머신
let currentApplicants = [];
let recruitTargetRoomId = null;
let activeKakaoEvent = null; // { roomId, eventData }
let kakaoCooldown = 26; // 첫 카톡 민원 대기 초

// DOM 참조 캐시
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
    // 첫 접속 시 101호 쪽을 보기 좋게 포커스 안내
    setTimeout(() => {
      if (state.questIndex === 0 && state.rooms[0].furniture.wallpaper === 0) {
        focusOnWorldPoint(410, 630, 0.85);
      }
    }, 350);
  }

  startMainLoops();
});

function cacheDom() {
  dom.viewport = document.getElementById('viewport');
  dom.world = document.getElementById('world-canvas');
  dom.roomsLayer = document.getElementById('rooms-layer');
  dom.shopsLayer = document.getElementById('shops-layer');
  dom.minimiLayer = document.getElementById('minimi-layer');
  dom.particleLayer = document.getElementById('particle-layer');

  dom.hudGold = document.getElementById('hud-gold');
  dom.hudRentTotal = document.getElementById('hud-rent-total');
  dom.hudPaydaySec = document.getElementById('hud-payday-sec');
  dom.hudPaydayBar = document.getElementById('hud-payday-bar');
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
        if (dom.autosaveIndicator) dom.autosaveIndicator.style.opacity = '0.65';
      }, 700);
    }
  } catch (e) {
    console.warn('AutoSave skipped:', e);
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

    // 호실/상가 초기 메타 좌표 최신화 병합
    state.rooms = INITIAL_ROOMS.map((initRoom) => {
      const savedRoom = parsed.rooms.find((r) => r.id === initRoom.id);
      if (!savedRoom) return { ...initRoom, tenant: null, dust: 50 };
      return {
        ...initRoom,
        unlocked: savedRoom.unlocked,
        furniture: { ...initRoom.furniture, ...(savedRoom.furniture || {}) },
        tenant: savedRoom.tenant || null,
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

    // 오프라인 보상 계산 (최소 45초 이상 부재, 최대 8시간 한도)
    const now = Date.now();
    const awaySec = Math.min(28800, Math.floor((now - (parsed.lastSavedAt || now)) / 1000));
    const totalRent = calcTotalActiveRent();
    if (awaySec >= 45 && totalRent > 0) {
      const cycles = awaySec / PAYDAY_INTERVAL_SEC;
      const shopBonus = Math.floor(cycles * 0.35 * (
        state.shops.store.levels[state.shops.store.level].visitProfit +
        state.shops.laundry.levels[state.shops.laundry.level].visitProfit
      ));
      const earned = Math.max(5, Math.floor(cycles * totalRent * 0.55 + shopBonus));
      return { awaySec, earned };
    }
  } catch (e) {
    console.warn('Load failed, starting fresh:', e);
  }
  return null;
}

function showOfflineModal(awaySec, earned) {
  const mins = Math.max(1, Math.floor(awaySec / 60));
  dom.offlineTimeText.textContent = `약 ${mins}분 동안 세입자들의 월세와 1층 상가 수익이 차곡차곡 쌓였어요!`;
  dom.offlineGoldAmount.textContent = earned.toLocaleString();
  dom.offlineModal.classList.remove('hidden');

  document.getElementById('btn-claim-offline').onclick = () => {
    addGold(earned);
    dom.offlineModal.classList.add('hidden');
    showToast(`🏦 부재중 수익 +${earned.toLocaleString()}만원 입금 완료!`, 'emerald');
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
  const marginYTop = Math.max(110, vh * 0.22);
  const marginYBottom = Math.max(240, vh * 0.45); // 하단 관리 패널 여유 공간 확보

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
  const usableH = vh - 86;
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
  // 하단 패널이 열릴 때는 화면 상단 36% 지점에 호실이 오도록 스르륵 이동
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

  // 마우스 드래그 Pan
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

  // 마우스 휠 Zoom
  dom.viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    zoomAroundPoint(camera.scale * factor, e.clientX, e.clientY, false);
  }, { passive: false });

  // 모바일 한 손가락 터치 드래그 & 두 손가락 핀치 줌
  let touchMode = null; // 'pan' | 'pinch'
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
      dragDistance = 999; // 핀치 중 탭 클릭 방지
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
        const nextScale = pinchStartScale * (dist / pinchStartDist);
        zoomAroundPoint(nextScale, midX, midY, false);
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

  // 월드 클릭 위임 (드래그가 아닌 순수 탭/클릭일 때만 호실/상가 선택)
  dom.world.addEventListener('click', (e) => {
    if (dragDistance > 10) return;
    const roomCard = e.target.closest('[data-room-id]');
    if (roomCard) {
      selectRoom(roomCard.dataset.roomId, true);
      return;
    }
    const shopCard = e.target.closest('[data-shop-id]');
    if (shopCard) {
      selectShop(shopCard.dataset.shopId, true);
      return;
    }
  });

  // 우측 [+ 확대] / [- 축소] / [🏠 전체보기] 버튼
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

  // 하단 관리 패널 닫기
  document.getElementById('btn-close-panel').addEventListener('click', closeBottomPanel);

  // 세입자 모집 모달 닫기 & 새로고침
  document.getElementById('btn-close-recruit').addEventListener('click', () => {
    dom.recruitModal.classList.add('hidden');
  });
  document.getElementById('btn-refresh-applicants').addEventListener('click', () => {
    if (!recruitTargetRoomId) return;
    if (state.gold < 10) {
      showToast('💸 전단지 홍보 비용(10만원)이 부족합니다!', 'rose');
      return;
    }
    addGold(-10);
    const room = getRoomById(recruitTargetRoomId);
    currentApplicants = generateApplicants(room);
    renderRecruitCards(room);
    showToast('📢 새로운 입주 희망자 3명이 연락해왔습니다!', 'amber');
  });

  // 퀘스트 배지 클릭 -> 보상 수령 또는 해당 호실 Smooth Focus
  dom.questBtn.addEventListener('click', handleQuestBadgeClick);

  // 카톡 플로팅 배너 & 닫기
  dom.kakaoFloatingBtn.addEventListener('click', openKakaoModal);
  document.getElementById('btn-close-kakao').addEventListener('click', () => {
    dom.kakaoModal.classList.add('hidden');
  });

  // 데이터 초기화 버튼
  document.getElementById('btn-reset-save').addEventListener('click', () => {
    if (confirm('모든 건물 및 세입자 데이터를 초기화하고 처음부터 다시 시작할까요?')) {
      localStorage.removeItem(SAVE_KEY);
      window.location.reload();
    }
  });

  window.addEventListener('resize', () => {
    setCameraImmediate(camera.x, camera.y, camera.scale);
  });
}

// =========================================================
// 3. 디오라마 호실 & 가구 & 상가 그래픽 렌더링
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
  const hasCat = room.tenant && room.tenant.style && room.tenant.style.hasCat;

  el.innerHTML = `
    <div class="room-number-plate">${room.name}</div>
    ${room.unlocked ? `<div class="room-rent-pill">월세 ${marketRent}만</div>` : ''}

    <!-- 뒷벽 & 창문 -->
    <div class="room-wall">
      ${renderWindowSVG(wpLv)}
    </div>

    <!-- 바닥 & 러그 -->
    <div class="room-floor">
      ${renderCenterRugSVG(wpLv, room.dust)}
    </div>

    <!-- 에어컨 (벽면 중앙 우측 상단) -->
    <div class="furniture-item ${upgradedKey === 'ac' ? 'upgraded-pop' : ''}" style="left: 192px; top: 8px;">
      ${renderFurnitureSVG('ac', room.furniture.ac)}
    </div>

    <!-- 침대 (좌측 상단 코너) -->
    <div class="furniture-item ${upgradedKey === 'bed' ? 'upgraded-pop' : ''}" style="left: 16px; top: 50px;">
      ${renderFurnitureSVG('bed', room.furniture.bed)}
    </div>

    <!-- 화장실 타일 구역 & 샤워부스 (우측 상단) -->
    <div class="bathroom-zone ${upgradedKey === 'shower' ? 'upgraded-pop' : ''}">
      ${renderFurnitureSVG('shower', room.furniture.shower)}
      <div class="shower-frosted-glass">♨️ SHOWER</div>
    </div>

    <!-- 주방 싱크대 (좌측 하단) -->
    <div class="furniture-item ${upgradedKey === 'kitchen' ? 'upgraded-pop' : ''}" style="left: 16px; top: 174px;">
      ${renderFurnitureSVG('kitchen', room.furniture.kitchen)}
    </div>

    <!-- 책상 / PC (우측 하단) -->
    <div class="furniture-item ${upgradedKey === 'desk' ? 'upgraded-pop' : ''}" style="left: 258px; top: 164px;">
      ${renderFurnitureSVG('desk', room.furniture.desk)}
    </div>

    <!-- 고양이 집사 전용 치즈냥이 펫 -->
    ${hasCat ? renderPetCatSVG() : ''}

    <!-- 공실 안내 팻말 -->
    ${room.unlocked && !room.tenant ? `
      <div class="absolute left-1/2 top-[128px] -translate-x-1/2 z-[5] bg-amber-400/95 text-amber-950 font-jua text-xs px-3 py-1 rounded-full border-2 border-amber-900 shadow-md animate-bounce pointer-events-none">
        📢 공실 · 터치하여 관리
      </div>
    ` : ''}

    <!-- 수면 무드등 오버레이 -->
    <div class="room-sleep-mood"></div>

    <!-- 현관문 -->
    <div class="room-door-frame"><div class="room-door-leaf"></div></div>

    <!-- 미개방 호실 잠금 화면 -->
    ${!room.unlocked ? `
      <div class="locked-room-overlay">
        <div class="text-3xl mb-1">🔒</div>
        <div class="font-jua text-base text-amber-300">${room.name} 미개방 호실</div>
        <div class="font-jua text-xs bg-amber-400 text-amber-950 px-3 py-1 rounded-full mt-1.5 border border-amber-900 shadow">
          분양 오픈 💰${room.unlockCost}만원
        </div>
      </div>
    ` : ''}
  `;
}

function renderWindowSVG(wpLv) {
  const frameColor = wpLv >= 3 ? '#ca8a04' : wpLv === 2 ? '#92400e' : '#475569';
  return `
    <svg width="60" height="44" viewBox="0 0 60 44" style="position:absolute; left:128px; top:11px;">
      <rect x="2" y="2" width="56" height="40" rx="6" fill="#bae6fd" stroke="${frameColor}" stroke-width="3.2"/>
      <path d="M6 34 L19 20 L31 30 L43 18 L55 34 Z" fill="#86efac" opacity="0.65"/>
      <line x1="30" y1="2" x2="30" y2="42" stroke="${frameColor}" stroke-width="2.8"/>
      <line x1="2" y1="22" x2="58" y2="22" stroke="${frameColor}" stroke-width="2.2"/>
    </svg>
  `;
}

function renderCenterRugSVG(wpLv, dust = 0) {
  let rugHtml = '';
  if (wpLv === 1) {
    rugHtml = `<ellipse cx="190" cy="122" rx="44" ry="26" fill="#bae6fd" stroke="#38bdf8" stroke-width="2.5"/>`;
  } else if (wpLv === 2) {
    rugHtml = `<rect x="142" y="94" width="96" height="56" rx="18" fill="#fef3c7" stroke="#d97706" stroke-width="2.5"/>`;
  } else if (wpLv >= 3) {
    rugHtml = `
      <rect x="138" y="92" width="104" height="60" rx="14" fill="#1e1b4b" stroke="#eab308" stroke-width="3"/>
      <rect x="146" y="100" width="88" height="44" rx="10" fill="none" stroke="#fde047" stroke-width="1.2" stroke-dasharray="4 3"/>
    `;
  }
  // 먼지가 많으면 먼지 뭉치 표시
  const dustDots = dust >= 50 ? `
    <circle cx="150" cy="78" r="5" fill="rgba(87,83,78,0.42)"/>
    <circle cx="228" cy="145" r="6" fill="rgba(87,83,78,0.38)"/>
    <circle cx="176" cy="162" r="4.5" fill="rgba(87,83,78,0.42)"/>
  ` : '';

  return `<svg width="380" height="202" viewBox="0 0 380 202" class="pointer-events-none">${rugHtml}${dustDots}</svg>`;
}

function renderPetCatSVG() {
  return `
    <div class="room-pet-cat">
      <svg width="34" height="28" viewBox="0 0 34 28">
        <ellipse cx="17" cy="24" rx="12" ry="4" fill="rgba(0,0,0,0.18)"/>
        <ellipse cx="18" cy="18" rx="10" ry="7" fill="#fb923c" stroke="#7c2d12" stroke-width="1.8"/>
        <circle cx="11" cy="13" r="6.5" fill="#fb923c" stroke="#7c2d12" stroke-width="1.8"/>
        <polygon points="6,9 8,3 12,8" fill="#fb923c" stroke="#7c2d12" stroke-width="1.5"/>
        <polygon points="12,8 15,3 17,9" fill="#fb923c" stroke="#7c2d12" stroke-width="1.5"/>
        <circle cx="9" cy="13" r="1.2" fill="#1e293b"/>
        <circle cx="13" cy="13" r="1.2" fill="#1e293b"/>
        <path d="M27 18 Q33 12 30 8" fill="none" stroke="#fb923c" stroke-width="3" stroke-linecap="round"/>
      </svg>
    </div>
  `;
}

// 6종 가구 등급별(Lv.0 ~ Lv.3) 입체 SVG 그래픽
function renderFurnitureSVG(type, lv) {
  if (type === 'bed') {
    if (lv === 0) {
      return `
        <svg width="104" height="96" viewBox="0 0 104 96">
          <rect x="10" y="24" width="82" height="64" rx="8" fill="#cbd5e1" stroke="#64748b" stroke-width="2" stroke-dasharray="5 3"/>
          <rect x="22" y="30" width="34" height="16" rx="5" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5"/>
          <text x="51" y="66" text-anchor="middle" font-size="10" fill="#475569" font-family="Jua">맨바닥 요</text>
        </svg>`;
    }
    if (lv === 1) {
      return `
        <svg width="104" height="98" viewBox="0 0 104 98">
          <rect x="8" y="14" width="86" height="76" rx="10" fill="#93c5fd" stroke="#1e3a8a" stroke-width="2.5"/>
          <rect x="8" y="38" width="86" height="52" rx="9" fill="#60a5fa" stroke="#1e3a8a" stroke-width="2"/>
          <rect x="22" y="20" width="42" height="16" rx="6" fill="#ffffff" stroke="#64748b" stroke-width="1.8"/>
        </svg>`;
    }
    if (lv === 2) {
      return `
        <svg width="108" height="102" viewBox="0 0 108 102">
          <rect x="6" y="6" width="94" height="16" rx="5" fill="#b45309" stroke="#451a03" stroke-width="2.5"/>
          <rect x="8" y="18" width="90" height="76" rx="10" fill="#fef3c7" stroke="#78350f" stroke-width="2.5"/>
          <rect x="8" y="42" width="90" height="52" rx="9" fill="#34d399" stroke="#065f46" stroke-width="2.2"/>
          <rect x="18" y="23" width="32" height="16" rx="6" fill="#ffffff" stroke="#94a3b8" stroke-width="1.6"/>
          <rect x="56" y="23" width="32" height="16" rx="6" fill="#ffffff" stroke="#94a3b8" stroke-width="1.6"/>
        </svg>`;
    }
    return `
      <svg width="112" height="104" viewBox="0 0 112 104">
        <rect x="4" y="4" width="102" height="20" rx="8" fill="#1e1b4b" stroke="#eab308" stroke-width="3"/>
        <rect x="8" y="18" width="94" height="80" rx="12" fill="#ffffff" stroke="#ca8a04" stroke-width="2.8"/>
        <rect x="8" y="44" width="94" height="54" rx="11" fill="#fef08a" stroke="#ca8a04" stroke-width="2.2"/>
        <line x1="12" y1="62" x2="98" y2="62" stroke="#eab308" stroke-width="2"/>
        <rect x="18" y="23" width="34" height="17" rx="7" fill="#fffbeb" stroke="#eab308" stroke-width="1.8"/>
        <rect x="58" y="23" width="34" height="17" rx="7" fill="#fffbeb" stroke="#eab308" stroke-width="1.8"/>
        <circle cx="55" cy="13" r="4" fill="#fde047"/>
      </svg>`;
  }

  if (type === 'shower') {
    if (lv === 0) {
      return `
        <svg width="92" height="120" viewBox="0 0 92 120">
          <ellipse cx="46" cy="46" rx="22" ry="15" fill="#e2e8f0" stroke="#64748b" stroke-width="2.5"/>
          <circle cx="46" cy="46" r="4" fill="#475569"/>
          <text x="46" y="92" text-anchor="middle" font-size="10" fill="#64748b" font-family="Jua">샤워미설치</text>
        </svg>`;
    }
    if (lv === 1) {
      return `
        <svg width="92" height="120" viewBox="0 0 92 120">
          <rect x="12" y="10" width="68" height="98" rx="8" fill="#f0f9ff" stroke="#38bdf8" stroke-width="2"/>
          <path d="M46 12 L46 26 M38 26 L54 26" stroke="#475569" stroke-width="3" stroke-linecap="round"/>
          <path d="M12 18 Q28 26 44 18 Q62 26 80 18" fill="none" stroke="#0284c7" stroke-width="2.5"/>
          <circle cx="46" cy="86" r="6" fill="#94a3b8"/>
        </svg>`;
    }
    if (lv === 2) {
      return `
        <svg width="92" height="120" viewBox="0 0 92 120">
          <rect x="8" y="8" width="76" height="104" rx="10" fill="#e0f2fe" stroke="#0284c7" stroke-width="3"/>
          <rect x="34" y="12" width="24" height="8" rx="4" fill="#334155"/>
          <line x1="46" y1="22" x2="46" y2="38" stroke="#38bdf8" stroke-width="2" stroke-dasharray="3 3"/>
          <rect x="10" y="10" width="34" height="100" fill="rgba(255,255,255,0.48)" stroke="#7dd3fc" stroke-width="1.5"/>
        </svg>`;
    }
    return `
      <svg width="92" height="120" viewBox="0 0 92 120">
        <rect x="6" y="6" width="80" height="108" rx="12" fill="#fef3c7" stroke="#ca8a04" stroke-width="3"/>
        <ellipse cx="46" cy="76" rx="32" ry="24" fill="#fde68a" stroke="#b45309" stroke-width="3"/>
        <ellipse cx="46" cy="76" rx="25" ry="17" fill="#7dd3fc"/>
        <rect x="28" y="10" width="36" height="9" rx="4" fill="#eab308" stroke="#78350f" stroke-width="1.8"/>
      </svg>`;
  }

  if (type === 'kitchen') {
    if (lv === 0) {
      return `
        <svg width="106" height="68" viewBox="0 0 106 68">
          <rect x="24" y="24" width="46" height="30" rx="6" fill="#64748b" stroke="#1e293b" stroke-width="2"/>
          <circle cx="47" cy="39" r="9" fill="#ef4444" opacity="0.75"/>
          <text x="47" y="18" text-anchor="middle" font-size="10" fill="#475569" font-family="Jua">휴대용버너</text>
        </svg>`;
    }
    if (lv === 1) {
      return `
        <svg width="106" height="72" viewBox="0 0 106 72">
          <rect x="6" y="14" width="94" height="50" rx="8" fill="#e2e8f0" stroke="#475569" stroke-width="2.5"/>
          <rect x="14" y="22" width="36" height="28" rx="5" fill="#cbd5e1" stroke="#64748b" stroke-width="2"/>
          <circle cx="74" cy="36" r="12" fill="#1e293b"/>
          <circle cx="74" cy="36" r="7" fill="none" stroke="#ef4444" stroke-width="2"/>
        </svg>`;
    }
    if (lv === 2) {
      return `
        <svg width="110" height="74" viewBox="0 0 110 74">
          <rect x="4" y="10" width="102" height="56" rx="9" fill="#ffffff" stroke="#b45309" stroke-width="2.5"/>
          <rect x="12" y="18" width="40" height="30" rx="6" fill="#bae6fd" stroke="#0284c7" stroke-width="2"/>
          <rect x="60" y="18" width="38" height="30" rx="5" fill="#1e293b"/>
          <circle cx="71" cy="33" r="6" stroke="#f97316" stroke-width="2" fill="none"/>
          <circle cx="87" cy="33" r="6" stroke="#f97316" stroke-width="2" fill="none"/>
        </svg>`;
    }
    return `
      <svg width="112" height="76" viewBox="0 0 112 76">
        <rect x="4" y="8" width="104" height="60" rx="10" fill="#1e1b4b" stroke="#eab308" stroke-width="3"/>
        <rect x="10" y="14" width="92" height="34" rx="6" fill="#fafaf9"/>
        <rect x="16" y="18" width="36" height="24" rx="5" fill="#e0f2fe" stroke="#ca8a04" stroke-width="2"/>
        <rect x="58" y="18" width="38" height="24" rx="5" fill="#0f172a"/>
        <circle cx="70" cy="30" r="5.5" stroke="#38bdf8" stroke-width="2" fill="none"/>
        <circle cx="84" cy="30" r="5.5" stroke="#38bdf8" stroke-width="2" fill="none"/>
        <circle cx="32" cy="58" r="3" fill="#fde047"/>
        <circle cx="80" cy="58" r="3" fill="#fde047"/>
      </svg>`;
  }

  if (type === 'desk') {
    if (lv === 0) {
      return `
        <svg width="106" height="76" viewBox="0 0 106 76">
          <ellipse cx="54" cy="44" rx="28" ry="18" fill="#fdba74" stroke="#9a3412" stroke-width="2.2"/>
          <text x="54" y="48" text-anchor="middle" font-size="10" fill="#7c2d12" font-family="Jua">접이식밥상</text>
        </svg>`;
    }
    if (lv === 1) {
      return `
        <svg width="106" height="78" viewBox="0 0 106 78">
          <rect x="12" y="18" width="82" height="42" rx="6" fill="#cbd5e1" stroke="#334155" stroke-width="2.5"/>
          <rect x="36" y="24" width="34" height="22" rx="3" fill="#38bdf8" stroke="#1e293b" stroke-width="2"/>
          <circle cx="53" cy="66" r="10" fill="#475569"/>
        </svg>`;
    }
    if (lv === 2) {
      return `
        <svg width="108" height="80" viewBox="0 0 108 80">
          <rect x="8" y="16" width="92" height="44" rx="8" fill="#fde68a" stroke="#92400e" stroke-width="2.5"/>
          <rect x="28" y="10" width="48" height="22" rx="4" fill="#0f172a" stroke="#334155" stroke-width="2"/>
          <rect x="31" y="13" width="42" height="16" fill="#38bdf8"/>
          <circle cx="86" cy="28" r="7" fill="#22c55e"/>
          <rect x="38" y="60" width="30" height="14" rx="7" fill="#10b981" stroke="#065f46" stroke-width="2"/>
        </svg>`;
    }
    return `
      <svg width="110" height="82" viewBox="0 0 110 82">
        <rect x="6" y="16" width="98" height="46" rx="9" fill="#18181b" stroke="#ec4899" stroke-width="2.8"/>
        <rect x="14" y="8" width="38" height="22" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
        <rect x="56" y="8" width="38" height="22" rx="4" fill="#0f172a" stroke="#a855f7" stroke-width="2"/>
        <rect x="36" y="38" width="36" height="10" rx="3" fill="#334155"/>
        <rect x="36" y="62" width="38" height="16" rx="8" fill="#ec4899" stroke="#831843" stroke-width="2"/>
      </svg>`;
  }

  if (type === 'ac') {
    if (lv === 0) {
      return `
        <svg width="86" height="52" viewBox="0 0 86 52">
          <circle cx="43" cy="24" r="14" fill="#e0f2fe" stroke="#475569" stroke-width="2"/>
          <path d="M43 13 L43 35 M32 24 L54 24" stroke="#0284c7" stroke-width="2.5"/>
          <rect x="35" y="38" width="16" height="8" rx="3" fill="#64748b"/>
        </svg>`;
    }
    if (lv === 1) {
      return `
        <svg width="90" height="44" viewBox="0 0 90 44">
          <rect x="6" y="4" width="78" height="24" rx="5" fill="#fef9c3" stroke="#64748b" stroke-width="2.2"/>
          <line x1="14" y1="22" x2="76" y2="22" stroke="#94a3b8" stroke-width="2"/>
          <path d="M26 30 Q24 38 20 42 M45 30 Q45 38 43 42 M64 30 Q66 38 70 42" stroke="#7dd3fc" stroke-width="2" fill="none"/>
        </svg>`;
    }
    if (lv === 2) {
      return `
        <svg width="92" height="46" viewBox="0 0 92 46">
          <rect x="4" y="3" width="84" height="25" rx="7" fill="#ffffff" stroke="#0284c7" stroke-width="2.4"/>
          <circle cx="74" cy="15" r="4" fill="#38bdf8"/>
          <path d="M22 31 Q20 40 16 44 M46 31 Q46 40 46 44 M70 31 Q72 40 76 44" stroke="#38bdf8" stroke-width="2.2" fill="none"/>
        </svg>`;
    }
    return `
      <svg width="96" height="48" viewBox="0 0 96 48">
        <rect x="3" y="2" width="90" height="26" rx="8" fill="#1e1b4b" stroke="#eab308" stroke-width="2.8"/>
        <rect x="14" y="18" width="68" height="5" rx="2" fill="#fde047"/>
        <path d="M22 31 Q18 41 14 46 M48 31 Q48 41 48 46 M74 31 Q78 41 82 46" stroke="#67e8f9" stroke-width="2.4" fill="none"/>
      </svg>`;
  }
  return '';
}

// 1층 단지 내 상가 렌더링 (24시 편의점, 코인세탁소)
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
      <div class="w-full h-full bg-gradient-to-b from-sky-50 to-amber-50 relative">
        <!-- 편의점 컬러풀 간판 -->
        <div class="h-[46px] bg-gradient-to-r from-sky-600 via-cyan-500 to-emerald-500 border-b-4 border-slate-800 px-4 flex items-center justify-between text-white">
          <div class="flex items-center gap-2">
            <span class="text-xl">🏪</span>
            <span class="font-jua text-base tracking-wide">24시 미니미 편의점 <span class="text-amber-200">Lv.${shop.level}</span></span>
          </div>
          <span class="font-jua text-xs bg-slate-900/75 text-amber-300 px-2.5 py-0.5 rounded-full">방문당 +${lvInfo.visitProfit}만원</span>
        </div>

        <!-- 내부 진열대 & 계산대 그래픽 -->
        <div class="p-4 flex items-end justify-between h-[200px]">
          <!-- 음료 냉장고 & 진열대 -->
          <div class="flex gap-2.5">
            <div class="w-[82px] h-[126px] bg-sky-100 border-2 border-sky-500 rounded-xl p-1.5 flex flex-col justify-between shadow">
              <div class="font-jua text-[10px] text-center text-sky-900 bg-sky-200 rounded">🥤 음료코너</div>
              <div class="grid grid-cols-3 gap-1 text-center text-xs"><span>🧃</span><span>🥛</span><span>🍺</span><span>🥤</span><span>☕</span><span>🍵</span></div>
              <div class="h-2 bg-sky-400 rounded"></div>
            </div>
            <div class="w-[96px] h-[116px] bg-amber-100 border-2 border-amber-500 rounded-xl p-1.5 flex flex-col justify-between shadow">
              <div class="font-jua text-[10px] text-center text-amber-900 bg-amber-200 rounded">🍙 야식·라면</div>
              <div class="grid grid-cols-3 gap-1 text-center text-xs"><span>🍙</span><span>🍜</span><span>🍗</span><span>🌭</span><span>🍰</span><span>🍫</span></div>
              <div class="h-2 bg-amber-400 rounded"></div>
            </div>
            ${shop.level >= 2 ? `
              <div class="w-[74px] h-[116px] bg-rose-100 border-2 border-rose-400 rounded-xl p-1.5 flex flex-col justify-between shadow">
                <div class="font-jua text-[10px] text-center text-rose-900 bg-rose-200 rounded">☕ 즉석카페</div>
                <div class="text-center text-2xl">☕🍩</div>
                <div class="font-jua text-[9px] text-center text-rose-700">${shop.level >= 3 ? '🍷 와인바' : '원두머신'}</div>
              </div>
            ` : ''}
          </div>

          <!-- POS 계산대 -->
          <div class="w-[116px] h-[88px] bg-emerald-100 border-2 border-emerald-600 rounded-xl p-2 flex flex-col justify-between items-center shadow">
            <div class="text-lg">🖥️💳</div>
            <div class="font-jua text-xs text-emerald-900">무인/POS 결제</div>
          </div>
        </div>

        <!-- 출입문 표시 -->
        <div class="absolute bottom-0 left-[216px] w-[56px] h-[16px] bg-sky-400/70 border-2 border-slate-700 border-b-0 rounded-t-lg"></div>
      </div>
    `;
  } else {
    el.innerHTML = `
      <div class="w-full h-full bg-gradient-to-b from-cyan-50 to-indigo-50 relative">
        <!-- 코인세탁소 간판 -->
        <div class="h-[46px] bg-gradient-to-r from-indigo-600 via-sky-500 to-cyan-400 border-b-4 border-slate-800 px-4 flex items-center justify-between text-white">
          <div class="flex items-center gap-2">
            <span class="text-xl">🧺</span>
            <span class="font-jua text-base tracking-wide">워시퐁 코인세탁소 <span class="text-amber-200">Lv.${shop.level}</span></span>
          </div>
          <span class="font-jua text-xs bg-slate-900/75 text-amber-300 px-2.5 py-0.5 rounded-full">방문당 +${lvInfo.visitProfit}만원</span>
        </div>

        <!-- 대형 드럼세탁기 & 건조기 그래픽 -->
        <div class="p-4 flex items-end justify-between h-[200px]">
          <div class="flex gap-3">
            ${[1, 2, 3].map((idx) => `
              <div class="w-[78px] h-[112px] bg-white border-2 border-slate-500 rounded-2xl p-2 flex flex-col items-center justify-between shadow-md">
                <div class="w-full flex justify-between items-center px-1">
                  <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span class="font-jua text-[9px] text-slate-500">${idx === 3 && shop.level >= 2 ? '고온건조' : '버블세탁'}</span>
                </div>
                <svg width="48" height="48" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="20" fill="#bae6fd" stroke="#0284c7" stroke-width="3.5"/>
                  <g class="washer-drum-spinning">
                    <path d="M10 24 Q18 16 24 24 T38 24" fill="#38bdf8" opacity="0.85"/>
                    <circle cx="19" cy="19" r="3" fill="#ffffff"/>
                    <circle cx="29" cy="28" r="2.5" fill="#fde047"/>
                  </g>
                </svg>
                <div class="h-1.5 w-10 bg-slate-200 rounded"></div>
              </div>
            `).join('')}
          </div>

          <!-- 세탁 바구니 / 라운지 -->
          <div class="w-[110px] h-[94px] bg-amber-100 border-2 border-amber-500 rounded-2xl p-2 flex flex-col items-center justify-center text-center shadow">
            <div class="text-2xl">${shop.level >= 3 ? '🛋️☕' : '🧺✨'}</div>
            <div class="font-jua text-xs text-amber-900 mt-1">${shop.level >= 3 ? '안마&카페존' : '뽀송 폴딩존'}</div>
          </div>
        </div>

        <!-- 출입문 표시 -->
        <div class="absolute bottom-0 left-[202px] w-[56px] h-[16px] bg-cyan-400/70 border-2 border-slate-700 border-b-0 rounded-t-lg"></div>
      </div>
    `;
  }
}

// =========================================================
// 4. 볼살 통통 2등신 3D 피규어풍 다중 레이어 커스텀 SVG 생성기
// =========================================================
function buildMinimiSVG(tenant, actionState = 'IDLE', uid = 'p') {
  const st = tenant.style || TENANT_JOBS[0].style;
  const skinId = `skin_${uid}`;
  const outfitId = `outfit_${uid}`;
  const hairColor = st.hairColor || '#27272a';
  const outfitColor = st.outfitColor || '#3b82f6';
  const outfitSub = st.outfitSub || '#dbeafe';

  // 표정 분기
  let eyesMarkup = `
    <ellipse cx="26.5" cy="30" rx="2.6" ry="3.1" fill="#1e293b"/>
    <ellipse cx="39.5" cy="30" rx="2.6" ry="3.1" fill="#1e293b"/>
    <circle cx="27.4" cy="28.8" r="1" fill="#ffffff"/>
    <circle cx="40.4" cy="28.8" r="1" fill="#ffffff"/>
  `;
  let mouthMarkup = `<path d="M30 35.5 Q33 38.5 36 35.5" fill="none" stroke="#7c2d12" stroke-width="1.8" stroke-linecap="round"/>`;

  if (actionState === 'SLEEPING') {
    eyesMarkup = `
      <path d="M24 30 Q26.5 32.5 29 30" fill="none" stroke="#334155" stroke-width="2" stroke-linecap="round"/>
      <path d="M37 30 Q39.5 32.5 42 30" fill="none" stroke="#334155" stroke-width="2" stroke-linecap="round"/>
    `;
    mouthMarkup = `<circle cx="33" cy="36" r="1.8" fill="#fb7185"/>`;
  } else if (actionState === 'SHOWERING' || actionState === 'EATING') {
    eyesMarkup = `
      <path d="M24 30 Q26.5 27 29 30" fill="none" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M37 30 Q39.5 27 42 30" fill="none" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
    `;
    mouthMarkup = `<path d="M29.5 35 Q33 40 36.5 35 Z" fill="#fb7185" stroke="#881337" stroke-width="1.2"/>`;
  } else if (actionState === 'OVERBUDGET') {
    mouthMarkup = `<path d="M30 37.5 Q33 34.5 36 37.5" fill="none" stroke="#7c2d12" stroke-width="1.8" stroke-linecap="round"/>`;
  }

  // 직업별 머리 장식 / 안경 / 헤드셋 레이어
  let accMarkup = '';
  if (st.accessory === 'glasses' || st.accessory === 'goldglasses') {
    const gStroke = st.accessory === 'goldglasses' ? '#eab308' : '#1e293b';
    accMarkup = `
      <circle cx="26.5" cy="30" r="5" fill="rgba(255,255,255,0.25)" stroke="${gStroke}" stroke-width="1.8"/>
      <circle cx="39.5" cy="30" r="5" fill="rgba(255,255,255,0.25)" stroke="${gStroke}" stroke-width="1.8"/>
      <line x1="31.5" y1="30" x2="34.5" y2="30" stroke="${gStroke}" stroke-width="1.8"/>
    `;
  } else if (st.accessory === 'headset') {
    accMarkup = `
      <path d="M14 28 C14 10, 52 10, 52 28" fill="none" stroke="#ec4899" stroke-width="3.5"/>
      <rect x="11" y="23" width="6" height="12" rx="3" fill="#38bdf8" stroke="#1e293b" stroke-width="1.5"/>
      <rect x="49" y="23" width="6" height="12" rx="3" fill="#38bdf8" stroke="#1e293b" stroke-width="1.5"/>
    `;
  } else if (st.accessory === 'beret') {
    accMarkup = `
      <ellipse cx="34" cy="13" rx="16" ry="6.5" fill="#9333ea" stroke="#3b0764" stroke-width="1.8" transform="rotate(-8 34 13)"/>
      <line x1="33" y1="5" x2="35" y2="8" stroke="#3b0764" stroke-width="2" stroke-linecap="round"/>
    `;
  } else if (st.accessory === 'headband') {
    accMarkup = `<rect x="16" y="18" width="34" height="4.5" rx="2" fill="#ef4444" stroke="#7f1d1d" stroke-width="1.2"/>`;
  } else if (st.accessory === 'cap') {
    accMarkup = `
      <path d="M16 20 Q33 8 50 20 Z" fill="#10b981" stroke="#064e3b" stroke-width="1.8"/>
      <path d="M34 18 L55 21 L49 23 L32 20 Z" fill="#059669" stroke="#064e3b" stroke-width="1.2"/>
    `;
  } else if (st.accessory === 'catpin') {
    accMarkup = `
      <polygon points="18,16 21,8 26,14" fill="#fb923c" stroke="#7c2d12" stroke-width="1.5"/>
      <polygon points="40,14 45,8 48,16" fill="#fb923c" stroke="#7c2d12" stroke-width="1.5"/>
    `;
  }

  // 행동별 손에 쥔 소품 SVG (빗자루, 치킨, 편의점 봉투, 빨래바구니)
  let propMarkup = '';
  if (actionState === 'CLEANING') {
    propMarkup = `
      <g transform="translate(45, 36) rotate(18)">
        <line x1="4" y1="0" x2="4" y2="26" stroke="#92400e" stroke-width="3" stroke-linecap="round"/>
        <path d="M-2 24 L10 24 L13 34 L-5 34 Z" fill="#facc15" stroke="#854d0e" stroke-width="1.6"/>
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
      <g transform="translate(46, 46)">
        <rect x="0" y="3" width="12" height="14" rx="2.5" fill="#fef08a" stroke="#ca8a04" stroke-width="1.5"/>
        <path d="M3 3 Q6 -2 9 3" fill="none" stroke="#ca8a04" stroke-width="1.5"/>
      </g>
    `;
  } else if (actionState === 'LAUNDRY') {
    propMarkup = `
      <g transform="translate(43, 46)">
        <rect x="0" y="2" width="15" height="12" rx="3" fill="#38bdf8" stroke="#0369a1" stroke-width="1.5"/>
        <circle cx="5" cy="1" r="3" fill="#ffffff"/>
        <circle cx="10" cy="1" r="3" fill="#fde047"/>
      </g>
    `;
  }

  return `
    <svg width="66" height="78" viewBox="0 0 66 78" overflow="visible">
      <defs>
        <radialGradient id="${skinId}" cx="38%" cy="32%" r="68%">
          <stop offset="0%" stop-color="#fff1e6"/>
          <stop offset="70%" stop-color="#fed7aa"/>
          <stop offset="100%" stop-color="#fdba74"/>
        </radialGradient>
        <linearGradient id="${outfitId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${outfitColor}"/>
          <stop offset="100%" stop-color="#1e293b"/>
        </linearGradient>
      </defs>

      <!-- 뒷머리 볼륨 -->
      <ellipse cx="33" cy="26" rx="20" ry="18" fill="${hairColor}"/>

      <!-- 짧은 2등신 다리 & 신발 -->
      <rect x="24" y="61" width="7" height="11" rx="3.5" fill="#334155"/>
      <rect x="35" y="61" width="7" height="11" rx="3.5" fill="#334155"/>
      <ellipse cx="27" cy="72" rx="5" ry="2.8" fill="#0f172a"/>
      <ellipse cx="39" cy="72" rx="5" ry="2.8" fill="#0f172a"/>

      <!-- 통통한 피규어 몸통 & 의상 -->
      <path d="M20 44 Q33 40 46 44 L48 61 Q33 65 18 61 Z" fill="${outfitColor}" stroke="#1e293b" stroke-width="2.2"/>
      <!-- 칼라/넥타이 포인트 -->
      <polygon points="28,43 33,50 38,43" fill="${outfitSub}"/>
      ${st.accessory === 'tie' ? `<polygon points="32,46 34,46 35,57 33,59 31,57" fill="#ef4444"/>` : ''}

      <!-- 양팔 -->
      <ellipse cx="17" cy="51" rx="4.5" ry="7.5" fill="${outfitColor}" stroke="#1e293b" stroke-width="2" transform="rotate(16 17 51)"/>
      <ellipse cx="49" cy="51" rx="4.5" ry="7.5" fill="${outfitColor}" stroke="#1e293b" stroke-width="2" transform="rotate(-16 49 51)"/>
      <circle cx="15" cy="57" r="3.4" fill="url(#${skinId})" stroke="#9a3412" stroke-width="1.2"/>
      <circle cx="51" cy="57" r="3.4" fill="url(#${skinId})" stroke="#9a3412" stroke-width="1.2"/>

      <!-- 귀 -->
      <circle cx="14.5" cy="30" r="4" fill="url(#${skinId})" stroke="#9a3412" stroke-width="1.5"/>
      <circle cx="51.5" cy="30" r="4" fill="url(#${skinId})" stroke="#9a3412" stroke-width="1.5"/>

      <!-- 볼살 통통 큰 얼굴 -->
      <ellipse cx="33" cy="29" rx="18.5" ry="16.5" fill="url(#${skinId})" stroke="#7c2d12" stroke-width="2.2"/>

      <!-- 발그레 볼터치 -->
      <ellipse cx="21" cy="33.5" rx="4.2" ry="2.4" fill="#fb7185" opacity="0.55"/>
      <ellipse cx="45" cy="33.5" rx="4.2" ry="2.4" fill="#fb7185" opacity="0.55"/>

      <!-- 눈 & 입 -->
      ${eyesMarkup}
      ${mouthMarkup}

      <!-- 앞머리 & 3D 하이라이트 -->
      <path d="M14.5 26 C15 11, 51 11, 51.5 26 C46 19, 39 22, 33 19 C26 22, 20 19, 14.5 26 Z" fill="${hairColor}" stroke="#0f172a" stroke-width="1.6"/>
      <ellipse cx="27" cy="16" rx="6" ry="2" fill="rgba(255,255,255,0.28)" transform="rotate(-12 27 16)"/>

      <!-- 액세서리 & 들고 있는 소품 -->
      ${accMarkup}
      ${propMarkup}
    </svg>
  `;
}

// =========================================================
// 5. 미니미 세입자 '현실 디테일 일상 루틴 AI' (관찰 카메라 상태 머신)
// =========================================================
function syncActorsWithTenants() {
  // 퇴거된 방 액터 제거
  for (const rId of Object.keys(minimiActors)) {
    const rm = getRoomById(rId);
    if (!rm || !rm.tenant) {
      if (minimiActors[rId].el) minimiActors[rId].el.remove();
      delete minimiActors[rId];
    }
  }

  // 입주 중인 방 액터 생성/동기화
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
    cleanStep: 0,
    doorOpen: false,
    speechTimer: 0,
    lastActionStateRendered: ''
  };

  minimiActors[room.id] = actor;
  updateActorVisual(actor, room.tenant, true);
  positionActorDOM(actor);

  // 입주 첫날 즉시 방 청소 루틴 시작!
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

// 시간대 및 욕구, 설치 가구 기반 다음 일상 행동 결정
function pickNextRoutine(actor, room) {
  const tenant = room.tenant;
  if (!tenant) return;

  const hour = Math.floor(state.gameMinutes / 60) % 24;
  const f = room.furniture;
  const marketRent = calcRoomMarketRent(room);

  // 1) 월세가 예산을 초과하면 가끔 한숨/불평 대사 표시
  if (marketRent > tenant.maxBudget && Math.random() < 0.34) {
    const job = getJobData(tenant.jobId);
    actor.waypoints = [{ x: room.x + ROOM_LOCAL_SPOTS.center.x, y: room.y + ROOM_LOCAL_SPOTS.center.y }];
    actor.state = 'IDLE';
    actor.atTarget = false;
    actor.stateTimer = 4.5;
    showActorSpeech(actor, pickRandom(job.quotes.overbudget), 4.2);
    updateActorVisual(actor, tenant, true);
    return;
  }

  // 2) 방에 먼지가 쌓이면 [청소하기]
  if (room.dust >= 58) {
    startRoutine(actor, room, 'CLEANING', false);
    return;
  }

  // 3) 심야 시간(23시~05시)이거나 피로 누적 시 [수면 & 휴식]
  if ((hour >= 23 || hour < 6) || tenant.needs.energy < 26) {
    startRoutine(actor, room, 'SLEEPING', false);
    return;
  }

  // 4) 청결 욕구가 낮을 때 [화장실 & 샤워하기]
  if (tenant.needs.cleanliness < 45) {
    startRoutine(actor, room, 'SHOWERING', false);
    return;
  }

  // 5) 배고픔 욕구가 낮거나 저녁/야식 시간대 [요리 & 야식 배달 먹기]
  if (tenant.needs.hunger < 45 || ((hour >= 18 && hour <= 22) && Math.random() < 0.42)) {
    startRoutine(actor, room, 'EATING', false);
    return;
  }

  // 6) 외출하여 1층 단지 내 상가(24시 편의점 / 코인세탁소) 이용! (약 28% 확률)
  if (hour >= 7 && hour <= 22 && Math.random() < 0.28) {
    const outingType = Math.random() < 0.55 ? 'SHOPPING' : 'LAUNDRY';
    startOutingRoutine(actor, room, outingType);
    return;
  }

  // 7) 기본 주간 일과: 책상 재택근무/공부/게임 (또는 샤워/청소 순환)
  const roll = Math.random();
  if (roll < 0.55) {
    startRoutine(actor, room, 'WORKING', false);
  } else if (roll < 0.78 && f.shower >= 1) {
    startRoutine(actor, room, 'SHOWERING', false);
  } else if (roll < 0.92) {
    startRoutine(actor, room, 'EATING', false);
  } else {
    startRoutine(actor, room, 'CLEANING', false);
  }
}

function startRoutine(actor, room, routineName, isMoveInClean = false) {
  const tenant = room.tenant;
  const job = getJobData(tenant.jobId);
  actor.state = routineName;
  actor.atTarget = false;
  actor.particleTimer = 0.2;

  // 이전 방 조명/샤워 유리 클래스 갱신
  updateSingleRoomDOM(room.id);

  if (routineName === 'CLEANING') {
    const sp = ROOM_LOCAL_SPOTS.cleanSpots;
    actor.waypoints = [
      { x: room.x + sp[0].x, y: room.y + sp[0].y },
      { x: room.x + sp[1].x, y: room.y + sp[1].y },
      { x: room.x + sp[2].x, y: room.y + sp[2].y }
    ];
    actor.stateTimer = 6.5;
    showActorSpeech(
      actor,
      isMoveInClean ? '입주 첫날 대청소 시작! 에구 허리야~ 깨끗해졌다! ✨' : pickRandom(job.quotes.cleaning),
      5.2
    );
  } else if (routineName === 'SHOWERING') {
    if (room.furniture.shower >= 1) {
      actor.waypoints = [{ x: room.x + ROOM_LOCAL_SPOTS.shower.x, y: room.y + ROOM_LOCAL_SPOTS.shower.y }];
      actor.stateTimer = 6.5;
    } else {
      actor.waypoints = [{ x: room.x + 265, y: room.y + 135 }];
      actor.stateTimer = 4.0;
      showActorSpeech(actor, '온수 샤워부스가 없어서 찬물 고양이 세수만.. 😿', 4.0);
    }
  } else if (routineName === 'EATING') {
    // 주방 싱크대로 먼저 가서 요리 후 책상/중앙에서 먹기
    actor.waypoints = [
      { x: room.x + ROOM_LOCAL_SPOTS.kitchen.x, y: room.y + ROOM_LOCAL_SPOTS.kitchen.y },
      { x: room.x + ROOM_LOCAL_SPOTS.desk.x - 14, y: room.y + ROOM_LOCAL_SPOTS.desk.y + 6 }
    ];
    actor.stateTimer = 6.5;
  } else if (routineName === 'WORKING') {
    actor.waypoints = [{ x: room.x + ROOM_LOCAL_SPOTS.desk.x, y: room.y + ROOM_LOCAL_SPOTS.desk.y }];
    actor.stateTimer = 7.0;
  } else if (routineName === 'SLEEPING') {
    actor.waypoints = [{ x: room.x + ROOM_LOCAL_SPOTS.bed.x, y: room.y + ROOM_LOCAL_SPOTS.bed.y }];
    actor.stateTimer = 8.0;
  }

  updateActorVisual(actor, tenant, true);
}

// 외출 루틴: 방문 열고 -> 복도 -> 계단실 -> 1층 상가(편의점/세탁소) -> 수익 창출 -> 귀가!
function startOutingRoutine(actor, room, outingType) {
  const shop = outingType === 'SHOPPING' ? state.shops.store : state.shops.laundry;
  const spot = pickRandom(shop.spots);
  const doorWorldX = room.x + ROOM_LOCAL_SPOTS.door.x;
  const doorWorldY = room.y + ROOM_LOCAL_SPOTS.door.y;

  actor.state = outingType;
  actor.atTarget = false;
  actor.outingPhase = 'GOING'; // GOING -> AT_SHOP -> RETURNING
  actor.targetShopId = shop.id;

  actor.waypoints = [
    { x: doorWorldX, y: doorWorldY, onArrive: () => setRoomDoor(room.id, true) },
    { x: doorWorldX, y: room.corridorY, onArrive: () => setRoomDoor(room.id, false) },
    { x: WORLD_CONFIG.stairX, y: room.corridorY },
    { x: WORLD_CONFIG.stairX, y: WORLD_CONFIG.plazaY },
    { x: shop.doorX, y: WORLD_CONFIG.plazaY },
    { x: spot.x, y: spot.y }
  ];
  actor.stateTimer = 4.6;
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
  actor.stateTimer = 1.2;
}

function setRoomDoor(roomId, open) {
  const actor = minimiActors[roomId];
  if (!actor) return;
  actor.doorOpen = open;
  const el = document.getElementById(`room-dom-${roomId}`);
  if (el) el.classList.toggle('door-open', open);
}

// 매 프레임 미니미 보행 및 상태 이펙트 업데이트
function tickMinimiActors(dt) {
  const walkSpeed = 148; // px / sec

  for (const room of state.rooms) {
    if (!room.unlocked || !room.tenant) continue;
    const actor = minimiActors[room.id];
    if (!actor) continue;

    // 먼지 서서히 증가 및 기본 욕구 자연 감소
    room.dust = Math.min(100, room.dust + dt * 0.9);
    room.tenant.needs.hunger = Math.max(5, room.tenant.needs.hunger - dt * 0.75);
    room.tenant.needs.cleanliness = Math.max(5, room.tenant.needs.cleanliness - dt * 0.65);
    room.tenant.needs.energy = Math.max(5, room.tenant.needs.energy - dt * 0.55);

    // 말풍선 타이머
    if (actor.speechTimer > 0) {
      actor.speechTimer -= dt;
      if (actor.speechTimer <= 0) {
        actor.speechEl.classList.add('hidden');
      }
    }

    // 1) 이동 중일 때 Waypoint 추적
    if (actor.waypoints.length > 0) {
      const wp = actor.waypoints[0];
      const dx = wp.x - actor.wx;
      const dy = wp.y - actor.wy;
      const dist = Math.hypot(dx, dy);

      actor.el.classList.add('is-walking');
      actor.el.classList.remove('is-cleaning', 'is-working', 'is-sleeping');

      // 청소 중일 때는 이동하면서도 먼지/반짝이 파티클 퐁퐁!
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

    // 2) 목적지 도착 후 행동 수행 중
    actor.el.classList.remove('is-walking');
    actor.stateTimer -= dt;
    actor.particleTimer -= dt;

    if (actor.state === 'CLEANING') {
      actor.el.classList.add('is-cleaning');
      if (actor.particleTimer <= 0) {
        actor.particleTimer = 0.7;
        spawnParticle(actor.wx + (Math.random() * 24 - 12), actor.wy - 18, '✨', 'pt-sparkle');
        spawnParticle(actor.wx + (Math.random() * 20 - 10), actor.wy - 6, '💨', 'pt-dust');
      }
    } else if (actor.state === 'SHOWERING' && room.furniture.shower >= 1) {
      if (actor.particleTimer <= 0) {
        actor.particleTimer = 0.65;
        spawnParticle(room.x + 316 + Math.random() * 22, room.y + 42, '💧', 'pt-water');
        spawnParticle(room.x + 308 + Math.random() * 26, room.y + 32, '♨️', 'pt-steam');
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

    // 행동 완료 시 욕구 회복 및 다음 루틴 전환
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
    showActorSpeech(actor, pickRandom(job.quotes.shower), 5.0);
  } else if (actor.state === 'EATING') {
    showActorSpeech(actor, pickRandom(job.quotes.eating), 5.0);
  } else if (actor.state === 'WORKING') {
    showActorSpeech(actor, pickRandom(job.quotes.working), 5.2);
  } else if (actor.state === 'SLEEPING') {
    updateSingleRoomDOM(room.id);
    showActorSpeech(actor, pickRandom(job.quotes.sleeping), 4.8);
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
    if (room.furniture.shower >= 1) {
      tenant.needs.cleanliness = 100;
      tenant.happiness = Math.min(100, tenant.happiness + 6);
    } else {
      tenant.needs.cleanliness = Math.min(100, tenant.needs.cleanliness + 25);
    }
  } else if (actor.state === 'EATING') {
    tenant.needs.hunger = 100;
    tenant.happiness = Math.min(100, tenant.happiness + 7);
  } else if (actor.state === 'WORKING') {
    tenant.needs.energy = Math.max(10, tenant.needs.energy - 10);
  } else if (actor.state === 'SLEEPING') {
    tenant.needs.energy = 100;
    tenant.happiness = Math.min(100, tenant.happiness + 4);
  } else if (actor.state === 'SHOPPING' || actor.state === 'LAUNDRY') {
    if (actor.outingPhase === 'AT_SHOP') {
      // 상가 이용 완료! 건물주에게 즉시 보너스 상가 수익 지급!
      const shop = state.shops[actor.targetShopId];
      const profit = shop.levels[shop.level].visitProfit;
      addGold(profit);
      state.stats.shopVisits += 1;
      tenant.happiness = Math.min(100, tenant.happiness + 6);
      spawnParticle(actor.wx, actor.wy - 52, `💰 +${profit}만`, 'pt-coin');
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

// 파티클 생성기
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
// 6. 호실 인테리어 리모델링 & 세입자 모집 / 강제 퇴거 시스템
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

  dom.panelRoomTitle.textContent = `🏠 ${room.name}`;
  dom.panelGradeBadge.textContent = gradeInfo.name;
  dom.panelGradeBadge.className = `font-jua text-xs px-2.5 py-0.5 rounded-full border ${gradeInfo.badgeClass}`;
  dom.panelRentBadge.textContent = room.unlocked ? `적정 월세 ${marketRent}만원` : '미개방 호실';

  // 1) 미개방 호실인 경우 분양 오픈 화면
  if (!room.unlocked) {
    dom.panelBody.innerHTML = `
      <div class="bg-slate-50 border-2 border-slate-200 rounded-2xl p-5 text-center">
        <div class="text-3xl mb-2">🔑✨</div>
        <div class="font-jua text-lg text-slate-900">${room.name} 원룸을 새로 오픈할까요?</div>
        <p class="text-xs text-slate-600 mt-1">호실을 개방하면 인테리어 리모델링 후 새로운 세입자에게 매달 월세를 받을 수 있습니다!</p>
        <button id="btn-unlock-room" class="mt-4 font-jua text-base bg-amber-400 hover:bg-amber-300 text-amber-950 px-6 py-2.5 rounded-2xl border-2 border-amber-900 shadow active:scale-95 transition">
          🔓 ${room.name} 분양 오픈하기 (💰 ${room.unlockCost}만원)
        </button>
      </div>
    `;
    document.getElementById('btn-unlock-room').onclick = () => unlockRoom(room.id);
    return;
  }

  // 2) 세입자 상태 카드 (공실 vs 입주 중)
  let tenantSectionHTML = '';
  if (!room.tenant) {
    tenantSectionHTML = `
      <div class="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-white border-2 border-amber-400 flex items-center justify-center text-2xl shrink-0">📢</div>
          <div>
            <div class="font-jua text-sm sm:text-base text-slate-900">현재 공실입니다! 새 세입자를 들여보세요</div>
            <div class="text-xs text-slate-600">방 인테리어가 좋을수록 지불 예산이 높은 상위 직업군 세입자가 지원합니다.</div>
          </div>
        </div>
        <button id="btn-open-recruit" class="w-full sm:w-auto shrink-0 font-jua text-sm bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2.5 rounded-2xl border-2 border-emerald-900 shadow active:scale-95 transition">
          📱 세입자 구하기 (부동산 앱)
        </button>
      </div>
    `;
  } else {
    const t = room.tenant;
    const job = getJobData(t.jobId);
    const isOverBudget = marketRent > t.maxBudget;
    const effectiveRent = getEffectiveRoomRent(room);
    const stateLabelMap = {
      IDLE: '🏠 방에서 쉬는 중',
      CLEANING: '🧹 열심히 방 청소 중',
      SHOWERING: '🚿 화장실 온수 샤워 중',
      EATING: '🍗 요리 & 야식 먹는 중',
      WORKING: '💻 책상 집중 작업 중',
      SLEEPING: '💤 침대에서 꿀잠 중',
      SHOPPING: '🏪 1층 편의점 외출 중',
      LAUNDRY: '🧺 1층 코인세탁소 이용 중'
    };
    const actor = minimiActors[room.id];
    const statusText = actor ? (stateLabelMap[actor.state] || '🏠 생활 중') : '🏠 생활 중';

    tenantSectionHTML = `
      <div class="${isOverBudget ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200'} border-2 rounded-2xl p-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-3">
            <div class="w-13 h-14 rounded-2xl bg-white border-2 border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
              <div class="scale-[0.72] origin-center translate-y-1">${buildMinimiSVG(t, isOverBudget ? 'OVERBUDGET' : 'IDLE', `panel_${room.id}`)}</div>
            </div>
            <div>
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-jua text-base text-slate-900">${t.name}</span>
                <span class="font-jua text-[11px] text-white px-2 py-0.5 rounded-full" style="background:${job.badgeColor}">${job.jobName}</span>
                <span class="text-[11px] bg-white border border-slate-300 text-slate-700 px-2 py-0.5 rounded-full">${t.personality}</span>
              </div>
              <div class="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span class="font-medium text-sky-700">${statusText}</span>
                <span>💖 행복도 <b>${Math.round(t.happiness)}%</b></span>
                <span>💳 예산 한도 <b>최대 ${t.maxBudget}만원</b></span>
                <span class="text-emerald-700 font-bold">실수령 월세 ${effectiveRent}만원</span>
              </div>
            </div>
          </div>

          <button id="btn-evict-tenant" class="font-jua text-xs sm:text-sm bg-rose-500 hover:bg-rose-400 text-white px-3.5 py-2 rounded-xl border-2 border-rose-900 shadow active:scale-95 transition">
            ⚡ 계약 해지 / 내쫓기
          </button>
        </div>

        ${isOverBudget ? `
          <div class="mt-2 bg-rose-100 border border-rose-300 text-rose-900 rounded-xl px-3 py-1.5 text-xs font-medium flex items-center justify-between gap-2">
            <span>⚠️ 호실 적정 월세(${marketRent}만)가 현재 세입자의 예산 한도(${t.maxBudget}만)를 넘었습니다! 내쫓고 상위 직업군과 재계약하면 월세를 모두 받을 수 있어요!</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  // 3) 6종 인테리어 리모델링 업그레이드 그리드
  const furnitureCardsHTML = Object.keys(FURNITURE_TREE).map((key) => {
    const item = FURNITURE_TREE[key];
    const curLv = room.furniture[key] || 0;
    const curData = item.levels[curLv];
    const nextData = item.levels[curLv + 1];
    const stars = [1, 2, 3].map((i) => (i <= curLv ? '⭐' : '☆')).join('');

    return `
      <div class="bg-white border-2 ${curLv >= 3 ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200'} rounded-2xl p-2.5 flex flex-col justify-between gap-2 shadow-sm">
        <div>
          <div class="flex items-center justify-between">
            <span class="font-jua text-sm text-slate-900">${item.icon} ${item.label}</span>
            <span class="text-xs font-jua text-amber-600">${stars}</span>
          </div>
          <div class="text-[11px] font-bold text-slate-700 mt-0.5">[${curData.tier}] ${curData.name}</div>
          <div class="text-[11px] text-slate-500 leading-snug mt-0.5">${nextData ? `다음: ${nextData.name} (월세 +${nextData.rentBonus - curData.rentBonus}만)` : '✨ 최고급 호텔 풀옵션 달성!'}</div>
        </div>

        ${nextData ? `
          <button data-upgrade-key="${key}" class="btn-upgrade-furn w-full font-jua text-xs py-1.5 px-2.5 rounded-xl border-2 transition active:scale-95 ${
            state.gold >= nextData.cost
              ? 'bg-amber-400 hover:bg-amber-300 text-amber-950 border-amber-900 shadow-sm'
              : 'bg-slate-200 text-slate-500 border-slate-300'
          }">
            ⬆️ Lv.${curLv + 1} 업그레이드 (💰${nextData.cost}만)
          </button>
        ` : `
          <div class="w-full text-center font-jua text-xs py-1.5 rounded-xl bg-amber-100 text-amber-800 border border-amber-300">
            👑 MAX 풀옵션 완료
          </div>
        `}
      </div>
    `;
  }).join('');

  dom.panelBody.innerHTML = `
    ${tenantSectionHTML}
    <div>
      <div class="font-jua text-xs text-slate-500 mb-1.5 px-1">🛠️ 호실 인테리어 리모델링 & 가구 배치 (업그레이드 시 월세 즉시 상승!)</div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        ${furnitureCardsHTML}
      </div>
    </div>
  `;

  // 이벤트 바인딩
  const recruitBtn = document.getElementById('btn-open-recruit');
  if (recruitBtn) {
    recruitBtn.onclick = () => openRecruitModal(room.id);
  }
  const evictBtn = document.getElementById('btn-evict-tenant');
  if (evictBtn) {
    evictBtn.onclick = () => evictTenant(room.id);
  }
  dom.panelBody.querySelectorAll('.btn-upgrade-furn').forEach((btn) => {
    btn.onclick = () => upgradeFurniture(room.id, btn.dataset.upgradeKey);
  });
}

// 1층 단지 내 상가 관리 패널
function openShopPanel(shop) {
  dom.bottomPanel.classList.remove('translate-y-full');
  const curLv = shop.level;
  const curInfo = shop.levels[curLv];
  const nextInfo = shop.levels[curLv + 1];

  dom.panelRoomTitle.textContent = `${shop.icon} ${shop.name}`;
  dom.panelGradeBadge.textContent = `상가 Lv.${curLv}`;
  dom.panelGradeBadge.className = 'font-jua text-xs px-2.5 py-0.5 rounded-full border bg-sky-100 text-sky-900 border-sky-300';
  dom.panelRentBadge.textContent = `세입자 방문당 +${curInfo.visitProfit}만원`;

  dom.panelBody.innerHTML = `
    <div class="bg-sky-50 border-2 border-sky-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <div class="font-jua text-base text-slate-900">[Lv.${curLv}] ${curInfo.title}</div>
        <p class="text-xs text-slate-600 mt-1">${curInfo.desc}</p>
        <p class="text-xs text-emerald-700 font-bold mt-1.5">💡 세입자 미니미들이 외출할 때마다 직접 걸어 내려와 상가를 이용하며 보너스 수익을 안겨줍니다! (누적 방문 ${state.stats.shopVisits}회)</p>
      </div>
      ${nextInfo ? `
        <button id="btn-upgrade-shop" class="w-full sm:w-auto shrink-0 font-jua text-sm px-5 py-3 rounded-2xl border-2 transition active:scale-95 ${
          state.gold >= nextInfo.upgradeCost
            ? 'bg-amber-400 hover:bg-amber-300 text-amber-950 border-amber-900 shadow'
            : 'bg-slate-200 text-slate-500 border-slate-300'
        }">
          ⬆️ Lv.${curLv + 1} 상가 확장 (💰${nextInfo.upgradeCost}만원)<br/>
          <span class="text-[11px]">방문 수익 +${curInfo.visitProfit}만 ➔ +${nextInfo.visitProfit}만</span>
        </button>
      ` : `
        <div class="font-jua text-sm bg-amber-100 text-amber-900 border-2 border-amber-400 px-4 py-2.5 rounded-2xl">
          👑 최고 등급 플래그십 상가 완성!
        </div>
      `}
    </div>
  `;

  const upBtn = document.getElementById('btn-upgrade-shop');
  if (upBtn && nextInfo) {
    upBtn.onclick = () => {
      if (state.gold < nextInfo.upgradeCost) {
        showToast(`💸 자금이 부족합니다! (${nextInfo.upgradeCost}만원 필요)`, 'rose');
        return;
      }
      addGold(-nextInfo.upgradeCost);
      shop.level += 1;
      updateSingleShopDOM(shop.id);
      spawnParticle(shop.x + shop.w / 2, shop.y + 80, '🎉 상가 업그레이드!', 'pt-coin');
      showToast(`${shop.icon} ${shop.name} Lv.${shop.level} 확장 완료!`, 'emerald');
      openShopPanel(shop);
      updateQuestUI();
      saveGameState();
    };
  }
}

function unlockRoom(roomId) {
  const room = getRoomById(roomId);
  if (!room || room.unlocked) return;
  if (state.gold < room.unlockCost) {
    showToast(`💸 분양 자금이 부족합니다! (${room.unlockCost}만원 필요)`, 'rose');
    return;
  }
  addGold(-room.unlockCost);
  room.unlocked = true;
  updateSingleRoomDOM(room.id);
  spawnParticle(room.x + 190, room.y + 120, `🎊 ${room.name} 오픈!`, 'pt-coin');
  showToast(`🎉 ${room.name} 원룸이 개방되었습니다! 도배 후 세입자를 받아보세요.`, 'emerald');
  renderRoomPanelBody(room);
  updateHudUI();
  updateQuestUI();
  saveGameState();
}

function upgradeFurniture(roomId, key) {
  const room = getRoomById(roomId);
  const tree = FURNITURE_TREE[key];
  if (!room || !tree) return;

  const curLv = room.furniture[key] || 0;
  const nextData = tree.levels[curLv + 1];
  if (!nextData) return;

  if (state.gold < nextData.cost) {
    showToast(`💸 업그레이드 비용(${nextData.cost}만원)이 부족합니다!`, 'rose');
    return;
  }

  addGold(-nextData.cost);
  room.furniture[key] = curLv + 1;

  // 입주 중인 세입자가 있으면 행복도 상승 & 샤워부스 첫 설치 시 즉시 샤워하러 감!
  if (room.tenant) {
    room.tenant.happiness = Math.min(100, room.tenant.happiness + 8);
    const actor = minimiActors[room.id];
    if (actor) {
      if (key === 'shower' && room.furniture.shower === 1) {
        startRoutine(actor, room, 'SHOWERING', false);
      } else {
        showActorSpeech(actor, `우와!! 새 ${tree.label} 너무 좋아요!! ✨`, 3.8);
      }
      updateActorVisual(actor, room.tenant, true);
    }
  }

  updateSingleRoomDOM(room.id, key);
  spawnParticle(room.x + 190, room.y + 135, '✨ 인테리어 UP!', 'pt-sparkle');
  showToast(`🛠️ ${room.name} [${tree.label}] Lv.${curLv + 1} 설치 완료! (적정 월세 ${calcRoomMarketRent(room)}만원)`, 'emerald');

  renderRoomPanelBody(room);
  updateHudUI();
  updateQuestUI();
  saveGameState();
}

// =========================================================
// 7. 세입자 구하기(전단지/부동산 앱) & 강제 퇴거(내쫓기)
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

  // 현재 호실 수준에 잘 맞는 직업군 2명 + 한 단계 상위/다양한 직업군 1명 구성
  const affordableJobs = TENANT_JOBS.filter((j) => j.maxBudget >= marketRent - 10);
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
    const personality = pickRandom(PERSONALITIES);
    return {
      tempId: `app_${Date.now()}_${idx}`,
      name: fullName,
      jobId: job.id,
      jobName: job.jobName,
      badgeColor: job.badgeColor,
      maxBudget: budget,
      wishText: job.wishText,
      requirements: job.requirements,
      personality,
      style: job.style
    };
  });
}

function renderRecruitCards(room) {
  const marketRent = calcRoomMarketRent(room);
  dom.recruitRoomBadge.textContent = room.name;
  dom.recruitRoomInfo.textContent = `현재 ${room.name} 적정 월세: ${marketRent}만원 · 지원자 예산과 희망 옵션을 확인하고 계약하세요!`;

  dom.recruitCardsGrid.innerHTML = currentApplicants.map((app, index) => {
    // 희망 가구 조건 충족 여부 체크
    const reqEntries = Object.entries(app.requirements || {});
    const reqBadges = reqEntries.map(([fKey, reqLv]) => {
      const ok = (room.furniture[fKey] || 0) >= reqLv;
      const label = FURNITURE_TREE[fKey].label;
      return `<span class="inline-block text-[11px] px-2 py-0.5 rounded-full border ${
        ok ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-amber-50 text-amber-800 border-amber-300'
      }">${ok ? '✅' : '⚠️'} ${label} Lv.${reqLv}+</span>`;
    }).join(' ');

    const budgetEnough = app.maxBudget >= marketRent;

    return `
      <div class="bg-white rounded-2xl border-2 border-slate-200 hover:border-emerald-500 p-3.5 flex flex-col justify-between shadow-sm transition">
        <div>
          <div class="flex items-center gap-3">
            <div class="w-14 h-16 rounded-2xl bg-slate-100 border-2 border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
              <div class="scale-[0.82] translate-y-1">${buildMinimiSVG(app, 'IDLE', app.tempId)}</div>
            </div>
            <div>
              <span class="font-jua text-[11px] text-white px-2 py-0.5 rounded-full" style="background:${app.badgeColor}">${app.jobName}</span>
              <div class="font-jua text-base text-slate-900 mt-0.5">${app.name}</div>
              <div class="text-[11px] text-slate-500">${app.personality}</div>
            </div>
          </div>

          <div class="mt-3 bg-slate-50 rounded-xl p-2.5 border border-slate-200 space-y-1">
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-600">최대 월세 예산</span>
              <span class="font-jua text-sm ${budgetEnough ? 'text-emerald-600' : 'text-rose-600'}">${app.maxBudget}만원/월</span>
            </div>
            <div class="text-[11px] text-slate-600 leading-snug pt-1 border-t border-slate-200">
              💬 "${app.wishText}"
            </div>
            <div class="flex flex-wrap gap-1 pt-1">
              ${reqBadges}
            </div>
          </div>
        </div>

        <button data-app-idx="${index}" class="btn-sign-contract mt-3 w-full font-jua text-sm bg-emerald-500 hover:bg-emerald-400 text-white py-2.5 rounded-xl border-2 border-emerald-900 shadow active:scale-95 transition">
          ✍️ 입주 계약하기 (월 ${Math.min(marketRent, app.maxBudget)}만)
        </button>
      </div>
    `;
  }).join('');

  dom.recruitCardsGrid.querySelectorAll('.btn-sign-contract').forEach((btn) => {
    btn.onclick = () => {
      const idx = Number(btn.dataset.appIdx);
      signTenantContract(room.id, currentApplicants[idx]);
    };
  });
}

function signTenantContract(roomId, applicant) {
  const room = getRoomById(roomId);
  if (!room || !applicant) return;

  // 희망 옵션 충족도에 따라 초기 행복도 산정
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
    happiness: allMet ? 86 : 68,
    needs: {
      cleanliness: 65,
      hunger: 72,
      energy: 80
    }
  };
  room.dust = Math.max(room.dust, 65); // 입주 첫날 방 청소 연출 트리거!

  dom.recruitModal.classList.add('hidden');
  updateSingleRoomDOM(room.id);
  createActorForRoom(room, true);

  spawnParticle(room.x + 190, room.y + 120, '🎊 입주 계약 완료!', 'pt-coin');
  showToast(`🏡 ${room.name}에 [${applicant.jobName}] ${applicant.name}님이 입주했습니다!`, 'emerald');

  selectRoom(room.id, true);
  updateHudUI();
  updateQuestUI();
  saveGameState();
}

// 강제 퇴거 (계약 해지 / 내쫓기)
function evictTenant(roomId) {
  const room = getRoomById(roomId);
  if (!room || !room.tenant) return;

  const evictedTenant = room.tenant;
  room.tenant = null;
  state.stats.evictions += 1;

  // 기존 미니미 액터 제거 후 보따리 싸서 복도로 걸어 나가는 연출!
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

  showToast(`⚡ ${room.name} ${evictedTenant.name}(${evictedTenant.jobName})님을 퇴거시켰습니다. 상위 세입자를 모집해보세요!`, 'amber');
}

function playEvictionWalkOutAnimation(room, evictedTenant) {
  const tempEl = document.createElement('div');
  tempEl.className = 'minimi-entity is-walking';
  tempEl.style.left = `${room.x + 190}px`;
  tempEl.style.top = `${room.corridorY}px`;
  tempEl.innerHTML = `
    <div class="minimi-shadow"></div>
    <div class="minimi-body-wrap">${buildMinimiSVG(evictedTenant, 'OVERBUDGET', 'evict')}</div>
    <div class="minimi-speech">짐 싸서 떠납니다.. 더 성공해서 올게요! 😭📦</div>
  `;
  dom.minimiLayer.appendChild(tempEl);

  tempEl.animate(
    [
      { left: `${room.x + 190}px`, opacity: 1 },
      { left: `${WORLD_CONFIG.stairX}px`, opacity: 1 },
      { left: `${WORLD_CONFIG.stairX + 40}px`, opacity: 0 }
    ],
    { duration: 3200, easing: 'linear', fill: 'forwards' }
  );
  setTimeout(() => tempEl.remove(), 3300);
}

// =========================================================
// 8. 메인 가이드 퀘스트 & 세입자 현실 민원 카톡 시스템
// =========================================================
function updateQuestUI() {
  if (state.questIndex >= MAIN_QUESTS.length) {
    dom.questStepTag.textContent = '👑 모든 초보 미션 마스터!';
    dom.questRewardTag.textContent = '달성 완료';
    dom.questTitle.textContent = '축하합니다! 진정한 갓물주로 등극하셨습니다!';
    dom.questDesc.textContent = '2층 모든 호실과 1층 상가를 최고급으로 확장하며 자유롭게 미니미들을 관찰해보세요.';
    dom.questHint.innerHTML = '<span>✨ 자유 플레이 모드 진행 중</span>';
    dom.questBtn.classList.remove('quest-ready-glow');
    return;
  }

  const q = MAIN_QUESTS[state.questIndex];
  const isComplete = q.check(state);

  dom.questStepTag.textContent = `📋 초보 갓물주 미션 ${state.questIndex + 1}/${MAIN_QUESTS.length}`;
  dom.questRewardTag.textContent = `🎁 +${q.reward}만원`;
  dom.questTitle.textContent = q.title;
  dom.questDesc.textContent = q.desc;

  if (isComplete) {
    dom.questBtn.classList.add('quest-ready-glow');
    dom.questHint.innerHTML = '<span class="text-emerald-700 font-bold">🎉 미션 성공! 터치하여 지원금 보상을 받으세요!</span>';
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
    // 보상 지급!
    addGold(q.reward);
    showToast(`🎁 미션 완료! 지원금 +${q.reward}만원을 받았습니다!`, 'emerald');
    const targetRoom = q.focusRoom ? getRoomById(q.focusRoom) : null;
    if (targetRoom) {
      spawnParticle(targetRoom.x + 190, targetRoom.y + 110, `🎁 +${q.reward}만원!`, 'pt-coin');
    }
    state.questIndex += 1;
    updateQuestUI();
    if (selection.type === 'room' && selection.id) {
      renderRoomPanelBody(getRoomById(selection.id));
    }
    saveGameState();
    return;
  }

  // 아직 완료 전이면 목표 호실/상가로 Smooth Focus 이동 + 관리 패널 오픈
  if (q.focusRoom) {
    selectRoom(q.focusRoom, true);
  } else if (q.focusShop) {
    selectShop(q.focusShop, true);
  }
}

// 세입자 현실 민원 카톡 발생
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
  dom.kakaoModalHeader.textContent = `${room.name} ${room.tenant.name}님과의 1:1 카톡`;
  dom.kakaoAvatarBox.innerHTML = `<div class="scale-[0.68] translate-y-1">${buildMinimiSVG(room.tenant, 'IDLE', 'kakao')}</div>`;
  dom.kakaoSenderName.textContent = `${room.name} ${room.tenant.name} · ${room.tenant.jobName}`;
  dom.kakaoMessageBubble.textContent = ev.message;

  dom.kakaoChoicesBox.innerHTML = ev.choices.map((ch, idx) => `
    <button data-choice-idx="${idx}" class="btn-kakao-choice w-full text-left bg-[#FEE500] hover:bg-[#fdd800] text-[#191919] font-jua text-xs sm:text-sm px-3.5 py-2.5 rounded-2xl border-2 border-[#3C1E1E] shadow transition active:scale-95">
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
    showToast(`💸 보유 자금(${choice.cost}만원)이 부족해 다른 답변을 선택해주세요!`, 'rose');
    return;
  }

  if (choice.cost > 0) addGold(-choice.cost);
  if (choice.bonusGold > 0) addGold(choice.bonusGold);

  if (room && room.tenant) {
    room.tenant.happiness = Math.max(10, Math.min(100, room.tenant.happiness + choice.happinessDelta));
    const actor = minimiActors[room.id];
    if (actor) {
      showActorSpeech(actor, choice.reply, 5.0);
    }
    if (choice.bonusGold > 0) {
      spawnParticle(room.x + 190, room.y + 115, `💖 보너스 +${choice.bonusGold}만`, 'pt-coin');
    }
    focusOnWorldPoint(room.x + 190, room.y + 140, Math.max(camera.scale, 1.05), selection.type !== null);
  }

  dom.kakaoModal.classList.add('hidden');
  dom.kakaoFloatingBtn.classList.add('hidden');
  activeKakaoEvent = null;
  kakaoCooldown = 38 + Math.random() * 20;

  showToast(`💬 ${choice.reply}`, choice.happinessDelta >= 0 ? 'emerald' : 'amber');
  if (selection.type === 'room' && room && selection.id === room.id) {
    renderRoomPanelBody(room);
  }
  saveGameState();
}

// =========================================================
// 9. 경제/월세 정산 & 시간 흐름 & 메인 루프
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
  updateHudUI();
}

function processMonthlyPayday() {
  let totalCollected = 0;
  for (const room of state.rooms) {
    const rent = getEffectiveRoomRent(room);
    if (rent > 0) {
      totalCollected += rent;
      spawnParticle(room.x + 190, room.y + 95, `💰 월세 +${rent}만`, 'pt-coin');
    }
  }
  if (totalCollected > 0) {
    state.stats.totalRentEarned += totalCollected;
    addGold(totalCollected);
    showToast(`🏦 정기 월세 입금일! 총 +${totalCollected.toLocaleString()}만원 입금!`, 'emerald');
  }
}

function updateHudUI() {
  dom.hudGold.textContent = state.gold.toLocaleString();
  dom.hudRentTotal.textContent = calcTotalActiveRent().toLocaleString();

  const unlockedCount = state.rooms.filter((r) => r.unlocked).length;
  const occupiedCount = state.rooms.filter((r) => r.unlocked && r.tenant).length;
  dom.hudOccupancy.textContent = `입주 ${occupiedCount}/${unlockedCount}실`;

  // 시간대 및 하늘 배경 업데이트
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
    periodIcon = '🌆';
    periodName = '저녁';
    skyClass = 'time-evening';
  } else {
    periodIcon = '🌙';
    periodName = '심야';
    skyClass = 'time-night';
  }

  dom.hudTimeBadge.textContent = `${periodIcon} ${state.day}일차 · ${periodName} ${hh}:${mm}`;
  if (!dom.world.classList.contains(skyClass)) {
    dom.world.classList.remove('time-morning', 'time-afternoon', 'time-evening', 'time-night');
    dom.world.classList.add(skyClass);
  }

  const remainSec = Math.max(1, Math.ceil(PAYDAY_INTERVAL_SEC - state.paydayTimer));
  const pct = Math.min(100, (state.paydayTimer / PAYDAY_INTERVAL_SEC) * 100);
  dom.hudPaydaySec.textContent = `입금 D-${remainSec}s`;
  dom.hudPaydayBar.style.width = `${pct.toFixed(1)}%`;
}

function showToast(msg, color = 'amber') {
  const palette = {
    emerald: 'bg-emerald-600 text-white border-emerald-900',
    amber: 'bg-amber-400 text-amber-950 border-amber-900',
    rose: 'bg-rose-600 text-white border-rose-950'
  };
  const el = document.createElement('div');
  el.className = `font-jua text-xs sm:text-sm px-4 py-2 rounded-full border-2 shadow-xl transition-all duration-300 ${palette[color] || palette.amber}`;
  el.textContent = msg;
  dom.toastContainer.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-8px)';
    setTimeout(() => el.remove(), 300);
  }, 2600);
}

// 메인 애니메이션 & 시뮬레이션 루프 + 3초 주기 자동저장
function startMainLoops() {
  let lastTime = performance.now();

  function frame(now) {
    const dt = Math.min(0.08, (now - lastTime) / 1000);
    lastTime = now;

    // 1) 카메라 Smooth Focus 보간 이동
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

    // 2) 게임 내 시간 흐름 (실제 1초 = 게임 16분 -> 하루 90초 주기)
    state.gameMinutes += dt * 16;
    if (state.gameMinutes >= 24 * 60) {
      state.gameMinutes -= 24 * 60;
      state.day += 1;
    }

    // 3) 월세 정기 정산 타이머
    state.paydayTimer += dt;
    if (state.paydayTimer >= PAYDAY_INTERVAL_SEC) {
      state.paydayTimer = 0;
      processMonthlyPayday();
    }

    // 4) 현실 민원 카톡 타이머
    if (!activeKakaoEvent) {
      kakaoCooldown -= dt;
      if (kakaoCooldown <= 0) {
        kakaoCooldown = 36 + Math.random() * 18;
        triggerRandomKakaoComplaint();
      }
    }

    // 5) 미니미 세입자 일상 AI 이동 & 이펙트
    tickMinimiActors(dt);
    updateHudUI();

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  // 3초 주기 LocalStorage 자동 저장
  setInterval(() => {
    saveGameState();
    updateQuestUI();
  }, 3000);
}
