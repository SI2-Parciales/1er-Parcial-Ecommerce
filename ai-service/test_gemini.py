import os
import time

from dotenv import load_dotenv
from google import genai
from google.genai.errors import ServerError


load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise RuntimeError("GEMINI_API_KEY no está configurada")

client = genai.Client(api_key=api_key)

for intento in range(3):
    try:
        response = client.models.generate_content(
            model=os.getenv("GEMINI_MODEL"),
            contents="Responde solamente: conexión exitosa",
        )

        print(response.text)
        break

    except ServerError as error:
        if intento == 2:
            raise

        print("Gemini está ocupado. Reintentando...")
        time.sleep(3)