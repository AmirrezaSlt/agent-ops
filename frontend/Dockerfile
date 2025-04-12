FROM node:20-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install
RUN npm install @vitejs/plugin-react react react-dom react-router-dom @mui/material @mui/icons-material @emotion/react @emotion/styled zustand axios react-markdown remark-gfm

# Copy project files
COPY . .

# Expose port
EXPOSE 5173

# Start development server
CMD ["npm", "run", "dev"] 