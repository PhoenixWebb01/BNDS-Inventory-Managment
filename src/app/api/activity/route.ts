import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/activity - Get recent activity across all items
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const limit = parseInt(searchParams.get("limit") || "50");
  const itemId = searchParams.get("item_id");

  try {
    const where: Record<string, unknown> = {};
    if (itemId) where.itemId = itemId;

    const activity = await prisma.activityLog.findMany({
      where,
      include: {
        user: { select: { fullName: true, email: true } },
        item: { select: { name: true, barcode: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(activity);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
