"use client";

import React from 'react';
import { AppNotification } from '../types';
import {
  Bell,
  CheckCheck,
  Trash2,
  CheckCircle2,
  Info,
  AlertTriangle,
  X,
} from 'lucide-react';

interface NotificationCenterProps {
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (id: string) => void;
  onClearAllNotifications?: () => void;
  onNavigateTab?: (tab: string) => void;
  onClose?: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onClearAllNotifications,
  onNavigateTab,
  onClose,
}) => {
  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-sky-400 shrink-0" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#021231] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/40 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(214,158,37,0.04)_0%,transparent_50%)]" />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 relative z-10">
        {/* Header simple */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D69E25]/15 border border-[#D69E25]/40 text-[#D69E25] flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white">Notifications</h1>
              {unreadCount > 0 && (
                <span className="text-[10px] text-slate-400 font-semibold">
                  {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="px-3 py-2 bg-[#D69E25]/10 border border-[#D69E25]/40 text-[#D69E25] hover:bg-[#D69E25] hover:text-[#021231] font-bold text-[10px] rounded-xl transition flex items-center gap-1.5"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Tout lire
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Liste simple des notifications */}
        <div className="space-y-2.5">
          {notifications.length === 0 ? (
            <div className="text-center py-16 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl space-y-3">
              <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6 text-slate-500" />
              </div>
              <p className="text-sm font-bold text-white">Aucune notification</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Vous recevrez des alertes ici lors de vos achats, inscriptions et mises à jour.
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start gap-3 p-4 rounded-2xl border transition-all ${
                  !notification.read
                    ? 'bg-[#D69E25]/5 border-[#D69E25]/30'
                    : 'bg-white/[0.03] border-white/10 hover:border-[#D69E25]/30'
                }`}
              >
                <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  !notification.read ? 'bg-[#D69E25]/15 border border-[#D69E25]/30' : 'bg-white/5 border border-white/10'
                }`}>
                  {getIcon(notification.type)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-sm font-bold ${!notification.read ? 'text-white' : 'text-slate-300'}`}>
                      {notification.title}
                    </h4>
                    {!notification.read && (
                      <span className="w-2 h-2 rounded-full bg-[#D69E25] shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1">
                    {notification.message}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-slate-500 font-medium">{notification.date}</span>
                    {notification.linkTab && onNavigateTab && (
                      <button
                        onClick={() => {
                          if (!notification.read) onMarkAsRead(notification.id);
                          onNavigateTab(notification.linkTab!);
                        }}
                        className="text-[10px] text-[#D69E25] hover:text-amber-300 font-bold"
                      >
                        Voir
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!notification.read && (
                    <button
                      onClick={() => onMarkAsRead(notification.id)}
                      className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition"
                      title="Marquer comme lu"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => onDeleteNotification(notification.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bouton fermer en bas si onClose fourni */}
        {onClose && notifications.length > 0 && (
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white text-xs font-bold transition"
          >
            Fermer
          </button>
        )}
      </div>
    </div>
  );
};