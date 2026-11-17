// =========================================================
// 【갓물주 라이프 3D: 미니미 타운 & 하우스】 데이터 모듈 (data.js)
// Dual-Scale 타운 필지(Lots), 신축 건물 4종, 시너지 버프, 3D 호실 가구, 입주민, 퀘스트
// =========================================================

const TOWN_CONFIG = {
  synergyRadius: 26.0,
  roomWidth: 5.2,
  roomDepth: 4.4,
  wallHeight: 2.5
};

// 타운 내 7개 필지(Lots) 배치 좌표 (1호점은 기본 보유, 2~7호 필지는 나무 울타리 + 3D 매입 입간판 배치)
const INITIAL_LOTS = [
  {
    lotId: 'lot_1',
    lotName: '중앙 1번지',
    x: 0,
    z: -9.2,
    landPrice: 0,
    owned: true,
    buildingType: 'mixed_villa',
    customTitle: '미니미 하우스 1호점'
  },
  {
    lotId: 'lot_2',
    lotName: '서쪽 햇살 2번지',
    x: -17.2,
    z: -9.2,
    landPrice: 500, // 첫 확장 체감을 위한 500만원 알짜 필지
    owned: false,
    buildingType: null,
    customTitle: null
  },
  {
    lotId: 'lot_3',
    lotName: '동쪽 공원길 3번지',
    x: 17.2,
    z: -9.2,
    landPrice: 1200,
    owned: false,
    buildingType: null,
    customTitle: null
  },
  {
    lotId: 'lot_4',
    lotName: '메인대로 4번지',
    x: 0,
    z: 12.2,
    landPrice: 2500,
    owned: false,
    buildingType: null,
    customTitle: null
  },
  {
    lotId: 'lot_5',
    lotName: '남서 코너 5번지',
    x: -17.2,
    z: 12.2,
    landPrice: 3500,
    owned: false,
    buildingType: null,
    customTitle: null
  },
  {
    lotId: 'lot_6',
    lotName: '황금 역세권 6번지',
    x: 17.2,
    z: 12.2,
    landPrice: 5000, // [땅 매입 가능 · 5,000만 원] 랜드마크 필지!
    owned: false,
    buildingType: null,
    customTitle: null
  },
  {
    lotId: 'lot_7',
    lotName: '로얄 스카이 7번지',
    x: 0,
    z: -22.2,
    landPrice: 8000,
    owned: false,
    buildingType: null,
    customTitle: null
  }
];

