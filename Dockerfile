FROM node:22-alpine

RUN apk add --no-cache openjdk11

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy project files
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Start development server with host option to make it accessible outside the container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
