import os
import sys
import fitz  # PyMuPDF

# Ensure backend is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.pdf_extractor import extract_text_from_pdf_bytes

def create_sample_pdf() -> bytes:
    """Generates an in-memory sample 4-page PDF with structured headings and paragraphs."""
    doc = fitz.open()

    # Page 1: Introduction
    p1 = doc.new_page()
    p1.insert_text(
        (50, 72),
        "1. Introduction to Quantum Computing\n\n"
        "Quantum computing is a rapidly-emerging technology that harnesses the laws of quantum mechanics "
        "to solve problems too complex for classical computers. Classical computers encode information in "
        "binary bits that can either be 0 or 1.\n\n"
        "By contrast, quantum computers leverage quantum bits or qubits. This fundamental difference enables "
        "exponential speedups for specific classes of mathematical and cryptographic algorithms.",
        fontsize=11,
    )

    # Page 2: Qubits & Superposition
    p2 = doc.new_page()
    p2.insert_text(
        (50, 72),
        "2. Qubits and Superposition\n\n"
        "Superposition is the ability of a quantum system to be in multiple states at the same time until it is measured. "
        "A qubit can exist in a linear combination of |0> and |1> states simultaneously.\n\n"
        "When measured, the qubit collapses probabilistically into one of the basis states. "
        "This allows quantum algorithms to evaluate vast computational search spaces in parallel.",
        fontsize=11,
    )

    # Page 3: Quantum Entanglement
    p3 = doc.new_page()
    p3.insert_text(
        (50, 72),
        "3. Quantum Entanglement\n\n"
        "Entanglement is an intrinsically quantum phenomenon where two or more particles become correlated in such a way "
        "that the quantum state of each particle cannot be described independently of the state of the others.\n\n"
        "Even when separated by large distances, measurements on one entangled particle immediately influence the outcome "
        "of measurements on the other. This property is crucial for quantum teleportation and superdense coding.",
        fontsize=11,
    )

    # Page 4: Algorithms & Future Outlook
    p4 = doc.new_page()
    p4.insert_text(
        (50, 72),
        "4. Quantum Algorithms and Future Horizons\n\n"
        "Shor's algorithm demonstrates that a quantum computer can find the prime factors of an integer in polynomial time, "
        "posing a challenge to traditional RSA public-key encryption.\n\n"
        "Meanwhile, Grover's algorithm provides a quadratic speedup for searching unsorted databases. "
        "The combination of these algorithms highlights the transformative potential of quantum hardware.",
        fontsize=11,
    )

    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def main():
    print("Generating sample multi-page PDF...")
    pdf_bytes = create_sample_pdf()
    print(f"Sample PDF created: {len(pdf_bytes)} bytes, 4 pages.")

    print("\nRunning extract_text_from_pdf_bytes with smart chunking...")
    response = extract_text_from_pdf_bytes(pdf_bytes, "quantum_computing_guide.pdf")

    print("\nExtraction Summary:")
    print(f"  Filename: {response.summary.filename}")
    print(f"  Total Pages: {response.summary.total_pages}")
    print(f"  Total Words: {response.summary.total_words}")
    print(f"  Total Chunks: {response.total_chunks}")
    print(f"  Chunk Strategy: {response.summary.chunk_strategy}")

    print("\nDetailed Chunks Generated:")
    for c in response.chunks:
        print(f"  [Chunk #{c.chunk_index}] Heading: '{c.heading}' | Page Range: '{c.page_range}' (Pages {c.start_page}–{c.end_page}) | Words: {c.word_count}")
        print(f"     Preview: {c.content[:80]}...")

    assert response.total_chunks >= 4, f"Expected at least 4 chunks, got {response.total_chunks}"
    assert response.chunks[0].start_page == 1
    assert response.chunks[0].page_range == "Page 1"
    assert "Introduction" in response.chunks[0].heading

    assert response.chunks[1].start_page == 2
    assert response.chunks[1].page_range == "Page 2"
    assert "Qubits" in response.chunks[1].heading

    assert response.chunks[2].start_page == 3
    assert response.chunks[2].page_range == "Page 3"
    assert "Entanglement" in response.chunks[2].heading

    assert response.chunks[3].start_page == 4
    assert response.chunks[3].page_range == "Page 4"
    assert "Algorithms" in response.chunks[3].heading

    print("\nSUCCESS: All chunks retained exact page ranges and headings matching source content!")

if __name__ == "__main__":
    main()

