// =========================================================
// 【갓물주 라이프 3D: 미니미 타운】 통합 데이터 모듈 (data.js)
// 5종 세대 유형(학생/신혼부부/4인가족/노부부/히키코모리), 층간소음/악취 상성,
// 공용 인프라 4종, 관리인 ROI & 위임 정책, 플로팅 아일랜드 부지(태양광/농장/신축)
// =========================================================

const GAME_BALANCE = {
  roomWidth: 5.4,
  roomDepth: 4.5,
  wallHeight: 2.55,
  evictionGraceSec: 30, // 행복도 30% 이하 시 자진 퇴거 카운트다운 30초
  managerHireFee: 50,
  managerSalaryPerCycle: 95, // 초반 1~2호실일 땐 배보다 배꼽이 큰 현실적 고정 급여!
  managerCycleSec: 14,
  specialCleanCost: 45,
  soundproofCost: 75,
  mediationGiftCost: 28,
  relocateCost: 20
};

// 플로팅 아일랜드 부지(Lots) 배치 (중앙 시냇물 & 아치형 다리 주변 6개 핵심 구역)
const INITIAL_ISLAND_LOTS = [
  {
    lotId: 'lot_main',
    name: '중앙 수변 1번지',
    x: -4.8,
    z: -4.2,
    landPrice: 0,
    owned: true,
    devType: 'mixed_1',
    title: '미니미 주상복합 1호관'
  },
  {
    lotId: 'lot_solar',
    name: '서쪽 햇살언덕 2번지',
    x: -18.5,
    z: -3.5,
    landPrice: 320,
    owned: false,
    devType: null,
    title: null
  },
  {
    lotId: 'lot_farm',
    name: '남서 시냇가 3번지',
    x: -14.2,
    z: 10.6,
    landPrice: 420,
    owned: false,
    devType: null,
    title: null
  },
  {
    lotId: 'lot_east',
    name: '다리 건너 동쪽 4번지',
    x: 13.8,
    z: -4.5,
    landPrice: 680,
    owned: false,
    devType: null,
    title: null
  },
  {
    lotId: 'lot_south_e',
    name: '벚꽃 수변 5번지',
    x: 13.2,
    z: 10.4,
    landPrice: 1200,
    owned: false,
    devType: null,
    title: null
  },
  {
    lotId: 'lot_north',
    name: '북쪽 전망대 6번지',
    x: 4.5,
    z: -16.8,
    landPrice: 2400,
    owned: false,
    devType: null,
    title: null
  }
];

