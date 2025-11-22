import { useMessenger } from "./hooks/useMessenger";
import { SendMessage } from "./components/SendMessage";
import { Inbox } from "./components/Inbox";

function App() {
  const {
    isConnected,
    isLoading,
    error,
    userAddress,
    inbox,
    connect,
    disconnect,
    sendMessage,
    refreshInbox,
    decryptInboxMessage,
    decryptAllInbox,
  } = useMessenger();

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.title}>Private Messenger</h1>
        <p style={styles.subtitle}>End-to-end encrypted messaging on Zama FHEVM</p>
      </header>

      <main style={styles.main}>
        {!isConnected ? (
          <div style={styles.connectContainer}>
            <div style={styles.connectCard}>
              <h2 style={styles.connectTitle}>Connect Your Wallet</h2>
              <p style={styles.connectDesc}>
                Connect your wallet to send and receive encrypted messages on Sepolia testnet.
              </p>
              <button onClick={connect} style={styles.connectButton} disabled={isLoading}>
                {isLoading ? "Connecting..." : "Connect Wallet"}
              </button>
              {error && <p style={styles.error}>{error}</p>}
            </div>
          </div>
        ) : (
          <div style={styles.content}>
            <div style={styles.userBar}>
              <span style={styles.userAddress}>
                Connected: {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
              </span>
              <button onClick={disconnect} style={styles.disconnectButton}>
                Disconnect
              </button>
            </div>

            {error && <div style={styles.errorBanner}>{error}</div>}

            <SendMessage onSend={sendMessage} isLoading={isLoading} />
            <Inbox
              messages={inbox}
              onRefresh={refreshInbox}
              onDecrypt={decryptInboxMessage}
              onDecryptAll={decryptAllInbox}
              isLoading={isLoading}
            />
          </div>
        )}
      </main>

      <footer style={styles.footer}>
        <p>Powered by Zama FHEVM - Fully Homomorphic Encryption</p>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    textAlign: "center",
    padding: "40px 20px",
    borderBottom: "1px solid #222",
  },
  title: {
    fontSize: "32px",
    fontWeight: "700",
    color: "#fafafa",
    marginBottom: "8px",
  },
  subtitle: {
    fontSize: "16px",
    color: "#888",
  },
  main: {
    flex: 1,
    maxWidth: "600px",
    width: "100%",
    margin: "0 auto",
    padding: "24px",
  },
  connectContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "400px",
  },
  connectCard: {
    background: "#1a1a1a",
    borderRadius: "16px",
    padding: "40px",
    textAlign: "center",
    maxWidth: "400px",
  },
  connectTitle: {
    fontSize: "24px",
    fontWeight: "600",
    color: "#fafafa",
    marginBottom: "12px",
  },
  connectDesc: {
    fontSize: "14px",
    color: "#888",
    marginBottom: "24px",
    lineHeight: 1.6,
  },
  connectButton: {
    background: "#7c3aed",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "14px 32px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    width: "100%",
  },
  error: {
    color: "#ef4444",
    fontSize: "14px",
    marginTop: "16px",
  },
  content: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  userBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#1a1a1a",
    borderRadius: "8px",
    padding: "12px 16px",
    marginBottom: "8px",
  },
  userAddress: {
    fontSize: "14px",
    color: "#888",
    fontFamily: "monospace",
  },
  disconnectButton: {
    background: "transparent",
    color: "#888",
    border: "1px solid #333",
    borderRadius: "6px",
    padding: "6px 12px",
    fontSize: "12px",
    cursor: "pointer",
  },
  errorBanner: {
    background: "#7f1d1d",
    color: "#fecaca",
    padding: "12px 16px",
    borderRadius: "8px",
    fontSize: "14px",
  },
  footer: {
    textAlign: "center",
    padding: "24px",
    borderTop: "1px solid #222",
    color: "#666",
    fontSize: "14px",
  },
};

export default App;
