import { useState, useEffect } from 'react';

const steps = [
  { id: 1, label: 'Fetching product data' },
  { id: 2, label: 'Analyzing reviews' },
  { id: 3, label: 'Comparing prices' },
  { id: 4, label: 'Finding YouTube reviews' }
];

export default function LoadingState() {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stepDurations = [2000, 3000, 2000, 1500];
    let elapsed = 0;
    const totalDuration = stepDurations.reduce((a, b) => a + b, 0);

    const timers = stepDurations.map((duration, index) => {
      const timer = setTimeout(() => {
        setCurrentStep(index + 1);
      }, elapsed + duration);
      elapsed += duration;
      return timer;
    });

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return 95;
        return prev + 1;
      });
    }, totalDuration / 95);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(progressInterval);
    };
  }, []);

  const getStepClass = (stepIndex) => {
    if (stepIndex < currentStep) return 'loading-step step-done';
    if (stepIndex === currentStep) return 'loading-step step-active';
    return 'loading-step step-pending';
  };

  const getStepDot = (stepIndex) => {
    if (stepIndex < currentStep) return '✓';
    if (stepIndex === currentStep) return '●';
    return '○';
  };

  return (
    <div className="loading-page">
      <h2 className="loading-title">Analyzing product...</h2>
      <div className="loading-steps">
        {steps.map((step, index) => (
          <div key={step.id} className={getStepClass(index)}>
            <span className="dot">{getStepDot(index)}</span>
            <span className="step-label">{step.label}</span>
          </div>
        ))}
      </div>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
