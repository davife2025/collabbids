-- CollabBids v1 schema (minimal, demo-friendly)
-- Run in Supabase SQL editor.

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- Simple updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  handle text,
  avatar_url text,
  creator_requested boolean not null default false,
  is_creator_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Handle constraints (safe to re-run)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_handle_format'
  ) then
    alter table public.profiles
      add constraint profiles_handle_format
      check (
        handle is null
        or (char_length(handle) between 3 and 20 and handle ~ '^[a-z0-9_]+$')
      );
  end if;
end $$;

create unique index if not exists profiles_handle_unique
  on public.profiles (lower(handle))
  where handle is not null;

-- Wallets (demo funds)
create table if not exists public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance_cents integer not null default 0 check (balance_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_wallets_updated_at on public.wallets;
create trigger trg_wallets_updated_at
before update on public.wallets
for each row execute function public.set_updated_at();

alter table public.wallets enable row level security;

drop policy if exists "wallets_self_read" on public.wallets;
create policy "wallets_self_read"
on public.wallets for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "wallets_self_insert" on public.wallets;
create policy "wallets_self_insert"
on public.wallets for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "wallets_self_update" on public.wallets;
create policy "wallets_self_update"
on public.wallets for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Auctions
create table if not exists public.auctions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'prints',
  starting_bid_cents integer not null check (starting_bid_cents >= 0),
  reserve_price_cents integer check (reserve_price_cents is null or reserve_price_cents >= 0),
  ends_at timestamptz not null,
  extended_count integer not null default 0,
  status text not null default 'active' check (status in ('draft','active','ended')),
  is_creator_approved_at_creation boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Safe add column for existing projects
alter table public.auctions add column if not exists extended_count integer not null default 0;

drop trigger if exists trg_auctions_updated_at on public.auctions;
create trigger trg_auctions_updated_at
before update on public.auctions
for each row execute function public.set_updated_at();

alter table public.auctions enable row level security;

drop policy if exists "auctions_public_read" on public.auctions;
create policy "auctions_public_read"
on public.auctions for select
to authenticated, anon
using (true);

drop policy if exists "auctions_creator_insert" on public.auctions;
create policy "auctions_creator_insert"
on public.auctions for insert
to authenticated
with check (auth.uid() = creator_id);

drop policy if exists "auctions_creator_update" on public.auctions;
create policy "auctions_creator_update"
on public.auctions for update
to authenticated
using (auth.uid() = creator_id)
with check (auth.uid() = creator_id);

-- Orders + shipping (winner fulfillment)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null unique references public.auctions(id) on delete cascade,
  winner_id uuid not null references public.profiles(id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  status text not null default 'pending_shipping'
    check (status in ('pending_shipping','submitted_shipping','paid','shipped','completed')),
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

drop policy if exists "orders_winner_read" on public.orders;
create policy "orders_winner_read"
on public.orders for select
to authenticated
using (auth.uid() = winner_id);

drop policy if exists "orders_no_client_write" on public.orders;
create policy "orders_no_client_write"
on public.orders for insert, update, delete
to authenticated
using (false)
with check (false);

create table if not exists public.shipping_addresses (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  name text not null,
  phone text,
  address1 text not null,
  address2 text,
  city text not null,
  state text,
  postal_code text not null,
  country text not null default 'US',
  created_at timestamptz not null default now()
);

alter table public.shipping_addresses enable row level security;

drop policy if exists "shipping_winner_read" on public.shipping_addresses;
create policy "shipping_winner_read"
on public.shipping_addresses for select
to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_id and o.winner_id = auth.uid()
  )
);

drop policy if exists "shipping_no_client_write" on public.shipping_addresses;
create policy "shipping_no_client_write"
on public.shipping_addresses for insert, update, delete
to authenticated
using (false)
with check (false);

-- Bids
create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions(id) on delete cascade,
  bidder_id uuid not null references public.profiles(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  created_at timestamptz not null default now()
);

create index if not exists bids_by_auction_created_at on public.bids (auction_id, created_at desc);

alter table public.bids enable row level security;

drop policy if exists "bids_public_read" on public.bids;
create policy "bids_public_read"
on public.bids for select
to authenticated, anon
using (true);

-- For v1: bid inserts go through API/service role only
drop policy if exists "bids_no_client_insert" on public.bids;
create policy "bids_no_client_insert"
on public.bids for insert
to authenticated
with check (false);

