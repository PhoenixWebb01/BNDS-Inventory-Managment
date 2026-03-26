import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// GET /api/items/[id] - Get a single item by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        category: true,
        location: true,
        assignedUser: true,
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Also fetch recent activity for this item
    const activity = await prisma.activityLog.findMany({
      where: { itemId: id },
      include: {
        user: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ ...item, activity });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/items/[id] - Update an item
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  try {
    // Get the current item state for the activity log
    const oldItem = await prisma.item.findUnique({ where: { id } });
    if (!oldItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Build update data mapping snake_case body to camelCase Prisma fields
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category_id !== undefined) updateData.categoryId = body.category_id;
    if (body.location_id !== undefined) updateData.locationId = body.location_id;
    if (body.quantity !== undefined) updateData.quantity = body.quantity;
    if (body.min_quantity !== undefined) updateData.minQuantity = body.min_quantity;
    if (body.unit !== undefined) updateData.unit = body.unit;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.vendor !== undefined) updateData.vendor = body.vendor;
    if (body.vendor_sku !== undefined) updateData.vendorSku = body.vendor_sku;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.photo_url !== undefined) updateData.photoUrl = body.photo_url;

    // Update the item
    const item = await prisma.item.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        location: true,
      },
    });

    // Determine what type of change was made for the activity log
    let action = "updated";
    const details: Record<string, unknown> = {};

    if (body.quantity !== undefined && body.quantity !== oldItem.quantity) {
      action = "quantity_adjusted";
      details.old_quantity = oldItem.quantity;
      details.new_quantity = body.quantity;
    } else if (
      body.location_id !== undefined &&
      body.location_id !== oldItem.locationId
    ) {
      action = "moved";
      details.old_location_id = oldItem.locationId;
      details.new_location_id = body.location_id;
    } else if (body.status === "retired") {
      action = "retired";
    } else if (body.status === "disposed") {
      action = "disposed";
    }

    // Log the update
    await prisma.activityLog.create({
      data: {
        itemId: id,
        userId: user.id,
        action,
        details,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/items/[id] - Delete an item
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.item.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
