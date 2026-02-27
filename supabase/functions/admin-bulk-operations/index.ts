
import { handleBulkOperation } from './requestHandler.ts'

Deno.serve(async (req) => {
  return await handleBulkOperation(req)
})
