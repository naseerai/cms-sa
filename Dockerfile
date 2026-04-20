# 1. Use Node base image
FROM node:20-alpine AS builder

# 2. Set working directory
WORKDIR /app

# 3. Copy package files
COPY package.json package-lock.json* ./

# 4. Install dependencies
RUN npm install

# 5. Copy rest of the code
COPY . .

# 6. Build Next.js app
RUN npm run build

# ----------------------------

# 7. Production image
FROM node:20-alpine

WORKDIR /app

# Copy only necessary files
COPY --from=builder /app ./

# Expose port
EXPOSE 3000

# Start app
CMD ["npm", "start"]