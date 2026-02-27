
import { BulkOperationResult } from './types.ts'

export async function performBulkDelete(toyIds: string[], supabaseAdmin: any): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    success: false,
    message: '',
    processed: 0,
    failed: 0,
    errors: []
  }

  for (const toyId of toyIds) {
    try {
      // First delete toy images (to avoid orphaned records)
      const { error: imageError } = await supabaseAdmin
        .from('toy_images')
        .delete()
        .eq('toy_id', toyId)

      if (imageError) {
        console.warn(`Failed to delete images for toy ${toyId}:`, imageError)
        // Continue with toy deletion even if image deletion fails
      }

      // Delete the toy
      const { error: toyError } = await supabaseAdmin
        .from('toys')
        .delete()
        .eq('id', toyId)

      if (toyError) {
        result.failed++
        result.errors.push(`Failed to delete toy ${toyId}: ${toyError.message}`)
        console.error(`Failed to delete toy ${toyId}:`, toyError)
      } else {
        result.processed++
        console.log(`Successfully deleted toy ${toyId}`)
      }
    } catch (error) {
      result.failed++
      result.errors.push(`Error processing toy ${toyId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      console.error(`Error deleting toy ${toyId}:`, error)
    }
  }

  result.success = result.failed === 0
  result.message = result.success 
    ? `Successfully deleted ${result.processed} toys`
    : `Deleted ${result.processed} toys, ${result.failed} failed`

  return result
}

export async function performBulkUpdateCategory(toyIds: string[], category: string | undefined, supabaseAdmin: any): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    success: false,
    message: '',
    processed: 0,
    failed: 0,
    errors: []
  }

  if (!category) {
    result.errors.push('Category is required for update operation')
    result.message = 'Category is required'
    return result
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('toys')
      .update({ category })
      .in('id', toyIds)
      .select('id')

    if (error) {
      result.failed = toyIds.length
      result.errors.push(`Failed to update category: ${error.message}`)
      result.message = 'Failed to update category'
    } else {
      result.processed = data?.length || 0
      result.success = true
      result.message = `Successfully updated category for ${result.processed} toys`
    }
  } catch (error) {
    result.failed = toyIds.length
    result.errors.push(`Error updating category: ${error instanceof Error ? error.message : 'Unknown error'}`)
    result.message = 'Error updating category'
  }

  return result
}

export async function performBulkToggleFeatured(toyIds: string[], supabaseAdmin: any): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    success: false,
    message: '',
    processed: 0,
    failed: 0,
    errors: []
  }

  // Get current featured status for each toy
  for (const toyId of toyIds) {
    try {
      const { data: toy, error: fetchError } = await supabaseAdmin
        .from('toys')
        .select('is_featured')
        .eq('id', toyId)
        .single()

      if (fetchError) {
        result.failed++
        result.errors.push(`Failed to fetch toy ${toyId}: ${fetchError.message}`)
        continue
      }

      // Toggle the featured status
      const { error: updateError } = await supabaseAdmin
        .from('toys')
        .update({ is_featured: !toy.is_featured })
        .eq('id', toyId)

      if (updateError) {
        result.failed++
        result.errors.push(`Failed to update toy ${toyId}: ${updateError.message}`)
      } else {
        result.processed++
      }
    } catch (error) {
      result.failed++
      result.errors.push(`Error processing toy ${toyId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  result.success = result.failed === 0
  result.message = result.success 
    ? `Successfully toggled featured status for ${result.processed} toys`
    : `Updated ${result.processed} toys, ${result.failed} failed`

  return result
}

export async function performBulkUpdatePrice(toyIds: string[], priceChangePercent: number | undefined, supabaseAdmin: any): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    success: false,
    message: '',
    processed: 0,
    failed: 0,
    errors: []
  }

  if (priceChangePercent === undefined || priceChangePercent === null) {
    result.errors.push('Price change percentage is required')
    result.message = 'Price change percentage is required'
    return result
  }

  const multiplier = 1 + (priceChangePercent / 100)

  for (const toyId of toyIds) {
    try {
      const { data: toy, error: fetchError } = await supabaseAdmin
        .from('toys')
        .select('rental_price, retail_price')
        .eq('id', toyId)
        .single()

      if (fetchError) {
        result.failed++
        result.errors.push(`Failed to fetch toy ${toyId}: ${fetchError.message}`)
        continue
      }

      const updates: any = {}
      if (toy.rental_price) {
        updates.rental_price = Math.round(toy.rental_price * multiplier * 100) / 100
      }
      if (toy.retail_price) {
        updates.retail_price = Math.round(toy.retail_price * multiplier * 100) / 100
      }

      if (Object.keys(updates).length === 0) {
        result.failed++
        result.errors.push(`Toy ${toyId} has no prices to update`)
        continue
      }

      const { error: updateError } = await supabaseAdmin
        .from('toys')
        .update(updates)
        .eq('id', toyId)

      if (updateError) {
        result.failed++
        result.errors.push(`Failed to update prices for toy ${toyId}: ${updateError.message}`)
      } else {
        result.processed++
      }
    } catch (error) {
      result.failed++
      result.errors.push(`Error processing toy ${toyId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  result.success = result.failed === 0
  result.message = result.success 
    ? `Successfully updated prices for ${result.processed} toys`
    : `Updated ${result.processed} toys, ${result.failed} failed`

  return result
}
