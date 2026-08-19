"""
EduGuard AI — Backend (FastAPI)
Academic Dropout Prediction & Early Intervention System
SIH 2026 • SDG 4 - Quality Education
"""

import math
import numpy as np
import pandas as pd
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import io

# ============================================================
# APP SETUP
# ============================================================

app = FastAPI(
    title="EduGuard AI API",
    description="AI-powered Academic Dropout Prediction & Early Intervention",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# CONSTANTS
# ============================================================

FEATURE_NAMES = [
    "Attendance",
    "Academic Score",
    "Assignment Rate",
    "Participation",
    "Socio-Economic",
    "Backlogs",
]

REQUIRED_COLUMNS = [
    "Name",
    "Attendance",
    "Academic Score",
    "Assignment Rate",
    "Participation",
    "Socio-Economic",
    "Backlogs",
]


# ============================================================
# PYDANTIC SCHEMAS
# ============================================================


class StudentInput(BaseModel):
    Name: str
    Attendance: float = Field(ge=0, le=100)
    AcademicScore: float = Field(ge=0, le=100, alias="Academic Score")
    AssignmentRate: float = Field(ge=0, le=100, alias="Assignment Rate")
    Participation: float = Field(ge=0, le=10)
    SocioEconomic: float = Field(ge=0, le=1, alias="Socio-Economic")
    Backlogs: int = Field(ge=0)

    class Config:
        populate_by_name = True


class InterventionItem(BaseModel):
    area: str
    action: str


class PredictionResult(BaseModel):
    name: str
    attendance: float
    academic_score: float
    assignment_rate: float
    participation: float
    socio_economic: float
    backlogs: int
    probability: float
    risk: str
    interventions: List[InterventionItem]
    normalized_features: List[float]


class CorrelationItem(BaseModel):
    feature: str
    correlation: float
    absolute_correlation: float


class ModelWeightItem(BaseModel):
    feature: str
    weight: float


# ============================================================
# STUDENT MODEL
# ============================================================


class Student:
    def __init__(
        self,
        name,
        attendance,
        academic_score,
        assignment_rate,
        participation,
        socio_economic,
        backlogs,
        label=None,
    ):
        self.name = name
        self.attendance = float(attendance)
        self.academic_score = float(academic_score)
        self.assignment_rate = float(assignment_rate)
        self.participation = float(participation)
        self.socio_economic = float(socio_economic)
        self.backlogs = int(backlogs)
        self.label = label

    @classmethod
    def from_input(cls, inp: StudentInput):
        return cls(
            inp.Name,
            inp.Attendance,
            inp.AcademicScore,
            inp.AssignmentRate,
            inp.Participation,
            inp.SocioEconomic,
            inp.Backlogs,
        )

    @classmethod
    def from_dict(cls, d: dict, label=None):
        return cls(
            d["Name"],
            d["Attendance"],
            d["Academic Score"],
            d["Assignment Rate"],
            d["Participation"],
            d["Socio-Economic"],
            d["Backlogs"],
            label,
        )

    def normalized_features(self):
        return [
            self.attendance / 100.0,
            self.academic_score / 100.0,
            self.assignment_rate / 100.0,
            self.participation / 10.0,
            self.socio_economic,
            min(self.backlogs / 5.0, 1.0),
        ]


# ============================================================
# PEARSON CORRELATION
# ============================================================


def pearson_correlation(x_values, y_values):
    x = np.asarray(x_values, dtype=float)
    y = np.asarray(y_values, dtype=float)

    if len(x) < 2:
        return 0.0

    denom = np.sqrt(np.sum((x - x.mean()) ** 2) * np.sum((y - y.mean()) ** 2))
    if denom == 0:
        return 0.0

    return float(np.sum((x - x.mean()) * (y - y.mean())) / denom)


# ============================================================
# LOGISTIC REGRESSION
# ============================================================


class DropoutPredictor:
    def __init__(self, num_features, learning_rate=0.5, epochs=5000, l2=0.05):
        self.weights = np.zeros(num_features)
        self.bias = 0.0
        self.learning_rate = learning_rate
        self.epochs = epochs
        self.l2 = l2

    @staticmethod
    def sigmoid(z):
        z = np.clip(z, -500, 500)
        return 1.0 / (1.0 + np.exp(-z))

    def predict_probability(self, features):
        z = self.bias + np.dot(features, self.weights)
        return float(self.sigmoid(z))

    def train(self, X, y):
        X = np.asarray(X, dtype=float)
        y = np.asarray(y, dtype=float)

        if len(X) == 0:
            return

        m = len(X)

        for _ in range(self.epochs):
            predictions = self.sigmoid(self.bias + X @ self.weights)
            error = predictions - y

            grad_w = X.T @ error / m + self.l2 * self.weights
            grad_b = error.mean()

            self.weights -= self.learning_rate * grad_w
            self.bias -= self.learning_rate * grad_b


# ============================================================
# TRAINING DATA & MODEL INITIALIZATION
# ============================================================


def get_training_data():
    rows = [
        ("S1", 95, 85, 90, 8, 0.80, 0, 0),
        ("S2", 88, 78, 80, 7, 0.70, 0, 0),
        ("S3", 60, 45, 40, 3, 0.30, 2, 1),
        ("S4", 50, 30, 25, 2, 0.20, 3, 1),
        ("S5", 92, 88, 95, 9, 0.90, 0, 0),
        ("S6", 65, 55, 50, 4, 0.50, 1, 0),
        ("S7", 40, 25, 20, 1, 0.15, 4, 1),
        ("S8", 78, 60, 65, 5, 0.55, 1, 0),
        ("S9", 55, 35, 30, 2, 0.25, 3, 1),
        ("S10", 85, 70, 75, 6, 0.60, 0, 0),
        ("S11", 45, 20, 15, 1, 0.10, 5, 1),
        ("S12", 70, 65, 60, 5, 0.45, 1, 0),
        ("S13", 90, 15, 88, 8, 0.80, 3, 1),
        ("S14", 92, 20, 85, 7, 0.75, 2, 1),
        ("S15", 88, 18, 90, 9, 0.85, 3, 1),
        ("S16", 5, 90, 5, 0, 0.10, 0, 1),
        ("S17", 10, 85, 10, 1, 0.15, 0, 1),
        ("S18", 75, 55, 70, 6, 0.75, 2, 0),
    ]
    return [Student(*r[:-1], label=r[-1]) for r in rows]


training_data = get_training_data()
X_train = [s.normalized_features() for s in training_data]
y_train = [s.label for s in training_data]

model = DropoutPredictor(num_features=6, learning_rate=0.5, epochs=5000, l2=0.05)
model.train(X_train, y_train)

# In-memory student store
students_store: List[dict] = []


# ============================================================
# RISK CLASSIFICATION
# ============================================================


def classify_risk(probability):
    if probability < 0.30:
        return "LOW"
    elif probability < 0.60:
        return "MEDIUM"
    return "HIGH"


# ============================================================
# INTERVENTION ENGINE
# ============================================================


def recommend_interventions(student: Student) -> List[dict]:
    rules = [
        (
            student.attendance < 75,
            "Attendance",
            "Attendance recovery: parent SMS alerts + mentor check-ins",
        ),
        (
            student.academic_score < 40,
            "Academics",
            "Academic support: remedial classes + peer tutoring",
        ),
        (
            student.assignment_rate < 50,
            "Assignments",
            "Study-skills workshop + assignment deadline reminders",
        ),
        (
            student.participation < 4,
            "Engagement",
            "Engagement program: counseling + extracurricular involvement",
        ),
        (
            student.socio_economic < 0.4,
            "Financial",
            "Financial aid referral: scholarship / fee waiver / meal scheme",
        ),
        (
            student.backlogs >= 2,
            "Backlogs",
            "Backlog clearance camp + academic counseling",
        ),
    ]

    actions = [
        {"area": area, "action": action}
        for condition, area, action in rules
        if condition
    ]

    if not actions:
        actions.append(
            {
                "area": "Monitoring",
                "action": "No urgent intervention needed — continue routine monitoring",
            }
        )

    return actions


# ============================================================
# HELPER — predict a student
# ============================================================


def predict_student(student: Student) -> PredictionResult:
    nf = student.normalized_features()
    probability = model.predict_probability(nf)
    risk = classify_risk(probability)
    interventions = recommend_interventions(student)

    return PredictionResult(
        name=student.name,
        attendance=student.attendance,
        academic_score=student.academic_score,
        assignment_rate=student.assignment_rate,
        participation=student.participation,
        socio_economic=student.socio_economic,
        backlogs=student.backlogs,
        probability=round(probability, 6),
        risk=risk,
        interventions=[InterventionItem(**i) for i in interventions],
        normalized_features=[round(v, 4) for v in nf],
    )


def upsert_student(record: dict):
    for i, existing in enumerate(students_store):
        if existing["Name"] == record["Name"]:
            students_store[i] = record
            return
    students_store.append(record)


# ============================================================
# API ROUTES
# ============================================================


@app.get("/")
def root():
    return {"message": "EduGuard AI API is running 🎓"}


# ---- Single student prediction ----
@app.post("/api/predict", response_model=PredictionResult)
def api_predict(inp: StudentInput):
    student = Student.from_input(inp)
    result = predict_student(student)

    upsert_student(
        {
            "Name": student.name,
            "Attendance": student.attendance,
            "Academic Score": student.academic_score,
            "Assignment Rate": student.assignment_rate,
            "Participation": student.participation,
            "Socio-Economic": student.socio_economic,
            "Backlogs": student.backlogs,
        }
    )

    return result


# ---- List all stored students with predictions ----
@app.get("/api/students", response_model=List[PredictionResult])
def api_all_students():
    results = []
    for record in students_store:
        student = Student.from_dict(record)
        results.append(predict_student(student))
    return results


# ---- Clear all stored students ----
@app.delete("/api/students")
def api_clear_students():
    students_store.clear()
    return {"message": "All student records cleared successfully."}


# ---- Feature correlations ----
@app.get("/api/correlations", response_model=List[CorrelationItem])
def api_correlations():
    X = [s.normalized_features() for s in training_data]
    y = [s.label for s in training_data]

    items = []
    for j, feature in enumerate(FEATURE_NAMES):
        column = [row[j] for row in X]
        r = pearson_correlation(column, y)
        items.append(
            CorrelationItem(
                feature=feature, correlation=round(r, 4), absolute_correlation=round(abs(r), 4)
            )
        )

    items.sort(key=lambda c: c.absolute_correlation, reverse=True)
    return items


# ---- Model weights ----
@app.get("/api/weights", response_model=List[ModelWeightItem])
def api_weights():
    return [
        ModelWeightItem(feature=FEATURE_NAMES[i], weight=round(float(model.weights[i]), 4))
        for i in range(len(FEATURE_NAMES))
    ]


# ---- CSV upload batch prediction ----
@app.post("/api/upload", response_model=List[PredictionResult])
async def api_upload(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    content = await file.read()
    try:
        df = pd.read_csv(io.StringIO(content.decode("utf-8")))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading CSV: {e}")

    missing = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing:
        raise HTTPException(
            status_code=400, detail=f"Missing columns: {', '.join(missing)}"
        )

    results = []
    errors = []

    for idx, row in df.iterrows():
        try:
            student = Student.from_dict(row)
            result = predict_student(student)

            upsert_student(
                {
                    "Name": student.name,
                    "Attendance": student.attendance,
                    "Academic Score": student.academic_score,
                    "Assignment Rate": student.assignment_rate,
                    "Participation": student.participation,
                    "Socio-Economic": student.socio_economic,
                    "Backlogs": student.backlogs,
                }
            )

            results.append(result)
        except (ValueError, TypeError) as e:
            errors.append(f"Row {idx + 1}: {e}")

    if not results:
        raise HTTPException(status_code=400, detail="No valid rows could be processed.")

    return results


# ---- Delete all students ----
@app.delete("/api/students")
def api_clear_students():
    students_store.clear()
    return {"message": "All students cleared."}


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