// 빈 땅 매입 후 선택 가능한 4종 신축 건물 카탈로그
const BUILDING_CATALOG = {
  villa: {
    type: 'villa',
    name: '코지 원룸 빌라',
    icon: '🏡',
    buildCost: 300,
    canEnterInterior: true,
    roofColor: 0xe07a5f,
    wallColor: 0xfce8d5,
    roomCount: 6,
    baseRoomRent: 34,
    hasGroundShops: false,
    synergy: null,
    desc: '6개의 아기자기한 원룸 호실(101~203호)을 직접 인테리어하고 세입자를 받아 안정적인 월세를 얻는 주거 빌라입니다.'
  },
  commercial: {
    type: 'commercial',
    name: '상가 전용 빌딩',
    icon: '🏪',
    buildCost: 450,
    canEnterInterior: true,
    roofColor: 0x0ea5e9,
    wallColor: 0xf0f9ff,
    roomCount: 0,
    baseRoomRent: 0,
    hasGroundShops: true,
    isFullCommercial: true,
    synergy: {
      label: '🏪 슬세권 상권 버프',
      rentBonusPct: 12,
      desc: '인접 주거 건물의 월세 +12% 상승'
    },
    desc: '24시 편의점, 코인세탁소, 베이커리 카페 3대 상가가 입점하여 마을 입주민들이 방문할 때마다 폭발적인 매출이 발생합니다!'
  },
  officetel: {
    type: 'officetel',
    name: '프리미엄 오피스텔',
    icon: '🏢',
    buildCost: 850,
    canEnterInterior: true,
    roofColor: 0xeab308,
    wallColor: 0xfef9ee,
    roomCount: 6,
    baseRoomRent: 68,
    hasGroundShops: true,
    synergy: {
      label: '✨ 명품 타운 버프',
      rentBonusPct: 10,
      desc: '인접 주거 건물의 월세 +10% 상승'
    },
    desc: '기본 월세가 매우 높은 6실 하이엔드 오피스텔과 1층 상가가 결합된 고급 복합 건물입니다. VIP 세입자 유치에 최적입니다!'
  },
  park: {
    type: 'park',
    name: '햇살 힐링 공원',
    icon: '🌳',
    buildCost: 250,
    canEnterInterior: false,
    roofColor: 0x22c55e,
    wallColor: 0xbbf7d0,
    roomCount: 0,
    baseRoomRent: 0,
    hasGroundShops: false,
    passiveIncome: 28,
    passiveCycleSec: 10,
    synergy: {
      label: '🌳 공원 인접 숲세권',
      rentBonusPct: 15,
      desc: '주변 모든 주거 건물의 월세 +15% 상승!'
    },
    desc: '분수대와 산책로, 벤치가 어우러진 힐링 공원! 주변 주거 건물의 월세를 +15% 올려주는 강력한 숲세권 시너지 버프를 발동합니다!'
  },
  // 초기 1호점 전용 복합빌라 정의
  mixed_villa: {
    type: 'mixed_villa',
    name: '주거+상가 복합빌라',
    icon: '🏠',
    buildCost: 0,
    canEnterInterior: true,
    roofColor: 0xe07a5f,
    wallColor: 0xf8e5d0,
    roomCount: 6,
    baseRoomRent: 30,
    hasGroundShops: true,
    synergy: null,
    desc: '1~2층 원룸 6호실과 1층 편의점·코인세탁소가 함께 있는 미니미 타운의 첫 출발점입니다.'
  }
};

// 인테리어 테마 세트 보너스 정의 (내부 뷰 전용)
const THEME_SETS = [
  {
    minLevel: 3,
    id: 'royal_suite',
    name: '로얄 부티크 스위트',
    icon: '👑',
    bonusPct: 35,
    badgeText: '👑 로얄 부티크 스위트 · 월세 +35%',
    badgeClass: 'set-pill-royal'
  },
  {
    minLevel: 2,
    id: 'cozy_wood',
    name: '코지 우드 하우스',
    icon: '🌿',
    bonusPct: 20,
    badgeText: '🌿 코지 우드 하우스 · 월세 +20%',
    badgeClass: 'set-pill-wood'
  },
  {
    minLevel: 1,
    id: 'pastel_sweet',
    name: '파스텔 스윗홈',
    icon: '🌸',
    bonusPct: 12,
    badgeText: '🌸 파스텔 스윗홈 · 월세 +12%',
    badgeClass: 'set-pill-pastel'
  }
];

// 건물 내부 로컬 좌표 기준 6개 호실 레이아웃 (건물 중심 (0, 0, 0) 기준)
const BUILDING_ROOM_SLOTS = [
  { subId: '101', name: '101호', floor: 1, lx: -5.3, ly: 2.35, lz: 1.5, rentCycleSec: 9.5, unlockCost: 0, defaultUnlocked: true },
  { subId: '102', name: '102호', floor: 1, lx: 0.0, ly: 2.35, lz: 1.5, rentCycleSec: 11.5, unlockCost: 0, defaultUnlocked: true },
  { subId: '103', name: '103호', floor: 1, lx: 5.3, ly: 2.35, lz: 1.5, rentCycleSec: 10.5, unlockCost: 140, defaultUnlocked: false },
  { subId: '201', name: '201호', floor: 2, lx: -5.3, ly: 4.85, lz: -2.8, rentCycleSec: 12.0, unlockCost: 220, defaultUnlocked: false },
  { subId: '202', name: '202호', floor: 2, lx: 0.0, ly: 4.85, lz: -2.8, rentCycleSec: 10.8, unlockCost: 340, defaultUnlocked: false },
  { subId: '203', name: '203호', floor: 2, lx: 5.3, ly: 4.85, lz: -2.8, rentCycleSec: 11.8, unlockCost: 480, defaultUnlocked: false }
];

