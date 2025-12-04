import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookMessage {
  event: string;
  instance: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      senderPn?: string;
    };
    message?: any;
    pushName?: string;
  };
}

Deno.serve(async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Evolution webhook received');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: any = await req.json();
    console.log('Webhook payload:', JSON.stringify(payload, null, 2));


    if (payload.event === 'connection.update' || payload.event === 'CONNECTION_UPDATE') {
      const connectionState = payload.data?.state || payload.data?.connection || payload.connection;
      
      if (connectionState === 'open' || connectionState === 'connected') {

        const phoneNumber = payload.data?.user?.id || 
                           payload.data?.user?.jid?.split('@')[0] ||
                           payload.data?.jid?.split('@')[0] ||
                           payload.user?.id?.split('@')[0];
        
        if (phoneNumber) {
          const cleanedPhone = phoneNumber.replace(/\D/g, '');
          

          const { error: updateError } = await supabase
            .from('whatsapp_instances')
            .update({
              phone_number: cleanedPhone,
              status: 'connected',
              connected_at: new Date().toISOString(),
              qr_code: null,
            })
            .eq('instance_name', payload.instance);
          
          if (updateError) {
            console.error('Error updating instance phone number:', updateError);
          } else {
            console.log('Instance phone number updated:', cleanedPhone);
          }
        }
      }
      
      return new Response(
        JSON.stringify({ success: true, message: 'Connection update processed' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }


    if (payload.event !== 'messages.upsert' || payload.data?.key?.fromMe) {
      console.log('Ignoring event:', payload.event, 'fromMe:', payload.data?.key?.fromMe);
      return new Response(
        JSON.stringify({ message: 'Event ignored' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }


    const remoteJid = payload.data?.key?.remoteJid;
    const senderPn = payload.data?.key?.senderPn;
    
    let phoneNumber: string;
    

    if (senderPn && typeof senderPn === 'string') {
      phoneNumber = senderPn.split('@')[0];
    } else {
      phoneNumber = remoteJid.split('@')[0];
    }
    

    phoneNumber = phoneNumber.replace(/\D/g, '');
    

    if (phoneNumber.length < 10) {
      console.log('Invalid phone number format:', phoneNumber);
      return new Response(
        JSON.stringify({ message: 'Invalid phone number format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const contactName = payload.data?.pushName || '';

    console.log('Processing message from:', phoneNumber, 'name:', contactName, 'remoteJid:', remoteJid, 'senderPn:', senderPn);


    const { data: instance, error: instanceError } = await supabase
      .from('whatsapp_instances')
      .select('organization_id')
      .eq('instance_name', payload.instance)
      .single();

    if (instanceError || !instance) {
      console.error('Instance not found:', instanceError);
      return new Response(
        JSON.stringify({ error: 'Instance not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }


    const { data: existingLead, error: findError } = await supabase
      .from('leads')
      .select('*')
      .eq('contact_whatsapp', phoneNumber)
      .eq('organization_id', instance.organization_id)
      .maybeSingle();

    if (findError) {
      console.error('Error finding lead:', findError);
      throw findError;
    }

    if (existingLead) {

      console.log('Updating existing lead:', existingLead.id);
      
      const updateData: any = {
        status: 'conversa_iniciada',
        remote_jid: remoteJid,
      };


      if (contactName && !existingLead.name) {
        updateData.name = contactName;
      }

      const { error: updateError } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', existingLead.id);

      if (updateError) {
        console.error('Error updating lead:', updateError);
        throw updateError;
      }

      console.log('Lead updated successfully');
    } else {

      console.log('Creating new lead for:', phoneNumber);
      
      const { error: insertError } = await supabase
        .from('leads')
        .insert({
          name: contactName || `Lead ${phoneNumber}`,
          contact_whatsapp: phoneNumber,
          status: 'conversa_iniciada',
          organization_id: instance.organization_id,
          whatsapp_verified: true,
          source: 'whatsapp',
          remote_jid: remoteJid,
        });

      if (insertError) {
        console.error('Error creating lead:', insertError);
        throw insertError;
      }

      console.log('Lead created successfully');
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Lead processed' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