// 빈 부지 개발 카탈로그 (태양광 발전소 / 도시 농장 / 벚꽃 공원 / 베이커리 카페 / 주상복합 2호관)
const DEVELOPMENT_CATALOG = {
  solar_plant: {
    type: 'solar_plant',
    name: '친환경 태양광 발전소',
    icon: '🌱',
    buildCost: 220,
    isResidential: false,
    cycleSec: 9,
    cycleProfit: 52,
    rentSynergyPct: 5,
    desc: '햇살을 받아 깨끗한 전력을 생산합니다! 관리비 걱정 없이 9초마다 +52만원의 쏠쏠한 전력 판매 수익이 들어옵니다.'
  },
  urban_farm: {
    type: 'urban_farm',
    name: '힐링 도시 농장 & 텃밭',
    icon: '🍓',
    buildCost: 280,
    isResidential: false,
    cycleSec: 11,
    cycleProfit: 74,
    rentSynergyPct: 8,
    desc: '씨앗 ➔ 초록 새싹 ➔ 빨간 딸기 열매로 3단계 자라나는 3D 텃밭! 수확할 때마다 +74만원 수익과 입주민 힐링 효과를 줍니다.'
  },
  sakura_park: {
    type: 'sakura_park',
    name: '파스텔 벚꽃 힐링 공원',
    icon: '🌸',
    buildCost: 340,
    isResidential: false,
    cycleSec: 12,
    cycleProfit: 38,
    rentSynergyPct: 15,
    desc: '분수대와 벚꽃나무가 어우러진 공원! 인접 주거 건물의 월세를 +15% 높여주고 층간소음 스트레스를 완화합니다.'
  },
  bakery_cafe: {
    type: 'bakery_cafe',
    name: '오가닉 베이커리 & 카페',
    icon: '☕',
    buildCost: 460,
    isResidential: false,
    cycleSec: 10,
    cycleProfit: 92,
    rentSynergyPct: 12,
    desc: '갓 구운 크루아상과 원두커피 향이 퍼지는 핫플 상가! 높은 상권 매출(+92만)과 슬세권 월세 +12% 시너지를 발휘합니다.'
  },
  mixed_2: {
    type: 'mixed_2',
    name: '프리미엄 주상복합 2호관',
    icon: '🏢',
    buildCost: 780,
    isResidential: true,
    baseRoomRent: 52,
    rentSynergyPct: 10,
    desc: '1층 상가(24H 마트·세탁소)와 6개의 고급 호실을 갖춘 새 주상복합 빌딩! 직접 호실을 꾸미고 지배인을 둘 수 있습니다.'
  },
  mixed_1: {
    type: 'mixed_1',
    name: '주상복합 1호관',
    icon: '🏠',
    buildCost: 0,
    isResidential: true,
    baseRoomRent: 32,
    rentSynergyPct: 0,
    desc: '1층 24H MINI MART & WASH PONG 상가와 상층부 6개 주거 호실을 갖춘 첫 출발 건물입니다.'
  }
};

// 건물 공용 인프라 4종 정의 (3D 외관 생성 및 세입자 불만 직결)
const PUBLIC_INFRA_CATALOG = {
  elevator: {
    key: 'elevator',
    name: '유리 전망 엘리베이터',
    icon: '🛗',
    cost: 160,
    rentBonusPct: 10,
    desc: '미설치 시 2층 거주 노부부·4인가족이 계단 불만을 호소합니다! 설치 시 투명 외벽 승강기가 실시간 운행됩니다.'
  },
  recycling: {
    key: 'recycling',
    name: '클린 분리수거장',
    icon: '♻️',
    cost: 110,
    rentBonusPct: 6,
    desc: '미설치 시 건물 옆에 검은 쓰레기봉투 더미가 쌓여 위생도가 하락합니다! 설치 시 색상별 3D 분리수거 부스가 생성됩니다.'
  },
  parcel_box: {
    key: 'parcel_box',
    name: '스마트 무인택배함',
    icon: '📮',
    cost: 95,
    rentBonusPct: 6,
    desc: '정문 입구 옆 안심 무인택배함! 택배 분실 불만을 없애고 전 세대 만족도와 월세를 +6% 높입니다.'
  },
  rooftop_garden: {
    key: 'rooftop_garden',
    name: '옥상 루프탑 가든',
    icon: '🌿',
    cost: 210,
    rentBonusPct: 12,
    desc: '지붕 위 파고라와 화단 정원을 조성해 세입자 이탈률을 대폭 낮추고 건물 프리미엄 월세를 +12% 상승시킵니다.'
  }
};

// 주상복합 내 6개 호실 레이아웃 (1층 상가 위 2층=101~103호, 3층=201~203호 구조로 1층 상가 육안 식별 극대화!)
const ROOM_SLOTS_TEMPLATE = [
  { subId: '101', name: '101호', floor: 1, col: 0, lx: -5.6, ly: 3.05, lz: 0.2, cycleSec: 9.5, unlockCost: 0, defaultUnlocked: true },
  { subId: '102', name: '102호', floor: 1, col: 1, lx: 0.0, ly: 3.05, lz: 0.2, cycleSec: 11.0, unlockCost: 0, defaultUnlocked: true },
  { subId: '103', name: '103호', floor: 1, col: 2, lx: 5.6, ly: 3.05, lz: 0.2, cycleSec: 10.2, unlockCost: 130, defaultUnlocked: false },
  { subId: '201', name: '201호', floor: 2, col: 0, lx: -5.6, ly: 5.85, lz: 0.2, cycleSec: 11.8, unlockCost: 200, defaultUnlocked: false },
  { subId: '202', name: '202호', floor: 2, col: 1, lx: 0.0, ly: 5.85, lz: 0.2, cycleSec: 10.6, unlockCost: 280, defaultUnlocked: false },
  { subId: '203', name: '203호', floor: 2, col: 2, lx: 5.6, ly: 5.85, lz: 0.2, cycleSec: 11.4, unlockCost: 380, defaultUnlocked: false }
];