// 건물 내부 1층 상가 템플릿 (편의점, 코인세탁소, 베이커리 카페)
const SHOP_TEMPLATES = {
  store: {
    key: 'store',
    name: '24시 미니미 편의점',
    icon: '🏪',
    levels: {
      1: { title: '동네 3D 편의점', visitProfit: 14, upgradeCost: 0, desc: '음료 쇼케이스 냉장고와 간식 매대, POS 계산대가 갖춰진 편의점' },
      2: { title: '카페형 핫푸드 편의점', visitProfit: 28, upgradeCost: 200, desc: '즉석 원두머신과 따뜻한 간식 쇼케이스 증설!' },
      3: { title: '스마트 플래그십 마트', visitProfit: 52, upgradeCost: 460, desc: '프리미엄 음료·와인 부스 완비로 마을 최고 매출 달성!' }
    }
  },
  laundry: {
    key: 'laundry',
    name: '워시퐁 3D 코인세탁소',
    icon: '🧺',
    levels: {
      1: { title: '3연동 드럼 세탁방', visitProfit: 16, upgradeCost: 0, desc: '세탁조가 실시간 회전하는 3연동 드럼세탁기 부스' },
      2: { title: '스팀 고온건조 워시존', visitProfit: 32, upgradeCost: 220, desc: '2단 건조기 타워 증설로 세탁 회전율 2배!' },
      3: { title: '부티크 런드리 라운지', visitProfit: 58, upgradeCost: 500, desc: '골드 드럼 풀세트와 대기 라운지를 갖춘 랜드마크 세탁소!' }
    }
  },
  bakery: {
    key: 'bakery',
    name: '햇살 베이커리 & 카페',
    icon: '🥐',
    levels: {
      1: { title: '수제 크루아상 베이커리', visitProfit: 20, upgradeCost: 0, desc: '갓 구운 빵 진열 쇼케이스와 에스프레소 머신, 원형 테이블 완비' },
      2: { title: '디저트 브런치 로스터리', visitProfit: 38, upgradeCost: 260, desc: '케이크 쇼케이스와 테라스 좌석 확장으로 핫플 등극!' },
      3: { title: '타운 시그니처 그랑카페', visitProfit: 68, upgradeCost: 580, desc: '전 마을 입주민이 줄 서서 사 먹는 명품 베이커리 카페!' }
    }
  }
};

// 호실 내 로컬 스팟 (방 크기 5.2 x 4.4 기준)
const ROOM_LOCAL_SPOTS_3D = {
  center: { x: 0.0, z: 0.35 },
  cleanSpots: [
    { x: -0.9, z: 0.4 },
    { x: 0.8, z: 0.6 },
    { x: 0.0, z: 1.2 }
  ],
  bed: { x: -1.45, z: -0.8 },
  shower: { x: 1.55, z: -0.9 },
  kitchen: { x: -1.35, z: 1.05 },
  desk: { x: 1.35, z: 0.95 },
  sofa: { x: 0.05, z: 0.15 }
};

