# test_gemini.py

import os
# pyrefly: ignore [missing-import]
from google import genai

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Say hello"
)

print(response.text)