# Vue.js 3 with Shoelace UI Application

A basic Hello World type Vue.js application using Vue.js 3, Vite, and Shoelace for the frontend library. This application includes navigation between different pages.

## Features

- Vue.js 3 with Composition API
- Vite for fast development
- Shoelace UI components
- Vue Router for navigation between pages
- Multiple page views (Home, About, Contact)

## Project Structure

```
├── src/
│   ├── components/     # UI components
│   ├── views/          # Page components
│   │   ├── Home.vue    # Home page
│   │   ├── About.vue   # About page
│   │   └── Contact.vue # Contact page
│   ├── router/         # Vue Router configuration
│   ├── App.vue         # Root component
│   └── main.js         # Application entry point
├── index.html          # HTML entry point
├── package.json        # Project dependencies
├── vite.config.js      # Vite configuration
└── README.md           # This file
```

## Docker Setup (Development Mode)

This project includes a Dockerfile configured to run Vite in development mode:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy project files
COPY . .

# Update vite config to allow external connections
RUN sed -i 's/plugins: \[vue()\],/plugins: \[vue()\],\n  server: {\n    host: "0.0.0.0"\n  },/' vite.config.js

# Expose Vite dev server port
EXPOSE 5173

# Start development server
CMD ["npm", "run", "dev"]
```

To build and run the Docker container in development mode:

```bash
# Build the Docker image
docker build -t vue-shoelace-dev .

# Run the container
docker run -p 5173:5173 vue-shoelace-dev
```

Access the application at http://localhost:5173

The development server will provide hot-reloading and other development features.