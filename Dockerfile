# Build stage for frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy frontend files
COPY frontend-react/package*.json ./frontend-react/
COPY frontend-react/ ./frontend-react/

# Install dependencies and build frontend
WORKDIR /app/frontend-react
RUN npm install
RUN npm run build

# Build stage for backend
FROM node:20-alpine AS backend-builder

WORKDIR /app

# Copy backend files
COPY package*.json ./
COPY tsconfig.json ./
COPY server/ ./server/

# Install ALL dependencies (including dev)
RUN npm install

# Compile TypeScript
RUN npx tsc

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy backend files
COPY package*.json ./
COPY config/ ./config/
COPY data/ ./data/

# Install only production dependencies
RUN npm install --production

# Copy compiled backend from builder stage
COPY --from=backend-builder /app/dist ./dist

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/frontend-react/dist ./frontend-react/dist

# Create sessions directory
RUN mkdir -p sessions

# Expose port
EXPOSE 3000

# Start compiled JavaScript
CMD ["node", "dist/server/index.js"]
