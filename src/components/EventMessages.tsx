import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { createNotification } from '@/lib/storage';
import type { Event } from '@/lib/storage';
import { MessageSquare, Send, Loader2, Reply, CheckCircle2, User } from 'lucide-react';
import { format } from 'date-fns';

interface EventMessage {
  id: string;
  event_id: string;
  sender_id: string;
  sender_name: string;
  organizer_id: string;
  message: string;
  reply: string | null;
  replied_at: string | null;
  created_at: string;
}

interface Props {
  event: Event;
  mode: 'sender' | 'organizer';
}

export const EventMessages = ({ event, mode }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<EventMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replying, setReplying] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from('event_messages')
      .select('*')
      .eq('event_id', event.id)
      .order('created_at', { ascending: false });

    if (mode === 'sender') query = query.eq('sender_id', user.id);

    const { data, error } = await query;
    if (error) console.error('Load messages error:', error);
    setMessages((data as EventMessage[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [event.id, user?.id, mode]);

  const handleSend = async () => {
    if (!user) {
      toast({ title: 'Login Required', description: 'Please login to send a message.', variant: 'destructive' });
      return;
    }
    const text = newMessage.trim();
    if (!text) return;
    if (text.length > 1000) {
      toast({ title: 'Too long', description: 'Message must be under 1000 characters.', variant: 'destructive' });
      return;
    }

    setSending(true);
    const { error } = await supabase.from('event_messages').insert({
      event_id: event.id,
      sender_id: user.id,
      sender_name: user.name,
      organizer_id: event.organizer_id,
      message: text,
    });

    if (error) {
      toast({ title: 'Failed to send', description: error.message, variant: 'destructive' });
    } else {
      // Notify organizer
      await createNotification(
        event.organizer_id,
        event.id,
        '💬 New Question',
        `${user.name} sent a question about "${event.title}".`,
        'event_message'
      );
      toast({ title: '✅ Message sent', description: 'The organizer will be notified.' });
      setNewMessage('');
      load();
    }
    setSending(false);
  };

  const handleReply = async (msg: EventMessage) => {
    const text = (replyDrafts[msg.id] || '').trim();
    if (!text) return;
    if (text.length > 1000) {
      toast({ title: 'Too long', description: 'Reply must be under 1000 characters.', variant: 'destructive' });
      return;
    }
    setReplying(msg.id);
    const { error } = await supabase
      .from('event_messages')
      .update({ reply: text, replied_at: new Date().toISOString() })
      .eq('id', msg.id);

    if (error) {
      toast({ title: 'Failed to reply', description: error.message, variant: 'destructive' });
    } else {
      // Notify sender
      await createNotification(
        msg.sender_id,
        event.id,
        '💬 Organizer Replied',
        `The organizer replied to your question about "${event.title}".`,
        'event_message_reply'
      );
      toast({ title: '✅ Reply sent', description: 'The user has been notified.' });
      setReplyDrafts(d => ({ ...d, [msg.id]: '' }));
      load();
    }
    setReplying(null);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          {mode === 'organizer' ? `Participant Questions (${messages.length})` : 'Ask the Organizer'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {mode === 'sender' && (
          <div className="space-y-2">
            <Textarea
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Write your question for the organizer..."
              maxLength={1000}
              rows={3}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{newMessage.length}/1000</span>
              <Button onClick={handleSend} disabled={sending || !newMessage.trim()} size="sm" className="gap-2">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send Question
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {mode === 'organizer' ? 'No questions from participants yet.' : 'You have not sent any questions yet.'}
          </p>
        ) : (
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {messages.map(msg => (
              <div key={msg.id} className="border border-border rounded-lg p-3 bg-muted/30 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{msg.sender_name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(msg.created_at), 'MMM d, yyyy • h:mm a')}
                      </p>
                    </div>
                  </div>
                  {msg.reply ? (
                    <Badge variant="secondary" className="gap-1 text-[10px]">
                      <CheckCircle2 className="h-3 w-3" /> Replied
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Pending</Badge>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap pl-9">{msg.message}</p>

                {msg.reply && (
                  <div className="ml-9 border-l-2 border-primary pl-3 mt-2">
                    <p className="text-xs font-medium text-primary flex items-center gap-1">
                      <Reply className="h-3 w-3" /> Organizer reply
                      {msg.replied_at && (
                        <span className="text-muted-foreground font-normal">
                          • {format(new Date(msg.replied_at), 'MMM d, h:mm a')}
                        </span>
                      )}
                    </p>
                    <p className="text-sm whitespace-pre-wrap mt-1">{msg.reply}</p>
                  </div>
                )}

                {mode === 'organizer' && !msg.reply && (
                  <div className="ml-9 space-y-2 pt-1">
                    <Textarea
                      value={replyDrafts[msg.id] || ''}
                      onChange={e => setReplyDrafts(d => ({ ...d, [msg.id]: e.target.value }))}
                      placeholder="Write a reply..."
                      maxLength={1000}
                      rows={2}
                    />
                    <Button
                      size="sm"
                      onClick={() => handleReply(msg)}
                      disabled={replying === msg.id || !(replyDrafts[msg.id] || '').trim()}
                      className="gap-2"
                    >
                      {replying === msg.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Reply className="h-3 w-3" />}
                      Send Reply
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
