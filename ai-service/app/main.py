from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def root():
    return {
        "message": "FastAPI funcionando correctamente"
    }


@app.get("/health")
def health():
    return {
        "status": "ok"
    }