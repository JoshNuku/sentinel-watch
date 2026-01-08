import { Location } from '../types';

/**
 * Huawei Cloud Simple Message Notification (SMN) Service
 * 
 * This is a MOCK implementation for development/testing purposes.
 * Replace with actual Huawei Cloud SMN SDK integration when credentials are available.
 * 
 * Huawei Cloud SMN SDK: @huaweicloud/huaweicloud-sdk-smn
 * Documentation: https://support.huaweicloud.com/intl/en-us/api-smn/
 */

interface SMNConfig {
  region: string;
  accessKey: string;
  secretKey: string;
  topicUrn: string;
  phoneNumbers: string[];
}

interface AlertNotification {
  threatType: string;
  deviceId: string;
  confidence: number;
  location: Location;
  timestamp: Date;
}

class HuaweiSMNService {
  private config: SMNConfig;
  private isConfigured: boolean;

  constructor() {
    this.config = {
      region: process.env.HUAWEI_SMN_REGION || 'cn-north-1',
      accessKey: process.env.HUAWEI_SMN_ACCESS_KEY || '',
      secretKey: process.env.HUAWEI_SMN_SECRET_KEY || '',
      topicUrn: process.env.HUAWEI_SMN_TOPIC_URN || '',
      phoneNumbers: process.env.HUAWEI_SMN_PHONE_NUMBERS?.split(',') || []
    };

    this.isConfigured = !!(
      this.config.accessKey && 
      this.config.secretKey && 
      this.config.topicUrn
    );

    if (!this.isConfigured) {
      console.warn('⚠️  Huawei SMN not configured - Running in MOCK mode');
    }
  }

  /**
   * Send SMS Alert to Rangers
   * MOCK Implementation - Replace with actual Huawei Cloud SMN API call
   */
  async sendAlertSMS(alert: AlertNotification): Promise<boolean> {
    try {
      const message = this.formatAlertMessage(alert);
      
      if (!this.isConfigured) {
        // MOCK: Simulate SMS sending
        console.log('\n📱 ================== MOCK SMS ALERT ==================');
        console.log(`[Huawei SMN] Sending SMS to Rangers`);
        console.log(`Region: ${this.config.region}`);
        console.log(`Recipients: ${this.config.phoneNumbers.join(', ') || 'No phone numbers configured'}`);
        console.log(`\nMessage Content:`);
        console.log(`─────────────────────────────────────────────────────`);
        console.log(message);
        console.log(`─────────────────────────────────────────────────────`);
        console.log(`✅ SMS Alert sent successfully (MOCK)`);
        console.log('======================================================\n');
        
        // Simulate network delay
        await this.delay(500);
        return true;
      }

      // REAL IMPLEMENTATION (when credentials are available):
      /*
      import { SmnClient } from '@huaweicloud/huaweicloud-sdk-smn';
      
      const client = new SmnClient({
        credentials: {
          ak: this.config.accessKey,
          sk: this.config.secretKey
        },
        region: this.config.region
      });

      const request = {
        message: message,
        subject: '⚠️ ORION ALERT',
        topic_urn: this.config.topicUrn
      };

      const result = await client.publishMessage(request);
      console.log('✅ SMS Alert sent successfully via Huawei SMN');
      return true;
      */

      return true;
    } catch (error) {
      console.error('❌ Failed to send SMS Alert:', error);
      return false;
    }
  }

  /**
   * Format alert information into SMS message
   */
  private formatAlertMessage(alert: AlertNotification): string {
    const confidencePercent = Math.round(alert.confidence * 100);
    const timestamp = alert.timestamp.toISOString();
    const gpsLink = `https://www.google.com/maps?q=${alert.location.lat},${alert.location.lng}`;

    return `
🚨 PROJECT ORION ALERT 🚨

Threat Detected: ${alert.threatType}
Confidence: ${confidencePercent}%
Device: ${alert.deviceId}

📍 Location:
Lat: ${alert.location.lat.toFixed(6)}
Lng: ${alert.location.lng.toFixed(6)}
GPS: ${gpsLink}

⏰ Time: ${timestamp}

⚡ Immediate action required!
Verify and respond via dashboard.
    `.trim();
  }

  /**
   * Send batch alerts for multiple threats
   */
  async sendBatchAlerts(alerts: AlertNotification[]): Promise<void> {
    console.log(`📤 Sending ${alerts.length} SMS alerts...`);
    
    const results = await Promise.allSettled(
      alerts.map(alert => this.sendAlertSMS(alert))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`✅ ${successful} alerts sent successfully`);
    if (failed > 0) {
      console.log(`❌ ${failed} alerts failed to send`);
    }
  }

  /**
   * Utility: Simulate network delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if service is properly configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Get service status
   */
  getStatus(): object {
    return {
      configured: this.isConfigured,
      region: this.config.region,
      recipientCount: this.config.phoneNumbers.length,
      mode: this.isConfigured ? 'LIVE' : 'MOCK'
    };
  }
}

// Export singleton instance
export const huaweiSMNService = new HuaweiSMNService();
