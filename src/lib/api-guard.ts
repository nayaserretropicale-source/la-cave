import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function requireUser(req: Request) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    return {
      user: null,
      error: NextResponse.json({ error: "Connexion requise." }, { status: 401 }),
    };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Session invalide." }, { status: 401 }),
    };
  }

  return { user: data.user, error: null };
}