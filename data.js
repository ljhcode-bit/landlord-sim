// =========================================================
// 【갓물주 라이프 3D: 미니미 타운】 데이터 & 다꾸 수첩 SVG 일러스트 엔진 (data.js)
// - createCustomSVGIcon: HUD·핀용 입체 벡터 아이콘 18종
// - createNotebookArtworkSVG: 다이어리 수첩 전용 외곽선 또렷한 일러스트 에셋
//   (44x44 우표 초상화 6종, '참 잘했어요! 완료 도장', 스프링 제본 고리, 시설·상가 미니 일러스트)
// - 세대 상성(층간소음/히키코모리 쓰레기방 악취), 관리인 ROI, 공용시설, 아일랜드 부지 데이터
// =========================================================

let svgUidSeq = 0;

// 1. HUD 및 월드 핀용 입체 그라데이션 벡터 아이콘 생성기
function createCustomSVGIcon(name, size = 24) {
  const uid = `ico_${name}_${++svgUidSeq}`;
  const commonDefs = `
    <defs>
      <filter id="${uid}_sh" x="-20%" y="-20%" width="145%" height="155%">
        <feDropShadow dx="0" dy="1.8" stdDeviation="1.2" flood-color="#43342E" flood-opacity="0.26"/>
      </filter>
      <linearGradient id="${uid}_gold" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#FFF3B0"/>
        <stop offset="48%" stop-color="#FACC15"/>
        <stop offset="100%" stop-color="#EA8D00"/>
      </linearGradient>
      <linearGradient id="${uid}_coral" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#FFB3C1"/>
        <stop offset="55%" stop-color="#FF758F"/>
        <stop offset="100%" stop-color="#E63963"/>
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
        <stop offset="100%" stop-color="#9C5A25"/>
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
          <ellipse cx="13" cy="21.5" rx="8.5" ry="4" fill="url(#${uid}_gold)" stroke="#5A463C" stroke-width="1.3"/>
          <ellipse cx="13" cy="18" rx="8.5" ry="4" fill="#D97706"/>
          <ellipse cx="13" cy="16" rx="8.5" ry="4" fill="url(#${uid}_gold)" stroke="#5A463C" stroke-width="1.3"/>
          <circle cx="20.5" cy="14.5" r="8.2" fill="url(#${uid}_gold)" stroke="#5A463C" stroke-width="1.4"/>
          <circle cx="20.5" cy="14.5" r="5.6" fill="none" stroke="#FFFBEB" stroke-width="1.2" opacity="0.85"/>
          <path d="M18.2 12.2L19.5 17L20.5 13.6L21.5 17L22.8 12.2" fill="none" stroke="#78350F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          <ellipse cx="17.8" cy="10.2" rx="2.5" ry="1.1" fill="#FFFFFF" opacity="0.8" transform="rotate(-25 17.8 10.2)"/>
        </g>`;
      break;

    case 'red_house':
      body = `
        <g filter="url(#${uid}_sh)">
          <rect x="20" y="6" width="4" height="7" rx="1.5" fill="url(#${uid}_wood)" stroke="#5A463C" stroke-width="1.2"/>
          <rect x="6.5" y="14" width="19" height="13" rx="3.5" fill="url(#${uid}_cream)" stroke="#5A463C" stroke-width="1.4"/>
          <path d="M3.5 15.5L16 5.2L28.5 15.5C29.3 16.2 28.8 17.5 27.7 17.5H4.3C3.2 17.5 2.7 16.2 3.5 15.5Z" fill="url(#${uid}_coral)" stroke="#5A463C" stroke-width="1.4"/>
          <rect x="13.5" y="19.5" width="5" height="7.5" rx="2" fill="url(#${uid}_wood)" stroke="#5A463C" stroke-width="1.1"/>
          <rect x="8.5" y="18.5" width="3.8" height="3.8" rx="1" fill="url(#${uid}_sky)" stroke="#5A463C" stroke-width="1"/>
          <rect x="19.8" y="18.5" width="3.8" height="3.8" rx="1" fill="url(#${uid}_sky)" stroke="#5A463C" stroke-width="1"/>
        </g>`;
      break;

    case 'gold_key':
      body = `
        <g filter="url(#${uid}_sh)">
          <circle cx="11" cy="12" r="6.5" fill="url(#${uid}_gold)" stroke="#5A463C" stroke-width="1.4"/>
          <circle cx="11" cy="12" r="2.6" fill="#FFFDF9" stroke="#5A463C" stroke-width="1.2"/>
          <path d="M16.5 14.5L26.5 22.5L24.2 25.5L22 23.8L23.5 21.8L20.8 19.8L19.2 21.8L17 20L18.8 17.8" fill="url(#${uid}_gold)" stroke="#5A463C" stroke-width="1.3" stroke-linejoin="round"/>
        </g>`;
      break;

    case 'heart_gauge':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M16 26.5C16 26.5 4.5 19.2 4.5 11.4C4.5 7.4 7.7 4.5 11.3 4.5C13.6 4.5 15.2 5.7 16 7.3C16.8 5.7 18.4 4.5 20.7 4.5C24.3 4.5 27.5 7.4 27.5 11.4C27.5 19.2 16 26.5 16 26.5Z" fill="url(#${uid}_coral)" stroke="#5A463C" stroke-width="1.4"/>
          <ellipse cx="10.5" cy="9.4" rx="3.2" ry="1.7" fill="#FFFFFF" opacity="0.72" transform="rotate(-28 10.5 9.4)"/>
        </g>`;
      break;

    case 'town_notebook':
      body = `
        <g filter="url(#${uid}_sh)">
          <rect x="22" y="7" width="4.5" height="4.5" rx="1.5" fill="url(#${uid}_coral)" stroke="#5A463C" stroke-width="1.1"/>
          <rect x="22" y="13" width="4.5" height="4.5" rx="1.5" fill="url(#${uid}_mint)" stroke="#5A463C" stroke-width="1.1"/>
          <rect x="22" y="19" width="4.5" height="4.5" rx="1.5" fill="url(#${uid}_sky)" stroke="#5A463C" stroke-width="1.1"/>
          <rect x="6" y="4" width="17.5" height="24" rx="4.5" fill="url(#${uid}_cream)" stroke="#5A463C" stroke-width="1.5"/>
          <rect x="6" y="4" width="4.4" height="24" rx="2" fill="url(#${uid}_coral)" stroke="#5A463C" stroke-width="1.2"/>
          <rect x="12.5" y="9" width="8" height="3.2" rx="1.5" fill="url(#${uid}_gold)"/>
          <rect x="12.5" y="14.5" width="7" height="2.4" rx="1.2" fill="#D4A373"/>
          <rect x="12.5" y="19" width="8" height="2.4" rx="1.2" fill="#E6CCB2"/>
        </g>`;
      break;

    case 'quest_trophy':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M8 8H5.5C4.5 8 4 9 4.3 10.5C4.8 13 6.8 14.8 9.2 15" fill="none" stroke="#5A463C" stroke-width="3.2" stroke-linecap="round"/>
          <path d="M8 8H5.5C4.5 8 4 9 4.3 10.5C4.8 13 6.8 14.8 9.2 15" fill="none" stroke="url(#${uid}_gold)" stroke-width="2" stroke-linecap="round"/>
          <path d="M24 8H26.5C27.5 8 28 9 27.7 10.5C27.2 13 25.2 14.8 22.8 15" fill="none" stroke="#5A463C" stroke-width="3.2" stroke-linecap="round"/>
          <path d="M24 8H26.5C27.5 8 28 9 27.7 10.5C27.2 13 25.2 14.8 22.8 15" fill="none" stroke="url(#${uid}_gold)" stroke-width="2" stroke-linecap="round"/>
          <path d="M8.5 5.5H23.5V12.5C23.5 17 20.1 20 16 20C11.9 20 8.5 17 8.5 12.5V5.5Z" fill="url(#${uid}_gold)" stroke="#5A463C" stroke-width="1.4"/>
          <rect x="14" y="19.5" width="4" height="4.5" rx="1" fill="url(#${uid}_gold)" stroke="#5A463C" stroke-width="1.2"/>
          <rect x="10" y="23.5" width="12" height="3.8" rx="1.9" fill="url(#${uid}_wood)" stroke="#5A463C" stroke-width="1.3"/>
          <polygon points="16,8.5 17.2,11.2 20,11.5 17.9,13.4 18.5,16.2 16,14.7 13.5,16.2 14.1,13.4 12,11.5 14.8,11.2" fill="#FFFBEB"/>
        </g>`;
      break;

    case 'manager_cap':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M5 17C5 11.5 9.8 7.5 16 7.5C22.2 7.5 27 11.5 27 17L24.5 20.5H7.5L5 17Z" fill="url(#${uid}_navy)" stroke="#43342E" stroke-width="1.4"/>
          <path d="M6.5 20C10.5 23.8 21.5 23.8 25.5 20L27 21.8C22 26.2 10 26.2 5 21.8L6.5 20Z" fill="#1E293B"/>
          <rect x="7.5" y="17.8" width="17" height="2.4" rx="1.2" fill="url(#${uid}_gold)"/>
          <circle cx="16" cy="13.2" r="2.6" fill="url(#${uid}_gold)" stroke="#43342E" stroke-width="1"/>
        </g>`;
      break;

    case 'megaphone':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M6 13.5L21.5 6.5V23.5L6 16.5V13.5Z" fill="url(#${uid}_coral)" stroke="#43342E" stroke-width="1.4" stroke-linejoin="round"/>
          <rect x="4" y="12.5" width="4" height="5.5" rx="2" fill="url(#${uid}_cream)" stroke="#43342E" stroke-width="1.3"/>
          <path d="M8.5 17.5L10.5 24.5C10.8 25.5 9.8 26.2 8.8 26L6.8 25C6 24.6 5.8 23.6 6.2 22.8L7 17" fill="url(#${uid}_gold)" stroke="#43342E" stroke-width="1.2"/>
          <ellipse cx="21.5" cy="15" rx="2.4" ry="8.5" fill="url(#${uid}_cream)" stroke="#43342E" stroke-width="1.3"/>
        </g>`;
      break;

    case 'broom_clean':
      body = `
        <g filter="url(#${uid}_sh)">
          <line x1="23.5" y1="4.5" x2="13.5" y2="17.5" stroke="#5A463C" stroke-width="4.4" stroke-linecap="round"/>
          <line x1="23.5" y1="4.5" x2="13.5" y2="17.5" stroke="url(#${uid}_wood)" stroke-width="2.8" stroke-linecap="round"/>
          <path d="M9.5 16L17.5 20.5L13.5 27.2C10.5 26.5 6.8 24 5.2 21.5L9.5 16Z" fill="url(#${uid}_gold)" stroke="#43342E" stroke-width="1.4" stroke-linejoin="round"/>
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
          <rect x="6" y="4" width="20" height="24" rx="4.5" fill="url(#${uid}_sky)" stroke="#43342E" stroke-width="1.4"/>
          <rect x="9" y="8" width="14" height="17" rx="2.5" fill="#FFFDF9" stroke="#43342E" stroke-width="1.1"/>
          <line x1="16" y1="8" x2="16" y2="25" stroke="#0284C7" stroke-width="1.5"/>
        </g>`;
      break;

    case 'recycle_bin':
      body = `
        <g filter="url(#${uid}_sh)">
          <rect x="7" y="6.5" width="18" height="3.5" rx="1.7" fill="url(#${uid}_mint)" stroke="#43342E" stroke-width="1.3"/>
          <path d="M8.5 10H23.5L21.8 26.5C21.7 27.3 21 28 20.2 28H11.8C11 28 10.3 27.3 10.2 26.5L8.5 10Z" fill="url(#${uid}_mint)" stroke="#43342E" stroke-width="1.4"/>
          <circle cx="16" cy="18.5" r="4" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="5 2.5"/>
        </g>`;
      break;

    case 'solar_panel':
      body = `
        <g filter="url(#${uid}_sh)">
          <circle cx="23.5" cy="7.5" r="4" fill="url(#${uid}_gold)" stroke="#43342E" stroke-width="1.1"/>
          <polygon points="6,13 21,11 25,23 4,25" fill="url(#${uid}_navy)" stroke="#43342E" stroke-width="1.4" stroke-linejoin="round"/>
          <line x1="13.5" y1="12" x2="14.5" y2="24" stroke="#BAE6FD" stroke-width="1.2"/>
          <line x1="5" y1="19" x2="23" y2="17" stroke="#BAE6FD" stroke-width="1.2"/>
        </g>`;
      break;

    case 'berry_farm':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M16 27.5C10.5 27.5 6.5 21 6.5 14.8C6.5 10.5 10.2 8.5 16 8.5C21.8 8.5 25.5 10.5 25.5 14.8C25.5 21 21.5 27.5 16 27.5Z" fill="url(#${uid}_coral)" stroke="#43342E" stroke-width="1.4"/>
          <path d="M10 9.5C12 6 15 6.5 16 9C17 6.5 20 6 22 9.5C19.5 11.2 12.5 11.2 10 9.5Z" fill="url(#${uid}_mint)" stroke="#43342E" stroke-width="1.2"/>
          <circle cx="12.5" cy="15.5" r="1" fill="#FFF3B0"/>
          <circle cx="16" cy="18" r="1" fill="#FFF3B0"/>
          <circle cx="19.5" cy="15.5" r="1" fill="#FFF3B0"/>
        </g>`;
      break;

    case 'paw_print':
      body = `
        <g filter="url(#${uid}_sh)">
          <ellipse cx="16" cy="20.5" rx="6.5" ry="5.2" fill="url(#${uid}_coral)" stroke="#43342E" stroke-width="1.3"/>
          <ellipse cx="8.5" cy="13.5" rx="2.5" ry="3.2" fill="url(#${uid}_coral)" stroke="#43342E" stroke-width="1.1" transform="rotate(-20 8.5 13.5)"/>
          <ellipse cx="13.5" cy="10" rx="2.5" ry="3.3" fill="url(#${uid}_coral)" stroke="#43342E" stroke-width="1.1" transform="rotate(-6 13.5 10)"/>
          <ellipse cx="18.8" cy="10" rx="2.5" ry="3.3" fill="url(#${uid}_coral)" stroke="#43342E" stroke-width="1.1" transform="rotate(6 18.8 10)"/>
          <ellipse cx="23.5" cy="13.5" rx="2.5" ry="3.2" fill="url(#${uid}_coral)" stroke="#43342E" stroke-width="1.1" transform="rotate(20 23.5 13.5)"/>
        </g>`;
      break;

    case 'soundproof_hammer':
      body = `
        <g filter="url(#${uid}_sh)">
          <line x1="8" y1="25" x2="18.5" y2="13.5" stroke="#43342E" stroke-width="4.6" stroke-linecap="round"/>
          <line x1="8" y1="25" x2="18.5" y2="13.5" stroke="url(#${uid}_wood)" stroke-width="3" stroke-linecap="round"/>
          <rect x="13" y="6" width="12" height="7" rx="3" transform="rotate(42 19 9.5)" fill="url(#${uid}_sky)" stroke="#43342E" stroke-width="1.4"/>
        </g>`;
      break;

    case 'relocate_move':
      body = `
        <g filter="url(#${uid}_sh)">
          <rect x="6" y="9" width="15" height="14" rx="3" fill="url(#${uid}_wood)" stroke="#43342E" stroke-width="1.4"/>
          <rect x="11.5" y="9" width="4" height="5.5" fill="url(#${uid}_gold)" stroke="#43342E" stroke-width="1"/>
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
          <path d="M16 4L19.2 12.8L28 16L19.2 19.2L16 28L12.8 19.2L4 16L12.8 12.8Z" fill="url(#${uid}_gold)" stroke="#43342E" stroke-width="1.4" stroke-linejoin="round"/>
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
          <rect x="6.5" y="11" width="19" height="15" rx="3.5" fill="url(#${uid}_gold)" stroke="#43342E" stroke-width="1.4"/>
          <rect x="5.5" y="8.5" width="21" height="4.5" rx="2" fill="url(#${uid}_gold)" stroke="#43342E" stroke-width="1.4"/>
          <rect x="14" y="8.5" width="4" height="17.5" fill="url(#${uid}_coral)"/>
        </g>`;
      break;
  }

  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" class="inline-block shrink-0 select-none">${commonDefs}${body}</svg>`;
}

// =========================================================
// [요구사항 5] 다꾸 수첩 전용 외곽선 또렷한 커스텀 벡터 일러스트 에셋 (createNotebookArtworkSVG)
// =========================================================
function createNotebookArtworkSVG(kind, size = 44) {
  const uid = `nb_${kind}_${++svgUidSeq}`;

  // 1) 퀘스트 완료 & 퇴거 조치용 [참 잘했어요! 완료 도장] 스탬프 SVG
  if (kind === 'stamp_well_done') {
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 76 76" fill="none" xmlns="http://www.w3.org/2000/svg" class="inline-block shrink-0 select-none">
        <g transform="rotate(-11 38 38)">
          <circle cx="38" cy="38" r="33" fill="#FFF0F3" fill-opacity="0.92" stroke="#E11D48" stroke-width="3"/>
          <circle cx="38" cy="38" r="28" fill="none" stroke="#FB7185" stroke-width="1.5" stroke-dasharray="4 3"/>
          <!-- 중앙 귀여운 벚꽃 마크 -->
          <circle cx="38" cy="24" r="4.5" fill="#FF8FA3"/>
          <circle cx="32.5" cy="27.5" r="4.5" fill="#FF8FA3"/>
          <circle cx="43.5" cy="27.5" r="4.5" fill="#FF8FA3"/>
          <circle cx="34.5" cy="33" r="4.5" fill="#FF8FA3"/>
          <circle cx="41.5" cy="33" r="4.5" fill="#FF8FA3"/>
          <circle cx="38" cy="28.8" r="2.6" fill="#FACC15"/>
          <text x="38" y="48" text-anchor="middle" fill="#BE123C" font-size="11.5" font-weight="700">참 잘했어요!</text>
          <text x="38" y="60" text-anchor="middle" fill="#E11D48" font-size="9.5" font-weight="700">완료 도장</text>
        </g>
      </svg>`;
  }

  // 2) 다이어리 중앙 스프링 제본 고리 SVG
  if (kind === 'binder_ring') {
    return `
      <svg width="26" height="22" viewBox="0 0 26 22" fill="none" xmlns="http://www.w3.org/2000/svg" class="shrink-0 select-none">
        <circle cx="5" cy="11" r="3.4" fill="#E6CCB2" stroke="#8E6E5A" stroke-width="1.2"/>
        <circle cx="21" cy="11" r="3.4" fill="#E6CCB2" stroke="#8E6E5A" stroke-width="1.2"/>
        <path d="M5 9.5C9 5.5 17 5.5 21 9.5" stroke="#5A463C" stroke-width="3.6" stroke-linecap="round"/>
        <path d="M5 9.5C9 5.5 17 5.5 21 9.5" stroke="#FFFDF9" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M5 13.5C9 9.5 17 9.5 21 13.5" stroke="#5A463C" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M5 13.5C9 9.5 17 9.5 21 13.5" stroke="#F5D5B8" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`;
  }

  // 3) 세입자 도감 & 관리인 전용 '동그란 우표 초상화 배지 (44x44 Avatar Stamp Frame)' 6종
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
      // 대학생: 헤드셋 + 둥근 안경 + 새싹
      portrait = `
        <path d="M15 58C16 45 23 41 32 41C41 41 48 45 49 58Z" fill="#60A5FA" stroke="#43342E" stroke-width="2"/>
        <path d="M18 32C18 19 46 19 46 32" fill="none" stroke="#FF6B8B" stroke-width="4" stroke-linecap="round"/>
        <rect x="13.5" y="27" width="5.5" height="10" rx="2.7" fill="#FF6B8B" stroke="#43342E" stroke-width="1.6"/>
        <rect x="45" y="27" width="5.5" height="10" rx="2.7" fill="#FF6B8B" stroke="#43342E" stroke-width="1.6"/>
        <circle cx="32" cy="33" r="12" fill="#FFE5D6" stroke="#43342E" stroke-width="2"/>
        <path d="M20 30C21 19 43 19 44 30C38 25 26 25 20 30Z" fill="#3B2820" stroke="#43342E" stroke-width="1.6"/>
        <!-- 안경 + 눈 -->
        <circle cx="27.2" cy="33.5" r="3.6" fill="#FFFFFF" fill-opacity="0.55" stroke="#43342E" stroke-width="1.6"/>
        <circle cx="36.8" cy="33.5" r="3.6" fill="#FFFFFF" fill-opacity="0.55" stroke="#43342E" stroke-width="1.6"/>
        <line x1="30.8" y1="33.5" x2="33.2" y2="33.5" stroke="#43342E" stroke-width="1.6"/>
        <circle cx="27.2" cy="33.5" r="1.5" fill="#43342E"/>
        <circle cx="36.8" cy="33.5" r="1.5" fill="#43342E"/>
        <ellipse cx="23" cy="37" rx="2.2" ry="1.1" fill="#FF8FA3"/>
        <ellipse cx="41" cy="37" rx="2.2" ry="1.1" fill="#FF8FA3"/>
        <path d="M29.5 38.5Q32 40.8 34.5 38.5" fill="none" stroke="#43342E" stroke-width="1.6" stroke-linecap="round"/>`;
    } else if (role === 'newlywed') {
      // 신혼부부: 하트 + 커플 미소
      portrait = `
        <circle cx="23" cy="35" r="10" fill="#FFE5D6" stroke="#43342E" stroke-width="1.9"/>
        <path d="M13 33C13.5 22 32.5 22 33 33C28 28 18 28 13 33Z" fill="#3B2820" stroke="#43342E" stroke-width="1.6"/>
        <circle cx="41" cy="36" r="9.5" fill="#FFE5D6" stroke="#43342E" stroke-width="1.9"/>
        <path d="M31.5 34C32 24 50 24 50.5 34C46 29 36 29 31.5 34Z" fill="#7C3F1D" stroke="#43342E" stroke-width="1.6"/>
        <ellipse cx="38" cy="23" rx="4.2" ry="2.6" fill="#FF6B8B" stroke="#43342E" stroke-width="1.3" transform="rotate(-15 38 23)"/>
        <ellipse cx="45" cy="23" rx="4.2" ry="2.6" fill="#FF6B8B" stroke="#43342E" stroke-width="1.3" transform="rotate(15 45 23)"/>
        <circle cx="20" cy="35.5" r="1.5" fill="#43342E"/><circle cx="26" cy="35.5" r="1.5" fill="#43342E"/>
        <circle cx="38" cy="36.5" r="1.5" fill="#43342E"/><circle cx="44" cy="36.5" r="1.5" fill="#43342E"/>
        <path d="M21 39Q23 41 25 39M39 40Q41 42 43 40" fill="none" stroke="#43342E" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M28.5 16C28.5 13.5 32 13.5 32 16C32 13.5 35.5 13.5 35.5 16C35.5 19 32 21.5 32 21.5C32 21.5 28.5 19 28.5 16Z" fill="#FF5C7A" stroke="#43342E" stroke-width="1.4"/>`;
    } else if (role === 'family4') {
      // 4인 가족: 부모님과 프로펠러 모자 아이의 환한 미소
      portrait = `
        <circle cx="22" cy="26" r="8.8" fill="#FFE5D6" stroke="#43342E" stroke-width="1.8"/>
        <path d="M13.2 24C14 16 30 16 30.8 24Z" fill="#3B2820" stroke="#43342E" stroke-width="1.5"/>
        <circle cx="42" cy="26" r="8.8" fill="#FFE5D6" stroke="#43342E" stroke-width="1.8"/>
        <path d="M33.2 24C34 16 50 16 50.8 24Z" fill="#8B4513" stroke="#43342E" stroke-width="1.5"/>
        <circle cx="32" cy="42" r="9.5" fill="#FFE5D6" stroke="#43342E" stroke-width="1.9"/>
        <path d="M23 39C24 32 40 32 41 39Z" fill="#38BDF8" stroke="#43342E" stroke-width="1.6"/>
        <line x1="27" y1="32" x2="37" y2="32" stroke="#FF6B8B" stroke-width="2.4" stroke-linecap="round"/>
        <circle cx="29" cy="42" r="1.5" fill="#43342E"/><circle cx="35" cy="42" r="1.5" fill="#43342E"/>
        <path d="M29 45.5Q32 48 35 45.5" fill="none" stroke="#43342E" stroke-width="1.6" stroke-linecap="round"/>`;
    } else if (role === 'elderly') {
      // 노부부: 인자한 할머니·할아버지
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
      // 히키코모리: 보라 후드티 + 다크서클
      portrait = `
        <path d="M13 58C14 42 21 36 32 36C43 36 50 42 51 58Z" fill="#581C87" stroke="#43342E" stroke-width="2"/>
        <circle cx="32" cy="33" r="15" fill="#6D28D9" stroke="#43342E" stroke-width="2"/>
        <ellipse cx="32" cy="36" rx="11" ry="9.5" fill="#F5F3FF" stroke="#43342E" stroke-width="1.6"/>
        <circle cx="27.5" cy="35" r="1.9" fill="#43342E"/>
        <circle cx="36.5" cy="35" r="1.9" fill="#43342E"/>
        <!-- 다크서클 -->
        <path d="M25 37.8Q27.5 39.2 30 37.8M34 37.8Q36.5 39.2 39 37.8" fill="none" stroke="#7E22CE" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M29.5 41Q32 39.8 34.5 41" fill="none" stroke="#43342E" stroke-width="1.5" stroke-linecap="round"/>`;
    } else {
      // 관리인: 제복 모자 + 넥타이
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
          <clipPath id="${uid}_aclip"><circle cx="32" cy="32" r="26.5"/></clipPath>
        </defs>
        <!-- 동그란 우표 스티치 배지 프레임 -->
        <circle cx="32" cy="32" r="30" fill="#FFFDF9" stroke="#E6CCB2" stroke-width="2"/>
        <circle cx="32" cy="32" r="28" fill="none" stroke="#D9A78B" stroke-width="1.3" stroke-dasharray="3.2 2.6"/>
        <circle cx="32" cy="32" r="26.5" fill="url(#${uid}_abg)" stroke="#43342E" stroke-width="1.8"/>
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
        <path d="M5 16L9 9H35L39 16Z" fill="#FF6B8B" stroke="#43342E" stroke-width="1.9" stroke-linejoin="round"/>
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
        <path d="M5 18L22 7L39 18Z" fill="#FF758F" stroke="#43342E" stroke-width="2" stroke-linejoin="round"/>
        <rect x="19" y="23" width="6" height="12" rx="2" fill="#E6A15C" stroke="#43342E" stroke-width="1.5"/>`;
      break;
  }

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" class="shrink-0 select-none">
      <rect x="2" y="2" width="40" height="40" rx="13" fill="#FFF8F0" stroke="#E6CCB2" stroke-width="1.8"/>
      ${miniArt}
    </svg>`;
}

// 기존 호환용 세대 초상화 래퍼 -> 새 우표 초상화 배지로 자동 연결!
function createHouseholdAvatarSVG(type, size = 44) {
  return createNotebookArtworkSVG(`avatar_${type}`, size);
}

// --------------------- 핵심 게임 밸런스 및 데이터 ---------------------
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
  { lotId: 'lot_main', name: '중앙 수변 1번지', x: -4.8, z: -4.2, landPrice: 0, owned: true, devType: 'mixed_1', title: '해피 미니미 타운 1차' },
  { lotId: 'lot_solar', name: '서쪽 햇살언덕 2번지', x: -18.6, z: -3.5, landPrice: 320, owned: false, devType: null, title: null },
  { lotId: 'lot_farm', name: '남서 시냇가 3번지', x: -14.2, z: 10.6, landPrice: 420, owned: false, devType: null, title: null },
  { lotId: 'lot_east', name: '아치교 동쪽 4번지', x: 13.8, z: -4.5, landPrice: 680, owned: false, devType: null, title: null },
  { lotId: 'lot_south_e', name: '벚꽃 수변 5번지', x: 13.2, z: 10.4, landPrice: 1200, owned: false, devType: null, title: null },
  { lotId: 'lot_north', name: '북쪽 전망대 6번지', x: 4.5, z: -16.8, landPrice: 2400, owned: false, devType: null, title: null }
];

const DEVELOPMENT_CATALOG = {
  solar_plant: {
    type: 'solar_plant',
    name: '친환경 태양광 발전소',
    svgIcon: 'solar_panel',
    artKey: 'dev_solar',
    buildCost: 220,
    isResidential: false,
    cycleSec: 9,
    cycleProfit: 52,
    rentSynergyPct: 5,
    desc: '따스한 햇살로 친환경 전력을 생산하여 9초마다 +52만 원의 패시브 수익을 창출합니다.'
  },
  urban_farm: {
    type: 'urban_farm',
    name: '힐링 도시 농장 & 텃밭',
    svgIcon: 'berry_farm',
    artKey: 'dev_farm',
    buildCost: 280,
    isResidential: false,
    cycleSec: 11,
    cycleProfit: 74,
    rentSynergyPct: 8,
    desc: '씨앗에서 초록 새싹, 탐스러운 딸기 열매로 3단계 자라나며 수확 수익(+74만)과 힐링을 선물합니다.'
  },
  sakura_park: {
    type: 'sakura_park',
    name: '파스텔 벚꽃 힐링 공원',
    svgIcon: 'paw_print',
    artKey: 'dev_park',
    buildCost: 340,
    isResidential: false,
    cycleSec: 12,
    cycleProfit: 38,
    rentSynergyPct: 15,
    desc: '벚꽃 산책로가 주변 주거 건물의 월세를 +15% 높여주고 층간소음 스트레스를 다독여줍니다.'
  },
  bakery_cafe: {
    type: 'bakery_cafe',
    name: '달콤 다방 & 베이커리',
    svgIcon: 'gift_box',
    artKey: 'dev_bakery',
    buildCost: 460,
    isResidential: false,
    cycleSec: 10,
    cycleProfit: 92,
    rentSynergyPct: 12,
    desc: '김이 모락모락 나는 입체 커피잔·크루아상 조형물과 브라운 어닝이 빛나는 핫플레이스 상가!'
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
    desc: '1층 달콤 다방(SWEET CAFE)·뽀송 워시 상가와 6개의 하이엔드 호실을 갖춘 프리미엄 주상복합!'
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
    desc: '1층 해피마트(MINI MART 24) & 뽀송 워시(BUBBLE PONG) 상가와 6개 주거 호실을 갖춘 첫 빌딩입니다.'
  }
};

const PUBLIC_INFRA_CATALOG = {
  elevator: {
    key: 'elevator',
    name: '유리 전망 엘리베이터',
    svgIcon: 'elevator',
    artKey: 'infra_elevator',
    cost: 160,
    rentBonusPct: 10,
    desc: '미설치 시 2층 노부부·4인가족이 계단 불만을 호소합니다. 설치 시 투명 외벽 승강기가 운행됩니다.'
  },
  recycling: {
    key: 'recycling',
    name: '클린 분리수거장',
    svgIcon: 'recycle_bin',
    artKey: 'infra_recycling',
    cost: 110,
    rentBonusPct: 6,
    desc: '미설치 시 건물 옆에 쓰레기봉투 더미가 생깁니다. 설치 시 파스텔 3색 분리수거 부스가 조립됩니다.'
  },
  parcel_box: {
    key: 'parcel_box',
    name: '스마트 무인택배함',
    svgIcon: 'relocate_move',
    artKey: 'infra_parcel',
    cost: 95,
    rentBonusPct: 6,
    desc: '정문 입구 옆 안심 택배함! 택배 분실 걱정을 없애고 전 세대 만족도와 월세를 +6% 높입니다.'
  },
  rooftop_garden: {
    key: 'rooftop_garden',
    name: '옥상 루프탑 가든',
    svgIcon: 'berry_farm',
    artKey: 'infra_rooftop',
    cost: 210,
    rentBonusPct: 12,
    desc: '옥상 화단과 쉼터를 조성해 세입자 이탈률을 낮추고 프리미엄 월세를 +12% 상승시킵니다.'
  }
};

const ROOM_SLOTS_TEMPLATE = [
  { subId: '101', name: '101호', floor: 1, col: 0, lx: -5.6, ly: 3.05, lz: 0.2, cycleSec: 9.5, unlockCost: 0, defaultUnlocked: true },
  { subId: '102', name: '102호', floor: 1, col: 1, lx: 0.0, ly: 3.05, lz: 0.2, cycleSec: 11.0, unlockCost: 0, defaultUnlocked: true },
  { subId: '103', name: '103호', floor: 1, col: 2, lx: 5.6, ly: 3.05, lz: 0.2, cycleSec: 10.2, unlockCost: 130, defaultUnlocked: false },
  { subId: '201', name: '201호', floor: 2, col: 0, lx: -5.6, ly: 5.85, lz: 0.2, cycleSec: 11.8, unlockCost: 200, defaultUnlocked: false },
  { subId: '202', name: '202호', floor: 2, col: 1, lx: 0.0, ly: 5.85, lz: 0.2, cycleSec: 10.6, unlockCost: 280, defaultUnlocked: false },
  { subId: '203', name: '203호', floor: 2, col: 2, lx: 5.6, ly: 5.85, lz: 0.2, cycleSec: 11.4, unlockCost: 380, defaultUnlocked: false }
];

const ROOM_INTERIOR_TIERS = [
  { level: 0, name: '노후 시멘트 공실', cost: 0, rentAdd: 0, desc: '리모델링 전 기본 바닥과 벽면 상태' },
  { level: 1, name: '파스텔 스트라이프 룸', cost: 65, rentAdd: 28, desc: '파스텔 스트라이프 벽지와 메이플 원목 마루 시공' },
  { level: 2, name: '코지 헤링본 하우스', cost: 160, rentAdd: 68, desc: '따뜻한 오크 헤링본 원목 마루와 크림 웨인스코팅 마감' },
  { level: 3, name: '로얄 크림 부티크', cost: 340, rentAdd: 135, desc: '샴페인 골드 몰딩과 최고급 풀옵션 스위트 (+세트보너스 25%)' }
];

const HOUSEHOLD_TYPES = {
  student: {
    type: 'student',
    label: '대학생·취준생',
    tagChips: ['#야행성', '#기타연주', '#가성비원룸'],
    accentHex: '#3B82F6',
    memberCount: 1,
    minRent: 58,
    maxRent: 108,
    noiseOutput: 45,
    noiseSensitivity: 25,
    odorSensitivity: 45,
    needsElevator: false,
    needsRecycling: false,
    isHoarder: false,
    traitDesc: '야행성 생활 · 밤샘 과제 및 통기타 연주 소음 주의',
    furnitureDesc: '라운드 싱글침대 · 듀얼모니터 데스크 · 본체 · 체어 · 통기타',
    happyQuotes: [
      '듀얼 모니터 빛이 영롱해서 인강이 귀에 쏙쏙 들어와요!',
      '1층 24H 미니마트가 바로 아래라 야식 사 먹기 최고예요!',
      '헤링본 마루 위에서 기타 치니까 소리가 참 따뜻하네요~'
    ],
    noiseVictimQuotes: ['윗방에서 쿵쿵거려서 시험공부 집중이 하나도 안 돼요!'],
    odorVictimQuotes: ['옆방에서 무슨 퀴퀴한 냄새가 복도까지 새어 나와요..'],
    infraQuotes: ['무인택배함이 있으면 교재 택배 받기가 훨씬 편할 텐데요!']
  },
  newlywed: {
    type: 'newlywed',
    label: '신혼부부',
    tagChips: ['#핑크스윗홈', '#분리수거중시', '#깔끔부부'],
    accentHex: '#EC4899',
    memberCount: 2,
    minRent: 120,
    maxRent: 215,
    noiseOutput: 18,
    noiseSensitivity: 58,
    odorSensitivity: 78,
    needsElevator: false,
    needsRecycling: true,
    isHoarder: false,
    traitDesc: '감성 인테리어 선호 · 클린 분리수거장 & 세탁소 중시',
    furnitureDesc: '핑크 쿠션 퀸침대 · 패브릭 소파 · 러그 · 아일랜드 식탁 & 커피머신',
    happyQuotes: [
      '여보~ 아일랜드 식탁에서 내려 마시는 모닝커피 향기 너무 좋다!',
      '파스텔 벽지랑 소파 색감이 동화 속 신혼집 같아요!',
      '1층 워시퐁 코인세탁소 덕분에 이불 빨래가 솜사탕처럼 뽀송해요~'
    ],
    noiseVictimQuotes: ['윗집 발망치 소리 때문에 신혼 단잠을 다 설쳤어요!'],
    odorVictimQuotes: ['옆집 문 앞에 배달 쓰레기 쌓아둔 것 좀 봐요, 벌레 나올 것 같아요!'],
    infraQuotes: ['클린 분리수거장이 아직 없어서 재활용 버리기가 불편해요~']
  },
  family4: {
    type: 'family4',
    label: '4인 가족',
    tagChips: ['#발망치주의', '#고수익세대', '#엘리베이터중시'],
    accentHex: '#10B981',
    memberCount: 4,
    minRent: 180,
    maxRent: 320,
    noiseOutput: 85,
    noiseSensitivity: 30,
    odorSensitivity: 75,
    needsElevator: true,
    needsRecycling: true,
    isHoarder: false,
    traitDesc: '든든한 고액 월세 세대 · 아이들 발망치 층간소음 높음 · 엘리베이터 중시',
    furnitureDesc: '우드 가벽 · 4인 식탁 · 대형 소파 & TV · 어린이 2층 침대',
    happyQuotes: [
      '아이들이 2층 침대 사다리 오르내리며 너무 신나해요!',
      '온 가족이 도란도란 둘러앉아 저녁 먹는 시간이 제일 행복해요~',
      '마을 시냇물 다리에서 강아지들이 뛰어노는 풍경이 참 평화로워요!'
    ],
    noiseVictimQuotes: ['애들아 살살 걸어라~ 아랫집 어르신들 놀라시겠다!'],
    odorVictimQuotes: ['아이들 키우는 집인데 옆방 악취 때문에 환기를 못 시키겠어요!'],
    infraQuotes: ['아이들 데리고 장바구니 들고 2층 계단 오르기가 꽤 숨차네요~']
  },
  elderly: {
    type: 'elderly',
    label: '노부부',
    tagChips: ['#소음민감', '#악취민감', '#엘리베이터필수'],
    accentHex: '#D97706',
    memberCount: 2,
    minRent: 110,
    maxRent: 185,
    noiseOutput: 5,
    noiseSensitivity: 92,
    odorSensitivity: 90,
    needsElevator: true,
    needsRecycling: false,
    isHoarder: false,
    traitDesc: '조용한 모범 세대 · 층간소음/악취 극도로 민감 · 2층은 엘리베이터 필수',
    furnitureDesc: '원목 트윈 침대 · 흔들의자 · 다도 좌탁 & 찻주전자 · 분재 선반',
    happyQuotes: [
      '영감, 흔들의자에 앉아 따뜻한 녹차 한 잔 마시니 참 평온하구려~',
      '분재에 예쁜 새순이 돋았어요, 햇살이 참 고운 집이야!',
      '유리 엘리베이터가 부드럽게 오르내리니 마실 나가기 참 편하구먼!'
    ],
    noiseVictimQuotes: ['윗집은 밤마다 애들이 왜 이렇게 뛰어다니는 거야! 머리가 지끈거려!'],
    odorVictimQuotes: ['옆방에서 무슨 썩은 냄새가 진동을 해요! 도저히 못 살겠소 집주인 양반!'],
    infraQuotes: ['무릎 관절이 시큰거려서 엘리베이터 없이는 2층 계단 못 다니겠소..']
  },
  hikikomori: {
    type: 'hikikomori',
    label: '은둔형 히키코모리',
    tagChips: ['#월세칼입금', '#쓰레기방주의', '#악취민원주의'],
    accentHex: '#7C3AED',
    memberCount: 1,
    minRent: 135,
    maxRent: 235,
    noiseOutput: 15,
    noiseSensitivity: 20,
    odorSensitivity: 0,
    needsElevator: false,
    needsRecycling: false,
    isHoarder: true,
    traitDesc: '월세는 꼬박꼬박 잘 내지만 방에 피자박스·쓰레기봉투를 쌓아 이웃 악취 유발!',
    furnitureDesc: '트리플 모니터 PC석 & 본체 · 바닥 매트리스 · (쓰레기 더미 누적)',
    happyQuotes: [
      '배달 시켜야지... 밖은 위험해... 모니터 3대가 내 세상이야...',
      '외주 정산금 들어왔다... 이번 달 월세도 자동이체 완료...',
      '피자 다 먹었으니 박스는 저기 탑 위에 차곡차곡 올려두자...'
    ],
    cleanedGrumbleQuote: '아, 치우지 말라니까요... 다 쓸 데 있는 내 보물들인데...',
    evictedQuote: '칫... 월세 한 번도 안 밀렸는데 너무하네... 짐 싸서 나갑니다...'
  }
};

const FAMILY_LAST_NAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '송', '유', '홍'];
const GIVEN_NAMES = ['민준', '서연', '도윤', '지우', '하은', '지호', '수빈', '현우', '소율', '연우', '다은', '태오', '영숙', '철수', '순자', '만수'];

const CARE_BUBBLE_TYPES = [
  { id: 'pipe_fix', svgIcon: 'soundproof_hammer', label: '배관 점검', cashReward: 42, toastMsg: '배관 수압 점검 완료! 보너스 관리비 +42만 원을 받았어요!' },
  { id: 'parcel_deliver', svgIcon: 'relocate_move', label: '택배 전달', cashReward: 45, toastMsg: '안심 택배 전달 완료! 감사 팁 +45만 원이 입금됐어요!' },
  { id: 'street_sweep', svgIcon: 'broom_clean', label: '돌담길 청소', cashReward: 50, toastMsg: '아일랜드 돌담길을 반짝반짝 쓸어 쾌적 보너스 +50만 원을 받았어요!' },
  { id: 'smart_light', svgIcon: 'gold_key', label: '무드등 교체', cashReward: 48, toastMsg: '따스한 크림 무드전구 교체 완료! +48만 원 보너스 수령!' }
];

const QUEST_LIST = [
  {
    id: 'mq1',
    title: '101호 파스텔 스트라이프 리모델링',
    desc: '1호관 101호를 터치해 클로즈업한 뒤 인테리어를 Lv.1 이상으로 시공하세요!',
    reward: 160,
    focusLot: 'lot_main',
    focusSubRoom: '101',
    check: (st) => (st.buildings.lot_main?.rooms.find((x) => x.subId === '101')?.interiorLv || 0) >= 1
  },
  {
    id: 'mq2',
    title: '첫 세대 입주 계약 체결하기',
    desc: '101호에 원하는 세대(학생/신혼부부/4인가족/노부부/히키코모리)를 입주시키세요!',
    reward: 180,
    focusLot: 'lot_main',
    focusSubRoom: '101',
    check: (st) => !!st.buildings.lot_main?.rooms.find((x) => x.subId === '101')?.household
  },
  {
    id: 'mq3',
    title: '102호도 리모델링 후 두 번째 세대 입주',
    desc: '옆방 102호도 예쁘게 단장해 2세대 이상이 오손도손 사는 주상복합을 만드세요!',
    reward: 240,
    focusLot: 'lot_main',
    focusSubRoom: '102',
    check: (st) => (st.buildings.lot_main?.rooms.filter((x) => !!x.household).length || 0) >= 2
  },
  {
    id: 'mq4',
    title: '건물 공용시설(분리수거장/택배함/엘리베이터) 설치',
    desc: '우측 하단 타운 수첩의 [시설·장부] 탭에서 공용 인프라를 1개 이상 설치하세요!',
    reward: 260,
    openTab: 'infra',
    check: (st) => {
      const inf = st.buildings.lot_main?.infra || {};
      return inf.recycling || inf.parcel_box || inf.elevator;
    }
  },
  {
    id: 'mq5',
    title: '2층 호실(201호) 개방 & 유리 엘리베이터 완비',
    desc: '201호를 분양 오픈하고 2층 입주민을 위한 유리 전망 엘리베이터를 설치하세요!',
    reward: 380,
    focusLot: 'lot_main',
    focusSubRoom: '201',
    check: (st) => {
      const b = st.buildings.lot_main;
      return !!b?.rooms.find((x) => x.subId === '201')?.unlocked && !!b?.infra.elevator;
    }
  },
  {
    id: 'mq6',
    title: '서쪽 언덕에 친환경 태양광 발전소 건설',
    desc: '줌아웃해 서쪽 2번지 빈터 팻말을 터치하고 태양광 발전소(또는 원하는 시설)를 세우세요!',
    reward: 450,
    focusLot: 'lot_solar',
    check: (st) => st.lots.filter((l) => l.owned).length >= 2
  },
  {
    id: 'mq7',
    title: '시냇가 부지에 힐링 딸기 농장 일구기',
    desc: '3번째 부지를 개발해 씨앗부터 딸기 열매까지 자라나는 도시 농장이나 공원을 조성하세요!',
    reward: 550,
    focusLot: 'lot_farm',
    check: (st) => st.lots.filter((l) => l.owned).length >= 3
  },
  {
    id: 'mq8',
    title: '쓰레기방 특수청소·방음시공·중재 등 세대 케어 1회',
    desc: '히키코모리 특수청소/강제퇴거 또는 층간소음 방음시공/중재선물을 1회 실행해보세요!',
    reward: 480,
    openTab: 'tenants',
    check: (st) => st.stats.crisisResolved >= 1 || st.stats.evictions >= 1
  },
  {
    id: 'mq9',
    title: '전문 건물 지배인 선임 & 위임 슬라이더 설정',
    desc: '호실 수익을 충분히 확보한 뒤 [관리인] 탭에서 1층 상주 지배인을 고용하세요!',
    reward: 600,
    openTab: 'manager',
    check: (st) => Object.values(st.buildings).some((b) => b.manager.hired)
  },
  {
    id: 'mq10',
    title: '아치교 건너 동쪽 타운까지 5개 부지 개발!',
    desc: '플로팅 아일랜드의 5개 이상 부지를 개발해 꿈의 파스텔 부동산 타운을 완성하세요!',
    reward: 1500,
    focusLot: 'lot_east',
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
