import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return new Response("", { status: 404 });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const userAgent = req.headers.get("user-agent") || "";
    
    // Simple browser/device detection
    let browser = "Unknown";
    let device = "Desktop";
    if (userAgent.includes("Chrome")) browser = "Chrome";
    else if (userAgent.includes("Firefox")) browser = "Firefox";
    else if (userAgent.includes("Safari")) browser = "Safari";
    else if (userAgent.includes("Edge")) browser = "Edge";

    if (userAgent.includes("Mobile") || userAgent.includes("Android")) device = "Mobile";
    else if (userAgent.includes("iPad") || userAgent.includes("Tablet")) device = "Tablet";

    // Update email log
    const { data: existing } = await supabase.from("email_logs").select("open_count").eq("id", id).single();
    
    await supabase.from("email_logs").update({
      status: "opened",
      opened_at: new Date().toISOString(),
      open_count: (existing?.open_count || 0) + 1,
      device,
      browser,
    }).eq("id", id);
  } catch (e) {
    console.error("Track email error:", e);
  }

  // Return 1x1 transparent pixel
  const pixel = new Uint8Array([
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
    0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21,
    0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00,
    0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
    0x01, 0x00, 0x3b,
  ]);

  return new Response(pixel, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
});
