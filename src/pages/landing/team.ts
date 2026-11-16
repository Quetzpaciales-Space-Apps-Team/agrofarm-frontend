/** Who built AgroFarm and where the code lives. Real names can replace the handles here. */
const ORG = 'https://github.com/Quetzpaciales-Space-Apps-Team';

export const TEAM = [
  'eldmark',
  'jdivass',
  'MarceloDetlefsen',
  'JorgeVilledaS',
  'angcoder-c',
  'MagicBag-tab',
] as const;

export const profileUrl = (handle: string) => `https://github.com/${handle}`;

export const REPOS = [
  { id: 'frontend', name: 'agrofarm-frontend', url: `${ORG}/agrofarm-frontend` },
  { id: 'api', name: 'agrofarm-api', url: `${ORG}/agrofarm-api` },
  { id: 'analytic', name: 'agrofarm-analytic', url: `${ORG}/agrofarm-analytic` },
  { id: 'docs', name: 'agrofarm-docs', url: `${ORG}/agrofarm-docs` },
] as const;

export const CREDITS_URL = `${ORG}/agrofarm-frontend/blob/develop/public/landing/CREDITS.md`;
