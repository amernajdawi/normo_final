# Use Node.js 18 Alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json only (not package-lock.json to avoid lock file issues)
COPY package.json ./

# Install dependencies with fresh lock file
RUN npm install

# Copy source code
COPY public/ ./public/
COPY src/ ./src/
COPY tsconfig.json ./

# Build the application
RUN npm run build

# Use nginx to serve the built application
FROM nginx:alpine

# Copy built files from previous stage
COPY --from=0 /app/build /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
