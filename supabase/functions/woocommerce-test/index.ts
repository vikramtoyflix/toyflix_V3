import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Client } from "https://deno.land/x/mysql@v2.12.1/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";

console.log("WooCommerce Test function started");

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔍 Testing WooCommerce database connection...");

    // Get environment variables
    const dbHost = Deno.env.get('WC_DB_HOST') || '4.213.183.90';
    const dbUser = Deno.env.get('WC_DB_USER') || 'toyflix_user';
    const dbPassword = Deno.env.get('WC_DB_PASSWORD') || 'toyflixX1@@';
    const dbName = Deno.env.get('WC_DB_NAME') || 'toyflix';
    const dbPort = parseInt(Deno.env.get('WC_DB_PORT') || '3306');

    console.log(`🔌 Connection details: ${dbUser}@${dbHost}:${dbPort}/${dbName}`);
    console.log(`🔑 Password length: ${dbPassword?.length || 0} chars`);

    // Test connection with timeout
    const client = new Client();
    
    console.log("⏱️ Attempting connection with 10s timeout...");
    
    const connectionPromise = client.connect({
      hostname: dbHost,
      username: dbUser,
      password: dbPassword,
      db: dbName,
      port: dbPort,
    });

    // Add timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000);
    });

    await Promise.race([connectionPromise, timeoutPromise]);
    console.log("✅ Connected to WordPress database successfully!");

    // Test a simple query
    console.log("🔍 Testing simple query...");
    const result = await client.execute("SELECT COUNT(*) as user_count FROM wp_users LIMIT 1");
    
    const userCount = result.rows?.[0]?.user_count || 0;
    console.log(`👥 Found ${userCount} users in wp_users table`);

    // Test phone search
    console.log("📱 Testing phone search...");
    const phoneResult = await client.execute(`
      SELECT COUNT(*) as phone_count 
      FROM wp_usermeta 
      WHERE meta_key = 'billing_phone' 
      LIMIT 1
    `);
    
    const phoneCount = phoneResult.rows?.[0]?.phone_count || 0;
    console.log(`📱 Found ${phoneCount} phone records in wp_usermeta`);

    await client.close();
    console.log("🔒 Database connection closed");

    return new Response(JSON.stringify({
      success: true,
      message: "Database connection test successful",
      data: {
        userCount,
        phoneCount,
        connectionDetails: {
          host: dbHost,
          port: dbPort,
          database: dbName,
          user: dbUser
        }
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Database test failed:", error.message);
    console.error("❌ Stack trace:", error.stack);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: {
        type: error.constructor.name,
        stack: error.stack?.split('\n').slice(0, 5) // First 5 lines of stack
      },
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}); 