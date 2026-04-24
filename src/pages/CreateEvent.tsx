import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { saveEvent, uploadFile, validateImage, createNotification, notifyInterestedUsers, EVENT_CATEGORIES, EventCategory, EventFeeType } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';
import { CalendarDays, MapPin, FileText, Type, Clock, Users, ImagePlus, X, Tag, IndianRupee, QrCode, Loader2, FileEdit } from 'lucide-react';

const CreateEvent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [durationHours, setDurationHours] = useState('1');
  const [capacity, setCapacity] = useState('100');
  const [category, setCategory] = useState<EventCategory>('other');
  const [venue, setVenue] = useState('');
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feeType, setFeeType] = useState<EventFeeType>('free');
  const [feeAmount, setFeeAmount] = useState('');
  const [scannerFile, setScannerFile] = useState<File | null>(null);
  const [scannerPreview, setScannerPreview] = useState<string | null>(null);
  const [validatingScanner, setValidatingScanner] = useState(false);
  const [isDraftSaving, setIsDraftSaving] = useState(false);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  if (!user) return null;

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

  const handleScannerSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Please upload an image under 3MB', variant: 'destructive' });
      return;
    }
    setScannerFile(file);
    setScannerPreview(URL.createObjectURL(file));

    // Validate QR scanner using AI
    setValidatingScanner(true);
    try {
      const tempPath = `temp/${Date.now()}-qr-validate.${file.name.split('.').pop()}`;
      const uploadedUrl = await uploadFile('event-images', tempPath, file);
      if (uploadedUrl) {
        const result = await validateImage(uploadedUrl, 'payment_qr');
        if (!result.isValid) {
          toast({
            title: '⚠️ Invalid QR Code',
            description: result.reason || 'This does not appear to be a valid payment QR code. Please upload a PhonePe/GPay/Paytm QR scanner.',
            variant: 'destructive',
          });
          setScannerFile(null);
          setScannerPreview(null);
        } else {
          toast({ title: '✅ QR Code Verified', description: 'Your payment QR code looks valid.' });
        }
      }
    } catch {
      // Allow if validation fails
    } finally {
      setValidatingScanner(false);
    }
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
      let posterUrl: string | undefined;
      let scannerUrl: string | undefined;

      if (posterFile) {
        const path = `${user.id}/${Date.now()}-poster.${posterFile.name.split('.').pop()}`;
        posterUrl = (await uploadFile('event-images', path, posterFile)) || undefined;
      }

      if (feeType === 'paid' && scannerFile) {
        const path = `${user.id}/${Date.now()}-scanner.${scannerFile.name.split('.').pop()}`;
        scannerUrl = (await uploadFile('event-images', path, scannerFile)) || undefined;
      }

      const durationMinutes = Math.round(parseFloat(durationHours) * 60) || 60;

      // Drafts keep their poster & description; the is_draft flag controls visibility.
      const newEvent = await saveEvent({
        title: title.trim(),
        description: description.trim(),
        date,
        start_time: startTime,
        duration: durationMinutes,
        capacity: parseInt(capacity) || 100,
        category,
        venue: venue.trim(),
        organizer_id: user.id,
        organizer_name: user.name,
        poster_url: posterUrl,
        fee_type: feeType,
        fee_amount: feeType === 'paid' ? parseFloat(feeAmount) || 0 : undefined,
        payment_scanner_url: scannerUrl,
        is_draft: asDraft,
      });

      if (newEvent) {
        if (asDraft) {
          toast({ title: '📝 Draft Saved', description: `"${newEvent.title}" was saved as a draft. Publish it from My Events.` });
          navigate('/my-events');
        } else {
          // Notify organizer about successful event creation
          await createNotification(
            user.id,
            newEvent.id,
            '🎉 Event Created!',
            `Your event "${newEvent.title}" has been published and is now live for registrations.`,
            'event_created'
          );

          // Notify users whose interests match this event's category
          await notifyInterestedUsers(newEvent.id, category, newEvent.title, user.id);
          toast({ title: 'Event Created!', description: `"${newEvent.title}" has been created successfully.` });
          navigate('/my-events');
        }
      } else {
        toast({ title: 'Error', description: 'Failed to create event', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to create event', variant: 'destructive' });
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
                <CalendarDays className="h-6 w-6 text-primary" /> Create New Event
              </CardTitle>
              <CardDescription>Fill in the details below to create your event</CardDescription>
            </CardHeader>
            
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6">
                {/* Poster Upload */}
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
                        <span className="text-xs text-muted-foreground mt-1">Max 5MB, JPG/PNG</span>
                        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleFileSelect(e, setPosterFile, setPosterPreview, 5)} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Event Title *</Label>
                  <div className="relative">
                    <Type className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="title" placeholder="Enter event title" value={title} onChange={(e) => setTitle(e.target.value)} className="pl-10" maxLength={100} />
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
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${cat.color}`} />
                              {cat.label}
                            </div>
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
                    <Textarea id="description" placeholder="Describe your event..." value={description} onChange={(e) => setDescription(e.target.value)} className="pl-10 min-h-[100px]" maxLength={500} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Event Date *</Label>
                    <div className="relative">
                      <CalendarDays className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="pl-10" min={new Date().toISOString().split('T')[0]} />
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
                      <Input id="duration" type="number" placeholder="1" value={durationHours} onChange={(e) => setDurationHours(e.target.value)} className="pl-10" min={0.25} max={24} step={0.25} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Participants Capacity</Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="capacity" type="number" placeholder="100" value={capacity} onChange={(e) => setCapacity(e.target.value)} className="pl-10" min={1} max={10000} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="venue">Venue *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="venue" placeholder="e.g., Convention Center, Main Hall" value={venue} onChange={(e) => setVenue(e.target.value)} className="pl-10" maxLength={100} />
                  </div>
                </div>

                {/* Fee Type */}
                <div className="space-y-4">
                  <Label>Event Fee</Label>
                  <div className="flex gap-4">
                    <Button type="button" variant={feeType === 'free' ? 'default' : 'outline'} onClick={() => setFeeType('free')} className="flex-1 gap-2">Free</Button>
                    <Button type="button" variant={feeType === 'paid' ? 'default' : 'outline'} onClick={() => setFeeType('paid')} className="flex-1 gap-2">
                      <IndianRupee className="h-4 w-4" /> Paid
                    </Button>
                  </div>

                  {feeType === 'paid' && (
                    <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/30">
                      <div className="space-y-2">
                        <Label htmlFor="feeAmount">Fee Amount (₹) *</Label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input id="feeAmount" type="number" placeholder="e.g., 100" value={feeAmount} onChange={(e) => setFeeAmount(e.target.value)} className="pl-10" min={1} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Payment QR Scanner</Label>
                        {scannerPreview ? (
                          <div className="relative w-full max-w-[200px]">
                            <img src={scannerPreview} alt="Payment QR" className="w-full rounded-lg border border-border" />
                            <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => { setScannerFile(null); setScannerPreview(null); }}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : validatingScanner ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
                            <Loader2 className="h-4 w-4 animate-spin" /> Validating QR code...
                          </div>
                        ) : (
                          <label className="w-full max-w-[200px] h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
                            <QrCode className="h-8 w-8 text-muted-foreground mb-1" />
                            <span className="text-xs text-muted-foreground">Upload QR code</span>
                            <input type="file" accept="image/*" onChange={handleScannerSelect} className="hidden" />
                          </label>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground"><strong>Organizer:</strong> {user.name}</p>
                </div>
              </CardContent>
              
              <CardFooter className="flex flex-col sm:flex-row gap-3">
                <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1 w-full" disabled={isLoading || isDraftSaving}>Cancel</Button>
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
                  {isLoading ? 'Creating...' : 'Create Event'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CreateEvent;
