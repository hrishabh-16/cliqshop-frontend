FROM node:20.18.3 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .

# Create a script to inject environment variables
RUN echo 'const fs = require("fs");' > /app/configure-env.js && \
    echo 'const envFile = "src/environments/environment.prod.ts";' >> /app/configure-env.js && \
    echo '' >> /app/configure-env.js && \
    echo '// Check if environment file exists, create it if needed' >> /app/configure-env.js && \
    echo 'if (!fs.existsSync(envFile)) {' >> /app/configure-env.js && \
    echo '  console.log("Creating environment.prod.ts file");' >> /app/configure-env.js && \
    echo '  const envDir = "src/environments";' >> /app/configure-env.js && \
    echo '  if (!fs.existsSync(envDir)) {' >> /app/configure-env.js && \
    echo '    fs.mkdirSync(envDir, { recursive: true });' >> /app/configure-env.js && \
    echo '  }' >> /app/configure-env.js && \
    echo '  ' >> /app/configure-env.js && \
    echo '  const defaultContent = `export const environment = {' >> /app/configure-env.js && \
    echo '  production: true,' >> /app/configure-env.js && \
    echo '  apiUrl: "http://localhost:9000/api",' >> /app/configure-env.js && \
    echo '  stripePublishableKey: "pk_test_placeholder"' >> /app/configure-env.js && \
    echo '};`;' >> /app/configure-env.js && \
    echo '  ' >> /app/configure-env.js && \
    echo '  fs.writeFileSync(envFile, defaultContent);' >> /app/configure-env.js && \
    echo '}' >> /app/configure-env.js && \
    echo '' >> /app/configure-env.js && \
    echo '// Update Stripe publishable key if provided' >> /app/configure-env.js && \
    echo 'const stripeKey = process.env.STRIPE_PUBLISHABLE_KEY;' >> /app/configure-env.js && \
    echo 'if (stripeKey) {' >> /app/configure-env.js && \
    echo '  console.log("Updating Stripe publishable key in environment file");' >> /app/configure-env.js && \
    echo '  let content = fs.readFileSync(envFile, "utf8");' >> /app/configure-env.js && \
    echo '  content = content.replace(/stripePublishableKey: "[^"]*"/, `stripePublishableKey: "${stripeKey}"`);' >> /app/configure-env.js && \
    echo '  fs.writeFileSync(envFile, content);' >> /app/configure-env.js && \
    echo '}' >> /app/configure-env.js

# Run the environment configuration script if STRIPE_PUBLISHABLE_KEY is provided
RUN if [ ! -z "$STRIPE_PUBLISHABLE_KEY" ]; then \
      node /app/configure-env.js; \
    fi

# Create a custom Angular JSON file with higher budgets
RUN node -e "const fs = require('fs'); \
    const config = JSON.parse(fs.readFileSync('./angular.json', 'utf8')); \
    const projectName = Object.keys(config.projects)[0]; \
    config.projects[projectName].architect.build.configurations.production.budgets = [ \
      { type: 'initial', maximumWarning: '3mb', maximumError: '5mb' }, \
      { type: 'anyComponentStyle', maximumWarning: '50kb', maximumError: '100kb' } \
    ]; \
    fs.writeFileSync('./angular.json', JSON.stringify(config, null, 2));"

RUN npm run build --prod

FROM nginx:alpine

# Copy the build output directory
COPY --from=build /app/dist/cliqshop-frontend/browser/ /usr/share/nginx/html/

# Create a script to update the Stripe key at runtime properly
RUN echo '#!/bin/sh' > /docker-entrypoint.sh && \
    echo '# Replace Stripe publishable key in built files if provided' >> /docker-entrypoint.sh && \
    echo 'if [ ! -z "$STRIPE_PUBLISHABLE_KEY" ]; then' >> /docker-entrypoint.sh && \
    echo '  echo "Updating Stripe publishable key in built files"' >> /docker-entrypoint.sh && \
    echo '  find /usr/share/nginx/html -name "*.js" -type f -exec sed -i "s/pk_test_placeholder/$STRIPE_PUBLISHABLE_KEY/g" {} \;' >> /docker-entrypoint.sh && \
    echo 'fi' >> /docker-entrypoint.sh && \
    echo '# Start nginx' >> /docker-entrypoint.sh && \
    echo 'nginx -g "daemon off;"' >> /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

# Create custom nginx configuration
RUN echo 'server { \
    listen 4200; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /api { \
        proxy_pass http://backend:9000; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 4200
ENTRYPOINT ["/docker-entrypoint.sh"]