
import os
from openai import OpenAI

client = OpenAI(
    base_url=os.environ["RUNPOD_BASE_URL"],
    api_key=os.environ["RUNPOD_API_KEY"],
    timeout=120.0
)

try:
    response = client.chat.completions.create(
        model=os.environ["RUNPOD_MODEL_NAME"],
        messages=[
            {
                "role": "system",
                "content": "You are an AI career advisor."
            },
            {
                "role": "user",
                "content": """
                I have Python, Java, HTML, CSS
                and MySQL skills.

                Recommend three suitable careers
                and identify skills I should learn.
                """
            }
        ],
        max_tokens=500
    )

    print("RUNPOD CONNECTION SUCCESSFUL!")
    print(response.choices[0].message.content)

except Exception as error:
    print("RUNPOD CONNECTION FAILED")
    print(type(error).__name__)
    print(str(error))
