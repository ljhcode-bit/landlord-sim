// =========================================================
// 【갓물주 라이프 3D: 미니미 타운 — 택타일 코지 팝(Tactile Cozy Pop) 상용 에디션】 (data.js)
// - 시스템 기본 이모지 0% · 100% 커스텀 다중 레이어 벡터 일러스트(SVG) 에셋
// - 상단 HUD 6대 핵심 아이콘 + 가구/상가/슈퍼카 와이드 아이소메트릭 프리뷰 썸네일
// - 4종 입체 평면도 · 16종 인테리어 카탈로그 · 3종 부티크 단독 상가 · 4종 슈퍼카 컬렉션
// =========================================================

let svgUidSeq = 0;

// =========================================================
// 1. 고밀도 다중 레이어 커스텀 SVG 아이콘 생성기 (광택 · 그라데이션 · 외곽선)
// =========================================================
function createCustomSVGIcon(name, size = 24) {
  const uid = `ico_${name}_${++svgUidSeq}`;
  const defs = `
    <defs>
      <filter id="${uid}_sh" x="-22%" y="-20%" width="146%" height="156%">
        <feDropShadow dx="0" dy="1.8" stdDeviation="1.05" flood-color="#3A2E2B" flood-opacity="0.26"/>
      </filter>
      <linearGradient id="${uid}_gold" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#FFF7B2"/>
        <stop offset="45%" stop-color="#FFD93D"/>
        <stop offset="100%" stop-color="#E59A0B"/>
      </linearGradient>
      <linearGradient id="${uid}_mint" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#8BF598"/>
        <stop offset="52%" stop-color="#38E54D"/>
        <stop offset="100%" stop-color="#179E29"/>
      </linearGradient>
      <linearGradient id="${uid}_coral" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#FF9E9E"/>
        <stop offset="52%" stop-color="#FF6B6B"/>
        <stop offset="100%" stop-color="#D6384C"/>
      </linearGradient>
      <linearGradient id="${uid}_sky" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#B8ECFF"/>
        <stop offset="55%" stop-color="#4CC2FF"/>
        <stop offset="100%" stop-color="#0B84D8"/>
      </linearGradient>
      <linearGradient id="${uid}_cream" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#FFFDF7"/>
        <stop offset="100%" stop-color="#F7E3CC"/>
      </linearGradient>
      <linearGradient id="${uid}_leather" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#B86B35"/>
        <stop offset="55%" stop-color="#8B481F"/>
        <stop offset="100%" stop-color="#592B11"/>
      </linearGradient>
      <linearGradient id="${uid}_wood" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#EDAD68"/>
        <stop offset="100%" stop-color="#9A5825"/>
      </linearGradient>
      <linearGradient id="${uid}_redcar" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#FF7B7B"/>
        <stop offset="50%" stop-color="#FF3B3B"/>
        <stop offset="100%" stop-color="#A61124"/>
      </linearGradient>
      <linearGradient id="${uid}_purple" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#D8B4FE"/>
        <stop offset="100%" stop-color="#7E22CE"/>
      </linearGradient>
    </defs>
  `;

  let body = '';

  switch (name) {
    // [핵심 아이콘 1] 입체 광택 골드 코인 스택 (보유자산)
    case 'coin_stack':
      body = `
        <g filter="url(#${uid}_sh)">
          <ellipse cx="12" cy="24.2" rx="8.2" ry="3.6" fill="#C97A05" stroke="#3A2E2B" stroke-width="1.5"/>
          <ellipse cx="12" cy="22" rx="8.2" ry="3.6" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.5"/>
          <ellipse cx="12" cy="18.2" rx="8.2" ry="3.6" fill="#C97A05" stroke="#3A2E2B" stroke-width="1.4"/>
          <ellipse cx="12" cy="16" rx="8.2" ry="3.6" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.5"/>
          <circle cx="20.5" cy="14.5" r="8.4" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.6"/>
          <circle cx="20.5" cy="14.5" r="5.8" fill="none" stroke="#FFFDF7" stroke-width="1.3" opacity="0.9"/>
          <path d="M18.2 12.2L19.5 16.8L20.5 13.6L21.5 16.8L22.8 12.2" fill="none" stroke="#7C4303" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M7.2 7.2L8.1 9.5L10.4 10.4L8.1 11.3L7.2 13.6L6.3 11.3L4 10.4L6.3 9.5Z" fill="#FFFDF7"/>
        </g>`;
      break;

    // [핵심 아이콘 2] 초록 지폐와 상승 화살표 (주기순익)
    case 'cash_arrow_up':
      body = `
        <g filter="url(#${uid}_sh)">
          <rect x="3.5" y="13.5" width="21" height="12.5" rx="3.5" transform="rotate(-7 14 19.5)" fill="#15803D" stroke="#3A2E2B" stroke-width="1.5"/>
          <rect x="4.5" y="12" width="21.5" height="13" rx="3.5" fill="url(#${uid}_mint)" stroke="#3A2E2B" stroke-width="1.6"/>
          <rect x="7.2" y="14.5" width="16" height="8" rx="2" fill="none" stroke="#FFFDF7" stroke-width="1.2" opacity="0.85"/>
          <circle cx="15.2" cy="18.5" r="3.1" fill="#FFFDF7" opacity="0.92"/>
          <path d="M12.5 14.5L21.5 5.5M21.5 5.5H15.8M21.5 5.5V11.2" fill="none" stroke="#3A2E2B" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M12.5 14.5L21.5 5.5M21.5 5.5H15.8M21.5 5.5V11.2" fill="none" stroke="url(#${uid}_gold)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
        </g>`;
      break;

    // [핵심 아이콘 3] 반짝이는 핑크 하트 게이지 (행복도)
    case 'heart_gauge':
    case 'sparkle_heart_gauge':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M16 27C16 27 4.2 19.6 4.2 11.5C4.2 7.3 7.5 4.4 11.2 4.4C13.6 4.4 15.2 5.7 16 7.4C16.8 5.7 18.4 4.4 20.8 4.4C24.5 4.4 27.8 7.3 27.8 11.5C27.8 19.6 16 27 16 27Z" fill="url(#${uid}_coral)" stroke="#3A2E2B" stroke-width="1.6"/>
          <path d="M7.2 15.8C10.5 14.2 14.5 17.2 24.8 15.4C23.1 20.2 16 25.2 16 25.2C16 25.2 8.9 20.4 7.2 15.8Z" fill="#FF3B5C" opacity="0.55"/>
          <ellipse cx="10.4" cy="9.5" rx="3.4" ry="1.8" fill="#FFFFFF" opacity="0.82" transform="rotate(-28 10.4 9.5)"/>
          <path d="M25.5 4.2L26.3 6.3L28.4 7.1L26.3 7.9L25.5 10L24.7 7.9L22.6 7.1L24.7 6.3Z" fill="#FFD93D" stroke="#3A2E2B" stroke-width="0.8"/>
        </g>`;
      break;

    // [핵심 아이콘 4] 만년필이 꽂힌 가죽 다이어리 (타운 수첩)
    case 'town_notebook':
    case 'leather_diary_pen':
      body = `
        <g filter="url(#${uid}_sh)">
          <rect x="5" y="4" width="18.5" height="24" rx="4.5" fill="url(#${uid}_leather)" stroke="#3A2E2B" stroke-width="1.6"/>
          <rect x="8.2" y="5.5" width="13.8" height="21" rx="2.5" fill="url(#${uid}_cream)" stroke="#3A2E2B" stroke-width="1.1"/>
          <path d="M12 5.5V13.5L14.2 11.8L16.4 13.5V5.5Z" fill="url(#${uid}_coral)" stroke="#3A2E2B" stroke-width="1"/>
          <line x1="10.5" y1="17" x2="19" y2="17" stroke="#C69C72" stroke-width="1.6" stroke-linecap="round"/>
          <line x1="10.5" y1="20.5" x2="17.5" y2="20.5" stroke="#C69C72" stroke-width="1.6" stroke-linecap="round"/>
          <g transform="rotate(22 23.5 15)">
            <rect x="21.6" y="5.5" width="4.2" height="15" rx="1.8" fill="url(#${uid}_sky)" stroke="#3A2E2B" stroke-width="1.4"/>
            <rect x="21.6" y="8.2" width="4.2" height="2.2" fill="url(#${uid}_gold)"/>
            <polygon points="21.8,20.5 25.6,20.5 23.7,25.8" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.3" stroke-linejoin="round"/>
          </g>
        </g>`;
      break;

    // [핵심 아이콘 5] 스티어링 휠과 스포츠카 실루엣 (드라이브 모드)
    case 'supercar_ico':
    case 'steering_supercar':
      body = `
        <g filter="url(#${uid}_sh)">
          <circle cx="13.5" cy="14" r="9.2" fill="none" stroke="#3A2E2B" stroke-width="4.2"/>
          <circle cx="13.5" cy="14" r="9.2" fill="none" stroke="#64748B" stroke-width="2.1"/>
          <line x1="5.5" y1="14" x2="21.5" y2="14" stroke="#3A2E2B" stroke-width="2.2"/>
          <line x1="13.5" y1="14" x2="13.5" y2="22.5" stroke="#3A2E2B" stroke-width="2.2"/>
          <circle cx="13.5" cy="14" r="2.6" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.2"/>
          <path d="M7.5 22.2L10.5 17.5H20.8L26.5 20.2L28.8 22.8V25.5H7.5V22.2Z" fill="url(#${uid}_redcar)" stroke="#3A2E2B" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M13 18.1L11.2 20.5H20.5L18.8 18.1Z" fill="url(#${uid}_sky)" stroke="#3A2E2B" stroke-width="1"/>
          <circle cx="12.5" cy="25.5" r="3.1" fill="#1E293B" stroke="#3A2E2B" stroke-width="1.3"/>
          <circle cx="12.5" cy="25.5" r="1.3" fill="#FFD93D"/>
          <circle cx="24" cy="25.5" r="3.1" fill="#1E293B" stroke="#3A2E2B" stroke-width="1.3"/>
          <circle cx="24" cy="25.5" r="1.3" fill="#FFD93D"/>
        </g>`;
      break;

    // [핵심 아이콘 6] 도면과 망치 (빌딩 증축 · 부지 착공 · 호실 개방)
    case 'blueprint_hammer':
      body = `
        <g filter="url(#${uid}_sh)">
          <rect x="4.5" y="7" width="19" height="17.5" rx="3" transform="rotate(-6 14 15.5)" fill="url(#${uid}_sky)" stroke="#3A2E2B" stroke-width="1.6"/>
          <rect x="7.5" y="10" width="12.5" height="11" fill="none" stroke="#FFFDF7" stroke-width="1.2" stroke-dasharray="2.5 1.8" transform="rotate(-6 14 15.5)"/>
          <line x1="13.5" y1="10" x2="14.2" y2="21" stroke="#FFFDF7" stroke-width="1.1"/>
          <g transform="rotate(32 21 16)">
            <rect x="19.5" y="11" width="3.4" height="15.5" rx="1.6" fill="url(#${uid}_wood)" stroke="#3A2E2B" stroke-width="1.4"/>
            <path d="M14.5 7.5H26.5V12H14.5C13.5 12 13.5 7.5 14.5 7.5Z" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.5"/>
          </g>
        </g>`;
      break;

    case 'gold_key':
    case 'garage_key':
      body = `
        <g filter="url(#${uid}_sh)">
          <circle cx="11.2" cy="12.2" r="6.8" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.6"/>
          <circle cx="11.2" cy="12.2" r="2.7" fill="#FFFDF7" stroke="#3A2E2B" stroke-width="1.3"/>
          <path d="M16.5 15L26.8 22.8L24.5 25.8L22.2 24L23.6 22L21 20L19.4 22L17.2 20.2L18.8 18" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.5" stroke-linejoin="round"/>
        </g>`;
      break;

    case 'back_arrow':
    case 'back_return':
      body = `
        <g filter="url(#${uid}_sh)">
          <circle cx="16" cy="16" r="11.5" fill="url(#${uid}_coral)" stroke="#3A2E2B" stroke-width="1.6"/>
          <path d="M18.8 10.5L12.5 16L18.8 21.5" fill="none" stroke="#FFFDF7" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
        </g>`;
      break;

    case 'rotate_360':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M23.5 13A8.5 8.5 0 1 0 22 21" fill="none" stroke="url(#${uid}_sky)" stroke-width="3.4" stroke-linecap="round"/>
          <polygon points="24.8,8.5 25.5,15 19.2,13.5" fill="url(#${uid}_sky)" stroke="#3A2E2B" stroke-width="1.2" stroke-linejoin="round"/>
        </g>`;
      break;

    case 'red_house':
    case 'studio_unit':
      body = `
        <g filter="url(#${uid}_sh)">
          <rect x="6.5" y="14" width="19" height="13" rx="3.5" fill="url(#${uid}_cream)" stroke="#3A2E2B" stroke-width="1.6"/>
          <path d="M3.5 15.5L16 5.2L28.5 15.5C29.3 16.2 28.8 17.5 27.7 17.5H4.3C3.2 17.5 2.7 16.2 3.5 15.5Z" fill="url(#${uid}_coral)" stroke="#3A2E2B" stroke-width="1.6"/>
          <rect x="13.5" y="19.2" width="5" height="7.8" rx="2" fill="url(#${uid}_wood)" stroke="#3A2E2B" stroke-width="1.3"/>
          <rect x="8.5" y="18.2" width="3.8" height="3.8" rx="1" fill="url(#${uid}_sky)" stroke="#3A2E2B" stroke-width="1.1"/>
        </g>`;
      break;

    case 'tworoom_arch':
      body = `
        <g filter="url(#${uid}_sh)">
          <rect x="4.5" y="7" width="23" height="19" rx="4" fill="url(#${uid}_cream)" stroke="#3A2E2B" stroke-width="1.6"/>
          <path d="M12 26V15.5C12 12.8 20 12.8 20 15.5V26" fill="url(#${uid}_coral)" stroke="#3A2E2B" stroke-width="1.5"/>
          <line x1="16" y1="7" x2="16" y2="13" stroke="#3A2E2B" stroke-width="1.5"/>
        </g>`;
      break;

    case 'threeroom_crown':
    case 'crown_badge':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M4.5 23L6.8 9.5L12.5 15L16 7.5L19.5 15L25.2 9.5L27.5 23Z" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.6" stroke-linejoin="round"/>
          <rect x="5.5" y="23" width="21" height="3.8" rx="1.8" fill="url(#${uid}_coral)" stroke="#3A2E2B" stroke-width="1.4"/>
          <circle cx="16" cy="17.5" r="2.1" fill="#FF6B6B" stroke="#3A2E2B" stroke-width="1"/>
        </g>`;
      break;

    case 'stairs_ico':
    case 'loft_stairs':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M5.5 25.5H26.5V7.5H20.5V13.5H14.5V19.5H8.5V25.5Z" fill="url(#${uid}_wood)" stroke="#3A2E2B" stroke-width="1.6" stroke-linejoin="round"/>
          <line x1="6.5" y1="18.2" x2="21.2" y2="5.5" stroke="url(#${uid}_gold)" stroke-width="2.8" stroke-linecap="round"/>
        </g>`;
      break;

    case 'padlock_gold':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M10.5 14V10.2C10.5 6.8 21.5 6.8 21.5 10.2V14" fill="none" stroke="#3A2E2B" stroke-width="3.6" stroke-linecap="round"/>
          <path d="M10.5 14V10.2C10.5 6.8 21.5 6.8 21.5 10.2V14" fill="none" stroke="#CBD5E1" stroke-width="1.8" stroke-linecap="round"/>
          <rect x="7" y="13.5" width="18" height="13.5" rx="4" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.6"/>
          <circle cx="16" cy="19.5" r="2.1" fill="#3A2E2B"/>
        </g>`;
      break;

    case 'quill_edit':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M7 25L9.5 18.5L21.5 6.5C23 5 25.5 7.5 24 9L12 21Z" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.6" stroke-linejoin="round"/>
          <path d="M7 25L9.5 18.5L12 21Z" fill="#3A2E2B"/>
        </g>`;
      break;

    case 'bed_ico':
      body = `
        <g filter="url(#${uid}_sh)">
          <rect x="4.5" y="9.5" width="4.2" height="15.5" rx="1.8" fill="url(#${uid}_wood)" stroke="#3A2E2B" stroke-width="1.5"/>
          <rect x="4.5" y="16.8" width="23" height="6.8" rx="2.2" fill="url(#${uid}_coral)" stroke="#3A2E2B" stroke-width="1.5"/>
          <rect x="8.8" y="13.2" width="7.2" height="4.2" rx="1.8" fill="#FFFDF7" stroke="#3A2E2B" stroke-width="1.3"/>
          <rect x="24" y="15.8" width="3.5" height="9.2" rx="1.5" fill="url(#${uid}_wood)" stroke="#3A2E2B" stroke-width="1.4"/>
        </g>`;
      break;

    case 'sofa_ico':
      body = `
        <g filter="url(#${uid}_sh)">
          <rect x="6" y="9.5" width="20" height="11.5" rx="4.2" fill="url(#${uid}_mint)" stroke="#3A2E2B" stroke-width="1.6"/>
          <rect x="3.8" y="13.8" width="5.2" height="9.5" rx="2.4" fill="url(#${uid}_mint)" stroke="#3A2E2B" stroke-width="1.5"/>
          <rect x="23" y="13.8" width="5.2" height="9.5" rx="2.4" fill="url(#${uid}_mint)" stroke="#3A2E2B" stroke-width="1.5"/>
          <rect x="7.5" y="17" width="17" height="6.2" rx="2.2" fill="#FFFDF7" stroke="#3A2E2B" stroke-width="1.4"/>
        </g>`;
      break;

    case 'tv_ico':
      body = `
        <g filter="url(#${uid}_sh)">
          <rect x="5" y="6.8" width="22" height="14.8" rx="3.2" fill="#334155" stroke="#3A2E2B" stroke-width="1.6"/>
          <rect x="7.5" y="9.2" width="17" height="9.8" rx="1.8" fill="url(#${uid}_sky)"/>
          <rect x="13.5" y="21.5" width="5" height="3" fill="#94A3B8" stroke="#3A2E2B" stroke-width="1.3"/>
          <rect x="10" y="24" width="12" height="2.8" rx="1.4" fill="url(#${uid}_wood)" stroke="#3A2E2B" stroke-width="1.3"/>
        </g>`;
      break;

    case 'palette_ico':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M16 4.8C9.6 4.8 4.8 9.5 4.8 15.5C4.8 21.4 9.6 26.2 15.4 26.2C17.6 26.2 19 24.6 19 22.8C19 21.8 18.4 21 18.4 20.1C18.4 19 19.3 18.4 20.5 18.4H22.4C25.4 18.4 27.6 16 27.6 13C27.6 8.4 22.3 4.8 16 4.8Z" fill="url(#${uid}_cream)" stroke="#3A2E2B" stroke-width="1.6"/>
          <circle cx="10.8" cy="12.8" r="2.3" fill="#FF6B6B"/>
          <circle cx="16" cy="9.8" r="2.3" fill="#FFD93D"/>
          <circle cx="21.2" cy="12.4" r="2.3" fill="#38E54D"/>
          <circle cx="11.4" cy="18.6" r="2.3" fill="#4CC2FF"/>
        </g>`;
      break;

    case 'bakery_ico':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M5.5 20C5.5 13 10.2 9.5 16 9.5C21.8 9.5 26.5 13 26.5 20C26.5 22.8 23.8 24.2 21.2 23C19 22 17.5 22 16 22C14.5 22 13 22 10.8 23C8.2 24.2 5.5 22.8 5.5 20Z" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.6"/>
          <path d="M11.8 11Q13.5 16 11.8 21.2M16 10V21.5M20.2 11Q18.5 16 20.2 21.2" fill="none" stroke="#8C4A08" stroke-width="1.5" stroke-linecap="round"/>
        </g>`;
      break;

    case 'roastery_ico':
    case 'coffee_cup':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M22.5 13.5H25C26.8 13.5 28 15 28 16.8C28 18.6 26.8 20 25 20H22.5" fill="none" stroke="#3A2E2B" stroke-width="2.8" stroke-linecap="round"/>
          <path d="M6.5 11.5H23.5L21.8 23.5C21.5 25.5 19.8 27 17.8 27H12.2C10.2 27 8.5 25.5 8.2 23.5L6.5 11.5Z" fill="url(#${uid}_cream)" stroke="#3A2E2B" stroke-width="1.6"/>
          <ellipse cx="15" cy="11.5" rx="8.5" ry="2.6" fill="url(#${uid}_leather)" stroke="#3A2E2B" stroke-width="1.4"/>
          <path d="M12 5.2Q13.5 7.2 12 9.2M17.5 4.8Q19 6.8 17.5 8.8" fill="none" stroke="#FF6B6B" stroke-width="1.8" stroke-linecap="round"/>
        </g>`;
      break;

    case 'flower_ico':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M12 20L16 27L20 20Z" fill="url(#${uid}_wood)" stroke="#3A2E2B" stroke-width="1.5" stroke-linejoin="round"/>
          <circle cx="16" cy="9.5" r="4.2" fill="url(#${uid}_coral)" stroke="#3A2E2B" stroke-width="1.3"/>
          <circle cx="10.8" cy="13.5" r="4.2" fill="#FF9EBB" stroke="#3A2E2B" stroke-width="1.3"/>
          <circle cx="21.2" cy="13.5" r="4.2" fill="url(#${uid}_purple)" stroke="#3A2E2B" stroke-width="1.3"/>
          <circle cx="13" cy="18.2" r="4" fill="url(#${uid}_mint)" stroke="#3A2E2B" stroke-width="1.3"/>
          <circle cx="19" cy="18.2" r="4" fill="url(#${uid}_mint)" stroke="#3A2E2B" stroke-width="1.3"/>
          <circle cx="16" cy="14" r="3.2" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.3"/>
        </g>`;
      break;

    case 'horn_ico':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M6 14H11.2L21.5 7.8V24.2L11.2 18H6V14Z" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.6" stroke-linejoin="round"/>
          <circle cx="6" cy="16" r="3" fill="url(#${uid}_coral)" stroke="#3A2E2B" stroke-width="1.4"/>
          <path d="M24.2 11.5C26.8 13.8 26.8 18.2 24.2 20.5M27 8.8C30.4 12.5 30.4 19.5 27 23.2" fill="none" stroke="#FFFDF7" stroke-width="2.4" stroke-linecap="round"/>
        </g>`;
      break;

    case 'cruise_loop':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M8 12.5A7.5 7.5 0 0 1 22.5 10.5M24 19.5A7.5 7.5 0 0 1 9.5 21.5" fill="none" stroke="#FFFDF7" stroke-width="3" stroke-linecap="round"/>
          <polygon points="24.5,6.8 25.2,12.8 19.5,11.6" fill="#FFD93D" stroke="#3A2E2B" stroke-width="1"/>
          <polygon points="7.5,25.2 6.8,19.2 12.5,20.4" fill="#FFD93D" stroke="#3A2E2B" stroke-width="1"/>
        </g>`;
      break;

    case 'magnet_coin':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M7.5 9V17.5C7.5 22.5 11.2 26 16 26C20.8 26 24.5 22.5 24.5 17.5V9H19.8V17.2C19.8 19.6 18.2 21.2 16 21.2C13.8 21.2 12.2 19.6 12.2 17.2V9Z" fill="url(#${uid}_coral)" stroke="#3A2E2B" stroke-width="1.6"/>
          <rect x="7.5" y="6.5" width="4.7" height="4" rx="1" fill="#E2E8F0" stroke="#3A2E2B" stroke-width="1.3"/>
          <rect x="19.8" y="6.5" width="4.7" height="4" rx="1" fill="#E2E8F0" stroke="#3A2E2B" stroke-width="1.3"/>
        </g>`;
      break;

    case 'quest_trophy':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M8.5 5.5H23.5V12.5C23.5 17 20.1 20 16 20C11.9 20 8.5 17 8.5 12.5V5.5Z" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.6"/>
          <rect x="14" y="19.5" width="4" height="4.5" rx="1" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.4"/>
          <rect x="10" y="23.5" width="12" height="4" rx="2" fill="url(#${uid}_wood)" stroke="#3A2E2B" stroke-width="1.5"/>
          <polygon points="16,8.2 17.3,11 20.2,11.3 18,13.2 18.6,16 16,14.5 13.4,16 14,13.2 11.8,11.3 14.7,11" fill="#FFFDF7"/>
        </g>`;
      break;

    case 'target_aim':
      body = `
        <g filter="url(#${uid}_sh)">
          <circle cx="16" cy="16" r="10.8" fill="url(#${uid}_sky)" stroke="#3A2E2B" stroke-width="1.6"/>
          <circle cx="16" cy="16" r="6.8" fill="#FFFDF7" stroke="#3A2E2B" stroke-width="1.3"/>
          <circle cx="16" cy="16" r="3.2" fill="url(#${uid}_coral)" stroke="#3A2E2B" stroke-width="1.2"/>
        </g>`;
      break;

    case 'manager_cap':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M5 17C5 11.2 9.8 7.2 16 7.2C22.2 7.2 27 11.2 27 17L24.5 20.5H7.5L5 17Z" fill="#2563EB" stroke="#3A2E2B" stroke-width="1.6"/>
          <rect x="7.2" y="17.8" width="17.6" height="2.6" rx="1.3" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1"/>
          <circle cx="16" cy="13" r="2.6" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.1"/>
        </g>`;
      break;

    case 'broom_clean':
      body = `
        <g filter="url(#${uid}_sh)">
          <line x1="23.5" y1="4.8" x2="13.5" y2="17.5" stroke="#3A2E2B" stroke-width="4.4" stroke-linecap="round"/>
          <line x1="23.5" y1="4.8" x2="13.5" y2="17.5" stroke="url(#${uid}_wood)" stroke-width="2.6" stroke-linecap="round"/>
          <path d="M9.2 16L17.6 20.6L13.4 27.2C10.2 26.4 6.6 24 5 21.4L9.2 16Z" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.6" stroke-linejoin="round"/>
        </g>`;
      break;

    case 'soundproof_hammer':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M16 4.8L25.5 8.8V16.2C25.5 21.8 21.2 25.6 16 27.4C10.8 25.6 6.5 21.8 6.5 16.2V8.8L16 4.8Z" fill="url(#${uid}_sky)" stroke="#3A2E2B" stroke-width="1.6" stroke-linejoin="round"/>
          <path d="M12.2 16.2L15 19L20.5 13.2" fill="none" stroke="#FFFDF7" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
        </g>`;
      break;

    case 'evict_stamp':
      body = `
        <g filter="url(#${uid}_sh)">
          <circle cx="16" cy="8.8" r="4.5" fill="url(#${uid}_coral)" stroke="#3A2E2B" stroke-width="1.5"/>
          <path d="M13.2 12.5H18.8L20.2 19.5H11.8L13.2 12.5Z" fill="url(#${uid}_coral)" stroke="#3A2E2B" stroke-width="1.5"/>
          <rect x="6.5" y="19.5" width="19" height="4.4" rx="2" fill="url(#${uid}_cream)" stroke="#3A2E2B" stroke-width="1.5"/>
          <rect x="8" y="23.8" width="16" height="2.8" rx="1.2" fill="#D6384C"/>
        </g>`;
      break;

    case 'contract_scroll':
      body = `
        <g filter="url(#${uid}_sh)">
          <rect x="7" y="4.8" width="18" height="22.4" rx="3.5" fill="url(#${uid}_cream)" stroke="#3A2E2B" stroke-width="1.6"/>
          <line x1="10.8" y1="10.5" x2="21.2" y2="10.5" stroke="#8B481F" stroke-width="1.8" stroke-linecap="round"/>
          <line x1="10.8" y1="15" x2="19.5" y2="15" stroke="#B08968" stroke-width="1.6" stroke-linecap="round"/>
          <circle cx="19.2" cy="21.2" r="3.4" fill="url(#${uid}_coral)" stroke="#3A2E2B" stroke-width="1.2"/>
        </g>`;
      break;

    case 'elevator':
      body = `
        <g filter="url(#${uid}_sh)">
          <rect x="6" y="4.2" width="20" height="23.6" rx="4.5" fill="url(#${uid}_sky)" stroke="#3A2E2B" stroke-width="1.6"/>
          <rect x="9.2" y="8.2" width="13.6" height="16.8" rx="2.5" fill="#FFFDF7" stroke="#3A2E2B" stroke-width="1.3"/>
          <line x1="16" y1="8.2" x2="16" y2="25" stroke="#0B84D8" stroke-width="1.6"/>
        </g>`;
      break;

    case 'recycle_bin':
      body = `
        <g filter="url(#${uid}_sh)">
          <rect x="7" y="6.5" width="18" height="3.6" rx="1.8" fill="url(#${uid}_mint)" stroke="#3A2E2B" stroke-width="1.4"/>
          <path d="M8.5 10H23.5L21.8 26.5H10.2L8.5 10Z" fill="url(#${uid}_mint)" stroke="#3A2E2B" stroke-width="1.6" stroke-linejoin="round"/>
          <circle cx="16" cy="18.5" r="4" fill="none" stroke="#FFFDF7" stroke-width="2" stroke-dasharray="5 2.5"/>
        </g>`;
      break;

    case 'solar_panel':
      body = `
        <g filter="url(#${uid}_sh)">
          <circle cx="23.5" cy="7.5" r="4.2" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.3"/>
          <polygon points="5.5,13.5 21,11 25.5,23.5 4,25.5" fill="url(#${uid}_sky)" stroke="#3A2E2B" stroke-width="1.6" stroke-linejoin="round"/>
          <line x1="13.5" y1="12.2" x2="14.5" y2="24.5" stroke="#FFFDF7" stroke-width="1.3"/>
          <line x1="5" y1="19.2" x2="23.2" y2="17.2" stroke="#FFFDF7" stroke-width="1.3"/>
        </g>`;
      break;

    case 'berry_farm':
    case 'sprout_lot':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M16 26V14" stroke="#15803D" stroke-width="2.8" stroke-linecap="round"/>
          <path d="M16 16C10 16 7 11.5 8.5 7.5C13 7.5 16 10.5 16 16Z" fill="url(#${uid}_mint)" stroke="#3A2E2B" stroke-width="1.5"/>
          <path d="M16 14C22 14 25 9.5 23.5 5.5C19 5.5 16 8.5 16 14Z" fill="url(#${uid}_mint)" stroke="#3A2E2B" stroke-width="1.5"/>
          <ellipse cx="16" cy="26" rx="6.5" ry="2.2" fill="url(#${uid}_wood)" stroke="#3A2E2B" stroke-width="1.3"/>
        </g>`;
      break;

    case 'cockpit_eye':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M3.5 16C6.8 9.8 11.2 7.2 16 7.2C20.8 7.2 25.2 9.8 28.5 16C25.2 22.2 20.8 24.8 16 24.8C11.2 24.8 6.8 22.2 3.5 16Z" fill="url(#${uid}_cream)" stroke="#3A2E2B" stroke-width="1.6" stroke-linejoin="round"/>
          <circle cx="16" cy="16" r="5.2" fill="url(#${uid}_sky)" stroke="#3A2E2B" stroke-width="1.4"/>
          <circle cx="16" cy="16" r="2.3" fill="#3A2E2B"/>
          <circle cx="14.4" cy="14.2" r="1.2" fill="#FFFFFF"/>
        </g>`;
      break;

    case 'radio_note':
      body = `
        <g filter="url(#${uid}_sh)">
          <rect x="4.5" y="10" width="23" height="16.5" rx="4" fill="url(#${uid}_purple)" stroke="#3A2E2B" stroke-width="1.6"/>
          <circle cx="11.2" cy="18.2" r="4.1" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.3"/>
          <circle cx="11.2" cy="18.2" r="1.5" fill="#3A2E2B"/>
          <line x1="17.8" y1="14.5" x2="24" y2="14.5" stroke="#FFFDF7" stroke-width="2" stroke-linecap="round"/>
          <line x1="17.8" y1="18.5" x2="22.5" y2="18.5" stroke="#FFD93D" stroke-width="2" stroke-linecap="round"/>
          <line x1="17.8" y1="22.2" x2="24.5" y2="22.2" stroke="#8BF598" stroke-width="2" stroke-linecap="round"/>
          <line x1="9" y1="10" x2="21.5" y2="4.5" stroke="#3A2E2B" stroke-width="2.2" stroke-linecap="round"/>
          <circle cx="22" cy="4.5" r="2" fill="url(#${uid}_coral)" stroke="#3A2E2B" stroke-width="1"/>
        </g>`;
      break;

    case 'convertible_roof':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M4.5 20.5L8.2 14.8H23.8L27.5 20.5V24.5H4.5V20.5Z" fill="url(#${uid}_redcar)" stroke="#3A2E2B" stroke-width="1.6" stroke-linejoin="round"/>
          <path d="M9.5 14.5C11.5 9.2 17.5 8.5 21.8 11.2" fill="none" stroke="url(#${uid}_gold)" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="3 2"/>
          <circle cx="10.2" cy="24.5" r="3.1" fill="#1E293B" stroke="#3A2E2B" stroke-width="1.2"/>
          <circle cx="21.8" cy="24.5" r="3.1" fill="#1E293B" stroke="#3A2E2B" stroke-width="1.2"/>
        </g>`;
      break;

    case 'drive_thru_cup':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M9 10.5H21L19.4 26.2H10.6L9 10.5Z" fill="url(#${uid}_cream)" stroke="#3A2E2B" stroke-width="1.6" stroke-linejoin="round"/>
          <rect x="9.8" y="15.2" width="10.4" height="5.2" rx="1.2" fill="url(#${uid}_wood)" stroke="#3A2E2B" stroke-width="1.3"/>
          <rect x="7.8" y="7.8" width="14.4" height="3.2" rx="1.5" fill="url(#${uid}_coral)" stroke="#3A2E2B" stroke-width="1.4"/>
          <path d="M16 7.8L18.5 3.8" stroke="#179E29" stroke-width="2.4" stroke-linecap="round"/>
          <circle cx="24.2" cy="21.5" r="4.2" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.3"/>
        </g>`;
      break;

    case 'walk_enter_door':
      body = `
        <g filter="url(#${uid}_sh)">
          <rect x="6" y="4.5" width="14.5" height="23" rx="2.8" fill="url(#${uid}_wood)" stroke="#3A2E2B" stroke-width="1.6"/>
          <polygon points="9,6.2 18.5,4.2 18.5,25.8 9,27.5" fill="url(#${uid}_cream)" stroke="#3A2E2B" stroke-width="1.4" stroke-linejoin="round"/>
          <circle cx="16.2" cy="16" r="1.5" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1"/>
          <path d="M20.5 16H28M28 16L24.5 12.5M28 16L24.5 19.5" fill="none" stroke="url(#${uid}_mint)" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
        </g>`;
      break;

    case 'golden_bell':
      body = `
        <g filter="url(#${uid}_sh)">
          <circle cx="16" cy="5.6" r="2.4" fill="url(#${uid}_coral)" stroke="#3A2E2B" stroke-width="1.3"/>
          <path d="M8.5 21.5C8.5 13.5 10.5 8 16 8C21.5 8 23.5 13.5 23.5 21.5L26.5 24.2H5.5L8.5 21.5Z" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.7" stroke-linejoin="round"/>
          <circle cx="16" cy="25.8" r="2.8" fill="#E59A0B" stroke="#3A2E2B" stroke-width="1.4"/>
          <path d="M12.2 11.5C10.8 14 10.5 17.5 10.5 20.2" fill="none" stroke="#FFFDF7" stroke-width="2" stroke-linecap="round"/>
          <path d="M4.2 11.5C2.8 13.8 2.8 17.2 4.2 19.5M27.8 11.5C29.2 13.8 29.2 17.2 27.8 19.5" fill="none" stroke="#FFD93D" stroke-width="2.2" stroke-linecap="round"/>
        </g>`;
      break;

    case 'fever_flame':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M16.5 3.8C18.5 8.5 25.5 11.2 25.5 18.2C25.5 23.8 21.2 27.5 16 27.5C10.8 27.5 6.5 23.8 6.5 18.2C6.5 13.5 9.8 10.2 11.5 7.8C11.2 10.8 12.8 12.2 13.8 12.2C13.2 8.8 14.5 5.8 16.5 3.8Z" fill="url(#${uid}_coral)" stroke="#3A2E2B" stroke-width="1.6" stroke-linejoin="round"/>
          <path d="M16 13.2C18.2 15.8 20.5 17.5 20.5 20.8C20.5 23.5 18.5 25.5 16 25.5C13.5 25.5 11.5 23.5 11.5 20.8C11.5 18.2 13.8 15.8 16 13.2Z" fill="url(#${uid}_gold)"/>
        </g>`;
      break;

    case 'doorbell_visit':
      body = `
        <g filter="url(#${uid}_sh)">
          <rect x="6.5" y="4.5" width="19" height="23" rx="5" fill="url(#${uid}_cream)" stroke="#3A2E2B" stroke-width="1.6"/>
          <circle cx="16" cy="16" r="5.5" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.5"/>
          <circle cx="16" cy="16" r="2.3" fill="url(#${uid}_coral)"/>
          <path d="M23.5 6.5L27.5 4.8V11.2" fill="none" stroke="url(#${uid}_mint)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        </g>`;
      break;

    case 'gift_ribbon_box':
      body = `
        <g filter="url(#${uid}_sh)">
          <rect x="6.5" y="12.5" width="19" height="14.5" rx="3" fill="url(#${uid}_cream)" stroke="#3A2E2B" stroke-width="1.6"/>
          <rect x="5.2" y="9" width="21.6" height="4.8" rx="2" fill="url(#${uid}_coral)" stroke="#3A2E2B" stroke-width="1.6"/>
          <rect x="14" y="9" width="4" height="18" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.2"/>
          <path d="M16 9C12.5 4.5 8.5 5.2 9.5 8.5C10.2 9.5 13.5 9 16 9ZM16 9C19.5 4.5 23.5 5.2 22.5 8.5C21.8 9.5 18.5 9 16 9Z" fill="url(#${uid}_coral)" stroke="#3A2E2B" stroke-width="1.4"/>
        </g>`;
      break;

    case 'item_cake_ico':
      body = `
        <g filter="url(#${uid}_sh)">
          <ellipse cx="16" cy="25" rx="11.5" ry="3.2" fill="#FFFDF7" stroke="#3A2E2B" stroke-width="1.4"/>
          <rect x="6.5" y="13.5" width="19" height="10.8" rx="3.5" fill="#FFB3C6" stroke="#3A2E2B" stroke-width="1.6"/>
          <path d="M6.5 16.5Q9.8 19.5 12.8 16.5Q16 19.5 19.2 16.5Q22.5 19.5 25.5 16.5V13.5H6.5Z" fill="#FFFDF7" stroke="#3A2E2B" stroke-width="1.3"/>
          <circle cx="11.5" cy="10.5" r="2.5" fill="url(#${uid}_coral)" stroke="#3A2E2B" stroke-width="1.2"/>
          <circle cx="16" cy="9.5" r="2.7" fill="url(#${uid}_coral)" stroke="#3A2E2B" stroke-width="1.2"/>
          <circle cx="20.5" cy="10.5" r="2.5" fill="url(#${uid}_coral)" stroke="#3A2E2B" stroke-width="1.2"/>
        </g>`;
      break;

    case 'item_croissant_ico':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M4.8 20.5C4.8 12.5 10 8.5 16 8.5C22 8.5 27.2 12.5 27.2 20.5C27.2 23.2 24.2 24.5 21.5 23C19.5 21.8 17.8 21.8 16 21.8C14.2 21.8 12.5 21.8 10.5 23C7.8 24.5 4.8 23.2 4.8 20.5Z" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.6"/>
          <path d="M11.5 10.2Q13.5 15.8 11.5 21.5M20.5 10.2Q18.5 15.8 20.5 21.5" fill="none" stroke="#9A5825" stroke-width="1.6" stroke-linecap="round"/>
        </g>`;
      break;

    case 'item_coffee_ico':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M9 12.5H23L21.2 26.5H10.8L9 12.5Z" fill="url(#${uid}_cream)" stroke="#3A2E2B" stroke-width="1.6" stroke-linejoin="round"/>
          <rect x="9.8" y="16.8" width="12.4" height="5.2" rx="1.2" fill="url(#${uid}_leather)" stroke="#3A2E2B" stroke-width="1.3"/>
          <path d="M8.5 12.5C8.5 7.5 12.5 5.5 16 5.5C19.5 5.5 23.5 7.5 23.5 12.5Z" fill="#FFFDF7" stroke="#3A2E2B" stroke-width="1.5"/>
          <circle cx="16" cy="5.5" r="1.5" fill="#B86B35"/>
        </g>`;
      break;

    case 'item_bouquet_ico':
      body = `
        <g filter="url(#${uid}_sh)">
          <polygon points="9.5,15.5 22.5,15.5 18.2,27.2 13.8,27.2" fill="#FFE4EC" stroke="#3A2E2B" stroke-width="1.6" stroke-linejoin="round"/>
          <rect x="13.2" y="21.2" width="5.6" height="2.4" rx="1" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1"/>
          <circle cx="12" cy="11.5" r="4" fill="url(#${uid}_coral)" stroke="#3A2E2B" stroke-width="1.3"/>
          <circle cx="20" cy="11.5" r="4" fill="#FF8FA3" stroke="#3A2E2B" stroke-width="1.3"/>
          <circle cx="16" cy="8.5" r="4.3" fill="url(#${uid}_redcar)" stroke="#3A2E2B" stroke-width="1.4"/>
        </g>`;
      break;

    case 'item_bento_ico':
      body = `
        <g filter="url(#${uid}_sh)">
          <rect x="4.5" y="9" width="23" height="17" rx="3.8" fill="#3A2E2B" stroke="#3A2E2B" stroke-width="1.6"/>
          <rect x="6.8" y="11.2" width="8.5" height="12.6" rx="2" fill="#FFFDF7"/>
          <circle cx="11" cy="17.5" r="1.8" fill="#FF6B6B"/>
          <rect x="16.8" y="11.2" width="8.4" height="5.8" rx="1.6" fill="url(#${uid}_coral)"/>
          <rect x="16.8" y="18.2" width="8.4" height="5.6" rx="1.6" fill="url(#${uid}_gold)"/>
        </g>`;
      break;

    case 'mart_ico':
      body = `
        <g filter="url(#${uid}_sh)">
          <rect x="5.5" y="11" width="21" height="15.5" rx="3" fill="url(#${uid}_cream)" stroke="#3A2E2B" stroke-width="1.6"/>
          <rect x="4.5" y="6.5" width="23" height="5.5" rx="2.2" fill="url(#${uid}_mint)" stroke="#3A2E2B" stroke-width="1.6"/>
          <rect x="13" y="17.5" width="6" height="9" rx="1.5" fill="url(#${uid}_sky)" stroke="#3A2E2B" stroke-width="1.3"/>
        </g>`;
      break;

    case 'wash_ico':
      body = `
        <g filter="url(#${uid}_sh)">
          <rect x="6.5" y="5.5" width="19" height="21.5" rx="3.8" fill="url(#${uid}_cream)" stroke="#3A2E2B" stroke-width="1.6"/>
          <circle cx="16" cy="17.5" r="6" fill="url(#${uid}_sky)" stroke="#3A2E2B" stroke-width="1.5"/>
          <path d="M11.5 17.5Q14 15 16 17.5Q18 20 20.5 17.5" fill="none" stroke="#FFFDF7" stroke-width="2" stroke-linecap="round"/>
        </g>`;
      break;

    case 'money_gun':
      body = `
        <g filter="url(#${uid}_sh)">
          <rect x="4" y="10.5" width="16.5" height="8" rx="2.6" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.6"/>
          <path d="M7.5 18.5L5.8 26.2H11.2L12.6 18.5Z" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.5" stroke-linejoin="round"/>
          <rect x="7" y="6.8" width="9.5" height="4" rx="1.3" fill="url(#${uid}_mint)" stroke="#3A2E2B" stroke-width="1.3"/>
          <rect x="21.2" y="7.5" width="7.8" height="4.8" rx="1.2" transform="rotate(-14 25 10)" fill="url(#${uid}_mint)" stroke="#3A2E2B" stroke-width="1.3"/>
          <rect x="22.4" y="14.2" width="7.4" height="4.6" rx="1.2" transform="rotate(14 26 16)" fill="url(#${uid}_mint)" stroke="#3A2E2B" stroke-width="1.3"/>
        </g>`;
      break;

    case 'statue_gold':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M11.5 7.5L13 4.2L16 6.2L19 4.2L20.5 7.5Z" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.2"/>
          <circle cx="16" cy="10.8" r="3.6" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.5"/>
          <path d="M11 15H21L19.6 22.5H12.4L11 15Z" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.5" stroke-linejoin="round"/>
          <rect x="8.2" y="22.5" width="15.6" height="4.8" rx="1.8" fill="url(#${uid}_cream)" stroke="#3A2E2B" stroke-width="1.5"/>
        </g>`;
      break;

    case 'firework_ico':
      body = `
        <g filter="url(#${uid}_sh)">
          <circle cx="16" cy="16" r="3.2" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.3"/>
          <path d="M16 4V9M16 23V28M4 16H9M23 16H28M7.5 7.5L11.2 11.2M20.8 20.8L24.5 24.5M24.5 7.5L20.8 11.2M11.2 20.8L7.5 24.5" stroke="url(#${uid}_coral)" stroke-width="2.6" stroke-linecap="round"/>
        </g>`;
      break;

    case 'palm_road':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M6 26.5L12.5 16.5H19.5L26 26.5Z" fill="#475569" stroke="#3A2E2B" stroke-width="1.5" stroke-linejoin="round"/>
          <line x1="16" y1="18" x2="16" y2="25" stroke="#FFD93D" stroke-width="2" stroke-dasharray="2.4 2"/>
          <path d="M9.5 16.5Q10.5 10.5 13.5 8.5" fill="none" stroke="url(#${uid}_wood)" stroke-width="2.4" stroke-linecap="round"/>
          <path d="M13.5 8.5C9.5 7 7 9 6.5 11.5M13.5 8.5C12.5 4.8 15.5 4.2 17.8 6M13.5 8.5C16.8 7.5 18.8 9.8 18.2 12" fill="none" stroke="url(#${uid}_mint)" stroke-width="2.2" stroke-linecap="round"/>
        </g>`;
      break;

    case 'banner_flag':
      body = `
        <g filter="url(#${uid}_sh)">
          <line x1="7.5" y1="4.5" x2="7.5" y2="27.5" stroke="#3A2E2B" stroke-width="2.8" stroke-linecap="round"/>
          <path d="M8.5 6.5H25.5L22.5 12L25.5 17.5H8.5Z" fill="url(#${uid}_coral)" stroke="#3A2E2B" stroke-width="1.5" stroke-linejoin="round"/>
          <circle cx="15.5" cy="12" r="2.3" fill="url(#${uid}_gold)"/>
        </g>`;
      break;

    case 'music_mote':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M12 22V8.5L23 6.2V19.5" fill="none" stroke="url(#${uid}_sky)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="9.8" cy="22.5" r="3.4" fill="url(#${uid}_sky)" stroke="#3A2E2B" stroke-width="1.3"/>
          <circle cx="20.8" cy="20" r="3.4" fill="url(#${uid}_mint)" stroke="#3A2E2B" stroke-width="1.3"/>
        </g>`;
      break;

    case 'rival_bolt':
      body = `
        <g filter="url(#${uid}_sh)">
          <circle cx="16" cy="16" r="11.2" fill="url(#${uid}_purple)" stroke="#3A2E2B" stroke-width="1.7"/>
          <path d="M17.8 5.2L9.2 17.2H15.4L13.8 26.8L22.8 14.4H16.6L17.8 5.2Z" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.5" stroke-linejoin="round"/>
        </g>`;
      break;

    case 'forbes_trophy':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M8.5 7.5H23.5V13.5C23.5 18 20.2 21 16 21C11.8 21 8.5 18 8.5 13.5V7.5Z" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.6" stroke-linejoin="round"/>
          <path d="M8.5 9.5H5.2C4.6 9.5 4.2 10 4.3 10.6C4.8 14.2 6.8 16.2 9.2 16.5M23.5 9.5H26.8C27.4 9.5 27.8 10 27.7 10.6C27.2 14.2 25.2 16.2 22.8 16.5" fill="none" stroke="url(#${uid}_gold)" stroke-width="2.4" stroke-linecap="round"/>
          <rect x="13.8" y="20.8" width="4.4" height="3.8" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.4"/>
          <rect x="10" y="24.5" width="12" height="3.5" rx="1.4" fill="url(#${uid}_leather)" stroke="#3A2E2B" stroke-width="1.5"/>
          <polygon points="16,10.2 17.2,12.7 19.9,13.1 17.9,15 18.4,17.7 16,16.4 13.6,17.7 14.1,15 12.1,13.1 14.8,12.7" fill="#FFFDF7"/>
        </g>`;
      break;

    case 'auction_paddle':
      body = `
        <g filter="url(#${uid}_sh)">
          <rect x="14.2" y="17.5" width="3.6" height="10.2" rx="1.6" fill="url(#${uid}_wood)" stroke="#3A2E2B" stroke-width="1.4"/>
          <circle cx="16" cy="11.8" r="7.6" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.7"/>
          <circle cx="16" cy="11.8" r="5.3" fill="#FFFDF7" stroke="#B45309" stroke-width="1.1"/>
          <path d="M13.5 12.2L15.3 14L19 9.8" fill="none" stroke="#D97706" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        </g>`;
      break;

    case 'golden_briefcase':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M11.8 8.8V6.5C11.8 5.4 12.7 4.6 13.8 4.6H18.2C19.3 4.6 20.2 5.4 20.2 6.5V8.8" fill="none" stroke="#3A2E2B" stroke-width="2.4" stroke-linecap="round"/>
          <rect x="4.5" y="8.8" width="23" height="17.5" rx="3.6" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.7"/>
          <line x1="4.8" y1="16.2" x2="27.2" y2="16.2" stroke="#3A2E2B" stroke-width="1.5"/>
          <rect x="13.2" y="14.2" width="5.6" height="4.2" rx="1.2" fill="#FFFDF7" stroke="#3A2E2B" stroke-width="1.4"/>
        </g>`;
      break;

    case 'race_flag':
      body = `
        <g filter="url(#${uid}_sh)">
          <line x1="6.8" y1="5" x2="6.8" y2="27.5" stroke="#3A2E2B" stroke-width="2.6" stroke-linecap="round"/>
          <rect x="7.8" y="6.2" width="18.4" height="12.4" rx="2" fill="#FFFDF7" stroke="#3A2E2B" stroke-width="1.6"/>
          <rect x="7.8" y="6.2" width="4.6" height="4.1" fill="#3A2E2B"/>
          <rect x="17" y="6.2" width="4.6" height="4.1" fill="#3A2E2B"/>
          <rect x="12.4" y="10.3" width="4.6" height="4.1" fill="#3A2E2B"/>
          <rect x="21.6" y="10.3" width="4.6" height="4.1" fill="#3A2E2B"/>
          <rect x="7.8" y="14.4" width="4.6" height="4.1" fill="#3A2E2B"/>
          <rect x="17" y="14.4" width="4.6" height="4.1" fill="#3A2E2B"/>
        </g>`;
      break;

    case 'megaphone_purple':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M6.5 14.2L22.5 7.5V23.5L6.5 18.2Z" fill="url(#${uid}_purple)" stroke="#3A2E2B" stroke-width="1.6" stroke-linejoin="round"/>
          <rect x="4.2" y="13.6" width="3.5" height="5.2" rx="1.3" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.4"/>
          <path d="M9.5 18.8L11.2 25.2H14.5L13.2 19.8" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.4" stroke-linejoin="round"/>
          <path d="M25.2 11.5Q28 15.5 25.2 19.5" fill="none" stroke="url(#${uid}_gold)" stroke-width="2.4" stroke-linecap="round"/>
        </g>`;
      break;

    case 'sleep_zzz':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M6 19.5H12.5L6 26H12.8" fill="none" stroke="url(#${uid}_sky)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M14.5 11.5H22L14.5 19H22.5" fill="none" stroke="url(#${uid}_purple)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M21.5 5H27.2L21.5 10.5H27.5" fill="none" stroke="url(#${uid}_gold)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        </g>`;
      break;

    case 'lightbulb_tip':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M16 4.8C11.3 4.8 7.8 8.2 7.8 12.6C7.8 15.5 9.5 18 11.8 19.5L12.4 22.5H19.6L20.2 19.5C22.5 18 24.2 15.5 24.2 12.6C24.2 8.2 20.7 4.8 16 4.8Z" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.6" stroke-linejoin="round"/>
          <rect x="12.6" y="22.5" width="6.8" height="4.2" rx="1.6" fill="url(#${uid}_cream)" stroke="#3A2E2B" stroke-width="1.5"/>
          <path d="M13.5 13.5L15.4 15.8L19 11.2" fill="none" stroke="#FFFDF7" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
        </g>`;
      break;

    default:
      body = `
        <g filter="url(#${uid}_sh)">
          <polygon points="16,4.5 19.3,11.4 26.8,12.4 21.3,17.7 22.7,25.2 16,21.6 9.3,25.2 10.7,17.7 5.2,12.4 12.7,11.4" fill="url(#${uid}_gold)" stroke="#3A2E2B" stroke-width="1.6" stroke-linejoin="round"/>
        </g>`;
      break;
  }

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" class="inline-block shrink-0 select-none">
      ${defs}
      ${body}
    </svg>`;
}

// =========================================================
// 2. 가구 · 상가 설비 · 슈퍼카 상점용 '와이드 아이소메트릭 프리뷰 썸네일' 생성기
// =========================================================
function createCatalogThumbnailSVG(itemId, width = 148, height = 74) {
  const uid = `thumb_${itemId}_${++svgUidSeq}`;
  let stageBg = '#FFF6EC';
  let stageFloor = '#F1DFCE';
  let art = '';

  switch (itemId) {
    // ---- 침실/침대 4종 ----
    case 'bed_iron':
      stageBg = '#EBF8FF';
      stageFloor = '#D5EEFF';
      art = `
        <ellipse cx="74" cy="58" rx="46" ry="9" fill="#BBDDF5"/>
        <rect x="34" y="22" width="7" height="32" rx="3" fill="#475569" stroke="#3A2E2B" stroke-width="1.8"/>
        <rect x="36" y="38" width="76" height="14" rx="4" fill="#4CC2FF" stroke="#3A2E2B" stroke-width="1.8"/>
        <rect x="43" y="31" width="22" height="8.5" rx="4" fill="#FFFDF7" stroke="#3A2E2B" stroke-width="1.5"/>
        <rect x="67" y="33" width="42" height="9" rx="3.5" fill="#BAE6FD" stroke="#3A2E2B" stroke-width="1.4"/>
        <rect x="107" y="34" width="6.5" height="21" rx="2.8" fill="#475569" stroke="#3A2E2B" stroke-width="1.8"/>`;
      break;

    case 'bed_queen':
      stageBg = '#ECFDF3';
      stageFloor = '#D1F7E0';
      art = `
        <ellipse cx="74" cy="59" rx="50" ry="10" fill="#B2E8C8"/>
        <rect x="30" y="18" width="88" height="22" rx="6" fill="#B86B35" stroke="#3A2E2B" stroke-width="1.8"/>
        <rect x="26" y="36" width="96" height="18" rx="5" fill="#D98A4E" stroke="#3A2E2B" stroke-width="1.8"/>
        <rect x="32" y="29" width="84" height="15" rx="5" fill="#6EE7B7" stroke="#3A2E2B" stroke-width="1.6"/>
        <rect x="38" y="23" width="28" height="9" rx="4" fill="#FFFDF7" stroke="#3A2E2B" stroke-width="1.5"/>
        <rect x="82" y="23" width="28" height="9" rx="4" fill="#FFFDF7" stroke="#3A2E2B" stroke-width="1.5"/>`;
      break;

    case 'bed_canopy':
      stageBg = '#FFF0F5';
      stageFloor = '#FCE0EA';
      art = `
        <ellipse cx="74" cy="61" rx="52" ry="9" fill="#F5C2D4"/>
        <line x1="34" y1="14" x2="34" y2="56" stroke="#E59A0B" stroke-width="3.2" stroke-linecap="round"/>
        <line x1="114" y1="14" x2="114" y2="56" stroke="#E59A0B" stroke-width="3.2" stroke-linecap="round"/>
        <rect x="34" y="40" width="80" height="15" rx="5" fill="#FF6B6B" stroke="#3A2E2B" stroke-width="1.8"/>
        <rect x="42" y="33" width="25" height="8" rx="4" fill="#FFFDF7" stroke="#3A2E2B" stroke-width="1.4"/>
        <rect x="81" y="33" width="25" height="8" rx="4" fill="#FFFDF7" stroke="#3A2E2B" stroke-width="1.4"/>
        <path d="M28 15H120L114 25C100 28 88 22 74 26C60 22 48 28 34 25Z" fill="#FFB3C6" stroke="#3A2E2B" stroke-width="1.7"/>
        <path d="M34 23Q46 38 36 52M114 23Q102 38 112 52" fill="none" stroke="#FF85A1" stroke-width="2.6" stroke-linecap="round"/>`;
      break;

    case 'bed_bunk':
      stageBg = '#FFFBEB';
      stageFloor = '#F9E8BE';
      art = `
        <ellipse cx="74" cy="61" rx="50" ry="8.5" fill="#EBD096"/>
        <rect x="32" y="12" width="7" height="48" rx="2.5" fill="#9A5825" stroke="#3A2E2B" stroke-width="1.7"/>
        <rect x="109" y="12" width="7" height="48" rx="2.5" fill="#9A5825" stroke="#3A2E2B" stroke-width="1.7"/>
        <rect x="36" y="18" width="76" height="11" rx="3.5" fill="#FF6B6B" stroke="#3A2E2B" stroke-width="1.6"/>
        <rect x="36" y="42" width="76" height="12" rx="3.5" fill="#FFD93D" stroke="#3A2E2B" stroke-width="1.6"/>
        <rect x="92" y="16" width="14" height="42" rx="2" fill="none" stroke="#3A2E2B" stroke-width="1.8"/>
        <line x1="92" y1="26" x2="106" y2="26" stroke="#3A2E2B" stroke-width="1.8"/>
        <line x1="92" y1="36" x2="106" y2="36" stroke="#3A2E2B" stroke-width="1.8"/>
        <line x1="92" y1="46" x2="106" y2="46" stroke="#3A2E2B" stroke-width="1.8"/>`;
      break;

    // ---- 거실/소파 4종 ----
    case 'sofa_beanbag':
      stageBg = '#FFFBEB';
      stageFloor = '#F7E5B7';
      art = `
        <ellipse cx="74" cy="58" rx="42" ry="9" fill="#E6CB8A"/>
        <path d="M44 50C42 30 56 16 74 16C92 16 106 30 104 50C103 58 89 60 74 60C59 60 45 58 44 50Z" fill="#FFD93D" stroke="#3A2E2B" stroke-width="1.9"/>
        <ellipse cx="64" cy="30" rx="10" ry="5" fill="#FFFDF7" opacity="0.65" transform="rotate(-22 64 30)"/>
        <circle cx="96" cy="49" r="9" fill="#FF6B6B" stroke="#3A2E2B" stroke-width="1.5"/>`;
      break;

    case 'sofa_mint2':
      stageBg = '#ECFDF3';
      stageFloor = '#CDEFD9';
      art = `
        <ellipse cx="74" cy="59" rx="50" ry="9" fill="#B2DEC4"/>
        <rect x="34" y="20" width="80" height="24" rx="8" fill="#38E54D" stroke="#3A2E2B" stroke-width="1.8"/>
        <rect x="26" y="31" width="15" height="23" rx="6" fill="#22C55E" stroke="#3A2E2B" stroke-width="1.7"/>
        <rect x="107" y="31" width="15" height="23" rx="6" fill="#22C55E" stroke="#3A2E2B" stroke-width="1.7"/>
        <rect x="38" y="36" width="72" height="17" rx="5" fill="#BBF7D0" stroke="#3A2E2B" stroke-width="1.7"/>
        <rect x="46" y="25" width="16" height="12" rx="4" fill="#FFD93D" stroke="#3A2E2B" stroke-width="1.4" transform="rotate(-8 54 31)"/>`;
      break;

    case 'sofa_rocker':
      stageBg = '#FFF4EE';
      stageFloor = '#F5DBC9';
      art = `
        <ellipse cx="74" cy="59" rx="48" ry="9" fill="#E3C1AA"/>
        <rect x="34" y="17" width="30" height="24" rx="5" fill="#C67D43" stroke="#3A2E2B" stroke-width="1.7"/>
        <rect x="38" y="22" width="22" height="16" rx="4" fill="#FF8585" stroke="#3A2E2B" stroke-width="1.4"/>
        <path d="M28 52Q49 62 68 52" fill="none" stroke="#6E3B16" stroke-width="3.4" stroke-linecap="round"/>
        <rect x="78" y="34" width="38" height="7" rx="3" fill="#E09F67" stroke="#3A2E2B" stroke-width="1.6"/>
        <line x1="97" y1="41" x2="97" y2="55" stroke="#6E3B16" stroke-width="3" stroke-linecap="round"/>
        <rect x="91" y="25" width="12" height="9" rx="2.5" fill="#FFFDF7" stroke="#3A2E2B" stroke-width="1.4"/>`;
      break;

    case 'sofa_leather_l':
      stageBg = '#FFF8EB';
      stageFloor = '#F3DFC1';
      art = `
        <ellipse cx="74" cy="60" rx="54" ry="9" fill="#DFC39D"/>
        <rect x="24" y="20" width="76" height="22" rx="7" fill="#9A5825" stroke="#3A2E2B" stroke-width="1.8"/>
        <rect x="22" y="34" width="62" height="16" rx="5" fill="#C47435" stroke="#3A2E2B" stroke-width="1.7"/>
        <rect x="82" y="32" width="42" height="25" rx="6" fill="#C47435" stroke="#3A2E2B" stroke-width="1.8"/>
        <rect x="38" y="24" width="15" height="11" rx="3.5" fill="#FFD93D" stroke="#3A2E2B" stroke-width="1.4"/>`;
      break;

    // ---- 주방/가전 4종 (선풍기 · 시네마 빔프로젝터&에어컨 · 빈티지 LP 턴테이블&방음매트 · RGB 트리플 모니터) ----
    case 'app_fan':
      stageBg = '#EFF8FF';
      stageFloor = '#D6EBFA';
      art = `
        <ellipse cx="74" cy="59" rx="34" ry="8" fill="#B8D9F2"/>
        <rect x="70" y="34" width="8" height="22" rx="3" fill="#94A3B8" stroke="#3A2E2B" stroke-width="1.6"/>
        <ellipse cx="74" cy="57" rx="18" ry="5" fill="#FFFDF7" stroke="#3A2E2B" stroke-width="1.6"/>
        <circle cx="74" cy="24" r="15" fill="#E0F2FE" stroke="#3A2E2B" stroke-width="1.8"/>
        <circle cx="74" cy="24" r="10" fill="#4CC2FF" opacity="0.55"/>
        <circle cx="74" cy="24" r="3.5" fill="#FFD93D" stroke="#3A2E2B" stroke-width="1.3"/>`;
      break;

    case 'app_ac':
      stageBg = '#EEF6FF';
      stageFloor = '#D5E6FA';
      art = `
        <rect x="28" y="13" width="60" height="34" rx="4" fill="#FFFDF7" stroke="#3A2E2B" stroke-width="1.8"/>
        <rect x="33" y="17" width="50" height="26" rx="2" fill="#4CC2FF"/>
        <polygon points="88,36 116,44 116,52 88,42" fill="#FFD93D" opacity="0.45"/>
        <rect x="96" y="42" width="26" height="12" rx="4" fill="#FFFDF7" stroke="#3A2E2B" stroke-width="1.7"/>
        <circle cx="103" cy="48" r="3.5" fill="#334155"/>`;
      break;

    case 'app_soundmat':
      stageBg = '#F4F1FF';
      stageFloor = '#E2DAFA';
      art = `
        <polygon points="24,52 46,38 124,38 108,58" fill="#8BF598" stroke="#3A2E2B" stroke-width="1.6"/>
        <rect x="48" y="20" width="52" height="26" rx="5" fill="#B86B35" stroke="#3A2E2B" stroke-width="1.8"/>
        <circle cx="68" cy="33" r="10" fill="#1E293B" stroke="#3A2E2B" stroke-width="1.5"/>
        <circle cx="68" cy="33" r="3.5" fill="#FF6B6B"/>
        <line x1="88" y1="24" x2="75" y2="34" stroke="#FFD93D" stroke-width="2.4" stroke-linecap="round"/>`;
      break;

    case 'app_rgb_desk':
      stageBg = '#F5F0FF';
      stageFloor = '#E3D7FA';
      art = `
        <rect x="26" y="44" width="96" height="7" rx="3" fill="#334155" stroke="#3A2E2B" stroke-width="1.7"/>
        <line x1="38" y1="51" x2="38" y2="62" stroke="#3A2E2B" stroke-width="3.2" stroke-linecap="round"/>
        <line x1="110" y1="51" x2="110" y2="62" stroke="#3A2E2B" stroke-width="3.2" stroke-linecap="round"/>
        <rect x="28" y="20" width="27" height="19" rx="3" fill="#4CC2FF" stroke="#3A2E2B" stroke-width="1.6" transform="rotate(-5 41 29)"/>
        <rect x="58" y="17" width="32" height="21" rx="3" fill="#C084FC" stroke="#3A2E2B" stroke-width="1.7"/>
        <rect x="93" y="20" width="27" height="19" rx="3" fill="#FF6B6B" stroke="#3A2E2B" stroke-width="1.6" transform="rotate(5 106 29)"/>`;
      break;

    // ---- 벽지/마루/복층계단 4종 ----
    case 'dec_peach':
    case 'dec_sage':
    case 'dec_butter':
    case 'dec_lavender': {
      const pal = {
        dec_peach: ['#F6CEB8', '#FCE8D2', '#D98A4E', '#FFF4EE'],
        dec_sage: ['#B7DEC1', '#E4F5E8', '#6F4528', '#ECFDF3'],
        dec_butter: ['#F9E29C', '#FFFDF5', '#FFD93D', '#FFFBEB'],
        dec_lavender: ['#D5C5F2', '#F5EFFF', '#FF6B6B', '#F8F4FF']
      }[itemId];
      stageBg = pal[3];
      art = `
        <rect x="24" y="12" width="100" height="28" rx="6" fill="${pal[0]}" stroke="#3A2E2B" stroke-width="1.7"/>
        <rect x="24" y="38" width="100" height="22" rx="6" fill="${pal[1]}" stroke="#3A2E2B" stroke-width="1.7"/>
        <path d="M84 58H118V22H106V34H95V46H84V58Z" fill="${pal[2]}" stroke="#3A2E2B" stroke-width="1.7" stroke-linejoin="round"/>`;
      break;
    }

    // ---- 부티크 단독 상가 설비 업그레이드 3종 ----
    case 'upg_oven':
      stageBg = '#FFF2EE';
      stageFloor = '#F7D9CE';
      art = `
        <rect x="28" y="14" width="46" height="44" rx="6" fill="#475569" stroke="#3A2E2B" stroke-width="1.8"/>
        <rect x="35" y="24" width="32" height="15" rx="3" fill="#FF5722" stroke="#3A2E2B" stroke-width="1.5"/>
        <rect x="80" y="22" width="40" height="36" rx="6" fill="#FFD93D" stroke="#3A2E2B" stroke-width="1.8"/>
        <rect x="88" y="38" width="10" height="12" rx="2" fill="#FFFDF7" stroke="#3A2E2B" stroke-width="1.4"/>
        <circle cx="100" cy="30" r="4" fill="#FF6B6B" stroke="#3A2E2B" stroke-width="1.2"/>`;
      break;

    case 'upg_terrace':
      stageBg = '#ECFDF3';
      stageFloor = '#CFEFD9';
      art = `
        <ellipse cx="74" cy="59" rx="48" ry="8" fill="#B2DFC2"/>
        <line x1="74" y1="22" x2="74" y2="57" stroke="#6E3B16" stroke-width="3.4"/>
        <ellipse cx="74" cy="48" rx="24" ry="7" fill="#FFFDF7" stroke="#3A2E2B" stroke-width="1.7"/>
        <path d="M36 28L74 10L112 28Z" fill="#179E29" stroke="#3A2E2B" stroke-width="1.8" stroke-linejoin="round"/>
        <rect x="34" y="42" width="12" height="14" rx="3" fill="#38E54D" stroke="#3A2E2B" stroke-width="1.5"/>
        <rect x="102" y="42" width="12" height="14" rx="3" fill="#38E54D" stroke="#3A2E2B" stroke-width="1.5"/>`;
      break;

    case 'upg_crate':
      stageBg = '#FFFBEB';
      stageFloor = '#F7E3B5';
      art = `
        <rect x="28" y="32" width="42" height="24" rx="4" fill="#D98A4E" stroke="#3A2E2B" stroke-width="1.8"/>
        <circle cx="38" cy="29" r="6.5" fill="#FF3B3B" stroke="#3A2E2B" stroke-width="1.4"/>
        <circle cx="49" cy="28" r="6.5" fill="#FF3B3B" stroke="#3A2E2B" stroke-width="1.4"/>
        <circle cx="60" cy="29" r="6.5" fill="#FF3B3B" stroke="#3A2E2B" stroke-width="1.4"/>
        <rect x="78" y="32" width="42" height="24" rx="4" fill="#D98A4E" stroke="#3A2E2B" stroke-width="1.8"/>
        <circle cx="88" cy="29" r="6.5" fill="#FF922B" stroke="#3A2E2B" stroke-width="1.4"/>
        <circle cx="99" cy="28" r="6.5" fill="#FF922B" stroke="#3A2E2B" stroke-width="1.4"/>
        <circle cx="110" cy="29" r="6.5" fill="#FF922B" stroke="#3A2E2B" stroke-width="1.4"/>`;
      break;

    // ---- 슈퍼카 차고 4종 ----
    case 'car_scooter':
      stageBg = '#ECFDF3';
      stageFloor = '#CDEFD9';
      art = `
        <ellipse cx="74" cy="58" rx="40" ry="7" fill="#A8DBBE"/>
        <circle cx="48" cy="50" r="9.5" fill="#1E293B" stroke="#3A2E2B" stroke-width="2"/>
        <circle cx="98" cy="50" r="9.5" fill="#1E293B" stroke="#3A2E2B" stroke-width="2"/>
        <path d="M44 48C46 35 60 35 68 44H90L96 20H86" fill="none" stroke="#38E54D" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="55" y="32" width="22" height="7" rx="3.5" fill="#9A5825" stroke="#3A2E2B" stroke-width="1.6"/>`;
      break;

    case 'car_sedan':
      stageBg = '#FFF8EB';
      stageFloor = '#F2DFC2';
      art = `
        <ellipse cx="74" cy="58" rx="50" ry="7" fill="#DBC09A"/>
        <path d="M26 44L38 26H92L114 38L122 44V52H26V44Z" fill="#8B481F" stroke="#3A2E2B" stroke-width="1.9" stroke-linejoin="round"/>
        <path d="M44 29H88L102 39H36Z" fill="#BAE6FD" stroke="#3A2E2B" stroke-width="1.4"/>
        <circle cx="46" cy="52" r="9.5" fill="#1E293B" stroke="#FFFDF7" stroke-width="2"/>
        <circle cx="102" cy="52" r="9.5" fill="#1E293B" stroke="#FFFDF7" stroke-width="2"/>`;
      break;

    case 'car_supercar':
      stageBg = '#FFF0F2';
      stageFloor = '#FAD5DC';
      art = `
        <ellipse cx="74" cy="58" rx="54" ry="7.5" fill="#E8B5C0"/>
        <path d="M22 45L36 31H84L118 39L126 45V52H22V45Z" fill="#FF3B3B" stroke="#3A2E2B" stroke-width="2" stroke-linejoin="round"/>
        <path d="M22 33L32 39" stroke="#3A2E2B" stroke-width="3.6" stroke-linecap="round"/>
        <path d="M72 31L86 22H92L82 32Z" fill="#BAE6FD" stroke="#3A2E2B" stroke-width="1.4"/>
        <circle cx="45" cy="52" r="10" fill="#1E293B" stroke="#FFD93D" stroke-width="2.2"/>
        <circle cx="104" cy="52" r="10" fill="#1E293B" stroke="#FFD93D" stroke-width="2.2"/>`;
      break;

    case 'car_limo':
      stageBg = '#FFFBEB';
      stageFloor = '#F7E5B4';
      art = `
        <ellipse cx="74" cy="58" rx="58" ry="7.5" fill="#E3CA8B"/>
        <path d="M16 43L28 28H106L128 39V51H16V43Z" fill="#FFFDF7" stroke="#D97706" stroke-width="2" stroke-linejoin="round"/>
        <rect x="32" y="31" width="68" height="9.5" rx="2.5" fill="#1E293B"/>
        <circle cx="36" cy="52" r="9" fill="#1E293B" stroke="#FFD93D" stroke-width="2"/>
        <circle cx="74" cy="52" r="9" fill="#1E293B" stroke="#FFD93D" stroke-width="2"/>
        <circle cx="112" cy="52" r="9" fill="#1E293B" stroke="#FFD93D" stroke-width="2"/>`;
      break;

    default:
      art = `<rect x="34" y="20" width="80" height="36" rx="8" fill="#FFD93D" stroke="#3A2E2B" stroke-width="1.8"/>`;
      break;
  }

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 148 74" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto block select-none">
      <rect x="2" y="2" width="144" height="70" rx="14" fill="${stageBg}" stroke="#EBCFB2" stroke-width="1.8"/>
      <path d="M3 50H145V58C145 65.2 139.2 71 132 71H16C8.8 71 3 65.2 3 58V50Z" fill="${stageFloor}" opacity="0.65"/>
      ${art}
    </svg>`;
}

// 기존 단일 정사각 썸네일 호출부 호환 래퍼
function createFurnitureArtworkSVG(itemId, size = 56) {
  return createCatalogThumbnailSVG(itemId, Math.round(size * 1.9), size);
}

// =========================================================
// 3. 수첩 스탬프 · 바인더 링 · 입주민/매장직원 캐릭터 초상화 SVG 생성기
// =========================================================
function createNotebookArtworkSVG(kind, size = 48) {
  const uid = `nb_${kind}_${++svgUidSeq}`;

  if (kind === 'stamp_well_done' || kind === 'stamp_complete') {
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg" class="inline-block shrink-0 select-none">
        <g transform="rotate(-8 34 34)">
          <circle cx="34" cy="34" r="29" fill="#FFF0F3" stroke="#D6384C" stroke-width="3"/>
          <circle cx="34" cy="34" r="24" fill="none" stroke="#FF6B6B" stroke-width="1.6" stroke-dasharray="4 3"/>
          <polygon points="34,14 36.8,20.2 43.5,21 38.5,25.6 39.8,32.2 34,28.8 28.2,32.2 29.5,25.6 24.5,21 31.2,20.2" fill="#FFD93D" stroke="#3A2E2B" stroke-width="1.3"/>
          <text x="34" y="49" text-anchor="middle" fill="#D6384C" font-size="14" font-weight="800">달성완료</text>
        </g>
      </svg>`;
  }

  if (kind === 'binder_ring') {
    return `
      <svg width="28" height="22" viewBox="0 0 28 22" fill="none" xmlns="http://www.w3.org/2000/svg" class="shrink-0 select-none">
        <circle cx="5" cy="12" r="3.6" fill="#E6CCB2" stroke="#3A2E2B" stroke-width="1.4"/>
        <circle cx="23" cy="12" r="3.6" fill="#E6CCB2" stroke="#3A2E2B" stroke-width="1.4"/>
        <path d="M5 10C9.5 4.8 18.5 4.8 23 10" stroke="#3A2E2B" stroke-width="4" stroke-linecap="round"/>
        <path d="M5 10C9.5 4.8 18.5 4.8 23 10" stroke="#FFD93D" stroke-width="2" stroke-linecap="round"/>
      </svg>`;
  }

  if (kind.startsWith('avatar_')) {
    const role = kind.replace('avatar_', '');
    const bgPalette = {
      student: ['#E0F4FF', '#B8E4FF'],
      newlywed: ['#FFE8EE', '#FFC8D6'],
      family4: ['#E3FBE8', '#B3F2C0'],
      elderly: ['#FFF6D6', '#FFE599'],
      hikikomori: ['#EFE9FF', '#D8C7FF'],
      streamer: ['#FFEAF6', '#E4CCFF'],
      manager: ['#E0ECFF', '#BDD6FF'],
      baker: ['#FFF4EB', '#FFE0C8'],
      barista: ['#EFE6DD', '#DFCBB8'],
      florist: ['#FFF0F6', '#FFD6E7'],
      rival_kang: ['#F3E8FF', '#D8B4FE'],
      mansour: ['#FEF3C7', '#FDE68A']
    };
    const [bg1, bg2] = bgPalette[role] || bgPalette.student;
    let portrait = '';

    if (role === 'student') {
      portrait = `
        <path d="M14 58C15 45 22 41 32 41C42 41 49 45 50 58Z" fill="#4CC2FF" stroke="#3A2E2B" stroke-width="2"/>
        <circle cx="32" cy="33" r="12" fill="#FFE5D6" stroke="#3A2E2B" stroke-width="2"/>
        <path d="M19.8 30C21 19 43 19 44.2 30C38 25 26 25 19.8 30Z" fill="#4A3728" stroke="#3A2E2B" stroke-width="1.6"/>
        <circle cx="27.2" cy="33.5" r="3.5" fill="#FFFDF7" stroke="#3A2E2B" stroke-width="1.6"/>
        <circle cx="36.8" cy="33.5" r="3.5" fill="#FFFDF7" stroke="#3A2E2B" stroke-width="1.6"/>
        <circle cx="27.2" cy="33.5" r="1.5" fill="#3A2E2B"/><circle cx="36.8" cy="33.5" r="1.5" fill="#3A2E2B"/>`;
    } else if (role === 'newlywed') {
      portrait = `
        <circle cx="23" cy="35" r="10" fill="#FFE5D6" stroke="#3A2E2B" stroke-width="1.9"/>
        <path d="M13 33C13.5 22 32.5 22 33 33C28 28 18 28 13 33Z" fill="#4A3728" stroke="#3A2E2B" stroke-width="1.6"/>
        <circle cx="41" cy="36" r="9.5" fill="#FFE5D6" stroke="#3A2E2B" stroke-width="1.9"/>
        <path d="M31.5 34C32 24 50 24 50.5 34C46 29 36 29 31.5 34Z" fill="#8B481F" stroke="#3A2E2B" stroke-width="1.6"/>
        <circle cx="20" cy="35.5" r="1.5" fill="#3A2E2B"/><circle cx="26" cy="35.5" r="1.5" fill="#3A2E2B"/>
        <circle cx="38" cy="36.5" r="1.5" fill="#3A2E2B"/><circle cx="44" cy="36.5" r="1.5" fill="#3A2E2B"/>
        <path d="M28.5 16C28.5 13.5 32 13.5 32 16C32 13.5 35.5 13.5 35.5 16C35.5 19 32 21.5 32 21.5C32 21.5 28.5 19 28.5 16Z" fill="#FF6B6B" stroke="#3A2E2B" stroke-width="1.4"/>`;
    } else if (role === 'family4') {
      portrait = `
        <circle cx="22" cy="26" r="8.8" fill="#FFE5D6" stroke="#3A2E2B" stroke-width="1.8"/>
        <path d="M13.2 24C14 16 30 16 30.8 24Z" fill="#4A3728" stroke="#3A2E2B" stroke-width="1.5"/>
        <circle cx="42" cy="26" r="8.8" fill="#FFE5D6" stroke="#3A2E2B" stroke-width="1.8"/>
        <path d="M33.2 24C34 16 50 16 50.8 24Z" fill="#8B481F" stroke="#3A2E2B" stroke-width="1.5"/>
        <circle cx="32" cy="42" r="9.6" fill="#FFE5D6" stroke="#3A2E2B" stroke-width="1.9"/>
        <path d="M23 39C24 32 40 32 41 39Z" fill="#38E54D" stroke="#3A2E2B" stroke-width="1.6"/>
        <circle cx="29" cy="42" r="1.5" fill="#3A2E2B"/><circle cx="35" cy="42" r="1.5" fill="#3A2E2B"/>`;
    } else if (role === 'elderly') {
      portrait = `
        <circle cx="23" cy="36" r="9.8" fill="#FFE5D6" stroke="#3A2E2B" stroke-width="1.8"/>
        <ellipse cx="23" cy="26.5" rx="12.5" ry="3.2" fill="#FFD93D" stroke="#3A2E2B" stroke-width="1.5"/>
        <circle cx="41.5" cy="36" r="9.5" fill="#FFE5D6" stroke="#3A2E2B" stroke-width="1.8"/>
        <path d="M32 34C32.5 25 50.5 25 51 34Z" fill="#F1F5F9" stroke="#3A2E2B" stroke-width="1.5"/>`;
    } else if (role === 'hikikomori') {
      portrait = `
        <path d="M13 58C14 42 21 36 32 36C43 36 50 42 51 58Z" fill="#581C87" stroke="#3A2E2B" stroke-width="2"/>
        <circle cx="32" cy="33" r="15" fill="#7E22CE" stroke="#3A2E2B" stroke-width="2"/>
        <ellipse cx="32" cy="36" rx="11" ry="9.5" fill="#F5F3FF" stroke="#3A2E2B" stroke-width="1.6"/>
        <circle cx="27.5" cy="35" r="1.9" fill="#3A2E2B"/><circle cx="36.5" cy="35" r="1.9" fill="#3A2E2B"/>`;
    } else if (role === 'streamer') {
      portrait = `
        <path d="M14 58C15 44 22 40 32 40C42 40 49 44 50 58Z" fill="#FF6B6B" stroke="#3A2E2B" stroke-width="2"/>
        <polygon points="21,23 25,13 29,22" fill="#FF6B6B" stroke="#3A2E2B" stroke-width="1.6"/>
        <polygon points="43,23 39,13 35,22" fill="#4CC2FF" stroke="#3A2E2B" stroke-width="1.6"/>
        <circle cx="32" cy="33" r="12" fill="#FFE5D6" stroke="#3A2E2B" stroke-width="2"/>
        <path d="M20 30C21 19 43 19 44 30C38 25 26 25 20 30Z" fill="#9333EA" stroke="#3A2E2B" stroke-width="1.6"/>
        <circle cx="27.2" cy="34" r="1.8" fill="#3A2E2B"/><circle cx="36.8" cy="34" r="1.8" fill="#3A2E2B"/>`;
    } else if (role === 'baker') {
      portrait = `
        <path d="M15 58C16 45 23 41 32 41C41 41 48 45 49 58Z" fill="#FFFDF7" stroke="#3A2E2B" stroke-width="2"/>
        <circle cx="32" cy="35" r="11" fill="#FFE5D6" stroke="#3A2E2B" stroke-width="2"/>
        <path d="M21 25C18 15 26 11 32 13C38 11 46 15 43 25Z" fill="#FFFDF7" stroke="#3A2E2B" stroke-width="1.8"/>
        <circle cx="28" cy="35" r="1.7" fill="#3A2E2B"/><circle cx="36" cy="35" r="1.7" fill="#3A2E2B"/>`;
    } else if (role === 'barista') {
      portrait = `
        <path d="M15 58C16 45 23 41 32 41C41 41 48 45 49 58Z" fill="#179E29" stroke="#3A2E2B" stroke-width="2"/>
        <circle cx="32" cy="34" r="11.2" fill="#FFE5D6" stroke="#3A2E2B" stroke-width="2"/>
        <ellipse cx="33" cy="22" rx="12" ry="5" fill="#6F4528" stroke="#3A2E2B" stroke-width="1.7"/>
        <circle cx="28" cy="34" r="1.7" fill="#3A2E2B"/><circle cx="36" cy="34" r="1.7" fill="#3A2E2B"/>`;
    } else if (role === 'florist') {
      portrait = `
        <path d="M15 58C16 45 23 41 32 41C41 41 48 45 49 58Z" fill="#FF6B6B" stroke="#3A2E2B" stroke-width="2"/>
        <circle cx="32" cy="35" r="11" fill="#FFE5D6" stroke="#3A2E2B" stroke-width="2"/>
        <ellipse cx="32" cy="23" rx="16" ry="4" fill="#FFD93D" stroke="#3A2E2B" stroke-width="1.7"/>
        <circle cx="28" cy="35" r="1.7" fill="#3A2E2B"/><circle cx="36" cy="35" r="1.7" fill="#3A2E2B"/>`;
    } else if (role === 'rival_kang') {
      portrait = `
        <path d="M13 58C14 44 21 40 32 40C43 40 50 44 51 58Z" fill="#6B21A8" stroke="#3A2E2B" stroke-width="2"/>
        <path d="M23 43Q32 52 41 43" fill="none" stroke="#FFD93D" stroke-width="3.2" stroke-linecap="round"/>
        <circle cx="32" cy="50" r="3" fill="#FFD93D" stroke="#3A2E2B" stroke-width="1.3"/>
        <circle cx="32" cy="34" r="11.5" fill="#FFE5D6" stroke="#3A2E2B" stroke-width="2"/>
        <rect x="21.5" y="30" width="9" height="5.5" rx="1.8" fill="#1E293B" stroke="#FFD93D" stroke-width="1.4"/>
        <rect x="33.5" y="30" width="9" height="5.5" rx="1.8" fill="#1E293B" stroke="#FFD93D" stroke-width="1.4"/>
        <line x1="30.5" y1="32" x2="33.5" y2="32" stroke="#FFD93D" stroke-width="1.6"/>
        <ellipse cx="32" cy="23" rx="16.5" ry="3.8" fill="#1E1B4B" stroke="#3A2E2B" stroke-width="1.8"/>
        <path d="M21 23L23.5 13.5H40.5L43 23Z" fill="#312E81" stroke="#3A2E2B" stroke-width="1.8"/>
        <rect x="22" y="20" width="20" height="3" rx="1" fill="#FFD93D"/>`;
    } else if (role === 'mansour') {
      portrait = `
        <path d="M13 58C14 44 21 40 32 40C43 40 50 44 51 58Z" fill="#FFFDF7" stroke="#D97706" stroke-width="2"/>
        <circle cx="32" cy="34" r="11.5" fill="#FDE2C8" stroke="#3A2E2B" stroke-width="2"/>
        <path d="M18 28C18 16 46 16 46 28L49 46H44L42 29H22L20 46H15Z" fill="#FFFDF7" stroke="#3A2E2B" stroke-width="1.7"/>
        <rect x="20" y="19" width="24" height="4.2" rx="2" fill="#1E293B" stroke="#FFD93D" stroke-width="1.5"/>
        <rect x="22.5" y="31" width="8" height="4.8" rx="1.8" fill="#FFD93D" stroke="#3A2E2B" stroke-width="1.4"/>
        <rect x="33.5" y="31" width="8" height="4.8" rx="1.8" fill="#FFD93D" stroke="#3A2E2B" stroke-width="1.4"/>`;
    } else {
      portrait = `
        <path d="M15 58C16 45 23 41 32 41C41 41 48 45 49 58Z" fill="#1E3A8A" stroke="#3A2E2B" stroke-width="2"/>
        <circle cx="32" cy="33" r="11.5" fill="#FFE5D6" stroke="#3A2E2B" stroke-width="2"/>
        <path d="M19 26C19.5 17 44.5 17 45 26L42.5 29H21.5L19 26Z" fill="#2563EB" stroke="#3A2E2B" stroke-width="1.8"/>
        <circle cx="27.5" cy="34" r="1.8" fill="#3A2E2B"/><circle cx="36.5" cy="34" r="1.8" fill="#3A2E2B"/>`;
    }

    return `
      <svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="shrink-0 select-none">
        <defs>
          <linearGradient id="${uid}_abg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${bg1}"/>
            <stop offset="100%" stop-color="${bg2}"/>
          </linearGradient>
          <clipPath id="${uid}_aclip"><rect x="6" y="6" width="52" height="52" rx="15"/></clipPath>
        </defs>
        <rect x="3" y="3" width="58" height="58" rx="18" fill="#FFFDF7" stroke="#E2BFA2" stroke-width="2.2"/>
        <rect x="6" y="6" width="52" height="52" rx="15" fill="url(#${uid}_abg)" stroke="#3A2E2B" stroke-width="1.9"/>
        <g clip-path="url(#${uid}_aclip)">${portrait}</g>
      </svg>`;
  }

  let miniArt = '';
  switch (kind) {
    case 'infra_elevator':
      miniArt = `<rect x="9" y="6" width="26" height="32" rx="6" fill="#4CC2FF" stroke="#3A2E2B" stroke-width="2"/><rect x="13" y="12" width="18" height="22" rx="3" fill="#FFFDF7" stroke="#3A2E2B" stroke-width="1.6"/><line x1="22" y1="12" x2="22" y2="34" stroke="#3A2E2B" stroke-width="1.6"/>`;
      break;
    case 'infra_recycling':
      miniArt = `<rect x="7" y="15" width="9" height="19" rx="3" fill="#4CC2FF" stroke="#3A2E2B" stroke-width="1.8"/><rect x="17.5" y="15" width="9" height="19" rx="3" fill="#38E54D" stroke="#3A2E2B" stroke-width="1.8"/><rect x="28" y="15" width="9" height="19" rx="3" fill="#FFD93D" stroke="#3A2E2B" stroke-width="1.8"/>`;
      break;
    case 'infra_parcel':
      miniArt = `<rect x="9" y="7" width="26" height="30" rx="5" fill="#FF6B6B" stroke="#3A2E2B" stroke-width="2"/><rect x="13" y="21" width="18" height="11" rx="2" fill="#FFD93D" stroke="#3A2E2B" stroke-width="1.5"/>`;
      break;
    case 'infra_rooftop':
      miniArt = `<rect x="7" y="25" width="30" height="10" rx="4" fill="#D98A4E" stroke="#3A2E2B" stroke-width="1.9"/><circle cx="16" cy="18" r="7" fill="#38E54D" stroke="#3A2E2B" stroke-width="1.8"/><circle cx="28" cy="17" r="7.5" fill="#FF9EBB" stroke="#3A2E2B" stroke-width="1.8"/>`;
      break;
    case 'dev_solar':
      miniArt = `<circle cx="31" cy="11" r="4.8" fill="#FFD93D" stroke="#3A2E2B" stroke-width="1.5"/><polygon points="8,18 27,15 33,30 6,33" fill="#4CC2FF" stroke="#3A2E2B" stroke-width="1.8"/>`;
      break;
    case 'dev_farm':
      miniArt = `<rect x="7" y="26" width="30" height="10" rx="3" fill="#B86B35" stroke="#3A2E2B" stroke-width="1.8"/><circle cx="22" cy="18" r="8" fill="#FF6B6B" stroke="#3A2E2B" stroke-width="1.8"/>`;
      break;
    case 'dev_park':
      miniArt = `<rect x="19" y="24" width="6" height="12" rx="2" fill="#8B481F" stroke="#3A2E2B" stroke-width="1.6"/><circle cx="22" cy="16" r="10" fill="#FF9EBB" stroke="#3A2E2B" stroke-width="1.8"/>`;
      break;
    default:
      miniArt = `<rect x="8" y="14" width="28" height="21" rx="5" fill="#FFFDF7" stroke="#3A2E2B" stroke-width="2"/><path d="M5 16L10 8H34L39 16Z" fill="#FF6B6B" stroke="#3A2E2B" stroke-width="1.9"/>`;
      break;
  }

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" class="shrink-0 select-none">
      <rect x="2" y="2" width="40" height="40" rx="14" fill="#FFFDF7" stroke="#E5C5A6" stroke-width="2"/>
      ${miniArt}
    </svg>`;
}

function createHouseholdAvatarSVG(type, size = 48) {
  return createNotebookArtworkSVG(`avatar_${type}`, size);
}

// =========================================================
// 4. 핵심 게임 밸런스 · 부지 · 단독 상가 · 슈퍼카 · 가구 데이터 (이모지 0%)
// =========================================================
const GAME_BALANCE = {
  buildingWidth: 24.4,
  buildingDepth: 8.2,
  roomWidth: 9.0,
  roomDepth: 7.5,
  wallHeight: 4.25,
  evictionGraceSec: 32,
  managerHireFee: 50,
  managerSalaryPerCycle: 95,
  managerCycleSec: 14,
  specialCleanCost: 45,
  soundproofCost: 75,
  mediationGiftCost: 28,
  relocateCost: 20
};

const BUILDING_NAME_PRESETS = [
  '해피 미니미 타운 1차',
  '럭키 팰리스',
  '드림 로프트 타워',
  '골든 펜트하우스',
  '스타 부티크 하우스',
  '햇살 캐슬'
];

const INITIAL_ISLAND_LOTS = [
  { lotId: 'lot_main', name: '수변 1번지', x: -4.2, z: -6.4, landPrice: 0, owned: true, devType: 'mixed_1', title: '해피 미니미 타운 1차' },
  { lotId: 'lot_solar', name: '햇살언덕 2번지', x: -43.5, z: 4.5, landPrice: 320, owned: false, devType: null, title: null },
  { lotId: 'lot_farm', name: '시냇가 3번지', x: -42.5, z: 21.5, landPrice: 420, owned: false, devType: null, title: null },
  { lotId: 'lot_east', name: '아치교 4번지', x: 45.0, z: 5.5, landPrice: 680, owned: false, devType: null, title: null },
  { lotId: 'lot_south_e', name: '벚꽃변 5번지', x: 44.0, z: 22.8, landPrice: 1200, owned: false, devType: null, title: null },
  { lotId: 'lot_north', name: '전망대 6번지', x: -4.0, z: -24.5, landPrice: 2400, owned: false, devType: null, title: null }
];

const STANDALONE_SHOPS_TEMPLATE = [
  {
    shopId: 'shop_bakery',
    kind: 'bakery',
    name: '바게트 하우스',
    engTitle: 'PATISSERIE',
    subCopy: '수제 케이크 & 프랑스 바게트',
    svgIcon: 'bakery_ico',
    x: -16.2,
    z: 15.2,
    w: 9.2,
    d: 5.8,
    h: 5.0,
    buyCost: 360,
    baseVisitRevenue: 18,
    passiveCycleProfit: 34,
    staffRole: 'baker',
    staffName: '파티시에 피에르',
    awningStyle: 'coral',
    roofColor: 0xE05A47
  },
  {
    shopId: 'shop_roastery',
    kind: 'roastery',
    name: '미니미 로스터스',
    engTitle: 'OAK & BARREL',
    subCopy: '유기농 그로서리 & 스페셜티 로스터리',
    svgIcon: 'roastery_ico',
    x: 16.2,
    z: 15.2,
    w: 9.2,
    d: 5.8,
    h: 5.0,
    buyCost: 420,
    baseVisitRevenue: 20,
    passiveCycleProfit: 38,
    staffRole: 'barista',
    staffName: '바리스타 루카스',
    awningStyle: 'mint',
    roofColor: 0x2D6A4F
  },
  {
    shopId: 'shop_flower',
    kind: 'flower',
    name: '플로레스 앤 코',
    engTitle: 'FLORES & CO.',
    subCopy: '유럽풍 생화 & 빈티지 부티크',
    svgIcon: 'flower_ico',
    x: 23.0,
    z: -3.6,
    w: 8.2,
    d: 5.6,
    h: 4.8,
    buyCost: 320,
    baseVisitRevenue: 18,
    passiveCycleProfit: 30,
    staffRole: 'florist',
    staffName: '플로리스트 클레어',
    awningStyle: 'lavender',
    roofColor: 0x6D597A
  }
];

const SHOP_UPGRADE_CATALOG = [
  {
    id: 'upg_oven',
    name: '프리미엄 화덕·에스프레소 머신',
    cost: 120,
    visitBonus: 6,
    cycleBonus: 18,
    chip: '방문 +6만 · 주기 +18만',
    tone: 'coral',
    reaction: '프리미엄 머신 덕분에 빵과 커피 풍미가 두 배 깊어졌어요!'
  },
  {
    id: 'upg_terrace',
    name: '초록 파라솔 야외 테라스 확장',
    cost: 140,
    visitBonus: 5,
    cycleBonus: 22,
    chip: '야외석 확장 · 주기 +22만',
    tone: 'mint',
    reaction: '초록 파라솔 야외 테라스 자리가 늘어나 손님들이 줄을 서요!'
  },
  {
    id: 'upg_crate',
    name: '유기농 사과·오렌지 원목 매대',
    cost: 95,
    visitBonus: 4,
    cycleBonus: 15,
    chip: '과일 매대 · 주기 +15만',
    tone: 'gold',
    reaction: '싱싱한 사과와 오렌지 나무 상자 진열대가 거리를 화사하게 만들어요!'
  }
];

const CAR_CATALOG = [
  {
    id: 'car_scooter',
    name: '민트 베스파 스쿠터',
    svgIcon: 'supercar_ico',
    cost: 0,
    maxSpeed: 14.5,
    rentBonusPct: 0,
    happyBonus: 0,
    driveTipPct: 20,
    chip: '기본 보유 · 경쾌한 기동성',
    tone: 'mint',
    cheerQuotes: [
      '우와~ 건물주님 민트 베스파 스쿠터 너무 산뜻해요!',
      '부릉부릉~ 상큼한 민트 스쿠터 지나간다!'
    ]
  },
  {
    id: 'car_sedan',
    name: '클래식 브라운 빈티지 세단',
    svgIcon: 'supercar_ico',
    cost: 240,
    maxSpeed: 17.5,
    rentBonusPct: 10,
    happyBonus: 5,
    driveTipPct: 25,
    chip: '월세 +10% · 레트로 품격',
    tone: 'gold',
    cheerQuotes: [
      '클래식 빈티지 세단 품격이 장난 아니네요!',
      '유럽 영화 속 주인공 차 같아요~ 멋지다!'
    ]
  },
  {
    id: 'car_supercar',
    name: '페라리 레드 오픈 슈퍼카',
    svgIcon: 'supercar_ico',
    cost: 520,
    maxSpeed: 24.0,
    rentBonusPct: 25,
    happyBonus: 12,
    driveTipPct: 30,
    chip: '행복·월세 +25% · 오픈카',
    tone: 'coral',
    cheerQuotes: [
      '우와! 우리 건물주님 레드 슈퍼카 뽑으셨네!! 멋지다~!',
      '부아앙~ 오픈 스포츠카 배기음 소리 대박!! 갓물주님 최고!',
      '빨간 컨버터블 슈퍼카 포스 최고예요!'
    ]
  },
  {
    id: 'car_limo',
    name: '골드 크라운 롱바디 리무진',
    svgIcon: 'crown_badge',
    cost: 950,
    maxSpeed: 20.5,
    rentBonusPct: 50,
    happyBonus: 20,
    driveTipPct: 50,
    chip: '월세·수금 +50% · 궁극의 상징',
    tone: 'gold',
    cheerQuotes: [
      '골드 크라운 롱바디 리무진이라니 진정한 갓물주님!!',
      '리무진 길이 실화야?! 우리 동네 랜드마크 등극!!',
      '황금 크라운 리무진 아우라에 눈이 부셔요~!'
    ]
  }
];

const ROOM_TYPE_META = {
  studio: {
    key: 'studio',
    badge: '원룸 스튜디오',
    shortBadge: '원룸',
    svgIcon: 'studio_unit',
    tone: 'sky',
    specialty: '대학생 · 히키코모리 특화',
    preferredBy: ['student', 'hikikomori']
  },
  tworoom: {
    key: 'tworoom',
    badge: '투룸 스위트',
    shortBadge: '투룸',
    svgIcon: 'tworoom_arch',
    tone: 'coral',
    specialty: '아치 가벽 분리 · 신혼/노부부 특화',
    preferredBy: ['newlywed', 'elderly']
  },
  threeroom: {
    key: 'threeroom',
    badge: '쓰리룸 펜트하우스',
    shortBadge: '쓰리룸',
    svgIcon: 'threeroom_crown',
    tone: 'mint',
    specialty: '안방+메인거실+아이방 · 4인가족 특화',
    preferredBy: ['family4', 'streamer']
  },
  loft: {
    key: 'loft',
    badge: '복층 로프트 하우스',
    shortBadge: '복층',
    svgIcon: 'loft_stairs',
    tone: 'gold',
    specialty: '원목 실내계단+2층 다락 · VIP 특화',
    preferredBy: ['streamer', 'newlywed', 'student']
  }
};

const ROOM_SLOTS_TEMPLATE = [
  {
    subId: '101',
    name: '101',
    layoutType: 'studio',
    floor: 1,
    col: 0,
    colSpan: 1,
    lx: -7.35,
    ly: 4.82,
    lz: 0.15,
    rw: 8.9,
    rd: 7.5,
    rh: 4.25,
    rentBonus: 0,
    cycleSec: 9.5,
    unlockCost: 0,
    defaultUnlocked: true,
    defaultDecor: 'dec_peach'
  },
  {
    subId: '102',
    name: '102',
    layoutType: 'tworoom',
    floor: 1,
    col: 1,
    colSpan: 2,
    lx: 4.55,
    ly: 4.82,
    lz: 0.15,
    rw: 14.5,
    rd: 7.5,
    rh: 4.25,
    rentBonus: 36,
    cycleSec: 10.4,
    unlockCost: 0,
    defaultUnlocked: true,
    defaultDecor: 'dec_sage'
  },
  {
    subId: '201',
    name: '201',
    layoutType: 'threeroom',
    floor: 2,
    col: 0,
    colSpan: 3,
    lx: 0.0,
    ly: 9.45,
    lz: 0.15,
    rw: 23.6,
    rd: 7.5,
    rh: 4.45,
    rentBonus: 95,
    cycleSec: 11.2,
    unlockCost: 190,
    defaultUnlocked: false,
    defaultDecor: 'dec_butter'
  },
  {
    subId: '301',
    name: '301',
    layoutType: 'studio',
    floor: 3,
    col: 0,
    colSpan: 1,
    lx: -6.7,
    ly: 14.28,
    lz: 0.15,
    rw: 10.2,
    rd: 7.5,
    rh: 4.3,
    rentBonus: 24,
    cycleSec: 10.2,
    unlockCost: 160,
    defaultUnlocked: false,
    defaultDecor: 'dec_lavender'
  },
  {
    subId: '302',
    name: '302',
    layoutType: 'loft',
    floor: 3,
    col: 1,
    colSpan: 2,
    lx: 5.2,
    ly: 14.28,
    lz: 0.15,
    rw: 13.2,
    rd: 7.5,
    rh: 7.65,
    rentBonus: 78,
    cycleSec: 10.8,
    unlockCost: 230,
    defaultUnlocked: false,
    defaultDecor: 'dec_butter'
  }
];

const FURNITURE_CATEGORIES = [
  { key: 'bed', label: '침실/침대', svgIcon: 'bed_ico' },
  { key: 'sofa', label: '거실/소파', svgIcon: 'sofa_ico' },
  { key: 'appliance', label: '주방/가전', svgIcon: 'tv_ico' },
  { key: 'decor', label: '벽지/마루/계단', svgIcon: 'palette_ico' }
];

const FURNITURE_CATALOG = {
  bed: [
    { id: 'bed_iron', category: 'bed', name: '심플 스카이 침대', cost: 0, rentAdd: 0, happyAdd: 0, chip: '기본 제공', tone: 'sky', reaction: '깔끔한 스카이블루 철제 침대가 실용적이에요!' },
    { id: 'bed_queen', category: 'bed', name: '코지 원목 퀸침대', cost: 75, rentAdd: 26, happyAdd: 12, chip: '월세 +26만', tone: 'mint', reaction: '따뜻한 원목 퀸침대라 꿀잠 예약이에요!' },
    { id: 'bed_canopy', category: 'bed', name: '프린세스 캐노피 침대', cost: 145, rentAdd: 52, happyAdd: 20, chip: '월세 +52만', tone: 'coral', reaction: '와아! 핑크 캐노피 침대라니 동화 속 방 같아요!' },
    { id: 'bed_bunk', category: 'bed', name: '패밀리 원목 2층침대', cost: 165, rentAdd: 58, happyAdd: 22, chip: '월세 +58만', tone: 'gold', reaction: '튼튼한 원목 2층 침대 사다리 타기가 신나요!' }
  ],
  sofa: [
    { id: 'sofa_beanbag', category: 'sofa', name: '버터 옐로우 빈백', cost: 0, rentAdd: 0, happyAdd: 0, chip: '기본 제공', tone: 'gold', reaction: '말랑말랑 노란 빈백에 파묻히면 피로가 싹 풀려요!' },
    { id: 'sofa_mint2', category: 'sofa', name: '애플민트 2인 소파', cost: 70, rentAdd: 24, happyAdd: 12, chip: '월세 +24만', tone: 'mint', reaction: '상큼한 애플민트 패브릭 소파로 거실이 화사해졌어요!' },
    { id: 'sofa_rocker', category: 'sofa', name: '원목 흔들의자 다과셋', cost: 115, rentAdd: 40, happyAdd: 18, chip: '월세 +40만', tone: 'coral', reaction: '원목 흔들의자에 앉아 따뜻한 차 한 잔 마시니 천국이구려~' },
    { id: 'sofa_leather_l', category: 'sofa', name: '프리미엄 가죽 L소파', cost: 155, rentAdd: 56, happyAdd: 22, chip: '월세 +56만', tone: 'gold', reaction: '고급 가죽 L자형 소파가 펜트하우스 거실처럼 럭셔리해요!' }
  ],
  appliance: [
    { id: 'app_fan', category: 'appliance', name: '스탠드 서큘레이터', cost: 0, rentAdd: 0, happyAdd: 0, chip: '기본 제공', tone: 'sky', reaction: '솔솔 부는 서큘레이터 바람이 시원해요~' },
    { id: 'app_ac', category: 'appliance', name: '시네마 빔프로젝터', cost: 85, rentAdd: 30, happyAdd: 14, chip: '월세 +30만', tone: 'mint', reaction: '대형 시네마 빔프로젝터까지 풀옵션이라니 갓물주님 최고!' },
    { id: 'app_soundmat', category: 'appliance', name: 'LP 턴테이블 & 방음매트', cost: 95, rentAdd: 34, happyAdd: 18, grantsSoundproof: true, chip: '방음완벽 · +34만', tone: 'sky', reaction: '감성 LP 턴테이블과 도톰한 방음 매트로 층간소음 걱정 끝!' },
    { id: 'app_rgb_desk', category: 'appliance', name: 'RGB 트리플 데스크', cost: 160, rentAdd: 58, happyAdd: 24, chip: '월세 +58만', tone: 'coral', reaction: '영롱한 RGB 트리플 모니터 데스크라니 방송 효율 폭발!' }
  ],
  decor: [
    { id: 'dec_peach', category: 'decor', name: '피치 베이지 & 메이플', wallKey: 'wallPeach', floorKey: 'floor1', stairStyle: 'oak', cost: 0, rentAdd: 0, happyAdd: 0, chip: '피치 파스텔', tone: 'coral', reaction: '포근한 피치 오트밀 벽지 색감이 마음을 따뜻하게 해줘요!' },
    { id: 'dec_sage', category: 'decor', name: '세이지 민트 & 오크', wallKey: 'wallSage', floorKey: 'floor2', stairStyle: 'walnut', cost: 65, rentAdd: 22, happyAdd: 12, chip: '월세 +22만', tone: 'mint', reaction: '싱그러운 세이지 벽지와 헤링본 오크 마루 조합이 세련됐어요!' },
    { id: 'dec_butter', category: 'decor', name: '버터 크림 & 골드계단', wallKey: 'wallButter', floorKey: 'floor3', stairStyle: 'gold', cost: 120, rentAdd: 42, happyAdd: 16, chip: '월세 +42만', tone: 'gold', reaction: '햇살 같은 버터 크림 벽지 덕분에 집이 두 배 넓어 보여요!' },
    { id: 'dec_lavender', category: 'decor', name: '로얄 라벤더 & 부티크', wallKey: 'wallLavender', floorKey: 'floor3', stairStyle: 'coral', cost: 170, rentAdd: 62, happyAdd: 22, chip: '월세 +62만', tone: 'coral', reaction: '로얄 라벤더 벽지와 부티크 계단 마감이 예술 작품 같아요!' }
  ]
};

const DEVELOPMENT_CATALOG = {
  solar_plant: {
    type: 'solar_plant',
    name: '태양광 발전소',
    svgIcon: 'solar_panel',
    artKey: 'dev_solar',
    buildCost: 220,
    isResidential: false,
    cycleSec: 9,
    cycleProfit: 52,
    rentSynergyPct: 5
  },
  urban_farm: {
    type: 'urban_farm',
    name: '딸기 도시농장',
    svgIcon: 'berry_farm',
    artKey: 'dev_farm',
    buildCost: 280,
    isResidential: false,
    cycleSec: 11,
    cycleProfit: 74,
    rentSynergyPct: 8
  },
  sakura_park: {
    type: 'sakura_park',
    name: '벚꽃 힐링공원',
    svgIcon: 'flower_ico',
    artKey: 'dev_park',
    buildCost: 340,
    isResidential: false,
    cycleSec: 12,
    cycleProfit: 38,
    rentSynergyPct: 15
  },
  bakery_cafe: {
    type: 'bakery_cafe',
    name: '달콤 로스터리',
    svgIcon: 'roastery_ico',
    artKey: 'dev_bakery',
    buildCost: 460,
    isResidential: false,
    cycleSec: 10,
    cycleProfit: 92,
    rentSynergyPct: 12
  },
  mixed_2: {
    type: 'mixed_2',
    name: '럭키 팰리스',
    svgIcon: 'blueprint_hammer',
    artKey: 'shop_mart',
    buildCost: 780,
    isResidential: true,
    baseRoomRent: 56,
    rentSynergyPct: 10
  },
  mixed_1: {
    type: 'mixed_1',
    name: '해피 미니미 타운 1차',
    svgIcon: 'red_house',
    artKey: 'shop_mart',
    buildCost: 0,
    isResidential: true,
    baseRoomRent: 38,
    rentSynergyPct: 0
  }
};

const PUBLIC_INFRA_CATALOG = {
  elevator: {
    key: 'elevator',
    name: '파노라마 유리 승강기',
    svgIcon: 'elevator',
    artKey: 'infra_elevator',
    cost: 160,
    rentBonusPct: 10,
    desc: '고층 이동 편의 극대화'
  },
  recycling: {
    key: 'recycling',
    name: '클린 에코 분리수거장',
    svgIcon: 'recycle_bin',
    artKey: 'infra_recycling',
    cost: 110,
    rentBonusPct: 6,
    desc: '단지 청결도 상시 유지'
  },
  parcel_box: {
    key: 'parcel_box',
    name: '스마트 무인 택배함',
    svgIcon: 'contract_scroll',
    artKey: 'infra_parcel',
    cost: 95,
    rentBonusPct: 6,
    desc: '24시 안심 비대면 보관'
  },
  rooftop_garden: {
    key: 'rooftop_garden',
    name: '옥상 루프탑 힐링가든',
    svgIcon: 'berry_farm',
    artKey: 'infra_rooftop',
    cost: 210,
    rentBonusPct: 12,
    desc: '전 세대 행복도 및 프리미엄 상승'
  }
};

const ROOM_INTERIOR_TIERS = [
  { level: 0, name: '기본 인테리어', cost: 0, rentAdd: 0, chip: '기본 마감' },
  { level: 1, name: '파스텔 커스텀', cost: 65, rentAdd: 18, chip: '가구 1종+' },
  { level: 2, name: '코지 부티크', cost: 160, rentAdd: 36, chip: '가구 2종+' },
  { level: 3, name: '로얄 풀옵션', cost: 340, rentAdd: 65, chip: '풀세트 +20%' }
];

const HOUSEHOLD_TYPES = {
  student: {
    type: 'student',
    label: '대학생',
    accentHex: '#0B84D8',
    memberCount: 1,
    minRent: 68,
    maxRent: 135,
    noiseOutput: 48,
    noiseLv: 2,
    noiseSensitivity: 25,
    odorSensitivity: 45,
    needsElevator: false,
    needsRecycling: false,
    isHoarder: false,
    happyQuotes: [
      '방이 넓어져서 침대랑 책상이 정말 쾌적해요!',
      '앞마당 분수대 건너 바게트 하우스 빵이 꿀맛이에요!'
    ]
  },
  newlywed: {
    type: 'newlywed',
    label: '신혼부부',
    accentHex: '#E04666',
    memberCount: 2,
    minRent: 135,
    maxRent: 245,
    noiseOutput: 18,
    noiseLv: 1,
    noiseSensitivity: 58,
    odorSensitivity: 78,
    needsElevator: false,
    needsRecycling: true,
    isHoarder: false,
    happyQuotes: [
      '아치형 가벽으로 거실이랑 안방이 나뉜 투룸이 로망이었어요!',
      '초록 파라솔 카페 테라스에서 마시는 주말 커피 최고예요~'
    ]
  },
  family4: {
    type: 'family4',
    label: '4인 가족',
    accentHex: '#179E29',
    memberCount: 4,
    minRent: 210,
    maxRent: 380,
    noiseOutput: 88,
    noiseLv: 3,
    noiseSensitivity: 30,
    odorSensitivity: 75,
    needsElevator: true,
    needsRecycling: true,
    isHoarder: false,
    happyQuotes: [
      '부부 안방에 아이들 방까지 분리된 쓰리룸이라 너무 행복해요!',
      '아이들이 분수대 광장이랑 빵집 케이크를 정말 좋아해요!'
    ]
  },
  elderly: {
    type: 'elderly',
    label: '노부부',
    accentHex: '#C97A05',
    memberCount: 2,
    minRent: 125,
    maxRent: 220,
    noiseOutput: 8,
    noiseLv: 1,
    noiseSensitivity: 92,
    odorSensitivity: 90,
    needsElevator: true,
    needsRecycling: false,
    isHoarder: false,
    happyQuotes: [
      '분수대 벤치에 앉아 물소리를 들으니 참 평온하구려~',
      '그로서리 가게 앞 나무 상자 사과가 참 싱싱하구먼!'
    ]
  },
  streamer: {
    type: 'streamer',
    label: '스트리머 VIP',
    accentHex: '#8B3DFF',
    memberCount: 1,
    minRent: 220,
    maxRent: 390,
    noiseOutput: 55,
    noiseLv: 2,
    noiseSensitivity: 40,
    odorSensitivity: 65,
    needsElevator: true,
    needsRecycling: false,
    isHoarder: false,
    happyQuotes: [
      '원목 계단 올라가면 2층 다락 침실이라니 복층 로프트 감성 최고!',
      '건물주님 슈퍼카랑 우리 부티크 거리 브이로그 찍으면 조회수 폭발!'
    ]
  },
  hikikomori: {
    type: 'hikikomori',
    label: '프리랜서 은둔러',
    accentHex: '#6D28D9',
    memberCount: 1,
    minRent: 145,
    maxRent: 255,
    noiseOutput: 15,
    noiseLv: 1,
    noiseSensitivity: 20,
    odorSensitivity: 0,
    needsElevator: false,
    needsRecycling: false,
    isHoarder: true,
    happyQuotes: [
      '트리플 모니터가 내 세상이야... 이번 달 월세도 칼입금 완료!'
    ]
  }
};

const FAMILY_LAST_NAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '송'];
const GIVEN_NAMES = ['민준', '서연', '도윤', '지우', '하은', '지호', '수빈', '현우', '소율', '연우', '다은', '태오', '영숙', '철수'];

const QUEST_LIST = [
  {
    id: 'mq1',
    icon: 'bed_ico',
    title: '101호 인테리어 가구 시공 1회',
    desc: '가구 카탈로그에서 마음에 드는 가구를 배치해 호실 가치를 높이세요.',
    reward: 160,
    focusLot: 'lot_main',
    focusSubRoom: '101',
    progress: (st) => {
      const lv = st.buildings.lot_main?.rooms.find((x) => x.subId === '101')?.interiorLv || 0;
      return { cur: Math.min(1, lv), max: 1 };
    },
    check: (st) => (st.buildings.lot_main?.rooms.find((x) => x.subId === '101')?.interiorLv || 0) >= 1
  },
  {
    id: 'mq2',
    icon: 'contract_scroll',
    title: '101호 원룸 스튜디오 입주 계약',
    desc: '새로 단장한 101호에 첫 세입자를 맞이하세요.',
    reward: 180,
    focusLot: 'lot_main',
    focusSubRoom: '101',
    progress: (st) => ({ cur: st.buildings.lot_main?.rooms.find((x) => x.subId === '101')?.household ? 1 : 0, max: 1 }),
    check: (st) => !!st.buildings.lot_main?.rooms.find((x) => x.subId === '101')?.household
  },
  {
    id: 'mq3',
    icon: 'bakery_ico',
    title: '부티크 단독 상가 1곳 직영 인수',
    desc: '바게트 하우스, 미니미 로스터스, 플로레스 중 한 곳을 인수하세요.',
    reward: 280,
    focusShop: 'shop_bakery',
    progress: (st) => ({ cur: Math.min(1, Object.values(st.standaloneShops || {}).filter((s) => s.owned).length), max: 1 }),
    check: (st) => Object.values(st.standaloneShops || {}).some((s) => s.owned)
  },
  {
    id: 'mq4',
    icon: 'steering_supercar',
    title: 'VIP 차고 신규 차량 1대 출고',
    desc: '빈티지 세단, 레드 오픈 슈퍼카, 리무진 중 원하는 드림카를 출고하세요.',
    reward: 350,
    openGarage: true,
    progress: (st) => ({ cur: Math.min(1, Math.max(0, (st.garage?.ownedCars?.length || 1) - 1)), max: 1 }),
    check: (st) => (st.garage?.ownedCars?.length || 1) >= 2
  },
  {
    id: 'mq5',
    icon: 'blueprint_hammer',
    title: '201호 쓰리룸 개방 & 승강기 시공',
    desc: '패밀리 펜트하우스를 개방하고 파노라마 유리 승강기를 설치하세요.',
    reward: 380,
    focusLot: 'lot_main',
    focusSubRoom: '201',
    progress: (st) => {
      const b = st.buildings.lot_main;
      const p1 = b?.rooms.find((x) => x.subId === '201')?.unlocked ? 1 : 0;
      const p2 = b?.infra.elevator ? 1 : 0;
      return { cur: p1 + p2, max: 2 };
    },
    check: (st) => {
      const b = st.buildings.lot_main;
      return !!b?.rooms.find((x) => x.subId === '201')?.unlocked && !!b?.infra.elevator;
    }
  },
  {
    id: 'mq6',
    icon: 'loft_stairs',
    title: '302호 복층 로프트 하우스 개방',
    desc: '원목 실내 계단과 2층 다락방이 있는 복층 로프트를 오픈하세요.',
    reward: 450,
    focusLot: 'lot_main',
    focusSubRoom: '302',
    progress: (st) => ({ cur: st.buildings.lot_main?.rooms.find((x) => x.subId === '302')?.unlocked ? 1 : 0, max: 1 }),
    check: (st) => !!st.buildings.lot_main?.rooms.find((x) => x.subId === '302')?.unlocked
  },
  {
    id: 'mq7',
    icon: 'roastery_ico',
    title: '부티크 거리 단독 상가 3곳 석권',
    desc: '빵집·로스터리·플라워샵 3곳을 모두 직영으로 인수하세요.',
    reward: 550,
    focusShop: 'shop_roastery',
    progress: (st) => ({ cur: Math.min(3, Object.values(st.standaloneShops || {}).filter((s) => s.owned).length), max: 3 }),
    check: (st) => Object.values(st.standaloneShops || {}).filter((s) => s.owned).length >= 3
  },
  {
    id: 'mq8',
    icon: 'soundproof_hammer',
    title: '방음·청소·세대 케어 1회 달성',
    desc: '쾌적한 주거 환경을 위해 방음 시공 또는 청결 케어를 진행하세요.',
    reward: 480,
    openTab: 'tenants',
    progress: (st) => ({ cur: Math.min(1, (st.stats.crisisResolved || 0) + (st.stats.evictions || 0)), max: 1 }),
    check: (st) => st.stats.crisisResolved >= 1 || st.stats.evictions >= 1
  },
  {
    id: 'mq9',
    icon: 'manager_cap',
    title: '1층 총괄 지배인 정식 선임',
    desc: '수첩의 관리인 탭에서 자동 월세 수금을 전담할 지배인을 고용하세요.',
    reward: 600,
    openTab: 'manager',
    progress: (st) => ({ cur: Object.values(st.buildings).some((b) => b.manager.hired) ? 1 : 0, max: 1 }),
    check: (st) => Object.values(st.buildings).some((b) => b.manager.hired)
  },
  {
    id: 'mq10',
    icon: 'crown_badge',
    title: '레드 슈퍼카 또는 골드 리무진 오너 등극',
    desc: '건물주의 로망인 오픈 슈퍼카 또는 골드 크라운 리무진을 보유하세요.',
    reward: 1200,
    openGarage: true,
    progress: (st) => ({ cur: (st.garage?.ownedCars || []).some((c) => c === 'car_supercar' || c === 'car_limo') ? 1 : 0, max: 1 }),
    check: (st) => (st.garage?.ownedCars || []).some((c) => c === 'car_supercar' || c === 'car_limo')
  }
];

const FP_RADIO_CHANNELS = [
  { id: 'lofi', label: 'Lo-Fi 재즈', sub: 'FM 89.1 · Warm Jazz', moodHex: '#FFB703', glowRgba: 'rgba(255, 183, 3, 0.55)' },
  { id: 'citypop', label: '신나는 시티팝', sub: 'FM 95.7 · Sunset Pop', moodHex: '#FF6B9D', glowRgba: 'rgba(255, 107, 157, 0.58)' },
  { id: 'club', label: '클럽 비트', sub: 'FM 104.3 · Electro Club', moodHex: '#38E54D', glowRgba: 'rgba(56, 229, 77, 0.58)' },
  { id: 'off', label: '카오디오 OFF', sub: '배기음 집중 모드', moodHex: '#94A3B8', glowRgba: 'rgba(148, 163, 184, 0.25)' }
];

const FP_SHOP_DESTINATIONS = [
  {
    id: 'shop_bakery',
    name: '바게트 하우스',
    badge: '프랑스 제과점',
    icon: 'bakery_ico',
    tone: 'coral',
    roadX: -16.2,
    roadZ: 7.0,
    staffRole: 'baker',
    staffName: '파티시에 피에르',
    wallColor: 0xFFF3E6,
    accentColor: 0xFF6B6B,
    welcomeQuote: '헉! 우리 동네 갓물주님 행차하셨다!! 갓 구운 빵 대령할게요!!',
    customerQuotes: [
      '우와 실물 영접!! 건물주님 아우라 대박~!',
      '박수 짝짝짝!! 바게트 하우스 건물주님 최고예요!'
    ],
    driveThruItem: 'item_croissant',
    driveThruQuote: '건물주님! 차 안에서 바로 드실 모닝커피와 버터 크루아상 대령했습니다!'
  },
  {
    id: 'shop_roastery',
    name: '미니미 로스터스',
    badge: '스페셜티 카페',
    icon: 'roastery_ico',
    tone: 'mint',
    roadX: 16.2,
    roadZ: 7.0,
    staffRole: 'barista',
    staffName: '바리스타 루카스',
    wallColor: 0xF2FBF5,
    accentColor: 0x2D6A4F,
    welcomeQuote: '헉! 우리 동네 갓물주님 행차하셨다!! 최상급 스페셜티 원두 내릴게요!!',
    customerQuotes: [
      '세상에 갓물주님이다!! 포스 장난 아니네요!!',
      '우리 카페 오너님 오셨다~ 박수 짝짝짝!!'
    ],
    driveThruItem: 'item_coffee',
    driveThruQuote: '건물주님! 차 안에서 바로 드실 모닝커피 대령했습니다!'
  },
  {
    id: 'shop_flower',
    name: '플로레스 앤 코',
    badge: '유럽풍 플라워샵',
    icon: 'flower_ico',
    tone: 'sky',
    roadX: 23.0,
    roadZ: 5.5,
    staffRole: 'florist',
    staffName: '플로리스트 클레어',
    wallColor: 0xFDF2F8,
    accentColor: 0xBE185D,
    welcomeQuote: '헉! 우리 동네 갓물주님 행차하셨다!! 오늘 가장 예쁜 장미를 준비했어요!!',
    customerQuotes: [
      '와아~ 건물주님 센스 최고예요!!',
      '꽃집 향기보다 건물주님 후광이 더 눈부셔요!'
    ],
    driveThruItem: 'item_bouquet',
    driveThruQuote: '건물주님! 차 안에서 향기롭게 감상하실 생화 부케 대령했습니다!'
  },
  {
    id: 'shop_mart1f',
    name: '1층 해피마트 24',
    badge: '빌딩 1층 편의점',
    icon: 'mart_ico',
    tone: 'gold',
    roadX: -11.4,
    roadZ: 6.2,
    staffRole: 'student',
    staffName: '알바생 민수',
    wallColor: 0xF0FDF4,
    accentColor: 0x16A34A,
    welcomeQuote: '헉! 우리 빌딩 갓물주님 행차하셨다!! 충성충성 어서 오십시오!!',
    customerQuotes: [
      '우와 이 빌딩 주인님이시래!! 부럽다~!',
      '편의점 진열대 쓸어가시는 클라스 대박!!'
    ],
    driveThruItem: 'item_bento',
    driveThruQuote: '건물주님! 차 안에서 든든히 드실 프리미엄 도시락과 모닝커피 대령했습니다!'
  },
  {
    id: 'shop_wash1f',
    name: '1층 뽀송 워시 라운지',
    badge: '세탁 & 무인카페',
    icon: 'wash_ico',
    tone: 'sky',
    roadX: 3.0,
    roadZ: 6.2,
    staffRole: 'newlywed',
    staffName: '라운지 매니저 소망',
    wallColor: 0xF0F9FF,
    accentColor: 0x0284C7,
    welcomeQuote: '헉! 우리 빌딩 갓물주님 행차하셨다!! 뽀송 라운지 커피 바로 내릴게요!!',
    customerQuotes: [
      '빨래 기다리다 갓물주님 영접하네!! 대박~!',
      '건물 관리가 너무 깨끗해서 살기 최고예요!'
    ],
    driveThruItem: 'item_coffee',
    driveThruQuote: '건물주님! 차 안에서 바로 드실 라운지 모닝커피 대령했습니다!'
  }
];

const FP_GIFT_ITEMS = [
  {
    id: 'item_cake',
    name: '딸기 생크림 홀케이크',
    shortName: '딸기 홀케이크',
    cost: 18,
    icon: 'item_cake_ico',
    slot: 'right',
    tone: 'coral',
    buyMsg: '딸기 생크림 홀케이크 구매! 오른손에 핑크 리본 케이크 상자를 들었습니다!'
  },
  {
    id: 'item_croissant',
    name: '갓 구운 버터 크루아상',
    shortName: '버터 크루아상',
    cost: 9,
    icon: 'item_croissant_ico',
    slot: 'right',
    tone: 'gold',
    buyMsg: '갓 구운 버터 크루아상 세트 구매! 따뜻한 베이커리 봉투를 들었습니다!'
  },
  {
    id: 'item_coffee',
    name: '시그니처 아인슈페너',
    shortName: '아인슈페너',
    cost: 7,
    icon: 'item_coffee_ico',
    slot: 'left',
    tone: 'mint',
    buyMsg: '시그니처 아인슈페너 구매! 왼손에 달콤한 크림 커피잔을 들었습니다!'
  },
  {
    id: 'item_bouquet',
    name: '대형 장미 꽃다발',
    shortName: '장미 꽃다발',
    cost: 22,
    icon: 'item_bouquet_ico',
    slot: 'right',
    tone: 'coral',
    buyMsg: '대형 장미 꽃다발 구매! 화사한 리본 장미 부케를 품에 안았습니다!'
  },
  {
    id: 'item_bento',
    name: '편의점 프리미엄 도시락',
    shortName: '프리미엄 도시락',
    cost: 10,
    icon: 'item_bento_ico',
    slot: 'right',
    tone: 'sky',
    buyMsg: '편의점 프리미엄 도시락 구매! 정갈한 보자기 도시락을 들었습니다!'
  }
];

function createCockpitSteeringWheelSVG() {
  return `
    <svg viewBox="0 0 220 220" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg" class="select-none drop-shadow-xl">
      <defs>
        <linearGradient id="cw_leather" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4A3731"/>
          <stop offset="50%" stop-color="#2B1F1C"/>
          <stop offset="100%" stop-color="#1A1210"/>
        </linearGradient>
        <linearGradient id="cw_metal" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#F8FAFC"/>
          <stop offset="50%" stop-color="#94A3B8"/>
          <stop offset="100%" stop-color="#475569"/>
        </linearGradient>
        <linearGradient id="cw_gold" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#FFF5A8"/>
          <stop offset="55%" stop-color="#FFD93D"/>
          <stop offset="100%" stop-color="#C97A05"/>
        </linearGradient>
      </defs>
      <!-- 패들 시프터 (- / +) -->
      <rect x="44" y="72" width="22" height="38" rx="6" fill="url(#cw_metal)" stroke="#1E293B" stroke-width="2.5"/>
      <text x="55" y="96" text-anchor="middle" fill="#1E293B" font-family="Jua, sans-serif" font-size="16">-</text>
      <rect x="154" y="72" width="22" height="38" rx="6" fill="url(#cw_metal)" stroke="#1E293B" stroke-width="2.5"/>
      <text x="165" y="96" text-anchor="middle" fill="#1E293B" font-family="Jua, sans-serif" font-size="16">+</text>

      <!-- 3-스포크 메탈 프레임 -->
      <path d="M30 108H190V128L128 134V192H92V134L30 128V108Z" fill="url(#cw_metal)" stroke="#1E293B" stroke-width="3" stroke-linejoin="round"/>
      <rect x="103" y="144" width="14" height="38" rx="4" fill="#334155"/>

      <!-- 가죽 스티어링 림 외곽 & 스티치 -->
      <circle cx="110" cy="110" r="88" stroke="#140D0B" stroke-width="26"/>
      <circle cx="110" cy="110" r="88" stroke="url(#cw_leather)" stroke-width="21"/>
      <circle cx="110" cy="110" r="79" stroke="#D97706" stroke-width="1.6" stroke-dasharray="5 4" opacity="0.85"/>

      <!-- 12시 방향 레드 레이싱 센터 마커 -->
      <path d="M101 22.5H119L117 44H103L101 22.5Z" fill="#FF4757" stroke="#1E293B" stroke-width="2"/>

      <!-- 중앙 가죽 에어백 허브 & 갓물주 황금 크라운 엠블럼 -->
      <circle cx="110" cy="114" r="34" fill="url(#cw_leather)" stroke="#CBD5E1" stroke-width="3.5"/>
      <circle cx="110" cy="114" r="26" fill="#231815" stroke="url(#cw_gold)" stroke-width="2"/>
      <path d="M96 122L99.5 104L105.5 111L110 101L114.5 111L120.5 104L124 122Z" fill="url(#cw_gold)" stroke="#3A2E2B" stroke-width="1.6" stroke-linejoin="round"/>
    </svg>`;
}

function createCockpitRearviewSVG() {
  return `
    <svg viewBox="0 0 240 62" width="210" height="54" fill="none" xmlns="http://www.w3.org/2000/svg" class="select-none drop-shadow-lg">
      <rect x="112" y="0" width="16" height="16" rx="4" fill="#334155" stroke="#1E293B" stroke-width="2"/>
      <rect x="8" y="11" width="224" height="46" rx="22" fill="#1E293B" stroke="#FFFFFF" stroke-width="2.5"/>
      <rect x="15" y="16" width="210" height="36" rx="17" fill="#BAE6FD"/>
      <path d="M15 39Q75 31 130 38T225 36V52H15Z" fill="#86EFAC" opacity="0.85"/>
      <rect x="88" y="24" width="44" height="18" rx="4" fill="#FCA5A5" opacity="0.85"/>
      <path d="M28 19H84L68 49H18Z" fill="#FFFFFF" opacity="0.32"/>
    </svg>`;
}

const FIRST_FLOOR_SHOPS_TEMPLATE = [
  {
    shopId: 'shop_mart1f',
    floorShopKey: 'mart',
    kind: 'mart1f',
    name: '1층 미니미 마트 24',
    engTitle: 'MINIMI MART 24H',
    subCopy: '실사 과자·도시락·블루LED 음료 냉장고 & 컵라면 바',
    svgIcon: 'mart_ico',
    lotId: 'lot_main',
    localX: -7.1,
    localY: 2.25,
    localZ: 0.2,
    w: 9.8,
    d: 7.8,
    h: 4.3,
    owned: true,
    buyCost: 0,
    baseVisitRevenue: 16,
    passiveCycleProfit: 28,
    staffRole: 'mart_clerk',
    staffName: '알바생 민수',
    upgradesCatalog: [
      {
        id: 'upg_mart_gondola',
        name: '실사 스낵·라면 곤돌라 3열 풀진열',
        cost: 85,
        visitBonus: 6,
        cycleBonus: 16,
        chip: '실사 과자매대 · 주기 +16만',
        tone: 'gold',
        reaction: '곤돌라 3열에 허니버터칩·새우깡·컵라면·도시락이 꽉 찼어요!'
      },
      {
        id: 'upg_mart_fridge',
        name: '블루LED 투명 유리문 음료·맥주 쇼케이스',
        cost: 110,
        visitBonus: 7,
        cycleBonus: 20,
        chip: '블루LED 냉장고 · 주기 +20만',
        tone: 'sky',
        reaction: '파란 LED 냉장고에 시원한 콜라와 골든라거 맥주캔이 가득해요!'
      },
      {
        id: 'upg_mart_ramenbar',
        name: '창가 컵라면 취식 바 & 전자레인지 존',
        cost: 95,
        visitBonus: 5,
        cycleBonus: 18,
        chip: '취식 바테이블 · 주기 +18만',
        tone: 'mint',
        reaction: '창가 바 테이블에서 전자레인지 돌린 도시락과 라면을 먹는 손님이 북적여요!'
      }
    ]
  },
  {
    shopId: 'shop_wash1f',
    floorShopKey: 'wash',
    kind: 'wash1f',
    name: '1층 버블 코인세탁소',
    engTitle: 'BUBBLE LAUNDRY 24H',
    subCopy: '2단 대형 회전 드럼세탁기 6대 · 세제자판기 · 폴딩라운지',
    svgIcon: 'wash_ico',
    lotId: 'lot_main',
    localX: 7.1,
    localY: 2.25,
    localZ: 0.2,
    w: 9.8,
    d: 7.8,
    h: 4.3,
    owned: true,
    buyCost: 0,
    baseVisitRevenue: 15,
    passiveCycleProfit: 26,
    staffRole: 'wash_clerk',
    staffName: '라운지 매니저 소망',
    upgradesCatalog: [
      {
        id: 'upg_wash_drum6',
        name: '상하 2단 대형 회전 드럼세탁·건조기 증설',
        cost: 115,
        visitBonus: 7,
        cycleBonus: 22,
        chip: '2단 드럼 6대+ · 주기 +22만',
        tone: 'sky',
        reaction: '원형 유리창 안에서 빨랫감과 비눗방울이 빙글빙글 돌아가는 모습이 장관이에요!'
      },
      {
        id: 'upg_wash_vending',
        name: '스마트 세제 자판기 & 동전 교환기 타워',
        cost: 85,
        visitBonus: 5,
        cycleBonus: 16,
        chip: '세제·동전기 · 주기 +16만',
        tone: 'mint',
        reaction: '파란 세제 자판기와 동전 교환기 덕분에 부가 매출이 쏠쏠해요!'
      },
      {
        id: 'upg_wash_lounge',
        name: '원목 빨래 폴딩 테이블 & 바퀴 바구니 카트',
        cost: 90,
        visitBonus: 5,
        cycleBonus: 17,
        chip: '카트&폴딩존 · 주기 +17만',
        tone: 'gold',
        reaction: '바퀴 달린 빨래 카트와 원목 폴딩 테이블이 생겨 입주민 만족도 최고예요!'
      }
    ]
  }
];

const HAPPINESS_MILESTONES = [
  {
    threshold: 50,
    id: 'ms_50',
    title: '칭송 현수막 & 발코니 꽃화분 개화',
    badge: '50% 달성',
    icon: 'banner_flag',
    tone: 'coral',
    rewardDesc: '마을 기본 임대 수익 영구 +15%',
    detailDesc: '빌딩 외벽과 가로등에 주민 자발적 찬양 현수막이 걸리고 전 호실 창가 발코니에 꽃화분이 만개합니다.',
    camLook: { x: -4.2, y: 10.5, z: -2.0 },
    camPos: { x: 18.0, y: 20.0, z: 26.0 },
    camZoom: 1.32
  },
  {
    threshold: 75,
    id: 'ms_75',
    title: '거리 가랜드 조명 & 옥상 루프탑 파티 가든',
    badge: '75% 달성',
    icon: 'berry_farm',
    tone: 'mint',
    rewardDesc: '상가 방문객 속도 및 소비액 영구 +25%',
    detailDesc: '거리 허공에 알전구 스트링 라이트·삼각 가랜드와 열기구가 뜨고, 빌딩 옥상에 인조잔디·자쿠지·BBQ 파티 가든이 개장합니다.',
    camLook: { x: -4.2, y: 21.5, z: -4.5 },
    camPos: { x: 22.0, y: 34.0, z: 24.0 },
    camZoom: 1.24
  },
  {
    threshold: 90,
    id: 'ms_90',
    title: '찬양 거리 퍼레이드 & 3D 불꽃놀이 축제',
    badge: '90% 달성',
    icon: 'firework_ico',
    tone: 'sky',
    rewardDesc: '전 호실 시너지 보너스 +50% & VIP 레드카펫',
    detailDesc: '빌딩 정문에 VIP 레드카펫과 황금 차단봉이 깔리고, 고깔모자 풍선 퍼레이드 행진과 하늘의 3D 불꽃놀이가 펼쳐집니다.',
    camLook: { x: -2.0, y: 9.0, z: 6.5 },
    camPos: { x: 26.0, y: 24.0, z: 34.0 },
    camZoom: 1.08
  },
  {
    threshold: 100,
    id: 'ms_100',
    title: '광장 중앙 초대형 24K 황금 건물주 동상 건립',
    badge: '100% MAX 전설',
    icon: 'statue_gold',
    tone: 'gold',
    rewardDesc: '영구 전 수익 2배 & [전설의 성군 건물주] 칭호',
    detailDesc: '중앙 광장에 왕관과 머니건을 치켜든 초대형 24K 순금 건물주 동상이 제막되며, 클릭할 때마다 축하 보너스 코인이 쏟아집니다!',
    camLook: { x: 0.0, y: 3.4, z: 17.8 },
    camPos: { x: 16.5, y: 14.5, z: 34.5 },
    camZoom: 1.68
  }
];

const CHARACTER_STYLE_PRESETS = [
  { face: 1,  outfit: 1,  hair: 'bob_bangs',        hairHex: 0x4A342E },
  { face: 2,  outfit: 2,  hair: 'double_buns',      hairHex: 0x6D4534 },
  { face: 3,  outfit: 3,  hair: 'braided_pigtails', hairHex: 0x8D5524 },
  { face: 4,  outfit: 4,  hair: 'parted_perm',      hairHex: 0x2F292B },
  { face: 5,  outfit: 5,  hair: 'high_ponytail',    hairHex: 0xB86B35 },
  { face: 6,  outfit: 6,  hair: 'cat_headset',      hairHex: 0xC084FC },
  { face: 7,  outfit: 7,  hair: 'fluffy_curl',      hairHex: 0xD6D3D1 },
  { face: 8,  outfit: 8,  hair: 'wavy_perm',        hairHex: 0x5C3A2E },
  { face: 9,  outfit: 1,  hair: 'parted_perm',      hairHex: 0x3B2F2F },
  { face: 10, outfit: 2,  hair: 'double_buns',      hairHex: 0xA16207 },
  { face: 11, outfit: 3,  hair: 'bob_bangs',        hairHex: 0x3E2723 },
  { face: 12, outfit: 5,  hair: 'wavy_perm',        hairHex: 0x7C2D12 }
];

// =========================================================
// 11. 포브스(FORBES) 대한민국 갓물주 자산 순위 보드 10인 거물 랭커 데이터
// =========================================================
const FORBES_RIVAL_RANKERS = [
  {
    baseRank: 1,
    id: 'rank_mansour',
    name: '두바이 오일머니 만수르 셰이크',
    badge: '글로벌 절대성군',
    titleUnlock: '세계관 최강 만수르 대제',
    netWorth: 18500,
    dividendReward: 1200,
    tone: 'gold',
    avatarRole: 'mansour',
    desc: '유전과 초고층 골드 랜드마크를 소유한 전설의 최정점 자산가'
  },
  {
    baseRank: 2,
    id: 'rank_yeouido',
    name: '여의도 월스트리트 한 회장',
    badge: '금융타워 거물',
    titleUnlock: '여의도 스카이라인 지배자',
    netWorth: 12800,
    dividendReward: 750,
    tone: 'sky',
    avatarRole: 'manager',
    desc: '여의도 초고층 프라임 오피스와 글로벌 리츠를 굴리는 큰손'
  },
  {
    baseRank: 3,
    id: 'rank_gangnam',
    name: '강남 테헤란로 타워 백 총수',
    badge: '강남 빌딩왕',
    titleUnlock: '테헤란로 프라임 건물주',
    netWorth: 9200,
    dividendReward: 550,
    tone: 'mint',
    avatarRole: 'developer',
    desc: '테헤란로 역세권 코너 빌딩 5채를 보유한 전통의 빌딩 재벌'
  },
  {
    baseRank: 4,
    id: 'rival_kang',
    name: '블랙타워 강 회장',
    badge: '숙명의 라이벌!',
    titleUnlock: '강 회장 참교육자 · 4대 천왕',
    netWorth: 6400,
    dividendReward: 500,
    tone: 'coral',
    isArchRival: true,
    avatarRole: 'rival_kang',
    desc: '보라색 슈퍼카를 몰고 다니며 우량 세입자와 상가 매물을 노리는 야심가'
  },
  {
    baseRank: 5,
    id: 'rank_haeundae',
    name: '해운대 오션뷰 마 회장',
    badge: '마린시티 큰손',
    titleUnlock: '오션뷰 리조트 타이쿤',
    netWorth: 5100,
    dividendReward: 340,
    tone: 'sky',
    avatarRole: 'barista',
    desc: '해운대 해안 상권과 오션뷰 펜트하우스를 싹쓸이한 리조트 재벌'
  },
  {
    baseRank: 6,
    id: 'rank_apgujeong',
    name: '압구정 로데오 정 사모님',
    badge: '청담 부티크 여왕',
    titleUnlock: '로데오 플래그십 오너',
    netWorth: 4200,
    dividendReward: 280,
    tone: 'coral',
    avatarRole: 'florist',
    desc: '청담·압구정 명품 부티크 상가 거리를 장악한 패션 부동산 큰손'
  },
  {
    baseRank: 7,
    id: 'rank_pangyo',
    name: '판교 코인졸부 최 이사',
    badge: '테크밸리 신흥부자',
    titleUnlock: '스마트 밸리 건물주',
    netWorth: 3450,
    dividendReward: 220,
    tone: 'mint',
    avatarRole: 'streamer',
    desc: '스타트업 엑싯 자금으로 주상복합 상가를 사 모으는 신흥 영앤리치'
  },
  {
    baseRank: 8,
    id: 'rank_seongsu',
    name: '성수동 붉은벽돌 김 사장',
    badge: '핫플 리모델링 장인',
    titleUnlock: '성수 브릭타운 명인',
    netWorth: 2850,
    dividendReward: 180,
    tone: 'gold',
    avatarRole: 'baker',
    desc: '구옥 공장을 감성 베이커리와 로스터리 상가로 탈바꿈시킨 고수'
  },
  {
    baseRank: 9,
    id: 'rank_hongdae',
    name: '홍대 힙스터 윤 대표',
    badge: '상권 트렌드세터',
    titleUnlock: '부티크 스트리트 메이커',
    netWorth: 2380,
    dividendReward: 140,
    tone: 'sky',
    avatarRole: 'newlywed',
    desc: '개성 넘치는 원룸·복층 스튜디오와 디저트 샵을 운영하는 젊은 건물주'
  },
  {
    baseRank: 10,
    id: 'rank_park',
    name: '복덕방 박 영감',
    badge: '동네 터줏대감',
    titleUnlock: '미니미 타운 신예 갓물주',
    netWorth: 1850,
    dividendReward: 100,
    tone: 'cream',
    avatarRole: 'elderly',
    desc: '30년째 동네 알짜 상가주택을 지키고 있는 노련한 원로 임대인'
  }
];

const RIVAL_BATTLE_MODES = [
  {
    id: 'poach_defense',
    title: '승부 ①: 우량 세입자 스카우트 방어전',
    badge: '임대료 영구 +30%',
    icon: 'megaphone_purple',
    tone: 'coral',
    desc: '블랙타워 강 회장이 확성기를 들고 내 세입자를 빼가려 유혹합니다! 즉석 가구 업그레이드·선물·머니건으로 참교육하세요!'
  },
  {
    id: 'bidding_war',
    title: '승부 ②: 황금 상가 1:1 실시간 입찰 경매 배틀',
    badge: '상가수익 영구 +40%',
    icon: 'auction_paddle',
    tone: 'gold',
    desc: '미인수 부티크 상가 앞에서 강 회장과 3D 경매 번호판을 들며 자존심 호가 배틀! 200% 황금 돈가방 폭격으로 즉시 낙찰받으세요!'
  },
  {
    id: 'coastal_race',
    title: '승부 ③-A: 외곽 해안 드라이빙 존 1:1 슈퍼카 레이스',
    badge: '위자료 코인 대폭발',
    icon: 'race_flag',
    tone: 'sky',
    desc: '해안 야자수 도로와 빨간 철제 아치교에서 보라색 라이벌 슈퍼카와 부스트 코인 추월 레이스를 펼칩니다!'
  },
  {
    id: 'double_bell',
    title: '승부 ③-B: 1인칭 상점 만수르 더블 골든벨 맞불 대결',
    badge: '골든벨 팁 +480만',
    icon: 'golden_bell',
    tone: 'mint',
    desc: '내 매장에서 거들먹거리는 강 회장 코앞에서 만수르 더블 골든벨을 울려 손님들의 찬양을 독차지하세요!'
  }
];

const TITLE_LOADING_STAGES = [
  { threshold: 0,   icon: 'item_croissant_ico', text: '파티세리 빵집에서 실사 크루아상 굽는 중...' },
  { threshold: 26,  icon: 'mart_ico',           text: '1층 편의점 매대에 바삭한 과자 봉지 진열 중...' },
  { threshold: 54,  icon: 'steering_supercar',  text: 'VIP 주차장에 오픈 슈퍼카 광택 내는 중...' },
  { threshold: 80,  icon: 'money_gun',          text: '만수르 황금 머니건에 오만원권 지폐 장전 중...' },
  { threshold: 100, icon: 'forbes_trophy',      text: '타운 오픈 준비 완료!' }
];

const TITLE_TIPS_POOL = [
  'TIP: 세입자 방을 클릭해 취향에 맞는 가구를 배치하면 임대료 시너지가 폭발합니다!',
  'TIP: 라이벌 강 회장의 스카우트 공세를 방어하면 해당 호실 임대료가 영구 +30% 인상됩니다!',
  'TIP: 상가 경매에서 200% 황금 돈가방 폭격을 날리면 매장 기본 수익이 영구 +40% 상승합니다!',
  'TIP: 총자산을 불려 포브스(FORBES) 대한민국 건물주 랭킹 1위 만수르 셰이크에 도전해 보세요!'
];

function createTitleEmblemSVG() {
  return `
    <svg width="164" height="128" viewBox="0 0 164 128" fill="none" xmlns="http://www.w3.org/2000/svg" class="select-none drop-shadow-xl">
      <defs>
        <linearGradient id="te_sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#FFFDF8"/>
          <stop offset="100%" stop-color="#FFE8CC"/>
        </linearGradient>
        <linearGradient id="te_gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#FFF7B0"/>
          <stop offset="50%" stop-color="#FFD93D"/>
          <stop offset="100%" stop-color="#D97706"/>
        </linearGradient>
        <linearGradient id="te_coral" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#FF9E9E"/>
          <stop offset="100%" stop-color="#E03E52"/>
        </linearGradient>
        <linearGradient id="te_mint" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#A7F3D0"/>
          <stop offset="100%" stop-color="#10B981"/>
        </linearGradient>
      </defs>
      <!-- 파스텔 구름 베이스 오라 -->
      <ellipse cx="82" cy="108" rx="64" ry="13" fill="#3A2E2B" opacity="0.16"/>
      <rect x="26" y="34" width="112" height="72" rx="34" fill="url(#te_sky)" stroke="#3A2E2B" stroke-width="3.2"/>
      <!-- 좌측 아기자기 부티크 상가 -->
      <rect x="36" y="64" width="28" height="34" rx="5" fill="#FFF5EB" stroke="#3A2E2B" stroke-width="2.4"/>
      <rect x="33" y="56" width="34" height="10" rx="4" fill="url(#te_mint)" stroke="#3A2E2B" stroke-width="2.2"/>
      <!-- 중앙 미니어처 랜드마크 빌딩 -->
      <rect x="62" y="36" width="42" height="62" rx="6" fill="#FFFDF7" stroke="#3A2E2B" stroke-width="2.8"/>
      <rect x="59" y="30" width="48" height="9" rx="4" fill="url(#te_coral)" stroke="#3A2E2B" stroke-width="2.4"/>
      <rect x="69" y="45" width="11" height="11" rx="2.5" fill="#BAE6FD" stroke="#3A2E2B" stroke-width="1.8"/>
      <rect x="86" y="45" width="11" height="11" rx="2.5" fill="#BAE6FD" stroke="#3A2E2B" stroke-width="1.8"/>
      <rect x="69" y="62" width="11" height="11" rx="2.5" fill="#FDE68A" stroke="#3A2E2B" stroke-width="1.8"/>
      <rect x="86" y="62" width="11" height="11" rx="2.5" fill="#FDE68A" stroke="#3A2E2B" stroke-width="1.8"/>
      <rect x="76" y="80" width="14" height="18" rx="3" fill="url(#te_gold)" stroke="#3A2E2B" stroke-width="2"/>
      <!-- 빌딩 꼭대기 24K 황금 왕관 -->
      <path d="M65 28L69 11L83 20L97 11L101 28Z" fill="url(#te_gold)" stroke="#3A2E2B" stroke-width="2.6" stroke-linejoin="round"/>
      <circle cx="69" cy="9" r="3.5" fill="#FFFDF7" stroke="#3A2E2B" stroke-width="1.8"/>
      <circle cx="83" cy="7" r="4.2" fill="#FF6B6B" stroke="#3A2E2B" stroke-width="1.8"/>
      <circle cx="97" cy="9" r="3.5" fill="#FFFDF7" stroke="#3A2E2B" stroke-width="1.8"/>
      <!-- 우측 전면 오픈 레드 슈퍼카 -->
      <g transform="translate(88, 76)">
        <path d="M4 16L11 8H33L44 13L48 18V23H4V16Z" fill="url(#te_coral)" stroke="#3A2E2B" stroke-width="2.4" stroke-linejoin="round"/>
        <path d="M15 9.2L12 14H31L28 9.2Z" fill="#BAE6FD" stroke="#3A2E2B" stroke-width="1.6"/>
        <circle cx="14" cy="23" r="5.5" fill="#1E293B" stroke="#3A2E2B" stroke-width="2"/>
        <circle cx="14" cy="23" r="2.3" fill="#FFD93D"/>
        <circle cx="37" cy="23" r="5.5" fill="#1E293B" stroke="#3A2E2B" stroke-width="2"/>
        <circle cx="37" cy="23" r="2.3" fill="#FFD93D"/>
      </g>
      <!-- 좌측 반짝이 골드 코인 -->
      <circle cx="31" cy="88" r="10.5" fill="url(#te_gold)" stroke="#3A2E2B" stroke-width="2.4"/>
      <circle cx="31" cy="88" r="6.8" fill="none" stroke="#FFFDF7" stroke-width="1.5"/>
      <path d="M133 24L135.2 29.5L140.8 31.8L135.2 34L133 39.5L130.8 34L125.2 31.8L130.8 29.5Z" fill="#FFD93D" stroke="#3A2E2B" stroke-width="1.5"/>
      <path d="M25 28L26.6 32L30.6 33.6L26.6 35.2L25 39.2L23.4 35.2L19.4 33.6L23.4 32Z" fill="#FFFDF7" stroke="#3A2E2B" stroke-width="1.3"/>
    </svg>
  `;
}

function createLoadingMiniCarSVG() {
  return `
    <svg width="44" height="28" viewBox="0 0 44 28" fill="none" xmlns="http://www.w3.org/2000/svg" class="select-none drop-shadow">
      <path d="M4 16L10 8.5H28L38 13L41 17.5V21.5H4V16Z" fill="#FF5263" stroke="#3A2E2B" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M13 9.8L10.5 14H26.5L24 9.8Z" fill="#BAE6FD" stroke="#3A2E2B" stroke-width="1.5"/>
      <circle cx="12.5" cy="21.5" r="4.6" fill="#1E293B" stroke="#3A2E2B" stroke-width="1.8"/>
      <circle cx="12.5" cy="21.5" r="1.9" fill="#FFD93D"/>
      <circle cx="32.5" cy="21.5" r="4.6" fill="#1E293B" stroke="#3A2E2B" stroke-width="1.8"/>
      <circle cx="32.5" cy="21.5" r="1.9" fill="#FFD93D"/>
    </svg>
  `;
}

window.FORBES_RIVAL_RANKERS = FORBES_RIVAL_RANKERS;
window.RIVAL_BATTLE_MODES = RIVAL_BATTLE_MODES;
window.TITLE_LOADING_STAGES = TITLE_LOADING_STAGES;
window.TITLE_TIPS_POOL = TITLE_TIPS_POOL;
window.createTitleEmblemSVG = createTitleEmblemSVG;
window.createLoadingMiniCarSVG = createLoadingMiniCarSVG;
window.FIRST_FLOOR_SHOPS_TEMPLATE = FIRST_FLOOR_SHOPS_TEMPLATE;
window.HAPPINESS_MILESTONES = HAPPINESS_MILESTONES;
window.CHARACTER_STYLE_PRESETS = CHARACTER_STYLE_PRESETS;
window.createCustomSVGIcon = createCustomSVGIcon;
window.createCatalogThumbnailSVG = createCatalogThumbnailSVG;
window.createFurnitureArtworkSVG = createFurnitureArtworkSVG;
window.createNotebookArtworkSVG = createNotebookArtworkSVG;
window.createHouseholdAvatarSVG = createHouseholdAvatarSVG;
window.createCockpitSteeringWheelSVG = createCockpitSteeringWheelSVG;
window.createCockpitRearviewSVG = createCockpitRearviewSVG;
window.FP_RADIO_CHANNELS = FP_RADIO_CHANNELS;
window.FP_SHOP_DESTINATIONS = FP_SHOP_DESTINATIONS;
window.FP_GIFT_ITEMS = FP_GIFT_ITEMS;
window.GAME_BALANCE = GAME_BALANCE;
window.BUILDING_NAME_PRESETS = BUILDING_NAME_PRESETS;
window.INITIAL_ISLAND_LOTS = INITIAL_ISLAND_LOTS;
window.STANDALONE_SHOPS_TEMPLATE = STANDALONE_SHOPS_TEMPLATE;
window.SHOP_UPGRADE_CATALOG = SHOP_UPGRADE_CATALOG;
window.CAR_CATALOG = CAR_CATALOG;
window.ROOM_TYPE_META = ROOM_TYPE_META;
window.ROOM_SLOTS_TEMPLATE = ROOM_SLOTS_TEMPLATE;
window.FURNITURE_CATEGORIES = FURNITURE_CATEGORIES;
window.FURNITURE_CATALOG = FURNITURE_CATALOG;
window.DEVELOPMENT_CATALOG = DEVELOPMENT_CATALOG;
window.PUBLIC_INFRA_CATALOG = PUBLIC_INFRA_CATALOG;
window.ROOM_INTERIOR_TIERS = ROOM_INTERIOR_TIERS;
window.HOUSEHOLD_TYPES = HOUSEHOLD_TYPES;
window.FAMILY_LAST_NAMES = FAMILY_LAST_NAMES;
window.GIVEN_NAMES = GIVEN_NAMES;
window.QUEST_LIST = QUEST_LIST;
