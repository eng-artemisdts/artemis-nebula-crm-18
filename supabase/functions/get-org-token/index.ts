import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, x-supabase-client-platform, apikey, content-type, referer, user-agent',
  'Access-Control-Max-Age': '86400',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204 
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { organizationId, password } = await req.json();

    if (!organizationId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'organizationId é obrigatório',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Buscar um usuário da organização
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, organization_id')
      .eq('organization_id', organizationId)
      .limit(1)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Organização não encontrada ou sem usuários associados',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Buscar informações do usuário no auth.users
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
      profile.id
    );

    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Usuário não encontrado',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const userEmail = userData.user.email!;

    // Gerar um token de acesso usando a API Admin do Supabase
    // A forma correta é usar a API REST para criar um token
    // Endpoint: POST /auth/v1/admin/users/{user_id}/tokens
    const tokenResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${profile.id}/tokens`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expires_in: 3600,
      }),
    });

    let accessToken: string | null = null;

    if (tokenResponse.ok) {
      try {
        const tokenData = await tokenResponse.json();
        accessToken = tokenData.access_token || tokenData.token || tokenData.accessToken;
      } catch (e) {
        console.error('Erro ao parsear resposta do token:', e);
      }
    } else {
      const errorText = await tokenResponse.text().catch(() => 'Erro desconhecido');
      console.error('Erro na API de tokens:', tokenResponse.status, errorText);
    }

    if (!accessToken && password) {
      const passwordResponse = await fetch(
        `${supabaseUrl}/auth/v1/token?grant_type=password`,
        {
          method: 'POST',
          headers: {
            apikey: supabaseServiceKey,
            Authorization: `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: userEmail,
            password,
          }),
        }
      );

      if (passwordResponse.ok) {
        try {
          const passwordData = await passwordResponse.json();
          accessToken =
            passwordData.access_token ||
            passwordData.token ||
            passwordData.accessToken;
        } catch (e) {
          console.error('Erro ao parsear resposta da rota password:', e);
        }
      } else {
        const errorText = await passwordResponse.text().catch(() => 'Erro desconhecido');
        console.error('Erro na rota password:', passwordResponse.status, errorText);
      }
    }

    if (!accessToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Não foi possível gerar token automaticamente',
          message: 'Use a rota de autenticação padrão com email e senha do usuário',
          user_email: userEmail,
          organization_id: organizationId,
          auth_endpoint: `${supabaseUrl}/auth/v1/token?grant_type=password`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        access_token: accessToken,
        token_type: 'bearer',
        expires_in: 3600,
        organization_id: organizationId,
        user_id: profile.id,
        user_email: userEmail,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in get-org-token:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
