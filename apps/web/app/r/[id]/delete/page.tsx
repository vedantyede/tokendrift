import { DeleteButton } from './delete-button';

export default async function DeleteReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  return (
    <main
      style={{
        maxWidth: 480,
        margin: '96px auto',
        padding: '0 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        fontFamily: 'var(--font-body)',
        color: 'var(--ink)',
      }}
    >
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, margin: 0 }}>
        Delete this report?
      </h1>
      <p style={{ color: 'var(--ink-soft)', lineHeight: 1.6, margin: 0 }}>
        This permanently removes the hosted report at <code>/r/{id}</code>. Anyone with the link
        will get a &ldquo;not found&rdquo; page afterward. This can&rsquo;t be undone.
      </p>
      <DeleteButton id={id} token={token ?? ''} />
    </main>
  );
}
