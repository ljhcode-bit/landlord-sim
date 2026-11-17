// =========================================================
// 【갓물주 라이프: 미니미 하우스】 데이터 모듈 (data.js)
// 호실/상가 좌표, 가구 업그레이드 트리, 8종 직업군, 퀘스트, 카톡 민원
// =========================================================

const WORLD_CONFIG = {
  width: 1800,
  height: 1400,
  minScale: 0.45,
  maxScale: 1.8,
  defaultScale: 0.62,
  corridor2FY: 452,
  corridor1FY: 787,
  plazaY: 1104,
  stairX: 1500
};

// 호실 내 가구 및 행동 로컬 좌표 (방 크기: 380 x 270 기준)
const ROOM_LOCAL_SPOTS = {
  door: { x: 190, y: 256 },
  center: { x: 190, y: 168 },
  cleanSpots: [
    { x: 148, y: 128 },
    { x: 230, y: 148 },
    { x: 186, y: 212 }
  ],
  bed: { x: 70, y: 108 },
  shower: { x: 324, y: 104 },
  kitchen: { x: 82, y: 196 },
  desk: { x: 304, y: 198 }
};

// 1층(101~103호) & 2층(201~203호) 원룸 초기 데이터
const INITIAL_ROOMS = [
  {
    id: '101',
    name: '101호',
    floor: 1,
    x: 220,
    y: 495,
    w: 380,
    h: 270,
    corridorY: 787,
    unlocked: true,
    unlockCost: 0,
    baseRent: 25,
    furniture: { wallpaper: 0, bed: 0, shower: 0, kitchen: 0, desk: 0, ac: 0 }
  },
  {
    id: '102',
    name: '102호',
    floor: 1,
    x: 620,
    y: 495,
    w: 380,
    h: 270,
    corridorY: 787,
    unlocked: true,
    unlockCost: 0,
    baseRent: 25,
    furniture: { wallpaper: 0, bed: 0, shower: 0, kitchen: 0, desk: 0, ac: 0 }
  },
  {
    id: '103',
    name: '103호',
    floor: 1,
    x: 1020,
    y: 495,
    w: 380,
    h: 270,
    corridorY: 787,
    unlocked: false,
    unlockCost: 150,
    baseRent: 28,
    furniture: { wallpaper: 0, bed: 0, shower: 0, kitchen: 0, desk: 0, ac: 0 }
  },
  {
    id: '201',
    name: '201호',
    floor: 2,
    x: 220,
    y: 160,
    w: 380,
    h: 270,
    corridorY: 452,
    unlocked: false,
    unlockCost: 250,
    baseRent: 32,
    furniture: { wallpaper: 0, bed: 0, shower: 0, kitchen: 0, desk: 0, ac: 0 }
  },
  {
    id: '202',
    name: '202호',
    floor: 2,
    x: 620,
    y: 160,
    w: 380,
    h: 270,
    corridorY: 452,
    unlocked: false,
    unlockCost: 400,
    baseRent: 35,
    furniture: { wallpaper: 0, bed: 0, shower: 0, kitchen: 0, desk: 0, ac: 0 }
  },
  {
    id: '203',
    name: '203호',
    floor: 2,
    x: 1020,
    y: 160,
    w: 380,
    h: 270,
    corridorY: 452,
    unlocked: false,
    unlockCost: 600,
    baseRent: 40,
    furniture: { wallpaper: 0, bed: 0, shower: 0, kitchen: 0, desk: 0, ac: 0 }
  }
];

// 단지 내 1층 상가 데이터 (24시 편의점, 코인세탁소)
const INITIAL_SHOPS = {
  store: {
    id: 'store',
    name: '24시 미니미 편의점',
    icon: '🏪',
    x: 220,
    y: 830,
    w: 480,
    h: 250,
    doorX: 460,
    doorY: 1080,
    spots: [
      { x: 355, y: 985 },
      { x: 545, y: 990 }
    ],
    level: 1,
    levels: {
      1: {
        title: '동네 미니 슈퍼형 편의점',
        desc: '삼각김밥과 컵라면을 파는 소박한 1층 편의점',
        visitProfit: 12,
        upgradeCost: 0
      },
      2: {
        title: '프리미엄 카페형 24시 편의점',
        desc: '즉석 치킨과 원두커피 머신이 들어와 객단가 상승!',
        visitProfit: 26,
        upgradeCost: 220
      },
      3: {
        title: '메가 플래그십 스마트 스토어',
        desc: '와인 코너와 무인 픽업존까지 갖춘 핫플 편의점!',
        visitProfit: 48,
        upgradeCost: 520
      }
    }
  },
  laundry: {
    id: 'laundry',
    name: '워시퐁 24시 코인세탁소',
    icon: '🧺',
    x: 940,
    y: 830,
    w: 460,
    h: 250,
    doorX: 1170,
    doorY: 1080,
    spots: [
      { x: 1060, y: 988 },
      { x: 1255, y: 988 }
    ],
    level: 1,
    levels: {
      1: {
        title: '소형 동전 세탁방',
        desc: '기본 통돌이 세탁기 2대가 돌아가는 아담한 세탁소',
        visitProfit: 14,
        upgradeCost: 0
      },
      2: {
        title: '대형 고온건조 워시존',
        desc: '이불 빨래용 대형 드럼세탁기와 뽀송 건조기 완비!',
        visitProfit: 30,
        upgradeCost: 240
      },
      3: {
        title: '호텔식 워시&라운지 카페',
        desc: '세탁 대기 중 안마의자와 커피까지 즐기는 프리미엄 샵!',
        visitProfit: 55,
        upgradeCost: 560
      }
    }
  }
};

