from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from prompt_switcher import PromptSwitcher
from fastapi.middleware.cors import CORSMiddleware
import logging

# Налаштування логування, щоб бачити помилки в терміналі
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ініціалізація поза запитом (щоб не створювати об'єкт щоразу)
try:
    switcher = PromptSwitcher()
    logger.info("PromptSwitcher initialized successfully.")
except Exception as e:
    logger.error(f"Failed to initialize PromptSwitcher: {e}")
    # Ми не зупиняємо сервер, але логуємо проблему

class PromptRequest(BaseModel):
    text: str

@app.post("/optimize")
async def optimize_prompt(request: PromptRequest):
    try:
        if not request.text.strip():
            raise HTTPException(status_code=400, detail="Empty text provided")

        logger.info(f"Processing text: {request.text[:50]}...") # Логуємо перші 50 символів
        
        # Виклик твоєї бібліотеки
        agent = switcher.get_agent(request.text)
        
        # Перевірка на випадок, якщо бібліотека повернула None
        if not agent or not agent.final_prompt:
            logger.warning("Agent returned empty prompt")
            return {"optimized_text": request.text} # Повертаємо оригінал, щоб не стерти дані
            
        return {"optimized_text": agent.final_prompt}

    except Exception as e:
        logger.error(f"Error optimizing prompt: {str(e)}")
        # Повертаємо 500 помилку, яку перехопить JavaScript
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)