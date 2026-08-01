export function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  return Math.floor(diff / 86400) + "d ago";
}

export function Spinner() {
  return <span className="spinner" />;
}

export function ErrorBox({ message }) {
  if (!message) return null;
  return <div className="error-box">{message}</div>;
}

export function RoleBadge({ role, isVerified }) {
  return (
    <>
      <span className="badge badge-role">{role}</span>
      {isVerified && <span className="badge badge-verified">✓ verified</span>}
    </>
  );
}
