import { useState } from "react"
import Dashboard from "./Dashboard"

export default function App() {
  const [step, setStep] = useState(1)
  const [companyCode, setCompanyCode] = useState("")
  const [projectCode, setProjectCode] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)

  async function handleCodeSubmit() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("http://127.0.0.1:8000/check-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_code: companyCode,
          project_code: projectCode
        })
      })
      const data = await res.json()
      if (data.valid) {
        setStep(2)
      } else {
        setError("Invalid company or project code.")
      }
    } catch {
      setError("Cannot connect to server.")
    }
    setLoading(false)
  }

  async function handleLogin() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("http://127.0.0.1:8000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_code: companyCode,
          project_code: projectCode,
          username: username,
          password: password
        })
      })
      const data = await res.json()
      if (data.success) {
        setUser({ username: data.username, role: data.role })
      } else {
        setError(data.message)
      }
    } catch {
      setError("Cannot connect to server.")
    }
    setLoading(false)
  }

  if (user) {
    return <Dashboard user={user} onLogout={() => setUser(null)} />
  }

  const inputStyle = {
    width: "100%",
    padding: "12px",
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#f8fafc",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box"
  }

  const labelStyle = {
    color: "#94a3b8",
    fontSize: "13px",
    display: "block",
    marginBottom: "6px"
  }

  const buttonStyle = {
    width: "100%",
    padding: "14px",
    background: loading ? "#1e40af" : "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: "700",
    cursor: loading ? "not-allowed" : "pointer",
    letterSpacing: "1px",
    textTransform: "uppercase"
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f172a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Segoe UI, sans-serif"
    }}>
      <div style={{
        background: "#1e293b",
        padding: "48px",
        borderRadius: "16px",
        width: "100%",
        maxWidth: "420px",
        boxShadow: "0 25px 50px rgba(0,0,0,0.5)"
      }}>

        {/* SITE AI Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            fontSize: "32px",
            fontWeight: "800",
            color: "#f8fafc",
            letterSpacing: "4px"
          }}>
            SITE <span style={{ color: "#3b82f6" }}>AI</span>
          </div>
          <div style={{
            color: "#475569",
            fontSize: "11px",
            marginTop: "6px",
            letterSpacing: "3px"
          }}>
            CONSTRUCTION INTELLIGENCE
          </div>
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <>
            <div style={{
              color: "#64748b",
              fontSize: "12px",
              textAlign: "center",
              marginBottom: "24px",
              letterSpacing: "1px"
            }}>
              Enter Project Credentials
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Company Code</label>
              <input
                type="text"
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value)}
                placeholder="e.g. SHAPOORJI"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={labelStyle}>Project Code</label>
              <input
                type="text"
                value={projectCode}
                onChange={(e) => setProjectCode(e.target.value)}
                placeholder="e.g. DMS-149063-3-F-M&N"
                style={inputStyle}
              />
            </div>

            {error && (
              <div style={{
                color: "#f87171",
                fontSize: "13px",
                marginBottom: "16px",
                textAlign: "center"
              }}>
                {error}
              </div>
            )}

            <button onClick={handleCodeSubmit} style={buttonStyle} disabled={loading}>
              {loading ? "Checking..." : "Continue →"}
            </button>
          </>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <>
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <div style={{
                display: "inline-block",
                background: "#ffffff",
                borderRadius: "12px",
                padding: "10px 20px"
              }}>
                <img
                  src="/sp-logo.png"
                  alt="Shapoorji Pallonji"
                  style={{ height: "56px", objectFit: "contain", display: "block" }}
                />
              </div>
            </div>

            <div style={{ textAlign: "center", marginBottom: "4px" }}>
              <div style={{ color: "#f1f5f9", fontSize: "15px", fontWeight: "700" }}>
                Shapoorji Pallonji Middle East LLC
              </div>
            </div>

            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div style={{
                color: "#38bdf8",
                fontSize: "12px",
                fontWeight: "600",
                letterSpacing: "0.8px",
                textTransform: "uppercase"
              }}>
                The Palm Jebel Ali — Frond M & N
              </div>
            </div>

            <div style={{ borderTop: "1px solid #334155", marginBottom: "24px" }} />

            <div style={{
              color: "#64748b",
              fontSize: "12px",
              textAlign: "center",
              marginBottom: "24px",
              letterSpacing: "1px"
            }}>
              Enter User Credentials
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={inputStyle}
              />
            </div>

            {error && (
              <div style={{
                color: "#f87171",
                fontSize: "13px",
                marginBottom: "16px",
                textAlign: "center"
              }}>
                {error}
              </div>
            )}

            <button onClick={handleLogin} style={buttonStyle} disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <div
              onClick={() => { setStep(1); setError("") }}
              style={{
                textAlign: "center",
                marginTop: "16px",
                color: "#475569",
                fontSize: "12px",
                cursor: "pointer"
              }}
            >
              ← Back to project selection
            </div>
          </>
        )}

        <div style={{
          textAlign: "center",
          marginTop: "28px",
          color: "#1e3a5f",
          fontSize: "11px"
        }}>
          SITE AI © 2026 — All rights reserved
        </div>

      </div>
    </div>
  )
}