// 6종 가구 리노베이션 트리
const FURNITURE_TREE = {
  wallpaper: {
    key: 'wallpaper',
    label: '바닥 마루 & 벽체',
    icon: '🪵',
    levels: [
      { level: 0, tier: '철거 전', name: '시멘트 바닥 & 얼룩 벽지', cost: 0, rentBonus: 0 },
      { level: 1, tier: '파스텔 스윗', name: '메이플 마루 & 피치 파스텔 벽', cost: 40, rentBonus: 14 },
      { level: 2, tier: '코지 우드', name: '오크 헤링본 마루 & 웨인스코팅', cost: 130, rentBonus: 32 },
      { level: 3, tier: '로얄 부티크', name: '비앙코 골드 대리석 & 호텔 몰딩', cost: 320, rentBonus: 65 }
    ]
  },
  bed: {
    key: 'bed',
    label: '침대 & 무드등',
    icon: '🛏️',
    levels: [
      { level: 0, tier: '미설치', name: '바닥 얇은 매트', cost: 0, rentBonus: 0 },
      { level: 1, tier: '파스텔 스윗', name: '원목 싱글베드 & 스탠드 조명', cost: 45, rentBonus: 13 },
      { level: 2, tier: '코지 우드', name: '북유럽 퀸 침대 & 나이트스탠드', cost: 150, rentBonus: 30 },
      { level: 3, tier: '로얄 부티크', name: '호텔 킹베드 & 골드 무드램프', cost: 350, rentBonus: 60 }
    ]
  },
  shower: {
    key: 'shower',
    label: '유리부스 욕실',
    icon: '🚿',
    levels: [
      { level: 0, tier: '미설치', name: '구형 변기 & 세면대', cost: 0, rentBonus: 0 },
      { level: 1, tier: '파스텔 스윗', name: '민트 타일 & 반투명 샤워부스', cost: 55, rentBonus: 16 },
      { level: 2, tier: '코지 우드', name: '강화유리 부스 & 원목 세면대', cost: 170, rentBonus: 34 },
      { level: 3, tier: '로얄 부티크', name: '골드 레인샤워 & 스파 욕실', cost: 390, rentBonus: 68 }
    ]
  },
  kitchen: {
    key: 'kitchen',
    label: '주방 & 냉장고',
    icon: '🍳',
    levels: [
      { level: 0, tier: '미설치', name: '간이 싱크 박스', cost: 0, rentBonus: 0 },
      { level: 1, tier: '파스텔 스윗', name: '대리석 싱크 + 2도어 냉장고', cost: 50, rentBonus: 13 },
      { level: 2, tier: '코지 우드', name: '인덕션 키친 + 레트로 냉장고', cost: 155, rentBonus: 29 },
      { level: 3, tier: '로얄 부티크', name: '마블 홈바 + 프리미엄 냉장고', cost: 360, rentBonus: 58 }
    ]
  },
  desk: {
    key: 'desk',
    label: '소파 & 데스크존',
    icon: '🛋️',
    levels: [
      { level: 0, tier: '미설치', name: '낡은 나무 상자', cost: 0, rentBonus: 0 },
      { level: 1, tier: '파스텔 스윗', name: '원형 러그 + 코지 소파 + 책상', cost: 45, rentBonus: 12 },
      { level: 2, tier: '코지 우드', name: '2인 패브릭 소파 + 워크스테이션', cost: 160, rentBonus: 30 },
      { level: 3, tier: '로얄 부티크', name: '벨벳 라운지 + 듀얼모니터 서재', cost: 400, rentBonus: 62 }
    ]
  },
  ac: {
    key: 'ac',
    label: '창호 & 화분/에어컨',
    icon: '🪴',
    levels: [
      { level: 0, tier: '미설치', name: '커튼 없는 기본 창', cost: 0, rentBonus: 0 },
      { level: 1, tier: '파스텔 스윗', name: '쉬폰 커튼 + 벽걸이 에어컨 + 화분', cost: 45, rentBonus: 12 },
      { level: 2, tier: '코지 우드', name: '햇살 커튼 + 무풍 에어컨 + 몬스테라', cost: 145, rentBonus: 28 },
      { level: 3, tier: '로얄 부티크', name: '골드 커튼 + 스마트 공조 + 올리브나무', cost: 340, rentBonus: 55 }
    ]
  }
};

