
from datetime import date, time, datetime
from urllib.parse import urlparse
from typing import Optional
import re

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator, model_validator

from database import get_db_connection
from auth_routes import router as auth_router
from auth import get_current_user


# ==============================
# CREATE FASTAPI APPLICATION
# ==============================

app = FastAPI(
    title="CareerTrack API",
    description="Secure multi-user job application management API",
    version="2.0.0"
)


# ==============================
# CORS CONFIGURATION
# ==============================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================
# AUTHENTICATION ROUTES
# ==============================

app.include_router(auth_router)


# ==============================
# DATABASE HELPER FUNCTIONS
# ==============================

def close_database(cursor, db):
    if cursor:
        cursor.close()

    if db and db.is_connected():
        db.close()


def check_application_ownership(cursor, application_id, user_id):
    if application_id is None:
        return

    cursor.execute(
        """
        SELECT id
        FROM applications
        WHERE id = %s AND user_id = %s
        """,
        (application_id, user_id)
    )

    if not cursor.fetchone():
        raise HTTPException(
            status_code=404,
            detail="Application not found"
        )


# ==============================
# VALIDATION HELPERS
# ==============================

def validate_required_text(value, field_name):
    if not value or not value.strip():
        raise ValueError(f"{field_name} cannot be empty")

    return value.strip()


def validate_date(value, field_name):
    try:
        parsed_date = date.fromisoformat(value)
    except (ValueError, TypeError):
        raise ValueError(
            f"{field_name} must be YYYY-MM-DD format"
        )

    return parsed_date


def validate_time(value, field_name):
    try:
        time.fromisoformat(value)
    except (ValueError, TypeError):
        raise ValueError(
            f"{field_name} must be HH:MM format"
        )

    return value


def validate_url(value):
    if not value:
        return value

    value = value.strip()
    parsed = urlparse(value)

    if parsed.scheme not in ["http", "https"] or not parsed.netloc:
        raise ValueError(
            "URL must start with http:// or https://"
        )

    return value


def validate_future_datetime(date_value, time_value, field_name):
    selected_datetime = datetime.combine(
        date.fromisoformat(date_value),
        time.fromisoformat(time_value)
    )

    if selected_datetime < datetime.now():
        raise ValueError(
            f"{field_name} cannot be in the past"
        )


# ==============================
# APPLICATION MODEL
# ==============================

class Application(BaseModel):
    company_name: str
    job_role: str
    location: str = ""
    application_date: str = ""
    status: str = "Applied"
    job_type: str = ""
    salary: str = ""
    job_link: str = ""
    notes: str = ""

    @field_validator("company_name")
    @classmethod
    def validate_company(cls, value):
        return validate_required_text(value, "Company name")

    @field_validator("job_role")
    @classmethod
    def validate_role(cls, value):
        return validate_required_text(value, "Job role")

    @field_validator("location")
    @classmethod
    def validate_location(cls, value):
        return value.strip()

    @field_validator("application_date")
    @classmethod
    def validate_application_date(cls, value):
        if value:
            parsed_date = validate_date(
                value,
                "Application date"
            )

            if parsed_date > date.today():
                raise ValueError(
                    "Application date cannot be in the future"
                )

        return value

    @field_validator("status")
    @classmethod
    def validate_status(cls, value):
        allowed_statuses = [
            "Applied",
            "Assessment",
            "Interview",
            "Selected",
            "Rejected"
        ]

        value = value.strip()

        if value not in allowed_statuses:
            raise ValueError("Invalid application status")

        return value

    @field_validator("job_link")
    @classmethod
    def validate_job_link(cls, value):
        return validate_url(value)

    @field_validator("job_type", "salary", "notes")
    @classmethod
    def clean_optional_fields(cls, value):
        return value.strip()


# ==============================
# PROFILE MODEL
# ==============================

class ProfileData(BaseModel):
    name: str
    email: str
    education: str = ""
    college: str = ""
    skills: str = ""
    objective: str = ""

    @field_validator("name")
    @classmethod
    def validate_name(cls, value):
        return validate_required_text(value, "Name")

    @field_validator("email")
    @classmethod
    def validate_email(cls, value):
        value = validate_required_text(value, "Email").lower()

        email_pattern = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"

        if not re.match(email_pattern, value):
            raise ValueError(
                "Please enter a valid email address"
            )

        return value

    @field_validator(
        "education",
        "college",
        "skills",
        "objective"
    )
    @classmethod
    def clean_profile_fields(cls, value):
        return value.strip()


