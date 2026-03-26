import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/locations - List all locations
export async function GET() {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json(locations);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/locations - Create a new location
export async function POST(req: NextRequest) {
  const body = await req.json();

  try {
    const location = await prisma.location.create({
      data: {
        name: body.name,
        zone: body.zone || null,
        shelf: body.shelf || null,
        building: body.building,
        description: body.description || null,
      },
    });

    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