// 현실적인 6종 가구 업그레이드 트리 (Lv.0 -> Lv.1 당근 중고 -> Lv.2 이케아풍 -> Lv.3 호텔급 풀옵션)
const FURNITURE_TREE = {
  wallpaper: {
    key: 'wallpaper',
    label: '벽지 / 장판',
    icon: '🧱',
    levels: [
      {
        level: 0,
        tier: '방치됨',
        name: '곰팡이 핀 벽지 & 찢어진 장판',
        desc: '눅눅한 습기와 곰팡이 얼룩이 가득한 반지하 고시원풍 마감',
        cost: 0,
        rentBonus: 0,
        comfort: 0
      },
      {
        level: 1,
        tier: '당근 중고',
        name: '셀프 시트지 & 데코타일',
        desc: '당근에서 나눔받은 벽지로 곰팡이를 가린 깔끔 베이직 룸',
        cost: 40,
        rentBonus: 12,
        comfort: 10
      },
      {
        level: 2,
        tier: '이케아풍 원룸',
        name: '따뜻한 우드톤 헤링본 마루',
        desc: '인스타 감성 크림색 실크벽지와 따뜻한 오크 우드 장판',
        cost: 140,
        rentBonus: 28,
        comfort: 22
      },
      {
        level: 3,
        tier: '호텔급 풀옵션',
        name: '화이트&골드 비앙코 대리석',
        desc: '청담동 럭셔리 오피스텔급 웨인스코팅과 천연 대리석 타일',
        cost: 360,
        rentBonus: 58,
        comfort: 38
      }
    ]
  },
  bed: {
    key: 'bed',
    label: '침대',
    icon: '🛏️',
    levels: [
      {
        level: 0,
        tier: '미설치',
        name: '맨바닥 얇은 요이불',
        desc: '침대 없이 바닥에 얇은 담요 한 장만 깔린 상태',
        cost: 0,
        rentBonus: 0,
        comfort: 0
      },
      {
        level: 1,
        tier: '당근 중고',
        name: '당근 나눔 접이식 매트리스',
        desc: '삐걱거리지만 바닥 냉기는 막아주는 중고 싱글 매트리스',
        cost: 50,
        rentBonus: 10,
        comfort: 10
      },
      {
        level: 2,
        tier: '이케아풍 원룸',
        name: '북유럽 원목 수납 슈퍼싱글',
        desc: '폭신한 포켓스프링과 무드등 헤드가 달린 원목 침대',
        cost: 160,
        rentBonus: 25,
        comfort: 20
      },
      {
        level: 3,
        tier: '호텔급 풀옵션',
        name: '5성급 구스다운 킹사이즈 베드',
        desc: '눕자마자 기절하는 구름 같은 호텔 침구 세트',
        cost: 380,
        rentBonus: 52,
        comfort: 35
      }
    ]
  },
  shower: {
    key: 'shower',
    label: '화장실 샤워부스',
    icon: '🚿',
    levels: [
      {
        level: 0,
        tier: '미설치',
        name: '녹슨 찬물 세면대만 있음',
        desc: '온수도 안 나오고 샤워부스가 없어 세수만 겨우 가능',
        cost: 0,
        rentBonus: 0,
        comfort: 0
      },
      {
        level: 1,
        tier: '당근 중고',
        name: '비닐 샤워커튼 & 온수기',
        desc: '따뜻한 온수가 나오는 보급형 샤워기 + 물튀김 방지 커튼',
        cost: 60,
        rentBonus: 14,
        comfort: 14
      },
      {
        level: 2,
        tier: '이케아풍 원룸',
        name: '강화유리 건식 샤워부스',
        desc: '수압 빵빵한 필터 샤워기와 깔끔한 불투명 유리 파티션',
        cost: 180,
        rentBonus: 30,
        comfort: 25
      },
      {
        level: 3,
        tier: '호텔급 풀옵션',
        name: '골드 레인샤워 & 히노끼 스파',
        desc: '천장형 레인샤워와 피로가 녹는 반신욕 스파 부스',
        cost: 420,
        rentBonus: 60,
        comfort: 40
      }
    ]
  },
  kitchen: {
    key: 'kitchen',
    label: '주방 싱크대',
    icon: '🍳',
    levels: [
      {
        level: 0,
        tier: '미설치',
        name: '주방 없음 (휴대용 버너)',
        desc: '싱크대가 없어 컵라면 물만 겨우 붓는 상태',
        cost: 0,
        rentBonus: 0,
        comfort: 0
      },
      {
        level: 1,
        tier: '당근 중고',
        name: '당근 미니 1구 전기렌지 싱크',
        desc: '라면과 간단한 계란프라이를 요리할 수 있는 미니 주방',
        cost: 55,
        rentBonus: 10,
        comfort: 10
      },
      {
        level: 2,
        tier: '이케아풍 원룸',
        name: '화이트 타일 2구 인덕션 주방',
        desc: '깔끔한 상하부장과 전자레인지까지 빌트인된 원룸 키친',
        cost: 165,
        rentBonus: 24,
        comfort: 20
      },
      {
        level: 3,
        tier: '호텔급 풀옵션',
        name: '아일랜드 홈바 & 빌트인 오븐',
        desc: '식기세척기, 와인셀러, 광파오븐까지 갖춘 셰프급 주방',
        cost: 390,
        rentBonus: 50,
        comfort: 34
      }
    ]
  },
  desk: {
    key: 'desk',
    label: '책상 / PC',
    icon: '💻',
    levels: [
      {
        level: 0,
        tier: '미설치',
        name: '접이식 밥상 하나',
        desc: '책상이 없어 바닥에 쪼그려 앉아야 하는 상태',
        cost: 0,
        rentBonus: 0,
        comfort: 0
      },
      {
        level: 1,
        tier: '당근 중고',
        name: '당근 중고 철제 책상 & 의자',
        desc: '노트북이나 수험서를 펼칠 수 있는 실속형 입식 책상',
        cost: 45,
        rentBonus: 10,
        comfort: 10
      },
      {
        level: 2,
        tier: '이케아풍 원룸',
        name: '데스크테리어 원목책상 & 모니터',
        desc: '기가 와이파이와 와이드 모니터, 인체공학 의자 완비',
        cost: 170,
        rentBonus: 26,
        comfort: 22
      },
      {
        level: 3,
        tier: '호텔급 풀옵션',
        name: '초고성능 듀얼모니터 워크스테이션',
        desc: 'RGB 커스텀 수냉 PC, 모션데스크, 방송용 마이크 풀세트',
        cost: 430,
        rentBonus: 58,
        comfort: 36
      }
    ]
  },
  ac: {
    key: 'ac',
    label: '에어컨',
    icon: '❄️',
    levels: [
      {
        level: 0,
        tier: '미설치',
        name: '목 돌아간 낡은 선풍기',
        desc: '여름엔 찜통! 미지근한 바람만 나오는 고물 선풍기',
        cost: 0,
        rentBonus: 0,
        comfort: 0
      },
      {
        level: 1,
        tier: '당근 중고',
        name: '당근 구형 벽걸이 에어컨',
        desc: '소리는 조금 크지만 시원한 냉방이 되는 구형 에어컨',
        cost: 50,
        rentBonus: 10,
        comfort: 10
      },
      {
        level: 2,
        tier: '이케아풍 원룸',
        name: '초절전 무풍 인버터 에어컨',
        desc: '전기세 걱정 없이 쾌적한 온도를 유지하는 최신 벽걸이',
        cost: 155,
        rentBonus: 24,
        comfort: 20
      },
      {
        level: 3,
        tier: '호텔급 풀옵션',
        name: '천장형 시스템 공기청정 냉난방기',
        desc: '사계절 자동 온도조절 + 초미세먼지 케어 호텔 공조기',
        cost: 370,
        rentBonus: 48,
        comfort: 34
      }
    ]
  }
};

