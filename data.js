// =========================================================
// 【갓물주 라이프: 미니미 하우스】 데이터 모듈 (data.js)
// 3D 돌하우스 좌표, 테마 세트 효과, 가구 트리, 8종 개성 입주민, 돌발 케어 & 퀘스트
// =========================================================

const WORLD_CONFIG = {
  width: 1800,
  height: 1400,
  minScale: 0.45,
  maxScale: 1.85,
  defaultScale: 0.64,
  corridor2FY: 462,
  corridor1FY: 802,
  plazaY: 1118,
  stairX: 1505
};

// 3D 돌하우스 방 내부 로컬 좌표 (방 크기: 384 x 276 기준)
const ROOM_LOCAL_SPOTS = {
  door: { x: 192, y: 256 },
  center: { x: 192, y: 184 },
  cleanSpots: [
    { x: 152, y: 152 },
    { x: 228, y: 164 },
    { x: 188, y: 218 }
  ],
  bed: { x: 84, y: 132 },
  shower: { x: 318, y: 122 },
  kitchen: { x: 92, y: 212 },
  desk: { x: 292, y: 214 }
};

// 인테리어 테마 세트 보너스 정의
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

// 1층(101~103호) & 2층(201~203호) 호실 초기 데이터 (호실별 개별 월세 주기 포함!)
const INITIAL_ROOMS = [
  {
    id: '101',
    name: '101호',
    floor: 1,
    x: 216,
    y: 504,
    w: 384,
    h: 276,
    corridorY: 802,
    rentCycleSec: 10,
    unlocked: true,
    unlockCost: 0,
    baseRent: 28,
    furniture: { wallpaper: 0, bed: 0, shower: 0, kitchen: 0, desk: 0, ac: 0 }
  },
  {
    id: '102',
    name: '102호',
    floor: 1,
    x: 618,
    y: 504,
    w: 384,
    h: 276,
    corridorY: 802,
    rentCycleSec: 12,
    unlocked: true,
    unlockCost: 0,
    baseRent: 28,
    furniture: { wallpaper: 0, bed: 0, shower: 0, kitchen: 0, desk: 0, ac: 0 }
  },
  {
    id: '103',
    name: '103호',
    floor: 1,
    x: 1020,
    y: 504,
    w: 384,
    h: 276,
    corridorY: 802,
    rentCycleSec: 11,
    unlocked: false,
    unlockCost: 150,
    baseRent: 32,
    furniture: { wallpaper: 0, bed: 0, shower: 0, kitchen: 0, desk: 0, ac: 0 }
  },
  {
    id: '201',
    name: '201호',
    floor: 2,
    x: 216,
    y: 164,
    w: 384,
    h: 276,
    corridorY: 462,
    rentCycleSec: 13,
    unlocked: false,
    unlockCost: 250,
    baseRent: 36,
    furniture: { wallpaper: 0, bed: 0, shower: 0, kitchen: 0, desk: 0, ac: 0 }
  },
  {
    id: '202',
    name: '202호',
    floor: 2,
    x: 618,
    y: 164,
    w: 384,
    h: 276,
    corridorY: 462,
    rentCycleSec: 11.5,
    unlocked: false,
    unlockCost: 400,
    baseRent: 40,
    furniture: { wallpaper: 0, bed: 0, shower: 0, kitchen: 0, desk: 0, ac: 0 }
  },
  {
    id: '203',
    name: '203호',
    floor: 2,
    x: 1020,
    y: 164,
    w: 384,
    h: 276,
    corridorY: 462,
    rentCycleSec: 12.5,
    unlocked: false,
    unlockCost: 600,
    baseRent: 45,
    furniture: { wallpaper: 0, bed: 0, shower: 0, kitchen: 0, desk: 0, ac: 0 }
  }
];

// 단지 내 1층 상가 데이터 (24시 미니미 편의점, 워시퐁 코인세탁소)
const INITIAL_SHOPS = {
  store: {
    id: 'store',
    name: '24시 미니미 편의점',
    icon: '🏪',
    x: 216,
    y: 842,
    w: 484,
    h: 256,
    doorX: 458,
    doorY: 1098,
    spots: [
      { x: 350, y: 1008 },
      { x: 552, y: 1012 }
    ],
    level: 1,
    levels: {
      1: {
        title: '아기자기 동네 편의점',
        desc: '삼각김밥과 딸기우유, 컵라면이 가득한 귀여운 1층 편의점',
        visitProfit: 12,
        upgradeCost: 0
      },
      2: {
        title: '원두향 솔솔 카페형 편의점',
        desc: '갓 내린 아이스 아메리카노와 핫바 코너로 입주민 발길 폭발!',
        visitProfit: 26,
        upgradeCost: 220
      },
      3: {
        title: '프리미엄 디저트 & 와인 스토어',
        desc: '수제 디저트 쇼케이스와 스마트 셀프바까지 갖춘 핫플레이스!',
        visitProfit: 48,
        upgradeCost: 520
      }
    }
  },
  laundry: {
    id: 'laundry',
    name: '워시퐁 24시 코인세탁소',
    icon: '🧺',
    x: 938,
    y: 842,
    w: 466,
    h: 256,
    doorX: 1170,
    doorY: 1098,
    spots: [
      { x: 1058, y: 1010 },
      { x: 1265, y: 1010 }
    ],
    level: 1,
    levels: {
      1: {
        title: '비누방울 동전 세탁방',
        desc: '보글보글 섬유유연제 향기가 퍼지는 파스텔 코인세탁소',
        visitProfit: 14,
        upgradeCost: 0
      },
      2: {
        title: '뽀송뽀송 대형 건조 워시존',
        desc: '이불 빨래도 30분 만에 솜사탕처럼 말려주는 고온건조기 완비!',
        visitProfit: 30,
        upgradeCost: 240
      },
      3: {
        title: '워시퐁 힐링 라운지 & 카페',
        desc: '세탁을 기다리며 무드등 아래 독서와 커피를 즐기는 감성 런드리!',
        visitProfit: 56,
        upgradeCost: 560
      }
    }
  }
};

