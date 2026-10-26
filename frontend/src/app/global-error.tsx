"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 text-center font-sans">
        <div className="h-16 w-16 rounded-full bg-red-950/60 text-red-400 flex items-center justify-center mb-6 border border-red-800">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Application Error</h1>
        <p className="text-sm text-gray-400 max-w-md mb-6">
          An unexpected error occurred. Click below to reload.
        </p>
        <button
          onClick={() => {
            try {
              window.location.reload();
            } catch {
              reset();
            }
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Reload Application
        </button>
      </body>
    </html>
  );
}
