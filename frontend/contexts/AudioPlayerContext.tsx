'use client';

import { createContext, useContext, useState, useRef, ReactNode } from 'react';

interface AudioPlayerContextType {
    isPlaying: boolean;
    currentBook: { id: number; title: string; author: string; cover_path: string | null } | null;
    currentChapter: { id: number; title: string; position: number } | null;
    audioUrl: string | null;
    playbackSpeed: number;
    showLyrics: boolean;
    play: (book: { id: number; title: string; author: string; cover_path: string | null }, chapter: { id: number; title: string; position: number }, url: string) => void;
    pause: () => void;
    togglePlay: () => void;
    setPlaybackSpeed: (speed: number) => void;
    toggleLyrics: () => void;
    audioRef: React.RefObject<HTMLAudioElement | null>;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentBook, setCurrentBook] = useState<{ id: number; title: string; author: string; cover_path: string | null } | null>(null);
    const [currentChapter, setCurrentChapter] = useState<{ id: number; title: string; position: number } | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [playbackSpeed, setPlaybackSpeedState] = useState(1.0);
    const [showLyrics, setShowLyrics] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const play = (
        book: { id: number; title: string; author: string; cover_path: string | null },
        chapter: { id: number; title: string; position: number },
        url: string
    ) => {
        setCurrentBook(book);
        setCurrentChapter(chapter);
        setAudioUrl(url);
        setIsPlaying(true);
    };

    const pause = () => {
        setIsPlaying(false);
        audioRef.current?.pause();
    };

    const togglePlay = () => {
        if (isPlaying) {
            pause();
        } else if (audioRef.current) {
            audioRef.current.play();
            setIsPlaying(true);
        }
    };

    const setPlaybackSpeed = (speed: number) => {
        setPlaybackSpeedState(speed);
        if (audioRef.current) {
            audioRef.current.playbackRate = speed;
        }
    };

    const toggleLyrics = () => {
        setShowLyrics(!showLyrics);
    };

    return (
        <AudioPlayerContext.Provider
            value={{
                isPlaying,
                currentBook,
                currentChapter,
                audioUrl,
                playbackSpeed,
                showLyrics,
                play,
                pause,
                togglePlay,
                setPlaybackSpeed,
                toggleLyrics,
                audioRef,
            }}
        >
            {children}
        </AudioPlayerContext.Provider>
    );
}

export function useAudioPlayer() {
    const context = useContext(AudioPlayerContext);
    if (!context) {
        throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
    }
    return context;
}
