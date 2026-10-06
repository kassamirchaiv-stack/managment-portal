import pytest
from fastapi.testclient import TestClient
from passlib.context import CryptContext
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.auth_utils import hash_password
from backend.app.database import Base, get_db
from backend.app import main as main_module
from backend.app.main import app
from backend.app.models import (
    Course,
    CourseEnrollment,
    DisciplineReview,
    DisciplineStatus,
    ReportCard,
    ReportCardStatus,
    StudentProfile,
    User,
    UserRole,
)
from backend.app.seed_data import seed_data


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(
        "backend.app.auth_utils.PASSWORD_CONTEXT",
        CryptContext(schemes=["bcrypt"], bcrypt__rounds=4),
    )
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr("backend.app.main.engine", engine)

    db = testing_session()
    users = {}
    for key, role in (
        ("principal", UserRole.ADMIN_PRINCIPAL),
        ("teacher1", UserRole.TEACHER),
        ("teacher2", UserRole.TEACHER),
        ("parent1", UserRole.PARENT),
        ("parent2", UserRole.PARENT),
        ("student1", UserRole.STUDENT),
        ("student2", UserRole.STUDENT),
    ):
        users[key] = User(
            username=key,
            password_hash=hash_password("safe-test-password"),
            full_name=key.title(),
            email=f"{key}@school.example",
            role=role,
        )
    db.add_all(users.values())
    db.flush()

    student1 = StudentProfile(
        user_id=users["student1"].id,
        parent_id=users["parent1"].id,
        grade_level="10th Grade",
    )
    student2 = StudentProfile(
        user_id=users["student2"].id,
        parent_id=users["parent2"].id,
        grade_level="11th Grade",
    )
    db.add_all([student1, student2])
    db.flush()
    mathematics = Course(
        name="Algebra",
        subject="Mathematics",
        grade_level="10th Grade",
        teacher_id=users["teacher1"].id,
    )
    biology = Course(
        name="Biology",
        subject="Biology",
        grade_level="11th Grade",
        teacher_id=users["teacher1"].id,
    )
    english = Course(
        name="English",
        subject="English",
        grade_level="11th Grade",
        teacher_id=users["teacher2"].id,
    )
    db.add_all([mathematics, biology, english])
    db.flush()
    db.add_all(
        [
            CourseEnrollment(student_id=student1.id, course_id=mathematics.id),
            CourseEnrollment(student_id=student2.id, course_id=biology.id),
            CourseEnrollment(student_id=student2.id, course_id=english.id),
            ReportCard(
                student_id=student1.id,
                term="Fall 2026",
                subject="Mathematics",
                grade="A",
                status=ReportCardStatus.ADMIN_APPROVED,
            ),
            ReportCard(
                student_id=student1.id,
                term="Fall 2026",
                subject="Art",
                grade="B",
                status=ReportCardStatus.TEACHER_SUBMITTED,
            ),
            ReportCard(
                student_id=student1.id,
                term="Fall 2026",
                subject="Music",
                grade="C",
                status=ReportCardStatus.DRAFT,
            ),
            ReportCard(
                student_id=student1.id,
                term="Fall 2026",
                subject="History",
                grade="B",
                status=ReportCardStatus.TEACHER_SUBMITTED,
            ),
            DisciplineReview(
                student_id=student1.id,
                logged_by_teacher_id=users["teacher1"].id,
                category="Published",
                description="Visible record",
                status=DisciplineStatus.APPROVED_PUBLISHED,
            ),
            DisciplineReview(
                student_id=student1.id,
                logged_by_teacher_id=users["teacher1"].id,
                category="Pending",
                description="Not visible yet",
                status=DisciplineStatus.PENDING_ADMIN_REVIEW,
            ),
            DisciplineReview(
                student_id=student1.id,
                logged_by_teacher_id=users["teacher1"].id,
                category="Draft",
                description="Still a draft",
                status=DisciplineStatus.DRAFT,
            ),
        ]
    )
    db.commit()
    db.close()

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def login(client, username):
    response = client.post(
        "/token",
        json={"username": username, "password": "safe-test-password"},
    )
    assert response.status_code == 200, response.text
    client.headers["X-CSRF-Token"] = response.json()["csrf_token"]
    return response


def test_login_uses_http_only_cookie_and_password_hash(client):
    response = login(client, "parent1")
    assert "school_access_token" in response.cookies
    assert "httponly" in response.headers["set-cookie"].lower()
    assert "access_token" not in response.json()

    account = client.get("/api/auth/me")
    assert account.status_code == 200
    assert account.json()["role"] == "PARENT"


