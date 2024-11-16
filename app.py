import json
import numpy as np
from flask_cors import CORS
from flask import Flask, render_template, request, jsonify
from sklearn.neighbors import NearestNeighbors
from Levenshtein import distance as levenshtein_distance
from flask_caching import Cache

app = Flask(__name__)
CORS(app)
cache = Cache(app, config={'CACHE_TYPE': 'simple'})

# Load words from the .json file
def load_words(file_path):
    try:
        with open(file_path, 'r') as file:
            data = json.load(file)
            words = list(data.keys())
        return words
    except FileNotFoundError:
        print(f"Error: File '{file_path}' not found.")
        return []
    except json.JSONDecodeError:
        print(f"Error: '{file_path}' is not a valid JSON file.")
        return []
    except Exception as e:
        print(f"An error occurred while reading the file: {e}")
        return []

# Convert word to a fixed-length vector (precompute this)
def word_to_vector(word, max_length=20):
    vector = [ord(c) for c in word[:max_length]]
    vector += [0] * (max_length - len(vector))
    return vector

# Precompute word vectors to avoid recomputation during requests
words_list = load_words('words.json')
word_vectors = np.array([word_to_vector(word) for word in words_list])

# Use NearestNeighbors with precomputed vectors
knn = NearestNeighbors(n_neighbors=5)
knn.fit(word_vectors)

@app.route('/')
def index():
    return render_template('index.html')

# Cache the suggestions for a given word
@cache.cached(timeout=300, key_prefix='autoCorrect')  # Cache results for 5 minutes
@app.route('/autoCorrect', methods=['POST'])
def autoCorrect():
    data = request.get_json()

    if 'sentence' not in data:
        return jsonify({'error': 'No sentence provided'}), 400

    # Extract the last word from the sentence
    sentence = data['sentence'].strip()
    if not sentence:
        return jsonify({'error': 'Empty sentence provided'}), 400

    last_word = sentence.split()[-1]

    # Fetch cached suggestions for this word if available
    cached_suggestions = cache.get(last_word)
    if cached_suggestions:
        return jsonify({'suggestions': cached_suggestions})

    # Find the most similar words using KNN
    suggestions = find_most_similar_words(last_word)

    # Cache the suggestions for this word
    cache.set(last_word, suggestions, timeout=300)

    # Return the suggestions as JSON
    return jsonify({'suggestions': suggestions})

def find_most_similar_words(incorrect_word, n=5):
    word_vector = word_to_vector(incorrect_word)

    # Approximate nearest neighbors to filter candidates quickly
    distances, indices = knn.kneighbors([word_vector], n_neighbors=n)

    # Refine using Levenshtein distance
    suggestions = []
    for idx in indices[0]:
        word = words_list[idx]
        levenshtein_dist = levenshtein_distance(incorrect_word, word)
        suggestions.append((word, levenshtein_dist))

    # Sort suggestions by the Levenshtein distance and return top-n
    suggestions.sort(key=lambda x: x[1])
    print(f"Correction request for : {incorrect_word}, Reply : {suggestions[0]}")

    return suggestions[0]

if __name__ == "__main__":
    app.run(debug=True)
