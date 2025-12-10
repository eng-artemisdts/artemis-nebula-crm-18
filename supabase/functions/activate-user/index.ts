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
    const { email, userId } = await req.json()

    if (!email && !userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email ou userId é obrigatório'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

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

    let targetUserId = userId

    if (!targetUserId && email) {
      const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers()

      if (listError) {
        throw listError
      }

      const user = usersData?.users?.find(u => u.email === email)

      if (!user) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Usuário com email ${email} não encontrado`
          }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      targetUserId = user.id
    }

    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      {
        email_confirm: true,
      }
    )

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Usuário ativado com sucesso',
        userId: updatedUser.user?.id,
        email: updatedUser.user?.email,
        emailConfirmed: updatedUser.user?.email_confirmed_at ? true : false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error activating user:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao ativar usuário'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})


