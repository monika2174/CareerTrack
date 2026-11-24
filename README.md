# CareerTrack – Job Application Tracking Platform

CareerTrack is a full-stack web application designed to help job seekers organize, manage, and track their job applications in one place.

It provides a centralized dashboard to monitor application progress, schedule interviews, manage reminders, and analyze job search activities.

## Features

- **User Authentication:** Secure registration and login with password hashing and JWT authentication.
- **Dashboard:** View total applications, assessments, interviews, and selections.
- **Application Management:** Add, view, update, delete, search, and filter job applications.
- **Analytics:** Visualize application statistics and track job search progress.
- **Interview Management:** Schedule and manage upcoming interviews.
- **Reminders:** Create and manage important job search reminders.
- **User Profile:** Manage personal and professional information.

## Technology Stack

### Frontend
- React.js
- JavaScript
- HTML5
- CSS3
- Vite

### Backend
- Python
- FastAPI
- REST API
- JWT Authentication

### Database
- MySQL

### Tools
- Visual Studio Code
- Git and GitHub
- Postman / FastAPI Swagger UI

## Project Structure

```text
CareerTrack/
│
├── backend/
│   ├── auth.py
│   ├── auth_routes.py
│   ├── database.py
│   └── main.py
│
├── public/
│
├── src/
│   ├── components/
│   │   ├── Analytics.jsx
│   │   ├── Interview.jsx
│   │   ├── Profile.jsx
│   │   └── Reminders.jsx
│   │
│   ├── App.jsx
│   ├── App.css
│   ├── Auth.jsx
│   ├── Auth.css
│   ├── api.js
│   ├── index.css
│   └── main.jsx
│
├── .gitignore
├── package.json
└── README.md
```

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/monika2174/CareerTrack.git
cd CareerTrack
```

### 2. Frontend Setup

```bash
npm install
npm run dev
```

Open the frontend at:

```text
http://localhost:5174/
```

### 3. Backend Setup

Open a separate terminal:

```bash
cd backend
python -m venv venv
```

Activate the virtual environment on Windows:

```powershell
venv\Scripts\activate
```

Install the Python dependencies used by the project and configure your local environment variables and MySQL database.

Start the backend:


python -m uvicorn main:app --reload

Backend URL:


http://127.0.0.1:8000


### 4. API Documentation

FastAPI Swagger documentation:


http://127.0.0.1:8000/docs


## Future Enhancements

- Deploy the application online.
- Add advanced analytics and reporting.
- Improve interview preparation and tracking features.
- Add additional dashboard customization.

## Author

**Monika Borra**

- GitHub: [monika2174](https://github.com/monika2174)

---

⭐ If you find this project useful, consider giving the repository a star!
