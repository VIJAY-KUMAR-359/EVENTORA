import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  getEventsByOrganizer, deleteEvent, getEventRegistrations, saveEvent, updateEvent, EVENT_CATEGORIES,
  createNotification, notifyInterestedUsers,
} from '@/lib/storage';
import type { Event } from '@/lib/storage';
import {
  Calendar, PlusCircle, Trash2, DollarSign, Users, CalendarDays, MapPin, Clock,
  Edit, BarChart3, Search, LayoutGrid, Radio, FileEdit, History, Copy, Send, Trophy, BookOpen,
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import myEventsHeroBg from '@/assets/myevents-hero-bg.jpeg';

type TabKey = 'all' | 'live' | 'drafts' | 'past';

interface EventWithMeta extends Event {
  regCount: number;
  revenue: number;
  status: 'live' | 'draft' | 'past' | 'upcoming';
}

const getStatus = (ev: Event): EventWithMeta['status'] => {
  if (ev.is_draft) return 'draft';
  const d = new Date(ev.date);
  if (isToday(d)) return 'live';
  if (isPast(d)) return 'past';
  return 'upcoming';
};

const MyEvents = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [events, setEvents] = useState<EventWithMeta[]>([]);
  const [tab, setTab] = useState<TabKey>('all');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('latest');

  const loadData = async (userId: string) => {
    const raw = await getEventsByOrganizer(userId);
    const enriched = await Promise.all(
      raw.map(async (ev) => {
        const regs = await getEventRegistrations(ev.id);
        const approvedRegs = regs.filter(r => r.payment_status === 'approved');
        const revenue = ev.fee_type === 'paid' && ev.fee_amount
          ? approvedRegs.length * ev.fee_amount
          : 0;
        return { ...ev, regCount: approvedRegs.length, revenue, status: getStatus(ev) };
      })
    );
    setEvents(enriched);
  };

  useEffect(() => { if (user) loadData(user.id); }, [user]);

  useEffect(() => { if (!user) navigate('/login'); }, [user, navigate]);

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteEvent(deleteId);
    toast({ title: 'Event Deleted', description: 'The event was deleted successfully.' });
    setDeleteId(null);
    loadData(user.id);
  };

  const handleReuse = async (ev: EventWithMeta) => {
    if (!user) return;
    const future = new Date();
    future.setDate(future.getDate() + 14);
    // Clone keeps poster & description; is_draft=true keeps it hidden until published.
    const cloned = await saveEvent({
      title: `${ev.title} (Copy)`,
      description: ev.description,
      venue: ev.venue,
      capacity: ev.capacity,
      duration: ev.duration,
      start_time: ev.start_time,
      date: future.toISOString().slice(0, 10),
      fee_amount: ev.fee_amount,
      fee_type: ev.fee_type,
      poster_url: ev.poster_url,
      image_url: ev.image_url,
      payment_scanner_url: ev.payment_scanner_url,
      organizer_id: user.id,
      organizer_name: ev.organizer_name,
      category: ev.category,
      is_draft: true,
    });
    if (cloned) {
      toast({ title: '📝 Draft Created', description: 'A reusable draft was created with the previous poster & description.' });
      loadData(user.id);
      navigate(`/edit-event/${cloned.id}`);
    }
  };

  const handlePublish = async (ev: EventWithMeta) => {
    if (!user) return;
    const updated = await updateEvent(ev.id, { is_draft: false });
    if (updated) {
      // Notify organizer
      await createNotification(
        user.id,
        ev.id,
        '🚀 Event Published!',
        `Your event "${ev.title}" is now live for registrations.`,
        'event_created'
      );
      // Notify users with matching interests
      const count = await notifyInterestedUsers(ev.id, ev.category, ev.title, user.id);
      toast({
        title: '🚀 Published!',
        description: count > 0
          ? `"${ev.title}" is now live. Notified ${count} interested user${count === 1 ? '' : 's'}.`
          : `"${ev.title}" is now visible to everyone.`,
      });
      loadData(user.id);
    } else {
      toast({ title: 'Failed to publish', description: 'Please try again.', variant: 'destructive' });
    }
  };

  const filtered = useMemo(() => {
    let list = [...events];
    if (tab === 'drafts') list = list.filter(e => e.status === 'draft');
    else if (tab === 'live') list = list.filter(e => e.status === 'live' || e.status === 'upcoming');
    else if (tab === 'past') list = list.filter(e => e.status === 'past');
    if (categoryFilter !== 'all') list = list.filter(e => e.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.title.toLowerCase().includes(q) || e.venue.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      // Always push past events to the bottom regardless of selected sort.
      const aPast = a.status === 'past' ? 1 : 0;
      const bPast = b.status === 'past' ? 1 : 0;
      if (aPast !== bPast) return aPast - bPast;

      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'date') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === 'popular') return b.regCount - a.regCount;
      // Default "latest": upcoming events sorted by event date ascending (soonest first).
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
    return list;
  }, [events, tab, categoryFilter, search, sortBy]);

  const stats = useMemo(() => {
    const totalEvents = events.length;
    const activeEvents = events.filter(e => e.status === 'live' || e.status === 'upcoming').length;
    const totalAttendees = events.reduce((s, e) => s + e.regCount, 0);
    const totalRevenue = events.reduce((s, e) => s + e.revenue, 0);
    const topEvent = [...events].sort((a, b) => b.regCount - a.regCount)[0] || null;
    return { totalEvents, activeEvents, totalAttendees, totalRevenue, topEvent };
  }, [events]);

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'all', label: 'All Events', icon: LayoutGrid },
    { key: 'live', label: 'Live', icon: Radio },
    { key: 'drafts', label: 'Drafts', icon: FileEdit },
    { key: 'past', label: 'Past', icon: History },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Hero */}
      <div
        className="relative bg-cover bg-center text-primary-foreground"
        style={{ backgroundImage: `url(${myEventsHeroBg})` }}
      >
        <div className="absolute inset-0 bg-black/10" />
        <div className="container mx-auto px-4 py-10 relative z-10">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight">
                Manage Your<br />Created Events.
              </h1>
              <p className="text-primary-foreground/80 mt-3 text-sm">
                Edit, track performance, and grow your audience.<br />
                All your creations in one place.
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="bg-background rounded-xl shadow-lg mt-6 p-2 flex flex-col md:flex-row gap-2">
            <div className="flex items-center gap-2 flex-1 px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="My Events Search..."
                className="border-0 focus-visible:ring-0 px-0"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="md:w-52 border-0 bg-transparent">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {EVENT_CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="md:w-48 border-0 bg-transparent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Sort by: Latest</SelectItem>
                <SelectItem value="oldest">Sort by: Oldest</SelectItem>
                <SelectItem value="date">Sort by: Event Date</SelectItem>
                <SelectItem value="popular">Sort by: Most Popular</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 flex-1">
        {/* Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {tabs.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  'flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all border',
                  active
                    ? 'bg-primary text-primary-foreground border-primary shadow-md'
                    : 'bg-card text-foreground border-border hover:border-primary/40'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>

        {/* Events grid */}
        {filtered.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {filtered.map(ev => <EventGridCard key={ev.id} event={ev} onEdit={() => navigate(`/edit-event/${ev.id}`)} onDelete={() => setDeleteId(ev.id)} onReuse={() => handleReuse(ev)} onAnalytics={() => navigate(`/event/${ev.id}`)} onPublish={() => handlePublish(ev)} />)}
          </div>
        ) : (
          <Card className="max-w-md mx-auto text-center mb-10">
            <CardContent className="py-12">
              <Calendar className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No events here</h3>
              <p className="text-muted-foreground mb-4 text-sm">No events match the selected filters.</p>
              <Link to="/create-event">
                <Button className="gap-2"><PlusCircle className="h-5 w-5" /> Create Event</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Planning an Event CTA - matches dashboard */}
        <section className="bg-foreground rounded-xl py-12 md:py-16 mb-8 -mx-4 sm:mx-0 sm:rounded-xl">
          <div className="container mx-auto px-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-background tracking-tight">PLANNING AN EVENT?</h2>
              <p className="text-background/70 mt-1 text-sm md:text-base">Reach thousands of eager attendees.</p>
            </div>
            <Link to="/create-event">
              <Button size="lg" className="bg-background text-foreground hover:bg-background/90 font-bold px-8 rounded-full tracking-widest text-sm">
                CREATE EVENT
              </Button>
            </Link>
          </div>
        </section>

        {/* Dashboard + Top Event */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Creator dashboard */}
          <Card className="bg-accent/20 border-accent/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <CalendarDays className="h-5 w-5 text-primary" />
                <h2 className="text-base font-bold uppercase tracking-wide">Your Creator Dashboard</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <StatTile icon={CalendarDays} color="text-primary" label="Total Events" value={stats.totalEvents.toString()} />
                <StatTile icon={Radio} color="text-green-600" label="Active Events" value={stats.activeEvents.toString()} />
                <StatTile icon={Users} color="text-primary" label="Total Attendees" value={stats.totalAttendees.toLocaleString()} />
                <StatTile icon={DollarSign} color="text-purple-600" label="Total Revenue" value={`₹${stats.totalRevenue.toLocaleString()}`} />
              </div>
            </CardContent>
          </Card>

          {/* Top event */}
          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <h2 className="text-base font-bold uppercase tracking-wide">Top Performing Event</h2>
              </div>
              {stats.topEvent ? (
                <div className="flex gap-4">
                  <div className="relative w-28 h-32 rounded-lg overflow-hidden flex-shrink-0">
                    {stats.topEvent.poster_url ? (
                      <img src={stats.topEvent.poster_url} alt={stats.topEvent.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
                        <Calendar className="h-8 w-8 text-primary/50" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground rounded px-1.5 py-0.5 text-[10px] font-bold leading-tight text-center">
                      <div>{format(new Date(stats.topEvent.date), 'MMM').toUpperCase()}</div>
                      <div className="text-sm">{format(new Date(stats.topEvent.date), 'd')}</div>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold uppercase line-clamp-2">{stats.topEvent.title}</h3>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /><span className="truncate">{stats.topEvent.venue}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /><span>{stats.topEvent.start_time}</span>
                    </div>
                    <div className="flex gap-4 mt-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Registrations</p>
                        <p className="text-lg font-bold">{stats.topEvent.regCount}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Revenue</p>
                        <p className="text-lg font-bold">₹{stats.topEvent.revenue.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" className="h-7 text-xs gap-1" onClick={() => navigate(`/edit-event/${stats.topEvent!.id}`)}>
                        <Edit className="h-3 w-3" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => navigate(`/event/${stats.topEvent!.id}`)}>
                        <BarChart3 className="h-3 w-3" /> Analytics
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No events yet — create your first one!</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Creator guide */}
        <Card className="bg-accent/10 border-accent/30 mb-8">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Need help? Check out our <Link to="/create-event" className="text-primary underline">Creator Guide</Link>.</p>
              <p className="text-sm text-muted-foreground mt-1">Learn more about hosting successful events on EVENTORA.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete the event and all registrations.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const StatTile = ({ icon: Icon, color, label, value }: { icon: any; color: string; label: string; value: string }) => (
  <div className="bg-card rounded-lg p-3 border border-border">
    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
      <Icon className={cn('h-4 w-4', color)} />
      <span>{label}</span>
    </div>
    <p className="text-xl font-bold">{value}</p>
  </div>
);

const EventGridCard = ({ event, onEdit, onDelete, onReuse, onAnalytics, onPublish }: {
  event: EventWithMeta;
  onEdit: () => void;
  onDelete: () => void;
  onReuse: () => void;
  onAnalytics: () => void;
  onPublish: () => void;
}) => {
  const d = new Date(event.date);
  const statusBadge = {
    live: { label: 'LIVE', className: 'bg-green-500 text-white' },
    draft: { label: 'DRAFT', className: 'bg-yellow-500 text-white' },
    past: { label: 'PAST', className: 'bg-muted text-muted-foreground' },
    upcoming: { label: 'UPCOMING', className: 'bg-primary text-primary-foreground' },
  }[event.status];

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all border-border/60">
      <div className="relative h-40 bg-muted overflow-hidden">
        {event.poster_url ? (
          <img src={event.poster_url} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Calendar className="h-10 w-10 text-primary/50" />
          </div>
        )}
        <div className="absolute top-3 left-3 bg-primary text-primary-foreground rounded px-2 py-1 text-center leading-none">
          <div className="text-[10px] font-bold">{format(d, 'MMM').toUpperCase()}</div>
          <div className="text-base font-bold">{format(d, 'd')}</div>
        </div>
        <Badge className={cn('absolute top-3 right-3 border-0', statusBadge.className)}>{statusBadge.label}</Badge>
      </div>
      <CardContent className="p-4">
        <h3 className="font-bold uppercase line-clamp-1">{event.title}</h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /><span className="truncate max-w-[120px]">{event.venue}</span></span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{event.start_time}</span>
        </div>
        <div className="flex gap-2 mt-3">
          {event.status === 'draft' ? (
            <>
              <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1" onClick={onEdit}>
                <Edit className="h-3 w-3" /> EDIT
              </Button>
              <Button size="sm" variant="default" className="flex-1 h-8 text-xs gap-1" onClick={onPublish}>
                <Send className="h-3 w-3" /> PUBLISH
              </Button>
            </>
          ) : event.status === 'past' ? (
            <>
              <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1" onClick={onAnalytics}>
                <BarChart3 className="h-3 w-3" /> ANALYTICS
              </Button>
              <Button size="sm" className="flex-1 h-8 text-xs gap-1" onClick={onReuse}>
                <Copy className="h-3 w-3" /> REUSE
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" className="flex-1 h-8 text-xs gap-1" onClick={onEdit}>
                <Edit className="h-3 w-3" /> EDIT EVENT
              </Button>
              <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1" onClick={onAnalytics}>
                <BarChart3 className="h-3 w-3" /> ANALYTICS
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <div>
            <p className="text-xl font-bold">{event.regCount}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Registrations</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold">₹{event.revenue.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Revenue</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MyEvents;