# ==============================
# INTERVIEW MODEL
# ==============================

class InterviewData(BaseModel):
    company_name: str
    job_role: str
    interview_date: str
    interview_time: str
    interview_type: str = "Online"
    meeting_link: str = ""
    feedback: str = ""
    application_id: Optional[int] = None

    @field_validator("company_name")
    @classmethod
    def validate_company(cls, value):
        return validate_required_text(value, "Company name")

    @field_validator("job_role")
    @classmethod
    def validate_role(cls, value):
        return validate_required_text(value, "Job role")

    @field_validator("interview_date")
    @classmethod
    def validate_date_field(cls, value):
        validate_date(value, "Interview date")
        return value

    @field_validator("interview_time")
    @classmethod
    def validate_time_field(cls, value):
        validate_time(value, "Interview time")
        return value

    @field_validator("meeting_link")
    @classmethod
    def validate_meeting_link(cls, value):
        return validate_url(value)

    @field_validator("interview_type")
    @classmethod
    def validate_type(cls, value):
        value = value.strip()

        if value not in ["Online", "Offline"]:
            raise ValueError(
                "Interview type must be Online or Offline"
            )

        return value

    @field_validator("feedback")
    @classmethod
    def clean_feedback(cls, value):
        return value.strip()

    @model_validator(mode="after")
    def check_interview_datetime(self):
        validate_future_datetime(
            self.interview_date,
            self.interview_time,
            "Interview date and time"
        )
        return self


# ==============================
# REMINDER MODEL
# ==============================

class ReminderData(BaseModel):
    title: str
    description: str = ""
    reminder_date: str
    reminder_time: str
    reminder_type: str = "Interview"
    application_id: Optional[int] = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, value):
        return validate_required_text(value, "Reminder title")

    @field_validator("reminder_date")
    @classmethod
    def validate_date_field(cls, value):
        validate_date(value, "Reminder date")
        return value

    @field_validator("reminder_time")
    @classmethod
    def validate_time_field(cls, value):
        validate_time(value, "Reminder time")
        return value

    @field_validator("reminder_type")
    @classmethod
    def validate_type(cls, value):
        allowed_types = [
            "Interview",
            "Assessment",
            "Application",
            "Other"
        ]

        value = value.strip()

        if value not in allowed_types:
            raise ValueError("Invalid reminder type")

        return value

    @field_validator("description")
    @classmethod
    def clean_description(cls, value):
        return value.strip()

    @model_validator(mode="after")
    def check_reminder_datetime(self):
        validate_future_datetime(
            self.reminder_date,
            self.reminder_time,
            "Reminder date and time"
        )
        return self


# ==============================
# HOME ROUTE
# ==============================

@app.get("/")
def home():
    return {
        "message": "Welcome to CareerTrack Backend!",
        "status": "Running successfully"
    }


# ==============================
# CURRENT USER ROUTE
# ==============================

@app.get("/me")
def get_my_profile(
    current_user: dict = Depends(get_current_user)
):
    return {
        "message": "Authentication successful!",
        "user": current_user
    }


# ==============================
# APPLICATION ROUTES
# ==============================

