import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateLeadStatusRequest {
  lead_id: string;
  status_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: UpdateLeadStatusRequest = await req.json();

    if (!payload.lead_id || !payload.status_id) {
      return new Response(
        JSON.stringify({
          error: 'lead_id e status_id são obrigatórios'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Buscar o lead para obter a organização
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, organization_id, status')
      .eq('id', payload.lead_id)
      .single();

    if (leadError || !lead) {
      return new Response(
        JSON.stringify({
          error: 'Lead não encontrado'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Buscar o status para validar se existe e pertence à mesma organização
    const { data: status, error: statusError } = await supabase
      .from('lead_statuses')
      .select('id, status_key, label, organization_id')
      .eq('id', payload.status_id)
      .single();

    if (statusError || !status) {
      return new Response(
        JSON.stringify({
          error: 'Status não encontrado'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validar se o status pertence à mesma organização do lead
    if (status.organization_id !== lead.organization_id) {
      return new Response(
        JSON.stringify({
          error: 'Status não pertence à mesma organização do lead'
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Atualizar o lead com o status_key do status encontrado
    const { data: updatedLead, error: updateError } = await supabase
      .from('leads')
      .update({
        status: status.status_key,
        updated_at: new Date().toISOString()
      })
      .eq('id', payload.lead_id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar lead:', updateError);
      return new Response(
        JSON.stringify({
          error: 'Erro ao atualizar status do lead',
          details: updateError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Status do lead atualizado com sucesso',
        lead: updatedLead,
        status: {
          id: status.id,
          status_key: status.status_key,
          label: status.label
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Erro na função update-lead-status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({
        error: errorMessage
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
