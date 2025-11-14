import { useState } from 'react';

function DuplicateDialog({ duplicateInfo, onMerge, onOverwrite, onIgnore, onClose }) {
  const [processing, setProcessing] = useState(false);

  const handleMerge = async () => {
    setProcessing(true);
    try {
      await onMerge();
    } finally {
      setProcessing(false);
    }
  };

  const handleOverwrite = async () => {
    setProcessing(true);
    try {
      await onOverwrite();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="duplicate-overlay">
      <div className="duplicate-modal">
        <div className="duplicate-header">
          <h2>⚠️ Duplicate US Record Detected</h2>
        </div>

        <div className="duplicate-body">
          <div className="warning-box">
            <p><strong>A US record with these identifiers already exists:</strong></p>
            <ul>
              <li><strong>Site:</strong> {duplicateInfo.sito}</li>
              <li><strong>Area:</strong> {duplicateInfo.area}</li>
              <li><strong>US:</strong> {duplicateInfo.us}</li>
              <li><strong>Unit Type:</strong> {duplicateInfo.unita_tipo}</li>
            </ul>
          </div>

          <p className="instruction">How would you like to proceed?</p>

          <div className="options-list">
            <div className="option-card">
              <div className="option-icon">🔀</div>
              <div className="option-content">
                <h3>Merge</h3>
                <p>Add new data to the existing record without removing existing fields. Recommended for adding additional information.</p>
              </div>
              <button
                onClick={handleMerge}
                disabled={processing}
                className="btn btn-merge"
              >
                {processing ? 'Processing...' : 'Merge Data'}
              </button>
            </div>

            <div className="option-card">
              <div className="option-icon">♻️</div>
              <div className="option-content">
                <h3>Overwrite</h3>
                <p>Replace the existing record completely with the new data. Use this if the existing data is incorrect.</p>
              </div>
              <button
                onClick={handleOverwrite}
                disabled={processing}
                className="btn btn-overwrite"
              >
                {processing ? 'Processing...' : 'Overwrite Record'}
              </button>
            </div>

            <div className="option-card">
              <div className="option-icon">✖️</div>
              <div className="option-content">
                <h3>Ignore</h3>
                <p>Cancel this operation and don't save anything. The audio note will remain in your list.</p>
              </div>
              <button
                onClick={() => {
                  onIgnore();
                  onClose();
                }}
                disabled={processing}
                className="btn btn-ignore"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .duplicate-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 3000;
          padding: 20px;
        }

        .duplicate-modal {
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 700px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.4);
        }

        .duplicate-header {
          padding: 20px;
          border-bottom: 3px solid #ff9800;
          background: #fff3e0;
        }

        .duplicate-header h2 {
          margin: 0;
          font-size: 1.5rem;
          color: #e65100;
        }

        .duplicate-body {
          padding: 20px;
        }

        .warning-box {
          background: #fff3cd;
          border: 2px solid #ffc107;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 20px;
        }

        .warning-box p {
          margin: 0 0 10px 0;
          font-weight: 600;
          color: #856404;
        }

        .warning-box ul {
          margin: 10px 0 0 20px;
          color: #856404;
        }

        .warning-box li {
          margin: 5px 0;
        }

        .instruction {
          font-size: 1.1rem;
          font-weight: 600;
          margin: 20px 0 15px 0;
          color: #333;
        }

        .options-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .option-card {
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          padding: 15px;
          display: flex;
          align-items: center;
          gap: 15px;
          transition: border-color 0.2s;
        }

        .option-card:hover {
          border-color: #2196f3;
        }

        .option-icon {
          font-size: 2rem;
          flex-shrink: 0;
        }

        .option-content {
          flex: 1;
        }

        .option-content h3 {
          margin: 0 0 5px 0;
          font-size: 1.1rem;
          color: #333;
        }

        .option-content p {
          margin: 0;
          font-size: 0.9rem;
          color: #666;
          line-height: 1.4;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-merge {
          background: #4CAF50;
          color: white;
        }

        .btn-merge:hover:not(:disabled) {
          background: #388E3C;
        }

        .btn-overwrite {
          background: #ff9800;
          color: white;
        }

        .btn-overwrite:hover:not(:disabled) {
          background: #f57c00;
        }

        .btn-ignore {
          background: #9e9e9e;
          color: white;
        }

        .btn-ignore:hover:not(:disabled) {
          background: #757575;
        }

        @media (max-width: 600px) {
          .option-card {
            flex-direction: column;
            text-align: center;
          }

          .btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default DuplicateDialog;
