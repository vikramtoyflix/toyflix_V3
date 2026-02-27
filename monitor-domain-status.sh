#!/bin/bash

echo "🔄 Monitoring toyflix.in Domain Status"
echo "======================================"

while true; do
    clear
    echo "🔄 Monitoring toyflix.in Domain Status - $(date)"
    echo "======================================"
    
    echo ""
    echo "🌐 DNS Status:"
    A_RECORD=$(dig toyflix.in A +short)
    echo "   A Record: $A_RECORD"
    
    TXT_RECORD=$(dig _dnsauth.toyflix.in TXT +short)
    echo "   TXT Record: $TXT_RECORD"
    
    echo ""
    echo "🔍 HTTP Tests:"
    
    # Test HTTP
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://toyflix.in)
    echo "   HTTP (toyflix.in): $HTTP_STATUS"
    
    # Test HTTPS
    HTTPS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -k https://toyflix.in 2>/dev/null)
    echo "   HTTPS (toyflix.in): $HTTPS_STATUS"
    
    # Test Azure direct
    AZURE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://orange-smoke-06038a000.azurestaticapps.net)
    echo "   Azure Direct: $AZURE_STATUS"
    
    echo ""
    echo "📊 Status Summary:"
    
    if [[ "$HTTP_STATUS" == "200" ]] || [[ "$HTTPS_STATUS" == "200" ]]; then
        echo "   🎉 SUCCESS! Domain is working!"
        echo "   ✅ https://toyflix.in is now accessible"
        echo ""
        echo "🔗 Your site is live at: https://toyflix.in"
        break
    elif [[ "$HTTP_STATUS" == "404" ]] && [[ "$HTTPS_STATUS" == "404" ]]; then
        echo "   ⏳ Still in validation/setup process"
        echo "   💡 This is normal, Azure is configuring the domain"
    else
        echo "   ℹ️  HTTP: $HTTP_STATUS, HTTPS: $HTTPS_STATUS"
        echo "   ⏳ Domain validation in progress"
    fi
    
    echo ""
    echo "⏰ Checking again in 30 seconds... (Press Ctrl+C to stop)"
    sleep 30
done 