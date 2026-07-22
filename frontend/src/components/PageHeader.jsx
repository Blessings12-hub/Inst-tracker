export default function PageHeader({ eyebrow, title, description }) {
  return (
    <header className="page-header">
      {eyebrow && <div className="page-eyebrow">{eyebrow}</div>}
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </header>
  );
}
