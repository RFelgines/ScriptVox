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

  const handleUpload = async (autoProcess: boolean) => {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    // Add auto_process query param
    const url = `http://localhost:8000/books/upload?auto_process=${autoProcess}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const book = await response.json();
        if (autoProcess) {
          router.push(`/books/${book.id}`);
        } else {
          router.push(`/books/${book.id}/casting`);
        }
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
                    onClick={() => handleUpload(true)}
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
                    onClick={() => handleUpload(false)}
                    disabled={uploading}
                    className="p-3 bg-[#1a1a2e] hover:bg-[#2d2d44] rounded-lg transition-all border border-[#2d2d44]"
                    title="Upload & Configure (Casting)"
                  >
                    <Settings size={20} className="text-gray-400" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>



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
