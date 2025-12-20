'use client';

import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { Play, Pause, SkipBack, SkipForward, Volume2, List, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function PersistentPlayer() {
    const {
        isPlaying,
        currentBook,
        currentChapter,
        audioUrl,
        playbackSpeed,
        showLyrics,
        togglePlay,
        setPlaybackSpeed,
        toggleLyrics,
        audioRef
    } = useAudioPlayer();

    const router = useRouter();
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        // Throttled time update to reduce re-renders (update max once per second)
        let lastTimeUpdate = 0;
        const updateTime = () => {
            const now = Date.now();
            if (now - lastTimeUpdate > 1000) {
                setCurrentTime(audio.currentTime);
                lastTimeUpdate = now;
            }
        };

        const updateDuration = () => {
            if (!isNaN(audio.duration) && audio.duration !== Infinity) {
                setDuration(audio.duration);
            }
        };

        const handleError = (e: Event) => {
            console.error('[Audio Error]', audio.error?.message || e);
        };

        // Sync src if changed - setting src automatically triggers load
        if (audioUrl && audio.src !== audioUrl) {
            audio.src = audioUrl;
        }

        // Initial check
        if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
            setDuration(audio.duration);
        }

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('durationchange', updateDuration);
        audio.addEventListener('error', handleError);

        // Handle playback
        if (isPlaying && audio.paused && audio.src) {
            audio.play().catch(() => { }); // Silently handle autoplay restrictions
        } else if (!isPlaying && !audio.paused) {
            audio.pause();
        }

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
            audio.removeEventListener('durationchange', updateDuration);
            audio.removeEventListener('error', handleError);
        };
    }, [audioRef, audioUrl, isPlaying]);

    if (!currentBook || !audioUrl) return null;

    const formatTime = (time: number) => {
        if (!time || isNaN(time) || time === Infinity) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = parseFloat(e.target.value);
        setCurrentTime(newTime);
        if (audioRef.current) {
            audioRef.current.currentTime = newTime;
        }
    };

    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

    return (
        <>
            <audio ref={audioRef} src={audioUrl} preload="auto" className="hidden" />

            <div className="fixed bottom-0 left-0 right-0 bg-[#16162a] border-t border-[#2d2d44] z-50">
                <div className="px-4 py-3">
                    {/* Progress Bar */}
                    <div className="mb-3">
                        <input
                            type="range"
                            min="0"
                            max={duration || 0}
                            value={currentTime}
                            onChange={handleSeek}
                            aria-label="Audio progress"
                            title="Seek audio position"
                            className="w-full h-1 bg-[#2d2d44] rounded-lg appearance-none cursor-pointer progress-slider"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration || 0)}</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        {/* Book Info */}
                        <div
                            className="flex items-center gap-4 flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => router.push(`/books/${currentBook.id}`)}
                        >
                            <div className="w-14 h-14 bg-gradient-to-br from-[#1a1a2e] to-[#2d2d44] rounded-lg flex items-center justify-center overflow-hidden">
                                {currentBook.cover_path ? (
                                    <img
                                        src={`http://localhost:8000/${currentBook.cover_path}`}
                                        alt={currentBook.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-2xl">📖</span>
                                )}
                            </div>
                            <div>
                                <h4 className="font-semibold text-white">{currentBook.title}</h4>
                                <p className="text-sm text-gray-400">
                                    Chapter {currentChapter?.position}: {currentChapter?.title}
                                </p>
                            </div>
                        </div>

                        {/* Playback Controls */}
                        <div className="flex items-center gap-4">
                            <button className="p-2 hover:bg-[#1a1a2e] rounded-lg transition-all" title="Previous" aria-label="Previous track">
                                <SkipBack size={20} className="text-gray-400" />
                            </button>

                            <button
                                onClick={togglePlay}
                                className="p-3 bg-green-500 hover:bg-green-600 rounded-full transition-all"
                                title={isPlaying ? 'Pause' : 'Play'}
                                aria-label={isPlaying ? 'Pause' : 'Play'}
                            >
                                {isPlaying ? (
                                    <Pause size={24} className="text-white" />
                                ) : (
                                    <Play size={24} className="text-white ml-0.5" />
                                )}
                            </button>

                            <button className="p-2 hover:bg-[#1a1a2e] rounded-lg transition-all" title="Next" aria-label="Next track">
                                <SkipForward size={20} className="text-gray-400" />
                            </button>
                        </div>

                        {/* Right Controls */}
                        <div className="flex items-center gap-3 flex-1 justify-end">
                            {/* Speed Control */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                                    className="px-3 py-1.5 bg-[#1a1a2e] hover:bg-[#2d2d44] rounded-lg text-sm font-semibold transition-all"
                                >
                                    {playbackSpeed}x
                                </button>

                                {showSpeedMenu && (
                                    <div className="absolute bottom-full mb-2 right-0 bg-[#16162a] border border-[#2d2d44] rounded-lg shadow-xl overflow-hidden">
                                        {speeds.map((speed) => (
                                            <button
                                                key={speed}
                                                onClick={() => {
                                                    setPlaybackSpeed(speed);
                                                    setShowSpeedMenu(false);
                                                }}
                                                className={`block w-full px-4 py-2 text-left hover:bg-[#1a1a2e] transition-all ${speed === playbackSpeed ? 'bg-green-500/20 text-green-400' : 'text-white'
                                                    }`}
                                            >
                                                {speed}x
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Lyrics Toggle */}
                            <button
                                onClick={toggleLyrics}
                                className={`p-2 rounded-lg transition-all ${showLyrics ? 'bg-green-500/20 text-green-400' : 'hover:bg-[#1a1a2e] text-gray-400'
                                    }`}
                            >
                                <List size={20} />
                            </button>

                            {/* Volume */}
                            <button className="p-2 hover:bg-[#1a1a2e] rounded-lg transition-all" title="Volume" aria-label="Volume">
                                <Volume2 size={20} className="text-gray-400" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Lyrics Panel */}
                {showLyrics && (
                    <div className="border-t border-[#2d2d44] bg-[#0d0d1a] p-6 max-h-64 overflow-y-auto">
                        <div className="max-w-3xl mx-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold">Text Display</h3>
                                <button
                                    onClick={toggleLyrics}
                                    className="p-1 hover:bg-[#1a1a2e] rounded-lg transition-all"
                                    title="Close lyrics"
                                    aria-label="Close lyrics panel"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="text-gray-400 text-sm leading-relaxed">
                                <p className="mb-4">
                                    Text synchronization will be implemented here...
                                </p>
                                <p className="text-gray-600 italic">
                                    This feature will display the current text being narrated with automatic scrolling.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
