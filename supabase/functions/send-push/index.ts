import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import webpush from "npm:web-push@3.6.7"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!
const vapidPublicKey = 'BHS7GQfFygFJuBMs-BsjE9V7TfacKGf8W1wi6JWmsehDzu81nVQcFYpsjCtDILQl3NE4uWN0LUZ7UtpKFfBsj-o'

webpush.setVapidDetails(
  "mailto:nupieeprotreinamentos@gmail.com",
  vapidPublicKey,
  vapidPrivateKey
)

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  try {
    const { userId, title, body, url } = await req.json()
    if (!userId || !title) throw new Error("Missing required payload fields")

    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId)

    if (error) throw error
    if (!subs || subs.length === 0) return new Response(JSON.stringify({ message: "No subscriptions found" }), { status: 404, headers: { 'Content-Type': 'application/json' } })

    const payload = JSON.stringify({
      title,
      body: body || '',
      url: url || '/dashboard.html'
    })

    const sendPromises = subs.map(sub => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      }
      return webpush.sendNotification(pushSubscription, payload)
    })

    await Promise.all(sendPromises)

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
  }
})
