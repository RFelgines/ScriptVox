import { useState, useEffect } from 'react';
import { X, User, Mic, Play, RefreshCw, CheckCircle } from 'lucide-react';

interface Character {
    id: number;
    name: string;
    gender: string;
    description: string;
    assigned_voice_id: string | null;
}

interface Voice {
    ShortName: string;
    Gender: string;
    Locale: string;
}

interface CastingModalProps {
    bookId: number;
    isOpen: boolean;
    onClose: () => void;
}

export default function CastingModal({ bookId, isOpen, onClose }: CastingModalProps) {
    const [characters, setCharacters] = useState<Character[]>([]);
    const [voices, setVoices] = useState<Voice[]>([]);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);

    const [selectedLocale, setSelectedLocale] = useState<string>('fr-FR');

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen, bookId]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch characters
            const charRes = await fetch(`http://localhost:8000/books/${bookId}/characters`);
            const charData = await charRes.json();
            setCharacters(charData);

            // Fetch available voices
            const voiceRes = await fetch(`http://localhost:8000/voices`);
            const voiceData = await voiceRes.json();
            setVoices(voiceData.voices);
        } catch (error) {
            console.error("Error loading casting data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAnalyze = async () => {
        setAnalyzing(true);
        try {
            await fetch(`http://localhost:8000/generation/analyze/${bookId}`, { method: 'POST' });
            // Poll for results or just wait a bit? For now, let's just reload after a delay
            // In a real app, we'd use websockets or polling.
            setTimeout(loadData, 5000);
        } catch (error) {
            console.error("Error starting analysis:", error);
            setAnalyzing(false);
        }
    };

    const handleVoiceChange = async (characterId: number, voiceId: string) => {
        // Optimistic update
        setCharacters(chars => chars.map(c =>
            c.id === characterId ? { ...c, assigned_voice_id: voiceId } : c
        ));

        try {
            await fetch(`http://localhost:8000/characters/${characterId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assigned_voice_id: voiceId })
            });
        } catch (error) {
            console.error("Error updating voice:", error);
            // Revert on error would be better here
        }
    };

    // Get unique locales from voices
    const uniqueLocales = Array.from(new Set(voices.map(v => v.Locale))).sort();

    // Filter voices by selected locale
    const filteredVoices = voices.filter(v => v.Locale === selectedLocale);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <User className="text-green-500" />
                            Character Casting
                        </h2>
                        <p className="text-sm text-gray-400">Assign voices to characters found in the book</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" title="Close" aria-label="Close casting modal">
                        <X size={24} />
                    </button>
                </div>

                {/* Language Filter */}
                <div className="px-6 py-3 bg-gray-800/30 border-b border-gray-800 flex items-center gap-3">
                    <span className="text-sm text-gray-400">Voice Language:</span>
                    <select
                        value={selectedLocale}
                        onChange={(e) => setSelectedLocale(e.target.value)}
                        className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block p-2"
                        title="Select Voice Language"
                    >
                        {uniqueLocales.map(locale => (
                            <option key={locale} value={locale}>{locale}</option>
                        ))}
                    </select>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                        </div>
                    ) : characters.length === 0 ? (
                        <div className="text-center py-12">
                            <User className="mx-auto h-12 w-12 text-gray-600 mb-4" />
                            <h3 className="text-lg font-medium text-gray-300 mb-2">No characters found yet</h3>
                            <p className="text-gray-500 mb-6">Run analysis to detect characters from the text.</p>
                            <button
                                onClick={handleAnalyze}
                                disabled={analyzing}
                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {analyzing ? (
                                    <>
                                        <RefreshCw className="animate-spin" size={18} />
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <Play size={18} />
                                        Detect Characters
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {characters.map((char) => (
                                <div key={char.id} className="bg-gray-800/50 rounded-xl p-4 flex items-center justify-between border border-gray-700/50 hover:border-gray-600 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${char.name === 'Narrator' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                                            }`}>
                                            <User size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-medium text-white">{char.name}</h4>
                                                {char.assigned_voice_id && (
                                                    <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full flex items-center gap-1">
                                                        <CheckCircle size={10} />
                                                        Auto
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1">
                                                <p className="text-xs text-gray-400">
                                                    {char.gender || 'Unknown'} • {(char as any).age_category || 'Adult'}
                                                </p>
                                                {(char as any).tone && (
                                                    <span className="text-xs px-1.5 py-0.5 bg-blue-500/10 text-blue-300 rounded">
                                                        {(char as any).tone}
                                                    </span>
                                                )}
                                                {(char as any).voice_quality && (
                                                    <span className="text-xs px-1.5 py-0.5 bg-purple-500/10 text-purple-300 rounded">
                                                        {(char as any).voice_quality}
                                                    </span>
                                                )}
                                            </div>
                                            {char.description && (
                                                <p className="text-xs text-gray-500 mt-1">{char.description.slice(0, 60)}...</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <select
                                                value={char.assigned_voice_id || ""}
                                                onChange={(e) => handleVoiceChange(char.id, e.target.value)}
                                                aria-label={`Select voice for ${char.name}`}
                                                title={`Select voice for ${char.name}`}
                                                className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-48 p-2.5 appearance-none cursor-pointer hover:bg-gray-800 transition-colors"
                                            >
                                                <option value="">Auto-assign</option>
                                                {filteredVoices.map(voice => (
                                                    <option key={voice.ShortName} value={voice.ShortName}>
                                                        {voice.ShortName.split('-').pop()?.replace('Neural', '')} ({voice.Gender})
                                                    </option>
                                                ))}
                                            </select>
                                            <Mic className="absolute right-3 top-3 text-gray-500 pointer-events-none" size={14} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-800 bg-gray-900/50 rounded-b-2xl flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-white text-black px-6 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
