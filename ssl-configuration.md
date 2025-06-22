# SSL Certificate Configuration Guide

This guide covers SSL certificate setup for production deployment of the Financial Dashboard.

## Vercel Deployment (Recommended)

### Automatic SSL with Vercel

Vercel provides automatic SSL certificates for all deployments:

1. **Custom Domain Setup**:
   ```bash
   # Add your custom domain in Vercel dashboard
   # Vercel automatically provisions Let's Encrypt certificates
   ```

2. **Domain Configuration**:
   - Add your domain in the Vercel dashboard
   - Configure DNS records to point to Vercel
   - SSL certificates are automatically managed

3. **Environment Variables**:
   ```bash
   # In Vercel dashboard, set:
   NEXTAUTH_URL=https://yourdomain.com
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   ```

### Custom SSL Certificate (Advanced)

If you need to use a custom SSL certificate:

1. **Upload Certificate**:
   - Go to Vercel Dashboard → Project Settings → Domains
   - Click on your domain → SSL Certificate
   - Upload your certificate files

2. **Certificate Requirements**:
   - Certificate file (.crt or .pem)
   - Private key file (.key)
   - Certificate chain (if applicable)

## Netlify Deployment

### Automatic SSL with Netlify

1. **Enable SSL**:
   ```bash
   # In netlify.toml (already configured)
   [build]
     publish = ".next"
   
   [[headers]]
     for = "/*"
     [headers.values]
       Strict-Transport-Security = "max-age=31536000; includeSubDomains"
   ```

2. **Custom Domain**:
   - Add domain in Netlify dashboard
   - Configure DNS records
   - SSL certificate automatically provisioned

## Self-Hosted Deployment

### Using Let's Encrypt with Nginx

1. **Install Certbot**:
   ```bash
   sudo apt update
   sudo apt install certbot python3-certbot-nginx
   ```

2. **Nginx Configuration**:
   ```nginx
   # /etc/nginx/sites-available/financial-dashboard
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;
       return 301 https://$server_name$request_uri;
   }
   
   server {
       listen 443 ssl http2;
       server_name yourdomain.com www.yourdomain.com;
   
       # SSL Configuration
       ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
       ssl_trusted_certificate /etc/letsencrypt/live/yourdomain.com/chain.pem;
   
       # SSL Security Settings
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
       ssl_prefer_server_ciphers off;
       ssl_session_cache shared:SSL:10m;
       ssl_session_timeout 10m;
       ssl_stapling on;
       ssl_stapling_verify on;
   
       # Security Headers
       add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
       add_header X-Frame-Options DENY always;
       add_header X-Content-Type-Options nosniff always;
       add_header X-XSS-Protection "1; mode=block" always;
       add_header Referrer-Policy "strict-origin-when-cross-origin" always;
   
       # Proxy to Next.js application
       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **Obtain SSL Certificate**:
   ```bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

4. **Auto-renewal Setup**:
   ```bash
   # Add to crontab
   0 12 * * * /usr/bin/certbot renew --quiet
   ```

### Using Custom SSL Certificate

1. **Upload Certificate Files**:
   ```bash
   sudo mkdir -p /etc/ssl/financial-dashboard
   sudo cp yourdomain.crt /etc/ssl/financial-dashboard/
   sudo cp yourdomain.key /etc/ssl/financial-dashboard/
   sudo chmod 600 /etc/ssl/financial-dashboard/*
   ```

2. **Update Nginx Configuration**:
   ```nginx
   ssl_certificate /etc/ssl/financial-dashboard/yourdomain.crt;
   ssl_certificate_key /etc/ssl/financial-dashboard/yourdomain.key;
   ```

## Docker Deployment with SSL

### Using Traefik (Recommended)