// 8종 3D 입주민 직업/특성
const TENANT_JOBS = [
  {
    id: 'exam_student',
    jobName: '열공 공시생',
    traitTag: '형광펜 수집가 📚',
    badgeColor: '#3b82f6',
    minBudget: 58,
    maxBudget: 92,
    requirements: { wallpaper: 1 },
    wishText: '깨끗한 마루에서 집중해 공부하고 싶어요!',
    style: { hairColor: '#292524', outfitColor: '#3b82f6', pantsColor: '#1e3a8a', accessory: 'glasses' },
    quotes: ['새 마루 냄새 너무 좋다~ 🌸', '노트북 인강 열공 중! 💻', '1층 편의점 삼각김밥 꿀맛! 🍙', '침대가 푹신해서 행복해 💤']
  },
  {
    id: 'college_student',
    jobName: '감성 대학생',
    traitTag: '집꾸미기 덕후 🌷',
    badgeColor: '#10b981',
    minBudget: 70,
    maxBudget: 112,
    requirements: { wallpaper: 1, bed: 1 },
    wishText: '예쁜 조명 침대와 소파가 있는 자취방 희망!',
    style: { hairColor: '#78350f', outfitColor: '#10b981', pantsColor: '#065f46', accessory: 'cap' },
    quotes: ['더 테넌츠 감성 자취방 최고! 💕', '유리 샤워부스 너무 깔끔해 🫧', '이웃 상가 베이커리 빵 사왔어요 🥐']
  },
  {
    id: 'dev_worker',
    jobName: '커피 중독 개발자',
    traitTag: '아아 수혈러 ☕',
    badgeColor: '#6366f1',
    minBudget: 105,
    maxBudget: 160,
    requirements: { desk: 1, shower: 1 },
    wishText: '재택 코딩 데스크와 온수 샤워부스 필수!',
    style: { hairColor: '#1e293b', outfitColor: '#6366f1', pantsColor: '#312e81', accessory: 'glasses' },
    quotes: ['채광 좋고 조용해서 코딩 천국이네요 ☕', '샤워하다 버그 해결법 발견! 💡', '타운 산책로 걷기 너무 좋아요 🌳']
  },
  {
    id: 'cat_butler',
    jobName: '고양이 집사 디자이너',
    traitTag: '치즈냥 동거중 🐱',
    badgeColor: '#f59e0b',
    minBudget: 125,
    maxBudget: 190,
    requirements: { wallpaper: 2, ac: 1 },
    wishText: '냥이가 뒹굴 헤링본 우드 마루와 화분 희망!',
    style: { hairColor: '#9a3412', outfitColor: '#f59e0b', pantsColor: '#78350f', accessory: 'catpin', hasCat: true },
    quotes: ['러그 위에서 치즈냥이가 골골송 불러요 🐱', '햇살 가득한 우드 인테리어 최고!', '세탁소에서 담요 뽀송 건조 완료 🧺']
  },
  {
    id: 'fitness_trainer',
    jobName: '깔끔쟁이 트레이너',
    traitTag: '오운완 & 청소왕 💪',
    badgeColor: '#f43f5e',
    minBudget: 150,
    maxBudget: 225,
    requirements: { shower: 2, kitchen: 1 },
    wishText: '강화유리 샤워부스와 단백질 요리 주방 필수!',
    style: { hairColor: '#18181b', outfitColor: '#f43f5e', pantsColor: '#881337', accessory: 'headband' },
    quotes: ['타운 공원 조깅하고 온수 샤워! 상쾌하다 💪', '냉장고 가득 프로틴 든든해요 🥗', '먼지 제로 클린 하우스! ✨']
  },
  {
    id: 'webtoon_artist',
    jobName: '야식 매니아 웹툰작가',
    traitTag: '마감 후 치킨파티 🎨',
    badgeColor: '#a855f7',
    minBudget: 185,
    maxBudget: 275,
    requirements: { desk: 2, bed: 2 },
    wishText: '넓은 작업 데스크와 마감 후 푹 잘 퀸침대 필수!',
    style: { hairColor: '#581c87', outfitColor: '#a855f7', pantsColor: '#4c1d95', accessory: 'beret' },
    quotes: ['내 방이 너무 예뻐서 웹툰 배경 참고 중! 🎨', '마감 끝내고 먹는 치킨 최고 🍗', '소파 쿠션이 말랑해서 천국이에요 💕']
  },
  {
    id: 'youtuber',
    jobName: '텐션 만렙 유튜버',
    traitTag: '랜선 집들이 스타 🎥',
    badgeColor: '#ec4899',
    minBudget: 240,
    maxBudget: 360,
    requirements: { desk: 2, wallpaper: 2 },
    wishText: '랜선 집들이 각 나오는 감성 인테리어 희망!',
    style: { hairColor: '#db2777', outfitColor: '#ec4899', pantsColor: '#831843', accessory: 'headset' },
    quotes: ['랜선 집들이 조회수 100만 돌파!! 🎥💖', '동네 상권이 좋아서 브이로그 맛집이에요!', '듀얼 모니터 편집 속도 2배 ⚡']
  },
  {
    id: 'startup_ceo',
    jobName: '플렉스 스타트업 대표',
    traitTag: '프리미엄 월세 VIP 👑',
    badgeColor: '#eab308',
    minBudget: 320,
    maxBudget: 560,
    requirements: { wallpaper: 3, bed: 2, shower: 2 },
    wishText: '부티크 풀옵션이나 프리미엄 오피스텔 선호!',
    style: { hairColor: '#0f172a', outfitColor: '#eab308', pantsColor: '#1e1b4b', accessory: 'goldglasses' },
    quotes: ['이 타운 최고의 명품 주거지군요! 👑', '골드 레인샤워와 대리석 마감 완벽합니다 ✨', '공원 뷰와 상권 인프라까지 최고네요 📈']
  }
];

