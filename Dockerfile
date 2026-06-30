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

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy backend files
COPY package*.json ./
COPY tsconfig.json ./
COPY server/ ./server/
COPY config/ ./config/
COPY data/ ./data/

# Install backend dependencies
RUN npm install --production

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/frontend-react/dist ./frontend-react/dist

# Create sessions directory
RUN mkdir -p sessions

# Expose port (Railway will override this)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
