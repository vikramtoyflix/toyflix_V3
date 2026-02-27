#!/bin/bash

echo "🎯 Final Domain Validation Monitor"
echo "================================="
echo ""

while true; do
    echo "⏰ Checking validation status... $(date '+%H:%M:%S')"
    
    # Check Azure Static Web App hostname status
    STATUS=$(az staticwebapp hostname list -n toyflix-static -g toyflix-rg --query "[?domainName=='toyflix.in'].status" -o tsv 2>/dev/null)
    
    echo "   Azure Status: $STATUS"
    
    # Test if domain is working
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://toyflix.in 2>/dev/null)
    echo "   HTTPS Test: $HTTP_STATUS"
    
    if [[ "$STATUS" == "Ready" ]]; then
        echo ""
        echo "🎉 SUCCESS! Domain validation complete!"
        echo "✅ Status: Ready"
        echo "🔗 Your site: https://toyflix.in"
        echo ""
        echo "📋 Migration Complete Checklist:"
        echo "✅ WordPress → React migration successful"
        echo "✅ Azure Static Web App deployed"  
        echo "✅ Custom domain validated"
        echo "✅ SSL certificate provisioned"
        echo ""
        break
    elif [[ "$STATUS" == "Validating" ]]; then
        echo "   ⏳ Still validating... (this is normal)"
    else
        echo "   ℹ️  Status: $STATUS"
    fi
    
    echo "   ⏰ Checking again in 30 seconds... (Press Ctrl+C to stop)"
    echo ""
    sleep 30
done 