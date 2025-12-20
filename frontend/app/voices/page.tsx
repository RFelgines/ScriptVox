'use client';

import { Mic2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function VoicesPage() {
    return (
        <div className="p-8 bg-[#0d0d1a] min-h-screen text-white">
            <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
                <ArrowLeft size={20} />
                Back to Home
            </Link>

            <div className="max-w-4xl mx-auto text-center pt-20">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-500/10 text-purple-400 mb-6 border border-purple-500/20">
                    <Mic2 size={40} />
                </div>
                <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                    Voice Studio
                </h1>
                <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
                    Advanced voice cloning and management features are coming soon. You'll be able to create custom voices, adjust emotions, and fine-tune speaking styles.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mt-12">
                    <div className="bg-[#16162a] p-6 rounded-xl border border-[#2d2d44]">
                        <h3 className="text-lg font-semibold mb-2 text-purple-400">Voice Cloning</h3>
                        <p className="text-gray-400 text-sm">Clone your own voice or create unique character voices from short audio samples.</p>
                    </div>
                    <div className="bg-[#16162a] p-6 rounded-xl border border-[#2d2d44]">
                        <h3 className="text-lg font-semibold mb-2 text-pink-400">Emotion Control</h3>
                        <p className="text-gray-400 text-sm">Direct the performance with granular control over emotion, pitch, and speed.</p>
                    </div>
                    <div className="bg-[#16162a] p-6 rounded-xl border border-[#2d2d44]">
                        <h3 className="text-lg font-semibold mb-2 text-blue-400">Multi-Speaker</h3>
                        <p className="text-gray-400 text-sm">Assign different voices to different characters for a fully immersive experience.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
