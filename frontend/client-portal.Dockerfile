# STAGE 1: Build the Client Portal
FROM node:20 AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Tell Angular to ONLY build the client-portal project
RUN npx ng build client-portal

# STAGE 2: Serve the CSR build with NGINX
FROM nginx:alpine

COPY client-portal.nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/client-portal/browser /usr/share/nginx/html

EXPOSE 80
