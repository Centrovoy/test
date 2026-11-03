FROM python:3.12-slim
WORKDIR /app
COPY . /app
ENV PORT=8080 DATA_DIR=/data PYTHONUNBUFFERED=1
VOLUME ["/data"]
EXPOSE 8080
CMD ["python", "server.py"]
