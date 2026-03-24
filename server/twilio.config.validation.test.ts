import { describe, it, expect } from 'vitest';

/**
 * Twilio Configuration Validation Tests
 * Validates that Twilio credentials are properly configured
 */

describe('Twilio Configuration Validation', () => {
  it('should have TWILIO_ACCOUNT_SID configured', () => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    expect(accountSid).toBeDefined();
    expect(accountSid).toBeTruthy();
  });

  it('should have valid Twilio Account SID format', () => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    // Twilio Account SID format: AC followed by 32 alphanumeric characters
    const twilioSidRegex = /^AC[a-z0-9]{32}$/i;
    expect(accountSid).toMatch(twilioSidRegex);
  });

  it('should have TWILIO_AUTH_TOKEN configured', () => {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    expect(authToken).toBeDefined();
    expect(authToken).toBeTruthy();
  });

  it('should have TWILIO_PHONE_NUMBER configured', () => {
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
    expect(phoneNumber).toBeDefined();
    expect(phoneNumber).toBeTruthy();
  });

  it('should validate Twilio Account SID is not empty', () => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    expect(accountSid?.length).toBeGreaterThan(0);
  });

  it('should validate Twilio Account SID starts with AC', () => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    expect(accountSid).toMatch(/^AC/);
  });

  it('should have all required Twilio credentials', () => {
    const requiredCredentials = {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    };

    expect(requiredCredentials.accountSid).toBeDefined();
    expect(requiredCredentials.authToken).toBeDefined();
    expect(requiredCredentials.phoneNumber).toBeDefined();
  });

  it('should confirm Twilio is ready for SMS notifications', () => {
    const isConfigured =
      !!process.env.TWILIO_ACCOUNT_SID &&
      !!process.env.TWILIO_AUTH_TOKEN &&
      !!process.env.TWILIO_PHONE_NUMBER;

    expect(isConfigured).toBe(true);
  });
});
