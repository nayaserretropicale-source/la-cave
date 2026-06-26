import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-guard";
import { createClient } from "@supabase/supabase-js";

function authedClient(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser(req);
  if (error) return error;

  const { endpoint, keys } = await req.json();
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "invalid subscription" }, { status: 400 });
  }

  const token = req.headers.get("authorization")!.slice(7);
  const supabase = authedClient(token);

  const { error: dbError } = await supabase.from("push_subscriptions").upsert(
    { user_id: user!.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    { onConflict: "user_id,endpoint" }
  );

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { user, error } = await requireUser(req);
  if (error) return error;

  const { endpoint } = await req.json();
  const token = req.headers.get("authorization")!.slice(7);
  const supabase = authedClient(token);

  await supabase.from("push_subscriptions").delete().eq("user_id", user!.id).eq("endpoint", endpoint);

  return NextResponse.json({ ok: true });
}
