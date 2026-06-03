import React from 'react';
import { useStore } from '../store/useStore';
import { Cloud, CloudOff, AlertCircle, Check, Loader2 } from 'lucide-react';

export function SyncIndicator() {
  const { syncStatus, lastSyncedAt, syncError } = useStore();

  const statusConfig = {
    idle: { icon: Cloud, text: 'Local only', color: 'text-zinc-500' },
    syncing: { icon: Loader2, text: 'Saving...', color: 'text-indigo-400', animate: true },
    synced: { icon: Check, text: lastSyncedAt ? `Saved ${formatTimeAgo(lastSyncedAt)}` : 'Saved', color: 'text-emerald-400' },
    error: { icon: AlertCircle, text: syncError || 'Sync error', color: 'text-red-400' },
    offline: { icon: CloudOff, text: 'Offline', color: 'text-zinc-500' },
  };

  const config = statusConfig[syncStatus];
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-1.5 ${config.color}`} title={syncError || ''}>
      <Icon className={`w-3.5 h-3.5 ${(config as any).animate ? 'animate-spin' : ''}`} />
      <span className="text-[10px] font-medium">{config.text}</span>
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}