// 현실 세입자 직업군 8종 데이터
const TENANT_JOBS = [
  {
    id: 'exam_student',
    jobName: '공시생',
    badgeColor: '#3b82f6',
    minBudget: 48,
    maxBudget: 74,
    requirements: { wallpaper: 1 },
    wishText: '깔끔한 도배 & 공부할 책상이 있으면 좋아요 📚',
    style: {
      hairColor: '#27272a',
      hairType: 'messy',
      outfitColor: '#2563eb',
      outfitSub: '#1d4ed8',
      accessory: 'glasses'
    },
    quotes: {
      cleaning: ['공부 전 책상 주변 먼지부터 쓱싹! 💨', '에구 허리야~ 방이 깨끗해야 집중되지! ✨'],
      shower: ['샤워하면서 한국사 연표 외우는 중.. 🎵', '오늘 하루도 씻겨 내려간다~ 💧'],
      eating: ['컵라면에 삼각김밥 국룰이지! 🍜', '역시 야식은 치킨이지! 내일부턴 진짜 공부한다 🍗'],
      working: ['이번 시험은 무조건 합격 가즈아!! 📚', '기출문제 회독 중.. 졸지 말자! ✍️'],
      sleeping: ['꿈에서도 영단어가 나오네.. 쿨쿨 💤', '내일 6시 기상 인증해야지.. 💤'],
      store: ['편의점 에너지드링크 2+1 득템! ⚡'],
      laundry: ['밀린 트레이닝복 한꺼번에 빨래 중~ 🧺'],
      overbudget: ['집주인님.. 수험생 용돈으론 오른 월세가 너무 버거워요 😭']
    }
  },
  {
    id: 'college_student',
    jobName: '대학생',
    badgeColor: '#10b981',
    minBudget: 55,
    maxBudget: 86,
    requirements: { wallpaper: 1, bed: 1 },
    wishText: '곰팡이 없는 벽지와 푹신한 매트리스 희망! 🎒',
    style: {
      hairColor: '#6b4423',
      hairType: 'parted',
      outfitColor: '#10b981',
      outfitSub: '#ecfdf5',
      accessory: 'cap'
    },
    quotes: {
      cleaning: ['자취방에 친구 놀러 오기로 해서 급청소 중! ✨', '에구 허리야~ 엄마 오시기 전에 싹 쓸자!'],
      shower: ['1교시 지각 안 하려면 빛의 속도로 샤워! 🚿', '따뜻한 물 나오니까 살 것 같다~ 🎵'],
      eating: ['자취생 소울푸드 파송송 계란라면! 🍜', '과제 끝난 기념 반반치킨 플렉스! 🍗'],
      working: ['교수님 과제 폭탄 살려주세요.. 😭', '팀플 PPT 내가 다 만드는 중 💻'],
      sleeping: ['자체 휴강 마렵다.. 5분만 더.. 💤', '꿀잠 자는 중.. 쿨쿨 💤'],
      store: ['편의점 신상 디저트 털러 왔다! 🍰'],
      laundry: ['과잠이랑 후드티 뽀송하게 건조기 돌리기! 🧺'],
      overbudget: ['알바비를 다 털어도 인상된 월세 내기가 힘들어요 ㅠㅠ💦']
    }
  },
  {
    id: 'office_worker',
    jobName: '야근러 직장인',
    badgeColor: '#6366f1',
    minBudget: 82,
    maxBudget: 122,
    requirements: { shower: 1, bed: 1 },
    wishText: '퇴근 후 씻을 온수 샤워부스 & 침대 필수! 💼',
    style: {
      hairColor: '#1e293b',
      hairType: 'neat',
      outfitColor: '#334155',
      outfitSub: '#f8fafc',
      accessory: 'tie'
    },
    quotes: {
      cleaning: ['주말 맞이 밀린 방 청소! 에구 허리야~ ✨', '먼지 싹 닦으니 속이 시원하네! 💨'],
      shower: ['오늘 하루 야근 피로도 씻겨 내려간다~ 🎵', '뜨끈한 물로 샤워하니 천국이 따로 없네 ♨️'],
      eating: ['퇴근 후 맥주에 치킨 한 입! 이게 행복이지 🍗', '야식은 역시 매콤한 라면이지! 🍜'],
      working: ['집에 와서도 원격 근무라니.. 이번 달 월세 벌어야지💻', '보고서 최종_최종_진짜최종.pptx 수정 중 😭'],
      sleeping: ['출근 알람 울리기 전까지 기절.. 💤', '침대가 나를 놓아주질 않네 쿨쿨 💤'],
      store: ['숙취해소제랑 아아 한 잔 사러 총총.. ☕'],
      laundry: ['출근용 셔츠 세탁! 내일도 칼주름 가자 🧺'],
      overbudget: ['월급 빼고 다 오르네요.. 이 월세는 감당이 안 됩니다 😢']
    }
  },
  {
    id: 'cat_butler',
    jobName: '고양이 집사',
    badgeColor: '#f59e0b',
    minBudget: 95,
    maxBudget: 142,
    requirements: { wallpaper: 2, ac: 1 },
    wishText: '냥이와 쾌적하게 지낼 우드톤 바닥 & 에어컨 필수! 🐱',
    style: {
      hairColor: '#7c2d12',
      hairType: 'bob',
      outfitColor: '#f59e0b',
      outfitSub: '#fef3c7',
      accessory: 'catpin',
      hasCat: true
    },
    quotes: {
      cleaning: ['고양이 털과의 전쟁! 돌돌이 & 빗자루 풀가동 ✨', '에구 허리야~ 우리 냥이 다치지 않게 반짝반짝!'],
      shower: ['문 앞에서 냥이가 울지만 얼른 씻고 나갈게~ 🎵', '뽀송뽀송 향기 나는 집사 변신! 💧'],
      eating: ['냥이는 츄르 주고 나는 치킨 뜯기! 🍗 (행복도 UP)', '보글보글 맛있는 저녁 시간~ 🍲'],
      working: ['키보드 위에 앉은 고양이 피해서 재택근무 중 💻', '사료값 & 츄르값 열심히 벌어야지! 🐾'],
      sleeping: ['고양이 골골송 자장가 삼아 꿀잠 💤', '냥이랑 이불 속에서 꽁냥꽁냥 쿨쿨 💤'],
      store: ['집사 간식이랑 건전지 사러 편의점 나들이! 🏪'],
      laundry: ['고양이 털 묻은 이불 대용량 세탁기 돌리기! 🧺'],
      overbudget: ['집주인님 월세가 너무 올라서 츄르 사줄 돈이 없어요 😿']
    }
  },
  {
    id: 'fitness_trainer',
    jobName: '헬스 트레이너',
    badgeColor: '#ef4444',
    minBudget: 110,
    maxBudget: 162,
    requirements: { shower: 2, kitchen: 1 },
    wishText: '수압 쎈 유리 샤워부스 & 닭가슴살 조리 싱크대 필수! 💪',
    style: {
      hairColor: '#18181b',
      hairType: 'spiky',
      outfitColor: '#ef4444',
      outfitSub: '#fee2e2',
      accessory: 'headband'
    },
    quotes: {
      cleaning: ['청소도 유산소 운동이다! 헛둘헛둘 깨끗해졌다! ✨', '먼지 제로! 근손실 제로! 상쾌하군 💨'],
      shower: ['오운완 후 냉온수 교대 샤워! 오늘 하루도 씻겨 내려간다~ 🎵', '수압 최고! 등근육 피로가 싹 풀린다 ♨️'],
      eating: ['치팅데이엔 역시 프로틴 대신 후라이드 치킨이지! 🍗', '고단백 닭가슴살 볶음밥 요리 완료! 🍳'],
      working: ['회원님들 식단표 피드백 작성 중! 득근합시다 💻', '바디프로필 시즌 스케줄 정리 중! 🔥'],
      sleeping: ['근성장은 수면 중에 이루어진다! 8시간 숙면 💤', '프로틴 꿈 꾸며 쿨쿨.. 💤'],
      store: ['편의점 고단백 프로틴 음료 싹쓸이! 🥤'],
      laundry: ['땀 흘린 운동복 한 보따리 세탁 완료! 🧺'],
      overbudget: ['회원권 매출이 줄어서 오른 월세가 살짝 벅차네요 💦']
    }
  },
  {
    id: 'webtoon_artist',
    jobName: '프리랜서 웹툰작가',
    badgeColor: '#a855f7',
    minBudget: 135,
    maxBudget: 195,
    requirements: { desk: 2, bed: 2, ac: 1 },
    wishText: '넓은 모니터 책상 & 마감 후 기절할 좋은 침대 필수! 🎨',
    style: {
      hairColor: '#581c87',
      hairType: 'wavy',
      outfitColor: '#9333ea',
      outfitSub: '#f3e8ff',
      accessory: 'beret'
    },
    quotes: {
      cleaning: ['마감 도피성 대청소 중.. 왜 이리 재밌지? ✨', '에구 허리야~ 지우개 가루 싹 치웠다!'],
      shower: ['샤워하다가 대박 스토리 전개 떠올랐다!! 🎵', '굳은 어깨에 온수 콸콸~ 살 것 같아 ♨️'],
      eating: ['마감 끝난 새벽엔 역시 양념치킨이지! 🍗 (행복도 UP)', '원고 하면서 먹는 라면이 세상에서 제일 맛있어 🍜'],
      working: ['마감 살려줘..😭 세이브 원고가 바닥났다!!', '배경 스케치업 렌더링 돌리는 중.. 제발 멈추지 마 💻'],
      sleeping: ['원고 송고 완료!! 이제 아무도 날 깨우지 마 💤', '손목 보호대 차고 기절 수면 쿨쿨 💤'],
      store: ['마감 버티기용 초콜릿이랑 커피 수혈! 🍫'],
      laundry: ['일주일 내내 입은 작업용 후드티 세탁 중~ 🧺'],
      overbudget: ['원고료 정산 전인데 월세가 너무 많이 올랐어요.. 😭']
    }
  },
  {
    id: 'youtuber',
    jobName: '인기 유튜버',
    badgeColor: '#ec4899',
    minBudget: 170,
    maxBudget: 255,
    requirements: { desk: 2, wallpaper: 2, ac: 2 },
    wishText: '방송 배경용 예쁜 인테리어 & 고사양 PC 책상 필수! 🎥',
    style: {
      hairColor: '#db2777',
      hairType: 'trendy',
      outfitColor: '#ec4899',
      outfitSub: '#fce7f3',
      accessory: 'headset'
    },
    quotes: {
      cleaning: ['룸투어 브이로그 찍기 전에 반짝반짝 대청소! ✨', '카메라 앵글에 먼지 안 잡히게 쓱싹! 💨'],
      shower: ['라방 켜기 전에 풀세팅 샤워 타임~ 🎵', '수증기 뽀얗게 올라오니까 스파 브이로그 각! ♨️'],
      eating: ['구독자 여러분! 오늘 먹방 메뉴는 바삭 치킨입니다 🍗', '신상 라면 리뷰 각! 보글보글 맛있겠다~ 🍜'],
      working: ['구독과 좋아요 알림설정까지 부탁드려요! 🎥💻', '밤샘 컷편집 & 자막 작업 중.. 알고리즘아 떠라! 🔥'],
      sleeping: ['편집 업로드 완료! 조회수 대박 나길 빌며 쿨쿨 💤', '푹신한 침대에서 꿀잠 충전 💤'],
      store: ['편의점 신상 털기 콘텐츠 재료 구매 완료! 🛍️'],
      laundry: ['촬영 의상 뽀송하게 코인세탁소 직행! 🧺'],
      overbudget: ['요즘 조회수가 떨어져서 인상된 월세는 부담스러워요 💦']
    }
  },
  {
    id: 'startup_ceo',
    jobName: '스타트업 대표',
    badgeColor: '#eab308',
    minBudget: 225,
    maxBudget: 360,
    requirements: { wallpaper: 3, bed: 2, shower: 2, desk: 2 },
    wishText: '호텔급 럭셔리 인테리어 & 프리미엄 풀옵션 선호! 👑',
    style: {
      hairColor: '#0f172a',
      hairType: 'slick',
      outfitColor: '#1e1b4b',
      outfitSub: '#fef08a',
      accessory: 'goldglasses'
    },
    quotes: {
      cleaning: ['공간이 정돈되어야 비즈니스 아이디어가 샘솟지! ✨', '호텔 스위트룸 못지않게 깔끔하군!'],
      shower: ['투자 미팅 전 레인샤워로 컨디션 최상 유지! 🎵', '따뜻한 스파 샤워, 이 집 최고의 옵션이군 ♨️'],
      eating: ['시리즈A 투자 유치 기념 프리미엄 치킨 & 와인! 🍗', '홈바 키친에서 직접 스테이크 파스타 요리! 🍳'],
      working: ['글로벌 IR 피칭덱 검토 및 화상회의 중 💻', '이번 분기 매출 300% 성장 가즈아! 📈'],
      sleeping: ['5성급 호텔 침대 부럽지 않은 숙면.. 쿨쿨 💤', '내일 조찬 모임을 위해 딥슬립 💤'],
      store: ['1층 편의점에서 프리미엄 원두커피 & 스낵 픽업! ☕'],
      laundry: ['비즈니스 캐주얼 수트 케어 세탁 완료! 🧺'],
      overbudget: ['음, 이 정도 월세면 강남 펜트하우스를 알아봐야겠군요 🤔']
    }
  }
];

