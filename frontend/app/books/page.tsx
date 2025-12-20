'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Clock, CheckCircle, Trash2 } from 'lucide-react';
import CoverProgress from '@/components/CoverProgress';

interface Book {
    id: number;
    title: string;
    author: string;
    status: string;
    cover_path: string | null;
}

export default function BooksPage() {
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchBooks = () => {
        fetch('http://localhost:8000/books')
            .then((res) => res.json())
            .then((data) => {
                setBooks(data);
                setLoading(false);
            })
            .catch((error) => {
                console.error('Error fetching books:', error);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchBooks();
    }, []);

    const deleteBook = async (bookId: number) => {
        console.log('DELETE FUNCTION CALLED FOR BOOK:', bookId);

        try {
            console.log('Making DELETE request...');
            const res = await fetch(`http://localhost:8000/books/${bookId}`, {
                method: 'DELETE'
            });

            console.log('DELETE response status:', res.status);
            if (res.ok) {
                setBooks(books.filter(b => b.id !== bookId));
                console.log('Book deleted successfully');
            } else {
                console.error('Delete failed with status:', res.status);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'READY':
                return <CheckCircle className="text-green-400" size={16} />;
            case 'PROCESSING':
                return <Clock className="text-yellow-400" size={16} />;
            default:
                return <BookOpen className="text-gray-400" size={16} />;
        }
    };

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">My Library</h1>
                <p className="text-gray-400">Manage your audiobook collection</p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : books.length === 0 ? (
                <div className="text-center py-16 bg-gray-900/50 rounded-2xl border border-gray-800">
                    <BookOpen className="mx-auto mb-4 text-gray-600" size={48} />
                    <h3 className="text-xl font-semibold mb-2">No books yet</h3>
                    <p className="text-gray-500 mb-6">Upload your first EPUB to get started</p>
                    <Link
                        href="/"
                        className="inline-block bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-all"
                    >
                        Upload Book
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {books.map((book) => (
                        <div key={book.id} className="group">
                            <Link
                                href={`/books/${book.id}`}
                                className="bg-gray-900/50 rounded-xl border border-gray-800 hover:border-green-500/50 transition-all overflow-hidden block"
                            >
                                <div className="aspect-[2/3] bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center overflow-hidden relative">
                                    <CoverProgress
                                        src={book.cover_path}
                                        alt={book.title}
                                        progress={0}
                                        isGenerating={book.status === 'PROCESSING'}
                                        className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                                    />
                                </div>
                                <div className="p-4">
                                    <h3 className="font-semibold mb-1 truncate group-hover:text-green-400 transition-colors">
                                        {book.title}
                                    </h3>
                                    <p className="text-sm text-gray-500 mb-3 truncate">{book.author}</p>
                                    <div className="flex items-center gap-2 text-xs">
                                        {getStatusIcon(book.status)}
                                        <span className="text-gray-400">{book.status}</span>
                                    </div>
                                </div>
                            </Link>

                            <button
                                type="button"
                                onClick={() => {
                                    console.log('BUTTON CLICKED');
                                    deleteBook(book.id);
                                }}
                                className="mt-2 w-full p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
                            >
                                <Trash2 size={14} />
                                Delete
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
