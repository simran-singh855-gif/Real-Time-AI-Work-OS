# 1. Grab a tiny, pre-configured Linux computer that already has Node.js installed
FROM node:18-alpine

# 2. Create a folder inside that computer for our app
WORKDIR /app

# 3. Copy our package lists first (this is a caching trick to make builds 10x faster)
COPY package.json package-lock.json ./

# 4. Tell the computer to install our packages
RUN npm install --production

# 5. Copy the rest of our backend code into the container
COPY . .

# 6. Expose the port so the outside world can talk to our server
EXPOSE 5000

# 7. The command to start the server when the container turns on
CMD ["node", "app.js"]