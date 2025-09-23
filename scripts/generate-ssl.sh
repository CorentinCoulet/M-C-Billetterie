#!/bin/bash

# SSL Certificate Generation Script
# For development and testing purposes only
# Use Let's Encrypt or proper CA certificates in production

set -e

echo "🔒 Generating SSL certificates for Billetterie..."

# Create SSL directory
mkdir -p docker/ssl

# Generate private key
openssl genpkey -algorithm RSA -out docker/ssl/server.key -pkcs8 -aes256

# Generate certificate signing request
openssl req -new -key docker/ssl/server.key -out docker/ssl/server.csr \
    -config <(cat <<EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = FR
ST = France
L = Paris
O = M&C Society
OU = IT Department
CN = localhost
emailAddress = admin@mcsociety.com

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
DNS.3 = billetterie.local
IP.1 = 127.0.0.1
IP.2 = ::1
EOF
)

# Generate self-signed certificate
openssl x509 -req -in docker/ssl/server.csr \
    -signkey docker/ssl/server.key \
    -out docker/ssl/server.crt \
    -days 365 \
    -extensions v3_req \
    -extfile <(cat <<EOF
[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
DNS.3 = billetterie.local
IP.1 = 127.0.0.1
IP.2 = ::1
EOF
)

# Set proper permissions
chmod 600 docker/ssl/server.key
chmod 644 docker/ssl/server.crt

# Generate DH parameters for perfect forward secrecy
openssl dhparam -out docker/ssl/dhparam.pem 2048

echo "✅ SSL certificates generated successfully!"
echo "📁 Files created:"
echo "   - docker/ssl/server.key (private key)"
echo "   - docker/ssl/server.crt (certificate)"
echo "   - docker/ssl/dhparam.pem (DH parameters)"
echo ""
echo "⚠️  NOTE: These are self-signed certificates for development only"
echo "   For production, use proper CA-signed certificates or Let's Encrypt"
