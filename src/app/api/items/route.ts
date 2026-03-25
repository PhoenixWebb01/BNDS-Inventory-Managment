import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client that uses the user's auth token
function getSupabase(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

// GET /api/items - List all items (with optional filters)
export async function GET(req: NextRequest) {
  const supabase = getSupabase(req);
  const { searchParams } = new URL(req.url);

  // Build query with optional filters
  let query = supabase
    .from("items")
    .select(`
      *,
      category:categories(*),
      location:locations(*)
    `)
    .order("created_at", { ascending: false });

  // Filter by category
  const categoryId = searchParams.get("category_id");
  if (categoryId) query = query.eq("category_id", categoryId);

  // Filter by location
  const locationId = searchParams.get("location_id");
  if (locationId) query = query.eq("location_id", locationId);

  // Filter by status
  const status = searchParams.get("status");
  if (status) query = query.eq("status", status);

  // Search by name
  const search = searchParams.get("search");
  if (search) query = query.ilike("name", `%${search}%`);

  // Pagination
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const from = (page - 1) * limit;
  query = query.range(from, from + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data, count, page, limit });
}

// POST /api/items - Create a new item
export async function POST(req: NextRequest) {
  const supabase = getSupabase(req);
  const body = await req.json();

  // Get the user's ID for the created_by field
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // If no barcode provided, auto-generate one
  let barcode = body.barcode;
  if (!barcode && body.category_id) {
    // Look up the category prefix
    const { data: category } = await supabase
      .from("categories")
      .select("prefix")
      .eq("id", body.category_id)
      .single();

    if (category) {
      // Call our barcode generator function
      const { data: barcodeData } = await supabase
        .rpc("generate_barcode", { prefix: category.prefix });
      barcode = barcodeData;
    }
  }

  // Create the item
  const { data, error } = await supabase
    .from("items")
    .insert({
      ...body,
      barcode,
      created_by: user.id,
    })
    .select(`
      *,
      category:categories(*),
      location:locations(*)
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log the creation in the activity log
  await supabase.from("activity_log").insert({
    item_id: data.id,
    user_id: user.id,
    action: "created",
    details: { item_name: data.name, barcode: data.barcode },
  });

  return NextResponse.json(data, { status: 201 });
}