-- Wallet locks (locks only the current highest bid)
create table if not exists public.auction_locks (
  auction_id uuid primary key references public.auctions(id) on delete cascade,
  highest_bid_id uuid references public.bids(id) on delete set null,
  highest_bidder_id uuid references public.profiles(id) on delete set null,
  locked_amount_cents integer not null default 0 check (locked_amount_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_auction_locks_updated_at on public.auction_locks;
create trigger trg_auction_locks_updated_at
before update on public.auction_locks
for each row execute function public.set_updated_at();

alter table public.auction_locks enable row level security;

drop policy if exists "auction_locks_public_read" on public.auction_locks;
create policy "auction_locks_public_read"
on public.auction_locks for select
to authenticated, anon
using (true);

drop policy if exists "auction_locks_no_client_write" on public.auction_locks;
create policy "auction_locks_no_client_write"
on public.auction_locks for insert, update, delete
to authenticated
using (false)
with check (false);

-- Atomic bid placement (called by API with service role)
create or replace function public.place_bid_admin(
  p_bidder_id uuid,
  p_auction_id uuid,
  p_amount_cents integer
)
returns public.bids
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auction public.auctions;
  v_current_lock public.auction_locks;
  v_current_highest integer;
  v_bid public.bids;
  v_wallet public.wallets;
begin
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'invalid_amount';
  end if;

  select * into v_auction from public.auctions where id = p_auction_id;
  if not found then
    raise exception 'auction_not_found';
  end if;
  if v_auction.status <> 'active' or v_auction.ends_at <= now() then
    raise exception 'auction_not_active';
  end if;

  -- ensure wallet exists
  insert into public.wallets(user_id, balance_cents)
  values (p_bidder_id, 0)
  on conflict (user_id) do nothing;

  select * into v_wallet from public.wallets where user_id = p_bidder_id for update;

  -- lock row for this auction (or create)
  insert into public.auction_locks(auction_id, locked_amount_cents)
  values (p_auction_id, 0)
  on conflict (auction_id) do nothing;

  select * into v_current_lock from public.auction_locks where auction_id = p_auction_id for update;

  v_current_highest := greatest(v_auction.starting_bid_cents, v_current_lock.locked_amount_cents);
  if p_amount_cents <= v_current_highest then
    raise exception 'bid_too_low';
  end if;

  -- available funds: balance + (if bidder is current highest bidder, they already have amount locked)
  if v_current_lock.highest_bidder_id = p_bidder_id then
    if v_wallet.balance_cents < (p_amount_cents - v_current_lock.locked_amount_cents) then
      raise exception 'insufficient_funds';
    end if;
    update public.wallets
      set balance_cents = balance_cents - (p_amount_cents - v_current_lock.locked_amount_cents)
      where user_id = p_bidder_id;
  else
    if v_wallet.balance_cents < p_amount_cents then
      raise exception 'insufficient_funds';
    end if;
    -- release previous highest bidder funds
    if v_current_lock.highest_bidder_id is not null and v_current_lock.locked_amount_cents > 0 then
      update public.wallets
        set balance_cents = balance_cents + v_current_lock.locked_amount_cents
        where user_id = v_current_lock.highest_bidder_id;
    end if;
    -- lock funds for new bidder
    update public.wallets
      set balance_cents = balance_cents - p_amount_cents
      where user_id = p_bidder_id;
  end if;

  insert into public.bids(auction_id, bidder_id, amount_cents)
  values (p_auction_id, p_bidder_id, p_amount_cents)
  returning * into v_bid;

  update public.auction_locks
    set highest_bid_id = v_bid.id,
        highest_bidder_id = p_bidder_id,
        locked_amount_cents = p_amount_cents
    where auction_id = p_auction_id;

  return v_bid;
end;
$$;

-- Admin emails (v1)
create table if not exists public.admins (
  email text primary key,
  created_at timestamptz not null default now()
);

insert into public.admins(email)
values ('sunnyboicrypo@gmail.com')
on conflict (email) do nothing;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.admins enable row level security;

-- Profiles policies: public read, self write
drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_public_read"
on public.profiles for select
to authenticated, anon
using (true);

drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Admins: only service role reads via API (no client access)
drop policy if exists "admins_no_client_access" on public.admins;
create policy "admins_no_client_access"
on public.admins for select
to authenticated, anon
using (false);

