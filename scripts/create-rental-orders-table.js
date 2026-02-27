import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabase = createClient(
  'https://wucwpyitzqjukcphczhr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTMyNDI5NiwiZXhwIjoyMDY0OTAwMjk2fQ.aBnxAxxD4WiiDQS7m4j1JiluHa8BdCak9y334RILiKc'
);

const createRentalOrdersTable = `
-- Create rental_orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.rental_orders (
    -- Primary key and references
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL,
    legacy_order_id TEXT,
    legacy_created_at TIMESTAMP WITH TIME ZONE,
    migrated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Order status and type
    status TEXT NOT NULL DEFAULT 'pending',
    order_type TEXT DEFAULT 'subscription',
    
    -- Subscription details
    subscription_plan TEXT,
    subscription_id UUID,
    subscription_category TEXT,
    age_group TEXT,
    
    -- Financial information
    total_amount NUMERIC(10,2) DEFAULT 0,
    base_amount NUMERIC(10,2) DEFAULT 0,
    gst_amount NUMERIC(10,2) DEFAULT 0,
    discount_amount NUMERIC(10,2) DEFAULT 0,
    payment_amount NUMERIC(10,2) DEFAULT 0,
    payment_currency TEXT DEFAULT 'INR',
    
    -- Payment details
    payment_status TEXT DEFAULT 'pending',
    payment_method TEXT,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    coupon_code TEXT,
    
    -- Rental cycle information
    cycle_number INTEGER DEFAULT 1,
    rental_start_date DATE NOT NULL,
    rental_end_date DATE NOT NULL,
    
    -- Delivery information
    delivery_date DATE,
    returned_date DATE,
    return_status TEXT DEFAULT 'not_returned',
    
    -- Toys data (JSONB for flexible storage)
    toys_data JSONB DEFAULT '[]'::jsonb,
    toys_delivered_count INTEGER DEFAULT 0,
    toys_returned_count INTEGER DEFAULT 0,
    
    -- Address information (JSONB for structured data)
    shipping_address JSONB,
    delivery_instructions TEXT,
    pickup_instructions TEXT,
    
    -- Next cycle information
    next_cycle_address JSONB,
    next_cycle_toys_selected BOOLEAN DEFAULT false,
    next_cycle_prepared BOOLEAN DEFAULT false,
    
    -- Quality feedback
    quality_rating INTEGER,
    feedback TEXT,
    damage_reported BOOLEAN DEFAULT false,
    damage_details TEXT,
    
    -- Admin information
    admin_notes TEXT,
    internal_status TEXT DEFAULT 'active',
    dispatch_tracking_number TEXT,
    return_tracking_number TEXT,
    
    -- User contact information
    user_phone TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID,
    updated_by UUID,
    
    -- Status timestamps
    confirmed_at TIMESTAMP WITH TIME ZONE,
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE
);
`;

const createIndexes = `
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rental_orders_user_id ON public.rental_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_rental_orders_order_number ON public.rental_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_rental_orders_status ON public.rental_orders(status);
CREATE INDEX IF NOT EXISTS idx_rental_orders_created_at ON public.rental_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_rental_orders_rental_dates ON public.rental_orders(rental_start_date, rental_end_date);
CREATE INDEX IF NOT EXISTS idx_rental_orders_payment_status ON public.rental_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_rental_orders_cycle_number ON public.rental_orders(cycle_number);
CREATE INDEX IF NOT EXISTS idx_rental_orders_subscription_plan ON public.rental_orders(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_rental_orders_user_phone ON public.rental_orders(user_phone);
`;

async function createTable() {
    console.log('🚀 Creating rental_orders table...');
    
    try {
        // First, check if table already exists
        const { data: existingTables, error: checkError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            .eq('table_name', 'rental_orders');

        if (checkError) {
            console.log('⚠️ Could not check existing tables, proceeding with creation...');
        } else if (existingTables && existingTables.length > 0) {
            console.log('✅ rental_orders table already exists');
            return;
        }

        // Create the table
        const { error: createError } = await supabase.rpc('exec_sql', {
            sql: createRentalOrdersTable
        });

        if (createError) {
            console.error('❌ Error creating table:', createError);
            throw createError;
        }

        console.log('✅ rental_orders table created successfully');

        // Create indexes
        const { error: indexError } = await supabase.rpc('exec_sql', {
            sql: createIndexes
        });

        if (indexError) {
            console.error('❌ Error creating indexes:', indexError);
            throw indexError;
        }

        console.log('✅ Indexes created successfully');

        // Test the table by counting rows
        const { count, error: countError } = await supabase
            .from('rental_orders')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            console.error('❌ Error testing table access:', countError);
        } else {
            console.log(`✅ Table is accessible. Current row count: ${count}`);
        }

    } catch (error) {
        console.error('💥 Failed to create rental_orders table:', error);
        throw error;
    }
}

// Run the script
createTable()
    .then(() => {
        console.log('🎉 Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Script failed:', error);
        process.exit(1);
    }); 