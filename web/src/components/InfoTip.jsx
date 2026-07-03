import { Info } from 'lucide-react';

export default function InfoTip({ text }) {
  return (
    <span className="info-tip">
      <Info size={12} />
      <span className="info-tip-bubble">{text}</span>
    </span>
  );
}
