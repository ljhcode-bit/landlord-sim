// =========================================================
// 【갓물주 라이프 3D: 미니미 타운】 데이터 & 탈(脫)AI 도감 SVG 일러스트 엔진 (data.js)
// - 줄글 설명(Prose) 0%: 모든 세입자·시설·퀘스트 정보를 아이콘 + 키워드 칩 + 게이지 수치로 구조화
// - createCustomSVGIcon: HUD·칩·게이지용 고대비 벡터 아이콘 24종
// - createNotebookArtworkSVG: 48x48 우표 치비 초상화 6종, [🌸 완료] 벚꽃 스탬프, 스프링 고리, 시설·상가 일러스트
// =========================================================

let svgUidSeq = 0;

// 1. HUD, 키워드 배지, 스탯 게이지용 커스텀 벡터 아이콘 생성기
function createCustomSVGIcon(name, size = 24) {
  const uid = `ico_${name}_${++svgUidSeq}`;
  const commonDefs = `
    <defs>
      <filter id="${uid}_sh" x="-20%" y="-20%" width="145%" height="155%">
        <feDropShadow dx="0" dy="1.6" stdDeviation="1.1" flood-color="#43342E" flood-opacity="0.25"/>
      </filter>
      <linearGradient id="${uid}_gold" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#FFF3B0"/>
        <stop offset="48%" stop-color="#FACC15"/>
        <stop offset="100%" stop-color="#EA8D00"/>
      </linearGradient>
      <linearGradient id="${uid}_coral" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#FFB3C1"/>
        <stop offset="55%" stop-color="#FF758F"/>
        <stop offset="100%" stop-color="#E11D48"/>
      </linearGradient>
      <linearGradient id="${uid}_mint" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#A7F3D0"/>
        <stop offset="55%" stop-color="#34D399"/>
        <stop offset="100%" stop-color="#059669"/>
      </linearGradient>
      <linearGradient id="${uid}_sky" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#BAE6FD"/>
        <stop offset="55%" stop-color="#38BDF8"/>
        <stop offset="100%" stop-color="#0284C7"/>
      </linearGradient>
      <linearGradient id="${uid}_cream" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="100%" stop-color="#FDE8D3"/>
      </linearGradient>
      <linearGradient id="${uid}_wood" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#E6A15C"/>
        <stop offset="100%" stop-color="#8C4F20"/>
      </linearGradient>
      <linearGradient id="${uid}_navy" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#4F6BED"/>
        <stop offset="100%" stop-color="#1E3A8A"/>
      </linearGradient>
    </defs>
  `;

  let body = '';

  switch (name) {
    case 'coin_stack':
      body = `
        <g filter="url(#${uid}_sh)">
          <ellipse cx="13" cy="23.5" rx="8.5" ry="4" fill="#D97706"/>
          <ellipse cx="13" cy="21.5" rx="8.5" ry="4" fill="url(#${uid}_gold)" stroke="#43342E" stroke-width="1.4"/>
          <ellipse cx="13" cy="18" rx="8.5" ry="4" fill="#D97706"/>
          <ellipse cx="13" cy="16" rx="8.5" ry="4" fill="url(#${uid}_gold)" stroke="#43342E" stroke-width="1.4"/>
          <circle cx="20.5" cy="14.5" r="8.2" fill="url(#${uid}_gold)" stroke="#43342E" stroke-width="1.5"/>
          <circle cx="20.5" cy="14.5" r="5.6" fill="none" stroke="#FFFBEB" stroke-width="1.2" opacity="0.85"/>
          <path d="M18.2 12.2L19.5 17L20.5 13.6L21.5 17L22.8 12.2" fill="none" stroke="#78350F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </g>`;
      break;

    case 'red_house':
      body = `
        <g filter="url(#${uid}_sh)">
          <rect x="20" y="6" width="4" height="7" rx="1.5" fill="url(#${uid}_wood)" stroke="#43342E" stroke-width="1.3"/>
          <rect x="6.5" y="14" width="19" height="13" rx="3.5" fill="url(#${uid}_cream)" stroke="#43342E" stroke-width="1.5"/>
          <path d="M3.5 15.5L16 5.2L28.5 15.5C29.3 16.2 28.8 17.5 27.7 17.5H4.3C3.2 17.5 2.7 16.2 3.5 15.5Z" fill="url(#${uid}_coral)" stroke="#43342E" stroke-width="1.5"/>
          <rect x="13.5" y="19.5" width="5" height="7.5" rx="2" fill="url(#${uid}_wood)" stroke="#43342E" stroke-width="1.2"/>
          <rect x="8.5" y="18.5" width="3.8" height="3.8" rx="1" fill="url(#${uid}_sky)" stroke="#43342E" stroke-width="1"/>
          <rect x="19.8" y="18.5" width="3.8" height="3.8" rx="1" fill="url(#${uid}_sky)" stroke="#43342E" stroke-width="1"/>
        </g>`;
      break;

    case 'gold_key':
      body = `
        <g filter="url(#${uid}_sh)">
          <circle cx="11" cy="12" r="6.5" fill="url(#${uid}_gold)" stroke="#43342E" stroke-width="1.5"/>
          <circle cx="11" cy="12" r="2.6" fill="#FFFDF9" stroke="#43342E" stroke-width="1.2"/>
          <path d="M16.5 14.5L26.5 22.5L24.2 25.5L22 23.8L23.5 21.8L20.8 19.8L19.2 21.8L17 20L18.8 17.8" fill="url(#${uid}_gold)" stroke="#43342E" stroke-width="1.4" stroke-linejoin="round"/>
        </g>`;
      break;

    case 'heart_gauge':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M16 26.5C16 26.5 4.5 19.2 4.5 11.4C4.5 7.4 7.7 4.5 11.3 4.5C13.6 4.5 15.2 5.7 16 7.3C16.8 5.7 18.4 4.5 20.7 4.5C24.3 4.5 27.5 7.4 27.5 11.4C27.5 19.2 16 26.5 16 26.5Z" fill="url(#${uid}_coral)" stroke="#43342E" stroke-width="1.5"/>
          <ellipse cx="10.5" cy="9.4" rx="3.2" ry="1.7" fill="#FFFFFF" opacity="0.72" transform="rotate(-28 10.5 9.4)"/>
        </g>`;
      break;

    case 'town_notebook':
      body = `
        <g filter="url(#${uid}_sh)">
          <rect x="22" y="7" width="4.5" height="4.5" rx="1.5" fill="url(#${uid}_coral)" stroke="#43342E" stroke-width="1.2"/>
          <rect x="22" y="13" width="4.5" height="4.5" rx="1.5" fill="url(#${uid}_mint)" stroke="#43342E" stroke-width="1.2"/>
          <rect x="22" y="19" width="4.5" height="4.5" rx="1.5" fill="url(#${uid}_sky)" stroke="#43342E" stroke-width="1.2"/>
          <rect x="6" y="4" width="17.5" height="24" rx="4.5" fill="url(#${uid}_cream)" stroke="#43342E" stroke-width="1.5"/>
          <rect x="6" y="4" width="4.4" height="24" rx="2" fill="url(#${uid}_coral)" stroke="#43342E" stroke-width="1.3"/>
          <rect x="12.5" y="9" width="8" height="3.2" rx="1.5" fill="url(#${uid}_gold)"/>
          <rect x="12.5" y="14.5" width="7" height="2.4" rx="1.2" fill="#D4A373"/>
          <rect x="12.5" y="19" width="8" height="2.4" rx="1.2" fill="#E6CCB2"/>
        </g>`;
      break;

    case 'quest_trophy':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M8 8H5.5C4.5 8 4 9 4.3 10.5C4.8 13 6.8 14.8 9.2 15" fill="none" stroke="#43342E" stroke-width="3.2" stroke-linecap="round"/>
          <path d="M8 8H5.5C4.5 8 4 9 4.3 10.5C4.8 13 6.8 14.8 9.2 15" fill="none" stroke="url(#${uid}_gold)" stroke-width="2" stroke-linecap="round"/>
          <path d="M24 8H26.5C27.5 8 28 9 27.7 10.5C27.2 13 25.2 14.8 22.8 15" fill="none" stroke="#43342E" stroke-width="3.2" stroke-linecap="round"/>
          <path d="M24 8H26.5C27.5 8 28 9 27.7 10.5C27.2 13 25.2 14.8 22.8 15" fill="none" stroke="url(#${uid}_gold)" stroke-width="2" stroke-linecap="round"/>
          <path d="M8.5 5.5H23.5V12.5C23.5 17 20.1 20 16 20C11.9 20 8.5 17 8.5 12.5V5.5Z" fill="url(#${uid}_gold)" stroke="#43342E" stroke-width="1.5"/>
          <rect x="14" y="19.5" width="4" height="4.5" rx="1" fill="url(#${uid}_gold)" stroke="#43342E" stroke-width="1.3"/>
          <rect x="10" y="23.5" width="12" height="3.8" rx="1.9" fill="url(#${uid}_wood)" stroke="#43342E" stroke-width="1.4"/>
          <polygon points="16,8.5 17.2,11.2 20,11.5 17.9,13.4 18.5,16.2 16,14.7 13.5,16.2 14.1,13.4 12,11.5 14.8,11.2" fill="#FFFBEB"/>
        </g>`;
      break;

    case 'target_aim':
      body = `
        <g filter="url(#${uid}_sh)">
          <circle cx="16" cy="16" r="11" fill="url(#${uid}_coral)" stroke="#43342E" stroke-width="1.5"/>
          <circle cx="16" cy="16" r="7.2" fill="#FFFDF9" stroke="#43342E" stroke-width="1.2"/>
          <circle cx="16" cy="16" r="3.6" fill="url(#${uid}_gold)" stroke="#43342E" stroke-width="1.2"/>
          <path d="M21 11L27 5M27 5H23.2M27 5V8.8" stroke="#43342E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </g>`;
      break;

    case 'manager_cap':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M5 17C5 11.5 9.8 7.5 16 7.5C22.2 7.5 27 11.5 27 17L24.5 20.5H7.5L5 17Z" fill="url(#${uid}_navy)" stroke="#43342E" stroke-width="1.5"/>
          <path d="M6.5 20C10.5 23.8 21.5 23.8 25.5 20L27 21.8C22 26.2 10 26.2 5 21.8L6.5 20Z" fill="#1E293B"/>
          <rect x="7.5" y="17.8" width="17" height="2.4" rx="1.2" fill="url(#${uid}_gold)"/>
          <circle cx="16" cy="13.2" r="2.6" fill="url(#${uid}_gold)" stroke="#43342E" stroke-width="1"/>
        </g>`;
      break;

    case 'megaphone':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M6 13.5L21.5 6.5V23.5L6 16.5V13.5Z" fill="url(#${uid}_coral)" stroke="#43342E" stroke-width="1.5" stroke-linejoin="round"/>
          <rect x="4" y="12.5" width="4" height="5.5" rx="2" fill="url(#${uid}_cream)" stroke="#43342E" stroke-width="1.3"/>
          <path d="M8.5 17.5L10.5 24.5C10.8 25.5 9.8 26.2 8.8 26L6.8 25C6 24.6 5.8 23.6 6.2 22.8L7 17" fill="url(#${uid}_gold)" stroke="#43342E" stroke-width="1.3"/>
          <ellipse cx="21.5" cy="15" rx="2.4" ry="8.5" fill="url(#${uid}_cream)" stroke="#43342E" stroke-width="1.3"/>
        </g>`;
      break;

    case 'broom_clean':
      body = `
        <g filter="url(#${uid}_sh)">
          <line x1="23.5" y1="4.5" x2="13.5" y2="17.5" stroke="#43342E" stroke-width="4.4" stroke-linecap="round"/>
          <line x1="23.5" y1="4.5" x2="13.5" y2="17.5" stroke="url(#${uid}_wood)" stroke-width="2.8" stroke-linecap="round"/>
          <path d="M9.5 16L17.5 20.5L13.5 27.2C10.5 26.5 6.8 24 5.2 21.5L9.5 16Z" fill="url(#${uid}_gold)" stroke="#43342E" stroke-width="1.5" stroke-linejoin="round"/>
          <circle cx="24.5" cy="13.5" r="2" fill="url(#${uid}_sky)" stroke="#43342E" stroke-width="1"/>
        </g>`;
      break;

    case 'evict_stamp':
      body = `
        <g filter="url(#${uid}_sh)">
          <circle cx="16" cy="9" r="4.5" fill="url(#${uid}_coral)" stroke="#43342E" stroke-width="1.4"/>
          <path d="M13.5 12.5H18.5L20 19.5H12L13.5 12.5Z" fill="url(#${uid}_coral)" stroke="#43342E" stroke-width="1.4"/>
          <rect x="6.5" y="19.5" width="19" height="4.2" rx="2" fill="url(#${uid}_cream)" stroke="#43342E" stroke-width="1.4"/>
          <rect x="8" y="23.7" width="16" height="2.8" rx="1.2" fill="#E11D48"/>
        </g>`;
      break;

    case 'elevator':
      body = `
        <g filter="url(#${uid}_sh)">
          <rect x="6" y="4" width="20" height="24" rx="4.5" fill="url(#${uid}_sky)" stroke="#43342E" stroke-width="1.5"/>
          <rect x="9" y="8" width="14" height="17" rx="2.5" fill="#FFFDF9" stroke="#43342E" stroke-width="1.2"/>
          <line x1="16" y1="8" x2="16" y2="25" stroke="#0284C7" stroke-width="1.5"/>
        </g>`;
      break;

    case 'recycle_bin':
      body = `
        <g filter="url(#${uid}_sh)">
          <rect x="7" y="6.5" width="18" height="3.5" rx="1.7" fill="url(#${uid}_mint)" stroke="#43342E" stroke-width="1.3"/>
          <path d="M8.5 10H23.5L21.8 26.5C21.7 27.3 21 28 20.2 28H11.8C11 28 10.3 27.3 10.2 26.5L8.5 10Z" fill="url(#${uid}_mint)" stroke="#43342E" stroke-width="1.5"/>
          <circle cx="16" cy="18.5" r="4" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="5 2.5"/>
        </g>`;
      break;

    case 'solar_panel':
      body = `
        <g filter="url(#${uid}_sh)">
          <circle cx="23.5" cy="7.5" r="4" fill="url(#${uid}_gold)" stroke="#43342E" stroke-width="1.2"/>
          <polygon points="6,13 21,11 25,23 4,25" fill="url(#${uid}_navy)" stroke="#43342E" stroke-width="1.5" stroke-linejoin="round"/>
          <line x1="13.5" y1="12" x2="14.5" y2="24" stroke="#BAE6FD" stroke-width="1.2"/>
          <line x1="5" y1="19" x2="23" y2="17" stroke="#BAE6FD" stroke-width="1.2"/>
        </g>`;
      break;

    case 'berry_farm':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M16 27.5C10.5 27.5 6.5 21 6.5 14.8C6.5 10.5 10.2 8.5 16 8.5C21.8 8.5 25.5 10.5 25.5 14.8C25.5 21 21.5 27.5 16 27.5Z" fill="url(#${uid}_coral)" stroke="#43342E" stroke-width="1.5"/>
          <path d="M10 9.5C12 6 15 6.5 16 9C17 6.5 20 6 22 9.5C19.5 11.2 12.5 11.2 10 9.5Z" fill="url(#${uid}_mint)" stroke="#43342E" stroke-width="1.2"/>
          <circle cx="12.5" cy="15.5" r="1" fill="#FFF3B0"/>
          <circle cx="16" cy="18" r="1" fill="#FFF3B0"/>
          <circle cx="19.5" cy="15.5" r="1" fill="#FFF3B0"/>
        </g>`;
      break;

    case 'paw_print':
      body = `
        <g filter="url(#${uid}_sh)">
          <ellipse cx="16" cy="20.5" rx="6.5" ry="5.2" fill="url(#${uid}_coral)" stroke="#43342E" stroke-width="1.4"/>
          <ellipse cx="8.5" cy="13.5" rx="2.5" ry="3.2" fill="url(#${uid}_coral)" stroke="#43342E" stroke-width="1.2" transform="rotate(-20 8.5 13.5)"/>
          <ellipse cx="13.5" cy="10" rx="2.5" ry="3.3" fill="url(#${uid}_coral)" stroke="#43342E" stroke-width="1.2" transform="rotate(-6 13.5 10)"/>
          <ellipse cx="18.8" cy="10" rx="2.5" ry="3.3" fill="url(#${uid}_coral)" stroke="#43342E" stroke-width="1.2" transform="rotate(6 18.8 10)"/>
          <ellipse cx="23.5" cy="13.5" rx="2.5" ry="3.2" fill="url(#${uid}_coral)" stroke="#43342E" stroke-width="1.2" transform="rotate(20 23.5 13.5)"/>
        </g>`;
      break;

    case 'soundproof_hammer':
      body = `
        <g filter="url(#${uid}_sh)">
          <line x1="8" y1="25" x2="18.5" y2="13.5" stroke="#43342E" stroke-width="4.6" stroke-linecap="round"/>
          <line x1="8" y1="25" x2="18.5" y2="13.5" stroke="url(#${uid}_wood)" stroke-width="3" stroke-linecap="round"/>
          <rect x="13" y="6" width="12" height="7" rx="3" transform="rotate(42 19 9.5)" fill="url(#${uid}_sky)" stroke="#43342E" stroke-width="1.5"/>
        </g>`;
      break;

    case 'wrench_tool':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M22.5 6.5C19.8 6.5 17.5 8.5 17.2 11.2L7.2 21.2C6 22.4 6 24.3 7.2 25.5C8.4 26.7 10.3 26.7 11.5 25.5L21.5 15.5C24.2 15.2 26.2 12.9 26.2 10.2C26.2 9.4 25.9 8.7 25.5 8.1L22.8 10.8L20.8 8.8L23.5 6.1C23.1 6.3 22.8 6.5 22.5 6.5Z" fill="url(#${uid}_sky)" stroke="#43342E" stroke-width="1.5" stroke-linejoin="round"/>
        </g>`;
      break;

    case 'coffee_cup':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M7 13H21V20C21 23.8 17.8 26.5 14 26.5C10.2 26.5 7 23.8 7 20V13Z" fill="url(#${uid}_cream)" stroke="#43342E" stroke-width="1.5"/>
          <path d="M21 15H24C25.6 15 26.5 16.3 26.5 18C26.5 19.7 25.6 21 24 21H21" fill="none" stroke="#43342E" stroke-width="1.8"/>
          <path d="M11 9.5Q12 7 11 5M16 9.5Q17 7 16 5" fill="none" stroke="#D97706" stroke-width="1.6" stroke-linecap="round"/>
        </g>`;
      break;

    case 'guitar_note':
      body = `
        <g filter="url(#${uid}_sh)">
          <circle cx="11" cy="22.5" r="4.4" fill="url(#${uid}_coral)" stroke="#43342E" stroke-width="1.5"/>
          <circle cx="22" cy="19.5" r="4.4" fill="url(#${uid}_gold)" stroke="#43342E" stroke-width="1.5"/>
          <path d="M15 22V8.5L26 6V19.5" fill="none" stroke="#43342E" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M15 12L26 9.5" stroke="#43342E" stroke-width="2.2"/>
        </g>`;
      break;

    case 'sound_wave':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M5.5 13H9.8L15.8 7.8V24.2L9.8 19H5.5V13Z" fill="url(#${uid}_sky)" stroke="#43342E" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M19.5 11.5C21.5 13.5 21.5 18.5 19.5 20.5" fill="none" stroke="#E11D48" stroke-width="2.1" stroke-linecap="round"/>
          <path d="M23 8.5C26.5 12.2 26.5 19.8 23 23.5" fill="none" stroke="#E11D48" stroke-width="2.1" stroke-linecap="round"/>
        </g>`;
      break;

    case 'alert_bubble':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M5 14.5C5 8.8 9.9 4.5 16 4.5C22.1 4.5 27 8.8 27 14.5C27 20.2 22.1 24.5 16 24.5C14.1 24.5 12.3 24.1 10.7 23.3L6 26L7.3 20.8C5.8 19 5 16.9 5 14.5Z" fill="url(#${uid}_coral)" stroke="#43342E" stroke-width="1.5" stroke-linejoin="round"/>
          <line x1="16" y1="9.5" x2="16" y2="15.8" stroke="#FFFFFF" stroke-width="2.8" stroke-linecap="round"/>
          <circle cx="16" cy="19.6" r="1.6" fill="#FFFFFF"/>
        </g>`;
      break;

    case 'relocate_move':
      body = `
        <g filter="url(#${uid}_sh)">
          <rect x="6" y="9" width="15" height="14" rx="3" fill="url(#${uid}_wood)" stroke="#43342E" stroke-width="1.5"/>
          <rect x="11.5" y="9" width="4" height="5.5" fill="url(#${uid}_gold)" stroke="#43342E" stroke-width="1.1"/>
          <path d="M18 16H27M27 16L23.5 12.5M27 16L23.5 19.5" fill="none" stroke="#059669" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
        </g>`;
      break;

    case 'plus_pin':
      body = `
        <g filter="url(#${uid}_sh)">
          <circle cx="16" cy="16" r="11.5" fill="url(#${uid}_mint)" stroke="#43342E" stroke-width="1.5"/>
          <path d="M16 10.5V21.5M10.5 16H21.5" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round"/>
        </g>`;
      break;

    case 'sparkle_star':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M16 4L19.2 12.8L28 16L19.2 19.2L16 28L12.8 19.2L4 16L12.8 12.8Z" fill="url(#${uid}_gold)" stroke="#43342E" stroke-width="1.5" stroke-linejoin="round"/>
          <circle cx="16" cy="16" r="2.2" fill="#FFFFFF"/>
        </g>`;
      break;

    case 'crown_badge':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M5 23L7.5 10L12.8 15.2L16 7.5L19.2 15.2L24.5 10L27 23H5Z" fill="url(#${uid}_gold)" stroke="#43342E" stroke-width="1.5" stroke-linejoin="round"/>
          <rect x="5" y="22.5" width="22" height="3.8" rx="1.8" fill="url(#${uid}_coral)" stroke="#43342E" stroke-width="1.3"/>
          <circle cx="16" cy="17.5" r="2" fill="#FFFDF9"/>
        </g>`;
      break;

    case 'edit_pen':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M7 25L8.5 19.5L20.5 7.5C21.6 6.4 23.4 6.4 24.5 7.5C25.6 8.6 25.6 10.4 24.5 11.5L12.5 23.5L7 25Z" fill="url(#${uid}_gold)" stroke="#43342E" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M18.5 9.5L22.5 13.5" stroke="#43342E" stroke-width="1.4"/>
          <path d="M7 25L10.5 24L8 21.5L7 25Z" fill="#43342E"/>
        </g>`;
      break;

    default:
      body = `
        <g filter="url(#${uid}_sh)">
          <rect x="6.5" y="11" width="19" height="15" rx="3.5" fill="url(#${uid}_gold)" stroke="#43342E" stroke-width="1.5"/>
          <rect x="5.5" y="8.5" width="21" height="4.5" rx="2" fill="url(#${uid}_gold)" stroke="#43342E" stroke-width="1.5"/>
          <rect x="14" y="8.5" width="4" height="17.5" fill="url(#${uid}_coral)"/>
        </g>`;
      break;
  }

  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" class="inline-block shrink-0 select-none">${commonDefs}${body}</svg>`;
}

// =========================================================
// 2. [요구사항 2] 스프링 다이어리 전용 48x48 우표 치비 초상화 & [🌸 완료] 도장 에셋
// =========================================================
function createNotebookArtworkSVG(kind, size = 48) {
  const uid = `nb_${kind}_${++svgUidSeq}`;

  // 1) [🌸 완료] 스탬프 도장 그래픽
  if (kind === 'stamp_well_done' || kind === 'stamp_complete') {
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg" class="inline-block shrink-0 select-none">
        <g transform="rotate(-10 34 34)">
          <circle cx="34" cy="34" r="29" fill="#FFF0F3" fill-opacity="0.94" stroke="#E11D48" stroke-width="2.8"/>
          <circle cx="34" cy="34" r="24.5" fill="none" stroke="#FB7185" stroke-width="1.5" stroke-dasharray="3.5 2.8"/>
          <!-- 벚꽃 심볼 -->
          <circle cx="34" cy="19.5" r="4.2" fill="#FF758F"/>
          <circle cx="29" cy="23" r="4.2" fill="#FF758F"/>
          <circle cx="39" cy="23" r="4.2" fill="#FF758F"/>
          <circle cx="31" cy="28.2" r="4.2" fill="#FF758F"/>
          <circle cx="37" cy="28.2" r="4.2" fill="#FF758F"/>
          <circle cx="34" cy="24.2" r="2.4" fill="#FACC15"/>
          <text x="34" y="47.5" text-anchor="middle" fill="#BE123C" font-size="14.5" font-weight="800">완료</text>
        </g>
      </svg>`;
  }

  // 2) 다이어리 중앙 스프링 제본 고리 SVG
  if (kind === 'binder_ring') {
    return `
      <svg width="26" height="22" viewBox="0 0 26 22" fill="none" xmlns="http://www.w3.org/2000/svg" class="shrink-0 select-none">
        <circle cx="5" cy="11" r="3.5" fill="#E6CCB2" stroke="#6D5D53" stroke-width="1.3"/>
        <circle cx="21" cy="11" r="3.5" fill="#E6CCB2" stroke="#6D5D53" stroke-width="1.3"/>
        <path d="M5 9.5C9 5.5 17 5.5 21 9.5" stroke="#43342E" stroke-width="3.6" stroke-linecap="round"/>
        <path d="M5 9.5C9 5.5 17 5.5 21 9.5" stroke="#FFFDF9" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M5 13.5C9 9.5 17 9.5 21 13.5" stroke="#43342E" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M5 13.5C9 9.5 17 9.5 21 13.5" stroke="#F5D5B8" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`;
  }

  // 3) 6종 캐릭터 48x48px 2D 치비(Chibi) 우표 배지 (대학생 / 신혼부부 / 4인가족 / 노부부 / 히키코모리 / 관리인)
  if (kind.startsWith('avatar_')) {
    const role = kind.replace('avatar_', '');
    const bgPalette = {
      student: ['#E0F2FE', '#BAE6FD'],
      newlywed: ['#FFE4EC', '#FBCFE8'],
      family4: ['#DCFCE7', '#A7F3D0'],
      elderly: ['#FEF3C7', '#FDE68A'],
      hikikomori: ['#EDE9FE', '#DDD6FE'],
      manager: ['#DBEAFE', '#BFDBFE']
    };
    const [bg1, bg2] = bgPalette[role] || bgPalette.student;
    let portrait = '';

    if (role === 'student') {
      portrait = `
        <path d="M14 58C15 45 22 41 32 41C42 41 49 45 50 58Z" fill="#60A5FA" stroke="#43342E" stroke-width="2"/>
        <path d="M18 32C18 18.5 46 18.5 46 32" fill="none" stroke="#FF6B8B" stroke-width="4" stroke-linecap="round"/>
        <rect x="13" y="27" width="5.8" height="10" rx="2.8" fill="#FF6B8B" stroke="#43342E" stroke-width="1.6"/>
        <rect x="45.2" y="27" width="5.8" height="10" rx="2.8" fill="#FF6B8B" stroke="#43342E" stroke-width="1.6"/>
        <circle cx="32" cy="33" r="12.2" fill="#FFE5D6" stroke="#43342E" stroke-width="2"/>
        <path d="M19.8 30C21 19 43 19 44.2 30C38 25 26 25 19.8 30Z" fill="#4A3B32" stroke="#43342E" stroke-width="1.6"/>
        <circle cx="27.2" cy="33.5" r="3.6" fill="#FFFFFF" fill-opacity="0.6" stroke="#43342E" stroke-width="1.6"/>
        <circle cx="36.8" cy="33.5" r="3.6" fill="#FFFFFF" fill-opacity="0.6" stroke="#43342E" stroke-width="1.6"/>
        <line x1="30.8" y1="33.5" x2="33.2" y2="33.5" stroke="#43342E" stroke-width="1.6"/>
        <circle cx="27.2" cy="33.5" r="1.5" fill="#43342E"/>
        <circle cx="36.8" cy="33.5" r="1.5" fill="#43342E"/>
        <ellipse cx="23" cy="37.2" rx="2.2" ry="1.1" fill="#FF8FA3"/>
        <ellipse cx="41" cy="37.2" rx="2.2" ry="1.1" fill="#FF8FA3"/>
        <path d="M29.5 38.6Q32 41 34.5 38.6" fill="none" stroke="#43342E" stroke-width="1.6" stroke-linecap="round"/>`;
    } else if (role === 'newlywed') {
      portrait = `
        <circle cx="23" cy="35" r="10" fill="#FFE5D6" stroke="#43342E" stroke-width="1.9"/>
        <path d="M13 33C13.5 22 32.5 22 33 33C28 28 18 28 13 33Z" fill="#4A3B32" stroke="#43342E" stroke-width="1.6"/>
        <circle cx="41" cy="36" r="9.5" fill="#FFE5D6" stroke="#43342E" stroke-width="1.9"/>
        <path d="M31.5 34C32 24 50 24 50.5 34C46 29 36 29 31.5 34Z" fill="#7C3F1D" stroke="#43342E" stroke-width="1.6"/>
        <ellipse cx="38" cy="23" rx="4.2" ry="2.6" fill="#FF6B8B" stroke="#43342E" stroke-width="1.3" transform="rotate(-15 38 23)"/>
        <ellipse cx="45" cy="23" rx="4.2" ry="2.6" fill="#FF6B8B" stroke="#43342E" stroke-width="1.3" transform="rotate(15 45 23)"/>
        <circle cx="20" cy="35.5" r="1.5" fill="#43342E"/><circle cx="26" cy="35.5" r="1.5" fill="#43342E"/>
        <circle cx="38" cy="36.5" r="1.5" fill="#43342E"/><circle cx="44" cy="36.5" r="1.5" fill="#43342E"/>
        <path d="M21 39Q23 41 25 39M39 40Q41 42 43 40" fill="none" stroke="#43342E" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M28.5 16C28.5 13.5 32 13.5 32 16C32 13.5 35.5 13.5 35.5 16C35.5 19 32 21.5 32 21.5C32 21.5 28.5 19 28.5 16Z" fill="#FF5C7A" stroke="#43342E" stroke-width="1.4"/>`;
    } else if (role === 'family4') {
      portrait = `
        <circle cx="22" cy="26" r="8.8" fill="#FFE5D6" stroke="#43342E" stroke-width="1.8"/>
        <path d="M13.2 24C14 16 30 16 30.8 24Z" fill="#4A3B32" stroke="#43342E" stroke-width="1.5"/>
        <circle cx="42" cy="26" r="8.8" fill="#FFE5D6" stroke="#43342E" stroke-width="1.8"/>
        <path d="M33.2 24C34 16 50 16 50.8 24Z" fill="#8B4513" stroke="#43342E" stroke-width="1.5"/>
        <circle cx="32" cy="42" r="9.6" fill="#FFE5D6" stroke="#43342E" stroke-width="1.9"/>
        <path d="M23 39C24 32 40 32 41 39Z" fill="#38BDF8" stroke="#43342E" stroke-width="1.6"/>
        <line x1="27" y1="32" x2="37" y2="32" stroke="#FF6B8B" stroke-width="2.4" stroke-linecap="round"/>
        <circle cx="29" cy="42" r="1.5" fill="#43342E"/><circle cx="35" cy="42" r="1.5" fill="#43342E"/>
        <path d="M29 45.5Q32 48 35 45.5" fill="none" stroke="#43342E" stroke-width="1.6" stroke-linecap="round"/>`;
    } else if (role === 'elderly') {
      portrait = `
        <circle cx="23" cy="36" r="9.8" fill="#FFE5D6" stroke="#43342E" stroke-width="1.8"/>
        <ellipse cx="23" cy="26.5" rx="12.5" ry="3.2" fill="#FCD34D" stroke="#43342E" stroke-width="1.5"/>
        <path d="M15.5 26.5C16 19.5 30 19.5 30.5 26.5Z" fill="#FDE68A" stroke="#43342E" stroke-width="1.5"/>
        <circle cx="41.5" cy="36" r="9.5" fill="#FFE5D6" stroke="#43342E" stroke-width="1.8"/>
        <circle cx="42" cy="23.5" r="4.2" fill="#F3F4F6" stroke="#43342E" stroke-width="1.5"/>
        <path d="M32 34C32.5 25 50.5 25 51 34Z" fill="#F3F4F6" stroke="#43342E" stroke-width="1.5"/>
        <circle cx="20" cy="36.5" r="2.4" fill="none" stroke="#43342E" stroke-width="1.4"/>
        <circle cx="26" cy="36.5" r="2.4" fill="none" stroke="#43342E" stroke-width="1.4"/>
        <path d="M38.5 36Q40 34.2 41.5 36M43 36Q44.5 34.2 46 36" fill="none" stroke="#43342E" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M39.5 40Q42 42 44.5 40" fill="none" stroke="#43342E" stroke-width="1.4" stroke-linecap="round"/>`;
    } else if (role === 'hikikomori') {
      portrait = `
        <path d="M13 58C14 42 21 36 32 36C43 36 50 42 51 58Z" fill="#581C87" stroke="#43342E" stroke-width="2"/>
        <circle cx="32" cy="33" r="15" fill="#6D28D9" stroke="#43342E" stroke-width="2"/>
        <ellipse cx="32" cy="36" rx="11" ry="9.5" fill="#F5F3FF" stroke="#43342E" stroke-width="1.6"/>
        <circle cx="27.5" cy="35" r="1.9" fill="#43342E"/>
        <circle cx="36.5" cy="35" r="1.9" fill="#43342E"/>
        <path d="M25 37.8Q27.5 39.2 30 37.8M34 37.8Q36.5 39.2 39 37.8" fill="none" stroke="#7E22CE" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M29.5 41Q32 39.8 34.5 41" fill="none" stroke="#43342E" stroke-width="1.5" stroke-linecap="round"/>`;
    } else {
      portrait = `
        <path d="M15 58C16 45 23 41 32 41C41 41 48 45 49 58Z" fill="#1E3A8A" stroke="#43342E" stroke-width="2"/>
        <polygon points="32,42 34.5,48 32,55 29.5,48" fill="#FF5C7A" stroke="#43342E" stroke-width="1.2"/>
        <circle cx="32" cy="33" r="11.5" fill="#FFE5D6" stroke="#43342E" stroke-width="2"/>
        <path d="M19 26C19.5 17 44.5 17 45 26L42.5 29H21.5L19 26Z" fill="#2563EB" stroke="#43342E" stroke-width="1.8"/>
        <rect x="21" y="26.2" width="22" height="2.6" rx="1.2" fill="#FACC15" stroke="#43342E" stroke-width="1.1"/>
        <circle cx="27.5" cy="34" r="1.8" fill="#43342E"/><circle cx="36.5" cy="34" r="1.8" fill="#43342E"/>
        <path d="M29 38.5Q32 41 35 38.5" fill="none" stroke="#43342E" stroke-width="1.6" stroke-linecap="round"/>`;
    }

    return `
      <svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="shrink-0 select-none">
        <defs>
          <linearGradient id="${uid}_abg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${bg1}"/>
            <stop offset="100%" stop-color="${bg2}"/>
          </linearGradient>
          <clipPath id="${uid}_aclip"><rect x="7" y="7" width="50" height="50" rx="14"/></clipPath>
        </defs>
        <!-- 우표 타공 스티치 프레임 (48x48 Stamp Badge) -->
        <rect x="3" y="3" width="58" height="58" rx="17" fill="#FFFDF9" stroke="#D9B09E" stroke-width="2"/>
        <rect x="5" y="5" width="54" height="54" rx="15.5" fill="none" stroke="#E5B8A8" stroke-width="1.5" stroke-dasharray="3.2 2.6"/>
        <rect x="7" y="7" width="50" height="50" rx="14" fill="url(#${uid}_abg)" stroke="#43342E" stroke-width="1.9"/>
        <g clip-path="url(#${uid}_aclip)">${portrait}</g>
      </svg>`;
  }

  // 4) 건물·시설·상가 외곽선 미니 일러스트 배지
  let miniArt = '';
  switch (kind) {
    case 'infra_elevator':
      miniArt = `
        <rect x="9" y="6" width="26" height="32" rx="6" fill="#BAE6FD" stroke="#43342E" stroke-width="2"/>
        <rect x="13" y="12" width="18" height="22" rx="3" fill="#FFFDF9" stroke="#43342E" stroke-width="1.6"/>
        <line x1="22" y1="12" x2="22" y2="34" stroke="#43342E" stroke-width="1.6"/>
        <circle cx="19" cy="9" r="1.5" fill="#FACC15"/><circle cx="25" cy="9" r="1.5" fill="#FF6B8B"/>`;
      break;
    case 'infra_recycling':
      miniArt = `
        <rect x="7" y="16" width="9" height="18" rx="3" fill="#60A5FA" stroke="#43342E" stroke-width="1.8"/>
        <rect x="17.5" y="16" width="9" height="18" rx="3" fill="#34D399" stroke="#43342E" stroke-width="1.8"/>
        <rect x="28" y="16" width="9" height="18" rx="3" fill="#FBBF24" stroke="#43342E" stroke-width="1.8"/>
        <path d="M5 13H39L36 9H8L5 13Z" fill="#A7F3D0" stroke="#43342E" stroke-width="1.8" stroke-linejoin="round"/>`;
      break;
    case 'infra_parcel':
      miniArt = `
        <rect x="9" y="7" width="26" height="30" rx="5" fill="#FF8FA3" stroke="#43342E" stroke-width="2"/>
        <rect x="13" y="11" width="8" height="7" rx="1.5" fill="#FFFDF9" stroke="#43342E" stroke-width="1.4"/>
        <rect x="23" y="11" width="8" height="7" rx="1.5" fill="#BAE6FD" stroke="#43342E" stroke-width="1.4"/>
        <rect x="13" y="21" width="18" height="11" rx="2" fill="#FDE68A" stroke="#43342E" stroke-width="1.5"/>`;
      break;
    case 'infra_rooftop':
      miniArt = `
        <rect x="7" y="25" width="30" height="10" rx="4" fill="#E6A15C" stroke="#43342E" stroke-width="1.9"/>
        <circle cx="16" cy="18" r="7" fill="#4ADE80" stroke="#43342E" stroke-width="1.8"/>
        <circle cx="28" cy="17" r="7.5" fill="#FFB3C6" stroke="#43342E" stroke-width="1.8"/>
        <circle cx="22" cy="13" r="6" fill="#86EFAC" stroke="#43342E" stroke-width="1.8"/>`;
      break;
    case 'shop_mart':
      miniArt = `
        <rect x="7" y="15" width="30" height="21" rx="4" fill="#FFFDF9" stroke="#43342E" stroke-width="2"/>
        <path d="M5 16L9 9H35L39 16Z" fill="#E05A47" stroke="#43342E" stroke-width="1.9" stroke-linejoin="round"/>
        <rect x="12" y="22" width="9" height="14" rx="2" fill="#BAE6FD" stroke="#43342E" stroke-width="1.5"/>
        <rect x="24" y="22" width="8" height="8" rx="2" fill="#FDE68A" stroke="#43342E" stroke-width="1.5"/>`;
      break;
    case 'shop_wash':
      miniArt = `
        <rect x="9" y="8" width="26" height="29" rx="5" fill="#FFFDF9" stroke="#43342E" stroke-width="2"/>
        <rect x="9" y="8" width="26" height="7" rx="3" fill="#60A5FA" stroke="#43342E" stroke-width="1.8"/>
        <circle cx="22" cy="25" r="7.5" fill="#BAE6FD" stroke="#43342E" stroke-width="1.8"/>
        <path d="M16 25Q19 22 22 25T28 25" fill="none" stroke="#0284C7" stroke-width="2"/>`;
      break;
    case 'dev_solar':
      miniArt = `
        <circle cx="31" cy="11" r="4.8" fill="#FACC15" stroke="#43342E" stroke-width="1.5"/>
        <polygon points="8,18 27,15 33,30 6,33" fill="#3B82F6" stroke="#43342E" stroke-width="1.8" stroke-linejoin="round"/>
        <line x1="18" y1="16.5" x2="19.5" y2="31.5" stroke="#BAE6FD" stroke-width="1.5"/>
        <line x1="7" y1="25.5" x2="30" y2="22.5" stroke="#BAE6FD" stroke-width="1.5"/>`;
      break;
    case 'dev_farm':
      miniArt = `
        <rect x="7" y="26" width="30" height="10" rx="3" fill="#C6834B" stroke="#43342E" stroke-width="1.8"/>
        <path d="M22 27C16 27 12 20 12 14.5C12 10.5 16 9 22 9C28 9 32 10.5 32 14.5C32 20 28 27 22 27Z" fill="#FF6B8B" stroke="#43342E" stroke-width="1.8"/>
        <path d="M15 10C18 6.5 21 7 22 9.5C23 7 26 6.5 29 10Z" fill="#34D399" stroke="#43342E" stroke-width="1.4"/>`;
      break;
    case 'dev_park':
      miniArt = `
        <rect x="19" y="24" width="6" height="12" rx="2" fill="#8B5630" stroke="#43342E" stroke-width="1.6"/>
        <circle cx="22" cy="16" r="10" fill="#FFB3C6" stroke="#43342E" stroke-width="1.8"/>
        <circle cx="15" cy="19" r="6.5" fill="#FFC2D6" stroke="#43342E" stroke-width="1.5"/>
        <circle cx="29" cy="19" r="6.5" fill="#FFC2D6" stroke="#43342E" stroke-width="1.5"/>`;
      break;
    case 'dev_bakery':
      miniArt = `
        <path d="M11 26C11 19 16 15 22 15C28 15 33 19 33 26Z" fill="#FBBF24" stroke="#43342E" stroke-width="1.8"/>
        <rect x="12" y="24" width="20" height="11" rx="4" fill="#FFFDF9" stroke="#43342E" stroke-width="1.8"/>
        <path d="M32 26H36C37.5 26 37.5 31 36 31H32" fill="none" stroke="#43342E" stroke-width="1.8"/>
        <path d="M18 12Q19.5 9 18 6M25 12Q26.5 9 25 6" fill="none" stroke="#D97706" stroke-width="1.6" stroke-linecap="round"/>`;
      break;
    default:
      miniArt = `
        <rect x="8" y="16" width="28" height="19" rx="4" fill="#FFFDF9" stroke="#43342E" stroke-width="2"/>
        <path d="M5 18L22 7L39 18Z" fill="#E05A47" stroke="#43342E" stroke-width="2" stroke-linejoin="round"/>
        <rect x="19" y="23" width="6" height="12" rx="2" fill="#E6A15C" stroke="#43342E" stroke-width="1.5"/>`;
      break;
  }

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" class="shrink-0 select-none">
      <rect x="2" y="2" width="40" height="40" rx="13" fill="#FFF8F0" stroke="#E6CCB2" stroke-width="1.8"/>
      ${miniArt}
    </svg>`;
}

function createHouseholdAvatarSVG(type, size = 48) {
  return createNotebookArtworkSVG(`avatar_${type}`, size);
}

// --------------------- 핵심 게임 밸런스 및 무(無)줄글 구조화 데이터 ---------------------
const GAME_BALANCE = {
  roomWidth: 5.5,
  roomDepth: 4.6,
  wallHeight: 2.6,
  evictionGraceSec: 30,
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
  '드림 타워',
  '골든 스테이트',
  '스타 팰리스',
  '햇살 캐슬'
];

const INITIAL_ISLAND_LOTS = [
  { lotId: 'lot_main', name: '수변 1번지', x: -4.8, z: -4.2, landPrice: 0, owned: true, devType: 'mixed_1', title: '해피 미니미 타운 1차' },
  { lotId: 'lot_solar', name: '햇살언덕 2번지', x: -18.6, z: -3.5, landPrice: 320, owned: false, devType: null, title: null },
  { lotId: 'lot_farm', name: '시냇가 3번지', x: -14.2, z: 10.6, landPrice: 420, owned: false, devType: null, title: null },
  { lotId: 'lot_east', name: '아치교 4번지', x: 13.8, z: -4.5, landPrice: 680, owned: false, devType: null, title: null },
  { lotId: 'lot_south_e', name: '벚꽃변 5번지', x: 13.2, z: 10.4, landPrice: 1200, owned: false, devType: null, title: null },
  { lotId: 'lot_north', name: '전망대 6번지', x: 4.5, z: -16.8, landPrice: 2400, owned: false, devType: null, title: null }
];

// 부지 개발 카탈로그 (줄글 삭제 -> 키워드 칩 배열화)
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
    rentSynergyPct: 5,
    chips: [
      { ico: 'solar_panel', text: '9초 +52만', tone: 'gold' },
      { ico: 'sparkle_star', text: '시너지 +5%', tone: 'mint' }
    ]
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
    rentSynergyPct: 8,
    chips: [
      { ico: 'berry_farm', text: '11초 +74만', tone: 'coral' },
      { ico: 'sparkle_star', text: '시너지 +8%', tone: 'mint' }
    ]
  },
  sakura_park: {
    type: 'sakura_park',
    name: '벚꽃 힐링공원',
    svgIcon: 'paw_print',
    artKey: 'dev_park',
    buildCost: 340,
    isResidential: false,
    cycleSec: 12,
    cycleProfit: 38,
    rentSynergyPct: 15,
    chips: [
      { ico: 'heart_gauge', text: '소음 진정', tone: 'coral' },
      { ico: 'sparkle_star', text: '월세 +15%', tone: 'mint' }
    ]
  },
  bakery_cafe: {
    type: 'bakery_cafe',
    name: '달콤 다방',
    svgIcon: 'coffee_cup',
    artKey: 'dev_bakery',
    buildCost: 460,
    isResidential: false,
    cycleSec: 10,
    cycleProfit: 92,
    rentSynergyPct: 12,
    chips: [
      { ico: 'coffee_cup', text: '10초 +92만', tone: 'gold' },
      { ico: 'sparkle_star', text: '시너지 +12%', tone: 'mint' }
    ]
  },
  mixed_2: {
    type: 'mixed_2',
    name: '럭키 팰리스',
    svgIcon: 'red_house',
    artKey: 'shop_mart',
    buildCost: 780,
    isResidential: true,
    baseRoomRent: 54,
    rentSynergyPct: 10,
    chips: [
      { ico: 'red_house', text: '6호실 빌딩', tone: 'sky' },
      { ico: 'sparkle_star', text: '시너지 +10%', tone: 'mint' }
    ]
  },
  mixed_1: {
    type: 'mixed_1',
    name: '해피 미니미 타운 1차',
    svgIcon: 'red_house',
    artKey: 'shop_mart',
    buildCost: 0,
    isResidential: true,
    baseRoomRent: 34,
    rentSynergyPct: 0,
    chips: [
      { ico: 'red_house', text: '6호실 빌딩', tone: 'coral' },
      { ico: 'coin_stack', text: '상가 +28만', tone: 'gold' }
    ]
  }
};

// 공용 인프라 카탈로그 (줄글 삭제 -> 키워드 칩화)
const PUBLIC_INFRA_CATALOG = {
  elevator: {
    key: 'elevator',
    name: '유리 엘리베이터',
    svgIcon: 'elevator',
    artKey: 'infra_elevator',
    cost: 160,
    rentBonusPct: 10,
    chips: [
      { ico: 'elevator', text: '2층 필수', tone: 'sky' },
      { ico: 'coin_stack', text: '월세 +10%', tone: 'mint' }
    ]
  },
  recycling: {
    key: 'recycling',
    name: '클린 분리수거장',
    svgIcon: 'recycle_bin',
    artKey: 'infra_recycling',
    cost: 110,
    rentBonusPct: 6,
    chips: [
      { ico: 'broom_clean', text: '청결 유지', tone: 'mint' },
      { ico: 'coin_stack', text: '월세 +6%', tone: 'gold' }
    ]
  },
  parcel_box: {
    key: 'parcel_box',
    name: '스마트 택배함',
    svgIcon: 'relocate_move',
    artKey: 'infra_parcel',
    cost: 95,
    rentBonusPct: 6,
    chips: [
      { ico: 'relocate_move', text: '안심 택배', tone: 'coral' },
      { ico: 'coin_stack', text: '월세 +6%', tone: 'gold' }
    ]
  },
  rooftop_garden: {
    key: 'rooftop_garden',
    name: '옥상 루프탑가든',
    svgIcon: 'berry_farm',
    artKey: 'infra_rooftop',
    cost: 210,
    rentBonusPct: 12,
    chips: [
      { ico: 'heart_gauge', text: '행복도 UP', tone: 'coral' },
      { ico: 'coin_stack', text: '월세 +12%', tone: 'mint' }
    ]
  }
};

// [요구사항 3] 호텔식 3자리 심플 넘버링 ('호' 제거: 101, 102, 103, 201, 202, 203)
const ROOM_SLOTS_TEMPLATE = [
  { subId: '101', name: '101', floor: 1, col: 0, lx: -5.6, ly: 3.05, lz: 0.2, cycleSec: 9.5, unlockCost: 0, defaultUnlocked: true },
  { subId: '102', name: '102', floor: 1, col: 1, lx: 0.0, ly: 3.05, lz: 0.2, cycleSec: 11.0, unlockCost: 0, defaultUnlocked: true },
  { subId: '103', name: '103', floor: 1, col: 2, lx: 5.6, ly: 3.05, lz: 0.2, cycleSec: 10.2, unlockCost: 130, defaultUnlocked: false },
  { subId: '201', name: '201', floor: 2, col: 0, lx: -5.6, ly: 5.85, lz: 0.2, cycleSec: 11.8, unlockCost: 200, defaultUnlocked: false },
  { subId: '202', name: '202', floor: 2, col: 1, lx: 0.0, ly: 5.85, lz: 0.2, cycleSec: 10.6, unlockCost: 280, defaultUnlocked: false },
  { subId: '203', name: '203', floor: 2, col: 2, lx: 5.6, ly: 5.85, lz: 0.2, cycleSec: 11.4, unlockCost: 380, defaultUnlocked: false }
];

const ROOM_INTERIOR_TIERS = [
  { level: 0, name: '기본 시멘트룸', cost: 0, rentAdd: 0, chip: '기본 마감' },
  { level: 1, name: '파스텔 스트라이프', cost: 65, rentAdd: 28, chip: '월세 +28만' },
  { level: 2, name: '코지 헤링본', cost: 160, rentAdd: 68, chip: '월세 +68만' },
  { level: 3, name: '로얄 부티크', cost: 340, rentAdd: 135, chip: '세트 +25%' }
];

// [요구사항 1] 줄글 전면 폐기 -> 아이콘+키워드 칩(traitBadges) & 스탯 수치(noiseLv) 중심 도감 데이터
const HOUSEHOLD_TYPES = {
  student: {
    type: 'student',
    label: '대학생',
    accentHex: '#3B82F6',
    memberCount: 1,
    minRent: 58,
    maxRent: 108,
    noiseOutput: 48,
    noiseLv: 2,
    noiseSensitivity: 25,
    odorSensitivity: 45,
    needsElevator: false,
    needsRecycling: false,
    isHoarder: false,
    traitBadges: [
      { ico: 'guitar_note', label: '야행성 소음', tone: 'sky' },
      { ico: 'coin_stack', label: '가성비 중시', tone: 'gold' }
    ],
    happyQuotes: [
      '듀얼 모니터 빛이 영롱해서 인강이 쏙쏙 들어와요!',
      '1층 해피마트 24가 바로 아래라 야식 최고예요!',
      '헤링본 마루 위에서 기타 치니 소리가 따뜻해요~'
    ],
    noiseVictimQuotes: ['윗방이 쿵쿵거려 공부 집중이 안 돼요!'],
    odorVictimQuotes: ['옆방에서 퀴퀴한 냄새가 복도까지 나요..'],
    infraQuotes: ['스마트 택배함이 있으면 훨씬 편할 텐데요!']
  },
  newlywed: {
    type: 'newlywed',
    label: '신혼부부',
    accentHex: '#EC4899',
    memberCount: 2,
    minRent: 120,
    maxRent: 215,
    noiseOutput: 18,
    noiseLv: 1,
    noiseSensitivity: 58,
    odorSensitivity: 78,
    needsElevator: false,
    needsRecycling: true,
    isHoarder: false,
    traitBadges: [
      { ico: 'heart_gauge', label: '핑크 스윗홈', tone: 'coral' },
      { ico: 'recycle_bin', label: '분리수거 중시', tone: 'mint' }
    ],
    happyQuotes: [
      '아일랜드 식탁 모닝커피 향기 너무 좋다!',
      '파스텔 벽지 색감이 동화 속 신혼집 같아요!',
      '1층 뽀송 워시 덕분에 이불 빨래가 뽀송해요~'
    ],
    noiseVictimQuotes: ['윗집 발망치 소리에 단잠을 다 설쳤어요!'],
    odorVictimQuotes: ['옆집 배달 쓰레기 냄새가 너무 심해요!'],
    infraQuotes: ['분리수거장이 아직 없어 재활용이 불편해요~']
  },
  family4: {
    type: 'family4',
    label: '4인 가족',
    accentHex: '#059669',
    memberCount: 4,
    minRent: 180,
    maxRent: 320,
    noiseOutput: 88,
    noiseLv: 3,
    noiseSensitivity: 30,
    odorSensitivity: 75,
    needsElevator: true,
    needsRecycling: true,
    isHoarder: false,
    traitBadges: [
      { ico: 'sound_wave', label: '발망치 주의', tone: 'coral' },
      { ico: 'coin_stack', label: '고수익 세대', tone: 'mint' }
    ],
    happyQuotes: [
      '아이들이 2층 침대 사다리 타며 신나해요!',
      '온 가족이 도란도란 저녁 먹는 시간이 행복해요~',
      '시냇물 다리 풍경이 참 평화로워요!'
    ],
    noiseVictimQuotes: ['애들아 살살 걸어라~ 아랫집 놀라시겠다!'],
    odorVictimQuotes: ['옆방 악취 때문에 창문 환기를 못 해요!'],
    infraQuotes: ['아이들 데리고 2층 계단 오르기가 숨차네요!']
  },
  elderly: {
    type: 'elderly',
    label: '노부부',
    accentHex: '#D97706',
    memberCount: 2,
    minRent: 110,
    maxRent: 185,
    noiseOutput: 8,
    noiseLv: 1,
    noiseSensitivity: 92,
    odorSensitivity: 90,
    needsElevator: true,
    needsRecycling: false,
    isHoarder: false,
    traitBadges: [
      { ico: 'elevator', label: '승강기 필수', tone: 'gold' },
      { ico: 'sound_wave', label: '소음 민감', tone: 'sky' }
    ],
    happyQuotes: [
      '흔들의자에 앉아 녹차 한 잔 마시니 평온하구려~',
      '분재에 예쁜 새순이 돋았어요, 햇살이 고운 집이야!',
      '유리 엘리베이터 덕분에 마실 나가기 참 편하구먼!'
    ],
    noiseVictimQuotes: ['윗집 발소리 때문에 머리가 지끈거려요!'],
    odorVictimQuotes: ['옆방 썩은 냄새 때문에 못 살겠소!'],
    infraQuotes: ['엘리베이터 없이는 2층 계단 못 다니겠소..']
  },
  hikikomori: {
    type: 'hikikomori',
    label: '히키코모리',
    accentHex: '#7C3AED',
    memberCount: 1,
    minRent: 135,
    maxRent: 235,
    noiseOutput: 15,
    noiseLv: 1,
    noiseSensitivity: 20,
    odorSensitivity: 0,
    needsElevator: false,
    needsRecycling: false,
    isHoarder: true,
    traitBadges: [
      { ico: 'coin_stack', label: '월세 칼입금', tone: 'gold' },
      { ico: 'broom_clean', label: '쓰레기방 주의', tone: 'coral' }
    ],
    happyQuotes: [
      '배달 시켜야지... 모니터 3대가 내 세상이야...',
      '외주 정산 완료... 이번 달 월세도 칼입금...',
      '피자 박스는 저기 탑 위에 차곡차곡 쌓아두자...'
    ],
    cleanedGrumbleQuote: '아, 치우지 말라니까요... 다 쓸 데 있는 건데...',
    evictedQuote: '칫... 월세 안 밀렸는데... 짐 싸서 나갑니다...'
  }
};

const FAMILY_LAST_NAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '송', '유', '홍'];
const GIVEN_NAMES = ['민준', '서연', '도윤', '지우', '하은', '지호', '수빈', '현우', '소율', '연우', '다은', '태오', '영숙', '철수', '순자', '만수'];

const CARE_BUBBLE_TYPES = [
  { id: 'pipe_fix', svgIcon: 'soundproof_hammer', label: '배관 점검', cashReward: 42, toastMsg: '배관 점검 완료! +42만' },
  { id: 'parcel_deliver', svgIcon: 'relocate_move', label: '택배 전달', cashReward: 45, toastMsg: '택배 전달 완료! +45만' },
  { id: 'street_sweep', svgIcon: 'broom_clean', label: '보도 청소', cashReward: 50, toastMsg: '보도 청소 완료! +50만' },
  { id: 'smart_light', svgIcon: 'gold_key', label: '조명 교체', cashReward: 48, toastMsg: '무드조명 교체! +48만' }
];

// [요구사항 1] 무(無)텍스트 1줄 퀘스트 카드 데이터: 아이콘 + 핵심 키워드 + 진행바(cur/max) + 보상
const QUEST_LIST = [
  {
    id: 'mq1',
    icon: 'sparkle_star',
    title: '101호 인테리어 Lv.1 시공',
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
    icon: 'gold_key',
    title: '101호 첫 입주 계약 체결',
    reward: 180,
    focusLot: 'lot_main',
    focusSubRoom: '101',
    progress: (st) => ({ cur: st.buildings.lot_main?.rooms.find((x) => x.subId === '101')?.household ? 1 : 0, max: 1 }),
    check: (st) => !!st.buildings.lot_main?.rooms.find((x) => x.subId === '101')?.household
  },
  {
    id: 'mq3',
    icon: 'red_house',
    title: '입주 세대 2가구 달성',
    reward: 240,
    focusLot: 'lot_main',
    focusSubRoom: '102',
    progress: (st) => {
      const cnt = st.buildings.lot_main?.rooms.filter((x) => !!x.household).length || 0;
      return { cur: Math.min(2, cnt), max: 2 };
    },
    check: (st) => (st.buildings.lot_main?.rooms.filter((x) => !!x.household).length || 0) >= 2
  },
  {
    id: 'mq4',
    icon: 'recycle_bin',
    title: '건물 공용시설 1종 시공',
    reward: 260,
    openTab: 'infra',
    progress: (st) => {
      const inf = st.buildings.lot_main?.infra || {};
      const cnt = Object.values(inf).filter(Boolean).length;
      return { cur: Math.min(1, cnt), max: 1 };
    },
    check: (st) => {
      const inf = st.buildings.lot_main?.infra || {};
      return inf.recycling || inf.parcel_box || inf.elevator || inf.rooftop_garden;
    }
  },
  {
    id: 'mq5',
    icon: 'elevator',
    title: '201호 개방 & 엘리베이터 시공',
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
    icon: 'solar_panel',
    title: '2번지 신규 부지 착공',
    reward: 450,
    focusLot: 'lot_solar',
    progress: (st) => ({ cur: Math.min(2, st.lots.filter((l) => l.owned).length), max: 2 }),
    check: (st) => st.lots.filter((l) => l.owned).length >= 2
  },
  {
    id: 'mq7',
    icon: 'berry_farm',
    title: '3번지 도시농장 확장',
    reward: 550,
    focusLot: 'lot_farm',
    progress: (st) => ({ cur: Math.min(3, st.lots.filter((l) => l.owned).length), max: 3 }),
    check: (st) => st.lots.filter((l) => l.owned).length >= 3
  },
  {
    id: 'mq8',
    icon: 'broom_clean',
    title: '청소·방음·중재 케어 1회',
    reward: 480,
    openTab: 'tenants',
    progress: (st) => ({ cur: Math.min(1, (st.stats.crisisResolved || 0) + (st.stats.evictions || 0)), max: 1 }),
    check: (st) => st.stats.crisisResolved >= 1 || st.stats.evictions >= 1
  },
  {
    id: 'mq9',
    icon: 'manager_cap',
    title: '1층 건물 지배인 선임',
    reward: 600,
    openTab: 'manager',
    progress: (st) => ({ cur: Object.values(st.buildings).some((b) => b.manager.hired) ? 1 : 0, max: 1 }),
    check: (st) => Object.values(st.buildings).some((b) => b.manager.hired)
  },
  {
    id: 'mq10',
    icon: 'crown_badge',
    title: '타운 5개 부지 완공',
    reward: 1500,
    focusLot: 'lot_east',
    progress: (st) => ({ cur: Math.min(5, st.lots.filter((l) => l.owned).length), max: 5 }),
    check: (st) => st.lots.filter((l) => l.owned).length >= 5
  }
];

window.createCustomSVGIcon = createCustomSVGIcon;
window.createNotebookArtworkSVG = createNotebookArtworkSVG;
window.createHouseholdAvatarSVG = createHouseholdAvatarSVG;
window.GAME_BALANCE = GAME_BALANCE;
window.BUILDING_NAME_PRESETS = BUILDING_NAME_PRESETS;
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
