import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabase = createClient(
  'https://wucwpyitzqjukcphczhr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTMyNDI5NiwiZXhwIjoyMDY0OTAwMjk2fQ.aBnxAxxD4WiiDQS7m4j1JiluHa8BdCak9y334RILiKc'
);

async function checkOTPTable() {
    console.log('🔍 Checking otp_verifications table...');
    
    try {
        // Try to query the table directly
        const { data, error, count } = await supabase
            .from('otp_verifications')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error('❌ Error accessing otp_verifications table:', error);
            console.log('🔧 Table likely does not exist, will need to create it');
            return false;
        }

        console.log(`✅ otp_verifications table exists with ${count} records`);

        // Get a sample record to see the structure
        const { data: sampleData, error: sampleError } = await supabase
            .from('otp_verifications')
            .select('*')
            .limit(1);

        if (sampleError) {
            console.error('❌ Error getting sample data:', sampleError);
        } else if (sampleData && sampleData.length > 0) {
            console.log('📋 Table structure (columns):');
            console.log(Object.keys(sampleData[0]).join(', '));
        } else {
            console.log('📋 Table exists but has no data');
        }

        // Check for recent OTP records
        const { data: recentOTPs, error: recentError } = await supabase
            .from('otp_verifications')
            .select('phone_number, otp_code, created_at, is_verified, expires_at')
            .order('created_at', { ascending: false })
            .limit(5);

        if (!recentError && recentOTPs) {
            console.log('\n📱 Recent OTP records:');
            recentOTPs.forEach(otp => {
                const isExpired = new Date(otp.expires_at) < new Date();
                console.log(`  ${otp.phone_number}: ${otp.otp_code} (${otp.is_verified ? 'verified' : 'pending'}, ${isExpired ? 'expired' : 'valid'})`);
            });
        }

        return true;

    } catch (error) {
        console.error('💥 Unexpected error:', error);
        return false;
    }
}

async function createOTPTable() {
    console.log('🔧 Creating otp_verifications table...');
    
    const createTableSQL = `
        -- Create otp_verifications table if it doesn't exist
        CREATE TABLE IF NOT EXISTS public.otp_verifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            phone_number TEXT NOT NULL,
            otp_code TEXT NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            is_verified BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );

        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_otp_verifications_phone_number ON public.otp_verifications(phone_number);
        CREATE INDEX IF NOT EXISTS idx_otp_verifications_otp_code ON public.otp_verifications(otp_code);
        CREATE INDEX IF NOT EXISTS idx_otp_verifications_expires_at ON public.otp_verifications(expires_at);

        -- Enable RLS
        ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can create OTP verifications" ON public.otp_verifications;
        CREATE POLICY "Users can create OTP verifications" ON public.otp_verifications
            FOR INSERT WITH CHECK (true);

        DROP POLICY IF EXISTS "Users can view their own OTP verifications" ON public.otp_verifications;
        CREATE POLICY "Users can view their own OTP verifications" ON public.otp_verifications
            FOR SELECT USING (true);

        DROP POLICY IF EXISTS "Users can update their own OTP verifications" ON public.otp_verifications;
        CREATE POLICY "Users can update their own OTP verifications" ON public.otp_verifications
            FOR UPDATE USING (true);

        -- Service role can manage all OTP verifications
        DROP POLICY IF EXISTS "Service role can manage all OTP verifications" ON public.otp_verifications;
        CREATE POLICY "Service role can manage all OTP verifications" ON public.otp_verifications
            FOR ALL USING (auth.jwt()->>'role' = 'service_role');

        -- Grant permissions
        GRANT ALL ON public.otp_verifications TO anon;
        GRANT ALL ON public.otp_verifications TO authenticated;
        GRANT ALL ON public.otp_verifications TO service_role;
    `;

    try {
        // Since we can't use exec_sql, we'll try another approach
        console.log('⚠️ Note: Will need to manually create table in Supabase dashboard');
        console.log('📋 SQL to run:');
        console.log(createTableSQL);
        return true;
    } catch (error) {
        console.error('❌ Error creating table:', error);
        return false;
    }
}

// Run the script
async function main() {
    const exists = await checkOTPTable();
    
    if (!exists) {
        await createOTPTable();
    }
    
    console.log('\n🎉 OTP table check completed');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('💥 Script failed:', error);
        process.exit(1);
    }); 