-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admin_online_status (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  is_active boolean DEFAULT true,
  last_seen timestamp without time zone DEFAULT now(),
  CONSTRAINT admin_online_status_pkey PRIMARY KEY (id),
  CONSTRAINT admin_online_status_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES auth.users(id)
);
CREATE TABLE public.admins (
  id uuid NOT NULL,
  full_name character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  role character varying NOT NULL DEFAULT 'sub'::character varying,
  created_by uuid,
  permissions jsonb,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT admins_pkey PRIMARY KEY (id),
  CONSTRAINT admins_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admins(id),
  CONSTRAINT admins_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.agencies (
  id uuid NOT NULL,
  name text NOT NULL,
  wilaya text NOT NULL,
  license_number text NOT NULL,
  phone text NOT NULL,
  bank_account text,
  logo_url text,
  background_url text,
  location_name text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  is_approved boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT agencies_pkey PRIMARY KEY (id),
  CONSTRAINT agencies_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.agency_airports (
  agency_id uuid NOT NULL,
  airport_id integer NOT NULL,
  CONSTRAINT agency_airports_pkey PRIMARY KEY (agency_id, airport_id),
  CONSTRAINT agency_airports_airport_id_fkey FOREIGN KEY (airport_id) REFERENCES public.airports(id),
  CONSTRAINT agency_airports_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.agencies(id)
);
CREATE TABLE public.agency_branches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agency_id uuid,
  email text,
  password text,
  wilaya text,
  location_name text,
  latitude numeric,
  longitude numeric,
  manager_phone text,
  name text,
  CONSTRAINT agency_branches_pkey PRIMARY KEY (id),
  CONSTRAINT agency_branches_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.agencies(id)
);
CREATE TABLE public.agency_branches_airports (
  agency_id uuid NOT NULL,
  airport_id integer NOT NULL,
  CONSTRAINT agency_branches_airports_pkey PRIMARY KEY (agency_id, airport_id),
  CONSTRAINT agency_branches_airports_airport_id_fkey FOREIGN KEY (airport_id) REFERENCES public.airports(id),
  CONSTRAINT agency_branches_airports_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.agency_branches(id)
);
CREATE TABLE public.airlines (
  id integer NOT NULL DEFAULT nextval('airlines_id_seq'::regclass),
  name text NOT NULL UNIQUE,
  CONSTRAINT airlines_pkey PRIMARY KEY (id)
);
CREATE TABLE public.airports (
  id integer NOT NULL DEFAULT nextval('airports_id_seq'::regclass),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  city text,
  country text,
  CONSTRAINT airports_pkey PRIMARY KEY (id)
);
CREATE TABLE public.bookings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  offer_id uuid,
  full_name text,
  phone text,
  passport_image_url text,
  room_type text,
  status text DEFAULT 'قيد الانتظار'::text CHECK (status = ANY (ARRAY['قيد الانتظار'::text, 'بانتظار موافقة الوكالة'::text, 'مقبول'::text, 'مرفوض'::text])),
  tracking_code text UNIQUE,
  created_at timestamp without time zone DEFAULT now(),
  discount_applied boolean DEFAULT false,
  CONSTRAINT bookings_pkey PRIMARY KEY (id),
  CONSTRAINT bookings_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.offers(id)
);
CREATE TABLE public.branch_offers (
  branch_id uuid NOT NULL,
  offer_id uuid NOT NULL,
  CONSTRAINT branch_offers_pkey PRIMARY KEY (branch_id, offer_id),
  CONSTRAINT branch_offers_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.agency_branches(id),
  CONSTRAINT branch_offers_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.offers(id)
);
CREATE TABLE public.chats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agency_id uuid,
  admin_id uuid,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT chats_pkey PRIMARY KEY (id),
  CONSTRAINT chats_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.agencies(id),
  CONSTRAINT chats_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES auth.users(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  chat_id uuid,
  sender_id uuid,
  sender_type text CHECK (sender_type = ANY (ARRAY['agency'::text, 'admin'::text])),
  message text NOT NULL,
  sent_at timestamp without time zone DEFAULT now(),
  image_url text,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id)
);
CREATE TABLE public.offer_gifts (
  id integer NOT NULL DEFAULT nextval('offer_gifts_id_seq'::regclass),
  offer_id uuid,
  gift_name text,
  CONSTRAINT offer_gifts_pkey PRIMARY KEY (id),
  CONSTRAINT offer_gifts_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.offers(id)
);
CREATE TABLE public.offer_view_counts (
  offer_id uuid NOT NULL,
  view_count bigint DEFAULT 0,
  CONSTRAINT offer_view_counts_pkey PRIMARY KEY (offer_id),
  CONSTRAINT offer_view_counts_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.offers(id)
);
CREATE TABLE public.offers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agency_id uuid,
  title text NOT NULL,
  main_image text,
  services jsonb,
  airline_id integer,
  flight_type text CHECK (flight_type = ANY (ARRAY['مباشرة'::text, 'غير مباشرة'::text])),
  departure_date date,
  return_date date,
  duration_days integer,
  hotel_name text,
  hotel_distance numeric,
  hotel_images jsonb,
  description text,
  price_double numeric,
  price_triple numeric,
  price_quad numeric,
  price_quint numeric,
  created_at timestamp without time zone DEFAULT now(),
  entry text CHECK (entry = ANY (ARRAY['مكة'::text, 'المدينة'::text])),
  exit text CHECK (exit = ANY (ARRAY['مكة'::text, 'المدينة'::text])),
  is_golden boolean DEFAULT false,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT offers_pkey PRIMARY KEY (id),
  CONSTRAINT offers_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.agencies(id),
  CONSTRAINT offers_airline_id_fkey FOREIGN KEY (airline_id) REFERENCES public.airlines(id)
);
CREATE TABLE public.site_stats (
  id integer NOT NULL DEFAULT nextval('site_stats_id_seq'::regclass),
  stat_month character varying NOT NULL UNIQUE,
  visit_count bigint DEFAULT 0,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT site_stats_pkey PRIMARY KEY (id)
);