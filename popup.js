document.getElementById('runReport').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'extractData' }, response => {
            console.log("Received data:", response);

            // Save the data to storage
            chrome.storage.local.set({ 'storedData': response }, function() {
                if (chrome.runtime.lastError) {
                    console.error("Error writing to storage:", chrome.runtime.lastError);
                } else {
                    console.log('Data saved successfully!');

                    // Open the dashboard in a new tab
                    chrome.tabs.create({ url: 'dashboard.html' });
                }
            });
        });
    });
});
