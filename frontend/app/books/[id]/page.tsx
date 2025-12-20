'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Play, Pause, Loader2, Volume2, Zap, RefreshCw, Image as ImageIcon, X, Info, User, Trash2 } from 'lucide-react';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { useToast } from '@/hooks/useToast';
import CastingModal from '@/components/CastingModal';
import CoverProgress from '@/components/CoverProgress';
import { useRouter } from 'next/navigation';

interface Book {
    id: number;
    title: string;
    author: string;
    status: string;
    cover_path: string | null;
}

interface Chapter {
    id: number;
    title: string;
    position: number;
    status: string;
    audio_path: string | null;
    progress?: number;
}

export default function BookDetailPage() {
    const params = useParams();
    const router = useRouter();
    const bookId = params.id as string;

    const [book, setBook] = useState<Book | null>(null);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState<number | null>(null);
    const [batchGenerating, setBatchGenerating] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [showCoverUpload, setShowCoverUpload] = useState(false);
    const [showCasting, setShowCasting] = useState(false);

    const { play, pause, isPlaying, currentBook } = useAudioPlayer();
    const { showToast, ToastContainer } = useToast();

    const fetchData = useCallback(async () => {
        try {
            const [bookData, chaptersData] = await Promise.all([
                fetch(`http://localhost:8000/books/${bookId}`).then((r) => r.json()),
                fetch(`http://localhost:8000/books/${bookId}/chapters`).then((r) => r.json()),
            ]);
            setBook(bookData);
            setChapters(chaptersData);
            setLoading(false);
        } catch (error) {
            console.error('Error:', error);
            setLoading(false);
            showToast('Failed to load book data', 'error');
        }
    }, [bookId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => {
            fetchData();
        }, 5000);
        return () => clearInterval(interval);
    }, [autoRefresh, fetchData]);

    const generateAudio = async (chapterId: number) => {
        setGenerating(chapterId);
        try {
            await fetch(`http://localhost:8000/generation/generate/${chapterId}`, {
                method: 'POST',
            });
            showToast('Generation started', 'success');
            setTimeout(fetchData, 1000);
        } catch (error) {
            console.error('Error:', error);
            showToast('Generation failed', 'error');
        } finally {
            setGenerating(null);
        }
    };

    const cancelGeneration = () => {
        setGenerating(null);
        showToast('Generation cancelled', 'info');
    };

    const generateAllChapters = async () => {
        setBatchGenerating(true);
        try {
            for (const chapter of chapters) {
                if (chapter.status !== 'COMPLETED') {
                    await fetch(`http://localhost:8000/generation/generate/${chapter.id}`, {
                        method: 'POST',
                    });
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            showToast('Batch generation started!', 'success');
            fetchData();
        } catch (error) {
            console.error('Error:', error);
            showToast('Batch generation failed', 'error');
        } finally {
            setBatchGenerating(false);
        }
    };

    const completedChapters = chapters.filter(c => c.status.toUpperCase() === 'COMPLETED' && c.audio_path);
    const progressPercentage = chapters.length > 0 ? (completedChapters.length / chapters.length) * 100 : 0;

    const toggleGlobalPlay = () => {
        if (completedChapters.length === 0) {
            showToast('No audio available yet. Generate chapters first!', 'info');
            return;
        }

        const isCurrentBookPlaying = currentBook?.id === parseInt(bookId) && isPlaying;

        if (isCurrentBookPlaying) {
            pause();
        } else {
            const firstCompleted = completedChapters[0];
            if (book && firstCompleted.audio_path) {
                play(
                    { id: book.id, title: book.title, author: book.author, cover_path: book.cover_path },
                    { id: firstCompleted.id, title: firstCompleted.title, position: firstCompleted.position },
                    `http://localhost:8000/${firstCompleted.audio_path}/segment_0000.mp3`
                );
            }
        }
    };

    const playChapter = (chapter: Chapter) => {
        if (!book || !chapter.audio_path) {
            showToast('Audio not available', 'error');
            return;
        }

        play(
            { id: book.id, title: book.title, author: book.author, cover_path: book.cover_path },
            { id: chapter.id, title: chapter.title, position: chapter.position },
            `http://localhost:8000/${chapter.audio_path}/segment_0000.mp3`
        );
        showToast(`Now playing: ${chapter.title}`, 'success');
    };

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`http://localhost:8000/books/${bookId}/cover`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                fetchData();
                setShowCoverUpload(false);
                showToast('Cover uploaded successfully', 'success');
            } else {
                showToast('Cover upload failed', 'error');
            }
        } catch (error) {
            console.error('Cover upload error:', error);
            showToast('Cover upload error', 'error');
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this book? This cannot be undone.')) return;

        try {
            const res = await fetch(`http://localhost:8000/books/${bookId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                showToast('Book deleted successfully', 'success');
                router.push('/books');
            } else {
                showToast('Failed to delete book', 'error');
            }
        } catch (error) {
            console.error('Error deleting book:', error);
            showToast('Error deleting book', 'error');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#0d0d1a]">
                <Loader2 className="animate-spin text-green-500" size={48} />
            </div>
        );
    }

    if (!book) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#0d0d1a]">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Book not found</h2>
                    <Link href="/books" className="text-green-400 hover:underline">
                        Back to Library
                    </Link>
                </div>
            </div>
        );
    }

    const isCurrentBookPlaying = currentBook?.id === book.id && isPlaying;

    return (
        <div className="p-8 bg-[#0d0d1a] min-h-screen">
            <ToastContainer />
            {book && <CastingModal bookId={book.id} isOpen={showCasting} onClose={() => setShowCasting(false)} />}

            <Link href="/books" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
                <ArrowLeft size={20} />
                Back to Library
            </Link>

            <div className="bg-[#16162a]/50 rounded-2xl p-8 mb-8 border border-[#2d2d44]">
                <div className="flex gap-8 mb-6">
                    <div className="relative group">
                        <div className="w-48 h-72 bg-gradient-to-br from-[#1a1a2e] to-[#2d2d44] rounded-xl overflow-hidden relative">
                            <CoverProgress
                                src={book.cover_path}
                                alt={book.title}
                                progress={progressPercentage}
                                isGenerating={progressPercentage > 0 && progressPercentage < 100}
                            />
                        </div>
                        <button onClick={() => setShowCoverUpload(true)} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                            <ImageIcon className="text-white" size={32} />
                            <span className="ml-2 text-white font-semibold">Change Cover</span>
                        </button>
                    </div>

                    <div className="flex-1">
                        <h1 className="text-4xl font-bold mb-2">{book.title}</h1>
                        <p className="text-xl text-gray-400 mb-4">{book.author}</p>
                        <div className="flex items-center gap-3 mb-6">
                            <div className={`px-4 py-2 rounded-lg text-sm font-semibold ${book.status === 'READY' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}`}>
                                {book.status}
                            </div>
                            <div className="text-sm text-gray-500">{chapters.length} chapters</div>
                        </div>

                        <div className="flex gap-3 items-center">
                            <button onClick={toggleGlobalPlay} disabled={completedChapters.length === 0} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-all">
                                {isCurrentBookPlaying ? (<><Pause size={20} />Pause Book</>) : (<><Play size={20} />Play Book</>)}
                            </button>

                            {completedChapters.length > 0 && completedChapters.length < chapters.length && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                    <Info size={16} className="text-blue-400" />
                                    <span className="text-sm text-blue-400">{completedChapters.length}/{chapters.length} ready</span>
                                </div>
                            )}

                            <button
                                onClick={handleDelete}
                                className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-all ml-auto"
                                title="Delete Book"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => setShowCasting(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-[#1a1a2e] text-gray-400 border border-[#2d2d44] hover:text-white hover:border-gray-500 rounded-lg font-semibold transition-all"
                        >
                            <User size={18} />
                            Casting
                        </button>

                        <button onClick={() => setAutoRefresh(!autoRefresh)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${autoRefresh ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-[#1a1a2e] text-gray-400 border border-[#2d2d44]'}`}>
                            <RefreshCw size={18} />
                            Auto-refresh
                        </button>

                        <button onClick={generateAllChapters} disabled={batchGenerating || completedChapters.length === chapters.length} className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-semibold transition-all">
                            {batchGenerating ? (<><Loader2 className="animate-spin" size={18} />Generating...</>) : (<><Zap size={18} />Generate All</>)}
                        </button>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">Progress</span>
                        <span className="text-green-400 font-semibold">{completedChapters.length} / {chapters.length} chapters</span>
                    </div>
                    <div className="w-full bg-[#1a1a2e] rounded-full h-3 overflow-hidden">
                        <div className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
                    </div>
                </div>
            </div>

            {showCoverUpload && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCoverUpload(false)}>
                    <div className="bg-[#16162a] rounded-2xl p-8 max-w-md w-full border border-[#2d2d44]" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-2xl font-bold mb-6">Upload Cover Image</h3>
                        <input type="file" accept="image/*" onChange={handleCoverUpload} aria-label="Choose cover image" title="Choose cover image file" className="w-full bg-[#1a1a2e] border border-[#2d2d44] rounded-lg px-4 py-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-500 file:text-white hover:file:bg-green-600 file:cursor-pointer" />
                        <button onClick={() => setShowCoverUpload(false)} className="w-full mt-4 bg-[#1a1a2e] hover:bg-[#2d2d44] text-white font-semibold py-3 rounded-lg transition-all">Cancel</button>
                    </div>
                </div>
            )}

            <h2 className="text-2xl font-bold mb-6">Chapters</h2>

            <div className="space-y-4">
                {chapters.map((chapter) => {
                    const status = chapter.status.toUpperCase();
                    const isCompleted = status === 'COMPLETED';
                    const isProcessing = status === 'PROCESSING' || generating === chapter.id;
                    const hasAudio = !!chapter.audio_path;

                    return (
                        <div key={chapter.id} className="bg-[#16162a]/50 rounded-xl p-6 border border-[#2d2d44] hover:border-[#3d3d5c] transition-all">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-sm font-mono text-gray-500">#{chapter.position.toString().padStart(2, '0')}</span>
                                        <h3 className="text-lg font-semibold">{chapter.title}</h3>
                                    </div>
                                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${isCompleted ? 'bg-green-500/10 text-green-400' : isProcessing ? 'bg-yellow-500/10 text-yellow-400' : 'bg-gray-700/50 text-gray-400'}`}>
                                        {status}
                                    </div>

                                    {isProcessing && (
                                        <div className="mt-3 w-full max-w-md">
                                            <div className="w-full bg-[#2d2d44] rounded-full h-1.5 mt-2 overflow-hidden">
                                                <div
                                                    className="bg-gradient-to-r from-orange-500 to-red-500 h-full transition-all duration-500 ease-out"
                                                    style={{ width: `${chapter.progress || 0}%` }}
                                                ></div>
                                            </div>
                                            <p className="text-xs text-orange-400 mt-1 text-right">{chapter.progress || 0}%</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2 flex-shrink-0">
                                    {isCompleted && hasAudio ? (
                                        <>
                                            <button onClick={() => playChapter(chapter)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-all shadow-lg shadow-blue-900/20">
                                                <Play size={18} fill="currentColor" />
                                                Play Chapter
                                            </button>
                                            <button onClick={() => generateAudio(chapter.id)} title="Regenerate" className="p-2 bg-[#1a1a2e] hover:bg-[#2d2d44] text-gray-400 hover:text-white rounded-lg transition-all border border-[#2d2d44]">
                                                <RefreshCw size={18} />
                                            </button>
                                        </>
                                    ) : isProcessing ? (
                                        <button onClick={cancelGeneration} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-all">
                                            <Loader2 className="animate-spin" size={18} />
                                            Generating...
                                        </button>
                                    ) : (
                                        <button onClick={() => generateAudio(chapter.id)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-all shadow-lg shadow-green-900/20">
                                            <Volume2 size={18} />
                                            Generate
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
