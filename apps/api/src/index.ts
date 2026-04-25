import express from "express";
import cors from "cors";
import { requireUser, type AuthedRequest } from "./auth";
import {
  createAuction,
  ensureProfile,
  getAuctionById,
  getPublicProfileByHandle,
  isAdminEmail,
  listBids,
  listAuctions,
  placeBid,
  updateMyProfile,
  getMyWallet,
  demoTopUp,
} from "./db";
import { createSupabaseAdminClient } from "./supabase";
import { z } from "zod";

const PORT = Number(process.env.PORT ?? 4000);

const app = express();
app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  })
);
app.use(express.json());

app.get("/api/v1/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/v1/me", requireUser, (req, res) => {
  const r = req as AuthedRequest;
  res.json({ id: r.userId, email: r.userEmail ?? null });
});

app.get("/api/v1/profile", requireUser, async (req, res) => {
  try {
    const r = req as AuthedRequest;
    const profile = await ensureProfile(r.userId, r.userEmail);
    res.json(profile);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "profile_error" });
  }
});

app.patch("/api/v1/profile", requireUser, async (req, res) => {
  const schema = z.object({
    display_name: z.string().min(1).max(50).optional().nullable(),
    handle: z
      .string()
      .min(3)
      .max(20)
      .regex(/^[a-z0-9_]+$/)
      .optional()
      .nullable(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.issues });
    return;
  }

  try {
    const r = req as AuthedRequest;
    await ensureProfile(r.userId, r.userEmail);
    const updated = await updateMyProfile(r.userId, parsed.data);
    res.json(updated);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "update_error" });
  }
});

app.post("/api/v1/profile/request-creator", requireUser, async (req, res) => {
  try {
    const r = req as AuthedRequest;
    const profile = await ensureProfile(r.userId, r.userEmail);

    // idempotent
    if (profile.creator_requested) {
      res.json(profile);
      return;
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({ creator_requested: true })
      .eq("id", r.userId)
      .select("*")
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json(data);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "request_error" });
  }
});

app.get("/api/v1/creators/:handle", async (req, res) => {
  const handle = String(req.params.handle ?? "").trim();
  if (!handle) {
    res.status(400).json({ error: "missing_handle" });
    return;
  }

  try {
    const profile = await getPublicProfileByHandle(handle);
    if (!profile) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json(profile);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "creator_error" });
  }
});

app.get("/api/v1/auctions", async (req, res) => {
  const creator = typeof req.query.creator === "string" ? req.query.creator : undefined;
  const status = typeof req.query.status === "string" ? req.query.status : "active";

  try {
    const items = await listAuctions({ creatorHandle: creator, status });
    res.json({ items });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "auctions_error" });
  }
});

app.get("/api/v1/auctions/:id", async (req, res) => {
  const id = String(req.params.id ?? "");
  try {
    const auction = await getAuctionById(id);
    if (!auction) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json(auction);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "auction_error" });
  }
});

app.get("/api/v1/auctions/:id/bids", async (req, res) => {
  const id = String(req.params.id ?? "");
  try {
    const items = await listBids(id, 50);
    res.json({ items });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "bids_error" });
  }
});

app.post("/api/v1/auctions/:id/bids", requireUser, async (req, res) => {
  const schema = z.object({
    amount_cents: z.number().int().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.issues });
    return;
  }
  try {
    const r = req as AuthedRequest;
    await ensureProfile(r.userId, r.userEmail);
    const bid = await placeBid({
      bidderId: r.userId,
      auctionId: String(req.params.id),
      amountCents: parsed.data.amount_cents,
    });
    res.status(201).json(bid);
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "place_bid_error" });
  }
});

app.get("/api/v1/wallet", requireUser, async (req, res) => {
  try {
    const r = req as AuthedRequest;
    await ensureProfile(r.userId, r.userEmail);
    const wallet = await getMyWallet(r.userId);
    res.json(wallet ?? { user_id: r.userId, balance_cents: 0 });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "wallet_error" });
  }
});

app.post("/api/v1/wallet/demo-topup", requireUser, async (req, res) => {
  const schema = z.object({
    amount_cents: z.number().int().min(1).max(10000000),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.issues });
    return;
  }
  try {
    const r = req as AuthedRequest;
    await ensureProfile(r.userId, r.userEmail);
    const wallet = await demoTopUp(r.userId, parsed.data.amount_cents);
    res.status(201).json(wallet);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "topup_error" });
  }
});

app.post("/api/v1/auctions", requireUser, async (req, res) => {
  const schema = z.object({
    title: z.string().min(3).max(120),
    description: z.string().max(4000).optional().nullable(),
    category: z.string().min(2).max(40).default("prints"),
    starting_bid_cents: z.number().int().min(0),
    reserve_price_cents: z.number().int().min(0).optional().nullable(),
    ends_at: z.string().min(10), // ISO string
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.issues });
    return;
  }

  try {
    const r = req as AuthedRequest;
    const profile = await ensureProfile(r.userId, r.userEmail);
    const auction = await createAuction({
      creatorId: r.userId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      category: parsed.data.category,
      starting_bid_cents: parsed.data.starting_bid_cents,
      reserve_price_cents: parsed.data.reserve_price_cents ?? null,
      ends_at: parsed.data.ends_at,
      is_creator_approved_at_creation: Boolean(profile.is_creator_approved),
    });
    res.status(201).json(auction);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "create_auction_error" });
  }
});

app.get("/api/v1/admin/creator-requests", requireUser, async (req, res) => {
  const r = req as AuthedRequest;
  if (!(await isAdminEmail(r.userEmail))) {
    res.status(403).json({ error: "admin_only" });
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("creator_requested", true)
    .order("updated_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ items: data ?? [] });
});

app.post("/api/v1/admin/creators/:id/approve", requireUser, async (req, res) => {
  const r = req as AuthedRequest;
  if (!(await isAdminEmail(r.userEmail))) {
    res.status(403).json({ error: "admin_only" });
    return;
  }

  const userId = req.params.id;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ is_creator_approved: true })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${PORT}`);
});

