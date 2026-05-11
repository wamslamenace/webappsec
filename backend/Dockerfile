FROM python:3.11-slim-bookworm

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    nmap \
    git \
    perl \
    chromium \
    chromium-driver && \
    git clone https://github.com/sullo/nikto.git /opt/nikto && \
    ln -s /opt/nikto/program/nikto.pl /usr/local/bin/nikto && \
    rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads/reports

# Make entrypoint script executable and fix line endings
RUN apt-get update && apt-get install -y sed && \
    sed -i 's/\r$//' entrypoint.sh && \
    chmod +x entrypoint.sh

# Expose port
EXPOSE 8000

# Use entrypoint script
CMD ["./entrypoint.sh"]