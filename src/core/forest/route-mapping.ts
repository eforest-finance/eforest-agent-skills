import type { ApiRoute } from './types';

export function parseApiRouteFromEnv(
  skillName: string,
  action: string,
): ApiRoute | null {
  const rawMap =
    process.env.EFOREST_FOREST_API_ACTION_MAP_JSON ||
    process.env.FOREST_API_ACTION_MAP_JSON;
  if (!rawMap) return null;

  let parsed: any;
  try {
    parsed = JSON.parse(rawMap);
  } catch {
    return null;
  }

  const tuple = parsed?.[`${skillName}:${action}`];
  const nested = parsed?.[skillName]?.[action];
  const route = tuple || nested;
  if (!route) return null;

  if (typeof route === 'string') {
    return { method: 'GET', path: route, auth: true };
  }

  const method = String(route.method || 'GET').toUpperCase();
  const path = route.path || route.url;
  if (!path) return null;

  return {
    method: method as ApiRoute['method'],
    path,
    auth: route.auth !== false,
  };
}
