import { getDashboardData } from '@/lib/resolvetip';
import { formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AuditPage() {
  const { auditLogs, creators, transfers } = await getDashboardData();

  return (
    <div className="stack-lg">
      <section className="card">
        <span className="eyebrow">Reward ledger</span>
        <h1>Skill tip audit trail</h1>
        <p>
          Every spotlight nomination, OpenAI review, wallet binding, and Sepolia transfer is persisted in the local
          event store so the product stays demo-friendly and fully inspectable.
        </p>
      </section>

      <section className="grid-two">
        <div className="panel">
          <h2>Audit log</h2>
          <ul className="audit-list">
            {auditLogs.map((log) => (
              <li key={log.id}>
                <div className="audit-head">
                  <strong>{log.action}</strong>
                  <span>{formatDateTime(log.createdAt)}</span>
                </div>
                <p>
                  {log.entityType} · {log.entityId}
                </p>
                <pre>{JSON.stringify(log.details, null, 2)}</pre>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <h2>Transfer ledger</h2>
          <ul className="activity-list">
            {transfers.map((transfer) => {
              const creator = creators.find((candidate) => candidate.id === transfer.recipientCreatorId);
              return (
                <li key={transfer.id}>
                  <strong>{creator?.displayName ?? transfer.recipientCreatorId}</strong>
                  <span>{transfer.status}</span>
                  <p>
                    {transfer.txHash ?? 'Pending claim'} · {transfer.amount.toFixed(1)} USDt
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </div>
  );
}
