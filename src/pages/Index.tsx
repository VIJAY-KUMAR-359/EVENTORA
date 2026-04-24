import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { getEvents, EVENT_CATEGORIES, EventCategory } from '@/lib/storage';
import type { Event } from '@/lib/storage';
import { EventCard } from '@/components/EventCard';
import { TestimonialsSection } from '@/components/TestimonialsSection';
import { Footer } from '@/components/Footer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, ArrowRight, Search, X, Filter, Globe, BookOpen, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { isPast, isToday } from 'date-fns';

const MONTHS = [
  { value: 'all', label: 'All Months' },
  { value: '0', label: 'January' }, { value: '1', label: 'February' }, { value: '2', label: 'March' },
  { value: '3', label: 'April' }, { value: '4', label: 'May' }, { value: '5', label: 'June' },
  { value: '6', label: 'July' }, { value: '7', label: 'August' }, { value: '8', label: 'September' },
  { value: '9', label: 'October' }, { value: '10', label: 'November' }, { value: '11', label: 'December' },
];

const Index = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [feeFilter, setFeeFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [events, setEvents] = useState<Event[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (videoRef.current) {
      videoRef.current.muted = next;
      if (!next) {
        videoRef.current.play().catch(() => {});
      }
    }
  };

  useEffect(() => {
    getEvents().then((all) => {
      // Hide drafts and past events from the public homepage
      const visible = all
        .filter((ev) => {
          if (ev.is_draft) return false;
          const d = new Date(ev.date);
          const isEventPast = isPast(d) && !isToday(d);
          return !isEventPast;
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setEvents(visible);
    });
  }, []);

  const clearFilters = () => {
    setCategoryFilter('all');
    setSearchQuery('');
    setFeeFilter('all');
    setMonthFilter('all');
    setShowAll(false);
  };

  const filteredEvents = useMemo(() => {
    let result = [...events];

    if (categoryFilter !== 'all') {
      result = result.filter((event) => event.category === categoryFilter);
    }

    if (feeFilter === 'free') {
      result = result.filter((event) => event.fee_type === 'free');
    } else if (feeFilter === 'paid') {
      result = result.filter((event) => event.fee_type === 'paid');
    } else if (feeFilter === 'low-to-high') {
      result = result.filter((event) => event.fee_type === 'paid');
      result.sort((a, b) => (a.fee_amount || 0) - (b.fee_amount || 0));
    } else if (feeFilter === 'high-to-low') {
      result = result.filter((event) => event.fee_type === 'paid');
      result.sort((a, b) => (b.fee_amount || 0) - (a.fee_amount || 0));
    }

    if (monthFilter !== 'all') {
      const month = parseInt(monthFilter);
      result = result.filter((event) => new Date(event.date).getMonth() === month);
    }

    // Default upcoming-first ordering (only when fee filter isn't actively sorting by price)
    if (feeFilter !== 'low-to-high' && feeFilter !== 'high-to-low') {
      result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((event) =>
        event.title.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query) ||
        event.venue.toLowerCase().includes(query) ||
        event.organizer_name.toLowerCase().includes(query)
      );
    }

    return result;
  }, [events, searchQuery, categoryFilter, feeFilter, monthFilter]);

  const hasActiveFilters = categoryFilter !== 'all' || searchQuery.trim() || feeFilter !== 'all' || monthFilter !== 'all';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <section className="relative overflow-hidden min-h-[400px] md:min-h-[500px] flex items-center justify-center bg-foreground">
        <video
          ref={videoRef}
          src="/videos/hero-bg.mp4"
          autoPlay
          loop
          muted={isMuted}
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute video' : 'Mute video'}
          className="absolute bottom-4 right-4 z-10 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
        >
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </Button>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">Browse All Events</h2>
            <p className="text-muted-foreground">Discover and register for upcoming events</p>
          </div>

          <div className="mb-8">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input type="text" placeholder="Search events..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-11" />
                </div>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-11">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="All Categories" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {EVENT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <span className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${cat.color}`} />
                          {cat.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={feeFilter} onValueChange={setFeeFilter}>
                  <SelectTrigger className="h-11">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="All Events" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    <SelectItem value="free">Free Only</SelectItem>
                    <SelectItem value="paid">Paid Only</SelectItem>
                    <SelectItem value="low-to-high">Price: Low → High</SelectItem>
                    <SelectItem value="high-to-low">Price: High → Low</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={monthFilter} onValueChange={setMonthFilter}>
                  <SelectTrigger className="h-11">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="All Months" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <span className="text-sm text-muted-foreground">{filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} found</span>
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7 gap-1">
                    <X className="h-3 w-3" /> Clear all filters
                  </Button>
                </div>
              )}
            </div>
          </div>

          {filteredEvents.length > 0 ? (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {(showAll ? filteredEvents : filteredEvents.slice(0, 9)).map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
              {!showAll && filteredEvents.length > 9 && (
                <div className="mt-8 text-center">
                  <Button variant="outline" size="lg" onClick={() => setShowAll(true)}>
                    See all ({filteredEvents.length - 9} more events)
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <CalendarDays className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {hasActiveFilters ? 'No events found' : 'No events yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {hasActiveFilters ? 'Try adjusting your filters or search terms' : 'Be the first to create an event!'}
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" onClick={clearFilters}>Clear all filters</Button>
              ) : user ? (
                <Link to="/create-event"><Button>Create Event</Button></Link>
              ) : (
                <Link to="/register"><Button>Get Started</Button></Link>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Planning an Event CTA */}
      <section className="bg-foreground py-12 md:py-16">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-background tracking-tight">PLANNING AN EVENT?</h2>
            <p className="text-background/70 mt-1 text-sm md:text-base">Reach thousands of eager attendees.</p>
          </div>
          <Link to={user ? "/create-event" : "/register"}>
            <Button size="lg" className="bg-background text-foreground hover:bg-background/90 font-bold px-8 rounded-full tracking-widest text-sm">
              CREATE EVENT
            </Button>
          </Link>
        </div>
      </section>

      {/* About Eventora */}
      <section className="py-16 md:py-24 bg-card">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="rounded-2xl overflow-hidden shadow-lg">
              <img src="/images/theme-bg.png" alt="Eventora - An Intelligent Platform for Streamlined Event Management" className="w-full h-auto object-cover" />
            </div>
            <div>
              <p className="text-primary font-semibold text-sm tracking-widest uppercase mb-2">About Eventora</p>
              <h2 className="text-2xl md:text-3xl font-extrabold text-foreground leading-tight mb-8">
                ABOUT EVENTORA:<br />CONNECTING YOU TO EXPERIENCE.
              </h2>
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { icon: Globe, label: 'DISCOVER', desc: 'Featured events' },
                  { icon: BookOpen, label: 'BOOK', desc: 'Secure registration' },
                  { icon: Sparkles, label: 'EXPERIENCE', desc: 'Join the community' },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col items-center text-center">
                    <div className="h-14 w-14 rounded-full border-2 border-muted flex items-center justify-center mb-3">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-xs font-bold tracking-wider text-foreground">{item.label}</span>
                    <span className="text-xs text-muted-foreground mt-0.5">{item.desc}</span>
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Eventora events platform empowers organizers, event planners, communities, and attendees to create, discover, and experience unforgettable moments — all from your browser.
              </p>
            </div>
          </div>
        </div>
      </section>

      <TestimonialsSection />

      {!user && (
        <section className="py-16 bg-gradient-to-r from-primary to-accent">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-primary-foreground mb-4">Ready to Start?</h2>
            <p className="text-primary-foreground/80 mb-6 max-w-xl mx-auto">Join EVENTORA today and start creating memorable events.</p>
            <Link to="/register">
              <Button size="lg" variant="secondary" className="gap-2">
                Create Free Account <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
};

export default Index;
