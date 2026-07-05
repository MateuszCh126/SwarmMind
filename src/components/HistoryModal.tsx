import React from 'react';
import { loadHistory, clearHistory } from '../utils/runHistory';
import type { RunRecord } from '../utils/runHistory';
import { exportSwarmResult } from '../utils/exportResult';
import './HistoryModal.css';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose }) => {
  const [records, setRecords] = React.useState<RunRecord[]>([]);

  React.useEffect(() => {
    if (isOpen) setRecords(loadHistory());
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClear = () => {
    clearHistory();
    setRecords([]);
  };

  const handleDownload = (r: RunRecord) => exportSwarmResult({
    goal: r.goal,
    inputCode: r.inputCode,
    blueprint: r.blueprint,
    code: r.code,
    tests: r.tests,
    testResults: r.testResults,
    reviewerFeedback: r.reviewerFeedback,
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel animated-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Historia przebiegów</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {records.length === 0 ? (
            <p className="history-empty">Brak zapisanych przebiegów. Uruchom rój, aby zapełnić historię.</p>
          ) : (
            <div className="history-list">
              {records.map((r) => (
                <div key={r.id} className={`history-row ${r.outcome}`}>
                  <div className="history-main">
                    <span className={`history-badge ${r.outcome}`}>{r.outcome === 'success' ? 'Sukces' : 'Błąd'}</span>
                    <span className="history-goal" title={r.goal}>{r.goal || '(bez celu)'}</span>
                  </div>
                  <div className="history-meta">
                    <span>{r.timestamp}</span>
                    <span>· {r.provider}</span>
                    <span>· iter. {r.iterations}</span>
                  </div>
                  <button className="history-download" onClick={() => handleDownload(r)}>Pobierz .md</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={handleClear} disabled={records.length === 0}>Wyczyść historię</button>
          <button type="button" className="btn-primary" onClick={onClose}>Zamknij</button>
        </div>
      </div>
    </div>
  );
};
export default HistoryModal;
