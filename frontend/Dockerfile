FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production by default, dev if NODE_ENV=development)
RUN if [ "$NODE_ENV" = "development" ] ; then npm install ; else npm ci --only=production ; fi

# Copy source code
COPY . .

# Build for production (skip in development)
RUN if [ "$NODE_ENV" != "development" ] ; then npm run build ; fi

EXPOSE 3000

# Smart command selection
CMD if [ "$NODE_ENV" = "development" ] ; then npm run dev ; else npm start ; fi