1. **docker-compose.yml**:
   ```yaml
   version: '3.8'
   
   services:
     traefik:
       image: traefik:v2.10
       command:
         - "--api.dashboard=true"
         - "--providers.docker=true"
         - "--entrypoints.web.address=:80"
         - "--entrypoints.websecure.address=:443"
         - "--certificatesresolvers.letsencrypt.acme.email=your-email@domain.com"
         - "--certificatesresolvers.letsencrypt.acme.storage=/acme.json"
         - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
       ports:
         - "80:80"
         - "443:443"
       volumes:
         - /var/run/docker.sock:/var/run/docker.sock
         - ./acme.json:/acme.json
       labels:
         - "traefik.http.routers.traefik.rule=Host(`traefik.yourdomain.com`)"
         - "traefik.http.routers.traefik.tls.certresolver=letsencrypt"
   
     financial-dashboard:
       build: .
       labels:
         - "traefik.enable=true"
         - "traefik.http.routers.app.rule=Host(`yourdomain.com`)"
         - "traefik.http.routers.app.tls.certresolver=letsencrypt"
         - "traefik.http.routers.app.entrypoints=websecure"
         - "traefik.http.routers.app-insecure.rule=Host(`yourdomain.com`)"
         - "traefik.http.routers.app-insecure.entrypoints=web"
         - "traefik.http.routers.app-insecure.middlewares=redirect-to-https"
         - "traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https"
   ```

2. **Initialize acme.json**:
   ```bash
   touch acme.json
   chmod 600 acme.json
   ```

## SSL Security Best Practices

### 1. Security Headers (Already in Next.js config)

```typescript
// next.config.ts
headers: [
  {
    source: '/(.*)',
    headers: [
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload'
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY'
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff'
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block'
      }
    ]
  }
]
```

### 2. HSTS Preload

Submit your domain to the HSTS preload list:
- Visit: https://hstspreload.org/
- Enter your domain
- Follow the submission process

### 3. Certificate Monitoring

Set up monitoring for certificate expiration:

```bash
# Certificate expiry check script
#!/bin/bash
DOMAIN="yourdomain.com"
EXPIRY_DATE=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))

if [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
    echo "Warning: SSL certificate expires in $DAYS_UNTIL_EXPIRY days"
    # Send alert (email, Slack, etc.)
fi
```

## Testing SSL Configuration

### 1. SSL Labs Test

Visit: https://www.ssllabs.com/ssltest/
Enter your domain to get a comprehensive SSL analysis.

### 2. Command Line Testing

```bash
# Test SSL configuration
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Check certificate details
echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -text

# Test HSTS
curl -I https://yourdomain.com | grep -i strict-transport-security
```

### 3. Automated Testing

```javascript
// Add to your test suite
describe('SSL Configuration', () => {
  test('should redirect HTTP to HTTPS', async () => {
    const response = await fetch('http://yourdomain.com', {
      redirect: 'manual'
    });
    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toContain('https://');
  });
  
  test('should have HSTS header', async () => {
    const response = await fetch('https://yourdomain.com');
    expect(response.headers.get('strict-transport-security')).toBeTruthy();
  });
});
```

## Troubleshooting

### Common Issues

1. **Mixed Content Warnings**:
   - Ensure all resources use HTTPS
   - Check for hardcoded HTTP URLs
   - Use relative URLs where possible

2. **Certificate Chain Issues**:
   - Verify intermediate certificates are included
   - Test with SSL Labs

3. **Redirect Loops**:
   - Check proxy configuration
   - Verify X-Forwarded-Proto headers

### Environment-Specific Notes

- **Development**: Use `http://localhost:3001` (SSL not required)
- **Staging**: Use valid SSL certificate for testing
- **Production**: Always use valid SSL with proper security headers

## Compliance Notes

For financial applications, SSL configuration must meet:

- **PCI DSS Requirements**: TLS 1.2+ only
- **Banking Regulations**: Strong encryption standards
- **Data Protection**: End-to-end encryption for sensitive data

The configuration provided meets these requirements and industry best practices.