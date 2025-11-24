import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
};

interface GoogleDriveFile {
  id: string;
  name: string;
}

async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get('GOOGLE_DRIVE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_DRIVE_CLIENT_SECRET');
  const refreshToken = Deno.env.get('GOOGLE_DRIVE_REFRESH_TOKEN');

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google Drive credentials not configured');
  }

  console.log('Getting Google Drive access token');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to get access token:', response.status, errorText);
    throw new Error(`Failed to authenticate with Google Drive: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.access_token) {
    console.error('No access token in response:', data);
    throw new Error('No access token received from Google');
  }

  return data.access_token;
}

async function findOrCreateFolder(
  accessToken: string,
  folderName: string,
  parentId?: string
): Promise<string> {
  // Search for existing folder
  let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }

  const searchResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const searchData = await searchResponse.json();
  
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create folder if it doesn't exist
  const metadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    ...(parentId && { parents: [parentId] }),
  };

  const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  const folder = await createResponse.json();
  return folder.id;
}

async function uploadFile(
  accessToken: string,
  fileName: string,
  fileContent: Uint8Array,
  folderId: string
): Promise<GoogleDriveFile> {
  // Upload the file
  const metadata = {
    name: fileName,
    parents: [folderId],
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  // Convert Uint8Array to Array for Blob compatibility
  const fileArray = Array.from(fileContent);
  const blob = new Blob([new Uint8Array(fileArray)], { 
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
  });
  form.append('file', blob, fileName);

  console.log('Uploading file to Google Drive:', fileName);
  
  const uploadResponse = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    }
  );

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error('Google Drive upload error:', uploadResponse.status, errorText);
    throw new Error(`Failed to upload file: ${uploadResponse.status} - ${errorText.substring(0, 200)}`);
  }

  const uploadedFile = await uploadResponse.json();

  console.log('File uploaded, converting to Google Docs format');
  
  // Convert to Google Docs format
  const copyResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${uploadedFile.id}/copy`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: fileName.replace('.docx', ''),
        mimeType: 'application/vnd.google-apps.document',
      }),
    }
  );

  if (!copyResponse.ok) {
    const errorText = await copyResponse.text();
    console.error('Google Drive conversion error:', copyResponse.status, errorText);
    throw new Error(`Failed to convert file: ${copyResponse.status}`);
  }

  const convertedFile = await copyResponse.json();

  // Delete the original .docx file
  await fetch(`https://www.googleapis.com/drive/v3/files/${uploadedFile.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return {
    id: convertedFile.id,
    name: convertedFile.name,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Handle DELETE request
    if (req.method === 'DELETE') {
      const { fileId } = await req.json();
      
      if (!fileId) {
        throw new Error('Missing fileId');
      }

      const accessToken = await getAccessToken();
      
      console.log('Deleting file from Google Drive:', fileId);
      
      // Delete file from Google Drive
      const deleteResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        console.error('Failed to delete from Google Drive:', deleteResponse.status, errorText);
        throw new Error(`Failed to delete file from Google Drive: ${deleteResponse.status}`);
      }

      console.log('File deleted successfully from Google Drive');

      return new Response(
        JSON.stringify({ success: true, message: 'Arquivo deletado com sucesso' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      throw new Error('Organization not found');
    }

    const { data: organization } = await supabase
      .from('organizations')
      .select('company_name')
      .eq('id', profile.organization_id)
      .single();

    if (!organization?.company_name) {
      throw new Error('Company name not found');
    }

    // Parse multipart form data
    const formData = await req.formData();
    const files = formData.getAll('files');

    if (files.length === 0) {
      throw new Error('No files provided');
    }

    // Get access token
    const accessToken = await getAccessToken();

    // Create/find artemis-nebula folder
    const artemisFolder = await findOrCreateFolder(accessToken, 'artemis-nebula');

    // Create/find company folder
    const companyFolder = await findOrCreateFolder(
      accessToken,
      organization.company_name,
      artemisFolder
    );

    // Upload all files
    const uploadedFiles = [];
    for (const file of files) {
      if (file instanceof File) {
        const fileName = file.name;
        const fileContent = new Uint8Array(await file.arrayBuffer());

        const uploadedFile = await uploadFile(
          accessToken,
          fileName,
          fileContent,
          companyFolder
        );

        // Save to database
        const { data: savedDoc, error: saveError } = await supabase
          .from('company_documents')
          .insert({
            organization_id: profile.organization_id,
            file_name: uploadedFile.name,
            google_drive_file_id: uploadedFile.id,
            google_drive_folder_id: companyFolder,
          })
          .select()
          .single();

        if (saveError) {
          console.error('Error saving document to database:', saveError);
        } else {
          uploadedFiles.push(savedDoc);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        files: uploadedFiles,
        message: `${uploadedFiles.length} arquivo(s) enviado(s) com sucesso` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
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
