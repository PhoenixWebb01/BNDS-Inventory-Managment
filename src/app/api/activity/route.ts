import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

// GET /api/activity - Get recent activity across all items
export async function GET(req: NextRequest) {
  const supabase = getSupabase(req);
  const { searchParams } = new URL(req.url);

  const limit = parseInt(searchParams.get("limit") || "50");
  const itemId = searchParams.get("item_id");

  let query = supabase
    .from("activity_log")
    .select(`
      *,
      user:profiles(full_name, email),
      item:items(name, barcode)
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (itemId) {
    query = query.eq("item_id", itemId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
