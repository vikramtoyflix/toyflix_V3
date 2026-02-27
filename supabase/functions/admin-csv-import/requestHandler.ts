
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'
import { corsHeaders } from '../_shared/cors.ts'
import { authenticateAndAuthorize } from './auth.ts'
import { processCSVImport } from './importProcessor.ts'

export async function handleImportRequest(req: Request): Promise<Response> {
  // Add comprehensive error boundary logging
  try {
    console.log('🚀 CSV Import function started successfully')
    console.log('📊 Request method:', req.method)
    console.log('📊 Request URL:', req.url)
    
    if (req.method === 'OPTIONS') {
      console.log('🔄 Handling CORS preflight request')
      return new Response(null, { headers: corsHeaders });
    }

    console.log('🔧 Creating Supabase admin client...')
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    console.log('✅ Supabase admin client created successfully')

    console.log('🔐 Starting authentication...')
    const authHeader = req.headers.get('Authorization');
    console.log('🔑 Auth header present:', !!authHeader)
    console.log('🔑 Auth header format:', authHeader ? 'Bearer token found' : 'No auth header')
    
    // Authenticate and authorize the request
    const authResult = await authenticateAndAuthorize(authHeader, supabaseAdmin);
    
    if (!authResult.success) {
      console.error('❌ Authentication failed:', authResult.error)
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Authentication successful, processing request...')

    // Parse request with all import options
    console.log('📝 Parsing request body...')
    let requestData;
    try {
      requestData = await req.json();
      console.log('✅ Request body parsed successfully')
      console.log('📊 CSV data rows:', requestData.csvData?.length || 0)
    } catch (parseError) {
      console.error('❌ Failed to parse request JSON:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { csvData, downloadImages, skipDuplicates, enhanced, categoryMappingMode, importMode, clearExistingData } = requestData;
    
    if (!csvData || !Array.isArray(csvData)) {
      console.error('❌ Invalid CSV data provided:', typeof csvData, Array.isArray(csvData))
      return new Response(
        JSON.stringify({ error: 'Invalid CSV data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📊 Processing CSV import with options:', {
      csvRowCount: csvData.length,
      downloadImages: downloadImages || false,
      skipDuplicates: skipDuplicates !== false,
      enhanced: enhanced || false,
      categoryMappingMode,
      importMode,
      clearExistingData: clearExistingData || false
    })

    // Process the CSV import
    console.log('🔄 Starting CSV import processing...')
    const results = await processCSVImport({
      csvData,
      downloadImages: downloadImages || false,
      skipDuplicates: skipDuplicates !== false, // default to true
      enhanced: enhanced || false,
      categoryMappingMode,
      importMode,
      clearExistingData: clearExistingData || false
    }, supabaseAdmin);

    console.log('✅ CSV import completed:', {
      successful: results.successful,
      failed: results.failed,
      total: results.successful + results.failed
    })

    return new Response(
      JSON.stringify(results),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Critical CSV import function error:', error)
    console.error('💥 Error name:', error instanceof Error ? error.name : 'Unknown')
    console.error('💥 Error message:', error instanceof Error ? error.message : 'Unknown error')
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    let errorMessage = 'Internal server error'
    let statusCode = 500
    
    if (error instanceof Error) {
      errorMessage = error.message
      
      // Handle specific error types
      if (errorMessage.includes('authentication') || errorMessage.includes('token')) {
        errorMessage = 'Authentication failed. Please sign in again.'
        statusCode = 401
      } else if (errorMessage.includes('Admin privileges')) {
        errorMessage = 'Admin privileges required for CSV import.'
        statusCode = 403
      } else if (errorMessage.includes('Invalid CSV data')) {
        statusCode = 400
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
