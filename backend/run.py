"""Entry point.  Local:  python run.py     Production (Render):  gunicorn run:app"""
import os

from app import create_app

app = create_app()

if __name__ == "__main__":
    # 0.0.0.0 so the container / cloud host can reach it; PORT is provided by Render.
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=os.getenv("FLASK_DEBUG") == "1")
