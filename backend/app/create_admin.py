import getpass
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

try:
    from backend.app.auth_utils import hash_password
    from backend.app.database import Base, SessionLocal, engine
    from backend.app.models import User, UserRole
except ImportError:
    from app.auth_utils import hash_password
    from app.database import Base, SessionLocal, engine
    from app.models import User, UserRole


def main():
    if os.getenv("ENVIRONMENT", "development").lower() != "production":
        Base.metadata.create_all(bind=engine)

    username = input("Principal username: ").strip()
    full_name = input("Principal full name: ").strip()
    email = input("Principal email: ").strip()
    password = getpass.getpass("Temporary password (12+ characters): ")
    confirmation = getpass.getpass("Confirm temporary password: ")

    if not username or not full_name or not email:
        raise SystemExit("Username, full name, and email are required.")
    if len(password) < 12:
        raise SystemExit("The initial password must be at least 12 characters.")
    if len(password.encode("utf-8")) > 72:
        raise SystemExit("The initial password must be no longer than 72 UTF-8 bytes.")
    if password != confirmation:
        raise SystemExit("Passwords do not match.")

    db = SessionLocal()
    try:
        principal_exists = (
            db.query(User)
            .filter(User.role == UserRole.ADMIN_PRINCIPAL)
            .first()
        )
        if principal_exists:
            raise SystemExit("A principal account already exists; bootstrap is disabled.")
        duplicate = (
            db.query(User)
            .filter((User.username == username) | (User.email == email))
            .first()
        )
        if duplicate:
            raise SystemExit("That username or email is already in use.")

        db.add(
            User(
                username=username,
                full_name=full_name,
                email=email,
                password_hash=hash_password(password),
                role=UserRole.ADMIN_PRINCIPAL,
            )
        )
        db.commit()
    finally:
        db.close()

    print("Principal account created. Sign in and provision the remaining school accounts.")


if __name__ == "__main__":
    main()
