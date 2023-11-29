window.onload = function() {
    // Define the extractData function
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

function createChart(processedData) {
        const labels = Object.keys(processedData);
        const totalQuantities = labels.map(name => processedData[name].totalQuantity);

        const ctx = document.getElementById('chartCanvas').getContext('2d');
        new Chart(ctx, {
            type: 'bar', // Chart type
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Quantity',
                    data: totalQuantities,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    x: {
                        ticks: {
                            color: '#e0e0e0'
                        },
                        grid: {
                            color: 'rgba(224, 224, 224, 0.1)'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#e0e0e0'
                        },
                        grid: {
                            color: 'rgba(224, 224, 224, 0.1)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#e0e0e0',
                            font: {
                                family: "'Open Sans', sans-serif"
                            }
                        }
                    }
                },
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    chrome.storage.local.get('storedData', function(result) {
        if (chrome.runtime.lastError) {
            console.error("Error reading from storage:", chrome.runtime.lastError);
            return;
        }

        if (!result.storedData || !result.storedData.results) {
            console.error("Malformed data received from storage:", result.storedData);
            return;
        }

        const results = result.storedData.results;
        const resultsContainer = document.getElementById('results');

        if (!resultsContainer) {
            console.error("Unable to find 'results' container in the DOM.");
            return;
        }

        resultsContainer.innerHTML = ''; // Clear previous results

        let highestQuantityCheckIn = 0;
        let highestQuantityCheckInName = '';
        let mostBreaksTaken = 0;
        let mostBreaksTakenName = '';
        let highestAveragePerHour = 0;
        let highestAveragePerHourName = '';

        for (const age in results) {
            if (results.hasOwnProperty(age) && Object.keys(results[age]).length > 0) {
                const ageResults = results[age];

                const currentDate = new Date();
                currentDate.setDate(currentDate.getDate() - age);

                const year = currentDate.getFullYear();
                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                const day = String(currentDate.getDate()).padStart(2, '0');

                const formattedDate = `${year}-${month}-${day}`;
                const ageText = age === '0' ? `Today (${formattedDate})` : age === '1' ? `Yesterday (${formattedDate})` : `${age} Days Ago (${formattedDate})`;

                const ageElement = document.createElement('h2');
                ageElement.textContent = `Age: ${ageText}`;
                resultsContainer.appendChild(ageElement);

                for (const name in ageResults) {
                    if (ageResults.hasOwnProperty(name)) {
                        const {
                            gaps,
                            averagePerHour,
                            totalQuantity,
                            firstCheckIn,
                            lastCheckIn
                        } = ageResults[name];

                        console.log(`Processing metrics for ${name}:`, ageResults[name]);

                        // Only process metrics for Age: 0
                        if (age === '0') {
                            if (totalQuantity > highestQuantityCheckIn) {
                                highestQuantityCheckIn = totalQuantity;
                                highestQuantityCheckInName = name;
                            }

                            if (gaps && gaps.length > mostBreaksTaken) {
                                mostBreaksTaken = gaps.length;
                                mostBreaksTakenName = name;
                            }

                            if (averagePerHour > highestAveragePerHour) {
                                highestAveragePerHour = averagePerHour;
                                highestAveragePerHourName = name;
                            }
                        }

                        const nameElement = document.createElement('h3');
                        nameElement.textContent = name;
                        resultsContainer.appendChild(nameElement);

                        const totalQuantityElement = document.createElement('p');
                        totalQuantityElement.textContent = `Total Quantity: ${totalQuantity}`;
                        resultsContainer.appendChild(totalQuantityElement);

                        const averagePerHourElement = document.createElement('p');
                        if (typeof averagePerHour === 'number') {
                            averagePerHourElement.textContent = `Average Per Hour: ${averagePerHour.toFixed(2)}`;
                        } else {
                            averagePerHourElement.textContent = `Average Per Hour: Data Error`;
                        }
                        resultsContainer.appendChild(averagePerHourElement);

                        const firstCheckInElement = document.createElement('p');
                        firstCheckInElement.textContent = `First Check-In: ${firstCheckIn}`;
                        resultsContainer.appendChild(firstCheckInElement);

                        const lastCheckInElement = document.createElement('p');
                        lastCheckInElement.textContent = `Last Check-In: ${lastCheckIn}`;
                        resultsContainer.appendChild(lastCheckInElement);

                        if (gaps && gaps.length > 0) {
                            const gapsElement = document.createElement('ul');
                            gapsElement.textContent = 'Gaps:';
                            for (const gap of gaps) {
                                const gapElement = document.createElement('li');
                                gapElement.textContent = `Start: ${gap.start}, End: ${gap.end}, Duration: ${gap.duration.toFixed(2)} minutes`;
                                gapsElement.appendChild(gapElement);
                            }
                            resultsContainer.appendChild(gapsElement);
                        } else {
                            const noGapsElement = document.createElement('p');
                            noGapsElement.textContent = 'No gaps found.';
                            resultsContainer.appendChild(noGapsElement);
                        }
                    }
                }
            }
        }


        // After processing the metrics
        console.log("Highest Quantity Checked-In:", highestQuantityCheckIn);
        console.log("Most Breaks Taken:", mostBreaksTaken);
        console.log("Highest Average Per Hour:", highestAveragePerHour.toFixed(2));

        // Update the DOM with the metrics for Age: 0
        document.getElementById('highestQuantityCheckIn').textContent = `${highestQuantityCheckIn} by ${highestQuantityCheckInName}`;
        document.getElementById('mostBreaksTaken').textContent = `${mostBreaksTaken} by ${mostBreaksTakenName}`;
        document.getElementById('highestAveragePerHour').textContent = `${highestAveragePerHour.toFixed(2)} by ${highestAveragePerHourName}`;

        document.getElementById('captureScreenshot').addEventListener('click', function() {
            chrome.tabs.captureVisibleTab(null, {
                format: 'png'
            }, function(dataUrl) {
                const downloadLink = document.createElement('a');
                downloadLink.href = dataUrl;
                downloadLink.download = 'screenshot.png';
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
            });
        });

        function getCurrentDateFormatted() {
            const currentDate = new Date();
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const day = String(currentDate.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        document.getElementById('saveData').addEventListener('click', function() {
            chrome.storage.local.get('storedData', function(result) {
                if (result.storedData && result.storedData.results && result.storedData.results['0']) {
                    const ageZeroData = result.storedData.results['0'];
                    const blob = new Blob([JSON.stringify(ageZeroData, null, 2)], {
                        type: 'application/json'
                    });

                    let url = URL.createObjectURL(blob);
                    let downloadLink = document.createElement('a');
                    downloadLink.href = url;
                    downloadLink.download = `age_0_data_${getCurrentDateFormatted()}.json`;
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    document.body.removeChild(downloadLink);
                    URL.revokeObjectURL(url);
                } else {
                    console.error("No data for Age: 0 found.");
                }
            });
        });
    });
};