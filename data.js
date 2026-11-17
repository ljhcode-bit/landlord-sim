// =========================================================
// 【갓물주 라이프: 미니미 하우스 3D (The Tenants Edition)】 데이터 모듈 (data.js)
// 3D 쿼터뷰 건축 좌표, 가구 리노베이션 트리, 테마 세트, 8종 입주민, 돌발 케어, 퀘스트
// =========================================================

const WORLD_3D_CONFIG = {
  roomWidth: 8.4,
  roomDepth: 6.4,
  wallHeight: 3.1,
  frontCutawayHeight: 0.48,
  stairX: 13.8
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

// 호실 내 3D 로컬 이동 스팟 (호실 중심 (0, 0, 0) 기준: X -4.2..+4.2, Z -3.2..+3.2)
const ROOM_3D_LOCAL_SPOTS = {
  door: { x: 0.0, z: 2.85 },
  center: { x: 0.1, z: 0.45 },
  cleanSpots: [
    { x: -1.4, z: 0.6 },
    { x: 1.1, z: 0.9 },
    { x: -0.2, z: 1.8 }
  ],
  bed: { x: -2.2, z: -1.1 },
  shower: { x: 2.4, z: -1.3 },
  kitchen: { x: -2.1, z: 1.5 },
  desk: { x: 2.1, z: 1.4 },
  sofa: { x: 0.1, z: 0.2 }
};

// 1층(101~103호) & 2층(201~203호) 계단식 테라스 3D 호실 좌표 및 독립 월세 주기
const INITIAL_ROOMS = [
  {
    id: '101',
    name: '101호',
    floor: 1,
    cx: -8.6,
    cy: 3.6,
    cz: 2.8,
    corridorZ: 6.7,
    rentCycleSec: 10,
    unlocked: true,
    unlockCost: 0,
    baseRent: 30,
    furniture: { wallpaper: 0, bed: 0, shower: 0, kitchen: 0, desk: 0, ac: 0 }
  },
  {
    id: '102',
    name: '102호',
    floor: 1,
    cx: 0.0,
    cy: 3.6,
    cz: 2.8,
    corridorZ: 6.7,
    rentCycleSec: 12,
    unlocked: true,
    unlockCost: 0,
    baseRent: 30,
    furniture: { wallpaper: 0, bed: 0, shower: 0, kitchen: 0, desk: 0, ac: 0 }
  },
  {
    id: '103',
    name: '103호',
    floor: 1,
    cx: 8.6,
    cy: 3.6,
    cz: 2.8,
    corridorZ: 6.7,
    rentCycleSec: 11,
    unlocked: false,
    unlockCost: 150,
    baseRent: 34,
    furniture: { wallpaper: 0, bed: 0, shower: 0, kitchen: 0, desk: 0, ac: 0 }
  },
  {
    id: '201',
    name: '201호',
    floor: 2,
    cx: -8.6,
    cy: 7.2,
    cz: -4.4,
    corridorZ: -0.5,
    rentCycleSec: 13,
    unlocked: false,
    unlockCost: 250,
    baseRent: 38,
    furniture: { wallpaper: 0, bed: 0, shower: 0, kitchen: 0, desk: 0, ac: 0 }
  },
  {
    id: '202',
    name: '202호',
    floor: 2,
    cx: 0.0,
    cy: 7.2,
    cz: -4.4,
    corridorZ: -0.5,
    rentCycleSec: 11.5,
    unlocked: false,
    unlockCost: 400,
    baseRent: 42,
    furniture: { wallpaper: 0, bed: 0, shower: 0, kitchen: 0, desk: 0, ac: 0 }
  },
  {
    id: '203',
    name: '203호',
    floor: 2,
    cx: 8.6,
    cy: 7.2,
    cz: -4.4,
    corridorZ: -0.5,
    rentCycleSec: 12.5,
    unlocked: false,
    unlockCost: 600,
    baseRent: 48,
    furniture: { wallpaper: 0, bed: 0, shower: 0, kitchen: 0, desk: 0, ac: 0 }
  }
];

// 지상 1층 상가 아케이드 3D 데이터 (24시 미니미 편의점, 워시퐁 코인세탁소)
const INITIAL_SHOPS = {
  store: {
    id: 'store',
    name: '24시 미니미 편의점',
    icon: '🏪',
    cx: -7.6,
    cy: 0.3,
    cz: 10.6,
    w: 10.2,
    d: 5.4,
    doorX: -7.6,
    doorZ: 13.5,
    spots: [
      { x: -9.4, z: 11.2 },
      { x: -5.8, z: 11.4 }
    ],
    level: 1,
    levels: {
      1: {
        title: '아기자기 동네 3D 편의점',
        desc: '음료 쇼케이스 냉장고와 삼각김밥 매대, POS 계산대가 갖춰진 1층 편의점',
        visitProfit: 12,
        upgradeCost: 0
      },
      2: {
        title: '원두향 카페 & 핫푸드 스토어',
        desc: '따뜻한 간식 쇼케이스와 즉석 원두머신 증설로 객단가 대폭 상승!',
        visitProfit: 26,
        upgradeCost: 220
      },
      3: {
        title: '프리미엄 스마트 플래그십 마트',
        desc: '와인 쇼케이스와 더블 냉장 부스까지 완비된 핫플레이스 편의점!',
        visitProfit: 48,
        upgradeCost: 520
      }
    }
  },
  laundry: {
    id: 'laundry',
    name: '워시퐁 24시 코인세탁소',
    icon: '🧺',
    cx: 7.6,
    cy: 0.3,
    cz: 10.6,
    w: 10.2,
    d: 5.4,
    doorX: 7.6,
    doorZ: 13.5,
    spots: [
      { x: 5.8, z: 11.2 },
      { x: 9.2, z: 11.2 }
    ],
    level: 1,
    levels: {
      1: {
        title: '버블 3연동 드럼 코인세탁소',
        desc: '투명 유리창 안에서 빨래가 빙글빙글 도는 3연동 드럼세탁기 부스',
        visitProfit: 14,
        upgradeCost: 0
      },
      2: {
        title: '초고속 스팀 건조 워시존',
        desc: '상단 건조기 타워와 대형 세제 자판기 추가로 세탁 매출 2배!',
        visitProfit: 30,
        upgradeCost: 240
      },
      3: {
        title: '워시퐁 부티크 런드리 라운지',
        desc: '세탁 대기 소파 라운지와 골드 드럼 풀세트를 갖춘 프리미엄 런드리!',
        visitProfit: 56,
        upgradeCost: 560
      }
    }
  }
};

// '더 테넌츠' 감성 6종 리노베이션 업그레이드 트리
const FURNITURE_TREE = {
  wallpaper: {
    key: 'wallpaper',
    label: '바닥 마루 & 벽체',
    icon: '🪵',
    levels: [
      {
        level: 0,
        tier: '철거 전',
        name: '갈라진 시멘트 바닥 & 곰팡이 벽지',
        desc: '먼지 더미와 습기 얼룩이 남아 리모델링이 시급한 기본 상태',
        cost: 0,
        rentBonus: 0,
        comfort: 0
      },
      {
        level: 1,
        tier: '파스텔 스윗',
        name: '메이플 우드 마루 & 피치 파스텔 벽',
        desc: '먼지를 싹 치우고 화사한 파스텔톤 벽과 밝은 원목 마루 시공',
        cost: 40,
        rentBonus: 14,
        comfort: 12
      },
      {
        level: 2,
        tier: '코지 우드',
        name: '오크 헤링본 마루 & 크림 웨인스코팅',
        desc: '누구나 살고 싶어지는 따뜻한 헤링본 우드 마루와 입체 몰딩 벽면',
        cost: 140,
        rentBonus: 32,
        comfort: 24
      },
      {
        level: 3,
        tier: '로얄 부티크',
        name: '비앙코 골드 대리석 & 호텔 웨인스코팅',
        desc: '은은한 광택의 샴페인 대리석 타일과 로얄 골드 몰딩 마감',
        cost: 350,
        rentBonus: 64,
        comfort: 40
      }
    ]
  },
  bed: {
    key: 'bed',
    label: '침대 & 무드스탠드',
    icon: '🛏️',
    levels: [
      {
        level: 0,
        tier: '미설치',
        name: '낡은 바닥 매트와 구겨진 담요',
        desc: '침대 프레임 없이 차가운 바닥에 얇은 요만 깔린 상태',
        cost: 0,
        rentBonus: 0,
        comfort: 0
      },
      {
        level: 1,
        tier: '파스텔 스윗',
        name: '원목 싱글 침대 & 협탁 스탠드 조명',
        desc: '원목 다리 프레임, 폭신한 코랄 이불, 따뜻한 빛을 내는 미니 스탠드',
        cost: 50,
        rentBonus: 13,
        comfort: 12
      },
      {
        level: 2,
        tier: '코지 우드',
        name: '북유럽 퀸 원목침대 & 코지 나이트스탠드',
        desc: '두툼한 원목 헤드보드, 세이지 그린 구름 침구, 포근한 무드등 세트',
        cost: 160,
        rentBonus: 29,
        comfort: 22
      },
      {
        level: 3,
        tier: '로얄 부티크',
        name: '호텔 킹사이즈 베드 & 골드 크리스탈 램프',
        desc: '벨벳 쿠션 헤드보드와 호텔식 더블 베개, 황금빛 무드 램프',
        cost: 380,
        rentBonus: 58,
        comfort: 36
      }
    ]
  },
  shower: {
    key: 'shower',
    label: '유리부스 욕실',
    icon: '🚿',
    levels: [
      {
        level: 0,
        tier: '미설치',
        name: '구형 양변기 & 녹슨 세면대',
        desc: '샤워 파티션이 없어 물이 다 튀는 낡은 기본 욕실',
        cost: 0,
        rentBonus: 0,
        comfort: 0
      },
      {
        level: 1,
        tier: '파스텔 스윗',
        name: '민트 타일 욕실 & 반투명 샤워 파티션',
        desc: '단차 타일 바닥, 유리 파티션, 온수 해바라기 샤워기와 거울 세면대',
        cost: 60,
        rentBonus: 16,
        comfort: 15
      },
      {
        level: 2,
        tier: '코지 우드',
        name: '강화유리 샤워부스 & 우드 세면대 세트',
        desc: '메탈 프레임 강화유리 부스, 원목 하부장 세면대, 대형 원형 거울',
        cost: 180,
        rentBonus: 34,
        comfort: 26
      },
      {
        level: 3,
        tier: '로얄 부티크',
        name: '골드 프레임 레인샤워 & 호텔 욕실 풀세트',
        desc: '골드 메탈 유리부스, 골드 해바라기 수전, 대리석 세면대와 스파 욕실',
        cost: 420,
        rentBonus: 66,
        comfort: 42
      }
    ]
  },
  kitchen: {
    key: 'kitchen',
    label: '주방 & 냉장고',
    icon: '🍳',
    levels: [
      {
        level: 0,
        tier: '미설치',
        name: '낡은 미니 싱크박스 하나',
        desc: '냉장고도 없고 조리 공간도 좁은 임시 싱크대',
        cost: 0,
        rentBonus: 0,
        comfort: 0
      },
      {
        level: 1,
        tier: '파스텔 스윗',
        name: '파스텔 싱크대 + 크림 미니 냉장고',
        desc: '대리석 상판, 구즈넥 수전, 손잡이 달린 귀여운 2도어 냉장고 조립',
        cost: 55,
        rentBonus: 13,
        comfort: 12
      },
      {
        level: 2,
        tier: '코지 우드',
        name: '원목 & 화이트 키친 + 레트로 냉장고',
        desc: '2구 인덕션과 냄비, 민트 레트로 냉장고가 어우러진 감성 주방',
        cost: 165,
        rentBonus: 28,
        comfort: 22
      },
      {
        level: 3,
        tier: '로얄 부티크',
        name: '비앙코 대리석 주방 + 양문형 골드 냉장고',
        desc: '하이엔드 마블 상판, 골드 수전, 에스프레소 머신과 대형 냉장고',
        cost: 390,
        rentBonus: 56,
        comfort: 36
      }
    ]
  },
  desk: {
    key: 'desk',
    label: '소파 & 데스크존',
    icon: '🛋️',
    levels: [
      {
        level: 0,
        tier: '미설치',
        name: '작은 나무 상자 테이블',
        desc: '소파도 러그도 없이 덩그러니 놓인 낡은 상자 책상',
        cost: 0,
        rentBonus: 0,
        comfort: 0
      },
      {
        level: 1,
        tier: '파스텔 스윗',
        name: '원형 러그 + 1인 코지 소파 + 노트북 책상',
        desc: '폭신한 패브릭 소파와 쿠션, 원형 러그, 노트북 데스크와 체어 세트',
        cost: 45,
        rentBonus: 12,
        comfort: 12
      },
      {
        level: 2,
        tier: '코지 우드',
        name: '패브릭 2인 소파 + 원목 워크스테이션',
        desc: '팔걸이·쿠션 분리형 아늑한 소파와 와이드 모니터 원목 책상',
        cost: 170,
        rentBonus: 30,
        comfort: 24
      },
      {
        level: 3,
        tier: '로얄 부티크',
        name: '벨벳 라운지 소파 + 듀얼모니터 스튜디오',
        desc: '부티크 벨벳 소파, 골드 테이블, 초고성능 듀얼 모니터 서재',
        cost: 430,
        rentBonus: 62,
        comfort: 38
      }
    ]
  },
  ac: {
    key: 'ac',
    label: '창호 & 에어컨/화분',
    icon: '🪴',
    levels: [
      {
        level: 0,
        tier: '미설치',
        name: '커튼 없는 낡은 창틀',
        desc: '에어컨도 화분도 없는 휑한 창가',
        cost: 0,
        rentBonus: 0,
        comfort: 0
      },
      {
        level: 1,
        tier: '파스텔 스윗',
        name: '쉬폰 커튼 창문 + 벽걸이 에어컨 + 화분',
        desc: '햇살이 스며드는 커튼 창호, 시원한 에어컨, 초록 잎사귀 화분',
        cost: 50,
        rentBonus: 12,
        comfort: 12
      },
      {
        level: 2,
        tier: '코지 우드',
        name: '우드 블라인드 창 + 무풍 에어컨 + 몬스테라',
        desc: '풍성한 몬스테라 화분과 감성 벽 액자, 무풍 인버터 냉방기',
        cost: 155,
        rentBonus: 27,
        comfort: 22
      },
      {
        level: 3,
        tier: '로얄 부티크',
        name: '골드 드레이프 창 + 스마트 공조기 + 올리브트리',
        desc: '부티크 골드 커튼, 하이엔드 청정 에어컨, 유럽풍 대형 화분',
        cost: 370,
        rentBonus: 54,
        comfort: 36
      }
    ]
  }
};

// 개성 만점 8종 3D 미니미 입주민 직업/특성
const TENANT_JOBS = [
  {
    id: 'exam_student',
    jobName: '열공 공시생',
    traitTag: '형광펜 수집가 📚',
    badgeColor: '#3b82f6',
    minBudget: 55,
    maxBudget: 86,
    requirements: { wallpaper: 1 },
    wishText: '깔끔한 마루에서 집중해서 공부하고 싶어요!',
    style: {
      hairColor: '#292524',
      outfitColor: '#3b82f6',
      pantsColor: '#1e3a8a',
      accessory: 'glasses'
    },
    quotes: {
      ambient: ['새 원목 마루 냄새 너무 좋다~ 🌸', '햇살이 따뜻해서 공부가 술술 돼요 ☀️'],
      cleaning: ['공부 전 먼지 싹싹 청소 완료! ✨', '깨끗한 방에서 기분 좋게 시작! 🧹'],
      shower: ['따끈한 샤워부스 덕분에 피로 회복! 🫧', '온수 수압 최고예요~ 🎵'],
      eating: ['미니 주방에서 끓인 라면 꿀맛! 🍜', '합격 기원 치킨 야식 타임 🍗'],
      working: ['노트북 앞에서 인강 열공 중!! 💻', '이번 시험 무조건 합격 가즈아 ✍️'],
      sleeping: ['침대가 푹신해서 꿀잠 자요 💤', '스탠드 불빛이 포근해요 🌙'],
      store: ['1층 편의점 삼각김밥 & 우유 구매! 🍙'],
      laundry: ['트레이닝복 뽀송하게 세탁 완료! 🧺'],
      overbudget: ['집주인님.. 수험생 예산으론 오른 월세가 버거워요 😭']
    }
  },
  {
    id: 'college_student',
    jobName: '감성 대학생',
    traitTag: '집꾸미기 덕후 🌷',
    badgeColor: '#10b981',
    minBudget: 66,
    maxBudget: 102,
    requirements: { wallpaper: 1, bed: 1 },
    wishText: '폭신한 침대와 예쁜 조명이 있는 자취방 로망!',
    style: {
      hairColor: '#78350f',
      outfitColor: '#10b981',
      pantsColor: '#065f46',
      accessory: 'cap'
    },
    quotes: {
      ambient: ['와 진짜 더 테넌츠 감성 드림하우스예요! 💕', '소파랑 러그가 너무 귀여워요!'],
      cleaning: ['친구들 놀러 오기 전에 반짝 대청소! ✨', '마루가 반질반질 윤이 나요 🧹'],
      shower: ['향기로운 바디워시 거품 샤워~ 🫧', '유리 샤워부스 너무 깔끔해요 🎵'],
      eating: ['과제 끝내고 먹는 바삭 치킨! 🍗', '주방에서 토스트 브런치 뚝딱 🥞'],
      working: ['예쁜 책상에서 과제하니까 능률 200%! 💻', '자취방 브이로그 편집 중 ✨'],
      sleeping: ['푹신한 침구 속에서 구름 같은 숙면 💤', '무드등 켜놓고 굿나잇 🌙'],
      store: ['1층 편의점 신상 디저트 겟! 🍰'],
      laundry: ['이불 빨래 돌리러 1층 세탁소 왔어요! 🧺'],
      overbudget: ['알바비로는 인상된 월세가 조금 힘들어요 💦']
    }
  },
  {
    id: 'dev_worker',
    jobName: '커피 중독 개발자',
    traitTag: '아아 수혈러 ☕',
    badgeColor: '#6366f1',
    minBudget: 95,
    maxBudget: 145,
    requirements: { desk: 1, shower: 1 },
    wishText: '코딩할 데스크존과 온수 샤워부스는 필수입니다!',
    style: {
      hairColor: '#1e293b',
      outfitColor: '#6366f1',
      pantsColor: '#312e81',
      accessory: 'glasses'
    },
    quotes: {
      ambient: ['채광도 좋고 소파도 편해서 재택 천국이네요! ☕', '조용하고 아늑해서 버그가 다 잡혀요!'],
      cleaning: ['데스크 주변 먼지 클린하게 정리! ✨', '방도 코드도 깔끔하게 리팩토링 🧹'],
      shower: ['뜨끈한 샤워하다 알고리즘 해법 발견!! 💡', '야근 피로가 싹 씻겨 내려간다~ 🫧'],
      eating: ['배포 완료 기념 치킨 플렉스! 🍗', '냉장고에서 시원한 음료 꺼내 마시기 🥤'],
      working: ['타닥타닥.. 커피 한 모금에 코드 백 줄! 💻', '쾌적한 홈오피스 최고예요 ⚡'],
      sleeping: ['서버 정상! 푹신한 침대에서 꿀잠 💤', '충전 모드 돌입.. Zzz 🌙'],
      store: ['1층 편의점 아이스 아메리카노 수혈! ☕'],
      laundry: ['후드티랑 셔츠 뽀송 건조 완료! 🧺'],
      overbudget: ['연봉 협상 전이라 인상된 월세는 벅차네요 😢']
    }
  },
  {
    id: 'cat_butler',
    jobName: '고양이 집사 디자이너',
    traitTag: '치즈냥 동거중 🐱',
    badgeColor: '#f59e0b',
    minBudget: 115,
    maxBudget: 172,
    requirements: { wallpaper: 2, ac: 1 },
    wishText: '냥이와 뒹굴 따뜻한 헤링본 마루 & 화분/에어컨 희망!',
    style: {
      hairColor: '#9a3412',
      outfitColor: '#f59e0b',
      pantsColor: '#78350f',
      accessory: 'catpin',
      hasCat: true
    },
    quotes: {
      ambient: ['원목 러그 위에서 우리 치즈냥이가 골골송 불러요 🐱', '햇살 가득한 우드 인테리어 너무 행복해요!'],
      cleaning: ['냥이 털 싹싹 쓸어 담기~ 깨끗해졌다! ✨', '반짝반짝 코지 하우스 유지 중 🧹'],
      shower: ['따뜻한 온수 샤워 힐링 타임~ 🫧', '욕실 타일 색감이 너무 예뻐요 🎵'],
      eating: ['냥이는 츄르 주고 나는 치킨 파티! 🍗', '예쁜 싱크대에서 파스타 요리 완료 🍝'],
      working: ['색감 좋은 조명 아래서 디자인 작업 중 🎨', '소파에 앉아 아이패드 스케치 💻'],
      sleeping: ['냥이랑 폭신한 침대에서 꿀잠 💤', '따스한 밤이에요 굿나잇 🌙'],
      store: ['1층 편의점에서 우유랑 간식 사왔어요! 🥛'],
      laundry: ['고양이 담요 뽀송뽀송 세탁 완료! 🧺'],
      overbudget: ['월세가 너무 올라서 츄르 사줄 돈이 부족해요 😿']
    }
  },
  {
    id: 'fitness_trainer',
    jobName: '깔끔쟁이 트레이너',
    traitTag: '오운완 & 청소왕 💪',
    badgeColor: '#f43f5e',
    minBudget: 135,
    maxBudget: 195,
    requirements: { shower: 2, kitchen: 1 },
    wishText: '강화유리 샤워부스와 단백질 요리할 주방·냉장고 필수!',
    style: {
      hairColor: '#18181b',
      outfitColor: '#f43f5e',
      pantsColor: '#881337',
      accessory: 'headband'
    },
    quotes: {
      ambient: ['공기 상쾌하고 동선 넓고! 최고의 하우스 💪', '유리 샤워부스 퀄리티 대만족입니다!'],
      cleaning: ['청소도 전신 유산소다! 먼지 제로 달성 ✨', '바닥 광택까지 완벽하군 🧹'],
      shower: ['운동 후 레인샤워! 수압이 예술이야~ 🫧', '근육 피로가 싹 풀리는 온수 샤워 🎵'],
      eating: ['치팅데이엔 역시 바삭 순살치킨이지! 🍗', '냉장고 가득 닭가슴살 & 샐러드 든든! 🥗'],
      working: ['회원님들 바디프로필 식단표 작성 중 💻', '쾌적한 책상에서 루틴 연구 🔥'],
      sleeping: ['숙면이 곧 근성장! 매트리스 탄력 최고 💤', '내일도 활기차게 굿나잇 🌙'],
      store: ['1층 편의점 프로틴 음료 싹쓸이! 🥤'],
      laundry: ['운동복 매일 빨아도 1층 세탁소 덕에 편해요! 🧺'],
      overbudget: ['비수기라 오른 월세는 예산을 초과하네요 💦']
    }
  },
  {
    id: 'webtoon_artist',
    jobName: '야식 매니아 웹툰작가',
    traitTag: '마감 후 치킨파티 🎨',
    badgeColor: '#a855f7',
    minBudget: 160,
    maxBudget: 240,
    requirements: { desk: 2, bed: 2, ac: 1 },
    wishText: '넓은 작업 데스크와 소파, 마감 후 기절할 침대 필수!',
    style: {
      hairColor: '#581c87',
      outfitColor: '#a855f7',
      pantsColor: '#4c1d95',
      accessory: 'beret'
    },
    quotes: {
      ambient: ['내 방이 너무 예뻐서 3D 웹툰 배경으로 참고 중! ✨', '웨인스코팅 벽이랑 스탠드 조명 분위기 최고 💕'],
      cleaning: ['마감 끝난 기념 기분 좋은 방 청소~ ✨', '깨끗해진 방에서 소파 뒹굴기 최고!'],
      shower: ['따끈한 샤워 중에 대박 에피소드 떠올랐다!! 🫧', '굳은 어깨가 사르르 녹아요 🎵'],
      eating: ['마감 후 먹는 양념치킨은 우주의 진리!! 🍗', '야식 라면 끓여 먹는 재미 🍜'],
      working: ['와이드 모니터로 원고 채색 중! 마감 세이프 💻', '소파랑 의자가 둘 다 너무 편해요!'],
      sleeping: ['원고 업로드 완료!! 구름 침대 속으로 다이빙 💤', '포근한 조명 아래 숙면 🌙'],
      store: ['마감 당충전용 초콜릿 & 커피 한 아름 구매! 🍫'],
      laundry: ['일주일 입은 작업복 뽀송하게 세탁 중~ 🧺'],
      overbudget: ['휴재 달이라 인상된 월세가 조금 버거워요 😭']
    }
  },
  {
    id: 'youtuber',
    jobName: '텐션 만렙 유튜버',
    traitTag: '랜선 집들이 스타 🎥',
    badgeColor: '#ec4899',
    minBudget: 205,
    maxBudget: 310,
    requirements: { desk: 2, wallpaper: 2, ac: 2 },
    wishText: '어느 각도에서 찍어도 예쁜 3D 인테리어 & 방송 데스크!',
    style: {
      hairColor: '#db2777',
      outfitColor: '#ec4899',
      pantsColor: '#831843',
      accessory: 'headset'
    },
    quotes: {
      ambient: ['랜선 집들이 영상 조회수 100만 터졌어요!! 💖', '자연광 햇살이랑 무드등 색감 미쳤다 ☀️'],
      cleaning: ['촬영 전 먼지 한 톨 없이 클린 케어! ✨', '카메라 앵글 어디든 반짝반짝~ 🧹'],
      shower: ['겟레디윗미 촬영 전 상쾌한 샤워 타임 🫧', '욕실까지 호텔 부럽지 않아요 🎵'],
      eating: ['구독자 여러분! 오늘 야식 먹방은 치킨입니다 🍗', '예쁜 키친에서 홈카페 브이로그 🍰'],
      working: ['듀얼 모니터 스튜디오에서 4K 편집 중! 🎥💻', '구독과 좋아요 알림설정 고맙습니다~ 🔥'],
      sleeping: ['라이브 끝! 푹신한 침대에서 꿀잠 충전 💤', '잘 자요 여러분 굿나잇 🌙'],
      store: ['편의점 신상 꿀조합 털기 콘텐츠 쇼핑! 🛍️'],
      laundry: ['촬영 의상 컬렉션 향기롭게 세탁 완료! 🧺'],
      overbudget: ['장비 업그레이드 비용 때문에 월세가 살짝 부담돼요 💦']
    }
  },
  {
    id: 'startup_ceo',
    jobName: '플렉스 스타트업 대표',
    traitTag: '프리미엄 월세 VIP 👑',
    badgeColor: '#eab308',
    minBudget: 270,
    maxBudget: 450,
    requirements: { wallpaper: 3, bed: 2, shower: 2, desk: 2 },
    wishText: '로얄 부티크 풀옵션 스위트룸이면 최고가 월세 즉시 계약!',
    style: {
      hairColor: '#0f172a',
      outfitColor: '#eab308',
      pantsColor: '#1e1b4b',
      accessory: 'goldglasses'
    },
    quotes: {
      ambient: ['비앙코 대리석과 골드 몰딩 품격이 남다르군요! 👑', '5성급 부티크 호텔 스위트 그 자체입니다 ✨'],
      cleaning: ['완벽히 정돈된 공간이 성공을 부르죠! ✨', '대리석 바닥이 거울처럼 빛나는군요 🧹'],
      shower: ['골드 레인샤워로 비즈니스 컨디션 완벽 회복! 🫧', '특급 호텔 스파 부럽지 않군요 🎵'],
      eating: ['투자 유치 기념 프리미엄 다이닝 & 와인! 🍷', '홈바 에스프레소 향이 일품입니다 ☕'],
      working: ['글로벌 IR 화상 컨퍼런스 진행 중 💻📈', '서재와 라운지 소파 동선이 완벽하군요!'],
      sleeping: ['킹사이즈 베드 덕분에 숙면 효율 최고입니다 💤', '내일 조찬 미팅을 위해 딥슬립 🌙'],
      store: ['1층 플래그십 스토어에서 원두 & 와인 픽업! 💳'],
      laundry: ['프리미엄 수트 세탁 & 스팀 케어 완료! 🧺'],
      overbudget: ['음, 제 예산 한도를 넘어서는 초고가 월세군요 🤔']
    }
  }
];

const KOREAN_LAST_NAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '송', '유', '홍'];
const KOREAN_FIRST_NAMES = ['민준', '서연', '도윤', '지우', '시우', '하은', '지호', '수빈', '예준', '민서', '우진', '채원', '현우', '지민', '소율', '연우', '다은', '유진', '태오', '하린'];