// 6종 가구 업그레이드 트리 (Lv.0 -> Lv.1 파스텔 스윗 -> Lv.2 코지 우드 -> Lv.3 로얄 부티크)
const FURNITURE_TREE = {
  wallpaper: {
    key: 'wallpaper',
    label: '벽지 / 장판',
    icon: '🎨',
    levels: [
      {
        level: 0,
        tier: '방치됨',
        name: '곰팡이 얼룩 벽지 & 낡은 장판',
        desc: '습기 얼룩이 남아 리모델링이 시급한 기본 마감',
        cost: 0,
        rentBonus: 0,
        comfort: 0
      },
      {
        level: 1,
        tier: '파스텔 스윗',
        name: '버터크림 파스텔 벽지 & 밝은 우드데코',
        desc: '방 안이 화사해지는 피치·크림톤 벽지와 깨끗한 우드 장판',
        cost: 40,
        rentBonus: 14,
        comfort: 12
      },
      {
        level: 2,
        tier: '코지 우드',
        name: '햇살 헤링본 원목마루 & 웨인스코팅',
        desc: '따스한 오크 헤링본 마루와 감성 원목 몰딩이 어우러진 워너비 룸',
        cost: 140,
        rentBonus: 30,
        comfort: 24
      },
      {
        level: 3,
        tier: '로얄 부티크',
        name: '샴페인 크림 대리석 & 골드 아치몰딩',
        desc: '은은한 광택의 크림 비앙코 타일과 부티크 호텔풍 골드 라인',
        cost: 350,
        rentBonus: 62,
        comfort: 40
      }
    ]
  },
  bed: {
    key: 'bed',
    label: '침대 & 조명',
    icon: '🛏️',
    levels: [
      {
        level: 0,
        tier: '미설치',
        name: '맨바닥 얇은 담요 매트',
        desc: '침대 프레임 없이 바닥에 얇은 이불만 깔린 상태',
        cost: 0,
        rentBonus: 0,
        comfort: 0
      },
      {
        level: 1,
        tier: '파스텔 스윗',
        name: '코랄핑크 폭신 매트리스 & 미니 스탠드',
        desc: '말랑한 파스텔 침구와 머리맡 노란 스탠드 조명이 켜지는 침대',
        cost: 50,
        rentBonus: 12,
        comfort: 12
      },
      {
        level: 2,
        tier: '코지 우드',
        name: '북유럽 원목 프레임 베드 & 코지 무드등',
        desc: '따뜻한 원목 헤드보드, 구름 이불, 갓 스탠드가 세팅된 감성 침실',
        cost: 160,
        rentBonus: 28,
        comfort: 22
      },
      {
        level: 3,
        tier: '로얄 부티크',
        name: '구스다운 캐노피 킹베드 & 골드 팬던트',
        desc: '눕자마자 스르르 잠드는 5성급 호텔 구스다운 침구와 크리스탈 조명',
        cost: 380,
        rentBonus: 56,
        comfort: 36
      }
    ]
  },
  shower: {
    key: 'shower',
    label: '욕실 샤워부스',
    icon: '🛁',
    levels: [
      {
        level: 0,
        tier: '미설치',
        name: '찬물 미니 세면대만 있음',
        desc: '샤워 파티션이 없어 고양이 세수만 겨우 가능한 욕실',
        cost: 0,
        rentBonus: 0,
        comfort: 0
      },
      {
        level: 1,
        tier: '파스텔 스윗',
        name: '민트 타일 온수 샤워기 & 도트 커튼',
        desc: '따끈한 온수가 콸콸 나오는 귀여운 파스텔 욕실 부스',
        cost: 60,
        rentBonus: 15,
        comfort: 15
      },
      {
        level: 2,
        tier: '코지 우드',
        name: '반짝 강화유리 샤워부스 & 우드 선반',
        desc: '투명하게 빛나는 유리 파티션과 아로마 바디워시 세트가 놓인 욕실',
        cost: 180,
        rentBonus: 32,
        comfort: 26
      },
      {
        level: 3,
        tier: '로얄 부티크',
        name: '골드 레인샤워 & 버블 히노끼 스파욕조',
        desc: '향긋한 거품 반신욕과 골드 레인샤워를 즐기는 프라이빗 스파',
        cost: 420,
        rentBonus: 64,
        comfort: 42
      }
    ]
  },
  kitchen: {
    key: 'kitchen',
    label: '미니 주방',
    icon: '🍳',
    levels: [
      {
        level: 0,
        tier: '미설치',
        name: '미니 휴대용 가스버너',
        desc: '싱크대 없이 바닥에서 물만 끓이는 열악한 간이 조리대',
        cost: 0,
        rentBonus: 0,
        comfort: 0
      },
      {
        level: 1,
        tier: '파스텔 스윗',
        name: '크림옐로우 미니 싱크 & 1구 인덕션',
        desc: '보글보글 라면 냄비와 파스텔 머그컵 선반이 달린 귀여운 주방',
        cost: 55,
        rentBonus: 12,
        comfort: 12
      },
      {
        level: 2,
        tier: '코지 우드',
        name: '원목 상판 화이트 타일 키친 & 후드',
        desc: '감성 우드 상판과 2구 인덕션, 토스터기까지 완비된 홈카페 주방',
        cost: 165,
        rentBonus: 26,
        comfort: 22
      },
      {
        level: 3,
        tier: '로얄 부티크',
        name: '마블 아일랜드 홈바 & 에스프레소 머신',
        desc: '대리석 홈바, 와인 글라스 랙, 하이엔드 커피머신이 빛나는 부티크 키친',
        cost: 390,
        rentBonus: 54,
        comfort: 36
      }
    ]
  },
  desk: {
    key: 'desk',
    label: '데스크 / PC',
    icon: '💻',
    levels: [
      {
        level: 0,
        tier: '미설치',
        name: '미니 접이식 좌식 밥상',
        desc: '바닥에 쪼그려 앉아 노트북을 올려두는 작은 상',
        cost: 0,
        rentBonus: 0,
        comfort: 0
      },
      {
        level: 1,
        tier: '파스텔 스윗',
        name: '화이트 라운드 책상 & 파스텔 의자',
        desc: '깔끔한 노트북과 귀여운 연필꽂이, 푹신한 쿠션 체어 세트',
        cost: 45,
        rentBonus: 11,
        comfort: 11
      },
      {
        level: 2,
        tier: '코지 우드',
        name: '감성 원목 데스크테리어 & 와이드 모니터',
        desc: '원목 선반, 미니 화분, 아이맥풍 모니터가 어우러진 드림 데스크',
        cost: 170,
        rentBonus: 28,
        comfort: 24
      },
      {
        level: 3,
        tier: '로얄 부티크',
        name: '듀얼 커브드 스튜디오 & 라운지 체어',
        desc: '크리에이터·대표님 맞춤형 초고화질 듀얼 모니터와 명품 서재 데스크',
        cost: 430,
        rentBonus: 60,
        comfort: 38
      }
    ]
  },
  ac: {
    key: 'ac',
    label: '에어컨 & 화분',
    icon: '🍃',
    levels: [
      {
        level: 0,
        tier: '미설치',
        name: '삐걱거리는 구형 미니 선풍기',
        desc: '더운 날엔 미지근한 바람만 도는 작은 선풍기',
        cost: 0,
        rentBonus: 0,
        comfort: 0
      },
      {
        level: 1,
        tier: '파스텔 스윗',
        name: '라운드 벽걸이 에어컨 & 새싹 화분',
        desc: '시원한 청량 바람이 솔솔 나오는 둥근 에어컨과 귀여운 미니 화분',
        cost: 50,
        rentBonus: 11,
        comfort: 12
      },
      {
        level: 2,
        tier: '코지 우드',
        name: '무풍 에코 에어컨 & 몬스테라 화분',
        desc: '우드 라인 무풍 냉방기와 방 안 공기를 살려주는 싱그러운 반려식물',
        cost: 155,
        rentBonus: 26,
        comfort: 22
      },
      {
        level: 3,
        tier: '로얄 부티크',
        name: '골드림 스마트 청정기 & 올리브 나무',
        desc: '사계절 청정 산소 바람과 유럽풍 테라코타 올리브 나무 세트',
        cost: 370,
        rentBonus: 52,
        comfort: 36
      }
    ]
  }
};

