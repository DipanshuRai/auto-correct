function copyText() {
    const textArea = document.getElementById('textArea');
    const text = textArea.innerText; // Get text content of the div

    // Create a temporary textarea element to copy from
    const tempTextArea = document.createElement('textarea');
    tempTextArea.value = text;
    document.body.appendChild(tempTextArea);
    tempTextArea.select();
    document.execCommand('copy');
    document.body.removeChild(tempTextArea);

    // Optional: Provide feedback to the user
    alert('Text copied to clipboard!');
} 

function findAndReplace() {
    let searchTerm = prompt('Enter the word to find:');
    let replaceTerm = prompt('Enter the replacement word:');
    let textArea = document.getElementById('textArea');
    let text = textArea.innerText;

    let regex = new RegExp(searchTerm, 'gi');
    text = text.replace(regex, replaceTerm);

    textArea.innerText = text;  // Update the text area
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
}

function saveAsFile() {
    let text = document.getElementById('textArea').innerText;
    let blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    let link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'text.txt';
    link.click();
}

document.addEventListener("DOMContentLoaded", () => {
    const textArea = document.getElementById("textArea");
    let typingTimer;
    let correctionCountValue = 0; // Initialize correction count value

    function updateWordCount() {
        let text = document.getElementById('textArea').innerText.trim();
        let wordCount = text ? text.split(/\s+/).length : 0;
        document.getElementById('wordCount').innerText = `Word Count: ${wordCount}`;
    }

    document.getElementById('textArea').addEventListener('input', updateWordCount);

    function updateCorrectionCount() {
        // Update the correction count in the UI
        document.getElementById('totalCorrections').innerText = `Correction Count: ${correctionCountValue}`;
    }

    // Function to check the word and get suggestions from backend
    function getSuggestions(sentence) {
        fetch('/autoCorrect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sentence })
        })
            .then(response => response.json())
            .then(data => {
                if (data.suggestions && data.suggestions.length > 0) {
                    const lastWord = sentence.split(" ").pop();
                    const topSuggestion = data.suggestions[0];

                    // Only replace if the typed word doesn't match the top suggestion
                    if (lastWord !== topSuggestion) {
                        autoReplaceWithTopSuggestion(topSuggestion);
                        correctionCountValue++; // Increment the correction count
                        updateCorrectionCount(); // Update the correction count in the UI
                    }
                } else {
                    console.error("No suggestions returned from the backend.");
                }
            })
            .catch(error => {
                console.error("Error fetching suggestions:", error);
            });
    }

    // Function to auto replace the last word with the top suggestion
    function autoReplaceWithTopSuggestion(suggestion) {
        const words = textArea.innerText.split(" ");
        words.pop();  // Remove last word (incorrect one)
        words.push(suggestion);  // Add the top suggested word
        // Update the text area with the corrected sentence
        textArea.innerText = words.join(" ") + " "; // Add space after the word

        // Move the cursor to the end of the sentence
        moveCursorToEnd(textArea);
    }

    // Function to move the cursor to the end of the content
    function moveCursorToEnd(element) {
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(element);
        range.collapse(false);  // Collapse the range to the end
        selection.removeAllRanges();
        selection.addRange(range);
        element.focus();  // Ensure the text area is focused
    }

    // Add an event listener to detect space key press
    textArea.addEventListener("keydown", (event) => {
        if (event.key === " ") {  // Check if the space key is pressed
            clearTimeout(typingTimer);
            typingTimer = setTimeout(() => {
                const sentence = textArea.innerText.trim();
                const lastWord = sentence.split(" ").pop();  // Get the last word
                if (lastWord && sentence) {
                    // Send the sentence to the backend if the last word exists
                    getSuggestions(sentence);
                }
            }, 500);  // Delay to avoid excessive API calls
        }
    });
});
