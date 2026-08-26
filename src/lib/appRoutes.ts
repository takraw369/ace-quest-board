export const APP_ROUTES = {
  knowledge: '/knowledge',
  wantTo: '/want-to',
  quest: '/',
} as const;

export const LAYERS = [
  { key: 'knowledge', kanji: '知', label: 'Knowledge', href: APP_ROUTES.knowledge },
  { key: 'wantTo', kanji: '望', label: 'Want to', href: APP_ROUTES.wantTo },
  { key: 'quest', kanji: '行', label: 'Quest', href: APP_ROUTES.quest },
] as const;

export const WANT_TO_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1gkYpIk28ScWY5xlFfkjyyBVa0Cmx3pl_oQuJ5sC8ij4/edit';
