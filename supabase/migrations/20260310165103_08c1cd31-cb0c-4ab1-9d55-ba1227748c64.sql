
-- Create event category enum
CREATE TYPE public.event_category AS ENUM ('workshop', 'conference', 'social', 'study', 'art', 'hackathon', 'sports', 'music', 'other');

-- Create event fee type enum
CREATE TYPE public.event_fee_type AS ENUM ('free', 'paid');

-- ===================
-- PROFILES TABLE
-- ===================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  location TEXT,
  phone TEXT,
  bio TEXT,
  interests event_category[],
  profile_pic_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===================
-- EVENTS TABLE
-- ===================
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  duration INTEGER NOT NULL,
  capacity INTEGER NOT NULL,
  category event_category NOT NULL DEFAULT 'other',
  venue TEXT NOT NULL,
  organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organizer_name TEXT NOT NULL,
  image_url TEXT,
  poster_url TEXT,
  fee_type event_fee_type NOT NULL DEFAULT 'free',
  fee_amount NUMERIC,
  payment_scanner_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are viewable by everyone" ON public.events FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create events" ON public.events FOR INSERT TO authenticated WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "Organizers can update their own events" ON public.events FOR UPDATE USING (auth.uid() = organizer_id);
CREATE POLICY "Organizers can delete their own events" ON public.events FOR DELETE USING (auth.uid() = organizer_id);

-- ===================
-- REGISTRATIONS TABLE
-- ===================
CREATE TABLE public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  ticket TEXT NOT NULL,
  payment_screenshot_url TEXT,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_id)
);

ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own registrations" ON public.registrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Event organizers can view registrations" ON public.registrations FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.events WHERE events.id = registrations.event_id AND events.organizer_id = auth.uid())
);
CREATE POLICY "Authenticated users can register" ON public.registrations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can cancel their own registration" ON public.registrations FOR DELETE USING (auth.uid() = user_id);

-- ===================
-- FEEDBACKS TABLE
-- ===================
CREATE TABLE public.feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Feedbacks are viewable by everyone" ON public.feedbacks FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create feedback" ON public.feedbacks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own feedback" ON public.feedbacks FOR DELETE USING (auth.uid() = user_id);

-- ===================
-- UPDATED_AT TRIGGER
-- ===================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===================
-- STORAGE BUCKETS
-- ===================
INSERT INTO storage.buckets (id, name, public) VALUES ('event-images', 'event-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-pics', 'profile-pics', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-screenshots', 'payment-screenshots', false);

-- Storage policies: event-images
CREATE POLICY "Event images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'event-images');
CREATE POLICY "Authenticated users can upload event images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'event-images');
CREATE POLICY "Users can update their own event images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'event-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own event images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'event-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies: profile-pics
CREATE POLICY "Profile pics are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'profile-pics');
CREATE POLICY "Users can upload their own profile pic" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'profile-pics' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own profile pic" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'profile-pics' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own profile pic" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'profile-pics' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies: payment-screenshots
CREATE POLICY "Users can view their own payment screenshots" ON storage.objects FOR SELECT USING (bucket_id = 'payment-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload payment screenshots" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'payment-screenshots');
