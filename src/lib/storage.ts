// Supabase-backed storage for EVENTORA
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// Re-export DB types as application types
export type Profile = Tables<'profiles'>;
export type Event = Tables<'events'>;
export type Registration = Tables<'registrations'>;
export type Feedback = Tables<'feedbacks'>;
export type Notification = Tables<'notifications'>;

export type EventCategory = 'workshop' | 'conference' | 'social' | 'study' | 'art' | 'hackathon' | 'sports' | 'music' | 'other';
export type EventFeeType = 'free' | 'paid';
export type PaymentStatus = 'pending' | 'approved' | 'rejected';

// For backward compat with components expecting User type
export type User = Profile;

export const EVENT_CATEGORIES: { value: EventCategory; label: string; color: string }[] = [
  { value: 'workshop', label: 'Workshop', color: 'bg-black' },
  { value: 'conference', label: 'Conference', color: 'bg-black' },
  { value: 'social', label: 'Social', color: 'bg-black' },
  { value: 'study', label: 'Study', color: 'bg-black' },
  { value: 'art', label: 'Art', color: 'bg-black' },
  { value: 'hackathon', label: 'Hackathon', color: 'bg-black' },
  { value: 'sports', label: 'Sports', color: 'bg-black' },
  { value: 'music', label: 'Music', color: 'bg-black' },
  { value: 'other', label: 'Other', color: 'bg-black' },
];

// ================= File Upload Helpers =================

export const uploadFile = async (
  bucket: string,
  filePath: string,
  file: File
): Promise<string | null> => {
  const { error } = await supabase.storage.from(bucket).upload(filePath, file, { upsert: true });
  if (error) {
    console.error('Upload error:', error);
    return null;
  }
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return urlData.publicUrl;
};

export const getSignedUrl = async (
  bucket: string,
  filePath: string,
  expiresIn: number = 3600
): Promise<string | null> => {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, expiresIn);
  if (error) {
    console.error('Signed URL error:', error);
    return null;
  }
  return data.signedUrl;
};

export const uploadDataUrl = async (
  bucket: string,
  filePath: string,
  dataUrl: string
): Promise<string | null> => {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const file = new File([blob], filePath, { type: blob.type });
  return uploadFile(bucket, filePath, file);
};

// ================= Image Validation =================

export const validateImage = async (
  imageUrl: string,
  validationType: 'payment_qr' | 'payment_receipt'
): Promise<{ isValid: boolean; reason: string }> => {
  try {
    const { data, error } = await supabase.functions.invoke('validate-image', {
      body: { imageUrl, validationType },
    });
    if (error) {
      console.error('Validation error:', error);
      return { isValid: true, reason: 'Validation service unavailable.' };
    }
    return data;
  } catch {
    return { isValid: true, reason: 'Validation service unavailable.' };
  }
};

// ================= Profile Functions =================

export const getProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) return null;
  return data;
};

export const updateProfile = async (userId: string, updates: TablesUpdate<'profiles'>): Promise<Profile | null> => {
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select().single();
  if (error) { console.error('Update profile error:', error); return null; }
  return data;
};

// ================= Event Functions =================

export const getEvents = async (): Promise<Event[]> => {
  const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: false });
  if (error) { console.error('Get events error:', error); return []; }
  return data || [];
};

export const getEventById = async (id: string): Promise<Event | null> => {
  const { data, error } = await supabase.from('events').select('*').eq('id', id).single();
  if (error) return null;
  return data;
};

export const getEventsByOrganizer = async (organizerId: string): Promise<Event[]> => {
  const { data, error } = await supabase.from('events').select('*').eq('organizer_id', organizerId).order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
};

export const saveEvent = async (event: TablesInsert<'events'>): Promise<Event | null> => {
  const { data, error } = await supabase.from('events').insert(event).select().single();
  if (error) { console.error('Save event error:', error); return null; }
  return data;
};

export const updateEvent = async (id: string, updates: TablesUpdate<'events'>): Promise<Event | null> => {
  const { data, error } = await supabase.from('events').update(updates).eq('id', id).select().single();
  if (error) { console.error('Update event error:', error); return null; }
  return data;
};

export const deleteEvent = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) { console.error('Delete event error:', error); return false; }
  return true;
};

// ================= Registration Functions =================

