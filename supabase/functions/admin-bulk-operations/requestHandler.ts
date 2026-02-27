
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'
import { corsHeaders } from '../_shared/cors.ts'
import { authenticateAndAuthorize } from './auth.ts'
import { BulkOperationRequest, BulkOperationResult } from './types.ts'
import { 
  performBulkDelete, 
  performBulkUpdateCategory, 
  performBulkToggleFeatured, 
  performBulkUpdatePrice 
} from './bulkOperations.ts'

export async function handleBulkOperation(req: Request): Promise<Response> {
  console.log('🚀 Bulk operation request received')
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    console.log('🔐 Starting authentication...')
    
    // Authenticate and authorize the request
    const authResult = await authenticateAndAuthorize(req.headers.get('Authorization'), supabaseAdmin);
    
    if (!authResult.success) {
      console.error('❌ Authentication failed:', authResult.error)
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Authentication successful, processing request...')

    // Parse request body
    const { operation, toyIds, data }: BulkOperationRequest = await req.json()

    if (!operation || !toyIds || !Array.isArray(toyIds) || toyIds.length === 0) {
      console.error('❌ Invalid request parameters:', { operation, toyIds: toyIds?.length })
      return new Response(
        JSON.stringify({ error: 'Invalid request parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔧 Performing bulk ${operation} on ${toyIds.length} toys`)

    let result: BulkOperationResult

    switch (operation) {
      case 'delete':
        result = await performBulkDelete(toyIds, supabaseAdmin)
        break
      case 'update-category':
        result = await performBulkUpdateCategory(toyIds, data?.category, supabaseAdmin)
        break
      case 'toggle-featured':
        result = await performBulkToggleFeatured(toyIds, supabaseAdmin)
        break
      case 'update-price':
        result = await performBulkUpdatePrice(toyIds, data?.priceChangePercent, supabaseAdmin)
        break
      default:
        console.error('❌ Unsupported operation:', operation)
        return new Response(
          JSON.stringify({ error: 'Unsupported operation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    console.log('✅ Bulk operation completed:', result)

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 Bulk operation error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}
