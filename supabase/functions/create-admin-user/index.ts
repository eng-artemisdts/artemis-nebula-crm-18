import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create Supabase admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Check if admin user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const adminExists = existingUser?.users?.some(user => user.email === 'admin@email.com')

    if (adminExists) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Admin user already exists',
          email: 'admin@email.com'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create the admin user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@email.com',
      password: '132566@',
      email_confirm: true,
    })

    if (createError) {
      throw createError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Admin user created successfully',
        email: 'admin@email.com',
        userId: newUser.user?.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error creating admin user:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