const KOREAN_LAST_NAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '송', '유', '홍'];
const KOREAN_FIRST_NAMES = ['민준', '서연', '도윤', '지우', '시우', '하은', '지호', '수빈', '예준', '민서', '우진', '채원', '현우', '지민', '소율', '연우', '다은', '유진', '태오', '하린'];

// 돌발 케어 이벤트 (내부 뷰 & 타운 뷰 모두 지원)
const CARE_BUBBLE_TYPES = [
  { id: 'pipe_fix', icon: '🔧', label: '배관 수리', cashReward: 42, instantRent: true, toastMsg: '🔧 배관 수리 완료! 보너스 수리비와 해당 건물/호실 월세를 즉시 수금했어요!' },
  { id: 'parcel_deliver', icon: '📦', label: '택배 전달', cashReward: 45, instantRent: true, toastMsg: '📦 택배 안심 전달! 입주민이 고마워하며 월세를 바로 입금했어요!' },
  { id: 'street_sweep', icon: '🧹', label: '거리 청소', cashReward: 50, instantRent: false, toastMsg: '🧹 타운 거리와 복도를 반짝반짝 청소해 쾌적도 보너스를 받았어요!' },
  { id: 'smart_light', icon: '💡', label: '스마트 조명 교체', cashReward: 48, instantRent: true, toastMsg: '💡 따뜻한 스마트 무드등 교체 완료! 즉시 월세 보너스가 터졌어요!' }
];

