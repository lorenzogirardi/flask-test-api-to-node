# Use a current LTS version of Node.js
FROM node:18-alpine

# Define environment variables for user and group
ENV US=nodeuser
ENV GP=$US-group
ENV UID=10001
ENV GID=10000
ENV APP_DIR=/home/$US/app

# Create group and user
RUN addgroup \
    --gid "$GID" \
    "$GP" \
&&  adduser \
    --disabled-password \
    --ingroup "$GP" \
    -D \
    --uid "$UID" \
    "$US"

# Create app directory
RUN mkdir -p $APP_DIR && chown -R $US:$GP $APP_DIR

# Create and set permissions for log file (if logging to /var/log/app.log)
# This path needs to be accessible by the nodeuser.
# Consider logging to stdout/stderr for Dockerized apps, but matching Python app for now.
RUN mkdir -p /var/log && touch /var/log/app.log && chown $US:$GP /var/log/app.log

# Set working directory
WORKDIR $APP_DIR

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
# Using --production flag if you don't need devDependencies in the final image
RUN npm install

# Copy application code
COPY . .

# Expose the application port (e.g., 3000)
# Ensure this matches the port used in app.js (process.env.PORT || 3000)
EXPOSE 3000

# Set user for running the application
USER $US

# Command to run the application
CMD ["node", "app.js"]
