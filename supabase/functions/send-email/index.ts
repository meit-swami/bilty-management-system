import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "https://esm.sh/nodemailer@6.9.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { to, subject, body_html, template_id, related_type, related_id } = await req.json();

    if (!to || !subject) {
      throw new Error("Missing required fields: to, subject");
    }

    // Get outgoing SMTP settings
    const { data: smtp, error: smtpErr } = await supabase
      .from("smtp_settings")
      .select("*")
      .eq("type", "outgoing")
      .eq("is_active", true)
      .maybeSingle();

    if (smtpErr || !smtp) {
      throw new Error("No active outgoing SMTP configuration found. Please configure SMTP in Settings.");
    }

    // Get auth user from token
    const authHeader = req.headers.get("authorization");
    let sentBy = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      sentBy = user?.id || null;
    }

    // Resolve template if provided
    let finalHtml = body_html || "";
    let finalSubject = subject;
    if (template_id) {
      const { data: template } = await supabase
        .from("email_templates")
        .select("*")
        .eq("id", template_id)
        .single();
      if (template) {
        finalHtml = template.body_html || finalHtml;
        finalSubject = template.subject || finalSubject;
      }
    }

    // Create email log entry
    const { data: logEntry, error: logErr } = await supabase
      .from("email_logs")
      .insert({
        to_email: to,
        subject: finalSubject,
        body_html: finalHtml,
        status: "pending",
        template_id: template_id || null,
        related_type: related_type || null,
        related_id: related_id || null,
        sent_by: sentBy,
      })
      .select()
      .single();

    if (logErr) {
      console.error("Failed to create email log:", logErr);
    }

    // Configure nodemailer transport
    const transportConfig: any = {
      host: smtp.host,
      port: smtp.port,
      auth: { user: smtp.username, pass: smtp.password },
    };

    if (smtp.encryption === "ssl") {
      transportConfig.secure = true;
    } else if (smtp.encryption === "tls") {
      transportConfig.secure = false;
      transportConfig.tls = { rejectUnauthorized: false };
    } else {
      transportConfig.secure = false;
    }

    const transporter = nodemailer.createTransport(transportConfig);

    // Add tracking pixel
    const trackingPixel = logEntry
      ? `<img src="${supabaseUrl}/functions/v1/track-email?id=${logEntry.id}" width="1" height="1" style="display:none" />`
      : "";

    const mailOptions = {
      from: smtp.from_name ? `"${smtp.from_name}" <${smtp.from_email}>` : smtp.from_email,
      to,
      subject: finalSubject,
      html: finalHtml + trackingPixel,
    };

    await transporter.sendMail(mailOptions);

    // Update log status
    if (logEntry) {
      await supabase
        .from("email_logs")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", logEntry.id);
    }

    return new Response(JSON.stringify({ success: true, message: "Email sent" }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Email send error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
