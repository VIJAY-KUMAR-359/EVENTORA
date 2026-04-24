import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  Notification,
} from '@/lib/storage';
import { Bell, BellOff, CheckCheck, ArrowLeft, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

const Notifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

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
    if (!user) { navigate('/login'); return; }
    refresh();
  }, [user, refresh, navigate]);

  const handleMarkRead = async (n: Notification) => {
    if (!n.read) {
      await markNotificationAsRead(n.id);
      refresh();
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllNotificationsAsRead(user.id);
    refresh();
  };

  const handleNavigate = async (n: Notification) => {
    await handleMarkRead(n);
    if (n.event_id) navigate(`/event/${n.event_id}`);
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

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'payment_approved': return { label: 'Approved', variant: 'default' as const };
      case 'payment_rejected': return { label: 'Rejected', variant: 'destructive' as const };
      case 'new_registration': return { label: 'Registration', variant: 'secondary' as const };
      case 'event_created': return { label: 'New Event', variant: 'outline' as const };
      default: return { label: 'Info', variant: 'outline' as const };
    }
  };

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Bell className="h-6 w-6" /> Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">{unreadCount} unread</Badge>
              )}
            </h1>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="gap-2">
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({notifications.length})
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('unread')}
          >
            Unread ({unreadCount})
          </Button>
        </div>

        {/* Notification list */}
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <BellOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </h3>
              <p className="text-muted-foreground text-sm">
                {filter === 'unread'
                  ? "You're all caught up!"
                  : 'Notifications about your events and registrations will appear here.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((n) => {
              const badge = getTypeBadge(n.type);
              return (
                <Card
                  key={n.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    !n.read ? 'border-primary/50 bg-accent/20' : ''
                  }`}
                  onClick={() => handleNavigate(n)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Unread indicator */}
                      <div className="mt-1">
                        {!n.read ? (
                          <span className="block h-3 w-3 rounded-full bg-primary animate-pulse" />
                        ) : (
                          <span className="block h-3 w-3 rounded-full bg-muted" />
                        )}
                      </div>

                      {/* Icon */}
                      <span className="text-2xl mt-0.5">{getTypeIcon(n.type)}</span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">{n.title}</p>
                          <Badge variant={badge.variant} className="text-xs">{badge.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{n.message}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(n.created_at), 'MMM d, yyyy • h:mm a')}
                          </span>
                          {n.event_id && (
                            <span className="text-xs text-primary flex items-center gap-1">
                              <ExternalLink className="h-3 w-3" /> View Event
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
