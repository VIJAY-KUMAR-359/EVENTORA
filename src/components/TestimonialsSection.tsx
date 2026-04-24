import { useState, useRef, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { getFeedbacks, saveFeedback, Feedback } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

const StarRating = ({ rating, onRate, interactive = false }: { rating: number; onRate?: (r: number) => void; interactive?: boolean }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={`h-4 w-4 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'} ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
        onClick={() => interactive && onRate?.(star)}
      />
    ))}
  </div>
);

const FeedbackCard = ({ feedback }: { feedback: Feedback }) => (
  <div className="min-w-[280px] max-w-[300px] bg-card border border-border rounded-xl p-5 flex flex-col gap-3 shrink-0 snap-start">
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
        {feedback.user_name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground truncate">{feedback.user_name}</p>
        <StarRating rating={feedback.rating} />
      </div>
      <span className="text-xs text-muted-foreground">{feedback.rating}/5</span>
    </div>
    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">"{feedback.message}"</p>
  </div>
);

export const TestimonialsSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [newRating, setNewRating] = useState(0);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    getFeedbacks().then(setFeedbacks);
  }, []);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!user) return toast({ title: 'Please login to submit feedback', variant: 'destructive' });
    if (newRating === 0) return toast({ title: 'Please select a rating', variant: 'destructive' });
    if (!newMessage.trim()) return toast({ title: 'Please write a message', variant: 'destructive' });

    const result = await saveFeedback({
      user_id: user.id,
      user_name: user.name,
      rating: newRating,
      message: newMessage.trim(),
    });

    if (result) {
      const updated = await getFeedbacks();
      setFeedbacks(updated);
      setNewRating(0);
      setNewMessage('');
      toast({ title: 'Thank you for your feedback!' });
    } else {
      toast({ title: 'Failed to submit feedback', variant: 'destructive' });
    }
  };

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <p className="text-sm font-medium text-primary tracking-wider uppercase mb-1">Testimonials</p>
          <h2 className="text-3xl font-bold text-foreground">What Attendees Are Saying</h2>
        </div>

        {feedbacks.length > 0 && (
          <div className="relative mb-10">
            <Button variant="outline" size="icon" className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-8 w-8 rounded-full bg-card shadow-md" onClick={() => scroll('left')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2 px-1">
              {feedbacks.map((fb) => <FeedbackCard key={fb.id} feedback={fb} />)}
            </div>
            <Button variant="outline" size="icon" className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-8 w-8 rounded-full bg-card shadow-md" onClick={() => scroll('right')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="max-w-lg mx-auto bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold text-foreground mb-3 text-center">Share Your Experience</h3>
          <div className="flex justify-center mb-3">
            <StarRating rating={newRating} onRate={setNewRating} interactive />
          </div>
          <Textarea
            placeholder="Tell us about your experience..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="mb-3 resize-none"
            rows={3}
          />
          <Button onClick={handleSubmit} className="w-full gap-2">
            <Send className="h-4 w-4" /> Submit Feedback
          </Button>
        </div>
      </div>
    </section>
  );
};