// 건물주 돌발 케어 이벤트 정의 (터치 시 보너스 팁 수익 또는 해당 방 월세 쿨타임 즉시 완료!)
const CARE_BUBBLE_TYPES = [
  {
    id: 'pipe_fix',
    icon: '🔧',
    label: '배관 수리',
    targetType: 'room',
    effectType: 'instant_rent',
    cashReward: 32,
    toastMsg: '🔧 배관 수압을 완벽히 잡아주자 입주민이 감동해 월세를 즉시 입금했어요!'
  },
  {
    id: 'parcel_deliver',
    icon: '📦',
    label: '택배 전달',
    targetType: 'room',
    effectType: 'instant_rent',
    cashReward: 36,
    toastMsg: '📦 문 앞까지 택배를 전달해주고 월세 즉시 수금 + 감사 팁을 받았어요!'
  },
  {
    id: 'dust_clean',
    icon: '🧹',
    label: '먼지 청소',
    targetType: 'room',
    effectType: 'bonus_cash',
    cashReward: 42,
    toastMsg: '🧹 호실과 복도 먼지를 반짝반짝 케어해 보너스 관리비를 받았어요!'
  },
  {
    id: 'smart_bulb',
    icon: '💡',
    label: '스마트 조명 교체',
    targetType: 'room',
    effectType: 'instant_rent',
    cashReward: 40,
    toastMsg: '💡 따뜻한 스마트 무드 조명으로 교체 완료! 월세 쿨타임이 즉시 완료되었어요!'
  },
  {
    id: 'store_restock',
    icon: '🥤',
    label: '편의점 냉장고 진열',
    targetType: 'shop',
    shopId: 'store',
    effectType: 'bonus_cash',
    cashReward: 45,
    toastMsg: '🏪 1층 편의점 음료 쇼케이스 완판! 보너스 매출이 터졌어요!'
  },
  {
    id: 'laundry_collect',
    icon: '🪙',
    label: '세탁기 동전 회수',
    targetType: 'shop',
    shopId: 'laundry',
    effectType: 'bonus_cash',
    cashReward: 48,
    toastMsg: '🧺 3연동 드럼세탁기 코인함에서 두둑한 보너스 수익을 수거했어요!'
  }
];

