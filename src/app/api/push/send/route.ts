import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { requireUser } from "@/lib/api-guard";

let vapidConfigured = false;
function ensureVapid() {
  if (vapidConfigured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  vapidConfigured = true;
}

function authedClient(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

const TYPES = new Set(["like", "comment", "friend_request"]);

export async function POST(req: NextRequest) {
  ensureVapid();
  const { user, error } = await requireUser(req);
  if (error) return error;

  const { type, toUserId, postId } = await req.json();
  const needsPost = type === "like" || type === "comment";
  if (!TYPES.has(type) || !toUserId || toUserId === user!.id || (needsPost && !postId)) {
    return NextResponse.json({ error: "missing params" }, { status: 400 });
  }

  const token = req.headers.get("authorization")!.slice(7);
  const supabase = authedClient(token);

  // La fonction SECURITY DEFINER ne rend des abonnements que si l'événement
  // déclencheur (like/commentaire/demande) existe réellement en base.
  const { data: subs } = await supabase.rpc("push_subs_for_event", {
    p_type: type,
    p_target: toUserId,
    p_post: needsPost ? postId : null,
  });

  if (!subs?.length) return NextResponse.json({ sent: 0 });

  // Message composé serveur-side à partir des données en base — jamais de texte libre client.
  const [{ data: me }, { data: post }] = await Promise.all([
    supabase.from("profiles").select("pseudo").eq("id", user!.id).single(),
    needsPost
      ? supabase.from("posts").select("cigare_nom").eq("id", postId).single()
      : Promise.resolve({ data: null as { cigare_nom: string } | null }),
  ]);
  const who = me?.pseudo || "Quelqu'un";

  let title: string;
  let body: string;
  if (type === "like") {
    title = "Nouveau like";
    body = `${who} a aimé ton cigare « ${post?.cigare_nom ?? "?"} »`;
  } else if (type === "comment") {
    const { data: c } = await supabase
      .from("comments")
      .select("texte")
      .eq("post_id", postId)
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    title = "Nouveau commentaire";
    body = `${who} a commenté « ${post?.cigare_nom ?? "?"} »${c?.texte ? ` : ${c.texte.slice(0, 60)}` : ""}`;
  } else {
    title = "Demande d'ami";
    body = `${who} t'a envoyé une demande d'ami`;
  }

  const payload = JSON.stringify({
    title,
    body,
    url: type === "friend_request" ? "/communaute" : "/notifs",
  });

  type Sub = { endpoint: string; p256dh: string; auth: string };
  const results = await Promise.allSettled(
    (subs as Sub[]).map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      )
    )
  );

  // Clean up expired subscriptions (410 Gone)
  const expired = results
    .map((r, i) => ({ r, s: (subs as Sub[])[i] }))
    .filter(({ r }) => r.status === "rejected" && (r as PromiseRejectedResult).reason?.statusCode === 410)
    .map(({ s }) => s.endpoint);

  if (expired.length) {
    await supabase.rpc("push_subs_cleanup", { p_target: toUserId, p_endpoints: expired });
  }

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ sent });
}
