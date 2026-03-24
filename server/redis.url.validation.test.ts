import { describe, it, expect } from 'vitest';

describe('Redis URL Format Validation', () => {
  it('should have REDIS_URL configured', () => {
    const redisUrl = process.env.REDIS_URL;
    expect(redisUrl).toBeDefined();
    console.log('✅ REDIS_URL is configured');
  });

  it('should have valid Redis URL format', () => {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) return;

    // Should start with redis://
    expect(redisUrl).toMatch(/^redis:\/\//);
    console.log('✅ URL starts with redis://');
  });

  it('should have authentication in URL', () => {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) return;

    // Should have user:password format
    expect(redisUrl).toMatch(/redis:\/\/[^:]+:[^@]+@/);
    console.log('✅ URL contains authentication (user:password)');
  });

  it('should have host and port', () => {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) return;

    // Should have host:port after @
    expect(redisUrl).toMatch(/@[^:]+:\d+/);
    console.log('✅ URL contains host and port');
  });

  it('should parse Redis URL correctly', () => {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) return;

    try {
      const url = new URL(redisUrl);
      
      expect(url.protocol).toBe('redis:');
      expect(url.username).toBeDefined();
      expect(url.password).toBeDefined();
      expect(url.hostname).toBeDefined();
      expect(url.port).toBeDefined();

      console.log('✅ Redis URL parsed successfully');
      console.log(`   Protocol: ${url.protocol}`);
      console.log(`   User: ${url.username}`);
      console.log(`   Host: ${url.hostname}`);
      console.log(`   Port: ${url.port}`);
    } catch (error) {
      throw new Error(`Failed to parse Redis URL: ${error}`);
    }
  });

  it('should have correct credentials', () => {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) return;

    const url = new URL(redisUrl);
    
    // Check for expected credentials
    expect(url.username).toBe('default');
    expect(url.password).toBe('GHXEaECWgmLqosMigwjBgQiyxXdMSPIo');
    
    console.log('✅ Redis credentials are correct');
  });

  it('should be accessible from production environment', () => {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) return;

    const url = new URL(redisUrl);
    
    // In production, should use railway.internal
    // In development, would use external proxy
    const isProductionFormat = url.hostname.includes('railway') || url.hostname.includes('internal');
    const isDevelopmentFormat = url.hostname.includes('proxy') || url.hostname.includes('localhost');
    
    const isValidFormat = isProductionFormat || isDevelopmentFormat;
    expect(isValidFormat).toBe(true);
    
    console.log(`✅ Redis URL is valid for environment: ${url.hostname}`);
  });
});