const KOREAN_LAST_NAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '유', '홍'];
const KOREAN_FIRST_NAMES = ['민준', '서연', '도윤', '지우', '시우', '하은', '지호', '수빈', '예준', '민서', '우진', '채원', '현우', '지민', '건우', '소율', '연우', '다은', '유진', '태오'];
const PERSONALITIES = ['깔끔쟁이 ✨', '집돌이/집순이 🏠', '야행성 올빼미 🦉', '긍정 에너지 ☀️', '야식 매니아 🍗', '갓생러 🔥'];

// 메인 가이드 퀘스트 목록
const MAIN_QUESTS = [
  {
    id: 'q1',
    title: '101호 곰팡이 벽지 도배하기',
    desc: '101호를 클릭해 [벽지/장판]을 Lv.1 이상으로 업그레이드하세요.',
    focusRoom: '101',
    reward: 120,
    check: (state) => {
      const r = state.rooms.find((rm) => rm.id === '101');
      return r && r.furniture.wallpaper >= 1;
    }
  },
  {
    id: 'q2',
    title: '101호 첫 세입자 입주시키기',
    desc: '101호 관리 패널에서 [세입자 구하기]를 눌러 첫 입주 계약을 맺으세요!',
    focusRoom: '101',
    reward: 150,
    check: (state) => {
      const r = state.rooms.find((rm) => rm.id === '101');
      return r && !!r.tenant;
    }
  },
  {
    id: 'q3',
    title: '101호 샤워부스 설치해서 씻게 해주기',
    desc: '세입자가 상쾌하게 씻을 수 있도록 101호 [화장실 샤워부스]를 Lv.1 이상 설치하세요.',
    focusRoom: '101',
    reward: 160,
    check: (state) => {
      const r = state.rooms.find((rm) => rm.id === '101');
      return r && r.furniture.shower >= 1;
    }
  },
  {
    id: 'q4',
    title: '101호 침대 & 책상 옵션 채워주기',
    desc: '101호에 [침대 Lv.1]과 [책상/PC Lv.1]을 모두 설치해 원룸 구색을 갖추세요.',
    focusRoom: '101',
    reward: 180,
    check: (state) => {
      const r = state.rooms.find((rm) => rm.id === '101');
      return r && r.furniture.bed >= 1 && r.furniture.desk >= 1;
    }
  },
  {
    id: 'q5',
    title: '102호도 꾸며서 두 번째 세입자 받기',
    desc: '옆방 102호도 도배하고 새로운 세입자를 입주시켜 총 2가구 입주를 달성하세요.',
    focusRoom: '102',
    reward: 220,
    check: (state) => state.rooms.filter((rm) => !!rm.tenant).length >= 2
  },
  {
    id: 'q6',
    title: '인테리어 고급화 & 세입자 물갈이(또는 고액 월세)',
    desc: '호실 인테리어를 업그레이드해 월세 90만원 이상 호실을 만들거나 기존 세입자를 퇴거 후 상위 직업군으로 교체해보세요!',
    focusRoom: '101',
    reward: 280,
    check: (state) => state.stats.evictions >= 1 || state.rooms.some((rm) => rm.unlocked && calcRoomMarketRent(rm) >= 90)
  },
  {
    id: 'q7',
    title: '1층 단지 내 상가 업그레이드하기',
    desc: '1층 [24시 편의점] 또는 [코인세탁소]를 클릭해 Lv.2로 확장하세요!',
    focusShop: 'store',
    reward: 300,
    check: (state) => state.shops.store.level >= 2 || state.shops.laundry.level >= 2
  },
  {
    id: 'q8',
    title: '103호 개방하고 1층 만실 달성하기',
    desc: '103호를 분양 오픈하고 101~103호 모두 세입자를 입주시키세요.',
    focusRoom: '103',
    reward: 400,
    check: (state) => ['101', '102', '103'].every((id) => {
      const r = state.rooms.find((rm) => rm.id === id);
      return r && r.unlocked && !!r.tenant;
    })
  },
  {
    id: 'q9',
    title: '2층 로열층(201호) 분양 오픈하기',
    desc: '2층 201호를 클릭해 개방하고 건물 규모를 2층으로 확장하세요!',
    focusRoom: '201',
    reward: 500,
    check: (state) => {
      const r = state.rooms.find((rm) => rm.id === '201');
      return r && r.unlocked;
    }
  },
  {
    id: 'q10',
    title: '꿈의 호텔급 풀옵션 오피스텔 완성!',
    desc: '어느 호실이든 6종 가구를 모두 Lv.3(호텔급 풀옵션)으로 완성하세요!',
    focusRoom: '101',
    reward: 1000,
    check: (state) => state.rooms.some((rm) =>
      rm.unlocked && Object.values(rm.furniture).every((lv) => lv >= 3)
    )
  }
];

