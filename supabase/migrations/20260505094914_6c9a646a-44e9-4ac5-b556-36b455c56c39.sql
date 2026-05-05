
-- Roles
create type public.app_role as enum ('admin', 'editor', 'user');
create type public.content_type as enum ('news', 'event', 'opening', 'food', 'nightlife', 'business', 'guide');
create type public.content_status as enum ('draft', 'review', 'published', 'archived');
create type public.import_source_kind as enum ('rss', 'newsapi', 'apify', 'manual', 'submission');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- User roles (separate table — security critical)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('admin','editor'))
$$;

-- Sources (RSS feeds, APIs, scrapers)
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind import_source_kind not null,
  url text,
  config jsonb not null default '{}'::jsonb,
  category content_type,
  is_active boolean not null default true,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Raw imports (untouched payload from each source)
create table public.raw_imports (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.sources(id) on delete set null,
  external_id text,
  payload jsonb not null,
  url text,
  fetched_at timestamptz not null default now(),
  processed boolean not null default false,
  unique (source_id, external_id)
);

-- Content items (the published store)
create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  type content_type not null,
  status content_status not null default 'draft',
  title text not null,
  subtitle text,
  summary text,
  body text,
  hero_image_url text,
  source_url text,
  source_name text,
  raw_import_id uuid references public.raw_imports(id) on delete set null,
  neighborhood text,
  venue text,
  address text,
  starts_at timestamptz,
  ends_at timestamptz,
  price text,
  tags text[] not null default '{}',
  is_featured boolean not null default false,
  published_at timestamptz,
  author_id uuid references auth.users(id) on delete set null,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.content_items (status, type, published_at desc);
create index on public.content_items (type, starts_at);

-- Submitted items (user-submitted events / tips)
create table public.submitted_items (
  id uuid primary key default gen_random_uuid(),
  type content_type not null default 'event',
  title text not null,
  description text,
  venue text,
  neighborhood text,
  starts_at timestamptz,
  ends_at timestamptz,
  url text,
  image_url text,
  contact_email text,
  contact_name text,
  status content_status not null default 'review',
  review_notes text,
  promoted_content_id uuid references public.content_items(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Newsletter subscribers
create table public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  status text not null default 'active',
  preferences jsonb not null default '{}'::jsonb,
  source text,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Newsletter digests
create table public.newsletter_digests (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'daily',
  subject text not null,
  preheader text,
  html text,
  content_ids uuid[] not null default '{}',
  status text not null default 'draft',
  scheduled_for timestamptz,
  sent_at timestamptz,
  recipient_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- Automation runs
create table public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null,
  source_id uuid references public.sources(id) on delete set null,
  status text not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  items_in integer not null default 0,
  items_out integer not null default 0,
  error text,
  log jsonb not null default '{}'::jsonb
);

-- Engagement events
create table public.engagement_events (
  id bigserial primary key,
  content_id uuid references public.content_items(id) on delete cascade,
  event text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger trg_sources_touch before update on public.sources
  for each row execute function public.touch_updated_at();
create trigger trg_content_touch before update on public.content_items
  for each row execute function public.touch_updated_at();

-- Auto profile + default role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.sources enable row level security;
alter table public.raw_imports enable row level security;
alter table public.content_items enable row level security;
alter table public.submitted_items enable row level security;
alter table public.subscribers enable row level security;
alter table public.newsletter_digests enable row level security;
alter table public.automation_runs enable row level security;
alter table public.engagement_events enable row level security;

-- profiles
create policy "profiles select own or staff" on public.profiles
  for select using (auth.uid() = id or public.is_staff(auth.uid()));
create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id);

-- user_roles
create policy "roles self read" on public.user_roles
  for select using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "roles admin manage" on public.user_roles
  for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- sources
create policy "sources public read active" on public.sources
  for select using (is_active or public.is_staff(auth.uid()));
create policy "sources staff manage" on public.sources
  for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- raw_imports (staff only)
create policy "raw staff" on public.raw_imports
  for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- content_items
create policy "content public read published" on public.content_items
  for select using (status = 'published' or public.is_staff(auth.uid()));
create policy "content staff manage" on public.content_items
  for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- submitted_items
create policy "submit anyone insert" on public.submitted_items
  for insert with check (true);
create policy "submit staff read" on public.submitted_items
  for select using (public.is_staff(auth.uid()));
create policy "submit staff update" on public.submitted_items
  for update using (public.is_staff(auth.uid()));

-- subscribers
create policy "subscribe anyone insert" on public.subscribers
  for insert with check (true);
create policy "subscribers staff read" on public.subscribers
  for select using (public.is_staff(auth.uid()));

-- newsletter digests
create policy "digests public read sent" on public.newsletter_digests
  for select using (status = 'sent' or public.is_staff(auth.uid()));
create policy "digests staff manage" on public.newsletter_digests
  for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- automation runs (staff)
create policy "runs staff" on public.automation_runs
  for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- engagement events
create policy "events anyone insert" on public.engagement_events
  for insert with check (true);
create policy "events staff read" on public.engagement_events
  for select using (public.is_staff(auth.uid()));
