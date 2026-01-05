import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const isLocalEnvironment = supabaseUrl.includes('localhost') || 
                               supabaseUrl.includes('127.0.0.1') ||
                               supabaseUrl.includes('.local') ||
                               Deno.env.get('ENVIRONMENT') === 'local'

    if (!isLocalEnvironment) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'This function is only available in local environment'
        }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )


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
