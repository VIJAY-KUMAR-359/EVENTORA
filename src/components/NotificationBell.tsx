import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  Notification,
} from '@/lib/storage';
import { format } from 'date-fns';

export const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    const [notifs, count] = await Promise.all([
      getUserNotifications(user.id),
      getUnreadNotificationCount(user.id),
    ]);
    setNotifications(notifs);
    setUnreadCount(count);
  }, [user]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleClick = async (n: Notification) => {
    await markNotificationAsRead(n.id);
    refresh();
    setOpen(false);
    if (n.event_id) {
      navigate(`/event/${n.event_id}`);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllNotificationsAsRead(user.id);
    refresh();
  };

  const handleViewAll = () => {
    setOpen(false);
    navigate('/notifications');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'payment_approved': return '✅';
      case 'payment_rejected': return '❌';
      case 'new_registration': return '🎫';
      case 'event_created': return '🎉';
      case 'interest_match': return '🎯';
      default: return '🔔';
    }
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={handleMarkAllRead}>
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              No notifications yet.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.slice(0, 5).map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left p-3 hover:bg-muted/50 transition-colors ${!n.read ? 'bg-accent/30' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base mt-0.5">{getTypeIcon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <span className="text-xs text-muted-foreground mt-1 block">
                        {format(new Date(n.created_at), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    {!n.read && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
        {/* View all link */}
        <div className="border-t border-border p-2">
          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={handleViewAll}>
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
