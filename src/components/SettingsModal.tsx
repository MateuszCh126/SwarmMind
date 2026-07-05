import React, { useState } from 'react';
import { useSwarmStore } from '../store/useSwarmStore';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const settings = useSwarmStore((state) => state.settings);
  const setSettings = useSwarmStore((state) => state.setSettings);
  
  const [geminiKey, setGeminiKey] = useState(settings.geminiKey);
  const [openaiKey, setOpenaiKey] = useState(settings.openaiKey);
  const [anthropicKey, setAnthropicKey] = useState(settings.anthropicKey);
  const [preferProvider, setPreferProvider] = useState(settings.preferProvider);

  if (!isOpen) return null;

  const handleSave = () => {
    setSettings({
      geminiKey,
      openaiKey,
      anthropicKey,
      preferProvider
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel animated-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Ustawienia API</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="security-notice">
            <span className="notice-icon">🛡️</span>
            <span className="notice-text">
              <strong>Bezpieczeństwo kluczy:</strong> Klucze są zapisywane lokalnie w <code>localStorage</code> Twojej przeglądarki. Nigdy nie opuszczają Twojego komputera, poza bezpośrednimi zapytaniami do serwerów API Google, OpenAI i Anthropic.
            </span>
          </div>

          <div className="settings-section">
            <label className="section-label">Wybór Dostawcy AI</label>
            <div className="provider-selector">
              <button 
                type="button"
                className={`provider-tab ${preferProvider === 'gemini' ? 'active' : ''}`}
                onClick={() => setPreferProvider('gemini')}
              >
                Google Gemini
              </button>
              <button 
                type="button"
                className={`provider-tab ${preferProvider === 'openai' ? 'active' : ''}`}
                onClick={() => setPreferProvider('openai')}
              >
                OpenAI GPT
              </button>
              <button 
                type="button"
                className={`provider-tab ${preferProvider === 'anthropic' ? 'active' : ''}`}
                onClick={() => setPreferProvider('anthropic')}
              >
                Anthropic Claude
              </button>
            </div>
          </div>

          <div className="settings-section">
            <label htmlFor="gemini-key">Google Gemini API Key</label>
            <input 
              id="gemini-key"
              type="password" 
              placeholder="Wklej klucz API (gemini-2.5-flash)..."
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
            />
          </div>

          <div className="settings-section">
            <label htmlFor="openai-key">OpenAI API Key</label>
            <input 
              id="openai-key"
              type="password" 
              placeholder="Wklej klucz API (gpt-4o-mini)..."
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
            />
          </div>

          <div className="settings-section">
            <label htmlFor="anthropic-key">Anthropic Claude API Key</label>
            <input 
              id="anthropic-key"
              type="password" 
              placeholder="Wklej klucz API (claude-3-5-sonnet-latest)..."
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>Anuluj</button>
          <button type="button" className="btn-primary" onClick={handleSave}>Zapisz ustawienia</button>
        </div>
      </div>
    </div>
  );
};
export default SettingsModal;