// 개성 만점 8종 미니미 입주민 직업/특성 데이터
const TENANT_JOBS = [
  {
    id: 'exam_student',
    jobName: '열공 공시생',
    traitTag: '형광펜 수집가 📚',
    badgeColor: '#3b82f6',
    minBudget: 52,
    maxBudget: 82,
    requirements: { wallpaper: 1 },
    wishText: '밝은 벽지에서 기분 좋게 공부하고 싶어요!',
    style: {
      hairColor: '#292524',
      hairType: 'messy',
      outfitColor: '#60a5fa',
      outfitSub: '#eff6ff',
      accessory: 'glasses'
    },
    quotes: {
      ambient: ['새 벽지 냄새 너무 좋다~ 집중 최고! 🌸', '햇살 들어오니까 도서관보다 좋네 ☀️'],
      cleaning: ['공부 전 책상 먼지 쓱싹! 깨끗해졌다 ✨', '방이 반짝반짝하니 마음도 상쾌해! 🧹'],
      shower: ['따뜻한 온수로 샤워하니 피로가 싹~ 🫧', '샤워하며 외운 영단어는 절대 안 까먹지 🎵'],
      eating: ['보글보글 계란 푼 라면 꿀맛이야! 🍜', '합격 기원 바삭 치킨 타임~ 행복해! 🍗'],
      working: ['이번 시험 무조건 합격 가즈아!! ✍️', '책상이 편해서 공부가 술술 되네 💻'],
      sleeping: ['침대가 푹신해서 스르르 잠든다.. 쿨쿨 💤', '내일도 알차게 보내야지 굿나잇 🌙'],
      store: ['1층 편의점 삼각김밥이랑 우유 득템! 🍙'],
      laundry: ['트레이닝복 뽀송뽀송하게 세탁 완료! 🧺'],
      overbudget: ['집주인님.. 수험생 예산으론 오른 월세가 버거워요 😭']
    }
  },
  {
    id: 'college_student',
    jobName: '감성 대학생',
    traitTag: '집꾸미기 덕후 🌷',
    badgeColor: '#10b981',
    minBudget: 62,
    maxBudget: 96,
    requirements: { wallpaper: 1, bed: 1 },
    wishText: '예쁜 벽지와 폭신한 침대가 있는 로망 자취방 희망!',
    style: {
      hairColor: '#78350f',
      hairType: 'parted',
      outfitColor: '#34d399',
      outfitSub: '#ecfdf5',
      accessory: 'cap'
    },
    quotes: {
      ambient: ['와 진짜 인스타 감성 자취방이야! 💕', '침대가 푹신해서 하루 종일 뒹굴고 싶어~'],
      cleaning: ['친구들 집들이 오기 전에 반짝 대청소! ✨', '러그까지 톡톡 털었더니 뽀송해! 🧹'],
      shower: ['향기로운 바디워시 거품 목욕 타임~ 🫧', '온수 수압 최고다! 콧노래가 절로 나네 🎵'],
      eating: ['과제 끝내고 먹는 로제떡볶이 & 치킨! 🍗', '미니 주방에서 브런치 토스트 완성 🥞'],
      working: ['예쁜 책상에서 과제하니까 능률 200%! 💻', '자취 브이로그 썸네일 만드는 중 ✨'],
      sleeping: ['무드등 켜놓고 동화 같은 꿀잠.. 💤', '구름 위에서 자는 기분이야 쿨쿨 ☁️'],
      store: ['편의점 신상 크림빵 털러 총총! 🥐'],
      laundry: ['이불까지 향기롭게 코인세탁소 직행! 🧺'],
      overbudget: ['알바비로는 인상된 월세를 다 내기 힘들어요 💦']
    }
  },
  {
    id: 'dev_worker',
    jobName: '커피 중독 개발자',
    traitTag: '아아 수혈러 ☕',
    badgeColor: '#6366f1',
    minBudget: 90,
    maxBudget: 138,
    requirements: { desk: 1, shower: 1 },
    wishText: '재택 코딩할 책상과 퇴근 후 씻을 온수 샤워실 필수!',
    style: {
      hairColor: '#1e293b',
      hairType: 'neat',
      outfitColor: '#818cf8',
      outfitSub: '#eef2ff',
      accessory: 'glasses'
    },
    quotes: {
      ambient: ['이 집 와이파이랑 채광 둘 다 갓벽하네! ⚡', '조용하고 아늑해서 버그가 한 번에 잡혀요!'],
      cleaning: ['키보드 먼지 털고 바닥도 싹싹 청소! ✨', '코드도 방도 클린하게 리팩토링 완료! 🧹'],
      shower: ['뜨끈한 샤워 중에 버그 해결법 떠올랐다!! 💡', '오늘 하루 피로도 씻겨 내려간다~ 🫧'],
      eating: ['배포 성공 기념 황금올리브 치킨 플렉스! 🍗', '야간 코딩엔 역시 뜨끈한 라면이지 🍜'],
      working: ['타닥타닥.. 커피 한 모금에 코드 백 줄! 💻', '쾌적한 재택근무 환경 너무 행복하다 ☕'],
      sleeping: ['서버 정상 확인 완료! 푹신한 침대서 숙면 💤', '꿀잠 충전 중.. Zzz 🌙'],
      store: ['1층 편의점 아이스 아메리카노 2잔 수혈! ☕'],
      laundry: ['체크무늬 셔츠랑 후드티 뽀송 세탁! 🧺'],
      overbudget: ['연봉 협상 전이라 인상된 월세는 조금 벅차네요 😢']
    }
  },
  {
    id: 'cat_butler',
    jobName: '고양이 집사 디자이너',
    traitTag: '치즈냥 동거중 🐱',
    badgeColor: '#f59e0b',
    minBudget: 108,
    maxBudget: 162,
    requirements: { wallpaper: 2, ac: 1 },
    wishText: '냥이가 햇살 쬐며 뒹굴 따뜻한 우드 바닥 & 에어컨 희망!',
    style: {
      hairColor: '#9a3412',
      hairType: 'bob',
      outfitColor: '#fbbf24',
      outfitSub: '#fffbeb',
      accessory: 'catpin',
      hasCat: true
    },
    quotes: {
      ambient: ['창가 햇살 아래서 우리 냥이가 식빵 구워요 🐱☀️', '원목 마루가 따뜻해서 냥이도 저도 너무 행복해요!'],
      cleaning: ['냥이 털 돌돌이로 싹싹~ 에구 깨끗해라! ✨', '반짝반짝 윤이 나는 코지 하우스 완성 🧹'],
      shower: ['문 앞에서 냥이가 기다리니 얼른 씻자~ 🫧', '따스한 온수 샤워 힐링 그 자체! 🎵'],
      eating: ['냥이는 연어 츄르, 집사는 바삭 치킨 파티! 🍗', '예쁜 주방에서 파스타 뚝딱 요리했어요 🍝'],
      working: ['일러스트 시안 작업 중! 색감이 잘 보여요 🎨', '귀여운 내 방에서 일하니 영감이 퐁퐁 💻'],
      sleeping: ['골골송 들으며 폭신한 이불 속으로 쏙~ 💤', '냥이랑 나란히 꿀잠 타임 🌙'],
      store: ['1층 편의점에 간식이랑 우유 사러 왔어요! 🥛'],
      laundry: ['캣타워 담요랑 침구 뽀송 건조 돌리기! 🧺'],
      overbudget: ['월세가 너무 올라서 냥이 간식비가 모자라요 😿']
    }
  },
  {
    id: 'fitness_trainer',
    jobName: '깔끔쟁이 트레이너',
    traitTag: '오운완 & 청소왕 💪',
    badgeColor: '#f43f5e',
    minBudget: 125,
    maxBudget: 185,
    requirements: { shower: 2, kitchen: 1 },
    wishText: '유리 샤워부스 수압 빵빵한 욕실 & 요리할 주방 필수!',
    style: {
      hairColor: '#1c1917',
      hairType: 'spiky',
      outfitColor: '#fb7185',
      outfitSub: '#fff1f2',
      accessory: 'headband'
    },
    quotes: {
      ambient: ['채광 좋고 공기 상쾌하고! 최고의 컨디션이야 💪', '샤워부스가 반짝거려서 볼 때마다 기분 최고!'],
      cleaning: ['청소는 최고의 전신 유산소! 먼지 제로 달성 ✨', '구석구석 호텔처럼 반짝이게 닦았다! 🧹'],
      shower: ['운동 후 온수 샤워! 수압이 예술이구만~ 🫧', '오늘 하루 땀방울이 상쾌하게 씻겨 내려간다 🎵'],
      eating: ['오늘만큼은 치팅데이! 바삭 치킨 행복도 MAX 🍗', '깔끔한 인덕션에서 고단백 스테이크 조리! 🥩'],
      working: ['회원님들 건강 식단 플랜 짜는 중! 💻', '쾌적한 책상에서 운동 루틴 연구 중 🔥'],
      sleeping: ['숙면이 곧 근성장! 침대 쿠션감 미쳤다 💤', '푹 자고 내일 아침 상쾌하게 일어나자 🌙'],
      store: ['1층 편의점 프로틴 음료 & 바나나 싹쓸이! 🍌'],
      laundry: ['운동복 매일 빨아도 1층 세탁소 덕에 든든해! 🧺'],
      overbudget: ['비수기라 오른 월세는 예산 한도를 넘네요 💦']
    }
  },
  {
    id: 'webtoon_artist',
    jobName: '야식 러버 웹툰작가',
    traitTag: '마감 후 치킨파티 🎨',
    badgeColor: '#a855f7',
    minBudget: 150,
    maxBudget: 225,
    requirements: { desk: 2, bed: 2, ac: 1 },
    wishText: '넓은 작업 데스크와 마감 후 기절할 폭신한 침대 필수!',
    style: {
      hairColor: '#581c87',
      hairType: 'wavy',
      outfitColor: '#c084fc',
      outfitSub: '#faf5ff',
      accessory: 'beret'
    },
    quotes: {
      ambient: ['방 인테리어가 너무 예뻐서 배경 작화 참고 중! ✨', '새 벽지랑 원목 가구 색감이 동화 속 집 같아요 💕'],
      cleaning: ['마감 끝난 기념 신나는 방 청소 타임~ ✨', '깨끗해진 방을 보니 새 연재 아이디어가 반짝!'],
      shower: ['따끈한 물 맞으니까 굳은 승모근이 사르르 녹아 🫧', '샤워하다가 대박 반전 연출 떠올랐다!! 🎵'],
      eating: ['마감 후 먹는 양념치킨은 세계 최고 진리!! 🍗', '야식 라면에 치즈 한 장 톡~ 너무 행복해! 🍜'],
      working: ['태블릿 펜이 춤을 춘다! 이번 화 별점 9.99 가자 💻', '의자랑 책상이 편해서 손목이 하나도 안 아파!'],
      sleeping: ['원고 업로드 완료!! 푹신한 이불 속에서 동면 시작 💤', '스탠드 불빛이 포근해서 잠이 솔솔 와요 🌙'],
      store: ['마감 당충전용 초코우유랑 젤리 한 보따리 구매! 🍫'],
      laundry: ['작업용 최애 잠옷 뽀송하게 건조기 돌리는 중~ 🧺'],
      overbudget: ['휴재 기간이라 인상된 월세 내기가 빠듯해요 😭']
    }
  },
  {
    id: 'youtuber',
    jobName: '텐션 만렙 유튜버',
    traitTag: '랜선 집들이 스타 🎥',
    badgeColor: '#ec4899',
    minBudget: 190,
    maxBudget: 290,
    requirements: { desk: 2, wallpaper: 2, ac: 2 },
    wishText: '카메라 어디를 비춰도 예쁜 감성 인테리어 & 스튜디오 책상!',
    style: {
      hairColor: '#db2777',
      hairType: 'trendy',
      outfitColor: '#f472b6',
      outfitSub: '#fdf2f8',
      accessory: 'headset'
    },
    quotes: {
      ambient: ['구독자분들이 제 방 어디냐고 댓글 폭발했어요!! 💖', '자연광 햇살이 조명보다 예쁘게 들어와요 ☀️'],
      cleaning: ['룸투어 촬영 전 먼지 한 톨 없이 반짝반짝! ✨', '깨끗한 내 방 볼 때마다 입꼬리 승천~ 🧹'],
      shower: ['모닝 루틴 브이로그! 개운하게 거품 샤워 🫧', '욕실 인테리어까지 호텔급이라 삶의 질 수직상승 🎵'],
      eating: ['오늘의 라이브 메뉴는 바삭바삭 순살치킨 먹방! 🍗', '예쁜 주방에서 만든 홈카페 디저트 최고! 🍰'],
      working: ['구독과 좋아요 알림설정 고맙습니다 여러분~ 🎥💻', '듀얼 모니터로 편집하니까 속도가 2배!! ⚡'],
      sleeping: ['영상 떡상 기원하며 구름 침대에서 꿀잠 💤', '무드등 감성 미쳤다.. 잘 자요 모두 🌙'],
      store: ['편의점 꿀조합 신상 털기 콘텐츠 촬영 겸 쇼핑! 🛍️'],
      laundry: ['촬영 의상 컬렉션 향기롭게 세탁 완료! 🧺'],
      overbudget: ['장비 할부가 남아서 오른 월세는 살짝 부담돼요 💦']
    }
  },
  {
    id: 'startup_ceo',
    jobName: '플렉스 스타트업 대표',
    traitTag: '프리미엄 월세 VIP 👑',
    badgeColor: '#eab308',
    minBudget: 250,
    maxBudget: 420,
    requirements: { wallpaper: 3, bed: 2, shower: 2, desk: 2 },
    wishText: '5성급 부티크 호텔 못지않은 풀옵션 스위트룸을 원합니다!',
    style: {
      hairColor: '#1e1b4b',
      hairType: 'slick',
      outfitColor: '#f59e0b',
      outfitSub: '#fef9c3',
      accessory: 'goldglasses'
    },
    quotes: {
      ambient: ['청담동 부티크 호텔보다 아늑하고 품격 있군요! 👑', '성공한 리더에게 걸맞은 완벽한 인테리어입니다 ✨'],
      cleaning: ['정돈된 공간에서 최고의 의사결정이 나오죠! ✨', '대리석 바닥이 거울처럼 반짝이는군요 🧹'],
      shower: ['히노끼 스파 샤워로 비즈니스 피로 완벽 케어! 🫧', '이 욕실 하나만으로도 월세 가치가 충분합니다 🎵'],
      eating: ['투자 유치 성공 기념 프리미엄 치킨 & 페어링! 🍗', '아일랜드 홈바에서 내린 에스프레소 향이 일품이군 ☕'],
      working: ['글로벌 파트너십 화상 미팅 진행 중 💻📈', '서재 데스크 퀄리티가 대표실 그 이상이군요!'],
      sleeping: ['구스다운 킹베드 덕분에 6시간 자도 개운합니다 💤', '최상의 컨디션을 위한 딥슬립 타임 🌙'],
      store: ['1층 스토어에서 프리미엄 원두와 간식 골든벨! 💳'],
      laundry: ['수트와 캐시미어 니트 프리미엄 세탁 케어! 🧺'],
      overbudget: ['음, 제 예산 한도를 넘는 초고가 월세로군요 🤔']
    }
  }
];

