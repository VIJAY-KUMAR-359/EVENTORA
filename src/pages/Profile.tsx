import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getEventsByOrganizer, getUserRegistrations, updateProfile, uploadFile, EVENT_CATEGORIES, EventCategory } from '@/lib/storage';
import { User, Mail, CalendarDays, ClipboardList, Edit2, Save, X, MapPin, Phone, FileText, Camera, Heart } from 'lucide-react';

const Profile = () => {
  const { user, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [location, setLocation] = useState(user?.location || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [interests, setInterests] = useState<EventCategory[]>((user?.interests as EventCategory[]) || []);
  const [profilePicPreview, setProfilePicPreview] = useState(user?.profile_pic_url || '');
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [eventsCount, setEventsCount] = useState(0);
  const [regsCount, setRegsCount] = useState(0);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setLocation(user.location || '');
      setPhone(user.phone || '');
      setBio(user.bio || '');
      setInterests((user.interests as EventCategory[]) || []);
      setProfilePicPreview(user.profile_pic_url || '');

      getEventsByOrganizer(user.id).then(e => setEventsCount(e.length));
      getUserRegistrations(user.id).then(r => setRegsCount(r.length));
    }
  }, [user]);

  if (!user) { navigate('/login'); return null; }

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const toggleInterest = (cat: EventCategory) => {
    setInterests((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Image must be under 2MB', variant: 'destructive' });
      return;
    }
    setProfilePicFile(file);
    setProfilePicPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: 'Error', description: 'Name cannot be empty', variant: 'destructive' });
      return;
    }

    try {
      let picUrl = profilePicPreview;

      if (profilePicFile) {
        const path = `${user.id}/${Date.now()}-avatar.${profilePicFile.name.split('.').pop()}`;
        picUrl = (await uploadFile('profile-pics', path, profilePicFile)) || profilePicPreview;
      }

      await updateProfile(user.id, {
        name: name.trim(),
        location: location || null,
        phone: phone || null,
        bio: bio || null,
        interests: interests.length > 0 ? interests : null,
        profile_pic_url: picUrl || null,
      });

      await refreshProfile();
      toast({ title: 'Profile Updated', description: 'Your profile has been saved.' });
      setIsEditing(false);
      setProfilePicFile(null);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save profile.', variant: 'destructive' });
    }
  };

  const handleCancel = () => {
    setName(user.name);
    setLocation(user.location || '');
    setPhone(user.phone || '');
    setBio(user.bio || '');
    setInterests((user.interests as EventCategory[]) || []);
    setProfilePicPreview(user.profile_pic_url || '');
    setProfilePicFile(null);
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <Avatar className="h-20 w-20 border-4 border-primary">
                    {profilePicPreview ? <AvatarImage src={profilePicPreview} alt={user.name} /> : null}
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl">{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 flex items-center justify-center bg-background/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="h-6 w-6 text-foreground" />
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-2xl">{user.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1"><Mail className="h-4 w-4" /> {user.email}</CardDescription>
                  {user.location && <CardDescription className="flex items-center gap-2 mt-1"><MapPin className="h-4 w-4" /> {user.location}</CardDescription>}
                </div>
              </div>
              {user.bio && <p className="text-sm text-muted-foreground mt-4">{user.bio}</p>}
              {user.interests && user.interests.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {user.interests.map((cat) => {
                    const c = EVENT_CATEGORIES.find((ec) => ec.value === cat);
                    return c ? <Badge key={cat} variant="secondary">{c.label}</Badge> : null;
                  })}
                </div>
              )}
            </CardHeader>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-primary/10"><CalendarDays className="h-6 w-6 text-primary" /></div>
                  <div><p className="text-2xl font-bold text-foreground">{eventsCount}</p><p className="text-sm text-muted-foreground">Events Created</p></div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-accent/10"><ClipboardList className="h-6 w-6 text-accent" /></div>
                  <div><p className="text-2xl font-bold text-foreground">{regsCount}</p><p className="text-sm text-muted-foreground">Registrations</p></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Account Details</CardTitle>
                {!isEditing ? (
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}><Edit2 className="h-4 w-4 mr-1" /> Edit</Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave}><Save className="h-4 w-4 mr-1" /> Save</Button>
                    <Button size="sm" variant="outline" onClick={handleCancel}><X className="h-4 w-4 mr-1" /> Cancel</Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                {isEditing ? <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /> : (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-md"><User className="h-4 w-4 text-muted-foreground" /> <span>{user.name}</span></div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md"><Mail className="h-4 w-4 text-muted-foreground" /> <span>{user.email}</span></div>
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                {isEditing ? <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" /> : (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-md"><MapPin className="h-4 w-4 text-muted-foreground" /> <span>{user.location || 'Not set'}</span></div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                {isEditing ? <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 8900" /> : (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-md"><Phone className="h-4 w-4 text-muted-foreground" /> <span>{user.phone || 'Not set'}</span></div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Bio</Label>
                {isEditing ? <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself..." rows={3} /> : (
                  <div className="flex items-start gap-2 p-3 bg-muted rounded-md min-h-[60px]"><FileText className="h-4 w-4 text-muted-foreground mt-0.5" /> <span>{user.bio || 'No bio added'}</span></div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Heart className="h-4 w-4" /> Interests</Label>
                {isEditing ? (
                  <div className="flex flex-wrap gap-2">
                    {EVENT_CATEGORIES.map((cat) => (
                      <Badge key={cat.value} variant={interests.includes(cat.value) ? 'default' : 'outline'} className="cursor-pointer transition-colors" onClick={() => toggleInterest(cat.value)}>
                        {cat.label}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-md">
                    {(user.interests && user.interests.length > 0) ? (
                      user.interests.map((cat) => { const c = EVENT_CATEGORIES.find((ec) => ec.value === cat); return c ? <Badge key={cat} variant="secondary">{c.label}</Badge> : null; })
                    ) : <span className="text-muted-foreground text-sm">No interests selected</span>}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
              <CardDescription>Irreversible account actions</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={async () => { if (confirm('Are you sure you want to logout?')) { await logout(); navigate('/'); } }}>
                Logout from Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
