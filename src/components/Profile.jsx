import { useState, useEffect } from "react";
import { apiFetch } from "../api";

function Profile() {
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    education: "",
    college: "",
    skills: "",
    objective: "",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Load profile
  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await apiFetch("/profile");

        if (!response.ok) {
          throw new Error("Failed to load profile");
        }

        const data = await response.json();

        if (data && data.name) {
          setProfile({
            name: data.name || "",
            email: data.email || "",
            education: data.education || "",
            college: data.college || "",
            skills: data.skills || "",
            objective: data.objective || "",
          });

          setIsEditing(false);
        } else {
          setIsEditing(true);
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        setMessage("Unable to load profile. Please check the backend.");
        setIsEditing(true);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  // Handle input changes
  function handleChange(event) {
    const { name, value } = event.target;

    setProfile((previousProfile) => ({
      ...previousProfile,
      [name]: value,
    }));
  }

  // Save profile
  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);

    try {
      const response = await apiFetch("/profile", {
        method: "PUT",
        body: JSON.stringify(profile),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to save profile");
      }

      setProfile({
        name: data.name || profile.name,
        email: data.email || profile.email,
        education: data.education || profile.education,
        college: data.college || profile.college,
        skills: data.skills || profile.skills,
        objective: data.objective || profile.objective,
      });

      setMessage("Profile saved successfully!");
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      setMessage("Unable to save profile. Please check the backend.");
    } finally {
      setIsSaving(false);
    }
  }

  if (loading) {
    return <div className="profile-page">Loading profile...</div>;
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>My Profile</h1>
        <p>Manage your personal and professional information.</p>
      </div>

      <div className="profile-card">
        <div className="profile-avatar">
          {profile.name ? profile.name.charAt(0).toUpperCase() : "M"}
        </div>

        {message && <p>{message}</p>}

        {isEditing ? (
          <form onSubmit={handleSubmit}>
            <label>Full Name</label>
            <input
              name="name"
              value={profile.name}
              onChange={handleChange}
              placeholder="Enter your name"
              required
            />

            <label>Email Address</label>
            <input
              type="email"
              name="email"
              value={profile.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />

            <label>Education</label>
            <input
              name="education"
              value={profile.education}
              onChange={handleChange}
              placeholder="Example: B.Tech IT"
            />

            <label>College</label>
            <input
              name="college"
              value={profile.college}
              onChange={handleChange}
              placeholder="Enter your college"
            />

            <label>Technical Skills</label>
            <textarea
              name="skills"
              value={profile.skills}
              onChange={handleChange}
              placeholder="Example: HTML, CSS, React, Python"
            />

            <label>Career Objective</label>
            <textarea
              name="objective"
              value={profile.objective}
              onChange={handleChange}
              placeholder="Write your career objective"
            />

            <button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Profile"}
            </button>
          </form>
        ) : (
          <div className="profile-details">
            <h2>{profile.name}</h2>
            <p>{profile.email}</p>
            <p>
              <strong>Education:</strong> {profile.education || "Not added"}
            </p>
            <p>
              <strong>College:</strong> {profile.college || "Not added"}
            </p>
            <p>
              <strong>Skills:</strong> {profile.skills || "Not added"}
            </p>
            <p>
              <strong>Career Objective:</strong> {profile.objective || "Not added"}
            </p>

            <button
              onClick={() => {
                setMessage("");
                setIsEditing(true);
              }}
            >
              Edit Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;