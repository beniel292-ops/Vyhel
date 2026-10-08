import { NextResponse, type NextRequest } from "next/server";
import { searchAll } from "@/server/queries/public";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  try {
    const r = await searchAll(q, 6);
    return NextResponse.json(
      {
        products: r.products.map(({ slug, name, categoryName }) => ({ slug, name, categoryName })),
        guides: r.guides.map(({ slug, title, categoryName }) => ({ slug, title, categoryName })),
        collections: r.collections,
        categories: r.categories,
      },
      { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (err) {
    console.error("[search]", err);
    return NextResponse.json({ products: [], guides: [], collections: [], categories: [] }, { status: 500 });
  }
}
