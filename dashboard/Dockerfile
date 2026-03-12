# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Build the app structure
COPY . .
# When building for docker compose, we inject Vite env variables at build time
ARG VITE_API_URL
ARG VITE_WS_URL
ARG VITE_WIDGET_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_WIDGET_URL=$VITE_WIDGET_URL

RUN npm run build

# Serve stage
FROM nginx:alpine

# Copy built assets to Nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Replace default Nginx config to support SPA routing (fallback to index.html)
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
