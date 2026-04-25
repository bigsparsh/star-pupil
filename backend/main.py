"""
Star Backend Entry Point

Run with: uvicorn app.main:app --reload
Or: python main.py
"""
import uvicorn


def main():
    """Run the Star backend API server."""
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )


if __name__ == "__main__":
    main()

