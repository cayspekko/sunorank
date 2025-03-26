FROM node:18-alpine

# Install dependencies
RUN npm install -g firebase-tools

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY . /app

RUN npm install

CMD ["sleep", "infinity"]