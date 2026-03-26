import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// GET /api/items/barcode/[code] - Look up item by barcode (used by scanner!)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  try {
    const item = await prisma.item.findUnique({
      where: { barcode: code },
      include: {
        category: true,
        location: true,
        assignedUser: true,
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: `No item found with barcode: ${code}` },
        { status: 404 }
      );
    }

    // Log the scan in the activity log
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await prisma.activityLog.create({
        data: {
          itemId: item.id,
          userId: user.id,
          action: "scanned",
          details: { barcode: code },
        },
      });
    }

    // Fetch recent activity
    const activity = await prisma.activityLog.findMany({
      where: { itemId: item.id },
      include: {
        user: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({ ...item, activity });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
