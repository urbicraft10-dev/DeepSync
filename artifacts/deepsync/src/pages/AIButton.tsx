import React from 'react';
import { analyzeGeotechnicalRisk, Reading } from './aiEngine';

interface Props {
  data: Reading[];
  projectType: 'TUNNEL' | 'ROAD' | 'BRIDGE' | 'MINE' | 'BUILDING' | 'RAILWAY';
}

export const AIButton: React.FC<Props> = ({ data, projectType }) => {
  const handleClick = () => {
    const result = analyzeGeotechnicalRisk(data, projectType);
    alert(`AI Analysis: ${result.probability} Risk. Recommendation: ${result.recommendation}`);
  };

  return (
    <button onClick={handleClick} style={{ background: "#FF4500", color: "white", padding: "10px", borderRadius: "5px" }}>
      تحليل ذكي (AI)
    </button>
  );
};