import http from 'http';

class HuaweiECSService {
  private isECSInstance: boolean | null = null;
  private instanceId: string | null = null;

  /**
   * Detect if running inside a Huawei Cloud ECS instance
   * Timeout of 1500ms to prevent blocking startup/requests on non-ECS local machines
   */
  async detectECSEnvironment(): Promise<boolean> {
    if (this.isECSInstance !== null) {
      return this.isECSInstance;
    }

    return new Promise((resolve) => {
      const options = {
        host: '169.254.169.254',
        path: '/latest/meta-data/instance-id',
        method: 'GET',
        timeout: 1500
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200 && data.trim()) {
            this.isECSInstance = true;
            this.instanceId = data.trim();
            console.info(`[HuaweiECS] Detected running on Huawei Cloud ECS instance: ${this.instanceId}`);
            resolve(true);
          } else {
            this.isECSInstance = false;
            resolve(false);
          }
        });
      });

      req.on('error', () => {
        this.isECSInstance = false;
        resolve(false);
      });

      req.on('timeout', () => {
        req.destroy();
        this.isECSInstance = false;
        resolve(false);
      });

      req.end();
    });
  }

  getInstanceId(): string | null {
    return this.instanceId;
  }
}

export const huaweiECSService = new HuaweiECSService();
