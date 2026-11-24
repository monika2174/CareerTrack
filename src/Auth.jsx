
import { useState } from "react";
import { apiFetch } from "./api";
import "./Auth.css";

function Auth({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (isRegister && formData.full_name.trim().length < 2) {
      setMessage("Please enter your full name.");
      return;
    }

    if (formData.password.length < 8) {
      setMessage("Password must contain at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const endpoint = isRegister ? "/register" : "/login";

      const payload = isRegister
        ? {
            full_name: formData.full_name.trim(),
            email: formData.email.trim(),
            password: formData.password,
          }
        : {
            email: formData.email.trim(),
            password: formData.password,
          };

      const response = await apiFetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Authentication failed. Please try again."
        );
      }

      if (isRegister) {
        setMessage("Account created successfully! Please log in.");
        setMessageType("success");

        setFormData({
          full_name: "",
          email: formData.email,
          password: "",
        });

        setIsRegister(false);
      } else {
        if (!data.access_token) {
          throw new Error("Login succeeded but no access token was received.");
        }

        localStorage.setItem("careertrack_token", data.access_token);
        localStorage.setItem(
          "careertrack_user",
          JSON.stringify(data.user || {})
        );

        onLogin(data.user || {});
      }
    } catch (error) {
      setMessage(error.message || "Something went wrong.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <h1>
            CareerTrack<span>.</span>
          </h1>
          <p>Organize your job search. Build your future.</p>
        </div>

        <div className="auth-heading">
          <h2>{isRegister ? "Create Account" : "Welcome Back!"}</h2>
          <p>
            {isRegister
              ? "Create your account to get started."
              : "Sign in to continue to your workspace."}
          </p>
        </div>

        {message && (
          <div className={`auth-message ${messageType}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister && (
            <div className="auth-field">
              <label htmlFor="full_name">Full Name</label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                placeholder="Enter your full name"
                value={formData.full_name}
                onChange={handleChange}
                maxLength={100}
                required
              />
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              minLength={8}
              required
            />
            <small>Minimum 8 characters</small>
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : isRegister
                ? "Create Account"
                : "Login"}
          </button>
        </form>

        <div className="auth-switch">
          {isRegister
            ? "Already have an account?"
            : "Don't have an account?"}

          <button
            type="button"
            onClick={() => {
              setIsRegister((previous) => !previous);
              setMessage("");
            }}
          >
            {isRegister ? "Login" : "Register"}
          </button>
        </div>

        <div className="auth-footer">
          CareerTrack · Smart Job Application Management
        </div>
      </div>
    </div>
  );
}

export default Auth;
