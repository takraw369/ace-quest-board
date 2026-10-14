// Only a manually copied display-name candidate. NOT proof of identity or auth.
export function parseJevNameHandoff(input) {
  if (typeof input !== 'string' || input.length > 512 || !input.trim()) return null;
  let object;
  try { object = JSON.parse(input); } catch { return null; }
  if (!object || Array.isArray(object) || typeof object !== 'object') return null;
  if (object.type !== 'masa-jev-name' || object.version !== 1 || typeof object.name !== 'string') return null;
  const name = object.name.trim();
  if (!name || name.length > 80 || /[<>\r\n\u0000-\u001f]/.test(name)) return null;
  return name;
}
