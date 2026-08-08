# Use official slim Node LTS base image
FROM node:20-slim

# Install openssl for Prisma engine dependencies
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Copy dependency packages definitions
COPY package*.json ./
COPY prisma ./prisma/

# Install packages
RUN npm ci

# Generate Prisma Client
RUN npm run prisma:generate

# Copy application source files
COPY . .

# Expose API listen port
EXPOSE 5000

# Set environment
ENV NODE_ENV=production

# Boot server
CMD [ "npm", "run", "start" ]
