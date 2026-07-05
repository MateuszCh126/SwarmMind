import React from 'react';
import { diffLines, diffStats } from '../utils/diff';
import './DiffView.css';

interface DiffViewProps {
  original: string;
  modified: string;
}

export const DiffView: React.FC<DiffViewProps> = ({ original, modified }) => {
  const lines = diffLines(original || '', modified || '');
  const { added, removed } = diffStats(lines);

  return (
    <div className="diff-view">
      <div className="diff-stats">
        <span className="diff-added">+{added}</span>
        <span className="diff-removed">-{removed}</span>
        <span className="diff-legend">oryginał → zrefaktoryzowany</span>
      </div>
      <pre className="diff-body">
        {lines.map((l, i) => (
          <div key={i} className={`diff-line ${l.type}`}>
            <span className="diff-gutter">{l.type === 'add' ? '+' : l.type === 'del' ? '-' : ' '}</span>
            <span className="diff-text">{l.text || ' '}</span>
          </div>
        ))}
      </pre>
    </div>
  );
};
export default DiffView;
