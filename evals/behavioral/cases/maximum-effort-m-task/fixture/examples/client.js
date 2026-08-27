export const EXPECTED_SERVICE_ID = 'orbit-core';

export async function fetchHealth(baseUrl) {
  return fetch(`${baseUrl}/health`);
}