// 세입자 현실 민원 카톡 이벤트 목록
const KAKAO_EVENTS = [
  {
    id: 'water_pressure',
    title: '수압 약함 민원',
    message: '집주인님 ㅠㅠ 화장실 샤워기 수압이 너무 약해서 비누칠하고 헹구는데 한 세월이에요.. 점검 좀 부탁드려도 될까요? 🚿💦',
    choices: [
      {
        label: '💸 수압 상승 펌프 & 새 필터 샤워기 교체 (-30만)',
        cost: 30,
        happinessDelta: +22,
        bonusGold: 45,
        reply: '우와!! 폭포수처럼 콸콸 나와요!! 역시 갓물주님 최고👍 보너스 감사선물 드려요!'
      },
      {
        label: '🔧 직접 올라가서 밸브 수압만 조절해주기 (무료)',
        cost: 0,
        happinessDelta: +6,
        bonusGold: 0,
        reply: '오 아까보단 조금 나아졌어요! 바쁘신데 봐주셔서 감사합니다 ㅎㅎ'
      },
      {
        label: '🙈 "원래 그 동네 수압이 그래요~" 읽씹/넘기기',
        cost: 0,
        happinessDelta: -18,
        bonusGold: 0,
        reply: '하.. 씻을 때마다 답답하네요 ㅠㅠ (행복도 하락)'
      }
    ]
  },
  {
    id: 'noise_complaint',
    title: '새벽 층간/벽간 소음 민원',
    message: '집주인님.. 옆방에서 새벽 2시마다 게임하면서 소리 지르는 소리가 다 들려서 잠을 못 자겠어요 ㅠㅠ 조용히 좀 해달라고 전해주세요! 😫',
    choices: [
      {
        label: '🛡️ 방음재 시공 & 귀마개/디퓨저 선물 세트 (-40만)',
        cost: 40,
        happinessDelta: +25,
        bonusGold: 55,
        reply: '방음 패드 붙여주시니 훨씬 조용해요!! 센스 있는 선물까지 감동입니다 🥹💖'
      },
      {
        label: '📢 단체 공지톡에 심야 정숙 안내문 올리기 (무료)',
        cost: 0,
        happinessDelta: +8,
        bonusGold: 10,
        reply: '공지 올려주신 덕분에 어제부턴 조용해졌어요! 감사합니다 🙏'
      },
      {
        label: '🙈 세입자끼리 알아서 해결하라고 무시하기',
        cost: 0,
        happinessDelta: -20,
        bonusGold: 0,
        reply: '관리를 아예 안 해주시네요.. 다크서클이 턱 끝까지 내려왔어요 😡'
      }
    ]
  },
  {
    id: 'ac_smell',
    title: '에어컨 쉰내 & 필터 청소 요청',
    message: '사장님! 날이 더워서 에어컨을 켰는데 쿰쿰한 쉰내가 너무 나요 🤢 전문 분해 세척 한번 불러주시면 안 될까요?',
    choices: [
      {
        label: '✨ 전문 에어컨 분해 스팀 클리닝 출장 부르기 (-35만)',
        cost: 35,
        happinessDelta: +24,
        bonusGold: 50,
        reply: '와 상쾌한 피톤치드 향이 솔솔 나요!! 올여름 쾌적하게 보낼게요 ❄️💙'
      },
      {
        label: '🧴 탈취 스프레이 하나 문고리에 걸어두기 (-5만)',
        cost: 5,
        happinessDelta: +5,
        bonusGold: 0,
        reply: '일단 필터 씻고 뿌려보긴 했는데 그럭저럭 쓸 만하네요!'
      },
      {
        label: '🙈 창문 열고 환기하면서 쓰라고 답장하기',
        cost: 0,
        happinessDelta: -16,
        bonusGold: 0,
        reply: '콜록콜록.. 목이 칼칼하네요 ㅠㅠ'
      }
    ]
  },
  {
    id: 'delivery_box',
    title: '복도 택배 분실 걱정 민원',
    message: '집주인님! 복도에 시켜둔 치킨이랑 택배 상자를 누가 자꾸 건드리는 것 같아요 😨 현관 도어락이랑 CCTV 점검 가능할까요?',
    choices: [
      {
        label: '📹 복도 고화질 안심 CCTV & 스마트벨 증설 (-45만)',
        cost: 45,
        happinessDelta: +26,
        bonusGold: 65,
        reply: '역시 보안 철저한 미니미 하우스!! 덕분에 안심하고 장기 거주할래요 🏠✨'
      },
      {
        label: '📦 1층 무인택배함 이용 안내 스티커 부착 (무료)',
        cost: 0,
        happinessDelta: +7,
        bonusGold: 0,
        reply: '아하 1층 로비 무인택배함을 쓰면 되겠네요! 안내 감사합니다~'
      },
      {
        label: '🙈 "설마 누가 가져가겠어요~" 무시하기',
        cost: 0,
        happinessDelta: -15,
        bonusGold: 0,
        reply: '불안해서 택배도 맘 편히 못 시키겠어요 ㅠㅠ'
      }
    ]
  },
  {
    id: 'screen_window',
    title: '방충망 찢어짐 & 모기 습격',
    message: '주인님 ㅠㅠ 창문 방충망 모서리가 찢어져서 밤마다 모기가 윙윙거려요 🦟 잠을 한숨도 못 잤어요 살려주세요!!',
    choices: [
      {
        label: '🪟 미세 방충망 전면 교체 + 모기퇴치기 지원 (-25만)',
        cost: 25,
        happinessDelta: +20,
        bonusGold: 40,
        reply: '날벌레 한 마리도 못 들어오네요!! 오늘 밤은 꿀잠 예약입니다 😍'
      },
      {
        label: '🩹 다이소 보수 테이프 직접 붙여주기 (무료)',
        cost: 0,
        happinessDelta: +6,
        bonusGold: 0,
        reply: '급한 불은 껐네요! 바로 와서 붙여주셔서 고마워요!'
      },
      {
        label: '🙈 모기향 피우고 자라고 답하기',
        cost: 0,
        happinessDelta: -17,
        bonusGold: 0,
        reply: '온몸이 모기 물려 간지러워 미치겠어요 ㅠㅠ💢'
      }
    ]
  },
  {
    id: 'boiler_issue',
    title: '보일러 온수 깜빡거림',
    message: '집주인님! 샤워하다가 갑자기 찬물이 나와서 얼어 죽을 뻔했어요 🥶 보일러 에러코드가 깜빡거리는데 기사님 불러주세요!',
    choices: [
      {
        label: '🔥 즉시 보일러 기사님 긴급 출장 수리 (-38만)',
        cost: 38,
        happinessDelta: +25,
        bonusGold: 60,
        reply: '온수가 펄펄 끓어요!! 빠른 일처리 진짜 감동입니다 갓물주님 ♨️👏'
      },
      {
        label: '🔌 전원 코드 뺐다 다시 꽂아보라고 안내 (무료)',
        cost: 0,
        happinessDelta: +4,
        bonusGold: 0,
        reply: '오 리셋하니까 일단 다시 돌아가긴 하네요! 지켜볼게요~'
      },
      {
        label: '🙈 내일모레 시간 날 때 보겠다고 미루기',
        cost: 0,
        happinessDelta: -22,
        bonusGold: 0,
        reply: '당장 씻지도 못하는데 내일모레라니요.. 너무해요 😭'
      }
    ]
  }
];

