#!/bin/sh
# Запуск без Docker (нужен Python 3.8+): ./start.sh, затем открыть http://localhost:8080
cd "$(dirname "$0")" && exec python3 server.py "$@"
