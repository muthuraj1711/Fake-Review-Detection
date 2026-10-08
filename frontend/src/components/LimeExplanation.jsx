function LimeExplanation({ items = [] }) {
  if (!items || items.length === 0) {
    return (
      <div className="empty-explanation">
        No word-level explanation available.
      </div>
    );
  }

  return (
    <div className="lime-list">
      {items.map((item, index) => {
        const word =
          typeof item === "string"
            ? item
            : item?.word ||
              item?.feature ||
              item?.text ||
              `Feature ${index + 1}`;

        const rawWeight =
          typeof item === "number"
            ? item
            : item?.weight ??
              item?.score ??
              item?.value ??
              0;

        const weight = Number(rawWeight) || 0;
        const positive = weight >= 0;

        const barWidth = Math.min(
          100,
          Math.abs(weight) * 100
        );

        return (
          <div
            className={`lime-item ${
              positive ? "positive" : "negative"
            }`}
            key={`${word}-${index}`}
          >
            <div className="lime-word">
              {word}
            </div>

            <div className="lime-bar-container">
              <div
                className="lime-bar"
                style={{
                  width: `${barWidth}%`,
                }}
              />
            </div>

            <strong>
              {weight > 0 ? "+" : ""}
              {weight.toFixed(3)}
            </strong>
          </div>
        );
      })}
    </div>
  );
}

export default LimeExplanation;
