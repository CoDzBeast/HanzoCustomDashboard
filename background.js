let storedData = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'storeData') {
        storedData = request.data;
        sendResponse({ status: 'Data stored successfully' });
    } else if (request.action === 'retrieveData') {
        sendResponse(storedData);
    } else if (request.action === 'sendDataToDashboard') {
        // Send data to dashboard
        chrome.tabs.sendMessage(request.dashboardTabId, {
            action: 'updateDashboard',
            data: request.data
        });

        // Close the data tab
        chrome.tabs.remove(sender.tab.id);
    }
});
