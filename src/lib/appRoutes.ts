export const APP_ROUTES = {
  onboarding: '/onboarding',
  dictionary: '/dictionary',
  knowledge: '/knowledge',
  knowledgeLibrary: '/knowledge',
  knowledgeMap: '/knowledge/map',
  knowledgeAsk: '/knowledge/ask',
  profile: '/profile',
  wantTo: '/want-to',
  questRouter: '/quest-router',
  quest: '/',
  myAce: '/my-ace',
  today: '/today',
} as const;

export const LAYERS = [
  { key: 'knowledge', kanji: '知', label: 'Knowledge', href: APP_ROUTES.knowledge },
  { key: 'wantTo', kanji: '望', label: 'Want to', href: APP_ROUTES.wantTo },
  { key: 'quest', kanji: '行', label: 'Quest', href: APP_ROUTES.questRouter },
] as const;

export const WANT_TO_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1gkYpIk28ScWY5xlFfkjyyBVa0Cmx3pl_oQuJ5sC8ij4/edit';
