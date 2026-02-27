# Azure Static Web App Connectivity Troubleshooting

## Issue: NSG Rule Added But Still Getting Console Errors

### Step 1: Add Multiple NSG Rules for Different Azure Regions

Add these additional inbound rules in your NSG:

#### Rule 1: Azure Static Web Apps - West Europe
```
Source: IP Addresses
Source IP addresses: 20.50.2.0/23,20.50.4.0/22,20.50.8.0/21
Destination: Any
Destination port: 3001
Protocol: TCP
Action: Allow
Priority: 1001
Name: AllowStaticWebApp-WestEurope
```

#### Rule 2: Azure Static Web Apps - East US
```
Source: IP Addresses  
Source IP addresses: 20.42.2.0/23,20.42.4.0/22,20.42.8.0/21
Destination: Any
Destination port: 3001
Protocol: TCP
Action: Allow
Priority: 1002
Name: AllowStaticWebApp-EastUS
```

#### Rule 3: Allow All Azure Datacenters (Broad)
```
Source: IP Addresses
Source IP addresses: 20.0.0.0/8,13.64.0.0/11,40.64.0.0/10
Destination: Any
Destination port: 3001
Protocol: TCP
Action: Allow
Priority: 1003
Name: AllowAllAzureDatacenters
```

### Step 2: VM Firewall Configuration

SSH into your VM and configure the firewall:

```bash
# SSH to your VM
ssh username@4.213.183.90

# Check current firewall status
sudo ufw status verbose

# Allow all Azure IP ranges
sudo ufw allow from 20.0.0.0/8 to any port 3001
sudo ufw allow from 13.64.0.0/11 to any port 3001  
sudo ufw allow from 40.64.0.0/10 to any port 3001

# Reload firewall
sudo ufw reload

# Verify rules
sudo ufw status numbered
```

### Step 3: Check Express Server Configuration

Ensure your Express server is binding to all interfaces:

```javascript
// Should be 0.0.0.0, not 127.0.0.1 or localhost
app.listen(3001, '0.0.0.0', () => {
  console.log('🚀 WooCommerce API server running on port 3001');
});
```

### Step 4: Test from Azure Cloud Shell

1. Open Azure Portal → Cloud Shell
2. Test direct connection:

```bash
# Test from Azure Cloud Shell (this comes from Azure network)
curl -v http://4.213.183.90:3001/api/health

# If this fails, the issue is definitely networking
```

### Step 5: Alternative - Enable HTTPS with Nginx Reverse Proxy

If HTTP continues to fail, set up HTTPS:

```bash
# Install nginx on your VM
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx

# Configure nginx reverse proxy
sudo nano /etc/nginx/sites-available/woocommerce-api

# Add this content:
server {
    listen 80;
    server_name 4.213.183.90;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Enable the site
sudo ln -s /etc/nginx/sites-available/woocommerce-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Open port 80 in NSG and test with HTTP first
```

### Step 6: Check Static Web App Region

Find your Static Web App region and add specific IP ranges:

1. Go to Static Web Apps in Azure Portal
2. Click your app → Overview
3. Note the "Location" (region)
4. Add IP ranges specific to that region

### Step 7: Alternative Solution - Azure Application Gateway

If direct connection continues to fail, set up Application Gateway:

1. Create Application Gateway in same resource group
2. Point backend to your VM:3001
3. Update your app to use Application Gateway URL
4. Application Gateway provides managed HTTPS endpoint 