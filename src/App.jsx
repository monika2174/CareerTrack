import { useState, useEffect } from "react";
import "./App.css";

import Auth from "./Auth";
import { apiFetch } from "./api";

import Interview from "./components/Interview";
import Reminders from "./components/Reminders";
import Profile from "./components/Profile";
import Analytics from "./components/Analytics";

const VALID_STATUSES = [
  "Applied",
  "Assessment",
  "Interview",
  "Selected",
  "Rejected",
];

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatApplication(app) {
  return {
    id: app.id,
    company: app.company_name,
    role: app.job_role,
    location: app.location || "",
    status: app.status,
    date: app.application_date || "",
    job_type: app.job_type || "",
    salary: app.salary || "",
    job_link: app.job_link || "",
    notes: app.notes || "",
  };
}

function prepareApplication(app) {
  return {
    company_name: app.company.trim(),
    job_role: app.role.trim(),
    location: app.location.trim(),
    application_date: app.date || "",
    status: app.status,
    job_type: app.job_type || "",
    salary: app.salary || "",
    job_link: app.job_link || "",
    notes: app.notes || "",
  };
}

function App() {
  const [token, setToken] = useState(() =>
    localStorage.getItem("careertrack_token")
  );

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("careertrack_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [applications, setApplications] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    company: "",
    role: "",
    location: "",
    status: "Applied",
    date: getTodayDate(),
  });

  function showMessage(text, type = "success") {
    setMessage(text);
    setMessageType(type);
  }

  function handleLogin(userData) {
    setUser(userData);
    setToken(localStorage.getItem("careertrack_token"));
    setLoading(true);
  }

  function handleLogout() {
    localStorage.removeItem("careertrack_token");
    localStorage.removeItem("careertrack_user");

    setToken(null);
    setUser(null);
    setApplications([]);
    setCurrentPage("dashboard");
    setLoading(false);
    setMessage("");
  }

  async function fetchApplications() {
    try {
      const response = await apiFetch("/applications");

      if (response.status === 401) {
        handleLogout();
        return false;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch applications from the server.");
      }

      const data = await response.json();

      setApplications(data.map(formatApplication));
      setMessage("");
      return true;
    } catch (error) {
      console.error("Error loading applications:", error);

      showMessage(
        "Unable to load applications. Please check your backend connection.",
        "error"
      );

      return false;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      setLoading(true);
      fetchApplications();
    } else {
      setApplications([]);
      setLoading(false);
    }
  }, [token]);

  const total = applications.length;

  const interviews = applications.filter(
    (app) => app.status === "Interview"
  ).length;

  const assessments = applications.filter(
    (app) => app.status === "Assessment"
  ).length;

  const selected = applications.filter(
    (app) => app.status === "Selected"
  ).length;

  const filteredApplications = applications.filter((app) => {
    const matchesSearch = `${app.company} ${app.role}`
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "All" || app.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  function handleInputChange(event) {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  }

  function validateApplication() {
    if (!formData.company.trim()) {
      showMessage("Please enter a valid company name.", "error");
      return false;
    }

    if (!formData.role.trim()) {
      showMessage("Please enter a valid job role.", "error");
      return false;
    }

    if (!formData.location.trim()) {
      showMessage("Please enter a valid location.", "error");
      return false;
    }

    if (!formData.date) {
      showMessage("Please select the application date.", "error");
      return false;
    }

    if (formData.date > getTodayDate()) {
      showMessage("Application date cannot be in the future.", "error");
      return false;
    }

    if (!VALID_STATUSES.includes(formData.status)) {
      showMessage("Please select a valid application status.", "error");
      return false;
    }

    return true;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting || !validateApplication()) return;

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await apiFetch("/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(prepareApplication(formData)),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to add application. Please try again."
        );
      }

      const refreshed = await fetchApplications();

      setFormData({
        company: "",
        role: "",
        location: "",
        status: "Applied",
        date: getTodayDate(),
      });

      setShowForm(false);

      if (refreshed) {
        showMessage("Application added successfully!");
      }
    } catch (error) {
      console.error("Error adding application:", error);

      showMessage(
        error.message || "Unable to add application. Please try again.",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this application?"
    );

    if (!confirmDelete) return;

    try {
      const response = await apiFetch(`/applications/${id}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (!response.ok) {
        throw new Error(data.detail || "Unable to delete application.");
      }

      const refreshed = await fetchApplications();

      if (refreshed) {
        showMessage("Application deleted successfully!");
      }
    } catch (error) {
      console.error("Error deleting application:", error);

      showMessage(
        error.message || "Unable to delete application.",
        "error"
      );
    }
  }

  async function handleEdit(id) {
    const application = applications.find((app) => app.id === id);

    if (!application) return;

    const updatedStatus = window.prompt(
      "Enter new status: Applied, Assessment, Interview, Selected, Rejected",
      application.status
    );

    if (updatedStatus === null) return;

    const status = updatedStatus.trim();

    if (!VALID_STATUSES.includes(status)) {
      window.alert(
        "Please enter one of these valid statuses: Applied, Assessment, Interview, Selected, Rejected."
      );
      return;
    }

    try {
      const updatedApplication = {
        ...application,
        status,
      };

      const response = await apiFetch(`/applications/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(prepareApplication(updatedApplication)),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (!response.ok) {
        throw new Error(data.detail || "Unable to update application.");
      }

      const refreshed = await fetchApplications();

      if (refreshed) {
        showMessage("Application updated successfully!");
      }
    } catch (error) {
      console.error("Error updating application:", error);

      showMessage(
        error.message || "Unable to update application.",
        "error"
      );
    }
  }

  if (!token) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h2 className="logo">
          CareerTrack<span>.</span>
        </h2>

        <p className="menu-title">MENU</p>

        <nav>
          <a
            href="#dashboard"
            className={currentPage === "dashboard" ? "active" : ""}
            onClick={() => setCurrentPage("dashboard")}
          >
            Dashboard
          </a>

          <a
            href="#analytics"
            className={currentPage === "analytics" ? "active" : ""}
            onClick={() => setCurrentPage("analytics")}
          >
            Analytics
          </a>

          <a
            href="#applications"
            onClick={() => setCurrentPage("dashboard")}
          >
            Applications
          </a>

          <a
            href="#interviews"
            className={currentPage === "interviews" ? "active" : ""}
            onClick={() => setCurrentPage("interviews")}
          >
            Interviews
          </a>

          <a
            href="#reminders"
            className={currentPage === "reminders" ? "active" : ""}
            onClick={() => setCurrentPage("reminders")}
          >
            Reminders
          </a>

          <a
            href="#profile"
            className={currentPage === "profile" ? "active" : ""}
            onClick={() => setCurrentPage("profile")}
          >
            My Profile
          </a>
        </nav>

        <div className="sidebar-bottom">
          <p>Stay focused.</p>
          <small>Your next opportunity is waiting!</small>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              marginTop: "15px",
              padding: "10px 18px",
              cursor: "pointer",
              borderRadius: "8px",
              border: "none",
              background: "#ef4444",
              color: "#ffffff",
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        {currentPage === "dashboard" && (
          <>
            <header className="topbar">
              <div>
                <h1>Dashboard</h1>
                <p>Track your job search journey in one place.</p>
              </div>

              <div className="user-profile">
                <div className="avatar">
                  {(user?.full_name || "U").charAt(0).toUpperCase()}
                </div>

                <span>{user?.full_name || "My Workspace"}</span>
              </div>
            </header>

            <section className="welcome">
              <div>
                <p>WELCOME BACK 👋</p>
                <h2>Your career journey starts here.</h2>
                <span>Keep applying. Keep learning. Keep growing.</span>
              </div>

              <div className="welcome-icon">🚀</div>
            </section>

            <section className="stats">
              <button
                type="button"
                className="stat-card stat-card-button"
                onClick={() => {
                  setStatusFilter("All");
                  setSearch("");
                }}
              >
                <span>Total Applications</span>
                <h2>{total}</h2>
                <p>Companies applied to</p>
              </button>

              <button
                type="button"
                className="stat-card stat-card-button"
                onClick={() => {
                  setStatusFilter("Assessment");
                  setSearch("");
                }}
              >
                <span>Assessments</span>
                <h2>{assessments}</h2>
                <p>Tests and assessments</p>
              </button>

              <button
                type="button"
                className="stat-card stat-card-button"
                onClick={() => setCurrentPage("interviews")}
              >
                <span>Interviews</span>
                <h2>{interviews}</h2>
                <p>Interview opportunities</p>
              </button>

              <button
                type="button"
                className="stat-card stat-card-button"
                onClick={() => {
                  setStatusFilter("Selected");
                  setSearch("");
                }}
              >
                <span>Selected</span>
                <h2>{selected}</h2>
                <p>Offers received</p>
              </button>
            </section>

            <section className="applications-section" id="applications">
              <div className="section-heading">
                <div>
                  <h2>Recent Applications</h2>
                  <p>Manage and track your job applications.</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMessage("");
                    setShowForm(true);
                  }}
                >
                  + Add Application
                </button>
              </div>

              {message && (
                <p
                  className={
                    messageType === "error"
                      ? "error-message"
                      : "success-message"
                  }
                  role="alert"
                >
                  {message}
                </p>
              )}

              {loading ? (
                <p>Loading applications...</p>
              ) : (
                <>
                  <input
                    className="search-box"
                    type="text"
                    placeholder="Search company or role..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />

                  <select
                    className="filter-box"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    <option value="All">All Applications</option>
                    <option value="Applied">Applied</option>
                    <option value="Assessment">Assessment</option>
                    <option value="Interview">Interview</option>
                    <option value="Selected">Selected</option>
                    <option value="Rejected">Rejected</option>
                  </select>

                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Company</th>
                          <th>Job Role</th>
                          <th>Location</th>
                          <th>Applied Date</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredApplications.map((app) => (
                          <tr key={app.id}>
                            <td>
                              <strong>{app.company}</strong>
                            </td>
                            <td>{app.role}</td>
                            <td>{app.location}</td>
                            <td>{app.date}</td>
                            <td>
                              <span className={`status ${app.status.toLowerCase()}`}>
                                {app.status}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="edit-button"
                                onClick={() => handleEdit(app.id)}
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                className="delete-button"
                                onClick={() => handleDelete(app.id)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}

                        {filteredApplications.length === 0 && (
                          <tr>
                            <td colSpan="6">No applications found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>

            {showForm && (
              <div className="modal-overlay">
                <div className="modal">
                  <h2>Add Job Application</h2>
                  <p>Enter the details of your application.</p>

                  {message && (
                    <p
                      className={
                        messageType === "error"
                          ? "error-message"
                          : "success-message"
                      }
                      role="alert"
                    >
                      {message}
                    </p>
                  )}

                  <form onSubmit={handleSubmit}>
                    <label>Company Name</label>
                    <input
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      placeholder="Example: Infosys"
                      maxLength={100}
                      required
                    />

                    <label>Job Role</label>
                    <input
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      placeholder="Example: System Engineer"
                      maxLength={100}
                      required
                    />

                    <label>Location</label>
                    <input
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="Example: Hyderabad"
                      maxLength={100}
                      required
                    />

                    <label>Application Date</label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      max={getTodayDate()}
                      onChange={handleInputChange}
                      required
                    />

                    <label>Application Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      <option value="Applied">Applied</option>
                      <option value="Assessment">Assessment</option>
                      <option value="Interview">Interview</option>
                      <option value="Selected">Selected</option>
                      <option value="Rejected">Rejected</option>
                    </select>

                    <div className="modal-actions">
                      <button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Saving..." : "Save Application"}
                      </button>

                      <button
                        type="button"
                        className="cancel-button"
                        disabled={isSubmitting}
                        onClick={() => {
                          setShowForm(false);
                          setMessage("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}

        {currentPage === "interviews" && <Interview />}
        {currentPage === "reminders" && <Reminders />}
        {currentPage === "profile" && <Profile />}

        {currentPage === "analytics" && (
          <Analytics applications={applications} />
        )}
      </main>
    </div>
  );
}

export default App;