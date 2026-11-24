
import { useState, useEffect } from "react";
import { apiFetch } from "../api";

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function Interview() {
  const [interviews, setInterviews] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    company: "",
    role: "",
    date: "",
    time: "",
    type: "Online",
    link: "",
    notes: "",
  });

  function showMessage(text, type = "success") {
    setMessage(text);
    setMessageType(type);
  }

  async function fetchInterviews() {
    try {
      const response = await apiFetch("/interviews");

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to load interviews");
      }

      const data = await response.json();

      setInterviews(
        data.map((item) => ({
          id: item.id,
          company: item.company_name,
          role: item.job_role,
          date: item.interview_date || "",
          time: item.interview_time || "",
          type: item.interview_type || "Online",
          link: item.meeting_link || "",
          notes: item.feedback || "",
        }))
      );

      return true;
    } catch (error) {
      console.error("Error loading interviews:", error);
      showMessage(
        error.message || "Unable to load interviews. Please check your backend connection.",
        "error"
      );
      return false;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInterviews();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  }

  function validateForm() {
    if (!formData.company.trim()) {
      showMessage("Please enter a valid company name.", "error");
      return false;
    }

    if (!formData.role.trim()) {
      showMessage("Please enter a valid job role.", "error");
      return false;
    }

    if (!formData.date) {
      showMessage("Please select an interview date.", "error");
      return false;
    }

    if (!formData.time) {
      showMessage("Please select an interview time.", "error");
      return false;
    }

    const selectedDateTime = new Date(
      `${formData.date}T${formData.time}`
    );

    if (selectedDateTime < new Date()) {
      showMessage(
        "Interview date and time cannot be in the past.",
        "error"
      );
      return false;
    }

    if (formData.type === "Online" && formData.link.trim()) {
      try {
        const url = new URL(formData.link.trim());

        if (!["http:", "https:"].includes(url.protocol)) {
          showMessage(
            "Please enter a valid meeting link starting with http:// or https://.",
            "error"
          );
          return false;
        }
      } catch {
        showMessage("Please enter a valid meeting URL.", "error");
        return false;
      }
    }

    return true;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) return;
    if (!validateForm()) return;

    setIsSubmitting(true);
    setMessage("");

    const interviewData = {
      company_name: formData.company.trim(),
      job_role: formData.role.trim(),
      interview_date: formData.date,
      interview_time: formData.time,
      interview_type: formData.type,
      meeting_link: formData.link.trim(),
      feedback: formData.notes.trim(),
    };

    try {
      const response = await apiFetch("/interviews", {
        method: "POST",
        body: JSON.stringify(interviewData),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to save interview. Please try again."
        );
      }

      const refreshed = await fetchInterviews();

      setFormData({
        company: "",
        role: "",
        date: "",
        time: "",
        type: "Online",
        link: "",
        notes: "",
      });

      setShowForm(false);

      if (refreshed) {
        showMessage("Interview scheduled successfully!");
      }
    } catch (error) {
      console.error("Error saving interview:", error);
      showMessage(error.message || "Unable to save interview.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this interview?"
    );

    if (!confirmDelete) return;

    try {
      const response = await apiFetch(`/interviews/${id}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Unable to delete interview.");
      }

      const refreshed = await fetchInterviews();

      if (refreshed) {
        showMessage("Interview deleted successfully!");
      }
    } catch (error) {
      console.error("Error deleting interview:", error);
      showMessage(error.message || "Unable to delete interview.", "error");
    }
  }

  return (
    <div className="interview-page">
      <div className="interview-header">
        <div>
          <h1>Interview Management</h1>
          <p>Plan and track your upcoming interviews.</p>
        </div>

        <button
          type="button"
          onClick={() => {
            setMessage("");
            setShowForm(true);
          }}
        >
          + Schedule Interview
        </button>
      </div>

      {message && (
        <p
          className={
            messageType === "error" ? "error-message" : "success-message"
          }
          role="alert"
        >
          {message}
        </p>
      )}

      <div className="interview-summary">
        <div>
          <h2>{interviews.length}</h2>
          <p>Total Interviews</p>
        </div>

        <div>
          <h2>
            {interviews.filter((item) => item.type === "Online").length}
          </h2>
          <p>Online Interviews</p>
        </div>

        <div>
          <h2>
            {interviews.filter((item) => item.type === "Offline").length}
          </h2>
          <p>Offline Interviews</p>
        </div>
      </div>

      <div className="interview-list">
        <h2>Scheduled Interviews</h2>

        {loading ? (
          <p>Loading interviews...</p>
        ) : interviews.length === 0 ? (
          <p className="empty-message">
            No interviews scheduled yet. Click Schedule Interview to add one.
          </p>
        ) : (
          interviews.map((interview) => (
            <div className="interview-card" key={interview.id}>
              <div>
                <h3>{interview.company}</h3>
                <p>{interview.role}</p>
                <p>
                  📅 {interview.date} | ⏰ {interview.time}
                </p>
                <p>📍 {interview.type}</p>

                {interview.link && (
                  <p>
                    <a
                      href={
                        interview.type === "Online"
                          ? interview.link
                          : undefined
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      {interview.type === "Online"
                        ? "Meeting Link"
                        : interview.link}
                    </a>
                  </p>
                )}

                {interview.notes && <p>Notes: {interview.notes}</p>}
              </div>

              <button
                type="button"
                className="delete-button"
                onClick={() => handleDelete(interview.id)}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Schedule Interview</h2>
            <p>Enter your interview details.</p>

            {message && (
              <p
                className={
                  messageType === "error" ? "error-message" : "success-message"
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
                onChange={handleChange}
                placeholder="Example: Infosys"
                maxLength={100}
                required
              />

              <label>Job Role</label>
              <input
                name="role"
                value={formData.role}
                onChange={handleChange}
                placeholder="Example: System Engineer"
                maxLength={100}
                required
              />

              <label>Interview Date</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                min={getTodayDate()}
                onChange={handleChange}
                required
              />

              <label>Interview Time</label>
              <input
                type="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                required
              />

              <label>Interview Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
              >
                <option value="Online">Online</option>
                <option value="Offline">Offline</option>
              </select>

              <label>Meeting Link / Location</label>
              <input
                name="link"
                value={formData.link}
                onChange={handleChange}
                placeholder="Meeting link or office address"
                maxLength={255}
              />

              <label>Interview Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Enter preparation notes..."
                rows="3"
              />

              <div className="modal-actions">
                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Interview"}
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
    </div>
  );
}

export default Interview;