@app.get("/applications")
def get_applications(
    current_user: dict = Depends(get_current_user)
):
    db = get_db_connection()
    cursor = None

    try:
        cursor = db.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT *
            FROM applications
            WHERE user_id = %s
            ORDER BY id DESC
            """,
            (current_user["id"],)
        )

        return cursor.fetchall()

    finally:
        close_database(cursor, db)


@app.post("/applications")
def add_application(
    application: Application,
    current_user: dict = Depends(get_current_user)
):
    db = get_db_connection()
    cursor = None

    try:
        cursor = db.cursor()

        query = """
            INSERT INTO applications
            (
                company_name, job_role, location,
                application_date, status, job_type,
                salary, job_link, notes, user_id
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        values = (
            application.company_name,
            application.job_role,
            application.location,
            application.application_date or None,
            application.status,
            application.job_type,
            application.salary,
            application.job_link,
            application.notes,
            current_user["id"]
        )

        cursor.execute(query, values)
        db.commit()

        return {
            "message": "Application added successfully!",
            "application_id": cursor.lastrowid
        }

    except Exception:
        db.rollback()
        raise

    finally:
        close_database(cursor, db)


@app.put("/applications/{application_id}")
def update_application(
    application_id: int,
    application: Application,
    current_user: dict = Depends(get_current_user)
):
    db = get_db_connection()
    cursor = None

    try:
        cursor = db.cursor()

        cursor.execute(
            """
            SELECT id
            FROM applications
            WHERE id = %s AND user_id = %s
            """,
            (application_id, current_user["id"])
        )

        if not cursor.fetchone():
            raise HTTPException(
                status_code=404,
                detail="Application not found"
            )

        query = """
            UPDATE applications
            SET
                company_name = %s,
                job_role = %s,
                location = %s,
                application_date = %s,
                status = %s,
                job_type = %s,
                salary = %s,
                job_link = %s,
                notes = %s
            WHERE id = %s AND user_id = %s
        """

        values = (
            application.company_name,
            application.job_role,
            application.location,
            application.application_date or None,
            application.status,
            application.job_type,
            application.salary,
            application.job_link,
            application.notes,
            application_id,
            current_user["id"]
        )

        cursor.execute(query, values)
        db.commit()

        return {
            "message": "Application updated successfully!"
        }

    except Exception:
        db.rollback()
        raise

    finally:
        close_database(cursor, db)


@app.delete("/applications/{application_id}")
def delete_application(
    application_id: int,
    current_user: dict = Depends(get_current_user)
):
    db = get_db_connection()
    cursor = None

    try:
        cursor = db.cursor()

        cursor.execute(
            """
            DELETE FROM applications
            WHERE id = %s AND user_id = %s
            """,
            (application_id, current_user["id"])
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Application not found"
            )

        db.commit()

        return {
            "message": "Application deleted successfully!"
        }

    except Exception:
        db.rollback()
        raise

    finally:
        close_database(cursor, db)


# ==============================
# PROFILE ROUTES
# ==============================

@app.get("/profile")
def get_profile(
    current_user: dict = Depends(get_current_user)
):
    db = get_db_connection()
    cursor = None

    try:
        cursor = db.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                id,
                full_name AS name,
                email,
                qualification AS education,
                college,
                skills,
                objective
            FROM profile
            WHERE user_id = %s
            LIMIT 1
            """,
            (current_user["id"],)
        )

        profile = cursor.fetchone()

        return profile if profile else {}

    finally:
        close_database(cursor, db)


@app.put("/profile")
def save_profile(
    profile: ProfileData,
    current_user: dict = Depends(get_current_user)
):
    db = get_db_connection()
    cursor = None

    try:
        cursor = db.cursor()

        cursor.execute(
            """
            SELECT id
            FROM profile
            WHERE user_id = %s
            """,
            (current_user["id"],)
        )

        existing_profile = cursor.fetchone()

        if existing_profile:
            query = """
                UPDATE profile
                SET
                    full_name = %s,
                    email = %s,
                    qualification = %s,
                    college = %s,
                    skills = %s,
                    objective = %s
                WHERE user_id = %s
            """

            values = (
                profile.name,
                profile.email,
                profile.education,
                profile.college,
                profile.skills,
                profile.objective,
                current_user["id"]
            )

            cursor.execute(query, values)

        else:
            query = """
                INSERT INTO profile
                (
                    full_name,
                    email,
                    qualification,
                    college,
                    skills,
                    objective,
                    user_id
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """

            values = (
                profile.name,
                profile.email,
                profile.education,
                profile.college,
                profile.skills,
                profile.objective,
                current_user["id"]
            )

            cursor.execute(query, values)

        db.commit()

        return {
            "message": "Profile saved successfully!"
        }

    except Exception:
        db.rollback()
        raise

    finally:
        close_database(cursor, db)


# ==============================
# INTERVIEW ROUTES
# ==============================

@app.get("/interviews")
def get_interviews(
    current_user: dict = Depends(get_current_user)
):
    db = get_db_connection()
    cursor = None

    try:
        cursor = db.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                id,
                application_id,
                company_name,
                job_role,
                interview_date,
                interview_time,
                interview_round,
                interview_type,
                meeting_link,
                status,
                feedback
            FROM interviews
            WHERE user_id = %s
            ORDER BY interview_date
            """,
            (current_user["id"],)
        )

        return cursor.fetchall()

    finally:
        close_database(cursor, db)


@app.post("/interviews")
def add_interview(
    interview: InterviewData,
    current_user: dict = Depends(get_current_user)
):
    db = get_db_connection()
    cursor = None

    try:
        cursor = db.cursor()

        check_application_ownership(
            cursor,
            interview.application_id,
            current_user["id"]
        )

        query = """
            INSERT INTO interviews
            (
                application_id,
                company_name,
                job_role,
                interview_date,
                interview_time,
                interview_type,
                meeting_link,
                feedback,
                user_id
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        values = (
            interview.application_id,
            interview.company_name,
            interview.job_role,
            interview.interview_date,
            interview.interview_time,
            interview.interview_type,
            interview.meeting_link,
            interview.feedback,
            current_user["id"]
        )

        cursor.execute(query, values)
        db.commit()

        return {
            "message": "Interview added successfully!",
            "interview_id": cursor.lastrowid
        }

    except Exception:
        db.rollback()
        raise

    finally:
        close_database(cursor, db)


@app.delete("/interviews/{interview_id}")
def delete_interview(
    interview_id: int,
    current_user: dict = Depends(get_current_user)
):
    db = get_db_connection()
    cursor = None

    try:
        cursor = db.cursor()

        cursor.execute(
            """
            DELETE FROM interviews
            WHERE id = %s AND user_id = %s
            """,
            (interview_id, current_user["id"])
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Interview not found"
            )

        db.commit()

        return {
            "message": "Interview deleted successfully!"
        }

    except Exception:
        db.rollback()
        raise

    finally:
        close_database(cursor, db)


# ==============================
# REMINDER ROUTES
# ==============================

@app.get("/reminders")
def get_reminders(
    current_user: dict = Depends(get_current_user)
):
    db = get_db_connection()
    cursor = None

    try:
        cursor = db.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                id,
                title,
                description,
                reminder_date,
                reminder_time,
                reminder_type,
                application_id,
                status
            FROM reminders
            WHERE user_id = %s
            ORDER BY reminder_date, reminder_time
            """,
            (current_user["id"],)
        )

        return cursor.fetchall()

    finally:
        close_database(cursor, db)


