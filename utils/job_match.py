import sys
import json
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def main():
    try:
        input_data = sys.stdin.read()
        data = json.loads(input_data)

        users = data.get("users", [])
        jobs = data.get("jobs", [])

        if not users or not jobs:
            print(json.dumps([]))
            return

        user_texts = []
        user_ids = []
        for row in users:
            user_id = row[0]
            role = row[2] or ""
            industry = row[3] or ""
            skills = row[4] or ""
            text = f"{role} {industry} {skills}"
            user_ids.append(user_id)
            user_texts.append(text)

        job_texts = []
        job_ids = []
        for row in jobs:
            job_id = row[0]
            title = row[1] or ""
            desc = row[2] or ""
            skills = row[4] or ""
            employer_id = row[5] or ""
            text = f"{title} {desc} {skills} {employer_id}"
            job_ids.append(job_id)
            job_texts.append(text)

        combined = user_texts + job_texts
        vectorizer = TfidfVectorizer(stop_words='english')
        vectors = vectorizer.fit_transform(combined)

        user_vecs = vectors[:len(user_texts)]
        job_vecs = vectors[len(user_texts):]

        similarity_matrix = cosine_similarity(user_vecs, job_vecs)

        top_n = 5
        matches = []

        for user_idx, user_id in enumerate(user_ids):
            sims = similarity_matrix[user_idx]
            top_indices = sims.argsort()[-top_n:][::-1]

            for job_idx in top_indices:
                score = sims[job_idx]
                if score > 0:
                    matches.append({
                        "user_id": int(user_id),
                        "job_id": int(job_ids[job_idx]),
                        "employer_id": int(row[5]),
                        "score": round(float(score), 4)
                    })

        print(json.dumps(matches, indent=2))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
