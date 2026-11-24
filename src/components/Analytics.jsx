
import "./Analytics.css";

function Analytics({ applications = [] }) {
  const statuses = [
    "Applied",
    "Assessment",
    "Interview",
    "Selected",
    "Rejected",
  ];

  const total = applications.length;

  const statusCounts = statuses.map((status) => ({
    name: status,
    count: applications.filter(
      (app) => app.status === status
    ).length,
  }));

  const getCount = (status) =>
    statusCounts.find((item) => item.name === status)?.count || 0;

  const selected = getCount("Selected");
  const rejected = getCount("Rejected");
  const interviews = getCount("Interview");

  const active = getCount("Applied") +
    getCount("Assessment") +
    getCount("Interview");

  const successRate =
    total === 0
      ? 0
      : Math.round((selected / total) * 100);

  const colors = {
    Applied: "#4785d1",
    Assessment: "#d99a35",
    Interview: "#269b70",
    Selected: "#269b70",
    Rejected: "#d45b5b",
  };

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <h1>Application Analytics</h1>
        <p>
          Understand your job application progress
          and performance.
        </p>
      </div>

      <div className="analytics-cards">
        <div className="analytics-card">
          <p>Total Applications</p>
          <h2>{total}</h2>
          <span>All job applications</span>
        </div>

        <div className="analytics-card">
          <p>Active Applications</p>
          <h2>{active}</h2>
          <span>Applications in progress</span>
        </div>

        <div className="analytics-card">
          <p>Selected</p>
          <h2>{selected}</h2>
          <span>Offers received</span>
        </div>

        <div className="analytics-card">
          <p>Selection Rate</p>
          <h2>{successRate}%</h2>
          <span>Selected out of total applications</span>
        </div>
      </div>

      <div className="analytics-cards">
        <div className="analytics-card">
          <p>Interviews</p>
          <h2>{interviews}</h2>
          <span>Interview-stage applications</span>
        </div>

        <div className="analytics-card">
          <p>Rejected</p>
          <h2>{rejected}</h2>
          <span>Applications not selected</span>
        </div>
      </div>

      <div className="analytics-chart">
        <h2>Applications by Status</h2>
        <p className="chart-description">
          Distribution of your job applications.
        </p>

        {total === 0 ? (
          <p className="empty-message">
            Add job applications to see your analytics.
          </p>
        ) : (
          <div className="status-chart">
            {statusCounts.map((item) => {
              const percentage = Math.round(
                (item.count / total) * 100
              );

              return (
                <div className="chart-row" key={item.name}>
                  <div className="chart-label">
                    <span>{item.name}</span>
                    <strong>{item.count}</strong>
                  </div>

                  <div className="chart-track">
                    <div
                      className="chart-fill"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: colors[item.name],
                      }}
                    />
                  </div>

                  <span className="chart-percentage">
                    {percentage}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Analytics;
