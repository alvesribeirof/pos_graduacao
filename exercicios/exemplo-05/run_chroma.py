import chromadb
from chromadb.config import Settings

client = chromadb.PersistentClient(path="./chroma_data", settings=Settings(allow_reset=True))

import uvicorn
from chromadb.server.fastapi import FastAPI

print("Starting ChromaDB Server with CORS Allowed...")
server = FastAPI(settings=Settings(chroma_server_cors_allow_origins=["*"]))
uvicorn.run(server.app(), host="127.0.0.1", port=8000)
