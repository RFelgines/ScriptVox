'use client';
import { useState, useEffect } from 'react';
import { Settings, Cloud, Server, Loader2, Check, AlertCircle } from 'lucide-react';

interface AppSettings {
    app_mode: string;
    gemini_api_key_set: boolean;
}

export default function SettingsPage() {
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const res = await fetch('http://localhost:8000/settings');
            const data = await res.json();
            setSettings(data);
        } catch (error) {
            console.error('Failed to load settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = async () => {
        if (!settings) return;

        const newMode = settings.app_mode === 'CLOUD' ? 'LOCAL' : 'CLOUD';
        setSaving(true);
        setMessage(null);

        try {
            const res = await fetch('http://localhost:8000/settings/mode', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ app_mode: newMode })
            });

            const data = await res.json();
            setSettings({ ...settings, app_mode: newMode });
            setMessage({ type: 'success', text: data.message });
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to update mode' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#0d0d1a]">
                <Loader2 className="animate-spin text-green-500" size={48} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0d0d1a] p-8">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                    <Settings className="text-green-500" size={32} />
                    <h1 className="text-3xl font-bold">Settings</h1>
                </div>

                {/* Mode Toggle Card */}
                <div className="bg-[#16162a]/50 border border-[#2d2d44] rounded-2xl p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Processing Mode</h2>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {settings?.app_mode === 'CLOUD' ? (
                                <div className="p-3 bg-blue-500/20 rounded-xl">
                                    <Cloud className="text-blue-400" size={24} />
                                </div>
                            ) : (
                                <div className="p-3 bg-purple-500/20 rounded-xl">
                                    <Server className="text-purple-400" size={24} />
                                </div>
                            )}
                            <div>
                                <p className="font-medium text-lg">
                                    {settings?.app_mode === 'CLOUD' ? 'Cloud Mode' : 'Local Mode'}
                                </p>
                                <p className="text-sm text-gray-400">
                                    {settings?.app_mode === 'CLOUD'
                                        ? 'Using EdgeTTS + Gemini API'
                                        : 'Using XTTS + Ollama (Local)'}
                                </p>
                            </div>
                        </div>

                        {/* Toggle Button */}
                        <button
                            onClick={toggleMode}
                            disabled={saving}
                            aria-label={`Switch to ${settings?.app_mode === 'CLOUD' ? 'Local' : 'Cloud'} mode`}
                            title={`Switch to ${settings?.app_mode === 'CLOUD' ? 'Local' : 'Cloud'} mode`}
                            className={`relative w-16 h-8 rounded-full transition-colors ${settings?.app_mode === 'CLOUD'
                                ? 'bg-blue-600'
                                : 'bg-purple-600'
                                } ${saving ? 'opacity-50' : ''}`}
                        >
                            <div
                                className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${settings?.app_mode === 'CLOUD' ? 'left-1' : 'left-9'
                                    }`}
                            />
                        </button>
                    </div>

                    {message && (
                        <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${message.type === 'success'
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                            {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
                            <span className="text-sm">{message.text}</span>
                        </div>
                    )}
                </div>

                {/* API Key Status */}
                <div className="bg-[#16162a]/50 border border-[#2d2d44] rounded-2xl p-6">
                    <h2 className="text-xl font-semibold mb-4">API Configuration</h2>

                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${settings?.gemini_api_key_set ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                        <span className="text-gray-300">
                            Gemini API Key: {settings?.gemini_api_key_set ? 'Configured' : 'Not Set'}
                        </span>
                    </div>

                    {!settings?.gemini_api_key_set && (
                        <p className="mt-3 text-sm text-gray-500">
                            Add GEMINI_API_KEY to your .env file for character detection to work.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
