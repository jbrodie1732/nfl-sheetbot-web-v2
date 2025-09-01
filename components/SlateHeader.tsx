
// components/SlateHeader.tsx (v4 - lighter text + matching divider shade)
'use client';
import { PropsWithChildren } from 'react';

export default function SlateHeader({ children }: PropsWithChildren<{}>){
  return (
    <div className="slate-hdr">
      <div className="label">{children}</div>
      <div className="rule" role="presentation" aria-hidden="true" />
      <style jsx>{`
        .slate-hdr { margin: 18px 0 10px; }
        .label {
          font-size: 16px;
          line-height: 24px;
          font-weight: 800;
          letter-spacing: 0.02em;
          color: #4b5563; /* gray-600 */
          margin-bottom: 6px;
        }
        .rule {
          height: 1px;
          width: 100%;
          background: rgba(75,85,99,.35); /* same hue as text, softened */
        }
      `}</style>
    </div>
  );
}
