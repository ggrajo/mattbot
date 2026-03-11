import uuid

from pydantic import BaseModel


class PromptSuggestionResponse(BaseModel):
    id: uuid.UUID
    category: str
    title: str
    prompt_text: str

    model_config = {"from_attributes": True}
