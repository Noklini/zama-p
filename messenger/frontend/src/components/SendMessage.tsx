import { useState, FormEvent } from "react";

interface SendMessageProps {
  onSend: (recipient: string, message: string) => Promise<boolean>;
  isLoading: boolean;
}

export function SendMessage({ onSend, isLoading }: SendMessageProps) {
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSuccess(false);

    if (!recipient || !message) return;

    const result = await onSend(recipient, message);
    if (result) {
      setMessage("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Send Private Message</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>Recipient Address</label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x..."
            style={styles.input}
            disabled={isLoading}
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Message (max 32 chars)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 32))}
            placeholder="Your encrypted message..."
            style={styles.textarea}
            disabled={isLoading}
            maxLength={32}
          />
          <span style={styles.charCount}>{message.length}/32</span>
        </div>
        <button type="submit" style={styles.button} disabled={isLoading || !recipient || !message}>
          {isLoading ? "Encrypting & Sending..." : "Send Encrypted Message"}
        </button>
        {success && <p style={styles.success}>Message sent successfully!</p>}
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: "#1a1a1a",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "24px",
  },
  title: {
    fontSize: "18px",
    fontWeight: "600",
    marginBottom: "16px",
    color: "#fafafa",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    position: "relative",
  },
  label: {
    fontSize: "14px",
    color: "#888",
  },
  input: {
    background: "#0a0a0a",
    border: "1px solid #333",
    borderRadius: "8px",
    padding: "12px",
    color: "#fafafa",
    fontSize: "14px",
    fontFamily: "monospace",
  },
  textarea: {
    background: "#0a0a0a",
    border: "1px solid #333",
    borderRadius: "8px",
    padding: "12px",
    color: "#fafafa",
    fontSize: "14px",
    minHeight: "80px",
    resize: "vertical",
  },
  charCount: {
    position: "absolute",
    right: "8px",
    bottom: "8px",
    fontSize: "12px",
    color: "#666",
  },
  button: {
    background: "#7c3aed",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "14px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.2s",
  },
  success: {
    color: "#22c55e",
    fontSize: "14px",
    textAlign: "center",
  },
};
