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

// GET /api/items/barcode/[code] - Look up item by barcode (used by scanner!)
// This is the KEY endpoint - when someone scans a barcode, this finds the item
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const supabase = getSupabase(req);
  const { code } = await params;

  const { data, error } = await supabase
    .from("items")
    .select(`
      *,
      category:categories(*),
      location:locations(*),
      assigned_user:profiles!items_assigned_to_fkey(*)
    `)
    .eq("barcode", code)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: `No item found with barcode: ${code}` },
      { status: 404 }
    );
  }

  // Log the scan in the activity log
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("activity_log").insert({
      item_id: data.id,
      user_id: user.id,
      action: "scanned",
      details: { barcode: code },
    });
  }

  // Fetch recent activity
  const { data: activity } = await supabase
    .from("activity_log")
    .select(`*, user:profiles(full_name, email)`)
    .eq("item_id", data.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({ ...data, activity: activity || [] });
}