def test_parent_only_sees_linked_child_and_approved_records(client):
    login(client, "parent1")

    children = client.get("/api/parent/children")
    assert [child["full_name"] for child in children.json()] == ["Student1"]

    own_records = client.get("/api/parent/child/1")
    assert own_records.status_code == 200
    assert [card["subject"] for card in own_records.json()["report_cards"]] == ["Mathematics"]
    assert [item["category"] for item in own_records.json()["discipline_reviews"]] == ["Published"]
    assert [course["subject"] for course in client.get("/api/parent/child/1/courses").json()] == [
        "Mathematics"
    ]
    assert client.get("/api/parent/child/2").status_code == 403


def test_student_only_sees_approved_records_for_self(client):
    login(client, "student1")
    profile = client.get("/api/student/me")
    assert profile.status_code == 200
    assert [card["subject"] for card in profile.json()["report_cards"]] == ["Mathematics"]
    assert [item["category"] for item in profile.json()["discipline_reviews"]] == ["Published"]
    assert client.get("/api/parent/children").status_code == 403


def test_teacher_roster_and_writes_follow_course_assignments(client):
    login(client, "teacher2")
    roster = client.get("/api/teacher/my-students")
    assert [student["full_name"] for student in roster.json()] == ["Student2"]

    unauthorized_discipline = client.post(
        "/api/teacher/discipline",
        json={"student_id": 1, "category": "Note", "description": "Out of class"},
    )
    assert unauthorized_discipline.status_code == 403

    unauthorized_grade = client.post(
        "/api/teacher/report-card",
        json={
            "student_id": 2,
            "term": "Fall 2026",
            "subject": "Biology",
            "grade": "A",
        },
    )
    assert unauthorized_grade.status_code == 403

    valid_grade = client.post(
        "/api/teacher/report-card",
        json={
            "student_id": 2,
            "term": "Fall 2026",
            "subject": "English",
            "grade": "A",
        },
    )
    assert valid_grade.status_code == 200
    assert valid_grade.json()["report_card"]["status"] == "TEACHER_SUBMITTED"


def test_discipline_approval_requires_pending_review_and_csrf(client):
    login(client, "teacher1")
    created = client.post(
        "/api/teacher/discipline",
        json={
            "student_id": 1,
            "category": "Concern",
            "description": "Submitted for review",
            "status": "PENDING_ADMIN_REVIEW",
        },
    )
    assert created.status_code == 200
    pending_id = created.json()["discipline_review"]["id"]
    direct_publish = client.post(
        "/api/teacher/discipline",
        json={
            "student_id": 1,
            "category": "Concern",
            "description": "Must not bypass admin",
            "status": "APPROVED_PUBLISHED",
        },
    )
    assert direct_publish.status_code == 400

    login(client, "principal")
    assert client.patch("/api/admin/discipline/3/approve").status_code == 409
    approved = client.patch(f"/api/admin/discipline/{pending_id}/approve")
    assert approved.status_code == 200
    assert approved.json()["discipline_review"]["status"] == "APPROVED_PUBLISHED"

    client.headers.pop("X-CSRF-Token")
    rejected = client.patch(f"/api/admin/discipline/{pending_id}/approve")
    assert rejected.status_code == 403


def test_report_card_requires_admin_approval_before_visibility(client):
    login(client, "parent1")
    report_id = 2
    assert [item["subject"] for item in client.get("/api/parent/child/1").json()["report_cards"]] == ["Mathematics"]

    login(client, "principal")
    queue = client.get("/api/admin/report-card-queue")
    assert any(item["id"] == report_id for item in queue.json())
    assert client.patch("/api/admin/report-card/3/approve").status_code == 409

    approved = client.patch(f"/api/admin/report-card/{report_id}/approve")
    assert approved.status_code == 200
    assert approved.json()["status"] == "ADMIN_APPROVED"
    returned = client.patch("/api/admin/report-card/4/reject")
    assert returned.status_code == 200
    assert returned.json()["status"] == "DRAFT"

    login(client, "parent1")
    visible_subjects = {
        item["subject"] for item in client.get("/api/parent/child/1").json()["report_cards"]
    }
    assert visible_subjects == {"Mathematics", "Art"}


def test_health_endpoint_checks_database(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "connected"}


def test_production_startup_rejects_sqlite(monkeypatch):
    engine = create_engine("sqlite://")
    monkeypatch.setattr(main_module, "engine", engine)
    monkeypatch.setattr(main_module, "ENVIRONMENT", "production")
    try:
        with pytest.raises(RuntimeError, match="persistent PostgreSQL"):
            with TestClient(app):
                pass
    finally:
        engine.dispose()


def test_demo_seeding_is_disabled_in_production(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    with pytest.raises(RuntimeError, match="disabled in production"):
        seed_data(None)
