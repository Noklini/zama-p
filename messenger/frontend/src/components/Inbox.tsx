import { Message } from "../hooks/useMessenger";

interface InboxProps {
  messages: Message[];
  onRefresh: () => void;
  isLoading: boolean;
}

export function Inbox({ messages, onRefresh, isLoading }: InboxProps) {
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleString();
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Inbox</h2>
        <button onClick={onRefresh} style={styles.refreshButton} disabled={isLoading}>
          {isLoading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {messages.length === 0 ? (
        <div style={styles.empty}>
          <p>No messages yet</p>
          <p style={styles.emptyHint}>
            Messages you receive will appear here. Click refresh to check for new messages.
          </p>
        </div>
      ) : (
        <div style={styles.messageList}>
          {messages.map((msg, index) => (
            <div key={index} style={styles.message}>
              <div style={styles.messageHeader}>
                <span style={styles.sender}>From: {formatAddress(msg.sender)}</span>
                <span style={styles.timestamp}>{formatTime(msg.timestamp)}</span>
              </div>
              <div style={styles.content}>
                {msg.encrypted ? (
                  <span style={styles.encrypted}>[Unable to decrypt]</span>
                ) : (
                  msg.content
                )}
              </div>
              {msg.encrypted && (
                <span style={styles.encryptedBadge}>Encrypted</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: "#1a1a1a",
    borderRadius: "12px",
    padding: "24px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  title: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#fafafa",
  },
  refreshButton: {
    background: "#333",
    color: "#fafafa",
    border: "none",
    borderRadius: "6px",
    padding: "8px 16px",
    fontSize: "14px",
    cursor: "pointer",
  },
  empty: {
    textAlign: "center",
    padding: "40px 20px",
    color: "#666",
  },
  emptyHint: {
    fontSize: "14px",
    marginTop: "8px",
    color: "#555",
  },
  messageList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  message: {
    background: "#0a0a0a",
    borderRadius: "8px",
    padding: "16px",
    position: "relative",
  },
  messageHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "8px",
  },
  sender: {
    fontSize: "12px",
    color: "#7c3aed",
    fontFamily: "monospace",
  },
  timestamp: {
    fontSize: "12px",
    color: "#666",
  },
  content: {
    fontSize: "14px",
    color: "#fafafa",
    wordBreak: "break-word",
  },
  encrypted: {
    color: "#666",
    fontStyle: "italic",
  },
  encryptedBadge: {
    position: "absolute",
    top: "8px",
    right: "8px",
    background: "#333",
    color: "#888",
    fontSize: "10px",
    padding: "2px 6px",
    borderRadius: "4px",
  },
};
