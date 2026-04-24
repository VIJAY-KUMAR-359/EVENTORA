import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Event, Feedback } from '@/lib/storage';
import { Star, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

interface EventFeedbackProps {
  event: Event;
  isRegistered: boolean;
  isEventPast: boolean;
}

export const EventFeedback = ({ event, isRegistered, isEventPast }: EventFeedbackProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [feedbacks, setFeedbacks] = useState<(Feedback & { event_id?: string | null })[]>([]);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const loadFeedbacks = async () => {
    const { data } = await supabase
      .from('feedbacks')
      .select('*')
      .eq('event_id', event.id)
      .order('created_at', { ascending: false });
    if (data) {
      setFeedbacks(data);
      if (user) {
        setHasSubmitted(data.some(f => f.user_id === user.id));
      }
    }
  };

  useEffect(() => { loadFeedbacks(); }, [event.id, user]);

  const handleSubmit = async () => {
    if (!user) return;
    if (rating === 0) {
      toast({ title: 'Rating required', description: 'Please select a star rating.', variant: 'destructive' });
      return;
    }
    if (!message.trim()) {
      toast({ title: 'Feedback required', description: 'Please write your feedback.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('feedbacks').insert({
      user_id: user.id,
      user_name: user.name,
      event_id: event.id,
      rating,
      message: message.trim(),
    });

    if (error) {
      toast({ title: 'Error', description: 'Could not submit feedback. Make sure you are registered for this event.', variant: 'destructive' });
    } else {
      toast({ title: 'Feedback Submitted!', description: 'Thank you for your feedback.' });
      setRating(0);
      setMessage('');
      await loadFeedbacks();
    }
    setSubmitting(false);
  };

  const avgRating = feedbacks.length > 0
    ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1)
    : null;

  const canSubmit = user && isRegistered && isEventPast && !hasSubmitted;

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Event Feedback
          {avgRating && (
            <span className="ml-auto text-sm font-normal text-muted-foreground flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> {avgRating} ({feedbacks.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Submit form */}
        {canSubmit && (
          <div className="space-y-3 border border-border rounded-lg p-4 bg-muted/30">
            <p className="text-sm font-medium text-foreground">Rate this event</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-7 w-7 ${
                      star <= (hoverRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                </button>
              ))}
            </div>
            <Textarea
              placeholder="Share your experience..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              maxLength={500}
              className="resize-none"
              rows={3}
            />
            <Button onClick={handleSubmit} disabled={submitting} size="sm">
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        )}

        {!isEventPast && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Feedback will be available after the event ends.
          </p>
        )}

        {isEventPast && !isRegistered && !feedbacks.length && (
          <p className="text-sm text-muted-foreground text-center py-2">
            No feedback yet for this event.
          </p>
        )}

        {isEventPast && isRegistered && hasSubmitted && (
          <p className="text-sm text-green-600 text-center py-1">✅ You've already submitted feedback for this event.</p>
        )}

        {/* Feedback list */}
        {feedbacks.length > 0 && isEventPast && (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {feedbacks.map(fb => (
              <div key={fb.id} className="border border-border rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{fb.user_name}</span>
                  <span className="text-xs text-muted-foreground">{format(new Date(fb.created_at), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={`h-3.5 w-3.5 ${s <= fb.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/20'}`} />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">{fb.message}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
