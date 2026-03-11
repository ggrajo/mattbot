from pydantic import BaseModel


class VoiceResponse(BaseModel):
    voice_id: str
    name: str
    gender: str | None = None
    accent: str | None = None
    preview_url: str | None = None
    locale: str

    model_config = {"from_attributes": True}
