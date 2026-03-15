import React from 'react';
import { Zap, Activity, Volume2, Cpu, MapPin } from 'lucide-react';

type IconComp = React.ComponentType<any>;

const mapping: Record<string, { icon: IconComp; label: string; classes: string }> = {
  sound: { icon: Volume2, label: 'Sound', classes: 'bg-sky-50 text-sky-600' },
  microphone: { icon: Volume2, label: 'Microphone', classes: 'bg-sky-50 text-sky-600' },
  location: { icon: MapPin, label: 'Location', classes: 'bg-indigo-50 text-indigo-700' },
};

export const SensorChip: React.FC<{ name: string }> = ({ name }) => {
  if (!name) return null;
  const key = name.toLowerCase();
  const meta = mapping[key] || { icon: MapPin, label: name, classes: 'bg-muted/10 text-muted-foreground' };
  const Icon = meta.icon;
  return (
    <div className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-md text-2xs font-medium ${meta.classes}`}>
      <Icon className="h-3 w-3" />
      <span className="leading-none">{meta.label}</span>
    </div>
  );
};

export const TriggerBadge: React.FC<{ type?: string }> = ({ type }) => {
  if (!type) return null;
  const key = type.toLowerCase();
  const meta = mapping[key] || { icon: MapPin, label: type, classes: 'bg-muted/10 text-muted-foreground' };
  const Icon = meta.icon;
  return (
    <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-md text-xs font-semibold ${meta.classes}`}>
      <Icon className="h-4 w-4" />
      <span>{meta.label}</span>
    </div>
  );
};

export default SensorChip;