// 메인 가이드 퀘스트 목록
const MAIN_QUESTS = [
  {
    id: 'q1',
    title: '101호 시멘트 바닥 & 벽면 리모델링',
    desc: '101호를 클릭해 [바닥 마루 & 벽체]를 Lv.1 이상으로 시공해보세요!',
    focusRoom: '101',
    reward: 120,
    check: (state) => {
      const r = state.rooms.find((rm) => rm.id === '101');
      return r && r.furniture.wallpaper >= 1;
    }
  },
  {
    id: 'q2',
    title: '101호 첫 3D 미니미 입주민 계약하기',
    desc: '101호 관리창에서 [세입자 구하기]를 눌러 첫 입주민을 맞이하세요!',
    focusRoom: '101',
    reward: 150,
    check: (state) => {
      const r = state.rooms.find((rm) => rm.id === '101');
      return r && !!r.tenant;
    }
  },
  {
    id: 'q3',
    title: '101호 반투명 유리부스 욕실 시공하기',
    desc: '입주민이 쾌적하게 씻도록 101호 [유리부스 욕실]을 Lv.1 이상 설치하세요.',
    focusRoom: '101',
    reward: 170,
    check: (state) => {
      const r = state.rooms.find((rm) => rm.id === '101');
      return r && r.furniture.shower >= 1;
    }
  },
  {
    id: 'q4',
    title: '101호 [🌸 파스텔 스윗홈] 풀세트 완성!',
    desc: '101호의 6종 가구를 모두 Lv.1 이상 조립해 [월세 +12% 세트 보너스]를 켜세요!',
    focusRoom: '101',
    reward: 230,
    check: (state) => {
      const r = state.rooms.find((rm) => rm.id === '101');
      return r && Object.values(r.furniture).every((lv) => lv >= 1);
    }
  },
  {
    id: 'q5',
    title: '102호도 리모델링해 멀티 월세 수금하기',
    desc: '옆방 102호에도 입주민을 들여 방마다 터지는 3D 코인 분수를 감상해보세요!',
    focusRoom: '102',
    reward: 250,
    check: (state) => state.rooms.filter((rm) => !!rm.tenant).length >= 2
  },
  {
    id: 'q6',
    title: '헤링본 코지 우드 업그레이드 & VIP 영입',
    desc: '적정 월세 110만원 이상 호실을 만들거나 기존 세입자 퇴거 후 상위 입주민과 계약하세요!',
    focusRoom: '101',
    reward: 320,
    check: (state) => state.stats.evictions >= 1 || state.rooms.some((rm) => rm.unlocked && calcRoomMarketRent(rm) >= 110)
  },
  {
    id: 'q7',
    title: '1층 편의점 또는 코인세탁소 확장하기',
    desc: '1층 상가를 클릭해 Lv.2로 리모델링하고 상가 방문 매출을 높이세요!',
    focusShop: 'store',
    reward: 340,
    check: (state) => state.shops.store.level >= 2 || state.shops.laundry.level >= 2
  },
  {
    id: 'q8',
    title: '103호 분양 오픈 & 1층 전 호실 만실!',
    desc: '103호를 개방하고 101~103호 모두 입주민 계약을 완료하세요.',
    focusRoom: '103',
    reward: 450,
    check: (state) => ['101', '102', '103'].every((id) => {
      const r = state.rooms.find((rm) => rm.id === id);
      return r && r.unlocked && !!r.tenant;
    })
  },
  {
    id: 'q9',
    title: '2층 테라스 로열층(201호) 오픈하기',
    desc: '2층 201호를 분양 개방해 테라스 하우스 2층 시대를 여세요!',
    focusRoom: '201',
    reward: 550,
    check: (state) => {
      const r = state.rooms.find((rm) => rm.id === '201');
      return r && r.unlocked;
    }
  },
  {
    id: 'q10',
    title: '꿈의 [👑 로얄 부티크 스위트] 완성!',
    desc: '어느 호실이든 6종 가구를 모두 Lv.3으로 업그레이드해 최고급 풀옵션을 완성하세요!',
    focusRoom: '101',
    reward: 1000,
    check: (state) => state.rooms.some((rm) =>
      rm.unlocked && Object.values(rm.furniture).every((lv) => lv >= 3)
    )
  }
];

