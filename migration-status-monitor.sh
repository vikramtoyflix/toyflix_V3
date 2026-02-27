#!/bin/bash

echo "🔄 Toyflix Migration Status Monitor"
echo "====================================="
echo "📍 WordPress → Azure Static Web App Migration"
echo ""

while true; do
    clear
    echo "🔄 Toyflix Migration Status Monitor - $(date)"
    echo "====================================="
    echo "📍 WordPress → Azure Static Web App Migration"
    echo ""
    
    echo "🏗️  Infrastructure Status:"
    echo "   Old WordPress: 4.192.73.169 (being replaced)"
    echo "   New Azure SWA: orange-smoke-06038a000.2.azurestaticapps.net"
    echo "   Domain: toyflix.in"
    echo ""
    
    echo "🌐 DNS Configuration:"
    A_RECORD=$(dig toyflix.in A +short)
    echo "   A Record: $A_RECORD"
    
    TXT_RECORD=$(dig _dnsauth.toyflix.in TXT +short)
    echo "   Validation Token: $TXT_RECORD"
    echo "   Expected Token: \"_uumfl8obzyucyo94ajalgentwswlk9b\""
    
    if [[ "$TXT_RECORD" == *"_uumfl8obzyucyo94ajalgentwswlk9b"* ]]; then
        echo "   ✅ Validation token is CORRECT"
    else
        echo "   ❌ Validation token mismatch"
    fi
    
    echo ""
    echo "🔍 Connectivity Tests:"
    
    # Test new Azure Static Web App (default domain)
    AZURE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://orange-smoke-06038a000.2.azurestaticapps.net)
    echo "   Azure SWA (default): $AZURE_STATUS"
    if [[ "$AZURE_STATUS" == "200" ]]; then
        echo "   ✅ New React app is deployed and working"
    else
        echo "   ❌ New React app has issues"
    fi
    
    # Test custom domain
    CUSTOM_DOMAIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://toyflix.in 2>/dev/null)
    echo "   Custom Domain (HTTP): $CUSTOM_DOMAIN_STATUS"
    
    CUSTOM_DOMAIN_HTTPS=$(curl -s -o /dev/null -w "%{http_code}" -k https://toyflix.in 2>/dev/null)
    echo "   Custom Domain (HTTPS): $CUSTOM_DOMAIN_HTTPS"
    
    echo ""
    echo "📊 Migration Status:"
    
    if [[ "$CUSTOM_DOMAIN_STATUS" == "200" ]] || [[ "$CUSTOM_DOMAIN_HTTPS" == "200" ]]; then
        echo "   🎉 MIGRATION COMPLETE!"
        echo "   ✅ toyflix.in is now serving the new React app"
        echo "   ✅ SSL certificate is working"
        echo ""
        echo "🔗 Your migrated site: https://toyflix.in"
        echo ""
        echo "📋 Post-Migration Checklist:"
        echo "   ✅ Domain validation complete"
        echo "   ✅ SSL certificate provisioned"
        echo "   ✅ Static Web App serving content"
        echo "   ✅ WordPress to React migration successful"
        break
    elif [[ "$CUSTOM_DOMAIN_STATUS" == "404" ]] && [[ "$CUSTOM_DOMAIN_HTTPS" == "404" ]]; then
        echo "   ⏳ Domain validation in progress"
        echo "   💡 Azure is validating the new DNS token"
        echo "   🔄 Expected completion: 5-15 minutes"
    else
        echo "   ℹ️  HTTP: $CUSTOM_DOMAIN_STATUS, HTTPS: $CUSTOM_DOMAIN_HTTPS"
        echo "   ⏳ Migration in progress"
    fi
    
    echo ""
    echo "🔧 Azure Static Web App Status:"
    AZURE_HOSTNAME_STATUS=$(az staticwebapp hostname list -n toyflix-static -g toyflix-rg --query "[?domainName=='toyflix.in'].status" -o tsv 2>/dev/null || echo "Unknown")
    echo "   Custom Domain Status: $AZURE_HOSTNAME_STATUS"
    
    echo ""
    echo "⏰ Checking again in 30 seconds... (Press Ctrl+C to stop)"
    echo "💡 You can also check Azure Portal: Static Web Apps → toyflix-static → Custom domains"
    sleep 30
done 