const KOREAN_LAST_NAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '송', '유', '홍'];
const KOREAN_FIRST_NAMES = ['민준', '서연', '도윤', '지우', '시우', '하은', '지호', '수빈', '예준', '민서', '우진', '채원', '현우', '지민', '소율', '연우', '다은', '유진', '태오', '하린'];

// 건물주 돌발 케어 이벤트 정의 (터치 시 즉시 보상 또는 해당 호실 월세 쿨타임 즉시 완료!)
const CARE_BUBBLE_TYPES = [
  {
    id: 'parcel_help',
    icon: '📦',
    label: '택배 찾아주기',
    targetType: 'room',
    effectType: 'instant_rent_or_cash',
    cashReward: 38,
    toastMsg: '📦 문 앞 택배를 전달해주고 감사 보너스와 월세를 즉시 수령했어요!'
  },
  {
    id: 'bulb_replace',
    icon: '💡',
    label: '무드전구 교체',
    targetType: 'room',
    effectType: 'instant_rent',
    cashReward: 25,
    toastMsg: '💡 따뜻한 새 전구로 갈아주자 세입자가 감동해 월세를 바로 입금했어요!'
  },
  {
    id: 'vip_gift',
    icon: '🎁',
    label: '입주민 감사선물',
    targetType: 'room',
    effectType: 'bonus_cash',
    cashReward: 55,
    toastMsg: '🎁 행복해진 단골 입주민이 갓물주님께 깜짝 보너스 선물을 건넸어요!'
  },
  {
    id: 'corridor_sweep',
    icon: '🧹',
    label: '복도 반짝청소',
    targetType: 'room',
    effectType: 'bonus_cash',
    cashReward: 35,
    toastMsg: '🧹 복도와 현관을 반짝반짝 쓸어 건물 가치가 올라가고 보너스를 받았어요!'
  },
  {
    id: 'store_promo',
    icon: '🥤',
    label: '편의점 시식지원',
    targetType: 'shop',
    shopId: 'store',
    effectType: 'bonus_cash',
    cashReward: 42,
    toastMsg: '🏪 1층 편의점 타임세일 대박! 추가 상가 수익이 팡팡 터졌어요!'
  },
  {
    id: 'laundry_coin',
    icon: '🪙',
    label: '세탁기 동전회수',
    targetType: 'shop',
    shopId: 'laundry',
    effectType: 'bonus_cash',
    cashReward: 46,
    toastMsg: '🧺 코인세탁소 동전함이 가득 차 묵직한 보너스 매출을 수거했어요!'
  }
];

