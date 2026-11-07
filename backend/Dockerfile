FROM node:22-alpine

# Carpeta de trabajo dentro del contenedor
WORKDIR /app

# Copiamos los archivos de dependencias primero
COPY package*.json ./

# Instalamos las librerías
RUN npm install

# Copiamos todo el resto del código asignándole la propiedad al usuario 'node'
COPY --chown=node:node . .

# Cambiamos al usuario sin privilegios 'node' para mayor seguridad
USER node

# Exponemos el puerto de la API
EXPOSE 3000

# Comando para iniciar en modo desarrollo
CMD ["npm", "run", "dev"]