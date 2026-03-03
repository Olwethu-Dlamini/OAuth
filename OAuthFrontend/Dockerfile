# --------------------------------------------------
# Blazor WASM Production Dockerfile (AWS Optimized)
# --------------------------------------------------

# Use lightweight nginx image
FROM nginx:alpine

# Remove default nginx static files
RUN rm -rf /usr/share/nginx/html/*

# Copy pre-built Blazor publish output
# (must exist locally before docker build)
COPY ./bin/Release/net8.0/publish/wwwroot /usr/share/nginx/html

# Copy custom nginx configuration (for SPA routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]