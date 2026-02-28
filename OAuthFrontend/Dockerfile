# Stage 1: Build & publish Blazor WASM
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

WORKDIR /src

# Copy csproj and restore (caching layer)
COPY *.csproj ./
RUN dotnet restore

# Copy everything else and publish static files
COPY . ./
RUN dotnet publish -c Release -o /app/publish --no-restore

# Stage 2: Serve static files with nginx
FROM nginx:alpine AS final

# Copy published wwwroot to nginx html folder
COPY --from=build /app/publish/wwwroot /usr/share/nginx/html

# Optional: custom nginx.conf if you need rewrites for SPA routing
# (important for Blazor WASM client-side routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Run nginx
CMD ["nginx", "-g", "daemon off;"]