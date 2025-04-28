FROM node:20.18.3 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .

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
# For newer Angular versions (v14+), it's typically 'dist/project-name/browser'
COPY --from=build /app/dist/cliqshop-frontend/browser/ /usr/share/nginx/html/



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
CMD ["nginx", "-g", "daemon off;"]