import { createSupabaseAdminClient } from "./supabase";

export async function isAdminEmail(email: string | undefined) {
  if (!email) return false;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("admins")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  if (error) return false;
  return Boolean(data?.email);
}

export async function ensureProfile(userId: string, email: string | undefined) {
  const supabase = createSupabaseAdminClient();

  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing;

  const { data: created, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      email: email ?? null,
    })
    .select("*")
    .single();

  if (insertError) throw insertError;
  return created;
}

export async function getPublicProfileByHandle(handle: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,display_name,handle,avatar_url,creator_requested,is_creator_approved,created_at,updated_at")
    .ilike("handle", handle)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateMyProfile(userId: string, patch: { display_name?: string | null; handle?: string | null }) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function createAuction(input: {
  creatorId: string;
  title: string;
  description?: string | null;
  category: string;
  starting_bid_cents: number;
  reserve_price_cents?: number | null;
  ends_at: string;
  is_creator_approved_at_creation: boolean;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("auctions")
    .insert({
      creator_id: input.creatorId,
      title: input.title,
      description: input.description ?? null,
      category: input.category,
      starting_bid_cents: input.starting_bid_cents,
      reserve_price_cents: input.reserve_price_cents ?? null,
      ends_at: input.ends_at,
      status: "active",
      is_creator_approved_at_creation: input.is_creator_approved_at_creation,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listAuctions(params: { creatorHandle?: string; status?: string }) {
  const supabase = createSupabaseAdminClient();

  // Join via embedded relation (requires FK), but we'll do 2-step to stay simple.
  let creatorId: string | null = null;
  if (params.creatorHandle) {
    const { data: p, error: pErr } = await supabase
      .from("profiles")
      .select("id")
      .ilike("handle", params.creatorHandle)
      .maybeSingle();
    if (pErr) throw pErr;
    creatorId = p?.id ?? null;
    if (!creatorId) return [];
  }

  let q = supabase.from("auctions").select("*").order("created_at", { ascending: false });
  if (creatorId) q = q.eq("creator_id", creatorId);
  if (params.status) q = q.eq("status", params.status);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getAuctionById(id: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("auctions").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listBids(auctionId: string, limit = 50) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("bids")
    .select("*")
    .eq("auction_id", auctionId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function placeBid(input: { bidderId: string; auctionId: string; amountCents: number }) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("place_bid_admin", {
    p_bidder_id: input.bidderId,
    p_auction_id: input.auctionId,
    p_amount_cents: input.amountCents,
  });
  if (error) throw error;
  return data;
}

export async function getMyWallet(userId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("wallets").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function demoTopUp(userId: string, amountCents: number) {
  const supabase = createSupabaseAdminClient();
  if (amountCents <= 0) throw new Error("invalid_amount");

  const { data: existing, error: readError } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) throw readError;

  const nextBalance = (existing?.balance_cents ?? 0) + amountCents;
  const { data, error } = await supabase
    .from("wallets")
    .upsert({ user_id: userId, balance_cents: nextBalance })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