// 호실 적정 월세 계산 헬퍼
function calcRoomMarketRent(room) {
  let total = room.baseRent;
  for (const key of Object.keys(FURNITURE_TREE)) {
    const lv = room.furniture[key] || 0;
    total += FURNITURE_TREE[key].levels[lv].rentBonus;
  }
  return total;
}

// 호실 인테리어 등급 테마 판별 헬퍼
function getRoomInteriorGrade(room) {
  const levels = Object.values(room.furniture);
  const sum = levels.reduce((a, b) => a + b, 0);
  const wp = room.furniture.wallpaper || 0;
  if (wp >= 3 || sum >= 15) {
    return {
      grade: 'luxury',
      name: '화이트&골드 럭셔리 오피스텔',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300'
    };
  }
  if (wp >= 2 || sum >= 8) {
    return {
      grade: 'wood',
      name: '따뜻한 우드톤 감성 원룸',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300'
    };
  }
  if (wp >= 1 || sum >= 3) {
    return {
      grade: 'basic',
      name: '깔끔 실속형 원룸',
      badgeClass: 'bg-sky-100 text-sky-800 border-sky-300'
    };
  }
  return {
    grade: 'slum',
    name: '칙칙한 반지하 고시원풍',
    badgeClass: 'bg-stone-200 text-stone-700 border-stone-400'
  };
}