export const generateTicketNumber = (): string => {
  return 'EVT' + Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const getEventRegistrations = async (eventId: string): Promise<Registration[]> => {
  const { data, error } = await supabase.from('registrations').select('*').eq('event_id', eventId);
  if (error) { console.error('Get registrations error:', error); return []; }
  return data || [];
};

export const getUserRegistrations = async (userId: string): Promise<Registration[]> => {
  const { data, error } = await supabase.from('registrations').select('*').eq('user_id', userId).order('registered_at', { ascending: false });
  if (error) { console.error('Get user registrations error:', error); return []; }
  return data || [];
};

export const isUserRegistered = async (userId: string, eventId: string): Promise<boolean> => {
  const { data } = await supabase.from('registrations').select('id').eq('user_id', userId).eq('event_id', eventId).maybeSingle();
  return !!data;
};

export const registerForEvent = async (
  userId: string,
  eventId: string,
  paymentScreenshotUrl?: string
): Promise<Registration | null> => {
  const ticket = generateTicketNumber();
  const { data, error } = await supabase
    .from('registrations')
    .insert({
      user_id: userId,
      event_id: eventId,
      ticket,
      payment_screenshot_url: paymentScreenshotUrl,
      payment_status: paymentScreenshotUrl ? 'pending' : 'approved',
    })
    .select()
    .single();
  if (error) { console.error('Register error:', error); return null; }
  return data;
};

export const cancelRegistration = async (userId: string, eventId: string): Promise<boolean> => {
  const { error } = await supabase.from('registrations').delete().eq('user_id', userId).eq('event_id', eventId);
  if (error) { console.error('Cancel registration error:', error); return false; }
  return true;
};

export const updateRegistrationStatus = async (
  registrationId: string,
  status: PaymentStatus,
  organizerNote?: string
): Promise<boolean> => {
  const updateData: any = { payment_status: status };
  if (organizerNote) updateData.organizer_note = organizerNote;
  
  const { error } = await supabase.from('registrations').update(updateData).eq('id', registrationId);
  if (error) { console.error('Update registration status error:', error); return false; }
  return true;
};

// ================= Feedback Functions =================

export const getFeedbacks = async (): Promise<Feedback[]> => {
  const { data, error } = await supabase.from('feedbacks').select('*').order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
};

export const saveFeedback = async (feedback: TablesInsert<'feedbacks'>): Promise<Feedback | null> => {
  const { data, error } = await supabase.from('feedbacks').insert(feedback).select().single();
  if (error) { console.error('Save feedback error:', error); return null; }
  return data;
};

// ================= Notification Functions =================

export const createNotification = async (
  userId: string,
  eventId: string,
  title: string,
  message: string,
  type: string = 'info'
): Promise<boolean> => {
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    event_id: eventId,
    title,
    message,
    type,
  });
  if (error) { console.error('Create notification error:', error); return false; }
  return true;
};

export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
  const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
};

export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('read', false);
  if (error) return 0;
  return count || 0;
};

export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
  if (error) return false;
  return true;
};

export const markAllNotificationsAsRead = async (userId: string): Promise<boolean> => {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
  if (error) return false;
  return true;
};

// ================= Profiles (for participant lists) =================

export const getProfilesByIds = async (userIds: string[]): Promise<Profile[]> => {
  if (userIds.length === 0) return [];
  const { data, error } = await supabase.from('profiles').select('*').in('id', userIds);
  if (error) return [];
  return data || [];
};

// Notifies all users whose interests include the event's category (excluding the organizer).
export const notifyInterestedUsers = async (
  eventId: string,
  category: EventCategory,
  eventTitle: string,
  organizerId: string
): Promise<number> => {
  try {
    const { data: matchingProfiles, error } = await supabase
      .from('profiles')
      .select('id')
      .contains('interests', [category])
      .neq('id', organizerId);

    if (error) {
      console.error('notifyInterestedUsers query error:', error);
      return 0;
    }
    if (!matchingProfiles || matchingProfiles.length === 0) return 0;

    await Promise.all(
      matchingProfiles.map((p) =>
        createNotification(
          p.id,
          eventId,
          '🎯 New Event Matches Your Interest!',
          `A new ${category} event "${eventTitle}" has been published. Check it out!`,
          'interest_match'
        )
      )
    );
    return matchingProfiles.length;
  } catch (err) {
    console.error('notifyInterestedUsers failed:', err);
    return 0;
  }
};