// 메인 갓물주 & 타운 확장 가이드 미션 10단계
const MAIN_QUESTS = [
  {
    id: 'tq1',
    title: '1호점 건물 내부로 들어가 101호 도배하기',
    desc: '미니미 하우스 1호점을 터치해 내부 뷰로 진입한 뒤, 101호 [바닥 마루 & 벽체]를 Lv.1로 시공하세요!',
    targetMode: 'BUILDING',
    targetLotId: 'lot_1',
    targetSubRoom: '101',
    reward: 150,
    check: (st) => {
      const b = st.buildings.lot_1;
      const r = b && b.rooms.find((rm) => rm.subId === '101');
      return r && r.furniture.wallpaper >= 1;
    }
  },
  {
    id: 'tq2',
    title: '101호 첫 3D 미니미 입주민 계약하기',
    desc: '101호 관리 패널에서 [세입자 구하기]를 눌러 첫 입주민을 맞이하세요!',
    targetMode: 'BUILDING',
    targetLotId: 'lot_1',
    targetSubRoom: '101',
    reward: 180,
    check: (st) => {
      const b = st.buildings.lot_1;
      const r = b && b.rooms.find((rm) => rm.subId === '101');
      return r && !!r.tenant;
    }
  },
  {
    id: 'tq3',
    title: '101호 [🌸 파스텔 스윗홈] 풀옵션 완성!',
    desc: '101호의 6종 가구를 모두 Lv.1 이상 설치해 [월세 +12% 세트 효과]를 켜세요!',
    targetMode: 'BUILDING',
    targetLotId: 'lot_1',
    targetSubRoom: '101',
    reward: 280,
    check: (st) => {
      const b = st.buildings.lot_1;
      const r = b && b.rooms.find((rm) => rm.subId === '101');
      return r && Object.values(r.furniture).every((lv) => lv >= 1);
    }
  },
  {
    id: 'tq4',
    title: '102호도 꾸며서 두 번째 입주민 받기',
    desc: '옆방 102호도 리모델링하고 입주민과 계약해 멀티 월세 수금을 시작하세요!',
    targetMode: 'BUILDING',
    targetLotId: 'lot_1',
    targetSubRoom: '102',
    reward: 350,
    check: (st) => {
      const b = st.buildings.lot_1;
      return b && b.rooms.filter((rm) => !!rm.tenant).length >= 2;
    }
  },
  {
    id: 'tq5',
    title: '[🏙️ 마을 전체 보기]로 나가 빈 땅 매입 & 신축!',
    desc: '마을 뷰로 줌아웃해 옆 필지(서쪽 2번지 등)를 매입하고 [힐링 공원] 또는 [새 건물]을 지어보세요!',
    targetMode: 'TOWN',
    targetLotId: 'lot_2',
    reward: 500,
    check: (st) => Object.keys(st.buildings).length >= 2
  },
  {
    id: 'tq6',
    title: '3번째 필지 매입해 타운 상권/주거 확장하기',
    desc: '동쪽 3번지 등 빈 땅을 하나 더 매입해 공원 시너지나 상가 전용 빌딩을 세워보세요!',
    targetMode: 'TOWN',
    targetLotId: 'lot_3',
    reward: 800,
    check: (st) => Object.keys(st.buildings).length >= 3
  },
  {
    id: 'tq7',
    title: '1호점 1층 상가(편의점/세탁소) Lv.2 업그레이드',
    desc: '건물 내부 1층 편의점 또는 코인세탁소를 터치해 Lv.2로 확장하세요!',
    targetMode: 'BUILDING',
    targetLotId: 'lot_1',
    reward: 600,
    check: (st) => Object.values(st.buildings).some((b) =>
      b.shops && b.shops.some((sh) => sh.level >= 2)
    )
  },
  {
    id: 'tq8',
    title: '메인대로 건너편 필지까지 4채 달성!',
    desc: '길 건너편 메인대로 필지를 매입해 어엿한 부동산 타운을 완성하세요!',
    targetMode: 'TOWN',
    targetLotId: 'lot_4',
    reward: 1500,
    check: (st) => Object.keys(st.buildings).length >= 4
  },
  {
    id: 'tq9',
    title: '[5,000만 원] 황금 역세권 6번지 매입 도전!',
    desc: '자산을 모아 [땅 매입 가능 · 5,000만 원] 입간판이 선 6번지 랜드마크 땅에 건물을 올리세요!',
    targetMode: 'TOWN',
    targetLotId: 'lot_6',
    reward: 3000,
    check: (st) => !!st.buildings.lot_6
  },
  {
    id: 'tq10',
    title: '7개 전 필지 개발 완료 · 미니미 시티 완성!',
    desc: '마을의 모든 빈 땅을 개발해 꿈의 부동산 타이쿤 대도시를 완성하세요!',
    targetMode: 'TOWN',
    targetLotId: 'lot_7',
    reward: 5000,
    check: (st) => Object.keys(st.buildings).length >= INITIAL_LOTS.length
  }
];

function getRoomThemeSet(room) {
  const levels = Object.values(room.furniture);
  const minLv = Math.min(...levels);
  for (const setDef of THEME_SETS) {
    if (minLv >= setDef.minLevel) return setDef;
  }
  return null;
}

window.TOWN_CONFIG = TOWN_CONFIG;
window.INITIAL_LOTS = INITIAL_LOTS;
window.BUILDING_CATALOG = BUILDING_CATALOG;
window.THEME_SETS = THEME_SETS;
window.BUILDING_ROOM_SLOTS = BUILDING_ROOM_SLOTS;
window.SHOP_TEMPLATES = SHOP_TEMPLATES;
window.ROOM_LOCAL_SPOTS_3D = ROOM_LOCAL_SPOTS_3D;
window.FURNITURE_TREE = FURNITURE_TREE;
window.TENANT_JOBS = TENANT_JOBS;
window.KOREAN_LAST_NAMES = KOREAN_LAST_NAMES;
window.KOREAN_FIRST_NAMES = KOREAN_FIRST_NAMES;
window.CARE_BUBBLE_TYPES = CARE_BUBBLE_TYPES;
window.MAIN_QUESTS = MAIN_QUESTS;
window.getRoomThemeSet = getRoomThemeSet;
