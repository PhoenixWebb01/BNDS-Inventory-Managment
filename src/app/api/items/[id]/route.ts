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

// GET /api/items/[id] - Get a single item by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase(req);
  const { id } = await params;

  const { data, error } = await supabase
    .from("items")
    .select(`
      *,
      category:categories(*),
      location:locations(*),
      assigned_user:profiles!items_assigned_to_fkey(*)
    `)
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  // Also fetch recent activity for this item
  const { data: activity } = await supabase
    .from("activity_log")
    .select(`
      *,
      user:profiles(full_name, email)
    `)
    .eq("item_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ ...data, activity: activity || [] });
}

// PATCH /api/items/[id] - Update an item
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase(req);
  const { id } = await params;
  const body = await req.json();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Get the current item state for the activity log
  const { data: oldItem } = await supabase
    .from("items")
    .select("*")
    .eq("id", id)
    .single();

  // Update the item
  const { data, error } = await supabase
    .from("items")
    .update(body)
    .eq("id", id)
    .select(`
      *,
      category:categories(*),
      location:locations(*)
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Determine what type of change was made for the activity log
  let action = "updated";
  const details: Record<string, unknown> = {};

  if (body.quantity !== undefined && oldItem && body.quantity !== oldItem.quantity) {
    action = "quantity_adjusted";
    details.old_quantity = oldItem.quantity;
    details.new_quantity = body.quantity;
  } else if (body.location_id !== undefined && oldItem && body.location_id !== oldItem.location_id) {
    action = "moved";
    details.old_location_id = oldItem.location_id;
    details.new_location_id = body.location_id;
  } else if (body.status === "retired") {
    action = "retired";
  } else if (body.status === "disposed") {
    action = "disposed";
  }

  // Log the update
  await supabase.from("activity_log").insert({
    item_id: id,
    user_id: user.id,
    action,
    details,
  });

  return NextResponse.json(data);
}

// DELETE /api/items/[id] - Delete an item (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase(req);
  const { id } = await params;

  const { error } = await supabase
    .from("items")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
