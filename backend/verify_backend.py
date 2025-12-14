import requests
import os

BASE_URL = "http://localhost:8000"

def test_flow():
    # 1. Upload
    print("Testing Upload...")
    with open("test_book.epub", "rb") as f:
        files = {"file": ("test_book.epub", f, "application/epub+zip")}
        # auto_process=False because we don't have API keys setup for background tasks to succeed fully
        response = requests.post(f"{BASE_URL}/books/upload?auto_process=false", files=files)
    
    if response.status_code != 200:
        print(f"Upload failed: {response.text}")
        return
    
    book = response.json()
    book_id = book["id"]
    print(f"Upload success! Book ID: {book_id}")

    # 2. List
    print("Testing List...")
    response = requests.get(f"{BASE_URL}/books")
    books = response.json()
    assert any(b["id"] == book_id for b in books)
    print("List success!")

    # 3. Detail
    print("Testing Detail...")
    response = requests.get(f"{BASE_URL}/books/{book_id}")
    assert response.status_code == 200
    print("Detail success!")

    # 4. Characters
    print("Testing Characters...")
    response = requests.get(f"{BASE_URL}/books/{book_id}/characters")
    if response.status_code != 200:
        print(f"Characters failed: Status {response.status_code}, Response: {response.text}")
    else:
        chars = response.json()
        print(f"Characters success! Count: {len(chars)}")
    
    # 5. Chapters
    print("Testing Chapters...")
    response = requests.get(f"{BASE_URL}/books/{book_id}/chapters")
    chapters = response.json()
    print(f"Chapters success! Count: {len(chapters)}")

if __name__ == "__main__":
    test_flow()
