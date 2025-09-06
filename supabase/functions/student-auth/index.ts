import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface StudentLoginRequest {
  login_id: string
  password: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { login_id, password }: StudentLoginRequest = await req.json()

    if (!login_id || !password) {
      return new Response(
        JSON.stringify({ error: 'Login ID and password are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Look up student profile by login_id
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('user_id, password_hash, real_name, nickname')
      .eq('login_id', login_id)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Invalid login credentials' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, profile.password_hash)
    if (!validPassword) {
      return new Response(
        JSON.stringify({ error: 'Invalid login credentials' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Generate JWT token for the student
    const { data: tokenData, error: tokenError } = await supabaseClient.auth.admin.generateLink({
      type: 'magiclink',
      email: `student-${profile.user_id}@studyspark.local`, // Virtual email for students
      options: {
        redirectTo: `${Deno.env.get('SITE_URL')}/student`,
      },
    })

    if (tokenError) {
      console.error('Token generation error:', tokenError)
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: profile.user_id,
          real_name: profile.real_name,
          nickname: profile.nickname,
        },
        token: tokenData.properties?.access_token,
        refresh_token: tokenData.properties?.refresh_token,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Student auth error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})