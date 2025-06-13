import sys
import json
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def get_matches(data):
    filter = data.get("filter", {})
    candidates = data.get("candidates", [])

    filter_text = (
        f"{filter.get('job_title', '')} "
        f"{filter.get('industry', '')} "
        f"{filter.get('designation', '')} "
        f"{' '.join(filter.get('education', []))} "
        f"{filter.get('department', '')} "
        f"{(filter.get('gender', '') + ' ') * 3}"
        f"{' '.join(filter.get('notice_period', []))}"
    )

    candidate_texts = []
    user_ids = []

    for c in candidates:
        text = (
            f"{c['role']} {c['industry']} {c['skill']} "
            f"{c['experience']} {c['country']} {c['state']} "
            f"{c['salary']} {(c['gender'] + ' ') * 3}"
        )
        candidate_texts.append(text)
        user_ids.append(c['user_id'])

    corpus = candidate_texts + [filter_text]
    vectorizer = TfidfVectorizer(stop_words="english")
    tfidf_matrix = vectorizer.fit_transform(corpus)

    user_vecs = tfidf_matrix[:-1]
    filter_vec = tfidf_matrix[-1]

    similarities = cosine_similarity(user_vecs, filter_vec.reshape(1, -1)).flatten()
    top_indices = similarities.argsort()[::-1][:10]

    matches = []
    for idx in top_indices:
        matches.append({
            "user_id": user_ids[idx],
            "score": round(float(similarities[idx]), 4)
        })

    print(json.dumps(matches, indent=2))


if __name__ == "__main__":
    try:
        input_data = json.load(sys.stdin)
        get_matches(input_data)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
