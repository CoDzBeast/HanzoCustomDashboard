function extractData() {
    const rows = document.querySelectorAll('tr');
    const data = Array.from(rows).map(row => {
        const cells = row.querySelectorAll('td');
        const name = cells[2]?.textContent.trim();
        const timestampText = cells[3]?.textContent.trim();
        const timestamp = timestampText ? new Date(timestampText) : null;
        const ageElement = row.querySelector('span.notice');
        const age = ageElement ? parseInt(ageElement.textContent.trim()) : null;
        return { name, timestamp, age };
    });
    
    console.log('Raw Data:', data); // Log raw data
    return data.filter(item => item.name && item.timestamp && item.age !== null);
}

// Function to save raw data to Chrome's storage
function saveRawDataToStorage(data) {
    chrome.storage.local.set({'rawData': data}, function() {
        console.log('Raw data has been saved to storage.');
    });
}

// Main execution
const rawData = extractData();
saveRawDataToStorage(rawData);

function processWebpageData(data) {
    // Initialize data structures
    const seriesData = {};
    const timestamps = {};

    // Loop through the extracted data
    data.forEach(({ name, timestamp }) => {
        // Initialize data structures if this name hasn't been seen before
        if (!seriesData[name]) {
            seriesData[name] = {};
            timestamps[name] = [];
        }

        // Increment the count for the timestamp and store the timestamp
        const xValue = timestamp.toLocaleString();
        seriesData[name][xValue] = (seriesData[name][xValue] || 0) + 1;
        timestamps[name].push(timestamp);
    });

    // Calculate average per hour, identify gaps, and include total quantity
    const results = {};
    for (const name in seriesData) {
        if (seriesData.hasOwnProperty(name)) {
            // Sort timestamps
            timestamps[name].sort((a, b) => a - b);

            const firstCheckIn = timestamps[name][0];
            const lastCheckIn = timestamps[name][timestamps[name].length - 1];

            // Identify gaps of 30 minutes or more and calculate total gap time
            const gaps = [];
            let totalGapTime = 0;
            for (let i = 1; i < timestamps[name].length; i++) {
                const gap = (timestamps[name][i] - timestamps[name][i - 1]) / (1000 * 60); // Gap in minutes
                if (gap >= 30) {
                    gaps.push({
                        start: timestamps[name][i - 1].toLocaleString(),
                        end: timestamps[name][i].toLocaleString(),
                        duration: gap
                    });
                    totalGapTime += gap; // Add gap to total gap time
                }
            }

            // Calculate average per hour, adjusting for gap time
            const totalTimeHours = (timestamps[name][timestamps[name].length - 1] - timestamps[name][0]) / (1000 * 60 * 60);
            const adjustedTimeHours = totalTimeHours - (totalGapTime / 60);
            const averagePerHour = timestamps[name].length / adjustedTimeHours;

            // Include total quantity
            const totalQuantity = timestamps[name].length;

            // Store results for this name
            results[name] = {
                gaps,
                averagePerHour,
                totalQuantity,
                firstCheckIn: firstCheckIn.toLocaleString(),
                lastCheckIn: lastCheckIn.toLocaleString()
            };
        }
    }

    return results;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractData') {
        const data = extractData();

        // Filter out entries based on age and then group by age
        const groupedData = data.reduce((acc, item) => {
            if (item.age <= 5) {  // Check if the age is 5 days or less
                if (!acc[item.age]) acc[item.age] = [];
                acc[item.age].push(item);
            }
            return acc;
        }, {});

        // Filter out names that don't meet the criteria
        for (const age in groupedData) {
            if (groupedData.hasOwnProperty(age)) {
                const namesCount = {};
                groupedData[age].forEach(item => {
                    if (!namesCount[item.name]) namesCount[item.name] = 0;
                    namesCount[item.name]++;
                });

                groupedData[age] = groupedData[age].filter(item => {
                    return namesCount[item.name] >= 5;
                });
            }
        }

        // Process each group separately and store the results
        const results = {};
        for (const age in groupedData) {
            if (groupedData.hasOwnProperty(age) && groupedData[age].length > 0) {
                results[age] = processWebpageData(groupedData[age]);
            }
        }

        sendResponse({ results });
    }
});
