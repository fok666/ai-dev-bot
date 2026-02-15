import GeminiService from '../scripts/gemini-service.js';
import fs from 'fs';
import { jest } from '@jest/globals';

describe('GeminiService - Circuit Breaker', () => {
  let service;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key';
    
    service = new GeminiService({
      enableCaching: true,
      cacheDir: '.context-cache/test-circuit-breaker',
      circuitBreaker: {
        failureThreshold: 5,
        consecutiveFailureThreshold: 3,
        recoveryTimeout: 1000,
        halfOpenSuccessThreshold: 2,
      },
      retryAttempts: 1, // Disable retries for circuit breaker tests
      rateLimitPerHour: 100,
    });
  });

  afterEach(() => {
    if (fs.existsSync('.context-cache/test-circuit-breaker')) {
      fs.rmSync('.context-cache/test-circuit-breaker', { recursive: true, force: true });
    }
  });

  describe('circuit breaker initialization', () => {
    it('should initialize circuit breaker in CLOSED state', () => {
      const status = service.getCircuitBreakerStatus();
      
      expect(status.state).toBe('CLOSED');
      expect(status.failures).toBe(0);
      expect(status.consecutiveFailures).toBe(0);
      expect(status.successCount).toBe(0);
    });

    it('should initialize with correct thresholds', () => {
      expect(service.circuitBreaker.failureThreshold).toBe(5);
      expect(service.circuitBreaker.consecutiveFailureThreshold).toBe(3);
      expect(service.circuitBreaker.recoveryTimeout).toBe(1000);
      expect(service.circuitBreaker.halfOpenSuccessThreshold).toBe(2);
    });

    it('should not block requests when circuit is CLOSED', () => {
      expect(() => service.checkCircuitBreaker()).not.toThrow();
    });
  });

  describe('circuit breaker state transitions', () => {
    it('should transition from CLOSED to OPEN after consecutive failures', () => {
      // Record consecutive failures to open circuit
      for (let i = 0; i < 3; i++) {
        service.recordCircuitBreakerFailure(new Error('Test failure'));
      }

      const status = service.getCircuitBreakerStatus();
      expect(status.state).toBe('OPEN');
      expect(status.consecutiveFailures).toBe(3);
      expect(status.failures).toBe(3);
    });

    it('should block requests when circuit is OPEN', () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        service.recordCircuitBreakerFailure(new Error('Test failure'));
      }

      expect(() => service.checkCircuitBreaker()).toThrow(/Circuit breaker is OPEN/);
    });

    it('should transition from OPEN to HALF_OPEN after recovery timeout', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        service.recordCircuitBreakerFailure(new Error('Test failure'));
      }

      expect(service.circuitBreaker.state).toBe('OPEN');

      // Wait for recovery timeout (1000ms + buffer)
      await service.sleep(1100);

      // Check circuit breaker - should transition to HALF_OPEN
      service.checkCircuitBreaker();
      
      expect(service.circuitBreaker.state).toBe('HALF_OPEN');
      expect(service.circuitBreaker.successCount).toBe(0);
    });

    it('should transition from HALF_OPEN to CLOSED after successful requests', () => {
      // Manually set to HALF_OPEN
      service.circuitBreaker.state = 'HALF_OPEN';
      service.circuitBreaker.successCount = 0;

      // Record first success - should stay in HALF_OPEN
      service.recordCircuitBreakerSuccess();
      expect(service.circuitBreaker.state).toBe('HALF_OPEN');
      expect(service.circuitBreaker.successCount).toBe(1);

      // Record second success - should transition to CLOSED
      service.recordCircuitBreakerSuccess();
      expect(service.circuitBreaker.state).toBe('CLOSED');
      expect(service.circuitBreaker.consecutiveFailures).toBe(0);
      expect(service.circuitBreaker.failures).toBe(0);
    });

    it('should transition from HALF_OPEN back to OPEN on failure', () => {
      // Set to HALF_OPEN
      service.circuitBreaker.state = 'HALF_OPEN';
      service.circuitBreaker.successCount = 1;

      // Record failure - should reopen circuit
      service.recordCircuitBreakerFailure(new Error('Test failure'));

      expect(service.circuitBreaker.state).toBe('OPEN');
      expect(service.circuitBreaker.successCount).toBe(0);
    });

    it('should reset consecutive failures on success in CLOSED state', () => {
      // Introduce some failures
      service.circuitBreaker.consecutiveFailures = 2;
      expect(service.circuitBreaker.state).toBe('CLOSED');

      // Record success
      service.recordCircuitBreakerSuccess();

      expect(service.circuitBreaker.consecutiveFailures).toBe(0);
      expect(service.circuitBreaker.state).toBe('CLOSED');
    });
  });

  describe('circuit breaker manual control', () => {
    it('should allow manual reset of circuit breaker', () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        service.recordCircuitBreakerFailure(new Error('Test failure'));
      }

      expect(service.circuitBreaker.state).toBe('OPEN');
      expect(service.circuitBreaker.failures).toBeGreaterThan(0);

      // Manual reset
      service.resetCircuitBreaker();

      expect(service.circuitBreaker.state).toBe('CLOSED');
      expect(service.circuitBreaker.failures).toBe(0);
      expect(service.circuitBreaker.consecutiveFailures).toBe(0);
      expect(service.circuitBreaker.successCount).toBe(0);
    });

    it('should not throw after manual reset', () => {
      // Open circuit
      for (let i = 0; i < 3; i++) {
        service.recordCircuitBreakerFailure(new Error('Test failure'));
      }

      service.resetCircuitBreaker();

      // Should not throw
      expect(() => service.checkCircuitBreaker()).not.toThrow();
    });
  });

  describe('circuit breaker status and monitoring', () => {
    it('should provide detailed circuit breaker status', () => {
      service.recordCircuitBreakerFailure(new Error('Test'));

      const status = service.getCircuitBreakerStatus();

      expect(status).toHaveProperty('state');
      expect(status).toHaveProperty('failures');
      expect(status).toHaveProperty('consecutiveFailures');
      expect(status).toHaveProperty('successCount');
      expect(status).toHaveProperty('lastFailureTime');
      expect(status).toHaveProperty('lastStateChange');
      expect(status).toHaveProperty('timeSinceLastFailure');
      expect(status).toHaveProperty('timeInCurrentState');
      
      expect(status.failures).toBe(1);
      expect(status.consecutiveFailures).toBe(1);
      expect(status.lastFailureTime).not.toBeNull();
    });

    it('should generate CRITICAL alert when circuit is OPEN', () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        service.recordCircuitBreakerFailure(new Error('Test failure'));
      }

      const alerts = service.checkCircuitBreakerAlerts();

      expect(alerts.hasAlerts).toBe(true);
      expect(alerts.alerts.length).toBeGreaterThan(0);
      
      const criticalAlert = alerts.alerts.find(a => a.severity === 'CRITICAL');
      expect(criticalAlert).toBeDefined();
      expect(criticalAlert.state).toBe('OPEN');
      expect(criticalAlert.consecutiveFailures).toBe(3);
      expect(criticalAlert).toHaveProperty('action');
    });

    it('should generate WARNING alert when circuit is HALF_OPEN', () => {
      service.circuitBreaker.state = 'HALF_OPEN';
      service.circuitBreaker.successCount = 1;
      service.circuitBreaker.lastStateChange = Date.now();

      const alerts = service.checkCircuitBreakerAlerts();

      expect(alerts.hasAlerts).toBe(true);
      
      const warningAlert = alerts.alerts.find(a => a.severity === 'WARNING');
      expect(warningAlert).toBeDefined();
      expect(warningAlert.state).toBe('HALF_OPEN');
    });

    it.skip('should generate WARNING alert when approaching failure threshold', () => {
      // Record 2 failures to approach threshold (70% of 3 = 2.1, ceil = 2)
      // This should trigger warning but not open the circuit
      service.recordCircuitBreakerFailure(new Error('Test failure 1'));
      service.recordCircuitBreakerFailure(new Error('Test failure 2'));
      
      // Should still be CLOSED
      expect(service.circuitBreaker.state).toBe('CLOSED');

      const alerts = service.checkCircuitBreakerAlerts();

      expect(alerts.hasAlerts).toBe(true);
      
      const warningAlert = alerts.alerts.find(a => 
        a.severity === 'WARNING' && a.message.includes('Approaching')
      );
      expect(warningAlert).toBeDefined();
      expect(warningAlert.consecutiveFailures).toBe(2);
    });

    it('should not generate alerts when circuit is healthy', () => {
      const alerts = service.checkCircuitBreakerAlerts();

      expect(alerts.hasAlerts).toBe(false);
      expect(alerts.alerts).toHaveLength(0);
    });
  });

  describe('metrics export', () => {
    it('should export comprehensive metrics', () => {
      const metrics = service.exportMetrics();

      expect(metrics).toHaveProperty('timestamp');
      expect(metrics).toHaveProperty('service');
      expect(metrics.service).toBe('Gemini AI Service');
      
      expect(metrics).toHaveProperty('circuitBreaker');
      expect(metrics.circuitBreaker).toHaveProperty('state');
      expect(metrics.circuitBreaker).toHaveProperty('failures');
      expect(metrics.circuitBreaker).toHaveProperty('thresholds');
      expect(metrics.circuitBreaker).toHaveProperty('timings');
      
      expect(metrics).toHaveProperty('rateLimit');
      expect(metrics).toHaveProperty('costs');
      expect(metrics).toHaveProperty('health');
      expect(metrics).toHaveProperty('alerts');
      expect(metrics).toHaveProperty('stats');
    });

    it('should include circuit breaker thresholds in metrics', () => {
      const metrics = service.exportMetrics();

      expect(metrics.circuitBreaker.thresholds.failureThreshold).toBe(5);
      expect(metrics.circuitBreaker.thresholds.consecutiveFailureThreshold).toBe(3);
      expect(metrics.circuitBreaker.thresholds.halfOpenSuccessThreshold).toBe(2);
    });

    it('should show isOperational=false when circuit is OPEN', () => {
      // Open circuit
      for (let i = 0; i < 3; i++) {
        service.recordCircuitBreakerFailure(new Error('Test failure'));
      }

      const metrics = service.exportMetrics();

      expect(metrics.health.isOperational).toBe(false);
    });
  });

  describe('health checks', () => {
    it('should perform health check successfully', async () => {
      // Mock the generateContent method with a small delay to ensure latency > 0
      service.model.generateContent = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return {
          response: {
            text: () => 'OK'
          }
        };
      });

      const health = await service.performHealthCheck();

      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('latency');
      expect(health).toHaveProperty('circuitBreakerState');
      
      expect(health.healthy).toBe(true);
      expect(health.latency).toBeGreaterThanOrEqual(0);
      expect(health.circuitBreakerState).toBe('CLOSED');
    });

    it('should handle health check failure', async () => {
      // Mock failure
      service.model.generateContent = jest.fn().mockRejectedValue(new Error('API Error'));

      const health = await service.performHealthCheck();

      expect(health.healthy).toBe(false);
      expect(health.error).toBe('API Error');
      expect(health.latency).toBeNull();
    });

    it('should cache health check results', async () => {
      service.model.generateContent = jest.fn().mockResolvedValue({
        response: {
          text: () => 'OK'
        }
      });

      const health1 = await service.performHealthCheck();
      const health2 = await service.performHealthCheck();

      // Should use cached result
      expect(health1.timestamp).toBe(health2.timestamp);
      expect(service.model.generateContent).toHaveBeenCalledTimes(1);
    });

    it('should reset circuit breaker if health check passes while OPEN', async () => {
      // Open circuit
      for (let i = 0; i < 3; i++) {
        service.recordCircuitBreakerFailure(new Error('Test failure'));
      }

      expect(service.circuitBreaker.state).toBe('OPEN');

      // Wait for recovery timeout * 2
      await service.sleep(2100);

      // Mock successful health check
      service.model.generateContent = jest.fn().mockResolvedValue({
        response: {
          text: () => 'OK'
        }
      });

      await service.performHealthCheck();

      // Circuit should be reset
      expect(service.circuitBreaker.state).toBe('CLOSED');
    });

    it('should provide overall health status', () => {
      const status = service.getHealthStatus();

      expect(status).toHaveProperty('service');
      expect(status).toHaveProperty('timestamp');
      expect(status).toHaveProperty('circuitBreaker');
      expect(status).toHaveProperty('lastHealthCheck');
      expect(status).toHaveProperty('isOperational');
      expect(status).toHaveProperty('callCount');
      expect(status).toHaveProperty('callHistory');
      expect(status).toHaveProperty('costs');
      
      expect(status.isOperational).toBe(true);
    });
  });

  describe('graceful degradation', () => {
    it.skip('should use cached response when circuit is OPEN', async() => {
      // Cache a response first with the model name
      const prompt = 'Test prompt';
      const cachedResponse = 'Cached response';
      const selectedModel = service.config.defaultModel;
      service.cacheResponse(prompt, cachedResponse, selectedModel);
      
      // Verify cache was stored
      const cached = service.getCachedResponse(prompt, selectedModel);
      expect(cached).toBe(cachedResponse);

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        service.recordCircuitBreakerFailure(new Error('Test failure'));
      }

      // Mock API call to ensure it's not called
      service.model.generateContent = jest.fn();

      // Try to generate - should use cached response without throwing
      const result = await service.generate(prompt);

      expect(result).toBe(cachedResponse);
      expect(service.model.generateContent).not.toHaveBeenCalled();
    });

    it('should throw error when circuit is OPEN and no cache available', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        service.recordCircuitBreakerFailure(new Error('Test failure'));
      }

      // Try to generate without cache - should throw
      await expect(service.generate('New prompt without cache')).rejects.toThrow(/Circuit breaker is OPEN/);
    });

    it('should provide helpful error message with retry time', async () => {
      // Open circuit
      for (let i = 0; i < 3; i++) {
        service.recordCircuitBreakerFailure(new Error('Test failure'));
      }

      try {
        await service.generate('Test prompt');
        throw new Error('Should have thrown error');
      } catch (error) {
        expect(error.message).toMatch(/Circuit breaker is OPEN/);
        expect(error.message).toMatch(/Retry in \d+s/);
        expect(error.message).toMatch(/Consecutive failures: 3/);
      }
    });
  });
});
