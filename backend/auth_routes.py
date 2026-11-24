
import re

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator
from mysql.connector.errors import IntegrityError

from database import get_db_connection
from auth import (
    hash_password,
    verify_password,
    create_access_token
)


router = APIRouter()


# ==============================
# EMAIL VALIDATION HELPER
# ==============================

def validate_email_address(value):
    value = value.strip().lower()

    email_pattern = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"

    if not re.match(email_pattern, value):
        raise ValueError("Please enter a valid email address")

    return value


# ==============================
# REGISTER MODEL
# ==============================

class RegisterData(BaseModel):
    full_name: str
    email: str
    password: str

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, value):
        if not value or not value.strip():
            raise ValueError("Full name cannot be empty")

        return value.strip()

    @field_validator("email")
    @classmethod
    def validate_email(cls, value):
        return validate_email_address(value)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value):
        if not value or not value.strip():
            raise ValueError("Password cannot be empty")

        if len(value) < 8:
            raise ValueError(
                "Password must contain at least 8 characters"
            )

        return value


# ==============================
# LOGIN MODEL
# ==============================

class LoginData(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value):
        return validate_email_address(value)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value):
        if not value:
            raise ValueError("Password cannot be empty")

        return value


# ==============================
# REGISTER API
# ==============================

@router.post("/register")
def register_user(user: RegisterData):

    db = get_db_connection()
    cursor = None

    try:
        cursor = db.cursor()

        cursor.execute(
            "SELECT id FROM users WHERE email = %s",
            (user.email,)
        )

        existing_user = cursor.fetchone()

        if existing_user:
            raise HTTPException(
                status_code=409,
                detail="Email is already registered"
            )

        hashed_password = hash_password(user.password)

        query = """
            INSERT INTO users
            (full_name, email, password_hash)
            VALUES (%s, %s, %s)
        """

        values = (
            user.full_name,
            user.email,
            hashed_password
        )

        cursor.execute(query, values)
        db.commit()

        new_user_id = cursor.lastrowid

        return {
            "message": "Registration successful!",
            "user_id": new_user_id,
            "full_name": user.full_name,
            "email": user.email
        }

    except HTTPException:
        db.rollback()
        raise

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="Email is already registered"
        )

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Registration failed. Please try again."
        )

    finally:
        if cursor:
            cursor.close()

        if db and db.is_connected():
            db.close()


# ==============================
# LOGIN API
# ==============================

@router.post("/login")
def login_user(user: LoginData):

    db = get_db_connection()
    cursor = None

    try:
        cursor = db.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                id,
                full_name,
                email,
                password_hash
            FROM users
            WHERE email = %s
            """,
            (user.email,)
        )

        existing_user = cursor.fetchone()

        if not existing_user:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        password_valid = verify_password(
            user.password,
            existing_user["password_hash"]
        )

        if not password_valid:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        access_token = create_access_token(
            existing_user["id"],
            existing_user["email"]
        )

        return {
            "message": "Login successful!",
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": existing_user["id"],
                "full_name": existing_user["full_name"],
                "email": existing_user["email"]
            }
        }

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Login failed. Please try again."
        )

    finally:
        if cursor:
            cursor.close()

        if db and db.is_connected():
            db.close()
