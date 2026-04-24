import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, senderName, senderEmail } = await req.json();

    if (!message?.trim()) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store message in database
    const { error: dbError } = await supabase
      .from("contact_messages")
      .insert({
        message: message.trim(),
        sender_name: senderName || "Anonymous",
        sender_email: senderEmail || null,
      });

    if (dbError) {
      console.error("DB error:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to save message" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try to send email notification via Resend if API key is configured
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Eventora <noreply@eventora.com>",
            to: ["vijaykumareppili24@gmail.com"],
            subject: `New Contact Message from ${senderName || "Anonymous"}`,
            html: `
              <h2>New Contact Message from Eventora</h2>
              <p><strong>From:</strong> ${senderName || "Anonymous"} ${senderEmail ? `(${senderEmail})` : ""}</p>
              <p><strong>Message:</strong></p>
              <p>${message}</p>
              <hr/>
              <p style="color: #888; font-size: 12px;">Sent from Eventora Contact Form</p>
            `,
          }),
        });
        if (!emailRes.ok) {
          console.error("Email send failed:", await emailRes.text());
        }
      } catch (emailErr) {
        console.error("Email error:", emailErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Message sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
