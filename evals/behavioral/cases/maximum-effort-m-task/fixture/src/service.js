export const SERVICE_ID = 'orbit-core';

export function healthStatus() {
  return { ok: true, service: SERVICE_ID };
}
