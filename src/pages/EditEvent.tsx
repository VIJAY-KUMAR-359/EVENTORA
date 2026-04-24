import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getEventById, updateEvent, uploadFile, EVENT_CATEGORIES, EventCategory, EventFeeType, createNotification, notifyInterestedUsers } from '@/lib/storage';
import type { Event } from '@/lib/storage';
import { CalendarDays, MapPin, FileText, Type, Clock, Users, ImagePlus, X, Tag, IndianRupee, QrCode, FileEdit } from 'lucide-react';

const EditEvent = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [durationHours, setDurationHours] = useState('1');
  const [capacity, setCapacity] = useState('100');
  const [category, setCategory] = useState<EventCategory>('other');
  const [venue, setVenue] = useState('');
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [feeType, setFeeType] = useState<EventFeeType>('free');
  const [feeAmount, setFeeAmount] = useState('');
  const [scannerPreview, setScannerPreview] = useState<string | null>(null);
  const [scannerFile, setScannerFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(true);

  useEffect(() => {
    if (!id) return;
    getEventById(id).then((ev) => {
      if (ev) {
        setEvent(ev);
        setTitle(ev.title);
        setDescription(ev.description);
        setDate(ev.date);
        setStartTime(ev.start_time || '');
        setDurationHours(String((ev.duration || 60) / 60));
        setCapacity(String(ev.capacity || 100));
        setCategory(ev.category || 'other');
        setVenue(ev.venue);
        setPosterPreview(ev.poster_url || null);
        setFeeType(ev.fee_type || 'free');
        setFeeAmount(ev.fee_amount ? String(ev.fee_amount) : '');
        setScannerPreview(ev.payment_scanner_url || null);
      }
      setLoadingEvent(false);
    });
  }, [id]);

  if (!user) { navigate('/login'); return null; }
  if (loadingEvent) return <div className="min-h-screen bg-background"><Navbar /><div className="container mx-auto px-4 py-16 text-center">Loading...</div></div>;
  if (!event) return <div className="min-h-screen bg-background"><Navbar /><div className="container mx-auto px-4 py-16 text-center"><h1 className="text-2xl font-bold text-foreground mb-4">Event Not Found</h1><Button onClick={() => navigate('/my-events')}>Go to My Events</Button></div></div>;
  if (event.organizer_id !== user.id) { navigate('/my-events'); return null; }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, setFile: (f: File | null) => void, setPreview: (s: string | null) => void, maxMb: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > maxMb * 1024 * 1024) {
      toast({ title: 'File too large', description: `Please upload an image under ${maxMb}MB`, variant: 'destructive' });
      return;
    }
    setFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent, asDraft = false) => {
    e.preventDefault();
    if (asDraft) setIsDraftSaving(true); else setIsLoading(true);

    if (!title.trim() || !date || !venue.trim() || !startTime) {
      toast({ title: 'Missing Fields', description: 'Please fill in title, date, time, and venue', variant: 'destructive' });
      setIsLoading(false);
      setIsDraftSaving(false);
      return;
    }

    try {
      let posterUrl = posterPreview;
      let scannerUrl = scannerPreview;

      if (posterFile) {
        const path = `${user.id}/${Date.now()}-poster.${posterFile.name.split('.').pop()}`;
        posterUrl = (await uploadFile('event-images', path, posterFile)) || posterPreview;
      }

      if (feeType === 'paid' && scannerFile) {
        const path = `${user.id}/${Date.now()}-scanner.${scannerFile.name.split('.').pop()}`;
        scannerUrl = (await uploadFile('event-images', path, scannerFile)) || scannerPreview;
      }

      const durationMinutes = Math.round(parseFloat(durationHours) * 60) || 60;

      // is_draft flag controls visibility; poster & description are preserved.
      const wasDraft = event.is_draft === true;
      const becomingPublished = wasDraft && !asDraft;

      await updateEvent(event.id, {
        title: title.trim(),
        description: description.trim(),
        date,
        start_time: startTime,
        duration: durationMinutes,
        capacity: parseInt(capacity) || 100,
        category,
        venue: venue.trim(),
        poster_url: posterUrl,
        fee_type: feeType,
        fee_amount: feeType === 'paid' ? parseFloat(feeAmount) : undefined,
        payment_scanner_url: feeType === 'paid' ? scannerUrl : undefined,
        is_draft: asDraft,
      });

      // If draft is being published for the first time, notify organizer + interested users
      if (becomingPublished) {
        await createNotification(
          user.id,
          event.id,
          '🚀 Event Published!',
          `Your event "${title.trim()}" is now live for registrations.`,
          'event_created'
        );
        await notifyInterestedUsers(event.id, category, title.trim(), user.id);
      }

      toast({
        title: asDraft ? '📝 Draft Saved' : becomingPublished ? '🚀 Published!' : 'Event Updated!',
        description: asDraft ? 'Your draft has been saved.' : 'Your changes have been saved.',
      });
      navigate('/my-events');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update event', variant: 'destructive' });
    } finally {
      setIsLoading(false);
      setIsDraftSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <CalendarDays className="h-6 w-6 text-primary" /> Edit Event
              </CardTitle>
              <CardDescription>Update your event details</CardDescription>
            </CardHeader>
            
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Event Poster</Label>
                  <div className="flex flex-col items-center gap-4">
                    {posterPreview ? (
                      <div className="relative w-full max-w-sm">
                        <img src={posterPreview} alt="Poster preview" className="w-full h-48 object-cover rounded-lg border border-border" />
                        <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8" onClick={() => { setPosterFile(null); setPosterPreview(null); }}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="w-full max-w-sm h-48 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
                        <ImagePlus className="h-10 w-10 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Click to upload poster</span>
                        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleFileSelect(e, setPosterFile, setPosterPreview, 5)} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Event Title *</Label>
                  <div className="relative">
                    <Type className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="pl-10" maxLength={100} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                    <Select value={category} onValueChange={(value: EventCategory) => setCategory(value)}>
                      <SelectTrigger className="pl-10"><SelectValue placeholder="Select a category" /></SelectTrigger>
                      <SelectContent>
                        {EVENT_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            <div className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${cat.color}`} />{cat.label}</div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="pl-10 min-h-[100px]" maxLength={500} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Event Date *</Label>
                    <div className="relative">
                      <CalendarDays className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="pl-10" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time *</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="pl-10" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (hours)</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="duration" type="number" value={durationHours} onChange={(e) => setDurationHours(e.target.value)} className="pl-10" min={0.25} max={24} step={0.25} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Participants Capacity</Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="capacity" type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} className="pl-10" min={1} max={10000} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="venue">Venue *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="venue" value={venue} onChange={(e) => setVenue(e.target.value)} className="pl-10" maxLength={100} />
                  </div>
                </div>

                {/* Fee Type */}
                <div className="space-y-2">
                  <Label>Event Type *</Label>
                  <div className="flex gap-4">
                    <label className={`flex-1 flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${feeType === 'free' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                      <input type="radio" name="feeType" value="free" checked={feeType === 'free'} onChange={() => { setFeeType('free'); setFeeAmount(''); setScannerFile(null); setScannerPreview(null); }} className="sr-only" />
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${feeType === 'free' ? 'border-primary' : 'border-muted-foreground'}`}>
                        {feeType === 'free' && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <div><p className="font-medium text-foreground">Free</p><p className="text-xs text-muted-foreground">No fee</p></div>
                    </label>
                    <label className={`flex-1 flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${feeType === 'paid' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                      <input type="radio" name="feeType" value="paid" checked={feeType === 'paid'} onChange={() => setFeeType('paid')} className="sr-only" />
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${feeType === 'paid' ? 'border-primary' : 'border-muted-foreground'}`}>
                        {feeType === 'paid' && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <div><p className="font-medium text-foreground">Paid</p><p className="text-xs text-muted-foreground">Requires payment</p></div>
                    </label>
                  </div>
                </div>

                {feeType === 'paid' && (
                  <div className="space-y-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
                    <div className="space-y-2">
                      <Label htmlFor="feeAmount">Registration Fee (₹) *</Label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input id="feeAmount" type="number" placeholder="e.g., 500" value={feeAmount} onChange={(e) => setFeeAmount(e.target.value)} className="pl-10" min={1} max={100000} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>PhonePe / UPI Scanner Image *</Label>
                      <div className="flex flex-col items-center gap-4">
                        {scannerPreview ? (
                          <div className="relative w-full max-w-xs">
                            <img src={scannerPreview} alt="Scanner" className="w-full h-64 object-contain rounded-lg border border-border bg-white" />
                            <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8" onClick={() => { setScannerFile(null); setScannerPreview(null); }}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <label className="w-full max-w-xs h-48 border-2 border-dashed border-primary/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
                            <QrCode className="h-10 w-10 text-primary/60 mb-2" />
                            <span className="text-sm text-muted-foreground">Click to upload scanner</span>
                            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleFileSelect(e, setScannerFile, setScannerPreview, 5)} className="hidden" />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="flex flex-col sm:flex-row gap-3">
                <Button type="button" variant="outline" onClick={() => navigate('/my-events')} className="flex-1 w-full" disabled={isLoading || isDraftSaving}>Cancel</Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1 w-full gap-2"
                  disabled={isLoading || isDraftSaving}
                  onClick={(e) => handleSubmit(e as unknown as React.FormEvent, true)}
                >
                  <FileEdit className="h-4 w-4" />
                  {isDraftSaving ? 'Saving Draft...' : 'Save as Draft'}
                </Button>
                <Button type="submit" className="flex-1 w-full" disabled={isLoading || isDraftSaving}>
                  {isLoading ? 'Saving...' : 'Publish / Save Changes'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EditEvent;
