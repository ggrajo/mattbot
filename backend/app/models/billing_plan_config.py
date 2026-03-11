from decimal import Decimal
from dataclasses import dataclass


@dataclass(frozen=True)
class PlanDefinition:
    name: str
    price: Decimal
    minutes_included: int


PLANS: dict[str, PlanDefinition] = {
    "free": PlanDefinition(name="Free", price=Decimal("0.00"), minutes_included=15),
    "standard": PlanDefinition(name="Standard", price=Decimal("9.99"), minutes_included=120),
    "pro": PlanDefinition(name="Pro", price=Decimal("24.99"), minutes_included=500),
}


def get_plan(plan_name: str) -> PlanDefinition:
    plan = PLANS.get(plan_name)
    if plan is None:
        raise ValueError(f"Unknown plan: {plan_name}")
    return plan


def get_minutes_for_plan(plan_name: str) -> int:
    return get_plan(plan_name).minutes_included
