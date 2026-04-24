import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, User, Clock, Users, IndianRupee } from 'lucide-react';
import { Event, getEventRegistrations, EVENT_CATEGORIES } from '@/lib/storage';
import { format, isPast, isToday } from 'date-fns';

interface EventCardProps {
  event: Event;
  showActions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const EventCard = ({ event, showActions, onEdit, onDelete }: EventCardProps) => {
  const eventDate = new Date(event.date);
  const isEventPast = isPast(eventDate) && !isToday(eventDate);
  const isEventToday = isToday(eventDate);
  const [regCount, setRegCount] = useState(0);

  useEffect(() => {
    getEventRegistrations(event.id).then((regs) => setRegCount(regs.length));
  }, [event.id]);

  const spotsLeft = event.capacity ? event.capacity - regCount : null;
  const categoryInfo = EVENT_CATEGORIES.find(c => c.value === event.category);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30">
      <div className="h-40 relative overflow-hidden">
        {event.poster_url ? (
          <img 
            src={event.poster_url} 
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-accent/20 to-primary/10 flex items-center justify-center">
            <Calendar className="h-12 w-12 text-primary/40" />
          </div>
        )}
        {categoryInfo && (
          <Badge className={`absolute top-3 left-3 ${categoryInfo.color} text-white border-0`}>
            {categoryInfo.label}
          </Badge>
        )}
        {isEventPast && (
          <Badge variant="secondary" className="absolute top-3 right-3">Past Event</Badge>
        )}
        {isEventToday && (
          <Badge className="absolute top-3 right-3 bg-accent text-accent-foreground">Today!</Badge>
        )}
        {spotsLeft !== null && spotsLeft <= 10 && spotsLeft > 0 && !isEventPast && !isEventToday && (
          <Badge variant="destructive" className="absolute top-3 right-3">{spotsLeft} spots left</Badge>
        )}
        {spotsLeft !== null && spotsLeft <= 0 && !isEventPast && (
          <Badge variant="secondary" className="absolute top-3 right-3">Sold Out</Badge>
        )}
      </div>
      
      <CardHeader className="pb-2">
        <h3 className="text-lg font-semibold line-clamp-1 group-hover:text-primary transition-colors">{event.title}</h3>
      </CardHeader>
      
      <CardContent className="space-y-2 pb-3">
        <p className="text-sm text-muted-foreground line-clamp-2">{event.description || 'No description available'}</p>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 text-primary" />
          <span>{format(eventDate, 'MMM d, yyyy')}</span>
          {event.start_time && (
            <>
              <span className="text-muted-foreground/50">•</span>
              <Clock className="h-4 w-4 text-primary" />
              <span>{event.start_time}</span>
            </>
          )}
        </div>

        {event.duration && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 text-primary" />
            <span>Duration: {formatDuration(event.duration)}</span>
          </div>
        )}
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="line-clamp-1">{event.venue}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4 text-primary" />
            <span className="line-clamp-1">{event.organizer_name}</span>
          </div>
          <div className="flex items-center gap-2">
            {event.fee_type === 'paid' && event.fee_amount ? (
              <Badge variant="outline" className="text-xs gap-1 border-green-500/30 text-green-600">
                <IndianRupee className="h-3 w-3" />
                {event.fee_amount}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs border-primary/30 text-primary">Free</Badge>
            )}
            {event.capacity && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="h-4 w-4 text-primary" />
                <span>{regCount}/{event.capacity}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-0 gap-2">
        <Link to={`/event/${event.id}`} className="flex-1">
          <Button variant="outline" className="w-full" size="sm">View Details</Button>
        </Link>
        {showActions && (
          <>
            <Button variant="ghost" size="sm" onClick={onEdit}>Edit</Button>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={onDelete}>Delete</Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
};
