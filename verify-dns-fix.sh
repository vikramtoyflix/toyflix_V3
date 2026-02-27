#!/bin/bash

echo "🔍 Verifying toyflix.in DNS Configuration"
echo "========================================="

echo ""
echo "1. Checking CNAME record..."
CNAME_RESULT=$(dig toyflix.in CNAME +short)
if [[ -n "$CNAME_RESULT" ]]; then
    echo "✅ CNAME found: $CNAME_RESULT"
    if [[ "$CNAME_RESULT" == *"azurestaticapps.net"* ]]; then
        echo "✅ CNAME correctly points to Azure Static Web Apps"
    else
        echo "❌ CNAME points to wrong target. Should be: orange-smoke-06038a000.azurestaticapps.net"
    fi
else
    echo "❌ No CNAME record found"
    A_RECORD=$(dig toyflix.in A +short)
    if [[ -n "$A_RECORD" ]]; then
        echo "❌ Still has A record: $A_RECORD (should be removed)"
    fi
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
echo "3. Testing HTTP access..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://toyflix.in)
echo "HTTP Status: $HTTP_STATUS"

echo ""
echo "4. Testing HTTPS access..."
HTTPS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -k https://toyflix.in)
echo "HTTPS Status: $HTTPS_STATUS"

echo ""
echo "5. Expected correct configuration:"
echo "   toyflix.in CNAME orange-smoke-06038a000.azurestaticapps.net"
echo "   _dnsauth.toyflix.in TXT \"_yfihfssmcv9c3389jbxw95na085aw3a\""

echo ""
if [[ "$CNAME_RESULT" == *"azurestaticapps.net"* ]] && [[ -n "$TXT_RESULT" ]]; then
    echo "🎉 DNS configuration looks correct!"
    echo "   Wait 5-15 minutes for Azure to complete validation and SSL setup."
else
    echo "⚠️  DNS configuration needs fixing. Please update your domain registrar settings."
fi 