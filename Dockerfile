# Use node image to build the app
FROM node:18-alpine AS build

WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

# Use nginx to serve the build
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Optional: Copy custom nginx config if you have one
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]