import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/categories - List all categories
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json(categories);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/categories - Create a new category
export async function POST(req: NextRequest) {
  const body = await req.json();

  try {
    const category = await prisma.category.create({
      data: {
        name: body.name,
        description: body.description || null,
        prefix: body.prefix,
        color: body.color,
        icon: body.icon || "package",
        customFields: body.custom_fields || [],
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
