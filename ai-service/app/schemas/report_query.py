from datetime import date
from enum import StrEnum
import re
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)


class ReportMetric(StrEnum):
    REVENUE = "revenue"
    SALES_COUNT = "sales_count"
    UNITS_SOLD = "units_sold"
    AVAILABLE_STOCK = "available_stock"
    RESERVED_STOCK = "reserved_stock"


class ReportGroupBy(StrEnum):
    BRANCH = "branch"
    PRODUCT = "product"
    CATEGORY = "category"
    DAY = "day"
    MONTH = "month"


class ReportSelectField(StrEnum):
    DATE = "date"
    BRANCH = "branch"
    PRODUCT = "product"
    CATEGORY = "category"
    REVENUE = "revenue"
    SALES_COUNT = "sales_count"
    UNITS_SOLD = "units_sold"
    AVAILABLE_STOCK = "available_stock"
    RESERVED_STOCK = "reserved_stock"


class ReportQueryFilters(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    branch_id: int | None = Field(default=None, alias="branchId", ge=1)
    product_id: int | None = Field(default=None, alias="productId", ge=1)
    category_id: int | None = Field(default=None, alias="categoryId", ge=1)


class ReportQuery(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    metrics: list[ReportMetric] = Field(min_length=1)
    group_by: list[ReportGroupBy] | None = Field(default=None, alias="groupBy")
    select: list[ReportSelectField] | None = None
    date_from: date | None = Field(default=None, alias="dateFrom")
    date_to: date | None = Field(default=None, alias="dateTo")
    filters: ReportQueryFilters | None = None
    order: Literal["asc", "desc"] = "desc"
    limit: int = Field(default=20, ge=1, le=100)

    @field_validator("date_from", "date_to", mode="before")
    @classmethod
    def dates_must_use_iso_day_format(cls, value: object) -> object:
        if value is None:
            return value
        if not isinstance(value, str) or re.fullmatch(r"\d{4}-\d{2}-\d{2}", value) is None:
            raise ValueError("Las fechas deben usar el formato YYYY-MM-DD.")
        return value

    @field_validator("metrics")
    @classmethod
    def metrics_must_be_unique(cls, value: list[ReportMetric]) -> list[ReportMetric]:
        if len(value) != len(set(value)):
            raise ValueError("metrics no puede contener valores duplicados.")
        return value

    @field_validator("group_by")
    @classmethod
    def group_by_must_be_nonempty_and_unique(
        cls, value: list[ReportGroupBy] | None
    ) -> list[ReportGroupBy] | None:
        if value is not None and (not value or len(value) != len(set(value))):
            raise ValueError("groupBy debe ser no vacío y no contener duplicados.")
        return value

    @field_validator("select")
    @classmethod
    def select_must_be_nonempty_and_unique(
        cls, value: list[ReportSelectField] | None
    ) -> list[ReportSelectField] | None:
        if value is not None and (not value or len(value) != len(set(value))):
            raise ValueError("select debe ser no vacío y no contener duplicados.")
        return value

    @model_validator(mode="after")
    def date_range_must_be_ordered(self) -> "ReportQuery":
        if self.date_from and self.date_to and self.date_from > self.date_to:
            raise ValueError("dateFrom debe ser menor o igual que dateTo.")
        return self


class ReportQueryPeriod(BaseModel):
    from_date: date | None = Field(alias="from")
    to_date: date | None = Field(alias="to")
    time_zone: str = Field(alias="timeZone")

    model_config = ConfigDict(populate_by_name=True)


class ReportQueryResponse(BaseModel):
    metrics: list[ReportMetric]
    group_by: list[ReportGroupBy] = Field(alias="groupBy")
    period: ReportQueryPeriod
    data: list[dict[str, int | float | str]]

    model_config = ConfigDict(populate_by_name=True)
