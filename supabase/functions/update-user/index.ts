import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerRoles } = await adminClient
      .from("user_roles").select("role").eq("user_id", caller.id);

    const isAdmin = (callerRoles || []).some(
      (r: any) => r.role === "super_admin" || r.role === "admin"
    );
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Only admins can update users" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, full_name, phone, password, roles, role, is_active } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update profile
    if (full_name !== undefined || phone !== undefined || is_active !== undefined) {
      const updates: any = {};
      if (full_name !== undefined) updates.full_name = full_name;
      if (phone !== undefined) updates.phone = phone;
      if (is_active !== undefined) updates.is_active = is_active;
      await adminClient.from("profiles").update(updates).eq("user_id", user_id);
    }

    // Update password
    if (password && password.length >= 6) {
      const { error: pwError } = await adminClient.auth.admin.updateUserById(user_id, { password });
      if (pwError) {
        return new Response(JSON.stringify({ error: pwError.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Update roles (support array or single)
    const rolesToAssign = roles ? (Array.isArray(roles) ? roles : [roles]) : (role ? [role] : null);
    if (rolesToAssign && rolesToAssign.length > 0) {
      await adminClient.from("user_roles").delete().eq("user_id", user_id);
      for (const r of rolesToAssign) {
        await adminClient.from("user_roles").insert({ user_id, role: r });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
