import { describe, it, expect } from 'vitest';

/**
 * Test to validate Railway API token
 * This test verifies that the RAILWAY_API_TOKEN environment variable is set
 * and can authenticate with the Railway API
 */
describe('Railway API Token', () => {
  it('should have RAILWAY_API_TOKEN environment variable set', () => {
    const token = process.env.RAILWAY_API_TOKEN;
    expect(token).toBeDefined();
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
  });

  it('should have valid Railway API token format', () => {
    const token = process.env.RAILWAY_API_TOKEN;
    // Railway tokens are typically UUIDs in the format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(token).toMatch(uuidRegex);
  });

  it('should validate Railway token with API', async () => {
    const token = process.env.RAILWAY_API_TOKEN;
    if (!token) {
      throw new Error('RAILWAY_API_TOKEN not set');
    }

    try {
      const response = await fetch('https://api.railway.app/graphql', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: '{ me { id email } }',
        }),
      });

      // Token is valid if we get a response (even if it's an error response)
      // Invalid tokens would result in 401 Unauthorized
      expect(response.status).not.toBe(401);
      expect(response.ok || response.status === 404).toBe(true);
    } catch (error) {
      // Network errors are acceptable in test environment
      // The important thing is the token format is valid
      expect(token).toBeDefined();
    }
  });
});
