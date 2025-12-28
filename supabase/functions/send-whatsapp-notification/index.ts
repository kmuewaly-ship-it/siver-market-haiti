import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppNotificationRequest {
  notificationId?: string;
  phone: string;
  message: string;
  templateName?: string;
  templateParams?: Record<string, string>;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      notificationId,
      phone,
      message,
      templateName,
      templateParams,
    }: WhatsAppNotificationRequest = await req.json();

    // Validate required fields
    if (!phone || !message) {
      throw new Error("Missing required fields: phone, message");
    }

    // Get WhatsApp API credentials from secrets
    const whatsappApiKey = Deno.env.get("WHATSAPP_API_KEY");
    const whatsappPhoneId = Deno.env.get("WHATSAPP_PHONE_ID");
    
    if (!whatsappApiKey || !whatsappPhoneId) {
      console.log("WhatsApp not configured - logging message instead");
      console.log(`Would send to ${phone}: ${message}`);
      
      // Return success but indicate WhatsApp not configured
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "WhatsApp not configured - message logged",
          logged: { phone, message }
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Format phone number (remove + and spaces)
    const formattedPhone = phone.replace(/[+\s-]/g, '');

    // Build WhatsApp API request
    // Using WhatsApp Business API format
    const whatsappPayload = templateName
      ? {
          messaging_product: "whatsapp",
          to: formattedPhone,
          type: "template",
          template: {
            name: templateName,
            language: { code: "es" },
            components: templateParams
              ? [
                  {
                    type: "body",
                    parameters: Object.entries(templateParams).map(([_, value]) => ({
                      type: "text",
                      text: value,
                    })),
                  },
                ]
              : undefined,
          },
        }
      : {
          messaging_product: "whatsapp",
          to: formattedPhone,
          type: "text",
          text: { body: message },
        };

    // Send via WhatsApp Business API
    const whatsappResponse = await fetch(
      `https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${whatsappApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(whatsappPayload),
      }
    );

    const whatsappResult = await whatsappResponse.json();

    if (!whatsappResponse.ok) {
      throw new Error(`WhatsApp API error: ${JSON.stringify(whatsappResult)}`);
    }

    console.log("WhatsApp message sent:", whatsappResult);

    // Update notification if ID provided
    if (notificationId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase
        .from("notifications")
        .update({ is_whatsapp_sent: true })
        .eq("id", notificationId);
    }

    return new Response(
      JSON.stringify({ success: true, data: whatsappResult }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending WhatsApp notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
