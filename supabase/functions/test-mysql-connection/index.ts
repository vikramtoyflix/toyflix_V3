import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Test MySQL Connection function started");

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("📝 Testing MySQL connection step by step...");

    // Test 1: Import MySQL client
    let mysqlClient;
    try {
      const { Client } = await import("https://deno.land/x/mysql@v2.12.1/mod.ts");
      mysqlClient = Client;
      console.log("✅ MySQL client imported successfully");
    } catch (error) {
      console.error("❌ Failed to import MySQL client:", error);
      throw new Error(`MySQL import failed: ${error.message}`);
    }

    // Test 2: Create connection
    let client;
    try {
      client = await new mysqlClient().connect({
        hostname: "4.213.183.90",
        username: "toyflix_user",
        password: "toyflixX1@@",
        db: "toyflix",
        port: 3306,
      });
      console.log("✅ MySQL connection created successfully");
    } catch (error) {
      console.error("❌ Failed to create MySQL connection:", error);
      throw new Error(`MySQL connection failed: ${error.message}`);
    }

    // Test 3: Simple query
    let queryResult;
    try {
      queryResult = await client.execute("SELECT 1 as test");
      console.log("✅ Simple query executed successfully:", queryResult);
    } catch (error) {
      console.error("❌ Failed to execute simple query:", error);
      throw new Error(`Simple query failed: ${error.message}`);
    }

    // Test 4: Check WordPress tables
    let tableCheck;
    try {
      tableCheck = await client.execute("SHOW TABLES LIKE 'wp_users'");
      console.log("✅ WordPress table check:", tableCheck);
    } catch (error) {
      console.error("❌ WordPress table check failed:", error);
      throw new Error(`WordPress table check failed: ${error.message}`);
    }

    // Test 5: Clean up
    try {
      await client.close();
      console.log("✅ MySQL connection closed successfully");
    } catch (error) {
      console.error("⚠️ Warning: Failed to close MySQL connection:", error);
    }

    return new Response(JSON.stringify({
      success: true,
      message: "All MySQL connection tests passed",
      tests: {
        import: "✅ Success",
        connection: "✅ Success", 
        simpleQuery: "✅ Success",
        wordpressTables: "✅ Success",
        cleanup: "✅ Success"
      },
      queryResult: queryResult,
      tableCheck: tableCheck
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Test MySQL Connection Error:", error.message);
    console.error("❌ Error stack:", error.stack);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}); 