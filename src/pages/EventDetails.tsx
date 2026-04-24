import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { DigitalTicket } from '@/components/DigitalTicket';
import { ParticipantsList } from '@/components/ParticipantsList';
import { EventFeedback } from '@/components/EventFeedback';
import { EventMessages } from '@/components/EventMessages';
import {
  getEventById,
  registerForEvent,
  isUserRegistered,
  cancelRegistration,
  getEventRegistrations,
  getUserRegistrations,
  getProfile,
  uploadFile,
  validateImage,
  createNotification,
  EVENT_CATEGORIES,
} from '@/lib/storage';
import type { Event, Registration, Profile } from '@/lib/storage';
import { Calendar, MapPin, User, Users, ArrowLeft, Check, Clock, Edit, Mail, IndianRupee, ImagePlus, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';

const EventDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [userRegistration, setUserRegistration] = useState<Registration | null>(null);
  const [organizer, setOrganizer] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [paymentPreview, setPaymentPreview] = useState<string | null>(null);
  const [showPaymentFlow, setShowPaymentFlow] = useState(false);
  const [validatingPayment, setValidatingPayment] = useState(false);

  const loadData = async () => {
    if (!id) return;
    const ev = await getEventById(id);
    if (!ev) { setLoading(false); return; }
    setEvent(ev);

    const [regs, org] = await Promise.all([
      getEventRegistrations(ev.id),
      getProfile(ev.organizer_id),
    ]);
    setRegistrations(regs);
    setOrganizer(org);

    if (user) {
      const registered = await isUserRegistered(user.id, ev.id);
      setIsRegistered(registered);
      if (registered) {
        const userRegs = await getUserRegistrations(user.id);
        const reg = userRegs.find(r => r.event_id === ev.id);
        setUserRegistration(reg || null);
      }
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [id, user]);

  if (loading) return <div className="min-h-screen bg-background"><Navbar /><div className="container mx-auto px-4 py-16 text-center">Loading...</div></div>;

  if (!event) return (
    <div className="min-h-screen bg-background"><Navbar />
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">Event Not Found</h1>
        <p className="text-muted-foreground mb-6">The event you're looking for doesn't exist.</p>
        <Link to="/"><Button>Browse Events</Button></Link>
      </div>
    </div>
  );

  const eventDate = new Date(event.date);
  const isEventPast = isPast(eventDate) && !isToday(eventDate);
  const isEventToday = isToday(eventDate);
  const isOrganizer = user?.id === event.organizer_id;
  const isDraft = event.is_draft;

  // Hide drafts from non-organizers
  if (isDraft && !isOrganizer) {
    return (
      <div className="min-h-screen bg-background"><Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Event Not Available</h1>
          <p className="text-muted-foreground mb-6">This event is not yet published.</p>
          <Link to="/"><Button>Browse Events</Button></Link>
        </div>
      </div>
    );
  }

  const spotsLeft = event.capacity ? event.capacity - registrations.length : null;
  const isSoldOut = spotsLeft !== null && spotsLeft <= 0;
  const isPaidEvent = event.fee_type === 'paid' && event.fee_amount && event.fee_amount > 0;
  const categoryInfo = EVENT_CATEGORIES.find(c => c.value === event.category);

  const isTicketActive = userRegistration?.payment_status === 'approved';
  const isPaymentPending = userRegistration?.payment_status === 'pending';
  const isPaymentRejected = userRegistration?.payment_status === 'rejected';

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const handlePaymentFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Please upload an image under 5MB', variant: 'destructive' });
      return;
    }

    setPaymentFile(file);
    const previewUrl = URL.createObjectURL(file);
    setPaymentPreview(previewUrl);

    // Validate payment receipt using AI
    setValidatingPayment(true);
    try {
      // Upload temporarily for validation
      const tempPath = `temp/${Date.now()}-validate.${file.name.split('.').pop()}`;
      const uploadedUrl = await uploadFile('payment-screenshots', tempPath, file);
      if (uploadedUrl) {
        const result = await validateImage(uploadedUrl, 'payment_receipt');
        if (!result.isValid) {
          toast({
            title: '⚠️ Invalid Payment Screenshot',
            description: result.reason || 'This does not appear to be a valid payment confirmation. Please upload a successful payment receipt.',
            variant: 'destructive',
          });
          setPaymentFile(null);
          setPaymentPreview(null);
        } else {
          toast({ title: '✅ Payment Screenshot Verified', description: 'Your payment screenshot looks valid.' });
        }
      }
    } catch {
      // Allow if validation fails
    } finally {
      setValidatingPayment(false);
    }
  };

  const handleRegister = async () => {
    if (!user) { toast({ title: 'Login Required', description: 'Please login to register.', variant: 'destructive' }); navigate('/login'); return; }
    if (isSoldOut) { toast({ title: 'Event Full', description: 'This event has reached its capacity.', variant: 'destructive' }); return; }

    if (isPaidEvent && !showPaymentFlow) { setShowPaymentFlow(true); return; }
    if (isPaidEvent && !paymentFile) { toast({ title: 'Payment Required', description: 'Please upload your payment confirmation screenshot.', variant: 'destructive' }); return; }

    try {
      let screenshotUrl: string | undefined;
      if (paymentFile) {
        const path = `${user.id}/${Date.now()}-payment.${paymentFile.name.split('.').pop()}`;
        screenshotUrl = (await uploadFile('payment-screenshots', path, paymentFile)) || undefined;
      }

      const registration = await registerForEvent(user.id, event.id, screenshotUrl);
      if (registration) {
        setUserRegistration(registration);
        setIsRegistered(true);
        setShowPaymentFlow(false);
        setPaymentFile(null);
        setPaymentPreview(null);

        // Notify the organizer about new registration
        await createNotification(
          event.organizer_id,
          event.id,
          '🎫 New Registration!',
          `${user.name} has registered for "${event.title}".${isPaidEvent ? ' Payment verification is pending.' : ''}`,
          'new_registration'
        );

        const msg = isPaidEvent
          ? `Your payment is under review. You'll receive a notification once the organizer confirms it.`
          : `Your ticket number is: ${registration.ticket}`;
        toast({ title: 'Registration Successful!', description: msg });
        await loadData();
      } else {
        toast({ title: 'Already Registered', description: 'You are already registered for this event.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Registration Failed', description: err.message || 'An error occurred', variant: 'destructive' });
    }
  };

  const handleCancelRegistration = async () => {
    if (!user) return;
    await cancelRegistration(user.id, event.id);
    setUserRegistration(null);
    setIsRegistered(false);
    toast({ title: 'Registration Cancelled', description: 'Your registration has been cancelled.' });
    await loadData();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Events
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Full poster display */}
            {event.poster_url && (
              <div className="rounded-xl overflow-hidden bg-muted">
                <img src={event.poster_url} alt={event.title} className="w-full h-auto object-contain" />
              </div>
            )}
            {!event.poster_url && (
              <div className="rounded-xl overflow-hidden aspect-video bg-muted">
                <div className="w-full h-full bg-gradient-to-br from-primary/20 via-accent/20 to-primary/10 flex items-center justify-center">
                  <Calendar className="h-20 w-20 text-primary/40" />
                </div>
              </div>
            )}

            <Card>
              <CardContent className="p-6">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6">{event.title}</h1>
                <div className="grid sm:grid-cols-2 gap-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10"><Calendar className="h-5 w-5 text-primary" /></div>
                    <div><p className="text-xs text-muted-foreground">Date</p><p className="font-medium">{format(eventDate, 'EEEE, MMMM d, yyyy')}</p></div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10"><Clock className="h-5 w-5 text-primary" /></div>
                    <div><p className="text-xs text-muted-foreground">Time & Duration</p><p className="font-medium">{event.start_time} • {formatDuration(event.duration)}</p></div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10"><MapPin className="h-5 w-5 text-primary" /></div>
                    <div><p className="text-xs text-muted-foreground">Location</p><p className="font-medium">{event.venue}</p></div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-pink-500/10"><Users className="h-5 w-5 text-pink-500" /></div>
                    <div><p className="text-xs text-muted-foreground">Capacity</p><p className="font-medium">{registrations.length} / {event.capacity}</p></div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10"><IndianRupee className="h-5 w-5 text-primary" /></div>
                    <div><p className="text-xs text-muted-foreground">Registration Fee</p><p className="font-medium text-primary">{isPaidEvent ? `₹${event.fee_amount}` : 'Free'}</p></div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">About This Event</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{event.description || 'No description provided.'}</p>
                </div>
              </CardContent>
            </Card>

            <EventFeedback event={event} isRegistered={isRegistered} isEventPast={isEventPast} />

            {isOrganizer && <EventMessages event={event} mode="organizer" />}
            {!isOrganizer && user && <EventMessages event={event} mode="sender" />}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-lg">Event Organizer</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted"><User className="h-5 w-5 text-muted-foreground" /></div>
                  <div><p className="text-xs text-muted-foreground">Name</p><p className="font-medium">{event.organizer_name}</p></div>
                </div>
                {organizer?.email && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted"><Mail className="h-5 w-5 text-muted-foreground" /></div>
                    <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium text-sm">{organizer.email}</p></div>
                  </div>
                )}
              </CardContent>
            </Card>

            {isOrganizer ? (
              <>
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-primary bg-primary/10 p-3 rounded-lg">
                      <Check className="h-5 w-5" /><span className="font-medium">You are the organizer</span>
                    </div>
                    <Link to={`/edit-event/${event.id}`}>
                      <Button variant="outline" className="w-full gap-2"><Edit className="h-4 w-4" /> Edit Event</Button>
                    </Link>
                  </CardContent>
                </Card>
                <ParticipantsList event={event} registrations={registrations} onStatusChange={loadData} />
              </>
            ) : isRegistered && userRegistration && user ? (
              <div className="space-y-4">
                {/* Payment Status Banner */}
                {isPaidEvent && isPaymentPending && (
                  <Card className="border-yellow-500/30 bg-yellow-500/5">
                    <CardContent className="p-4 flex items-start gap-3">
                      <Clock className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">Payment Under Review</p>
                        <p className="text-sm text-muted-foreground">The organizer is reviewing your payment. You'll receive a notification once it's confirmed.</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {isPaidEvent && isPaymentRejected && (
                  <Card className="border-destructive/30 bg-destructive/5">
                    <CardContent className="p-4 flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">Payment Rejected</p>
                        <p className="text-sm text-muted-foreground">
                          {userRegistration.organizer_note || 'Your payment could not be verified. Please contact the organizer.'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {isPaidEvent && isTicketActive && (
                  <Card className="border-green-500/30 bg-green-500/5">
                    <CardContent className="p-4 flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">Payment Confirmed!</p>
                        <p className="text-sm text-muted-foreground">Your ticket is active. Download it below.</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Show ticket only when approved (or free events) */}
                {isTicketActive && (
                  <DigitalTicket event={event} registration={userRegistration} user={user} />
                )}

                <Button variant="outline" className="w-full text-destructive hover:text-destructive" onClick={handleCancelRegistration}>Cancel Registration</Button>
              </div>
            ) : (
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Spots Available</span>
                    <span className="font-medium">{spotsLeft !== null ? `${spotsLeft} left` : 'Unlimited'}</span>
                  </div>
                  {event.capacity && (
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${Math.min((registrations.length / event.capacity) * 100, 100)}%` }} />
                    </div>
                  )}
                  {isPaidEvent && (
                    <div className="bg-accent/10 border border-accent/20 p-3 rounded-lg text-center">
                      <p className="text-sm font-medium text-foreground">Registration Fee: <span className="text-lg text-primary font-bold">₹{event.fee_amount}</span></p>
                    </div>
                  )}

                  {isEventPast ? (
                    <div className="bg-muted p-3 rounded-lg text-center"><p className="text-sm text-muted-foreground">Registration closed</p></div>
                  ) : isSoldOut ? (
                    <div className="bg-muted p-3 rounded-lg text-center"><p className="text-sm text-muted-foreground font-medium">Event is sold out</p></div>
                  ) : !showPaymentFlow ? (
                    <Button className="w-full" onClick={handleRegister}>
                      {isPaidEvent ? `Pay ₹${event.fee_amount} & Register` : 'Register for Event'}
                    </Button>
                  ) : null}

                  {showPaymentFlow && isPaidEvent && !isEventPast && !isSoldOut && (
                    <div className="space-y-4 border-t border-border pt-4">
                      <h4 className="font-semibold text-foreground text-center">Complete Payment</h4>
                      {event.payment_scanner_url && (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground text-center">Scan the QR code below to pay ₹{event.fee_amount}</p>
                          <div className="bg-white rounded-lg p-2 flex justify-center">
                            <img src={event.payment_scanner_url} alt="Payment Scanner" className="max-h-64 object-contain rounded" />
                          </div>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Upload Payment Screenshot *</Label>
                        {validatingPayment && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
                            <Loader2 className="h-4 w-4 animate-spin" /> Validating your payment screenshot...
                          </div>
                        )}
                        {paymentPreview ? (
                          <div className="relative">
                            <img src={paymentPreview} alt="Payment proof" className="w-full h-40 object-contain rounded-lg border border-border bg-muted" />
                            <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => { setPaymentFile(null); setPaymentPreview(null); }}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : !validatingPayment ? (
                          <label className="w-full h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
                            <ImagePlus className="h-8 w-8 text-muted-foreground mb-1" />
                            <span className="text-xs text-muted-foreground">Upload payment screenshot</span>
                            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePaymentFileSelect} className="hidden" />
                          </label>
                        ) : null}
                      </div>
                      <Button className="w-full" onClick={handleRegister} disabled={validatingPayment}>Confirm & Register</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;