// 호실 인테리어 등급 (Lv.0 ~ Lv.3)
const ROOM_INTERIOR_TIERS = [
  { level: 0, name: '노후 시멘트 공실', cost: 0, rentAdd: 0, desc: '갈라진 시멘트 바닥과 얼룩진 벽면 상태' },
  { level: 1, name: '파스텔 스윗 리모델링', cost: 65, rentAdd: 28, desc: '화사한 메이플 마루와 파스텔 벽지, 기본 맞춤 가구 완비' },
  { level: 2, name: '코지 헤링본 풀옵션', cost: 160, rentAdd: 68, desc: '따뜻한 오크 헤링본 마루와 웨인스코팅, 세대별 고급 가구 세팅' },
  { level: 3, name: '로얄 부티크 스위트', cost: 340, rentAdd: 135, desc: '비앙코 골드 대리석과 최고급 명품 가구 풀세트 (+세트효과 25%)' }
];

// 5대 세대 유형 (학생 / 신혼부부 / 4인 가족 / 노부부 / 은둔형 히키코모리)
const HOUSEHOLD_TYPES = {
  student: {
    type: 'student',
    label: '대학생·취준생',
    icon: '🎓',
    badgeColor: '#3b82f6',
    memberCount: 1,
    minRent: 58,
    maxRent: 108,
    noiseOutput: 45, // 야행성·기타 연주 소음
    noiseSensitivity: 25,
    odorSensitivity: 45,
    needsElevator: false,
    needsRecycling: false,
    isHoarder: false,
    traitDesc: '야행성 · 밤샘 과제 & 기타 연주 소음 주의',
    furnitureDesc: '싱글 침대 · 듀얼모니터 책상 · 게이밍의자 · 미니 행거 · 어쿠스틱 기타',
    happyQuotes: [
      '듀얼 모니터에서 인강 들으니 집중 최고! 💻',
      '1층 24H 편의점이 바로 아래라 천국이네 🍙',
      '새 마루에서 기타 치니까 울림이 너무 좋다 🎸'
    ],
    noiseVictimQuotes: ['윗방 쿵쿵거리는 소리 때문에 시험공부를 못 하겠어요! 😫'],
    odorVictimQuotes: ['옆방에서 무슨 퀴퀴한 냄새가 복도까지 나요.. 🤢'],
    infraQuotes: ['무인택배함이 있으면 인강 교재 받기 편할 텐데 📦']
  },
  newlywed: {
    type: 'newlywed',
    label: '신혼부부',
    icon: '💍',
    badgeColor: '#ec4899',
    memberCount: 2,
    minRent: 120,
    maxRent: 215,
    noiseOutput: 18,
    noiseSensitivity: 58,
    odorSensitivity: 78,
    needsElevator: false,
    needsRecycling: true,
    isHoarder: false,
    traitDesc: '깔끔한 인테리어 · 분리수거장 & 코인세탁소 중시',
    furnitureDesc: '핑크/크림 퀸침대 · 2인 패브릭 소파 · 아일랜드 식탁 & 커피머신 · 전신거울',
    happyQuotes: [
      '여보~ 아일랜드 식탁에서 내려 마시는 모닝커피 최고야 ☕💕',
      '신혼집 인테리어가 너무 화사해서 매일 행복해요 🌸',
      '1층 워시퐁 세탁소 덕분에 이불 빨래도 뽀송뽀송! 🧺'
    ],
    noiseVictimQuotes: ['윗집 발망치 소리 때문에 신혼 단잠을 다 설쳤어요! ⚡'],
    odorVictimQuotes: ['옆집 문 앞에 배달 쓰레기 쌓아둔 것 좀 봐요, 벌레 나올 것 같아! 🤢'],
    infraQuotes: ['분리수거장이 아직 없어서 재활용 버리기가 너무 불편해요 ♻️']
  },
  family4: {
    type: 'family4',
    label: '4인 가족',
    icon: '👨‍👩‍👧‍👦',
    badgeColor: '#10b981',
    memberCount: 4,
    minRent: 180,
    maxRent: 320,
    noiseOutput: 85, // 아이들 발망치 층간소음 매우 높음!
    noiseSensitivity: 30,
    odorSensitivity: 75,
    needsElevator: true,
    needsRecycling: true,
    isHoarder: false,
    traitDesc: '고수익 우량 세대 · 아이들 발망치 층간소음 높음 · 엘리베이터 중시',
    furnitureDesc: '낮은 가벽 · 4인 식탁 · 대형 L자 소파 & TV · 어린이 3D 2층 침대 · 장난감 매트',
    happyQuotes: [
      '아이들이 2층 침대랑 놀이매트를 너무 좋아해요! 🧸✨',
      '온 가족이 둘러앉아 저녁 먹는 시간이 제일 행복하네요 🍲',
      '동네에 산책할 시냇물 다리랑 공원이 있어 아이 키우기 딱이에요!'
    ],
    noiseVictimQuotes: ['애들아 살살 걸어라~ 아랫집에서 올라오시겠다 💦'],
    odorVictimQuotes: ['아이들 키우는 집인데 옆방 악취 때문에 창문을 못 열겠어요!! 😡'],
    infraQuotes: ['유모차랑 장바구니 들고 2층 계단 오르내리기 너무 힘들어요 🛗']
  },
  elderly: {
    type: 'elderly',
    label: '노부부',
    icon: '🍵',
    badgeColor: '#d97706',
    memberCount: 2,
    minRent: 110,
    maxRent: 185,
    noiseOutput: 5,
    noiseSensitivity: 92, // 층간소음에 극도로 민감!
    odorSensitivity: 90, // 악취에 극도로 민감!
    needsElevator: true, // 2층 이상 시 엘리베이터 필수!
    needsRecycling: false,
    isHoarder: false,
    traitDesc: '조용한 모범 세대 · 층간소음/악취 극도로 민감 · 2층은 엘리베이터 필수',
    furnitureDesc: '따뜻한 원목 마루 · 트윈 침대 · 흔들의자 2개 · 다도 좌탁 · 난초 & 분재 선반',
    happyQuotes: [
      '영감, 흔들의자에 앉아 따뜻한 녹차 한 잔 마시니 신선놀음이구려 🍵',
      '분재에 새순이 돋았어요~ 채광이 참 포근한 집이야 🪴',
      '조용하고 공기 맑은 동네라 노후 보내기 참 좋구먼 ☀️'
    ],
    noiseVictimQuotes: ['윗집은 밤마다 애들이 왜 이렇게 뛰어다니는 거야! 머리가 지끈거려! ⚡💢'],
    odorVictimQuotes: ['옆방에서 무슨 썩은 냄새가 진동을 해요! 못 살겠어요 집주인 양반! 🤢'],
    infraQuotes: ['무릎 관절이 시큰거려서 엘리베이터 없이는 2층 계단 못 다니겠소.. 🛗']
  },
  hikikomori: {
    type: 'hikikomori',
    label: '은둔형 히키코모리',
    icon: '🗑️',
    badgeColor: '#6b21a8',
    memberCount: 1,
    minRent: 135,
    maxRent: 235, // 온라인 작업으로 월세는 꼬박꼬박 아주 잘 냄!
    noiseOutput: 15,
    noiseSensitivity: 20,
    odorSensitivity: 0,
    needsElevator: false,
    needsRecycling: false,
    isHoarder: true, // 핵심 문제 세입자: 방 안에 피자박스·쓰레기봉투 산더미 누적!
    traitDesc: '월세 칼입금 고액 세입자 · 외출 제로 · 방치 시 쓰레기산 & 이웃 악취 대재앙!',
    furnitureDesc: '어두운 조명 · 트리플 모니터 PC석 · 바닥 매트리스 · (시간 경과 시 쓰레기 더미 누적)',
    happyQuotes: [
      '배달 시켜야지... 밖은 위험해... 모니터 3대가 내 세상이야 🖥️',
      '이번 달 외주비 들어왔다.. 월세는 바로 자동이체 완료... 💸',
      '피자 다 먹었으니 박스는 저기 탑 위에 올려두자... 🍕'
    ],
    cleanedGrumbleQuote: '아, 치우지 말라니까요... 다 쓸 데 있는 내 보물들인데... 😒',
    evictedQuote: '칫... 월세 한 번도 안 밀렸는데 너무하네... 짐 싸서 나갑니다... 📦'
  }
};

