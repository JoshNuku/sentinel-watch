export interface Sentinel {
  id: string;
  status: 'active' | 'inactive' | 'alert';
  location: {
    lat: number;
    lng: number;
  };
  lastSeen: string;
  battery: number;
}

export interface Alert {
  id: string;
  sentinelId: string;
  threatType: 'Excavator' | 'Water Pump' | 'Vehicle';
  timestamp: string;
  location: {
    lat: number;
    lng: number;
  };
  isVerified: boolean;
}

export const sentinels: Sentinel[] = [
  { id: 'ORN-001', status: 'active', location: { lat: 5.6037, lng: -0.1870 }, lastSeen: '2023-10-27T10:00:00Z', battery: 92 },
  { id: 'ORN-002', status: 'alert', location: { lat: 5.5560, lng: -0.2010 }, lastSeen: '2023-10-27T10:05:00Z', battery: 81 },
  { id: 'ORN-003', status: 'inactive', location: { lat: 5.6500, lng: -0.1980 }, lastSeen: '2023-10-26T18:00:00Z', battery: 23 },
  { id: 'ORN-004', status: 'active', location: { lat: 5.5800, lng: -0.1700 }, lastSeen: '2023-10-27T09:55:00Z', battery: 98 },
];

export const alerts: Alert[] = [
  { id: 'ALERT-001', sentinelId: 'ORN-002', threatType: 'Excavator', timestamp: '2023-10-27T10:04:30Z', location: { lat: 5.5560, lng: -0.2010 }, isVerified: false },
  { id: 'ALERT-002', sentinelId: 'ORN-007', threatType: 'Vehicle', timestamp: '2023-10-27T08:30:00Z', location: { lat: 5.6100, lng: -0.1800 }, isVerified: true },
];

export const getTimeAgo = (timestamp: string): string => {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return 'Just now';
};
