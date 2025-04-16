# Use the official Node.js 18 lightweight image.
FROM node:18-alpine

# Set the working directory inside the container.
WORKDIR /app

# Copy package.json and package-lock.json (if exists) to install dependencies.
COPY package*.json ./

# Install only production dependencies (or remove --production if you need dev dependencies).
RUN npm install --production

# Copy the rest of your source code to the container.
COPY . .

# Expose port 3000 so that it's accessible from the host.
EXPOSE 3000

# Start the application.
CMD [ "node", "index.js" ]