const FAMILY_LAST_NAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '송', '유', '홍'];
const GIVEN_NAMES = ['민준', '서연', '도윤', '지우', '하은', '지호', '수빈', '현우', '소율', '연우', '다은', '태오', '영숙', '철수', '순자', '만수'];

// 돌발 케어 이벤트 정의
const CARE_BUBBLE_TYPES = [
  { id: 'pipe_fix', icon: '🔧', label: '배관 수리', cashReward: 42, toastMsg: '🔧 배관 수리 완료! 보너스 수리비 +42만원을 받았어요!' },
  { id: 'parcel_deliver', icon: '📦', label: '택배 전달', cashReward: 45, toastMsg: '📦 택배 안심 전달! 입주민이 감사 팁 +45만원을 보냈어요!' },
  { id: 'street_sweep', icon: '🧹', label: '거리 청소', cashReward: 50, toastMsg: '🧹 타운 돌담길과 복도를 반짝반짝 청소해 +50만원 보너스를 받았어요!' },
  { id: 'smart_light', icon: '💡', label: '조명 교체', cashReward: 48, toastMsg: '💡 따뜻한 무드전구 교체 완료! +48만원 보너스가 입금됐어요!' }
];

// 메인 퀘스트 & 업적 10단계
const QUEST_LIST = [
  {
    id: 'mq1',
    title: '101호 파스텔 스윗 리모델링하기',
    desc: '1호관 101호를 터치해 클로즈업한 뒤 인테리어를 Lv.1 이상으로 업그레이드하세요!',
    reward: 160,
    focusLot: 'lot_main',
    focusSubRoom: '101',
    check: (st) => {
      const r = st.buildings.lot_main?.rooms.find((x) => x.subId === '101');
      return r && r.interiorLv >= 1;
    }
  },
  {
    id: 'mq2',
    title: '첫 세대 입주 계약 체결하기',
    desc: '101호에 원하는 세대(학생/신혼부부/4인가족/노부부/히키코모리)를 입주시키세요!',
    reward: 180,
    focusLot: 'lot_main',
    focusSubRoom: '101',
    check: (st) => {
      const r = st.buildings.lot_main?.rooms.find((x) => x.subId === '101');
      return r && !!r.household;
    }
  },
  {
    id: 'mq3',
    title: '102호도 리모델링 후 두 번째 세대 받기',
    desc: '옆방 102호도 단장해 2세대 이상 거주하는 활기찬 주상복합을 만드세요!',
    reward: 240,
    focusLot: 'lot_main',
    focusSubRoom: '102',
    check: (st) => st.buildings.lot_main?.rooms.filter((x) => !!x.household).length >= 2
  },
  {
    id: 'mq4',
    title: '건물 공용시설(분리수거장 또는 택배함) 설치',
    desc: '우측 하단 [📋 타운 수첩 ➔ 건물 공용시설] 탭에서 분리수거장이나 무인택배함을 설치하세요!',
    reward: 260,
    openTab: 'infra',
    check: (st) => {
      const inf = st.buildings.lot_main?.infra || {};
      return inf.recycling || inf.parcel_box || inf.elevator;
    }
  },
  {
    id: 'mq5',
    title: '2층 호실(201호) 개방 & 유리 엘리베이터 설치',
    desc: '201호를 분양 오픈하고 2층 입주민을 위한 [🛗 유리 전망 엘리베이터]를 설치하세요!',
    reward: 380,
    focusLot: 'lot_main',
    focusSubRoom: '201',
    check: (st) => {
      const b = st.buildings.lot_main;
      const r201 = b?.rooms.find((x) => x.subId === '201');
      return r201 && r201.unlocked && b.infra.elevator;
    }
  },
  {
    id: 'mq6',
    title: '서쪽 언덕에 [🌱 친환경 태양광 발전소] 건설',
    desc: '줌아웃해 서쪽 2번지 빈 부지를 터치하고 태양광 발전소(또는 원하는 시설)를 개발하세요!',
    reward: 450,
    focusLot: 'lot_solar',
    check: (st) => st.lots.filter((l) => l.owned).length >= 2
  },
  {
    id: 'mq7',
    title: '시냇가 부지에 [🍓 힐링 도시 농장] 일구기',
    desc: '3번째 부지를 개발해 씨앗부터 빨간 딸기까지 자라나는 텃밭이나 공원을 조성하세요!',
    reward: 550,
    focusLot: 'lot_farm',
    check: (st) => st.lots.filter((l) => l.owned).length >= 3
  },
  {
    id: 'mq8',
    title: '쓰레기방 특수청소·방음시공 또는 세입자 관리 1회',
    desc: '문제 세대(히키코모리 쓰레기방 청소/내쫓기 또는 층간소음 방음시공/중재)를 1회 해결해보세요!',
    reward: 480,
    openTab: 'tenants',
    check: (st) => st.stats.crisisResolved >= 1 || st.stats.evictions >= 1
  },
  {
    id: 'mq9',
    title: '전문 건물 관리인(지배인) 선임해보기',
    desc: '호실을 충분히 늘려 수익을 확보한 뒤 [📋 타운 수첩 ➔ 관리인 고용]에서 지배인을 선임하세요!',
    reward: 600,
    openTab: 'manager',
    check: (st) => Object.values(st.buildings).some((b) => b.manager.hired)
  },
  {
    id: 'mq10',
    title: '아치다리 건너 동쪽 타운까지 5개 부지 개발!',
    desc: '플로팅 아일랜드의 5개 이상 부지를 개발해 꿈의 코지 부동산 타운을 완성하세요!',
    reward: 1500,
    focusLot: 'lot_east',
    check: (st) => st.lots.filter((l) => l.owned).length >= 5
  }
];

window.GAME_BALANCE = GAME_BALANCE;
window.INITIAL_ISLAND_LOTS = INITIAL_ISLAND_LOTS;
window.DEVELOPMENT_CATALOG = DEVELOPMENT_CATALOG;
window.PUBLIC_INFRA_CATALOG = PUBLIC_INFRA_CATALOG;
window.ROOM_SLOTS_TEMPLATE = ROOM_SLOTS_TEMPLATE;
window.ROOM_INTERIOR_TIERS = ROOM_INTERIOR_TIERS;
window.HOUSEHOLD_TYPES = HOUSEHOLD_TYPES;
window.FAMILY_LAST_NAMES = FAMILY_LAST_NAMES;
window.GIVEN_NAMES = GIVEN_NAMES;
window.CARE_BUBBLE_TYPES = CARE_BUBBLE_TYPES;
window.QUEST_LIST = QUEST_LIST;
