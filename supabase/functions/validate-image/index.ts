import { corsHeaders } from '../_shared/cors.ts';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, validationType } = await req.json();

    if (!imageUrl || !validationType) {
      return new Response(JSON.stringify({ error: 'Missing imageUrl or validationType' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let prompt = '';
    if (validationType === 'payment_qr') {
      prompt = `Analyze this image. Is this a valid UPI/PhonePe/GPay/Paytm payment QR code or scanner image? 
      Respond with JSON only: {"isValid": true/false, "reason": "brief explanation"}
      - Valid: Any UPI payment QR code, PhonePe scanner, Google Pay QR, Paytm QR, or similar Indian payment QR codes
      - Invalid: Random QR codes, non-payment images, screenshots that aren't payment QR codes`;
    } else if (validationType === 'payment_receipt') {
      prompt = `Analyze this image. Is this a valid payment confirmation/success receipt or screenshot? 
      Respond with JSON only: {"isValid": true/false, "reason": "brief explanation"}
      - Valid: Payment success screenshots, transaction confirmation screens, UPI payment receipts, bank transfer confirmations showing "success" or "completed"
      - Invalid: Random images, failed payment screenshots, pending payment screenshots, non-payment related images`;
    } else {
      return new Response(JSON.stringify({ error: 'Invalid validationType' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', errorText);
      // If AI validation fails, allow the upload (don't block user)
      return new Response(JSON.stringify({ isValid: true, reason: 'Validation service unavailable, allowing upload.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON from AI response
    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ isValid: true, reason: 'Could not parse validation result.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ isValid: true, reason: 'Validation error, allowing upload.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
