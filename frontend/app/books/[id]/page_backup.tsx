'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, CheckCircle, Settings } from 'lucide-react';

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const router = useRouter();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/books/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const book = await response.json();
        router.push(`/books/${book.id}`);
      } else {
        alert('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center p-8 bg-[#0d0d1a]">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">
            Transform EPUBs into{' '}
            <span className="bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
              Audiobooks
            </span>
          </h1>
          <p className="text-gray-400 text-lg">
            AI-powered multi-voice narration with professional quality
          </p>
        </div>

        <div
          className={`border-2 border-dashed rounded-2xl p-12 transition-all bg-[#16162a]/50 ${dragActive
            ? 'border-green-500 bg-green-500/5'
            : 'border-[#2d2d44]'
            }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="text-center">
            {!file ? (
              <>
                <div className="w-16 h-16 bg-[#1a1a2e] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="text-gray-400" size={32} />
                </div>
                <h3 className="text-xl font-semibold mb-2">Drop your EPUB here</h3>
                <p className="text-gray-500 mb-6">or click to browse</p>
                <input
                  type="file"
                  accept=".epub"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-block bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-lg cursor-pointer transition-all"
                >
                  Choose File
                </label>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="text-green-400" size={32} />
                </div>
                <h3 className="text-xl font-semibold mb-2">{file.name}</h3>
                <p className="text-gray-500 mb-6">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <div className="flex gap-3 justify-center items-center">
                  <button
                    onClick={() => setFile(null)}
                    className="px-6 py-3 bg-[#1a1a2e] hover:bg-[#2d2d44] rounded-lg font-semibold transition-all"
                  >
                    Remove
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="px-6 py-3 bg-green-500 hover:bg-green-600 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={20} />
                        Upload & Process
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="p-3 bg-[#1a1a2e] hover:bg-[#2d2d44] rounded-lg transition-all"
                    title="Upload Settings"
                  >
                    <Settings size={20} className="text-gray-400" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSettings(false)}>
            <div className="bg-[#16162a] rounded-2xl p-8 max-w-md w-full border border-[#2d2d44]" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-2xl font-bold mb-6">Upload Settings</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Voice Model</label>
                  <select className="w-full bg-[#1a1a2e] border border-[#2d2d44] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors">
                    <option>EdgeTTS (Cloud)</option>
                    <option>XTTS (Local - Coming Soon)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Language Detection</label>
                  <select className="w-full bg-[#1a1a2e] border border-[#2d2d44] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors">
                    <option>Auto-detect</option>
                    <option>French</option>
                    <option>English</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3 text-gray-300">
                    Voice Expressivity
                    <span className="ml-2 text-xs text-gray-500">(XTTS only)</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    defaultValue="50"
                    className="w-full h-2 bg-[#2d2d44] rounded-lg appearance-none cursor-pointer accent-green-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Neutral</span>
                    <span>Expressive</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Controls emotional intensity in voice generation (requires XTTS)
                  </p>
                </div>

                <div className="flex items-center gap-3 p-3 bg-[#1a1a2e] rounded-lg">
                  <input
                    type="checkbox"
                    id="multi-voice"
                    className="w-4 h-4 rounded accent-green-500"
                    defaultChecked
                  />
                  <label htmlFor="multi-voice" className="text-sm text-gray-300 cursor-pointer">
                    Enable multi-voice narration
                  </label>
                </div>
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="w-full mt-6 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-lg transition-all"
              >
                Save Settings
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="bg-[#16162a]/50 rounded-lg p-4 border border-[#2d2d44]">
            <div className="text-2xl font-bold text-green-400 mb-1">AI</div>
            <div className="text-xs text-gray-500">Powered</div>
          </div>
          <div className="bg-[#16162a]/50 rounded-lg p-4 border border-[#2d2d44]">
            <div className="text-2xl font-bold text-blue-400 mb-1">Multi</div>
            <div className="text-xs text-gray-500">Voice</div>
          </div>
          <div className="bg-[#16162a]/50 rounded-lg p-4 border border-[#2d2d44]">
            <div className="text-2xl font-bold text-purple-400 mb-1">Pro</div>
            <div className="text-xs text-gray-500">Quality</div>
          </div>
        </div>
      </div>
    </div>
  );
}
