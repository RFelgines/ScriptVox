import { Image as ImageIcon } from 'lucide-react';

interface CoverProgressProps {
    src: string | null;
    alt: string;
    progress: number; // 0 to 100
    isGenerating: boolean;
    className?: string;
}

export default function CoverProgress({ src, alt, progress, isGenerating, className = "" }: CoverProgressProps) {
    if (!src) {
        return (
            <div className={`w-full h-full bg-gradient-to-br from-[#1a1a2e] to-[#2d2d44] flex items-center justify-center ${className}`}>
                <ImageIcon className="text-gray-600" size={48} />
            </div>
        );
    }

    const imageUrl = `http://localhost:8000/${src}`;

    return (
        <div className={`relative w-full h-full overflow-hidden bg-[#1a1a2e] ${className}`}>
            {/* Base Layer: Grayscale Image */}
            <img
                src={imageUrl}
                alt={alt}
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${isGenerating ? 'grayscale brightness-50' : ''}`}
            />

            {/* Progress Layer: Color Image (Clipped with clip-path) */}
            {isGenerating && (
                <img
                    src={imageUrl}
                    alt={alt}
                    className="absolute inset-0 w-full h-full object-cover transition-all duration-500 ease-linear"
                    style={{
                        clipPath: `inset(0 ${100 - progress}% 0 0)`
                    }}
                />
            )}

            {/* Progress Text Overlay */}
            {isGenerating && progress > 0 && (
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/60 backdrop-blur-sm text-center">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Generating {Math.round(progress)}%
                    </span>
                </div>
            )}
        </div>
    );
}
