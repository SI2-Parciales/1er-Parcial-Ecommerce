# Etapa 1: Build de la aplicación con Node.js 20 Alpine
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de definición de paquetes
COPY package*.json ./

# Instalación limpia y reproducible de dependencias
RUN npm ci

# Copiar el código fuente
COPY . .

# Validar tipado y compilar bundle para producción
RUN npm run build

# Etapa 2: Servidor web ultraligero con Nginx Alpine
FROM nginx:alpine

# Copiar los artefactos estáticos generados
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración personalizada de Nginx para SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer el puerto estándar HTTP
EXPOSE 80

# Iniciar Nginx en primer plano
CMD ["nginx", "-g", "daemon off;"]
