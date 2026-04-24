import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, Linkedin, Mail, Send, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const Footer = () => {
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { user } = useAuth();
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      const senderName =
        (user as any)?.name ||
        (user?.email ? user.email.split('@')[0] : 'Visitor');
      const senderEmail = user?.email || '';
      const { error } = await supabase.functions.invoke('send-contact-email', {
        body: { message: message.trim(), senderName, senderEmail },
      });
      if (error) throw error;
      toast.success('Message sent successfully!');
      setMessage('');
    } catch (err: any) {
      console.error('Send error:', err);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <footer className="bg-foreground text-background">
      {/* Contact Toggle Bar */}
      <div className="border-b border-background/10">
        <div className="container mx-auto px-4">
          <button
            onClick={() => setIsContactOpen(!isContactOpen)}
            className="w-full py-4 flex items-center justify-between text-background hover:text-primary transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-semibold tracking-wide">GET IN TOUCH</h3>
                <p className="text-xs text-background/50">Have a question? Send us a message!</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="https://www.linkedin.com/in/eppili-vijay-kumar"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="h-9 w-9 rounded-full bg-[hsl(210,80%,45%)] hover:bg-[hsl(210,80%,35%)] flex items-center justify-center text-white transition-colors"
                title="Follow on LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </a>
              {isContactOpen ? (
                <ChevronUp className="h-5 w-5 text-background/50" />
              ) : (
                <ChevronDown className="h-5 w-5 text-background/50" />
              )}
            </div>
          </button>

          {/* Expandable Contact Form */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isContactOpen ? 'max-h-48 pb-6' : 'max-h-0'
            }`}
          >
            <div className="bg-background/5 backdrop-blur-sm rounded-xl p-5 border border-background/10">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message here..."
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-background/20 bg-background/10 text-background placeholder:text-background/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
                <Button
                  onClick={handleSend}
                  className="rounded-lg bg-primary hover:bg-primary/90 gap-2 px-6 shrink-0"
                  disabled={!message.trim() || sending}
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sending ? 'Sending...' : 'Send Message'}
                </Button>
              </div>
              <p className="text-xs text-background/40 mt-3">
                Opens your email client to send a message to our team.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div>
            <h4 className="font-bold mb-3 text-sm">Explore</h4>
            <ul className="space-y-2 text-sm text-background/60">
              <li><Link to="/" className="hover:text-background transition-colors">Browse Events</Link></li>
              <li><Link to="/create-event" className="hover:text-background transition-colors">Create Event</Link></li>
              <li><Link to="/my-events" className="hover:text-background transition-colors">My Events</Link></li>
              <li><Link to="/my-registrations" className="hover:text-background transition-colors">My Registrations</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-3 text-sm">Account</h4>
            <ul className="space-y-2 text-sm text-background/60">
              <li><Link to="/login" className="hover:text-background transition-colors">Login</Link></li>
              <li><Link to="/register" className="hover:text-background transition-colors">Create Account</Link></li>
              <li><Link to="/profile" className="hover:text-background transition-colors">Profile</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-3 text-sm">Company</h4>
            <ul className="space-y-2 text-sm text-background/60">
              <li><span className="cursor-default">About</span></li>
              <li><span className="cursor-default">Blog</span></li>
              <li><span className="cursor-default">Contact Us</span></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-3 text-sm">Support</h4>
            <ul className="space-y-2 text-sm text-background/60">
              <li><span className="cursor-default">Help Center</span></li>
              <li><span className="cursor-default">FAQs</span></li>
              <li><span className="cursor-default">Privacy Policy</span></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-background/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-lg font-bold tracking-wide">✦ Eventora</p>
          <p className="text-sm text-background/50">© 2024 EVENTORA by VIJAY KUMAR. All rights reserved.</p>
          <Button variant="ghost" size="sm" onClick={scrollToTop} className="text-background/60 hover:text-background hover:bg-background/10 gap-1">
            Back to Top <ArrowUp className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </footer>
  );
};
