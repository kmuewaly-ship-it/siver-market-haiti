import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ClickTrackingPayload {
  seller_id: string
  product_id?: string
  variant_id?: string
  source_type: 'pdf_catalog' | 'whatsapp_status' | 'direct_link'
  source_campaign?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get client info
    const userAgent = req.headers.get('user-agent') || ''
    const forwardedFor = req.headers.get('x-forwarded-for') || ''
    const realIp = req.headers.get('x-real-ip') || forwardedFor.split(',')[0].trim()
    
    // Simple device detection
    const isMobile = /mobile|android|iphone|ipad/i.test(userAgent)
    const deviceType = isMobile ? 'mobile' : 'desktop'

    // Hash IP for privacy
    const encoder = new TextEncoder()
    const data = encoder.encode(realIp + 'siver-salt-2024')
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const ipHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16)

    let payload: ClickTrackingPayload

    // Support both GET (for image pixel tracking) and POST
    if (req.method === 'GET') {
      const url = new URL(req.url)
      payload = {
        seller_id: url.searchParams.get('sid') || '',
        product_id: url.searchParams.get('pid') || undefined,
        variant_id: url.searchParams.get('vid') || undefined,
        source_type: (url.searchParams.get('src') as ClickTrackingPayload['source_type']) || 'direct_link',
        source_campaign: url.searchParams.get('camp') || undefined,
      }
    } else {
      payload = await req.json()
    }

    if (!payload.seller_id) {
      return new Response(
        JSON.stringify({ error: 'seller_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Tracking click:', {
      seller_id: payload.seller_id,
      product_id: payload.product_id,
      source_type: payload.source_type,
      device_type: deviceType,
    })

    // Insert click tracking record
    const { data: trackingData, error: insertError } = await supabase
      .from('catalog_click_tracking')
      .insert({
        seller_id: payload.seller_id,
        product_id: payload.product_id || null,
        variant_id: payload.variant_id || null,
        source_type: payload.source_type,
        source_campaign: payload.source_campaign || null,
        device_type: deviceType,
        user_agent: userAgent.substring(0, 500),
        ip_hash: ipHash,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Error inserting click tracking:', insertError)
      throw insertError
    }

    // For GET requests (pixel tracking), return a 1x1 transparent GIF
    if (req.method === 'GET') {
      const gif = new Uint8Array([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
        0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff,
        0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
        0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
        0x01, 0x00, 0x3b
      ])
      return new Response(gif, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      })
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        tracking_id: trackingData?.id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in track-catalog-click:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