// 메인 가이드 퀘스트 목록
const MAIN_QUESTS = [
  {
    id: 'q1',
    title: '101호 화사한 파스텔 벽지 도배하기',
    desc: '101호를 터치해 [벽지/장판]을 Lv.1 이상으로 리모델링하세요!',
    focusRoom: '101',
    reward: 120,
    check: (state) => {
      const r = state.rooms.find((rm) => rm.id === '101');
      return r && r.furniture.wallpaper >= 1;
    }
  },
  {
    id: 'q2',
    title: '101호 첫 귀염뽀짝 미니미 입주시키기',
    desc: '101호 관리창에서 [세입자 구하기]를 눌러 첫 입주 계약을 맺어보세요!',
    focusRoom: '101',
    reward: 150,
    check: (state) => {
      const r = state.rooms.find((rm) => rm.id === '101');
      return r && !!r.tenant;
    }
  },
  {
    id: 'q3',
    title: '101호 온수 샤워부스 설치해주기',
    desc: '입주민이 거품 샤워를 즐길 수 있도록 101호 [욕실 샤워부스]를 Lv.1 이상 설치하세요.',
    focusRoom: '101',
    reward: 160,
    check: (state) => {
      const r = state.rooms.find((rm) => rm.id === '101');
      return r && r.furniture.shower >= 1;
    }
  },
  {
    id: 'q4',
    title: '101호 [🌸 파스텔 스윗홈] 세트 완성하기',
    desc: '101호의 6종 가구를 모두 Lv.1 이상 설치해 [월세 +12% 세트 효과]를 발동시키세요!',
    focusRoom: '101',
    reward: 220,
    check: (state) => {
      const r = state.rooms.find((rm) => rm.id === '101');
      return r && Object.values(r.furniture).every((lv) => lv >= 1);
    }
  },
  {
    id: 'q5',
    title: '102호도 꾸며서 시간차 월세 콤보 만들기',
    desc: '옆방 102호에도 세입자를 입주시켜 방마다 따로 터지는 월세 타이머를 경험해보세요!',
    focusRoom: '102',
    reward: 240,
    check: (state) => state.rooms.filter((rm) => !!rm.tenant).length >= 2
  },
  {
    id: 'q6',
    title: '코지 우드 업그레이드 & 상위 입주민 맞이',
    desc: '월세 100만원 이상 호실을 만들거나 기존 세입자 퇴거 후 고소득 세입자와 계약해보세요!',
    focusRoom: '101',
    reward: 300,
    check: (state) => state.stats.evictions >= 1 || state.rooms.some((rm) => rm.unlocked && calcRoomMarketRent(rm) >= 100)
  },
  {
    id: 'q7',
    title: '1층 단지 내 상가(편의점/세탁소) 확장하기',
    desc: '1층 [24시 미니미 편의점] 또는 [워시퐁 코인세탁소]를 Lv.2로 업그레이드하세요!',
    focusShop: 'store',
    reward: 320,
    check: (state) => state.shops.store.level >= 2 || state.shops.laundry.level >= 2
  },
  {
    id: 'q8',
    title: '103호 개방하고 1층 3호실 만실 달성!',
    desc: '103호를 분양 오픈하고 101~103호 모두 입주민을 채워보세요.',
    focusRoom: '103',
    reward: 420,
    check: (state) => ['101', '102', '103'].every((id) => {
      const r = state.rooms.find((rm) => rm.id === id);
      return r && r.unlocked && !!r.tenant;
    })
  },
  {
    id: 'q9',
    title: '2층 햇살 로열층(201호) 분양 오픈하기',
    desc: '2층 201호를 개방해 미니미 하우스를 복층 타운으로 확장하세요!',
    focusRoom: '201',
    reward: 520,
    check: (state) => {
      const r = state.rooms.find((rm) => rm.id === '201');
      return r && r.unlocked;
    }
  },
  {
    id: 'q10',
    title: '꿈의 [👑 로얄 부티크 스위트] 완성!',
    desc: '어느 호실이든 6종 시설을 모두 Lv.3으로 업그레이드해 최고급 풀옵션 스위트를 완성하세요!',
    focusRoom: '101',
    reward: 1000,
    check: (state) => state.rooms.some((rm) =>
      rm.unlocked && Object.values(rm.furniture).every((lv) => lv >= 3)
    )
  }
];

