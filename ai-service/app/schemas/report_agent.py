from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.report_query import ReportQuery, ReportQueryResponse


class ReportAskRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    query: str = Field(min_length=1, max_length=2000)

    @field_validator("query", mode="before")
    @classmethod
    def trim_query(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class ReportExecution(BaseModel):
    report_query: ReportQuery = Field(alias="reportQuery")
    result: ReportQueryResponse

    model_config = ConfigDict(populate_by_name=True)


class ReportAskResponse(BaseModel):
    query: str
    answer: str
    data: list[ReportExecution]


class ReportVoiceResponse(BaseModel):
    transcription: str
    answer: str
    data: list[ReportExecution]


def serialize_report_query(query: ReportQuery) -> dict[str, Any]:
    return query.model_dump(mode="json", by_alias=True, exclude_none=True)
