import { useState, useEffect } from "react";
import { apiFetch } from "../api";

function Reminders() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    date: "",
    time: "",
    type: "Interview",
  });

  function showMessage(text, type = "success") {
    setMessage(text);
    setMessageType(type);
  }

  // Fetch reminders
  async function fetchReminders() {
    try {
      const response = await apiFetch("/reminders");

      if (!response.ok) {
        throw new Error("Failed to load reminders");
      }

      const data = await response.json();

      setReminders(
        data.map((item) => ({
          id: item.id,
          title: item.title,
          date: item.reminder_date || "",
          time: item.reminder_time || "",
          type: item.reminder_type || "Interview",
        }))
      );
    } catch (error) {
      console.error("Error loading reminders:", error);
      showMessage("Unable to load reminders. Check your backend.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReminders();
  }, []);

  // Handle changes
  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  }

  // Validate form
  function validateForm() {
    if (!formData.title.trim()) {
      showMessage("Reminder title cannot be empty.", "error");
      return false;
    }

    if (!formData.date) {
      showMessage("Please select a reminder date.", "error");
      return false;
    }

    if (!formData.time) {
      showMessage("Please select a reminder time.", "error");
      return false;
    }

    const reminderDateTime = new Date(
      `${formData.date}T${formData.time}`
    );

    if (reminderDateTime <= new Date()) {
      showMessage(
        "Reminder must be scheduled for a future date and time.",
        "error"
      );
      return false;
    }

    return true;
  }

  // Add reminder
  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) return;
    if (!validateForm()) return;

    setIsSubmitting(true);
    setMessage("");

    const reminderData = {
      title: formData.title.trim(),
      description: "",
      reminder_date: formData.date,
      reminder_time: formData.time,
      reminder_type: formData.type,
    };

    try {
      const response = await apiFetch("/reminders", {
        method: "POST",
        body: JSON.stringify(reminderData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to save reminder");
      }

      await fetchReminders();

      setFormData({
        title: "",
        date: "",
        time: "",
        type: "Interview",
      });

      showMessage("Reminder added successfully!", "success");
    } catch (error) {
      console.error("Error saving reminder:", error);
      showMessage(error.message || "Unable to save reminder.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Delete reminder
  async function handleDelete(id) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this reminder?"
    );

    if (!confirmDelete) return;

    try {
      const response = await apiFetch(`/reminders/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Unable to delete reminder");
      }

      await fetchReminders();
      showMessage("Reminder deleted successfully!", "success");
    } catch (error) {
      console.error("Error deleting reminder:", error);
      showMessage(error.message || "Unable to delete reminder.", "error");
    }
  }

  return (
    <div className="reminders-page">
      <div className="reminders-header">
        <div>
          <h1>My Reminders</h1>
          <p>Never miss an interview or assessment.</p>
        </div>
      </div>

      {message && (
        <p
          className={
            messageType === "error"
              ? "error-message"
              : "success-message"
          }
        >
          {message}
        </p>
      )}

      <form className="reminder-form" onSubmit={handleSubmit}>
        <h2>Add New Reminder</h2>

        <label>Reminder Title</label>
        <input
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Example: Infosys Technical Interview"
          maxLength={150}
          required
        />

        <label>Date</label>
        <input
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          required
        />

        <label>Time</label>
        <input
          type="time"
          name="time"
          value={formData.time}
          onChange={handleChange}
          required
        />

        <label>Reminder Type</label>
        <select
          name="type"
          value={formData.type}
          onChange={handleChange}
        >
          <option value="Interview">Interview</option>
          <option value="Assessment">Assessment</option>
          <option value="Application">Application Follow-up</option>
          <option value="Other">Other</option>
        </select>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Adding..." : "Add Reminder"}
        </button>
      </form>

      <section className="reminders-list">
        <h2>Upcoming Reminders ({reminders.length})</h2>

        {loading ? (
          <p>Loading reminders...</p>
        ) : reminders.length === 0 ? (
          <p className="empty-message">
            No reminders yet. Add your first reminder!
          </p>
        ) : (
          reminders.map((reminder) => (
            <div className="reminder-card" key={reminder.id}>
              <div>
                <h3>{reminder.title}</h3>
                <p>{reminder.type}</p>
                <p>
                  {reminder.date} at {reminder.time}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleDelete(reminder.id)}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

export default Reminders;