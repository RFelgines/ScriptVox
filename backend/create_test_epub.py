from ebooklib import epub

book = epub.EpubBook()
book.set_identifier('id123456')
book.set_title('Test Book')
book.set_language('en')
book.add_author('Test Author')

# Create chapter
c1 = epub.EpubHtml(title='Intro', file_name='chap_01.xhtml', lang='en')
c1.content = u'<h1>Introduction</h1><p>This is a test book for validation.</p>'
book.add_item(c1)

# Add to book
book.toc = (c1, )
book.spine = ['nav', c1]
book.add_item(epub.EpubNcx())
book.add_item(epub.EpubNav())

# Write
epub.write_epub('test_book.epub', book, {})
print("Created test_book.epub")