// 세입자 소통 카톡 이벤트
const KAKAO_EVENTS = [
  {
    id: 'water_pressure',
    title: '해바라기 샤워기 수압 케어 요청',
    message: '집주인님~! 새로 들어온 방 너무 아늑한데 욕실 해바라기 샤워기에 아로마 필터 달아주실 수 있나요? 🫧✨',
    choices: [
      {
        label: '💸 아로마 비타민 필터 & 수압 부스터 시공 (-30만)',
        cost: 30,
        happinessDelta: +24,
        bonusGold: 55,
        reply: '우와!! 온수 수압이랑 향기 최고예요!! 감사 보너스 입금드렸어요 💕'
      },
      {
        label: '🔧 직접 올라가서 밸브 수압 빵빵하게 조절 (무료)',
        cost: 0,
        happinessDelta: +8,
        bonusGold: 12,
        reply: '오 훨씬 시원하게 잘 나와요! 바로 봐주셔서 감사합니다 ㅎㅎ'
      },
      {
        label: '🙈 다음 점검 때 봐주겠다고 넘기기',
        cost: 0,
        happinessDelta: -14,
        bonusGold: 0,
        reply: '조금 아쉽네요 ㅠㅠ 다음엔 꼭 부탁드려요!'
      }
    ]
  },
  {
    id: 'stand_lamp',
    title: '침실 무드등 전구 톤 변경 요청',
    message: '갓물주님! 침대 옆 협탁 스탠드에 더 따뜻한 웜화이트 스마트 전구를 끼우면 분위기 대박일 것 같아요 💡🌙',
    choices: [
      {
        label: '💡 필립스 휴 감성 스마트 무드전구 세트 지원 (-35만)',
        cost: 35,
        happinessDelta: +26,
        bonusGold: 62,
        reply: '방 분위기가 완전 부티크 호텔이 됐어요!! 평생 살게요 🥹💖'
      },
      {
        label: '🔆 여분 전구색 LED 전구 선물하기 (-5만)',
        cost: 5,
        happinessDelta: +9,
        bonusGold: 15,
        reply: '따뜻한 색감 너무 예뻐요! 센스 최고입니다 🙏'
      },
      {
        label: '🙈 기본 전구 그대로 쓰라고 답장하기',
        cost: 0,
        happinessDelta: -12,
        bonusGold: 0,
        reply: '내 돈 주고 사서 끼워야겠네요 ㅎㅎ💦'
      }
    ]
  },
  {
    id: 'ac_filter',
    title: '에어컨 피톤치드 케어 요청',
    message: '사장님! 날이 포근해져서 벽걸이 에어컨 가동 전에 피톤치드 살균 세척 한번 받으면 상쾌할 것 같아요 🍃',
    choices: [
      {
        label: '✨ 친환경 고압 스팀 분해 세척 출장 지원 (-38만)',
        cost: 38,
        happinessDelta: +25,
        bonusGold: 60,
        reply: '숲속에 온 것처럼 공기가 상쾌해요!! 갓물주님 최고 🌿💚'
      },
      {
        label: '🧴 전용 항균 필터 클리너 전달하기 (-5만)',
        cost: 5,
        happinessDelta: +7,
        bonusGold: 0,
        reply: '직접 뿌리고 닦았더니 깨끗해졌어요! 감사합니다~'
      },
      {
        label: '🙈 창문 열고 환기 자주 하라고 하기',
        cost: 0,
        happinessDelta: -14,
        bonusGold: 0,
        reply: '에구 먼지가 조금 걱정되네요 💦'
      }
    ]
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
      name: '🌿 코지 헤링본 하우스',
      badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-400'
    };
  }
  if (wp >= 1 || sum >= 2) {
    return {
      grade: 'pastel',
      name: '🌸 화사한 파스텔 원룸',
      badgeClass: 'bg-pink-100 text-rose-900 border-pink-300'
    };
  }
  return {
    grade: 'slum',
    name: '🏚️ 철거 전 노후 호실',
    badgeClass: 'bg-stone-200 text-stone-700 border-stone-400'
  };
}

// ES 모듈에서도 안전하게 접근 가능하도록 window에 연결
window.WORLD_3D_CONFIG = WORLD_3D_CONFIG;
window.THEME_SETS = THEME_SETS;
window.ROOM_3D_LOCAL_SPOTS = ROOM_3D_LOCAL_SPOTS;
window.INITIAL_ROOMS = INITIAL_ROOMS;
window.INITIAL_SHOPS = INITIAL_SHOPS;
window.FURNITURE_TREE = FURNITURE_TREE;
window.TENANT_JOBS = TENANT_JOBS;
window.KOREAN_LAST_NAMES = KOREAN_LAST_NAMES;
window.KOREAN_FIRST_NAMES = KOREAN_FIRST_NAMES;
window.CARE_BUBBLE_TYPES = CARE_BUBBLE_TYPES;
window.MAIN_QUESTS = MAIN_QUESTS;
window.KAKAO_EVENTS = KAKAO_EVENTS;
window.getRoomThemeSet = getRoomThemeSet;
window.calcRoomMarketRent = calcRoomMarketRent;
window.getRoomInteriorGrade = getRoomInteriorGrade;
