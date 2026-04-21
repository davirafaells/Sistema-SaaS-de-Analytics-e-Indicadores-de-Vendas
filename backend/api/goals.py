import calendar
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from pydantic import BaseModel
from core.database import get_db
from core.dependencies import get_current_company_id
from domain.models import CompanyGoal, Sale, Product

router = APIRouter(prefix="/goals", tags=["Metas Mensais"])


class GoalSet(BaseModel):
    goal_value: float


@router.get("/current")
def get_current_goal(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_current_company_id),
):
    today = date.today()
    month_start = today.replace(day=1)
    last_day = calendar.monthrange(today.year, today.month)[1]
    days_left = last_day - today.day

    goal = db.query(CompanyGoal).filter(
        CompanyGoal.company_id == company_id,
        CompanyGoal.month == today.month,
        CompanyGoal.year == today.year,
    ).first()

    # Receita acumulada do mês corrente até hoje
    current_rev = db.query(func.sum(Sale.total_value))\
        .join(Product, Sale.product_id == Product.id)\
        .filter(
            Sale.company_id == company_id,
            Sale.is_deleted == False,
            Product.is_active == True,
            Sale.date >= month_start,
            Sale.date <= today,
        ).scalar() or 0
    current_rev = round(float(current_rev), 2)

    if not goal:
        return {
            "has_goal":       False,
            "month":          today.month,
            "year":           today.year,
            "current_revenue": current_rev,
            "days_left":      days_left,
        }

    goal_value    = float(goal.goal_value)
    remaining     = round(max(0.0, goal_value - current_rev), 2)
    pct_achieved  = round(current_rev / goal_value * 100, 1) if goal_value > 0 else 0.0
    required_daily = round(remaining / days_left, 2) if days_left > 0 else 0.0

    return {
        "has_goal":        True,
        "goal_value":      goal_value,
        "month":           today.month,
        "year":            today.year,
        "current_revenue": current_rev,
        "pct_achieved":    pct_achieved,
        "remaining":       remaining,
        "days_left":       days_left,
        "required_daily":  required_daily,
    }


@router.post("/")
def set_goal(
    data: GoalSet,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_current_company_id),
):
    today = date.today()

    goal = db.query(CompanyGoal).filter(
        CompanyGoal.company_id == company_id,
        CompanyGoal.month == today.month,
        CompanyGoal.year == today.year,
    ).first()

    if goal:
        goal.goal_value = data.goal_value
    else:
        goal = CompanyGoal(
            company_id=company_id,
            month=today.month,
            year=today.year,
            goal_value=data.goal_value,
        )
        db.add(goal)

    db.commit()
    return {"message": "Meta definida com sucesso!"}