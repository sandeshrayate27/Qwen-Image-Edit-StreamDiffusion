import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'system-ui, sans-serif',
  },
  header: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  tabs: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
  },
  tab: {
    padding: '10px 20px',
    border: 'none',
    cursor: 'pointer',
    borderRadius: '5px',
  },
  activeTab: {
    backgroundColor: '#007bff',
    color: 'white',
  },
  inactiveTab: {
    backgroundColor: '#e0e0e0',
    color: '#333',
  },
  content: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
  },
  panel: {
    flex: 1,
    minWidth: '300px',
  },
  imageContainer: {
    border: '2px dashed #ccc',
    borderRadius: '10px',
    padding: '10px',
    minHeight: '300px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
  },
  image: {
    maxWidth: '100%',
    maxHeight: '400px',
    borderRadius: '5px',
  },
  controls: {
    marginTop: '15px',
  },
  input: {
    width: '100%',
    padding: '10px',
    marginBottom: '10px',
    borderRadius: '5px',
    border: '1px solid #ccc',
    boxSizing: 'border-box',
  },
  button: {
    padding: '12px 24px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    marginRight: '10px',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
  },
  status: {
    marginTop: '10px',
    padding: '10px',
    backgroundColor: '#f0f0f0',
    borderRadius: '5px',
  },
  slider: {
    width: '100%',
    marginBottom: '10px',
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    fontWeight: 'bold',
  },
};

function App() {
  const [activeTab, setActiveTab] = useState('webcam');
  const [prompt, setPrompt] = useState('Transform into oil painting style');
  const [steps, setSteps] = useState(4);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [result, setResult] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [refImage, setRefImage] = useState(null);
  const [blendRatio, setBlendRatio] = useState(0.5);

  const webcamRef = useRef(null);
  const fileInputRef = useRef(null);
  const refInputRef = useRef(null);

  const captureWebcam = useCallback(() => {
    if (webcamRef.current) {
      return webcamRef.current.getScreenshot();
    }
    return null;
  }, []);

  const processImage = async (imageData, refImageData = null) => {
    setProcessing(true);
    setStatus('Processing...');

    try {
      const response = await fetch(`${API_URL}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData,
          prompt,
          steps,
          ref_image: refImageData,
          blend_ratio: blendRatio,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Processing failed');
      }

      const data = await response.json();
      setResult(`data:image/jpeg;base64,${data.image}`);
      setStatus(`Done in ${data.elapsed.toFixed(2)}s`);
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleWebcamCapture = () => {
    const image = captureWebcam();
    if (image) {
      processImage(image);
    }
  };

  const handleFileUpload = (e, setImage) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadProcess = () => {
    if (uploadedImage) {
      processImage(uploadedImage);
    }
  };

  const handleCompositeProcess = () => {
    if (uploadedImage) {
      processImage(uploadedImage, refImage);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Qwen Image Edit</h1>
        <p>Real-time image editing with AI (14-28x faster)</p>
      </div>

      <div style={styles.tabs}>
        {['webcam', 'upload', 'composite'].map((tab) => (
          <button
            key={tab}
            style={{
              ...styles.tab,
              ...(activeTab === tab ? styles.activeTab : styles.inactiveTab),
            }}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'webcam' ? 'Webcam' : tab === 'upload' ? 'Upload' : 'Composite'}
          </button>
        ))}
      </div>

      <div style={styles.controls}>
        <label style={styles.label}>Prompt</label>
        <input
          style={styles.input}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter edit prompt..."
        />

        <label style={styles.label}>Steps: {steps}</label>
        <input
          type="range"
          min="2"
          max="8"
          value={steps}
          onChange={(e) => setSteps(parseInt(e.target.value))}
          style={styles.slider}
        />
      </div>

      <div style={styles.content}>
        <div style={styles.panel}>
          <h3>Input</h3>

          {activeTab === 'webcam' && (
            <>
              <div style={styles.imageContainer}>
                <Webcam
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  style={{ maxWidth: '100%', borderRadius: '5px' }}
                />
              </div>
              <div style={{ marginTop: '10px' }}>
                <button
                  style={{
                    ...styles.button,
                    ...(processing ? styles.buttonDisabled : {}),
                  }}
                  onClick={handleWebcamCapture}
                  disabled={processing}
                >
                  Capture & Process
                </button>
              </div>
            </>
          )}

          {activeTab === 'upload' && (
            <>
              <div
                style={styles.imageContainer}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadedImage ? (
                  <img src={uploadedImage} alt="Uploaded" style={styles.image} />
                ) : (
                  <span>Click to upload image</span>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFileUpload(e, setUploadedImage)}
                accept="image/*"
                style={{ display: 'none' }}
              />
              <div style={{ marginTop: '10px' }}>
                <button
                  style={{
                    ...styles.button,
                    ...(processing || !uploadedImage ? styles.buttonDisabled : {}),
                  }}
                  onClick={handleUploadProcess}
                  disabled={processing || !uploadedImage}
                >
                  Process
                </button>
              </div>
            </>
          )}

          {activeTab === 'composite' && (
            <>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <p>Source Image</p>
                  <div
                    style={{ ...styles.imageContainer, minHeight: '150px' }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadedImage ? (
                      <img src={uploadedImage} alt="Source" style={styles.image} />
                    ) : (
                      <span>Click to upload</span>
                    )}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <p>Reference Image</p>
                  <div
                    style={{ ...styles.imageContainer, minHeight: '150px' }}
                    onClick={() => refInputRef.current?.click()}
                  >
                    {refImage ? (
                      <img src={refImage} alt="Reference" style={styles.image} />
                    ) : (
                      <span>Click to upload</span>
                    )}
                  </div>
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFileUpload(e, setUploadedImage)}
                accept="image/*"
                style={{ display: 'none' }}
              />
              <input
                type="file"
                ref={refInputRef}
                onChange={(e) => handleFileUpload(e, setRefImage)}
                accept="image/*"
                style={{ display: 'none' }}
              />
              <div style={{ marginTop: '10px' }}>
                <label style={styles.label}>Blend Ratio: {blendRatio}</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={blendRatio}
                  onChange={(e) => setBlendRatio(parseFloat(e.target.value))}
                  style={styles.slider}
                />
                <button
                  style={{
                    ...styles.button,
                    ...(processing || !uploadedImage ? styles.buttonDisabled : {}),
                  }}
                  onClick={handleCompositeProcess}
                  disabled={processing || !uploadedImage}
                >
                  Process Composite
                </button>
              </div>
            </>
          )}
        </div>

        <div style={styles.panel}>
          <h3>Output</h3>
          <div style={styles.imageContainer}>
            {result ? (
              <img src={result} alt="Result" style={styles.image} />
            ) : (
              <span>Result will appear here</span>
            )}
          </div>
          <div style={styles.status}>{status}</div>
        </div>
      </div>
    </div>
  );
}

export default App;
