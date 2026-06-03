import React, { useEffect, useState } from 'react';
import { Zap, Clock, AlertTriangle } from 'lucide-react';

interface SpeedInfo {
  speedTier: 'fast' | 'standard' | 'slow' | 'unknown';
  responseTimeMs: number;
  model: string;
  status: string;
}

export function AISpeedBadge() {
  const [speed, setSpeed] = useState<SpeedInfo | null>(null);

  useEffect(() => {
    const checkSpeed = async () => {
      try {
        const res = await fetch('/api/v1/system/capabilities');
        if (res.ok) {
          const data = await res.json();
          setSpeed({
            speedTier: data.ollama.speedTier,
            responseTimeMs: data.ollama.responseTimeMs,
            model: data.ollama.model,
            status: data.ollama.status,
          });
        }
      } catch {}
    };
    checkSpeed();
    const interval = setInterval(checkSpeed, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (!speed) return null;

  const config = {
    fast: { icon: Zap, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', label: 'Fast' },
    standard: { icon: Clock, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20', label: 'Standard' },
    slow: { icon: AlertTriangle, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', label: 'Slow' },
    unknown: { icon: Clock, color: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20', label: 'Unknown' },
  };

  const { icon: Icon, color, label } = config[speed.speedTier];

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${color}`}
      title={`${speed.model} — ${speed.responseTimeMs}ms ping | Status: ${speed.status}`}
    >
      <Icon className="w-2.5 h-2.5" />
      {label} · {speed.model.split(':')[0]}
    </div>
  );
}
