FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_OIDC_AUTHORITY=http://localhost:8180/realms/ehe
ARG VITE_OIDC_CLIENT_ID=ehe-client-portal
ARG VITE_OIDC_REDIRECT_URI=http://localhost:5175/auth/callback
ARG VITE_OIDC_LOGOUT_URI=http://localhost:5175/
ARG VITE_CLIENT_PORTAL_URL=http://localhost:5175
ENV VITE_OIDC_AUTHORITY=$VITE_OIDC_AUTHORITY VITE_OIDC_CLIENT_ID=$VITE_OIDC_CLIENT_ID VITE_OIDC_REDIRECT_URI=$VITE_OIDC_REDIRECT_URI VITE_OIDC_LOGOUT_URI=$VITE_OIDC_LOGOUT_URI VITE_CLIENT_PORTAL_URL=$VITE_CLIENT_PORTAL_URL
RUN npm run build
FROM nginx:1.28-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
