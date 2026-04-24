// supabase/functions/create-user/index.ts
// Esta Edge Function permite al admin crear estudiantes desde el panel
// Deploy con: supabase functions deploy create-user

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify the request comes from an authenticated admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    // Create admin client with service role key (only available server-side)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Verify caller is admin
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (!caller) throw new Error('Invalid token')

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (callerProfile?.role !== 'admin') {
      throw new Error('Solo los administradores pueden crear usuarios')
    }

    // Parse request body
    const { email, password, full_name, role = 'student' } = await req.json()
    if (!email || !password || !full_name) {
      throw new Error('Faltan campos requeridos: email, password, full_name')
    }

    // Create the user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name, role },
      email_confirm: true, // Skip email confirmation
    })

    if (createError) throw createError

    // Update profile role if needed
    if (role !== 'student') {
      await supabaseAdmin
        .from('profiles')
        .update({ role })
        .eq('id', newUser.user.id)
    }

    return new Response(
      JSON.stringify({ user_id: newUser.user.id, message: 'Usuario creado exitosamente' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
