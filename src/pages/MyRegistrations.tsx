import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getUserRegistrations, getEventById, cancelRegistration, EVENT_CATEGORIES } from '@/lib/storage';
import type { Event, Registration } from '@/lib/storage';
import { Calendar, MapPin, Clock, Ticket, X, CalendarDays, CheckCircle2, AlertCircle, Search, Eye, ChevronDown, ClipboardList, TrendingUp, Hash, DollarSign } from 'lucide-react';
import { format, isPast, isToday, isFuture } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo } from 'react';
import { Footer } from '@/components/Footer';
import myEventsHeroBg from '@/assets/myevents-hero-bg.jpeg';

type TabFilter = 'upcoming' | 'attended' | 'cancelled' | 'all';

const MyRegistrations = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [registrationsWithEvents, setRegistrationsWithEvents] = useState<(Registration & { event: Event })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [activeTab, setActiveTab] = useState<TabFilter>('upcoming');
  const [visibleCount, setVisibleCount] = useState(6);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const loadData = async () => {
      const regs = await getUserRegistrations(user.id);
      const withEvents = await Promise.all(
        regs.map(async (reg) => {
          const event = await getEventById(reg.event_id);
          return event ? { ...reg, event } : null;
        })
      );
      setRegistrationsWithEvents(
        withEvents
          .filter((r): r is Registration & { event: Event } => r !== null)
          .sort((a, b) => new Date(b.registered_at).getTime() - new Date(a.registered_at).getTime())
      );
      setLoading(false);
    };
    loadData();
  }, [user]);

  const filteredRegistrations = useMemo(() => {
    let result = [...registrationsWithEvents];

    // Tab filter
    if (activeTab === 'upcoming') {
      result = result.filter(r => {
        const d = new Date(r.event.date);
        return isFuture(d) || isToday(d);
      });
    } else if (activeTab === 'attended') {
      result = result.filter(r => {
        const d = new Date(r.event.date);
        return isPast(d) && !isToday(d);
      });
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.event.title.toLowerCase().includes(q) ||
        r.event.venue.toLowerCase().includes(q) ||
        r.ticket.toLowerCase().includes(q)
      );
    }

    // Category
    if (categoryFilter !== 'all') {
      result = result.filter(r => r.event.category === categoryFilter);
    }

    // Sort — always push past/attended events to the bottom.
    const isEventPastFn = (d: Date) => isPast(d) && !isToday(d);
    result.sort((a, b) => {
      const aPast = isEventPastFn(new Date(a.event.date)) ? 1 : 0;
      const bPast = isEventPastFn(new Date(b.event.date)) ? 1 : 0;
      if (aPast !== bPast) return aPast - bPast;

      if (sortBy === 'oldest') {
        return new Date(a.registered_at).getTime() - new Date(b.registered_at).getTime();
      }
      if (sortBy === 'event-date') {
        return new Date(a.event.date).getTime() - new Date(b.event.date).getTime();
      }
      // 'newest' default: upcoming sorted by soonest event date first.
      return new Date(a.event.date).getTime() - new Date(b.event.date).getTime();
    });

    return result;
  }, [registrationsWithEvents, activeTab, searchQuery, categoryFilter, sortBy]);

  const stats = useMemo(() => {
    const total = registrationsWithEvents.length;
    const upcoming = registrationsWithEvents.filter(r => isFuture(new Date(r.event.date)) || isToday(new Date(r.event.date))).length;
    const attended = registrationsWithEvents.filter(r => isPast(new Date(r.event.date)) && !isToday(new Date(r.event.date))).length;
    const totalSpent = registrationsWithEvents.reduce((sum, r) => sum + (r.event.fee_amount || 0), 0);
    return { total, upcoming, attended, totalSpent };
  }, [registrationsWithEvents]);

  const highlightedReg = useMemo(() => {
    // Nearest upcoming event
    const upcoming = registrationsWithEvents
      .filter(r => isFuture(new Date(r.event.date)) || isToday(new Date(r.event.date)))
      .sort((a, b) => new Date(a.event.date).getTime() - new Date(b.event.date).getTime());
    return upcoming[0] || registrationsWithEvents[0] || null;
  }, [registrationsWithEvents]);

  const handleCancelRegistration = async (eventId: string, eventTitle: string) => {
    if (confirm(`Are you sure you want to cancel your registration for "${eventTitle}"?`)) {
      await cancelRegistration(user!.id, eventId);
      toast({ title: 'Registration Cancelled', description: `You are no longer registered for "${eventTitle}".` });
      const regs = await getUserRegistrations(user!.id);
      const withEvents = await Promise.all(
        regs.map(async (reg) => {
          const event = await getEventById(reg.event_id);
          return event ? { ...reg, event } : null;
        })
      );
      setRegistrationsWithEvents(withEvents.filter((r): r is Registration & { event: Event } => r !== null));
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background"><Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Please Login</h1>
          <p className="text-muted-foreground mb-6">You need to be logged in to view your registrations.</p>
          <Link to="/login"><Button>Login</Button></Link>
        </div>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen bg-background"><Navbar /><div className="container mx-auto px-4 py-16 text-center text-muted-foreground">Loading...</div></div>;

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'attended', label: 'Attended' },
    { key: 'all', label: 'All Registrations' },
  ];

  const visibleRegs = filteredRegistrations.slice(0, visibleCount);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Banner */}
      <div
        className="relative bg-cover bg-center text-primary-foreground"
        style={{ backgroundImage: `url(${myEventsHeroBg})` }}
      >
        <div className="absolute inset-0 bg-black/10" />
        <div className="container mx-auto px-4 py-10 relative z-10">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight">
                YOUR EVENT<br />ENROLLMENTS
              </h1>
              <p className="text-primary-foreground/80 mt-3 text-sm">
                Manage your registered events, access tickets, and get updates for the experiences you love.
              </p>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="bg-background rounded-xl shadow-lg mt-6 p-2 flex flex-col md:flex-row gap-2">
            <div className="flex items-center gap-2 flex-1 px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search your enrollments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                <SelectItem value="newest">Sort by: Newest</SelectItem>
                <SelectItem value="oldest">Sort by: Oldest</SelectItem>
                <SelectItem value="event-date">Sort by: Event Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setVisibleCount(6); }}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Event Cards Grid */}
        {visibleRegs.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {visibleRegs.map(({ id, ticket, registered_at, payment_status, event }) => {
                const eventDate = new Date(event.date);
                const isEventPast = isPast(eventDate) && !isToday(eventDate);
                const isEventToday = isToday(eventDate);

                return (
                  <Card key={id} className="overflow-hidden border-border/50 hover:shadow-lg transition-all group">
                    {/* Image */}
                    <div className="relative h-40 overflow-hidden">
                      {event.poster_url ? (
                        <img src={event.poster_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 via-accent/20 to-primary/10 flex items-center justify-center">
                          <Calendar className="h-10 w-10 text-primary/40" />
                        </div>
                      )}
                      {/* Date Badge */}
                      <div className="absolute top-2 left-2 bg-primary text-primary-foreground rounded-lg px-2.5 py-1 text-center leading-tight">
                        <div className="text-[10px] font-semibold uppercase">{format(eventDate, 'MMM')}</div>
                        <div className="text-lg font-bold -mt-0.5">{format(eventDate, 'd')}</div>
                      </div>
                      {/* Enrolled Badge */}
                      <Badge className="absolute top-2 right-2 bg-accent text-accent-foreground border-0 text-xs">
                        {isEventPast ? 'ATTENDED' : 'ENROLLED'}
                      </Badge>
                    </div>

                    <CardContent className="p-4 space-y-3">
                      <h3 className="font-bold text-foreground text-base line-clamp-1 uppercase">{event.title}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        <span className="line-clamp-1">{event.venue}</span>
                        {event.start_time && (
                          <>
                            <span className="mx-1">@</span>
                            <span>{event.start_time}</span>
                          </>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Access Code <span className="font-mono font-semibold text-foreground">#{ticket}</span>
                      </div>

                      {/* Payment status for paid events */}
                      {event.fee_type === 'paid' && (
                        <div className="text-xs">
                          {payment_status === 'approved' && (
                            <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="h-3 w-3" /> Payment Confirmed</span>
                          )}
                          {payment_status === 'pending' && (
                            <span className="flex items-center gap-1 text-yellow-600"><Clock className="h-3 w-3" /> Payment Under Review</span>
                          )}
                          {payment_status === 'rejected' && (
                            <span className="flex items-center gap-1 text-destructive"><AlertCircle className="h-3 w-3" /> Payment Rejected</span>
                          )}
                        </div>
                      )}

                      {/* Buttons */}
                      <div className="flex flex-col gap-2 pt-1">
                        <Link to={`/event/${event.id}`}>
                          <Button size="sm" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                            <Eye className="h-3.5 w-3.5 mr-1.5" /> View Details
                          </Button>
                        </Link>
                        {!isEventPast && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => handleCancelRegistration(event.id, event.title)}
                          >
                            <X className="h-3.5 w-3.5 mr-1.5" /> Cancel Registration
                          </Button>
                        )}
                      </div>

                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Load More */}
            {visibleCount < filteredRegistrations.length && (
              <div className="flex justify-center mt-8">
                <Button variant="outline" onClick={() => setVisibleCount(v => v + 6)}>
                  Load more
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <CalendarDays className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No Registrations Found</h3>
            <p className="text-muted-foreground mb-6">
              {activeTab === 'upcoming' ? "You don't have any upcoming events." : activeTab === 'attended' ? "You haven't attended any events yet." : "You haven't registered for any events yet."}
            </p>
            <Link to="/"><Button>Browse Events</Button></Link>
          </div>
        )}

        {/* Planning CTA */}
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

        {/* Enrollment Dashboard */}
        {registrationsWithEvents.length > 0 && (
          <div className="mt-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">YOUR ENROLLMENT DASHBOARD</h2>
            <Card className="border-border/50">
              <CardContent className="p-0 divide-y divide-border">
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <ClipboardList className="h-4 w-4" /> Total Enrollments:
                  </div>
                  <span className="text-lg font-bold text-foreground">{stats.total}</span>
                </div>
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4" /> Upcoming Events:
                  </div>
                  <span className="text-lg font-bold text-foreground">{stats.upcoming}</span>
                </div>
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Hash className="h-4 w-4" /> Access Codes:
                  </div>
                  <span className="text-lg font-bold text-foreground">{stats.total}</span>
                </div>
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4" /> Total Spent:
                  </div>
                  <span className="text-lg font-bold text-foreground">₹{stats.totalSpent.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Highlighted Enrollment */}
        {highlightedReg && (
          <div className="mt-10 mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-4">YOUR HIGHLIGHTED ENROLLMENT</h2>
            <Card className="overflow-hidden border-border/50 bg-gradient-to-r from-primary/5 to-accent/5">
              <div className="flex flex-col md:flex-row">
                <div className="w-full md:w-64 h-48 md:h-auto relative overflow-hidden">
                  {highlightedReg.event.poster_url ? (
                    <img src={highlightedReg.event.poster_url} alt={highlightedReg.event.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 via-accent/20 to-primary/10 flex items-center justify-center">
                      <Calendar className="h-12 w-12 text-primary/40" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 bg-primary text-primary-foreground rounded-lg px-2.5 py-1 text-center leading-tight">
                    <div className="text-[10px] font-semibold uppercase">{format(new Date(highlightedReg.event.date), 'MMM')}</div>
                    <div className="text-lg font-bold -mt-0.5">{format(new Date(highlightedReg.event.date), 'd')}</div>
                  </div>
                  <Badge className="absolute top-2 right-2 bg-accent text-accent-foreground border-0">ENROLLED</Badge>
                </div>
                <div className="flex-1 p-5 flex flex-col justify-center gap-2">
                  <h3 className="text-xl font-bold text-foreground uppercase">{highlightedReg.event.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    Ticket <span className="font-mono font-semibold text-foreground">#{highlightedReg.ticket}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Access Code: <span className="font-mono font-semibold text-primary">#{highlightedReg.ticket}</span>
                  </p>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>{highlightedReg.event.venue}</span>
                    {highlightedReg.event.start_time && (
                      <span className="ml-2">| {highlightedReg.event.start_time}</span>
                    )}
                  </div>
                  <Link to={`/event/${highlightedReg.event.id}`} className="mt-2">
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      <Ticket className="h-4 w-4 mr-2" /> VIEW TICKET
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default MyRegistrations;
