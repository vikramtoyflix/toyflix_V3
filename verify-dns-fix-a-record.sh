#!/bin/bash

echo "🔍 Verifying toyflix.in DNS Configuration (A Record Approach)"
echo "=============================================================="

echo ""
echo "1. Checking A record..."
A_RECORD=$(dig toyflix.in A +short)
if [[ -n "$A_RECORD" ]]; then
    echo "✅ A record found: $A_RECORD"
    if [[ "$A_RECORD" == "4.192.73.169" ]]; then
        echo "✅ A record correctly points to Azure Static Web App IP"
    else
        echo "⚠️  A record points to: $A_RECORD (expected: 4.192.73.169)"
    fi
else
    echo "❌ No A record found"
fi

echo ""
echo "2. Checking TXT validation record..."
TXT_RESULT=$(dig _dnsauth.toyflix.in TXT +short)
if [[ -n "$TXT_RESULT" ]]; then
    echo "✅ TXT record found: $TXT_RESULT"
else
    echo "❌ TXT validation record missing"
fi

echo ""
echo "3. Testing domain resolution..."
echo "   Resolves to: $(dig toyflix.in +short)"

echo ""
echo "4. Testing Azure Static Web App direct access..."
AZURE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://orange-smoke-06038a000.azurestaticapps.net)
echo "   Azure domain status: $AZURE_STATUS"

echo ""
echo "5. Current configuration (for Azure Static Web Apps apex domain):"
echo "   ✅ toyflix.in A 4.192.73.169"
echo "   ✅ _dnsauth.toyflix.in TXT \"_yfihfssmcv9c3389jbxw95na085aw3a\""

echo ""
if [[ "$A_RECORD" == "4.192.73.169" ]] && [[ -n "$TXT_RESULT" ]]; then
    echo "🎉 DNS configuration is CORRECT for Azure Static Web Apps!"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Wait 5-15 minutes for DNS propagation"
    echo "   2. Azure Static Web Apps should auto-detect the correct configuration"
    echo "   3. Domain validation should complete automatically"
    echo "   4. SSL certificate will be provisioned"
    echo ""
    echo "🔍 Current status check:"
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://toyflix.in)
    if [[ "$HTTP_STATUS" == "404" ]]; then
        echo "   ⏳ Domain shows 404 - This is normal during validation process"
        echo "   ⏳ Azure is still configuring the custom domain"
    elif [[ "$HTTP_STATUS" == "200" ]]; then
        echo "   ✅ Domain is working!"
    else
        echo "   ℹ️  HTTP Status: $HTTP_STATUS"
    fi
else
    echo "⚠️  DNS configuration needs adjustment."
fi

echo ""
echo "💡 Unlike CNAME approach, A records work immediately for Azure Static Web Apps"
echo "   with apex domains when other DNS records exist (NS, SOA, MX, TXT)." 