'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Mic, Play, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

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

export default function CastingPage() {
    const params = useParams();
    const router = useRouter();
    const bookId = params.id as string;
    const { showToast, ToastContainer } = useToast();

    const [characters, setCharacters] = useState<Character[]>([]);
    const [voices, setVoices] = useState<Voice[]>([]);
    const [loading, setLoading] = useState(true);
    const [startingGeneration, setStartingGeneration] = useState(false);

    const [selectedLocale, setSelectedLocale] = useState<string>('fr-FR');

    useEffect(() => {
        loadData();
    }, [bookId]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Poll for characters until they appear (analysis might take a moment)
            let retries = 0;
            const maxRetries = 10; // 20 seconds max wait for initial load if analysis is running

            const fetchChars = async () => {
                const charRes = await fetch(`http://localhost:8000/books/${bookId}/characters`);
                const charData = await charRes.json();
                return charData;
            };

            let charData = await fetchChars();

            // If no characters yet, maybe analysis is still running. 
            // In a real app we'd check book status. For now, let's just load what we have.

            setCharacters(charData);

            // Fetch available voices
            const voiceRes = await fetch(`http://localhost:8000/voices`);
            const voiceData = await voiceRes.json();
            setVoices(voiceData.voices);
        } catch (error) {
            console.error("Error loading casting data:", error);
            showToast("Failed to load data", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleVoiceChange = async (characterId: number, voiceId: string) => {
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
            showToast("Failed to save voice selection", "error");
        }
    };

    const handleStartGeneration = async () => {
        setStartingGeneration(true);
        try {
            // Fetch chapters to generate them all
            const chaptersRes = await fetch(`http://localhost:8000/books/${bookId}/chapters`);
            const chapters = await chaptersRes.json();

            // Trigger generation for all chapters
            // In a real app, we'd have a single "generate book" endpoint, but we can loop here for now
            // or use the batch generation logic we added to the detail page.
            // Actually, let's just redirect to the detail page and let the user click "Generate All" 
            // OR trigger it here. Let's trigger it here for "One Click" feel.

            for (const chapter of chapters) {
                await fetch(`http://localhost:8000/generation/generate/${chapter.id}`, {
                    method: 'POST',
                });
                // Small delay to avoid hammering
                await new Promise(r => setTimeout(r, 100));
            }

            showToast("Generation started!", "success");
            setTimeout(() => {
                router.push(`/books/${bookId}`);
            }, 1500);

        } catch (error) {
            console.error("Error starting generation:", error);
            showToast("Failed to start generation", "error");
            setStartingGeneration(false);
        }
    };

    // Get unique locales from voices
    const uniqueLocales = Array.from(new Set(voices.map(v => v.Locale))).sort();

    // Filter voices by selected locale
    const filteredVoices = voices.filter(v => v.Locale === selectedLocale);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#0d0d1a]">
                <Loader2 className="animate-spin text-green-500" size={48} />
                <p className="ml-4 text-gray-400">Loading characters...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0d0d1a] p-8">
            <ToastContainer />
            <div className="max-w-4xl mx-auto">
                <Link href={`/books/${bookId}`} className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors">
                    <ArrowLeft size={20} />
                    Back to Book
                </Link>

                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Character Casting</h1>
                        <p className="text-gray-400">Assign voices to the characters detected in your book.</p>
                    </div>
                    <button
                        onClick={handleStartGeneration}
                        disabled={startingGeneration}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold text-lg transition-all shadow-lg shadow-green-900/20"
                    >
                        {startingGeneration ? (
                            <>
                                <Loader2 className="animate-spin" size={24} />
                                Starting...
                            </>
                        ) : (
                            <>
                                <Play size={24} fill="currentColor" />
                                Start Generation
                            </>
                        )}
                    </button>
                </div>

                <div className="bg-[#16162a]/50 border border-[#2d2d44] rounded-2xl overflow-hidden">
                    {/* Language Filter */}
                    <div className="px-6 py-4 border-b border-[#2d2d44] bg-[#1a1a2e]/50 flex items-center gap-4">
                        <span className="text-gray-400 font-medium">Filter Voices by Language:</span>
                        <select
                            value={selectedLocale}
                            onChange={(e) => setSelectedLocale(e.target.value)}
                            className="bg-[#0d0d1a] border border-[#2d2d44] text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block p-2.5 min-w-[200px]"
                            title="Select Voice Language"
                        >
                            {uniqueLocales.map(locale => (
                                <option key={locale} value={locale}>{locale}</option>
                            ))}
                        </select>
                    </div>

                    {characters.length === 0 ? (
                        <div className="text-center py-16">
                            <User className="mx-auto h-16 w-16 text-gray-700 mb-4" />
                            <h3 className="text-xl font-medium text-gray-300 mb-2">No characters found</h3>
                            <p className="text-gray-500">
                                The analysis might still be running or no dialogue was detected.
                                <br />
                                <button onClick={loadData} className="text-green-400 hover:underline mt-2">Refresh</button>
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-[#2d2d44]">
                            {characters.map((char) => (
                                <div key={char.id} className="p-6 flex items-center justify-between hover:bg-[#1a1a2e] transition-colors">
                                    <div className="flex items-center gap-6">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${char.name === 'Narrator' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                                            }`}>
                                            {char.name[0]}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                                {char.name}
                                                {char.assigned_voice_id && <CheckCircle size={14} className="text-green-500" />}
                                            </h3>
                                            <div className="flex items-center gap-3 mt-1">
                                                <p className="text-sm text-gray-400">
                                                    {char.gender} • {(char as any).age_category || 'Adult'}
                                                </p>
                                                {(char as any).tone && (
                                                    <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-300 rounded">
                                                        {(char as any).tone}
                                                    </span>
                                                )}
                                                {(char as any).voice_quality && (
                                                    <span className="text-xs px-2 py-0.5 bg-purple-500/10 text-purple-300 rounded">
                                                        {(char as any).voice_quality}
                                                    </span>
                                                )}
                                            </div>
                                            {char.description && (
                                                <p className="text-xs text-gray-500 mt-1">{char.description.slice(0, 80)}...</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="relative group">
                                            <select
                                                value={char.assigned_voice_id || ""}
                                                onChange={(e) => handleVoiceChange(char.id, e.target.value)}
                                                className="bg-[#0d0d1a] border border-[#2d2d44] text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-64 p-3 pr-10 appearance-none cursor-pointer hover:border-gray-500 transition-colors"
                                                title={`Select voice for ${char.name}`}
                                            >
                                                <option value="">Auto-assign (Default)</option>
                                                {filteredVoices.map(voice => (
                                                    <option key={voice.ShortName} value={voice.ShortName}>
                                                        {voice.ShortName.split('-').pop()?.replace('Neural', '')} ({voice.Gender}) - {voice.Locale}
                                                    </option>
                                                ))}
                                            </select>
                                            <Mic className="absolute right-3 top-3.5 text-gray-500 pointer-events-none group-hover:text-green-500 transition-colors" size={16} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
