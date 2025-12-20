'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Library, Settings, Mic2 } from 'lucide-react';

export default function Sidebar() {
    const pathname = usePathname();

    const navItems = [
        { name: 'Home', href: '/', icon: Home },
        { name: 'Library', href: '/books', icon: Library },
        { name: 'Voices', href: '/voices', icon: Mic2 },
        { name: 'Settings', href: '/settings', icon: Settings },
    ];

    return (
        <div className="w-64 bg-[#16162a] border-r border-[#2d2d44] flex flex-col">
            <div className="p-6 border-b border-[#2d2d44]">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                    ScriptVox
                </h1>
                <p className="text-xs text-gray-500 mt-1">AI Audiobook Studio</p>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
                                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                : 'text-gray-400 hover:bg-[#1a1a2e]/50 hover:text-white'
                                }`}
                        >
                            <Icon size={20} />
                            <span className="font-medium">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-[#2d2d44]">
                <div className="bg-[#1a1a2e]/50 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-2">Storage Used</p>
                    <div className="w-full bg-[#2d2d44] rounded-full h-2 mb-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                    </div>
                    <p className="text-xs text-gray-500">4.5 GB / 10 GB</p>
                </div>
            </div>
        </div>
    );
}