// 세입자 현실 민원 & 소통 카톡 이벤트
const KAKAO_EVENTS = [
  {
    id: 'water_pressure',
    title: '샤워기 필터 & 수압 케어 요청',
    message: '집주인님~! 욕실 샤워기에 비타민 향기 필터랑 수압 헤드를 달면 더 상쾌할 것 같은데 지원 가능할까요? 🫧✨',
    choices: [
      {
        label: '💸 아로마 비타민 수압 샤워기 풀세트 설치 (-30만)',
        cost: 30,
        happinessDelta: +24,
        bonusGold: 50,
        reply: '우와!! 향기 솔솔 수압 최고예요!! 감사 선물로 보너스 입금드렸어요 💕'
      },
      {
        label: '🔧 직접 올라가서 수압 밸브 빵빵하게 조절 (무료)',
        cost: 0,
        happinessDelta: +8,
        bonusGold: 10,
        reply: '오 물줄기가 훨씬 세졌어요! 바로 봐주셔서 감사합니다 ㅎㅎ'
      },
      {
        label: '🙈 다음에 교체 주기에 봐주겠다고 넘기기',
        cost: 0,
        happinessDelta: -14,
        bonusGold: 0,
        reply: '조금 아쉽네요 ㅠㅠ 다음엔 꼭 부탁드려요!'
      }
    ]
  },
  {
    id: 'sun_curtain',
    title: '감성 쉬폰 커튼 & 방음 패드 건의',
    message: '갓물주님! 방이 너무 예쁜데 밤에 복도 소리가 조금 들려서요~ 도어 방음 패드 좀 붙여주실 수 있나요? 🌙',
    choices: [
      {
        label: '🛡️ 프리미엄 방음 패드 + 아로마 디퓨저 선물 (-38만)',
        cost: 38,
        happinessDelta: +26,
        bonusGold: 60,
        reply: '세상에 너무 조용하고 향기까지 최고예요!! 평생 살고 싶은 집이에요 🥹💖'
      },
      {
        label: '📢 입주민 매너 타임 안내 공지 띄우기 (무료)',
        cost: 0,
        happinessDelta: +8,
        bonusGold: 12,
        reply: '센스 있는 공지 덕분에 밤마다 조용해졌어요! 감사합니다 🙏'
      },
      {
        label: '🙈 괜찮아지겠지 하고 읽씹하기',
        cost: 0,
        happinessDelta: -16,
        bonusGold: 0,
        reply: '잠귀가 밝아서 조금 피곤하네요 ㅠㅠ'
      }
    ]
  },
  {
    id: 'ac_care',
    title: '에어컨 피톤치드 살균 케어 요청',
    message: '사장님! 날씨가 포근해져서 에어컨 켜기 전에 상쾌하게 스팀 클리닝 한번 받으면 좋을 것 같아요 🍃',
    choices: [
      {
        label: '✨ 친환경 피톤치드 분해 세척 서비스 부르기 (-35만)',
        cost: 35,
        happinessDelta: +24,
        bonusGold: 55,
        reply: '숲속 바람처럼 상쾌해요!! 역시 갓물주님 센스 최고입니다 🌿💚'
      },
      {
        label: '🧴 전용 필터 세정제 문고리에 걸어두기 (-5만)',
        cost: 5,
        happinessDelta: +7,
        bonusGold: 0,
        reply: '직접 씻어서 끼웠더니 훨씬 깨끗해졌어요! 고맙습니다~'
      },
      {
        label: '🙈 창문 활짝 열고 환기하라고 답장하기',
        cost: 0,
        happinessDelta: -14,
        bonusGold: 0,
        reply: '에구 먼지가 조금 날리네요 콜록 💦'
      }
    ]
  },
  {
    id: 'parcel_cctv',
    title: '새벽 배송 안심 벨 & 조명 요청',
    message: '집주인님~ 새벽 치킨이랑 신선 택배 시킬 때 복도 센서등이 더 밝고 예뻤으면 좋겠어요! 📦🍗',
    choices: [
      {
        label: '💡 웜톤 코지 센서등 & 스마트 도어벨 업그레이드 (-40만)',
        cost: 40,
        happinessDelta: +26,
        bonusGold: 65,
        reply: '복도까지 카페처럼 환하고 든든해요!! 보너스 팁 쏩니다 🏡✨'
      },
      {
        label: '📦 1층 로비 무인택배함 비밀번호 안내하기 (무료)',
        cost: 0,
        happinessDelta: +8,
        bonusGold: 0,
        reply: '맞다 1층에 예쁜 무인택배함이 있었죠! 잘 쓸게요~'
      },
      {
        label: '🙈 지금도 충분히 밝다고 넘기기',
        cost: 0,
        happinessDelta: -12,
        bonusGold: 0,
        reply: '밤엔 살짝 어두워서 아쉬워요 ㅠㅠ'
      }
    ]
  }
];

