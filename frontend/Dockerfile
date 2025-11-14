FROM node:18-alpine

WORKDIR /app

# Copia package files
COPY package*.json ./

# Installa dipendenze
RUN npm install

# Copia applicazione
COPY . .

# Esponi porta
EXPOSE 5173

# Comando default
CMD ["npm", "run", "dev", "--", "--host"]
