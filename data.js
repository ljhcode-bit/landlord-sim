// =========================================================
// 【갓물주 라이프 3D: 미니미 타운 — 부티크 상점 거리 · 단독 상가 · 슈퍼카 드라이브 에디션】 (data.js)
// - 4가지 입체 평면도: 원룸(studio) / 투룸(tworoom) / 쓰리룸(threeroom) / 복층 로프트(loft)
// - 가구 카탈로그 16종 + 단독 상가 3종(빵집·로스터리 카페·플라워샵) & 매장 업그레이드 3종
// - 건물주 슈퍼카 차고 컬렉션 4종(베스파 스쿠터 · 빈티지 세단 · 페라리 레드 오픈카 · 골드 리무진)
// =========================================================

let svgUidSeq = 0;

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
      <linearGradient id="${uid}_redcar" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#FF6B6B"/>
        <stop offset="55%" stop-color="#EF233C"/>
        <stop offset="100%" stop-color="#9B0014"/>
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

    case 'supercar_ico':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M3.5 19.5L6.5 14.5L13 11.5H21L26.5 15L29 18.5V22H3.5V19.5Z" fill="url(#${uid}_redcar)" stroke="#43342E" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M13 12.2L10.2 15.2H20.8L19 12.2H13Z" fill="url(#${uid}_sky)" stroke="#43342E" stroke-width="1.1"/>
          <circle cx="9.2" cy="22" r="3.6" fill="#1E293B" stroke="#43342E" stroke-width="1.3"/>
          <circle cx="9.2" cy="22" r="1.6" fill="url(#${uid}_gold)"/>
          <circle cx="23.2" cy="22" r="3.6" fill="#1E293B" stroke="#43342E" stroke-width="1.3"/>
          <circle cx="23.2" cy="22" r="1.6" fill="url(#${uid}_gold)"/>
        </g>`;
      break;

    case 'horn_ico':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M6 14H11L21 8V24L11 18H6V14Z" fill="url(#${uid}_gold)" stroke="#43342E" stroke-width="1.5" stroke-linejoin="round"/>
          <circle cx="6" cy="16" r="2.8" fill="url(#${uid}_coral)" stroke="#43342E" stroke-width="1.3"/>
          <path d="M24 11.5C26.5 13.8 26.5 18.2 24 20.5M26.8 8.8C30.2 12.5 30.2 19.5 26.8 23.2" fill="none" stroke="#E11D48" stroke-width="2.1" stroke-linecap="round"/>
        </g>`;
      break;

    case 'bakery_ico':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M6 20C6 13.5 10.5 10 16 10C21.5 10 26 13.5 26 20C26 22.5 23.5 24 21 23C19 22 17.5 22 16 22C14.5 22 13 22 11 23C8.5 24 6 22.5 6 20Z" fill="url(#${uid}_gold)" stroke="#43342E" stroke-width="1.5"/>
          <path d="M12 11.5Q13.5 16 12 21M16 10.5V21.5M20 11.5Q18.5 16 20 21" fill="none" stroke="#92400E" stroke-width="1.4" stroke-linecap="round"/>
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

    case 'back_arrow':
      body = `
        <g filter="url(#${uid}_sh)">
          <circle cx="16" cy="16" r="11.5" fill="url(#${uid}_coral)" stroke="#43342E" stroke-width="1.5"/>
          <path d="M19.5 10.5L13 16L19.5 21.5" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </g>`;
      break;

    case 'bed_ico':
      body = `
        <g filter="url(#${uid}_sh)">
          <rect x="4.5" y="10" width="4" height="15" rx="1.8" fill="url(#${uid}_wood)" stroke="#43342E" stroke-width="1.4"/>
          <rect x="4.5" y="17" width="23" height="6.5" rx="2" fill="url(#${uid}_coral)" stroke="#43342E" stroke-width="1.4"/>
          <rect x="8.5" y="13.5" width="7" height="4" rx="1.8" fill="#FFFFFF" stroke="#43342E" stroke-width="1.2"/>
          <rect x="24" y="16" width="3.5" height="9" rx="1.5" fill="url(#${uid}_wood)" stroke="#43342E" stroke-width="1.3"/>
        </g>`;
      break;

    case 'sofa_ico':
      body = `
        <g filter="url(#${uid}_sh)">
          <rect x="6" y="10" width="20" height="11" rx="4" fill="url(#${uid}_mint)" stroke="#43342E" stroke-width="1.5"/>
          <rect x="4" y="14" width="5" height="9" rx="2.2" fill="url(#${uid}_mint)" stroke="#43342E" stroke-width="1.4"/>
          <rect x="23" y="14" width="5" height="9" rx="2.2" fill="url(#${uid}_mint)" stroke="#43342E" stroke-width="1.4"/>
          <rect x="7.5" y="17" width="17" height="6" rx="2" fill="#FFFDF7" stroke="#43342E" stroke-width="1.3"/>
        </g>`;
      break;

    case 'tv_ico':
      body = `
        <g filter="url(#${uid}_sh)">
          <rect x="5" y="7" width="22" height="14.5" rx="3" fill="url(#${uid}_navy)" stroke="#43342E" stroke-width="1.5"/>
          <rect x="7.5" y="9.5" width="17" height="9.5" rx="1.8" fill="url(#${uid}_sky)"/>
          <rect x="13.5" y="21.5" width="5" height="3" fill="#64748B" stroke="#43342E" stroke-width="1.2"/>
          <rect x="10" y="24" width="12" height="2.6" rx="1.3" fill="url(#${uid}_wood)" stroke="#43342E" stroke-width="1.2"/>
        </g>`;
      break;

    case 'palette_ico':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M16 5C9.8 5 5 9.6 5 15.5C5 21.2 9.6 26 15.2 26C17.4 26 18.8 24.5 18.8 22.8C18.8 21.8 18.3 21 18.3 20.2C18.3 19.2 19.2 18.5 20.4 18.5H22.2C25.2 18.5 27.5 16.2 27.5 13.2C27.5 8.5 22.2 5 16 5Z" fill="url(#${uid}_cream)" stroke="#43342E" stroke-width="1.5"/>
          <circle cx="11" cy="13" r="2.2" fill="#FF758F"/>
          <circle cx="16" cy="10.2" r="2.2" fill="#FACC15"/>
          <circle cx="21" cy="12.5" r="2.2" fill="#34D399"/>
          <circle cx="11.5" cy="18.5" r="2.2" fill="#60A5FA"/>
        </g>`;
      break;

    case 'stairs_ico':
      body = `
        <g filter="url(#${uid}_sh)">
          <path d="M6 25H26V7H20V13H14V19H8V25Z" fill="url(#${uid}_wood)" stroke="#43342E" stroke-width="1.5" stroke-linejoin="round"/>
          <line x1="7" y1="18" x2="21" y2="5.5" stroke="url(#${uid}_gold)" stroke-width="2.4" stroke-linecap="round"/>
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

// 가구 & 상가설비 & 슈퍼카 일러스트 SVG 아이콘
function createFurnitureArtworkSVG(itemId, size = 40) {
  let art = '';
  switch (itemId) {
    case 'bed_iron':
      art = `
        <rect x="6" y="11" width="3" height="22" rx="1.5" fill="#475569" stroke="#3E2C23" stroke-width="1.5"/>
        <rect x="35" y="16" width="3" height="17" rx="1.5" fill="#475569" stroke="#3E2C23" stroke-width="1.5"/>
        <rect x="8" y="21" width="28" height="7" rx="2" fill="#7DD3FC" stroke="#3E2C23" stroke-width="1.5"/>
        <rect x="10" y="17" width="8" height="4.5" rx="2" fill="#FFFFFF" stroke="#3E2C23" stroke-width="1.3"/>`;
      break;
    case 'bed_queen':
      art = `
        <rect x="6" y="10" width="32" height="12" rx="3" fill="#C6834B" stroke="#3E2C23" stroke-width="1.6"/>
        <rect x="6" y="19" width="32" height="13" rx="3" fill="#6EE7B7" stroke="#3E2C23" stroke-width="1.6"/>
        <rect x="10" y="15" width="10" height="5" rx="2" fill="#FFFDF7" stroke="#3E2C23" stroke-width="1.3"/>
        <rect x="24" y="15" width="10" height="5" rx="2" fill="#FFFDF7" stroke="#3E2C23" stroke-width="1.3"/>`;
      break;
    case 'bed_canopy':
      art = `
        <rect x="7" y="7" width="30" height="5" rx="2.5" fill="#FF8FA3" stroke="#3E2C23" stroke-width="1.5"/>
        <line x1="9" y1="11" x2="9" y2="33" stroke="#F59E0B" stroke-width="2.2"/>
        <line x1="35" y1="11" x2="35" y2="33" stroke="#F59E0B" stroke-width="2.2"/>
        <path d="M9 12Q16 18 11 28M35 12Q28 18 33 28" fill="none" stroke="#FFB3C6" stroke-width="3" stroke-linecap="round"/>
        <rect x="9" y="22" width="26" height="10" rx="3" fill="#FF758F" stroke="#3E2C23" stroke-width="1.6"/>`;
      break;
    case 'bed_bunk':
      art = `
        <rect x="7" y="7" width="3" height="29" rx="1.2" fill="#B45309" stroke="#3E2C23" stroke-width="1.4"/>
        <rect x="34" y="7" width="3" height="29" rx="1.2" fill="#B45309" stroke="#3E2C23" stroke-width="1.4"/>
        <rect x="9" y="12" width="26" height="6" rx="2" fill="#38BDF8" stroke="#3E2C23" stroke-width="1.4"/>
        <rect x="9" y="25" width="26" height="6" rx="2" fill="#34D399" stroke="#3E2C23" stroke-width="1.4"/>
        <line x1="29" y1="12" x2="29" y2="33" stroke="#FDE047" stroke-width="2.2"/>`;
      break;
    case 'sofa_beanbag':
      art = `
        <ellipse cx="22" cy="25" rx="13" ry="9.5" fill="#FACC15" stroke="#3E2C23" stroke-width="1.7"/>
        <ellipse cx="22" cy="18" rx="9" ry="7" fill="#FDE047" stroke="#3E2C23" stroke-width="1.5"/>`;
      break;
    case 'sofa_mint2':
      art = `
        <rect x="8" y="13" width="28" height="13" rx="4" fill="#34D399" stroke="#3E2C23" stroke-width="1.6"/>
        <rect x="6" y="19" width="32" height="11" rx="3.5" fill="#A7F3D0" stroke="#3E2C23" stroke-width="1.6"/>
        <circle cx="15" cy="19" r="3.2" fill="#FFFDF7" stroke="#3E2C23" stroke-width="1.2"/>
        <circle cx="29" cy="19" r="3.2" fill="#FF8FA3" stroke="#3E2C23" stroke-width="1.2"/>`;
      break;
    case 'sofa_leather_l':
      art = `
        <rect x="6" y="12" width="31" height="12" rx="3.5" fill="#9A582C" stroke="#3E2C23" stroke-width="1.6"/>
        <rect x="6" y="19" width="20" height="9" rx="2.5" fill="#C6834B" stroke="#3E2C23" stroke-width="1.5"/>
        <rect x="25" y="19" width="12" height="15" rx="3" fill="#C6834B" stroke="#3E2C23" stroke-width="1.6"/>`;
      break;
    case 'sofa_rocker':
      art = `
        <rect x="13" y="10" width="18" height="13" rx="3" fill="#D97706" stroke="#3E2C23" stroke-width="1.6"/>
        <rect x="11" y="21" width="22" height="5.5" rx="2.5" fill="#F59E0B" stroke="#3E2C23" stroke-width="1.5"/>
        <path d="M8 31Q22 37 36 31" fill="none" stroke="#78350F" stroke-width="3" stroke-linecap="round"/>`;
      break;
    case 'app_fan':
      art = `
        <circle cx="22" cy="15" r="8.5" fill="#E0F2FE" stroke="#3E2C23" stroke-width="1.6"/>
        <circle cx="22" cy="15" r="2.5" fill="#38BDF8"/>
        <rect x="20.5" y="23.5" width="3" height="8" fill="#94A3B8" stroke="#3E2C23" stroke-width="1.2"/>
        <ellipse cx="22" cy="33" rx="7.5" ry="2.5" fill="#FFFFFF" stroke="#3E2C23" stroke-width="1.4"/>`;
      break;
    case 'app_ac':
      art = `
        <rect x="6" y="10" width="32" height="12" rx="4" fill="#FFFFFF" stroke="#3E2C23" stroke-width="1.7"/>
        <rect x="9" y="18" width="26" height="2.5" rx="1" fill="#38BDF8"/>
        <path d="M12 26Q10 31 14 34M22 26Q20 31 24 34M32 26Q30 31 34 34" fill="none" stroke="#0EA5E9" stroke-width="2.2" stroke-linecap="round"/>`;
      break;
    case 'app_rgb_desk':
      art = `
        <rect x="5" y="11" width="10" height="9" rx="1.8" fill="#A855F7" stroke="#3E2C23" stroke-width="1.4"/>
        <rect x="17" y="10" width="10" height="10" rx="1.8" fill="#38BDF8" stroke="#3E2C23" stroke-width="1.4"/>
        <rect x="29" y="11" width="10" height="9" rx="1.8" fill="#FF758F" stroke="#3E2C23" stroke-width="1.4"/>
        <rect x="6" y="23" width="32" height="4" rx="1.8" fill="#334155" stroke="#3E2C23" stroke-width="1.4"/>
        <rect x="10" y="27" width="3" height="7" fill="#475569"/><rect x="31" y="27" width="3" height="7" fill="#475569"/>`;
      break;
    case 'app_soundmat':
      art = `
        <polygon points="22,9 38,18 22,27 6,18" fill="#BAE6FD" stroke="#3E2C23" stroke-width="1.6" stroke-linejoin="round"/>
        <polygon points="22,14 38,23 22,32 6,23" fill="#34D399" stroke="#3E2C23" stroke-width="1.6" stroke-linejoin="round"/>`;
      break;
    case 'dec_peach':
      art = `
        <rect x="7" y="7" width="30" height="16" rx="3" fill="#F4CCB6" stroke="#3E2C23" stroke-width="1.5"/>
        <rect x="7" y="23" width="30" height="14" rx="3" fill="#ECCAA3" stroke="#3E2C23" stroke-width="1.5"/>
        <path d="M24 23H35V12H29V18H24V23Z" fill="#C6834B" stroke="#3E2C23" stroke-width="1.2"/>`;
      break;
    case 'dec_sage':
      art = `
        <rect x="7" y="7" width="30" height="16" rx="3" fill="#B1D3B9" stroke="#3E2C23" stroke-width="1.5"/>
        <rect x="7" y="23" width="30" height="14" rx="3" fill="#E4B07A" stroke="#3E2C23" stroke-width="1.5"/>
        <path d="M24 23H35V12H29V18H24V23Z" fill="#6F4528" stroke="#3E2C23" stroke-width="1.2"/>`;
      break;
    case 'dec_butter':
      art = `
        <rect x="7" y="7" width="30" height="16" rx="3" fill="#F6DE9C" stroke="#3E2C23" stroke-width="1.5"/>
        <rect x="7" y="23" width="30" height="14" rx="3" fill="#FAF0E1" stroke="#3E2C23" stroke-width="1.5"/>
        <path d="M24 23H35V12H29V18H24V23Z" fill="#FACC15" stroke="#3E2C23" stroke-width="1.2"/>`;
      break;
    case 'upg_oven':
      art = `
        <rect x="8" y="9" width="28" height="26" rx="5" fill="#B45309" stroke="#3E2C23" stroke-width="1.6"/>
        <path d="M13 24C13 17 31 17 31 24Z" fill="#EF4444" stroke="#3E2C23" stroke-width="1.4"/>
        <circle cx="22" cy="22" r="3" fill="#FDE047"/>`;
      break;
    case 'upg_terrace':
      art = `
        <path d="M7 19L22 8L37 19Z" fill="#10B981" stroke="#3E2C23" stroke-width="1.6" stroke-linejoin="round"/>
        <line x1="22" y1="19" x2="22" y2="34" stroke="#78350F" stroke-width="2.2"/>
        <ellipse cx="22" cy="29" rx="10" ry="3" fill="#FFFDF7" stroke="#3E2C23" stroke-width="1.4"/>`;
      break;
    case 'upg_crate':
      art = `
        <rect x="7" y="19" width="30" height="15" rx="2.5" fill="#D97706" stroke="#3E2C23" stroke-width="1.6"/>
        <circle cx="14" cy="16" r="4.5" fill="#EF4444" stroke="#3E2C23" stroke-width="1.3"/>
        <circle cx="22" cy="15" r="4.5" fill="#F97316" stroke="#3E2C23" stroke-width="1.3"/>
        <circle cx="30" cy="16" r="4.5" fill="#EF4444" stroke="#3E2C23" stroke-width="1.3"/>`;
      break;
    case 'car_scooter':
      art = `
        <path d="M11 26H26L29 15H24L22 21H15L13 16H9L11 26Z" fill="#34D399" stroke="#3E2C23" stroke-width="1.6" stroke-linejoin="round"/>
        <circle cx="12" cy="28" r="4.2" fill="#334155" stroke="#3E2C23" stroke-width="1.4"/>
        <circle cx="28" cy="28" r="4.2" fill="#334155" stroke="#3E2C23" stroke-width="1.4"/>`;
      break;
    case 'car_sedan':
      art = `
        <path d="M6 25L9 16H27L34 21L38 23V28H6V25Z" fill="#8B5A2B" stroke="#3E2C23" stroke-width="1.6" stroke-linejoin="round"/>
        <rect x="11" y="17.5" width="14" height="5" rx="1.5" fill="#BAE6FD" stroke="#3E2C23" stroke-width="1.2"/>
        <circle cx="13" cy="28.5" r="4.2" fill="#1E293B" stroke="#FFFFFF" stroke-width="1.5"/>
        <circle cx="31" cy="28.5" r="4.2" fill="#1E293B" stroke="#FFFFFF" stroke-width="1.5"/>`;
      break;
    case 'car_supercar':
      art = `
        <path d="M5 25L10 18H26L36 22L39 25V28.5H5V25Z" fill="#EF233C" stroke="#3E2C23" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M5 20L9 23" stroke="#3E2C23" stroke-width="2.4" stroke-linecap="round"/>
        <circle cx="13" cy="28.5" r="4.4" fill="#1E293B" stroke="#FACC15" stroke-width="1.5"/>
        <circle cx="31" cy="28.5" r="4.4" fill="#1E293B" stroke="#FACC15" stroke-width="1.5"/>`;
      break;
    case 'car_limo':
      art = `
        <path d="M3 24L7 17H33L39 22V28H3V24Z" fill="#FFFBEB" stroke="#D97706" stroke-width="1.8" stroke-linejoin="round"/>
        <rect x="9" y="18.5" width="21" height="4.2" rx="1" fill="#1E293B"/>
        <circle cx="10" cy="28.5" r="4" fill="#1E293B" stroke="#FACC15" stroke-width="1.5"/>
        <circle cx="33" cy="28.5" r="4" fill="#1E293B" stroke="#FACC15" stroke-width="1.5"/>`;
      break;
    default:
      art = `
        <rect x="7" y="7" width="30" height="16" rx="3" fill="#C6B7E6" stroke="#3E2C23" stroke-width="1.5"/>
        <rect x="7" y="23" width="30" height="14" rx="3" fill="#F3E4CE" stroke="#3E2C23" stroke-width="1.5"/>
        <path d="M24 23H35V12H29V18H24V23Z" fill="#FF758F" stroke="#3E2C23" stroke-width="1.2"/>`;
      break;
  }

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" class="shrink-0 select-none">
      <rect x="2" y="2" width="40" height="40" rx="12" fill="#FFFDF7" stroke="#EED0B5" stroke-width="1.8"/>
      ${art}
    </svg>`;
}

function createNotebookArtworkSVG(kind, size = 48) {
  const uid = `nb_${kind}_${++svgUidSeq}`;

  if (kind === 'stamp_well_done' || kind === 'stamp_complete') {
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg" class="inline-block shrink-0 select-none">
        <g transform="rotate(-10 34 34)">
          <circle cx="34" cy="34" r="29" fill="#FFF0F3" fill-opacity="0.94" stroke="#E11D48" stroke-width="2.8"/>
          <circle cx="34" cy="34" r="24.5" fill="none" stroke="#FB7185" stroke-width="1.5" stroke-dasharray="3.5 2.8"/>
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

  if (kind.startsWith('avatar_')) {
    const role = kind.replace('avatar_', '');
    const bgPalette = {
      student: ['#E0F2FE', '#BAE6FD'],
      newlywed: ['#FFE4EC', '#FBCFE8'],
      family4: ['#DCFCE7', '#A7F3D0'],
      elderly: ['#FEF3C7', '#FDE68A'],
      hikikomori: ['#EDE9FE', '#DDD6FE'],
      streamer: ['#FCE7F3', '#DDD6FE'],
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
        <path d="M29.5 38.6Q32 41 34.5 38.6" fill="none" stroke="#43342E" stroke-width="1.6" stroke-linecap="round"/>`;
    } else if (role === 'newlywed') {
      portrait = `
        <circle cx="23" cy="35" r="10" fill="#FFE5D6" stroke="#43342E" stroke-width="1.9"/>
        <path d="M13 33C13.5 22 32.5 22 33 33C28 28 18 28 13 33Z" fill="#4A3B32" stroke="#43342E" stroke-width="1.6"/>
        <circle cx="41" cy="36" r="9.5" fill="#FFE5D6" stroke="#43342E" stroke-width="1.9"/>
        <path d="M31.5 34C32 24 50 24 50.5 34C46 29 36 29 31.5 34Z" fill="#7C3F1D" stroke="#43342E" stroke-width="1.6"/>
        <circle cx="20" cy="35.5" r="1.5" fill="#43342E"/><circle cx="26" cy="35.5" r="1.5" fill="#43342E"/>
        <circle cx="38" cy="36.5" r="1.5" fill="#43342E"/><circle cx="44" cy="36.5" r="1.5" fill="#43342E"/>
        <path d="M28.5 16C28.5 13.5 32 13.5 32 16C32 13.5 35.5 13.5 35.5 16C35.5 19 32 21.5 32 21.5C32 21.5 28.5 19 28.5 16Z" fill="#FF5C7A" stroke="#43342E" stroke-width="1.4"/>`;
    } else if (role === 'family4') {
      portrait = `
        <circle cx="22" cy="26" r="8.8" fill="#FFE5D6" stroke="#43342E" stroke-width="1.8"/>
        <path d="M13.2 24C14 16 30 16 30.8 24Z" fill="#4A3B32" stroke="#43342E" stroke-width="1.5"/>
        <circle cx="42" cy="26" r="8.8" fill="#FFE5D6" stroke="#43342E" stroke-width="1.8"/>
        <path d="M33.2 24C34 16 50 16 50.8 24Z" fill="#8B4513" stroke="#43342E" stroke-width="1.5"/>
        <circle cx="32" cy="42" r="9.6" fill="#FFE5D6" stroke="#43342E" stroke-width="1.9"/>
        <path d="M23 39C24 32 40 32 41 39Z" fill="#38BDF8" stroke="#43342E" stroke-width="1.6"/>
        <circle cx="29" cy="42" r="1.5" fill="#43342E"/><circle cx="35" cy="42" r="1.5" fill="#43342E"/>`;
    } else if (role === 'elderly') {
      portrait = `
        <circle cx="23" cy="36" r="9.8" fill="#FFE5D6" stroke="#43342E" stroke-width="1.8"/>
        <ellipse cx="23" cy="26.5" rx="12.5" ry="3.2" fill="#FCD34D" stroke="#43342E" stroke-width="1.5"/>
        <circle cx="41.5" cy="36" r="9.5" fill="#FFE5D6" stroke="#43342E" stroke-width="1.8"/>
        <path d="M32 34C32.5 25 50.5 25 51 34Z" fill="#F3F4F6" stroke="#43342E" stroke-width="1.5"/>`;
    } else if (role === 'hikikomori') {
      portrait = `
        <path d="M13 58C14 42 21 36 32 36C43 36 50 42 51 58Z" fill="#581C87" stroke="#43342E" stroke-width="2"/>
        <circle cx="32" cy="33" r="15" fill="#6D28D9" stroke="#43342E" stroke-width="2"/>
        <ellipse cx="32" cy="36" rx="11" ry="9.5" fill="#F5F3FF" stroke="#43342E" stroke-width="1.6"/>
        <circle cx="27.5" cy="35" r="1.9" fill="#43342E"/><circle cx="36.5" cy="35" r="1.9" fill="#43342E"/>`;
    } else if (role === 'streamer') {
      portrait = `
        <path d="M14 58C15 44 22 40 32 40C42 40 49 44 50 58Z" fill="#EC4899" stroke="#43342E" stroke-width="2"/>
        <polygon points="21,23 25,13 29,22" fill="#FF758F" stroke="#43342E" stroke-width="1.6"/>
        <polygon points="43,23 39,13 35,22" fill="#38BDF8" stroke="#43342E" stroke-width="1.6"/>
        <circle cx="32" cy="33" r="12" fill="#FFE5D6" stroke="#43342E" stroke-width="2"/>
        <path d="M20 30C21 19 43 19 44 30C38 25 26 25 20 30Z" fill="#9333EA" stroke="#43342E" stroke-width="1.6"/>
        <circle cx="27.2" cy="34" r="1.8" fill="#43342E"/><circle cx="36.8" cy="34" r="1.8" fill="#43342E"/>`;
    } else {
      portrait = `
        <path d="M15 58C16 45 23 41 32 41C41 41 48 45 49 58Z" fill="#1E3A8A" stroke="#43342E" stroke-width="2"/>
        <circle cx="32" cy="33" r="11.5" fill="#FFE5D6" stroke="#43342E" stroke-width="2"/>
        <path d="M19 26C19.5 17 44.5 17 45 26L42.5 29H21.5L19 26Z" fill="#2563EB" stroke="#43342E" stroke-width="1.8"/>
        <circle cx="27.5" cy="34" r="1.8" fill="#43342E"/><circle cx="36.5" cy="34" r="1.8" fill="#43342E"/>`;
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
        <rect x="3" y="3" width="58" height="58" rx="17" fill="#FFFDF9" stroke="#D9B09E" stroke-width="2"/>
        <rect x="5" y="5" width="54" height="54" rx="15.5" fill="none" stroke="#E5B8A8" stroke-width="1.5" stroke-dasharray="3.2 2.6"/>
        <rect x="7" y="7" width="50" height="50" rx="14" fill="url(#${uid}_abg)" stroke="#43342E" stroke-width="1.9"/>
        <g clip-path="url(#${uid}_aclip)">${portrait}</g>
      </svg>`;
  }

  let miniArt = '';
  switch (kind) {
    case 'infra_elevator':
      miniArt = `<rect x="9" y="6" width="26" height="32" rx="6" fill="#BAE6FD" stroke="#43342E" stroke-width="2"/><rect x="13" y="12" width="18" height="22" rx="3" fill="#FFFDF9" stroke="#43342E" stroke-width="1.6"/><line x1="22" y1="12" x2="22" y2="34" stroke="#43342E" stroke-width="1.6"/>`;
      break;
    case 'infra_recycling':
      miniArt = `<rect x="7" y="16" width="9" height="18" rx="3" fill="#60A5FA" stroke="#43342E" stroke-width="1.8"/><rect x="17.5" y="16" width="9" height="18" rx="3" fill="#34D399" stroke="#43342E" stroke-width="1.8"/><rect x="28" y="16" width="9" height="18" rx="3" fill="#FBBF24" stroke="#43342E" stroke-width="1.8"/>`;
      break;
    case 'infra_parcel':
      miniArt = `<rect x="9" y="7" width="26" height="30" rx="5" fill="#FF8FA3" stroke="#43342E" stroke-width="2"/><rect x="13" y="21" width="18" height="11" rx="2" fill="#FDE68A" stroke="#43342E" stroke-width="1.5"/>`;
      break;
    case 'infra_rooftop':
      miniArt = `<rect x="7" y="25" width="30" height="10" rx="4" fill="#E6A15C" stroke="#43342E" stroke-width="1.9"/><circle cx="16" cy="18" r="7" fill="#4ADE80" stroke="#43342E" stroke-width="1.8"/><circle cx="28" cy="17" r="7.5" fill="#FFB3C6" stroke="#43342E" stroke-width="1.8"/>`;
      break;
    case 'shop_mart':
      miniArt = `<rect x="7" y="15" width="30" height="21" rx="4" fill="#FFFDF9" stroke="#43342E" stroke-width="2"/><path d="M5 16L9 9H35L39 16Z" fill="#E05A47" stroke="#43342E" stroke-width="1.9"/>`;
      break;
    case 'shop_wash':
      miniArt = `<rect x="9" y="8" width="26" height="29" rx="5" fill="#FFFDF9" stroke="#43342E" stroke-width="2"/><circle cx="22" cy="24" r="7.5" fill="#BAE6FD" stroke="#43342E" stroke-width="1.8"/>`;
      break;
    case 'dev_solar':
      miniArt = `<circle cx="31" cy="11" r="4.8" fill="#FACC15" stroke="#43342E" stroke-width="1.5"/><polygon points="8,18 27,15 33,30 6,33" fill="#3B82F6" stroke="#43342E" stroke-width="1.8"/>`;
      break;
    case 'dev_farm':
      miniArt = `<rect x="7" y="26" width="30" height="10" rx="3" fill="#C6834B" stroke="#43342E" stroke-width="1.8"/><circle cx="22" cy="18" r="8" fill="#FF6B8B" stroke="#43342E" stroke-width="1.8"/>`;
      break;
    case 'dev_park':
      miniArt = `<rect x="19" y="24" width="6" height="12" rx="2" fill="#8B5630" stroke="#43342E" stroke-width="1.6"/><circle cx="22" cy="16" r="10" fill="#FFB3C6" stroke="#43342E" stroke-width="1.8"/>`;
      break;
    default:
      miniArt = `<path d="M11 26C11 19 16 15 22 15C28 15 33 19 33 26Z" fill="#FBBF24" stroke="#43342E" stroke-width="1.8"/><rect x="12" y="24" width="20" height="11" rx="4" fill="#FFFDF9" stroke="#43342E" stroke-width="1.8"/>`;
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

// --------------------- 핵심 게임 밸런스 및 타운 거리 스케일 ---------------------
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

// 순환 아스팔트 도로 외곽에 여유롭게 배치된 개발 부지 좌표 (겹침 0%)
const INITIAL_ISLAND_LOTS = [
  { lotId: 'lot_main', name: '수변 1번지', x: -4.2, z: -6.4, landPrice: 0, owned: true, devType: 'mixed_1', title: '해피 미니미 타운 1차' },
  { lotId: 'lot_solar', name: '햇살언덕 2번지', x: -43.5, z: 4.5, landPrice: 320, owned: false, devType: null, title: null },
  { lotId: 'lot_farm', name: '시냇가 3번지', x: -42.5, z: 21.5, landPrice: 420, owned: false, devType: null, title: null },
  { lotId: 'lot_east', name: '아치교 4번지', x: 45.0, z: 5.5, landPrice: 680, owned: false, devType: null, title: null },
  { lotId: 'lot_south_e', name: '벚꽃변 5번지', x: 44.0, z: 22.8, landPrice: 1200, owned: false, devType: null, title: null },
  { lotId: 'lot_north', name: '전망대 6번지', x: -4.0, z: -24.5, landPrice: 2400, owned: false, devType: null, title: null }
];

// --------------------- [1단계 3 & 4] 단독 상가 3종 & 매장 업그레이드 카탈로그 ---------------------
const STANDALONE_SHOPS_TEMPLATE = [
  {
    shopId: 'shop_bakery',
    kind: 'bakery',
    name: '바게트 하우스',
    engTitle: 'PATISSERIE',
    subCopy: '수제 케이크 & 프랑스 바게트',
    emoji: '🥐',
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
    emoji: '🍎',
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
    emoji: '💐',
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
    name: '🔥 프리미엄 오븐/커피머신 교체',
    cost: 120,
    visitBonus: 6,
    cycleBonus: 18,
    chip: '객단가 +6만 · 주기 +18만',
    tone: 'coral',
    reaction: '프리미엄 설비 덕분에 빵과 커피 풍미가 2배 깊어졌어요!'
  },
  {
    id: 'upg_terrace',
    name: '⛱️ 야외 파라솔 테라스 확장',
    cost: 140,
    visitBonus: 5,
    cycleBonus: 22,
    chip: '야외석 확장 · 주기 +22만',
    tone: 'mint',
    reaction: '초록 파라솔 야외 테라스 자리가 늘어나 손님들이 줄을 서요!'
  },
  {
    id: 'upg_crate',
    name: '🍎 유기농 과일 매대 추가',
    cost: 95,
    visitBonus: 4,
    cycleBonus: 15,
    chip: '과일 매대 · 주기 +15만',
    tone: 'gold',
    reaction: '싱싱한 사과와 오렌지 나무 상자 진열대가 거리를 화사하게 만들어요!'
  }
];

// --------------------- [1단계 5] 건물주 슈퍼카 차고 컬렉션 4종 ---------------------
const CAR_CATALOG = [
  {
    id: 'car_scooter',
    name: '민트 베스파 스쿠터',
    emoji: '🛵',
    cost: 0,
    maxSpeed: 14.5,
    rentBonusPct: 0,
    happyBonus: 0,
    driveTipPct: 20,
    chip: '기본 보유 · 기동성 최고',
    tone: 'mint',
    cheerQuotes: [
      '우와~ 건물주님 민트 베스파 스쿠터 너무 귀여워요!',
      '부릉부릉~ 상큼한 민트 스쿠터 지나간다!'
    ]
  },
  {
    id: 'car_sedan',
    name: '클래식 브라운 빈티지 세단',
    emoji: '🚗',
    cost: 240,
    maxSpeed: 17.5,
    rentBonusPct: 10,
    happyBonus: 5,
    driveTipPct: 25,
    chip: '월세 +10% · 레트로 감성',
    tone: 'gold',
    cheerQuotes: [
      '클래식 빈티지 세단 품격이 장난 아니네요!!',
      '유럽 영화 속 주인공 차 같아요~ 멋지다!'
    ]
  },
  {
    id: 'car_supercar',
    name: '페라리 레드 오픈 슈퍼카',
    emoji: '🏎️',
    cost: 520,
    maxSpeed: 24.0,
    rentBonusPct: 25,
    happyBonus: 12,
    driveTipPct: 30,
    chip: '행복·월세 +25% · 오픈 스포츠카',
    tone: 'coral',
    cheerQuotes: [
      '우와! 우리 건물주님 슈퍼카 뽑으셨네!! 멋지다~! ❤️',
      '부아앙~ 레드 오픈카 배기음 소리 대박!! 갓물주님 최고!',
      '빨간 컨버터블 슈퍼카 포스 미쳤다!! 😍'
    ]
  },
  {
    id: 'car_limo',
    name: '골드 크라운 롱바디 리무진',
    emoji: '🚘',
    cost: 950,
    maxSpeed: 20.5,
    rentBonusPct: 50,
    happyBonus: 20,
    driveTipPct: 50,
    chip: '월세·수금 +50% · 궁극의 상징',
    tone: 'gold',
    cheerQuotes: [
      '헉!! 골드 크라운 롱바디 리무진이라니 진정한 갓물주님!! 👑',
      '리무진 길이 실화야?! 우리 동네 랜드마크 등극!! ❤️',
      '번쩍번쩍 황금 리무진 아우라에 눈이 부셔요~!'
    ]
  }
];

// --------------------- 4가지 입체 평면도 메타 및 호실 템플릿 ---------------------
const ROOM_TYPE_META = {
  studio: {
    key: 'studio',
    badge: '원룸 스튜디오',
    shortBadge: '원룸',
    emoji: '🏠',
    tone: 'sky',
    specialty: '대학생 · 히키코모리 특화',
    preferredBy: ['student', 'hikikomori']
  },
  tworoom: {
    key: 'tworoom',
    badge: '투룸 스위트',
    shortBadge: '투룸',
    emoji: '🚪',
    tone: 'coral',
    specialty: '아치 가벽 분리 · 신혼/노부부 특화',
    preferredBy: ['newlywed', 'elderly']
  },
  threeroom: {
    key: 'threeroom',
    badge: '쓰리룸 펜트하우스',
    shortBadge: '쓰리룸',
    emoji: '👨‍👩‍👧‍👦',
    tone: 'mint',
    specialty: '안방+메인거실+아이방 · 4인가족/VIP 특화',
    preferredBy: ['family4', 'streamer']
  },
  loft: {
    key: 'loft',
    badge: '복층 로프트 하우스',
    shortBadge: '복층',
    emoji: '🪜',
    tone: 'gold',
    specialty: '원목 실내계단+2층 다락 · 스트리머/고급 특화',
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
  { key: 'bed', label: '침실/침대', emoji: '🛏️', svgIcon: 'bed_ico' },
  { key: 'sofa', label: '거실/소파', emoji: '🛋️', svgIcon: 'sofa_ico' },
  { key: 'appliance', label: '주방/가전', emoji: '🖥️', svgIcon: 'tv_ico' },
  { key: 'decor', label: '벽지/바닥/복층계단', emoji: '🎨', svgIcon: 'palette_ico' }
];

const FURNITURE_CATALOG = {
  bed: [
    { id: 'bed_iron', category: 'bed', name: '심플 철제 침대', cost: 0, rentAdd: 0, happyAdd: 0, chip: '기본 제공', tone: 'sky', reaction: '깔끔한 스카이블루 철제 침대가 실용적이에요!' },
    { id: 'bed_queen', category: 'bed', name: '코지 원목 퀸침대', cost: 75, rentAdd: 26, happyAdd: 12, chip: '월세 +26만', tone: 'mint', reaction: '따뜻한 원목 퀸침대라 꿀잠 예약이에요~ 최고!' },
    { id: 'bed_canopy', category: 'bed', name: '핑크 프린세스 캐노피 침대', cost: 145, rentAdd: 52, happyAdd: 20, chip: '월세 +52만', tone: 'coral', reaction: '와아!! 핑크 프린세스 캐노피 침대라니 동화 속 공주님 방 같아요!' },
    { id: 'bed_bunk', category: 'bed', name: '패밀리 원목 2층 침대', cost: 165, rentAdd: 58, happyAdd: 22, chip: '월세 +58만', tone: 'gold', reaction: '튼튼한 원목 2층 침대 사다리 타기가 너무 신나요!' }
  ],
  sofa: [
    { id: 'sofa_beanbag', category: 'sofa', name: '1인용 옐로우 빈백', cost: 0, rentAdd: 0, happyAdd: 0, chip: '기본 제공', tone: 'gold', reaction: '말랑말랑 노란 빈백에 파묻히면 피로가 싹 풀려요!' },
    { id: 'sofa_mint2', category: 'sofa', name: '민트 패브릭 2인 소파', cost: 70, rentAdd: 24, happyAdd: 12, chip: '월세 +24만', tone: 'mint', reaction: '상큼한 민트 패브릭 소파 덕분에 거실이 화사해졌어요!' },
    { id: 'sofa_rocker', category: 'sofa', name: '노부부용 원목 흔들의자 세트', cost: 115, rentAdd: 40, happyAdd: 18, chip: '월세 +40만', tone: 'coral', reaction: '원목 흔들의자에 앉아 따뜻한 차 한 잔 마시니 천국이구려~' },
    { id: 'sofa_leather_l', category: 'sofa', name: '고급 가죽 L자형 패밀리 소파', cost: 155, rentAdd: 56, happyAdd: 22, chip: '월세 +56만', tone: 'gold', reaction: '우와! 고급 가죽 L자형 소파가 펜트하우스 거실처럼 럭셔리해요!' }
  ],
  appliance: [
    { id: 'app_fan', category: 'appliance', name: '보급형 스탠드 선풍기', cost: 0, rentAdd: 0, happyAdd: 0, chip: '기본 제공', tone: 'sky', reaction: '솔솔 부는 스탠드 선풍기 바람이 시원해요~' },
    { id: 'app_ac', category: 'appliance', name: '무풍 벽걸이 에어컨', cost: 85, rentAdd: 30, happyAdd: 14, chip: '월세 +30만', tone: 'mint', reaction: '무풍 벽걸이 에어컨까지 풀옵션이라니 갓물주님 최고예요!' },
    { id: 'app_soundmat', category: 'appliance', name: '프리미엄 층간 방음 매트', cost: 95, rentAdd: 34, happyAdd: 18, grantsSoundproof: true, chip: '방음 100% · +34만', tone: 'sky', reaction: '도톰한 층간 방음 매트 덕분에 발망치 걱정 끝이에요!' },
    { id: 'app_rgb_desk', category: 'appliance', name: 'RGB 트리플 모니터 데스크', cost: 160, rentAdd: 58, happyAdd: 24, chip: '월세 +58만', tone: 'coral', reaction: '영롱한 RGB 트리플 모니터 데스크라니 방송·작업 효율 폭발!!' }
  ],
  decor: [
    { id: 'dec_peach', category: 'decor', name: '피치 오트밀 & 메이플 마루', wallKey: 'wallPeach', floorKey: 'floor1', stairStyle: 'oak', cost: 0, rentAdd: 0, happyAdd: 0, chip: '피치 파스텔', tone: 'coral', reaction: '포근한 피치 오트밀 벽지 색감이 마음을 따뜻하게 해줘요!' },
    { id: 'dec_sage', category: 'decor', name: '세이지 그린 & 오크 마루', wallKey: 'wallSage', floorKey: 'floor2', stairStyle: 'walnut', cost: 65, rentAdd: 22, happyAdd: 12, chip: '월세 +22만', tone: 'mint', reaction: '싱그러운 세이지 그린 벽지와 오크 마루 조합이 너무 세련됐어요!' },
    { id: 'dec_butter', category: 'decor', name: '버터 크림 & 골드 원목계단', wallKey: 'wallButter', floorKey: 'floor3', stairStyle: 'gold', cost: 120, rentAdd: 42, happyAdd: 16, chip: '월세 +42만', tone: 'gold', reaction: '햇살 같은 버터 크림 벽지와 화이트 마루 덕분에 집이 2배 넓어 보여요!' },
    { id: 'dec_lavender', category: 'decor', name: '로얄 라벤더 & 부티크 계단', wallKey: 'wallLavender', floorKey: 'floor3', stairStyle: 'coral', cost: 170, rentAdd: 62, happyAdd: 22, chip: '월세 +62만', tone: 'coral', reaction: '로얄 라벤더 벽지와 부티크 계단 마감이 예술 작품 같아요!' }
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
    rentSynergyPct: 5,
    chips: [{ ico: 'solar_panel', text: '9초 +52만', tone: 'gold' }, { ico: 'sparkle_star', text: '시너지 +5%', tone: 'mint' }]
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
    chips: [{ ico: 'berry_farm', text: '11초 +74만', tone: 'coral' }, { ico: 'sparkle_star', text: '시너지 +8%', tone: 'mint' }]
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
    chips: [{ ico: 'heart_gauge', text: '소음 진정', tone: 'coral' }, { ico: 'sparkle_star', text: '월세 +15%', tone: 'mint' }]
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
    chips: [{ ico: 'coffee_cup', text: '10초 +92만', tone: 'gold' }, { ico: 'sparkle_star', text: '시너지 +12%', tone: 'mint' }]
  },
  mixed_2: {
    type: 'mixed_2',
    name: '럭키 팰리스',
    svgIcon: 'red_house',
    artKey: 'shop_mart',
    buildCost: 780,
    isResidential: true,
    baseRoomRent: 56,
    rentSynergyPct: 10,
    chips: [{ ico: 'red_house', text: '4종 대형평형', tone: 'sky' }, { ico: 'sparkle_star', text: '시너지 +10%', tone: 'mint' }]
  },
  mixed_1: {
    type: 'mixed_1',
    name: '해피 미니미 타운 1차',
    svgIcon: 'red_house',
    artKey: 'shop_mart',
    buildCost: 0,
    isResidential: true,
    baseRoomRent: 38,
    rentSynergyPct: 0,
    chips: [{ ico: 'red_house', text: '4종 대형평형', tone: 'coral' }, { ico: 'coin_stack', text: '상가 +28만', tone: 'gold' }]
  }
};

const PUBLIC_INFRA_CATALOG = {
  elevator: {
    key: 'elevator',
    name: '유리 엘리베이터',
    svgIcon: 'elevator',
    artKey: 'infra_elevator',
    cost: 160,
    rentBonusPct: 10,
    chips: [{ ico: 'elevator', text: '고층 필수', tone: 'sky' }, { ico: 'coin_stack', text: '월세 +10%', tone: 'mint' }]
  },
  recycling: {
    key: 'recycling',
    name: '클린 분리수거장',
    svgIcon: 'recycle_bin',
    artKey: 'infra_recycling',
    cost: 110,
    rentBonusPct: 6,
    chips: [{ ico: 'broom_clean', text: '청결 유지', tone: 'mint' }, { ico: 'coin_stack', text: '월세 +6%', tone: 'gold' }]
  },
  parcel_box: {
    key: 'parcel_box',
    name: '스마트 택배함',
    svgIcon: 'relocate_move',
    artKey: 'infra_parcel',
    cost: 95,
    rentBonusPct: 6,
    chips: [{ ico: 'relocate_move', text: '안심 택배', tone: 'coral' }, { ico: 'coin_stack', text: '월세 +6%', tone: 'gold' }]
  },
  rooftop_garden: {
    key: 'rooftop_garden',
    name: '옥상 루프탑가든',
    svgIcon: 'berry_farm',
    artKey: 'infra_rooftop',
    cost: 210,
    rentBonusPct: 12,
    chips: [{ ico: 'heart_gauge', text: '행복도 UP', tone: 'coral' }, { ico: 'coin_stack', text: '월세 +12%', tone: 'mint' }]
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
    accentHex: '#3B82F6',
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
    traitBadges: [{ ico: 'guitar_note', label: '원룸 선호', tone: 'sky' }, { ico: 'coin_stack', label: '가성비 중시', tone: 'gold' }],
    happyQuotes: [
      '방이 1.6배나 넓어져서 침대랑 책상이 쾌적해요!',
      '앞마당 분수대 건너 바게트 하우스 빵이 꿀맛이에요!',
      '러그로 공간이 깔끔하게 나뉘어 공부 집중이 잘 돼요~'
    ],
    noiseVictimQuotes: ['윗방이 쿵쿵거려 시험공부 집중이 안 돼요!'],
    odorVictimQuotes: ['옆방에서 퀴퀴한 냄새가 복도까지 나요..'],
    infraQuotes: ['스마트 택배함이 있으면 훨씬 편할 텐데요!']
  },
  newlywed: {
    type: 'newlywed',
    label: '신혼부부',
    accentHex: '#EC4899',
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
    traitBadges: [{ ico: 'heart_gauge', label: '투룸 스윗홈', tone: 'coral' }, { ico: 'recycle_bin', label: '분리수거 중시', tone: 'mint' }],
    happyQuotes: [
      '아치형 가벽으로 거실이랑 안방이 나뉜 투룸이 로망이었어요!',
      '초록 파라솔 카페 테라스에서 마시는 주말 커피 최고예요~',
      '플로레스 꽃집에서 산 튤립 화분이 너무 예뻐요!'
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
    minRent: 210,
    maxRent: 380,
    noiseOutput: 88,
    noiseLv: 3,
    noiseSensitivity: 30,
    odorSensitivity: 75,
    needsElevator: true,
    needsRecycling: true,
    isHoarder: false,
    traitBadges: [{ ico: 'red_house', label: '쓰리룸 특화', tone: 'mint' }, { ico: 'sound_wave', label: '발망치 주의', tone: 'coral' }],
    happyQuotes: [
      '부부 안방에 아이들 방까지 분리된 쓰리룸이라 너무 행복해요!',
      '아이들이 분수대 광장이랑 빵집 케이크를 정말 좋아해요!',
      '넓은 메인 거실 식탁에서 온 가족이 도란도란 저녁 먹어요~'
    ],
    noiseVictimQuotes: ['애들아 살살 걸어라~ 아랫집 놀라시겠다!'],
    odorVictimQuotes: ['옆방 악취 때문에 창문 환기를 못 해요!'],
    infraQuotes: ['아이들 데리고 계단 오르기가 숨차네요, 승강기가 필요해요!']
  },
  elderly: {
    type: 'elderly',
    label: '노부부',
    accentHex: '#D97706',
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
    traitBadges: [{ ico: 'elevator', label: '승강기 필수', tone: 'gold' }, { ico: 'sound_wave', label: '투룸·정숙 선호', tone: 'sky' }],
    happyQuotes: [
      '분수대 벤치에 앉아 물소리를 들으니 참 평온하구려~',
      '그로서리 가게 앞 나무 상자 사과가 참 싱싱하구먼!',
      '유리 엘리베이터 덕분에 마실 나가기 참 편하구려!'
    ],
    noiseVictimQuotes: ['윗집 발소리 때문에 머리가 지끈거려요!'],
    odorVictimQuotes: ['옆방 썩은 냄새 때문에 못 살겠소!'],
    infraQuotes: ['엘리베이터 없이는 고층 계단 못 다니겠소..']
  },
  streamer: {
    type: 'streamer',
    label: '스트리머 VIP',
    accentHex: '#9333EA',
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
    traitBadges: [{ ico: 'stairs_ico', label: '복층 로프트 선호', tone: 'gold' }, { ico: 'tv_ico', label: '초고수익 VIP', tone: 'coral' }],
    happyQuotes: [
      '원목 계단 올라가면 2층 다락 침실이라니 복층 로프트 감성 미쳤다!!',
      '건물주님 슈퍼카랑 우리 부티크 거리 브이로그 찍으면 조회수 폭발!',
      '천장이 1.8배나 높아서 스튜디오 조명발이 대박이에요~'
    ],
    noiseVictimQuotes: ['마이크에 층간소음이 다 들어가요! 방음 매트 부탁해요!'],
    odorVictimQuotes: ['복도 냄새 때문에 택배 받으러 못 나가겠어요!'],
    infraQuotes: ['방송 장비 옮기려면 엘리베이터가 꼭 필요해요!']
  },
  hikikomori: {
    type: 'hikikomori',
    label: '히키코모리',
    accentHex: '#7C3AED',
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
    traitBadges: [{ ico: 'coin_stack', label: '월세 칼입금', tone: 'gold' }, { ico: 'broom_clean', label: '쓰레기방 주의', tone: 'coral' }],
    happyQuotes: [
      '배달 시켜야지... 트리플 모니터가 내 세상이야...',
      '외주 정산 완료... 이번 달 월세도 칼입금...',
      '밤에 몰래 바게트 사 들고 방으로 호다닥 복귀...'
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
  { id: 'street_sweep', svgIcon: 'broom_clean', label: '거리 청소', cashReward: 50, toastMsg: '부티크 거리 청소 완료! +50만' },
  { id: 'smart_light', svgIcon: 'gold_key', label: '가로등 점검', cashReward: 48, toastMsg: '가로등 점검 완료! +48만' }
];

const QUEST_LIST = [
  {
    id: 'mq1',
    icon: 'bed_ico',
    title: '101호 가구 카탈로그 시공 1회',
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
    title: '101호 원룸 입주 계약 체결',
    reward: 180,
    focusLot: 'lot_main',
    focusSubRoom: '101',
    progress: (st) => ({ cur: st.buildings.lot_main?.rooms.find((x) => x.subId === '101')?.household ? 1 : 0, max: 1 }),
    check: (st) => !!st.buildings.lot_main?.rooms.find((x) => x.subId === '101')?.household
  },
  {
    id: 'mq3',
    icon: 'bakery_ico',
    title: '부티크 단독 상가(빵집/카페/꽃집) 1곳 인수',
    reward: 280,
    focusShop: 'shop_bakery',
    progress: (st) => ({ cur: Math.min(1, Object.values(st.standaloneShops || {}).filter((s) => s.owned).length), max: 1 }),
    check: (st) => Object.values(st.standaloneShops || {}).some((s) => s.owned)
  },
  {
    id: 'mq4',
    icon: 'supercar_ico',
    title: '신규 차량(세단·슈퍼카·리무진) 1대 구매',
    reward: 350,
    openGarage: true,
    progress: (st) => ({ cur: Math.min(1, Math.max(0, (st.garage?.ownedCars?.length || 1) - 1)), max: 1 }),
    check: (st) => (st.garage?.ownedCars?.length || 1) >= 2
  },
  {
    id: 'mq5',
    icon: 'elevator',
    title: '201호 쓰리룸 개방 & 엘리베이터 시공',
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
    icon: 'stairs_ico',
    title: '302호 복층 로프트 하우스 개방',
    reward: 450,
    focusLot: 'lot_main',
    focusSubRoom: '302',
    progress: (st) => ({ cur: st.buildings.lot_main?.rooms.find((x) => x.subId === '302')?.unlocked ? 1 : 0, max: 1 }),
    check: (st) => !!st.buildings.lot_main?.rooms.find((x) => x.subId === '302')?.unlocked
  },
  {
    id: 'mq7',
    icon: 'bakery_ico',
    title: '단독 상가 3곳 모두 인수 달성',
    reward: 550,
    focusShop: 'shop_roastery',
    progress: (st) => ({ cur: Math.min(3, Object.values(st.standaloneShops || {}).filter((s) => s.owned).length), max: 3 }),
    check: (st) => Object.values(st.standaloneShops || {}).filter((s) => s.owned).length >= 3
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
    title: '페라리 슈퍼카 또는 골드 리무진 오너 등극',
    reward: 1200,
    openGarage: true,
    progress: (st) => ({ cur: (st.garage?.ownedCars || []).some((c) => c === 'car_supercar' || c === 'car_limo') ? 1 : 0, max: 1 }),
    check: (st) => (st.garage?.ownedCars || []).some((c) => c === 'car_supercar' || c === 'car_limo')
  }
];

window.createCustomSVGIcon = createCustomSVGIcon;
window.createFurnitureArtworkSVG = createFurnitureArtworkSVG;
window.createNotebookArtworkSVG = createNotebookArtworkSVG;
window.createHouseholdAvatarSVG = createHouseholdAvatarSVG;
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
window.CARE_BUBBLE_TYPES = CARE_BUBBLE_TYPES;
window.QUEST_LIST = QUEST_LIST;