// 호실 세트 효과 판별 헬퍼 (모든 가구가 Lv.1 / Lv.2 / Lv.3 이상일 때 발동!)
function getRoomThemeSet(room) {
  const levels = Object.values(room.furniture);
  const minLv = Math.min(...levels);
  for (const setDef of THEME_SETS) {
    if (minLv >= setDef.minLevel) return setDef;
  }
  return null;
}

// 호실 적정 월세 계산 헬퍼 (기본 월세 + 가구 보너스 합 + 테마 세트 % 보너스!)
function calcRoomMarketRent(room) {
  let subtotal = room.baseRent;
  for (const key of Object.keys(FURNITURE_TREE)) {
    const lv = room.furniture[key] || 0;
    subtotal += FURNITURE_TREE[key].levels[lv].rentBonus;
  }
  const activeSet = getRoomThemeSet(room);
  if (activeSet) {
    subtotal = Math.round(subtotal * (1 + activeSet.bonusPct / 100));
  }
  return subtotal;
}

// 호실 인테리어 등급 배지 헬퍼
function getRoomInteriorGrade(room) {
  const activeSet = getRoomThemeSet(room);
  if (activeSet) {
    return {
      grade: activeSet.id,
      name: activeSet.badgeText,
      badgeClass: activeSet.badgeClass
    };
  }
  const levels = Object.values(room.furniture);
  const sum = levels.reduce((a, b) => a + b, 0);
  const wp = room.furniture.wallpaper || 0;
  if (wp >= 3 || sum >= 13) {
    return {
      grade: 'luxury',
      name: '✨ 부티크 감성 인테리어',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-400'
    };
  }
  if (wp >= 2 || sum >= 7) {
    return {
      grade: 'wood',
      name: '🌿 따스한 우드톤 원룸',
      badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-400'
    };
  }
  if (wp >= 1 || sum >= 2) {
    return {
      grade: 'pastel',
      name: '🌸 화사한 파스텔 룸',
      badgeClass: 'bg-pink-100 text-rose-900 border-pink-300'
    };
  }
  return {
    grade: 'slum',
    name: '🏚️ 리모델링 전 구형 원룸',
    badgeClass: 'bg-stone-200 text-stone-700 border-stone-400'
  };
}
