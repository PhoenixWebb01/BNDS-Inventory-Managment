import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// GET /api/items - List all items (with optional filters)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Build filter conditions
  const where: Record<string, unknown> = {};

  const categoryId = searchParams.get("category_id");
  if (categoryId) where.categoryId = categoryId;

  const locationId = searchParams.get("location_id");
  if (locationId) where.locationId = locationId;

  const status = searchParams.get("status");
  if (status) where.status = status;

  const search = searchParams.get("search");
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { barcode: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  // Pagination
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const skip = (page - 1) * limit;

  try {
    const [items, count] = await Promise.all([
      prisma.item.findMany({
        where,
        include: {
          category: true,
          location: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.item.count({ where }),
    ]);

    return NextResponse.json({ items, count, page, limit });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/items - Create a new item
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();

  try {
    // If no barcode provided, auto-generate one
    let barcode = body.barcode;
    if (!barcode && body.category_id) {
      const category = await prisma.category.findUnique({
        where: { id: body.category_id },
        select: { prefix: true },
      });

      if (category) {
        // Count existing items with this prefix to generate next barcode
        const count = await prisma.item.count({
          where: { barcode: { startsWith: category.prefix } },
        });
        barcode = `${category.prefix}-${String(count + 1).padStart(5, "0")}`;
      }
    }

    // Create the item
    const item = await prisma.item.create({
      data: {
        barcode: barcode || `INV-${Date.now()}`,
        name: body.name,
        description: body.description || null,
        categoryId: body.category_id || null,
        locationId: body.location_id || null,
        quantity: body.quantity || 0,
        minQuantity: body.min_quantity || 0,
        unit: body.unit || "each",
        status: body.status || "in_stock",
        vendor: body.vendor || null,
        vendorSku: body.vendor_sku || null,
        notes: body.notes || null,
        createdBy: user.id,
      },
      include: {
        category: true,
        location: true,
      },
    });

    // Log the creation in the activity log
    await prisma.activityLog.create({
      data: {
        itemId: item.id,
        userId: user.id,
        action: "created",
        details: { item_name: item.name, barcode: item.barcode },
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
