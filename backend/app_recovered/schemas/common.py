from pydantic import BaseModel


class ErrorDetail(BaseModel):
    field: str | None = None
    message: str


class ErrorResponse(BaseModel):
    code: str
    message: str
    request_id: str = ""
    details: list[ErrorDetail] = []


class MessageResponse(BaseModel):
    message: str