@app.post("/reminders")
def add_reminder(
    reminder: ReminderData,
    current_user: dict = Depends(get_current_user)
):
    db = get_db_connection()
    cursor = None

    try:
        cursor = db.cursor()

        check_application_ownership(
            cursor,
            reminder.application_id,
            current_user["id"]
        )

        query = """
            INSERT INTO reminders
            (
                title,
                description,
                reminder_date,
                reminder_time,
                reminder_type,
                application_id,
                user_id
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """

        values = (
            reminder.title,
            reminder.description,
            reminder.reminder_date,
            reminder.reminder_time,
            reminder.reminder_type,
            reminder.application_id,
            current_user["id"]
        )

        cursor.execute(query, values)
        db.commit()

        return {
            "message": "Reminder added successfully!",
            "reminder_id": cursor.lastrowid
        }

    except Exception:
        db.rollback()
        raise

    finally:
        close_database(cursor, db)


@app.delete("/reminders/{reminder_id}")
def delete_reminder(
    reminder_id: int,
    current_user: dict = Depends(get_current_user)
):
    db = get_db_connection()
    cursor = None

    try:
        cursor = db.cursor()

        cursor.execute(
            """
            DELETE FROM reminders
            WHERE id = %s AND user_id = %s
            """,
            (reminder_id, current_user["id"])
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Reminder not found"
            )

        db.commit()

        return {
            "message": "Reminder deleted successfully!"
        }

    except Exception:
        db.rollback()
        raise

    finally:
        close_database(cursor, db)
