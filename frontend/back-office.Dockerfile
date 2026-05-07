# STAGE 1: Build the Back Office
FROM node:20 AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Tell Angular to ONLY build the back-office project
RUN npx ng build back-office

# STAGE 2: Serve with NGINX
# Because the back-office doesn't use SSR, it's just static HTML/JS/CSS files.
# The best way to serve static files in Docker is using NGINX!
FROM nginx:alpine

# We grab the compiled HTML/JS files from Stage 1 and put them in Nginx's public folder
COPY --from=builder /app/dist/back-office/browser /usr/share/nginx/html

# Nginx listens on port 80 by default
EXPOSE 80
